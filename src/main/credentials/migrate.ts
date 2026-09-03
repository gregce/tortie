/**
 * The one move Phase 208 makes on the person's own keychain, and the ONLY file
 * that can name the item it moves (Phase 208).
 *
 * ## WHAT IS BEING MOVED, AND WHY IT IS A MIGRATION
 *
 * Before Phase 208 Tortie's own store named its keychain items
 * `Tortie-credentials-<slot>` with no profile in the name. `./vault.ts` now
 * names them `Tortie-credentials-<slot>-<digest of the logins root>`, so an
 * item written under the old name became UNREFERENCED the moment the name
 * moved, and a credential nobody can reach is exactly the defect Phase 206
 * item 1 exists to stop. The phase had two answers open to it, being to read
 * the old name once from the person's own profile and rewrite it under the
 * new one and delete the old, or to leave it and tell him. THIS IS THE FIRST
 * ANSWER, and the reason is Phase 206's: a credential nobody can reach is
 * worse than one they can. It costs a handful of `security` calls on the
 * first launch after the phase lands and nothing on any launch after.
 *
 * ## ONLY THE PERSON'S OWN PROFILE MAY READ OR DELETE THE OLD NAME
 *
 * The old name is not scoped, so every profile on the machine could reach it,
 * and that is the whole defect. {@link migrateUnscopedVault} therefore refuses
 * as its FIRST act unless the caller has proved it runs in the person's own
 * profile, and the proof is {@link isOwnProfile}: not a harness launch of any
 * kind, and a userData directory that is exactly the one Electron would choose
 * with no `--user-data-dir` given. A scratch profile fails the second test and
 * every probe under `build/` fails the first, so neither can compose the old
 * name at all: {@link unscopedVaultServiceFor} is reached from one function,
 * that function returns before calling it when the proof is missing, and
 * `npm run conformance:credentials` scans for a second composer and drives
 * both branches under ablation.
 *
 * ## THE RULE WHEN BOTH NAMES HOLD SOMETHING
 *
 * The scoped item is this profile's own later write, so it wins, with one
 * exception: when the record file names the OLD item's bytes and not the new
 * one's, the old item is what this profile recorded and the scoped copy is
 * stale, so the scoped one is rewritten from the old. That is the shape an
 * older build leaves when it runs again in the same profile after a newer one.
 * Either way the old item is deleted once the scoped one is proved, by reading
 * it back, to hold what the record can reach.
 *
 * ## WHAT NEVER HAPPENS HERE
 *
 * Nothing is logged, no payload or digest is returned, and the delete is asked
 * only after the scoped item has been read back equal. A read back that
 * disagrees leaves the old item exactly where it was and says so in a count.
 */

import { join, resolve } from 'node:path';
import { isHarnessLaunch } from '../harness/launch-gate';
import { credentialDigest } from './payload';
import { readKeptFile } from './kept';
import { keychainDelete, keychainRead, type SecurityRunner } from './security';
import {
  isSlotName,
  stagedSlotFor,
  VAULT_SERVICE_PREFIX,
  vaultGet,
  vaultPut,
  type VaultBackend
} from './vault';

/**
 * The name a tree before Phase 208 wrote. THE ONLY COMPOSER OF IT, and it is
 * deliberately not exported from the domain barrel.
 */
export function unscopedVaultServiceFor(slot: string): string {
  return `${VAULT_SERVICE_PREFIX}${slot}`;
}

/** What the caller must know to prove it is the person's own profile. */
export interface ProfileShape {
  /** `app.getPath('userData')`, which a `--user-data-dir` moves. */
  userData: string;
  /** `app.getPath('appData')`, which nothing a probe passes moves. */
  appData: string;
  /** `app.getName()`, which is `Tortie`. */
  appName: string;
  env: NodeJS.ProcessEnv;
}

