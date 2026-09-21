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
 * ## ONE BACKEND, A SEALED FILE, AND THE KEYCHAIN READ ONCE (Phase 304)
 *
 * Until Phase 304 this store was a keychain item on macOS and a file with mode
 * 0600 everywhere else, and the keychain arm had a ceiling nobody chose: the
 * payload travelled to `security` as hex on one line, the line is cut above
 * 4,096 bytes, so about 1,946 bytes of credential was the most Tortie could
 * keep. His `~/.codex/auth.json` is 4,193 bytes and every observe of it had
 * been refused since Phase 204. Nothing but Tortie reads this store, so the
 * ceiling was self-inflicted; his ruling of 2026-09-20 was "i basically just
 * want it to always work" and "for it to not be overcomplicated".
 *
 * So there is ONE backend on every platform, {@link sealedVault}: one file per
 * slot, `<slot>.cred`, mode 0600, in a directory with mode 0700 that Tortie
 * made, holding the payload SEALED through a {@link VaultSeal} the caller
 * hands in. In the app that seal is Electron's `safeStorage`, whose key the
 * operating system keeps and binds to Tortie, the same seal `../settings/
 * store.ts` already trusts for the danger settings; `npm run
 * conformance:credentials` hands in one of its own, which is what lets it run
 * the SHIPPING write under plain node and make every step fail on purpose.
 * Never a credential in the clear on disk: a seal that cannot be made keeps
 * NOTHING, and says so through the one write's own sentence.
 *
 * THE KEYCHAIN IS READ ONLY, AND THAT IS THE MIGRATION. Items a tree before
 * Phase 304 kept still exist on his machine, under the profile-scoped names
 * Phase 208 gave them. {@link LegacyVault} is the type of what this file may
 * still do to them, being `get` and `del` and NEVER `put`, so no path through
 * this store can compose a `security` write line at all. A `get` that misses the
 * file asks the legacy item; on a hit it writes the sealed file, READS IT
 * BACK, and only then deletes the item. Every window holds two copies and
 * never zero, and the safe direction is the duplicate, which the boot pass in
 * `./migrate.ts` sweeps on a later launch.
 *
 * ## THE NAME CARRIES ITS PROFILE (Phase 208), and since Phase 304 it is only a name to READ
 *
 * Until Phase 208 the keychain name was `Tortie-credentials-<slot>` and nothing
 * in it said WHICH profile wrote it, so every Tortie process on one machine,
 * being the person's own app, every scratch profile probe under `build/` and
 * every harness run, addressed the SAME items; measured by the Phase 206 fix
 * round, a probe's observe wrote what it read into the item his real app reads.
 * {@link vaultServiceFor} takes the vault's scope, being the logins root of the
 * profile it is running in, and appends the first eight hex of its sha256
 * exactly the way `../usage/credentials.ts` scopes the vendor half. No admitted
 * slot holds a hyphen after its provider dot, and no scope digest is empty, so
 * no scoped name can equal an unscoped one, and nothing in this file can
 * compose the unscoped name at all. A file under `<userData>/gmux/logins/kept/`
 * is scoped by where it sits, so the composer now names only the item the
 * legacy arm reads and deletes, never one it writes.
 *
 * ## THE WRITE IS NOT HERE
 *
 * It is `./swap.ts`, and it is the same write the vendor's own stores get, so
 * there is one guarantee in this domain rather than two.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { LoginProviderId } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { LOGIN_ID_RE } from '../logins/dirs';
import { readTextNoFollowSync, renameNoFollowSync, writeNoFollowSync } from './nofollow';
import { keychainDelete, keychainRead, type SecurityRunner } from './security';
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

/**
 * The store behind the slots. One ships, {@link sealedVault}; the gate and the
 * tests inject others.
 */
export interface VaultBackend {
  get(slot: string): Promise<string | null>;
  put(slot: string, payload: string): Promise<void>;
  del(slot: string): Promise<void>;
}

