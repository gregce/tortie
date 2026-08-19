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
 * Phase 38: the record keys by the project's ABSOLUTE PATH, not the project
 * row's UUID. Closing a project deletes its row and reopening mints a fresh
 * UUID, so a UUID-keyed layout was orphaned the moment its tab closed. The
 * path survives close and reopen, and sessions already rebind to a reopened
 * project by projectPath. Leaf ids stay manifest session UUIDs, which live
 * through a project close (Phase 26). `write` refuses any key that does not
 * start with '/', so no caller can silently reintroduce a UUID key. Writes
 * debounce 200 ms (a divider drag fires per pointer move) and a pagehide
 * listener flushes the pending write, so app quit loses nothing.
 *
 * Source of truth for "which session is active" stays useApp
 * (activeSessionByProject): selecting a leaf routes through
 * useApp.setActiveSession, and the active surface is DERIVED as the surface
 * containing the active session — so ⌘J jumps, quick-create, restore and
 * every existing selection path light the right surface for free.
 */

import { create } from 'zustand';
import type { Project, Session } from '@shared/types';
import {
  sameTarget,
  targetKey,
  targetOfProject,
  targetOfSession
} from '@shared/workspace-target';
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
import { readPopOutFocus } from './pop-out-focus';

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
  /** Persisted layouts, keyed by the project's absolute path (Phase 38). */
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
  reconcile(projectPath: string, sessionIds: string[]): void;
  /** Move a surface to a new index in the strip/dock order. */
  reorderSurface(projectPath: string, surfaceId: string, toIndex: number): void;
  /**
   * Drop a dragged SINGLE surface onto a leaf's armed half: the leaf's box
   * divides 50/50, the dragged session takes the lit half and focus, and
   * its own tab/row leaves the strip (S4A).
   */
  splitWith(
    projectPath: string,
    targetLeafId: string,
    edge: SplitEdge,
    draggedId: string
  ): void;
  /**
   * Phase 86. Move a leaf that is ALREADY in a group to another position in
   * that same group: it leaves its slot, its sibling absorbs the space, and it
   * takes the armed half of the target leaf at 50/50. Nothing leaves the
   * group, so no tab appears in the strip and MAX_LEAVES is not consulted.
   */
  moveLeafWithin(
    projectPath: string,
    sessionId: string,
    targetLeafId: string,
    edge: SplitEdge
  ): void;
  /** Remove a leaf from its group into its own tab/row at `toIndex`. */
  popOut(projectPath: string, sessionId: string, toIndex: number | null): void;
  /** Pop every leaf of a group out, in layout order (group context menu). */
  breakUp(projectPath: string, groupId: string): void;
  /** Divider drag: set a branch node's ratio (path per split-tree). */
  setSurfaceRatio(
    projectPath: string,
    surfaceId: string,
    path: string,
    ratio: number
  ): void;
  /** Select a leaf: remembers group focus + routes to useApp. */
  selectLeaf(projectPath: string, sessionId: string): void;
  /**
   * ⌘⌥-arrow focus move. Nearest leaf in `dir` within the active surface;
   * at the surface's top/bottom edge ↑/↓ continue to the previous/next
   * surface (so unsplit surfaces cycle exactly as before); ←/→ edge no-op.
   */
  navigate(dir: NavDir): void;
  /** Next/previous surface in strip order (⌘⌥↓/↑ fallthrough). */
  cycleSurface(delta: 1 | -1): void;
  /** Shot-harness helper: arrange the given sessions as one split group. */
  stageGrid(projectPath: string, sessionIds: string[]): void;
  /**
   * One-shot boot migration (Phase 38). For each open project whose layout
   * still sits under the project UUID, adopt that entry under the project's
   * path. Then drop every remaining key that is not an absolute path. Those
   * are orphans of projects closed before this phase, and the mapping from
   * their UUID to a path died with the project row.
   */
  migrateLegacyLayouts(projects: Project[]): void;
}

// ---------------------------------------------------------------------------
// Derivation (pure, render-safe)
// ---------------------------------------------------------------------------

