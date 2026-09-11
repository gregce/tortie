/**
 * The probe behind `npm run conformance:facts` (Phase 257).
 *
 * Handed a list of module roots, each holding a copy of `src/main` (the
 * shipping tree, or one with exactly one clause edited), it loads THAT root's
 * `main/arch/facts/index.ts`, `main/symbols/extract.ts`, `main/arch/db.ts`
 * and `main/settings/store.ts`, runs the arms the gate asked for, and prints
 * one JSON line per run for `build/conformance-facts.mjs` to pin. The grammar
 * wasm paths always come from the SHIPPING `src/main/symbols/paths.ts`,
 * because that module finds the runtime relative to its own location.
 *
 * IT SPAWNS NOTHING. No git, no Electron, no tmux, no agent, no request, and
 * it reads nothing under the person's home: the fixtures are data, this
 * checkout's own `src/` is read with `node:fs` for the recall arm, and the
 * one database it opens is a scratch `arch.db` under a directory the gate
 * removes.
 *
 * The arms, each named by the gate rule it answers:
 *   fixtures  rules 1, 2, 5, 6, 7, 13, 14: every committed fixture read with
 *             the pass on, and again with it off
 *   recall    rules 3 and 4: this checkout's src/** against the baseline's
 *             invoke channels
 *   symbols   rule 5: src/main/symbols/** with the pass on and off
 *   identity  rule 9: composed twice, the same bytes at a test path, the oid
 *   limits    rule 15: the call ceiling, the manifest cap, the subject cut
 *   store     rules 10 and 16: a scratch ArchStore driven end to end
 *   setting   rule 12: the sanitizer and the seal
 *
 * Usage: tsx build/facts-conformance-probe.mts '<json>' where the json is
 * { "roots": [{ "name", "root", "arms": [...] }], "checkout": "<abs>", "scratch": "<abs>" }
 */

import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import type { ArchFactDraft } from '../src/shared/arch';
import {
  ARCH_BOUNDARY_START_KINDS,
  ARCH_FACT_CATEGORIES,
  ARCH_FACT_KINDS,
  ARCH_MODULE_ROOT_KIND
} from '../src/shared/arch';
import { grammarFor } from '../src/main/symbols/languages';
import { grammarPath, runtimeWasmPath } from '../src/main/symbols/paths';
import {
  countByCategory,
  countByRule,
  readTree,
  walkFiles,
  type DriverCall,
  type DriverFact,
  type DriverResult,
  type FactsModule
} from './p257/facts-driver.mts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'facts');

/** The eight committed fixtures, one directory each. */
export const FIXTURES = ['ts-electron', 'ts-next', 'python', 'go', 'rust', 'ruby', 'swift', 'manifests'] as const;

interface RootSpec {
  name: string;
  root: string;
  arms: string[];
}

const spec = JSON.parse(process.argv[2] ?? '{"roots":[]}') as {
  roots: RootSpec[];
  checkout: string;
  scratch: string;
};

function importFrom(root: string, rel: string): Promise<Record<string, unknown>> {
  return import(pathToFileURL(join(root, rel)).href) as Promise<Record<string, unknown>>;
}

interface Loaded {
  facts: FactsModule & Record<string, unknown>;
  extractor: { extractAll: FactsModule['readFacts'] extends never ? never : (...a: never[]) => Promise<never> } & {
    extractAll(rel: string, text: string, ask?: { calls?: boolean; wrappers?: boolean }): Promise<{
      calls: DriverCall[];
      wrappers: never[];
      callsTruncated: boolean;
    }>;
    dispose(): void;
  };
  db: Record<string, unknown>;
  settings: Record<string, unknown>;
}

async function load(root: string): Promise<Loaded> {
  const facts = (await importFrom(root, 'main/arch/facts/index.ts')) as Loaded['facts'];
  const extractMod = await importFrom(root, 'main/symbols/extract.ts');
  const SymbolExtractor = extractMod['SymbolExtractor'] as {
    create(o: { runtimeWasm: string; grammarPath: typeof grammarPath }): Promise<Loaded['extractor']>;
  };
  const extractor = await SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
  const db = await importFrom(root, 'main/arch/db.ts');
  const settings = await importFrom(root, 'main/settings/store.ts');
  return { facts, extractor, db, settings };
}

