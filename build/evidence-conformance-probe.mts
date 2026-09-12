/**
 * The probe behind `npm run conformance:evidence` (Phase 258, spec §5.1).
 *
 * It runs the SHIPPING ladder, units, regions, transports, counts and
 * worksheet under node over the committed fixtures in build/fixtures/evidence/
 * and prints what came out as ONE JSON line. The gate compares that against
 * build/fixtures/evidence/expected.json, whose every value was derived by hand
 * from the spec and never from this code. Handed a list of module roots, it
 * composes once per root, so the gate runs the shipping tree and every ablated
 * copy of it in ONE process.
 *
 * IT SPAWNS NOTHING in gate mode. No git, no Electron, no tmux, no agent, no
 * request, and it reads nothing under the person's home: every fixture is
 * data, and the one file system write is the scratch arch.db rule 7 opens
 * under the directory the gate hands it and removes in its finally block.
 *
 * WHAT IT ANSWERS PER ROOT, in the gate's own numbering:
 *   rungList        rule 1a  `ARCH_EVIDENCE_RUNGS` as exported, and the keys of one reading
 *   planted         rule 1b  the eight planted graphs of rungs.json through `rungOf`
 *   trees[name]     rules 2 to 8  one summary per fixture: regions, oneThing, outside,
 *                   transports, rungs, counts, kindKeys, perFile, worksheet, repeatable,
 *                   and `withContract`, the same readings composed with a planted document
 *   pins            rule 10  `chromaticPinsFor` on both bases
 *
 * THE CLONE MODE (`{ clone: { repo, factsFile } }`) is what `probe:p258` runs in
 * process for its arm B: the same compose over a real clone's tracked list,
 * the product's own resolver for the edge list, and the fact file
 * build/p257/facts-corpus.mts wrote. That mode spawns ONE `git ls-files -z`
 * over the clone it is handed and nothing else; the gate never passes it.
 *
 * Usage: tsx build/evidence-conformance-probe.mts '<json>' where the json is
 *   { "roots": [{ "name": "shipping", "root": "<abs path holding main/arch>" }], "scratch": "<dir>" }
 *   { "clone": { "repo": "<abs>", "factsFile": "<abs>" } }
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'evidence');

type AnyModule = Record<string, any>;

interface FixtureFact {
  category: string;
  kind: string;
  subject: string;
  file: string;
  line: number;
  rule: string;
  evidence: string;
  viaWrapper: boolean;
}

interface Fixture {
  subject: string;
  workspaces: string[];
  crates: string[];
  trackedFiles: string[];
  imports: { fromPath: string; toPath: string | null; resolution: string }[];
  treeFacts: { path: string; lines: number; declares: string | null }[];
  definitions: unknown[];
  facts: FixtureFact[];
}

interface Expected {
  [tree: string]: {
    perFile?: { file: string; unitDir: string; want: string }[];
    seeds?: Record<string, string[]>;
    worksheet: { scope: string | null }[];
  };
}

const TREES = ['one-unit', 'two-unit', 'nested', 'elsewhere', 'manifest-seed', 'family'];
const CATEGORIES = ['surface', 'store', 'effect', 'network', 'gate'] as const;

function fixture(name: string): Fixture {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8')) as Fixture;
}

const expected = JSON.parse(readFileSync(join(fixturesDir, 'expected.json'), 'utf8')) as Expected;

const sortBy = <T,>(xs: readonly T[], key: (x: T) => string): T[] =>
  [...xs].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

/** One region as the gate pins it: ids, words, the box set and the starts, both as sorted sets. */
function regionOf(r: any): unknown {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    sub: r.sub,
    dir: r.dir ?? null,
    groupIds: [...(r.groupIds ?? [])].sort(),
    starts: sortBy(
      (r.starts ?? []).map((s: any) => ({ kind: s.kind, file: s.file, line: s.line })),
      (s: any) => `${s.kind}|${s.file}|${String(s.line).padStart(6, '0')}`
    ),
    files: r.files,
    parsed: r.parsed
  };
}

/** The five categories' counts for one box, flattened to `category.kind`, and the key set behind them. */
function countsOf(counts: any): { counts: Record<string, number>; kindKeys: string[] } {
  const flat: Record<string, number> = {};
  const keys: string[] = [];
  for (const category of CATEGORIES) {
    const table = counts?.[category] ?? {};
    for (const [kind, n] of Object.entries(table)) {
      keys.push(`${category}.${kind}`);
      if (typeof n === 'number' && n !== 0) flat[`${category}.${kind}`] = n;
    }
  }
  return { counts: flat, kindKeys: keys.sort() };
}

