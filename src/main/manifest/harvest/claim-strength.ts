/**
 * How strongly a conversation claim is held, and who is allowed to take it
 * (Phase 34, extending Phase 32's ladder from two rungs to three).
 *
 * WHY THIS IS ITS OWN MODULE. Phase 32 decided strength from one fact, being
 * whether a grace timer accepted the record. Everything else was claimed
 * 'confirmed', and a confirmed claim is immovable. That was wrong for every
 * agent whose key is a FOLDER rather than an identity. Two CodeWhale panes
 * started in one folder both confirm the same record, because the only
 * ownership field the record carries is the folder they share. The first
 * watch to see it took an immovable claim on a record that may be the other
 * pane's, and the rightful session was then starved for the whole six hour
 * harvest window with nothing able to correct it.
 *
 * Strength now follows the KEY. The rule and the identity key set live here,
 * in one file with no I/O and no Electron, because two other places read the
 * same fact and must not drift from it: the claim map in ./watch.ts decides
 * who may take an id, and `deriveResumeConfidence` in ../agents.ts decides
 * what the manifest row may claim about it. They are two readings of one fact
 * about a key.
 *
 * Ownership: src/main/manifest/**. Pure (no I/O, no Electron, no timers).
 */

import type { AgentHarvestKey } from '../../agents/registry';

/**
 * The three rungs, weakest first.
 *
 *  - 'provisional'. A grace timer accepted the record. Nothing confirmed it,
 *    whatever the key would have been worth. Also the boot claim of a row
 *    whose persisted provenance says a grace timer accepted its id.
 *  - 'matched'. A non identity key returned 'match', e.g. the record names
 *    the folder this pane was launched in. That is real evidence and it is
 *    not proof of ownership, because a second pane in that folder produces
 *    the same verdict.
 *  - 'confirmed'. An identity key returned 'match', or a caller asserted it
 *    (the boot claim of a row whose id was never a guess, e.g. one Tortie
 *    pre-assigned). It is immovable, and nothing takes a confirmed claim.
 */
export type ClaimStrength = 'provisional' | 'matched' | 'confirmed';

/**
 * The keys that are a true identity, so a second candidate cannot be this
 * pane's session.
 *
 *  - 'tmux-pane'. The agent stamps the pane it runs in, and Tortie spawned
 *    that pane. Two muse sessions in one directory stay separable.
 *  - 'pid'. The record's pid is a descendant of the pane pid.
 *  - 'fd-owner'. An agent process descended from the pane holds open
 *    descriptors inside the record's directory (Phase 32). Two agy sessions
 *    in one directory stay separable, because each pane's own process holds
 *    only its own conversation open.
 *
 * Everything else ('cwd-newest', 'sqlite-index', 'time-only') keys on the
 * DIRECTORY or on nothing, and a directory is not an identity: two sessions
 * of one agent started in one directory both match, and only their timing
 * separates them. That is the case G6 names, and it is why rivals matter.
 */
export const IDENTITY_HARVEST_KEYS: ReadonlySet<AgentHarvestKey> =
  new Set<AgentHarvestKey>(['tmux-pane', 'pid', 'fd-owner']);

/** The strength an acceptance may claim, from the key and the timer. */
export function claimStrengthForKey(
  key: AgentHarvestKey,
  viaGraceTimer: boolean
): ClaimStrength {
  if (viaGraceTimer) return 'provisional';
  return IDENTITY_HARVEST_KEYS.has(key) ? 'confirmed' : 'matched';
}

/** The ladder as a number, so comparisons are one expression. */
export function claimRank(strength: ClaimStrength): 1 | 2 | 3 {
  switch (strength) {
    case 'provisional':
      return 1;
    case 'matched':
      return 2;
    case 'confirmed':
      return 3;
  }
}

/** One side of a takeover question: how it is held, and from which folder. */
export interface ClaimStanding {
  strength: ClaimStrength;
  /**
   * The launch folder of the session.
   *
   * It is compared as a STRING, so the caller resolves it first. One physical
   * folder has more than one spelling on macOS, and a pane that spells its
   * folder `/tmp/proj` was measured taking the claim of a pane that spells
   * the same folder `/private/tmp/proj`. `resolveClaimCwd` in ./watch.ts is
   * the one resolver, and every folder that reaches the claim map goes
   * through it. This module stays pure and does no lookup of its own.
   */
  cwd?: string | undefined;
}

/**
 * May `winner` take the id `held` currently has?
 *
 * TWO RULES, and they are the whole of Phase 34.
 *
 * 1. Strictly higher rank only. Equal never takes equal, so two folder
 *    matches never trade an id back and forth and two grace guesses never do
 *    either. Grace is rank 1, so grace can never steal, which is Phase 32's
 *    rule and it is unchanged.
 * 2. A rank 2 winner taking a rank 1 holder has one extra condition, being
 *    that the holder was watching a DIFFERENT folder. The winner's evidence
 *    is that the record names the winner's folder. When the loser is
 *    elsewhere, that proves the loser cannot own the record. When the loser
 *    is in the SAME folder, the evidence says nothing about which of the two
 *    owns it, and taking the id would sometimes steal a correct guess. When
 *    either folder is unknown, the transfer is refused, which leaves the
 *    status quo.
 *
 * A rank 3 winner needs no such condition. An identity key proves ownership
 * outright, which is what 'tmux-pane', 'pid' and 'fd-owner' mean.
 */
export function mayTakeOver(winner: ClaimStanding, held: ClaimStanding): boolean {
  const win = claimRank(winner.strength);
  const hold = claimRank(held.strength);
  if (win <= hold) return false;
  if (win === 3) return true;
  if (winner.cwd === undefined || held.cwd === undefined) return false;
  return winner.cwd !== held.cwd;
}