/** One fixture or tree, read with the pass on or off, reported in the terms the gate pins. */
async function readAt(loaded: Loaded, root: string, files: readonly string[], wrapperPass: boolean): Promise<DriverResult> {
  return readTree({
    root,
    files,
    facts: loaded.facts,
    extractor: loaded.extractor,
    grammarFor,
    wrapperPass
  });
}

function summarize(r: DriverResult) {
  return {
    facts: r.facts,
    counts: {
      tracked: r.links.length,
      parsed: r.parsed,
      manifests: r.manifests,
      pathOnly: r.pathOnly,
      vendored: r.vendored,
      truncated: r.truncated,
      unread: r.unread,
      byCategory: countByCategory(r.facts),
      byRule: countByRule(r.facts)
    },
    wrapFacts: r.wrapFacts,
    wrapDigest: r.wrapDigest,
    wrapperMap: r.wrapperMap,
    wrapperCandidates: r.wrapperCandidates,
    vendoredFiles: r.links.filter((l) => l.vendored !== null).map((l) => ({ file: l.relPath, reason: l.vendored })),
    truncatedFiles: r.links.filter((l) => l.truncated).map((l) => l.relPath),
    ms: r.ms
  };
}

/** The invoke channels the product registers, read from the gated baseline. */
function baselineChannels(): string[] {
  const t = readFileSync(join(repoRoot, 'docs', 'audits', 'contract-baseline.txt'), 'utf8').split('\n');
  const out: string[] = [];
  let inSec = false;
  for (const l of t) {
    if (l.startsWith('[')) inSec = l.startsWith('[ipc.invoke.channels]');
    else if (inSec && l.trim() !== '' && !l.startsWith('#')) out.push(l.trim());
  }
  return out;
}

function recallAnswer(r: DriverResult, truth: readonly string[]) {
  const served = new Set(
    r.facts.filter((f) => f.kind === 'ipc-channel' && f.subject.startsWith('IPC serves ')).map((f) => f.subject.slice('IPC serves '.length))
  );
  const truthSet = new Set(truth);
  const found = truth.filter((t) => served.has(t)).length;
  const extras = [...served].filter((k) => !truthSet.has(k)).sort();
  const missing = truth.filter((t) => !served.has(t));
  return {
    truth: truth.length,
    found,
    extras: extras.length,
    extrasList: extras.slice(0, 50),
    missingList: missing.slice(0, 50),
    wrapFacts: r.wrapFacts,
    wrapperMap: r.wrapperMap,
    wrapperCandidates: r.wrapperCandidates,
    files: r.links.length,
    parsed: r.parsed,
    ms: r.ms,
    wrapperMs: r.wrapperMs
  };
}

type Answer = Record<string, unknown>;

