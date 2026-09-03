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
 * A keychain item on macOS, named `Tortie-credentials-<slot>`, and a file with
 * mode 0600 everywhere else. Both are reached through {@link VaultBackend},
 * so `npm run conformance:credentials` runs the SHIPPING write over an
 * injected backend and can make every step fail on purpose.
 *
 * ## THE WRITE IS NOT HERE
 *
 * It is `./swap.ts`, and it is the same write the vendor's own stores get, so
 * there is one guarantee in this domain rather than two.
 */

import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LoginProviderId } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { LOGIN_ID_RE } from '../logins/dirs';
import {
  defaultSecurityRunner,
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

/** The keychain service name for one slot. Tortie's own, never a vendor's. */
export function vaultServiceFor(slot: string): string {
  return `Tortie-credentials-${slot}`;
}

/** The account attribute Tortie's own items carry. */
export const VAULT_ACCOUNT = 'tortie';

/**
 * The macOS backend: one keychain item per slot, in the login keychain.
 *
 * It never passes `-A`, so the item's access control list is the ordinary one
 * and the payload never reaches an argv. Both measurements are in
 * ./security.ts.
 */
export function keychainVault(
  runner: SecurityRunner = defaultSecurityRunner()
): VaultBackend {
  return {
    kind: 'keychain',
    get: (slot) => keychainRead(runner, vaultServiceFor(slot)),
    put: async (slot, payload) => {
      const ok = await keychainWrite(
        runner,
        vaultServiceFor(slot),
        VAULT_ACCOUNT,
        payload
      );
      if (!ok) throw new Error('the keychain refused an entry');
    },
    del: (slot) => keychainDelete(runner, vaultServiceFor(slot))
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
      writeFileSync(writing, payload, { encoding: 'utf8', mode: 0o600 });
      chmodSync(writing, 0o600);
      renameSync(writing, path);
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
