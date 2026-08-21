/**
 * Chrome — the shell's own furniture: sidebar visibility and width, the
 * session surface's orientation and dock, editor fill mode, and the active
 * sidebar view per project. Everything here is presentation state the user
 * chose; the numbers persist under their long-standing `gmux.*` keys.
 */

import type { StateCreator } from 'zustand';
import {
  clampDockWidth,
  clampSidebarWidth,
  DOCK_DEFAULT,
  DOCK_MIN,
  dockRenderedWidth,
  projectsRenderedWidth,
  sanitizeStoredWidth,
  SIDEBAR_DEFAULT,
  SIDEBAR_MIN,
  sidebarMaxWidth,
  workAreaWidth
} from './chrome-geometry';
import { loadLocal, saveLocal } from './local';
import type { SidebarViewId } from './sidebar-views';
import type { AppState } from './app-state';
import { gmuxBridge } from '../bridge';

/**
 * Where the session surface lives (round 1, DESIGN.md §2.2): a tab strip
 * across the top of the terminal region (default) or a VS Code-style list
 * docked at its right. View-menu radio, persisted app-wide.
 */
export type SessionOrientation = 'top' | 'right';

/**
 * Where the project tabs live (Phase 129): a row across the top of the window
 * (default, and what every build before this one drew) or a rail down its left
 * side, outside the activity bar. View-menu radio pair, persisted app-wide.
 */
export type ProjectsPosition = 'top' | 'left';

/**
 * The layout fill mode put away, so it can be put back exactly (Phase 18
 * item 2). Captured on the way in, replayed verbatim on the way out, and
 * dropped the moment the user makes any layout gesture of their own.
 */
export interface EditorFillMemento {
  sidebarVisible: boolean;
  dockCollapsed: boolean;
}

export interface ChromeSlice {
  sidebarVisible: boolean;
  /**
   * The sidebar width the user CHOSE, verbatim (Phase 18). It is never
   * rewritten when the window shrinks — the sidebar renders
   * `clampSidebarWidth(sidebarWidth, liveWindow)` and this value survives, so
   * shrinking the window and growing it back restores the exact chosen width.
   */
  sidebarWidth: number;
  /** Session-surface orientation (View menu radio; persisted app-wide). */
  sessionOrientation: SessionOrientation;
  /** Right-docked session list width — chosen width, clamped at render. */
  rightListWidth: number;
  /**
   * Phase 18 item 4: the right dock is collapsed to its 48px icon rail.
   *
   * A separate boolean rather than `rightListWidth === 0` on purpose — the
   * chosen width survives the collapse and comes back exactly. Persisted
   * (`gmux.dockCollapsed`), and it survives an orientation switch: going to
   * 'top' hides the dock entirely, coming back restores the collapsed state.
   */
  dockCollapsed: boolean;
  /**
   * Phase 129. Where the project tabs are drawn.
   *
   * The sibling of `sessionOrientation` above, and built the same way: this
   * store is the ONE writer, localStorage holds it under
   * `gmux.projectsPosition`, and main is TOLD over `ui:projectsPosition` so
   * the View menu's radios render it instead of holding a second answer.
   */
  projectsPosition: ProjectsPosition;
  /**
   * Phase 129. The project tabs are put away where they are.
   *
   * One boolean for both positions, because it means the same thing in both:
   * the names are not on screen. On top it takes the row of tabs away and
   * leaves one chip that names the active project. On the left it takes the
   * rail down to 48px of dots. Persisted under `gmux.projectsCollapsed`.
   *
   * SAY WHAT IS NOT TRUE: collapsing on top does not make the window taller.
   * The title band stays 38px because the traffic lights live in it. What
   * comes back is the row of tabs.
   */
  projectsCollapsed: boolean;
  /**
   * Phase 18 item 2 — fill mode, as an OVERRIDE that never writes.
   *
   * Non-null means the editor is filling the chrome; the value is the layout
   * to put back. Nothing else is stored: the editor's own per-project width is
   * untouched while filling (it is DERIVED as the whole work row), so exiting
   * restores it byte-for-byte with no bookkeeping.
   *
   * Never persisted — always null on boot. A mode you cannot see the exit from
   * at launch is a trap.
   */
  editorFill: EditorFillMemento | null;
  /**
   * Phase 80.1. Session focus: the session surface has the whole window.
   *
   * A BOOLEAN, not a memento, and that is the whole design. Editor fill needs
   * a memento because it WRITES `sidebarVisible` and `dockCollapsed` on the
   * way in. Focus writes neither. Every region focus hides is hidden by one
   * CSS class on the shell root (src/renderer/app/focus-mode.css), so the
   * sidebar's width, the dock's width, the editor's width and the strip's
   * orientation are never touched. They come back byte for byte because they
   * never left.
   *
   * FOCUS AND FILL MAY BOTH BE ON. Focus owns the session, fill owns the file.
   * The Phase 80.1 charter asked for one memento stack with last in first out.
   * The stack has exactly ONE entry, fill's, because focus keeps no memento at
   * all. It writes nothing, so it has nothing to put back, and last in first
   * out therefore holds without a stack existing. Two cases say what that
   * means in practice.
   *
   *   fill on, then focus on, then focus off. You are filling again, and
   *   fill's memento is the same object it was before focus was entered.
   *
   *   focus on, then the fill chord. Focus leaves first, because
   *   `enterEditorFill` calls `set({ sessionFocus: false })`, and then fill
   *   enters. Fill's memento therefore records the layout the person actually
   *   had, not the focused layout, which is the whole failure a stack would
   *   have been protecting against.
   *
   * Never persisted. Always false on boot. A mode you cannot see the exit
   * from at launch is a trap, and editor fill already proved it.
   */
  sessionFocus: boolean;
  /** Active sidebar view per project id (activity bar; persisted). */
  sidebarViewByProject: Record<string, SidebarViewId>;

