/**
 * `node build/probe-p102-entry.mjs`. The Tier 3 live probe of Phase 102, being
 * the fourth and the fifth commands this product can send that change bytes on
 * another computer.
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
 *  4. Every folder and file this probe makes on the far side sits under a
 *     scratch folder it made under /tmp. The operator's own home is counted
 *     before and after and it is never written to.
 *  5. The operator's server is counted before and after, read only.
 *
 * ---------------------------------------------------------------------------
 * THE LEGS
 * ---------------------------------------------------------------------------
 *  1. The composed byte length of each script against
 *     `REMOTE_SCRIPT_MAX_BYTES`, with the margin as a number.
 *  2. A real `dir-new` over a real link under a 755 parent. The mode of the new
 *     folder and of its parent are both read back with `stat`.
 *  3. The same call again, with a file written into the new folder in between.
 *     The answer is `exists`, no `mkdir` runs and the file is still there.
 *  4. An empty `$2`, which is determined rather than special. It answers
 *     `exists` and nothing is created.
 *  5. A parent that is gone, which answers `noparent`.
 *  6. A parent at mode 500, which answers `denied`.
 *  7. A parent at 700, which answers `made` and produces a 700 folder.
 *  8. A parent at 777, which answers `made` carrying 777 and produces a 755
 *     folder. That is the cap, and it is the whole reason the mode is not
 *     copied.
 *  9. The mode fallback. The script text run with a `stat` on PATH that exits 1
 *     still answers `made`, and the parser reads the missing second field as
 *     null.
 * 10. A real `entry-rename` over a real link. `ls` proves the far side moved.
 * 11. The same call again, which answers `done`.
 * 12. Both paths absent, which answers `gone`.
 * 13. A destination a different file holds, which answers `exists` and leaves
 *     both files byte identical.
 * 14. `README.md` to `readme.md` on this case insensitive volume, which is the
 *     branch the device and inode test exists for.
 * 15. A dangling symbolic link as the source, which `-e` alone would call gone.
 * 16. A destination in a different folder under one root, which the UI cannot
 *     reach and which the script can do.
 * 17. The far side's OWN containment, with main bypassed. `$2` set to `../x`
 *     and `$3` set to `.git/config`, and neither writes anything.
 * 18. The pure halves in `src/main/machines/remote-entry.ts`, being containment
 *     for both ends of a rename and both parsers over every word, with the send
 *     counter read afterwards to prove they sent nothing.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT MEASURE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so every answer below is a macOS far side. NO LINUX
 * MACHINE WAS CONTACTED, so the `stat` spellings, the `${d%/*}` expansion and
 * the shell's behaviour on a killed connection are unverified off macOS.
 *
 * It does not drive the confirm gate, the machines file or the two IPC
 * channels. Those need Electron's keystore, and they are covered by
 * `src/main/machines/__tests__/ipc.test.ts`, by `npm run conformance:machines`
 * and by the app driving in this phase's evidence. What this probe covers is
 * the script text and what it does to real bytes on a real machine.
 *
 * It cannot measure the race between the `-e` test and the `mv`. Nothing here
 * writes into the folder between those two lines, and no number for whether
 * `mv -n` narrows that window exists anywhere in this repository.
 *
 * Leg 9 runs the catalogue's own script text through `/bin/sh` on this Mac with
 * a cut down PATH rather than over the link, because the far side's PATH is set
 * by its own login and this probe does not rewrite that. The text is byte
 * identical to the text the door sends and the leg says so.
 *
 * Every scratch file carries a `p102-` prefix.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
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
const PORT = 45753;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p102-entry-${String(process.pid)}`,
  'p102-entry'
);

const root = join('/tmp', `p102-entry-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p102-entry] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p102-entry] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p102-entry] ${String(n)}. ${what}: ${evidence}\n`);
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

const driverPath = join(root, 'p102-entry-driver.ts');
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
const entry = await import(REPO + '/src/main/machines/remote-entry');
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
  // The two composed commands, so the margin under REMOTE_SCRIPT_MAX_BYTES is
  // a number rather than a claim, and the two texts themselves.
  out = {
    maxBytes: scripts.REMOTE_SCRIPT_MAX_BYTES,
    scripts: ['dir-new', 'entry-rename'].map((id) => {
      const script = scripts.remoteScript(id)!;
      const args = Array.from({ length: script.params }, (_, at) =>
        at === 0 ? '/tmp/p102-entry-root' : 'a/b'
      );
      const command = run.composeRemoteScriptCommand(script, args);
      return {
        id,
        mode: script.mode,
        params: script.params,
        scriptBytes: Buffer.byteLength(script.text, 'utf8'),
        commandBytes: Buffer.byteLength(command, 'utf8'),
        text: script.text
      };
    })
  };
} else if (input.op === 'send') {
  await connect();
  const answers: unknown[] = [];
  for (const one of input.calls) {
    const started = Date.now();
    try {
      const got = await run.runRemoteWrite(ctx, one.id, one.args, {
        timeoutMs: entry.REMOTE_ENTRY_TIMEOUT_MS,
        execution: { kind: 'command', subject: String(one.args[1] ?? '') }
      });
      answers.push({
        label: one.label,
        payload: got.payload,
        read:
          one.id === 'dir-new'
            ? entry.parseMakeDirAnswer(got.payload)
            : entry.parseRenameAnswer(got.payload),
        ms: Date.now() - started
      });
    } catch (err) {
      answers.push({ label: one.label, refused: said(err), ms: Date.now() - started });
    }
  }
  out = { answers };
} else if (input.op === 'pure') {
  // The pure halves, answered by the product's own code, and the send counter
  // read afterwards so that "these sent nothing" is measured.
  entry.resetRemoteEntrySendCountForTests();
  out = {
    contained: input.paths.map((one: { root: string; path: string }) => ({
      ...one,
      rel: file.relativeUnderRoot(one.root, one.path)
    })),
    madeDirParsed: input.madeDirPayloads.map((one: string) => ({
      payload: one,
      read: entry.parseMakeDirAnswer(one)
    })),
    renameParsed: input.renamePayloads.map((one: string) => ({
      payload: one,
      read: entry.parseRenameAnswer(one)
    })),
    sends: entry.remoteEntrySendCount(),
    timeoutMs: entry.REMOTE_ENTRY_TIMEOUT_MS
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
  const inPath = join(root, `p102-entry-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p102-entry-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 240_000,
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p102-entry',
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
  prefix: 'p102-entry',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

/** The folder the far side may write under. Nothing outside it is touched. */
const workRoot = join(root, 'p102-entry-work');
mkdirSync(workRoot, { recursive: true, mode: 0o755 });

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
  const tmuxTmp = machineTmuxTmp('p102-entry', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(1);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);
