/**
 * THE TEST SEAL (Phase 304), the one stand-in for Electron's `safeStorage`
 * that the tests of this domain and of the logins domain run the SHIPPING
 * sealed vault over.
 *
 * `../vault.ts`'s `sealedVault` takes its seal as an argument so it can be
 * driven under plain node, where there is no Electron and no keystore. This
 * seal is base64 behind a marker and nothing more, and nothing here is meant
 * to be cryptography: what the tests prove with it is that the vault writes
 * what `wrap` answered and never the payload, that a `wrap` of null keeps
 * nothing, and that a file the seal cannot open reads as a miss, which is what
 * a file sealed under somebody else's key does under the real one.
 *
 * Both fakes count and can be told to refuse, so the read-through's steps can
 * each be made to fail on purpose: a `wrap` refused during a migration, an
 * `open` refused on the read-back, a `del` the keychain would not do.
 *
 * NOTHING HERE SPAWNS, OPENS A KEYCHAIN OR READS THE MACHINE.
 */

import type { LegacyVault, VaultSeal } from '../vault';

/** What every sealed blob this seal writes begins with. */
export const TEST_SEAL_MARK = 'p304-test-seal:';

export interface TestSeal extends VaultSeal {
  /** How many of the NEXT `wrap` calls answer null, as an unavailable seal would. */
  refuseWraps: number;
  /** How many of the NEXT `open` calls answer null, as a foreign key would. */
  refuseOpens: number;
  /** Every `wrap` asked, refused or not. */
  wraps: number;
  /** Every `open` asked, refused or not. */
  opens: number;
}

/** The seal. Base64 behind a marker; `open` refuses a blob without the marker. */
export function testSeal(): TestSeal {
  const seal: TestSeal = {
    refuseWraps: 0,
    refuseOpens: 0,
    wraps: 0,
    opens: 0,
    wrap: (text) => {
      seal.wraps += 1;
      if (seal.refuseWraps > 0) {
        seal.refuseWraps -= 1;
        return null;
      }
      return `${TEST_SEAL_MARK}${Buffer.from(text, 'utf8').toString('base64')}`;
    },
    open: (blob) => {
      seal.opens += 1;
      if (seal.refuseOpens > 0) {
        seal.refuseOpens -= 1;
        return null;
      }
      if (!blob.startsWith(TEST_SEAL_MARK)) return null;
      return Buffer.from(blob.slice(TEST_SEAL_MARK.length), 'base64').toString('utf8');
    }
  };
  return seal;
}

/** A seal that can never be made, which is what a platform with no keystore hands the vault. */
export const NO_TEST_SEAL: VaultSeal = { wrap: () => null, open: () => null };

export interface RecordingLegacy extends LegacyVault {
  /** The items, by slot. What a tree before Phase 304 kept in the keychain. */
  items: Map<string, string>;
  /** Every slot `get` was asked for, in order. */
  gets: string[];
  /** Every slot `del` was asked for, in order, whether or not it went. */
  dels: string[];
  /** Slots whose `del` answers false and removes nothing, as `security` exit 44 would. */
  refuseDel: Set<string>;
  /** When set, every `get` throws, as a locked keychain's runner might. */
  throwOnGet: boolean;
}

/** A legacy vault in a map that records every ask and can refuse a delete. */
export function recordingLegacy(seed: Record<string, string> = {}): RecordingLegacy {
  const legacy: RecordingLegacy = {
    items: new Map(Object.entries(seed)),
    gets: [],
    dels: [],
    refuseDel: new Set(),
    throwOnGet: false,
    get: async (slot) => {
      legacy.gets.push(slot);
      if (legacy.throwOnGet) throw new Error('the keychain could not be asked');
      return legacy.items.get(slot) ?? null;
    },
    del: async (slot) => {
      legacy.dels.push(slot);
      if (legacy.refuseDel.has(slot)) return false;
      return legacy.items.delete(slot);
    }
  };
  return legacy;
}
