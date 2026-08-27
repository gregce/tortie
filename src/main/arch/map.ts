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

import type { ArchDocument, ArchVerdictStatus } from '@shared/arch';
import { ARCH_VERDICT_STATUSES } from '@shared/arch';
import type {
  ArchMapBand,
  ArchMapEdge,
  ArchMapGroup,
  ArchMapModel
} from '@shared/ipc';
import { componentFiles } from './checkers/glob';
import {
  aggregateGroupEdges,
  bandOf,
  classify,
  groupOwners,
  groupTree,
  mergeToTarget,
  rankGroups
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

/** Compose the level 1 map. Pure over the fact base. */
export function composeArchMap(input: ArchMapComposeInput): ArchMapModel {
  // Only a resolved import is an edge of the drawing. An unresolved one names
  // something this build could not find, and drawing it would put a guess on
  // the map; it is counted instead, per group, so the honest grey can say so.
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
  const groups = mergeToTarget(grouped, rankGroups(grouped, resolved));
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

  const edges: ArchMapEdge[] = aggregateGroupEdges(groups, resolved).map((edge) => {
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
