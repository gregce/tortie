#!/usr/bin/env node
/**
 * `npm run conformance:redline-write`, the gate on the guarded write channel
 * (Phase 226).
 *
 * About twenty five seconds, measured at 23.8 and 25.1 s after Phase 244's fix
 * round took the readings to 30 and the ablations to 17; it read 26 s at 29 and
 * 16, and about eighteen, measured at 17.8 s, after the Phase 226 fix round, and
 * eight of those are still the one ablation whose child is left to hang until
 * the deadline. The growth is the two growth-during-read arms' 16 MiB and 6 MiB
 * files, written and read once live and once per ablated copy. It
 * launches no Electron, opens no window, starts no tmux server, spawns no
 * agent, makes no request and reads nothing under the person's home. The
 * only processes it starts are node running the probe through the pinned
 * tsx, once live and once per ablation, and inside the probe `mkfifo` for
 * one fixture and two node children of itself: one for the kill arm, which
 * ends by its own SIGKILL and is waited for, and one for the FIFO arm, in a
 * process group of its own that the probe ends whole in a `finally`, because
 * a signal to tsx's node alone leaves the node it started blocked in the
 * open and reparented to launchd. Every fixture is written by the probe into a
 * scratch directory it removes in a `finally`, whatever happened. Every
 * runtime number here came from the SHIPPING channel,
 * src/main/fs/guarded-write.ts, run under node by build/redline-write-probe.mts.
 *
 * ## Why a gate rather than unit tests alone
 *
 * This is the channel that will rewrite the person's file when the redline's
 * rewind reaches it in Phase 227. Research 83 measured what each guard costs
 * when it is missing, and every one of them is a clause a later round could
 * delete without breaking a test written before the deletion. So every rule
 * below that reads runtime behaviour is re-run over an ablated copy of the
 * channel with that one clause removed, and the gate fails if the copy stays
 * green: a rule that cannot fail proves nothing.
 *
 * ## The rules
 *
 *   1. THE MATRIX. The four refusals and the three protections, each driven
 *      over a fixture the probe wrote: a root that is not open, a path that
 *      escapes the root, `.git`; a file one byte over the cap and one exactly
 *      at it, and a payload over the cap; a digest one byte stale, answered
 *      `stale` with the digest that IS there and nothing written; research 83
 *      E.7b's latin-1 fixture refused with the file untouched, beside a file
 *      that legitimately holds U+FFFD and a BOM+CRLF file that both round
 *      trip and are written byte exact; a link planted at the staged name,
 *      written through by nothing; a link at the target refused with the link
 *      still a link; a link planted at the target and at the staged copy in
 *      the window after staging, both refused as a race; a REAL SIGKILL
 *      between the staged write and the rename, leaving the old bytes intact
 *      and the staged copy behind, cleaned by the next write; and the
 *      ordinary write answering `wrote` with the digest of the new bytes,
 *      the file's mode kept, and no staged file left.
 *      THE FIX ROUND'S ARMS, every one a shape the Phase 226 verifier drove
 *      past the channel as first shipped: an append, a whole swap, a same-
 *      size rewrite in place and a bare chmod, each landing in the window
 *      after the digest matched, all refused `raced` with the agent's bytes
 *      kept, where the shipped channel answered `wrote` over them 4 of 4
 *      under a real appender; the staged copy swapped for a REGULAR file,
 *      which no link check sees; a file whose owner write bit is clear,
 *      refused `readOnly` where the shipped channel replaced it because
 *      `rename` asks the directory and not the file; and a NAMED PIPE at the
 *      path, answered `io` at once in a child of its own process group,
 *      where the shipped `open(2)` blocked main's thread for 5,002 ms.
 *   2. THE CAP IS ONE NUMBER. `READ_CAP_BYTES` is declared exactly once under
 *      src/, in the shared contract, and both the editor read and the guarded
 *      write import it, so `fs:readFile` truncates at exactly the size
 *      `fs:writeGuarded` refuses at. The probe's cap is checked against the
 *      literal re-derived from that declaration.
 *   3. THE ORDER, read from the entry point's own braces. `writeGuarded` is a
 *      function DECLARATION so `functionBodyOf` can read it; inside it the
 *      containment gate comes before the first open, the open before the
 *      hash, the hash before the rename; `lstatSync` precedes the one
 *      `renameSync`; the open carries `O_NOFOLLOW` and the create `O_EXCL`;
 *      and no `writeFile` or `writeFileSync` appears in the module, because
 *      both follow a link. The scanner is proved on six planted texts, five
 *      of which must fail it.
 *   4. THE NAME IS WHERE THE CLOSURE TEST COUNTS IT. The channel string
 *      appears once under src/main, in ipc.ts, once under src/preload, and
 *      never in the module, whose error sentences would otherwise read as a
 *      second registration.
 *   5. NO CALLER. Nothing under src/renderer names the channel or the preload
 *      method. This is the phase's own refusal made checkable, and PHASE 227
 *      DELETES THIS RULE in the commit that wires the rewind, narrowing
 *      conformance:redline's rule 9 in the same commit.
 *   6. The gate is named in package.json and in build/verification-checks.mjs,
 *      because a gate nothing names is how a gate decays.
 *   7. THE ABLATIONS. Fifteen copies of the channel, one clause removed each,
 *      and every one must move at least one reading of rule 1. The gate
 *      prints which reading moved for which clause. The identity comparison
 *      in front of the rename is ablated whole AND by its ctime clause alone,
 *      because ctime is the one of its four fields that decides on its own:
 *      every write moves it too, and a bare chmod moves nothing else.
 *
 * `P226_ABLATION_DETAIL=1` prints which reading each ablation moved.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { functionBodyOf, stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:redline-write]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const DOMAIN = join(repoRoot, 'src/main/fs');
const MODULE = 'guarded-write.ts';
const CHANNEL = 'fs:writeGuarded';
const METHOD = 'writeGuarded';

// ---------------------------------------------------------------------------
// Rule 1. The matrix.
// ---------------------------------------------------------------------------

/** Each reading the probe prints, and what the shipping channel must say. */
const MATRIX = [
  ['outsideRoot', 'refused/outside untouched', 'refusal 1: a root Tortie does not have open'],
  ['outsidePath', 'refused/outside untouched', 'refusal 1: a path that escapes the open root'],
  ['dotGit', 'refused/outside untouched', 'refusal 1: .git at any depth'],
  ['overCap', 'refused/tooLarge untouched', 'refusal 2: a file one byte over the cap, read by main itself'],
  ['atCap', 'wrote new', 'refusal 2: a file exactly at the cap is not refused'],
  ['payloadOverCap', 'refused/tooLarge untouched', 'refusal 2: new contents over the cap'],
  [
    'grewAfterFstat',
    'refused/tooLarge sentence=after-the-read grew=16777216 read=5242881 size=16777217 untouched no-temp',
    // PHASE 244, audit finding F4. The growth-during-read arm the audit named as
    // missing from this gate. The file gains 16 MiB between the fstat and the
    // first read; the reader stops one byte past its 5 MiB budget, the refusal
    // is the one AFTER the read naming the file rather than the new contents,
    // the target is untouched and no staged copy is left.
    'refusal 2 under growth: the read loop is held to its budget'
  ],
  [
    'grewAfterFstatOdd',
    'refused/tooLarge sentence=after-the-read grew=6291456 read=5242881 size=6356991 untouched no-temp',
    // PHASE 244's FIX ROUND. The same growth at a starting size that is NOT a
    // multiple of 64 KiB, which is what makes the loop's chunk clamp visible.
    // At the one-byte start above, `1 + 80 x 65536` is the ceiling exactly, so
    // a loop with no clamp reads the same 5,242,881 and the clause is pinned by
    // a coincidence. Here the clamp reads 5,242,881 and its absence 5,308,415.
    'refusal 2 under growth: the last chunk is clamped, so the stop is exact'
  ],
  ['stale', 'stale untouched names-disk-digest no-temp', 'refusal 3: a digest one byte stale'],
  ['latin1', 'refused/notUtf8 untouched 69B->69B', 'refusal 4: research 83 E.7b latin-1 fixture'],
  ['utf8WithFffd', 'wrote new', 'refusal 4 is a byte comparison: a real U+FFFD round trips'],
  ['bomCrlf', 'wrote new-bytes-exact', 'refusal 4 stated limit: BOM and CRLF pass through untouched'],
  ['linkAtTemp', 'wrote target=new victim=untouched no-temp', 'protection: a link planted at the staged name is not followed'],
  ['linkAtTarget', 'refused/link victim=untouched entry=still-a-link no-temp', 'protection: a link at the target is refused, not turned into a file'],
  ['linkRacedAtTarget', 'refused/raced victim=untouched entry=still-a-link no-temp', 'protection: a link planted at the target after staging is refused by lstat'],
  ['linkRacedAtTemp', 'refused/raced target=old entry=a-file victim=untouched no-temp', 'protection: a link swapped in at the staged copy is refused by lstat'],
  ['appendRaced', 'refused/raced target=appended-kept no-temp', 'the window after the hash: an append in it is refused and kept'],
  ['swapRaced', 'refused/raced target=agent-kept no-temp', 'the window after the hash: a file swapped whole in it is refused and kept'],
  ['rewriteRaced', 'refused/raced target=agent-kept no-temp', 'the window after the hash: a same-size rewrite in place is refused by its timestamps'],
  ['chmodRaced', 'refused/raced target=old mode=600 no-temp', 'the window after the hash: a chmod in it is refused by ctime, and not put back'],
  ['swapRacedAtTemp', 'refused/raced target=old no-temp', 'the window after the hash: the staged copy swapped for a regular file is refused by fstat'],
  ['readOnly', 'refused/readOnly untouched mode=444 no-temp', 'a file whose owner write bit is clear is refused, not replaced by rename'],
  ['fifo', 'answered refused/io pipe=still-a-pipe', 'a named pipe at the path is refused at once rather than blocking the thread'],
  ['killed', 'killed target=old-intact temp=left-with-new then wrote target=new no-temp', 'protection: a SIGKILL between the staged write and the rename'],
  ['ordinary', 'wrote new sha-of-new 33B mode=755 no-temp', 'the ordinary case, mode kept, digest of the new bytes answered'],
  ['twice', 'wrote wrote back', 'the digest a write answers is the next write\'s expect'],
  ['missing', 'refused/missing', 'a file that is not there'],
  ['badExpect', 'refused/input untouched', 'a digest that is not a digest'],
  ['absoluteInside', 'wrote new', 'an absolute path inside the root'],
  ['straysLeft', '0', 'no staged file survives the whole matrix']
];

function runProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-write-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(modules === null ? {} : { P226_MODULES: modules })
      }
    }
  );
  if (probe.status !== 0) {
    return { error: `the probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/** The readings rule 1 compares, as one list in MATRIX order. */
function verdict(readings) {
  if (readings.error !== undefined) return ['error'];
  return MATRIX.map(([key]) => String(readings[key]));
}

const live = runProbe(null);
if (live.error !== undefined) {
  process.stderr.write(`${TAG} ${live.error}\n`);
  process.exit(1);
}
{
  const width = Math.max(...MATRIX.map(([key]) => key.length));
  let behaved = 0;
  for (const [key, expected, what] of MATRIX) {
    const got = String(live[key]);
    if (got === expected) behaved += 1;
    else fail(`1. ${key} read "${got}" and the channel must read "${expected}" (${what})`);
    say(`   ${key.padEnd(width)}  ${got}`);
  }
  say(`1. ${String(behaved)} of ${String(MATRIX.length)} readings are what the channel must say`);
}

// ---------------------------------------------------------------------------
// Rule 2. The cap is one number.
// ---------------------------------------------------------------------------

function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name.startsWith('.')) continue;
      out.push(...walk(full, keep));
    } else if (keep(name.name)) out.push(full);
  }
  return out;
}

{
  const srcFiles = walk(join(repoRoot, 'src'), (n) => /\.[cm]?tsx?$/.test(n));
  const declared = [];
  const imported = [];
  for (const file of srcFiles) {
    const code = stripComments(readFileSync(file, 'utf8'));
    const rel = relative(repoRoot, file);
    if (/\bconst\s+READ_CAP_BYTES\s*=/.test(code)) declared.push(rel);
    if (/import\s*\{[^}]*\bREAD_CAP_BYTES\b[^}]*\}\s*from\s*'@shared\/fs-ops'/.test(code)) {
      imported.push(rel);
    }
  }
  if (declared.length !== 1 || declared[0] !== 'src/shared/fs-ops.ts') {
    fail(`2. READ_CAP_BYTES is declared in ${declared.length === 0 ? 'no file' : declared.join(', ')}, and it must be declared once, in src/shared/fs-ops.ts`);
  }
  for (const need of ['src/main/fs/ipc.ts', `src/main/fs/${MODULE}`]) {
    if (!imported.includes(need)) fail(`2. ${need} does not import READ_CAP_BYTES from the shared contract`);
  }
  const shared = stripComments(readFileSync(join(repoRoot, 'src/shared/fs-ops.ts'), 'utf8'));
  const m = /\bconst\s+READ_CAP_BYTES\s*=\s*([0-9*\s]+);/.exec(shared);
  const literal = m === null ? NaN : Function(`return (${m[1]});`)();
  if (String(literal) !== String(live.cap)) {
    fail(`2. the probe's cap read ${String(live.cap)} and the shared declaration re-derives to ${String(literal)}`);
  }
  say(`2. READ_CAP_BYTES is declared once, in ${declared.join(', ') || 'nowhere'}, imported by ${imported.length} files, and the probe's cap ${String(live.cap)} is that declaration re-derived`);
}

