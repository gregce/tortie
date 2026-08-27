/**
 * The level 1 map model (Phase 160).
 *
 * The operator's ruling of 2026-08-27: Arch is a high fidelity way of
 * visualizing a codebase, the map is the product and the contract is
 * annotation on it. This module composes that picture: the skeleton's own
 * deterministic 5 to 9 groups, the resolved imports rolled up group to group
 * with counts, and, when a contract exists, the person's names and verdict
 * colours overlaid on the SAME boxes.
 *
 * ## Pure, and byte for byte repeatable
 *
 * Data in, model out. No clock, no random, no file read, no process, no
 * store. The same facts compose the same bytes on any machine, in any order
 * the imports arrive in, because every list is sorted before it leaves and
 * the rollup counts before it ranks. `npm run conformance:arch` composes the
 * model twice, the second time from shuffled facts, and compares the bytes.
 *
 * ## The overlay rule, stated once
 *
 * A contract component paints a box when a STRICT MAJORITY of the files its
 * anchors match sit inside that one group. The box then wears the person's
 * name; its machine id never changes, so the drill and the payload keep their
 * meaning. A component that spans several groups without a majority, or whose
 * anchors match nothing at HEAD, paints NO box: disagreement between the map
 * and the contract stays visible in the cockpit's outline and failure list
 * rather than being blended into the picture. Where two components both hold
 * a majority in one box, which one file set can only do by overlapping, the
 * larger share wins and a tie falls to the smaller component id.
 *
 * ## Verdict colour rides an edge, never invents one
 *
 * An aggregated edge carries a status only when both its endpoints wear
 * component names and the contract holds a judged promise from the one to the
 * other. Where several promises are judged between the same pair, the WORST
 * status wins, so a broken promise can never hide behind a held one beside
 * it. An edge the contract says nothing about stays uncoloured, which is most
 * of them, and that is the honest picture rather than a gap.
 */

import type {
  ArchCoverage,
  ArchCoverageCounts,
  ArchDocument,
  ArchOffending,
  ArchVerdictStatus
} from '@shared/arch';
import { ARCH_VERDICT_STATUSES } from '@shared/arch';
import type {
  ArchMapBand,
  ArchMapCrossing,
  ArchMapEdge,
  ArchMapGroup,
  ArchMapModel,
  ArchMapPartModel
} from '@shared/ipc';
import { componentFiles } from './checkers/glob';
import {
  aggregateGroupEdges,
  bandOf,
  classify,
  groupId,
  groupOwners,
  groupTree,
  mergeToTarget,
  prefixAt,
  rankGroups,
  SKELETON_TARGET,
  type Group
} from './skeleton';

/**
 * One import as the map needs it, which is the shape `arch.db` already hands
 * back. `toPath` is non null exactly when the resolution is `first-party`.
 */
export interface ArchMapImportFact {
  fromPath: string;
  toPath: string | null;
  resolution: string;
}

/** One stored verdict, by the two fields the overlay reads. */
export interface ArchMapVerdictFact {
  subjectId: string;
  status: ArchVerdictStatus;
}

/** Everything the composer sees. Every field comes from the fact base. */
export interface ArchMapComposeInput {
  /** The one line above the drawing, the repository's own name. */
  subject: string;
  /** Every tracked path at HEAD, from the one `git ls-files -z`. */
  trackedFiles: readonly string[];
  /** Every import in the fact base, resolved or not. */
  imports: readonly ArchMapImportFact[];
  /** Directories a workspace declaration named, if any. */
  workspaces?: readonly string[];
  /** The loaded contract, or null. Null draws the computed-only picture. */
  document: ArchDocument | null;
  /** Whatever the last completed check concluded. Empty is fine. */
  verdicts: readonly ArchMapVerdictFact[];
}

/**
 * Worse sorts first. `divergent` is a broken promise, `absent` is a promise
 * about something that is not there, `unverifiable` is a promise nobody could
 * judge, and `convergent` holds.
 */
const STATUS_SEVERITY: Readonly<Record<ArchVerdictStatus, number>> = {
  divergent: 0,
  absent: 1,
  unverifiable: 2,
  convergent: 3
};

