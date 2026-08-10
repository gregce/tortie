/**
 * Layout slice (S4A + S4 drag round) — per-project session-surface state:
 * the ordered tab strip / dock list of SURFACES (single sessions or split
 * groups), each group's split tree + ratios + remembered focused leaf, and
 * the transient drag state (insertion indicators, armed drop zone).
 *
 * Persistence: per-project layouts in localStorage (presentation state —
 * losing it costs pixels, never sessions). The manifest/tmux layer never
 * learns about splits; leaves are ordinary sessions.
 *
 * Source of truth for "which session is active" stays useApp
 * (activeSessionByProject): selecting a leaf routes through
 * useApp.setActiveSession, and the active surface is DERIVED as the surface
 * containing the active session — so ⌘J jumps, quick-create, restore and
 * every existing selection path light the right surface for free.
 */

import { create } from 'zustand';
import type { Session } from '@shared/types';
import { loadLocal, saveLocal, useApp } from './store';
import {
  leaf,
  leafIds,
  leafRects,
  MAX_LEAVES,
  nearestLeaf,
  pruneLeaves,
  removeLeaf,
  setRatioAt,
  splitLeaf
} from './split-tree';
import type { NavDir, SplitEdge, SplitNode } from './split-tree';

export type { NavDir, SplitEdge, SplitNode };

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

interface SurfaceGroupState {
  root: SplitNode;
  /** Remembered focused leaf (used when the active session is elsewhere). */
  focused: string;
}

interface ProjectLayoutState {
  /** Surface order: session ids (singles) and group ids, strip order. */
  order: string[];
  groups: Record<string, SurfaceGroupState>;
}

/** A derived surface — what one strip tab / dock row renders. */
export interface Surface {
  /** Session id for singles; generated group id for split groups. */
  id: string;
  root: SplitNode;
  /** Leaf session ids in layout order. */
  leafIds: string[];
  isGroup: boolean;
}

/** Armed drop zone while a session tab/row is dragged over the terminal. */
export interface SplitDropZone {
  leafId: string;
  edge: SplitEdge;
}

interface LayoutState {
  layouts: Record<string, ProjectLayoutState>;

  // Transient drag UI (never persisted).
  /** Insertion index into the surface order — top strip indicator. */
  stripDrop: number | null;
  /** Insertion index into the surface order — right dock indicator. */
  dockDrop: number | null;
  /** Armed half of a leaf (S4A drop overlay). */
  splitDrop: SplitDropZone | null;

  setStripDrop(index: number | null): void;
  setDockDrop(index: number | null): void;
  setSplitDrop(zone: SplitDropZone | null): void;
  clearDragUi(): void;

  /** Prune dead sessions / dissolved groups and persist the result. */
  reconcile(projectId: string, sessionIds: string[]): void;
  /** Move a surface to a new index in the strip/dock order. */
  reorderSurface(projectId: string, surfaceId: string, toIndex: number): void;
  /**
   * Drop a dragged SINGLE surface onto a leaf's armed half: the leaf's box
   * divides 50/50, the dragged session takes the lit half and focus, and
   * its own tab/row leaves the strip (S4A).
   */
  splitWith(
    projectId: string,
    targetLeafId: string,
    edge: SplitEdge,
    draggedId: string
  ): void;
  /** Remove a leaf from its group into its own tab/row at `toIndex`. */
  popOut(projectId: string, sessionId: string, toIndex: number | null): void;
  /** Pop every leaf of a group out, in layout order (group context menu). */
  breakUp(projectId: string, groupId: string): void;
  /** Divider drag: set a branch node's ratio (path per split-tree). */
  setSurfaceRatio(
    projectId: string,
    surfaceId: string,
    path: string,
    ratio: number
  ): void;
  /** Select a leaf: remembers group focus + routes to useApp. */
  selectLeaf(projectId: string, sessionId: string): void;
  /**
   * ⌘⌥-arrow focus move. Nearest leaf in `dir` within the active surface;
   * at the surface's top/bottom edge ↑/↓ continue to the previous/next
   * surface (so unsplit surfaces cycle exactly as before); ←/→ edge no-op.
   */
  navigate(dir: NavDir): void;
  /** Next/previous surface in strip order (⌘⌥↓/↑ fallthrough). */
  cycleSurface(delta: 1 | -1): void;
  /** Shot-harness helper: arrange the given sessions as one split group. */
  stageGrid(projectId: string, sessionIds: string[]): void;
}

