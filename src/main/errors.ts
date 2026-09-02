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
 * modules across eight domains import them and about fourteen of those,
 * fs, git, search, drop, capture, projects, have nothing to do with tmux.
 * `classifyTmuxFailure`, which genuinely is tmux's, stayed behind.
 *
 * PHASE 200 ADDED THE STRUCTURAL READER, and the reason is a loader boundary.
 * `instanceof` is a question about constructor identity, and a value built by
 * a second copy of this module answers no to it while carrying exactly the
 * payload this module wrote. That happens whenever two loaders hold the file,
 * which the 0.98.0 audit met under the `.mts` probe runtime: the fixture built
 * a `TMUX_UNREACHABLE` error carrying tmux's own completed "no server running"
 * sentence, `serverProbeVerdict` asked `instanceof` first, the answer was no,
 * and the one sentence that may delete a durable row read as "nobody could
 * read an answer". The safety default held, being the row kept, and the
 * positive path was gone. `gmuxErrorPayloadOf` reads the SHAPE instead, and
 * it is the one reader the durable create boundary and `isGmuxError` share.
 * A payload that is not exactly the shape this file writes is null, never a
 * partial read, so a malformed value stays on the safe side of every table
 * that consumes it.
 */

import type { GmuxErrorPayload } from '@shared/types';

export type GmuxErrorCode = GmuxErrorPayload['code'];

/**
 * The closed set of codes, as a value, so a code read off an unknown value can
 * be checked rather than trusted. It is `satisfies` the payload's union AND
 * the union is checked against it below, so a code appended to one and not
 * the other is a type error in this file rather than a row that reads wrong.
 *
 * It is DELIBERATELY not named with the app's own prefix.
 * `build/contract-inventory.mjs` scans the tree for prefixed identifiers as
 * the app's environment variable names, and a prefixed constant here reads to
 * it as a 97th env name that nothing ever sets. It is module private for the
 * same reason it is one list: `gmuxErrorPayloadOf` is the only reader a caller
 * needs.
 */
const KNOWN_ERROR_CODES = [
  'TMUX_NOT_FOUND',
  'TMUX_UNREACHABLE',
  'SESSION_NOT_FOUND',
  'PROJECT_NOT_FOUND',
  'NOT_A_GIT_REPO',
  'GIT_FAILED',
  'FS_FAILED',
  'SPAWN_FAILED',
  'INVALID_INPUT',
  'AGENT_NOT_FOUND',
  'AGENT_INTERPRETER_MISSING',
  'AGENT_NOT_ON_MACHINE',
  'TMUX_BUNDLE_INCOMPLETE',
  'TMUX_VERSION_UNTESTED',
  'TMUX_VERSION_MISMATCH',
  'SHUTTING_DOWN',
  'UNKNOWN'
] as const satisfies readonly GmuxErrorCode[];

/** A code the union names and the list above does not. Must stay `never`. */
type CodeMissingFromList = Exclude<
  GmuxErrorCode,
  (typeof KNOWN_ERROR_CODES)[number]
>;
const everyCodeIsListed: CodeMissingFromList extends never ? true : never = true;
void everyCodeIsListed;

const CODE_SET: ReadonlySet<string> = new Set(KNOWN_ERROR_CODES);

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

/**
 * The validated payload a value carries, or null.
 *
 * STRUCTURAL, NOT NOMINAL. It asks what the value holds and never what built
 * it, so an error made by a second copy of this module, or a plain object a
 * loader boundary handed across, reads the same as one made here. It FAILS
 * CLOSED: the payload must be an object whose `code` is one of the closed set
 * above, whose `message` is a string and whose `detail` is a string or
 * absent. Anything else, being a payload that is a string, a code that is a
 * number or a word this release never named, or a detail that is not text, is
 * null whole. Nothing is coerced and nothing is read partially, so a caller
 * that keeps a durable row when this answers null is keeping it for the right
 * reason.
 */
export function gmuxErrorPayloadOf(err: unknown): GmuxErrorPayload | null {
  if (err === null || typeof err !== 'object') return null;
  const payload = (err as { payload?: unknown }).payload;
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const { code, message, detail } = payload as Record<string, unknown>;
  if (typeof code !== 'string' || !CODE_SET.has(code)) return null;
  if (typeof message !== 'string') return null;
  if (detail !== undefined && typeof detail !== 'string') return null;
  return detail === undefined
    ? { code: code as GmuxErrorCode, message }
    : { code: code as GmuxErrorCode, message, detail };
}

/**
 * True when `err` carries a valid payload, with the given code when one is
 * named. Reads through `gmuxErrorPayloadOf`, so the answer is the same on
 * both sides of a loader boundary.
 */
export function isGmuxError(err: unknown, code?: GmuxErrorCode): boolean {
  const payload = gmuxErrorPayloadOf(err);
  if (payload === null) return false;
  return code === undefined || payload.code === code;
}
