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
 *
 * PHASE 41 added the two version patterns, and they go FIRST because the
 * generic ones below would otherwise swallow them. Both strings are in the
 * shipped tmux binary today and neither was classified before:
 * `strings` on the built 3.7b prints "protocol version mismatch (client %d,
 * server %u)" and "server version is too old for client".
 *
 * ONE STRING IS DELIBERATELY NOT MATCHED. An old client against a new server
 * prints "server exited unexpectedly" and exits 1, MEASURED here on
 * 2026-08-15 with a 3.5a client against a 3.7b server, on a scratch socket.
 * That sentence is not specific to a version difference, and an ordinary
 * crashed server prints it too, so mapping it would put the wrong name on a
 * real crash. The version gate in ./version is what covers that case instead,
 * because it runs before any attach.
 */
export function classifyTmuxFailure(
  stderr: string,
  fallbackMessage: string
): GmuxError {
  const text = stderr.trim();
  if (
    /protocol version mismatch/i.test(text) ||
    /server version is too old for client/i.test(text)
  ) {
    return gmuxError(
      'TMUX_VERSION_MISMATCH',
      'The session server is running a different version of tmux than ' +
        'Tortie, and the two cannot talk to each other.',
      text
    );
  }
  if (/no server running|error connecting to/i.test(text)) {
    return gmuxError(
      'TMUX_UNREACHABLE',
      'The Tortie session server is not running.',
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
