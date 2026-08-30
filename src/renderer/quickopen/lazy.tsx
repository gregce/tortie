/**
 * The ⌘P palette's lazy door (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/App.tsx` mounted `QuickOpenPalette` on
 * every launch. The palette returned null while closed, so a person saw
 * nothing, but the palette, its rows, the highlighter and the file icon map
 * it draws were in the entry chunk. The comment on that mount said the
 * palette had to be always mounted because it owned two things that must run
 * from boot, and both of those things are kept HERE, in the wrapper that is
 * always mounted, so the palette itself can wait for the first ⌘P:
 *
 *  1. Recording recents. "Recent" means every file opened from any surface,
 *     not the ones found through ⌘P, so recording starts with the app. The
 *     recorder is a leaf (`./recents.ts`) and this wrapper starts it.
 *  2. The prewarm. fuzzysort's per path cost is lazy and otherwise lands on
 *     the FIRST keystroke (research 19 section 3.2), so the index is warmed
 *     at first idle after a project is active. The warm is a store action
 *     (`./store.ts`, a leaf) and this wrapper schedules it, with the same
 *     idle callback and the same 3 s ceiling the palette used.
 *
 * The palette's own module has neither effect any more. It is fetched through
 * one `import()` on the first open and drawn the frame the chunk lands, with
 * nothing drawn while it is in flight, so a ⌘P pressed in the first
 * milliseconds of a launch shows the palette one chunk load later rather than
 * not at all.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there.
 */

import React, { useEffect } from 'react';
import { lazyDoor } from '../lazy/door';
import { useApp } from '../state/store';
import { startRecordingRecents } from './recents';
import { useQuickOpen } from './store';

/**
 * The prewarm's ceiling. An idle callback with no timeout can wait for a
 * long time on a busy first second, and the warm has to have happened before
 * the first keystroke a person is likely to make.
 */
const WARM_IDLE_TIMEOUT_MS = 3_000;

const door = lazyDoor(() => import('./QuickOpenPalette'));

/** Fetch the palette's chunk ahead of the first open. Nothing calls this at boot. */
export const preloadQuickOpenPalette = door.preload;

/**
 * What App.tsx mounts where `<QuickOpenPalette />` stood. Always mounted,
 * so the two boot time effects above run from the first render; the palette
 * itself is asked for on the first open and not before.
 */
export function QuickOpenPaletteLazy(): React.JSX.Element | null {
  const open = useQuickOpen((s) => s.open);
  const activeProjectId = useApp((s) => s.activeProjectId);

  // Recording starts with the app, not with the palette: "recent" means every
  // file you opened, from any surface, not the ones you found through ⌘P.
  useEffect(() => startRecordingRecents(), []);

  // Prewarm is mandatory rather than an optimisation (research 19 §3.2):
  // fuzzysort's per-path cost is lazy and otherwise lands on the FIRST
  // keystroke. Doing it at first idle keeps it off the cold-start path.
  useEffect(() => {
    if (activeProjectId === null) return;
    const warm = (): void => useQuickOpen.getState().warm();
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number }
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(warm, { timeout: WARM_IDLE_TIMEOUT_MS });
      return;
    }
    const t = window.setTimeout(warm, 200);
    return () => window.clearTimeout(t);
  }, [activeProjectId]);

  const mod = door.use(open);
  if (mod === null) return null;
  return <mod.QuickOpenPalette />;
}
