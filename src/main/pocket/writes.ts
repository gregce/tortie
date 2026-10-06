/**
 * THE ONE WRITE PATH (Phase 317, build/p317/SPEC.md §5.3.4; widened by Phase
 * 318, build/p318/SPEC.md §5.1.4, and by Phase 337, build/p337/SPEC.md §5.5):
 * what main does with a signed `POST /v1/end`, `/v1/choose`, `/v1/say` or
 * `/v1/keys` once `./server.ts` has made refusals 1 and 6 (the quit, the door
 * stopping, and the signature over `POST`, the path and these exact body
 * bytes). Four verbs, ONE path, ONE ledger: there is no second gate.
 *
 * ## The order, held as code (research 135 §4.11, D3)
 *
 * Every step is named below by its number, in this order and no other:
 *
 *  1. **The strict parse**, by the route's verb (`parseEndBody`,
 *     `parseChooseBody`, `parseSayBody`, and since Phase 337
 *     `parseKeysBody`). The one place a write body is read.
 *     One `JSON.parse` inside a `try`; the keys compared exactly; the write id,
 *     the session id, the question id, the mark and the marker read one
 *     character at a time (`conformance:pocket` R1 refuses a pattern in this
 *     domain). A message's text is any string here: its rules are the verb's,
 *     each with its own sentence. A body that does not parse is a 200
 *     `refused` `malformed`, echoing its write id when it yields a well-formed
 *     one (§14 finding 14), and the ledger records nothing for it.
 *  2. **The ledger** (D5), keyed on the phone, THE VERB (Phase 318, D4) and the
 *     write id. A write id this phone already sent for this verb answers what
 *     it answered then, carrying its recorded `acted`, and acts on nothing; one
 *     still in flight answers `busy` marked `acted`, because the write it
 *     duplicates may be acting now (§14 finding 9); a full ledger answers
 *     `busy`, unmarked, and never evicts a live entry.
 *  3. **One in flight**, per phone and per session, ACROSS VERBS, so an End
 *     and a message can never overlap on one session. The claim and
 *     the ledger's PENDING entry are made here, at the claim, not after the
 *     gates as research 135 §4.11 step 8 has it (§3 row 18, §14 finding 16):
 *     two requests carrying one write id can be in flight at once, a replay
 *     under a fresh nonce, and recorded only at the act both would pass step
 *     2. The claim is released in a `finally`, and a pending entry that never
 *     acted is dropped there too, so a refusal at the last check leaves
 *     nothing behind.
 *  4. **The last check, then the act, with NOTHING between**: the quit, this
 *     door instance stopping, and the signing phone still paired. A 404 here
 *     is the door's refusal and nothing was done. For `choose` and `say`,
 *     which READ the session before they type, the same three asks are handed
 *     to the verb as `still` (Phase 318, D5), and the verb asks it AGAIN in its
 *     own final synchronous check immediately before the one keystroke or
 *     paste; a verb that finds it false answers `refused` `stopped`, 200, with
 *     nothing typed. Phase 337's `keys` reads before it types too, and is
 *     handed the same `still`.
 *  5. **The act**, wrapped so it cannot throw past this point (`endSettled`,
 *     `replySettled`). From here every answer is a 200 marked `acted`, which
 *     `./bind.ts` never replaces.
 *  6. **The outcome**, recorded in the ledger and answered.
 *  7. **One log line**: the verb and the outcome word, and the session id.
 *     Never the body, the write id, a header, a sentence, the question id, the
 *     mark, the marker, the text or a key. ONE EXCEPTION, BOUNDED (Phase 337,
 *     build/p337/SPEC.md D43): a `keys` write answered `done` is logged only
 *     when it is that session's first `done` keys write for
 *     {@link KEYS_LOG_QUIET_MS}, because a phone typing ten writes a second
 *     would otherwise rotate the diagnosis log out in about twenty minutes.
 *     Every other outcome of every verb is logged every time. The ledger, not
 *     the log, is the record of the writes.
 *
 * ## What this module never does
 *
 * It names no verb (`conformance:pocket` R3): `end`, `choose`, `say` and
 * `keys` reach main's own End, the reply's verbs and the Screen's keys verb
 * through the {@link PocketWrites} it is handed. It sets no status, types
 * nothing, reads no file and writes none: the ledger is memory, and a write is
 * never queued for later. (A fourth write,
 * `unpair`, was removed by Phase 317's fix round: the phone waited on it before
 * it could forget a Mac that did not answer, which made Unpair slower than
 * today. build/p317/SPEC.md "§Fix round".)
 */

