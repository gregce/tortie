/**
 * The ONE outbound request in Tortie (Phase 181), and the only one there is.
 *
 * Before this phase Tortie held no API key and reached no endpoint of its
 * own; the only model path was a confirmed agent binary. This module is the
 * whole of the crossing, and it is deliberately small enough to read in one
 * sitting.
 *
 * FOUR RULES, and they are why this is `node:https` rather than a fetch:
 *
 *  1. THE DESTINATION IS COMPILED IN. `host` comes from ./endpoints.ts, which
 *     holds two frozen constants. Nothing a person or an agent can write into
 *     a settings file, a configuration overlay or an argv reaches this
 *     function's `host` or `path`.
 *  2. NO PROXY, EVER. Chromium's stack (and therefore `net.fetch`) honours the
 *     system proxy, which would make a third host a routine recipient of a
 *     bearer token. `https.request` against an explicit host and port 443
 *     goes to the vendor and to nothing else.
 *  3. NO REDIRECT IS FOLLOWED. A 3xx is returned as a status and never
 *     chased, because chasing one is how a token reaches a host this file
 *     never named.
 *  4. NOTHING HERE IS LOGGED. Not the headers, not the body, not the status.
 *     The caller logs a fixed sentence and a provider name. The request
 *     headers carry the person's bearer token and the Codex response body
 *     carries their email address, so a single stray console line would be
 *     the defect this whole phase is careful about.
 *
 * The body is capped and the request is deadlined, so a vendor that answers
 * slowly or forever cannot hold a handle or grow the heap.
 */

import { request } from 'node:https';

/** Hard ceiling on a response body. The measured bodies are 2 KB and 1.5 KB. */
export const USAGE_BODY_CAP_BYTES = 256 * 1024;
/** Whole request deadline, connect to last byte. */
export const USAGE_TIMEOUT_MS = 10_000;
/** `Retry-After` is clamped to this, per research 72 section 4. */
export const RETRY_AFTER_MAX_MS = 24 * 60 * 60 * 1000;

export interface UsageRequest {
  /** A host from ./endpoints.ts. Never a value from configuration. */
  host: string;
  /** A path from ./endpoints.ts. Never a value from configuration. */
  path: string;
  headers: Record<string, string>;
  /**
   * PHASE 200. The caller's cancel. The audit's sentence was that this module
   * "does not expose its `ClientRequest` for cancellation", so the usage
   * service could neither end nor honestly join a request it had started when
   * it was disposed. Exposing the request object would have handed a socket to
   * every caller; a signal hands over exactly the one power that is needed.
   *
   * On abort the request is DESTROYED, so the promise rejects and the service
   * reads the failure the way it reads any other, being one 'unavailable'
   * outcome with no body, no header and no line in a log.
   */
  signal?: AbortSignal;
}

export interface UsageResponse {
  status: number;
  /** The body as text, truncated at the cap. Never logged. */
  body: string;
  /** `Retry-After` as an absolute deadline in ms, clamped; null when absent. */
  retryAfterAt: number | null;
}

/** The seam. Tests hand in their own and reach no network. */
export type UsageTransport = (req: UsageRequest) => Promise<UsageResponse>;

/**
 * `Retry-After` as an absolute deadline, from either of the two forms HTTP
 * allows: delta seconds, or an HTTP date. Clamped to 24 hours, because a
 * header saying "next year" would silence the meter for a year.
 *
 * Unmeasured on purpose: research 72 section 8.5 records that no 429 was ever
 * received, so whether Anthropic sends this header at all is unknown. The
 * parser therefore tolerates both forms and an absent header equally.
 */
export function retryAfterDeadline(
  header: string | undefined,
  now: number
): number | null {
  if (header === undefined) return null;
  const text = header.trim();
  if (text === '') return null;
  const seconds = Number(text);
  if (Number.isFinite(seconds)) {
    // A number decides the answer outright, including a negative one, which
    // means no wait. Falling through to the date parser on a negative would
    // read "-5" as a year and wait a day.
    if (seconds < 0) return null;
    return now + Math.min(seconds * 1000, RETRY_AFTER_MAX_MS);
  }
  const at = Date.parse(text);
  if (Number.isNaN(at)) return null;
  const delta = at - now;
  if (delta <= 0) return null;
  return now + Math.min(delta, RETRY_AFTER_MAX_MS);
}

/** The real transport: one GET, no proxy, no redirect, capped and deadlined. */
export const httpsTransport: UsageTransport = (req) =>
  new Promise<UsageResponse>((resolve, reject) => {
    // PHASE 200. An abort that arrives before the socket is opened means
    // nothing is ever sent, and the person's token never reaches a wire.
    if (req.signal?.aborted === true) {
      reject(new Error('usage request cancelled'));
      return;
    }
    const client = request(
      {
        method: 'GET',
        protocol: 'https:',
        host: req.host,
        port: 443,
        path: req.path,
        headers: req.headers,
        timeout: USAGE_TIMEOUT_MS,
        ...(req.signal !== undefined ? { signal: req.signal } : {})
      },
      (res) => {
        let body = '';
        let stopped = false;
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          if (stopped) return;
          body += chunk;
          if (body.length >= USAGE_BODY_CAP_BYTES) {
            stopped = true;
            body = body.slice(0, USAGE_BODY_CAP_BYTES);
            res.destroy();
          }
        });
        const done = (): void =>
          resolve({
            status: res.statusCode ?? 0,
            body,
            retryAfterAt: retryAfterDeadline(
              typeof res.headers['retry-after'] === 'string'
                ? res.headers['retry-after']
                : undefined,
              Date.now()
            )
          });
        res.on('end', done);
        res.on('close', done);
        res.on('error', () => done());
      }
    );
    client.on('timeout', () => client.destroy(new Error('usage request timed out')));
    client.on('error', (err) => reject(err));
    // PHASE 200. The tracked request, ended by its owner. `signal` above
    // already asks Node to abort, and this line is what makes the socket go
    // away on a runtime where that is the only handle the caller has. The
    // listener is removed when the request settles, so a signal that outlives
    // one request holds no reference to it.
    if (req.signal !== undefined) {
      const signal = req.signal;
      const onAbort = (): void => {
        client.destroy(new Error('usage request cancelled'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      client.once('close', () => {
        signal.removeEventListener('abort', onAbort);
      });
    }
    client.end();
  });