/**
 * The resolved slice and the level 1 partition, shared by BOTH composes
 * (extracted by the integrator, Phase 161, from two copies of the block).
 *
 * Only a resolved import is an edge of the drawing. An unresolved one names
 * something this build could not find, and drawing it would put a guess on
 * the map; it is counted instead, per group, so the honest grey can say so.
 * The scoped compose recomposing THIS exact partition from the same facts is
 * what resolves a clicked group id without any file list crossing the wire.
 */
function level1Partition(input: ArchMapComposeInput): {
  resolved: { fromPath: string; toPath: string }[];
  groups: Group[];
} {
  const resolved: { fromPath: string; toPath: string }[] = [];
  for (const fact of input.imports) {
    if (fact.toPath !== null && fact.resolution === 'first-party') {
      resolved.push({ fromPath: fact.fromPath, toPath: fact.toPath });
    }
  }
  const grouped = groupTree({
    subject: input.subject,
    trackedFiles: input.trackedFiles,
    imports: resolved,
    ...(input.workspaces === undefined ? {} : { workspaces: input.workspaces })
  });
  return {
    resolved,
    groups: mergeToTarget(grouped, rankGroups(grouped, resolved))
  };
}

/**
 * One aggregated edge list with the judged promises joined on (extracted by
 * the integrator, Phase 161, from two copies): the worst verdict between the
 * two overlaid ends rides the edge, and a computed only edge carries null.
 */
function judgedEdges(
  boxes: readonly Group[],
  resolved: readonly { fromPath: string; toPath: string }[],
  overlay: ReadonlyMap<string, OverlayName>,
  input: ArchMapComposeInput
): ArchMapEdge[] {
  return aggregateGroupEdges(boxes, resolved).map((edge) => {
    const judged = judgeEdge(
      overlay.get(edge.from)?.id ?? null,
      overlay.get(edge.to)?.id ?? null,
      input
    );
    return {
      from: edge.from,
      to: edge.to,
      count: edge.count,
      status: judged?.status ?? null,
      edgeId: judged?.edgeId ?? null
    };
  });
}

/** Compose the level 1 map. Pure over the fact base. */
export function composeArchMap(input: ArchMapComposeInput): ArchMapModel {
  const { resolved, groups } = level1Partition(input);
  const owner = groupOwners(groups);

  // Per group import counts, from the whole fact base rather than only the
  // resolved slice, because the denominator is what keeps the grey honest.
  const perGroup = new Map<
    string,
    { total: number; resolved: number; external: number; unresolved: number }
  >(groups.map((g) => [g.id, { total: 0, resolved: 0, external: 0, unresolved: 0 }]));
  let totalImports = 0;
  let resolvedImports = 0;
  let unresolvedImports = 0;
  for (const fact of input.imports) {
    totalImports += 1;
    if (fact.resolution === 'first-party') resolvedImports += 1;
    const miss = fact.resolution === 'unresolved' || fact.resolution === 'unverifiable';
    if (miss) unresolvedImports += 1;
    const at = perGroup.get(owner.get(fact.fromPath) ?? '');
    if (at === undefined) continue;
    at.total += 1;
    if (fact.resolution === 'first-party') at.resolved += 1;
    else if (fact.resolution === 'external') at.external += 1;
    else if (miss) at.unresolved += 1;
  }

  const overlay = overlayComponents(owner, input);

  const mapGroups: ArchMapGroup[] = groups.map((group) => {
    const counts = perGroup.get(group.id) ?? {
      total: 0,
      resolved: 0,
      external: 0,
      unresolved: 0
    };
    const painted = overlay.get(group.id) ?? null;
    return {
      id: group.id,
      dir: group.dir,
      label: painted?.name ?? group.dir,
      componentId: painted?.id ?? null,
      band: bandOf(group, groups, resolved) as ArchMapBand,
      provenance: classify(group),
      fileCount: group.files.length,
      totalImports: counts.total,
      resolvedImports: counts.resolved,
      externalImports: counts.external,
      unresolvedImports: counts.unresolved
    };
  });

  const edges: ArchMapEdge[] = judgedEdges(groups, resolved, overlay, input);

  return {
    subject: input.subject,
    groups: mapGroups,
    edges,
    fileCount: input.trackedFiles.length,
    totalImports,
    resolvedImports,
    unresolvedImports,
    contractPresent: input.document?.contract != null
  };
}

