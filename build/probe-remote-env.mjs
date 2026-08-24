/**
 * `node build/probe-remote-env.mjs`. The Tier 2 live probe of Phase 73 item 2,
 * being the byte path of a value put on a session Tortie starts on another
 * machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So four rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started, because the far side of every connection here is the
 *     machine holding the operator's live sessions.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The one session this probe creates is created on the scratch socket and
 *     is killed by its own immutable id before the probe exits.
 *
 * ---------------------------------------------------------------------------
 * THE QUESTION, AS RESEARCH 51 SECTION 7 ROW 4 WROTE IT
 * ---------------------------------------------------------------------------
 * > Does a passthrough value transit the Mac process, the ssh argv, or remote
 * > `ps` output on the way to `new-session -e`?
 *
 * ---------------------------------------------------------------------------
 * HOW IT IS MEASURED, AND WHAT THE SENTINEL IS
 * ---------------------------------------------------------------------------
 * The sentinel is `TORTIE-P73-<16 random hex>`, which appears nowhere else on
 * this Mac. It is carried as the VALUE of `GMUX_SESSION_ID`, which is one of
 * the two names Tortie already sends, so every byte below travels the
 * production path with nothing bypassed and nothing composed by this file.
 *
 * Four points are looked at:
 *
 *  1. The argv Tortie composes on this Mac. Read from `tmuxCommand`, which is
 *     the one composer, so this is the command itself rather than a copy.
 *  2. This Mac's process table while the create is in flight, sampled every
 *     50 ms, classified by program name so the local sign in program and the
 *     far side's own program are counted apart.
 *  3. What another account could read. Measured rather than cited: every
 *     process on this Mac owned by a different account is counted, and so is
 *     the number of those whose arguments `ps` prints at all.
 *  4. The session environment after the create, read back with
 *     `show-environment` over the exec plane.
 *
 * WHAT THIS PROBE DOES NOT MEASURE, and the research document says it again.
 * The far side is this Mac, so row 2's far side is a macOS far side. No Linux
 * machine was contacted. The refusal item 2 ships is decided by the unmeasured
 * Linux case and not by the measured macOS one.
 *
 * Every scratch file carries a `p73-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact. */
const TARGET = '127.0.0.1';
const PORT = 45741;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p73-env-${String(process.pid)}`,
  'p73-env'
);

const root = join('/tmp', `p73-env-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p73-env] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p73-env] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p73-env] ${String(n)}. ${what}: ${evidence}\n`);

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

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The driver. Every argv and every refusal below is Tortie's own
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p73-env-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const execPlane = await import(REPO + '/src/main/machines/exec-plane');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const sessions = await import(REPO + '/src/main/machines/remote-sessions');
const env = await import(REPO + '/src/main/machines/remote-env');

const ctx = {
  kind: 'remote' as const,
  machineId: input.machineId,
  sshBin: '/usr/bin/ssh',
  host: input.host,
  user: input.user,
  port: input.port,
  remoteTmuxPath: input.remoteTmuxPath,
  socket: input.socket,
  controlPath: input.controlPath,
  hostKeys: { tortie: input.hostKeys, user: input.userHostKeys }
};

let out: unknown = {};

if (input.op === 'prepare') {
  context.registerRemoteMachineContext(ctx);
  const path = await remotePath.captureRemotePath(ctx);
  out = { generation: context.machineGeneration(ctx.machineId).generation, path };
} else if (input.op === 'create') {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  const args = sessions.remoteCreateArgs({
    tmuxName: input.name,
    cwd: input.cwd,
    sessionId: input.sessionId,
    argv: ['sleep', '30']
  });
  const plan = context.tmuxCommand(ctx, args);
  const printed = await execPlane.execOn(ctx, args, { timeoutMs: 30000 });
  out = { args, file: plan.file, argv: plan.argv, printed };
} else if (input.op === 'exec') {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  out = { printed: await execPlane.execOn(ctx, input.args, { timeoutMs: 20000 }) };
} else if (input.op === 'refuse') {
  let message = '';
  let detail = '';
  try {
    env.assertRemoteEnvAllowed(input.env);
  } catch (err) {
    const payload = (err as { payload?: { message?: string; detail?: string } })
      .payload;
    message = String(payload?.message ?? (err as Error).message);
    detail = String(payload?.detail ?? '');
  }
  out = {
    message,
    detail,
    allowed: env.REMOTE_ENV_ALLOWED,
    refusal: env.REMOTE_ENV_PASSTHROUGH_REFUSED
  };
}

writeFileSync(outPath, JSON.stringify(out), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p73-env-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p73-env-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 180_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-remote-env',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
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
// The scratch machine
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p73-env',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

const machine = scratchMachine(yard, { id: 'one', port: PORT });

function stopEverything() {
  try {
    machine.stop();
  } catch {
    /* already gone, which is the state we wanted */
  }
  for (const pid of [...recordedPids].reverse()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    machine.cleanup();
  } catch {
    /* nothing to remove */
  }
  const tmuxTmp = machineTmuxTmp('p73-env', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(1);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);

const ctxInput = {
  machineId: 'p73-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p73-env-control'),
  hostKeys: join(root, 'p73-env-known-machines'),
  userHostKeys: join(root, 'p73-env-person-known-hosts')
};
writeFileSync(ctxInput.userHostKeys, '', 'utf8');

// Tortie's own record file, seeded with the scratch machine's identity. In the
// product that line is written by the ONE visible connection test, where a
// person read the question and answered it. Nothing here writes to the person's
// own record file, which is why the second path above is an empty scratch file.
const hostKeyLine = readFileSync(`${yard.hostKey}.pub`, 'utf8')
  .trim()
  .split(' ')
  .slice(0, 2)
  .join(' ');
writeFileSync(
  ctxInput.hostKeys,
  `[${TARGET}]:${String(PORT)} ${hostKeyLine}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// The count of sign in processes, before anything
