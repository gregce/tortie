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
 * Everything here is an ENHANCEMENT. A preload without the channel and a
 * folder that is not a repository leave the set empty and the tree undimmed,
 * exactly as before this phase. A failed read leaves whatever was on screen.
 *
 * PHASE 90.3 KEYED THE SET ON THE TARGET RATHER THAN ON A PATH. Two machines
 * can hold the same path. Keyed on a path alone, a tab on another machine whose
 * folder happened to match this Mac's would have kept this Mac's ignore set and
 * dimmed another machine's rows from it. A remote target asks nothing and holds
 * nothing: `git check-ignore` runs on this Mac, so there is no honest answer for
 * a folder that is not here, and an undimmed tree is the true state.
 *
 * PHASE 343, RULE 6: GIT IS NEVER ASKED ABOUT A PATH PAST A LINK, AND A LINK
 * ROW IS STILL ASKED AS TODAY. Git stops at a link. Handed any path under one,
 * or a link spelled as a folder (`.venv/`), `git check-ignore` prints
 * `fatal: pathspec ... is beyond a symbolic link` and exits 128, and the
 * service maps that to an EMPTY answer for the WHOLE batch (measured, A8). An
 * ordinary sync merges, so that hides at first; the first revalidation after
 * any change in the project REPLACES the set with that empty answer and the
 * whole tree goes undimmed, `node_modules` included (measured through this very
 * store with real git, A4). So both arms of `pathsToAsk` drop every path under
 * a link drawn as a folder and send the link row itself in today's LEAF
 * spelling (`.venv`), which is how it was asked when it was drawn as a leaf and
 * how git answers it (exit 0). A hit is keyed back onto the folder spelling
 * (`.venv/`) before it lands, so the rows under an ignored link are covered by
 * `coveredByIgnored` as rows under any ignored folder are, and `answered`
 * holds the canonical spelling. Rows under a link that is NOT ignored stay
 * undimmed, which is true: git does not look past a link.
 *
 * PHASE 370: ONE CALL AT A TIME. Until this phase every `sync` with something
 * to ask started a call of its own, and the tree hands over one listing PER
 * CACHED FOLDER: each folder's answer is a store write, and each write runs
 * the sync effect. So a project with N folders open started N+2 `git
 * check-ignore` processes at once the moment its tree was shown, and again on
 * every change in the repository (measured in the app: 12, 102 and 502 alive
 * at once for 10, 100 and 500 folders, no writer needed). A later sync also
 * threw an earlier answer away, so under a writer nothing landed, nothing was
 * remembered and each tick asked about everything again. The operator's Mac
 * reached 515 of them and a load average of 474.
 *
 *  1. ONE CALL IS OUT for the folder shown (`flight`). A `sync` that arrives
 *     while it is out records its listing (`newest`) and does nothing else: no
 *     call, and no path of the listing read.
 *  2. AN ANSWER LANDS THOUGH LISTINGS ARRIVED. Every path it answers for is
 *     still answered, so a newer listing is no reason to drop it. It is
 *     spelled out over the NEWEST listing, so a row listed while git ran gets
 *     its entry when the call ends.
 *  3. LEAVING THE FOLDER ABANDONS THE CALL. `reset`, another folder and a
 *     folder on another machine take it out of the store at once: its answer
 *     is dropped when it comes, and the folder now shown is asked without
 *     waiting for it. Main's own line (src/main/git/ignore-line.ts) is what
 *     keeps the folder left at one child.
 *  4. THE RULES DISTRUSTED WHILE GIT RAN (the epoch moved). A growing ask's
 *     answer is dropped. A REVALIDATION's answer still replaces what is on
 *     screen, because calls run one after another and so it is newer than the
 *     set it replaces, and it settles nothing: the revalidation stays owed and
 *     no path is recorded as answered. Dropping it too meant that a git slower
 *     than the 10 s floor landed nothing at all while agents wrote (measured:
 *     0 landings in 120 s at 12 s a call, against 8 this way).
 *  5. ONE CALL BEHIND IT. When a call ends with an answer the store looks at
 *     `newest` once and starts at most one more: everything again when a
 *     revalidation is owed, else only the paths nobody has answered for, else
 *     nothing. More than `MAX_ASK` paths end as a chain of them.
 *     A revalidation behind a call needs a listing that came while that call
 *     ran. With the section collapsed nobody hands one over, and without this
 *     a git slower than the 10 s floor was asked about a tree nobody sees for
 *     as long as agents wrote. The tree hands one over for every epoch, so a
 *     tree on screen is always asked about.
 *  6. A FAILED CALL STARTS NOTHING, and nothing starts for a second after it.
 *     A tick hands over one listing per cached folder, so without that hold a
 *     git that fails in 2 ms was asked 30,000 times a minute at 500 folders.
 *     ONE timer asks once when the second ends, and only where the failure
 *     left work nobody would ask about again on a quiet tree: a listing came
 *     while the failed call ran or inside the second, or the failed call was
 *     the one BEHIND another, which carries what came before it (one failure
 *     there left 10 of 12 rows undimmed for good). It cannot loop: the retry
 *     is never itself the call behind another, so a second arming needs a
 *     newer listing or an answer that landed.
 *  7. A REPLACEMENT REPLACES WHAT IT ASKED ABOUT. A row on screen that is
 *     still listed and was not asked about, past `MAX_ASK` or listed again
 *     while git ran, stays until the call behind it asks (`unconfirmed`). It
 *     is asked, because an unconfirmed entry never excuses a path from the
 *     ask, so a row that stopped being ignored still leaves. Dropping them at
 *     once emptied the dimming of a tree of more than 20,000 rows on every
 *     revalidation.
 *
 * WHAT MUST NOT BE UNDONE: starting a call from every sync, dropping an answer
 * because a listing arrived, starting a call because one failed, and dropping
 * a row nobody asked about. And `sync` is NOT an `async` function: a caller
 * that started a call resumes in the turn that call ends, before the call
 * behind it can land. One more awaited turn lets the wrong answer be read.
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

