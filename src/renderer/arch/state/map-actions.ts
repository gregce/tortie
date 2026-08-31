/**
 * The map, the drill and the canvas: one of the three action modules behind
 * `useArch` (Phase 172; the bodies are store.ts's own, bytes unchanged).
 *
 * Everything here is a READING of main's fact base plus where the person is
 * in it: the level 1 map, the level 2 part, the level 3 module list, and the
 * kept camera and layout. Nothing here writes to any session, nothing here
 * touches the contract, and the only file writes are the canvas rows in
 * `arch.db`, whose loss whole costs a re-layout and nothing else.
 */

import type { StateCreator } from 'zustand';
import { canvasBridge, mapBridge, mapPartBridge } from '../bridge';
import type {
  ArchCameraState,
  ArchMapPartResult,
  ArchMapResult,
  ArchModuleFilesResult
} from '../bridge';
import { moduleFilesBridge } from '../modules';
import {
  ARCH_DRILL_NO_BRIDGE,
  ARCH_DRILL_PART_ERROR,
  ARCH_MAP_ERROR,
  ARCH_MAP_NO_BRIDGE
} from '../copy';
import {
  canvasKey,
  DRILL_HOME,
  drillPatch,
  moduleKey,
  partKey
} from './view-state';
import type { ArchDrill, ArchViewState } from './view-state';

/**
 * Repositories whose map should be read AGAIN the moment the read in flight
 * settles (Phase 160). Module scope rather than store state because it is
 * bookkeeping about calls, not something any surface renders.
 */
const pendingMapReads = new Set<string>();

/** The scoped twins of {@link pendingMapReads}, keyed by the entry keys. */
const pendingPartReads = new Set<string>();
const pendingModuleReads = new Set<string>();

/**
 * The ONE read fold every map read uses (extracted by the integrator, Phase
 * 161, from three copies of the same block).
 *
 * One read in flight per key. An ask that lands while one is out is NOT
 * dropped: the facts may have moved between the send and the answer, so it
 * queues exactly one follow up read, which runs when the current one
 * settles. A burst of pushes still folds to two reads. The last good value
 * stays on screen through a failed re-read, with the failure named beside
 * it, and a missing bridge is an error entry rather than a hang.
 */
async function foldedRead<V>(opts: {
  key: string;
  pending: Set<string>;
  /** True when the held entry is already loading, so this ask queues. */
  loading: boolean;
  /** The read itself, or null when the bridge is absent in this build. */
  read: (() => Promise<V>) | null;
  /** The value held before this ask, kept on screen while it runs. */
  held: V | null;
  /** The value held NOW, read after an await so a race cannot blank it. */
  latest: () => V | null;
  patch: (
    status: 'loading' | 'ready' | 'error',
    value: V | null,
    error: string | null
  ) => void;
  noBridge: string;
  fallback: string;
  /** Runs after a ready patch, for the known-false pop. */
  onReady?: (value: V) => void;
  /** The queued follow up read. */
  again: () => void;
}): Promise<void> {
  if (opts.loading) {
    opts.pending.add(opts.key);
    return;
  }
  if (opts.read === null) {
    opts.patch('error', opts.held, opts.noBridge);
    return;
  }
  opts.patch('loading', opts.held, null);
  try {
    const value = await opts.read();
    opts.patch('ready', value, null);
    opts.onReady?.(value);
  } catch (err) {
    opts.patch(
      'error',
      opts.latest(),
      err instanceof Error && err.message.length > 0
        ? err.message
        : opts.fallback
    );
  }
  if (opts.pending.delete(opts.key)) opts.again();
}

/**
 * PHASE 162. The camera write-at-rest debounce (spec open question 5): keep
 * calls land in memory immediately and the database write fires once the
 * camera has been still for this long. Inertia glides for a few hundred
 * milliseconds; one write per rest is the contract, one per frame is the
 * defect this exists to prevent.
 *
 * Module scope rather than store state because it is bookkeeping about
 * calls, the `pendingMapReads` precedent. A camera lost to a quit inside the
 * window costs the next open one fit, on a database whose loss whole costs a
 * re-layout, so no flush-on-quit machinery is warranted.
 */
const CAMERA_SAVE_REST_MS = 400;
const cameraSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCameraSave(
  repoPath: string,
  scope: string,
  camera: ArchCameraState
): void {
  const api = canvasBridge();
  if (api === null) return;
  const key = canvasKey(repoPath, scope);
  const held = cameraSaveTimers.get(key);
  if (held !== undefined) clearTimeout(held);
  cameraSaveTimers.set(
    key,
    setTimeout(() => {
      cameraSaveTimers.delete(key);
      // Fire and forget: a refused write is logged in main with the field
      // named, and the in-memory camera above is already what draws.
      void api
        .setCamera({ cwd: repoPath, scope, camera })
        .catch(() => undefined);
    }, CAMERA_SAVE_REST_MS)
  );
}


