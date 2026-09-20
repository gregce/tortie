/**
 * The session manager's lazy door (Phase 293).
 *
 * `../app/App.tsx` mounts this where `<PastSessionsModalLazy />` stood since
 * Phase 165, OUTSIDE the no-projects branch, because the sheet's whole point
 * is the sessions of projects that have no tab and both of its doors must work
 * with no project open at all.
 *
 * It reads ONE bit from the store, being whether the sheet is open, and until
 * it is open it renders null and never asks for the chunk. The first open
 * fetches the chunk through one `import()`, which Rollup turns into a file of
 * its own, and every later open finds it held. The grid, the Past list, the
 * inline panels, the batch panel, the verbs behind them and two stylesheets
 * all stay out of the entry chunk a launch loads. What the rest of the app
 * needs on every keystroke, being the door, the layer predicates and the
 * Escape closure, stays eager in ./open.ts and ./escape.ts, which import the
 * store and nothing drawn.
 *
 * The bit is `sessionSheet !== null`, spelled exactly so. The slice starts the
 * field at `null` and never at `undefined`, because this file, the layer
 * predicate, the saved-output modal and the Escape rung all ask `!== null`,
 * and `undefined !== null` would read as an open sheet.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * that file states. The chunk is a file inside the app bundle, so the sheet
 * opens offline exactly as it opens online.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';
import { useApp } from '../state/store';

const door = lazyDoor(() => import('./SessionManagerSheet'));

/**
 * Fetch the sheet's chunk ahead of the first open. Nothing calls this at boot,
 * on purpose, as with every other lazy door: a later round that measures a
 * reason to warm it adds one call rather than a mechanism.
 */
export const preloadSessionManagerSheet = door.preload;

/**
 * What App.tsx mounts. Null while the sheet is closed, with no chunk asked
 * for; null for the one render the chunk is in flight; the real sheet from
 * then on.
 */
export function SessionManagerSheetLazy(): React.JSX.Element | null {
  const open = useApp((s) => s.sessionSheet !== null);
  const mod = door.use(open);
  if (mod === null) return null;
  return <mod.SessionManagerSheet />;
}
