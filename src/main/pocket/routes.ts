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
 * The blocked list, one session, and that session's turns. Every answer is
 * composed here in main from what main already computes, and every string a
 * person reads is one main already drew:
 *
 *   - the ORDER and the SET come from `../tray/attention.ts`'s own
 *     `attentionRows`, which is what already drives the menu-bar sentinel, so
 *     the phone and the menu bar cannot disagree about who is blocked;
 *   - the status word and its dot come from main's own state through
 *     {@link PocketFacts.statusWord}, never from a second table;
 *   - the question and the numbered options are exactly what Phases 311 and
 *     312 landed on `activity:changed`, already redacted and already capped in
 *     `../activity/screen.ts` at one definition with one call site. NOTHING
 *     HERE CAPS THEM AGAIN: a second cap would be a second place the truth
 *     about what a person sees lives;
 *   - the Catch Me Up line and the turns come from `../overview/`, already
 *     redacted and already clipped to 4,000 characters by `turn-view.ts`.
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
import {
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
  /** The question and the option rows Phases 311 and 312 put on the feed. */
  activity(sessionId: string): {
    question?: string;
    choice?: SessionChoiceInfo;
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
  /** The Catch Me Up line for one session, already built in main. */
  catchUp(sessionId: string): Promise<PocketCatchUp | null>;
  /** The agent's last answer, already redacted and clipped, and the count. */
  lastTurn(sessionId: string): Promise<{ answerText: string | null; turnCount: number }>;
  /** The turns, from the overview store, already redacted and clipped. */
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
  blockedSince: number
): PocketBlockedRow {
  const activity = facts.activity(session.id);
  const word = facts.statusWord(session);
  const question = activity?.question;
  return {
    sessionId: session.id,
    name: session.name,
    project: projectName,
    machine: facts.machineLabel(session),
    agent: session.agent,
    agentLabel: facts.agentLabel(session.agent),
    statusLabel: word.label,
    statusDot: word.dot,
    // An EMPTY STRING is the explicit clear on the feed, so it is a question
    // that is over rather than a question that is empty. Both read as null.
    question: typeof question === 'string' && question.length > 0 ? question : null,
    choices: optionsOf(activity?.choice),
    blockedSince,
    // THE ONE AGE FUNCTION'S ANSWER, never a comparison of this module's own.
    seenAtWake: blockedAge(blockedSince, facts.wakes()).seenAtWake
  };
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

  return {
    blocked(): PocketBlockedAnswer {
      const sessions = facts.sessions();
      const projects = facts.projects();
      // The ORDER and the SET are `attentionRows`'s, not this module's. It
      // filters `needs_input` across every project and sorts newest-blocked
      // first, and it is what already drives the menu-bar sentinel.
      const ordered = attentionRows(sessions, projects, facts.blockedSince());
      const byId = new Map(sessions.map((s) => [s.id, s]));
      const rows: PocketBlockedRow[] = [];
      for (const row of ordered) {
        const session = byId.get(row.sessionId);
        if (session === undefined) continue;
        rows.push(
          rowOf(facts, session, projectNameOf(projects, session.projectPath), row.since)
        );
      }
      return { rows, at: now(), emptyLine: facts.emptyLine };
    },

    async session(sessionId: string): Promise<PocketSessionAnswer | null> {
      const session = sessionById(sessionId);
      if (session === undefined) return null;
      const since = facts.blockedSince().get(session.id) ?? session.createdAt;
      const base = rowOf(
        facts,
        session,
        projectNameOf(facts.projects(), session.projectPath),
        since
      );
      const [catchUp, last] = await Promise.all([
        facts.catchUp(session.id),
        facts.lastTurn(session.id)
      ]);
      const detail: PocketSessionDetail = {
        ...base,
        catchUp,
        lastAnswer: last.answerText,
        turnCount: last.turnCount,
        handoff: facts.handoff(session)
      };
      return { session: detail, at: now() };
    },

    async turns(
      sessionId: string,
      query: { limit?: string | null; from?: string | null; to?: string | null }
    ): Promise<PocketTurnsAnswer | null> {
      const session = sessionById(sessionId);
      if (session === undefined) return null;
      const asked = Number(query.limit ?? '');
      // CLAMPED HERE. Anything that is not a finite positive number falls back
      // to the default, and anything above the store's own cap is cut down to
      // it — so no query can make one answer carry a whole conversation.
      const limit =
        Number.isFinite(asked) && asked > 0
          ? Math.min(Math.floor(asked), MAX_TURN_LIMIT)
          : POCKET_DEFAULT_TURN_LIMIT;
      const from = numberOrNull(query.from);
      const to = numberOrNull(query.to);
      const answered = await facts.turns(sessionId, { limit, from, to });
      return {
        sessionId,
        turns: answered.turns,
        more: answered.more,
        at: now()
      };
    }
  };
}

function numberOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.length === 0) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/** The contract's id list and this table are the same list, checked here. */
export function pocketRouteIdsAgree(): boolean {
  const table = [...pocketRouteIds()].sort().join(',');
  const contract = [...POCKET_ROUTE_IDS].sort().join(',');
  return table === contract;
}
