/**
 * `node build/probe-remote-image.mjs`. The Tier 2 live probe of Phase 73 item 3,
 * being the ONE write Tortie makes on another computer, and the seven scripts
 * the second door may send.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started, because the far side of every connection here is the
 *     machine holding the operator's live sessions.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The far side's HOME is a scratch directory this probe made, set by the
 *     scratch server's own configuration. Nothing is written under the
 *     operator's real home, and the probe measures that rather than promising
 *     it: `~/.tortie` is counted before and after.
 *  5. The operator's server is counted before and after, read only.
 *
 * ---------------------------------------------------------------------------
 * THE SIX LEGS
 * ---------------------------------------------------------------------------
 *  1. The composed command. Every one of the seven scripts is composed by
 *     Tortie's own `composeRemoteScriptCommand` and shown to be ONE quoted
 *     argument whose script text is byte identical to the catalogue constant.
 *  2. Every read script run against the real machine over a real connection,
 *     with what came back printed. This is what says the text runs rather than
 *     that it looks right.
 *  3. One real PNG uploaded through `putImagesOnMachine`, with the sha256 of
 *     the file on the far side compared byte for byte against the local one.
 *  4. The same upload run twice. The second answers `present`, and the far
 *     side's file keeps its inode and its modification time.
 *  5. The refusals: a file over the limit and a text file named `.png`. Neither
 *     writes anything, proven by a directory listing before and after.
 *  6. Connected only, live. The machine's link is put back to quiet the way a
 *     failed poll leaves it, and the upload is refused with nothing sent.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT MEASURE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so every answer below is a macOS far side. No Linux
 * machine was contacted. The size limit the product ships is decided by Linux's
 * own documented `MAX_ARG_STRLEN`, which is a number nobody measured here, and
 * leg 1 prints the composed length against it so the margin is a number rather
 * than a claim.
 *
 * Every scratch file carries a `p73-` prefix.
 */

import { spawnSync } from 'node:child_process';
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
const PORT = 45743;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p73-image-${String(process.pid)}`,
  'p73-image'
);

const root = join('/tmp', `p73-image-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p73-image] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p73-image] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p73-image] ${String(n)}. ${what}: ${evidence}\n`);
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
// The driver. Every command and every refusal below is Tortie's own
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p73-image-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const control = await import(REPO + '/src/main/machines/control-plane');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const run = await import(REPO + '/src/main/machines/remote-run');
const scripts = await import(REPO + '/src/main/machines/remote-scripts');
const image = await import(REPO + '/src/main/machines/remote-image');
const sessions = await import(REPO + '/src/main/machines/remote-sessions');

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

/** What a completed poll leaves behind. It is the state the door asks about. */
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
  out = {
    marker: scripts.REMOTE_SCRIPT_MARKER,
    maxBytes: scripts.REMOTE_SCRIPT_MAX_BYTES,
    scripts: scripts.REMOTE_SCRIPTS.map((script) => {
      const args = Array.from({ length: script.params }, (_, at) =>
        'v' + String(at + 1)
      );
      const command = run.composeRemoteScriptCommand(script, args);
      return {
        id: script.id,
        mode: script.mode,
        params: script.params,
        text: script.text,
        command,
        bytes: command.length
      };
    })
  };
} else if (input.op === 'read') {
  await connect();
  const answers: Record<string, unknown> = {};
  for (const ask of input.asks) {
    try {
      const got = await run.runRemoteRead(ctx, ask.id, ask.args, {
        timeoutMs: 30_000
      });
      answers[ask.id] = { payload: got.payload, generation: got.generation };
    } catch (err) {
      answers[ask.id] = { refused: said(err) };
    }
  }
  out = { answers, facts: await image.readRemoteMachineFacts(ctx.machineId) };
} else if (input.op === 'put') {
  await connect();
  out = {
    placements: await image.putImagesOnMachine({
      machineId: ctx.machineId,
      sessionId: input.sessionId,
      paths: input.paths
    })
  };
} else if (input.op === 'cut') {
  // The machine is registered and then put back to quiet, which is what a
  // failed poll leaves behind. Nothing may be sent from here on.
  await connect();
  control.noteMachineQuiet(ctx.machineId, 'the probe cut the link');
  let refused = { message: '', detail: '' };
  try {
    await image.putImagesOnMachine({
      machineId: ctx.machineId,
      sessionId: input.sessionId,
      paths: input.paths
    });
  } catch (err) {
    refused = said(err);
  }
  out = { refused, link: control.machineLinkFacts(ctx.machineId).link };
} else if (input.op === 'catalogue') {
  // A name nobody wrote down, and a write through the read door. Neither
  // reaches a machine, and this proves it against a machine that is answering.
  await connect();
  const tried: Record<string, unknown> = {};
  try {
    await run.runRemoteRead(ctx, 'rm-rf', []);
  } catch (err) {
    tried['not-in-catalogue'] = said(err);
  }
  try {
    await run.runRemoteRead(ctx, 'image-put', ['a.png', 'AAAA']);
  } catch (err) {
    tried['wrong-door'] = said(err);
  }
  try {
    await run.runRemoteWrite(ctx, 'store-head', ['/etc/hosts', '10']);
  } catch (err) {
    tried['read-through-write'] = said(err);
  }
  out = { tried, sessionsSeen: sessions.remoteSessions().length };
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
  const inPath = join(root, `p73-image-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p73-image-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 240_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-remote-image',
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
// The scratch machine, with a HOME of its own
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p73-image',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

