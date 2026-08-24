/**
 * Where the fold is joined to the rest of the product (Phase 138).
 *
 * The scheduler in src/main/overview/fold is written against an interface and
 * knows nothing about the manifest, the settings file or the overview store.
 * This module is the one place those are handed to it, so the scheduler stays
 * testable with no Electron, no keystore and no SQLite file, and core.ts gains
 * six lines rather than sixty.
 *
 * It also holds the one live scheduler, so `fold:options` can say in one
 * sentence that folding is suspended. That is a READ of a string. Nothing in
 * this file can start a process on its own: the only thing that ever does is
 * a session finishing a turn.
 */

import { foldIsChosen } from '@shared/settings';
import { getSettings } from '../settings/store';
import type { ManifestSessionRecord, ManifestStore } from '../manifest';
import {
  foldInputHash,
  FoldScheduler,
  FOLD_SYSTEM_PROMPT,
  foldRecipeFor,
  overviewStore,
  refreshSessionForFold,
  type FoldInput,
  type FoldSchedulerDeps
} from '../overview';

export { FoldScheduler } from '../overview';

/** The live scheduler, or null before boot and after dispose. */
let live: FoldScheduler | null = null;

export function setLiveFoldScheduler(scheduler: FoldScheduler | null): void {
  live = scheduler;
}

/** One sentence when folding is suspended, null otherwise. A read, never a start. */
export function foldSuspension(): string | null {
  return live?.suspension() ?? null;
}

/**
 * Has a person picked an agent to write the project line?
 *
 * The Catch Me Up read path asks this before it draws a written sentence, so
 * picking None brings Phase 137's built line straight back on the next read
 * rather than only stopping new folds. It is a read of the sealed settings
 * value and it starts nothing.
 */
export function foldChosenNow(): boolean {
  return foldIsChosen(getSettings().fold);
}

export interface FoldWiringInput {
  manifest: ManifestStore;
  openProjectPaths(): ReadonlySet<string>;
}

/**
 * Everything the scheduler needs, read from the product.
 *
 * `prepare` is the only expensive member and it runs BEFORE any spawn. It
 * brings the session's stored turns up to date through the same read path the
 * page uses, so what the fold sends has been through Phase 137's redaction,
 * then takes the turns above the newest summary row's `to_turn`.
 *
 * `from_turn` is one above the newest row's `to_turn` whatever that row's
 * verdict was, so a refused fold does not make the next fold re-send the same
 * turns forever. The cost is that the turns in a refused fold are never
 * summarized, and gate two's control run says that costs nothing measurable.
 */
export function foldSchedulerDepsFor(input: FoldWiringInput): FoldSchedulerDeps {
  const store = (): ReturnType<typeof overviewStore> => overviewStore();
  return {
    choice: () => getSettings().fold,
    session: (sessionId: string): ManifestSessionRecord | null =>
      input.manifest.getSession(sessionId) ?? null,
    openProjectPaths: input.openProjectPaths,
    prepare: async (sessionId: string): Promise<FoldInput | null> => {
      const refreshed = await refreshSessionForFold(
        {
          manifest: () => Promise.resolve(input.manifest),
          store
        },
        sessionId
      );
      if (refreshed === null) return null;
      const db = store();
      const newest = db.latestSummary(sessionId);
      const kept = db.latestKeptSummary(sessionId);
      const floor = newest === null ? -1 : newest.toTurn;
      const newTurns = refreshed.turns.filter(
        (turn) => turn.index > floor && turn.closed
      );
      if (newTurns.length === 0) return null;
      return {
        sessionId,
        previousSummary: kept?.text ?? null,
        previousVersion: kept?.version ?? null,
        newTurns,
        previousInputHash: newest?.inputHash ?? null,
        providerMapVersion: refreshed.providerMapVersion
      };
    },
    append: (row) => {
      store().appendSummary(row);
    }
  };
}

/**
 * The hash of one fold's inputs, exported so a probe and the conformance gate
 * can recompute it from a stored range without reaching into the scheduler.
 */
export function foldHashFor(input: {
  agentId: string;
  model: string;
  prompt: string;
}): string | null {
  const recipe = foldRecipeFor(input.agentId);
  if (recipe === null) return null;
  return foldInputHash({
    recipeAgentId: recipe.agentId,
    recipeVersion: recipe.version,
    model: input.model,
    systemPrompt: FOLD_SYSTEM_PROMPT,
    prompt: input.prompt
  });
}
