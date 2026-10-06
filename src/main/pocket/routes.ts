/**
 * The closed route table, and the answers it composes (Phase 313).
 *
 * ## Closed means closed
 *
 * {@link POCKET_ROUTES} is every route this door has. There is no default, no
 * wildcard, no prefix match and no fall-through: {@link matchPocketRoute}
 * compares a method and a path for EQUALITY against this list and answers null
 * for everything else. A path that is not in the list does not exist, and the
 * door refuses it before it reads a header, a query or a byte of body.
 *
 * ## Five questions, and four narrow writes declared here and done elsewhere
 *
 * The blocked list (with, since Phase 316, every other session Tortie lists),
 * one session, that session's turns, (Phase 316.7) every listed session
 * shown, grouped and sorted as the phone asked, and (Phase 337) one session's
 * own screen. Every answer is composed here in main from what main already
 * computes, and every string a person reads is one main already drew:
 *
 *   - the ORDER and the SET come from `../tray/attention.ts`'s own
 *     `attentionRows`, which is what already drives the menu-bar sentinel, so
 *     the phone and the menu bar cannot disagree about who is blocked;
 *   - `others` is exactly the listed sessions that are NOT in that set, capped
 *     at `POCKET_OTHERS_MAX` (Phase 316, his ruling "Yes it should be able to
 *     open anything");
 *   - the status word and its dot come from main's own state through
 *     {@link PocketFacts.statusWord}, never from a second table, and the
 *     raised title and the age are composed here by the two shared rules the
 *     Mac draws with (`raisedLabel`, `formatAge`);
 *   - the question and the numbered options are exactly what Phases 311 and
 *     312 landed on `activity:changed`, already redacted and already capped in
 *     `../activity/screen.ts` at one definition with one call site. NOTHING
 *     HERE CAPS THEM AGAIN: a second cap would be a second place the truth
 *     about what a person sees lives;
 *   - the Catch Me Up line and the turns come from `../overview/`, already
 *     redacted and already clipped to 4,000 characters by `turn-view.ts`;
 *   - (Phase 317) whether End is offered on a row, and the Mac's own End
 *     confirmation for one session, are composed by the one implementation
 *     outside this domain that asks both gates ({@link PocketFacts.endOffer})
 *     and by the shared `endSessionConfirm` over main's own row;
 *   - (Phase 318) what the phone may press or send on ONE session is read by
 *     the reply's reader outside this domain ({@link PocketFacts.replyOffer})
 *     over one fresh reading, handed the very question and options this answer
 *     draws, and copied onto `/v1/session` field by field. `/v1/blocked`, its
 *     rows and `/v1/sessions` carry none of it;
 *   - (Phase 316.7) the Sessions tab's groups, their labels and order, and
 *     which sessions Active and Ended keep, come from the session manager's
 *     own functions, moved to `@shared/session-list` so the sheet and this
 *     door call the same ones. The phone sorts, filters and groups nothing
 *     (build/p3167/SPEC.md D1): it sends five closed words and lays out what
 *     this module answers;
 *   - (Phase 337) one session's screen is composed outside this domain by the
 *     Screen's watcher ({@link PocketFacts.screen}), which may hold the request
 *     as a long poll, and copied here FIELD BY FIELD ({@link screenOf}) with
 *     fresh arrays and the contract's caps held again, so nothing but the
 *     answer's own fields can leave.
 *
 * The writes (Phase 317, build/p317/SPEC.md §5.4; Phase 318,
 * build/p318/SPEC.md §5.1.5; Phase 337, build/p337/SPEC.md §5.4) are DECLARED
 * here, as {@link PocketWrites}, a hand-written interface with four members,
 * and done outside this domain (`src/main/sessions/pocket-writes.ts`, which
 * hands the reply's two to the verbs in `src/main/reply/` and the keys to the
 * verb in `src/main/screen/`), which is handed in. Nothing in this module can
 * name the verb a write reaches.
 *
 * ## Fresh before read (Phase 316)
 *
 * The overview store is written only when Catch Me Up opens a project, the
 * fold runs or the session manager asks for counts, so a bare read of it
 * answers stale for exactly the sessions a phone asks about. `/v1/session` and
 * `/v1/turns` therefore ask {@link PocketFacts.refresh} FIRST, which brings the
 * one row up to date through the one read path (`sessionActivity`) and answers
 * its counts, and only then read. The refresh yields, so the session is looked
 * up AGAIN after it: a session removed while the phone's request was in flight
 * is answered as the unknown id it now is, never read.
 *
 * ## The four refusals, built in rather than asserted
 *
 * 1. **No route may set a status.** {@link PocketFacts} is a hand-written,
 *    narrow type and every member of it is a READ. There is no member that
 *    could set anything, so a route cannot call one. That is CLAUDE.md
 *    refusal 5 made structural rather than remembered, and the import wall
 *    `{ dir: 'main/pocket/', forbidden: [...] }` is the second answer.
 * 2. **No route may start a process.** This module imports nothing that can
 *    spawn. There is no `child_process`, no tmux, no ssh and no agent.
 * 3. **No route may read a credential.** Nothing here names
 *    `main/credentials/` or `main/logins/`, and the wall asserts it.
 * 4. **A connection that is not a paired phone's never reaches a header.**
 *    That one is NOT HERE and it is not `./server.ts`'s either. Since Phase
 *    330 the door is published through Tailscale Funnel, every connection
 *    arrives from `127.0.0.1`, and the source-address refusal this item used
 *    to name (Phase 313's `isSelfOrigin`) is gone with the tailnet bind. Its
 *    place is taken by the door process (`./door/listener.ts`): outside a
 *    pairing window, a TLS handshake whose client key is not a paired phone's
 *    is destroyed at `secureConnection`, before the HTTP parser is handed the
 *    socket, and a connection with no certificate reaches `POST /pair` alone,
 *    only while a window is open.
 *
 * ## What this module does not do
 *
 * It opens no socket and binds nothing. It has no timer. It holds no state at
 * all: every answer is composed from the facts it is handed, at the moment it
 * is asked. (The Screen's long poll holds its request in the watcher it is
 * handed, never here.)
 */

import { createHash } from 'node:crypto';
import type { Project, Session } from '@shared/types';
import type { SessionChoiceInfo, SessionChoiceOption } from '@shared/ipc/sessions';
import type { OverviewSessionActivity } from '@shared/overview';
import { createdOld, formatAge } from '@shared/age';
import { displayPath } from '@shared/display-path';
import { OUTCOME_REMOTE } from '@shared/overview-copy';
import { raisedLabel } from '@shared/status-words';
import { DOOR_GATE_ENV, sessionActionGates } from '@shared/session-gates';
import {
  collectSessionGroups,
  compareSessionGroups,
  firstNamed,
  lifecycleKeeps,
  sessionGroupIdentity,
  sessionGroupLabel
} from '@shared/session-list';
import { LOCAL_MACHINE_ID, sameTarget, targetOfProject } from '@shared/workspace-target';
import {
  POCKET_AGE_HONESTY,
  POCKET_NO_REPLY,
  POCKET_OTHERS_MAX,
  POCKET_ROUTE_IDS,
  POCKET_SCREEN_MAX_BYTES,
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCREEN_MAX_ROWS,
  POCKET_SCREEN_MAX_RUNS,
  POCKET_SCREEN_MAX_STYLES,
  POCKET_SESSIONS_BUDGET_BYTES,
  POCKET_SESSIONS_CHOICES_MAX,
  POCKET_SESSIONS_CLIP_CHARS,
  POCKET_SESSIONS_DEFAULT,
  POCKET_SESSIONS_GROUP,
  POCKET_SESSIONS_MAX,
  POCKET_SESSIONS_SHOW,
  POCKET_SESSIONS_SORT,
  POCKET_WRITE_ROUTE_IDS,
  type PocketBlockedAnswer,
  type PocketBlockedRow,
  type PocketCatchUp,
  type PocketEndConfirm,
  type PocketEndOffer,
  type PocketHandoff,
  type PocketKeyItem,
  type PocketReplyOffer,
  type PocketRouteId,
  type PocketScreen,
  type PocketScreenAbsence,
  type PocketScreenAnswer,
  type PocketScreenRun,
  type PocketScreenStyle,
  type PocketSessionAnswer,
  type PocketSessionDetail,
  type PocketSessionsAnswer,
  type PocketSessionsAsked,
  type PocketSessionsChoice,
  type PocketSessionsGroup,
  type PocketSessionsRow,
  type PocketTurn,
  type PocketTurnsAnswer,
  type PocketWriteRouteId
} from '@shared/ipc/pocket';
import { endSessionConfirm } from '@shared/lifecycle-words';
import { SCREEN_ENDED, SCREEN_TOO_LARGE, SCREEN_UNREACHABLE } from '@shared/screen-copy';
import { attentionRows, blockedAge, type WakeWindow } from '../tray/attention';
// THE CEILING, IMPORTED RATHER THAN RE-SPELLED. `../overview/turn-view.ts` owns
// the number and this door holds itself to it; a second literal here would be a
// second answer to the same question, and the one that drifted would be the one
// on the network.
import { MAX_TURN_LIMIT } from '../overview/turn-view';

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

