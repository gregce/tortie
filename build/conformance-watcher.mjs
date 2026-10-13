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
 *  7. PHASE 347, rules W347-1 to W347-8: the open file watch in
 *     `src/main/watcher/open-files.ts` (issue 33) never touches the budget
 *     above, because it is `node:fs`'s watch on ONE FILE armed through a
 *     descriptor (no `@parcel/watcher`, no `ignore` entry); it reads no byte
 *     and writes nothing; every arm goes through ONE gate that asks the
 *     running watcher's exclusion plan before the open and again after it and
 *     compares the file's identity, bounded; a `rename` re-arms through that
 *     gate; the window is the bus's own non-resetting one; the cap is decided
 *     in the gate; and the inode is checked again once the kernel holds the
 *     watch, two check phases later. Each rule is read over the shipping
 *     source with comments blanked, and each is proved by in-memory plants of
 *     that source that must read red on the rule that owns them.
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
// Rules W347-1 to W347-8 (Phase 347): the open file watch.
// ---------------------------------------------------------------------------

const OPEN_FILES = 'src/main/watcher/open-files.ts';

/**
 * The span of `function <name>(...) { ... }` in comment-blanked code: the
 * offset of the first character of its body and of its closing brace.
 */
function fnSpan(code, name) {
  const head = new RegExp(`\\bfunction\\s+${name}\\s*\\(`).exec(code);
  if (head === null) return null;
  const paren = head.index + head[0].length - 1;
  const params = balanced(code, paren);
  if (params === null) return null;
  const brace = code.indexOf('{', paren + params.length + 2);
  if (brace === -1) return null;
  const body = balanced(code, brace);
  if (body === null) return null;
  return { start: brace + 1, end: brace + 1 + body.length, body };
}

/** Index of `needle` in `hay` at or after `from`, or -1. */
const at = (hay, needle, from = 0) => (from < 0 ? -1 : hay.indexOf(needle, from));

/**
 * Every W347 finding in one version of the module's source. An empty list is
 * the pass. Each finding starts with the rule that owns it.
 */