const LS_LAYOUTS = 'gmux.splitLayouts';

/**
 * PHASE 90.3. What a layout record is keyed by, and why the callers did not
 * have to change.
 *
 * The key is `targetKey` from src/shared/workspace-target.ts. A local target's
 * key IS the bare absolute path, so every record a person already has keeps
 * working byte for byte and the `gmux.splitLayouts` name does not move. A folder
 * on another machine keys as `<machineId>:/path`, which cannot collide with a
 * path because a machine id matches `^[a-z][a-z0-9-]{0,31}$` and a path starts
 * with a slash.
 *
 * EVERY CALLER STILL PASSES `project.path`, and that is deliberate. Fourteen
 * components pass this value down as a prop, and widening all of them would be a
 * large change to files this phase does not otherwise touch. So the resolution
 * happens HERE instead, and it has one rule.
 *
 * A key that is already a target key is used as it stands. A bare path is
 * resolved against the ACTIVE project, and that is correct rather than a
 * shortcut: every one of these call sites is a surface drawing the active tab's
 * sessions, so the active project is the project the caller means. When the
 * active project's path does not match, the bare path is used, which is exactly
 * the behaviour before this phase.
 */
function isLayoutKey(key: string): boolean {
  return /^\/|^[a-z][a-z0-9-]{0,31}:\//.test(key);
}

/** The record key for what a caller passed. See the note above. */
function layoutKeyOf(pathOrKey: string): string {
  if (!pathOrKey.startsWith('/')) return pathOrKey;
  const app = useApp.getState();
  const active = app.projects.find((p) => p.id === app.activeProjectId);
  if (active === undefined || active.path !== pathOrKey) return pathOrKey;
  const target = targetOfProject(active);
  return target === null ? pathOrKey : targetKey(target);
}

/** The target a record key names, for comparing a session against it. */
function targetOfLayoutKey(pathOrKey: string): {
  machineId: string;
  path: string;
} | null {
  const key = layoutKeyOf(pathOrKey);
  if (key.startsWith('/')) return { machineId: 'local', path: key };
  const at = key.indexOf(':');
  if (at <= 0) return null;
  return { machineId: key.slice(0, at), path: key.slice(at + 1) };
}

/**
 * The record key for one project, for a caller that HAS the project row.
 *
 * `../app/surfaces.ts` reads the record directly rather than through an action,
 * so it needs the same key this store writes under.
 */
export function layoutKeyForProject(project: Project | null): string {
  const target = targetOfProject(project);
  return target === null ? '' : targetKey(target);
}

