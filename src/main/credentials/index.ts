/**
 * The credentials domain barrel, and the one place the real seams are built
 * (Phase 204).
 *
 * EVERYTHING BELOW THIS FILE TAKES ITS WORLD AS AN ARGUMENT, which is what
 * lets `npm run conformance:credentials` run the SHIPPING modules under plain
 * node over an injected keychain, an injected file system, an injected seal
 * and an injected clock. This file is the only one in the domain that names
 * Electron, the process environment or the person's home directory, and since
 * Phase 304 that includes `safeStorage`: the seal Tortie's own store writes
 * through is built here and handed down, so `./vault.ts` never imports it.
 *
 * THE LIVE SESSIONS SEAM IS INSTALLED FROM THE BOOT rather than imported here,
 * because the sessions domain already reaches this one through the launch
 * plan, and an import the other way would be a cycle. `../capabilities.ts`
 * installs it beside the other registrars.
 */

import { app, safeStorage } from 'electron';
import { rm } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { isHarnessLaunch } from '../harness/launch-gate';
import { loginsRoot } from '../logins/paths';
import { readTextNoFollowSync, renameNoFollowSync, writeNoFollowSync } from './nofollow';
import { defaultSecurityRunner, type SecurityRunner } from './security';
import type { StoreDeps } from './stores';
import { sweepableSlots, type KeepDeps, type LiveSession } from './keep';
import { credentialsAreOpen, trackCredentialWork } from './lifecycle';
import { migrateUnscopedVault, ownProfileVerdict, type MigrateResult } from './migrate';
import { apnsKeyStore, type ApnsKeyStore } from './apns-key';
import {
  legacyKeychainVault,
  NO_LEGACY,
  sealedVault,
  type VaultBackend,
  type VaultSeal
} from './vault';

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
export {
  beginCredentialShutdown,
  credentialChildCount,
  credentialWorkCount,
  credentialsAreOpen,
  joinCredentialShutdown,
  ownCredentialChild,
  resetCredentialLifecycle,
  trackCredentialWork,
  CREDENTIAL_SHUTDOWN_JOIN_MS,
  type CredentialShutdownReport
} from './lifecycle';
export {
  defaultKeychainFingerprint,
  startCredentialWatch,
  watchTargetsFor,
  type CredentialWatch,
  type WatchDeps,
  type WatchTarget
} from './watch';
export {
  isOwnProfile,
  ownProfileVerdict,
  type MigrateRefusal,
  type MigrateResult,
  type ProfileShape,
  type ProfileVerdict
} from './migrate';
export {
  CREDENTIAL_FILE_MODE,
  readTextNoFollowSync,
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
export { apnsKeyStore, APNS_KEY_SLOT, type ApnsProviderKey, type ApnsKeyStore } from './apns-key';
export {
  legacyKeychainVault,
  NO_LEGACY,
  sealedVault,
  slotFor,
  stagedSlotFor,
  vaultDiscardStaged,
  vaultGet,
  vaultPut,
  vaultScopeDigest,
  vaultServiceFor,
  VAULT_SERVICE_PREFIX,
  type LegacyVault,
  type VaultBackend,
  type VaultSeal
} from './vault';

/**
 * True when a claude credential lives in the keychain on this machine.
 *
 * Since Phase 304 it decides two things and neither is which backend Tortie's
 * own store gets, because there is one: whether the vendor's claude store is a
 * keychain item, and whether a keychain exists to read a legacy item of
 * Tortie's own from.
 */
function keychainIsTheStore(): boolean {
  return process.platform === 'darwin';
}

/**
 * Is `safeStorage` usable right now? False before `app` is ready.
 *
 * `../settings/store.ts`'s `sealAvailable`, byte for byte, because the danger
 * settings and Tortie's own credential store are sealed by the same key and
 * must agree about when it can be asked.
 */
function sealAvailable(): boolean {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * The seal Tortie's own store writes through in the app (Phase 304): Electron's
 * `safeStorage`, whose key the operating system keeps and binds to Tortie.
 *
 * `wrap` is `encryptString` as base64 and `open` its inverse, each guarded the
 * way `../settings/store.ts:792` guards them, and each answering null rather
 * than throwing, because `./vault.ts` reads null as "no seal right now" and a
 * throw as nothing at all. Neither names a byte and neither logs.
 */
function electronSeal(): VaultSeal {
  return {
    wrap: (text) => {
      if (!sealAvailable()) return null;
      try {
        return safeStorage.encryptString(text).toString('base64');
      } catch {
        return null;
      }
    },
    open: (blob) => {
      if (!sealAvailable()) return null;
      try {
        return safeStorage.decryptString(Buffer.from(blob, 'base64'));
      } catch {
        return null;
      }
    }
  };
}

/**
 * The seal a HARNESS launch gets (Phase 304): the real `safeStorage` ONLY
 * under Chromium's mock keychain, and a seal that keeps nothing otherwise.
 *
 * The real seal reads the `Tortie Safe Storage` key from the person's login
 * keychain, and a probe under a scratch `HOME` with no keychain there makes
 * macOS pop "A keychain cannot be found to store ..." and WAIT, which is the
 * 2026-08-16 incident `../index.ts` records beside the switch. So a harness
 * launch seals only when `--use-mock-keychain` is in force, which every
 * isolated launch appends and every probe that keeps a credential passes: a
 * deterministic in-process key, the real OSCrypt path, and no reach into his
 * keychain. Without the switch the vault keeps nothing, which is the named
 * cost, rather than a 0600 plaintext file, which is what the old file arm
 * wrote. Asked on every call rather than once, so the answer is the switch as
 * it stands and not as it stood when the seams were built.
 *
 * EXPORTED FOR ONE CALLER, `../harness/vault-drive.ts`, which re-composes the
 * installed harness vault around it so `probe:p304` can kill the process at
 * each step of the read-through. It can never be the seal a real profile
 * uses: {@link keepDeps} hands a person's own launch {@link defaultVault},
 * which seals through {@link electronSeal} and never through this, and a
 * launch that reaches this function without the mock switch keeps nothing.
 */
export function harnessSeal(): VaultSeal {
  const mocked = (): boolean => {
    try {
      return app.commandLine.hasSwitch('use-mock-keychain');
    } catch {
      return false;
    }
  };
  const real = electronSeal();
  return {
    wrap: (text) => (mocked() ? real.wrap(text) : null),
    open: (blob) => (mocked() ? real.open(blob) : null)
  };
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
    // A LINK IS NOT READ (Phase 211 fix round). `./nofollow.ts` carries the
    // reason: an entry planted at a store's name would otherwise be read
    // through, into that store's slot, on any event the watcher sees.
    readText: async (path) => readTextNoFollowSync(path),
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
 * the sealed file under the profile with NO legacy keychain to read from, the
 * `security` seam refuses every call, the vendor's claude store is read as a
 * file, and `home` is the logins root so a default location composed with no
 * `CLAUDE_CONFIG_DIR` or `CODEX_HOME` set lands inside the profile rather
 * than under the person's home. Nothing here can reach a credential of
 * theirs, and everything a probe plants in a directory it made is read
 * through the real reader. `../harness/usage-fixture.ts` installs this same
 * shape with the person's home, which is what its own probes were measured
 * over.
 *
 * THIS SHAPE COVERS THE CREDENTIALS DOMAIN ALONE. Two other readers of the
 * person's keychain exist in the same launch and are stated here so a later
 * probe header does not claim more than it has (Phase 281.1): the usage
 * meter's own `-w` read (`../usage/credentials.ts`, `keychainReader`, which
 * a harness launch replaces only under `GMUX_USAGE_FIXTURE` or
 * `GMUX_HARNESS_KEYCHAIN`), and the login list's presence check
 * (`../usage/login-accounts.ts`), which since Phase 281.1 refuses the
 * keychain under the same `isHarnessLaunch` predicate this file uses
 * (`harnessLoginAccountDeps`). Chromium's `safeStorage` reaches the Safe
 * Storage item with no `security` process when a danger value is sealed or a
 * non-empty seal opened, and `use-mock-keychain` is appended only under
 * `isIsolatedLaunch`, which does not count `GMUX_PROBES`. SINCE PHASE 304 THE
 * VAULT IS A THIRD SUCH READER, which is why both harness shapes seal through
 * {@link harnessSeal} and keep nothing unless that switch is in force.
 */
export function harnessFileKeepDeps(root: string, home: string): KeepDeps {
  return {
    root,
    vault: sealedVault(join(root, 'kept'), harnessSeal(), NO_LEGACY),
    stores: {
      ...defaultStoreDeps(
        { run: async () => ({ code: 1, stdout: '' }) },
        false,
        home
      ),
      userName: 'harness',
      wait: (ms) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 30)))
    },
    // THE SAME SESSIONS SEAM THE PERSON'S OWN LAUNCH GETS (Phase 211 fix
    // round). Phase 208 wrote an empty answer here, when the seam only ever
    // REFUSED a write, so a probe could not be refused for a session it made.
    // Phase 211 made the answer decide the default lift, and an empty answer
    // meant no harness launch could ever lift: the phase's own app run chose
    // a login with a default session live and the default store kept the
    // outgoing account. The seam is installed from the boot in every launch
    // and reads the manifest of THIS profile, so a probe sees its own
    // sessions and nobody else's.
    liveSessions: liveSessionsSeam,
    now: () => Date.now()
  };
}

