/**
 * The runner behind `npm run conformance:historysearch` (Phase 199). Runs
 * the SHIPPING parser and the SHIPPING argv composer under node over the
 * attack shapes, and, when given a fixture repository, the shipping service
 * over the same shapes, and prints one JSON line the gate judges.
 *
 * Usage:  tsx build/historysearch-conformance-probe.mts [<fixture repo>]
 *
 *   P199_ARGS_DIR    where search-args.ts (and service.ts) are read from;
 *                    the gate points it at an ablated copy
 *   P199_PARSER_DIR  where history-search.ts is read from
 *
 * No Electron, no tmux, no agent, no request, nothing under the home.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fixture = process.argv[2] ?? '';
const argsDir = resolve(process.env['P199_ARGS_DIR'] ?? 'src/main/git');
const parserDir = resolve(process.env['P199_PARSER_DIR'] ?? 'src/renderer/scm');

const parser = (await import(
  pathToFileURL(resolve(parserDir, 'history-search.ts')).href
)) as typeof import('../src/renderer/scm/history-search');
const composer = (await import(
  pathToFileURL(resolve(argsDir, 'search-args.ts')).href
)) as typeof import('../src/main/git/search-args');

/** The attack shapes, and the ordinary ones beside them. */
export const QUERIES: string[] = [
  'alpha',
  '-x',
  '--all',
  'message:"-x dash"',
  'hi',
  'say "',
  'author:"Greg ["',
  'author:[',
  'author:Greg',
  'author:probe',
  'author:a\\|b',
  'author:',
  'author: message: file: commit: change:',
  'file:docs',
  'file:doc',
  'file:docs/*',
  'file:src/[x].txt',
  'file:../docs',
  'file:-x',
  'commit:-x',
  'commit:zzzz',
  'commit:--all',
  'change:needle',
  'change:-x',
  'change:',
  'alpha\n',
  'alpha\nadds',
  'a\r\nb',
  'author:probe file:docs',
  'message:m1\nm2 author:a1\na2 file:f1\nf2 commit:c1\nc2 change:x1\nx2'
];

const argv: Record<string, unknown> = {};
for (const text of QUERIES) {
  const q = parser.parseHistoryQuery(text);
  const search = parser.toSearch(q);
  const norm = composer.normalizeSearch(search);
  argv[text] = {
    query: q,
    search: search ?? null,
    filters: norm === null ? [] : composer.searchFilterArgs(norm),
    pathspec:
      norm === null || norm.path === null
        ? []
        : composer.pathspecArgs(`:(literal)${norm.path}`),
    rev: norm === null || norm.commit === null ? [] : composer.revParseArgs(norm.commit)
  };
}

const rows: Record<string, unknown> = {};
if (fixture !== '') {
  const serviceModule = (await import(
    pathToFileURL(resolve(argsDir, 'service.ts')).href
  )) as typeof import('../src/main/git/service');
  const svc = new serviceModule.GitService(fixture);
  const plain = await svc.graphLog({ maxCount: 50 });
  const shaOf = (word: string): string =>
    plain.entries.find((e) => e.subject.startsWith(word))?.hash ?? 'missing';
  const withShas = [
    ...QUERIES,
    `commit:${shaOf('c3')}`,
    shaOf('c3').slice(0, 7),
    `file:docs commit:${shaOf('c1')}`,
    `file:docs commit:${shaOf('c2')}`,
    'cafe'
  ];
  for (const text of withShas) {
    const q = parser.parseHistoryQuery(text);
    const search = parser.toSearch(q);
    try {
      const r = await svc.graphLog({
        maxCount: 50,
        queue: 'history',
        ...(search === undefined ? {} : { search })
      });
      rows[text] = {
        count: r.entries.length,
        subjects: r.entries.map((e) => e.subject.split(' ')[0] ?? ''),
        hasMore: r.hasMore
      };
    } catch (err) {
      rows[text] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  // The queue: two walks fired at once, the first must reject.
  const a = svc.graphLog({ maxCount: 50, queue: 'history', search: { message: 'alpha' } });
  const b = svc.graphLog({ maxCount: 50, queue: 'history', search: { message: 'beta' } });
  rows['queue race'] = {
    first: await a.then(
      (r) => `resolved ${String(r.entries.length)}`,
      (e: unknown) => `rejected ${e instanceof Error ? e.message : String(e)}`
    ),
    second: await b.then(
      (r) => `resolved ${String(r.entries.length)}`,
      (e: unknown) => `rejected ${e instanceof Error ? e.message : String(e)}`
    )
  };
}

process.stdout.write(`${JSON.stringify({ argv, rows })}\n`);