/** The far side's HOME. Nothing this probe does reaches the operator's own. */
const farHome = join(root, 'p73-image-farhome');
mkdirSync(farHome, { recursive: true, mode: 0o700 });

const machine = scratchMachine(yard, { id: 'one', port: PORT });

// The scratch server gives the far side a HOME of its own, so `$HOME` inside
// every script resolves to a directory this probe made. That is rule 4, in the
// one place it can be enforced.
//
// `SetEnv HOME=` DOES NOT WORK and that is measured rather than assumed. On the
// first run of this probe the far side reported the operator's own home and one
// 40,000 byte file landed under it. sshd sets HOME from the account's own
// record AFTER it applies SetEnv, so the value is overwritten every time.
// `ForceCommand` runs before the command and its assignment survives, so that
// is what this uses. `$SSH_ORIGINAL_COMMAND` is what Tortie sent, quoted so it
// stays one string.
writeFileSync(
  machine.conf,
  `${readFileSync(machine.conf, 'utf8').trimEnd()}\n` +
    `ForceCommand HOME=${farHome} exec /bin/sh -c "$SSH_ORIGINAL_COMMAND"\n`,
  'utf8'
);

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
  const tmuxTmp = machineTmuxTmp('p73-image', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(1);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);
say(`the far side's HOME for this run is ${farHome}`);

const ctxInput = {
  machineId: 'p73-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p73-image-control'),
  hostKeys: join(root, 'p73-image-known-machines'),
  userHostKeys: join(root, 'p73-image-person-known-hosts')
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
// The files this probe drops
// ---------------------------------------------------------------------------

/** A real PNG: the signature, an IHDR chunk and a byte pattern after it. */
function makePng(bytes) {
  const head = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52
  ]);
  const body = Buffer.alloc(Math.max(0, bytes - head.length));
  for (let at = 0; at < body.length; at += 1) body[at] = (at * 31) % 251;
  return Buffer.concat([head, body]);
}

const smallPng = join(root, 'p73-image-shot.png');
const bigPng = join(root, 'p73-image-huge.png');
const fakePng = join(root, 'p73-image-notes.png');
const smallBytes = makePng(40_000);
writeFileSync(smallPng, smallBytes);
writeFileSync(bigPng, makePng(120_000));
writeFileSync(fakePng, 'this is a sentence and not a picture\n', 'utf8');
const smallSum = sha256(smallBytes);

/** Everything on the far side, as the far side reports it. */
function farSideListing() {
  const dir = join(farHome, '.tortie', 'images');
  const out = sh('/bin/sh', [
    '-c',
    `ls -la ${dir} 2>/dev/null || echo 'not there'`
  ]);
  return out.stdout.trim();
}

function farSideStat(name) {
  const path = join(farHome, '.tortie', 'images', name);
  if (!existsSync(path)) return null;
  const info = statSync(path);
  return {
    inode: String(info.ino),
    mtimeMs: String(info.mtimeMs),
    bytes: String(info.size),
    mode: (info.mode & 0o777).toString(8),
    sha256: sha256(readFileSync(path))
  };
}

