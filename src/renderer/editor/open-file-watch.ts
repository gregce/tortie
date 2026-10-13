/**
 * PHASE 347 (issue 33). THE WINDOW'S HALF OF THE OPEN FILE WATCH.
 *
 * The worktree watcher is blind to a file inside a folder its exclusion plan
 * leaves out (build/p347/SPEC.md §2.3), so an agent writing a file open in a
 * tab there changed nothing on screen until the person looked (Phase 334's
 * doors). Main can watch ONE FILE at a time for exactly that blind set (D11,
 * D13); this module tells it which files, and hands its notices back.
 *
 * D12. THE WINDOW DECLARES; MAIN NARROWS. The set is the one the walk reads:
 * every tab the store's `walkedByRefresh` admits, with a repository and an
 * absolute path, minus a draft never saved (the walk's own skip in ./tab-io
 * `refreshRepo`), each path once, in `tabs` order. The predicate is HANDED IN
 * rather than copied, so the declared set cannot drift from the walked set
 * (Phase 334 D2's rule). Main decides which of them it can watch; a remote
 * tab never reaches it, because the predicate refuses `remote`.
 *
 * It declares once at start and again only when the KEY moves: the set plus
 * each declared tab's `deleted`, so a tab the walk marks deleted, or finds
 * again, declares again and main re-arms it. Typing moves neither, so a
 * keystroke sends nothing.
 *
 * Pure apart from what it is handed. No timer: main coalesces (D15), and the
 * store answers a notice through the walk's own road (D17, in ./store `init`).
 * The bridge members are feature detected, and a refused declaration is
 * swallowed: watching is an enhancement, as `ensureWatcher` says of itself,
 * and a tab with no watch keeps Phase 334's behaviour.
 */

import type { GitOpenFileEntry } from '@shared/ipc';
import type { EditorTab } from './tab-types';

/** D12: the walk's skip of a draft that has never been saved (./tab-io `refreshRepo`). */
function neverSaved(t: EditorTab): boolean {
  return t.draft != null && t.savedContents === '';
}

/** The declared tabs, each path once, in `tabs` order, with the tab that declared it. */
function declaredTabs(
  tabs: readonly EditorTab[],
  walked: (t: EditorTab) => boolean
): EditorTab[] {
  const seen = new Set<string>();
  const out: EditorTab[] = [];
  for (const t of tabs) {
    if (!walked(t)) continue;
    if (t.repoPath === '' || !t.path.startsWith('/')) continue;
    if (neverSaved(t)) continue;
    if (seen.has(t.path)) continue;
    seen.add(t.path);
    out.push(t);
  }
  return out;
}

/** D12: the files the walk reads, as main's entries. */
export function watchedFilesOf(
  tabs: readonly EditorTab[],
  walked: (t: EditorTab) => boolean
): GitOpenFileEntry[] {
  return declaredTabs(tabs, walked).map((t) => ({ repoPath: t.repoPath, path: t.path }));
}

/** The set plus each tab's `deleted`, so a tab marked deleted, or found again, re-declares (D12). */
export function watchKeyOf(
  tabs: readonly EditorTab[],
  walked: (t: EditorTab) => boolean
): string {
  // JSON, because a path may hold any character a separator could be.
  return JSON.stringify(declaredTabs(tabs, walked).map((t) => [t.repoPath, t.path, t.deleted]));
}

/**
 * Declare the set now and whenever its key moves; hand every notice to
 * `changed`. Returns the stop, which unsubscribes both and declares nothing:
 * main drops a window's entries when the window goes (D19).
 */
export function startOpenFileWatch(deps: {
  subscribe(listener: () => void): () => void;
  tabs(): readonly EditorTab[];
  walked(t: EditorTab): boolean;
  declare?: (entries: GitOpenFileEntry[]) => Promise<unknown>;
  onChanged?: (cb: (repoPath: string) => void) => () => void;
  changed(repoPath: string): void;
}): () => void {
  const { declare, onChanged } = deps;
  // Feature detected: a window with no preload, or a main from before this
  // phase, has neither member and keeps today's behaviour.
  if (typeof declare !== 'function' || typeof onChanged !== 'function') {
    return () => undefined;
  }

  const send = (entries: GitOpenFileEntry[]): void => {
    try {
      void Promise.resolve(declare(entries)).catch(() => undefined);
    } catch {
      /* a bridge that throws synchronously is a declaration refused */
    }
  };

  // The notice listener first, so no notice for the first declaration's
  // watches can arrive before anything is listening for it.
  const stopNotices = onChanged((repoPath) => {
    if (typeof repoPath !== 'string') return;
    deps.changed(repoPath);
  });

  let lastTabs = deps.tabs();
  let lastKey = watchKeyOf(lastTabs, deps.walked);
  send(watchedFilesOf(lastTabs, deps.walked));

  const stopStore = deps.subscribe(() => {
    const tabs = deps.tabs();
    // Every patch makes a new array, so this only skips a store change that
    // touched no tab at all (a panel, a project, a preference).
    if (tabs === lastTabs) return;
    lastTabs = tabs;
    const key = watchKeyOf(tabs, deps.walked);
    if (key === lastKey) return;
    lastKey = key;
    send(watchedFilesOf(tabs, deps.walked));
  });

  return () => {
    stopStore();
    stopNotices();
  };
}
