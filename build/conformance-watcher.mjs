/**
 * `npm run conformance:watcher` — the cheap gate on the file watcher's
 * exclusion budget (Phase 151), its open file watch (Phase 347), and since
 * Phase 365 the watcher process, its one queue and the five sites that ask it.
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
 * The dotgit watch in `src/main/watcher/repo-watcher.ts` already passes five
 * plain paths. Four more and it breaks in exactly that silent way. That is the
 * row this gate is really guarding.
 *
 * WHAT IT ASSERTS:
 *
 *  1. Every `watchFolder(` call site under `src/main` passes at most eight
 *     PLAIN entries in its `ignore` array. An entry containing a glob
 *     character, and a RegExp, do not count, because
 *     `node_modules/@parcel/watcher/wrapper.js` routes both to the userspace
 *     matcher instead of to the CoreServices array, so neither consumes a
 *     slot. Until Phase 365 the sites called `watcher.subscribe(` and this rule
 *     counted those; since then the native call lives in the watcher process
 *     and only forwards what a site wrote, so the budget is counted where the
 *     ignore arrays are written, at the sites' `watchFolder(`.
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
 *     that silently stopped finding call sites fails instead of passing; it
 *     must find the five sites in four files.
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
 *  8. PHASE 365, rules W365-1 to W365-10 (build/p365/SPEC.md §7.1, D12): the
 *     watcher runs in a `utilityProcess` main forks, and `@parcel/watcher` is
 *     loaded by that process alone (research 143 §2.5, §7: overlapping calls
 *     into it damaged main's own heap). One importer of the native module;
 *     main never loads it; ONE queue, one native call in flight, FIFO; the
 *     existence check the statement right before the native subscribe, the
 *     `exists` both servers are handed statSync(dir).isDirectory() (the probe
 *     review: an exists answering yes for anything read green before), and a
 *     folder removed while its watch waited its turn driven too; the
 *     grace for a close whose folder is gone, which never holds the queue;
 *     the bounds, each with one line and a replacement; the fork's shape; the
 *     restart, its notice, its backoff and its give-up; the quit; and exactly
 *     five sites, each testing for null and none tracking a close twice. THE
 *     FIX ROUND widened five of them, each with plants of its own: a re-watch
 *     of a folder whose graced close still waits follows that close (W365-5);
 *     a first watch the replaced process held is asked of the next one and
 *     answered there (W365-6); the fork's `error` listener, and the end of the
 *     process by a SIGKILL to the pid Electron's own process list names before
 *     Electron's `kill()`, which otherwise waits on main's thread up to 2 s
 *     (W365-7); the give-up's one word to every live watch, which is no
 *     re-scan (W365-8); and the quit, which posts nothing and ends the process
 *     (W365-9). The
 *     rules read the source with comments blanked (and with the TypeScript
 *     parser where order matters), and the BEHAVIOUR is DRIVEN by the probe
 *     beside this file over a fake native module, a fake process and a fake
 *     clock, because "one at a time" is a property of runs, not of text.
 *     Every rule is proved by in-memory plants: each plant is laid over the
 *     tree, the static rules are read again and the probe drives the planted
 *     source, and the plant must read red on its own rule and on no rule it
 *     does not declare. A plant whose anchor is gone fails.
 *
 * `--root <dir>` reads another tree (a verifier's hostile copy) with this
 * checkout's probe and runner; the plants are anchored on the shipping text,
 * so a copy that moved an anchor reads that plant STALE.
 *
 * IT SPAWNS NOTHING beyond one node process for the probe. It opens no
 * FSEvents stream, loads no native module, starts no tmux server, launches no
 * Electron, runs no git, and reads nothing under the person's home. It writes
 * one scratch fixture under the system temporary folder and removes it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tsxCli } from './ts-runner.mjs';

/** The checkout this gate and its probe live in. */
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootFlag = process.argv.indexOf('--root');
/** The tree whose sources are read: this checkout, or `--root`. */
const ROOT =
  rootFlag >= 0 && process.argv[rootFlag + 1] !== undefined ? resolve(process.argv[rootFlag + 1]) : HERE;
const at = (rel) => join(ROOT, rel);

/** The measured ceiling. `build/fsevents-cap.c` is the measurement. */
const BUDGET = 8;

/** The one module allowed to build an `ignore` array that is not a literal. */
const PLANNER = 'planWorktreeIgnore';

const failures = [];

// ---------------------------------------------------------------------------
// The scanner.
// ---------------------------------------------------------------------------

/**
 * Every .ts file under a directory of the tree, recursively, skipping
 * __tests__, as a path under the root with forward slashes.
 */
function tsFiles(dir) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const p = join(abs, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        walk(p);
      } else if (entry.name.endsWith('.ts')) {
        out.push(relative(ROOT, p).split(sep).join('/'));
      }
    }
  };
  walk(isAbsolutePath(dir) ? dir : at(dir));
  return out;
}

function isAbsolutePath(p) {
  return p.startsWith('/');
}