/**
 * The seams a harness launch gets over ONE scratch keychain file (Phase 208).
 *
 * The REAL keychain stores, and since Phase 304 the REAL legacy arm of
 * Tortie's own store, so the whole macOS path runs, over a `security` that
 * acts on the named file and nothing else: a probe plants a
 * `Tortie-credentials-*` item in its scratch keychain and watches the
 * read-through move it into the sealed file. The file is the probe's own,
 * made with `security create-keychain` under the harness directory and
 * deleted by the probe in a `finally`, and it is never in the search list, so
 * no name this launch composes can reach an item of the person's. The same
 * `home` rule as the file shape, for the same reason.
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
      vault: sealedVault(join(root, 'kept'), harnessSeal(), legacyKeychainVault(runner, root)),
      stores: {
        ...defaultStoreDeps(runner, true, home),
        // THE USER NAME HERE IS ONLY THE VENDOR RULE'S SECOND CHOICE (Phase
        // 281). The account every vendor item is addressed under is `USER`
        // when this process has one, as a launch from a login shell does, so
        // a probe's claude items are written under that name, and `harness`
        // only when `USER` is unset or empty. Either way they land in the
        // SCRATCH keychain file this runner names and nowhere else.
        userName: 'harness',
        wait: (ms) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 30)))
      },
      liveSessions: liveSessionsSeam,
      now: () => Date.now()
    }
  };
}

/**
 * Tortie's own store: ONE backend on every platform since Phase 304, a file
 * per entry sealed through `safeStorage`, mode 0600, in a directory with mode
 * 0700 under this profile's logins root.
 *
 * THE KEYCHAIN IS READ ONLY, and only on macOS, where a tree before Phase 304
 * kept the items. `legacyKeychainVault` composes the scoped name Phase 208
 * gave them from this same root, so a profile can read through only the items
 * it wrote; the file is scoped by where it sits.
 */
