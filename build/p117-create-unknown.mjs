#!/usr/bin/env node
/**
 * The supervisor half of `npm run smoke:p117` (Phase 117).
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES
 * ---------------------------------------------------------------------------
 * Let a create on another machine really succeed. Lose the reply. Make the
 * confirmation read unreachable. Restart Tortie. Prove the next run binds the
 * SAME immutable id to the session that machine is still running, and that no
 * second create was made.
 *
 * That is phase 1 of docs/audits/2026-08-20-electron-typescript-architecture.md,
 * which the operator ranked P0. Before Phase 117 the confirmation read had a
 * broad catch, every failure came back as `null`, the caller read `null` as
 * "nothing is running there", and the durable row was deleted while the session
 * kept running on the other machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS HARNESS THE REMOTE MACHINE IS THIS MAC. A remote command reaching
 * `tmux -L gmux ...` would land on the server holding the operator's live
 * sessions.
 *
 *  1. It refuses to start when the socket it would use is `gmux` or `default`.
 *  2. It runs under `build/harness-socket.mjs --fresh`, and both Electron
 *     launches get the same `--user-data-dir` inside this run's own root.
 *  3. It starts its OWN sshd on 127.0.0.1 on a high port, with keys generated
 *     in this run's own directory and its own `GMUX_CONFIG_ROOT`. The machine
 *     gets its own `TMUX_TMPDIR`, so its sessions and this Mac's sessions are on
 *     different servers rather than on one server under two names.
 *  4. It kills only pids it recorded, and it prints the list. Never `pkill`,
 *     never `kill-server`. The wrapper below kills two pids and both are named:
 *     the listener this run started, whose number this file writes down, and the
 *     wrapper's own sign in process, found by walking its own parents.
 *  5. The operator's own server is counted before and after. Equal, or the run
 *     fails whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * THE FAULT, AND WHY IT IS REAL RATHER THAN FORGED
 * ---------------------------------------------------------------------------
 * The machine row names a small program as its `remoteTmuxPath`, and this file
 * writes that program. It is a pass through for every command except two:
 *
 *  1. A `new-session` whose name begins with the ABSENT prefix. It prints one
 *     line and exits 1 without running tmux at all, so that session really is
 *     not there and the confirmation read that follows really finds nothing.
 *     That is the negative case, being a proven absence, whose row is deleted
 *     exactly as it always was.
 *  2. The FIRST `new-session` whose name begins with the LOST prefix. It runs
 *     the real tmux and lets the session be created, then ends the sign in
 *     server so nothing can dial in again, then ends its own sign in process so
 *     the answer to the create never comes back. It writes a stamp file first,
 *     so it never arms a second time.
 *
 * So the far side create really succeeded, the reply really was lost because the
 * transport really died under it, and the confirmation read that follows really
 * cannot reach the machine. No stderr is forged, and no fault seam is added to
 * production code.
 *
 * ---------------------------------------------------------------------------
 * THE DIVISION OF WORK
 * ---------------------------------------------------------------------------
 * This script owns the machine, the wrapper, the recorded pids and the verdict.
 * The Electron process owns the moments, because only it knows when a create
 * has been sent and not yet answered. It writes `p117-facts.json` and this file
 * reads it. The process being measured never grades itself, which is the
 * division `build/partition-harness.mjs` already uses.
 *
 * Usage:
 *   node build/p117-create-unknown.mjs            the whole run
 *   node build/p117-create-unknown.mjs --keep     leave the scratch root
 *   node build/p117-create-unknown.mjs --json <p> write the full report
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REAL_SOCKET,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rule 1. Refuse the two sockets nobody may touch, by name, before anything
// ---------------------------------------------------------------------------

const SOCKET =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p117-${String(process.pid)}`;

refuseRealSockets(SOCKET, 'p117');

function parseArgs(argv) {
  const out = { keep: false, jsonPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--keep') out.keep = true;
    else if (a === '--json') out.jsonPath = argv[(i += 1)];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// The run's own directory
// ---------------------------------------------------------------------------

const root =
  process.env['GMUX_CONFIG_ROOT'] ?? join(tmpdir(), `p117-${String(process.pid)}`);
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true, mode: 0o700 });

/** The two name prefixes the wrapper reads. They are values, not code. */
const ABSENT_PREFIX = 'p117-absent';
const LOST_PREFIX = 'p117-lost';

