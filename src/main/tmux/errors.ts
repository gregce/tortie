/**
 * Structured error helpers for the tmux layer.
 *
 * Phase 16 (L4): the app-wide vocabulary this file used to carry — `GmuxError`,
 * `gmuxError`, `isGmuxError`, `GmuxErrorCode` — moved verbatim to
 * `src/main/errors.ts`. What is left is the one classifier that really is
 * tmux's: raw CLI failure text → a structured error.
 */

import { gmuxError, type GmuxError } from '../errors';

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