  /**
   * The ONE way the sidebar is shown or hidden — the activity bar's icon, ⌘B,
   * the View menu and drag-to-hide all land here (Phase 14.7: one truth, many
   * controls). There is no `sidebarCollapsed`, no snap flag, and there must
   * never be one.
   */
  toggleSidebar(): void;
  setSidebarWidth(width: number): void;
  setSessionOrientation(orientation: SessionOrientation): void;
  setRightListWidth(width: number): void;
  /** Collapse the session dock to its icon rail, or expand it again. */
  setDockCollapsed(collapsed: boolean): void;
  /**
   * Phase 129. Move the project tabs to the top or to the left.
   *
   * Persists, and tells main so the View-menu radios follow. It touches
   * neither `sessionFocus` nor `editorFill`, and that is deliberate: moving
   * the project tabs is not a gesture on the session surface or on the open
   * file, and both of those regions are hidden by CSS while focus is on, so
   * there is nothing on screen for this to contradict.
   */
  setProjectsPosition(position: ProjectsPosition): void;
  /** Phase 129. Put the project names away, or bring them back. */
  setProjectsCollapsed(collapsed: boolean): void;
  /**
   * Enter fill mode: remember the current sidebar/dock state, then put both
   * away. A no-op while already filling — the memento is captured once, so a
   * double-enter cannot record the filled layout as the one to restore.
   *
   * The caller decides whether filling means anything: with no file open there
   * is nothing to fill with, and the editor's open state lives in the editor
   * store (which imports THIS module, so the guard cannot live here). The one
   * guarded entry point is `toggleEditorFill()` in editor/EditorPanel.tsx —
   * the button, ⇧⌘B and the View menu all go through THAT, not through here.
   */
  enterEditorFill(): void;
  /** Leave fill mode and replay the memento verbatim. */
  exitEditorFill(): void;
  /**
   * The user has taken manual control of the layout while filling (⌘B, an
   * activity-bar click, expanding the dock, dragging the editor divider):
   * drop the memento and restore NOTHING. Whatever is on screen is now their
   * choice — so the dock's collapsed state is persisted at this point, since
   * fill itself never wrote it.
   *
   * This lives in the store rather than in each component precisely so all
   * four gestures cannot drift apart.
   */
  forgetEditorFill(): void;
  /**
   * Phase 80.1. Turn session focus on or off.
   *
   * A plain write and nothing else. No localStorage key, no memento, no
   * second flag. The 200 ms flight that plays around it lives in
   * src/renderer/app/focus-flight.ts and calls this exactly once, at the end
   * of the flight, which is the moment the layout actually changes.
   */
  setSessionFocus(on: boolean): void;
  /** Set the active project's sidebar view (persisted per project). */
  setSidebarView(view: SidebarViewId): void;
  /** ⌘⇧E / ⌃⇧G: open the sidebar if collapsed and show the view. */
  showSidebarView(view: SidebarViewId): void;
  /** The active project's sidebar view ('scm' by default). */
  activeSidebarView(): SidebarViewId;
}

