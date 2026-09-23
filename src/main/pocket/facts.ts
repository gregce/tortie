/**
 * The facts the door answers from, composed for production (Phase 316).
 *
 * `./routes.ts` declares {@link PocketFacts}: a hand-written, narrow type in
 * which EVERY MEMBER IS A READ. Phase 313 built the door against that type and
 * nothing implemented it, so the door could answer nothing real. This module is
 * the one production implementation (`build/p316/SPEC.md` §4 S1 mechanism 1),
 * and each member reads what main already computes, from the one owner of it:
 *
 *   - `sessions` and `projects` are the session core's own lists, exactly what
 *     every surface draws from;
 *   - `blockedSince` is Phase 314's blocked feed (`../tray/blocked-feed.ts`),
 *     the ONE owner of "when did each session start waiting", installed here
 *     when the core first answers so the stamps exist in every launch, the
 *     harness included, and never the tray's private map;
 *   - `wakes` is handed in: the composer builds Phase 314's `WakeMark` over
 *     Electron's `powerMonitor` and passes its `wakes()`;
 *   - `activity` is the map main writes beside the `activity:changed`
 *     broadcast (`../sessions/activity-now.ts`), read through the core;
 *   - `statusWord` is the ONE status table, `statusVisual` in
 *     `src/shared/status-words.ts`, over the session itself;
 *   - `agentLabel` is the registry's display name, and `machineLabel` the label
 *     the machines layer put on the session;
 *   - `emptyLine` is the tray's own string, `NOTHING_NEEDS_YOU`;
 *   - `refresh` is `sessionActivity`, the one read path that brings a row up to
 *     date and answers its counts (mechanism 2);
 *   - `catchUp` is the shared `buildProjectLine` over main's own view of the
 *     session, read from the overview store;
 *   - `lastTurn` and `turns` read the overview store and pass every turn ONCE
 *     through `../overview/turn-view.ts`'s `toTurnView` (mechanism 3);
 *   - `handoff` answers null for every session in Phase 316.
 *
 * ## What this module never does
 *
 * It sets no status: no member here writes anything a session's dot is drawn
 * from. It runs no git command: the Catch Me Up line reads the git verdict the
 * page STORED, exactly as the story's turn read does (`../overview/timeline.ts`),
 * so a phone's question never starts a process. It opens no socket and reads no
 * credential. It never logs, because everything it touches is somebody's
 * conversation or a path under their home.
 */

import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import type { PocketCatchUp, PocketTurn } from '@shared/ipc/pocket';
import type {
  OverviewLineKind,
  OverviewSessionActivity,
  OverviewSessionView
} from '@shared/overview';
import { answerAbsence } from '@shared/overview-copy';
import { buildProjectLine } from '@shared/overview-line';
import { statusVisual } from '@shared/status-words';
import type { AgentRegistryId, Project, Session, SessionStatus } from '@shared/types';
import { getRegistryEntry } from '../agents/registry';
import { sessionActivity } from '../overview/activity';
import type { OverviewServiceDeps } from '../overview/service';
import type { OverviewStore, StoredSession, StoredTurn } from '../overview/store';
import { toTurnView } from '../overview/turn-view';
import { NOTHING_NEEDS_YOU, type WakeWindow } from '../tray/attention';
import { blockedSinceMap, installBlockedFeed } from '../tray/blocked-feed';
import type { PocketFacts } from './routes';

/** What the facts read from the session core. Every member is a read but the feed's slot. */
export interface PocketFactsCore {
  listSessions(): Session[];
  listProjects(): Project[];
  /** What the activity feed last said about one session (`GmuxCore.activityOf`). */
  activityOf(sessionId: string):
    | { question?: string; choice?: SessionChoiceInfo; lastActivityAt?: number }
    | undefined;
  /**
   * The core's one broadcast slot, which Phase 314's blocked feed takes ONCE
   * and fans out. It is here only so the feed can be installed on this core;
   * this module never assigns it itself.
   */
  onSessionsBroadcast: ((sessions: Session[]) => void) | null;
}

