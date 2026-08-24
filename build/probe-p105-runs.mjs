/**
 * `node build/probe-p105-runs.mjs`. The live probe of Phase 105, being the
 * workflow runs for the branch checked out on another machine.
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
 *  4. The only repositories this probe touches are ones it makes under /tmp. It
 *     never opens the repository this file lives in, and it runs no git verb
 *     that writes in any repository the operator has.
 *  5. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p105-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Eighteen rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. The branch Tortie learned equals `git symbolic-ref --quiet --short HEAD`
 *     run directly in that repository.
 *  3. The owner and repository Tortie learned equal `git remote get-url origin`
 *     run directly there, normalized.
 *  4. The head sha Tortie learned equals `git rev-parse HEAD` run directly
 *     there.
 *  5. A subdirectory two levels down answers the same three facts.
 *  6. A linked worktree on a second branch answers that second branch and still
 *     finds the origin. THIS IS THE ROW THAT WOULD FAIL ON `--absolute-git-dir`.
 *  7. A detached head answers `noBranch` and never the word `HEAD`.
 *  8. A repository with no commits answers `noBranch` with a null head sha, and
 *     never the literal string `HEAD`.
 *  9. A repository whose origin is not on github.com answers `notGitHub`, and NO
 *     gh PROCESS WAS CREATED.
 * 10. A folder that is not a repository answers `notRepo`.
 * 11. A folder that is not there answers `missing`, and a folder at mode 000
 *     answers `denied`.
 * 12. NO CREDENTIAL AND NO gh CROSSED. The exact bytes
 *     `composeRemoteScriptCommand` produced are printed and searched for the
 *     nine words a credential would travel in. Zero hits is the pass.
 * 13. NO gh RAN ON THE FAR SIDE. A program named `gh` is placed in every folder
 *     the far side's script changes into, and the witness file it would write is
 *     asserted absent after every read. Every gh process Tortie made had its
 *     working directory on THIS Mac.
 * 14. THE RUNS THEMSELVES. With a fake gh returning a canned answer, the rows
 *     Tortie drew equal the rows in that answer field by field, and a row
 *     missing a required field lands in `issues`.
 * 15. Three reads of the whole path, in seconds.
 * 16. The read wrote nothing. `git status --porcelain` is compared byte for byte
 *     before and after, and the size and modification time of every file under
 *     `.git` are compared before and after.
 * 17. THE END TO END DEMONSTRATION, with the REAL gh on this Mac. The scratch
 *     repository's origin is set to a public repository that has runs and a
 *     branch that has them, and the read is run with no fake gh at all. The
 *     branch and the repository came from the loopback machine and the runs came
 *     from GitHub through this Mac's own gh. When gh is missing or not signed in
 *     this row prints SKIPPED with the reason, and a skipped row is never a pass.
 * 18. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's is
 * contacted, so GNU git, GNU awk and GNU base64 are reasoned about from POSIX
 * rather than measured. Row 13's witness sits in the folders the script changes
 * into, so what it catches is a script that reached for `gh` on the current
 * directory; that no `gh` on a second computer's own PATH could be reached is
 * covered by row 12, which shows the bytes hold no such word at all. Row 18
 * contacts github.com from this Mac when it runs. No repository with a large
 * number of runs was read, and nothing here measures two remote tabs at once.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
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
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact over ssh. */
const TARGET = '127.0.0.1';
const PORT = 45805;

/** The public repository and branch row 18 asks GitHub about. */
const REAL_REPO = 'cli/cli';
const REAL_BRANCH = 'trunk';

/**
 * The nine words a credential would have to travel in, composed from pieces so
 * this file's own text does not answer its own search.
 */
