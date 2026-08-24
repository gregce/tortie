/**
 * `npm run probe:keyinstall`. The Tier 3 live probe of Phase 79.1, being the
 * key Tortie makes for one machine and the line it adds on that machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So four rules, all of them in
 * this file:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's four machines and every tailnet host are never
 *     contacted, and the assertion is on the probe's own target rather than on
 *     a promise.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started, because the far side of every connection here is the
 *     machine holding the operator's live sessions.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The person's own `~/.ssh` is READ, never written. Every file in it is
 *     measured by byte count and sha256 before the run and again after it, and
 *     a difference is a failure whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR LEGS, AND THE ONE THING NO LEG PROVES
 * ---------------------------------------------------------------------------
 *  1. The real `/usr/bin/ssh` against a real scratch `sshd` that advertises
 *     password sign in and accepts none. It proves the real prompt text, the one
 *     prompt rule, the wrong password arm, the class Tortie decides, that
 *     nothing was appended and that no password byte reached the transcript.
 *  2. A stub client named by `GMUX_SSH_BIN`, which runs the last argument of
 *     Tortie's own command through the real `/bin/sh` against a scratch home
 *     directory. It proves the remote script itself: a missing file, a file that
 *     already had entries, exactly one line added, a second run adding none, and
 *     the modes on what Tortie created.
 *  3. The real `/usr/bin/ssh` with `-i` naming the key Tortie made, against a
 *     real scratch `sshd` whose `AuthorizedKeysFile` is the file leg 2 wrote. It
 *     proves the key and the line actually authenticate.
 *
 *  4. ADDED IN THE FIX ROUND. The real `/usr/bin/ssh`, driven through the one
 *     visible connection test, against a real scratch `sshd` set up the way a
 *     stock Mac with Remote Login on is: a key is allowed, a password is
 *     allowed, and the file that would hold a key for Tortie is empty. It
 *     proves the class that machine produces, that the test stops at the
 *     question instead of waiting out its 60 s deadline, and that the key block
 *     is offered there. With `--capture-golden` it writes the client's own
 *     bytes to `src/main/machines/__tests__/golden/password-required.txt`.
 *     Without that flag it changes no file in the tree.
 *
 * NO LEG WATCHES A REAL sshd ACCEPT A PASSWORD. A server that can verify a
 * password has to run as root, and this phase never asks for root. Legs 1 and 3
 * cover the real client and the real server on both sides of that one gap, and
 * leg 2 covers the bytes written in between.
 *
 * ---------------------------------------------------------------------------
 * HOW IT REACHES TORTIE'S OWN CODE
 * ---------------------------------------------------------------------------
 * The modules are TypeScript with path aliases, so this probe writes one small
 * driver into its own run directory and runs it with `npx tsx`. The driver
 * imports `key-material.ts`, `key-install.ts` and `connection-test.ts` by
 * absolute path and hands back JSON. Every argv, every remote command and every
 * classification below is therefore Tortie's own and not a copy of it.
 *
 * Every scratch file carries a `p791-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { refuseRealSockets, scratchYard } from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rules 1 and 2. Refuse before anything is started
// ---------------------------------------------------------------------------

/** The only address this probe may ever contact. */
const TARGET = '127.0.0.1';

if (TARGET !== '127.0.0.1') {
  process.stderr.write(
    '[p791] REFUSING TO RUN. This probe contacts the loopback address and ' +
      'nothing else.\n'
  );
  process.exit(2);
}

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p791-${String(process.pid)}`,
  'p791'
);

const root = join('/tmp', `p791-keyinstall-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p791] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p791] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p791] ${String(n)}. ${what}: ${evidence}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 90_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

// ---------------------------------------------------------------------------
// Rule 4. The person's own key folder, measured before
// ---------------------------------------------------------------------------

/**
 * Every file in the folder the person keeps their own keys in, by byte count
 * and sha256.
 *
 * The charter records 1229 bytes and sha256 `cf4c5ef3...` for `known_hosts` on
 * the day it was written. This probe PRINTS what it observes rather than
 * asserting those values, because that file is the operator's and may have
 * moved for reasons that have nothing to do with this phase. The assertion is
 * that before equals after.
 */
