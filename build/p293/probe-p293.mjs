#!/usr/bin/env node
/**
 * probe-p293.mjs. THE PHASE 293 APP RUN: the session manager, direction D, the
 * Tabbed sheet.
 *
 * ONE Electron through build/electron-run.mjs's `withElectron`, on a scratch
 * profile, a scratch HOME and the tmux socket build/harness-socket.mjs hands
 * it, over four scratch git projects it builds inside its own run directory,
 * and, for the `R` arm, the loopback scratch machine from
 * build/scratch-machine.mjs. It drives REAL pointer and key events over the
 * DevTools protocol and reads the sheet's DOM contract (build/p293/SPEC.md
 * §2.14). It spawns no agent and spends no token: every session is a shell.
 *
 * ## What the drive supplies, and nothing else
 *
 * `window.__p293` (src/renderer/app/p293-session-manager-drive.ts) does only
 * what a probe cannot do from outside: the menu door through `runMenuAction`
 * (a native menu bar item cannot be clicked from a probe), the ellipsis's
 * native menu as labels with a captured item run late, one held needs_input
 * (a shell never asks), and the set up (a folder opened, a shell created, a
 * tab closed). A native `<select>`'s popup cannot be driven either, so a
 * filter is chosen by setting the select's value and dispatching its `change`,
 * which is the event React's handler reads. Every lifecycle press is a real
 * click on the sheet.
 *
 * ## The arms (P293_ARMS, a comma separated subset; all by default)
 *
 *   1   both doors with NO project open: Manage opens Managed, Past opens Past
 *   2   a closed tab project's sessions are drawn under `Tab closed`
 *   3   End, Cancel once, then Confirm: the row reads ended and stays
 *   4   Remove to Past: the row leaves Managed and both counts move
 *   5   Restore from Past into a closed project: the inline ask, the tab
 *       opens, the row is Managed and live, and (the fix round, W1) the
 *       sheet CLOSES and the person is in the session, keyboard in its
 *       terminal, as today's Past Sessions put them there
 *   6   a restore whose folder was renamed away says so on the FIRST press
 *       (the fix round, W7: no ask promising a shell in a folder that is not
 *       there) and KEEPS its row, then Retry succeeds once the folder is back
 *   7   select-all under Running checks exactly the live rows, a second click
 *       clears
 *   8   the batch confirmation's eligible and skipped counts against the
 *       fixture's own truth
 *   9   a batch in which the probe ends one target out of band at the press:
 *       that target reads Already ended and the rest end, read from MAIN
 *   10  the matrix of §8.1 for the rows this run stands up: group against
 *       targetKey, state against statusVisual, the visible button, the
 *       checkbox, batchEligibility, and the sheet's menu against the policy's
 *       item for item
 *   11  both toolbar modes measured at 47px and the title bar at 52px
 *   12  Go to session on a live session in a closed project: the sheet closes,
 *       the tab opens, and the keyboard is in that session's terminal
 *   13  F2 on a sheet row with an active session behind: the row's rename
 *       opens and the active session's name is byte identical after
 *   14  after arm 9's batch under Running, the keyboard is inside the sheet
 *   15  the machine that comes back (§8.2's first attack): NOT DRIVEN here and
 *       said so. The spec gives it to the verifier unless the sshd restart is
 *       stable in the harness, and this run does not claim it is
 *   R   the scratch machine: one live session on it, its matrix row (the
 *       group is `<machine>:<path>`, the menu matches the policy), and Go to
 *       session on it. STATED, from the matrix verifier's P3: creating a
 *       session on a machine leaves that folder open as a tab (and main's
 *       re-home puts back a remote tab a person closed), so this Go to
 *       session lands in an OPEN tab. The remote half of §8.4's "in a closed
 *       project" is not driven here; the local half is arm 12
 *   L   (the fix round, W1) Restore from Past into a project that is open but
 *       NOT the active one: the sheet closes, that project is switched to,
 *       the session selected and the keyboard in its terminal
 *   O   (the fix round, W3) Session → Past Sessions… with the Catch Me Up page
 *       open draws the sheet OVER the page; Escape closes the sheet and the
 *       page is still there
 *   J   (the fix round, W6) ⌘J with the sheet open closes the sheet FIRST and
 *       opens the list over the app; nothing is stacked on the sheet
 *   D   (the fix round, the batch attack's P1) a DOUBLE click at the centre of
 *       `End 2 sessions`, whose panel closes by itself and slides an ended
 *       row's Restore under the pointer: the second click restores nothing
 *
 * Arms 9 and 14 are one batch and run together; 12 closes the sheet and the
 * run reopens it. Arms that depend on another's state (4 on 3, 8 on 3) are
 * satisfied by the set up whichever subset is chosen.
 *
 * ## What it refuses
 *
 *   - No `GMUX_TMUX_SOCKET`, or the socket `gmux` or `default`, by name.
 *   - No `GMUX_HARNESS_DIR`.
 *   - `out/main/index.js` missing, or any session manager source newer than
 *     the newest bundle under out/renderer/assets: "build first", exit 2,
 *     before anything is launched.
 *   - An unknown arm name.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET   the scratch socket; build/harness-socket.mjs sets it
 *   GMUX_HARNESS_DIR   the scratch directory; the same wrapper sets it
 *   P293_ARMS          a subset of 1..15,R. All by default
 *   P293_OUT_DIR       where the readings go. Default out/p293
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p293                                   build, then every arm
 *   node build/harness-socket.mjs --fresh gmux-p293 'P293_ARMS=1,2,3 node build/p293/probe-p293.mjs'
 *   node build/p293/probe-p293.mjs --self-test           the graders, nothing launched
 *
 * ## SAFETY
 *
 * The Electron is started through `withElectron`, which ends the tree it
 * started, and the scratch tmux server it was handed, in a `finally` whatever
 * happened. The scratch machine's sshd, agent and tmux server are started by
 * build/scratch-machine.mjs, every pid recorded as it starts, and stopped in
 * this file's own `finally` by `machine.stop()` and the recorded pids alone.
 * Every ssh goes through build/ssh-run.mjs. Every other process is a
 * synchronous git that has exited before its call returns. Exit 0 with no
 * finding, 1 with findings, 2 on a refusal.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { refuseRealSockets, scratchMachine, scratchYard } from '../scratch-machine.mjs';
import { keyscanText } from '../ssh-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p293]';
const CALLER = 'build/p293/probe-p293.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers the sheet is held to, BY VALUE from the spec (§2.2), so a wrong
// constant in the stylesheet cannot agree with itself here.
// ---------------------------------------------------------------------------
const TOOLBAR_H = 47;
const TITLE_H = 52;
const TOL = 0.5;
export const ALL_ARMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', 'R', 'L', 'O', 'J', 'D'];

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/** Arm 1. The sheet is drawn, on the tab the door named. */
export function doorFindings(label, s, wantTab) {
  const out = [];
  if (!s.sheet) out.push(`${label}: no .modal.session-sheet is drawn`);
  else if (s.tab !== `sm-tab-${wantTab}`) out.push(`${label}: the selected tab is ${String(s.tab)}, want sm-tab-${wantTab}`);
  if (s.store.projects.length !== 0) out.push(`${label}: ${String(s.store.projects.length)} project(s) are open, so this is not the no-project door`);
  return out;
}