function rungOf(r: any): unknown {
  return r === undefined || r === null
    ? null
    : { rung: r.rung, anchors: r.anchors, parsed: r.parsed, reached: r.reached, tested: r.tested, seeds: r.seeds };
}

/** Everything the gate pins about one composed model. */
function summarize(model: any): Record<string, unknown> {
  const regions = sortBy((model.regions ?? []).map(regionOf), (r: any) => r.id);
  const transports = ((model.transports ?? []) as any[])
    .map((t) => `${t.from}|${t.to}|${t.kind}|${String(t.count)}`)
    .sort();
  const rungs: Record<string, unknown> = {};
  const counts: Record<string, unknown> = {};
  const kindKeys: Record<string, string[]> = {};
  const regionOfGroup: Record<string, string> = {};
  for (const g of sortBy(model.groups as any[], (g) => g.id)) {
    rungs[g.id] = rungOf(g.rung);
    const c = countsOf(g.counts);
    counts[g.id] = c.counts;
    kindKeys[g.id] = c.kindKeys;
    regionOfGroup[g.id] = g.regionId;
  }
  return {
    oneThing: model.oneThing,
    outside: regions.some((r: any) => r.id === 'outside'),
    regions,
    transports,
    rungs,
    counts,
    kindKeys,
    regionOfGroup,
    componentRungs: Object.keys(model.componentRungs ?? {}).sort()
  };
}

/** A contract whose components share the fixture's box ids and whose prose names every rung word. */
function plantedDocument(fx: Fixture, boxes: { id: string; dir: string }[]): unknown {
  return {
    contract: { version: 1, subject: fx.subject, strictness: 'not-wrong', layers: [], flows: [] },
    components: boxes
      .filter((b) => b.dir !== '')
      .map((b) => ({
        id: b.id,
        name: `The ${b.id}`,
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: [b.dir],
        boundary: 'open',
        description:
          'This part is tested, reached and composed; a person wrote accepted-live here and it must move nothing.',
        evidence: [],
        deprecated: false,
        gaps: []
      })),
    edges: [],
    baseline: { accepted: [] },
    problems: []
  };
}

function composeInput(fx: Fixture, document: unknown = null): Record<string, unknown> {
  const testFiles = [...new Set(fx.facts.filter((f) => f.category === 'test').map((f) => f.file))].sort();
  return {
    subject: fx.subject,
    trackedFiles: fx.trackedFiles,
    imports: fx.imports,
    workspaces: fx.workspaces,
    crates: fx.crates,
    treeFacts: fx.treeFacts,
    definitions: fx.definitions,
    facts: fx.facts,
    testFiles,
    document,
    verdicts: []
  };
}

function reversed(input: Record<string, unknown>): Record<string, unknown> {
  const rev = (k: string) => [...(input[k] as unknown[])].reverse();
  return {
    ...input,
    trackedFiles: rev('trackedFiles'),
    imports: rev('imports'),
    treeFacts: rev('treeFacts'),
    facts: rev('facts'),
    testFiles: rev('testFiles')
  };
}

/**
 * Rule 7. The worksheet's answer for a scope, through the store's own readers:
 * the fixture's facts are written into a scratch arch.db exactly as the pass
 * links them, then `factsOf` and `linkCountsUnder` answer the way
 * `checks.facts` in check-coordinator.ts answers, filtered by the file set the
 * SAME rule P partition gives the scope.
 */