function defaultVault(root: string): VaultBackend {
  return sealedVault(
    join(root, 'kept'),
    electronSeal(),
    keychainIsTheStore() ? legacyKeychainVault(defaultSecurityRunner(), root) : NO_LEGACY
  );
}

let liveSessionsProbe: (() => Promise<LiveSession[]>) | null = null;

/** The one answer to "which logins have a session", for every shape of seams. */
const liveSessionsSeam = async (): Promise<LiveSession[]> =>
  liveSessionsProbe === null ? [] : liveSessionsProbe();

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
 * in the probe's own scratch directory and a vault with no legacy keychain to
 * read from, so a probe's app never opens the person's keychain and never
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
    liveSessions: liveSessionsSeam,
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
 * promise, and it is asked at all only on macOS and only when
 * {@link isOwnProfile} says this is the person's own profile. Every scratch
 * profile, every probe and every harness run gets the seams back at once with
 * the migration refused before it composed a name, and the refusal carries
 * WHICH of those it was, so the boot line says so. Until Phase 304 a harness
 * launch on the file shape was refused as `not-keychain` before the proof was
 * asked; now that one backend ships, `not-keychain` names a platform with no
 * keychain and a harness launch on macOS is refused as `harness` like any other.
 *
 * SINCE PHASE 304 THE PASS ALSO SWEEPS THE SCOPED DUPLICATE the read-through
 * in `./vault.ts` leaves when a kill or a refused delete falls between its
 * read-back and its delete, which is why it is handed the legacy arm beside
 * the vault. The unscoped move it was written for still runs, and its `vaultPut`
 * now writes the sealed file.
 *
 * THE PROOF OF THE PROFILE IS COMPOSED HERE and nowhere else, out of the three
 * paths Electron answers and the process environment. The migration itself
 * takes the verdict and refuses on anything but `'own'`.
 */
