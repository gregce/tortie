/**
 * The session change diff, the pure half (Phase 159).
 *
 * Main computes the verdict deltas inside the check, in the one place the
 * previous set and the next set both exist, and persists one burst per
 * repository. This file turns that record into rows a section can draw and
 * NOTHING MORE: no second arithmetic over the verdicts, no counting, no
 * re-derivation of what moved. The store's own rule holds here as it holds
 * for the strip: main is the one place the verdicts live, and a second
 * assembly of them in the renderer would be a second answer.
 *
 * What is here is naming and ordering. A subject id becomes a short label a
 * person reads, a status or its absence becomes one word, and the rows come
 * out in a fixed order so two draws of the same burst are byte identical.
 * The view tests exercise all of it without a DOM.
 */

import type {
  ArchPartChange,
  ArchVerdictChange,
  ArchVerdictChanges,
  ArchVerdictStatus
} from '@shared/arch';
import { archVerdictWord } from '@shared/arch-copy';
import { archSubjectOwner } from '@shared/arch-ids';
import { ARCH_CHANGE_GONE, ARCH_CHANGE_NEW } from './copy';

/** Seven characters, the length git itself abbreviates to on a small tree. */
export const SHORT_COMMIT_LENGTH = 7;

/** The commit the burst landed at, as the header wears it. */
export function shortCommit(commit: string): string {
  return commit.slice(0, SHORT_COMMIT_LENGTH);
}

/**
 * Whether the section has anything to draw. A burst with no rows is what a
 * check that moved nothing leaves behind when nothing earlier moved either,
 * and it does not mount a header over an empty list.
 */
export function hasChanges(changes: ArchVerdictChanges | null): boolean {
  return (
    changes !== null &&
    (changes.verdicts.length > 0 || changes.parts.length > 0)
  );
}

/**
 * The component id a subject id is about, or null for an edge subject or a
 * string that is not a subject id. The split itself is the checkers' own,
 * `archSubjectOwner` in the shared ids module, so main and this view read
 * one subject id the same way.
 */
export function changeComponentId(subjectId: string): string | null {
  const owner = archSubjectOwner(subjectId);
  if (owner === null || owner.kind !== 'component') return null;
  return owner.id.length > 0 ? owner.id : null;
}

/**
 * The short label one change row wears.
 *
 * A component subject says the person's own name for the part, and the
 * facet after the hash rides along as it is, so `component:core#boundary`
 * reads as the name of core and the word boundary. An edge subject says the
 * edge id, exactly as the failure list does, because an edge has no display
 * name of its own in the contract. Evidence keeps its prefix so a stale
 * quote is told apart from the promise it quotes.
 */
export function changeLabel(
  subjectId: string,
  nameOf: (componentId: string) => string
): string {
  const componentId = changeComponentId(subjectId);
  const evidence = subjectId.startsWith('evidence:');
  if (componentId === null) {
    const bare = subjectId.replace(/^evidence:/, '').replace(/^edge:/, '');
    return evidence ? `evidence ${bare}` : bare;
  }
  const hash = subjectId.indexOf('#');
  const facet =
    hash === -1 ? '' : subjectId.slice(hash + 1).replace(/^anchor:/, 'anchor ');
  const name = nameOf(componentId);
  const head = evidence ? `evidence ${name}` : name;
  return facet.length === 0 ? head : `${head} ${facet}`;
}

/**
 * One verdict word, or the word for a subject that was not there. `from`
 * null is a subject the last check did not have, and `to` null is one the
 * new check dropped, which happens when a promise leaves the contract.
 */
export function changeWord(
  status: ArchVerdictStatus | null,
  side: 'from' | 'to'
): string {
  if (status === null) return side === 'from' ? ARCH_CHANGE_NEW : ARCH_CHANGE_GONE;
  return archVerdictWord(status);
}

/**
 * The subject a change row selects when pressed. A promise row selects its
 * verdict subject, exactly as the failure list does, so the prose panel and
 * the module view answer to the same id. A part row selects the component.
 */
export function changeSelectId(change: ArchVerdictChange): string {
  return change.subjectId;
}

export function partSelectId(part: ArchPartChange): string {
  return `component:${part.componentId}`;
}

/**
 * The rows in the order the section draws them: the ones that broke first,
 * then the rest, each group by subject id. A burst is small, so the sort is
 * about reading rather than cost: the row a person has to act on is at the
 * top, and the same burst always draws the same way.
 */
export function orderedChanges(
  changes: ArchVerdictChanges
): readonly ArchVerdictChange[] {
  const broke = (c: ArchVerdictChange): number =>
    c.to === 'divergent' || c.to === 'absent' ? 0 : 1;
  return [...changes.verdicts].sort(
    (a, b) => broke(a) - broke(b) || a.subjectId.localeCompare(b.subjectId)
  );
}

/** The parts, most moved first, ties by id. */
export function orderedParts(
  changes: ArchVerdictChanges
): readonly ArchPartChange[] {
  return [...changes.parts].sort(
    (a, b) =>
      b.commitsBehindDelta - a.commitsBehindDelta ||
      a.componentId.localeCompare(b.componentId)
  );
}

/** The chip on a part row: how many more commits landed under it. */
export function partDelta(part: ArchPartChange): string {
  return `+${String(part.commitsBehindDelta)}`;
}
