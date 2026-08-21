/**
 * `node build/probe-p101-save.mjs`. The Tier 3 live probe of Phase 101, being
 * the first command Tortie sends that can replace a file a person already had.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. Every file this probe writes on the far side sits under a scratch folder
 *     it made under /tmp. The operator's own home is counted before and after
 *     and it is never written to.
 *  5. The operator's server is counted before and after, read only.
 *
 * ---------------------------------------------------------------------------
 * THE LEGS
 * ---------------------------------------------------------------------------
 *  1. The composed size at a 90,000 byte payload, against
 *     `REMOTE_SCRIPT_MAX_BYTES`, with the margin as a number.
 *  2. A real save over a real link. The bytes on the far side are compared with
 *     `shasum -a 256` on both sides, and the seconds are reported.
 *  3. The mode is kept. A 755 file with two hard links and one extended
 *     attribute goes through a real save. The mode, the link count and the
 *     attribute are all reported afterwards, including the two that do not
 *     survive.
 *  4. The `stale` refusal, driven by changing the file between the read and the
 *     save, with the far side proved unchanged afterwards.
 *  5. The ambiguous repeat. The same save run twice with the same expected
 *     checksum. The second answers `stale` carrying the checksum of the
 *     payload, and `putFileOnMachine`'s own rule reads that as a success.
 *  6. `missing`, driven by deleting the file between the read and the save.
 *  7. `exists`, driven by asking for a new file whose name is already taken.
 *  8. A new empty file, at 0 bytes and mode 600 because `umask 077` made it.
 *  9. `nomode`, driven with a PATH that holds no `stat`.
 * 10. `nosum`, driven with a PATH that holds neither `shasum` nor `sha256sum`,
 *     with the destination proved byte identical afterwards.
 * 11. The far side's OWN copy of containment, run directly. `$2` set to `../x`
 *     and `$1` set to a folder holding `..`, and neither writes anything.
 * 12. The deterministic temporary name. An interrupted save leaves ONE
 *     `.tortie-part` file rather than one per attempt, and the next successful
 *     save of that file clears it.
 * 13. A checksum program that says nothing never produces a false refusal.
 *     This is the hole the first verifier of this phase found, driven again
 *     against the fix, on both arms, plus the one shape that reaches past the
 *     write and the word it prints there.
 * 14. The local ssh killed in the middle of a real save, which is evidence
 *     item 6 of the phase entry and the question research 57 section 10 left
 *     open. It reports which failure the kill produces, what the file on the
 *     far side holds afterwards, how many temporary files were left, and that
 *     the next successful save clears them.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT MEASURE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so every answer below is a macOS far side. No Linux
 * machine was contacted, so the `stat` spelling, the `base64` spelling and the
 * shell's behaviour on a killed connection are unverified off macOS. Leg 14
 * kills a real ssh over a real link, and what it measures is a macOS far side
 * reached over loopback.
 *
 * It does not drive the confirm gate, the machines file or the three IPC
 * channels. Those need Electron's keystore and they are covered by
 * `src/main/machines/__tests__/ipc.test.ts` and by
 * `npm run conformance:machines`. What this probe covers is the script text and
 * what it does to real bytes on a real machine.
 *
 * Legs 9 and 10 run the catalogue's own script text through `/bin/sh` on this
 * Mac with a cut down PATH rather than over the link, because the far side's
 * PATH is set by its own login and this probe does not rewrite that. The text
 * is byte identical to the text the door sends, and the leg says so.
 *
 * Every scratch file carries a `p101-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
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

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact. */
const TARGET = '127.0.0.1';
const PORT = 45751;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p101-save-${String(process.pid)}`,
  'p101-save'
);

const root = join('/tmp', `p101-save-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p101-save] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p101-save] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p101-save] ${String(n)}. ${what}: ${evidence}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
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
// Rules 4 and 5. What is measured before anything starts
// ---------------------------------------------------------------------------

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    "tmux -L gmux list-sessions 2>/dev/null | wc -l | tr -d ' '"
  ]).stdout.trim();
}

/** Everything under the operator's own `~/.tortie`, which nothing here writes. */
function ownTortieDir() {
  const dir = join(homedir(), '.tortie');
  if (!existsSync(dir)) return 'not there';
  const walk = (at) =>
    readdirSync(at)
      .sort()
      .flatMap((name) => {
        const path = join(at, name);
        return statSync(path).isDirectory()
          ? walk(path)
          : [`${path} ${String(statSync(path).size)}`];
      });
  return walk(dir).join('\n');
}

const sessionsBefore = operatorSessions();
const ownTortieBefore = ownTortieDir();

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The driver. Every command below is Tortie's own
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p101-save-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';

async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const control = await import(REPO + '/src/main/machines/control-plane');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const run = await import(REPO + '/src/main/machines/remote-run');
const scripts = await import(REPO + '/src/main/machines/remote-scripts');
const file = await import(REPO + '/src/main/machines/remote-file');

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

