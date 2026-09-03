/**
 * The credential store Tortie owns (Phase 204).
 *
 * ## WHAT THIS IS, AND THE REFUSAL IT LIFTS
 *
 * Phase 202 said Tortie never writes a credential byte. That rule had a cost
 * the operator named on 2026-09-02: typing `/login` inside a session
 * overwrites the credential in that store, the account that was there is gone,
 * and Tortie cannot offer it back. He weighed that and chose the orca
 * behaviour, so THIS PHASE LIFTS THAT ONE REFUSAL and nothing else. No agent
 * signs anybody in, the vendor's own command is still the only thing that
 * authenticates, and Tortie still never writes the person's own default store.
 *
 * ## ONE ENTRY PER LOGIN, AND ONE FOR THE STORE TORTIE DOES NOT OWN
 *
 * A slot is `<provider>.<login id>` for a login Tortie made, and
 * `<provider>.default` for the vendor's own location. The default slot is a
 * ROLLING COPY, and it is the whole reason an account he just left can be
 * offered back: by the time Tortie notices the change, the store itself holds
 * the NEW account and the old bytes exist nowhere else on the machine.
 *
 * ## THE BACKENDS ARE ONE SEAM
 *
 * A keychain item on macOS, named `Tortie-credentials-<slot>-<scope>`, and a
 * file with mode 0600 everywhere else. Both are reached through
 * {@link VaultBackend}, so `npm run conformance:credentials` runs the SHIPPING
 * write over an injected backend and can make every step fail on purpose.
 *
 * ## THE NAME CARRIES ITS PROFILE (Phase 208)
 *
 * Until Phase 208 the keychain name was `Tortie-credentials-<slot>` and nothing
 * in it said WHICH profile wrote it, while the vendor half has carried a digest
 * of its directory since Phase 203. So every Tortie process on one machine,
 * being the person's own app, every scratch profile probe under `build/` and
 * every harness run, addressed the SAME items, and the default slot is one
 * every profile has. Measured by the Phase 206 fix round: a probe on a scratch
 * profile with `CLAUDE_CONFIG_DIR` pointed at a directory it made fell back to
 * the person's own unscoped vendor item, and its observe wrote what it read
 * into `Tortie-credentials-claude.default`, the item his real app reads, twice
 * inside probe runs. A probe that planted a credential in a scratch DEFAULT
 * store would have put that planted credential in front of him as a kept
 * account. {@link vaultServiceFor} now takes the vault's scope, being the
 * logins root of the profile it is running in, and appends the first eight hex
 * of its sha256 exactly the way `../usage/credentials.ts` scopes the vendor
 * half. No admitted slot holds a hyphen after its provider dot, and no scope
 * digest is empty, so no scoped name can equal an unscoped one. Nothing in
 * this file can compose the unscoped name at all.
 *
 * ## THE WRITE IS NOT HERE
 *
 * It is `./swap.ts`, and it is the same write the vendor's own stores get, so
 * there is one guarantee in this domain rather than two.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { LoginProviderId } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { LOGIN_ID_RE } from '../logins/dirs';
import { renameNoFollowSync, writeNoFollowSync } from './nofollow';
import {
  keychainDelete,
  keychainRead,
  keychainWrite,
  type SecurityRunner
} from './security';
import { safeSwap, type SwapResult, type SwapStep, type SwapTarget } from './swap';

/** The slot the vendor's own location's rolling copy lives in. */
export const DEFAULT_SLOT_ID = 'default';

/** A slot name, and the only shape one ever takes. */
export function slotFor(provider: LoginProviderId, id: string | null): string {
  return `${provider}.${id ?? DEFAULT_SLOT_ID}`;
}

/**
 * Is this a slot name Tortie minted?
 *
 * ASKED ON THE WAY OUT of the record file as well as on the way in, for the
 * reason a login id is: that file is one an agent with write access to the
 * home directory could edit, and a slot name is half of a keychain service
 * name and half of a file path.
 */
export function isSlotName(slot: unknown): slot is string {
  if (typeof slot !== 'string') return false;
  const cut = slot.indexOf('.');
  if (cut < 0) return false;
  const provider = slot.slice(0, cut);
  const id = slot.slice(cut + 1);
  if (!LOGIN_PROVIDERS.includes(provider as LoginProviderId)) return false;
  return id === DEFAULT_SLOT_ID || LOGIN_ID_RE.test(id);
}

/** The staged place beside a real slot. Never a slot a login could have. */
export function stagedSlotFor(slot: string): string {
  return `${slot}.pending`;
}

/** The store behind the slots. Two ship; the gate injects a third. */
export interface VaultBackend {
  readonly kind: 'keychain' | 'file';
  get(slot: string): Promise<string | null>;
  put(slot: string, payload: string): Promise<void>;
  del(slot: string): Promise<void>;
}

/** What every keychain name Tortie's own store composes begins with. */
export const VAULT_SERVICE_PREFIX = 'Tortie-credentials-';

/**
 * The eight hex characters that name one profile, out of its vault scope.
 *
 * The same shape `../usage/credentials.ts`'s `claudeScopedService` has used
 * for the vendor half since Phase 203, over the same function, so a reader who
 * knows one knows the other. The scope is the logins root, which is
 * `<userData>/gmux/logins`, so two profiles on one machine never share a
 * digest and one profile keeps the same digest across every launch.
 */
export function vaultScopeDigest(scope: string): string {
  return createHash('sha256').update(scope).digest('hex').slice(0, 8);
}

/**
 * The keychain service name for one slot IN ONE PROFILE. Tortie's own, never a
 * vendor's, and never the unscoped name a tree before Phase 208 wrote.
 *
 * The scope is REQUIRED and an empty one is refused, because a name with no
 * digest is exactly the unscoped name, and the whole point of this function is
 * that no caller can compose that by leaving something out.
 */
