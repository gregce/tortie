/**
 * THE LISTENER: the one thing in Tortie that a stranger on the internet can
 * reach (Phase 330, build/p330/SPEC.md §4.6).
 *
 * Since Phase 330 the door is published by Tailscale Funnel as raw TCP, so
 * any host that knows the Mac's public name reaches this code. Research 132
 * §7.1 is why it runs in its own process (`../door-process.ts`, a
 * `utilityProcess` that holds no credential), and §9 condition 1 is why a
 * stranger never reaches the HTTP parser: outside a pairing window, a
 * connection whose client key is not a paired phone's is destroyed at the end
 * of the TLS handshake, before a single HTTP byte is parsed.
 *
 * ## The order, and every step destroys the socket on refusal
 *
 * 0. **Capacity.** `net.createServer`, THE ONE `listen` IN THE DOMAIN:
 *    `listen(0, '127.0.0.1')`. The port is ephemeral because the phone is told
 *    the PUBLIC port Funnel serves, never this one; nothing but the Funnel
 *    child is ever told it, and it is `127.0.0.1` because the macOS Tailscale
 *    variants refuse any other target (research 132 §3.8).
 * 1. **PROXY v2** (`./proxy-v2.ts`), whole within 5 s, or `proxy`.
 * 2. **The limiter** (`./limits.ts`), the one reader of the PROXY source: at
 *    most 4 open connections per source, or `source-cap`.
 * 3. **TLS 1.3, requesting a client certificate**, in a `tls.Server` that
 *    never listens. Under TLS 1.2 the client certificate would cross Funnel's
 *    relay in the clear and hand Tailscale a stable identifier for the phone.
 * 4. **At `secureConnection`, the pin.** SNI must be the public name. A
 *    certificate's KEY must hash to a paired phone's pin, or `unknown-key`; no
 *    certificate is allowed only while a window is open, or `no-certificate`.
 *    `rejectUnauthorized` is false because there is no authority to chain a
 *    phone's certificate to: THE PIN IS THE VERIFICATION, IT IS NOT OPTIONAL,
 *    and a socket either completes it or is destroyed. Only then is the
 *    socket handed to HTTP, by the one `httpServer.emit('connection', …)` in
 *    the domain (`conformance:pocket` M1).
 * 5. **HTTP**, in an `http.Server` that never listens: refusals 1 to 5, which
 *    moved here from `../server.ts`. `/pair`'s outer JSON is parsed here,
 *    strictly, so main never runs `JSON.parse` on a stranger's bytes.
 * 6. **Forward** the typed request to main, and write main's answer through
 *    `./send.ts`, the one writer.
 *
 * ## The one write (Phase 317, build/p317/SPEC.md §5.3.2)
 *
 * `POST /v1/end` passes the same steps with three differences, and nothing
 * here parses its body: a write takes NO query string (refused `route`), its
 * body is capped by its own row (`POCKET_WRITE_BODY_CAPS`), and it is
 * forwarded as a `POST` whose target is its path alone. Two rules then hold
 * for a write that main was handed:
 *
 * - **A late answer CUTS the connection, never 404.** A read answered 404 when
 *   main is late means nothing happened, and that is true of a read. Of a
 *   write it may be false: main may be acting on it now. So a write main does
 *   not answer in time ends its connection (`writesCut`), and the phone reads
 *   "no answer" and re-reads, which is true.
 * - **A revoked socket finishes a WRITE's answer, and only that.** When the
 *   pins move (a Remove), a socket whose key is no longer pinned is cut at
 *   once, exactly as before, UNLESS it is carrying a write main was already
 *   handed: that answer is let out whole, the socket takes no further
 *   request, and it is cut when the answer is out. A removed phone's
 *   in-flight READ is cut with no byte, as it always was.
 *
 * ## Two things measured rather than assumed
 *
 * - **An `http.Server` that never listens does not enforce `headersTimeout`
 *   or `requestTimeout`.** Node checks both from a timer it starts on the
 *   server's own `listening` event, which never fires here: measured on
 *   2026-09-29, a client that sent half a header block was still open after
 *   6 s against a 1.5 s `headersTimeout`, and closed at 1.76 s once the event
 *   was forced. So the two bounds are this module's own timers (`waitFor` and
 *   `requestTimer`) rather than properties that would read as protection and
 *   do nothing.
 * - **The bytes the PROXY read buffered past the header reach TLS.** The
 *   header and the ClientHello usually arrive in one segment. They are put
 *   back with `socket.unshift` before the socket is handed to TLS, and the
 *   listener tests drive the header and the ClientHello in ONE write and byte
 *   by byte (`door-listener.test.ts`).
 *
 * ## What it refuses to know
 *
 * It imports only `node:net`, `node:tls`, `node:http`, `node:crypto`,
 * `src/shared/` and this directory (`conformance:pocket` W2). It holds no
 * logger: a refusal leaves as a WORD posted to main, once per word per
 * process, never an address, a name, a header value or a byte.
 */

