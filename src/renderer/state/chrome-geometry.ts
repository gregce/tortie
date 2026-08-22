/**
 * Chrome geometry — the ONE place every window-layout limit is defined.
 *
 * Before Phase 18 the three resizable regions each carried their own constant
 * pair, written when that region was built alone: the sidebar clamped to
 * `[220, 400]` inside its store setter AND repeated `max-width: 400px` in CSS,
 * the dock clamped to `[160, 320]` in a second setter, and the editor capped
 * itself at `0.65 × centre` from a private `MAX_FRACTION` while measuring the
 * "centre" as `window.innerWidth − sidebar` (the activity bar and the session
 * dock were simply missing from that arithmetic). Three models of the same
 * window disagreed, and none of them knew how wide the window actually was.
 *
 * So: no other module may define a layout constant. Grep here first, add it
 * here, and let the regions read it.
 *
 * Two rules the rest of the app depends on:
 *
 * 1. **Persist intent, clamp presentation.** The stores hold the width the
 *    user CHOSE, verbatim, and never rewrite it when the window shrinks. Each
 *    region renders `min(stored, liveMax)`. Shrink the window and grow it
 *    back and the chosen width returns exactly — no bookkeeping, no drift.
 *
 * 2. **The terminal is never laid out into the 1–239px band.** `TERMINAL_FLOOR`
 *    is a BUDGET ACROSS THE WHOLE ROW, not a term inside one function — the
 *    Phase 18 fix round exists because it was written as the latter. Every
 *    region that can take width from the terminal has to subtract it:
 *    `sidebarMaxWidth` reserves the activity bar, the session dock AND the
 *    floor; the editor refuses to SPLIT a row that cannot seat both its own
 *    minimum and the floor, and falls back to the overlay it already uses on
 *    narrow windows (where it covers the terminal instead of shrinking it).
 *    Miss one of those and the arithmetic bottoms out at a 12px terminal —
 *    measured, at a 1400px window with the sidebar at 50% and the dock at 320.
 *    `terminalLayoutWidth()` below is that budget as one function, and
 *    `chrome-geometry.test.ts` drives it over a grid so the invariant is
 *    executable rather than asserted in a comment. It is not cosmetic:
 *    `@xterm/addon-fit`'s `proposeDimensions()` ends in
 *    `cols: Math.max(2, Math.floor(width / cellWidth))`, so a terminal
 *    container laid out at ~0 CSS width proposes TWO columns, `fit()` resizes,
 *    and every visible pane of real work reflows to 2 columns. Main's
 *    `sanitizeCols` clamps to ≥ 2 and does not save you. The only safe vanish
 *    is `display: none` — the computed width is then `"auto"`, `parseInt`
 *    gives NaN and `fit()` bails on its own check. Never `width: 0`, never
 *    `flex: 0`, and never a width TRANSITION anywhere in the work row (an
 *    animated collapse is a stream of ResizeObserver fits, i.e. a stream of
 *    tmux resizes).
 *
 * Widths here are LAYOUT pixels — the same units the stores persist and the
 * same units `useResizeHandle` reports.
 */

import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The activity bar is a fixed rail; it is never resized. */
export const ACTIVITY_BAR_W = 48;

/** DESIGN §2.2 floor for any first-class left view. Unchanged by Phase 18. */
export const SIDEBAR_MIN = 220;
/**
 * RAW dragged width (below `SIDEBAR_MIN`, before clamping) at which the drag
 * gives up on a width and hides the sidebar instead — the same state the
 * activity-bar toggle produces, never a second boolean.
 */
export const SIDEBAR_SNAP = 140;
/** Item 1: "at least 50% of the window", as a fraction of the LIVE window. */
export const SIDEBAR_MAX_FRACTION = 0.5;
export const SIDEBAR_DEFAULT = 280;

export const DOCK_MIN = 160;
/** Unchanged — Phase 18 asks the dock to collapse, not to grow. */
export const DOCK_MAX = 320;
/** RAW dragged width below which the dock collapses to the rail. */
export const DOCK_SNAP = 100;
/** The collapsed dock is exactly the activity bar's width: symmetric bookends. */
export const DOCK_RAIL_W = 48;
export const DOCK_DEFAULT = 200;