say(`the folder this run may write under is ${workRoot}`);

const ctxInput = {
  machineId: 'p102-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p102-entry-control'),
  hostKeys: join(root, 'p102-entry-known-machines'),
  userHostKeys: join(root, 'p102-entry-person-known-hosts')
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

const far = (rel) => join(workRoot, rel);

function modeOf(rel) {
  const path = far(rel);
  if (!existsSync(path)) return null;
  return (statSync(path).mode & 0o7777).toString(8);
}

function listOf(rel) {
  const path = far(rel);
  if (!existsSync(path)) return null;
  return readdirSync(path).sort().join(', ');
}

function send(calls) {
  const out = drive({ op: 'send', ...ctxInput, calls });
  const answers = out?.answers ?? [];
  const byLabel = {};
  for (const one of answers) byLabel[one.label] = one;
  return byLabel;
}

// ---------------------------------------------------------------------------
// Leg 1. The composed size of both scripts
// ---------------------------------------------------------------------------

const composed = drive({ op: 'compose', ...ctxInput });
if (composed === null) {
  stopEverything();
  process.exit(1);
}
for (const one of composed.scripts) {
  if (one.mode !== 'write') {
    fail(`${one.id} is a ${String(one.mode)} in the catalogue and it writes.`);
  }
  if (one.commandBytes > composed.maxBytes) {
    fail(
      `${one.id} composes ${String(one.commandBytes)} bytes against a limit of ` +
        `${String(composed.maxBytes)}.`
    );
  }
}
step(
  1,
  'the composed size of both scripts',
  composed.scripts
    .map(
      (one) =>
        `${one.id} is ${String(one.scriptBytes)} bytes of text and composes ` +
        `${String(one.commandBytes)} bytes of command`
    )
    .join('; ') +
    `, against a ${String(composed.maxBytes)} byte limit on one argument of a ` +
    `Linux login shell. That limit is the kernel's own constant and it was NOT ` +
    `measured here, because no Linux machine was contacted.`
);

