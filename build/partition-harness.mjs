#!/usr/bin/env node
/**
 * The partition harness, the supervisor half (Phase 71, M4).
 *
 * The fault harness kills the APP. This one kills the LINK. Everything Tortie
 * says about a machine it cannot reach rests on one rule from research 51
 * section 4.4, which is that a machine Tortie cannot see is a machine whose
 * sessions are UNKNOWN and never a machine whose sessions ended. Nothing in
 * this repository cut a live link before this script existed, so that rule was
 * proved by unit tests over a pure function and by nothing else.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS HARNESS THE REMOTE MACHINE IS THIS MAC. A remote command reaching
 * `tmux -L gmux ...` would land on the server holding the operator's live
 * sessions.
 *
 *  1. It refuses to start when the socket it would use is `gmux` or `default`.
 *  2. It runs under `build/harness-socket.mjs --fresh`, and the Electron launch
 *     gets its own `--user-data-dir` inside this run's own root.
 *  3. It starts its OWN sshd per machine on 127.0.0.1 on a high port, with keys
 *     generated in this run's own directory and its own `GMUX_CONFIG_ROOT`, so
 *     it depends on no other probe's leftovers. Each machine also gets its own
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
 * This script owns the sshd. The app owns the moments, because only it knows
 * when a list is in the air or when a create has been sent and not yet stamped.
 * So the app writes a request file and this script answers with the epoch
 * millisecond it acted, and every duration is measured from that number.
 *
 * The app samples the statuses at 250 ms into `p71-samples.jsonl`, because the
 * statuses live in that process. This script reads those samples and decides
 * the verdict, so the thing being measured never grades itself.
 *
 * Usage:
 *   node build/partition-harness.mjs                  the whole battery
 *   node build/partition-harness.mjs --point <name>   report one case only
 *   node build/partition-harness.mjs --keep           leave the scratch root
 *   node build/partition-harness.mjs --json <path>    write the full report
 *
 * Output: one JSON report per case on stdout, then a summary table with a
 * number on every row, then a PASS or FAIL line. Exit 0 only when every
 * invariant held in every case.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The keys, the agent, the sshd and the per machine sessions directory. One
// module, because `build/probe-execplane.mjs` and this file each had their own
// copy of the same forty lines and a third copy was about to be written for
// `npm run smoke:remote`. Its header holds the safety rules.
import {
  REAL_SOCKET,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rule 1. Refuse the two sockets nobody may touch, by name, before anything
// ---------------------------------------------------------------------------

const SOCKET =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p71-${String(process.pid)}`;

refuseRealSockets(SOCKET, 'p71');

// ---------------------------------------------------------------------------
// Flags, the same set the fault harness has
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { points: [], keep: false, jsonPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--point') out.points.push(argv[(i += 1)]);
    else if (a === '--keep') out.keep = true;
    else if (a === '--json') out.jsonPath = argv[(i += 1)];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

/** The five moments, in the order the app runs them. */
const ALL_POINTS = [
  'partition.control-idle',
  'partition.during-list',
  'partition.during-create',
  'partition.during-attach',
  'partition.recovery'
];

// ---------------------------------------------------------------------------
// The run's own directory
// ---------------------------------------------------------------------------

const root = join(tmpdir(), `p71-partition-${String(process.pid)}`);
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true, mode: 0o700 });

const recordedPids = [];
const failures = [];

/**
 * Kill everything this run started, and nothing else.
 *
 * It is wired to the two signals a person sends when they stop a run part way
 * through, because the scratch sshd is a long lived child and a run that is
 * interrupted would otherwise leave it listening. Only recorded pids are
 * signalled. There is no `pkill` anywhere in this file.
 */
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
      `[p71] ${signal}: killing only the pids this run recorded: ` +
        `${recordedPids.join(', ')}\n`
    );
    killRecordedPids();
    process.exit(130);
  });
}

const say = (text) => process.stdout.write(`[p71] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p71] FAIL: ${text}\n`);
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
// Rule 3. This run's own machine
// ---------------------------------------------------------------------------

