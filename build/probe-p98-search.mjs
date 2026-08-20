/**
 * `node build/probe-p98-search.mjs`. The live probe of Phase 98, being a search
 * of a project that lives on another machine.
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
 * Every scratch file carries a `p98-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Seventeen rows, printed one per line with the evidence beside each one.
 *
 *  1. The rows Tortie built name exactly the files and lines that
 *     `git ls-files -z --cached --others --exclude-standard | xargs -0 grep -In`
 *     names when it is run directly in that repository.
 *  2. The same set equals what the bundled ripgrep finds on the same corpus, or
 *     every difference is named.
 *  3. A file the repository's own `.gitignore` names is in no row.
 *  4. A file git is not yet tracking IS in a row. That is the one deviation
 *     this phase takes from research 57 section 2.6, and this is where it is
 *     measured.
 *  5. A path holding a colon parses to the right file and the right line.
 *  6. A 5,000 character line arrives inside the per line cap and its `trimmed`
 *     places the highlight at the column the needle really sits at.
 *  7. A binary file is in no row.
 *  8. A pattern that matches nothing ANSWERS, and does not hang.
 *  9. The wall time of three searches of the whole corpus, in seconds.
 * 10. The match cap holds.
 * 11. The per file cap holds.
 * 12. A folder that is not a repository answers `walk` and finds the file a
 *     `.gitignore` would have hidden.
 * 13. A folder that is not there answers `missing`.
 * 14. A pattern that machine's grep refuses answers `badPattern`.
 * 15. The read is refused while the machine is not answering. The scratch sign
 *     in server is stopped by its recorded pid and the same search is asked for
 *     again. The absence of an answer is not evidence.
 * 16. The search wrote nothing. `git status --porcelain` is compared byte for
 *     byte before and after, and the size and modification time of every file
 *     under `.git` is compared before and after.
 * 17. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac. No Linux machine and no machine of the operator's
 * is contacted, so GNU grep, GNU xargs and GNU find are not measured. The
 * corpus is a repository this file made minutes earlier. Nothing here measures
 * a search over a slow link.
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
const PORT = 45798;

/** The word every corpus file holds, and the one every row below searches for. */
const NEEDLE = 'NEEDLE_P98_MARKER';

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p98-search-${String(process.pid)}`,
  'p98-search'
);

const root = join('/tmp', `p98-search-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p98-search] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p98-search] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p98-search] ${String(n)}. ${what}: ${evidence}\n`);

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

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch repository, made here and nowhere near the tree this file is in
// ---------------------------------------------------------------------------

const work = join(root, 'p98-repo');
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

// 40 ordinary source files, each holding the needle once, so the corpus is a
// corpus rather than one file.
for (let at = 1; at <= 40; at += 1) {
  const name = `p98-src-${String(at).padStart(2, '0')}.ts`;
  writeFileSync(
    join(work, name),
    `export const value${String(at)} = 1;\n// ${NEEDLE} in file ${String(at)}\n`,
    'utf8'
  );
}
// The ignore rule is committed, so the rule is itself a tracked file that holds
// no needle and cannot show up as one.
writeFileSync(join(work, '.gitignore'), 'p98-build/\n', 'utf8');
// A file the rule names. It must be in NO row.
mkdirSync(join(work, 'p98-build'), { recursive: true, mode: 0o700 });
writeFileSync(join(work, 'p98-build', 'out.js'), `var a = "${NEEDLE}";\n`, 'utf8');
// A path holding a colon.
writeFileSync(join(work, 'p98-we:ird.ts'), `// ${NEEDLE} in a colon path\n`, 'utf8');
// One 5,006 character line with the needle 100 characters into it.
writeFileSync(
  join(work, 'p98-long.ts'),
  `${'a'.repeat(100)}${NEEDLE}${'b'.repeat(4_900)}\n`,
  'utf8'
);
// A file with more matches than the per file cap.
const MANY = 1_050;
writeFileSync(
  join(work, 'p98-many.ts'),
  Array.from({ length: MANY }, (_, at) => `// ${NEEDLE} ${String(at + 1)}`).join('\n') +
    '\n',
  'utf8'
);
// A binary file holding the needle. `grep -I` skips it and so must Tortie.
writeFileSync(
  join(work, 'p98-binary.bin'),
  Buffer.concat([
    Buffer.from(`${NEEDLE}\n`, 'utf8'),
    Buffer.from([0, 1, 2, 0, 3, 4]),
    Buffer.from('tail\n', 'utf8')
  ])
);
git('add', '-A');
git('commit', '-q', '-m', 'the first commit');

