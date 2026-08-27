/**
 * Architecture view state: what the contract says, what Tortie made of it, and
 * nothing else.
 *
 * FIVE RULES, and every one of them is a refusal from research 49 rather than
 * a preference.
 *
 *  1. **Nothing here polls and nothing here announces.** Main re-checks on the
 *     watcher's own fan-out and sends `arch:checked`; this store applies the
 *     answer. There is no toast, no rail badge and no dot on a session tab. A
 *     verdict that changed while you were reading a file is a number that
 *     moved, not an interruption.
 *  2. **NO VERDICT EVER TOUCHES A SESSION'S STATUS.** Nothing in this file
 *     imports the sessions slice for a write, and nothing in it may. Status
 *     semantics belong to session behaviour and this surface is not session
 *     behaviour.
 *  3. **A failed read never blanks the panel.** A contract file that will not
 *     parse is a dropped row with the file, the field and the reason on
 *     screen, beside every row that did load.
 *  4. **Tortie reads `baseline.json` and never writes it.** There is no accept
 *     verb here and there is no verb here that writes any file under
 *     `docs/arch/`. Drafting hands unsaved buffers to the editor; a person
 *     presses Save.
 *  5. **The first check is a question, never a stale verdict.** `firstCheck`
 *     renders as "Not checked yet" and never as "changed", because a run that
 *     has not finished has nothing to say about whether anything moved.
 *
 * WHAT IS NOT HERE, so a later round has something to point at: no layout
 * positions, no payload composer, no send to a session, and no count badge for
 * any surface outside this view to draw. The SELECTION lives here (Phase 64
 * widened it to a list) and the sending does not: composing and delivering are
 * in ./deliver.ts and ./picker.ts, behind one guard, so this file still writes
 * nothing to any session.
 */

import { create } from 'zustand';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchFreshness,
  ArchProblem,
  ArchVerdict
} from '@shared/arch';
// The channel ANSWER shapes, which are the ipc domain's own and not the
// repository's records.
import type { ArchCheckResult, ArchLoadResult } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { localPathOf, sameTarget } from '@shared/workspace-target';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { gmuxBridge } from '../bridge';
import {
  archAvailable,
  archBridge,
  mapBridge,
  mapPartBridge,
  skeletonBridge
} from './bridge';
import type {
  ArchMapPartResult,
  ArchMapResult,
  ArchModuleFilesResult
} from './bridge';
import { moduleFilesBridge } from './modules';
import {
  ARCH_DRILL_NO_BRIDGE,
  ARCH_DRILL_PART_ERROR,
  ARCH_MAP_ERROR,
  ARCH_MAP_NO_BRIDGE
} from './copy';
import { ARCH_SEED_COPIED, ARCH_VIEW_TITLE } from './copy';
import { seedPromptText } from './seed-prompt';

/**
 * `elsewhere` carries exactly one meaning, and it is the one Context's store
 * settled on: this build's preload cannot ask another computer anything, so
 * there is nothing to read and the view says so. Reading a contract on a
 * machine is not in this phase.
 */
export type ArchStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable'
  | 'elsewhere';

/**
 * What the person has selected, as an ORDERED list of opaque strings.
 *
 * Each entry is the verdict's own `subjectId` vocabulary, being
 * `component:<id>`, `edge:<id>` and `gap:<componentId>:<n>`, so the prose
 * panel, the verdict table and the composed payload key on one thing rather
 * than on three that can disagree.
 *
 * PHASE 64 WIDENED IT FROM ONE STRING TO A LIST, and the reason is the verb
 * rather than the view. A scope a person hands to an agent is usually more
 * than one part: two components and the edge between them, or a component and
 * the gap they want closed. Composing that out of one selection at a time
 * would mean composing it out of three separate gestures.
 *
 * THE ORDER IS THE PERSON'S OWN and it is kept. The payload reads in the
 * order they picked, because the first thing they picked is the thing they
 * are thinking about, and a set sorted by id would bury it.
 *
 * IT IS PRESENTATION AND NOTHING ELSE. Nothing here writes to the sessions
 * slice and nothing here sets any session's status. Rule 2 at the head of
 * this file is unchanged by the widening.
 */
