#!/usr/bin/env node
/**
 * probe-p261-cmdt.mjs. THE PHASE 261 APP RUN FOR ITEM 3: is the prefilled name
 * in the ⌘T sheet selected, on every open, under load?
 *
 * ONE Electron on a scratch profile with a scratch HOME, on this script's own
 * tmux socket, over a project it builds inside its own scratch directory. It
 * spawns no agent, creates NO SESSION, spends no token, opens no keychain and
 * makes no request. Create is never pressed; every open is ended with Escape.
 * The operator's own `-L gmux` sessions are counted before and after and must
 * not move.
 *
 * ## Why this has to be a run, and why it reads PAINTED FRAMES
 *
 * The defect Phase 86 recorded is a race, not a state:
 * `requestAnimationFrame(() => nameRef.current?.select())` was scheduled from
 * the same passive effect that calls `setName`, so the frame could fire either
 * side of the commit that puts the prefilled name into the DOM. When it fired
 * first, `select()` ran against the PREVIOUS value and the commit that followed
 * put the prefill in with the caret at its end.
 *
 * A settled reading cannot tell a fix from a race that happened to win, which
 * is exactly the mistake in the record: Phase 86 read "6 of 6 opens selected"
 * on an idle machine and its own entry warns that the figure is optimistic and
 * not reproducible — a second person read 5 of 6 at load average 3.38, and
 * under load average 13.5 one open in three read 0 of 262 frames selected and
 * settled at caret 8.
 *
 * So the reading here is a property of every ANIMATION FRAME of an open. A
 * `requestAnimationFrame` loop installed before the chord records, per frame,
 * the field's value and its selection. An open FAILS when any frame carries
 * the committed prefill (`/^[a-z-]+-\d+$/`) with the selection not covering
 * the whole of it. The fix is a layout effect, which runs before paint in the
 * commit that carries the value, so at HEAD no such frame can exist; at the
 * parent one exists whenever the frame callback wins the race.
 *
 * ## How the race is reached, and why a letter is typed at the end of each open
 *
 * The race is only visible when the prefilled name DIFFERS from what the input
 * already holds. `CreateSessionModal` returns null while shut but never
 * unmounts, so the input keeps the last opening's text. With no session ever
 * created every open computes the same name, and a run that only opened and
 * shut would compare `shell-1` with `shell-1` and reach nothing.
 *
 * So each open ends by typing one letter into the field — which is the
 * operator's own gesture, since his report is "pressing ⌘T and typing a letter
 * replaces the name most of the time and appends to it some of the time". The
 * NEXT open therefore starts with a stale `shell-1x` in the DOM against a
 * prefill of `shell-1`, which is the shape that races. The typed frames are
 * excluded from the grade by the prefill pattern, so they cannot be mistaken
 * for a finding.
 *
 * ## How load is induced, and why no load generator is started
 *
 * Not by shell burners. On 2026-09-02 a verifier's six loops reparented to
 * launchd and ran for two hours at about 550% of the operator's CPU, which is
 * why the conventions now demand a `finally` for every child — and why this
 * run starts none at all. The window is widened with
 * `Emulation.setCPUThrottlingRate`, the instrument `probe:p167` already uses,
 * which spawns nothing and stops with the page. Half the opens run at rate 1
 * and half at rate `P261_CPU` (default 20), and the two halves are printed
 * separately, because the unthrottled half is the shape he actually uses and
 * the throttled half is the one that reaches the race.
 *
 * WHAT THE THROTTLE ACTUALLY BOUGHT, measured rather than assumed: nothing, on
 * this machine. It does not change the frame RATE — the recorder read about 60
 * frames per open at both rates — and both rates read the same answer on both
 * sides. What it did change is how many frames land before the commit, `pre`
 * rising from 2 to 13 over twenty opens, so it widens the window in frames
 * without moving the verdict here. It is kept because a machine that IS busy is
 * the one the operator reported from, and a reading taken only on an idle
 * machine is the 6-of-6 mistake this probe exists to distrust.
 *
 * ## WHAT IT READ, 2026-09-12, on the operator's Mac Pro
 *
 *   side    rate  opens  bad  unselected frames  first bad frame  settled
 *   parent   1     20     20        20            [8,8] at 0      [0,8]
 *   parent  20     20     20        20            [8,8] at 0      [0,8]
 *   HEAD     1     20      0         0            —               —
 *   HEAD    20     20      0         0            —               —
 *
 * `document.activeElement` was `session-name` on all 80 opens on both sides, so
 * the fix moved no focus.
 *
 * READ THE PARENT'S SHAPE HONESTLY. The bad frame is the FIRST committed frame
 * of every open, it carries the caret at [8, 8] — the end of `claude-1`, which
 * is the "settling at caret 8" of the Phase 86 record — and the open then
 * settles SELECTED at [0, 8]. So on this machine the frame callback lost the
 * race by exactly one frame on 40 of 40 opens rather than losing it outright:
 * there is one painted frame per open in which the prefilled name is committed
 * and unselected, and one input window in which a keystroke would append. The
 * operator's worse symptom needs the callback to fire BEFORE the commit, which
 * did not happen in this run; what is claimed here is the frame, measured 40 of
 * 40 at the parent and 0 of 40 at HEAD, and no more than that.
 *
 * ## The two runs, and the refusal to claim more than was measured
 *
 *   at HEAD:    npm run build && node build/p261/probe-p261-cmdt.mjs
 *   at parent:  git show fb4b8a4f:src/renderer/app/CreateSessionModal.tsx \
 *                 > src/renderer/app/CreateSessionModal.tsx
 *               npm run build && P261_SIDE=parent node build/p261/probe-p261-cmdt.mjs
 *               git checkout <this branch's file> && npm run build
 *
 * HEAD must read 0 bad opens of `P261_OPENS` at BOTH rates, and it does. The parent reads
 * whatever it reads and the number is published as it is. IF THE PARENT ALSO
 * READS ZERO the probe prints INCONCLUSIVE and the phase says so, rather than
 * claiming a measured difference: an arm that can only pass is not an arm.
 * `P261_SIDE=parent` therefore does not fail the run on findings — it records
 * them — and `P261_SIDE=head` (the default) fails on any.
 *
 * The focus reading is taken on both sides and must agree. The fix calls the
 * same method on the same element, so whatever `select()` does about focus it
 * does after it too; if the two sides disagree, that is a needs_work and not a
 * nit, and the probe says so by name.
 *
 * ## SAFETY
 *
 * The Electron is started through build/electron-run.mjs, which ends the tree
 * it started in a `finally` whatever happened. The socket is handed in by
 * build/harness-socket.mjs, which names it `gmux-p261-<slug>-<pid>`, ends that
 * server afterwards and unlinks its socket; `gmux` and `default` are refused by
 * name here as well. Every other process this script starts is a synchronous
 * `git` or `tmux` that has exited before the call returns, and the only `tmux`
 * ever aimed at `-L gmux` is `list-sessions`. Every byte written is under
 * `GMUX_HARNESS_DIR`. `--self-test` proves the grader on fixtures and launches
 * nothing.
 *
 * Knobs: `P261_OPENS` (opens per rate, default 20), `P261_CPU` (the throttle,
 * default 20), `P261_SAMPLE_MS` (default 500), `P261_SIDE` (`head`/`parent`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { writeDriveResult } from '../drive-result.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p261cmdt]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The grader, proved on fixtures under --self-test.
// ---------------------------------------------------------------------------

/** A prefilled session name, `<agent>-<ordinal>`, and nothing else. */
export const PREFILL = /^[a-z][a-z-]*-\d+$/;

