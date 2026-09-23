/**
 * The Apple push provider key, kept (Phase 314).
 *
 * ## WHAT THIS IS
 *
 * The one credential the push sender in `../push/` signs with: a `.p8` file
 * Apple issues to a developer team, being a P-256 private key, the ten
 * character key id Apple names it by, the ten character team id it belongs to,
 * and the topic, the phone app's bundle id, every alert is addressed to. With
 * it, anything can send an alert to any phone that app is installed on, so it
 * is held exactly the way Tortie holds a person's sign in: behind the seal.
 *
 * ## ONE SLOT, ONE SEALED FILE, AND NOTHING ELSE
 *
 * `<dir>/apns-provider.cred`, written through Phase 304's {@link sealedVault}
 * with NO legacy arm, so there is no older store to read through and nothing in
 * this file can reach one. The write is the domain's one write, `./swap.ts`'s
 * `safeSwap` over `vaultTarget`: staged beside the real place, read back, then
 * renamed over it, so a crash leaves the old key or the new one and never
 * neither. A seal that cannot be made keeps NOTHING and answers the one write's
 * own sentence; a key is never on disk in the clear.
 *
 * ## THE RECORD IS CHECKED ON THE WAY IN AND ON THE WAY OUT
 *
 * A record is refused WHOLE with the field named, never partly kept: a key id
 * or team id that is not ten characters of `A-Z` and `0-9`, a topic that is not
 * a dotted bundle id of at most 155 bytes, or a key that is not a PKCS#8 P-256
 * private key. The key is stored RE-EXPORTED, so a file with a trailing space
 * or Windows line ends is kept as the one canonical spelling and the digest of
 * what is read back is the digest of what the sender will sign with.
 *
 * The same check runs on the way OUT. `read` answers null for a slot that is
 * absent, that the seal cannot open, that does not parse, or whose record
 * fails the check, and it never throws: the sender reads null as "no key" and
 * sends nothing, which is the one safe answer.
 *
 * ## WHAT THIS MODULE DOES NOT DO
 *
 * It never logs. It spawns nothing, and it names no program and no store
 * other than the sealed file. It is imported by value from `./index.ts` and
 * `../harness/push-seam.ts` alone; `../push/` names only its types.
 */

import { createPrivateKey } from 'node:crypto';
import { safeSwap } from './swap';
import { NO_LEGACY, sealedVault, stagedSlotFor, vaultTarget, type VaultSeal } from './vault';

/** The one slot this store has. Not a login slot: it has no provider dot. */
export const APNS_KEY_SLOT = 'apns-provider';

/** What Apple issued, as the sender needs it. */
export interface ApnsProviderKey {
  /** Apple's name for the key, `^[A-Z0-9]{10}$`. */
  readonly keyId: string;
  /** The developer team the key belongs to, `^[A-Z0-9]{10}$`. */
  readonly teamId: string;
  /** The phone app's bundle id, dotted, at most 155 bytes. */
  readonly topic: string;
  /** PKCS#8 PEM of an EC prime256v1 private key, stored re-exported (canonical). */
  readonly p8: string;
}

/** The field a refusal names. */
export type ApnsKeyField = 'keyId' | 'teamId' | 'topic' | 'p8';

export interface ApnsKeyStore {
  keep(
    key: ApnsProviderKey
  ): Promise<{ ok: true } | { ok: false; reason: string; field: ApnsKeyField | null }>;
  read(): Promise<ApnsProviderKey | null>;
  forget(): Promise<void>;
}

/** A key id and a team id: ten capital letters or digits, as Apple issues them. */
const APPLE_ID_RE = /^[A-Z0-9]{10}$/;

/** A dotted bundle id. At least two labels; letters, digits and hyphens only. */
const TOPIC_RE = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** The longest topic kept, in bytes. */
export const APNS_TOPIC_MAX_BYTES = 155;

/** No PEM a P-256 key is written as comes near this; it bounds the parse. */
const P8_MAX_CHARS = 4_096;

/** The version of the stored record, so a later shape is refused rather than guessed at. */
const RECORD_VERSION = 1;

