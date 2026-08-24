/**
 * `node build/probe-p107-history.mjs`. The live probe of Phase 107, being the
 * commit graph of a folder on another machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So six rules, all of them here:
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
 *  5. The one plain `ssh` this probe runs, being row 18, names its OWN
 *     `UserKnownHostsFile` under /tmp. Nothing is added to the person's
 *     `~/.ssh/known_hosts`, and that file's size is read before and after and
 *     printed.
 *  6. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p107-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Twenty one rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. A repository of 100 commits read at the page returns 50 rows with
 *     `hasMore` true, and the 50 commit names equal
 *     `git log --branches --tags --remotes --topo-order --max-count=50
 *     --format=%H` run in that repository, name for name and in order.
 *  3. The same repository read at 100 returns 100 rows and `hasMore` false.
 *  4. THE BYTES AND THE MILLISECONDS AT 100 commits, at the page and at the
 *     ceiling.
 *  5. THE BYTES AND THE MILLISECONDS AT 1,000 commits. `atCeiling` is true at
 *     500.
 *  6. THE BYTES AND THE MILLISECONDS AT 10,000 commits.
 *  7. THE CEILING IS REAL. 20,000 asked against the 10,000 commit repository
 *     answers with 500 rows, `maxCount` 500 and `ceiling` 500. THIS IS THE ROW
 *     THAT KEEPS THIS PHASE AT TIER 2.
 *  8. A branch two commits ahead of its upstream and one behind: the three
 *     anchors equal git's own answers and the marked commits equal
 *     `git rev-list --left-right HEAD...@{u}` run in that repository.
 *  9. THE LINKED WORKTREE ROW. It fails on `--absolute-git-dir`.
 * 10. A detached head still walks, and its two upstream anchors are null.
 * 11. A branch 60 commits ahead read at the page sets `divergenceTruncated`.
 * 12. THE TAG THAT POINTS AT A BLOB, lightweight and annotated. The walk still
 *     answers with rows on the far side's own git. It is a survival check
 *     rather than the reason the walk shape was chosen.
 * 13. THE EMPTY WALK DOES NOT BECOME A HEAD WALK. A repository holding a commit
 *     and no refs at all answers with no rows, which is what
 *     `git log --branches --tags --remotes` prints there, rather than the HEAD
 *     only walk `git log --stdin` would have given.
 * 14. A repository carrying a symbolic `origin/HEAD` answers with no duplicate
 *     row, no failure and no badge for the alias.
 * 15. A repository with no commits answers `noCommits`, a folder git does not
 *     track answers `notRepo`, a folder that is not there answers `missing`,
 *     and a folder at mode 000 answers `denied`.
 * 16. THE PROGRAM COUNT, MEASURED. Counting wrappers on PATH ahead of git,
 *     base64 and tr, five runs against each of eight shapes.
 * 17. THE READ WROTE NOTHING. Every file under `.git` identical in size and
 *     modification time before and after, and `git status --porcelain` byte for
 *     byte identical.
 * 18. THE `sanitizeRefNames` PROOF. For every scratch repository, that guard
 *     over the machine's own `for-each-ref` output returns the same names in
 *     the same order, so every name the refused `--stdin` shape could have sent
 *     is a name the guard would have passed unchanged.
 * 19. A folder value carrying a shell command, through the real door.
 * 20. THE COMMIT FILE DIFF, MEASURED AND NOT SHIPPED. Two `git show` calls over
 *     plain `ssh`, outside the product and outside the catalogue, with the
 *     bytes and the milliseconds printed. TORTIE DOES NOT DRAW A COMMIT'S FILE
 *     DIFF ON A REMOTE TAB AFTER THIS PHASE. The number is banked so the phase
 *     that draws it inherits a measurement rather than an estimate.
 * 21. The operator's session count did not move, and neither did the size of
 *     their own `~/.ssh/known_hosts`.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * is contacted, so GNU git, GNU base64 and GNU coreutils `tr` are reasoned
 * about from POSIX rather than measured. NO OLD GIT IS RUN. Nothing here draws
 * a commit's files, because no code in this product can. Nothing here measures
 * two remote tabs reading at once, and nothing here measures a slow link: the
 * milliseconds below are a loopback and they are a floor rather than an
 * expectation.
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
const PORT = 45807;

/** A folder name built to break a script that composed its own text. */
const HOSTILE = "/tmp/p107-'; touch /tmp/p107-pwned; echo '";

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p107-history-${String(process.pid)}`,
  'p107-history'
);

const root = join('/tmp', `p107-history-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p107-history] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p107-history] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p107-history] ${String(n)}. ${what}: ${evidence}\n`);

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 256 * 1024 * 1024,
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

/** The size of the person's own known hosts file, so rule 5 is measured. */
function personKnownHostsBytes() {
  const path = join(homedir(), '.ssh', 'known_hosts');
  try {
    return String(statSync(path).size);
  } catch {
    return 'no such file';
  }
}

const sessionsBefore = operatorSessions();
const knownHostsBefore = personKnownHostsBytes();
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

/**
 * A commit that CHANGES a file that is already there, rather than adding one.
 *
 * Row 20 measures the two `git show` calls a commit's file diff would need, and
 * a commit that only adds a file has nothing on the before side. One that
 * changes a file has both sides, which is the shape the measurement is for.
 */
function changeIn(dir, name, lines) {
  const body = Array.from(
    { length: lines },
    (_, at) => `export const line${String(at)} = ${String(at)};`
  ).join('\n');
  writeFileSync(join(dir, name), `${body}\n`, 'utf8');
  gitIn(dir, 'add', '-A');
  gitIn(dir, 'commit', '-q', '-m', `p107 change ${name}`);
}

/**
 * A repository of `count` commits, built with ONE `git fast-import`.
 *
 * A loop of `git commit` would be one process per commit, and this probe needs
 * a 10,000 commit repository. Measured while writing this file: fast-import
 * builds 10,000 commits in about a second, and the loop takes minutes.
 */
function repoOfCommits(dir, count) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  gitIn(dir, 'init', '-q', '-b', 'main');
  const body = 'p107 fixture\n';
  const lines = [
    'blob',
    'mark :1',
    `data ${String(body.length)}`,
    body.replace(/\n$/, ''),
    ''
  ];
  for (let at = 0; at < count; at += 1) {
    const message = `p107 commit ${String(at + 1)}\n`;
    lines.push(
      'commit refs/heads/main',
      `committer Probe <probe@example.invalid> ${String(1700000000 + at)} +0000`,
      `data ${String(message.length)}`,
      message.replace(/\n$/, ''),
      'M 100644 :1 p107-fixture.ts',
      ''
    );
  }
  lines.push('done', '');
  const streamPath = join(root, `p107-import-${String(count)}.txt`);
  writeFileSync(streamPath, lines.join('\n'), 'utf8');
  sh('/bin/sh', [
    '-c',
    `git -C ${dir} fast-import --quiet --done < ${streamPath}`
  ], { env: { ...process.env, ...gitEnv } });
  rmSync(streamPath, { force: true });
}

// The repository the others follow. It stands in for a server, and nothing in
// this probe ever reaches a real one.
const origin = join(root, 'p107-origin');
mkdirSync(origin, { recursive: true, mode: 0o700 });
gitIn(origin, 'init', '-q', '-b', 'main');
commitIn(origin, 'p107-one.ts');

// THE ROW 7 REPOSITORY, BUILT TO BE TWO AHEAD AND ONE BEHIND. The fetch happens
// HERE, in the setup, because Tortie never fetches.
const work = join(root, 'p107-work');
sh('/usr/bin/git', ['clone', '-q', origin, work], {
  env: { ...process.env, ...gitEnv }
});
commitIn(origin, 'p107-behind.ts');
commitIn(work, 'p107-ahead-one.ts');
// The second commit ahead CHANGES the file the clone already had, so row 20 has
// a before side and an after side to measure rather than only an after side.
changeIn(work, 'p107-one.ts', 200);
gitIn(work, 'fetch', '-q', 'origin');

// A linked worktree on a second branch that follows the same upstream. Its own
// `.git` is a FILE pointing at the shared directory, and only
// `--git-common-dir` answers as a repository.
const linked = join(root, 'p107-worktree');
gitIn(work, 'worktree', 'add', '-q', '-b', 'p107-second', linked);
gitIn(linked, 'branch', '--set-upstream-to=origin/main');

// A branch that follows nothing at all, for the spawn count shapes.
const solo = join(root, 'p107-solo');
mkdirSync(solo, { recursive: true, mode: 0o700 });
gitIn(solo, 'init', '-q', '-b', 'p107-alone');
commitIn(solo, 'p107-solo.ts');

// A detached head, made in its own clone so the others keep their branches.
const detached = join(root, 'p107-detached');
sh('/usr/bin/git', ['clone', '-q', origin, detached], {
  env: { ...process.env, ...gitEnv }
});
gitIn(detached, 'checkout', '-q', '--detach', 'HEAD');

// The three sizes. Row 3, row 4 and rows 5 and 6.
const hundred = join(root, 'p107-hundred');
repoOfCommits(hundred, 100);
const thousand = join(root, 'p107-thousand');
repoOfCommits(thousand, 1_000);
const tenk = join(root, 'p107-tenk');
repoOfCommits(tenk, 10_000);

// ROW 10. A branch 60 commits ahead of what it follows. The upstream is a local
// branch pinned at the first commit, which is what `--set-upstream-to` supports
// and what keeps this repository from needing a second one.
const ahead60 = join(root, 'p107-ahead60');
repoOfCommits(ahead60, 61);
const firstOfAhead = gitIn(
  ahead60,
  'rev-list',
  '--max-parents=0',
  'refs/heads/main'
).stdout.trim();
gitIn(ahead60, 'branch', 'p107-base', firstOfAhead);
gitIn(ahead60, 'branch', '--set-upstream-to=p107-base', 'main');

// ROW 11. A tag pointing at a BLOB, lightweight and annotated.
const blobtag = join(root, 'p107-blobtag');
mkdirSync(blobtag, { recursive: true, mode: 0o700 });
gitIn(blobtag, 'init', '-q', '-b', 'main');
commitIn(blobtag, 'p107-tagged.ts');
const blobSha = gitIn(blobtag, 'rev-parse', 'HEAD:p107-tagged.ts').stdout.trim();
gitIn(blobtag, 'update-ref', 'refs/tags/p107-lightweight-blob', blobSha);
gitIn(blobtag, 'tag', '-a', '-m', 'a tag on a blob', 'p107-annotated-blob', blobSha);

// ROW 11b. A commit and NO REFS AT ALL. `git log --branches --tags --remotes`
// prints nothing here. `printf '' | git log --stdin` would have walked HEAD.
const norefs = join(root, 'p107-norefs');
mkdirSync(norefs, { recursive: true, mode: 0o700 });
gitIn(norefs, 'init', '-q', '-b', 'main');
commitIn(norefs, 'p107-orphan.ts');
gitIn(norefs, 'update-ref', '-d', 'refs/heads/main');

// A repository with no commits at all.
const empty = join(root, 'p107-empty');
mkdirSync(empty, { recursive: true, mode: 0o700 });
gitIn(empty, 'init', '-q', '-b', 'main');

// A folder with no git in it, a folder that is not there, and one the account
// cannot read.
const plain = join(root, 'p107-plain');
mkdirSync(plain, { recursive: true, mode: 0o700 });
writeFileSync(join(plain, 'p107-plain.ts'), 'export const p = 1;\n', 'utf8');
const absent = join(root, 'p107-never-made');
const denied = join(root, 'p107-denied');
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
    `${String(gitBefore.size)} file(s) under the two ahead one behind one's .git`
);

