#!/usr/bin/env node
/**
 * The ten row fault matrix, the supervisor half (Phase 72, M5).
 *
 * Research 28 section 6.3 lists ten ways working on another machine goes wrong.
 * Section 6 of research 51 requires all ten to hold before Tortie is allowed to
 * bring back a session that lives on a machine. This script is the gate on
 * that. If it is not green, restore ships refused and the phase says so.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS HARNESS THE REMOTE MACHINE IS THIS MAC. A remote command reaching
 * `tmux -L gmux ...` would land on the server holding the operator's live
 * sessions.
 *
 *  1. It refuses to start when the socket it would use is `gmux` or `default`.
 *  2. It runs under `build/harness-socket.mjs --fresh`, and every Electron
 *     launch gets its own `--user-data-dir` inside this run's own root.
 *  3. It starts its OWN sshd per machine on 127.0.0.1 on a high port, with keys
 *     generated in this run's own directory. Each machine gets its own
 *     `TMUX_TMPDIR`, so a machine's sessions and this Mac's sessions are on
 *     different servers rather than on one server under two names.
 *  4. It kills only pids it recorded, and it prints the list. Never `pkill`,
 *     never `kill-server`.
 *  5. The operator's own server is read before and after: the session count,
 *     `history-limit` and `exit-empty`. All three identical, or the run fails
 *     whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * THE DIVISION OF WORK
 * ---------------------------------------------------------------------------
 * This script owns the machines and the faults. The app owns the moments,
 * because only it knows when a list is in the air. So the app writes a request
 * file and this script answers with the epoch millisecond it acted.
 *
 * The app writes FACTS, being numbers and named booleans. This script applies
 * the invariant for each row. The thing being measured never grades itself, and
 * every row also has to say how many rows it had under test, so an invariant
 * checked over nothing FAILS instead of printing a reassuring zero. That rule
 * is the fix Phase 71's verifier asked for after the partition harness proved
 * one of its invariants over an empty set.
 *
 * ---------------------------------------------------------------------------
 * FOUR LAUNCHES
 * ---------------------------------------------------------------------------
 *   seed    one session created on machine one and left running
 *   second  a second profile pointed at the same machine (row 3)
 *   cold    a launch with machine one down, on the seed profile (row 2)
 *   main    rows 1, 4, 5, 6, 7, 8, 9 and 10
 *
 * Usage:
 *   node build/remote-matrix.mjs              the whole matrix
 *   node build/remote-matrix.mjs --keep       leave the scratch root in place
 *   node build/remote-matrix.mjs --json <p>   write the full report
 *
 * Output: the ten row table with a number on every row, then PASS or FAIL.
 * Exit 0 only when all ten rows hold.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REAL_SOCKET,
  refuseRealSockets,
  scratchMachine,
  scratchYard,
  writeVersionStub
} from './scratch-machine.mjs';

import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rule 1. Refuse the two sockets nobody may touch, by name, before anything
// ---------------------------------------------------------------------------

const SOCKET =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p72-${String(process.pid)}`;

refuseRealSockets(SOCKET, 'p72');

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { keep: false, jsonPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--keep') out.keep = true;
    else if (argv[i] === '--json') out.jsonPath = argv[(i += 1)];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// The ten rows, with research 28's own wording beside the translation
// ---------------------------------------------------------------------------

/**
 * Research 28 wrote these for the REJECTED design, in which a whole Tortie runs
 * on the far side. Three of them name things that do not exist here. The
 * original and the translation are both printed, so a reader checks the
 * translation rather than taking it on trust.
 */
const ROWS = [
  {
    n: 1,
    id: 'matrix.transport-loss',
    leg: 'main',
    research: 'Transport loss on a healthy host',
    translated: false
  },
  {
    n: 2,
    id: 'matrix.unreachable-at-launch',
    leg: 'cold',
    research: 'Host unreachable at launch',
    translated: false
  },
  {
    n: 3,
    id: 'matrix.two-clients',
    leg: 'second',
    research: 'Two clients, one remote session',
    translated: false
  },
  {
    n: 4,
    id: 'matrix.restore-unreachable',
    leg: 'main',
    research: 'Restore against an unreachable host',
    translated: false
  },
  {
    n: 5,
    id: 'matrix.clock-skew',
    leg: 'main',
    research: 'Clock skew',
    // The far side of every connection here is this Mac, so its clock cannot be
    // moved. The program Tortie runs there is replaced by one that adds 48
    // hours to every time it reports, which is what a skewed machine looks like
    // from this side.
    translated: true
  },
  {
    n: 6,
    id: 'matrix.version-unmeasured',
    leg: 'main',
    research: 'Version mismatch',
    translated: false
  },
  {
    n: 7,
    id: 'matrix.remote-reboot',
    leg: 'main',
    research: 'Remote reboot',
    // Nothing here reboots this Mac. The program keeping the work alive on the
    // machine is ended instead, by the one pid this script recorded, which is
    // the state a reboot leaves behind.
    translated: true
  },
  {
    n: 8,
    id: 'matrix.untrusted-bytes',
    leg: 'main',
    research: 'Untrusted remote bytes',
    // A session on a machine created as a plain shell gets no argv, so the
    // bytes a shell was asked to print were never printed. A real agent
    // drawing its own screen on that machine prints them for real.
    translated: true
  },
  {
    n: 9,
    id: 'matrix.capture-cadence',
    leg: 'main',
    research: 'Capture cadence at scale',
    translated: false
  },
  {
    n: 10,
    id: 'matrix.forget-machine',
    leg: 'main',
    research: 'Move with a dirty tree',
    // THERE IS NO MOVE GESTURE IN THIS DESIGN. The translation is the gesture
    // with the same shape: one click that could throw away work the person
    // cannot see.
    translated: true
  }
];