const recordedPids = [];
const failures = [];
const steps = [];

function killRecordedPids() {
  for (const pid of recordedPids) {
    if (typeof pid !== 'number' || !Number.isFinite(pid)) continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone, which is the state we wanted */
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    process.stdout.write(
      `[p117] ${signal}: killing only the pids this run recorded: ` +
        `${recordedPids.join(', ')}\n`
    );
    killRecordedPids();
    process.exit(130);
  });
}

const say = (text) => process.stdout.write(`[p117] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p117] FAIL: ${text}\n`);
};
const step = (number, what) => {
  steps.push({ step: number, what });
  say(`${String(number)}. ${what}`);
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

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} list-sessions 2>/dev/null | wc -l | tr -d ' '`
  ]).stdout.trim();
}

const operatorBefore = operatorSessions();

// ---------------------------------------------------------------------------
// Step 1. The scratch machine, and the wrapper that carries the fault
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p117',
  record: (pid) => recordedPids.push(pid)
});
if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so the app cannot sign in at all');
}

const machine = scratchMachine(yard, {
  id: 'one',
  port: 34_000 + (process.pid % 2000)
});

/** Where the wrapper reads the listener's pid, and where it stamps itself spent. */
const pidFile = join(root, 'p117-sshd.pid');
const stampFile = join(root, 'p117-armed.stamp');
const wrapper = join(root, 'p117-tmux');

/**
 * Write the program the machine row names as its tmux.
 *
 * It reads no value this run did not write itself, it removes nothing, and the
 * only two pids it can ever signal are the listener number in `pidFile` and one
 * of its own ancestors.
 */
function writeWrapper() {
  const text = [
    '#!/bin/sh',
    '# Phase 117. The far side program the machine row names as its tmux.',
    '# It is a pass through except for the two cases named in',
    '# build/p117-create-unknown.mjs. It is written by that file, it runs on',
    '# this same Mac, and it contacts nothing.',
    `REAL=${JSON.stringify(yard.tmuxPath)}`,
    `STAMP=${JSON.stringify(stampFile)}`,
    `PIDFILE=${JSON.stringify(pidFile)}`,
    `ABSENT=${JSON.stringify(ABSENT_PREFIX)}`,
    `LOST=${JSON.stringify(LOST_PREFIX)}`,
    'create=0',
    'absent=0',
    'lost=0',
    'for a in "$@"; do',
    '  if [ "$a" = "new-session" ]; then create=1; fi',
    '  case "$a" in',
    '    "$ABSENT"*) absent=1 ;;',
    '    "$LOST"*) lost=1 ;;',
    '  esac',
    'done',
    '',
    '# Case 1. The negative. tmux is never run, so the session really is not',
    '# there and the confirmation read that follows really finds nothing.',
    'if [ "$create" = 1 ] && [ "$absent" = 1 ]; then',
    '  echo "p117: this machine refused to start that session on purpose" >&2',
    '  exit 1',
    'fi',
    '',
    '# Case 2. The one create whose answer is lost. It arms once.',
    'if [ "$create" = 1 ] && [ "$lost" = 1 ] && [ ! -f "$STAMP" ]; then',
    '  : > "$STAMP"',
    '  "$REAL" "$@" >/dev/null 2>&1',
    '  # The listener this run started, by the number the supervisor wrote.',
    '  if [ -f "$PIDFILE" ]; then',
    '    kill -9 "$(cat "$PIDFILE")" 2>/dev/null',
    '  fi',
    '  # This connection own sign in process, found by walking this process',
    '  # own parents. Nothing else is ever signalled.',
    '  p="$PPID"',
    '  while [ -n "$p" ] && [ "$p" -gt 1 ]; do',
    '    n=$(ps -o comm= -p "$p" 2>/dev/null)',
    '    case "$n" in',
    '      *sshd*) kill -9 "$p" 2>/dev/null; break ;;',
    '    esac',
    '    p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d " ")',
    '  done',
    '  exit 1',
    'fi',
    '',
    'exec "$REAL" "$@"',
    ''
  ].join('\n');
  writeFileSync(wrapper, text, 'utf8');
  chmodSync(wrapper, 0o755);
}

writeWrapper();

if (!machine.start()) {
  fail(`the scratch sshd did not answer on port ${String(machine.port)}`);
}
if (!machine.isolated()) {
  fail(
    `the machine keeps its sessions somewhere other than ${machine.tmuxTmp}. ` +
      `Without that the machine and this Mac share one server and nothing ` +
      `below is measuring two machines.`
  );
}
writeFileSync(pidFile, String(machine.pid), 'utf8');

step(
  1,
  `the scratch machine is up: sshd pid ${String(machine.pid)} on ` +
    `127.0.0.1:${String(machine.port)}, user ${yard.user}, remote program ` +
    `${wrapper}, sessions under ${machine.tmuxTmp}. The operator's own server ` +
    `holds ${operatorBefore} session(s).`
);

