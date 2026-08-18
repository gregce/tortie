#!/usr/bin/env node
/**
 * `npm run probe:controldeadline`. Watch a live connection that is opened and
 * never greeted fall back to the timer feed (Phase 83).
 *
 * ## What only this can prove
 *
 * `TmuxControlClient` now arms a deadline the moment it spawns a child, and
 * gives up on that child when the greeting has not arrived inside
 * `CONTROL_GREETING_DEADLINE_MS`. In production that branch has no member: the
 * version gates refuse every real pair this tree has measured to hang, and they
 * refuse it before an attach is ever composed. A branch with no member is
 * exactly what a bundler folds away and exactly what a comment claims without
 * evidence. So this probe drives it.
 *
 * ## THIS IS A SIMULATION OF THE WIRE BEHAVIOUR, NOT A REAL CROSS-VERSION HANG
 *
 * The far side here is a small shell program this file writes. It answers
 * `display-message -p '#{version}'` with `3.7b`, so the precheck passes and the
 * control gate passes, and on a `-C` attach it prints nothing at all and holds
 * its output open. That is what a hang looks like on the wire: the child is
 * alive, the pipe is open, and the greeting block never arrives.
 *
 * The real cross-version hang was MEASURED in Phase 41 and is quoted at the top
 * of `src/main/tmux/version.ts` rather than re-run here. It reads:
 * "client 3.7b -> server 3.5a, control mode `-C new-session -A` prints `%exit`
 * and then HANGS. Still running after 8 s, killed by the probe."
 *
 * WHY THE PROGRAM HERE DOES NOT PRINT `%exit` FIRST, and this is a finding
 * rather than a shortcut. `TmuxControlClient.handleLine` already has a case for
 * `%exit`: it calls `handleDisconnect`, which kills the child, clears the
 * greeting deadline and schedules a reconnect. So a program that prints `%exit`
 * and then holds never reaches the deadline at all, and driving one would
 * measure the reconnect loop instead of the branch this phase added. Leg 4
 * below runs exactly that program for three seconds and prints what happened,
 * so the claim is measured rather than argued.
 *
 * ## Safety
 *
 *  1. The socket names `gmux` and `default` are refused by name, through
 *     `refuseRealSockets` in `build/scratch-machine.mjs`. That module is
 *     imported and never edited.
 *  2. The operator's own server is counted before and after with
 *     `tmux -L gmux list-sessions`, which is a read, and a moved number is a
 *     failure whatever else passed.
 *  3. Every process this file starts is recorded as it is created and killed by
 *     its recorded pid. There is no `pkill`, no `killall` and no `kill-server`
 *     anywhere in this file.
 *  4. Everything is written under one run directory, `<tmpdir>/p83-deadline-<pid>`.
 *     Nothing under the person's home is opened for writing.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { refuseRealSockets, scratchMachine, scratchYard } from './scratch-machine.mjs';

const WHO = 'probe-control-deadline';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const socket = process.env.GMUX_TMUX_SOCKET ?? `gmux-p83-deadline-${String(process.pid)}`;
refuseRealSockets(socket, WHO);

const runDir = join(tmpdir(), `p83-deadline-${String(process.pid)}`);
const pids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) pids.push(pid);
};

const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);

/** The operator's own sessions. A read, and the only thing this file asks it. */
function operatorSessions() {
  const out = spawnSync('/bin/sh', ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'], {
    encoding: 'utf8'
  });
  return Number((out.stdout ?? '0').trim());
}

const sessionsBefore = operatorSessions();
say(`[${WHO}] the operator has ${String(sessionsBefore)} session(s) on -L gmux. This is a read.`);
say(`[${WHO}] socket ${socket}, run directory ${runDir}`);

mkdirSync(runDir, { recursive: true, mode: 0o700 });

/**
 * The far side that never greets.
 *
 * It answers every command by printing `3.7b`, which is what the precheck and
 * the control gate need, and on `-C` it prints nothing and holds its output
 * open for two minutes. The hold is bounded rather than infinite so that
 * nothing this file starts can outlive the run by more than that.
 */