/** Arm 11. Both toolbar modes at 47px and the title bar at 52px. */
export function geometryFindings(filters, selection) {
  const out = [];
  const near = (a, b) => typeof a === 'number' && Math.abs(a - b) <= TOL;
  if (filters.toolbar.mode !== 'filters') out.push(`11 the toolbar reads mode ${String(filters.toolbar.mode)} with nothing checked, want filters`);
  if (!near(filters.toolbar.height, TOOLBAR_H)) out.push(`11 the filters toolbar is ${String(filters.toolbar.height)}px, want ${String(TOOLBAR_H)}`);
  if (selection.toolbar.mode !== 'selection') out.push(`11 the toolbar reads mode ${String(selection.toolbar.mode)} with a row checked, want selection`);
  if (!near(selection.toolbar.height, TOOLBAR_H)) out.push(`11 the selection toolbar is ${String(selection.toolbar.height)}px, want ${String(TOOLBAR_H)}`);
  if (!near(filters.titleHeight, TITLE_H)) out.push(`11 the title bar is ${String(filters.titleHeight)}px, want ${String(TITLE_H)}`);
  return out;
}

/** Arm 7. The ids checked after each click, against the live rows the filter leaves. */
export function selectAllFindings(liveIds, afterFirst, afterSecond) {
  const out = [];
  const a = [...afterFirst].sort();
  const want = [...liveIds].sort();
  if (J(a) !== J(want)) out.push(`7 the first select-all click checked ${J(a)}, want exactly the live rows ${J(want)}`);
  if (afterSecond.length !== 0) out.push(`7 the second click left ${J(afterSecond)} checked, want none`);
  return out;
}

/** Arm 8. The confirmation names n and counts the rest by reason. */
export function batchCountFindings(label, batch, wantNamed, wantSkipped) {
  const out = [];
  if (batch === null) return [`${label}: no batch confirmation is drawn`];
  if (batch.phase !== 'confirm') out.push(`${label}: the batch reads phase ${String(batch.phase)}, want confirm`);
  const ids = batch.targets.map((t) => t.id).sort();
  if (J(ids) !== J([...wantNamed].sort())) out.push(`${label}: the confirmation names ${J(ids)}, want ${J([...wantNamed].sort())}`);
  const n = wantNamed.length;
  const heading = `End ${String(n)} running session${n === 1 ? '' : 's'}?`;
  if (batch.heading !== heading) out.push(`${label}: the heading reads ${J(batch.heading)}, want ${J(heading)}`);
  if (wantSkipped === null) {
    if (batch.skipped !== null) out.push(`${label}: a skipped line is drawn (${J(batch.skipped)}) with nothing skipped`);
  } else if (batch.skipped === null || !batch.skipped.includes(wantSkipped)) {
    out.push(`${label}: the skipped line reads ${J(batch.skipped)}, want it to say ${J(wantSkipped)}`);
  }
  return out;
}

/**
 * Arm 10. One matrix line. The sheet's menu, less its own rows, must equal the
 * policy's item for item in label and in `disabled`.
 */
export function matrixFindings(row) {
  const out = [];
  const at = `10 ${row.tab} ${row.id} (${row.status}${row.machineId ? ` on ${row.machineId}` : ''})`;
  if (row.groupDrawn !== row.groupWant) out.push(`${at}: drawn under ${J(row.groupDrawn)}, its target key is ${J(row.groupWant)}`);
  if (row.tab === 'managed' && row.stateDrawn !== row.stateWant) out.push(`${at}: the state reads ${J(row.stateDrawn)}, statusVisual says ${J(row.stateWant)}`);
  if (row.tab === 'managed' && !row.checkbox) out.push(`${at}: no checkbox is drawn`);
  if (row.tab === 'past' && row.checkbox) out.push(`${at}: a checkbox is drawn on the Past tab`);
  const live = ['running', 'idle', 'needs_input'].includes(row.status);
  const p = row.primary;
  if (p === null) out.push(`${at}: no visible button`);
  else if (row.tab === 'managed' && live && !(p.verb === 'end' && p.disabled === false)) out.push(`${at}: the visible button is ${J(p)}, want End enabled`);
  else if (row.status === 'unknown' && !(p.verb === 'end' && p.disabled === true)) out.push(`${at}: the visible button is ${J(p)}, want End disabled`);
  else if (!live && row.status !== 'unknown' && p.verb !== 'restore') out.push(`${at}: the visible button is ${J(p)}, want Restore`);
  if (row.tab === 'managed') {
    const want = live ? (row.eligibilityWant ?? 'yes') : row.status === 'unknown' ? 'unreachable' : 'ended';
    if (row.eligibility !== want) out.push(`${at}: batchEligibility ${J(row.eligibility)}, want ${J(want)}`);
  }
  if (J(row.menuSheet) !== J(row.menuPolicy)) {
    out.push(`${at}: the sheet's menu ${J(row.menuSheet)} is not the policy's ${J(row.menuPolicy)}`);
  }
  return out;
}

/** The session manager sources the drawn sheet is built from. */
export const SHEET_SOURCES = [
  'src/renderer/session-manager',
  'src/renderer/app/p293-session-manager-drive.ts',
  'src/renderer/app/probe-registry.ts',
  'src/renderer/app/session-actions.tsx',
  'src/renderer/state/session-manager-slice.ts',
  'src/renderer/state/sessions-slice.ts'
];

export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/renderer/assets holds no index-*.js; build first.';
  const newer = sources.filter(([, mtime]) => mtime > bundle[1]).map(([path]) => path);
  return newer.length === 0 ? null : `out/ is older than ${newer.join(', ')}; build first.`;
}

function readStaleness(checkoutDir) {
  const sources = [];
  for (const rel of SHEET_SOURCES) {
    const path = join(checkoutDir, rel);
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path)) {
        if (/\.(tsx?|css)$/.test(name)) sources.push([join(rel, name), statSync(join(path, name)).mtimeMs]);
      }
    } else {
      sources.push([rel, statSync(path).mtimeMs]);
    }
  }
  const assets = join(checkoutDir, 'out', 'renderer', 'assets');
  let bundle = null;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^index-[^.]+\.js$/.test(name)) continue;
      const mtime = statSync(join(assets, name)).mtimeMs;
      if (bundle === null || mtime > bundle[1]) bundle = [name, mtime];
    }
  }
  return staleSentence(sources, bundle);
}

