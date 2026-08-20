/**
 * `node build/probe-p106-branch.mjs`. The live probe of Phase 106, being the
 * branch checked out on another machine.
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
 *     never opens the repository this file lives in, and the only git verbs it
 *     runs that write are run inside those scratch repositories while it builds
 *     them.
 *  5. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p106-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Sixteen rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. The branch Tortie learned equals `git symbolic-ref --quiet --short HEAD`
 *     run directly in that repository.
 *  3. The commit equals `git rev-parse HEAD`, and the short commit equals
 *     `git rev-parse --short HEAD`, both run directly there.
 *  4. The upstream equals `git rev-parse --abbrev-ref @{upstream}` run directly
 *     there.
 *  5. THE TWO COUNTS. The repository is built to be two commits ahead of its
 *     upstream and one behind. What Tortie drew is compared against
 *     `git rev-list --left-right --count @{upstream}...HEAD` run directly
 *     there, and the two numbers must be 2 and 1.
 *  6. A branch with no upstream answers no upstream, 0 and 0, and does NOT set
 *     the unreadable flag. Level and unread are different answers.
 *  7. A branch whose upstream ref was deleted on the other side answers
 *     `upstreamGone`.
 *  8. A linked worktree on a second branch answers that second branch rather
 *     than the main one. THIS IS THE ROW THAT FAILS ON `--absolute-git-dir`.
 *  9. A detached head answers `noBranch`, and the word `HEAD` never appears as
 *     a branch name.
 * 10. A repository with no commits answers `noBranch` with no commit at all.
 * 11. A folder that is not a repository answers `notRepo`, a folder that is not
 *     there answers `missing`, and a folder at mode 000 answers `denied`.
 * 12. THE SPAWN COUNT, MEASURED. Counting wrappers are put on PATH ahead of
 *     git, base64 and tr, the shipped script text is run five times against
 *     each shape, and the count per run is printed. The header of
 *     `src/main/machines/remote-branch.ts` claims five on the branch path. This
 *     row prints what it measured, and the measurement wins.
 * 13. The read wrote nothing. `git status --porcelain` is compared byte for
 *     byte before and after, and the size and modification time of every file
 *     under `.git` are compared before and after.
 * 14. Three reads of the whole path, timed in ms.
 * 15. The exact bytes `composeRemoteScriptCommand` produced for a hostile
 *     folder value, printed in full, with that value appearing once and quoted
 *     and never inside the script text.
 * 16. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * is contacted, so GNU git, GNU base64 and GNU coreutils `tr` are reasoned
 * about from POSIX rather than measured. NO OLD GIT IS RUN. A machine whose git
 * is older than 2.13 answers `nodetails`, and that path is exercised by a unit
 * test on the parser and by nothing here. Nothing here switches a branch,
 * because no code in this product can. Nothing here measures two remote tabs
 * reading at once.
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
const PORT = 45806;

/** A folder name built to break a script that composed its own text. */
const HOSTILE = "/tmp/p106-'; touch /tmp/p106-pwned; echo '";

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p106-branch-${String(process.pid)}`,
  'p106-branch'
);

const root = join('/tmp', `p106-branch-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p106-branch] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p106-branch] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p106-branch] ${String(n)}. ${what}: ${evidence}\n`);

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

function commitIn(dir, name) {
  writeFileSync(join(dir, name), `export const x = '${name}';\n`, 'utf8');
  gitIn(dir, 'add', '-A');
  gitIn(dir, 'commit', '-q', '-m', name);
}

// The repository the others follow. It stands in for a server, and nothing in
// this probe ever reaches a real one.
const origin = join(root, 'p106-origin');
mkdirSync(origin, { recursive: true, mode: 0o700 });
gitIn(origin, 'init', '-q', '-b', 'main');
commitIn(origin, 'p106-one.ts');

// THE ROW 5 REPOSITORY, BUILT TO BE TWO AHEAD AND ONE BEHIND. The upstream gets
// one commit this one does not have, and this one gets two the upstream does
// not. The fetch happens HERE, in the setup, because Tortie never fetches.
const work = join(root, 'p106-work');
sh('/usr/bin/git', ['clone', '-q', origin, work], {
  env: { ...process.env, ...gitEnv }
});
commitIn(origin, 'p106-behind.ts');
commitIn(work, 'p106-ahead-one.ts');
commitIn(work, 'p106-ahead-two.ts');
gitIn(work, 'fetch', '-q', 'origin');

// A linked worktree on a second branch. Its own `.git` is a FILE pointing at
// the shared directory, and only `--git-common-dir` answers as a repository.
const linked = join(root, 'p106-worktree');
gitIn(work, 'worktree', 'add', '-q', '-b', 'p106-second', linked);

// A branch that follows nothing at all.
const solo = join(root, 'p106-solo');
mkdirSync(solo, { recursive: true, mode: 0o700 });
gitIn(solo, 'init', '-q', '-b', 'p106-alone');
commitIn(solo, 'p106-solo.ts');

// A branch whose upstream ref was deleted on the other side.
const gone = join(root, 'p106-gone');
gitIn(origin, 'branch', '-q', 'p106-doomed');
sh('/usr/bin/git', ['clone', '-q', origin, gone], {
  env: { ...process.env, ...gitEnv }
});
gitIn(gone, 'checkout', '-q', '-b', 'p106-doomed', '--track', 'origin/p106-doomed');
gitIn(origin, 'branch', '-q', '-D', 'p106-doomed');
gitIn(gone, 'fetch', '-q', '--prune', 'origin');

// A detached head, made in its own clone so the others keep their branches.
const detached = join(root, 'p106-detached');
sh('/usr/bin/git', ['clone', '-q', origin, detached], {
  env: { ...process.env, ...gitEnv }
});
gitIn(detached, 'checkout', '-q', '--detach', 'HEAD');

// A repository with no commits at all.
const empty = join(root, 'p106-empty');
mkdirSync(empty, { recursive: true, mode: 0o700 });
gitIn(empty, 'init', '-q', '-b', 'main');

// A folder with no git in it, a folder that is not there, and one the account
// cannot read.
const plain = join(root, 'p106-plain');
mkdirSync(plain, { recursive: true, mode: 0o700 });
writeFileSync(join(plain, 'p106-plain.ts'), 'export const p = 1;\n', 'utf8');
const absent = join(root, 'p106-never-made');
const denied = join(root, 'p106-denied');
mkdirSync(denied, { recursive: true, mode: 0o700 });
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

/** Every file under one repository's .git, with its size and its mtime. */
function gitDirFacts(dir) {
  const facts = new Map();
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
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
  walk(join(dir, '.git'));
  return facts;
}

const gitBefore = gitDirFacts(work);

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
const truthHead = (dir) =>
  sh('/bin/sh', ['-c', 'git rev-parse HEAD'], { cwd: dir }).stdout.trim();
const truthShort = (dir) =>
  sh('/bin/sh', ['-c', 'git rev-parse --short HEAD'], { cwd: dir }).stdout.trim();
const truthUpstream = (dir) =>
  sh('/bin/sh', ['-c', 'git rev-parse --abbrev-ref @{upstream}'], { cwd: dir })
    .stdout.trim();

/**
 * The behind and ahead counts git itself reports, as two numbers.
 *
 * `git rev-list --left-right --count A...B` prints the commits reachable from A
 * and not B first, then the ones reachable from B and not A. With A being the
 * upstream and B being HEAD, the first number is BEHIND and the second is
 * AHEAD.
 */
function truthCounts(dir) {
  const out = sh(
    '/bin/sh',
    ['-c', 'git rev-list --left-right --count @{upstream}...HEAD'],
    { cwd: dir }
  ).stdout.trim();
  const parts = out.split(/\s+/);
  return { behind: Number(parts[0] ?? -1), ahead: Number(parts[1] ?? -1) };
}

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p106-branch-driver.ts');
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
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const control = await import(REPO + '/src/main/machines/control-plane');
const branch = await import(REPO + '/src/main/machines/remote-branch');
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

const answers: unknown[] = [];

try {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  // The link has to read as answering for the one door to open at all.
  control.noteMachineAnswered(ctx.machineId, Date.now());
  for (const op of input.ops as Record<string, unknown>[]) {
    try {
      const answer = await branch.readBranchOnMachine({
        machineId: ctx.machineId,
        cwd: String(op.cwd)
      });
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

// The exact bytes the door composes for a hostile folder value, and the script
// text itself so the spawn count is measured against WHAT SHIPS rather than
// against a copy in this probe. PURE: nothing is sent by either line.
const quote = await import(REPO + '/src/main/restore/command');
const script = catalogue.remoteScript('repo-branch');
const composed =
  script === null ? '' : door.composeRemoteScriptCommand(script, [String(input.hostile)]);
// The value AS THE PRODUCT'S OWN QUOTER WRITES IT. A hostile value holding a
// single quote cannot appear in the command as its raw self, because quoting it
// is the whole point, so the raw substring is the wrong thing to search for.
const hostileQuoted = quote.shellQuoteArgv([String(input.hostile)]);

writeFileSync(
  outPath,
  JSON.stringify({
    answers,
    composed,
    hostileQuoted,
    scriptText: script === null ? '' : script.text
  }),
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
  const inPath = join(root, `p106-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p106-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    'npx',
    ['tsx', '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 300_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p106-branch',
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
  prefix: 'p106',
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
  const tmuxTmp = machineTmuxTmp('p106', 'one');
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
  machineId: 'p106-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p106-control'),
  hostKeys: join(root, 'p106-known-machines'),
  userHostKeys: join(root, 'p106-person-known-hosts'),
  hostile: HOSTILE
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
    { name: 'solo', cwd: solo },
    { name: 'gone', cwd: gone },
    { name: 'worktree', cwd: linked },
    { name: 'detached', cwd: detached },
    { name: 'empty', cwd: empty },
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
// Rows 2 to 5. The branch, the commit, the upstream and the two counts
// ---------------------------------------------------------------------------

