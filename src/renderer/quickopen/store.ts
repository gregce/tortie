/**
 * ⌘P state. Everything the palette knows lives here; the component is a view.
 *
 * THREE RULES, all from research 19 §2.4, and all of them about not lying to
 * the user about speed:
 *
 *  1. **No debounce.** The round trip is p50 2 ms / p95 3.5 ms measured at
 *     60,000 files on this machine, which is below typing cadence. A debounce
 *     would add latency the engine does not have.
 *  2. **Latest wins, by sequence number.** Answers can overtake each other;
 *     an older one must never paint over a newer one.
 *  3. **Never clear the list on a keystroke.** The previous rows stay (dimmed)
 *     until the new set lands. Blanking between keystrokes reads as slow even
 *     when it is fast.
 *
 * And one more, from the brief: the palette OPENS INSTANTLY, warm or not. It
 * never blocks on the index. While the first `rg --files` streams in, the
 * worker ranks what it has and reports how far it got, and this store keeps
 * asking until it is done — so the row you want appears as soon as it exists
 * rather than after a spinner you had to wait out.
 *
 * PHASE 99 ADDED A SECOND SOURCE OF PATHS, and the rule above holds over it
 * unchanged. A project whose folder is on another machine cannot be walked by
 * ripgrep on this Mac, so its names are read over the link by one call and
 * handed to the same worker, which ADOPTS them instead of enumerating. The
 * palette still opens on the keystroke and the read lands into it afterwards.
 */

import { create } from 'zustand';
import type {
  GmuxMachinesExtras,
  GmuxQuickOpenExtras,
  MachineFileListMode,
  QuickOpenHit,
  QuickOpenResult
} from '@shared/ipc';
import { QUICK_OPEN_WARM_STALE_MS, REMOTE_FILE_LIST_MAX } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { isLocalTarget, rootKeyOf, targetOfProject } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { machineLabelFor } from '../state/machines-slice';
import { useEditor } from '../editor/store';
import { requestOpenFile } from '../state/open-file';
import type { OpenFileSelection } from '../state/open-file';
import { parseQuickOpen } from './parse';
import { noteOpened, recentKeys } from './recents';

/** Rows rendered. VS Code shows the same number; beyond it, refine the query. */
const RENDER_LIMIT = 50;

/** How soon to ask again while the index is still being built. */
const INDEXING_POLL_MS = 100;

const SCOPE_KEY = 'gmux.quickopen.allProjects';

function bridge(): GmuxQuickOpenExtras['quickOpen'] {
  return (window.gmux as (typeof window.gmux & GmuxQuickOpenExtras) | undefined)
    ?.quickOpen;
}

/** The machines bridge, or null on a build without one (Phase 99). */
function machinesBridge(): NonNullable<GmuxMachinesExtras['machines']> | null {
  const api = window.gmux as
    | (typeof window.gmux & GmuxMachinesExtras)
    | undefined;
  return api?.machines ?? null;
}

