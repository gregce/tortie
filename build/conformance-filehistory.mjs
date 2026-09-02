#!/usr/bin/env node
/**
 * `npm run conformance:filehistory`, the cheap gate on the file walk
 * (Phase 198).
 *
 * About 3 seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request and reads nothing under the
 * person's home. It spawns git, inside a fixture repository it builds itself
 * under the temp directory, and it runs the SHIPPING walk over that repository
 * through build/filehistory-conformance-probe.mts.
 *
 * ## The fixture
 *
 * Ten commits with fixed dates: a file `notes/a.txt` added and edited, a side
 * branch editing it, a COPY of it to `notes/b.txt` that keeps the source, a
 * merge, an edit of the copy beside the DELETE of `notes/gone.txt`, a RENAME of
 * the copy to `notes/star*[x].txt` whose name holds the two glob characters, an
 * edit, an in place REWRITE, and a wholesale move to `notes/final.txt` whose
 * contents changed too much to pair. Every walk below has one honest answer
 * over that history, and each answer is pinned row by row.
 *
 * ## The rules
 *
 *   1. THE RENAME AND THE COPY ARE FOLLOWED. `notes/star*[x].txt` walks back
 *      through R100 to `notes/b.txt` and through C100 to `notes/a.txt`, nine
 *      rows, every status, path and old path pinned. The glob characters in
 *      the name reach git as a literal pathspec, or this walk would be empty.
 *   2. THE MERGE IS ABSENT UNDER FOLLOW AND PRESENT ON THE PLAIN WALK, where
 *      it is the one row with no file at all.
 *   3. A DELETED FILE DRAWS ITS D THEN ITS A. A path that never existed draws
 *      nothing and raises nothing.
 *   4. A COPY READS AS C UNDER FOLLOW AND AS A ON THE PLAIN WALK over the
 *      same path, which is git's own answer and the reason the section
 *      follows.
 *   5. THE SIDE BRANCH ROW IS PRESENT. c3 edits `notes/a.txt` on a branch
 *      merged after the copy. Under `--topo-order` git's pathspec rewrite
 *      misses it, and the followed walk drops that flag; this rule is what
 *      keeps it dropped.
 *   6. A FOLDER IS REFUSED UNDER FOLLOW WITH A SENTENCE, and walks plain.
 *      git 2.50.1 does not refuse it, so the refusal is Tortie's. Follow
 *      without a path is refused, and a path that escapes the repository is
 *      refused, each with its own sentence.
 *   7. PAGING. A window of three answers the three newest rows and hasMore.
 *   8. THE PINS CAN GO RED. The same probe is run over an ablated copy of the
 *      shipping modules three times, with the newline strip taken out of the
 *      chunk reader, with `--follow` taken out of the argv, and with
 *      `--topo-order` put back under follow, and each run must fail at least
 *      one rule above. A gate that cannot fail proves nothing.
 *   9. The gate is named in package.json and in build/verification-checks.mjs,
 *      because a gate nothing names is how a gate decays.
 *
 * Exit 0 when every rule passes, 1 otherwise with each failure named.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:filehistory]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => console.log(`${TAG} ${line}`);

const STAR = 'notes/star*[x].txt';

// ---------------------------------------------------------------------------
// The fixture, built deterministically: fixed identity, fixed increasing
// dates, no signing, rename detection OFF in config so the walk's own -M is
// what pairs the rename and the copy.
// ---------------------------------------------------------------------------

function lines(prefix, count) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(`${prefix} ${String(i)}`);
  return `${out.join('\n')}\n`;
}

function buildFixture(dir) {
  let at = 1700000000;
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'Probe',
    GIT_AUTHOR_EMAIL: 'probe@example.invalid',
    GIT_COMMITTER_NAME: 'Probe',
    GIT_COMMITTER_EMAIL: 'probe@example.invalid'
  };
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const commit = (subject) => {
    at += 1;
    env.GIT_AUTHOR_DATE = `${String(at)} +0000`;
    env.GIT_COMMITTER_DATE = `${String(at)} +0000`;
    git('add', '-A');
    git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', subject);
  };
  const write = (rel, text) => writeFileSync(join(dir, rel), text);

  git('init', '-q', '-b', 'main');
  git('config', 'diff.renames', 'false');
  mkdirSync(join(dir, 'notes'));
  write('notes/a.txt', lines('alpha line', 40));
  write('notes/gone.txt', 'gone 1\ngone 2\n');
  commit('c1 add a and gone');
  write('notes/a.txt', lines('alpha line', 41));
  commit('c2 edit a');
  git('checkout', '-q', '-b', 'side');
  write('notes/a.txt', `${lines('alpha line', 41)}side edit\n`);
  commit('c3 side edits a');
  git('checkout', '-q', 'main');
  write('notes/b.txt', lines('alpha line', 41));
  commit('c4 copy a to b');
  at += 1;
  env.GIT_AUTHOR_DATE = `${String(at)} +0000`;
  env.GIT_COMMITTER_DATE = `${String(at)} +0000`;
  git('-c', 'commit.gpgsign=false', 'merge', '-q', '--no-ff', '-m', 'c5 merge side', 'side');
  write('notes/b.txt', `${lines('alpha line', 41)}beta line\n`);
  rmSync(join(dir, 'notes/gone.txt'));
  commit('c6 edit b, delete gone');
  git('mv', 'notes/b.txt', STAR);
  commit('c7 rename b to star');
  write(STAR, `${lines('alpha line', 41)}beta line\nstar edit\n`);
  commit('c8 edit star');
  write(STAR, lines('rewritten', 40));
  commit('c9 rewrite star in place');
  rmSync(join(dir, STAR));
  write('notes/final.txt', lines('final', 40));
  commit('c10 move star to final with new content');
}

// ---------------------------------------------------------------------------
// Running the probe, over the tree or over an ablated copy of it.
// ---------------------------------------------------------------------------

function runProbe(fixture, gitDir) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/filehistory-conformance-probe.mts', fixture],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...(gitDir === null ? {} : { P198_GIT_DIR: gitDir }) }
    }
  );
  if (probe.status !== 0) {
    return { error: `the probe did not run: ${probe.stderr || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/**
 * A copy of the five shipping modules the walk is made of, under a temp
 * `main/` so the relative imports resolve, with `edit` applied to one file.
 * The copy must differ from the tree at exactly the place the edit names, or
 * the ablation did not happen and the gate would be proving the wrong thing.
 */