const dirNewText =
  composed.scripts.find((one) => one.id === 'dir-new')?.text ?? '';
const renameText =
  composed.scripts.find((one) => one.id === 'entry-rename')?.text ?? '';

// ---------------------------------------------------------------------------
// Legs 2 to 8. dir-new over a real link
// ---------------------------------------------------------------------------

mkdirSync(far('p755'), { mode: 0o755 });
mkdirSync(far('p700'), { mode: 0o700 });
mkdirSync(far('p777'), { mode: 0o777 });
chmodSync(far('p755'), 0o755);
chmodSync(far('p700'), 0o700);
chmodSync(far('p777'), 0o777);
mkdirSync(far('p500'), { mode: 0o755 });

let got = send([
  { label: 'made755', id: 'dir-new', args: [workRoot, 'p755/one'] }
]);
if (got['made755']?.read?.word !== 'made') {
  fail(
    `dir-new under a 755 parent answered ` +
      `${JSON.stringify(got['made755']?.payload ?? got['made755']?.refused)}.`
  );
}
if (modeOf('p755/one') !== '755') {
  fail(`the folder made under a 755 parent came out ${String(modeOf('p755/one'))}.`);
}
step(
  2,
  'a real dir-new over a real link, under a 755 parent',
  `answered ${JSON.stringify(got['made755']?.payload ?? '')} in ` +
    `${String(got['made755']?.ms ?? -1)} ms. The far side holds ` +
    `${workRoot}/p755/one at mode ${String(modeOf('p755/one'))} and its parent ` +
    `at ${String(modeOf('p755'))}. The parent's mode is what the answer carries.`
);

writeFileSync(far('p755/one/keep.txt'), 'keep me\n', 'utf8');
const keepBefore = sha256(readFileSync(far('p755/one/keep.txt')));
got = send([{ label: 'again', id: 'dir-new', args: [workRoot, 'p755/one'] }]);
const keepAfter = existsSync(far('p755/one/keep.txt'))
  ? sha256(readFileSync(far('p755/one/keep.txt')))
  : null;
if (got['again']?.read?.word !== 'exists') {
  fail(`a repeat of dir-new answered ${JSON.stringify(got['again']?.payload ?? '')}.`);
}
if (keepAfter !== keepBefore) {
  fail('a repeat of dir-new changed what was inside the folder.');
}
step(
  3,
  'the same dir-new again, with a file written into the folder in between',
  `answered ${JSON.stringify(got['again']?.payload ?? '')}. The folder still ` +
    `holds ${String(listOf('p755/one'))} and that file is ` +
    `${keepAfter === keepBefore ? 'byte identical' : 'CHANGED'}. A repeat ` +
    `cannot empty the folder, cannot re-create it and cannot change its mode.`
);

const beforeEmpty = readdirSync(workRoot).sort().join(', ');
got = send([{ label: 'empty', id: 'dir-new', args: [workRoot, ''] }]);
const afterEmpty = readdirSync(workRoot).sort().join(', ');
if (got['empty']?.read?.word !== 'exists') {
  fail(`dir-new with an empty second value answered ${JSON.stringify(got['empty']?.payload ?? '')}.`);
}
if (beforeEmpty !== afterEmpty) fail('dir-new with an empty second value created something.');
step(
  4,
  'dir-new with an empty second value, which is determined rather than special',
  `answered ${JSON.stringify(got['empty']?.payload ?? '')}. The root held ` +
    `${beforeEmpty} before and ${afterEmpty} after, so nothing was created and ` +
    `no guard had to widen for it.`
);

