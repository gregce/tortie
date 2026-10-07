/**
 * What crosses between Electron main and the door process, and nothing else
 * (Phase 330, build/p330/SPEC.md §4.5.2).
 *
 * The door moved out of main so that a stranger's bytes are parsed by a
 * process that holds no credential (research 132 §7.1, §9 condition 2). This
 * module is the one seam between the two, and it is TYPES AND VALIDATORS
 * ONLY: it opens nothing, imports nothing but a type from the contract and
 * the door's own table and caps (Phase 317), and both sides run every message
 * through the validator for its direction. A
 * message that does not validate is DROPPED WHOLE and counted by the caller,
 * never half-read, because half a message is a message somebody else chose
 * the shape of.
 *
 * What never crosses to main, by construction of the types below: a raw byte
 * from a stranger, the PROXY source address, a header value other than the
 * four `x-tortie-*`, and the `/pair` body as text (the door process parses its
 * outer JSON; main never runs `JSON.parse` on a stranger's bytes).
 *
 * A WRITE'S BODY CROSSES AS BYTES AND IS PARSED IN MAIN ALONE (Phase 317,
 * build/p317/SPEC.md §5.3.1, D2). The door process checks its method, its
 * target and its size, and never parses it: the body is signed, so main
 * verifies the signature over the exact bytes before `../writes.ts` reads a
 * key of it, and the door process holds no session vocabulary to read it with.
 */

import type { PocketRouteId } from '@shared/ipc/pocket';
import { POCKET_WRITE_BODY_CAPS } from './limits';
import { POCKET_ROUTES } from './table';

// ---------------------------------------------------------------------------
// The bounds, checked by BOTH validators
// ---------------------------------------------------------------------------

/** A signed read carries no body worth the name. Over this is dropped whole. */
export const POCKET_READ_BODY_CAP_BYTES = 1024;
/** The request target, path and query, as the door forwards it. */
export const DOOR_TARGET_MAX_CHARS = 1024;
/** `x-tortie-phone`. */
export const DOOR_PHONE_HEADER_MAX = 64;
/** `x-tortie-timestamp`: epoch milliseconds in decimal, and no more. */
export const DOOR_TIMESTAMP_HEADER_MAX = 20;
/** `x-tortie-nonce`: `pairing.ts`'s own 16 to 64. */
export const DOOR_NONCE_HEADER_MIN = 16;
export const DOOR_NONCE_HEADER_MAX = 64;
/** `x-tortie-signature`: an Ed25519 signature is 86 base64url characters. */
export const DOOR_SIGNATURE_HEADER_MAX = 128;
/** An answer main composes. The phone's own cap is the same 2 MiB. */
export const DOOR_ANSWER_MAX_BYTES = 2 * 1024 * 1024;
/** The presentation's fields, base64url, as §4.5.2 bounds them. */
export const PRESENTATION_IV_CHARS = 16;
export const PRESENTATION_TAG_CHARS = 22;
export const PRESENTATION_SIG_CHARS = 86;
export const PRESENTATION_EK_MAX = 128;
export const PRESENTATION_CT_MAX = 4096;
/** A door process holds this many pins at most. Far more phones than a person has. */
export const DOOR_PINS_MAX = 64;

// ---------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------

/** One paired phone's client key, as the door checks it at the handshake. */
export interface DoorPin {
  readonly phoneId: string;
  /** base64url sha256 of the phone's client-key SubjectPublicKeyInfo DER. */
  readonly spkiSha256: string;
}

export interface DoorSignatureHeaders {
  readonly 'x-tortie-phone': string;
  readonly 'x-tortie-timestamp': string;
  readonly 'x-tortie-nonce': string;
  readonly 'x-tortie-signature': string;
}

/** `/pair`'s outer JSON, parsed strictly in the door process. */
export interface DoorPresentation {
  readonly iv: string;
  readonly ct: string;
  readonly tag: string;
  readonly ek: string;
  readonly sig: string;
}

/** Main to the door. */
export type ToDoor =
  | {
      readonly kind: 'start';
      readonly generation: number;
      readonly tls: { readonly key: string; readonly cert: string };
      readonly pins: readonly DoorPin[];
      readonly host: { readonly name: string; readonly port: number };
      readonly windowOpen: boolean;
    }
  | { readonly kind: 'update'; readonly pins?: readonly DoorPin[]; readonly windowOpen?: boolean }
  | { readonly kind: 'answer'; readonly id: number; readonly status: 200 | 404; readonly body: string | null }
  /** Admission closes, synchronously on arrival. */
  | { readonly kind: 'shutdown' }
  /** Close, join bounded, then `stopped`. */
  | { readonly kind: 'stop' };

