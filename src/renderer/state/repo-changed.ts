/**
 * ONE debounced `git:changed` fan-out for the whole renderer.
 *
 * WHY THIS EXISTS. Four independent subscribers used to listen to the same
 * main-process event, each with its own timer map and its own debounce
 * window: the git store at 200 ms, the history/depth store at 250 ms, the
 * editor at 300 ms and the file tree at 150 ms — two of them declaring the
 * SAME constant name at different values (research 25 §3 B4). One commit from
 * a session terminal therefore repainted the sidebar four times over 150 ms of
 * wall clock, with the tree redecorated, Changes cleared, History reloaded and
 * the editor re-diffed at four different instants. For that window the sidebar
 * visibly contradicted itself, and it cost four `git status`/`git log` bursts
 * per event per repo.
 *
 * The window is now the smallest of the four (150 ms — the tree's, because the
 * fastest surface is the one the user's eye is already on), the timer is one
 * per repo rather than one per repo per subscriber, and every subscriber is
 * woken in the same tick, so the four surfaces can no longer disagree.
 *
 * WHY A FACTORY. The app-wide instance below binds to `window.gmux`, but the
 * coalescing logic — one timer per repo, per-repo independence, unsubscribe —
 * is the part that can be wrong, so it is a pure function of an injected
 * source and can be tested without a window (state/__tests__/repo-changed).
 *
 * NOT EVERY LISTENER BELONGS HERE. `search/SearchView.tsx` stays on the raw
 * bridge deliberately: it only flips a "results may be stale" flag, which
 * costs nothing and should not be held back for 150 ms. This bus is for the
 * subscribers that answer an event by SPENDING — a git status, a git log, a
 * re-read of every open file.
 */

import { gmuxBridge } from '../bridge';

/** The smallest of the four windows the subscribers used to keep. */
export const REPO_CHANGED_DEBOUNCE_MS = 150;

/** What a subscriber is handed: the repo whose worktree/index/HEAD moved. */
export type RepoChangedListener = (repoPath: string) => void;

/** A `git:changed` source: subscribe, get an unsubscribe back. */
export type RepoChangedSource = (cb: RepoChangedListener) => () => void;

export interface RepoChangeBus {
  /** Listen for debounced repo changes. Returns an unsubscribe. */
  subscribe(listener: RepoChangedListener): () => void;
}

/**
 * Build a bus over `source`.
 *
 * The source is attached LAZILY, on the first subscriber, and then kept for
 * the app's lifetime — matching what the four stores did individually, and
 * avoiding a re-attach race when a component unmounts and remounts. What
 * unsubscribing releases is the listener, not the underlying bridge.
 */
export function createRepoChangeBus(
  source: RepoChangedSource,
  delayMs: number = REPO_CHANGED_DEBOUNCE_MS
): RepoChangeBus {
  const listeners = new Set<RepoChangedListener>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let attached = false;

  const fire = (repoPath: string): void => {
    timers.delete(repoPath);
    // Snapshot: a listener may unsubscribe (or subscribe) while being run.
    for (const listener of [...listeners]) listener(repoPath);
  };

  const attach = (): void => {
    if (attached) return;
    attached = true;
    source((repoPath) => {
      const existing = timers.get(repoPath);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        repoPath,
        setTimeout(() => fire(repoPath), delayMs)
      );
    });
  };

  return {
    subscribe(listener) {
      attach();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

/**
 * The app-wide bus. `window.gmux` is read lazily (at first subscribe) because
 * the stores that use it are constructed at module load, which on the
 * settings window happens with no git bridge at all.
 */
const appBus = createRepoChangeBus((cb) => {
  const gmux = gmuxBridge();
  if (gmux === undefined) return () => undefined;
  return gmux.git.onChanged(cb);
});

/**
 * Subscribe to debounced repo changes. THE way a renderer surface learns that
 * a repo moved — never `gmux.git.onChanged` directly unless the handler is
 * free (see the SearchView note above).
 */
export function onRepoChanged(listener: RepoChangedListener): () => void {
  return appBus.subscribe(listener);
}