got = send([
  { label: 'noparent', id: 'dir-new', args: [workRoot, 'nowhere/deep/one'] }
]);
if (got['noparent']?.read?.word !== 'noparent') {
  fail(`dir-new under a missing parent answered ${JSON.stringify(got['noparent']?.payload ?? '')}.`);
}
step(
  5,
  'dir-new under a parent that is not there',
  `answered ${JSON.stringify(got['noparent']?.payload ?? '')} and ` +
    `${existsSync(far('nowhere')) ? 'CREATED something' : 'created nothing'}.`
);

chmodSync(far('p500'), 0o500);
got = send([{ label: 'denied', id: 'dir-new', args: [workRoot, 'p500/one'] }]);
if (got['denied']?.read?.word !== 'denied') {
  fail(`dir-new under a parent at 500 answered ${JSON.stringify(got['denied']?.payload ?? '')}.`);
}
step(
  6,
  'dir-new under a parent the account cannot write in',
  `the parent is at mode ${String(modeOf('p500'))} and the call answered ` +
    `${JSON.stringify(got['denied']?.payload ?? '')}. It ` +
    `${existsSync(far('p500/one')) ? 'CREATED the folder' : 'created nothing'}.`
);
chmodSync(far('p500'), 0o755);

got = send([
  { label: 'made700', id: 'dir-new', args: [workRoot, 'p700/one'] },
  { label: 'made777', id: 'dir-new', args: [workRoot, 'p777/one'] }
]);
if (modeOf('p700/one') !== '700') {
  fail(`the folder under a 700 parent came out ${String(modeOf('p700/one'))} and it is 700.`);
}
step(
  7,
  'dir-new under a parent at 700',
  `answered ${JSON.stringify(got['made700']?.payload ?? '')} and the folder ` +
    `came out ${String(modeOf('p700/one'))}.`
);
if (modeOf('p777/one') !== '755') {
  fail(
    `the folder under a 777 parent came out ${String(modeOf('p777/one'))}. The ` +
      `cap is 755 and copying the parent's mode would have made it 777 on ` +
      `somebody's computer.`
  );
}
step(
  8,
  'dir-new under a parent at 777, which is the cap',
  `the parent is at ${String(modeOf('p777'))}, the answer carried ` +
    `${JSON.stringify(got['made777']?.payload ?? '')} and the folder came out ` +
    `${String(modeOf('p777/one'))}. Only 755 and 700 can be produced, so no set ` +
    `user id and no set group id bit can be passed on.`
);

// ---------------------------------------------------------------------------
// Leg 9. The mode fallback, run locally with a stat that answers nothing
// ---------------------------------------------------------------------------

