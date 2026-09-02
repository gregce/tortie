/**
 * Whose sign in a login is, and whether it has one at all (Phase 203).
 *
 * ## The two defects this answers
 *
 * The operator reported both on 2026-09-02 and both were measured before this
 * was written.
 *
 *  1. Add login opened claude, opened a website, and the session died without
 *     logging in. THE SIGN IN HAD SUCCEEDED. On macOS the credential is a
 *     KEYCHAIN ITEM named for the login's own directory, and nothing filled
 *     that half in for the list, so `src/main/logins/store.ts` asked for a
 *     `.credentials.json` that macOS never writes and every added claude login
 *     read as never signed in, for ever.
 *  2. `Default` was not the account he is signed in as. It is knowable: the
 *     address sits in `oauthAccount.emailAddress` in the vendor's own JSON.
 *
 * ## IT SPAWNS NOTHING TO LEARN AN ADDRESS
 *
 * The first draft of this phase was going to run `claude auth status` once per
 * login per refresh. The measurement that killed that: a login which has been
 * USED carries its own address in its own directory, and `claude auth status`
 * scoped to a login with no `oauthAccount` answers `email: null`, so the
 * vendor command tells us nothing the file does not, at 140 ms and one process
 * against 0.05 ms and none. So the identity read is two file reads and no
 * process at all, on either provider.
 *
 * The one thing that does spawn is the CLAUDE PRESENCE half, which asks the
 * keychain, because that is where the credential is. It asks for the item's
 * ATTRIBUTES and never for its payload: `security find-generic-password -s
 * <service>` with no `-w`. So this module can say a credential exists without
 * ever holding a token byte, which is stronger than what the meter needs and
 * is the reason presence can be answered while a meter is switched off.
 *
 * ## NO TOKEN BYTE OUTLIVES A CALL
 *
 * Codex's address is a claim inside `tokens.id_token`, so that token is read.
 * Nothing of it reaches a variable that outlives {@link emailFromIdToken}, a
 * log line, an error message, a snapshot or a cache entry: the function keeps
 * one address string and drops everything else. A token that is not three
 * parts, a payload that is not JSON, a payload with no email, or an email that
 * is not a plain address is an account that is NOT KNOWN rather than a crash.
 *
 * ## THE DECOY, and it is why the two claude paths are spelled apart
 *
 * `~/.claude/.claude.json` exists on the operator's machine and holds no
 * `oauthAccount`. A reader that composed the account file the way the
 * CREDENTIAL file is composed would read that one and answer "account not
 * known" for the default login, which is defect 2 reintroduced inside its own
 * fix. The default account file is `~/.claude.json`; the scoped one is
 * `<CLAUDE_CONFIG_DIR>/.claude.json`.
 *
 * ## WHY IT IS NOT IN `src/main/logins/`
 *
 * `npm run conformance:logins` refuses any file in that domain that can NAME
 * `.claude`, `.codex`, a home directory or `node:os`, which is what keeps the
 * person's own sign in out of reach of a delete. This module names all four,
 * so it lives in the usage domain beside the credential reader it shares its
 * service naming with, and `src/main/logins/ipc.ts` reaches it as an injected
 * function.
 */

import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { LoginProviderId } from '@shared/logins';
import { CLAUDE_KEYCHAIN_SERVICE, claudeScopedService } from './credentials';

/**
 * Whose sign in this is.
 *
 * `unknown` is an ORDINARY answer and not an error. A login added a moment ago
 * has eight keys in its `.claude.json` and no `oauthAccount`, because the
 * address appears after the account has taken a turn, so a freshly signed in
 * login is honestly not known yet.
 */
export type LoginAccount =
  | { kind: 'known'; email: string }
  | { kind: 'unknown' };

/** The one value the not known answer ever takes. */
export const ACCOUNT_UNKNOWN: LoginAccount = { kind: 'unknown' };

