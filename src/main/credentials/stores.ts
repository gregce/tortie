/**
 * The vendor's own credential stores, read and written (Phase 204).
 *
 * ## WHAT A STORE IS
 *
 * The place the vendor's own CLI wrote a credential for one login. For a login
 * Tortie made it is that login's own directory, which is what
 * `CLAUDE_CONFIG_DIR` or `CODEX_HOME` points at when a session launches. For
 * the DEFAULT login it is the vendor's own location, which is the person's
 * own and which this module can read and can NEVER write. That refusal is a
 * named branch in {@link storeTarget} rather than a convention, and the gate
 * drives it.
 *
 * ## WHERE THE PATHS COME FROM
 *
 * Every one of them comes from `../usage/login-accounts.ts`, which is already
 * the one module that knows the two vendor directory names. Composing them a
 * second time here is how the decoy of Phase 203 came back inside its own fix,
 * so nothing in this file joins a home directory to a vendor name.
 *
 * ## A STORE IS READ TWICE BEFORE IT IS BELIEVED
 *
 * The vendor rewrites its own store while Tortie is running, roughly hourly
 * for claude and on every `/login`. A single read can land in the middle of
 * that. {@link readSettledStore} reads twice, a short interval apart, and
 * answers only when both reads agree byte for byte, so what Tortie keeps is a
 * whole credential rather than half of one. That is also the whole of the "no
 * poll that races a running session" rule on the READ side: the read never
 * writes anything, and a store caught mid change is simply not captured this
 * time.
 *
 * ## NOTHING HERE IS LOGGED
 *
 * No line, no length, no prefix, and no error carrying a payload.
 */

import type { LoginProviderId } from '@shared/logins';
import {
  claudeAccountFileFor,
  claudeCredentialFileFor,
  claudeServicesFor,
  codexAuthFileFor,
  emailFromClaudeJson,
  emailFromCodexAuth
} from '../usage/login-accounts';
import { claudeScopedService } from '../usage/credentials';
import { isCredentialPayload } from './payload';
import {
  keychainAccount,
  keychainDelete,
  keychainRead,
  keychainWrite,
  type SecurityRunner
} from './security';
import type { SwapTarget } from './swap';

/** How long between the two reads that must agree. */
export const SETTLE_MS = 120;

/** The seams. The gate hands in its own and touches no keychain and no home. */
export interface StoreDeps {
  runner: SecurityRunner;
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  removePath(path: string): Promise<void>;
  env: Record<string, string | undefined>;
  home: string;
  /**
   * TRUE when a claude credential lives in the keychain on this machine, which
   * is every macOS install. On any other platform it is a file, and the same
   * code path writes it.
   */
  keychainForClaude: boolean;
  /** The account attribute a NEW keychain item gets when none is there to copy. */
  userName: string;
  wait(ms: number): Promise<void>;
}

/** Where a store keeps its bytes right now. */
export type StoreWhere = 'keychain' | 'file' | 'none';

/** One reading of a store. It holds the vendor's bytes and nothing composed. */
export interface StoreReading {
  /** The vendor's own bytes, when they are shaped like a credential. */
  payload: string | null;
  /** Whose sign in it is, out of the vendor's own file. Never from the token. */
  email: string | null;
  where: StoreWhere;
  /** The keychain item's account attribute, so a write back can preserve it. */
  account: string | null;
}

const NOTHING: StoreReading = {
  payload: null,
  email: null,
  where: 'none',
  account: null
};

/**
 * The keychain service name a WRITE for this login would use.
 *
 * A login Tortie made gets the name derived from its own directory, which is
 * what the vendor itself writes for a session launched with that
 * `CLAUDE_CONFIG_DIR`. There is no name for the default store here on purpose:
 * the default store is never a write target.
 */
export function claudeWriteService(dir: string): string {
  return claudeScopedService(dir);
}

