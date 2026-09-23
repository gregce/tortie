/**
 * Who may ask this door a question, and how it knows it is them (Phase 313).
 *
 * ## The rule this file enforces, and it is the operator's own
 *
 * A human confirms the bytes, out of band of any agent turn, and the agreement
 * is bound to a hash of the fields that decide what runs. `../machines/
 * confirm.ts` is the pattern and this module follows it line for line: the
 * fields that decide what the door ANSWERS are hashed, a person confirms that
 * hash once by pressing a button in Tortie, and the confirmation is bound to
 * it. Move the bind address, the port, whether it comes up at launch, the route
 * table or the set of allowed phones, and the hash changes, so Tortie asks
 * again and the door refuses to bind until it is answered.
 *
 * PHASE 314 ADDED THREE HASHED FACTS, all about where a person's words go
 * rather than what the door answers: the push switch, and each phone's Apple
 * device token and the environment it was minted in. The token arrives only
 * inside the sealed pairing presentation, as `apt` and `ape`, because the
 * route table is closed and gains no route for it. What is NOT hashed is the
 * list of tokens Apple said are dead, because dropping a destination only
 * narrows where his words go and needs no human.
 *
 * ## The order, and the order is the whole of the safety
 *
 * THE MAC ASKS THE PERSON LAST. The Mac draws a QR and a short fingerprint; the
 * phone scans it and PRESENTS itself; both screens then show the same short
 * fingerprint, which is a hash of BOTH public keys and therefore cannot be
 * produced by a machine sitting in the middle holding only one of them; and
 * then, and only then, the person is asked on the Mac to allow it. A phone that
 * presents and is never allowed has reached nothing: `POST /pair` is the only
 * route it can touch and it answers one word.
 *
 * ## No reusable secret crosses the wire, and there is no bearer token
 *
 * Research 127 section 10 forbids a bearer outright and section 7 records why:
 * a token in a path leaks through a `Referer` and through a log the first time
 * a person taps an outbound hand-off. So the answer was to remove the thing.
 *
 *   - The QR carries a ONE-SHOT 128-bit secret that lives only inside the
 *     pairing window. It is used to derive an AES-GCM key under which the
 *     phone seals its presentation, so a bystander who reaches `/pair` during
 *     the window can neither read what a phone presented nor present a body of
 *     its own. It grants no read on any route. It is destroyed when the window
 *     shuts, which is what makes a photographed screen useless later.
 *   - Pairing then establishes keys EACH WAY. Both sides hold a long-lived
 *     X25519 pair and a long-lived Ed25519 pair. The X25519 pair gives a
 *     shared secret that never crosses the wire and that BINDS every later
 *     signature to this pairing, so a signature made for one door cannot be
 *     replayed at another even by the same phone. The Ed25519 pair signs every
 *     request.
 *   - Nothing that grants a read is ever transmitted, in a header, in a query
 *     or in a path. A captured request proves only that that exact request was
 *     made, once, inside a small window, with a nonce that is now spent.
 *
 * ## What the QR carries (v:2, Phase 316), and the one credential in it
 *
 * The door's address and port; `fp`, the sha256 of the door's PUBLIC KEY
 * (SubjectPublicKeyInfo), base64url, which the phone pins; Tortie's two public
 * keys; the one-shot pairing secret; the window's deadline; and, only when the
 * person pasted one, `tk`, a tailnet auth key.
 *
 * `fp` PINS THE KEY AND NOT THE CERTIFICATE. v:1 carried the certificate's
 * hash, and `./tls.ts` renews that certificate from the same key every 397
 * days, so every phone paired under v:1 would have stopped trusting this door
 * thirteen months later with nothing on either screen saying why. The key
 * outlives the certificate, so the pin does too. There is no `fp` without a
 * listening door: {@link PocketPairing.open} refuses when the door has no key
 * to pin, so a QR can never carry `fp: null`.
 *
 * `tk` IS HIS CREDENTIAL, AND TORTIE NEVER MADE IT. Research 127 section 2
 * wanted Tortie to mint the key from a Tailscale API credential. Research 128
 * section 3.2 OVERRULED that and it stays overruled: Tortie holds no Tailscale
 * API credential, ever, because the OAuth client secret is itself a reusable
 * pre-approved auth key that never expires until revoked by hand, and it would
 * sit on the machine that runs every agent. So the person mints ONE one-off key
 * by hand in his own admin console and pastes it into the sheet, and the phone
 * joins his tailnet with it once. Main holds it ONLY inside the open window,
 * as bytes beside the one-shot secret, and zeroes them on cancel, on expiry,
 * on allow and when a new window replaces this one. It is never written to
 * `pocket.json` or anywhere else, never logged, and never in any answer but
 * the one offer whose QR carries it to the phone. The residual is stated
 * rather than hidden: the pasted string and that offer's payload are
 * JavaScript strings, which cannot be zeroed, and they live until the
 * collector takes them.
 *
 * ## Where the record lives, and why it is TWO answers rather than one
 *
 * Two files, and neither is load bearing alone.
 *
 *   1. `<userData>/gmux/config-confirmations.json`, the record every confirm
 *      gate already shares, under a THIRD key prefix beside `machine:`. It
 *      holds the hash a person agreed to and it is sealed.
 *   2. `<userData>/gmux/pocket.json`, this module's own store, holding the
 *      long-lived keys and the allowed phones, sealed under its own prefix.
 *
 * A process running as the same user can write either file and can compute a
 * sha256, but it cannot produce either seal. And even if it replayed an OLD
 * sealed store, the phones in it would not match the hash in the confirmation,
 * so the door would refuse to bind and say the details changed. The seal's own
 * residual is stated plainly in `../config/seal.ts` and again on the pairing
 * panel: a replay can only restore an approval the person genuinely gave for
 * those exact bytes.
 *
 * RESEARCH 127 SECTION 5 SAID THE LIVE PHONE SET SHOULD GO IN A KEYCHAIN ITEM
 * through the credentials runner. It cannot, and the same phase says why: the
 * import wall `{ dir: 'main/pocket/', forbidden: ['main/credentials/',
 * 'main/logins/'] }` is a refusal this phase lands, and research 128 section
 * 3.2 lands it "regardless". The two cannot both be true. This module takes the
 * wall, because the wall is what makes "no route may read a credential"
 * structural rather than remembered, and it names the residual it costs.
 *
 * ## What this module does not do
 *
 * It spawns nothing and it has no import that could. It opens no socket, binds
 * nothing and reads no credential. It never sets a status. It composes no argv.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  verify as verifyWith,
  type KeyObject
} from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';

import {
  POCKET_CONFIRM_WARNING,
  POCKET_ROUTE_IDS,
  type PocketPairingInput,
  type PocketPairingOffer,
  type PocketPairingState,
  type PocketPairingView,
  type PocketPhoneView,
  type PocketRouteId
} from '@shared/ipc/pocket';
import { openSealedText, sealText } from '../config/seal';
import {
  readConfirmRecords,
  writeConfirmRecords,
  type ConfirmRecord
} from '../config/confirm-record';
import { gmuxError } from '../errors';
import { getLog } from '../log';

const pocketLog = getLog('pocket');

// ---------------------------------------------------------------------------
// Small encodings, one spelling each
// ---------------------------------------------------------------------------

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

function unb64u(text: string): Buffer {
  return Buffer.from(text, 'base64url');
}

// ---------------------------------------------------------------------------
// What counts as execution bearing
// ---------------------------------------------------------------------------

/** One allowed phone, as the hash sees it. */
export interface PocketPhoneFields {
  /** Derived from the signing key, so it is not a name anybody chose. */
  readonly id: string;
  /** What the phone called itself. Drawn, and hashed, because it is read. */
  readonly label: string;
  /** Ed25519 SPKI, base64url. The key every request is signed under. */
  readonly signingKey: string;
  /** X25519 SPKI, base64url. The key the binding is derived from. */
  readonly exchangeKey: string;
  /** The tailnet address it presented from, and the only one it may ask from. */
  readonly address: string;
  /**
   * The phone's Apple device token, lowercase hex of 32 to 256 characters, or
   * `''` when it gave none (Phase 314). HASHED, because it decides WHERE a
   * person's session names go: a token is an address at Apple, and moving it
   * moves where his words are sent, which is `../machines/confirm.ts`'s rule
   * read literally. It arrives ONLY inside the sealed pairing presentation,
   * because the route table is closed and gains no route for it.
   */
  readonly pushToken: string;
  /**
   * The APNs environment the token was minted in, which is the phone build's
   * `aps-environment` entitlement (research 128 §5), or `''` with no token.
   * Hashed with the token: a token sent to the other environment is refused by
   * Apple, and the host is chosen from this field per destination.
   */
  readonly pushEnvironment: '' | 'development' | 'production';
}

