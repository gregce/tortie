/**
 * Every number that bounds the door, and THE ONE READER OF THE PROXY SOURCE
 * (Phase 330, build/p330/SPEC.md §4.6 step 2 and §8).
 *
 * ## The source is a rate-limit key, and nothing else
 *
 * Every connection Funnel forwards arrives from `127.0.0.1`, so without the
 * PROXY header no limit per client is possible and about three idle sockets a
 * second keep a phone out (research 132 §7.2). With it, one client holds at
 * most {@link PER_SOURCE_MAX} connections at once. But any process on this Mac
 * can write the header naming any address (§7.3), so the address proves
 * nothing about who is asking, and it is used for EXACTLY ONE THING: the key of
 * the count below. It never reaches a `DoorRequest`, a log line, the confirm
 * hash or the verifier (`conformance:pocket` P1), and this module is the only
 * place its bytes are read.
 */

import type { ProxyHeader } from './proxy-v2';

/** The same cap the hook server carries (`bind.ts:99` before Phase 330). */
export const MAX_CONNECTIONS = 32;
/** One client's open connections, from its header to its close. */
export const PER_SOURCE_MAX = 4;
/** A connection has this long to send its whole PROXY header. */
export const PROXY_HEADER_TIMEOUT_MS = 5_000;
/** The TLS handshake gets this long. */
export const HANDSHAKE_TIMEOUT_MS = 10_000;
/** A connection handed to HTTP has this long to send a request's headers. */
export const HEADERS_TIMEOUT_MS = 10_000;
/** A whole request, headers and body, gets this long. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** An idle keep-alive connection gets this long. */
export const KEEP_ALIVE_TIMEOUT_MS = 5_000;
/** Main has this long to answer a request the door forwarded, or it is refused. */
export const ANSWER_TIMEOUT_MS = 15_000;
/** How long a `stop` waits for the requests it accepted before cutting sockets. */
export const DOOR_STOP_JOIN_MS = 1_000;
/** How long it then waits for the listener's own close. */
export const DOOR_STOP_CLOSE_MS = 1_000;
/** The most bytes `POST /pair` will read before dropping the request whole. */
export const POCKET_PAIR_BODY_CAP_BYTES = 4 * 1024;

/** The timings a test may shorten. Production passes none of these. */
export interface DoorTimings {
  readonly proxyHeaderMs: number;
  readonly handshakeMs: number;
  readonly headersMs: number;
  readonly requestMs: number;
  readonly keepAliveMs: number;
  readonly answerMs: number;
  readonly stopJoinMs: number;
  readonly stopCloseMs: number;
}

export const DOOR_TIMINGS: DoorTimings = Object.freeze({
  proxyHeaderMs: PROXY_HEADER_TIMEOUT_MS,
  handshakeMs: HANDSHAKE_TIMEOUT_MS,
  headersMs: HEADERS_TIMEOUT_MS,
  requestMs: REQUEST_TIMEOUT_MS,
  keepAliveMs: KEEP_ALIVE_TIMEOUT_MS,
  answerMs: ANSWER_TIMEOUT_MS,
  stopJoinMs: DOOR_STOP_JOIN_MS,
  stopCloseMs: DOOR_STOP_CLOSE_MS
});

/** Counts open connections per source, and refuses the one past the cap. */
export interface SourceLimiter {
  /**
   * Count one connection against its header's source. Answers the release to
   * call at its close, or null when that source already holds the cap.
   */
  admit(header: ProxyHeader): (() => void) | null;
  /** How many sources hold at least one connection. For tests. */
  sources(): number;
}

/**
 * The key of the count: the family and the SOURCE address bytes, and nothing
 * else. The ports are not in it, because a client opens every connection from
 * a new one. It lives in this Map and nowhere else.
 */
function sourceKeyOf(header: ProxyHeader): string {
  const width = header.family === 'tcp4' ? 4 : 16;
  return `${header.family}:${header.addressBlock.subarray(0, width).toString('hex')}`;
}

export function createSourceLimiter(max: number = PER_SOURCE_MAX): SourceLimiter {
  const open = new Map<string, number>();
  return {
    admit(header) {
      const key = sourceKeyOf(header);
      const held = open.get(key) ?? 0;
      if (held >= max) return null;
      open.set(key, held + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const left = (open.get(key) ?? 1) - 1;
        if (left <= 0) open.delete(key);
        else open.set(key, left);
      };
    },
    sources: () => open.size
  };
}
