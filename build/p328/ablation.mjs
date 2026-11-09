#!/usr/bin/env node
/**
 * `npm run ablation:p328`. THE ATTACK ON PHASE 328'S OWN CLAUSES
 * (build/p353/SPEC.md §4.4 step 6, D328-3, D328-4 and D328-6; the Phase 328
 * entry in docs/BACKLOG.md, mechanism 7).
 *
 * A few minutes. It launches no Electron, starts no tmux server, spawns no
 * agent (agy above all: it is never launched), makes no request and spends no
 * token. It starts nothing but `cp` and `node` running vitest, and it reads
 * nothing under the person's home.
 *
 * ## Why it exists
 *
 * Phase 328 takes ONE job away from antigravity's output, reading as work, and
 * keeps the other three: resetting the dialog count, releasing a blocked
 * session, keeping the session probed (clause A); and it reads a tool on a
 * terminal of its own as weak evidence (clause B). Each of those is a clause
 * of src/main/activity/state-machine.ts or process.ts, or a field on the
 * compiled registry, and each has a row in
 * src/main/activity/__tests__/p328-writes-without-drawing.test.ts it exists
 * for. THIS SCRIPT PROVES THE OWNERSHIP, the entry's eight arms and two more:
 * each clause broken in the SHIPPING source one at a time, and the row that
 * owns it must go red BY NAME.
 *
 * ## It never writes into the working tree
 *
 * The clone of `build/p321/ablation.mjs`: `cp -Rc` of `src/` and of
 * `build/fixtures/questions/` (the rebuilt timeline is there) under a scratch
 * directory (`P328_SCRATCH`, else the system's temporary directory), the
 * configs copied, `node_modules` symlinked, vitest run there; every edited
 * clone file restored and CHECKED BY SHA256 before the next arm; the clone
 * removed in a `finally` and on a signal; and the worktree's own bytes asserted
 * unmoved at the end. Each needle must match its file exactly once, every owner
 * must go red, and an UNEDITED CONTROL is green before the first arm and after
 * the last.
 *
 * Usage:
 *   node build/p328/ablation.mjs
 *   P328_ONLY=B1,B5 node build/p328/ablation.mjs        named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p328]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const MACHINE = 'src/main/activity/state-machine.ts';
const PROCESS = 'src/main/activity/process.ts';
const REGISTRY = 'src/main/agents/registry.ts';
const P328_TEST = 'src/main/activity/__tests__/p328-writes-without-drawing.test.ts';
const TIMELINE = 'build/fixtures/questions/a-antigravity-timeline.json';

// p328-writes-without-drawing.test.ts, by describe.
const TURN = 'antigravity at rest reads idle, and the invariant holds over its one recorded turn';
const WORDS = 'his numbered words in the resting input box, under the recorded writes';
const TOOL = 'a tool on a terminal of its own reads as work';
const OTHERS = 'every other registry row, the shell and the floor read the parent over the same inputs';

const row = (d, title) => `${d} > ${title}`;
const REST_ROW = row(TURN, 'at rest, from +270 s, HEAD reads idle on every tick at 1 s and at 2 s, in every phase, where the parent read running');
const INVARIANT_ROW = row(TURN, 'THE INVARIANT: dialog count, clear count, needs_input, probe and capture equal the parent tick for tick, and HEAD works where the parent did not only while a session leader is alive');
const WORDS_ROWS = [
  row(WORDS, 'typed key by key, at 1 s and 2 s over ten phases: HEAD\'s needs_input ticks are the parent\'s'),
  row(WORDS, 'pasted in one write, at 1 s and 2 s over ten phases: HEAD\'s needs_input ticks are the parent\'s')
];
const ZERO_CPU_ROW = row(TOOL, 'the silent tool with agy’s CPU at 0, 1 and 4 percent reads running at HEAD on every tick, through clause B');
const CHILD_ROW = row(TOOL, 'a terminal child left alive at rest reads running');
const QUESTION_WITH_TOOL_ROW = row(TOOL, 'a numbered question drawn while a terminal tool is alive reads needs_input exactly as at the parent');
const UNKNOWN_ROW = row(OTHERS, 'an agent this build has never heard of');

const ARMS = [
  {
    n: 'B1',
    name: 'output counted as work again for antigravity',
    file: MACHINE,
    tests: [P328_TEST],
    find: '  const outputIsWork = outputEvidence && profile.writesWithoutDrawing !== true;',
    to: '  const outputIsWork = outputEvidence;',
    owners: [REST_ROW]
  },
  {
    n: 'B2',
    name: 'the masked tick no longer resetting the dialog count',
    file: MACHINE,
    tests: [P328_TEST],
    find: '  if (outputEvidence) {\n    st.dialogTicks = 0;\n',
    to: '  if (outputEvidence) {\n',
    owners: WORDS_ROWS
  },
  {
    n: 'B3',
    name: 'the dialog arm run on a masked tick',
    file: MACHINE,
    tests: [P328_TEST],
    find: '  if (outputEvidence) {\n    st.dialogTicks = 0;',
    to: '  if (outputEvidence && !dialog) {\n    st.dialogTicks = 0;',
    owners: WORDS_ROWS
  },
  {
    n: 'B4',
    name: 'lastOutputAt taken out of worthProbing',
    file: MACHINE,
    tests: [P328_TEST],
    find: '    (profile.writesWithoutDrawing === true && now - st.lastOutputAt < AMBIGUOUS_WINDOW_MS)',
    to: '    false',
    owners: [INVARIANT_ROW]
  },
  {
    n: 'B5',
    name: 'clause B removed',
    file: MACHINE,
    tests: [P328_TEST],
    find: '    profile.terminalTools === true && ctx.proc !== null && hasTerminalTool(ctx.proc, pane.panePid);',
    to: '    false;',
    owners: [ZERO_CPU_ROW, CHILD_ROW]
  },
  {
    n: 'B6',
    name: 'clause B moved above the dialog arm, as strong evidence',
    file: MACHINE,
    tests: [P328_TEST],
    find: '  if (outputIsWork || cpuBusy || toolChild) {',
    to: '  if (outputIsWork || cpuBusy || toolChild || terminalTool) {',
    owners: [QUESTION_WITH_TOOL_ROW]
  },
  {
    n: 'B7',
    name: 'the two fields taken off antigravity’s row',
    file: REGISTRY,
    tests: [P328_TEST],
    find: '      writesWithoutDrawing: true,\n      terminalTools: true,\n',
    to: '',
    owners: [REST_ROW]
  },
  {
    n: 'B8',
    name: 'a field put on DEFAULT_ACTIVITY',
    file: REGISTRY,
    tests: [P328_TEST],
    find: "export const DEFAULT_ACTIVITY: AgentActivityProfile = {\n  tier: 'screen',\n",
    to: "export const DEFAULT_ACTIVITY: AgentActivityProfile = {\n  tier: 'screen',\n  writesWithoutDrawing: true,\n",
    owners: [UNKNOWN_ROW]
  },
  {
    n: 'B9',
    name: 'the masked tick not keeping the session probed (lastOutputAt never stamped)',
    file: MACHINE,
    tests: [P328_TEST],
    find: '    st.lastOutputAt = ctx.now;\n',
    to: '',
    owners: [INVARIANT_ROW]
  },
  {
    n: 'B10',
    name: 'clause B asking only what the tool-child rule already sees (a leader outside the foreground)',
    file: PROCESS,
    tests: [P328_TEST],
    find: "    if ((snap.stat.get(pid) ?? '').includes('s')) return true;",
    to: "    if ((snap.stat.get(pid) ?? '').includes('s') && !(snap.stat.get(pid) ?? '').includes('+')) return true;",
    owners: [ZERO_CPU_ROW, CHILD_ROW]
  }
];

// ---------------------------------------------------------------------------
// The clone, and vitest inside it
// ---------------------------------------------------------------------------

const PARENT = process.env['P328_SCRATCH'] || tmpdir();
if (!existsSync(PARENT)) {
  process.stderr.write(`${TAG} P328_SCRATCH names ${PARENT}, which does not exist\n`);
  process.exit(2);
}
const scratch = mkdtempSync(join(PARENT, `p328-ablation-${String(process.pid)}-`));

function buildClone() {
  const r = spawnSync('cp', ['-Rc', join(REPO, 'src'), join(scratch, 'src')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc src failed: ${r.stderr}`);
  mkdirSync(join(scratch, 'build', 'fixtures'), { recursive: true });
  const q = spawnSync('cp', ['-Rc', join(REPO, 'build', 'fixtures', 'questions'), join(scratch, 'build', 'fixtures', 'questions')], { encoding: 'utf8' });
  if (q.status !== 0) throw new Error(`cp -Rc build/fixtures/questions failed: ${q.stderr}`);
  const configs = ['package.json', 'vitest.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))];
  for (const name of configs) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** Run the named test files in the clone and answer the full name of every row that failed. */
