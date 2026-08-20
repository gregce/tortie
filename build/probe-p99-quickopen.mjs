/**
 * `node build/probe-p99-quickopen.mjs`. The live probe of Phase 99, being the
 * file names of a project that lives on another machine.
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
 *  4. The only repository this probe touches is one it makes under /tmp. It
 *     never opens the repository this file lives in, and it runs no git verb
 *     that writes in either of them.
 *  5. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p99-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Twelve rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. The names Tortie holds are exactly the names
 *     `git ls-files --cached --others --exclude-standard` prints when it is run
 *     directly in that repository, compared set against set.
 *  3. A file the repository's own `.gitignore` names is in no row.
 *  4. A file git is not yet tracking IS in a row.
 *  5. A path holding a space round trips.
 *  6. A folder that is not a repository answers `walk`.
 *  7. That walk holds no path under `.git` and none under `node_modules`.
 *  8. A folder that is not there answers `missing`.
 *  9. The name cap holds: 20 asked for, 20 delivered, and the answer says it
 *     cut.
 * 10. Three reads of the whole corpus, in seconds.
 * 11. The read wrote nothing. `git status --porcelain` is compared byte for
 *     byte before and after, and the size and modification time of every file
 *     under `.git` is compared before and after.
 * 12. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * is contacted, so GNU git, GNU find and GNU head are not measured. The corpus
 * is a repository this file made minutes earlier. Nothing here measures a read
 * over a slow link, and nothing here reaches the 50,000 name cap.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
 */

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
const PORT = 45799;

/** How many ordinary source files the corpus holds. */
const CORPUS = 100;

/** The cap row 9 asks for, which is far below the corpus size on purpose. */
const SMALL_CAP = 20;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p99-quickopen-${String(process.pid)}`,
  'p99-quickopen'
);

const root = join('/tmp', `p99-quickopen-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p99-quickopen] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p99-quickopen] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p99-quickopen] ${String(n)}. ${what}: ${evidence}\n`);

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
// The scratch repository, made here and nowhere near the tree this file is in
// ---------------------------------------------------------------------------

const work = join(root, 'p99-repo');
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

// A corpus rather than one file, and larger than the cap row 9 asks for.
for (let at = 1; at <= CORPUS; at += 1) {
  const name = `p99-src-${String(at).padStart(3, '0')}.ts`;
  writeFileSync(join(work, name), `export const value${String(at)} = 1;\n`, 'utf8');
}
// The ignore rule is committed, so the rule is itself a tracked file.
writeFileSync(join(work, '.gitignore'), 'p99-build/\n', 'utf8');
// A file the rule names. It must be in NO row.
mkdirSync(join(work, 'p99-build'), { recursive: true, mode: 0o700 });
writeFileSync(join(work, 'p99-build', 'out.js'), 'var a = 1;\n', 'utf8');
// A path holding a space.
writeFileSync(join(work, 'p99-a b.ts'), 'export const spaced = 1;\n', 'utf8');
git('add', '-A');
git('commit', '-q', '-m', 'the first commit');

// A file git is not tracking, being what an agent on that machine just made. It
// MUST be in the list: a file made five minutes ago is the file a person is
// looking for.
writeFileSync(join(work, 'p99-new.ts'), 'export const fresh = 1;\n', 'utf8');

// A pause and then two settling runs, so the index stat cache is up to date and
// this probe's own read cannot be the thing that rewrites it.
//
// THE PAUSE IS LOAD BEARING and it was measured by the Phase 73 probe: git marks
// an entry "racily clean" when the file's modification time equals the index's
// own, and the next status then rewrites the index. That rewrite landed inside a
// read once and was reported as the read having changed a file.
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

// A folder with no git in it at all, for the walk branch. It holds a `.git`
// directory below it and a `node_modules` directory, and row 7 requires that
// neither reaches a row.
const plain = join(root, 'p99-plain');
mkdirSync(join(plain, 'nested', '.git'), { recursive: true, mode: 0o700 });
mkdirSync(join(plain, 'node_modules', 'dep'), { recursive: true, mode: 0o700 });
writeFileSync(join(plain, 'p99-plain.ts'), 'export const plain = 1;\n', 'utf8');
writeFileSync(join(plain, 'nested', '.git', 'config'), '[core]\n', 'utf8');
writeFileSync(join(plain, 'node_modules', 'dep', 'index.js'), 'module.exports = 1;\n', 'utf8');

say(
  `the scratch corpus is ${work}, ${String(readdirSync(work).length)} entries, ` +
    `${String(gitBefore.size)} file(s) under .git; plain folder ${plain}`
);

// ---------------------------------------------------------------------------
// The truth, read in that repository and never in this one
// ---------------------------------------------------------------------------

/** Every name git itself lists, being the set Tortie is measured against. */
function truthFromGit() {
  const out = sh(
    '/bin/sh',
    ['-c', 'git ls-files --cached --others --exclude-standard'],
    { cwd: work }
  );
  return out.stdout.split('\n').filter((one) => one.length > 0);
}

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p99-files-driver.ts');
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
const files = await import(REPO + '/src/main/machines/remote-files');

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
      const answer = await files.listFilesOnMachine({
        machineId: ctx.machineId,
        cwd: String(op.cwd),
        ...(op.maxPaths === undefined ? {} : { maxPaths: Number(op.maxPaths) })
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

writeFileSync(outPath, JSON.stringify({ answers }), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p99-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p99-out-${String(driverCalls)}.json`);
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
        GMUX_SMOKE: 'probe-p99-quickopen',
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
  prefix: 'p99',
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
  const tmuxTmp = machineTmuxTmp('p99', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
  // The scratch corpus, the scratch keys and every driver file this run wrote.
  // Nothing outside this one directory is removed, and the directory name
  // carries this process id, so a run cannot reach another run's files.
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(2);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);

