/**
 * The second harness carriage. One real machine, named twice by the person who
 * runs it (Phase 83).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS MODULE EXISTS
 * ---------------------------------------------------------------------------
 * `build/scratch-machine.mjs` says in capitals that in every harness that uses
 * it the remote machine is this Mac. Every remote number Tortie recorded before
 * Phase 83 came from that carriage, so every one of them was measured against a
 * loopback sshd whose far side is the same computer, the same account, the same
 * filesystem and the same tmux build. That is a good gate and it is not a
 * second machine.
 *
 * This module is the second carriage. Its far side is a machine the person
 * names, and it starts nothing on import.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE REFUSALS, ASKED BEFORE ANYTHING IS CONTACTED
 * ---------------------------------------------------------------------------
 *  1. `GMUX_REAL_MACHINE_HOST` is unset or empty.
 *  2. `GMUX_REAL_MACHINE_CONFIRM` is not byte equal to `GMUX_REAL_MACHINE_HOST`.
 *     Two variables that have to agree is the whole rule that the person named
 *     the machine. A leftover variable from another run refuses rather than
 *     contacting a machine nobody chose.
 *  3. `CI` is set to anything at all. This carriage never runs in CI, because CI
 *     has no second machine and no person watching it.
 *  4. The socket in play is `gmux` or `default`. The check is
 *     `refuseRealSockets` from `build/scratch-machine.mjs`, imported rather than
 *     copied.
 *  5. The host resolves to a loopback address. This carriage exists to reach a
 *     second machine, so a loopback host means the person pointed it at the
 *     wrong thing.
 *
 * ---------------------------------------------------------------------------
 * THE SESSION LEDGER, AND IT OUTRANKS EVERY RESULT ANY CALLER PRODUCES
 * ---------------------------------------------------------------------------
 *   Nothing this harness runs may kill, rename or reconfigure a session it did
 *   not create, on either side.
 *
 * The rules are mechanical rather than promised.
 *
 *  1. Every scratch session name is `zz-p83-<what it is>-<pid>`.
 *  2. {@link createSession} refuses a name that does not start `zz-p83-`.
 *  3. {@link killSession} refuses a name that does not start `zz-p83-`, and it
 *     sends `kill-session -t '=<name>'`, which is the exact match form. It never
 *     sends a bare name.
 *  4. {@link listFarSessions} is read before anything and after everything, and
 *     {@link diffSessionLists} compares the two. A difference other than this
 *     run's own `zz-p83-` rows is a failure whatever else passed.
 *  5. The far machine's socket is `gmux`, because that is the socket the product
 *     uses and the point of this carriage is to measure what the product meets.
 *     Reading that socket is free. Every write to it goes through the two name
 *     checked functions above. `build/probe-real-machine.mjs` writes to it not
 *     at all, and runs every shape and every step on a scratch socket instead.
 *  6. This Mac's own `-L gmux` server is counted with
 *     {@link countOperatorSessions}, which runs `list-sessions` and nothing
 *     else. A moved count is a failure.
 *  7. This file sends no `pkill` and no `kill-server`. A caller that needs
 *     `kill-server` on a scratch socket it composed says so in its own header,
 *     and a reviewer reads the composer rather than the sentence.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CARRIAGE READS AND WHAT IT NEVER WRITES
 * ---------------------------------------------------------------------------
 * It never reads the operator's `machines.json`. Every value comes from the
 * environment. It never writes into the operator's data directory. It copies
 * the two identity record files into its own run directory and points ssh at
 * the copy, so `StrictHostKeyChecking=yes` can succeed on a machine the person
 * already knows while the originals stay closed to writing.
 * {@link hostKeyFileFacts} records their sizes and modification times so a
 * caller can print them before and after and prove it.
 *
 * The run directory is `<tmpdir>/p83-real-<pid>` and there is no fixed root, so
 * there is nothing to point at wrongly.
 *
 * ---------------------------------------------------------------------------
 * ONE DIFFERENCE FROM THE PRODUCT, STATED SO A REVIEWER DOES NOT READ IT AS A
 * DEFECT
 * ---------------------------------------------------------------------------
 * `src/main/machines/exec-plane.ts` keeps a ledger that refuses `kill-server`,
 * `attach-session`, `send-keys` and `respawn-pane` on the product's one shot
 * door. This module is not that door. It is a measuring instrument, and it does
 * send `send-keys` and does open an attach, because typing into a session on
 * another machine and reading the bytes back is the evidence Phase 83 owes.
 * Every one of those calls is aimed at a `zz-p83-` name this run created.
 */