/** Read a store once. */
export async function readStore(
  d: StoreDeps,
  provider: LoginProviderId,
  dir: string | null
): Promise<StoreReading> {
  if (provider === 'codex') {
    const text = await d.readText(codexAuthFileFor(d, dir));
    if (text === null) return NOTHING;
    const payload = isCredentialPayload('codex', text) ? text : null;
    return {
      payload,
      email: emailFromCodexAuth(text),
      where: payload === null ? 'none' : 'file',
      account: null
    };
  }
  const accountText = await d.readText(claudeAccountFileFor(d, dir));
  const email = accountText === null ? null : emailFromClaudeJson(accountText);
  if (d.keychainForClaude) {
    for (const service of claudeServicesFor(d, dir)) {
      const found = await keychainRead(d.runner, service);
      if (found === null) continue;
      if (!isCredentialPayload('claude', found)) continue;
      return {
        payload: found,
        email,
        where: 'keychain',
        account: await keychainAccount(d.runner, service)
      };
    }
  }
  const text = await d.readText(claudeCredentialFileFor(d, dir));
  if (text !== null && isCredentialPayload('claude', text)) {
    return { payload: text, email, where: 'file', account: null };
  }
  return { ...NOTHING, email };
}

/**
 * Read a store twice and answer only when both readings agree.
 *
 * A store caught in the middle of the vendor rewriting it answers null, which
 * means "not captured this time" and never means "empty". The next surface
 * that asks reads it again.
 */
export async function readSettledStore(
  d: StoreDeps,
  provider: LoginProviderId,
  dir: string | null
): Promise<StoreReading | null> {
  const first = await readStore(d, provider, dir);
  if (first.payload === null) return first.email === null ? null : first;
  await d.wait(SETTLE_MS);
  const second = await readStore(d, provider, dir);
  if (second.payload !== first.payload) return null;
  if (second.email !== first.email) return null;
  return second;
}

/** One file, as the one write in this domain sees it. */
function fileTarget(d: StoreDeps, path: string): SwapTarget {
  const staged = `${path}.tortie-pending`;
  return {
    read: () => d.readText(path),
    stage: (payload) => d.writeText(staged, payload),
    readStaged: () => d.readText(staged),
    // THE COMMIT IS A RENAME inside the same directory, which is the smallest
    // durable step a file system has: the store holds the old file or the new
    // one and never a half written one.
    commit: () => d.renamePath(staged, path),
    discard: () => d.removePath(staged)
  };
}

/** One keychain item, as the one write in this domain sees it. */
function keychainTarget(
  d: StoreDeps,
  service: string,
  account: string
): SwapTarget {
  const staged = `${service}.tortie-pending`;
  const put = async (name: string, payload: string): Promise<void> => {
    const ok = await keychainWrite(d.runner, name, account, payload);
    if (!ok) throw new Error('the keychain refused an item');
  };
  return {
    read: () => keychainRead(d.runner, service),
    stage: (payload) => put(staged, payload),
    readStaged: () => keychainRead(d.runner, staged),
    // `add-generic-password -U` UPDATES IN PLACE, measured: one item before,
    // one item after, and the access control list is the one the item had.
    commit: (payload) => put(service, payload),
    discard: () => keychainDelete(d.runner, staged)
  };
}

/**
 * Where a credential for this login would be written, or null when Tortie
 * refuses to write it.
 *
 * THE ONE REFUSAL, and it is the person's own sign in. `dir` is null for the
 * default login, which is the vendor's own location: Tortie reads it, keeps a
 * copy of it, and never writes it. Every other store is a directory Tortie
 * made, and the caller has already put that directory through the ownership
 * rule in `../logins/dirs.ts`.
 */
export async function storeTarget(
  d: StoreDeps,
  provider: LoginProviderId,
  dir: string | null
): Promise<SwapTarget | null> {
  if (dir === null || dir === '') return null;
  if (provider === 'codex') return fileTarget(d, codexAuthFileFor(d, dir));
  if (!d.keychainForClaude) {
    return fileTarget(d, claudeCredentialFileFor(d, dir));
  }
  const service = claudeWriteService(dir);
  // THE ACCOUNT ATTRIBUTE IS PRESERVED when the item is already there, because
  // the vendor finds its item by service AND account on some of its paths, and
  // an item whose account moved is an item the vendor cannot find. A store with
  // no item yet gets the same account the person's own store uses, and the
  // user name is the last resort.
  const existing = await keychainAccount(d.runner, service);
  const own = existing ?? (await ownAccountName(d));
  return keychainTarget(d, service, own);
}

/** The account attribute the person's own claude item carries, or the user name. */
async function ownAccountName(d: StoreDeps): Promise<string> {
  for (const service of claudeServicesFor(d, null)) {
    const found = await keychainAccount(d.runner, service);
    if (found !== null) return found;
  }
  return d.userName;
}
