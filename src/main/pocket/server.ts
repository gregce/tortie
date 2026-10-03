/**
 * What a request is ALLOWED to be, on main's side of the door (Phase 313;
 * split across two processes by Phase 330, build/p330/SPEC.md §4.6).
 *
 * ## The split, and why there are still not two doors
 *
 * Since Phase 330 the listener runs in its own process (`./door-process.ts`,
 * over `./door/listener.ts`), because Tailscale Funnel publishes it to the
 * internet and a stranger's bytes must be parsed by a process that holds no
 * credential (research 132 §7.1). That process makes refusals 1 to 5 — the
 * shutdown, the `Host`, the closed table, the window, the body cap — and
 * parses `/pair`'s outer JSON, so nothing reaches main that is not a typed,
 * bounded request (`./door/wire.ts`). This module is main's handler of those
 * requests, and it owns what only main can know: whether the quit has begun,
 * whether the signature holds, and whether the answer it composed may still
 * leave.
 *
 * ## The refusals main makes, in order
 *
 * 1. **The shutdown has begun**, asked AGAIN here because admission closes in
 *    main first and the door process is told a turn later.
 * 4. **`/pair` with no window**, asked again for the same reason: a window
 *    that shut in main while the door process still thought it open.
 * 6. **The signature does not hold**, for every reason `./pairing.ts` names:
 *    missing headers, an unknown phone, a phone whose client key did not
 *    complete THIS connection's handshake (`channel`), a clock outside the
 *    window, a nonce already spent, a signature that does not verify.
 * 7. **The answer is admitted AGAIN before it leaves** (the Phase 316.1 fix
 *    round). Composing an answer awaits the refresh, and a person can press
 *    Remove, or switch the door off, inside that await. So after the answer is
 *    composed the handler asks three things once more, with nothing awaited
 *    between the asking and the return: has the quit begun, is the phone this
 *    request was VERIFIED for still paired (`unpaired` if not), and has the
 *    door instance that ACCEPTED the request begun to stop. The last is asked
 *    of the door `./bind.ts` hands the handler, by generation, never of the
 *    module's current door; `./bind.ts` asks it once more before the post.
 *
 * EVERY REFUSAL ANSWERS THE SAME THING: 404 and no body. The reason is a WORD
 * in a bounded log and never on the wire, because a door that explains why it
 * refused helps somebody work out what it would accept. One line per reason per
 * process.
 *
 * ## The one write (Phase 317, build/p317/SPEC.md §5.3.4)
 *
 * A signed `POST /v1/end` takes refusals 1 and 6 here
 * exactly as a read does (the signature covers `POST`, the path and the body's
 * bytes), and then goes to the ONE write path, `./writes.ts`, which the host
 * hands in. Refusal 7 is NOT asked again of a write's answer here: the write
 * path makes its own last check before the act, with nothing awaited between
 * the two, and after the act NOTHING replaces the answer, because a 404 tells
 * the phone nothing was done. A host with no write path refuses every write
 * `route`, as it refuses a route it does not have.
 *
 * ## What this module does not do
 *
 * It binds nothing, parses no stranger's bytes and holds no key. It spawns
 * nothing, reads no credential and sets no status. It never logs a header
 * value, a query value, a body or a line of anybody's conversation.
 */

import { getLog } from '../log';
import type { DoorAdmission, DoorAnswer, DoorRequestHandler } from './bind';
import type { DoorPresentation, DoorSignatureHeaders } from './door/wire';
import { POCKET_ROUTES, type PocketRoute } from './door/table';
import type { PocketPairAnswer, PocketRefusalReason } from './pairing';
import type { PocketWriteHandler } from './writes';

export { POCKET_READ_BODY_CAP_BYTES } from './door/wire';

const pocketLog = getLog('pocket');

/** What the handler asks of everything around it. Every member is a read. */
export interface PocketHandlerDeps {
  /** True from the first line of the quit's admission close. */
  shuttingDown(): boolean;
  /** True only inside a pairing window a person opened. */
  pairingWindowOpen(): boolean;
  /** Hand a presentation to the pairing owner. Answers its state. */
  present(presentation: DoorPresentation): PocketPairAnswer;
  /**
   * Does this signed request come from an allowed phone, over that phone's own
   * connection, right now, once? The answer names the phone it verified, so
   * the handler can ask again after the answer is composed.
   */
  verify(input: {
    method: string;
    target: string;
    body: Buffer;
    channel: string | null;
    headers: DoorSignatureHeaders;
  }): { ok: true; phoneId: string } | { ok: false; reason: PocketRefusalReason };
  /**
   * Is this phone still one the person allowed? Asked AFTER the answer is
   * composed (refusal 7), so a Remove that landed while the request was in
   * flight refuses it `unpaired`.
   */
  stillPaired(phoneId: string): boolean;
  /** Answer one of the three reads. Null means there is nothing to answer. */
  answer(route: PocketRoute, query: URLSearchParams): Promise<unknown | null>;
  /**
   * THE ONE WRITE PATH (Phase 317): `./writes.ts`'s handler, handed a write
   * whose signature held, with the phone it was verified for and the door that
   * accepted it. Absent: every write is refused `route`.
   */
  write?: PocketWriteHandler;
}

