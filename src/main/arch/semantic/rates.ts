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
  grade: ArchCiteGrade;
  /** True when the claim it belongs to is a GATE claim. */
  gate: boolean;
}

/**
 * Count one scope's backing beside the floor over the files it cites.
 *
 * `backed` is every citation whose grade is not `resolves`, which is the same
 * question the floor's `within` answers about a line picked at random, so the
 * two are directly comparable. `gateShaped` asks the whole citation SET of
 * each gate claim rather than its first row, which is the correction research
 * 118 §6.4 made to its own first writing.
 */
export function computeRate(input: {
  scope: string;
  cites: readonly RateCite[];
  floor: ArchCiteFloor;
}): ArchRateReading {
  const byGrade = emptyGradeTally();
  let backed = 0;
  for (const cite of input.cites) {
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
    total: input.cites.length,
    floorWithin: input.floor.within,
    floorLines: input.floor.lines,
    byGrade,
    floorByGrade: input.floor.byGrade,
    gateShaped: shaped.size,
    gateClaims: gateClaims.size
  };
}
