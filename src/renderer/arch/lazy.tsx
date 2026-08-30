/**
 * The Architecture subject's lazy door (Phase 165).
 *
 * ## Why this file exists
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` imported `ArchHeader` and
 * `ArchView` statically through the barrel, so the whole subject, being the
 * view, the drill, the promises section, the empty state and two stylesheets,
 * was in the entry chunk of every launch, 103,680 bytes of generated code
 * for a subject that is not the default and that most launches never show.
 * The map tab and its camera were already lazy (Phase 160, through
 * `src/renderer/editor/EditorPanel.tsx`), and this file does for the sidebar
 * subject what that phase did for the tab.
 *
 * These two wrappers are what Sidebar.tsx mounts instead, in the `arch`
 * branch it already only renders while that subject is showing. The first
 * show fetches one chunk through `./subject.ts`, and both wrappers read the
 * same door, so the header and the body arrive together from one fetch. The
 * store, the picker, the deliver path, the map door and the copy stay eager
 * as leaves, because the keyboard map and the menu reach them on a launch
 * that never shows the subject.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * that file states.
 *
 * ## The header's fallback is the empty band, not nothing
 *
 * The header band is a region of the window that every subject keeps at the
 * same height (DESIGN-SPEC S3). While the chunk loads, the band is drawn
 * empty with the same class, so the sidebar's layout does not collapse and
 * spring back by 36px on the first show. The body's fallback is null, because
 * the body is a scroller whose empty state is the view's own to draw.
 *
 * ## What stays true
 *
 *  - The chunk is a file inside the app bundle, so the subject opens offline
 *    exactly as it opens online.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';

const door = lazyDoor(() => import('./subject'));

/**
 * Fetch the subject's chunk ahead of the first show. Nothing calls this at
 * boot on purpose; see `preloadOverviewLayer` in ../overview/lazy.tsx for the
 * reason, which is the same.
 */
export const preloadArchSubject = door.preload;

/** What Sidebar.tsx mounts where `<ArchHeader />` stood. */
export function ArchHeaderLazy(): React.JSX.Element {
  const mod = door.use(true);
  if (mod === null) return <div className="view-header" data-slot="view-header" />;
  return <mod.ArchHeader />;
}

/** What Sidebar.tsx mounts where `<ArchView />` stood. */
export function ArchViewLazy(): React.JSX.Element | null {
  const mod = door.use(true);
  if (mod === null) return null;
  return <mod.ArchView />;
}