/**
 * TWO scratch machines, and the second one is not decoration.
 *
 * The rule this harness exists for has two halves. The first is that a machine
 * Tortie cannot see holds `unknown` rows. The second is that one machine going
 * quiet moves NOTHING on any other machine. The second half cannot be measured
 * with one machine, so the first build of this file proved it over zero rows and
 * reported a pass. Machine `two` is never cut. Every case reads its rows and
 * fails when any of them moved.
 *
 * Each machine gets its own sessions directory, and that is the whole of the
 * isolation. In this harness the far side of every connection is this same Mac,
 * and the app composes the same socket NAME for a machine as it does for this
 * Mac, correctly, because on a real fleet those are different computers. Without
 * a directory per machine the "remote" server and the app's own local server
 * were one server: the single local session was listed back as a remote row, the
 * supervisor's local set came out empty, and the invariant that says no local
 * row moved ran over zero rows. `build/scratch-machine.mjs` writes the one line
 * of sshd configuration that does it, and every machine is asked over a real
 * connection to prove it took.
 */
const yard = scratchYard({
  root,
  prefix: 'p71',
  record: (pid) => recordedPids.push(pid)
});
if (yard.authSock === '') {
  fail('no ssh agent holds this run\u2019s key, so the app cannot sign in at all');
}

const MACHINES = ['one', 'two'].map((id, index) =>
  scratchMachine(yard, {
    id,
    port: 38_000 + (process.pid % 2000) * 2 + index
  })
);

/** The machine every case cuts. `two` is the control and is never touched. */
const CUT = MACHINES[0];

const me = yard.user;
const tmuxPath = yard.tmuxPath;

/** Cut one machine's link. Only ever the machine this run cuts. */
function stopSshd(machine) {
  machine.stop();
}

/** Put it back. A restart gets a new pid and the yard records that one too. */
function startSshd(machine) {
  return machine.start();
}