// ---------------------------------------------------------------------------
// Rule 3. The order, read from the entry point's own braces.
// ---------------------------------------------------------------------------

/** Findings about a channel module's shape; empty means it has the shape. */
function orderFindings(source) {
  const code = stripComments(source);
  const out = [];
  const body = functionBodyOf(code, METHOD);
  if (body === null) {
    out.push(`${METHOD} is not a function declaration, so its body cannot be read`);
    return out;
  }
  const at = (needle) => body.indexOf(needle);
  const gate = at('resolveOpenProjectRoot(');
  const inside = at('resolveInsideRoot(');
  const open = at('openSync(');
  const hash = at('sha256Of(');
  const rename = at('renameSync(');
  const lstat = at('lstatSync(');
  if (gate === -1) out.push('the entry point never asks resolveOpenProjectRoot');
  if (inside === -1) out.push('the entry point never asks resolveInsideRoot');
  if (open === -1) out.push('the entry point never opens the file');
  if (hash === -1) out.push('the entry point never hashes what it read');
  if (rename === -1) out.push('the entry point never renames');
  if (gate !== -1 && open !== -1 && gate > open) out.push('the file is opened before the containment gate is asked');
  if (inside !== -1 && open !== -1 && inside > open) out.push('the file is opened before the path is proved inside the root');
  if (open !== -1 && hash !== -1 && open > hash) out.push('the hash comes before the open');
  if (hash !== -1 && rename !== -1 && hash > rename) out.push('the rename comes before the hash');
  if (lstat === -1 || (rename !== -1 && lstat > rename)) out.push('no lstatSync precedes the rename');
  const renames = body.split('renameSync(').length - 1;
  if (renames !== 1) out.push(`${String(renames)} renameSync calls, and there must be exactly one`);
  if (!/O_NOFOLLOW/.test(body)) out.push('the read does not carry O_NOFOLLOW');
  if (!/O_NONBLOCK/.test(body)) out.push('the read does not carry O_NONBLOCK, so a named pipe blocks the thread');
  if (!/O_EXCL/.test(body)) out.push('the staged create does not carry O_EXCL');
  if (/\bwriteFile(Sync)?\s*\(/.test(code)) out.push('the module calls writeFile or writeFileSync, which follow a link');
  return out;
}

const ORDER_FIXTURES = [
  {
    name: 'the shape',
    mustPass: true,
    text: `export async function ${METHOD}(deps, input) {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | constants.O_NONBLOCK);
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
}`
  },
  {
    name: 'an arrow, not a declaration',
    mustPass: false,
    text: `export const ${METHOD} = async (deps, input) => {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
};`
  },
  {
    name: 'the open before the gate',
    mustPass: false,
    text: `export async function ${METHOD}(deps, input) {
  const fd = openSync(input.path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
}`
  },
  {
    name: 'no lstat before the rename',
    mustPass: false,
    text: `export async function ${METHOD}(deps, input) {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_EXCL, mode);
  renameSync(staged, abs);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
}`
  },
  {
    name: 'a writeFileSync in the module',
    mustPass: false,
    text: `export async function ${METHOD}(deps, input) {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const disk = sha256Of(raw);
  writeFileSync(staged, payload);
  const out = openSync(staged, constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
}`
  },
  {
    name: 'the shape without O_NONBLOCK, which is the FIFO hang',
    mustPass: false,
    text: `export async function ${METHOD}(deps, input) {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  const fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
}`
  },
  {
    name: 'O_NOFOLLOW only in a comment',
    mustPass: false,
    text: `export async function ${METHOD}(deps, input) {
  const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
  const abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  // O_NOFOLLOW
  const fd = openSync(abs, constants.O_RDONLY);
  const disk = sha256Of(raw);
  const out = openSync(staged, constants.O_EXCL, mode);
  if (lstatSync(abs).isSymbolicLink()) return refused('raced', 'x');
  renameSync(staged, abs);
}`
  }
];

{
  let behaved = 0;
  for (const f of ORDER_FIXTURES) {
    const passed = orderFindings(f.text).length === 0;
    if (passed === f.mustPass) behaved += 1;
    else fail(`3. the order scanner misread the fixture "${f.name}"`);
  }
  const findings = orderFindings(readFileSync(join(DOMAIN, MODULE), 'utf8'));
  for (const f of findings) fail(`3. src/main/fs/${MODULE}: ${f}`);
  say(`3. ${METHOD} is a declaration whose body asks the gate before the open, the open before the hash, the hash before the one rename, with an lstat in front of it, O_NOFOLLOW and O_NONBLOCK on the read, O_EXCL on the create and no writeFile anywhere (${String(behaved)} of ${String(ORDER_FIXTURES.length)} scanner fixtures behaved)`);
}

// ---------------------------------------------------------------------------
// Rule 4. The name is where the closure test counts it.
// ---------------------------------------------------------------------------

function filesNaming(dir, needle) {
  return walk(dir, (n) => /\.[cm]?tsx?$/.test(n))
    .filter((f) => !/__tests__|\.test\./.test(f))
    .filter((f) => stripComments(readFileSync(f, 'utf8')).includes(needle))
    .map((f) => relative(repoRoot, f));
}

{
  const module = stripComments(readFileSync(join(DOMAIN, MODULE), 'utf8'));
  if (module.includes("'fs:") || module.includes('"fs:')) {
    fail(`4. src/main/fs/${MODULE} names a channel string, which the closure test would count as a registration`);
  }
  const inMain = filesNaming(join(repoRoot, 'src/main'), `'${CHANNEL}'`);
  const inPreload = filesNaming(join(repoRoot, 'src/preload'), `'${CHANNEL}'`);
  if (inMain.length !== 1 || inMain[0] !== 'src/main/fs/ipc.ts') {
    fail(`4. '${CHANNEL}' is named under src/main by ${inMain.join(', ') || 'no file'}, and it must be src/main/fs/ipc.ts alone`);
  }
  if (inPreload.length !== 1) {
    fail(`4. '${CHANNEL}' is named under src/preload by ${inPreload.join(', ') || 'no file'}, and it must be one file`);
  }
  say(`4. '${CHANNEL}' is named once under src/main (${inMain.join(', ')}), once under src/preload (${inPreload.join(', ')}), and not in the module`);
}

// ---------------------------------------------------------------------------
// Rule 5. THE NAMED CALLERS. Phase 226 shipped this channel unwired and this
// rule read "nothing under src/renderer names it". Phase 227 wired the rewind,
// so the rule was NARROWED rather than deleted, the way conformance:redline's
// own rule 9 was: the renderer reached the channel from EXACTLY ONE file, and
// a SECOND caller was a finding.
//
// PHASE 240 IS THAT SECOND CALLER, and the rule is widened by exactly one NAME
// rather than to "any number", for the reason its own header gave the first
// time: what matters is that this write has a countable set of doors, each one
// declared here, so a third door is still a finding. The two are the redline's
// rewind and the editor's save, being Sean Johnson's issue 16.
// ---------------------------------------------------------------------------

const RENDERER_CALLERS = [
  'src/renderer/editor/redline-write.ts',
  'src/renderer/editor/save-write.ts'
];
{
  const rendererDir = join(repoRoot, 'src/renderer');
  const byChannel = filesNaming(rendererDir, CHANNEL);
  const byMethod = filesNaming(rendererDir, `.${METHOD}(`);
  const callers = [...new Set([...byChannel, ...byMethod])].sort();
  const want = [...RENDERER_CALLERS].sort();
  if (callers.length !== want.length || callers.some((f, i) => f !== want[i])) {
    fail(
      `5. the renderer must reach the channel from ${want.join(' and ')} alone; ` +
        `it reaches it from ${callers.join(', ') || 'no file'}`
    );
  } else {
    say(`5. the renderer reaches the channel from ${want.join(' and ')} alone, the redline's rewind and the editor's save`);
  }
}

// ---------------------------------------------------------------------------
// Rule 6. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

{
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  if (!pkg.includes('"conformance:redline-write"')) fail('6. package.json does not name conformance:redline-write');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!checks.includes("'conformance:redline-write'")) fail('6. build/verification-checks.mjs does not classify conformance:redline-write');
  say('6. the gate is named in package.json and classified in build/verification-checks.mjs');
}

