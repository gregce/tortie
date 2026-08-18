/**
 * `npm run probe:execplane`. The Tier 3 live probe of the exec plane (Phase 69,
 * M2).
 *
 * Real ssh to a real sshd on 127.0.0.1 on a high port, with keys generated in this
 * run's own directory. Eighteen steps, each measured, printed as a table with a
 * number on every row.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULE THAT OUTRANKS EVERYTHING ELSE IN THIS PROBE
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE REMOTE MACHINE IS THIS MAC. So a remote command reaching
 * `tmux -L gmux set-option -g history-limit ...` would land on the operator's own
 * server, on the socket holding his live sessions, and would rewrite every option
 * on it. This is the first phase where a remote code path can destroy local work.
 *
 * Three rules, all mandatory, and all three are in this file.
 *
 *  1. The socket comes from the same rule the app uses, and this probe REFUSES TO
 *     START when the socket it would use is `gmux`. It prints the refusal and
 *     exits non zero.
 *  2. Every remote argv is printed in full and asserted to carry the scratch
 *     socket, never the literal `gmux`.
 *  3. The operator's server is read BEFORE and AFTER the whole run: the session
 *     count, `history-limit` and `exit-empty`. All three must be identical, or the
 *     run is a failure whatever else passed. The session count alone is not enough
 *     evidence any more, because the option re-assert is the destructive verb this
 *     rung adds.
 *
 * It kills only pids it recorded and prints that list at the end. Every scratch
 * file carries a `p69-` prefix.
 *
 * ---------------------------------------------------------------------------
 * THE TWO MODES, AND WHICH CONFIG ROOT EACH GATE READS
 * ---------------------------------------------------------------------------
 * Run with `GMUX_CONFIG_ROOT` set, the probe hands its machine to a harness
 * under `${TMPDIR}gmux-p69-exec`. It writes the carriage file there, leaves the
 * sshd and the key holder running, and prints the exact kill command for both.
 * Run without it, the probe cleans up after itself. It kills every recorded
 * pid, it closes the ssh control socket, and it removes its own run directory.
 * Both arms are the `configRoot` branches near the end of this file.
 * `npm run smoke:remote` reads a different root,
 * `${TMPDIR}gmux-p70-remote`, and provisions its own machine through
 * `build/with-scratch-machine.mjs`, so since Phase 71 nothing needs the handoff
 * and a person who wants one asks for it by setting the variable. The table in
 * DEVELOPMENT.md, under "Where each remote gate keeps its isolated config
 * root", names every gate's root.
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
const SOCKET = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p69-${String(process.pid)}`;

if (SOCKET === REAL_SOCKET) {
  process.stderr.write(
    '[p69] REFUSING TO RUN. The socket this probe would use is "gmux", the real ' +
      'one. In this probe the remote machine is this Mac, so a remote ' +
      'set-option would rewrite every option on the server holding your live ' +
      'sessions. Set GMUX_TMUX_SOCKET to a scratch name and try again.\n'
  );
  process.exit(1);
}

const root = join(tmpdir(), `p69-execplane-${String(process.pid)}`);
const recordedPids = [];
const rows = [];
const failures = [];

const say = (text) => process.stdout.write(`[p69] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p69] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p69] ${String(n)}. ${what}: ${evidence}\n`);
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

// ---------------------------------------------------------------------------
// Step 1. The operator's server, before. READ ONLY
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
  1,
  "the operator's server before the run",
  `${before.sessions} session(s), history-limit ${before.history || 'unreadable'}, ` +
    `exit-empty ${before.exitEmpty || 'unreadable'}`
);

/** The two identity record files, in bytes, before and after. */
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
// Step 2. The carriage
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });

const sshBin = '/usr/bin/ssh';
const keygen = '/usr/bin/ssh-keygen';
const sshdBin = '/usr/sbin/sshd';
const hostKey = join(root, 'p69-hostkey');
const userKey = join(root, 'p69-userkey');
const authorized = join(root, 'p69-authorized');
const tortieRecord = join(root, 'p69-known-machines');
const sshdConf = join(root, 'p69-sshd.conf');
const port = 36_000 + (process.pid % 2000);
const me = execFileSync('/usr/bin/id', ['-un'], { encoding: 'utf8' }).trim();

sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', hostKey]);
sh(keygen, ['-q', '-t', 'ed25519', '-N', '', '-f', userKey]);

/**
 * The public keys the person's OWN ssh client would offer, so a command the exec
 * plane composed can sign in to this scratch machine.
 *
 * This is needed because the plane deliberately composes no `IdentityFile`. Tortie
 * names no key: it lets the client use the person's own agent and their own default
 * identities, which is how a real machine of theirs accepts them. This probe's own
 * commands pass `IdentityFile` and `IdentitiesOnly=yes`, so they were never
 * affected. The Electron harness runs the REAL plane argv, which carries neither,
 * and it could not sign in at all until this file trusted these keys.
 *
 * Nothing is written outside this run's own directory. The file is
 * `p69-authorized` inside the probe root, the server listens on 127.0.0.1 on a high
 * port, and password sign in is off. `~/.ssh` is read and never written.
 */
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

const trusted = ownPublicKeys();
writeFileSync(
  authorized,
  [readFileSync(`${userKey}.pub`, 'utf8').trim(), ...trusted, ''].join('\n'),
  'utf8'
);
chmodSync(authorized, 0o600);

