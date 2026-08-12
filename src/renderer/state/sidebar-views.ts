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
export const SIDEBAR_VIEW_IDS = ['explorer', 'search', 'scm'] as const;

export type SidebarViewId = (typeof SIDEBAR_VIEW_IDS)[number];

/**
 * What a view is CALLED, in the user's words — the activity rail's tooltip,
 * the zoom readout. Kept beside the ids so a new view cannot be added without
 * naming itself: this record stops compiling until it has a label.
 */
export const SIDEBAR_VIEW_LABELS: Readonly<Record<SidebarViewId, string>> = {
  explorer: 'Explorer',
  search: 'Search',
  scm: 'Source control'
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
