#!/usr/bin/env node
/**
 * `npm run conformance:historysearch`, the cheap gate on the History
 * section's search (Phase 199).
 *
 * About 3 seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request and reads nothing under the
 * person's home. It spawns git inside a fixture repository it builds itself
 * under the temp directory, and it runs the SHIPPING parser
 * (src/renderer/scm/history-search.ts), the SHIPPING argv composer
 * (src/main/git/search-args.ts) and the SHIPPING service over the attack
 * shapes through build/historysearch-conformance-probe.mts.
 *
 * ## The rules
 *
 *   1. EVERY VALUE IS ONE ARGV ELEMENT. For each query and each value the
 *      parser produced, exactly one element carries it, that element is the
 *      attached form (`--grep=<v>`, `--author=<v>`, `-S<v>`, `:(literal)<v>`
 *      or `<v>^{commit}`), and no other element contains the value.
 *   2. A VALUE CAN NEVER BE A FLAG. Every filter element begins with one of
 *      the five forms, the pathspec is exactly `--` then the literal spec,
 *      and `--end-of-options` sits immediately before the name rev-parse is
 *      given. `--fixed-strings --regexp-ignore-case` ride along when, and
 *      only when, a pattern does.
 *   3. NO ELEMENT HOLDS A LINE BREAK, whatever was typed.
 *   4. AN OPERATOR ALONE IS NOTHING: no search, no filter, no pathspec.
 *   5. THE ROWS OVER A REAL REPOSITORY are what the values mean literally: a
 *      message of `-x` finds the commit that says `-x`, an author of `Greg [`
 *      finds that author and raises nothing, `docs` finds the folder and not
 *      `docs-b.md`, `doc` finds nothing, `docs/*` finds nothing, a name with
 *      `[` in it is found, `../docs` is refused with the sentence, a commit
 *      of `-x` or `--all` draws no row, a real one draws one row with no
 *      more, a bare short sha draws the same, a commit AND a path combine,
 *      `change:` finds the two commits that added and removed the needle,
 *      and two walks fired at once on one queue end with the first rejected.
 *   6. THE SERVICE COMPOSES THROUGH THE MODULE. service.ts names no
 *      `--grep`, `--author` or `-S` of its own, and its walk drops
 *      `--topo-order` when a search is present.
 *   7. THE RULES CAN GO RED. The composer is ablated four ways, `--grep=`
 *      detached into two elements, `-S` detached, `--` taken out, and
 *      `--end-of-options` taken out, and each copy must fail rule 1 or 2.
 *      The rule 6 scanner is proved on a fixture that names `--grep=`.
 *   8. The gate is named in package.json and build/verification-checks.mjs.
 *
 * Exit 0 when every rule passes, 1 otherwise with each failure named.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:historysearch]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => console.log(`${TAG} ${line}`);

// ---------------------------------------------------------------------------
// The fixture: six commits, one author named with a bracket, one message
// that is a dash, a folder and a file that share a prefix, a name with glob
// characters, and a needle that arrives and leaves.
// ---------------------------------------------------------------------------

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
  const commit = (subject, author = 'Probe') => {
    at += 1;
    env.GIT_AUTHOR_NAME = author;
    env.GIT_AUTHOR_EMAIL = author === 'Probe' ? 'probe@example.invalid' : 'greg@example.invalid';
    env.GIT_AUTHOR_DATE = `${String(at)} +0000`;
    env.GIT_COMMITTER_DATE = `${String(at)} +0000`;
    git('add', '-A');
    git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', subject);
  };
  const write = (rel, text) => writeFileSync(join(dir, rel), text);

  git('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs'));
  mkdirSync(join(dir, 'src'));
  write('docs/a.md', 'alpha\n');
  commit('c1 alpha adds docs');
  write('docs-b.md', 'beside\n');
  commit('c2 -x dash message');
  write('src/[x].txt', 'needle here\n');
  commit('c3 say "hi" quoted', 'Greg [');
  write('docs/a.md', 'alpha\nbeta\n');
  commit('c4 beta touches docs again');
  write('other.txt', '-x token\n');
  commit('c5 gamma');
  write('src/[x].txt', 'nothing here\n');
  commit('c6 delta');
}

// ---------------------------------------------------------------------------
// Running the probe, over the tree or over an ablated copy of the composer.
// ---------------------------------------------------------------------------

function runProbe(fixture, argsDir) {
  const probe = spawnSync(
    process.execPath,
    [
      tsxCli(),
      '--tsconfig',
      'tsconfig.node.json',
      'build/historysearch-conformance-probe.mts',
      ...(fixture === null ? [] : [fixture])
    ],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...(argsDir === null ? {} : { P199_ARGS_DIR: argsDir }) }
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
 * A copy of the composer under a temp `main/git`, with `edit` applied. The
 * copy must differ from the tree at exactly the place the edit names, or the
 * ablation did not happen and the gate would be proving the wrong thing.
 */
