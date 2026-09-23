#!/usr/bin/env node
/**
 * probe:p321 — Phase 321 inside the real app, through to the phone's push.
 *
 * WHAT IT IS FOR. Phase 321 (build/p321/SPEC.md) reads two named question
 * shapes beside the unchanged numbered verdict, for qwen and for Claude Code's
 * launch window, and only while that session's AGENT holds the pane's
 * terminal (the operator's ruling of 2026-09-23). Its build read six shapes,
 * excused antigravity's repaint and grok's helpers; its fix round REMOVED
 * cursor's two shapes, opencode's and antigravity's with that exemption,
 * because each turned amber on a screen that is not a question (SPEC §12.9),
 * and the ruling REMOVED grok's helper rule, so those are graded here as the
 * parent reads them. The vitest files drive the state machine on a
 * virtual clock; this probe is the one run of the chain INSIDE THE APP: the
 * real registry rows launched by Tortie under their bare names, the shipped
 * activity monitor at the unfocused 2 s cadence, main's own status, the door's
 * blocked rows (the feed the menu bar's status item is built from), the ⌘J
 * panel's rows, and the push to Phase 314's local APNs stand-in.
 *
 * IN probe:p314's SHAPE, and it borrows three things from Phase 319's parked
 * probe: one Electron through `build/electron-run.mjs`, a scratch profile under
 * a harness directory, a scratch HOME and its own tmux socket
 * (`gmux-p321-<pid>`, never `gmux`); the push seam
 * (`src/main/harness/push-seam.ts`) under its six refusals, with Apple as
 * `build/p314/apns-stand-in.mjs` on loopback IN THIS PROCESS; and, from 319,
 * the 2 s cadence driven through the app's own focus wiring (main starts with
 * `--inspect=0` and the probe emits `browser-window-blur` on `app`) and
 * MEASURED per arm through a `GMUX_TMUX_BIN` wrapper around the vendored tmux
 * that notes each monitor tick, with a settled metronome session present. An
 * arm whose own span did not tick every 2 s reads UNREADABLE, never a pass or
 * a failure.
 *
 * THE SESSIONS ARE THE REAL REGISTRY ROWS cursor, qwen, opencode, antigravity,
 * claude, grok and pi, launched by Tortie by their bare names (`cursor-agent`,
 * `qwen`, `opencode`, `agy`, `claude`, `grok`, `pi`), each of which the scratch
 * login shell resolves to a wrapper on the scratch HOME's PATH (its
 * `.zprofile` and `.zshrc` put the bin first, as probe:p314 does) that
 * `exec`s `build/p321/stand-in.mjs` under the bare name (`exec -a`), so its
 * command line names the agent the way the real one's does, which is what
 * the foreground gate asks. EVERY ONE OF THOSE AGENTS IS INSTALLED ON
 * THIS MAC, so BEFORE ANY ARM the probe asks the scratch login shell, with the
 * very environment the app is given, `command -v` for every bare name and
 * reads UNREADABLE and exits 2 if any resolves elsewhere; and after every
 * launch it requires the stand-in's own hello, ending the session at once if
 * the pane holds anything else. The stand-in draws ONLY Builder A's committed
 * redacted screens (the nine question fixtures and the detector windows under
 * build/fixtures/questions/), never a recording, with each agent's MEASURED
 * write behaviour: antigravity repaints every 2.0 s at idle and while asking,
 * grok draws continuously until its first turn and keeps a detached helper
 * from launch, and a grok turn starts a detached tool mid-turn. Every helper
 * and tool is ended by pid in the stand-in's `finally` and again in this
 * probe's. No real agent runs and NO MODEL TURN is spent.
 *
 * THE ARMS, each run once at the parent build and once at HEAD (two
 * invocations, one after the other, never at once):
 *   (a) EACH QUESTION, one at a time, spaced past the push floor: qwen's two
 *       confirmations (the second with its scrollbar column) and Claude Code
 *       2.1.280's folder trust (its registry file is absent under the scratch
 *       HOME, which is its launch window). At HEAD each reads needs_input in
 *       main, is in the door's blocked rows, is a ⌘J row, and gets ONE push;
 *       at the parent they raise nothing and send nothing. And the questions
 *       whose shapes the fix round removed, cursor's trust gate and run
 *       permission, opencode's permission and antigravity's folder trust under
 *       its 2.0 s repaint: never amber and no push at EITHER build, which is
 *       the removal proved in the app. antigravity's numbered permission under
 *       its repaint is a reading at both, because at 2 s its repaint masks it
 *       only some of the time (research 129 §3.5).
 *   (b) GROK AFTER ITS TURN, AS TODAY: `running` before the turn, after it
 *       and while a later tool runs, at BOTH builds, because its helper
 *       counts as a tool (the operator's ruling of 2026-09-23 removed the
 *       resident rule whole, so grok reads exactly what the parent reads).
 *   (c) HIS OWN WORDS: cursor's ANSWERED trust box left on screen (the trap,
 *       SPEC §3.2), then each shape's whole question typed key by key, no
 *       Enter, into the input row of each of the six sessions, the stand-in
 *       echoing it above its own footer, with `noteTerminalInput` called as
 *       the app calls it for his keys. No amber at either build. A composition
 *       the parent's own numbered verdict reads as a question is the existing
 *       fault (research 129 §9 item 6), equal at both builds by construction
 *       (SPEC §4.2), and is reported, never graded here.
 *   (d) CONTROLS: a pi row that works and rests, and a shell row. Neither ever
 *       reads needs_input, and each reads idle at rest, at both builds.
 *   (e) THE CEILING, which stands (his correction of 2026-09-23): six claude
 *       sessions blocked on the older numbered trust gate, then a seventh
 *       drawing qwen's confirmation: no needs_input and no push for it at
 *       either build in 20 s. Then the trade SPEC §1.3 item 4 states, INSIDE
 *       the seventh's probe window (`AMBIGUOUS_WINDOW_MS`, 60 s): one of the
 *       six ended 20 s after the draw, so at HEAD the waiting qwen question
 *       takes the freed slot and an eighth numbered question is NOT raised,
 *       while at the parent the qwen question is no question and the eighth
 *       takes the slot. Then the same drawn PAST the window: back to six
 *       blocked, a shape question drawn and left 75 s, a slot freed, and at
 *       BOTH builds the shape question is never raised (it has left the probe
 *       window and is never captured again) and a numbered question drawn
 *       after takes the slot. Measured and named as the limit it is.
 *   (f) THE REVERIFY'S HOSTILE SHELLS: a qwen and a Claude Code session whose
 *       pane runs a login shell (the shape of a restored session before its
 *       resume, or of a handback), in which `tail -f`, `cat` then `sleep`, and
 *       a watch-like loop print that agent's committed question rows LAST and
 *       block. No needs_input and no push at EITHER build: the parent reads no
 *       shape, and HEAD asks a shape only while the agent holds the terminal.
 * Every arm first reads from MAIN whether its sessions did what the arm needs,
 * and a precondition that did not hold reads UNREADABLE, never a failure.
 *
 * WHAT IT REFUSES. It signals nothing it did not start: the launch is
 * `withElectron`'s, whose kill is in a `finally`; the scratch socket names this
 * run and every tmux command the probe runs names it, and its socket FILE is
 * unlinked in the `finally` (kill-server does not always take it); every stand-in and every
 * helper and tool a stand-in reported is ended by pid in the `finally`, TERM
 * then KILL, only while its command line is still the one recorded. It never
 * runs `pkill`, never names `-L gmux`, installs nothing, reads no credential or
 * conversation store, writes nothing under the person's home, and spends no
 * model turn. `npm run shot` is not called. The APNs key is a scratch P-256 key
 * generated here and deleted in the `finally`.
 *
 * VERIFIERS ONLY. It starts an Electron: take the orchestrator's Electron lock
 * first. Builders write it and never run it. BUILD FIRST: it carries no
 * `npm run build &&` because a run against another checkout must not rebuild
 * this one, and it refuses (exit 2) when the checkout has no build.
 *
 *   npm run -s probe:p321
 *   P321_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p321   the parent reading
 *   P321_ARMS=a,b npm run -s probe:p321                          named arms only
 *   P321_KEEP=1 npm run -s probe:p321                            keep the scratch world
 *
 * WHAT IT WRITES. `out/p321/probe-p321[-parent].json`: per arm a verdict and a
 * sentence, statuses, timings, request counts, the measured cadence and the
 * names of the committed screens drawn. Never a device token, a provider
 * token, a key byte, a payload or a line of any screen.
 *
 * Exit 0 when every arm read as expected, 1 when an arm failed, 2 when it
 * could not run or an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';
import {
  BARE_NAME,
  STAND_IN_AGENTS,
  idleScreensFor,
  loadScreen,
  parentDetectDialog,
  refName
} from './stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** The checkout whose APP is launched. The stand-in and the screens are always this tree's. */
const CHECKOUT = resolve((process.env['P321_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p321 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The shipping constants, read out of the launched checkout's own source
// ---------------------------------------------------------------------------

function constantOf(file, name) {
  const path = join(CHECKOUT, file);
  if (!existsSync(path)) return null;
  const hit = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(readFileSync(path, 'utf8'));
  return hit === null ? null : Number(hit[1].replace(/_/g, ''));
}
/** The capture budget: the ceiling of six the operator ruled stands. */
const CAPTURES = constantOf('src/main/activity/monitor.ts', 'MAX_CAPTURES_PER_TICK') ?? 6;
const FLOOR_MS = constantOf('src/main/push/engine.ts', 'ALERT_FLOOR_MS') ?? 30_000;
/** Quiet this long after the last request before the next arm: the floor plus a margin. */
const QUIET_MS = FLOOR_MS + 6_000;
/** The engine's coalescing window plus a margin: how long a raise's own alert may take to leave. */
const COALESCE_WAIT_MS = (constantOf('src/main/push/engine.ts', 'COALESCE_MS') ?? 4_000) + 2_000;
const ARMS = new Set(((process.env['P321_ARMS'] ?? '').trim() || 'a,b,c,d,e,f').split(',').map((s) => s.trim()));
const CEILING_MS = 2_700_000;
/** Every stand-in pane is this size: wider and taller than any committed screen plus a typed question. */
const COLS = 172;
const ROWS = 52;

// ---------------------------------------------------------------------------
// The scratch world, outside the repository and outside the person's home
// ---------------------------------------------------------------------------

const RUN = resolve((process.env['P321_RUN'] ?? '').trim() || `/private/tmp/p321-probe-${String(process.pid)}`);
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PUSH_DIR = join(HARNESS, 'push');
const KEY_FILE = join(PUSH_DIR, 'scratch-key.p8');
const COMMANDS = join(PUSH_DIR, 'commands.json');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const STANDIN_DIR = join(RUN, 'standin');
const TICK_LOG = join(HARNESS, 'monitor-ticks.log');
const TMUX_WRAPPER = join(HARNESS, 'tmux-counting');
const SOCKET = `gmux-p321-${String(process.pid)}`;
const KEEP = (process.env['P321_KEEP'] ?? '') === '1';
const TOPIC = 'software.itavero.tortie.p321';
const tokenA = randomBytes(32).toString('hex');
const STAND_IN = join(ROOT, 'build', 'p321', 'stand-in.mjs');

/**
 * The environment the app is given, and the one the precondition asks the
 * login shell with. Every Claude Code session variable the probe inherited is
 * REMOVED (probe:p314's rule), and so is `ZDOTDIR`, because a login shell that
 * reads the person's own dotfiles would resolve the bare names to the real
 * agents. Mapped to `undefined`, which is what removes a key.
 */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name) || name === 'ZDOTDIR')
    .map((name) => [name, undefined])
);