/** What one login's whole reading holds. Both halves, or neither. */
export interface LoginFacts {
  /** A credential really exists for this login right now. */
  present: boolean;
  /** Whose it is, when the vendor's own file says. */
  account: LoginAccount;
}

/** The seams. Tests hand in their own and touch neither keychain nor disk. */
export interface LoginAccountDeps {
  /** Does a keychain item with this service name exist? ATTRIBUTES ONLY. */
  keychainHas(service: string): Promise<boolean>;
  /** Is there a file here? Asked instead of read, so no token is opened. */
  exists(path: string): Promise<boolean>;
  /** The file's text, or null when it does not exist or cannot be read. */
  readText(path: string): Promise<string | null>;
  env: Record<string, string | undefined>;
  home: string;
  now(): number;
}

/** How long the `security` call may take before the answer is "not known". */
export const KEYCHAIN_TIMEOUT_MS = 5_000;

/**
 * How long one login's reading stands before it is taken again.
 *
 * It is here so that a person moving the pointer over the meter does not spawn
 * one `security` per login per movement. Five seconds is far shorter than any
 * sign in flow, so a finished sign in is never hidden behind it, and every
 * change a person makes clears the whole cache anyway through
 * {@link forgetLoginAccounts}.
 */
export const LOGIN_FACTS_TTL_MS = 5_000;

/** The whole read's bound. A surface may not hang on a slow keychain. */
export const LOGIN_FACTS_TIMEOUT_MS = 6_000;

// ---------------------------------------------------------------------------
// Where each vendor keeps the two things this module reads
// ---------------------------------------------------------------------------

/**
 * The keychain service names to try for one login, most specific first.
 *
 * A LOGIN DIRECTORY GETS THE SCOPED NAME AND NOTHING ELSE, which is the same
 * removal `readClaudeCredential` made and for the same reason: falling through
 * to the plain item would answer the PERSON'S OWN default credential for a
 * second login that has never been signed into.
 */
export function claudeServicesFor(
  d: Pick<LoginAccountDeps, 'env'>,
  loginDir: string | null
): string[] {
  if (loginDir !== null && loginDir !== '') return [claudeScopedService(loginDir)];
  const own = d.env['CLAUDE_CONFIG_DIR'];
  return own !== undefined && own !== ''
    ? [claudeScopedService(own), CLAUDE_KEYCHAIN_SERVICE]
    : [CLAUDE_KEYCHAIN_SERVICE];
}

/** Where claude's credential FILE would be, for a person who turned the keychain off. */
export function claudeCredentialFileFor(
  d: Pick<LoginAccountDeps, 'env' | 'home'>,
  loginDir: string | null
): string {
  if (loginDir !== null && loginDir !== '') return join(loginDir, '.credentials.json');
  const own = d.env['CLAUDE_CONFIG_DIR'];
  const dir = own !== undefined && own !== '' ? own : join(d.home, '.claude');
  return join(dir, '.credentials.json');
}

/**
 * Where claude records WHOSE account a directory is.
 *
 * THE DEFAULT IS `~/.claude.json` AND NOT `~/.claude/.claude.json`. Both exist
 * on the operator's machine and only the first carries `oauthAccount`. See the
 * decoy paragraph at the head of this file.
 */
export function claudeAccountFileFor(
  d: Pick<LoginAccountDeps, 'env' | 'home'>,
  loginDir: string | null
): string {
  if (loginDir !== null && loginDir !== '') return join(loginDir, '.claude.json');
  const own = d.env['CLAUDE_CONFIG_DIR'];
  return own !== undefined && own !== ''
    ? join(own, '.claude.json')
    : join(d.home, '.claude.json');
}

/** Codex keeps its credential and its identity in one file. */
export function codexAuthFileFor(
  d: Pick<LoginAccountDeps, 'env' | 'home'>,
  loginDir: string | null
): string {
  if (loginDir !== null && loginDir !== '') return join(loginDir, 'auth.json');
  const home = d.env['CODEX_HOME'];
  const dir = home !== undefined && home !== '' ? home : join(d.home, '.codex');
  return join(dir, 'auth.json');
}

