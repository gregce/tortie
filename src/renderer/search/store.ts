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
 *
 *  6. **A folder on another machine is one call, not a stream (Phase 98).**
 *     There is nothing to stream. The far side has finished scanning before
 *     the first byte comes back, and it answers in about 0.2 s over a 33 MB
 *     repository. So the remote branch asks once, waits, and folds the whole
 *     answer in with one `set`. Rules 3 and 4 hold there unchanged. Rule 1
 *     does not. The pause is 400 ms rather than 150, because every keystroke
 *     there costs one command on another computer instead of a 2.5 ms kill.
 */

import { create } from 'zustand';
import type {
  ContentSearchInput,
  InstalledGmuxApi,
  MachineSearchMode,
  MachineSearchResult,
  SearchFileResult,
  SearchProgress
} from '@shared/ipc';
import { SEARCH_LIMITS } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import {
  localPathOf,
  sameTarget,
  targetOfProject
} from '@shared/workspace-target';
import {
  SEARCH_ANSWER_TOO_LARGE,
  SEARCH_NOT_A_REPOSITORY,
  searchFirstMatches,
  searchFolderMissing,
  searchNoAnswer,
  searchNotConnected,
  searchPatternRefused
} from '../machines/presentation';
import { useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';
import type { ContextLine } from './rows';
import { matchKey, mergeFrame } from './rows';
import { gmuxBridge } from '../bridge';

/** Typing pause before a query is spent on a process. */
const DEBOUNCE_MS = 150;

/**
 * The same pause for a folder on another machine (Phase 98). CHOSEN, and not
 * measured.
 *
 * The local number is tuned to a process this Mac can kill in 2.5 ms and that
 * produces a first result in about 3 ms. Nothing about that holds over there.
 * One keystroke costs one command on another computer, being a 29 to 37 ms
 * round trip plus 174 to 176 ms of scanning on a 33 MB repository, and there is
 * no way to cancel the scan once it has started. A longer pause spends fewer
 * commands and the person waits for one answer instead of four.
 */
const REMOTE_DEBOUNCE_MS = 400;

/** Context lines fetched either side of a match when its row is expanded. */
export const CONTEXT_LINES = 2;

/**
 * A literal query shorter than this is not worth a search — every file would
 * match and the result would be noise. A REGEX is exempt: `^$`, `\d`, and `.`
 * are all legitimate one-character queries.
 */
const MIN_LITERAL_QUERY = 2;

function bridge(): InstalledGmuxApi['search'] | undefined {
  return gmuxBridge()?.search;
}

/** The machines bridge, or null on a build without one (Phase 98). */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/** Is content search available in this build at all? */
export function searchAvailable(): boolean {
  return typeof bridge()?.start === 'function';
}

/**
 * Can this build search a folder on another machine at all (Phase 98)?
 *
 * An older preload has no `searchContent` on its machines bridge. Asking it
 * would throw, so nothing asks it and the panel says so instead.
 */
export function remoteSearchAvailable(): boolean {
  return typeof machinesBridge()?.searchContent === 'function';
}

/**
 * The target when it is on another machine, and null when it is on this Mac.
 *
 * It is the one place the remote branch is chosen, so no caller decides it
 * twice. `localPathOf` is null for exactly the targets this returns.
 */
function remoteTargetOf(
  target: WorkspaceTarget | null | undefined
): WorkspaceTarget | null {
  if (target === null || target === undefined) return null;
  return localPathOf(target) === null ? target : null;
}

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

export interface SearchState {
  /**
   * Which folder, on which computer, this result set belongs to. Switching
   * projects resets it.
   *
   * PHASE 90.1 replaced a bare path here. Two projects on two machines can
   * hold the same path, and while this was a string a switch between them
   * looked like no change at all, so the rows from the first machine stayed on
   * screen under the second machine's name.
   */
  target: WorkspaceTarget | null;

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

  /**
   * PHASE 98. What the machine answered about this folder, or null when the
   * rows came from this Mac. It is a status word and never a sentence. Every
   * sentence a person reads is drawn from src/renderer/machines/presentation.ts.
   */
  remoteMode: MachineSearchMode | null;
  /** PHASE 98. That machine's own label, as main sent it. Never composed here. */
  machineLabel: string | null;
  /** PHASE 98. The size ceiling on that machine's one answer cut this list. */
  truncated: boolean;

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
  syncProject(target: WorkspaceTarget | null): void;
  /**
   * Note that the project changed on disk (watcher / git:changed).
   *
   * This one keeps a plain path, because the watcher reports a folder on this
   * Mac and it has nothing to say about any other computer.
   */
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
  /**
   * PHASE 98. One call to one machine is on the wire.
   *
   * There is no cancel on the far side, so a second call would not replace the
   * first one, it would run beside it. The far machine's effective ceiling is
   * ten commands at once (research 56 section 1.5) and a person types faster
   * than that. One at a time is the rule.
   */
  remoteInflight: boolean;
  /**
   * PHASE 98. The query moved while that call was on the wire, so run once
   * more when it lands. Once, not once per keystroke.
   */
  remoteAgain: boolean;
}

const live: Live = {
  epoch: 0,
  searchId: null,
  unsubscribe: null,
  debounce: null,
  replaceOnNextFrame: false,
  remoteInflight: false,
  remoteAgain: false
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
  // PHASE 98. The epoch is what stops a remote answer painting too. Nothing
  // here reaches the machine, because a scan that has started over there runs
  // to the end whatever this Mac does. What this stops is the PAINTING, and
  // dropping `remoteAgain` is what stops the re-run a superseded query asked
  // for.
  live.epoch += 1;
  live.remoteAgain = false;
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
  /** A query worth spending a process on, here or on a machine. */
  function runnable(state: SearchState): boolean {
    if (state.target === null) return false;
    // PHASE 98. A folder on another machine used to be refused here, because
    // nothing could search it. What is refused now is a build whose preload
    // has no way to ask a machine anything. The panel says so rather than
    // throwing, and the Search view on this Mac is unaffected.
    if (remoteTargetOf(state.target) !== null && !remoteSearchAvailable()) {
      return false;
    }
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
      selectedKey: null,
      // PHASE 98. The three fields that describe ONE machine's answer go with
      // the rows they describe. A note left behind would say a true thing
      // about a set that is no longer on screen.
      remoteMode: null,
      machineLabel: null,
      truncated: false
    };
  }

  function schedule(): void {
    if (live.debounce !== null) clearTimeout(live.debounce);
    const ms =
      remoteTargetOf(get().target) !== null ? REMOTE_DEBOUNCE_MS : DEBOUNCE_MS;
    live.debounce = setTimeout(() => {
      live.debounce = null;
      get().run();
    }, ms);
  }

  /**
   * Fold one machine's whole answer into the rendered state, in one `set`.
   *
   * There is no merge and no frame arithmetic here, because there is one
   * answer. Everything keyed to the previous set goes with it, exactly as the
   * first frame of a local search takes it.
   */
  function applyRemote(answer: MachineSearchResult): void {
    set({
      status: 'done',
      files: answer.files,
      totalMatches: answer.totalMatches,
      totalFiles: answer.totalFiles,
      capped: answer.capped,
      truncated: answer.truncated,
      remoteMode: answer.mode,
      machineLabel: answer.machineLabel,
      elapsedMs: answer.elapsedMs,
      error: null,
      stale: false,
      collapsed: new Set<string>(),
      expanded: new Set<string>(),
      context: new Map<string, ContextLine[]>(),
      selectedKey: null
    });
  }

  /** Ask one machine for every matching line in one folder (Phase 98). */
  function runRemote(
    target: WorkspaceTarget,
    options?: { limit?: number }
  ): void {
    const machines = machinesBridge();
    if (machines === null || typeof machines.searchContent !== 'function') {
      return;
    }
    const state = get();
    const limit = options?.limit ?? state.resultLimit;

    stopLive();
    const epoch = live.epoch;

    if (live.remoteInflight) {
      // One call at a time. The answer on the wire is already superseded by
      // the epoch above, and this run happens again the moment it lands. The
      // cap is recorded now, so a "Show more" pressed during that wait is the
      // cap the re-run carries.
      live.remoteAgain = true;
      set({ status: 'searching', resultLimit: limit, error: null, stale: false });
      return;
    }

    // There is no first frame to replace anything with, so the old rows are
    // replaced by `applyRemote` when the one answer lands. Until then they
    // stay on screen under a summary that reads "Searching…", which is rule 5
    // spelled for a call instead of a stream.
    live.replaceOnNextFrame = false;
    live.remoteInflight = true;
    set({
      status: 'searching',
      resultLimit: limit,
      error: null,
      elapsedMs: null,
      stale: false
    });

    const settle = (): void => {
      live.remoteInflight = false;
      if (!live.remoteAgain) return;
      live.remoteAgain = false;
      get().run();
    };

    void machines
      .searchContent({
        machineId: target.machineId,
        cwd: target.path,
        query: state.query,
        isRegex: state.isRegex,
        isCaseSensitive: state.isCaseSensitive,
        matchWholeWord: state.matchWholeWord,
        maxResults: limit
      })
      .then(
        (answer) => {
          // Rule 3. A stale answer never paints, and this is the only thing
          // that stops it, because the scan over there cannot be called back.
          if (live.epoch === epoch) applyRemote(answer);
          settle();
        },
        (err: unknown) => {
          if (live.epoch === epoch) {
            set({ status: 'error', error: messageOf(err) });
          }
          settle();
        }
      );
  }

  return {
    target: targetOfProject(useApp.getState().activeProject()),

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

    remoteMode: null,
    machineLabel: null,
    truncated: false,

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
      // PHASE 98. The one branch. A folder on another machine is one call and
      // one answer, and everything below this line is the streaming path on
      // this Mac, unchanged.
      const remote = remoteTargetOf(state.target);
      if (remote !== null) {
        if (!runnable(state)) return;
        runRemote(remote, options);
        return;
      }
      const search = bridge();
      if (search === undefined) {
        set({ status: 'error', error: 'Search is unavailable in this build.' });
        return;
      }
      if (!runnable(state)) return;
      const repoPath = localPathOf(state.target);
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
      // PHASE 98. Surrounding lines are read from a file on THIS Mac, through
      // `search:context`, and there is no such file for a row that came from a
      // machine. Nothing is expanded rather than expanding into a spinner that
      // can never resolve. The row draws no toggle in that state either, so
      // there is no control here that does nothing.
      if (remoteTargetOf(get().target) !== null) return;
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

      const repoPath = localPathOf(get().target);
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
      // PHASE 98. The folder, on whichever computer it is on. F4 walks the
      // rows that are on screen, and from this phase those rows can be a
      // machine's own.
      const repoPath = state.target?.path ?? null;
      if (repoPath === null) return false;
      const remote = remoteRefOf(state);

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
      openSearchResult(repoPath, target.relPath, target.match, true, remote);
      return true;
    },

    syncProject(target) {
      // BY VALUE, not by reference. The view composes a fresh target object on
      // every render, so a comparison by reference would clear the result set
      // on every render instead of never.
      if (sameTarget(get().target, target)) return;
      stopLive();
      set({
        target,
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
      // The watcher names a folder on this Mac. While the view is showing a
      // project on another machine there is no folder here for it to be
      // talking about, and `localPathOf` returns null, which matches nothing.
      if (localPathOf(state.target) !== repoPath) return;
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
 * The machine an open, a copy and a menu name, or null for this Mac.
 *
 * PHASE 98. `machineLabel` is what that machine called itself in its own
 * answer, so the label a person reads in a tab is the label they read in the
 * sidebar. It falls back to the id, which is what `machineLabelFor` does for a
 * machine no row was found for.
 */
export interface SearchOpenRemote {
  readonly machineId: string;
  readonly machineLabel: string;
}

export function remoteRefOf(state: {
  target: WorkspaceTarget | null;
  machineLabel: string | null;
}): SearchOpenRemote | null {
  const target = remoteTargetOf(state.target);
  if (target === null) return null;
  return {
    machineId: target.machineId,
    machineLabel: state.machineLabel ?? target.machineId
  };
}

/** What the two sentence pickers below read (Phase 98). */
export interface MachineNoteInput {
  mode: MachineSearchMode | null;
  /** That machine's own label. */
  label: string;
  totalMatches: number;
  capped: boolean;
  truncated: boolean;
}

/**
 * The one state sentence drawn under the summary, or null when there is none.
 *
 * IT IS ONE SENTENCE AND NOT THREE. The note row draws this line and then the
 * engine line, and no more, so the panel never grows a paragraph under every
 * search. When a folder is not a repository AND its answer was cut, the "not a
 * repository" line wins, because it changes how a person reads every row on
 * screen while the cut is already stated by the count above it, which reads
 * "so far".
 *
 * The four refusal words are not here. Each of them means no rows at all, so
 * their sentences are drawn in the results area by {@link machineEmptyLine},
 * and neither picker can say the same thing twice.
 */
export function machineNoteLine(input: MachineNoteInput): string | null {
  if (input.mode !== 'repo' && input.mode !== 'walk') return null;
  if (input.mode === 'walk') return SEARCH_NOT_A_REPOSITORY;
  if (input.truncated) return SEARCH_ANSWER_TOO_LARGE;
  if (input.capped) return searchFirstMatches(input.totalMatches);
  return null;
}

/**
 * The sentence the results area draws when a machine answered with no rows and
 * a reason, or null when the answer was an ordinary read.
 *
 * `repo` and `walk` return null on purpose. A read that found nothing is "No
 * results found", which is what the panel already says for this Mac.
 */
export function machineEmptyLine(
  mode: MachineSearchMode | null,
  label: string
): string | null {
  switch (mode) {
    case 'missing':
      return searchFolderMissing(label);
    case 'badPattern':
      return searchPatternRefused(label);
    case 'notConnected':
      return searchNotConnected(label);
    case 'unreachable':
      return searchNoAnswer(label);
    default:
      return null;
  }
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
 * `match.text`, which is not the file's line: main stripped the leading
 * whitespace so the results list is readable, and on a very long line it also
 * WINDOWED the text around the first hit. `match.trimmed` is the total of
 * both shifts — every original-line UTF-16 unit before `match.text[0]` — so
 * `range + trimmed` is the file column and the sum below is complete. Drop it
 * and an indented line selects two characters into the wrong token; drop the
 * window half and a minified line selects thousands of columns to the left.
 */
export function openSearchResult(
  repoPath: string,
  relPath: string,
  match: { line: number; trimmed: number; ranges: readonly [number, number][] },
  preview: boolean,
  remote?: SearchOpenRemote | null
): void {
  const first = match.ranges[0];
  requestOpenFile({
    repoPath,
    relPath,
    path: `${repoPath}/${relPath}`,
    mode: 'file',
    source: 'search',
    preview,
    // PHASE 98. Its presence is what makes the editor fill the tab from that
    // machine and treat it as read only. The editor has opened a file from a
    // machine since Phase 90.3 and has landed on a selection since Phase 14,
    // so this is one field on a request it already understands.
    ...(remote === undefined || remote === null
      ? {}
      : {
          remote: {
            machineId: remote.machineId,
            machineLabel: remote.machineLabel,
            repoPath
          }
        }),
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
  preview: boolean,
  remote?: SearchOpenRemote | null
): void {
  requestOpenFile({
    repoPath,
    relPath,
    path: `${repoPath}/${relPath}`,
    mode: 'file',
    source: 'search',
    preview,
    ...(remote === undefined || remote === null
      ? {}
      : {
          remote: {
            machineId: remote.machineId,
            machineLabel: remote.machineLabel,
            repoPath
          }
        }),
    selection: { line }
  });
}