// ---------------------------------------------------------------------------
// Rule 7. The ablations.
// ---------------------------------------------------------------------------

/**
 * One clause each. `from` is an exact substring of the shipping module and
 * `to` is that clause removed. The eighth carries two edits on purpose: with
 * the unlink kept, a planted link is removed before the create and O_EXCL
 * alone never meets it, so removing O_EXCL alone changes nothing a reading
 * can see. That is the credentials gate's precedent for its no-follow pair.
 */
const ABLATIONS = [
  {
    name: 'the root is not asked whether it is open',
    edits: [{ from: '() => deps.listProjectRoots()', to: 'async () => [input.root]' }]
  },
  {
    name: 'the path is not proved inside the root',
    edits: [
      {
        from: 'abs = (await resolveInsideRoot(realRoot, input.path)).abs;',
        to: "abs = (await import('node:path')).resolve(realRoot, input.path);"
      }
    ]
  },
  {
    name: 'the cap is not asked',
    edits: [{ from: 'return bytes > READ_CAP_BYTES;', to: 'return false;' }]
  },
  {
    name: 'the digest is not compared',
    edits: [{ from: 'if (disk !== input.expect) {', to: 'if (false) {' }]
  },
  {
    name: 'the decode round trip is not compared',
    edits: [{ from: "if (!Buffer.from(text, 'utf8').equals(raw)) {", to: 'if (false) {' }]
  },
  {
    name: 'the read follows a link',
    edits: [
      {
        from: 'constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)',
        to: 'constants.O_RDONLY'
      }
    ]
  },
  {
    name: 'a leftover at the staged name is kept',
    edits: [{ from: '    unlinkSync(staged);\n  } catch {\n    // Nothing was there', to: '    void staged;\n  } catch {\n    // Nothing was there' }]
  },
  {
    name: 'the staged create follows a link',
    edits: [
      { from: '    unlinkSync(staged);\n  } catch {\n    // Nothing was there', to: '    void staged;\n  } catch {\n    // Nothing was there' },
      {
        from: 'constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL',
        to: 'constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC'
      }
    ]
  },
  {
    name: 'the target is not asked whether it is still the entry that was read',
    edits: [{ from: 'if (!sameEntry(seen, now)) {', to: 'if (false) {' }]
  },
  {
    // ctime is the one field of the four that decides ALONE, because every
    // write moves it too; a bare chmod moves nothing else.
    name: 'ctime is left out of what makes two readings the same entry',
    edits: [{ from: ' &&\n    seen.ctimeNs === now.ctimeNs', to: '' }]
  },
  {
    name: 'the staged copy is not asked whether it is still the file Tortie wrote',
    edits: [
      { from: 'if (!sameEntry(stagedSeen, lstatSync(staged, { bigint: true }))) {', to: 'if (false) {' }
    ]
  },
  {
    name: 'the read blocks on a named pipe',
    edits: [{ from: ' | constants.O_NONBLOCK', to: '' }]
  },
  {
    name: 'the owner write bit is not asked',
    edits: [{ from: 'if ((mode & 0o200) === 0) {', to: 'if (false) {' }]
  },
  {
    // PHASE 244, finding F4. The payload's LENGTH is asked now, measured with
    // `Buffer.byteLength`, which allocates nothing; the encoded buffer is built
    // at step 7, after every refusal that would make it pointless.
    name: 'the new contents are not held to the cap',
    edits: [{ from: 'if (overCap(payloadBytes)) {', to: 'if (false) {' }]
  },
  {
    name: 'the write is not staged beside the file',
    edits: [{ from: 'const staged = swapNameFor(abs);', to: 'const staged = abs;' }]
  },
  {
    // PHASE 244, audit finding F4. The budget inside the read loop, put back to
    // exactly what the parent commit did: run to EOF whatever it costs and ask
    // the cap of the collected buffer afterwards. That is what let a file
    // growing under the reader be consumed WHOLE — 16,777,217 bytes against a
    // 5,242,880 cap, in 258 synchronous readSync calls on main's thread, and
    // about twice that in buffer, because the chunk list is held and then
    // concat copies all of it again.
    //
    // BOTH lines go, together, because they are one clause: the break is what
    // ends the loop and the remaining-budget size is what feeds it. Removing
    // only the break would leave `want` computed as zero once the budget is
    // spent, and a loop asking for zero bytes for ever is a hang rather than a
    // red reading.
    name: 'the read loop is not held to its budget',
    edits: [
      { from: '    if (total >= ceiling) break;\n', to: '' },
      { from: 'want = Math.min(64 * 1024, ceiling - total);', to: 'want = 64 * 1024;' }
    ]
  },
  {
    // PHASE 244's FIX ROUND. The CLAMP alone, which the ablation above cannot
    // isolate and which nothing pinned until this round.
    //
    // The break above still ends the loop, so this is not the parent's
    // unbounded read; what it loses is the EXACTNESS the module's own header
    // claims, being that the reader stops one byte past the budget. Without it
    // the last chunk is a whole 64 KiB whatever is left, so the stop lands
    // anywhere in [ceiling, ceiling + 65535] depending only on where the file's
    // starting size falls modulo 64 KiB.
    //
    // It is invisible at the one-byte start the first growth arm uses, because
    // READ_CAP_BYTES is an exact multiple of 64 KiB, so this ablation is what
    // the SECOND growth arm exists for. Measured: 5,242,881 shipping and
    // 5,308,415 ablated. The cost is at most 64 KiB and the refusal is
    // unchanged either way, which is why this is exactness rather than a leak.
    name: 'the last chunk of the read is not clamped to what is left of the budget',
    edits: [{ from: 'want = Math.min(64 * 1024, ceiling - total);', to: 'want = 64 * 1024;' }]
  }
];