// ---------------------------------------------------------------------------
// Derivation (pure, render-safe)
// ---------------------------------------------------------------------------

const LS_LAYOUTS = 'gmux.splitLayouts';

let groupSeq = 0;
function newGroupId(): string {
  groupSeq += 1;
  return `g:${Date.now().toString(36)}-${groupSeq}`;
}

/**
 * Resolve the persisted layout against the live session list. Defensive:
 * dead leaves collapse (sibling absorbs), one-leaf groups dissolve back to
 * plain tabs, unknown ids drop, unlisted sessions append in creation order.
 */
export function deriveSurfaces(
  layout: ProjectLayoutState | undefined,
  sessionIds: string[]
): Surface[] {
  const valid = new Set(sessionIds);
  const claimed = new Set<string>();
  const surfaces: Surface[] = [];

  for (const id of layout?.order ?? []) {
    const group = layout?.groups[id];
    if (group !== undefined) {
      const pruned = pruneLeaves(
        group.root,
        (sid) => valid.has(sid) && !claimed.has(sid)
      );
      if (pruned === null) continue;
      const ids = leafIds(pruned);
      for (const sid of ids) claimed.add(sid);
      const first = ids[0];
      if (ids.length === 1 && first !== undefined) {
        surfaces.push({ id: first, root: leaf(first), leafIds: ids, isGroup: false });
      } else {
        surfaces.push({ id, root: pruned, leafIds: ids, isGroup: true });
      }
    } else if (valid.has(id) && !claimed.has(id)) {
      claimed.add(id);
      surfaces.push({ id, root: leaf(id), leafIds: [id], isGroup: false });
    }
  }
  for (const sid of sessionIds) {
    if (!claimed.has(sid)) {
      claimed.add(sid);
      surfaces.push({ id: sid, root: leaf(sid), leafIds: [sid], isGroup: false });
    }
  }
  return surfaces;
}

/** The surface containing a session id (defaults to the last surface). */
export function surfaceOf(
  surfaces: Surface[],
  sessionId: string | null | undefined
): Surface | null {
  if (sessionId != null) {
    const hit = surfaces.find((x) => x.leafIds.includes(sessionId));
    if (hit) return hit;
  }
  return surfaces[surfaces.length - 1] ?? null;
}

/** The focused leaf of a surface (active session wins; else remembered). */
export function focusedLeafOf(
  surface: Surface,
  activeSessionId: string | null | undefined,
  layout: ProjectLayoutState | undefined
): string {
  if (activeSessionId != null && surface.leafIds.includes(activeSessionId)) {
    return activeSessionId;
  }
  const remembered = layout?.groups[surface.id]?.focused;
  if (remembered !== undefined && surface.leafIds.includes(remembered)) {
    return remembered;
  }
  return surface.leafIds[0] ?? '';
}

/** Convenience: derived surfaces for the store's current state. */
function currentSurfaces(
  state: LayoutState,
  projectId: string,
  sessions: Session[]
): Surface[] {
  return deriveSurfaces(
    state.layouts[projectId],
    sessions.map((x) => x.id)
  );
}

/** Serialize derived surfaces back into persistable layout state. */
function toLayoutState(
  surfaces: Surface[],
  prev: ProjectLayoutState | undefined
): ProjectLayoutState {
  const order = surfaces.map((x) => x.id);
  const groups: Record<string, SurfaceGroupState> = {};
  for (const surf of surfaces) {
    if (!surf.isGroup) continue;
    const remembered = prev?.groups[surf.id]?.focused;
    groups[surf.id] = {
      root: surf.root,
      focused:
        remembered !== undefined && surf.leafIds.includes(remembered)
          ? remembered
          : (surf.leafIds[0] ?? '')
    };
  }
  return { order, groups };
}

