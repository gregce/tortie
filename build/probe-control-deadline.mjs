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
 *
 * ## PHASE 220. What this file gained, and what it did NOT repair
 *
 * The 0.99.0 audit recorded that this probe could not reach its subject, and
 * named separate loaded module instances as the cause. Measured again at
 * `b5cc017` (docs/research/82 §4), NEITHER half reproduced: the probe passed
 * twice, its source was byte identical to the audited commit, and a driver that
 * imported the same two modules the same two ways read its own registration
 * back. So nothing here is a repair of that break. What was true is that a leg
 * that has only ever been watched PASSING is not yet a check, and this file had
 * three such legs. It now carries three arms that can fail:
 *
 *   arm 0, the teardown  This file is run as a CHILD with `P83_FORCE_FAIL=1`,
 *                        which throws once an sshd, an ssh, a far side tmux
 *                        server and four directories are all held. The parent
 *                        reads the pids and directories the child recorded and
 *                        asks the machine whether any of them survived. That is
 *                        the audit's own shape: the probe died before its kill
 *                        loop and left both running.
 *   the readback         Every machine `arm()` registers is read back through
 *                        `remoteContextFor`, which is the control plane's own
 *                        export and the one `openControlPlane` calls. The
 *                        boundary the audit named answers before any child is
 *                        spawned rather than being inferred from a later leg.
 *   arm 6, the ablation  The same driver is run again over a COPY of `src` with
 *                        exactly one clause removed, being the line that arms
 *                        the greeting timer. Leg 1's readings must come back the
 *                        other way round. The arm asserts what the ablated build
 *                        DID first, being that it opened and spawned a child, so
 *                        a copy that will not load can never be mistaken for a
 *                        timer that was taken away.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { refuseRealSockets, scratchMachine, scratchYard } from './scratch-machine.mjs';
import { sshRun } from './ssh-run.mjs';
// PHASE 200. `tsxCli` is imported HERE, in the module that CALLS it. See the
// same repair in build/probe-key-install.mjs: it used to sit inside the
// generated driver's text, so the outer call site had no binding and this
// probe could never reach its subject.
import { tsxCli } from './ts-runner.mjs';

const WHO = 'probe-control-deadline';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const socket = process.env.GMUX_TMUX_SOCKET ?? `gmux-p83-deadline-${String(process.pid)}`;
refuseRealSockets(socket, WHO);

/**
 * PHASE 220. The two knobs the new arms need, and neither is for a person.
 *
 * `P83_FORCE_FAIL` makes this file throw AFTER its scratch machine and its
 * scratch tmux server are running, which is the exact shape the 0.98.0 audit
 * found leaking: the probe died before its own kill loop. The teardown arm
 * below runs this file that way as a child and then reads whether the pids it
 * had recorded are gone and the directories it had made were removed. The
 * child never runs the arm itself, which is what stops it recursing.
 *
 * `P83_PORT` exists only so the child binds a different loopback port from the
 * parent, because the parent's own machine starts after the child is gone and
 * a listener that has just been signalled is not always released the instant
 * its process is.
 */
const forceFail = process.env['P83_FORCE_FAIL'] === '1';
const machinePort = Number(process.env['P83_PORT'] ?? '47831');

const runDir = join(tmpdir(), `p83-deadline-${String(process.pid)}`);
const pids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) pids.push(pid);
};

const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);

// ---------------------------------------------------------------------------
// PHASE 200. The teardown runs on EVERY exit, not only the happy one
// ---------------------------------------------------------------------------
//
// This probe was dead at the 0.98.0 audit and it died AFTER it had started an
// sshd and a tmux server on its scratch machine, with a ReferenceError on its
// first driver call. Both were left running, because the kill loop and the
// directory removal live near the BOTTOM of this file. That is the same shape
// `build/electron-run.mjs` exists to stop for Electron, and CLAUDE.md's rule is
// the same: a probe that kills only on the happy path is a defect.
//
// `process.on('exit')` fires on a normal exit, on `process.exit()` and after an
// uncaught exception, so this covers the crash the audit found as well as a
// failed assertion. It is idempotent, kills ONLY pids this file recorded, and
// removes only directories this file made.
let tornDown = false;
/** Set once the run directory and the control directory exist. */
const scratchDirs = [];

