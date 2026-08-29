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

import type { ArchOptions, FoldHarnessOption, FoldOptions } from '@shared/fold';
import { configRowStatus } from '../../config/confirm';
import { executionFieldsOf } from '../../config/overlay';
import { currentAgentTable } from '../../config/store';
import type { MergedAgentEntry } from '../../config/overlay';
import type { FoldRecipe } from './recipes';
import { archRecipeFor, foldRecipeFor } from './recipes';

/**
 * May this agent row run RIGHT NOW under the Phase 23 gate? The one reading
 * of the gate both one shot surfaces share: the offer list asks it to draw a
 * row enabled, and the arch pass runner asks it again at the spawn, so an
 * agreement withdrawn while the app is running stops the next pass. A
 * compiled row needs no confirmation, because configuration selects from
 * choices the compiled world already contains; an overlay row runs only
 * while the gate says confirmed.
 */
export function harnessConfirmedNow(
  entry: MergedAgentEntry,
  status: typeof configRowStatus = configRowStatus
): boolean {
  if (!entry.launchable) return false;
  if (entry.source === 'builtin') return true;
  return status(entry.id, executionFieldsOf(entry)).state === 'confirmed';
}

/** The row Settings preselects when nothing has been chosen. A suggestion only. */
export const FOLD_SUGGESTED_AGENT_ID = 'claude';

/**
 * The row Settings preselects for the arch enrichment when nothing has been
 * chosen (Phase 158). A suggestion only, and nothing is applied until a
 * person picks a row. Claude, because the arch row behind that id is the
 * most measured one, is compiled rather than configured, and carries its own
 * budget fuse.
 */
export const ARCH_SUGGESTED_AGENT_ID = 'claude';

export interface FoldOptionsDeps {
  /** Injected so a test builds the list without a config file. */
  table?: typeof currentAgentTable;
  /** Injected so a test answers the confirm gate without a keystore. */
  status?: typeof configRowStatus;
  /** One sentence when folding is suspended right now. */
  suspended?: () => string | null;
  /**
   * Injected so a test drives the join over its own recipe table. The
   * defaults are the compiled tables: `foldRecipeFor` for the fold and
   * `archRecipeFor` for the arch enrichment.
   */
  recipeFor?: (agentId: string) => FoldRecipe | null;
}

/**
 * Join the three sources into the list Settings draws.
 *
 * This function starts nothing and it cannot. There is no spawn in this
 * module, and reading the confirm gate is a read of a file rather than a
 * decision to run anything.
 *
 * Phase 158 split the join out of `foldOptions` so the arch offer is the
 * SAME code over a different recipe table, rather than a second joiner that
 * drifts. `recipeFor` is the only thing that differs between the two
 * surfaces, and `suggestedAgentId` names the row each one preselects.
 */
function joinHarnessOptions(
  recipeFor: (agentId: string) => FoldRecipe | null,
  suggestedAgentId: string,
  deps: FoldOptionsDeps
): FoldOptions {
  const table = (deps.table ?? currentAgentTable)();
  const status = deps.status ?? configRowStatus;
  const harnesses: FoldHarnessOption[] = [];

  for (const entry of table) {
    if (!entry.launchable) continue;
    const recipe = recipeFor(entry.id);
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
    const confirmed = harnessConfirmedNow(entry, status);
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
    (row) => row.agentId === suggestedAgentId && row.available
  );
  return {
    harnesses,
    suggestedAgentId: suggested === undefined ? null : suggested.agentId,
    suspended: (deps.suspended ?? ((): string | null => null))()
  };
}

/** The fold offer: the join above over the fold recipe table. */
export function foldOptions(deps: FoldOptionsDeps = {}): FoldOptions {
  return joinHarnessOptions(
    deps.recipeFor ?? foldRecipeFor,
    FOLD_SUGGESTED_AGENT_ID,
    deps
  );
}

/**
 * The arch enrichment offer (Phase 158): the same join over the compiled
 * ARCH recipe table. A row is offered only when the agent table has the
 * agent, the Phase 23 confirm gate allows the row, and Tortie has a measured
 * arch recipe for it. Everything else arrives disabled with its reason, so a
 * person looking for an agent reads why the row cannot be picked rather than
 * wondering. Reading this list starts nothing, exactly as the fold's does
 * not: the pass runs only from a person's gesture in the Architecture view,
 * and the gate is re-read at spawn as well.
 */
export function archOptions(deps: FoldOptionsDeps = {}): ArchOptions {
  return joinHarnessOptions(
    deps.recipeFor ?? archRecipeFor,
    ARCH_SUGGESTED_AGENT_ID,
    deps
  );
}