/**
 * The reading of ONE open, from the frames its animation-frame loop recorded.
 *
 * `committed` is the frames that carry a prefilled name at all; `unselected`
 * is those of them whose selection does not cover the whole of it. An open is
 * BAD when `unselected` is not zero, because a person looking at the sheet in
 * that frame sees the name unselected and their next letter appends.
 *
 * A frame whose value is not a prefill is ignored on purpose: it is either the
 * previous opening's text, still in the DOM before React commits, or the
 * letter this run types at the end of an open.
 *
 * @param {{v: string|null, s: number|null, e: number|null, a: boolean}[]} frames
 */
export function readOpen(frames) {
  const committed = frames.filter((f) => typeof f.v === 'string' && PREFILL.test(f.v));
  const unselected = committed.filter((f) => f.s !== 0 || f.e !== (f.v ?? '').length);
  const names = [...new Set(committed.map((f) => f.v))];
  const last = committed.length === 0 ? null : committed[committed.length - 1];
  const first = frames.length === 0 ? null : frames[0];
  return {
    frames: frames.length,
    // Frames recorded BEFORE the prefill was committed. A run where this is
    // always zero has started sampling too late to see anything, so it is
    // published rather than discarded.
    pre: frames.length - committed.length,
    spanMs:
      first === null || typeof first.t !== 'number'
        ? null
        : Math.round((frames[frames.length - 1].t ?? 0) - first.t),
    committed: committed.length,
    unselected: unselected.length,
    bad: unselected.length > 0,
    names,
    // The selection on the FIRST frame that carried the prefill unselected,
    // which is what a person's next keystroke would have appended to.
    firstBad: unselected.length === 0 ? null : [unselected[0].s, unselected[0].e],
    // Which frame of the open that was, counted among the committed ones.
    firstBadAt: unselected.length === 0 ? null : committed.indexOf(unselected[0]),
    // The selection the open settled at. Phase 86 reported "settling at caret
    // 8", which is [8, 8] here; a selected `claude-1` is [0, 8].
    settled: last === null ? null : [last.s, last.e]
  };
}

