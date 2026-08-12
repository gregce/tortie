/**
 * The main process's structured error vocabulary.
 *
 * Per the shared contract (src/shared/types.ts), main-process code throws
 * `Error` instances whose `message` is `JSON.stringify(GmuxErrorPayload)`
 * when the failure can be classified. The renderer parses the payload and
 * shows a friendly state instead of a raw stack.
 *
 * Phase 16 (L4) moved these four declarations here VERBATIM from
 * `main/tmux/errors.ts`, where they had been parked since Phase 2: twenty
 * modules across eight domains import them and about fourteen of those —
 * fs, git, search, drop, capture, projects — have nothing to do with tmux.
 * `classifyTmuxFailure`, which genuinely is tmux's, stayed behind.
 */

import type { GmuxErrorPayload } from '@shared/types';

export type GmuxErrorCode = GmuxErrorPayload['code'];

/** Error subclass carrying the structured payload (message is the JSON). */
export class GmuxError extends Error {
  readonly payload: GmuxErrorPayload;

  constructor(code: GmuxErrorCode, message: string, detail?: string) {
    const payload: GmuxErrorPayload = { code, message, detail };
    super(JSON.stringify(payload));
    this.name = 'GmuxError';
    this.payload = payload;
  }
}

export function gmuxError(
  code: GmuxErrorCode,
  message: string,
  detail?: string
): GmuxError {
  return new GmuxError(code, message, detail);
}

/** True when `err` is a GmuxError with the given code. */
export function isGmuxError(err: unknown, code?: GmuxErrorCode): boolean {
  if (!(err instanceof GmuxError)) return false;
  return code === undefined || err.payload.code === code;
}
