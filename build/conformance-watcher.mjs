/**
 * `npm run conformance:watcher` — the cheap gate on the file watcher's
 * exclusion budget (Phase 151).
 *
 * WHAT IT IS FOR, and why this class of defect needs a gate rather than a
 * comment. `FSEventStreamSetExclusionPaths` accepts at most EIGHT paths, and
 * above that it does not truncate: it returns false and applies ZERO
 * exclusions. `node_modules/@parcel/watcher/src/macos/FSEventsBackend.cc`
 * line 247 never checks the return value, the stream still starts, and
 * nothing is logged. So the ninth path added by any future round would
 * silently disable all eight, including the `.git` exclusion the watcher has
 * always had, and the only symptom would be a machine that got slower. The
 * measurement is `build/fsevents-cap.c`, re-runnable with
 * `npm run conformance:watcher:cap`, and its recorded table is in that file's
 * header.
 *
 * The dotgit subscription in `src/main/watcher/repo-watcher.ts` already
 * passes five plain paths. Four more and it breaks in exactly that silent
 * way. That is the row this gate is really guarding.
 *
 * WHAT IT ASSERTS:
 *
 *  1. Every `watcher.subscribe` call site under `src/main` passes at most
 *     eight PLAIN entries in its `ignore` array. An entry containing a glob
 *     character, and a RegExp, do not count, because
 *     `node_modules/@parcel/watcher/wrapper.js` routes both to the userspace
 *     matcher instead of to the CoreServices array, so neither consumes a
 *     slot.
 *  2. A call site whose `ignore` is COMPUTED rather than an array literal
 *     must get it from `planWorktreeIgnore`, which is the one module that
 *     enforces the budget, and whose enforcement rule 3 proves by running.
 *  3. The planner never returns more than eight plain paths, at any number of
 *     ignored roots, and loses nothing while doing it: every root past the
 *     budget comes back as a relative userspace matcher.
 *  4. An ignored FILE never consumes a slot, because a slot spent on one log
 *     file is a slot wasted.
 *  5. WHAT AN OVERFLOW ENTRY MATCHES, over directory names that are not plain
 *     identifiers. This is the rule that was missing, and its absence is the
 *     whole reason the defect below shipped green. An overflow entry used to
 *     be the glob string `<name>/**`, built from a raw directory name and
 *     handed to `picomatch`, so a root named `!archive` compiled to a
 *     negation matching every path in the tree EXCEPT `archive/**` and the
 *     repository went blind, and a root named `build (old)` compiled to a
 *     capture group that excluded a real tracked `build old/` instead of
 *     itself. Both were proved end to end over real FSEvents, five real edits
 *     to a tracked file seen 5 of 5 before and 0 of 5 after. Counting entries
 *     could never have caught either, because the count was right both times.
 *  6. The scanner itself is proved on fixtures this file writes, so a gate
 *     that silently stopped finding call sites fails instead of passing.
 *
 * IT SPAWNS NOTHING beyond one node process for the probe. It opens no
 * FSEvents stream, starts no tmux server, launches no Electron, runs no git,
 * and reads nothing under the person's home. About 1 second.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tsxCli } from './ts-runner.mjs';

/** The measured ceiling. `build/fsevents-cap.c` is the measurement. */
const BUDGET = 8;

/** The one module allowed to build an `ignore` array that is not a literal. */
const PLANNER = 'planWorktreeIgnore';

const failures = [];

// ---------------------------------------------------------------------------
// The scanner.
// ---------------------------------------------------------------------------

/** Every .ts file under a directory, recursively, skipping __tests__. */
function tsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...tsFiles(p));
    } else if (entry.name.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Blank out every comment, keeping the file's length and its newlines so
 * reported line numbers stay true.
 *
 * This is not decoration. The first version of this gate scanned the raw
 * source and MISSED the worktree call site entirely, because a comment inside
 * that call reads "this repository's ignored roots" and the apostrophe opened
 * a string that swallowed the rest of the call. The gate printed PASS on two
 * of the three sites it thought it had found. That is exactly the silent
 * blindness rule 5's fixtures exist to catch, and one of them now carries an
 * apostrophe.
 */
function stripComments(src) {
  let out = '';
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote !== null) {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i++; }
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      out += '\n';
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      for (; i < stop; i++) out += src[i] === '\n' ? '\n' : ' ';
      i--;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Read the balanced `(...)` that starts at `open` in `src`. Returns the inner
 * text. Quotes and template literals are respected so a paren inside a string
 * cannot end the call early.
 */
function balanced(src, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote !== null) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/** Split an array literal's inner text at TOP LEVEL commas. */
function topLevelSplit(inner) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote !== null) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      out.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  out.push(inner.slice(start));
  return out.map((e) => e.trim()).filter((e) => e.length > 0);
}