/** The query of a target the door process already bounded, as parameters. */
function queryOf(target: string): URLSearchParams {
  const at = target.indexOf('?');
  return new URLSearchParams(at === -1 ? '' : target.slice(at + 1));
}

/** The route a request names, from the one closed table. */
function routeNamed(id: string): PocketRoute | null {
  return POCKET_ROUTES.find((r) => r.id === id) ?? null;
}

/**
 * `/pair`'s answer, composed field by field so nothing but the state, the
 * certificate on `allowed` alone, and on `pending` alone the one word that this
 * Mac can send an alert (Phase 316.5, research 136), can ever leave
 * (`conformance:pocket` N3). The word is the literal `true` or it is absent, so
 * a Mac that cannot send answers the bytes it answered before.
 */
function pairBody(answer: PocketPairAnswer): string {
  if (answer.state === 'allowed') return JSON.stringify({ state: 'allowed', cert: answer.cert });
  if (answer.state === 'pending') {
    return answer.alerts === true
      ? JSON.stringify({ state: 'pending', alerts: true })
      : JSON.stringify({ state: 'pending' });
  }
  return JSON.stringify({ state: 'refused' });
}

/**
 * The handler `./bind.ts` is started with.
 *
 * It owns its own bounded refusal log, so one process has one line per reason
 * however many times a door is opened and closed.
 */
export function createPocketHandler(deps: PocketHandlerDeps): DoorRequestHandler {
  /** One line per reason per process. A WORD, and never a value. */
  const logged = new Set<string>();
  const refuse = (reason: PocketRefusalReason): DoorAnswer => {
    if (!logged.has(reason)) {
      logged.add(reason);
      pocketLog.warn(`refused a request at the door: ${reason}`);
    }
    return { status: 404, body: null };
  };

  return async function handle(request, door: DoorAdmission): Promise<DoorAnswer> {
    // REFUSAL 1, asked of the quit AND of the door that accepted this request.
    const closing = (): boolean => deps.shuttingDown() || door.stopping();
    if (closing()) return refuse('shutdown');

    if (request.route === 'pair') {
      // REFUSAL 4, again: main's window is the one a person opened.
      if (!deps.pairingWindowOpen()) return refuse('window');
      // Presenting never reaches the route composer. It answers a state, a
      // certificate only when allowed, and on pending alone whether this Mac
      // can send an alert (Phase 316.5, research 136), which the host decides
      // from the switch, the agreement and the key's cached id, never the key.
      const answer = deps.present(request.presentation);
      if (closing()) return refuse('shutdown');
      return { status: 200, body: pairBody(answer) };
    }

    const route = routeNamed(request.route);
    if (route === null || !route.signed) return refuse('route');

    // REFUSAL 6.
    const verdict = deps.verify({
      method: request.method,
      target: request.target,
      body: Buffer.from(request.body),
      channel: request.channel,
      headers: request.headers
    });
    if (!verdict.ok) return refuse(verdict.reason);
    /** The phone this request was verified for, asked about again at refusal 7. */
    const verifiedPhone = verdict.phoneId;

    if (!route.reads) {
      // A WRITE goes to the one write path and its answer leaves as it is: the
      // path made its own last check, and an answer it marked `acted` is never
      // replaced. A 404 from it is a refusal before any act, and its word is
      // asked in the last check's own order, for the log alone.
      if (deps.write === undefined) return refuse('route');
      const answer = await deps.write(route, Buffer.from(request.body), verifiedPhone, door);
      if (answer.status !== 404) return answer;
      if (closing()) return refuse('shutdown');
      return refuse(deps.stillPaired(verifiedPhone) ? 'route' : 'unpaired');
    }

    const body = await deps.answer(route, queryOf(request.target));
    // REFUSAL 7. Nothing is awaited from here to the return, so the answer that
    // leaves is one the person had not withdrawn by the time it left. The phone
    // is asked before the door, so a Remove — which also stops the door — is
    // refused for the reason that is true of it.
    if (deps.shuttingDown()) return refuse('shutdown');
    if (!deps.stillPaired(verifiedPhone)) return refuse('unpaired');
    if (closing()) return refuse('shutdown');
    if (body === null) return refuse('route');
    return { status: 200, body: JSON.stringify(body) };
  };
}