import { createHash } from 'node:crypto';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse
} from 'node:http';
import { createServer as createNetServer, type Server as NetServer, type Socket } from 'node:net';
import { createServer as createTlsServer, type Server as TlsServer, type TLSSocket } from 'node:tls';

import {
  DOOR_TIMINGS,
  MAX_CONNECTIONS,
  PER_SOURCE_MAX,
  POCKET_PAIR_BODY_CAP_BYTES,
  POCKET_WRITE_BODY_CAPS,
  createSourceLimiter,
  type DoorTimings
} from './limits';
import { readProxyV2 } from './proxy-v2';
import { sendPocket } from './send';
import { matchPocketRoute, type PocketRoute } from './table';
import {
  DOOR_REFUSAL_WORDS,
  DOOR_TARGET_MAX_CHARS,
  POCKET_READ_BODY_CAP_BYTES,
  presentationOf,
  signatureHeadersOf,
  toDoorOf,
  type DoorPin,
  type DoorPresentation,
  type DoorRefusalWord,
  type DoorRequest,
  type DoorWriteRoute,
  type FromDoor
} from './wire';

/** The HTTP parser's header cap. */
export const DOOR_MAX_HEADER_BYTES = 8 * 1024;

/** The five keys `/pair`'s outer JSON has, and no sixth. */
const PRESENTATION_KEYS = 'ct,ek,iv,sig,tag';

/** What a test may count. Nothing here is a value from the wire. */
export interface DoorListenerStats {
  /** TCP connections the listener accepted. */
  readonly connections: number;
  /** Connections and requests refused, by word. */
  readonly refused: Readonly<Record<DoorRefusalWord, number>>;
  /** Connections handed to TLS, after their PROXY header and the limiter. */
  readonly handedToTls: number;
  /**
   * Connections handed to TLS with bytes already buffered past the PROXY
   * header (the ClientHello in the same segment), which is the hand-over the
   * listener tests measure rather than assume.
   */
  readonly handedBuffered: number;
  /** Handshakes that completed. */
  readonly handshakes: number;
  /**
   * SOCKETS HANDED TO THE HTTP PARSER, counted on the `http.Server`'s own
   * `connection` event. A refusal before step 5 leaves it unmoved, which is
   * what "zero bytes reached the parser" means and how it is measured: a
   * socket the parser was never handed is a socket none of whose bytes it read.
   */
  readonly parserSockets: number;
  /** Requests the parser produced. */
  readonly parserRequests: number;
  /** Requests forwarded to main. */
  readonly forwarded: number;
  /**
   * Writes whose connection was CUT because main's answer was late (Phase
   * 317). Never answered 404: main may have acted on them.
   */
  readonly writesCut: number;
  /** TLS sockets past the pin check and still open. */
  readonly open: number;
  /** Messages from main that did not validate, dropped whole. */
  readonly droppedMessages: number;
}

export interface DoorListenerOptions {
  /** Tests only: shorter bounds. */
  readonly timings?: Partial<DoorTimings>;
  /** Tests only: a smaller per-source cap. */
  readonly perSourceMax?: number;
}

/** One door process's listener, driven by the messages main sends it. */
export interface DoorListenerHandle {
  /** A message from main. Validated here; one that is not is dropped whole. */
  receive(message: unknown): void;
  /** The process dying: every socket destroyed at once, nothing posted. */
  kill(): void;
  stats(): DoorListenerStats;
}

