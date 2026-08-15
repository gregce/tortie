/**
 * The log:append bounds (Phase 35, spec section 5).
 *
 * A renderer error loop must not be able to eat the log budget, and a
 * malformed payload must never crash main or write a partial line. The
 * rules, enforced here and unit tested in plain node:
 *
 * - An invalid line (unknown level, scope not in the allowlist, msg not a
 *   string) is dropped whole and counted. Never partially written.
 * - msg is truncated at 2048 characters.
 * - Serialized fields are capped at 8 KiB; over the cap, fields are
 *   replaced by {"truncated":true}.
 * - Per-run cap of 200 accepted lines per sender WebContents. Line 201
 *   writes one final {"event":"log.capped"} warn record for that sender
 *   and everything after is dropped.
 *
 * Pure. ./ipc.ts owns the electron half (sender identity, pid).
 */

import {
  RENDERER_LOG_SCOPES,
  type LogLevel,
  type RendererLogLine,
  type RendererLogScope
} from '@shared/ipc';

export const APPEND_MAX_MSG_CHARS = 2048;
export const APPEND_MAX_FIELDS_BYTES = 8192;
export const APPEND_MAX_LINES_PER_SENDER = 200;

const LEVELS: readonly string[] = ['error', 'warn', 'info', 'debug'];

/** A validated, bounded line, ready for the write path. */
export interface CleanRendererLine {
  level: LogLevel;
  scope: RendererLogScope;
  msg: string;
  fields?: Record<string, unknown>;
}

/**
 * Validate and bound one payload. Returns null for anything invalid — the
 * caller drops the line whole and counts it.
 */
export function sanitizeRendererLine(
  payload: unknown
): CleanRendererLine | null {
  if (payload === null || typeof payload !== 'object') return null;
  const line = payload as Partial<RendererLogLine>;
  if (typeof line.level !== 'string' || !LEVELS.includes(line.level)) {
    return null;
  }
  if (
    typeof line.scope !== 'string' ||
    !(RENDERER_LOG_SCOPES as readonly string[]).includes(line.scope)
  ) {
    return null;
  }
  if (typeof line.msg !== 'string') return null;

  const clean: CleanRendererLine = {
    level: line.level as LogLevel,
    scope: line.scope as RendererLogScope,
    msg: line.msg.slice(0, APPEND_MAX_MSG_CHARS)
  };

  if (line.fields !== undefined) {
    if (line.fields === null || typeof line.fields !== 'object') return null;
    let serialized: string;
    try {
      serialized = JSON.stringify(line.fields);
    } catch {
      clean.fields = { truncated: true };
      return clean;
    }
    clean.fields =
      Buffer.byteLength(serialized, 'utf8') > APPEND_MAX_FIELDS_BYTES
        ? { truncated: true }
        : (line.fields as Record<string, unknown>);
  }
  return clean;
}

/** What the per-sender budget says about one more accepted line. */
export type AppendBudgetVerdict = 'accept' | 'cap' | 'drop';

/**
 * The per-run, per-sender line budget. `take` is called once per VALID
 * line: the first 200 are accepted, the 201st answers 'cap' (the caller
 * writes the one log.capped record), and everything after is dropped
 * silently.
 */
export class AppendBudget {
  private counts = new Map<number, number>();

  take(senderId: number): AppendBudgetVerdict {
    const next = (this.counts.get(senderId) ?? 0) + 1;
    this.counts.set(senderId, next);
    if (next <= APPEND_MAX_LINES_PER_SENDER) return 'accept';
    if (next === APPEND_MAX_LINES_PER_SENDER + 1) return 'cap';
    return 'drop';
  }
}