// ---------------------------------------------------------------------------
// The run's own directory
// ---------------------------------------------------------------------------

const root = join(tmpdir(), `p72-matrix-${String(process.pid)}`);
mkdirSync(root, { recursive: true, mode: 0o700 });

const recordedPids = [];
const failures = [];

function killRecordedPids() {
  for (const pid of recordedPids) {
    if (typeof pid !== 'number' || !Number.isFinite(pid)) continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    process.stdout.write(
      `[p72] ${signal}: killing only the pids this run recorded: ` +
        `${recordedPids.join(', ')}\n`
    );
    killRecordedPids();
    process.exit(130);
  });
}

const say = (text) => process.stdout.write(`[p72] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p72] FAIL: ${text}\n`);
};

function sh(file, argv, options = {}) {
  const out = spawnSync(file, argv, {
    encoding: 'utf8',
    timeout: 60_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

// ---------------------------------------------------------------------------
// Rule 5. The operator's server, read only
// ---------------------------------------------------------------------------

function readOperatorServer() {
  const sessions = sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} list-sessions 2>/dev/null | wc -l | tr -d ' '`
  ]).stdout.trim();
  const history = sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} show-options -gv history-limit 2>/dev/null`
  ]).stdout.trim();
  const exitEmpty = sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} show-options -sv exit-empty 2>/dev/null`
  ]).stdout.trim();
  return { sessions, history, exitEmpty };
}

const operatorBefore = readOperatorServer();
say(
  `the operator's own server before: ${operatorBefore.sessions} session(s), ` +
    `history-limit ${operatorBefore.history || 'unset'}, exit-empty ` +
    `${operatorBefore.exitEmpty || 'unset'}`
);

// ---------------------------------------------------------------------------
// Rule 3. This run's own machines
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p72',
  record: (pid) => recordedPids.push(pid)
});
if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so the app cannot sign in at all');
}

const MACHINES = ['one', 'two'].map((id, index) =>
  scratchMachine(yard, { id, port: 39_000 + (process.pid % 400) * 2 + index })
);
/** The machine every fault is aimed at. `two` is the control and is never touched. */
const CUT = MACHINES[0];

for (const machine of MACHINES) {
  if (!machine.start()) {
    fail(
      `the scratch sign in server for machine ${machine.id} did not answer on ` +
        `port ${String(machine.port)}`
    );
    continue;
  }
  if (!machine.isolated()) {
    fail(
      `machine ${machine.id} keeps its sessions somewhere other than ` +
        `${machine.tmuxTmp}. Without that the machine and this Mac share one ` +
        `server and nothing below is measuring two machines.`
    );
  }
  say(
    `machine ${machine.id}: pid ${String(machine.pid)} on 127.0.0.1:` +
      `${String(machine.port)}, user ${yard.user}, program ${yard.tmuxPath}, ` +
      `sessions under ${machine.tmuxTmp}`
  );
}

/**
 * A program that reports every session time 48 hours ahead.
 *
 * The far side of every connection in this harness is this Mac, so its clock
 * cannot be moved and must not be. What a skewed machine looks like from here
 * is a machine whose answers carry times that do not match this Mac's clock,
 * and this is exactly that. It forwards everything else to the real program
 * unchanged, so the version check, the create and the stamps all behave the way
 * they do on any other machine.
 */
function writeSkewShim() {
  const path = join(root, 'p72-skew-tmux');
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      '# Phase 72 fault matrix row 5. Adds 48 hours to the two session times',
      '# the list format prints, and forwards everything else untouched.',
      `REAL=${yard.tmuxPath}`,
      'SKEW=172800',
      'case " $* " in',
      '  *" list-sessions "*)',
      '    "$REAL" "$@" | awk -v s="$SKEW" \'NF>=3 { $2=$2+s; $3=$3+s } { print }\'',
      '    exit $?',
      '    ;;',
      'esac',
      'exec "$REAL" "$@"',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(path, 0o755);
  return path;
}