/** A file of the tree, or null when it is not there. Cached: the tree does not move while the gate runs. */
const shippingText = new Map();
function readTree(rel) {
  if (!shippingText.has(rel)) {
    const p = at(rel);
    shippingText.set(rel, existsSync(p) ? readFileSync(p, 'utf8') : null);
  }
  return shippingText.get(rel);
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
 * Find every `watchFolder(` call in one file and describe its `ignore`.
 * Returns rows of { line, kind: 'literal' | 'computed' | 'none', plain, userspace, expr }.
 *
 * The ignore array is the `ignore` property of the call's SECOND argument
 * (`watchFolder(dir, { ignore: [...] }, onEvents)`); a callback after it that
 * happens to build an object with an `ignore` key is not read. A declaration,
 * `function watchFolder(`, is not a call site.
 *
 * An entry counts as USERSPACE, and therefore costs no CoreServices slot, if
 * it carries a glob character or is a regular expression literal. Both are
 * routed to `ignoreGlobs` by `node_modules/@parcel/watcher/wrapper.js`.
 */
function scanSource(rawSrc) {
  const src = stripComments(rawSrc);
  const rows = [];
  const call = /\bwatchFolder\s*\(/g;
  let m;
  while ((m = call.exec(src)) !== null) {
    if (/\bfunction\s*\*?\s*$/.test(src.slice(Math.max(0, m.index - 40), m.index))) continue;
    const open = m.index + m[0].length - 1;
    const inner = balanced(src, open);
    if (inner === null) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const options = topLevelSplit(inner)[1] ?? '';
    if (options === '') {
      rows.push({ line, kind: 'none', plain: 0, userspace: 0, expr: '' });
      continue;
    }
    if (!options.startsWith('{')) {
      rows.push({ line, kind: 'computed', plain: 0, userspace: 0, expr: options.slice(0, 40).split('\n')[0].trim() });
      continue;
    }
    const props = topLevelSplit(balanced(options, 0) ?? '');
    if (props.some((p) => p.startsWith('...'))) {
      rows.push({ line, kind: 'computed', plain: 0, userspace: 0, expr: options.slice(0, 40).split('\n')[0].trim() });
      continue;
    }
    const ig = props.find((p) => /^ignore\s*(?::|$)/.test(p));
    if (ig === undefined) {
      rows.push({ line, kind: 'none', plain: 0, userspace: 0, expr: '' });
      continue;
    }
    const value = ig.replace(/^ignore\s*:?\s*/, '');
    if (!value.startsWith('[')) {
      rows.push({ line, kind: 'computed', plain: 0, userspace: 0, expr: (value || 'ignore').slice(0, 40).split('\n')[0].trim() });
      continue;
    }
    const arr = balanced(value, 0);
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
// Rule 6, first: prove the scanner on fixtures this file writes.
// ---------------------------------------------------------------------------

const fixtures = [
  {
    name: 'eight plain paths is the maximum that works',
    src: `watchFolder(d, { ignore: [a,b,c,d,e,f,g,h] }, cb);`,
    expect: { count: 1, kind: 'literal', plain: 8, userspace: 0 }
  },
  {
    name: 'nine plain paths is the defect this gate exists for',
    src: `watchFolder(d, { ignore: [a,b,c,d,e,f,g,h,i] }, cb);`,
    expect: { count: 1, kind: 'literal', plain: 9, userspace: 0 }
  },
  {
    name: 'a glob costs no slot, and a comma inside a string is not a separator',
    src: `watchFolder(dir, {\n  ignore: [join(d, 'a,b'), '**/x/**', join(d, 'c')]\n}, cb);`,
    expect: { count: 1, kind: 'literal', plain: 2, userspace: 1 }
  },
  {
    name: 'a regular expression literal costs no slot either',
    src: `watchFolder(dir, { ignore: [join(d, 'a'), /^venv(?:\\/|$)/] }, cb);`,
    expect: { count: 1, kind: 'literal', plain: 1, userspace: 1 }
  },
  {
    name: 'a computed ignore is recognised as computed, not silently skipped',
    src: `watchFolder(dir, { ignore: plan.ignore }, cb);`,
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
  },
  {
    name: "an apostrophe in a comment inside the call does not hide the call",
    src:
      'watchFolder(dir, {\n' +
      "  // the rest are this repository's ignored roots\n" +
      '  ignore: plan.ignore\n' +
      '}, cb);',
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
  },
  {
    name: 'a watch named only inside a comment is not counted as a call site',
    src: '// watchFolder(dir, { ignore: [a,b,c,d,e,f,g,h,i] }, cb);\nconst x = 1;',
    expect: { count: 0, kind: 'none', plain: 0, userspace: 0 }
  },
  {
    name: 'the declaration of watchFolder is not a call site',
    src: 'export async function watchFolder(dir: string, options: { ignore?: string[] }, cb: () => void) {}',
    expect: { count: 0, kind: 'none', plain: 0, userspace: 0 }
  },
  {
    name: 'options handed in a variable are computed, not empty',
    src: 'watchFolder(dir, options, cb);',
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
  },
  {
    name: 'a callback that builds an ignore array is not the watch\'s ignore',
    src: 'watchFolder(dir, {}, (err, events) => ({ ignore: [a,b,c,d,e,f,g,h,i] }));',
    expect: { count: 1, kind: 'none', plain: 0, userspace: 0 }
  },
  {
    name: 'a spread in the options is computed, because it can carry an ignore',
    src: 'watchFolder(dir, { ...base }, cb);',
    expect: { count: 1, kind: 'computed', plain: 0, userspace: 0 }
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

/** Phase 365: the module that DEFINES watchFolder, which is not a site. */
const WATCH_HOST = 'src/main/watcher/host.ts';

const sites = [];
for (const file of tsFiles('src/main')) {
  if (file === WATCH_HOST) continue;
  const src = readTree(file);
  if (src === null || !src.includes('watchFolder')) continue;
  for (const row of scanSource(src)) sites.push({ file, ...row });
}

if (sites.length < 5 || new Set(sites.map((s) => s.file)).size < 4) {
  failures.push(
    `found ${sites.length} watchFolder( call site(s) in ${new Set(sites.map((s) => s.file)).size} ` +
      'file(s) under src/main, and the five sites live in four files. Either the ' +
      'sites moved or this scanner stopped working; a gate that finds nothing ' +
      'must fail rather than pass.'
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
    const src = readTree(s.file) ?? '';
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
const at347 = (hay, needle, from = 0) => (from < 0 ? -1 : hay.indexOf(needle, from));

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
  if (/\bwatcher\s*\.\s*subscribe\b/.test(code) || /\bwatchFolder\s*\(/.test(code) || /\bignore\s*:/.test(code)) {
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
    const open = at347(b, 'openSync(');
    const fstat = at347(b, 'fstatSync(', open);
    const isFile = at347(b, '.isFile()', fstat);
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
    const ren = at347(ob, "kind === 'rename'");
    const close = at347(ob, 'closeHandle(', ren);
    const rearm = at347(ob, 'armChecked(', close);
    if (ren === -1 || !ob.includes("'error'") || close === -1 || rearm === -1) {
      say('W347-4', 'a rename or error event does not close the watch and call armChecked(');
    }
    if (ob.includes('deps.armFile(')) say('W347-4', 'onEvent arms with deps.armFile( directly, past the gate');
    if (!flush.body.includes('armChecked(')) say('W347-4', 'the flush no longer re-arms its repository\'s dormant entries through armChecked(');
    const gb = gate.body;
    const id = at347(gb, 'deps.identity(');
    const win = at347(gb, 'openWindowsOf(', id);
    const kern = at347(gb, 'deps.afterKernelSees(', id);
    if (id === -1 || win === -1 || (kern !== -1 && win > kern)) {
      say('W347-4', 'a successful arm does not open the window before the check is handed on');
    }
  }

  // W347-5: one cap, decided in the gate.
  const capDecls = [...code.matchAll(/\bexport\s+const\s+OPEN_FILE_WATCH_CAP\s*=/g)].length;
  if (capDecls !== 1) say('W347-5', `OPEN_FILE_WATCH_CAP is declared ${capDecls} times in the module, not once`);
  if (gate !== null) {
    const capAt = at347(gate.body, '>= OPEN_FILE_WATCH_CAP');
    const armAt = at347(gate.body, 'deps.armFile(');
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
    const set = at347(ow.body, 'deps.setTimeout(');
    const setArgs = set === -1 ? '' : (balanced(ow.body, set + 'deps.setTimeout'.length) ?? '');
    const lastArg = topLevelSplit(setArgs).at(-1) ?? '';
    if (lastArg !== 'DEFAULT_DEBOUNCE_MS') say('W347-6', `the window is \`${lastArg}\` long, not DEFAULT_DEBOUNCE_MS`);
    const has = at347(ow.body, 'windows.has(');
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
    const g1 = at347(gb, 'deps.canonical(');
    const g2 = at347(gb, 'excludes(', g1);
    const g3 = at347(gb, 'deps.armFile(', g2);
    const g4a = at347(gb, 'deps.canonical(', g3);
    const g4b = at347(gb, 'excludes(', g4a);
    const g5 = at347(gb, 'deps.identity(', g4b);
    const dev = at347(gb, '.dev === ', g5);
    const ino = at347(gb, '.ino === ', g5);
    const win = at347(gb, 'openWindowsOf(', g5);
    const order = [g1, g2, g3, g4a, g4b, g5, dev, ino];
    if (order.some((i) => i === -1) || (win !== -1 && (win < dev || win < ino))) {
      say('W347-7', 'armChecked does not ask, in order, canonical, excludes, armFile, canonical, excludes, identity and a dev and ino comparison before the window');
    }
    if (!/for\s*\([^)]*\bARM_RECHECKS\b[^)]*\)/.test(gb)) say('W347-7', 'G5\'s retry is not bounded by ARM_RECHECKS');
    const cb = chk.body;
    const bound = /\brechecks\s*>=\s*ARM_RECHECKS\b/.exec(cb);
    const reArm = at347(cb, 'armChecked(');
    if (bound === null || reArm === -1 || bound.index > reArm) say('W347-7', 'the check\'s re-arm is not bounded by ARM_RECHECKS');
    if (!/\.dev === h\.dev/.test(cb) || !/\.ino === h\.ino/.test(cb) || !cb.includes('excludes(') || !cb.includes('deps.canonical(')) {
      say('W347-7', 'the check does not ask G1, G2 and G5 again');
    }
  }

  // W347-8: THE CHECK, two check phases after the arm.
  if (gate !== null) {
    const gb = gate.body;
    const kern = at347(gb, 'deps.afterKernelSees(', at347(gb, 'deps.identity('));
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

/**
 * One plant's edits over a file's text, or null when an anchor is not in it
 * exactly once. An anchor is a string or a RegExp; `to` is text or a function
 * of the match. `prepend` and `append` need no anchor.
 */
function applyPlant(raw, plant) {
  let out = raw;
  for (const e of plant.edits) {
    if (e.prepend !== undefined) { out = e.prepend + out; continue; }
    if (e.append !== undefined) { out = out + e.append; continue; }
    if (e.find instanceof RegExp) {
      const all = [...out.matchAll(new RegExp(e.find.source, e.find.flags.includes('g') ? e.find.flags : `${e.find.flags}g`))];
      if (all.length !== 1) return null;
      const m = all[0];
      const to = typeof e.to === 'function' ? e.to(m) : e.to;
      out = out.slice(0, m.index) + to + out.slice(m.index + m[0].length);
      continue;
    }
    const i = out.indexOf(e.find);
    if (i === -1 || out.indexOf(e.find, i + 1) !== -1) return null;
    out = out.slice(0, i) + e.to + out.slice(i + e.find.length);
  }
  return out;
}

const openFilesRaw = readTree(OPEN_FILES) ?? '';
const shippingOpenFiles = openFileFindings(openFilesRaw);
for (const f of shippingOpenFiles) failures.push(`${OPEN_FILES}: ${f}`);

// W347-5's other half: nothing else in main declares the cap.
for (const file of tsFiles('src/main')) {
  if (file === OPEN_FILES) continue;
  if (/\bOPEN_FILE_WATCH_CAP\s*=/.test(stripComments(readTree(file) ?? ''))) {
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
// Rules W365-1 to W365-10 (Phase 365): the watcher process.
// ---------------------------------------------------------------------------

const P365 = {
  HOST: WATCH_HOST,
  QUEUE: 'src/main/watcher/process/queue.ts',
  PROCESS: 'src/main/watcher/watcher-process.ts',
  IN_PROCESS: 'src/main/watcher/process/in-process.ts',
  PROCESS_DIR: 'src/main/watcher/process/',
  WATCHER_DIR: 'src/main/watcher/',
  CAPABILITIES: 'src/main/capabilities.ts',
  VITE: 'electron.vite.config.ts',
  REPO_WATCHER: 'src/main/watcher/repo-watcher.ts',
  CONFIG_STORE: 'src/main/config/store.ts',
  MACHINES_STORE: 'src/main/machines/store.ts',
  HARVEST: 'src/main/manifest/harvest/watch.ts',
  ARCH_WATCH: 'src/main/arch/watch.ts'
};

/** The five sites, by file and the function the call sits in (build/p365/SPEC.md §7.1 W365-10). */
const SITES_365 = [
  { file: P365.REPO_WATCHER, fn: 'RepoWatcher.watch' },
  { file: P365.REPO_WATCHER, fn: 'RepoWatcher.startDotgitWatcher' },
  { file: P365.CONFIG_STORE, fn: 'startAgentOverlayWatch' },
  { file: P365.MACHINES_STORE, fn: 'startMachinesWatch' },
  { file: P365.HARVEST, fn: 'subscribeTo' }
];

const PARCEL = '@parcel/watcher';

/**
 * The fork's callee, spelled in parts, so that a gate reading build/ for the
 * processes a script starts (`gate:background`) never takes one of this file's
 * sentences or planted texts for a call.
 */
const FORK = ['utilityProcess', 'fork'].join('.');

/** The built process may require these and its own chunks, and nothing else (D13). */
const PROCESS_BUILT_SPECS = new Set([PARCEL, 'node:fs', 'fs', 'node:path', 'path']);

const W365_RULES = [
  ['W365-1', 'ONE IMPORTER: @parcel/watcher is loaded at run time by watcher-process.ts (a static import) and process/in-process.ts (a dynamic import() alone) and by nothing else, and the process names no other package; a build\'s out/main/watcher-process.js requires nothing else (read only when built)'],
  ['W365-2', 'MAIN NEVER LOADS IT: host.ts reaches process/in-process only through await import( inside if (process.versions.electron === undefined); driven in Electron, the host forks and loads neither; a build\'s out/main/index.js and its load chunks require it nowhere (read only when built)'],
  ['W365-3', 'ONE QUEUE: native.subscribe( and .unsubscribe( each once in queue.ts, inside a turn; driven, 400 mixed operations run one at a time, in the order asked'],
  ['W365-4', 'THE CHECK: the watch turn\'s first statement asks deps.exists( and its next calls the native subscribe, with no await between, and both servers (the watcher process and the in-process port) are handed an exists of statSync(dir).isDirectory() with any throw answering false; driven, a folder that is not there answers null with no native call, so does one removed while its watch waited its turn, and the subscribe follows the check in the same turn'],
  ['W365-5', 'THE GRACE: WATCH_GONE_GRACE_MS is a top-level literal of at least 1,000; driven, a close whose folder is gone is not on the chain before 1,000 ms, is after the grace, and a watch made meanwhile completes first; and (the fix round) a watch of that SAME folder, made again during the grace, subscribes only after the graced close has run'],
  ['W365-6', 'THE BOUNDS: WATCH_TURN_NOTE_MS >= 1,000, WATCH_CLOSE_REPLY_MS < the disposer\'s wedge guard (capabilities.ts\'s afterMs( before disposeGitIpc()), WATCH_START_REPLY_MS <= 30,000, each a literal; driven, each expiry writes one line, ends the process and starts another; a close settles at its bound, and (the fix round) a first watch the ended process held is asked of the next process and answered there, never null at the first; WATCHER_FIRST_WATCH_ASKS is a literal from 2 to below WATCHER_GIVE_UP_EXITS, and, driven, a folder no process ever answers is asked of two processes, then answered null, with no give-up and the other watch going on'],
  ['W365-7', `THE FORK: one ${FORK}( in the watcher, in host.ts, of join(__dirname, 'watcher-process.js') with stdio 'ignore', env of exactly TORTIE_WATCHER, a serviceName and no spread; electron.vite.config.ts emits that entry; driven, nothing is forked at load and one process at the first watch; and (the fix round) the fork's child carries an 'error' listener, and is ended by one process.kill( of its pid with 'SIGKILL' inside an if that asks a function reading app.getAppMetrics(, followed by the child's own kill(), which the forked WatcherChild's kill reaches`],
  ['W365-8', 'RESTART: driven, an exit re-binds every live watch (same folder, same ignore) after the table\'s backoff and hands each exactly one notice whose message is WATCHER_RESTART_ERROR, which isRescanRequired matches; events reach it by the new id; WATCHER_GIVE_UP_EXITS exits and no fork follows, a later watch is null, and (the fix round) every live watch is handed exactly one WATCHER_GAVE_UP_ERROR, a string literal isRescanRequired does NOT match; no fork once quitting'],
  ['W365-9', 'THE QUIT: driven with the real lifecycle.ts, once quitting a watch answers null with no message sent and no fork; and (the fix round) the first close once quitting settles at once, posts nothing, and ends the process, a watch still starting is answered null, and nothing is left for the quit\'s drains'],
  ['W365-10', 'THE FIVE SITES: exactly five calls of watchFolder(, at RepoWatcher.watch, startDotgitWatcher, startAgentOverlayWatch, startMachinesWatch and subscribeTo, each binding its result and testing it against null before its first use; no site wraps a close() in trackWatcherClose; the host wraps every close in it']
];

// -- the tree, with an overlay ------------------------------------------------

/** Every production .ts/.tsx file under src/, as a path under the root. */
const PRODUCTION = (() => {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const p = join(abs, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        if (relative(at('src'), p) === 'test') continue;
        walk(p);
      } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        out.push(relative(ROOT, p).split(sep).join('/'));
      }
    }
  };
  if (existsSync(at('src'))) walk(at('src'));
  return out.sort();
})();

const isProductionPath = (rel) =>
  rel.startsWith('src/') && /\.tsx?$/.test(rel) && !rel.includes('/__tests__/') && !rel.startsWith('src/test/');

/** The tree as one variant sees it: the shipping files with the overlay's texts laid over them. */
function viewOf(overlay) {
  const own = (rel) => Object.prototype.hasOwnProperty.call(overlay, rel);
  return {
    read: (rel) => (own(rel) ? overlay[rel] : readTree(rel)),
    production: () => [...new Set([...PRODUCTION, ...Object.keys(overlay).filter(isProductionPath)])].sort()
  };
}

// -- the TypeScript parser ----------------------------------------------------

const parsed = new Map();
function sfOf(rel, text) {
  const key = `${rel}\0${text}`;
  let sf = parsed.get(key);
  if (sf === undefined) {
    sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(key, sf);
  }
  return sf;
}

function eachNode(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => eachNode(child, visit));
}

function nodesOf(sf, test) {
  const out = [];
  eachNode(sf, (n) => {
    if (test(n)) out.push(n);
  });
  return out;
}

const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const flat = (node, sf) => node.getText(sf).replace(/\s+/g, '');

const hasBody = (n) =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n);

function enclosingFunction(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) if (hasBody(p)) return p;
  return null;
}

function functionName(fn) {
  if ((ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name !== undefined) return fn.name.text;
  if (ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn) || ts.isSetAccessorDeclaration(fn)) {
    const owner = fn.parent;
    const cls = ts.isClassLike(owner) && owner.name !== undefined ? `${owner.name.text}.` : '';
    return `${cls}${fn.name.getText()}`;
  }
  if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
    const p = fn.parent;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (ts.isPropertyAssignment(p)) return p.name.getText();
  }
  return null;
}

/** The nearest NAMED function a node sits in, or null at the top level. */
function enclosingName(node) {
  for (let fn = enclosingFunction(node); fn !== null; fn = enclosingFunction(fn)) {
    const name = functionName(fn);
    if (name !== null) return name;
  }
  return null;
}

/** True when `node` sits directly in `fn`, not in a function nested inside it. */
const directlyIn = (node, fn) => enclosingFunction(node) === fn;

/**
 * Every module a file names, with how: `static` (an import or an export from),
 * `type` (erased), `dynamic` (`import(`), or `require` (a `require(`, or any
 * other call handed the watcher package's name, such as `createRequire(…)(…)`).
 */
function moduleRefs(sf) {
  const out = [];
  eachNode(sf, (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteralLike(n.moduleSpecifier)) {
      const c = n.importClause;
      const typeOnly =
        c !== undefined &&
        (c.isTypeOnly ||
          (c.name === undefined && c.namedBindings !== undefined && ts.isNamedImports(c.namedBindings) &&
            c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly)));
      out.push({ spec: n.moduleSpecifier.text, kind: typeOnly ? 'type' : 'static', node: n });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier !== undefined && ts.isStringLiteralLike(n.moduleSpecifier)) {
      out.push({ spec: n.moduleSpecifier.text, kind: n.isTypeOnly ? 'type' : 'static', node: n });
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference) && ts.isStringLiteralLike(n.moduleReference.expression)) {
      out.push({ spec: n.moduleReference.expression.text, kind: n.isTypeOnly ? 'type' : 'static', node: n });
    } else if (ts.isCallExpression(n) && n.arguments.length > 0 && ts.isStringLiteralLike(n.arguments[0])) {
      const spec = n.arguments[0].text;
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword) out.push({ spec, kind: 'dynamic', node: n });
      else if (ts.isIdentifier(n.expression) && n.expression.text === 'require') out.push({ spec, kind: 'require', node: n });
      else if (isParcel(spec)) out.push({ spec, kind: 'require', node: n });
    }
  });
  return out;
}