function selfTest() {
  const store = { projects: [], sessions: [], past: [], toasts: [] };
  const st = (over) => ({ sheet: true, tab: 'sm-tab-managed', store, toolbar: { mode: 'filters', height: 47 }, titleHeight: 52, ...over });
  const batch = (over) => ({ phase: 'confirm', heading: 'End 2 running sessions?', targets: [{ id: 'a' }, { id: 'b' }], skipped: '1 selected session stays unchanged: 1 already ended', confirmDisabled: false, ...over });
  const mrow = (over) => ({ id: 'x', tab: 'managed', status: 'idle', machineId: null, groupDrawn: '/w/a', groupWant: '/w/a', stateDrawn: 'idle', stateWant: 'idle', primary: { verb: 'end', disabled: false, title: null, text: 'End session…' }, checkbox: true, eligibility: 'yes', menuSheet: [{ label: 'Rename', disabled: false }], menuPolicy: [{ label: 'Rename', disabled: false }], ...over });
  const count = (l) => l.length;
  const fixtures = [
    ['1 the door opened on the tab it named', () => doorFindings('1', st({}), 'managed'), []],
    ['1 the wrong tab is named', () => count(doorFindings('1', st({ tab: 'sm-tab-managed' }), 'past')), 1],
    ['1 no sheet is a finding', () => count(doorFindings('1', st({ sheet: false }), 'managed')), 1],
    ['1 an open project is not the no-project door', () => count(doorFindings('1', st({ store: { ...store, projects: [{ id: 'p' }] } }), 'managed')), 1],
    ['11 both modes at 47 and the title at 52', () => geometryFindings(st({}), st({ toolbar: { mode: 'selection', height: 47 } })), []],
    ['11 the study\'s 45px arithmetic is caught', () => count(geometryFindings(st({}), st({ toolbar: { mode: 'selection', height: 45 } }))), 1],
    ['11 a 20px title is caught', () => count(geometryFindings(st({ titleHeight: 20 }), st({ toolbar: { mode: 'selection', height: 47 } }))), 1],
    ['7 exactly the live rows, then none', () => selectAllFindings(['a', 'b'], ['b', 'a'], []), []],
    ['7 an ended row checked by select-all is caught', () => count(selectAllFindings(['a'], ['a', 'e'], [])), 1],
    ['7 a second click that keeps a row is caught', () => count(selectAllFindings(['a'], ['a'], ['a'])), 1],
    ['8 two named, one already ended', () => batchCountFindings('8', batch({}), ['a', 'b'], '1 already ended'), []],
    ['8 the heading counts what is named', () => count(batchCountFindings('8', batch({ heading: 'End 3 running sessions?' }), ['a', 'b'], '1 already ended')), 1],
    ['8 one named is singular', () => batchCountFindings('8', batch({ heading: 'End 1 running session?', targets: [{ id: 'a' }], skipped: null }), ['a'], null), []],
    ['8 an extra named id is caught', () => count(batchCountFindings('8', batch({}), ['a'], '1 already ended')) >= 1, true],
    ['8 no panel is a finding', () => count(batchCountFindings('8', null, ['a'], null)), 1],
    ['10 a clean row', () => matrixFindings(mrow({})), []],
    ['10 a split group is caught', () => count(matrixFindings(mrow({ groupDrawn: 'app' }))), 1],
    ['10 a menu that differs from the policy is caught', () => count(matrixFindings(mrow({ menuSheet: [] }))), 1],
    ['10 an unknown row with End enabled is caught', () => count(matrixFindings(mrow({ status: 'unknown', stateWant: 'idle', eligibility: 'unreachable' }))), 1],
    ['10 an ended row whose button says End is caught', () => count(matrixFindings(mrow({ status: 'exited', eligibility: 'ended' }))), 1],
    ['10 a Past row with a checkbox is caught', () => count(matrixFindings(mrow({ tab: 'past', status: 'discarded', primary: { verb: 'restore', disabled: false, title: null, text: 'Restore' } }))), 1],
    ['arms: empty means all', () => chooseArms('').arms.length, ALL_ARMS.length],
    ['arms: a subset keeps the file\'s order', () => chooseArms('r, 3, 1'), { arms: ['1', '3', 'R'], bad: [] }],
    ['arms: an unknown name is named', () => chooseArms('1,z'), { arms: ['1'], bad: ['Z'] }],
    ['stale: a source newer than the build is refused', () => staleSentence([['a.ts', 3000]], ['index-x.js', 2000]), 'out/ is older than a.ts; build first.'],
    ['stale: a build newer than every source is measured', () => staleSentence([['a.ts', 1000]], ['index-x.js', 2000]), null],
    ['stale: no bundle is a refusal', () => staleSentence([['a.ts', 1000]], null), 'out/renderer/assets holds no index-*.js; build first.']
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)} want ${J(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p293`, which wraps this file in build/harness-socket.mjs.');
refuseRealSockets(socket, 'p293');
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run it through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('out/main/index.js is missing. Build first.');
{
  const stale = readStaleness(REPO);
  if (stale !== null) refuse(stale);
}
const { arms: chosen, bad: badArms } = chooseArms(process.env['P293_ARMS']);
if (badArms.length > 0) refuse(`P293_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
const outDir = resolve(REPO, (process.env['P293_OUT_DIR'] ?? '').trim() || join('out', 'p293'));
mkdirSync(outDir, { recursive: true });
const on = (arm) => chosen.includes(arm);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p293'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p293'));
const home = join(root, 'h');
const profile = join(root, 'profile');
const configDir = join(profile, 'gmux', 'config');
const P = { alpha: join(root, 'alpha'), beta: join(root, 'beta'), gamma: join(root, 'gamma'), delta: join(root, 'delta'), far: join(root, 'far'), dbl: join(root, 'dbl') };
for (const d of [home, profile, ...Object.values(P)]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
mkdirSync(configDir, { recursive: true });
writeFileSync(join(home, '.zshrc'), "PS1='p293 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
for (const [name, dir] of Object.entries(P)) {
  writeFileSync(join(dir, 'README.md'), `# ${name}\n`);
  const git = (...a) => {
    const r = spawnSync('git', ['-C', dir, ...a], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
    });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')} in ${name}: ${r.stderr}`);
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'p293@example.invalid');
  git('config', 'user.name', 'p293');
  git('config', 'commit.gpgsign', 'false');
  git('add', '.');
  git('commit', '-q', '-m', 'first');
}

// The scratch machine, only when the R arm is chosen. Every pid is recorded
// as it starts and only recorded pids are ever signalled.
const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};
let machine = null;
let yard = null;
const MACHINE_ID = 'p293';
if (on('R')) {
  yard = scratchYard({ root, prefix: 'p293', record });
  if (yard.authSock === '') refuse('no ssh agent holds this run\'s key, so nothing could sign in to the scratch machine.');
  machine = scratchMachine(yard, { id: 'one', port: 41_000 + (process.pid % 2000) });
}