export function readyKeepDeps(): Promise<KeepDeps> {
  const deps = keepDeps();
  // PHASE 220. A QUIT DOES NOT START THE MOVE. The migration reads and writes
  // keychain items, so a caller that reaches this line after admission closed
  // gets the seams back with nothing started; one already running is OWNED
  // below and joined by the disposer.
  if (migration === null && !credentialsAreOpen()) return Promise.resolve(deps);
  if (migration === null) {
    migration = trackCredentialWork(
      keychainIsTheStore()
        ? migrateUnscopedVault({
            // THE SAME `security` THE STORES USE, so a harness seam that points
            // the stores at a scratch keychain points the migration there too.
            runner: deps.stores.runner,
            vault: deps.vault,
            // PHASE 304. The scoped items too, read through the same program,
            // so the pass can sweep a duplicate the read-through left beside
            // a sealed file. It never writes one: the type has no `put`.
            legacy: legacyKeychainVault(deps.stores.runner, deps.root),
            root: deps.root,
            slots: LOGIN_PROVIDERS.flatMap((provider) =>
              sweepableSlots(deps.root, provider)
            ),
            ownProfile: ownProfileVerdict({
              userData: app.getPath('userData'),
              appData: app.getPath('appData'),
              appName: app.getName(),
              env: process.env
            })
          }).catch(
            (): MigrateResult => ({
              refused: false,
              reason: null,
              moved: 0,
              deleted: 0,
              kept: 0,
              failed: 0
            })
          )
        : Promise.resolve({
            refused: true,
            reason: 'not-keychain' as const,
            moved: 0,
            deleted: 0,
            kept: 0,
            failed: 0
          })
    );
  }
  return migration.then(() => deps);
}

/** What the migration did, once it has run. For a log line, never a name. */
export function vaultMigrationResult(): Promise<MigrateResult> | null {
  return migration;
}

/**
 * Where the Apple push provider key is kept (Phase 314):
 * `<userData>/gmux/push/`, beside the other stores this profile owns and
 * never under the logins root, because it is not a login and no login's
 * sweep or removal may reach it.
 *
 * The inner `gmux/` directory is one of the identifiers live data is bound to
 * (CLAUDE.md, Phase 16.5). It stays `gmux` and is not "finished off".
 */
export function apnsKeyDir(): string {
  return join(app.getPath('userData'), 'gmux', 'push');
}

/**
 * The provider key's store as this launch should have it (Phase 314): sealed
 * through `safeStorage` in a person's own launch, and through
 * {@link harnessSeal} under any harness launch, so a probe keeps its scratch
 * key only under the mock keychain and never reaches the person's Safe Storage
 * item. Built fresh on every call, because it holds nothing but a directory
 * and a seal, and the seal is asked at the moment it is used.
 */
export function apnsKeyStoreForApp(): ApnsKeyStore {
  return apnsKeyStore(
    apnsKeyDir(),
    isHarnessLaunch(process.env) ? harnessSeal() : electronSeal()
  );
}
