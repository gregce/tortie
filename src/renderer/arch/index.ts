/**
 * The Architecture view's public surface, in the shape `../context/index.ts`
 * and `../search/index.ts` already use.
 *
 * Sidebar.tsx mounts the header and the body. Nothing else outside this folder
 * imports anything else from it, with ONE deliberate exception: the SCM view
 * reads `archDivergences` so a broken promise appears beside the changed file
 * that broke it. That is the second of the two riders the operator attached to
 * the Zen addition, made real, and it is a READ of this store and never a
 * write.
 *
 * PHASE 165. The header and the body are exported through their lazy door,
 * `./lazy.tsx`, and NOT from their own files. A static re-export of
 * `./ArchView` here would keep that module, its stylesheets and everything it
 * reaches in the entry chunk of every launch, whether or not anything used
 * the name, because a module in the static graph is kept for its side
 * effects. The barrel is the one place the sidebar imports from, so the barrel
 * is where the door has to be.
 */

export { ArchHeaderLazy, ArchViewLazy, preloadArchSubject } from './lazy';
export { useArch } from './store';
export { archAvailable } from './bridge';
export { archDivergences } from './divergences';
export type { ArchDivergenceRow } from './divergences';
