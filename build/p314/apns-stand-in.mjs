/**
 * The APNs stand-in (Phase 314). The ONLY thing the push sender is ever aimed
 * at, in every test, gate and probe of this phase.
 *
 * WHAT IT IS. Two cleartext HTTP/2 (h2c, prior knowledge) listeners on
 * `127.0.0.1`, each on a port the kernel chose, one playing Apple's
 * DEVELOPMENT origin and one its PRODUCTION origin, speaking the shape of
 * Apple's provider API as Apple documents it:
 * https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
 * and
 * https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns
 *
 *   - `POST /3/device/<hex token>` with `authorization: bearer <JWT>`,
 *     `apns-topic`, `apns-push-type`, `apns-priority`, `apns-expiration` and
 *     optionally `apns-collapse-id`;
 *   - `200` with an `apns-id` header and no body when it takes the request;
 *   - otherwise a JSON body `{"reason":"…"}`, with a `timestamp` beside the
 *     reason on a `410`.
 *
 * WHAT IT RECORDS. Every stream: which origin it reached, the method, the
 * path and its token, every header the sender set, the JWT's decoded header
 * and claims, the signing input, the signature's length, WHETHER THE
 * SIGNATURE VERIFIES under the scratch public key the importer handed in, the
 * body bytes, and the status and reason it answered. It also counts the HTTP/2
 * sessions each listener accepted, which is how "refused before any socket" is
 * read: a refusal that dialled would move the count.
 *
 * HOW IT ANSWERS, in this order:
 *
 *   1. a SCRIPTED answer for that token, first in first out, when there is one
 *      (`script(token, ...answers)`); an answer is `{ status, reason }`,
 *      `{ reset: true }` (the stream is reset, a stream error),
 *      `{ hang: true }` (it never answers, for the shutdown join) or
 *      `{ trickle: true }` (a 200 whose body never ends: one byte every 25 ms,
 *      for the sender's deadline, the fix round);
 *   2. `405 MethodNotAllowed` for a method that is not POST, `404 BadPath` for
 *      a path that is not `/3/device/<hex>`;
 *   3. `403 MissingProviderToken` with no bearer, `403 InvalidProviderToken`
 *      for one whose signature does not verify;
 *   4. `400 DeviceTokenNotForTopic` for a topic other than the seeded one;
 *   5. `400 BadDeviceToken` for a token this ORIGIN was not seeded with, which
 *      is Apple's answer to a token minted in the other environment ("Verify
 *      … that the token matches the environment");
 *   6. `200` with an `apns-id` otherwise.
 *
 * WHAT IT REFUSES TO BE. It runs IN THE IMPORTING PROCESS, never as a child,
 * so `gate:background` has no new start to judge and there is nothing to end
 * but two listeners; the importer calls `close()` in its own `finally`. It
 * binds `127.0.0.1` and nothing else, on port 0, and the TLS leg to Apple is
 * therefore NOT driven here and cannot be without the network this phase
 * refuses. It never logs: what it recorded stays in the importer's memory, and
 * a caller that writes a report writes digests.
 *
 * `startSilentPeer()` (the fix round) is the stand-in's other half: a TCP
 * listener on `127.0.0.1` that takes every connection and never writes a byte,
 * so behind `https:` it is a TLS handshake nobody answers and behind `http:` an
 * h2c peer that never sends its SETTINGS. Its importer closes it in a `finally`
 * too.
 */

import { createHash, createPublicKey, randomUUID, verify as verifySignature } from 'node:crypto';
import http2 from 'node:http2';
import net from 'node:net';

/** The only address this stand-in ever binds. */
export const STAND_IN_HOST = '127.0.0.1';

const b64uDecode = (text) => Buffer.from(text, 'base64url');

/** Decode one JWT without trusting it. Answers nulls for a shape that is not one. */
function decodeJwt(token, publicKey) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { header: null, claims: null, signingInput: null, signatureBytes: 0, verifies: false };
  }
  let header = null;
  let claims = null;
  try {
    header = JSON.parse(b64uDecode(parts[0]).toString('utf8'));
  } catch {
    header = null;
  }
  try {
    claims = JSON.parse(b64uDecode(parts[1]).toString('utf8'));
  } catch {
    claims = null;
  }
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = b64uDecode(parts[2]);
  let verifies = false;
  try {
    // ES256 as Apple names it: ECDSA P-256 over SHA-256, the signature the raw
    // 64-byte r||s ("ieee-p1363"), never DER.
    verifies =
      signature.length === 64 &&
      verifySignature(
        'sha256',
        Buffer.from(signingInput, 'utf8'),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        signature
      );
  } catch {
    verifies = false;
  }
  return { header, claims, signingInput, signatureBytes: signature.length, verifies };
}