const CREDENTIAL_WORDS = [
  `g${'h'}`,
  `GH${'_'}TOKEN`,
  `GITHUB${'_'}TOKEN`,
  `GH${'_'}HOST`,
  `Author${'i'}zation`,
  `hosts${'.'}yml`,
  `.config/g${'h'}`,
  `net${'r'}c`,
  `cu${'r'}l`
];

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p105-runs-${String(process.pid)}`,
  'p105-runs'
);

const root = join('/tmp', `p105-runs-${String(process.pid)}`);
const witness = join(root, 'p105-gh-witness');
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p105-runs] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p105-runs] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p105-runs] ${String(n)}. ${what}: ${evidence}\n`);

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

/** How many sessions the operator's own tmux server holds. Read only. */
function operatorSessions() {
  const out = sh('/bin/sh', [
    '-c',
    'tmux -L gmux list-sessions 2>/dev/null | wc -l'
  ]);
  return out.stdout.trim();
}

const sessionsBefore = operatorSessions();
step(1, 'the operator’s sessions on -L gmux, before', sessionsBefore);

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch repositories, made here and nowhere near the tree this file is in
// ---------------------------------------------------------------------------

const gitEnv = {
  GIT_AUTHOR_NAME: 'Probe',
  GIT_AUTHOR_EMAIL: 'probe@example.invalid',
  GIT_COMMITTER_NAME: 'Probe',
  GIT_COMMITTER_EMAIL: 'probe@example.invalid'
};

const gitIn = (dir, ...args) =>
  sh('/usr/bin/git', ['-C', dir, ...args], {
    env: { ...process.env, ...gitEnv }
  });

/**
 * The witness. If anything ever ran a program called `gh` with the folder it
 * was standing in on its path, this file appears.
 */
function plantWitness(dir) {
  const path = join(dir, 'gh');
  writeFileSync(
    path,
    `#!/bin/sh\nprintf 'a gh ran in %s\\n' "$(pwd)" >> ${witness}\n`,
    'utf8'
  );
  chmodSync(path, 0o755);
}

const work = join(root, 'p105-repo');
mkdirSync(work, { recursive: true, mode: 0o700 });
gitIn(work, 'init', '-q', '-b', 'main');
gitIn(work, 'remote', 'add', 'origin', 'git@github.com:owner/repo.git');
mkdirSync(join(work, 'a', 'b'), { recursive: true, mode: 0o700 });
writeFileSync(join(work, 'p105-one.ts'), 'export const one = 1;\n', 'utf8');
writeFileSync(join(work, 'a', 'b', 'two.ts'), 'export const two = 2;\n', 'utf8');
gitIn(work, 'add', '-A');
gitIn(work, 'commit', '-q', '-m', 'the first commit');

// The linked worktree, on a second branch. Its own `.git` is a FILE pointing at
// the shared directory, and only `--git-common-dir` reaches the config that
// holds the origin.
const linked = join(root, 'p105-worktree');
gitIn(work, 'worktree', 'add', '-q', '-b', 'second', linked);

// A detached head, made in a clone so the first repository keeps its branch.
const detached = join(root, 'p105-detached');
sh('/usr/bin/git', ['clone', '-q', work, detached], {
  env: { ...process.env, ...gitEnv }
});
gitIn(detached, 'checkout', '-q', '--detach', 'HEAD');
// THE ORIGIN HAS TO BE ON github.com FOR THIS ROW TO MEAN ANYTHING. A clone
// points at the folder it came from, and a folder is not a GitHub address, so
// without this line the read answers notGitHub and the detached head is never
// reached at all.
gitIn(detached, 'remote', 'set-url', 'origin', 'git@github.com:owner/repo.git');

// A repository with no commits at all.
const empty = join(root, 'p105-empty');
mkdirSync(empty, { recursive: true, mode: 0o700 });
gitIn(empty, 'init', '-q', '-b', 'main');
gitIn(empty, 'remote', 'add', 'origin', 'https://github.com/owner/empty.git');

// A repository whose origin is not on github.com. It must reach no gh at all.
const elsewhere = join(root, 'p105-elsewhere');
mkdirSync(elsewhere, { recursive: true, mode: 0o700 });
gitIn(elsewhere, 'init', '-q', '-b', 'main');
gitIn(elsewhere, 'remote', 'add', 'origin', 'git@gitlab.com:owner/repo.git');
writeFileSync(join(elsewhere, 'p105-x.ts'), 'export const x = 1;\n', 'utf8');
gitIn(elsewhere, 'add', '-A');
gitIn(elsewhere, 'commit', '-q', '-m', 'one');

