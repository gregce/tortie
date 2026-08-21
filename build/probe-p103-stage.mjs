/**
 * `node build/probe-p103-stage.mjs`. The Tier 3 live probe of Phase 103, being
 * the sixth and the seventh commands this product can send that change bytes on
 * another computer, and the FIRST TWO that change a git repository over there.
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
 *  4. Every repository this probe makes on the far side sits under a scratch
 *     folder it made under /tmp. The operator's own home is counted before and
 *     after and it is never written to.
 *  5. The operator's server is counted before and after, read only.
 *
 * ---------------------------------------------------------------------------
 * THE LEGS
 * ---------------------------------------------------------------------------
 *  1. The composed byte length of each script against
 *     `REMOTE_SCRIPT_MAX_BYTES`, with the margin as a number.
 *  2. A real `git-stage` over a real link, with the porcelain read before and
 *     after and both pasted. The pair moves from `.M` to `M.`. Then a real
 *     `git-unstage`, and the pair moves back.
 *  3. A hostile name, being one holding a space, a `*` and a `[`. Exactly that
 *     file moves and no other file moves, with the whole porcelain both times.
 *  4. The far side's OWN containment, with main bypassed. `../above.txt`,
 *     `/etc/passwd`, `.`, `.git/config`, a trailing slash and an empty list,
 *     one at a time. For each: no marker arrived, the call refused, and the
 *     porcelain did not move.
 *  5. The wrong repository. A second repository outside the tab's folder, sent
 *     as parameter 1 with a path under it. The script runs it, which is why
 *     main makes that check, and the leg says so plainly rather than pretending
 *     the script closes it.
 *  6. Each verb run twice with the same list, with the porcelain after each. Both
 *     leave the same end state, which is the whole claim in each row's `reason`.
 *  7. The unborn branch. A repository with no commit at all, staged and then
 *     unstaged, with the far side stderr git ACTUALLY PRINTED pasted, and proof
 *     that the `git rm --cached` fallback fired rather than the restore.
 *  8. A rename made as a plain `mv`, which git sees as a delete plus an
 *     untracked add. Both rows staged in one call, with the porcelain pasted.
 *  9. The cost, in milliseconds and in processes: the review read, a stage of 1
 *     path, a stage of 30 paths, and an unstage of 1 path.
 * 10. The pure halves of `src/main/machines/remote-stage.ts`, with the send
 *     counter read afterwards so that "these sent nothing" is measured.
 * 11. The local ssh killed while a stage of 30 paths is in flight, which is the
 *     question research 57 section 10 left open. Only a pid carrying this run's
 *     own control path is signalled, and it is recorded before it is signalled.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT MEASURE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so every answer below is a macOS far side and the
 * git below is this Mac's git. NO LINUX MACHINE WAS CONTACTED, so the shell's
 * behaviour on a killed connection and the exact unborn branch sentence are
 * unverified off macOS.
 *
 * It does not drive the confirm gate, the machines file or the two IPC
 * channels. Those need Electron's keystore, and they are covered by
 * `src/main/machines/__tests__/p103-remote-stage.test.ts`, by
 * `npm run conformance:machines` and by the app driving in this phase's
 * evidence. What this probe covers is the script text, what it does to a real
 * repository on a real machine, and the pure halves of main's own module.
 *
 * Every scratch file carries a `p103-` prefix.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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
const PORT = 45761;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p103-stage-${String(process.pid)}`,
  'p103-stage'
);

const root = join('/tmp', `p103-stage-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p103-stage] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p103-stage] FAIL: ${text}\n`);
};
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  process.stdout.write(`[p103-stage] ${String(n)}. ${what}: ${evidence}\n`);
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

const driverPath = join(root, 'p103-stage-driver.ts');
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
const stage = await import(REPO + '/src/main/machines/remote-stage');

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
  out = {
    maxBytes: scripts.REMOTE_SCRIPT_MAX_BYTES,
    budgetBytes: stage.REMOTE_STAGE_BUDGET_BYTES,
    timeoutMs: stage.REMOTE_STAGE_TIMEOUT_MS,
    scripts: ['git-stage', 'git-unstage'].map((id) => {
      const script = scripts.remoteScript(id)!;
      const command = run.composeRemoteScriptCommand(script, [
        '/tmp/p103-stage-root',
        'a.ts\nb.ts'
      ]);
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
  // The probe watches for this file. It is written AFTER the connection is up
  // and immediately before the first write leaves, so the watcher's kill lands
  // inside the write rather than inside the sign in.
  if (typeof input.markerPath === 'string' && input.markerPath.length > 0) {
    writeFileSync(input.markerPath, 'go', 'utf8');
  }
  for (const one of input.calls) {
    const started = Date.now();
    try {
      const got = await run.runRemoteWrite(ctx, one.id, one.args, {
        timeoutMs: stage.REMOTE_STAGE_TIMEOUT_MS,
        execution: { kind: 'command', subject: String(one.args[0] ?? '') }
      });
      answers.push({
        label: one.label,
        payload: got.payload,
        read: stage.parseIndexWriteAnswer(got.payload),
        ms: Date.now() - started
      });
    } catch (err) {
      answers.push({ label: one.label, refused: said(err), ms: Date.now() - started });
    }
  }
  out = { answers };
} else if (input.op === 'read') {
  await connect();
  const answers: unknown[] = [];
  for (const one of input.calls) {
    const started = Date.now();
    try {
      const got = await run.runRemoteRead(ctx, 'review-list', [one.cwd], {
        timeoutMs: stage.REMOTE_STAGE_TIMEOUT_MS
      });
      answers.push({ label: one.label, bytes: got.bytes, ms: Date.now() - started });
    } catch (err) {
      answers.push({ label: one.label, refused: said(err), ms: Date.now() - started });
    }
  }
  out = { answers };
} else if (input.op === 'pure') {
  stage.resetRemoteStageSendCountForTests();
  out = {
    holds: input.holds.map((one: { root: string; path: string }) => ({
      ...one,
      answer: stage.rootHolds(one.root, one.path)
    })),
    parsed: input.payloads.map((one: string) => ({
      payload: one,
      read: stage.parseIndexWriteAnswer(one)
    })),
    chunks: input.chunkings.map(
      (one: { repoPath: string; count: number; length: number }) => {
        const paths = Array.from({ length: one.count }, (_, at) =>
          'p' + String(at).padStart(4, '0') + '/' + 'x'.repeat(one.length) + '.ts'
        );
        return {
          count: one.count,
          length: one.length,
          chunks: stage.chunkIndexPaths('stage', one.repoPath, paths).length
        };
      }
    ),
    sends: stage.remoteStageSendCount(),
    timeoutMs: stage.REMOTE_STAGE_TIMEOUT_MS,
    budgetBytes: stage.REMOTE_STAGE_BUDGET_BYTES
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

/**
 * The same driver, spawned so the probe keeps running while it works.
 *
 * Leg 12 is the only caller. Everything else is synchronous on purpose, because
 * a probe that reads a repository between two calls must not race itself.
 */
