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

/**
 * Why one row cannot be picked (Phase 138.1).
 *
 * Main names the reason and the renderer writes the words. Phase 138 sent a
 * finished sentence per row instead, and the page then drew ten near identical
 * paragraphs, one per agent with no recipe. A token lets the page gather every
 * row with the same reason onto one line, and it keeps every user facing
 * string in the renderer's own copy file where the copy rules test reads them.
 */
export type FoldUnavailableReason = 'not-measured' | 'not-confirmed';

/** One harness row as Settings draws it. */
export interface FoldHarnessOption {
  agentId: string;
  agentLabel: string;
  models: FoldModelOption[];
  suggestedModel: string | null;
  /** False when Tortie has no measured recipe, or the confirm gate refuses it. */
  available: boolean;
  /** Why the row cannot be picked. Null when the row can be picked. */
  reason: FoldUnavailableReason | null;
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

/**
 * The offer Settings draws for the arch enrichment (Phase 158). The SAME
 * joined shape as the fold's, because the question is the same: which agents
 * on this machine may run a one shot pass, and which models each one exposes.
 * The join happens once, in src/main/overview/fold/options.ts, against the
 * arch recipe table instead of the fold's, and the renderer never assembles
 * either list. A row with no measured arch recipe arrives disabled with the
 * same reason tokens the fold uses.
 */
export type ArchOptions = FoldOptions;
