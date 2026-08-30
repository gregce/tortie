/**
 * The Explorer subject's lazy door (Phase 165).
 *
 * Before Phase 165, `src/renderer/app/Sidebar.tsx` imported `FilesSection`
 * statically through the barrel, so the tree, all of `@pierre/trees`, the
 * sprite bridge and the generated file icon map were in the entry chunk of
 * every launch: about 760 KB of generated code at the phase's baseline, for
 * a subject that is not the default.
 *
 * This wrapper is what Sidebar.tsx mounts instead, inside the `explorer`
 * branch it already renders one subject at a time from, so the first show
 * fetches one chunk. The Explorer's band header stays in Sidebar.tsx, because
 * it reads only the leaf stores (`./store`, `./density`, `./tree-handle`,
 * `./fs-ops-bridge`), and those stay eager: the keyboard map, the home screen
 * and the quick open palette reach them on launches that never show the tree.
 *
 * The three harness drives this module used to register at module scope are
 * installed by `src/renderer/app/probe-registry.ts` now, on harness launches
 * only, so a probe that never shows the Explorer still finds them.
 *
 * The door is `../lazy/door.ts` and not `React.lazy`, for the 300 ms reason
 * written there.
 */

import React from 'react';
import { lazyDoor } from '../lazy/door';
import type { FilesSectionProps } from './FilesSection';

const door = lazyDoor(() => import('./FilesSection'));

/** Fetch the subject's chunk ahead of the first show. Nothing calls this at boot. */
export const preloadFilesSection = door.preload;

/** What Sidebar.tsx mounts where `<FilesSection />` stood, same props. */
export function FilesSectionLazy(props: FilesSectionProps): React.JSX.Element | null {
  const mod = door.use(true);
  if (mod === null) return null;
  return <mod.FilesSection {...props} />;
}