const ctxInput = {
  machineId: 'p99-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p99-control'),
  hostKeys: join(root, 'p99-known-machines'),
  userHostKeys: join(root, 'p99-person-known-hosts')
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
    { name: 'whole', cwd: work },
    { name: 'again', cwd: work },
    { name: 'third', cwd: work },
    { name: 'capped', cwd: work, maxPaths: SMALL_CAP },
    { name: 'walk', cwd: plain },
    { name: 'missing', cwd: join(root, 'p99-never-made') }
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

const whole = answerFor('whole');

// ---------------------------------------------------------------------------
// Rows 2 to 5
// ---------------------------------------------------------------------------

if (whole !== null) {
  const mine = new Set(whole.paths ?? []);
  const theirs = truthFromGit();
  const theirsSet = new Set(theirs);
  const missing = theirs.filter((one) => !mine.has(one));
  const extra = [...mine].filter((one) => !theirsSet.has(one));
  step(
    2,
    'the name set against git’s own answer',
    `mode ${String(whole.mode)}, Tortie ${String(mine.size)} name(s), git ` +
      `${String(theirs.length)}; ${String(missing.length)} missing, ` +
      `${String(extra.length)} extra`
  );
  if (whole.mode !== 'repo' || missing.length > 0 || extra.length > 0) {
    fail(
      `the name set differs from git's own answer. missing: ` +
        `${missing.slice(0, 10).join(', ')}; extra: ${extra.slice(0, 10).join(', ')}`
    );
  }

  const ignored = [...mine].filter((one) => one.startsWith('p99-build/'));
  step(
    3,
    'the file the repository ignores',
    ignored.length === 0
      ? `not listed, out of ${String(mine.size)} name(s)`
      : `IT IS LISTED as ${ignored.join(', ')}`
  );
  if (ignored.length > 0) fail('a file the repository ignores reached the list.');

  step(
    4,
    'the file git is not tracking',
    mine.has('p99-new.ts') ? 'listed' : 'NOT LISTED, which it must be'
  );
  if (!mine.has('p99-new.ts')) {
    fail(
      'a file an agent on that machine just made is not in the list, so a ' +
        'person could not open it by name.'
    );
  }

  step(
    5,
    'the path holding a space',
    mine.has('p99-a b.ts') ? 'listed as "p99-a b.ts"' : 'NOT LISTED'
  );
  if (!mine.has('p99-a b.ts')) {
    fail('a path holding a space did not round trip.');
  }
}

