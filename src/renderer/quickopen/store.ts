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
 */

import { create } from 'zustand';
import type {
  GmuxQuickOpenExtras,
  QuickOpenHit,
  QuickOpenResult
} from '@shared/ipc';
import { useApp } from '../state/store';
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

function clearPoll(): void {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

/**
 * Roots for the current scope, active project FIRST.
 *
 * gmux is multi-project and main deliberately has no opinion about which
 * projects are open — the renderer is the only place that knows, so it says
 * so on every query. Closing a project simply stops sending its path.
 */
function rootsFor(allProjects: boolean): string[] {
  const app = useApp.getState();
  const active = app.activeProject();
  if (!allProjects) return active === null ? [] : [active.path];
  const ordered = app.projects.map((p) => p.path);
  if (active === null) return ordered;
  return [active.path, ...ordered.filter((p) => p !== active.path)];
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

    openPalette() {
      set({ open: true, query: '', selected: 0, hits: [] });
      get().warm();
      queryNow('');
    },

    toggleOrOpen() {
      if (get().open) get().toggleScope();
      else get().openPalette();
    },

    close() {
      clearPoll();
      set({ open: false, hits: [], query: '', selected: 0, pending: false });
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
      for (const root of rootsFor(get().allProjects)) void api.warm(root);
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
          selection
        });
        return;
      }

      const hit = hits[selected];
      if (hit === undefined) return;
      get().close();
      // Recorded here as well as by the bus listener so the ordering is
      // right even if this open lands on an already-open tab.
      noteOpened(hit.repoPath, hit.relPath);
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
        ...(selection === undefined ? {} : { selection })
      });
    }
  };
});