export type ArchSelection = readonly string[];

/** The empty selection, as ONE frozen array. See `NONE` below for why. */
const NO_SELECTION: ArchSelection = Object.freeze([]);

/**
 * PHASE 160 — one repository's reading of the MAP model.
 *
 * The last good model stays through a reload, for the reason the contract's
 * own `lastValid` rows stay through a bad read: a picture that blinks blank on
 * every refresh is unusable in the exact minute agents are writing under it.
 * `error` beside a non-null `model` means the newest read failed and what is
 * on screen is the read before it.
 */
export interface ArchMapEntry {
  status: 'loading' | 'ready' | 'error';
  model: ArchMapResult | null;
  error: string | null;
}

/**
 * PHASE 161. Where a person is in one repository's map.
 *
 * THE LADDER, and it is the navigation: level 1 is the whole map, level 2 is
 * one part opened up into its modules, level 3 is one module opened up into
 * its files under Phase 64's caps. The labels travel with the ids so the
 * breadcrumb can name each level without waiting for any read to land.
 *
 * FROZEN IN THE PHASE SPEC: the map tab and the sidebar pane both read this
 * one record, which is what keeps the two surfaces agreeing about where the
 * person is. Never a second copy of this state anywhere.
 */
export type ArchDrill =
  | { level: 1 }
  | { level: 2; groupId: string; groupLabel: string }
  | {
      level: 3;
      groupId: string;
      groupLabel: string;
      moduleDir: string;
      moduleLabel: string;
    };

/** The whole map, the one drill state every repository starts at. */
export const DRILL_HOME: ArchDrill = Object.freeze({ level: 1 });

/**
 * One part's scoped reading, held like `ArchMapEntry` and for the same
 * reason: the last good picture stays through a failed re-read.
 */
export interface ArchPartMapEntry {
  status: 'loading' | 'ready' | 'error';
  model: ArchMapPartResult | null;
  error: string | null;
}

/** One module's level 3 answer, the Phase 64 result scoped to a folder. */
export interface ArchModuleViewEntry {
  status: 'loading' | 'ready' | 'error';
  result: ArchModuleFilesResult | null;
  error: string | null;
}

/**
 * The key one scoped entry lives under. NUL is the separator because it is
 * the one byte a path cannot contain, so two different pairs can never fold
 * into one key.
 */
export function partKey(repoPath: string, groupId: string): string {
  return `${repoPath}\u0000${groupId}`;
}

/** The level 3 twin of {@link partKey}. */
export function moduleKey(repoPath: string, moduleDir: string): string {
  return `${repoPath}\u0000${moduleDir}`;
}

export interface ArchViewState {
  /** Which folder, on which computer, this reading belongs to. */
  target: WorkspaceTarget | null;
  status: ArchStatus;
  /** The whole `arch:load` answer, or null before one has landed. */
  load: ArchLoadResult | null;
  /** The last `arch:check` answer, which supersedes the loaded verdicts. */
  lastCheck: ArchCheckResult | null;
  /** A re-check in flight, and how far along main says it is. */
  checking: boolean;
  progress: { done: number; total: number } | null;
  /** A read that failed outright. One sentence, never a blank panel. */
  error: string | null;
  /** The selected subjects, in the order the person picked them. */
  selected: ArchSelection;
  /** Drafting in flight, so the control cannot be pressed twice. */
  drafting: boolean;
  /**
   * PHASE 160 — the map models this window holds, keyed by repository root.
   *
   * Keyed by repository rather than living beside `load`, because a map tab
   * outlives the active project: a person can switch projects and the tab for
   * the first repository is still on screen and still has to draw. Nothing in
   * an entry writes to any session and nothing in it touches the contract.
   */
  maps: Readonly<Record<string, ArchMapEntry>>;
  /**
   * PHASE 161. Where each repository's map is drilled to. A repository with
   * no entry is at the whole map. The map tab and the sidebar pane both read
   * this one record; there is never a second copy of the drill anywhere.
   */
  drills: Readonly<Record<string, ArchDrill>>;
  /**
   * The scoped part models this window holds, keyed by {@link partKey}. Only
   * the parts the drill can still reach are kept, so the event fan-out never
   * re-reads a scope nobody is looking at.
   */
  partMaps: Readonly<Record<string, ArchPartMapEntry>>;
  /** The level 3 answers this window holds, keyed by {@link moduleKey}. */
  moduleViews: Readonly<Record<string, ArchModuleViewEntry>>;