/** What the composer hands in. */
export interface PocketFactsDeps {
  /**
   * The session core, or null while it has not booted. Every read answers
   * empty until it has, and the first read after it has installs the blocked
   * feed on it.
   */
  core(): PocketFactsCore | null;
  /** The overview store's reader deps, the ones `overview:activity` is served with. */
  overview: OverviewServiceDeps;
  /** The sleeps this process lived through: Phase 314's `WakeMark.wakes()`. */
  wakes(): readonly WakeWindow[];
  now?(): number;
}

/**
 * Where a session's Catch Me Up line comes from, read off the overview store's
 * row for it.
 *
 * It is the page's own mapping (`../overview/service.ts`, `readOneRow`), asked of
 * the row the last read left behind rather than of a read made here: a session
 * on another machine and a shell are said as such, a record that was read is a
 * line of turns when it holds any, and every other state is the honest line for
 * that state. A row the store has never read has nothing asked yet.
 */
export function pocketLineKind(
  session: Pick<Session, 'agent' | 'machine'>,
  stored: Pick<StoredSession, 'readState'> | null,
  hasTurns: boolean
): OverviewLineKind {
  if (session.machine !== undefined) return 'remote';
  if (session.agent === 'shell') return 'shell';
  if (stored === null) return 'no-turns';
  switch (stored.readState) {
    case 'ok':
      return hasTurns ? 'turns' : 'no-turns';
    case 'no-file':
      return 'no-turns';
    case 'no-store':
      return 'no-store';
    case 'unreadable':
      return 'unreadable';
    case 'wrong-conversation':
      return 'wrong-conversation';
    case 'shell':
      return 'shell';
    case 'remote':
      return 'remote';
  }
}

/**
 * One stored turn as the door answers it: through `toTurnView` ONCE, which is
 * where the clip lives (the text was redacted when the store wrote it), then
 * the git mark left out and the absence sentence added.
 *
 * The git verdict handed to `toTurnView` is the STORED one, as the story's
 * turn read hands it, because this read runs no git command; it is dropped
 * again here because the phone draws no mark.
 */
export function pocketTurnOf(turn: StoredTurn, status: SessionStatus): PocketTurn {
  const view = toTurnView(turn, turn.gitVerdict ?? 'nothing-to-check', false);
  return {
    index: view.index,
    askText: view.askText,
    askClipped: view.askClipped,
    askAt: view.askAt,
    answerText: view.answerText,
    answerClipped: view.answerClipped,
    answerAt: view.answerAt,
    closed: view.closed,
    interrupted: view.interrupted,
    notice: view.notice,
    absence: view.answerText === null ? answerAbsence(view, status) : null
  };
}

/**
 * The turns reader (mechanism 3). No new SQL: the store's own two readers.
 *
 *   - neither end: `listTurns(id, limit)`, the newest `limit` turns;
 *   - either end: `listTurnsBetween(id, from ?? 0, to ?? newest, limit)`, the
 *     newest `limit` turns of that range;
 *   - `more`: `listTurnsBetween(id, 0, first − 1, 1)` holds a row. An empty
 *     page answers false, because there is no first turn to be older than.
 *
 * The range was checked by the route (`readTurnRange`): both ends are safe
 * non-negative integers and `from` is not past `to`.
 */
export function readPocketTurns(
  store: Pick<OverviewStore, 'listTurns' | 'listTurnsBetween'>,
  sessionId: string,
  range: { limit: number; from: number | null; to: number | null },
  status: SessionStatus
): { turns: PocketTurn[]; more: boolean } {
  const rows =
    range.from === null && range.to === null
      ? store.listTurns(sessionId, range.limit)
      : store.listTurnsBetween(
          sessionId,
          range.from ?? 0,
          range.to ?? Number.MAX_SAFE_INTEGER,
          range.limit
        );
  const first = rows[0];
  const more =
    first !== undefined &&
    store.listTurnsBetween(sessionId, 0, first.index - 1, 1).length > 0;
  return { turns: rows.map((turn) => pocketTurnOf(turn, status)), more };
}