// ---------------------------------------------------------------------------
// Rows 6 to 8
// ---------------------------------------------------------------------------

const walked = answerFor('walk');
if (walked !== null) {
  const paths = [...(walked.paths ?? [])];
  step(
    6,
    'a folder that is not a repository',
    `mode ${String(walked.mode)}, ${String(paths.length)} name(s): ` +
      `${paths.join(', ')}`
  );
  if (walked.mode !== 'walk' || !paths.includes('p99-plain.ts')) {
    fail(
      'a folder that is not a repository did not answer walk with the file ' +
        'that is in it.'
    );
  }

  const inside = paths.filter(
    (one) => one.includes('.git/') || one.includes('node_modules/')
  );
  step(
    7,
    'what the walk pruned',
    inside.length === 0
      ? 'no name under .git and none under node_modules'
      : `IT LISTED ${inside.join(', ')}`
  );
  if (inside.length > 0) {
    fail(
      'the walk listed a name under .git or under node_modules. Both are ' +
        'pruned on the far side and neither may cross the link.'
    );
  }
}

const missingAnswer = answerFor('missing');
if (missingAnswer !== null) {
  step(
    8,
    'a folder that is not there',
    `mode ${String(missingAnswer.mode)}, ${String(missingAnswer.paths.length)} name(s)`
  );
  if (missingAnswer.mode !== 'missing' || missingAnswer.paths.length !== 0) {
    fail('a folder that is not on that machine did not answer missing.');
  }
}

// ---------------------------------------------------------------------------
// Rows 9 and 10
// ---------------------------------------------------------------------------

const capped = answerFor('capped');
if (capped !== null) {
  step(
    9,
    `the name cap of ${String(SMALL_CAP)}`,
    `capped ${String(capped.capped)}, ${String(capped.paths.length)} name(s) ` +
      `delivered out of a corpus of ${String(CORPUS)} source files`
  );
  if (capped.capped !== true || capped.paths.length !== SMALL_CAP) {
    fail(
      `a cap of ${String(SMALL_CAP)} delivered ` +
        `${String(capped.paths.length)} name(s) with capped ` +
        `${String(capped.capped)}. It delivers exactly ${String(SMALL_CAP)} ` +
        `and says it cut.`
    );
  }
}

const times = ['whole', 'again', 'third']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true)
  .map((row) => Number(row.answer.elapsedMs));
step(
  10,
  'the whole corpus, three reads',
  times.map((ms) => `${(ms / 1000).toFixed(3)} s`).join(', ') || 'none'
);
if (times.length !== 3) fail('three timed reads did not all answer.');

// ---------------------------------------------------------------------------
// Row 11, taken before the machine is stopped
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
const porcelainAfter = git('status', '--porcelain').stdout;
step(
  11,
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
      `one is .git/index, git refreshed its own stat cache while it read, which ` +
      `is a write git makes rather than one Tortie makes. Either way it is a ` +
      `change and this probe reports it rather than excusing it.`
  );
}
if (porcelainBefore !== porcelainAfter) {
  fail('the working tree on the machine is not what it was before the read.');
}

// ---------------------------------------------------------------------------
// Row 12. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  12,
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
    'no machine of the operator’s was contacted, so GNU git, GNU find and ' +
    'GNU head are not measured. Nothing here measured a slow link, and ' +
    'nothing here reached the 50,000 name cap.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
