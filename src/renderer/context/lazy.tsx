/**
 * The Context subject's lazy door (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` imported `ContextHeader`,
 * `ContextSection` and `useContextActions` statically through the barrel, and
 * `src/renderer/app/App.tsx` mounted `ContextInstallHost` on every launch, so
 * the whole subject, being the view, the enable dialog, the install sheet and
 * dialog with their preview surface, and four stylesheets, was in the entry
 * chunk of every launch: 157,423 bytes of generated code at the phase's
 * baseline, for a subject that is not the default.
 *
 * These wrappers are what the shell mounts instead. The sidebar pair mounts
 * only inside the `context` branch Sidebar.tsx already renders one subject at
 * a time from, so the first show fetches one chunk through `./subject.ts`,
 * and both parts resolve from the same promise. The install host wrapper
 * mounts the real host once that same chunk has arrived, and renders null,
 * asking for nothing, until then; see its own comment for why it reads no
 * store bit.
 *
 * The stores the rest of the shell reads on every launch, being `./store`,
 * `./open-session`, `./open-detail` and `./detail-host`, stay eager as leaves.
 * The header's fallback is the empty band with the same class, so the
 * sidebar's layout does not collapse and spring back by 36px on the first
 * show. The other two fallbacks are null.
 */

import React, { useSyncExternalStore } from 'react';
import { lazyDoor } from '../lazy/door';

/**
 * Whether the subject's chunk has arrived, as a tiny external store, so the
 * install host wrapper below can mount the moment it has and not before. The
 * importer the door is given flips it, so the door and this flag share the
 * one fetch.
 */
let arrived = false;
const arrivalListeners = new Set<() => void>();
function subscribeArrival(listener: () => void): () => void {
  arrivalListeners.add(listener);
  return () => {
    arrivalListeners.delete(listener);
  };
}
function readArrival(): boolean {
  return arrived;
}

const door = lazyDoor(async () => {
  const mod = await import('./subject');
  arrived = true;
  for (const listener of arrivalListeners) listener();
  return mod;
});

/** Fetch the subject's chunk ahead of the first show. Nothing calls this at boot. */
export const preloadContextSubject = door.preload;

/** What Sidebar.tsx mounts where `<ContextHeader />` stood. */
export function ContextHeaderLazy(): React.JSX.Element {
  const mod = door.use(true);
  if (mod === null) return <div className="view-header" data-slot="view-header" />;
  return <mod.ContextHeader />;
}

/**
 * What Sidebar.tsx mounts where `<ContextSection actions={...} />` stood. The
 * actions object is built inside the chunk by `./ContextSubject.tsx`.
 */
export function ContextSectionLazy(): React.JSX.Element | null {
  const mod = door.use(true);
  if (mod === null) return null;
  return <mod.ContextSubject />;
}

/**
 * What App.tsx mounts where `<ContextInstallHost />` stood.
 *
 * It reads NO store bit, on purpose. The install store is 18 KB with the
 * plan adapter, the executable scan and the command line checks behind it,
 * and a door that subscribed to it would keep all of that in the entry chunk
 * to read two booleans. Instead the door mounts the real host the moment the
 * subject's chunk has arrived, which is the earliest moment anything can open
 * the sheet: every opener is inside that chunk (`./actions.ts` through the
 * row menus and `./ContextView.tsx`), checked on 2026-08-29 by reading every
 * importer of the install store. Until then it renders null and asks for
 * nothing; after, the host itself subscribes to the store and draws the sheet
 * and the confirm exactly as it did when App.tsx mounted it at boot.
 */
export function ContextInstallHostLazy(): React.JSX.Element | null {
  const ready = useSyncExternalStore(subscribeArrival, readArrival);
  const mod = door.use(ready);
  if (mod === null) return null;
  return <mod.ContextInstallHost />;
}
