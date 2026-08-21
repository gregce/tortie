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
 *  1. A directory answers for its whole subtree. Git cannot re-include a file
 *     whose parent directory is excluded, so once `node_modules/` comes back
 *     ignored, every path under it is ignored too and needs no call of its
 *     own. `coveredByIgnored` spells those paths out for the tree.
 *  2. A path is asked once. The answer for a path that is not ignored is
 *     remembered too, so a watcher tick does not re-ask the whole tree.
 *
 * THE RULE THAT MUST NOT BE UNDONE (Phase 47.1, an operator bug against 0.24.2).
 * `invalidate` MUST NEVER EMPTY `ignored`. It used to, and the rendered set is
 * what the tree dims from, so every dimmed row repainted at full brightness
 * for the 13 ms to 30 ms the replacement call took. The operator runs several
 * agents writing at once, which fired the watcher continuously, so he saw a
 * white flash on a fixed period and called it a strobe. Measured on the
 * shipped build: 84 bad frames out of 3601 over 31.0 s, in 15 flashes exactly
 * 2000 ms apart. The store is stale-while-revalidate instead. It keeps showing
 * the last answer, fetches the new one, and swaps in one `set` call. What
 * `invalidate` clears is the QUERY BOOKKEEPING, being `answered` and the
 * `revalidating` flag, never the set the tree renders. Only `reset`, which is
 * leaving the repository altogether, empties it.
 *
 * A REVALIDATION REPLACES, an ordinary sync MERGES. Merging is right while the
 * tree grows, because each answer is about paths nobody had asked about yet.
 * It is wrong after a .gitignore edit, because a path that stopped being
 * ignored has to be able to LEAVE the set, and merging can only add. So a
 * revalidation asks about every loaded path and starts the next set from the
 * hits alone.
 *
 * Everything here is an ENHANCEMENT. A preload without the channel, a failed
 * read and a folder that is not a repository all leave the set empty and the
 * tree undimmed, exactly as before this phase.
 *
 * PHASE 90.3 KEYED THE SET ON THE TARGET RATHER THAN ON A PATH. Two machines
 * can hold the same path. Keyed on a path alone, a tab on another machine whose
 * folder happened to match this Mac's would have kept this Mac's ignore set and
 * dimmed another machine's rows from it. A remote target asks nothing and holds
 * nothing: `git check-ignore` runs on this Mac, so there is no honest answer for
 * a folder that is not here, and an undimmed tree is the true state.
 */

