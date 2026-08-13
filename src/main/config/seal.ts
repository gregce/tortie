/**
 * The seal: text only Tortie can produce, so a file anyone can write cannot
 * claim a person agreed to something.
 *
 * ## Why a hash alone is not enough
 *
 * The confirm gate records "a person confirmed this row at hash H". The hash
 * binds the record to the exact bytes that will run, which is what makes a
 * changed row ask again. It does nothing about who wrote the record. An agent
 * process runs as the same user, with write access to the same home directory,
 * and it can compute a sha256 as easily as Tortie can. Without a seal it would
 * write the row into the configuration file and write the matching hash into
 * the record beside it, and the gate would be a formality.
 *
 * So the record carries a seal. `safeStorage` encrypts under a key the macOS
 * keychain holds against Tortie's own identity, and another process running as
 * the same user cannot read it without the user answering a keychain prompt.
 *
 * ## This is the settings danger seal, in a module rather than a private half
 *
 * Phase 18.5 shipped this mechanism inside `src/main/settings/store.ts` for the
 * danger launch defaults, with `SEAL_PREFIX = 'gmux-danger-seal-v1:'` and three
 * private functions. This module is the same three functions with the prefix
 * passed in. Nothing was changed and nothing was improved. It is here so the
 * confirm gate reuses the mechanism instead of growing a second one with its
 * own subtly different failure modes.
 *
 * INTEGRATION SEAM. `settings/store.ts` still holds its own copy. Migrating it
 * onto this module is a rename of three call sites and no behaviour change, and
 * the phase's integrator may do it or hold it. If a caller outside
 * `src/main/config/` ever appears, move this file to `src/main/seal.ts` and fix
 * the two imports. It lives under `config/` today because the confirm gate is
 * its only new caller.
 *
 * ## What it does not cover, stated plainly
 *
 * A seal that was valid in the past stays valid for the exact text it covers.
 * Someone holding an old copy of a sealed file, from a time when the user
 * really had agreed to that row, can put it back. Closing that needs a second
 * secret kept outside the file, and the file is the only thing an attacker
 * needs to write. The practical limit of the replay is that it can only restore
 * an approval the person genuinely gave for those exact bytes. It cannot invent
 * one, and it cannot survive an edit to the row.
 *
 * ## Fail closed
 *
 * When the seal cannot be opened the answer is "nothing is sealed", never "the
 * file is fine". A caller that cannot tell yet gets `null` and asks again,
 * because caching "nothing is sealed" from a call made before the app was ready
 * would drop a legitimate approval for the whole run.
 */

import { app, safeStorage } from 'electron';

/** Is the OS keystore usable right now? False before `app` is ready. */
export function sealAvailable(): boolean {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Seal one string under `prefix`.
 *
 * Returns undefined when no seal can be produced, which is the caller's signal
 * that the value must not be written at all. Writing a value whose seal the
 * next load would refuse makes the product lie about what it will do.
 */
export function sealText(prefix: string, text: string): string | undefined {
  if (!sealAvailable()) return undefined;
  try {
    return safeStorage.encryptString(`${prefix}${text}`).toString('base64');
  } catch (err) {
    console.warn(`[gmux] could not seal ${prefix}: ${(err as Error).message}`);
    return undefined;
  }
}

/**
 * Open a seal read from disk.
 *
 * Three answers, and the caller must treat them differently.
 *  - A string is the sealed text, and it is what the prefix covered.
 *  - `''` for a missing seal, which is a known answer that costs no keychain
 *    access: nothing is sealed.
 *  - `null` means the answer is not known yet, because the app is not ready or
 *    the keystore is unavailable. Answer safely now and ask again later.
 *
 * A blob that is forged, truncated, or written under another machine's key
 * proves nothing, so it covers nothing and comes back as `''`.
 */
export function openSealedText(prefix: string, blob: unknown): string | null {
  if (typeof blob !== 'string' || blob.length === 0) return '';
  if (!sealAvailable()) return null;
  try {
    const text = safeStorage.decryptString(Buffer.from(blob, 'base64'));
    if (!text.startsWith(prefix)) return '';
    return text.slice(prefix.length);
  } catch {
    return '';
  }
}