/**
 * Start the stand-in.
 *
 * @param {object} options
 * @param {string|import('node:crypto').KeyObject} options.publicKey  the scratch P-256 PUBLIC key
 * @param {string} options.topic                                       the one topic it accepts
 * @param {Record<string, 'development'|'production'>} [options.devices]  token → the origin it was minted for
 * @param {() => number} [options.now]                                 its own clock, for timestamps
 */
export async function startApnsStandIn(options) {
  const publicKey =
    typeof options.publicKey === 'string' ? createPublicKey(options.publicKey) : options.publicKey;
  const now = options.now ?? (() => Date.now());
  const devices = new Map(Object.entries(options.devices ?? {}));
  const scripts = new Map();
  const requests = [];
  const connections = { development: 0, production: 0 };
  const sessions = new Set();
  const hung = new Set();
  const drips = new Set();

  const makeServer = (origin) => {
    const server = http2.createServer();
    server.on('session', (session) => {
      connections[origin] += 1;
      sessions.add(session);
      session.on('close', () => sessions.delete(session));
      // A session error is the sender's to see; the stand-in only records.
      session.on('error', () => undefined);
    });
    server.on('stream', (stream, headers) => {
      stream.on('error', () => undefined);
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const body = Buffer.concat(chunks);
        const path = String(headers[':path'] ?? '');
        const method = String(headers[':method'] ?? '');
        const tokenMatch = /^\/3\/device\/([^/?#]*)$/.exec(path);
        const token = tokenMatch === null ? null : tokenMatch[1];
        const auth = String(headers['authorization'] ?? '');
        const bearer = /^bearer (.+)$/.exec(auth);
        const jwt = bearer === null ? null : decodeJwt(bearer[1], publicKey);
        const record = {
          seq: requests.length + 1,
          at: now(),
          origin,
          method,
          path,
          token,
          headers: {
            'apns-topic': headers['apns-topic'] ?? null,
            'apns-push-type': headers['apns-push-type'] ?? null,
            'apns-priority': headers['apns-priority'] ?? null,
            'apns-expiration': headers['apns-expiration'] ?? null,
            'apns-collapse-id': headers['apns-collapse-id'] ?? null,
            'apns-id': headers['apns-id'] ?? null,
            'content-type': headers['content-type'] ?? null
          },
          headerNames: Object.keys(headers).filter((n) => !n.startsWith(':')).sort(),
          /** The whole bearer token, for a verifier's own check. Never printed by this module. */
          authorization: bearer === null ? null : bearer[1],
          authorizationDigest:
            bearer === null ? null : createHash('sha256').update(bearer[1]).digest('hex'),
          jwt,
          body: body.toString('utf8'),
          bodyBytes: body.length,
          status: 0,
          reason: null
        };
        requests.push(record);

        const answer = (status, reason) => {
          record.status = status;
          record.reason = reason;
          if (stream.destroyed || stream.closed) return;
          if (status === 200) {
            stream.respond({ ':status': 200, 'apns-id': randomUUID() });
            stream.end();
            return;
          }
          const payload =
            status === 410
              ? JSON.stringify({ reason, timestamp: now() })
              : JSON.stringify({ reason });
          stream.respond({
            ':status': status,
            'apns-id': randomUUID(),
            'content-type': 'application/json'
          });
          stream.end(payload);
        };

        // 1. The script, for a token that has one.
        const queue = token === null ? undefined : scripts.get(token);
        if (queue !== undefined && queue.length > 0) {
          const next = queue.shift();
          if (next.reset === true) {
            record.status = -1;
            record.reason = 'reset';
            stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
            return;
          }
          if (next.hang === true) {
            record.status = -2;
            record.reason = 'hang';
            hung.add(stream);
            return;
          }
          if (next.trickle === true) {
            record.status = 200;
            record.reason = 'trickle';
            stream.respond({ ':status': 200, 'apns-id': randomUUID() });
            const drip = setInterval(() => {
              if (!stream.destroyed && !stream.closed) stream.write('x');
            }, 25);
            drips.add(drip);
            stream.on('close', () => {
              clearInterval(drip);
              drips.delete(drip);
            });
            return;
          }
          answer(next.status, next.reason ?? null);
          return;
        }
        // 2. The route.
        if (method !== 'POST') return answer(405, 'MethodNotAllowed');
        if (token === null || !/^[0-9a-f]+$/.test(token)) return answer(404, 'BadPath');
        // 3. The provider token.
        if (jwt === null) return answer(403, 'MissingProviderToken');
        if (!jwt.verifies) return answer(403, 'InvalidProviderToken');
        // 4. The topic.
        if (headers['apns-topic'] !== options.topic) return answer(400, 'DeviceTokenNotForTopic');
        // 5. The environment the token was minted in.
        if (devices.get(token) !== origin) return answer(400, 'BadDeviceToken');
        // 6. Taken.
        return answer(200, null);
      });
    });
    return server;
  };

  const servers = { development: makeServer('development'), production: makeServer('production') };
  const ports = {};
  for (const origin of ['development', 'production']) {
    await new Promise((resolve, reject) => {
      const server = servers[origin];
      const onError = (err) => reject(err);
      server.once('error', onError);
      server.listen(0, STAND_IN_HOST, () => {
        server.off('error', onError);
        ports[origin] = server.address().port;
        resolve();
      });
    });
  }

  let closed = false;
  return {
    /** `http://127.0.0.1:<port>` for each environment. */
    origins: {
      development: `http://${STAND_IN_HOST}:${String(ports.development)}`,
      production: `http://${STAND_IN_HOST}:${String(ports.production)}`
    },
    /** Every stream recorded, oldest first. The array is live. */
    requests,
    /** HTTP/2 sessions accepted, per listener. The object is live. */
    connections,
    /** Streams held open by a `hang` answer right now. */
    hungCount: () => hung.size,
    /** Queue answers for one token, first in first out. */
    script(token, ...answers) {
      const queue = scripts.get(token) ?? [];
      for (const a of answers) queue.push(typeof a === 'number' ? { status: a } : a);
      scripts.set(token, queue);
    },
    /** Forget every queued answer. */
    clearScripts() {
      scripts.clear();
    },
    /** Seed, or re-seed, the environment a token was minted in. */
    setDevice(token, origin) {
      devices.set(token, origin);
    },
    /** The requests since `from` (an index into `requests`). */
    since(from) {
      return requests.slice(from);
    },
    /** End both listeners and every session. Safe to call twice. */
    async close() {
      if (closed) return;
      closed = true;
      for (const drip of drips) clearInterval(drip);
      drips.clear();
      for (const stream of hung) {
        try {
          stream.close(http2.constants.NGHTTP2_CANCEL);
        } catch {
          /* already gone */
        }
      }
      hung.clear();
      for (const session of [...sessions]) {
        try {
          session.destroy();
        } catch {
          /* already gone */
        }
      }
      await Promise.all(
        Object.values(servers).map(
          (server) =>
            new Promise((resolve) => {
              server.close(() => resolve());
            })
        )
      );
    }
  };
}

/**
 * A peer that never answers (the fix round): a TCP listener on `127.0.0.1`,
 * port 0, that takes every connection, reads and drops what arrives, and never
 * writes a byte. It counts the connections it took and the ones the sender
 * closed, which is how "a dead connection is never handed on" is read.
 */
export async function startSilentPeer() {
  const sockets = new Set();
  const counts = { accepted: 0, closed: 0 };
  const server = net.createServer((socket) => {
    counts.accepted += 1;
    sockets.add(socket);
    socket.on('error', () => undefined);
    socket.resume();
    socket.on('close', () => {
      counts.closed += 1;
      sockets.delete(socket);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, STAND_IN_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const port = server.address().port;
  let closed = false;
  return {
    /** `https://127.0.0.1:<port>` or `http://127.0.0.1:<port>`. */
    origin: (scheme) => `${scheme}://${STAND_IN_HOST}:${String(port)}`,
    /** Live counts. */
    counts,
    /** End every connection and the listener. Safe to call twice. */
    async close() {
      if (closed) return;
      closed = true;
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
