/**
 * Arm A of `npm run probe:p257`, the recall half (Phase 257, spec §7.1):
 * research 118's ten hand-enumerated scopes over what the SHIPPING reader
 * answered, printed as `build/p256/det/recall.mts` printed them, with
 * "enumeration still agrees" per row so a moved clone is told rather than
 * mis-scored.
 *
 *   tsx build/p257/facts-recall.mts <reposDir> <factsDir>
 *
 * <factsDir> holds `<repo>.json` as build/p257/facts-corpus.mts wrote it.
 * The scopes are the prototype's own, verbatim in their counting patterns;
 * the two that name a kind the port renamed read the new name, being
 * `network/client` for requests and `boundary.swiftpm.target` beside the
 * entrypoint one for nothing (alamofire's scope is the test category). The
 * honest zeroes, ripgrep's flags and requests' five reaches, print as zeroes.
 *
 * It spawns nothing and reads only the clones and the fact files.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface RecallFact {
  category: string;
  kind: string;
  subject: string;
  file: string;
  line: number;
  rule: string;
}

export interface Scope {
  repo: string;
  category: string;
  what: string;
  how: string;
  expect: number;
  truth: (root: string) => string[];
  key: 'name' | 'line' | 'file';
  match: (f: RecallFact) => boolean;
  inScope: (file: string) => boolean;
}

function walkFiles(root: string, rel = ''): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(root, rel));
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === '.git' || e === 'node_modules') continue;
    const r = rel === '' ? e : `${rel}/${e}`;
    let st;
    try {
      st = statSync(join(root, r));
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walkFiles(root, r));
    else out.push(r);
  }
  return out;
}

function linesMatching(root: string, files: string[], re: RegExp): string[] {
  const out: string[] = [];
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(join(root, f), 'utf8');
    } catch {
      continue;
    }
    text.split('\n').forEach((l, i) => {
      if (re.test(l)) out.push(`${f}:${i + 1}`);
    });
  }
  return out;
}

export const SCOPES: Scope[] = [
  {
    repo: 'tortie',
    category: 'surface',
    what: 'every invoke channel the product registers',
    how: 'docs/audits/contract-baseline.txt, [ipc.invoke.channels], an artifact the product generates and a gate byte-compares',
    expect: 229,
    key: 'name',
    truth: (root) => {
      const t = readFileSync(join(root, 'docs/audits/contract-baseline.txt'), 'utf8').split('\n');
      const out: string[] = [];
      let inSec = false;
      for (const l of t) {
        if (l.startsWith('[')) inSec = l.includes('ipc.invoke.channels');
        else if (inSec && l.trim() !== '' && !l.startsWith('#')) out.push(l.trim());
      }
      return out;
    },
    match: (f) => f.kind === 'ipc-channel' && f.subject.startsWith('IPC serves '),
    inScope: () => true
  },
  {
    repo: 'gotify',
    category: 'surface',
    what: 'every route declared in the one router file',
    how: 'router/router.go, lines matching /\\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|Any)\\(/',
    expect: 44,
    key: 'line',
    truth: (root) => linesMatching(root, ['router/router.go'], /\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|Any)\(/),
    match: (f) => f.kind === 'http-route',
    inScope: (file) => file === 'router/router.go'
  },
  {
    repo: 'fastapi-app',
    category: 'surface',
    what: 'every route in the backend route package',
    how: 'backend/app/api/routes/*.py, lines matching /@router\\.(get|post|put|patch|delete)/',
    expect: 23,
    key: 'line',
    truth: (root) =>
      linesMatching(
        root,
        walkFiles(root).filter((f) => f.startsWith('backend/app/api/routes/') && f.endsWith('.py')),
        /@router\.(get|post|put|patch|delete)/
      ),
    match: (f) => f.kind === 'http-route',
    inScope: (file) => file.startsWith('backend/app/api/routes/')
  },
  {
    repo: 'mastodon',
    category: 'surface',
    what: 'every route declaration in the routes files',
    how: 'config/routes.rb + config/routes/*.rb, lines matching /^\\s*(get|post|put|patch|delete|match|root|resource|resources)\\s/',
    expect: 450,
    key: 'line',
    truth: (root) =>
      linesMatching(
        root,
        ['config/routes.rb', ...walkFiles(root).filter((f) => f.startsWith('config/routes/') && f.endsWith('.rb'))],
        /^\s*(get|post|put|patch|delete|match|root|resource|resources)\s/
      ),
    match: (f) => f.kind === 'http-route',
    inScope: (file) => file === 'config/routes.rb' || file.startsWith('config/routes/')
  },
  {
    repo: 'stoa',
    category: 'surface',
    what: 'every Next.js app-router HTTP handler',
    how: 'stoa-web/app/api/**/route.ts, lines matching /^export (async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/',
    expect: 362,
    key: 'line',
    truth: (root) =>
      linesMatching(
        root,
        walkFiles(root).filter((f) => f.startsWith('stoa-web/app/api/') && f.endsWith('/route.ts')),
        /^export (async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/
      ),
    match: (f) => f.kind === 'http-route',
    inScope: (file) => file.startsWith('stoa-web/app/api/')
  },
  {
    repo: 'ripgrep',
    category: 'surface',
    what: 'every command-line flag the binary accepts',
    how: 'crates/core/flags/defs.rs, lines matching /^impl Flag for /',
    expect: 108,
    key: 'line',
    truth: (root) => linesMatching(root, ['crates/core/flags/defs.rs'], /^impl Flag for /),
    match: (f) => f.kind === 'cli-flag' || f.kind === 'cli-command',
    inScope: (file) => file === 'crates/core/flags/defs.rs'
  },
  {
    repo: 'alamofire',
    category: 'test',
    what: 'every XCTest case function',
    how: 'Tests/*.swift, lines matching /^\\s*func test/',
    expect: 761,
    key: 'line',
    truth: (root) =>
      linesMatching(
        root,
        walkFiles(root).filter((f) => f.startsWith('Tests/') && f.endsWith('.swift')),
        /^\s*func test/
      ),
    match: (f) => f.category === 'test',
    inScope: (file) => file.startsWith('Tests/')
  },
  {
    repo: 'mastodon',
    category: 'store',
    what: 'every table in the committed schema',
    how: 'db/schema.rb, lines matching /^\\s*create_table /',
    expect: 116,
    key: 'line',
    truth: (root) => linesMatching(root, ['db/schema.rb'], /^\s*create_table /),
    match: (f) => f.category === 'store',
    inScope: (file) => file === 'db/schema.rb'
  },
  {
    repo: 'requests',
    category: 'network',
    what: 'every place the library itself reaches the network',
    how: 'READ BY HAND, 2026-09-10: src/requests/adapters.py, sessions.py and api.py, every line that moves bytes or dispatches to the thing that does. Five lines, listed rather than derived.',
    expect: 5,
    key: 'line',
    truth: () => [
      'src/requests/adapters.py:696',
      'src/requests/sessions.py:292',
      'src/requests/sessions.py:651',
      'src/requests/sessions.py:784',
      'src/requests/api.py:71'
    ],
    match: (f) => f.category === 'network' && f.kind === 'client',
    inScope: (file) => file.startsWith('src/requests/')
  },
  {
    repo: 'babel',
    category: 'entrypoint',
    what: 'every package that installs a command',
    how: 'packages/*/package.json holding a "bin" key',
    expect: 4,
    key: 'file',
    truth: (root) =>
      walkFiles(root)
        .filter((f) => /^packages\/[^/]+\/package\.json$/.test(f))
        .filter((f) => {
          try {
            return typeof (JSON.parse(readFileSync(join(root, f), 'utf8')) as { bin?: unknown }).bin !== 'undefined';
          } catch {
            return false;
          }
        }),
    match: (f) => f.kind === 'bin',
    inScope: (file) => /^packages\/[^/]+\/package\.json$/.test(file)
  }
];

