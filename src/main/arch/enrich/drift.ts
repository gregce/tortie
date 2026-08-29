/**
 * The drift reader and the verdict delta reader (Phase 159).
 *
 * Two pure functions over what the checkers already produced, and nothing
 * else. Neither opens a file, starts a process, reads a clock or holds state.
 *
 * THE TWO QUESTIONS ARE DIFFERENT AND THEY ARE ANSWERED SEPARATELY.
 *
 *  - `readArchDrift` answers WHAT IS WRONG NOW, as state. It is what the
 *    delta prompt is composed from, because a repair has to name the promise
 *    that is broken today, whether it broke in this check or three checks
 *    ago and was never repaired. A transition would go quiet on a drift
 *    nobody fixed.
 *  - `diffArchVerdicts` answers WHAT MOVED between two checks, as
 *    transitions. It is what the change diff view draws, because a person
 *    reading the last burst of commits wants to see which promises those
 *    commits touched, and a promise that was broken before and is broken
 *    still did not move.
 *
 * WHAT COUNTS AS DRIFT is exactly what the verdict strip counts as broke
 * (`countByCoverage` in ../checkers/index.ts): a `divergent` or `absent`
 * verdict whose coverage is not `unverifiable`, that is not wholly accepted,
 * and that is not a freshness row. So the drift count a ribbon shows and the
 * broke count a strip shows are the same number for the same verdicts, plus
 * the parts that fell behind. A second definition here would be a second
 * answer, and the store's own rule is that main is the one place the
 * verdicts live.
 *
 * WHOLLY ACCEPTED is derived from the offending rows rather than read from a
 * flag. The stored `ArchVerdict` carries no `accepted` field; the checker's
 * own verdict does, but it is set precisely when every offending row carries
 * the person's reason and none is open, so reading the rows gives the same
 * answer for both shapes and this module accepts either.
 *
 * FALLEN BEHIND is commits only, at the same threshold the prose panel
 * withholds a part's description at (`ARCH_PROSE_MAX_COMMITS_BEHIND`), and
 * never the uncommitted file count. An uncommitted rewrite is the torn tree
 * the settle window exists for, and a repair proposed over it would describe
 * a tree that is still moving.
 */

import type {
  ArchCoverage,
  ArchDocument,
  ArchDrift,
  ArchDriftPart,
  ArchDriftPromise,
  ArchDriftQuote,
  ArchFreshness,
  ArchOffending,
  ArchPartChange,
  ArchVerdictChange,
  ArchVerdictDiff,
  ArchVerdictStatus
} from '@shared/arch';
import { ARCH_PROSE_MAX_COMMITS_BEHIND } from '@shared/arch-copy';
import { archSubjectOwner } from '@shared/arch-ids';

/**
 * The fields the reader needs, so the stored `ArchVerdict` and the checker's
 * own `ArchCheckerVerdict` both fit. The generation, commit and duration a
 * stored verdict also carries say nothing about what is wrong.
 */
export interface ArchDriftVerdict {
  subjectId: string;
  status: ArchVerdictStatus;
  coverage: ArchCoverage;
  reason: string | null;
  offending?: readonly ArchOffending[];
}

/** The fields the diff reads. The same minimal shape. */
export type ArchDiffVerdict = Pick<ArchDriftVerdict, 'subjectId' | 'status' | 'coverage'>;

/** The scope a drift repair may touch, handed to the validator's rule 10. */
export interface ArchDriftScope {
  componentIds: readonly string[];
  edgeIds: readonly string[];
}

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Offending rows in the order the divergence list already uses: path, line, specifier. */
export function sortOffending(rows: readonly ArchOffending[]): ArchOffending[] {
  return [...rows].sort(
    (a, b) =>
      byString(a.fromPath, b.fromPath) ||
      a.line - b.line ||
      byString(a.specifier, b.specifier) ||
      byString(a.toPath, b.toPath)
  );
}

/** Is this verdict one the strip counts as broke? The one definition, restated over the reader's shape. */
function isBroke(verdict: ArchDriftVerdict): boolean {
  if (verdict.subjectId.endsWith('#freshness')) return false;
  if (verdict.coverage === 'unverifiable') return false;
  if (verdict.status !== 'divergent' && verdict.status !== 'absent') return false;
  const rows = verdict.offending ?? [];
  const whollyAccepted =
    rows.length > 0 && rows.every((row) => row.accepted !== undefined);
  return !whollyAccepted;
}

/** The index behind an `evidence:` subject, or null when the id is not one. */
function evidenceIndex(subjectId: string): number | null {
  if (!subjectId.startsWith('evidence:')) return null;
  const hash = subjectId.lastIndexOf('#');
  if (hash === -1) return null;
  const digits = subjectId.slice(hash + 1);
  if (!/^\d{1,4}$/.test(digits)) return null;
  return Number(digits);
}

/**
 * Read the drift out of one published verdict set and its freshness rows.
 *
 * Returns null when nothing drifted, which is the answer the runner refuses
 * `no-drift` on before anything spawns. Every list is sorted by subject id
 * so two reads over the same verdicts in a different order give the same
 * drift, which is what makes the delta prompt byte deterministic.
 */