/**
 * The pids descended from `pid`, deepest first, read off `ps` rather than
 * guessed. PHASE 200 added it because an sshd that has accepted a connection
 * has FORKED, and killing only the listener leaves the accepted session
 * running, reparented to launchd, where nothing this file recorded can find
 * it. Measured on 2026-09-02: one run left two `sshd-session: gdc` processes
 * behind exactly that way. The walk is done BEFORE anything is signalled,
 * because a child reparents the moment its parent dies.
 */
function descendantsOf(pid) {
  const table = spawnSync('/bin/ps', ['-Ao', 'pid,ppid'], { encoding: 'utf8' });
  const byParent = new Map();
  for (const line of (table.stdout ?? '').split('\n').slice(1)) {
    const m = /^\s*(\d+)\s+(\d+)/.exec(line);
    if (m === null) continue;
    const child = Number(m[1]);
    const parent = Number(m[2]);
    const kids = byParent.get(parent) ?? [];
    kids.push(child);
    byParent.set(parent, kids);
  }
  const out = [];
  const walk = (one) => {
    for (const kid of byParent.get(one) ?? []) {
      walk(kid);
      out.push(kid);
    }
  };
  walk(pid);
  return out;
}

function teardown() {
  if (tornDown) return;
  tornDown = true;
  // Deepest first, and the whole tree is read before the first signal.
  const tree = [];
  for (const pid of pids) {
    for (const one of descendantsOf(pid)) if (!tree.includes(one)) tree.push(one);
    if (!tree.includes(pid)) tree.push(pid);
  }
  for (const pid of tree) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Already gone. Nothing to do, and nothing else is signalled.
    }
  }
  for (const dir of scratchDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Under the temporary folder. Leaving it costs nothing.
    }
  }
  // PHASE 220. Leg 5 starts a LOCAL tmux server on this run's own socket, and
  // a server that is signalled does not unlink its socket file, so four inert
  // files named `gmux-p83-deadline-<pid>` were found sitting in the same folder
  // as the socket `gmux` after the measure step's runs. This removes exactly
  // one path: the socket this run named, in the folder tmux puts it in. The
  // three guards are the whole safety of it, and none of them is decoration —
  // the name must be this run's, it must not be a real socket, and the thing on
  // disk must be a socket rather than anything else.
  try {
    const own = join('/tmp', `tmux-${String(process.getuid?.() ?? 0)}`, socket);
    if (
      basename(own) === socket &&
      socket !== 'gmux' &&
      socket !== 'default' &&
      lstatSync(own).isSocket()
    ) {
      rmSync(own, { force: true });
    }
  } catch {
    // No socket file, or another user's folder. Either way nothing is removed.
  }
}

process.on('exit', teardown);
scratchDirs.push(runDir);

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