// ---------------------------------------------------------------------------
// The truth, read in those repositories and never in this one
// ---------------------------------------------------------------------------

/** The commit names that machine's own git walks, in its own order. */
function truthWalk(dir, count) {
  const out = sh(
    '/bin/sh',
    [
      '-c',
      `git log --branches --tags --remotes --topo-order ` +
        `--max-count=${String(count)} --format=%H`
    ],
    { cwd: dir }
  );
  return out.stdout.split('\n').filter((one) => one.length > 0);
}

const truthHead = (dir) =>
  sh('/bin/sh', ['-c', 'git rev-parse --verify --quiet HEAD'], { cwd: dir })
    .stdout.trim();
const truthUpstream = (dir) =>
  sh('/bin/sh', ['-c', "git rev-parse --verify --quiet '@{u}'"], { cwd: dir })
    .stdout.trim();
const truthMergeBase = (dir) =>
  sh('/bin/sh', ['-c', "git merge-base HEAD '@{u}'"], { cwd: dir })
    .stdout.trim();

/** The two sides of the divergence git itself prints, as two lists. */
function truthSides(dir) {
  const out = sh(
    '/bin/sh',
    ['-c', "git rev-list --left-right 'HEAD...@{u}'"],
    { cwd: dir }
  );
  const ours = [];
  const theirs = [];
  for (const line of out.stdout.split('\n')) {
    if (line.length < 2) continue;
    if (line.startsWith('<')) ours.push(line.slice(1).trim());
    else if (line.startsWith('>')) theirs.push(line.slice(1).trim());
  }
  return { ours, theirs };
}

