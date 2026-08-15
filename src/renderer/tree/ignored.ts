/**
 * What the repository ignores, for the file tree's dimming (Phase 47 item 1).
 *
 * VS Code greys out ignored entries, and until this phase gmux did not. The
 * detection could not come from the existing `git:status` call: that call runs
 * on every watcher tick and adding `--ignored` to it was measured at 0.218 s
 * and 1.45 MB across 25,305 rows on this repository, against 0.044 s today.
 * `git check-ignore` scales with what the lazy tree has loaded instead, so
 * this store asks about exactly those paths and nothing else.
 *
 * TWO RULES KEEP THE CALL SMALL, and both are pure functions below.
 *
 *  1. A directory answers for its whole subtree. @pierre/trees keeps an
 *     `ignoredDirectoryPaths` set and inherits the ignored status down to
 *     every descendant row, so once `node_modules/` comes back ignored,
 *     expanding it costs zero further calls.
 *  2. A path is asked once. The answer for a path that is not ignored is
 *     remembered too, so a watcher tick does not re-ask the whole tree.
 *
 * Everything here is an ENHANCEMENT. A preload without the channel, a failed
 * read and a folder that is not a repository all leave the set empty and the
 * tree undimmed, exactly as before this phase.
 */

import { create } from 'zustand';
import { ancestorDirsOf } from './tree-paths';

const NONE: ReadonlySet<string> = new Set<string>();

/**
 * Ceiling on one batch. The main-process service caps at the same number, so
 * neither side can be handed a list the other would silently truncate.
 */
const MAX_ASK = 20_000;

/**
 * Floor on how often a repo change may throw the answers away.
 *
 * The watcher fires on any worktree write, and the operator runs several
 * agents writing at once, so without this an ignore re-read would ride every
 * tick and its stdin would grow with the loaded tree. Two seconds caps the
 * extra work at one short `git check-ignore` per two seconds, and a
 * .gitignore edit still shows up within about two seconds.
 */
const INVALIDATE_MIN_MS = 2000;

/** True when `path` sits inside a directory already known to be ignored. */
export function isUnderIgnored(
  path: string,
  ignored: ReadonlySet<string>
): boolean {
  if (ignored.size === 0) return false;
  for (const dir of ancestorDirsOf(path)) {
    if (ignored.has(dir)) return true;
  }
  return false;
}

/**
 * The paths worth putting on git's stdin: the ones the tree has listed, minus
 * the ones already answered, minus everything under a directory already known
 * to be ignored. Sorted shortest first so that when the cap does bite it is
 * the outermost directories that get asked, and those are the ones whose
 * answers cover the most rows.
 */
export function pathsToAsk(
  paths: Iterable<string>,
  ignored: ReadonlySet<string>,
  answered: ReadonlySet<string>,
  limit: number = MAX_ASK
): string[] {
  const ask: string[] = [];
  for (const path of paths) {
    if (path.length === 0) continue;
    if (answered.has(path) || ignored.has(path)) continue;
    if (isUnderIgnored(path, ignored)) continue;
    ask.push(path);
  }
  ask.sort((a, b) => (a.length === b.length ? (a < b ? -1 : 1) : a.length - b.length));
  return ask.length > limit ? ask.slice(0, limit) : ask;
}

/**
 * Directories @pierre/trees would mark "contains git status items" purely
 * because something IGNORED sits under them.
 *
 * The library counts every status it is given against each ancestor
 * directory, ignored included (model/gitStatus.js, `setGitStatusPath` calls
 * `incrementAncestorChangeCounts` whatever the status is). Feeding it ignored
 * entries therefore puts the amber dirty-descendant dot on `docs/` because
 * `docs/.DS_Store` is ignored, which is a false report of a change. The tree
 * hides the dot on exactly these directories; a directory that also holds a
 * real change is not in the list and keeps its dot.
 */
export function ignoredOnlyAncestors(
  ignored: Iterable<string>,
  changedPaths: Iterable<string>
): string[] {
  const real = new Set<string>();
  for (const path of changedPaths) {
    for (const dir of ancestorDirsOf(path)) real.add(dir);
  }
  const suppressed = new Set<string>();
  for (const path of ignored) {
    for (const dir of ancestorDirsOf(path)) {
      if (!real.has(dir)) suppressed.add(dir);
    }
  }
  return [...suppressed].sort();
}

