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

import { usagePlanWord } from '@shared/usage';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** What a credential read answers. Never a vendor sentence, never a token in a log. */
export type CredentialResult =
  /**
   * A bearer token was found. `accountId` is set for Codex only, and it is an
   * identifier that goes in one request header and NOWHERE ELSE. `plan` is
   * the plain plan word the Claude item names in `subscriptionType`, already
   * through `usagePlanWord`, and null for Codex, whose file names no plan;
   * Codex's own plan word comes off the usage response instead.
   */
  | { kind: 'ok'; token: string; accountId: string | null; plan: string | null }
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

/**
 * `claudeAiOauth.accessToken` out of a keychain or file payload, and the plan
 * word beside it.
 *
 * `subscriptionType` is a short plan word, measured in docs/research/72
 * section 8.1, and Phase 181.2 draws it on the hover card so a person can see
 * whose quota is on screen. The two other strings in that object are the
 * refresh token and its expiry, and neither is read here. `rateLimitTier` is
 * a tier name rather than a plan and is not read either.
 */
function claudeLoginFrom(
  text: string
): { token: string; plan: string | null } | null {
  const obj = parseJson(text);
  if (obj === null) return null;
  const oauth = obj['claudeAiOauth'];
  if (oauth === null || typeof oauth !== 'object' || Array.isArray(oauth)) {
    return null;
  }
  const bag = oauth as Record<string, unknown>;
  const token = bag['accessToken'];
  if (typeof token !== 'string' || token === '') return null;
  return { token, plan: usagePlanWord(bag['subscriptionType']) };
}

/**
 * Claude's credential: the keychain first, the file second.
 *
 * `~/.claude/.credentials.json` DOES NOT EXIST on a default macOS install,
 * measured. The file path is still read, because it is where a person who
 * turned the keychain off keeps it, but a reader that tries the file FIRST
 * and stops on a miss is the bug this order exists to prevent.
 *
 * PHASE 202 ADDED THE LOGIN AND TOOK AWAY A FALLBACK, and the second half is
 * the one that matters. `loginDir` names the directory of a login a person
 * added in Tortie, or null for their own default sign in.
 *
 *  - NULL, the default login: the plain service name, which is what a default
 *    install actually has, plus the scoped one when Tortie's OWN process has a
 *    `CLAUDE_CONFIG_DIR` set. This is exactly what Phase 181 did.
 *  - A DIRECTORY, a second login: the SCOPED service name for that directory
 *    and NOTHING ELSE, then that directory's own credentials file.
 *
 * The removal is the point. Falling through to the plain item for a second
 * login would read the PERSON'S OWN default credential and draw its numbers
 * under the second login's name, which is precisely the lie research 72
 * section 4 forbids: never lie across accounts. So a second login that has not
 * been signed into yet answers `missing`, which is the honest answer and the
 * one that earns the sign in line.
 *
 * `missing` is also what a login answers between being added and being signed
 * into. On macOS that sign in writes a KEYCHAIN ITEM rather than a file, so
 * "Tortie reads nothing until the file exists" is more exactly "until the
 * scoped item or the file exists", and both are asked here.
 */
export async function readClaudeCredential(
  deps: CredentialDeps,
  loginDir: string | null = null
): Promise<CredentialResult> {
  const own = deps.env['CLAUDE_CONFIG_DIR'];
  const services =
    loginDir !== null && loginDir !== ''
      ? [claudeScopedService(loginDir)]
      : own !== undefined && own !== ''
        ? [claudeScopedService(own), CLAUDE_KEYCHAIN_SERVICE]
        : [CLAUDE_KEYCHAIN_SERVICE];
  for (const service of services) {
    const payload = await deps.keychain(service);
    if (payload === null) continue;
    const login = claudeLoginFrom(payload);
    if (login !== null) {
      return { kind: 'ok', token: login.token, accountId: null, plan: login.plan };
    }
  }
  const dir =
    loginDir !== null && loginDir !== ''
      ? loginDir
      : own !== undefined && own !== ''
        ? own
        : join(deps.home, '.claude');
  const text = await deps.readText(join(dir, '.credentials.json'));
  if (text !== null) {
    const login = claudeLoginFrom(text);
    if (login !== null) {
      return { kind: 'ok', token: login.token, accountId: null, plan: login.plan };
    }
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
  deps: CredentialDeps,
  loginDir: string | null = null
): Promise<CredentialResult> {
  // PHASE 202. A login's own directory outranks Tortie's process environment,
  // which outranks the vendor's default location. There is no fallback from a
  // second login to the default one, for the reason the claude reader states:
  // another account's numbers under this account's name is a lie rather than a
  // stale value.
  const home = deps.env['CODEX_HOME'];
  const dir =
    loginDir !== null && loginDir !== ''
      ? loginDir
      : home !== undefined && home !== ''
        ? home
        : join(deps.home, '.codex');
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
  // `auth_mode` is measured `chatgpt`, which is a login method rather than a
  // plan, so nothing here is drawn as one. Codex's plan word is `plan_type`
  // on the usage response and ./parse.ts reads it there.
  return { kind: 'ok', token, accountId, plan: null };
}