export interface RecallRow {
  repo: string;
  category: string;
  what: string;
  truth: number;
  found: number;
  recall: string;
  extras: number;
  agrees: string;
  skipped: string | null;
}

export function scoreRecall(reposDir: string, factsDir: string): RecallRow[] {
  const rows: RecallRow[] = [];
  for (const s of SCOPES) {
    const root = join(reposDir, s.repo);
    let facts: RecallFact[];
    try {
      facts = (JSON.parse(readFileSync(join(factsDir, `${s.repo}.json`), 'utf8')) as { facts: RecallFact[] }).facts;
    } catch {
      rows.push({ repo: s.repo, category: s.category, what: s.what, truth: 0, found: 0, recall: '—', extras: 0, agrees: '—', skipped: 'no fact file (the clone was not made)' });
      continue;
    }
    const truth = s.truth(root);
    const mine = facts.filter((f) => s.match(f) && s.inScope(f.file));
    const keysFound = new Set<string>(
      s.key === 'name'
        ? mine.map((f) => f.subject.replace(/^IPC serves /, ''))
        : s.key === 'file'
          ? mine.map((f) => f.file)
          : mine.map((f) => `${f.file}:${f.line}`)
    );
    const truthSet = new Set(truth);
    const found = truth.filter((t) => keysFound.has(t)).length;
    const extras = [...keysFound].filter((k) => !truthSet.has(k)).length;
    const agrees = truth.length === s.expect ? 'yes' : `NO — reads ${truth.length}, recorded ${s.expect}`;
    rows.push({
      repo: s.repo,
      category: s.category,
      what: s.what,
      truth: truth.length,
      found,
      recall: `${((100 * found) / Math.max(1, truth.length)).toFixed(1)}%`,
      extras,
      agrees,
      skipped: null
    });
  }
  return rows;
}

export function printRecall(rows: readonly RecallRow[]): void {
  console.log('RECALL against hand-enumerated ground truth (research 118 §6.1)\n');
  console.log('repo | category | scope | ground truth | found | recall | extras in scope | enumeration still agrees');
  for (const r of rows) {
    console.log([r.repo, r.category, r.what, r.truth, r.found, r.recall, r.extras, r.skipped ?? r.agrees].join(' | '));
  }
  console.log('\n("extras in scope" are facts of the matching kind inside the scope that name no ground-truth line; a route rule may find a mount a line-based enumeration did not count)');
}

if (process.argv[1]?.endsWith('facts-recall.mts')) {
  const reposDir = process.argv[2];
  const factsDir = process.argv[3];
  if (!reposDir || !factsDir) {
    console.error('usage: tsx build/p257/facts-recall.mts <reposDir> <factsDir>');
    process.exit(2);
  }
  printRecall(scoreRecall(reposDir, factsDir));
}