// ---------------------------------------------------------------------------

const sshCount = () =>
  sh('/bin/ps', ['-Axo', 'comm='])
    .stdout.split('\n')
    .filter((one) => one.trim().endsWith('/ssh') || one.trim() === 'ssh').length;

const sshBefore = sshCount();

// ---------------------------------------------------------------------------
// The refusal, and it is measured before anything is sent
// ---------------------------------------------------------------------------

const refused = drive({
  ...ctxInput,
  op: 'refuse',
  env: { GMUX_MANAGED: '1', ANTHROPIC_API_KEY: 'sk-not-a-real-key' }
});

if (refused === null || refused.message !== refused.refusal) {
  fail('a create carrying a name outside the allowed set was not refused.');
} else {
  step(1, 'the refusal', `${refused.message}`);
  step(2, 'the allowed names', refused.allowed.join(', '));
  if (!String(refused.detail).includes('ANTHROPIC_API_KEY')) {
    fail('the refusal did not name the offending name.');
  }
}

const sshAfterRefusal = sshCount();
step(
  3,
  'sign in processes across the refusal',
  `${String(sshBefore)} before, ${String(sshAfterRefusal)} after`
);
if (sshAfterRefusal > sshBefore) {
  fail('a refused create started a sign in process. Nothing may be sent.');
}

// ---------------------------------------------------------------------------
// The sentinel, and the sampler
// ---------------------------------------------------------------------------

const SENTINEL = `TORTIE-P73-${randomBytes(8).toString('hex')}`;
const samplePath = join(root, 'p73-env-samples.txt');
writeFileSync(samplePath, '', 'utf8');

const sampler = spawn(
  '/bin/sh',
  [
    '-c',
    // `-ww` IS LOAD BEARING AND IT WAS MEASURED. Without it macOS truncates
    // the arguments column, and the sentinel sits at the END of a 450
    // character command line, so three runs of this probe reported zero hits
    // for the sign in program while the value was plainly on its argv.
    `while :; do /bin/ps -Axww -o user=,comm=,args= >> ${samplePath}; ` +
      `printf '=== SAMPLE ===\\n' >> ${samplePath}; /bin/sleep 0.01; done`
  ],
  { stdio: 'ignore' }
);
if (typeof sampler.pid === 'number') recordedPids.push(sampler.pid);

const created = drive({
  ...ctxInput,
  op: 'create',
  name: 'p73-env-probe',
  cwd: root,
  sessionId: SENTINEL
});

// Give the sampler a few more passes, then stop it by its own pid.
sh('/bin/sleep', ['0.3']);
try {
  process.kill(sampler.pid, 'SIGKILL');
} catch {
  /* already gone */
}

if (created === null) {
  fail('the create did not run, so the byte path could not be measured.');
  stopEverything();
  process.exit(1);
}

const composed = created.argv.join(' ');
step(4, 'the create Tortie composed', `${created.file} ${composed}`);
const inArgv = composed.includes(SENTINEL);
step(
  5,
  'point 1, the argv on this Mac',
  inArgv ? `HOLDS the value, in 1 of ${String(created.argv.length)} arguments` : 'does NOT hold the value'
);
if (!inArgv) {
  fail('the value was not on the argv Tortie composed, so the trace is wrong.');
}

// ---------------------------------------------------------------------------
// Point 2. This Mac's process table while the create was in flight
// ---------------------------------------------------------------------------

