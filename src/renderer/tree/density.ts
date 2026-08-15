/**
 * Explorer row spacing (Phase 47 item 3).
 *
 * @pierre/trees already ships three row heights under the option name
 * `density`, so this module exposes those three and nothing invented:
 * compact is 24 px, default is 30 px, relaxed is 36 px
 * (node_modules/@pierre/trees/dist/model/density.js). The keyword also scales
 * the horizontal padding inside a row by 0.8, 1.0 and 1.2.
 *
 * gmux defaults to compact, which keeps the 24 px row the tree has always
 * drawn. The one deliberate change for everybody is the row's horizontal
 * padding, which drops from 8 px to 6.4 px, because the library ties that
 * factor to the keyword and gmux used to pass a bare `itemHeight: 24` with the
 * factor left at 1.
 *
 * The model has no density setter, so FilesSection re-mounts the tree when the
 * choice changes (the key includes the density). Expansion survives that,
 * because FileTree writes it to localStorage on unmount. Selection, scroll
 * position and an open filter do not.
 */

import { create } from 'zustand';

/** The three the library ships. gmux invents no fourth. */
export type TreeDensity = 'compact' | 'default' | 'relaxed';

export const TREE_DENSITIES: readonly TreeDensity[] = [
  'compact',
  'default',
  'relaxed'
];

export const DEFAULT_TREE_DENSITY: TreeDensity = 'compact';

const LS_TREE_DENSITY = 'gmux.treeDensity';

/** Row height in px, matching FILE_TREE_DENSITY_PRESETS in the library. */
const ROW_HEIGHT: Record<TreeDensity, number> = {
  compact: 24,
  default: 30,
  relaxed: 36
};

function isTreeDensity(value: unknown): value is TreeDensity {
  return (
    value === 'compact' || value === 'default' || value === 'relaxed'
  );
}

/** The stored choice. Anything unreadable or unrecognized falls back. */
export function loadTreeDensity(): TreeDensity {
  try {
    const raw = localStorage.getItem(LS_TREE_DENSITY);
    return isTreeDensity(raw) ? raw : DEFAULT_TREE_DENSITY;
  } catch {
    return DEFAULT_TREE_DENSITY;
  }
}

export function saveTreeDensity(density: TreeDensity): void {
  try {
    localStorage.setItem(LS_TREE_DENSITY, density);
  } catch {
    /* cosmetic only */
  }
}

/** Menu item text. */
export function densityLabel(density: TreeDensity): string {
  switch (density) {
    case 'compact':
      return 'Compact';
    case 'relaxed':
      return 'Relaxed';
    default:
      return 'Default';
  }
}

/** Menu sublabel: the number, so the choice is not three adjectives. */
export function densityHint(density: TreeDensity): string {
  return `Rows are ${ROW_HEIGHT[density]} px tall`;
}

/**
 * The live choice. Two components read it — the Explorer band header, which
 * offers the menu, and FilesSection, which keys the tree by it — and they are
 * in different files, so it is a store rather than a prop chain.
 */
export const useTreeDensity = create<{
  density: TreeDensity;
  setDensity(density: TreeDensity): void;
}>((set) => ({
  density: loadTreeDensity(),
  setDensity(density) {
    saveTreeDensity(density);
    set({ density });
  }
}));