  syncProject(target: WorkspaceTarget | null): void;
  /**
   * Make sure this project's contract is loaded, and answer when it is.
   *
   * `syncProject` is what the VIEW calls, and it fires the read without
   * waiting because a view has a loading state to draw. Phase 64's picker has
   * no view: it opens a native menu straight out of a session, so it has to be
   * able to wait for the rows it is about to draw. This is that wait, over the
   * same `refresh`, so there is still one read of a contract and not two.
   *
   * It starts no process and it opens no view.
   */
  ensureLoaded(target: WorkspaceTarget | null): Promise<void>;
  refresh(): Promise<void>;
  check(): Promise<void>;
  /** Replace the whole selection with one subject, or clear it with null. */
  select(id: string | null): void;
  /**
   * Add a subject to the selection, or take it out again.
   *
   * This is what a ⌘-click reaches. It appends rather than inserting in any
   * sorted position, so the list stays in the order the person built it.
   */
  toggleSelected(id: string): void;
  /**
   * Replace the whole selection with these subjects, in this order.
   *
   * The picker uses it so that what a person picked in the native menu and
   * what the view shows selected cannot disagree about what was aimed. It is
   * presentation and nothing else, like every other write in this file.
   */
  selectAll(ids: readonly string[]): void;
  /**
   * The subject the prose panel draws, being the LAST one picked.
   *
   * One panel and several selected subjects needs a rule, and the rule is
   * recency: the thing a person just clicked is the thing they are reading
   * about. The other selected rows keep their selected mark, so nothing about
   * the wider selection is hidden by the panel showing one of them.
   */
  focused(): string | null;
  /**
   * PHASE 160 — read one repository's map model from main, or read it again.
   *
   * Idempotent while a read is in flight, so the tab body, the cockpit and a
   * finished check can all ask without stacking calls. It starts no process:
   * `arch:map` composes over the fact base the checkers already build, and
   * the one scan behind it is main's own, shared with the checker path.
   */
  loadMap(repoPath: string): Promise<void>;
  /** The held entry for one repository, or null before the first read. */
  mapFor(repoPath: string): ArchMapEntry | null;

  // PHASE 161. The drill. Action names frozen in the phase spec because the
  // map tab and this store belong to different hands.
  /** Where this repository's map is drilled to. Never null. */
  drillFor(repoPath: string): ArchDrill;
  /** Open one part up: level 2, and the scoped read is fired. */
  drillInto(repoPath: string, groupId: string, groupLabel: string): void;
  /** Open one module of the drilled part up: level 3. */
  drillIntoModule(
    repoPath: string,
    moduleDir: string,
    moduleLabel: string
  ): void;
  /** One level up the ladder. */
  drillUp(repoPath: string): void;
  /** Back to the whole map. */
  drillHome(repoPath: string): void;
  /**
   * Read one part's scoped model, or read it again. Idempotent while a read
   * is in flight, in `loadMap`'s own shape: a burst folds to two reads.
   */
  loadPartMap(repoPath: string, groupId: string): Promise<void>;
  /** The held scoped entry, or null before the first read. */
  partMapFor(repoPath: string, groupId: string): ArchPartMapEntry | null;
  /** Read one module's level 3 answer through the same fold. */
  loadModuleView(repoPath: string, moduleDir: string): Promise<void>;
  /** The held level 3 entry, or null before the first read. */
  moduleViewFor(
    repoPath: string,
    moduleDir: string
  ): ArchModuleViewEntry | null;
  /** Compose the skeleton and open it as unsaved editor buffers. */
  draft(): Promise<void>;
  /** Put the seeding prompt on the clipboard and open the new session sheet. */
  seed(): void;
  /**
   * Subscribe to main's two pushes for as long as the view is mounted.
   *
   * A finished re-check re-reads rather than patching verdicts in place,
   * because `arch:checked` carries counts and not the rows: main is the one
   * place the verdicts live and a second assembly of them here would be a
   * second answer to the same question. NOTHING IS ANNOUNCED. No toast, no
   * badge, no dot on a session tab. A verdict that changed while a person was
   * reading a file is a number that moved, not an interruption.
   */
  subscribeEvents(): () => void;
  applyProgress(cwd: string, done: number, total: number): void;