/**
 * Find every `watcher.subscribe(` call in one file and describe its `ignore`.
 * Returns rows of { line, kind: 'literal' | 'computed', plain, userspace, expr }.
 *
 * An entry counts as USERSPACE, and therefore costs no CoreServices slot, if
 * it carries a glob character or is a regular expression literal. Both are
 * routed to `ignoreGlobs` by `node_modules/@parcel/watcher/wrapper.js`.
 */
function scanSource(rawSrc) {
  const src = stripComments(rawSrc);
  const rows = [];
  const call = /\bwatcher\s*\.\s*subscribe\s*\(/g;
  let m;
  while ((m = call.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const inner = balanced(src, open);
    if (inner === null) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const ig = /\bignore\s*:/.exec(inner);
    if (ig === null) {
      rows.push({ line, kind: 'none', plain: 0, userspace: 0, expr: '' });
      continue;
    }
    const rest = inner.slice(ig.index + ig[0].length);
    const bracket = rest.indexOf('[');
    const firstNonSpace = rest.search(/\S/);
    if (bracket !== firstNonSpace || bracket === -1) {
      rows.push({
        line,
        kind: 'computed',
        plain: 0,
        userspace: 0,
        expr: rest.slice(0, 40).split('\n')[0].trim()
      });
      continue;
    }
    const arr = balanced(rest, bracket);
    const entries = arr === null ? [] : topLevelSplit(arr);
    const userspace = entries.filter(
      (e) => /[*?[\]]/.test(e) || e.startsWith('/')
    ).length;
    rows.push({
      line,
      kind: 'literal',
      plain: entries.length - userspace,
      userspace,
      expr: ''
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Rule 5, first: prove the scanner on fixtures this file writes.
// ---------------------------------------------------------------------------

const fixtures = [
  {
    name: 'eight plain paths is the maximum that works',
    src: `watcher.subscribe(d, cb, { ignore: [a,b,c,d,e,f,g,h] });`,
    expect: { count: 1, kind: 'literal', plain: 8, userspace: 0 }
  },
  {
    name: 'nine plain paths is the defect this gate exists for',
    src: `watcher.subscribe(d, cb, { ignore: [a,b,c,d,e,f,g,h,i] });`,
    expect: { count: 1, kind: 'literal', plain: 9, userspace: 0 }
  },
  {
    name: 'a glob costs no slot, and a comma inside a string is not a separator',
    src: `watcher.subscribe(dir, cb, {\n  ignore: [join(d, 'a,b'), '**/x/**', join(d, 'c')]\n});`,
    expect: { count: 1, kind: 'literal', plain: 2, userspace: 1 }
  },
  {
    name: 'a regular expression literal costs no slot either',
    src: `watcher.subscribe(dir, cb, { ignore: [join(d, 'a'), /^venv(?:\\/|$)/] });`,
    expect: { count: 1, kind: 'literal', plain: 1, userspace: 1 }
  },
  {
    name: 'a computed ignore is recognised as computed, not silently skipped',
    src: `watcher.subscribe(dir, cb, { ignore: plan.ignore });`,
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
  },
  {
    name: "an apostrophe in a comment inside the call does not hide the call",
    src:
      'watcher.subscribe(dir, cb, {\n' +
      "  // the rest are this repository's ignored roots\n" +
      '  ignore: plan.ignore\n' +
      '});',
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
  },
  {
    name: 'a subscribe named only inside a comment is not counted as a call site',
    src: '// watcher.subscribe(dir, cb, { ignore: [a,b,c,d,e,f,g,h,i] });\nconst x = 1;',
    expect: { count: 0, kind: 'none', plain: 0, userspace: 0 }
  }
];

for (const f of fixtures) {
  const rows = scanSource(f.src);
  if (rows.length !== f.expect.count) {
    failures.push(
      `scanner fixture "${f.name}": found ${rows.length} call sites, expected ${f.expect.count}`
    );
    continue;
  }
  if (rows.length === 0) continue;
  const r = rows[0];
  if (
    r.kind !== f.expect.kind ||
    r.plain !== f.expect.plain ||
    r.userspace !== f.expect.userspace
  ) {
    failures.push(
      `scanner fixture "${f.name}": read ${r.kind} plain=${r.plain} ` +
        `userspace=${r.userspace}, expected ${f.expect.kind} ` +
        `plain=${f.expect.plain} userspace=${f.expect.userspace}`
    );
  }
}

// One fixture on disk too, so the directory walk itself is proved rather than
// only the regex.
const fixDir = mkdtempSync(join(tmpdir(), 'gmux-watcher-gate-'));
let walked = 0;
try {
  writeFileSync(join(fixDir, 'a.ts'), fixtures[0].src);
  writeFileSync(join(fixDir, 'b.ts'), 'export const nothing = 1;\n');
  walked = tsFiles(fixDir).length;
  if (walked !== 2) {
    failures.push(`scanner walk fixture: found ${walked} .ts files, expected 2`);
  }
} finally {
  rmSync(fixDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Rules 1 and 2: the real call sites.
// ---------------------------------------------------------------------------

const sites = [];
for (const file of tsFiles('src/main')) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('watcher.subscribe')) continue;
  for (const row of scanSource(src)) sites.push({ file, ...row });
}

if (sites.length === 0) {
  failures.push(
    'no watcher.subscribe call site found under src/main. Either the watcher ' +
      'moved or this scanner stopped working; a gate that finds nothing must ' +
      'fail rather than pass.'
  );
}

for (const s of sites) {
  const where = `${s.file}:${s.line}`;
  if (s.kind === 'none') {
    // No ignore array at all is zero plain paths, which is inside the budget
    // by definition. It is listed in the table so it stays visible, because a
    // later round adding one here is exactly what this gate must then count.
  } else if (s.kind === 'literal') {
    if (s.plain > BUDGET) {
      failures.push(
        `${where}: passes ${s.plain} plain paths in ignore, and the measured ` +
          `maximum is ${BUDGET}. Above it FSEventStreamSetExclusionPaths ` +
          'returns false and NO exclusion applies at all, including .git. ' +
          'Move the extras to userspace matchers, which cost no slot.'
      );
    }
  } else {
    const src = readFileSync(s.file, 'utf8');
    if (!src.includes(PLANNER)) {
      failures.push(
        `${where}: builds its ignore array from \`${s.expr}\`, which this gate ` +
          `cannot count, and the file does not use ${PLANNER}. Either pass an ` +
          `array literal or build it with ${PLANNER}, which is the one place ` +
          'the budget is enforced.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Rules 3 and 4: run the planner.
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/watcher-conformance-probe.mts'],
  { encoding: 'utf8' }
);
if (probe.status !== 0) {
  process.stdout.write(probe.stderr ?? '');
  process.stdout.write('\nFAIL: the exclusion planner probe did not run.\n');
  process.exit(1);
}
const data = JSON.parse(probe.stdout);

if (data.budget !== BUDGET) {
  failures.push(
    `EXCLUSION_PATH_BUDGET is ${data.budget}, and the measurement in ` +
      `build/fsevents-cap.c says ${BUDGET}. Re-run ` +
      'npm run conformance:watcher:cap before moving either.'
  );
}

for (const p of data.plans) {
  const where = `planWorktreeIgnore with ${p.roots} ignored roots`;
  if (p.paths > BUDGET) {
    failures.push(`${where}: returned ${p.paths} plain paths, over the ${BUDGET} budget.`);
  }
  if (p.ignore !== p.roots + 1) {
    failures.push(
      `${where}: the ignore array holds ${p.ignore} entries but ${p.roots} roots ` +
        'plus .git is ' + (p.roots + 1) + '. A root was lost rather than moved to ' +
        'the userspace matcher.'
    );
  }
  if (!p.dotGitFirst) {
    failures.push(
      `${where}: .git is not the first plain path, so it can be demoted to userspace.`
    );
  }
  if (!p.overflowRelative) {
    failures.push(
      `${where}: an overflow matcher is absolute. It is run against the path ` +
        'RELATIVE to the watch root, so an absolute one matches nothing.'
    );
  }
  if (!p.overflowAreRegExps) {
    failures.push(
      `${where}: an overflow entry is not a flagless RegExp. A plain string would ` +
        'be routed back to the CoreServices array and would consume a slot, and ' +
        'wrapper.js throws on any flag at all.'
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 5: what an overflow entry actually MATCHES.
// ---------------------------------------------------------------------------

if (!Array.isArray(data.hostile) || data.hostile.length < 6) {
  failures.push(
    'the probe returned fewer than six hostile directory names. This lane is ' +
      'the one that catches a literal being read as a pattern, and it must ' +
      'not be thinned out.'
  );
}

for (const h of data.hostile ?? []) {
  const where = `overflowMatcher(${JSON.stringify(h.name)}) -> /${h.source}/`;
  if (!h.self || !h.deep) {
    failures.push(
      `${where}: does not exclude the directory it is named after, or the files ` +
        'beneath it, so the ignored root it stands for is not excluded at all.'
    );
  }
  if (h.hitsSibling) {
    failures.push(
      `${where}: also excludes ${JSON.stringify(h.sibling)}, which is a real ` +
        'directory this repository tracks. Every edit under it would stop ' +
        'reaching the tree and the SCM view. The name is a LITERAL and must be ' +
        'escaped before it reaches a matcher.'
    );
  }
  if (h.hitsNested) {
    failures.push(
      `${where}: is not anchored, so it also excludes a directory of the same ` +
        'name nested anywhere in the tree. Only the root itself is ignored.'
    );
  }
  if (h.hitsAnythingElse) {
    failures.push(
      `${where}: excludes ordinary paths that have nothing to do with it. This ` +
        'is the `!archive` shape, where a leading `!` was read as negation and ' +
        'the WHOLE worktree went blind with nothing logged.'
    );
  }
}

const expectedParsed = ['.claude', 'bin', 'plane/node_modules', 'scratch'];
if (JSON.stringify(data.parsed) !== JSON.stringify(expectedParsed)) {
  failures.push(
    `parseIgnoredRoots read ${JSON.stringify(data.parsed)}, expected ` +
      `${JSON.stringify(expectedParsed)}. An ignored FILE, or .git, took a slot.`
  );
}

// ---------------------------------------------------------------------------
// The table a person reads.
// ---------------------------------------------------------------------------

const pad = (v, n) => String(v).padEnd(n);

process.stdout.write(
  `The FSEvents exclusion budget is ${BUDGET} plain paths, measured in ` +
    'build/fsevents-cap.c.\nAt nine the call returns false and NOTHING is ' +
    'excluded, including .git.\n\n'
);

process.stdout.write(`${pad('CALL SITE', 46)} ${pad('IGNORE', 10)} ${pad('PLAIN', 6)} USERSPACE\n`);
for (const s of sites) {
  const where = `${s.file.replace(/^src\/main\//, '')}:${s.line}`;
  process.stdout.write(
    `${pad(where, 46)} ${pad(s.kind, 10)} ` +
      `${pad(s.kind === 'literal' ? s.plain : '-', 6)} ${s.kind === 'literal' ? s.userspace : '-'}\n`
  );
}

process.stdout.write(`\n${pad('IGNORED ROOTS', 15)} ${pad('KERNEL PATHS', 14)} ${pad('USERSPACE', 16)} TOTAL\n`);
for (const p of data.plans) {
  process.stdout.write(
    `${pad(p.roots, 15)} ${pad(p.paths, 14)} ${pad(p.overflow, 16)} ${p.ignore}\n`
  );
}

process.stdout.write(
  `\n${pad('HOSTILE ROOT NAME', 17)} ${pad('COMPILES TO', 30)} ${pad('SELF', 6)} ` +
    `${pad('SIBLING', 9)} ${pad('NESTED', 8)} ANY OTHER PATH\n`
);
for (const h of data.hostile ?? []) {
  process.stdout.write(
    `${pad(h.name, 17)} ${pad(h.source, 30)} ${pad(h.self && h.deep ? 'yes' : 'NO', 6)} ` +
      `${pad(h.hitsSibling ? 'HIT' : 'no', 9)} ${pad(h.hitsNested ? 'HIT' : 'no', 8)} ` +
      `${h.hitsAnythingElse ? 'HIT' : 'no'}\n`
  );
}

process.stdout.write(
  `\n${sites.length} subscribe call sites scanned, ${fixtures.length} scanner ` +
    `fixtures proved, ${data.plans.length} plans run, ` +
    `${(data.hostile ?? []).length} hostile directory names matched. Nothing ` +
    'was watched, spawned or launched.\n'
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Every subscribe call site stays inside the eight path budget, the ' +
    'planner never exceeds it at any number of ignored roots, nothing past ' +
    'the budget is lost, no ignored file consumes a slot, and every overflow ' +
    'entry excludes the directory it names and nothing else.\n'
);