/** What one painted box wears. */
interface OverlayName {
  id: string;
  name: string;
  /** The majority share that won the box, for the tie rule. */
  share: number;
}

/**
 * Which contract component, if any, paints each group.
 *
 * The strict majority rule from the module header. Components are visited in
 * id order and every comparison is deterministic, so the same contract paints
 * the same boxes every time.
 */
function overlayComponents(
  owner: ReadonlyMap<string, string>,
  input: ArchMapComposeInput
): Map<string, OverlayName> {
  const painted = new Map<string, OverlayName>();
  if (input.document?.contract == null) return painted;
  const components = [...input.document.components].sort((a, b) =>
    a.id < b.id ? -1 : 1
  );
  for (const component of components) {
    const files = componentFiles(component, input.trackedFiles);
    if (files.length === 0) continue;
    const byGroup = new Map<string, number>();
    for (const path of files) {
      const at = owner.get(path);
      if (at === undefined) continue;
      byGroup.set(at, (byGroup.get(at) ?? 0) + 1);
    }
    for (const [groupId, count] of byGroup) {
      if (count * 2 <= files.length) continue;
      const share = count / files.length;
      const held = painted.get(groupId);
      // The larger share wins the box; a tie falls to the smaller component
      // id, which the id-sorted visit order already guarantees.
      if (held === undefined || share > held.share) {
        painted.set(groupId, { id: component.id, name: component.name, share });
      }
      break;
    }
  }
  return painted;
}

/**
 * The verdict riding one aggregated edge, or null.
 *
 * Every judged promise from the one component to the other is a candidate,
 * whatever its kind, because a person's promise between two parts belongs on
 * the line between their boxes. The worst status wins; a tie falls to the
 * smaller promise id.
 */
function judgeEdge(
  fromComponent: string | null,
  toComponent: string | null,
  input: ArchMapComposeInput
): { status: ArchVerdictStatus; edgeId: string } | null {
  if (fromComponent === null || toComponent === null) return null;
  if (input.document?.contract == null) return null;
  const bySubject = new Map<string, ArchVerdictStatus>();
  for (const verdict of input.verdicts) {
    if (ARCH_VERDICT_STATUSES.includes(verdict.status)) {
      bySubject.set(verdict.subjectId, verdict.status);
    }
  }
  let worst: { status: ArchVerdictStatus; edgeId: string } | null = null;
  const promises = [...input.document.edges].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const promise of promises) {
    if (promise.from !== fromComponent || promise.to !== toComponent) continue;
    const status = bySubject.get(`edge:${promise.id}`);
    if (status === undefined) continue;
    if (worst === null || STATUS_SEVERITY[status] < STATUS_SEVERITY[worst.status]) {
      worst = { status, edgeId: promise.id };
    }
  }
  return worst;
}

// ---------------------------------------------------------------------------
// The drilled part (Phase 161)
// ---------------------------------------------------------------------------

/**
 * One stored verdict as the scoped counts need it: the level 1 fields plus
 * the coverage and the offences, which is still a subset of what `arch.db`
 * hands back, so the ipc read passes the stored rows through unchanged.
 */
export interface ArchMapPartVerdictFact extends ArchMapVerdictFact {
  coverage: ArchCoverage;
  offending?: readonly ArchOffending[];
}

/** Everything the scoped composer sees. The level 1 input plus the target. */
export interface ArchMapPartComposeInput extends ArchMapComposeInput {
  /** The level 1 group id a person clicked. */
  groupId: string;
  verdicts: readonly ArchMapPartVerdictFact[];
}

/**
 * Compose the drilled part: one level 1 box opened into its modules, with the
 * crossing edges to the rest of the repository kept at the frame. Pure over
 * the fact base, byte for byte repeatable, and it recomposes the level 1
 * partition from the SAME facts by the SAME functions, which is what resolves
 * the drilled group id without shipping any file list over the wire.
 *
 * The sub grouping is the level 1 rule started one level deeper: the part's
 * files grouped by directory prefix at the part's own depth plus one,
 * descending at most two more levels until there are enough boxes to be worth
 * drawing, then folded to the same target by the same rank and merge. A file
 * sitting directly in the part's directory keeps its deepest available
 * prefix, so the part's loose files draw as a module wearing the part's own
 * directory rather than vanishing.
 */
