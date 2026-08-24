/**
 * `node build/probe-remote-review.mjs`. The Tier 2 live probe of Phase 73
 * item 4, being the read only review of a folder on another machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So four rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The only repository this probe touches is one it makes under /tmp. It
 *     never opens the repository this file lives in, and it runs no git verb
 *     that writes in either of them.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 *  1. THE TWO SIDES ARE THE MACHINE'S OWN BYTES. For every changed file, what
 *     Tortie read is compared byte for byte against `git show HEAD:<path>` and
 *     `cat <path>` run directly in that repository. A sha256 of each side is
 *     printed on both sides of the comparison.
 *  2. THE REVIEW WRITES NOTHING. `git status --porcelain` is captured before
 *     and after and compared byte for byte, and the size and modification time
 *     of every file under `.git` is captured before and after and compared.
 *  3. THE READ IS REFUSED WHILE THE MACHINE IS NOT ANSWERING. The scratch sign
 *     in server is stopped by its recorded pid and the same review is asked
 *     for again. The refusal has to fire. The absence of an answer is not
 *     evidence and this probe does not accept it as any.
 *
 * ---------------------------------------------------------------------------
 * WHAT PHASE 97 ADDED TO IT
 * ---------------------------------------------------------------------------
 * The scratch repository now also holds a `.gitignore` committed in its first
 * commit, one file git is not tracking and one file that `.gitignore` names.
 * Six more things are measured on it:
 *
 *  1. The untracked file reaches the list, in its own array.
 *  2. The ignored file reaches neither array.
 *  3. The tracked list is the same three files it was before this phase.
 *  4. The untracked file opens all green, meaning an empty left side and a
 *     right side equal byte for byte to the file on disk, compared by sha256
 *     on both sides exactly as the tracked files are.
 *  5. The two counts are 3 tracked and 1 untracked.
 *  6. The review still writes nothing, measured over the larger repository.
 *
 * The far side script is unchanged and no new git verb is run. The untracked
 * entries were already in the one answer this probe has always asked for.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * was contacted. The repository is one this file made two minutes ago and is
 * not a repository anybody works in.
 *
 * Every scratch file carries a `p73-` prefix, except the three Phase 97 files
 * inside the scratch repository, which carry a `p97-` prefix.
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
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
const PORT = 45742;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p73-rev-${String(process.pid)}`,
  'p73-review'
);

const root = join('/tmp', `p73-review-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p73-review] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p73-review] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p73-review] ${String(n)}. ${what}: ${evidence}\n`);

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

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch repository, made here and nowhere near the tree this file is in
// ---------------------------------------------------------------------------

const work = join(root, 'p73-repo');
mkdirSync(work, { recursive: true, mode: 0o700 });
const git = (...args) =>
  sh('/usr/bin/git', ['-C', work, ...args], {
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Probe',
      GIT_AUTHOR_EMAIL: 'probe@example.invalid',
      GIT_COMMITTER_NAME: 'Probe',
      GIT_COMMITTER_EMAIL: 'probe@example.invalid'
    }
  });

git('init', '-q', '-b', 'main');
writeFileSync(join(work, 'kept.txt'), 'one\ntwo\nthree\n', 'utf8');
writeFileSync(join(work, 'moved.txt'), 'this file gets a new name\n', 'utf8');
// PHASE 97. The ignore rule is committed in the first commit, so the rule is
// itself a tracked file that has not changed and cannot show up as one.
writeFileSync(join(work, '.gitignore'), 'p97-ignored.txt\n', 'utf8');
git('add', '-A');
git('commit', '-q', '-m', 'the first commit');

// Three changes, one of each kind a review has to draw.
writeFileSync(join(work, 'kept.txt'), 'one\ntwo\nTHREE, changed\n', 'utf8');
writeFileSync(join(work, 'added.txt'), 'a file that was not in the commit\n', 'utf8');
git('add', 'added.txt');
git('mv', 'moved.txt', 'renamed.txt');

// PHASE 97. One file git is not tracking, being what an agent on that machine
// just made, and one file the committed rule names. They are written before the
// pause below, so the racily clean guard covers them too.
writeFileSync(join(work, 'p97-new.txt'), 'a file an agent just made\nsecond line\n', 'utf8');
writeFileSync(join(work, 'p97-ignored.txt'), 'build output nobody asked for\n', 'utf8');

// A pause and then two settling runs, so the index stat cache is up to date and
// the review's own read cannot be the thing that rewrites it.
//
// THE PAUSE IS LOAD BEARING AND IT WAS MEASURED. git marks an entry "racily
// clean" when the file's modification time equals the index's own, which is
// what happens when a probe writes three files and reads the status inside the
// same second. The next status then rewrites the index to settle the race, and
// on one run of this probe that rewrite landed inside the review and was
// reported as the review having changed a file. It had not. One second and a
// bit puts every file's modification time behind the index's.
sh('/bin/sleep', ['1.2']);
git('status', '--porcelain');
git('status', '--porcelain');

const porcelainBefore = git('status', '--porcelain').stdout;

/** Every file under .git, with its size and its modification time. */
function gitDirFacts() {
  const facts = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      try {
        const st = statSync(path);
        facts.set(path, `${String(st.size)}:${String(st.mtimeMs)}`);
      } catch {
        /* a file that vanished between the listing and the read */
      }
    }
  };
  walk(join(work, '.git'));
  return facts;
}