function measureOwnKeyFolder() {
  const dir = join(homedir(), '.ssh');
  const out = {};
  let names = [];
  try {
    names = readdirSync(dir).sort();
  } catch {
    return out;
  }
  for (const name of names) {
    const path = join(dir, name);
    try {
      const stat = statSync(path);
      if (!stat.isFile()) continue;
      const bytes = readFileSync(path);
      out[name] = { bytes: bytes.length, sha256: sha256(bytes) };
    } catch {
      out[name] = { bytes: -1, sha256: 'unreadable' };
    }
  }
  return out;
}

const ownKeysBefore = measureOwnKeyFolder();

// ---------------------------------------------------------------------------
// The operator's server, read only, before
// ---------------------------------------------------------------------------

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

const sessionsBefore = operatorSessions();

// ---------------------------------------------------------------------------
// The run directory, and the driver that reaches Tortie's own modules
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });

const driverPath = join(root, 'p791-driver.mts');

writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const material = await import(REPO + '/src/main/machines/key-material');
const install = await import(REPO + '/src/main/machines/key-install');
const test = await import(REPO + '/src/main/machines/connection-test');

let out: unknown = {};

if (input.op === 'key') {
  out = material.ensureMachineKey({ id: input.id, userDataOverride: input.userData });
} else if (input.op === 'compose') {
  out = {
    argv: install.composeKeyInstallArgv(input.fields, input.hostKeys, input.publicKeyLine),
    commandLine: install.composeKeyInstallCommandLine(
      '/usr/bin/ssh',
      input.fields,
      input.hostKeys,
      input.publicKeyLine
    ),
    command: install.composeAuthorizedKeysCommand(input.publicKeyLine),
    script: install.AUTHORIZED_KEYS_SCRIPT,
    marker: install.REMOTE_KEY_MARKER,
    remoteFile: install.REMOTE_AUTHORIZED_KEYS_DISPLAY,
    refusedPassword: install.MACHINE_KEY_PASSWORD_REFUSED,
    redactedWord: install.MACHINE_KEY_PASSWORD_REDACTED
  };
} else if (input.op === 'test') {
  // The ONE visible connection test, driven exactly as the app drives it.
  let started: any = null;
  let transcript = '';
  const outcome = await new Promise<any>((resolve) => {
    started = test.startMachineTest({
      fields: input.fields,
      packaged: false,
      env: { ...process.env, ...(input.env ?? {}) },
      hostKeys: input.hostKeys,
      sheetId: input.id ?? null,
      keyPath: input.keyPath ?? null,
      emit: (event: any) => {
        if (event.kind === 'output') transcript += event.text;
        if (event.kind === 'end') resolve(event.outcome);
      }
    });
  });
  out = {
    commandLine: started?.commandLine ?? '',
    cls: outcome.class,
    headline: outcome.headline,
    detail: outcome.detail,
    alarm: outcome.alarm,
    exitCode: outcome.exitCode,
    durationMs: outcome.durationMs,
    keySheet: outcome.keySheet ?? null,
    transcript,
    // The program's own bytes, with the one line Tortie added taken back out.
    // The golden folder holds programs' bytes and nothing else.
    programText: transcript.split(test.TEST_PASSWORD_STOP_NOTE).join(''),
    classifiedFromText: test.classifyProbeOutput(transcript, -1)
  };
} else if (input.op === 'install') {
  const run = await test.startKeyInstall({
    machineId: input.id,
    fields: input.fields,
    publicKeyLine: input.publicKeyLine,
    password: input.password,
    packaged: false,
    env: { ...process.env, ...(input.env ?? {}) },
    hostKeys: input.hostKeys
  });
  out = {
    cls: run.cls,
    wrote: run.wrote,
    transcript: run.transcript,
    exitCode: run.exitCode,
    durationMs: run.durationMs,
    parsed: install.parseKeyInstallAnswer(run.transcript),
    classified: install.classifyKeyInstallOutput(run.transcript, run.exitCode ?? -1)
  };
}