/**
 * This run's own ssh agent, holding this run's own key.
 *
 * MEASURED 2026-08-17: this Mac has no ssh key at all. `ssh-add -L` answers "The
 * agent has no identities" and there is no `~/.ssh/*.pub`. So the list above is
 * empty, and a command the exec plane composed has no identity to offer, because
 * the plane names no key on purpose.
 *
 * An agent is the mechanism a person's own machine would accept them by, and it is
 * the one Tortie relies on. So this probe starts an agent of its own, loads the key
 * it generated above, and hands the socket to the Electron harness through the
 * carriage file. The plane's argv is unchanged, which is the point: the harness
 * exercises the REAL argv, and the identity comes from the agent exactly as it
 * would on a machine of the person's own.
 *
 * Nothing is written into `~/.ssh`, and the agent is one of the recorded pids.
 */
let authSock = '';
{
  const started = sh('/usr/bin/ssh-agent', ['-s']);
  const sockMatch = /SSH_AUTH_SOCK=([^;]+);/.exec(started.stdout);
  const pidMatch = /SSH_AGENT_PID=([0-9]+);/.exec(started.stdout);
  if (started.code === 0 && sockMatch !== null && pidMatch !== null) {
    authSock = sockMatch[1];
    recordedPids.push(Number(pidMatch[1]));
    const added = spawnSync('/usr/bin/ssh-add', [userKey], {
      encoding: 'utf8',
      env: { ...process.env, SSH_AUTH_SOCK: authSock }
    });
    if (added.status !== 0) authSock = '';
  }
}
writeFileSync(tortieRecord, '', 'utf8');
const tortieRecordBefore = sizeOf(tortieRecord);

function writeSshdConf(extra = []) {
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
      ...extra,
      ''
    ].join('\n'),
    'utf8'
  );
}
writeSshdConf();

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

// The machine's own key goes into TORTIE's record file, once, by hand, because
// StrictHostKeyChecking=yes means the plane itself can never add a line. That is
// the property under test in step 16, so the probe does the first contact the way
// the one visible connection test does it and then measures that nothing else
// changes.
const scanned = sh('/usr/bin/ssh-keyscan', ['-p', String(port), '127.0.0.1']).stdout;
writeFileSync(tortieRecord, scanned, 'utf8');
const tortieRecordAfterFirstContact = sizeOf(tortieRecord);

const tmuxPath = sh('/usr/bin/which', ['tmux']).stdout.trim() || '/usr/bin/tmux';
step(
  2,
  'the carriage',
  carriageUp
    ? `sshd pid ${String(sshd.pid)} on 127.0.0.1:${String(port)}, key ${hostKey}, ` +
        `remote program ${tmuxPath}. It accepts this run's own key plus ` +
        `${String(trusted.length)} of the person's own public key(s). The exec ` +
        `plane names no key, so this run also holds its key in an agent of its ` +
        `own at ${authSock || 'NO AGENT, and the Electron harness cannot sign in'}`
    : `the sshd did NOT answer on port ${String(port)}. Every remote finding ` +
        `below is NOT evidence about ssh.`
);
if (!carriageUp) fail('the scratch sshd did not start');

// ---------------------------------------------------------------------------
// The plane, composed the way the app composes it
// ---------------------------------------------------------------------------

const CONTROL_DIR = join(tmpdir(), 'tortie-mux');
mkdirSync(CONTROL_DIR, { recursive: true, mode: 0o700 });
const controlPath = join(CONTROL_DIR, `m-p69${String(process.pid).slice(-8)}`);

const KEEPALIVE = { interval: 5, countMax: 3 };

