/**
 * Chrome — the shell's own furniture: sidebar visibility and width, the
 * session surface's orientation and dock, editor fill mode, and the active
 * sidebar view per project. Everything here is presentation state the user
 * chose; the numbers persist under their long-standing `gmux.*` keys.
 */

import type { StateCreator } from 'zustand';
import type { GmuxViewMenuExtras } from '@shared/ipc';
import {
  clampDockWidth,
  clampSidebarWidth,
  DOCK_DEFAULT,
  DOCK_MIN,
  dockRenderedWidth,
  sanitizeStoredWidth,
  SIDEBAR_DEFAULT,
  SIDEBAR_MIN,
  sidebarMaxWidth,
  workAreaWidth
} from './chrome-geometry';
import { loadLocal, saveLocal } from './local';
import type { SidebarViewId } from './sidebar-views';
import type { AppState } from './app-state';

/**
 * Where the session surface lives (round 1, DESIGN.md §2.2): a tab strip
 * across the top of the terminal region (default) or a VS Code-style list
 * docked at its right. View-menu radio, persisted app-wide.
 */
export type SessionOrientation = 'top' | 'right';

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

/**
 * The chrome's geometry from a given snapshot of the store — the pure core
 * of `liveChromeGeometry()` in ./store, kept here so the slice's own
 * write-time clamp and the facade cannot compute the row's budget
 * differently (the Phase 18 fix round happened because two callers did).
 */
export function chromeGeometryOf(
  s: Pick<
    AppState,
    | 'sessionOrientation'
    | 'dockCollapsed'
    | 'rightListWidth'
    | 'sidebarVisible'
    | 'sidebarWidth'
  >,
  windowWidth: number
): {
  windowWidth: number;
  /** Width the session dock is occupying (0 / 48 / its clamped width). */
  dockReserved: number;
  /** Ceiling for the sidebar, with that dock and the terminal's floor out. */
  sidebarMax: number;
  /** Width shared by the terminal and the editor split. */
  workArea: number;
} {
  const presence = {
    orientation: s.sessionOrientation,
    dockCollapsed: s.dockCollapsed,
    dockWidth: s.rightListWidth
  };
  const dockReserved = dockRenderedWidth(presence, windowWidth);
  return {
    windowWidth,
    dockReserved,
    sidebarMax: sidebarMaxWidth(windowWidth, dockReserved),
    workArea: workAreaWidth({
      windowWidth,
      sidebarVisible: s.sidebarVisible,
      sidebarWidth: s.sidebarWidth,
      ...presence
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
  editorFill: null,
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
    if (get().dockCollapsed === collapsed) return;
    set({ dockCollapsed: collapsed });
    saveLocal(LS_DOCK_COLLAPSED, collapsed);
  },

  enterEditorFill() {
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
// ---------------------------------------------------------------------------

let sessionsPositionPush: Promise<void> = Promise.resolve();

/** Tell main where the sessions are now. Fire-and-forget; never throws. */
export function pushSessionsPositionToMenu(
  position: SessionOrientation
): void {
  const bridge = window.gmux as typeof window.gmux & GmuxViewMenuExtras;
  sessionsPositionPush = Promise.resolve()
    .then(() => bridge.setSessionsPosition(position))
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