/**
 * The seal Tortie's own store writes through (Phase 304).
 *
 * `wrap` answers the sealed form of a text, or null when no seal can be made
 * right now, which is the one answer that keeps nothing. `open` answers the
 * text a sealed blob holds, or null for a blob this seal did not write, one
 * sealed under another key, or garbage. Neither may throw, name a byte or
 * write a log line; `../credentials/index.ts` builds the real one over
 * Electron's `safeStorage` and is the only file that names Electron.
 */
export interface VaultSeal {
  wrap(text: string): string | null;
  open(blob: string): string | null;
}

/**
 * Where a credential a tree before Phase 304 kept can still be READ from,
 * and deleted once it has been moved (Phase 304).
 *
 * THE TYPE IS THE PROOF: it has `get` and `del` and no `put`, so nothing that
 * reaches a keychain through this store can write one, and the one keychain
 * write left in the domain is the vendor's own item in `./stores.ts`. `del`
 * says whether the item went, because a delete `security` refused leaves a
 * duplicate on the machine that the boot pass must count.
 */
export interface LegacyVault {
  get(slot: string): Promise<string | null>;
  del(slot: string): Promise<boolean>;
}

/** No keychain to read from, which is every platform but macOS and every harness launch without one. */
export const NO_LEGACY: LegacyVault = {
  get: async () => null,
  del: async () => false
};

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
 * that no caller can compose that by leaving something out. Since Phase 304 it
 * names only what {@link legacyKeychainVault} reads and deletes.
 */
export function vaultServiceFor(slot: string, scope: string): string {
  if (typeof scope !== 'string' || scope === '') {
    throw new Error('a vault service name needs the profile it belongs to');
  }
  return `${VAULT_SERVICE_PREFIX}${slot}-${vaultScopeDigest(scope)}`;
}

/**
 * The keychain items a tree before Phase 304 kept, as a place to read from
 * and delete and nothing else (Phase 304).
 *
 * BOTH ARGUMENTS ARE REQUIRED (Phase 208). A caller that has no scope has no
 * business in the keychain. The account is not passed, as it never was for
 * Tortie's own names: `./security.ts` refuses a vendor name without one, and
 * these names are not the vendor's.
 */
export function legacyKeychainVault(runner: SecurityRunner, scope: string): LegacyVault {
  const serviceFor = (slot: string): string => vaultServiceFor(slot, scope);
  return {
    get: (slot) => keychainRead(runner, serviceFor(slot), null),
    del: (slot) => keychainDelete(runner, serviceFor(slot), null)
  };
}

/**
 * The one backend (Phase 304): one sealed file per slot, mode 0600, in a
 * directory with mode 0700 that Tortie made, and the keychain read through
 * once on a miss.
 *
 * ## THE FILE
 *
 * `<dir>/<slot>.cred` holds what `seal.wrap` answered and never the payload.
 * The write stages at `<slot>.cred.writing` through `writeNoFollowSync` and
 * renames through `renameNoFollowSync`, for the reason `./nofollow.ts`
 * carries: a link planted at the staged name would otherwise send the sealed
 * bytes wherever it points. Those two calls are the same ones the file arm
 * made before this phase; what is new is that they now run on the shipping
 * platform, so the guard is load bearing on macOS for the first time. The
 * read is `readTextNoFollowSync` for the same reason, so a link planted at a
 * slot's name reads as a file that is not there.
 *
 * A SEAL THAT CANNOT BE MADE KEEPS NOTHING. `put` throws, names no byte and no
 * length, and `./swap.ts`'s stage catch turns that into the sentence it
 * already has, "Nothing could be written, so nothing changed." The observe
 * logs `refused` as it does for any refused keep, and the next observe keeps
 * the credential once the seal is available. The cost is named: a platform
 * with no OS keystore keeps nothing where the old file arm wrote a 0600
 * plaintext file, and nobody ships there.
 *
 * ## THE READ-THROUGH, and the order that never leaves zero copies
 *
 * A file that opens is a HIT, and a hit asks the keychain nothing. A file
 * that is absent or will not open (the seal unavailable, a foreign key,
 * garbage) is a miss, and a miss asks `legacy` for the slot. On a legacy hit:
 * write the sealed file through the same staged path, READ IT BACK through
 * the same seal, and only if it reads back equal delete the item. A kill or a
 * refusal at any step leaves the item, or the item and the file, and the next
 * `get` either reads through again or reads the file and leaves the duplicate
 * for `./migrate.ts`'s boot pass to sweep. The answer is the legacy bytes on
 * every arm of the read-through, so a caller is never told "nothing" about a
 * credential that exists.
 *
 * ## THE DELETE
 *
 * `del` of a slot removes the file and then asks `legacy` to delete the item,
 * so a login removed after this phase still clears the copy an older build
 * kept. `del` of a STAGED name, `<slot>.pending`, touches the file alone:
 * `./swap.ts` discards the staged place in a `finally` after every write, and
 * that discard must spawn nothing.
 */