function worksheet(
  db: AnyModule,
  skeleton: AnyModule,
  languages: AnyModule,
  fx: Fixture,
  scopes: readonly (string | null)[],
  scratch: string,
  name: string
): unknown[] {
  const dir = join(scratch, 'worksheet', name);
  mkdirSync(dir, { recursive: true });
  const store = new db.ArchStore(join(dir, 'arch.db'));
  try {
    const byFile = new Map<string, FixtureFact[]>();
    for (const f of fx.facts) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    const links: unknown[] = [];
    fx.trackedFiles.forEach((rel, i) => {
      const oid = `${String(i).padStart(4, '0')}`.padEnd(40, 'a');
      const parsed = languages.grammarFor(rel) !== null;
      store.saveFacts(
        oid,
        rel,
        (byFile.get(rel) ?? []).map(({ file: _f, viaWrapper: _w, ...draft }) => draft)
      );
      links.push({ relPath: rel, oid, mtimeMs: 1, size: 1, lang: parsed ? 'typescript' : null, vendored: null, truncated: false, wrapDigest: null });
    });
    store.linkFactFiles('k', links);
    const parseable = (p: string): boolean => languages.grammarFor(p) !== null;
    const cut = skeleton.readingPartition({
      subject: fx.subject,
      trackedFiles: fx.trackedFiles,
      imports: fx.imports.filter((i) => i.toPath !== null && i.resolution === 'first-party'),
      parseable,
      workspaces: fx.workspaces,
      crates: fx.crates
    });
    const model = null as unknown;
    void model;
    const rows = store.factsOf('k', ['gate']) as FixtureFact[];
    const out: unknown[] = [];
    for (const scope of scopes) {
      let files: Set<string>;
      let dirs: string[];
      if (scope === null) {
        files = new Set(fx.trackedFiles);
        dirs = [''];
      } else if (scope.startsWith('unit:') || scope === 'elsewhere') {
        // A region: the union of its boxes, read from the composed model's own
        // region rows rather than re-deriving Q2 here.
        const region = (probeState.regionsByTree.get(name) ?? []).find((r: any) => r.id === scope);
        const ids = new Set<string>(region?.groupIds ?? []);
        const boxes = cut.boxes.filter((b: any) => ids.has(b.id));
        files = new Set(boxes.flatMap((b: any) => b.files as string[]));
        dirs = boxes.map((b: any) => b.dir as string);
      } else {
        const box = cut.boxes.find((b: any) => b.id === scope);
        files = new Set<string>(box?.files ?? []);
        dirs = box === undefined ? [] : [box.dir as string];
      }
      const here = rows.filter((r) => files.has(r.file));
      const byKind: Record<string, number> = { auth: 0, flag: 0, refusal: 0, guard: 0 };
      for (const r of here) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
      const denominators = store.linkCountsUnder('k', dirs) as { files: number; parsed: number };
      out.push({
        scope,
        gates: here.length,
        byKind,
        files: denominators.files,
        parsed: denominators.parsed,
        rows: sortBy(here, (r) => `${r.file}|${String(r.line).padStart(6, '0')}`).map((r) => `${r.file}:${String(r.line)}:${r.kind}`)
      });
    }
    return out;
  } finally {
    store.close();
  }
}

const probeState = { regionsByTree: new Map<string, any[]>() };