/**
 * Is this process running in the person's own profile?
 *
 * TWO TESTS AND BOTH MUST PASS. A harness launch of any kind is refused by the
 * widest predicate the harness has, so `GMUX_PROBES` at any value is enough to
 * refuse. And the userData directory must be the one Electron composes on its
 * own, being `<appData>/<appName>`, which is what every scratch profile moves
 * with `--user-data-dir`. Compared after `resolve`, so a trailing separator
 * does not make the person's own profile read as somebody else's.
 */
export function isOwnProfile(shape: ProfileShape): boolean {
  if (isHarnessLaunch(shape.env)) return false;
  if (shape.userData === '' || shape.appData === '' || shape.appName === '') {
    return false;
  }
  return resolve(shape.userData) === resolve(join(shape.appData, shape.appName));
}

/** What the caller hands in. Every seam is an argument, so the gate can drive it. */
export interface MigrateDeps {
  runner: SecurityRunner;
  vault: VaultBackend;
  /** The logins root, which the record file sits in. */
  root: string;
  /** The slots worth asking about, being every slot this profile could name. */
  slots: readonly string[];
  /** The answer of {@link isOwnProfile}. False refuses before any name is composed. */
  ownProfile: boolean;
}

/** Counts and nothing else. No name, no digest, no payload. */
export interface MigrateResult {
  /** True when the refusal fired and nothing at all was asked of the keychain. */
  refused: boolean;
  /** Slots whose old item was rewritten under the scoped name. */
  moved: number;
  /** Old items deleted, staged leftovers included. */
  deleted: number;
  /** Old items left in place because the scoped copy did not read back equal. */
  kept: number;
}

/**
 * Move every unscoped item this profile can name under its scoped name.
 *
 * THE REFUSAL IS THE FIRST LINE. Nothing below it runs, and so nothing below
 * it composes, unless the caller proved it is the person's own profile.
 */
export async function migrateUnscopedVault(d: MigrateDeps): Promise<MigrateResult> {
  const out: MigrateResult = { refused: false, moved: 0, deleted: 0, kept: 0 };
  if (d.ownProfile !== true) {
    out.refused = true;
    return out;
  }
  const { file } = readKeptFile(d.root);
  for (const slot of d.slots) {
    if (!isSlotName(slot)) continue;
    // A STAGED LEFTOVER UNDER THE OLD NAME is a crash's residue that no sweep
    // can reach any more, and it is never the slot's own credential, so it
    // goes without being moved. Read first, for the reason vault.ts gives:
    // a delete is only ever asked for an item the keychain just said is there.
    const staged = unscopedVaultServiceFor(stagedSlotFor(slot));
    if ((await safeRead(d.runner, staged)) !== null) {
      await keychainDelete(d.runner, staged);
      out.deleted += 1;
    }
    const legacy = unscopedVaultServiceFor(slot);
    const held = await safeRead(d.runner, legacy);
    if (held === null) continue;
    const scoped = await vaultGet(d.vault, slot);
    let rewrite = scoped === null;
    if (scoped !== null && scoped !== held) {
      const record = file.slots[slot];
      const heldDigest = credentialDigest(held);
      if (
        record !== undefined &&
        record.digest === heldDigest &&
        credentialDigest(scoped) !== heldDigest
      ) {
        rewrite = true;
      }
    }
    if (rewrite) {
      const put = await vaultPut(d.vault, slot, held);
      if (!put.ok) {
        out.kept += 1;
        continue;
      }
      out.moved += 1;
    }
    // THE OLD ITEM GOES ONLY WHEN THE SCOPED ONE IS PROVED, by reading it back,
    // to hold what this profile can reach. When nothing was rewritten that is
    // the scoped copy already there, which the record names or which holds the
    // same bytes, and the old item is a duplicate nobody can reach.
    const proof = await vaultGet(d.vault, slot);
    if (proof === null || (rewrite && proof !== held)) {
      out.kept += 1;
      continue;
    }
    await keychainDelete(d.runner, legacy);
    out.deleted += 1;
  }
  return out;
}

async function safeRead(runner: SecurityRunner, service: string): Promise<string | null> {
  try {
    return await keychainRead(runner, service);
  } catch {
    return null;
  }
}