export function composeArchMapPart(
  input: ArchMapPartComposeInput
): ArchMapPartModel {
  const { resolved, groups: level1 } = level1Partition(input);
  const level1Owner = groupOwners(level1);
  const level1Overlay = overlayComponents(level1Owner, input);
  const part = level1.find((group) => group.id === input.groupId);
  if (part === undefined) {
    // The facts moved under the drill: a rebase, a rename, a workspace
    // declaration appearing. The caller pops the drill; nothing here guesses
    // at a part that is not in the current partition.
    return {
      groupId: input.groupId,
      groupDir: '',
      groupLabel: input.groupId,
      componentId: null,
      known: false,
      modules: [],
      edges: [],
      crossings: [],
      fileCount: 0,
      totalImports: 0,
      resolvedImports: 0,
      unresolvedImports: 0,
      counts: emptyScopedCounts(0, 0),
      subjectIds: [],
      contractPresent: input.document?.contract != null
    };
  }

  const own = new Set(part.files);

  // The part's own denominators, over the whole fact base rather than only
  // the resolved slice, the level 1 rule scoped.
  let totalImports = 0;
  let resolvedImports = 0;
  let unresolvedImports = 0;
  for (const fact of input.imports) {
    if (!own.has(fact.fromPath)) continue;
    totalImports += 1;
    if (fact.resolution === 'first-party') resolvedImports += 1;
    if (fact.resolution === 'unresolved' || fact.resolution === 'unverifiable') {
      unresolvedImports += 1;
    }
  }

  const subGrouped = partModules(part);
  const modules = mergeToTarget(subGrouped, rankGroups(subGrouped, resolved));
  const moduleOwner = groupOwners(modules);
  // The level 1 overlay rule reused whole: a component paints a module when a
  // strict majority of its files sit inside that one module. A component that
  // painted the WHOLE part rarely paints any single module, and that is
  // honest rather than a gap.
  const moduleOverlay = overlayComponents(moduleOwner, input);

  const perModule = new Map<
    string,
    { total: number; resolved: number; external: number; unresolved: number }
  >(
    modules.map((m) => [
      m.id,
      { total: 0, resolved: 0, external: 0, unresolved: 0 }
    ])
  );
  for (const fact of input.imports) {
    const at = perModule.get(moduleOwner.get(fact.fromPath) ?? '');
    if (at === undefined) continue;
    at.total += 1;
    if (fact.resolution === 'first-party') at.resolved += 1;
    else if (fact.resolution === 'external') at.external += 1;
    else if (
      fact.resolution === 'unresolved' ||
      fact.resolution === 'unverifiable'
    ) {
      at.unresolved += 1;
    }
  }

  const moduleBoxes: ArchMapGroup[] = modules.map((module) => {
    const counts = perModule.get(module.id) ?? {
      total: 0,
      resolved: 0,
      external: 0,
      unresolved: 0
    };
    const painted = moduleOverlay.get(module.id) ?? null;
    return {
      id: module.id,
      dir: module.dir,
      label: painted?.name ?? module.dir,
      componentId: painted?.id ?? null,
      // The band is computed over the interior graph: `aggregateGroupEdges`
      // and `bandOf` both drop any edge with an end outside the owner map,
      // so passing the whole resolved slice scopes itself.
      band: bandOf(module, modules, resolved) as ArchMapBand,
      provenance: classify(module),
      fileCount: module.files.length,
      totalImports: counts.total,
      resolvedImports: counts.resolved,
      externalImports: counts.external,
      unresolvedImports: counts.unresolved
    };
  });

  const edges: ArchMapEdge[] = judgedEdges(
    modules,
    resolved,
    moduleOverlay,
    input
  );

  const crossings = partCrossings(
    part,
    level1,
    level1Owner,
    level1Overlay,
    moduleOwner,
    resolved
  );

  const scoped = scopedVerdicts(part.id, level1Owner, input);
  const painted = level1Overlay.get(part.id) ?? null;

  return {
    groupId: part.id,
    groupDir: part.dir,
    groupLabel: painted?.name ?? part.dir,
    componentId: painted?.id ?? null,
    known: true,
    modules: moduleBoxes,
    edges,
    crossings,
    fileCount: part.files.length,
    totalImports,
    resolvedImports,
    unresolvedImports,
    counts: {
      ...scoped.counts,
      unresolvedImports,
      totalImports
    },
    subjectIds: scoped.subjectIds,
    contractPresent: input.document?.contract != null
  };
}