// ---------------------------------------------------------------------------
// The DevTools side
// ---------------------------------------------------------------------------
async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
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
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.__p293 === 'object' ? location.href : null`, 5000);
          if (typeof a === 'string') return cdp;
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already closed */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying window.__p293');
    await sleep(250);
  }
}

const KEYS = { Tab: [9, 'Tab'], Escape: [27, 'Escape'], Enter: [13, 'Enter'], F2: [113, 'F2'], j: [74, 'KeyJ'] };
/** A REAL key, down and up, to whatever holds the keyboard. `modifiers` 4 is ⌘. */
async function pressKey(cdp, name, modifiers = 0) {
  const [vk, code] = KEYS[name];
  const base = { key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  const text = name === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {};
  await cdp.call('Input.dispatchKeyEvent', { type: name === 'Enter' ? 'keyDown' : 'rawKeyDown', ...base, ...text });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(150);
}
/** Lowercase letters, one real key each, carrying their text. */
async function typeText(cdp, text) {
  for (const ch of text) {
    const vk = ch.toUpperCase().charCodeAt(0);
    const base = { key: ch, code: `Key${ch.toUpperCase()}`, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, ...base });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  await sleep(120);
}
/** A REAL click at the centre of the first element a selector names. */
async function click(cdp, selector, settleMs = 250) {
  const box = await cdpEval(
    cdp,
    `(() => { const el = document.querySelector(${J(selector)}); if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.left + b.width / 2, y: b.top + b.height / 2, disabled: el.disabled === true } : null; })()`,
    10_000
  );
  if (box === null) return { ok: false, why: `nothing drawn at ${selector}` };
  if (box.disabled) return { ok: false, why: `${selector} is disabled` };
  const m = (type, extra) => cdp.call('Input.dispatchMouseEvent', { type, x: Math.round(box.x), y: Math.round(box.y), ...extra });
  await m('mouseMoved', { button: 'none', buttons: 0 });
  await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
  await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
  if (settleMs > 0) await sleep(settleMs);
  return { ok: true, why: '' };
}
/** A native select's value, chosen the one way a probe can, and its change dispatched. */
const choose = (cdp, selector, value) =>
  cdpEval(
    cdp,
    `(() => { const el = document.querySelector(${J(selector)}); if (!el) return false; el.value = ${J(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value === ${J(value)}; })()`,
    10_000
  );
const d = (cdp, call) => cdpEval(cdp, `window.__p293.${call}`, 120_000);
const state = (cdp) => d(cdp, 'state()');
/** Poll the drive's state until a predicate holds, and answer the last state read. */
async function until(cdp, pred, timeoutMs = 10_000) {
  const started = Date.now();
  let s = await state(cdp);
  while (!pred(s)) {
    if (Date.now() - started > timeoutMs) return { s, ok: false };
    await sleep(150);
    s = await state(cdp);
  }
  return { s, ok: true };
}
const rowIn = (s, id) => s.rows.find((r) => r.id === id);
const checkedIds = (s) => s.rows.filter((r) => r.checked).map((r) => r.id);
const LIVE = new Set(['running', 'idle', 'needs_input']);

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
const findings = Object.fromEntries([...ALL_ARMS, 'RUN'].map((a) => [a, []]));
const readings = { socket, arms: chosen, notes: [], matrix: [], main: {} };
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};
const f = (arm, text) => {
  findings[arm].push(text);
  say(`FINDING ${arm}: ${text}`);
};
findings['15'].push('NOT DRIVEN: the machine that comes back (SPEC §8.2) is the verifier\'s, because this run does not claim the scratch sshd restarts stably inside the harness. Stated, never a pass.');
class Refusal extends Error {}

let refused = null;
let runError = null;
try {
  if (machine !== null) {
    if (!machine.start()) throw new Refusal(`the scratch sshd did not answer on ${String(machine.port)}`);
    if (!machine.isolated()) throw new Refusal('the scratch machine shares this Mac\'s tmux server');
    const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(knownMachines), { recursive: true });
    writeFileSync(knownMachines, keyscanText({ host: '127.0.0.1', port: machine.port, caller: CALLER }), 'utf8');
    writeFileSync(
      join(configDir, 'machines.json'),
      `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p293 loopback', color: 'blue', host: '127.0.0.1', user: yard.user, port: machine.port, remoteTmuxPath: yard.tmuxPath }] })}\n`,
      'utf8'
    );
    say(`scratch machine on 127.0.0.1:${String(machine.port)}`);
  }
  await withElectron(
    {
      label: 'p293',
      userDataDir: profile,
      tmuxSocket: socket,
      cwd: REPO,
      args: [
        '--remote-debugging-port=0',
        '--use-mock-keychain',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        GMUX_CONFIG_ROOT: configDir,
        GMUX_SPECSTORY_NO_CLOUD: '1',
        ...(yard !== null ? { SSH_AUTH_SOCK: yard.authSock } : {})
      }),
      graceMs: 10_000,
      ceilingMs: 4 * 60 * 1000
    },
    async (handle) => {
      const cdp = await cdpForAppWindow(profile, 60_000);
      say(`app window up, pid ${String(handle.appPid())}`);
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        await drive(cdp);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        runError = err instanceof Error ? err.message : String(err);
      } finally {
        cdp.close();
      }
    }
  );
} catch (err) {
  if (err instanceof Refusal) refused = err.message;
  else runError = runError ?? (err instanceof Error ? err.message : String(err));
} finally {
  // The scratch machine: its sshd, its agent and its tmux server, by the pids
  // this run recorded and by nothing else.
  if (machine !== null) {
    try {
      const serverPid = machine.serverPid(socket);
      if (serverPid !== null) record(serverPid);
    } catch {
      /* nothing answered */
    }
    try {
      machine.stop();
    } catch {
      /* already down */
    }
    for (const pid of recordedPids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    try {
      machine.cleanup();
    } catch {
      /* nothing to remove */
    }
  }
}
if (refused !== null) refuse(refused);
if (runError !== null) findings.RUN.push(`the run stopped ${runError}`);

// ---------------------------------------------------------------------------
// The drive, in one app session
// ---------------------------------------------------------------------------
async function drive(cdp) {
  let stage = 'setup';
  const ids = {};
  try {
    // ------------------------------------------------------------------ 1
    if (on('1')) {
      stage = '1';
      let s = await d(cdp, "open('managed')");
      findings['1'].push(...doorFindings('1 Manage Sessions…', s, 'managed'));
      const closed = await click(cdp, '.session-sheet [aria-label="Close session manager"]');
      if (!closed.ok) f('1', `the close button: ${closed.why}`);
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('1', 'the close button left the sheet open');
      s = await d(cdp, "open('past')");
      findings['1'].push(...doorFindings('1 Past Sessions…', s, 'past'));
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('1', 'Escape left the sheet open with nothing else in it');
    }

    // --------------------------------------------------------------- set up
    stage = 'setup';
    await d(cdp, `addProject(${J(P.alpha)})`);
    ids.a1 = await d(cdp, `createSession(${J({ path: P.alpha, name: 'p293-a1' })})`);
    ids.a2 = await d(cdp, `createSession(${J({ path: P.alpha, name: 'p293-a2' })})`);
    for (const [key, dir, names] of [
      ['beta', P.beta, ['b1', 'b2', 'b3']],
      ['gamma', P.gamma, ['g1']],
      ['delta', P.delta, ['d1']]
    ]) {
      await d(cdp, `addProject(${J(dir)})`);
      for (const n of names) ids[n] = await d(cdp, `createSession(${J({ path: dir, name: `p293-${n}` })})`);
      if (!(await d(cdp, `closeTab(${J(dir)})`))) f('RUN', `the ${key} tab did not close`);
    }
    if (Object.values(ids).some((v) => typeof v !== 'string')) throw new Error(`a session was not created: ${J(ids)}`);
    // Main's own list is the truth each session is live in before any arm.
    const live = await until(cdp, (x) => Object.values(ids).every((id) => x.store.sessions.some((one) => one.id === id && LIVE.has(one.status))), 20_000);
    if (!live.ok) throw new Error(`the sessions did not all read live: ${J(live.s.store.sessions)}`);
    // ONE held status, the only one this run supplies (§8.1).
    if (!(await d(cdp, `hold(${J(ids.b2)})`))) f('10', 'the needs_input hold did not take');
    say(`set up: alpha open with a1 a2; beta, gamma and delta closed; ${String(Object.keys(ids).length)} shells; b2 held at needs_input`);

    // ------------------------------------------------------------------ R
    if (on('R') && machine !== null) {
      stage = 'R';
      const rows = await cdpEval(cdp, 'window.gmux.machines.reload().then(() => window.gmux.machines.rows())', 60_000);
      const row = (rows?.rows ?? []).find((r) => r.id === MACHINE_ID);
      if (row === undefined) throw new Error(`the machine row was not read: ${J(rows?.errors ?? rows)}`);
      const confirmed = await cdpEval(cdp, `window.gmux.machines.confirm(${J({ id: MACHINE_ID, hashRead: row.hash, linesRead: row.lines })})`, 60_000);
      if (confirmed?.state !== 'confirmed') throw new Error(`the machine is ${String(confirmed?.state)}, not confirmed`);
      let prep = await cdpEval(cdp, `window.gmux.machines.prepare(${J(MACHINE_ID)})`, 90_000);
      if (prep?.class === 'version-unmeasured' && prep?.acceptSheet != null) {
        await cdpEval(cdp, `window.gmux.machines.acceptVersion(${J({ id: MACHINE_ID, version: prep.version, hashRead: prep.acceptSheet.hash, linesRead: prep.acceptSheet.lines })})`, 60_000);
        prep = await cdpEval(cdp, `window.gmux.machines.prepare(${J(MACHINE_ID)})`, 90_000);
      }
      if (prep?.class !== 'prepared') throw new Error(`prepare said ${String(prep?.class)}: ${String(prep?.detail)}`);
      ids.r1 = await d(cdp, `createSession(${J({ path: P.far, name: 'p293-r1', machineId: MACHINE_ID })})`);
      const r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.r1 && LIVE.has(one.status) && one.machineId === MACHINE_ID), 20_000);
      if (!r.ok) f('R', `the remote session did not read live on ${MACHINE_ID}: ${J(r.s.store.sessions.find((one) => one.id === ids.r1))}`);
      else say(`R: one live shell on the scratch machine in ${P.far}; its tab ${r.s.store.projects.some((p) => p.path === P.far && p.machineId === MACHINE_ID) ? 'is OPEN (creating it opened one)' : 'is not open'}`);
    }

    let s = await d(cdp, "open('managed')");
    if (!s.sheet) throw new Error('the manager did not open for the arms');

    // ------------------------------------------------------------------ 2
    if (on('2')) {
      stage = '2';
      await choose(cdp, '#sm-filter-tab', 'closed');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => r.tabOpen === 'no'), 5000));
      const drawn = s.rows.map((r) => r.id);
      for (const k of ['b1', 'b2', 'b3', 'g1', 'd1']) if (!drawn.includes(ids[k])) f('2', `${k}, in a closed project, is not drawn under Tab closed`);
      for (const k of ['a1', 'a2']) if (drawn.includes(ids[k])) f('2', `${k}, in the open project, is drawn under Tab closed`);
      for (const r of s.rows) if (r.tabOpen !== 'no') f('2', `${r.id} is drawn under a group reading tab-open ${String(r.tabOpen)}`);
      await choose(cdp, '#sm-filter-tab', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a1), 5000);
    }

    // ------------------------------------------------------------------ 11
    if (on('11')) {
      stage = '11';
      const filters = await state(cdp);
      const c = await click(cdp, `[data-manage-check="${ids.a1}"]`);
      if (!c.ok) f('11', `a1's checkbox: ${c.why}`);
      const { s: selection } = await until(cdp, (x) => x.toolbar.mode === 'selection', 3000);
      findings['11'].push(...geometryFindings(filters, selection));
      readings.geometry = { filters: { toolbar: filters.toolbar, title: filters.titleHeight }, selection: selection.toolbar };
      say(`11: toolbar ${String(filters.toolbar.height)}px filters, ${String(selection.toolbar.height)}px selection; title ${String(filters.titleHeight)}px`);
      await click(cdp, `[data-manage-check="${ids.a1}"]`);
      await until(cdp, (x) => x.toolbar.mode === 'filters', 3000);
    }

    // ------------------------------------------------------------------ 10
    if (on('10') || on('R')) {
      stage = '10';
      s = await state(cdp);
      const rows = await d(cdp, 'matrix()');
      for (const row of rows) {
        if (row.tab !== 'managed' || !s.rows.some((r) => r.id === row.id)) continue;
        readings.matrix.push(row);
        const arm = row.machineId !== null ? 'R' : '10';
        if (on(arm)) findings[arm].push(...matrixFindings(row));
      }
      say(`10: ${String(readings.matrix.length)} Managed row(s) graded: ${readings.matrix.map((r) => `${r.status}${r.machineId ? '@' + r.machineId : ''}`).join(', ')}`);
    }

    // ------------------------------------------------------------------ 13
    if (on('13')) {
      stage = '13';
      const before = await state(cdp);
      const active = before.store.sessions.find((one) => one.id === before.store.activeSessionId);
      if (active === undefined) f('13', 'no active session is behind the sheet, so F2 has nothing to reach');
      const focused = await cdpEval(cdp, `(() => { const el = document.querySelector('[data-manage-name="${ids.b1}"]'); if (!el) return false; el.focus(); return document.activeElement === el; })()`);
      if (!focused) f('13', 'b1\'s name button would not take the keyboard');
      await pressKey(cdp, 'F2');
      const opened = await until(cdp, (x) => x.inline?.id === ids.b1 && x.inline?.kind === 'rename', 3000);
      if (!opened.ok) f('13', `F2 on b1 opened ${J(opened.s.inline)}, want b1's rename`);
      if (opened.s.store.renamingSessionId !== null) f('13', `F2 renamed the session BEHIND the sheet: renamingSessionId ${String(opened.s.store.renamingSessionId)}`);
      await typeText(cdp, 'zz');
      await pressKey(cdp, 'Enter');
      const renamed = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.b1 && one.name === 'zz'), 5000);
      if (!renamed.ok) f('13', `b1 was not renamed to zz: ${J(renamed.s.store.sessions.find((one) => one.id === ids.b1))}`);
      const after = renamed.s.store.sessions.find((one) => one.id === active?.id);
      if (active !== undefined && after?.name !== active.name) f('13', `the active session's name moved from ${J(active.name)} to ${J(after?.name)}`);
      say(`13: F2 renamed b1 to ${J(renamed.s.store.sessions.find((one) => one.id === ids.b1)?.name)}; the active session reads ${J(after?.name)}`);
    }

    // ------------------------------------------------------------------ 3
    const endRow = async (arm, key, cancelFirst) => {
      const id = ids[key];
      let c = await click(cdp, `[data-manage-primary="${id}"][data-verb="end"]`);
      if (!c.ok) return f(arm, `${key}'s End: ${c.why}`);
      let r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'end', 3000);
      if (!r.ok) return f(arm, `End on ${key} opened ${J(r.s.inline)}`);
      if (cancelFirst) {
        c = await click(cdp, `[data-manage-inline="${id}"] .sm-inline-actions .btn-secondary`);
        if (!c.ok) return f(arm, `Cancel: ${c.why}`);
        r = await until(cdp, (x) => x.inline === null, 3000);
        if (!r.ok) f(arm, 'Cancel left the panel open');
        if (!LIVE.has(rowIn(r.s, id)?.status ?? '')) f(arm, `Cancel ended ${key}: it reads ${String(rowIn(r.s, id)?.status)}`);
        c = await click(cdp, `[data-manage-primary="${id}"][data-verb="end"]`);
        r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'end', 3000);
        if (!c.ok || !r.ok) return f(arm, `End on ${key} did not open again after Cancel`);
      }
      c = await click(cdp, '[data-sm-confirm="end"]');
      if (!c.ok) return f(arm, `Confirm: ${c.why}`);
      r = await until(cdp, (x) => ['exited', 'restorable'].includes(rowIn(x, id)?.status ?? '') && x.inline === null, 10_000);
      if (!r.ok) return f(arm, `${key} after Confirm: row ${J(rowIn(r.s, id))}, panel ${J(r.s.inline)}`);
      return null;
    };
    if (on('3') || on('4') || on('8')) {
      stage = '3';
      await endRow('3', 'a2', true);
      if (on('3')) say(`3: a2 ended through Cancel then Confirm, and its row reads ${String(rowIn(await state(cdp), ids.a2)?.status)}`);
    }

    // ------------------------------------------------------------------ 7
    if (on('7')) {
      stage = '7';
      await choose(cdp, '#sm-filter-state', 'running');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => LIVE.has(r.status ?? '')), 5000));
      const liveIds = s.rows.map((r) => r.id);
      let c = await click(cdp, '#sm-select-all');
      if (!c.ok) f('7', `select-all: ${c.why}`);
      const first = checkedIds((await until(cdp, (x) => checkedIds(x).length > 0, 3000)).s);
      c = await click(cdp, '#sm-select-all');
      const second = checkedIds((await until(cdp, (x) => checkedIds(x).length === 0, 3000)).s);
      findings['7'].push(...selectAllFindings(liveIds, first, second));
      say(`7: select-all under Running checked ${String(first.length)} of ${String(liveIds.length)} live rows, the second click left ${String(second.length)}`);
      await choose(cdp, '#sm-filter-state', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a2), 5000);
    }

    // ------------------------------------------------------------------ 8
    if (on('8')) {
      stage = '8';
      for (const k of ['a1', 'b1', 'a2']) await click(cdp, `[data-manage-check="${ids[k]}"]`);
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch !== null, 3000));
      findings['8'].push(...batchCountFindings('8', s.batch, [ids.a1, ids.b1], '1 already ended'));
      say(`8: ${J(s.batch?.heading)} / ${J(s.batch?.skipped)}`);
      await click(cdp, '[aria-label="Cancel ending selected sessions"]');
      ({ s } = await until(cdp, (x) => x.batch === null, 3000));
      if (s.batch !== null) f('8', 'the confirmation did not close on Cancel');
      if (checkedIds(s).length !== 3) f('8', `Cancel kept ${J(checkedIds(s))} checked, want the three it had`);
      await click(cdp, '[aria-label="Clear selection"]');
      await until(cdp, (x) => checkedIds(x).length === 0, 3000);
    }

    // ------------------------------------------------------------------ 4
    const removeRow = async (arm, key) => {
      const id = ids[key];
      const items = await d(cdp, `menuItemsFor(${J(id)})`);
      const remove = items.find((i) => i.label === 'Remove');
      if (remove === undefined || remove.disabled) return f(arm, `${key}'s menu offers ${J(remove ?? null)} for Remove`);
      if (!(await d(cdp, `runMenuItem(${J(id)}, 'Remove')`))) return f(arm, 'the Remove item did not run');
      let r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'remove', 3000);
      if (!r.ok) return f(arm, `Remove on ${key} opened ${J(r.s.inline)}`);
      const c = await click(cdp, '[data-sm-confirm="remove"]');
      if (!c.ok) return f(arm, `Confirm Remove: ${c.why}`);
      r = await until(cdp, (x) => !x.rows.some((one) => one.id === id) && x.store.past.includes(id), 10_000);
      if (!r.ok) return f(arm, `${key} did not leave Managed for Past`);
      return null;
    };
    if (on('4')) {
      stage = '4';
      const before = await state(cdp);
      await removeRow('4', 'a2');
      const after = (await until(cdp, (x) => x.counts.past !== before.counts.past, 3000)).s;
      if (Number(after.counts.managed) !== Number(before.counts.managed) - 1) f('4', `the Managed count read ${String(before.counts.managed)} then ${String(after.counts.managed)}`);
      if (Number(after.counts.past) !== Number(before.counts.past) + 1) f('4', `the Past count read ${String(before.counts.past)} then ${String(after.counts.past)}`);
      say(`4: counts Managed ${String(before.counts.managed)} to ${String(after.counts.managed)}, Past ${String(before.counts.past)} to ${String(after.counts.past)}`);
      // The Past rows of the matrix, now that one exists: its group, its
      // visible Restore, no checkbox, and its menu against the policy's.
      if (on('10')) {
        await click(cdp, '#sm-tab-past');
        const past = await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.a2), 5000);
        const drawnPast = new Set(past.s.rows.map((r) => r.id));
        for (const row of await d(cdp, 'matrix()')) {
          if (row.tab !== 'past' || !drawnPast.has(row.id)) continue;
          readings.matrix.push(row);
          findings['10'].push(...matrixFindings(row));
        }
        await click(cdp, '#sm-tab-managed');
        await until(cdp, (x) => x.tab === 'sm-tab-managed', 3000);
      }
    }

    // ------------------------------------------------------------------ 5
    if (on('5')) {
      stage = '5';
      await endRow('5', 'b3', false);
      await removeRow('5', 'b3');
      await click(cdp, '#sm-tab-past');
      await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.b3), 5000);
      let c = await click(cdp, `[data-manage-primary="${ids.b3}"]`);
      if (!c.ok) f('5', `b3's Restore: ${c.why}`);
      let r = await until(cdp, (x) => x.inline?.kind === 'restore-open', 3000);
      if (!r.ok) f('5', `Restore on a row whose tab is closed opened ${J(r.s.inline)}, want the inline ask`);
      c = await click(cdp, '[data-sm-confirm="restore-open"]');
      if (!c.ok) f('5', `Open project and restore: ${c.why}`);
      r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.b3 && LIVE.has(one.status)), 15_000);
      if (!r.ok) f('5', `b3 is not Managed and live after the restore: ${J(r.s.store.sessions.find((one) => one.id === ids.b3) ?? null)}`);
      if (!r.s.store.projects.some((p) => p.path === P.beta)) f('5', 'beta\'s tab did not open');
      // The fix round, W1: a Past restore lands, as today's Past Sessions did.
      const landed = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === ids.b3 && x.focus.terminal, 5000);
      if (landed.s.sheet) f('5', 'the sheet stayed open after a Past restore; today\'s Past Sessions closed and landed');
      if (landed.s.store.activeSessionId !== ids.b3) f('5', `the active session is ${String(landed.s.store.activeSessionId)} after the restore, want b3`);
      if (!landed.s.focus.terminal) f('5', `after the restore the keyboard is on ${landed.s.focus.desc}, want b3's terminal`);
      say(`5: b3 restored into beta; beta open ${String(landed.s.store.projects.some((p) => p.path === P.beta))}, sheet open ${String(landed.s.sheet)}, active ${String(landed.s.store.activeSessionId === ids.b3 ? 'b3' : landed.s.store.activeSessionId)}, keyboard ${landed.s.focus.desc}`);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ 6
    if (on('6')) {
      stage = '6';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await endRow('6', 'g1', false);
      await removeRow('6', 'g1');
      const away = `${P.gamma}-away`;
      renameSync(P.gamma, away);
      try {
        await click(cdp, '#sm-tab-past');
        await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.g1), 5000);
        await click(cdp, `[data-manage-primary="${ids.g1}"]`);
        // The fix round, W7. The FIRST press says the folder is gone, as
        // today's Past Sessions said it; an ask promising a shell in that
        // folder is the first build's shape and is a finding here.
        const first = await until(cdp, (x) => x.inline?.kind === 'failed' || x.inline?.kind === 'restore-open', 5000);
        if (first.s.inline?.kind === 'restore-open') {
          f('6', `the first press on a restore whose folder is gone drew the ask ${J(first.s.inline?.text)}, which promises a shell in it`);
          await click(cdp, '[data-sm-confirm="restore-open"]');
        }
        const failed = await until(cdp, (x) => x.inline?.kind === 'failed', 10_000);
        if (!failed.ok) f('6', `a restore whose folder is gone drew ${J(failed.s.inline)}, want the failed panel`);
        if (!failed.s.rows.some((r) => r.id === ids.g1)) f('6', 'the failed restore did not keep its row');
        // The sentence must be true of THIS row. A removed session runs
        // nowhere, so a refusal that says it "is still running" is a sentence
        // written for Go to session read out over a restore (SPEC §8.2 names
        // the Restore sentence as the folder no longer existing).
        const said = failed.s.inline?.text ?? '';
        if (/still running/i.test(said)) f('6', `the failed restore of a REMOVED session says it is still running: ${J(said)}`);
        say(`6: the failed panel reads ${J(failed.s.inline?.error ?? failed.s.inline?.text ?? null)}`);
      } finally {
        renameSync(away, P.gamma);
      }
      const retry = await click(cdp, '[data-manage-inline] .sm-inline-actions .btn-primary');
      if (!retry.ok) f('6', `Retry: ${retry.why}`);
      let r = await until(cdp, (x) => x.inline?.kind === 'restore-open' || x.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status)), 5000);
      if (r.s.inline?.kind === 'restore-open') {
        await click(cdp, '[data-sm-confirm="restore-open"]');
        r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status)), 15_000);
      }
      if (!r.s.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status))) f('6', 'Retry did not restore g1 once its folder was back');
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      else {
        await click(cdp, '#sm-tab-managed');
        await until(cdp, (x) => x.tab === 'sm-tab-managed', 3000);
      }
    }

    // ------------------------------------------------------------------ L
    // The fix round, W1, the verifier's P14: a removed session whose project
    // is OPEN but not the active one. Today one press switched to it.
    if (on('L')) {
      stage = 'L';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      const activeBefore = s.store.activeProjectId;
      const alpha = s.store.projects.find((p) => p.path === P.alpha)?.id ?? null;
      if (alpha === null) f('L', 'alpha is not open');
      else if (activeBefore === alpha) note('L: alpha is already the active project, so this arm shows the landing and not the switch');
      await endRow('L', 'a1', false);
      await removeRow('L', 'a1');
      await click(cdp, '#sm-tab-past');
      await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.a1), 5000);
      const c = await click(cdp, `[data-manage-primary="${ids.a1}"]`);
      if (!c.ok) f('L', `a1's Restore: ${c.why}`);
      const r = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === ids.a1 && x.focus.terminal, 15_000);
      if (r.s.sheet) f('L', 'the sheet stayed open after a Past restore into an open project');
      if (r.s.store.activeProjectId !== alpha) f('L', `the active project is ${String(r.s.store.activeProjectId)}, want alpha (${String(alpha)})`);
      if (r.s.store.activeSessionId !== ids.a1) f('L', `the active session is ${String(r.s.store.activeSessionId)}, want a1`);
      if (!r.s.focus.terminal) f('L', `the keyboard is on ${r.s.focus.desc}, want a1's terminal`);
      if (r.s.store.toasts.some((t) => /restored/.test(t.text) && t.kind !== 'success')) f('L', `the restore said ${J(r.s.store.toasts.slice(-1))}`);
      say(`L: a1 restored from Past; sheet ${String(r.s.sheet)}, active project ${r.s.store.activeProjectId === alpha ? 'alpha' : String(r.s.store.activeProjectId)} (was ${activeBefore === alpha ? 'alpha' : String(activeBefore)}), keyboard ${r.s.focus.desc}`);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ O
    // The fix round, W3. Today Past Sessions opens OVER the Catch Me Up page
    // and closes back onto it; the first build's door refused, with no word.
    if (on('O')) {
      stage = 'O';
      s = await state(cdp);
      if (s.sheet) {
        await pressKey(cdp, 'Escape');
        ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      }
      s = await d(cdp, "menu('show-overview')");
      ({ s } = await until(cdp, (x) => x.store.overview, 5000));
      if (!s.store.overview) f('O', 'View → Catch Me Up did not open the page, so the arm has nothing to open over');
      s = await d(cdp, "open('past')");
      if (!s.sheet) f('O', 'Session → Past Sessions… with the Catch Me Up page open drew nothing');
      else if (s.tab !== 'sm-tab-past') f('O', `the sheet opened on ${String(s.tab)}, want the Past tab`);
      if (!s.store.overview) f('O', 'the page closed when the sheet opened; today it stays under it');
      const inSheet = (await until(cdp, (x) => x.focus.inSheet, 2000)).s.focus.inSheet;
      if (!inSheet) f('O', 'the keyboard is not in the sheet it opened over the page');
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('O', 'Escape did not close the sheet over the page');
      if (!s.store.overview) f('O', 'Escape closed the page with the sheet; the sheet alone should close');
      say(`O: the sheet opened over the page ${String(inSheet)}; after Escape sheet ${String(s.sheet)}, page ${String(s.store.overview)}`);
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.store.overview, 5000));
      if (s.store.overview) f('O', 'a second Escape did not close the page');
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ J
    // The fix round, W6. Today ⌘J draws its list ABOVE Past Sessions and a
    // person uses it there; under the sheet it closes the sheet first.
    if (on('J')) {
      stage = 'J';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await pressKey(cdp, 'j', 4);
      ({ s } = await until(cdp, (x) => x.store.attention, 3000));
      if (!s.store.attention) f('J', '⌘J under the sheet opened nothing');
      if (s.sheet) f('J', '⌘J left the sheet open under the list, which stacks a layer on it');
      say(`J: after ⌘J the list is ${String(s.store.attention)} and the sheet ${String(s.sheet)}`);
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.store.attention, 3000));
      if (s.store.attention) f('J', 'Escape did not close the list');
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ D
    // The fix round, the batch attack's P1 (major). A double click at the
    // centre of `End 2 sessions`: the first click runs the batch, both local
    // targets end at once and the panel closes by itself, the grid slides up
    // by the panel's height, and the second click lands on an ENDED row's
    // Restore. Built as the attack built it: two ended rows first, then two
    // live ones, the project filter on that folder alone.
    if (on('D')) {
      stage = 'D';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await d(cdp, `addProject(${J(P.dbl)})`);
      for (const k of ['ra', 'rb', 'ta', 'tb']) ids[k] = await d(cdp, `createSession(${J({ path: P.dbl, name: `p293-${k}` })})`);
      await until(cdp, (x) => ['ra', 'rb', 'ta', 'tb'].every((k) => x.store.sessions.some((one) => one.id === ids[k] && LIVE.has(one.status))), 20_000);
      for (const k of ['ra', 'rb']) await d(cdp, `killOutOfBand(${J(ids[k])})`);
      await until(cdp, (x) => ['ra', 'rb'].every((k) => ['exited', 'restorable'].includes(x.store.sessions.find((one) => one.id === ids[k])?.status ?? '')), 15_000);
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      const option = await cdpEval(cdp, `[...document.querySelectorAll('#sm-filter-project option')].map((o) => [o.value, o.textContent]).find(([, l]) => (l ?? '').split(' · ')[0] === 'dbl') ?? null`);
      if (option === null) f('D', 'no project filter option for the dbl folder');
      else await choose(cdp, '#sm-filter-project', option[0]);
      await until(cdp, (x) => x.rows.length === 4, 5000);
      for (const k of ['ta', 'tb']) await click(cdp, `[data-manage-check="${ids[k]}"]`);
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch?.phase === 'confirm', 3000));
      const box = await cdpEval(cdp, `(() => { const el = document.querySelector('[data-sm="batch-confirm"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
      if (box === null) f('D', 'no End 2 sessions button');
      else {
        const m = (type, extra) => cdp.call('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, ...extra });
        await m('mouseMoved', { button: 'none', buttons: 0 });
        await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
        await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
        await sleep(200);
        const under = await cdpEval(cdp, `(() => { const el = document.elementFromPoint(${String(box.x)}, ${String(box.y)}); const b = el && el.closest('button, input'); const row = el && el.closest('[data-manage-row]'); return { tag: el ? el.tagName : null, verb: b ? b.getAttribute('data-verb') : null, row: row ? row.getAttribute('data-manage-row') : null, panel: document.querySelector('section.sm-batch') !== null }; })()`);
        await m('mousePressed', { button: 'left', buttons: 1, clickCount: 2 });
        await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 2 });
        await sleep(3000);
        const after = await state(cdp);
        const statusOf = (k) => after.store.sessions.find((one) => one.id === ids[k])?.status ?? null;
        for (const k of ['ra', 'rb']) {
          if (LIVE.has(statusOf(k) ?? '')) f('D', `${k}, ended and never named, reads ${String(statusOf(k))} after the double click: the second click restored it`);
        }
        for (const k of ['ta', 'tb']) {
          if (LIVE.has(statusOf(k) ?? '')) f('D', `${k} was named and reads ${String(statusOf(k))} after the batch`);
        }
        if (after.store.toasts.some((t) => /restored/.test(t.text))) f('D', `a restore was said after the double click: ${J(after.store.toasts.slice(-2))}`);
        readings.doubleClick = { at: box, underAtSecond: under, after: ['ra', 'rb', 'ta', 'tb'].map((k) => `${k}:${String(statusOf(k))}`) };
        say(`D: under the second click ${J(under)}; after it ${readings.doubleClick.after.join(' ')}`);
      }
      await choose(cdp, '#sm-filter-project', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a2), 5000);
      s = await state(cdp);
    }

    // ------------------------------------------------------------------ 12
    if (on('12') || on('R')) {
      stage = '12';
      const goTo = async (arm, key, path, machineId) => {
        const id = ids[key];
        s = await state(cdp);
        if (!s.sheet) s = await d(cdp, "open('managed')");
        const items = await d(cdp, `menuItemsFor(${J(id)})`);
        if (!items.some((i) => i.label === 'Go to session')) return f(arm, `${key}'s menu offers no Go to session: ${J(items.map((i) => i.label))}`);
        await d(cdp, `runMenuItem(${J(id)}, 'Go to session')`);
        const r = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === id, 15_000);
        if (!r.ok) return f(arm, `Go to session on ${key}: sheet ${String(r.s.sheet)}, active ${String(r.s.store.activeSessionId)}; toasts ${J(r.s.store.toasts.slice(-2))}`);
        if (!r.s.store.projects.some((p) => p.path === path && p.machineId === machineId)) f(arm, `${key}'s project did not open as its own target`);
        const k = await until(cdp, (x) => x.focus.terminal, 3000);
        if (!k.ok) f(arm, `after Go to session the keyboard is on ${k.s.focus.desc}, want the terminal`);
        say(`${arm}: Go to session on ${key} landed; the keyboard is on ${k.s.focus.desc}`);
        return null;
      };
      if (on('12')) await goTo('12', 'd1', P.delta, null);
      if (on('R') && typeof ids.r1 === 'string') await goTo('R', 'r1', P.far, MACHINE_ID);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------- 9 and 14
    if (on('9') || on('14')) {
      stage = '9';
      await choose(cdp, '#sm-filter-state', 'running');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => LIVE.has(r.status ?? '')), 5000));
      await click(cdp, '#sm-select-all');
      ({ s } = await until(cdp, (x) => checkedIds(x).length > 0, 3000));
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch?.phase === 'confirm', 3000));
      const named = s.batch?.targets.map((t) => t.id) ?? [];
      const last = named[named.length - 1];
      if (named.length < 2) f('9', `the confirmation names ${String(named.length)} session(s); the arm needs two or more`);
      // THE PRESS, and at once, with no settle after the release, the probe
      // ends the LAST target out of band, as another window would. The press
      // has frozen it as a target already (the renderer had not heard of the
      // kill), so what decides it is the loop's own fresh read before its
      // call: it must read Already ended and End must never be called for it.
      const c = await click(cdp, '[data-sm="batch-confirm"]', 0);
      if (!c.ok) f('9', `the batch confirm: ${c.why}`);
      await d(cdp, `killOutOfBand(${J(last)})`);
      const done = await until(cdp, (x) => x.batch === null || x.batch.phase === 'done', 30_000);
      if (!done.ok) f('9', `the batch did not finish: ${J(done.s.batch)}`);
      const truth = await cdpEval(cdp, 'window.gmux.sessions.list().then((l) => l.map((x) => ({ id: x.id, status: x.status })))', 30_000);
      readings.main.afterBatch = truth;
      for (const id of named) {
        const row = truth.find((x) => x.id === id);
        if (row === undefined || LIVE.has(row.status)) f('9', `${id} was named and reads ${J(row ?? null)} in main's list after the batch`);
      }
      const outcomes = done.s.batch?.targets ?? [];
      const lastOutcome = outcomes.find((t) => t.id === last)?.outcome ?? null;
      readings.batch = { named, last, phase: done.s.batch?.phase ?? 'closed', outcomes };
      if (done.s.batch !== null && lastOutcome !== 'skipped' && lastOutcome !== 'ended') {
        f('9', `the target ended out of band reads outcome ${J(lastOutcome)}, want Already ended (skipped) or, if the kill lost the race, ended`);
      }
      for (const t of outcomes) {
        if (t.id !== last && t.outcome !== 'ended') f('9', `${t.id} reads ${J(t.outcome)}; every other target must end`);
      }
      note(`9: ${String(named.length)} named; the probe ended the last out of band at the press; the panel ${done.s.batch === null ? 'closed by itself (every target reads ended)' : `reads ${J(done.s.batch.heading)} and the last target's outcome is ${J(lastOutcome)}`}`);
      if (on('14')) {
        await sleep(300);
        const k = await state(cdp);
        if (!k.focus.inSheet) f('14', `after the batch the keyboard is on ${k.focus.desc}, outside the sheet`);
        say(`14: after the batch the keyboard is on ${k.focus.desc}`);
      }
    }
    stage = 'done';
  } catch (err) {
    throw new Error(`during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    try {
      await d(cdp, 'release()');
    } catch {
      /* the window may be gone; withElectron ends the tree anyway */
    }
  }
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------
writeFileSync(join(outDir, 'readings.json'), `${J({ findings, readings })}\n`);
say('');
for (const arm of ALL_ARMS) {
  const n = findings[arm].length;
  const verdict = !on(arm) ? 'not run' : arm === '15' ? 'NOT DRIVEN' : n === 0 ? 'PASS' : `FAIL ${String(n)}`;
  say(`arm ${arm.padEnd(3)} ${verdict}`);
}
const failures = [];
for (const arm of [...ALL_ARMS, 'RUN']) {
  if (arm === '15') continue;
  if (arm !== 'RUN' && !on(arm)) continue;
  for (const x of findings[arm]) failures.push(`${arm}: ${x}`);
}
say(`readings: ${join(outDir, 'readings.json')}`);
if (failures.length > 0) {
  for (const x of failures) process.stderr.write(`${TAG}   ${x}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: 0 findings on ${chosen.join(', ')}.${on('15') ? ' 15 was not driven.' : ''}`);
process.exit(0);