/**
 * What a session on the machine is made to print.
 *
 * A bell, a screen clear, a colour, a title change and 4096 random bytes as
 * printable text. Every one of them is a terminal INSTRUCTION rather than text,
 * which is the whole of what row 8 is about, and none of them can leave the
 * pane. It is typed by the supervisor from the machine's own side.
 */
const NOISE_COMMAND =
  'printf "\\007\\033[2J\\033[31m\\033]0;p72\\007"; ' +
  'head -c 4096 /dev/urandom | base64';

const skewTmuxPath = writeSkewShim();
const stubTmuxPath = writeVersionStub(root, 'p72');

// ---------------------------------------------------------------------------
// The app, one launch per leg
// ---------------------------------------------------------------------------

const requestPath = join(root, 'p72-request.json');
const ackPath = join(root, 'p72-ack.json');
const carriagePath = join(root, 'p72-carriage.json');


/**
 * How long each leg may take before it is killed and the run fails.
 *
 * The main leg carries row 9, which watches a busy link for 300 s and a quiet
 * one for 150 s, and row 8, which waits up to 240 s for a save. Forty minutes
 * is generous enough that a red result means the app did not do the thing
 * rather than that this script did not wait. A leg that hits its deadline is a
 * FAILURE, never a pass: a harness that could not finish has proved nothing.
 */
const DEADLINE_MS = { seed: 300_000, second: 300_000, cold: 300_000, main: 2_400_000 };

let served = 0;
/**
 * True while one request is being served.
 *
 * PHASE 72 FIX ROUND. The pump calls the server every 50 ms and the handler is
 * synchronous, but a `noise` request types into thirty sessions and takes
 * longer than one tick. Without this the same request would be served twice.
 */
let serving = false;

/**
 * Answer one request from the app.
 *
 * Three faults, and every one is aimed at machine `one` by name. A request for
 * any other machine is refused and recorded, so the machine that exists to stay
 * up cannot be reached from the app at all.
 */
function serveRequests() {
  let request;
  try {
    request = JSON.parse(readFileSync(requestPath, 'utf8'));
  } catch {
    return;
  }
  if (typeof request?.seq !== 'number' || request.seq <= served) return;
  if (serving) return;
  serving = true;
  try {
    serveOne(request);
  } finally {
    serving = false;
  }
}

function serveOne(request) {
  if (request.machine !== CUT.id) {
    fail(
      `the app asked for machine "${String(request.machine)}" and this run only ` +
        `touches "${CUT.id}"`
    );
  } else if (request.want === 'down') {
    CUT.stop();
    say(`${request.point}: the link to ${CUT.id} is cut`);
  } else if (request.want === 'up') {
    CUT.start();
    say(`${request.point}: the link to ${CUT.id} is back, pid ${String(CUT.pid)}`);
  } else if (request.want === 'noise') {
    // PHASE 72 FIX ROUND. Tortie composes NO argv for a session created as a
    // plain shell, so nothing the app asks a shell to print is ever printed and
    // rows 8 and 9 had nothing to save. The supervisor owns this machine, so it
    // types into the sessions from the machine's own side. That is also the
    // honest shape of the case: bytes appear on the far side that Tortie did
    // not put there.
    // The app names the sessions by the far side's own immutable identifier.
    // MEASURED 2026-08-17 with tmux 3.6a: a session name is not a valid target
    // for typing, `=name` answers "can't find pane", so the pane is looked up
    // instead. It is the same rule `src/main/tmux/sessions.ts` already records.
    const wanted = new Set(
      (Array.isArray(request.names) ? request.names : []).filter(
        (one) => typeof one === 'string' && one.length > 0
      )
    );
    // A SPACE SEPARATES THE TWO FIELDS, never a tab, and that is measured
    // rather than chosen. MEASURED 2026-08-18 with tmux 3.6a: the same
    // `list-panes -a -F` prints `$0 \t %0` from a shell with a locale in it and
    // `$0 _ %0` from one started with `env -i`, because tmux replaces a tab it
    // cannot classify. The verifier runs this whole harness under `env -i`, so
    // a tab here silently found no pane, typed into nothing, and rows 5, 8 and
    // 9 all graded a screen nobody had made print. Neither identifier can hold
    // a space, so a space is safe.
    const panes = new Map();
    for (const line of sh(
      yard.tmuxPath,
      [
        '-L',
        SOCKET,
        '-f',
        '/dev/null',
        'list-panes',
        '-a',
        '-F',
        '#{session_id} #{pane_id}'
      ],
      { env: { ...process.env, TMUX_TMPDIR: CUT.tmuxTmp } }
    ).stdout.split('\n')) {
      const [sessionId, paneId] = line.trim().split(/\s+/);
      if (sessionId === undefined || paneId === undefined) continue;
      if (!panes.has(sessionId)) panes.set(sessionId, paneId);
    }
    let typed = 0;
    for (const sessionId of wanted) {
      const paneId = panes.get(sessionId);
      if (paneId === undefined) continue;
      const out = sh(
        yard.tmuxPath,
        [
          '-L',
          SOCKET,
          '-f',
          '/dev/null',
          'send-keys',
          '-t',
          paneId,
          NOISE_COMMAND,
          'Enter'
        ],
        { env: { ...process.env, TMUX_TMPDIR: CUT.tmuxTmp } }
      );
      if (out.code === 0) typed += 1;
    }
    if (wanted.size > 0 && typed === 0) {
      fail(
        `${request.point}: none of the ${String(wanted.size)} session(s) on ` +
          `${CUT.id} could be made to print, so whatever that row grades next ` +
          `is graded over a screen nobody changed`
      );
    }
    say(
      `${request.point}: ${String(typed)} of ${String(wanted.size)} ` +
        `session(s) on ${CUT.id} were made to print, from ` +
        `${String(panes.size)} pane(s) the machine listed`
    );
  } else if (request.want === 'end-server') {
    // Rule 4 exactly as written. The pid is read from the program itself and
    // added to this run's own list before it is signalled. There is no
    // `kill-server` and no `pkill` in this file.
    const pid = CUT.serverPid(SOCKET);
    if (pid === null) {
      fail(`${request.point}: machine ${CUT.id} reported no program to end`);
    } else {
      recordedPids.push(pid);
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* already gone, which is the state that was asked for */
      }
      say(`${request.point}: the program on ${CUT.id} was ended, pid ${String(pid)}`);
    }
  } else {
    fail(`the app asked for "${String(request.want)}", which is not a fault here`);
  }
  served = request.seq;
  writeFileSync(ackPath, JSON.stringify({ seq: served, at: Date.now() }), 'utf8');
}