async function runRoot(rs: RootSpec): Promise<Answer> {
  const answer: Answer = { name: rs.name };
  let loaded: Loaded | null = null;
  try {
    loaded = await load(rs.root);
    const F = loaded.facts;
    const arms = new Set(rs.arms);
    answer['ruleIds'] = [
      ...(F['CALL_RULES'] as { id: string }[]).map((r) => r.id),
      ...(F['LINE_RULES'] as { id: string }[]).map((r) => r.id)
    ];
    answer['emptyDigest'] = F.wrapperDigest(new Map());

    if (arms.has('fixtures')) {
      const fixtures: Record<string, unknown> = {};
      const fixturesOff: Record<string, unknown> = {};
      for (const name of FIXTURES) {
        const root = join(fixturesDir, name);
        const files = walkFiles(root);
        fixtures[name] = summarize(await readAt(loaded, root, files, true));
        const off = await readAt(loaded, root, files, false);
        fixturesOff[name] = { facts: off.facts, wrapFacts: off.wrapFacts };
      }
      answer['fixtures'] = fixtures;
      answer['fixturesOff'] = fixturesOff;
    }

    if (arms.has('recall')) {
      const src = join(spec.checkout, 'src');
      const files = walkFiles(src).map((f) => `src/${f}`);
      const r = await readAt(loaded, spec.checkout, files, true);
      answer['recall'] = recallAnswer(r, baselineChannels());
    }

    if (arms.has('symbols')) {
      const sub = join(spec.checkout, 'src', 'main', 'symbols');
      const files = walkFiles(sub)
        .filter((f) => !f.includes('__tests__'))
        .map((f) => `src/main/symbols/${f}`);
      const on = await readAt(loaded, spec.checkout, files, true);
      const off = await readAt(loaded, spec.checkout, files, false);
      answer['symbols'] = {
        files: files.length,
        on: on.facts.length,
        off: off.facts.length,
        same: JSON.stringify(on.facts) === JSON.stringify(off.facts),
        wrapFacts: on.wrapFacts,
        wrapperMap: on.wrapperMap
      };
    }

    if (arms.has('identity')) {
      const rel = 'src/main/spawn.ts';
      const text = readFileSync(join(fixturesDir, 'ts-electron', rel), 'utf8');
      const read = await loaded.extractor.extractAll(rel, text, { calls: true });
      const a = F.readFacts({ relPath: rel, lang: 'typescript', text, calls: read.calls });
      const b = F.readFacts({ relPath: rel, lang: 'typescript', text, calls: [...read.calls].reverse() });
      const srcRead = F.readFacts({ relPath: 'src/x.ts', lang: 'typescript', text, calls: read.calls });
      const testRead = F.readFacts({ relPath: 'test/x.test.ts', lang: 'typescript', text, calls: read.calls });
      const planted = Buffer.from('app.get("/facts", h);\n', 'utf8');
      answer['identity'] = {
        reversedSame: JSON.stringify(a) === JSON.stringify(b),
        facts: a.length,
        src: srcRead.map((f) => `${f.rule} ${f.subject}`),
        test: testRead.map((f) => `${f.rule} ${f.subject}`),
        oid: F.blobOid(planted)
      };
    }

    if (arms.has('limits')) {
      const many = `${'f(\'x\');\n'.repeat(20_001)}`;
      const read = await loaded.extractor.extractAll('src/many.ts', many, { calls: true });
      const bigManifest = `{ "name": "big", "main": "./x.js", "pad": "${'x'.repeat(2 * 1024 * 1024 + 16)}" }`;
      const manifestFacts = F.readFacts({ relPath: 'package.json', lang: null, text: bigManifest, calls: [] });
      const smallManifest = F.readFacts({ relPath: 'package.json', lang: null, text: '{ "name": "s", "main": "./x.js" }', calls: [] });
      const longText = `child_process.spawn('${'a'.repeat(300)}');\n`;
      const longRead = await loaded.extractor.extractAll('src/long.ts', longText, { calls: true });
      const longFacts = F.readFacts({ relPath: 'src/long.ts', lang: 'typescript', text: longText, calls: longRead.calls });
      const r = await readTree({
        root: spec.scratch,
        files: [],
        facts: F,
        extractor: loaded.extractor,
        grammarFor,
        wrapperPass: false
      });
      answer['limits'] = {
        calls: read.calls.length,
        callsTruncated: read.callsTruncated,
        bigManifestFacts: manifestFacts.length,
        smallManifestFacts: smallManifest.length,
        longSubject: Math.max(0, ...longFacts.map((f) => f.subject.length)),
        longFacts: longFacts.length,
        driverEmpty: r.links.length
      };
    }

    if (arms.has('store')) {
      answer['store'] = await storeArm(loaded, rs.name);
    }

    if (arms.has('setting')) {
      const S = loaded.settings;
      const sanitizeArch = S['sanitizeArchSettings'] as (raw: unknown) => { wrapperPass: boolean };
      const sanitizeAll = S['sanitizeSettings'] as (raw: unknown) => Record<string, unknown>;
      const dangerStateOf = S['dangerStateOf'] as (s: unknown) => unknown;
      const wrapperPassOn = F['wrapperPassOn'] as (arch: { wrapperPass: boolean }) => boolean;
      const base = sanitizeAll({});
      const withOn = { ...base, arch: { ...(base['arch'] as object), wrapperPass: true } };
      const withOff = { ...base, arch: { ...(base['arch'] as object), wrapperPass: false } };
      answer['setting'] = {
        absent: sanitizeArch({ enabled: true }).wrapperPass,
        yes: sanitizeArch({ enabled: true, wrapperPass: 'yes' }).wrapperPass,
        one: sanitizeArch({ enabled: true, wrapperPass: 1 }).wrapperPass,
        trueCase: sanitizeArch({ enabled: true, wrapperPass: true }).wrapperPass,
        sealSame: JSON.stringify(dangerStateOf(withOn)) === JSON.stringify(dangerStateOf(withOff)),
        readerOn: wrapperPassOn({ wrapperPass: true }),
        readerOff: wrapperPassOn({ wrapperPass: false })
      };
    }
  } catch (error) {
    answer['error'] = error instanceof Error ? `${error.message}\n${error.stack ?? ''}`.slice(0, 2000) : String(error);
  } finally {
    try {
      loaded?.extractor.dispose();
    } catch {
      /* best effort */
    }
  }
  return answer;
}

