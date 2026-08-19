/**
 * ⌘⇧O state — the symbol palette.
 *
 * THE HONESTY RULE, which is the whole reason this store is more than a
 * debounced query: **an index that is not built yet must say so.** The service
 * in main never builds an index nobody asked for, so the first ⌘⇧O on a
 * project genuinely has nothing to show for a few hundred milliseconds. The
 * three ways that could be handled, and why only one is acceptable:
 *
 *   - Block the palette behind a progress bar. Rejected: you cannot type
 *     through a progress bar, and typing is the entire interaction.
 *   - Show an empty list. Rejected: indistinguishable from "this project has
 *     no symbols", which is a lie the user acts on by giving up.
 *   - Open instantly, start the build, SAY it is building, and show partial
 *     results as they land. This one — and the count is real, from the
 *     service's own progress channel, not a spinner pretending to know.
 *
 * `ensure()` is called exactly once per palette open, and `query()` never
 * starts a build, so pressing Esc before the build finishes leaves it running
 * in the background rather than restarting it next time.
 */

import { create } from 'zustand';
import type { GmuxSymbolsExtras } from '@shared/ipc';
import type { SymbolHit, SymbolIndexProgress } from '@shared/symbols';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { machineLabelFor } from '../state/machines-slice';
import { useEditor } from '../editor/store';
import { requestOpenFile } from '../state/open-file';
import { parseSymbolQuery } from './symbol-query';
import type { SymbolMode } from './symbol-query';

export { parseSymbolQuery };
export type { SymbolMode };

/** Rows rendered. Beyond this, refine the query — the same bar as ⌘P. */
const RENDER_LIMIT = 50;

/** How often to re-ask while a build is running, so partial results appear. */
const INDEXING_POLL_MS = 150;

function bridge(): GmuxSymbolsExtras['symbols'] {
  return (window.gmux as (typeof window.gmux & GmuxSymbolsExtras) | undefined)
    ?.symbols;
}

/** Is the symbol index available in this build at all? */
export function symbolsAvailable(): boolean {
  return typeof bridge()?.query === 'function';
}

export interface SymbolsState {
  open: boolean;
  /** Raw text INCLUDING the leading `@` or `#`. */
  query: string;
  mode: SymbolMode;
  /** The file `@` mode is scoped to, repo-relative. Null ⇒ `#` is forced. */
  fileScope: string | null;
  repoPath: string | null;

  hits: SymbolHit[];
  selected: number;

  indexing: boolean;
  indexed: number;
  total: number;
  /** No index exists yet and none is being built. */
  cold: boolean;
  error: string | null;
  /**
   * The machine this project's files are on, when they are not on this Mac
   * (Phase 90.3). Null for every project on this Mac, which is what every
   * build before that phase had.
   *
   * The palette OPENS in this state and says so, rather than refusing to open.
   * An empty list would read as a project with no symbols, which is a different
   * and wrong conclusion, and it is the same reasoning the cold index case
   * above already follows.
   */
  elsewhere: string | null;

  openPalette(mode?: SymbolMode): void;
  close(): void;
  setQuery(query: string): void;
  move(delta: number): void;
  setSelected(index: number): void;
  /** Open the highlighted symbol. Pinned by default; ↩ is a commitment. */
  accept(index?: number): void;
  /** Fold a pushed progress message in (the EVT_SYMBOLS_PROGRESS channel). */
  applyProgress(progress: SymbolIndexProgress): void;
}

/** Non-rendered plumbing for the in-flight query. */
const live = {
  epoch: 0,
  poll: null as ReturnType<typeof setTimeout> | null
};

function stopPolling(): void {
  if (live.poll === null) return;
  clearTimeout(live.poll);
  live.poll = null;
}

