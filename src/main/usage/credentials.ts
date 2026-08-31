/**
 * Reading the person's stored agent credential (Phase 181). READ ONLY, and
 * that is the whole contract of this file.
 *
 * NOTHING HERE WRITES, REFRESHES, ROTATES, DELETES OR COPIES A CREDENTIAL.
 * The measurement behind that rule: Claude Code rewrites its keychain item
 * roughly hourly, and the item's `expiresAt` fell fifty minutes after the
 * call. An access token found stale therefore means only that the agent has
 * not run recently, and the honest answer is to say so. Taking custody of a
 * single use refresh token would log the person out of their own agent the
 * first time a rotation raced, which is the failure orca's kimi arm exists to
 * avoid.
 *
 * NOTHING HERE IS LOGGED. Not the payload, not a token, not a length, not a
 * prefix. Callers log a provider name and a fixed sentence. `expiresAt` is
 * ADVISORY and is not used to refuse a call, because the item can be rewritten
 * under the reader at any moment; the server decides.
 *
 * `mcpOAuth` IS NEVER TOUCHED. The Claude keychain payload has two top level
 * keys, and the other one is a map of unrelated OAuth entries, one per
 * configured MCP server, each carrying its own access token. This file reads
 * `claudeAiOauth` and never names the other key except to say that.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** What a credential read answers. Never a vendor sentence, never a token in a log. */
export type CredentialResult =
  /** A bearer token was found. `accountId` is set for Codex only. */
  | { kind: 'ok'; token: string; accountId: string | null }
  /** No credential exists at all. The one answer that earns a sign in line. */
  | { kind: 'missing' }
  /** API key billing rather than a subscription, so there is no window. */
  | { kind: 'api-key' };

/** The seams. Tests hand in their own and touch neither keychain nor disk. */
export interface CredentialDeps {
  /** `security find-generic-password -s <service> -w`, or null when absent. */
  keychain(service: string): Promise<string | null>;
  /** The file's text, or null when it does not exist or cannot be read. */
  readText(path: string): Promise<string | null>;
  env: Record<string, string | undefined>;
  home: string;
}

const KEYCHAIN_TIMEOUT_MS = 5_000;

/** The plain service name, which is what a default install actually has. */
export const CLAUDE_KEYCHAIN_SERVICE = 'Claude Code-credentials';

/**
 * The config-dir-scoped service name.
 *
 * MEASURED CAVEAT: on a default install with `CLAUDE_CONFIG_DIR` unset there
 * is no suffix at all, and the plain name above is the live item. The suffix
 * form is real in orca and UNMEASURED here, so it is tried FIRST only when a
 * config dir is set, and the plain name is always tried as well. A reader that
 * only tried the scoped name would find nothing on this machine and wrongly
 * conclude the person is signed out.
 */
export function claudeScopedService(configDir: string): string {
  const digest = createHash('sha256').update(configDir).digest('hex');
  return `${CLAUDE_KEYCHAIN_SERVICE}-${digest.slice(0, 8)}`;
}

export function defaultCredentialDeps(): CredentialDeps {
  return {
    keychain: (service) =>
      new Promise<string | null>((resolve) => {
        execFile(
          '/usr/bin/security',
          ['find-generic-password', '-s', service, '-w'],
          { timeout: KEYCHAIN_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
          (err, stdout) => {
            // A miss and a failure are the same answer here, and neither the
            // error nor the output is ever logged or inspected further.
            if (err) resolve(null);
            else resolve(stdout.trim() === '' ? null : stdout);
          }
        );
      }),
    readText: async (path) => {
      try {
        return await readFile(path, 'utf8');
      } catch {
        return null;
      }
    },
    env: process.env,
    home: homedir()
  };
}

function parseJson(text: string): Record<string, unknown> | null {
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

/** `claudeAiOauth.accessToken` out of a keychain or file payload. */
function claudeTokenFrom(text: string): string | null {
  const obj = parseJson(text);
  if (obj === null) return null;
  const oauth = obj['claudeAiOauth'];
  if (oauth === null || typeof oauth !== 'object' || Array.isArray(oauth)) {
    return null;
  }
  const token = (oauth as Record<string, unknown>)['accessToken'];
  return typeof token === 'string' && token !== '' ? token : null;
}

/**
 * Claude's credential: the keychain first, the file second.
 *
 * `~/.claude/.credentials.json` DOES NOT EXIST on a default macOS install,
 * measured. The file path is still read, because it is where a person who
 * turned the keychain off keeps it, but a reader that tries the file FIRST
 * and stops on a miss is the bug this order exists to prevent.
 */
export async function readClaudeCredential(
  deps: CredentialDeps
): Promise<CredentialResult> {
  const configDir = deps.env['CLAUDE_CONFIG_DIR'];
  const services =
    configDir !== undefined && configDir !== ''
      ? [claudeScopedService(configDir), CLAUDE_KEYCHAIN_SERVICE]
      : [CLAUDE_KEYCHAIN_SERVICE];
  for (const service of services) {
    const payload = await deps.keychain(service);
    if (payload === null) continue;
    const token = claudeTokenFrom(payload);
    if (token !== null) return { kind: 'ok', token, accountId: null };
  }
  const dir =
    configDir !== undefined && configDir !== ''
      ? configDir
      : join(deps.home, '.claude');
  const text = await deps.readText(join(dir, '.credentials.json'));
  if (text !== null) {
    const token = claudeTokenFrom(text);
    if (token !== null) return { kind: 'ok', token, accountId: null };
  }
  return { kind: 'missing' };
}

/**
 * Codex's credential: a file, mode 0600, and no keychain is involved.
 *
 * `OPENAI_API_KEY` is null on a subscription login, so ITS PRESENCE is how
 * API key billing announces itself. That case answers `api-key` rather than
 * `missing`, because the two mean different things to a person: one says sign
 * in, the other says there is no subscription window to show.
 */
export async function readCodexCredential(
  deps: CredentialDeps
): Promise<CredentialResult> {
  const home = deps.env['CODEX_HOME'];
  const dir = home !== undefined && home !== '' ? home : join(deps.home, '.codex');
  const text = await deps.readText(join(dir, 'auth.json'));
  if (text === null) return { kind: 'missing' };
  const obj = parseJson(text);
  if (obj === null) return { kind: 'missing' };
  const apiKey = obj['OPENAI_API_KEY'];
  if (typeof apiKey === 'string' && apiKey !== '') return { kind: 'api-key' };
  const tokens = obj['tokens'];
  if (tokens === null || typeof tokens !== 'object' || Array.isArray(tokens)) {
    return { kind: 'missing' };
  }
  const bag = tokens as Record<string, unknown>;
  const token = bag['access_token'];
  const accountId = bag['account_id'];
  if (typeof token !== 'string' || token === '') return { kind: 'missing' };
  if (typeof accountId !== 'string' || accountId === '') {
    return { kind: 'missing' };
  }
  return { kind: 'ok', token, accountId };
}
