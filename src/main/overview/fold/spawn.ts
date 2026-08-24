/**
 * The one shot spawn (Phase 138).
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
 */

import { runGuarded } from '../../proc/guarded';
import { getUserPath, resolveBinary } from '../../tmux/resolve';
import type { FoldRecipe } from './recipes';

/** How one fold ended, before the validator has seen anything. */
export type FoldOutcome =
  | 'ok'
  | 'refused'
  | 'timed-out'
  | 'rate-limited'
  | 'overloaded'
  | 'spawn-failed'
  | 'bad-output';

/**
 * The live rate window, read from the CLI's own `rate_limit_event` message.
 * Gate one proved this message arrives on every invocation, before the result.
 */
export interface FoldRateWindow {
  status: string;
  limitType: string;
  utilization: number;
  resetsAtMs: number | null;
}

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
   * person.
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
  now?(): number;
}

/**
 * The utilization at or above which folding suspends. Gate one never reached
 * a rate limit at 1,878 times the operator's fleet rate, and his own window
 * sat at 0.33 throughout, so this is the untested condition the suspension
 * rule exists for.
 */
export const FOLD_SUSPEND_UTILIZATION = 0.9;

/** The status the CLI reports when nothing is wrong and a warning is informational. */
const ALLOWED_WARNING = 'allowed_warning';

/** How long a suspension lasts when a refusal names no reset time. */
export const FOLD_BLIND_SUSPEND_MS = 15 * 60_000;

// ---------------------------------------------------------------------------
// The stream parse. Two messages matter and everything else is ignored.
// ---------------------------------------------------------------------------

interface StreamReading {
  window: FoldRateWindow | null;
  resultText: string | null;
  isError: boolean;
  subtype: string | null;
  apiErrorStatus: number | null;
  costUsd: number | null;
  sawResult: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Milliseconds from either an epoch seconds number or an ISO string. */
function asResetMs(value: unknown): number | null {
  const num = asNumber(value);
  if (num !== null) return num > 1e11 ? num : num * 1_000;
  const text = asString(value);
  if (text === null) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * The window, read out of whichever member carries it.
 *
 * MEASURED ON 2026-08-23 rather than guessed. The CLI writes the message as
 * `{"type":"rate_limit_event","rate_limit_info":{"status":"allowed_warning",
 * "resetsAt":1788076800,"rateLimitType":"seven_day","utilization":0.36}}`, so
 * the payload is nested under `rate_limit_info` and its keys are camel case.
 * The snake case names and the outer position are kept beside them because a
 * CLI upgrade may move it back, and reading both costs one property lookup.
 */
function readRateWindow(message: Record<string, unknown>): FoldRateWindow | null {
  const event =
    asRecord(message['rate_limit_info']) ??
    asRecord(message['rate_limit_event']) ??
    message;
  const status = asString(event['status']);
  if (status === null) return null;
  return {
    status,
    limitType:
      asString(event['rateLimitType']) ??
      asString(event['limit_type']) ??
      asString(event['limitType']) ??
      '',
    utilization:
      asNumber(event['utilization']) ?? asNumber(event['used_percent']) ?? 0,
    resetsAtMs:
      asResetMs(event['resetsAt']) ??
      asResetMs(event['resets_at']) ??
      asResetMs(event['unified_rate_limit_reset']) ??
      null
  };
}

/**
 * Read the stream of JSON lines. Two of them matter: the `rate_limit_event`
 * carries the live window state, and the `result` carries the sentence, the
 * error shape and the reported cost. Every other line is ignored, including
 * every line that is not JSON at all, because a CLI is free to print a notice.
 */
export function readFoldStream(stdout: string): StreamReading {
  const out: StreamReading = {
    window: null,
    resultText: null,
    isError: false,
    subtype: null,
    apiErrorStatus: null,
    costUsd: null,
    sawResult: false
  };
  for (const line of stdout.split('\n')) {
    const text = line.trim();
    if (text === '' || !text.startsWith('{')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      continue;
    }
    const message = asRecord(parsed);
    if (message === null) continue;
    const type = asString(message['type']);
    if (
      type === 'rate_limit_event' ||
      message['rate_limit_info'] !== undefined ||
      message['rate_limit_event'] !== undefined
    ) {
      const window = readRateWindow(message);
      if (window !== null) out.window = window;
      if (type === 'rate_limit_event') continue;
    }
    if (type !== 'result') continue;
    out.sawResult = true;
    out.resultText = asString(message['result']);
    out.isError = message['is_error'] === true;
    out.subtype = asString(message['subtype']);
    out.apiErrorStatus =
      asNumber(message['api_error_status']) ??
      asNumber(message['apiErrorStatus']);
    out.costUsd =
      asNumber(message['total_cost_usd']) ?? asNumber(message['totalCostUsd']);
  }
  return out;
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
  const run = await runGuarded(
    binary,
    input.recipe.argv({
      prompt: input.prompt,
      model: input.model,
      systemPrompt: input.systemPrompt
    }),
    {
      timeoutMs: input.recipe.timeoutMs,
      maxOutputBytes: 512 * 1024,
      env: { ...process.env, PATH: pathValue, ...input.recipe.env }
    }
  );

  if (run.spawnError !== null) {
    return done({ outcome: 'spawn-failed', reason: run.spawnError });
  }
  const reading = readFoldStream(run.stdout);
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
  if (!reading.sawResult || reading.resultText === null) {
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
    text: reading.resultText,
    window: reading.window,
    costUsd: reading.costUsd
  });
}
