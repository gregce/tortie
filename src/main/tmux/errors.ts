/**
 * Structured error helpers for the tmux layer.
 *
 * Phase 16 (L4): the app-wide vocabulary this file used to carry — `GmuxError`,
 * `gmuxError`, `isGmuxError`, `GmuxErrorCode` — moved verbatim to
 * `src/main/errors.ts`. What is left is the one classifier that really is
 * tmux's: raw CLI failure text → a structured error.
 */

import { GmuxError, gmuxError, gmuxErrorPayloadOf } from '../errors';

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
  // `no such session` is what tmux 3.6a prints for show-environment and for
  // several other verbs that take a target. MEASURED 2026-08-20 on a scratch
  // socket. It was missing here, so those failures fell through to UNKNOWN and
  // a caller could not tell a named absence from an unreadable answer.
  if (/no such session|can't find session|session not found/i.test(text)) {
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

/** What one failed list exec proved about the local server (Phase 67). */
export type ServerProbeVerdict = 'no-server' | 'not-confirmed';

/**
 * Judge whether one failed exec CONFIRMED that no server owns the socket.
 *
 * The discrimination lives beside the classifier because it reads the same
 * stderr sentences. The confirming set was MEASURED on 2026-08-17 against
 * tmux 3.6a on a scratch socket, and the measurement moved the rule the
 * Phase 67 spec drafted. The tmux client prints exactly one of two sentences
 * when it cannot talk to a server (client.c keeps this branch across 3.x):
 *
 *  - "no server running on <path>" is printed for ECONNREFUSED only. The
 *    socket file exists and nothing is listening. A stopped server still
 *    accepts connects (the kernel backlog does), so refused cannot be a
 *    stall. This is a completed probe and it is the ONLY confirmation of
 *    death. Measured: kill -9 of the server leaves the socket file behind
 *    and the next list prints exactly this sentence.
 *
 *  - "error connecting to <path> (<reason>)" is printed for every other
 *    connect errno. Measured reasons: "No such file or directory" for a
 *    socket file that does not exist, and "Permission denied" for one that
 *    cannot be opened. NEITHER confirms death. A live server whose socket
 *    file was deleted keeps every session running and can even rebuild the
 *    file on SIGUSR1, so treating the missing file as death would offer
 *    Restore over a live agent. That is the exact defect this verdict
 *    exists to close.
 *
 * Everything else is 'not-confirmed' too. That covers the exec timeout, where
 * the killed client says nothing at all and the classifier returns code
 * UNKNOWN, and it covers spawn failures and any unclassified stderr.
 *
 * The Phase 67 spec drafted a provisional second confirming pattern for
 * "error connecting to ... (Connection refused)". It is gone, because the
 * measurement shows this client never prints those words. A refused connect
 * gets the "no server running" sentence instead, which the first rule already
 * confirms.
 */
export function serverProbeVerdict(err: unknown): ServerProbeVerdict {
  // Phase 200: the payload is read by SHAPE and never by constructor identity.
  // Under a second loader the same error is not an `instanceof` this module's
  // class, and asking that first turned the one completed answer into an
  // unreadable one. A malformed payload is null and stays 'not-confirmed'.
  const payload = gmuxErrorPayloadOf(err);
  if (payload === null) return 'not-confirmed';
  if (payload.code !== 'TMUX_UNREACHABLE') return 'not-confirmed';
  return /no server running/i.test(payload.detail ?? '')
    ? 'no-server'
    : 'not-confirmed';
}