import {
  POCKET_KEYS_MAX_ITEMS,
  POCKET_SCREEN_KEY_NAMES,
  POCKET_WRITE_ROUTE_IDS,
  POCKET_WRITE_SENTENCES,
  type PocketKeyItem,
  type PocketRouteId,
  type PocketWriteAnswer,
  type PocketWriteOutcome,
  type PocketWriteReason,
  type PocketWriteRouteId
} from '@shared/ipc/pocket';
import { END_FAILED } from '@shared/lifecycle-words';
import { REPLY_FAILED } from '@shared/reply-copy';
import { getLog } from '../log';
import type { DoorAdmission, DoorAnswer } from './bind';
import type { PocketRoute } from './door/table';
import { POCKET_CLOCK_SKEW_MS } from './pairing';
import type { PocketEndOutcome, PocketReplyOutcome, PocketStillAllowed, PocketWrites } from './routes';

const pocketLog = getLog('pocket');

/**
 * How long the ledger remembers a write id: twice the signature clock, the
 * constant imported and never re-spelled. A request outside the clock is
 * refused `stale` before it reaches here, so a write id older than this can
 * never come back with a signature that holds.
 */
export const POCKET_WRITE_LEDGER_MS = 2 * POCKET_CLOCK_SKEW_MS;
/**
 * The most write ids the ledger holds for one phone.
 *
 * 512 until Phase 337 (build/p337/SPEC.md D24): the phone's Screen sends a
 * keys write at most every 100 ms, which is at most 1,200 in one ledger life
 * ({@link POCKET_WRITE_LEDGER_MS}, 120 s), so a phone's own typing never fills
 * its share and is answered `busy`.
 */
export const POCKET_WRITE_LEDGER_PER_PHONE = 2_048;
/** The most write ids the ledger holds in all: four phones' worth (D24). */
export const POCKET_WRITE_LEDGER_MAX = 8_192;

/**
 * How long a session's `done` keys writes go unlogged after one is logged
 * (Phase 337, build/p337/SPEC.md D43): one line per session per quiet minute
 * of typing. A refusal, a failure, a `busy` and every other verb's outcome are
 * logged every time.
 */
export const KEYS_LOG_QUIET_MS = 60_000;

/** A write id: 32 lowercase hex, 128 bits. */
const WRITE_ID_CHARS = 32;
/** A session id: 1 to 128 of `[A-Za-z0-9._:-]`. */
const SESSION_ID_MAX = 128;

/** The end body's keys, sorted and joined. Nothing more and nothing less. */
const END_KEYS = 'batch,session,write';
/** The choose body's keys, sorted and joined (Phase 318, §5.1.2). */
const CHOOSE_KEYS = 'mark,marker,question,session,write';
/** The say body's keys, sorted and joined (Phase 318, §5.1.2). */
const SAY_KEYS = 'session,text,write';
/** The keys body's keys, sorted and joined (Phase 337, build/p337/SPEC.md D17, §5.5). */
const KEYS_KEYS = 'dialog,keys,session,turn,write';

/** A question id's random prefix: 16 lowercase hex (`src/main/reply/question-id.ts`). */
const QUESTION_PREFIX_CHARS = 16;
/** A question id's count: 1 to 16 decimal digits, `Number.MAX_SAFE_INTEGER` being 16. */
const QUESTION_COUNT_MAX_DIGITS = 16;
/** A mark: `hashScreen`'s 12 lowercase hex. */
const MARK_CHARS = 12;

/** What the write path asks of everything around it. */
export interface PocketWriteDeps {
  /** True from the first line of the quit's admission close. */
  shuttingDown(): boolean;
  /** Is this phone still one the person allowed? Asked last, before the act. */
  stillPaired(phoneId: string): boolean;
  /** Absent: every write is refused 404 `route` before anything (the push seam, tests). */
  writes?: PocketWrites;
  now?(): number;
}