// ---------------------------------------------------------------------------
// PHASE 220. Arm 0: this file's teardown is watched running on a FAILING path
// ---------------------------------------------------------------------------
//
// `process.on('exit', teardown)` above is a claim, and until this arm the only
// evidence for it was that the happy path also called `teardown()` by hand. The
// 0.98.0 audit found this probe dead AFTER it had started an sshd and a tmux
// server, with both left running, so the failing path is the one that has to be
// watched rather than the one that already works.
//
// So the arm runs THIS FILE as a child with `P83_FORCE_FAIL=1`. The child gets
// as far as a listening sshd, a signed in ssh, a running tmux server on the far
// side and four scratch directories, prints what it recorded, and then throws.
// The parent reads that list and asks the machine, not the code, whether any of
// it is still there.
//
// It runs BEFORE the parent's own machine starts, so at no moment are two
// scratch sshds alive at once, and the child is given its own port.
const teardownArm = { ran: false, status: null, pids: [], dirs: [], alive: [], left: [] };
if (!forceFail) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, P83_FORCE_FAIL: '1', P83_PORT: String(machinePort + 1) }
  });
  teardownArm.ran = true;
  teardownArm.status = child.status;
  const at = (child.stdout ?? '').indexOf('P83TEARDOWN');
  if (at >= 0) {
    const line = (child.stdout ?? '').slice(at + 'P83TEARDOWN'.length).split('\n')[0] ?? '';
    try {
      const noted = JSON.parse(line);
      teardownArm.pids = Array.isArray(noted.pids) ? noted.pids : [];
      teardownArm.dirs = Array.isArray(noted.dirs) ? noted.dirs : [];
    } catch {
      // Left empty, and the assertion below names it.
    }
  }
  // A moment for the signalled tree to go. The reading is of the machine.
  execFileSync('/bin/sleep', ['1']);
  for (const pid of teardownArm.pids) {
    const r = spawnSync('/bin/sh', ['-c', `ps -p ${String(pid)} > /dev/null 2>&1; echo $?`], {
      encoding: 'utf8'
    });
    if ((r.stdout ?? '').trim() === '0') teardownArm.alive.push(pid);
  }
  for (const dir of teardownArm.dirs) if (existsSync(dir)) teardownArm.left.push(dir);
  say(
    `[${WHO}] the teardown arm ran this file with a deliberate failure: it recorded ` +
      `${String(teardownArm.pids.length)} pid(s) and ${String(teardownArm.dirs.length)} ` +
      `directory(ies), and left ${String(teardownArm.alive.length)} and ` +
      `${String(teardownArm.left.length)} of them behind.`
  );
}

const yard = scratchYard({ root: runDir, prefix: 'p83', record });
const machine = scratchMachine(yard, { id: 'a', port: machinePort });
machine.start();
// PHASE 200: the machine's own tmux temporary directory, named for the
// teardown as soon as it exists.
scratchDirs.push(machine.tmuxTmp);
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
  return sshRun({
    knownHosts: tortieHostKeys,
    caller: 'build/probe-control-deadline.mjs',
    argv: [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      '-p',
      String(machine.port),
      '-l',
      machine.user,
      machine.host,
      command
    ],
    timeout: 30_000,
    env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
  });
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

// PHASE 220. This is the deliberate failure the teardown arm above watches, and
// it is placed HERE on purpose: an sshd is listening, an ssh has signed in, a
// tmux server is running on the far side and four directories exist. Everything
// this file could leak, it is holding at this line. The throw is uncaught, which
// is the shape the audit found, and `process.on('exit')` is what has to catch it.
if (forceFail) {
  say(`P83TEARDOWN${JSON.stringify({ pids, dirs: scratchDirs })}`);
  throw new Error(
    'P83_FORCE_FAIL: a deliberate assertion failure, so the teardown can be watched ' +
      'on the path that is not the happy one. Nothing here is a defect.'
  );
}

/**
 * The driver, written into the run directory rather than into the repository.
 *
 * It is TypeScript because the modules it drives are, and it names them by
 * absolute path so nothing is added to the tree. `npx tsx` is given the
 * repository's own `tsconfig.node.json`, which is where the `@shared/*` mapping
 * lives.
 */
/**
 * PHASE 220. The driver's text, as a function of the source tree it drives.
 *
 * It used to name `${repoRoot}/src` inline. The ablation arm at the bottom of
 * this file runs the SAME driver over a COPY of the tree with one clause
 * removed, and a driver written twice would prove nothing about the driver the
 * real arm runs.
 */
