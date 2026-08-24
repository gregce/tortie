/**
 * The fold's wire types (Phase 138).
 *
 * Settings offers the harnesses that can write the project line and the
 * models each one exposes. The list is built in main and handed over one
 * channel, because three separate sources decide whether a row may be
 * picked: the merged agent table, the Phase 23 confirm gate, and the
 * compiled table of one shot recipes Tortie has actually measured. The
 * renderer never assembles that list and never carries a hardcoded copy of
 * it.
 *
 * Nothing here carries a key, an endpoint or an argv. The only network path
 * is main spawning a CLI the person confirmed, which is bound C.
 */

/** One model a harness exposes for the fold. */
export interface FoldModelOption {
  id: string;
  label: string;
}

/** One harness row as Settings draws it. */
export interface FoldHarnessOption {
  agentId: string;
  agentLabel: string;
  models: FoldModelOption[];
  suggestedModel: string | null;
  /** False when Tortie has no measured recipe, or the confirm gate refuses it. */
  available: boolean;
  /** One sentence saying why it cannot be picked. Null when it can. */
  reason: string | null;
  /** The ISO date the flags behind this row were measured. */
  measuredOn: string | null;
}

export interface FoldOptions {
  harnesses: FoldHarnessOption[];
  /** The row Settings preselects when nothing is chosen. Never applied on its own. */
  suggestedAgentId: string | null;
  /** One sentence when folding is suspended, null otherwise. */
  suspended: string | null;
}