/**
 * PHASE 129. The project tabs as a left rail.
 *
 * 200 is the number DESIGN §2.2 gives the right-hand session list, so the two
 * lists that name things read at the same density. 48 is the activity bar's
 * width and the collapsed dock's width, so a collapsed project rail is the
 * window's left bookend rather than a panel that failed to open.
 *
 * The rail is NOT resizable in this phase. There is no min, no max and no
 * stored width, and nothing here should grow one without also answering the
 * budget question below.
 */
export const PROJECT_RAIL_W = 200;
export const PROJECT_RAIL_COLLAPSED_W = 48;

/** Narrowest useful editor split (was EditorPanel's private MIN_DRAG_PX). */
export const EDITOR_MIN = 320;
/**
 * The terminal region is never LAID OUT narrower than this while it is
 * visible. See the zero-width rule at the top of this file: the alternative to
 * yielding here is a 2-column reflow of live work.
 */
export const TERMINAL_FLOOR = 240;

/**
 * Below this window width the editor stops splitting the row and becomes an
 * overlay over the terminal (S1). A taste threshold — a 45/55 split under
 * 1400px is two cramped columns — and NOT the thing that protects the
 * terminal; `SPLIT_MIN_WORK_AREA` is. Both are checked, see `editorIsOverlay`.
 */
export const OVERLAY_BREAKPOINT_PX = 1400;

/**
 * The narrowest work row that can seat a split: the editor's own minimum plus
 * the terminal's floor. Below it a split is arithmetically impossible, so the
 * editor overlays instead of shrinking the terminal into the reflow band.
 */
export const SPLIT_MIN_WORK_AREA = EDITOR_MIN + TERMINAL_FLOOR;

/**
 * The app's minimum window (src/main/index.ts — `minWidth: 960`), asserted
 * against that file in chrome-geometry.test.ts. Every limit here is only
 * required to hold at or above it, and the grid test says so explicitly
 * rather than quietly testing widths the user cannot produce.
 */
export const APP_MIN_WINDOW_W = 960;

/**
 * PHASE 129, AND THIS IS THE LOAD-BEARING NUMBER OF THE ITEM.
 *
 * The narrowest window that can seat the EXPANDED project rail. Below it the
 * rail renders at its collapsed 48px, whatever the person chose, and the
 * chosen value comes back when the window does. That is rule 1 at the top of
 * this file applied to a third region: persist intent, clamp presentation.
 *
 * DERIVED, never typed. The row has to seat, at once: the activity bar, the
 * rail, the sidebar at its own floor, the session dock at ITS ceiling, and the
 * terminal's floor. Work it out with the numbers as they stand and it is
 * 48 + 200 + 220 + 320 + 240 = 1028.
 *
 * Why the dock's CEILING rather than its live width, and why the sidebar's
 * floor rather than whether it is visible. Both answers are the same: the
 * rail's rendered width must not move when the person does something else.
 * A rail that got 152px narrower halfway through a dock drag, or that changed
 * width on ⌘B, would resize the work area, and every resize of the work area
 * is a ResizeObserver fit and a tmux resize of live panes. So the condition
 * reads one number, the window's own width, and the rail moves only when the
 * window does.
 *
 * The arithmetic this protects, written out because it is what breaks. With
 * the sidebar visible the work row is
 * `w - 48 - rail - dock - min(stored, sidebarMax)`, and `sidebarMax` bottoms
 * out at SIDEBAR_MIN. So the terminal falls under its floor exactly when
 * `w < 508 + dock + rail`. With no rail that is at worst 828px, under the
 * app's own 960px minimum window, which is why the budget held before this
 * phase. With a 200px rail it is 1028px, which is above it.
 *
 * PHASE 135 DOES NOT SUBTRACT ITS 48px FROM THIS NUMBER, and that is
 * deliberate. While the projects are on the left and the sidebar is showing,
 * the activity bar is a row and takes no width, so the row above could seat
 * the expanded rail at 980px rather than 1028px. Using that would make the
 * rail's rendered width depend on whether the sidebar is showing, so ⌘B would
 * change the rail's width, which would resize the work area and therefore
 * resize live sessions. The rule above is that the rail moves only when the
 * window does, and it still holds. The term stays `ACTIVITY_BAR_W`.
 */
