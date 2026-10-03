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
 * it. Move the program that publishes the door, the tailnet, the public name,
 * the public port, whether it comes up at launch, the route table or the set
 * of allowed phones (each with its client key), and the hash changes, so
 * Tortie asks again and the door refuses to start until it is answered.
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
 * ## What the QR carries (v:3, Phase 330), and there is NO credential in it
 *
 * The door's PUBLIC NAME (`<mac>.<tailnet>.ts.net`, published through
 * Tailscale Funnel) and its public port; `fp`, the sha256 of the door's PUBLIC
 * KEY (SubjectPublicKeyInfo), base64url, which the phone pins; Tortie's two
 * public keys; the one-shot pairing secret; and the window's deadline. Phase
 * 316's tailnet auth key, which the person pasted and the code carried, is GONE
 * with the reason it existed: the phone never joins the tailnet (research 132
 * Route 1), so there is no key to mint, paste, hold or zero, and nothing in the
 * code is a credential for anything but this one window.
 *
 * `fp` PINS THE KEY AND NOT THE CERTIFICATE. v:1 carried the certificate's
 * hash, and `./tls.ts` renews that certificate from the same key every 397
 * days, so every phone paired under v:1 would have stopped trusting this door
 * thirteen months later with nothing on either screen saying why. The key
 * outlives the certificate, so the pin does too. There is no `fp` without a
 * listening door: {@link PocketPairing.open} refuses when the door has no key
 * to pin, so a QR can never carry `fp: null`.
 *
 * Research 128 section 3.2 stands untouched: Tortie holds no Tailscale API
 * credential, OAuth client, auth key or trust credential, ever.
 *
 * ## Mutual TLS, and the pin is the check (Phase 330)
 *
 * The door is on the public internet, so a stranger must never reach its HTTP
 * parser. Every phone therefore presents a CLIENT KEY — a P-256 key it mints
 * when it scans, in the Secure Enclave where the device has one — inside its
 * sealed presentation, and signs the presentation with its signing key over a
 * challenge only the window's secret can derive. When the person allows it,
 * the Mac issues a certificate over that key (`./tls.ts`,
 * `issueClientCertificate`), and from then on the door process admits a
 * connection only when its handshake completed with a paired phone's client
 * key ({@link clientKeyPinOf}). The verifier then asks that the signed phone
 * IS the phone whose key completed the handshake (`channel`), so a thief needs
 * the client key AND the signing key, which is still two secrets. The client
 * key is a hashed field and it is in the six groups a person matches
 * ({@link pairFingerprint}), so the Mac trusts no key a person did not see.
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
 * It never reads the TLS key: the certificate a phone is issued is handed in by
 * the owner, which holds the door.
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
  POCKET_PUBLIC_PORTS,
  POCKET_ROUTE_IDS,
  POCKET_WRITE_ROUTE_IDS,
  type PocketPairingOffer,
  type PocketPairingState,
  type PocketPairingView,
  type PocketPhoneView,
  type PocketRouteId,
  type PocketWriteRouteId
} from '@shared/ipc/pocket';
import { openSealedText, sealText } from '../config/seal';
import { isP256SpkiDer } from './tls';
import { DOOR_PINS_MAX } from './door/wire';
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
  /**
   * P-256 SPKI, base64url, in its canonical uncompressed DER (Phase 330): THE
   * KEY ITS TLS HANDSHAKE MUST COMPLETE WITH. The door process admits a
   * connection only when the peer's key hashes to {@link clientKeyPinOf} of a
   * paired phone's `clientKey`, and the verifier asks that the phone a request
   * is signed as is that connection's phone. It replaced Phase 313's
   * `address`, which behind Funnel's loopback forward would read `127.0.0.1`
   * for every phone and pin nothing.
   */
  readonly clientKey: string;
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
  /**
   * The absolute path of the Tailscale program the Funnel child runs,
   * `resolveTailscale`'s answer (Phase 330). Hashed because it is WHAT RUNS:
   * a different program answering at a different path is a different process
   * starting, which is CLAUDE.md refusal 8 read literally.
   */
  readonly funnelProgram: string;
  /** `CurrentTailnet.Name`: whose tailnet publishes the door. */
  readonly tailnet: string;
  /**
   * `Self.DNSName`, the trailing dot dropped and lowercased: the name the door
   * is reached at on the internet, and the name the QR tells a phone.
   */
  readonly publicName: string;
  /**
   * The public port a phone is TOLD, 8443 or 10000, and 0 when none is chosen.
   * A confirmed one that is later held refuses rather than moving, which is
   * Phase 313's rule 2 carried to the port a phone is now told. The door's own
   * LOCAL port is ephemeral and is not a field: a phone never learns it.
   */
  readonly publicPort: number;
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
  funnelProgram: (v) => v,
  tailnet: (v) => v,
  publicName: (v) => v,
  publicPort: (v) => v,
  bindAtLaunch: (v) => v,
  // Sorted, so the order this build happens to declare them in is not part of
  // the agreement. Adding one still moves the hash, which is the point.
  routes: (v) => [...v].sort(),
  // Sorted by the derived id, and every field of every phone is emitted. A
  // phone whose client key or label moved is a different agreement.
  phones: (v) =>
    [...v]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((p) => [
        p.id,
        p.label,
        p.signingKey,
        p.exchangeKey,
        p.clientKey,
        p.pushToken,
        p.pushEnvironment
      ]),
  pushAlerts: (v) => v
};