import { create } from 'zustand';
import {
  localPathOf,
  sameTarget,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { ancestorDirsOf } from './tree-paths';
import { gmuxBridge } from '../bridge';

const NONE: ReadonlySet<string> = new Set<string>();

/**
 * Ceiling on one batch. The main-process service caps at the same number, so
 * neither side can be handed a list the other would silently truncate.
 */
const MAX_ASK = 20_000;

/**
 * Floor on how often a repo change may throw the ANSWERS away (not the set).
 *
 * The watcher fires on any worktree write, and the operator runs several
 * agents writing at once, so without this an ignore re-read would ride every
 * tick and its stdin would grow with the loaded tree.
 *
 * Raised from 2000 to 10000 in Phase 47.1. Two things decide the number. The
 * only event this floor exists for is an ignore RULE change, meaning an edit
 * to a .gitignore, to .git/info/exclude or to core.excludesFile, because
 * nothing else can change an answer the store already holds. A new file that
 * happens to be ignored is not that event, and it dims on the next watcher
 * tick through the ordinary sync below. The floor used to have a visible cost
 * per tick, since each one blanked the tree, and that cost is now zero, so the
 * only thing left to weigh is one `git check-ignore` spawn against how long a
 * .gitignore edit may take to show. Measured under one writer at 400 ms, 2000
 * ms means 30 spawns per minute and 10000 ms means 6, each spawn costing 13 ms
 * to 30 ms. A .gitignore edit now shows within 10 s at worst.
 */
const INVALIDATE_MIN_MS = 10_000;

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
 * Loaded paths the set already covers, spelled out one by one (Phase 47.1).
 *
 * These never go to git. Git cannot re-include a file whose parent directory
 * is excluded, so a path under `node_modules/` is ignored by definition and
 * `pathsToAsk` is right to drop it. The tree still needs a row-level answer
 * for it, and the two ways to get one are not equal.
 *
 * @pierre/trees can inherit the status down from the directory entry, but its
 * `ignoredInheritanceCache` is built once per mount with `useMemo(..., [])`
 * and nothing in the package ever clears it (render/FileTreeView.js, the
 * `useMemo` at line 558 and `getInheritedIgnoredGitStatus` at line 180). A
 * directory that is rendered BEFORE its ignored answer arrives is cached as
 * "not under an ignored directory" for the life of the tree, so a file an
 * agent later writes into `node_modules/` would render undimmed and stay that
 * way. Until Phase 47.1 that was hidden, because emptying the set every 2 s made
 * the next pass ask about every loaded path and hand every row an explicit
 * entry. An explicit entry wins over inheritance (FileTreeView.js line 408),
 * so giving every loaded path its own entry is what keeps the dimming right
 * without the blanking that made it right before.
 */
export function coveredByIgnored(
  paths: Iterable<string>,
  ignored: ReadonlySet<string>
): string[] {
  if (ignored.size === 0) return [];
  const covered: string[] = [];
  for (const path of paths) {
    if (path.length === 0 || ignored.has(path)) continue;
    if (isUnderIgnored(path, ignored)) covered.push(path);
  }
  return covered;
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
  /**
   * The folder the current set belongs to, being one path on one computer.
   *
   * PHASE 90.3 replaced a bare path here, for the reason in the module header.
   */
  target: WorkspaceTarget | null;
  /** Canonical ignored paths; a directory keeps its trailing '/'. */
  ignored: ReadonlySet<string>;
  /**
   * Bumped by `invalidate`. The tree's sync effect watches it, so a
   * .gitignore edit re-asks about every path rather than trusting the
   * remembered answers. It does NOT change what is rendered on its own.
   */
  epoch: number;
  /**
   * Ask about whatever is new in `paths`. Never throws.
   *
   * A target on another machine is dropped whole: the set is emptied and no
   * call is made, because `git check-ignore` reads this Mac and a folder over
   * there is not here to read.
   */
  sync(target: WorkspaceTarget, paths: Iterable<string>): Promise<void>;
  /**
   * Distrust the remembered answers and ask again (git:changed). The set the
   * tree renders is left alone until the replacement lands. See the rule in
   * the module header.
   */
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
  /**
   * True from `invalidate` until a full answer lands. It makes the next sync
   * ask about every loaded path and REPLACE the set with what comes back, so
   * a path that stopped being ignored can leave.
   */
  let revalidating = false;

  const forget = (): void => {
    lastInvalidateAt = Date.now();
    answered = new Set();
    revalidating = true;
    syncSeq++;
    // The rendered set is deliberately absent here. Emptying it is the bug
    // Phase 47.1 fixed; read the module header before putting it back.
    set((s) => ({ epoch: s.epoch + 1 }));
  };

  /** True when the two sets hold the same paths, so no repaint is needed. */
  const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
    if (a.size !== b.size) return false;
    for (const path of a) if (!b.has(path)) return false;
    return true;
  };

  /**
   * Land one answer. `replace` starts from the hits alone, which is what lets
   * a path that stopped being ignored leave; otherwise the hits are merged
   * into what is already shown. Either way the loaded paths the result covers
   * are spelled out, and an unchanged result is not written back.
   */
  const commit = (
    hits: readonly string[],
    paths: Iterable<string>,
    replace: boolean
  ): void => {
    const current = get().ignored;
    const next = replace ? new Set<string>() : new Set(current);
    for (const path of hits) next.add(path);
    for (const path of coveredByIgnored(paths, next)) next.add(path);
    if (sameSet(next, current)) return;
    set({ ignored: next });
  };

  return {
    target: null,
    ignored: NONE,
    epoch: 0,

    async sync(target, paths) {
      const repoPath = localPathOf(target);
      if (repoPath === null) {
        // A folder on another machine. Nothing on this Mac can answer for it,
        // so the set is emptied and no call is made. `reset` is idempotent.
        if (get().target !== null || get().ignored.size > 0) {
          answered = new Set();
          revalidating = false;
          syncSeq++;
          set({ target: null, ignored: NONE });
        }
        return;
      }
      const gmux = gmuxBridge();
      const checkIgnore = gmux?.git.checkIgnore;
      if (gmux === undefined || typeof checkIgnore !== 'function') return;

      if (!sameTarget(get().target, target)) {
        // A different repository is a real transition, not a refresh. Nothing
        // known about the old one is worth showing over the new one.
        answered = new Set();
        revalidating = false;
        set({ target, ignored: NONE });
      }

      // A revalidation asks about EVERY loaded path. The remembered answers
      // are exactly what may now be wrong, and the current set cannot be used
      // to skip a subtree either, because the whole point is to find out
      // whether that subtree is still ignored.
      const replace = revalidating;
      const ask = replace
        ? pathsToAsk(paths, NONE, NONE)
        : pathsToAsk(paths, get().ignored, answered);

      if (ask.length === 0) {
        // Nothing to ask git, which is still an answer. Spell out any newly
        // listed path the set already covers, and on a revalidation with an
        // empty tree settle on the empty set rather than staying stale.
        if (replace) revalidating = false;
        commit([], paths, replace);
        return;
      }

      const seq = ++syncSeq;
      const epoch = get().epoch;
      let hits: string[];
      try {
        hits = await checkIgnore.call(gmux.git, { repoPath, paths: ask });
      } catch {
        // Dimming is a decoration. A failed read leaves the tree plain, and
        // leaves `revalidating` set so the next tick tries the full ask again.
        return;
      }
      // Stale: another sync started, the project moved, or the answers were
      // invalidated while this call was in flight. Dropping the result keeps
      // the last good set on screen, which is the point of the whole store.
      if (seq !== syncSeq) return;
      if (!sameTarget(get().target, target) || get().epoch !== epoch) return;

      if (replace) {
        answered = new Set(ask);
        revalidating = false;
      } else {
        for (const path of ask) answered.add(path);
      }
      commit(hits, paths, replace);
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
      // Leaving the repository IS a real transition, so this one does empty
      // the rendered set. There is no tree left to dim.
      if (invalidateTimer !== null) {
        clearTimeout(invalidateTimer);
        invalidateTimer = null;
      }
      revalidating = false;
      // Idempotent, and it does NOT touch the epoch. The tree's sync effect
      // watches the epoch and calls this one when the folder is not a
      // repository, so bumping it here would be a loop.
      if (get().target === null && get().ignored.size === 0) return;
      answered = new Set();
      syncSeq++;
      set({ target: null, ignored: NONE });
    }
  };
});
