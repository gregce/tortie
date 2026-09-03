/**
 * What a credential payload IS, and the only three questions Tortie asks of
 * one (Phase 204).
 *
 * THE BYTES ARE THE VENDOR'S AND TORTIE NEVER COMPOSES THEM. There is no
 * function here that builds a credential, edits one, re-encodes one or reads a
 * token out of one. A payload is moved whole or it is not moved, and the three
 * questions are: is it shaped like a credential of this provider, what is its
 * digest, and does it hold an account identifier the row may draw.
 *
 * WHY THE SHAPE TEST EXISTS. A store can hold valid JSON that is not a
 * credential, and a store can hold a truncated file. Both are shapes the
 * attack list names. Capturing either would put a thing in Tortie's own store
 * that a later switch would write back over a working credential, so a payload
 * that is not shaped like one is not captured at all and the surface says the
 * store holds nothing Tortie can keep.
 *
 * NOTHING HERE IS LOGGED AND NOTHING HERE THROWS WITH A PAYLOAD IN IT. Every
 * answer is a boolean, a digest or null.
 */

import { createHash } from 'node:crypto';
import type { LoginProviderId } from '@shared/logins';

/**
 * The digest a move is compared by, on both sides.
 *
 * SHA-256, hex, in full. It is a one way digest of bytes Tortie already holds,
 * so it is safe to write into Tortie's own record file and to compare in a
 * gate. It is never drawn, never sent to a renderer and never logged.
 */
export function credentialDigest(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function bagAt(
  obj: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const value = obj[key];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * The most a payload may be, so a hand edited store cannot make Tortie hold a
 * megabyte in a keychain item. Both vendors write a few kilobytes.
 */
export const CREDENTIAL_MAX_BYTES = 256 * 1024;

/**
 * Is this shaped like a credential of this provider?
 *
 * CLAUDE: an object with `claudeAiOauth.accessToken` as a non empty string,
 * which is the same key `../usage/credentials.ts` reads and the same one the
 * vendor writes. The second top level key, being the map of unrelated MCP
 * OAuth entries, is neither read nor named here beyond this sentence.
 *
 * CODEX: an object with `tokens.access_token` as a non empty string. A file
 * naming `OPENAI_API_KEY` is API key billing rather than a sign in, and it is
 * NOT a credential this phase keeps: there is no account to offer back and
 * writing one into another store would move a billing key somewhere the person
 * did not put it.
 */
export function isCredentialPayload(
  provider: LoginProviderId,
  payload: unknown
): payload is string {
  if (typeof payload !== 'string') return false;
  if (payload.length === 0) return false;
  if (Buffer.byteLength(payload, 'utf8') > CREDENTIAL_MAX_BYTES) return false;
  const obj = parseObject(payload);
  if (obj === null) return false;
  if (provider === 'claude') {
    const oauth = bagAt(obj, 'claudeAiOauth');
    if (oauth === null) return false;
    const token = oauth['accessToken'];
    return typeof token === 'string' && token.length > 0;
  }
  const apiKey = obj['OPENAI_API_KEY'];
  if (typeof apiKey === 'string' && apiKey.length > 0) return false;
  const tokens = bagAt(obj, 'tokens');
  if (tokens === null) return false;
  const token = tokens['access_token'];
  return typeof token === 'string' && token.length > 0;
}