  // READONLY on purpose. Every one of these hands back a live reference into
  // the store, and `NONE` below is one frozen array shared by every empty
  // answer. A caller that could push into either would be writing to state
  // through a getter, which is the kind of thing that is found weeks later.
  /** The verdicts in force, being the last check's if there was one. */
  verdicts(): readonly ArchVerdict[];
  /** The contract's components, in the contract's own order. */
  components(): readonly ArchComponent[];
  /** The contract's edges, which are the promises. */
  edges(): readonly ArchEdge[];
  /** Every row that would not load, with its file, its field and its reason. */
  problems(): readonly ArchProblem[];
  /** The strip's counts, reported by coverage so a total cannot flatter. */
  counts(): ArchCoverageCounts | null;
  /** One freshness row per component. */
  freshness(): readonly ArchFreshness[];
  /** A component's display name, or its id when it is not in the contract. */
  nameOf(componentId: string): string;
}

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
 * The next drill state applied, with everything it can no longer reach let
 * go (Phase 161).
 *
 * PURE AND EXPORTED for the unit suite. Scoped entries are pruned to the ones
 * the new drill still points at, so the event fan-out never re-reads a scope
 * nobody can navigate back to without a fresh click, and the records cannot
 * grow without bound over a long session. Entries for OTHER repositories are
 * untouched: a background project's tab keeps its own drill and its own
 * scoped picture.
 */
export function drillPatch(
  s: Pick<ArchViewState, 'drills' | 'partMaps' | 'moduleViews'>,
  repoPath: string,
  next: ArchDrill
): Pick<ArchViewState, 'drills' | 'partMaps' | 'moduleViews'> {
  const drills = { ...s.drills };
  if (next.level === 1) delete drills[repoPath];
  else drills[repoPath] = next;

  const keepPart = next.level === 1 ? null : partKey(repoPath, next.groupId);
  const keepModule =
    next.level === 3 ? moduleKey(repoPath, next.moduleDir) : null;
  const prefix = `${repoPath}\u0000`;

  const partMaps: Record<string, ArchPartMapEntry> = {};
  for (const [key, entry] of Object.entries(s.partMaps)) {
    if (!key.startsWith(prefix) || key === keepPart) partMaps[key] = entry;
  }
  const moduleViews: Record<string, ArchModuleViewEntry> = {};
  for (const [key, entry] of Object.entries(s.moduleViews)) {
    if (!key.startsWith(prefix) || key === keepModule) {
      moduleViews[key] = entry;
    }
  }
  return { drills, partMaps, moduleViews };
}

/**
 * The one empty array every "nothing yet" answer returns.
 *
 * NOT COSMETIC. A selector that builds a fresh `[]` on every call returns a
 * different reference each time, and `useSyncExternalStore` compares snapshots
 * with `Object.is`. React then re-renders, calls the selector again, gets
 * another new array, and the component loops until React aborts it with "the
 * result of getSnapshot should be cached". Every empty answer below hands back
 * this one frozen array instead.
 */
const NONE: readonly never[] = Object.freeze([]);

function errorText(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return 'The contract could not be read.';
}