/**
 * The signed reads, and nothing a phone could name that is not one. Phase
 * 316.7 added `sessions` (build/p3167/SPEC.md §6.2), Phase 337 `screen`
 * (build/p337/SPEC.md §5.1, D1), Phase 337.1 `scrollback`
 * (build/p3371/SPEC.md §5.1, D1).
 */
export type DoorSignedRoute = Extract<PocketRouteId, 'blocked' | 'session' | 'turns' | 'sessions' | 'screen' | 'scrollback'>;

/**
 * The writes (Phase 317's `end`; Phase 318's `choose` and `say`; Phase 337's
 * `keys`). Each a `POST`, signed, its target its path exactly, its body at
 * most its own cap.
 */
export type DoorWriteRoute = Extract<PocketRouteId, 'end' | 'choose' | 'say' | 'keys'>;

/** One request the door admitted, as main is handed it. */
export type DoorRequest =
  | { readonly route: 'pair'; readonly presentation: DoorPresentation }
  | {
      readonly route: DoorSignedRoute;
      readonly method: 'GET';
      readonly target: string;
      readonly headers: DoorSignatureHeaders;
      readonly body: Uint8Array;
      /** The phoneId whose pin completed THIS connection's handshake. */
      readonly channel: string;
    }
  | {
      readonly route: DoorWriteRoute;
      readonly method: 'POST';
      /** The route's path, byte for byte, and never a query. */
      readonly target: string;
      readonly headers: DoorSignatureHeaders;
      /** The signed body, as bytes. Main parses it; nothing here does. */
      readonly body: Uint8Array;
      /** The phoneId whose pin completed THIS connection's handshake. */
      readonly channel: string;
    };

/** Why the door process destroyed a connection or refused a request. A WORD. */
export type DoorRefusalWord =
  | 'proxy'
  | 'source-cap'
  | 'capacity'
  | 'handshake'
  | 'no-certificate'
  | 'unknown-key'
  | 'server-name'
  | 'host'
  | 'route'
  | 'window'
  | 'oversized'
  | 'malformed'
  | 'shutdown';

/** The closed list, for the validators and for the gates that read it. */
export const DOOR_REFUSAL_WORDS: readonly DoorRefusalWord[] = Object.freeze([
  'proxy',
  'source-cap',
  'capacity',
  'handshake',
  'no-certificate',
  'unknown-key',
  'server-name',
  'host',
  'route',
  'window',
  'oversized',
  'malformed',
  'shutdown'
]);

/** The door to main. */
export type FromDoor =
  | { readonly kind: 'listening'; readonly localPort: number }
  | { readonly kind: 'refused'; readonly reason: 'bind-failed' }
  | { readonly kind: 'request'; readonly id: number; readonly generation: number; readonly request: DoorRequest }
  | { readonly kind: 'refusal'; readonly word: DoorRefusalWord }
  | { readonly kind: 'stopped'; readonly accepted: number; readonly joined: boolean; readonly waitedMs: number };

/**
 * One door process, as main sees it. `bind.ts` makes one from
 * `utilityProcess.fork`; `./in-process.ts` makes one that runs the same
 * listener in the calling process, which is how a unit test, which has no
 * `utilityProcess`, drives a real TLS door.
 */
export interface DoorChild {
  /** The process id, when there is a process. */
  readonly pid: number | undefined;
  post(message: ToDoor): void;
  onMessage(listener: (message: unknown) => void): void;
  onExit(listener: (code: number | null) => void): void;
  kill(): void;
}

/** What starts a door process. One call, one process, one life. */
export type DoorSpawner = () => DoorChild;

// ---------------------------------------------------------------------------
// The validators. Both answer the message, re-built from exactly the fields
// the type names, or null; nothing else on the object survives.
// ---------------------------------------------------------------------------

const BASE64URL = /^[A-Za-z0-9_-]*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function isPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65_535;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isWord(value: unknown): value is DoorRefusalWord {
  return typeof value === 'string' && (DOOR_REFUSAL_WORDS as readonly string[]).includes(value);
}