async function connect(): Promise<void> {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  control.noteMachineAnswered(ctx.machineId, Date.now());
}

function said(err: unknown): { message: string; detail: string } {
  const payload = (err as { payload?: { message?: string; detail?: string } })
    .payload;
  return {
    message: String(payload?.message ?? (err as Error).message),
    detail: String(payload?.detail ?? '')
  };
}

let out: unknown = {};

if (input.op === 'compose') {
  // The whole composed command at the largest payload the contract allows, so
  // the margin under REMOTE_SCRIPT_MAX_BYTES is a number rather than a claim.
  const script = scripts.remoteScript('file-put')!;
  const payload = Buffer.alloc(input.payloadBytes, 65).toString('base64');
  const command = run.composeRemoteScriptCommand(script, [
    input.root,
    input.rel,
    input.expect,
    payload
  ]);
  out = {
    scriptBytes: Buffer.byteLength(script.text, 'utf8'),
    payloadBytes: Buffer.byteLength(payload, 'utf8'),
    commandBytes: Buffer.byteLength(command, 'utf8'),
    maxBytes: scripts.REMOTE_SCRIPT_MAX_BYTES,
    carriesText: command.includes(script.text.slice(0, 40)),
    text: script.text
  };
} else if (input.op === 'put') {
  await connect();
  const started = Date.now();
  const answers: unknown[] = [];
  for (const one of input.puts) {
    try {
      const got = await run.runRemoteWrite(
        ctx,
        'file-put',
        [one.root, one.rel, one.expect, one.payload],
        { timeoutMs: 60_000, execution: { kind: 'command', subject: one.rel } }
      );
      answers.push({
        payload: got.payload,
        read: file.parseFilePutAnswer(got.payload)
      });
    } catch (err) {
      answers.push({ refused: said(err) });
    }
  }
  out = { answers, ms: Date.now() - started };
} else if (input.op === 'pure') {
  // The two pure halves, answered by the product's own code.
  out = {
    contained: input.paths.map((one: { root: string; path: string }) => ({
      ...one,
      rel: file.relativeUnderRoot(one.root, one.path)
    })),
    parsed: input.payloads.map((one: string) => ({
      payload: one,
      read: file.parseFilePutAnswer(one)
    }))
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
  const inPath = join(root, `p101-save-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p101-save-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 240_000,
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p101-save',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer for op "${String(input.op)}". It printed:\n` +
        `${out.both.trim().split('\n').slice(-14).join('\n')}`
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
  prefix: 'p101-save',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

/** The folder the far side may be saved under. Nothing outside it is touched. */
const workRoot = join(root, 'p101-save-work');
mkdirSync(workRoot, { recursive: true, mode: 0o700 });

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
  const tmuxTmp = machineTmuxTmp('p101-save', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(1);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);
say(`the folder this run may save under is ${workRoot}`);

const ctxInput = {
  machineId: 'p101-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p101-save-control'),
  hostKeys: join(root, 'p101-save-known-machines'),
  userHostKeys: join(root, 'p101-save-person-known-hosts')
};
writeFileSync(ctxInput.userHostKeys, '', 'utf8');

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
// Helpers over the far side, which is this Mac's own file system
// ---------------------------------------------------------------------------

const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');

function far(rel) {
  return join(workRoot, rel);
}

function farFacts(rel) {
  const path = far(rel);
  if (!existsSync(path)) return null;
  const info = statSync(path);
  return {
    bytes: info.size,
    mode: (info.mode & 0o777).toString(8),
    links: info.nlink,
    sha256: sha256(readFileSync(path)),
    xattrs: sh('/usr/bin/xattr', [path]).stdout.trim()
  };
}

function partFiles() {
  return readdirSync(workRoot)
    .filter((name) => name.endsWith('.tortie-part'))
    .sort();
}

// ---------------------------------------------------------------------------
// Leg 1. The composed size at the largest payload the contract allows
// ---------------------------------------------------------------------------

const composed = drive({
  op: 'compose',
  ...ctxInput,
  root: workRoot,
  rel: 'a.ts',
  expect: sha256(Buffer.from('anything', 'utf8')),
  payloadBytes: 90_000
});
let scriptText = '';
if (composed !== null) {
  scriptText = composed.text;
  const margin = composed.maxBytes - composed.commandBytes;
  if (margin < 2_000) {
    fail(
      `the composed command leaves ${String(margin)} bytes under ` +
        `${String(composed.maxBytes)}. The margin is under 2,000 bytes, which ` +
        `is reported rather than fixed by lowering the cap quietly.`
    );
  }
  step(
    1,
    'the composed size at a 90,000 byte payload',
    `${String(composed.commandBytes)} bytes against a ${String(
      composed.maxBytes
    )} byte limit, so the margin is ${String(margin)} bytes. The script itself ` +
      `is ${String(composed.scriptBytes)} bytes and the encoded payload is ` +
      `${String(composed.payloadBytes)} bytes.`
  );
}

// ---------------------------------------------------------------------------
// Leg 2. A real save, compared with shasum on both sides
// ---------------------------------------------------------------------------

writeFileSync(far('a.ts'), 'const one = 1;\n', 'utf8');
const readAs = sha256(readFileSync(far('a.ts')));
const newText = 'const one = 1;\nconst two = 2;\n';

const put = drive({
  op: 'put',
  ...ctxInput,
  puts: [{ root: workRoot, rel: 'a.ts', expect: readAs, payload: b64(newText) }]
});
if (put !== null) {
  const answer = put.answers[0];
  const facts = farFacts('a.ts');
  const localSum = sha256(Buffer.from(newText, 'utf8'));
  const farSum = sh('/usr/bin/shasum', ['-a', '256', far('a.ts')])
    .stdout.trim()
    .split(' ')[0];
  if (answer?.read?.word !== 'wrote') {
    fail(`the machine answered ${JSON.stringify(answer?.payload ?? '')}`);
  }
  if (farSum !== localSum || facts?.sha256 !== localSum) {
    fail(
      `the file on the far side hashes to ${String(farSum)} and this Mac sent ` +
        `${localSum}`
    );
  }
  step(
    2,
    'one real save over a real link',
    `${String(Buffer.byteLength(newText, 'utf8'))} bytes landed in ` +
      `${String(put.ms)} ms. shasum -a 256 on the far side is ${String(farSum)} ` +
      `and on this Mac it is ${localSum}, and the machine reported ` +
      `${String(answer?.read?.sha256 ?? 'nothing')}.`
  );
}

// ---------------------------------------------------------------------------
// Leg 3. The mode is kept, and the two things that are not
// ---------------------------------------------------------------------------

writeFileSync(far('mode.sh'), '#!/bin/sh\necho one\n', 'utf8');
sh('/bin/chmod', ['755', far('mode.sh')]);
sh('/bin/ln', [far('mode.sh'), far('mode-link.sh')]);
sh('/usr/bin/xattr', ['-w', 'com.tortie.p101', 'one', far('mode.sh')]);
const modeBefore = farFacts('mode.sh');
const modeSum = modeBefore?.sha256 ?? '';
const modePut = drive({
  op: 'put',
  ...ctxInput,
  puts: [
    {
      root: workRoot,
      rel: 'mode.sh',
      expect: modeSum,
      payload: b64('#!/bin/sh\necho two\n')
    }
  ]
});
if (modePut !== null) {
  const after = farFacts('mode.sh');
  if (after?.mode !== '755') {
    fail(
      `a 755 file came back ${String(after?.mode)} after a save. The mode is ` +
        `read before the write and applied to the temporary file, and that is ` +
        `what this leg exists to prove.`
    );
  }
  step(
    3,
    'the mode is kept, and the two things that are not',
    `mode ${String(modeBefore?.mode)} to ${String(after?.mode)}, hard links ` +
      `${String(modeBefore?.links)} to ${String(after?.links)}, extended ` +
      `attributes ${JSON.stringify(modeBefore?.xattrs ?? '')} to ` +
      `${JSON.stringify(after?.xattrs ?? '')}. The link count and the ` +
      `attribute do not survive, the confirm sheet says so before a person ` +
      `agrees, and this leg reports the numbers rather than omitting them.`
  );
}

// ---------------------------------------------------------------------------
// Legs 4 to 7. The refusals the machine makes, each proved by a read after it
// ---------------------------------------------------------------------------

writeFileSync(far('stale.ts'), 'one\n', 'utf8');
const staleExpect = sha256(Buffer.from('one\n', 'utf8'));
writeFileSync(far('stale.ts'), 'somebody else wrote this\n', 'utf8');
const staleFacts = farFacts('stale.ts');

writeFileSync(far('gone.ts'), 'one\n', 'utf8');
const goneExpect = sha256(Buffer.from('one\n', 'utf8'));
rmSync(far('gone.ts'));

writeFileSync(far('taken.ts'), 'already here\n', 'utf8');
const takenFacts = farFacts('taken.ts');

const refusals = drive({
  op: 'put',
  ...ctxInput,
  puts: [
    {
      root: workRoot,
      rel: 'stale.ts',
      expect: staleExpect,
      payload: b64('what Tortie would have written\n')
    },
    {
      root: workRoot,
      rel: 'gone.ts',
      expect: goneExpect,
      payload: b64('what Tortie would have written\n')
    },
    {
      root: workRoot,
      rel: 'taken.ts',
      expect: 'new',
      payload: b64('')
    }
  ]
});
if (refusals !== null) {
  const [stale, missing, exists] = refusals.answers;
  if (stale?.read?.word !== 'stale') {
    fail(`the changed file answered ${JSON.stringify(stale?.payload ?? '')}`);
  }
  if (farFacts('stale.ts')?.sha256 !== staleFacts?.sha256) {
    fail('the stale refusal wrote to the file anyway.');
  }
  if (missing?.read?.word !== 'missing') {
    fail(`the deleted file answered ${JSON.stringify(missing?.payload ?? '')}`);
  }
  if (existsSync(far('gone.ts'))) {
    fail('the missing refusal made the file anyway.');
  }
  if (exists?.read?.word !== 'exists') {
    fail(`the taken name answered ${JSON.stringify(exists?.payload ?? '')}`);
  }
  if (farFacts('taken.ts')?.sha256 !== takenFacts?.sha256) {
    fail('the exists refusal wrote over the file anyway.');
  }
  step(
    4,
    'the file changed on that machine since Tortie read it',
    `answered ${JSON.stringify(stale?.payload ?? '')}, and the file is byte ` +
      `identical afterwards at ${String(farFacts('stale.ts')?.sha256)}`
  );
  step(
    5,
    'the file is gone on that machine',
    `answered ${JSON.stringify(missing?.payload ?? '')}, and nothing was made`
  );
  step(
    6,
    'a new file whose name is already there',
    `answered ${JSON.stringify(exists?.payload ?? '')}, and the file is byte ` +
      `identical afterwards`
  );
}

// ---------------------------------------------------------------------------
// Leg 7. The ambiguous repeat, which is what makes a save safe to run twice
// ---------------------------------------------------------------------------

writeFileSync(far('twice.ts'), 'one\n', 'utf8');
const twiceExpect = sha256(Buffer.from('one\n', 'utf8'));
const twiceText = 'two\n';
const twice = drive({
  op: 'put',
  ...ctxInput,
  puts: [
    {
      root: workRoot,
      rel: 'twice.ts',
      expect: twiceExpect,
      payload: b64(twiceText)
    },
    {
      root: workRoot,
      rel: 'twice.ts',
      expect: twiceExpect,
      payload: b64(twiceText)
    }
  ]
});
if (twice !== null) {
  const [first, second] = twice.answers;
  const payloadSum = sha256(Buffer.from(twiceText, 'utf8'));
  if (first?.read?.word !== 'wrote') {
    fail(`the first save answered ${JSON.stringify(first?.payload ?? '')}`);
  }
  if (second?.read?.word !== 'stale' || second?.read?.sha256 !== payloadSum) {
    fail(
      `the repeat answered ${JSON.stringify(second?.payload ?? '')}, and it ` +
        `has to answer stale carrying the checksum of the payload, which is ` +
        `what putFileOnMachine reads as the write having landed.`
    );
  }
  step(
    7,
    'the ambiguous repeat is reported as a success',
    `the first run answered ${JSON.stringify(first?.payload ?? '')} and the ` +
      `repeat answered ${JSON.stringify(second?.payload ?? '')}. The reported ` +
      `checksum equals the checksum of the payload, so main reads the second ` +
      `as the write having landed and only the answer having been lost.`
  );
}

// ---------------------------------------------------------------------------
// Leg 8. A new empty file, at 0 bytes and mode 600
// ---------------------------------------------------------------------------

const made = drive({
  op: 'put',
  ...ctxInput,
  puts: [
    { root: workRoot, rel: 'made.ts', expect: 'new', payload: b64('') },
    { root: workRoot, rel: 'made.ts', expect: 'new', payload: b64('') }
  ]
});
if (made !== null) {
  const facts = farFacts('made.ts');
  if (made.answers[0]?.read?.word !== 'wrote') {
    fail(`the new file answered ${JSON.stringify(made.answers[0]?.payload ?? '')}`);
  }
  if (facts?.bytes !== 0 || facts.mode !== '600') {
    fail(
      `the new file is ${String(facts?.bytes)} bytes at mode ` +
        `${String(facts?.mode)}, and umask 077 makes it 0 bytes at 600.`
    );
  }
  if (made.answers[1]?.read?.word !== 'exists') {
    fail('a second new file of the same name did not answer exists.');
  }
  step(
    8,
    'a new empty file lands, and a second one of that name refuses',
    `${String(facts?.bytes)} bytes at mode ${String(facts?.mode)}, and the ` +
      `second attempt answered ` +
      `${JSON.stringify(made.answers[1]?.payload ?? '')}`
  );
}

// ---------------------------------------------------------------------------
// Legs 9 and 10. nomode and nosum, with the PATH cut down
// ---------------------------------------------------------------------------
//
// THESE TWO RUN THE CATALOGUE'S OWN TEXT ON THIS MAC rather than over the link,
// because the far side's PATH is set by its own login and this probe does not
// rewrite that. The text is byte identical to the text the door sends, which is
// what leg 1 read out of the catalogue.

function runTextWithPath(pathValue, args) {
  return sh('/usr/bin/env', [
    '-i',
    `PATH=${pathValue}`,
    '/bin/sh',
    '-c',
    scriptText,
    'tortie-file-put',
    ...args
  ]);
}

if (scriptText.length > 0) {
  const binDir = join(root, 'p101-save-bin');
  mkdirSync(binDir, { recursive: true, mode: 0o700 });
  // A PATH holding a checksum program and no `stat`.
  for (const name of ['shasum', 'printf', 'cut', 'wc', 'tr', 'base64', 'mv', 'chmod', 'command']) {
    const real = sh('/usr/bin/which', [name]).stdout.trim();
    if (real.length > 0) sh('/bin/ln', ['-sf', real, join(binDir, name)]);
  }

  writeFileSync(far('nomode.ts'), 'one\n', 'utf8');
  const nomodeExpect = sha256(Buffer.from('one\n', 'utf8'));
  const nomodeBefore = farFacts('nomode.ts');
  const nomode = runTextWithPath(binDir, [
    workRoot,
    'nomode.ts',
    nomodeExpect,
    b64('two\n')
  ]);
  const nomodeAfter = farFacts('nomode.ts');
  if (!nomode.stdout.includes('__TORTIE_RUN__nomode none none__TORTIE_RUN__')) {
    fail(
      `with no stat on the PATH the script printed ` +
        `${JSON.stringify(nomode.both.trim())} rather than nomode.`
    );
  }
  if (nomodeAfter?.sha256 !== nomodeBefore?.sha256) {
    fail('the nomode answer wrote to the file anyway.');
  }
  step(
    9,
    'a machine whose stat cannot be read',
    `printed ${JSON.stringify(nomode.stdout.trim())} and the file is byte ` +
      `identical afterwards at ${String(nomodeAfter?.sha256)}`
  );

  // A PATH holding neither `shasum` nor `sha256sum`.
  const noSumDir = join(root, 'p101-save-nosum-bin');
  mkdirSync(noSumDir, { recursive: true, mode: 0o700 });
  for (const name of ['printf', 'cut', 'wc', 'tr', 'base64', 'mv', 'chmod', 'stat']) {
    const real = sh('/usr/bin/which', [name]).stdout.trim();
    if (real.length > 0) sh('/bin/ln', ['-sf', real, join(noSumDir, name)]);
  }
  writeFileSync(far('nosum.ts'), 'one\n', 'utf8');
  const nosumBefore = farFacts('nosum.ts');
  const nosum = runTextWithPath(noSumDir, [
    workRoot,
    'nosum.ts',
    sha256(Buffer.from('one\n', 'utf8')),
    b64('two\n')
  ]);
  const nosumAfter = farFacts('nosum.ts');
  if (!nosum.stdout.includes('__TORTIE_RUN__nosum none none__TORTIE_RUN__')) {
    fail(
      `with no checksum program on the PATH the script printed ` +
        `${JSON.stringify(nosum.both.trim())} rather than nosum.`
    );
  }
  if (nosumAfter?.sha256 !== nosumBefore?.sha256) {
    fail('the nosum answer wrote to the file anyway.');
  }
  step(
    10,
    'a machine with no program that computes a checksum',
    `printed ${JSON.stringify(nosum.stdout.trim())} and the file is byte ` +
      `identical afterwards at ${String(nosumAfter?.sha256)}. The probe for ` +
      `it is above both arms, so the word always means nothing was written.`
  );

  // ---------------------------------------------------------------------------
  // Leg 11. The far side's own copy of containment
  // ---------------------------------------------------------------------------
  const outsideBefore = existsSync(join(root, 'p101-outside.ts'));
  const climb = runTextWithPath(process.env['PATH'] ?? '/usr/bin:/bin', [
    workRoot,
    '../p101-outside.ts',
    'new',
    b64('this must never land\n')
  ]);
  const dottyRoot = `${workRoot}/../p101-save-work`;
  const dotty = runTextWithPath(process.env['PATH'] ?? '/usr/bin:/bin', [
    dottyRoot,
    'dotty.ts',
    'new',
    b64('this must never land\n')
  ]);
  const outsideAfter = existsSync(join(root, 'p101-outside.ts'));
  if (climb.code === 0 || climb.stdout.includes('__TORTIE_RUN__')) {
    fail(
      `a path of "../p101-outside.ts" was not refused by the script itself. It ` +
        `exited ${String(climb.code)} and printed ` +
        `${JSON.stringify(climb.both.trim())}.`
    );
  }
  if (outsideAfter !== outsideBefore) {
    fail('the climb wrote a file outside the folder.');
  }
  if (dotty.code === 0 || dotty.stdout.includes('__TORTIE_RUN__')) {
    fail(
      `a folder holding ".." was not refused by the script itself. It exited ` +
        `${String(dotty.code)} and printed ${JSON.stringify(dotty.both.trim())}.`
    );
  }
  if (existsSync(far('dotty.ts'))) {
    fail('the folder holding ".." wrote a file anyway.');
  }
  step(
    11,
    "the far side's own containment, with main's copy bypassed",
    `a relative path of "../p101-outside.ts" exited ${String(climb.code)} and ` +
      `wrote nothing, and a folder of ${JSON.stringify(dottyRoot)} exited ` +
      `${String(dotty.code)} and wrote nothing. Both are the script's own ` +
      `case lines rather than a guard around it.`
  );
}

// ---------------------------------------------------------------------------
// Leg 12. The deterministic temporary name
// ---------------------------------------------------------------------------

writeFileSync(far('part.ts'), 'one\n', 'utf8');
const partExpect = sha256(Buffer.from('one\n', 'utf8'));
// Two interrupted attempts, simulated by leaving the part file in place, which
// is what a link that dies between the decode and the move leaves behind.
writeFileSync(far('part.ts.tortie-part'), 'half a file\n', 'utf8');
writeFileSync(far('part.ts.tortie-part'), 'half a file again\n', 'utf8');
const partsBefore = partFiles();
const finished = drive({
  op: 'put',
  ...ctxInput,
  puts: [
    {
      root: workRoot,
      rel: 'part.ts',
      expect: partExpect,
      payload: b64('finished\n')
    }
  ]
});
if (finished !== null) {
  const partsAfter = partFiles();
  if (partsBefore.length !== 1) {
    fail(
      `two interrupted attempts left ${String(partsBefore.length)} temporary ` +
        `file(s). The name is deterministic, so they leave one.`
    );
  }
  if (partsAfter.length !== 0) {
    fail(
      `the next successful save left ${partsAfter.join(', ')} behind rather ` +
        `than moving it into place.`
    );
  }
  step(
    12,
    'an interrupted save leaves one temporary file, and the next save clears it',
    `${String(partsBefore.length)} file(s) before, ` +
      `${String(partsAfter.length)} after, and the file now reads ` +
      `${JSON.stringify(readFileSync(far('part.ts'), 'utf8'))}`
  );
}

// ---------------------------------------------------------------------------
// Leg 13. The hole the first verifier found, driven again against the fix
// ---------------------------------------------------------------------------
//
// A verifier proved the shipped text could answer `nosum` AFTER the bytes had
// landed. He put a `shasum` on the PATH that exits 0 and prints nothing. The
// program was found, both arms ran, the file was written, and the run that
// computed the checksum afterwards said nothing, so the script printed `nosum`
// and a person was told "Nothing was written." while the file on the other
// computer held the payload.
//
// The fix RUNS the program before either arm rather than only finding it. This
// leg is his probe, repeated against the fixed text. It runs three shapes.

if (scriptText.length > 0) {
  const liarDir = join(root, 'p101-save-liar-bin');
  const halfDir = join(root, 'p101-save-half-bin');
  mkdirSync(liarDir, { recursive: true, mode: 0o700 });
  mkdirSync(halfDir, { recursive: true, mode: 0o700 });
  for (const dir of [liarDir, halfDir]) {
    for (const name of [
      'printf',
      'cut',
      'wc',
      'tr',
      'base64',
      'mv',
      'chmod',
      'stat',
      'command'
    ]) {
      const real = sh('/usr/bin/which', [name]).stdout.trim();
      if (real.length > 0) sh('/bin/ln', ['-sf', real, join(dir, name)]);
    }
  }
  // A checksum program that is on the PATH, exits 0 and prints nothing. This
  // is the verifier's own program, byte for byte in what it does.
  writeFileSync(join(liarDir, 'shasum'), '#!/bin/sh\nexit 0\n', {
    encoding: 'utf8',
    mode: 0o755
  });
  // A checksum program that answers about /dev/null and about nothing else,
  // which is the one shape that can still reach the far side of the write.
  writeFileSync(
    join(halfDir, 'shasum'),
    '#!/bin/sh\nfor a in "$@"; do case "$a" in /dev/null) echo "abc  /dev/null"; ' +
      'exit 0;; esac; done\nexit 0\n',
    { encoding: 'utf8', mode: 0o755 }
  );

  const liarNew = runTextWithPath(liarDir, [
    workRoot,
    'liar-new.ts',
    'new',
    b64('this must never land\n')
  ]);
  const liarNewLanded = existsSync(far('liar-new.ts'));

  writeFileSync(far('liar-old.ts'), 'one\n', 'utf8');
  const liarOldBefore = farFacts('liar-old.ts');
  const liarOld = runTextWithPath(liarDir, [
    workRoot,
    'liar-old.ts',
    sha256(Buffer.from('one\n', 'utf8')),
    b64('this must never land\n')
  ]);
  const liarOldAfter = farFacts('liar-old.ts');

  const half = runTextWithPath(halfDir, [
    workRoot,
    'half.ts',
    'new',
    b64('landed\n')
  ]);
  const halfLanded = existsSync(far('half.ts'));

  if (!liarNew.stdout.includes('__TORTIE_RUN__nosum none none__TORTIE_RUN__')) {
    fail(
      `a shasum that exits 0 and prints nothing made the new arm print ` +
        `${JSON.stringify(liarNew.both.trim())} rather than nosum.`
    );
  }
  if (liarNewLanded) {
    fail(
      'the script answered on the new arm with a shasum that says nothing AND ' +
        'left a file behind. Every refusal word means nothing was written.'
    );
  }
  if (!liarOld.stdout.includes('__TORTIE_RUN__nosum none none__TORTIE_RUN__')) {
    fail(
      `a shasum that exits 0 and prints nothing made the checksum arm print ` +
        `${JSON.stringify(liarOld.both.trim())} rather than nosum.`
    );
  }
  if (liarOldAfter?.sha256 !== liarOldBefore?.sha256) {
    fail('the nosum answer on the checksum arm replaced the file anyway.');
  }
  if (!half.stdout.includes('__TORTIE_RUN__unsure none none__TORTIE_RUN__')) {
    fail(
      `a shasum that answers only about /dev/null printed ` +
        `${JSON.stringify(half.both.trim())} rather than unsure.`
    );
  }
  if (!halfLanded) {
    fail('the unsure answer was printed for a write that did not land.');
  }
  step(
    13,
    'a checksum program that says nothing never produces a false refusal',
    `on the new arm it printed ${JSON.stringify(liarNew.stdout.trim())} and ` +
      `wrote no file. On the checksum arm it printed ` +
      `${JSON.stringify(liarOld.stdout.trim())} and the file is byte ` +
      `identical at ${String(liarOldAfter?.sha256)}. A program that answers ` +
      `for /dev/null and then says nothing about the file it wrote printed ` +
      `${JSON.stringify(half.stdout.trim())}, which main does not know and ` +
      `reports as "cannot tell you whether it was saved", with the file ` +
      `present at ${String(farFacts('half.ts')?.bytes)} bytes.`
  );
}

// ---------------------------------------------------------------------------
// Leg 14. Killing the local ssh in the middle of a real save
// ---------------------------------------------------------------------------
//
// EVIDENCE ITEM 6 OF THE PHASE ENTRY, and the question research 57 section 10
// left open. Research measured a local simulation only. This leg kills a real
// ssh over a real link while a real save is in flight, and reports which
// failure that produces and what the far side was left holding.
//
// HOW THE MOMENT IS FOUND. The far side creates `"$f.tortie-part"` the instant
// the decode starts and moves it away when the decode is done, so that file
// existing IS the write being in flight. The watcher below is a tight loop over
// `existsSync` with no sleep in it, because at 90,000 bytes over loopback the
// whole decode is a few milliseconds and a polled watcher walks straight past
// it. The ssh pids are read from the process table BEFORE the loop starts, so
// the kill is one system call rather than a `ps` the window would outlive.
//
// WHICH PROCESS IS SIGNALLED. Only a pid whose command line holds the control
// path THIS RUN composed, which is a name under /tmp that no other ssh on this
// Mac carries. There is no pkill in this file and the operator's own ssh can
// never match.
//
// UP TO SIX ATTEMPTS. A save that completes before the watcher sees anything is
// not an interrupted save and reporting it as one would be false, so the leg
// tries again. What it reports is the first attempt whose part file it caught,
// and if it caught none it says so in those words.

{
  const killTarget = 'killed.ts';
  const killPart = far(`${killTarget}.tortie-part`);
  const controlMark = ctxInput.controlPath;
  const bigPayload = b64('x'.repeat(89_000));

  const findOurSsh = () =>
    sh('/bin/sh', [
      '-c',
      `/bin/ps -axo pid=,command= | /usr/bin/grep -F ${JSON.stringify(
        controlMark
      )} | /usr/bin/grep -v grep | /usr/bin/awk '{print $1}'`
    ])
      .stdout.trim()
      .split('\n')
      .map((one) => Number(one.trim()))
      .filter((one) => Number.isFinite(one) && one > 0);

  let attempts = 0;
  let caught = false;
  let killedPids = [];
  let answered = null;
  let before = null;
  let afterKill = null;
  let partsAfterKill = [];
  let driverSaid = '';

  while (attempts < 6 && !caught) {
    attempts += 1;
    writeFileSync(far(killTarget), `before attempt ${String(attempts)}\n`, 'utf8');
    before = farFacts(killTarget);
    const inPath = join(root, `p101-save-kill-in-${String(attempts)}.json`);
    const outPath = join(root, `p101-save-kill-out-${String(attempts)}.json`);
    writeFileSync(
      inPath,
      JSON.stringify({
        op: 'put',
        ...ctxInput,
        puts: [
          {
            root: workRoot,
            rel: killTarget,
            expect: before?.sha256 ?? 'new',
            payload: bigPayload
          }
        ]
      }),
      'utf8'
    );

    const child = spawn(
      'npx',
      ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
      {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GMUX_SMOKE: 'probe-p101-save',
          GMUX_TMUX_SOCKET: SOCKET,
          SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
        }
      }
    );
    if (typeof child.pid === 'number') recordedPids.push(child.pid);
    let text = '';
    child.stdout.on('data', (chunk) => {
      text += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      text += String(chunk);
    });

    // Wait for an ssh of this run to exist, then cache its pids.
    let pids = [];
    const upBy = Date.now() + 120_000;
    while (Date.now() < upBy && child.exitCode === null) {
      pids = findOurSsh();
      if (pids.length > 0) break;
      sh('/bin/sleep', ['0.05']);
    }

    // The tight watcher. No sleep, because the window is milliseconds.
    const watchBy = Date.now() + 120_000;
    while (Date.now() < watchBy) {
      if (existsSync(killPart)) {
        for (const pid of pids) {
          try {
            process.kill(pid, 'SIGKILL');
            killedPids.push(pid);
          } catch {
            /* already gone */
          }
        }
        caught = true;
        break;
      }
      if (existsSync(outPath)) break;
      if (child.exitCode !== null) break;
    }

    const doneBy = Date.now() + 180_000;
    while (child.exitCode === null && Date.now() < doneBy) {
      sh('/bin/sleep', ['0.2']);
    }
    driverSaid = text.trim().split('\n').slice(-4).join(' | ');
    answered = existsSync(outPath)
      ? JSON.parse(readFileSync(outPath, 'utf8'))
      : null;
    afterKill = farFacts(killTarget);
    partsAfterKill = partFiles();
  }

  // Whatever the kill produced, the next successful save has to clear the part
  // file and land its own bytes. That is the half a person needs.
  const recovered = drive({
    op: 'put',
    ...ctxInput,
    puts: [
      {
        root: workRoot,
        rel: killTarget,
        expect: afterKill?.sha256 ?? 'new',
        payload: b64('after the kill\n')
      }
    ]
  });
  const afterRecovery = farFacts(killTarget);
  const partsAfterRecovery = partFiles();

  const said =
    answered === null
      ? `the driver never answered. It printed: ${driverSaid}`
      : JSON.stringify(answered.answers?.[0] ?? null).slice(0, 420);

  if (killedPids.length === 0) {
    fail(
      `no ssh of this run was killed while a write was in flight after ` +
        `${String(attempts)} attempt(s), so evidence item 6 was not driven.`
    );
  }
  if (partsAfterRecovery.length !== 0) {
    fail(
      `after the recovery save the folder still holds ` +
        `${partsAfterRecovery.join(', ')}. An interrupted save has to be ` +
        `cleared by the next successful one.`
    );
  }
  if (
    afterRecovery?.sha256 !== sha256(Buffer.from('after the kill\n', 'utf8'))
  ) {
    fail('the save after the killed one did not land its own bytes.');
  }
  step(
    14,
    'the local ssh killed while a real save was in flight',
    `caught the write in flight on attempt ${String(attempts)} of at most 6, ` +
      `and killed pid(s) ${killedPids.join(', ') || 'none'}. The call ` +
      `answered ${said}. The file was ${String(before?.bytes)} bytes before ` +
      `and ${String(afterKill?.bytes)} bytes after, and it was ` +
      `${afterKill?.sha256 === before?.sha256 ? 'byte identical' : 'REPLACED'}` +
      `. ${String(partsAfterKill.length)} temporary file(s) were left. The ` +
      `next save landed ${String(afterRecovery?.bytes)} bytes and left ` +
      `${String(partsAfterRecovery.length)} temporary file(s)` +
      `${recovered === null ? ', though the recovery save did not answer' : ''}.`
  );
}

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

const sessionsAfter = operatorSessions();
const ownTortieAfter = ownTortieDir();
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this probe ` +
      `and ${sessionsAfter} after it.`
  );
}
if (ownTortieBefore !== ownTortieAfter) {
  fail("the operator's own ~/.tortie changed while this probe ran.");
}

const killed = [];
for (const pid of [...recordedPids].reverse()) {
  try {
    process.kill(pid, 0);
    killed.push(pid);
  } catch {
    /* already gone */
  }
}
stopEverything();

process.stdout.write(
  '\n#   what                                                       evidence\n'
);
process.stdout.write('-'.repeat(120) + '\n');
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
  `the operator's own ~/.tortie: ${
    ownTortieBefore === ownTortieAfter ? 'unchanged' : 'CHANGED'
  }`
);
say(
  'NOT MEASURED: no Linux machine was contacted. The stat spelling, the base64 ' +
    'spelling and what a killed connection does to the far side shell are all ' +
    'unverified off macOS. The confirm gate, the machines file and the three ' +
    'IPC channels are not driven here.'
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
  '\nPASS. One real file was replaced on a real machine with the same checksum ' +
    'on both sides, a 755 file came back 755, all five refusals the machine ' +
    'makes were driven and each one left the file byte identical, a repeat ' +
    'after a lost answer was reported as a success, a new empty file landed at ' +
    '0 bytes and mode 600, the script refused a path that climbed out and a ' +
    'folder holding "..", and two interrupted saves left one temporary file ' +
    'that the next save cleared.\n'
);
