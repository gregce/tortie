/**
 * The Search subject's lazy door (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` imported `SearchHeader`
 * and `SearchSection` statically, and `src/renderer/app/App.tsx` mounted
 * `SymbolPalette` on every launch, so the view, the results list, the palette
 * and their stylesheet were in the entry chunk whether or not the subject was
 * ever shown. Search is not the default subject, and the palette renders null
 * until ⌘⇧O.
 *
 * These wrappers are what the shell mounts instead. The sidebar pair mounts
 * only inside the `search` branch Sidebar.tsx already renders one subject at
 * a time from, so the first show fetches one chunk through `./subject.ts`,
 * and both parts resolve from the same promise. The palette wrapper reads ONE
 * bit from its store and renders null, asking for nothing, until it is open.
 *
 * The header's fallback is the empty band with the same class, so the
 * sidebar's layout does not collapse and spring back by 36px on the first
 * show. The body's fallback is null.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';
import { useSymbols } from './symbols-store';

const door = lazyDoor(() => import('./subject'));

/** Fetch the subject's chunk ahead of the first show. Nothing calls this at boot. */
export const preloadSearchSubject = door.preload;

/** What Sidebar.tsx mounts where `<SearchHeader />` stood. */
export function SearchHeaderLazy(): React.JSX.Element {
  const mod = door.use(true);
  if (mod === null) return <div className="view-header" data-slot="view-header" />;
  return <mod.SearchHeader />;
}

/** What Sidebar.tsx mounts where `<SearchSection />` stood. */
export function SearchSectionLazy(): React.JSX.Element | null {
  const mod = door.use(true);
  if (mod === null) return null;
  return <mod.SearchSection />;
}

/**
 * What App.tsx mounts where `<SymbolPalette />` stood. Null while the palette
 * is closed, with no chunk asked for. The palette itself still returns null
 * while closed, so the read here is the same bit it reads first.
 */
export function SymbolPaletteLazy(): React.JSX.Element | null {
  const open = useSymbols((s) => s.open);
  const mod = door.use(open);
  if (mod === null) return null;
  return <mod.SymbolPalette />;
}