/** Sessions of Tortie's on one machine, read from the machine itself. */
function sessionsOnMachine(machine) {
  const out = sh(
    yard.tmuxPath,
    [
      '-L',
      SOCKET,
      '-f',
      '/dev/null',
      'list-sessions',
      '-F',
      '#{q:@gmux-id}'
    ],
    { env: { ...process.env, TMUX_TMPDIR: machine.tmuxTmp } }
  );
  return out.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
}

function runLeg(leg, profile, carriage) {
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  writeFileSync(carriagePath, JSON.stringify(carriage, null, 2), 'utf8');
  return withElectron(
    {
      label: `matrix ${leg}`,
      program: 'app',
      userDataDir: profile,
      cwd: REPO,
      env: {
        ...process.env,
        GMUX_SMOKE: 'remote-matrix',
        GMUX_CONFIG_ROOT: root,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_SKIP_USERDATA_MIGRATION: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        SSH_AUTH_SOCK: yard.authSock
      }
    },
    (handle) =>
      new Promise((resolveRun) => {
        const child = handle.child;
        recordedPids.push(child.pid);
        child.stdout.on('data', (b) => process.stdout.write(b.toString()));
        child.stderr.on('data', (b) => process.stderr.write(b.toString()));

        const pump = setInterval(serveRequests, 50);
        const deadline = setTimeout(() => {
          fail(`the ${leg} leg exceeded ${String(DEADLINE_MS[leg])} ms`);
          try {
            process.kill(child.pid, 'SIGKILL');
          } catch {
            /* already gone */
          }
        }, DEADLINE_MS[leg]);

        child.on('exit', (code, signal) => {
          clearInterval(pump);
          clearTimeout(deadline);
          setTimeout(() => {
            // Electron leaves a crash handler holding the write end of both pipes,
            // so the read ends never close and this process would stay alive with
            // nothing left to do. Measured in Phase 71 on the partition harness.
            child.stdout.destroy();
            child.stderr.destroy();
            resolveRun({ code, signal });
          }, 1_000);
        });
      })
  );
}

const machinesForApp = MACHINES.map((one) => ({
  id: one.id,
  host: '127.0.0.1',
  port: one.port,
  user: yard.user,
  remoteTmuxPath: yard.tmuxPath,
  cut: one.id === CUT.id
}));

const carriageFor = (leg) => ({
  leg,
  machines: machinesForApp,
  stubTmuxPath,
  skewTmuxPath
});

const seedProfile = join(root, 'profile-seed');
const secondProfile = join(root, 'profile-second');
const mainProfile = join(root, 'profile-main');

const legRuns = {};

/**
 * The first client's own session list, by size in bytes.
 *
 * Row 3's other half is that the FIRST client's row did not move while a second
 * one was looking at the same machine. A byte comparison is the whole of that
 * check, and it belongs here rather than in either app, because neither app can
 * see the other's profile.
 */
const seedDb = join(seedProfile, 'gmux', 'manifest.db');

function manifestFingerprint(path) {
  try {
    return `${String(readFileSync(path).length)} bytes`;
  } catch {
    return 'no manifest';
  }
}

