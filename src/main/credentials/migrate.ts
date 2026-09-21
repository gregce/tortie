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
 * ## SINCE PHASE 304 THE SCOPED PLACE IS A SEALED FILE, and the pass sweeps too
 *
 * Tortie's own store is one backend on every platform, a `safeStorage`-sealed
 * file under the profile, and the keychain is READ ONLY for it: `./vault.ts`
 * reads a scoped item through on a miss, writes the file, reads it back and
 * only then deletes the item. Nothing here is rewritten for that: `vaultPut`
 * now writes the sealed file, so the unscoped move lands there, and the rule
 * below about the record deciding between two copies is the same rule. What
 * this pass gains is the one shape the read-through cannot reach, a scoped
 * item left BESIDE a sealed file by a kill or a refused delete between the
 * read-back and the delete, because a `get` that hits asks the keychain
 * nothing. It costs one `find-generic-password` per kept slot per launch, on
 * the person's own profile alone, and the counts on the boot line carry it.
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
 * it back, to hold what the record can reach. For the Phase 304 pair, a sealed
 * file beside a scoped item, the same rule has a fourth shape: the bytes
 * differ and the record names NEITHER, and then nothing is deleted, because
 * the safe direction is always the duplicate and never zero copies.
 *
 * ## WHAT NEVER HAPPENS HERE
 *
 * Nothing is logged, no payload or digest is returned, and the delete is asked
 * only after the scoped item has been read back equal. A read back that
 * disagrees leaves the old item exactly where it was and says so in a count.
 */

import { realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isHarnessLaunch } from '../harness/launch-gate';
import { credentialDigest } from './payload';
import { readKeptFile, type KeptRecord } from './kept';
import { keychainDelete, keychainRead, type SecurityRunner } from './security';
import {
  isSlotName,
  stagedSlotFor,
  VAULT_SERVICE_PREFIX,
  vaultGet,
  vaultPut,
  type LegacyVault,
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

/** WHY a profile is not the person's own, or `'own'` when it is. */
export type ProfileVerdict =
  /** The person's own profile. The migration may run. */
  | 'own'
  /** A harness launch of any kind, being any `GMUX_*` knob the predicate knows. */
  | 'harness'
  /** Electron answered an empty path or an empty name. */
  | 'no-paths'
  /** A userData directory that is not `<appData>/<appName>`, spelled or real. */
  | 'elsewhere';

/**
 * Is this process running in the person's own profile, and if not, WHY?
 *
 * TWO TESTS AND BOTH MUST PASS. A harness launch of any kind is refused by the
 * widest predicate the harness has, so `GMUX_PROBES` at any value is enough to
 * refuse. And the userData directory must be the one Electron composes on its
 * own, being `<appData>/<appName>`, which is what every scratch profile moves
 * with `--user-data-dir`. Compared after `resolve`, so a trailing separator
 * does not make the person's own profile read as somebody else's.
 *
 * THE REAL PATHS ARE ASKED SECOND (Phase 219), and the Phase 208 verifier's
 * finding is why. `resolve` does no input and output at all, so it never
 * follows a link: a person whose home, or whose `Library/Application Support`,
 * is reached through a symbolic link gets one side of that comparison spelled
 * through the link and the other spelled around it, the two strings differ,
 * and the migration is refused for ever. The credential a tree before Phase
 * 208 wrote then stays under the unscoped name where nothing can reach it.
 * Both MIXED shapes read false and both matched shapes read true, which is
 * how it was measured. `realpathSync` is asked only when the strings already
 * disagree and only about paths Electron itself composed, so it can turn a
 * refusal into a pass and never the other way round; a scratch profile moved
 * by `--user-data-dir` still really is a different directory, so it gains
 * nothing, and the harness test above it has already run.
 *
 * THE REASON IS THE ANSWER, not a boolean, because a refusal with no reason is
 * the other half of the same finding: the only trace of one was `refused:true`
 * in a log line, and that was indistinguishable from "not macOS" and from a
 * probe's own deliberate refusal.
 */
export function ownProfileVerdict(shape: ProfileShape): ProfileVerdict {
  if (isHarnessLaunch(shape.env)) return 'harness';
  if (shape.userData === '' || shape.appData === '' || shape.appName === '') {
    return 'no-paths';
  }
  const own = resolve(join(shape.appData, shape.appName));
  const here = resolve(shape.userData);
  if (here === own) return 'own';
  try {
    if (realpathSync(here) === realpathSync(own)) return 'own';
  } catch {
    // One of the two is not on disk. That is not the person's own profile
    // being reached through a link, it is a path that does not exist.
  }
  return 'elsewhere';
}

/** {@link ownProfileVerdict} as the boolean every earlier caller asked for. */
export function isOwnProfile(shape: ProfileShape): boolean {
  return ownProfileVerdict(shape) === 'own';
}

/** What the caller hands in. Every seam is an argument, so the gate can drive it. */
export interface MigrateDeps {
  runner: SecurityRunner;
  vault: VaultBackend;
  /**
   * The SCOPED items a tree before Phase 304 kept, as the read-only arm
   * `./vault.ts` reads them through (Phase 304). The pass asks it about a
   * slot whose sealed file already answers, because that is the one shape the
   * read-through cannot reach: a hit asks the keychain nothing, so a duplicate
   * a kill or a refused delete left beside the file would stay for ever.
   */
  legacy: LegacyVault;
  /** The logins root, which the record file sits in. */
  root: string;
  /** The slots worth asking about, being every slot this profile could name. */
  slots: readonly string[];
  /**
   * The answer of {@link ownProfileVerdict}. Anything but `'own'` refuses
   * before a single name is composed, and the reason is carried out again in
   * {@link MigrateResult.reason} so the boot line can say which.
   */
  ownProfile: ProfileVerdict;
}

/** Why a whole migration was refused. `null` when it ran. */
export type MigrateRefusal = Exclude<ProfileVerdict, 'own'> | 'not-keychain';

/** Counts and a reason, and nothing else. No name, no digest, no payload. */
export interface MigrateResult {
  /** True when the refusal fired and nothing at all was asked of the keychain. */
  refused: boolean;
  /**
   * WHICH refusal, so a log line says something a person could act on
   * (Phase 219). `refused` alone read the same for "not macOS", for a probe
   * and for a home behind a symbolic link, which is how the third of those
   * went unnoticed for eleven phases.
   */
  reason: MigrateRefusal | null;
  /** Slots whose old item was rewritten under the scoped name. */
  moved: number;
  /** Old items deleted, staged leftovers included. */
  deleted: number;
  /** Old items left in place because the scoped copy did not read back equal. */
  kept: number;
  /**
   * Deletes `security` did not answer 0 to (Phase 219).
   *
   * `keychainDelete` used to answer `void`, so a delete that failed every time
   * was counted as a delete that happened: a runner refusing all six left
   * `{moved: 0, deleted: 2, kept: 0}` and the old item still in the keychain.
   * A number here means an item Tortie believed it had cleaned up is still on
   * the machine, and the next launch's migration will find it again.
   */
  failed: number;
}

/**
 * Move every unscoped item this profile can name under its scoped name.
 *
 * THE REFUSAL IS THE FIRST LINE. Nothing below it runs, and so nothing below
 * it composes, unless the caller proved it is the person's own profile.
 */
export async function migrateUnscopedVault(d: MigrateDeps): Promise<MigrateResult> {
  const out: MigrateResult = {
    refused: false,
    reason: null,
    moved: 0,
    deleted: 0,
    kept: 0,
    failed: 0
  };
  if (d.ownProfile !== 'own') {
    out.refused = true;
    out.reason = d.ownProfile;
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
      // ONLY A DELETE THAT SUCCEEDED IS COUNTED AS ONE (Phase 219).
      if (await keychainDelete(d.runner, staged, null)) out.deleted += 1;
      else out.failed += 1;
    }
    // PHASE 304. A SCOPED ITEM BESIDE A SEALED FILE IS A DUPLICATE the
    // read-through left when a kill or a refused delete fell between its
    // read-back and its delete. A miss on the file below migrates on its own,
    // so only a slot whose file answers is asked about here. Four shapes:
    // the same bytes on both sides, so the item is a duplicate and goes; the
    // record naming the FILE's bytes, so the file is this profile's own and
    // the item goes; the older build rule further down applied to this pair,
    // being the record naming the ITEM's bytes and not the file's, because an
    // older build wrote the item after this profile had a file, so the file is
    // rewritten from the item first and `vaultPut` has read it back before it
    // answers ok; and the bytes differing with the record naming NEITHER,
    // which is the fourth shape below.
    const sealed = await vaultGet(d.vault, slot);
    if (sealed !== null) {
      const twin = await safeLegacy(d.legacy, slot);
      if (twin !== null) {
        const record = file.slots[slot];
        let proved = true;
        if (twin !== sealed && recordNames(record, twin) && !recordNames(record, sealed)) {
          proved = (await vaultPut(d.vault, slot, twin)).ok;
          if (proved) out.moved += 1;
        } else if (twin !== sealed && !recordNames(record, sealed)) {
          // THE FOURTH SHAPE (Phase 304's fix round). The bytes differ and the
          // record names NEITHER copy, because kept.json is gone, unreadable
          // or its row was dropped. Nothing proves which copy this profile
          // can reach, so neither is destroyed: both stay, counted as kept,
          // and the next launch asks again. Before this guard `proved` stayed
          // true here and the item was deleted, which left its bytes nowhere,
          // the one arm in the phase that destroyed an unproven copy.
          proved = false;
        }
        if (!proved) out.kept += 1;
        else if (await d.legacy.del(slot)) out.deleted += 1;
        else out.failed += 1;
      }
    }
    const old = unscopedVaultServiceFor(slot);
    const held = await safeRead(d.runner, old);
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
    if (await keychainDelete(d.runner, old, null)) out.deleted += 1;
    else out.failed += 1;
  }
  return out;
}

async function safeRead(runner: SecurityRunner, service: string): Promise<string | null> {
  try {
    return await keychainRead(runner, service, null);
  } catch {
    return null;
  }
}

/** The legacy arm's answer, with a throw read as nothing there (Phase 304). */
async function safeLegacy(legacy: LegacyVault, slot: string): Promise<string | null> {
  try {
    return await legacy.get(slot);
  } catch {
    return null;
  }
}

/** Does the record name these bytes as the ones this profile recorded? */
function recordNames(record: KeptRecord | undefined, payload: string): boolean {
  return record !== undefined && record.digest === credentialDigest(payload);
}