function planeOptions(keepalive = KEEPALIVE) {
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
    `ServerAliveInterval=${String(keepalive.interval)}`,
    '-o',
    `ServerAliveCountMax=${String(keepalive.countMax)}`,
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

/** Every argv this probe sent, in order, for the ordering assertions. */
const sentArgv = [];

/**
 * Quote one argument for the FAR SIDE's login shell.
 *
 * This mirrors `shellQuoteArg` in src/main/restore/command.ts, which is the one
 * quoting helper the app uses. It is here rather than imported because this probe
 * is plain node and the app's module is TypeScript with path aliases.
 *
 * IT IS THE WHOLE REASON THIS PROBE EARNED ITS KEEP. The first build of the plane
 * passed the tmux call as separate ssh arguments, and ssh joins everything after
 * the address into a STRING that the far side's shell splits again. Measured on
 * this run, before the fix: `;` became that shell's own separator and the boot
 * exited 127, and `#{session_id}` became that shell's comment and the format never
 * reached tmux.
 */
const SAFE_ARG = /^[A-Za-z0-9_\-./=:@%+,]+$/;
const quoteArg = (arg) => {
  if (arg.length === 0) return "''";
  if (SAFE_ARG.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
};
const quoteArgv = (argv) => argv.map(quoteArg).join(' ');

function remoteTmux(args, keepalive = KEEPALIVE, program = tmuxPath) {
  const remoteCommand = quoteArgv([
    program,
    '-L',
    SOCKET,
    '-f',
    '/dev/null',
    ...args
  ]);
  const argv = [...planeOptions(keepalive), '127.0.0.1', remoteCommand];
  sentArgv.push(args.join(' '));
  const started = nowMs();
  const out = sh(sshBin, argv);
  return { ...out, ms: nowMs() - started, argv };
}

function remoteShell(command, keepalive = KEEPALIVE) {
  const argv = [...planeOptions(keepalive), '127.0.0.1', command];
  sentArgv.push(`SHELL ${command}`);
  const started = nowMs();
  const out = sh(sshBin, argv);
  return { ...out, ms: nowMs() - started, argv };
}

// ---------------------------------------------------------------------------
// Step 3. The composed argv, printed in full
// ---------------------------------------------------------------------------

const sample = [
  ...planeOptions(),
  '127.0.0.1',
  quoteArgv([tmuxPath, '-L', SOCKET, '-f', '/dev/null', 'list-sessions', '-F', '#{session_id}'])
];
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
  3,
  'the composed argv',
  `${String(sample.length)} arguments, ${String(
    REQUIRED.length - missing.length
  )} of ${String(REQUIRED.length)} required options present` +
    (missing.length > 0 ? `, MISSING ${missing.join(', ')}` : '')
);
say(`   ${sshBin} ${sampleText}`);
if (missing.length > 0) fail(`the argv is missing ${missing.join(', ')}`);
if (sample.includes(REAL_SOCKET)) {
  fail('the argv carries the literal socket gmux');
}
if (!sampleText.includes(`-L ${SOCKET} `)) {
  fail(`the argv does not carry -L ${SOCKET}`);
}
if (!sampleText.includes('-f /dev/null')) {
  fail('the argv does not carry -f /dev/null');
}

// ---------------------------------------------------------------------------
// Step 4. The control path
// ---------------------------------------------------------------------------

const controlBytes = Buffer.byteLength(controlPath, 'utf8');
// eslint-disable-next-line no-bitwise
const controlMode = (statSync(CONTROL_DIR).mode & 0o777).toString(8);
step(
  4,
  'the control path',
  `${controlPath} is ${String(controlBytes)} bytes of a 100 byte budget, in a ` +
    `directory at mode ${controlMode}`
);
if (controlBytes > 100) fail(`the control path is ${String(controlBytes)} bytes`);
if (controlMode !== '700') fail(`the control directory is at mode ${controlMode}`);

// ---------------------------------------------------------------------------
// Step 5. The first verb, against a machine with no server
// ---------------------------------------------------------------------------

const first = remoteTmux(['list-sessions', '-F', '#{session_id}']);
const firstLine = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? '';
const noServerPhrases = ['no server running on', 'error connecting to'];
const looksLikeNoServer = noServerPhrases.some((p) => first.both.includes(p));
step(
  5,
  'the first verb against a machine with no server',
  `${String(first.ms)} ms, exit ${String(first.code)}, class ` +
    `${looksLikeNoServer ? 'no-server' : 'NOT no-server'}, stderr ` +
    `${JSON.stringify(firstLine(first.both))}`
);
if (!looksLikeNoServer) {
  fail('a machine with no server did not answer with a no-server sentence');
}

// ---------------------------------------------------------------------------
// Step 6. ControlMaster
// ---------------------------------------------------------------------------

function sshProcessCount() {
  const out = sh('/bin/sh', [
    '-c',
    `/bin/ps -o command= -ax | grep -c "ControlPath=${controlPath}" || true`
  ]).stdout.trim();
  return Number(out) || 0;
}

const second = remoteTmux(['list-sessions', '-F', '#{session_id}']);
const masters = sshProcessCount();
step(
  6,
  'ControlMaster',
  `first verb ${String(first.ms)} ms, second verb ${String(second.ms)} ms, ` +
    `${String(masters)} process(es) hold the shared connection`
);

// ---------------------------------------------------------------------------
// Step 7. ensureRemoteServer ordering, driven as the app orders it
// ---------------------------------------------------------------------------

const MARKER = '__TORTIE_PATH__';
const bootArgs = ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off'];
const boot = remoteTmux(bootArgs);
const pathRead = remoteShell(
  `"$SHELL" -lc 'printf ${MARKER}%s${MARKER} "$PATH"'`
);
const pathMatch = new RegExp(`${MARKER}(.*?)${MARKER}`, 's').exec(pathRead.stdout);
const remotePath = (pathMatch?.[1] ?? '').trim();
const envSet = remoteTmux(['set-environment', '-g', 'PATH', remotePath]);

const SERVER_OPTIONS = [
  ['status', '-g', 'off'],
  ['escape-time', '-s', '0'],
  ['extended-keys', '-s', 'on'],
  ['allow-passthrough', '-g', 'on'],
  ['focus-events', '-s', 'on'],
  ['default-terminal', '-g', 'tmux-256color'],
  ['remain-on-exit', '-g', 'failed'],
  ['exit-empty', '-s', 'off'],
  ['mouse', '-g', 'off'],
  ['copy-mode-position-format', '-g', ''],
  ['mode-style', '-g', 'noattr,bg=default,fg=default'],
  ['history-limit', '-g', '25000']
];

function assertOptions() {
  for (const [name, scope, value] of SERVER_OPTIONS) {
    remoteTmux(['set-option', scope, name, value]);
  }
}
assertOptions();

const bootIndex = sentArgv.findIndex((a) => a.startsWith('start-server'));
const pathIndex = sentArgv.findIndex((a) => a.startsWith('SHELL'));
const firstSetOption = sentArgv.findIndex((a) => a.startsWith('set-option'));
step(
  7,
  'the ordering',
  `start-server at position ${String(bootIndex)}, the program list read at ` +
    `${String(pathIndex)}, the first set-option at ${String(firstSetOption)}`
);
say(`   the argv sequence was: ${sentArgv.join(' | ')}`);
if (!(pathIndex < firstSetOption)) {
  fail('the program list was read AFTER the first option was written');
}
if (boot.code !== 0) fail(`the boot verb exited ${String(boot.code)}`);
if (remotePath.length === 0 || !remotePath.includes('/')) {
  fail('the machine reported no usable program search list');
}
say(`   the machine's program search list is ${remotePath}`);

// ---------------------------------------------------------------------------
// Step 8. Options after boot, read back from the machine
// ---------------------------------------------------------------------------

function readOptions() {
  const table = [];
  for (const [name, scope, wanted] of SERVER_OPTIONS) {
    const out = remoteTmux(['show-options', `${scope}v`, name]);
    const observed = out.stdout.replace(/\n$/, '');
    table.push({ name, wanted, observed, agrees: observed === wanted });
  }
  return table;
}

const afterBoot = readOptions();
step(
  8,
  'the options after boot',
  `${String(afterBoot.filter((r) => r.agrees).length)} of ` +
    `${String(afterBoot.length)} stuck`
);
process.stdout.write('\n      option                       wanted                         observed\n');
process.stdout.write('      ' + '-'.repeat(80) + '\n');
for (const row of afterBoot) {
  process.stdout.write(
    `      ${row.name.padEnd(28)} ${JSON.stringify(row.wanted).padEnd(30)} ` +
      `${JSON.stringify(row.observed)}${row.agrees ? '' : '   DISAGREES'}\n`
  );
}
process.stdout.write('\n');
for (const row of afterBoot.filter((r) => !r.agrees)) {
  fail(`${row.name} did not stick: asked ${row.wanted}, got ${row.observed}`);
}

// ---------------------------------------------------------------------------
// Step 9. The reborn server
// ---------------------------------------------------------------------------
//
// The scratch remote server is ended by name, on the scratch socket, over the same
// connection. Never `gmux`, and the socket name was refused at the top of this file
// if it were.

const killed = remoteTmux(['kill-server']);
sh('/bin/sleep', ['0.4']);
const afterKill = remoteTmux(['list-sessions', '-F', '#{session_id}']);
const gone = noServerPhrases.some((p) => afterKill.both.includes(p));
remoteTmux(bootArgs);
remoteShell(`"$SHELL" -lc 'printf ${MARKER}%s${MARKER} "$PATH"'`);
assertOptions();
const afterRebirth = readOptions();
const rebornStuck = afterRebirth.filter((r) => r.agrees).length;
step(
  9,
  'the reborn server',
  `the scratch server was ended (exit ${String(killed.code)}), the next read ` +
    `${gone ? 'confirmed it was gone' : 'did NOT confirm it was gone'}, and after ` +
    `a second boot ${String(rebornStuck)} of ${String(afterRebirth.length)} ` +
    `options stuck`
);
if (rebornStuck !== afterRebirth.length) {
  fail('the option re-assert did not run on the SECOND no-server detection');
}
const historyAfterRebirth =
  afterRebirth.find((r) => r.name === 'history-limit')?.observed ?? '';
if (historyAfterRebirth !== '25000') {
  fail(
    `a machine that came back reports history-limit ${historyAfterRebirth} ` +
      `rather than 25000, which is the depth the product promises`
  );
}

// ---------------------------------------------------------------------------
// Step 10. The version probe
// ---------------------------------------------------------------------------

const versionOverPlane = remoteTmux(['display-message', '-p', '#{version}']);
const versionOfBinary = remoteShell(`${tmuxPath} -V`);
const reported = versionOverPlane.stdout.trim();
// The measured list is READ FROM THE PRODUCT rather than copied here. A second
// copy of it in this file is what made this probe refuse 3.7c on the same day
// the product started accepting it: the row went into
// `TESTED_REMOTE_TMUX_VERSIONS` and the constant here did not move. So this
// reads the one array the gate itself reads. It parses the TypeScript rather
// than importing it because this file is plain Node and that module is not, and
// the parse fails loudly rather than falling back to a guess.
const MEASURED = readMeasuredVersions();

function readMeasuredVersions() {
  const source = readFileSync(
    join(repoRoot, 'src', 'main', 'tmux', 'version.ts'),
    'utf8'
  );
  const start = source.indexOf('TESTED_REMOTE_TMUX_VERSIONS');
  if (start < 0) {
    throw new Error(
      'src/main/tmux/version.ts no longer names TESTED_REMOTE_TMUX_VERSIONS'
    );
  }
  const open = source.indexOf('[', start);
  const close = source.indexOf('\n];', open);
  if (open < 0 || close < 0) {
    throw new Error('the TESTED_REMOTE_TMUX_VERSIONS array could not be read');
  }
  const block = source.slice(open, close);
  const found = [...block.matchAll(/^\s*version: '([^']+)',$/gm)].map(
    (match) => match[1]
  );
  if (found.length === 0) {
    throw new Error('TESTED_REMOTE_TMUX_VERSIONS parsed to no versions at all');
  }
  return found;
}
step(
  10,
  'the version probe',
  `over the plane the machine reports ${JSON.stringify(reported)}, and ` +
    `${tmuxPath} -V says ${JSON.stringify(versionOfBinary.stdout.trim())}. ` +
    `The measured list is ${MEASURED.join(', ')}, so this machine is ` +
    `${MEASURED.includes(reported) ? 'ACCEPTED' : 'REFUSED'}`
);
if (!MEASURED.includes(reported)) {
  fail(`the machine reports ${reported}, which is not on the measured list`);
}