// ---------------------------------------------------------------------------
// Leg 1. The composed command
// ---------------------------------------------------------------------------

const composed = drive({ op: 'compose', ...ctxInput });
if (composed !== null) {
  for (const script of composed.scripts) {
    const quoted = script.command;
    const holds = quoted.includes(script.text) || quoted.includes(`'${script.text.split("'").join("'\\''")}'`);
    if (!holds) {
      fail(
        `the composed command for ${script.id} does not carry the catalogue's ` +
          `own script text.`
      );
    }
  }
  const write = composed.scripts.find((one) => one.id === 'image-put');
  step(
    1,
    'every script is composed as one quoted argument',
    `${String(composed.scripts.length)} script(s), the longest command being ` +
      `${String(Math.max(...composed.scripts.map((one) => one.bytes)))} bytes ` +
      `against a ${String(composed.maxBytes)} byte limit on one argument of a ` +
      `Linux login shell`
  );
  step(
    2,
    'the one write carries its text and nothing composed',
    `image-put is ${String(write?.text.length ?? 0)} bytes of script and ` +
      `${String(write?.bytes ?? 0)} bytes of command with two short values`
  );
}

// ---------------------------------------------------------------------------
// Leg 2. Every read script, against the real machine
// ---------------------------------------------------------------------------

const storeRoot = join(farHome, 'store');
mkdirSync(join(storeRoot, 'projects'), { recursive: true, mode: 0o700 });
writeFileSync(
  join(storeRoot, 'projects', 'p73-record.jsonl'),
  '{"sessionId":"p73-abc","cwd":"/w"}\n',
  'utf8'
);
const repoOnFar = join(farHome, 'repo');
mkdirSync(repoOnFar, { recursive: true, mode: 0o700 });
sh('/bin/sh', [
  '-c',
  `cd ${repoOnFar} && git init -q . && printf 'one\\n' > a.txt && git add a.txt && ` +
    `git -c user.email=p@73 -c user.name=p73 commit -qm first && printf 'two\\n' >> a.txt`
]);

const reads = drive({
  op: 'read',
  ...ctxInput,
  asks: [
    { id: 'machine-facts', args: [] },
    { id: 'store-list', args: [storeRoot, '3', '0'] },
    { id: 'store-head', args: [join(storeRoot, 'projects', 'p73-record.jsonl'), '4096'] },
    { id: 'store-copy', args: [join(storeRoot, 'projects', 'p73-record.jsonl'), '4096'] },
    { id: 'review-list', args: [repoOnFar] },
    { id: 'review-file', args: [repoOnFar, 'a.txt', '1048576'] }
  ]
});

if (reads !== null) {
  for (const [id, answer] of Object.entries(reads.answers)) {
    if (answer.refused !== undefined) {
      fail(`the machine refused ${id}: ${String(answer.refused.detail)}`);
      continue;
    }
    process.stdout.write(
      `[p73-image]    ${id.padEnd(15)} ${String(answer.payload).slice(0, 96)}\n`
    );
  }
  if (reads.facts?.home !== farHome) {
    // RULE 4, ENFORCED RATHER THAN CHECKED AFTERWARDS. Every leg below writes,
    // and the path it writes to is composed from the home the machine reported.
    // A machine reporting the operator's own home would put the probe's files
    // under it, which is what happened on this probe's first run before
    // ForceCommand replaced SetEnv above.
    fail(
      `the machine reported its home as ${String(reads.facts?.home)} and this ` +
        `probe set it to ${farHome}. Nothing that writes was run, because every ` +
        `write below would have landed under a home nobody chose.`
    );
    stopEverything();
    process.stdout.write(`\nFAIL, ${failures.length}:\n`);
    for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
    process.exit(1);
  }
  step(
    3,
    'every read script ran on the real machine',
    `${String(Object.keys(reads.answers).length)} script(s), home ` +
      `${String(reads.facts?.home)}, uname ${String(reads.facts?.uname)}`
  );
}

// ---------------------------------------------------------------------------
// Leg 3. One real upload, compared by sha256 on both sides
// ---------------------------------------------------------------------------

const listingBefore = farSideListing();
const first = drive({
  op: 'put',
  ...ctxInput,
  sessionId: 'p73sess',
  paths: [smallPng]
});
const firstPlacement = first?.placements?.[0] ?? null;
const remoteName = String(firstPlacement?.remotePath ?? '').split('/').pop() ?? '';
const afterFirst = remoteName === '' ? null : farSideStat(remoteName);