import { spawn, spawnSync } from 'node:child_process';
import { promises as dnsPromises } from 'node:dns';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { isIP } from 'node:net';
import { join } from 'node:path';
import { refuseRealSockets } from './scratch-machine.mjs';

// ---------------------------------------------------------------------------
// Names and numbers, copied from the product with the file they came from
// ---------------------------------------------------------------------------

/** The prefix every session this harness creates carries. */
export const SESSION_PREFIX = 'zz-p83-';

/** The operator's live server. Read only, and only `list-sessions`. */
export const REAL_SOCKET = 'gmux';

/**
 * The nine option values a steady state Tortie command carries.
 *
 * Copied from `src/main/machines/ssh.ts` and `src/main/machines/carriage.ts`.
 * A change there and not here is a drift a later round has to fix, and the
 * conformance gate `npm run conformance:machines` is what watches the product
 * side of it.
 */
export const SSH_CONNECT_TIMEOUT_SECONDS = 10;
export const SSH_CONTROL_PERSIST_SECONDS = 60;
export const SSH_SERVER_ALIVE_INTERVAL_SECONDS = 5;
export const SSH_SERVER_ALIVE_COUNT_MAX = 3;

/**
 * The configuration file a remote tmux call names, so nothing else is read.
 * Copied from `REMOTE_CONF_PATH` in `src/main/machines/context.ts`.
 */
export const REMOTE_CONF_PATH = '/dev/null';

/**
 * The list format the product reads on another machine.
 * Copied from `REMOTE_LIST_FORMAT` in `src/main/machines/remote-sessions.ts`.
 *
 * PHASE 85 moved the third field from `#{session_activity}` to
 * `#{window_activity}`, because the first one does not move when a detached
 * session prints. The measurement is in that module's header.
 */
export const REMOTE_LIST_FORMAT =
  '#{q:session_id} #{q:session_created} #{q:window_activity} ' +
  '#{q:session_attached} #{q:@gmux-id} #{q:@gmux-agent} ' +
  '#{q:session_name} #{q:@gmux-project} #{q:session_path} #{q:@gmux-name}';

/**
 * Tortie's own record of machine identities, and the person's own.
 *
 * The first path is `machineHostKeysPath()` in `src/main/machines/store.ts`
 * spelled out, because this file imports nothing from `src/`. Both are copied
 * into the run directory and neither is opened for writing.
 */
export function identityRecordFiles() {
  const home = homedir();
  return {
    tortie: join(
      home,
      'Library',
      'Application Support',
      'Tortie',
      'gmux',
      'machines',
      'known-machines'
    ),
    user: join(home, '.ssh', 'known_hosts')
  };
}

// ---------------------------------------------------------------------------
// Quoting, copied from the product
// ---------------------------------------------------------------------------

/** Argument characters that never need quoting. From `src/main/restore/command.ts`. */
const SAFE_ARG = /^[A-Za-z0-9_\-./=:@%+,]+$/;