/**
 * The fields of the door that decide what it answers, and to whom.
 *
 * Every field below is here because a value in it decides whether a request
 * from outside this Mac is answered. A field that only decides how something
 * looks is not here, and adding one would make the gate ask again for a change
 * that cannot hurt anybody.
 */
export interface PocketExecutionFields {
  /** The tailnet address the door binds. Never `0.0.0.0`, never a name. */
  readonly bindAddress: string;
  /** The port a phone was TOLD. A taken one refuses rather than moving. */
  readonly port: number;
  /** Whether the door comes up with the app. */
  readonly bindAtLaunch: boolean;
  /**
   * The route ids this build answers. A phase that adds a route moves the
   * hash, so a person reads the new list before anything answers on it.
   */
  readonly routes: readonly PocketRouteId[];
  /** Every phone allowed to ask. */
  readonly phones: readonly PocketPhoneFields[];
  /**
   * Whether Tortie tells the allowed phones, through Apple, when a session
   * starts waiting on the person (Phase 314). Hashed, so turning it on moves
   * the hash and the door and the push both refuse until a person confirms
   * again: it sends his session and project names to a vendor.
   */
  readonly pushAlerts: boolean;
}

/**
 * How each field is turned into hash input.
 *
 * The mapped type covers EVERY key of {@link PocketExecutionFields}, so a field
 * added to that type without a line here is a compile error rather than a field
 * that silently falls out of the hash. `../machines/confirm.ts` states the rule
 * and this is the same rule; Phase 83 added a field to that gate through
 * exactly this route and the compile error is what asked for its line.
 */
type Normalizers = {
  readonly [K in keyof PocketExecutionFields]-?: (
    value: PocketExecutionFields[K]
  ) => unknown;
};

const NORMALIZE: Normalizers = {
  bindAddress: (v) => v,
  port: (v) => v,
  bindAtLaunch: (v) => v,
  // Sorted, so the order this build happens to declare them in is not part of
  // the agreement. Adding one still moves the hash, which is the point.
  routes: (v) => [...v].sort(),
  // Sorted by the derived id, and every field of every phone is emitted. A
  // phone whose address or label moved is a different agreement.
  phones: (v) =>
    [...v]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((p) => [
        p.id,
        p.label,
        p.signingKey,
        p.exchangeKey,
        p.address,
        p.pushToken,
        p.pushEnvironment
      ]),
  pushAlerts: (v) => v
};

/**
 * Names the algorithm, so a record written by an older build fails loudly.
 *
 * `v2` since Phase 314, because the canonical text changed shape: the switch
 * and each phone's token and environment joined it. A record written under v1
 * reads as `changed`, which asks again, and that is the safe direction.
 */
export const POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v2';

/**
 * The prefix on the record key AND on the hash input id, for the reason
 * `MACHINE_CONFIRM_ID_PREFIX` carries both: neither half is load bearing alone.
 */
export const POCKET_CONFIRM_ID_PREFIX = 'pocket:';

/** There is one door, so there is one record key. */
export const POCKET_CONFIRM_RECORD_KEY = `${POCKET_CONFIRM_ID_PREFIX}door`;

/** Everything an unconfigured door has. */
export const EMPTY_POCKET_FIELDS: PocketExecutionFields = {
  bindAddress: '',
  port: 0,
  bindAtLaunch: false,
  routes: POCKET_ROUTE_IDS,
  phones: [],
  pushAlerts: false
};

/** The text that is hashed. Exported so a test can read what was covered. */
export function canonicalPocketText(fields: PocketExecutionFields): string {
  const keys = (Object.keys(NORMALIZE) as (keyof PocketExecutionFields)[]).sort();
  const rows: [string, unknown][] = [['id', POCKET_CONFIRM_RECORD_KEY]];
  for (const key of keys) {
    const normalize = NORMALIZE[key] as (value: unknown) => unknown;
    rows.push([key, normalize(fields[key])]);
  }
  return `${POCKET_EXECUTION_HASH_ALGORITHM}\n${JSON.stringify(rows)}`;
}

/** The hash a confirmation is bound to. */
export function pocketExecutionHash(fields: PocketExecutionFields): string {
  return createHash('sha256').update(canonicalPocketText(fields)).digest('hex');
}

// ---------------------------------------------------------------------------
// What the person reads
// ---------------------------------------------------------------------------

/**
 * The exact sentence {@link confirmPocketDoor} demands.
 *
 * It is a sentence rather than `true` so that it cannot be produced by a
 * default, by a spread, or by an options object passed through from somewhere
 * else. The type is the literal, so a wrong string is a compile error as well
 * as a refusal at runtime.
 *
 * IT IS SUPPLIED IN MAIN, by the handler a person's click reaches. It is never
 * sent from the renderer and never read from a file, so the sentence means "a
 * person pressed the button in Tortie" and cannot mean anything else.
 */
export const POCKET_CONFIRM_ACKNOWLEDGEMENT =
  'a person read what this door will answer and allowed it';

/** Everything the gate needs from the person who agreed. */
export interface PocketConfirmConsent {
  readonly acknowledgement: typeof POCKET_CONFIRM_ACKNOWLEDGEMENT;
  /** The lines the person actually read, which is the sheet they saw. */
  readonly linesRead: readonly string[];
  /** The hash the sheet was drawn from. */
  readonly hashRead: string;
}

export interface PocketDoorSummary {
  readonly hash: string;
  readonly algorithm: string;
  /** The lines a person reads, and they are exactly the hashed facts. */
  readonly lines: readonly string[];
  /** {@link POCKET_CONFIRM_WARNING}, carried so no sheet can omit it. */
  readonly warning: string;
}