export const PROJECT_RAIL_MIN_WINDOW_W =
  ACTIVITY_BAR_W + PROJECT_RAIL_W + SIDEBAR_MIN + DOCK_MAX + TERMINAL_FLOOR;

/** Guard for hand-edited / corrupt persisted widths. */
const MAX_SANE_WIDTH = 4096;

// ---------------------------------------------------------------------------
// The live window
// ---------------------------------------------------------------------------

/**
 * ONE window `resize` subscription for the whole app, shared by every region
 * through `useWindowWidth()` so a resize re-renders the sidebar, the dock and
 * the editor from the same value in the same pass. EditorPanel used to keep a
 * private `winW` useState with its own listener; that is deleted.
 *
 * The listener is installed at module load rather than in `subscribe`, so the
 * cached snapshot is fresh even for a component that mounts after a resize but
 * before anything subscribed.
 */
const widthListeners = new Set<() => void>();

function readWindowWidth(): number {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}

let liveWindowWidth = readWindowWidth();

function onWindowResize(): void {
  const next = readWindowWidth();
  if (next === liveWindowWidth) return;
  liveWindowWidth = next;
  for (const fn of [...widthListeners]) fn();
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onWindowResize);
}

function subscribeWindowWidth(fn: () => void): () => void {
  widthListeners.add(fn);
  return () => {
    widthListeners.delete(fn);
  };
}

function windowWidthSnapshot(): number {
  return liveWindowWidth;
}

/**
 * Live window width in layout px. Re-renders the caller when the window
 * resizes, through the single subscription above.
 */
export function useWindowWidth(): number {
  return useSyncExternalStore(
    subscribeWindowWidth,
    windowWidthSnapshot,
    windowWidthSnapshot
  );
}

/**
 * Window width for non-React callers (store setters, `max: () => …` callbacks
 * read live on every pointer move). Reads `window.innerWidth` directly rather
 * than the cached snapshot: a drag must see a mid-drag resize immediately, not
 * one React commit later.
 *
 * Outside a browser (unit tests run on the `node` environment) this is 0, and
 * every limit below then collapses to its floor. Pass the width explicitly in
 * tests; that is what every argument here is for.
 */