function runTests(files) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000, env: { ...process.env } }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) {
    return { code: r.status ?? 1, failed: null, names: [], ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  }
  const failed = [];
  const names = [];
  let ran = 0;
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      ran += 1;
      const name = [...(a.ancestorTitles ?? []), a.title].join(' > ');
      names.push(name);
      if (a.status === 'failed') failed.push(name);
    }
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') failed.push(`${file.name} (did not load)`);
  }
  return { code: r.status ?? 1, failed, names, ran, tail: '' };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* a scratch directory; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

const count = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);

const problems = [];
const table = [];
const started = Date.now();
let ran = 0;
let owned = 0;

const WATCHED = [MACHINE, PROCESS, REGISTRY, P328_TEST, TIMELINE];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  const only = (process.env['P328_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const name of only) {
    if (!ARMS.some((a) => a.n === name)) problems.push(`P328_ONLY names ${JSON.stringify(name)}, which is no arm`);
  }

  const control = runTests([P328_TEST]);
  if (control.failed === null || control.failed.length > 0 || control.ran === 0) {
    problems.push(
      `the UNEDITED control is not green (${control.failed === null ? 'no report' : `${String(control.failed.length)} red of ${String(control.ran)}`}), ` +
        `so every arm below would mean nothing. ${(control.failed ?? []).slice(0, 5).join(' | ')}${control.tail}`
    );
    throw new Error('control red');
  }
  say(`control: ${String(control.ran)} rows green`);
  // Every owner an arm names must be a row the control ran, or a renamed row
  // would read as an owner that stayed green rather than as a missing one.
  const known = new Set(control.names);
  for (const arm of ARMS) {
    for (const o of arm.owners) if (!known.has(o)) problems.push(`${arm.n} names an owner no row is called: ${o}`);
  }

  for (const arm of ARMS) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const shipping = readFileSync(join(REPO, arm.file), 'utf8');
    const hits = count(shipping, arm.find);
    if (hits !== 1) {
      problems.push(`${arm.n} "${arm.name}": its needle matches ${String(hits)} times in ${arm.file}, not exactly once. A clause that moved moves its arm in the same commit.`);
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    const path = join(scratch, arm.file);
    writeFileSync(path, shipping.replace(arm.find, () => arm.to), 'utf8');
    ran += 1;
    let got;
    try {
      got = runTests(arm.tests);
    } finally {
      restore(arm.file);
    }
    if (got.failed === null) {
      problems.push(`${arm.n} "${arm.name}": vitest produced no report. ${got.tail}`);
      table.push([arm.n, 'NO REPORT', arm.name]);
      continue;
    }
    const missing = arm.owners.filter((o) => !got.failed.includes(o));
    const others = got.failed.filter((f) => !arm.owners.includes(f));
    if (missing.length > 0) {
      problems.push(
        `${arm.n} "${arm.name}": its owner stayed GREEN: ${missing.join(' | ')}. ` +
          (others.length > 0 ? `Red instead: ${others.slice(0, 4).join(' | ')}` : 'Nothing went red, so the clause is decoration.')
      );
      table.push([arm.n, others.length > 0 ? 'RED ELSEWHERE' : 'NOTHING MOVED', arm.name]);
    } else {
      owned += 1;
      table.push([arm.n, 'owner red', `${arm.name}${others.length > 0 ? ` (and ${String(others.length)} other row${others.length === 1 ? '' : 's'})` : ''}`]);
    }
    say(`${arm.n.padEnd(4)} ${missing.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: ${String(got.failed.length)} red of ${String(got.ran)}`);
  }

  const after = runTests([P328_TEST]);
  if (after.failed === null || after.failed.length > 0) {
    problems.push('after every file was restored the control is not green again, so a restore did not land');
  } else {
    say(`restored: every edited clone file matched the worktree by sha256, and the control is green again (${String(after.ran)} rows)`);
  }
} catch (err) {
  if (!(err instanceof Error && err.message === 'control red')) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  }
} finally {
  clean();
}

for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
}

process.stdout.write('\n');
for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(14)} ${name}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned THE ROW THAT OWNS IT red ` +
    `by name (${String(owned)} of ${String(ran)}). Every clone file was restored and proved by sha256, the worktree was ` +
    'never written, and the clone is gone. No Electron, no tmux, no agent, no token.\n'
);