// A folder with no git in it, a folder that is not there, and one the account
// cannot read.
const plain = join(root, 'p105-plain');
mkdirSync(plain, { recursive: true, mode: 0o700 });
writeFileSync(join(plain, 'p105-plain.ts'), 'export const plain = 1;\n', 'utf8');
const absent = join(root, 'p105-never-made');
const denied = join(root, 'p105-denied');
mkdirSync(denied, { recursive: true, mode: 0o700 });

for (const dir of [work, join(work, 'a', 'b'), linked, detached, empty, elsewhere, plain]) {
  plantWitness(dir);
}
chmodSync(denied, 0o000);

// A pause and then two settling runs, so the index stat cache is up to date and
// this probe's own read cannot be the thing that rewrites it. THE PAUSE IS LOAD
// BEARING and it was measured by the Phase 73 probe: git marks an entry "racily
// clean" when the file's modification time equals the index's own, and the next
// status then rewrites the index.
sh('/bin/sleep', ['1.2']);
gitIn(work, 'status', '--porcelain');
gitIn(work, 'status', '--porcelain');

const porcelainBefore = gitIn(work, 'status', '--porcelain').stdout;

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

say(
  `the scratch repositories are under ${root}, ` +
    `${String(gitBefore.size)} file(s) under the first one's .git`
);

// ---------------------------------------------------------------------------
// The truth, read in those repositories and never in this one
// ---------------------------------------------------------------------------

const truthBranch = (dir) =>
  sh('/bin/sh', ['-c', 'git symbolic-ref --quiet --short HEAD'], { cwd: dir })
    .stdout.trim();
const truthOrigin = (dir) =>
  sh('/bin/sh', ['-c', 'git remote get-url origin'], { cwd: dir }).stdout.trim();
const truthHead = (dir) =>
  sh('/bin/sh', ['-c', 'git rev-parse HEAD'], { cwd: dir }).stdout.trim();