writeFileSync(outPath, JSON.stringify(out), 'utf8');
process.exit(0);
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

/** One call into Tortie's own modules. Returns the parsed answer, or null. */
function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p791-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p791-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    { cwd: repoRoot, timeout: 180_000 }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer for op "${String(input.op)}". It printed:\n` +
        `${out.both.trim().split('\n').slice(-12).join('\n')}`
    );
    return null;
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// The scratch machines
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p791',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

const PORT_REFUSING = 45791;
const PORT_ACCEPTING = 45792;
/** Leg 4's server. It is the stock Mac: a key is allowed and a password is too. */
const PORT_STOCK = 45793;

/**
 * Start one sshd from a configuration this probe wrote, and record its pid.
 *
 * `spawn` with `stdio: 'ignore'` rather than `spawnSync`, and the reason is
 * measured. `sshd -D` never exits, so a synchronous start waits on a program
 * that is still running and the probe hangs before it prints a single line.
 */
function startSshd(name, lines, port) {
  const conf = join(root, `p791-sshd-${name}.conf`);
  writeFileSync(conf, `${lines.join('\n')}\n`, 'utf8');
  const child = spawn('/usr/sbin/sshd', ['-D', '-f', conf], { stdio: 'ignore' });
  const pid = child.pid;
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  child.unref();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (sh('/usr/bin/nc', ['-z', TARGET, String(port)]).code === 0) return pid;
    sh('/bin/sleep', ['0.1']);
  }
  fail(`the scratch server "${name}" did not answer on ${TARGET}:${String(port)}.`);
  return pid;
}

/** Every descendant of a listener, deepest first, so a stop ends the children too. */
function descendants(pid) {
  const table = sh('/bin/ps', ['-o', 'pid=,ppid=', '-ax']).stdout;
  const children = new Map();
  for (const line of table.split('\n')) {
    const [child, parent] = line.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(child) || !Number.isFinite(parent)) continue;
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const out = [];
  const walk = (one) => {
    for (const child of children.get(one) ?? []) {
      walk(child);
      out.push(child);
    }
  };
  walk(pid);
  return out;
}

const killed = [];

function stopEverything() {
  for (const pid of [...recordedPids].reverse()) {
    for (const one of [...descendants(pid), pid]) {
      try {
        process.kill(one, 'SIGKILL');
        killed.push(one);
      } catch {
        /* already gone, which is the state we wanted */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 1. Tortie makes the key
// ---------------------------------------------------------------------------

const MACHINE_ID = 'p791-scratch';
const userData = join(root, 'p791-userdata');
mkdirSync(userData, { recursive: true, mode: 0o700 });

const key = drive({ op: 'key', id: MACHINE_ID, userData });

if (key === null || typeof key.publicKeyLine !== 'string') {
  fail('Tortie did not make a key at all, so nothing below could be measured.');
  stopEverything();
  process.exit(1);
}

const keyDirMode = statSync(dirname(key.path)).mode & 0o777;
const keyMode = statSync(key.path).mode & 0o777;
const publicMode = statSync(key.publicPath).mode & 0o777;

step(
  1,
  'the key Tortie made',
  `${key.path} (made: ${String(key.made)}), ${key.fingerprint}`
);
step(
  2,
  'file modes',
  `folder ${keyDirMode.toString(8)}, private ${keyMode.toString(8)}, public ${publicMode.toString(8)}`
);
if (keyDirMode !== 0o700) fail(`the key folder is mode ${keyDirMode.toString(8)} and must be 700.`);
if (keyMode !== 0o600) fail(`the private half is mode ${keyMode.toString(8)} and must be 600.`);
if (publicMode !== 0o600) fail(`the public half is mode ${publicMode.toString(8)} and must be 600.`);

const again = drive({ op: 'key', id: MACHINE_ID, userData });
if (again === null || again.made !== false || again.publicKeyLine !== key.publicKeyLine) {
  fail(
    'asking for the key a second time did not give back the key already made. A ' +
      'second key would leave the first public half stranded on the machine.'
  );
}
step(3, 'asking again', `made: ${String(again?.made)}, same line: ${String(again?.publicKeyLine === key.publicKeyLine)}`);

// ---------------------------------------------------------------------------
// Step 2. The command Tortie composed, printed in full
// ---------------------------------------------------------------------------

const tortieHostKeys = join(root, 'p791-known-machines');
const personHostKeys = join(root, 'p791-person-known-hosts');
writeFileSync(personHostKeys, '', 'utf8');

const hostKeys = { tortie: tortieHostKeys, user: personHostKeys };

const fieldsRefusing = {
  host: TARGET,
  user: yard.user,
  port: PORT_REFUSING,
  remoteTmuxPath: null
};

const composed = drive({
  op: 'compose',
  fields: fieldsRefusing,
  hostKeys,
  publicKeyLine: key.publicKeyLine
});

if (composed === null) {
  fail('Tortie composed no install command, so no leg could run.');
  stopEverything();
  process.exit(1);
}

step(4, 'the install command', composed.commandLine);

for (const required of [
  'BatchMode=no',
  'StrictHostKeyChecking=yes',
  'NumberOfPasswordPrompts=1',
  'PubkeyAuthentication=no',
  'IdentitiesOnly=yes'
]) {
  if (composed.argv.includes(required)) continue;
  fail(`the install argv this probe drove does not carry ${required}.`);
}
if (!composed.argv.includes(TARGET)) {
  fail(`the install argv does not target ${TARGET}. This probe contacts nothing else.`);
}
for (const element of composed.argv) {
  if (!/tail[0-9a-z]*\.ts\.net|\.local$/.test(String(element))) continue;
  fail(`the install argv names ${String(element)}, which is not the loopback address.`);
}

// ---------------------------------------------------------------------------
// Leg 1. The real client, the real server, and a wrong password
// ---------------------------------------------------------------------------

startSshd(
  'refusing',
  [
    `Port ${String(PORT_REFUSING)}`,
    `ListenAddress ${TARGET}`,
    `HostKey ${yard.hostKey}`,
    'PasswordAuthentication yes',
    'KbdInteractiveAuthentication yes',
    'PubkeyAuthentication no',
    'UsePAM no',
    'StrictModes no',
    'LogLevel QUIET'
  ],
  PORT_REFUSING
);

// Tortie's install never makes first contact, so its own record file is seeded
// here with the scratch machine's identity. In the product that line is written
// by the ONE visible connection test, where a person read the question and
// answered it.
const hostKeyLine = readFileSync(`${yard.hostKey}.pub`, 'utf8').trim().split(' ').slice(0, 2).join(' ');
writeFileSync(tortieHostKeys, `[${TARGET}]:${String(PORT_REFUSING)} ${hostKeyLine}\n`, 'utf8');

const WRONG_PASSWORD = 'p791-not-the-password-9f3a2b';

const leg1 = drive({
  op: 'install',
  id: MACHINE_ID,
  fields: fieldsRefusing,
  hostKeys,
  publicKeyLine: key.publicKeyLine,
  password: WRONG_PASSWORD
});

const authorizedBefore = readFileSync(yard.authorized);

if (leg1 === null) {
  fail('leg 1 did not run, so the wrong password arm is unproven.');
} else {
  const prompts = (leg1.transcript.match(/[Pp]assword:/g) ?? []).length;
  step(5, 'leg 1, the class Tortie decided', `${String(leg1.cls)} in ${String(leg1.durationMs)} ms`);
  step(6, 'leg 1, password prompts printed', String(prompts));
  step(
    7,
    'leg 1, the last line the machine printed',
    JSON.stringify(leg1.transcript.trim().split('\n').slice(-1)[0] ?? '')
  );

  if (leg1.cls !== 'auth-refused') {
    fail(
      `a wrong password produced the class ${String(leg1.cls)} and it must produce ` +
        `auth-refused. The person has to be told the machine did not accept it.`
    );
  }
  if (prompts !== 1) {
    fail(
      `the client printed ${String(prompts)} password prompt(s). Exactly one is ` +
        `allowed, because a second one is the silent retry this phase refuses.`
    );
  }
  if (leg1.transcript.includes(WRONG_PASSWORD)) {
    fail('the password appeared in the transcript. Nothing a person types may be shown back.');
  }
  if (JSON.stringify(leg1).includes(WRONG_PASSWORD)) {
    fail('the password appeared somewhere in the install result.');
  }
  if (leg1.wrote !== null) {
    fail(`a refused sign in reported writing "${String(leg1.wrote)}". Nothing was written.`);
  }
}

const authorizedAfter = readFileSync(yard.authorized);
step(
  8,
  'leg 1, the scratch authorized file',
  `${String(authorizedBefore.length)} bytes before, ${String(authorizedAfter.length)} after`
);
if (sha256(authorizedBefore) !== sha256(authorizedAfter)) {
  fail('a refused sign in changed the file on the other machine. Nothing may be written.');
}

// ---------------------------------------------------------------------------
// Leg 2. The remote script, run by the real /bin/sh against a scratch home
// ---------------------------------------------------------------------------

/**
 * A stub client that ignores every option and runs Tortie's last argument.
 *
 * ssh hands ONE string to the other machine's login shell, and the last element
 * of Tortie's argv is that string. So running it through the real `/bin/sh` is
 * what the other machine does, minus the network. The stub prints a prompt and
 * reads one line first, so the password path is exercised as well.
 */
function writeStubClient(name, home) {
  const path = join(root, `p791-stub-${name}`);
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      'for last in "$@"; do :; done',
      `printf "%s@127.0.0.1's password: " "$(id -un)"`,
      'read -r ignored',
      'echo',
      `HOME=${home} /bin/sh -c "$last"`,
      'exit $?',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(path, 0o755);
  return path;
}

/** Bytes and line count of a file that may not exist. */
function measureRemoteFile(path) {
  if (!existsSync(path)) return { bytes: 0, lines: 0, present: false };
  const text = readFileSync(path, 'utf8');
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split('\n').filter((line) => line.length > 0).length,
    present: true
  };
}

const legTwoRows = [];

function runLegTwo(name, home, seed) {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const sshDir = join(home, '.ssh');
  const authorized = join(sshDir, 'authorized_keys');
  if (seed !== null) {
    mkdirSync(sshDir, { recursive: true, mode: 0o700 });
    writeFileSync(authorized, seed, 'utf8');
    chmodSync(authorized, 0o644);
  }
  const before = measureRemoteFile(authorized);
  const stub = writeStubClient(name, home);
  const run = drive({
    op: 'install',
    id: MACHINE_ID,
    fields: fieldsRefusing,
    hostKeys,
    publicKeyLine: key.publicKeyLine,
    password: 'p791-stub-password',
    env: { GMUX_SSH_BIN: stub }
  });
  const after = measureRemoteFile(authorized);
  legTwoRows.push({ name, before, after, run, authorized, sshDir });
  return { before, after, run, authorized, sshDir };
}

const homeMissing = join(root, 'p791-home-missing');
const homeSeeded = join(root, 'p791-home-seeded');
const SEED = [
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA one@example',
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB two@example',
  ''
].join('\n');

const missing = runLegTwo('missing', homeMissing, null);
const seeded = runLegTwo('seeded', homeSeeded, SEED);
const repeat = runLegTwo('repeat', homeSeeded, null);

for (const row of legTwoRows) {
  step(
    9 + legTwoRows.indexOf(row),
    `leg 2, ${row.name}`,
    `${String(row.before.bytes)} bytes and ${String(row.before.lines)} line(s) before, ` +
      `${String(row.after.bytes)} bytes and ${String(row.after.lines)} line(s) after, ` +
      `machine said ${JSON.stringify(row.run?.parsed ?? null)}, class ${String(row.run?.cls)}`
  );
}

if (missing.before.present) fail('leg 2 (missing) started with a file that was already there.');
if (missing.after.lines !== 1) {
  fail(`leg 2 (missing) left ${String(missing.after.lines)} line(s) and must leave exactly one.`);
}
if (missing.run?.parsed !== 'added') {
  fail(`leg 2 (missing) reported ${JSON.stringify(missing.run?.parsed ?? null)} rather than added.`);
}
const missingDirMode = existsSync(missing.sshDir) ? statSync(missing.sshDir).mode & 0o777 : -1;
const missingFileMode = existsSync(missing.authorized)
  ? statSync(missing.authorized).mode & 0o777
  : -1;
step(
  12,
  'leg 2, modes on what Tortie created',
  `folder ${missingDirMode.toString(8)}, file ${missingFileMode.toString(8)}`
);
if (missingDirMode !== 0o700) {
  fail(`Tortie created the remote folder as ${missingDirMode.toString(8)} and must create it 700.`);
}
if (missingFileMode !== 0o600) {
  fail(`Tortie created the remote file as ${missingFileMode.toString(8)} and must create it 600.`);
}

if (seeded.before.lines !== 2) {
  fail(`leg 2 (seeded) started with ${String(seeded.before.lines)} line(s) and wanted two.`);
}
if (seeded.after.lines !== 3) {
  fail(
    `leg 2 (seeded) left ${String(seeded.after.lines)} line(s). Exactly one line may ` +
      `be added, and the entries that were there stay there.`
  );
}
if (!readFileSync(seeded.authorized, 'utf8').includes('one@example')) {
  fail('leg 2 (seeded) lost an entry the file already had. Tortie appends and never overwrites.');
}
const seededMode = statSync(seeded.authorized).mode & 0o777;
step(13, 'leg 2, the mode of a file Tortie did not create', seededMode.toString(8));
if (seededMode !== 0o644) {
  fail(
    `Tortie changed the mode of a file it did not create, from 644 to ` +
      `${seededMode.toString(8)}. It sets the mode only on what it makes itself.`
  );
}

if (repeat.after.bytes !== repeat.before.bytes || repeat.after.lines !== repeat.before.lines) {
  fail(
    `a second install added ${String(repeat.after.bytes - repeat.before.bytes)} byte(s). ` +
      `Running it twice must add nothing.`
  );
}
if (repeat.run?.parsed !== 'present') {
  fail(`a second install reported ${JSON.stringify(repeat.run?.parsed ?? null)} rather than present.`);
}

// ---------------------------------------------------------------------------
// Leg 3. The key Tortie made, against a real server that wants it
// ---------------------------------------------------------------------------

startSshd(
  'accepting',
  [
    `Port ${String(PORT_ACCEPTING)}`,
    `ListenAddress ${TARGET}`,
    `HostKey ${yard.hostKey}`,
    `AuthorizedKeysFile ${seeded.authorized}`,
    'PasswordAuthentication no',
    'KbdInteractiveAuthentication no',
    'PubkeyAuthentication yes',
    'UsePAM no',
    'StrictModes no',
    'LogLevel QUIET'
  ],
  PORT_ACCEPTING
);

const leg3Known = join(root, 'p791-leg3-known');
writeFileSync(leg3Known, `[${TARGET}]:${String(PORT_ACCEPTING)} ${hostKeyLine}\n`, 'utf8');

const leg3 = sh('/usr/bin/ssh', [
  '-i',
  key.path,
  '-o',
  'BatchMode=yes',
  '-o',
  'IdentitiesOnly=yes',
  '-o',
  'StrictHostKeyChecking=yes',
  '-o',
  `UserKnownHostsFile="${leg3Known}"`,
  '-p',
  String(PORT_ACCEPTING),
  '-l',
  yard.user,
  TARGET,
  'printf p791-leg3-ok'
]);

step(
  14,
  'leg 3, the key Tortie made against a real server',
  `exit ${String(leg3.code)}, printed ${JSON.stringify(leg3.stdout.trim())}`
);
if (leg3.code !== 0 || !leg3.stdout.includes('p791-leg3-ok')) {
  fail(
    `the key Tortie made and the line it wrote did not authenticate against a ` +
      `real server. The client said: ${leg3.both.trim().split('\n').slice(-3).join(' ')}`
  );
}

// ---------------------------------------------------------------------------
// Leg 4. The stock Mac, and the visible connection test that meets it
// ---------------------------------------------------------------------------
//
// ADDED IN THE FIX ROUND, and it is the leg that failed. The first build of
// this phase offered the key block for `auth-refused` and `refused` only.
// Neither is what a stock Mac produces. A Mac with Remote Login on offers a key
// AND a password, and with no key for Tortie on it the client prints its own
// password question and waits. The test ran its whole 60 s deadline, came back
// `timed-out`, and the screen told the operator the machine was answering too
// slowly to use. It had answered in milliseconds.
//
// This server is that Mac: both ways in are allowed, and the file that would
// hold a key for Tortie is empty.

const stockAuthorized = join(root, 'p791-stock-authorized');
writeFileSync(stockAuthorized, '', 'utf8');
chmodSync(stockAuthorized, 0o600);

startSshd(
  'stock',
  [
    `Port ${String(PORT_STOCK)}`,
    `ListenAddress ${TARGET}`,
    `HostKey ${yard.hostKey}`,
    `AuthorizedKeysFile ${stockAuthorized}`,
    'PasswordAuthentication yes',
    'KbdInteractiveAuthentication yes',
    'PubkeyAuthentication yes',
    'UsePAM no',
    'StrictModes no',
    'LogLevel QUIET'
  ],
  PORT_STOCK
);

// Tortie's own record file, so the test meets the password question rather than
// the host key question. In the product that line is written the first time a
// person answers the identity question in this same view.
const stockHostKeys = join(root, 'p791-stock-known-machines');
writeFileSync(
  stockHostKeys,
  `[${TARGET}]:${String(PORT_STOCK)} ${hostKeyLine}\n`,
  'utf8'
);

const leg4Start = Date.now();
const leg4 = drive({
  op: 'test',
  id: MACHINE_ID,
  keyPath: key.path,
  fields: { host: TARGET, user: yard.user, port: PORT_STOCK, remoteTmuxPath: null },
  hostKeys: { tortie: stockHostKeys, user: personHostKeys }
});
const leg4Wall = Date.now() - leg4Start;

if (leg4 === null) {
  fail('leg 4 did not run, so the stock Mac answer is unproven.');
} else {
  step(
    15,
    'leg 4, the class the visible test decided',
    `${String(leg4.cls)} in ${String(leg4.durationMs)} ms, ${String(leg4Wall)} ms of wall clock for the whole driver`
  );
  step(
    16,
    'leg 4, the key block the person is offered',
    leg4.keySheet === null
      ? 'none'
      : `${String(leg4.keySheet.lines.length)} lines, hash ${String(leg4.keySheet.hash).slice(0, 12)}`
  );
  step(
    17,
    'leg 4, what the machine itself printed, whole',
    JSON.stringify(leg4.programText)
  );

  if (leg4.cls !== 'password-required') {
    fail(
      `a machine that asked for a password produced the class ${String(leg4.cls)}. ` +
        `It must produce password-required, because that is the answer the key ` +
        `block is offered under.`
    );
  }
  if (leg4.keySheet === null) {
    fail(
      'the stock Mac was offered no key block. That is the one machine this ' +
        'phase exists for, and the button has to be there.'
    );
  }
  if (leg4.durationMs > 10_000) {
    fail(
      `the test took ${String(leg4.durationMs)} ms to answer a machine that ` +
        `replied at once. It must stop at the question rather than wait out its deadline.`
    );
  }
  if (!/[Pp]assword:/.test(leg4.transcript)) {
    fail('the transcript holds no password question, so this leg tested nothing.');
  }
  if (leg4.classifiedFromText !== 'password-required') {
    fail(
      `the finished transcript classifies as ${String(leg4.classifiedFromText)} ` +
        `when read back, so the live answer and the golden path disagree.`
    );
  }
  // The bytes a real program printed, written into the golden folder only when
  // the run is asked for them. A normal probe run changes no file in the tree.
  if (process.argv.includes('--capture-golden')) {
    const goldenPath = join(
      repoRoot,
      'src/main/machines/__tests__/golden/password-required.txt'
    );
    writeFileSync(goldenPath, leg4.programText, 'utf8');
    say(`wrote ${String(leg4.programText.length)} bytes to ${goldenPath}`);
  }
}

// ---------------------------------------------------------------------------
// Proof 6. The password is nowhere in Tortie's own data directory
// ---------------------------------------------------------------------------

function findText(dir, needle) {
  const hits = [];
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return hits;
  }
  for (const name of names) {
    const path = join(dir, name);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      hits.push(...findText(path, needle));
      continue;
    }
    try {
      if (readFileSync(path, 'utf8').includes(needle)) hits.push(path);
    } catch {
      /* a file that cannot be read as text cannot carry the password as text */
    }
  }
  return hits;
}

const leaked = [
  ...findText(userData, WRONG_PASSWORD),
  ...findText(userData, 'p791-stub-password')
];
step(18, 'the password anywhere under the isolated data directory', `${String(leaked.length)} file(s)`);
if (leaked.length > 0) {
  fail(`the password was found in ${leaked.join(', ')}. It is kept nowhere.`);
}

// ---------------------------------------------------------------------------
// Rule 4 again, and the operator's server
// ---------------------------------------------------------------------------

stopEverything();

const ownKeysAfter = measureOwnKeyFolder();
const sessionsAfter = operatorSessions();

const namesBefore = Object.keys(ownKeysBefore).sort().join(',');
const namesAfter = Object.keys(ownKeysAfter).sort().join(',');
let moved = namesBefore !== namesAfter;
for (const name of Object.keys(ownKeysBefore)) {
  const one = ownKeysBefore[name];
  const two = ownKeysAfter[name];
  if (two === undefined || one.bytes !== two.bytes || one.sha256 !== two.sha256) moved = true;
}

process.stdout.write('\nthe person\'s own key folder             bytes  sha256\n');
process.stdout.write('-'.repeat(90) + '\n');
for (const name of Object.keys(ownKeysBefore).sort()) {
  const one = ownKeysBefore[name];
  const two = ownKeysAfter[name] ?? { bytes: -1, sha256: 'gone' };
  process.stdout.write(
    `${name.padEnd(38)} ${String(one.bytes).padEnd(6)} ${one.sha256}\n` +
      `${'  after'.padEnd(38)} ${String(two.bytes).padEnd(6)} ${two.sha256}\n`
  );
}
if (moved) {
  fail(
    "the person's own key folder changed during this run. Tortie never reads, " +
      'writes or moves anything in it.'
  );
}

if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this run and ` +
      `${sessionsAfter} after it.`
  );
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

process.stdout.write('\n#   what                                                       evidence\n');
process.stdout.write('-'.repeat(115) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.what).padEnd(59)}${String(row.evidence)}\n`
  );
}

say(`socket refused for this run: ${SOCKET}. Target: ${TARGET}, and nothing else.`);
say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(`pids killed: ${killed.join(', ') || 'none'}`);
say(`operator sessions before: ${sessionsBefore}, after: ${sessionsAfter}`);
say(
  'NOT PROVEN: no leg watched a real sshd accept a password, because a server ' +
    'that verifies one has to run as root and this phase never asks for root.'
);

try {
  rmSync(root, { recursive: true, force: true });
} catch {
  /* a scratch directory that will not go is not a result */
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Tortie made one key, kept the private half at 0600 in a folder at 0700, ' +
    'added exactly one line to the file on the other machine, added none on the ' +
    'second run, refused a wrong password after exactly one prompt without ' +
    "showing it back, and left the person's own key folder byte for byte as it " +
    'was.\n'
);