writeFileSync(
  join(root, 'p117-carriage.json'),
  JSON.stringify(
    {
      host: '127.0.0.1',
      port: machine.port,
      user: yard.user,
      // THE WRAPPER, not the real tmux. This one line is the whole of the fault.
      remoteTmuxPath: wrapper,
      absentPrefix: ABSENT_PREFIX,
      lostPrefix: LOST_PREFIX
    },
    null,
    2
  ),
  'utf8'
);

// ---------------------------------------------------------------------------
// The two Electron launches
// ---------------------------------------------------------------------------


/**
 * How long one leg may take before it is killed and the run fails.
 *
 * Ten minutes. The prep leg makes two creates and one of them ends the link.
 * The verify leg waits for one bind. A leg that hits this is a FAILURE of the
 * run, never a pass: a harness that could not finish has proved nothing. It is
 * a fixed number rather than an environment variable, because this phase adds
 * no `GMUX_*` name to the contract and a harness deadline is not something a
 * person tunes.
 */
const LEG_DEADLINE_MS = 600_000;

/**
 * Record the helper processes a launch leaves behind, by this run's own path.
 *
 * A pid is added only when its command line carries the profile directory this
 * run created, so rule 4 is unchanged: only what this run started is ever
 * signalled, and there is still no `pkill` in this file.
 */
function recordCrashpadOf(profileDir) {
  const table = sh('/bin/ps', ['-ax', '-o', 'pid=,command=']).stdout;
  for (const line of table.split('\n')) {
    if (!line.includes(profileDir)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (recordedPids.includes(pid)) continue;
    recordedPids.push(pid);
  }
}

function runLeg(mode) {
  return withElectron(
    {
      label: `p117 ${mode}`,
      program: 'app',
      userDataDir: profile,
      cwd: REPO,
      env: {
        ...process.env,
        GMUX_SMOKE: mode,
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

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (b) => {
          const text = b.toString();
          stdout += text;
          process.stdout.write(text);
        });
        child.stderr.on('data', (b) => {
          const text = b.toString();
          stderr += text;
          process.stderr.write(text);
        });

        const deadline = setTimeout(() => {
          fail(`the ${mode} leg exceeded ${String(LEG_DEADLINE_MS)} ms`);
          try {
            process.kill(child.pid, 'SIGKILL');
          } catch {
            /* already gone */
          }
        }, LEG_DEADLINE_MS);

        child.on('exit', (code, signal) => {
          clearTimeout(deadline);
          setTimeout(() => {
            // MEASURED 2026-08-20 on this Mac: each launch leaves a
            // `chrome_crashpad_handler` behind, and it is not a child of anything
            // this run still holds once the app is gone, so the recorded list does
            // not reach it. It is found by the ONE thing that identifies it as this
            // run's, being this run's own profile path on its command line, and
            // only pids carrying that path are added. Nothing else on this Mac can
            // name a directory this run made.
            recordCrashpadOf(profile);
            // The same two lines build/partition-harness.mjs carries, and for the
            // same measured reason: Electron leaves a crashpad handler holding the
            // write end of both pipes, so the read ends never close and this
            // process would print its report and then never return.
            child.stdout.destroy();
            child.stderr.destroy();
            resolveRun({ code, signal, stdout, stderr });
          }, 1_000);
        });
      })
  );
}

