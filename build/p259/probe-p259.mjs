#!/usr/bin/env node
/**
 * `npm run probe:p259`. THE APP RUN for the bounded semantic pass (Phase 259,
 * spec build/p259/SPEC.md §7.2), written by the fix round because the phase
 * shipped without one and both verifiers recorded its absence.
 *
 * WHAT IT DRIVES, and it is the SHIPPED path end to end: the deterministic
 * pass, the `arch:enrich` channel under a part scope and under the journeys
 * scope, the validator, the grader, the floor, the store, and then the two
 * new views read OFF THE LIVE DOM — the journeys walk with its numbered
 * steps, the gates worksheet with its reasons, the chips with their grades,
 * the rate beside its floor, and a claim made STALE by an edit from outside.
 *
 * ## IT SPENDS NOTHING, AND THAT IS THE WHOLE REASON IT CAN BE RE-RUN
 *
 * `GMUX_FOLD_BIN` (Phase 138) points `src/main/overview/fold/spawn.ts` at the
 * stub this file writes, which READS THE PROMPT IT WAS HANDED and answers out
 * of the FACTS block in it. So the citations are real lines of the scratch
 * repository, the grader really grades them, and no model is asked anything.
 * The override is refused unless the launch is an isolated harness launch on
 * a profile inside the harness directory, which is `src/main/harness/
 * fold-stub.ts`'s own pair of refusals and not this file's.
 *
 * THE STUB IS NOT A MODEL AND THE PROBE NEVER PRETENDS IT IS. What a real
 * agent's answers look like is the MEASUREMENT's job (build/p259/measure-
 * semantic.mjs, the operator's own narrow token lift); what this probe proves
 * is that a kept answer reaches the face intact and that the face says what
 * §6 says it says.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run without a socket of its own beginning `gmux-p259`, and
 *    refuses the names `gmux` and `default` outright.
 *  - The operator's `-L gmux` server is READ ONLY: one `list-sessions` count
 *    before and after, which must match. Nothing attaches, sends keys or kills.
 *  - ONE Electron, through build/electron-run.mjs, on a scratch profile under
 *    the harness directory with HOME inside it, ended in a finally block.
 *  - The repository it reads is one it builds itself under that directory and
 *    removes in the same finally block. No checkout of his is opened.
 *  - No `security`, no keychain, no machine, no ssh, no request, no token.
 *
 * Usage:
 *   node build/harness-socket.mjs gmux-p259 'node build/p259/probe-p259.mjs'
 *   node build/p259/probe-p259.mjs --self-test     (launches nothing)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from '../electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[probe:p259]';
const t0 = Date.now();
const say = (line) => process.stdout.write(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}\n`);
const refuse = (why) => {
  process.stderr.write(`${TAG} REFUSED. ${why}\n`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
// The scratch repository. Every file carries a fact this product's own
// detectors find, so every citation the stub copies is a real line.
// ---------------------------------------------------------------------------

const SCRATCH_FILES = {
  'package.json': '{\n  "name": "p259-scratch",\n  "private": true\n}\n',
  'src/app/index.ts': [
    "import { open } from '../store/index';",
    "import { ipcMain } from 'electron';",
    '',
    'export function register(): void {',
    "  ipcMain.handle('probe:open', () => open());",
    "  ipcMain.handle('probe:close', () => true);",
    '}',
    ''
  ].join('\n'),
  'src/app/guard.ts': [
    'export function guard(ok: boolean): void {',
    '  if (!ok) {',
    "    throw new Error('the probe refuses a write outside its own directory');",
    '  }',
    '}',
    ''
  ].join('\n'),
  'src/store/index.ts': [
    "import { writeFileSync } from 'node:fs';",
    '',
    'export function open(): string {',
    "  writeFileSync('/tmp/p259-scratch-store', 'one');",
    "  return 'open';",
    '}',
    ''
  ].join('\n'),
  'src/store/keep.ts': "export const keep = (): number => 1;\n",
  'src/net/index.ts': [
    "import { spawn } from 'node:child_process';",
    '',
    'export function reach(): void {',
    "  spawn('/bin/echo', ['one']);",
    '}',
    ''
  ].join('\n'),
  'src/net/wait.ts': "export const wait = (): boolean => true;\n"
};

/**
 * What the stale arm does from outside, and WHY it is a move rather than an
 * edit. The stub cites the first fact line of the block, which is the module
 * ROOT of the part's own `index.ts` — a fact of the PATH, so rewriting the
 * file's body leaves it exactly where it was and the citation merely moves.
 * Moving the file takes the path away, which is the one thing no rewrite of
 * the bytes can do, and it is `drift.ts`'s own fourth arm: the file is no
 * longer a file of this repository.
 */