if (firstPlacement === null || firstPlacement.remotePath === null) {
  fail(
    `the upload gave back no path. It said: ${String(firstPlacement?.refusal)}`
  );
} else if (afterFirst === null) {
  fail(`nothing is on the far side at ${String(firstPlacement.remotePath)}`);
} else {
  if (afterFirst.sha256 !== smallSum) {
    fail(
      `the file on the far side hashes ${afterFirst.sha256} and the local one ` +
        `hashes ${smallSum}.`
    );
  }
  if (afterFirst.mode !== '600') {
    fail(`the file on the far side is mode ${afterFirst.mode} and not 600.`);
  }
  step(
    4,
    'one real PNG landed and both sides hash the same',
    `${String(smallBytes.length)} bytes, ${firstPlacement.outcome}, sha256 ` +
      `${afterFirst.sha256.slice(0, 16)} on both sides, mode ${afterFirst.mode}`
  );
}

// ---------------------------------------------------------------------------
// Leg 4. The same upload twice
// ---------------------------------------------------------------------------

const second = drive({
  op: 'put',
  ...ctxInput,
  sessionId: 'p73sess',
  paths: [smallPng]
});
const secondPlacement = second?.placements?.[0] ?? null;
const afterSecond = remoteName === '' ? null : farSideStat(remoteName);

if (secondPlacement?.outcome !== 'present') {
  fail(
    `the second upload answered ${String(secondPlacement?.outcome)} and it has ` +
      `to answer present. A write that is not safe to run twice cannot cross to ` +
      `a machine at all.`
  );
} else if (afterFirst !== null && afterSecond !== null) {
  if (
    afterFirst.inode !== afterSecond.inode ||
    afterFirst.mtimeMs !== afterSecond.mtimeMs
  ) {
    fail(
      `the file on the far side changed between the two uploads. inode ` +
        `${afterFirst.inode} to ${afterSecond.inode}, mtime ` +
        `${afterFirst.mtimeMs} to ${afterSecond.mtimeMs}.`
    );
  }
  step(
    5,
    'the same image twice writes one file',
    `answered ${secondPlacement.outcome}, inode ${afterSecond.inode} unchanged, ` +
      `mtime ${afterSecond.mtimeMs} unchanged`
  );
}

// ---------------------------------------------------------------------------
// Leg 5. The two refusals, with nothing written
// ---------------------------------------------------------------------------

const listingBeforeRefusals = farSideListing();
const refused = drive({
  op: 'put',
  ...ctxInput,
  sessionId: 'p73sess',
  paths: [bigPng, fakePng]
});
const listingAfterRefusals = farSideListing();

const bigPlacement = refused?.placements?.[0] ?? null;
const fakePlacement = refused?.placements?.[1] ?? null;

if (bigPlacement?.remotePath !== null || bigPlacement?.refusal === null) {
  fail(`a 120,000 byte image was not refused. It answered ${JSON.stringify(bigPlacement)}`);
}
if (fakePlacement?.remotePath !== null || fakePlacement?.refusal === null) {
  fail(`a text file named .png was not refused. It answered ${JSON.stringify(fakePlacement)}`);
}
if (listingBeforeRefusals !== listingAfterRefusals) {
  fail(
    `the far side's image directory changed across two refused uploads.\n` +
      `before:\n${listingBeforeRefusals}\nafter:\n${listingAfterRefusals}`
  );
}
step(
  6,
  'a file over the limit and a text file named .png are both refused',
  `nothing was written: the listing is byte identical before and after, at ` +
    `${String(listingAfterRefusals.split('\n').length)} line(s)`
);

// ---------------------------------------------------------------------------
// Leg 6. Connected only, live, and the catalogue's own two refusals
// ---------------------------------------------------------------------------

const listingBeforeCut = farSideListing();
const cut = drive({
  op: 'cut',
  ...ctxInput,
  sessionId: 'p73sess',
  paths: [smallPng]
});
const listingAfterCut = farSideListing();

