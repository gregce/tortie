/**
 * The two response parsers (Phase 181), written to the bytes measured on
 * 2026-08-31 and recorded in docs/research/72 section 8, never to section 3,
 * where the two differ. The wire is the authority.
 *
 * Both parsers are PURE and take `unknown`. They read the fields they name
 * and drop everything else whole, which is the only posture that survives a
 * vendor moving a key: the Claude body carried eleven present-and-null top
 * level keys with code names for buckets that account does not have, and that
 * set will move without notice.
 *
 * WHAT THE CODEX PARSER DELIBERATELY NEVER TOUCHES: `email`, `user_id` and
 * `account_id`, which the Codex body carries at its top level. It reads
 * `rate_limit` and nothing else, so no identifier can reach the snapshot by
 * accident.
 */

import type { UsageWindow } from '@shared/usage';
import { clampUsagePercent } from '@shared/usage';

/** What one parse yields. Every field may be null; nothing is invented. */
export interface ParsedUsage {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  scoped: (UsageWindow & { label: string }) | null;
}

export const EMPTY_PARSE: ParsedUsage = {
  fiveHour: null,
  sevenDay: null,
  scoped: null
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------

/**
 * An ISO 8601 instant to milliseconds, or null.
 *
 * `resets_at` is a STRING with microseconds and an explicit `+00:00` offset,
 * measured, and it is neither seconds nor milliseconds. A window object can
 * also be present with `resets_at: null` (the measured body carried exactly
 * that on a populated window at 0 percent), so null in is null out and never
 * a throw.
 */
export function isoToMs(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : at;
}

/**
 * One Claude window object.
 *
 * The percentage field is `utilization`, a FLOAT on a 0 to 100 scale.
 * `used_percentage` does not exist in a live response; research 72 section 3
 * inferred it from orca's defensive code. It is tolerated here as a second
 * chance and invented nowhere.
 */
export function claudeWindow(raw: unknown): UsageWindow | null {
  const obj = asRecord(raw);
  if (obj === null) return null;
  const percent =
    clampUsagePercent(obj['utilization']) ??
    clampUsagePercent(obj['used_percentage']);
  if (percent === null) return null;
  return { percent, resetsAt: isoToMs(obj['resets_at']) };
}

/**
 * The per model weekly row, which exists ONLY inside `limits[]`.
 *
 * It is the row whose `kind` is `weekly_scoped` and whose
 * `scope.model.display_name` is a string. The measured display name was
 * `Fable` with a capital F, and the label is carried through as the vendor
 * wrote it rather than matched against a name this file would have to keep
 * up to date. There is no top level `fable_weekly`, `fable_seven_day` or
 * `seven_day_fable` key; orca probes three names and none of them exist, so
 * nothing here is built on them.
 *
 * `percent` in a limits row is an INTEGER where the window objects give a
 * float. On the measured account they agreed, and this reads whichever the
 * row carries.
 */
export function claudeScoped(
  raw: unknown
): (UsageWindow & { label: string }) | null {
  if (!Array.isArray(raw)) return null;
  for (const entry of raw) {
    const row = asRecord(entry);
    if (row === null) continue;
    if (row['kind'] !== 'weekly_scoped') continue;
    const scope = asRecord(row['scope']);
    const model = scope === null ? null : asRecord(scope['model']);
    const label = model === null ? undefined : model['display_name'];
    if (typeof label !== 'string' || label.trim() === '') continue;
    const percent = clampUsagePercent(row['percent']);
    if (percent === null) continue;
    return {
      label: label.trim().slice(0, 24),
      percent,
      resetsAt: isoToMs(row['resets_at'])
    };
  }
  return null;
}

/**
 * The Claude usage body. Two named windows plus `limits[]`, and nothing else.
 *
 * The API states NO window duration anywhere: the key names are the only
 * durations, and this client labels them five hours and seven days itself.
 */
export function parseClaudeUsage(raw: unknown): ParsedUsage {
  const obj = asRecord(raw);
  if (obj === null) return EMPTY_PARSE;
  return {
    fiveHour: claudeWindow(obj['five_hour']),
    sevenDay: claudeWindow(obj['seven_day']),
    scoped: claudeScoped(obj['limits'])
  };
}

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------

/** The five hour window, in seconds, as `limit_window_seconds` states it. */
export const CODEX_FIVE_HOUR_SECONDS = 18_000;
/** The weekly window, in seconds. */
export const CODEX_WEEKLY_SECONDS = 604_800;
/** Tolerance when classifying, per orca's own one minute. */
const CLASSIFY_TOLERANCE_SECONDS = 60;

export type CodexWindowKind = 'five-hour' | 'weekly' | null;

/**
 * THE FINDING THAT DECIDES THIS PARSER. On the measured account
 * `rate_limit.primary_window` was the WEEKLY window and `secondary_window`
 * was null: there was no five hour window in `rate_limit` at all. A parser
 * that assumes primary is the five hour window draws the weekly number in the
 * five hour slot and is wrong by the whole value with no visible symptom.
 *
 * So classification is by `limit_window_seconds` and NEVER by position.
 */
export function classifyCodexWindow(raw: unknown): CodexWindowKind {
  const obj = asRecord(raw);
  if (obj === null) return null;
  const seconds = obj['limit_window_seconds'];
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  if (Math.abs(seconds - CODEX_FIVE_HOUR_SECONDS) <= CLASSIFY_TOLERANCE_SECONDS) {
    return 'five-hour';
  }
  if (Math.abs(seconds - CODEX_WEEKLY_SECONDS) <= CLASSIFY_TOLERANCE_SECONDS) {
    return 'weekly';
  }
  return null;
}

/**
 * One Codex window.
 *
 * Two facts about the reset, both measured. `reset_at` is UNIX SECONDS and
 * not milliseconds, so it is multiplied before it meets a Date.
 * `reset_after_seconds` is also given, a relative countdown, and it is the
 * sturdier of the two because it needs no agreement about the machine's
 * clock, so it is preferred and the absolute one is the fallback.
 */
export function codexWindow(raw: unknown, now: number): UsageWindow | null {
  const obj = asRecord(raw);
  if (obj === null) return null;
  const percent = clampUsagePercent(obj['used_percent']);
  if (percent === null) return null;
  const after = obj['reset_after_seconds'];
  if (typeof after === 'number' && Number.isFinite(after) && after >= 0) {
    return { percent, resetsAt: now + after * 1000 };
  }
  const at = obj['reset_at'];
  if (typeof at === 'number' && Number.isFinite(at) && at > 0) {
    return { percent, resetsAt: Math.round(at * 1000) };
  }
  return { percent, resetsAt: null };
}

/**
 * The Codex usage body: `rate_limit` and nothing else.
 *
 * `additional_rate_limits[]` is where the 18000 second five hour window lived
 * on the measured account, at 0 percent, and Phase 181 deliberately does not
 * draw it: it is a PER MODEL bucket and drawing it as the account's own
 * window would be the same lie the position trap above is about.
 */
export function parseCodexUsage(raw: unknown, now: number): ParsedUsage {
  const obj = asRecord(raw);
  if (obj === null) return EMPTY_PARSE;
  const rateLimit = asRecord(obj['rate_limit']);
  if (rateLimit === null) return EMPTY_PARSE;
  const out: ParsedUsage = { fiveHour: null, sevenDay: null, scoped: null };
  for (const key of ['primary_window', 'secondary_window'] as const) {
    const kind = classifyCodexWindow(rateLimit[key]);
    if (kind === null) continue;
    const win = codexWindow(rateLimit[key], now);
    if (win === null) continue;
    if (kind === 'five-hour' && out.fiveHour === null) out.fiveHour = win;
    if (kind === 'weekly' && out.sevenDay === null) out.sevenDay = win;
  }
  return out;
}
