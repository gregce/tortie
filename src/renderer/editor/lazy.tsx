/**
 * The editor panel's lazy door (Phase 165).
 *
 * ## Why this file exists
 *
 * Before Phase 165, `src/renderer/app/App.tsx` imported `EditorPanel` through
 * the barrel and mounted it on every launch. The panel returned null until a
 * file opened, so a person saw nothing, but every module it reaches was in
 * the entry chunk a launch loads: the diff surface and all of `@pierre/diffs`,
 * the shiki family that package imports for highlighting, the Monaco host,
 * the markdown, image and html surfaces, the tab strip and the Context detail
 * tab. Measured at the phase's baseline that was about 1.1 MB of generated
 * code paid on every boot, before a single file was opened.
 *
 * This wrapper is what App.tsx mounts instead. It reads ONE bit from the
 * editor store, being whether any tab exists, and until one does it renders
 * null and never asks for the chunk. The first open fetches the chunk through
 * one `import()`, which Rollup turns into a file of its own. Monaco, the
 * markdown renderer and the highlight pool were already lazy behind their own
 * loaders, and they stay so: the first file open now loads the panel's chunk
 * and then Monaco's, in that order.
 *
 * ## The two things the panel did while it showed nothing
 *
 * The panel mounted at boot did two things before any tab existed, and both
 * are kept here so that nothing a person can see or press changes.
 *
 *  1. It called `init()` on the editor store, which subscribes to the open
 *     file bus. Without that subscription no file could ever open, so this
 *     wrapper calls it from the same kind of effect. `init` is idempotent, and
 *     `src/renderer/app/shell-ops-install.ts` may already have called it.
 *  2. Its keyboard listener answered ⌘E with no tabs open by flipping
 *     `panelOpen`, a bit nothing reads while there are no tabs. Everything
 *     else it answered (⌘S, ⌘W, the tab chords, Escape) refused with no
 *     panel. So the listener is not needed until a tab exists, and the panel
 *     installs it the moment it mounts, which is the moment a tab exists.
 *
 * ## What stays true
 *
 *  - The panel still mounts UNCONDITIONALLY inside `.work-row` as far as the
 *    shell is concerned: App.tsx renders this wrapper on every path, and only
 *    the wrapper decides. A conditional wrapper in App.tsx would re-key the
 *    terminal region and tear down every pane's WebGL context.
 *  - A rejected fetch is forgotten, so the next open tries again.
 *  - The chunk is a file inside the app bundle, so it opens offline.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there: a Suspense boundary that showed its fallback holds the
 * content back until 300 ms have passed, so a chunk that lands in 10 ms is
 * drawn at 300 ms. The panel's own skeleton is its fallback while the chunk
 * is in flight, and the first tab is drawn the frame the chunk lands.
 */

import React, { useEffect } from 'react';
import { lazyDoor } from '../lazy/door';
import { useEditor } from './store';

const door = lazyDoor(() => import('./EditorPanel'));

/**
 * Fetch the panel's chunk ahead of the first open. Nothing calls this at boot
 * on purpose; the phase measured the first open cold and wrote the number in
 * its proof. A later round that measures a reason to warm it adds one call.
 */
export const preloadEditorPanel = door.preload;

/**
 * What App.tsx mounts where `<EditorPanel />` stood. Null while no tab
 * exists, with no chunk asked for; the real panel once one does. The panel
 * itself still returns null while `panelOpen` is false, exactly as before.
 */
export function EditorPanelLazy(): React.JSX.Element | null {
  const init = useEditor((s) => s.init);
  const hasTabs = useEditor((s) => s.tabs.length > 0);
  useEffect(() => {
    init();
  }, [init]);
  const mod = door.use(hasTabs);
  if (mod === null) return null;
  return <mod.EditorPanel />;
}