const samples = readFileSync(samplePath, 'utf8').split('=== SAMPLE ===');
let sshHits = 0;
let tmuxHits = 0;
let otherHits = 0;
const otherExamples = [];
// How many samples saw the sign in program AT ALL, whether or not that line
// carried the value. It is what tells a missed process from a rewritten argv,
// and without it a zero above could be read as either.
let sshSeen = 0;
for (const sample of samples) {
  for (const line of sample.split('\n')) {
    if (line.includes('/usr/bin/ssh ')) sshSeen += 1;
    if (!line.includes(SENTINEL)) continue;
    // The two programs by their own paths, which this file knows because it
    // composed neither of them: the sign in program Tortie runs here, and the
    // program the machine row names on the far side.
    if (line.includes('/ssh ') || line.includes('/ssh\t')) sshHits += 1;
    else if (line.includes(yard.tmuxPath)) tmuxHits += 1;
    else {
      otherHits += 1;
      if (otherExamples.length < 2) otherExamples.push(line.trim().slice(0, 140));
    }
  }
}
step(
  6,
  'point 2, this Mac’s process table',
  `${String(samples.length)} samples, as fast as ps answers. Sign in program: ${String(sshHits)} ` +
    `hit(s). The far side’s own program: ${String(tmuxHits)} hit(s). ` +
    `Anything else: ${String(otherHits)} hit(s). The sign in program was on ` +
    `${String(sshSeen)} sampled line(s) in total`
);
for (const example of otherExamples) {
  say(`  a line that is neither of the two programs: ${example}`);
}
if (sshHits === 0 && tmuxHits === 0) {
  say(
    'NOT AN ERROR, AND NOT EVIDENCE EITHER. The create finished inside one ' +
      'sampling interval. Point 1 is the composition itself and it is proof ' +
      'that the value is on the argv. This row says only that the sampler did ' +
      'not catch it on this run.'
  );
}

// ---------------------------------------------------------------------------
// Point 3. What another account can read, measured rather than cited
// ---------------------------------------------------------------------------

const me = sh('/usr/bin/id', ['-un']).stdout.trim();
let othersTotal = 0;
let othersWithArgs = 0;
const argExamples = [];
for (const line of sh('/bin/ps', ['-Axww', '-o', 'user=,args=']).stdout.split('\n')) {
  const parts = line.trim().split(/\s+/);
  const user = parts[0] ?? '';
  if (user.length === 0 || user === me) continue;
  othersTotal += 1;
  // A process that prints only its own program path is one whose arguments
  // this account cannot read. A process that prints more than that is one
  // whose arguments it can. The count is the measurement, and this probe does
  // not decide WHY macOS answers either way.
  if (parts.length > 2) {
    othersWithArgs += 1;
    if (argExamples.length < 2) argExamples.push(line.trim().slice(0, 100));
  }
}
step(
  7,
  'point 3, another account’s arguments',
  `${String(othersTotal)} process(es) owned by other accounts. ` +
    `${String(othersWithArgs)} of them printed more than their program path ` +
    `to this account`
);
for (const example of argExamples) say(`  for example: ${example}`);

// ---------------------------------------------------------------------------
// Point 4. The session environment after the create
// ---------------------------------------------------------------------------

const listed = drive({
  ...ctxInput,
  op: 'exec',
  args: ['list-sessions', '-F', '#{session_id} #{session_name}']
});
const line =
  (listed?.printed ?? '')
    .split('\n')
    .find((one) => one.includes('p73-env-probe')) ?? '';
const tmuxId = line.split(' ')[0] ?? '';

if (tmuxId.length === 0) {
  fail('the session Tortie created was not in the machine’s own list.');
} else {
  const shown = drive({
    ...ctxInput,
    op: 'exec',
    args: ['show-environment', '-t', tmuxId, 'GMUX_SESSION_ID']
  });
  const printed = (shown?.printed ?? '').trim();
  step(
    8,
    'point 4, the session environment on the machine',
    printed.length > 0 ? printed : 'nothing was printed'
  );
  if (!printed.includes(SENTINEL)) {
    fail('the value did not reach the session on the machine.');
  }
  const killed = drive({ ...ctxInput, op: 'exec', args: ['kill-session', '-t', tmuxId] });
  step(9, 'the probe’s own session, ended by its immutable id', tmuxId);
  if (killed === null) fail('the probe could not end the session it created.');
}

// ---------------------------------------------------------------------------
// The answer, in one sentence
// ---------------------------------------------------------------------------

say('');
say(
  'THE ANSWER. The value is one element of the argv of the sign in program on ' +
    'this Mac, and the whole far side command is one element of that same ' +
    'argv. On the far side the login shell splits that string and runs that ' +
    'machine’s own program with the value in ITS argv. So the bytes stand ' +
    'in two process tables at once for the life of the create.'
);
say(
  'WHAT IS NOT MEASURED. The far side here is this Mac. No Linux machine was ' +
    'contacted by this probe or by any part of this phase.'
);

stopEverything();
say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
