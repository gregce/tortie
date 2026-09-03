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
import { isHarnessLaunch } from '../harness/launch-gate';
import { loginsRoot } from '../logins/paths';
import { renameNoFollowSync, writeNoFollowSync } from './nofollow';
import { defaultSecurityRunner, type SecurityRunner } from './security';
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
export { keychainHasItem, securityCallCount, type SecurityRunner } from './security';
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

/**
 * The file system seams, written once.
 *
 * `runner` and `keychainForClaude` are arguments since Phase 208, so the two
 * harness shapes below are this same object with two fields moved rather than
 * a copy of it that could drift.
 */
function defaultStoreDeps(
  runner: SecurityRunner = defaultSecurityRunner(),
  keychainForClaude: boolean = keychainIsTheStore(),
  home: string = homedir()
): StoreDeps {
  return {
    runner,
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
    home,
    keychainForClaude,
    userName: userInfo().username,
    wait: (ms) => new Promise<void>((r) => setTimeout(r, ms))
  };
}

/**
 * The seams a HARNESS launch gets when it carries no knob (Phase 208).
 *
 * THIS IS THE THIRD HALF OF THE PHASE 208 FIX, and it is what the scoping
 * alone left open. Scoping the name stops a scratch profile OVERWRITING the
 * person's item, but a scratch profile launched with `GMUX_PROBES=1` and no
 * fixture still got the real keychain vault and the real stores, so its first
 * observe read the person's own unscoped vendor item through the fallback in
 * `../usage/login-accounts.ts` and CREATED a scoped copy of his credential in
 * his login keychain, one per scratch profile, that nothing ever removed; the
 * boot observe this phase adds would have done it on every launch. That is the
 * one env var difference the measure agent found between the Phase 204 probe,
 * which set `GMUX_USAGE_FIXTURE` and got the file vault, and the Phase 206
 * probe, which did not and hit his keychain.
 *
 * So a harness launch that installed nothing gets this: Tortie's own store is
 * a FILE under the profile, the `security` seam refuses every call, the
 * vendor's claude store is read as a file, and `home` is the logins root so a
 * default location composed with no `CLAUDE_CONFIG_DIR` or `CODEX_HOME` set
 * lands inside the profile rather than under the person's home. Nothing here
 * can reach a credential of theirs, and everything a probe plants in a
 * directory it made is read through the real reader. `../harness/
 * usage-fixture.ts` installs this same shape with the person's home, which is
 * what its own probes were measured over.
 */
export function harnessFileKeepDeps(root: string, home: string): KeepDeps {
  return {
    root,
    vault: fileVault(join(root, 'kept')),
    stores: {
      ...defaultStoreDeps(
        { run: async () => ({ code: 1, stdout: '' }) },
        false,
        home
      ),
      userName: 'harness',
      wait: (ms) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 30)))
    },
    // NO SESSION IS EVER RUNNING in a probe that creates none, and a probe that
    // does create one gets the honest empty answer rather than a refusal it
    // cannot explain.
    liveSessions: async () => [],
    now: () => Date.now()
  };
}

/**
 * The seams a harness launch gets over ONE scratch keychain file (Phase 208).
 *
 * The REAL keychain vault and the REAL keychain stores, so the whole macOS
 * path runs, over a `security` that acts on the named file and nothing else.
 * The file is the probe's own, made with `security create-keychain` under the
 * harness directory and deleted by the probe in a `finally`, and it is never in
 * the search list, so no name this launch composes can reach an item of the
 * person's. The same `home` rule as the file shape, for the same reason.
 */
export function harnessKeychainKeepDeps(
  root: string,
  home: string,
  keychainFile: string
): { deps: KeepDeps; runner: SecurityRunner } {
  const runner = defaultSecurityRunner(keychainFile);
  return {
    runner,
    deps: {
      root,
      vault: keychainVault(runner, root),
      stores: {
        ...defaultStoreDeps(runner, true, home),
        userName: 'harness',
        wait: (ms) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 30)))
      },
      liveSessions: async () => [],
      now: () => Date.now()
    }
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

/**
 * The real seams, built once.
 *
 * A HARNESS LAUNCH THAT INSTALLED NOTHING GETS THE FILE SHAPE (Phase 208), by
 * the widest predicate the harness has, so `GMUX_PROBES` at any value is
 * enough. The reasoning is on {@link harnessFileKeepDeps}. A person's own
 * launch sets none of those four names and gets the real seams.
 */
export function keepDeps(): KeepDeps {
  if (installed !== null) return installed;
  const root = loginsRoot();
  if (isHarnessLaunch(process.env)) {
    installed = harnessFileKeepDeps(root, root);
    return installed;
  }
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
            // THE SAME `security` THE STORES USE, so a harness seam that points
            // the stores at a scratch keychain points the migration there too.
            runner: deps.stores.runner,
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
