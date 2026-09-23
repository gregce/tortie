/**
 * The APNs sender (Phase 314): one HTTP/2 POST per alert, token based, from the
 * Mac's own process.
 *
 * WHAT IT IS MADE OF. `node:http2` for the connection and `node:crypto` for the
 * ES256 provider token, and nothing else. No dependency is added, so CLAUDE.md
 * refusal 6 is not approached.
 *
 * ITS DEFAULT IS SAFE, and the three refusals are checked in this order, each
 * before anything is composed and before any socket is opened:
 *
 *   1. an origin that is not `http:` or `https:`, or that carries a path, a
 *      query, a fragment or credentials, is refused;
 *   2. cleartext `http:` is refused for every host but `127.0.0.1` and `[::1]`,
 *      whatever the caller passed, so the one cleartext origin this sender will
 *      ever speak is a stand-in on this Mac;
 *   3. an origin that is not one of those two literal loopback addresses is
 *      refused unless the sender was built with `allowRemote: true`. A NAME is
 *      never loopback here, `localhost` included, because a name can resolve
 *      anywhere. Nothing in this phase passes `allowRemote`.
 *
 * Then a device token that is not lowercase hex is refused before a `:path` is
 * composed from it, so nothing that is not hex can ever be a path segment.
 *
 * THE PROVIDER TOKEN. Apple's own claim set, signed ES256 with the key's P-256
 * private key, reused while it is younger than {@link TOKEN_REUSE_MS} by the
 * WALL clock (a monotonic clock does not advance during a sleep on macOS, so an
 * eight hour sleep would read as a young token), and REUSED when the wall clock
 * moved backwards, because Apple judges the token by Apple's clock and a
 * re-mint on every backwards jump is how a provider meets
 * `TooManyProviderTokenUpdates`. The cache is keyed by the sha256 of the whole
 * key record, so a different key, key id, team or topic re-mints.
 *
 * EVERY REQUEST HAS ONE DEADLINE, and it is a timer of this module's own
 * (the fix round, Phase 314). The first build set only the stream's IDLE timer
 * and closed the stream when it fired, which is not enough twice over. A
 * stream on a connection that never becomes ready (a TLS handshake nobody
 * answers) is still PENDING, and node puts a pending stream's reset off until
 * `ready`, which never comes: the send never settled, the stuck connection was
 * handed to every later send, and on a Mac that never sleeps nothing was pushed
 * again for the rest of the run. And an idle timer is refreshed by every byte,
 * so an answer whose body trickles forever kept a send open with no end. So:
 * when {@link REQUEST_TIMEOUT_MS} passes, a request with no status yet settles
 * as unreachable AND ITS CONNECTION IS DESTROYED, so every stream on it settles
 * and the next send dials fresh; a request whose status did arrive settles on
 * that status and its stream is reset. A body past {@link ANSWER_READ_BYTES}
 * settles there too, without waiting for its end.
 *
 * WHAT NEVER LEAVES THIS MODULE. The key, the provider token and the payload
 * are never logged and never in an answer; an answer carries Apple's status and
 * Apple's one-word reason, or status 0 and this module's own refusal sentence,
 * and nothing else. The one log line it writes is that refusal sentence, once
 * per sender, and it names no origin.
 */

import {
  connect,
  constants as http2Constants,
  type ClientHttp2Session,
  type ClientHttp2Stream,
  type OutgoingHttpHeaders
} from 'node:http2';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import type { ApnsProviderKey } from '../credentials/apns-key';
import { getLog } from '../log';

const senderLog = getLog('push');

export type ApnsEnvironment = 'development' | 'production';

/**
 * The origin Apple serves an environment from. THE ONE PLACE IN `src/` WHERE
 * EITHER HOST IS SPELLED, and nothing in this phase ever dials either: every
 * test, gate and probe hands the sender a loopback stand-in instead.
 */
export function apnsOrigin(env: ApnsEnvironment): string {
  return env === 'production'
    ? 'https://api.push.apple.com:443'
    : 'https://api.sandbox.push.apple.com:443';
}

/** A provider token younger than this, by the wall clock, is reused. */
export const TOKEN_REUSE_MS = 50 * 60_000;

/** A connection with no request on it for this long is closed. */
export const IDLE_CLOSE_MS = 30 * 60_000;

/**
 * The most one request may take, from the send to its answer. With no status
 * by then it settles as unreachable and its connection is destroyed; with a
 * status it settles on that status.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

/** How long `close()` waits for a connection to close itself before destroying it. */
const CLOSE_BOUND_MS = 2_000;

/** The most of an answer's body that is read. Apple's is one small JSON object. */
const ANSWER_READ_BYTES = 4_096;