const report = {
  checkout: CHECKOUT,
  atParent: AT_PARENT,
  constants: { CAPTURES, FLOOR_MS, QUIET_MS, COLS, ROWS },
  arms: [],
  readings: {},
  turns: 0
};
let failures = 0;
const arm = (id, ok, said) => {
  report.arms.push({ id, ok, said });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
};
class Unreadable extends Error {}

/** MAIN's node inspector, whose url the app printed because it started with `--inspect=0`. */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* the port is printed a beat before the listener is up */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
// tmux, on this run's socket only
// ---------------------------------------------------------------------------

/** The checkout's vendored tmux, the one the app itself runs; the probe's own reads use it too. */
const vendored =
  [join(CHECKOUT, 'build', 'vendor', 'tmux', 'bin', 'tmux'), join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux')].find((p) =>
    existsSync(p)
  ) ?? null;
const tmuxRun = (args) => spawnSync(vendored ?? 'tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 15_000 });
function paneOf(tmuxName) {
  const r = tmuxRun(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{pane_pid}']);
  for (const line of (r.stdout ?? '').split('\n')) {
    const [name, paneId, pid] = line.split('\t');
    if (name === tmuxName && paneId !== undefined) return { paneId, panePid: Number(pid) };
  }
  return null;
}
/**
 * Type text into a pane as keys, literally. tmux reads an argument that ENDS
 * in `;` as a command separator and drops the semicolon (measured on the
 * vendored tmux: `abc;` arrives as `abc`, and `;` alone as nothing), so a
 * trailing run of them is sent as its bytes instead.
 */
function typeLiteral(paneId, text) {
  if (paneId === null || text.length === 0) return;
  const body = text.replace(/;+$/, '');
  const semis = text.length - body.length;
  if (body.length > 0) tmuxRun(['send-keys', '-t', paneId, '-l', '--', body]);
  if (semis > 0) tmuxRun(['send-keys', '-t', paneId, '-H', ...Array.from({ length: semis }, () => '3b')]);
}
/** What a pane shows, for the probe's own grading. Never written to the report. */
function screenOf(paneId) {
  if (paneId === null) return '';
  const r = tmuxRun(['capture-pane', '-p', '-J', '-t', paneId]);
  return r.status === 0 ? (r.stdout ?? '') : '';
}
const commandOf = (pid) => (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();

// ---------------------------------------------------------------------------
// The stand-ins, and every process they reported
// ---------------------------------------------------------------------------

/**
 * Every stand-in, helper and tool this run saw, by pid, with its command line
 * when first seen. A pid is recorded only while it is running what this run
 * started (`expect`), so a pid the system has since handed to something else is
 * never recorded, and so never signalled.
 */
const ours = new Map();
const STAND_IN_CMD = new RegExp(STAND_IN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const SLEEP_CMD = /^\/bin\/sleep \d+$/;
const noteProc = (pid, expect = null) => {
  if (Number.isInteger(pid) && pid > 1 && !ours.has(pid)) {
    const cmd = commandOf(pid);
    if (cmd !== '' && (expect === null || expect.test(cmd))) ours.set(pid, cmd);
  }
};
/** A pane's process and every descendant, noted so the finally can end them by pid. */
function noteTree(root) {
  const ps = spawnSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
  const kids = new Map();
  for (const line of (ps.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)/.exec(line);
    if (m === null) continue;
    const [pid, ppid] = [Number(m[1]), Number(m[2])];
    if (!kids.has(ppid)) kids.set(ppid, []);
    kids.get(ppid).push(pid);
  }
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    noteProc(pid);
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
}
function hellos() {
  if (!existsSync(STANDIN_DIR)) return [];
  const out = [];
  for (const n of readdirSync(STANDIN_DIR)) {
    if (!/^hello-\d+\.json$/.test(n)) continue;
    try {
      out.push(JSON.parse(readFileSync(join(STANDIN_DIR, n), 'utf8')));
    } catch {
      /* written a beat ago */
    }
  }
  return out;
}
function stateOf(pid) {
  try {
    return JSON.parse(readFileSync(join(STANDIN_DIR, `state-${String(pid)}.json`), 'utf8'));
  } catch {
    return null;
  }
}
/** Every helper and tool pid the stand-ins have reported, noted for the finally. */
function noteKids() {
  if (!existsSync(STANDIN_DIR)) return;
  for (const n of readdirSync(STANDIN_DIR)) {
    const m = /^state-(\d+)\.json$/.exec(n);
    if (m === null) continue;
    const st = stateOf(Number(m[1]));
    for (const k of [...(st?.helpers ?? []), ...(st?.tools ?? [])]) {
      if (k.live === true) noteProc(k.pid, SLEEP_CMD);
    }
  }
}
const cmdSeq = new Map();
async function tell(pid, ops, waitMs = 3_000) {
  const seq = (cmdSeq.get(pid) ?? 0) + 1;
  cmdSeq.set(pid, seq);
  writeFileSync(join(STANDIN_DIR, `cmd-${String(pid)}.json`), J({ seq, ops }));
  const started = Date.now();
  while (Date.now() - started < waitMs) {
    if ((stateOf(pid)?.seq ?? 0) >= seq) {
      noteKids();
      return stateOf(pid);
    }
    await sleep(60);
  }
  throw new Unreadable(`the stand-in ${String(pid)} did not apply command ${String(seq)} within ${String(waitMs)} ms`);
}

/** End by pid, TERM then KILL, only while the command line is still the one recorded. */
async function endByPid(pids) {
  const live = pids.filter((pid) => ours.has(pid) && commandOf(pid) === ours.get(pid));
  for (const pid of live) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  if (live.length === 0) return { asked: 0, killed: 0 };
  await sleep(1_500);
  const still = live.filter((pid) => commandOf(pid) === ours.get(pid));
  for (const pid of still) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  if (still.length > 0) await sleep(500);
  return { asked: live.length, killed: still.length };
}

// ---------------------------------------------------------------------------
// The committed screens this run draws
// ---------------------------------------------------------------------------

const fx = (name) => ({ fixture: name });
/** The nine question fixtures SPEC §2.4 fixes by name, and the older numbered claude gate. */
const QUESTION_FIXTURES = [
  'claude-trust-2-1-280.txt',
  'cursor-trust-gate.txt',
  'cursor-trust-answered.txt',
  'cursor-run-permission.txt',
  'qwen-run-permission.txt',
  'qwen-run-permission-scrollbar.txt',
  'opencode-permission.txt',
  'antigravity-trust-gate.txt',
  'antigravity-run-permission.txt',
  'claude-workspace-trust.txt'
];
/** Each agent's idle screen and a second to alternate with while it works. */
const IDLE = Object.fromEntries(STAND_IN_AGENTS.map((a) => [a, idleScreensFor(a)]));
function idleOf(agent) {
  const s = IDLE[agent];
  if (s?.idle === null || s === undefined) throw new Unreadable(s?.why ?? `no idle screen for ${agent}`);
  return s;
}
const needFixture = (name) => {
  if (loadScreen(fx(name)) === null) {
    throw new Unreadable(`the committed screen ${name} is not in src/main/activity/__tests__/fixtures/`);
  }
  return fx(name);
};

// The questions of arm (a). `raises` is what HEAD must do: the two shapes the
// fix round kept raise; the four it removed raise at neither build.
const QUESTIONS = [
  { id: 'a1 cursor trust gate (shape removed)', agent: 'cursor', name: 'q-cursor-trust', fixture: 'cursor-trust-gate.txt', turn: false, raises: false },
  { id: 'a2 cursor run permission (shape removed)', agent: 'cursor', name: 'q-cursor-run', fixture: 'cursor-run-permission.txt', turn: true, raises: false },
  { id: 'a3 qwen confirmation', agent: 'qwen', name: 'q-qwen-run', fixture: 'qwen-run-permission.txt', turn: true, raises: true },
  { id: 'a4 qwen confirmation, scrollbar column', agent: 'qwen', name: 'q-qwen-bar', fixture: 'qwen-run-permission-scrollbar.txt', turn: true, raises: true },
  { id: 'a5 opencode permission (shape removed)', agent: 'opencode', name: 'q-opencode', fixture: 'opencode-permission.txt', turn: true, raises: false },
  { id: 'a6 Claude Code 2.1.280 folder trust', agent: 'claude', name: 'q-claude-trust', fixture: 'claude-trust-2-1-280.txt', turn: false, raises: true },
  { id: 'a7 antigravity folder trust (shape removed)', agent: 'antigravity', name: 'q-agy-trust', fixture: 'antigravity-trust-gate.txt', turn: false, repaintMs: 2_000, raises: false },
  { id: 'a8 antigravity run permission', agent: 'antigravity', name: 'q-agy-run', fixture: 'antigravity-run-permission.txt', turn: true, repaintMs: 2_000, numbered: true, raises: false }
];
const TYPED_SHAPES = [
  'cursor-trust-gate.txt',
  'cursor-run-permission.txt',
  'qwen-run-permission.txt',
  'opencode-permission.txt',
  'claude-trust-2-1-280.txt',
  'antigravity-trust-gate.txt',
  'antigravity-run-permission.txt'
];

let standIn = null;
let ran = false;
let shimPid = 0;
let appPid = 0;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PUSH_DIR, PROJECT, BIN, STANDIN_DIR]) mkdirSync(dir, { recursive: true });

  // ---- the stand-ins, one wrapper per bare name ---------------------------
  for (const agent of STAND_IN_AGENTS) {
    const bare = BARE_NAME[agent];
    const shellNext = join(STANDIN_DIR, `shell-next-${agent}`);
    writeFileSync(
      join(BIN, bare),
      [
        '#!/bin/bash',
        `# probe:p321. NOT ${bare} and not an agent: build/p321/stand-in.mjs draws committed screens.`,
        // Arm (f): the NEXT launch on a terminal is a login shell instead, the
        // shape of a restored session before its resume. A version probe has
        // no terminal and never takes it.
        `if [ -t 0 ] && [ -t 1 ] && [ -e '${shellNext}' ]; then rm -f '${shellNext}'; exec /bin/zsh -f -i; fi`,
        `P321_AGENT='${agent}'; export P321_AGENT`,
        `P321_STANDIN_DIR='${STANDIN_DIR}'; export P321_STANDIN_DIR`,
        `P321_STANDIN_CEILING_MS='${String(CEILING_MS)}'; export P321_STANDIN_CEILING_MS`,
        // Under the bare name, so `ps -o command=` names the agent as the real
        // one's does: the foreground gate asks exactly that.
        `exec -a '${bare}' '${process.execPath}' '${STAND_IN}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(join(BIN, bare), 0o755);
  }
  // Nothing is installed during this run, whatever anything wants.
  writeFileSync(join(BIN, 'npm'), '#!/bin/sh\necho "probe:p321 refuses npm: nothing is installed during this run" >&2\nexit 1\n', 'utf8');
  chmodSync(join(BIN, 'npm'), 0o755);
  // tmux's execvp reads the LOGIN shell's PATH, so the scratch bin goes on it.
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // ---- THE PRECONDITION: every bare name is the stand-in -----------------
  // Asked of the login shell the app will ask, with the environment the app
  // will be given, before anything is launched.
  const shellEnv = { ...process.env, HOME };
  for (const name of Object.keys(STRIPPED)) delete shellEnv[name];
  const shell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
  const resolved = {};
  for (const agent of STAND_IN_AGENTS) {
    const bare = BARE_NAME[agent];
    const r = spawnSync(shell, ['-lic', `command -v ${bare}`], { encoding: 'utf8', timeout: 30_000, env: shellEnv });
    const got = (r.stdout ?? '').trim().split('\n').pop() ?? '';
    resolved[bare] = got === join(BIN, bare);
  }
  report.readings.resolvesToStandIn = resolved;
  const elsewhere = Object.entries(resolved).filter(([, ok]) => !ok).map(([bare]) => bare);
  if (elsewhere.length > 0) {
    arm('precondition: every bare name is the stand-in', null,
      `the scratch login shell resolves ${elsewhere.join(', ')} to something other than the stand-in, so nothing is launched`);
    throw new Unreadable('a bare name resolves elsewhere');
  }
  arm('precondition: every bare name is the stand-in', true,
    `${Object.keys(resolved).join(', ')} each resolve to the scratch wrapper in ${shell} -lic`);

  // ---- the committed screens, named before anything is drawn --------------
  report.readings.screens = {
    fixtures: Object.fromEntries(QUESTION_FIXTURES.map((n) => [n, loadScreen(fx(n)) !== null])),
    idle: Object.fromEntries(STAND_IN_AGENTS.map((a) => [a, IDLE[a].idle === null ? `none: ${IDLE[a].why}` : refName(IDLE[a].idle)]))
  };

  // ---- the cadence, measured: a wrapper around the checkout's vendored tmux --
  if (vendored !== null) {
    writeFileSync(
      TMUX_WRAPPER,
      ['#!/bin/sh', `case "$*" in *'#{window_activity}'*) /bin/date +%s >> '${TICK_LOG}' ;; esac`, `exec '${vendored}' "$@"`, ''].join('\n'),
      'utf8'
    );
    chmodSync(TMUX_WRAPPER, 0o755);
  }
  report.readings.tmux = vendored === null ? 'no vendored tmux: the cadence is not measured' : 'the vendored tmux behind a counting wrapper';

  // ---- the scratch key and Apple's stand-in, in this process ---------------
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  writeFileSync(KEY_FILE, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), { mode: 0o600 });
  standIn = await startApnsStandIn({ publicKey: pair.publicKey, topic: TOPIC, devices: { [tokenA]: 'development' } });
  writeFileSync(
    join(PUSH_DIR, 'seed.json'),
    J({
      key: { keyId: 'P321PROBE1', teamId: 'P321TEAM01', topic: TOPIC, p8File: KEY_FILE },
      phones: [{ label: 'A', token: tokenA, environment: 'development' }],
      origins: standIn.origins,
      alerts: true
    }),
    { mode: 0o600 }
  );
  const requests = () => standIn.requests;
  const bodyOf = (rec) => {
    try {
      return JSON.parse(rec.body);
    } catch {
      return null;
    }
  };
  /** Alerts since `from` that name this session, by thread or by title. */
  const alertsFor = (one, from) =>
    requests()
      .slice(from)
      .filter(
        (r) =>
          r.headers['apns-push-type'] === 'alert' &&
          r.status === 200 &&
          (bodyOf(r)?.aps?.['thread-id'] === one.id || String(bodyOf(r)?.aps?.alert?.title ?? '').startsWith(`${one.name} `))
      );

  async function attach(timeoutMs) {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      try {
        const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
        if (Number.isFinite(port) && port > 0) {
          const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
          const picked = pickRendererTarget(list);
          if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
          why = picked.why;
        }
      } catch (err) {
        why = String(err?.message ?? err);
      }
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  }

  async function body(handle) {
    const seamSeen = handle.waitForLine(/\[gmux-push-seam\] installed [^\n]*\n/, 150_000).then(() => true).catch(() => false);
    const cdp = await attach(150_000);
    await cdp.call('Runtime.enable');
    for (let i = 0; i < 200; i += 1) {
      if ((await cdpEval(cdp, 'window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined && window.gmux !== undefined')) === true) break;
      await sleep(300);
    }
    if (!(await seamSeen)) {
      arm('the push seam', null, 'the seam never printed its installed line, so no push can be read');
      cdp.close();
      return;
    }
    report.readings.installed = /\[gmux-push-seam\] installed ([^\n]*)/.exec(handle.text())?.[1] ?? '';
    await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: PROJECT, names: [] })}).then(() => true)`);

    // ---- the seam's commands: the door's blocked rows --------------------
    let seamSeq = 0;
    async function seam(commands) {
      seamSeq += 1;
      const mine = seamSeq;
      writeFileSync(COMMANDS, J({ seq: mine, commands }));
      await handle.waitForLine(new RegExp(`\\[gmux-push-seam\\] applied seq=${String(mine)} `), 30_000);
    }
    const lastSeamLine = (kind) => {
      const lines = handle.text().split('\n').filter((l) => l.startsWith(`[gmux-push-seam] ${kind} `));
      const line = lines[lines.length - 1];
      if (line === undefined) return null;
      try {
        return JSON.parse(line.slice(`[gmux-push-seam] ${kind} `.length));
      } catch {
        return null;
      }
    };
    /** The door's blocked rows: the feed the menu bar's status item is rebuilt from. */
    async function doorHas(one) {
      await seam([{ op: 'blocked' }]);
      return (lastSeamLine('blocked')?.rows ?? []).some((r) => r.sessionId === one.id);
    }
    /** The ⌘J panel's rows, by name, off the drawn DOM. */
    async function panelHas(one) {
      const names = JSON.parse(
        await cdpEval(cdp, 'window.__gmuxP93.openPanel().then((s) => JSON.stringify(s.rows.map((r) => r.name)))')
      );
      await cdpEval(cdp, 'window.__gmuxP93.closePanel().then(() => true)');
      await blur().catch(() => undefined);
      return names.includes(one.name);
    }

    // ---- unfocus through the app's own wiring, and a window wide enough ---
    try {
      appPid = handle.appPid();
    } catch {
      appPid = 0;
    }
    // MAIN's inspector stays open for the run: the ⌘J reads below are
    // synthetic key events in the renderer and should move no focus, but if
    // one ever does, the blur is emitted again through the same handler so
    // the cadence the arms are gated on is the app's own 2 s.
    let mainCdp = null;
    //
    // THE FOCUS, TAKEN AWAY FOR REAL (the reverify's finding). The app's blur
    // handler RE-ASKS `isFocused()` of every window before it slows the poll,
    // so emitting `browser-window-blur` over a window macOS has actually made
    // key read nothing: the poll stayed at 1 s and every arm was unreadable.
    // So the window is unfocused first, `blur()` (on macOS it orders the
    // window out and back, which resigns key), then `app.hide()` only if that
    // did not take, each waited on until no window reads focused; then the
    // event is emitted, and the reading says which way it went.
    const BLUR = `(async () => {
      const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
      const { app, BrowserWindow } = load('electron');
      const ws = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
      const focused = () => ws.filter((w) => w.isFocused()).length;
      const wait = (ms) => new Promise((done) => setTimeout(done, ms));
      if (ws[0] !== undefined && ws[0].getSize()[0] < 1900) ws[0].setSize(1920, 1200);
      const before = focused();
      let how = 'none focused';
      if (focused() > 0) {
        for (const w of ws) if (w.isFocused()) w.blur();
        for (let i = 0; i < 20 && focused() > 0; i += 1) await wait(100);
        how = focused() === 0 ? 'blur()' : 'blur() did not take';
      }
      if (focused() > 0 && process.platform === 'darwin') {
        app.hide();
        for (let i = 0; i < 30 && focused() > 0; i += 1) await wait(100);
        how = focused() === 0 ? 'app.hide()' : 'STILL FOCUSED after app.hide()';
      }
      app.emit('browser-window-blur', {}, ws[0]);
      return String(ws.length) + ' window(s), ' + String(before) + ' focused before, ' + String(focused()) + ' after (' + how + '); ' +
        (ws[0] === undefined ? '' : 'size ' + ws[0].getSize().join('x') + '; ') + 'browser-window-blur emitted';
    })()`;
    async function blur() {
      if (mainCdp === null) return 'no inspector';
      const got = await mainCdp.call('Runtime.evaluate', { expression: BLUR, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true });
      return String(got.result?.result?.value ?? J(got.error ?? got.result ?? null)).slice(0, 200);
    }
    let blurred = 'not attempted';
    try {
      mainCdp = await cdpForMain(handle, 60_000);
      blurred = await blur();
    } catch (err) {
      blurred = `refused: ${String(err?.message ?? err).slice(0, 120)}`;
    }
    report.readings.blurred = blurred;
    const tickTimes = () => (existsSync(TICK_LOG) ? readFileSync(TICK_LOG, 'utf8').split('\n').filter(Boolean).map(Number) : []);
    /** Monitor ticks per second between two instants, read off the wrapper's log. */
    const rateBetween = (from, to) => {
      if (vendored === null || to - from < 5_000) return null;
      const a = Math.ceil(from / 1000);
      const b = Math.floor(to / 1000);
      const n = tickTimes().filter((t) => t >= a && t < b).length;
      return Math.round((n * 100) / Math.max(1, b - a)) / 100;
    };
    const atTwo = (x) => x !== null && x > 0.35 && x < 0.65;

    // ---- main's view, never the renderer's store --------------------------
    const mainSessions = async () =>
      JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, tmuxName: x.tmuxName }))))'));
    const statusOf = async (one) => (await mainSessions()).find((s) => s.name === one.name)?.status ?? 'gone';
    /**
     * Poll main for `ms`, or until `stop(status)`: every status seen, the
     * first moment each was seen, and the last.
     */
    async function watch(one, ms, stop = () => false) {
      const until = Date.now() + ms;
      const first = {};
      let last = 'gone';
      for (;;) {
        last = await statusOf(one);
        if (first[last] === undefined) first[last] = Date.now();
        if (stop(last) || Date.now() >= until) return { first, last, seen: Object.keys(first) };
        await sleep(600);
      }
    }

    /**
     * Create a session of a real registry row, bind its stand-in by the hello
     * it writes, size its pane, and hand back its handles. A pane that holds
     * anything but the stand-in is ended at once and the arm is unreadable.
     */
    async function launch(name, agent) {
      const before = new Set(hellos().map((h) => h.pid));
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(name)}, ${J(agent)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`);
      let row;
      for (let i = 0; i < 80 && row === undefined; i += 1) {
        row = (await mainSessions()).find((s) => s.name === name);
        if (row === undefined) await sleep(250);
      }
      if (row === undefined) throw new Unreadable(`Tortie never created the ${agent} session ${name}`);
      const pane = paneOf(row.tmuxName);
      if (agent === 'shell') return { name, agent, id: row.id, pid: 0, pane: pane?.paneId ?? null };
      let hello;
      for (let i = 0; i < 120 && hello === undefined; i += 1) {
        hello = hellos().find((h) => !before.has(h.pid) && h.agent === agent);
        if (hello === undefined) await sleep(250);
      }
      if (hello === undefined) {
        if (pane !== null) noteTree(pane.panePid);
        const held = pane === null ? 'nothing' : commandOf(pane.panePid).split(/\s+/)[0];
        await cdpEval(cdp, `window.gmux.sessions.kill(${J(row.id)}).then(() => 'ok').catch(() => 'err')`);
        throw new Unreadable(`${name}: the ${BARE_NAME[agent]} Tortie launched never said hello as the stand-in (the pane held ${held}); the session was ended at once`);
      }
      noteProc(hello.pid, STAND_IN_CMD);
      if (pane !== null) tmuxRun(['resize-window', '-t', pane.paneId, '-x', String(COLS), '-y', String(ROWS)]);
      const one = { name, agent, id: row.id, pid: hello.pid, pane: pane?.paneId ?? null };
      for (let i = 0; i < 40 && (stateOf(one.pid)?.cols ?? 0) < COLS; i += 1) await sleep(100);
      return one;
    }
    /** Draw a committed screen and require the pane to hold it whole. */
    async function draw(one, screen, extra = []) {
      let st = await tell(one.pid, [{ op: 'draw', screen }, ...extra]);
      if (st?.narrow === true && one.pane !== null) {
        // The app sizes the pane of a session it has just created to its own
        // view when it attaches it, in its own time, and that can land after
        // `launch` sized it (measured in arm (e), the seventh of seven
        // sessions created in a row: 206x42). Size it again, once, and redraw.
        tmuxRun(['resize-window', '-t', one.pane, '-x', String(COLS), '-y', String(ROWS)]);
        for (let i = 0; i < 40 && ((stateOf(one.pid)?.cols ?? 0) < COLS || (stateOf(one.pid)?.rows ?? 0) < ROWS); i += 1) await sleep(100);
        st = await tell(one.pid, [{ op: 'draw', screen }]);
      }
      if (st?.narrow === true) {
        throw new Unreadable(`${one.name}: the pane is ${String(st.cols)}x${String(st.rows)}, smaller than the committed screen ${refName(screen)} (${String(st.widest)} wide)`);
      }
      return st;
    }
    /** The pane still holds the committed screen whole, or the arm cannot be read. */
    function stillWhole(one) {
      const st = stateOf(one.pid);
      if (st?.narrow === true) {
        throw new Unreadable(`${one.name}: the pane became ${String(st.cols)}x${String(st.rows)}, smaller than ${st.screen} (${String(st.widest)} wide), while it was being read`);
      }
      return st === null ? null : `${String(st.cols)}x${String(st.rows)}`;
    }
    /** A turn: the agent's committed screens in turn, then `then`, then silence. */
    async function turn(one, ms, then, extra = []) {
      const idle = idleOf(one.agent);
      const screens = [idle.idle, idle.alt ?? idle.idle];
      await tell(one.pid, [{ op: 'work', ms, screens, then }, ...extra]);
      await sleep(ms + 400);
      const st = stateOf(one.pid);
      if (st?.narrow === true) throw new Unreadable(`${one.name}: the pane is narrower than ${st.screen}`);
    }
    async function end(ones) {
      for (const one of ones) await cdpEval(cdp, `window.gmux.sessions.kill(${J(one.id)}).then(() => 'ok').catch(() => 'err')`);
      await sleep(1_500);
      noteKids();
    }
    /** Wait until the stand-in has been quiet for the floor plus a margin, if anything was sent since `from`. */
    async function waitQuiet(from, max = 180_000) {
      if (requests().length === from) return true;
      const started = Date.now();
      for (;;) {
        const last = requests()[requests().length - 1]?.at ?? 0;
        if (Date.now() - last >= QUIET_MS) return true;
        if (Date.now() - started > max) return false;
        await sleep(500);
      }
    }
    /**
     * One section. Its verdicts are recorded only if the monitor ticked every
     * 2 s across the section's whole span, read off the wrapper's log after;
     * otherwise each reads UNREADABLE, whatever it saw. Every session it
     * started is ended, and the next section waits out the push floor.
     */
    async function section(letter, label, fn) {
      if (!ARMS.has(letter)) return;
      // A window macOS gave the focus back to mid-run would put the poll at
      // 1 s; take it away again before every section, and read the rate after.
      report.readings[`blur (${letter}) ${label}`] = await blur().catch((err) => `refused: ${String(err?.message ?? err).slice(0, 120)}`);
      const live = [];
      const from = Date.now();
      const sentFrom = requests().length;
      let verdicts = [];
      try {
        verdicts = await fn(live);
      } catch (err) {
        const id = `(${letter}) ${label}`;
        verdicts = [err instanceof Unreadable ? { id, ok: null, said: `unreadable: ${err.message}` } : { id, ok: false, said: `it threw: ${String(err?.message ?? err)}` }];
      } finally {
        await end(live);
      }
      const rate = rateBetween(from, Date.now());
      report.readings[`rate (${letter}) ${label}`] = rate;
      for (const v of verdicts) {
        if (v.ok !== null && !atTwo(rate)) {
          arm(v.id, null, `the monitor ticked ${String(rate)} times a second across this arm, not every 2 s, so its reading (${v.said}) cannot be used`);
        } else {
          arm(v.id, v.ok, `${v.said} (${String(rate)} ticks a second)`);
        }
      }
      await waitQuiet(sentFrom);
    }

    // ---- the metronome: one settled shell session for the whole run -------
    const metronome = await launch('metronome', 'shell');
    const measuredFrom = Date.now();
    await sleep(20_000);
    const perSecond = rateBetween(measuredFrom, Date.now());
    report.readings.monitorTicksPerSecond = perSecond;
    say(`blur: ${blurred}; with a session the monitor ticked ${perSecond === null ? 'at an unmeasured rate' : `${String(perSecond)} times a second`}`);
    if (!atTwo(perSecond)) {
      arm('the 2 s cadence', null, `the monitor ticked ${String(perSecond)} times a second with a session present, not every 2 s, so no arm can be read (blur: ${blurred})`);
      await end([metronome]);
      cdp.close();
      mainCdp?.close();
      return;
    }

    // ---- (a) each question, one at a time ---------------------------------
    for (const q of QUESTIONS) {
      await section('a', q.id, async (live) => {
        const screen = needFixture(q.fixture);
        const one = await launch(q.name, q.agent);
        live.push(one);
        const repaint = q.repaintMs === undefined ? [] : [{ op: 'repaint', everyMs: q.repaintMs }];
        if (q.turn) {
          await draw(one, idleOf(q.agent).idle, repaint);
          await turn(one, 6_000, screen);
        } else {
          await draw(one, screen, repaint);
        }
        const drawnAt = Date.now();
        const from = requests().length;
        // Only a question HEAD must raise is watched longer; every other one
        // is graded as the parent grades it.
        const graded = !AT_PARENT && q.raises === true;
        const seen = await watch(one, graded ? 45_000 : 30_000, (s) => s === 'needs_input');
        const pane = stillWhole(one);
        const amberMs = seen.first['needs_input'] === undefined ? null : seen.first['needs_input'] - drawnAt;
        const reading = { amberMs, statuses: seen.seen, screen: q.fixture, pane };
        if (amberMs === null) {
          const alerts = alertsFor(one, from).length;
          report.readings[`(a) ${q.id}`] = { ...reading, alerts };
          if (!graded) {
            return [{ id: `(a) ${q.id}`, ok: q.numbered === true ? true : alerts === 0,
              said: `${q.name} never read needs_input in 30 s and ${String(alerts)} alert(s) named it` +
                (q.numbered === true
                  ? ' (antigravity’s numbered question under its repaint: a reading, late or none, at both builds)'
                  : AT_PARENT
                    ? ' (expected none: the parent reads no shape)'
                    : ' (expected none at HEAD too: this shape was removed in the fix round)') }];
          }
          return [{ id: `(a) ${q.id}`, ok: false, said: `${q.name} never read needs_input in 45 s after ${q.fixture} was drawn (statuses ${seen.seen.join(', ')})` }];
        }
        const door = await doorHas(one);
        const panel = await panelHas(one);
        const until = Date.now() + 20_000;
        while (alertsFor(one, from).length === 0 && Date.now() < until) await sleep(300);
        await sleep(3_000);
        const alerts = alertsFor(one, from).length;
        report.readings[`(a) ${q.id}`] = { ...reading, door, panel, alerts };
        if (!graded) {
          return [{ id: `(a) ${q.id}`, ok: q.numbered === true,
            said: `${q.name} read needs_input ${String(amberMs)} ms after it was drawn; door ${String(door)}, ⌘J ${String(panel)}, ${String(alerts)} alert(s)` +
              (q.numbered === true
                ? ' (antigravity’s numbered question: caught this time, which its repaint allows at 2 s, at either build)'
                : AT_PARENT
                  ? ' — the parent read a shape it has no code for'
                  : ' — HEAD read a shape the fix round removed') }];
        }
        return [{ id: `(a) ${q.id}`, ok: door && panel && alerts === 1,
          said: `${q.name} read needs_input ${String(amberMs)} ms after ${q.fixture} was drawn; in the door’s blocked rows ${String(door)}, a ⌘J row ${String(panel)}, ${String(alerts)} push alert(s) naming it (expected exactly 1)` }];
      });
    }

    /** Launch grok, give it its helper, draw continuously, run one turn with a mid-turn tool, and rest. */
    async function grokAfterItsTurn(name, live) {
      const one = await launch(name, 'grok');
      live.push(one);
      const idle = idleOf('grok');
      await draw(one, idle.idle, [{ op: 'helper', seconds: CEILING_MS / 1000 }, { op: 'repaint', everyMs: 125 }]);
      await sleep(12_000);
      const before = await statusOf(one);
      const helpers = (stateOf(one.pid)?.helpers ?? []).filter((h) => h.live).length;
      await tell(one.pid, [{ op: 'repaint', everyMs: 0 }]);
      await turn(one, 10_000, idle.idle, [{ op: 'tool', seconds: 4, afterMs: 3_000 }]);
      return { one, before, helpers };
    }

    // ---- (b) grok after its turn, as today ------------------------------------
    // The operator's ruling of 2026-09-23 removed grok's resident-helper rule
    // whole, so its helper counts as a running tool on every poll, exactly as
    // the parent reads it. This arm is now the proof of that, at both builds.
    await section('b', 'grok after its turn', async (live) => {
      const { one, before, helpers } = await grokAfterItsTurn('g-grok', live);
      if (helpers < 1) throw new Unreadable('the grok stand-in reported no live helper, so there is nothing to read grok against');
      if (before !== 'running') throw new Unreadable(`grok read ${before} before its turn while it was drawing continuously, not running, so the arm has no baseline`);
      const rested = await watch(one, 45_000);
      await tell(one.pid, [{ op: 'tool', seconds: 14, afterMs: 0 }]);
      const later = await watch(one, 10_000, (s) => s === 'running');
      await sleep(14_000);
      const again = await watch(one, 30_000);
      report.readings.b = { before, restStatuses: rested.seen, toolAfterRest: later.last, againStatuses: again.seen };
      return [
        { id: '(b) grok after its turn, as today', ok: rested.seen.every((s) => s === 'running'),
          said: `before its turn grok read ${before}; after it, every poll for 45 s read ${rested.seen.join(', ')} (expected running only at BOTH builds: its helper counts as a tool, as it always has)` },
        { id: '(b) a tool born after the rest', ok: later.last === 'running' && again.seen.every((s) => s === 'running'),
          said: `a detached tool started after the rest: grok read ${later.last}; after it ended, ${again.seen.join(', ')} (expected running throughout, at both builds)` }
      ];
    });

    // ---- (c) his own words ------------------------------------------------
    await section('c', 'the answered trust box', async (live) => {
      const one = await launch('c-cursor-answered', 'cursor');
      live.push(one);
      await draw(one, needFixture('cursor-trust-gate.txt'));
      const asked0 = requests().length;
      const asked = await watch(one, 20_000, (s) => s === 'needs_input');
      // The raise's own alert is not the arm's: wait it out before the answer.
      const settle = Date.now() + 20_000;
      while (asked.first['needs_input'] !== undefined && alertsFor(one, asked0).length === 0 && Date.now() < settle) await sleep(300);
      await sleep(COALESCE_WAIT_MS);
      const from = requests().length;
      // The answer, as a person gives it: the key through tmux, cursor's
      // answered box drawn at once the way cursor draws it, and the app's own
      // notice that he typed, which is what releases a raised question.
      if (one.pane !== null) tmuxRun(['send-keys', '-t', one.pane, 'a']);
      await draw(one, needFixture('cursor-trust-answered.txt'));
      await cdpEval(cdp, `(window.gmux.noteTerminalInput ? window.gmux.noteTerminalInput(${J(one.id)}) : Promise.resolve()).then(() => true).catch(() => false)`);
      await sleep(4_000);
      const after = await watch(one, 40_000);
      stillWhole(one);
      const alerts = alertsFor(one, from).length;
      report.readings.c_answered = { askedFirst: asked.first['needs_input'] !== undefined, afterStatuses: after.seen, alerts };
      return [{ id: '(c) the answered trust box', ok: !after.seen.includes('needs_input') && alerts === 0,
        said: `the gate ${asked.first['needs_input'] === undefined ? 'was not raised' : 'was raised'} before the answer (its shape was removed in the fix round, so not raised is expected at both); for 40 s after the answered box was drawn main read ${after.seen.join(', ')} and ${String(alerts)} alert(s) named it (expected no needs_input at either build)` }];
    });

    await section('c', 'his own words in each input row', async (live) => {
      for (const f of TYPED_SHAPES) needFixture(f);
      const rows = [];
      for (const agent of ['cursor', 'qwen', 'opencode', 'antigravity', 'claude']) {
        const one = await launch(`w-${agent}`, agent);
        live.push(one);
        await draw(one, idleOf(agent).idle, [...(agent === 'antigravity' ? [{ op: 'repaint', everyMs: 2_000 }] : []), { op: 'input', on: true }]);
        rows.push(one);
      }
      const { one: grok } = await grokAfterItsTurn('w-grok', live);
      await tell(grok.pid, [{ op: 'input', on: true }]);
      rows.push(grok);
      await sleep(25_000);
      const cells = [];
      for (const file of TYPED_SHAPES) {
        // The question's own detector window, the last 24 inked rows, which
        // holds every row a shape reads (options, focus, hint, header), each
        // with its trailing blanks trimmed as a person would type it.
        const inked = loadScreen(fx(file)).map((r) => r.replace(/\s+$/, ''));
        while (inked.length > 0 && inked[inked.length - 1] === '') inked.pop();
        const text = inked.slice(-24).join('\n');
        const from = requests().length;
        for (const one of rows) await tell(one.pid, [{ op: 'clear-input' }]);
        // Key by key, in short bursts, every session at once, then the app's
        // own notice of his typing, as the terminal sends it for his keys.
        const chunks = text.match(/[\s\S]{1,24}/g) ?? [];
        for (const chunk of chunks) {
          for (const one of rows) typeLiteral(one.pane, chunk);
          await sleep(25);
        }
        for (const one of rows) {
          await cdpEval(cdp, `(window.gmux.noteTerminalInput ? window.gmux.noteTerminalInput(${J(one.id)}) : Promise.resolve()).then(() => true).catch(() => false)`);
        }
        await sleep(1_000);
        const numbered = Object.fromEntries(rows.map((one) => [one.name, parentDetectDialog(screenOf(one.pane))]));
        const amber = Object.fromEntries(rows.map((one) => [one.name, false]));
        const until = Date.now() + 18_000;
        while (Date.now() < until) {
          const now = await mainSessions();
          for (const one of rows) {
            if (now.find((s) => s.name === one.name)?.status === 'needs_input') amber[one.name] = true;
          }
          await sleep(700);
        }
        // The words cleared, as he would clear them, and every session let go
        // of before the next shape: a composition the numbered verdict reads
        // raises amber at both builds, and its push must land in THIS round.
        for (const one of rows) await tell(one.pid, [{ op: 'clear-input' }]);
        const letGo = Date.now() + 20_000;
        while (Date.now() < letGo && (await mainSessions()).some((s) => rows.some((o) => o.name === s.name) && s.status === 'needs_input')) {
          await sleep(700);
        }
        await waitQuiet(from);
        for (const one of rows) {
          stillWhole(one);
          cells.push({ shape: file, session: one.name, numbered: numbered[one.name], amber: amber[one.name], alerts: alertsFor(one, from).length });
        }
      }
      report.readings.c_words = cells;
      const graded = cells.filter((c) => !c.numbered);
      const wrong = graded.filter((c) => c.amber || c.alerts > 0);
      const ungraded = cells.filter((c) => c.numbered);
      return [{ id: '(c) his own words in each input row', ok: wrong.length === 0,
        said: `${String(cells.length)} typings (${String(TYPED_SHAPES.length)} shapes × ${String(rows.length)} sessions): ${String(graded.length)} graded, ${String(wrong.length)} of them amber or pushed` +
          (wrong.length > 0 ? ` (${wrong.map((c) => `${c.shape} in ${c.session}`).join('; ')})` : '') +
          `; ${String(ungraded.length)} read as a question by the parent’s own numbered verdict, the existing fault, reported and not graded (${String(ungraded.filter((c) => c.amber).length)} of them amber in this run)` }];
    });

    // ---- (d) controls -----------------------------------------------------
    await section('d', 'a pi row and a shell row', async (live) => {
      const pi = await launch('d-pi', 'pi');
      live.push(pi);
      const shell = await launch('d-shell', 'shell');
      live.push(shell);
      await draw(pi, idleOf('pi').idle);
      await turn(pi, 6_000, idleOf('pi').idle);
      const piSeen = await watch(pi, 40_000);
      const shellSeen = await watch(shell, 6_000);
      report.readings.d = { pi: piSeen.seen, shell: shellSeen.seen };
      return [
        { id: '(d) the pi row', ok: !piSeen.seen.includes('needs_input') && piSeen.last === 'idle',
          said: `pi worked for 6 s and rested: main read ${piSeen.seen.join(' then ')} (expected idle at rest, never needs_input, at both builds)` },
        { id: '(d) the shell row', ok: !shellSeen.seen.includes('needs_input') && shellSeen.last === 'idle',
          said: `the shell read ${shellSeen.seen.join(', ')} (expected idle, never needs_input, at both builds)` }
      ];
    });

    // ---- (e) the ceiling, which stands -----------------------------------
    // The window a session stays capturable in after its last work, read out
    // of the launched checkout's own source like the constants above.
    const PROBE_WINDOW_MS = constantOf('src/main/activity/state-machine.ts', 'AMBIGUOUS_WINDOW_MS') ?? 60_000;
    await section('e', 'the ceiling of six', async (live) => {
      const gate = needFixture('claude-workspace-trust.txt');
      const shapeQuestion = needFixture('qwen-run-permission.txt');
      const blocked = [];
      const isAmber = async (one) => (await mainSessions()).find((s) => s.name === one.name)?.status === 'needs_input';
      /** Launch numbered-gate claude sessions until `want` are blocked, or the arm cannot be read. */
      async function fillTo(want, tag) {
        let i = 0;
        while (blocked.length < want) {
          i += 1;
          const one = await launch(`e-claude-${tag}${String(i)}`, 'claude');
          live.push(one);
          await draw(one, gate);
          blocked.push(one);
        }
        const until = Date.now() + 90_000;
        let n = 0;
        while (Date.now() < until) {
          const now = await mainSessions();
          n = blocked.filter((o) => now.find((s) => s.name === o.name)?.status === 'needs_input').length;
          if (n === blocked.length) return n;
          await sleep(700);
        }
        throw new Unreadable(`only ${String(n)} of ${String(blocked.length)} claude sessions blocked on the numbered gate, so the six slots are not full`);
      }
      async function drop(one) {
        await end([one]);
        const at = live.indexOf(one);
        if (at >= 0) live.splice(at, 1);
        const b = blocked.indexOf(one);
        if (b >= 0) blocked.splice(b, 1);
      }

      // (e1) A shape question drawn under a full ceiling.
      const full = await fillTo(CAPTURES, 'a');
      await waitQuiet(0);
      const seventh = await launch('e-qwen-7', 'qwen');
      live.push(seventh);
      const from7 = requests().length;
      await draw(seventh, shapeQuestion);
      const drawn7 = Date.now();
      const s7 = await watch(seventh, 20_000, (s) => s === 'needs_input');
      stillWhole(seventh);
      const a7 = alertsFor(seventh, from7).length;

      // (e2) THE TRADE, INSIDE THE SEVENTH'S PROBE WINDOW: one slot freed 20 s
      // after the draw, well inside the window, then an eighth numbered
      // question.
      await drop(blocked[blocked.length - 1]);
      const freedAfter7 = Date.now() - drawn7;
      const s7b = await watch(seventh, 25_000, (s) => s === 'needs_input');
      await waitQuiet(from7);
      const eighth = await launch('e-claude-8', 'claude');
      live.push(eighth);
      const from8 = requests().length;
      await draw(eighth, gate);
      const s8 = await watch(eighth, 40_000, (s) => s === 'needs_input');
      const a8 = alertsFor(eighth, from8).length;

      // (e3) THE SAME, PAST THE WINDOW. Back to six blocked on numbered gates,
      // a shape question drawn and left longer than the window, then a slot
      // freed, then a numbered question.
      await drop(seventh);
      await drop(eighth);
      await fillTo(CAPTURES, 'b');
      await waitQuiet(0);
      const ninth = await launch('e-qwen-9', 'qwen');
      live.push(ninth);
      const from9 = requests().length;
      await draw(ninth, shapeQuestion);
      const drawn9 = Date.now();
      const s9 = await watch(ninth, PROBE_WINDOW_MS + 15_000, (s) => s === 'needs_input');
      stillWhole(ninth);
      await drop(blocked[blocked.length - 1]);
      const freedAfter9 = Date.now() - drawn9;
      const s9b = await watch(ninth, 25_000, (s) => s === 'needs_input');
      const a9 = alertsFor(ninth, from9).length;
      const tenth = await launch('e-claude-10', 'claude');
      live.push(tenth);
      const from10 = requests().length;
      await draw(tenth, gate);
      const s10 = await watch(tenth, 40_000, (s) => s === 'needs_input');
      const a10 = alertsFor(tenth, from10).length;
      const ninthAmberAtEnd = await isAmber(ninth);

      report.readings.e = {
        blocked: full,
        seventh: s7.seen,
        seventhAlerts: a7,
        freedAfterSeventhMs: freedAfter7,
        seventhAfterFree: s7b.seen,
        eighth: s8.seen,
        eighthAlerts: a8,
        windowMs: PROBE_WINDOW_MS,
        ninth: s9.seen,
        freedAfterNinthMs: freedAfter9,
        ninthAfterFree: s9b.seen,
        ninthAlerts: a9,
        tenth: s10.seen,
        tenthAlerts: a10
      };
      const seventhRaised = s7.seen.includes('needs_input');
      const seventhLater = s7b.seen.includes('needs_input');
      const eighthRaised = s8.seen.includes('needs_input');
      const ninthRaised = s9.seen.includes('needs_input') || s9b.seen.includes('needs_input') || ninthAmberAtEnd;
      const tenthRaised = s10.seen.includes('needs_input');
      if (freedAfter7 >= PROBE_WINDOW_MS) {
        throw new Unreadable(`the slot was freed ${String(freedAfter7)} ms after the seventh was drawn, not inside its ${String(PROBE_WINDOW_MS)} ms probe window`);
      }
      if (freedAfter9 <= PROBE_WINDOW_MS) {
        throw new Unreadable(`the slot was freed ${String(freedAfter9)} ms after the ninth was drawn, inside its ${String(PROBE_WINDOW_MS)} ms probe window`);
      }
      return [
        { id: '(e) a shape question under a full ceiling', ok: !seventhRaised && a7 === 0,
          said: `${String(full)} blocked on the numbered gate; the seventh (qwen’s confirmation) ${seventhRaised ? 'READ needs_input' : 'never read needs_input in 20 s'} and ${String(a7)} alert(s) named it (expected neither at either build: the ceiling stands)` },
        { id: '(e) the trade inside the probe window (a stated limit)',
          ok: AT_PARENT ? !seventhLater && eighthRaised : seventhLater && !eighthRaised,
          said: `one slot freed ${String(freedAfter7)} ms after the seventh was drawn: the waiting qwen question then ${seventhLater ? 'read' : 'never read'} needs_input, and an eighth numbered question ${eighthRaised ? 'read' : 'never read'} needs_input with ${String(a8)} alert(s) ` +
            (AT_PARENT
              ? '(expected at the parent: the qwen question is no question to it, so the numbered one takes the slot)'
              : '(expected at HEAD: the qwen question takes the slot and the numbered one waits, which is the limit SPEC §1.3 item 4 states)') },
        { id: '(e) a shape question left past the probe window', ok: !ninthRaised && a9 === 0 && tenthRaised,
          said: `a shape question drawn under a full ceiling and left ${String(freedAfter9)} ms, past the ${String(PROBE_WINDOW_MS)} ms window, ${ninthRaised ? 'READ needs_input' : 'never read needs_input'}, before or after a slot was freed, with ${String(a9)} alert(s); a numbered question drawn after ${tenthRaised ? 'took the slot' : 'was NOT raised'} with ${String(a10)} alert(s) (expected the same at both builds: past its window a question is never captured again, a shape one exactly like a numbered one)` }
      ];
    });

    // ---- (f) the reverify's hostile shells -----------------------------------
    // A qwen and a Claude Code session whose pane runs a login shell, as a
    // restored session before its resume does, and in it a program that prints
    // the agent's own committed question rows LAST and then blocks. The parent
    // reads no shape; HEAD asks one only while the agent holds the terminal.
    // So: no needs_input and no push at either build.
    const QUESTION_OF = { qwen: 'qwen-run-permission.txt', claude: 'claude-trust-2-1-280.txt' };
    const currentCommand = (pane) => (tmuxRun(['display-message', '-p', '-t', pane, '#{pane_current_command}']).stdout ?? '').trim();
    const lastInked = (rows) => {
      const inked = rows.map((r) => r.replace(/\s+$/, '')).filter((r) => r.trim() !== '');
      return inked[inked.length - 1] ?? '';
    };
    /** A session of a real registry row whose pane runs the login shell instead of the stand-in. */
    async function launchShell(name, agent) {
      writeFileSync(join(STANDIN_DIR, `shell-next-${agent}`), '1');
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(name)}, ${J(agent)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`);
      let row;
      for (let i = 0; i < 80 && row === undefined; i += 1) {
        row = (await mainSessions()).find((s) => s.name === name);
        if (row === undefined) await sleep(250);
      }
      if (row === undefined) throw new Unreadable(`Tortie never created the ${agent} session ${name}`);
      const pane = paneOf(row.tmuxName);
      if (pane === null) throw new Unreadable(`${name}: no pane`);
      let held = '';
      for (let i = 0; i < 80 && held !== 'zsh'; i += 1) {
        held = currentCommand(pane.paneId);
        if (held !== 'zsh') await sleep(250);
      }
      noteTree(pane.panePid);
      if (held !== 'zsh') {
        await cdpEval(cdp, `window.gmux.sessions.kill(${J(row.id)}).then(() => 'ok').catch(() => 'err')`);
        throw new Unreadable(`${name}: the pane held ${held || 'nothing'}, not the login shell, so the arm cannot be read`);
      }
      tmuxRun(['resize-window', '-t', pane.paneId, '-x', String(COLS), '-y', String(ROWS)]);
      return { name, agent, id: row.id, pid: 0, pane: pane.paneId, panePid: pane.panePid };
    }
    await section('f', 'a program in the shell prints the agent’s rows', async (live) => {
      const cells = [];
      for (const agent of ['qwen', 'claude']) {
        const rows = needFixture(QUESTION_OF[agent]) && loadScreen(fx(QUESTION_OF[agent]));
        const log = join(RUN, `rows-${agent}.txt`);
        writeFileSync(log, `${rows.join('\n')}\n`, 'utf8');
        const one = await launchShell(`f-${agent}`, agent);
        live.push(one);
        await sleep(2_000);
        const programs = [
          ['`tail -f` of a screen log', `tail -n +1 -f '${log}'`, 'tail'],
          ['`cat` of a screen log, then `sleep`', `clear; cat '${log}'; sleep 600`, 'sleep'],
          ['a watch-like loop over the log', `while :; do clear; cat '${log}'; sleep 60; done`, 'sleep']
        ];
        for (const [what, command, holder] of programs) {
          const from = requests().length;
          typeLiteral(one.pane, command);
          tmuxRun(['send-keys', '-t', one.pane, 'Enter']);
          await sleep(3_000);
          noteTree(one.panePid);
          const shown = lastInked(screenOf(one.pane).split('\n')) === lastInked(rows);
          const held = currentCommand(one.pane);
          const seen = await watch(one, 30_000, (s) => s === 'needs_input');
          const alerts = alertsFor(one, from).length;
          cells.push({ agent, what, shown, held, statuses: seen.seen, alerts });
          tmuxRun(['send-keys', '-t', one.pane, 'C-c']);
          await sleep(1_500);
          tmuxRun(['send-keys', '-t', one.pane, 'clear', 'Enter']);
          await waitQuiet(from);
          if (!shown || held !== holder) {
            throw new Unreadable(`${agent}, ${what}: the pane ${shown ? '' : 'did not show the question rows last'}${!shown && held !== holder ? ' and ' : ''}${held !== holder ? `held ${held || 'nothing'}, not ${holder}` : ''}, so the cell cannot be read`);
          }
        }
      }
      report.readings.f = cells;
      const wrong = cells.filter((c) => c.statuses.includes('needs_input') || c.alerts > 0);
      return [{ id: '(f) a program in the shell prints the agent’s rows last', ok: wrong.length === 0,
        said: `${String(cells.length)} cells (qwen and Claude Code; tail -f, cat then sleep, a watch-like loop), each with the question rows last and the program holding the terminal: ` +
          `${String(wrong.length)} read needs_input or pushed` + (wrong.length > 0 ? ` (${wrong.map((c) => `${c.agent} ${c.what}`).join('; ')})` : '') +
          ' (expected none at either build)' }];
    });

    await end([metronome]);
    cdp.close();
    mainCdp?.close();
  }

  await withElectron(
    {
      label: 'p321',
      userDataDir: PROFILE,
      cwd: CHECKOUT,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0'],
      env: withoutDevRenderer({
        ...STRIPPED,
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
        GMUX_HARNESS_DIR: HARNESS,
        GMUX_HARNESS_PUSH: PUSH_DIR,
        ...(vendored === null ? {} : { GMUX_TMUX_BIN: TMUX_WRAPPER })
      }),
      graceMs: 8_000,
      ceilingMs: CEILING_MS
    },
    async (handle) => {
      try {
        await body(handle);
      } finally {
        shimPid = handle.pid;
        try {
          appPid = handle.appPid();
        } catch {
          /* already recorded */
        }
      }
    }
  );
  ran = true;
} catch (err) {
  if (!(err instanceof Unreadable)) arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
} finally {
  if (standIn !== null) await standIn.close().catch(() => undefined);
  try {
    rmSync(KEY_FILE, { force: true });
  } catch {
    /* already gone */
  }
  // THE STAND-INS, THEIR HELPERS AND THEIR TOOLS, by pid. The teardown ended the
  // scratch server, which hangs every pane up, and each stand-in ends its own
  // children in its finally; a detached child outlives a hang-up, so anything
  // this run recorded that is still running with the same command line is
  // ended here, TERM then KILL.
  noteKids();
  const ended = await endByPid([...ours.keys()]);
  const survivors = [...ours].filter(([pid, cmd]) => commandOf(pid) === cmd).length;
  report.readings.processes = { seen: ours.size, leftAfterTeardown: ended.asked, neededKill: ended.killed, survivors };
  // THE SCRATCH SOCKET, the server and then the FILE (the reverify's finding:
  // it was never unlinked, and kill-server does not always take it; probe:p261
  // found the same). withElectron already ended the server; this is the belt
  // for a run that threw before it got there. The name is composed by this
  // file and the guard re-asks it, so nothing else can ever be the target.
  tmuxRun(['kill-server']);
  if (SOCKET.startsWith('gmux-p321-')) {
    const socketFile = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`, SOCKET);
    const existed = existsSync(socketFile);
    rmSync(socketFile, { force: true });
    report.readings.socket = { existedAfterTeardown: existed, left: existsSync(socketFile) };
  }
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

// ---- Electron, counted once, at the end ------------------------------------
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const oursElectron = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  if (appPid > 0 && (pid === appPid || ppid === appPid)) return true;
  if (shimPid > 0 && (pid === shimPid || ppid === shimPid)) return true;
  return commandOf(pid).includes(PROFILE);
});
report.readings.electron = { lines: electronLines.length, ofThisRun: oursElectron.length };
arm('no Electron of this run is left', oursElectron.length === 0,
  `${String(electronLines.length)} Electron line(s) on the machine (the operator’s own Tortie included), ${String(oursElectron.length)} of this run`);
arm('the scratch socket file is gone', report.readings.socket?.left === false,
  `the socket file under tmux-${String(process.getuid())} ${report.readings.socket === undefined ? 'was never looked for' : report.readings.socket.existedAfterTeardown ? 'was still there after the teardown and was unlinked here' : 'was already gone'}; ${report.readings.socket?.left === false ? 'nothing is left' : 'it is STILL THERE'}`);
arm('no stand-in, helper or tool of this run is left', (report.readings.processes?.survivors ?? 0) === 0,
  `${String(report.readings.processes?.seen ?? 0)} seen, ${String(report.readings.processes?.leftAfterTeardown ?? 0)} still up after the teardown were ended here by pid, ${String(report.readings.processes?.survivors ?? 0)} left`);
say(`model turns spent: ${String(report.turns)}`);

const OUT = join(ROOT, 'out', 'p321');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p321${AT_PARENT ? '-parent' : ''}.json`);
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (failures === 0 && unreadable > 0) {
  say(`probe:p321 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(!ran ? 'probe:p321 did not complete' : failures === 0 ? 'probe:p321 OK' : `probe:p321 FAILED ${String(failures)} arm(s)`);
process.exit(ran && failures === 0 ? 0 : failures > 0 ? 1 : 2);