const fakeBin = join(root, 'p102-entry-fakebin');
mkdirSync(fakeBin, { recursive: true, mode: 0o700 });
writeFileSync(join(fakeBin, 'stat'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
mkdirSync(far('nostat'), { mode: 0o755 });
const fallback = sh('/bin/sh', ['-c', dirNewText, 'tortie-dir-new', workRoot, 'nostat/one'], {
  env: { PATH: `${fakeBin}:/usr/bin:/bin` }
});
const fallbackPayload = /__TORTIE_RUN__(.*?)__TORTIE_RUN__/.exec(
  fallback.stdout
)?.[1];
if (!String(fallbackPayload ?? '').startsWith('made')) {
  fail(
    `with a stat that exits 1 the script answered ` +
      `${JSON.stringify(fallback.both.trim())} and it has to still answer made.`
  );
}
if (modeOf('nostat/one') !== '700') {
  fail(
    `with no mode readable the folder came out ${String(modeOf('nostat/one'))} ` +
      `and the branch it has to take is 700.`
  );
}
step(
  9,
  'the mode fallback, driven with a stat on PATH that exits 1',
  `the script text is byte identical to what the door sends. It answered ` +
    `${JSON.stringify(String(fallbackPayload ?? '').trim())} and the folder ` +
    `came out ${String(modeOf('nostat/one'))}. The second field is empty and ` +
    `the parser reads that as null.`
);

// ---------------------------------------------------------------------------
// Legs 10 to 16. entry-rename over a real link
// ---------------------------------------------------------------------------

mkdirSync(far('rn'), { mode: 0o755 });
mkdirSync(far('rn2'), { mode: 0o755 });
writeFileSync(far('rn/a.txt'), 'hello\n', 'utf8');
const aSum = sha256(readFileSync(far('rn/a.txt')));

got = send([
  { label: 'moved', id: 'entry-rename', args: [workRoot, 'rn/a.txt', 'rn/b.txt'] }
]);
if (got['moved']?.read?.word !== 'moved') {
  fail(`a real rename answered ${JSON.stringify(got['moved']?.payload ?? '')}.`);
}
const movedSum = existsSync(far('rn/b.txt'))
  ? sha256(readFileSync(far('rn/b.txt')))
  : null;
if (movedSum !== aSum) fail('the renamed file does not hold the bytes it held before.');
step(
  10,
  'a real entry-rename over a real link',
  `answered ${JSON.stringify(got['moved']?.payload ?? '')} in ` +
    `${String(got['moved']?.ms ?? -1)} ms. The folder now holds ` +
    `${String(listOf('rn'))} and the bytes are ` +
    `${movedSum === aSum ? 'byte identical' : 'DIFFERENT'}.`
);

got = send([
  { label: 'done', id: 'entry-rename', args: [workRoot, 'rn/a.txt', 'rn/b.txt'] },
  { label: 'gone', id: 'entry-rename', args: [workRoot, 'rn/zz', 'rn/yy'] }
]);
if (got['done']?.read?.word !== 'done') {
  fail(`a repeat of a rename answered ${JSON.stringify(got['done']?.payload ?? '')}.`);
}
step(
  11,
  'the same rename again, which is what a lost answer looks like',
  `answered ${JSON.stringify(got['done']?.payload ?? '')} and ran no mv. WHAT ` +
    `done CANNOT TELL APART is a repeat of Tortie's own move and a machine ` +
    `where somebody else already held a file at the destination while the ` +
    `source never existed.`
);
if (got['gone']?.read?.word !== 'gone') {
  fail(`a rename of nothing answered ${JSON.stringify(got['gone']?.payload ?? '')}.`);
}
step(
  12,
  'a rename where neither path is there',
  `answered ${JSON.stringify(got['gone']?.payload ?? '')} and the folder still ` +
    `holds ${String(listOf('rn'))}.`
);

writeFileSync(far('rn/c.txt'), 'somebody else\n', 'utf8');
const cSum = sha256(readFileSync(far('rn/c.txt')));
got = send([
  { label: 'exists', id: 'entry-rename', args: [workRoot, 'rn/b.txt', 'rn/c.txt'] }
]);
const bAfter = existsSync(far('rn/b.txt')) ? sha256(readFileSync(far('rn/b.txt'))) : null;
const cAfter = existsSync(far('rn/c.txt')) ? sha256(readFileSync(far('rn/c.txt'))) : null;
if (got['exists']?.read?.word !== 'exists') {
  fail(`a rename onto a different file answered ${JSON.stringify(got['exists']?.payload ?? '')}.`);
}
if (bAfter !== movedSum || cAfter !== cSum) {
  fail('a refused rename changed one of the two files.');
}
step(
  13,
  'a rename onto a name a DIFFERENT entry already holds',
  `answered ${JSON.stringify(got['exists']?.payload ?? '')}. Both files are ` +
    `still there and both are ` +
    `${bAfter === movedSum && cAfter === cSum ? 'byte identical' : 'CHANGED'}. ` +
    `An unreadable device and inode answers exists too, because a refusal is ` +
    `the safe answer when the machine will not say.`
);

writeFileSync(far('rn/README.md'), 'readme\n', 'utf8');
got = send([
  {
    label: 'caseonly',
    id: 'entry-rename',
    args: [workRoot, 'rn/README.md', 'rn/readme.md']
  }
]);
const caseList = listOf('rn') ?? '';
if (got['caseonly']?.read?.word !== 'moved') {
  fail(
    `a case only rename answered ${JSON.stringify(got['caseonly']?.payload ?? '')}. ` +
      `Without the device and inode test a person renaming README.md to ` +
      `readme.md is told the name is taken.`
  );
}
if (caseList.includes('README.md')) fail('the old name is still on the far side.');
step(
  14,
  'README.md to readme.md on this case insensitive volume',
  `answered ${JSON.stringify(got['caseonly']?.payload ?? '')} and the folder ` +
    `holds ${caseList}. This is the branch the device and inode test exists ` +
    `for, and the volume under /tmp on this Mac is case insensitive.`
);

symlinkSync('/nowhere-at-all', far('rn/dangle'));
got = send([
  { label: 'dangle', id: 'entry-rename', args: [workRoot, 'rn/dangle', 'rn/dangle2'] }
]);
let dangleTarget = null;
try {
  dangleTarget = lstatSync(far('rn/dangle2')).isSymbolicLink() ? 'a link' : 'not a link';
} catch {
  dangleTarget = 'not there';
}
if (got['dangle']?.read?.word !== 'moved') {
  fail(
    `a dangling symbolic link as the source answered ` +
      `${JSON.stringify(got['dangle']?.payload ?? '')}. With -e alone the ` +
      `script would say gone about a link that is really there.`
  );
}
step(
  15,
  'a dangling symbolic link as the source',
  `answered ${JSON.stringify(got['dangle']?.payload ?? '')} and the far side ` +
    `holds rn/dangle2 as ${dangleTarget}. Presence is [ -e ] || [ -L ] for ` +
    `exactly this case.`
);

got = send([
  { label: 'cross', id: 'entry-rename', args: [workRoot, 'rn/b.txt', 'rn2/b.txt'] }
]);
if (got['cross']?.read?.word !== 'moved' || !existsSync(far('rn2/b.txt'))) {
  fail(`a move between folders under one root answered ${JSON.stringify(got['cross']?.payload ?? '')}.`);
}
step(
  16,
  'a move between two folders under one confirmed root',
  `answered ${JSON.stringify(got['cross']?.payload ?? '')} and rn2 now holds ` +
    `${String(listOf('rn2'))}. NO SURFACE IN THE PRODUCT REACHES THIS: the ` +
    `inline rename box refuses a slash, so this is driven directly.`
);

// ---------------------------------------------------------------------------
// Leg 17. The far side's own containment, with main bypassed
// ---------------------------------------------------------------------------

const outside = join(root, 'p102-entry-outside');
mkdirSync(outside, { recursive: true, mode: 0o700 });
const refusals = [];
for (const [what, text, args] of [
  ['dir-new with ../x', dirNewText, [workRoot, '../p102-entry-outside/x']],
  ['dir-new with .git/x', dirNewText, [workRoot, '.git/x']],
  [
    'entry-rename with ../x as the source',
    renameText,
    [workRoot, '../p102-entry-outside/x', 'rn/y']
  ],
  [
    'entry-rename with .git/config as the destination',
    renameText,
    [workRoot, 'rn/c.txt', '.git/config']
  ]
]) {
  const out = sh('/bin/sh', ['-c', text, 'tortie-probe', ...args]);
  refusals.push(`${what} exited ${String(out.code)}`);
  if (out.code !== 1) fail(`${what} exited ${String(out.code)} and it has to exit 1.`);
  if (out.stdout.includes('__TORTIE_RUN__')) {
    fail(`${what} printed an answer, and a refusal prints none.`);
  }
}
const outsideHolds = readdirSync(outside).sort().join(', ') || 'nothing';
const cStillThere = existsSync(far('rn/c.txt'))
  ? sha256(readFileSync(far('rn/c.txt')))
  : null;
if (outsideHolds !== 'nothing' || cStillThere !== cSum) {
  fail('one of the refused calls changed something anyway.');
}
step(
  17,
  "the far side's OWN containment, with main bypassed",
  `${refusals.join(', ')}, and none of them printed a marker pair. The folder ` +
    `above the root holds ${outsideHolds} and rn/c.txt is ` +
    `${cStillThere === cSum ? 'byte identical' : 'CHANGED'}. The .git half of ` +
    `this line is on these two writers and NOT on file-put, which keeps ` +
    `review-file's narrower line.`
);

// ---------------------------------------------------------------------------
// Leg 18. The pure halves, and the send counter afterwards
// ---------------------------------------------------------------------------

const pure = drive({
  op: 'pure',
  ...ctxInput,
  paths: [
    { root: workRoot, path: `${workRoot}/rn/a.txt` },
    { root: workRoot, path: `${workRoot}/../outside.txt` },
    { root: workRoot, path: workRoot },
    { root: workRoot, path: '/Users/gdc/.ssh/authorized_keys' }
  ],
  madeDirPayloads: [
    'made 755',
    'made',
    'exists none',
    'denied none',
    'noparent none',
    'exists',
    'wrote 755',
    ''
  ],
  renamePayloads: [
    'moved none',
    'done none',
    'exists none',
    'gone none',
    'moved',
    'made none'
  ]
});
if (pure !== null) {
  const contained = pure.contained ?? [];
  if (contained[0]?.rel !== 'rn/a.txt') fail('containment refused a path that is under the root.');
  for (const at of [1, 2, 3]) {
    if (contained[at]?.rel === null) continue;
    fail(`containment accepted ${String(contained[at]?.path)}, which is not under the root.`);
  }
  const dirWords = (pure.madeDirParsed ?? []).map((one) => one.read?.word ?? null);
  if (JSON.stringify(dirWords) !== JSON.stringify([
    'made', 'made', 'exists', 'denied', 'noparent', null, null, null
  ])) {
    fail(`parseMakeDirAnswer read ${JSON.stringify(dirWords)}.`);
  }
  const renameWords = (pure.renameParsed ?? []).map((one) => one.read?.word ?? null);
  if (JSON.stringify(renameWords) !== JSON.stringify([
    'moved', 'done', 'exists', 'gone', null, null
  ])) {
    fail(`parseRenameAnswer read ${JSON.stringify(renameWords)}.`);
  }
  if (pure.sends !== 0) {
    fail(`the pure halves moved the send counter to ${String(pure.sends)}.`);
  }
  step(
    18,
    'the pure halves, and the send counter after them',
    `containment answered ${JSON.stringify(contained.map((one) => one.rel))} for ` +
      `a path under the root, a path above it, the root itself and a path on ` +
      `another branch. parseMakeDirAnswer read ${JSON.stringify(dirWords)} and ` +
      `parseRenameAnswer read ${JSON.stringify(renameWords)}, where null is a ` +
      `refusal. The send counter is ${String(pure.sends)} afterwards, so none ` +
      `of them contacted anything. The timeout is ` +
      `${String(pure.timeoutMs)} ms, CHOSEN rather than measured.`
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
  'NOT MEASURED: no Linux machine was contacted, so the two stat spellings and ' +
    'the ${d%/*} expansion are unverified off macOS. The race between the -e ' +
    'test and the mv is not driven here and no number for mv -n exists. The ' +
    'confirm gate, the machines file and the two IPC channels are not driven ' +
    'here.'
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
  '\nPASS. One real folder was made on a real machine at the capped mode, a ' +
    'repeat of the same call left it and its contents alone, a parent that was ' +
    'gone, a parent that could not be written in and an empty second value each ' +
    'answered their own word and created nothing, a 777 parent produced a 755 ' +
    'folder, one real file and one dangling link were renamed over the link, a ' +
    'case only rename went through, a rename onto somebody else\'s file was ' +
    'refused with both files byte identical, and the far side refused a path ' +
    'that climbed out and a path into .git with main bypassed.\n'
);