const isParcel = (spec) => spec === PARCEL || spec.startsWith(`${PARCEL}/`);
const BUILTINS = new Set(builtinModules);

/** The package a specifier names, or null for a relative one, an alias or a built-in. */
function packageOf(spec) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@shared/') || spec.startsWith('@renderer/')) return null;
  if (spec.startsWith('node:')) return null;
  const parts = spec.split('/');
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  return BUILTINS.has(name) ? null : name;
}

/** A top-level `const NAME = <literal>` of a file: its value, or why it cannot be read. */
function topLiteral(sf, name, kind) {
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const d of statement.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== name) continue;
      const init = d.initializer;
      if (kind === 'number') {
        if (init !== undefined && ts.isNumericLiteral(init)) return { value: Number(init.text) };
        return { error: `${name} is not a numeric literal (\`${init === undefined ? '' : init.getText(sf).slice(0, 60)}\`), so this gate cannot read the bound` };
      }
      if (init !== undefined && ts.isStringLiteralLike(init)) return { value: init.text };
      return { error: `${name} is not a string literal` };
    }
  }
  return { error: `no top-level ${name}` };
}

const isElectronUndefined = (expr, sf) => {
  let e = expr;
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  if (!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
  const l = flat(e.left, sf);
  const r = flat(e.right, sf);
  const isUndef = (t) => t === 'undefined' || t === 'void0';
  return (l === 'process.versions.electron' && isUndef(r)) || (r === 'process.versions.electron' && isUndef(l));
};

/** True when `node` is in the then-branch of an `if (process.versions.electron === undefined)`. */
function inPlainNodeBranch(node, sf) {
  for (let child = node, p = node.parent; p !== undefined; child = p, p = p.parent) {
    if (ts.isIfStatement(p) && p.thenStatement === child && isElectronUndefined(p.expression, sf)) return true;
  }
  return false;
}

const isNativeSubscribe = (n, sf) =>
  ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'subscribe' &&
  /(^|\.)native$/.test(flat(n.expression.expression, sf));

const isExistsCall = (n, sf) => ts.isCallExpression(n) && /(^|\.)exists$/.test(flat(n.expression, sf));

/**
 * The function an `exists` property names, in any of its spellings: inline (an arrow or a
 * function expression), a method, or a name declared at the top of the same file (a function
 * declaration or a const arrow). Null when this gate cannot read it as one.
 */
function existsFunctionOf(sf, prop) {
  if (ts.isMethodDeclaration(prop)) return prop;
  const target = ts.isPropertyAssignment(prop) ? prop.initializer : ts.isShorthandPropertyAssignment(prop) ? prop.name : null;
  if (target === null) return null;
  if (ts.isArrowFunction(target) || ts.isFunctionExpression(target)) return target;
  if (!ts.isIdentifier(target)) return null;
  for (const s of sf.statements) {
    if (ts.isFunctionDeclaration(s) && s.name !== undefined && s.name.text === target.text) return s;
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === target.text && d.initializer !== undefined && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) return d.initializer;
      }
    }
  }
  return null;
}

/** True when `fn` is `(dir) => { try { return statSync(dir).isDirectory(); } catch { return false; } }` and nothing else. */
function isDirectoryCheck(fn, sf) {
  if (fn.parameters.length !== 1 || !ts.isIdentifier(fn.parameters[0].name)) return false;
  const param = fn.parameters[0].name.text;
  const body = fn.body;
  if (body === undefined || !ts.isBlock(body) || body.statements.length !== 1) return false;
  const t = body.statements[0];
  if (!ts.isTryStatement(t) || t.catchClause === undefined || t.finallyBlock !== undefined) return false;
  const tried = t.tryBlock.statements;
  const caught = t.catchClause.block.statements;
  if (tried.length !== 1 || !ts.isReturnStatement(tried[0]) || tried[0].expression === undefined) return false;
  if (flat(tried[0].expression, sf) !== `statSync(${param}).isDirectory()`) return false;
  return caught.length === 1 && ts.isReturnStatement(caught[0]) && caught[0].expression !== undefined && caught[0].expression.kind === ts.SyntaxKind.FalseKeyword;
}

/** True when the file imports `statSync`, under its own name, from node:fs (or fs). */
const importsStatSync = (sf) =>
  sf.statements.some((s) =>
    ts.isImportDeclaration(s) && ts.isStringLiteralLike(s.moduleSpecifier) &&
    (s.moduleSpecifier.text === 'node:fs' || s.moduleSpecifier.text === 'fs') &&
    s.importClause !== undefined && s.importClause.namedBindings !== undefined && ts.isNamedImports(s.importClause.namedBindings) &&
    s.importClause.namedBindings.elements.some((e) => e.name.text === 'statSync' && (e.propertyName === undefined || e.propertyName.text === 'statSync')));

