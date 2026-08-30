/**
 * The Source Control subject's lazy door (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` imported `BranchHeader`
 * and `ScmSection` statically through the barrel, so the whole subject, being
 * the changes list, the history and its graph, the runs sections, the remote
 * sections and their stylesheets, was in the entry chunk of every launch:
 * 279,337 bytes of generated code at the phase's baseline.
 *
 * Source Control IS the default subject, so on most launches this chunk is
 * fetched right after the shell's first render, when the sidebar's `scm`
 * branch mounts these wrappers. That is one fetch of one local file after
 * first paint rather than 279 KB parsed before it, and DOMContentLoaded does
 * not wait for it. The header's fallback is the empty band with the same
 * class, so the sidebar's layout does not collapse and spring back by 36px
 * while the chunk arrives. The body's fallback is null.
 *
 * The two stores the rest of the shell reads on every launch, being
 * `./groups.ts` for the git slice and `./remote-changes.ts` for the activity
 * rail's badge, stay eager as leaves. The three harness drives this subject
 * used to register at module scope are installed by
 * `src/renderer/app/probe-registry.ts` now, on harness launches only.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';

const door = lazyDoor(() => import('./subject'));

/** Fetch the subject's chunk ahead of the first show. Nothing calls this at boot. */
export const preloadScmSubject = door.preload;

/** What Sidebar.tsx mounts where `<BranchHeader />` stood. */
export function BranchHeaderLazy(): React.JSX.Element {
  const mod = door.use(true);
  if (mod === null) return <div className="view-header" data-slot="view-header" />;
  return <mod.BranchHeader />;
}

/** What Sidebar.tsx mounts where `<ScmSection />` stood. */
export function ScmSectionLazy(): React.JSX.Element | null {
  const mod = door.use(true);
  if (mod === null) return null;
  return <mod.ScmSection />;
}