/** The write path `./server.ts` hands a verified write to. */
export type PocketWriteHandler = (
  route: PocketRoute,
  body: Buffer,
  verifiedPhone: string,
  door: DoorAdmission
) => Promise<DoorAnswer>;

/** What a malformed body still let the answer echo: its write id, or `""`. */
export type PocketMalformedBody = { ok: false; write: string };

/** A parsed end body, or what a malformed one still let the answer echo. */
export type PocketEndBody =
  | { ok: true; verb: 'end'; write: string; session: string; batch: boolean }
  | PocketMalformedBody;

/** A parsed choose body (Phase 318), or what a malformed one still let the answer echo. */
export type PocketChooseBody =
  | { ok: true; verb: 'choose'; write: string; session: string; question: string; mark: string; marker: string }
  | PocketMalformedBody;

/** A parsed say body (Phase 318), or what a malformed one still let the answer echo. */
export type PocketSayBody =
  | { ok: true; verb: 'say'; write: string; session: string; text: string }
  | PocketMalformedBody;

/** A parsed keys body (Phase 337), or what a malformed one still let the answer echo. */
export type PocketKeysBody =
  | { ok: true; verb: 'keys'; write: string; session: string; keys: PocketKeyItem[]; turn: string; dialog: string | null }
  | PocketMalformedBody;

/** Any parsed write body. */
export type PocketWriteBody = PocketEndBody | PocketChooseBody | PocketSayBody | PocketKeysBody;

/** Exactly `chars` lowercase hex, read one character at a time. */
function isLowerHex(value: string, chars: number): boolean {
  if (value.length !== chars) return false;
  for (const ch of value) {
    const digit = ch >= '0' && ch <= '9';
    const lower = ch >= 'a' && ch <= 'f';
    if (!digit && !lower) return false;
  }
  return true;
}

/** 32 lowercase hex, read one character at a time. */
function isWriteId(value: unknown): value is string {
  return typeof value === 'string' && isLowerHex(value, WRITE_ID_CHARS);
}

/**
 * A question id's shape (Phase 318, §5.1.2, §5.3): 16 lowercase hex, `-`, then
 * 1 to 16 decimal digits with no leading zero but `0` itself. Read one
 * character at a time. The shape only: whether it names the question a session
 * holds now is the verb's to ask, by id.
 */
function isQuestionId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < QUESTION_PREFIX_CHARS + 2 || value.length > QUESTION_PREFIX_CHARS + 1 + QUESTION_COUNT_MAX_DIGITS) {
    return false;
  }
  if (!isLowerHex(value.substring(0, QUESTION_PREFIX_CHARS), QUESTION_PREFIX_CHARS)) return false;
  if (value.charAt(QUESTION_PREFIX_CHARS) !== '-') return false;
  const count = value.substring(QUESTION_PREFIX_CHARS + 1);
  for (const ch of count) {
    if (ch < '0' || ch > '9') return false;
  }
  return !(count.length > 1 && count.charAt(0) === '0');
}

/** A mark: exactly 12 lowercase hex, `hashScreen`'s shape. */
function isMark(value: unknown): value is string {
  return typeof value === 'string' && isLowerHex(value, MARK_CHARS);
}

/** A marker: exactly one character, `1` to `9`, the agent's own option number. */
function isMarker(value: unknown): value is string {
  return typeof value === 'string' && value.length === 1 && value >= '1' && value <= '9';
}

/** 1 to 128 of `[A-Za-z0-9._:-]`, read one character at a time. */
function isSessionId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > SESSION_ID_MAX) return false;
  for (const ch of value) {
    const letter = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
    const digit = ch >= '0' && ch <= '9';
    const mark = ch === '.' || ch === '_' || ch === ':' || ch === '-';
    if (!letter && !digit && !mark) return false;
  }
  return true;
}

/**
 * The body as a plain JSON object, or null. THE ONE `JSON.parse` OF A WRITE
 * BODY, inside a `try`, and only the parse function below calls it.
 */
