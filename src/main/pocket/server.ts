/**
 * What a request is ALLOWED to be, and the one place a byte leaves this door
 * (Phase 313).
 *
 * ## The split, and why there are not two doors
 *
 * `./bind.ts` owns the LISTENER: where it binds, the certificate it presents,
 * the connection caps, the shutdown, and the refusal of a socket whose source
 * is the address the door answers on. It takes the request handler as an
 * argument, so the listener imports no route and knows nothing about what it is
 * answering.
 *
 * This module is that handler. It owns the question "may this request be
 * answered at all", and it answers it in a fixed order, cheapest first. The
 * division is deliberate: the listener is about sockets and the handler is
 * about requests, and neither spells the other's rules.
 *
 * ## The refusals, in the order they are made
 *
 * 0. **The source address equals the address this door answers on.** NOT HERE.
 *    `./bind.ts` destroys that socket on the `connection` event, before the TLS
 *    handshake and therefore before any header exists at all — which is earlier
 *    than research 127 section 10 asked for. It is not repeated here, because a
 *    second copy under the harness loopback bind would refuse every request the
 *    probe makes and the two answers would have to be kept in step forever.
 * 1. **The shutdown has begun.** Admission closes synchronously, so nothing
 *    accepted afterwards can reach main's state.
 * 2. **The `Host` header is not this door.** `../activity/hooks.ts`'s own
 *    check, made before anything else is read off the request.
 * 3. **The method and path are not in the closed table.** Equality on both. No
 *    default, no wildcard, no prefix, no trailing-slash forgiveness.
 * 4. **The route is the pairing route and no window is open.** `/pair` is dead
 *    outside a window a person opened, which is almost all of the door's life.
 * 5. **The body is over the cap.** Dropped WHOLE, never truncated and parsed,
 *    because half a body that parses is a body somebody else chose the shape
 *    of.
 * 6. **The signature does not hold**, for every reason `./pairing.ts` names:
 *    missing headers, an unknown phone, an address that is not the paired one,
 *    a clock outside the window, a nonce already spent, a signature that does
 *    not verify.
 * 7. **The answer is admitted AGAIN before a byte of it leaves** (the Phase
 *    316.1 fix round). Composing an answer awaits the refresh, and a person can
 *    press Remove, or switch the door off, inside that await. So after the
 *    answer is composed the handler asks three things once more, with nothing
 *    awaited between the asking and the send: has the quit begun, is the phone
 *    this request was VERIFIED for still paired (`unpaired` if not), and has
 *    the door instance that ACCEPTED the request begun to stop. The last one is
 *    asked of the instance `./bind.ts` hands the handler, never of the module's
 *    current door, because a stop drops the module's door before it joins the
 *    handlers it accepted. Before this, a phone removed while its request was
 *    in flight was still answered, from the store as it stood AFTER the press.
 *
 * EVERY REFUSAL ANSWERS THE SAME THING: 404, an empty body, and the same
 * headers. The reason is a WORD in a bounded log and never on the wire, because
 * a door that explains why it refused helps somebody work out what it would
 * accept. The log is bounded for `../activity/hooks.ts`'s measured reason: 500
 * anonymous posts wrote 500 log lines in 47 ms, `app.log` is capped at 2 MiB
 * with one archive, and the bound exists to stop diagnostic ERASURE rather than
 * disk fill. One line per reason per process, and there are twelve reasons.
 *
 * ## No bearer token, and one place emits `Referrer-Policy`
 *
 * Nothing this door accepts is a reusable secret and nothing it needs is in a
 * URL. {@link sendPocket} is the ONE function that writes a status, a header or
 * a byte of body, so `Referrer-Policy: no-referrer` is on every answer and
 * every refusal. A URL-borne secret leaks by `Referer` the first time a client
 * follows an outbound link, and a signature that has been sent somewhere else
 * cannot be taken back. There is nothing left in a URL to leak after this, so
 * the header is belt and braces rather than the mechanism.
 *
 * ## What this module does not do
 *
 * It binds nothing and holds no key. It spawns nothing, reads no credential and
 * sets no status. It never logs a header value, a query value, a body or a line
 * of anybody's conversation.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { getLog } from '../log';
import type { DoorAdmission } from './bind';
import {
  POCKET_PAIR_BODY_CAP_BYTES,
  type PocketPairAnswer,
  type PocketRefusalReason
} from './pairing';
import { matchPocketRoute, type PocketRoute } from './routes';

const pocketLog = getLog('pocket');

/** A signed read carries no body worth the name. Over this is dropped whole. */
export const POCKET_READ_BODY_CAP_BYTES = 1024;

/** What the handler asks of everything around it. Every member is a read. */
export interface PocketHandlerDeps {
  /** The address `./bind.ts` actually bound, for the `Host` check. */
  boundAddress(): string | null;
  /** The port it actually bound. */
  boundPort(): number;
  /** True from the first line of the quit's admission close. */
  shuttingDown(): boolean;
  /** True only inside a pairing window a person opened. */
  pairingWindowOpen(): boolean;
  /** Hand a sealed presentation to the pairing owner. Answers one word. */
  present(body: Buffer, from: string): PocketPairAnswer;
  /**
   * Does this signed request come from an allowed phone, right now, once? The
   * answer names the phone it verified, so the handler can ask again after the
   * answer is composed.
   */
  verify(input: {
    method: string;
    target: string;
    body: Buffer;
    from: string;
    headers: Readonly<Record<string, string | string[] | undefined>>;
  }): { ok: true; phoneId: string } | { ok: false; reason: PocketRefusalReason };
  /**
   * Is this phone still one the person allowed? Asked AFTER the answer is
   * composed and before it is sent (refusal 7), so a Remove that landed while
   * the request was in flight refuses it `unpaired`.
   */
  stillPaired(phoneId: string): boolean;
  /** Answer one of the three reads. Null means there is nothing to answer. */
  answer(route: PocketRoute, query: URLSearchParams): Promise<unknown | null>;
}

