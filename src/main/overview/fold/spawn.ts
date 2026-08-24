/**
 * The one shot spawn (Phase 138, widened in Phase 138.1).
 *
 * PHASE 138.1 MOVED THREE THINGS OFF THIS FILE AND ONTO THE RECIPE, because
 * every one of them was claude shaped and blocked every other agent. The
 * parse is now `recipe.read`, in ./readers.ts. The environment is now a
 * function, because one recipe needs the fold's own directory in a variable.
 * And the instruction goes on a flag or at the head of the prompt, whichever
 * that agent's CLI measured cheaper. What stayed here is the part that is the
 * same for all five: resolve the binary, run it once in Tortie's own
 * directory, and never throw.
 *
 * BOUND C IS NOT AMENDABLE AND THIS FILE IS WHERE IT IS HELD. Tortie holds no
 * API key and reaches no endpoint Tortie owns. The only path a fold has to a
 * model is spawning a CLI the person has personally confirmed, as a separate
 * one shot process. There is no http client in this directory and there never
 * will be one.
 *
 * The child runs through runGuarded, which is the helper the product already
 * uses for a short lived child that answers a question. It always settles, it
 * always reaps by process group, and it is already reaped on before-quit, so a
 * fold in flight when a person quits cannot become tomorrow's orphan.
 *
 * The binary is resolved to an absolute path. The Phase 12.7 F3 rule about
 * launching agents by bare name is about DURABLE tmux panes, whose argv[0] a
 * person may later match with pkill. This is a short lived child of the main
 * process and it is not that, so the absolute path is right here.
 *
 * The child's environment carries the login shell PATH, for the same reason
 * the version probe passes one: a node shebang CLI needs a real PATH to find
 * its interpreter.
 *
 * The child also runs in the fold's own directory rather than in whatever the
 * main process happens to be sitting in. See ./home.ts for the measurement
 * that made that necessary.
 */

import { runGuarded } from '../../proc/guarded';
import { getUserPath, resolveBinary } from '../../tmux/resolve';
import { foldHome } from './home';
import type { FoldRateWindow } from './readers';
import {
  readClaudeStream,
  readCodexJson,
  readCursorJson,
  readGrokJson,
  readPiNdjson
} from './readers';
import type { FoldRecipe } from './recipes';

export type { FoldRateWindow, FoldReading } from './readers';
export {
  readClaudeStream,
  readCodexJson,
  readCursorJson,
  readGrokJson,
  readPiNdjson
};

/**
 * The claude reader under the name Phase 138 gave it. Kept so a caller that
 * asks for the stream parse by its old name still gets it, and so the export
 * surface of this module did not move under a phase that only widened it.
 */
export const readFoldStream = readClaudeStream;

/** How one fold ended, before the validator has seen anything. */
export type FoldOutcome =
  | 'ok'
  | 'refused'
  | 'timed-out'
  | 'rate-limited'
  | 'overloaded'
  | 'spawn-failed'
  | 'bad-output';

export interface FoldRun {
  outcome: FoldOutcome;
  /** The candidate sentence. Null on every outcome except 'ok'. */
  text: string | null;
  /** One short name for what went wrong. Null when nothing did. */
  reason: string | null;
  window: FoldRateWindow | null;
  wallMs: number;
  /**
   * What the CLI reported this cost. Recorded for diagnostics and NEVER
   * drawn. Gate one found a 2.66 times price spread over 117 folds with byte
   * identical token counts, so the number is not reliable enough to show a
   * person. Three of the five recipes report no figure at all, being codex,
   * cursor and, on a refusal, claude.
   */
  costUsd: number | null;
}

export interface FoldSpawnInput {
  recipe: FoldRecipe;
  model: string;
  systemPrompt: string;
  prompt: string;
}

export interface FoldSpawnDeps {
  /** Resolve a bare binary name to an absolute path. */
  resolve?(bin: string): Promise<string | null>;
  /** The login shell PATH the child gets. */
  path?(): Promise<string>;
  /** Tortie's own directory for this fold. Injected so a test names its own. */
  home?(): string;
  now?(): number;
}

/**
 * The utilization at or above which folding suspends. Gate one never reached
 * a rate limit at 1,878 times the operator's fleet rate, and his own window
 * sat at 0.33 throughout, so this is the untested condition the suspension
 * rule exists for.
 *
 * Only claude reports a window. Under the other four recipes the suspension
 * rests on the three consecutive failure rule alone, and that is a limit
 * rather than an oversight.
 */
export const FOLD_SUSPEND_UTILIZATION = 0.9;

/** The status the CLI reports when nothing is wrong and a warning is informational. */
const ALLOWED_WARNING = 'allowed_warning';

/** How long a suspension lasts when a refusal names no reset time. */
export const FOLD_BLIND_SUSPEND_MS = 15 * 60_000;

/**
 * The prompt the child actually receives.
 *
 * A recipe whose CLI has a working system prompt flag gets the prompt alone
 * and the instruction on the flag. A recipe whose CLI has no such flag, or
 * whose flag costs more than it saves, gets the instruction at the head of
 * the prompt instead. grok is the measured case and the reason is written on
 * its row in ./recipes.ts.
 */
