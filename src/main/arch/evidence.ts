/**
 * The computed evidence ladder (Phase 258, research 118 §7.2 and §10 Phase 2).
 *
 * Five rungs, each a function of (anchors, first-party import graph,
 * entrypoint files, test files, manifest-named files, seeds) and of NOTHING a
 * person wrote. This module never receives an `ArchDocument`, never reads a
 * contract field and never reads a description: `npm run conformance:evidence`
 * rule 4 composes the map with the fixture contract loaded and with
 * `document: null` and requires the rung of every box to be byte identical.
 *
 * ## The five, lowest first, exactly as `rungOf` decides them
 *
 *   here      = anchors ∩ tracked
 *   off-repo  ⇐ |here| = 0
 *   reached   ⇐ some seed s ∈ here, or a walk over `graph.out` from the seeds
 *               reaches a file in here
 *   tested    ⇐ reached ∧ ∃ a ∈ here, ∃ f ∈ graph.into[a] with f ∈ testFiles
 *   composed  ⇐ ¬reached ∧ (∃ a ∈ here with |graph.into[a]| > 0
 *                          ∨ ∃ a ∈ here with a ∈ namedByManifest)
 *   declared  ⇐ otherwise
 *
 * The order is the ladder's own: `tested` is asked only after `reached`
 * holds, so a part a test imports but nothing starts reads `composed`, which
 * is the seventh planted graph of `build/p256/det/ladder.mts --self-test` and
 * of `src/main/arch/__tests__/evidence.test.ts`.
 *
 * ## There is no `accepted-live` rung and no code path can produce one
 *
 * `ArchEvidenceRung` is derived from `ARCH_EVIDENCE_RUNGS` in `@shared/arch`
 * and nothing else. The one decision, `decide` below, is a switch-free chain
 * over three booleans whose only return literals are the five words, and no
 * string reaches a rung from any input: the inputs are sets of paths and a
 * graph. A sixth word cannot be added without editing the const, which moves
 * the pinned array, and the gate scans four directories with comments and
 * strings blanked for the word and requires zero hits. Nothing Tortie reads
 * is evidence about a running system, so nothing here may say so.
 *
 * ## The seed rule is G, "unit-own + declared", chosen by measurement
 *
 * Research 118 §7.2 measured the UNSEEDED walk answering `tested` for eight
 * of nine hand-named parts on this repository, and left the seed as the one
 * Phase 2 design question. `build/p258/seed-measure.mts` ran seven candidate
 * rules over scratch copies of this repository and of stoa (SPEC §2): a
 * part's walk starts from the files ITS OWN UNIT starts, being composition
 * roots and program mains inside the unit's extent, plus the tracked file the
 * unit's manifest DECLARES as its entry. A manifest file is never a seed, a
 * CI job is never a seed, an npm script is never a seed, a compose service is
 * never a seed, a worker start is never a seed. Under the unseeded rule a
 * manifest FILE inside a box made the box `reached` before any walk, because
 * a seed in `here` is reached by definition, and a manifest has no imports so
 * it can start a walk nowhere; that artefact is what G removes.
 *
 * ## Pure, in the sense `conformance:reading` rule 9 uses
 *
 * No `node:`, no `electron`, no process, no file, no store. `map.ts` is the
 * only production importer.
 */

import type { ArchEvidenceRung, ArchFact, ArchRungReading } from '@shared/arch';

/** The first-party import graph, both directions, self edges dropped. */
export interface ArchImportGraph {
  /** file → the tracked files it imports. */
  out: ReadonlyMap<string, ReadonlySet<string>>;
  /** file → the files that import it. */
  into: ReadonlyMap<string, ReadonlySet<string>>;
  /** Distinct (from, to) pairs. */
  edges: number;
}

/** One import as `arch.db` hands it: `toPath` is non null exactly when resolved. */
export interface ArchEvidenceImport {
  fromPath: string;
  toPath: string | null;
  resolution: string;
}

/**
 * Build the graph from the `arch_import` rows. Only a `first-party` edge with
 * a target is an edge of the walk; an unresolved one names something this
 * build could not find, and walking it would put a guess under `reached`.
 */
export function buildImportGraph(imports: readonly ArchEvidenceImport[]): ArchImportGraph {
  const out = new Map<string, Set<string>>();
  const into = new Map<string, Set<string>>();
  let edges = 0;
  for (const fact of imports) {
    if (fact.resolution !== 'first-party' || fact.toPath === null) continue;
    if (fact.toPath === fact.fromPath) continue;
    let a = out.get(fact.fromPath);
    if (a === undefined) {
      a = new Set<string>();
      out.set(fact.fromPath, a);
    }
    if (!a.has(fact.toPath)) edges += 1;
    a.add(fact.toPath);
    let b = into.get(fact.toPath);
    if (b === undefined) {
      b = new Set<string>();
      into.set(fact.toPath, b);
    }
    b.add(fact.fromPath);
  }
  return { out, into, edges };
}