/** Trailing debounce for the localStorage write (divider drags burst). */
const PERSIST_DEBOUNCE_MS = 200;

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
  projectPath: string,
  sessions: Session[]
): Surface[] {
  return deriveSurfaces(
    state.layouts[layoutKeyOf(projectPath)],
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
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** Schedule the localStorage write; in-memory state is already current. */
  const schedulePersist = (): void => {
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      saveLocal(LS_LAYOUTS, get().layouts);
    }, PERSIST_DEBOUNCE_MS);
  };

  /** Write a pending layout immediately (app quit must lose nothing). */
  const flushPersist = (): void => {
    if (persistTimer === null) return;
    clearTimeout(persistTimer);
    persistTimer = null;
    saveLocal(LS_LAYOUTS, get().layouts);
  };

  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    window.addEventListener('pagehide', flushPersist);
  }

  const write = (projectPath: string, next: ProjectLayoutState): void => {
    const key = layoutKeyOf(projectPath);
    // Phase 38 guard, widened by Phase 90.3. The record keys by the target, and
    // a local target's key is the bare absolute path, byte for byte what every
    // key in a person's storage already is. A folder on another machine keys as
    // `<machineId>:/path`. Anything else is a bug at the call site (most likely
    // a project UUID), and persisting it would orphan the layout on close.
    if (!isLayoutKey(key)) {
      console.error(
        `layout: refused to persist under key '${key}'. ` +
          'Layout records are keyed by the project target.'
      );
      return;
    }
    const layouts = { ...get().layouts, [key]: next };
    set({ layouts });
    schedulePersist();
  };

  /**
   * Sessions of a project, in store (creation) order.
   *
   * PHASE 90.3 made this compare the PAIR. A bare path comparison put a session
   * on another machine into the layout of a tab on this Mac whenever the two
   * folders happened to have the same path.
   */
  const projectSessions = (projectPath: string): Session[] => {
    const target = targetOfLayoutKey(projectPath);
    return useApp
      .getState()
      .sessions.filter((x) => sameTarget(targetOfSession(x), target));
  };

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

    reconcile(projectPath, sessionIds) {
      const prev = get().layouts[layoutKeyOf(projectPath)];
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
      write(projectPath, next);
    },

    reorderSurface(projectPath, surfaceId, toIndex) {
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions);
      const from = surfaces.findIndex((x) => x.id === surfaceId);
      if (from === -1) return;
      const clamped = Math.max(0, Math.min(surfaces.length, toIndex));
      // Removing first shifts insertion points after `from` down by one.
      const target = clamped > from ? clamped - 1 : clamped;
      if (target === from) return;
      const next = [...surfaces];
      const moved = next.splice(from, 1);
      next.splice(target, 0, ...moved);
      write(projectPath, toLayoutState(next, prev));
    },

    splitWith(projectPath, targetLeafId, edge, draggedId) {
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions);
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
      write(projectPath, state);
      useApp.getState().setActiveSession(draggedId);
    },

    moveLeafWithin(projectPath, sessionId, targetLeafId, edge) {
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions);
      const at = surfaces.findIndex(
        (x) => x.isGroup && x.leafIds.includes(sessionId)
      );
      const group = surfaces[at];
      if (at === -1 || group === undefined) return;
      // A leaf cannot move onto itself, and the two must be siblings in one
      // tree. Every refusal here writes nothing and moves no focus.
      if (sessionId === targetLeafId) return;
      if (!group.leafIds.includes(targetLeafId)) return;
      const without = removeLeaf(group.root, sessionId);
      // A group holds two or more leaves, so this cannot happen. The guard is
      // what keeps it from becoming a collapse if it ever does.
      if (without === null) return;
      const root = splitLeaf(without, targetLeafId, edge, sessionId);
      // Dropping a leaf back where it already is must not write, must not
      // re-persist and must not move focus.
      if (JSON.stringify(root) === JSON.stringify(group.root)) return;
      const next: Surface[] = surfaces.map((surf) =>
        surf.id === group.id
          ? {
              id: group.id,
              root,
              leafIds: leafIds(root),
              isGroup: true
            }
          : surf
      );
      write(projectPath, toLayoutState(next, prev));
      // The moved leaf takes the focus. The header press no longer selects on
      // its own (see `leaf-press.ts`) and the drag swallows the click that
      // would have, so this line is the one thing that focuses it. Nothing
      // left the split, so the pop-out preference has no second place to send
      // the eye and is not read here.
      useApp.getState().setActiveSession(sessionId);
    },

    popOut(projectPath, sessionId, toIndex) {
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions);
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
      write(projectPath, toLayoutState(next, prev));
      // Phase 86. Where the eye goes after a leaf leaves a split is the
      // person's choice, read fresh on every pop out so the Settings window's
      // write is in force at once.
      const app = useApp.getState();
      if (readPopOutFocus() === 'moved') {
        app.setActiveSession(sessionId);
        return;
      }
      // 'stayed' means the eye keeps looking at the split the leaf came from,
      // and that is not the same thing as moving no focus. The active surface
      // is DERIVED from the active session, so when the leaf that left was the
      // active one, doing nothing would carry the eye out of the split with
      // it. Point the active session at a leaf that stayed. The group's
      // remembered focus wins when it is still there, and the first remaining
      // leaf answers otherwise.
      if (app.activeProject()?.path !== projectPath) return;
      if (app.activeSession()?.id !== sessionId) return;
      const remembered = prev?.groups[group.id]?.focused;
      const stay =
        remembered !== undefined &&
        remembered !== sessionId &&
        rest.includes(remembered)
          ? remembered
          : restFirst;
      if (stay !== undefined) app.setActiveSession(stay);
    },

    breakUp(projectPath, groupId) {
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions);
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
      write(projectPath, toLayoutState(next, prev));
      // Phase 86. This verb does NOT read the pop-out preference, and it never
      // will. It pops EVERY leaf out at once, so under 'moved' there is no
      // single session that was dragged out, and under 'stayed' there is no
      // split left to keep looking at. Moving no focus is the one answer the
      // preference cannot disagree with.
    },

    setSurfaceRatio(projectPath, surfaceId, path, ratio) {
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const group = prev?.groups[surfaceId];
      if (!prev || !group) return;
      const root = setRatioAt(group.root, path, ratio);
      if (root === group.root) return;
      write(projectPath, {
        ...prev,
        groups: { ...prev.groups, [surfaceId]: { ...group, root } }
      });
    },

    selectLeaf(projectPath, sessionId) {
      const prev = get().layouts[layoutKeyOf(projectPath)];
      if (prev) {
        // Remember the focus inside whichever group holds this leaf.
        for (const [gid, group] of Object.entries(prev.groups)) {
          if (leafIds(group.root).includes(sessionId)) {
            if (group.focused !== sessionId) {
              write(projectPath, {
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
      const project = app.activeProject();
      if (project === null) return;
      const sessions = projectSessions(project.path);
      if (sessions.length === 0) return;
      const surfaces = currentSurfaces(get(), project.path, sessions);
      const active = app.activeSession();
      const surface = surfaceOf(surfaces, active?.id ?? null);
      if (surface && surface.isGroup && active) {
        const rects = leafRects(surface.root, { x: 0, y: 0, w: 1, h: 1 });
        const next = nearestLeaf(rects, active.id, dir);
        if (next !== null) {
          get().selectLeaf(project.path, next);
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
      const project = app.activeProject();
      if (project === null) return;
      const sessions = projectSessions(project.path);
      if (sessions.length === 0) return;
      const surfaces = currentSurfaces(get(), project.path, sessions);
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
        get().layouts[layoutKeyForProject(project)]
      );
      if (target !== '') get().selectLeaf(project.path, target);
    },

    stageGrid(projectPath, sessionIds) {
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
      const sessions = projectSessions(projectPath);
      const prev = get().layouts[layoutKeyOf(projectPath)];
      const surfaces = currentSurfaces(get(), projectPath, sessions).filter(
        (x) => !sessionIds.includes(x.id)
      );
      const id = newGroupId();
      surfaces.push({ id, root, leafIds: leafIds(root), isGroup: true });
      const state = toLayoutState(surfaces, prev);
      const group = state.groups[id];
      if (group) group.focused = a;
      write(projectPath, state);
      useApp.getState().setActiveSession(a);
    },

    migrateLegacyLayouts(projects) {
      const layouts = get().layouts;
      const pathById = new Map(
        projects.map((p) => [p.id, layoutKeyForProject(p)])
      );
      let changed = false;
      const next: Record<string, ProjectLayoutState> = {};
      for (const [key, value] of Object.entries(layouts)) {
        // PHASE 90.3 widened this test from `startsWith('/')` to the same rule
        // `write` uses. Without it a record for a folder on another machine
        // would be read as a legacy project UUID and dropped as an orphan on
        // the next launch.
        if (isLayoutKey(key)) {
          next[key] = value;
          continue;
        }
        // Every non-path key changes the record: it is either adopted under
        // its project's path or dropped as an orphan.
        changed = true;
        const path = pathById.get(key);
        if (
          path !== undefined &&
          layouts[path] === undefined &&
          next[path] === undefined
        ) {
          next[path] = value;
        }
      }
      if (!changed) return;
      set({ layouts: next });
      schedulePersist();
    }
  };
});