/** A pin list, or null. A duplicate key or id is refused, never merged. */
function pinsOf(value: unknown): DoorPin[] | null {
  if (!Array.isArray(value) || value.length > DOOR_PINS_MAX) return null;
  const out: DoorPin[] = [];
  const keys = new Set<string>();
  for (const row of value) {
    if (!isObject(row)) return null;
    const phoneId = row['phoneId'];
    const spki = row['spkiSha256'];
    if (!boundedString(phoneId, 1, DOOR_PHONE_HEADER_MAX)) return null;
    // sha256 is 32 bytes: 43 base64url characters, unpadded.
    if (!boundedString(spki, 43, 43) || !BASE64URL.test(spki)) return null;
    if (keys.has(spki)) return null;
    keys.add(spki);
    out.push({ phoneId, spkiSha256: spki });
  }
  return out;
}

/** The four signature headers within their bounds, or null. */
export function signatureHeadersOf(value: unknown): DoorSignatureHeaders | null {
  if (!isObject(value)) return null;
  const phone = value['x-tortie-phone'];
  const timestamp = value['x-tortie-timestamp'];
  const nonce = value['x-tortie-nonce'];
  const signature = value['x-tortie-signature'];
  if (!boundedString(phone, 1, DOOR_PHONE_HEADER_MAX)) return null;
  if (!boundedString(timestamp, 1, DOOR_TIMESTAMP_HEADER_MAX)) return null;
  if (!boundedString(nonce, DOOR_NONCE_HEADER_MIN, DOOR_NONCE_HEADER_MAX)) return null;
  if (!boundedString(signature, 1, DOOR_SIGNATURE_HEADER_MAX)) return null;
  return {
    'x-tortie-phone': phone,
    'x-tortie-timestamp': timestamp,
    'x-tortie-nonce': nonce,
    'x-tortie-signature': signature
  };
}

/** The five presentation fields within their bounds, or null. */
export function presentationOf(value: unknown): DoorPresentation | null {
  if (!isObject(value)) return null;
  const field = (name: string, min: number, max: number): string | null => {
    const v = value[name];
    return boundedString(v, min, max) && BASE64URL.test(v) ? v : null;
  };
  const iv = field('iv', PRESENTATION_IV_CHARS, PRESENTATION_IV_CHARS);
  const ct = field('ct', 1, PRESENTATION_CT_MAX);
  const tag = field('tag', PRESENTATION_TAG_CHARS, PRESENTATION_TAG_CHARS);
  const ek = field('ek', 1, PRESENTATION_EK_MAX);
  const sig = field('sig', PRESENTATION_SIG_CHARS, PRESENTATION_SIG_CHARS);
  if (iv === null || ct === null || tag === null || ek === null || sig === null) return null;
  return { iv, ct, tag, ek, sig };
}

const SIGNED_ROUTES: readonly DoorSignedRoute[] = ['blocked', 'session', 'turns', 'sessions', 'screen', 'scrollback'];
const WRITE_ROUTES: readonly DoorWriteRoute[] = ['end', 'choose', 'say', 'keys'];

/** A write route's exact path, read from the one table. */
function writePathOf(route: DoorWriteRoute): string | null {
  for (const row of POCKET_ROUTES) {
    if (row.id === route && !row.reads && row.method === 'POST') return row.path;
  }
  return null;
}

/**
 * One admitted request within every bound, or null.
 *
 * Since Phase 317 the method is `GET` EXACTLY for a read and `POST` EXACTLY
 * for a write; a write's target is its route's path byte for byte, with no
 * `?`; and its body is at most its route's own cap. Nothing here parses it.
 */