function driverText(srcRoot) {
  return `
import { readFileSync } from 'node:fs';
import {
  CONTROL_GREETING_DEADLINE,
  CONTROL_GREETING_DEADLINE_REASON,
  closeControlPlane,
  isControlPlaneLive,
  machineLinkFacts,
  missedGreetingThisRun,
  openControlPlane,
  remoteContextFor,
  setControlPlaneSink
} from '${srcRoot}/main/machines/control-plane';
import {
  machineGeneration,
  registerRemoteMachineContext,
  setMachineRemotePath,
  type RemoteMachineContext
} from '${srcRoot}/main/machines/context';
import { composeControlPath } from '${srcRoot}/main/machines/ssh';
import {
  CONTROL_ATTACH_ARGS,
  CONTROL_GREETING_DEADLINE_MS,
  TmuxControlClient
} from '${srcRoot}/main/tmux/control-client';
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

const SEARCH_LIST = '/usr/bin:/bin:/usr/sbin:/sbin';

/**
 * What the control plane's OWN graph reads back for each machine this driver
 * armed. PHASE 220: the 0.99.0 audit said this driver's registration was
 * invisible to the graph that opens the plane and named separate loaded module
 * instances as the cause. The reading below is taken through
 * \`remoteContextFor\`, which is the control plane's export and the function
 * \`openControlPlane\` itself calls, rather than through the registry this file
 * wrote to. A graph that could not see the registration answers here, before any
 * child is spawned, instead of being inferred from a leg that failed later.
 */
const graphReads: Record<string, unknown> = {};

function arm(id: string, program: string): void {
  registerRemoteMachineContext(contextFor(id, program));
  // The plane refuses a machine whose program search list was never read, and
  // this driver composes the context by hand rather than preparing a machine.
  setMachineRemotePath(id, SEARCH_LIST);
  try {
    const seen = remoteContextFor(id);
    graphReads[id] = {
      program: seen.remoteTmuxPath === program,
      searchList: machineGeneration(id).remotePath === SEARCH_LIST,
      socket: seen.socket === cfg.socket,
      controlPath: seen.controlPath === contextFor(id, program).controlPath
    };
  } catch (err) {
    graphReads[id] = { threw: String(err) };
  }
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

  // PHASE 220. The ablation arm drives leg 1 and nothing else: with the
  // greeting timer removed there is no fallback to wait for, and legs 2 to 5
  // measure numbers the ablation does not change. The connection is closed
  // here because on that copy nothing else will close it.
  if (cfg.leg1Only === true) {
    closeControlPlane('hang');
    out['graphReads'] = graphReads;
    process.stdout.write('P83JSON' + JSON.stringify(out) + '\\n');
    return;
  }

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

  out['graphReads'] = graphReads;
  process.stdout.write('P83JSON' + JSON.stringify(out) + '\\n');
}

void main().then(
  () => process.exit(0),
  (err: unknown) => {
    process.stderr.write(String(err) + '\\n');
    process.exit(1);
  }
);
`;
}

const driver = join(runDir, 'p83-driver.mts');
writeFileSync(driver, driverText(`${repoRoot}/src`), 'utf8');

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
  userHostKeys,
  // PHASE 220. The full arm drives all five legs. The ablation arm below sets
  // this, and drives leg 1 alone.
  leg1Only: false
};
mkdirSync(config.controlDir, { recursive: true, mode: 0o700 });
// PHASE 200: named for the teardown as soon as it exists, so a throw between
// here and the report below still removes it.
scratchDirs.push(config.controlDir);
writeFileSync(join(runDir, 'p83-config.json'), JSON.stringify(config, null, 2), 'utf8');

const run = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', join(repoRoot, 'tsconfig.node.json'), driver],
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
  // PHASE 220. A prerequisite that was never met must say so rather than fall
  // off the end of a report full of blanks. `run.status` is null when the
  // driver was killed by its own timeout, and `run.signal` says which signal.
  fail(
    'the driver printed no answer ' +
      `(exit ${String(run.status)}, signal ${String(run.signal)}, ` +
      `${String((run.stderr ?? '').length)} bytes on stderr)`
  );
  process.stdout.write(`${run.stdout ?? ''}\n${run.stderr ?? ''}\n`);
}

