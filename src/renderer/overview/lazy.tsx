/**
 * The Catch Me Up page's lazy door (Phase 165).
 *
 * ## Why this file exists
 *
 * Before Phase 165, `src/renderer/app/App.tsx` imported `./OverviewLayer`
 * statically and rendered it on every launch. The layer returned null while
 * the page was closed, so a person saw nothing, but every module it reaches,
 * being the conversation, the columns, the project lines, the story panel,
 * the ask rail and three stylesheets, was in the entry chunk a launch loads.
 * That is 45,994 bytes of generated code paid on every boot for a page most
 * launches never open.
 *
 * This wrapper is what App.tsx mounts instead. It reads ONE bit from the
 * store, being whether the page is open, and until it is open it renders
 * null and never asks for the chunk. The first open fetches the chunk through
 * one `import()`, which Rollup turns into a file of its own, and every later
 * open finds it already held. Nothing about the page itself moves: the layer,
 * its keys, its footer copy and its stylesheets are exactly where they were,
 * and `open-overview.ts`, `story.ts` and `session-keys.ts`, which the
 * keyboard map reaches on every keystroke, stay eager as the leaves they are.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * that file states.
 *
 * ## What stays true
 *
 *  - The layer still mounts only while `overview` is non null, so its focus
 *    effect runs on open exactly as it did when the store flipped the bit.
 *  - The chunk is a file inside the app bundle. There is no network in the
 *    path, so the page opens offline exactly as it opens online.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';
import { useApp } from '../state/store';

const door = lazyDoor(() => import('./OverviewLayer'));

/**
 * Fetch the page's chunk ahead of the first open. Nothing calls this at boot
 * on purpose: Phase 165 measured the first open with the chunk cold and the
 * number is in the phase's proof. It is here for a later round that measures
 * a reason to warm it, so that round adds one call rather than a mechanism.
 */
export const preloadOverviewLayer = door.preload;

/**
 * What App.tsx mounts where `<OverviewLayer />` stood. Null while the page is
 * closed, with no chunk asked for; null for the one render the chunk is in
 * flight; the real layer from then on.
 */
export function OverviewLayerLazy(): React.JSX.Element | null {
  const open = useApp((s) => s.overview !== null);
  const mod = door.use(open);
  if (mod === null) return null;
  return <mod.OverviewLayer />;
}
