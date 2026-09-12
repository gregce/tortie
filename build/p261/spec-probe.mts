/**
 * Phase 261 items 4, 5 and 6: the measurement tool their decision procedure
 * needs, and the re-derivation the spec step took over the SHIPPING rules.
 *
 *   tsx --tsconfig tsconfig.node.json build/p261/spec-probe.mts --derive
 *       plants the shapes each item names into a scratch tree and prints
 *       every fact the shipping reader answers over it. This is how the three
 *       claims were re-derived rather than quoted, and it is how a later
 *       round checks that the classes item 6 leaves OPEN still behave the way
 *       `rules-network.ts`'s header says they do.
 *
 *   tsx --tsconfig tsconfig.node.json build/p261/spec-probe.mts --capture <out.json>
 *       reads the eight committed fixtures AND this checkout's own `src/`
 *       with the shipping reader and writes every fact to <out.json>.
 *
 *   tsx --tsconfig tsconfig.node.json build/p261/spec-probe.mts --diff <a.json> <b.json>
 *       prints every fact that moved between two captures.
 *
 * WHY THE CAPTURE HALF EXISTS. `src/main/symbols/calls.ts`'s own header
 * refuses a change that moves a measured number without anybody re-judging a
 * row, so item 5's narrowing of `argString` ships ONLY when the capture taken
 * before it and the capture taken after it differ by planted decoys alone.
 * The gate's rule 1 pins the fixtures and its rule 3 pins this checkout's IPC
 * channels; neither of them shows what ELSE moved, which is the question that
 * decides the item. `conformance:facts` is the check; this is the ruler.
 *
 * It spawns nothing, makes no request, reads nothing under the person's home
 * and writes only the file it is handed and a scratch tree under TMPDIR it
 * removes in a finally.
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grammarFor } from '../../src/main/symbols/languages';
import { grammarPath, runtimeWasmPath } from '../../src/main/symbols/paths';
import { readTree, walkFiles, type DriverFact } from '../p257/facts-driver.mts';
import * as facts from '../../src/main/arch/facts/index';
import { SymbolExtractor } from '../../src/main/symbols/extract';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = ['ts-electron', 'ts-next', 'python', 'go', 'rust', 'ruby', 'swift', 'manifests'];

/** The shapes items 4, 5 and 6 name, one file per language the item lives in. */
const PLANTS: [string, string][] = [
  ['srv/go.mod', 'module x\n'],
  [
    'srv/routes.go',
    `package srv

func reg(mux *http.ServeMux) {
\tmux.HandleFunc("GET https://evil.example.com/abs", h)
\tmux.HandleFunc("https://evil.example.com/plain", h)
\tmux.HandleFunc("GET /v1/ok", h)
}
`
  ],
  [
    'srv/app.ts',
    `const app = express();
app.get('/' + 'a', h);
app.get('/plain', h);
const u = new URL(base + '/x');
fetch('https://a.example.com' + '/y');
http.get(PREFIX + '/z', h);
`
  ],
  [
    'srv/mock.ts',
    `import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('https://api.example.com/u', () => HttpResponse.json({})),
  http.post('/local', () => HttpResponse.json({}))
];
const r = requests.Request('GET', 'https://x.example.com');
`
  ],
  [
    'srv/real.ts',
    `import { http } from './net';
http.get('https://real.example.com/u', cb);
http.post(endpoint, cb);
requests.request('GET', endpoint);
requests.Request('GET', endpoint);
`
  ],
  [
    'srv/urlarg.py',
    `def go():
    anything("https://picked.example.com/p")
    log.info("see https://docs.example.com/guide for more")
`
  ]
];

async function open(): Promise<SymbolExtractor> {
  return SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
}

async function read(root: string, extractor: SymbolExtractor): Promise<DriverFact[]> {
  const res = await readTree({
    root,
    files: walkFiles(root),
    facts: facts as never,
    extractor: extractor as never,
    grammarFor,
    wrapperPass: true
  });
  return res.facts;
}

const line = (prefix: string, f: DriverFact): string =>
  `${prefix}${f.file}:${f.line}  ${f.rule}  ::  ${f.subject}`;

async function derive(): Promise<void> {
  const root = join(process.env['TMPDIR'] ?? '/tmp', `p261-derive-${process.pid}`);
  const extractor = await open();
  try {
    rmSync(root, { recursive: true, force: true });
    for (const [rel, text] of PLANTS) {
      mkdirSync(join(root, dirname(rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    for (const f of await read(root, extractor)) console.log(line('', f));
  } finally {
    extractor.dispose();
    rmSync(root, { recursive: true, force: true });
  }
}

async function capture(out: string): Promise<void> {
  const extractor = await open();
  const all: DriverFact[] = [];
  try {
    for (const fixture of FIXTURES) {
      const root = join(repoRoot, 'build', 'fixtures', 'facts', fixture);
      for (const f of await read(root, extractor)) all.push({ ...f, file: `${fixture}/${f.file}` });
    }
    for (const f of await read(join(repoRoot, 'src'), extractor)) all.push({ ...f, file: `src/${f.file}` });
  } finally {
    extractor.dispose();
  }
  writeFileSync(out, `${JSON.stringify(all, null, 1)}\n`);
  console.log(`[p261] captured ${all.length} facts to ${out}`);
}

function diff(a: string, b: string): void {
  const key = (f: DriverFact): string => `${f.file}:${f.line}  ${f.rule}  ::  ${f.subject}`;
  const left = new Map((JSON.parse(readFileSync(a, 'utf8')) as DriverFact[]).map((f) => [key(f), f]));
  const right = new Map((JSON.parse(readFileSync(b, 'utf8')) as DriverFact[]).map((f) => [key(f), f]));
  let moved = 0;
  for (const k of left.keys()) if (!right.has(k)) { console.log(`- ${k}`); moved += 1; }
  for (const k of right.keys()) if (!left.has(k)) { console.log(`+ ${k}`); moved += 1; }
  console.log(`[p261] ${left.size} -> ${right.size} facts, ${moved} line(s) moved`);
}

const argv = process.argv.slice(2);
if (argv[0] === '--capture' && argv[1] !== undefined) await capture(resolve(argv[1]));
else if (argv[0] === '--diff' && argv[1] !== undefined && argv[2] !== undefined) diff(resolve(argv[1]), resolve(argv[2]));
else await derive();