// ---------------------------------------------------------------------------
// PHASE 220. The ablation arm: take the greeting timer away and leg 1 must fail
// ---------------------------------------------------------------------------
//
// ## Why this arm exists, stated plainly
//
// The 0.99.0 audit recorded that this probe could not reach its subject and
// named separate loaded module instances as the cause. Neither half reproduced
// at `b5cc017`: the probe passed twice, its source was byte identical to the
// audited commit, and `graphReads` above is the standing reading that the
// control plane's own graph sees what this driver registered. So this phase adds
// a GUARD rather than repairing a break, and this is the guard.
//
// A leg that passes proves nothing until it has been watched failing. So the
// same driver is run a second time over a COPY of `src` with exactly one clause
// removed, being the line that arms the greeting timer, and leg 1's readings
// must come back the other way round: no fallback inside the deadline plus its
// margin, and the held child still alive.
//
// ## What stops this arm passing for the wrong reason
//
// A copy that will not load, an import that does not resolve or a driver that
// throws would ALSO produce "no fallback", and that would be an ablation arm
// that can never fail. So the arm asserts what the ablated build DID do first:
// it opened the connection and it spawned the ssh child. Only then is the
// absence of a fallback read as the removed timer.
let ablated = null;
let ablationApplied = false;
let ablationHits = 0;
if (data !== null) {
  const ablRoot = join(runDir, 'ablated');
  mkdirSync(ablRoot, { recursive: true, mode: 0o700 });
  // A clone on this APFS volume, measured at 0.2 s for the 26 MB tree. `-c`
  // fails rather than silently copying on a file system that cannot clone, so
  // the plain copy is the fallback.
  let copied = spawnSync('/bin/cp', ['-Rc', join(repoRoot, 'src'), join(ablRoot, 'src')], {
    encoding: 'utf8'
  });
  if (copied.status !== 0) {
    copied = spawnSync('/bin/cp', ['-R', join(repoRoot, 'src'), join(ablRoot, 'src')], {
      encoding: 'utf8'
    });
  }
  const target = join(ablRoot, 'src', 'main', 'tmux', 'control-client.ts');
  const MARK = '    this.greetingTimer = setTimeout(() => {';
  if (copied.status !== 0 || !existsSync(target)) {
    fail(
      'the source tree could not be copied for the ablation arm, so nothing was ' +
        `ablated: ${String(copied.stderr ?? '').trim()}`
    );
  } else {
    const text = readFileSync(target, 'utf8');
    ablationHits = text.split(MARK).length - 1;
    if (ablationHits !== 1) {
      fail(
        `the ablation arm found ${String(ablationHits)} place(s) arming the greeting ` +
          'timer in src/main/tmux/control-client.ts, not 1. The clause it removes has ' +
          'moved, so this arm is no longer measuring the timer leg 1 measures.'
      );
    } else {
      writeFileSync(
        target,
        text.replace(
          MARK,
          `    return; // PHASE 220 ablation arm: the greeting timer is never armed\n${MARK}`
        ),
        'utf8'
      );
      ablationApplied = true;
    }
  }

  if (ablationApplied) {
    // MEASURED. The copy sits outside the repository, so node's own resolver
    // walked up from `<ablated>/src/main/log/index.ts`, found no node_modules
    // and answered `Cannot find module 'electron'` before a line of the driver
    // ran. One symbolic link to the repository's installed dependencies is the
    // whole fix, and it keeps the copy under the temporary folder rather than
    // putting 26 MB inside the checkout while other gates may be reading it.
    try {
      symlinkSync(join(repoRoot, 'node_modules'), join(ablRoot, 'node_modules'));
    } catch {
      // Already there from a previous attempt in this run; nothing to do.
    }
    // tsx reads compilerOptions only, and `@shared/*` has to point at the COPY
    // rather than at the repository, or half the graph would be the tree this
    // arm is not measuring.
    writeFileSync(
      join(ablRoot, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2023',
            module: 'ESNext',
            moduleResolution: 'bundler',
            types: ['node'],
            strict: true,
            esModuleInterop: true,
            isolatedModules: true,
            resolveJsonModule: true,
            skipLibCheck: true,
            noEmit: true,
            baseUrl: '.',
            paths: { '@shared/*': ['src/shared/*'] }
          }
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    const ablDriver = join(ablRoot, 'p83-driver-ablated.mts');
    writeFileSync(ablDriver, driverText(join(ablRoot, 'src')), 'utf8');
    // Its own control directory, so a stale control socket from the arm above
    // can never be what this arm measures.
    const ablControlDir = join('/tmp', `p83cd-abl-${String(process.pid)}`);
    mkdirSync(ablControlDir, { recursive: true, mode: 0o700 });
    scratchDirs.push(ablControlDir);
    const ablConfigPath = join(ablRoot, 'p83-config.json');
    writeFileSync(
      ablConfigPath,
      JSON.stringify({ ...config, leg1Only: true, controlDir: ablControlDir }, null, 2),
      'utf8'
    );
    const ablRun = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', join(ablRoot, 'tsconfig.json'), ablDriver],
      {
        cwd: ablRoot,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
          ...process.env,
          P83_CONFIG: ablConfigPath,
          GMUX_TMUX_SOCKET: socket,
          SSH_AUTH_SOCK: yard.authSock
        }
      }
    );
    const ablAt = (ablRun.stdout ?? '').indexOf('P83JSON');
    if (ablAt >= 0) {
      try {
        ablated = JSON.parse(
          (ablRun.stdout ?? '').slice(ablAt + 'P83JSON'.length).split('\n')[0] ?? ''
        );
      } catch {
        ablated = null;
      }
    }
    if (ablated === null) {
      fail(
        'the ablation arm printed no answer, so taking the greeting timer away ' +
          `proved nothing (exit ${String(ablRun.status)}, signal ${String(ablRun.signal)}): ` +
          `${String(ablRun.stderr ?? '').trim().split('\n').slice(0, 3).join(' | ')}`
      );
    } else {
      // Whatever the arm concludes, the child it left holding is this file's to
      // end. It is recorded before any assertion so a failure below still ends it.
      if (typeof ablated.childPid === 'number') record(ablated.childPid);
    }
  }
}