export function readArchDrift(
  document: ArchDocument,
  verdicts: readonly ArchDriftVerdict[],
  freshness: readonly ArchFreshness[]
): ArchDrift | null {
  const componentById = new Map(document.components.map((c) => [c.id, c]));
  const edgeById = new Map(document.edges.map((e) => [e.id, e]));
  const promises: ArchDriftPromise[] = [];
  const quotes: ArchDriftQuote[] = [];
  const componentIds = new Set<string>();
  const edgeIds = new Set<string>();

  const sorted = [...verdicts].sort((a, b) => byString(a.subjectId, b.subjectId));
  for (const verdict of sorted) {
    if (!isBroke(verdict)) continue;
    const owner = archSubjectOwner(verdict.subjectId);
    if (owner === null) continue;
    const status = verdict.status as 'divergent' | 'absent';

    const index = evidenceIndex(verdict.subjectId);
    if (index !== null) {
      // A stale quote is read from the DOCUMENT, not from the offending row:
      // an absent verdict carries no row, and the document is what the
      // repair edits. A verdict about a quote the document no longer holds
      // is a verdict from an older read and it is dropped here.
      const record =
        owner.kind === 'component'
          ? componentById.get(owner.id)
          : edgeById.get(owner.id);
      const row = record?.evidence[index];
      if (record === undefined || row === undefined) continue;
      quotes.push({
        subjectId: verdict.subjectId,
        owner,
        index,
        path: row.path,
        line: row.lineStart,
        quote: row.quote,
        status
      });
      if (owner.kind === 'component') {
        componentIds.add(owner.id);
      } else {
        const edge = edgeById.get(owner.id);
        edgeIds.add(owner.id);
        if (edge !== undefined) {
          componentIds.add(edge.from);
          componentIds.add(edge.to);
        }
      }
      continue;
    }

    promises.push({
      subjectId: verdict.subjectId,
      status,
      reason: verdict.reason ?? '',
      offending: sortOffending(
        (verdict.offending ?? []).filter((row) => row.accepted === undefined)
      )
    });
    if (owner.kind === 'component') {
      componentIds.add(owner.id);
    } else {
      edgeIds.add(owner.id);
      const edge = edgeById.get(owner.id);
      if (edge !== undefined) {
        componentIds.add(edge.from);
        componentIds.add(edge.to);
      }
    }
  }

  const parts: ArchDriftPart[] = [...freshness]
    .filter(
      (row) =>
        row.commitsBehind >= ARCH_PROSE_MAX_COMMITS_BEHIND &&
        componentById.has(row.componentId)
    )
    .sort((a, b) => byString(a.componentId, b.componentId))
    .map((row) => ({ componentId: row.componentId, commitsBehind: row.commitsBehind }));
  for (const part of parts) componentIds.add(part.componentId);

  const count = promises.length + quotes.length + parts.length;
  if (count === 0) return null;
  return {
    promises,
    quotes,
    parts,
    componentIds: [...componentIds].filter((id) => componentById.has(id)).sort(byString),
    edgeIds: [...edgeIds].filter((id) => edgeById.has(id)).sort(byString),
    count
  };
}

/** The scope alone, for the validator. */
export function driftScope(drift: ArchDrift): ArchDriftScope {
  return { componentIds: drift.componentIds, edgeIds: drift.edgeIds };
}

/**
 * What moved between two checks: every subject whose status or coverage
 * changed, appeared or vanished, and every part whose commit count rose.
 *
 * Freshness rows are skipped as verdicts, because their status never moves
 * and their movement is the part rows below. Sorted by subject id and by
 * component id, so the same two checks diff to the same bytes.
 */
export function diffArchVerdicts(
  previous: readonly ArchDiffVerdict[],
  next: readonly ArchDiffVerdict[],
  previousFreshness: readonly ArchFreshness[],
  nextFreshness: readonly ArchFreshness[]
): ArchVerdictDiff {
  const before = new Map(previous.map((v) => [v.subjectId, v]));
  const after = new Map(next.map((v) => [v.subjectId, v]));
  const subjects = new Set<string>([...before.keys(), ...after.keys()]);
  const verdicts: ArchVerdictChange[] = [];
  for (const subjectId of [...subjects].sort(byString)) {
    if (subjectId.endsWith('#freshness')) continue;
    const was = before.get(subjectId);
    const now = after.get(subjectId);
    const from = was?.status ?? null;
    const to = now?.status ?? null;
    const fromCoverage = was?.coverage ?? null;
    const toCoverage = now?.coverage ?? null;
    if (from === to && fromCoverage === toCoverage) continue;
    verdicts.push({ subjectId, from, to, fromCoverage, toCoverage });
  }

  const behindBefore = new Map(
    previousFreshness.map((row) => [row.componentId, row.commitsBehind])
  );
  const parts: ArchPartChange[] = [];
  for (const row of [...nextFreshness].sort((a, b) =>
    byString(a.componentId, b.componentId)
  )) {
    const delta = row.commitsBehind - (behindBefore.get(row.componentId) ?? 0);
    if (delta <= 0) continue;
    parts.push({
      componentId: row.componentId,
      commitsBehindDelta: delta,
      uncommittedFiles: row.uncommittedFiles
    });
  }
  return { verdicts, parts };
}
