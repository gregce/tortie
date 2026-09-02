/**
 * The Phase 198 conformance probe. Runs the SHIPPING file walk, being
 * GitService.graphLog with a path, over the fixture repository the gate
 * built, and prints one JSON object with every row's subject, status, path
 * and old path so build/conformance-filehistory.mjs can pin them.
 *
 * `P198_GIT_DIR` points the probe at a copy of src/main/git; the gate uses it
 * to run the same probe over an ABLATED copy of the shipping modules, which is
 * how the pins are shown to go red. Without it the probe reads the modules in
 * the tree. Nothing here launches an Electron, starts a tmux server, spawns
 * an agent or reads under the person's home: the one thing it spawns is git,
 * inside the fixture directory it was handed.
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const fixture = process.argv[2];
if (fixture === undefined || fixture === '') {
  process.stderr.write('usage: filehistory-conformance-probe.mts <fixture dir>\n');
  process.exit(2);
}

const gitDir = resolve(process.env['P198_GIT_DIR'] ?? 'src/main/git');
const serviceModule = (await import(
  pathToFileURL(resolve(gitDir, 'service.ts')).href
)) as typeof import('../src/main/git/service');
const svc = new serviceModule.GitService(fixture);

interface Row {
  subject: string;
  status: string;
  path: string;
  origPath: string;
  parents: number;
}

const STAR = 'notes/star*[x].txt';

const walks: { name: string; path?: string; follow: boolean; maxCount?: number }[] = [
  { name: 'star follow', path: STAR, follow: true },
  { name: 'star follow page 3', path: STAR, follow: true, maxCount: 3 },
  { name: 'b follow', path: 'notes/b.txt', follow: true },
  { name: 'b plain', path: 'notes/b.txt', follow: false },
  { name: 'a follow', path: 'notes/a.txt', follow: true },
  { name: 'a plain', path: 'notes/a.txt', follow: false },
  { name: 'gone follow', path: 'notes/gone.txt', follow: true },
  { name: 'final follow', path: 'notes/final.txt', follow: true },
  { name: 'folder follow', path: 'notes', follow: true },
  { name: 'folder plain', path: 'notes', follow: false },
  { name: 'nope follow', path: 'notes/nope.txt', follow: true },
  { name: 'escape follow', path: '../notes/a.txt', follow: true },
  { name: 'follow without path', follow: true }
];

const out: Record<string, { rows: Row[]; hasMore: boolean } | { error: string }> = {};
for (const w of walks) {
  try {
    const r = await svc.graphLog({
      ...(w.path !== undefined ? { path: w.path } : {}),
      follow: w.follow,
      ...(w.maxCount !== undefined ? { maxCount: w.maxCount } : {})
    });
    out[w.name] = {
      hasMore: r.hasMore,
      rows: r.entries.map((e) => ({
        subject: e.subject.split(' ')[0] ?? '',
        status: e.file?.status ?? '-',
        path: e.file?.path ?? '-',
        origPath: e.file?.origPath ?? '-',
        parents: e.parents.length
      }))
    };
  } catch (err) {
    out[w.name] = { error: err instanceof Error ? err.message : String(err) };
  }
}
process.stdout.write(`${JSON.stringify(out)}\n`);
