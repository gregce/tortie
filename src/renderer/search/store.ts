/**
 * ⌘⇧F state. The view is a view; every decision about when to search, what to
 * keep and when to stop lives here.
 *
 * FOUR RULES, each of them measured rather than tasteful (research 19 §2.4):
 *
 *  1. **Debounce 150 ms, then cancel-and-respawn.** ripgrep is 2.5 ms to kill
 *     and ~3 ms to first result, so respawning beats every incremental scheme
 *     that was tried. A typical query is ~40 ms end to end — inside the
 *     debounce — which is why the user never sees a search start.
 *  2. **Subscribe before you start.** The renderer mints the `searchId`,
 *     subscribes, and only then invokes. First results land in ~3 ms; a
 *     listener attached after the invoke resolves can miss the first frame.
 *  3. **Epoch-gate every frame.** Late chunks from a superseded search are
 *     real, not theoretical. A stale frame must never paint.
 *  4. **Never auto-rerun on a file change.** This is where gmux must depart
 *     from VS Code: agents rewrite this repo continuously, and a search that
 *     re-ran itself would thrash and move rows out from under the cursor. The
 *     summary grows a "changed since this search · Refresh" chip and waits for
 *     the user's click.
 *
 *  5. **Results are never cleared on a keystroke.** The previous set stays on
 *     screen until the FIRST FRAME of the new search replaces it, because
 *     blanking the list at the moment a search starts makes a 40 ms query look
 *     like a flash of nothing. `live.replaceOnNextFrame` is the whole
 *     mechanism.
 */