/** Every ref name that machine's own git holds, in its own order. */
function truthRefNames(dir) {
  const out = sh(
    '/bin/sh',
    [
      '-c',
      "git for-each-ref --format='%(refname)' refs/heads refs/remotes refs/tags"
    ],
    { cwd: dir }
  );
  return out.stdout.split('\n').filter((one) => one.length > 0);
}

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p107-history-driver.ts');
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
const history = await import(REPO + '/src/main/machines/remote-history');
const door = await import(REPO + '/src/main/machines/remote-run');
const catalogue = await import(REPO + '/src/main/machines/remote-scripts');
const graph = await import(REPO + '/src/main/git/graph-parse');

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
      const answer = await history.readHistoryOnMachine({
        machineId: ctx.machineId,
        cwd: String(op.cwd),
        ...(op.maxCount === undefined ? {} : { maxCount: Number(op.maxCount) })
      });
      // The rows are projected down here rather than carried whole, because a
      // 500 row answer repeated eight times is megabytes of JSON nobody reads.
      answers.push({
        ok: true,
        name: op.name,
        answer: {
          mode: answer.mode,
          maxCount: answer.maxCount,
          ceiling: answer.ceiling,
          hasMore: answer.hasMore,
          atCeiling: answer.atCeiling,
          headSha: answer.headSha,
          upstreamSha: answer.upstreamSha,
          mergeBase: answer.mergeBase,
          markedCount: answer.markedCount,
          divergenceTruncated: answer.divergenceTruncated,
          answerBytes: answer.answerBytes,
          elapsedMs: answer.elapsedMs,
          count: answer.entries.length,
          hashes: answer.entries.map((one) => one.hash),
          unpushed: answer.entries
            .filter((one) => one.unpushed === true)
            .map((one) => one.hash),
          unpulled: answer.entries
            .filter((one) => one.unpulled === true)
            .map((one) => one.hash),
          refs: answer.entries.flatMap((one) =>
            one.refs.map((ref) => ref.fullName)
          )
        }
      });
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

// ROW 17. THE GUARD THAT STAYED HOME, run here against the machine's own ref
// names. PURE: nothing is sent by this loop.
const sanitized = (input.refSets as { name: string; refs: string[] }[]).map(
  (one) => ({ name: one.name, out: graph.sanitizeRefNames(one.refs) })
);