export const useArch = create<ArchViewState>((set, get) => ({
  target: null,
  status: 'idle',
  load: null,
  lastCheck: null,
  checking: false,
  progress: null,
  error: null,
  selected: NO_SELECTION,
  drafting: false,
  maps: {},
  drills: {},
  partMaps: {},
  moduleViews: {},

  syncProject(target) {
    if (target !== null && sameTarget(get().target, target)) return;
    set({
      target,
      load: null,
      lastCheck: null,
      progress: null,
      error: null,
      selected: NO_SELECTION,
      status: target === null ? 'idle' : 'loading'
    });
    if (target !== null) void get().refresh();
  },

  async ensureLoaded(target) {
    if (target === null) return;
    if (!sameTarget(get().target, target)) {
      set({
        target,
        load: null,
        lastCheck: null,
        progress: null,
        error: null,
        selected: NO_SELECTION,
        status: 'loading'
      });
    }
    if (get().load !== null) return;
    await get().refresh();
  },

  async refresh() {
    const target = get().target;
    if (target === null) return;
    if (!archAvailable()) {
      set({ status: 'unavailable' });
      return;
    }
    const cwd = localPathOf(target);
    if (cwd === null) {
      // Reading a contract on another computer is not in this phase, and the
      // view says that rather than drawing an empty state that would read as
      // "this repository has no contract".
      set({ status: 'elsewhere' });
      return;
    }
    const api = archBridge();
    if (api === null) {
      set({ status: 'unavailable' });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const load = await api.load({ cwd });
      // The project may have changed under a slow read. Land nothing then.
      if (!sameTarget(get().target, target)) return;
      set({ load, lastCheck: null, status: 'ready', error: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ status: 'error', error: errorText(err) });
    }
  },

  async check() {
    const target = get().target;
    const api = archBridge();
    if (target === null || api === null || get().checking) return;
    const cwd = localPathOf(target);
    if (cwd === null || typeof api.check !== 'function') return;
    set({ checking: true, progress: null });
    try {
      const result = await api.check({ cwd });
      if (!sameTarget(get().target, target)) return;
      set({ lastCheck: result, checking: false, progress: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ checking: false, progress: null, error: errorText(err) });
    }
  },

  select(id) {
    set({ selected: id === null ? NO_SELECTION : [id] });
  },

  toggleSelected(id) {
    const current = get().selected;
    const next = current.includes(id)
      ? current.filter((s2) => s2 !== id)
      : [...current, id];
    set({ selected: next.length === 0 ? NO_SELECTION : next });
  },

  selectAll(ids) {
    set({ selected: ids.length === 0 ? NO_SELECTION : [...ids] });
  },

  focused() {
    const { selected } = get();
    return selected.length === 0 ? null : (selected[selected.length - 1] ?? null);
  },

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

  async draft() {
    const target = get().target;
    const api = skeletonBridge();
    if (target === null || api === null || get().drafting) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ drafting: true });
    try {
      const result = await api.skeleton({ cwd });
      // The directories the drafts would be saved into. Creating them is the
      // ONLY write this gesture makes, `ARCH_DRAFT_BODY` in ./copy.ts names it
      // before the button is pressed, and without it the person's first Save
      // fails with ENOENT on a folder that has never existed. Main still writes no contract file: every byte of
      // the skeleton arrives as text and lands in an editor buffer that is
      // dirty from the moment it opens.
      await ensureDraftFolders(
        cwd,
        result.files.map((f) => f.path)
      );
      for (const file of result.files) {
        requestOpenFile({
          repoPath: cwd,
          relPath: file.path,
          path: `${cwd}/${file.path}`,
          mode: 'file',
          source: 'tree',
          preview: false,
          draft: file.content
        });
      }
    } catch (err) {
      useApp.getState().toast('error', errorText(err), { sticky: true });
    } finally {
      set({ drafting: false });
    }
  },

  seed() {
    const target = get().target;
    if (target === null) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    const text = seedPromptText(cwd);
    void navigator.clipboard.writeText(text).then(
      () => {
        useApp.getState().toast('info', ARCH_SEED_COPIED);
      },
      () => {
        // A refused clipboard is not a reason to hide the sheet: the prompt is
        // on screen in the view and a person can select it by hand.
        useApp
          .getState()
          .toast(
            'error',
            `${ARCH_VIEW_TITLE} could not reach the clipboard. The prompt is on screen and can be selected.`
          );
      }
    );
    // THE ORDINARY NEW SESSION SHEET, and nothing else. This is the same
    // `setCreateOpen` the ⌘T chord and the dock's + button reach, so the
    // person picks the agent, the launch flags and the capture setting exactly
    // as they would for any other session. Tortie starts nothing here, and
    // nothing is typed into any session: sending a composed payload to a
    // running agent is a later slice's verb and this phase refuses it.
    useApp.getState().setCreateOpen(true);
  },

  subscribeEvents() {
    const api = archBridge();
    if (api === null) return () => undefined;
    const offChecked =
      typeof api.onChecked === 'function'
        ? api.onChecked((event) => {
            // Phase 160. A finished check may have moved the facts the map is
            // drawn from, so any held model for that repository is read again,
            // whether or not it belongs to the active project: a map tab for a
            // background project is still on screen. Nothing is announced; the
            // picture moves the way the numbers do.
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            reloadScopedReads(get(), event.cwd);
            const target = get().target;
            if (target === null || localPathOf(target) !== event.cwd) return;
            set({ checking: false, progress: null });
            void get().refresh();
          })
        : () => undefined;
    const offProgress =
      typeof api.onProgress === 'function'
        ? api.onProgress((p) => {
            get().applyProgress(p.cwd, p.done, p.total);
          })
        : () => undefined;
    // Phase 160. The fact base behind a map moved, being a cold scan landing
    // or a check republishing. Nothing heavy travels on the push; the store
    // asks `arch:map` again for any repository it holds a picture of, and the
    // in flight guard in `loadMap` folds a burst into one read.
    const offMapUpdated =
      typeof api.onMapUpdated === 'function'
        ? api.onMapUpdated((event) => {
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            // Phase 161. A scoped picture is a reading of the same fact
            // base, so it moves when the base does. Only the scopes the
            // drill can still reach are held, and the in flight fold in
            // each read keeps a burst at two asks.
            reloadScopedReads(get(), event.cwd);
          })
        : () => undefined;
    return () => {
      offChecked();
      offProgress();
      offMapUpdated();
    };
  },

  applyProgress(cwd, done, total) {
    const target = get().target;
    if (target === null || localPathOf(target) !== cwd) return;
    set({ checking: done < total, progress: { done, total } });
  },

  verdicts() {
    const { lastCheck, load } = get();
    return lastCheck?.verdicts ?? load?.verdicts ?? NONE;
  },

  components() {
    return get().load?.components ?? NONE;
  },

  edges() {
    return get().load?.edges ?? NONE;
  },

  problems() {
    return get().load?.problems ?? NONE;
  },

  counts() {
    const { lastCheck, load } = get();
    return lastCheck?.counts ?? load?.counts ?? null;
  },

  freshness() {
    const { lastCheck, load } = get();
    return lastCheck?.freshness ?? load?.freshness ?? NONE;
  },

  nameOf(componentId) {
    return (
      get().load?.components.find((c) => c.id === componentId)?.name ??
      componentId
    );
  }
}));