// ---------------------------------------------------------------------------
// Steps 2, 3, 5, 6 and 7. The prep leg
// ---------------------------------------------------------------------------

const prep = await runLeg('p117-prep');
if (prep.code !== 0) {
  fail(
    `the prep leg exited ${String(prep.code)}${
      prep.signal ? ` on ${prep.signal}` : ''
    }`
  );
}
step(
  7,
  `the prep leg exited ${String(prep.code)}, so nothing it held in memory is ` +
    `carried into the second launch`
);

let facts = null;
try {
  facts = JSON.parse(readFileSync(join(root, 'p117-facts.json'), 'utf8'));
} catch {
  fail('the prep leg wrote no facts file, so nothing was measured');
}

// ---------------------------------------------------------------------------
// Step 4. The far side really holds the session, read with no ssh in the way
// ---------------------------------------------------------------------------

/** One command against the machine's OWN tmux server, directly on this Mac. */
function onMachine(argv) {
  return sh(yard.tmuxPath, ['-L', SOCKET, '-f', '/dev/null', ...argv], {
    env: { ...process.env, TMUX_TMPDIR: machine.tmuxTmp }
  });
}

/**
 * The pinned control session a live connection opens on every machine.
 *
 * It is `CONTROL_SESSION_NAME` in `src/main/tmux/control-client.ts`. The value
 * is written out here because this file is plain JavaScript and cannot import
 * the TypeScript module. A live connection is opened with
 * `new-session -A -s gmux-control`, so every machine Tortie is connected to
 * holds one session nobody created, and counting it would make every number
 * below one too many.
 */
const CONTROL_SESSION_NAME = 'gmux-control';

/**
 * Every session the machine holds, by its own tmux id, name and option stamp.
 *
 * The three fields are separated by single spaces, and that is safe here rather
 * than in general: every session this run creates is named by this run, and no
 * name it composes holds a space. The control session is left out.
 */
function farSideSessions() {
  const listed = onMachine([
    'list-sessions',
    '-F',
    '#{session_id} #{session_name} #{@gmux-id}'
  ]);
  if (listed.code !== 0) return [];
  return listed.stdout
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        tmuxId: parts[0] ?? '',
        tmuxName: parts[1] ?? '',
        gmuxId: parts[2] ?? ''
      };
    })
    .filter((row) => row.tmuxName !== CONTROL_SESSION_NAME);
}

/** The `GMUX_SESSION_ID` a session carries, read from its own environment. */
function paneStampOf(tmuxId) {
  const read = onMachine(['show-environment', '-t', tmuxId]);
  if (read.code !== 0) return '';
  for (const line of read.stdout.split('\n')) {
    if (line.startsWith('GMUX_SESSION_ID=')) {
      return line.slice('GMUX_SESSION_ID='.length);
    }
  }
  return '';
}

{
  const sessions = farSideSessions();
  if (sessions.length !== 1) {
    fail(
      `the machine holds ${String(sessions.length)} session(s) after the ` +
        `prep leg and it should hold exactly the one whose answer was lost: ` +
        `${
          sessions.map((one) => `${one.tmuxName}=${one.gmuxId}`).join(', ') ||
          'none'
        }`
    );
  }
  const only = sessions[0] ?? null;
  const stamp = only === null ? '' : paneStampOf(only.tmuxId);
  if (facts !== null && stamp !== facts.lostSessionId) {
    fail(
      `the session on that machine carries ${JSON.stringify(stamp)} as its ` +
        `GMUX_SESSION_ID and the create in the prep leg generated ` +
        `${JSON.stringify(facts.lostSessionId)}`
    );
  }
  if (only !== null && only.gmuxId !== '') {
    fail(
      `the session on that machine already carries @gmux-id ` +
        `${JSON.stringify(only.gmuxId)}. The answer was not lost after all, ` +
        `so the option stamp landed and nothing below is measuring a rescue.`
    );
  }
  step(
    4,
    `the machine really holds the session: 1 session, GMUX_SESSION_ID ` +
      `${stamp}, and no @gmux-id at all`
  );
}