const top = answerFor('top');
if (top !== null) {
  const wantBranch = truthBranch(work);
  step(
    2,
    'the branch, against git’s own answer',
    `Tortie ${String(top.branch)}, git ${wantBranch}, mode ${String(top.mode)}`
  );
  if (top.mode !== 'ok' || top.branch !== wantBranch) {
    fail(
      `Tortie read the branch as ${String(top.branch)} with mode ` +
        `${String(top.mode)} and git reads it as ${wantBranch}.`
    );
  }

  const wantHead = truthHead(work);
  const wantShort = truthShort(work);
  step(
    3,
    'the commit and the short commit, against git’s own answers',
    `Tortie ${String(top.sha)} and ${String(top.shortSha)}, git ${wantHead} ` +
      `and ${wantShort}`
  );
  if (top.sha !== wantHead || top.shortSha !== wantShort) {
    fail(
      `Tortie read the commit as ${String(top.sha)} and ${String(top.shortSha)}, ` +
        `and git reads it as ${wantHead} and ${wantShort}.`
    );
  }

  const wantUpstream = truthUpstream(work);
  step(
    4,
    'the branch it follows, against git’s own answer',
    `Tortie ${String(top.upstream)}, git ${wantUpstream}, gone ` +
      `${String(top.upstreamGone)}`
  );
  if (top.upstream !== wantUpstream || top.upstreamGone !== false) {
    fail(
      `Tortie read the upstream as ${String(top.upstream)} with gone ` +
        `${String(top.upstreamGone)} and git reads it as ${wantUpstream}.`
    );
  }

  const want = truthCounts(work);
  step(
    5,
    'how far ahead and behind, against git’s own count',
    `Tortie ${String(top.ahead)} ahead and ${String(top.behind)} behind, ` +
      `git rev-list ${String(want.ahead)} ahead and ${String(want.behind)} ` +
      `behind, unreadable ${String(top.trackUnreadable)}`
  );
  if (top.ahead !== want.ahead || top.behind !== want.behind) {
    fail(
      `Tortie counted ${String(top.ahead)} ahead and ${String(top.behind)} ` +
        `behind, and git rev-list --left-right --count counts ` +
        `${String(want.ahead)} and ${String(want.behind)}.`
    );
  }
  if (want.ahead !== 2 || want.behind !== 1) {
    fail(
      `this repository was built to be 2 ahead and 1 behind and git says ` +
        `${String(want.ahead)} and ${String(want.behind)}, so the row proves ` +
        `less than it claims to.`
    );
  }
  if (top.trackUnreadable !== false) {
    fail('a tracking answer this end read fine was reported as unreadable.');
  }
}