export function foldPromptFor(input: FoldSpawnInput): string {
  if (input.recipe.systemPromptMode === 'flag') return input.prompt;
  return `${input.systemPrompt}\n\n${input.prompt}`;
}

/**
 * Which outcome an error shape means.
 *
 * Gate one never hit a rate limit at 1,878 times the fleet rate, so this is
 * read from the CLI itself and from a deliberately provoked budget error
 * rather than from an observed refusal. The shape is right and the exact text
 * of a real usage limit refusal in print mode is unverified, which is said
 * here rather than hidden.
 */
export function outcomeForError(
  subtype: string | null,
  apiErrorStatus: number | null
): { outcome: FoldOutcome; reason: string } {
  const name = (subtype ?? '').toLowerCase();
  if (name.includes('max_budget')) {
    return { outcome: 'refused', reason: 'over-budget' };
  }
  // A 529 is the server limiting requests for a moment. It is NOT a person's
  // usage limit and it must never suspend folding.
  if (apiErrorStatus === 529 || name.includes('overloaded')) {
    return { outcome: 'overloaded', reason: 'overloaded' };
  }
  if (apiErrorStatus === 429 || name.includes('rate_limit')) {
    return { outcome: 'rate-limited', reason: 'rate-limited' };
  }
  return { outcome: 'refused', reason: name === '' ? 'error' : name };
}

/** Does this window say folding should stop for now? */
export function windowSuspends(window: FoldRateWindow | null): boolean {
  if (window === null) return false;
  if (window.utilization >= FOLD_SUSPEND_UTILIZATION) return true;
  return window.status !== ALLOWED_WARNING;
}

// ---------------------------------------------------------------------------
// The spawn
// ---------------------------------------------------------------------------

/**
 * The harness only binary override. Read through one function so the two
 * refusals live in ../../harness/fold-stub.ts and this file has no idea what
 * a harness is beyond calling it.
 */
export type FoldBinaryOverride = () => string | null;

let overrideHook: FoldBinaryOverride = () => null;

/** Installed once at boot by the harness. Not called in an ordinary launch. */
export function setFoldBinaryOverride(hook: FoldBinaryOverride): void {
  overrideHook = hook;
}

/**
 * Run one fold. Never throws: the caller branches on `outcome`, which keeps
 * a failed fold out of the exception path where it would be swallowed.
 */
export async function runFold(
  input: FoldSpawnInput,
  deps: FoldSpawnDeps = {}
): Promise<FoldRun> {
  const now = deps.now ?? ((): number => Date.now());
  const startedAt = now();
  const done = (partial: Partial<FoldRun>): FoldRun => ({
    outcome: 'ok',
    text: null,
    reason: null,
    window: null,
    wallMs: now() - startedAt,
    costUsd: null,
    ...partial
  });

  const binaryName = input.recipe.binaryName ?? input.recipe.agentId;
  const override = overrideHook();
  const resolveOne = deps.resolve ?? ((bin: string) => resolveBinary(bin));
  const binary = override ?? (await resolveOne(binaryName));
  if (binary === null) {
    return done({ outcome: 'spawn-failed', reason: 'no-binary' });
  }

  const pathValue = await (deps.path ?? getUserPath)();
  // EVERY FOLD RUNS IN TORTIE'S OWN DIRECTORY. Research 64 measured that each
  // agent keys its history on the directory it was started in, so a fold that
  // inherited the main process working directory would write a transcript
  // into whatever that happened to be. In a packaged build that is the root
  // of the disk. See ./home.ts.
  const home = (deps.home ?? foldHome)();
  const run = await runGuarded(
    binary,
    input.recipe.argv({
      prompt: foldPromptFor(input),
      model: input.model,
      systemPrompt: input.systemPrompt,
      foldHome: home
    }),
    {
      timeoutMs: input.recipe.timeoutMs,
      maxOutputBytes: 512 * 1024,
      cwd: home,
      env: {
        ...process.env,
        PATH: pathValue,
        ...input.recipe.env({ foldHome: home })
      }
    }
  );

  if (run.spawnError !== null) {
    return done({ outcome: 'spawn-failed', reason: run.spawnError });
  }
  const reading = input.recipe.read(run.stdout);
  if (run.timedOut) {
    return done({
      outcome: 'timed-out',
      reason: 'timed-out',
      window: reading.window
    });
  }
  if (reading.isError) {
    const { outcome, reason } = outcomeForError(
      reading.subtype,
      reading.apiErrorStatus
    );
    return done({ outcome, reason, window: reading.window, costUsd: reading.costUsd });
  }
  if (!reading.sawResult || reading.text === null) {
    return done({
      outcome: 'bad-output',
      reason: run.code === 0 ? 'no-result' : `exit-${String(run.code)}`,
      window: reading.window
    });
  }
  if (run.code !== 0) {
    return done({
      outcome: 'bad-output',
      reason: `exit-${String(run.code)}`,
      window: reading.window,
      costUsd: reading.costUsd
    });
  }
  return done({
    outcome: 'ok',
    text: reading.text,
    window: reading.window,
    costUsd: reading.costUsd
  });
}