const LS_SIDEBAR_WIDTH = 'gmux.sidebarWidth';
// Round-1 layout: orientation is read back by src/main/menu.ts (radio sync) —
// key name is part of that contract.
const LS_ORIENTATION = 'gmux.sessionOrientation';
const LS_RIGHT_LIST_WIDTH = 'gmux.rightListWidth';
const LS_SIDEBAR_VIEW = 'gmux.sidebarView';
// Phase 18 item 4. New key; absent → false. Key NAMES are a protected strand
// (CLAUDE.md) — `gmux.*` stays `gmux.*`, only the permitted RANGES moved.
const LS_DOCK_COLLAPSED = 'gmux.dockCollapsed';
// Phase 129. Two new keys, both under the protected `gmux.` prefix, both
// listed in docs/audits/contract-baseline.txt in the same commit that adds
// them. Absent → the defaults below, which are what the app drew before.
const LS_PROJECTS_POSITION = 'gmux.projectsPosition';
const LS_PROJECTS_COLLAPSED = 'gmux.projectsCollapsed';

/**
 * The chrome's geometry from a given snapshot of the store — the pure core
 * of `liveChromeGeometry()` in ./store, kept here so the slice's own
 * write-time clamp and the facade cannot compute the row's budget
 * differently (the Phase 18 fix round happened because two callers did).
 *
 * Phase 80.1 note, so a later round does not "fix" it. This function, and
 * `workAreaWidth` and `clampSidebarWidth` under it, keep computing as if the
 * sidebar and the dock were on screen while session focus is on. That is
 * deliberate. Their one consumer is the sidebar's own width clamp, the
 * sidebar is not drawn in focus mode, and nothing they return is written
 * anywhere. Teaching them about `sessionFocus` would give focus a way to
 * change a number the person chose, which is the one thing the mode must
 * never do.
 */
export function chromeGeometryOf(
  s: Pick<
    AppState,
    | 'sessionOrientation'
    | 'dockCollapsed'
    | 'rightListWidth'
    | 'sidebarVisible'
    | 'sidebarWidth'
    | 'projectsPosition'
    | 'projectsCollapsed'
  >,
  windowWidth: number
): {
  windowWidth: number;
  /** Width the session dock is occupying (0 / 48 / its clamped width). */
  dockReserved: number;
  /** Phase 129: width the project rail is occupying (0 / 48 / 200). */
  projectsReserved: number;
  /** Ceiling for the sidebar, with both rails and the terminal's floor out. */
  sidebarMax: number;
  /** Width shared by the terminal and the editor split. */
  workArea: number;
} {
  const presence = {
    orientation: s.sessionOrientation,
    dockCollapsed: s.dockCollapsed,
    dockWidth: s.rightListWidth
  };
  const projects = {
    projectsPosition: s.projectsPosition,
    projectsCollapsed: s.projectsCollapsed
  };
  const dockReserved = dockRenderedWidth(presence, windowWidth);
  const projectsReserved = projectsRenderedWidth(projects, windowWidth);
  return {
    windowWidth,
    dockReserved,
    projectsReserved,
    sidebarMax: sidebarMaxWidth(windowWidth, dockReserved, projectsReserved),
    workArea: workAreaWidth({
      windowWidth,
      sidebarVisible: s.sidebarVisible,
      sidebarWidth: s.sidebarWidth,
      ...presence,
      ...projects
    })
  };
}

