/**
 * Shared control components — the pieces of the DESIGN.md §3 inventory that
 * are worth owning as one implementation rather than as a per-surface habit.
 *
 * The bar for landing here is that a surface got it WRONG on its own: the
 * filter field is here because the app grew four of them by hand and one
 * shipped a padding bug the others were one stylesheet-order away from
 * (Phase 14.2). Plain `.input`, `.icon-btn` and `.btn-*` stay as the CSS
 * vocabulary in styles/globals.css — a component that adds nothing but a
 * className is ceremony.
 */

export { FilterField } from './FilterField';
export type { FilterFieldProps } from './FilterField';

/**
 * The divider drag lands here for the same reason (Phase 18): three regions
 * each grew their own, and all three drifted from the cursor differently.
 * It is a hook rather than a component because the handle's placement is the
 * region's business and its BEHAVIOUR is not.
 */
export { useResizeHandle } from './resizer';
export type {
  ResizeAnchor,
  ResizeHandle,
  ResizeHandleSpec
} from './resizer';