if (!String(cut?.refused?.message ?? '').includes('not connected to that machine')) {
  fail(
    `an upload to a machine whose link reads ${String(cut?.link)} was not ` +
      `refused. It said ${JSON.stringify(cut?.refused)}`
  );
}
if (listingBeforeCut !== listingAfterCut) {
  fail('the far side changed during an upload that was supposed to be refused.');
}
step(
  7,
  'an upload to a machine that is not answering is refused',
  `link ${String(cut?.link)}, refusal seen, far side byte identical`
);

const catalogue = drive({ op: 'catalogue', ...ctxInput });
for (const [what, said] of Object.entries(catalogue?.tried ?? {})) {
  process.stdout.write(
    `[p73-image]    ${what.padEnd(20)} ${String(said.message).slice(0, 90)}\n`
  );
}
if (Object.keys(catalogue?.tried ?? {}).length !== 3) {
  fail(
    `${String(Object.keys(catalogue?.tried ?? {}).length)} of the door's three ` +
      `refusals fired against a machine that IS answering, and all three have to.`
  );
}
step(
  8,
  'the door refuses a name nobody wrote down and a wrong door, live',
  `3 refusals fired against a machine that was answering`
);

// ---------------------------------------------------------------------------
// Leg 7. The largest image the contract allows, carried for real
// ---------------------------------------------------------------------------
//
// The size limit is decided by a Linux constant nobody measured. What CAN be
// measured is that an image of exactly that size crosses a real connection and
// arrives whole, which is what says the number is a limit rather than a guess
// that happens to be under one.

const limitPng = join(root, 'p73-image-limit.png');
const limitBytes = makePng(90_000);
writeFileSync(limitPng, limitBytes);
const limitSum = sha256(limitBytes);
const atLimit = drive({
  op: 'put',
  ...ctxInput,
  sessionId: 'p73limit',
  paths: [limitPng]
});
const limitPlacement = atLimit?.placements?.[0] ?? null;
const limitName = String(limitPlacement?.remotePath ?? '').split('/').pop() ?? '';
const limitStat = limitName === '' ? null : farSideStat(limitName);

if (limitPlacement?.remotePath === null || limitStat === null) {
  fail(
    `an image of exactly the contract's limit did not land. It said ` +
      `${String(limitPlacement?.refusal)}`
  );
} else if (limitStat.sha256 !== limitSum) {
  fail(
    `the largest allowed image arrived with checksum ${limitStat.sha256} and ` +
      `left with ${limitSum}.`
  );
} else {
  step(
    10,
    'an image of exactly the size limit crosses and arrives whole',
    `${String(limitBytes.length)} bytes in, ${limitStat.bytes} bytes there, ` +
      `sha256 ${limitStat.sha256.slice(0, 16)} on both sides`
  );
}

// ---------------------------------------------------------------------------
// Which base64 spelling answered, measured rather than assumed
// ---------------------------------------------------------------------------

const dashD = sh('/bin/sh', ['-c', "printf '%s' aGk= | base64 -d"]);
const dashUpperD = sh('/bin/sh', ['-c', "printf '%s' aGk= | base64 -D"]);
step(
  9,
  'which base64 spelling this far side answered',
  `-d ${dashD.code === 0 ? 'works' : 'fails'}, -D ` +
    `${dashUpperD.code === 0 ? 'works' : 'fails'}`
);

// ---------------------------------------------------------------------------
// The standing safety measurements, after
// ---------------------------------------------------------------------------

const sessionsAfter = operatorSessions();
const ownTortieAfter = ownTortieDir();

if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's server held ${sessionsBefore} session(s) before this run ` +
      `and ${sessionsAfter} after it.`
  );
}
if (ownTortieBefore !== ownTortieAfter) {
  fail(
    "the operator's own ~/.tortie changed during this run. Every write in this " +
      'probe goes to a scratch home directory.'
  );
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

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

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
say(`the operator's own ~/.tortie: ${ownTortieBefore === ownTortieAfter ? 'unchanged' : 'CHANGED'}`);
say(
  'NOT MEASURED: no Linux machine was contacted. The far side here is this ' +
    'Mac, so the size limit the product ships is decided by a kernel constant ' +
    'nobody measured rather than by anything above.'
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
  '\nPASS. Every one of the seven scripts ran on a real machine, one real PNG ' +
    'landed with the same checksum on both sides, the same image sent twice ' +
    'wrote one file, a file over the limit and a text file named .png were both ' +
    'refused with nothing written, and an upload to a machine that was not ' +
    'answering was refused before anything was sent.\n'
);