/** Read the door as the lines a person is asked to agree to. Pure. */
export function describePocketDoor(
  fields: PocketExecutionFields
): PocketDoorSummary {
  const lines: string[] = [];
  lines.push(`Answers on this Mac's tailnet address: ${fields.bindAddress}`);
  lines.push(`Port: ${String(fields.port)}`);
  lines.push(
    fields.bindAtLaunch
      ? 'Starts answering when Tortie starts'
      : 'Answers only after you turn it on'
  );
  lines.push(`Answers these and nothing else: ${[...fields.routes].sort().join(', ')}`);
  lines.push(
    fields.pushAlerts
      ? 'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps'
      : 'Tells your phone nothing through Apple'
  );
  for (const phone of [...fields.phones].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    lines.push(
      `Allows the phone "${phone.label}" at ${phone.address}, key ${pairFingerprint(
        phone.signingKey,
        phone.exchangeKey
      )}`
    );
    if (phone.pushToken.length > 0) {
      lines.push(
        `Alerts for "${phone.label}" go through Apple (${phone.pushEnvironment}), device ${pushTokenDigest(
          phone.pushToken
        ).slice(0, 8)}`
      );
    }
  }
  if (fields.phones.length === 0) lines.push('Allows no phone yet');
  return {
    hash: pocketExecutionHash(fields),
    algorithm: POCKET_EXECUTION_HASH_ALGORITHM,
    lines,
    warning: POCKET_CONFIRM_WARNING
  };
}

// ---------------------------------------------------------------------------
// The state of the door
// ---------------------------------------------------------------------------

export type PocketConfirmState = 'confirmed' | 'never' | 'changed' | 'unknown';

export interface PocketConfirmRowStatus {
  readonly state: PocketConfirmState;
  readonly hash: string;
  readonly confirmedHash: string | null;
  readonly confirmedAt: number | null;
  readonly lines: readonly string[];
  /** One sentence saying why the door may not answer. Null when it may. */
  readonly refusal: string | null;
}

function neverConfirmedRefusal(): string {
  return (
    'Tortie will not answer from your tailnet, because nobody has confirmed ' +
    'this door. Read what it will answer and confirm it in Tortie first. ' +
    'Nothing is listening.'
  );
}

function changedRefusal(): string {
  return (
    'Tortie will not answer from your tailnet, because this door changed ' +
    'after you confirmed it. Read the change and confirm it again if it is ' +
    'what you want. Nothing is listening.'
  );
}

function sealUnknownRefusal(): string {
  return (
    'Tortie could not read its record of what you confirmed, so it will not ' +
    'answer from your tailnet. Nothing is listening.'
  );
}

/** The records, read fresh on every call. See ../config/confirm-record.ts. */
function readState(): ReturnType<typeof readConfirmRecords> {
  return readConfirmRecords(POCKET_EXECUTION_HASH_ALGORITHM);
}

/**
 * What is on record for the door, against its fields as they are right now.
 *
 * Reads the record file. Binds nothing, and cannot: there is no socket in this
 * module. The order of the checks is the machine gate's order, for the same
 * reasons: the seal, then the record, then the hash.
 */
export function pocketConfirmStatus(fields: PocketExecutionFields): PocketConfirmRowStatus {
  const summary = describePocketDoor(fields);
  const state = readState();
  const row = state.rows[POCKET_CONFIRM_RECORD_KEY];
  const base = {
    hash: summary.hash,
    lines: summary.lines,
    confirmedHash: row?.hash ?? null,
    confirmedAt: row?.at ?? null
  };
  if (!state.sealKnown) {
    return { ...base, state: 'unknown', refusal: sealUnknownRefusal() };
  }
  if (row === undefined) {
    return { ...base, state: 'never', refusal: neverConfirmedRefusal() };
  }
  if (row.hash !== summary.hash) {
    return { ...base, state: 'changed', refusal: changedRefusal() };
  }
  return { ...base, state: 'confirmed', refusal: null };
}

/** The gate. Throws when the door may not answer, returns nothing when it may. */
export function assertPocketDoorMayBind(fields: PocketExecutionFields): void {
  const status = pocketConfirmStatus(fields);
  if (status.refusal !== null) {
    throw gmuxError('INVALID_INPUT', status.refusal);
  }
}

// ---------------------------------------------------------------------------
// Recording an agreement
// ---------------------------------------------------------------------------

type ConfirmListener = () => void;
let confirmListeners: ConfirmListener[] = [];

/** Fire `cb` after the door's confirmation is recorded or withdrawn. */
export function onPocketConfirmationChanged(cb: ConfirmListener): () => void {
  confirmListeners.push(cb);
  return () => {
    confirmListeners = confirmListeners.filter((one) => one !== cb);
  };
}

