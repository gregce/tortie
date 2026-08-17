/**
 * `npm run probe:controldialect`. The Tier 3 live measurement of tmux control
 * mode over a real connection (Phase 71, M4).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS RUNS BEFORE ANY CODE IS WRITTEN
 * ---------------------------------------------------------------------------
 * Phase 69 shipped `TESTED_REMOTE_TMUX_VERSIONS` with `measured.control: false`
 * on every row. Control mode is a different wire protocol from one-shot verbs,
 * and the reason research 51 section 4.1 chose the sign in program over a
 * forwarded socket is that an untested wire pair HANGS rather than errors. A
 * hang reads to a person as Tortie freezing on work they care about. So the far
 * side is opened and read here, and only a version whose stream matches the
 * local control child on steps 1 to 9 gets `measured.control: true`.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES THAT OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE REMOTE MACHINE IS THIS MAC. The three rules are copied from
 * the head of `build/probe-execplane.mjs` rather than reinvented.
 *
 *  1. It REFUSES TO START when the socket it would use is `gmux`.
 *  2. Every remote argv is printed in full and asserted to carry the scratch
 *     socket, never the literal `gmux`.
 *  3. The operator's own server is read before and after: session count,
 *     `history-limit`, `exit-empty`. All three identical or the run is a failure
 *     whatever else passed.
 *
 * It kills only pids it recorded and prints them. Every scratch file carries a
 * `p71-` prefix. It never runs `pkill` and never runs `kill-server` against
 * anything but its own scratch sockets.
 *
 * ---------------------------------------------------------------------------
 * WHAT "BYTE FOR BYTE" MEANS HERE, STATED SO NO READER OVERCLAIMS IT
 * ---------------------------------------------------------------------------
 * Two servers cannot print the same epoch second, the same session id or the
 * same command number, so those three are replaced by placeholders before the
 * comparison and are reported separately in step 3. Everything else, including
 * every word, every space and the order of every argument, is compared exactly.
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rule 1. Refuse the real socket, by name, before anything at all
// ---------------------------------------------------------------------------

const REAL_SOCKET = 'gmux';
const SOCKET_BASE =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p71-${String(process.pid)}`;

if (SOCKET_BASE === REAL_SOCKET || SOCKET_BASE === 'default') {
  process.stderr.write(
    '[p71] REFUSING TO RUN. The socket this probe would use is the real one. ' +
      'In this probe the remote machine is this Mac, so a remote command would ' +
      'land on the server holding your live sessions. Set GMUX_TMUX_SOCKET to ' +
      'a scratch name and try again.\n'
  );
  process.exit(1);
}

const root = join(tmpdir(), `p71-controldialect-${String(process.pid)}`);
const recordedPids = [];
const rows = [];
const failures = [];
/** Every scratch socket this run created, so each one is ended by name. */
const scratchSockets = new Set();

const say = (text) => process.stdout.write(`[p71] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p71] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p71] ${String(n)}. ${what}: ${evidence}\n`);
};

function sh(file, args, options = {}) {
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

const nowMs = () => Number(process.hrtime.bigint() / 1000000n);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// Rule 3, first half. The operator's server, before. READ ONLY
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

const before = readOperatorServer();
step(
  0,
  "the operator's server before the run",
  `${before.sessions} session(s), history-limit ${before.history || 'unreadable'}, ` +
    `exit-empty ${before.exitEmpty || 'unreadable'}`
);

// ---------------------------------------------------------------------------
// The carriage. One scratch sshd on 127.0.0.1, keys in this run's own directory
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });

const sshBin = '/usr/bin/ssh';
const keygen = '/usr/bin/ssh-keygen';
const sshdBin = '/usr/sbin/sshd';
const hostKey = join(root, 'p71-hostkey');
const userKey = join(root, 'p71-userkey');
const authorized = join(root, 'p71-authorized');
const tortieRecord = join(root, 'p71-known-machines');
const sshdConf = join(root, 'p71-sshd.conf');
const port = 38_000 + (process.pid % 2000);
const me = execFileSync('/usr/bin/id', ['-un'], { encoding: 'utf8' }).trim();
const userRecord = join(homedir(), '.ssh', 'known_hosts');

sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', hostKey]);
sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', userKey]);