/**
 * Normalise a socket address.
 *
 * Node reports an IPv4 peer on a dual-stack socket as `::ffff:100.64.0.1`, and
 * the address recorded when a phone paired is the plain form. This is the
 * handler's spelling, used for the ONE question "which phone is this"; the
 * listener's `isSelfOrigin` in `./bind.ts` answers the different question "is
 * this socket this machine" and owns its own reading of the same shape.
 */
export function normalisePocketAddress(address: string | undefined): string {
  if (address === undefined) return '';
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

/**
 * The ONE place a response leaves this door.
 *
 * Every answer and every refusal goes through it, so the headers below are on
 * every byte the door ever sends. `Referrer-Policy` in particular is emitted
 * here and nowhere else in the module.
 */
export function sendPocket(
  res: ServerResponse,
  status: number,
  body: string | null
): void {
  res.statusCode = status;
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (body === null) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(body);
}

/**
 * The handler `./bind.ts` is started with.
 *
 * It owns its own bounded refusal log, so one process has one line per reason
 * however many times a door is opened and closed.
 */
export function createPocketHandler(
  deps: PocketHandlerDeps
): (req: IncomingMessage, res: ServerResponse, door?: DoorAdmission) => Promise<void> {
  /** One line per reason per process. A WORD, and never a value. */
  const logged = new Set<string>();
  const refuse = (res: ServerResponse, reason: PocketRefusalReason): void => {
    if (!logged.has(reason)) {
      logged.add(reason);
      pocketLog.warn(`refused a request on the tailnet door: ${reason}`);
    }
    sendPocket(res, 404, null);
  };

  return async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    door?: DoorAdmission
  ): Promise<void> {
    // REFUSAL 1, asked of the quit AND of the door that accepted this request.
    // `door` is `./bind.ts`'s; a handler driven without a listener (the unit
    // tests' plain http server) has none, and the quit is then the only stop.
    const closing = (): boolean => deps.shuttingDown() || door?.stopping() === true;
    if (closing()) return refuse(res, 'shutdown');
    const address = deps.boundAddress();
    if (address === null) return refuse(res, 'shutdown');
    const from = normalisePocketAddress(req.socket.remoteAddress);

    // REFUSAL 2. Before the path, before the query, before the body.
    const host = req.headers.host ?? '';
    const expected = `${address}:${String(deps.boundPort())}`;
    if (host !== expected && host !== address) return refuse(res, 'host');

    // REFUSAL 3. Equality against the closed table. `URL` is used to split the
    // path from the query and for nothing else: what it yields is compared,
    // never rewritten and never resolved against anything.
    const url = new URL(req.url ?? '/', `https://${address}`);
    const route = matchPocketRoute(req.method ?? '', url.pathname);
    if (route === null) return refuse(res, 'route');

    // REFUSAL 4. `/pair` is dead outside a window a person opened.
    if (route.windowOnly && !deps.pairingWindowOpen()) {
      return refuse(res, 'window');
    }

    // REFUSAL 5. Capped and dropped WHOLE.
    const cap = route.signed
      ? POCKET_READ_BODY_CAP_BYTES
      : POCKET_PAIR_BODY_CAP_BYTES;
    const read = await readBody(req, cap);
    if (read === null) return refuse(res, 'oversized');

    // Admission again, because the body read above is an await: a request that
    // passed every check before the quit began reaches this line afterwards,
    // and composing an answer here would read main's state during its own
    // disposal.
    if (closing()) return refuse(res, 'shutdown');

    /** The phone this request was verified for, asked about again at refusal 7. */
    let verifiedPhone: string | null = null;
    if (route.signed) {
      // REFUSAL 6.
      const verdict = deps.verify({
        method: req.method ?? '',
        target: `${url.pathname}${url.search}`,
        body: read,
        from,
        headers: req.headers
      });
      if (!verdict.ok) return refuse(res, verdict.reason);
      verifiedPhone = verdict.phoneId;
    }

    if (route.id === 'pair') {
      // Presenting reads nothing of main's state and never reaches the route
      // composer. It answers ONE WORD and nothing else, ever.
      const answer = deps.present(read, from);
      sendPocket(res, 200, JSON.stringify({ state: answer }));
      return;
    }

    const body = await deps.answer(route, url.searchParams);
    // REFUSAL 7. Nothing is awaited from here to the send, so the answer that
    // leaves is one the person had not withdrawn by the time it left. The phone
    // is asked before the door, so a Remove — which also stops the door — is
    // refused for the reason that is true of it.
    if (deps.shuttingDown()) return refuse(res, 'shutdown');
    if (verifiedPhone !== null && !deps.stillPaired(verifiedPhone)) {
      return refuse(res, 'unpaired');
    }
    if (closing()) return refuse(res, 'shutdown');
    if (body === null) return refuse(res, 'route');
    sendPocket(res, 200, JSON.stringify(body));
  };
}

/**
 * Read at most `cap` bytes. Null when there were more, and in that case the
 * bytes already read are dropped rather than returned.
 */
function readBody(req: IncomingMessage, cap: number): Promise<Buffer | null> {
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
  });
}
