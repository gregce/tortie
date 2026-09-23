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
 * ## Three questions, and this phase is READ ONLY
 *
 * The blocked list (with, since Phase 316, every other session Tortie lists),
 * one session, and that session's turns. Every answer is composed here in main
 * from what main already computes, and every string a person reads is one main
 * already drew:
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
 *     redacted and already clipped to 4,000 characters by `turn-view.ts`.
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
 * 4. **A request whose source address equals the bind address is refused
 *    before any header is read.** That one is NOT HERE and it is not
 *    `./server.ts`'s either: `./bind.ts` destroys the socket on the
 *    `connection` event, before the TLS handshake and therefore before any
 *    header exists. An earlier draft of this sentence named the handler, which
 *    was wrong in the file and in the moment; `./server.ts`'s own header says
 *    the same thing the right way round.
 *
 * ## What this module does not do
 *
 * It opens no socket and binds nothing. It has no timer. It holds no state at
 * all: every answer is composed from the facts it is handed, at the moment it
 * is asked.
 */

import type { Project, Session } from '@shared/types';
import type { SessionChoiceInfo, SessionChoiceOption } from '@shared/ipc/sessions';
import type { OverviewSessionActivity } from '@shared/overview';
import { formatAge } from '@shared/age';
import { OUTCOME_REMOTE } from '@shared/overview-copy';
import { raisedLabel } from '@shared/status-words';
import {
  POCKET_AGE_HONESTY,
  POCKET_OTHERS_MAX,
  POCKET_ROUTE_IDS,
  type PocketBlockedAnswer,
  type PocketBlockedRow,
  type PocketCatchUp,
  type PocketHandoff,
  type PocketRouteId,
  type PocketSessionAnswer,
  type PocketSessionDetail,
  type PocketTurn,
  type PocketTurnsAnswer
} from '@shared/ipc/pocket';
import { attentionRows, blockedAge, type WakeWindow } from '../tray/attention';
// THE CEILING, IMPORTED RATHER THAN RE-SPELLED. `../overview/turn-view.ts` owns
// the number and this door holds itself to it; a second literal here would be a
// second answer to the same question, and the one that drifted would be the one
// on the network.
import { MAX_TURN_LIMIT } from '../overview/turn-view';

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

export interface PocketRoute {
  readonly id: PocketRouteId;
  readonly method: 'GET' | 'POST';
  /** The exact path. No parameter, no prefix, no wildcard. */
  readonly path: string;
  /**
   * True when answering this route changes nothing on this Mac.
   *
   * IT IS TRUE OF EVERY ROUTE IN THIS PHASE and `build/conformance-pocket.mjs`
   * reads it: a route added with `reads: false` is a write route, and this
   * phase has none. The field exists so that adding one is a visible edit to
   * this table rather than a quiet change inside a handler.
   */
  readonly reads: boolean;
  /** Alive only inside a pairing window a person opened. */
  readonly windowOnly: boolean;
  /** Whether the request must carry a signature from an allowed phone. */
  readonly signed: boolean;
}

/**
 * Every route this door has.
 *
 * IT IS FROZEN, and that is not decoration. A closed table a later round can
 * `push` onto at run time is not a closed table, and "the route table is closed"
 * is one of this phase's promises rather than one of its comments. The freeze is
 * what makes the promise hold against code nobody has written yet.
 *
 * `pair` is the one route that is not signed, because a phone that has not
 * paired yet has no key to sign with. It is sealed instead, under a key derived
 * from the one-shot secret in the QR, and it is dead outside the window — so
 * for almost all of the door's life it is not a route at all.
 */
export const POCKET_ROUTES: readonly PocketRoute[] = Object.freeze([
  { id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: true, signed: false },
  { id: 'blocked', method: 'GET', path: '/v1/blocked', reads: true, windowOnly: false, signed: true },
  { id: 'session', method: 'GET', path: '/v1/session', reads: true, windowOnly: false, signed: true },
  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true }
]);

/**
 * The route for this method and path, or null.
 *
 * Equality on both, and nothing else. A trailing slash, a different case, a
 * path that merely starts with one of these, or any method the table does not
 * name for that path, all answer null.
 */
export function matchPocketRoute(method: string, pathname: string): PocketRoute | null {
  for (const route of POCKET_ROUTES) {
    if (route.method === method && route.path === pathname) return route;
  }
  return null;
}

/** The table and the contract's id list are one list. Read by the gate. */
export function pocketRouteIds(): readonly PocketRouteId[] {
  return POCKET_ROUTES.map((r) => r.id);
}

/** True when every route in the table is a read. This phase: always. */
export function pocketTableIsReadOnly(): boolean {
  return POCKET_ROUTES.every((r) => r.reads);
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
  now?(): number;
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
    ageText: formatAge(agedFrom, at)
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

/** The three answers. Holds no state; composes on every call. */
export function createPocketRoutes(facts: PocketFacts): {
  blocked(): PocketBlockedAnswer;
  session(sessionId: string): Promise<PocketSessionAnswer | null>;
  turns(
    sessionId: string,
    query: { limit?: string | null; from?: string | null; to?: string | null }
  ): Promise<PocketTurnsAnswer | null>;
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
          typeof lastMessageAt === 'number' ? formatAge(lastMessageAt, at) : null
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
    }
  };
}

/** The contract's id list and this table are the same list, checked here. */
export function pocketRouteIdsAgree(): boolean {
  const table = [...pocketRouteIds()].sort().join(',');
  const contract = [...POCKET_ROUTE_IDS].sort().join(',');
  return table === contract;
}