function ablatedCopy(root, edit) {
  const dir = join(root, 'main');
  mkdirSync(join(dir, 'git'), { recursive: true });
  // Phase 199 added search-args.ts, the module the walk composes its
  // filter argv from; the copy must carry it or the import fails before
  // any ablation is judged.
  for (const f of ['service.ts', 'exec.ts', 'graph-parse.ts', 'parse.ts', 'search-args.ts']) {
    cpSync(join(repoRoot, 'src/main/git', f), join(dir, 'git', f));
  }
  cpSync(join(repoRoot, 'src/main/errors.ts'), join(dir, 'errors.ts'));
  const target = join(dir, 'git', edit.file);
  const before = readFileSync(target, 'utf8');
  if (!before.includes(edit.from)) {
    throw new Error(`ablation "${edit.name}" found nothing to edit in ${edit.file}`);
  }
  writeFileSync(target, before.replace(edit.from, edit.to));
  return join(dir, 'git');
}

const ABLATIONS = [
  {
    name: 'the newline strip taken out of the chunk reader',
    file: 'parse.ts',
    from: 'const status = token.slice(1);',
    to: 'const status = token;'
  },
  {
    name: '--follow taken out of the argv',
    file: 'service.ts',
    from: "if (follow) args.push('--follow');",
    to: ''
  },
  {
    name: '--topo-order put back under follow',
    file: 'service.ts',
    from: "...(topo ? ['--topo-order'] : []),",
    to: "'--topo-order',"
  }
];

// ---------------------------------------------------------------------------
// The pins. Each returns a list of failure sentences over one probe reading.
// ---------------------------------------------------------------------------

const row = (subject, status, path, origPath, parents = 1) => ({
  subject,
  status,
  path,
  origPath,
  parents
});