function fireConfirmationChanged(): void {
  for (const cb of [...confirmListeners]) {
    try {
      cb();
    } catch (err) {
      pocketLog.warn(
        `a pocket confirmation listener threw: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

/**
 * Record that a person agreed to the door as these fields describe it. The only
 * way a pocket confirmation is ever written.
 *
 * Refuses when the acknowledgement is not exact, and when the fields moved
 * between the sheet being drawn and the person pressing the button. Returns
 * null when the OS keystore cannot seal the record, because a confirmation the
 * next load would refuse would make the product lie about what it will do.
 */
export function confirmPocketDoor(
  fields: PocketExecutionFields,
  consent: PocketConfirmConsent
): ConfirmRecord | null {
  if (consent.acknowledgement !== POCKET_CONFIRM_ACKNOWLEDGEMENT) {
    throw gmuxError(
      'INVALID_INPUT',
      'A door is confirmed by a person, not by a file. Pass ' +
        'POCKET_CONFIRM_ACKNOWLEDGEMENT exactly. Nothing was confirmed.'
    );
  }
  const summary = describePocketDoor(fields);
  if (consent.hashRead !== summary.hash) {
    throw gmuxError(
      'INVALID_INPUT',
      'Tortie did not confirm this door, because it changed after it was ' +
        'shown. Read it again and confirm what it says now. Nothing was ' +
        'confirmed.'
    );
  }
  const record: ConfirmRecord = {
    id: POCKET_CONFIRM_RECORD_KEY,
    hash: summary.hash,
    algorithm: summary.algorithm,
    at: Date.now(),
    lines: [...consent.linesRead]
  };
  const rows = { ...readState().rows, [POCKET_CONFIRM_RECORD_KEY]: record };
  if (!writeConfirmRecords(rows)) {
    pocketLog.warn(
      'the OS keystore is unavailable, so the confirmation for the tailnet ' +
        'door could not be recorded. It was not written.'
    );
    return null;
  }
  fireConfirmationChanged();
  return record;
}

/** Drop the door's confirmation, so it stops answering and asks again. */
export function forgetPocketDoor(): void {
  const rows = { ...readState().rows };
  if (rows[POCKET_CONFIRM_RECORD_KEY] === undefined) return;
  delete rows[POCKET_CONFIRM_RECORD_KEY];
  writeConfirmRecords(rows);
  fireConfirmationChanged();
}

// ---------------------------------------------------------------------------
// The keys, and the store that holds them
// ---------------------------------------------------------------------------

/** The third seal prefix, beside the settings danger seal and the confirm one. */
export const POCKET_STORE_SEAL_PREFIX = 'gmux-pocket-store-v1:';

/** Tortie's own long-lived keys for this door. */
export interface PocketIdentity {
  readonly signPublic: string;
  readonly signPrivate: KeyObject;
  readonly exchangePublic: string;
  readonly exchangePrivate: KeyObject;
}

interface SealedIdentity {
  readonly signPrivate: string;
  readonly exchangePrivate: string;
}

/** What `<userData>/gmux/pocket.json` holds, once the seal is opened. */
export interface PocketStore {
  readonly identity: SealedIdentity;
  readonly phones: readonly PocketPhoneFields[];
  readonly port: number;
  readonly bindAtLaunch: boolean;
  readonly enabled: boolean;
  /** The push switch (Phase 314). A hashed field; see {@link PocketExecutionFields}. */
  readonly pushAlerts: boolean;
  /**
   * The sha256 of every device token Apple said is no longer good, oldest first
   * and at most {@link POCKET_DEAD_TOKEN_MEMORY} (Phase 314).
   *
   * NOT HASHED, on purpose: it can only NARROW where a person's words go, and
   * a subtraction needs no human. Hashing it would switch the door off on
   * every 410. The digest and never the token, so the list itself names no
   * address at Apple.
   */
  readonly deadPushTokens: readonly string[];
}

/** How many dropped device tokens are remembered. Oldest go first. */
export const POCKET_DEAD_TOKEN_MEMORY = 64;

/**
 * Is this a token's digest: sha256, 64 lowercase hex?
 *
 * Written as a length and a character class rather than as one fixed-width hex
 * pattern, because that pattern is exactly the hook server's token-in-a-path
 * matcher, which `conformance:pocket` A2 refuses anywhere in this domain. A
 * digest in a sealed file is not a secret in a URL, and the rule is not
 * loosened to say so.
 */
export function isPushTokenDigest(value: unknown): value is string {
  return typeof value === 'string' && value.length === 64 && /^[0-9a-f]+$/.test(value);
}

/** The dead list as the store may hold it: digests only, newest 64 kept. */
function deadTokensOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPushTokenDigest).slice(-POCKET_DEAD_TOKEN_MEMORY);
}

/**
 * The digest a device token is known by everywhere it is not being sent to:
 * the dead list, the sheet's `device` line and the push engine's drop. sha256
 * of the lowercase hex, lowercase hex.
 */
export function pushTokenDigest(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * One place a push goes (Phase 314). MAIN ONLY: it carries the token, which is
 * never logged and never in any answer to the renderer, so this type lives here
 * and nowhere under `src/shared/`.
 */
export interface PocketPushDestination {
  readonly phoneId: string;
  /** Never logged, never in any answer to the renderer. */
  readonly token: string;
  readonly environment: 'development' | 'production';
  /** sha256(token) hex; the only form stored in `deadPushTokens`. */
  readonly tokenDigest: string;
}

/**
 * `<userData>/gmux/pocket.json`, a sibling of the confirmation record.
 *
 * The inner `gmux/` directory is one of the identifiers live data is bound to
 * (CLAUDE.md, Phase 16.5). It stays `gmux` and is not "finished off".
 */
export function pocketStorePath(): string {
  return join(app.getPath('userData'), 'gmux', 'pocket.json');
}

/**
 * Read the store. The WHOLE payload is sealed, so a file an agent writes
 * carries nothing: a forged, truncated or foreign blob proves nothing, covers
 * nothing, and reads as no store at all.
 *
 * `sealKnown` false means the app is not ready or the keystore is unavailable,
 * so the answer is not known YET and the caller must ask again rather than
 * remember the safe answer for the whole run.
 */
export function readPocketStore(): {
  store: PocketStore | null;
  sealKnown: boolean;
} {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readFileSync(pocketStorePath(), 'utf8'));
  } catch {
    // Missing or corrupt. Nothing is stored, which allows nothing and is never
    // repaired in place.
  }
  const blob =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)['sealed']
      : undefined;
  const opened = openSealedText(POCKET_STORE_SEAL_PREFIX, blob);
  if (opened === null) return { store: null, sealKnown: false };
  if (opened.length === 0) return { store: null, sealKnown: true };
  try {
    const parsed = JSON.parse(opened) as PocketStore;
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof parsed.identity?.signPrivate !== 'string' ||
      typeof parsed.identity?.exchangePrivate !== 'string'
    ) {
      return { store: null, sealKnown: true };
    }
    return {
      store: {
        identity: parsed.identity,
        phones: Array.isArray(parsed.phones) ? phoneRowsOf(parsed.phones) : [],
        port: typeof parsed.port === 'number' ? parsed.port : 0,
        bindAtLaunch: parsed.bindAtLaunch === true,
        enabled: parsed.enabled === true,
        pushAlerts: parsed.pushAlerts === true,
        deadPushTokens: deadTokensOf((parsed as { deadPushTokens?: unknown }).deadPushTokens)
      },
      sealKnown: true
    };
  } catch {
    return { store: null, sealKnown: true };
  }
}

/**
 * An invalid phone row is dropped WHOLE, never partially merged and never a
 * crash. CLAUDE.md's second mechanical rule for any overlay type.
 *
 * A row written before Phase 314 has no push fields and reads as a phone that
 * gave no token, `''` and `''`. A row whose push fields are PRESENT and wrong
 * is dropped whole like any other bad row: a token that is not the shape the
 * pairing accepts was not written by the pairing.
 */
function phoneRowOf(row: unknown): PocketPhoneFields | null {
  if (row === null || typeof row !== 'object') return null;
  const p = row as Record<string, unknown>;
  const whole =
    typeof p['id'] === 'string' &&
    p['id'].length > 0 &&
    typeof p['label'] === 'string' &&
    typeof p['signingKey'] === 'string' &&
    p['signingKey'].length > 0 &&
    typeof p['exchangeKey'] === 'string' &&
    p['exchangeKey'].length > 0 &&
    typeof p['address'] === 'string' &&
    p['address'].length > 0;
  if (!whole) return null;
  const hasToken = p['pushToken'] !== undefined;
  const hasEnvironment = p['pushEnvironment'] !== undefined;
  let push: PushFields | null;
  if (!hasToken && !hasEnvironment) {
    push = NO_PUSH;
  } else if (p['pushToken'] === '' && p['pushEnvironment'] === '') {
    push = NO_PUSH;
  } else {
    push = pushFieldsOf(p['pushToken'], p['pushEnvironment'], false);
  }
  if (push === null) return null;
  return {
    id: p['id'] as string,
    label: p['label'] as string,
    signingKey: p['signingKey'] as string,
    exchangeKey: p['exchangeKey'] as string,
    address: p['address'] as string,
    pushToken: push.pushToken,
    pushEnvironment: push.pushEnvironment
  };
}

function phoneRowsOf(rows: readonly unknown[]): PocketPhoneFields[] {
  const out: PocketPhoneFields[] = [];
  for (const row of rows) {
    const phone = phoneRowOf(row);
    if (phone !== null) out.push(phone);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The device token, and its one door in
// ---------------------------------------------------------------------------

/** A phone's push fields, together or not at all. */
interface PushFields {
  readonly pushToken: string;
  readonly pushEnvironment: '' | 'development' | 'production';
}

const NO_PUSH: PushFields = { pushToken: '', pushEnvironment: '' };

/**
 * A device token: hex of 32 to 256 characters (research 128 §5; Apple's own
 * "hexadecimal bytes"). Case is folded to lowercase on the way in, so one token
 * has one spelling and one digest.
 */
const PUSH_TOKEN_RE = /^[0-9a-fA-F]{32,256}$/;

/**
 * A token and its environment, or null when either is wrong.
 *
 * BOTH OR NEITHER. A token with no environment cannot be addressed, because
 * the host is chosen from the environment, and an environment with no token
 * addresses nothing. `fold` is true for what a phone presented, which may
 * spell its hex in either case and is folded to lowercase, and false for a
 * stored row, which Tortie wrote in lowercase and which is dropped if it is not.
 */
function pushFieldsOf(token: unknown, environment: unknown, fold: boolean): PushFields | null {
  if (typeof token !== 'string' || !PUSH_TOKEN_RE.test(token)) return null;
  if (!fold && token !== token.toLowerCase()) return null;
  if (environment !== 'development' && environment !== 'production') return null;
  return { pushToken: token.toLowerCase(), pushEnvironment: environment };
}

/**
 * What a presentation's `apt` and `ape` say, or null when the presentation must
 * be refused WHOLE (Phase 314). Neither key present is a phone that asks for no
 * alerts, which is honest and is paired like any other.
 */
function presentedPush(inner: Record<string, unknown>): PushFields | null {
  const hasToken = Object.prototype.hasOwnProperty.call(inner, 'apt');
  const hasEnvironment = Object.prototype.hasOwnProperty.call(inner, 'ape');
  if (!hasToken && !hasEnvironment) return NO_PUSH;
  return pushFieldsOf(inner['apt'], inner['ape'], true);
}

/**
 * Write the whole store, sealed. False when the keystore could not seal it, and
 * in that case nothing is written at all: a store the next load would refuse
 * would make the product lie about which phones it allows.
 */
export function writePocketStore(store: PocketStore): boolean {
  const sealed = sealText(POCKET_STORE_SEAL_PREFIX, JSON.stringify(store));
  if (sealed === undefined) return false;
  const path = pocketStorePath();
  // OWNER ONLY, on the directory and on the file. The payload is safeStorage
  // ciphertext behind the login keychain's own ACL, so the mode is not what
  // keeps it secret — but `./tls.ts` writes its sibling at 0o600 and an
  // unexplained asymmetry inside one domain is how the stricter one gets
  // "tidied" to match the looser one. Measured before this was added: 0o644
  // under the operator's umask 022, with the directory at 0755.
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ version: 1, sealed }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  renameSync(tmp, path); // atomic on the same volume
  return true;
}

/** Turn a sealed identity back into keys. */
export function openIdentity(sealed: SealedIdentity): PocketIdentity {
  const signPrivate = createPrivateKey({
    key: unb64u(sealed.signPrivate),
    format: 'der',
    type: 'pkcs8'
  });
  const exchangePrivate = createPrivateKey({
    key: unb64u(sealed.exchangePrivate),
    format: 'der',
    type: 'pkcs8'
  });
  return {
    signPrivate,
    exchangePrivate,
    signPublic: b64u(
      createPublicKey(signPrivate).export({ format: 'der', type: 'spki' })
    ),
    exchangePublic: b64u(
      createPublicKey(exchangePrivate).export({ format: 'der', type: 'spki' })
    )
  };
}

/** Mint a fresh identity. Called once, the first time the door is set up. */
export function newIdentity(): { identity: PocketIdentity; sealed: SealedIdentity } {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const sealed: SealedIdentity = {
    signPrivate: b64u(ed.privateKey.export({ format: 'der', type: 'pkcs8' })),
    exchangePrivate: b64u(x.privateKey.export({ format: 'der', type: 'pkcs8' }))
  };
  return { identity: openIdentity(sealed), sealed };
}

// ---------------------------------------------------------------------------
// The fingerprint both screens show
// ---------------------------------------------------------------------------

/**
 * Six groups of four hex characters over BOTH public keys.
 *
 * It covers both keys on purpose. A fingerprint of the phone's key alone would
 * be reproducible by anything holding that key, and what the person is being
 * asked is not "is this the key I have" but "are these two ends the two ends I
 * think they are". It is a hash of public material and is not a secret.
 */
export function pairFingerprint(signingKey: string, exchangeKey: string): string {
  const digest = createHash('sha256')
    .update(`tortie-pocket-fp-v1\n${signingKey}\n${exchangeKey}`)
    .digest('hex');
  return (digest.slice(0, 24).match(/.{4}/g) ?? []).join(' ');
}

/** The phone's id, DERIVED from its signing key so nobody chooses it. */
export function phoneIdOf(signingKey: string): string {
  return createHash('sha256')
    .update(`tortie-pocket-id-v1\n${signingKey}`)
    .digest('hex')
    .slice(0, 32);
}

// ---------------------------------------------------------------------------
// The pairing window
// ---------------------------------------------------------------------------

/**
 * How long a window lives. A few minutes, and one shot. The phone must join
 * the tailnet AND present inside it, which is what the sheet's line says.
 */
export const POCKET_PAIRING_WINDOW_MS = 3 * 60_000;

/** The QR's version. v:2 pins the key rather than the certificate (Phase 316). */
export const POCKET_QR_VERSION = 2;

/**
 * Every tailnet AUTH key Tailscale mints begins with this (Phase 316). An API
 * access token, an OAuth client secret or anything else pasted by mistake does
 * not, and is refused before it reaches the window.
 */
export const TAILNET_AUTH_KEY_PREFIX = 'tskey-auth-';

/** The longest tailnet key the sheet accepts. Tailscale's are far shorter. */
export const TAILNET_KEY_MAX_CHARS = 256;

/**
 * The key a person pasted, as bytes the window can zero, or null for "the
 * phone needs no key". Throws with ONE SENTENCE that never repeats the value.
 *
 * Surrounding whitespace is a paste artefact and is dropped. Anything else
 * that is not printable ASCII — a space inside it, a line break, a control
 * byte — is not part of any key Tailscale mints and refuses the whole value,
 * because the QR is the phone's only copy and a mangled key fails on the
 * phone with nobody watching the Mac.
 */
export function tailnetKeyOf(input: unknown): Buffer | null {
  if (input === null || typeof input !== 'object') throw notAKey(KEY_NOT_READ);
  const raw = (input as { tailnetKey?: unknown }).tailnetKey;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') throw notAKey(KEY_NOT_READ);
  // Length FIRST, before any other work on the value, so a pasted megabyte is
  // refused for what it is rather than walked.
  if (raw.length > TAILNET_KEY_MAX_CHARS * 4) throw notAKey(KEY_TOO_LONG);
  const key = raw.trim();
  if (key.length === 0) return null;
  if (key.length > TAILNET_KEY_MAX_CHARS) throw notAKey(KEY_TOO_LONG);
  if (!key.startsWith(TAILNET_AUTH_KEY_PREFIX) || key.length === TAILNET_AUTH_KEY_PREFIX.length) {
    throw notAKey(KEY_NOT_AUTH);
  }
  if (!/^[\x21-\x7e]+$/.test(key)) throw notAKey(KEY_NOT_AUTH);
  return Buffer.from(key, 'utf8');
}

const KEY_NOT_READ =
  'Tortie could not read that tailnet key. Nothing was opened.';
const KEY_TOO_LONG =
  'That is longer than any tailnet key Tailscale makes. Nothing was opened.';
const KEY_NOT_AUTH =
  'That is not a tailnet auth key. Mint one in your Tailscale admin console; ' +
  'it starts with tskey-auth-. Nothing was opened.';

function notAKey(sentence: string): Error {
  return gmuxError('INVALID_INPUT', sentence);
}

/**
 * The QR's `fp`: sha256 over the door's SubjectPublicKeyInfo, base64url, from
 * the colon-separated hex `./tls.ts` hands out. Null for anything that is not
 * exactly 32 bytes, so a malformed fingerprint can never become a pin.
 */
export function spkiPinOf(publicKeyFingerprint: string | null): string | null {
  if (publicKeyFingerprint === null) return null;
  const hex = publicKeyFingerprint.replace(/:/g, '');
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return b64u(Buffer.from(hex, 'hex'));
}

const NO_DOOR_TO_PIN =
  'The door is not listening, so there is no key for a phone to pin. Turn ' +
  'the door on and confirm it first. Nothing was opened.';

/** The info string the pairing key is derived under. */
const PAIRING_INFO = 'tortie-pocket-pair-v1';

/** The most bytes `POST /pair` will read before dropping the request whole. */
export const POCKET_PAIR_BODY_CAP_BYTES = 4 * 1024;

/** What a phone sealed and sent. */
export interface PocketPresentation {
  readonly label: string;
  readonly signingKey: string;
  readonly exchangeKey: string;
  /** `apt`, lowercase hex, or `''` when the phone asked for no alerts (Phase 314). */
  readonly pushToken: string;
  /** `ape`, the environment the token was minted in, or `''` with no token. */
  readonly pushEnvironment: '' | 'development' | 'production';
}

/** What `POST /pair` answers. One word, and nothing else ever. */
export type PocketPairAnswer = 'pending' | 'allowed' | 'refused';

interface OpenWindow {
  secret: Buffer;
  /**
   * The tailnet key the person pasted, or null (Phase 316). Zeroed with the
   * secret, at every place the secret is, and never read again after the QR
   * was composed.
   */
  tailnetKey: Buffer | null;
  expiresAt: number;
  presented: PocketPresentation | null;
  presentedFrom: string | null;
  allowed: boolean;
}

/**
 * The pairing window and the phone set, as one owner.
 *
 * It holds the ONE-SHOT secret in memory only, and since Phase 316 the tailnet
 * key the person pasted beside it. Nothing writes either to disk, nothing logs
 * either, and `cancel`, expiry, the allow and a replacing window all zero both,
 * which is what makes a photographed screen useless after the window shuts.
 */
export class PocketPairing {
  private window: OpenWindow | null = null;

  constructor(
    private readonly deps: {
      identity: () => PocketIdentity;
      /** The door's fields as they are right now, WITHOUT the pending phone. */
      fieldsNow: () => PocketExecutionFields;
      /** Persist the phone set after a person allowed one. */
      savePhones: (phones: readonly PocketPhoneFields[]) => boolean;
      /**
       * The QR's `fp`: the listening door's public-key pin, base64url
       * ({@link spkiPinOf}), or null while no door is listening, in which
       * case no window opens.
       */
      publicKeyPin: () => string | null;
      now?: () => number;
    }
  ) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  /** Drop an expired window, so every read below sees one truth. */
  private sweep(): void {
    const w = this.window;
    if (w === null) return;
    // THE DEADLINE IS THE WHOLE OF IT, and an allowed window is swept like any
    // other. An earlier version kept an allowed window forever so that the
    // phone could still be told it had been allowed, and the cost was that the
    // sheet said "allowed" for the rest of the run and the secret's buffer
    // outlived its use. The deadline does both jobs: the phone has minutes to
    // ask, and afterwards the window is gone, the sheet is idle, and the
    // photographed screen is worth nothing.
    if (this.now() < w.expiresAt) return;
    shred(w);
    this.window = null;
  }

  /**
   * Open a window and answer the QR. Any window already open is replaced.
   *
   * EVERY REFUSAL COMES BEFORE ANYTHING MOVES: a bad key, no address and no
   * listening door each leave the window that was open, open, and mint
   * nothing. The order after that is the safety: the old window is shredded,
   * then the new one is made.
   */
  open(input: PocketPairingInput): PocketPairingOffer {
    const tailnetKey = tailnetKeyOf(input);
    try {
      const fields = this.deps.fieldsNow();
      if (fields.bindAddress.length === 0) {
        throw gmuxError(
          'INVALID_INPUT',
          'This Mac has no tailnet address, so there is nothing for a phone to ' +
            'reach. Nothing was opened.'
        );
      }
      const pin = this.deps.publicKeyPin();
      if (pin === null) throw gmuxError('INVALID_INPUT', NO_DOOR_TO_PIN);
      const identity = this.deps.identity();
      this.cancel();
      const secret = randomBytes(16);
      const expiresAt = this.now() + POCKET_PAIRING_WINDOW_MS;
      this.window = {
        secret,
        tailnetKey,
        expiresAt,
        presented: null,
        presentedFrom: null,
        allowed: false
      };
      const payload = JSON.stringify({
        v: POCKET_QR_VERSION,
        host: fields.bindAddress,
        port: fields.port,
        fp: pin,
        dk: identity.signPublic,
        dx: identity.exchangePublic,
        ps: b64u(secret),
        exp: expiresAt,
        ...(tailnetKey !== null ? { tk: tailnetKey.toString('utf8') } : {})
      });
      return { payload, expiresAt };
    } catch (err) {
      // A refusal after the key was read still zeroes the key: it never
      // reached a window, so nothing else will.
      if (tailnetKey !== null && this.window?.tailnetKey !== tailnetKey) {
        tailnetKey.fill(0);
      }
      throw err;
    }
  }

  /** Shut the window now and destroy the secret and the tailnet key. */
  cancel(): void {
    const w = this.window;
    if (w === null) return;
    shred(w);
    this.window = null;
  }

  /**
   * Is a tailnet key held right now? For the tests and the gate that prove it
   * is dropped: it answers a boolean and never the bytes.
   */
  holdsTailnetKey(): boolean {
    this.sweep();
    const w = this.window;
    return w !== null && w.tailnetKey !== null && w.tailnetKey.some((b) => b !== 0);
  }

  /** True only inside an open, unexpired window. `/pair` is dead otherwise. */
  windowOpen(): boolean {
    this.sweep();
    return this.window !== null;
  }

  /**
   * A phone presented itself. The body is AES-256-GCM sealed under a key
   * derived from the QR's one-shot secret, so a body that will not open is a
   * body that never saw the QR, and it is dropped whole with one word.
   *
   * IT ALLOWS NOTHING. Presenting only puts a name and two public keys in front
   * of the person. The Mac asks them last.
   *
   * IT IS ALSO HOW THE PHONE LEARNS IT WAS ALLOWED, and that is why it is
   * idempotent. The pairing screen says "Your Mac will ask you to allow this
   * iPhone. Nothing is paired until you do", so the phone is sitting on that
   * sentence with nothing to do but ask again. Asking again inside the window
   * answers `allowed` to the phone that was allowed, and `refused` to anything
   * else — including a second phone that photographed the same screen, because
   * the secret was destroyed by the allow and nothing it sends can be opened.
   */
  present(body: Buffer, from: string): PocketPairAnswer {
    this.sweep();
    const w = this.window;
    if (w === null) return 'refused';
    if (w.allowed) {
      return w.presentedFrom === from ? 'allowed' : 'refused';
    }
    const opened = this.openPresentation(w.secret, body);
    if (opened === null) return 'refused';
    // A second phone during one window replaces the first. The person has not
    // been asked yet, so nothing they agreed to is being overwritten, and the
    // sheet redraws with the fingerprint of whatever is actually in front of
    // it. Two phones cannot both be pending, so the sheet is never ambiguous.
    w.presented = opened;
    w.presentedFrom = from;
    return 'pending';
  }

  private openPresentation(
    secret: Buffer,
    body: Buffer
  ): PocketPresentation | null {
    try {
      const outer = JSON.parse(body.toString('utf8')) as Record<string, unknown>;
      const iv = unb64u(String(outer['iv'] ?? ''));
      const ct = unb64u(String(outer['ct'] ?? ''));
      const tag = unb64u(String(outer['tag'] ?? ''));
      if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;
      const key = Buffer.from(
        hkdfSync('sha256', secret, Buffer.alloc(0), PAIRING_INFO, 32)
      );
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
      const inner = JSON.parse(plain.toString('utf8')) as Record<string, unknown>;
      const label = String(inner['label'] ?? '').slice(0, 64);
      const signingKey = String(inner['ek'] ?? '');
      const exchangeKey = String(inner['xk'] ?? '');
      if (signingKey.length === 0 || exchangeKey.length === 0) return null;
      // The keys must actually BE keys of the kinds this door signs and derives
      // with, or a later verify would be deciding on something nobody checked.
      if (!isPublicKeyOfType(signingKey, 'ed25519')) return null;
      if (!isPublicKeyOfType(exchangeKey, 'x25519')) return null;
      // THE DEVICE TOKEN'S ONE DOOR IN (Phase 314). It rides inside this sealed
      // body because the route table is closed and gains no route for it. A
      // token or an environment that is not exactly the shape refuses the
      // WHOLE presentation with the same one word as every other refusal.
      const push = presentedPush(inner);
      if (push === null) return null;
      return {
        label: label.length > 0 ? label : 'A phone',
        signingKey,
        exchangeKey,
        pushToken: push.pushToken,
        pushEnvironment: push.pushEnvironment
      };
    } catch {
      return null;
    }
  }

  /** What the sheet draws. */
  view(): PocketPairingView {
    this.sweep();
    const w = this.window;
    const warning = POCKET_CONFIRM_WARNING;
    if (w === null) {
      return {
        state: 'idle',
        expiresAt: null,
        label: null,
        fingerprint: null,
        lines: [],
        hash: null,
        warning
      };
    }
    if (w.presented === null) {
      return {
        state: 'waiting',
        expiresAt: w.expiresAt,
        label: null,
        fingerprint: null,
        lines: [],
        hash: null,
        warning
      };
    }
    const next = this.fieldsWithPending();
    const summary = describePocketDoor(next);
    const state: PocketPairingState = w.allowed ? 'allowed' : 'presented';
    return {
      state,
      expiresAt: w.expiresAt,
      label: w.presented.label,
      fingerprint: pairFingerprint(
        w.presented.signingKey,
        w.presented.exchangeKey
      ),
      lines: summary.lines,
      hash: summary.hash,
      warning
    };
  }

  /** The door's fields WITH the phone that is waiting to be allowed. */
  fieldsWithPending(): PocketExecutionFields {
    this.sweep();
    const fields = this.deps.fieldsNow();
    const w = this.window;
    if (w === null || w.presented === null || w.presentedFrom === null) {
      return fields;
    }
    const phone: PocketPhoneFields = {
      id: phoneIdOf(w.presented.signingKey),
      label: w.presented.label,
      signingKey: w.presented.signingKey,
      exchangeKey: w.presented.exchangeKey,
      address: w.presentedFrom,
      pushToken: w.presented.pushToken,
      pushEnvironment: w.presented.pushEnvironment
    };
    return {
      ...fields,
      phones: [...fields.phones.filter((p) => p.id !== phone.id), phone]
    };
  }

  /**
   * The person allowed the phone in front of them. This is the LAST step and
   * it happens on the Mac.
   *
   * It records the confirmation against the hash the sheet was drawn from, and
   * only then persists the phone. The order matters: a phone written before the
   * agreement was recorded would be a phone the next load allows with nothing
   * on record saying anybody agreed to it.
   */
  allow(consent: PocketConfirmConsent): { allowed: boolean; refusal: string | null } {
    this.sweep();
    const w = this.window;
    if (w === null || w.presented === null) {
      return {
        allowed: false,
        refusal:
          'There is no phone waiting to be allowed. Open the pairing window ' +
          'again and scan the code. Nothing was changed.'
      };
    }
    const next = this.fieldsWithPending();
    const record = confirmPocketDoor(next, consent);
    if (record === null) {
      return {
        allowed: false,
        refusal:
          'Tortie could not record what you agreed to, so it allowed nothing. ' +
          'Nothing was changed.'
      };
    }
    if (!this.deps.savePhones(next.phones)) {
      // The record is written and the phone is not, which reads as "the details
      // changed" on the next load and asks again. That is the safe direction.
      return {
        allowed: false,
        refusal:
          'Tortie could not save this phone, so it allowed nothing. Nothing ' +
          'was changed.'
      };
    }
    w.allowed = true;
    // The window stays until its deadline so the phone can be told it was
    // allowed, but what it held is spent: the secret and the tailnet key go now.
    shred(w);
    return { allowed: true, refusal: null };
  }
}

/** Zero what a window held. The window object itself is dropped by the caller. */
function shred(w: OpenWindow): void {
  w.secret.fill(0);
  w.tailnetKey?.fill(0);
}

/** Is this base64url SPKI really a public key of that kind? */
function isPublicKeyOfType(spki: string, type: 'ed25519' | 'x25519'): boolean {
  try {
    const key = createPublicKey({
      key: unb64u(spki),
      format: 'der',
      type: 'spki'
    });
    return key.asymmetricKeyType === type;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Every request is signed
// ---------------------------------------------------------------------------

/** Names the signing scheme, so a client built for another build fails loudly. */
export const POCKET_REQUEST_ALGORITHM = 'tortie-pocket-req-v1';

/**
 * How far a phone's clock may be from this Mac's.
 *
 * A minute rather than a second. A phone that has just come off a plane is a
 * person's ordinary Tuesday, and a refusal a person did not earn is how a
 * control gets removed. A minute is still far too short for a captured request
 * to be worth replaying, and the nonce makes one replay impossible anyway.
 */
export const POCKET_CLOCK_SKEW_MS = 60_000;

/** How many spent nonces are remembered per phone. */
export const POCKET_NONCE_MEMORY = 512;

/** The headers a signed request carries. None of them is a secret. */
export const POCKET_HEADERS = {
  phone: 'x-tortie-phone',
  timestamp: 'x-tortie-timestamp',
  nonce: 'x-tortie-nonce',
  signature: 'x-tortie-signature'
} as const;

export interface PocketRequestFacts {
  readonly method: string;
  /** The path AND its query, exactly as it arrived. */
  readonly target: string;
  readonly bodySha256: string;
  readonly timestamp: string;
  readonly nonce: string;
  /** The hex binding of this pairing. Never transmitted. */
  readonly binding: string;
}

/**
 * The bytes a signature covers. One definition, read by the door and by every
 * test, so nothing can sign one thing and be checked against another.
 *
 * THE BINDING IS IN IT AND THAT IS THE POINT. It is derived from the X25519
 * shared secret of this pairing and it never crosses the wire, so a signature
 * made for this door cannot be replayed at another door, even by the same phone
 * with the same key.
 */
export function canonicalRequestText(facts: PocketRequestFacts): string {
  return [
    POCKET_REQUEST_ALGORITHM,
    facts.method.toUpperCase(),
    facts.target,
    facts.bodySha256,
    facts.timestamp,
    facts.nonce,
    facts.binding
  ].join('\n');
}

/** The shared binding for one pairing. Derived, never sent. */
export function pairingBinding(
  identity: PocketIdentity,
  phone: PocketPhoneFields
): string {
  const shared = diffieHellman({
    privateKey: identity.exchangePrivate,
    publicKey: createPublicKey({
      key: unb64u(phone.exchangeKey),
      format: 'der',
      type: 'spki'
    })
  });
  return Buffer.from(
    hkdfSync(
      'sha256',
      shared,
      Buffer.from(`${identity.exchangePublic}\n${phone.exchangeKey}`, 'utf8'),
      'tortie-pocket-bind-v1',
      32
    )
  ).toString('hex');
}

/** Every reason a request is refused. A WORD, and never a value. */
export type PocketRefusalReason =
  | 'source-is-door'
  | 'shutdown'
  | 'host'
  | 'route'
  | 'window'
  | 'oversized'
  | 'headers'
  | 'unpaired'
  | 'address'
  | 'stale'
  | 'replay'
  | 'signature';

export type PocketVerdict =
  | { ok: true; phone: PocketPhoneFields }
  | { ok: false; reason: PocketRefusalReason };

/**
 * Does this request come from a phone the person allowed, right now, once?
 *
 * The order is deliberate and each step costs less than the one after it: the
 * headers, then the phone, then the address, then the clock, then the nonce,
 * then the signature. The signature is last because it is the only expensive
 * one, and a request that fails any earlier check never reaches it.
 */
export class PocketRequestVerifier {
  /** phone id → spent nonces, oldest first. */
  private readonly seen = new Map<string, Map<string, number>>();

  constructor(
    private readonly deps: {
      identity: () => PocketIdentity;
      phones: () => readonly PocketPhoneFields[];
      now?: () => number;
    }
  ) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  verify(input: {
    method: string;
    target: string;
    body: Buffer;
    from: string;
    headers: Readonly<Record<string, string | string[] | undefined>>;
  }): PocketVerdict {
    const one = (name: string): string => {
      const v = input.headers[name];
      return typeof v === 'string' ? v : '';
    };
    const phoneId = one(POCKET_HEADERS.phone);
    const timestamp = one(POCKET_HEADERS.timestamp);
    const nonce = one(POCKET_HEADERS.nonce);
    const signature = one(POCKET_HEADERS.signature);
    if (
      phoneId.length === 0 ||
      timestamp.length === 0 ||
      nonce.length < 16 ||
      nonce.length > 64 ||
      signature.length === 0
    ) {
      return { ok: false, reason: 'headers' };
    }
    const phone = this.deps.phones().find((p) => p.id === phoneId);
    if (phone === undefined) return { ok: false, reason: 'unpaired' };
    if (phone.address !== input.from) return { ok: false, reason: 'address' };
    const at = Number(timestamp);
    if (!Number.isFinite(at)) return { ok: false, reason: 'headers' };
    if (Math.abs(this.now() - at) > POCKET_CLOCK_SKEW_MS) {
      return { ok: false, reason: 'stale' };
    }
    if (this.spent(phoneId, nonce)) return { ok: false, reason: 'replay' };
    const text = canonicalRequestText({
      method: input.method,
      target: input.target,
      bodySha256: createHash('sha256').update(input.body).digest('hex'),
      timestamp,
      nonce,
      binding: pairingBinding(this.deps.identity(), phone)
    });
    let good = false;
    try {
      good = verifyWith(
        null,
        Buffer.from(text, 'utf8'),
        createPublicKey({
          key: unb64u(phone.signingKey),
          format: 'der',
          type: 'spki'
        }),
        unb64u(signature)
      );
    } catch {
      good = false;
    }
    if (!good) return { ok: false, reason: 'signature' };
    // Spent ONLY after the signature held, so an unsigned flood cannot fill the
    // memory and push a real nonce out of it.
    this.spend(phoneId, nonce, at);
    return { ok: true, phone };
  }

  private spent(phoneId: string, nonce: string): boolean {
    return this.seen.get(phoneId)?.has(nonce) === true;
  }

  private spend(phoneId: string, nonce: string, at: number): void {
    let mine = this.seen.get(phoneId);
    if (mine === undefined) {
      mine = new Map();
      this.seen.set(phoneId, mine);
    }
    mine.set(nonce, at);
    // Bounded. A nonce older than the skew window can never be accepted again
    // anyway, because the clock check refuses it first.
    const floor = this.now() - POCKET_CLOCK_SKEW_MS;
    for (const [key, when] of [...mine]) {
      if (when < floor) mine.delete(key);
    }
    while (mine.size > POCKET_NONCE_MEMORY) {
      const oldest = mine.keys().next().value;
      if (oldest === undefined) break;
      mine.delete(oldest);
    }
  }

  /** Forget everything about one phone. Called when a person removes it. */
  forget(phoneId: string): void {
    this.seen.delete(phoneId);
  }

  /** Forget everything. Called at shutdown, after the door has stopped. */
  clear(): void {
    this.seen.clear();
  }
}

/**
 * Sign a request the way a phone does. Exported for the tests and the scripted
 * hostile client ONLY, and it is what lets that client run with no Swift.
 *
 * Nothing in the shipping door calls it: main never holds a phone's private key
 * and never signs anything a phone would send.
 */
export function signAsPhone(
  privateKey: KeyObject,
  facts: PocketRequestFacts
): string {
  return b64u(
    signWith(null, Buffer.from(canonicalRequestText(facts), 'utf8'), privateKey)
  );
}

/**
 * Seal a presentation the way a phone does (Phase 314). Exported for the tests
 * and the harness ONLY, the way {@link signAsPhone} is, and it is what lets
 * the probe pair a phone through the SHIPPING `present` with no Swift.
 *
 * Nothing in the shipping door calls it: main never seals a presentation, it
 * only opens one. `offerPayload` is the QR's own bytes, whose `ps` is the
 * one-shot secret the key is derived from.
 */
export function sealPresentationAsPhone(
  offerPayload: string,
  presentation: {
    label: string;
    signingKey: string;
    exchangeKey: string;
    pushToken?: string;
    pushEnvironment?: 'development' | 'production';
  }
): Buffer {
  const offer = JSON.parse(offerPayload) as Record<string, unknown>;
  const secret = unb64u(String(offer['ps'] ?? ''));
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), PAIRING_INFO, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const inner = JSON.stringify({
    label: presentation.label,
    ek: presentation.signingKey,
    xk: presentation.exchangeKey,
    ...(presentation.pushToken !== undefined ? { apt: presentation.pushToken } : {}),
    ...(presentation.pushEnvironment !== undefined ? { ape: presentation.pushEnvironment } : {})
  });
  const ct = Buffer.concat([cipher.update(inner, 'utf8'), cipher.final()]);
  return Buffer.from(
    JSON.stringify({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }),
    'utf8'
  );
}

/**
 * One allowed phone, as the sheet draws it. Nothing here is a secret, and the
 * device token is NOT here: `alerts` says only whether the phone has one that
 * is live, dropped, or none at all (Phase 314).
 */
export function phoneView(
  phone: PocketPhoneFields,
  addedAt: number,
  deadTokens: ReadonlySet<string> = new Set()
): PocketPhoneView {
  return {
    id: phone.id,
    label: phone.label,
    fingerprint: pairFingerprint(phone.signingKey, phone.exchangeKey),
    addedAt,
    address: phone.address,
    alerts:
      phone.pushToken.length === 0
        ? 'none'
        : deadTokens.has(pushTokenDigest(phone.pushToken))
          ? 'stopped'
          : 'on'
  };
}