export const useSymbols = create<SymbolsState>((set, get) => {
  /** Ask main for the current answer, and keep asking while it is building. */
  function refresh(): void {
    const state = get();
    const symbols = bridge();
    const repoPath = state.repoPath;
    if (symbols === undefined || repoPath === null) return;

    const epoch = live.epoch;
    const { mode, term } = parseSymbolQuery(state.query, state.fileScope === null ? '#' : '@');
    const relPath = mode === '@' ? state.fileScope : null;

    void symbols
      .query({
        repoPath,
        query: term,
        ...(relPath !== null ? { relPath } : {}),
        limit: RENDER_LIMIT
      })
      .then(
        (result) => {
          if (live.epoch !== epoch || !get().open) return;
          set({
            hits: result.hits,
            // Keep the selection on row 0 as results change: the top row is
            // the answer often enough that ⌘⇧O ↩ should be a reliable pair.
            selected: 0,
            indexing: result.indexing,
            indexed: result.indexed,
            total: result.total,
            cold: result.cold,
            error: result.error ?? null
          });
          stopPolling();
          if (result.indexing) {
            live.poll = setTimeout(refresh, INDEXING_POLL_MS);
          }
        },
        (err: unknown) => {
          if (live.epoch !== epoch) return;
          set({ error: err instanceof Error ? err.message : String(err) });
        }
      );
  }

  return {
    open: false,
    query: '',
    mode: '#',
    fileScope: null,
    repoPath: null,
    hits: [],
    selected: 0,
    indexing: false,
    indexed: 0,
    total: 0,
    cold: false,
    error: null,
    elsewhere: null,

    openPalette(mode) {
      const app = useApp.getState();
      const project = app.activeProject();
      if (project === null) return;
      // PHASE 90.3. THE CONVERSION SITE. `localPathOf` is null for a project on
      // another machine, so the store is never filled under such a tab: no
      // index is asked for, no build is started and `repoPath` stays null, which
      // is the value `refresh` returns early on. The symbol index is built from
      // files on this Mac, and a path from another computer names a different
      // file here or none at all.
      const target = targetOfProject(project);
      if (target !== null && localPathOf(target) === null) {
        live.epoch += 1;
        stopPolling();
        set({
          open: true,
          repoPath: null,
          fileScope: null,
          mode: '#',
          query: '#',
          hits: [],
          selected: 0,
          indexing: false,
          indexed: 0,
          total: 0,
          cold: false,
          error: null,
          elsewhere: machineLabelFor(app.machineStates, target.machineId)
        });
        return;
      }
      if (!symbolsAvailable()) {
        // An older preload has no symbols surface. Open anyway and SAY so —
        // a palette that shows an empty list here reads as "this project has
        // no symbols", which is a different and wrong conclusion.
        set({
          open: true,
          repoPath: project.path,
          fileScope: null,
          mode: '#',
          query: '#',
          hits: [],
          selected: 0,
          indexing: false,
          cold: false,
          error: 'Go to Symbol is not available in this build.',
          elsewhere: null
        });
        return;
      }
      const tab = useEditor.getState().activeTab();
      // `@` needs a file to be about. With nothing open, `#` is not a fallback
      // so much as the only question that has an answer.
      const scope =
        tab !== null && tab.repoPath === project.path ? tab.relPath : null;
      const start: SymbolMode = mode ?? (scope !== null ? '@' : '#');

      live.epoch += 1;
      stopPolling();
      set({
        open: true,
        repoPath: project.path,
        fileScope: scope,
        mode: start,
        query: start,
        hits: [],
        selected: 0,
        error: null,
        elsewhere: null
      });

      // The ONLY place a build is ever started. Fire and forget: the reply is
      // just "started or not", and the real news arrives on the progress
      // channel and on the next query.
      void bridge()
        ?.ensure(project.path)
        .catch(() => undefined);
      refresh();
    },

    close() {
      live.epoch += 1;
      stopPolling();
      set({ open: false, hits: [], query: '', error: null, elsewhere: null });
    },

    setQuery(query) {
      const fallback: SymbolMode = get().fileScope === null ? '#' : '@';
      const { mode } = parseSymbolQuery(query, fallback);
      live.epoch += 1;
      stopPolling();
      set({ query, mode });
      // No debounce, deliberately: a symbol query is a scan over a columnar
      // table measured at 4-8 ms on a realistic repo, so a debounce would be
      // adding latency the engine does not have.
      refresh();
    },

    move(delta) {
      const { hits, selected } = get();
      if (hits.length === 0) return;
      set({
        selected: Math.max(0, Math.min(hits.length - 1, selected + delta))
      });
    },

    setSelected(index) {
      set({ selected: index });
    },

    accept(index) {
      const state = get();
      const hit = state.hits[index ?? state.selected];
      const repoPath = state.repoPath;
      if (hit === undefined || repoPath === null) return;
      get().close();
      requestOpenFile({
        repoPath,
        relPath: hit.relPath,
        path: `${repoPath}/${hit.relPath}`,
        mode: 'file',
        source: 'symbol',
        // A symbol pick is a commitment, not a browse: it opens for keeps and
        // focus follows it into the editor (research 19 §4.5).
        preview: false,
        selection: {
          line: hit.line,
          column: hit.column,
          endColumn: hit.endColumn
        }
      });
    },

    applyProgress(progress) {
      const state = get();
      if (!state.open || progress.repoPath !== state.repoPath) return;
      set({
        indexing: progress.indexing,
        indexed: progress.indexed,
        total: progress.total,
        error: progress.error ?? null,
        ...(progress.indexing ? {} : { cold: false })
      });
      if (!progress.indexing) refresh();
    }
  };
});