// 1. Seed. One session on machine one, left running.
legRuns.seed = await runLeg('seed', seedProfile, carriageFor('seed'));
const manifestBefore = manifestFingerprint(seedDb);

// 2. A second Tortie, its own profile, pointed at the same machine (row 3).
legRuns.second = await runLeg('second', secondProfile, carriageFor('second'));
const manifestAfter = manifestFingerprint(seedDb);

// 3. The same profile as the seed, with machine one down (row 2).
CUT.stop();
legRuns.cold = await runLeg('cold', seedProfile, carriageFor('cold'));
CUT.start();

// 4. The eight rows that need a running app with both machines up.
legRuns.main = await runLeg('main', mainProfile, carriageFor('main'));

const sessionsOnCutAfter = sessionsOnMachine(CUT);
const sessionsOnSteadyAfter = sessionsOnMachine(MACHINES[1]);

// ---------------------------------------------------------------------------
// The verdict, computed here from the app's facts
// ---------------------------------------------------------------------------

function readLeg(leg) {
  try {
    return JSON.parse(readFileSync(join(root, `p72-${leg}.json`), 'utf8'));
  } catch {
    return null;
  }
}

const legs = {
  seed: readLeg('seed'),
  second: readLeg('second'),
  cold: readLeg('cold'),
  main: readLeg('main')
};

for (const [leg, run] of Object.entries(legRuns)) {
  if (run.code !== 0) {
    fail(
      `the ${leg} leg exited ${String(run.code)}${
        run.signal ? ` on ${run.signal}` : ''
      }`
    );
  }
  if (legs[leg] === null) fail(`the ${leg} leg wrote no report`);
  if (legs[leg]?.crashed !== undefined) {
    fail(`the ${leg} leg stopped part way through: ${String(legs[leg].crashed)}`);
  }
}

/** One row's facts, from whichever leg produced it. */
function factsOf(row) {
  const produced = legs[row.leg]?.rows ?? [];
  return produced.find((one) => one.id === row.id) ?? null;
}

/**
 * Every row's invariant, applied HERE.
 *
 * Each grader returns a list of the things that were wrong. The empty list is
 * the pass. Every grader begins by asking how many rows it had under test,
 * because an invariant with nothing under it has proved nothing and must fail
 * rather than print a reassuring zero.
 */