const gitBefore = gitDirFacts();
step(1, 'the scratch repository', `${work}, ${String(gitBefore.size)} file(s) under .git`);

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p73-review-driver.ts');
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
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const control = await import(REPO + '/src/main/machines/control-plane');
const review = await import(REPO + '/src/main/machines/remote-review');
const copy = await import(REPO + '/src/main/machines/remote-copy');

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

try {
  context.registerRemoteMachineContext(ctx);
  if (input.connected !== false) {
    await remotePath.captureRemotePath(ctx);
    // The link has to read as answering for the one door to open at all.
    control.noteMachineAnswered(ctx.machineId, Date.now());
  } else {
    // The machine is DOWN and everything else about it is as it was while it
    // was up: a registered context, and a program search list recorded for
    // this connection. That is what makes the next line prove the one property
    // this leg is about, being that the door refuses on the LINK rather than
    // on some earlier condition happening to fail first.
    context.setMachineRemotePath(ctx.machineId, '/usr/bin:/bin');
    control.noteMachineQuiet(ctx.machineId, 'the probe stopped the machine');
  }
  if (input.op === 'list') {
    out = { ok: true, list: await review.reviewFilesOn({ machineId: ctx.machineId, cwd: input.cwd }) };
  } else if (input.op === 'file') {
    out = {
      ok: true,
      pair: await review.reviewFileOn({
        machineId: ctx.machineId,
        repoPath: input.repoPath,
        path: input.path,
        origPath: input.origPath ?? null
      })
    };
  }
} catch (err) {
  const payload = (err as { payload?: { message?: string; detail?: string } })
    .payload;
  out = {
    ok: false,
    message: String(payload?.message ?? (err as Error).message),
    detail: String(payload?.detail ?? '')
  };
}

writeFileSync(
  outPath,
  JSON.stringify({ ...(out as object), notConnected: copy.MACHINE_NOT_CONNECTED }),
  'utf8'
);
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p73-review-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p73-review-out-${String(driverCalls)}.json`);
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
        GMUX_SMOKE: 'probe-remote-review',
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
  prefix: 'p73-rev',
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
  const tmuxTmp = machineTmuxTmp('p73-rev', 'one');
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
  controlPath: join(root, 'p73-rev-control'),
  hostKeys: join(root, 'p73-rev-known-machines'),
  userHostKeys: join(root, 'p73-rev-person-known-hosts')
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
// Leg 1. The list
// ---------------------------------------------------------------------------

const listed = drive({ ...ctxInput, op: 'list', cwd: work });
if (listed === null || listed.ok !== true) {
  fail(
    `the review did not list anything. ${String(listed?.message ?? '')} ` +
      `${String(listed?.detail ?? '')}`
  );
  stopEverything();
  process.exit(1);
}

const list = listed.list;
const untracked = Array.isArray(list.untracked) ? list.untracked : [];
step(
  2,
  'the repository the machine reported',
  `${String(list.repoPath)} (${String(list.files.length)} of ${String(list.total)} ` +
    `changed, ${String(untracked.length)} of ${String(list.untrackedTotal)} untracked)`
);
for (const file of list.files) {
  step(
    2,
    `  changed file`,
    `${String(file.status)} ${String(file.path)}` +
      (file.origPath === null ? '' : ` (was ${String(file.origPath)})`)
  );
}
for (const file of untracked) {
  step(2, `  untracked file`, String(file.path));
}

const wanted = ['added.txt', 'kept.txt', 'renamed.txt'];
const got = list.files.map((one) => one.path).sort();
if (JSON.stringify(got) !== JSON.stringify(wanted)) {
  fail(`the list was ${got.join(', ')} and the repository holds ${wanted.join(', ')}.`);
}

// PHASE 97. The untracked group, and the file the committed rule names.
const wantedNew = ['p97-new.txt'];
const gotNew = untracked.map((one) => one.path).sort();
if (JSON.stringify(gotNew) !== JSON.stringify(wantedNew)) {
  fail(
    `the untracked group was ${gotNew.join(', ') || '(empty)'} and the ` +
      `repository holds ${wantedNew.join(', ')}.`
  );
}
const everyPath = [...list.files, ...untracked].map((one) => String(one.path));
if (everyPath.includes('p97-ignored.txt')) {
  fail('an ignored file reached the list. A build directory is not a change.');
}
step(
  2,
  '  the ignored file across both groups',
  everyPath.includes('p97-ignored.txt')
    ? 'IT IS LISTED, which it must not be'
    : `not listed, out of ${String(everyPath.length)} listed path(s)`
);
if (list.total !== 3 || list.untrackedTotal !== 1) {
  fail(
    `the counts were ${String(list.total)} changed and ` +
      `${String(list.untrackedTotal)} untracked, and the repository holds 3 and 1.`
  );
}
step(
  2,
  '  the two counts',
  `${String(list.total)} changed, ${String(list.untrackedTotal)} untracked`
);

// ---------------------------------------------------------------------------
// Leg 2. Every side, byte for byte against git's own answer
// ---------------------------------------------------------------------------

let compared = 0;
// PHASE 97. The untracked file is read the same way and compared the same way.
// `git show HEAD:p97-new.txt` fails for it, so the truth's left side is empty,
// which is what makes the tab all green.
for (const file of [...list.files, ...untracked]) {
  const answer = drive({
    ...ctxInput,
    op: 'file',
    repoPath: list.repoPath,
    path: file.path,
    origPath: file.origPath
  });
  if (answer === null || answer.ok !== true) {
    fail(`Tortie could not read ${String(file.path)}: ${String(answer?.message ?? '')}`);
    continue;
  }
  const pair = answer.pair;
  const headPath = file.origPath ?? file.path;
  const headSide = git('show', `HEAD:${headPath}`);
  const truth = {
    old: headSide.code === 0 ? headSide.stdout : '',
    now: existsSync(join(work, file.path))
      ? readFileSync(join(work, file.path), 'utf8')
      : ''
  };
  const same =
    pair.oldContents === truth.old && pair.newContents === truth.now;
  step(
    3,
    `both sides of ${String(file.path)}`,
    `Tortie ${sha256(pair.oldContents).slice(0, 12)} / ` +
      `${sha256(pair.newContents).slice(0, 12)}, git ` +
      `${sha256(truth.old).slice(0, 12)} / ${sha256(truth.now).slice(0, 12)} ` +
      `(${same ? 'identical' : 'DIFFERENT'})`
  );
  if (!same) {
    fail(`the two sides of ${String(file.path)} are not the repository's own bytes.`);
  }
  if (file.path === 'p97-new.txt' && pair.oldContents !== '') {
    fail(
      'the untracked file came back with something on its left side, so the ' +
        'tab would not be all green.'
    );
  }
  compared += 1;
}
step(4, 'files compared byte for byte', String(compared));