function openFileFindings(raw) {
  const code = stripComments(raw);
  const out = [];
  const say = (rule, msg) => out.push(`${rule}: ${msg}`);

  // W347-1: the eight path budget is untouched.
  if (code.includes('@parcel/watcher')) {
    say('W347-1', 'open-files.ts names @parcel/watcher. The per-file watch is node:fs\'s, so it never reaches the eight path exclusion budget');
  }
  if (/\bwatcher\s*\.\s*subscribe\b/.test(code) || /\bignore\s*:/.test(code)) {
    say('W347-1', 'open-files.ts subscribes a watcher or builds an ignore array; it may add nothing to any exclusion set');
  }

  // W347-2: the one watch, through a descriptor.
  const arm = fnSpan(code, 'armFileByDescriptor');
  const watchCalls = [...code.matchAll(/(^|[^.\w$])watch\s*\(/g)].map((m) => m.index + m[1].length);
  if (arm === null) {
    say('W347-2', 'armFileByDescriptor is gone');
  } else if (watchCalls.length !== 1) {
    say('W347-2', `the module calls watch( ${watchCalls.length} times; exactly one, in armFileByDescriptor`);
  } else {
    const w = watchCalls[0];
    const b = arm.body;
    const wRel = w - arm.start;
    if (w < arm.start || w > arm.end) say('W347-2', 'the one watch( is not inside armFileByDescriptor');
    const wArgs = balanced(code, code.indexOf('(', w)) ?? '';
    const firstArg = topLevelSplit(wArgs)[0] ?? '';
    if (!firstArg.includes('/dev/fd/')) say('W347-2', `watch( is armed on \`${firstArg}\`, not on /dev/fd/<the descriptor>; a path watch on a FIFO never returns`);
    const open = at(b, 'openSync(');
    const fstat = at(b, 'fstatSync(', open);
    const isFile = at(b, '.isFile()', fstat);
    if (open === -1 || fstat === -1 || isFile === -1 || isFile > wRel) {
      say('W347-2', 'the watch is not preceded, in order, by openSync(, fstatSync( and an .isFile() test');
    }
    const openArgs = open === -1 ? '' : (balanced(b, open + 'openSync'.length) ?? '');
    for (const flag of ['O_RDONLY', 'O_NONBLOCK', 'O_NOFOLLOW']) {
      if (!openArgs.includes(flag)) say('W347-2', `the descriptor is opened without ${flag}`);
    }
    if (!/\bfinally\s*\{\s*closeSync\(\s*fd\s*\)/.test(b)) {
      say('W347-2', 'the descriptor is not closed in a finally block');
    }
  }

  // W347-3: reads no byte, writes nothing, starts nothing, logs no path.
  const forbidden = [
    /\breadFile(Sync)?\s*\(/, /\bread(Sync)?\s*\(/, /\bcreateReadStream\s*\(/,
    /\bwriteFile(Sync)?\s*\(/, /\bwrite(Sync)?\s*\(/, /\bappendFile(Sync)?\s*\(/,
    /\brename(Sync)?\s*\(/, /\bunlink(Sync)?\s*\(/, /\btruncate(Sync)?\s*\(/,
    /\brm(Sync)?\s*\(/, /\bspawn(Sync)?\s*\(/, /\bexec(File)?(Sync)?\s*\(/, /\bfork\s*\(/
  ];
  for (const re of forbidden) {
    const m = re.exec(code);
    if (m !== null) say('W347-3', `the module calls ${m[0].trim()}; it reads no file's bytes, writes nothing and starts nothing`);
  }
  for (const m of code.matchAll(/\bdeps\s*\.\s*log\s*\(/g)) {
    const args = balanced(code, m.index + m[0].length - 1) ?? '';
    if (/path|\bc[12]\b|\bcanonical\b/.test(args)) say('W347-3', 'a deps.log( call names a path; counts and the repository only');
  }

  // W347-4: rename re-arms through the gate; the flush re-arms; an arm opens the window.
  const onEvent = fnSpan(code, 'onEvent');
  const flush = fnSpan(code, 'flush');
  const gate = fnSpan(code, 'armChecked');
  if (onEvent === null || flush === null || gate === null) {
    say('W347-4', 'onEvent, flush or armChecked is gone');
  } else {
    const ob = onEvent.body;
    const ren = at(ob, "kind === 'rename'");
    const close = at(ob, 'closeHandle(', ren);
    const rearm = at(ob, 'armChecked(', close);
    if (ren === -1 || !ob.includes("'error'") || close === -1 || rearm === -1) {
      say('W347-4', 'a rename or error event does not close the watch and call armChecked(');
    }
    if (ob.includes('deps.armFile(')) say('W347-4', 'onEvent arms with deps.armFile( directly, past the gate');
    if (!flush.body.includes('armChecked(')) say('W347-4', 'the flush no longer re-arms its repository\'s dormant entries through armChecked(');
    const gb = gate.body;
    const id = at(gb, 'deps.identity(');
    const win = at(gb, 'openWindowsOf(', id);
    const kern = at(gb, 'deps.afterKernelSees(', id);
    if (id === -1 || win === -1 || (kern !== -1 && win > kern)) {
      say('W347-4', 'a successful arm does not open the window before the check is handed on');
    }
  }

  // W347-5: one cap, decided in the gate.
  const capDecls = [...code.matchAll(/\bexport\s+const\s+OPEN_FILE_WATCH_CAP\s*=/g)].length;
  if (capDecls !== 1) say('W347-5', `OPEN_FILE_WATCH_CAP is declared ${capDecls} times in the module, not once`);
  if (gate !== null) {
    const capAt = at(gate.body, '>= OPEN_FILE_WATCH_CAP');
    const armAt = at(gate.body, 'deps.armFile(');
    if (capAt === -1 || (armAt !== -1 && capAt > armAt)) {
      say('W347-5', 'armChecked does not test the cap before it arms');
    }
  }

  // W347-6: the bus's own window, not reset.
  if (!/import\s*\{[^}]*\bDEFAULT_DEBOUNCE_MS\b[^}]*\}\s*from\s*'\.\/repo-watcher'/.test(code)) {
    say('W347-6', 'DEFAULT_DEBOUNCE_MS is not imported from ./repo-watcher');
  }
  if (/\bconst\s+DEFAULT_DEBOUNCE_MS\b/.test(code) || /(^|[^\w.])300\b/.test(code)) {
    say('W347-6', 'a second copy of the 300 ms window is written in the module');
  }
  const ow = fnSpan(code, 'openWindow');
  if (ow === null) {
    say('W347-6', 'openWindow is gone');
  } else {
    const set = at(ow.body, 'deps.setTimeout(');
    const setArgs = set === -1 ? '' : (balanced(ow.body, set + 'deps.setTimeout'.length) ?? '');
    const lastArg = topLevelSplit(setArgs).at(-1) ?? '';
    if (lastArg !== 'DEFAULT_DEBOUNCE_MS') say('W347-6', `the window is \`${lastArg}\` long, not DEFAULT_DEBOUNCE_MS`);
    const has = at(ow.body, 'windows.has(');
    if (has === -1 || set === -1 || has > set) say('W347-6', 'an open window is not left alone before a new one is set');
    if (/\.clear\s*\(|clearTimeout\s*\(/.test(ow.body)) say('W347-6', 'openWindow clears a window, which resets it; continuous writes would starve the notice');
  }

  // W347-7: THE ONE GATE.
  const armCalls = [...code.matchAll(/\bdeps\s*\.\s*armFile\s*\(/g)].map((m) => m.index);
  if (armCalls.length !== 1) say('W347-7', `deps.armFile( is called ${armCalls.length} times; once, inside armChecked`);
  const chk = fnSpan(code, 'check');
  if (gate === null || chk === null) {
    say('W347-7', 'armChecked or check is gone');
  } else {
    if (armCalls.some((i) => i < gate.start || i > gate.end)) say('W347-7', 'deps.armFile( is called outside armChecked');
    const gb = gate.body;
    const g1 = at(gb, 'deps.canonical(');
    const g2 = at(gb, 'excludes(', g1);
    const g3 = at(gb, 'deps.armFile(', g2);
    const g4a = at(gb, 'deps.canonical(', g3);
    const g4b = at(gb, 'excludes(', g4a);
    const g5 = at(gb, 'deps.identity(', g4b);
    const dev = at(gb, '.dev === ', g5);
    const ino = at(gb, '.ino === ', g5);
    const win = at(gb, 'openWindowsOf(', g5);
    const order = [g1, g2, g3, g4a, g4b, g5, dev, ino];
    if (order.some((i) => i === -1) || (win !== -1 && (win < dev || win < ino))) {
      say('W347-7', 'armChecked does not ask, in order, canonical, excludes, armFile, canonical, excludes, identity and a dev and ino comparison before the window');
    }
    if (!/for\s*\([^)]*\bARM_RECHECKS\b[^)]*\)/.test(gb)) say('W347-7', 'G5\'s retry is not bounded by ARM_RECHECKS');
    const cb = chk.body;
    const bound = /\brechecks\s*>=\s*ARM_RECHECKS\b/.exec(cb);
    const reArm = at(cb, 'armChecked(');
    if (bound === null || reArm === -1 || bound.index > reArm) say('W347-7', 'the check\'s re-arm is not bounded by ARM_RECHECKS');
    if (!/\.dev === h\.dev/.test(cb) || !/\.ino === h\.ino/.test(cb) || !cb.includes('excludes(') || !cb.includes('deps.canonical(')) {
      say('W347-7', 'the check does not ask G1, G2 and G5 again');
    }
  }

  // W347-8: THE CHECK, two check phases after the arm.
  if (gate !== null) {
    const gb = gate.body;
    const kern = at(gb, 'deps.afterKernelSees(', at(gb, 'deps.identity('));
    const kArgs = kern === -1 ? '' : (balanced(gb, kern + 'deps.afterKernelSees'.length) ?? '');
    if (kern === -1 || !kArgs.includes('check(')) say('W347-8', 'a successful arm does not hand the check to afterKernelSees(');
  }
  const prod = fnSpan(code, 'afterKernelSees');
  if (prod === null || !/^\s*setImmediate\(\s*\(\)\s*=>\s*setImmediate\(\s*fn\s*\)\s*\);?\s*$/.test(prod.body)) {
    say('W347-8', 'the production afterKernelSees is not two nested setImmediate( calls; one check phase runs before the poll that registers a re-arm made in a watch callback');
  }
  return out;
}

/** Each plant names the rule that must read it red. Edits apply to the raw source. */
const OPEN_FILE_PLANTS = [
  { rule: 'W347-1', name: '@parcel/watcher imported', edits: [{ prepend: "import watcher from '@parcel/watcher';\n" }] },
  { rule: 'W347-2', name: 'watch( on the path', edits: [{ find: '`/dev/fd/${String(fd)}`', to: 'canonicalPath' }] },
  { rule: 'W347-2', name: 'O_NONBLOCK removed', edits: [{ find: ' | constants.O_NONBLOCK', to: '' }] },
  { rule: 'W347-2', name: 'O_NOFOLLOW removed', edits: [{ find: ' | constants.O_NOFOLLOW', to: '' }] },
  { rule: 'W347-2', name: 'the isFile test removed', edits: [{ find: '    if (!st.isFile()) return null;\n', to: '' }] },
  { rule: 'W347-2', name: 'the finally removed', edits: [{ find: '  } finally {\n    closeSync(fd);\n  }', to: '  }\n  closeSync(fd);' }] },
  { rule: 'W347-3', name: 'a readFileSync planted', edits: [{ find: "    openWindowsOf(e);\n    if (kind === 'rename'", to: "    readFileSync(e.path);\n    openWindowsOf(e);\n    if (kind === 'rename'" }] },
  { rule: 'W347-3', name: 'a path in a log line', edits: [{ find: '`open file watch: ${String(next.size)}', to: '`open file watch ${path}: ${String(next.size)}' }] },
  { rule: 'W347-4', name: 'the rename re-arm removed', edits: [{ find: '      closeHandle(e);\n      armChecked(e);', to: '      closeHandle(e);' }] },
  { rule: 'W347-4', name: 'the rename arm calling armFile directly', edits: [{ find: '      closeHandle(e);\n      armChecked(e);', to: '      closeHandle(e);\n      deps.armFile(e.path, () => undefined);' }] },
  { rule: 'W347-4', name: 'the flush re-arm removed', edits: [{ find: '      if (!hasRepo(e, repoPath)) continue;\n      armChecked(e);', to: '      if (!hasRepo(e, repoPath)) continue;' }] },
  { rule: 'W347-4', name: 'the window removed from the arm path', edits: [{ find: '        armedCount += 1;\n        openWindowsOf(e);\n', to: '        armedCount += 1;\n' }] },
  { rule: 'W347-5', name: 'the cap test removed', edits: [{ find: 'armedCount >= OPEN_FILE_WATCH_CAP', to: 'false' }] },
  { rule: 'W347-6', name: 'a literal 300', edits: [{ find: 'flush(repoPath), DEFAULT_DEBOUNCE_MS)', to: 'flush(repoPath), 300)' }] },
  { rule: 'W347-6', name: 'the window reset by a later event', edits: [{ find: '    if (disposed || windows.has(repoPath)) return;\n', to: '    if (disposed) return;\n    windows.get(repoPath)?.clear();\n' }] },
  { rule: 'W347-7', name: 'G2 removed', edits: [{ find: 'if (plan === null || !plan.excludes(c1)) return dormant(e);', to: 'if (plan === null) return dormant(e);' }] },
  { rule: 'W347-7', name: 'the G4 re-ask removed', edits: [{ find: 'if (c2 === null || !plan.excludes(c2)) {', to: 'if (c2 === null) {' }] },
  { rule: 'W347-7', name: 'the identity comparison removed', edits: [{ find: 'if (id !== null && id.dev === h.dev && id.ino === h.ino) {\n        // G6', to: 'if (id !== null) {\n        // G6' }] },
  { rule: 'W347-7', name: "the check's own G2 removed", edits: [{ find: 'const inPlan = c !== null && e.plan !== null && e.plan.excludes(c);', to: 'const inPlan = c !== null;' }] },
  { rule: 'W347-7', name: 'a second armFile( outside the gate', edits: [{ find: '    e.rechecks += 1;\n    armChecked(e);', to: '    e.rechecks += 1;\n    deps.armFile(e.path, () => undefined);\n    armChecked(e);' }] },
  { rule: 'W347-7', name: "G5's bound removed", edits: [{ find: 'attempt <= ARM_RECHECKS', to: 'attempt >= 0' }] },
  { rule: 'W347-7', name: "the check's bound removed", edits: [{ find: 'if (e.rechecks >= ARM_RECHECKS) {', to: 'if (false) {' }] },
  { rule: 'W347-8', name: 'the afterKernelSees( call removed', edits: [{ find: '        deps.afterKernelSees(() => check(e, h));\n', to: '' }] },
  { rule: 'W347-8', name: 'one setImmediate', edits: [{ find: 'setImmediate(() => setImmediate(fn));', to: 'setImmediate(fn);' }] }
];

function applyPlant(raw, plant) {
  let out = raw;
  for (const e of plant.edits) {
    if (e.prepend !== undefined) { out = e.prepend + out; continue; }
    const i = out.indexOf(e.find);
    if (i === -1 || out.indexOf(e.find, i + 1) !== -1) return null;
    out = out.slice(0, i) + e.to + out.slice(i + e.find.length);
  }
  return out;
}

const openFilesRaw = readFileSync(OPEN_FILES, 'utf8');
const shippingOpenFiles = openFileFindings(openFilesRaw);
for (const f of shippingOpenFiles) failures.push(`${OPEN_FILES}: ${f}`);

// W347-5's other half: nothing else in main declares the cap.
for (const file of tsFiles('src/main')) {
  if (file === OPEN_FILES) continue;
  if (/\bOPEN_FILE_WATCH_CAP\s*=/.test(stripComments(readFileSync(file, 'utf8')))) {
    failures.push(`${file}: W347-5: declares a second OPEN_FILE_WATCH_CAP`);
  }
}

const plantRows = [];
for (const plant of OPEN_FILE_PLANTS) {
  const planted = applyPlant(openFilesRaw, plant);
  if (planted === null) {
    failures.push(
      `W347 plant "${plant.name}": its anchor is not in ${OPEN_FILES} exactly once, so the ablation ` +
        'proves nothing. Move the anchor with the code it plants into.'
    );
    plantRows.push({ plant, red: false, stale: true });
    continue;
  }
  const red = openFileFindings(planted).some((f) => f.startsWith(`${plant.rule}:`));
  plantRows.push({ plant, red, stale: false });
  if (!red) {
    failures.push(`W347 plant "${plant.name}" left ${plant.rule} green; the rule no longer catches the defect it owns.`);
  }
}
const rulesPlanted = new Set(OPEN_FILE_PLANTS.map((p) => p.rule));
for (let n = 1; n <= 8; n++) {
  if (!rulesPlanted.has(`W347-${n}`)) failures.push(`W347-${n} has no plant, so nothing proves it can fail.`);
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

process.stdout.write(`\n${pad('W347 PLANT', 46)} ${pad('RULE', 8)} READ\n`);
for (const r of plantRows) {
  process.stdout.write(
    `${pad(r.plant.name, 46)} ${pad(r.plant.rule, 8)} ${r.stale ? 'STALE ANCHOR' : r.red ? 'red' : 'GREEN'}\n`
  );
}
process.stdout.write(
  `open-files.ts at the shipping source: ${shippingOpenFiles.length === 0 ? 'all eight W347 rules hold' : `${shippingOpenFiles.length} W347 finding(s)`}\n`
);

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
    'entry excludes the directory it names and nothing else. The open file ' +
    'watch arms one file through a descriptor, through one gate that asks the ' +
    'plan before and after the open and checks the inode once the kernel holds ' +
    `the watch, and each of its ${OPEN_FILE_PLANTS.length} plants reads red.\n`
);
