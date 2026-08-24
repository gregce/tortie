/**
 * `node build/probe-p104-commit.mjs`. The Tier 3 live probe of Phase 104, being
 * the EIGHTH command this product can send that changes bytes on another
 * computer, and the first one that makes a commit over there.
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
 *  1. A real commit over a real link, with the sha read back on that machine
 *     with `git log -1 --format=%H` and compared against what the answer named.
 *  2. The HEAD guard stops a double commit. The same request twice, with the
 *     commit count on that machine read before and after.
 *  3. A `pre-commit` hook that refuses, with its own words read back, its byte
 *     size reported, and a second hook that prints more than the cap so the cap
 *     is measured rather than described.
 *  4. The deadline is the caller's, with a number. A hook that sleeps 45
 *     seconds under the shipped 300,000 ms deadline.
 *  5. What a cut link leaves behind, which is research 57 section 10's open
 *     question. By default the door is given a SHORT deadline and the hook
 *     sleeps past it, because waiting out 300,000 ms costs five minutes of wall
 *     clock. `--deadline` runs the real one.
 *  6. The hook environment. A hook that prints its own `PATH` and asks for
 *     `node`, compared against the operator's interactive `PATH`, plus a hook
 *     that names a program by absolute path.
 *  7. The message, which is the riskiest input in the programme. A multi line
 *     message holding a quote, a newline, a dollar sign, a backtick, a
 *     semicolon, `é` and a command substitution, read back with
 *     `git log -1 --format=%B` and compared BYTE FOR BYTE.
 *  8. The outer cap, counted in bytes, with a message that puts the composed
 *     command one byte over it. Both counts are reported.
 *  9. An unborn branch. The first commit into a repository that has none.
 * 10. The pure halves of `src/main/machines/remote-commit.ts`, with the send
 *     counter read afterwards so that "these sent nothing" is measured.
 * 11. Nothing this phase sends can discard a working tree change. The discard
 *     rules run over all twenty five scripts, and every file in a repository is
 *     checksummed either side of a commit that FAILS.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE DOES NOT MEASURE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so every answer below is a macOS far side and the
 * git below is this Mac's git. NO LINUX MACHINE WAS CONTACTED.
 *
 * It does not drive the confirm gate, the machines file or the IPC channel.
 * Those need Electron's keystore, and they are covered by
 * `src/main/machines/__tests__/p104-remote-commit.test.ts`, by
 * `npm run conformance:machines` and by the app driving in this phase's
 * evidence. What this probe covers is the script text, what it does to a real
 * repository on a real machine, and the pure halves of main's own module.
 *
 * IT CANNOT PROVE MAIN'S REFUSAL OF A RENDERER SHA, for the same reason. What
 * it proves instead is the far side half of the same rule, being that a guard
 * sha which is not that machine's HEAD commits nothing, and that
 * `commitOnMachine` for a machine with no row refuses and sends nothing. The
 * gap is named in the closing lines.
 *
 * NO SIGNING CONFIGURATION IS EXERCISED ANYWHERE. Hazard 2 of research 57
 * section 5.6 is answered by design and by one photographed sentence in the
 * app driving probe, not by a measurement here.
 *
 * Every scratch file carries a `p104-` prefix.
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
const PORT = 45771;

/** `--deadline` waits out the real 300,000 ms deadline in leg 5. */
const WAIT_OUT_DEADLINE = process.argv.includes('--deadline');

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p104-commit-${String(process.pid)}`,
  'p104-commit'
);

const root = join('/tmp', `p104-commit-${String(process.pid)}`);
const recordedPids = [];
const failures = [];
const rows = [];

const say = (text) => process.stdout.write(`[p104-commit] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p104-commit] FAIL: ${text}\n`);
};
// How many failures had been recorded when the LAST step printed. A leg that
// records a failure and then prints a step sentence reading like a success is
// an artifact a later reader quotes against the run's own verdict, so the
// sentence carries the verdict of its own leg.
let failuresAtLastStep = 0;
const step = (n, what, evidence) => {
  const broke = failures.length - failuresAtLastStep;
  failuresAtLastStep = failures.length;
  const verdict = broke === 0 ? 'PASS' : `FAILED, ${String(broke)}`;
  const line =
    broke === 0
      ? evidence
      : `THIS LEG FAILED ${String(broke)} TIME(S) AND WHAT FOLLOWS IS WHAT IT ` +
        `MEASURED RATHER THAN A VERDICT. ${evidence}`;
  rows.push({ n, what, evidence: line, verdict });
  process.stdout.write(
    `[p104-commit] ${String(n)}. [${verdict}] ${what}: ${line}\n`
  );
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 600_000,
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

const driverPath = join(root, 'p104-commit-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const control = await import(REPO + '/src/main/machines/control-plane');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const run = await import(REPO + '/src/main/machines/remote-run');
const scripts = await import(REPO + '/src/main/machines/remote-scripts');
const commit = await import(REPO + '/src/main/machines/remote-commit');

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
  const script = scripts.remoteScript('git-commit')!;
  const command = run.composeRemoteScriptCommand(script, [
    '/tmp/p104-commit-root',
    'none',
    String(input.message ?? 'a message')
  ]);
  out = {
    maxBytes: scripts.REMOTE_SCRIPT_MAX_BYTES,
    timeoutMs: commit.REMOTE_COMMIT_TIMEOUT_MS,
    answerCapBytes: commit.REMOTE_COMMIT_ANSWER_MAX_BYTES,
    id: script.id,
    mode: script.mode,
    params: script.params,
    reason: script.reason,
    scriptBytes: Buffer.byteLength(script.text, 'utf8'),
    commandBytes: Buffer.byteLength(command, 'utf8'),
    commandUnits: command.length,
    text: script.text,
    // Every script, so the discard rules run over the whole catalogue here as
    // well as in the gate.
    catalogue: scripts.REMOTE_SCRIPTS.map((one) => ({
      id: one.id,
      mode: one.mode,
      text: one.text
    }))
  };
} else if (input.op === 'send') {
  await connect();
  const answers: unknown[] = [];
  if (typeof input.markerPath === 'string' && input.markerPath.length > 0) {
    writeFileSync(input.markerPath, 'go', 'utf8');
  }
  for (const one of input.calls) {
    const started = Date.now();
    try {
      const got = await run.runRemoteWrite(ctx, 'git-commit', one.args, {
        timeoutMs:
          typeof one.timeoutMs === 'number'
            ? one.timeoutMs
            : commit.REMOTE_COMMIT_TIMEOUT_MS,
        execution: { kind: 'command', subject: String(one.args[0] ?? '') }
      });
      answers.push({
        label: one.label,
        payload: got.payload,
        read: commit.parseCommitAnswer(got.payload),
        ms: Date.now() - started
      });
    } catch (err) {
      answers.push({
        label: one.label,
        refused: said(err),
        ms: Date.now() - started
      });
    }
  }
  out = { answers };
} else if (input.op === 'pure') {
  commit.resetRemoteCommitSendCountForTests();
  let noRow: unknown = null;
  try {
    await commit.commitOnMachine({
      machineId: 'p104-no-such-machine',
      cwd: '/tmp/p104-nowhere',
      headSha: '',
      staged: ['a.ts'],
      message: 'this never leaves this Mac'
    });
    noRow = { threw: false };
  } catch (err) {
    noRow = { threw: true, ...said(err) };
  }
  out = {
    parsed: input.payloads.map((one: string) => ({
      payload: one,
      read: commit.parseCommitAnswer(one)
    })),
    staged: commit.stagedPathsOf(input.rows),
    identity: input.identities.map((one: string | null) => ({
      said: one,
      answer: commit.identityUnset(one)
    })),
    noRow,
    sends: commit.remoteCommitSendCount(),
    timeoutMs: commit.REMOTE_COMMIT_TIMEOUT_MS,
    answerCapBytes: commit.REMOTE_COMMIT_ANSWER_MAX_BYTES
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

function driveAsync(input) {
  driverCalls += 1;
  const inPath = join(root, `p104-commit-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p104-commit-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const child = spawn(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p104-commit',
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
  const inPath = join(root, `p104-commit-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p104-commit-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: WAIT_OUT_DEADLINE ? 600_000 : 240_000,
      env: {
        ...process.env,
        GMUX_SMOKE: 'probe-p104-commit',
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
  prefix: 'p104-commit',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

/** The folder every repository this probe makes sits under. */
const workRoot = join(root, 'p104-commit-work');
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
  const tmuxTmp = machineTmuxTmp('p104-commit', 'one');
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
  machineId: 'p104-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p104-commit-control'),
  hostKeys: join(root, 'p104-commit-known-machines'),
  userHostKeys: join(root, 'p104-commit-person-known-hosts')
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
  GIT_AUTHOR_NAME: 'p104',
  GIT_AUTHOR_EMAIL: 'p104@example.invalid',
  GIT_COMMITTER_NAME: 'p104',
  GIT_COMMITTER_EMAIL: 'p104@example.invalid',
  GIT_CONFIG_GLOBAL: join(root, 'p104-commit-gitconfig'),
  GIT_CONFIG_SYSTEM: '/dev/null'
};
writeFileSync(
  join(root, 'p104-commit-gitconfig'),
  '[user]\n\tname = p104\n\temail = p104@example.invalid\n',
  'utf8'
);

function git(cwd, args) {
  return sh('git', args, { cwd, env: GIT_ENV });
}

/** The whole porcelain of one repository, NUL turned into newlines. */
function porcelain(cwd) {
  const out = git(cwd, ['status', '--porcelain=v2', '-z', '--untracked-files=all']);
  return out.stdout.split('\0').filter((one) => one.length > 0).join('\n');
}

/** What HEAD points at right now, or the word none. */
function headOf(cwd) {
  const out = git(cwd, ['rev-parse', 'HEAD']);
  return out.code === 0 ? out.stdout.trim() : 'none';
}

/** How many commits that repository holds. */
function commitCount(cwd) {
  const out = git(cwd, ['rev-list', '--count', 'HEAD']);
  return out.code === 0 ? Number(out.stdout.trim()) : 0;
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

/** A `pre-commit` hook with this body, made executable. */
function hook(dir, body) {
  const path = join(dir, '.git', 'hooks', 'pre-commit');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, { encoding: 'utf8', mode: 0o755 });
  return path;
}

function removeHook(dir) {
  const path = join(dir, '.git', 'hooks', 'pre-commit');
  if (existsSync(path)) rmSync(path, { force: true });
}

/** Every file in a folder with its sha256, so a failure can be proven inert. */
function fingerprint(dir) {
  const out = [];
  const walk = (at, rel) => {
    for (const name of readdirSync(at).sort()) {
      if (name === '.git') continue;
      const path = join(at, name);
      const here = rel.length === 0 ? name : `${rel}/${name}`;
      if (statSync(path).isDirectory()) {
        walk(path, here);
        continue;
      }
      out.push(
        `${here} ${createHash('sha256').update(readFileSync(path)).digest('hex')}`
      );
    }
  };
  walk(dir, '');
  return out.join('\n');
}

function send(calls) {
  const out = drive({ op: 'send', ...ctxInput, calls });
  const answers = out?.answers ?? [];
  const byLabel = {};
  for (const one of answers) byLabel[one.label] = one;
  return byLabel;
}

/** One commit request, with the guard read from that repository right now. */
function commitCall(label, dir, message, over = {}) {
  return {
    label,
    args: [dir, headOf(dir), message],
    ...over
  };
}

// ---------------------------------------------------------------------------
// Leg 1. The composed size, the row, and one real commit
// ---------------------------------------------------------------------------

const composed = drive({ op: 'compose', ...ctxInput });
if (composed === null) {
  stopEverything();
  process.exit(1);
}
if (composed.mode !== 'write') {
  fail(`git-commit is a ${String(composed.mode)} in the catalogue and it writes.`);
}
if (composed.params !== 3) {
  fail(`git-commit declares ${String(composed.params)} value(s) and it reads three.`);
}
if (composed.commandBytes > composed.maxBytes) {
  fail(
    `git-commit composes ${String(composed.commandBytes)} bytes against a ` +
      `limit of ${String(composed.maxBytes)}.`
  );
}

const repo = makeRepo('p104-main');
writeFileSync(join(repo, 'a.txt'), 'one\n', 'utf8');
git(repo, ['add', '-A']);
const beforeOne = headOf(repo);
const countBeforeOne = commitCount(repo);
let got = send([commitCall('one', repo, 'the first commit from Tortie')]);
const afterOneRead = git(repo, ['log', '-1', '--format=%H']).stdout.trim();
if (got['one']?.read?.word !== 'committed') {
  fail(
    `the commit answered ${JSON.stringify(
      got['one']?.payload ?? got['one']?.refused
    )} rather than committed.`
  );
}
if (got['one']?.read?.headSha !== afterOneRead) {
  fail(
    `the answer named ${String(got['one']?.read?.headSha)} and git on that ` +
      `machine reads ${afterOneRead}.`
  );
}
step(
  1,
  'one real commit over a real link',
  `git-commit is ${String(composed.scriptBytes)} bytes of text and composes ` +
    `${String(composed.commandBytes)} bytes of command against a ` +
    `${String(composed.maxBytes)} byte limit on one argument of a Linux login ` +
    `shell, which is the kernel's own constant and was NOT measured here ` +
    `because no Linux machine was contacted. The commit answered ` +
    `${JSON.stringify(got['one']?.payload ?? '')} in ` +
    `${String(got['one']?.ms ?? -1)} ms. HEAD went from ${beforeOne} to ` +
    `${afterOneRead}, read back with git log -1 --format=%H ON THAT MACHINE, ` +
    `and the answer named the same sha. The commit count went from ` +
    `${String(countBeforeOne)} to ${String(commitCount(repo))}.`
);

// ---------------------------------------------------------------------------
// Leg 2. The HEAD guard stops a double commit
// ---------------------------------------------------------------------------

writeFileSync(join(repo, 'b.txt'), 'two\n', 'utf8');
git(repo, ['add', '-A']);
const guardSha = headOf(repo);
const countBeforeTwice = commitCount(repo);
got = send([
  { label: 'first', args: [repo, guardSha, 'sent once'] },
  { label: 'again', args: [repo, guardSha, 'sent once'] }
]);
const countAfterTwice = commitCount(repo);
if (got['first']?.read?.word !== 'committed') {
  fail(`the first of two identical requests answered ${JSON.stringify(got['first']?.payload)}.`);
}
if (got['again']?.read?.word !== 'moved') {
  fail(
    `the second of two identical requests answered ` +
      `${JSON.stringify(got['again']?.payload)} rather than moved.`
  );
}
if (countAfterTwice !== countBeforeTwice + 1) {
  fail(
    `two identical requests left ${String(countAfterTwice)} commit(s) and the ` +
      `repository held ${String(countBeforeTwice)} before them. One request ` +
      `sent twice has to add ONE commit.`
  );
}
step(
  2,
  'the HEAD guard stops a double commit',
  `the same request was sent twice with the guard sha ${guardSha}. The first ` +
    `answered ${JSON.stringify(got['first']?.payload ?? '')} and the second ` +
    `answered ${JSON.stringify(got['again']?.payload ?? '')}. git rev-list ` +
    `--count HEAD on that machine reads ${String(countAfterTwice)} and it read ` +
    `${String(countBeforeTwice)} before, so one commit was added and not two.`
);

// ---------------------------------------------------------------------------
// Leg 3. A hook that refuses, and the cap on what it may say
// ---------------------------------------------------------------------------

{
  const hookRepo = makeRepo('p104-hook');
  writeFileSync(join(hookRepo, 'x.txt'), 'x\n', 'utf8');
  git(hookRepo, ['add', '-A']);
  hook(
    hookRepo,
    '#!/bin/sh\necho "p104 pre-commit refused: the lint found 3 problems" 1>&2\nexit 1\n'
  );
  const beforeHook = commitCount(hookRepo);
  got = send([commitCall('refused', hookRepo, 'a message the hook refuses')]);
  // HELD IN A LOCAL, because `got` is reassigned by the loud hook send below
  // and evidence item 3 asks for the hook's OWN line to be shown.
  const hookSaid = String(got['refused']?.read?.said ?? '');
  const saidBytes = Buffer.byteLength(hookSaid, 'utf8');
  if (got['refused']?.read?.word !== 'failed') {
    fail(`a refusing hook answered ${JSON.stringify(got['refused']?.payload)}.`);
  }
  if (!String(got['refused']?.read?.said ?? '').includes('p104 pre-commit refused')) {
    fail(
      `the hook's own line did not come back. What came back was ` +
        `${JSON.stringify(got['refused']?.read?.said)}.`
    );
  }
  if (commitCount(hookRepo) !== beforeHook) {
    fail('a refused commit still added a commit.');
  }

  // The cap, measured. The hook prints far more than the cap allows.
  hook(
    hookRepo,
    '#!/bin/sh\nawk \'BEGIN { while (i++ < 4000) printf "0123456789ABCDEF" }\' 1>&2\nexit 1\n'
  );
  got = send([commitCall('capped', hookRepo, 'a message the loud hook refuses')]);
  const cappedBytes = Buffer.byteLength(String(got['capped']?.read?.said ?? ''), 'utf8');
  if (cappedBytes > composed.answerCapBytes) {
    fail(
      `a hook printing 64,000 bytes came back as ${String(cappedBytes)} bytes ` +
        `and the cap is ${String(composed.answerCapBytes)}.`
    );
  }
  removeHook(hookRepo);
  step(
    3,
    'a hook that refuses is shown, and the cap is measured',
    `the refusing hook's own words came back as ${String(saidBytes)} bytes, ` +
      `being ${JSON.stringify(hookSaid.slice(0, 90))}, ` +
      `and the commit count did not move. A second hook printing 64,000 bytes ` +
      `came back as ${String(cappedBytes)} bytes against a cap of ` +
      `${String(composed.answerCapBytes)}. THE CAP IS CHOSEN RATHER THAN ` +
      `MEASURED, and ${String(saidBytes)} bytes is what a real refusal cost, ` +
      `so a later round can move the number with that figure. WHAT IS NOT ` +
      `BOUNDED is what the far side shell holds in one variable BEFORE the ` +
      `cap is applied.`
  );
}

// ---------------------------------------------------------------------------
// Leg 4. The deadline is the caller's, with a number
// ---------------------------------------------------------------------------

{
  const slowRepo = makeRepo('p104-slow');
  writeFileSync(join(slowRepo, 'y.txt'), 'y\n', 'utf8');
  git(slowRepo, ['add', '-A']);
  hook(slowRepo, '#!/bin/sh\nsleep 45\nexit 0\n');
  const from = Date.now();
  got = send([commitCall('slow', slowRepo, 'a message behind a 45 second hook')]);
  const tookMs = Date.now() - from;
  removeHook(slowRepo);
  if (got['slow']?.read?.word !== 'committed') {
    fail(
      `a commit behind a 45 second hook answered ` +
        `${JSON.stringify(got['slow']?.payload ?? got['slow']?.refused)}. The ` +
        `remote door's own default is 15,000 ms, so an answer at about 15 ` +
        `seconds is a FAILURE of this phase rather than a note.`
    );
  }
  if (tookMs < 40_000) {
    fail(
      `a commit behind a 45 second hook answered in ${String(tookMs)} ms, which ` +
        `is too fast for the hook to have run.`
    );
  }
  step(
    4,
    'the 300,000 ms deadline is in force',
    `a pre-commit hook sleeping 45 seconds, which is longer than the remote ` +
      `door's own 15,000 ms default and shorter than this phase's ` +
      `${String(composed.timeoutMs)} ms, answered ` +
      `${JSON.stringify(got['slow']?.read?.word ?? '')} after ` +
      `${String(tookMs)} ms of wall clock. The commit landed.`
  );
}

// ---------------------------------------------------------------------------
// Leg 5. What a cut link leaves behind, which research 57 section 10 left open
// ---------------------------------------------------------------------------

{
  const cutRepo = makeRepo('p104-cut');
  writeFileSync(join(cutRepo, 'z.txt'), 'z\n', 'utf8');
  git(cutRepo, ['add', '-A']);
  const sleepFor = WAIT_OUT_DEADLINE ? 330 : 30;
  const deadline = WAIT_OUT_DEADLINE ? composed.timeoutMs : 8_000;
  hook(cutRepo, `#!/bin/sh\nsleep ${String(sleepFor)}\nexit 0\n`);
  const before = commitCount(cutRepo);
  const from = Date.now();
  got = send([
    commitCall('cut', cutRepo, 'a message behind a hook past the deadline', {
      timeoutMs: deadline
    })
  ]);
  const tookMs = Date.now() - from;
  // The far side may finish after Tortie stopped listening, so the repository
  // is read again AFTER THE HOOK WOULD HAVE ENDED. The wait is measured from
  // the moment the request was sent rather than from the refusal, because the
  // hook started then. An earlier draft waited half the sleep plus five
  // seconds from the refusal, which on the default run reads the repository
  // 28 s after a 30 s hook started, so it saw a commit that had not landed
  // yet and printed the opposite of the measured answer.
  const untilMs = sleepFor * 1000 + 20_000 - (Date.now() - from);
  if (untilMs > 0) sh('/bin/sleep', [String(Math.ceil(untilMs / 1000))]);
  const readAtMs = Date.now() - from;
  const afterLater = commitCount(cutRepo);
  removeHook(cutRepo);
  if (got['cut']?.refused === undefined) {
    fail(
      `a commit past its deadline answered ${JSON.stringify(got['cut']?.payload)} ` +
        `rather than being cut.`
    );
  }
  step(
    5,
    'a commit past its deadline, and what the far side did afterwards',
    `the door was given ${String(deadline)} ms and the hook slept ` +
      `${String(sleepFor)} s. Tortie was refused after ${String(tookMs)} ms ` +
      `with ${JSON.stringify(String(got['cut']?.refused?.message ?? '').slice(0, 90))}. ` +
      `The repository held ${String(before)} commit(s) before and ` +
      `${String(afterLater)} when it was read again at ${String(readAtMs)} ms, ` +
      `which is after the hook would have finished. So SIGKILL on the local ` +
      `ssh ${
        afterLater === before
          ? 'DID stop the far side shell on this macOS far side'
          : 'did NOT stop the far side shell, and the commit LANDED on that ' +
            'machine after Tortie stopped listening, which is why the ' +
            'sentence a person reads past the deadline says Tortie cannot ' +
            'say whether it ran and offers the read that answers it'
      }. ${
        WAIT_OUT_DEADLINE
          ? `THE SHIPPED 300,000 ms DEADLINE WAS WAITED OUT, so this is the ` +
            `run research 57 section 10 asked for and the answer above is its ` +
            `answer.`
          : `THE SHIPPED 300,000 ms DEADLINE WAS NOT WAITED OUT ON THIS RUN. ` +
            `A door of ${String(deadline)} ms was passed to the same code so ` +
            `the default run finishes in under two minutes. What is measured ` +
            `here ` +
            `is the same mechanism under a shorter door rather than the door ` +
            `a person meets. Run with --deadline to wait out the shipped one, ` +
            `which measured Tortie refused after 300,873 ms with the commit ` +
            `landing over there afterwards, the same answer this run gives.`
      }`
  );
}

// ---------------------------------------------------------------------------
// Leg 6. The hook environment, with one named program
// ---------------------------------------------------------------------------

{
  const envRepo = makeRepo('p104-env');
  writeFileSync(join(envRepo, 'e.txt'), 'e\n', 'utf8');
  git(envRepo, ['add', '-A']);
  hook(
    envRepo,
    '#!/bin/sh\necho "PATH=$PATH" 1>&2\necho "node=$(command -v node || echo NOT-FOUND)" 1>&2\nexit 1\n'
  );
  got = send([commitCall('env', envRepo, 'a message that reads the hook environment')]);
  const hookSaid = String(got['env']?.read?.said ?? '');
  const hookPath = (/PATH=(.*)/.exec(hookSaid) ?? [])[1] ?? '';
  const foundNode = (/node=(.*)/.exec(hookSaid) ?? [])[1] ?? '';
  const interactive = sh('/bin/zsh', ['-lic', 'echo $PATH']).stdout.trim();

  // A hook naming a program by ABSOLUTE path under this run's own scratch root.
  const helper = join(root, 'p104-commit-helper.sh');
  writeFileSync(helper, '#!/bin/sh\necho "p104 helper ran" 1>&2\nexit 1\n', {
    encoding: 'utf8',
    mode: 0o755
  });
  hook(envRepo, `#!/bin/sh\n${helper}\n`);
  got = send([commitCall('absolute', envRepo, 'a message behind an absolute path hook')]);
  const absoluteSaid = String(got['absolute']?.read?.said ?? '');
  if (!absoluteSaid.includes('p104 helper ran')) {
    fail(
      `a hook naming a program by absolute path did not run it. What came ` +
        `back was ${JSON.stringify(absoluteSaid.slice(0, 120))}.`
    );
  }
  removeHook(envRepo);
  step(
    6,
    'what a hook can find on that machine',
    `the hook saw PATH=${JSON.stringify(hookPath)} and answered ` +
      `${JSON.stringify(foundNode)} for command -v node. The operator's own ` +
      `interactive PATH from zsh -lic is ${JSON.stringify(interactive)}. The ` +
      `two ${hookPath === interactive ? 'AGREE' : 'DIFFER'}. A second hook ` +
      `naming a program by ABSOLUTE path under ${root} ran and its words came ` +
      `back. THE nvm ARM WAS NOT EXERCISED, because the far side of this ` +
      `scratch machine is this Mac under the operator's own home and this ` +
      `phase writes nothing there. What was measured is the same mechanism, ` +
      `being a non interactive ssh shell and what it can find.`
  );
}

// ---------------------------------------------------------------------------
// Leg 7. The message, which is the riskiest input in the programme
// ---------------------------------------------------------------------------

{
  const msgRepo = makeRepo('p104-message');
  writeFileSync(join(msgRepo, 'm.txt'), 'm\n', 'utf8');
  git(msgRepo, ['add', '-A']);
  const witness = join(root, 'p104-commit-substitution-ran');
  const message = [
    'a "quoted" subject with é in it',
    '',
    'a line with $HOME and a `backtick` and a ; semicolon',
    `a substitution that would leave a file: $(touch ${witness})`,
    "and a single 'quote' too"
  ].join('\n');
  got = send([commitCall('message', msgRepo, message)]);
  if (got['message']?.read?.word !== 'committed') {
    fail(
      `the multi line message answered ` +
        `${JSON.stringify(got['message']?.payload ?? got['message']?.refused)}.`
    );
  }
  const back = git(msgRepo, ['log', '-1', '--format=%B']).stdout;
  // git adds one trailing newline to a message it stores.
  const readBack = back.replace(/\n+$/, '');
  const same = readBack === message;
  if (!same) {
    fail(
      `the message did not survive. sent ${JSON.stringify(message)} and read ` +
        `back ${JSON.stringify(readBack)}.`
    );
  }
  if (existsSync(witness)) {
    fail(
      `the command substitution in the message RAN on that machine and left ` +
        `${witness}.`
    );
  }
  step(
    7,
    'a multi line message survives byte for byte and nothing in it ran',
    `${String(Buffer.byteLength(message, 'utf8'))} bytes holding a double ` +
      `quote, a single quote, a newline, a dollar sign, a backtick, a ` +
      `semicolon and é were read back with git log -1 --format=%B ON THAT ` +
      `MACHINE and compared byte for byte. They ${same ? 'MATCH' : 'DIFFER'}. ` +
      `The message also held $(touch ${witness}), and that file ` +
      `${existsSync(witness) ? 'IS THERE, so it ran' : 'is not there, so nothing ran'}. ` +
      `The message crosses as one quoted positional through the single ` +
      `shellQuoteArgv call.`
  );
}

// ---------------------------------------------------------------------------
// Leg 8. The outer cap, counted in bytes
// ---------------------------------------------------------------------------

{
  const capRepo = makeRepo('p104-cap');
  writeFileSync(join(capRepo, 'c.txt'), 'c\n', 'utf8');
  git(capRepo, ['add', '-A']);
  // Multi byte characters, so a UTF-16 count and a byte count disagree. `é` is
  // two bytes of UTF-8 and one UTF-16 code unit.
  const overBy = 'é'.repeat(70_000);
  const measured = drive({ op: 'compose', ...ctxInput, message: overBy });
  const before = commitCount(capRepo);
  got = send([commitCall('over', capRepo, overBy)]);
  const after = commitCount(capRepo);
  if (got['over']?.refused === undefined) {
    fail(
      `a message that composes past the cap answered ` +
        `${JSON.stringify(got['over']?.payload)} rather than being refused.`
    );
  }
  if (after !== before) {
    fail('a message past the cap still made a commit.');
  }
  step(
    8,
    'the outer cap holds and is counted in bytes',
    `a message of 70,000 é characters composes ` +
      `${String(measured?.commandBytes ?? -1)} BYTES and ` +
      `${String(measured?.commandUnits ?? -1)} UTF-16 code units, against a ` +
      `limit of ${String(composed.maxBytes)}. The two counts differ by ` +
      `${String((measured?.commandBytes ?? 0) - (measured?.commandUnits ?? 0))}, ` +
      `which is why Phase 96 moved the comparison to Buffer.byteLength. The ` +
      `door refused with ` +
      `${JSON.stringify(String(got['over']?.refused?.message ?? '').slice(0, 90))} ` +
      `and the commit count stayed at ${String(after)}.`
  );
}

// ---------------------------------------------------------------------------
// Leg 9. An unborn branch
// ---------------------------------------------------------------------------

{
  const bornRepo = makeRepo('p104-unborn', { commit: false });
  writeFileSync(join(bornRepo, 'first.txt'), 'first\n', 'utf8');
  git(bornRepo, ['add', '-A']);
  got = send([{ label: 'unborn', args: [bornRepo, 'none', 'the first commit'] }]);
  const sha = headOf(bornRepo);
  if (got['unborn']?.read?.word !== 'committed') {
    fail(
      `the first commit into a repository with none answered ` +
        `${JSON.stringify(got['unborn']?.payload ?? got['unborn']?.refused)}.`
    );
  }
  if (sha === 'none') {
    fail('the first commit answered committed and the repository has no HEAD.');
  }
  step(
    9,
    'the first commit into a repository that had none',
    `the guard crossed as the word none, the answer was ` +
      `${JSON.stringify(got['unborn']?.payload ?? '')}, and HEAD on that ` +
      `machine now reads ${sha}. An unborn branch is a state rather than a ` +
      `special case, and nothing threw.`
  );
}

// ---------------------------------------------------------------------------
// Leg 10. The pure halves, with the send counter read afterwards
// ---------------------------------------------------------------------------

{
  const blob = Buffer.from('pre-commit refused', 'utf8').toString('base64');
  const pure = drive({
    op: 'pure',
    ...ctxInput,
    payloads: [
      'committed none abc1234',
      'moved none 7d1c40a',
      `failed ${blob} 2b9e5f1`,
      'committed none',
      'done none abc1234',
      'failed not!base64 abc1234',
      'committed none ../../etc/passwd'
    ],
    rows: [
      { path: 'staged.ts', origPath: null, status: 'M', indexState: 'M', worktreeState: '.' },
      { path: 'changed.ts', origPath: null, status: 'M', indexState: '.', worktreeState: 'M' },
      { path: 'both.ts', origPath: null, status: 'M', indexState: 'M', worktreeState: 'M' },
      { path: 'conflict.ts', origPath: null, status: 'U', indexState: 'U', worktreeState: 'U' },
      { path: 'untracked.ts', origPath: null, status: 'A', indexState: '?', worktreeState: '?' }
    ],
    identities: [
      'Author identity unknown\n*** Please tell me who you are.',
      "unable to auto-detect email address (got 'x@y.(none)')",
      'fatal: empty ident name not allowed',
      'pre-commit hook failed',
      null
    ]
  });
  if (pure === null) {
    fail('the pure leg did not answer.');
  } else {
    if (pure.sends !== 0) {
      fail(
        `the pure halves and a commit for a machine with no row sent ` +
          `${String(pure.sends)} command(s), and they send none.`
      );
    }
    if (pure.noRow?.threw !== true) {
      fail(
        'a commit for a machine that is not in the machines file did not ' +
          'refuse.'
      );
    }
    step(
      10,
      'the pure halves, and a commit for a machine with no row',
      `parseCommitAnswer read ` +
        `${JSON.stringify((pure.parsed ?? []).map((one) => one.read?.word ?? null))}, ` +
        `where null is a refusal, so the three good shapes parse and the four ` +
        `bad ones do not. stagedPathsOf answered ` +
        `${JSON.stringify(pure.staged)}, which keeps a conflicted row and an ` +
        `untracked row out. identityUnset answered ` +
        `${JSON.stringify((pure.identity ?? []).map((one) => one.answer))} for ` +
        `the four phrasings git printed and for a hook refusal. A commit for a ` +
        `machine with no row refused with ` +
        `${JSON.stringify(String(pure.noRow?.message ?? '').slice(0, 80))}. The ` +
        `send counter is ${String(pure.sends)} afterwards, so none of them ` +
        `contacted anything. The deadline is ${String(pure.timeoutMs)} ms and ` +
        `the answer cap is ${String(pure.answerCapBytes)} bytes.`
    );
    say(
      'NOT PROVEN HERE: main refusing a headSha the renderer drew that its own ' +
        'read disagrees with. That path runs through the confirm gate, which ' +
        'needs Electron keystore, exactly as Phase 103 said of its own module. ' +
        'It is covered by src/main/machines/__tests__/p104-remote-commit.test.ts ' +
        'and by the app driving probe. What IS proven here is the far side half ' +
        'of the same rule, being leg 2.'
    );
  }
}

// ---------------------------------------------------------------------------
// Leg 11. Nothing this phase sends can discard a working tree change
// ---------------------------------------------------------------------------

{
  const rules = [];
  for (const one of composed.catalogue ?? []) {
    if (one.text.includes('git clean')) rules.push(`${one.id} names git clean`);
    if (one.text.includes('--source')) rules.push(`${one.id} names --source`);
    for (const line of one.text.split('\n')) {
      if (line.includes('git restore') && !line.includes('--staged')) {
        rules.push(`${one.id} runs git restore without --staged`);
      }
      if (line.includes('--worktree')) rules.push(`${one.id} names --worktree`);
      if (/\bgit rm\b/.test(line) && !line.includes('--cached')) {
        rules.push(`${one.id} runs git rm without --cached`);
      }
      if (!/(^|[\s;|&(])rm\b/.test(line)) continue;
      if (line.includes('git rm ')) continue;
      rules.push(`${one.id} names rm as a command`);
    }
  }
  for (const broken of rules) fail(`the discard refusal: ${broken}`);

  const inertRepo = makeRepo('p104-inert');
  writeFileSync(join(inertRepo, 'kept.txt'), 'work nobody wants to lose\n', 'utf8');
  writeFileSync(join(inertRepo, 'also.txt'), 'more work\n', 'utf8');
  git(inertRepo, ['add', '-A']);
  hook(inertRepo, '#!/bin/sh\necho "refused on purpose" 1>&2\nexit 1\n');
  const before = fingerprint(inertRepo);
  got = send([commitCall('inert', inertRepo, 'a commit that fails')]);
  const after = fingerprint(inertRepo);
  removeHook(inertRepo);
  if (got['inert']?.read?.word !== 'failed') {
    fail(`the failing commit answered ${JSON.stringify(got['inert']?.payload)}.`);
  }
  if (before !== after) {
    fail(
      `a commit that FAILED changed a file in that folder.\n      before\n` +
        `      ${before.split('\n').join('\n      ')}\n      after\n` +
        `      ${after.split('\n').join('\n      ')}`
    );
  }
  step(
    11,
    'nothing this phase sends can discard a working tree change',
    `the discard rules ran over all ` +
      `${String((composed.catalogue ?? []).length)} scripts and found ` +
      `${String(rules.length)} problem(s). Every file in ${inertRepo} was ` +
      `checksummed with sha256 before a commit that FAILED and after it, and ` +
      `the two lists are ${before === after ? 'IDENTICAL' : 'DIFFERENT'}:\n` +
      `      ${after.split('\n').join('\n      ')}`
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
  '\n#   verdict     what                                                  evidence\n'
);
process.stdout.write('-'.repeat(120) + '\n');
for (const row of rows) {
  process.stdout.write(
    `${String(row.n).padEnd(4)}${String(row.verdict).padEnd(12)}` +
      `${String(row.what).padEnd(54)}${String(row.evidence)}\n`
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
  'NOT MEASURED: no Linux machine was contacted. No signing configuration was ' +
    'exercised anywhere, so hazard 2 of research 57 section 5.6 is answered by ' +
    'design and by one photographed sentence rather than by measurement. The ' +
    'confirm gate, the machines file and the IPC channel are not driven here. ' +
    'The window between main re-read and the far side commit is one round trip ' +
    'wide and nothing here closes it. The far side shell holds a hook whole ' +
    'output in one variable before the cap, and that is not bounded.'
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
  '\nPASS. One real commit landed on a real machine and its sha was read back ' +
    'with git itself, the same request sent twice added one commit and not ' +
    'two, a refusing hook was shown and a loud one was capped, a 45 second ' +
    'hook got its own deadline, a multi line message holding a quote, a ' +
    'backtick and a command substitution came back byte for byte with nothing ' +
    'run, a message past the byte cap was refused before anything crossed, ' +
    'the first commit into a repository with none landed, and every file was ' +
    'byte identical either side of a commit that failed.\n'
);