function sameLayout(a: ProjectLayoutState, b: ProjectLayoutState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLayout = create<LayoutState>((set, get) => {
  const persist = (layouts: Record<string, ProjectLayoutState>): void => {
    saveLocal(LS_LAYOUTS, layouts);
  };

  const write = (
    projectId: string,
    next: ProjectLayoutState
  ): void => {
    const layouts = { ...get().layouts, [projectId]: next };
    set({ layouts });
    persist(layouts);
  };

  /** Sessions of a project, in store (creation) order. */
  const projectSessions = (projectId: string): Session[] =>
    useApp.getState().projectSessions(projectId);

  return {
    layouts: loadLocal<Record<string, ProjectLayoutState>>(LS_LAYOUTS, {}),

    stripDrop: null,
    dockDrop: null,
    splitDrop: null,

    setStripDrop(index) {
      if (get().stripDrop !== index) set({ stripDrop: index });
    },
    setDockDrop(index) {
      if (get().dockDrop !== index) set({ dockDrop: index });
    },
    setSplitDrop(zone) {
      const cur = get().splitDrop;
      if (
        cur === zone ||
        (cur !== null &&
          zone !== null &&
          cur.leafId === zone.leafId &&
          cur.edge === zone.edge)
      ) {
        return;
      }
      set({ splitDrop: zone });
    },
    clearDragUi() {
      const s = get();
      if (
        s.stripDrop !== null ||
        s.dockDrop !== null ||
        s.splitDrop !== null
      ) {
        set({ stripDrop: null, dockDrop: null, splitDrop: null });
      }
    },

    reconcile(projectId, sessionIds) {
      const prev = get().layouts[projectId];
      const surfaces = deriveSurfaces(prev, sessionIds);
      const next = toLayoutState(surfaces, prev);
      if (prev !== undefined && sameLayout(prev, next)) return;
      // A project with only trivial state needs no persisted entry.
      if (
        prev === undefined &&
        Object.keys(next.groups).length === 0
      ) {
        return;
      }
      write(projectId, next);
    },

    reorderSurface(projectId, surfaceId, toIndex) {
      const sessions = projectSessions(projectId);
      const prev = get().layouts[projectId];
      const surfaces = currentSurfaces(get(), projectId, sessions);
      const from = surfaces.findIndex((x) => x.id === surfaceId);
      if (from === -1) return;
      const clamped = Math.max(0, Math.min(surfaces.length, toIndex));
      // Removing first shifts insertion points after `from` down by one.
      const target = clamped > from ? clamped - 1 : clamped;
      if (target === from) return;
      const next = [...surfaces];
      const moved = next.splice(from, 1);
      next.splice(target, 0, ...moved);
      write(projectId, toLayoutState(next, prev));
    },

    splitWith(projectId, targetLeafId, edge, draggedId) {
      const sessions = projectSessions(projectId);
      const prev = get().layouts[projectId];
      const surfaces = currentSurfaces(get(), projectId, sessions);
      const target = surfaces.find((x) => x.leafIds.includes(targetLeafId));
      const dragged = surfaces.find((x) => x.id === draggedId);
      if (
        !target ||
        !dragged ||
        dragged.isGroup ||
        target.id === draggedId ||
        target.leafIds.length >= MAX_LEAVES
      ) {
        return;
      }
      const root = splitLeaf(target.root, targetLeafId, edge, draggedId);
      const id = target.isGroup ? target.id : newGroupId();
      const next: Surface[] = [];
      for (const surf of surfaces) {
        if (surf.id === draggedId) continue; // its tab leaves the strip
        if (surf.id === target.id) {
          next.push({ id, root, leafIds: leafIds(root), isGroup: true });
        } else {
          next.push(surf);
        }
      }
      const state = toLayoutState(next, prev);
      const group = state.groups[id];
      if (group) group.focused = draggedId;
      write(projectId, state);
      useApp.getState().setActiveSession(draggedId);
    },

    popOut(projectId, sessionId, toIndex) {
      const sessions = projectSessions(projectId);
      const prev = get().layouts[projectId];
      const surfaces = currentSurfaces(get(), projectId, sessions);
      const at = surfaces.findIndex(
        (x) => x.isGroup && x.leafIds.includes(sessionId)
      );
      const group = surfaces[at];
      if (at === -1 || group === undefined) return;
      const remaining = removeLeaf(group.root, sessionId);
      if (remaining === null) return; // groups always hold ≥2
      const rest = leafIds(remaining);
      const restFirst = rest[0];
      const next: Surface[] = [];
      for (const surf of surfaces) {
        if (surf.id !== group.id) {
          next.push(surf);
        } else if (rest.length === 1 && restFirst !== undefined) {
          next.push({
            id: restFirst,
            root: leaf(restFirst),
            leafIds: rest,
            isGroup: false
          });
        } else {
          next.push({
            id: group.id,
            root: remaining,
            leafIds: rest,
            isGroup: true
          });
        }
      }
      const insertAt = Math.max(
        0,
        Math.min(next.length, toIndex ?? at + 1)
      );
      next.splice(insertAt, 0, {
        id: sessionId,
        root: leaf(sessionId),
        leafIds: [sessionId],
        isGroup: false
      });
      write(projectId, toLayoutState(next, prev));
      useApp.getState().setActiveSession(sessionId);
    },

    breakUp(projectId, groupId) {
      const sessions = projectSessions(projectId);
      const prev = get().layouts[projectId];
      const surfaces = currentSurfaces(get(), projectId, sessions);
      const at = surfaces.findIndex((x) => x.id === groupId && x.isGroup);
      const group = surfaces[at];
      if (at === -1 || group === undefined) return;
      const singles: Surface[] = group.leafIds.map((sid) => ({
        id: sid,
        root: leaf(sid),
        leafIds: [sid],
        isGroup: false
      }));
      const next = [...surfaces];
      next.splice(at, 1, ...singles);
      write(projectId, toLayoutState(next, prev));
    },

    setSurfaceRatio(projectId, surfaceId, path, ratio) {
      const prev = get().layouts[projectId];
      const group = prev?.groups[surfaceId];
      if (!prev || !group) return;
      const root = setRatioAt(group.root, path, ratio);
      if (root === group.root) return;
      write(projectId, {
        ...prev,
        groups: { ...prev.groups, [surfaceId]: { ...group, root } }
      });
    },

    selectLeaf(projectId, sessionId) {
      const prev = get().layouts[projectId];
      if (prev) {
        // Remember the focus inside whichever group holds this leaf.
        for (const [gid, group] of Object.entries(prev.groups)) {
          if (leafIds(group.root).includes(sessionId)) {
            if (group.focused !== sessionId) {
              write(projectId, {
                ...prev,
                groups: {
                  ...prev.groups,
                  [gid]: { ...group, focused: sessionId }
                }
              });
            }
            break;
          }
        }
      }
      useApp.getState().setActiveSession(sessionId);
    },

    navigate(dir) {
      const app = useApp.getState();
      const projectId = app.activeProjectId;
      if (projectId === null) return;
      const sessions = app.projectSessions(projectId);
      if (sessions.length === 0) return;
      const surfaces = currentSurfaces(get(), projectId, sessions);
      const active = app.activeSession();
      const surface = surfaceOf(surfaces, active?.id ?? null);
      if (surface && surface.isGroup && active) {
        const rects = leafRects(surface.root, { x: 0, y: 0, w: 1, h: 1 });
        const next = nearestLeaf(rects, active.id, dir);
        if (next !== null) {
          get().selectLeaf(projectId, next);
          return;
        }
      }
      // Surface edge: ↑/↓ continue to the previous/next surface (S4A);
      // ←/→ at an edge are no-ops.
      if (dir === 'down') get().cycleSurface(1);
      else if (dir === 'up') get().cycleSurface(-1);
    },

    cycleSurface(delta) {
      const app = useApp.getState();
      const projectId = app.activeProjectId;
      if (projectId === null) return;
      const sessions = app.projectSessions(projectId);
      if (sessions.length === 0) return;
      const surfaces = currentSurfaces(get(), projectId, sessions);
      if (surfaces.length < 2) return;
      const active = app.activeSession();
      const current = surfaceOf(surfaces, active?.id ?? null);
      const at = surfaces.findIndex((x) => x.id === current?.id);
      const next =
        surfaces[(at + delta + surfaces.length) % surfaces.length];
      if (!next) return;
      const target = focusedLeafOf(
        next,
        null,
        get().layouts[projectId]
      );
      if (target !== '') get().selectLeaf(projectId, target);
    },

    stageGrid(projectId, sessionIds) {
      const [a, b, c, d] = sessionIds;
      if (
        a === undefined ||
        b === undefined ||
        c === undefined ||
        d === undefined
      ) {
        return;
      }
      // 2×2: row of two columns.
      const root: SplitNode = {
        type: 'branch',
        dir: 'row',
        ratio: 0.5,
        a: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf(a), b: leaf(c) },
        b: { type: 'branch', dir: 'column', ratio: 0.5, a: leaf(b), b: leaf(d) }
      };
      const sessions = projectSessions(projectId);
      const prev = get().layouts[projectId];
      const surfaces = currentSurfaces(get(), projectId, sessions).filter(
        (x) => !sessionIds.includes(x.id)
      );
      const id = newGroupId();
      surfaces.push({ id, root, leafIds: leafIds(root), isGroup: true });
      const state = toLayoutState(surfaces, prev);
      const group = state.groups[id];
      if (group) group.focused = a;
      write(projectId, state);
      useApp.getState().setActiveSession(a);
    }
  };
});