// THE TABLE LIVES IN `./door/table.ts` since Phase 330, moved byte for byte, so
// the door process can refuse a path that is not a route before main is told
// anything. It is re-exported here so no importer moved.
import { POCKET_ROUTES, matchPocketRoute, type PocketRoute } from './door/table';
export { POCKET_ROUTES, matchPocketRoute, type PocketRoute };

/** The table and the contract's id list are one list. Read by the gate. */
export function pocketRouteIds(): readonly PocketRouteId[] {
  return POCKET_ROUTES.map((r) => r.id);
}

/** Whether a route id is one of the contract's closed write list. */
function isWriteRouteId(id: PocketRouteId): id is PocketWriteRouteId {
  return (POCKET_WRITE_ROUTE_IDS as readonly PocketRouteId[]).includes(id);
}

/**
 * The write rows' ids, read from the table (Phase 317; Phase 318 added two;
 * Phase 337 one). Exactly `end`, `choose`, `say` and `keys`, and
 * `routes.test.ts` holds it to that list. It replaces
 * `pocketTableIsReadOnly()`, which Phase 317 made false.
 */
export function pocketWriteRouteIds(): readonly PocketWriteRouteId[] {
  const ids: PocketWriteRouteId[] = [];
  for (const route of POCKET_ROUTES) {
    if (route.reads) continue;
    if (isWriteRouteId(route.id)) ids.push(route.id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// What a route is allowed to know
// ---------------------------------------------------------------------------

/**
 * Everything the routes may ask main, and it is the whole of what they can do.
 *
 * EVERY MEMBER IS A READ. That is not a convention, it is the refusal: a route
 * cannot set a status, start a process or read a credential because there is no
 * member here that would. This type is hand written and narrow, and no internal
 * registry type is re-exported into it.
 */
export interface PocketFacts {
  /** Exactly `core.listSessions()`. */
  sessions(): readonly Session[];
  /** Exactly `core.listProjects()`, for the project's drawn name. */
  projects(): readonly Project[];
  /**
   * When each session was first seen blocked, which is the map
   * `../tray/attention.ts` keeps for the menu-bar sentinel. The door is handed
   * the SAME map, so the phone's order and the menu bar's order are one order.
   */
  blockedSince(): ReadonlyMap<string, number>;
  /**
   * The sleeps this process has lived through, oldest first (Phase 314). The
   * door never compares a stamp with a resume itself: it hands both to
   * `../tray/attention.ts`'s `blockedAge`, which is the one age function, and
   * the push alert reads the answer off the same row.
   */
  wakes(): readonly WakeWindow[];
  /**
   * The question and the option rows Phases 311 and 312 put on the feed, and
   * (Phase 316) when tmux last saw output in the session, which orders
   * `others` and ages a row that is not waiting.
   */
  activity(sessionId: string): {
    question?: string;
    choice?: SessionChoiceInfo;
    lastActivityAt?: number;
  } | undefined;
  /** Main's own status word and dot for one session. */
  statusWord(session: Session): { dot: string; label: string };
  /** The agent's drawn name for a registry id, e.g. `Claude Code`. */
  agentLabel(agentId: string): string;
  /** The machine's drawn label, or null when the session runs on this Mac. */
  machineLabel(session: Session): string | null;
  /**
   * The empty line, injected rather than spelled here.
   *
   * `Nothing needs you` is already written in three places in this tree and
   * this phase deliberately does not become the fourth. The integrator wires
   * main's own tray string, so the door and the menu bar say one thing.
   */
  emptyLine: string;
  /**
   * Bring ONE session's stored conversation up to date through the one read
   * path, and answer its counts (Phase 316): `sessionActivity(deps,
   * { sessionIds: [id] })` in `../overview/activity.ts`, serialised and
   * yielding. The routes call it BEFORE `catchUp`, `lastTurn` and `turns`, so
   * nothing they read is older than this request. Null when it could not ask.
   *
   * OPTIONAL ONLY FOR A COMPOSER THAT READS NO CONVERSATION, being the push
   * seam and the tests, whose `catchUp`, `lastTurn` and `turns` answer nothing.
   * The door's one production composer, `./facts.ts`, always supplies it.
   */
  refresh?(sessionId: string): Promise<OverviewSessionActivity | null>;
  /** The Catch Me Up line for one session, already built in main. */
  catchUp(sessionId: string): Promise<PocketCatchUp | null>;
  /** The agent's last answer, already redacted and clipped, and the count. */
  lastTurn(sessionId: string): Promise<{ answerText: string | null; turnCount: number }>;
  /**
   * The turns, from the overview store, already redacted and clipped. `from`
   * and `to` are indexes this module has already checked (see
   * {@link readTurnRange}): both null is the newest `limit` turns; otherwise
   * the newest `limit` turns at or between them, `from` defaulting to 0 and
   * `to` to the newest. `more` is true when older turns exist before the
   * first one answered, and false on an empty page.
   */
  turns(
    sessionId: string,
    range: { limit: number; from: number | null; to: number | null }
  ): Promise<{ turns: PocketTurn[]; more: boolean }>;
  /** Where a person carries on by hand, or null when nothing offers one. */
  handoff(session: Session): PocketHandoff | null;
  /**
   * Whether End is offered on this row (Phase 317, SPEC §5.4): the one
   * implementation in `src/main/sessions/pocket-writes.ts`, which asks BOTH
   * gates over the row and the manifest record, handed in. A READ, like every
   * member here.
   *
   * OPTIONAL, AND ABSENT READS `{ state: 'none' }`, which is what an absent dep
   * already meant (§14 finding 8): the push seam and the tests build their own
   * facts and offer no End, and a required member would stop them compiling
   * for a field neither needs.
   */
  endOffer?(session: Session): PocketEndOffer;
  /**
   * What the phone may press or send on ONE session now (Phase 318,
   * build/p318/SPEC.md §5.2, D18): the reply's reader in
   * `src/main/reply/reader.ts`, outside this domain, over one fresh reading of
   * the session, handed in. A READ, like every member here: it writes nothing,
   * sets no status, and types nothing.
   *
   * IT IS HANDED WHAT THIS ANSWER DRAWS (§Revision R1). `drawn` is the question
   * and the options the same `/v1/session` answer serves, which come from the
   * activity map and move only on the monitor's tick; the reader offers a
   * press only when its fresh reading composes exactly those, so a person can
   * never tap an option drawn under one question and have it answer another.
   *
   * Asked by `/v1/session` alone. OPTIONAL, AND ABSENT READS
   * {@link POCKET_NO_REPLY}: the push seam and the tests build their own facts
   * and offer no reply. A reader that rejects reads the empty offer too, and
   * the session read still answers.
   */
  replyOffer?(session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer>;
  /**
   * One session's screen, composed in main (Phase 337, build/p337/SPEC.md
   * §5.3): answered at once when `since` is null or not current, else held
   * until the screen moves or SCREEN_HOLD_MS passes, ending at once when
   * `closing()` holds. A READ: it writes nothing, sets no status and types
   * nothing. OPTIONAL, AND ABSENT IS THE ROUTE NOT EXISTING (404): the push
   * seam and the tests build their own facts.
   */
  screen?(session: Session, since: string | null, closing: () => boolean): Promise<PocketScreenAnswer>;
  now?(): number;
}

/**
 * What one `/v1/session` answer draws of a session's question, handed to the
 * reply's reader (Phase 318, §Revision R1). Main only, never on the wire.
 */
export interface PocketReplyDrawn {
  /** The question this answer serves, or null. */
  readonly question: string | null;
  /** The options this answer serves, in drawn order. */
  readonly choices: readonly SessionChoiceOption[];
}

/** What a press echoes: the question id and the mark it was shown, and the option pressed. */
export interface PocketChooseInput {
  sessionId: string;
  question: string;
  mark: string;
  marker: string;
}

/** One message, as the phone sent it. */
export interface PocketSayInput {
  sessionId: string;
  text: string;
}

/**
 * One keys write, as the phone sent it (Phase 337, build/p337/SPEC.md §5.4,
 * D17, D21): the items, already held to their shape by `./writes.ts`'s
 * `parseKeysBody` (a named key other than `BSpace` is the write's one item),
 * and the question id and the window's mark of the picture the keys were sent
 * against, which the verb compares with a fresh reading before it types.
 */
export interface PocketKeysInput {
  sessionId: string;
  keys: readonly PocketKeyItem[];
  turn: string;
  dialog: string | null;
}

/**
 * The door's last check, handed to a verb that reads before it acts (Phase 318,
 * D5): the quit, this door instance stopping, the signing phone still paired.
 * The verb asks it AGAIN in its own final synchronous check, with nothing
 * awaited between that and the keystroke.
 */
export type PocketStillAllowed = () => boolean;

/**
 * THE PHONE'S WRITES (Phase 317, build/p317/SPEC.md §5.4; Phase 318,
 * build/p318/SPEC.md §5.1.5; Phase 337, build/p337/SPEC.md §5.4),
 * implemented ONCE, OUTSIDE this domain (`src/main/sessions/pocket-writes.ts`),
 * and handed in. Nothing here can name the verb it reaches
 * (`conformance:pocket` R3).
 *
 * Hand written and narrow, like {@link PocketFacts}, with FOUR members and no
 * fifth; no member may set a status.
 */
export interface PocketWrites {
  /**
   * End one session, after asking both gates over the row re-read by id.
   * Nothing is awaited before the verb is called. It answers an outcome and
   * never throws.
   */
  end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome>;
  /** Press one option of a measured question. Answers an outcome and never throws. */
  choose(input: PocketChooseInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
  /** Send one message. Answers an outcome and never throws. */
  say(input: PocketSayInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
  /**
   * Type keys into one running session, on this Mac or another machine (Phase
   * 337). Answers an outcome and never throws.
   */
  keys(input: PocketKeysInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
}

/** What one End came to, as the write path answers it. */
export type PocketEndOutcome =
  | { outcome: 'done' }
  | { outcome: 'refused'; reason: 'removed' | 'unreachable' | 'ended' | 'gone'; sentence: string }
  | { outcome: 'failed'; sentence: string };

/**
 * Why a press, a message or (Phase 337) a keys write was refused, as the
 * door's answer words it (Phase 318, D19). Phase 337 adds `unreachable`, End's
 * own word, for a session that cannot take keys now (build/p337/SPEC.md §5.4
 * step 2): no new word reaches the contract.
 */
export type PocketReplyRefusal =
  | 'gone'
  | 'changed'
  | 'unpressable'
  | 'unsayable'
  | 'stopped'
  | 'empty'
  | 'long'
  | 'character'
  | 'unreachable';

/** What one press or one message came to, as the write path answers it. */
export type PocketReplyOutcome =
  | { outcome: 'done' }
  | { outcome: 'refused'; reason: PocketReplyRefusal; sentence: string }
  | { outcome: 'failed'; sentence: string };

/** End on a row when no implementation was handed in: none. */
const NO_END: PocketEndOffer = Object.freeze({ state: 'none' }) as PocketEndOffer;

/**
 * The Mac's End confirmation for one session, composed by the shared
 * `endSessionConfirm` (the words the Mac's own End draws) and copied field by
 * field, so nothing but its three strings can ever leave.
 */
function endConfirmOf(session: Session): PocketEndConfirm {
  const confirm = endSessionConfirm(session);
  return { title: confirm.title, body: confirm.body, confirmLabel: confirm.confirmLabel };
}

/**
 * The reply offer as the door serves it (Phase 318, build/p318/SPEC.md §5.2),
 * COMPOSED FIELD BY FIELD from what the reader answered, with a fresh array for
 * `pressable`, so nothing else on the reader's object can ever leave.
 *
 * The offer's invariants are held HERE, at the one composer, whatever a reader
 * says, because the phone draws them and decides nothing:
 *
 *   - `pressable` holds only markers of the options THIS answer draws, in
 *     their drawn order, each once, so no button can be drawn for an option
 *     the person cannot see;
 *   - the press half is all or nothing: `question`, `mark` and `command` are
 *     null, and `pressable` empty, unless a question id, a mark and at least
 *     one pressable marker are all there;
 *   - `canSay` is true only when the reader said exactly `true`.
 */
function replyOf(offer: PocketReplyOffer, drawn: PocketReplyDrawn): PocketReplyOffer {
  const offered = new Set<string>();
  if (Array.isArray(offer.pressable)) {
    for (const marker of offer.pressable) if (typeof marker === 'string') offered.add(marker);
  }
  const pressable: string[] = [];
  for (const choice of drawn.choices) {
    if (offered.has(choice.marker) && !pressable.includes(choice.marker)) pressable.push(choice.marker);
  }
  const question = typeof offer.question === 'string' && offer.question.length > 0 ? offer.question : null;
  const mark = typeof offer.mark === 'string' && offer.mark.length > 0 ? offer.mark : null;
  const command = typeof offer.command === 'string' && offer.command.length > 0 ? offer.command : null;
  const pressing = question !== null && mark !== null && pressable.length > 0;
  return {
    question: pressing ? question : null,
    mark: pressing ? mark : null,
    pressable: pressing ? pressable : [],
    command: pressing ? command : null,
    canSay: offer.canSay === true
  };
}

/**
 * The most turns one answer carries when nobody asked for a number.
 *
 * THE CEILING IS HELD HERE, AT THE DOOR, and an earlier draft of this comment
 * said the store held it. That was false and it was measured false in the fix
 * round: `listTurns` (`../overview/store/store.ts:687-694`) passes its limit
 * straight into a SQL `LIMIT ?` with no clamp of its own, and `MAX_TURN_LIMIT`
 * is applied at `../overview/service.ts` and `../overview/timeline.ts`, neither
 * of which this door goes through. So `?limit=999999999` would have read a
 * whole session into memory on the one route that answers a person's own
 * conversation, and the entry's "one wide range cannot read a whole session
 * into memory" rested on a clamp that was nowhere.
 *
 * The number is still not re-derived: {@link MAX_TURN_LIMIT} is imported from
 * the module that owns it. What this module owns is the DEFAULT, and what it
 * now does is apply the ceiling itself rather than trust somebody downstream.
 */
export const POCKET_DEFAULT_TURN_LIMIT = 20;

// ---------------------------------------------------------------------------
// Composing the answers
// ---------------------------------------------------------------------------

function optionsOf(choice: SessionChoiceInfo | undefined): SessionChoiceOption[] {
  if (choice === undefined || !choice.atChoice) return [];
  return choice.options;
}

function rowOf(
  facts: PocketFacts,
  session: Session,
  projectName: string,
  blockedSince: number,
  at: number
): PocketBlockedRow {
  const activity = facts.activity(session.id);
  const word = facts.statusWord(session);
  const question = activity?.question;
  // The set `attentionRows` builds the blocked list from, asked of one row.
  const waiting = session.status === 'needs_input';
  // THE AGE a person reads. A waiting row is aged from when it started
  // waiting. Any other row is aged from the last output Tortie saw in it, or
  // from its creation when it has seen none, which is what the session rail
  // draws beside the same row on the Mac.
  const lastOutput = activity?.lastActivityAt;
  const agedFrom = waiting
    ? blockedSince
    : typeof lastOutput === 'number'
      ? lastOutput
      : session.createdAt;
  return {
    sessionId: session.id,
    name: session.name,
    project: projectName,
    machine: facts.machineLabel(session),
    agent: session.agent,
    agentLabel: facts.agentLabel(session.agent),
    statusLabel: word.label,
    // Raised by the one rule the session manager raises a word with.
    statusTitle: raisedLabel(word.label),
    statusDot: word.dot,
    // An EMPTY STRING is the explicit clear on the feed, so it is a question
    // that is over rather than a question that is empty. Both read as null.
    question: typeof question === 'string' && question.length > 0 ? question : null,
    choices: optionsOf(activity?.choice),
    blockedSince,
    // THE ONE AGE FUNCTION'S ANSWER, never a comparison of this module's own.
    // A row that is not waiting is handed NO wakes, so the function answers
    // false for it: its stamp is its creation clock, and a session created
    // just after a wake was never first seen WAITING then (Phase 316).
    seenAtWake: blockedAge(blockedSince, waiting ? facts.wakes() : []).seenAtWake,
    ageText: formatAge(agedFrom, at),
    // PHASE 317. On EVERY row, decided by both gates through the one
    // implementation; absent reads none, and no End is drawn.
    end: facts.endOffer?.(session) ?? NO_END
  };
}

/**
 * The order of `others` (Phase 316), and it is total.
 *
 * Sessions Tortie has seen output from come first, newest output first. Then
 * the sessions it has seen none from — a session on another machine is one,
 * because the feed watches this Mac's panes — newest created first. The id
 * breaks every tie, so two answers over the same facts are the same list.
 */
function othersOrder(
  facts: PocketFacts
): (a: Session, b: Session) => number {
  const seen = (s: Session): number | null => {
    const at = facts.activity(s.id)?.lastActivityAt;
    return typeof at === 'number' && Number.isFinite(at) ? at : null;
  };
  return (a, b) => {
    const sa = seen(a);
    const sb = seen(b);
    if (sa !== null && sb === null) return -1;
    if (sa === null && sb !== null) return 1;
    if (sa !== null && sb !== null && sa !== sb) return sb - sa;
    if (sa === null && a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

/** Why a turn range was refused. A word, never a value. */
export type PocketTurnRangeRefusal = 'index' | 'backwards';

/**
 * The page a `/v1/turns` query asks for, or why it is refused (Phase 316).
 *
 * An index is a turn index: a plain decimal of digits only, a SAFE integer, and
 * never negative. Anything else — `-1`, `1.5`, `1e3`, `0x10`, ` 7`, `2^53` and
 * above — REFUSES the page rather than falling back, because a fallback would
 * answer a page the phone did not ask for and the phone would stitch it into
 * the conversation as if it had. A `from` past its `to` is a page that goes
 * backwards and refuses too. An absent or empty value is absent. The route
 * answers a refused page the way it answers an unknown id.
 */
export function readTurnRange(query: {
  from?: string | null;
  to?: string | null;
}):
  | { ok: true; from: number | null; to: number | null }
  | { ok: false; reason: PocketTurnRangeRefusal } {
  const from = turnIndexOf(query.from);
  const to = turnIndexOf(query.to);
  if (from === undefined || to === undefined) return { ok: false, reason: 'index' };
  if (from !== null && to !== null && from > to) return { ok: false, reason: 'backwards' };
  return { ok: true, from, to };
}

/**
 * Null for absent, undefined for a value that is not a turn index.
 *
 * Read one character at a time rather than by a pattern, because this module
 * holds the closed route table and `conformance:pocket` R1 refuses any pattern
 * in it: digits only, no leading zero but `0` itself, and a safe integer.
 */
function turnIndexOf(value: string | null | undefined): number | null | undefined {
  if (value === null || value === undefined || value.length === 0) return null;
  for (const ch of value) {
    if (ch < '0' || ch > '9') return undefined;
  }
  if (value.length > 1 && value.charAt(0) === '0') return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : undefined;
}

/**
 * The name a project is drawn under, falling back to the folder the path points
 * at. A session whose project tab was closed is still blocked and still
 * deserves a name — `../tray/attention.ts` says the same thing in the same
 * words, and this is the only part of that module's label this door re-spells,
 * because the door needs the two halves separately and the menu needs them
 * joined.
 */
function projectNameOf(projects: readonly Project[], path: string): string {
  for (const project of projects) if (project.path === path) return project.name;
  const cut = path.replace(/\/+$/, '');
  const at = cut.lastIndexOf('/');
  return at === -1 ? cut : cut.slice(at + 1);
}

// ---------------------------------------------------------------------------
// The Sessions tab (Phase 316.7, build/p3167/SPEC.md §6.2)
// ---------------------------------------------------------------------------

/** Why a sessions query was refused. A word, never a value. */
export type PocketSessionsQueryRefusal = 'parameter' | 'repeated' | 'word' | 'id';

/** The five names a sessions query may carry, and no other. */
const SESSIONS_QUERY_NAMES: readonly string[] = ['show', 'group', 'sort', 'agent', 'machine'];

/**
 * Whether a value is an id a sessions query may name: a letter `a`-`z` first,
 * then letters, digits or `-`, 1 to 32 characters in all. That is the shape
 * `src/shared/machines.ts` and `src/shared/agent-overlay.ts` both declare for
 * an id (`^[a-z][a-z0-9-]{0,31}$`).
 *
 * READ ONE CHARACTER AT A TIME, never by a pattern, because this module holds
 * the closed route table and `conformance:pocket` R1 refuses any pattern in it.
 * ONE function, called by the query reader AND by the menu's agent and machine
 * choices, so the menu never offers a choice the query would refuse
 * (SPEC §15 F8): an agent the manifest stored under some other spelling keeps
 * its rows listed, and no filter names it.
 */
export function isSessionsId(value: string): boolean {
  if (value.length < 1 || value.length > 32) return false;
  for (let at = 0; at < value.length; at += 1) {
    const ch = value.charAt(at);
    const letter = ch >= 'a' && ch <= 'z';
    if (at === 0) {
      if (!letter) return false;
      continue;
    }
    const digit = ch >= '0' && ch <= '9';
    if (!letter && !digit && ch !== '-') return false;
  }
  return true;
}

/**
 * A closed word, compared for EQUALITY with its list: the word, the default
 * when the parameter is absent, or undefined when it is anything else (an
 * empty value included).
 */
function closedWord<W extends string>(
  value: string | null,
  words: readonly W[],
  absent: W
): W | undefined {
  if (value === null) return absent;
  for (const word of words) {
    if (word === value) return word;
  }
  return undefined;
}

/**
 * An id parameter: null when absent, undefined when it is not an id. `local`,
 * the word for this Mac, IS an id of that shape, so `machine=local` is read by
 * the same walk and needs no second rule.
 */
function idParameter(value: string | null): string | null | undefined {
  if (value === null) return null;
  return isSessionsId(value) ? value : undefined;
}

/**
 * The words a `/v1/sessions` query asks with, or why it is refused (D3).
 *
 * Five closed parameters, each at most once. `show`, `group` and `sort` are one
 * of the contract's words, and absent reads the contract's default; `agent` and
 * `machine` are ids (see {@link isSessionsId}), and `machine=local` is this
 * Mac; absent is no filter. An unknown parameter, a
 * repeated one, an empty value, a word not in its list or a malformed id
 * REFUSES the request whole, and the route answers it as it answers an unknown
 * id. Never a fallback, because a fallback draws a list the phone did not ask
 * for. `URLSearchParams` has already decoded every percent-escape, so an
 * escaped closed word is that word. No parameter carries free text.
 */
export function readSessionsQuery(
  query: URLSearchParams
): { ok: true; asked: PocketSessionsAsked } | { ok: false; reason: PocketSessionsQueryRefusal } {
  const seen = new Set<string>();
  for (const name of query.keys()) {
    if (!SESSIONS_QUERY_NAMES.includes(name)) return { ok: false, reason: 'parameter' };
    if (seen.has(name)) return { ok: false, reason: 'repeated' };
    seen.add(name);
  }
  const show = closedWord(query.get('show'), POCKET_SESSIONS_SHOW, POCKET_SESSIONS_DEFAULT.show);
  const group = closedWord(query.get('group'), POCKET_SESSIONS_GROUP, POCKET_SESSIONS_DEFAULT.group);
  const sort = closedWord(query.get('sort'), POCKET_SESSIONS_SORT, POCKET_SESSIONS_DEFAULT.sort);
  if (show === undefined || group === undefined || sort === undefined) {
    return { ok: false, reason: 'word' };
  }
  const agent = idParameter(query.get('agent'));
  const machine = idParameter(query.get('machine'));
  if (agent === undefined || machine === undefined) return { ok: false, reason: 'id' };
  return { ok: true, asked: { show, group, sort, agent, machine } };
}

/**
 * THE ONE CLIP for a string main does not already cap (D5): a session's name,
 * a group's label and folder, an agent's and a machine's label. Past
 * {@link POCKET_SESSIONS_CLIP_CHARS} UTF-16 units it keeps one unit fewer,
 * steps back one more when the last unit kept is the high half of a pair, so
 * a character is never cut in two, and marks the cut with `…`. The question is
 * NOT clipped here: main capped it once, in `../activity/screen.ts`, and a
 * second cap would be a second truth about what a person sees.
 */
export function clipSessionText(text: string): string {
  const cap = POCKET_SESSIONS_CLIP_CHARS;
  if (text.length <= cap) return text;
  let keep = cap - 1;
  const last = text.charCodeAt(keep - 1);
  if (last >= 0xd800 && last <= 0xdbff) keep -= 1;
  return `${text.slice(0, keep)}…`;
}

/**
 * A group's id: the first 16 base64url characters of sha256 of its key. The
 * same for one folder on one machine across answers and choices, so a phone
 * can remember which groups a person opened, and never the path itself (D7).
 */
function sessionsGroupId(key: string): string {
  return createHash('sha256').update(key).digest('base64url').slice(0, 16);
}

/** The sheet's tab map, empty: a phone has no tabs, so no group comes first. */
const NO_TABS: ReadonlyMap<string, number> = new Map<string, number>();

/** A tie between two sessions, broken by the id, byte for byte. */
function byId(a: Session, b: Session): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Name: the sheet's comparison of a name (`view.ts`), the id breaking a tie. */
function byNameThenId(a: Session, b: Session): number {
  const byName = a.name.localeCompare(b.name);
  return byName !== 0 ? byName : byId(a, b);
}

/**
 * Oldest first: creation ascending. A `createdAt` that is not above 0 is no
 * clock, the sheet's rule, and sorts last; the id breaks every tie.
 */
function byCreatedThenId(a: Session, b: Session): number {
  const ca = a.createdAt > 0 ? a.createdAt : null;
  const cb = b.createdAt > 0 ? b.createdAt : null;
  if (ca !== null && cb === null) return -1;
  if (ca === null && cb !== null) return 1;
  if (ca !== null && cb !== null && ca !== cb) return ca - cb;
  return byId(a, b);
}

/** The menu's choices, by their drawn label, the id breaking a tie. */
function byChoiceLabel(a: PocketSessionsChoice, b: PocketSessionsChoice): number {
  const byLabel = (a.label ?? '').localeCompare(b.label ?? '');
  if (byLabel !== 0) return byLabel;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** At most {@link POCKET_SESSIONS_CHOICES_MAX} choices of one kind (D4). */
function firstChoices(list: readonly PocketSessionsChoice[]): PocketSessionsChoice[] {
  return list.slice(0, POCKET_SESSIONS_CHOICES_MAX);
}

/** One group over every listed session, before the words choose its rows. */
interface SessionsPlace {
  id: string;
  /** Drawn: clipped. */
  label: string;
  /** Drawn: clipped; null on this Mac. */
  machine: string | null;
  /** Drawn: clipped; null unless another group shares label and machine. */
  folder: string | null;
}

// ---------------------------------------------------------------------------
// The Screen (Phase 337, build/p337/SPEC.md §5.3.1)
// ---------------------------------------------------------------------------

/**
 * Whether a session has a screen (D32): running, idle, or waiting on a person,
 * which is the ONE live partition Tortie already spells, `sessionActionGates`'s
 * `live`, read here and never listed again. `conformance:manager` T23 holds
 * the session domain and this file to that one live-status set (Phase 303: a
 * second spelling is one more place for the two to drift apart), so the Screen
 * asks the gates rather than naming statuses. Declared ONCE; `session()` reads
 * it for the answer's `screen` field and the watcher (`../screen/watch.ts`) for
 * whether a row has a screen to read. A row in any other status (unknown,
 * exited, restorable, discarded) offers no Screen, and the watcher answers it
 * `ended`.
 */
export function screenLive(session: Session): boolean {
  return sessionActionGates(session, session.status, DOOR_GATE_ENV).live;
}

/** The two names a screen query may carry, and no other (D2). */
const SCREEN_QUERY_NAMES: readonly string[] = ['id', 'since'];

/** A revision: 12 lowercase hex (D14). */
const SCREEN_REVISION_CHARS = 12;

/** A window's mark, the answer's `dialog`: `hashScreen`'s 12 lowercase hex (D16). */
const SCREEN_MARK_CHARS = 12;

/**
 * The longest id a screen query may name. Tortie's session ids are UUIDs (36
 * characters), and the writes read a session id of 1 to 128 characters
 * (`./writes.ts`), so the same bound holds here. The id is only ever compared
 * for EQUALITY with a listed session's, so a value nobody has is answered as
 * an unknown id is.
 */
const SCREEN_ID_MAX_CHARS = 128;

/** Why a screen query was refused. A word, never a value. */
export type PocketScreenQueryRefusal = 'parameter' | 'repeated' | 'id' | 'since';

/**
 * Exactly `chars` lowercase hex, read one character at a time rather than by a
 * pattern (`conformance:pocket` R1 refuses any pattern in this module).
 */
function isLowerHexOf(value: string, chars: number): boolean {
  if (value.length !== chars) return false;
  for (const ch of value) {
    const digit = ch >= '0' && ch <= '9';
    const lower = ch >= 'a' && ch <= 'f';
    if (!digit && !lower) return false;
  }
  return true;
}

/** A colour the Mac resolved (D12): `#` and exactly six lowercase hex. */
function isScreenColour(value: unknown): value is string {
  return typeof value === 'string' && value.length === 7 && value.charAt(0) === '#' && isLowerHexOf(value.slice(1), 6);
}

/** A whole number in `[min, max]`. */
function wholeIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

/**
 * What a `/v1/screen` query asks, or why it is refused (D2): `id` exactly once,
 * 1 to {@link SCREEN_ID_MAX_CHARS} characters, and `since` at most once, absent
 * or {@link SCREEN_REVISION_CHARS} lowercase hex. Anything else in the query
 * (another name, a repeat, a `since` of another shape) refuses the request
 * whole, and the route answers it as it answers an unknown id. No size, no
 * width and no height: the phone never sizes the Mac (D7, his ruling 2).
 */
export function readScreenQuery(
  query: URLSearchParams
): { ok: true; id: string; since: string | null } | { ok: false; reason: PocketScreenQueryRefusal } {
  const seen = new Set<string>();
  for (const name of query.keys()) {
    if (!SCREEN_QUERY_NAMES.includes(name)) return { ok: false, reason: 'parameter' };
    if (seen.has(name)) return { ok: false, reason: 'repeated' };
    seen.add(name);
  }
  const id = query.get('id');
  if (id === null || id.length < 1 || id.length > SCREEN_ID_MAX_CHARS) return { ok: false, reason: 'id' };
  const since = query.get('since');
  if (since !== null && !isLowerHexOf(since, SCREEN_REVISION_CHARS)) return { ok: false, reason: 'since' };
  return { ok: true, id, since };
}

/** Main's words for each absence, the one map from the word to its sentence. */
const SCREEN_ABSENCE_SENTENCES: Readonly<Record<PocketScreenAbsence, string>> = Object.freeze({
  ended: SCREEN_ENDED,
  unreachable: SCREEN_UNREACHABLE,
  large: SCREEN_TOO_LARGE
});

/** `why`, compared for EQUALITY with the three words, or null. */
function screenAbsenceOf(value: unknown): PocketScreenAbsence | null {
  return value === 'ended' || value === 'unreachable' || value === 'large' ? value : null;
}

/** One style, copied field by field (D12), or null when it is not one. */
function screenStyleOf(style: PocketScreenStyle): PocketScreenStyle | null {
  if (typeof style !== 'object' || style === null) return null;
  if (!isScreenColour(style.fg) || !(style.bg === null || isScreenColour(style.bg))) return null;
  const flags = [style.bold, style.dim, style.italic, style.underline, style.strike];
  if (!flags.every((flag) => typeof flag === 'boolean')) return null;
  return {
    fg: style.fg,
    bg: style.bg,
    bold: style.bold,
    dim: style.dim,
    italic: style.italic,
    underline: style.underline,
    strike: style.strike
  };
}

/**
 * The screen, copied FIELD BY FIELD with fresh arrays (D13), the contract's
 * caps held again (D15): past any one of them the answer is `large`, and a
 * value of the wrong shape is null, so nothing the watcher's object carries
 * beyond these fields, and nothing the phone's decoder would refuse whole, can
 * leave. Each cap is read once.
 */
function screenBodyOf(screen: PocketScreen): PocketScreen | 'large' | null {
  if (typeof screen !== 'object' || screen === null) return null;
  const { cols, rows } = screen;
  if (!wholeIn(cols, 1, Number.MAX_SAFE_INTEGER) || !wholeIn(rows, 1, Number.MAX_SAFE_INTEGER)) return null;
  if (cols > POCKET_SCREEN_MAX_COLS || rows > POCKET_SCREEN_MAX_ROWS) return 'large';
  const cursor = screen.cursor;
  if (typeof cursor !== 'object' || cursor === null) return null;
  if (!wholeIn(cursor.x, 0, cols) || !wholeIn(cursor.y, 0, rows - 1) || typeof cursor.visible !== 'boolean') return null;
  if (typeof screen.alternate !== 'boolean' || typeof screen.asking !== 'boolean' || typeof screen.typable !== 'boolean') {
    return null;
  }
  if (!isScreenColour(screen.ground) || !isScreenColour(screen.ink) || !isScreenColour(screen.caret)) return null;
  if (typeof screen.turn !== 'string' || screen.turn.length === 0) return null;
  if (!(screen.dialog === null || (typeof screen.dialog === 'string' && isLowerHexOf(screen.dialog, SCREEN_MARK_CHARS)))) return null;
  if (!Array.isArray(screen.styles)) return null;
  if (screen.styles.length > POCKET_SCREEN_MAX_STYLES) return 'large';
  const styles: PocketScreenStyle[] = [];
  for (const style of screen.styles) {
    const copied = screenStyleOf(style);
    if (copied === null) return null;
    styles.push(copied);
  }
  if (!Array.isArray(screen.lines) || screen.lines.length !== rows) return null;
  const lines: PocketScreenRun[][] = [];
  let runs = 0;
  for (const line of screen.lines) {
    if (!Array.isArray(line)) return null;
    const row: PocketScreenRun[] = [];
    let used = 0;
    for (const run of line) {
      if (typeof run !== 'object' || run === null || typeof run.text !== 'string') return null;
      if (!wholeIn(run.style, 0, styles.length - 1) || !wholeIn(run.cells, 1, cols)) return null;
      used += run.cells;
      if (used > cols) return null;
      row.push({ text: run.text, style: run.style, cells: run.cells });
    }
    runs += row.length;
    lines.push(row);
  }
  if (runs > POCKET_SCREEN_MAX_RUNS) return 'large';
  return {
    cols,
    rows,
    cursor: { x: cursor.x, y: cursor.y, visible: cursor.visible },
    alternate: screen.alternate,
    ground: screen.ground,
    ink: screen.ink,
    caret: screen.caret,
    styles,
    lines,
    turn: screen.turn,
    asking: screen.asking,
    dialog: screen.dialog,
    typable: screen.typable
  };
}

/**
 * THE SCREEN ANSWER AS THE DOOR SERVES IT (D13), composed FIELD BY FIELD from
 * what the watcher answered, so nothing else on its object can ever leave, and
 * its invariants held HERE whatever a watcher says: the session id is the one
 * the query named; the revision is 12 lowercase hex or there is no answer;
 * `unchanged` carries nothing else; `why` is exactly one of three words and
 * its sentence is main's own word for it; a screen past any cap, the whole
 * answer's bytes included, is `large`. Null when there is nothing honest to
 * answer, which the door answers as an unknown id.
 */
export function screenOf(answer: PocketScreenAnswer, sessionId: string, fallbackAt: number): PocketScreenAnswer | null {
  if (typeof answer !== 'object' || answer === null) return null;
  const revision = answer.revision;
  if (typeof revision !== 'string' || !isLowerHexOf(revision, SCREEN_REVISION_CHARS)) return null;
  const at = typeof answer.at === 'number' && Number.isFinite(answer.at) ? answer.at : fallbackAt;
  const absent = (why: PocketScreenAbsence): PocketScreenAnswer => ({
    sessionId,
    revision,
    at,
    unchanged: false,
    screen: null,
    why,
    sentence: SCREEN_ABSENCE_SENTENCES[why]
  });
  if (answer.unchanged === true) {
    return { sessionId, revision, at, unchanged: true, screen: null, why: null, sentence: null };
  }
  if (answer.unchanged !== false) return null;
  if (answer.why !== null) {
    const why = screenAbsenceOf(answer.why);
    return why === null ? null : absent(why);
  }
  const screen = screenBodyOf(answer.screen as PocketScreen);
  if (screen === null) return null;
  if (screen === 'large') return absent('large');
  const composed: PocketScreenAnswer = { sessionId, revision, at, unchanged: false, screen, why: null, sentence: null };
  // The whole answer's bytes, as the door will send them, under the cap.
  if (Buffer.byteLength(JSON.stringify(composed), 'utf8') > POCKET_SCREEN_MAX_BYTES) return absent('large');
  return composed;
}

/** The five answers. Holds no state; composes on every call. */
export function createPocketRoutes(facts: PocketFacts): {
  blocked(): PocketBlockedAnswer;
  session(sessionId: string): Promise<PocketSessionAnswer | null>;
  turns(
    sessionId: string,
    query: { limit?: string | null; from?: string | null; to?: string | null }
  ): Promise<PocketTurnsAnswer | null>;
  sessions(query: URLSearchParams): PocketSessionsAnswer | null;
  screen(query: URLSearchParams, closing: () => boolean): Promise<PocketScreenAnswer | null>;
} {
  const now = (): number => facts.now?.() ?? Date.now();

  const sessionById = (id: string): Session | undefined =>
    facts.sessions().find((s) => s.id === id);

  /**
   * FRESH BEFORE READ. The one refresh, asked before anything reads the
   * conversation. It yields, so the caller looks the session up again after it.
   * A refresh that throws is answered as "could not ask": the store keeps what
   * it held and the answer says nothing about counts, which is what
   * `refreshRowForActivity` already does for one bad row.
   */
  const refresh = async (sessionId: string): Promise<OverviewSessionActivity | null> => {
    if (facts.refresh === undefined) return null;
    try {
      return await facts.refresh(sessionId);
    } catch {
      return null;
    }
  };

  /**
   * PHASE 318. What the phone may press or send on one session, asked of the
   * reply's reader ONCE and composed field by field. It never rejects: no
   * reader, or a reader that throws or rejects, reads the empty offer, and the
   * session read still answers.
   */
  const replyFor = async (session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer> => {
    let offer: PocketReplyOffer = POCKET_NO_REPLY;
    if (facts.replyOffer !== undefined) {
      try {
        offer = await facts.replyOffer(session, drawn);
      } catch {
        offer = POCKET_NO_REPLY;
      }
    }
    if (typeof offer !== 'object' || offer === null) offer = POCKET_NO_REPLY;
    return replyOf(offer, drawn);
  };

  return {
    blocked(): PocketBlockedAnswer {
      const at = now();
      const sessions = facts.sessions();
      const projects = facts.projects();
      // The ORDER and the SET are `attentionRows`'s, not this module's. It
      // filters `needs_input` across every project and sorts newest-blocked
      // first, and it is what already drives the menu-bar sentinel.
      const stamps = facts.blockedSince();
      const ordered = attentionRows(sessions, projects, stamps);
      const byId = new Map(sessions.map((s) => [s.id, s]));
      const rows: PocketBlockedRow[] = [];
      const blockedIds = new Set<string>();
      for (const row of ordered) {
        const session = byId.get(row.sessionId);
        if (session === undefined) continue;
        blockedIds.add(session.id);
        rows.push(
          rowOf(facts, session, projectNameOf(projects, session.projectPath), row.since, at)
        );
      }
      // EVERY OTHER LISTED SESSION (Phase 316). The complement of the set
      // above, by id, so a session is in exactly one of the two lists.
      const rest = sessions
        .filter((s) => !blockedIds.has(s.id))
        .sort(othersOrder(facts));
      const others = rest
        .slice(0, POCKET_OTHERS_MAX)
        .map((session) =>
          rowOf(
            facts,
            session,
            projectNameOf(projects, session.projectPath),
            stamps.get(session.id) ?? session.createdAt,
            at
          )
        );
      return {
        rows,
        others,
        othersOmitted: rest.length - others.length,
        at,
        emptyLine: facts.emptyLine,
        ageNote: POCKET_AGE_HONESTY
      };
    },

    async session(sessionId: string): Promise<PocketSessionAnswer | null> {
      if (sessionById(sessionId) === undefined) return null;
      const activity = await refresh(sessionId);
      // AGAIN, after the yield: removed while the request was in flight is
      // answered as an id nobody has, and nothing of it is read.
      const session = sessionById(sessionId);
      if (session === undefined) return null;
      const at = now();
      const since = facts.blockedSince().get(session.id) ?? session.createdAt;
      const base = rowOf(
        facts,
        session,
        projectNameOf(facts.projects(), session.projectPath),
        since,
        at
      );
      // PHASE 318. The reply offer, asked beside the conversation reads and
      // HANDED WHAT THIS ANSWER DRAWS (build/p318/SPEC.md §Revision R1): the
      // very question and options `base` carries, so a press is offered only
      // over the question the person will see. Started now, so it overlaps
      // the reads below; it never rejects.
      const replying = replyFor(session, { question: base.question, choices: base.choices });
      // A read that throws (a store that will not open) is answered as nothing
      // to answer, never left hanging: `./bind.ts` swallows a rejected handler
      // without ending the response, and a phone would wait out the timeout.
      let catchUp: PocketCatchUp | null;
      let last: { answerText: string | null; turnCount: number };
      try {
        [catchUp, last] = await Promise.all([
          facts.catchUp(session.id),
          facts.lastTurn(session.id)
        ]);
      } catch {
        return null;
      }
      const lastMessageAt = activity?.lastMessageAt;
      const reply = await replying;
      const detail: PocketSessionDetail = {
        ...base,
        catchUp,
        lastAnswer: last.answerText,
        turnCount: last.turnCount,
        handoff: facts.handoff(session),
        activity,
        // Null exactly when the counts carry no time, so a client draws the
        // session manager's dash and word for it and never a zero.
        lastMessageText:
          typeof lastMessageAt === 'number' ? formatAge(lastMessageAt, at) : null,
        // PHASE 317. The Mac's own End confirmation, word for word: the shared
        // composer over main's own row, and only when End is offered on it, so
        // a client never draws an End whose words it would have to make up.
        endConfirm: base.end?.state === 'offered' ? endConfirmOf(session) : null,
        // PHASE 318. Always set, field by field (`replyOf`), so a client never
        // draws a button or a box main did not offer on this very answer.
        reply,
        // PHASE 337 (build/p337/SPEC.md D32). Always set, in this one place:
        // true exactly when this Mac answers `/v1/screen` and the session is
        // live, so the phone draws a Screen row only where one can open.
        screen: facts.screen !== undefined && screenLive(session)
      };
      return { session: detail, at };
    },

    async turns(
      sessionId: string,
      query: { limit?: string | null; from?: string | null; to?: string | null }
    ): Promise<PocketTurnsAnswer | null> {
      const known = sessionById(sessionId);
      if (known === undefined) return null;
      const asked = Number(query.limit ?? '');
      // CLAMPED HERE. Anything that is not a finite positive number falls back
      // to the default, and anything above the store's own cap is cut down to
      // it — so no query can make one answer carry a whole conversation.
      const limit =
        Number.isFinite(asked) && asked > 0
          ? Math.min(Math.floor(asked), MAX_TURN_LIMIT)
          : POCKET_DEFAULT_TURN_LIMIT;
      // The page is checked BEFORE anything is read, and a page that is not a
      // page is refused rather than guessed at (see readTurnRange).
      const range = readTurnRange(query);
      if (!range.ok) return null;
      if (known.machine !== undefined) {
        // A session on another machine: its conversation is on that machine.
        // That is an answer with main's own sentence, never an error, and
        // nothing on this Mac is read or refreshed for it.
        return { sessionId, turns: [], more: false, at: now(), note: OUTCOME_REMOTE };
      }
      await refresh(sessionId);
      // AGAIN, after the yield (see `session`).
      if (sessionById(sessionId) === undefined) return null;
      let answered: { turns: PocketTurn[]; more: boolean };
      try {
        answered = await facts.turns(sessionId, {
          limit,
          from: range.from,
          to: range.to
        });
      } catch {
        // See `session`: answered, never left hanging.
        return null;
      }
      return {
        sessionId,
        turns: answered.turns,
        // The door's promise, held here whatever a composer says: an empty
        // page never tells a client to go on.
        more: answered.turns.length > 0 && answered.more,
        at: now(),
        note: null
      };
    },

    /**
     * EVERY LISTED SESSION, shown, grouped and sorted as the phone asked
     * (Phase 316.7, build/p3167/SPEC.md §6.2). SYNCHRONOUS: nothing is awaited
     * and no conversation is read, so the list is ONE reading of main's state,
     * and a session removed before this runs is in no answer composed after.
     */
    sessions(query: URLSearchParams): PocketSessionsAnswer | null {
      // 1. The words, or a refusal answered exactly as an unknown id is.
      const read = readSessionsQuery(query);
      if (!read.ok) return null;
      const asked = read.asked;
      // 2. One reading of each fact. The session list is read ONCE, so every
      //    count below and every row is cut from the same list.
      const at = now();
      const sessions = facts.sessions();
      const projects = facts.projects();
      const stamps = facts.blockedSince();

      // 4. THE GROUPS, OVER EVERY LISTED SESSION (D7), by the session
      //    manager's own collection, label and order, so a group reads the
      //    same under every choice. The machine labeller is the door's.
      const drafts = collectSessionGroups(sessions, (session) => facts.machineLabel(session));
      const placeOf = new Map<Session, SessionsPlace>();
      const unordered = drafts.map((draft) => {
        const { identity } = draft;
        const target = identity.target;
        const open =
          target === null
            ? undefined
            : projects.find((project) => sameTarget(targetOfProject(project), target));
        const label = sessionGroupLabel(firstNamed(open?.name), draft.closedName, identity.path);
        const place: SessionsPlace = {
          id: sessionsGroupId(identity.key),
          label: clipSessionText(label),
          machine: draft.machineLabel === null ? null : clipSessionText(draft.machineLabel),
          folder: null
        };
        for (const member of draft.members) placeOf.set(member.session, place);
        return { key: identity.key, label, place, path: identity.path, machineId: identity.machineId };
      });
      // The sheet's comparator over the sheet's label, with no tab first.
      unordered.sort((a, b) => compareSessionGroups(a, b, NO_TABS));
      const places = unordered.map((one) => one.place);
      // The folder, ONLY where two groups would otherwise draw alike: the same
      // drawn label on the same drawn machine, over the whole list.
      const alike = (place: SessionsPlace): string => JSON.stringify([place.label, place.machine]);
      const drawnAlike = new Map<string, number>();
      for (const place of places) drawnAlike.set(alike(place), (drawnAlike.get(alike(place)) ?? 0) + 1);
      for (const one of unordered) {
        if ((drawnAlike.get(alike(one.place)) ?? 0) < 2) continue;
        one.place.folder = clipSessionText(displayPath(one.path, one.machineId ?? undefined));
      }

      // 3 and 5. What Show keeps (the gates' own partition, D8), and the
      //    machine each row is on: its target's machine, `local` for this Mac,
      //    which is the groups' own rule, so the filter and the groups agree.
      interface Shown {
        session: Session;
        place: SessionsPlace;
        machineId: string | null;
        active: boolean;
      }
      const shown: Shown[] = [];
      for (const session of sessions) {
        const place = placeOf.get(session);
        if (place === undefined) continue;
        const gates = sessionActionGates(session, session.status, DOOR_GATE_ENV);
        if (!lifecycleKeeps(asked.show, gates)) continue;
        shown.push({
          session,
          place,
          machineId: sessionGroupIdentity(session).target?.machineId ?? null,
          active: lifecycleKeeps('active', gates)
        });
      }

      // 5. The menu's choices, over what Show keeps and before the filters,
      //    offering only ids the query can name (§15 F8).
      const agentSeen = new Set<string>();
      const agentChoices: PocketSessionsChoice[] = [];
      const machineLabels = new Map<string, string | null>();
      let onThisMac = false;
      for (const one of shown) {
        const agent = one.session.agent;
        if (!agentSeen.has(agent) && isSessionsId(agent)) {
          agentSeen.add(agent);
          agentChoices.push({ id: agent, label: clipSessionText(facts.agentLabel(agent)) });
        }
        const machine = one.machineId;
        if (machine === null) continue;
        if (machine === LOCAL_MACHINE_ID) {
          onThisMac = true;
          continue;
        }
        if (!isSessionsId(machine)) continue;
        // The first label a row on that machine draws names it.
        if ((machineLabels.get(machine) ?? null) === null) {
          machineLabels.set(machine, facts.machineLabel(one.session));
        }
      }
      agentChoices.sort(byChoiceLabel);
      const machineChoices: PocketSessionsChoice[] = [...machineLabels].map(([id, label]) => ({
        id,
        label: clipSessionText(label ?? id)
      }));
      machineChoices.sort(byChoiceLabel);
      if (onThisMac) machineChoices.unshift({ id: LOCAL_MACHINE_ID, label: null });

      // 6. The filters. Kept = Show and the filters.
      const kept = shown.filter(
        (one) =>
          (asked.agent === null || one.session.agent === asked.agent) &&
          (asked.machine === null || one.machineId === asked.machine)
      );
      const keptSessions = kept.map((one) => one.session);

      // 7. THE PRIORITY is today's list's order over everything kept: the
      //    waiting rows in `attentionRows`' order, then `othersOrder`, the same
      //    two functions `blocked()` reads. Recent activity IS that order.
      const keptById = new Map(keptSessions.map((s) => [s.id, s]));
      const waitingRows: Session[] = [];
      const waitingIds = new Set<string>();
      for (const row of attentionRows(keptSessions, projects, stamps)) {
        const session = keptById.get(row.sessionId);
        if (session === undefined) continue;
        waitingIds.add(session.id);
        waitingRows.push(session);
      }
      const priority: Session[] = [
        ...waitingRows,
        ...keptSessions.filter((s) => !waitingIds.has(s.id)).sort(othersOrder(facts))
      ];
      // The order drawn: the sort inside each group, groups never reordering.
      const sorted =
        asked.sort === 'recent'
          ? priority
          : asked.sort === 'name'
            ? [...keptSessions].sort(byNameThenId)
            : [...keptSessions].sort(byCreatedThenId);
      const keptOf = new Map(kept.map((one) => [one.session, one]));
      let display: Session[] = sorted;
      if (asked.group === 'project') {
        // A stable partition of the sort, group by group in the groups' order.
        const inPlace = new Map<SessionsPlace, Session[]>();
        for (const session of sorted) {
          const place = keptOf.get(session)?.place;
          if (place === undefined) continue;
          const list = inPlace.get(place);
          if (list === undefined) inPlace.set(place, [session]);
          else list.push(session);
        }
        display = places.flatMap((place) => inPlace.get(place) ?? []);
      }

      // Each group's facts under the words: its kept rows, whether any waits,
      // whether any is active.
      const keptIn = new Map<SessionsPlace, { count: number; waiting: boolean; active: boolean }>();
      for (const one of kept) {
        const was = keptIn.get(one.place) ?? { count: 0, waiting: false, active: false };
        keptIn.set(one.place, {
          count: was.count + 1,
          waiting: was.waiting || one.session.status === 'needs_input',
          active: was.active || one.active
        });
      }
      const groupOf = (place: SessionsPlace, drawn: number): PocketSessionsGroup => {
        const under = keptIn.get(place) ?? { count: 0, waiting: false, active: false };
        return {
          id: place.id,
          label: place.label,
          machine: place.machine,
          folder: place.folder,
          count: under.count,
          omitted: under.count - drawn,
          waiting: under.waiting,
          collapsed: asked.show === 'all' && !under.active
        };
      };

      // 8. One row, aged by the clock that placed it (D11). One clock is never
      //    drawn as another: a creation age says `old`, a row with no clock is
      //    null, and a waiting row's wait comes from its STAMP alone, never
      //    from `attentionRows`' `since`, which falls back to the creation
      //    clock and would draw it bare as a wait (§15 F1).
      const sessionsRow = (session: Session, group: number): PocketSessionsRow => {
        const activity = facts.activity(session.id);
        const word = facts.statusWord(session);
        const waiting = session.status === 'needs_input';
        const created = session.createdAt > 0 ? createdOld(formatAge(session.createdAt, at)) : null;
        const stamp = stamps.get(session.id);
        const lastOutput = activity?.lastActivityAt;
        const ageText =
          asked.sort === 'oldest'
            ? created
            : waiting && stamp !== undefined
              ? formatAge(stamp, at)
              : !waiting && typeof lastOutput === 'number' && Number.isFinite(lastOutput)
                ? formatAge(lastOutput, at)
                : created;
        const question = activity?.question;
        const machine = facts.machineLabel(session);
        return {
          sessionId: session.id,
          name: clipSessionText(session.name),
          group,
          machine: machine === null ? null : clipSessionText(machine),
          statusDot: word.dot,
          statusTitle: raisedLabel(word.label),
          ageText,
          waiting,
          question: waiting && typeof question === 'string' && question.length > 0 ? question : null,
          end: facts.endOffer?.(session) ?? NO_END
        };
      };

      // 9. CHOOSE BY PRIORITY, THEN EMIT IN ORDER (§15 F2). The caps keep a
      //    PREFIX of the priority whatever the words drawn, so no cap drops a
      //    session that needs input while one that does not is drawn. A row is
      //    measured as its JSON with its group index at the number of groups,
      //    which bounds every index's digits; a group, the first time one of
      //    its rows is chosen, as its JSON with `omitted` at its count. Rows are
      //    built only as they are walked, so the End offers never grow with the
      //    list.
      const chosen = new Map<Session, PocketSessionsRow>();
      const measured = new Set<SessionsPlace>();
      let bytes = 0;
      for (const session of priority) {
        if (chosen.size >= POCKET_SESSIONS_MAX) break;
        const place = keptOf.get(session)?.place;
        if (place === undefined) continue;
        const row = sessionsRow(session, places.length);
        let cost = Buffer.byteLength(JSON.stringify(row));
        if (!measured.has(place)) cost += Buffer.byteLength(JSON.stringify(groupOf(place, 0)));
        if (bytes + cost > POCKET_SESSIONS_BUDGET_BYTES) break;
        bytes += cost;
        measured.add(place);
        chosen.set(session, row);
      }
      const drawnIn = new Map<SessionsPlace, number>();
      for (const session of chosen.keys()) {
        const place = keptOf.get(session)?.place;
        if (place !== undefined) drawnIn.set(place, (drawnIn.get(place) ?? 0) + 1);
      }
      // Emitted in the order drawn. A group is pushed the first time one of its
      // rows is emitted, and that row's `group` is the length `groups` had then.
      const rows: PocketSessionsRow[] = [];
      const groups: PocketSessionsGroup[] = [];
      const indexOf = new Map<SessionsPlace, number>();
      for (const session of display) {
        const row = chosen.get(session);
        const place = keptOf.get(session)?.place;
        if (row === undefined || place === undefined) continue;
        let index = indexOf.get(place);
        if (index === undefined) {
          index = groups.length;
          groups.push(groupOf(place, drawnIn.get(place) ?? 0));
          indexOf.set(place, index);
        }
        rows.push({ ...row, group: index });
      }
      return {
        asked,
        rows,
        groups,
        agents: firstChoices(agentChoices),
        machines: firstChoices(machineChoices),
        total: sessions.length,
        omitted: kept.length - rows.length,
        at,
        ageNote: POCKET_AGE_HONESTY
      };
    },

    /**
     * ONE SESSION'S SCREEN (Phase 337, build/p337/SPEC.md §5.3.1). The query,
     * then the session by id, then the watcher, which may hold the request as
     * a long poll and ends it at once when `closing()` holds (D3). Its answer
     * is re-composed field by field ({@link screenOf}). A refused query, an id
     * nobody has, a host with no watcher, a watcher that rejects, and a session
     * removed while the request was held, are each answered as an unknown id.
     * A READ: nothing here writes, types or sets a status.
     */
    async screen(query: URLSearchParams, closing: () => boolean): Promise<PocketScreenAnswer | null> {
      const read = readScreenQuery(query);
      if (!read.ok) return null;
      const session = sessionById(read.id);
      if (session === undefined) return null;
      if (facts.screen === undefined) return null;
      let answer: PocketScreenAnswer;
      try {
        answer = await facts.screen(session, read.since, closing);
      } catch {
        // Answered, never left hanging (see `session`).
        return null;
      }
      // AGAIN, after the hold: removed while the request was held is answered
      // as an id nobody has, and nothing of it leaves.
      if (sessionById(session.id) === undefined) return null;
      return screenOf(answer, session.id, now());
    }
  };
}

/** The contract's id list and this table are the same list, checked here. */
export function pocketRouteIdsAgree(): boolean {
  const table = [...pocketRouteIds()].sort().join(',');
  const contract = [...POCKET_ROUTE_IDS].sort().join(',');
  return table === contract;
}