export interface ApnsRequest {
  readonly token: string;
  readonly environment: ApnsEnvironment;
  readonly topic: string;
  readonly payload: string;
  readonly priority: 10 | 5;
  readonly expiration: number;
  readonly collapseId: string | null;
}

export type ApnsAnswer =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly status: number;
      readonly reason: string;
      readonly kind: 'drop' | 'stop' | 'reauth' | 'later' | 'retry';
    };

export interface ApnsSender {
  /** Re-mints once on `ExpiredProviderToken` and retries that one request once, inside. */
  send(key: ApnsProviderKey, request: ApnsRequest): Promise<ApnsAnswer>;
  /** Closes every connection. The sender stays usable: the next send opens a new one. */
  close(): Promise<void>;
}

export interface ApnsSenderOptions {
  /** Production: {@link apnsOrigin}. Every test, gate and probe: a loopback stand-in. */
  origin(env: ApnsEnvironment): string;
  /** Default false. */
  allowRemote?: boolean;
  /** Wall clock, for `iat` and the reuse window. Default `Date.now`. */
  now?(): number;
  /**
   * TESTS AND GATES ONLY: the request deadline, in place of
   * {@link REQUEST_TIMEOUT_MS}, so a peer that never answers can be driven in
   * well under a second. Production leaves it unset. Anything but a positive
   * finite number is ignored.
   */
  requestTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// The refusals, each a sentence and never a value
// ---------------------------------------------------------------------------

const ORIGIN_UNREADABLE =
  'The push sender refused an origin that is not a bare http or https origin.';
const CLEARTEXT_REFUSED =
  'The push sender refused cleartext http to anything but 127.0.0.1 or [::1].';
const REMOTE_REFUSED =
  'The push sender refused an origin that is not this Mac, because it was not built to reach Apple.';
const DEVICE_NOT_HEX = 'The push sender refused a device address that is not lowercase hex.';
const KEY_UNUSABLE = 'KeyUnusable';
const UNREACHABLE = 'Unreachable';

/** The two literal loopback addresses. A name is never one of them. */
function isLoopbackOrigin(url: URL): boolean {
  return url.hostname === '127.0.0.1' || url.hostname === '[::1]';
}

/** Why an origin is refused, or null when it may be dialled. Opens nothing. */
function originRefusal(origin: string, options: ApnsSenderOptions): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return ORIGIN_UNREADABLE;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return ORIGIN_UNREADABLE;
  if (
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    return ORIGIN_UNREADABLE;
  }
  if (url.protocol === 'http:' && !isLoopbackOrigin(url)) return CLEARTEXT_REFUSED;
  if (!isLoopbackOrigin(url) && options.allowRemote !== true) {
    return REMOTE_REFUSED;
  }
  return null;
}