function ownPublicKeys() {
  const keys = [];
  const agent = sh('/usr/bin/ssh-add', ['-L']);
  if (agent.code === 0) {
    for (const line of agent.stdout.split('\n')) {
      if (line.startsWith('ssh-') || line.startsWith('ecdsa-')) keys.push(line);
    }
  }
  const sshDir = join(process.env['HOME'] ?? '', '.ssh');
  let names = [];
  try {
    names = readdirSync(sshDir);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (!name.endsWith('.pub')) continue;
    try {
      const line = readFileSync(join(sshDir, name), 'utf8').trim();
      if (line.startsWith('ssh-') || line.startsWith('ecdsa-')) keys.push(line);
    } catch {
      /* an unreadable key is one we simply do not offer */
    }
  }
  return [...new Set(keys)];
}

writeFileSync(
  authorized,
  [
    readFileSync(`${userKey}.pub`, 'utf8').trim(),
    ...ownPublicKeys(),
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(authorized, 0o600);

writeFileSync(
  sshdConf,
  [
    `Port ${String(port)}`,
    'ListenAddress 127.0.0.1',
    `HostKey ${hostKey}`,
    `AuthorizedKeysFile ${authorized}`,
    'PasswordAuthentication no',
    'KbdInteractiveAuthentication no',
    'UsePAM no',
    'StrictModes no',
    'LogLevel QUIET',
    ''
  ].join('\n'),
  'utf8'
);

let sshd = spawn(sshdBin, ['-D', '-f', sshdConf], { stdio: 'ignore' });
recordedPids.push(sshd.pid);

function waitForPort(p) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (sh('/usr/bin/nc', ['-z', '127.0.0.1', String(p)]).code === 0) return true;
    sh('/bin/sleep', ['0.1']);
  }
  return false;
}
const carriageUp = waitForPort(port);
if (!carriageUp) fail('the scratch sshd did not start');

// The machine's own key goes into Tortie's record file by hand, once, because
// StrictHostKeyChecking=yes means the plane itself can never add a line.
writeFileSync(
  tortieRecord,
  sh('/usr/bin/ssh-keyscan', ['-p', String(port), '127.0.0.1']).stdout,
  'utf8'
);

const CONTROL_DIR = join(tmpdir(), 'tortie-mux');
mkdirSync(CONTROL_DIR, { recursive: true, mode: 0o700 });
const controlPath = join(CONTROL_DIR, `m-p71${String(process.pid).slice(-8)}`);

/** The carriage, in the order `src/main/machines/ssh.ts` composes it. */
function planeOptions() {
  return [
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=10',
    '-o',
    'StrictHostKeyChecking=yes',
    '-o',
    `UserKnownHostsFile="${tortieRecord}" "${userRecord}"`,
    '-o',
    'ControlMaster=auto',
    '-o',
    `ControlPath=${controlPath}`,
    '-o',
    'ControlPersist=60s',
    '-o',
    'ServerAliveInterval=5',
    '-o',
    'ServerAliveCountMax=3',
    '-o',
    `IdentityFile=${userKey}`,
    '-o',
    'IdentitiesOnly=yes',
    '-p',
    String(port),
    '-l',
    me
  ];
}