/** Rules 10 and 16 over a scratch ArchStore made from the root's own db.ts. */
async function storeArm(loaded: Loaded, name: string): Promise<Answer> {
  const ArchStore = loaded.db['ArchStore'] as new (path: string) => StoreLike;
  const dir = join(spec.scratch, `store-${name}`);
  mkdirSync(dir, { recursive: true });
  const store = new ArchStore(join(dir, 'arch.db'));
  const out: Answer = {};
  try {
    const OID_A = 'a'.repeat(40);
    const OID_B = 'b'.repeat(40);
    const draft = (over: Partial<ArchFactDraft>): ArchFactDraft => ({
      category: 'surface',
      kind: 'ipc-channel',
      subject: 'IPC serves arch:map',
      line: 12,
      rule: 'surface.ipc.electron',
      evidence: "ipcMain.handle('arch:map', fn)",
      ...over
    });
    const link = (relPath: string, oid: string) => ({
      relPath,
      oid,
      mtimeMs: 100,
      size: 20,
      lang: 'typescript',
      vendored: null,
      truncated: false,
      wrapDigest: null
    });

    // Rule 10: the closed sets, byte for byte, and the refusal that writes nothing.
    out['categories'] = ARCH_FACT_CATEGORIES;
    out['kinds'] = ARCH_FACT_KINDS;
    let refusal: string | null = null;
    try {
      store.saveFacts(OID_A, 'src/a.ts', [draft({}), draft({ category: 'boundary', kind: 'barrel' })]);
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error);
    }
    store.linkFactFiles('k', [link('src/a.ts', OID_A)]);
    out['refusal'] = refusal;
    out['writtenAfterRefusal'] = store.facts('k').length;

    // Rule 10: the two boundary readers over the ts-electron fixture's rows.
    const fixture = (await readAt(loaded, join(fixturesDir, 'ts-electron'), walkFiles(join(fixturesDir, 'ts-electron')), true));
    const byFile = new Map<string, DriverFact[]>();
    for (const f of fixture.facts) {
      if (f.viaWrapper) continue;
      const list = byFile.get(f.file) ?? [];
      list.push(f);
      byFile.set(f.file, list);
    }
    const links = fixture.links.map((l) => ({ ...l, mtimeMs: 1 }));
    for (const l of links) {
      store.saveFacts(l.oid, l.relPath, (byFile.get(l.relPath) ?? []).map(({ file: _f, viaWrapper: _w, ...d }) => d));
    }
    store.linkFactFiles('fixture', links);
    const starts = store.boundaryStarts('fixture');
    const roots = store.moduleRoots('fixture');
    const boundary = store.facts('fixture').filter((f) => f.category === 'boundary');
    const startKeys = new Set(starts.map((f) => `${f.file}:${f.line}:${f.subject}`));
    out['boundary'] = {
      starts: starts.length,
      startKinds: [...new Set(starts.map((f) => f.kind))].sort(),
      roots: roots.length,
      rootKinds: [...new Set(roots.map((f) => f.kind))].sort(),
      all: boundary.length,
      disjoint: roots.every((f) => !startKeys.has(`${f.file}:${f.line}:${f.subject}`)),
      union: starts.length + roots.length === boundary.length,
      expectedStartKinds: [...ARCH_BOUNDARY_START_KINDS],
      moduleRootKind: ARCH_MODULE_ROOT_KIND
    };

    // Rule 16: the round trip.
    store.saveFacts(OID_B, 'src/shared.ts', [draft({ line: 30, subject: 'IPC serves z' }), draft({ line: 2, subject: 'IPC serves a' })]);
    store.saveWrapperDecls(OID_B, 'src/shared.ts', [
      { name: 'handle', innerCallee: 'ipc.handle', innerLast: 'handle', paramIndex: 1, innerIndex: 0, hops: 1, line: 4 }
    ]);
    store.linkFactFiles('r1', [{ ...link('src/shared.ts', OID_B), mtimeMs: 1.5, size: 9, truncated: true, wrapDigest: 'd'.repeat(64) }]);
    store.linkFactFiles('r2', [link('src/shared.ts', OID_B)]);
    const stamp = store.factStamps('r1').get('src/shared.ts');
    const sorted = store.facts('r1').map((f) => f.line);
    store.forgetFactFiles('r1', ['src/shared.ts']);
    const prunedFirst = store.pruneUnlinkedFacts();
    const keptForR2 = store.facts('r2').length;
    const declsKept = store.wrapperDecls([{ oid: OID_B, relPath: 'src/shared.ts' }]).size;
    store.forgetFactFiles('r2', ['src/shared.ts']);
    const prunedSecond = store.pruneUnlinkedFacts();
    const gone = !store.hasFactsFor(OID_B, 'src/shared.ts');
    store.linkFactFiles('w', [link('src/w.ts', OID_A)]);
    store.saveWrapFacts('w', 'src/w.ts', [draft({ rule: 'x+wrap', subject: 'IPC serves one' }), draft({ rule: 'x+wrap', subject: 'IPC serves two', line: 13 })]);
    store.saveWrapFacts('w', 'src/w.ts', [draft({ rule: 'x+wrap', subject: 'IPC serves one' })]);
    const wrapAfterReplace = store.facts('w');
    out['roundTrip'] = {
      stamp,
      sorted,
      prunedFirst,
      keptForR2,
      declsKept,
      prunedSecond,
      gone,
      wrapCount: wrapAfterReplace.length,
      wrapVia: wrapAfterReplace.every((f) => f.viaWrapper),
      counts: store.factCounts('w')
    };
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

interface StoreLike {
  saveFacts(oid: string, relPath: string, facts: readonly ArchFactDraft[]): void;
  saveWrapperDecls(oid: string, relPath: string, decls: readonly unknown[]): void;
  wrapperDecls(files: readonly { oid: string; relPath: string }[]): Map<string, unknown[]>;
  linkFactFiles(repoKey: string, rows: readonly unknown[]): void;
  saveWrapFacts(repoKey: string, relPath: string, facts: readonly ArchFactDraft[]): void;
  forgetFactFiles(repoKey: string, relPaths: readonly string[]): void;
  pruneUnlinkedFacts(): number;
  hasFactsFor(oid: string, relPath: string): boolean;
  factStamps(repoKey: string): Map<string, unknown>;
  facts(repoKey: string): (DriverFact & { viaWrapper: boolean })[];
  factCounts(repoKey: string): unknown;
  boundaryStarts(repoKey: string): DriverFact[];
  moduleRoots(repoKey: string): DriverFact[];
  close(): void;
}

const answers: Record<string, Answer> = {};
for (const rs of spec.roots) {
  answers[rs.name] = await runRoot(rs);
}
process.stdout.write(`${JSON.stringify(answers)}\n`);