function objectOf(body: Buffer): Record<string, unknown> | null {
  let value: unknown;
  try {
    value = JSON.parse(body.toString('utf8'));
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * The write id a body yields when it yields a well-formed one, else `""`. A
 * malformed body still echoes it (§14 finding 14), so the phone can tell the
 * Mac's "I could not read that" from an answer to some other write.
 */
function echoOf(value: Record<string, unknown> | null): string {
  if (value === null) return '';
  const write = value['write'];
  return isWriteId(write) ? write : '';
}

/** `{ session, write, batch }` exactly, or malformed. */
export function parseEndBody(body: Buffer): PocketEndBody {
  const value = objectOf(body);
  const write = echoOf(value);
  if (value === null || Object.keys(value).sort().join(',') !== END_KEYS) return { ok: false, write };
  const session = value['session'];
  const batch = value['batch'];
  if (write === '' || !isSessionId(session) || typeof batch !== 'boolean') return { ok: false, write };
  return { ok: true, verb: 'end', write, session, batch };
}

/** `{ mark, marker, question, session, write }` exactly, or malformed (Phase 318). */
export function parseChooseBody(body: Buffer): PocketChooseBody {
  const value = objectOf(body);
  const write = echoOf(value);
  if (value === null || Object.keys(value).sort().join(',') !== CHOOSE_KEYS) return { ok: false, write };
  const session = value['session'];
  const question = value['question'];
  const mark = value['mark'];
  const marker = value['marker'];
  if (write === '' || !isSessionId(session) || !isQuestionId(question) || !isMark(mark) || !isMarker(marker)) {
    return { ok: false, write };
  }
  return { ok: true, verb: 'choose', write, session, question, mark, marker };
}

/**
 * `{ session, text, write }` exactly, or malformed (Phase 318). The text is any
 * string, the empty one included: its rules (empty, too long, a character
 * Tortie does not send) are the verb's, each with its own sentence, and
 * nothing here strips, trims or normalizes it.
 */
export function parseSayBody(body: Buffer): PocketSayBody {
  const value = objectOf(body);
  const write = echoOf(value);
  if (value === null || Object.keys(value).sort().join(',') !== SAY_KEYS) return { ok: false, write };
  const session = value['session'];
  const text = value['text'];
  if (write === '' || !isSessionId(session) || typeof text !== 'string') return { ok: false, write };
  return { ok: true, verb: 'say', write, session, text };
}

/**
 * One key item, exactly `{ "t": <text> }` or `{ "k": <name> }` (Phase 337,
 * D17), or null. A plain object with exactly ONE own key; a text is a string
 * of one character or more, its rules (a control character, DEL, a lone
 * surrogate, the byte total) being the verb's, each with its sentence; a name
 * is compared with `===` against each of the contract's 35 and nothing else.
 * Nothing is trimmed or normalized.
 */
function keyItemOf(value: unknown): PocketKeyItem | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  const own = Object.keys(value);
  if (own.length !== 1) return null;
  const record = value as Record<string, unknown>;
  if (own[0] === 't') {
    const text = record['t'];
    return typeof text === 'string' && text.length > 0 ? { t: text } : null;
  }
  if (own[0] === 'k') {
    const name = record['k'];
    for (const known of POCKET_SCREEN_KEY_NAMES) {
      if (known === name) return { k: known };
    }
  }
  return null;
}

/**
 * `{ dialog, keys, session, turn, write }` exactly, or malformed (Phase 337,
 * build/p337/SPEC.md D17, §5.5). `keys` is an array of 1 to
 * {@link POCKET_KEYS_MAX_ITEMS} items ({@link keyItemOf}), and A NAMED KEY
 * OTHER THAN `BSpace` IS THE ONLY ITEM OF ITS WRITE: a program reads one
 * write as one input, and `Escape` followed by anything in the same read is
 * read as Meta, so a write is text and `BSpace` items in any order, or exactly
 * one other named key and nothing else. `turn` is a question id's shape and
 * `dialog` null or a mark's. Nothing is trimmed or normalized.
 */
export function parseKeysBody(body: Buffer): PocketKeysBody {
  const value = objectOf(body);
  const write = echoOf(value);
  if (value === null || Object.keys(value).sort().join(',') !== KEYS_KEYS) return { ok: false, write };
  const session = value['session'];
  const turn = value['turn'];
  const dialog = value['dialog'];
  const items = value['keys'];
  if (write === '' || !isSessionId(session) || !isQuestionId(turn) || !(dialog === null || isMark(dialog))) {
    return { ok: false, write };
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > POCKET_KEYS_MAX_ITEMS) return { ok: false, write };
  const keys: PocketKeyItem[] = [];
  for (const item of items as unknown[]) {
    const key = keyItemOf(item);
    if (key === null) return { ok: false, write };
    keys.push(key);
  }
  // D17: a named key other than `BSpace` only as the write's one item.
  if (keys.length > 1 && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };
  return { ok: true, verb: 'keys', write, session, keys, turn, dialog };
}

/** Whether a route id is one of the closed write list (Phase 318, §5.1.4 step 1). */
function isWriteRoute(id: PocketRouteId): id is PocketWriteRouteId {
  return (POCKET_WRITE_ROUTE_IDS as readonly PocketRouteId[]).includes(id);
}

/** The answer, composed field by field, so nothing else can ever leave. */
function writeAnswer(
  verb: PocketWriteRouteId,
  write: string,
  outcome: PocketWriteOutcome,
  reason: PocketWriteReason | null,
  sentence: string | null
): string {
  const answer: PocketWriteAnswer = { verb, write, outcome, reason, sentence };
  return JSON.stringify({
    verb: answer.verb,
    write: answer.write,
    outcome: answer.outcome,
    reason: answer.reason,
    sentence: answer.sentence
  });
}

/** What the act came to, before it is answered. */
interface ActOutcome {
  readonly outcome: PocketWriteOutcome;
  readonly reason: PocketWriteReason | null;
  readonly sentence: string | null;
}

const END_ACT_FAILED: ActOutcome = { outcome: 'failed', reason: null, sentence: END_FAILED };

/** `end`'s outcome as the answer says it. Only the three shapes; nothing else passes. */
function endActOf(result: PocketEndOutcome): ActOutcome {
  if (result.outcome === 'done') return { outcome: 'done', reason: null, sentence: null };
  if (result.outcome === 'refused') return { outcome: 'refused', reason: result.reason, sentence: result.sentence };
  if (result.outcome === 'failed') return { outcome: 'failed', reason: null, sentence: result.sentence };
  return END_ACT_FAILED;
}

/**
 * Start `end` NOW and never let it throw past here: a rejection, or a throw
 * before the promise exists, is `failed` with `END_FAILED`. The call runs
 * synchronously inside this function, so the act starts in the statement that
 * names it.
 */
function endSettled(start: () => Promise<PocketEndOutcome>): Promise<ActOutcome> {
  try {
    return start().then(endActOf, () => END_ACT_FAILED);
  } catch {
    return Promise.resolve(END_ACT_FAILED);
  }
}

const REPLY_ACT_FAILED: ActOutcome = { outcome: 'failed', reason: null, sentence: REPLY_FAILED };

/** A press's or a message's outcome as the answer says it. Only the three shapes; nothing else passes. */
function replyActOf(result: PocketReplyOutcome): ActOutcome {
  if (result.outcome === 'done') return { outcome: 'done', reason: null, sentence: null };
  if (result.outcome === 'refused') return { outcome: 'refused', reason: result.reason, sentence: result.sentence };
  if (result.outcome === 'failed') return { outcome: 'failed', reason: null, sentence: result.sentence };
  return REPLY_ACT_FAILED;
}

/**
 * Start `choose`, `say` or (Phase 337) `keys` NOW and never let it throw past
 * here (Phase 318, §5.1.4 step 5): the same wrapper as {@link endSettled}, a
 * rejection or a throw before the promise exists reading `failed` with
 * `REPLY_FAILED`.
 */
function replySettled(start: () => Promise<PocketReplyOutcome>): Promise<ActOutcome> {
  try {
    return start().then(replyActOf, () => REPLY_ACT_FAILED);
  } catch {
    return Promise.resolve(REPLY_ACT_FAILED);
  }
}

/** One write id the ledger holds. */
interface LedgerEntry {
  readonly phone: string;
  /** `pending` from the claim until the act is answered; `recorded` after. */
  state: 'pending' | 'recorded';
  /** The recorded answer's body. Empty while pending. */
  body: string;
  /** Whether the write this entry speaks for acted. */
  acted: boolean;
  /** When it was claimed, then when it was recorded. */
  at: number;
}

/** The write path. Holds the ledger and the claims, in memory, and nothing else. */
export function createPocketWriteHandler(deps: PocketWriteDeps): PocketWriteHandler {
  const now = (): number => deps.now?.() ?? Date.now();
  /** (phone, verb, write id) → entry, keyed by a newline no part can hold. */
  const ledger = new Map<string, LedgerEntry>();
  const perPhone = new Map<string, number>();
  /** The phones and the sessions with a write in flight. */
  const phonesInFlight = new Set<string>();
  const sessionsInFlight = new Set<string>();
  /**
   * PHASE 337 (D43): session id → when its last `done` keys write was logged.
   * Bounded by the ledger's own pruning, at the ledger's own lifetime: an
   * entry that old says nothing any more (the quiet window is shorter) and is
   * dropped where the ledger drops its own. {@link logs} alone decides the
   * quiet window.
   */
  const keysLoggedAt = new Map<string, number>();

  // PHASE 318 (D4, 317's fix-round nit): the verb is in the key, so the same
  // write id under another verb is its own write and never another's answer.
  const keyOf = (phone: string, verb: PocketWriteRouteId, write: string): string => `${phone}\n${verb}\n${write}`;

  const forget = (key: string, entry: LedgerEntry): void => {
    ledger.delete(key);
    const left = (perPhone.get(entry.phone) ?? 1) - 1;
    if (left <= 0) perPhone.delete(entry.phone);
    else perPhone.set(entry.phone, left);
  };

  /** Drop every RECORDED entry older than its lifetime. A pending one is live. */
  const prune = (at: number): void => {
    for (const [key, entry] of ledger) {
      if (entry.state === 'recorded' && at - entry.at >= POCKET_WRITE_LEDGER_MS) forget(key, entry);
    }
    for (const [id, when] of keysLoggedAt) {
      if (at - when >= POCKET_WRITE_LEDGER_MS) keysLoggedAt.delete(id);
    }
  };

  /**
   * Whether this outcome takes step 7's one log line (D43). Every outcome of
   * every verb does, but a `keys` write answered `done` on a session whose last
   * `done` keys line is younger than {@link KEYS_LOG_QUIET_MS}.
   */
  const logs = (verb: PocketWriteRouteId, outcome: PocketWriteOutcome, session: string, at: number): boolean => {
    if (verb !== 'keys' || outcome !== 'done') return true;
    const last = keysLoggedAt.get(session);
    if (last !== undefined && at - last < KEYS_LOG_QUIET_MS) return false;
    keysLoggedAt.set(session, at);
    return true;
  };

  return async function write(route, body, verifiedPhone, door): Promise<DoorAnswer> {
    const writes = deps.writes;
    // A host with no writes (the push seam, the tests), a read, or an id not in
    // the closed write list answers every write the way it answers a route it
    // does not have, before anything is read.
    if (writes === undefined || route.reads || !isWriteRoute(route.id)) {
      return { status: 404, body: null };
    }
    const verb: PocketWriteRouteId = route.id;

    // STEP 1. The strict parse.
    // By the verb (Phase 318; Phase 337's keys): each verb's own key set,
    // through the one JSON.parse.
    const parsed: PocketWriteBody =
      verb === 'end'
        ? parseEndBody(body)
        : verb === 'choose'
          ? parseChooseBody(body)
          : verb === 'say'
            ? parseSayBody(body)
            : parseKeysBody(body);
    if (!parsed.ok) {
      return {
        status: 200,
        body: writeAnswer(verb, parsed.write, 'refused', 'malformed', POCKET_WRITE_SENTENCES.unreadable)
      };
    }
    const session = parsed.session;

    // STEP 2. The ledger.
    const at = now();
    prune(at);
    const key = keyOf(verifiedPhone, verb, parsed.write);
    const known = ledger.get(key);
    if (known !== undefined && known.state === 'recorded') {
      // Answered again, acting on nothing, and carrying what it recorded.
      return known.acted ? { status: 200, body: known.body, acted: true } : { status: 200, body: known.body };
    }
    if (known !== undefined) {
      // The same write may be acting right now, so this busy speaks for an act
      // that may happen, and a 404 in its place would say it did not.
      return {
        status: 200,
        body: writeAnswer(verb, parsed.write, 'busy', null, POCKET_WRITE_SENTENCES.busy),
        acted: true
      };
    }
    if ((perPhone.get(verifiedPhone) ?? 0) >= POCKET_WRITE_LEDGER_PER_PHONE || ledger.size >= POCKET_WRITE_LEDGER_MAX) {
      // Full: a live entry is never evicted to make room, and this write never acted.
      return { status: 200, body: writeAnswer(verb, parsed.write, 'busy', null, POCKET_WRITE_SENTENCES.busy) };
    }

    // STEP 3. One in flight, per phone and per session, ACROSS verbs, and the
    // pending entry.
    if (phonesInFlight.has(verifiedPhone) || sessionsInFlight.has(session)) {
      return { status: 200, body: writeAnswer(verb, parsed.write, 'busy', null, POCKET_WRITE_SENTENCES.busy) };
    }
    phonesInFlight.add(verifiedPhone);
    sessionsInFlight.add(session);
    const pending: LedgerEntry = { phone: verifiedPhone, state: 'pending', body: '', acted: false, at };
    ledger.set(key, pending);
    perPhone.set(verifiedPhone, (perPhone.get(verifiedPhone) ?? 0) + 1);
    // PHASE 318 (D5): THE SAME THREE ASKS AS THE LAST CHECK BELOW, in its order,
    // handed to a verb that reads the session before it types, which asks them
    // AGAIN immediately before its one keystroke or paste. Building it asks
    // nothing.
    const still: PocketStillAllowed = (): boolean =>
      !deps.shuttingDown() && !door.stopping() && deps.stillPaired(verifiedPhone);
    try {
      // STEP 4. The last check, and STEP 5, the act, started in the very next
      // statement: no await and no other statement sits between the two.
      if (deps.shuttingDown() || door.stopping() || !deps.stillPaired(verifiedPhone)) return { status: 404, body: null };
      const acting = parsed.verb === 'end'
        ? endSettled(() => writes.end({ sessionId: parsed.session, batch: parsed.batch }))
        : parsed.verb === 'choose'
          ? replySettled(() =>
              writes.choose(
                { sessionId: parsed.session, question: parsed.question, mark: parsed.mark, marker: parsed.marker },
                still
              )
            )
          : parsed.verb === 'say'
            ? replySettled(() => writes.say({ sessionId: parsed.session, text: parsed.text }, still))
            : replySettled(() =>
                writes.keys(
                  { sessionId: parsed.session, keys: parsed.keys, turn: parsed.turn, dialog: parsed.dialog },
                  still
                )
              );
      // The act, awaited. It cannot throw past here, and from here every
      // answer is a 200 marked `acted`.
      const done = await acting;
      // STEP 6. The outcome, recorded and answered.
      const answer = writeAnswer(verb, parsed.write, done.outcome, done.reason, done.sentence);
      pending.state = 'recorded';
      pending.body = answer;
      pending.acted = true;
      pending.at = now();
      // STEP 7. One log line: the verb and the outcome word, and the session id.
      // Phase 337 (D43): a `done` keys write only once per session per quiet minute.
      if (logs(verb, done.outcome, session, pending.at)) pocketLog.info(`the phone's ${verb}: ${done.outcome}`, { session });
      return { status: 200, body: answer, acted: true };
    } finally {
      phonesInFlight.delete(verifiedPhone);
      sessionsInFlight.delete(session);
      // A pending entry that never acted leaves nothing behind.
      if (pending.state === 'pending' && ledger.get(key) === pending) forget(key, pending);
    }
  };
}
