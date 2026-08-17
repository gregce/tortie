/**
 * `node build/probe-remote-attach.mjs`. The Tier 3 live probe of the remote
 * attach (Phase 70, M3, research 51 section 4.1, the ATTACH row).
 *
 * A real terminal on this Mac, over a real ssh, to a real tmux on the far side,
 * with a real sshd answering on 127.0.0.1 on a high port and every key generated
 * inside this run's own directory. Twelve steps, each printing its evidence, and
 * every claim about time is a number this run measured rather than a range it
 * assumed.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULE THAT OUTRANKS EVERYTHING ELSE IN THIS PROBE
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So an attach composed against the
 * socket `gmux` would put a terminal on the server holding the operator's live
 * sessions, and a `kill-session` in the cleanup would end one of them.
 *
 * Three rules, all mandatory, and all three are in this file.
 *
 *  1. The socket comes from `GMUX_TMUX_SOCKET` and this probe REFUSES TO START
 *     when the socket it would use is the real one. It prints the refusal and
 *     exits non zero.
 *  2. Every argv is printed in full and asserted to carry the scratch socket.
 *  3. The operator's server is read BEFORE and AFTER the whole run: the session
 *     count, `history-limit` and `exit-empty`. All three must be identical or the
 *     run is a failure whatever else passed. Only `list-sessions` and
 *     `show-options` are ever sent to it, and both are read only.
 *
 * It kills only pids it recorded and prints that list at the end. Every scratch
 * file carries a `p70-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ARGV IS MIRRORED HERE RATHER THAN IMPORTED
 * ---------------------------------------------------------------------------
 * The composer is `src/main/attach/attach-plan.ts`, which is TypeScript with
 * path aliases, and a probe that cannot resolve them prints nothing and looks
 * like a pass. `build/probe-execplane.mjs` mirrors the exec plane's argv for the
 * same reason and says so in the same words. The mirror is not the gate against
 * drift. `build/conformance-machines.mjs` reads the real module and fails when
 * the two disagree, which is condition 20 of that gate.
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
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Rule 1. Refuse the real socket, by name, before anything at all
// ---------------------------------------------------------------------------

const REAL_SOCKET = 'gmux';
const SOCKET =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p70-${String(process.pid)}`;

if (SOCKET === REAL_SOCKET) {
  process.stderr.write(
    '[p70] REFUSING TO RUN. The socket this probe would use is "gmux", the real ' +
      'one. In this probe the other machine is this Mac, so an attach would put ' +
      'a terminal on the server holding your live sessions and the cleanup ' +
      'would end one of them. Set GMUX_TMUX_SOCKET to a scratch name and try ' +
      'again.\n'
  );
  process.exit(1);
}

const root = join(tmpdir(), `p70-remote-attach-${String(process.pid)}`);
const recordedPids = [];
const rows = [];
const failures = [];

const say = (text) => process.stdout.write(`[p70] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p70] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p70] ${String(n)}. ${what}: ${evidence}\n`);
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until a predicate answers true, or give up. Answers the wait in ms. */
async function waitFor(predicate, timeoutMs, everyMs = 20) {
  const started = nowMs();
  for (;;) {
    if (predicate()) return nowMs() - started;
    if (nowMs() - started > timeoutMs) return -1;
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------
// Step 0. The operator's server, before. READ ONLY
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

const userRecord = join(homedir(), '.ssh', 'known_hosts');
const sizeOf = (path) => {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
};
const userRecordBefore = sizeOf(userRecord);

// ---------------------------------------------------------------------------
// Step 1. The scratch machine
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });

const sshBin = '/usr/bin/ssh';
const keygen = '/usr/bin/ssh-keygen';
const sshdBin = '/usr/sbin/sshd';
const hostKey = join(root, 'p70-hostkey');
const userKey = join(root, 'p70-userkey');
const authorized = join(root, 'p70-authorized');
const tortieRecord = join(root, 'p70-known-machines');
const sshdConf = join(root, 'p70-sshd.conf');
const port = 38_000 + (process.pid % 2000);
const me = execFileSync('/usr/bin/id', ['-un'], { encoding: 'utf8' }).trim();

sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', hostKey]);
sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', userKey]);

/** The public keys this Mac would offer, so the run works with or without one. */
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

const sshd = spawn(sshdBin, ['-D', '-f', sshdConf], { stdio: 'ignore' });
recordedPids.push(sshd.pid);

function waitForPort(p) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (sh('/usr/bin/nc', ['-z', '127.0.0.1', String(p)]).code === 0) return true;
    sh('/bin/sleep', ['0.1']);
  }
  return false;
}
const carriageUp = waitForPort(port);

// The machine's own key goes into Tortie's record file once, by hand, because
// StrictHostKeyChecking=yes means nothing Tortie runs can ever add a line. That
// first contact belongs to the one visible connection test in the real product,
// and here it is this line.
writeFileSync(
  tortieRecord,
  sh('/usr/bin/ssh-keyscan', ['-p', String(port), '127.0.0.1']).stdout,
  'utf8'
);
const tortieRecordAfterFirstContact = sizeOf(tortieRecord);

const remoteTmuxPath = sh('/usr/bin/which', ['tmux']).stdout.trim() || '/usr/bin/tmux';

step(
  1,
  'the scratch machine answers',
  carriageUp
    ? `sshd pid ${String(sshd.pid)} on 127.0.0.1:${String(port)}, its tmux is ` +
        `${remoteTmuxPath}, and its sessions live on the scratch socket ${SOCKET}`
    : `the sshd did NOT answer on port ${String(port)}. Every finding below is ` +
        `NOT evidence about ssh.`
);
if (!carriageUp) fail('the scratch sshd did not start');

// ---------------------------------------------------------------------------
// The composition, mirroring src/main/attach/attach-plan.ts
// ---------------------------------------------------------------------------

const CONTROL_DIR = join(tmpdir(), 'tortie-mux');
mkdirSync(CONTROL_DIR, { recursive: true, mode: 0o700 });
const controlPath = join(CONTROL_DIR, `m-p70${String(process.pid).slice(-8)}`);

/** Mirrors `sshOptions` in src/main/machines/ssh.ts, in the same order. */
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
    // This probe's own identity, because the plane names no key on purpose and
    // this Mac may hold none of its own.
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