const hangingTmux = join(runDir, 'p83-hanging-tmux');
writeFileSync(
  hangingTmux,
  [
    '#!/bin/sh',
    '# Written by build/probe-control-deadline.mjs. It contacts nothing.',
    'for a in "$@"; do',
    '  if [ "$a" = "-C" ]; then',
    '    exec sleep 120',
    '  fi',
    'done',
    'echo 3.7b',
    'exit 0',
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(hangingTmux, 0o755);

/** The far side that prints `%exit` and then holds, for leg 4. */
const exitingTmux = join(runDir, 'p83-exiting-tmux');
writeFileSync(
  exitingTmux,
  [
    '#!/bin/sh',
    '# Written by build/probe-control-deadline.mjs. It contacts nothing.',
    'for a in "$@"; do',
    '  if [ "$a" = "-C" ]; then',
    "    printf '%%exit\\n'",
    '    exec sleep 120',
    '  fi',
    'done',
    'echo 3.7b',
    'exit 0',
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(exitingTmux, 0o755);

const yard = scratchYard({ root: runDir, prefix: 'p83', record });
const machine = scratchMachine(yard, { id: 'a', port: 47_831 });
machine.start();
say(`[${WHO}] a scratch machine is listening on 127.0.0.1:${String(machine.port)}`);

// Give sshd a moment to bind. A short wait is honest here: the alternative is a
// connection refused that reads as a broken machine.
execFileSync('/bin/sleep', ['1']);

/**
 * Tortie's own identity record for the scratch machine, written before any
 * connection so the client never has to be told to skip the check.
 */
const tortieHostKeys = join(runDir, 'p83-known-machines');
const userHostKeys = join(runDir, 'p83-user-known-hosts');
writeFileSync(
  tortieHostKeys,
  `[127.0.0.1]:${String(machine.port)} ${readFileSync(`${yard.hostKey}.pub`, 'utf8').trim()}
`,
  'utf8'
);
writeFileSync(userHostKeys, '', 'utf8');

/** One command on the scratch machine, over the person's own ssh client. */
function onMachine(command) {
  return spawnSync(
    '/usr/bin/ssh',
    [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      `UserKnownHostsFile=${tortieHostKeys}`,
      '-p',
      String(machine.port),
      '-l',
      machine.user,
      machine.host,
      command
    ],
    { encoding: 'utf8', timeout: 30_000, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
  );
}

// Leg 3 needs a real server on the far side, because the read that stands in
// front of a live connection asks that server for its version. Its pid is
// recorded here and it is killed by that pid at the end.
onMachine(`${yard.tmuxPath} -L ${socket} -f /dev/null new-session -d -s p83-warm`);
const serverPid = Number(
  (onMachine(`${yard.tmuxPath} -L ${socket} -f /dev/null display-message -p '#{pid}'`).stdout ?? '')
    .trim()
);
if (Number.isFinite(serverPid) && serverPid > 0) {
  record(serverPid);
  say(`[${WHO}] a scratch tmux server is running on that machine as pid ${String(serverPid)}`);
} else {
  fail('no server could be started on the scratch machine, so leg 3 has nothing to greet');
}

/**
 * The driver, written into the run directory rather than into the repository.
 *
 * It is TypeScript because the modules it drives are, and it names them by
 * absolute path so nothing is added to the tree. `npx tsx` is given the
 * repository's own `tsconfig.node.json`, which is where the `@shared/*` mapping
 * lives.
 */
const driver = join(runDir, 'p83-driver.mts');
writeFileSync(
  driver,
  `
import { readFileSync } from 'node:fs';
import {
  CONTROL_GREETING_DEADLINE,
  CONTROL_GREETING_DEADLINE_REASON,
  closeControlPlane,
  isControlPlaneLive,
  machineLinkFacts,
  missedGreetingThisRun,
  openControlPlane,
  setControlPlaneSink
} from '${repoRoot}/src/main/machines/control-plane';
import {
  registerRemoteMachineContext,
  setMachineRemotePath,
  type RemoteMachineContext
} from '${repoRoot}/src/main/machines/context';
import { composeControlPath } from '${repoRoot}/src/main/machines/ssh';
import {
  CONTROL_ATTACH_ARGS,
  CONTROL_GREETING_DEADLINE_MS,
  TmuxControlClient
} from '${repoRoot}/src/main/tmux/control-client';
import { execFileSync } from 'node:child_process';

const cfg = JSON.parse(readFileSync(process.env['P83_CONFIG'] as string, 'utf8'));
const out: Record<string, unknown> = { deadlineMs: CONTROL_GREETING_DEADLINE_MS };

function contextFor(id: string, program: string): RemoteMachineContext {
  return {
    kind: 'remote',
    machineId: id,
    sshBin: '/usr/bin/ssh',
    host: cfg.host,
    user: cfg.user,
    port: cfg.port,
    remoteTmuxPath: program,
    socket: cfg.socket,
    controlPath: composeControlPath({
      executionHash: id.padEnd(16, '0'),
      uid: process.getuid?.() ?? 0,
      dir: cfg.controlDir
    }),
    hostKeys: { tortie: cfg.tortieHostKeys, user: cfg.userHostKeys },
    acceptedTmuxVersion: null
  };
}

function arm(id: string, program: string): void {
  registerRemoteMachineContext(contextFor(id, program));
  // The plane refuses a machine whose program search list was never read, and
  // this driver composes the context by hand rather than preparing a machine.
  setMachineRemotePath(id, '/usr/bin:/bin:/usr/sbin:/sbin');
}

/** Children of this process whose command line names our control socket. */
function sshChildren(): number[] {
  try {
    // Every flag here is load bearing. Without -A this process has no
    // controlling terminal and ps lists almost nothing, and without the two w
    // flags macOS truncates the command to the terminal width, so the run
    // directory never appears in the line.
    const text = execFileSync('/bin/ps', ['-Aww', '-o', 'pid=,ppid=,command='], {
      encoding: 'utf8'
    });
    return text
      .split('\\n')
      .map((line) => line.trim())
      .filter((line) => line.includes(cfg.runDir) && line.includes('/usr/bin/ssh'))
      .map((line) => Number(line.split(/\\s+/)[0]))
      .filter((pid) => Number.isFinite(pid));
  } catch {
    return [];
  }
}

function alive(pid: number): boolean {
  const res = execFileSync('/bin/sh', ['-c', \`ps -p \${String(pid)} > /dev/null 2>&1; echo $?\`], {
    encoding: 'utf8'
  });
  return res.trim() === '0';
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  // ---- leg 1. The child that never greets ---------------------------------
  let lostAt: number | null = null;
  let lostReason: string | null = null;
  setControlPlaneSink({
    connected: () => undefined,
    sessionsChanged: () => undefined,
    sessionRenamed: () => undefined,
    lost: (id: string, reason: string) => {
      if (id !== 'hang') return;
      lostAt = Date.now();
      lostReason = reason;
    }
  });
  arm('hang', cfg.hangingTmux);
  const before = sshChildren().length;
  const opened = await openControlPlane('hang');
  const spawnedAt = Date.now();
  // The child is spawned by the time openControlPlane resolves, and a short
  // wait is still honest here: the process table is read by another program.
  await wait(400);
  const during = sshChildren();
  out['opened'] = opened;
  out['childrenBefore'] = before;
  out['childrenDuring'] = during.length;
  out['childPid'] = during[during.length - 1] ?? null;
  out['liveWhileHanging'] = isControlPlaneLive('hang');

  const limit = spawnedAt + CONTROL_GREETING_DEADLINE_MS + 8_000;
  while (lostAt === null && Date.now() < limit) await wait(50);
  out['msToFallback'] = lostAt === null ? null : lostAt - spawnedAt;
  out['lostReason'] = lostReason;
  out['lostSentenceIsTheDeadline'] = lostReason === CONTROL_GREETING_DEADLINE;
  await wait(300);
  const pid = out['childPid'] as number | null;
  out['childStillAlive'] = pid === null ? null : alive(pid);
  const facts = machineLinkFacts('hang');
  out['link'] = facts.link;
  out['linkReason'] = facts.reason;
  out['linkReasonIsTheClause'] = facts.reason === CONTROL_GREETING_DEADLINE_REASON;
  out['missedThisRun'] = missedGreetingThisRun('hang');

  // ---- leg 2. A second open for the same machine spawns nothing ------------
  const beforeSecond = sshChildren().length;
  out['secondOpen'] = await openControlPlane('hang');
  out['childrenAfterSecondOpen'] = sshChildren().length;
  out['secondOpenSpawnedNothing'] = sshChildren().length <= beforeSecond;

  // ---- leg 3. A healthy far side, for the number the budget is set against -
  let connectedAt: number | null = null;
  setControlPlaneSink({
    connected: () => {
      connectedAt = Date.now();
    },
    sessionsChanged: () => undefined,
    sessionRenamed: () => undefined,
    lost: () => undefined
  });
  arm('healthy', cfg.realTmux);
  const healthyStart = Date.now();
  await openControlPlane('healthy');
  const healthySpawned = Date.now();
  const healthyLimit = healthySpawned + 20_000;
  while (connectedAt === null && Date.now() < healthyLimit) await wait(20);
  out['remoteGreetingMs'] = connectedAt === null ? null : connectedAt - healthySpawned;
  out['remoteOpenMs'] = connectedAt === null ? null : connectedAt - healthyStart;
  out['remoteLive'] = isControlPlaneLive('healthy');
  closeControlPlane('healthy');

  // ---- leg 4. The program that prints %exit and then holds -----------------
  //
  // It measures why the simulation in leg 1 is silence rather than %exit.
  let exitDisconnects = 0;
  let exitTimeouts = 0;
  arm('exiter', cfg.exitingTmux);
  const exitClient = new TmuxControlClient({
    machineId: 'exiter',
    precheck: () => Promise.resolve(),
    plan: () =>
      Promise.resolve({
        file: '/usr/bin/ssh',
        argv: [
          '-p',
          String(cfg.port),
          '-o',
          'StrictHostKeyChecking=no',
          '-o',
          \`UserKnownHostsFile=\${cfg.tortieHostKeys}\`,
          \`\${cfg.user}@\${cfg.host}\`,
          \`\${cfg.exitingTmux} -C new-session\`
        ]
      }),
    env: () => process.env
  });
  exitClient.on('disconnected', () => {
    exitDisconnects += 1;
  });
  exitClient.on('greeting-timeout', () => {
    exitTimeouts += 1;
  });
  await exitClient.start();
  await wait(3_000);
  exitClient.stop();
  out['exitDisconnects'] = exitDisconnects;
  out['exitTimeouts'] = exitTimeouts;

  // ---- leg 5. A local control child, for the second number ----------------
  //
  // The transport is composed here rather than taken from
  // \`localControlTransport()\`, because that one calls \`ensureServer()\`, which
  // resolves the binary through Electron's own \`app\`. This driver is a plain
  // node process. The program and the argv below are the same ones that
  // transport composes, being the tmux on this Mac, the scratch socket and
  // \`resources/gmux-tmux.conf\`, so the number it measures is the number a
  // local control child takes to greet.
  const local = new TmuxControlClient({
    machineId: 'local',
    precheck: () => Promise.resolve(),
    plan: () =>
      Promise.resolve({
        file: cfg.realTmux,
        argv: ['-L', cfg.socket, '-f', cfg.confPath, ...CONTROL_ATTACH_ARGS]
      }),
    env: () => process.env
  });
  let localConnectedAt: number | null = null;
  local.on('connected', () => {
    localConnectedAt = Date.now();
  });
  const localStart = Date.now();
  await local.start();
  const localSpawned = Date.now();
  const localLimit = localSpawned + 20_000;
  while (localConnectedAt === null && Date.now() < localLimit) await wait(10);
  out['localGreetingMs'] = localConnectedAt === null ? null : localConnectedAt - localSpawned;
  out['localOpenMs'] = localConnectedAt === null ? null : localConnectedAt - localStart;
  local.stop();
  try {
    out['localServerPid'] = Number(
      execFileSync('/bin/sh', ['-c', \`tmux -L \${cfg.socket} display-message -p '#{pid}' 2>/dev/null\`], {
        encoding: 'utf8'
      }).trim()
    );
  } catch {
    out['localServerPid'] = null;
  }

  process.stdout.write('P83JSON' + JSON.stringify(out) + '\\n');
}

void main().then(
  () => process.exit(0),
  (err: unknown) => {
    process.stderr.write(String(err) + '\\n');
    process.exit(1);
  }
);
`,
  'utf8'
);

const config = {
  host: machine.host,
  user: machine.user,
  port: machine.port,
  socket,
  runDir,
  hangingTmux,
  exitingTmux,
  realTmux: yard.tmuxPath,
  confPath: join(repoRoot, 'resources', 'gmux-tmux.conf'),
  // MEASURED on this Mac: a unix socket path is capped at 104 bytes, and the
  // per user folder `tmpdir()` reports is 66 characters here before anything is
  // added, so a control socket under the run directory answered "too long for
  // Unix domain socket" on every command. It goes under `/tmp` instead, in a
  // directory named for this process, and it is removed by name at the end.
  controlDir: join('/tmp', `p83cd-${String(process.pid)}`),
  tortieHostKeys,
  userHostKeys
};
mkdirSync(config.controlDir, { recursive: true, mode: 0o700 });
writeFileSync(join(runDir, 'p83-config.json'), JSON.stringify(config, null, 2), 'utf8');

const run = spawnSync(
  'npx',
  ['tsx', '--tsconfig', join(repoRoot, 'tsconfig.node.json'), driver],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180_000,
    env: {
      ...process.env,
      P83_CONFIG: join(runDir, 'p83-config.json'),
      GMUX_TMUX_SOCKET: socket,
      SSH_AUTH_SOCK: yard.authSock
    }
  }
);

let data = null;
const marker = (run.stdout ?? '').indexOf('P83JSON');
if (marker >= 0) {
  const line = (run.stdout ?? '').slice(marker + 'P83JSON'.length).split('\n')[0] ?? '';
  try {
    data = JSON.parse(line);
  } catch {
    data = null;
  }
}

if (data === null) {
  fail('the driver printed no answer');
  process.stdout.write(`${run.stdout ?? ''}\n${run.stderr ?? ''}\n`);
}

// ---------------------------------------------------------------------------
// Clean up first, so a failure below never leaves a process behind
// ---------------------------------------------------------------------------

if (data !== null && typeof data.localServerPid === 'number' && data.localServerPid > 0) {
  record(data.localServerPid);
}
for (const pid of pids) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Already gone. Nothing to do, and nothing else is signalled.
  }
}
say(`[${WHO}] killed ${String(pids.length)} recorded pid(s): ${pids.join(', ')}`);
try {
  rmSync(machine.tmuxTmp, { recursive: true, force: true });
  rmSync(config.controlDir, { recursive: true, force: true });
  rmSync(runDir, { recursive: true, force: true });
} catch {
  // The run directory is under the temporary folder. Leaving it costs nothing.
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

if (data !== null) {
  say('');
  say('leg  what was measured                                    answer');
  say('-'.repeat(72));
  const row = (n, what, value) =>
    say(`${String(n).padEnd(4)} ${String(what).padEnd(52)} ${String(value)}`);
  row(1, 'the deadline this build carries, in ms', data.deadlineMs);
  row(1, 'ssh children before the connection was opened', data.childrenBefore);
  row(1, 'ssh children while the child was hanging', data.childrenDuring);
  row(1, 'the connection was live while it hung', data.liveWhileHanging);
  row(1, 'ms from spawn to the fallback', data.msToFallback);
  row(1, 'the sentence the feed was given is the deadline one', data.lostSentenceIsTheDeadline);
  row(1, 'the child was still alive afterwards', data.childStillAlive);
  row(1, "the machine's link reads", data.link);
  row(1, 'the clause beside it is the deadline clause', data.linkReasonIsTheClause);
  row(1, 'the machine is held off a connection for this run', data.missedThisRun);
  row(2, 'a second open answered', data.secondOpen);
  row(2, 'the second open spawned nothing', data.secondOpenSpawnedNothing);
  row(3, 'a healthy far side greeted in ms', data.remoteGreetingMs);
  row(3, 'the healthy connection reached live', data.remoteLive);
  row(4, 'a far side printing %exit produced disconnects', data.exitDisconnects);
  row(4, 'a far side printing %exit produced greeting timeouts', data.exitTimeouts);
  row(5, 'the local client greeted in ms', data.localGreetingMs);

  if (typeof data.msToFallback !== 'number') {
    fail('the connection never fell back to the timer feed. The deadline did not fire.');
  } else if (data.msToFallback > data.deadlineMs + 5_000) {
    fail(
      `the fallback took ${String(data.msToFallback)} ms against a ` +
        `${String(data.deadlineMs)} ms deadline.`
    );
  }
  if (data.lostSentenceIsTheDeadline !== true) {
    fail('the feed was told something other than the deadline sentence.');
  }
  if (data.childStillAlive !== false) {
    fail('the child was still alive after the deadline. The whole point is that it is not.');
  }
  if (data.link !== 'polling') {
    fail(`the machine's link reads ${String(data.link)} rather than polling.`);
  }
  if (data.linkReasonIsTheClause !== true) {
    fail('the clause a row would draw is not the deadline clause.');
  }
  if (data.secondOpen !== false || data.secondOpenSpawnedNothing !== true) {
    fail('a second open for the same machine started something.');
  }
  if (typeof data.remoteGreetingMs !== 'number') {
    fail('a healthy far side never greeted, so there is no number to set the budget against.');
  }
  if (typeof data.localGreetingMs !== 'number') {
    fail('the local client never greeted.');
  }
  if (data.exitTimeouts !== 0) {
    fail(
      'a far side printing %exit reached the greeting deadline. The header of ' +
        'this file says it does not, so one of the two is wrong.'
    );
  }
}

const sessionsAfter = operatorSessions();
say('');
say(
  `[${WHO}] the operator had ${String(sessionsBefore)} session(s) on -L gmux before and ` +
    `${String(sessionsAfter)} after.`
);
if (sessionsAfter !== sessionsBefore) {
  fail(
    `the operator's session count moved from ${String(sessionsBefore)} to ` +
      `${String(sessionsAfter)}. Nothing in this file may touch that server.`
  );
}

say('');
say('WHAT THIS DOES NOT PROVE. The timer feed itself lives in');
say('src/main/machines/remote-sessions.ts and this probe installs its own sink,');
say('so what leg 1 measured is that the control plane calls sink.lost with the');
say('deadline sentence. That call is the one that arms the timer, and the arming');
say('side of it is unchanged by this phase.');

if (failures.length > 0) {
  say('\nwhat the driver printed while it ran:');
  say((run.stdout ?? '').replace(/P83JSON.*$/m, '').trimEnd());
  say((run.stderr ?? '').trimEnd());
  say(`\nFAIL, ${String(failures.length)}:`);
  for (const one of failures) say(`  - ${one}`);
  process.exit(1);
}

say('\nPASS. A live connection that is never greeted is taken away, the machine');
say('keeps the timer feed, and nothing was started twice.');