/**
 * Ask again for every scoped reading this window holds of one repository
 * (Phase 161). Runs on the same two pushes the level 1 map re-reads on, so
 * the drilled picture and the whole picture can never sit at two different
 * readings of the facts for longer than a read takes.
 */
function reloadScopedReads(s: ArchViewState, cwd: string): void {
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

/**
 * Create the folders the drafts will be saved into, and say nothing when they
 * already exist.
 *
 * It uses `fs:createFolder`, the verb the Explorer's own New Folder command
 * already reaches, rather than anything new, and it goes through the typed
 * bridge rather than around it. A folder that is already there answers with a
 * rejection this swallows, because "it is already there" is the success case.
 *
 * THIS IS THE ONLY WRITE THE DRAFT GESTURE MAKES, and the control says so
 * before it is pressed. Without it a person's first Save fails on a folder
 * that has never existed, which reads as Tortie losing what they just wrote.
 */
async function ensureDraftFolders(
  cwd: string,
  relPaths: readonly string[]
): Promise<void> {
  const fs = gmuxBridge()?.fs;
  if (typeof fs?.createFolder !== 'function') return;
  const dirs = new Set<string>();
  for (const rel of relPaths) {
    const parts = rel.split('/');
    parts.pop();
    // Every ancestor, shallowest first, so `docs` exists before `docs/arch`.
    for (let i = 1; i <= parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  for (const dir of [...dirs].sort((a, b) => a.length - b.length)) {
    try {
      await fs.createFolder({ root: cwd, path: dir });
    } catch {
      /* already there is the success case */
    }
  }
}
