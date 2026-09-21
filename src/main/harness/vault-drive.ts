/**
 * Harness only (Phase 304). Drives the SHIPPING sealed vault inside the real
 * app, so `npm run probe:p304` can prove two things no gate under plain node
 * can: that a payload of any size round trips through the real `safeStorage`
 * seal, and that a kill at each step of the keychain read-through leaves a
 * copy every time.
 *
 * WHY IT EXISTS. The observe refuses a store above `CREDENTIAL_MAX_BYTES`
 * (256 KB, `../credentials/payload.ts`) before any vault write, so a 1 MB
 * credential cannot reach `vaultPut` through a store at all; and a kill
 * between the read-through's steps is a kill of THIS process at a moment only
 * this process can name. Both need a seam in main, and this is it. Under it
 * the vault is re-composed from the same three parts `../credentials/index.ts`
 * composes it from, being the sealed file under the profile, the harness seal
 * and the legacy arm over the harness `security`, with the seal and the legacy
 * arm each wrapped once so a named call can end the process. Nothing is put
 * inside `../credentials/vault.ts`.
 *
 * THE KNOB. `GMUX_HARNESS_VAULT_DRIVE=<dir>` names a directory holding:
 *
 *  - `<name>.payload`: after the seams are ready, each is kept through the
 *    shipping `vaultPut` under a slot minted from its name and read back
 *    through the shipping `vaultGet`, and ONE line is printed:
 *    `[gmux] vault-drive <name> put=<ok|refused> bytes=<n> sha256=<hex>
 *    seal=<available|unavailable>`, being the byte count and the digest of the
 *    ANSWER and never a byte of it.
 *  - `stop`: one line `<step>:<slot>`, where `<step>` is `before-write`,
 *    `before-readback` or `before-delete`. The read-through for that slot ends
 *    the process with SIGKILL at that step: before the sealed file is written
 *    (as the legacy read answers), before the file is read back (at the first
 *    `open` after the `wrap` that read answered), or before the item is
 *    deleted (as the legacy delete is asked). A kill runs no `finally`, which
 *    is the whole point: the probe then reads, from outside, which copies are
 *    left.
 *
 * THREE REFUSALS, all hard, and they are the ones ./keychain-harness.ts
 * carries, with the drive directory in the place of the keychain file.
 *
 *  1. The launch must be an isolated harness launch or an armed probe run.
 *  2. The profile directory must sit under the harness directory the runner
 *     handed us.
 *  3. THE DRIVE DIRECTORY ITSELF must sit under that same harness directory.
 *
 * When any of them fires nothing is installed and nothing is printed. The
 * seams it re-composes are always a harness launch's, because the first
 * refusal is a harness term and `keepDeps` hands every such launch the harness
 * shape; the person's own seams are never reached. In every ordinary launch
 * the knob is unset and this file does nothing at all.
 */

import { app, safeStorage } from 'electron';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  harnessSeal,
  keepDeps,
  legacyKeychainVault,
  readyKeepDeps,
  sealedVault,
  setKeepDeps,
  slotFor,
  vaultGet,
  vaultPut,
  type LegacyVault,
  type VaultSeal
} from '../credentials';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** Where a read-through may be ended, and the slot it is ended for. */
export interface VaultStop {
  step: 'before-write' | 'before-readback' | 'before-delete';
  slot: string;
}

/** The knob's own directory, or null when this launch may not use it. */
export function vaultDrivePath(env: NodeJS.ProcessEnv, userDataDir: string): string | null {
  const path = env['GMUX_HARNESS_VAULT_DRIVE'] ?? '';
  if (path === '') return null;
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  if (!isInside(path, harnessDir)) return null;
  return path;
}

/** The `stop` file's one line, or null when there is none or it is malformed. */
export function readVaultStop(dir: string): VaultStop | null {
  let text: string;
  try {
    text = readFileSync(join(dir, 'stop'), 'utf8').trim();
  } catch {
    return null;
  }
  const cut = text.indexOf(':');
  if (cut < 0) return null;
  const step = text.slice(0, cut);
  const slot = text.slice(cut + 1);
  if (step !== 'before-write' && step !== 'before-readback' && step !== 'before-delete') {
    return null;
  }
  if (slot === '') return null;
  return { step, slot };
}