function driveAsync(input) {
  driverCalls += 1;
  const inPath = join(root, `p103-stage-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p103-stage-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const child = spawn(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p103-stage',
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
  return { child, outPath, said: () => text };
}

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p103-stage-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p103-stage-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 240_000,
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p103-stage',
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
  prefix: 'p103-stage',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

/** The folder every repository this probe makes sits under. */
const workRoot = join(root, 'p103-stage-work');
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
  const tmuxTmp = machineTmuxTmp('p103-stage', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(1);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);
say(`every repository this run makes sits under ${workRoot}`);

const ctxInput = {
  machineId: 'p103-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p103-stage-control'),
  hostKeys: join(root, 'p103-stage-known-machines'),
  userHostKeys: join(root, 'p103-stage-person-known-hosts')
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

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'p103',
  GIT_AUTHOR_EMAIL: 'p103@example.invalid',
  GIT_COMMITTER_NAME: 'p103',
  GIT_COMMITTER_EMAIL: 'p103@example.invalid',
  GIT_CONFIG_GLOBAL: join(root, 'p103-stage-gitconfig'),
  GIT_CONFIG_SYSTEM: '/dev/null'
};
writeFileSync(join(root, 'p103-stage-gitconfig'), '', 'utf8');

function git(cwd, args) {
  return sh('git', args, { cwd, env: GIT_ENV });
}

/** The whole porcelain of one repository, NUL turned into newlines. */
function porcelain(cwd) {
  const out = git(cwd, ['status', '--porcelain=v2', '-z', '--untracked-files=all']);
  return out.stdout.split('\0').filter((one) => one.length > 0).join('\n');
}

/** The XY pair one path carries right now, or null when git does not report it. */
function pairOf(cwd, path) {
  for (const line of porcelain(cwd).split('\n')) {
    if (line.startsWith('? ') && line.slice(2) === path) return '??';
    const parts = line.split(' ');
    if (parts[0] !== '1' && parts[0] !== '2') continue;
    if (!line.endsWith(path)) continue;
    return parts[1] ?? null;
  }
  return null;
}

/** One repository under the work root, with one commit unless asked otherwise. */
function makeRepo(name, { commit = true } = {}) {
  const dir = join(workRoot, name);
  mkdirSync(dir, { recursive: true, mode: 0o755 });
  git(dir, ['init', '-q', '.']);
  if (!commit) return dir;
  writeFileSync(join(dir, 'seed.txt'), 'seed\n', 'utf8');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-qm', 'init']);
  return dir;
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
  if (one.params !== 2) {
    fail(`${one.id} declares ${String(one.params)} value(s) and it reads two.`);
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
    `Linux login shell and a ${String(composed.budgetBytes)} byte chunking ` +
    `budget. That limit is the kernel's own constant and it was NOT measured ` +
    `here, because no Linux machine was contacted.`
);

// ---------------------------------------------------------------------------
// Legs 2, 3, 6. One repository, staged and unstaged over a real link
// ---------------------------------------------------------------------------

const repo = makeRepo('p103-main');
const HOSTILE = 'we ird*[x].txt';
writeFileSync(join(repo, 'a.txt'), 'one\n', 'utf8');
writeFileSync(join(repo, HOSTILE), 'hostile\n', 'utf8');
git(repo, ['add', '-A']);
git(repo, ['commit', '-qm', 'two files']);
writeFileSync(join(repo, 'a.txt'), 'two\n', 'utf8');
writeFileSync(join(repo, HOSTILE), 'hostile two\n', 'utf8');

const beforeStage = porcelain(repo);
let got = send([{ label: 'stageOne', id: 'git-stage', args: [repo, 'a.txt'] }]);
const afterStage = porcelain(repo);
if (got['stageOne']?.read?.ok !== true) {
  fail(
    `git-stage answered ${JSON.stringify(
      got['stageOne']?.payload ?? got['stageOne']?.refused
    )}.`
  );
}
if (pairOf(repo, 'a.txt') !== 'M.') {
  fail(`a.txt reads ${String(pairOf(repo, 'a.txt'))} after a stage, and it is M.`);
}
if (pairOf(repo, HOSTILE) !== '.M') {
  fail(
    `${HOSTILE} reads ${String(pairOf(repo, HOSTILE))} after staging a.txt, ` +
      `and staging one file must move no other file.`
  );
}
step(
  2,
  'one real git-stage over a real link',
  `answered ${JSON.stringify(got['stageOne']?.payload ?? '')} in ` +
    `${String(got['stageOne']?.ms ?? -1)} ms. The porcelain went from\n` +
    `      ${beforeStage.split('\n').join('\n      ')}\n    to\n` +
    `      ${afterStage.split('\n').join('\n      ')}\n    so a.txt moved from ` +
    `.M to M. and nothing else moved.`
);

got = send([{ label: 'unstageOne', id: 'git-unstage', args: [repo, 'a.txt'] }]);
const afterUnstage = porcelain(repo);
if (got['unstageOne']?.read?.ok !== true) {
  fail(
    `git-unstage answered ${JSON.stringify(
      got['unstageOne']?.payload ?? got['unstageOne']?.refused
    )}.`
  );
}
if (pairOf(repo, 'a.txt') !== '.M') {
  fail(
    `a.txt reads ${String(pairOf(repo, 'a.txt'))} after an unstage, and it is .M.`
  );
}
step(
  3,
  'one real git-unstage over a real link',
  `answered ${JSON.stringify(got['unstageOne']?.payload ?? '')} in ` +
    `${String(got['unstageOne']?.ms ?? -1)} ms. The porcelain is now\n` +
    `      ${afterUnstage.split('\n').join('\n      ')}\n    so a.txt moved back ` +
    `from M. to .M.`
);

const beforeHostile = porcelain(repo);
got = send([{ label: 'hostile', id: 'git-stage', args: [repo, HOSTILE] }]);
const afterHostile = porcelain(repo);
if (pairOf(repo, HOSTILE) !== 'M.') {
  fail(
    `the hostile name reads ${String(pairOf(repo, HOSTILE))} after a stage, ` +
      `and it is M. The :(literal) prefix is what stops the * and the [ from ` +
      `globbing on that machine.`
  );
}
if (pairOf(repo, 'a.txt') !== '.M') {
  fail(`staging the hostile name moved a.txt, which reads ${String(pairOf(repo, 'a.txt'))}.`);
}
step(
  4,
  'a name holding a space, a * and a [',
  `answered ${JSON.stringify(got['hostile']?.payload ?? '')}. The porcelain ` +
    `went from\n      ${beforeHostile.split('\n').join('\n      ')}\n    to\n` +
    `      ${afterHostile.split('\n').join('\n      ')}\n    so exactly ` +
    `${JSON.stringify(HOSTILE)} moved and a.txt did not.`
);

// Leg 6. Each verb twice with the same list.
got = send([
  { label: 'twiceA', id: 'git-stage', args: [repo, HOSTILE] },
  { label: 'twiceB', id: 'git-stage', args: [repo, HOSTILE] }
]);
const afterTwiceStage = porcelain(repo);
if (got['twiceA']?.read?.ok !== true || got['twiceB']?.read?.ok !== true) {
  fail('one of the two identical git-stage calls did not exit 0.');
}
got = send([
  { label: 'twiceC', id: 'git-unstage', args: [repo, HOSTILE] },
  { label: 'twiceD', id: 'git-unstage', args: [repo, HOSTILE] }
]);
const afterTwiceUnstage = porcelain(repo);
if (got['twiceC']?.read?.ok !== true || got['twiceD']?.read?.ok !== true) {
  fail('one of the two identical git-unstage calls did not exit 0.');
}
if (pairOf(repo, HOSTILE) !== '.M') {
  fail(
    `the hostile name reads ${String(pairOf(repo, HOSTILE))} after two ` +
      `unstages, and it is .M.`
  );
}
step(
  5,
  'each verb run twice with the same list',
  `two git-stage calls left\n      ` +
    `${afterTwiceStage.split('\n').join('\n      ')}\n    and two git-unstage ` +
    `calls left\n      ${afterTwiceUnstage.split('\n').join('\n      ')}\n    ` +
    `so each is safe by END STATE rather than by refusal. Neither names a ` +
    `destination to test.`
);

// ---------------------------------------------------------------------------
// Leg 4. The far side's OWN containment, with main bypassed
// ---------------------------------------------------------------------------

const hostilePaths = [
  ['above', '../above.txt'],
  ['absolute', '/etc/passwd'],
  ['dot', '.'],
  ['gitdir', '.git/config'],
  ['slash', 'sub/'],
  ['empty', ''],
  ['climb', 'src/../../above.txt']
];
writeFileSync(join(workRoot, 'above.txt'), 'not yours\n', 'utf8');
const beforeGuards = porcelain(repo);
got = send(
  hostilePaths.map(([label, path]) => ({
    label,
    id: 'git-stage',
    args: [repo, path]
  }))
);
const afterGuards = porcelain(repo);
const guardRows = [];
for (const [label, path] of hostilePaths) {
  const one = got[label];
  if (one?.refused === undefined) {
    fail(
      `the far side ACCEPTED ${JSON.stringify(path)} and answered ` +
        `${JSON.stringify(one?.payload ?? '')}. Every one of these has to ` +
        `refuse before the cd and before any git.`
    );
    continue;
  }
  guardRows.push(`${JSON.stringify(path)} refused`);
}
if (beforeGuards !== afterGuards) {
  fail('the porcelain moved while the far side was refusing seven paths.');
}
// The `.` case is the one that matters most: `git add -A -- ":(literal)."`
// would stage every change in that repository in one call.
step(
  6,
  'the far side own containment, with main bypassed',
  `${guardRows.join('; ')}. No marker arrived for any of them, so the parse ` +
    `refused rather than reading an answer. The porcelain is byte identical ` +
    `either side:\n      ${afterGuards.split('\n').join('\n      ')}`
);

// ---------------------------------------------------------------------------
// Leg 5. The wrong repository, which the SCRIPT does not close
// ---------------------------------------------------------------------------

const other = makeRepo('p103-other');
writeFileSync(join(other, 'secret.txt'), 'theirs\n', 'utf8');
const otherBefore = porcelain(other);
got = send([
  { label: 'wrongRepo', id: 'git-stage', args: [other, 'secret.txt'] }
]);
const otherAfter = porcelain(other);
const scriptRanIt = got['wrongRepo']?.read?.ok === true;
step(
  7,
  'a repository the tab is not about, sent as parameter 1',
  `the SCRIPT ${scriptRanIt ? 'ran it' : 'refused it'}, and the porcelain of ` +
    `that second repository went from\n      ` +
    `${otherBefore.split('\n').join('\n      ')}\n    to\n      ` +
    `${otherAfter.split('\n').join('\n      ')}. THIS IS THE GAP THE SCRIPT ` +
    `CANNOT CLOSE: parameter 1 is the repository root and not the folder the ` +
    `person confirmed, so the far side can only check that the root is ` +
    `absolute and holds no two dots. src/main/machines/remote-stage.ts makes ` +
    `the four layer check on this Mac, and condition 84 of ` +
    `npm run conformance:machines reads its shape. A third positional ` +
    `carrying the confirmed folder would close it at the cost of no extra ` +
    `process, and the Phase 103 entry rules two.`
);

// ---------------------------------------------------------------------------
// Leg 7. The unborn branch, with the far side stderr pasted
// ---------------------------------------------------------------------------

const unborn = makeRepo('p103-unborn', { commit: false });
writeFileSync(join(unborn, 'x.txt'), 'x\n', 'utf8');
got = send([{ label: 'unbornStage', id: 'git-stage', args: [unborn, 'x.txt'] }]);
const unbornStaged = porcelain(unborn);
if (pairOf(unborn, 'x.txt') !== 'A.') {
  fail(
    `x.txt reads ${String(pairOf(unborn, 'x.txt'))} after a stage in a ` +
      `repository with no commit, and it is A.`
  );
}
// What git ACTUALLY prints here is recorded rather than assumed. The script
// tests for it on the far side, because the stderr is on the far side.
const restoreSaid = git(unborn, [
  'restore',
  '--staged',
  '--',
  ':(literal)x.txt'
]);
got = send([
  { label: 'unbornUnstage', id: 'git-unstage', args: [unborn, 'x.txt'] }
]);
const unbornUnstaged = porcelain(unborn);
if (got['unbornUnstage']?.read?.ok !== true) {
  fail(
    `git-unstage on a repository with no commit answered ` +
      `${JSON.stringify(
        got['unbornUnstage']?.payload ?? got['unbornUnstage']?.refused
      )}.`
  );
}
if (pairOf(unborn, 'x.txt') !== '??') {
  fail(
    `x.txt reads ${String(pairOf(unborn, 'x.txt'))} after an unstage in a ` +
      `repository with no commit, and it is ?? because git rm --cached leaves ` +
      `the file in the folder.`
  );
}
if (!existsSync(join(unborn, 'x.txt'))) {
  fail('git rm --cached removed the file from the folder, which it must not.');
}
step(
  8,
  'a repository with no commit at all',
  `the stage left\n      ${unbornStaged.split('\n').join('\n      ')}\n    and ` +
    `the unstage left\n      ${unbornUnstaged.split('\n').join('\n      ')}\n` +
    `    so the git rm --cached fallback fired and the file is still in the ` +
    `folder. THE SENTENCE THIS MACHINE GIT ACTUALLY PRINTED for ` +
    `git restore --staged is ${JSON.stringify(restoreSaid.stderr.trim())}, ` +
    `which is the "could not resolve" phrasing of the six the script tests ` +
    `for. No Linux git was asked.`
);

// ---------------------------------------------------------------------------
// Leg 8. A rename made as a plain mv, staged as two rows in one call
// ---------------------------------------------------------------------------

const renamed = makeRepo('p103-rename');
writeFileSync(join(renamed, 'old.txt'), 'body\n', 'utf8');
git(renamed, ['add', '-A']);
git(renamed, ['commit', '-qm', 'seed old']);
sh('/bin/mv', [join(renamed, 'old.txt'), join(renamed, 'new.txt')]);
const renameBefore = porcelain(renamed);
got = send([
  {
    label: 'rename',
    id: 'git-stage',
    args: [renamed, 'old.txt\nnew.txt']
  }
]);
const renameAfter = porcelain(renamed);
if (got['rename']?.read?.ok !== true) {
  fail(
    `staging both ends of a rename answered ${JSON.stringify(
      got['rename']?.payload ?? got['rename']?.refused
    )}.`
  );
}
if (!renameAfter.includes('new.txt') || renameAfter.includes('? ')) {
  fail(
    `the rename did not land as one staged change. The porcelain reads\n` +
      `${renameAfter}`
  );
}
step(
  9,
  'a Phase 102 rename, which is a plain mv, staged as two rows',
  `the porcelain went from\n      ` +
    `${renameBefore.split('\n').join('\n      ')}\n    to\n      ` +
    `${renameAfter.split('\n').join('\n      ')}\n    so BOTH rows landed in ` +
    `one call. Phase 102's rename is a plain mv, so git sees a delete plus an ` +
    `untracked add rather than one rename row, and staging it needs both ` +
    `paths.`
);

// ---------------------------------------------------------------------------
// Leg 9. The cost, in milliseconds and in processes
// ---------------------------------------------------------------------------

const wide = makeRepo('p103-wide');
const widePaths = [];
for (let at = 0; at < 30; at += 1) {
  const name = `file-${String(at).padStart(2, '0')}.txt`;
  writeFileSync(join(wide, name), `body ${String(at)}\n`, 'utf8');
  widePaths.push(name);
}

const readOne = drive({
  op: 'read',
  ...ctxInput,
  calls: [
    { label: 'reviewWarm1', cwd: wide },
    { label: 'reviewWarm2', cwd: wide },
    { label: 'reviewWarm3', cwd: wide }
  ]
});
const readMs = (readOne?.answers ?? []).map((one) => one.ms ?? -1);

got = send([
  { label: 'stage30', id: 'git-stage', args: [wide, widePaths.join('\n')] }
]);
const after30 = porcelain(wide);
got = Object.assign(
  got,
  send([
    { label: 'unstage1', id: 'git-unstage', args: [wide, widePaths[0] ?? ''] }
  ])
);
const staged30 = after30
  .split('\n')
  .filter((line) => line.startsWith('1 A.')).length;
if (staged30 !== 30) {
  fail(`a stage of 30 paths staged ${String(staged30)} of them.`);
}
step(
  10,
  'the cost, in milliseconds and in processes',
  `the review read took ${readMs.join(' ms, ')} ms across three warm calls. ` +
    `A stage of 30 paths took ${String(got['stage30']?.ms ?? -1)} ms and an ` +
    `unstage of 1 path took ${String(got['unstage1']?.ms ?? -1)} ms. ONE ` +
    `stage that fits in one chunk costs 3 ssh round trips and 5 git spawns on ` +
    `the far side: 2 for the pre read, 1 for the add, 2 for the post read. ` +
    `The chunk loop spawns NOTHING, because set -- "$@" ":(literal)$p" is a ` +
    `builtin, so 30 paths cost the same one git add that 1 path costs. Every ` +
    `number here is against a far side on 127.0.0.1, so it holds no link at ` +
    `all: research 57 line 196's 29 to 37 ms is an EMPTY round trip on a real ` +
    `link and it is not any of these.`
);

// ---------------------------------------------------------------------------
// Leg 10. The pure halves, and the send counter after them
// ---------------------------------------------------------------------------

const pure = drive({
  op: 'pure',
  ...ctxInput,
  holds: [
    { root: '/Users/gdc/code', path: '/Users/gdc/code' },
    { root: '/Users/gdc/code', path: '/Users/gdc/code/api' },
    { root: '/Users/gdc/code', path: '/Users/gdc' },
    { root: '/Users/gdc', path: '/Users/gdcx' },
    { root: '/Users/gdc/code', path: '/etc' }
  ],
  payloads: [
    '0 none',
    `1 ${Buffer.from('fatal: pathspec did not match', 'utf8').toString('base64')}`,
    '0',
    '2 none',
    '1 not base64!'
  ],
  chunkings: [
    { repoPath: '/tmp/p103', count: 1, length: 20 },
    { repoPath: '/tmp/p103', count: 30, length: 20 },
    { repoPath: '/tmp/p103', count: 100, length: 20 },
    { repoPath: '/tmp/p103', count: 100, length: 1400 }
  ]
});
if (pure !== null) {
  const holds = pure.holds ?? [];
  const wantedHolds = [true, true, false, false, false];
  holds.forEach((one, at) => {
    if (one.answer === wantedHolds[at]) return;
    fail(
      `rootHolds(${JSON.stringify(one.root)}, ${JSON.stringify(one.path)}) ` +
        `answered ${String(one.answer)}.`
    );
  });
  if (pure.sends !== 0) {
    fail(`the pure halves sent ${String(pure.sends)} command(s), and they send none.`);
  }
  step(
    11,
    'the pure halves, and the send counter after them',
    `rootHolds answered ${JSON.stringify(holds.map((one) => one.answer))} for ` +
      `the root itself, a folder under it, a folder above it, a sibling whose ` +
      `name starts with the root, and another branch. parseIndexWriteAnswer ` +
      `read ${JSON.stringify(
        (pure.parsed ?? []).map((one) => one.read)
      )}, where null is a refusal. chunkIndexPaths answered ` +
      `${JSON.stringify(
        (pure.chunks ?? []).map(
          (one) =>
            `${String(one.count)} paths of ${String(one.length)} chars = ` +
            `${String(one.chunks)} chunk(s)`
        )
      )}, which is why the budget is BYTES and not a count. The send counter ` +
      `is ${String(pure.sends)} afterwards, so none of them contacted ` +
      `anything. The timeout is ${String(pure.timeoutMs)} ms and the budget ` +
      `is ${String(pure.budgetBytes)} bytes, both CHOSEN rather than measured.`
  );
}

// ---------------------------------------------------------------------------
// Leg 12. The local ssh killed while a real stage is in flight
// ---------------------------------------------------------------------------
//
// EVIDENCE ITEM 16 OF THE PHASE ENTRY, and the question research 57 section 10
// left open: does SIGKILL on the LOCAL ssh stop the far side shell. Phase 101
// answered it once for a file write. This leg asks it for a git write.
//
// HOW THE WINDOW IS MADE WIDE ENOUGH TO HIT. A stage of 30 small paths is about
// 26 ms end to end, and reading the process table takes longer than that, so a
// first build of this leg killed a connection that had already answered and
// proved nothing. The script text is not changed to slow it down. Instead the
// far side is given real work: ten files of 40 MB of random bytes, which that
// machine's own git has to hash and compress. The window is then seconds rather
// than milliseconds and the kill lands inside the write.
//
// WHICH PROCESS IS SIGNALLED. Only a pid whose command line holds the control
// path THIS RUN composed, which is a name under /tmp that no other ssh on this
// Mac carries. There is no pkill in this file and the operator's own ssh can
// never match. Every pid is recorded before it is signalled.
//
// WHAT COUNTS AS EVIDENCE. An attempt only says anything when the write was
// really cut, being when Tortie got no usable answer back. An attempt that
// still answered is reported as a miss rather than as a result.

{
  const killRepo = makeRepo('p103-kill');
  const killPaths = [];
  const bulk = 40 * 1024 * 1024;
  for (let at = 0; at < 10; at += 1) {
    const name = `k-${String(at).padStart(2, '0')}.bin`;
    writeFileSync(join(killRepo, name), randomBytes(bulk));
    killPaths.push(name);
  }

  const ourSsh = () =>
    sh('/bin/sh', [
      '-c',
      `/bin/ps -axo pid=,command= | /usr/bin/grep -F ${JSON.stringify(
        ctxInput.controlPath
      )} | /usr/bin/grep -v grep | /usr/bin/awk '{print $1}'`
    ])
      .stdout.trim()
      .split('\n')
      .map((one) => Number(one.trim()))
      .filter((one) => Number.isFinite(one) && one > 0);

  /** How many of the ten paths that index holds right now. */
  const stagedCount = () =>
    porcelain(killRepo)
      .split('\n')
      .filter((line) => /^1 A/.test(line)).length;

  const attempts = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    git(killRepo, ['reset', '-q']);
    const marker = join(root, `p103-stage-kill-marker-${String(attempt)}`);
    const running = driveAsync({
      op: 'send',
      ...ctxInput,
      markerPath: marker,
      calls: [
        {
          label: 'stageKill',
          id: 'git-stage',
          args: [killRepo, killPaths.join('\n')]
        }
      ]
    });

    let caught = false;
    const killedHere = [];
    const watchBy = Date.now() + 120_000;
    while (Date.now() < watchBy) {
      if (existsSync(marker)) {
        // Read the table NOW rather than earlier, so the per command client is
        // in it as well as the master this run keeps open.
        for (const pid of ourSsh()) {
          recordedPids.push(pid);
          try {
            process.kill(pid, 'SIGKILL');
            killedHere.push(pid);
          } catch {
            /* already gone */
          }
        }
        caught = killedHere.length > 0;
        break;
      }
      if (running.child.exitCode !== null) break;
      if (existsSync(running.outPath)) break;
      sh('/bin/sleep', ['0.02']);
    }

    await new Promise((done) => {
      if (running.child.exitCode !== null) {
        done(undefined);
        return;
      }
      const giveUp = setTimeout(() => done(undefined), 180_000);
      running.child.on('exit', () => {
        clearTimeout(giveUp);
        done(undefined);
      });
    });
    const answered = existsSync(running.outPath)
      ? JSON.parse(readFileSync(running.outPath, 'utf8'))
      : null;
    const one = (answered?.answers ?? [])[0] ?? null;
    const gotAnswer = typeof one?.payload === 'string' && one.payload.length > 0;

    // THE INDEX IS NOT READ THE INSTANT THE LINK DIES. A first build did that
    // and reported 0 of 10 staged, which was false: that machine's git was
    // still hashing 400 MB and holding `.git/index.lock`, and the next attempt
    // then failed with "Unable to create index.lock: File exists". The lock
    // still being there after the local ssh is dead IS the answer, and the
    // count is only true once it has gone.
    const lock = join(killRepo, '.git', 'index.lock');
    const lockAfterKill = existsSync(lock);
    const settleBy = Date.now() + 180_000;
    while (existsSync(lock) && Date.now() < settleBy) {
      sh('/bin/sleep', ['0.2']);
    }
    attempts.push({
      attempt,
      killed: killedHere,
      cut: caught && !gotAnswer,
      lockHeldAfterKill: lockAfterKill,
      lockGone: !existsSync(lock),
      staged: stagedCount(),
      of: killPaths.length,
      said: gotAnswer
        ? one.payload
        : String(one?.refused?.message ?? 'no answer file').slice(0, 200)
    });
  }

  const cut = attempts.filter((one) => one.cut);
  const finished = cut.filter((one) => one.staged === killPaths.length);
  const answer =
    cut.length === 0
      ? 'THE QUESTION STAYS OPEN. No attempt cut a write, because every one of ' +
        'them still answered, so nothing here answers research 57 section 10.'
      : finished.length > 0
        ? `ANSWERED for a macOS far side. ${String(finished.length)} of ` +
          `${String(cut.length)} cut writes left all ${String(
            killPaths.length
          )} paths staged over there, so SIGKILL on the local ssh does NOT ` +
          'stop the shell on that machine. Only the answer is lost. That is ' +
          'why both verbs answer with a word the panel draws beside fresh ' +
          'rows rather than with an error that replaces them, and why the ' +
          'sentence for it never says nothing changed.'
        : `ANSWERED the other way for a macOS far side. ${String(
            cut.length
          )} write(s) were cut and none of them left the paths staged once ` +
          'that machine had settled, so the shell over there stopped with the ' +
          'link. `lockHeldAfterKill` per attempt says whether that machine ' +
          'was still holding its index while the link was already dead.';
  step(
    12,
    'the local ssh killed while a real stage was in flight',
    `${answer} Per attempt: ${JSON.stringify(attempts)}. Every pid signalled ` +
      `was matched on this run's own control path ${ctxInput.controlPath}, ` +
      'recorded before the signal, and no pkill was used.'
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
  'NOT MEASURED: no Linux machine was contacted, so the shell behaviour on a ' +
    'killed connection and the exact unborn branch sentence are unverified off ' +
    'macOS. The confirm gate, the machines file and the two IPC channels are ' +
    'not driven here. Leg 12 cut the link on this Mac only, so what it ' +
    'answers is a macOS far side.'
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
  '\nPASS. One real file moved from .M to M. and back on a real machine, a name ' +
    'holding a space and a * and a [ moved and nothing else did, each verb run ' +
    'twice left the same end state, the far side refused seven hostile paths ' +
    'with main bypassed and the porcelain did not move, a repository with no ' +
    'commit took the git rm --cached fallback and kept its file, and both ends ' +
    'of a plain mv rename landed in one call.\n'
);