export const createChromeSlice: StateCreator<AppState, [], [], ChromeSlice> = (
  set,
  get
) => ({
  sidebarVisible: true,
  // Boot sanitizes NONSENSE only (non-finite, ≤ 0, absurd) — it does not
  // clamp to the live window. An oversized stored width is intent under a
  // window the user does not have right now; presentation clamping handles
  // it, and the value comes back when the window does (Phase 18).
  sidebarWidth: sanitizeStoredWidth(
    loadLocal<unknown>(LS_SIDEBAR_WIDTH, SIDEBAR_DEFAULT),
    SIDEBAR_DEFAULT,
    SIDEBAR_MIN
  ),
  sessionOrientation:
    loadLocal<SessionOrientation>(LS_ORIENTATION, 'top') === 'right'
      ? 'right'
      : 'top',
  rightListWidth: sanitizeStoredWidth(
    loadLocal<unknown>(LS_RIGHT_LIST_WIDTH, DOCK_DEFAULT),
    DOCK_DEFAULT,
    DOCK_MIN
  ),
  dockCollapsed: loadLocal<unknown>(LS_DOCK_COLLAPSED, false) === true,
  // Phase 129. Read the same defensive way `sessionOrientation` above is: a
  // hand-edited key that is not the one non-default string is 'top'.
  projectsPosition:
    loadLocal<ProjectsPosition>(LS_PROJECTS_POSITION, 'top') === 'left'
      ? 'left'
      : 'top',
  projectsCollapsed: loadLocal<unknown>(LS_PROJECTS_COLLAPSED, false) === true,
  editorFill: null,
  // Phase 80.1. There is no loadLocal call here, and that is deliberate.
  // Focus is never persisted, so a stray key under the gmux prefix left
  // behind by a hand edit is never read, and this phase adds no line to the
  // contract inventory.
  sessionFocus: false,
  sidebarViewByProject: loadLocal<Record<string, SidebarViewId>>(
    LS_SIDEBAR_VIEW,
    {}
  ),

  toggleSidebar() {
    // ⌘B, the activity-bar icon, the View menu and drag-to-hide all arrive
    // here, so "is the sidebar showing" has exactly one answer. Doing this
    // while the editor is filling is the user overruling fill mode, not
    // exiting it: the memento is dropped, nothing is put back.
    get().forgetEditorFill();
    // Phase 80.1. A layout gesture of the person's own leaves session focus,
    // instantly and with no flight. They asked for a region, not for the
    // flight, and the sidebar is not drawn while focus is on.
    set({ sessionFocus: false });
    set((s) => ({ sidebarVisible: !s.sidebarVisible }));
  },

  setSidebarWidth(width) {
    // Clamped against the LIVE window AND the live dock, not a constant. A
    // drag cannot exceed the ceiling anyway (the handle reads the same
    // function), so this is the belt for programmatic callers — the shot
    // harness, keyboard resize at the very edge of a resize event.
    const windowWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
    const clamped = clampSidebarWidth(
      width,
      windowWidth,
      chromeGeometryOf(get(), windowWidth).dockReserved
    );
    set({ sidebarWidth: clamped });
    saveLocal(LS_SIDEBAR_WIDTH, clamped);
  },

  setSessionOrientation(orientation) {
    // Phase 80.1, same rule as toggleSidebar: moving the session surface is a
    // layout gesture, and the surface it moves is not drawn while focus is on.
    set({ sessionFocus: false });
    set({ sessionOrientation: orientation });
    saveLocal(LS_ORIENTATION, orientation);
    // ONE truth, several controls (Phase 12.12 item 2): the View-menu
    // radios, the SESSIONS header's inline toggle and its ˅ menu all read
    // and write THIS value — but main draws the radios, so it has to be
    // told, every single time (Phase 14.7).
    pushSessionsPositionToMenu(orientation);
  },

  setRightListWidth(width) {
    const clamped = clampDockWidth(width);
    set({ rightListWidth: clamped });
    saveLocal(LS_RIGHT_LIST_WIDTH, clamped);
  },

  setDockCollapsed(collapsed) {
    // Expanding or collapsing the dock by hand while filling is the user
    // taking the layout back — same rule as ⌘B above.
    get().forgetEditorFill();
    set({ sessionFocus: false }); // Phase 80.1, the same layout-gesture rule.
    if (get().dockCollapsed === collapsed) return;
    set({ dockCollapsed: collapsed });
    saveLocal(LS_DOCK_COLLAPSED, collapsed);
  },

  setProjectsPosition(position) {
    if (get().projectsPosition !== position) {
      set({ projectsPosition: position });
      saveLocal(LS_PROJECTS_POSITION, position);
    }
    // Pushed even when the value did not move, so the radios are corrected
    // after a rebuild that ran while main's cache was behind. The push is
    // cheap and idempotent; a missing mark is not.
    pushProjectsPositionToMenu(position);
  },

  setProjectsCollapsed(collapsed) {
    if (get().projectsCollapsed === collapsed) return;
    set({ projectsCollapsed: collapsed });
    saveLocal(LS_PROJECTS_COLLAPSED, collapsed);
    // Nothing is pushed to main here. The View menu carries the position pair
    // and no collapse row, so there is no mark to move.
  },

  enterEditorFill() {
    // Phase 80.1. Filling leaves focus FIRST, and then fills. This one line is
    // what keeps EditorPanel.tsx out of that phase: the button, the chord and
    // the View row all arrive here. The order matters for the memento below,
    // which must record the layout the person had rather than the focused one.
    set({ sessionFocus: false });
    const { editorFill, sidebarVisible, dockCollapsed } = get();
    if (editorFill !== null) return;
    // Note what to put back BEFORE putting anything away, and write the new
    // state DIRECTLY rather than through setDockCollapsed: fill is an
    // override, so it must not persist `gmux.dockCollapsed`. Quit while
    // filling and the next launch shows the dock the user actually chose.
    set({
      editorFill: { sidebarVisible, dockCollapsed },
      sidebarVisible: false,
      dockCollapsed: true
    });
  },

  exitEditorFill() {
    const { editorFill } = get();
    if (editorFill === null) return;
    set({
      sidebarVisible: editorFill.sidebarVisible,
      dockCollapsed: editorFill.dockCollapsed,
      editorFill: null
    });
  },

  forgetEditorFill() {
    const { editorFill, dockCollapsed } = get();
    if (editorFill === null) return;
    set({ editorFill: null });
    // Fill never wrote the dock's collapsed state; the user adopting the
    // filled layout is the moment it becomes a real preference.
    saveLocal(LS_DOCK_COLLAPSED, dockCollapsed);
  },

  setSessionFocus(on) {
    set({ sessionFocus: on });
  },

  setSidebarView(view) {
    const { activeProjectId } = get();
    if (activeProjectId === null) return;
    const sidebarViewByProject = {
      ...get().sidebarViewByProject,
      [activeProjectId]: view
    };
    set({ sidebarViewByProject });
    saveLocal(LS_SIDEBAR_VIEW, sidebarViewByProject);
  },

  showSidebarView(view) {
    // Reaching for a view is a layout gesture too — it overrules fill mode
    // rather than exiting it (Phase 18 item 2).
    get().forgetEditorFill();
    set({ sessionFocus: false }); // Phase 80.1, the same layout-gesture rule.
    if (!get().sidebarVisible) set({ sidebarVisible: true });
    get().setSidebarView(view);
  },

  activeSidebarView() {
    const { activeProjectId, sidebarViewByProject } = get();
    if (activeProjectId === null) return 'scm';
    return sidebarViewByProject[activeProjectId] ?? 'scm';
  }
});