/** The slot one payload file is kept under: a codex login id minted from its name. */
export function vaultDriveSlot(name: string): string {
  return slotFor('codex', createHash('sha256').update(name).digest('hex').slice(0, 16));
}

/**
 * The seal, wrapped so the FIRST `open` after the `wrap` that a read-through
 * made can end the process. The read-through is one synchronous run from the
 * legacy answer to the read-back, so "the next wrap, then the next open" is
 * exactly that read-through's own write and read-back and nothing else's.
 */
function stoppingSeal(seal: VaultSeal, stop: VaultStop | null, armed: { slot: string | null }): VaultSeal {
  let wrapped = false;
  return {
    wrap: (text) => {
      if (stop?.step === 'before-readback' && armed.slot === stop.slot) wrapped = true;
      return seal.wrap(text);
    },
    open: (blob) => {
      if (wrapped) {
        wrapped = false;
        armed.slot = null;
        process.kill(process.pid, 'SIGKILL');
      }
      return seal.open(blob);
    }
  };
}

/** The legacy arm, wrapped so a named read or delete can end the process. */
function stoppingLegacy(legacy: LegacyVault, stop: VaultStop | null, armed: { slot: string | null }): LegacyVault {
  return {
    get: async (slot) => {
      const held = await legacy.get(slot);
      if (stop !== null && slot === stop.slot && held !== null) {
        if (stop.step === 'before-write') process.kill(process.pid, 'SIGKILL');
        if (stop.step === 'before-readback') armed.slot = slot;
      }
      return held;
    },
    del: async (slot) => {
      if (stop?.step === 'before-delete' && slot === stop.slot) {
        process.kill(process.pid, 'SIGKILL');
      }
      return legacy.del(slot);
    }
  };
}

/** Install the seam. Called once from the boot, AFTER the keychain harness. */
export function installVaultDrive(): void {
  const dir = vaultDrivePath(process.env, app.getPath('userData'));
  if (dir === null) return;
  // ONLY THE VAULT HALF of the seams is re-composed; the stores, the sessions
  // seam and the clock are the ones the harness already installed.
  const deps = keepDeps();
  const stop = readVaultStop(dir);
  const armed = { slot: null as string | null };
  setKeepDeps({
    ...deps,
    vault: sealedVault(
      join(deps.root, 'kept'),
      stoppingSeal(harnessSeal(), stop, armed),
      stoppingLegacy(legacyKeychainVault(deps.stores.runner, deps.root), stop, armed)
    )
  });
  // SAID OUT LOUD, so the probe can wait for it. It names no path and no slot.
  console.log(
    `[gmux] vault drive installed${stop === null ? '' : `, stopping ${stop.step}`}`
  );
  let payloads: string[] = [];
  try {
    payloads = readdirSync(dir)
      .filter((n) => n.endsWith('.payload'))
      .sort();
  } catch {
    payloads = [];
  }
  if (payloads.length === 0) return;
  void readyKeepDeps().then(async (ready) => {
    for (const file of payloads) {
      const name = file.slice(0, -'.payload'.length);
      let text = '';
      try {
        text = readFileSync(join(dir, file), 'utf8');
      } catch {
        continue;
      }
      const slot = vaultDriveSlot(name);
      const put = await vaultPut(ready.vault, slot, text);
      const back = await vaultGet(ready.vault, slot);
      let sealOk = false;
      try {
        sealOk = safeStorage.isEncryptionAvailable();
      } catch {
        sealOk = false;
      }
      // THE DIGEST AND THE LENGTH OF THE ANSWER, and never a byte of it.
      const digest =
        back === null ? 'none' : createHash('sha256').update(back, 'utf8').digest('hex');
      const bytes = back === null ? 0 : Buffer.byteLength(back, 'utf8');
      console.log(
        `[gmux] vault-drive ${name} put=${put.ok ? 'ok' : 'refused'} bytes=${String(bytes)} sha256=${digest} seal=${sealOk ? 'available' : 'unavailable'}`
      );
    }
  });
}
