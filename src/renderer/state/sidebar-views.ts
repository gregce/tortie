/**
 * The sidebar's views, as DATA rather than as a union typed out by hand.
 *
 * WHY THIS FILE EXISTS (Phase 18.55). The view list used to be a bare union in
 * state/store.ts, so every other subsystem that had to reason about "which
 * view is this" wrote its own copy of the list — and one of those copies went
 * stale. Zoom's rule was `explorer ? 'explorer' : 'scm'`, written in Phase
 * 12.11 when the sidebar had two views; Search arrived in Phase 14 and zooming
 * it silently moved the Source Control level instead. Anything that has to
 * enumerate the views now reads them from here, so a view added later is
 * carried by construction rather than by remembering.
 *
 * It is a LEAF: no imports, no side effects, safe for a pure module such as
 * zoom/regions.ts to depend on. state/store.ts is the opposite — it pulls in
 * the bridge, the settings presets and the context menu — so the dependency
 * runs this way round and never back.
 */

/**
 * Every first-class sidebar view. The order is the rail's order (VS Code's,
 * and also the order of how often you reach for them); nothing depends on it.
 */
export const SIDEBAR_VIEW_IDS = [
  'explorer',
  'search',
  'scm',
  'context',
  'arch'
] as const;

export type SidebarViewId = (typeof SIDEBAR_VIEW_IDS)[number];

/**
 * What a view is CALLED, in the user's words — the activity rail's tooltip,
 * the zoom readout. Kept beside the ids so a new view cannot be added without
 * naming itself: this record stops compiling until it has a label.
 */
export const SIDEBAR_VIEW_LABELS: Readonly<Record<SidebarViewId, string>> = {
  explorer: 'Explorer',
  search: 'Search',
  scm: 'Source control',
  // Phase 22. The view of what the agents actually run on — skills, MCP
  // servers, hooks, plugins and the instruction chain. Adding the id above is
  // what makes it zoomable, focusable and reachable from ⌘⇧0 on the day it
  // ships; the ONE thing that does not follow is the CSS rule binding
  // `--zoom-context` to a selector, which zoom.css maps by hand because it is
  // the only part that has to know the view's DOM shape.
  context: 'Context',
  // Phase 63. The view of what the project PROMISES about its own shape, and
  // whether those promises still hold against the code.
  //
  // THE LABEL IS THE FULL WORD, and that is a decision rather than an
  // oversight. The backlog entry, research 49 and every internal name call it
  // `arch`, which is right for an id, a CSS custom property and a menu action.
  // It is wrong for a person: "Arch" alone reads as an archive or a curve, and
  // every other label in this record is a whole word. The id stays `arch`
  // everywhere it is machinery, being `--zoom-arch`, `show-arch`, `view.arch`
  // and `data-view="arch"`; only what a person reads says Architecture.
  arch: 'Architecture'
};

/**
 * The view the sidebar falls back to — what the activity bar shows for a
 * project with no remembered choice, and what an unlabelled `.sidebar-view`
 * element resolves to.
 */
export const SIDEBAR_VIEW_DEFAULT: SidebarViewId = 'scm';

/** Narrow a `data-view` attribute (or a persisted string) to a real view. */
export function isSidebarViewId(value: unknown): value is SidebarViewId {
  return (
    typeof value === 'string' &&
    (SIDEBAR_VIEW_IDS as readonly string[]).includes(value)
  );
}

/**
 * The view a stored choice actually resolves to (Phase 175).
 *
 * Architecture is off until a person turns it on in Settings, and a
 * remembered `'arch'` from before the flip must not draw the view: while
 * the flag is off the remembered choice reads as the default instead. The
 * memory itself is kept, so turning the surface back on restores the
 * remembered view without anyone re-choosing it. The flag arrives as an
 * ARGUMENT because this file is a leaf and must stay one; callers read it
 * from the settings store.
 */
export function effectiveSidebarView(
  stored: SidebarViewId | undefined,
  archEnabled: boolean
): SidebarViewId {
  const view = stored ?? SIDEBAR_VIEW_DEFAULT;
  return view === 'arch' && !archEnabled ? SIDEBAR_VIEW_DEFAULT : view;
}
