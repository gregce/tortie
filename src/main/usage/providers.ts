/**
 * ONE COMPILED ENTRY PER PROVIDER (Phase 374), and the only place in the usage
 * domain that says what a provider is.
 *
 * THE DEFECT IT ENDS. Until this phase `./service.ts` held three
 * `provider === 'claude' ? … : codex` ternaries, being the credential reader,
 * the request and the parser. Widening `UsageProviderId` by one member left
 * that file with no type error, and the new provider read the person's Codex
 * sign in, sent it to the Codex host and drew Codex's numbers under its own
 * name with Codex's switch off. Two rounds drove it over fakes and no gate
 * read where a usage token goes.
 *
 * SO A PROVIDER'S HOST, PATH, HEADERS, CREDENTIAL READER AND PARSER ARE ONE
 * ENTRY, chosen whole or not at all, and there is no comparison of a
 * `UsageProviderId` anywhere in this domain. A missing member is a compile
 * error, and the type below goes further: only a provider that HAS a login may
 * be a `fetch`, and it may only be the fetch of its own login. Making a third
 * provider "a Codex fetch" does not compile.
 *
 * A RECEIVER HAS ITS KIND AND NOTHING ELSE. Antigravity's numbers are handed to
 * Tortie's own script by the program itself; nobody is asked, so there is no
 * host to name, no reader to open and no parser of an answer. Research 72's
 * read only request fitted Claude and Codex and MUST NOT be copied to it:
 * Google has said no to that in writing (docs/research/146 §8.1). THERE IS ONE
 * RECEIVER. `./service.ts` composes its row from one port, so a second one needs
 * a port of its own first, and `npm run conformance:usage` is red until it has
 * one.
 */

import type { UsageProviderId } from '@shared/usage';
import type { LoginProviderId } from '@shared/logins';
import type { CredentialDeps, CredentialResult } from './credentials';
import { readClaudeCredential, readCodexCredential } from './credentials';
import {
  CLAUDE_USAGE_HOST,
  CLAUDE_USAGE_PATH,
  CODEX_USAGE_HOST,
  CODEX_USAGE_PATH,
  claudeUsageHeaders,
  codexUsageHeaders
} from './endpoints';
import { parseClaudeUsage, parseCodexUsage } from './parse';
import type { ParsedUsage } from './parse';

/** A credential that was found. Never logged, never kept past one request. */
export type UsageCredential = Extract<CredentialResult, { kind: 'ok' }>;

/**
 * A provider that is ASKED: the person's own login, the one vendor that issued
 * it, and the parser of what that vendor answers.
 */
export interface UsageFetchEntry<P extends LoginProviderId = LoginProviderId> {
  readonly kind: 'fetch';
  /** Whose login the credential is read from. Its own, by type. */
  readonly login: P;
  readonly host: string;
  readonly path: string;
  headers(credential: UsageCredential): Record<string, string>;
  credential(deps: CredentialDeps, loginDir: string | null): Promise<CredentialResult>;
  parse(body: unknown, credential: UsageCredential, now: number): ParsedUsage;
}

/** A provider whose numbers ARRIVE. It names nothing, because it asks nobody. */
export interface UsageReceiverEntry {
  readonly kind: 'receiver';
}

export type UsageProviderEntry = UsageFetchEntry | UsageReceiverEntry;

/** Only a provider with a login may be asked, and only with its own. */
type EntryOf<P extends UsageProviderId> = P extends LoginProviderId
  ? UsageFetchEntry<P>
  : UsageReceiverEntry;

export const USAGE_PROVIDER_TABLE = {
  claude: {
    kind: 'fetch',
    login: 'claude',
    host: CLAUDE_USAGE_HOST,
    path: CLAUDE_USAGE_PATH,
    headers: (credential) => claudeUsageHeaders(credential.token),
    credential: (deps, loginDir) => readClaudeCredential(deps, loginDir),
    // The Claude body names no plan, so the word comes off the login that was
    // just read. It is a plan and never an identifier: the credential reader
    // put it through `usagePlanWord` already.
    parse: (body, credential) => ({
      ...parseClaudeUsage(body),
      plan: credential.plan
    })
  },
  codex: {
    kind: 'fetch',
    login: 'codex',
    host: CODEX_USAGE_HOST,
    path: CODEX_USAGE_PATH,
    headers: (credential) =>
      codexUsageHeaders(credential.token, credential.accountId ?? ''),
    credential: (deps, loginDir) => readCodexCredential(deps, loginDir),
    parse: (body, _credential, now) => parseCodexUsage(body, now)
  },
  antigravity: { kind: 'receiver' }
} as const satisfies { readonly [P in UsageProviderId]: EntryOf<P> };

/** The entry for one provider, as the union the service switches on by kind. */
export function usageEntry(provider: UsageProviderId): UsageProviderEntry {
  return USAGE_PROVIDER_TABLE[provider];
}