export function vaultServiceFor(slot: string, scope: string): string {
  if (typeof scope !== 'string' || scope === '') {
    throw new Error('a vault service name needs the profile it belongs to');
  }
  return `${VAULT_SERVICE_PREFIX}${slot}-${vaultScopeDigest(scope)}`;
}

/** The account attribute Tortie's own items carry. */
export const VAULT_ACCOUNT = 'tortie';

/**
 * The macOS backend: one keychain item per slot, in the login keychain, named
 * for the profile that owns it.
 *
 * It never passes `-A`, so the item's access control list is the ordinary one
 * and the payload never reaches an argv. Both measurements are in
 * ./security.ts.
 *
 * BOTH ARGUMENTS ARE REQUIRED (Phase 208). The runner used to default to the
 * real `security` and the scope did not exist, which is how `index.ts` came to
 * hold the profile root and throw it away. A caller that has no scope has no
 * business in the keychain.
 */
export function keychainVault(runner: SecurityRunner, scope: string): VaultBackend {
  const serviceFor = (slot: string): string => vaultServiceFor(slot, scope);
  return {
    kind: 'keychain',
    get: (slot) => keychainRead(runner, serviceFor(slot)),
    put: async (slot, payload) => {
      const ok = await keychainWrite(runner, serviceFor(slot), VAULT_ACCOUNT, payload);
      if (!ok) throw new Error('the keychain refused an entry');
    },
    del: (slot) => keychainDelete(runner, serviceFor(slot))
  };
}

/**
 * The everywhere else backend: one file per slot, mode 0600, in a directory
 * with mode 0700 that Tortie made.
 */
export function fileVault(dir: string): VaultBackend {
  const pathOf = (slot: string): string => join(dir, `${slot}.cred`);
  return {
    kind: 'file',
    get: async (slot) => {
      try {
        const text = readFileSync(pathOf(slot), 'utf8');
        return text === '' ? null : text;
      } catch {
        return null;
      }
    },
    put: async (slot, payload) => {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const path = pathOf(slot);
      const writing = `${path}.writing`;
      // Not `writeFileSync`, for the reason `./nofollow.ts` carries.
      writeNoFollowSync(writing, payload);
      renameNoFollowSync(writing, path);
    },
    del: async (slot) => {
      try {
        rmSync(pathOf(slot), { force: true });
      } catch {
        // A slot that will not go is not a failure of the caller's operation.
      }
    }
  };
}

/** One slot, as the one write in this domain sees it. */
export function vaultTarget(backend: VaultBackend, slot: string): SwapTarget {
  const staged = stagedSlotFor(slot);
  return {
    read: () => backend.get(slot),
    stage: (payload) => backend.put(staged, payload),
    readStaged: () => backend.get(staged),
    commit: (payload) => backend.put(slot, payload),
    discard: () => backend.del(staged)
  };
}

/** Keep a payload in a slot, through the one write. */
export async function vaultPut(
  backend: VaultBackend,
  slot: string,
  payload: string,
  stopAfter?: SwapStep
): Promise<SwapResult> {
  if (!isSlotName(slot)) {
    return { ok: false, reason: 'That is not a slot Tortie owns.' };
  }
  return safeSwap(vaultTarget(backend, slot), payload, stopAfter);
}

/** What a slot holds, or null. */
export async function vaultGet(
  backend: VaultBackend,
  slot: string
): Promise<string | null> {
  if (!isSlotName(slot)) return null;
  try {
    return await backend.get(slot);
  } catch {
    return null;
  }
}

/**
 * Drop the staged place beside a slot, and never the slot itself (Phase 206).
 *
 * A crash runs no `finally`, so a kill between a stage and its discard leaves
 * a WHOLE credential at `<slot>.pending`. `./swap.ts` discards in a `finally`
 * and a later successful write to the same slot discards it too, but a slot
 * that is never written again keeps it, and on macOS that is a second keychain
 * item holding a credential. The Phase 204 reverify recorded this as not
 * blocking, because it sits inside a 0600 directory beside credentials Tortie
 * already holds; it should still not survive a crash, which is what
 * `../credentials/keep.ts`'s once per run sweep now uses this for.
 *
 * ## IT READS BEFORE IT DELETES, and that is not an optimisation
 *
 * The sweep runs in EVERY profile, being the person's own and every scratch
 * profile a probe or a harness run makes, and on macOS this backend's store is
 * the person's login keychain rather than anything inside the profile. So a
 * delete asked for here is a delete asked of a store the profile does not own.
 * Asking for one with no evidence there is anything to remove is a reach into
 * the person's keychain namespace on every launch of every probe in this tree,
 * which is what the Phase 206 verifier measured. A `get` that answers null
 * ends the call, and the delete is only ever asked for a staged place this
 * backend has just said is there.
 */
export async function vaultDiscardStaged(
  backend: VaultBackend,
  slot: string
): Promise<void> {
  if (!isSlotName(slot)) return;
  const staged = stagedSlotFor(slot);
  try {
    if ((await backend.get(staged)) === null) return;
    await backend.del(staged);
  } catch {
    // A leftover that will not go changes nothing about what the slot holds.
  }
}

/** Forget a slot. Called when a login is removed. */
export async function vaultDel(backend: VaultBackend, slot: string): Promise<void> {
  if (!isSlotName(slot)) return;
  try {
    await backend.del(slot);
    await backend.del(stagedSlotFor(slot));
  } catch {
    // A slot that will not go leaves a credential in Tortie's own store and
    // nothing else, which is not worth failing a remove for.
  }
}