/** The one quoting helper's shape, mirrored from src/main/restore/command.ts. */
const SAFE_ARG = /^[A-Za-z0-9_\-./=:@%+,]+$/;
const quoteArg = (arg) => {
  if (arg.length === 0) return "''";
  if (SAFE_ARG.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
};
const quoteArgv = (argv) => argv.map(quoteArg).join(' ');

/**
 * A session target, quoted unconditionally.
 *
 * MEASURED on the first run of this probe, 2026-08-17. `rename-session -t
 * =p71-worker-39653` and `new-window -t =p71-worker-39653-2` both did nothing at
 * all on the far side and printed no error this probe read, so steps 4, 5 and 6
 * came back as a dialect difference that was really a quoting defect in the
 * probe. `=` passes the general quoter untouched, and zsh's EQUALS expansion
 * rewrites a word that begins with one into a program lookup. That is the same
 * finding `quoteTarget` in src/main/attach/attach-plan.ts records, and this is
 * the second place it has bitten.
 */
const quoteTarget = (target) => `'${target.replace(/'/g, `'\\''`)}'`;

/** The two programs this probe measures, and where each one lives. */
const VENDORED = join(repoRoot, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const HOMEBREW = sh('/usr/bin/which', ['tmux']).stdout.trim();

function versionOf(bin) {
  const out = sh(bin, ['-V']).stdout.trim();
  const match = /^tmux\s+(\S+)/.exec(out);
  return match === null ? null : match[1];
}

const programs = [];
for (const bin of [HOMEBREW, VENDORED]) {
  if (bin === '' || !existsSync(bin)) continue;
  const version = versionOf(bin);
  if (version === null) continue;
  if (programs.some((one) => one.version === version)) continue;
  programs.push({ version, bin });
}

step(
  0.5,
  'the carriage and the programs',
  carriageUp
    ? `sshd pid ${String(sshd.pid)} on 127.0.0.1:${String(port)}. Programs ` +
        `measured: ${programs.map((p) => `${p.version} at ${p.bin}`).join(', ') || 'NONE'}`
    : `the sshd did NOT answer on port ${String(port)}. Nothing below is evidence`
);

// ---------------------------------------------------------------------------
// One control child, local or remote, with a line reader in front of it
// ---------------------------------------------------------------------------

/** The list format the app uses, copied so the probe reads the same bytes. */
const REMOTE_LIST_FORMAT =
  '#{q:session_id} #{q:session_created} #{q:session_activity} ' +
  '#{q:session_attached} #{q:@gmux-id} #{q:@gmux-agent} ' +
  '#{q:session_name} #{q:@gmux-project} #{q:session_path} #{q:@gmux-name}';

const CONTROL_SESSION_NAME = 'gmux-control';

/** Rule 2. Every remote argv is asserted to carry the scratch socket. */
function assertScratchSocket(where, argv) {
  const text = argv.join(' ');
  if (!text.includes(SOCKET_BASE)) {
    fail(`${where} did not carry the scratch socket: ${text}`);
  }
  if (/(^|\s)-L\s+gmux(\s|$)/.test(text)) {
    fail(`${where} named the REAL socket: ${text}`);
  }
}

function openControlChild(where, program, socket, extraTmuxFlags = []) {
  const tmuxArgv = [
    program,
    '-L',
    socket,
    '-f',
    '/dev/null',
    ...extraTmuxFlags,
    '-C',
    'new-session',
    '-A',
    '-s',
    CONTROL_SESSION_NAME
  ];
  let file;
  let argv;
  if (where === 'local') {
    file = program;
    argv = tmuxArgv.slice(1);
  } else {
    file = sshBin;
    argv = [...planeOptions(), '127.0.0.1', quoteArgv(tmuxArgv)];
  }
  assertScratchSocket(`${where} ${program}`, [...argv]);
  const child = spawn(file, argv, { stdio: ['pipe', 'pipe', 'pipe'] });
  recordedPids.push(child.pid);
  const state = {
    child,
    where,
    lines: [],
    raw: '',
    stderr: '',
    exited: false,
    exitAt: null,
    file,
    argv
  };
  let pending = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    state.raw += chunk;
    pending += chunk;
    const parts = pending.split('\n');
    pending = parts.pop() ?? '';
    for (const line of parts) state.lines.push(line);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    state.stderr += chunk;
  });
  child.on('exit', () => {
    state.exited = true;
    state.exitAt = nowMs();
  });
  return state;
}

function send(state, command) {
  state.child.stdin.write(`${command}\n`);
}

async function waitForLines(state, count, timeoutMs = 8_000) {
  const deadline = nowMs() + timeoutMs;
  while (state.lines.length < count && nowMs() < deadline && !state.exited) {
    await sleep(25);
  }
  return state.lines.length >= count;
}

async function waitFor(state, predicate, timeoutMs = 8_000) {
  const deadline = nowMs() + timeoutMs;
  while (nowMs() < deadline) {
    const found = state.lines.find((line) => predicate(line));
    if (found !== undefined) return found;
    if (state.exited) break;
    await sleep(25);
  }
  return null;
}

/** Take the lines recorded so far and clear the buffer. */
function drain(state) {
  const taken = [...state.lines];
  state.lines.length = 0;
  return taken;
}

/**
 * Replace the three values two servers can never print alike. Everything else,
 * including every word and every space, survives the comparison.
 */
function normalize(text) {
  return text
    .replace(/\b1[0-9]{9}\b/g, '<epoch>')
    .replace(/\$\d+/g, '$N')
    .replace(/@\d+/g, '@N')
    .replace(/%\d+/g, '%N');
}

/** A guard line's three numbers, or null when the line is not a guard. */
const GUARD_RE = /^%(begin|end|error) (\d+) (\d+) (\d+)$/;

/**
 * One tmux command against a scratch socket, on the same side as the child.
 *
 * A `-t` target is quoted with {@link quoteTarget} rather than left to the
 * general quoter, for the reason measured in that function's header.
 */
function verb(where, program, socket, args, timeoutMs = 20_000) {
  const tmuxArgv = [program, '-L', socket, '-f', '/dev/null', ...args];
  if (where === 'local') {
    const out = sh(program, tmuxArgv.slice(1), { timeout: timeoutMs });
    if (out.code !== 0 && args[0] !== 'kill-server') {
      fail(`local ${args.join(' ')} exited ${String(out.code)}: ${out.both.trim()}`);
    }
    return out;
  }
  const quoted = tmuxArgv
    .map((one, index) =>
      index > 0 && tmuxArgv[index - 1] === '-t' ? quoteTarget(one) : quoteArg(one)
    )
    .join(' ');
  const argv = [...planeOptions(), '127.0.0.1', quoted];
  assertScratchSocket(`${where} verb ${args[0] ?? ''}`, argv);
  const out = sh(sshBin, argv, { timeout: timeoutMs });
  if (out.code !== 0 && args[0] !== 'kill-server') {
    fail(`remote ${args.join(' ')} exited ${String(out.code)}: ${out.both.trim()}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The eleven steps, per version, per side
// ---------------------------------------------------------------------------

/** Everything measured, per version, so the write up and the gate agree. */
const measurements = [];

async function measureSide(where, program, version) {
  const socket = `${SOCKET_BASE}-${where}-${version.replace(/[^a-z0-9]/gi, '')}`;
  scratchSockets.add(`${where}:${program}:${socket}`);
  // The server is created and its exit-empty is turned off in ONE invocation,
  // for the reason measured in src/main/machines/exec-plane.ts: a server made
  // with -f /dev/null defaults exit-empty to on and ends itself at zero
  // sessions.
  verb(where, program, socket, [
    'start-server',
    ';',
    'set-option',
    '-s',
    'exit-empty',
    'off'
  ]);

  const out = {
    where,
    version,
    program,
    socket,
    greeting: '',
    greetingNormalized: '',
    noOutputBlock: '',
    guards: [],
    onCreate: [],
    onKill: [],
    onRename: [],
    renamedLine: '',
    windowTraffic: [],
    exitLine: '',
    listOverControl: '',
    listOverExec: '',
    error: null
  };

  const state = openControlChild(where, program, socket);
  // Step 1. The greeting, which the attach itself emits before any of our
  // commands. MEASURED: it is FIVE lines rather than the two the client's own
  // comment implied, being the %begin and %end guard pair and then three
  // notifications about the session the attach created. The settle below is
  // what makes the last three land inside the measurement rather than inside
  // the next step's.
  const gotGreeting = await waitForLines(state, 2, 10_000);
  await sleep(600);
  if (!gotGreeting) {
    out.error = `no greeting within 10 s. stderr: ${state.stderr.trim() || '(none)'}`;
    try {
      state.child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
    verb(where, program, socket, ['kill-server']);
    return out;
  }
  const greeting = drain(state);
  out.greeting = `${greeting.join('\n')}\n`;
  out.greetingNormalized = normalize(out.greeting);
  for (const line of greeting) {
    const guard = GUARD_RE.exec(line);
    if (guard !== null) out.guards.push(line);
  }

  // Step 2. refresh-client -f no-output, which is the first command the client
  // sends after the greeting.
  send(state, 'refresh-client -f no-output');
  await waitFor(state, (line) => line.startsWith('%end') || line.startsWith('%error'));
  out.noOutputBlock = `${drain(state).join('\n')}\n`;

  // Steps 4, 5 and 6. A create, a rename and a kill, each driven by a SECOND
  // client on the same server, so the notifications are the asynchronous ones a
  // real event bus receives rather than answers to our own commands.
  const worker = `p71-worker-${String(process.pid)}`;
  verb(where, program, socket, ['new-session', '-d', '-s', worker]);
  await sleep(400);
  out.onCreate = drain(state);

  verb(where, program, socket, ['rename-session', '-t', `=${worker}`, `${worker}-2`]);
  await sleep(400);
  out.onRename = drain(state);
  out.renamedLine = out.onRename.find((l) => l.startsWith('%session-renamed')) ?? '';

  // Step 6. Window traffic, from a new window inside the worker session.
  verb(where, program, socket, ['new-window', '-t', `=${worker}-2`]);
  await sleep(400);
  out.windowTraffic = drain(state);

  // Step 9. One list over the control connection, and the same list over the
  // one-shot door, compared byte for byte.
  send(state, `list-sessions -F '${REMOTE_LIST_FORMAT}'`);
  await waitFor(state, (line) => line.startsWith('%end') || line.startsWith('%error'));
  const listBlock = drain(state);
  out.listOverControl = listBlock
    .filter((line) => !line.startsWith('%'))
    .join('\n');
  out.listOverExec = verb(where, program, socket, [
    'list-sessions',
    '-F',
    REMOTE_LIST_FORMAT
  ]).stdout.replace(/\n$/, '');

  verb(where, program, socket, ['kill-session', '-t', `=${worker}-2`]);
  await sleep(400);
  out.onKill = drain(state);

  // Step 7. %exit and its reason when the far side's server is killed.
  const killedAt = nowMs();
  verb(where, program, socket, ['kill-server']);
  const exitLine = await waitFor(state, (line) => line.startsWith('%exit'), 8_000);
  out.exitLine = exitLine ?? '(no %exit line arrived)';
  out.exitAfterMs = nowMs() - killedAt;
  await sleep(300);
  if (!state.exited) {
    try {
      state.child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
  return out;
}

if (carriageUp && programs.length > 0) {
  for (const { version, bin } of programs) {
    const local = await measureSide('local', bin, version);
    const remote = await measureSide('remote', bin, version);
    measurements.push({ version, bin, local, remote });
  }
}

// ---------------------------------------------------------------------------
// The comparison, one row per version
// ---------------------------------------------------------------------------

/** Per version: which of steps 1 to 9 matched. */
const verdicts = [];

/**
 * The notifications `src/main/tmux/control-parser.ts` gives a named arm. Every
 * other `%name` falls into its `other-notification` arm, which is a measured
 * fact about the parser rather than a guess.
 */
const PARSED_NOTIFICATIONS = new Set([
  'sessions-changed',
  'session-changed',
  'session-renamed',
  'session-window-changed',
  'output',
  'exit'
]);

/** The `%name` of every notification line, in order. */
function notificationNames(lines) {
  return lines
    .filter((line) => line.startsWith('%'))
    .map((line) => line.slice(1).split(' ')[0] ?? '');
}

/**
 * Compare the notifications the parser has an arm for, in order.
 *
 * The unparsed ones are deliberately NOT compared. MEASURED on this run:
 * `%unlinked-window-renamed @1 tmux` on one side and
 * `%unlinked-window-renamed @1 kernel_task` on the other, because the window's
 * name is whatever the shell in it was running at that instant. Comparing those
 * would make the probe report a dialect difference that is really a race, so
 * they are recorded in the write up and are not part of the verdict.
 */
function sameParsedNotifications(a, b) {
  const known = (lines) =>
    notificationNames(lines).filter((name) => PARSED_NOTIFICATIONS.has(name));
  return known(a).join(',') === known(b).join(',');
}

for (const m of measurements) {
  const { local, remote, version } = m;
  const steps = {};
  steps[1] =
    local.error === null &&
    remote.error === null &&
    local.greetingNormalized !== '' &&
    local.greetingNormalized === remote.greetingNormalized;
  steps[2] = normalize(local.noOutputBlock) === normalize(remote.noOutputBlock);
  steps[3] =
    local.guards.length === remote.guards.length &&
    local.guards.every((line, i) => {
      const a = GUARD_RE.exec(line);
      const b = GUARD_RE.exec(remote.guards[i] ?? '');
      return a !== null && b !== null && a[1] === b[1] && a[4] === b[4];
    });
  steps[4] =
    sameParsedNotifications(local.onCreate, remote.onCreate) &&
    sameParsedNotifications(local.onKill, remote.onKill) &&
    sameParsedNotifications(local.onRename, remote.onRename);
  steps[5] =
    local.renamedLine !== '' &&
    normalize(local.renamedLine) === normalize(remote.renamedLine);
  steps[6] = sameParsedNotifications(local.windowTraffic, remote.windowTraffic);
  steps[7] = normalize(local.exitLine) === normalize(remote.exitLine);
  // Step 9 asks two questions of the SAME side: does the list over the control
  // connection equal the list over the one-shot door. It is asked of the remote
  // side, because that is the side the app will read.
  steps[9] = remote.listOverControl === remote.listOverExec;
  verdicts.push({ version, steps, local, remote });
}

// ---------------------------------------------------------------------------
// Step 8. Does -u change any byte of the stream
// ---------------------------------------------------------------------------

let step8 = 'not measured';
if (carriageUp && programs.length > 0) {
  const { version, bin } = programs[0];
  // TWO SERVERS, NOT ONE. The first run of this probe used one socket for both
  // children, so the second child's `new-session -A` ATTACHED to the session the
  // first one made instead of creating one. The greeting is three lines shorter
  // in that case, and the probe read the missing lines as a difference `-u`
  // caused. Each child now creates its own server and its own control session,
  // so the only difference between the two streams is the flag.
  const tag = version.replace(/[^a-z0-9]/gi, '');
  const bootArgs = ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off'];

  const plainSocket = `${SOCKET_BASE}-uplain-${tag}`;
  verb('remote', bin, plainSocket, bootArgs);
  const plain = openControlChild('remote', bin, plainSocket);
  await waitForLines(plain, 2, 10_000);
  await sleep(600);
  send(plain, `list-sessions -F '${REMOTE_LIST_FORMAT}'`);
  await waitFor(plain, (line) => line.startsWith('%end'));
  const plainText = normalize(plain.raw);
  plain.child.kill('SIGKILL');
  verb('remote', bin, plainSocket, ['kill-server']);

  const uSocket = `${SOCKET_BASE}-uflag-${tag}`;
  verb('remote', bin, uSocket, bootArgs);
  const withU = openControlChild('remote', bin, uSocket, ['-u']);
  await waitForLines(withU, 2, 10_000);
  await sleep(600);
  send(withU, `list-sessions -F '${REMOTE_LIST_FORMAT}'`);
  await waitFor(withU, (line) => line.startsWith('%end'));
  const uText = normalize(withU.raw);
  withU.child.kill('SIGKILL');
  verb('remote', bin, uSocket, ['kill-server']);

  step8 =
    plainText === uText
      ? `IDENTICAL on ${version}, ${String(Buffer.byteLength(plainText))} bytes each. ` +
        `-u is NOT added to the control carriage`
      : `DIFFERENT on ${version}. Without -u the stream is ` +
        `${String(Buffer.byteLength(plainText))} bytes and with it ` +
        `${String(Buffer.byteLength(uText))} bytes. -u IS added`;
}

// ---------------------------------------------------------------------------
// Steps 10 and 11. How long the keepalive pair takes to end a control child
// ---------------------------------------------------------------------------

let step10 = 'not measured';
let step11 = 'not measured';

/** Every descendant pid of one process, so a freeze stops the right one. */
function descendantsOf(pid) {
  const out = sh('/bin/ps', ['-Ao', 'pid=,ppid=']).stdout;
  const children = new Map();
  for (const line of out.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 2) continue;
    const child = Number(parts[0]);
    const parent = Number(parts[1]);
    if (!Number.isFinite(child) || !Number.isFinite(parent)) continue;
    const list = children.get(parent) ?? [];
    list.push(child);
    children.set(parent, list);
  }
  const found = [];
  const queue = [pid];
  while (queue.length > 0) {
    const next = queue.shift();
    for (const child of children.get(next) ?? []) {
      found.push(child);
      queue.push(child);
    }
  }
  return found;
}

if (carriageUp && programs.length > 0) {
  const { version, bin } = programs[0];

  // Step 10. The sshd is killed outright.
  {
    const socket = `${SOCKET_BASE}-kill-${version.replace(/[^a-z0-9]/gi, '')}`;
    verb('remote', bin, socket, [
      'start-server',
      ';',
      'set-option',
      '-s',
      'exit-empty',
      'off'
    ]);
    const state = openControlChild('remote', bin, socket);
    const ready = await waitForLines(state, 2, 10_000);
    if (!ready) {
      step10 = 'the control child never greeted, so nothing was measured';
    } else {
      // End the shared master first, then the listener, then every descendant.
      sh(sshBin, [...planeOptions(), '-O', 'exit', '127.0.0.1']);
      const kids = descendantsOf(sshd.pid);
      const killedAt = nowMs();
      for (const pid of [...kids, sshd.pid]) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* already gone is the state we wanted */
        }
      }
      const deadline = nowMs() + 40_000;
      while (!state.exited && nowMs() < deadline) await sleep(50);
      step10 = state.exited
        ? `${((nowMs() - killedAt) / 1000).toFixed(1)} s from the kill of the ` +
          `far side to the control child exiting`
        : 'the control child was still running 40 s after the kill';
      if (!state.exited) {
        fail('a killed far side did not end the control child within 40 s');
        state.child.kill('SIGKILL');
      }
      // Bring the machine back for step 11.
      sshd = spawn(sshdBin, ['-D', '-f', sshdConf], { stdio: 'ignore' });
      recordedPids.push(sshd.pid);
      waitForPort(port);
      verb('remote', bin, socket, ['kill-server']);
    }
  }

  // Step 11. The far side is frozen rather than killed, which is the case that
  // hangs instead of erroring.
  {
    const socket = `${SOCKET_BASE}-freeze-${version.replace(/[^a-z0-9]/gi, '')}`;
    verb('remote', bin, socket, [
      'start-server',
      ';',
      'set-option',
      '-s',
      'exit-empty',
      'off'
    ]);
    const state = openControlChild('remote', bin, socket);
    const ready = await waitForLines(state, 2, 10_000);
    if (!ready) {
      step11 = 'the control child never greeted, so nothing was measured';
    } else {
      const kids = descendantsOf(sshd.pid);
      const frozenAt = nowMs();
      for (const pid of kids) {
        try {
          process.kill(pid, 'SIGSTOP');
        } catch {
          /* already gone */
        }
      }
      const deadline = nowMs() + 60_000;
      while (!state.exited && nowMs() < deadline) await sleep(50);
      step11 = state.exited
        ? `${((nowMs() - frozenAt) / 1000).toFixed(1)} s from the freeze of the ` +
          `far side to the control child exiting, with ` +
          `ServerAliveInterval=5 and ServerAliveCountMax=3`
        : 'the control child was still running 60 s after the freeze';
      if (!state.exited) {
        fail('a frozen far side did not end the control child within 60 s');
        state.child.kill('SIGKILL');
      }
      for (const pid of kids) {
        try {
          process.kill(pid, 'SIGCONT');
        } catch {
          /* already gone */
        }
      }
      verb('remote', bin, socket, ['kill-server']);
    }
  }
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

for (const v of verdicts) {
  const passed = [1, 2, 3, 4, 5, 6, 7, 9].filter((n) => v.steps[n]);
  const failed = [1, 2, 3, 4, 5, 6, 7, 9].filter((n) => !v.steps[n]);
  step(
    1,
    `${v.version} step 1, the greeting block`,
    `local ${JSON.stringify(v.local.greeting)} against remote ` +
      `${JSON.stringify(v.remote.greeting)} — ${v.steps[1] ? 'IDENTICAL' : 'DIFFERENT'}`
  );
  step(
    2,
    `${v.version} step 2, refresh-client -f no-output`,
    `${JSON.stringify(v.remote.noOutputBlock)} — ` +
      `${v.steps[2] ? 'IDENTICAL to local' : 'DIFFERENT from local'}`
  );
  step(
    3,
    `${v.version} step 3, the guard shape`,
    `local ${JSON.stringify(v.local.guards)} against remote ` +
      `${JSON.stringify(v.remote.guards)} — ` +
      `${v.steps[3] ? 'same word and same flag on every guard' : 'DIFFERENT'}`
  );
  step(
    4,
    `${v.version} step 4, %sessions-changed on create, kill and rename`,
    `create ${JSON.stringify(v.remote.onCreate)}, rename ` +
      `${JSON.stringify(v.remote.onRename)}, kill ${JSON.stringify(v.remote.onKill)} — ` +
      `${v.steps[4] ? 'same notifications as local' : 'DIFFERENT from local'}`
  );
  step(
    5,
    `${v.version} step 5, %session-renamed and its argument order`,
    `${JSON.stringify(v.remote.renamedLine)} — ` +
      `${v.steps[5] ? 'identical to local' : 'DIFFERENT from local'}`
  );
  const unparsed = [
    ...new Set(
      [
        ...notificationNames(v.remote.greeting.split('\n')),
        ...notificationNames(v.remote.onCreate),
        ...notificationNames(v.remote.onRename),
        ...notificationNames(v.remote.onKill),
        ...notificationNames(v.remote.windowTraffic)
      ].filter((name) => name !== '' && !PARSED_NOTIFICATIONS.has(name))
    )
  ];
  step(
    6,
    `${v.version} step 6, window and session-changed traffic`,
    `${JSON.stringify(v.remote.windowTraffic)} — ` +
      `${v.steps[6] ? 'same parsed notifications as local' : 'DIFFERENT from local'}. ` +
      `Notifications with no named arm, which land in other-notification: ` +
      `${unparsed.map((n) => `%${n}`).join(', ') || 'none'}`
  );
  step(
    7,
    `${v.version} step 7, %exit when the far side's server is killed`,
    `${JSON.stringify(v.remote.exitLine)} after ` +
      `${String(v.remote.exitAfterMs ?? 0)} ms — ` +
      `${v.steps[7] ? 'identical to local' : 'DIFFERENT from local'}`
  );
  step(
    9,
    `${v.version} step 9, one list over control against the same over exec`,
    `${String(Buffer.byteLength(v.remote.listOverControl))} bytes against ` +
      `${String(Buffer.byteLength(v.remote.listOverExec))} bytes — ` +
      `${v.steps[9] ? 'BYTE EQUAL' : 'NOT EQUAL'}`
  );
  say(
    `   ${v.version} VERDICT: steps ${passed.join(', ')} matched` +
      (failed.length > 0
        ? `, steps ${failed.join(', ')} DID NOT. measured.control stays false`
        : `. measured.control may be true`)
  );
}

step(8, 'the -u question, asked of the control plane', step8);
step(10, 'a killed far side', step10);
step(11, 'a frozen far side', step11);

// ---------------------------------------------------------------------------
// Cleanup. Only recorded pids, only scratch sockets
// ---------------------------------------------------------------------------

for (const entry of scratchSockets) {
  const [where, program, socket] = entry.split(':');
  if (socket === REAL_SOCKET) continue;
  if (where === 'local') sh(program, ['-L', socket, 'kill-server']);
}
sh(sshBin, [...planeOptions(), '-O', 'exit', '127.0.0.1']);
for (const pid of recordedPids) {
  if (typeof pid !== 'number') continue;
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone is the state we wanted */
  }
}
if (existsSync(root)) rmSync(root, { recursive: true, force: true });
try {
  rmSync(controlPath, { force: true });
} catch {
  /* the master already removed it */
}

const after = readOperatorServer();
const identical =
  before.sessions === after.sessions &&
  before.history === after.history &&
  before.exitEmpty === after.exitEmpty;
step(
  12,
  "the operator's server after the run",
  `${after.sessions} session(s), history-limit ${after.history || 'unreadable'}, ` +
    `exit-empty ${after.exitEmpty || 'unreadable'}. ` +
    `${identical ? 'IDENTICAL to before.' : 'CHANGED. This run is a failure.'}`
);
if (!identical) {
  fail(
    `the operator's server changed: before ${JSON.stringify(before)}, after ` +
      `${JSON.stringify(after)}`
  );
}
say(`killed only these recorded pids: ${recordedPids.join(', ') || 'none'}`);

const green = verdicts.filter((v) =>
  [1, 2, 3, 4, 5, 6, 7, 9].every((n) => v.steps[n])
);
say(
  `versions whose control stream matched the local child on steps 1 to 9: ` +
    `${green.map((v) => v.version).join(', ') || 'none'}`
);

if (failures.length > 0) {
  process.stdout.write(`\n[p71] FAIL, ${String(failures.length)}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n[p71] PASS. ${String(rows.length)} rows, every one measured. The ` +
    `operator's server is identical before and after.\n`
);
