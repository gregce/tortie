/**
 * The menu vocabulary, and nothing else (Phase 127).
 *
 * It lives here rather than beside the bridge helper in
 * src/renderer/app/ContextMenu.tsx because the store's overlays slice names
 * `MenuSpec` in the type of `setMenu`, and the store may not name the app
 * shell. A state interface naming an app type is still the state layer naming
 * its composition owner, and build/assert-import-boundaries.mjs rejects it.
 * Phase 42 stage 8 moved these two types OUT of the store to break a runtime
 * cycle, and this file keeps that cycle broken while giving both sides a leaf
 * neither owns.
 *
 * This file holds types only, so it adds no runtime edge to anything.
 */

import type { PopupMenuIcon } from '@shared/ipc';

export interface MenuItemSpec {
  label: string;
  hint?: string;
  /** Grey second line under the label — prose the hint slot cannot carry. */
  sublabel?: string;
  /** Leading icon; see src/renderer/icons/agent-menu-icon.ts. */
  icon?: PopupMenuIcon;
  destructive?: boolean;
  disabled?: boolean;
  /**
   * Nested items (Phase 39, the explorer's Open With). An item that carries
   * a submenu never fires its own `run`, so give it one that does nothing.
   * Optional, so every existing menu site is unchanged.
   */
  submenu?: (MenuItemSpec | 'sep')[];
  run: () => void;
}

export interface MenuSpec {
  x: number;
  y: number;
  items: (MenuItemSpec | 'sep')[];
}
