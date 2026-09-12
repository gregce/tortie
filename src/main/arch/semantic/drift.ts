/**
 * WHAT STALE MEANS, MECHANICALLY (Phase 259, research 118 §7.5; SPEC §3.3).
 *
 * Drift is per CLAIM, never per repository. The skill research 118 §2.3 took
 * apart keeps one fingerprint over everything, which is why adding a line to a
 * changelog makes a document about the scheduler answer `update`. Tortie
 * already has the better grain: a fact carries a file, a line, a kind and a
 * subject, and `arch_fact_file` carries the file's blob oid.
 *
 * So each citation stores `(blob oid of the cited file, fact kind, fact
 * subject)` and this pure function answers four ways:
 *
 *  - the file's oid is unchanged: **current**, and nothing is read;
 *  - the oid moved and a row with the same `(kind, subject)` is still in that
 *    file: **current**, and the line is rewritten to the new one, which is what
 *    the product already does for an anchor;
 *  - the oid moved and no row with that `(kind, subject)` is anywhere in that
 *    file: the citation is **dead** and its claim is **stale**;
 *  - the file is no longer tracked: **dead**, the same.
 *
 * A citation graded `resolves` has no `(kind, subject)` to look for, so its
 * fingerprint is the blob oid ALONE and any change to that file kills it. That
 * is deliberately stricter: a citation with nothing behind it has nothing else
 * to check.
 *
 * ## Stale is a flag and a sentence. It is never a deletion and never a re-ask
 *
 * The sentence STAYS, the chip turns, and the reason names the citation that
 * died. Nothing here starts anything: this module is pure, the store's writer
 * is an `UPDATE`, and the re-ask is a person's gesture on the stale claim or
 * the shipped settled-drift path under an agent already confirmed in Settings
 * with the confirm gate re-checked at the spawn. Refusal 8 is untouched and
 * `conformance:semantic` rule 8e reads this function's own braces and its
 * caller's to prove neither names a spawn, a runner or `arch:enrich`.
 */

import type { ArchCiteGrade } from '@shared/arch';

/** One stored citation, as the refresh reads it back. */
export interface StoredCite {
  claimId: string;
  seq: number;
  relPath: string;
  line: number;
  /** The blob oid of the cited file when the claim was written. */
  blobOid: string;
  /** The fact behind the grade, or null at `resolves`. */
  factKind: string | null;
  factSubject: string | null;
  grade: ArchCiteGrade;
  /** Whether the store already holds it as dead. */
  dead: boolean;
}

/** What the refresh asks of the tree it is checking against. */
export interface RefreshSources {
  /** The blob oid of a tracked file right now, or null when it is gone. */
  oidOf(relPath: string): string | null;
  /** Every `(kind, subject, line)` this file carries right now, facts and declarations alike. */
  rowsIn(relPath: string): readonly { kind: string; subject: string; line: number }[];
}

/** One citation whose line moved under it. */
export interface MovedCite {
  claimId: string;
  seq: number;
  line: number;
  blobOid: string;
}

/** One citation that no longer stands. */
export interface DeadCite {
  claimId: string;
  seq: number;
  /** One sentence naming the citation and why it died. */
  reason: string;
}

/** What one pass over the stored citations found. */
export interface SemanticRefresh {
  /** Citations whose line was rewritten, still current. */
  moved: MovedCite[];
  /** Citations that died, newly. Their claims turn stale. */
  dead: DeadCite[];
  /** Citations that were dead and stand again, because the row came back. */
  revived: MovedCite[];
}

/**
 * Read every stored citation against the tree as it is now. Pure: it takes the
 * rows, it answers what moved and what died, and it writes nothing.
 */
export function refreshSemantic(
  cites: readonly StoredCite[],
  src: RefreshSources
): SemanticRefresh {
  const out: SemanticRefresh = { moved: [], dead: [], revived: [] };
  for (const cite of cites) {
    const oid = src.oidOf(cite.relPath);
    if (oid === null) {
      if (!cite.dead) {
        out.dead.push({
          claimId: cite.claimId,
          seq: cite.seq,
          reason: `${cite.relPath}:${String(cite.line)} is no longer a file of this repository`
        });
      }
      continue;
    }
    if (oid === cite.blobOid) {
      // The bytes did not move, so neither did anything in them. Nothing is
      // read at all, which is what makes this cheap enough to run on every
      // deterministic pass.
      if (cite.dead) {
        out.revived.push({ claimId: cite.claimId, seq: cite.seq, line: cite.line, blobOid: oid });
      }
      continue;
    }
    if (cite.factKind === null || cite.factSubject === null) {
      // A `resolves` citation: the oid IS the whole fingerprint.
      if (!cite.dead) {
        out.dead.push({
          claimId: cite.claimId,
          seq: cite.seq,
          reason:
            `${cite.relPath}:${String(cite.line)} changed, and nothing was found ` +
            `at that line to look for again`
        });
      }
      continue;
    }
    const still = src
      .rowsIn(cite.relPath)
      .filter((row) => row.kind === cite.factKind && row.subject === cite.factSubject)
      .sort((a, b) => a.line - b.line)[0];
    if (still === undefined) {
      if (!cite.dead) {
        out.dead.push({
          claimId: cite.claimId,
          seq: cite.seq,
          reason: `${cite.relPath}:${String(cite.line)} no longer carries ${cite.factSubject}`
        });
      }
      continue;
    }
    const row = { claimId: cite.claimId, seq: cite.seq, line: still.line, blobOid: oid };
    if (cite.dead) out.revived.push(row);
    else out.moved.push(row);
  }
  return out;
}