const GRADERS = {
  'matrix.transport-loss': (f) => {
    const bad = [];
    if ((f.rowsWatchedOnCut ?? 0) < 1) bad.push('no row on the cut machine was watched');
    if ((f.rowsWatchedOnOther ?? 0) < 1) bad.push('no row on the other machine was watched');
    if ((f.rowsWatchedHere ?? 0) < 1) bad.push('no row on this Mac was watched');
    const onCut = f.statusesOnCut ?? [];
    if (onCut.includes('restorable') || onCut.includes('exited')) {
      bad.push(`a row on the cut machine read ${onCut.join(', ')}`);
    }
    if (!onCut.includes('unknown')) bad.push('no row on the cut machine ever read unknown');
    if ((f.statusesOnOther ?? []).length > 1) {
      bad.push(`a row on the machine that was never cut moved: ${f.statusesOnOther.join(', ')}`);
    }
    if ((f.statusesHere ?? []).length > 1) {
      bad.push(`a row on this Mac moved: ${f.statusesHere.join(', ')}`);
    }
    if (f.toUnknownMs === null || f.toUnknownMs === undefined) {
      bad.push('no sample ever read the cut machine as unknown, so the link was not really cut');
    }
    if ((f.restoreOfferedWhileDown ?? 1) !== 0) {
      bad.push('restore was offered for a session on a machine Tortie cannot see');
    }
    if ((f.capturesWhileDown ?? 1) !== 0) {
      bad.push(`${String(f.capturesWhileDown)} save(s) ran while the link was down`);
    }
    return bad;
  },
  'matrix.unreachable-at-launch': (f) => {
    const bad = [];
    if ((f.rowsOnScreen ?? 0) < 1) bad.push('no row was on screen, so nothing was checked');
    const statuses = f.statuses ?? [];
    if (statuses.some((one) => one !== 'unknown')) {
      bad.push(`a row read ${statuses.join(', ')} for a machine that never answered`);
    }
    if ((f.restoreOffered ?? 1) !== 0) bad.push('restore was offered');
    if ((f.machineStatementLength ?? 0) < 20) bad.push('the row carries no sentence about the machine');
    if (f.localSessionsBefore !== f.localSessionsAfter) {
      bad.push('a session was created on this Mac for a machine that did not answer');
    }
    // PHASE 72 FIX ROUND. What must not move is what the session IS and how to
    // bring it back. The STATUS moves on purpose: a machine Tortie cannot see
    // writes `unknown` on every row it owns, durably, because that is what the
    // next launch has to believe before any machine answers. The first cut
    // asked for the row not to be written at all, which the design forbids, so
    // the row could not pass whatever the app did.
    if (f.rowIdentityUnchanged !== true) {
      bad.push(
        'the row’s name, folder, machine, program or create time was rewritten'
      );
    }
    const after = f.manifestStatusesAfter ?? [];
    if (after.length !== 1 || after[0] !== 'unknown') {
      bad.push(
        `the session list holds ${after.join(', ') || 'nothing'} for a machine ` +
          `that never answered, and every row must read unknown`
      );
    }
    return bad;
  },
  'matrix.two-clients': (f) => {
    const bad = [];
    if ((f.sessionsOnMachine ?? 0) < 1) {
      bad.push('the machine held no session of Tortie’s, so nothing was checked');
    }
    if ((f.manifestRowsThisProfileWrote ?? 1) !== 0) {
      bad.push('the second profile adopted the session by writing a row for it');
    }
    if ((f.restoreOffered ?? 1) !== 0) {
      bad.push('the second profile offered to bring back a session it did not create');
    }
    if ((f.killsSent ?? 1) !== 0) bad.push('the second profile ended something');
    if (manifestBefore === 'no manifest') {
      bad.push(
        'the first client wrote no session list at all, so "it did not change" ' +
          'was checked over nothing'
      );
    } else if (manifestBefore !== manifestAfter) {
      bad.push(
        `the first client's session list changed while the second one ran: ` +
          `${manifestBefore} then ${manifestAfter}`
      );
    }
    return bad;
  },
  'matrix.restore-unreachable': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 1) bad.push('no row was under test');
    if (f.refused !== true) bad.push('the restore was not refused');
    if (f.saysUnseen !== true) bad.push('the refusal did not say Tortie cannot see the machine');
    if (f.sshChildrenBefore !== f.sshChildrenAfter) {
      bad.push(
        `the refused restore started ${String(
          (f.sshChildrenAfter ?? 0) - (f.sshChildrenBefore ?? 0)
        )} process(es)`
      );
    }
    if (f.manifestUnchanged !== true) bad.push('the refused restore wrote to the session list');
    return bad;
  },
  'matrix.clock-skew': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 1) bad.push('no row was under test');
    // PHASE 72 FIX ROUND. The row asserts something about a SAVED COPY, so a
    // run with no copy in hand has asserted it over nothing. That is the
    // vacuous pass the verifier brief warns about and it is now a failure.
    if ((f.capsuleCapturedAtMs ?? 0) === 0) {
      bad.push(
        'no copy of that machine’s screen was saved, so the claim that a ' +
          'saved copy carries this Mac’s clock was checked over nothing'
      );
    }

    // The injection has to have landed, or everything below is measured on a
    // machine whose clock agrees with this one.
    if ((f.remoteReportedAheadMs ?? 0) < 47 * 60 * 60 * 1000) {
      bad.push(
        `the machine reported times only ${String(
          f.remoteReportedAheadMs
        )} ms ahead, so the skew was not really injected`
      );
    }
    if (f.capsuleIsInTheFuture === true) {
      bad.push('a saved output carries a time in the future, so it came from the other clock');
    }
    if ((f.machineSnapshotAheadMs ?? 0) > 60_000) {
      bad.push('what Tortie holds about the machine is stamped from the other clock');
    }
    if ((f.statusesTakenOver30s ?? []).length > 1) {
      bad.push(
        `the row moved while only the clock was wrong: ` +
          `${f.statusesTakenOver30s.join(', ')}`
      );
    }
    return bad;
  },
  'matrix.version-unmeasured': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 1) bad.push('no machine was under test');
    if (f.prepareClass !== 'version-unmeasured') {
      bad.push(`the machine was accepted with class ${String(f.prepareClass)}`);
    }
    if (f.serverStarted === true) bad.push('a program was started on it anyway');
    if ((f.optionsAsserted ?? 1) !== 0) bad.push('settings were written on it anyway');
    if (f.createRefused !== true) bad.push('create was not refused');
    if (f.attachRefused !== true) bad.push('attach was not refused');
    if (f.restoreRefused !== true) bad.push('restore was not refused');
    return bad;
  },
  'matrix.remote-reboot': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 1) bad.push('no row was under test');
    if (f.becameRestorable !== true) {
      bad.push('the row never became one Tortie offers to bring back');
    }
    const took = f.statusesTaken ?? [];
    // The rule the whole rung rests on: a lost link never writes a death. The
    // row may read unknown on the way, and it may end at restorable, but it
    // must never read exited.
    if (took.includes('exited')) bad.push(`the row read ${took.join(', ')}`);
    if (String(f.restoreRefusal ?? '') !== '') {
      bad.push(`the restore was refused: ${String(f.restoreRefusal)}`);
    }
    if (f.sessionIsBack !== true) bad.push('the session did not come back');
    if ((f.stampsMatched ?? 0) !== 4) {
      bad.push(`${String(f.stampsMatched)} of 4 identity marks read back`);
    }
    if ((f.envMatched ?? 0) !== 2) {
      bad.push(`${String(f.envMatched)} of 2 environment values read back`);
    }
    return bad;
  },
  'matrix.untrusted-bytes': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 1) bad.push('no row was under test');
    if ((f.capsulesStored ?? 0) < 1) bad.push('nothing was saved, so nothing was checked');
    if (f.capsuleReadsBackVerified !== true) {
      bad.push('the saved output did not read back through its own hash');
    }
    // PHASE 72 FIX ROUND. The injection has to have landed. Without this the
    // row graded a copy of a shell prompt and reported that no instruction
    // reached a person, which is true of a copy holding no instructions.
    if ((f.escapeBytesOnDisk ?? 0) < 1) {
      bad.push(
        'the saved copy holds no terminal instruction at all, so nothing ' +
          'untrusted was ever there to be checked'
      );
    }
    if ((f.escapeBytesShownToAPerson ?? 1) !== 0) {
      bad.push(
        `${String(f.escapeBytesShownToAPerson)} terminal instruction(s) reach ` +
          `the text a person is shown`
      );
    }
    if ((f.controlBytesShownToAPerson ?? 1) !== 0) {
      bad.push(
        `${String(f.controlBytesShownToAPerson)} control byte(s) reach the ` +
          `text a person is shown`
      );
    }
    if ((f.shownCharacters ?? 0) < 1) {
      bad.push('a person is shown nothing at all, so the strip removed everything');
    }
    if ((f.controlBytesInManifestRow ?? 1) !== 0) {
      bad.push(
        `${String(f.controlBytesInManifestRow)} terminal instruction byte(s) ` +
          `reached the session list`
      );
    }
    return bad;
  },
  'matrix.capture-cadence': (f) => {
    const bad = [];
    if ((f.sessions ?? 0) < 30) {
      bad.push(`${String(f.sessions)} session(s) were under test and the row needs 30`);
    }
    // PHASE 72 FIX ROUND. THE BOUND IS GRADED PER PASS, and each number is the
    // count of copies one pass of the product's own capture wrote with thirty
    // sessions listed. The first cut graded the count over five minutes of wall
    // clock, which was 0 on every run because nothing on that machine printed
    // anything, and 0 is below every cap.
    const perPass = f.perPass ?? [];
    if (perPass.length < 3) {
      bad.push(`${String(perPass.length)} pass(es) were driven and the row needs 3`);
    }
    if (!perPass.some((one) => one >= 1)) {
      bad.push(
        'no driven pass wrote a copy at all, so the bound below was checked ' +
          'over nothing'
      );
    }
    for (const [index, count] of perPass.entries()) {
      if (count > (f.perPassCap ?? 8)) {
        bad.push(
          `pass ${String(index + 1)} wrote ${String(count)} copies with ` +
            `${String(f.sessions)} sessions listed, over the bound of ` +
            `${String(f.perPassCap)}`
        );
      }
    }
    if ((f.totalOverThreePasses ?? Number.MAX_SAFE_INTEGER) > (f.cap ?? 24)) {
      bad.push(
        `${String(f.totalOverThreePasses)} copies over three passes, over the ` +
          `cap of ${String(f.cap)}`
      );
    }
    // With eight read per pass and thirty printed, the first passes after the
    // printing stops still have work to do. What must be true is that the work
    // ENDS: the passes settle to zero and stay there.
    const settling = f.copiesWhileSettling ?? [];
    if (settling.length === 0 || settling[settling.length - 1] !== 0) {
      bad.push(
        `the copies did not settle to zero with nothing printed: ` +
          `${settling.join(', ') || 'no pass ran'}`
      );
    }
    if ((f.copiesWhileQuiet ?? 1) !== 0) {
      bad.push(
        `${String(f.copiesWhileQuiet)} copy(ies) were written after the copies ` +
          `had already settled to zero`
      );
    }
    if (f.cadenceArmed !== true) bad.push('the cadence is not armed at all');
    if ((f.passesInFlightRightNow ?? 1) !== 0) {
      bad.push(
        `${String(f.passesInFlightRightNow)} pass(es) are still in flight after ` +
          `the row finished`
      );
    }
    return bad;
  },
  'matrix.forget-machine': (f) => {
    const bad = [];
    if ((f.rowsUnderTest ?? 0) < 2) bad.push('the row needs two live sessions under test');
    if ((f.manifestRowsBefore ?? 0) < 2) bad.push('the session list held fewer than two rows');
    if ((f.tombstonesWritten ?? 0) < 2) {
      bad.push(`${String(f.tombstonesWritten)} row(s) were kept as a record and 2 were needed`);
    }
    if ((f.commandsSentToMachine ?? 1) !== 0) {
      bad.push(`${String(f.commandsSentToMachine)} command(s) were sent to the machine`);
    }
    if ((f.rowsClaimingTheWorkEnded ?? 1) !== 0) {
      bad.push('a row claims the work on that machine ended');
    }
    if (f.sshChildrenAfter > f.sshChildrenBefore) {
      bad.push('removing the machine started a process');
    }
    // The half only this script can check. The app has let go of the machine,
    // so it cannot look at it any more, and this is the whole point of the row.
    if (sessionsOnCutAfter < 2) {
      bad.push(
        `the machine holds ${String(sessionsOnCutAfter)} session(s) of Tortie's ` +
          `after the removal and it must still hold at least 2`
      );
    }
    return bad;
  }
};

