/**
 * The search half of the bridge: streaming content search (⌘⇧F), the symbol
 * index (⌘⇧O), and quick open (⌘P). Moved verbatim from the single preload
 * file (Phase 42 stage 2).
 */

import type {
  GmuxQuickOpenExtras,
  GmuxSearchExtras,
  GmuxSymbolsExtras,
  SearchProgress
} from '../shared/ipc';
import { EVT_SYMBOLS_PROGRESS, searchResultsChannel } from '../shared/ipc';
import { invoke, on, onTemplateChannel } from './bridge';

/**
 * search surface (Phase 14) — streaming ⌘⇧F.
 *
 * `onResults` takes the searchId the CALLER minted and is meant to be called
 * BEFORE `start()`, which is why the id is an input rather than something you
 * learn from the response: ripgrep produces its first result in ~3 ms, and a
 * subscription set up after the invoke resolves can miss the first frame.
 * Passing the same id in `start({ searchId })` closes the window entirely.
 */
export const search: NonNullable<GmuxSearchExtras['search']> = {
  onResults: (searchId, cb) =>
    onTemplateChannel<SearchProgress>(searchResultsChannel(searchId), cb),
  start: (input) => invoke('search:start', input),
  cancel: (searchId) => invoke('search:cancel', searchId),
  context: (input) => invoke('search:context', input)
};

/**
 * symbols surface (Phase 14) — ⌘⇧O and the palette's `@` / `#` modes.
 *
 * `query` deliberately does NOT build an index; `ensure` is the only thing
 * that does, and the palette calls it when the user actually asks for
 * symbols. That split is what keeps "never build an index nobody asked for"
 * a property of the contract rather than a habit of the caller.
 *
 * `onProgress` exists because a build outlives the invoke that started it: on
 * a large repo the user is typing for seconds while it runs, and the palette
 * has to be able to say how far it has got.
 */
export const symbols: NonNullable<GmuxSymbolsExtras['symbols']> = {
  query: (input) => invoke('symbols:query', input),
  ensure: (repoPath) => invoke('symbols:ensure', repoPath),
  release: (repoPath) => invoke('symbols:release', repoPath),
  onProgress: (cb) => on(EVT_SYMBOLS_PROGRESS, cb)
};

/**
 * quickOpen surface (Phase 14) — ⌘P.
 *
 * Two calls and no event channel: the ranking round trip is p50 2 ms at
 * 60,000 files, so there is nothing to stream. `warm` is fire-and-forget
 * indexing — the palette calls it at first idle and again each time it opens,
 * because fuzzysort's per-path cost is lazy and would otherwise land on the
 * user's first keystroke.
 *
 * PHASE 99 turned `warm`'s one string into an object, and added no channel. A
 * root on another machine cannot be enumerated by anything in main, so its whole
 * name list rides in that object and the worker adopts it. The `root` field is
 * the bare absolute path for a folder on this Mac, which is exactly what every
 * caller before Phase 99 sent.
 */
export const quickOpen: NonNullable<GmuxQuickOpenExtras['quickOpen']> = {
  query: (input) => invoke('quickopen:query', input),
  warm: (input) => invoke('quickopen:warm', input)
};