/**
 * Names the algorithm, so a record written by an older build fails loudly.
 *
 * `v2` since Phase 314, because the canonical text changed shape: the switch
 * and each phone's token and environment joined it. `v3` since Phase 330: the
 * bind address and the port left, the Funnel program, the tailnet, the public
 * name and the public port joined, and every phone's address became its client
 * key. A record written under an older algorithm reads as `changed`, which
 * asks again, and that is the safe direction.
 */
export const POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v3';

/**
 * The prefix on the record key AND on the hash input id, for the reason
 * `MACHINE_CONFIRM_ID_PREFIX` carries both: neither half is load bearing alone.
 */
export const POCKET_CONFIRM_ID_PREFIX = 'pocket:';

/** There is one door, so there is one record key. */
export const POCKET_CONFIRM_RECORD_KEY = `${POCKET_CONFIRM_ID_PREFIX}door`;

/** Everything an unconfigured door has. */
export const EMPTY_POCKET_FIELDS: PocketExecutionFields = {
  funnelProgram: '',
  tailnet: '',
  publicName: '',
  publicPort: 0,
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

/**
 * What each write lets an allowed phone do, in the words the line says it
 * (Phase 317, build/p317/SPEC.md §5.6). Keyed by the closed write list, so a
 * write added to it without its clause here is a compile error rather than a
 * route the lines never mention. Phase 318 adds its two and joins them as a
 * comma list.
 */
const WRITE_CLAUSES: Readonly<Record<PocketWriteRouteId, string>> = Object.freeze({
  end: 'end a session'
});

/** Read the door as the lines a person is asked to agree to. Pure. */
export function describePocketDoor(
  fields: PocketExecutionFields
): PocketDoorSummary {
  const lines: string[] = [];
  lines.push(
    `Answers on the internet at https://${fields.publicName}:${String(
      fields.publicPort
    )}, through Tailscale Funnel on ${fields.tailnet}`
  );
  lines.push(`Publishes it with ${fields.funnelProgram}`);
  lines.push(
    fields.bindAtLaunch
      ? 'Starts answering when Tortie starts'
      : 'Answers only after you turn it on'
  );
  lines.push(`Answers these and nothing else: ${[...fields.routes].sort().join(', ')}`);
  // PHASE 317: what the writes in that list let a phone do, in words, DERIVED
  // from the hashed route list through the compiled map and in the closed
  // list's order, so "the lines are exactly the hashed facts" holds for it too.
  const clauses = POCKET_WRITE_ROUTE_IDS.filter((id) => fields.routes.includes(id)).map((id) => WRITE_CLAUSES[id]);
  if (clauses.length > 0) lines.push(`Lets an allowed phone ${clauses.join(' and ')}`);
  lines.push(
    fields.pushAlerts
      ? 'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps'
      : 'Tells your phone nothing through Apple'
  );
  for (const phone of [...fields.phones].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    lines.push(
      `Allows the phone "${phone.label}", key ${pairFingerprint(
        phone.signingKey,
        phone.exchangeKey,
        phone.clientKey
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
    'Tortie will not publish this door, because nobody has confirmed ' +
    'this door. Read what it will answer and confirm it in Tortie first. ' +
    'Nothing is listening.'
  );
}

function changedRefusal(): string {
  return (
    'Tortie will not publish this door, because this door changed ' +
    'after you confirmed it. Read the change and confirm it again if it is ' +
    'what you want. Nothing is listening.'
  );
}

function sealUnknownRefusal(): string {
  return (
    'Tortie could not read its record of what you confirmed, so it will not ' +
    'publish this door. Nothing is listening.'
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
      // A WORD and never what the error said (`conformance:pocket` G1, Phase
      // 317): an error's own text can carry whatever it was handed.
      pocketLog.warn(
        `a pocket confirmation listener threw: ${err instanceof Error ? err.name : typeof err}`
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
      'the OS keystore is unavailable, so the confirmation for the phone ' +
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

/**
 * What the last successful Tailscale read said about this Mac (Phase 330).
 *
 * OBSERVATIONS, NOT CHOICES. Writing them confirms nothing: they are what the
 * hashed fields are computed from when this run has not read Tailscale yet, so
 * a relaunch with Tailscale off hashes to the door a person confirmed rather
 * than to one with no name, and Phase 314's push, which reads the confirmed
 * fields and never the socket, keeps going. A read that answers different facts
 * replaces them, which moves the hash, and the gate asks again. None of them is
 * a secret, and the store is sealed.
 */
export interface PocketTailnetFacts {
  readonly funnelProgram: string;
  readonly tailnet: string;
  readonly publicName: string;
}

/**
 * The Mac's public name answered from the internet, for this tailnet, name and
 * port (Phase 332, build/p332/SPEC.md §4.10).
 *
 * AN OBSERVATION, like {@link PocketTailnetFacts}, and NOT HASHED: writing it
 * confirms nothing and starts nothing. It decides only whether a pairing code
 * may be shown yet, and the phone must still be matched and allowed on the
 * Mac. It counts only while it equals the door's current fields, through
 * {@link nameConfirmedCounts}, so a moved field stops it counting without
 * anyone clearing it.
 */
export interface PocketNameConfirmed {
  readonly tailnet: string;
  readonly publicName: string;
  readonly publicPort: number;
}

/** What `<userData>/gmux/pocket.json` holds, once the seal is opened. */
export interface PocketStore {
  readonly identity: SealedIdentity;
  readonly phones: readonly PocketPhoneFields[];
  /**
   * The public port, 8443 or 10000, and 0 when none has been chosen (Phase
   * 330). Written only by the press that confirms it — the switch turned on,
   * and Allow — and never by a launch.
   */
  readonly publicPort: number;
  /** The last successful Tailscale read's facts, or null before the first. */
  readonly tailnetFacts: PocketTailnetFacts | null;
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
  /**
   * The public name answered for these fields (Phase 332), or null: ask again.
   * An OBSERVATION beside {@link tailnetFacts}, never hashed; see
   * {@link PocketNameConfirmed}. Cleared by a read that asks Tailscale's
   * approval, by a start that waited on it, and by a switch-on round that
   * answers no. The switch's off write KEEPS it (the fix round): the next
   * switch-on asks once and shows Pair meanwhile, as the build before this
   * phase did.
   */
  readonly nameConfirmed: PocketNameConfirmed | null;
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
  /**
   * How many phone rows were dropped WHOLE on this read (Phase 330): every row
   * with no valid client key, which is every row Phase 316 wrote. The sheet
   * says those phones must pair again.
   */
  droppedPhones: number;
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
  if (opened === null) return { store: null, sealKnown: false, droppedPhones: 0 };
  if (opened.length === 0) return { store: null, sealKnown: true, droppedPhones: 0 };
  try {
    const parsed = JSON.parse(opened) as PocketStore;
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof parsed.identity?.signPrivate !== 'string' ||
      typeof parsed.identity?.exchangePrivate !== 'string'
    ) {
      return { store: null, sealKnown: true, droppedPhones: 0 };
    }
    const rows: readonly unknown[] = Array.isArray(parsed.phones) ? parsed.phones : [];
    const phones = phoneRowsOf(rows);
    return {
      store: {
        identity: parsed.identity,
        phones,
        // A port that is not one the door may publish on is no choice at all.
        // Phase 316's `port` (8823) is not read: the phone is never told a
        // local port again.
        publicPort: isPublicPort(parsed.publicPort) ? parsed.publicPort : 0,
        tailnetFacts: tailnetFactsOf((parsed as { tailnetFacts?: unknown }).tailnetFacts),
        bindAtLaunch: parsed.bindAtLaunch === true,
        enabled: parsed.enabled === true,
        pushAlerts: parsed.pushAlerts === true,
        deadPushTokens: deadTokensOf((parsed as { deadPushTokens?: unknown }).deadPushTokens),
        nameConfirmed: nameConfirmedOf((parsed as { nameConfirmed?: unknown }).nameConfirmed)
      },
      sealKnown: true,
      droppedPhones: rows.length - phones.length
    };
  } catch {
    return { store: null, sealKnown: true, droppedPhones: 0 };
  }
}

/** Is this a port the door may be published on? 8443 or 10000, never 443. */
export function isPublicPort(value: unknown): value is number {
  return typeof value === 'number' && (POCKET_PUBLIC_PORTS as readonly number[]).includes(value);
}

/** The stored facts, or null when any one of them is not a non-empty string. */
function tailnetFactsOf(raw: unknown): PocketTailnetFacts | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const funnelProgram = r['funnelProgram'];
  const tailnet = r['tailnet'];
  const publicName = r['publicName'];
  if (typeof funnelProgram !== 'string' || funnelProgram.length === 0) return null;
  if (typeof tailnet !== 'string' || tailnet.length === 0) return null;
  if (typeof publicName !== 'string' || publicName.length === 0) return null;
  return { funnelProgram, tailnet, publicName };
}

/**
 * The stored confirmation (Phase 332), or null when it is not two non-empty
 * strings and a port the door may publish on. Null means ask again, which is a
 * store written before this phase too.
 */
export function nameConfirmedOf(raw: unknown): PocketNameConfirmed | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const tailnet = r['tailnet'];
  const publicName = r['publicName'];
  const publicPort = r['publicPort'];
  if (typeof tailnet !== 'string' || tailnet.length === 0) return null;
  if (typeof publicName !== 'string' || publicName.length === 0) return null;
  if (!isPublicPort(publicPort)) return null;
  return { tailnet, publicName, publicPort };
}

/**
 * THE ONE PREDICATE (Phase 332, build/p332/SPEC.md §4.10): does this
 * confirmation count for the door as its fields stand? Only when it names
 * exactly their tailnet, public name and public port. Nothing else compares
 * them, so a moved field stops it counting without anyone clearing it.
 */
export function nameConfirmedCounts(
  confirmed: PocketNameConfirmed | null,
  fields: PocketExecutionFields
): boolean {
  return (
    confirmed !== null &&
    confirmed.tailnet === fields.tailnet &&
    confirmed.publicName === fields.publicName &&
    confirmed.publicPort === fields.publicPort
  );
}

/** What a check of these fields would confirm: {@link nameConfirmedCounts}'s partner. */
export function nameTargetOf(fields: PocketExecutionFields): PocketNameConfirmed {
  return { tailnet: fields.tailnet, publicName: fields.publicName, publicPort: fields.publicPort };
}

/**
 * An invalid phone row is dropped WHOLE, never partially merged and never a
 * crash. CLAUDE.md's second mechanical rule for any overlay type.
 *
 * A row written before Phase 314 has no push fields and reads as a phone that
 * gave no token, `''` and `''`. A row whose push fields are PRESENT and wrong
 * is dropped whole like any other bad row: a token that is not the shape the
 * pairing accepts was not written by the pairing.
 *
 * A row with no valid P-256 `clientKey` is dropped whole too (Phase 330), and
 * that is every row Phase 316 wrote: such a phone never presented a client key,
 * so the door could never admit its handshake, and keeping it would be a phone
 * drawn as paired that can reach nothing. {@link readPocketStore} counts them.
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
    isClientKeySpki(p['clientKey']);
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
    clientKey: p['clientKey'] as string,
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
 * Six groups of four hex characters over ALL THREE of the phone's public keys.
 *
 * It covers every key on purpose. A fingerprint of one key alone would be
 * reproducible by anything holding that key, and what the person is being
 * asked is not "is this the key I have" but "are these two ends the two ends I
 * think they are". Since Phase 330 it covers the CLIENT key too (`v2`): the
 * Mac trusts a TLS handshake completed with that key, and a key bound only by
 * a signature the code checks would be a property only the code checks. The
 * six groups a person compares cover every key the Mac will trust. It is a
 * hash of public material and is not a secret.
 */
export function pairFingerprint(
  signingKey: string,
  exchangeKey: string,
  clientKey: string
): string {
  const digest = createHash('sha256')
    .update(`tortie-pocket-fp-v2\n${signingKey}\n${exchangeKey}\n${clientKey}`)
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

/**
 * The pin the door process admits a handshake by (Phase 330): base64url of
 * sha256 over the client key's SPKI DER. The door computes the same digest
 * over `getPeerX509Certificate().publicKey`'s SPKI export, which is why a
 * client key is accepted only in its canonical form ({@link isClientKeySpki}).
 */
export function clientKeyPinOf(clientKey: string): string {
  return b64u(createHash('sha256').update(unb64u(clientKey)).digest());
}

/**
 * Is this a client key: a P-256 SubjectPublicKeyInfo, base64url, in its one
 * spelling, the uncompressed point (`./tls.ts`'s `isP256SpkiDer`)?
 *
 * The canonical form is REQUIRED rather than normalised, because the pin is a
 * hash of these bytes: one key must have one pin.
 */
export function isClientKeySpki(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) return false;
  const der = unb64u(value);
  // One spelling of the base64url too: a string that decodes to the right
  // bytes but is not their encoding would be two phones' worth of one key.
  if (b64u(der) !== value) return false;
  return isP256SpkiDer(der);
}

// ---------------------------------------------------------------------------
// The pairing window
// ---------------------------------------------------------------------------

/**
 * How long a window lives. A few minutes, and one shot.
 *
 * STILL THREE MINUTES in Phase 330, although his measurement (build/p330/
 * SPEC.md M5) found the public name took about eight to resolve the first
 * time: the entry refuses a longer window inside this phase, and the change is
 * owed as its own entry. The phone says why a first scan fails, and the Mac
 * says to press Pair again.
 */
export const POCKET_PAIRING_WINDOW_MS = 3 * 60_000;

/**
 * The QR's version. v:2 pinned the key rather than the certificate (Phase
 * 316); v:3 carries the public name and port and no tailnet key (Phase 330).
 */
export const POCKET_QR_VERSION = 3;

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

const NO_PUBLIC_NAME =
  'This door has no public name yet, so there is nothing for a phone to ' +
  'reach. Nothing was opened.';

/** The info string the pairing key is derived under. */
const PAIRING_INFO = 'tortie-pocket-pair-v1';

/** The info string the window's CHALLENGE is derived under (Phase 330). */
const CHALLENGE_INFO = 'tortie-pocket-challenge-v1';

/** The first line of the text a presentation's signature covers. */
export const POCKET_PRESENT_ALGORITHM = 'tortie-pocket-present-v1';

/**
 * The window's challenge, base64url: HKDF-SHA256 over the one-shot secret,
 * with an empty salt and its own info string. Only something that read the QR
 * can derive it, and a signature over it proves the presenter holds the
 * signing key it names (Phase 330, SPEC §4.7.2).
 */
export function pairingChallengeOf(secret: Buffer): string {
  return b64u(Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), CHALLENGE_INFO, 32)));
}

/**
 * The exact text a presentation's `sig` covers: the algorithm, the window's
 * challenge, and the three base64url strings of the seal, one per line. One
 * definition, read by the Mac and by the vectors the phone is held to.
 */
export function presentationProofText(
  challenge: string,
  iv: string,
  ct: string,
  tag: string
): string {
  return [POCKET_PRESENT_ALGORITHM, challenge, iv, ct, tag].join('\n');
}

/**
 * What arrives on `POST /pair`, its outer JSON already parsed by the door
 * process and every field held to its bound there (SPEC §4.5.2). Main never
 * runs `JSON.parse` on a stranger's outer bytes. Structurally the door's
 * `DoorPresentation`.
 */
export interface PocketSealedPresentation {
  /** base64url, 12 bytes. */
  readonly iv: string;
  /** base64url, the AES-256-GCM ciphertext of the inner JSON. */
  readonly ct: string;
  /** base64url, 16 bytes. */
  readonly tag: string;
  /** The phone's Ed25519 SPKI, base64url: the key `sig` is checked under. */
  readonly ek: string;
  /** base64url Ed25519 signature over {@link presentationProofText}. */
  readonly sig: string;
}

/** What a phone sealed and sent. */
export interface PocketPresentation {
  readonly label: string;
  readonly signingKey: string;
  readonly exchangeKey: string;
  /** `ck`, the P-256 key its TLS handshakes will complete with (Phase 330). */
  readonly clientKey: string;
  /** `apt`, lowercase hex, or `''` when the phone asked for no alerts (Phase 314). */
  readonly pushToken: string;
  /** `ape`, the environment the token was minted in, or `''` with no token. */
  readonly pushEnvironment: '' | 'development' | 'production';
}

/**
 * What `POST /pair` answers (Phase 330). One state, and the phone's client
 * certificate ONLY with `allowed`, only to the phone that was allowed.
 *
 * `pending` may say ONE more thing since Phase 316.5 (research 136): that this
 * Mac can send an alert, `alerts: true`, so the phone asks iOS for alerts only
 * then. Alerts are the Apple push key holder's alone. A Mac that cannot send
 * answers without the field, byte for byte the answer before that phase. The
 * pairing owner never sets it: the host adds it (`./ipc.ts`), because only the
 * host is handed the alerts' port.
 */
export type PocketPairAnswer =
  | { readonly state: 'pending'; readonly alerts?: true }
  | { readonly state: 'refused' }
  | { readonly state: 'allowed'; readonly cert: string };

const REFUSED: PocketPairAnswer = { state: 'refused' };

interface OpenWindow {
  secret: Buffer;
  /**
   * The challenge derived from {@link secret} at open. KEPT PAST THE SHRED
   * until the deadline, because the phone that was allowed proves itself over
   * it once more to be handed its certificate.
   */
  challenge: string;
  expiresAt: number;
  presented: PocketPresentation | null;
  allowed: boolean;
  /**
   * The certificate issued at the allow, base64url DER, or null. Public
   * material, held so every `allowed` answer carries the same bytes, and
   * dropped with the window. Never stored.
   */
  certificate: string | null;
}

/**
 * The pairing window and the phone set, as one owner.
 *
 * It holds the ONE-SHOT secret in memory only. Nothing writes it to disk,
 * nothing logs it, and `cancel`, expiry, the allow and a replacing window all
 * zero it, which is what makes a photographed screen useless after the window
 * shuts.
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
      /**
       * Issue the allowed phone's client certificate over its client key,
       * base64url DER, or null when the door has no key to sign with. The
       * owner holds the door, so the owner signs; this module never reads a
       * TLS key.
       */
      issueCertificate: (clientKey: string) => string | null;
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
    // other. The phone has minutes to ask for its certificate, and afterwards
    // the window is gone, the sheet is idle, and the photographed screen is
    // worth nothing.
    if (this.now() < w.expiresAt) return;
    shred(w);
    this.window = null;
  }

  /**
   * Open a window and answer the QR. Any window already open is replaced.
   *
   * EVERY REFUSAL COMES BEFORE ANYTHING MOVES: no public name and no listening
   * door each leave the window that was open, open, and mint nothing. The
   * order after that is the safety: the old window is shredded, then the new
   * one is made.
   */
  open(): PocketPairingOffer {
    const fields = this.deps.fieldsNow();
    if (fields.publicName.length === 0 || !isPublicPort(fields.publicPort)) {
      throw gmuxError('INVALID_INPUT', NO_PUBLIC_NAME);
    }
    const pin = this.deps.publicKeyPin();
    if (pin === null) throw gmuxError('INVALID_INPUT', NO_DOOR_TO_PIN);
    const identity = this.deps.identity();
    this.cancel();
    const secret = randomBytes(16);
    const expiresAt = this.now() + POCKET_PAIRING_WINDOW_MS;
    this.window = {
      secret,
      challenge: pairingChallengeOf(secret),
      expiresAt,
      presented: null,
      allowed: false,
      certificate: null
    };
    // The key order is `JSON.stringify`'s, in exactly this order (SPEC §4.8.1),
    // and these eight keys are the whole of it: no credential, no address.
    const payload = JSON.stringify({
      v: POCKET_QR_VERSION,
      host: fields.publicName,
      port: fields.publicPort,
      fp: pin,
      dk: identity.signPublic,
      dx: identity.exchangePublic,
      ps: b64u(secret),
      exp: expiresAt
    });
    return { payload, expiresAt };
  }

  /** Shut the window now and destroy the secret. */
  cancel(): void {
    const w = this.window;
    if (w === null) return;
    shred(w);
    this.window = null;
  }

  /** True only inside an open, unexpired window. `/pair` is dead otherwise. */
  windowOpen(): boolean {
    this.sweep();
    return this.window !== null;
  }

  /** Epoch ms the open window shuts, or null. */
  windowDeadline(): number | null {
    this.sweep();
    return this.window?.expiresAt ?? null;
  }

  /**
   * A phone presented itself (Phase 330, SPEC §4.7.3).
   *
   * THE SIGNATURE FIRST, over the window's challenge, under the `ek` the body
   * names: a body that does not prove it holds that signing key is refused
   * before anything is opened, and so is one from outside a window.
   *
   * IT ALLOWS NOTHING. Presenting only puts a name and three public keys in
   * front of the person. The Mac asks them last.
   *
   * IT IS ALSO HOW THE PHONE LEARNS IT WAS ALLOWED, and that is why it is
   * idempotent. Asking again inside the window answers `allowed`, WITH THE
   * CERTIFICATE, to the phone that was allowed and to nothing else: the proof
   * must verify under the allowed phone's own signing key, so a second phone
   * that photographed the same screen, or a stranger replaying a captured
   * body, is refused.
   */
  present(presentation: PocketSealedPresentation): PocketPairAnswer {
    this.sweep();
    const w = this.window;
    if (w === null) return REFUSED;
    if (!isPublicKeyOfType(presentation.ek, 'ed25519')) return REFUSED;
    if (!proofHolds(w.challenge, presentation)) return REFUSED;
    if (w.allowed) {
      if (
        w.presented === null ||
        w.certificate === null ||
        presentation.ek !== w.presented.signingKey
      ) {
        return REFUSED;
      }
      return { state: 'allowed', cert: w.certificate };
    }
    const opened = this.openPresentation(w.secret, presentation);
    if (opened === null) return REFUSED;
    // A second phone during one window replaces the first. The person has not
    // been asked yet, so nothing they agreed to is being overwritten, and the
    // sheet redraws with the fingerprint of whatever is actually in front of
    // it. Two phones cannot both be pending, so the sheet is never ambiguous.
    w.presented = opened;
    return { state: 'pending' };
  }

  private openPresentation(
    secret: Buffer,
    outer: PocketSealedPresentation
  ): PocketPresentation | null {
    try {
      const iv = unb64u(outer.iv);
      const ct = unb64u(outer.ct);
      const tag = unb64u(outer.tag);
      if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;
      const key = Buffer.from(
        hkdfSync('sha256', secret, Buffer.alloc(0), PAIRING_INFO, 32)
      );
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
      const inner = JSON.parse(plain.toString('utf8')) as Record<string, unknown>;
      if (inner === null || typeof inner !== 'object') return null;
      const label = String(inner['label'] ?? '').slice(0, 64);
      const signingKey = String(inner['ek'] ?? '');
      const exchangeKey = String(inner['xk'] ?? '');
      const clientKey = inner['ck'];
      if (signingKey.length === 0 || exchangeKey.length === 0) return null;
      // THE SEALED KEY IS THE SIGNED KEY. The outer `ek` is what the proof was
      // checked under; the one inside the seal is what the phone is paired as.
      if (signingKey !== outer.ek) return null;
      // The keys must actually BE keys of the kinds this door signs, derives
      // and admits handshakes with, or a later check would be deciding on
      // something nobody checked.
      if (!isPublicKeyOfType(signingKey, 'ed25519')) return null;
      if (!isPublicKeyOfType(exchangeKey, 'x25519')) return null;
      if (!isClientKeySpki(clientKey)) return null;
      // A client key a paired phone already completes handshakes with would
      // make two phones one channel.
      if (this.deps.fieldsNow().phones.some((p) => p.clientKey === clientKey)) return null;
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
        clientKey,
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
        w.presented.exchangeKey,
        w.presented.clientKey
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
    if (w === null || w.presented === null) return fields;
    const phone: PocketPhoneFields = {
      id: phoneIdOf(w.presented.signingKey),
      label: w.presented.label,
      signingKey: w.presented.signingKey,
      exchangeKey: w.presented.exchangeKey,
      clientKey: w.presented.clientKey,
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
   * THE CERTIFICATE IS ISSUED FIRST, before anything is recorded (Phase 330):
   * a door with no key to sign with refuses here, with nothing written, rather
   * than recording a phone that could never be handed a way in. Then it
   * records the confirmation against the hash the sheet was drawn from, and
   * only then persists the phone. That order matters: a phone written before
   * the agreement was recorded would be a phone the next load allows with
   * nothing on record saying anybody agreed to it.
   */
  allow(consent: PocketConfirmConsent): { allowed: boolean; refusal: string | null } {
    this.sweep();
    const w = this.window;
    if (w === null || w.presented === null || w.allowed) {
      return {
        allowed: false,
        refusal:
          'There is no phone waiting to be allowed. Open the pairing window ' +
          'again and scan the code. Nothing was changed.'
      };
    }
    const next = this.fieldsWithPending();
    // THE DOOR PROCESS HOLDS AT MOST DOOR_PINS_MAX PINS (the Phase 330 fix
    // round, lens 1): the wire refuses a start or an update that carries more,
    // and a 65th phone surfaced as a door that "could not open". Refused here,
    // before anything is signed or written, with a sentence that says why.
    if (next.phones.length > DOOR_PINS_MAX) {
      return {
        allowed: false,
        refusal:
          `Tortie already allows ${String(DOOR_PINS_MAX)} phones, which is all ` +
          'its door holds. Remove one, then pair this one. Nothing was changed.'
      };
    }
    // THE LINES MOVED UNDER THE PRESS (Phase 316.5's fix round). A phone told
    // this Mac can send alerts presents again once iOS answers, now with its
    // alert address, and that moves the hash while the sheet may still show
    // the lines before it. Refused HERE, before anything is signed or written,
    // the way `confirmPocketDoor` below refuses it (a throw, which the sheet
    // draws), but in the pairing card's own words: that one speaks of
    // confirming the door.
    if (consent.acknowledgement === POCKET_CONFIRM_ACKNOWLEDGEMENT && consent.hashRead !== describePocketDoor(next).hash) {
      throw gmuxError(
        'INVALID_INPUT',
        'What this phone would be allowed changed after it was shown. Read ' +
          'it again and allow what it says now. Nothing was changed.'
      );
    }
    const certificate = this.deps.issueCertificate(w.presented.clientKey);
    if (certificate === null) {
      return {
        allowed: false,
        refusal:
          'The door is not listening, so Tortie has nothing to sign this ' +
          'phone’s key with. Nothing was changed.'
      };
    }
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
    w.certificate = certificate;
    // The window stays until its deadline so the phone can be handed its
    // certificate, but what it held is spent: the secret goes now. The
    // challenge stays, because the allowed phone proves itself over it again.
    w.secret.fill(0);
    return { allowed: true, refusal: null };
  }
}

/** Zero what a window held. The window object itself is dropped by the caller. */
function shred(w: OpenWindow): void {
  w.secret.fill(0);
  w.certificate = null;
}

/** Does `sig` verify under `ek` over the window's proof text? Never throws. */
function proofHolds(challenge: string, p: PocketSealedPresentation): boolean {
  try {
    const text = presentationProofText(challenge, p.iv, p.ct, p.tag);
    return verifyWith(
      null,
      Buffer.from(text, 'utf8'),
      createPublicKey({ key: unb64u(p.ek), format: 'der', type: 'spki' }),
      unb64u(p.sig)
    );
  } catch {
    return false;
  }
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

/**
 * Every reason a request is refused. A WORD, and never a value.
 *
 * Phase 330 took out `source-is-door` and `address`: the door binds loopback
 * behind Funnel, so every source is this Mac and an address pins nothing. It
 * added `channel`: the phone a request is signed as is not the phone whose
 * client key completed this connection's handshake.
 */
export type PocketRefusalReason =
  | 'shutdown'
  | 'host'
  | 'route'
  | 'window'
  | 'oversized'
  | 'headers'
  | 'unpaired'
  | 'channel'
  | 'stale'
  | 'replay'
  | 'signature';

/**
 * The four signature headers as the verifier reads them. The door process
 * hands over exactly these and no other header value (SPEC §4.5.2); a plain
 * `IncomingHttpHeaders` is the same shape, which is what the tests pass.
 */
export type PocketSignatureHeaders = {
  readonly [K in (typeof POCKET_HEADERS)[keyof typeof POCKET_HEADERS]]?:
    | string
    | readonly string[]
    | undefined;
};

export type PocketVerdict =
  | { ok: true; phone: PocketPhoneFields }
  | { ok: false; reason: PocketRefusalReason };

/**
 * Does this request come from a phone the person allowed, right now, once?
 *
 * The order is deliberate and each step costs less than the one after it: the
 * headers, then the phone, then the CHANNEL (Phase 330: the phone whose client
 * key completed this connection's handshake must be the phone the request is
 * signed as), then the clock, then the nonce, then the signature. The
 * signature is last because it is the only expensive one, and a request that
 * fails any earlier check never reaches it.
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
    /**
     * The phone id whose pin completed THIS connection's TLS handshake, as the
     * door process reported it, or null for a connection that presented no
     * certificate (admitted only to `POST /pair` inside a window).
     */
    channel: string | null;
    headers: PocketSignatureHeaders;
  }): PocketVerdict {
    const one = (name: (typeof POCKET_HEADERS)[keyof typeof POCKET_HEADERS]): string => {
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
    // THE CONNECTION IS THE PHONE'S OWN, or nothing is read. Asked straight
    // after the phone is found, before any work a stranger could make cost.
    if (input.channel !== phone.id) return { ok: false, reason: 'channel' };
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
 * Seal and sign a presentation the way a phone does (Phase 314, v2 in Phase
 * 330). Exported for the tests, the vectors and the harness ONLY, the way
 * {@link signAsPhone} is, and it is what lets a probe pair a phone through the
 * SHIPPING `present` with no Swift.
 *
 * Nothing in the shipping door calls it: main never seals a presentation, it
 * only opens one, and it never holds a phone's private key. `offerPayload` is
 * the QR's own bytes, whose `ps` is the one-shot secret both the seal key and
 * the challenge are derived from. It answers the `POST /pair` BODY, whose keys
 * are sorted: `{"ct","ek","iv","sig","tag"}`, and the inner JSON's keys are
 * sorted too (SPEC §4.7.2).
 */
export function sealPresentationAsPhone(
  offerPayload: string,
  presentation: {
    label: string;
    signingKey: string;
    exchangeKey: string;
    clientKey: string;
    pushToken?: string;
    pushEnvironment?: 'development' | 'production';
  },
  signingPrivateKey: KeyObject
): Buffer {
  const offer = JSON.parse(offerPayload) as Record<string, unknown>;
  const secret = unb64u(String(offer['ps'] ?? ''));
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), PAIRING_INFO, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const fields: Record<string, string> = {
    ck: presentation.clientKey,
    ek: presentation.signingKey,
    label: presentation.label,
    xk: presentation.exchangeKey
  };
  if (presentation.pushEnvironment !== undefined) fields['ape'] = presentation.pushEnvironment;
  if (presentation.pushToken !== undefined) fields['apt'] = presentation.pushToken;
  const inner = JSON.stringify(
    Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]]))
  );
  const ct = Buffer.concat([cipher.update(inner, 'utf8'), cipher.final()]);
  const sealed = { iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) };
  const proof = presentationProofText(
    pairingChallengeOf(secret),
    sealed.iv,
    sealed.ct,
    sealed.tag
  );
  const sig = b64u(signWith(null, Buffer.from(proof, 'utf8'), signingPrivateKey));
  return Buffer.from(
    JSON.stringify({
      ct: sealed.ct,
      ek: presentation.signingKey,
      iv: sealed.iv,
      sig,
      tag: sealed.tag
    }),
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
    fingerprint: pairFingerprint(phone.signingKey, phone.exchangeKey, phone.clientKey),
    addedAt,
    alerts:
      phone.pushToken.length === 0
        ? 'none'
        : deadTokens.has(pushTokenDigest(phone.pushToken))
          ? 'stopped'
          : 'on'
  };
}