const table = [];
for (const row of ROWS) {
  const facts = factsOf(row);
  if (facts === null) {
    fail(`row ${String(row.n)} (${row.id}) produced no facts at all`);
    table.push({ ...row, verdict: 'MISSING', problems: ['no facts'], facts: {} });
    continue;
  }
  const problems = GRADERS[row.id](facts.facts ?? {});
  for (const problem of problems) fail(`row ${String(row.n)} ${row.id}: ${problem}`);
  table.push({
    ...row,
    verdict: problems.length === 0 ? 'pass' : 'FAIL',
    problems,
    facts: facts.facts ?? {},
    translation: facts.translation ?? '',
    notes: facts.notes ?? []
  });
}

// ---------------------------------------------------------------------------
// Rule 5, after
// ---------------------------------------------------------------------------

const operatorAfter = readOperatorServer();
for (const key of ['sessions', 'history', 'exitEmpty']) {
  if (operatorBefore[key] !== operatorAfter[key]) {
    fail(
      `the operator's own server changed: ${key} was ` +
        `"${operatorBefore[key]}" and is now "${operatorAfter[key]}"`
    );
  }
}
say(
  `the operator's own server after: ${operatorAfter.sessions} session(s), ` +
    `history-limit ${operatorAfter.history || 'unset'}, exit-empty ` +
    `${operatorAfter.exitEmpty || 'unset'}`
);