/** Quote one argv element for a POSIX shell. */
export function quoteArg(arg) {
  if (arg.length === 0) return "''";
  if (SAFE_ARG.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/** Quote a whole argv into one shell command line. */
export function shellQuoteArgv(argv) {
  return argv.map(quoteArg).join(' ');
}

/**
 * Quote a session target unconditionally.
 *
 * Copied from `quoteTarget` in `src/main/attach/attach-plan.ts`. zsh has an
 * EQUALS expansion which is on by default, so a word beginning `=` is replaced
 * by the path of the program named after it. The general quoter above passes
 * `=` through, and it is right to, so this one argument is quoted here instead.
 */
export function quoteTarget(target) {
  return `'${target.replace(/'/g, `'\\''`)}'`;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 60_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export const nowMs = () => Number(process.hrtime.bigint() / 1000000n);

/** A reporter that prints a numbered row and remembers every failure. */
export function makeReporter(tag) {
  const rows = [];
  const failures = [];
  const say = (text) => {
    process.stdout.write(`[${tag}] ${text}\n`);
  };
  const fail = (text) => {
    failures.push(text);
    process.stdout.write(`[${tag}] FAIL: ${text}\n`);
  };
  const step = (n, what, evidence) => {
    rows.push({ n, what, evidence });
    process.stdout.write(`[${tag}] ${String(n)}. ${what}: ${evidence}\n`);
  };
  return { rows, failures, say, fail, step, tag };
}

// ---------------------------------------------------------------------------
// Refusal 5. A loopback host is the wrong machine
// ---------------------------------------------------------------------------

/** Every address a host resolves to, or an empty list when it resolves to none. */
async function addressesOf(host) {
  if (isIP(host) !== 0) return [host];
  try {
    const found = await dnsPromises.lookup(host, { all: true, verbatim: true });
    return found.map((one) => one.address);
  } catch {
    return [];
  }
}

/** True when this address is on this machine's own loopback. */
export function isLoopbackAddress(address) {
  if (address === '::1' || address === '0.0.0.0' || address === '::') return true;
  return /^127\./.test(address);
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

function refuse(who, why) {
  process.stderr.write(
    `[${who}] REFUSING TO RUN. ${why}\n` +
      `[${who}] Nothing was contacted and nothing was started.\n`
  );
  process.exit(2);
}

/**
 * Read the environment, ask the five refusals, and hand back one machine.
 *
 * It creates the run directory and copies the two identity record files into
 * it. It contacts nothing. The first command a caller runs is what opens the
 * connection.
 */
export async function gate(who) {
  const host = process.env['GMUX_REAL_MACHINE_HOST'] ?? '';
  const confirm = process.env['GMUX_REAL_MACHINE_CONFIRM'] ?? '';

  if (host.trim() === '') {
    refuse(
      who,
      'GMUX_REAL_MACHINE_HOST is unset or empty, so no machine was named.'
    );
  }
  if (confirm !== host) {
    refuse(
      who,
      'GMUX_REAL_MACHINE_CONFIRM does not match GMUX_REAL_MACHINE_HOST byte ' +
        'for byte. Set both to the same address. Two variables that have to ' +
        'agree is how this carriage knows a person named this machine on ' +
        'purpose.'
    );
  }
  if ((process.env['CI'] ?? '') !== '') {
    refuse(
      who,
      'CI is set. This carriage contacts a machine that only exists outside ' +
        'CI, and no person is watching a CI run.'
    );
  }

  // Refusal 4. The imported check, before anything is composed.
  const scratchBase = `p83-${String(process.pid)}`;
  refuseRealSockets(scratchBase, who);

  const addresses = await addressesOf(host);
  if (addresses.length === 0) {
    refuse(who, `the host "${host}" resolved to no address at all.`);
  }
  const loopback = addresses.filter((one) => isLoopbackAddress(one));
  if (loopback.length > 0) {
    refuse(
      who,
      `the host "${host}" resolves to ${loopback.join(', ')}, which is this ` +
        'machine. This carriage exists to reach a second machine, so a ' +
        'loopback address means the wrong thing was named.'
    );
  }

  const runDir = join(tmpdir(), `p83-real-${String(process.pid)}`);
  mkdirSync(runDir, { recursive: true, mode: 0o700 });

  const knownHosts = join(runDir, 'p83-known-hosts');
  const sources = identityRecordFiles();
  const before = hostKeyFileFacts();
  const parts = [];
  for (const path of [sources.tortie, sources.user]) {
    if (!existsSync(path)) continue;
    const copy = join(runDir, `p83-copy-${parts.length === 0 ? 'tortie' : 'user'}`);
    copyFileSync(path, copy);
    parts.push(copy);
  }
  // One file, seeded from copies, so StrictHostKeyChecking=yes can succeed on a
  // machine the person already knows while the originals stay closed to writing.
  writeFileSync(
    knownHosts,
    parts.map((one) => readFileSync(one, 'utf8')).join(''),
    { mode: 0o600 }
  );

  const controlPath = composeControlPath(runDir, who);

  const machine = {
    who,
    host,
    user: process.env['GMUX_REAL_MACHINE_USER'] ?? userInfo().username,
    port: Number(process.env['GMUX_REAL_MACHINE_PORT'] ?? '22'),
    remoteTmuxPath: process.env['GMUX_REAL_MACHINE_TMUX'] ?? '/usr/local/bin/tmux',
    localJsonPath: process.env['GMUX_P83_LOCAL'] ?? '',
    sshBin: '/usr/bin/ssh',
    runDir,
    knownHosts,
    controlPath,
    scratchBase,
    addresses,
    identitySources: sources,
    identityBefore: before,
    /** Every far side socket this run composed, so a reader can check each one. */
    scratchSockets: new Set(),
    /** Every pid this run started, so a caller ends only what it started. */
    pids: []
  };
  return machine;
}

/**
 * The control socket path, short enough for the 104 byte unix socket limit.
 *
 * The run directory under the per user temporary folder is about 81 bytes on
 * this Mac with the leaf added. When it does not fit, the fallback is under
 * `/tmp` with this account's own user id in the name.
 */
function composeControlPath(runDir, who) {
  const first = join(runDir, 'cm');
  if (Buffer.byteLength(first, 'utf8') <= 100) return first;
  const fallback = join('/tmp', `p83-${String(process.getuid?.() ?? 0)}-${String(process.pid)}`);
  mkdirSync(fallback, { recursive: true, mode: 0o700 });
  const second = join(fallback, 'cm');
  if (Buffer.byteLength(second, 'utf8') <= 100) return second;
  refuse(who, 'no directory on this system produced a control socket name of 100 bytes or fewer.');
  return second;
}

// ---------------------------------------------------------------------------
// The carriage
// ---------------------------------------------------------------------------

/**
 * The nine options, in the product's fixed order, with `-p` and `-l` last.
 *
 * The one difference from `sshOptions` in `src/main/machines/ssh.ts` is the
 * value of `UserKnownHostsFile`, which names this run's own copy rather than
 * the two originals. The option is present, its name is the same, and the
 * originals are never named on a command this harness runs.
 */
export function sshOptions(machine) {
  const argv = [
    '-o',
    'BatchMode=yes',
    '-o',
    `ConnectTimeout=${String(SSH_CONNECT_TIMEOUT_SECONDS)}`,
    '-o',
    'StrictHostKeyChecking=yes',
    '-o',
    `UserKnownHostsFile="${machine.knownHosts}"`,
    '-o',
    'ControlMaster=auto',
    '-o',
    `ControlPath=${machine.controlPath}`,
    '-o',
    `ControlPersist=${String(SSH_CONTROL_PERSIST_SECONDS)}s`,
    '-o',
    `ServerAliveInterval=${String(SSH_SERVER_ALIVE_INTERVAL_SECONDS)}`,
    '-o',
    `ServerAliveCountMax=${String(SSH_SERVER_ALIVE_COUNT_MAX)}`
  ];
  if (Number.isFinite(machine.port) && machine.port !== 22) {
    argv.push('-p', String(machine.port));
  }
  if (machine.user !== '') argv.push('-l', machine.user);
  return argv;
}

/** Run one command on the far machine's login shell. */
export function runOnMachine(machine, command, options = {}) {
  const argv = [...sshOptions(machine), machine.host, command];
  const out = sh(machine.sshBin, argv, { timeout: options.timeoutMs ?? 60_000 });
  return { ...out, argv, command };
}

/**
 * Prove the connection signs in, before any answer is read as a measurement.
 *
 * WHY THIS IS A SEPARATE STEP AND NOT A ROW IN THE TABLE. A command that could
 * not sign in exits 255 with an empty stdout, and `list-sessions` reading empty
 * looks exactly like a machine holding no sessions. The first run of this
 * carriage against the operator's Mac Pro printed "0 sessions" for a machine it
 * had never reached. A number that means two things is worse than no number, so
 * a failed sign in ends the run here with exit 3, which a reader can tell apart
 * from the gate's exit 2.
 *
 * The three cases are named, because each one has a different fix.
 */
export function assertReachable(machine) {
  const out = runOnMachine(machine, 'true', { timeoutMs: 30_000 });
  if (out.code === 0) return out;
  const text = out.both.trim();
  let reason;
  if (/host key verification failed|no matching host key/i.test(text)) {
    reason =
      'the machine\'s identity is in neither Tortie\'s own record nor the ' +
      'person\'s. Add the machine in Settings, then Machines, and run the ' +
      'connection test once, which is the one place a person confirms an ' +
      'identity.';
  } else if (/permission denied/i.test(text)) {
    reason =
      'this Mac holds no ssh key that machine trusts. The carriage names no ' +
      'identity file on purpose, exactly as the product does, so it can only ' +
      'offer what the agent holds and the default identities. Run ' +
      '"ssh-add -l" to see what the agent holds.';
  } else {
    reason = 'the client gave the sentence above and this carriage has no ' +
      'named case for it.';
  }
  process.stderr.write(
    `[${machine.who}] COULD NOT SIGN IN to ${machine.host}. Nothing below was ` +
      'measured.\n' +
      `[${machine.who}]   $ ssh <the nine options> ${machine.host} true\n` +
      `[${machine.who}]   ${text || '(no message)'}\n` +
      `[${machine.who}]   exit ${String(out.code)}\n` +
      `[${machine.who}] ${reason}\n`
  );
  process.exit(3);
  return out;
}

/**
 * A scratch socket name for the FAR machine, refused when it is a real one.
 *
 * This is the composer a reviewer reads instead of trusting a sentence. Nothing
 * it returns can be `gmux` or `default`, because every name it builds starts
 * `p83-` and it asks {@link refuseRealSockets} anyway.
 */
export function scratchSocket(machine, what) {
  const name = `${machine.scratchBase}-${what}`;
  refuseRealSockets(name, machine.who);
  machine.scratchSockets.add(name);
  return name;
}

/**
 * One tmux call on the far machine, composed the way the product composes it.
 *
 * The whole tmux call is one quoted argument, because ssh joins everything
 * after the address with single spaces and hands the resulting string to the
 * far side's login shell. A `-t` target is quoted with {@link quoteTarget}.
 */
export function farTmux(machine, socket, args, options = {}) {
  if (socket !== REAL_SOCKET) refuseRealSockets(socket, machine.who);
  const tmuxArgv = [
    machine.remoteTmuxPath,
    '-L',
    socket,
    '-f',
    REMOTE_CONF_PATH,
    ...args
  ];
  const quoted = tmuxArgv
    .map((one, index) =>
      index > 0 && tmuxArgv[index - 1] === '-t' ? quoteTarget(one) : quoteArg(one)
    )
    .join(' ');
  const out = runOnMachine(machine, quoted, options);
  return { ...out, tmuxArgv, quoted };
}

/**
 * Spawn a long lived ssh command and hand back the child with a line reader.
 *
 * The pid is pushed onto `machine.pids`, so a caller ends only what it started.
 */
export function spawnOnMachine(machine, command, extraSshFlags = []) {
  const argv = [...extraSshFlags, ...sshOptions(machine), machine.host, command];
  const child = spawn(machine.sshBin, argv, { stdio: ['pipe', 'pipe', 'pipe'] });
  machine.pids.push(child.pid);
  const state = {
    child,
    argv,
    command,
    stdout: '',
    stderr: '',
    lines: [],
    exited: false,
    code: null
  };
  let pending = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    state.stdout += chunk;
    pending += chunk;
    const parts = pending.split('\n');
    pending = parts.pop() ?? '';
    for (const line of parts) state.lines.push(line);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    state.stderr += chunk;
  });
  child.on('exit', (code) => {
    state.exited = true;
    state.code = code;
  });
  return state;
}

/** Write one line into a control child's stdin. */
export function send(state, command) {
  state.child.stdin.write(`${command}\n`);
}

/** Take the lines recorded so far and clear the buffer. */
export function drain(state) {
  const taken = [...state.lines];
  state.lines.length = 0;
  return taken;
}

/** Wait until a child has recorded at least this many lines, or time runs out. */
export async function waitForLines(state, count, timeoutMs = 10_000) {
  const deadline = nowMs() + timeoutMs;
  while (state.lines.length < count && nowMs() < deadline && !state.exited) {
    await sleep(25);
  }
  return state.lines.length >= count;
}

/** Wait for the first line a test accepts, or null when time runs out. */
export async function waitFor(state, predicate, timeoutMs = 10_000) {
  const deadline = nowMs() + timeoutMs;
  while (nowMs() < deadline) {
    const found = state.lines.find((line) => predicate(line));
    if (found !== undefined) return found;
    if (state.exited) break;
    await sleep(25);
  }
  return null;
}

/** End every pid this run recorded, and nothing else. */
export function endRecordedPids(machine) {
  const ended = [];
  for (const pid of machine.pids) {
    if (pid === undefined) continue;
    try {
      process.kill(pid, 'SIGKILL');
      ended.push(pid);
    } catch {
      /* already gone, which is the state we wanted */
    }
  }
  return ended;
}

/** Close the shared connection. It ends this run's own master and nothing else. */
export function closeMaster(machine) {
  return sh(machine.sshBin, [
    '-O',
    'exit',
    '-o',
    `ControlPath=${machine.controlPath}`,
    machine.host
  ]);
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

/**
 * The exact match form for a verb whose `-t` is a target PANE.
 *
 * MEASURED on this Mac on 2026-08-18, against tmux 3.6a, because the first
 * driving run of this carriage got it wrong and the failure was silent in one of
 * the two cases.
 *
 *   send-keys -t '=zz-p83-t'        exit 1, "can't find pane: =zz-p83-t"
 *   display-message -p -t '=zz-p83-t' '#{session_activity}'
 *                                   exit 0, and an EMPTY line
 *   send-keys -t '=zz-p83-t:'       exit 0, and the keys arrive
 *   display-message -p -t '=zz-p83-t:' '#{session_activity}'
 *                                   exit 0, "1787077036"
 *
 * The trailing colon is what turns an exact session match into a pane target,
 * because it names that session's current window and its active pane. A verb
 * whose `-t` is a target SESSION, such as `kill-session` or `rename-session`,
 * takes `=<name>` with no colon and {@link killSession} composes that.
 */
export function paneTarget(name) {
  return `=${name}:`;
}

/** Refuse a name this harness did not compose. */
export function assertScratchName(machine, name, verb) {
  if (!name.startsWith(SESSION_PREFIX)) {
    process.stderr.write(
      `[${machine.who}] REFUSING a ${verb} of "${name}". Only a name starting ` +
        `"${SESSION_PREFIX}" is a session this harness created, and this ` +
        'harness never acts on a session it did not create.\n'
    );
    process.exit(2);
  }
  return name;
}

/** Every session name the far machine holds on one socket, in order. */
export function listFarSessions(machine, socket) {
  const out = farTmux(machine, socket, ['list-sessions', '-F', '#{session_name}']);
  const names = out.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return { names, out };
}

/**
 * Compare a before list and an after list, ignoring this run's own rows.
 *
 * Returns the two differences. Either being non empty is a failure.
 */
export function diffSessionLists(before, after) {
  const mine = (name) => name.startsWith(SESSION_PREFIX);
  const lost = before.filter((name) => !mine(name) && !after.includes(name));
  const gained = after.filter((name) => !mine(name) && !before.includes(name));
  const leftBehind = after.filter((name) => mine(name));
  return { lost, gained, leftBehind };
}

/** Create one scratch session on the far machine. The name is checked first. */
export function createSession(machine, { socket, name, cwd, argv = [], detached = true }) {
  assertScratchName(machine, name, 'create');
  const args = ['new-session'];
  if (detached) args.push('-d');
  args.push('-s', name);
  if (cwd !== undefined) args.push('-c', cwd);
  if (argv.length > 0) args.push('--', ...argv);
  return farTmux(machine, socket, args);
}

/** End one scratch session on the far machine, by exact name. */
export function killSession(machine, socket, name) {
  assertScratchName(machine, name, 'kill');
  return farTmux(machine, socket, ['kill-session', '-t', `=${name}`]);
}

// ---------------------------------------------------------------------------
// This Mac, read only
// ---------------------------------------------------------------------------

/**
 * How many sessions the operator's own server holds.
 *
 * `list-sessions` and nothing else. A caller reads it before and after and a
 * moved number is a failure whatever else passed.
 */
export function countOperatorSessions() {
  const out = sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} list-sessions 2>/dev/null | wc -l | tr -d ' '`
  ]);
  return out.stdout.trim();
}