/** Why a device token is refused, or null. Runs before a `:path` exists. */
function deviceTokenRefusal(request: ApnsRequest): string | null {
  if (!/^[0-9a-f]+$/.test(request.token)) {
    return DEVICE_NOT_HEX;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The provider token
// ---------------------------------------------------------------------------

function b64url(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}

/**
 * The provider token's signing input, byte for byte (SPEC §2.6): Apple's
 * header and claim set, each base64url with no padding, joined by a dot.
 */
export function providerTokenSigningInput(
  keyId: string,
  teamId: string,
  iatSeconds: number
): string {
  return (
    b64url('{"alg":"ES256","kid":"' + keyId + '"}') +
    '.' +
    b64url('{"iss":"' + teamId + '","iat":' + iatSeconds + '}')
  );
}

/**
 * The sha256 of the whole key record. The token cache and the engine's
 * `stop` are both keyed by it, so keeping a corrected key, key id, team or
 * topic re-mints and lifts a stop.
 */
export function providerKeyDigest(key: ApnsProviderKey): string {
  return createHash('sha256')
    .update(JSON.stringify([key.keyId, key.teamId, key.topic, key.p8]))
    .digest('hex');
}

/** Ten characters of `[A-Z0-9]`, which is what Apple issues for both. */
const APPLE_ID = /^[A-Z0-9]{10}$/;

/** A signed provider token, or null when this key cannot sign one. */
function mintProviderToken(key: ApnsProviderKey, iatSeconds: number): string | null {
  if (!APPLE_ID.test(key.keyId) || !APPLE_ID.test(key.teamId)) return null;
  try {
    const input = providerTokenSigningInput(key.keyId, key.teamId, iatSeconds);
    const privateKey = createPrivateKey(key.p8);
    if (
      privateKey.asymmetricKeyType !== 'ec' ||
      privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
    ) {
      return null;
    }
    const signature = sign('sha256', Buffer.from(input, 'utf8'), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    });
    return `${input}.${signature.toString('base64url')}`;
  } catch {
    return null;
  }
}

interface CachedToken {
  readonly digest: string;
  readonly token: string;
  /** Whole seconds, as the claim carries it. */
  readonly iat: number;
}

/**
 * The cached token when it may be reused, or null. A NEGATIVE age (the wall
 * clock moved backwards) reuses: Apple judges the token by Apple's clock.
 */
function reusableToken(
  cached: CachedToken | null,
  digest: string,
  nowMs: number
): string | null {
  if (cached === null || cached.digest !== digest) return null;
  const age = nowMs - cached.iat * 1000;
  if (age < TOKEN_REUSE_MS) return cached.token;
  return null;
}

// ---------------------------------------------------------------------------
// Apple's answers (SPEC §2.7)
// ---------------------------------------------------------------------------

/** Apple's one-word reason from an answer body, or '' when there is none. */
function reasonOf(body: Buffer): string {
  if (body.length === 0) return '';
  try {
    const parsed: unknown = JSON.parse(body.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return '';
    const reason = (parsed as { reason?: unknown }).reason;
    return typeof reason === 'string' && /^[A-Za-z]{1,64}$/.test(reason) ? reason : '';
  } catch {
    return '';
  }
}

/** Map a status and a reason to what the engine does about it. */
export function classifyApnsAnswer(status: number, reason: string): ApnsAnswer {
  if (status === 200) return { ok: true };
  const kind: 'drop' | 'stop' | 'reauth' | 'later' | 'retry' =
    status === 410
      ? 'drop'
      : status === 400 && reason === 'BadDeviceToken'
        ? 'drop'
        : status === 403 && reason === 'ExpiredProviderToken'
          ? 'reauth'
          : status === 429
            ? 'later'
            : status >= 500
              ? 'retry'
              : 'stop';
  return { ok: false, status, reason, kind };
}

const UNREACHABLE_ANSWER: ApnsAnswer = {
  ok: false,
  status: 0,
  reason: UNREACHABLE,
  kind: 'retry'
};

// ---------------------------------------------------------------------------
// The sender
// ---------------------------------------------------------------------------

interface HeldSession {
  readonly session: ClientHttp2Session;
  active: number;
  idle: ReturnType<typeof setTimeout> | null;
}

export function createApnsSender(options: ApnsSenderOptions): ApnsSender {
  const now = (): number => options.now?.() ?? Date.now();
  const requestTimeout =
    typeof options.requestTimeoutMs === 'number' &&
    Number.isFinite(options.requestTimeoutMs) &&
    options.requestTimeoutMs > 0
      ? options.requestTimeoutMs
      : REQUEST_TIMEOUT_MS;
  const sessions = new Map<string, HeldSession>();
  let cached: CachedToken | null = null;
  const refusalsSaid = new Set<string>();

  const forget = (origin: string, session: ClientHttp2Session): void => {
    const held = sessions.get(origin);
    if (held === undefined || held.session !== session) return;
    if (held.idle !== null) clearTimeout(held.idle);
    sessions.delete(origin);
  };

  const sessionFor = (origin: string): HeldSession => {
    const held = sessions.get(origin);
    if (held !== undefined && !held.session.closed && !held.session.destroyed) {
      if (held.idle !== null) {
        clearTimeout(held.idle);
        held.idle = null;
      }
      return held;
    }
    if (held !== undefined) forget(origin, held.session);
    const session = connect(origin);
    // A connection error must never become an uncaught one: the stream on it
    // answers unreachable and the next send opens a new connection.
    session.on('error', () => forget(origin, session));
    session.on('goaway', () => forget(origin, session));
    session.on('close', () => forget(origin, session));
    const fresh: HeldSession = { session, active: 0, idle: null };
    sessions.set(origin, fresh);
    return fresh;
  };

  /**
   * A connection a request got no answer on is not handed to anyone again.
   * Destroying it settles every stream on it, a pending one included, and the
   * next send dials fresh.
   */
  const abandon = (origin: string, session: ClientHttp2Session): void => {
    forget(origin, session);
    session.destroy();
  };

  const release = (origin: string, held: HeldSession): void => {
    held.active -= 1;
    if (held.active > 0 || sessions.get(origin) !== held) return;
    const timer = setTimeout(() => {
      forget(origin, held.session);
      held.session.close();
    }, IDLE_CLOSE_MS);
    timer.unref?.();
    held.idle = timer;
  };

  /** One POST. Answers Apple's status and reason, or unreachable. */
  const post = (origin: string, request: ApnsRequest, bearer: string): Promise<ApnsAnswer> => {
    let held: HeldSession;
    try {
      held = sessionFor(origin);
    } catch {
      return Promise.resolve(UNREACHABLE_ANSWER);
    }
    held.active += 1;
    const headers: OutgoingHttpHeaders = {
      ':method': 'POST',
      ':path': `/3/device/${request.token}`,
      authorization: `bearer ${bearer}`,
      'apns-topic': request.topic,
      'apns-push-type': 'alert',
      'apns-priority': String(request.priority),
      'apns-expiration': String(request.expiration)
    };
    if (request.collapseId !== null) headers['apns-collapse-id'] = request.collapseId;
    return new Promise<ApnsAnswer>((resolve) => {
      let settled = false;
      let deadline: ReturnType<typeof setTimeout> | null = null;
      const settle = (answer: ApnsAnswer): void => {
        if (settled) return;
        settled = true;
        if (deadline !== null) clearTimeout(deadline);
        release(origin, held);
        resolve(answer);
      };
      let stream: ClientHttp2Stream;
      try {
        stream = held.session.request(headers);
      } catch {
        settle(UNREACHABLE_ANSWER);
        return;
      }
      let status = 0;
      const chunks: Buffer[] = [];
      let size = 0;
      const answered = (): ApnsAnswer =>
        status === 0
          ? UNREACHABLE_ANSWER
          : classifyApnsAnswer(status, reasonOf(Buffer.concat(chunks)));
      stream.on('response', (answer) => {
        const value = Number(answer[':status']);
        status = Number.isInteger(value) ? value : 0;
      });
      stream.on('data', (chunk: Buffer) => {
        if (size >= ANSWER_READ_BYTES) return;
        chunks.push(chunk);
        size += chunk.length;
        // Apple's answer is one small JSON object. A body past the cap is
        // not read to its end: the send settles on what it has.
        if (size >= ANSWER_READ_BYTES) {
          settle(answered());
          stream.close(http2Constants.NGHTTP2_CANCEL);
        }
      });
      stream.on('error', () => undefined);
      stream.on('close', () => settle(answered()));
      // THE DEADLINE: the module's own timer, never the stream's idle one.
      deadline = setTimeout(() => {
        if (status === 0) {
          abandon(origin, held.session);
          settle(UNREACHABLE_ANSWER);
          return;
        }
        settle(answered());
        stream.close(http2Constants.NGHTTP2_CANCEL);
      }, requestTimeout);
      deadline.unref?.();
      stream.end(request.payload);
    });
  };

  /**
   * The token to send: the cached one while it may be reused, else a fresh
   * one. `failed` names a token Apple called expired; it is re-minted only if
   * it is still the cached one, so two phones answered at once cost one mint.
   */
  const bearerFor = (key: ApnsProviderKey, digest: string, failed: string | null): string | null => {
    const nowMs = now();
    const reused = failed === null ? reusableToken(cached, digest, nowMs) : null;
    if (reused !== null) return reused;
    if (failed !== null && cached !== null && cached.digest === digest && cached.token !== failed) {
      return cached.token;
    }
    const iat = Math.floor(nowMs / 1000);
    const token = mintProviderToken(key, iat);
    if (token === null) return null;
    cached = { digest, token, iat };
    return token;
  };

  return {
    async send(key: ApnsProviderKey, request: ApnsRequest): Promise<ApnsAnswer> {
      const origin = options.origin(request.environment);
      const refused = originRefusal(origin, options);
      if (refused !== null) {
        if (!refusalsSaid.has(refused)) {
          refusalsSaid.add(refused);
          senderLog.warn(refused);
        }
        return { ok: false, status: 0, reason: refused, kind: 'later' };
      }
      const notHex = deviceTokenRefusal(request);
      if (notHex !== null) return { ok: false, status: 0, reason: notHex, kind: 'drop' };
      const bare = new URL(origin).origin;
      const digest = providerKeyDigest(key);
      const bearer = bearerFor(key, digest, null);
      if (bearer === null) return { ok: false, status: 0, reason: KEY_UNUSABLE, kind: 'stop' };
      const first = await post(bare, request, bearer);
      if (first.ok || first.kind !== 'reauth') return first;
      // ExpiredProviderToken: one re-mint, one retry of this one request, and
      // never a third attempt. A second expiry comes back as `reauth` and the
      // engine stops on it.
      const again = bearerFor(key, digest, bearer);
      if (again === null) return { ok: false, status: 0, reason: KEY_UNUSABLE, kind: 'stop' };
      return post(bare, request, again);
    },

    async close(): Promise<void> {
      const held = [...sessions.entries()];
      sessions.clear();
      await Promise.all(
        held.map(
          ([, entry]) =>
            new Promise<void>((resolve) => {
              if (entry.idle !== null) clearTimeout(entry.idle);
              const session = entry.session;
              if (session.closed || session.destroyed) {
                resolve();
                return;
              }
              const bound = setTimeout(() => {
                session.destroy();
                resolve();
              }, CLOSE_BOUND_MS);
              bound.unref?.();
              session.close(() => {
                clearTimeout(bound);
                resolve();
              });
            })
        )
      );
    }
  };
}