// ---------------------------------------------------------------------------
// Rule 4. Kill only what was recorded, and print it
// ---------------------------------------------------------------------------

for (const machine of MACHINES) {
  const pid = machine.serverPid(SOCKET);
  if (pid !== null) {
    recordedPids.push(pid);
    say(`machine ${machine.id} runs its program as pid ${String(pid)}`);
  }
}
killRecordedPids();
say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const pad = (value, width) => String(value).padEnd(width);

say('');
say('  #  research 28 section 6.3          verdict  what was measured');
say('-'.repeat(100));
for (const row of table) {
  say(
    `${String(row.n).padStart(3)}  ${pad(row.research, 32)} ${pad(
      row.verdict,
      8
    )} ${JSON.stringify(row.facts)}`
  );
  if (row.translated) {
    say(`     translated: ${row.translation}`);
  }
  for (const note of row.notes ?? []) say(`     note: ${note}`);
  for (const problem of row.problems) say(`     FAILED: ${problem}`);
}
say('');
say(
  `machine one holds ${String(sessionsOnCutAfter)} session(s) of Tortie's ` +
    `after the whole run, and machine two holds ${String(sessionsOnSteadyAfter)}.`
);
say(
  `the first client's session list read ${manifestBefore} before the second ` +
    `client ran and ${manifestAfter} after it.`
);
say(
  'EVERY NUMBER IN THIS RUN COMES FROM A SCRATCH SIGN IN SERVER ON THIS MAC ' +
    'OVER THE LOOPBACK ADDRESS. That reproduces a hung pipe. It says nothing ' +
    'about packet loss, roaming, or a laptop closing its lid.'
);

const full = {
  socket: SOCKET,
  root,
  machines: machinesForApp,
  operatorBefore,
  operatorAfter,
  rows: table,
  sessionsOnCutAfter,
  sessionsOnSteadyAfter,
  manifestBefore,
  manifestAfter,
  failures
};
if (args.jsonPath) {
  writeFileSync(args.jsonPath, JSON.stringify(full, null, 2), 'utf8');
  say(`wrote the full report to ${args.jsonPath}`);
}

if (args.keep) {
  say(`the scratch root is kept at ${root}`);
  for (const machine of MACHINES) {
    say(`machine ${machine.id} kept its sessions directory at ${machine.tmuxTmp}`);
  }
} else {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  for (const machine of MACHINES) machine.cleanup();
}

if (failures.length > 0) {
  say(`FAIL (${String(failures.length)})`);
  for (const one of failures) say(`  ${one}`);
  say(
    'THE MATRIX IS NOT GREEN. Research 51 section 6 requires all ten rows ' +
      'before Tortie brings back a session that lives on a machine, so restore ' +
      'ships refused until they hold.'
  );
  process.exit(1);
}
process.stdout.write(
  '[p72] PASS. All ten rows hold, and every one of them had rows under test.\n',
  () => process.exit(0)
);
