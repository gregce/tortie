/**
 * The Catch Me Up page's state (Phase 137).
 *
 * One field holds the open page and its request, or null while the page is
 * closed. The read starts at the chord and the commit happens at the end of
 * the 200 ms flight, so the two are separate verbs joined by a token. A load
 * that finishes for an older token is dropped, and a load that finishes
 * before the commit is held and applied at the commit.
 *
 * This module lives under src/renderer/state and therefore names nothing in
 * src/renderer/app or src/renderer/editor. The gate in
 * build/assert-import-boundaries.mjs rejects that at every typecheck. The
 * level decision and the gestures live in src/renderer/overview instead.
 *
 * Nothing here sets a session's status, and nothing here may ever grow a
 * way to. The payload carries no status at all.
 */

import type { StateCreator } from 'zustand';
import type { OverviewLevel, OverviewProject } from '@shared/overview';
import type { GmuxOverviewExtras } from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import type { AppState } from './app-state';

export interface OverviewRequest {
  level: OverviewLevel;
  projectPath: string;
  sessionIds: string[];        // one for 'session', several for 'several', empty for 'project'
  openedFromProject: boolean;  // Escape returns to the project view rather than leaving
}

export interface OverviewState extends OverviewRequest {
  data: OverviewProject | null;  // null while reading
  error: string | null;          // one sentence when the read failed
  selected: number;              // the row or turn the arrow keys are on
  token: number;                 // a load that finishes for an older token is dropped
}

export interface OverviewSlice {
  overview: OverviewState | null;
  /** The commit. Sets `overview` with data null. Called at the END of the flight. */
  openOverview(req: OverviewRequest): number;      // returns the token
  /** The bridge call. Started at the chord, before the flight. Writes data or error when the token still matches. */
  loadOverview(req: OverviewRequest, token: number): Promise<void>;
  closeOverview(): void;
  setOverviewSelected(index: number): void;
}

/**
 * The bridge surface the page reads. The two calls land on the
 * `overview:project` and `overview:sessions` channels. The read is feature
 * detected because a preload without the extra means a build without the
 * page, and the honest answer there is one sentence rather than a throw.
 */
type OverviewBridgeSurface = GmuxOverviewExtras['overview'];

function overviewBridge(): OverviewBridgeSurface | undefined {
  const extras = gmuxBridge()?.overview;
  return extras !== undefined && typeof extras.project === 'function'
    ? extras
    : undefined;
}

/** The one sentence a build with no overview bridge can say. */
export const OVERVIEW_BRIDGE_MISSING =
  'This build cannot read the conversation record.';

/**
 * The token counter. It lives at module scope so the caller that starts the
 * read BEFORE the flight can name the token the commit at the END of the
 * flight will take. One page opens at a time, so the prediction cannot be
 * raced by a second open.
 */
let tokenSeq = 0;

/** The token the NEXT openOverview call will return. Reads only. */
export function nextOverviewToken(): number {
  return tokenSeq + 1;
}

/**
 * A read that finished before its commit. It is held here and applied by
 * openOverview when the tokens agree, so the order of the two never matters.
 */
interface PendingDelivery {
  token: number;
  data: OverviewProject | null;
  error: string | null;
}

let pending: PendingDelivery | null = null;

/**
 * Where the arrow keys start. The session view opens at its newest turn,
 * because the conversation lists newest last and the person reads the end
 * first. The other two levels open at the top.
 */
function initialSelected(
  level: OverviewLevel,
  data: OverviewProject | null
): number {
  if (level !== 'session' || data === null) return 0;
  const turns = data.sessions[0]?.turns.length ?? 0;
  return turns > 0 ? turns - 1 : 0;
}

function errorSentence(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const createOverviewSlice: StateCreator<
  AppState,
  [],
  [],
  OverviewSlice
> = (set, get) => {
  const deliver = (
    token: number,
    data: OverviewProject | null,
    error: string | null
  ): void => {
    const open = get().overview;
    if (open !== null && open.token === token) {
      set({
        overview: {
          ...open,
          data,
          error,
          selected: initialSelected(open.level, data)
        }
      });
      return;
    }
    // The commit has not happened yet. Hold the answer for it. A token at or
    // below the counter belongs to a page that has since closed, and that
    // answer is dropped rather than held.
    if (token > tokenSeq) pending = { token, data, error };
  };

  return {
    overview: null,

    openOverview(req) {
      const token = ++tokenSeq;
      let data: OverviewProject | null = null;
      let error: string | null = null;
      if (pending !== null && pending.token === token) {
        data = pending.data;
        error = pending.error;
      }
      pending = null;
      set({
        overview: {
          ...req,
          data,
          error,
          selected: initialSelected(req.level, data),
          token
        }
      });
      return token;
    },

    async loadOverview(req, token) {
      const api = overviewBridge();
      if (api === undefined) {
        deliver(token, null, OVERVIEW_BRIDGE_MISSING);
        return;
      }
      try {
        const data =
          req.level === 'project'
            ? await api.project({ projectPath: req.projectPath })
            : await api.sessions({
                projectPath: req.projectPath,
                sessionIds: req.sessionIds
              });
        deliver(token, data, null);
      } catch (err) {
        deliver(token, null, errorSentence(err));
      }
    },

    closeOverview() {
      pending = null;
      set({ overview: null });
    },

    setOverviewSelected(index) {
      const open = get().overview;
      if (open === null || open.selected === index) return;
      set({ overview: { ...open, selected: index } });
    }
  };
};