/** Escape a path so it can sit inside a double-quoted CSS attribute value. */
function cssAttrValue(path: string): string {
  return path.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * The stylesheet that hides those false dots. It goes into a style element
 * the tree owns inside @pierre/trees' shadow root, beside the one the library
 * writes for `unsafeCSS` — the library's own CSS never sets `display` on the
 * dot, so there is nothing here to fight.
 */
export function ignoredDotSuppressionCss(dirs: readonly string[]): string {
  if (dirs.length === 0) return '';
  const selectors = dirs
    .map(
      (dir) =>
        `[data-item-path="${cssAttrValue(dir)}"] > [data-item-section="git"] [data-icon-name="file-tree-icon-dot"]`
    )
    .join(',\n');
  return `${selectors} {\n  display: none;\n}\n`;
}

interface TreeIgnoredState {
  /** Repo the current set belongs to (the active project path). */
  repoPath: string | null;
  /** Canonical ignored paths; a directory keeps its trailing '/'. */
  ignored: ReadonlySet<string>;
  /**
   * Bumped by `invalidate`. The tree's sync effect watches it, so a
   * .gitignore edit re-asks about every path rather than trusting the
   * remembered answers.
   */
  epoch: number;
  /** Ask about whatever is new in `paths`. Never throws. */
  sync(repoPath: string, paths: Iterable<string>): Promise<void>;
  /** Forget every answer and ask again (git:changed). */
  invalidate(): void;
  /** Leave the repo entirely (project closed, folder is not a repository). */
  reset(): void;
}

export const useTreeIgnored = create<TreeIgnoredState>((set, get) => {
  /**
   * Paths git has already answered for, ignored or not. Kept outside the
   * store because nothing renders from it and a new Set per sync would repaint
   * the whole tree.
   */
  let answered = new Set<string>();
  let syncSeq = 0;
  let lastInvalidateAt = 0;
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

  const forget = (): void => {
    lastInvalidateAt = Date.now();
    answered = new Set();
    syncSeq++;
    set((s) => ({ ignored: NONE, epoch: s.epoch + 1 }));
  };

  return {
    repoPath: null,
    ignored: NONE,
    epoch: 0,

    async sync(repoPath, paths) {
      const gmux = window.gmux as typeof window.gmux | undefined;
      const checkIgnore = gmux?.git.checkIgnore;
      if (gmux === undefined || typeof checkIgnore !== 'function') return;

      if (get().repoPath !== repoPath) {
        answered = new Set();
        set({ repoPath, ignored: NONE });
      }

      const ask = pathsToAsk(paths, get().ignored, answered);
      if (ask.length === 0) return;

      const seq = ++syncSeq;
      const epoch = get().epoch;
      let hits: string[];
      try {
        hits = await checkIgnore.call(gmux.git, { repoPath, paths: ask });
      } catch {
        // Dimming is a decoration. A failed read leaves the tree plain.
        return;
      }
      // Stale: another sync started, the project moved, or the answers were
      // invalidated while this call was in flight.
      if (seq !== syncSeq) return;
      if (get().repoPath !== repoPath || get().epoch !== epoch) return;

      for (const path of ask) answered.add(path);
      if (hits.length === 0) return;
      const next = new Set(get().ignored);
      for (const path of hits) next.add(path);
      set({ ignored: next });
    },

    invalidate() {
      // Leading edge, then one trailing catch-up. A burst of watcher ticks
      // costs one re-read at the front and one at the back, not one each.
      const waitMs = INVALIDATE_MIN_MS - (Date.now() - lastInvalidateAt);
      if (waitMs <= 0) {
        forget();
        return;
      }
      if (invalidateTimer !== null) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        forget();
      }, waitMs);
    },

    reset() {
      // Idempotent, and it does NOT touch the epoch. The tree's sync effect
      // watches the epoch and calls this one when the folder is not a
      // repository, so bumping it here would be a loop.
      if (get().repoPath === null && get().ignored.size === 0) return;
      answered = new Set();
      syncSeq++;
      set({ repoPath: null, ignored: NONE });
    }
  };
});