// ---------------------------------------------------------------------------
// Rows 6 and 7. No upstream, and an upstream that machine no longer has
// ---------------------------------------------------------------------------

const alone = answerFor('solo');
if (alone !== null) {
  step(
    6,
    'a branch that follows nothing',
    `mode ${String(alone.mode)}, branch ${String(alone.branch)}, upstream ` +
      `${String(alone.upstream)}, ${String(alone.ahead)} ahead and ` +
      `${String(alone.behind)} behind, unreadable ` +
      `${String(alone.trackUnreadable)}`
  );
  if (
    alone.mode !== 'ok' ||
    alone.upstream !== null ||
    alone.ahead !== 0 ||
    alone.behind !== 0 ||
    alone.trackUnreadable !== false
  ) {
    fail(
      `a branch with no upstream answered mode ${String(alone.mode)}, ` +
        `upstream ${String(alone.upstream)}, ${String(alone.ahead)} and ` +
        `${String(alone.behind)}, unreadable ${String(alone.trackUnreadable)}. ` +
        `It answers ok, no upstream, 0 and 0, and NOT unreadable: an empty ` +
        `tracking answer means level and this is the row that keeps level and ` +
        `unread apart.`
    );
  }
}

const deleted = answerFor('gone');
if (deleted !== null) {
  step(
    7,
    'a branch whose upstream that machine no longer has',
    `mode ${String(deleted.mode)}, branch ${String(deleted.branch)}, upstream ` +
      `${String(deleted.upstream)}, gone ${String(deleted.upstreamGone)}`
  );
  if (deleted.mode !== 'ok' || deleted.upstreamGone !== true) {
    fail(
      `a branch set to follow a ref that machine no longer has answered mode ` +
        `${String(deleted.mode)} with gone ${String(deleted.upstreamGone)}. It ` +
        `answers ok with gone true, so the panel can say Tortie cannot count.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 8. The linked worktree
// ---------------------------------------------------------------------------

const worktree = answerFor('worktree');
if (worktree !== null) {
  const wantWorktreeBranch = truthBranch(linked);
  step(
    8,
    'a linked worktree on a second branch',
    `mode ${String(worktree.mode)}, branch ${String(worktree.branch)}, git ` +
      `${wantWorktreeBranch}`
  );
  if (worktree.mode !== 'ok' || worktree.branch !== wantWorktreeBranch) {
    fail(
      `a linked worktree answered mode ${String(worktree.mode)} and branch ` +
        `${String(worktree.branch)}. It answers ${wantWorktreeBranch}. THIS IS ` +
        `THE ROW THAT FAILS ON --absolute-git-dir.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 9 to 11. The shapes that carry no branch
// ---------------------------------------------------------------------------

const det = answerFor('detached');
if (det !== null) {
  step(
    9,
    'a detached head',
    `mode ${String(det.mode)}, branch ${String(det.branch)}`
  );
  if (det.mode !== 'noBranch' || det.branch !== null) {
    fail(
      `a detached head answered mode ${String(det.mode)} with branch ` +
        `${String(det.branch)}. It answers noBranch with no branch at all.`
    );
  }
  if (det.branch === 'HEAD') {
    fail('a detached head reported a branch called HEAD.');
  }
}

const fresh = answerFor('empty');
if (fresh !== null) {
  step(
    10,
    'a repository with no commits',
    `mode ${String(fresh.mode)}, branch ${String(fresh.branch)}, commit ` +
      `${String(fresh.sha)}`
  );
  if (
    fresh.mode !== 'noBranch' ||
    fresh.branch !== null ||
    fresh.sha !== null
  ) {
    fail(
      `a repository with no commits answered mode ${String(fresh.mode)}, ` +
        `branch ${String(fresh.branch)} and commit ${String(fresh.sha)}. It ` +
        `answers noBranch with neither, and never the literal string HEAD.`
    );
  }
}

const notRepo = answerFor('plain');
const missing = answerFor('absent');
const shut = answerFor('denied');
if (notRepo !== null && missing !== null && shut !== null) {
  step(
    11,
    'a folder git does not track, one that is not there, and one at mode 000',
    `${String(notRepo.mode)}, ${String(missing.mode)} and ${String(shut.mode)}`
  );
  if (notRepo.mode !== 'notRepo') {
    fail(`a folder git does not track answered ${String(notRepo.mode)}.`);
  }
  if (missing.mode !== 'missing') {
    fail(`a folder that is not on that machine answered ${String(missing.mode)}.`);
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
// Row 12. THE SPAWN COUNT, measured against the shipped text
// ---------------------------------------------------------------------------

const scriptText = String(driven.scriptText ?? '');
const wrapDir = join(root, 'p106-wrappers');
const spawnLog = join(root, 'p106-spawns.log');
mkdirSync(wrapDir, { recursive: true, mode: 0o700 });

// A counting wrapper for every external program the script could reach for. A
// program that is a shell builtin in dash and in bash is never seen by one of
// these, which is why `printf`, `cd`, `case` and `[` are not in the numbers.
for (const name of ['git', 'base64', 'tr', 'awk', 'sed', 'cat', 'head']) {
  const real = sh('/bin/sh', ['-c', `command -v ${name}`]).stdout.trim();
  if (real.length === 0) continue;
  writeFileSync(
    join(wrapDir, name),
    `#!/bin/sh\nprintf '%s\\n' "${name}" >> ${spawnLog}\nexec ${real} "$@"\n`,
    'utf8'
  );
  chmodSync(join(wrapDir, name), 0o755);
}

/** How many external programs one run of the shipped text makes, and which. */
function countSpawns(folder) {
  writeFileSync(spawnLog, '', 'utf8');
  sh('/bin/sh', ['-c', scriptText, 'tortie-repo-branch', folder], {
    env: { ...process.env, PATH: `${wrapDir}:/usr/bin:/bin` }
  });
  const lines = readFileSync(spawnLog, 'utf8').split('\n').filter((one) => one.length > 0);
  const tally = new Map();
  for (const name of lines) tally.set(name, (tally.get(name) ?? 0) + 1);
  return {
    total: lines.length,
    which: [...tally.entries()].sort().map(([n, c]) => `${n} x${String(c)}`).join(', ')
  };
}

if (scriptText.length === 0) {
  step(12, 'the external programs the far side runs', 'SKIPPED. The driver returned no script text, so nothing was measured. A skipped row is not a pass.');
  fail('the shipped script text did not reach this probe, so the spawn count was never measured.');
} else {
  const shapes = [
    ['a branch is checked out', work, 5],
    ['a repository with no commits', empty, 2],
    ['a folder git does not track', plain, 1],
    ['a folder that is not there', absent, 0]
  ];
  const readings = [];
  for (const [what, folder, expected] of shapes) {
    const runs = [];
    for (let at = 0; at < 5; at += 1) runs.push(countSpawns(folder));
    const totals = runs.map((one) => one.total);
    const steady = totals.every((one) => one === totals[0]);
    readings.push(
      `${what}: ${totals.join(', ')} (${runs[0].which || 'none'})`
    );
    if (!steady) {
      fail(`${what} ran a different number of programs across five runs: ${totals.join(', ')}.`);
    }
    if (totals[0] !== expected) {
      fail(
        `${what} ran ${String(totals[0])} external program(s) and the header of ` +
          `src/main/machines/remote-branch.ts claims ${String(expected)}. THE ` +
          `MEASUREMENT WINS: correct the header rather than this row.`
      );
    }
  }
  step(
    12,
    'the external programs the far side runs, five runs of each shape',
    readings.join('; ')
  );
}

// ---------------------------------------------------------------------------
// Row 13, taken before the machine is stopped
// ---------------------------------------------------------------------------

const gitAfter = gitDirFacts(work);
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
  13,
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
// Row 14. Three reads of the whole path
// ---------------------------------------------------------------------------

const times = ['top', 'again', 'third']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true)
  .map((row) => Number(row.answer.elapsedMs));
step(
  14,
  'the whole path, three reads',
  times.map((ms) => `${String(ms)} ms`).join(', ') || 'none'
);
if (times.length !== 3) fail('three timed reads did not all answer.');

// ---------------------------------------------------------------------------
// Row 15. The exact bytes that crossed
// ---------------------------------------------------------------------------

const composed = String(driven.composed ?? '');
const hostileQuoted = String(driven.hostileQuoted ?? '');
// THE VALUE HOLDS A SINGLE QUOTE ON PURPOSE, so the thing to look for is the
// value as the product's own quoter writes it. Its RAW form must appear zero
// times, because a raw appearance would mean the quote was never applied and
// the tail of the command would end the string early.
const quotedInCommand =
  hostileQuoted.length === 0 ? -1 : composed.split(hostileQuoted).length - 1;
const rawInCommand = composed.split(HOSTILE).length - 1;
const hostileInScript = scriptText.includes(HOSTILE);
say(`the bytes this read composed, in full:\n${composed}`);
step(
  15,
  'a hostile folder value, in the bytes that actually cross',
  `${String(composed.length)} bytes, the value appears ` +
    `${String(quotedInCommand)} time(s) quoted and ${String(rawInCommand)} ` +
    `time(s) raw, and it ${hostileInScript ? 'IS' : 'is not'} inside the ` +
    `script text; the quoted form is ${hostileQuoted}`
);
if (composed.length === 0) {
  fail('the door composed nothing, so there were no bytes to read.');
}
if (quotedInCommand !== 1) {
  fail(
    `a hostile folder value appears ${String(quotedInCommand)} time(s) in the ` +
      `composed command in its quoted form. It appears exactly once, in the ` +
      `quoted tail.`
  );
}
if (rawInCommand !== 0) {
  fail(
    `a hostile folder value appears ${String(rawInCommand)} time(s) in the ` +
      `composed command UNQUOTED. Its single quote would end the quoted tail ` +
      `early and everything after it would be read by the far side's shell as ` +
      `commands.`
  );
}
if (hostileInScript) {
  fail(
    'a caller value reached the script text itself. Values cross as positional ' +
      'parameters and nothing is ever composed into a script.'
  );
}
if (existsSync('/tmp/p106-pwned')) {
  fail(
    'the hostile folder value ran as a command somewhere. /tmp/p106-pwned exists.'
  );
}

// ---------------------------------------------------------------------------
// Row 16. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  16,
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
    'no machine of the operator’s was contacted, so GNU git, GNU base64 and ' +
    'GNU coreutils tr are reasoned about from POSIX rather than measured. NO ' +
    'OLD GIT WAS RUN, so the nodetails answer a git before 2.13 would give is ' +
    'covered by a unit test on the parser and by nothing here. Nothing here ' +
    'switched a branch, because no code in this product can. Nothing here ' +
    'measured two remote tabs reading at once.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