/** The registry's drawn name, or the id itself for one it does not know. */
function agentLabelOf(agentId: string): string {
  try {
    return getRegistryEntry(agentId as AgentRegistryId).displayName;
  } catch {
    return agentId;
  }
}

/** The one production composer of the door's facts. */
export function createPocketFacts(deps: PocketFactsDeps): PocketFacts & {
  refresh(sessionId: string): Promise<OverviewSessionActivity | null>;
} {
  const now = (): number => deps.now?.() ?? Date.now();

  /**
   * The core, with the blocked feed installed on it the first time it
   * answers. `installBlockedFeed` is safe to call again and never assigns the
   * slot twice, so the tray installing it later changes nothing here.
   */
  let fedCore: PocketFactsCore | null = null;
  const core = (): PocketFactsCore | null => {
    const found = deps.core();
    if (found !== null && found !== fedCore) {
      fedCore = found;
      installBlockedFeed(found);
    }
    return found;
  };
  // Installed now when the core is already up, so the stamps begin at once.
  core();

  const sessionOf = (sessionId: string): Session | undefined =>
    core()
      ?.listSessions()
      .find((s) => s.id === sessionId);

  return {
    sessions: () => core()?.listSessions() ?? [],
    projects: () => core()?.listProjects() ?? [],
    blockedSince: () => {
      core();
      return blockedSinceMap();
    },
    wakes: () => deps.wakes(),
    activity: (sessionId) => core()?.activityOf(sessionId),
    statusWord: (session) => {
      const word = statusVisual(session.status, session);
      return { dot: word.dot, label: word.label };
    },
    agentLabel: agentLabelOf,
    machineLabel: (session) => session.machine?.label ?? null,
    emptyLine: NOTHING_NEEDS_YOU,

    async refresh(sessionId: string): Promise<OverviewSessionActivity | null> {
      const answer = await sessionActivity(deps.overview, { sessionIds: [sessionId] });
      return answer.sessions.find((row) => row.sessionId === sessionId) ?? null;
    },

    async catchUp(sessionId: string): Promise<PocketCatchUp | null> {
      const session = sessionOf(sessionId);
      if (session === undefined) return null;
      const store = deps.overview.store();
      const newest = store.listTurns(sessionId, 1);
      const stored = store.getSession(sessionId);
      const line = pocketLineKind(session, stored, newest.length > 0);
      const view: OverviewSessionView = {
        sessionId,
        name: session.name,
        agent: session.agent,
        agentLabel: agentLabelOf(session.agent),
        model: stored?.model ?? null,
        branch: stored?.branch ?? null,
        line,
        lineDetail:
          line === 'unreadable' || line === 'wrong-conversation'
            ? (stored?.readDetail ?? null)
            : null,
        askOnly: false,
        noTurnClock: false,
        startedAt: session.createdAt,
        lastTouchedAt: null,
        turns:
          line === 'turns'
            ? newest.map((turn) =>
                toTurnView(turn, turn.gitVerdict ?? 'nothing-to-check', false)
              )
            : [],
        summary: null,
        summaryWrittenAt: null
      };
      const built = buildProjectLine(view, session.status, now());
      return { ask: built.ask, outcome: built.outcome };
    },

    async lastTurn(sessionId: string): Promise<{ answerText: string | null; turnCount: number }> {
      const session = sessionOf(sessionId);
      if (session === undefined) return { answerText: null, turnCount: 0 };
      const store = deps.overview.store();
      const newest = store.listTurns(sessionId, 1);
      const line = pocketLineKind(session, store.getSession(sessionId), newest.length > 0);
      const last = newest[0];
      return {
        // The desktop draws no turn for a row it could not read this time, so
        // neither does the door: the last answer is a line-of-turns fact.
        answerText:
          line === 'turns' && last !== undefined ? pocketTurnOf(last, session.status).answerText : null,
        turnCount: store.countTurns(sessionId)
      };
    },

    async turns(sessionId, range) {
      const session = sessionOf(sessionId);
      if (session === undefined) return { turns: [], more: false };
      return readPocketTurns(deps.overview.store(), sessionId, range, session.status);
    },

    handoff: () => null,
    now
  };
}
