/**
 * THE repo-changed fan-out (research 19 §2.5, override O3).
 *
 * gmux already runs exactly one @parcel/watcher subscription per repo — the
 * VS Code recipe in repo-watcher.ts, started lazily by git IPC, coalescing
 * every worktree and dotgit event into a single `onChange(repoPath)` on a
 * 300 ms non-resetting debounce. Measured: create → event in 14-78 ms, and a
 * burst of 500 simultaneous creates delivered all 500 events. Nothing is
 * dropped.
 *
 * Phase 14 gave that signal a SECOND consumer (quick open's path index), and
 * the obvious way to get one — a second FSEvents subscription on the same
 * tree — is exactly the battery burn the backlog forbids on a 95k-file
 * project. So the watcher's single callback now feeds this bus, and both git
 * and search subscribe to it as peers.
 *
 * This module holds no state beyond the subscriber list: it does not know
 * what a repo is, does not debounce (the watcher already did), and does not
 * start or stop anything. Callback errors are contained so one bad subscriber
 * cannot silence the other.
 *
 * WHAT IT DELIBERATELY DOES NOT CARRY: the changed PATHS. RepoWatcher
 * coalesces a burst into one repo-level notification and throws the per-file
 * detail away, which is right for git ("re-status this repo") and is why
 * quick open re-enumerates instead of patching its list. If a consumer ever
 * needs per-path deltas, that is a change to RepoWatcher, not a second bus.
 */

type RepoChangedListener = (repoPath: string) => void;

const listeners = new Set<RepoChangedListener>();

/** Subscribe to "this repo changed on disk". Returns the unsubscribe. */
export function onRepoChanged(cb: RepoChangedListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Called by the ONE RepoWatcher per repo. Never call this from a feature. */
export function emitRepoChanged(repoPath: string): void {
  for (const listener of listeners) {
    try {
      listener(repoPath);
    } catch (err) {
      console.warn(
        `[gmux] repo-changed listener failed: ${(err as Error).message}`
      );
    }
  }
}

/** Test seam: drop every subscriber. */
export function resetRepoChangedListeners(): void {
  listeners.clear();
}