/**
 * PHASE 370. After a call failed, nothing is asked for this long, so a git
 * that fails every time is asked about once a second however many listings a
 * tick hands over. Rule 6 of PHASE 370 in the module header.
 */
export const RETRY_AFTER_FAILURE_MS = 1_000;

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

/** PHASE 343. True when `path` sits strictly under a link drawn as a folder. */
function isUnderLinkFolder(
  path: string,
  linkFolders: ReadonlySet<string>
): boolean {
  if (linkFolders.size === 0) return false;
  for (const dir of ancestorDirsOf(path)) {
    if (linkFolders.has(dir)) return true;
  }
  return false;
}

/**
 * PHASE 343. A path as git spelled it, back in the tree's canonical spelling:
 * a link row asked as a leaf (`.venv`) is the folder row `.venv/`.
 */
export function canonicalAnswer(
  path: string,
  linkFolders: ReadonlySet<string>
): string {
  return linkFolders.has(path + '/') ? path + '/' : path;
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
 *
 * PHASE 343. `linkFolders` is the canonical spelling of every link the tree
 * drew as a folder, and it is REQUIRED. Every path under one is dropped, and a
 * link row itself is returned in its LEAF spelling (`.venv`, never `.venv/`),
 * which is what git is handed. `answered` and `ignored` are still canonical.
 * See RULE 6 in the module header.
 */
export function pathsToAsk(
  paths: Iterable<string>,
  ignored: ReadonlySet<string>,
  answered: ReadonlySet<string>,
  linkFolders: ReadonlySet<string>,
  limit: number = MAX_ASK
): string[] {
  const ask: string[] = [];
  for (const path of paths) {
    if (path.length === 0) continue;
    if (answered.has(path) || ignored.has(path)) continue;
    if (isUnderIgnored(path, ignored)) continue;
    if (isUnderLinkFolder(path, linkFolders)) continue;
    ask.push(linkFolders.has(path) ? path.slice(0, -1) : path);
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
 * entries therefore puts the dirty-descendant dot on `docs/` because
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
   * Ask about whatever is new in `paths`. Never rejects.
   *
   * PHASE 370. One call at a time (the module header). A sync that starts a
   * call settles when THAT call ends, landed, dropped or failed. A sync that
   * arrives while one is out settles with the call started behind it, or when
   * the one out ends with nothing left to ask, or fails. A sync with nothing
   * to ask, or inside the second after a failure, settles at once.
   *
   * A target on another machine is dropped whole: the set is emptied and no
   * call is made, because `git check-ignore` reads this Mac and a folder over
   * there is not here to read.
   *
   * PHASE 343. `linkFolders` is required: the link rows the tree drew as
   * folders, so git is asked about each in its leaf spelling and never about a
   * path under one (RULE 6 in the module header).
   */
  sync(
    target: WorkspaceTarget,
    paths: Iterable<string>,
    linkFolders: ReadonlySet<string>
  ): Promise<void>;
  /**
   * Distrust the remembered answers and ask again (git:changed). The set the
   * tree renders is left alone until the replacement lands. See the rule in
   * the module header.
   */
  invalidate(): void;
  /** Leave the repo entirely (project closed, folder is not a repository). */
  reset(): void;
}

/** The newest listing the tree handed over. */
interface Listing {
  target: WorkspaceTarget;
  paths: Iterable<string>;
  linkFolders: ReadonlySet<string>;
}

/** One call to git, and what is needed to land its answer. */
interface Round {
  /** The epoch it was asked in. */
  epoch: number;
  /** A revalidation: its answer REPLACES the set. */
  replace: boolean;
  /** Started by the end of another call rather than by a listing. */
  behind: boolean;
  /** What git was handed, in git's spelling. */
  ask: string[];
  linkFolders: ReadonlySet<string>;
}

export const useTreeIgnored = create<TreeIgnoredState>((set, get) => {
  /**
   * Paths git has already answered for, ignored or not. Kept outside the
   * store because nothing renders from it and a new Set per sync would repaint
   * the whole tree.
   */
  let answered = new Set<string>();
  let lastInvalidateAt = 0;
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * True from `invalidate` until a full answer lands. It makes the next call
   * ask about every loaded path and REPLACE the set with what comes back, so
   * a path that stopped being ignored can leave.
   */
  let revalidating = false;

  // ----- PHASE 370: one call at a time (the module header) -----------------
  /** The ONE call the store is waiting on for the folder it shows, or null. */
  let flight: Round | null = null;
  /** The newest listing the tree handed over. Every sync records it. */
  let newest: Listing | null = null;
  /** Syncs that arrived while a call was out, settled by the call behind it. */
  let waiting: Array<() => void> = [];
  /** When the last call failed, or 0. */
  let failedAt = 0;
  /** One timer, armed only by work a failure left unanswered. */
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Entries on screen that the last replacement did not ask about. Shown, and
   * still to be asked: rule 7 of PHASE 370 in the module header.
   */
  let unconfirmed: ReadonlySet<string> = NONE;

  const settle = (list: ReadonlyArray<() => void>): void => {
    for (const done of list) done();
  };

  /** Take every waiter there is, so each is settled exactly once. */
  const takeWaiting = (): Array<() => void> => {
    const taken = waiting;
    waiting = [];
    return taken;
  };

  /**
   * What is left of the second after a failure, or 0. A clock set back reads
   * as no hold rather than as a long one.
   */
  const holdLeft = (): number => {
    if (failedAt === 0) return 0;
    const since = Date.now() - failedAt;
    return since < 0 ? 0 : Math.max(0, RETRY_AFTER_FAILURE_MS - since);
  };

  const clearRetry = (): void => {
    if (retryTimer === null) return;
    clearTimeout(retryTimer);
    retryTimer = null;
  };

  /** Work the failure left unanswered: ask once, when the hold ends. */
  const armRetry = (): void => {
    if (retryTimer !== null) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (flight === null) void pump(false);
    }, holdLeft());
  };

  /** Leave the folder: the call that is out is no longer the store's. */
  const abandon = (): void => {
    flight = null;
    newest = null;
    failedAt = 0;
    unconfirmed = NONE;
    clearRetry();
    settle(takeWaiting());
  };

  const forget = (): void => {
    lastInvalidateAt = Date.now();
    answered = new Set();
    revalidating = true;
    // The rendered set is deliberately absent here. Emptying it is the bug
    // Phase 47.1 fixed; read the module header before putting it back. The
    // call that is out is left alone too: it ends by the epoch rule.
    set((s) => ({ epoch: s.epoch + 1 }));
  };

  /** True when the two sets hold the same paths, so no repaint is needed. */
  const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
    if (a.size !== b.size) return false;
    for (const path of a) if (!b.has(path)) return false;
    return true;
  };

  /** What is on screen, less the entries nobody has asked about since. */
  const confirmed = (): ReadonlySet<string> => {
    const current = get().ignored;
    if (unconfirmed.size === 0) return current;
    const trusted = new Set(current);
    for (const path of unconfirmed) trusted.delete(path);
    return trusted;
  };

  /**
   * Land one answer. `replace` starts from the hits alone, which is what lets
   * a path that stopped being ignored leave; otherwise the hits are merged
   * into what is already shown. Either way the loaded paths the result covers
   * are spelled out, and an unchanged result is not written back.
   *
   * PHASE 370. `listing` is the NEWEST one, not the one that was asked. And an
   * entry on screen that is still to be asked about (`asked` is what has been,
   * in the tree's spelling) stays until it is: rule 7 of the module header.
   */
  const commit = (
    hits: readonly string[],
    listing: Listing,
    replace: boolean,
    asked: ReadonlySet<string>
  ): void => {
    const { paths, linkFolders } = listing;
    const current = get().ignored;
    const next = new Set(replace ? NONE : confirmed());
    for (const path of hits) next.add(path);
    for (const path of coveredByIgnored(paths, next)) next.add(path);

    if (replace || unconfirmed.size > 0) {
      const kept = new Set<string>();
      for (const path of pathsToAsk(paths, next, asked, linkFolders, Infinity)) {
        const key = canonicalAnswer(path, linkFolders);
        if (current.has(key)) kept.add(key);
      }
      // And the rows under a kept folder, a link's among them, which are never
      // asked about themselves.
      for (const path of coveredByIgnored(paths, kept)) kept.add(path);
      unconfirmed = kept;
      for (const path of kept) next.add(path);
    }

    if (sameSet(next, current)) return;
    set({ ignored: next });
  };

  /**
   * PHASE 370. The call is over: land what it said, then look at the newest
   * listing once. `hits` is null when git did not answer.
   */
  const finish = (
    round: Round,
    carried: ReadonlyArray<() => void>,
    hits: readonly string[] | null
  ): void => {
    if (flight !== round) {
      // The store left this folder while git ran. Nothing lands, and the
      // folder it shows now has its own call.
      settle(carried);
      return;
    }
    flight = null;

    if (hits === null) {
      // Dimming is a decoration. A failed read keeps the last good set on
      // screen and leaves `revalidating` set, so the next ask is the full one
      // again. Nothing starts here. What nobody would ask about again on a
      // quiet tree is asked about once, when the hold ends: a listing that
      // came while the call was out, or the work of a call behind another.
      failedAt = Date.now();
      const late = takeWaiting();
      if (late.length > 0 || carried.length > 0 || round.behind) armRetry();
      settle(carried);
      settle(late);
      return;
    }

    failedAt = 0;
    // `answered` holds the canonical spelling, which is what the next
    // `pathsToAsk` compares against.
    const asked = new Set(
      round.ask.map((path) => canonicalAnswer(path, round.linkFolders))
    );
    const same = get().epoch === round.epoch;
    if (same) {
      if (round.replace) {
        answered = asked;
        revalidating = false;
      } else {
        for (const path of asked) answered.add(path);
      }
    }
    // The rules distrusted again while git ran: a replacement is newer than
    // what is on screen, so it is shown; it settles nothing, so a full ask
    // follows. A growing ask's answer is dropped.
    if (newest !== null && (same || round.replace)) {
      commit(hits, newest, round.replace, round.replace ? asked : answered);
    }
    settle(carried);
    // A subscriber of the write above may have started a call already.
    if (flight === null) void pump(true);
  };

  /**
   * PHASE 370. The only place a call starts, and only ever with none out: look
   * at the newest listing ONCE and start at most one call. Returns the promise
   * of the call it started, or a settled one. `behind` is the end of a call
   * looking, rather than a listing that arrived.
   */
  const pump = (behind: boolean): Promise<void> => {
    const gmux = gmuxBridge();
    const checkIgnore = gmux?.git.checkIgnore;
    const repoPath = newest === null ? null : localPathOf(newest.target);
    if (
      newest === null ||
      repoPath === null ||
      gmux === undefined ||
      typeof checkIgnore !== 'function'
    ) {
      settle(takeWaiting());
      return Promise.resolve();
    }
    const listing = newest;
    const { paths, linkFolders } = listing;
    // Owed, and no listing came while the call before it ran: nobody is
    // looking. It stays owed, and the next listing asks.
    if (behind && revalidating && waiting.length === 0) return Promise.resolve();

    // A revalidation asks about EVERY loaded path. The remembered answers
    // are exactly what may now be wrong, and the current set cannot be used
    // to skip a subtree either, because the whole point is to find out
    // whether that subtree is still ignored.
    //
    // PHASE 343. BOTH arms take the link folders. The revalidation arm is
    // the one that matters most: it asks every loaded path, and one path
    // past a link would make git answer nothing for the whole batch and this
    // arm then REPLACES the set with that nothing.
    const replace = revalidating;
    const ask = replace
      ? pathsToAsk(paths, NONE, NONE, linkFolders)
      : pathsToAsk(paths, confirmed(), answered, linkFolders);

    if (ask.length === 0) {
      // Nothing to ask git, which is still an answer. Spell out any newly
      // listed path the set already covers, and on a revalidation with an
      // empty tree settle on the empty set rather than staying stale.
      if (replace) revalidating = false;
      commit([], listing, replace, replace ? NONE : answered);
      settle(takeWaiting());
      return Promise.resolve();
    }

    const round: Round = { epoch: get().epoch, replace, behind, ask, linkFolders };
    flight = round;
    const carried = takeWaiting();
    let call: Promise<string[]>;
    try {
      call = checkIgnore.call(gmux.git, { repoPath, paths: ask });
    } catch (err) {
      call = Promise.reject(err);
    }
    return call
      // PHASE 343. A link row is asked in its leaf spelling and its hit is
      // keyed back onto the folder spelling before it lands.
      .then((raw) => raw.map((path) => canonicalAnswer(path, linkFolders)))
      .then(
        (hits) => finish(round, carried, hits),
        () => finish(round, carried, null)
      );
  };

  return {
    target: null,
    ignored: NONE,
    epoch: 0,

    sync(target, paths, linkFolders) {
      if (localPathOf(target) === null) {
        // A folder on another machine. Nothing on this Mac can answer for it,
        // so the set is emptied and no call is made. `reset` is idempotent.
        if (get().target !== null || get().ignored.size > 0) {
          answered = new Set();
          revalidating = false;
          abandon();
          set({ target: null, ignored: NONE });
        }
        return Promise.resolve();
      }
      if (typeof gmuxBridge()?.git.checkIgnore !== 'function') {
        return Promise.resolve();
      }

      if (!sameTarget(get().target, target)) {
        // A different repository is a real transition, not a refresh. Nothing
        // known about the old one is worth showing over the new one.
        answered = new Set();
        revalidating = false;
        abandon();
        set({ target, ignored: NONE });
      }

      newest = { target, paths, linkFolders };
      if (flight !== null) {
        // PHASE 370. One call is out. Record the listing and do nothing else.
        return new Promise<void>((resolve) => {
          waiting.push(resolve);
        });
      }
      if (holdLeft() > 0) {
        // PHASE 370. A call failed less than a second ago.
        armRetry();
        return Promise.resolve();
      }
      clearRetry();
      return pump(false);
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
      abandon();
      set({ target: null, ignored: NONE });
    }
  };
});
