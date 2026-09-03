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

import { readFile, rm } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { loginsRoot } from '../logins/paths';
import { renameNoFollowSync, writeNoFollowSync } from './nofollow';
import { defaultSecurityRunner } from './security';
import type { StoreDeps } from './stores';
import type { KeepDeps, LiveSession } from './keep';
import { fileVault, keychainVault, type VaultBackend } from './vault';

export {
  activateLogin,
  type Observation,
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
  CREDENTIAL_FILE_MODE,
  renameNoFollowSync,
  writeNoFollowSync
} from './nofollow';
export { credentialDigest, isCredentialPayload } from './payload';
export { readSettledStore, readStore, storeTarget, type StoreDeps } from './stores';
export { safeSwap, type SwapResult, type SwapStep, type SwapTarget } from './swap';
export {
  fileVault,
  keychainVault,
  slotFor,
  vaultGet,
  vaultPut,
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
 */
function defaultVault(root: string): VaultBackend {
  return keychainIsTheStore() ? keychainVault() : fileVault(join(root, 'kept'));
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
