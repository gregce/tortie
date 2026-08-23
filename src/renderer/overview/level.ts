/**
 * Which page the chord opens (Phase 137). Pure.
 *
 * The level is decided by focus, and by nothing else. With the keyboard in a
 * session and one session on the surface, the page is that session's
 * conversation. With a split on screen, the page is the split's sessions as
 * columns, because visibleSessionIds is the one place the product already
 * holds several sessions at once and the rail has no multi select. With the
 * keyboard anywhere else, the page is the whole project.
 */

import type { FillRegion } from '../app/fill-chord';
import type { OverviewLevel } from '@shared/overview';

export interface LevelInput {
  region: FillRegion | null;     // activeFillRegion()
  visibleIds: string[];          // useApp.getState().visibleSessionIds
  focusedRowId: string | null;   // focusedSessionRowId()
  activeId: string | null;       // activeSession()?.id
}

export interface LevelDecision {
  level: OverviewLevel;
  sessionIds: string[];
}

/** The table in section 7.5 of the Phase 137 build spec. */
export function decideOverviewLevel(input: LevelInput): LevelDecision {
  if (input.region !== 'session') {
    return { level: 'project', sessionIds: [] };
  }
  if (input.visibleIds.length > 1) {
    return { level: 'several', sessionIds: [...input.visibleIds] };
  }
  if (input.visibleIds.length === 1) {
    const one =
      input.focusedRowId ?? input.activeId ?? input.visibleIds[0] ?? null;
    return one === null
      ? { level: 'project', sessionIds: [] }
      : { level: 'session', sessionIds: [one] };
  }
  return { level: 'project', sessionIds: [] };
}