// A file git is not tracking, being what an agent on that machine just made. It
// MUST be searched: that is the deviation from research 57 section 2.6 this
// phase takes, and row 4 is where it is measured.
writeFileSync(join(work, 'p98-new.ts'), `// ${NEEDLE} in an untracked file\n`, 'utf8');

// A pause and then two settling runs, so the index stat cache is up to date and
// the search's own read cannot be the thing that rewrites it.
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

// The same corpus again, with no git in it at all, for the walk branch.
const plain = join(root, 'p98-plain');
mkdirSync(join(plain, 'p98-build'), { recursive: true, mode: 0o700 });
writeFileSync(join(plain, '.gitignore'), 'p98-build/\n', 'utf8');
writeFileSync(join(plain, 'p98-build', 'out.js'), `var a = "${NEEDLE}";\n`, 'utf8');
writeFileSync(join(plain, 'p98-plain.ts'), `// ${NEEDLE} in a plain folder\n`, 'utf8');

step(
  1,
  'the scratch corpus',
  `${work}, ${String(readdirSync(work).length)} entries, ` +
    `${String(gitBefore.size)} file(s) under .git; plain folder ${plain}`
);

// ---------------------------------------------------------------------------
// The truth, read two ways, in that repository and never in this one
// ---------------------------------------------------------------------------

/**
 * `path:line` for every line of `grep -H -n` output, split by the FILE LIST
 * rather than by counting colons.
 *
 * The corpus holds a file called `p98-we:ird.ts`, so a naive split at the first
 * colon reads its name as `p98-we` and its line number as `ird.ts`. This
 * function is the truth Tortie is measured against, so it must not use Tortie's
 * own rule for the same ambiguity. It uses something Tortie does not have,
 * being the list of files that really exist, and takes the longest one the line
 * begins with.
 */
function splitByFileList(lines, paths) {
  const known = [...paths].sort((a, b) => b.length - a.length);
  const out = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    const path = known.find((one) => line.startsWith(`${one}:`));
    if (path === undefined) {
      fail(`a line of the truth names no file in the corpus: ${line.slice(0, 80)}`);
      continue;
    }
    const rest = line.slice(path.length + 1);
    const at = rest.indexOf(':');
    out.push(`${path}:${rest.slice(0, at)}`);
  }
  return out;
}

/** `path:line` for every hit, as git and grep name them together. */
function truthFromGit() {
  const listed = sh('/bin/sh', [
    '-c',
    "git ls-files -z --cached --others --exclude-standard | tr '\\0' '\\n'"
  ], { cwd: work });
  const paths = listed.stdout.split('\n').filter((one) => one.length > 0);
  const out = sh('/bin/sh', [
    '-c',
    'git ls-files -z --cached --others --exclude-standard | ' +
      `xargs -0 grep -I -H -n -F -e ${JSON.stringify(NEEDLE)}`
  ], { cwd: work });
  return splitByFileList(out.stdout.split('\n'), paths);
}

/** The same question asked of the ripgrep this build ships. */
function truthFromRipgrep() {
  const rg = join(
    repoRoot,
    'node_modules',
    `@vscode/ripgrep-${process.platform}-${process.arch}`,
    'bin',
    'rg'
  );
  if (!existsSync(rg)) return null;
  const listed = sh(rg, ['--files'], { cwd: work });
  const paths = listed.stdout
    .split('\n')
    .filter((one) => one.length > 0)
    .map((one) => (one.startsWith('./') ? one.slice(2) : one));
  const out = sh(
    rg,
    ['--no-heading', '--with-filename', '--line-number', '--fixed-strings', '-e', NEEDLE, '.'],
    { cwd: work }
  );
  const lines = out.stdout
    .split('\n')
    .map((one) => (one.startsWith('./') ? one.slice(2) : one));
  return splitByFileList(lines, paths);
}

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p98-search-driver.ts');
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
const search = await import(REPO + '/src/main/machines/remote-search');
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

const answers: unknown[] = [];

