/**
 * The fold (Phase 138): one small model writes the one line the project view
 * draws for each session, and Phase 137's built line is what stands when no
 * model has written one.
 *
 * Five modules and one rule each.
 * - recipes.ts holds the compiled one shot recipes, as data.
 * - compose.ts builds the prompt from the previous summary and the new turns.
 * - spawn.ts runs the CLI. It is the only path to a model and there is no
 *   http client anywhere under this directory.
 * - validate.ts rules on the sentence. It is mechanical rather than a line in
 *   a prompt.
 * - scheduler.ts turns a turn boundary into a fold, and drops most of them.
 *
 * THE THREE REFUSALS THIS DIRECTORY HOLDS. Bound C, being that the only path
 * to a model is a CLI the person confirmed. The model writes one line on one
 * view. And nothing here may set a session's status.
 *
 * There is no setInterval in this directory and the one setTimeout is the
 * scheduler's settle timer, so an idle session costs nothing.
 */

export {
  composeFoldPrompt,
  foldInputHash,
  FOLD_ANSWER_MAX_CHARS,
  FOLD_ASK_MAX_CHARS,
  FOLD_NO_ANSWER_ON_RECORD,
  FOLD_NO_EARLIER_SUMMARY,
  FOLD_PROMPT_MAX_BYTES,
  FOLD_SYSTEM_PROMPT
} from './compose';
export type { FoldComposition } from './compose';

export { foldOptions, FOLD_SUGGESTED_AGENT_ID } from './options';
export type { FoldOptionsDeps } from './options';

export {
  foldRecipeAgentIds,
  foldRecipeFor,
  recipeHasModel
} from './recipes';
export type { FoldRecipe } from './recipes';

export {
  outcomeForError,
  readFoldStream,
  runFold,
  setFoldBinaryOverride,
  windowSuspends,
  FOLD_BLIND_SUSPEND_MS,
  FOLD_SUSPEND_UTILIZATION
} from './spawn';
export type {
  FoldBinaryOverride,
  FoldOutcome,
  FoldRateWindow,
  FoldRun,
  FoldSpawnDeps,
  FoldSpawnInput
} from './spawn';

export {
  FoldScheduler,
  FOLD_FAILURES_BEFORE_SUSPEND,
  FOLD_MAX_IN_FLIGHT,
  FOLD_MIN_INTERVAL_MS,
  FOLD_SETTLE_MS
} from './scheduler';
export type {
  FoldCounts,
  FoldInput,
  FoldPrepared,
  FoldSchedulerDeps,
  FoldSkipReason
} from './scheduler';

export {
  validateFoldText,
  FOLD_QUOTE_WINDOW,
  FOLD_REFUSALS,
  FOLD_REFUSAL_REASONS,
  FOLD_TEXT_MAX_CHARS
} from './validate';
export type { FoldRefusal, FoldValidation } from './validate';