/** The size and modification time of the two identity record files. */
export function hostKeyFileFacts() {
  const files = identityRecordFiles();
  const read = (path) => {
    try {
      const info = statSync(path);
      return { path, bytes: info.size, mtimeMs: info.mtimeMs };
    } catch {
      return { path, bytes: null, mtimeMs: null };
    }
  };
  return { tortie: read(files.tortie), user: read(files.user) };
}

/** True when neither identity record file moved. */
export function identityFilesUnmoved(before, after) {
  const same = (a, b) => a.bytes === b.bytes && a.mtimeMs === b.mtimeMs;
  return same(before.tortie, after.tortie) && same(before.user, after.user);
}

/** A one line description of both files, for a report row. */
export function identityFilesLine(facts) {
  const one = (f) =>
    f.bytes === null ? `${f.path} (not there)` : `${f.path} ${String(f.bytes)} bytes`;
  return `${one(facts.tortie)}, ${one(facts.user)}`;
}

// ---------------------------------------------------------------------------
// BUILDER A's local answers, when the person points at them
// ---------------------------------------------------------------------------

/**
 * Read the local 3.7c measurement when `GMUX_P83_LOCAL` names one. It is
 * committed at `docs/research/assets/phase83/p83-local-3.7c.json`.
 *
 * A missing file is not a refusal. The probe prints "not supplied" in the
 * comparison column and says so in its own summary, because a row that claims
 * a comparison it did not make is worse than a row that says it made none.
 */
export function readLocalAnswers(machine) {
  if (machine.localJsonPath === '') return null;
  try {
    return JSON.parse(readFileSync(machine.localJsonPath, 'utf8'));
  } catch {
    return null;
  }
}