export function sealedVault(dir: string, seal: VaultSeal, legacy: LegacyVault): VaultBackend {
  const pathOf = (slot: string): string => join(dir, `${slot}.cred`);

  /** The file, opened through the seal, or null for absent, empty or unopenable. */
  const readSealed = (slot: string): string | null => {
    const text = readTextNoFollowSync(pathOf(slot));
    if (text === null || text === '') return null;
    const opened = seal.open(text);
    return opened === '' ? null : opened;
  };

  const put = async (slot: string, payload: string): Promise<void> => {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const sealed = seal.wrap(payload);
    if (sealed === null) throw new Error('no seal could be made for this entry');
    const path = pathOf(slot);
    const writing = `${path}.writing`;
    // Not `writeFileSync`, for the reason `./nofollow.ts` carries.
    writeNoFollowSync(writing, sealed);
    renameNoFollowSync(writing, path);
  };

  return {
    get: async (slot) => {
      const opened = readSealed(slot);
      if (opened !== null) return opened;
      let held: string | null;
      try {
        held = await legacy.get(slot);
      } catch {
        held = null;
      }
      if (held === null) return null;
      // THE MIGRATION, in the one order that never leaves zero copies: the
      // file written, the file read back through the seal, and only then the
      // item deleted. The answer is `held` whatever happens below.
      try {
        await put(slot, held);
      } catch {
        // No seal right now. Both copies stay: the item, and nothing new.
        return held;
      }
      if (readSealed(slot) !== held) return held;
      try {
        await legacy.del(slot);
      } catch {
        // The item stays beside the file, and the boot pass sweeps it later.
      }
      return held;
    },
    put,
    del: async (slot) => {
      try {
        rmSync(pathOf(slot), { force: true });
      } catch {
        // A slot that will not go is not a failure of the caller's operation.
      }
      if (slot.endsWith('.pending')) return;
      try {
        await legacy.del(slot);
      } catch {
        // An item that will not go leaves a copy in the keychain and nothing
        // else, and the next launch's boot pass counts it.
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
 * that is never written again keeps it. The Phase 204 reverify recorded this
 * as not blocking, because it sits inside a 0600 directory beside credentials
 * Tortie already holds; it should still not survive a crash, which is what
 * `../credentials/keep.ts`'s once per run sweep now uses this for.
 *
 * ## IT READS BEFORE IT DELETES, and that is not an optimisation
 *
 * The sweep runs in EVERY profile, being the person's own and every scratch
 * profile a probe or a harness run makes. Until Phase 304 this backend's store
 * on macOS was the person's login keychain rather than anything inside the
 * profile, so a delete asked for here with no evidence there was anything to
 * remove was a reach into the person's keychain namespace on every launch of
 * every probe in this tree, which is what the Phase 206 verifier measured. A
 * `get` that answers null ends the call, and the delete is only ever asked
 * for a staged place this backend has just said is there. Since Phase 304 the
 * staged delete touches a file inside the profile and spawns nothing at all;
 * the `get` on a miss may still ask the keychain once for a staged item a
 * tree before Phase 304 left, and if one is there it is moved into the staged
 * file and removed with it, so the leftover is gone either way.
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