/**
 * The part's files grouped one directory level below the part, by the SAME
 * prefix rule the level 1 grouping uses, descending at most two more levels
 * until there are enough boxes to be worth drawing. Fewer than the target
 * minimum is an accepted answer, the Phase 160 rule scoped.
 *
 * A merged in file that does not sit under the part's directory, which
 * `mergeToTarget` produces on purpose, keeps its own prefix at the same
 * depth, so it draws as the directory it actually lives in.
 */
function partModules(part: Group): Group[] {
  const base = part.dir.split('/').length;
  const files = [...part.files].sort();
  for (let depth = base + 1; depth <= base + 3; depth += 1) {
    const byDir = new Map<string, string[]>();
    for (const path of files) {
      const dir = prefixAt(path, depth);
      if (dir === null) continue;
      const list = byDir.get(dir);
      if (list === undefined) byDir.set(dir, [path]);
      else list.push(path);
    }
    if (byDir.size >= SKELETON_TARGET.min || depth === base + 3) {
      return [...byDir.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([dir, list]) => ({ id: groupId(dir), dir, files: list }));
    }
  }
  return [];
}

/**
 * The frame: every resolved import with exactly one end inside the part,
 * aggregated as module, outside part, direction and count, heaviest first
 * with deterministic ties. The outside part keeps its id, its face label and
 * its band, so a frame stub names a real thing.
 */
function partCrossings(
  part: Group,
  level1: readonly Group[],
  level1Owner: ReadonlyMap<string, string>,
  level1Overlay: ReadonlyMap<string, OverlayName>,
  moduleOwner: ReadonlyMap<string, string>,
  resolved: readonly { fromPath: string; toPath: string }[]
): ArchMapCrossing[] {
  const counted = new Map<string, number>();
  for (const edge of resolved) {
    const fromModule = moduleOwner.get(edge.fromPath);
    const toModule = moduleOwner.get(edge.toPath);
    // Both ends inside the part is an interior edge, and both ends outside is
    // the rest of the repository talking to itself. Neither is the frame's.
    if ((fromModule !== undefined) === (toModule !== undefined)) continue;
    const inside = fromModule ?? toModule;
    if (inside === undefined) continue;
    const outsidePath = fromModule !== undefined ? edge.toPath : edge.fromPath;
    const outside = level1Owner.get(outsidePath);
    // An outside end no level 1 group owns is not an edge at level 1 either,
    // and an end owned by the drilled part itself is a part file the sub
    // grouping could not place, which cannot happen for a file with a
    // directory and draws nothing when it does.
    if (outside === undefined || outside === part.id) continue;
    const direction = fromModule !== undefined ? 'out' : 'in';
    // Group ids are kebab case out of `groupId`, so a space can never appear
    // inside one and the key cannot collide.
    const key = `${inside} ${outside} ${direction}`;
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  const faces = new Map(
    level1.map((group) => [
      group.id,
      {
        label: level1Overlay.get(group.id)?.name ?? group.dir,
        band: bandOf(group, level1, resolved) as ArchMapBand
      }
    ])
  );
  return [...counted.entries()]
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => {
      const [moduleId = '', outsideId = '', direction = 'out'] = key.split(' ');
      const face = faces.get(outsideId) ?? {
        label: outsideId,
        band: 'engine' as ArchMapBand
      };
      return {
        moduleId,
        outsideId,
        outsideLabel: face.label,
        outsideBand: face.band,
        direction: direction === 'in' ? ('in' as const) : ('out' as const),
        count
      };
    });
}