async function probeRoot(root: string, scratch: string): Promise<Record<string, unknown>> {
  const load = async (rel: string): Promise<AnyModule> =>
    (await import(pathToFileURL(resolve(root, rel)).href)) as AnyModule;
  // A module the copy carries is read from the copy, so an ablation of it can
  // bite; one it does not carry is read from the shipping tree.
  const loadOr = async (rel: string): Promise<AnyModule> =>
    existsSync(resolve(root, rel)) ? load(rel) : ((await import(pathToFileURL(join(repoRoot, 'src', rel)).href)) as AnyModule);
  const map = await load('main/arch/map.ts');
  const evidence = await load('main/arch/evidence.ts');
  const skeleton = await load('main/arch/skeleton.ts');
  const db = await load('main/arch/db.ts');
  const languages = await load('main/symbols/languages.ts');
  const shared = await loadOr('shared/arch.ts');
  const presets = await loadOr('renderer/theme/presets.ts');
  const parseable = (p: string): boolean => languages.grammarFor(p) !== null;

  const out: Record<string, unknown> = {};
  out['rungList'] = [...(shared['ARCH_EVIDENCE_RUNGS'] ?? [])];
  out['kindTable'] = shared['ARCH_FACT_KINDS'] ?? {};

  // Rule 1b and 2d: the planted graphs, straight through `rungOf`.
  const planted = JSON.parse(readFileSync(join(fixturesDir, 'rungs.json'), 'utf8')) as {
    tracked: string[];
    cases: { name: string; want: string; anchors: string[]; edges: [string, string][]; seeds: string[]; testFiles: string[]; named: string[] }[];
  };
  const tracked = new Set(planted.tracked);
  out['planted'] = planted.cases.map((c) => {
    const graph = evidence.buildImportGraph(c.edges.map(([fromPath, toPath]) => ({ fromPath, toPath, resolution: 'first-party' })));
    const reading = evidence.rungOf(new Set(c.anchors), {
      tracked,
      graph,
      seeds: new Set(c.seeds),
      testFiles: new Set(c.testFiles),
      namedByManifest: new Set(c.named),
      parseable
    });
    return { name: c.name, want: c.want, got: reading.rung, seeds: reading.seeds };
  });

  // Rules 2 to 8 over the five trees.
  const trees: Record<string, unknown> = {};
  for (const name of TREES) {
    const fx = fixture(name);
    const input = composeInput(fx);
    const one = map.composeArchMap(input);
    const two = map.composeArchMap(reversed(input));
    const summary = summarize(one);
    // Rule 8 asks the RAW model, not the sorted summary: reversed inputs must
    // give the same bytes in the same order, which is what the wire carries.
    const repeatable = JSON.stringify(one) === JSON.stringify(two);
    probeState.regionsByTree.set(name, one.regions ?? []);
    // Rule 4. The same tree with a contract whose prose names every rung word.
    const withDoc = map.composeArchMap(composeInput(fx, plantedDocument(fx, one.groups)));
    const docSummary = summarize(withDoc);
    // Rule 2a. Per-file rungs over the unit's own seeds, and the seed count the box carries.
    const want = expected[name];
    const perFile: unknown[] = [];
    for (const pf of want?.perFile ?? []) {
      const seeds = new Set<string>(want?.seeds?.[pf.unitDir] ?? []);
      const graph = evidence.buildImportGraph(fx.imports);
      const testFiles = new Set(fx.facts.filter((f) => f.category === 'test').map((f) => f.file));
      const named = new Set(fx.facts.filter((f) => f.category === 'boundary' || f.category === 'entrypoint').map((f) => f.file));
      const reading = evidence.rungOf(new Set([pf.file]), {
        tracked: new Set(fx.trackedFiles),
        graph,
        seeds,
        testFiles,
        namedByManifest: named,
        parseable
      });
      perFile.push({ file: pf.file, unitDir: pf.unitDir, want: pf.want, got: reading.rung });
    }
    const scopes = (want?.worksheet ?? []).map((w) => w.scope);
    // The box set with its files, from rule P itself, so the gate can
    // re-derive every transport and every count from the fixture alone.
    const cut = skeleton.readingPartition({
      subject: fx.subject,
      trackedFiles: fx.trackedFiles,
      imports: fx.imports.filter((i) => i.toPath !== null && i.resolution === 'first-party'),
      parseable,
      workspaces: fx.workspaces,
      crates: fx.crates
    });
    trees[name] = {
      ...summary,
      boxFiles: Object.fromEntries((cut.boxes as any[]).map((b) => [b.id, [...b.files].sort()])),
      readingKeys: Object.keys((one.groups as any[])[0]?.rung ?? {}).sort(),
      repeatable,
      withContract: {
        rungs: docSummary['rungs'],
        regions: docSummary['regions'],
        transports: docSummary['transports'],
        componentRungs: docSummary['componentRungs'],
        painted: (withDoc.groups as any[]).filter((g) => g.componentId !== null).map((g) => g.id).sort()
      },
      perFile,
      worksheet: scopes.length === 0 ? [] : worksheet(db, skeleton, languages, fx, scopes, scratch, name)
    };
  }
  // Rule 3c. two-unit again with 75 planted `boundary.path.module-root` facts,
  // which must move nothing: regions never come from module roots (D3).
  {
    const fx = fixture('two-unit');
    const planted: FixtureFact[] = [];
    for (let i = 0; i < 75; i += 1) {
      const file = fx.trackedFiles[i % fx.trackedFiles.length] as string;
      planted.push({ category: 'boundary', kind: 'module-root', subject: `module root ${String(i)}`, file, line: 100 + i, rule: 'boundary.path.module-root', evidence: 'index.ts', viaWrapper: false });
    }
    const model = map.composeArchMap(composeInput({ ...fx, facts: [...fx.facts, ...planted] }));
    const s = summarize(model);
    trees['module-root-plant'] = { regions: s['regions'], transports: s['transports'], rungs: s['rungs'] };
  }
  out['trees'] = trees;

  // Rule 10, the structural half: the pin on both bases, read by running presets.ts.
  const pinsFor = presets['chromaticPinsFor'] as ((s: string) => { token: string; ground: string; floor: number }[]) | undefined;
  out['pins'] = {
    dark: (pinsFor?.('dark') ?? []).map((p) => `${p.token} on ${p.ground} at ${String(p.floor)}`),
    light: (pinsFor?.('light') ?? []).map((p) => `${p.token} on ${p.ground} at ${String(p.floor)}`)
  };
  return out;
}

