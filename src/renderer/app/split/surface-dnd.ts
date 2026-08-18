/**
 * Session-surface drags (S4 shared drag spec + S4A): one gesture, two
 * destinations. A single-session tab/row dragged WITHIN its home strip/dock
 * reorders (2px accent insertion indicator); dragged ACROSS into the
 * terminal region it arms a split-drop zone (quadrant hit-testing, --drop-
 * wash overlay). Group tabs/rows reorder but never enter split mode. Split
 * headers have two destinations of their own (Phase 86): onto the strip/dock
 * to pop the leaf out, or onto another leaf of the same split to take that
 * leaf's armed half. Both destinations use the same quadrant hit-testing, so
 * a move looks exactly like a create and adds no new visual language.
 *
 * Built on the pointer-drag primitive; all transient UI (indicators, the
 * armed drop zone) lives in the layout store so the strip, dock, and split
 * surface can render it wherever they are.
 */

import type React from 'react';
import type { Session } from '@shared/types';
import { useApp } from '../../state/store';
import { useLayout } from '../../state/layout';
import type { Surface } from '../../state/layout';
import { sessionMenuItems } from '../session-actions';
import { openInSplitItems } from './split-menu';
import {
  armedEdge,
  MAX_LEAVES,
  MIN_PANE_HEIGHT,
  MIN_PANE_WIDTH
} from '../../state/split-tree';
import {
  armPointerDrag,
  createGhost,
  insertionIndex,
  isSecondaryPress
} from './pointer-drag';
import type { PointerDragInit } from './pointer-drag';

export type SurfaceHome = 'strip' | 'dock';

const stripListSelector = '[data-slot="session-strip"] .stab-list';
// The dock has two densities and only one list exists at a time: the
// expanded `.dock-list` or the collapsed rail's `.rail-list` (Phase 60).
// Both are vertical, and rail items carry `data-surface-id` like rows do,
// so every 'dock' code path serves both without knowing which is mounted.
const dockListSelector =
  '[data-slot="session-dock"] .dock-list, [data-slot="session-dock"] .rail-list';
const leavesSelector = '[data-surface-leaves]';

