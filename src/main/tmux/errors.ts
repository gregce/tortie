/**
 * Structured error helpers for the tmux layer.
 *
 * Per the shared contract (src/shared/types.ts), main-process code throws
 * `Error` instances whose `message` is `JSON.stringify(GmuxErrorPayload)`
 * when the failure can be classified. The renderer parses the payload and
 * shows a friendly state instead of a raw stack.
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

/**
 * Classify raw tmux CLI failure text into a structured error.
 * Patterns verified against tmux 3.6a output.
 */
export function classifyTmuxFailure(
  stderr: string,
  fallbackMessage: string
): GmuxError {
  const text = stderr.trim();
  if (/no server running|error connecting to/i.test(text)) {
    return gmuxError(
      'TMUX_UNREACHABLE',
      'The gmux session server is not running.',
      text
    );
  }
  if (/can't find session|session not found/i.test(text)) {
    return gmuxError('SESSION_NOT_FOUND', 'Session not found.', text);
  }
  if (/duplicate session/i.test(text)) {
    return gmuxError(
      'INVALID_INPUT',
      'A session with that name already exists.',
      text
    );
  }
  return gmuxError('UNKNOWN', fallbackMessage, text || undefined);
}
