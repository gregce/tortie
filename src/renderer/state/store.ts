/**
 * gmux app store (zustand) — single source of renderer truth for the shell.
 *
 * Data flow: window.gmux (frozen IPC bridge) → store actions → components.
 *
 * Phase 42 stage 4: this module is now the STABLE FACADE over five domain
 * slices plus one lifecycle owner, and every import path that ever worked
 * keeps working — `useApp`, the helpers and the types are all still exported
 * from here. The implementations live beside it:
 *
 *   projects-slice.ts   tabs, order, active project, project verbs
 *   sessions-slice.ts   the session projection and every session verb
 *   chrome-slice.ts     sidebar, dock, orientation, fill mode
 *   overlays-slice.ts   dialogs, native menu choke point, rename
 *   notices-slice.ts    the toast queue
 *   subscriptions.ts    hydration + bridge event handlers (one owner, so a
 *                       boot retry hydrates again WITHOUT resubscribing)
 *
 * Session status is MAIN's, full stop (Phase 13). The renderer used to derive
 * working / needs-input / idle itself from the `term:data:<id>` byte stream
 * and hold it in a `statusOverrides` map that outranked main — but bytes only
 * flow for the VISIBLE pane and the override was never cleared while a
 * session lived, so a session that had once produced output read "working"
 * forever. Detection now runs in main for every session, attached or not
 * (src/main/activity), and this store just renders what it is told.
 */

import { create } from 'zustand';
import type { Project, Session, SessionStatus } from '@shared/types';
import type { GmuxLoginItemExtras } from '@shared/ipc';
// A pure string helper with no imports of its own, so this does not close a
// cycle back through the shell.
import { parentDir } from '../app/format';
import type { AppState } from './app-state';
import {
  chromeGeometryOf,
  createChromeSlice,
  pushSessionsPositionToMenu
} from './chrome-slice';
import { createNoticesSlice } from './notices-slice';
import { createOverlaysSlice } from './overlays-slice';
import { createProjectsSlice } from './projects-slice';
import { createSessionsSlice } from './sessions-slice';
import type { SidebarViewId } from './sidebar-views';
import { hydrateAppState, startAppSubscriptions } from './subscriptions';

// ---------------------------------------------------------------------------
// The stable export surface — everything a component ever imported from this
// module is still importable from this module.
// ---------------------------------------------------------------------------

export { errorPayload, errorText } from './errors';
export { loadLocal, saveLocal } from './local';
export type { BootBlock } from './app-state';
export type { Toast, ToastKind } from './notices-slice';
export type { ConfirmSpec, MenuItemSpec, MenuSpec } from './overlays-slice';
export type { EditorFillMemento, SessionOrientation } from './chrome-slice';
export {
  pushSessionsPositionToMenu,
  whenSessionsPositionPushed
} from './chrome-slice';
export { nextOrdinal } from './sessions-slice';

/**
 * The sidebar hosts ONE view at a time (round 1, activity bar).
 *
 * The views themselves are DATA, in ./sidebar-views, and this is a re-export
 * so every existing `import type { SidebarViewId } from '../state/store'`
 * keeps working. Phase 18.55 moved them there because subsystems outside the
 * store have to enumerate the views — zoom is one — and a union typed out by
 * hand gave them nothing to enumerate, so they copied the list and one copy
 * went stale.
 */
export type { SidebarViewId };

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useApp = create<AppState>((set, get, api) => ({
  ...createProjectsSlice(set, get, api),
  ...createSessionsSlice(set, get, api),
  ...createChromeSlice(set, get, api),
  ...createOverlaysSlice(set, get, api),
  ...createNoticesSlice(set, get, api),

  // -- lifecycle -----------------------------------------------------------
  //
  // The bodies live in ./subscriptions, the one lifecycle owner: hydration
  // and event subscription are separate steps, and the subscription start is
  // idempotent. So boot() and retryBoot() share one shape, and a retry after
  // the tmux-missing screen hydrates fresh state without attaching a second
  // set of bridge handlers.

  ready: false,
  bootBlock: null,
  bootErrorDetail: null,

  async boot() {
    if (!window.gmux) return;
    await hydrateAppState(api);
    startAppSubscriptions(api);
  },

  async retryBoot() {
    set({ bootBlock: null });
    await get().boot();
  }
}));

/**
 * The chrome's geometry RIGHT NOW — the live window crossed with the live
 * store, for the callers that cannot use `useWindowWidth()` because they run
 * inside a pointer move: a drag's `max: () => …` callback, and the store's own
 * write-time clamps.
 *
 * One function, because the alternative is three: the sidebar's ceiling, the
 * editor's ceiling and `setSidebarWidth`'s clamp all need the same three
 * numbers, and the Phase 18 fix round happened because two of them were
 * computing the row's budget slightly differently. Reads `window.innerWidth`
 * directly rather than a cached snapshot, so a resize mid-drag is seen on the
 * same frame instead of one React commit later. The pure core is
 * `chromeGeometryOf` in ./chrome-slice, shared with the slice's own clamp.
 */
export function liveChromeGeometry(): {
  windowWidth: number;
  /** Width the session dock is occupying (0 / 48 / its clamped width). */
  dockReserved: number;
  /** Ceiling for the sidebar, with that dock and the terminal's floor out. */
  sidebarMax: number;
  /** Width shared by the terminal and the editor split. */
  workArea: number;
} {
  return chromeGeometryOf(
    useApp.getState(),
    typeof window === 'undefined' ? 0 : window.innerWidth
  );
}

/**
 * The status to render for a session.
 *
 * Since Phase 13 this is just main's verdict — there is no renderer-side
 * refinement left to apply, and deliberately no way for one to creep back in.
 * It stays a named function because every surface (dock, strip, split, ⌘J,
 * titlebar) should read status through ONE expression, and because the call
 * sites document that they are showing main's truth rather than their own.
 */
export function effectiveStatusOf(session: Session): SessionStatus {
  return session.status;
}

/** Pure tab-order sort (render-safe companion to orderedProjects()). */
export function sortProjects(
  projects: Project[],
  tabOrder: string[]
): Project[] {
  const rank = new Map(tabOrder.map((id, i) => [id, i]));
  return [...projects].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

/**
 * The folder a new project should be put in, guessed from the open ones.
 *
 * Where the last project came from is overwhelmingly where the next one goes,
 * because people keep their repositories in one place. With nothing open there
 * is nothing to guess from and this returns '', which both dialogs read as
 * "ask, do not invent a path".
 *
 * ONE definition, in the projects domain that already owns `projects` and
 * `addProjectPath`. It arrived twice in the Phase 18.6 parallel build, in
 * NewProjectModal.tsx and in state/clone.ts, and two guesses that drift is a
 * dialog that opens at a different folder depending on which one you used.
 */
export function suggestedProjectParent(): string {
  const s = useApp.getState();
  const reference =
    s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0];
  return reference === undefined ? '' : parentDir(reference.path);
}

// The load-time announcement (Phase 14.7): main boots knowing nothing about
// where the session surface lives, so the store tells it once as the app
// loads, and again on every change (chrome-slice's setSessionOrientation).
// Guarded on `window` only so importing this module in node (tests) is inert
// — never on the bridge method, which must be there.
if (typeof window !== 'undefined') {
  pushSessionsPositionToMenu(useApp.getState().sessionOrientation);
}

/** Optional login-item bridge extras (Phase 6), feature-detected. */
export function loginItemExtras(): GmuxLoginItemExtras {
  return (window.gmux ?? {}) as unknown as GmuxLoginItemExtras;
}