function readScopePref(): boolean {
  try {
    return window.localStorage.getItem(SCOPE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeScopePref(all: boolean): void {
  try {
    window.localStorage.setItem(SCOPE_KEY, all ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** What the last name list read on a machine answered (Phase 99). */
export interface QuickOpenElsewhereRead {
  mode: MachineFileListMode;
  /** How many names came back. Zero for every mode that is a refusal. */
  count: number;
  /** The name cap cut the list. These are the first N, not all of them. */
  capped: boolean;
  /** Epoch ms on THIS Mac when the answer arrived. */
  at: number;
}

export interface QuickOpenState {
  open: boolean;
  /** Raw text, exactly as typed (including any `:412`). */
  query: string;
  hits: QuickOpenHit[];
  selected: number;
  /** Search every open project, not just the active one. Persisted. */
  allProjects: boolean;
  /** Every queried root has a complete path list. */
  ready: boolean;
  /** Paths indexed so far — shown while `ready` is false. */
  indexed: number;
  /** An answer for the current query text is in flight. */
  pending: boolean;
  /** A root hit the per-project path cap. */
  capped: boolean;
  /** This build's preload has no quick-open bridge. */
  unavailable: boolean;
  /**
   * Quick open cannot run — a missing search binary, a worker that refused to
   * start. Distinct from `unavailable` (no bridge at all) only in the message;
   * both end the same way, with the palette saying so instead of pretending to
   * index forever.
   */
  error: string | null;
  /**
   * PHASE 99. The machine the active project's folder is on, or null for this
   * Mac. Phase 90.3 held the label alone, because the only thing the palette
   * did with it was say the machine could not be reached. The palette lists
   * that machine's own files now, so the id is carried as well and every
   * sentence still names the label.
   */
  elsewhere: { machineId: string; label: string } | null;
  /**
   * PHASE 99. What the last name list read on that machine answered, or null
   * while the first read of this run is still in flight.
   */
  elsewhereRead: QuickOpenElsewhereRead | null;

  openPalette(): void;
  /** ⌘P again while open: widen/narrow the scope rather than re-opening. */
  toggleOrOpen(): void;
  close(): void;
  setQuery(next: string): void;
  move(delta: number): void;
  setSelected(index: number): void;
  toggleScope(): void;
  /** ↩ or a click (preview); ⌘↩ or ⌘-click (pinned). Closes the palette. */
  accept(pinned: boolean): void;
  /** Index the roots now, before anything is typed. */
  warm(): void;
}

/** Monotonic across the app: an answer is stale if it is not the newest. */
let seq = 0;
let pollTimer: number | null = null;

/**
 * When each root on a machine was last ASKED. The 5,000 ms rule's other half.
 *
 * ONE NUMBER AND TWO APPLIERS, and no root is subject to both. The worker
 * applies {@link QUICK_OPEN_WARM_STALE_MS} to a root it enumerates itself. This
 * applies it to a root on another machine, which the worker cannot enumerate.
 * The time is recorded when the call GOES OUT rather than when it lands, so two
 * warms in the same second cost one command on that machine instead of two.
 */
const remoteReadAt = new Map<string, number>();

/**
 * The last answer for each root on a machine.
 *
 * NOT IN THE SPEC'S LIST OF TWO MODULE VALUES, and it is here for one measured
 * reason. Closing the palette and reopening it inside the 5,000 ms window skips
 * the read, and without this map the panel would then draw "Tortie is reading
 * the file names on Studio" with no read in flight and nothing to end it. The
 * palette reads its last answer out of here at open instead.
 */
const remoteAnswers = new Map<string, QuickOpenElsewhereRead>();

function clearPoll(): void {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

/**
 * The targets for the current scope, active project FIRST.
 *
 * gmux is multi-project and main deliberately has no opinion about which
 * projects are open — the renderer is the only place that knows, so it says
 * so on every query. Closing a project simply stops sending its root.
 */
function targetsFor(allProjects: boolean): WorkspaceTarget[] {
  const app = useApp.getState();
  const active = targetOfProject(app.activeProject());
  if (!allProjects) return active === null ? [] : [active];
  const ordered = app.projects
    .map((p) => targetOfProject(p))
    .filter((t): t is WorkspaceTarget => t !== null);
  if (active === null) return ordered;
  const activeKey = rootKeyOf(active);
  return [active, ...ordered.filter((t) => rootKeyOf(t) !== activeKey)];
}

/**
 * Roots for the current scope, active project FIRST.
 *
 * PHASE 99. Every project yields a ROOT KEY from `rootKeyOf`, and a project on
 * another machine is no longer dropped. The Phase 90.3 comment that lived here
 * said quick open can never list a path from over there. It can now, and the
 * paths arrive through `machines:listFiles` rather than through ripgrep, so the
 * key carries the machine id and the two lists can never be mistaken for each
 * other.
 */
function rootsFor(allProjects: boolean): string[] {
  return targetsFor(allProjects).map(rootKeyOf);
}

/**
 * The machine the active project's folder is on, or null for this Mac.
 *
 * Read once when the palette opens, which is the same moment Phase 90.3 read
 * it. What changed is what the palette does with it: it used to be the reason
 * there were no rows, and it is now the reason the rows say where they came
 * from.
 */
function machineOfActiveProject(): { machineId: string; label: string } | null {
  const app = useApp.getState();
  const target = targetOfProject(app.activeProject());
  if (target === null || isLocalTarget(target)) return null;
  return {
    machineId: target.machineId,
    label: machineLabelFor(app.machineStates, target.machineId)
  };
}

export const useQuickOpen = create<QuickOpenState>((set, get) => {
  /**
   * Issue one query. `text` is the PATH TERM (the `:412` suffix already
   * stripped) — the ranker must never see a line number as part of a filename.
   */
  const run = (text: string): void => {
    const api = bridge();
    if (api === undefined) {
      set({ unavailable: true, pending: false });
      return;
    }
    const roots = rootsFor(get().allProjects);
    if (roots.length === 0) {
      set({ hits: [], pending: false, ready: true, indexed: 0 });
      return;
    }

    const mine = ++seq;
    set({ pending: true });
    void api
      .query({
        roots,
        query: text,
        seq: mine,
        limit: RENDER_LIMIT,
        recents: recentKeys()
      })
      .then((res: QuickOpenResult) => {
        // Rule 2: an overtaken answer must never paint.
        if (res.seq !== seq || !get().open) return;
        set({
          hits: res.hits,
          ready: res.ready,
          indexed: res.indexed,
          capped: res.capped,
          error: res.error ?? null,
          pending: false,
          selected: Math.min(get().selected, Math.max(0, res.hits.length - 1))
        });
        // Still enumerating: ask again shortly so rows appear as they exist,
        // instead of making the user retype to discover the index finished.
        clearPoll();
        if (!res.ready || res.refreshing) {
          pollTimer = window.setTimeout(() => {
            pollTimer = null;
            if (get().open) run(text);
          }, INDEXING_POLL_MS);
        }
      })
      .catch(() => {
        set({ pending: false });
      });
  };

  /** Record one machine's answer, and paint it when it is the active project. */
  const recordRead = (
    key: string,
    isActive: boolean,
    answer: QuickOpenElsewhereRead
  ): void => {
    remoteAnswers.set(key, answer);
    if (isActive) set({ elsewhereRead: answer });
  };

  /**
   * Hand the worker an EMPTY list for a root whose read gave no names.
   *
   * ADOPTING AN EMPTY LIST ON A REFUSAL IS NOT COSMETIC. Without it the
   * worker's `builtAt` stays 0, the answer stays `ready: false` forever, and
   * the 100 ms poll above spins for as long as the palette is open. An empty
   * adopt is also the honest statement: Tortie holds no names for that root.
   */
  const adoptNothing = (
    api: NonNullable<GmuxQuickOpenExtras['quickOpen']>,
    key: string,
    isActive: boolean,
    mode: MachineFileListMode
  ): void => {
    void api.warm({ root: key, paths: [] });
    recordRead(key, isActive, {
      mode,
      count: 0,
      capped: false,
      at: Date.now()
    });
  };

  /** Ask one machine which files are in one folder, then adopt the answer. */
  const readNamesOn = (
    api: NonNullable<GmuxQuickOpenExtras['quickOpen']>,
    target: WorkspaceTarget,
    key: string,
    isActive: boolean
  ): void => {
    const now = Date.now();
    if (now - (remoteReadAt.get(key) ?? 0) < QUICK_OPEN_WARM_STALE_MS) {
      const last = remoteAnswers.get(key);
      if (isActive && last !== undefined) set({ elsewhereRead: last });
      return;
    }
    remoteReadAt.set(key, now);

    const machines = machinesBridge();
    if (machines === null || typeof machines.listFiles !== 'function') {
      // A shipped build cannot reach this line, because the preload and this
      // renderer are one build. It exists so a test double without the call
      // ends the wait rather than throwing.
      adoptNothing(api, key, isActive, 'unreachable');
      return;
    }

    void machines
      .listFiles({
        machineId: target.machineId,
        cwd: target.path,
        maxPaths: REMOTE_FILE_LIST_MAX
      })
      .then(
        (res) => {
          const named = res.mode === 'repo' || res.mode === 'walk';
          void api.warm({
            root: key,
            paths: named ? [...res.paths] : []
          });
          recordRead(key, isActive, {
            mode: res.mode,
            count: res.paths.length,
            capped: res.capped,
            at: res.readAt
          });
        },
        () => {
          adoptNothing(api, key, isActive, 'unreachable');
        }
      );
  };

  const queryNow = (raw: string): void => {
    const parsed = parseQuickOpen(raw);
    if (parsed.mode === 'files') run(parsed.term);
    else {
      // `:412` and `>` have nothing to rank — show no rows rather than the
      // results of the previous query, which would be a list you cannot act on.
      clearPoll();
      set({ hits: [], pending: false });
    }
  };

  return {
    open: false,
    query: '',
    hits: [],
    selected: 0,
    allProjects: readScopePref(),
    ready: false,
    indexed: 0,
    pending: false,
    capped: false,
    unavailable: false,
    error: null,
    elsewhere: null,
    elsewhereRead: null,

    openPalette() {
      // PHASE 99. Read once, at open. A tab whose folder is on another machine
      // now has a root like any other, so `warm` and the query below both run.
      // What this decides is which sentence goes above the rows.
      const elsewhere = machineOfActiveProject();
      const target = targetOfProject(useApp.getState().activeProject());
      const known =
        elsewhere === null || target === null
          ? null
          : (remoteAnswers.get(rootKeyOf(target)) ?? null);
      set({
        open: true,
        query: '',
        selected: 0,
        hits: [],
        elsewhere,
        elsewhereRead: known
      });
      get().warm();
      queryNow('');
    },

    toggleOrOpen() {
      if (get().open) get().toggleScope();
      else get().openPalette();
    },

    close() {
      clearPoll();
      set({
        open: false,
        hits: [],
        query: '',
        selected: 0,
        pending: false,
        elsewhere: null,
        elsewhereRead: null
      });
    },

    setQuery(next) {
      set({ query: next, selected: 0 });
      queryNow(next);
    },

    move(delta) {
      const { hits, selected } = get();
      if (hits.length === 0) return;
      // Wrap: a picker whose selection sticks at the ends makes you look at
      // the list to know whether the key did anything.
      const next = (selected + delta + hits.length) % hits.length;
      set({ selected: next });
    },

    setSelected(index) {
      set({ selected: index });
    },

    toggleScope() {
      // With one project there is no second scope to widen to. Swallow the
      // chord rather than silently flipping a persisted preference whose
      // effect the user cannot see — and whose surprise would arrive weeks
      // later, the first time they open a second project.
      if (useApp.getState().projects.length < 2) return;
      const allProjects = !get().allProjects;
      writeScopePref(allProjects);
      set({ allProjects, selected: 0 });
      get().warm();
      queryNow(get().query);
    },

    warm() {
      const api = bridge();
      if (api === undefined) {
        set({ unavailable: true });
        return;
      }
      const active = targetOfProject(useApp.getState().activeProject());
      const activeKey = active === null ? null : rootKeyOf(active);
      for (const target of targetsFor(get().allProjects)) {
        const key = rootKeyOf(target);
        // A folder on this Mac is enumerated by the worker, exactly as it was
        // before this phase, and the key it is enumerated under is its own
        // absolute path.
        if (isLocalTarget(target)) {
          void api.warm({ root: key });
          continue;
        }
        readNamesOn(api, target, key, key === activeKey);
      }
    },

    accept(pinned) {
      const { hits, selected, query } = get();
      const parsed = parseQuickOpen(query);

      if (parsed.mode === 'reserved') return;

      const selection: OpenFileSelection | undefined =
        parsed.line === undefined
          ? undefined
          : {
              line: parsed.line,
              ...(parsed.column === undefined ? {} : { column: parsed.column })
            };

      if (parsed.mode === 'goto-line') {
        const tab = useEditor.getState().activeTab();
        if (tab === null || selection === undefined) return;
        get().close();
        requestOpenFile({
          repoPath: tab.repoPath,
          relPath: tab.relPath,
          path: tab.path,
          mode: 'file',
          source: 'quickopen',
          preview: false,
          ...(tab.commit === null ? {} : { commit: tab.commit }),
          // PHASE 99. The tab's own machine, carried back. Without it the
          // request composes a LOCAL tab id for a file on another machine, and
          // `:412` on such a tab would open a second tab holding whatever this
          // Mac happens to have at that path.
          ...(tab.remote === undefined ? {} : { remote: tab.remote }),
          selection
        });
        return;
      }

      const hit = hits[selected];
      if (hit === undefined) return;
      get().close();
      // Recorded here as well as by the bus listener so the ordering is
      // right even if this open lands on an already-open tab.
      noteOpened(hit.repoPath, hit.relPath, hit.machineId);
      requestOpenFile({
        repoPath: hit.repoPath,
        relPath: hit.relPath,
        path: `${hit.repoPath}/${hit.relPath}`,
        // A pick is a request to READ a file, never to diff it — and
        // `selection` would force 'file' anyway (research 19 §2.6 rule 1).
        mode: 'file',
        source: 'quickopen',
        // Phase 12.4 semantics, the same everywhere files open: ↩ takes the
        // reusable preview slot, ⌘↩ / ⌘-click keeps the tab. (Research
        // 19 §4.5 pinned quick-open picks unconditionally; the brief settles
        // it the other way, consistently with the tree and SCM, so walking a
        // few candidates does not leave five tabs behind.)
        preview: !pinned,
        // PHASE 99. Its presence is what makes the editor fill the tab from
        // that machine and treat it as read only. It is the same `remote`
        // reference `openSearchResult` composes, so the editor path this
        // phase uses is the one Phase 98 already drives.
        ...(hit.machineId === undefined
          ? {}
          : {
              remote: {
                machineId: hit.machineId,
                machineLabel: machineLabelFor(
                  useApp.getState().machineStates,
                  hit.machineId
                ),
                repoPath: hit.repoPath
              }
            }),
        ...(selection === undefined ? {} : { selection })
      });
    }
  };
});