// ---------------------------------------------------------------------------
// Reading an address out of bytes somebody else wrote
// ---------------------------------------------------------------------------

/**
 * An address this app will draw, or null.
 *
 * WHAT IT REFUSES, and each half is a shape a hostile file can hold. Anything
 * that is not a string. Anything with whitespace, angle brackets, a quote or a
 * backslash in it, so markup in the field cannot reach a face. Anything past
 * 254 characters, which is the address limit and is also what refuses a pasted
 * token outright. Anything without one at sign and a dotted domain after it.
 *
 * It is NOT an address validator and does not try to be. It is the filter that
 * decides whether a string somebody else wrote may be drawn as one.
 */
const ACCOUNT_EMAIL_RE =
  /^[^\s<>"'`\\/@]{1,64}@[^\s<>"'`\\/@]{1,180}\.[A-Za-z]{2,24}$/;

export function sanitizeAccountEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim();
  if (email.length === 0 || email.length > 254) return null;
  return ACCOUNT_EMAIL_RE.test(email) ? email : null;
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
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** `oauthAccount.emailAddress` out of a `.claude.json`, or null. */
export function emailFromClaudeJson(text: string): string | null {
  const obj = parseObject(text);
  if (obj === null) return null;
  const account = bagAt(obj, 'oauthAccount');
  if (account === null) return null;
  return sanitizeAccountEmail(account['emailAddress']);
}

/**
 * The `email` claim out of an OpenID id token, and NOTHING ELSE OF IT.
 *
 * The token is three base64url parts. Only the middle one is decoded, only two
 * claims are looked at, and the decoded text is a local the function drops. No
 * part of the token is returned, logged, cached or put in an error message, so
 * a failure here says "not known" and says nothing about why.
 *
 * The fallback claim is the profile object OpenAI puts beside the plain one,
 * which is what orca's `codex-auth-identity.ts` reads, so a token that carries
 * the address in only one of the two places still answers.
 */
export function emailFromIdToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1] ?? '';
  if (payload === '') return null;
  let text: string;
  try {
    text = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8');
  } catch {
    return null;
  }
  const claims = parseObject(text);
  if (claims === null) return null;
  const plain = sanitizeAccountEmail(claims['email']);
  if (plain !== null) return plain;
  for (const [key, value] of Object.entries(claims)) {
    if (!key.endsWith('/profile')) continue;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
    const found = sanitizeAccountEmail((value as Record<string, unknown>)['email']);
    if (found !== null) return found;
  }
  return null;
}

/** The address out of a codex `auth.json`, or null. */
export function emailFromCodexAuth(text: string): string | null {
  const obj = parseObject(text);
  if (obj === null) return null;
  const tokens = bagAt(obj, 'tokens');
  if (tokens === null) return null;
  return emailFromIdToken(tokens['id_token']);
}

// ---------------------------------------------------------------------------
// The two reads
// ---------------------------------------------------------------------------

/**
 * Does a credential exist for this login right now?
 *
 * NO TOKEN BYTE IS READ ON EITHER PROVIDER. The claude half asks the keychain
 * for the item's attributes, and the file halves ask whether a file is there
 * rather than opening it.
 */
export async function readLoginPresence(
  d: LoginAccountDeps,
  provider: LoginProviderId,
  loginDir: string | null
): Promise<boolean> {
  if (provider === 'claude') {
    for (const service of claudeServicesFor(d, loginDir)) {
      if (await d.keychainHas(service)) return true;
    }
    return d.exists(claudeCredentialFileFor(d, loginDir));
  }
  return d.exists(codexAuthFileFor(d, loginDir));
}