/**
 * THE COPIES LIVE ONE LEVEL UNDER `src/main/`, and the depth is exact. The
 * module imports `../durable/write` and `../errors`, so a copy anywhere else
 * fails to IMPORT rather than fail the rule it removed, and a suite red for
 * the wrong reason proves nothing. Each copy is a sibling of `fs/`, dotted so
 * no include glob and no test runner picks it up, and removed in the `finally`
 * whatever happened.
 */
const ABLATION_PREFIX = `.p226-ablation-${process.pid.toString(36)}-`;
const mainDir = join(repoRoot, 'src/main');

function sweepAblations() {
  for (const name of readdirSync(mainDir)) {
    if (name.startsWith(ABLATION_PREFIX)) {
      rmSync(join(mainDir, name), { recursive: true, force: true });
    }
  }
}

const moves = [];
let red = 0;
try {
  const was = verdict(live);
  for (const [i, ablation] of ABLATIONS.entries()) {
    const dir = join(mainDir, `${ABLATION_PREFIX}${String(i)}`);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'))) {
      cpSync(join(DOMAIN, f), join(dir, f));
    }
    const target = join(dir, MODULE);
    let applied = true;
    for (const edit of ablation.edits) {
      if (!existsSync(target)) {
        fail(`7. there is no ${MODULE} to ablate for "${ablation.name}"`);
        applied = false;
        break;
      }
      const before = readFileSync(target, 'utf8');
      if (!before.includes(edit.from)) {
        fail(`7. the ablation "${ablation.name}" found nothing to edit in ${MODULE}`);
        applied = false;
        break;
      }
      writeFileSync(target, before.replace(edit.from, edit.to));
    }
    if (!applied) continue;
    const got = verdict(runProbe(dir));
    if (got[0] === 'error') {
      // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED.
      fail(`7. the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing`);
      continue;
    }
    const moved = MATRIX.filter((_, at) => got[at] !== was[at]).map(([key], _at) => key);
    const detail = MATRIX.map(([key], at) => (got[at] !== was[at] ? `${key} -> "${got[at]}"` : null)).filter(Boolean);
    if (moved.length > 0) {
      red += 1;
      moves.push(`${ablation.name} -> ${detail.join(', ')}`);
    } else {
      fail(`7. the ablation "${ablation.name}" changed nothing this gate checks, so that rule cannot fail`);
    }
  }
  say(`7. ${String(red)} of ${String(ABLATIONS.length)} ablations went red, one clause each`);
  if (process.env['P226_ABLATION_DETAIL'] === '1') {
    for (const line of moves) say(`   ablation ${line}`);
  }
} finally {
  sweepAblations();
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`OK: ${String(MATRIX.length)} readings, ${String(red)} of ${String(ABLATIONS.length)} ablations red, every rule passed.`);
process.exit(0);