/** Every open that carried an unselected committed frame, summarised. */
export function tally(opens) {
  const bad = opens.filter((o) => o.bad);
  return {
    opens: opens.length,
    bad: bad.length,
    committedFrames: opens.reduce((n, o) => n + o.committed, 0),
    unselectedFrames: opens.reduce((n, o) => n + o.unselected, 0),
    settledSelections: [...new Set(bad.map((o) => JSON.stringify(o.settled)))],
    firstBadSelections: [...new Set(bad.map((o) => JSON.stringify(o.firstBad)))],
    firstBadAt: [...new Set(bad.map((o) => o.firstBadAt))].sort((a, b) => a - b),
    pre: opens.reduce((n, o) => n + o.pre, 0)
  };
}

/**
 * The findings of a whole side. An open that recorded NO committed frame at
 * all is a finding of its own: it means the sheet never carried a prefilled
 * name in any painted frame, so the arm read nothing and must not pass.
 */
export function sideFindings(label, opens) {
  const out = [];
  if (opens.length === 0) return [`${label}: no open was driven at all`];
  const blind = opens.filter((o) => o.committed === 0).length;
  if (blind > 0) out.push(`${label}: ${String(blind)} of ${String(opens.length)} opens recorded no frame carrying a prefilled name, so they measured nothing`);
  const t = tally(opens);
  if (t.bad > 0) out.push(`${label}: ${String(t.bad)} of ${String(t.opens)} opens had a painted frame with the prefilled name unselected (${String(t.unselectedFrames)} frames, settled selections ${JSON.stringify(t.settledSelections)})`);
  return out;
}

/** The focus answer must be the same on both sides. */
export function focusFindings(head, parent) {
  if (parent === null) return [];
  if (head === parent) return [];
  return [`focus moved: HEAD rests on ${JSON.stringify(head)} and the parent on ${JSON.stringify(parent)}. The fix calls the same method on the same element, so this is a needs_work and not a nit`];
}