try {
  context.registerRemoteMachineContext(ctx);
  if (input.connected !== false) {
    await remotePath.captureRemotePath(ctx);
    // The link has to read as answering for the one door to open at all.
    control.noteMachineAnswered(ctx.machineId, Date.now());
  } else {
    // The machine is DOWN and everything else about it is as it was while it
    // was up: a registered context, and a program search list recorded for this
    // connection. That is what makes the leg prove the one property it is
    // about, being that the door refuses on the LINK rather than on some
    // earlier condition happening to fail first.
    context.setMachineRemotePath(ctx.machineId, '/usr/bin:/bin');
    control.noteMachineQuiet(ctx.machineId, 'the probe stopped the machine');
  }
  for (const op of input.ops as Record<string, unknown>[]) {
    try {
      const answer = await search.searchOnMachine({
        machineId: ctx.machineId,
        cwd: String(op.cwd),
        query: String(op.query),
        isRegex: op.isRegex === true,
        isCaseSensitive: op.isCaseSensitive === true,
        matchWholeWord: op.matchWholeWord === true,
        ...(op.maxResults === undefined ? {} : { maxResults: Number(op.maxResults) })
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

writeFileSync(
  outPath,
  JSON.stringify({ answers, notConnected: copy.MACHINE_NOT_CONNECTED }),
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
  const inPath = join(root, `p98-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p98-out-${String(driverCalls)}.json`);
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
        GMUX_SMOKE: 'probe-p98-search',
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
  prefix: 'p98',
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
  const tmuxTmp = machineTmuxTmp('p98', 'one');
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
  machineId: 'p98-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p98-control'),
  hostKeys: join(root, 'p98-known-machines'),
  userHostKeys: join(root, 'p98-person-known-hosts')
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
// One process, every search, so the connection is opened once
// ---------------------------------------------------------------------------

const driven = drive({
  ...ctxInput,
  ops: [
    { name: 'whole', cwd: work, query: NEEDLE, isCaseSensitive: true },
    { name: 'again', cwd: work, query: NEEDLE, isCaseSensitive: true },
    { name: 'third', cwd: work, query: NEEDLE, isCaseSensitive: true },
    {
      name: 'nomatch',
      cwd: work,
      query: 'zzzz-nothing-in-this-corpus-zzzz',
      isCaseSensitive: true
    },
    { name: 'capped', cwd: work, query: NEEDLE, isCaseSensitive: true, maxResults: 20 },
    { name: 'walk', cwd: plain, query: NEEDLE, isCaseSensitive: true },
    { name: 'missing', cwd: join(root, 'p98-never-made'), query: NEEDLE, isCaseSensitive: true },
    { name: 'badpattern', cwd: work, query: 'a(', isRegex: true, isCaseSensitive: true }
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
      `the search called "${name}" did not answer. ` +
        `${String(row?.message ?? '')} ${String(row?.detail ?? '')}`
    );
    return null;
  }
  return row.answer;
}

const whole = answerFor('whole');

/** `path:line` for every match in one answer. */
function hitsOf(answer) {
  const out = [];
  for (const file of answer.files ?? []) {
    for (const match of file.matches ?? []) {
      out.push(`${String(file.relPath)}:${String(match.line)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rows 1 to 9
// ---------------------------------------------------------------------------

if (whole !== null) {
  const mine = hitsOf(whole);
  const theirs = truthFromGit();
  // The per file cap cuts `p98-many.ts`, so the comparison is over the files
  // that were not cut plus a separate count for the one that was. A comparison
  // that ignored the cut would be comparing two different questions.
  const clippedPaths = new Set(
    (whole.files ?? []).filter((file) => file.clipped === true).map((file) => file.relPath)
  );
  const mineSet = new Set(mine);
  const theirsKept = theirs.filter((one) => !clippedPaths.has(one.slice(0, one.lastIndexOf(':'))));
  const missing = theirsKept.filter((one) => !mineSet.has(one));
  const extra = mine.filter((one) => !theirs.includes(one));
  step(
    1,
    'the hit set against git ls-files piped into grep',
    `Tortie ${String(mine.length)} line(s), git and grep ${String(theirs.length)}, ` +
      `${String(clippedPaths.size)} file(s) cut by the per file cap; ` +
      `${String(missing.length)} missing, ${String(extra.length)} extra`
  );
  if (missing.length > 0 || extra.length > 0) {
    fail(
      `the hit set differs from git's own answer. missing: ` +
        `${missing.slice(0, 10).join(', ')}; extra: ${extra.slice(0, 10).join(', ')}`
    );
  }

  const rg = truthFromRipgrep();
  if (rg === null) {
    step(2, 'the hit set against the bundled ripgrep', 'ripgrep is not in this build');
    fail('the bundled ripgrep could not be found, so row 2 measured nothing.');
  } else {
    const rgSet = new Set(rg);
    const notInRg = mine.filter((one) => !rgSet.has(one));
    const notInMine = rg.filter((one) => !mineSet.has(one) && !clippedPaths.has(one.slice(0, one.lastIndexOf(':'))));
    step(
      2,
      'the hit set against the bundled ripgrep',
      `ripgrep ${String(rg.length)} line(s); ${String(notInMine.length)} it found ` +
        `and Tortie did not, ${String(notInRg.length)} Tortie found and it did not` +
        (notInMine.length + notInRg.length === 0
          ? ''
          : `: ${[...notInMine.slice(0, 5), ...notInRg.slice(0, 5)].join(', ')}`)
    );
    if (notInMine.length > 0 || notInRg.length > 0) {
      fail(
        'the search on the machine and the search on this Mac do not name the ' +
          'same lines on the same corpus.'
      );
    }
  }

  const paths = (whole.files ?? []).map((file) => String(file.relPath));
  const ignored = paths.filter((one) => one.startsWith('p98-build/'));
  step(
    3,
    'the file the repository ignores',
    ignored.length === 0
      ? `not listed, out of ${String(paths.length)} file(s)`
      : `IT IS LISTED as ${ignored.join(', ')}`
  );
  if (ignored.length > 0) {
    fail('a file the repository ignores reached the results.');
  }

  step(
    4,
    'the file git is not tracking',
    paths.includes('p98-new.ts') ? 'listed' : 'NOT LISTED, which it must be'
  );
  if (!paths.includes('p98-new.ts')) {
    fail(
      'a file an agent on that machine just made was not searched. That is the ' +
        'one deviation this phase takes from research 57 section 2.6 and it is ' +
        'the row that measures it.'
    );
  }

  const colon = (whole.files ?? []).find((file) => file.relPath === 'p98-we:ird.ts');
  step(
    5,
    'the path holding a colon',
    colon === undefined
      ? 'NOT LISTED'
      : `${String(colon.relPath)} at line ${String(colon.matches?.[0]?.line)}`
  );
  if (colon === undefined || colon.matches?.[0]?.line !== 1) {
    fail('a path holding a colon did not parse to the right file and line.');
  }

  const long = (whole.files ?? []).find((file) => file.relPath === 'p98-long.ts');
  const longMatch = long?.matches?.[0];
  const column =
    longMatch === undefined
      ? -1
      : Number(longMatch.ranges?.[0]?.[0] ?? -1) + Number(longMatch.trimmed ?? 0);
  step(
    6,
    'the 5,006 character line',
    longMatch === undefined
      ? 'NOT LISTED'
      : `${String(longMatch.text.length)} character(s) delivered, highlight at ` +
          `column ${String(column)} of the file, and the needle is at column 100`
  );
  if (longMatch === undefined || longMatch.text.length > 2_000 || column !== 100) {
    fail('the long line did not arrive inside the per line cap with its span placed.');
  }

  step(
    7,
    'the binary file',
    paths.includes('p98-binary.bin') ? 'IT IS LISTED' : 'not listed'
  );
  if (paths.includes('p98-binary.bin')) {
    fail('a binary file reached the results. grep -I skips it and so must Tortie.');
  }
}

const nomatch = answerFor('nomatch');
if (nomatch !== null) {
  step(
    8,
    'a pattern that matches nothing',
    `mode ${String(nomatch.mode)}, ${String(nomatch.files.length)} file(s), ` +
      `${(Number(nomatch.elapsedMs) / 1000).toFixed(3)} s`
  );
  if (nomatch.mode !== 'repo' || nomatch.files.length !== 0) {
    fail('a pattern that matches nothing did not answer with an empty repo result.');
  }
}

const times = ['whole', 'again', 'third']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true)
  .map((row) => Number(row.answer.elapsedMs));
step(
  9,
  'the whole corpus, three runs',
  times.map((ms) => `${(ms / 1000).toFixed(3)} s`).join(', ') || 'none'
);
if (times.length !== 3) fail('three timed searches did not all answer.');

// ---------------------------------------------------------------------------
// Rows 10 to 14
// ---------------------------------------------------------------------------

const capped = answerFor('capped');
if (capped !== null) {
  const delivered = (capped.files ?? []).reduce(
    (sum, file) => sum + Number(file.matchCount ?? 0),
    0
  );
  step(
    10,
    'the match cap of 20',
    `capped ${String(capped.capped)}, ${String(delivered)} matching line(s) delivered`
  );
  if (capped.capped !== true || delivered !== 20) {
    fail(
      `a cap of 20 delivered ${String(delivered)} line(s) with capped ` +
        `${String(capped.capped)}. It delivers exactly 20 and says it cut.`
    );
  }
}

if (whole !== null) {
  const many = (whole.files ?? []).find((file) => file.relPath === 'p98-many.ts');
  step(
    11,
    'the per file cap',
    many === undefined
      ? 'NOT LISTED'
      : `${String(many.matches.length)} match(es) kept of ` +
          `${String(many.matchCount)} found, clipped ${String(many.clipped)}`
  );
  if (
    many === undefined ||
    many.clipped !== true ||
    many.matches.length !== 1_000 ||
    many.matchCount !== MANY
  ) {
    fail('the per file cap did not hold on a file with more matches than it.');
  }
}

const walked = answerFor('walk');
if (walked !== null) {
  const paths = (walked.files ?? []).map((file) => String(file.relPath));
  step(
    12,
    'a folder that is not a repository',
    `mode ${String(walked.mode)}, ${String(paths.length)} file(s): ${paths.join(', ')}`
  );
  if (walked.mode !== 'walk' || !paths.includes('p98-build/out.js')) {
    fail(
      'a folder that is not a repository did not answer walk with the file a ' +
        'gitignore would have hidden.'
    );
  }
}

const missingAnswer = answerFor('missing');
if (missingAnswer !== null) {
  step(13, 'a folder that is not there', `mode ${String(missingAnswer.mode)}`);
  if (missingAnswer.mode !== 'missing') {
    fail('a folder that is not on that machine did not answer missing.');
  }
}

const bad = answerFor('badpattern');
if (bad !== null) {
  step(14, 'a pattern that machine’s grep refuses', `mode ${String(bad.mode)}`);
  if (bad.mode !== 'badPattern') {
    fail('a pattern that machine’s grep refuses did not answer badPattern.');
  }
}

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
const porcelainAfter = git('status', '--porcelain').stdout;
step(
  16,
  'the repository across every search',
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
    `a search changed ${String(moved.length)} file(s) under .git. If the only ` +
      `one is .git/index, git refreshed its own stat cache while it read, which ` +
      `is a write git makes rather than one Tortie makes. Either way it is a ` +
      `change and this probe reports it rather than excusing it.`
  );
}
if (porcelainBefore !== porcelainAfter) {
  fail('the working tree on the machine is not what it was before the search.');
}

// ---------------------------------------------------------------------------
// Row 15. The refusal, watched firing rather than inferred from silence
// ---------------------------------------------------------------------------

machine.stop();

const sshCount = () =>
  sh('/bin/ps', ['-Axo', 'args='])
    .stdout.split('\n')
    .filter((one) => one.includes('/usr/bin/ssh ')).length;

const sshBefore = sshCount();
const refusedRun = drive({
  ...ctxInput,
  connected: false,
  ops: [{ name: 'down', cwd: work, query: NEEDLE, isCaseSensitive: true }]
});
const sshAfter = sshCount();
const refused = (refusedRun?.answers ?? [])[0];
step(
  15,
  'the same search with the machine stopped',
  refused === undefined
    ? 'the driver did not answer'
    : refused.ok === true
      ? `mode ${String(refused.answer.mode)}`
      : `it threw: ${String(refused.message)}`
);
step(
  15,
  '  sign in processes across the refusal',
  `${String(sshBefore)} before, ${String(sshAfter)} after`
);
if (refused === undefined || refused.ok !== true || refused.answer.mode !== 'notConnected') {
  fail(
    'a search of a machine Tortie is not connected to did not answer ' +
      'notConnected. An empty answer is not evidence and this probe does not ' +
      'accept one.'
  );
}
if (sshAfter > sshBefore) {
  fail('the refused search started a sign in process. Nothing may be sent.');
}

// ---------------------------------------------------------------------------
// Row 17. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  17,
  'the operator’s sessions on -L gmux',
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
    'no machine of the operator’s was contacted, so GNU grep, GNU xargs ' +
    'and GNU find are not measured. Nothing here measured a slow link.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