function ablatedCopy(root, edit) {
  const dir = join(root, 'main', 'git');
  mkdirSync(dir, { recursive: true });
  cpSync(join(repoRoot, 'src/main/git/search-args.ts'), join(dir, 'search-args.ts'));
  const target = join(dir, 'search-args.ts');
  const before = readFileSync(target, 'utf8');
  if (!before.includes(edit.from)) {
    throw new Error(`ablation "${edit.name}" found nothing to edit in search-args.ts`);
  }
  writeFileSync(target, before.replace(edit.from, edit.to));
  return dir;
}

const ABLATIONS = [
  {
    name: '--grep= detached into two elements',
    from: 'args.push(`--grep=${search.message}`);',
    to: "args.push('--grep', search.message);"
  },
  {
    name: '-S detached into two elements',
    from: 'args.push(`-S${search.change}`);',
    to: "args.push('-S', search.change);"
  },
  {
    name: '-- taken out before the pathspec',
    from: "return ['--', literalSpec];",
    to: 'return [literalSpec];'
  },
  {
    name: '--end-of-options taken out before the name',
    from: "'--end-of-options', ",
    to: ''
  }
];

// ---------------------------------------------------------------------------
// Rules 1 to 4 over the composed argv.
// ---------------------------------------------------------------------------

const FORMS = ['--grep=', '--author=', '-S', '--fixed-strings', '--regexp-ignore-case'];