/** Per TLS socket past the pin check. */
interface Admitted {
  /** The phone whose pin completed this handshake, or null for none. */
  readonly channel: string | null;
  /** The key the handshake completed with, or null for none. */
  readonly spki: string | null;
  /** Requests on it not yet answered. */
  busy: number;
  /** The headers timer: set while the socket waits for a request. */
  wait: ReturnType<typeof setTimeout> | null;
  /**
   * Its key is no longer pinned, or now names another phone (Phase 317). It
   * takes no further request, and it is cut once {@link writes} is zero.
   */
  revoked: boolean;
  /** Its requests forwarded to main whose route is a WRITE and not yet answered. */
  writes: number;
}

function unrefTimer(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
  timer.unref?.();
  return timer;
}

/** Await `work`, but never longer than `ms`. True when the work won. */
async function settleWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = unrefTimer(setTimeout(() => resolve(false), ms));
  });
  try {
    return await Promise.race([work.then(() => true), expired]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** base64url sha256 of a key's SubjectPublicKeyInfo DER, the pin's spelling. */
function spkiPinOfPeer(tlsSocket: TLSSocket): string | null {
  const peer = tlsSocket.getPeerX509Certificate();
  if (peer === undefined) return null;
  const der = peer.publicKey.export({ type: 'spki', format: 'der' });
  return createHash('sha256').update(der).digest('base64url');
}

/**
 * The most bytes a route's body may be (refusal 5). A read's is the signed
 * read cap, `/pair`'s its own, and a write's its row's own cap (Phase 317).
 */
function bodyCapOf(route: PocketRoute): number {
  if (route.reads) return route.signed ? POCKET_READ_BODY_CAP_BYTES : POCKET_PAIR_BODY_CAP_BYTES;
  return POCKET_WRITE_BODY_CAPS[route.id as DoorWriteRoute];
}

/** `/pair`'s outer JSON: exactly the five keys, each within its bound, or null. */
function presentationOfBody(body: Buffer): DoorPresentation | null {
  let value: unknown;
  try {
    value = JSON.parse(body.toString('utf8'));
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  if (Object.keys(value).sort().join(',') !== PRESENTATION_KEYS) return null;
  return presentationOf(value);
}

/**
 * Read at most `cap` bytes. Null when there were more, and in that case the
 * bytes already read are dropped rather than returned: half a body that parses
 * is a body somebody else chose the shape of.
 */
function readCapped(req: IncomingMessage, cap: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    req.on('data', (chunk: Buffer) => {
      if (over) return;
      size += chunk.length;
      if (size > cap) {
        over = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(over ? null : Buffer.concat(chunks)));
    req.on('error', () => resolve(null));
    req.on('aborted', () => resolve(null));
  });
}

export function createDoorListener(
  post: (message: FromDoor) => void,
  options: DoorListenerOptions = {}
): DoorListenerHandle {
  const timings: DoorTimings = { ...DOOR_TIMINGS, ...options.timings };
  const limiter = createSourceLimiter(options.perSourceMax ?? PER_SOURCE_MAX);

  let started = false;
  let dead = false;
  let stopping = false;
  /** Admission. From the first `shutdown` or `stop`, nothing new is admitted. */
  let shuttingDown = false;
  let generation = 0;
  let host = { name: '', port: 0 };
  let windowOpen = false;
  /** spkiSha256 → phoneId. */
  let pins = new Map<string, string>();

  let netServer: NetServer | null = null;
  let tlsServer: TlsServer | null = null;
  let httpServer: HttpServer | null = null;

  /** Every raw socket this listener accepted and has not seen close. */
  const raw = new Set<Socket>();
  /** The raw sockets still reading their PROXY header, not yet handed to TLS. */
  const beforeTls = new Set<Socket>();
  /** Every TLS socket past the pin check. */
  const admitted = new Map<TLSSocket, Admitted>();
  /** Requests forwarded to main and not yet answered. */
  const pending = new Map<number, { res: ServerResponse; timer: ReturnType<typeof setTimeout> }>();
  /** Every response not yet finished, so a stop has something to join. */
  const inFlight = new Set<Promise<void>>();
  let sequence = 0;

  const refused = Object.fromEntries(DOOR_REFUSAL_WORDS.map((w) => [w, 0])) as Record<DoorRefusalWord, number>;
  const counts = { connections: 0, handedToTls: 0, handedBuffered: 0, handshakes: 0, parserSockets: 0, parserRequests: 0, forwarded: 0, writesCut: 0, droppedMessages: 0 };
  /** One post per word per process, so a flood is one line in main's log. */
  const said = new Set<DoorRefusalWord>();

  const send = (message: FromDoor): void => {
    if (dead) return;
    post(message);
  };

  const noteRefusal = (word: DoorRefusalWord): void => {
    refused[word] += 1;
    if (said.has(word)) return;
    said.add(word);
    send({ kind: 'refusal', word });
  };

  const refuseSocket = (socket: Socket | TLSSocket, word: DoorRefusalWord): void => {
    noteRefusal(word);
    socket.destroy();
  };

  const refuseRequest = (res: ServerResponse, word: DoorRefusalWord): void => {
    noteRefusal(word);
    sendPocket(res, 404, null);
  };

  /**
   * A revoked socket (Phase 317): cut it now unless it is answering a write
   * main was handed. True when it was revoked, so the caller stops there.
   */
  const cutIfRevoked = (tlsSocket: TLSSocket, state: Admitted): boolean => {
    if (!state.revoked) return false;
    if (state.writes === 0) tlsSocket.destroy();
    return true;
  };

  /** The headers timer: a socket handed to HTTP must send a request this soon. */
  const waitFor = (tlsSocket: TLSSocket, state: Admitted): void => {
    if (state.wait !== null) clearTimeout(state.wait);
    state.wait = unrefTimer(
      setTimeout(() => {
        state.wait = null;
        if (state.busy === 0) tlsSocket.destroy();
      }, timings.headersMs)
    );
  };

  // -------------------------------------------------------------------------
  // Steps 0 to 2: the connection, its PROXY header, the limiter
  // -------------------------------------------------------------------------

  const onConnection = (socket: Socket): void => {
    counts.connections += 1;
    raw.add(socket);
    beforeTls.add(socket);
    socket.on('close', () => {
      raw.delete(socket);
      beforeTls.delete(socket);
    });
    // An error on a socket is that socket's and never a throw in this process.
    socket.on('error', () => undefined);
    if (shuttingDown || tlsServer === null) {
      refuseSocket(socket, 'shutdown');
      return;
    }
    let buffered = Buffer.alloc(0);
    const timer = unrefTimer(
      setTimeout(() => {
        socket.off('data', onData);
        refuseSocket(socket, 'proxy');
      }, timings.proxyHeaderMs)
    );
    socket.once('close', () => clearTimeout(timer));
    const onData = (chunk: Buffer): void => {
      buffered = Buffer.concat([buffered, chunk]);
      // `readProxyV2` answers `more` only while fewer than PROXY_V2_MAX_BYTES
      // have arrived (`./proxy-v2.ts`), so this buffer is bounded by the header's own length.
      const read = readProxyV2(buffered);
      if (read.kind === 'more') return;
      socket.off('data', onData);
      socket.pause();
      clearTimeout(timer);
      if (read.kind === 'refused') {
        refuseSocket(socket, 'proxy');
        return;
      }
      if (shuttingDown) {
        refuseSocket(socket, 'shutdown');
        return;
      }
      const release = limiter.admit(read.header);
      if (release === null) {
        refuseSocket(socket, 'source-cap');
        return;
      }
      socket.once('close', release);
      // THE BYTES THE HEADER READ ALREADY BUFFERED (the ClientHello, usually,
      // in the same segment) go back in front of the stream before TLS takes
      // it, or the handshake would wait for a hello it was never shown.
      if (read.rest.length > 0) {
        counts.handedBuffered += 1;
        socket.unshift(read.rest);
      }
      beforeTls.delete(socket);
      counts.handedToTls += 1;
      tlsServer?.emit('connection', socket);
    };
    socket.on('data', onData);
  };

  // -------------------------------------------------------------------------
  // Step 4: the pin, and the one hand-over to HTTP
  // -------------------------------------------------------------------------

  const onSecureConnection = (tlsSocket: TLSSocket): void => {
    counts.handshakes += 1;
    tlsSocket.on('error', () => undefined);
    if (shuttingDown) {
      refuseSocket(tlsSocket, 'shutdown');
      return;
    }
    if (tlsSocket.servername !== host.name) {
      refuseSocket(tlsSocket, 'server-name');
      return;
    }
    const spki = spkiPinOfPeer(tlsSocket);
    let channel: string | null;
    if (spki !== null) {
      const phoneId = pins.get(spki);
      if (phoneId === undefined) {
        refuseSocket(tlsSocket, 'unknown-key');
        return;
      }
      channel = phoneId;
    } else {
      if (!windowOpen) {
        refuseSocket(tlsSocket, 'no-certificate');
        return;
      }
      channel = null;
    }
    const state: Admitted = { channel, spki, busy: 0, wait: null, revoked: false, writes: 0 };
    admitted.set(tlsSocket, state);
    tlsSocket.once('close', () => {
      if (state.wait !== null) clearTimeout(state.wait);
      admitted.delete(tlsSocket);
    });
    waitFor(tlsSocket, state);
    // THE ONLY HAND-OVER TO THE HTTP PARSER, and it is after the pin.
    httpServer?.emit('connection', tlsSocket);
  };

  // -------------------------------------------------------------------------
  // Step 5: HTTP, refusals 1 to 5
  // -------------------------------------------------------------------------

  const handleRequest = async (
    req: IncomingMessage,
    res: ServerResponse,
    mark: { forwardedWrite: boolean }
  ): Promise<void> => {
    const tlsSocket = req.socket as TLSSocket;
    const state = admitted.get(tlsSocket);
    if (state === undefined) {
      tlsSocket.destroy();
      return;
    }
    // A REVOKED SOCKET TAKES NO FURTHER REQUEST (Phase 317), asked before
    // anything of this one is read. It is cut now, or, while it is answering a
    // write main was handed, when that answer is out.
    if (cutIfRevoked(tlsSocket, state)) return;
    // REFUSAL 1. Admission closes on the first line of a shutdown.
    if (shuttingDown) return refuseRequest(res, 'shutdown');
    // REFUSAL 2. Before the path, before the query, before the body.
    if (req.headers.host !== `${host.name}:${String(host.port)}`) return refuseRequest(res, 'host');
    // REFUSAL 3. Equality against the closed table. A target that is not in
    // origin form (a path starting with one slash) names no route. `URL` splits
    // the path from the query and does nothing else.
    const raw = req.url ?? '';
    if (!raw.startsWith('/') || raw.startsWith('//')) return refuseRequest(res, 'route');
    const url = new URL(raw, `https://${host.name}`);
    const route = matchPocketRoute(req.method ?? '', url.pathname);
    if (route === null) return refuseRequest(res, 'route');
    // A WRITE TAKES NO QUERY STRING (Phase 317): its target is its path,
    // exactly, and everything it says is in its signed body. `?` alone counts,
    // because `URL` reads `/v1/end?` as a path with an empty search.
    if (!route.reads && (url.search !== '' || raw.includes('?'))) return refuseRequest(res, 'route');
    // REFUSAL 4. `/pair` is dead outside a window a person opened, and a
    // connection that presented no certificate reaches `/pair` and nothing else.
    if (route.windowOnly && !windowOpen) return refuseRequest(res, 'window');
    if (state.channel === null && route.id !== 'pair') return refuseRequest(res, 'route');
    // REFUSAL 5. Capped and dropped WHOLE, inside the request's own bound.
    const requestTimer = unrefTimer(setTimeout(() => tlsSocket.destroy(), timings.requestMs));
    const body = await readCapped(req, bodyCapOf(route));
    clearTimeout(requestTimer);
    if (body === null) return refuseRequest(res, 'oversized');
    if (shuttingDown) return refuseRequest(res, 'shutdown');
    // Revoked while its body was read: nothing of it is forwarded.
    if (cutIfRevoked(tlsSocket, state)) return;

    let request: DoorRequest;
    if (route.id === 'pair') {
      const presentation = presentationOfBody(body);
      if (presentation === null) return refuseRequest(res, 'malformed');
      request = { route: 'pair', presentation };
    } else {
      // A write's target is its path alone; a read's carries its query.
      const target = route.reads ? `${url.pathname}${url.search}` : url.pathname;
      const headers = signatureHeadersOf(req.headers);
      if (target.length > DOOR_TARGET_MAX_CHARS || headers === null || state.channel === null) {
        return refuseRequest(res, 'malformed');
      }
      request = route.reads
        ? {
            route: route.id as Exclude<typeof route.id, 'pair' | DoorWriteRoute>,
            method: 'GET',
            target,
            headers,
            body: new Uint8Array(body),
            channel: state.channel
          }
        : {
            route: route.id as DoorWriteRoute,
            method: 'POST',
            target,
            headers,
            body: new Uint8Array(body),
            channel: state.channel
          };
    }

    // STEP 6. Forward, and wait for main's answer, bounded.
    sequence += 1;
    const id = sequence;
    const write = !route.reads;
    const timer = unrefTimer(
      setTimeout(() => {
        pending.delete(id);
        if (write) {
          // NEVER 404 AFTER A WRITE WAS FORWARDED (Phase 317): main may be
          // acting on it, so the connection is cut and the phone reads "no
          // answer", which is true.
          counts.writesCut += 1;
          tlsSocket.destroy();
          return;
        }
        sendPocket(res, 404, null);
      }, timings.answerMs)
    );
    pending.set(id, { res, timer });
    if (write) {
      // Counted until its response is out or its connection closes, so a
      // revoke lets this answer leave whole and then cuts the socket.
      mark.forwardedWrite = true;
      state.writes += 1;
      let counted = true;
      const settle = (finished: boolean): void => {
        if (!counted) return;
        counted = false;
        state.writes -= 1;
        if (!state.revoked || state.writes > 0) return;
        // The answer is out: the socket is cut once its bytes are flushed.
        if (finished) tlsSocket.destroySoon();
        else tlsSocket.destroy();
      };
      res.once('finish', () => settle(true));
      res.once('close', () => settle(false));
    }
    counts.forwarded += 1;
    send({ kind: 'request', id, generation, request });
  };

  const onRequest = (req: IncomingMessage, res: ServerResponse): void => {
    counts.parserRequests += 1;
    const tlsSocket = req.socket as TLSSocket;
    const state = admitted.get(tlsSocket);
    if (state !== undefined) {
      state.busy += 1;
      if (state.wait !== null) {
        clearTimeout(state.wait);
        state.wait = null;
      }
    }
    req.on('error', () => undefined);
    const done = new Promise<void>((resolve) => {
      res.once('close', () => {
        if (state !== undefined) {
          state.busy -= 1;
          if (state.busy === 0 && !tlsSocket.destroyed) waitFor(tlsSocket, state);
        }
        resolve();
      });
    });
    inFlight.add(done);
    void done.finally(() => inFlight.delete(done));
    const mark = { forwardedWrite: false };
    void handleRequest(req, res, mark).catch(() => {
      // A write main was handed is never answered 404 here either (Phase 317).
      if (mark.forwardedWrite) tlsSocket.destroy();
      else sendPocket(res, 404, null);
    });
  };

  // -------------------------------------------------------------------------
  // Main's messages
  // -------------------------------------------------------------------------

  const start = (tls: { key: string; cert: string }): void => {
    const tlsSrv = createTlsServer({
      key: tls.key,
      cert: tls.cert,
      minVersion: 'TLSv1.3',
      requestCert: true,
      // THE PIN IS THE VERIFICATION. See the header: there is no authority to
      // chain a phone's certificate to, and step 4 destroys every socket whose
      // key is not pinned before HTTP is handed it.
      rejectUnauthorized: false,
      handshakeTimeout: timings.handshakeMs
    });
    tlsSrv.on('secureConnection', onSecureConnection);
    tlsSrv.on('tlsClientError', (_err: Error, tlsSocket: TLSSocket) => {
      refuseSocket(tlsSocket, 'handshake');
    });
    const http = createHttpServer({ maxHeaderSize: DOOR_MAX_HEADER_BYTES }, onRequest);
    http.keepAliveTimeout = timings.keepAliveMs;
    http.on('connection', () => {
      counts.parserSockets += 1;
    });
    http.on('clientError', (_err: Error, socket: Socket) => {
      refuseSocket(socket, 'malformed');
    });
    const server = createNetServer(onConnection);
    server.maxConnections = MAX_CONNECTIONS;
    server.on('drop', () => noteRefusal('capacity'));
    tlsServer = tlsSrv;
    httpServer = http;
    netServer = server;
    let bound = false;
    server.once('error', () => {
      if (!bound) send({ kind: 'refused', reason: 'bind-failed' });
    });
    // THE ONE LISTEN IN THE DOMAIN. Loopback, and an ephemeral port: the phone
    // is told the public port, and only the Funnel child is told this one.
    server.listen(0, '127.0.0.1', () => {
      bound = true;
      server.on('error', () => undefined);
      const address = server.address();
      const localPort = typeof address === 'object' && address !== null ? address.port : 0;
      send({ kind: 'listening', localPort });
    });
  };

  const applyPins = (next: readonly DoorPin[]): void => {
    pins = new Map(next.map((p) => [p.spkiSha256, p.phoneId]));
    // A socket whose key is no longer pinned, or whose key now names another
    // phone, is cut at once: Remove means now, not at the next request. THE
    // ONE EXCEPTION (Phase 317): a socket answering a write main was already
    // handed is marked revoked and cut when that answer is out, because an
    // answer cut after main acted would tell the phone nothing happened.
    for (const [tlsSocket, state] of admitted) {
      if (state.spki === null) continue;
      if (pins.get(state.spki) === state.channel) continue;
      state.revoked = true;
      if (state.writes === 0) tlsSocket.destroy();
    }
  };

  const applyWindow = (open: boolean): void => {
    windowOpen = open;
    if (open) return;
    for (const [tlsSocket, state] of admitted) {
      if (state.spki === null) tlsSocket.destroy();
    }
  };

  const destroyEverything = (): void => {
    for (const [, entry] of pending) clearTimeout(entry.timer);
    pending.clear();
    for (const tlsSocket of admitted.keys()) tlsSocket.destroy();
    for (const socket of raw) socket.destroy();
  };

  const stop = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    shuttingDown = true;
    const startedAt = Date.now();
    const accepted = inFlight.size;
    const closed = new Promise<void>((resolve) => {
      if (netServer === null) {
        resolve();
        return;
      }
      netServer.close(() => resolve());
    });
    // Nothing waiting on an answer is worth keeping open: idle sockets, and
    // sockets still reading their PROXY header, go now. A handshake in flight
    // meets `shuttingDown` at its `secureConnection`, and anything left is cut
    // when the join below ends.
    for (const [tlsSocket, state] of admitted) if (state.busy === 0) tlsSocket.destroy();
    for (const socket of beforeTls) socket.destroy();
    const joined = await settleWithin(Promise.all([...inFlight]), timings.stopJoinMs);
    destroyEverything();
    await settleWithin(closed, timings.stopCloseMs);
    send({ kind: 'stopped', accepted, joined, waitedMs: Date.now() - startedAt });
  };

  const receive = (value: unknown): void => {
    if (dead) return;
    const message = toDoorOf(value);
    if (message === null) {
      counts.droppedMessages += 1;
      return;
    }
    switch (message.kind) {
      case 'start': {
        // A door process starts once. A second start is somebody else's.
        if (started) {
          counts.droppedMessages += 1;
          return;
        }
        started = true;
        generation = message.generation;
        host = { name: message.host.name, port: message.host.port };
        windowOpen = message.windowOpen;
        pins = new Map(message.pins.map((p) => [p.spkiSha256, p.phoneId]));
        start(message.tls);
        return;
      }
      case 'update':
        if (message.pins !== undefined) applyPins(message.pins);
        if (message.windowOpen !== undefined) applyWindow(message.windowOpen);
        return;
      case 'answer': {
        const entry = pending.get(message.id);
        if (entry === undefined) return;
        pending.delete(message.id);
        clearTimeout(entry.timer);
        sendPocket(entry.res, message.status, message.body);
        return;
      }
      case 'shutdown':
        shuttingDown = true;
        return;
      case 'stop':
        void stop();
        return;
    }
  };

  const kill = (): void => {
    if (dead) return;
    dead = true;
    shuttingDown = true;
    destroyEverything();
    netServer?.close();
  };

  const stats = (): DoorListenerStats => ({
    connections: counts.connections,
    refused: { ...refused },
    handedToTls: counts.handedToTls,
    handedBuffered: counts.handedBuffered,
    handshakes: counts.handshakes,
    parserSockets: counts.parserSockets,
    parserRequests: counts.parserRequests,
    forwarded: counts.forwarded,
    writesCut: counts.writesCut,
    open: admitted.size,
    droppedMessages: counts.droppedMessages
  });

  return { receive, kill, stats };
}