for (const machine of MACHINES) {
  if (!machine.start()) {
    fail(
      `the scratch sshd for machine ${machine.id} did not answer on port ` +
        String(machine.port)
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
    `scratch machine ${machine.id}: sshd pid ${String(
      machine.pid
    )} on 127.0.0.1:${String(machine.port)}, user ${me}, remote program ` +
      `${tmuxPath}, sessions under ${machine.tmuxTmp}`
  );
}

writeFileSync(
  join(root, 'p71-carriage.json'),
  JSON.stringify(
    {
      // The machine every case cuts, kept at the top level so a reader sees the
      // subject of the run first.
      host: '127.0.0.1',
      port: CUT.port,
      user: me,
      remoteTmuxPath: tmuxPath,
      machines: MACHINES.map((one) => ({
        id: one.id,
        host: '127.0.0.1',
        port: one.port,
        user: me,
        remoteTmuxPath: tmuxPath,
        cut: one.id === CUT.id
      }))
    },
    null,
    2
  ),
  'utf8'
);

// ---------------------------------------------------------------------------
// The app, and the request loop
// ---------------------------------------------------------------------------

const requestPath = join(root, 'p71-request.json');
const ackPath = join(root, 'p71-ack.json');
const samplesPath = join(root, 'p71-samples.jsonl');
const reportPath = join(root, 'p71-report.json');

const ELECTRON = join(
  REPO,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'MacOS',
  'Electron'
);

/**
 * How long the whole app leg may take before it is killed and the run fails.
 *
 * Fifteen minutes. Each of the five cases waits up to 90 s for the cut link to
 * become visible, holds it down for 3 s, and then waits up to 60 s for the
 * machine to answer again, so the worst case is a little over twelve minutes.
 * The deadline is a fixed number rather than an environment variable on
 * purpose: this rung adds no new `GMUX_*` name to the contract, and a harness
 * deadline is not something a person tunes.
 *
 * A launch that hits it is a FAILURE of the run, never a pass. A harness that
 * could not finish has proved nothing.
 */
const APP_DEADLINE_MS = 900_000;

let served = 0;

/**
 * Answer one request from the app.
 *
 * The answer carries the epoch millisecond the kill or the restart happened,
 * because the app measures every duration from that number and a duration
 * measured from the request instead would include this loop's own polling.
 */
function serveRequests() {
  let request;
  try {
    request = JSON.parse(readFileSync(requestPath, 'utf8'));
  } catch {
    return;
  }
  if (typeof request?.seq !== 'number' || request.seq <= served) return;
  // The app names the machine. It only ever names the one this run cuts, and
  // the lookup refuses anything else, so no request from the app can reach the
  // machine that exists to stay up.
  const machine = MACHINES.find((one) => one.id === (request.machine ?? CUT.id));
  if (machine === undefined || machine.id !== CUT.id) {
    fail(
      `the app asked for machine "${String(request.machine)}" and this run only ` +
        `cuts "${CUT.id}"`
    );
    served = request.seq;
    writeFileSync(
      ackPath,
      JSON.stringify({ seq: served, at: Date.now() }),
      'utf8'
    );
    return;
  }
  if (request.want === 'down') {
    stopSshd(machine);
    say(`${request.point}: link to ${machine.id} cut, sshd killed`);
  } else {
    startSshd(machine);
    say(
      `${request.point}: link to ${machine.id} back, sshd pid ` +
        String(machine.pid)
    );
  }
  served = request.seq;
  writeFileSync(ackPath, JSON.stringify({ seq: served, at: Date.now() }), 'utf8');
}

function runApp() {
  return new Promise((resolveRun) => {
    const child = spawn(
      ELECTRON,
      ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: REPO,
        env: {
          ...process.env,
          GMUX_SMOKE: 'partition',
          GMUX_CONFIG_ROOT: root,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_SKIP_USERDATA_MIGRATION: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1',
          SSH_AUTH_SOCK: yard.authSock
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    recordedPids.push(child.pid);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => {
      const text = b.toString();
      stdout += text;
      process.stdout.write(text);
    });
    // The app's own refusal sentence goes to stderr, so it is printed as it
    // arrives rather than collected and thrown away. A harness that hides the
    // one line saying why the app stopped is a harness nobody can debug.
    child.stderr.on('data', (b) => {
      const text = b.toString();
      stderr += text;
      process.stderr.write(text);
    });

    const pump = setInterval(serveRequests, 50);
    const deadline = setTimeout(() => {
      fail(`the app leg exceeded ${String(APP_DEADLINE_MS)} ms`);
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, APP_DEADLINE_MS);

    child.on('exit', (code, signal) => {
      clearInterval(pump);
      clearTimeout(deadline);
      setTimeout(() => {
        // MEASURED 2026-08-17 by the committer: without these two lines the
        // harness printed its whole report, printed PASS, and then never
        // returned. Electron leaves a `chrome_crashpad_handler` behind that
        // holds the WRITE end of both pipes, so the read ends never close and
        // two live handles keep this process alive with nothing left to do. A
        // gate that prints PASS and hangs cannot be run by anything, so the
        // pipes are dropped the moment the app itself is gone. Every byte has
        // already been read, because the handlers above collect on arrival.
        child.stdout.destroy();
        child.stderr.destroy();
        resolveRun({ code, signal, stdout, stderr });
      }, 1_000);
    });
  });
}

const appRun = await runApp();

// ---------------------------------------------------------------------------
// The verdict, computed here from the app's samples
// ---------------------------------------------------------------------------

function readSamples() {
  try {
    return readFileSync(samplesPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function readReport() {
  try {
    return JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    return null;
  }
}

const samples = readSamples();
const report = readReport();

if (appRun.code !== 0) {
  fail(
    `the app leg exited ${String(appRun.code)}${
      appRun.signal ? ` on ${appRun.signal}` : ''
    }`
  );
}
if (report === null) fail('the app wrote no report, so nothing was measured');

/** Every distinct status one session took inside one case and phase. */
function statusesOf(sessionId, point, phase) {
  const seen = new Set();
  for (const sample of samples) {
    if (sample.point !== point || sample.phase !== phase) continue;
    const status = sample.rows?.[sessionId];
    if (status !== undefined) seen.add(status);
  }
  return [...seen];
}

const wanted = args.points.length > 0 ? args.points : ALL_POINTS;
const rows = [];

for (const point of wanted) {
  const inCase = samples.filter((one) => one.point === point);
  const remoteIds = [
    ...new Set(inCase.flatMap((one) => one.remoteIds ?? []))
  ];
  const otherIds = [...new Set(inCase.flatMap((one) => one.otherIds ?? []))];
  // A row on this Mac is a row that is on neither machine. The app labels both
  // sets itself, from `session.machine.id`, so this subtraction never has to
  // guess which computer a row belongs to.
  const away = new Set([...remoteIds, ...otherIds]);
  const localIds = [
    ...new Set(
      inCase.flatMap((one) =>
        Object.keys(one.rows ?? {}).filter((id) => !away.has(id))
      )
    )
  ];
  const measured = report?.cases?.find((one) => one.point === point) ?? null;

  // Invariant 1. No row on the partitioned machine was ever `restorable` or
  // `exited` while the link was cut. This is the rule the whole rung rests on.
  const liedAbout = [];
  for (const id of remoteIds) {
    const took = statusesOf(id, point, 'partitioned');
    if (took.includes('restorable') || took.includes('exited')) {
      liedAbout.push(`${id} took ${took.join(', ')}`);
    }
  }
  if (liedAbout.length > 0) {
    fail(
      `${point}: a row on the partitioned machine was reported as over: ` +
        liedAbout.join('; ')
    );
  }

  // Invariant 2. No row on this Mac changed status at all. One machine going
  // quiet must never move a session that is not on it.
  //
  // The count is checked FIRST, and that check is the fix for a measured hole.
  // The first build of this harness gave the scratch machine the same tmux
  // server the app uses locally, so the single local session was listed back as
  // a remote row, this set came out empty, and the loop below ran over nothing
  // while the summary printed a reassuring zero. An invariant with no rows under
  // it has proved nothing, so it now fails instead of passing.
  if (localIds.length === 0) {
    fail(
      `${point}: no session on this Mac was watched, so "no local row moved" ` +
        `was checked over zero rows and proves nothing`
    );
  }
  const movedLocals = [];
  for (const id of localIds) {
    const took = [
      ...new Set([
        ...statusesOf(id, point, 'before'),
        ...statusesOf(id, point, 'partitioned')
      ])
    ];
    if (took.length > 1) movedLocals.push(`${id} took ${took.join(', ')}`);
  }
  if (movedLocals.length > 0) {
    fail(`${point}: a session on this Mac changed status: ${movedLocals.join('; ')}`);
  }

  // Invariant 2b. No row on the OTHER MACHINE changed status either.
  //
  // This is the half one machine could never measure. Machine `two` is up for
  // the whole run and nothing is ever asked of its link. A per machine reconcile
  // is the thing being tested: a reconcile that took the whole row set would
  // write `unknown` on its rows too when machine `one` went quiet, and this is
  // the invariant that would catch it.
  if (otherIds.length === 0) {
    fail(
      `${point}: no session on the second machine was watched, so the machine ` +
        `to machine isolation was checked over zero rows and proves nothing`
    );
  }
  const movedOthers = [];
  for (const id of otherIds) {
    const took = [
      ...new Set([
        ...statusesOf(id, point, 'before'),
        ...statusesOf(id, point, 'partitioned')
      ])
    ];
    if (took.length > 1) movedOthers.push(`${id} took ${took.join(', ')}`);
  }
  if (movedOthers.length > 0) {
    fail(
      `${point}: a session on the machine that was never cut changed status: ` +
        movedOthers.join('; ')
    );
  }

  // Invariant 3. Restore was refused everywhere on that machine.
  if (measured !== null && measured.restoreRefused === false) {
    fail(`${point}: restore was offered for a session on a machine Tortie cannot see`);
  }

  // Invariant 4. The partition was actually VISIBLE to the app.
  //
  // This is the invariant that catches a harness which did not really cut
  // anything, and it earned its place: killing the listener alone left every
  // connection that was already open still carrying bytes, so the app saw no
  // partition at all and every other invariant above passed by having nothing
  // to check. `partition.recovery` is exempt because it measures the way back.
  if (
    point !== 'partition.recovery' &&
    measured !== null &&
    measured.toUnknownMs === null
  ) {
    fail(
      `${point}: no sample ever read every row on the machine as unknown, so ` +
        `the link was not really cut and nothing below was measured`
    );
  }

  rows.push({
    point,
    samples: inCase.length,
    /** Rows watched on the machine this case cuts. */
    cutRows: remoteIds.length,
    /** Rows watched on the machine that is never cut. */
    otherRows: otherIds.length,
    /** Rows watched on this Mac. */
    localRows: localIds.length,
    toUnknownMs: measured?.toUnknownMs ?? null,
    localStatusChanges: movedLocals.length,
    otherStatusChanges: movedOthers.length,
    restoreRefused: measured?.restoreRefused ?? null,
    notes: measured?.notes ?? []
  });
  process.stdout.write(
    `${JSON.stringify({ case: point, ...rows[rows.length - 1] }, null, 2)}\n`
  );
}

if (samples.length === 0) {
  fail('the app recorded no samples, so no invariant was checked');
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

/**
 * Each scratch machine's own tmux server, recorded so the teardown reaches it.
 *
 * These servers were born inside this run's own `TMUX_TMPDIR` directories, so
 * nothing else on this Mac can be holding them, but a tmux server daemonises and
 * is therefore nobody's child. Reading the pid it reports and adding it to the
 * recorded list keeps rule 4 exactly as written: only recorded pids are
 * signalled, and there is still no `kill-server` and no `pkill` in this file.
 */
for (const machine of MACHINES) {
  const pid = machine.serverPid(SOCKET);
  if (pid !== null) {
    recordedPids.push(pid);
    say(`machine ${machine.id} runs its server as pid ${String(pid)}`);
  }
}

killRecordedPids();
say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);

// ---------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------

say('');
// Every count here is rows WATCHED, never changes seen. A zero in any of the
// three row columns is a failure above, so a reader cannot take an empty
// invariant for a clean one.
say(
  'point                       samples  rows on cut  rows on other  rows here  ' +
    'to-unknown  restore'
);
for (const row of rows) {
  say(
    `${row.point.padEnd(27)} ${String(row.samples).padStart(7)} ` +
      `${String(row.cutRows).padStart(12)} ${String(row.otherRows).padStart(14)} ` +
      `${String(row.localRows).padStart(10)} ` +
      `${(row.toUnknownMs === null ? 'n/a' : `${String(row.toUnknownMs)} ms`).padStart(11)} ` +
      `${String(row.restoreRefused === true ? 'refused' : 'OFFERED').padStart(8)}`
  );
  for (const note of row.notes) say(`  ${row.point}: ${note}`);
}

const full = {
  socket: SOCKET,
  root,
  machines: MACHINES.map((one) => ({
    id: one.id,
    port: one.port,
    tmuxTmp: one.tmuxTmp,
    cut: one.id === CUT.id
  })),
  operatorBefore,
  operatorAfter,
  rows,
  failures,
  appExit: appRun.code,
  samples: samples.length
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
  // These live under /tmp rather than under the root, for the socket path
  // length reason `build/scratch-machine.mjs` records, so they go by name.
  for (const machine of MACHINES) machine.cleanup();
}

if (failures.length > 0) {
  say(`FAIL (${String(failures.length)})`);
  for (const one of failures) say(`  ${one}`);
  process.exit(1);
}
// The exit is explicit on this side too, and for the same reason the pipes are
// dropped above. The failure arm already exits, so a run that passed would be
// the only one able to hang, which is the worst way round for a gate. The
// write is given its callback so the last line is flushed before the exit,
// because stdout to a pipe is asynchronous.
process.stdout.write('[p71] PASS\n', () => process.exit(0));
