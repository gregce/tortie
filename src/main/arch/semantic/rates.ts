/**
 * THE RATE, AND IT NEVER TRAVELS WITHOUT ITS FLOOR (Phase 259; SPEC §2.5).
 *
 * Research 118 §7.3: a reader shown "24 of 41 backed" and not shown "and 10 of
 * 41 would happen anyway" has been given a number without its denominator,
 * which is the one thing this pane refuses to do everywhere else. So this
 * function takes the floor as an argument and the shape it answers has no room
 * for a rate without one; `arch_claim_rate` has no such column either, and the
 * renderer's one formatter takes both halves.
 *
 * THE GATE PAIR IS REPORTED SEPARATELY AND IT IS THE WEAKEST HALF. A gate
 * claim is the ONE place a SHAPE is wanted, and research 118 §6.4 measured the
 * hand pass scoring 0 of its 6 gates against a gate-shaped fact: the `gate`
 * category is the least precise Phase 257 has at 58%, and its facts sit at
 * `throw` sites rather than at the function whose name a writer reaches for.
 * Drawing that pair is the honest thing; hiding it would make the view claim
 * more than the instrument can carry.
 *
 * Pure. It reads no store, opens no file and starts nothing.
 */

import type { ArchCiteGrade, ArchRateReading } from '@shared/arch';
import { emptyGradeTally, isBacked } from './grade';
import type { ArchCiteFloor } from './floor';

/** One citation as the rate counts it. */
export interface RateCite {
  claimId: string;
  /** Where it points. The rate counts each distinct line once. */
  relPath: string;
  line: number;
  grade: ArchCiteGrade;
  /** True when the claim it belongs to is a GATE claim. */
  gate: boolean;
}

/**
 * Count one scope's backing beside the floor over the files it cites.
 *
 * `backed` is every DISTINCT cited line whose grade is not `resolves`, which
 * is the same question the floor's `within` answers about a line picked at
 * random, so the two are directly comparable. `gateShaped` asks the whole
 * citation SET of each gate claim rather than its first row, which is the
 * correction research 118 §6.4 made to its own first writing.
 *
 * ## THE LINE IS COUNTED ONCE, AND THE PHASE 259 FIX ROUND IS WHY
 *
 * The first writing counted CITATIONS while the floor counted LINES, and the
 * two denominators are not the same denominator. The verifier's own plant
 * measured what that buys: one real backed line cited once reads
 * `1 of 2 backed` beside a chance share of about a quarter, and THE SAME LINE
 * CITED SIX TIMES reads `6 of 7 backed` beside the same share, because every
 * copy dilutes the one citation that was not backed. A reading could then
 * manufacture a six fold lift over the null model out of one real fact, and
 * the lift over that model is the whole number this phase exists to publish.
 * So the rate asks of each distinct `(file, line)` exactly what the floor asks
 * of each line, once, and repetition is worth nothing. A line cited by two
 * different claims is still one line: it is one place in the repository, and
 * the floor's question is about places.
 */
export function computeRate(input: {
  scope: string;
  cites: readonly RateCite[];
  floor: ArchCiteFloor;
}): ArchRateReading {
  const byGrade = emptyGradeTally();
  let backed = 0;
  let total = 0;
  const counted = new Set<string>();
  for (const cite of input.cites) {
    // JSON rather than a separator, because a path may hold any character.
    const where = JSON.stringify([cite.relPath, cite.line]);
    if (counted.has(where)) continue;
    counted.add(where);
    total += 1;
    byGrade[cite.grade] += 1;
    if (isBacked(cite.grade)) backed += 1;
  }
  const gateClaims = new Set<string>();
  const shaped = new Set<string>();
  for (const cite of input.cites) {
    if (!cite.gate) continue;
    gateClaims.add(cite.claimId);
    if (cite.grade === 'gate') shaped.add(cite.claimId);
  }
  return {
    scope: input.scope,
    backed,
    total,
    floorWithin: input.floor.within,
    floorLines: input.floor.lines,
    byGrade,
    floorByGrade: input.floor.byGrade,
    gateShaped: shaped.size,
    gateClaims: gateClaims.size
  };
}
