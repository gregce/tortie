/**
 * What Settings offers for the fold (Phase 138).
 *
 * The list is built HERE, in main, and handed over one channel. It is never
 * assembled in the renderer and it is never a hardcoded array in a component,
 * because two of the three things it joins live in main and one of them is a
 * confirm gate that a renderer must not be asked to reason about.
 *
 * The three sources, and a row is offered only when all three agree:
 * - the merged agent table, being every agent row on this machine
 * - the Phase 23 confirm gate, being whether a configured row may run at all
 * - the compiled recipe table, being whether Tortie has measured a one shot
 *   recipe for that agent and which models it exposes
 *
 * A row with no compiled recipe is SHOWN AND DISABLED, carrying the reason it
 * cannot be picked. It is shown rather than hidden, because a person looking
 * for codex should read why it is absent rather than wonder.
 *
 * MAIN NAMES THE REASON AND THE RENDERER WRITES THE WORDS (Phase 138.1). This
 * module used to compose a finished sentence per row, and the page then drew
 * one paragraph per agent with no recipe, ten of them on the operator's Mac.
 * The reason is now a token, so the page gathers every row that shares one
 * onto a single line.
 *
 * Phase 23's boundary decides the confirm half. A compiled row needs no
 * confirmation, because configuration selects from choices the compiled world
 * already contains. An overlay row is offered only when the gate says
 * confirmed, and the state is re-read at every spawn as well, so an agreement
 * withdrawn while the app is running stops the next fold.
 */

import type { FoldHarnessOption, FoldOptions } from '@shared/fold';
import { configRowStatus } from '../../config/confirm';
import { executionFieldsOf } from '../../config/overlay';
import { currentAgentTable } from '../../config/store';
import { foldRecipeFor } from './recipes';

/** The row Settings preselects when nothing has been chosen. A suggestion only. */
export const FOLD_SUGGESTED_AGENT_ID = 'claude';

export interface FoldOptionsDeps {
  /** Injected so a test builds the list without a config file. */
  table?: typeof currentAgentTable;
  /** Injected so a test answers the confirm gate without a keystore. */
  status?: typeof configRowStatus;
  /** One sentence when folding is suspended right now. */
  suspended?: () => string | null;
}

/**
 * Join the three sources into the list Settings draws.
 *
 * This function starts nothing and it cannot. There is no spawn in this
 * module, and reading the confirm gate is a read of a file rather than a
 * decision to run anything.
 */
export function foldOptions(deps: FoldOptionsDeps = {}): FoldOptions {
  const table = (deps.table ?? currentAgentTable)();
  const status = deps.status ?? configRowStatus;
  const harnesses: FoldHarnessOption[] = [];

  for (const entry of table) {
    if (!entry.launchable) continue;
    const recipe = foldRecipeFor(entry.id);
    if (recipe === null) {
      harnesses.push({
        agentId: entry.id,
        agentLabel: entry.displayName,
        models: [],
        suggestedModel: null,
        available: false,
        reason: 'not-measured',
        measuredOn: null
      });
      continue;
    }
    const confirmed =
      entry.source === 'builtin' ||
      status(entry.id, executionFieldsOf(entry)).state === 'confirmed';
    harnesses.push({
      agentId: entry.id,
      agentLabel: entry.displayName,
      models: recipe.models.map((model) => ({ ...model })),
      suggestedModel: recipe.suggestedModel,
      available: confirmed,
      reason: confirmed ? null : 'not-confirmed',
      measuredOn: recipe.measuredOn
    });
  }

  // The rows Tortie can actually use come first, then the rest, and each
  // group keeps the agent table's own order.
  harnesses.sort((a, b) => Number(b.available) - Number(a.available));

  const suggested = harnesses.find(
    (row) => row.agentId === FOLD_SUGGESTED_AGENT_ID && row.available
  );
  return {
    harnesses,
    suggestedAgentId: suggested === undefined ? null : suggested.agentId,
    suspended: (deps.suspended ?? ((): string | null => null))()
  };
}