// ---------------------------------------------------------------------------
// Sessions position → the View menu (Phase 14.7)
//
// THE APP STORE IS THE ONLY AUTHORITY on where the session surface lives. Main
// draws the View-menu radios and holds nothing but a cache of what it was last
// told, so this push is the whole contract: on every change, and once as the
// app loads (main boots knowing nothing, and its default is a guess). The
// load-time announcement lives in ./store, after the store exists.
//
// Not feature-detected. The preload ships in the same bundle as this file, so
// a missing method is our own bug — the type in src/shared/ipc is required
// and a failure is logged loudly rather than degrading into a menu that lies.
// Phase 122: the same is now true of the bridge as a whole. A renderer
// with no bridge cannot draw a menu at all, so an absent one is thrown
// and logged here rather than passed over.
// ---------------------------------------------------------------------------

let sessionsPositionPush: Promise<void> = Promise.resolve();

/** Tell main where the sessions are now. Fire-and-forget; never throws. */
export function pushSessionsPositionToMenu(
  position: SessionOrientation
): void {
  const bridge = gmuxBridge();
  sessionsPositionPush = Promise.resolve()
    .then(() => {
      if (bridge === undefined) throw new Error('there is no bridge');
      return bridge.setSessionsPosition(position);
    })
    .catch((err: unknown) => {
      console.error(
        '[sessions-position] the View menu did not hear the store',
        err
      );
    });
}

/** Resolves once the latest push has settled (screenshot harness, tests). */
export function whenSessionsPositionPushed(): Promise<void> {
  return sessionsPositionPush;
}

// ---------------------------------------------------------------------------
// Projects position → the View menu (Phase 129)
//
// The same one-direction contract as the block above, for the project tabs.
// The store is the only authority. Main caches what it was last told and draws
// its radios from that cache. Written as a second small block rather than as a
// helper over both, because the two pushes are independent and a shared one
// would need a parameter naming which bridge method to call.
// ---------------------------------------------------------------------------

let projectsPositionPush: Promise<void> = Promise.resolve();

/** Tell main where the project tabs are now. Fire-and-forget; never throws. */
export function pushProjectsPositionToMenu(position: ProjectsPosition): void {
  const bridge = gmuxBridge();
  projectsPositionPush = Promise.resolve()
    .then(() => {
      if (bridge === undefined) throw new Error('there is no bridge');
      return bridge.setProjectsPosition(position);
    })
    .catch((err: unknown) => {
      console.error(
        '[projects-position] the View menu did not hear the store',
        err
      );
    });
}

/** Resolves once the latest push has settled (screenshot harness, tests). */
export function whenProjectsPositionPushed(): Promise<void> {
  return projectsPositionPush;
}