export function doorRequestOf(value: unknown): DoorRequest | null {
  if (!isObject(value)) return null;
  const route = value['route'];
  if (route === 'pair') {
    const presentation = presentationOf(value['presentation']);
    return presentation === null ? null : { route: 'pair', presentation };
  }
  if (typeof route !== 'string') return null;
  const read = (SIGNED_ROUTES as readonly string[]).includes(route);
  const write = (WRITE_ROUTES as readonly string[]).includes(route);
  if (!read && !write) return null;
  if (value['method'] !== (write ? 'POST' : 'GET')) return null;
  const target = value['target'];
  if (!boundedString(target, 1, DOOR_TARGET_MAX_CHARS) || !target.startsWith('/')) return null;
  if (write && target !== writePathOf(route as DoorWriteRoute)) return null;
  const headers = signatureHeadersOf(value['headers']);
  if (headers === null) return null;
  const body = value['body'];
  const cap = write ? POCKET_WRITE_BODY_CAPS[route as DoorWriteRoute] : POCKET_READ_BODY_CAP_BYTES;
  if (!(body instanceof Uint8Array) || body.byteLength > cap) return null;
  const channel = value['channel'];
  if (!boundedString(channel, 1, DOOR_PHONE_HEADER_MAX)) return null;
  if (write) {
    return {
      route: route as DoorWriteRoute,
      method: 'POST',
      target,
      headers,
      body: new Uint8Array(body),
      channel
    };
  }
  return {
    route: route as DoorSignedRoute,
    method: 'GET',
    target,
    headers,
    body: new Uint8Array(body),
    channel
  };
}

/** A message main sent the door, or null. Run by the door process. */
export function toDoorOf(value: unknown): ToDoor | null {
  if (!isObject(value)) return null;
  switch (value['kind']) {
    case 'start': {
      const generation = value['generation'];
      const tls = value['tls'];
      const host = value['host'];
      const windowOpen = value['windowOpen'];
      if (!isCount(generation) || generation === 0) return null;
      if (!isObject(tls) || !boundedString(tls['key'], 1, 16_384) || !boundedString(tls['cert'], 1, 16_384)) return null;
      if (!isObject(host) || !boundedString(host['name'], 1, 253) || !isPort(host['port'])) return null;
      if (typeof windowOpen !== 'boolean') return null;
      const pins = pinsOf(value['pins']);
      if (pins === null) return null;
      return {
        kind: 'start',
        generation,
        tls: { key: tls['key'], cert: tls['cert'] },
        pins,
        host: { name: host['name'], port: host['port'] },
        windowOpen
      };
    }
    case 'update': {
      const out: { kind: 'update'; pins?: DoorPin[]; windowOpen?: boolean } = { kind: 'update' };
      if (value['pins'] !== undefined) {
        const pins = pinsOf(value['pins']);
        if (pins === null) return null;
        out.pins = pins;
      }
      if (value['windowOpen'] !== undefined) {
        if (typeof value['windowOpen'] !== 'boolean') return null;
        out.windowOpen = value['windowOpen'];
      }
      return out;
    }
    case 'answer': {
      const id = value['id'];
      const status = value['status'];
      const body = value['body'];
      if (!isCount(id)) return null;
      if (status !== 200 && status !== 404) return null;
      if (body !== null && typeof body !== 'string') return null;
      if (typeof body === 'string' && Buffer.byteLength(body, 'utf8') > DOOR_ANSWER_MAX_BYTES) return null;
      // A refusal carries no body, ever: the reason is a word in a log.
      if (status === 404 && body !== null) return null;
      return { kind: 'answer', id, status, body };
    }
    case 'shutdown':
      return { kind: 'shutdown' };
    case 'stop':
      return { kind: 'stop' };
    default:
      return null;
  }
}

/** A message the door sent main, or null. Run by main. */
export function fromDoorOf(value: unknown): FromDoor | null {
  if (!isObject(value)) return null;
  switch (value['kind']) {
    case 'listening': {
      const localPort = value['localPort'];
      return isPort(localPort) ? { kind: 'listening', localPort } : null;
    }
    case 'refused':
      return value['reason'] === 'bind-failed' ? { kind: 'refused', reason: 'bind-failed' } : null;
    case 'request': {
      const id = value['id'];
      const generation = value['generation'];
      if (!isCount(id) || !isCount(generation)) return null;
      const request = doorRequestOf(value['request']);
      return request === null ? null : { kind: 'request', id, generation, request };
    }
    case 'refusal': {
      const word = value['word'];
      return isWord(word) ? { kind: 'refusal', word } : null;
    }
    case 'stopped': {
      const accepted = value['accepted'];
      const joined = value['joined'];
      const waitedMs = value['waitedMs'];
      if (!isCount(accepted) || typeof joined !== 'boolean' || !isCount(waitedMs)) return null;
      return { kind: 'stopped', accepted, joined, waitedMs };
    }
    default:
      return null;
  }
}
