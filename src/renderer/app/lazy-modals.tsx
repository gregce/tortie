/**
 * The modal family's lazy doors (Phase 165).
 *
 * Before Phase 165, `./App.tsx` mounted all eight of these on every launch.
 * Each returned null while its store said it was closed, so a person saw
 * nothing, but every one of them was in the entry chunk a launch loads.
 *
 * Each wrapper below reads the SAME bit its modal reads first, being the
 * store field whose truth makes the modal draw, and renders null with no
 * chunk asked for until that bit is true. The first open of any of them
 * fetches one chunk through `./modals.ts`, and every wrapper resolves from
 * the same promise, so the second modal a person opens finds the chunk
 * already loaded.
 *
 * Nothing about any modal moved. The open flag, the focus trap, the Escape
 * handling and the copy are exactly where they were, and each modal still
 * checks its own flag, so a wrapper that let it mount early would draw
 * nothing rather than a half open sheet.
 *
 * The ⌘T sheet is the one a person is most likely to open in the first
 * seconds of a launch. The phase measured its first open with the chunk cold
 * and wrote the number in its proof; `preloadModals` exists for a later round
 * that measures a reason to warm it after first paint.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there: with a Suspense boundary the ⌘T sheet would have drawn 300
 * ms after the chord on every launch's first press, however fast the chunk.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';
import { useApp } from '../state/store';
import { useClone } from '../state/clone';

const door = lazyDoor(() => import('./modals'));

/** Fetch the family's chunk ahead of the first open. Nothing calls this at boot. */
export const preloadModals = door.preload;

/** ⌘T and the + menu. Reads `createOpen`, the bit the sheet reads first. */
export function CreateSessionModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.createOpen));
  if (mod === null) return null;
  return <mod.CreateSessionModal />;
}

/** File > New Project and the home row. Reads `newProjectOpen`. */
export function NewProjectModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.newProjectOpen));
  if (mod === null) return null;
  return <mod.NewProjectModal />;
}

/** The remote project sheet. Reads `remoteProjectOpen`. */
export function RemoteProjectModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.remoteProjectOpen));
  if (mod === null) return null;
  return <mod.RemoteProjectModal />;
}

/** Phase 18.6. The clone sheet. Reads the clone store's own `open`. */
export function CloneRepoModalLazy(): React.JSX.Element | null {
  const mod = door.use(useClone((s) => s.open));
  if (mod === null) return null;
  return <mod.CloneRepoModal />;
}

/** Phase 29. The Past Sessions panel. Reads `pastOpen`. */
export function PastSessionsModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.pastOpen));
  if (mod === null) return null;
  return <mod.PastSessionsModal />;
}

/** Phase 72. The saved output panel. Open while a session id is set. */
export function SavedOutputModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.savedOutputSessionId !== null));
  if (mod === null) return null;
  return <mod.SavedOutputModal />;
}

/** Phase 100. The last lines panel. Open while a session id is set. */
export function RemoteLinesModalLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.remoteLinesSessionId !== null));
  if (mod === null) return null;
  return <mod.RemoteLinesModal />;
}

/** The ⌘/ shortcuts overlay. Reads `shortcutsOpen`. */
export function ShortcutsOverlayLazy(): React.JSX.Element | null {
  const mod = door.use(useApp((s) => s.shortcutsOpen));
  if (mod === null) return null;
  return <mod.ShortcutsOverlay />;
}