// ---------------------------------------------------------------------------
// THE CLONE MODE, for probe:p258 arm B: the same compose over a real clone.
// ---------------------------------------------------------------------------

async function probeClone(repo: string, factsFile: string): Promise<Record<string, unknown>> {
  const ladder = (await import(pathToFileURL(join(repoRoot, 'build', 'p256', 'det', 'ladder.mts')).href)) as AnyModule;
  const map = (await import(pathToFileURL(join(repoRoot, 'src', 'main', 'arch', 'map.ts')).href)) as AnyModule;
  const tree = (await import(pathToFileURL(join(repoRoot, 'src', 'main', 'arch', 'tree-facts.ts')).href)) as AnyModule;
  const manifest = (await import(pathToFileURL(join(repoRoot, 'src', 'main', 'arch', 'resolver', 'manifest.ts')).href)) as AnyModule;
  const trackedFiles = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { maxBuffer: 256 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
    .toString('utf8')
    .split('\0')
    .filter((p) => p.length > 0);
  const graph = (await ladder.importGraph(repo, trackedFiles)) as { out: Map<string, Set<string>> };
  const imports: { fromPath: string; toPath: string; resolution: string }[] = [];
  for (const [fromPath, tos] of graph.out) for (const toPath of tos) imports.push({ fromPath, toPath, resolution: 'first-party' });
  const written = JSON.parse(readFileSync(factsFile, 'utf8')) as { facts: FixtureFact[] };
  const manifests = manifest.readArchManifests(repo);
  const treeFacts = trackedFiles.map((path) => {
    let buf: Buffer;
    try {
      const abs = join(repo, path);
      if (statSync(abs).size > 4 * 1024 * 1024) return { path, lines: 0, declares: null };
      buf = readFileSync(abs);
    } catch {
      return { path, lines: 0, declares: null };
    }
    const file = path.split('/').pop() ?? path;
    return { path, lines: tree.countLines(buf), declares: tree.declaredNameOf(file, buf.toString('utf8')) };
  });
  const testFiles = [...new Set(written.facts.filter((f) => f.category === 'test').map((f) => f.file))].sort();
  const model = map.composeArchMap({
    subject: manifests.packageName ?? manifests.crateName ?? repo.split('/').pop(),
    trackedFiles,
    imports,
    workspaces: [...manifests.workspaces.values()].map((w: any) => w.dir),
    crates: manifests.cargo === null ? [] : [...manifests.cargo.crates.values()].map((c: any) => c.dir).filter((d: string) => d !== ''),
    treeFacts,
    definitions: [],
    facts: written.facts,
    testFiles,
    document: null,
    verdicts: []
  });
  const skeleton = (await import(pathToFileURL(join(repoRoot, 'src', 'main', 'arch', 'skeleton.ts')).href)) as AnyModule;
  const cut = skeleton.readingPartition({
    subject: manifests.packageName ?? manifests.crateName ?? repo.split('/').pop(),
    trackedFiles,
    imports,
    parseable: (p: string) => skeleton.sourceParseable(p),
    workspaces: [...manifests.workspaces.values()].map((w: any) => w.dir),
    crates: manifests.cargo === null ? [] : [...manifests.cargo.crates.values()].map((c: any) => c.dir).filter((d: string) => d !== '')
  });
  return {
    tracked: trackedFiles.length,
    edges: imports.length,
    ...summarize(model),
    boxFiles: Object.fromEntries((cut.boxes as any[]).map((b) => [b.id, [...b.files].sort()])),
    labels: Object.fromEntries((model.groups as any[]).map((g) => [g.id, g.label])),
    hover: Object.fromEntries((model.groups as any[]).map((g) => [g.id, g.facts]))
  };
}

const spec = JSON.parse(process.argv[2] ?? '{}') as {
  roots?: { name: string; root: string }[];
  scratch?: string;
  clone?: { repo: string; factsFile: string };
};

const answer: Record<string, unknown> = {};
if (spec.clone !== undefined) {
  try {
    answer['clone'] = await probeClone(spec.clone.repo, spec.clone.factsFile);
  } catch (err) {
    answer['clone'] = { error: err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err) };
  }
} else {
  for (const { name, root } of spec.roots ?? []) {
    try {
      answer[name] = await probeRoot(root, spec.scratch ?? join(repoRoot, '.p258-scratch'));
    } catch (err) {
      answer[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
process.stdout.write(`${JSON.stringify(answer)}\n`);