/** `owner/repo` from an address, the two steps main takes. */
function ownerRepoOf(url) {
  const scp = /^(?:[^@/\s]+@)?github\.com:(.+)$/i.exec(url.trim());
  const path =
    scp !== null
      ? (scp[1] ?? '')
      : /^https:\/\/github\.com\/(.+)$/i.exec(url.trim())?.[1] ?? '';
  return path.replace(/\.git$/i, '').replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// The canned gh answer row 14 is measured against
// ---------------------------------------------------------------------------

const CANNED_RUNS = [
  {
    databaseId: 8801,
    number: 41,
    workflowName: 'CI',
    displayTitle: 'the newest one',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: '1'.repeat(40),
    createdAt: '2026-08-20T09:00:00Z',
    startedAt: '2026-08-20T09:00:04Z',
    updatedAt: '2026-08-20T09:03:00Z',
    url: 'https://github.com/owner/repo/actions/runs/8801'
  },
  {
    databaseId: 8800,
    number: 40,
    workflowName: 'Nightly',
    displayTitle: 'the one before it',
    status: 'in_progress',
    conclusion: null,
    event: 'schedule',
    headBranch: 'main',
    headSha: '2'.repeat(40),
    createdAt: '2026-08-20T08:00:00Z',
    startedAt: '2026-08-20T08:00:03Z',
    updatedAt: '2026-08-20T08:01:00Z',
    url: 'https://github.com/owner/repo/actions/runs/8800'
  }
];

/** One row GitHub sent with a required field missing. It lands in `issues`. */
const CANNED_BAD = { ...CANNED_RUNS[0], databaseId: 8799, url: undefined };

const CANNED_STDOUT = JSON.stringify([...CANNED_RUNS, CANNED_BAD]);

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p105-runs-driver.ts');
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
const runs = await import(REPO + '/src/main/machines/remote-runs');
const door = await import(REPO + '/src/main/machines/remote-run');
const catalogue = await import(REPO + '/src/main/machines/remote-scripts');

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

// Every gh process Tortie asked for, with the argv and the working directory it
// was given. The fake never reaches github.com and never reads a token.
const ghCalls: Array<{ op: string; argv: string[]; cwd: string; hasToken: boolean }> = [];
let current = '';
const spawner = (
  _bin: string,
  argv: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
) => {
  ghCalls.push({
    op: current,
    argv: [...argv],
    cwd: options.cwd,
    hasToken:
      options.env['GH_TOKEN'] !== undefined ||
      options.env['GITHUB_TOKEN'] !== undefined
  });
  return Promise.resolve({
    stdout: String(input.cannedStdout),
    stderr: '',
    code: 0,
    timedOut: false,
    spawnError: null
  });
};

const answers: unknown[] = [];

try {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  // The link has to read as answering for the one door to open at all.
  control.noteMachineAnswered(ctx.machineId, Date.now());
  for (const op of input.ops as Record<string, unknown>[]) {
    current = String(op.name);
    try {
      // An op marked real uses the REAL gh on this Mac, with no seam.
      const answer =
        op.real === true
          ? await runs.readRunsOnMachine({
              machineId: ctx.machineId,
              cwd: String(op.cwd)
            })
          : await runs.readRunsOnMachine(
              { machineId: ctx.machineId, cwd: String(op.cwd) },
              { ghSpawner: spawner, ghBin: '/usr/bin/gh' }
            );
      answers.push({ ok: true, name: op.name, answer });
    } catch (err) {
      const payload = (err as { payload?: { message?: string; detail?: string } })
        .payload;
      answers.push({
        ok: false,
        name: op.name,
        message: String(payload?.message ?? (err as Error).message),
        detail: String(payload?.detail ?? '')
      });
    }
  }
} catch (err) {
  answers.push({ ok: false, name: 'setup', message: String((err as Error).message) });
}

// The exact bytes the door composes for this read, so a reader can see them
// rather than trust a search over them. PURE: nothing is sent by this line.
const script = catalogue.remoteScript('repo-facts');
const composed =
  script === null ? '' : door.composeRemoteScriptCommand(script, [String(input.showCwd)]);

writeFileSync(outPath, JSON.stringify({ answers, ghCalls, composed }), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p105-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p105-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 300_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p105-runs',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer. It printed:\n` +
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
  prefix: 'p105',
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
  const tmuxTmp = machineTmuxTmp('p105', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
  // The folder at mode 000 has to be readable again before it can be removed.
  try {
    chmodSync(denied, 0o700);
  } catch {
    /* it was already gone */
  }
  // Every scratch repository, key and driver file this run wrote. Nothing
  // outside this one directory is removed, and the directory name carries this
  // process id, so a run cannot reach another run's files.
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(2);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);

const ctxInput = {
  machineId: 'p105-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p105-control'),
  hostKeys: join(root, 'p105-known-machines'),
  userHostKeys: join(root, 'p105-person-known-hosts'),
  cannedStdout: CANNED_STDOUT,
  showCwd: work
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
// One process, every read, so the connection is opened once
// ---------------------------------------------------------------------------

const driven = drive({
  ...ctxInput,
  ops: [
    { name: 'top', cwd: work },
    { name: 'again', cwd: work },
    { name: 'third', cwd: work },
    { name: 'deep', cwd: join(work, 'a', 'b') },
    { name: 'worktree', cwd: linked },
    { name: 'detached', cwd: detached },
    { name: 'empty', cwd: empty },
    { name: 'elsewhere', cwd: elsewhere },
    { name: 'plain', cwd: plain },
    { name: 'absent', cwd: absent },
    { name: 'denied', cwd: denied }
  ]
});

if (driven === null) {
  stopEverything();
  process.exit(1);
}

const byName = new Map();
for (const row of driven.answers ?? []) byName.set(row.name, row);

function answerFor(name) {
  const row = byName.get(name);
  if (row === undefined || row.ok !== true) {
    fail(
      `the read called "${name}" did not answer. ` +
        `${String(row?.message ?? '')} ${String(row?.detail ?? '')}`
    );
    return null;
  }
  return row.answer;
}

// ---------------------------------------------------------------------------
// Rows 2 to 4. The three facts, against git's own answer in that repository
// ---------------------------------------------------------------------------

const top = answerFor('top');
const wantBranch = truthBranch(work);
const wantOwnerRepo = ownerRepoOf(truthOrigin(work));
const wantHead = truthHead(work);

if (top !== null) {
  step(
    2,
    'the branch, against git’s own answer',
    `Tortie ${String(top.branch)}, git ${wantBranch}, mode ${String(top.mode)}`
  );
  if (top.branch !== wantBranch || top.mode !== 'ok') {
    fail(
      `Tortie read the branch as ${String(top.branch)} and git reads it as ` +
        `${wantBranch}, with mode ${String(top.mode)}.`
    );
  }

  step(
    3,
    'the repository, against git’s own answer',
    `Tortie ${String(top.ownerRepo)}, git ${wantOwnerRepo}`
  );
  if (top.ownerRepo !== wantOwnerRepo) {
    fail(
      `Tortie read the repository as ${String(top.ownerRepo)} and git's own ` +
        `origin normalizes to ${wantOwnerRepo}.`
    );
  }

  step(
    4,
    'the commit, against git’s own answer',
    `Tortie ${String(top.headSha)}, git ${wantHead}`
  );
  if (top.headSha !== wantHead) {
    fail(
      `Tortie read the commit as ${String(top.headSha)} and git reads it as ` +
        `${wantHead}.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 5 and 6. Two levels down, and the linked worktree
// ---------------------------------------------------------------------------

const deep = answerFor('deep');
if (deep !== null) {
  step(
    5,
    'a subdirectory two levels down',
    `mode ${String(deep.mode)}, branch ${String(deep.branch)}, repository ` +
      `${String(deep.ownerRepo)}, commit ${String(deep.headSha).slice(0, 12)}`
  );
  if (
    deep.mode !== 'ok' ||
    deep.branch !== wantBranch ||
    deep.ownerRepo !== wantOwnerRepo ||
    deep.headSha !== wantHead
  ) {
    fail(
      'a folder two levels inside the repository did not answer the same ' +
        'three facts as its top level.'
    );
  }
}

const worktree = answerFor('worktree');
if (worktree !== null) {
  const wantWorktreeBranch = truthBranch(linked);
  step(
    6,
    'a linked worktree on a second branch',
    `mode ${String(worktree.mode)}, branch ${String(worktree.branch)}, git ` +
      `${wantWorktreeBranch}, repository ${String(worktree.ownerRepo)}`
  );
  if (
    worktree.mode !== 'ok' ||
    worktree.branch !== wantWorktreeBranch ||
    worktree.ownerRepo !== wantOwnerRepo
  ) {
    fail(
      `a linked worktree answered mode ${String(worktree.mode)}, branch ` +
        `${String(worktree.branch)} and repository ` +
        `${String(worktree.ownerRepo)}. It answers ${wantWorktreeBranch} and ` +
        `${wantOwnerRepo}. THIS IS THE ROW THAT FAILS ON --absolute-git-dir, ` +
        `because a worktree's own git directory holds no origin.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 7 and 8. The two shapes that report no branch
// ---------------------------------------------------------------------------

const det = answerFor('detached');
if (det !== null) {
  step(
    7,
    'a detached head',
    `mode ${String(det.mode)}, branch ${String(det.branch)}, commit ` +
      `${String(det.headSha).slice(0, 12)}`
  );
  if (det.mode !== 'noBranch' || det.branch !== null) {
    fail(
      `a detached head answered mode ${String(det.mode)} with branch ` +
        `${String(det.branch)}. It answers noBranch with no branch at all, and ` +
        `never the word HEAD.`
    );
  }
  if (det.branch === 'HEAD') {
    fail('a detached head reported a branch called HEAD.');
  }
}

const fresh = answerFor('empty');
if (fresh !== null) {
  step(
    8,
    'a repository with no commits',
    `mode ${String(fresh.mode)}, branch ${String(fresh.branch)}, commit ` +
      `${String(fresh.headSha)}`
  );
  if (
    fresh.mode !== 'noBranch' ||
    fresh.branch !== null ||
    fresh.headSha !== null
  ) {
    fail(
      `a repository with no commits answered mode ${String(fresh.mode)}, ` +
        `branch ${String(fresh.branch)} and commit ${String(fresh.headSha)}. ` +
        `It answers noBranch with neither, and never the literal string HEAD.`
    );
  }
  if (fresh.headSha === 'HEAD') {
    fail('a repository with no commits reported the literal string HEAD as a commit.');
  }
}

// ---------------------------------------------------------------------------
// Rows 9 to 11. The four folders that reach GitHub not at all
// ---------------------------------------------------------------------------

const ghCalls = driven.ghCalls ?? [];
const ghFor = (name) => ghCalls.filter((one) => one.op === name);

const other = answerFor('elsewhere');
if (other !== null) {
  step(
    9,
    'an origin that is not on github.com',
    `mode ${String(other.mode)}, repository ${String(other.ownerRepo)}, ` +
      `${String(ghFor('elsewhere').length)} gh process(es)`
  );
  if (other.mode !== 'notGitHub' || ghFor('elsewhere').length !== 0) {
    fail(
      `a repository whose origin is not on github.com answered mode ` +
        `${String(other.mode)} and made ` +
        `${String(ghFor('elsewhere').length)} gh process(es). It answers ` +
        `notGitHub and makes none.`
    );
  }
}

const notRepo = answerFor('plain');
if (notRepo !== null) {
  step(10, 'a folder that is not a repository', `mode ${String(notRepo.mode)}`);
  if (notRepo.mode !== 'notRepo') {
    fail(`a folder git does not track answered ${String(notRepo.mode)}.`);
  }
}

const gone = answerFor('absent');
const shut = answerFor('denied');
if (gone !== null && shut !== null) {
  step(
    11,
    'a folder that is not there, and one the account cannot read',
    `${String(gone.mode)} and ${String(shut.mode)}`
  );
  if (gone.mode !== 'missing') {
    fail(`a folder that is not on that machine answered ${String(gone.mode)}.`);
  }
  if (shut.mode !== 'denied') {
    fail(
      `a folder the account cannot read answered ${String(shut.mode)}. It ` +
        `answers denied, which names the cause, rather than a word that says ` +
        `the machine did not answer.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 12. The exact bytes that crossed
// ---------------------------------------------------------------------------

const composed = String(driven.composed ?? '');
const hits = CREDENTIAL_WORDS.filter((word) => composed.includes(word));
say(`the bytes this read composed, in full:\n${composed}`);
step(
  12,
  'no credential and no gh in what crossed',
  `${String(composed.length)} bytes, ${String(hits.length)} hit(s) across ` +
    `${String(CREDENTIAL_WORDS.length)} searched word(s)` +
    (hits.length === 0 ? '' : `: ${hits.join(', ')}`)
);
if (composed.length === 0) {
  fail('the door composed nothing, so there were no bytes to search.');
}
if (hits.length > 0) {
  fail(
    `the bytes that crossed name ${hits.join(', ')}. They may name none of ` +
      `them: the gh program runs on this Mac and never leaves it.`
  );
}

// ---------------------------------------------------------------------------
// Row 13. The witness, and where every gh process stood
// ---------------------------------------------------------------------------

const witnessFired = existsSync(witness);
const wrongCwd = ghCalls.filter((one) => one.cwd !== homedir());
const withToken = ghCalls.filter((one) => one.hasToken === true);
step(
  13,
  'no gh ran on the far side',
  `the witness file ${witnessFired ? 'EXISTS' : 'does not exist'}; ` +
    `${String(ghCalls.length)} gh process(es) here, ` +
    `${String(ghCalls.length - wrongCwd.length)} of them standing in ` +
    `${homedir()}; ${String(withToken.length)} of them given a token by Tortie`
);
if (witnessFired) {
  fail(
    `a program called gh ran on the far side. The witness says: ` +
      `${readFileSync(witness, 'utf8').trim()}`
  );
}
if (wrongCwd.length > 0) {
  fail(
    `${String(wrongCwd.length)} gh process(es) were given a working directory ` +
      `that is not this Mac's home: ${wrongCwd.map((one) => one.cwd).join(', ')}.`
  );
}
if (withToken.length > 0) {
  fail(
    `${String(withToken.length)} gh process(es) were given a token by Tortie. ` +
      `Tortie never sets one, and gh's own configuration is the person's.`
  );
}

// ---------------------------------------------------------------------------
// Row 14. The rows themselves
// ---------------------------------------------------------------------------

if (top !== null) {
  const drew = top.runs ?? [];
  const sameIds =
    drew.length === CANNED_RUNS.length &&
    drew.every((row, at) => row.id === CANNED_RUNS[at].databaseId);
  const sameFields =
    sameIds &&
    drew.every(
      (row, at) =>
        row.number === CANNED_RUNS[at].number &&
        row.workflowName === CANNED_RUNS[at].workflowName &&
        row.displayTitle === CANNED_RUNS[at].displayTitle &&
        row.statusRaw === CANNED_RUNS[at].status &&
        row.headBranch === CANNED_RUNS[at].headBranch &&
        row.headSha === CANNED_RUNS[at].headSha &&
        row.url === CANNED_RUNS[at].url
    );
  const issues = top.issues ?? [];
  step(
    14,
    'the rows, field by field against what gh answered',
    `${String(drew.length)} row(s) drawn out of ` +
      `${String(CANNED_RUNS.length + 1)} sent, ids ` +
      `${drew.map((row) => String(row.id)).join(', ')}, every field ` +
      `${sameFields ? 'equal' : 'DIFFERENT'}; ${String(issues.length)} issue(s): ` +
      `${issues.map((one) => `${one.kind}.${one.field} ${one.reason}`).join('; ')}`
  );
  if (!sameFields) {
    fail('the rows Tortie drew are not the rows gh answered with.');
  }
  if (issues.length !== 1 || issues[0]?.field !== 'url') {
    fail(
      'the row gh sent without a url did not land in issues with the field ' +
        'named. A row missing a field it needs is dropped whole and the drop ' +
        'is reported.'
    );
  }
  const limit = Number(top.limit);
  if (limit !== 10) {
    fail(`the read asked gh for ${String(limit)} row(s). It asks for 10.`);
  }
}

// ---------------------------------------------------------------------------
// Row 15. Three reads of the whole path
// ---------------------------------------------------------------------------

const times = ['top', 'again', 'third']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true)
  .map((row) => Number(row.answer.elapsedMs));
step(
  15,
  'the whole path, three reads',
  times.map((ms) => `${(ms / 1000).toFixed(3)} s`).join(', ') || 'none'
);
if (times.length !== 3) fail('three timed reads did not all answer.');

// ---------------------------------------------------------------------------
// Row 16, taken before the machine is stopped
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
const porcelainAfter = gitIn(work, 'status', '--porcelain').stdout;
step(
  16,
  'the repository across every read',
  `${String(gitAfter.size)} file(s) under .git, ` +
    `${moved.length === 0 ? 'all unchanged in size and modification time' : moved.join('; ')}; ` +
    `git status --porcelain ${
      porcelainBefore === porcelainAfter
        ? `${String(porcelainBefore.length)} bytes, identical`
        : 'DIFFERENT'
    }`
);
if (moved.length > 0) {
  fail(
    `a read changed ${String(moved.length)} file(s) under .git. If the only ` +
      `one is .git/index, git refreshed its own stat cache while it read, ` +
      `which is a write git makes rather than one Tortie makes. Either way it ` +
      `is a change and this probe reports it rather than excusing it.`
  );
}
if (porcelainBefore !== porcelainAfter) {
  fail('the working tree on the machine is not what it was before the read.');
}

// ---------------------------------------------------------------------------
// Row 17. The end to end demonstration, with the REAL gh on this Mac
// ---------------------------------------------------------------------------

const ghHere = sh('/bin/sh', ['-c', 'command -v gh']).stdout.trim();
const signedIn =
  ghHere.length > 0 &&
  sh('/bin/sh', ['-c', 'gh auth status --hostname github.com']).code === 0;

if (!signedIn) {
  step(
    17,
    'the end to end demonstration with the real gh',
    `SKIPPED. ${
      ghHere.length === 0
        ? 'This Mac has no gh on its path.'
        : 'This Mac has gh and it is not signed in to github.com.'
    } A skipped row is not a pass.`
  );
} else {
  // The scratch repository is pointed at a public repository that has runs, and
  // a branch that has them. Only the scratch repository is touched.
  gitIn(work, 'remote', 'set-url', 'origin', `https://github.com/${REAL_REPO}.git`);
  gitIn(work, 'branch', '-q', '-m', REAL_BRANCH);
  const real = drive({ ...ctxInput, ops: [{ name: 'real', cwd: work, real: true }] });
  const answer = real?.answers?.[0]?.ok === true ? real.answers[0].answer : null;
  if (answer === null) {
    fail('the end to end read with the real gh did not answer.');
    step(17, 'the end to end demonstration with the real gh', 'the read failed');
  } else {
    const rows = answer.runs ?? [];
    step(
      17,
      'the end to end demonstration with the real gh',
      `mode ${String(answer.mode)}, branch ${String(answer.branch)} from the ` +
        `loopback machine, repository ${String(answer.ownerRepo)} from the ` +
        `loopback machine, health ${String(answer.health?.state)}, ` +
        `${String(rows.length)} run(s) from github.com through this Mac's own ` +
        `gh: ${rows
          .slice(0, 3)
          .map(
            (row) =>
              `#${String(row.number)} ${row.workflowName} ${row.statusRaw}/${String(
                row.conclusionRaw
              )}`
          )
          .join('; ')}`
    );
    if (
      answer.mode !== 'ok' ||
      answer.branch !== REAL_BRANCH ||
      answer.ownerRepo !== REAL_REPO ||
      answer.health?.state !== 'ready'
    ) {
      fail(
        `the end to end read answered mode ${String(answer.mode)}, branch ` +
          `${String(answer.branch)}, repository ${String(answer.ownerRepo)} and ` +
          `health ${String(answer.health?.state)}. It answers ok, ` +
          `${REAL_BRANCH}, ${REAL_REPO} and ready.`
      );
    }
    if (rows.length === 0) {
      fail(
        `github.com answered with no runs for ${REAL_REPO} on ${REAL_BRANCH}. ` +
          `That branch had runs when this probe was written, so either the ` +
          `branch moved or the read did not reach GitHub.`
      );
    }
    if (existsSync(witness)) {
      fail(
        'a program called gh ran on the far side during the end to end read.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Row 18. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  18,
  'the operator’s sessions on -L gmux, after',
  `${sessionsBefore} before, ${sessionsAfter} after`
);
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's session count moved from ${sessionsBefore} to ` +
      `${sessionsAfter}. This probe reads that server and never writes to it.`
  );
}

say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac. No Linux machine and ' +
    'no machine of the operator’s was contacted, so GNU git, GNU awk and GNU ' +
    'base64 are reasoned about from POSIX rather than measured. Row 13’s ' +
    'witness sits in the folders the script changes into, so what it catches ' +
    'is a script reaching for gh on the current directory; that no gh on a ' +
    'second computer’s own PATH could be reached is covered by row 12. No ' +
    'repository with a large number of runs was read, and nothing here ' +
    'measured two remote tabs reading at once.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