// ---------------------------------------------------------------------------
// Leg 3. Nothing was written, measured on both halves
// ---------------------------------------------------------------------------

const gitAfter = gitDirFacts();
const moved = [];
for (const [path, facts] of gitAfter) {
  const before = gitBefore.get(path);
  if (before === undefined) {
    moved.push(`${path} appeared`);
    continue;
  }
  if (before !== facts) moved.push(`${path} ${before} became ${facts}`);
}
for (const path of gitBefore.keys()) {
  if (!gitAfter.has(path)) moved.push(`${path} vanished`);
}
step(
  5,
  'every file under .git across the review',
  moved.length === 0
    ? `${String(gitAfter.size)} file(s), all unchanged in size and modification time`
    : moved.join('; ')
);
if (moved.length > 0) {
  fail(
    `the review changed ${String(moved.length)} file(s) under .git. If the only ` +
      `one is .git/index, git refreshed its own stat cache while it read, ` +
      `which is a write git makes rather than one Tortie makes. Either way it ` +
      `is a change and this probe reports it rather than excusing it.`
  );
}

const porcelainAfter = git('status', '--porcelain').stdout;
step(
  6,
  'git status --porcelain across the review',
  porcelainBefore === porcelainAfter
    ? `${String(porcelainBefore.length)} bytes, identical`
    : 'DIFFERENT'
);
if (porcelainBefore !== porcelainAfter) {
  fail('the working tree on the machine is not what it was before the review.');
}

// ---------------------------------------------------------------------------
// Leg 4. The refusal, watched firing rather than inferred from silence
// ---------------------------------------------------------------------------

machine.stop();

const sshCount = () =>
  sh('/bin/ps', ['-Axo', 'args='])
    .stdout.split('\n')
    .filter((one) => one.includes('/usr/bin/ssh ')).length;

const sshBefore = sshCount();
const refused = drive({ ...ctxInput, op: 'list', cwd: work, connected: false });
const sshAfter = sshCount();
step(
  7,
  'the same review with the machine stopped',
  refused === null
    ? 'the driver did not answer'
    : refused.ok === true
      ? 'IT ANSWERED, which it must not'
      : String(refused.message)
);
step(
  8,
  'sign in processes across the refusal',
  `${String(sshBefore)} before, ${String(sshAfter)} after`
);
if (refused === null || refused.ok === true) {
  fail(
    'a review of a machine Tortie is not connected to was not refused. An ' +
      'empty answer is not evidence and this probe does not accept one.'
  );
} else if (refused.message !== refused.notConnected) {
  fail(
    'the review was refused, but not by the connected only rule. It said ' +
      `"${String(refused.message)}" and the rule says ` +
      `"${String(refused.notConnected)}".`
  );
}
if (sshAfter > sshBefore) {
  fail('the refused review started a sign in process. Nothing may be sent.');
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

stopEverything();
say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac. No Linux machine and ' +
    'no machine of the operator’s was contacted.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