/** The scoped strip counts before the denominators are put on. */
function emptyScopedCounts(
  unresolvedImports: number,
  totalImports: number
): ArchCoverageCounts {
  return {
    checkedHold: 0,
    broke: 0,
    cannotCheck: 0,
    accepted: 0,
    unresolvedImports,
    totalImports
  };
}

/**
 * Which verdicts are in scope for one part, and what the scoped strip counts.
 *
 * A component maps into the part when a STRICT MAJORITY of its files sit
 * inside it, the overlay's own arithmetic, so the painted component is always
 * in scope and an overlapping second majority joins it. A verdict is in scope
 * when its subject's component maps in, or when it judges a promise either
 * end of which maps in. Freshness rows join the id set for the failure list
 * and are never counted, the strip's own rule.
 *
 * `accepted` is RE-DERIVED here: the stored verdict row does not carry the
 * checker's accepted flag, so a divergence whose every offence is covered by
 * a baseline row is counted accepted by the same matching rule
 * `checkers/imports.ts` uses, being the row's `edgeId` when it names one,
 * then `fromPath` and `toPath` exactly.
 */
function scopedVerdicts(
  partGroupId: string,
  level1Owner: ReadonlyMap<string, string>,
  input: ArchMapPartComposeInput
): { counts: ArchCoverageCounts; subjectIds: string[] } {
  const counts = emptyScopedCounts(0, 0);
  const subjectIds: string[] = [];
  if (input.document?.contract == null) return { counts, subjectIds };

  const scope = new Set<string>();
  const components = [...input.document.components].sort((a, b) =>
    a.id < b.id ? -1 : 1
  );
  for (const component of components) {
    const files = componentFiles(component, input.trackedFiles);
    if (files.length === 0) continue;
    let insidePart = 0;
    for (const path of files) {
      if (level1Owner.get(path) === partGroupId) insidePart += 1;
    }
    if (insidePart * 2 > files.length) scope.add(component.id);
  }

  const promiseEnds = new Map<string, { from: string; to: string }>();
  for (const promise of input.document.edges) {
    promiseEnds.set(promise.id, { from: promise.from, to: promise.to });
  }

  for (const verdict of input.verdicts) {
    let inScope = false;
    const subject = verdict.subjectId;
    if (subject.startsWith('component:')) {
      const rest = subject.slice('component:'.length);
      const hash = rest.indexOf('#');
      inScope = scope.has(hash === -1 ? rest : rest.slice(0, hash));
    } else if (subject.startsWith('edge:')) {
      const rest = subject.slice('edge:'.length);
      const hash = rest.indexOf('#');
      const ends = promiseEnds.get(hash === -1 ? rest : rest.slice(0, hash));
      inScope =
        ends !== undefined && (scope.has(ends.from) || scope.has(ends.to));
    }
    if (!inScope) continue;
    subjectIds.push(subject);
    if (subject.endsWith('#freshness')) continue;
    if (isAcceptedNow(verdict, input.document)) {
      counts.accepted += 1;
      continue;
    }
    if (verdict.coverage === 'unverifiable') {
      counts.cannotCheck += 1;
      continue;
    }
    if (verdict.status === 'divergent' || verdict.status === 'absent') {
      counts.broke += 1;
      continue;
    }
    counts.checkedHold += 1;
  }
  subjectIds.sort();
  return { counts, subjectIds };
}

/**
 * Whether a stored divergence is covered whole by the baseline, the
 * `partitionAccepted` rule from `checkers/imports.ts` applied to the stored
 * offences: accepted means every offence has a row, and a verdict with no
 * offence list cannot be accepted because there is nothing to match.
 */
function isAcceptedNow(
  verdict: ArchMapPartVerdictFact,
  document: ArchDocument
): boolean {
  if (verdict.status !== 'divergent' && verdict.status !== 'absent') {
    return false;
  }
  const offending = verdict.offending ?? [];
  if (offending.length === 0) return false;
  const edgeId = verdict.subjectId.startsWith('edge:')
    ? (verdict.subjectId.slice('edge:'.length).split('#')[0] ?? null)
    : null;
  return offending.every((offence) =>
    document.baseline.accepted.some((row) => {
      if (row.edgeId !== undefined && row.edgeId !== edgeId) return false;
      return row.fromPath === offence.fromPath && row.toPath === offence.toPath;
    })
  );
}
