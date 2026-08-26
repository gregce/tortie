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
 */

export { ArchHeader } from './ArchHeader';
export { ArchView } from './ArchView';
export { useArch } from './store';
export { archAvailable } from './bridge';
export { archDivergences } from './divergences';
export type { ArchDivergenceRow } from './divergences';