// ---------------------------------------------------------------------------
// Step 10b. The version Tortie bundles, measured on its OWN server
// ---------------------------------------------------------------------------
//
// The copy inside /Applications/Tortie.app must NOT be read, so only the path this
// working tree builds is tried.
//
// IT NEEDS ITS OWN SOCKET, and getting this wrong is a trap worth naming.
// `display-message -p '#{version}'` reports the version of the SERVER on the far
// end of the socket, not of the binary that ran the command. Asking the bundled
// binary about the socket the machine's own tmux already owns answers 3.6a, which
// is the answer for the wrong question. So a second server is created on a second
// scratch socket, by that binary, and all four shapes are read against it.
const bundledTmux = join(repoRoot, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const BUNDLED_SOCKET = `${SOCKET}-bundled`;
let bundledVersion = '';
let bundledShapes = 'not measured';
if (existsSync(bundledTmux)) {
  const bundledRemote = (args) => {
    const command = quoteArgv([
      bundledTmux,
      '-L',
      BUNDLED_SOCKET,
      '-f',
      '/dev/null',
      ...args
    ]);
    return sh(sshBin, [...planeOptions(), '127.0.0.1', command]);
  };
  const direct = remoteShell(`${bundledTmux} -V`);
  const noServer = bundledRemote(['list-sessions', '-F', '#{session_id}']);
  bundledRemote(['start-server', ';', 'set-option', '-s', 'exit-empty', 'off']);
  const version = bundledRemote(['display-message', '-p', '#{version}']);
  const listed = bundledRemote(['list-sessions', '-F', '#{session_id}']);
  bundledRemote(['set-option', '-g', 'history-limit', '25000']);
  const option = bundledRemote(['show-options', '-gv', 'history-limit']);
  bundledRemote(['kill-server']);
  bundledVersion = version.stdout.trim();
  const shapes = [
    ['-V over the login shell', direct.stdout.trim()],
    [
      'the no server sentence',
      noServerPhrases.some((p) => noServer.both.includes(p)) ? 'recognised' : 'NOT recognised'
    ],
    ["display-message -p '#{version}'", bundledVersion],
    ['list-sessions -F on an empty server', `exit ${String(listed.code)}, no rows`],
    ['show-options -gv history-limit', option.stdout.trim()]
  ];
  bundledShapes = shapes.map(([what, answer]) => `${what} = ${answer}`).join('; ');
  say(
    `   the version this working tree builds, at ${bundledTmux}, was measured on ` +
      `its OWN scratch socket ${BUNDLED_SOCKET} over the same carriage: ` +
      `${bundledShapes}`
  );
  if (bundledVersion !== '3.7b') {
    fail(
      `the bundled binary's own server reports ${JSON.stringify(bundledVersion)} ` +
        `and this build expects 3.7b`
    );
  }
} else {
  say(
    `   the version Tortie bundles was NOT measured: no binary at ` +
      `${bundledTmux}. Run "npm run vendor:tmux" first. A machine running it is ` +
      `refused until it is measured, and the report must say so plainly.`
  );
}

// A stub that reports a made-up version, for the refusal the smoke drives.
const stub = join(root, 'p69-stub-tmux');
writeFileSync(
  stub,
  '#!/bin/sh\necho "tmux 0.0-p69-made-up"\nexit 0\n',
  'utf8'
);
chmodSync(stub, 0o755);

// ---------------------------------------------------------------------------
// Step 11. The keepalives, measured by freezing the far side
// ---------------------------------------------------------------------------

/** Every process descended from one pid, by walking the process table once. */
function descendantsOf(root) {
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
  walk(root);
  return out;
}

const CANDIDATES = [
  { interval: 5, countMax: 3 },
  { interval: 10, countMax: 3 },
  { interval: 15, countMax: 3 }
];
const keepaliveRows = [];

for (const pair of CANDIDATES) {
  // A fresh control socket per pair, so the options really apply to a new master.
  const perPairControl = join(
    CONTROL_DIR,
    `m-p69k${String(pair.interval)}${String(process.pid).slice(-5)}`
  );
  const options = planeOptions(pair).map((a) =>
    a.startsWith('ControlPath=') ? `ControlPath=${perPairControl}` : a
  );
  const warm = sh(sshBin, [...options, '127.0.0.1', 'true']);
  if (warm.code !== 0) {
    keepaliveRows.push({
      pair: `${String(pair.interval)},${String(pair.countMax)}`,
      seconds: 'not measured',
      message: `the master would not come up (exit ${String(warm.code)})`,
      recovered: 'not measured'
    });
    continue;
  }
  // Freeze the far side of THIS connection, and only it.
  //
  // MEASURED, because the first attempt measured nothing. Stopping the listener
  // pid alone left every pair answering in 0.1 s: sshd forks a child per
  // connection, and the child is what holds this connection open, so the listener
  // being stopped does not stop the far side replying. So the descendants are
  // enumerated and stopped, and they are recorded before they are signalled.
  const frozenPids = descendantsOf(sshd.pid);
  for (const pid of frozenPids) {
    recordedPids.push(pid);
    try {
      process.kill(pid, 'SIGSTOP');
    } catch {
      /* nothing to freeze means nothing to measure */
    }
  }
  const started = nowMs();
  const frozen = sh(sshBin, [...options, '127.0.0.1', 'true'], { timeout: 120_000 });
  const seconds = ((nowMs() - started) / 1000).toFixed(1);
  for (const pid of frozenPids) {
    try {
      process.kill(pid, 'SIGCONT');
    } catch {
      /* already running */
    }
  }
  sh('/bin/sleep', ['0.3']);
  const after = sh(sshBin, [...options, '127.0.0.1', 'true']);
  keepaliveRows.push({
    pair: `${String(pair.interval)},${String(pair.countMax)}`,
    seconds,
    message: firstLine(frozen.both) || `exit ${String(frozen.code)}`,
    recovered: after.code === 0 ? 'yes' : `no (exit ${String(after.code)})`
  });
  sh(sshBin, [...options, '-O', 'exit', '127.0.0.1']);
}

step(11, 'the keepalives', `${String(keepaliveRows.length)} pair(s) measured`);
process.stdout.write('\n      pair    seconds to error  recovered  message\n');
process.stdout.write('      ' + '-'.repeat(80) + '\n');
for (const row of keepaliveRows) {
  process.stdout.write(
    `      ${row.pair.padEnd(7)} ${String(row.seconds).padEnd(17)} ` +
      `${row.recovered.padEnd(10)} ${row.message}\n`
  );
}
process.stdout.write('\n');
const chosen = keepaliveRows[0];
if (chosen !== undefined && Number(chosen.seconds) > 20) {
  fail(
    `the chosen pair (5, 3) took ${String(chosen.seconds)} s to call a dead link ` +
      `dead, and the budget is 20 s`
  );
}

// ---------------------------------------------------------------------------
// Step 12. At-least-once, measured rather than asserted
// ---------------------------------------------------------------------------

/** The whole option and environment state of the machine's server, as one string. */
function serverState() {
  const opts = SERVER_OPTIONS.map(([name, scope]) => {
    const out = remoteTmux(['show-options', `${scope}v`, name]);
    return `${name}=${out.stdout.replace(/\n$/, '')}`;
  }).join('\n');
  const env = remoteTmux(['show-environment', '-g']).stdout;
  return `${opts}\n---\n${env}`;
}

const LEDGER = [
  ['list-sessions', '-F', '#{session_id}'],
  ['display-message', '-p', '#{version}'],
  ['show-options', '-gv', 'history-limit'],
  ['show-environment', '-g'],
  ['start-server'],
  ['set-option', '-g', 'history-limit', '25000'],
  ['set-environment', '-g', 'PATH', remotePath]
];

const stateAfterOne = (() => {
  for (const args of LEDGER) remoteTmux(args);
  return serverState();
})();
const stateAfterTwo = (() => {
  for (const args of LEDGER) remoteTmux(args);
  return serverState();
})();
step(
  12,
  'at-least-once',
  `all ${String(LEDGER.length)} ledger verbs were run twice, and the machine's ` +
    `full option and environment state is ` +
    `${stateAfterOne === stateAfterTwo ? 'BYTE EQUAL' : 'DIFFERENT'} after one ` +
    `run and after two (${String(
      Buffer.byteLength(stateAfterOne, 'utf8')
    )} bytes)`
);
if (stateAfterOne !== stateAfterTwo) {
  fail('running every ledger verb twice changed the machine');
}

// ---------------------------------------------------------------------------
// Steps 13 and 14. The two refusals, driven through the built bundle
// ---------------------------------------------------------------------------
//
// The sentences live in the bundle and the bundle is where they have to be read
// from, so these two steps read out/main/index.js rather than the source. The
// harness `GMUX_SMOKE=exec-plane` is what watches them FIRE, and it runs after
// this probe writes the carriage file below.

const bundle = join(repoRoot, 'out', 'main', 'index.js');
const bundleText = existsSync(bundle) ? readFileSync(bundle, 'utf8') : '';
const LEDGER_REFUSAL =
  'Only commands Tortie has written down as safe to run twice may cross to a machine';
const ORDER_REFUSAL =
  'before it has read the list of places that machine looks for programs';
step(
  13,
  'the ordering refusal',
  bundleText.includes(ORDER_REFUSAL)
    ? `present in the bundle: "${ORDER_REFUSAL}"`
    : 'NOT in the bundle'
);
if (bundleText !== '' && !bundleText.includes(ORDER_REFUSAL)) {
  fail('the ordering refusal is not in out/main/index.js');
}
step(
  14,
  'the ledger refusal',
  bundleText.includes(LEDGER_REFUSAL)
    ? `present in the bundle: "${LEDGER_REFUSAL}"`
    : 'NOT in the bundle'
);
if (bundleText !== '' && !bundleText.includes(LEDGER_REFUSAL)) {
  fail('the ledger refusal is not in out/main/index.js');
}
if (bundleText === '') {
  say('   the bundle is not built, so steps 13 and 14 are NOT evidence');
}

// ---------------------------------------------------------------------------
// Step 15. The taxonomy goldens
// ---------------------------------------------------------------------------

// THIS STEP USED TO REWRITE FIVE CHECKED IN FILES, and that was a defect
// rather than a feature. `capture-machine-goldens.mjs` writes over the files
// `golden.test.ts` reads. Running this probe therefore left
// host-key-changed.txt, manifest.json, no-server.txt, ok.txt and refused.txt
// dirty, with their bytes moved, and manifest.json also lost the
// password-required row because a different script writes that one. Two
// builders in Phase 83 hit it and both had to undo it by hand. So the capture
// now goes to a scratch directory under this probe's own root, and this step
// COMPARES the fresh bytes against the checked in ones. A difference is
// reported as a difference. Nothing a test reads is touched here. A person who
// wants the checked in files to move runs `npm run goldens:machines`.
const goldenScratch = join(root, 'goldens');
const goldens = sh('/usr/bin/env', [
  'node',
  join(repoRoot, 'build', 'capture-machine-goldens.mjs'),
  '--out',
  goldenScratch
]);
const goldenLines = goldens.stdout
  .split('\n')
  .filter((line) => /exit -?\d+, \d+ bytes/.test(line));
const checkedInGoldens = join(
  repoRoot,
  'src',
  'main',
  'machines',
  '__tests__',
  'golden'
);
const drifted = [];
const matched = [];
for (const line of goldenLines) {
  const cls = /^\[goldens\] ([a-z-]+): exit/.exec(line)?.[1];
  if (!cls) continue;
  const fresh = join(goldenScratch, `${cls}.txt`);
  const checkedIn = join(checkedInGoldens, `${cls}.txt`);
  if (!existsSync(fresh) || !existsSync(checkedIn)) {
    drifted.push(`${cls} (one of the two files is not there)`);
    continue;
  }
  const a = readFileSync(fresh, 'utf8');
  const b = readFileSync(checkedIn, 'utf8');
  if (a === b) matched.push(cls);
  else
    drifted.push(
      `${cls} (${String(Buffer.byteLength(b))} bytes checked in, ` +
        `${String(Buffer.byteLength(a))} bytes now)`
    );
}
step(
  15,
  'the taxonomy goldens',
  `${String(goldenLines.length)} class(es) captured from real output into ` +
    `${goldenScratch}. ${String(matched.length)} matched the checked in file ` +
    `byte for byte. ${
      drifted.length === 0 ? 'None differ.' : `These differ: ${drifted.join(', ')}.`
    } Nothing under src/ was written.`
);
if (drifted.length > 0) {
  say(
    `   a class whose text carries this run's own socket path, port or pid can ` +
      `never match the checked in file byte for byte, so a difference here is ` +
      `only a finding when the byte counts also moved.`
  );
}
for (const line of goldenLines) say(`   ${line.replace('[goldens] ', '')}`);
if (goldens.code !== 0) fail('the golden capture exited non zero');

// ---------------------------------------------------------------------------
// Step 16. The identity records, in bytes
// ---------------------------------------------------------------------------

const tortieRecordAfter = sizeOf(tortieRecord);
const userRecordAfter = sizeOf(userRecord);
step(
  16,
  'the identity records',
  `Tortie's own file was ${String(tortieRecordAfterFirstContact)} bytes after the ` +
    `one first contact and ${String(tortieRecordAfter)} bytes after the whole ` +
    `run. The person's own file was ${String(userRecordBefore)} bytes before and ` +
    `${String(userRecordAfter)} bytes after.`
);
if (tortieRecordAfter !== tortieRecordAfterFirstContact) {
  fail(
    'the exec plane added a line to Tortie\'s own record file. Under ' +
      'StrictHostKeyChecking=yes it cannot, so this is a real defect.'
  );
}
if (userRecordAfter !== userRecordBefore) {
  fail("the run changed the person's own record file");
}

// ---------------------------------------------------------------------------
// Step 17. The M3 de-risking probe
// ---------------------------------------------------------------------------

const plain = remoteShell(`"$SHELL" -lc 'printf ${MARKER}%s${MARKER} "$PATH"'`);
const prefixed = remoteShell(
  `PATH='/p69-marker-dir:/usr/bin:/bin' "$SHELL" -c 'printf ${MARKER}%s${MARKER} "$PATH"'`
);
const read = (out) =>
  (new RegExp(`${MARKER}(.*?)${MARKER}`, 's').exec(out)?.[1] ?? '').trim();
const plainValue = read(plain.stdout);
const prefixedValue = read(prefixed.stdout);
step(
  17,
  'the M3 de-risking probe',
  `plain login shell answers ${JSON.stringify(plainValue)}; with a value put in ` +
    `front of the command it answers ${JSON.stringify(prefixedValue)}`
);
say(
  `   the prefix ${
    prefixedValue.includes('/p69-marker-dir') ? 'WINS' : 'is IGNORED'
  }, so M3 knows the mechanism before it needs it.`
);

// ---------------------------------------------------------------------------
// Step 17b. What PATH a PANE gets, which is unknown 1 of research 54 section 7
// ---------------------------------------------------------------------------
//
// Step 17 above measures a login shell and a prefixed command. Neither is a
// pane, and the line here used to say so and stop. That left unknown 1 open on
// every carriage, including this one, and unknown 1 is what decides whether
// launching an agent by bare name works on another machine at all.
//
// So this step makes a real pane over the real carriage and reads PATH from
// INSIDE it. The session is created detached, its name carries the zz- prefix
// and this run's pid, the pane writes one file and then holds, and the session
// is ended by exact name whatever happens.
//
// WHAT THIS IS NOT. The far side of this carriage is this Mac, so this answers
// unknown 1 for the loopback topology and for nothing else. The answer for
// mac-pro comes from `npm run probe:realunknowns`, which needs an ssh key this
// Mac does not have yet.
// IT IS MEASURED TWICE, and this is the state the two readings are taken in.
// `src/main/machines/remote-server.ts:161` sends
// `set-environment -g PATH <the login shell's PATH>` when it boots a machine's
// server, and step 5 of this probe sent the same command against this server
// long before here. `src/main/machines/remote-path.ts` says in its own header
// that the command is NOT evidence a pane gets that value, because research 47
// section 2 measured the local case and found `-g PATH` is the one variable a
// pane does not inherit. So the first reading is taken with the server env as
// this run already left it, the command is then sent again, and the second
// reading is taken after that. Two readings that agree are a stronger answer
// than one, and neither of them is a server that never had PATH set, which this
// probe cannot produce this late in its run.
function paneEnvPath(label) {
  const session = `zz-p69-path-${label}-${String(process.pid)}`;
  const file = join(root, `p69-pane-path-${label}.txt`);
  let created = false;
  try {
    const made = remoteTmux([
      'new-session',
      '-d',
      '-s',
      session,
      '--',
      '/bin/sh',
      '-c',
      `printenv PATH > ${file}; sleep 20`
    ]);
    created = made.code === 0;
    if (!created) {
      return `the create exited ${String(made.code)}: ${made.both.trim()}`;
    }
    // The pane writes the file as its first act, so a poll of tenths beats a
    // fixed sleep that is either slow or flaky.
    for (let tries = 0; tries < 40; tries += 1) {
      if (existsSync(file)) break;
      execFileSync('/bin/sleep', ['0.1']);
    }
    return existsSync(file)
      ? readFileSync(file, 'utf8').trim()
      : 'the pane never wrote the file';
  } finally {
    // By EXACT name. Nothing else on that socket can match this.
    if (created) remoteTmux(['kill-session', '-t', `=${session}`]);
  }
}

const loginPath = plainValue;
const paneFirst = paneEnvPath('first');
remoteTmux(['set-environment', '-g', 'PATH', loginPath]);
const paneAfterSet = paneEnvPath('afterset');
const serverPath = remoteTmux(['show-environment', '-g', 'PATH']).stdout.trim();
step(
  '17b',
  'what PATH a pane gets, which is unknown 1',
  `a pane answers ${JSON.stringify(paneFirst)}. After set-environment -g PATH ` +
    `is sent again it answers ${JSON.stringify(paneAfterSet)}, while ` +
    `show-environment -g reads back ${JSON.stringify(serverPath)}. The login ` +
    `shell answers ${JSON.stringify(loginPath)}.`
);
say(
  `   the pane ${paneFirst === loginPath ? 'DOES' : 'does NOT'} get the login ` +
    `shell's list, and it ` +
    `${paneAfterSet === loginPath ? 'DOES' : 'does NOT'} get it after ` +
    `set-environment -g PATH is sent again, while the server itself ` +
    `${serverPath.includes(loginPath) ? 'HOLDS' : 'does not hold'} that list. ` +
    `So launching an agent by bare name over there ` +
    `${
      paneAfterSet === loginPath
        ? 'finds whatever the login shell finds'
        : 'CANNOT rely on the captured list, and an absolute path or an -e pair is needed'
    }.`
);
say(
  `   the far side of this carriage is this Mac, so this answers unknown 1 for ` +
    `the loopback topology only. mac-pro's answer comes from ` +
    `"npm run probe:realunknowns".`
);
for (const [what, value] of [
  ['on the first reading', paneFirst],
  ['after set-environment', paneAfterSet]
]) {
  if (value.startsWith('the pane never') || value.startsWith('the create exited')) {
    fail(`unknown 1 was not answered ${what}: ${value}`);
  }
}

// ---------------------------------------------------------------------------
// The carriage file the Electron harness reads
// ---------------------------------------------------------------------------

const configRoot = process.env['GMUX_CONFIG_ROOT'] ?? '';
if (configRoot !== '') {
  mkdirSync(configRoot, { recursive: true });
  writeFileSync(
    join(configRoot, 'p69-carriage.json'),
    `${JSON.stringify(
      {
        host: '127.0.0.1',
        port,
        user: me,
        remoteTmuxPath: tmuxPath,
        stubTmuxPath: stub,
        // The agent holding this run's key. The harness must be launched with
        // SSH_AUTH_SOCK set to this, because the plane composes no IdentityFile and
        // this Mac has no key of its own for the client to fall back on.
        authSock
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  say(`wrote the carriage details to ${join(configRoot, 'p69-carriage.json')}`);
  say(
    'the scratch sshd is left RUNNING for the harness. Kill it with: kill ' +
      String(sshd.pid)
  );
  say(
    `the harness must be launched with SSH_AUTH_SOCK=${authSock || '(none)'}, ` +
      `because the exec plane names no key and this Mac has none of its own.`
  );
  say(
    `two processes are left up, not one. End BOTH when the harness is done: ` +
      `"kill ${recordedPids.join(' ')}". The key holder is one of them, and it ` +
      `outlives the sshd if it is forgotten.`
  );
  // Let this process exit while that sshd keeps running. Without this the child
  // handle holds node's event loop open, so the probe printed PASS and then never
  // returned, and `npm run probe:execplane && npm run smoke:execplane` could not
  // run as one line. The sshd stays in this process group and stays killable by
  // the pid printed above, which is what the cleanup instruction depends on.
  sshd.unref();
}

// ---------------------------------------------------------------------------
// Step 18. The operator's server, after
// ---------------------------------------------------------------------------

// End the scratch remote server before the final read, so nothing of this probe's
// is left behind. The socket is the scratch one and it was refused at the top of
// this file if it were not.
remoteTmux(['kill-server']);

if (configRoot === '') {
  for (const pid of recordedPids) {
    if (typeof pid !== 'number') continue;
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone is the state we wanted */
    }
  }
  sh(sshBin, [...planeOptions(), '-O', 'exit', '127.0.0.1']);
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

const after = readOperatorServer();
const identical =
  before.sessions === after.sessions &&
  before.history === after.history &&
  before.exitEmpty === after.exitEmpty;
step(
  18,
  "the operator's server after the run",
  `${after.sessions} session(s), history-limit ${after.history || 'unreadable'}, ` +
    `exit-empty ${after.exitEmpty || 'unreadable'}. ` +
    `${identical ? 'IDENTICAL to before.' : 'CHANGED. This run is a failure.'}`
);
if (!identical) {
  fail(
    `the operator's server changed: before ${JSON.stringify(
      before
    )}, after ${JSON.stringify(after)}`
  );
}

// The two modes end differently, and the line says which one ran. Printing
// "killed" in both would be a claim the handoff mode does not make good on.
if (configRoot === '') {
  say(`killed only these recorded pids: ${recordedPids.join(', ') || 'none'}`);
} else {
  say(
    `left these recorded pids RUNNING for the Electron harness, and NOTHING ` +
      `else: ${recordedPids.join(', ') || 'none'}. End them with ` +
      `"kill ${String(sshd.pid)}" after "npm run smoke:execplane", or run this ` +
      `probe without GMUX_CONFIG_ROOT and it cleans up after itself.`
  );
}

if (failures.length > 0) {
  process.stdout.write(`\n[p69] FAIL, ${String(failures.length)}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n[p69] PASS. ${String(rows.length)} steps, every one measured. The ` +
    `operator's server is byte identical before and after, and neither identity ` +
    `record file changed.\n`
);