/** Mirrors `shellQuoteArg` in src/main/restore/command.ts. */
const SAFE_ARG = /^[A-Za-z0-9_\-./=:@%+,]+$/;
const quoteArg = (arg) => {
  if (arg.length === 0) return "''";
  if (SAFE_ARG.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
};
const quoteArgv = (argv) => argv.map(quoteArg).join(' ');

/** Mirrors `remoteTmuxArgv` in src/main/machines/context.ts. */
const remoteTmuxArgv = (args) => [
  remoteTmuxPath,
  '-L',
  SOCKET,
  '-f',
  '/dev/null',
  ...args
];

/**
 * Mirrors `quoteTarget` in src/main/attach/attach-plan.ts.
 *
 * MEASURED BY THIS PROBE, 2026-08-17, and it is the finding that earned the
 * probe its keep. The first build left the target to the general quoter, which
 * passes `=` through, and what came back on the terminal was
 * `zsh:1: p70-attach-77211 not found`. zsh has an EQUALS expansion which is on
 * by default: a word beginning with `=` is replaced by the path of the command
 * named after it. So the far side's shell rewrote the exact-match target into a
 * program lookup and the attach never reached tmux.
 */
const quoteTarget = (target) => `'${target.replace(/'/g, `'\\''`)}'`;

/** Mirrors the remote branch of `attachPlan`. */
function attachArgv(tmuxName) {
  const call = remoteTmuxArgv(['-u', 'attach-session', '-t']);
  return [
    '-t',
    ...planeOptions(),
    '127.0.0.1',
    `${quoteArgv(call)} ${quoteTarget(`=${tmuxName}`)}`
  ];
}

/**
 * One command against the scratch machine, for the readings this probe makes.
 *
 * ANY argument that begins with `=` is quoted, not only the attach target. The
 * measurement above is about the far side's shell rather than about the attach,
 * so it applies to every verb that names a session by an exact-match name. This
 * probe's own `display-message -t =name` and `capture-pane -t =name` both came
 * back empty until they were quoted, which is how the reach of the finding was
 * established rather than assumed.
 */
function remoteTmux(args) {
  const command = remoteTmuxArgv(args)
    .map((arg) => (arg.startsWith('=') ? quoteTarget(arg) : quoteArg(arg)))
    .join(' ');
  return sh(sshBin, [...planeOptions(), '127.0.0.1', command]);
}

// ---------------------------------------------------------------------------
// Step 2. The composed attach argv, printed in full
// ---------------------------------------------------------------------------

const SESSION_NAME = `p70-attach-${String(process.pid)}`;
const sample = attachArgv(SESSION_NAME);
const sampleText = sample.join(' ');
const REQUIRED = [
  'BatchMode=yes',
  'ConnectTimeout=',
  'StrictHostKeyChecking=yes',
  'UserKnownHostsFile=',
  'ControlMaster=auto',
  'ControlPath=',
  'ControlPersist=',
  'ServerAliveInterval=',
  'ServerAliveCountMax='
];
const missing = REQUIRED.filter((option) => !sampleText.includes(option));
step(
  2,
  'the composed attach argv',
  `${String(sample.length)} arguments, ${String(
    REQUIRED.length - missing.length
  )} of ${String(REQUIRED.length)} carriage options present` +
    (missing.length > 0 ? `, MISSING ${missing.join(', ')}` : '')
);
say(`   ${sshBin} ${sampleText}`);
if (missing.length > 0) fail(`the attach argv is missing ${missing.join(', ')}`);
if (sample[0] !== '-t') fail('the attach argv does not force a terminal first');
if (sample.includes(REAL_SOCKET)) {
  fail('the attach argv carries the literal socket gmux');
}
if (!sampleText.includes(`-L ${SOCKET} `)) {
  fail(`the attach argv does not carry -L ${SOCKET}`);
}
if (!sampleText.includes('-f /dev/null')) {
  fail('the attach argv does not carry -f /dev/null');
}
if (!sampleText.includes(' -u attach-session -t ')) {
  fail('the attach argv does not carry -u before attach-session');
}
if (!sampleText.includes(`'=${SESSION_NAME}'`)) {
  fail(
    'the attach argv does not match the session name exactly, or leaves the ' +
      "target unquoted where the far side's shell can rewrite it"
  );
}
if (!sampleText.includes(`${remoteTmuxPath} -L `)) {
  fail('the attach argv names a bare program rather than an absolute one');
}

// ---------------------------------------------------------------------------
// The terminal binding. The same one the app runs
// ---------------------------------------------------------------------------

const nodePty = require('node-pty');

/** One attach client, with everything it printed kept as one string. */
function openAttach(tmuxName, cols = 80, rowsHigh = 24) {
  const pty = nodePty.spawn(sshBin, attachArgv(tmuxName), {
    name: 'xterm-256color',
    cols,
    rows: rowsHigh,
    cwd: homedir(),
    env: { ...process.env, COLORTERM: 'truecolor', LANG: 'en_US.UTF-8' }
  });
  const client = {
    pty,
    pid: pty.pid,
    text: '',
    bytes: 0,
    firstByteAt: -1,
    exited: false,
    exitCode: -1,
    startedAt: nowMs()
  };
  pty.onData((data) => {
    if (client.firstByteAt < 0) client.firstByteAt = nowMs();
    client.text += data;
    client.bytes += Buffer.byteLength(data, 'utf8');
  });
  pty.onExit(({ exitCode }) => {
    client.exited = true;
    client.exitCode = exitCode;
  });
  recordedPids.push(pty.pid);
  return client;
}

async function main() {
  // -------------------------------------------------------------------------
  // Step 3. A session on the far side
  // -------------------------------------------------------------------------

  const created = remoteTmux([
    'new-session',
    '-d',
    '-P',
    '-F',
    '#{session_id}',
    '-s',
    SESSION_NAME
  ]);
  const farId = created.stdout.trim();
  // The same option Tortie writes on a machine's own server at boot, and step 7
  // depends on it. tmux gives a session a status line by default, and that line
  // takes one row off the window, so a client of 30 rows would report a window
  // of 29 and the resize reading would look wrong when it was right.
  remoteTmux(['set-option', '-g', 'status', 'off']);
  const listed = remoteTmux(['list-sessions', '-F', '#{session_name}']);
  step(
    3,
    'a session on the far side',
    `created ${JSON.stringify(SESSION_NAME)} as ${farId || 'NO ID'} (exit ` +
      `${String(created.code)}), and that machine now lists ` +
      `${JSON.stringify(listed.stdout.trim())}`
  );
  if (!listed.stdout.includes(SESSION_NAME)) {
    fail('the far side does not list the session this probe created');
  }

  // -------------------------------------------------------------------------
  // Step 4. A real terminal over a real link
  // -------------------------------------------------------------------------

  const client = openAttach(SESSION_NAME);
  const waited = await waitFor(() => client.bytes > 0, 5000);
  const toFirstByte =
    client.firstByteAt < 0 ? -1 : client.firstByteAt - client.startedAt;
  step(
    4,
    'bytes arrive from the other machine',
    waited < 0
      ? 'NOTHING arrived within 5000 ms'
      : `${String(client.bytes)} bytes, first byte at ${String(toFirstByte)} ms ` +
          `after the spawn`
  );
  if (waited < 0) fail('no bytes arrived from the remote attach within 5 s');

  // -------------------------------------------------------------------------
  // Step 5. Typing into it, and the answer coming back
  // -------------------------------------------------------------------------
  //
  // The command is written so its OWN text is not the marker. What is typed is
  // `printf 'p70-round%s\n' trip`, and what comes back is `p70-roundtrip`, so
  // matching the marker cannot match the echo of the keystrokes.

  const MARKER = 'p70-roundtrip';
  await sleep(300);
  const typedAt = nowMs();
  client.pty.write("printf 'p70-round%s\\n' trip\r");
  const roundTrip = await waitFor(() => client.text.includes(MARKER), 10_000);
  step(
    5,
    'a command typed here runs there',
    roundTrip < 0
      ? `the answer ${MARKER} never came back within 10000 ms`
      : `${String(nowMs() - typedAt)} ms from the keystrokes to ${MARKER} on ` +
          `this Mac`
  );
  if (roundTrip < 0) fail('a command typed into the remote pane never answered');

  // -------------------------------------------------------------------------
  // Step 6. The far side agrees that one client is attached
  // -------------------------------------------------------------------------

  const attachedCount = remoteTmux([
    'list-sessions',
    '-F',
    '#{session_name} #{session_attached}'
  ]);
  const attachedRow =
    attachedCount.stdout
      .split('\n')
      .find((line) => line.startsWith(SESSION_NAME)) ?? '';
  step(
    6,
    'the far side counts the clients',
    `it reports ${JSON.stringify(attachedRow.trim())}, so ` +
      `${attachedRow.trim().split(' ')[1] ?? 'no'} client(s) are attached`
  );
  if (attachedRow.trim() !== `${SESSION_NAME} 1`) {
    fail(
      `the far side reports ${JSON.stringify(attachedRow.trim())} rather than ` +
        `exactly one attached client`
    );
  }

  // -------------------------------------------------------------------------
  // Step 7. A resize here reaches the window there
  // -------------------------------------------------------------------------

  try {
    client.pty.resize(100, 30);
  } catch (err) {
    // A terminal that already ended cannot be resized, and saying that plainly
    // is better than a stack trace that hides every step after it.
    fail(`the resize could not be sent: ${String(err)}`);
  }
  await sleep(600);
  // MEASURED on tmux 3.6a: `display-message -p -t =<name>` answers an EMPTY
  // width and height, because a session target does not resolve the window
  // variables. `list-windows -t =<name> -F` does, and it is the reading used
  // here for that reason.
  const size = remoteTmux([
    'list-windows',
    '-t',
    `=${SESSION_NAME}`,
    '-F',
    '#{window_width}x#{window_height}'
  ]);
  const observedSize = size.stdout.trim();
  step(
    7,
    'a resize reaches the other machine',
    `asked for 100x30, and that machine reports ${JSON.stringify(observedSize)}`
  );
  if (observedSize !== '100x30') {
    fail(`the far side reports ${observedSize} rather than 100x30`);
  }

  // -------------------------------------------------------------------------
  // Step 8. The link is killed. The session is not
  // -------------------------------------------------------------------------

  process.kill(client.pid, 'SIGKILL');
  const exitWait = await waitFor(() => client.exited, 10_000);
  const stillThere = remoteTmux(['list-sessions', '-F', '#{session_name}']);
  // MEASURED on tmux 3.6a: `capture-pane -t =<name>` answers
  // "can't find pane: =<name>", because capture-pane wants a PANE and an
  // exact-match session name alone is not one. `=<name>:` is, and it means the
  // current pane of the current window of exactly that session.
  const scrollback = remoteTmux([
    'capture-pane',
    '-p',
    '-t',
    `=${SESSION_NAME}:`
  ]);
  step(
    8,
    'killing the client here leaves the session there',
    `the terminal here ended ${
      exitWait < 0 ? 'NOT WITHIN 10000 ms' : `${String(exitWait)} ms after the ` +
        `kill, exit ${String(client.exitCode)}`
    }; that machine still lists ${JSON.stringify(stillThere.stdout.trim())} and ` +
      `its scrollback still holds ${MARKER}: ` +
      `${scrollback.stdout.includes(MARKER) ? 'yes' : 'NO'}`
  );
  if (exitWait < 0) fail('the terminal did not end when its ssh was killed');
  if (!stillThere.stdout.includes(SESSION_NAME)) {
    fail('the session on the other machine died with its client');
  }
  if (!scrollback.stdout.includes(MARKER)) {
    fail('the scrollback on the other machine lost what step 5 printed');
  }

  // -------------------------------------------------------------------------
  // Step 9. Attaching again shows the same screen
  // -------------------------------------------------------------------------

  const second = openAttach(SESSION_NAME);
  const back = await waitFor(() => second.text.includes(MARKER), 10_000);
  step(
    9,
    'attaching again shows the same screen',
    back < 0
      ? `${MARKER} was NOT on the screen within 10000 ms`
      : `${MARKER} was drawn again ${String(back)} ms after the second attach, ` +
          `in ${String(second.bytes)} bytes`
  );
  if (back < 0) fail('the second attach did not redraw what was on the screen');

  // -------------------------------------------------------------------------
  // Step 10. A frozen far side, measured rather than assumed
  // -------------------------------------------------------------------------
  //
  // Freezing reproduces the condition that matters: the socket stays open and no
  // reply ever comes. The descendants of the sshd are what hold this connection,
  // and Phase 69 learned the hard way that stopping the listener alone measures
  // nothing. The tmux server on the far side is not a descendant of the sshd, so
  // it keeps running, which is what step 11 then reads.

  function descendantsOf(rootPid) {
    const table = sh('/bin/ps', ['-o', 'pid=,ppid=', '-ax']).stdout;
    const children = new Map();
    for (const line of table.split('\n')) {
      const [pid, ppid] = line.trim().split(/\s+/).map(Number);
      if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid).push(pid);
    }
    const out = [];
    const walk = (pid) => {
      for (const child of children.get(pid) ?? []) {
        out.push(child);
        walk(child);
      }
    };
    walk(rootPid);
    return out;
  }

  const frozenPids = descendantsOf(sshd.pid);
  for (const pid of frozenPids) {
    recordedPids.push(pid);
    try {
      process.kill(pid, 'SIGSTOP');
    } catch {
      /* nothing to freeze means nothing to measure */
    }
  }
  const frozenAt = nowMs();
  const frozenWait = await waitFor(() => second.exited, 120_000, 100);
  const seconds = ((nowMs() - frozenAt) / 1000).toFixed(1);
  step(
    10,
    'a frozen link is noticed',
    frozenWait < 0
      ? `the terminal was STILL open 120 s after ${String(frozenPids.length)} ` +
          `process(es) on the far side were frozen`
      : `${seconds} s from freezing ${String(frozenPids.length)} process(es) on ` +
          `the far side to the terminal here ending, exit ` +
          `${String(second.exitCode)}. Phase 69 measured 19.3 s for the same ` +
          `keepalive pair on the exec plane.`
  );
  if (frozenWait < 0) {
    fail('a frozen far side never ended the terminal on this Mac');
  }

  // -------------------------------------------------------------------------
  // Step 11. The machine comes back
  // -------------------------------------------------------------------------

  for (const pid of frozenPids) {
    try {
      process.kill(pid, 'SIGCONT');
    } catch {
      /* already running */
    }
  }
  await sleep(500);
  sh(sshBin, [...planeOptions(), '-O', 'exit', '127.0.0.1']);
  const alive = remoteTmux(['list-sessions', '-F', '#{session_name}']);
  const third = openAttach(SESSION_NAME);
  const thirdBack = await waitFor(() => third.text.includes(MARKER), 15_000);
  step(
    11,
    'the machine comes back',
    `after resuming it, that machine lists ` +
      `${JSON.stringify(alive.stdout.trim())} and a fresh attach ` +
      `${
        thirdBack < 0
          ? 'did NOT redraw the screen within 15000 ms'
          : `redrew ${MARKER} in ${String(thirdBack)} ms`
      }`
  );
  if (!alive.stdout.includes(SESSION_NAME)) {
    fail('the session did not survive its machine being frozen');
  }
  if (thirdBack < 0) fail('a fresh attach after the freeze did not work');

  // -------------------------------------------------------------------------
  // Cleanup, then step 12
  // -------------------------------------------------------------------------

  try {
    third.pty.kill();
  } catch {
    /* already gone is the state we wanted */
  }
  // The scratch session and the scratch server are ended by name on the SCRATCH
  // socket, which was refused at the top of this file if it were the real one.
  remoteTmux(['kill-session', '-t', `=${SESSION_NAME}`]);
  remoteTmux(['kill-server']);
  sh(sshBin, [...planeOptions(), '-O', 'exit', '127.0.0.1']);

  for (const pid of recordedPids) {
    if (typeof pid !== 'number') continue;
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone is the state we wanted */
    }
  }

  const tortieRecordAfter = sizeOf(tortieRecord);
  const userRecordAfter = sizeOf(userRecord);
  if (tortieRecordAfter !== tortieRecordAfterFirstContact) {
    fail("the attach added a line to Tortie's own record file");
  }
  if (userRecordAfter !== userRecordBefore) {
    fail("the run changed the person's own record file");
  }

  if (existsSync(root)) rmSync(root, { recursive: true, force: true });

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
      `${identical ? 'IDENTICAL to step 0.' : 'CHANGED. This run is a failure.'}`
  );
  if (!identical) {
    fail(
      `the operator's server changed: before ${JSON.stringify(
        before
      )}, after ${JSON.stringify(after)}`
    );
  }

  say(`killed only these recorded pids: ${recordedPids.join(', ') || 'none'}`);

  if (failures.length > 0) {
    process.stdout.write(`\n[p70] FAIL, ${String(failures.length)}:\n`);
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n[p70] PASS. ${String(rows.length)} steps, every one measured. A real ` +
      `terminal carried a real session over a real link, the session outlived ` +
      `the link twice, and the operator's server is identical before and after.\n`
  );
  process.exit(0);
}

main().catch((err) => {
  fail(`the probe threw: ${String(err && err.stack ? err.stack : err)}`);
  // The scratch server is ended on the SCRATCH socket, which was refused at the
  // top of this file if it were the real one.
  remoteTmux(['kill-server']);
  for (const pid of recordedPids) {
    if (typeof pid !== 'number') continue;
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone is the state we wanted */
    }
  }
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  // A run that threw still reports the one thing that outranks everything else.
  const after = readOperatorServer();
  step(
    12,
    "the operator's server after a run that threw",
    `${after.sessions} session(s), history-limit ${after.history || 'unreadable'}, ` +
      `exit-empty ${after.exitEmpty || 'unreadable'}. ` +
      `${
        before.sessions === after.sessions &&
        before.history === after.history &&
        before.exitEmpty === after.exitEmpty
          ? 'IDENTICAL to step 0.'
          : 'CHANGED. This run is a failure whatever else it printed.'
      }`
  );
  process.stdout.write(`\n[p70] FAIL, ${String(failures.length)}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
});