import { create } from 'zustand';
import type {
  ContentSearchInput,
  GmuxSearchExtras,
  SearchFileResult,
  SearchProgress
} from '@shared/ipc';
import { SEARCH_LIMITS } from '@shared/ipc';
import { useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';
import type { ContextLine } from './rows';
import { matchKey, mergeFrame } from './rows';

/** Typing pause before a query is spent on a process. */
const DEBOUNCE_MS = 150;

/** Context lines fetched either side of a match when its row is expanded. */
export const CONTEXT_LINES = 2;

/**
 * A literal query shorter than this is not worth a search — every file would
 * match and the result would be noise. A REGEX is exempt: `^$`, `\d`, and `.`
 * are all legitimate one-character queries.
 */
const MIN_LITERAL_QUERY = 2;

function bridge(): GmuxSearchExtras['search'] {
  return (window.gmux as (typeof window.gmux & GmuxSearchExtras) | undefined)
    ?.search;
}

/** Is content search available in this build at all? */
export function searchAvailable(): boolean {
  return typeof bridge()?.start === 'function';
}

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

export interface SearchState {
  /** The project this result set belongs to. Switching projects resets. */
  repoPath: string | null;

  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
  includes: string;
  excludes: string;
  useIgnoreFiles: boolean;
  /** The include/exclude disclosure ("…"). */
  detailsOpen: boolean;

  status: SearchStatus;
  files: SearchFileResult[];
  totalMatches: number;
  totalFiles: number;
  capped: boolean;
  error: string | null;
  elapsedMs: number | null;
  /** The cap this result set ran under, so "Show more" can raise it. */
  resultLimit: number;

  /** Groups the user collapsed. Everything else is open. */
  collapsed: Set<string>;
  /** Match rows showing context, keyed `relPath:line`. */
  expanded: Set<string>;
  context: Map<string, ContextLine[]>;

  /** The project changed on disk after this search ran. */
  stale: boolean;

  /** Row key of the selected result, for ↑↓ / ↩ / F4. */
  selectedKey: string | null;

  setQuery(query: string): void;
  setIncludes(value: string): void;
  setExcludes(value: string): void;
  toggleRegex(): void;
  toggleCaseSensitive(): void;
  toggleWholeWord(): void;
  toggleUseIgnoreFiles(): void;
  setDetailsOpen(open: boolean): void;

  /** Run now, skipping the debounce (Refresh, a toggle, ↩ in the box). */
  run(options?: { limit?: number }): void;
  /** Raise the cap and re-run ("Show more"). */
  showMore(): void;
  cancel(): void;
  clear(): void;

  toggleGroup(relPath: string): void;
  collapseAll(): void;
  expandAll(): void;
  toggleContext(relPath: string, line: number): void;

  setSelectedKey(key: string | null): void;
  /**
   * Walk to the next (+1) or previous (-1) MATCH and preview it — F4 / ⇧F4,
   * from anywhere in the app. Returns false when there is nothing to walk, so
   * the caller can leave the key to whatever else wants it.
   */
  stepResult(delta: 1 | -1): boolean;

  /** React to the active project changing. */
  syncProject(repoPath: string | null): void;
  /** Note that the project changed on disk (watcher / git:changed). */
  noteRepoChanged(repoPath: string): void;
}

/** Everything about one in-flight search, kept out of the rendered state. */
interface Live {
  epoch: number;
  searchId: string | null;
  unsubscribe: (() => void) | null;
  debounce: ReturnType<typeof setTimeout> | null;
  /**
   * The previous result set is still on screen and must be REPLACED, not
   * merged, by the first frame of the new search. This is how rule 5 is kept:
   * blanking the list at the moment the search starts makes a 40 ms query look
   * like a flash of nothing, so the old rows stay until the new ones exist.
   */
  replaceOnNextFrame: boolean;
}

const live: Live = {
  epoch: 0,
  searchId: null,
  unsubscribe: null,
  debounce: null,
  replaceOnNextFrame: false
};

function newSearchId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/** Stop whatever is running: kill the child, drop the listener, bump the epoch. */
function stopLive(): void {
  live.epoch += 1;
  live.replaceOnNextFrame = false;
  if (live.debounce !== null) {
    clearTimeout(live.debounce);
    live.debounce = null;
  }
  live.unsubscribe?.();
  live.unsubscribe = null;
  const id = live.searchId;
  live.searchId = null;
  if (id !== null) void bridge()?.cancel(id).catch(() => undefined);
}

export const useSearch = create<SearchState>((set, get) => {
  /** A query worth spending a process on. */
  function runnable(state: SearchState): boolean {
    if (state.repoPath === null) return false;
    const q = state.query;
    if (q.length === 0) return false;
    return state.isRegex || q.length >= MIN_LITERAL_QUERY;
  }

  /** Reset the result surface without touching the query or the toggles. */
  function blankResults(): Partial<SearchState> {
    return {
      files: [],
      totalMatches: 0,
      totalFiles: 0,
      capped: false,
      error: null,
      elapsedMs: null,
      collapsed: new Set<string>(),
      expanded: new Set<string>(),
      context: new Map<string, ContextLine[]>(),
      stale: false,
      selectedKey: null
    };
  }

  function schedule(): void {
    if (live.debounce !== null) clearTimeout(live.debounce);
    live.debounce = setTimeout(() => {
      live.debounce = null;
      get().run();
    }, DEBOUNCE_MS);
  }

  return {
    repoPath: useApp.getState().activeProject()?.path ?? null,

    query: '',
    isRegex: false,
    isCaseSensitive: false,
    matchWholeWord: false,
    includes: '',
    excludes: '',
    useIgnoreFiles: true,
    detailsOpen: false,

    status: 'idle',
    files: [],
    totalMatches: 0,
    totalFiles: 0,
    capped: false,
    error: null,
    elapsedMs: null,
    resultLimit: SEARCH_LIMITS.maxResults,

    collapsed: new Set<string>(),
    expanded: new Set<string>(),
    context: new Map<string, ContextLine[]>(),

    stale: false,
    selectedKey: null,

    setQuery(query) {
      set({ query });
      if (!runnable(get())) {
        // Below the floor: stop burning processes and show the idle state
        // again rather than leaving the previous query's rows pretending to
        // be the answer to what is now in the box.
        stopLive();
        set({ status: 'idle', resultLimit: SEARCH_LIMITS.maxResults, ...blankResults() });
        return;
      }
      schedule();
    },

    setIncludes(value) {
      set({ includes: value });
      if (runnable(get())) schedule();
    },

    setExcludes(value) {
      set({ excludes: value });
      if (runnable(get())) schedule();
    },

    toggleRegex() {
      set({ isRegex: !get().isRegex });
      if (runnable(get())) get().run();
    },

    toggleCaseSensitive() {
      set({ isCaseSensitive: !get().isCaseSensitive });
      if (runnable(get())) get().run();
    },

    toggleWholeWord() {
      set({ matchWholeWord: !get().matchWholeWord });
      if (runnable(get())) get().run();
    },

    toggleUseIgnoreFiles() {
      set({ useIgnoreFiles: !get().useIgnoreFiles });
      if (runnable(get())) get().run();
    },

    setDetailsOpen(open) {
      set({ detailsOpen: open });
    },

    run(options) {
      const state = get();
      const search = bridge();
      if (search === undefined) {
        set({ status: 'error', error: 'Search is unavailable in this build.' });
        return;
      }
      if (!runnable(state)) return;
      const repoPath = state.repoPath;
      if (repoPath === null) return;

      stopLive();
      const epoch = live.epoch;
      const searchId = newSearchId();
      live.searchId = searchId;

      const limit = options?.limit ?? state.resultLimit;
      // NOT blankResults(): the old rows stay put until the new search has
      // something to put in their place (rule 5).
      live.replaceOnNextFrame = true;
      set({
        status: 'searching',
        resultLimit: limit,
        error: null,
        elapsedMs: null,
        stale: false
      });

      // Rule 2: subscribe FIRST. Frames start ~3 ms after the invoke.
      live.unsubscribe = search.onResults(searchId, (progress: SearchProgress) => {
        if (live.epoch !== epoch) return; // rule 3 — a stale frame never paints
        apply(progress);
      });

      const input: ContentSearchInput = {
        repoPath,
        query: state.query,
        isRegex: state.isRegex,
        isCaseSensitive: state.isCaseSensitive,
        matchWholeWord: state.matchWholeWord,
        includes: state.includes,
        excludes: state.excludes,
        useIgnoreFiles: state.useIgnoreFiles,
        // 0 always: streaming context measured 214 ms → 394 ms and 47 → 84 MB.
        // A row's expand gesture fetches its own via `search:context`.
        contextLines: 0,
        searchId,
        maxResults: limit
      };

      void search.start(input).catch((err: unknown) => {
        if (live.epoch !== epoch) return;
        set({
          status: 'error',
          error: messageOf(err)
        });
      });
    },

    showMore() {
      get().run({ limit: get().resultLimit * 5 });
    },

    cancel() {
      stopLive();
      set({ status: 'done' });
    },

    clear() {
      stopLive();
      set({
        query: '',
        status: 'idle',
        resultLimit: SEARCH_LIMITS.maxResults,
        ...blankResults()
      });
    },

    toggleGroup(relPath) {
      const collapsed = new Set(get().collapsed);
      if (collapsed.has(relPath)) collapsed.delete(relPath);
      else collapsed.add(relPath);
      set({ collapsed });
    },

    collapseAll() {
      set({ collapsed: new Set(get().files.map((f) => f.relPath)) });
    },

    expandAll() {
      set({ collapsed: new Set<string>() });
    },

    toggleContext(relPath, line) {
      const key = matchKey(relPath, line);
      const expanded = new Set(get().expanded);
      if (expanded.has(key)) {
        expanded.delete(key);
        set({ expanded });
        return;
      }
      expanded.add(key);
      set({ expanded });
      if (get().context.has(key)) return;

      const repoPath = get().repoPath;
      const search = bridge();
      if (repoPath === null || search === undefined) return;
      const epoch = live.epoch;
      void search
        .context({
          repoPath,
          relPath,
          line,
          before: CONTEXT_LINES,
          after: CONTEXT_LINES
        })
        .then(
          (result) => {
            if (live.epoch !== epoch) return;
            const context = new Map(get().context);
            context.set(key, result.lines);
            set({ context });
          },
          () => {
            // A file that moved under us has no context to show. Collapse the
            // row again rather than leaving a permanent spinner.
            const stillExpanded = new Set(get().expanded);
            stillExpanded.delete(key);
            set({ expanded: stillExpanded });
          }
        );
    },

    setSelectedKey(key) {
      set({ selectedKey: key });
    },

    stepResult(delta) {
      const state = get();
      const repoPath = state.repoPath;
      if (repoPath === null) return false;

      // F4 walks MATCHES, not rows: file headers and context lines are
      // scenery, and stepping onto one would make the shortcut feel like it
      // sometimes did nothing.
      const flat: { relPath: string; match: SearchFileResult['matches'][number] }[] =
        [];
      for (const file of state.files) {
        if (state.collapsed.has(file.relPath)) continue;
        for (const match of file.matches) flat.push({ relPath: file.relPath, match });
      }
      if (flat.length === 0) return false;

      const at = flat.findIndex(
        (row) => matchRowKey(row.relPath, row.match.line) === state.selectedKey
      );
      const next =
        at === -1
          ? delta > 0
            ? 0
            : flat.length - 1
          : (at + delta + flat.length) % flat.length;
      const target = flat[next];
      if (target === undefined) return false;

      set({ selectedKey: matchRowKey(target.relPath, target.match.line) });
      openSearchResult(repoPath, target.relPath, target.match, true);
      return true;
    },

    syncProject(repoPath) {
      if (repoPath === get().repoPath) return;
      stopLive();
      set({
        repoPath,
        status: 'idle',
        resultLimit: SEARCH_LIMITS.maxResults,
        ...blankResults()
      });
      // The query and the toggles deliberately survive a project switch: the
      // thing you were looking for is usually the reason you switched.
      if (runnable(get())) schedule();
    },

    noteRepoChanged(repoPath) {
      const state = get();
      if (state.repoPath !== repoPath) return;
      if (state.status !== 'done' || state.files.length === 0) return;
      if (state.stale) return;
      set({ stale: true });
    }
  };

  /** Fold one streamed frame into the rendered state. */
  function apply(progress: SearchProgress): void {
    const state = get();
    const base = live.replaceOnNextFrame ? [] : state.files;
    if (live.replaceOnNextFrame) {
      live.replaceOnNextFrame = false;
      // The old set is going; so must everything keyed to it.
      set({
        collapsed: new Set<string>(),
        expanded: new Set<string>(),
        context: new Map<string, ContextLine[]>(),
        selectedKey: null
      });
    }
    const patch: Partial<SearchState> = {
      files: mergeFrame(base, progress.files),
      totalMatches: progress.totalMatches,
      totalFiles: progress.totalFiles,
      capped: progress.capped
    };
    if (progress.done) {
      patch.status = progress.error !== undefined ? 'error' : 'done';
      patch.error = progress.error ?? null;
      if (progress.elapsedMs !== undefined) patch.elapsedMs = progress.elapsedMs;
      // A cancelled stream is not a finished search — it was superseded, and
      // the frame that supersedes it is already on its way.
      if (progress.cancelled === true) return;
      live.unsubscribe?.();
      live.unsubscribe = null;
      live.searchId = null;
    }
    set(patch);
  }
});

/**
 * The row key a MATCH row carries in the flattened list.
 *
 * Spelled here rather than reaching for `rowKey()` because this store must
 * address a row it is not looking at — F4 steps through matches while the
 * user's focus is in the editor, and the flat row array only exists inside
 * the component. Both spellings come from `matchKey`, so they cannot drift
 * without the tests noticing.
 */
function matchRowKey(relPath: string, line: number): string {
  return `m:${matchKey(relPath, line)}`;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Open one result at its match.
 *
 * `preview` false is the pinned gesture (double-click / ⌘↩); true reuses the
 * one preview tab, which is what makes arrowing through 40 hits cost one tab
 * instead of forty. The `selection` is what turns an open into a NAVIGATION:
 * the editor reveals the range, selects it and flashes it once (the bus
 * contract in src/renderer/state/open-file.ts).
 *
 * THE `trimmed` ADD-BACK IS NOT OPTIONAL. `match.ranges` index into
 * `match.text`, which main already stripped of leading whitespace so the
 * results list is readable. The FILE still has that whitespace, so a selection
 * built from the raw range lands `trimmed` characters to the left — on a
 * two-tab-indented line, two characters into the wrong token. `match.trimmed`
 * is carried across IPC for exactly this sum.
 */
export function openSearchResult(
  repoPath: string,
  relPath: string,
  match: { line: number; trimmed: number; ranges: readonly [number, number][] },
  preview: boolean
): void {
  const first = match.ranges[0];
  requestOpenFile({
    repoPath,
    relPath,
    path: `${repoPath}/${relPath}`,
    mode: 'file',
    source: 'search',
    preview,
    selection: {
      line: match.line,
      ...(first !== undefined
        ? {
            column: first[0] + match.trimmed,
            endColumn: first[1] + match.trimmed
          }
        : {})
    }
  });
}

/** Open a plain line (a context row, or a file row's first line). */
export function openSearchLine(
  repoPath: string,
  relPath: string,
  line: number,
  preview: boolean
): void {
  requestOpenFile({
    repoPath,
    relPath,
    path: `${repoPath}/${relPath}`,
    mode: 'file',
    source: 'search',
    preview,
    selection: { line }
  });
}