function currentWindowWidth(): number {
  return readWindowWidth();
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Round, then clamp. `min` wins when `max` falls below it (a tiny window). */
function clampPx(px: number, min: number, max: number): number {
  if (!Number.isFinite(px)) return min;
  return Math.round(Math.min(Math.max(px, min), Math.max(min, max)));
}

/**
 * Item 1: at least half the LIVE window, with the terminal's floor — and
 * whatever the session dock is occupying — as the only things that can take it
 * back.
 *
 * `reservedRight` is the dock's RENDERED width (0 in "top" orientation, 48 on
 * the rail, its clamped width when expanded). It is not optional in spirit:
 * the first shipped version of this function omitted it, with a comment saying
 * it "deliberately does not know about" the dock, and that is precisely how a
 * 1400px window with a 320px dock let the sidebar reach 700px and squeezed the
 * terminal to 12px — a real 2-column reflow of a real session. The spec's own
 * prose said this term bites "below ~976px", a figure that only comes out if
 * you reserve a 200px dock; the prose was right and the code had dropped it.
 *
 * Use `dockRenderedWidth()` to compute the argument — never a raw stored width.
 */
export function sidebarMaxWidth(
  windowWidth = currentWindowWidth(),
  reservedRight = 0,
  /**
   * PHASE 129. The project rail's RENDERED width, 0 unless the tabs are on
   * the left. It sits beside the activity bar in the arithmetic because it
   * sits beside it on screen, and it is an argument rather than a store read
   * for the same reason every other term here is.
   *
   * Use `projectsRenderedWidth()` to compute it — never a raw stored value,
   * and never the constant, because a window under
   * `PROJECT_RAIL_MIN_WINDOW_W` draws the rail collapsed.
   */
  reservedLeft = 0,
  /**
   * PHASE 135. The activity bar's RENDERED width, which is 0 while it is
   * drawn as the row at the head of the sidebar and 48 otherwise. The
   * default is `ACTIVITY_BAR_W`, so every call site written before this
   * phase keeps the answer it had.
   *
   * Use `activityBarRenderedWidth()` to compute it, never the constant,
   * because the constant is the column's width and the column is not always
   * what is drawn.
   */
  activityBar: number = ACTIVITY_BAR_W
): number {
  const half = Math.round(windowWidth * SIDEBAR_MAX_FRACTION);
  const roomLeft =
    windowWidth - activityBar - reservedLeft - reservedRight - TERMINAL_FLOOR;
  return clampPx(half, SIDEBAR_MIN, roomLeft);
}

/**
 * The dock's ceiling is still the constant 320 — collapse, not width, was the
 * complaint. Shaped as a function of the window so it can become a fraction
 * later without touching any call site.
 */
export function dockMaxWidth(_windowWidth?: number): number {
  return DOCK_MAX;
}

/** How much of the window the session dock is actually occupying right now. */
export function dockRenderedWidth(
  d: {
    orientation: 'top' | 'right';
    dockCollapsed: boolean;
    dockWidth: number;
  },
  windowWidth = currentWindowWidth()
): number {
  if (d.orientation !== 'right') return 0;
  return d.dockCollapsed ? DOCK_RAIL_W : clampDockWidth(d.dockWidth, windowWidth);
}

/**
 * PHASE 129. How much of the window the project rail is actually occupying
 * right now, in the same shape as `dockRenderedWidth` above.
 *
 * Three answers, and only three:
 *   0   the tabs are across the top, so there is no rail at all;
 *   48  the rail is collapsed, either because the person collapsed it or
 *       because the window is too narrow to seat it expanded;
 *   200 the rail is expanded.
 *
 * The narrow-window branch is the one that keeps rule 2 at the top of this
 * file true, and `PROJECT_RAIL_MIN_WINDOW_W` carries the arithmetic. The rail
 * component reads this same function, so what is drawn and what is budgeted
 * for are one number rather than two that agree today.
 */
export function projectsRenderedWidth(
  p: {
    projectsPosition: 'top' | 'left';
    projectsCollapsed: boolean;
  },
  windowWidth = currentWindowWidth()
): number {
  if (p.projectsPosition !== 'left') return 0;
  if (p.projectsCollapsed) return PROJECT_RAIL_COLLAPSED_W;
  return windowWidth >= PROJECT_RAIL_MIN_WINDOW_W
    ? PROJECT_RAIL_W
    : PROJECT_RAIL_COLLAPSED_W;
}

/**
 * PHASE 129. True when the rail is drawn collapsed although the person asked
 * for it expanded, because the window cannot seat it.
 *
 * The rail's own chevron reads this and says so, rather than offering a
 * control that would change nothing.
 */
export function projectRailForcedNarrow(
  p: {
    projectsPosition: 'top' | 'left';
    projectsCollapsed: boolean;
  },
  windowWidth = currentWindowWidth()
): boolean {
  return (
    p.projectsPosition === 'left' &&
    !p.projectsCollapsed &&
    windowWidth < PROJECT_RAIL_MIN_WINDOW_W
  );
}

/**
 * PHASE 135. Is the activity bar drawn as a 36px ROW at the head of the
 * sidebar rather than as the 48px column?
 *
 * Two conditions, and both are needed. The projects have to be on the left,
 * because that is the only position where the column stands on its own in the
 * middle of the window with nothing under its icons. The sidebar has to be
 * visible, because the row lives inside the sidebar and DESIGN.md §2.2 says
 * the activity bar never hides. So hiding the sidebar puts the column back,
 * and the cost of that is stated rather than hidden: every icon changes size
 * and position on that press. The benefit is that no view ever becomes
 * unreachable by mouse.
 *
 * ONE function, read by three callers. `App.tsx` decides whether to draw the
 * column, `Sidebar.tsx` decides whether to draw the row, and
 * `activityBarRenderedWidth` below decides what the layout budget subtracts.
 * A second copy of this condition is how the drawing and the arithmetic drift
 * apart.
 */
export function activityBarIsRow(p: {
  projectsPosition: 'top' | 'left';
  sidebarVisible: boolean;
}): boolean {
  return p.projectsPosition === 'left' && p.sidebarVisible;
}

/**
 * PHASE 135. How much WIDTH the activity bar is actually occupying right now,
 * in the same shape as `dockRenderedWidth` and `projectsRenderedWidth` above.
 *
 * Two answers, and only two:
 *   0   the bar is the row at the head of the sidebar, so it takes no width
 *       of its own. It takes 36px of the sidebar's HEIGHT instead, and no
 *       arithmetic in this file reads a height;
 *   48  the bar is the column, which is every other case.
 *
 * The 48px the row gives up goes to the work area and to the sidebar's
 * ceiling, and both are measured in the phase's proof.
 */
export function activityBarRenderedWidth(p: {
  projectsPosition: 'top' | 'left';
  sidebarVisible: boolean;
}): number {
  return activityBarIsRow(p) ? 0 : ACTIVITY_BAR_W;
}

/**
 * Item 2: the editor may take the whole work area except the terminal's floor.
 * This REPLACES `MAX_FRACTION = 0.65` outright — there is no fractional cap on
 * the editor any more, only the floor the terminal cannot go below.
 *
 * Note what is NOT here: a `Math.max(EDITOR_MIN, …)` floor. It used to be, and
 * combined with a min-wins clamp it inverted the whole rule — in a work row
 * too narrow for both, the editor took its 320px minimum and handed the
 * terminal whatever was left, which measured as low as 12px. The terminal's
 * floor outranks the editor's minimum, always; a row that cannot seat both
 * does not get a split at all (`editorIsOverlay`).
 */
export function editorMaxWidth(workArea: number): number {
  return Math.max(0, Math.round(workArea) - TERMINAL_FLOOR);
}

/**
 * Can this row be SPLIT, or must the editor overlay the terminal instead?
 *
 * Two independent reasons to overlay, and the second is the load-bearing one:
 * a narrow WINDOW (taste — two columns under 1400px are both cramped), or a
 * work row that cannot seat `EDITOR_MIN + TERMINAL_FLOOR` (safety — the only
 * alternative is laying the terminal out inside the reflow band). The overlay
 * is `position: absolute` inside `.work-row`, so it covers the terminal
 * without resizing it: no ResizeObserver fit, no tmux resize, no reflow.
 */
export function editorIsOverlay(windowWidth: number, workArea: number): boolean {
  return windowWidth < OVERLAY_BREAKPOINT_PX || workArea < SPLIT_MIN_WORK_AREA;
}

/**
 * Width available to the work area (session strip + terminal + editor) — i.e.
 * the window minus every fixed or resizable region beside it.
 *
 * Takes STORED widths and clamps them the same way the regions render them, so
 * a caller can hand it raw store values and still get the on-screen answer.
 */
export function workAreaWidth(w: {
  windowWidth: number;
  sidebarVisible: boolean;
  sidebarWidth: number;
  orientation: 'top' | 'right';
  dockCollapsed: boolean;
  dockWidth: number;
  /** PHASE 129. Absent means 'top', which is what every caller meant before. */
  projectsPosition?: 'top' | 'left';
  projectsCollapsed?: boolean;
}): number {
  // The dock is measured FIRST because the sidebar's ceiling depends on it —
  // the whole point of the fix round. Order is the model, not a preference.
  // Phase 129 adds the project rail as the SECOND term, for the same reason:
  // the sidebar's ceiling depends on it too, and it depends on neither.
  const dock = dockRenderedWidth(w, w.windowWidth);
  const projects = projectsRenderedWidth(
    {
      projectsPosition: w.projectsPosition ?? 'top',
      projectsCollapsed: w.projectsCollapsed ?? false
    },
    w.windowWidth
  );
  // PHASE 135 adds the activity bar as a THIRD term that is measured before
  // the sidebar, for the same reason the other two are: the sidebar's ceiling
  // depends on it, and it depends on neither the sidebar nor the dock.
  const activityBar = activityBarRenderedWidth({
    projectsPosition: w.projectsPosition ?? 'top',
    sidebarVisible: w.sidebarVisible
  });
  const sidebar = w.sidebarVisible
    ? clampSidebarWidth(
        w.sidebarWidth,
        w.windowWidth,
        dock,
        projects,
        activityBar
      )
    : 0;
  return Math.max(
    0,
    Math.round(w.windowWidth - activityBar - projects - sidebar - dock)
  );
}

/**
 * The width the terminal region is LAID OUT at, as one function, for one
 * reason: this is the number that must never fall in the 1–239px band, so it
 * has to be computable and therefore falsifiable. `0` means the region is
 * `display: none` (fill mode) — the only safe vanish, see rule 2 at the top.
 *
 * Every branch mirrors what the components actually do, and the components
 * call the same helpers, so this cannot quietly drift into being a model of a
 * different app: `workAreaWidth` here / in EditorPanel, `editorIsOverlay`
 * here / in EditorPanel, `clampEditorWidth` here / in panel-width.ts.
 */
export function terminalLayoutWidth(w: {
  windowWidth: number;
  sidebarVisible: boolean;
  sidebarWidth: number;
  orientation: 'top' | 'right';
  dockCollapsed: boolean;
  dockWidth: number;
  /** PHASE 129. Absent means 'top', which is what every caller meant before. */
  projectsPosition?: 'top' | 'left';
  projectsCollapsed?: boolean;
  /** A file is open in the editor panel. */
  editorOpen: boolean;
  /** The per-project stored editor width, if the user has ever dragged one. */
  editorWidth?: number | undefined;
  /** Fill mode (item 2) — the terminal is display:none, never width:0. */
  filling?: boolean;
}): number {
  const workArea = workAreaWidth(w);
  if (!w.editorOpen) return workArea;
  if (w.filling === true) return 0;
  if (editorIsOverlay(w.windowWidth, workArea)) return workArea;
  const editor = clampEditorWidth(
    w.editorWidth ?? defaultSplitWidth(workArea),
    workArea
  );
  return Math.max(0, workArea - editor);
}

/**
 * The width a freshly-opened panel takes. Lives here (with every other limit)
 * and is re-exported by editor/panel-width.ts, which owns the persistence.
 */
export function defaultSplitWidth(workArea: number): number {
  return clampEditorWidth(Math.max(Math.round(workArea * 0.45), 480), workArea);
}

export function clampSidebarWidth(
  px: number,
  windowWidth = currentWindowWidth(),
  reservedRight = 0,
  /** PHASE 129. The project rail's rendered width, 0 when it is not drawn. */
  reservedLeft = 0,
  /** PHASE 135. The activity bar's rendered width, 0 while it is the row. */
  activityBar: number = ACTIVITY_BAR_W
): number {
  return clampPx(
    px,
    SIDEBAR_MIN,
    sidebarMaxWidth(windowWidth, reservedRight, reservedLeft, activityBar)
  );
}

export function clampDockWidth(
  px: number,
  windowWidth = currentWindowWidth()
): number {
  return clampPx(px, DOCK_MIN, dockMaxWidth(windowWidth));
}

/**
 * MAX WINS HERE, and nowhere else in this file. Every other clamp resolves an
 * impossible range in favour of the minimum, because a region under its own
 * floor is merely unusable. This one resolves it in favour of the maximum,
 * because the editor's minimum is a comfort and the terminal's floor is a
 * guarantee about live work: given the choice between a 320px editor and a
 * terminal that survives, the terminal survives.
 *
 * In practice the branch is unreachable — `editorIsOverlay` sends any row
 * narrower than `SPLIT_MIN_WORK_AREA` to the overlay before a split width is
 * ever laid out. It is written anyway so the arithmetic is safe on its own,
 * without depending on a caller elsewhere having got its condition right.
 */
export function clampEditorWidth(px: number, workArea: number): number {
  const max = editorMaxWidth(workArea);
  const min = Math.min(EDITOR_MIN, max);
  if (!Number.isFinite(px)) return min;
  return Math.round(Math.min(Math.max(px, min), max));
}

/**
 * Boot-time sanitizer for a persisted width. localStorage is user-writable and
 * survives downgrades, so every stored width goes through here.
 *
 * Deliberately NOT a clamp to the live maximum: an oversized stored value is
 * the user's intent under a window they no longer have, and presentation
 * clamping already handles it (see rule 1 at the top). Only nonsense is
 * rejected — non-finite, non-positive, or larger than any real display.
 */
export function sanitizeStoredWidth(
  v: unknown,
  fallback: number,
  min: number
): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  if (v <= 0 || v > MAX_SANE_WIDTH) return fallback;
  return Math.max(min, Math.round(v));
}