/** A built file's requires: each one's specifier, and whether it waits for a dynamic import. */
function builtRequires(text) {
  const out = [];
  for (const m of text.matchAll(/\brequire\(\s*(["'])([^"']+)\1\s*\)|\bimport\(\s*(["'])([^"']+)\3\s*\)/g)) {
    const spec = m[2] ?? m[4];
    const before = text.slice(Math.max(0, m.index - 160), m.index);
    // Rollup writes `await import(x)` as `Promise.resolve().then(() => require(x))`,
    // sometimes behind an interop helper and a pure annotation.
    const deferred =
      m[4] !== undefined ||
      /\bthen\(\s*\(\)\s*=>\s*(?:\/\*[^*]*\*\/\s*)?(?:[A-Za-z_$][\w$]*\(\s*)*$/.test(before);
    out.push({ spec, deferred });
  }
  return out;
}

/** The files a built entry loads at load, by following its load-time relative requires. */
function builtLoadClosure(entry, read) {
  const seen = new Map();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    const text = read(file);
    if (text === null) {
      seen.set(file, null);
      continue;
    }
    const reqs = builtRequires(text);
    seen.set(file, reqs);
    for (const r of reqs) {
      if (!r.deferred && r.spec.startsWith('.')) queue.push(join(dirname(file), r.spec));
    }
  }
  return seen;
}

// The built readers are proved on fixtures first, as the scanner is.
const BUILT_FIXTURES = [
  {
    name: 'a load-time require of the package is found',
    files: { '/b/index.js': 'const watcher = require("@parcel/watcher");\n' },
    expect: { loadParcel: 1 }
  },
  {
    name: 'a dynamic import of a chunk that requires the package is not a load',
    files: {
      '/b/index.js': 'const x = await Promise.resolve().then(() => require("./chunks/in-process-a.js"));\n',
      '/b/chunks/in-process-a.js': 'const w = require("@parcel/watcher");\n'
    },
    expect: { loadParcel: 0 }
  },
  {
    name: 'a load-time chunk that requires the package is found',
    files: {
      '/b/index.js': 'const shared = require("./chunks/shared-b.js");\n',
      '/b/chunks/shared-b.js': 'const w = require("@parcel/watcher");\n'
    },
    expect: { loadParcel: 1 }
  },
  {
    name: 'an interop-wrapped dynamic require is deferred',
    files: {
      '/b/index.js': 'const n = await Promise.resolve().then(() => /* @__PURE__ */ _interopNamespaceDefault(require("@parcel/watcher")));\n'
    },
    expect: { loadParcel: 0 }
  }
];

function loadParcelCount(closure) {
  let n = 0;
  for (const reqs of closure.values()) for (const r of reqs ?? []) if (!r.deferred && isParcel(r.spec)) n += 1;
  return n;
}

for (const f of BUILT_FIXTURES) {
  const closure = builtLoadClosure('/b/index.js', (p) => f.files[p] ?? null);
  const got = loadParcelCount(closure);
  if (got !== f.expect.loadParcel) {
    failures.push(`built-bundle fixture "${f.name}": read ${got} load-time require(s) of ${PARCEL}, expected ${f.expect.loadParcel}`);
  }
}

/** What the out/ halves of W365-1 and W365-2 read, once (a build is not planted). */
const BUILT = (() => {
  const outMain = at('out/main');
  const proc = join(outMain, 'watcher-process.js');
  const index = join(outMain, 'index.js');
  if (!existsSync(proc) || !existsSync(index)) {
    return { skipped: `skipped: no build${existsSync(outMain) ? ' of the watcher process in out/main (a build from before Phase 365, or none)' : ''}` };
  }
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
  return { index: builtLoadClosure(index, read), proc: builtLoadClosure(proc, read) };
})();

/** The static half of every W365 rule over one variant of the tree. Each finding names its rule. */
function w365Static(view) {
  const out = [];
  const say = (rule, msg) => out.push({ rule, msg });
  const files = view.production();

  // ---- W365-1: one importer ------------------------------------------------
  let processLoads = 0;
  let inProcessLoads = 0;
  for (const rel of files) {
    const text = view.read(rel);
    if (text === null || !text.includes(PARCEL)) continue;
    const sf = sfOf(rel, text);
    for (const r of moduleRefs(sf)) {
      if (!isParcel(r.spec) || r.kind === 'type') continue;
      const where = `${rel}:${lineOf(sf, r.node)}`;
      if (rel === P365.PROCESS && r.kind === 'static') {
        processLoads += 1;
      } else if (rel === P365.IN_PROCESS && r.kind === 'dynamic') {
        inProcessLoads += 1;
      } else if (rel === P365.IN_PROCESS) {
        say('W365-1', `${where} loads ${r.spec} by a ${r.kind === 'static' ? 'static import' : 'require'}; the in-process path reaches it through a dynamic import() alone, so loading in-process.ts loads nothing native`);
      } else {
        say('W365-1', `${where} loads ${r.spec} (${r.kind === 'static' ? 'a static import' : r.kind === 'dynamic' ? 'a dynamic import()' : 'a require'}); only the watcher process loads it, and its overlapping calls in main damaged main's heap (research 143 §2.5)`);
      }
    }
  }
  if (view.read(P365.PROCESS) === null) say('W365-1', `${P365.PROCESS} is missing, so nothing loads the watcher`);
  else if (processLoads === 0) say('W365-1', `${P365.PROCESS} does not import ${PARCEL} statically, so the process has no watcher to run`);
  if (view.read(P365.IN_PROCESS) === null) say('W365-1', `${P365.IN_PROCESS} is missing, so plain Node has no watcher`);
  else if (inProcessLoads === 0) say('W365-1', `${P365.IN_PROCESS} does not reach ${PARCEL} through a dynamic import()`);
  for (const rel of files) {
    if (rel !== P365.PROCESS && !rel.startsWith(P365.PROCESS_DIR)) continue;
    const text = view.read(rel);
    if (text === null) continue;
    const sf = sfOf(rel, text);
    for (const r of moduleRefs(sf)) {
      const pkg = packageOf(r.spec);
      if (pkg !== null && pkg !== PARCEL) {
        say('W365-1', `${rel}:${lineOf(sf, r.node)} names the package ${r.spec}; the watcher process may name ${PARCEL} and no other`);
      }
    }
  }
  if (BUILT.proc !== undefined) {
    for (const [file, reqs] of BUILT.proc) {
      if (reqs === null) {
        say('W365-1', `${relative(ROOT, file)} is required by out/main/watcher-process.js and is not in the build`);
        continue;
      }
      for (const r of reqs) {
        if (r.spec.startsWith('.')) continue;
        if (!PROCESS_BUILT_SPECS.has(r.spec)) {
          say('W365-1', `${relative(ROOT, file)}, reached from out/main/watcher-process.js, requires ${JSON.stringify(r.spec)}; the built watcher process may require ${[...PROCESS_BUILT_SPECS].join(', ')} and its own chunks${r.spec === 'electron' ? ': Electron in the watcher process is a second main' : ''}`);
        }
      }
    }
  }

  // ---- W365-2: main never loads it ------------------------------------------
  const host = view.read(P365.HOST);
  if (host === null) {
    say('W365-2', `${P365.HOST} is missing, so how main reaches the watcher cannot be read`);
  } else {
    const sf = sfOf(P365.HOST, host);
    const refs = moduleRefs(sf).filter((r) => /^\.\/process\/in-process(?:\.(?:js|ts))?$/.test(r.spec));
    for (const r of refs) {
      if (r.kind === 'static' || r.kind === 'require') {
        say('W365-2', `${P365.HOST}:${lineOf(sf, r.node)} loads ./process/in-process by a ${r.kind === 'static' ? 'static import' : 'require'}, so main loads the in-process path, and the native module with it, at load`);
      }
    }
    const dynamic = refs.filter((r) => r.kind === 'dynamic');
    if (dynamic.length !== 1) {
      say('W365-2', `${P365.HOST} reaches ./process/in-process through ${dynamic.length} dynamic import()s; exactly one, in the plain-Node branch`);
    }
    for (const r of dynamic) {
      if (!ts.isAwaitExpression(r.node.parent)) {
        say('W365-2', `${P365.HOST}:${lineOf(sf, r.node)}'s import('./process/in-process') is not awaited where it is made`);
      }
      if (!inPlainNodeBranch(r.node, sf)) {
        say('W365-2', `${P365.HOST}:${lineOf(sf, r.node)}'s import('./process/in-process') is not inside if (process.versions.electron === undefined), so Electron's main can reach the in-process path`);
      }
    }
  }
  if (BUILT.index !== undefined) {
    for (const [file, reqs] of BUILT.index) {
      for (const r of reqs ?? []) {
        if (!r.deferred && isParcel(r.spec)) {
          say('W365-2', `${relative(ROOT, file)} requires ${r.spec} at load, reached from out/main/index.js; main's bundle must load no watcher.node`);
        }
      }
    }
  }

  // ---- W365-3: one queue ----------------------------------------------------
  const queue = view.read(P365.QUEUE);
  let queueSf = null;
  if (queue === null) {
    say('W365-3', `${P365.QUEUE} is missing, so there is no queue`);
  } else {
    queueSf = sfOf(P365.QUEUE, queue);
    const code = stripComments(queue);
    const subs = [...code.matchAll(/\bnative\s*\.\s*subscribe\s*\(/g)].length;
    const unsubs = [...code.matchAll(/\.\s*unsubscribe\s*\(/g)].length;
    if (subs !== 1) say('W365-3', `${P365.QUEUE} calls native.subscribe( ${subs} times; once, in the watch turn`);
    if (unsubs !== 1) say('W365-3', `${P365.QUEUE} calls .unsubscribe( ${unsubs} times; once, in the close turn`);
    for (const n of nodesOf(queueSf, (x) => isNativeSubscribe(x, queueSf) || (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'unsubscribe'))) {
      if (enclosingFunction(n) === null) say('W365-3', `${P365.QUEUE}:${lineOf(queueSf, n)} calls the native module at the top level, outside any turn`);
    }
  }

  // ---- W365-4: the check ------------------------------------------------------
  if (queueSf !== null) {
    const turns = new Set();
    for (const call of nodesOf(queueSf, (x) => isNativeSubscribe(x, queueSf))) {
      const fn = enclosingFunction(call);
      if (fn !== null && nodesOf(fn, (x) => isExistsCall(x, queueSf) && directlyIn(x, fn)).length > 0) turns.add(fn);
    }
    if (turns.size !== 1) {
      say('W365-4', turns.size === 0
        ? `no function in ${P365.QUEUE} both asks deps.exists( and calls the native subscribe, so the existence check is not in the watch turn`
        : `${turns.size} functions in ${P365.QUEUE} both ask deps.exists( and subscribe; one watch turn`);
    } else {
      const fn = [...turns][0];
      const call = nodesOf(fn, (x) => isNativeSubscribe(x, queueSf) && directlyIn(x, fn))[0];
      const statements = fn.body !== undefined && ts.isBlock(fn.body) ? fn.body.statements : [];
      const [first, second] = statements;
      const name = functionName(fn) ?? 'the watch turn';
      if (first === undefined || nodesOf(first, (x) => isExistsCall(x, queueSf) && directlyIn(x, fn)).length === 0) {
        say('W365-4', `${name}'s first statement does not ask deps.exists(; the check must be the first thing the turn does`);
      }
      if (second === undefined || call === undefined || call.pos < second.pos || call.end > second.end) {
        say('W365-4', `${name}'s native subscribe is not the statement right after the check`);
      }
      if (call !== undefined) {
        for (const s of [first, second]) {
          if (s === undefined) continue;
          for (const a of nodesOf(s, (x) => ts.isAwaitExpression(x) && directlyIn(x, fn))) {
            // An await that wraps the call is the call's own; any other that
            // starts before the call ENDS (its arguments included, which run
            // before it) sits between the check and the native subscribe.
            const contains = a.pos <= call.pos && call.end <= a.end;
            if (a.getStart(queueSf) < call.end && !contains) {
              say('W365-4', `an await sits between ${name}'s check and its native subscribe (${P365.QUEUE}:${lineOf(queueSf, a)}), so the folder can go between them`);
            }
          }
        }
      }
    }
  }

  // ---- W365-4, the check's own words in the hands that build the queue --------------
  // The queue asks `deps.exists(`; what "there" MEANS is the function each server is handed,
  // and the queue's own drive replaces it with a fake. So the two callers of serveWatchQueue (the
  // watcher process, which production runs, and the in-process port, which vitest and the tsx
  // probes run) are read here: each hands `exists` as statSync(dir).isDirectory(), any throw
  // answering false (build/p365/SPEC.md D3, §4.1). The probe review: an `exists` answering yes for
  // anything, or existsSync's yes for a FILE, read green before this half.
  for (const rel of [P365.PROCESS, P365.IN_PROCESS]) {
    const text = view.read(rel);
    if (text === null) continue; // W365-1 names a missing entry
    const sf = sfOf(rel, text);
    const calls = nodesOf(sf, (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'serveWatchQueue');
    if (calls.length !== 1) {
      say('W365-4', `${rel} calls serveWatchQueue( ${calls.length} times; once, handing the queue the check it asks`);
      continue;
    }
    const where = `${rel}:${lineOf(sf, calls[0])}`;
    const [deps] = calls[0].arguments;
    const prop = deps !== undefined && ts.isObjectLiteralExpression(deps)
      ? deps.properties.find((p) => p.name !== undefined && p.name.getText(sf) === 'exists')
      : undefined;
    const fn = prop === undefined ? null : existsFunctionOf(sf, prop);
    if (fn === null) {
      say('W365-4', `${where}'s serveWatchQueue( is handed no exists this gate can read as a function of the file, so what "there" means cannot be read`);
    } else if (!isDirectoryCheck(fn, sf) || !importsStatSync(sf)) {
      say('W365-4', `${where}'s exists is not statSync(dir).isDirectory() from node:fs with any throw answering false, so a folder that is not there, or a file, can reach the native subscribe (build/p365/SPEC.md D3)`);
    }
  }

  // ---- W365-5: the grace --------------------------------------------------------
  if (queueSf !== null) {
    const grace = topLiteral(queueSf, 'WATCH_GONE_GRACE_MS', 'number');
    if (grace.error !== undefined) say('W365-5', `${P365.QUEUE}: ${grace.error}`);
    else if (grace.value < 1_000) say('W365-5', `WATCH_GONE_GRACE_MS is ${grace.value}; at least 1,000, so the FSEvents thread's own stop of a deleted root runs first (build/p365/SPEC.md D4)`);
  }

  // ---- W365-6: the bounds -------------------------------------------------------
  if (queueSf !== null) {
    const note = topLiteral(queueSf, 'WATCH_TURN_NOTE_MS', 'number');
    if (note.error !== undefined) say('W365-6', `${P365.QUEUE}: ${note.error}`);
    else if (note.value < 1_000) say('W365-6', `WATCH_TURN_NOTE_MS is ${note.value}; at least 1,000, or every ordinary turn is a line`);
  }
  if (host !== null) {
    const sf = sfOf(P365.HOST, host);
    const close = topLiteral(sf, 'WATCH_CLOSE_REPLY_MS', 'number');
    const start = topLiteral(sf, 'WATCH_START_REPLY_MS', 'number');
    const caps = view.read(P365.CAPABILITIES);
    let guard = { error: `${P365.CAPABILITIES} is missing, so the disposer's wedge guard cannot be read` };
    if (caps !== null) {
      const csf = sfOf(P365.CAPABILITIES, caps);
      const dispose = nodesOf(csf, (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'disposeGitIpc')[0];
      const guards = dispose === undefined ? [] : nodesOf(csf, (x) =>
        ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'afterMs' &&
        x.arguments.length === 1 && ts.isNumericLiteral(x.arguments[0]) && x.end <= dispose.pos);
      const last = guards.at(-1);
      guard = last === undefined
        ? { error: `no afterMs(<literal>) before disposeGitIpc() in ${P365.CAPABILITIES}, so the disposer's wedge guard cannot be read` }
        : { value: Number(last.arguments[0].text) };
    }
    if (close.error !== undefined) say('W365-6', `${P365.HOST}: ${close.error}`);
    if (start.error !== undefined) say('W365-6', `${P365.HOST}: ${start.error}`);
    if (guard.error !== undefined) say('W365-6', guard.error);
    if (close.value !== undefined && guard.value !== undefined && !(close.value < guard.value)) {
      say('W365-6', `WATCH_CLOSE_REPLY_MS is ${close.value} and the disposer's wedge guard is ${guard.value}; a close must settle inside the guard, or a wedged process holds the quit's drains (D5)`);
    }
    if (start.value !== undefined && start.value > 30_000) {
      say('W365-6', `WATCH_START_REPLY_MS is ${start.value}; at most 30,000`);
    }
    // The fix round: a first watch is asked of at least two processes (one was the attack
    // lens's finding: answered null at the first) and of fewer than the give-up's exits.
    const hsf = sfOf(P365.HOST, host);
    const asks = topLiteral(hsf, 'WATCHER_FIRST_WATCH_ASKS', 'number');
    const giveUpExits = topLiteral(hsf, 'WATCHER_GIVE_UP_EXITS', 'number');
    if (asks.error !== undefined) say('W365-6', `${P365.HOST}: ${asks.error}`);
    else if (asks.value < 2 || (giveUpExits.value !== undefined && asks.value >= giveUpExits.value)) {
      say('W365-6', `WATCHER_FIRST_WATCH_ASKS is ${asks.value}; at least 2, so a first watch outlives the process that held it, and fewer than WATCHER_GIVE_UP_EXITS (${String(giveUpExits.value)}), so one folder cannot spend the give-up`);
    }
  }

  // ---- W365-7: the fork ---------------------------------------------------------
  let forkCount = 0;
  for (const rel of files) {
    if (!rel.startsWith(P365.WATCHER_DIR)) continue;
    const text = view.read(rel);
    if (text === null) continue;
    const n = [...stripComments(text).matchAll(/\butilityProcess\s*\.\s*fork\s*\(/g)].length;
    forkCount += n;
    if (n > 0 && rel !== P365.HOST) say('W365-7', `${rel} calls ${FORK}(; the watcher is forked in host.ts alone`);
  }
  if (forkCount !== 1) say('W365-7', `the watcher calls ${FORK}( ${forkCount} times; once, in host.ts`);
  if (host !== null) {
    const sf = sfOf(P365.HOST, host);
    for (const call of nodesOf(sf, (x) => ts.isCallExpression(x) && flat(x.expression, sf) === 'utilityProcess.fork')) {
      const where = `${P365.HOST}:${lineOf(sf, call)}`;
      const [path, , options] = call.arguments;
      if (path === undefined || flat(path, sf) !== "join(__dirname,'watcher-process.js')") {
        say('W365-7', `${where} forks \`${path === undefined ? 'nothing' : path.getText(sf)}\`, not join(__dirname, 'watcher-process.js'), the entry the build emits beside main`);
      }
      if (options === undefined || !ts.isObjectLiteralExpression(options)) {
        say('W365-7', `${where}'s options are not an object literal, so what the process is handed cannot be read`);
        continue;
      }
      const prop = (name) => options.properties.find((p) => p.name !== undefined && p.name.getText(sf) === name);
      if (options.properties.some((p) => ts.isSpreadAssignment(p))) {
        say('W365-7', `${where}'s options spread another object, which can hand the process anything`);
      }
      const stdio = prop('stdio');
      if (stdio === undefined || !ts.isPropertyAssignment(stdio) || !ts.isStringLiteralLike(stdio.initializer) || stdio.initializer.text !== 'ignore') {
        say('W365-7', `${where}'s stdio is not the string 'ignore' (Electron PR #53278: a short stdio ARRAY reads out of bounds in 43.3.0)`);
      }
      const env = prop('env');
      const envOk =
        env !== undefined && ts.isPropertyAssignment(env) && ts.isObjectLiteralExpression(env.initializer) &&
        env.initializer.properties.length === 1 && ts.isPropertyAssignment(env.initializer.properties[0]) &&
        env.initializer.properties[0].name.getText(sf) === 'TORTIE_WATCHER';
      if (!envOk) {
        say('W365-7', `${where}'s env is not an object literal of exactly TORTIE_WATCHER (Electron 43 reads env: {} as unset and hands the child main's whole environment)`);
      }
      if (prop('serviceName') === undefined) say('W365-7', `${where} names no serviceName`);
      // The fix round (the attack lens's ablation A1, green here before): an
      // 'error' listener on the child, or a V8 fatal error in the watcher
      // process is Electron 43.3.0's emit('error', 'FatalError', …) on an
      // emitter with no listener, which THROWS in main.
      const decl = call.parent;
      const child = decl !== undefined && ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) ? decl.name.text : null;
      const scope = enclosingFunction(call);
      const listens =
        child !== null && scope !== null &&
        nodesOf(scope, (x) => ts.isCallExpression(x) && flat(x.expression, sf) === `${child}.on` && x.arguments.length === 2 &&
          ts.isStringLiteralLike(x.arguments[0]) && x.arguments[0].text === 'error').length > 0;
      if (!listens) say('W365-7', `${where}: the forked child has no 'error' listener, so a V8 fatal error in the watcher process throws in main`);
    }

    // The fix round: how the process is ENDED. Electron's own kill() sends
    // SIGTERM and then waits on main's thread, up to 2 s, for the child to die
    // (2,005 ms measured for a stopped child; 1,997 by the attack lens). So:
    // ONE process.kill( in host.ts, with 'SIGKILL', inside an if that asks a
    // function of this file reading app.getAppMetrics( (a pid Electron does not
    // name is never signalled), then the child's own kill() to reap it, and the
    // WatcherChild the fork wrapper returns ends its process through that.
    const kills = nodesOf(sf, (x) => ts.isCallExpression(x) && flat(x.expression, sf) === 'process.kill');
    if (kills.length !== 1) {
      say('W365-7', `${P365.HOST} calls process.kill( ${kills.length} times; once, the SIGKILL that ends the watcher process without holding main's thread`);
    }
    const endFn = kills.length === 1 ? enclosingFunction(kills[0]) : null;
    const endName = endFn === null ? null : functionName(endFn);
    for (const k of kills) {
      const where = `${P365.HOST}:${lineOf(sf, k)}`;
      const sig = k.arguments[1];
      if (sig === undefined || !ts.isStringLiteralLike(sig) || sig.text !== 'SIGKILL') {
        say('W365-7', `${where}'s process.kill( does not send the literal 'SIGKILL', so a stopped or wedged process can outlive it`);
      }
      let guarded = false;
      for (let inner = k, p = k.parent; p !== undefined && !hasBody(p); inner = p, p = p.parent) {
        if (!ts.isIfStatement(p) || p.thenStatement !== inner) continue;
        const cond = p.expression;
        if (!ts.isCallExpression(cond) || !ts.isIdentifier(cond.expression)) continue;
        const named = cond.expression.text;
        const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name !== undefined && s.name.text === named);
        if (fn !== undefined && /\.getAppMetrics\(/.test(flat(fn, sf))) guarded = true;
      }
      if (!guarded) {
        say('W365-7', `${where}'s SIGKILL is not inside an if that asks a function reading app.getAppMetrics(, so a pid Electron does not name as this app's watcher process can be signalled`);
      }
    }
    if (endFn !== null) {
      const reaps = nodesOf(endFn, (x) =>
        ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'kill' &&
        flat(x.expression.expression, sf) !== 'process' && x.arguments.length === 0 && x.pos > kills[0].end);
      if (reaps.length === 0) say('W365-7', `${endName ?? 'the function holding the SIGKILL'} calls no kill() of the child after its SIGKILL, so Electron never reaps the process it ended`);
    }
    for (const call of nodesOf(sf, (x) => ts.isCallExpression(x) && flat(x.expression, sf) === 'utilityProcess.fork')) {
      const scope = enclosingFunction(call);
      const killProps = scope === null ? [] : nodesOf(scope, (x) => ts.isPropertyAssignment(x) && x.name.getText(sf) === 'kill');
      const reaches = endName !== null && killProps.some((p) => nodesOf(p, (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === endName).length > 0);
      if (!reaches) {
        say('W365-7', `${P365.HOST}:${lineOf(sf, call)}: the WatcherChild this fork returns does not end its process through ${endName ?? 'the SIGKILL route'}, so Electron's kill() can hold main's thread for up to 2 s`);
      }
    }
  }
  const vite = view.read(P365.VITE);
  if (vite === null || !/'watcher-process'\s*:\s*resolve\(\s*__dirname\s*,\s*'src\/main\/watcher\/watcher-process\.ts'\s*\)/.test(stripComments(vite))) {
    say('W365-7', `${P365.VITE} declares no 'watcher-process' entry resolving src/main/watcher/watcher-process.ts, so the build emits no file for the fork to find`);
  }

  // ---- W365-8: the notice a restart hands every live watch ------------------------
  if (host !== null) {
    const error = topLiteral(sfOf(P365.HOST, host), 'WATCHER_RESTART_ERROR', 'string');
    const rw = view.read(P365.REPO_WATCHER);
    let rescan = null;
    if (rw !== null) {
      const rsf = sfOf(P365.REPO_WATCHER, rw);
      const fn = nodesOf(rsf, (x) => ts.isFunctionDeclaration(x) && x.name !== undefined && x.name.text === 'isRescanRequired')[0];
      const literal = fn === undefined ? undefined : nodesOf(fn, (x) => x.kind === ts.SyntaxKind.RegularExpressionLiteral)[0];
      if (literal !== undefined) {
        const text = literal.getText(rsf);
        const slash = text.lastIndexOf('/');
        rescan = new RegExp(text.slice(1, slash), text.slice(slash + 1));
      }
    }
    if (error.error !== undefined) say('W365-8', `${P365.HOST}: ${error.error}`);
    else if (rescan === null) say('W365-8', `isRescanRequired's pattern cannot be read from ${P365.REPO_WATCHER}`);
    else if (!rescan.test(error.value)) say('W365-8', `WATCHER_RESTART_ERROR (${JSON.stringify(error.value)}) is not matched by isRescanRequired (${rescan}), so no site re-reads after a restart`);
    // The fix round: the give-up's word is the library's FATAL kind, never a re-scan.
    const ended = topLiteral(sfOf(P365.HOST, host), 'WATCHER_GAVE_UP_ERROR', 'string');
    if (ended.error !== undefined) say('W365-8', `${P365.HOST}: ${ended.error}`);
    else if (rescan !== null && rescan.test(ended.value)) say('W365-8', `WATCHER_GAVE_UP_ERROR (${JSON.stringify(ended.value)}) is matched by isRescanRequired (${rescan}), which says the stream goes on after the give-up, and it does not`);
  }

  // ---- W365-10: the five sites ------------------------------------------------------
  const found = [];
  for (const rel of files) {
    const text = view.read(rel);
    if (text === null || !text.includes('watchFolder')) continue;
    const sf = sfOf(rel, text);
    for (const call of nodesOf(sf, (x) => ts.isCallExpression(x))) {
      const callee = call.expression;
      const direct = ts.isIdentifier(callee) && callee.text === 'watchFolder';
      const member = ts.isPropertyAccessExpression(callee) && callee.name.text === 'watchFolder';
      if (!direct && !(member && rel !== P365.HOST)) continue;
      found.push({ rel, sf, call, fn: enclosingName(call) });
    }
  }
  for (const site of SITES_365) {
    const calls = found.filter((f) => f.rel === site.file && f.fn === site.fn);
    if (calls.length !== 1) say('W365-10', `${site.file} calls watchFolder( ${calls.length} times in ${site.fn}; once`);
  }
  for (const f of found) {
    const known = SITES_365.some((s) => s.file === f.rel && s.fn === f.fn);
    const where = `${f.rel}:${lineOf(f.sf, f.call)}`;
    if (!known) {
      say('W365-10', `${where} calls watchFolder( in ${f.fn ?? 'the module\'s top level'}, which is not one of the five sites; a new watch is a phase of its own, counted against the budget and the cap`);
      continue;
    }
    // The result, bound to a name, and tested against null before its first use.
    let up = f.call.parent;
    while (up !== undefined && (ts.isAwaitExpression(up) || ts.isParenthesizedExpression(up))) up = up.parent;
    let bound = null;
    if (up !== undefined && ts.isVariableDeclaration(up) && ts.isIdentifier(up.name)) bound = up.name.text;
    else if (up !== undefined && ts.isBinaryExpression(up) && up.operatorToken.kind === ts.SyntaxKind.EqualsToken) bound = flat(up.left, f.sf);
    if (bound === null) {
      say('W365-10', `${where} does not bind watchFolder('s answer to a name, so it cannot test it against null before using it`);
      continue;
    }
    const fn = enclosingFunction(f.call);
    const scope = fn ?? f.sf;
    const uses = nodesOf(scope, (x) =>
      (ts.isIdentifier(x) || ts.isPropertyAccessExpression(x)) && x.pos >= f.call.end && flat(x, f.sf) === bound &&
      !(x.parent !== undefined && ts.isPropertyAccessExpression(x.parent) && x.parent.name === x))
      .sort((a, b) => a.pos - b.pos);
    const first = uses[0];
    let tested = false;
    if (first !== undefined) {
      let p = first.parent;
      while (p !== undefined && ts.isParenthesizedExpression(p)) p = p.parent;
      if (p !== undefined && ts.isBinaryExpression(p)) {
        const op = p.operatorToken.kind;
        const other = p.left === first || flat(p.left, f.sf) === bound ? p.right : p.left;
        tested =
          (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) &&
          other.kind === ts.SyntaxKind.NullKeyword;
      } else if (p !== undefined && ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.ExclamationToken) {
        tested = true;
      }
    }
    if (!tested) {
      say('W365-10', `${where} (${f.fn}) uses \`${bound}\` before testing it against null; the host answers null for nothing to watch (D11)`);
    }
  }
  for (const rel of new Set(SITES_365.map((s) => s.file))) {
    const text = view.read(rel);
    if (text === null) {
      say('W365-10', `${rel} is missing`);
      continue;
    }
    const sf = sfOf(rel, text);
    for (const call of nodesOf(sf, (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'trackWatcherClose')) {
      say('W365-10', `${rel}:${lineOf(sf, call)} wraps a close in trackWatcherClose; the host tracks every FolderWatch.close() itself, so a site never does`);
    }
  }
  if (host !== null) {
    const sf = sfOf(P365.HOST, host);
    if (nodesOf(sf, (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'trackWatcherClose').length === 0) {
      say('W365-10', `${P365.HOST} wraps no close in trackWatcherClose, so the quit's drains no longer see a watcher close`);
    }
  }
  return out;
}

/** The driven half of the W365 rules, from the probe's facts for one variant. */
function w365Driven(d) {
  const out = [];
  const say = (rule, msg) => out.push({ rule, msg });
  if (d === undefined || d === null) {
    for (const rule of ['W365-2', 'W365-3', 'W365-4', 'W365-5', 'W365-6', 'W365-8', 'W365-9']) say(rule, 'the probe returned nothing for this variant');
    return out;
  }
  // What the code under test threw where no request could see it (out of a
  // listener, a timer, or as an uncaught error or an unhandled rejection) is a
  // finding of the drive it happened in, before anything else that drive read.
  const strayRules = [
    [d.queue?.fifo, 'W365-3', 'queue'], [d.queue?.check, 'W365-4', 'existence check'], [d.queue?.grace, 'W365-5', 'grace'],
    [d.host?.load, 'W365-2', 'host load'], [d.host?.bounds, 'W365-6', 'bounds'], [d.host?.restart, 'W365-8', 'restart'],
    [d.host?.quit, 'W365-9', 'quit']
  ];
  for (const [r, rule, what] of strayRules) {
    if (Array.isArray(r?.strays) && r.strays.length > 0) {
      say(rule, `during the ${what} drive the code under test threw where no request could see it (${r.strays.length}): ${r.strays.slice(0, 3).join(' | ')}`);
    }
  }
  const failed = (rule, what, r) => {
    if (r === undefined || r === null) { say(rule, `the ${what} drive returned nothing`); return true; }
    if (r.missing !== undefined) { say(rule, `${r.missing} is missing, so the ${what} could not be driven`); return true; }
    if (r.error !== undefined) { say(rule, `the ${what} drive failed: ${r.error}`); return true; }
    if (r.setup !== undefined) { say(rule, `the ${what} drive could not be set up: ${r.setup}`); return true; }
    if (r.noFork === true) { say('W365-2', `in Electron the host did not fork a process, so the ${what} could not be driven`); return true; }
    return false;
  };

  // W365-3
  const f = d.queue?.fifo;
  if (!failed('W365-3', 'queue', f)) {
    if (f.maxInFlight !== 1) say('W365-3', `${f.maxInFlight} native calls were in flight at once over ${f.ops} operations; one at a time`);
    if (!f.fifo) say('W365-3', `the native calls ran out of the order asked: ${f.firstDifference}`);
    if (f.nativeCalls !== f.ops) say('W365-3', `${f.ops} operations made ${f.nativeCalls} native calls`);
    if (f.unanswered > 0) say('W365-3', `${f.unanswered} of ${f.ops} operations never settled`);
    if (f.failed > 0) say('W365-3', `${f.failed} of ${f.ops} operations rejected`);
  }

  // W365-4
  const c = d.queue?.check;
  if (!failed('W365-4', 'existence check', c)) {
    if (!c.missingAnswered || c.missingSub !== null) say('W365-4', `a watch of a folder that is not there answered ${JSON.stringify(c.missingSub)}, not null`);
    if (c.nativeForGone > 0) say('W365-4', `a folder that is not there reached the native subscribe ${c.nativeForGone} time(s), the failed-subscribe path that races the registry (§0.1 item 2)`);
    if (!c.hereAnswered) say('W365-4', 'a watch of a folder that is there was not answered with a subscription');
    if (c.sameTurn !== true) say('W365-4', 'the native subscribe did not follow the existence check in the same synchronous turn, so the folder could go between them');
    // The probe review: a folder there when its watch was asked and gone at its turn.
    const g = c.queuedGone;
    if (g === undefined || g === null || typeof g !== 'object') {
      say('W365-4', 'the drive of a folder removed while its watch waited its turn returned nothing');
    } else if (g.held !== true) {
      // A watch that did not wait behind another is W365-3's defect when the queue drive saw
      // overlap; with a queue that ran one at a time it is this drive that could not be made.
      const fifo = d.queue?.fifo;
      if (fifo?.maxInFlight === 1 && fifo?.fifo === true) say('W365-4', 'no watch could be held behind another to drive a folder removed while it waited, so the check at the turn was not driven');
    } else {
      if (g.native > 0) say('W365-4', `a folder removed while its watch waited its turn reached the native subscribe ${g.native} time(s): the check was not asked at the turn, or an earlier answer was used`);
      if (!g.answered || g.sub !== null) say('W365-4', `a watch of a folder removed while it waited its turn answered ${JSON.stringify(g.sub)}, not null`);
      if (!g.blockerAnswered) say('W365-4', 'the watch the drive held the queue with was not answered once let go');
    }
  }

  // W365-5
  const g = d.queue?.grace;
  if (!failed('W365-5', 'grace', g)) {
    if (!g.watchDuringGraceDone) say('W365-5', 'a watch made while a graced close waited did not complete before the grace ended, so the grace held the queue');
    if (g.closedBefore1000) say('W365-5', `a close whose folder was gone reached the native module ${g.closedAtMs} ms after it was asked, before 1,000 ms`);
    if (!g.closedAfterGrace) say('W365-5', 'a close whose folder was gone never reached the native module after the grace');
    // The fix round: the same folder, made again and watched again during the grace.
    const s = g.sameFolder;
    if (s === undefined || s === null || s.setup !== undefined) {
      say('W365-5', `the drive of a folder watched again during its own graced close could not run${s?.setup === undefined ? '' : `: ${s.setup}`}`);
    } else {
      if (!s.closed || !s.rewatched) say('W365-5', `a folder watched again during its own graced close was ${!s.closed ? 'never closed' : 'never subscribed again'}`);
      else if (!s.rewatchAfterClose || s.settledDuringGrace) {
        say('W365-5', 'a folder made again and watched again while its graced close still waited subscribed before that close ran, so it joins the stream the library holds for the deleted root and hears nothing, ever');
      }
      if (!s.answered) say('W365-5', 'a folder made again and watched again after its graced close was not answered with a subscription');
    }
  }

  // W365-2, driven
  const l = d.host?.load;
  if (!failed('W365-2', 'host load', l)) {
    if (l.inProcessAtLoad || l.nativeAtLoad) say('W365-2', `loading host.ts in Electron loaded ${[l.inProcessAtLoad ? 'process/in-process' : null, l.nativeAtLoad ? PARCEL : null].filter(Boolean).join(' and ')}`);
    else if (l.inProcess || l.native) say('W365-2', `a watch in Electron loaded ${[l.inProcess ? 'process/in-process' : null, l.native ? PARCEL : null].filter(Boolean).join(' and ')} in main`);
    if (l.forks < 1) say('W365-2', 'a first watch in Electron forked no process, so main would have to watch in itself');
    else if (!l.answered) say('W365-2', 'a first watch over a process that answers was not answered with a FolderWatch');
    // W365-7, driven: one process, forked at the first watch and not before (D7).
    if (l.forksAtLoad !== 0) say('W365-7', `loading host.ts forked ${l.forksAtLoad} process(es); the process is forked lazily, at the first watch`);
    else if (l.forks > 1) say('W365-7', `a first watch forked ${l.forks} processes; one`);
  }

  // W365-6, driven
  for (const kind of ['watch', 'close']) {
    const b = d.host?.bounds?.[kind] ?? (d.host?.bounds?.error !== undefined || d.host?.bounds?.missing !== undefined ? d.host.bounds : undefined);
    if (failed('W365-6', `${kind} bound`, b)) continue;
    const name = kind === 'watch' ? 'WATCH_START_REPLY_MS' : 'WATCH_CLOSE_REPLY_MS';
    if (!b.liveAnswered) { say('W365-6', `the ${kind} bound drive's live watch was not answered`); continue; }
    if (b.settledEarly) say('W365-6', `a ${kind} the process never answered settled before ${name}`);
    if (kind === 'close') {
      if (!b.settledAtBound) say('W365-6', `a close the process never answered did not settle at ${name} (${b.bound} ms): the late request settles nothing`);
      else if (b.value !== 'undefined') say('W365-6', `a close the process never answered settled as ${b.value}`);
    } else {
      // The fix round: never null. A null was cached by the site, and that
      // project stayed unwatched until its tab opened again; the parent never
      // drops a slow watch.
      if (b.value === 'null' || b.valueAfter === 'null') say('W365-6', 'a first watch the replaced process held was answered null, so its site stops watching until it asks again');
      else if (!b.stuckRebound) say('W365-6', 'a first watch the replaced process held was never asked of the next process');
      else if (b.valueAfter !== 'object') say('W365-6', `a first watch asked again of the next process settled as ${b.valueAfter}, not a watch`);
    }
    if (b.boundLines !== 1) say('W365-6', `the ${kind} bound wrote ${b.boundLines} line(s) at scope watcher; one`);
    if (!b.killed) say('W365-6', `the process that did not answer a ${kind} was not ended`);
    // Started again, with a live watch to hold. Whether that watch is bound to
    // it, and told, is the restart's promise (W365-8), not the bound's.
    if (b.forksAfter < 2) say('W365-6', `no new process was started after the ${kind} bound, with a live watch still held`);
    // The fix round: ended by a SIGKILL to the pid Electron named, THEN Electron's kill() (W365-7's route, driven).
    // Asked only of a process the host did end: one it never ended is W365-6's finding above.
    const trail = Array.isArray(b.endTrail) ? b.endTrail : [];
    const sig = trail.findIndex((t) => t.startsWith('signal SIGKILL '));
    const reap = trail.findIndex((t) => t.startsWith('kill '));
    if (b.killed && (sig === -1 || reap === -1 || reap < sig)) {
      say('W365-7', `the process that did not answer a ${kind} was ended by ${JSON.stringify(trail)}, not a SIGKILL to its pid and then Electron's kill(), so main's thread can wait up to 2 s`);
    }
  }

  // W365-6, driven (the fix round): a poison folder, never answered by any process.
  const p = d.host?.poison;
  if (!failed('W365-6', 'poison', p)) {
    if (p.asks !== 2) say('W365-6', `WATCHER_FIRST_WATCH_ASKS read as ${String(p.asks)} where the drive expects 2`);
    if (p.answer !== 'null') say('W365-6', `a first watch no process ever answers settled as ${p.answer}, not null once it had been asked of its processes`);
    if (p.askedOf !== 2) say('W365-6', `a first watch no process ever answers was asked of ${String(p.askedOf)} process(es); two, then null`);
    if (p.gaveUp !== false) say('W365-6', 'one folder whose watch no process answers made the host give up, which ends every other watch with it');
    // Whether the kept watch is then bound to the next process, and told, is the restart's
    // promise (W365-8), and how many processes there are is the restart's too: not read here.
  }

  // W365-8, driven
  const r = d.host?.restart;
  if (!failed('W365-8', 'restart', r)) {
    const giveUp = r.giveUp;
    if (!Array.isArray(r.steps) || r.steps.length !== giveUp) say('W365-8', `the drive reached ${Array.isArray(r.steps) ? r.steps.length : 0} of ${giveUp} exits`);
    for (const s of r.steps ?? []) {
      if (s.exitNo === giveUp) {
        if (s.forkedAfter) say('W365-8', `a process was started after exit ${s.exitNo} of ${giveUp} inside the window; the host gives up there`);
        if (s.lateAnswer !== 'null') say('W365-8', `a watch after the give-up answered ${s.lateAnswer}, not null`);
        if (s.forksAfterLate > 0) say('W365-8', 'a watch after the give-up forked a process');
        // The fix round: one word to every live watch that it has ended, none for a closed one.
        if (r.gaveUpError === null || r.gaveUpError === undefined) say('W365-8', `${P365.HOST} exports no string WATCHER_GAVE_UP_ERROR, so a give-up says nothing to the watches it ends`);
        else if (s.ended?.a !== 1 || s.ended?.b !== 1 || s.ended?.c !== 0) {
          say('W365-8', `at the give-up the live watches were handed ${String(s.ended?.a)} and ${String(s.ended?.b)} word(s) that they ended and the closed one ${String(s.ended?.c)}; exactly one each, none for a closed watch, or they go quiet with nothing said`);
        }
        continue;
      }
      if (s.early) say('W365-8', `after exit ${s.exitNo} a process was started before the table's ${s.expected} ms`);
      if (!s.onTime) say('W365-8', `after exit ${s.exitNo} no process was started at the table's ${s.expected} ms`);
      const want = JSON.stringify(['/p365-gate/restart/a', '/p365-gate/restart/b']);
      if (JSON.stringify(s.rebound) !== want) say('W365-8', `after exit ${s.exitNo} the new process was asked for ${JSON.stringify(s.rebound)}, not every live watch (${want}) and nothing closed`);
      else if (!s.sameIgnore) say('W365-8', `after exit ${s.exitNo} a watch was re-bound with a different ignore`);
      if (s.notices.a !== 1 || s.notices.b !== 1 || s.notices.c !== 0) {
        say('W365-8', `after exit ${s.exitNo} the live watches were handed ${s.notices.a} and ${s.notices.b} notice(s) and the closed one ${s.notices.c}; exactly one each, none for a closed watch`);
      }
      if (!s.eventReachedA) say('W365-8', `after exit ${s.exitNo} an event under the new process's id did not reach its watch`);
    }
    const other = r.otherErrors ?? {};
    if ((other.a ?? 0) + (other.b ?? 0) + (other.c ?? 0) > 0) say('W365-8', `a restart handed an error other than WATCHER_RESTART_ERROR (${JSON.stringify(other)})`);
    if (r.quitForks !== 0) say('W365-8', `${r.quitForks === null ? 'the quit half could not run' : `${r.quitForks} process(es) were started after an exit while quitting`}`);
  }

  // W365-9, driven
  const q = d.host?.quit;
  if (!failed('W365-9', 'quit', q)) {
    if (q.cold.answer !== 'null' || q.cold.forks !== 0) say('W365-9', `a first watch once quitting answered ${q.cold.answer} and forked ${q.cold.forks}; null and none`);
    if (q.late !== 'null') say('W365-9', `a watch once quitting answered ${q.late}, not null`);
    if (q.watchMessagesAfterQuit > 0) say('W365-9', `a watch once quitting sent ${q.watchMessagesAfterQuit} message(s) to the process`);
    if (q.forksAfterQuit > 0) say('W365-9', 'a process was started once quitting');
    if (!q.closeSettled) say('W365-9', 'a close once quitting waited for the process to answer');
    // The fix round: nothing posted, and the process ended. A close left in the
    // process's queue met node::FreeEnvironment there at a quit that ran Node's
    // teardown and aborted it (16 of 45 graceful quits, the attack lens).
    if (q.messagesAfterQuit !== 0) say('W365-9', `once quitting ${String(q.messagesAfterQuit)} message(s) were posted to the process${q.closePosted ? ', a close among them' : ''}; none, so none is left in its queue when a teardown runs`);
    if (!q.endedByClose) say('W365-9', 'the first close once quitting did not end the process, so it meets its own teardown with whatever it holds');
    if (q.starting !== 'null') say('W365-9', `a watch still starting when the quit came answered ${q.starting}, not null`);
    if (q.pendingCloses !== 0) say('W365-9', `a close once quitting left ${q.pendingCloses} close(s) for the quit's drains`);
  }
  return out;
}

/**
 * The W365 plants (build/p365/SPEC.md §7.1), each anchored on the shipping
 * text of one file. `alsoRed` names a rule the planted defect breaks as well,
 * declared so the gate can hold every plant to EXACTLY the rules it owns.
 */
const W365_PLANTS = [
  // W365-1
  { rule: 'W365-1', name: 'a static import planted in repo-watcher.ts', file: P365.REPO_WATCHER, edits: [{ prepend: "import plantedWatcher from '@parcel/watcher';\n" }] },
  { rule: 'W365-1', name: "a require('@parcel/watcher') in host.ts", file: P365.HOST, alsoRed: ['W365-2'], edits: [{ append: "\nexport const plantedNative: unknown = require('@parcel/watcher');\n" }] },
  { rule: 'W365-1', name: "in-process.ts's import made static", file: P365.IN_PROCESS, edits: [{ find: "  const native: NativeWatcher = await import('@parcel/watcher');", to: '  const native: NativeWatcher = plantedStatic;' }, { prepend: "import * as plantedStatic from '@parcel/watcher';\n" }] },
  { rule: 'W365-1', name: "import watcher from '@parcel/watcher' in config/store.ts", file: P365.CONFIG_STORE, edits: [{ prepend: "import watcher from '@parcel/watcher';\n" }] },
  { rule: 'W365-1', name: 'a second package in the watcher process', file: P365.PROCESS, edits: [{ prepend: "import chokidar from 'chokidar';\n" }] },
  // W365-2
  { rule: 'W365-2', name: 'the condition inverted (!== undefined)', file: P365.HOST, edits: [{ find: 'if (process.versions.electron === undefined) {', to: 'if (process.versions.electron !== undefined) {' }] },
  { rule: 'W365-2', name: 'the import made static', file: P365.HOST, edits: [{ prepend: "import * as plantedInProcess from './process/in-process';\nvoid plantedInProcess;\n" }] },
  { rule: 'W365-2', name: 'the branch removed (in-process always)', file: P365.HOST, edits: [{ find: 'if (process.versions.electron === undefined) {', to: 'if (true) {' }] },
  // W365-3
  { rule: 'W365-3', name: 'the chain replaced by a direct call', file: P365.QUEUE, edits: [{ find: '    const run = tail.then(() => {', to: '    const run = Promise.resolve().then(() => {' }] },
  {
    rule: 'W365-3',
    name: 'Promise.all over a batch',
    file: P365.QUEUE,
    edits: [
      { find: '    const run = tail.then(() => {', to: '    const run = plantedBatch(() => {' },
      {
        append:
          '\nconst plantedWaiting: (() => void)[] = [];\n' +
          'function plantedBatch<T>(start: () => Promise<T>): Promise<T> {\n' +
          '  return new Promise<T>((resolve, reject) => {\n' +
          '    plantedWaiting.push(() => { start().then(resolve, reject); });\n' +
          '    if (plantedWaiting.length === 1) {\n' +
          '      queueMicrotask(() => { const batch = plantedWaiting.splice(0); void Promise.all(batch.map(async (go) => go())); });\n' +
          '    }\n' +
          '  });\n' +
          '}\n'
      }
    ]
  },
  {
    rule: 'W365-3',
    name: 'a second call site of native.subscribe( outside the turn',
    file: P365.QUEUE,
    edits: [{ append: '\nexport function plantedSecondSubscribe(deps: WatchQueueDeps, dir: string): unknown {\n  return deps.native.subscribe(dir, () => undefined, { ignore: [] });\n}\n' }]
  },
  // W365-4
  { rule: 'W365-4', name: 'the check removed', file: P365.QUEUE, edits: [{ find: "    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };\n", to: '' }] },
  {
    rule: 'W365-4',
    name: 'an await inserted between the check and the subscribe',
    file: P365.QUEUE,
    edits: [{ find: "    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };\n", to: "    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };\n    await Promise.resolve();\n" }]
  },
  {
    rule: 'W365-4',
    name: 'the check moved before the turn (asked when the watch is made)',
    file: P365.QUEUE,
    edits: [
      { find: "    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };\n", to: '' },
      { find: '      const start = (): Promise<WatchAnswer> =>', to: "      if (!deps.exists(dir)) return Promise.resolve({ kind: 'watching', sub: null, waitedMs: 0 });\n      const start = (): Promise<WatchAnswer> =>" }
    ]
  },
  // The probe review's four: what "there" means in the hands that build the queue, and a turn
  // that keeps the check but mixes in an answer taken when the watch was asked.
  {
    rule: 'W365-4',
    name: "the watcher process's exists answers yes for anything",
    file: P365.PROCESS,
    edits: [{ find: '      exists: (dir) => {\n        try {\n          return statSync(dir).isDirectory();\n        } catch {\n          return false;\n        }\n      },', to: '      exists: () => true,' }]
  },
  {
    rule: 'W365-4',
    name: "the watcher process's exists asks existsSync, so a file reads as a folder",
    file: P365.PROCESS,
    edits: [
      { find: "import { statSync } from 'node:fs';", to: "import { existsSync, statSync } from 'node:fs';" },
      { find: '          return statSync(dir).isDirectory();', to: '          return existsSync(dir);' }
    ]
  },
  { rule: 'W365-4', name: "the in-process port's exists answers yes for anything", file: P365.IN_PROCESS, edits: [{ find: '    return statSync(dir).isDirectory();', to: '    return true;' }] },
  {
    rule: 'W365-4',
    name: 'the turn mixes in an answer taken when the watch was asked',
    file: P365.QUEUE,
    edits: [
      { find: '  readonly deliver: NativeCallback;\n}', to: '  readonly deliver: NativeCallback;\n  readonly there: boolean;\n}' },
      { find: "    if (!deps.exists(op.dir)) return { kind: 'watching', sub: null, waitedMs };", to: "    if (!deps.exists(op.dir) && !op.there) return { kind: 'watching', sub: null, waitedMs };" },
      { find: '      const op: WatchOp = {\n        sub,\n        dir,', to: '      const op: WatchOp = {\n        sub,\n        dir,\n        there: deps.exists(dir),' }
    ]
  },
  // W365-5
  { rule: 'W365-5', name: 'the grace awaited inside the turn', file: P365.QUEUE, edits: [{ find: "      entry.closing = over.then(() => join('close', () => closeTurn(sub, entry)));", to: "      entry.closing = join('close', () => over.then(() => closeTurn(sub, entry)));" }] },
  { rule: 'W365-5', name: 'the grace removed', file: P365.QUEUE, edits: [{ find: "      const over = graceFor(entry.dir);\n      entry.closing = over.then(() => join('close', () => closeTurn(sub, entry)));", to: "      entry.closing = join('close', () => closeTurn(sub, entry));" }] },
  { rule: 'W365-5', name: 'WATCH_GONE_GRACE_MS = 0', file: P365.QUEUE, edits: [{ find: /export const WATCH_GONE_GRACE_MS = [\d_]+;/, to: 'export const WATCH_GONE_GRACE_MS = 0;' }] },
  // The fix round (the attack lens's ablation A2, green here before).
  { rule: 'W365-5', name: 'a re-watch of a folder no longer waits for its own graced close', file: P365.QUEUE, edits: [{ find: '      return grace === undefined ? start() : grace.then(start);', to: '      return start();' }] },
  // W365-6
  { rule: 'W365-6', name: 'the close bound raised to 3,000', file: P365.HOST, edits: [{ find: /export const WATCH_CLOSE_REPLY_MS = [\d_]+;/, to: 'export const WATCH_CLOSE_REPLY_MS = 3_000;' }] },
  { rule: 'W365-6', name: 'the close bound read from a variable', file: P365.HOST, edits: [{ find: /export const WATCH_CLOSE_REPLY_MS = [\d_]+;/, to: 'const plantedClose = 2_000;\nexport const WATCH_CLOSE_REPLY_MS = plantedClose;' }] },
  { rule: 'W365-6', name: 'the start bound raised past 30 s', file: P365.HOST, edits: [{ find: /export const WATCH_START_REPLY_MS = [\d_]+;/, to: 'export const WATCH_START_REPLY_MS = 60_000;' }] },
  { rule: 'W365-6', name: 'the turn note lowered to 0', file: P365.QUEUE, edits: [{ find: /export const WATCH_TURN_NOTE_MS = [\d_]+;/, to: 'export const WATCH_TURN_NOTE_MS = 0;' }] },
  {
    rule: 'W365-6',
    name: 'the log line removed',
    file: P365.HOST,
    edits: [{ find: /    deps\.log\.warn\(`\$\{WATCHER_LINES\.noAnswer\}[^]*?\n    \}\);\n/, to: '' }]
  },
  { rule: 'W365-6', name: 'the replacement removed (the late request settles nothing)', file: P365.HOST, edits: [{ find: /(\n    \}\);\n)    retire\(proc, true\);\n/, to: (m) => m[1] }] },
  // The fix round: a first watch the replaced process held is no longer answered null.
  {
    rule: 'W365-6',
    name: 'a first watch the replaced process held answered null',
    file: P365.HOST,
    edits: [{ find: "      if (entry.state === 'pending' && entry.asks >= WATCHER_FIRST_WATCH_ASKS) dropPending(entry);", to: "      if (entry.state === 'pending') dropPending(entry);" }]
  },
  {
    rule: 'W365-6',
    name: 'a first watch asked of every process, with no cap',
    file: P365.HOST,
    edits: [{ find: "      if (entry.state === 'pending' && entry.asks >= WATCHER_FIRST_WATCH_ASKS) dropPending(entry);", to: '' }]
  },
  { rule: 'W365-6', name: 'WATCHER_FIRST_WATCH_ASKS = 1', file: P365.HOST, edits: [{ find: /export const WATCHER_FIRST_WATCH_ASKS = [\d_]+;/, to: 'export const WATCHER_FIRST_WATCH_ASKS = 1;' }] },
  // W365-7
  { rule: 'W365-7', name: 'env: {}', file: P365.HOST, edits: [{ find: "    env: { TORTIE_WATCHER: '1' },", to: '    env: {},' }] },
  { rule: 'W365-7', name: 'env: { ...process.env }', file: P365.HOST, edits: [{ find: "    env: { TORTIE_WATCHER: '1' },", to: '    env: { ...process.env },' }] },
  { rule: 'W365-7', name: "stdio: ['ignore', 'pipe', 'pipe']", file: P365.HOST, edits: [{ find: "    stdio: 'ignore',", to: "    stdio: ['ignore', 'pipe', 'pipe']," }] },
  {
    rule: 'W365-7',
    name: `a second ${FORK}(`,
    file: P365.HOST,
    edits: [{ append: `\nexport function plantedSecondFork(): unknown {\n  return ${FORK}(join(__dirname, 'watcher-process.js'), [], { env: { TORTIE_WATCHER: '1' }, stdio: 'ignore', serviceName: 'Tortie Watcher' });\n}\n` }]
  },
  { rule: 'W365-7', name: 'the forked path renamed', file: P365.HOST, edits: [{ find: `${FORK}(join(__dirname, 'watcher-process.js'), [], {`, to: `${FORK}(join(__dirname, 'watcher.js'), [], {` }] },
  { rule: 'W365-7', name: 'forked at load rather than at the first watch', file: P365.HOST, edits: [{ append: '\nvoid forkWatcherProcess();\n' }] },
  { rule: 'W365-7', name: 'the build entry removed', file: P365.VITE, edits: [{ find: "'watcher-process': resolve(__dirname, 'src/main/watcher/watcher-process.ts')", to: "'not-the-watcher': resolve(__dirname, 'src/main/watcher/host.ts')" }] },
  // The fix round: the attack lens's ablation A1 (green here before), and the end of the process.
  { rule: 'W365-7', name: "the fork's error listener removed", file: P365.HOST, edits: [{ find: "  child.on('error', () => undefined);\n", to: '' }] },
  {
    rule: 'W365-7',
    name: "the WatcherChild ends its process by Electron's kill() alone",
    file: P365.HOST,
    edits: [{ find: '    kill: () => {\n      endAsked = true;\n      endWatcherChild(child);\n    }', to: '    kill: () => {\n      child.kill();\n    }' }]
  },
  { rule: 'W365-7', name: "the SIGKILL sent without asking Electron's process list for the pid", file: P365.HOST, edits: [{ find: '  if (electronNamesWatcher(pid)) {', to: '  if (pid > 0) {' }] },
  // W365-8
  { rule: 'W365-8', name: 'the notice removed', file: P365.HOST, edits: [{ find: '      entry.owesNotice = false;\n      notify(entry);\n', to: '      entry.owesNotice = false;\n' }] },
  {
    rule: 'W365-8',
    name: 'the re-bind removed',
    file: P365.HOST,
    edits: [{ find: "      if (entry.state !== 'closed' && entry.binding === null && entry.sub === null) bind(proc, entry);", to: "      if (entry.state === 'pending' && entry.binding === null && entry.sub === null) bind(proc, entry);" }]
  },
  {
    rule: 'W365-8',
    name: 'the quitting check removed',
    file: P365.HOST,
    // Since the fix round a first watch the ended process held stays pending
    // until the quitting arm answers it null, so with that arm gone the quit's
    // own drive starts a process too: W365-9's promise, broken by the same edit.
    alsoRed: ['W365-9'],
    edits: [
      { find: '    if (quitting()) {\n      abandonPending();\n      return;\n    }\n    if (exitTimes.length >= WATCHER_GIVE_UP_EXITS) {', to: '    if (exitTimes.length >= WATCHER_GIVE_UP_EXITS) {' },
      { find: '      if (quitting() || gaveUp) {\n        abandonPending();\n        return;\n      }\n      // Nothing to watch', to: '      if (gaveUp) {\n        abandonPending();\n        return;\n      }\n      // Nothing to watch' },
      { find: '    if (spawning || current !== null || gaveUp || quitting()) return;', to: '    if (spawning || current !== null || gaveUp) return;' }
    ]
  },
  { rule: 'W365-8', name: 'the give-up removed', file: P365.HOST, edits: [{ find: '    if (exitTimes.length >= WATCHER_GIVE_UP_EXITS) {\n      giveUp();\n      return;\n    }\n', to: '' }] },
  { rule: 'W365-8', name: 'the notice made a drop rather than a re-scan', file: P365.HOST, edits: [{ find: /export const WATCHER_RESTART_ERROR =\s*'[^']*';/, to: "export const WATCHER_RESTART_ERROR = 'The file watcher restarted.';" }] },
  // The fix round: the give-up says so to every live watch, and not as a re-scan.
  {
    rule: 'W365-8',
    name: "the give-up's word to the live watches removed",
    file: P365.HOST,
    edits: [{ find: "      try {\n        entry.onEvents(new Error(WATCHER_GAVE_UP_ERROR), []);\n      } catch {\n        /* a site's throw is its own */\n      }\n", to: '' }]
  },
  { rule: 'W365-8', name: "the give-up's word made a re-scan", file: P365.HOST, edits: [{ find: /export const WATCHER_GAVE_UP_ERROR =\s*'[^']*';/, to: "export const WATCHER_GAVE_UP_ERROR = 'The file watcher stopped. File system must be re-scanned.';" }] },
  // W365-9 (the fix round re-anchored the first two on the quit that ends the process)
  {
    rule: 'W365-9',
    name: 'the close awaited while quitting',
    file: P365.HOST,
    edits: [{ find: '    if (quitting()) {\n      // THE QUIT: settled here, now, with nothing posted; the process ends.\n      endForQuit();\n      done = Promise.resolve();\n    } else if (sub === null', to: '    if (sub === null' }]
  },
  { rule: 'W365-9', name: 'a watch forwarded while quitting', file: P365.HOST, edits: [{ find: '    if (quitting()) {\n      endForQuit();\n      return null;\n    }\n    if (gaveUp) return null;', to: '    if (gaveUp) return null;' }] },
  {
    rule: 'W365-9',
    name: 'the process left running at the quit, its close posted',
    file: P365.HOST,
    edits: [{ find: '      // THE QUIT: settled here, now, with nothing posted; the process ends.\n      endForQuit();\n', to: '      if (sub !== null && proc !== null && !proc.retired) closeQuietly(proc, sub);\n' }]
  },
  // W365-10
  { rule: 'W365-10', name: "a site's null test removed", file: P365.CONFIG_STORE, edits: [{ find: '    if (sub === null) {\n      configLog.warn(', to: '    if (false) {\n      configLog.warn(' }] },
  {
    rule: 'W365-10',
    name: 'a sixth call site planted in src/main/arch/watch.ts',
    file: P365.ARCH_WATCH,
    edits: [{ append: '\nexport async function plantedSixthWatch(dir: string): Promise<void> {\n  const sub = await watchFolder(dir, {}, () => undefined);\n  if (sub === null) return;\n  await sub.close();\n}\n' }]
  },
  { rule: 'W365-10', name: 'trackWatcherClose(sub.close()) at a site', file: P365.CONFIG_STORE, edits: [{ find: '    watchStop = () => sub.close();', to: '    watchStop = () => trackWatcherClose(sub.close());' }] },
  { rule: 'W365-10', name: "the host's own trackWatcherClose removed", file: P365.HOST, edits: [{ find: '    entry.closing = trackWatcherClose(done);', to: '    entry.closing = done;' }] }
];

// -- every variant: the shipping tree, then one per plant ---------------------

const variants = [{ id: 'shipping', overlay: {} }];
const plantVariant = new Map();
for (const [i, plant] of W365_PLANTS.entries()) {
  const text = readTree(plant.file);
  const planted = text === null ? null : applyPlant(text, plant);
  if (planted === null) continue;
  const id = `plant-${String(i + 1).padStart(2, '0')}`;
  plantVariant.set(plant, id);
  variants.push({ id, overlay: { [plant.file]: planted } });
}

// ---------------------------------------------------------------------------
// Rules 3 and 4, and the drives: run the probe once, over every variant.
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', join(HERE, 'tsconfig.node.json'), join(HERE, 'build/watcher-conformance-probe.mts'), '--root', ROOT],
  { encoding: 'utf8', input: JSON.stringify({ variants }), cwd: HERE, maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
);
if (probe.status !== 0) {
  process.stdout.write(probe.stderr ?? '');
  process.stdout.write(`\nFAIL: the watcher probe did not run${probe.error ? ` (${probe.error.message})` : ''}.\n`);
  process.exit(1);
}
// The facts are the probe's last write. A module it drives that prints to
// standard output prints before it, so read from the facts' own start.
const factsAt = probe.stdout.lastIndexOf('{"budget":');
let data;
try {
  data = JSON.parse(probe.stdout.slice(Math.max(0, factsAt)));
} catch (err) {
  process.stdout.write(probe.stdout.slice(0, 2000));
  process.stdout.write(`\nFAIL: the watcher probe's facts did not parse (${err.message}).\n`);
  process.exit(1);
}

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
// W365: the shipping tree, then every plant, each read whole.
// ---------------------------------------------------------------------------

/** A finding's identity across variants: its rule and words, line numbers aside. */
const keyOf = (f) => `${f.rule}|${f.msg.replace(/:\d+\b/g, ':#')}`;

function w365Findings(id, overlay) {
  return [...w365Static(viewOf(overlay)), ...w365Driven(data.drives?.[id])];
}

const shipping365 = w365Findings('shipping', {});
for (const f of shipping365) failures.push(`${f.rule}: ${f.msg}`);
const shippingKeys = new Set(shipping365.map(keyOf));

const plant365Rows = [];
for (const plant of W365_PLANTS) {
  const id = plantVariant.get(plant);
  if (id === undefined) {
    failures.push(
      `W365 plant "${plant.name}": its anchor is not in ${plant.file} exactly once, so the ablation ` +
        'proves nothing. Move the anchor with the code it plants into.'
    );
    plant365Rows.push({ plant, read: 'STALE ANCHOR' });
    continue;
  }
  const overlay = variants.find((v) => v.id === id).overlay;
  const fresh = w365Findings(id, overlay).filter((f) => !shippingKeys.has(keyOf(f)));
  const red = new Set(fresh.map((f) => f.rule));
  const owned = new Set([plant.rule, ...(plant.alsoRed ?? [])]);
  const extra = [...red].filter((r) => !owned.has(r)).sort();
  const missing = [...owned].filter((r) => !red.has(r)).sort();
  let read = [...red].sort().join(' + ') || 'GREEN';
  if (!red.has(plant.rule)) {
    failures.push(`W365 plant "${plant.name}" left ${plant.rule} green; the rule no longer catches the defect it owns.`);
    read = `GREEN on ${plant.rule}`;
  } else if (extra.length > 0) {
    failures.push(`W365 plant "${plant.name}" also read ${extra.join(', ')} red, which it does not declare (${fresh.filter((f) => extra.includes(f.rule)).map((f) => `${f.rule}: ${f.msg}`).join(' | ')}).`);
  } else if (missing.length > 0) {
    failures.push(`W365 plant "${plant.name}" declares ${missing.join(', ')} red and left it green.`);
  }
  plant365Rows.push({ plant, read, findings: fresh });
}
const rules365Planted = new Set(W365_PLANTS.map((p) => p.rule));
for (let n = 1; n <= 10; n++) {
  if (!rules365Planted.has(`W365-${n}`)) failures.push(`W365-${n} has no plant, so nothing proves it can fail.`);
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
if (ROOT !== HERE) process.stdout.write(`Reading the tree at ${ROOT} (--root).\n\n`);

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

process.stdout.write(`\n${pad('W365 RULE', 9)} ${pad('SHIPPING', 9)} HOLDS\n`);
for (const [rule, holds] of W365_RULES) {
  const n = shipping365.filter((f) => f.rule === rule).length;
  process.stdout.write(`${pad(rule, 9)} ${pad(n === 0 ? 'green' : `RED (${n})`, 9)} ${holds}\n`);
}
process.stdout.write(
  `built halves (W365-1, W365-2): ${BUILT.skipped ?? `read ${BUILT.index.size} file(s) from out/main/index.js and ${BUILT.proc.size} from out/main/watcher-process.js`}\n`
);

process.stdout.write(`\n${pad('W365 PLANT', 62)} ${pad('RULE', 8)} READ\n`);
for (const r of plant365Rows) {
  process.stdout.write(`${pad(r.plant.name, 62)} ${pad(r.plant.rule, 8)} ${r.read}\n`);
}

process.stdout.write(
  `\n${sites.length} watch call sites scanned, ${fixtures.length} scanner ` +
    `fixtures and ${BUILT_FIXTURES.length} built-bundle fixtures proved, ${data.plans.length} plans run, ` +
    `${(data.hostile ?? []).length} hostile directory names matched, ` +
    `${W365_RULES.length} W365 rules read over ${variants.length} variants of the tree ` +
    `(the shipping one and ${variants.length - 1} plants), each driven by the probe over a ` +
    'fake native module, a fake process and a fake clock. Nothing was watched, ' +
    'spawned beyond the probe, or launched.\n'
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Every watch call site stays inside the eight path budget, the ' +
    'planner never exceeds it at any number of ignored roots, nothing past ' +
    'the budget is lost, no ignored file consumes a slot, and every overflow ' +
    'entry excludes the directory it names and nothing else. The open file ' +
    'watch arms one file through a descriptor, through one gate that asks the ' +
    'plan before and after the open and checks the inode once the kernel holds ' +
    `the watch, and each of its ${OPEN_FILE_PLANTS.length} plants reads red. The watcher runs in ` +
    'its own process behind one queue that makes one native call at a time, ' +
    'never subscribes to a folder that is not there and never lets a graced ' +
    'close hold it; main never loads the native module; every bound, restart ' +
    `and quit behaves as written; and each of its ${W365_PLANTS.length} plants reads red on exactly ` +
    'the rules it owns.\n'
);