const EDIT_FILE = 'src/app/index.ts';
const EDIT_TO = 'src/app/register.ts';

// ---------------------------------------------------------------------------
// The stub, which answers OUT OF THE PROMPT IT WAS HANDED
// ---------------------------------------------------------------------------

/**
 * The stub's own reading of a composed prompt, exported so `--self-test`
 * proves it without launching anything.
 *
 * It takes the citations from the FACTS block's own lines, which is exactly
 * what the instruction asks a model to do, so a kept answer here proves the
 * grader really graded real lines rather than that the stub guessed well.
 */
export function answerFor(prompt) {
  const lines = prompt.split('\n');
  const cites = [];
  for (const line of lines) {
    const hit = / at ([^\s:]+):([0-9]{1,7})$/.exec(line);
    if (hit !== null) cites.push({ at: `${hit[1]}:${hit[2]}`, why: 'the line the facts named' });
  }
  const journeys = /\{"journeys"/.test(prompt) || /Say how setup reaches a result/.test(prompt);
  if (journeys) {
    // One step per part the block sampled, in the block's own order, each
    // citing that part's own first sampled line.
    const steps = [];
    let partId = null;
    for (const line of lines) {
      const head = /^part ([a-z0-9-]+):$/.exec(line);
      if (head !== null) {
        partId = head[1];
        continue;
      }
      const hit = / at ([^\s:]+):([0-9]{1,7})$/.exec(line);
      if (hit === null || partId === null) continue;
      if (steps.some((s) => s.partId === partId)) continue;
      steps.push({
        partId,
        label: `work reaches ${partId}`,
        facts: [{ at: `${hit[1]}:${hit[2]}`, why: 'the line the facts named' }]
      });
    }
    return JSON.stringify({
      journeys: steps.length === 0 ? [] : [{ id: 'a-walk', name: 'A person asks and an answer comes back', steps }]
    });
  }
  const part = /^PART ([a-z0-9-]+)$/m.exec(prompt)?.[1] ?? '';
  const first = cites.slice(0, 1);
  const fields = ['name', 'receives', 'does', 'returns', 'runsIn', 'keeps', 'limit'];
  return JSON.stringify({
    part,
    claims: fields.map((field) => ({
      field,
      text:
        field === 'name'
          ? 'The part that answers asks'
          : `what the part ${field}, said plainly and with nothing measured in it`,
      facts: first
    })),
    gates: cites.length === 0 ? [] : [
      {
        id: 'the-one-gate',
        question: 'Where does work stop here?',
        answer: 'stops',
        because: 'It refuses before it writes.',
        facts: first
      }
    ]
  });
}

/** Write the stub pair: the reader, and the shell wrapper the fold spawns. */
function writeStub(dir) {
  mkdirSync(dir, { recursive: true });
  const script = join(dir, 'p259-stub.mjs');
  const wrapper = join(dir, 'p259-stub.sh');
  // IT CARRIES THE FUNCTION'S OWN SOURCE rather than importing this file.
  // Importing it RUNS it: this module's run block is top level, so the first
  // version of this probe had the fold spawn a second copy of the probe, which
  // printed the probe's own first line into the answer and exited 1. The fold
  // reported `exit-1` with that line as the agent's own words, which is a
  // rather good demonstration that the detail field really carries what the
  // child said.
  writeFileSync(
    script,
    [
      '// Harness only (Phase 259 fix round). Answers out of the prompt it was',
      '// handed and asks nothing of anybody. It spends nothing.',
      "import { appendFileSync } from 'node:fs';",
      `const answerFor = ${answerFor.toString()};`,
      'const argv = process.argv.slice(2);',
      "const at = argv.indexOf('-p');",
      "const prompt = at === -1 ? (argv[argv.length - 1] ?? '') : (argv[at + 1] ?? '');",
      "const log = process.env['P259_STUB_LOG'] ?? '';",
      "if (log !== '') appendFileSync(log, String(Date.now()) + ' ' + String(prompt.length) + '\\n');",
      // The codex recipe reads JSONL (`readCodexJson`), so the answer rides
      // one `item.completed` line the way the real CLI emits it. A stub that
      // printed the bare JSON is reported `no-result`, which is the reader
      // doing its job.
      "process.stdout.write(JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: answerFor(prompt) } }) + '\\n');",
      "process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 0, output_tokens: 0 } }) + '\\n');",
      ''
    ].join('\n'),
    'utf8'
  );
  writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`, { mode: 0o755 });
  return wrapper;
}

// ---------------------------------------------------------------------------
// The grader, exported so --self-test proves it without launching anything
// ---------------------------------------------------------------------------

/** One finding per thing that is not what §6 says it is. */
export function grade(marks) {
  const bad = [];
  const want = (ok, what) => {
    if (!ok) bad.push(what);
  };
  const m = (name) => marks[name] ?? null;

  want(m('choice')?.agentId === 'codex', `the choice did not stick: ${JSON.stringify(m('choice'))}`);
  want((m('check')?.generation ?? -1) >= 0, 'the deterministic pass did not answer a generation');

  // Before any ask: both views present, nothing read, and the one sentence.
  const before = m('before');
  want(before?.readAt === null, `the reading was not empty before any ask: ${JSON.stringify(before)}`);
  const faceBefore = m('face-before');
  want(faceBefore?.journeys?.noReading === true, 'the journeys view drew no "nothing has read this repository" line with no reading');
  want(faceBefore?.journeys?.settings === true, 'the journeys view drew no Settings button, and §7.6 says there is one way in');
  want(faceBefore?.gates?.noReading === true, 'the gates view drew no "nothing has read this repository" line with no reading');
  want((faceBefore?.journeys?.chips ?? 1) === 0, 'a chip was drawn with nothing read');

  // The two asks.
  const part = m('ask-part');
  want(part?.started === true, `the part ask never started: ${JSON.stringify(part)}`);
  want(part?.verdict === 'kept', `the part ask was not kept: ${JSON.stringify(part)}`);
  want((part?.claims ?? 0) >= 7, `the part ask kept ${String(part?.claims)} rows and seven claims and a gate were answered`);
  want((part?.promptBytes ?? 0) > 0, 'the run face reports no promptBytes, which is what the measurement record reads');
  const walk = m('ask-journeys');
  want(walk?.started === true, `the journeys ask never started: ${JSON.stringify(walk)}`);
  want(walk?.verdict === 'kept', `the journeys ask was not kept: ${JSON.stringify(walk)}; the block it is handed has to carry lines a step may cite`);

  // The reading.
  const reading = m('reading');
  want((reading?.parts ?? 0) >= 1, 'the reading holds no part');
  want((reading?.journeys ?? 0) >= 1, 'the reading holds no journey');
  want((reading?.gates ?? 0) >= 1, 'the reading holds no gate reason');
  want(reading?.readAt !== null, 'the reading has no readAt after a kept ask');
  want((reading?.cites ?? 0) >= 1, 'the reading holds no citation at all');
  want((reading?.unresolved ?? 1) === 0, `${String(reading?.unresolved)} citation(s) in the reading resolve to nothing`);

  // The face after.
  const face = m('face-after');
  want((face?.journeys?.steps ?? 0) >= 1, 'the journeys view draws no step');
  want(face?.journeys?.numbered === true, 'the steps are not numbered on the face');
  want((face?.journeys?.chips ?? 0) >= 1, 'no chip is drawn beside a step');
  want(face?.journeys?.readBy === true, 'the journeys view does not say who read it');
  want(face?.journeys?.noReading === false, 'the journeys view still says nothing has read this repository');
  want((face?.gates?.reasons ?? 0) >= 1, 'the gates worksheet draws no model reason');
  const rate = face?.journeys?.rate ?? face?.gates?.rate ?? null;
  want(rate !== null, 'no rate is drawn on either view');
  if (rate !== null) {
    want(/backed/.test(rate.text ?? ''), `the rate does not say backed: ${String(rate.text)}`);
    want(/would be by chance/.test(rate.text ?? ''), `the rate is drawn WITHOUT its floor: ${String(rate.text)}`);
    want((rate.floorLines ?? 0) > 0, 'the drawn rate carries no floor denominator');
    want(/by chance/.test(rate.title ?? ''), 'the per grade hover draws no floor beside any grade');
  }
  const grades = face?.journeys?.grades ?? [];
  want(grades.every((g) => ['gate', 'call-site', 'declaration', 'resolves', 'stale'].includes(g)), `a chip wears a grade nothing knows: ${JSON.stringify(grades)}`);

  // The stale arm.
  const stale = m('stale');
  want(stale?.stale >= 1, `nothing turned stale after the cited fact was edited away: ${JSON.stringify(stale)}`);
  want(stale?.sentenceKept === true, 'a stale claim lost its sentence, and stale is a mark and never a deletion');
  want(typeof stale?.reason === 'string' && stale.reason.length > 0, 'a stale claim carries no reason naming the citation that went');
  want(stale?.staleChip === true, 'the face draws no stale chip');
  return bad;
}

// ---------------------------------------------------------------------------
// --self-test: the grader over fixtures, launching nothing
// ---------------------------------------------------------------------------

function selfTest() {
  const problems = [];
  const eq = (what, got, wanted) => {
    if (JSON.stringify(got) !== JSON.stringify(wanted)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`);
  };
  const good = {
    choice: { agentId: 'codex', model: 'gpt-6-astra' },
    check: { generation: 1 },
    before: { readAt: null, parts: 0, journeys: 0 },
    'face-before': {
      journeys: { noReading: true, settings: true, chips: 0, steps: 0 },
      gates: { noReading: true }
    },
    'ask-part': { started: true, verdict: 'kept', claims: 8, promptBytes: 4000, rowsDropped: 0 },
    'ask-journeys': { started: true, verdict: 'kept', claims: 3, promptBytes: 900, rowsDropped: 0 },
    reading: { parts: 1, journeys: 1, gates: 1, readAt: 123, cites: 9, unresolved: 0 },
    'face-after': {
      journeys: {
        steps: 3,
        numbered: true,
        chips: 3,
        readBy: true,
        noReading: false,
        grades: ['call-site'],
        rate: { text: '9 of 9 backed · 2 of 9 would be by chance', title: 'gate 0 · 1 of 9 by chance', floorLines: 400 }
      },
      gates: { reasons: 1, rate: null }
    },
    stale: { stale: 1, sentenceKept: true, reason: 'src/app/index.ts:5 no longer carries IPC serves probe:open', staleChip: true }
  };
  eq('the good reading raises nothing', grade(good), []);
  const drop = (name, over) => ({ ...good, [name]: { ...good[name], ...over } });
  eq('a rate drawn without its floor is a finding', grade({ ...good, 'face-after': { ...good['face-after'], journeys: { ...good['face-after'].journeys, rate: { text: '9 of 9 backed', title: '', floorLines: 0 } } } }).length, 3);
  eq('a journeys ask that refused is a finding', grade(drop('ask-journeys', { verdict: 'refused' })).length, 1);
  eq('nothing turning stale is a finding', grade(drop('stale', { stale: 0 })).length, 1);
  eq('a stale claim that lost its sentence is a finding', grade(drop('stale', { sentenceKept: false })).length, 1);
  eq('a view that still says nothing has read this is a finding', grade({ ...good, 'face-after': { ...good['face-after'], journeys: { ...good['face-after'].journeys, noReading: true } } }).length, 1);
  eq('no chip at all is a finding', grade({ ...good, 'face-after': { ...good['face-after'], journeys: { ...good['face-after'].journeys, chips: 0 } } }).length, 1);
  eq('a chip wearing an unknown grade is a finding', grade({ ...good, 'face-after': { ...good['face-after'], journeys: { ...good['face-after'].journeys, grades: ['excellent'] } } }).length, 1);
  eq('a reading with nothing in it is a finding', grade(drop('reading', { parts: 0, journeys: 0, gates: 0, cites: 0 })).length, 4);
  eq('a face with no sentence before any ask is a finding', grade({ ...good, 'face-before': { journeys: { noReading: false, settings: false, chips: 0 }, gates: { noReading: false } } }).length, 3);

  // The stub's own reading of a composed prompt.
  const partPrompt = [
    'PART src-app',
    'FACTS',
    'surface',
    '  ipc-channel IPC serves probe:open at src/app/index.ts:5',
    'END FACTS'
  ].join('\n');
  const answer = JSON.parse(answerFor(partPrompt));
  eq('the stub answers about the part it was asked about', answer.part, 'src-app');
  eq('the stub writes seven claims', answer.claims.length, 7);
  eq('the stub copies the citation out of the FACTS block', answer.claims[0].facts[0].at, 'src/app/index.ts:5');
  const journeyPrompt = [
    'Say how setup reaches a result across them.',
    'PARTS',
    '  src-app: 2 files, 2 ipc-channel',
    'lines you may cite:',
    'part src-app:',
    '  ipc-channel IPC serves probe:open at src/app/index.ts:5',
    'part src-store:',
    '  fs-write writes a file at src/store/index.ts:4',
    'END FACTS'
  ].join('\n');
  const walk = JSON.parse(answerFor(journeyPrompt));
  eq('the stub writes one walk over the parts the block sampled', walk.journeys[0].steps.map((s) => s.partId), ['src-app', 'src-store']);
  eq('and every step cites the line it was shown', walk.journeys[0].steps[1].facts[0].at, 'src/store/index.ts:4');
  eq('a journeys block with no citable line writes no journey', JSON.parse(answerFor('Say how setup reaches a result across them.\nPARTS\n  a: 1 files\nEND FACTS')).journeys, []);

  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`${TAG} SELF-TEST FAIL: ${p}\n`);
    process.exit(1);
  }
  say(`self-test OK: the grader behaved on 10 fixtures and the stub on 6, and nothing was launched`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

// THE RECURSION REFUSAL, and it is here because it happened. The first
// version of the stub IMPORTED this file for `answerFor`, and importing it
// RUNS it: the fold spawned a probe, which launched an Electron, whose fold
// spawned a probe, and so on, leaving eight Electrons and profile paths
// reading `p259/p259/p259/p259/profile`. The stub carries the function's own
// source now, and this refusal is the second fence: nothing this probe starts
// can ever start this probe, whatever a later round hands the fold.
if ((process.env['P259_INSIDE'] ?? '') === '1') {
  refuse('P259_INSIDE is set, so this probe was started by something this probe started');
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse("no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs gmux-p259 'node build/p259/probe-p259.mjs'");
}
if (socket === 'gmux' || socket === 'default') refuse(`the socket is "${socket}"; this probe never touches his server`);
if (!socket.startsWith('gmux-p259')) refuse(`the socket is "${socket}"; it must begin gmux-p259`);

const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
const root = harnessDir === '' ? join(tmpdir(), `p259-probe-${String(process.pid)}`) : join(harnessDir, 'p259');
const home = join(root, 'home');
const profile = join(root, 'profile');
const repo = join(root, 'repo');
const stubDir = join(root, 'stub');
const png = join(root, 'p259.png');

const tmux = join(REPO, 'build', 'vendor', 'tmux', 'bin', 'tmux');
function operatorSessions() {
  const out = spawnSync(tmux, ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

function git(dir, args) {
  const out = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${out.stderr}`);
  return (out.stdout ?? '').trim();
}

function buildScratchRepo(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [rel, text] of Object.entries(SCRATCH_FILES)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text, 'utf8');
  }
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'probe@example.invalid']);
  git(dir, ['config', 'user.name', 'probe']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'one']);
  return git(dir, ['rev-parse', 'HEAD']);
}

/** The renderer's own script: it drives the channels and reads the DOM. */
function probeJs(cwd) {
  return `(async () => {
  const cwd = ${JSON.stringify(cwd)};
  const api = window.gmux.arch;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mark = (what, value) => console.log('[p259] ' + what + ' ' + JSON.stringify(value === undefined ? null : value));
  const TAB = () => document.querySelector('[data-slot="arch-map-tab"]');
  const until = async (test, ms) => {
    const started = Date.now();
    for (;;) {
      try { if (await test()) return true; } catch { /* not yet */ }
      if (Date.now() - started > ms) return false;
      await sleep(300);
    }
  };
  const setTab = async (name) => {
    const b = TAB()?.querySelector('.arch-tabs button[data-tab="' + name + '"]');
    if (b === null || b === undefined) return false;
    b.click();
    await sleep(700);
    return true;
  };
  const readFace = async (partId) => {
    await setTab('journeys');
    const j = TAB()?.querySelector('[data-slot="arch-journeys"]') ?? null;
    const rateEl = j?.querySelector('.arch-rate') ?? null;
    const journeys = {
      present: j !== null,
      noReading: (j?.querySelector('[data-slot="arch-no-reading"]') ?? null) !== null,
      settings: [...(j?.querySelectorAll('button') ?? [])].some((b) => (b.textContent ?? '').trim() === 'Settings'),
      steps: j === null ? 0 : j.querySelectorAll('.arch-journey-step').length,
      numbered: j === null ? false : [...j.querySelectorAll('.arch-journey-step')].every((s) => /^[0-9]+\\./.test((s.textContent ?? '').trim())),
      chips: j === null ? 0 : j.querySelectorAll('.arch-cite').length,
      grades: j === null ? [] : [...new Set([...j.querySelectorAll('.arch-cite')].map((c) => c.getAttribute('data-grade')))],
      readBy: j === null ? false : j.querySelectorAll('.arch-read-by').length > 0,
      staleChip: j === null ? false : j.querySelector('.arch-cite[data-grade="stale"]') !== null,
      rate: rateEl === null ? null : {
        text: (rateEl.textContent ?? '').trim(),
        title: rateEl.getAttribute('title'),
        backed: Number(rateEl.getAttribute('data-backed')),
        total: Number(rateEl.getAttribute('data-total')),
        floorLines: Number(rateEl.getAttribute('data-floor-lines'))
      },
      text: j === null ? '' : (j.textContent ?? '').trim().slice(0, 400)
    };
    await setTab('gates');
    // The worksheet answers about ONE named part, so the scope is chosen the
    // way a person's choice reaches React: through the value setter and a
    // change event, never by assigning to .value.
    if (typeof partId === 'string' && partId.length > 0) {
      const sel = TAB()?.querySelector('.arch-gates-select') ?? null;
      if (sel !== null) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(sel, partId);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(700);
      }
    }
    const g = TAB()?.querySelector('[data-slot="arch-gates"]') ?? null;
    const gRate = g?.querySelector('.arch-rate') ?? null;
    const gates = {
      present: g !== null,
      scope: g?.querySelector('.arch-gates-select')?.value ?? null,
      noReading: (g?.querySelector('[data-slot="arch-no-reading"]') ?? null) !== null,
      reasons: g === null ? 0 : g.querySelectorAll('.arch-gate-reason').length,
      notRead: (g?.querySelector('.arch-gates-not-read') ?? null) !== null,
      rate: gRate === null ? null : {
        text: (gRate.textContent ?? '').trim(),
        title: gRate.getAttribute('title'),
        floorLines: Number(gRate.getAttribute('data-floor-lines'))
      }
    };
    await setTab('journeys');
    return { journeys, gates };
  };

  await window.gmux.settingsSet({ arch: { enabled: true, agentId: 'codex', model: 'gpt-6-astra', wrapperPass: true } });
  const settings = await window.gmux.settingsGet();
  mark('choice', { agentId: settings?.arch?.agentId ?? null, model: settings?.arch?.model ?? null });

  const check = await api.check({ cwd });
  mark('check', { generation: check.generation ?? null, error: check.error ?? null });

  const before = await api.semantic({ cwd });
  mark('before', { readAt: before.readAt ?? null, parts: (before.parts ?? []).length, journeys: (before.journeys ?? []).length });

  // The map, through the door the shot harness and every probe since Phase
  // 201 uses, then the two views with NOTHING read.
  const opened = await until(async () => {
    const b = document.querySelector('.arch-map-open');
    if (b === null) return false;
    b.click();
    return true;
  }, 60000);
  const drawn = await until(async () => TAB() !== null && TAB().querySelector('.arch-tabs') !== null, 120000);
  mark('map', { opened, drawn });
  mark('face-before', await readFace(null));

  const map = await api.map({ cwd });
  const factsUnder = (g) => {
    let total = 0;
    for (const kinds of Object.values(g?.counts ?? {})) {
      if (kinds === null || typeof kinds !== 'object') continue;
      for (const n of Object.values(kinds)) if (typeof n === 'number') total += n;
    }
    return total;
  };
  const groups = (map.groups ?? []).map((g) => ({ id: g.id, facts: factsUnder(g) }));
  const box = groups.find((g) => g.facts > 0) ?? groups[0] ?? null;
  mark('boxes', { groups, chose: box?.id ?? null });

  const one = await api.enrich({ cwd, scope: 'part', partId: box?.id ?? '' });
  mark('ask-part', { started: one.started, refusal: one.refusal ?? null, verdict: one.run?.verdict ?? null, reason: one.run?.reason ?? null, detail: (one.run?.detail ?? null), claims: one.run?.claims ?? null, rowsDropped: one.run?.rowsDropped ?? null, promptBytes: one.run?.promptBytes ?? null, answerBytes: one.run?.answerBytes ?? null });
  const two = await api.enrich({ cwd, scope: 'journeys' });
  mark('ask-journeys', { started: two.started, refusal: two.refusal ?? null, verdict: two.run?.verdict ?? null, reason: two.run?.reason ?? null, detail: (two.run?.detail ?? null), claims: two.run?.claims ?? null, rowsDropped: two.run?.rowsDropped ?? null, promptBytes: two.run?.promptBytes ?? null });

  const after = await api.semantic({ cwd });
  const cites = [];
  for (const p of after.parts ?? []) for (const c of p.claims ?? []) for (const q of c.cites ?? []) cites.push(q);
  for (const g of after.gates ?? []) for (const q of g.cites ?? []) cites.push(q);
  for (const j of after.journeys ?? []) for (const s of j.steps ?? []) for (const q of s.cites ?? []) cites.push(q);
  mark('reading', {
    readAt: after.readAt ?? null,
    parts: (after.parts ?? []).length,
    journeys: (after.journeys ?? []).length,
    gates: (after.gates ?? []).length,
    rates: (after.rates ?? []).length,
    cites: cites.length,
    unresolved: cites.filter((c) => c.grade === undefined || c.grade === null).length,
    grades: [...new Set(cites.map((c) => c.grade))],
    firstRate: (after.rates ?? [])[0] ?? null
  });

  // The map redraws off the same store, so the views are re-read rather than
  // re-opened: the reading arrives through the same event a person's would.
  await until(async () => (TAB()?.querySelectorAll('.arch-cite').length ?? 0) > 0, 60000);
  mark('face-after', await readFace(box?.id ?? null));

  // The stale arm. This process cannot write a file, so it asks for the edit
  // and then waits for the deterministic pass to see it.
  const cited = cites.find((c) => c.relPath === 'src/app/index.ts') ?? cites[0] ?? null;
  mark('pause-for-edit', { at: cited?.at ?? null });
  let stale = null;
  await until(async () => {
    await api.check({ cwd });
    const now = await api.semantic({ cwd });
    const claims = (now.parts ?? []).flatMap((p) => p.claims ?? []);
    const dead = claims.filter((c) => c.stale === true);
    const gatesStale = (now.gates ?? []).filter((g) => g.stale === true);
    if (dead.length + gatesStale.length === 0) return false;
    const one = dead[0] ?? gatesStale[0];
    stale = {
      stale: dead.length + gatesStale.length,
      reason: one.staleReason ?? null,
      sentenceKept: typeof (one.text ?? one.because) === 'string' && (one.text ?? one.because).length > 0
    };
    return true;
  }, 180000);
  const faceStale = await readFace(box?.id ?? null);
  mark('stale', { ...(stale ?? { stale: 0, reason: null, sentenceKept: false }), staleChip: faceStale.journeys.staleChip || (TAB()?.querySelector('.arch-cite[data-grade="stale"]') !== null) });
  mark('face-stale', faceStale);
  return 'done';
})()`;
}

const sessionsBefore = operatorSessions();
say(`the operator's -L gmux server holds ${String(sessionsBefore)} session(s) before`);

let text = '';
let code = null;
rmSync(root, { recursive: true, force: true });
mkdirSync(home, { recursive: true });
mkdirSync(profile, { recursive: true });
const stubLog = join(stubDir, 'count.log');
mkdirSync(stubDir, { recursive: true });
writeFileSync(stubLog, '', 'utf8');
const stub = writeStub(stubDir);
const head = buildScratchRepo(repo);
say(`the scratch repository is at ${repo}, first commit ${head.slice(0, 12)}`);

try {
  await withElectron(
    {
      label: 'p259',
      userDataDir: profile,
      cwd: REPO,
      tmuxSocket: socket,
      ceilingMs: 420_000,
      env: {
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_HARNESS_DIR: root,
        GMUX_SHOT: png,
        GMUX_SHOT_DELAY_MS: '2000',
        // The drive runs entirely inside the renderer, so without this the
        // only thing the harness output carries is silence.
        GMUX_SHOT_VERBOSE: '1',
        GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: repo, arch: { width: 420, live: true, cwd: repo, check: false } }),
        GMUX_SHOT_JS: probeJs(repo),
        GMUX_FOLD_BIN: stub,
        P259_INSIDE: '1',
        P259_STUB_LOG: stubLog
      }
    },
    async (handle) => {
      const exited = new Promise((r) => {
        void handle.exited.then((c) => setTimeout(() => r(c), 500));
      });
      try {
        await Promise.race([
          handle.waitForLine(/\[p259\] pause-for-edit /, 300_000),
          exited.then(() => Promise.reject(new Error('the app exited before the stale arm')))
        ]);
        git(repo, ['mv', EDIT_FILE, EDIT_TO]);
        git(repo, ['commit', '-q', '-m', 'the cited file moves']);
        say(`${EDIT_FILE} was moved to ${EDIT_TO} from outside and committed`);
      } catch (err) {
        say(`coordination stopped: ${String(err)}`);
      }
      code = await exited;
      text = handle.text();
      return code;
    }
  );
} finally {
  const sessionsAfter = operatorSessions();
  say(`the operator's -L gmux server holds ${String(sessionsAfter)} session(s) after`);
  if (sessionsAfter !== sessionsBefore) {
    process.stderr.write(`${TAG} his sessions MOVED, and nothing here may move them\n`);
  }
  rmSync(root, { recursive: true, force: true });
}

const marks = {};
for (const line of text.split('\n')) {
  const m = /\[p259\] ([a-zA-Z-]+) (.*)$/.exec(line);
  if (m === null) continue;
  try {
    marks[m[1]] = JSON.parse(m[2]);
  } catch {
    marks[m[1]] = m[2];
  }
}
for (const [what, value] of Object.entries(marks)) {
  say(`${what}: ${JSON.stringify(value)}`);
}
const findings = grade(marks);
const face = marks['face-after'] ?? {};
say(
  `the face: ${String(face.journeys?.steps ?? 0)} numbered step(s), ` +
    `${String(face.journeys?.chips ?? 0)} chip(s) wearing ${JSON.stringify(face.journeys?.grades ?? [])}, ` +
    `${String(face.gates?.reasons ?? 0)} gate reason(s) under the scope ` +
    `${JSON.stringify(face.gates?.scope ?? null)}, the rate "${String(face.journeys?.rate?.text ?? face.gates?.rate?.text ?? '')}"`
);
say(`${String(Object.keys(marks).length)} readings, ${String(findings.length)} finding(s)`);
for (const f of findings) process.stderr.write(`${TAG} FINDING: ${f}\n`);
process.exit(findings.length === 0 ? 0 : 1);