function selfTest() {
  const f = (v, s, e) => ({ v, s, e, a: true });
  const sel = (n) => f(n, 0, n.length);
  const car = (n) => f(n, n.length, n.length);
  const fixtures = [
    ['readOpen: every committed frame selected is good', () => readOpen([f('shell-1x', 8, 8), sel('shell-1'), sel('shell-1')]).bad, false],
    ['readOpen: one unselected committed frame is bad', () => readOpen([sel('shell-1'), car('shell-1')]).bad, true],
    ['readOpen: selected only from frame 3 is still bad', () => readOpen([car('shell-1'), car('shell-1'), sel('shell-1')]).unselected, 2],
    ['readOpen: no committed frame at all reads zero and settles nowhere', () => readOpen([f(null, null, null), f('shell-1x', 8, 8)]).settled, null],
    ['readOpen: the frames before the commit are counted', () => readOpen([f(null, null, null), f('shell-1x', 8, 8), sel('shell-1')]).pre, 2],
    ['readOpen: the stale value is not graded', () => readOpen([car('shell-3'), sel('claude-1')]).committed, 2],
    ['readOpen: a typed value is not a prefill', () => readOpen([f('shell-1x', 8, 8)]).committed, 0],
    ['readOpen: the settled selection is the last committed frame', () => readOpen([sel('shell-1'), car('shell-1')]).settled, [7, 7]],
    ['readOpen: a selected open settles at the whole name', () => readOpen([sel('shell-1')]).settled, [0, 7]],
    ['readOpen: a partial selection is unselected', () => readOpen([f('shell-1', 0, 5)]).unselected, 1],
    ['readOpen: the first bad frame is reported with its selection', () => readOpen([car('shell-1'), sel('shell-1')]).firstBad, [7, 7]],
    ['readOpen: and with its place among the committed frames', () => readOpen([sel('shell-1'), car('shell-1')]).firstBadAt, 1],
    ['readOpen: a clean open names no bad frame', () => readOpen([sel('shell-1')]).firstBad, null],
    ['tally: counts bad opens', () => tally([readOpen([sel('shell-1')]), readOpen([car('shell-1')])]).bad, 1],
    ['sideFindings: a clean side is silent', () => sideFindings('x', [readOpen([sel('shell-1')])]).length, 0],
    ['sideFindings: a bad open is one finding', () => sideFindings('x', [readOpen([car('shell-1')])]).length, 1],
    ['sideFindings: an open that saw nothing is a finding', () => sideFindings('x', [readOpen([f(null, null, null)])]).length, 1],
    ['sideFindings: no opens at all is a finding', () => sideFindings('x', []).length, 1],
    ['focusFindings: agreement is silent', () => focusFindings('session-name', 'session-name').length, 0],
    ['focusFindings: disagreement is one finding', () => focusFindings('session-name', 'body').length, 1],
    ['focusFindings: no parent reading asserts nothing', () => focusFindings('session-name', null).length, 0]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    const got = run();
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The socket wrapper, and the refusals.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p261', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}

const SIDE = (process.env['P261_SIDE'] ?? 'head').trim();
const OPENS = Number.parseInt(process.env['P261_OPENS'] ?? '20', 10);
const CPU = Number.parseInt(process.env['P261_CPU'] ?? '20', 10);
const SAMPLE_MS = Number.parseInt(process.env['P261_SAMPLE_MS'] ?? '500', 10);

/** The ONLY verb this file ever aims at the operator's own server. */
const operatorSessions = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_name}'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '');
const opBefore = operatorSessions();
say(`the operator's own -L gmux sessions before: ${String(opBefore.length)}`);

// ---------------------------------------------------------------------------
// The scratch world: one git project, no session, no agent.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p261'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p261'));
const home = join(root, 'h');
const profile = join(root, 'p');
const project = join(root, 'alpha');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
const git = (...a) => {
  const r = spawnSync('git', a, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
};
writeFileSync(join(project, 'notes.txt'), 'The notes begin here.\n');
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p261@example.invalid');
git('config', 'user.name', 'p261');
git('add', '.');
git('commit', '-q', '-m', 'first');

// ---------------------------------------------------------------------------
// The readers, all off the LIVE DOM.
// ---------------------------------------------------------------------------

/**
 * Install the per-frame recorder. It reads the field's value and its
 * selection on EVERY animation frame, which is the only instrument that can
 * see a frame the person could have looked at.
 */
const INSTALL = `(() => {
  window.__p261 = [];
  const tick = () => {
    const el = document.getElementById('session-name');
    const t = performance.now();
    if (el === null) window.__p261.push({ v: null, s: null, e: null, a: false, t });
    else window.__p261.push({
      v: el.value,
      s: el.selectionStart,
      e: el.selectionEnd,
      a: document.activeElement === el,
      t
    });
    window.__p261raf = window.requestAnimationFrame(tick);
  };
  window.__p261raf = window.requestAnimationFrame(tick);
  return true;
})()`;
const STOP = `(() => {
  window.cancelAnimationFrame(window.__p261raf);
  const f = window.__p261 ?? [];
  window.__p261 = [];
  return f;
})()`;
const SHEET_OPEN = `document.getElementById('session-name') !== null`;
const SHEET_SHUT = `document.getElementById('session-name') === null`;
const FOCUS_ID = `(() => {
  const a = document.activeElement;
  if (a === null) return null;
  return a.id !== '' ? a.id : a.tagName.toLowerCase();
})()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const read = (cdp, expr) => cdpEval(cdp, expr, 60000);
const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 180000);
const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try {
      v = await read(cdp, expr);
    } catch {
      v = null;
    }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(60);
  }
};

// CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8.
async function press(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', {
    type: text ? 'keyDown' : 'rawKeyDown',
    ...base,
    ...(text ? { text, unmodifiedText: text } : {})
  });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CMD_T = { key: 't', code: 'KeyT', vk: 84, modifiers: 4 };
const ESCAPE = { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 };
const LETTER_X = { key: 'x', code: 'KeyX', vk: 88, modifiers: 0, text: 'x' };

/**
 * One open: install the recorder, press the real chord, sample, type a letter
 * so the NEXT open starts from a stale value, then Escape.
 *
 * The chord is dispatched as a renderer keydown, which is where ⌘T is handled
 * (src/renderer/app/keyboard.ts). It is not a native menu accelerator, so CDP
 * reaches it.
 */
async function oneOpen(cdp) {
  await read(cdp, INSTALL);
  await press(cdp, CMD_T);
  const opened = await until(cdp, SHEET_OPEN, 15000);
  await sleep(SAMPLE_MS);
  const frames = await read(cdp, STOP);
  const focus = await read(cdp, FOCUS_ID);
  // The letter that makes the next open's DOM value differ from its prefill.
  await press(cdp, LETTER_X);
  await sleep(60);
  await press(cdp, ESCAPE);
  const shut = await until(cdp, SHEET_SHUT, 15000);
  return { opened, shut, focus, reading: readOpen(Array.isArray(frames) ? frames : []) };
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const problems = [];
const result = { side: SIDE, opens: OPENS, cpu: CPU, sampleMs: SAMPLE_MS, rates: {} };

await withElectron(
  {
    label: 'p261-cmdt',
    userDataDir: profile,
    tmuxSocket: null,
    cwd: REPO,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 30 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60000);
    say(`app window at ${url}, pid ${String(handle.appPid())}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }

      await drive(cdp, { projectPath: project });
      await sleep(1500);

      // Let agent detection settle BEFORE any open is graded. The Phase 48
      // settle hop rewrites the name while it is untouched, and a hop landing
      // inside a sampling window would be a second cause of an unselected
      // frame at the parent, which would flatter the measurement rather than
      // make it. Two throwaway opens are driven and discarded.
      for (let i = 0; i < 2; i += 1) await oneOpen(cdp);
      const warm = await oneOpen(cdp);
      say(`warmup: ${JSON.stringify(warm.reading)} focus ${JSON.stringify(warm.focus)}`);
      if (warm.opened !== true) throw new Error('⌘T did not open the sheet at all');

      for (const rate of [1, CPU]) {
        await cdp.call('Emulation.setCPUThrottlingRate', { rate });
        say(`--- CPU throttling rate ${String(rate)} ---`);
        const opens = [];
        const focuses = [];
        for (let i = 0; i < OPENS; i += 1) {
          const o = await oneOpen(cdp);
          if (o.opened !== true) problems.push(`rate ${String(rate)} open ${String(i)}: the sheet never opened`);
          if (o.shut !== true) problems.push(`rate ${String(rate)} open ${String(i)}: the sheet never shut`);
          opens.push(o.reading);
          focuses.push(o.focus);
          say(
            `rate ${String(rate)} open ${String(i + 1)}/${String(OPENS)}: ${String(o.reading.frames)} frames, ${String(o.reading.committed)} committed, ${String(o.reading.unselected)} unselected${o.reading.bad ? ` BAD settled ${JSON.stringify(o.reading.settled)}` : ''}`
          );
        }
        const t = tally(opens);
        result.rates[String(rate)] = {
          tally: t,
          focus: [...new Set(focuses)],
          opens
        };
        say(`rate ${String(rate)}: ${JSON.stringify(t)} focus ${JSON.stringify([...new Set(focuses)])}`);
        const findings = sideFindings(`rate ${String(rate)}`, opens);
        if (SIDE === 'parent') for (const f of findings) say(`parent reading: ${f}`);
        else problems.push(...findings);
      }
      await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 });
    } finally {
      try {
        await cdpEval(cdp, `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`, 30000);
      } catch {
        /* best effort; withElectron ends the tree anyway */
      }
      cdp.close();
    }
  }
);

const opAfter = operatorSessions();
result.operator = { before: opBefore.length, after: opAfter.length };
say(`the operator's own -L gmux sessions: ${String(opBefore.length)} before, ${String(opAfter.length)} after`);
if (opBefore.length !== opAfter.length) {
  const added = opAfter.filter((n) => !opBefore.includes(n));
  problems.push(`the operator's own tmux server changed under this run; new names ${JSON.stringify(added)}`);
}

writeDriveResult(`p261-cmdt-${SIDE}`, result);

const bad = Object.values(result.rates).reduce((n, r) => n + r.tally.bad, 0);
say(`${SIDE}: ${String(bad)} bad opens of ${String(OPENS * 2)} across both rates`);
if (SIDE === 'parent' && bad === 0) {
  say('INCONCLUSIVE: the parent read no unselected frame either, so this run measured no difference. The property argument and the unit test carry the change; a measured difference is NOT claimed.');
}
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say('PASS: every arm behaved.');
process.exit(0);