function pin(reading) {
  const out = [];
  const walk = (name) => {
    const w = reading[name];
    if (w === undefined) {
      out.push(`the probe answered nothing for "${name}"`);
      return null;
    }
    return w;
  };
  const rowsOf = (name) => {
    const w = walk(name);
    if (w === null) return null;
    if ('error' in w) {
      out.push(`"${name}" raised instead of answering rows: ${w.error}`);
      return null;
    }
    return w.rows;
  };
  const equal = (name, want) => {
    const rows = rowsOf(name);
    if (rows === null) return;
    const got = JSON.stringify(rows);
    const expected = JSON.stringify(want);
    if (got === expected) return;
    // Name the first row that differs rather than printing both lists whole.
    const shape = (r) => `${r.subject} ${r.status} ${r.path} ${r.origPath} p${String(r.parents)}`;
    let i = 0;
    while (i < rows.length && i < want.length && shape(rows[i]) === shape(want[i])) i += 1;
    const drew = rows[i] === undefined ? 'nothing' : shape(rows[i]);
    const pinned = want[i] === undefined ? 'nothing' : shape(want[i]);
    out.push(
      `"${name}" drew ${String(rows.length)} row(s) against ${String(want.length)} pinned, and row ${String(i)} reads "${drew}" where the pin reads "${pinned}"`
    );
  };

  // Rule 1 and rule 5.
  equal('star follow', [
    row('c10', 'D', STAR, '-'),
    row('c9', 'M', STAR, '-'),
    row('c8', 'M', STAR, '-'),
    row('c7', 'R', STAR, 'notes/b.txt'),
    row('c6', 'M', 'notes/b.txt', '-'),
    row('c4', 'C', 'notes/b.txt', 'notes/a.txt'),
    row('c3', 'M', 'notes/a.txt', '-'),
    row('c2', 'M', 'notes/a.txt', '-'),
    row('c1', 'A', 'notes/a.txt', '-', 0)
  ]);

  // Rule 2.
  const aFollow = rowsOf('a follow');
  if (aFollow !== null && aFollow.some((r) => r.parents > 1)) {
    out.push('the followed walk of notes/a.txt drew a merge commit');
  }
  const folderPlain = rowsOf('folder plain');
  if (folderPlain !== null) {
    const merge = folderPlain.filter((r) => r.parents > 1);
    if (merge.length !== 1 || merge[0].subject !== 'c5' || merge[0].status !== '-') {
      out.push(`the plain walk of the folder should hold c5 as its one merge with no file; it holds ${JSON.stringify(merge)}`);
    }
    if (folderPlain.length !== 10) {
      out.push(`the plain walk of the folder should hold all 10 commits and holds ${String(folderPlain.length)}`);
    }
  }

  // Rule 3.
  equal('gone follow', [row('c6', 'D', 'notes/gone.txt', '-'), row('c1', 'A', 'notes/gone.txt', '-', 0)]);
  equal('final follow', [row('c10', 'A', 'notes/final.txt', '-')]);
  equal('nope follow', []);

  // Rule 4.
  equal('b follow', [
    row('c7', 'D', 'notes/b.txt', '-'),
    row('c6', 'M', 'notes/b.txt', '-'),
    row('c4', 'C', 'notes/b.txt', 'notes/a.txt'),
    row('c3', 'M', 'notes/a.txt', '-'),
    row('c2', 'M', 'notes/a.txt', '-'),
    row('c1', 'A', 'notes/a.txt', '-', 0)
  ]);
  equal('b plain', [
    row('c7', 'D', 'notes/b.txt', '-'),
    row('c6', 'M', 'notes/b.txt', '-'),
    row('c4', 'A', 'notes/b.txt', '-')
  ]);
  equal('a plain', [
    row('c3', 'M', 'notes/a.txt', '-'),
    row('c2', 'M', 'notes/a.txt', '-'),
    row('c1', 'A', 'notes/a.txt', '-', 0)
  ]);

  // Rule 6.
  const refused = (name, pattern) => {
    const w = walk(name);
    if (w === null) return;
    if (!('error' in w)) {
      out.push(`"${name}" answered rows and should have been refused`);
    } else if (!pattern.test(w.error)) {
      out.push(`"${name}" was refused with "${w.error}", which does not say ${String(pattern)}`);
    }
  };
  refused('folder follow', /Only a file can be followed/);
  refused('follow without path', /exactly one file path/);
  refused('escape follow', /relative to the repository root/);

  // Rule 7.
  const page = walk('star follow page 3');
  if (page !== null && !('error' in page)) {
    const subjects = page.rows.map((r) => r.subject).join(' ');
    if (subjects !== 'c10 c9 c8' || page.hasMore !== true) {
      out.push(`the three row page drew "${subjects}" with hasMore ${String(page.hasMore)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const root = mkdtempSync(join(tmpdir(), 'gmux-p198-conformance-'));
try {
  const fixture = join(root, 'fixture');
  mkdirSync(fixture);
  buildFixture(fixture);
  say(`fixture built at ${fixture}`);

  const reading = runProbe(fixture, null);
  if ('error' in reading && Object.keys(reading).length === 1) {
    fail(reading.error);
  } else {
    const problems = pin(reading);
    for (const p of problems) fail(p);
    const counts = Object.entries(reading)
      .map(([name, w]) => `${name}: ${'error' in w ? 'refused' : String(w.rows.length)}`)
      .join(', ');
    say(`rules 1 to 7 over the shipping walk: ${counts}`);
  }

  // Rule 8.
  for (const [i, edit] of ABLATIONS.entries()) {
    const gitDir = ablatedCopy(join(root, `ablation-${String(i)}`), edit);
    const ablated = runProbe(fixture, gitDir);
    const problems =
      'error' in ablated && Object.keys(ablated).length === 1 ? [ablated.error] : pin(ablated);
    if (problems.length === 0) {
      fail(`rule 8: with ${edit.name}, every pin still passed, so the pins cannot fail`);
    } else {
      say(`rule 8: with ${edit.name}, ${String(problems.length)} pin(s) went red, the first being: ${problems[0]}`);
    }
  }

  // Rule 9.
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!pkg.includes('"conformance:filehistory"')) fail('rule 9: package.json does not name conformance:filehistory');
  if (!checks.includes("'conformance:filehistory'")) fail('rule 9: build/verification-checks.mjs does not name conformance:filehistory');
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) console.error(`${TAG} FAIL: ${f}`);
  process.exit(1);
}
say('every rule passed');
