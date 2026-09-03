/**
 * The credentials domain barrel, and the one place the real seams are built
 * (Phase 204).
 *
 * EVERYTHING BELOW THIS FILE TAKES ITS WORLD AS AN ARGUMENT, which is what
 * lets `npm run conformance:credentials` run the SHIPPING modules under plain
 * node over an injected keychain, an injected file system and an injected
 * clock. This file is the only one in the domain that names Electron, the
 * process environment or the person's home directory.
 *
 * THE LIVE SESSIONS SEAM IS INSTALLED FROM THE BOOT rather than imported here,
 * because the sessions domain already reaches this one through the launch
 * plan, and an import the other way would be a cycle. `../capabilities.ts`
 * installs it beside the other registrars.
 */

import { app } from 'electron';
import { readFile, rm } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { loginsRoot } from '../logins/paths';
import { renameNoFollowSync, writeNoFollowSync } from './nofollow';
import { defaultSecurityRunner } from './security';
import type { StoreDeps } from './stores';
import { sweepableSlots, type KeepDeps, type LiveSession } from './keep';
import { isOwnProfile, migrateUnscopedVault, type MigrateResult } from './migrate';
import { fileVault, keychainVault, type VaultBackend } from './vault';

export {
  activateLogin,
  type Observation,
  finishStrayLogins,
  forgetLogin,
  keptFactsFor,
  observeProvider,
  NO_KEPT_FACTS,
  type ActivateResult,
  type KeepDeps,
  type KeepEvent,
  type KeptFacts,
  type LiveSession
} from './keep';
export { readKeptFile, writeKeptFile, type KeptFile, type KeptRecord } from './kept';
export { isOwnProfile, type MigrateResult, type ProfileShape } from './migrate';
export {
  CREDENTIAL_FILE_MODE,
  renameNoFollowSync,
  writeNoFollowSync
} from './nofollow';
export { credentialDigest, isCredentialPayload } from './payload';
export {
  forgetStore,
  readSettledStore,
  readStore,
  storeTarget,
  type StoreDeps
} from './stores';
export { safeSwap, type SwapResult, type SwapStep, type SwapTarget } from './swap';
export {
  fileVault,
  keychainVault,
  slotFor,
  stagedSlotFor,
  vaultDiscardStaged,
  vaultGet,
  vaultPut,
  vaultScopeDigest,
  vaultServiceFor,
  VAULT_SERVICE_PREFIX,
  type VaultBackend
} from './vault';

/** True when a claude credential lives in the keychain on this machine. */
function keychainIsTheStore(): boolean {
  return process.platform === 'darwin';
}

/** The file system seams, written once. */
function defaultStoreDeps(): StoreDeps {
  return {
    runner: defaultSecurityRunner(),
    readText: async (path) => {
      try {
        return await readFile(path, 'utf8');
      } catch {
        return null;
      }
    },
    // THE STAGED PLACE IS NEVER FOLLOWED. `./nofollow.ts` carries the whole
    // reason, being a link planted at a staged name that sends the write into
    // the person's own store and reads back through itself so the check
    // passes.
    writeText: async (path, text) => {
      writeNoFollowSync(path, text);
    },
    renamePath: async (from, to) => {
      renameNoFollowSync(from, to);
    },
    removePath: async (path) => {
      try {
        await rm(path, { force: true });
      } catch {
        // A staged copy that will not go changes nothing about the store.
      }
    },
    env: process.env,
    home: homedir(),
    keychainForClaude: keychainIsTheStore(),
    userName: userInfo().username,
    wait: (ms) => new Promise<void>((r) => setTimeout(r, ms))
  };
}

/**
 * Tortie's own store, being a keychain item per entry on macOS and a file with
 * mode 0600 in a directory with mode 0700 everywhere else.
 *
 * THE ROOT IS HANDED THROUGH ON BOTH BRANCHES (Phase 208). Until this phase the
 * keychain branch dropped it, so every profile on the machine shared one set of
 * items; the file branch was always scoped by where it sits. The keychain names
 * now carry a digest of this same root, so the two backends are scoped by the
 * same thing.
 */
function defaultVault(root: string): VaultBackend {
  return keychainIsTheStore()
    ? keychainVault(defaultSecurityRunner(), root)
    : fileVault(join(root, 'kept'));
}

let liveSessionsProbe: (() => Promise<LiveSession[]>) | null = null;

/**
 * Tell this domain which logins have a session running under them.
 *
 * Installed once from the boot. Until it is, the answer is no sessions, which
 * is the honest answer for a process that has not opened the manifest yet.
 */
export function setLiveSessionsProbe(
  probe: (() => Promise<LiveSession[]>) | null
): void {
  liveSessionsProbe = probe;
}

let installed: KeepDeps | null = null;

/**
 * Harness and test seam. `../harness/usage-fixture.ts` hands in a store rooted
 * in the probe's own scratch directory and a vault that is a file rather than
 * the keychain, so a probe's app never opens the person's keychain and never
 * writes an item of theirs.
 */
export function setKeepDeps(next: KeepDeps | null): void {
  installed = next;
}

/** The real seams, built once. */
export function keepDeps(): KeepDeps {
  if (installed !== null) return installed;
  const root = loginsRoot();
  installed = {
    root,
    vault: defaultVault(root),
    stores: defaultStoreDeps(),
    liveSessions: async () =>
      liveSessionsProbe === null ? [] : liveSessionsProbe(),
    now: () => Date.now()
  };
  return installed;
}

let migration: Promise<MigrateResult> | null = null;

/**
 * The seams, after the one move Phase 208 makes has been made (Phase 208).
 *
 * EVERY PRODUCTION CALLER GOES THROUGH HERE rather than {@link keepDeps}, so
 * no observe, activation or removal can read a scoped slot before the item a
 * tree before this phase wrote under the unscoped name has been moved under
 * it. The migration runs ONCE per process, every later caller shares the same
 * promise, and it is asked at all only on macOS, only when no harness seam is
 * installed, and only when {@link isOwnProfile} says this is the person's own
 * profile. Every scratch profile, every probe and every harness run gets the
 * seams back at once with the migration refused before it composed a name.
 *
 * THE PROOF OF THE PROFILE IS COMPOSED HERE and nowhere else, out of the three
 * paths Electron answers and the process environment. The migration itself
 * takes the answer as a boolean and refuses on anything but true.
 */
export function readyKeepDeps(): Promise<KeepDeps> {
  const deps = keepDeps();
  if (migration === null) {
    migration =
      keychainIsTheStore() && deps.vault.kind === 'keychain'
        ? migrateUnscopedVault({
            runner: defaultSecurityRunner(),
            vault: deps.vault,
            root: deps.root,
            slots: LOGIN_PROVIDERS.flatMap((provider) =>
              sweepableSlots(deps.root, provider)
            ),
            ownProfile: isOwnProfile({
              userData: app.getPath('userData'),
              appData: app.getPath('appData'),
              appName: app.getName(),
              env: process.env
            })
          }).catch(
            (): MigrateResult => ({ refused: false, moved: 0, deleted: 0, kept: 0 })
          )
        : Promise.resolve({ refused: true, moved: 0, deleted: 0, kept: 0 });
  }
  return migration.then(() => deps);
}

/** What the migration did, once it has run. For a log line, never a name. */
export function vaultMigrationResult(): Promise<MigrateResult> | null {
  return migration;
}