function judgeArgv(argv) {
  const out = [];
  for (const [text, r] of Object.entries(argv)) {
    const label = JSON.stringify(text);
    const all = [...r.filters, ...r.pathspec, ...r.rev];
    for (const el of all) {
      if (/[\r\n]/.test(el)) out.push(`rule 3: ${label} composed an element with a line break: ${JSON.stringify(el)}`);
    }
    if (r.search === null) {
      if (all.length !== 0) out.push(`rule 4: ${label} is nothing and yet composed ${JSON.stringify(all)}`);
      continue;
    }
    const expect = [];
    if (r.search.message !== undefined) expect.push(['message', r.search.message, `--grep=${r.search.message}`, r.filters]);
    if (r.search.author !== undefined) expect.push(['author', r.search.author, `--author=${r.search.author}`, r.filters]);
    if (r.search.change !== undefined) expect.push(['change', r.search.change, `-S${r.search.change}`, r.filters]);
    if (r.search.path !== undefined) expect.push(['path', r.search.path, `:(literal)${r.search.path}`, r.pathspec]);
    if (r.search.commit !== undefined) expect.push(['commit', r.search.commit, `${r.search.commit}^{commit}`, r.rev]);
    for (const [field, value, form, list] of expect) {
      const folded = value.replace(/[\r\n]+/g, ' ').trim();
      const carriers = list.filter((el) => el.includes(folded));
      if (carriers.length !== 1) {
        out.push(`rule 1: ${label} ${field} ${JSON.stringify(folded)} is carried by ${String(carriers.length)} element(s) of ${JSON.stringify(list)}`);
        continue;
      }
      const expected = form.replace(value, folded);
      if (carriers[0] !== expected) {
        out.push(`rule 1: ${label} ${field} composed ${JSON.stringify(carriers[0])} rather than ${JSON.stringify(expected)}`);
      }
      const elsewhere = all.filter((el) => el !== carriers[0] && el.includes(folded) && folded.length > 1);
      if (elsewhere.length > 0) {
        out.push(`rule 1: ${label} ${field} also appears in ${JSON.stringify(elsewhere)}`);
      }
    }
    for (const el of r.filters) {
      if (!FORMS.some((f) => el.startsWith(f))) out.push(`rule 2: ${label} filter element ${JSON.stringify(el)} is none of the five forms`);
    }
    const pattern = r.search.message !== undefined || r.search.author !== undefined;
    const rides = r.filters.includes('--fixed-strings') && r.filters.includes('--regexp-ignore-case');
    if (pattern !== rides) out.push(`rule 2: ${label} pattern flags ${rides ? 'present without' : 'absent with'} a pattern`);
    if (r.search.path !== undefined && (r.pathspec.length !== 2 || r.pathspec[0] !== '--' || !r.pathspec[1].startsWith(':(literal)'))) {
      out.push(`rule 2: ${label} pathspec is ${JSON.stringify(r.pathspec)}, not -- then the literal spec`);
    }
    if (r.search.commit !== undefined) {
      const at = r.rev.indexOf('--end-of-options');
      if (at === -1 || at !== r.rev.length - 2) {
        out.push(`rule 2: ${label} rev-parse argv ${JSON.stringify(r.rev)} does not put --end-of-options immediately before the name`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule 5 over the fixture rows.
// ---------------------------------------------------------------------------

function pinRows(rows) {
  const out = [];
  const pin = (text, subjects, hasMore = false) => {
    const r = rows[text];
    if (r === undefined) return out.push(`rule 5: no reading for ${JSON.stringify(text)}`);
    if ('error' in r) return out.push(`rule 5: ${JSON.stringify(text)} raised ${r.error}`);
    if (JSON.stringify(r.subjects) !== JSON.stringify(subjects) || r.hasMore !== hasMore) {
      out.push(`rule 5: ${JSON.stringify(text)} drew ${JSON.stringify(r.subjects)} more=${String(r.hasMore)}, pinned ${JSON.stringify(subjects)} more=${String(hasMore)}`);
    }
  };
  const refused = (text, sentence) => {
    const r = rows[text];
    if (r === undefined || !('error' in r) || !r.error.includes(sentence)) {
      out.push(`rule 5: ${JSON.stringify(text)} was not refused with "${sentence}": ${JSON.stringify(r)}`);
    }
  };
  const ALL = ['c6', 'c5', 'c4', 'c3', 'c2', 'c1'];
  pin('alpha', ['c1']);
  pin('-x', ['c2']);
  pin('--all', []);
  pin('message:"-x dash"', ['c2']);
  pin('hi', ['c3']);
  pin('say "', ['c3']);
  pin('author:"Greg ["', ['c3']);
  pin('author:[', ['c3']);
  pin('author:Greg', ['c3']);
  pin('author:probe', ['c6', 'c5', 'c4', 'c2', 'c1']);
  pin('author:a\\|b', []);
  pin('author:', ALL);
  pin('author: message: file: commit: change:', ALL);
  pin('message:m1\nm2 author:a1\na2 file:f1\nf2 commit:c1\nc2 change:x1\nx2', []);
  pin('file:docs', ['c4', 'c1']);
  pin('file:doc', []);
  pin('file:docs/*', []);
  pin('file:src/[x].txt', ['c6', 'c3']);
  refused('file:../docs', 'relative to the repository root');
  pin('file:-x', []);
  pin('commit:-x', []);
  pin('commit:zzzz', []);
  pin('commit:--all', []);
  pin('change:needle', ['c6', 'c3']);
  pin('change:-x', ['c5']);
  pin('change:', ALL);
  pin('alpha\n', ['c1']);
  pin('alpha\nadds', ['c1']);
  pin('a\r\nb', []);
  pin('author:probe file:docs', ['c4', 'c1']);
  pin('cafe', []);
  const shaRows = Object.keys(rows).filter((k) => /^commit:[0-9a-f]{40}$/.test(k));
  if (shaRows.length !== 1) out.push(`rule 5: expected one commit:<sha> reading, found ${String(shaRows.length)}`);
  else pin(shaRows[0], ['c3']);
  const bare = Object.keys(rows).filter((k) => /^[0-9a-f]{7}$/.test(k));
  if (bare.length !== 1) out.push(`rule 5: expected one bare sha reading, found ${String(bare.length)}`);
  else pin(bare[0], ['c3']);
  const combined = Object.keys(rows).filter((k) => /^file:docs commit:[0-9a-f]{40}$/.test(k));
  if (combined.length !== 2) out.push(`rule 5: expected two file:docs commit:<sha> readings, found ${String(combined.length)}`);
  else {
    const drawn = combined.map((k) => rows[k]?.subjects ?? null);
    const ok = drawn.some((d) => JSON.stringify(d) === '["c1"]') && drawn.some((d) => JSON.stringify(d) === '[]');
    if (!ok) out.push(`rule 5: a commit AND a path did not combine: ${JSON.stringify(drawn)}`);
  }
  const race = rows['queue race'];
  if (race === undefined || !String(race.first).startsWith('rejected') || race.second !== 'resolved 1') {
    out.push(`rule 5: the queue race read ${JSON.stringify(race)}, expected the first rejected and the second resolved 1`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule 6: the service composes through the module.
// ---------------------------------------------------------------------------

function scanService(text) {
  const out = [];
  for (const form of ["'--grep", '`--grep', "'--author", '`--author', "'-S", '`-S']) {
    if (text.includes(form)) out.push(`rule 6: service.ts names ${form} itself rather than through search-args.ts`);
  }
  if (!/const topo = [^;]*search === null/.test(text)) {
    out.push('rule 6: the walk no longer drops --topo-order when a search is present');
  }
  if (!text.includes("from './search-args'")) out.push('rule 6: service.ts does not import search-args.ts');
  return out;
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

const root = mkdtempSync(join(tmpdir(), 'gmux-p199-conformance-'));
try {
  const fixture = join(root, 'fixture');
  mkdirSync(fixture);
  buildFixture(fixture);
  say(`fixture built at ${fixture}`);

  const reading = runProbe(fixture, null);
  if ('error' in reading && Object.keys(reading).length === 1) {
    fail(reading.error);
  } else {
    const argvFailures = judgeArgv(reading.argv);
    for (const f of argvFailures) fail(f);
    say(`rules 1 to 4 over ${String(Object.keys(reading.argv).length)} shapes: ${argvFailures.length === 0 ? 'every value is one element' : `${String(argvFailures.length)} failure(s)`}`);
    const rowFailures = pinRows(reading.rows);
    for (const f of rowFailures) fail(f);
    say(`rule 5 over ${String(Object.keys(reading.rows).length)} walks of the shipping service: ${rowFailures.length === 0 ? 'every pin holds' : `${String(rowFailures.length)} failure(s)`}`);
  }

  const serviceText = readFileSync(join(repoRoot, 'src/main/git/service.ts'), 'utf8');
  for (const f of scanService(serviceText)) fail(f);
  const planted = scanService(serviceText.replace("from './search-args'", "from './search-args'\nconst bad = ['--grep=' + 'x'];"));
  if (!planted.some((f) => f.includes("'--grep"))) fail('rule 7: the rule 6 scanner did not see a planted --grep= in service.ts');
  const noTopo = scanService(serviceText.replace(/const topo = [^;]*;/, 'const topo = !follow;'));
  if (!noTopo.some((f) => f.includes('topo-order'))) fail('rule 7: the rule 6 scanner did not see --topo-order put back');
  say('rule 6: service.ts composes through search-args.ts and drops --topo-order under a search; the scanner saw both plants');

  ABLATIONS.forEach((edit, i) => {
    const argsDir = ablatedCopy(join(root, `ablation-${String(i)}`), edit);
    const ablated = runProbe(null, argsDir);
    const red = 'error' in ablated && Object.keys(ablated).length === 1 ? [ablated.error] : judgeArgv(ablated.argv);
    if (red.length === 0) {
      fail(`rule 7: with ${edit.name}, every rule still passed; the gate cannot see that ablation`);
    } else {
      say(`rule 7: with ${edit.name}, ${String(red.length)} check(s) went red, the first being: ${red[0]}`);
    }
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures.length > 0) {
  say(`${String(failures.length)} failure(s):`);
  for (const f of failures) say(`  ${f}`);
  process.exit(1);
}
say('every rule passed');