// ---------------------------------------------------------------------------
// Clean up first, so a failure below never leaves a process behind
// ---------------------------------------------------------------------------

if (data !== null && typeof data.localServerPid === 'number' && data.localServerPid > 0) {
  record(data.localServerPid);
}
// PHASE 200: the same teardown the exit handler runs, called here so the report
// below already describes a machine with nothing of this probe's left on it. It
// is idempotent.
teardown();
say(
  `[${WHO}] killed ${String(pids.length)} recorded pid(s) and their children: ` +
    `${pids.join(', ')}`
);

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

// PHASE 220. The teardown arm's verdict, read from the machine.
if (teardownArm.ran) {
  if (teardownArm.status === 0) {
    fail('the forced failure run exited 0. It is meant to fail, so this arm measured nothing.');
  }
  if (teardownArm.pids.length === 0 || teardownArm.dirs.length < 2) {
    fail(
      'the forced failure run never reached the line that records what it was holding ' +
        `(${String(teardownArm.pids.length)} pid(s), ${String(teardownArm.dirs.length)} ` +
        'directory(ies)), so its teardown was not watched over anything.'
    );
  }
  if (teardownArm.alive.length > 0) {
    fail(
      `a run that failed left ${String(teardownArm.alive.length)} process(es) running: ` +
        `${teardownArm.alive.join(', ')}. A probe that tidies only on the happy path is a defect.`
    );
  }
  if (teardownArm.left.length > 0) {
    fail(
      `a run that failed left ${String(teardownArm.left.length)} scratch director(ies) behind: ` +
        `${teardownArm.left.join(', ')}.`
    );
  }
}

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
  row(
    0,
    'the plane read back every registration this driver made',
    JSON.stringify(data.graphReads ?? null)
  );
  row(0, 'the forced failure run exited', teardownArm.status);
  row(
    0,
    'it held pid(s) / dir(s) when it threw',
    `${String(teardownArm.pids.length)} / ${String(teardownArm.dirs.length)}`
  );
  row(
    0,
    'of those, still alive / still on disk',
    `${String(teardownArm.alive.length)} / ${String(teardownArm.left.length)}`
  );
  row(6, 'the greeting timer was removed in N place(s)', ablationHits);
  row(6, 'the ablated build opened a connection', ablated === null ? null : ablated.opened);
  row(
    6,
    'the ablated build spawned an ssh child',
    ablated === null ? null : ablated.childrenDuring
  );
  row(6, 'ms from spawn to the fallback, ablated', ablated === null ? null : ablated.msToFallback);
  row(6, 'the ablated child was still alive', ablated === null ? null : ablated.childStillAlive);
  row(6, "the ablated machine's link reads", ablated === null ? null : ablated.link);

  // PHASE 220. The registration readback, asserted rather than printed. Every
  // machine this driver armed must be readable through the control plane's own
  // export, which is the claim the 0.99.0 audit said was false.
  {
    const reads = data.graphReads ?? {};
    const ids = Object.keys(reads);
    if (ids.length === 0) {
      fail('the driver armed no machine, or it read none of them back through the plane.');
    }
    for (const id of ids) {
      const one = reads[id];
      const every =
        one !== null &&
        typeof one === 'object' &&
        one.program === true &&
        one.searchList === true &&
        one.socket === true &&
        one.controlPath === true;
      if (!every) {
        fail(
          `the control plane's own graph did not read back the registration this ` +
            `driver made for ${id}: ${JSON.stringify(one)}. That is the boundary the ` +
            '0.99.0 audit named, and it would stop this probe reaching its subject.'
        );
      }
    }
  }
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

  // PHASE 220. The ablation arm's verdict. Order matters: what the ablated
  // build DID is asserted before what it did not, so a copy that never ran can
  // never be read as a timer that was removed.
  if (ablationApplied && ablated !== null) {
    if (ablated.opened !== true) {
      fail(
        'the ablated build never opened a connection, so its silence is a broken ' +
          'copy rather than a removed timer. This arm measured nothing.'
      );
    } else if (typeof ablated.childrenDuring !== 'number' || ablated.childrenDuring < 1) {
      fail(
        'the ablated build spawned no ssh child, so its silence is a broken copy ' +
          'rather than a removed timer. This arm measured nothing.'
      );
    } else if (typeof ablated.msToFallback === 'number') {
      fail(
        `the greeting timer was removed and the connection still fell back after ` +
          `${String(ablated.msToFallback)} ms. Leg 1 is measuring something other than ` +
          'the timer, so its pass is not evidence that the deadline works.'
      );
    } else if (ablated.childStillAlive !== true) {
      fail(
        'the greeting timer was removed and the held child died anyway, so leg 1 is ' +
          'not measuring what kills it.'
      );
    } else if (ablated.link === 'polling') {
      fail(
        "the greeting timer was removed and the machine's link still read polling, so " +
          'leg 1 is not measuring what moves it.'
      );
    }
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
say('keeps the timer feed, and nothing was started twice. The plane read back');
say('every registration this driver made, a run that threw with an sshd and a');
say('far side server in its hands left neither behind, and the same driver over');
say('a copy with the greeting timer removed did NOT fall back and left its child');
say('alive, so leg 1 is a reading that can fail.');