/** The map, drill and canvas slice of {@link ArchViewState}. */
type MapActions = Pick<
  ArchViewState,
  | 'loadMap'
  | 'mapFor'
  | 'drillFor'
  | 'drillInto'
  | 'drillIntoModule'
  | 'drillUp'
  | 'drillHome'
  | 'loadPartMap'
  | 'partMapFor'
  | 'loadModuleView'
  | 'moduleViewFor'
  | 'loadCanvas'
  | 'canvasFor'
  | 'keepCamera'
  | 'keepLayout'
  | 'relayout'
>;

export const createMapActions: StateCreator<
  ArchViewState,
  [],
  [],
  MapActions
> = (set, get) => ({
  async loadMap(repoPath) {
    const held = get().maps[repoPath];
    const api = mapBridge();
    await foldedRead<ArchMapResult>({
      key: repoPath,
      pending: pendingMapReads,
      loading: held?.status === 'loading',
      read: api === null ? null : () => api.map({ cwd: repoPath }),
      held: held?.model ?? null,
      latest: () => get().maps[repoPath]?.model ?? null,
      patch: (status, model, error) => {
        set((s) => ({ maps: { ...s.maps, [repoPath]: { status, model, error } } }));
      },
      noBridge: ARCH_MAP_NO_BRIDGE,
      fallback: ARCH_MAP_ERROR,
      again: () => void get().loadMap(repoPath)
    });
  },

  mapFor(repoPath) {
    return get().maps[repoPath] ?? null;
  },

  drillFor(repoPath) {
    return get().drills[repoPath] ?? DRILL_HOME;
  },

  drillInto(repoPath, groupId, groupLabel) {
    set((s) => drillPatch(s, repoPath, { level: 2, groupId, groupLabel }));
    void get().loadPartMap(repoPath, groupId);
  },

  drillIntoModule(repoPath, moduleDir, moduleLabel) {
    const d = get().drillFor(repoPath);
    // A module belongs to a part. With no part drilled there is nothing this
    // gesture could scope, so it does nothing rather than inventing a level.
    if (d.level === 1) return;
    set((s) =>
      drillPatch(s, repoPath, {
        level: 3,
        groupId: d.groupId,
        groupLabel: d.groupLabel,
        moduleDir,
        moduleLabel
      })
    );
    void get().loadModuleView(repoPath, moduleDir);
  },

  drillUp(repoPath) {
    const d = get().drillFor(repoPath);
    if (d.level === 1) return;
    const next: ArchDrill =
      d.level === 3
        ? { level: 2, groupId: d.groupId, groupLabel: d.groupLabel }
        : DRILL_HOME;
    set((s) => drillPatch(s, repoPath, next));
  },

  drillHome(repoPath) {
    if (get().drills[repoPath] === undefined) return;
    set((s) => drillPatch(s, repoPath, DRILL_HOME));
  },

  async loadPartMap(repoPath, groupId) {
    const key = partKey(repoPath, groupId);
    const held = get().partMaps[key];
    const api = mapPartBridge();
    await foldedRead<ArchMapPartResult>({
      key,
      pending: pendingPartReads,
      loading: held?.status === 'loading',
      read: api === null ? null : () => api.mapPart({ cwd: repoPath, groupId }),
      held: held?.model ?? null,
      latest: () => get().partMaps[key]?.model ?? null,
      patch: (status, model, error) => {
        set((s) => ({ partMaps: { ...s.partMaps, [key]: { status, model, error } } }));
      },
      noBridge: ARCH_DRILL_NO_BRIDGE,
      fallback: ARCH_DRILL_PART_ERROR,
      onReady: (model) => {
        // The facts moved under the drill and this part is not in the
        // partition any more. The drill pops to the deepest level that still
        // resolves, which is the whole map: never a crash, never a frozen
        // scope drawn as truth.
        if (!model.known) {
          const d = get().drillFor(repoPath);
          if (d.level !== 1 && d.groupId === groupId) {
            set((s) => drillPatch(s, repoPath, DRILL_HOME));
          }
        }
      },
      again: () => void get().loadPartMap(repoPath, groupId)
    });
  },

  partMapFor(repoPath, groupId) {
    return get().partMaps[partKey(repoPath, groupId)] ?? null;
  },

  async loadModuleView(repoPath, moduleDir) {
    const key = moduleKey(repoPath, moduleDir);
    const held = get().moduleViews[key];
    const api = moduleFilesBridge();
    await foldedRead<ArchModuleFilesResult>({
      key,
      pending: pendingModuleReads,
      loading: held?.status === 'loading',
      read:
        api === null
          ? null
          : () => api.moduleFiles({ cwd: repoPath, dir: moduleDir }),
      held: held?.result ?? null,
      latest: () => get().moduleViews[key]?.result ?? null,
      patch: (status, result, error) => {
        set((s) => ({
          moduleViews: { ...s.moduleViews, [key]: { status, result, error } }
        }));
      },
      noBridge: ARCH_DRILL_NO_BRIDGE,
      fallback: ARCH_DRILL_PART_ERROR,
      onReady: (result) => {
        // The folder names no tracked file any more: the facts moved under
        // the drill. Pop one rung to the part, which still resolves, rather
        // than drawing an empty scope as truth.
        if (!result.known) {
          const d = get().drillFor(repoPath);
          if (d.level === 3 && d.moduleDir === moduleDir) {
            set((s) =>
              drillPatch(s, repoPath, {
                level: 2,
                groupId: d.groupId,
                groupLabel: d.groupLabel
              })
            );
          }
        }
      },
      again: () => void get().loadModuleView(repoPath, moduleDir)
    });
  },

  moduleViewFor(repoPath, moduleDir) {
    return get().moduleViews[moduleKey(repoPath, moduleDir)] ?? null;
  },

  async loadCanvas(repoPath, scope) {
    const key = canvasKey(repoPath, scope);
    // Once per window per scope: the held entry IS the answer, and the only
    // other writer of these rows is this window's own keep calls, which
    // update the held entry as they write. A second window's writes are not
    // watched, deliberately: two cameras over one scope is a race nobody
    // wins, and the last one to rest is the one that is kept.
    if (get().canvas[key] !== undefined) return;
    const api = canvasBridge();
    if (api === null) {
      // An older preload keeps nothing. Ready with nulls: the drawing
      // computes its fit and its layout fresh, the first-run path.
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: { status: 'ready', camera: null, positions: null }
        }
      }));
      return;
    }
    set((s) => ({
      canvas: {
        ...s.canvas,
        [key]: { status: 'loading', camera: null, positions: null }
      }
    }));
    try {
      const result = await api.canvasState({ cwd: repoPath, scope });
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: {
            status: 'ready',
            camera: result.camera,
            positions: result.positions.length === 0 ? null : result.positions
          }
        }
      }));
    } catch {
      // A failed read costs a re-fit and a re-layout, nothing else, per the
      // doctrine on arch.db. Nulls, and the drawing computes fresh.
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: { status: 'error', camera: null, positions: null }
        }
      }));
    }
  },

  canvasFor(repoPath, scope) {
    return get().canvas[canvasKey(repoPath, scope)] ?? null;
  },

  keepCamera(repoPath, scope, camera) {
    const key = canvasKey(repoPath, scope);
    set((s) => {
      const held = s.canvas[key];
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held?.status ?? 'ready',
            camera,
            positions: held?.positions ?? null
          }
        }
      };
    });
    scheduleCameraSave(repoPath, scope, camera);
  },

  keepLayout(repoPath, scope, positions) {
    const key = canvasKey(repoPath, scope);
    const kept = Object.freeze([...positions]);
    set((s) => {
      const held = s.canvas[key];
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held?.status ?? 'ready',
            camera: held?.camera ?? null,
            positions: kept
          }
        }
      };
    });
    const api = canvasBridge();
    if (api === null) return;
    // Fire and forget: a refused write is logged in main with the field
    // named, and the held entry above still draws. Nothing here can throw at
    // the gesture that caused it.
    void api
      .setLayout({ cwd: repoPath, scope, positions: [...positions] })
      .catch(() => undefined);
  },

  async relayout(repoPath, scope) {
    const key = canvasKey(repoPath, scope);
    set((s) => {
      const held = s.canvas[key];
      if (held === undefined) return {};
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held.status,
            camera: held.camera,
            positions: null
          }
        }
      };
    });
    const api = canvasBridge();
    if (api === null) return;
    try {
      await api.clearLayout({ cwd: repoPath, scope });
    } catch {
      // The stored rows outlived the click. The held entry is already null,
      // so THIS window re-lays out either way, and the next open pays one
      // more click. Nothing worth surfacing over a disposable database.
    }
  },
});

/**
 * Ask again for every scoped reading this window holds of one repository
 * (Phase 161). Runs on the same two pushes the level 1 map re-reads on, so
 * the drilled picture and the whole picture can never sit at two different
 * readings of the facts for longer than a read takes.
 */
export function reloadScopedReads(s: ArchViewState, cwd: string): void {
  const prefix = `${cwd}\u0000`;
  for (const key of Object.keys(s.partMaps)) {
    if (key.startsWith(prefix)) {
      void s.loadPartMap(cwd, key.slice(prefix.length));
    }
  }
  for (const key of Object.keys(s.moduleViews)) {
    if (key.startsWith(prefix)) {
      void s.loadModuleView(cwd, key.slice(prefix.length));
    }
  }
}