// The exact bytes the door composes for a hostile folder value, and the script
// text itself so the spawn count is measured against WHAT SHIPS rather than
// against a copy in this probe. PURE: nothing is sent by either line.
const quote = await import(REPO + '/src/main/restore/command');
const script = catalogue.remoteScript('repo-history');
const composed =
  script === null
    ? ''
    : door.composeRemoteScriptCommand(script, [String(input.hostile), '51']);
// The value AS THE PRODUCT'S OWN QUOTER WRITES IT. A hostile value holding a
// single quote cannot appear in the command as its raw self, because quoting it
// is the whole point, so the raw substring is the wrong thing to search for.
const hostileQuoted = quote.shellQuoteArgv([String(input.hostile)]);

writeFileSync(
  outPath,
  JSON.stringify({
    answers,
    sanitized,
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
  const inPath = join(root, `p107-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p107-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 600_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p107-history',
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
  prefix: 'p107',
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
  const tmuxTmp = machineTmuxTmp('p107', 'one');
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
  machineId: 'p107-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p107-control'),
  hostKeys: join(root, 'p107-known-machines'),
  userHostKeys: join(root, 'p107-person-known-hosts'),
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

const refSets = [
  { name: 'work', refs: truthRefNames(work) },
  { name: 'linked', refs: truthRefNames(linked) },
  { name: 'hundred', refs: truthRefNames(hundred) },
  { name: 'thousand', refs: truthRefNames(thousand) },
  { name: 'tenk', refs: truthRefNames(tenk) },
  { name: 'ahead60', refs: truthRefNames(ahead60) },
  { name: 'blobtag', refs: truthRefNames(blobtag) },
  { name: 'norefs', refs: truthRefNames(norefs) },
  { name: 'detached', refs: truthRefNames(detached) },
  { name: 'solo', refs: truthRefNames(solo) },
  { name: 'empty', refs: truthRefNames(empty) }
];

const driven = drive({
  ...ctxInput,
  refSets,
  ops: [
    { name: 'hundred-page', cwd: hundred, maxCount: 50 },
    { name: 'hundred-full', cwd: hundred, maxCount: 100 },
    { name: 'hundred-ceiling', cwd: hundred, maxCount: 500 },
    { name: 'thousand-page', cwd: thousand, maxCount: 50 },
    { name: 'thousand-ceiling', cwd: thousand, maxCount: 500 },
    { name: 'tenk-page', cwd: tenk, maxCount: 50 },
    { name: 'tenk-ceiling', cwd: tenk, maxCount: 500 },
    { name: 'tenk-over', cwd: tenk, maxCount: 20_000 },
    { name: 'work', cwd: work, maxCount: 50 },
    { name: 'work-again', cwd: work, maxCount: 50 },
    { name: 'linked', cwd: linked, maxCount: 50 },
    { name: 'detached', cwd: detached, maxCount: 50 },
    { name: 'ahead60', cwd: ahead60, maxCount: 50 },
    { name: 'blobtag', cwd: blobtag, maxCount: 50 },
    { name: 'norefs', cwd: norefs, maxCount: 50 },
    { name: 'empty', cwd: empty, maxCount: 50 },
    { name: 'plain', cwd: plain, maxCount: 50 },
    { name: 'absent', cwd: absent, maxCount: 50 },
    { name: 'denied', cwd: denied, maxCount: 50 }
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

const same = (a, b) =>
  a.length === b.length && a.every((one, at) => one === b[at]);

// ---------------------------------------------------------------------------
// Rows 2 and 3. The page, and the walk against git's own walk
// ---------------------------------------------------------------------------

const page = answerFor('hundred-page');
if (page !== null) {
  const want = truthWalk(hundred, 50);
  step(
    2,
    'a 100 commit repository at the page, against git’s own walk',
    `Tortie ${String(page.count)} row(s), git ${String(want.length)}, ` +
      `hasMore ${String(page.hasMore)}, atCeiling ${String(page.atCeiling)}, ` +
      `names ${same(page.hashes, want) ? 'identical and in order' : 'DIFFERENT'}`
  );
  if (page.mode !== 'ok' || page.count !== 50 || page.hasMore !== true) {
    fail(
      `a 100 commit repository read at the page answered mode ` +
        `${String(page.mode)} with ${String(page.count)} row(s) and hasMore ` +
        `${String(page.hasMore)}. It answers ok, 50 rows and hasMore true.`
    );
  }
  if (!same(page.hashes, want)) {
    fail(
      `the 50 commit names Tortie drew are not the 50 that ` +
        `git log --branches --tags --remotes --topo-order --max-count=50 ` +
        `prints in that repository.`
    );
  }
  if (page.atCeiling !== false) {
    fail('a page of 50 with 500 allowed reported that it was at the ceiling.');
  }
}

const full = answerFor('hundred-full');
if (full !== null) {
  const want = truthWalk(hundred, 100);
  step(
    3,
    'the same repository read at 100',
    `Tortie ${String(full.count)} row(s), git ${String(want.length)}, ` +
      `hasMore ${String(full.hasMore)}, names ` +
      `${same(full.hashes, want) ? 'identical and in order' : 'DIFFERENT'}`
  );
  if (full.count !== 100 || full.hasMore !== false || !same(full.hashes, want)) {
    fail(
      `a 100 commit repository read at 100 answered ${String(full.count)} ` +
        `row(s) with hasMore ${String(full.hasMore)}. It answers 100 rows and ` +
        `hasMore false, because the walk ended inside the window.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 4, 5 and 6. THE BYTES AND THE SECONDS, at three sizes
// ---------------------------------------------------------------------------

function sizeRow(number, what, pageName, ceilingName) {
  const atPage = answerFor(pageName);
  const atCeiling = answerFor(ceilingName);
  if (atPage === null || atCeiling === null) return null;
  step(
    number,
    what,
    `at the page of 50: ${String(atPage.count)} row(s), ` +
      `${String(atPage.answerBytes)} answer bytes, ` +
      `${String(atPage.elapsedMs)} ms; at the ceiling of 500: ` +
      `${String(atCeiling.count)} row(s), ` +
      `${String(atCeiling.answerBytes)} answer bytes, ` +
      `${String(atCeiling.elapsedMs)} ms, atCeiling ` +
      `${String(atCeiling.atCeiling)}`
  );
  return atCeiling;
}

sizeRow(4, 'a 100 commit repository, bytes and milliseconds', 'hundred-page', 'hundred-ceiling');

const thousandCeiling = sizeRow(
  5,
  'a 1,000 commit repository, bytes and milliseconds',
  'thousand-page',
  'thousand-ceiling'
);
if (thousandCeiling !== null) {
  if (thousandCeiling.count !== 500 || thousandCeiling.atCeiling !== true) {
    fail(
      `a 1,000 commit repository read at the ceiling answered ` +
        `${String(thousandCeiling.count)} row(s) with atCeiling ` +
        `${String(thousandCeiling.atCeiling)}. It answers 500 rows with ` +
        `atCeiling true, because there are older commits Tortie will not read.`
    );
  }
}

sizeRow(6, 'a 10,000 commit repository, bytes and milliseconds', 'tenk-page', 'tenk-ceiling');

// ---------------------------------------------------------------------------
// Row 7. THE CEILING IS REAL. This is the row that keeps this phase at tier 2
// ---------------------------------------------------------------------------

const over = answerFor('tenk-over');
if (over !== null) {
  step(
    7,
    'THE CEILING. 20,000 asked of a 10,000 commit repository',
    `${String(over.count)} row(s), maxCount ${String(over.maxCount)}, ceiling ` +
      `${String(over.ceiling)}, ${String(over.answerBytes)} answer bytes, ` +
      `${String(over.elapsedMs)} ms`
  );
  if (over.count !== 500 || over.maxCount !== 500 || over.ceiling !== 500) {
    fail(
      `asking for 20,000 commits answered ${String(over.count)} row(s) with ` +
        `maxCount ${String(over.maxCount)} and ceiling ${String(over.ceiling)}. ` +
        `It answers 500, 500 and 500. THIS IS THE ROW THAT KEEPS THIS PHASE AT ` +
        `TIER 2: 20,000 commits would be about 5,400,000 base64 bytes in one ` +
        `answer that main buffers whole.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 8. The three anchors and the marks, against git's own answers
// ---------------------------------------------------------------------------

const twoAhead = answerFor('work');
if (twoAhead !== null) {
  const wantHead = truthHead(work);
  const wantUpstream = truthUpstream(work);
  const wantBase = truthMergeBase(work);
  const wantSides = truthSides(work);
  step(
    8,
    'a branch two ahead and one behind, against git’s own answers',
    `head ${String(twoAhead.headSha)} against ${wantHead}; upstream ` +
      `${String(twoAhead.upstreamSha)} against ${wantUpstream}; merge base ` +
      `${String(twoAhead.mergeBase)} against ${wantBase}; ` +
      `${String(twoAhead.unpushed.length)} unpushed against ` +
      `${String(wantSides.ours.length)}, ${String(twoAhead.unpulled.length)} ` +
      `unpulled against ${String(wantSides.theirs.length)}, marked ` +
      `${String(twoAhead.markedCount)}`
  );
  if (
    twoAhead.headSha !== wantHead ||
    twoAhead.upstreamSha !== wantUpstream ||
    twoAhead.mergeBase !== wantBase
  ) {
    fail(
      `the three anchors Tortie drew are not the three git prints in that ` +
        `repository.`
    );
  }
  if (wantSides.ours.length !== 2 || wantSides.theirs.length !== 1) {
    fail(
      `this repository was built to be 2 ahead and 1 behind and git says ` +
        `${String(wantSides.ours.length)} and ` +
        `${String(wantSides.theirs.length)}, so the row proves less than it ` +
        `claims to.`
    );
  }
  if (
    !same([...twoAhead.unpushed].sort(), [...wantSides.ours].sort()) ||
    !same([...twoAhead.unpulled].sort(), [...wantSides.theirs].sort())
  ) {
    fail(
      `the commits Tortie marked are not the ones ` +
        `git rev-list --left-right HEAD...@{u} names in that repository.`
    );
  }
  if (twoAhead.divergenceTruncated !== false) {
    fail(
      'three marks against a window of 51 reported that the mark read was cut.'
    );
  }
}

// ---------------------------------------------------------------------------
// Row 9. THE LINKED WORKTREE. It fails on --absolute-git-dir
// ---------------------------------------------------------------------------

const worktree = answerFor('linked');
if (worktree !== null) {
  const wantHead = truthHead(linked);
  step(
    9,
    'a linked worktree on a second branch',
    `mode ${String(worktree.mode)}, ${String(worktree.count)} row(s), head ` +
      `${String(worktree.headSha)} against ${wantHead}`
  );
  if (
    worktree.mode !== 'ok' ||
    worktree.count === 0 ||
    worktree.headSha !== wantHead
  ) {
    fail(
      `a linked worktree answered mode ${String(worktree.mode)} with ` +
        `${String(worktree.count)} row(s) and head ` +
        `${String(worktree.headSha)}. It answers ok with rows and with ` +
        `${wantHead}. THIS IS THE ROW THAT FAILS ON --absolute-git-dir.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 10 and 11. A detached head, and the second cut
// ---------------------------------------------------------------------------

const det = answerFor('detached');
if (det !== null) {
  const wantHead = truthHead(detached);
  step(
    10,
    'a detached head',
    `mode ${String(det.mode)}, ${String(det.count)} row(s), head ` +
      `${String(det.headSha)}, upstream ${String(det.upstreamSha)}, merge base ` +
      `${String(det.mergeBase)}`
  );
  if (
    det.mode !== 'ok' ||
    det.count === 0 ||
    det.headSha !== wantHead ||
    det.upstreamSha !== null ||
    det.mergeBase !== null
  ) {
    fail(
      `a detached head answered mode ${String(det.mode)} with ` +
        `${String(det.count)} row(s), upstream ${String(det.upstreamSha)} and ` +
        `merge base ${String(det.mergeBase)}. It still walks, and its two ` +
        `upstream anchors are both null because @{u} names nothing there.`
    );
  }
}

const truncated = answerFor('ahead60');
if (truncated !== null) {
  step(
    11,
    'a branch 60 commits ahead, read at the page',
    `${String(truncated.count)} row(s), marked ` +
      `${String(truncated.markedCount)}, divergenceTruncated ` +
      `${String(truncated.divergenceTruncated)}`
  );
  if (truncated.divergenceTruncated !== true) {
    fail(
      `a branch 60 commits ahead read at the page reported ` +
        `divergenceTruncated ${String(truncated.divergenceTruncated)}. It ` +
        `reports true: the marks were asked for with the same count as the ` +
        `walk, so an older commit is drawn without a mark whether it has one ` +
        `or not, and the panel has to say so.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 12 and 13. The tag on a blob, and the walk that must not become a HEAD
// walk
// ---------------------------------------------------------------------------

const tagged = answerFor('blobtag');
if (tagged !== null) {
  const want = truthWalk(blobtag, 51);
  step(
    12,
    'a lightweight tag and an annotated tag, both pointing at a blob',
    `mode ${String(tagged.mode)}, ${String(tagged.count)} row(s), git ` +
      `${String(want.length)}`
  );
  if (tagged.mode !== 'ok' || !same(tagged.hashes, want)) {
    fail(
      `a repository holding a tag on a blob answered mode ` +
        `${String(tagged.mode)} with ${String(tagged.count)} row(s) and git ` +
        `walks ${String(want.length)}. The walk has to survive it on the far ` +
        `side's own git. It is a survival check rather than the reason the walk ` +
        `shape was chosen: measured on git 2.50.1, both walk shapes answered ` +
        `with the commit row at exit code 0.`
    );
  }
}

const orphan = answerFor('norefs');
if (orphan !== null) {
  const want = truthWalk(norefs, 51);
  step(
    13,
    'THE EMPTY WALK. A commit and no refs at all',
    `mode ${String(orphan.mode)}, ${String(orphan.count)} row(s), git ` +
      `${String(want.length)}`
  );
  if (orphan.count !== want.length || orphan.count !== 0) {
    fail(
      `a repository holding a commit and no refs answered ` +
        `${String(orphan.count)} row(s) and git walks ${String(want.length)}. ` +
        `Both are 0. THIS IS THE MEASURED REFUSAL OF THE --stdin SHAPE: ` +
        `printf '' | git log --stdin walks HEAD silently, so an empty ref list ` +
        `on the far side would have answered a HEAD only walk while this end ` +
        `believed it had asked for everything.`
    );
  }
  if (orphan.mode !== 'noCommits') {
    fail(
      `a repository the walk found nothing in answered mode ` +
        `${String(orphan.mode)}. It answers noCommits, which is one word for ` +
        `two causes and the sentence on screen names both.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 14. The symbolic origin/HEAD alias
// ---------------------------------------------------------------------------

if (twoAhead !== null) {
  const want = truthWalk(work, 51);
  const unique = new Set(twoAhead.hashes);
  const aliasDrawn = (twoAhead.refs ?? []).filter((one) =>
    one.endsWith('/HEAD')
  );
  const aliasExists = truthRefNames(work).some((one) => one.endsWith('/HEAD'));
  step(
    14,
    'a repository carrying a symbolic origin/HEAD',
    `that machine holds the alias: ${String(aliasExists)}; Tortie drew ` +
      `${String(twoAhead.hashes.length)} row(s), ${String(unique.size)} of them ` +
      `different, git walks ${String(want.length)}; the alias is drawn as a ` +
      `badge ${String(aliasDrawn.length)} time(s)`
  );
  if (!aliasExists) {
    fail(
      'the clone this row reads carries no <remote>/HEAD alias, so the row ' +
        'proves nothing.'
    );
  }
  if (unique.size !== twoAhead.hashes.length) {
    fail(
      `Tortie drew ${String(twoAhead.hashes.length)} row(s) and only ` +
        `${String(unique.size)} of them are different commits. The alias names ` +
        `a commit that is already a tip of the branch it aliases, so the walk ` +
        `sees no commit it would not have seen.`
    );
  }
  if (!same(twoAhead.hashes, want)) {
    fail('the walk Tortie drew is not the walk git prints in that repository.');
  }
  if (aliasDrawn.length > 0) {
    fail(
      `the symbolic alias was drawn as a badge ${String(aliasDrawn.length)} ` +
        `time(s). parseDecoration drops it, because it duplicates the remote's ` +
        `default branch.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 15. The four shapes that carry no commits
// ---------------------------------------------------------------------------

const fresh = answerFor('empty');
const notRepo = answerFor('plain');
const missing = answerFor('absent');
const shut = answerFor('denied');
if (fresh !== null && notRepo !== null && missing !== null && shut !== null) {
  step(
    15,
    'a repository with no commits, a folder git does not track, one that is not there, and one at mode 000',
    `${String(fresh.mode)}, ${String(notRepo.mode)}, ${String(missing.mode)} ` +
      `and ${String(shut.mode)}`
  );
  if (fresh.mode !== 'noCommits') {
    fail(`a repository with no commits answered ${String(fresh.mode)}.`);
  }
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
// Row 16. THE PROGRAM COUNT, measured against the shipped text
// ---------------------------------------------------------------------------

const scriptText = String(driven.scriptText ?? '');
const wrapDir = join(root, 'p107-wrappers');
const spawnLog = join(root, 'p107-spawns.log');
mkdirSync(wrapDir, { recursive: true, mode: 0o700 });

// A counting wrapper for every external program the script could reach for. A
// program that is a shell builtin in dash and in bash is never seen by one of
// these, which is why `printf`, `cd` and `[` are not in the numbers.
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
  sh('/bin/sh', ['-c', scriptText, 'tortie-repo-history', folder, '51'], {
    env: { ...process.env, PATH: `${wrapDir}:/usr/bin:/bin` }
  });
  const lines = readFileSync(spawnLog, 'utf8')
    .split('\n')
    .filter((one) => one.length > 0);
  const tally = new Map();
  for (const name of lines) tally.set(name, (tally.get(name) ?? 0) + 1);
  return {
    total: lines.length,
    which: [...tally.entries()].sort().map(([n, c]) => `${n} x${String(c)}`).join(', ')
  };
}

if (scriptText.length === 0) {
  step(
    16,
    'the external programs the far side runs',
    'SKIPPED. The driver returned no script text, so nothing was measured. A skipped row is not a pass.'
  );
  fail(
    'the shipped script text did not reach this probe, so the spawn count was never measured.'
  );
} else {
  const shapes = [
    ['a folder that is not there', absent, 0],
    ['a folder the account cannot read', denied, 0],
    ['a folder git does not track', plain, 1],
    ['a repository with no commits', empty, 6],
    ['a branch that follows nothing', solo, 6],
    ['a detached head', detached, 6],
    ['a branch with an upstream', work, 10],
    ['a linked worktree on a branch with an upstream', linked, 10]
  ];
  const readings = [];
  for (const [what, folder, expected] of shapes) {
    const runs = [];
    for (let at = 0; at < 5; at += 1) runs.push(countSpawns(folder));
    const totals = runs.map((one) => one.total);
    const steady = totals.every((one) => one === totals[0]);
    readings.push(`${what}: ${totals.join(', ')} (${runs[0].which || 'none'})`);
    if (!steady) {
      fail(
        `${what} ran a different number of programs across five runs: ` +
          `${totals.join(', ')}.`
      );
    }
    if (totals[0] !== expected) {
      fail(
        `${what} ran ${String(totals[0])} external program(s) and the header of ` +
          `src/main/machines/remote-history.ts claims ${String(expected)}. THE ` +
          `MEASUREMENT WINS: correct the header rather than this row.`
      );
    }
  }
  step(
    16,
    'the external programs the far side runs, five runs of each shape',
    readings.join('; ')
  );
}

// ---------------------------------------------------------------------------
// Row 17, taken before the machine is stopped
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
  17,
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
// Row 18. THE GUARD THAT STAYED HOME
// ---------------------------------------------------------------------------

const sanitized = new Map();
for (const row of driven.sanitized ?? []) sanitized.set(row.name, row.out);
{
  let checked = 0;
  let names = 0;
  const wrong = [];
  for (const set of refSets) {
    const out = sanitized.get(set.name);
    checked += 1;
    names += set.refs.length;
    if (out === undefined || !same(out, set.refs)) {
      wrong.push(
        `${set.name}: that machine holds ${set.refs.join(', ') || 'no refs'} ` +
          `and the guard returns ${(out ?? []).join(', ') || 'nothing'}`
      );
    }
  }
  step(
    18,
    'sanitizeRefNames over every scratch repository’s own ref names',
    `${String(checked)} repositor(ies), ${String(names)} ref name(s), ` +
      `${wrong.length === 0 ? 'every name passed unchanged and in order' : wrong.join('; ')}; ` +
      `the shipped script names --stdin ` +
      `${scriptText.includes('--stdin') ? 'AND IT MUST NOT' : '0 times'}`
  );
  if (wrong.length > 0) {
    fail(
      `the guard changed or dropped a ref name in ${String(wrong.length)} ` +
        `repositor(ies). Every name the refused --stdin shape could have sent ` +
        `is a name that guard would have passed unchanged, and that is what ` +
        `makes removing its job safe rather than convenient.`
    );
  }
  if (scriptText.includes('--stdin')) {
    fail('the shipped script names --stdin.');
  }
}

// ---------------------------------------------------------------------------
// Row 19. The exact bytes that crossed
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
  19,
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
if (existsSync('/tmp/p107-pwned')) {
  fail(
    'the hostile folder value ran as a command somewhere. /tmp/p107-pwned exists.'
  );
}

// ---------------------------------------------------------------------------
// Row 20. THE COMMIT FILE DIFF, MEASURED AND NOT SHIPPED
// ---------------------------------------------------------------------------
//
// TORTIE DOES NOT DRAW A COMMIT'S FILE DIFF ON A REMOTE TAB AFTER THIS PHASE.
// This row runs the two `git show` calls such a diff would need, over PLAIN ssh
// and outside the product, so the phase that draws it inherits a measurement
// rather than an estimate. It goes through no catalogue script, no channel and
// no module of Tortie's, and it names its OWN known hosts file so nothing is
// added to the person's.

{
  const userKey = join(root, 'p107-userkey');
  const knownHosts = join(root, 'p107-plain-ssh-known-hosts');
  writeFileSync(knownHosts, '', 'utf8');
  const sshArgs = [
    '-p',
    String(PORT),
    '-i',
    userKey,
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    `UserKnownHostsFile=${knownHosts}`,
    '-o',
    'GlobalKnownHostsFile=/dev/null',
    `${yard.user}@${TARGET}`
  ];
  // The newest commit that changed a file, and the file it changed, read in the
  // repository rather than guessed.
  const sha = gitIn(work, 'rev-parse', 'HEAD').stdout.trim();
  const path = gitIn(work, 'show', '--name-only', '--format=', 'HEAD')
    .stdout.split('\n')
    .filter((one) => one.length > 0)[0];
  if (sha.length === 0 || path === undefined) {
    step(20, 'the two git show calls a commit’s file diff would need', 'SKIPPED. No commit and file could be chosen, so nothing was measured. A skipped row is not a pass.');
    fail('row 20 could not choose a commit and a file, so it measured nothing.');
  } else {
    const timed = (spec) => {
      const started = Date.now();
      const out = sh('/usr/bin/ssh', [
        ...sshArgs,
        `cd ${work} && git show ${spec}`
      ], { env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } });
      return { ms: Date.now() - started, bytes: out.stdout.length, code: out.code };
    };
    const after = timed(`'${sha}:${path}'`);
    const before = timed(`'${sha}^:${path}'`);
    step(
      20,
      'the two git show calls a commit’s file diff would need, over plain ssh and outside the product',
      `${path} at ${sha.slice(0, 7)}: after ${String(after.bytes)} bytes in ` +
        `${String(after.ms)} ms (exit ${String(after.code)}), before ` +
        `${String(before.bytes)} bytes in ${String(before.ms)} ms (exit ` +
        `${String(before.code)}). TORTIE DOES NOT DRAW THIS DIFF ON A REMOTE ` +
        `TAB AFTER THIS PHASE. The number is banked for the phase that does.`
    );
    if (after.code !== 0) {
      fail(
        `git show of the file at that commit exited ${String(after.code)} over ` +
          `plain ssh, so the number this row banks is not a number.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Row 21. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
const knownHostsAfter = personKnownHostsBytes();
step(
  21,
  'the operator’s sessions on -L gmux, after, and their own known hosts file',
  `${sessionsBefore} before, ${sessionsAfter} after; ~/.ssh/known_hosts ` +
    `${knownHostsBefore} bytes before, ${knownHostsAfter} bytes after`
);
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's session count moved from ${sessionsBefore} to ` +
      `${sessionsAfter}. This probe reads that server and never writes to it.`
  );
}
if (knownHostsBefore !== knownHostsAfter) {
  fail(
    `the person's own ~/.ssh/known_hosts moved from ${knownHostsBefore} to ` +
      `${knownHostsAfter} bytes. Every ssh this probe runs names its own known ` +
      `hosts file under /tmp.`
  );
}

say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac. No Linux machine and ' +
    'no machine of the operator’s was contacted, so GNU git, GNU base64 and ' +
    'GNU coreutils tr are reasoned about from POSIX rather than measured. NO ' +
    'OLD GIT WAS RUN. Nothing here drew a commit’s files, because no code in ' +
    'this product can, and row 20 measured that read outside the product for ' +
    'the phase that will. Nothing here measured two remote tabs reading at ' +
    'once, and nothing here measured a slow link: the milliseconds above are a ' +
    'loopback and they are a floor rather than an expectation.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