/** Everything one rung decision sees. Every field comes from the fact base. */
export interface ArchEvidenceContext {
  /** Every tracked path at HEAD, from the one `git ls-files -z`. */
  tracked: ReadonlySet<string>;
  graph: ArchImportGraph;
  /** The files the walk starts from, rule G over the part's units. */
  seeds: ReadonlySet<string>;
  /** Files carrying a `test` fact. */
  testFiles: ReadonlySet<string>;
  /** Files carrying a `boundary` or `entrypoint` fact. */
  namedByManifest: ReadonlySet<string>;
  /** Whether this build parses a path, which is what "parsed" means on the hover. */
  parseable: (path: string) => boolean;
}

/**
 * The closure of `graph.out` from the seeds, seeds included. Seeds that are
 * not tracked are dropped before the walk, so a manifest entry that names a
 * built artefact starts nothing.
 */
export function reachFrom(
  graph: ArchImportGraph,
  seeds: ReadonlySet<string>,
  tracked: ReadonlySet<string>
): ReadonlySet<string> {
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const s of seeds) {
    if (!tracked.has(s) || seen.has(s)) continue;
    seen.add(s);
    queue.push(s);
  }
  let head = 0;
  while (head < queue.length) {
    const at = queue[head] as string;
    head += 1;
    for (const next of graph.out.get(at) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

/**
 * THE ONE DECISION. Three booleans in, one of five words out, in the
 * ladder's own order. No string from any input reaches this function.
 */
function decide(reached: boolean, tested: boolean, composed: boolean): ArchEvidenceRung {
  if (reached && tested) return 'tested';
  if (reached) return 'reached';
  if (composed) return 'composed';
  return 'declared';
}

/** One part's rung with the counts behind it. Pure over the context. */
export function rungOf(anchors: Iterable<string>, ctx: ArchEvidenceContext): ArchRungReading {
  const here: string[] = [];
  const seenHere = new Set<string>();
  for (const a of anchors) {
    if (!ctx.tracked.has(a) || seenHere.has(a)) continue;
    seenHere.add(a);
    here.push(a);
  }
  let seeds = 0;
  for (const s of ctx.seeds) if (ctx.tracked.has(s)) seeds += 1;
  if (here.length === 0) {
    return { rung: 'off-repo', anchors: 0, parsed: 0, reached: 0, tested: 0, seeds };
  }
  const reach = reachFrom(ctx.graph, ctx.seeds, ctx.tracked);
  let parsed = 0;
  let reachedCount = 0;
  let testedCount = 0;
  let reached = false;
  let tested = false;
  let composed = false;
  for (const a of here) {
    const importers = ctx.graph.into.get(a);
    const inReach = reach.has(a);
    const byTest = importers !== undefined && [...importers].some((f) => ctx.testFiles.has(f));
    if (inReach) reached = true;
    if (byTest) tested = true;
    if ((importers !== undefined && importers.size > 0) || ctx.namedByManifest.has(a)) {
      composed = true;
    }
    if (!ctx.parseable(a)) continue;
    parsed += 1;
    if (inReach) reachedCount += 1;
    if (byTest) testedCount += 1;
  }
  return {
    rung: decide(reached, tested, composed),
    anchors: here.length,
    parsed,
    reached: reachedCount,
    tested: testedCount,
    seeds
  };
}

// ---------------------------------------------------------------------------
// The seeds, rule G (SPEC §2)
// ---------------------------------------------------------------------------

/** The two entrypoint kinds that are a SOURCE start: a file the walk may begin at. */
const SOURCE_START_KINDS: ReadonlySet<string> = new Set(['composition-root', 'main']);

/** The directory of a repository relative path, '' at the root. */
export function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? '' : path.slice(0, cut);
}

/** Whether `path` sits at or under `dir`; the root '' holds everything. */
export function underDir(dir: string, path: string): boolean {
  return dir === '' || path === dir || path.startsWith(`${dir}/`);
}

/**
 * Rule Q2's ownership, as one function two readers share: the deepest unit
 * whose directory is a prefix of the path, the root matching everything, or
 * null under no unit. `skeleton.ts` asks it for boxes and starts and this
 * module asks it for seeds, so a part and its seeds cannot disagree about
 * which unit they are in.
 */
export function deepestUnitOf<T extends { dir: string }>(
  units: readonly T[]
): (path: string) => T | null {
  // The root is depth 0, not the depth 1 that `''.split('/')` would give it,
  // or a root unit would tie with every top level unit and take its boxes.
  const depth = (dir: string): number => (dir === '' ? 0 : dir.split('/').length);
  const deepestFirst = [...units].sort(
    (a, b) => depth(b.dir) - depth(a.dir) || (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0)
  );
  return (path) => deepestFirst.find((u) => underDir(u.dir, path)) ?? null;
}

/** file → the entrypoint kinds it carries, from the entrypoint facts alone. */
export function entrypointFilesOf(facts: readonly ArchFact[]): ReadonlyMap<string, ReadonlySet<string>> {
  const out = new Map<string, Set<string>>();
  for (const f of facts) {
    if (f.category !== 'entrypoint') continue;
    let kinds = out.get(f.file);
    if (kinds === undefined) {
      kinds = new Set<string>();
      out.set(f.file, kinds);
    }
    kinds.add(f.kind);
  }
  return out;
}

/** The files a `boundary` or `entrypoint` fact names, the prototype's reading of "named by a manifest". */
export function namedByManifestOf(facts: readonly ArchFact[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const f of facts) {
    if (f.category === 'boundary' || f.category === 'entrypoint') out.add(f.file);
  }
  return out;
}

/** A path composed beside a manifest, with `./` and `/./` folded away. */
function beside(dir: string, rel: string): string {
  const clean = rel.replace(/^\.\//, '').replace(/\/\.\//g, '/');
  return dir === '' ? clean : `${dir}/${clean}`;
}

/**
 * Rule D, the FILE a manifest declares as its entry, only when tracked:
 * `package.json` main and bin, a Cargo `[[bin]]` at `src/main.rs` or
 * `src/bin/<name>.rs`, a SwiftPM `executableTarget X` at
 * `Sources/X/main.swift`. A manifest whose entry is a BUILT artefact, such as
 * this repository's `./out/main/index.js`, declares no seed and the hover
 * says `nothing this reader recognises starts this unit` when the unit has
 * no source start either. Python console scripts (`mod:fn`) name a module
 * and not a file and never seed (SPEC §7 limit 3).
 */
export function declaredEntries(
  facts: readonly ArchFact[],
  tracked: ReadonlySet<string>
): ReadonlySet<string> {
  const out = new Set<string>();
  const keep = (path: string): void => {
    if (tracked.has(path)) out.add(path);
  };
  for (const f of facts) {
    if (f.category !== 'entrypoint') continue;
    const dir = dirOf(f.file);
    if (f.kind === 'package-main') {
      const m = /^node entry (.+)$/.exec(f.subject);
      if (m !== null) keep(beside(dir, m[1] as string));
    } else if (f.kind === 'bin' && f.rule === 'entrypoint.pkg.bin') {
      const m = /→ (.+)$/.exec(f.subject);
      if (m !== null) keep(beside(dir, m[1] as string));
    } else if (f.kind === 'bin' && f.rule === 'entrypoint.cargo.bin') {
      const main = beside(dir, 'src/main.rs');
      if (tracked.has(main)) keep(main);
      else {
        const m = /^cargo bin (.+)$/.exec(f.subject);
        if (m !== null) keep(beside(dir, `src/bin/${m[1] as string}.rs`));
      }
    } else if (f.kind === 'bin' && f.rule === 'entrypoint.swiftpm.target') {
      const m = /^swift executableTarget (.+)$/.exec(f.subject);
      if (m !== null) keep(beside(dir, `Sources/${m[1] as string}/main.swift`));
    }
  }
  return out;
}

/**
 * Rule G: per unit, the tracked files ITS OWN extent starts, being the
 * source starts and the declared entries that rule Q2 assigns to it. A file
 * under no unit seeds nothing, and a unit nothing starts has an empty set.
 */
export function seedsFor<T extends { id: string; dir: string }>(
  units: readonly T[],
  entrypointFiles: ReadonlyMap<string, ReadonlySet<string>>,
  declared: ReadonlySet<string>,
  tracked: ReadonlySet<string>
): ReadonlyMap<string, ReadonlySet<string>> {
  const unitOf = deepestUnitOf(units);
  const out = new Map<string, Set<string>>();
  for (const u of units) out.set(u.id, new Set<string>());
  const candidates = new Set<string>();
  for (const [file, kinds] of entrypointFiles) {
    if ([...kinds].some((k) => SOURCE_START_KINDS.has(k))) candidates.add(file);
  }
  for (const file of declared) candidates.add(file);
  for (const file of [...candidates].sort()) {
    if (!tracked.has(file)) continue;
    const owner = unitOf(file);
    if (owner === null) continue;
    out.get(owner.id)?.add(file);
  }
  return out;
}

/**
 * The seed set for one part: the union of the seeds of every unit that owns
 * one of its files, which is how `build/p258/seed-measure.mts` measured rule
 * G and is what the SPEC's numbers were counted with. A box shallower than
 * the units nested inside it, such as this repository's `build` holding its
 * fixture crates, walks from those crates' mains as well as from the root's.
 */
export function seedsOfPart<T extends { id: string; dir: string }>(
  files: Iterable<string>,
  unitOf: (path: string) => T | null,
  seedsByUnit: ReadonlyMap<string, ReadonlySet<string>>
): ReadonlySet<string> {
  const unitIds = new Set<string>();
  for (const file of files) {
    const owner = unitOf(file);
    if (owner !== null) unitIds.add(owner.id);
  }
  const out = new Set<string>();
  for (const id of [...unitIds].sort()) {
    for (const s of seedsByUnit.get(id) ?? []) out.add(s);
  }
  return out;
}