/** Whose sign in this login is, from the vendor's own file. Spawns nothing. */
export async function readLoginAccount(
  d: LoginAccountDeps,
  provider: LoginProviderId,
  loginDir: string | null
): Promise<LoginAccount> {
  const path =
    provider === 'claude'
      ? claudeAccountFileFor(d, loginDir)
      : codexAuthFileFor(d, loginDir);
  const text = await d.readText(path);
  if (text === null) return ACCOUNT_UNKNOWN;
  const email =
    provider === 'claude' ? emailFromClaudeJson(text) : emailFromCodexAuth(text);
  return email === null ? ACCOUNT_UNKNOWN : { kind: 'known', email };
}

// ---------------------------------------------------------------------------
// The default seams, the harness seam, and the cache
// ---------------------------------------------------------------------------

export function defaultLoginAccountDeps(): LoginAccountDeps {
  return {
    keychainHas: (service) =>
      new Promise<boolean>((resolve) => {
        // NO `-w`. Without it `security` prints the item's ATTRIBUTES and
        // never its payload, so this proves a credential exists without ever
        // holding one. Nothing of the output is inspected beyond the exit
        // code, and nothing of it is logged.
        execFile(
          '/usr/bin/security',
          ['find-generic-password', '-s', service],
          { timeout: KEYCHAIN_TIMEOUT_MS, maxBuffer: 256 * 1024 },
          (err) => resolve(err === null)
        );
      }),
    exists: async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    readText: async (path) => {
      try {
        return await readFile(path, 'utf8');
      } catch {
        return null;
      }
    },
    env: process.env,
    home: homedir(),
    now: () => Date.now()
  };
}

let installed: LoginAccountDeps | null = null;

/**
 * Harness and test seam. `src/main/harness/usage-fixture.ts` hands in a
 * keychain that always answers no, for the same reason it does for the meter:
 * a probe's app must never open the person's own keychain.
 */
export function setLoginAccountDeps(next: LoginAccountDeps | null): void {
  installed = next;
  forgetLoginAccounts();
}

function currentDeps(): LoginAccountDeps {
  if (installed === null) installed = defaultLoginAccountDeps();
  return installed;
}

interface CacheEntry {
  at: number;
  facts: LoginFacts;
}

const fresh = new Map<string, CacheEntry>();
/**
 * The last answer for each login, kept past its freshness.
 *
 * A READ THAT FAILED KEEPS THE LAST ANSWER, which is the meter's own stale
 * rule and it is here for the same reason: a slow keychain must not turn a
 * signed in login into "not signed in yet" on the face.
 */
const lastGood = new Map<string, LoginFacts>();

/** Every held reading is dropped. Called after any change a person made. */
export function forgetLoginAccounts(): void {
  fresh.clear();
  lastGood.clear();
}

function keyFor(provider: LoginProviderId, loginDir: string | null): string {
  return `${provider} ${loginDir ?? ''}`;
}

async function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * One login's presence and account, cached, bounded, and never on a keystroke.
 *
 * The only callers are `logins:list` and the tests. `logins:list` is asked when
 * a surface is about to draw and after every change, and never on a timer and
 * never on a key press, which is the rule this phase promised.
 */
export async function loginFacts(
  provider: LoginProviderId,
  loginDir: string | null
): Promise<LoginFacts> {
  const d = currentDeps();
  const key = keyFor(provider, loginDir);
  const held = fresh.get(key);
  const now = d.now();
  if (held !== undefined && now - held.at < LOGIN_FACTS_TTL_MS) return held.facts;
  const fallback: LoginFacts = lastGood.get(key) ?? {
    present: false,
    account: ACCOUNT_UNKNOWN
  };
  const facts = await withTimeout(
    (async (): Promise<LoginFacts> => {
      const [present, account] = await Promise.all([
        readLoginPresence(d, provider, loginDir),
        readLoginAccount(d, provider, loginDir)
      ]);
      return { present, account };
    })().catch(() => fallback),
    LOGIN_FACTS_TIMEOUT_MS,
    fallback
  );
  fresh.set(key, { at: now, facts });
  lastGood.set(key, facts);
  return facts;
}