type Checked =
  | { readonly ok: true; readonly key: ApnsProviderKey }
  | { readonly ok: false; readonly reason: string; readonly field: ApnsKeyField };

function refuse(field: ApnsKeyField, what: string): Checked {
  return {
    ok: false,
    field,
    reason: `The Apple push key was not kept, because its ${what}. Nothing was changed.`
  };
}

/**
 * The key as one canonical PKCS#8 PEM, or null when it is not a P-256 private
 * key written as PKCS#8. Never throws.
 */
function canonicalP8(p8: string): string | null {
  if (p8.length === 0 || p8.length > P8_MAX_CHARS) return null;
  if (!p8.trim().startsWith('-----BEGIN PRIVATE KEY-----')) return null;
  try {
    const key = createPrivateKey({ key: p8, format: 'pem' });
    if (key.asymmetricKeyType !== 'ec') return null;
    if (key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return null;
    const out = key.export({ format: 'pem', type: 'pkcs8' });
    return typeof out === 'string' ? out : out.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Check a record and answer it in its canonical form, or the first field that
 * is wrong. The whole record or nothing: a record with one bad field is not
 * kept, and one read back with one bad field is not answered.
 */
export function checkApnsProviderKey(input: unknown): Checked {
  const row = input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const { keyId, teamId, topic, p8 } = row;
  if (typeof keyId !== 'string' || !APPLE_ID_RE.test(keyId)) {
    return refuse('keyId', 'key id is not ten capital letters or digits');
  }
  if (typeof teamId !== 'string' || !APPLE_ID_RE.test(teamId)) {
    return refuse('teamId', 'team id is not ten capital letters or digits');
  }
  if (
    typeof topic !== 'string' ||
    !TOPIC_RE.test(topic) ||
    Buffer.byteLength(topic, 'utf8') > APNS_TOPIC_MAX_BYTES
  ) {
    return refuse('topic', 'topic is not a dotted bundle id of at most 155 bytes');
  }
  const canonical = typeof p8 === 'string' ? canonicalP8(p8) : null;
  if (canonical === null) {
    return refuse('p8', 'key is not a P-256 private key in a PKCS#8 file');
  }
  return { ok: true, key: { keyId, teamId, topic, p8: canonical } };
}

/** The stored text, opened, back into a record. Null for anything that is not one. */
function recordOf(text: string | null): ApnsProviderKey | null {
  if (text === null || text === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  if ((parsed as Record<string, unknown>)['v'] !== RECORD_VERSION) return null;
  const checked = checkApnsProviderKey(parsed);
  return checked.ok ? checked.key : null;
}

/**
 * The store over one directory and one seal.
 *
 * `dir` is `<userData>/gmux/push/` in the app (`./index.ts`'s `apnsKeyDir`),
 * and a scratch directory in every test and gate. `seal` is Electron's
 * `safeStorage` in the app, the harness seal under a harness launch, and an
 * injected one everywhere else.
 */
export function apnsKeyStore(dir: string, seal: VaultSeal): ApnsKeyStore {
  const backend = sealedVault(dir, seal, NO_LEGACY);

  async function keep(
    key: ApnsProviderKey
  ): Promise<{ ok: true } | { ok: false; reason: string; field: ApnsKeyField | null }> {
    const checked = checkApnsProviderKey(key);
    if (!checked.ok) return { ok: false, reason: checked.reason, field: checked.field };
    const { keyId, teamId, topic, p8 } = checked.key;
    const payload = JSON.stringify({ v: RECORD_VERSION, keyId, teamId, topic, p8 });
    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);
    return written.ok ? { ok: true } : { ok: false, reason: written.reason, field: null };
  }

  async function opened(): Promise<ApnsProviderKey | null> {
    const text = await backend.get(APNS_KEY_SLOT);
    return recordOf(text);
  }

  return {
    keep,
    read: () => opened().catch(() => null),
    forget: async () => {
      try {
        await backend.del(APNS_KEY_SLOT);
        await backend.del(stagedSlotFor(APNS_KEY_SLOT));
      } catch {
        // A file that will not go leaves a sealed key where it was, and the
        // next keep replaces it. Nothing here is worth a throw.
      }
    }
  };
}