function rectContains(r: DOMRect, x: number, y: number): boolean {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function homeSelector(home: SurfaceHome): string {
  return home === 'strip' ? stripListSelector : dockListSelector;
}

/** The home list's draggable items, in visual order. */
function homeItems(home: SurfaceHome): { id: string; rect: DOMRect }[] {
  const list = document.querySelector<HTMLElement>(homeSelector(home));
  if (!list) return [];
  return Array.from(
    list.querySelectorAll<HTMLElement>('[data-surface-id]')
  ).map((el) => ({
    id: el.dataset['surfaceId'] ?? '',
    rect: el.getBoundingClientRect()
  }));
}

/** Update the home indicator; returns true when the pointer is over home. */
function trackHome(home: SurfaceHome, x: number, y: number): boolean {
  const layout = useLayout.getState();
  const list = document.querySelector<HTMLElement>(homeSelector(home));
  const band = list?.getBoundingClientRect();
  if (!list || !band || !rectContains(band, x, y)) {
    if (home === 'strip') layout.setStripDrop(null);
    else layout.setDockDrop(null);
    return false;
  }
  // Dragging near either end auto-scrolls the strip (S2 drag spec).
  if (home === 'strip' && list.scrollWidth > list.clientWidth) {
    if (x < band.left + 24) list.scrollLeft -= 12;
    else if (x > band.right - 24) list.scrollLeft += 12;
  }
  const axis = home === 'strip' ? 'x' : 'y';
  const index = insertionIndex(homeItems(home), { x, y }, axis);
  if (home === 'strip') layout.setStripDrop(index);
  else layout.setDockDrop(index);
  return true;
}

/**
 * Which drag is asking, because the two have different refusals.
 *  - 'add' is a session tab or row crossing into the terminal region. It
 *    ADDS a leaf, so the leaf ceiling binds and a surface cannot be dropped
 *    onto itself.
 *  - 'move' is a split header moving inside its own group (Phase 86). It adds
 *    no leaf, so the ceiling is not reached, and the only new refusal is that
 *    a leaf cannot move onto itself.
 * Both refuse a drop whose halves would go under the minimum pane size, and
 * both refuse when there is no active project to drop into.
 */
type ZoneRule = 'add' | 'move';

/**
 * Update the S4A drop zone for a pointer over the terminal region.
 * `draggedId` is the dragged surface's id for 'add' and the dragged leaf's
 * session id for 'move'. Returns true when the pointer is over the surface
 * area at all.
 */
function trackDropZone(
  draggedId: string,
  x: number,
  y: number,
  rule: ZoneRule
): boolean {
  const layout = useLayout.getState();
  const root = document.querySelector<HTMLElement>(leavesSelector);
  if (!root || !rectContains(root.getBoundingClientRect(), x, y)) {
    layout.setSplitDrop(null);
    return false;
  }

  // Constraint set (S4A "No overlay = no drop").
  const app = useApp.getState();
  const projectPath = app.activeProject()?.path ?? null;
  const activeCount = Number(root.dataset['leafCount'] ?? '1');
  const activeSurfaceId = root.dataset['surfaceId'] ?? '';
  if (
    projectPath === null ||
    (rule === 'add' &&
      (activeCount >= MAX_LEAVES ||
        // the dragged tab IS the surface's only leaf
        activeSurfaceId === draggedId))
  ) {
    layout.setSplitDrop(null);
    return true;
  }

  const leafEl = Array.from(
    root.querySelectorAll<HTMLElement>('[data-split-leaf]')
  ).find((el) => rectContains(el.getBoundingClientRect(), x, y));
  if (!leafEl) {
    layout.setSplitDrop(null);
    return true;
  }
  const leafId = leafEl.dataset['splitLeaf'] ?? '';
  if (rule === 'move' && leafId === draggedId) {
    layout.setSplitDrop(null);
    return true;
  }
  const r = leafEl.getBoundingClientRect();
  const edge = armedEdge((x - r.left) / r.width, (y - r.top) / r.height);
  // Either resulting split under min size → zone never arms.
  const fits =
    edge === 'left' || edge === 'right'
      ? r.width / 2 >= MIN_PANE_WIDTH
      : r.height / 2 >= MIN_PANE_HEIGHT;
  if (!fits) {
    layout.setSplitDrop(null);
    return true;
  }
  layout.setSplitDrop({ leafId, edge });
  return true;
}

/**
 * Drag a session tab (strip) or row (dock). Reorder within home; single
 * surfaces may cross into the terminal region to split (S4A).
 */
export function startSurfaceDrag(
  down: PointerDragInit,
  source: HTMLElement,
  surface: Surface,
  projectPath: string,
  home: SurfaceHome
): void {
  let ghost: ReturnType<typeof createGhost> | null = null;

  armPointerDrag(down, {
    onStart() {
      ghost = createGhost(source);
    },
    onMove(e) {
      ghost?.move(e.clientX, e.clientY);
      const overHome = trackHome(home, e.clientX, e.clientY);
      if (!overHome && !surface.isGroup) {
        trackDropZone(surface.id, e.clientX, e.clientY, 'add');
      } else {
        useLayout.getState().setSplitDrop(null);
      }
    },
    onDrop() {
      const layout = useLayout.getState();
      const { stripDrop, dockDrop, splitDrop } = layout;
      const homeIndex = home === 'strip' ? stripDrop : dockDrop;
      if (homeIndex !== null) {
        layout.reorderSurface(projectPath, surface.id, homeIndex);
      } else if (splitDrop !== null && !surface.isGroup) {
        layout.splitWith(
          projectPath,
          splitDrop.leafId,
          splitDrop.edge,
          surface.id
        );
      }
    },
    onEnd() {
      ghost?.destroy();
      ghost = null;
      useLayout.getState().clearDragUi();
    }
  });
}

/**
 * Drag a split's header. Two destinations (Phase 86):
 *  - onto the tab strip (top) or dock list (right): the S2-style insertion
 *    indicator appears and the drop pops the leaf out at that index (S4A
 *    "Pop out");
 *  - onto another leaf of the same split: the --drop-wash overlay arms on the
 *    armed half and the drop moves the leaf there, without it ever leaving
 *    the group.
 * Anywhere else = no-op, and Esc cancels both with no motion and no write,
 * because `armPointerDrag` does not call `onDrop` on a cancel.
 */
export function startHeaderDrag(
  down: PointerDragInit,
  source: HTMLElement,
  sessionId: string,
  projectPath: string,
  home: SurfaceHome
): void {
  let ghost: ReturnType<typeof createGhost> | null = null;

  armPointerDrag(down, {
    onStart() {
      ghost = createGhost(source);
    },
    onMove(e) {
      ghost?.move(e.clientX, e.clientY);
      const overHome = trackHome(home, e.clientX, e.clientY);
      if (!overHome) trackDropZone(sessionId, e.clientX, e.clientY, 'move');
      else useLayout.getState().setSplitDrop(null);
    },
    onDrop() {
      const layout = useLayout.getState();
      const homeIndex = home === 'strip' ? layout.stripDrop : layout.dockDrop;
      if (homeIndex !== null) {
        layout.popOut(projectPath, sessionId, homeIndex);
        return;
      }
      const zone = layout.splitDrop;
      if (zone !== null) {
        layout.moveLeafWithin(projectPath, sessionId, zone.leafId, zone.edge);
      }
    },
    onEnd() {
      ghost?.destroy();
      ghost = null;
      useLayout.getState().clearDragUi();
    }
  });
}

/**
 * The refusals every draggable session surface shares, in one place so the
 * strip tab, dock row, and both group surfaces cannot drift apart:
 *  - a secondary press, which is opening a context menu, not starting a drag;
 *  - a rename in flight — the row must hold still while the user types;
 *  - a nested interactive (close ×, the rename input) under the pointer.
 *
 * Group tabs/rows have no rename of their own, so they pass the store's
 * "is ANY rename open" answer.
 */
export function pressBlocksSurfaceDrag(
  e: { button: number; ctrlKey: boolean; target: EventTarget | null },
  renaming: boolean
): boolean {
  return (
    isSecondaryPress(e) ||
    renaming ||
    (e.target as HTMLElement | null)?.closest('button, input') != null
  );
}

/**
 * The four gesture handlers every single-session row/tab shares — select,
 * rename, drag-to-reorder/split, context menu (S4 "Shared behaviors").
 * Extracted by the Phase-10 integrator dup-scan (guardrail 4) from the
 * strip tab and dock row so the surfaces cannot drift.
 */
export function sessionGestureProps(args: {
  session: Session;
  surface: Surface;
  projectPath: string;
  home: SurfaceHome;
  renaming: boolean;
  activeSurface: Surface | null;
  activeLeafId: string;
}): Pick<
  React.HTMLAttributes<HTMLDivElement>,
  'onClick' | 'onDoubleClick' | 'onPointerDown' | 'onContextMenu'
> {
  const { session, surface, projectPath, home, renaming } = args;
  return {
    onClick: () => useApp.getState().setActiveSession(session.id),
    onDoubleClick: () => useApp.getState().setRenaming(session.id),
    onPointerDown: (e) => {
      if (pressBlocksSurfaceDrag(e, renaming)) return;
      startSurfaceDrag(e.nativeEvent, e.currentTarget, surface, projectPath, home);
    },
    onContextMenu: (e) => {
      e.preventDefault();
      useApp.getState().setMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          ...sessionMenuItems(session, session.id),
          ...openInSplitItems(
            projectPath,
            session,
            args.activeSurface,
            args.activeLeafId
          )
        ]
      });
    }
  };
}