// ---------------------------------------------------------------------------
// Step 8. The machine comes back
// ---------------------------------------------------------------------------

if (!machine.start()) {
  fail(`the scratch sshd did not come back on port ${String(machine.port)}`);
}
writeFileSync(pidFile, String(machine.pid), 'utf8');
step(8, `the sign in server is back, pid ${String(machine.pid)}`);

// ---------------------------------------------------------------------------
// Steps 9 to 14, then 6, in the verify leg
//
// The negative runs last rather than in the prep leg, because it needs a
// machine that ANSWERS and the prep leg's fault takes the machine away for the
// rest of that leg. The header of src/main/harness/p117-create-unknown.ts says
// so in the same words.
// ---------------------------------------------------------------------------

const verify = await runLeg('p117-verify');
if (verify.code !== 0) {
  fail(
    `the verify leg exited ${String(verify.code)}${
      verify.signal ? ` on ${verify.signal}` : ''
    }`
  );
}

/** The step lines the app printed, so the report holds its own evidence. */
for (const line of verify.stdout.split('\n')) {
  const hit = /^\[gmux-p117\] (6|9|1[0-4])\. (.*)$/.exec(line.trim());
  if (hit !== null) steps.push({ step: Number(hit[1]), what: hit[2] });
}

{
  const sessions = farSideSessions();
  const mine = sessions.filter(
    (one) => facts !== null && one.gmuxId === facts.lostSessionId
  );
  if (sessions.length !== 1 || mine.length !== 1) {
    fail(
      `after the whole run the machine holds ${String(sessions.length)} ` +
        `session(s), ${String(mine.length)} of them carrying the id the first ` +
        `launch generated. Exactly one of each is the answer, and anything ` +
        `else is a second create.`
    );
  }
}

// ---------------------------------------------------------------------------
// Step 15. Kill only what was recorded, and print it
// ---------------------------------------------------------------------------

{
  const pid = machine.serverPid(SOCKET);
  if (pid !== null) {
    recordedPids.push(pid);
    say(`the machine runs its session server as pid ${String(pid)}`);
  }
}

killRecordedPids();
say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);

const operatorAfter = operatorSessions();
if (operatorAfter !== operatorBefore) {
  fail(
    `the operator's own server held ${operatorBefore} session(s) and now ` +
      `holds ${operatorAfter}`
  );
}
step(
  15,
  `every recorded pid is ended and the operator's own server still holds ` +
    `${operatorAfter} session(s)`
);

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

say('');
say('step  what it proved');
for (const row of steps.sort((a, b) => a.step - b.step)) {
  say(`${String(row.step).padStart(4)}  ${row.what}`);
}

const full = {
  socket: SOCKET,
  root,
  machine: { port: machine.port, tmuxTmp: machine.tmuxTmp, wrapper },
  operatorBefore,
  operatorAfter,
  facts,
  steps,
  failures,
  prepExit: prep.code,
  verifyExit: verify.code
};
if (args.jsonPath) {
  writeFileSync(args.jsonPath, JSON.stringify(full, null, 2), 'utf8');
  say(`wrote the full report to ${args.jsonPath}`);
}

if (args.keep) {
  say(`the scratch root is kept at ${root}`);
  say(`the machine kept its sessions directory at ${machine.tmuxTmp}`);
} else {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  // This lives under /tmp rather than under the root, for the socket path
  // length reason build/scratch-machine.mjs records, so it goes by name.
  machine.cleanup();
}

if (failures.length > 0) {
  say(`FAIL (${String(failures.length)})`);
  for (const one of failures) say(`  ${one}`);
  process.exit(1);
}
// The exit is explicit for the reason the pipes are dropped above. The failure
// arm already exits, so a run that passed would be the only one able to hang,
// which is the worst way round for a gate.
process.stdout.write('[p117] PASS\n', () => process.exit(0));
