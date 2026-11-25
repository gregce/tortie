/**
 * File-tree data store: lazy per-directory listings for the active project.
 *
 * Directories are listed on first expand (fs:readDir) and cached in
 * `entriesByDir` keyed by absolute path. `refreshLoaded()` re-lists every
 * cached directory (git:changed / manual refresh) so open folders track
 * branch flips, agent writes, etc., while never touching unexpanded ones.
 * `.git` is hidden at every level; dotfiles stay visible.
 *
 * ## PHASE 90.3 — the same cache, filled from another machine
 *
 * A project can now be a folder on another machine. The cache and everything
 * above it are unchanged: the keys are still absolute directory paths and the
 * values are still `FsDirEntry` lists. What changes is where one fill comes
 * from.
 *
 * THE RULE, and it is the whole design: NEVER IN SERIES. Research 55 measured
 * nine folders read as nine calls at 409.7 ms, and the same nine answers in ONE
 * subtree call at 42.3 ms. So a remote root is one call that fills every
 * directory in the answer, and expanding a folder the answer already covered
 * costs nothing at all.
 *
 * NO TIMER, ANYWHERE. A remote folder is read when the tab is opened, when a
 * folder is expanded past the fetched depth, and when a person presses Refresh.
 * It is never read on a clock. This is a deliberate departure from research 55
 * section 5.4, which offered a two second poll. Nothing in this product counts
 * calls in flight to one machine, and that machine's effective ceiling is 10,
 * measured in research 56 section 1.5. The cost of the departure is that a file
 * an agent writes over there does not appear until Refresh is pressed, and the
 * Explorer says so in one line.
 *
 * PHASE 343 ADDED A COUNT, AND STILL NO TIMER. Every walk that is not the tab's
 * own root, being an expanded link, a folder at a walk's last level, a folder
 * a person opened past the fetched depth, or one of those re-read by Refresh
 * or restored when the tab opens, is counted, and never more than
 * `REMOTE_EXTRA_READS` (9) of them are in flight beside the root's. A tenth
 * waits its turn in the order it asked; a waiting lazy load looks at the cache
 * again when its turn comes and is dropped if a walk has covered it since; and
 * pointing the tree at another folder drops every waiter. Research 56 section
 * 1.5 measured ten calls at once at 46.3 ms median and eleven at 258.8 ms, and
 * research 55 saw the first refusals at thirty. Nothing here waits on a clock:
 * a waiter starts when a walk ends.
 *
 * And a walk that is not the tab's root never touches the tab's status or its
 * line. A link to a folder the account cannot read, or whose target went away,
 * answers `denied` or `missing` for THAT folder, and the folder stays unlisted,
 * as a failed child read on this Mac does; the Explorer keeps every row.
 *
 * ## PHASE 372 — one refresh, one write
 *
 * A refresh still re-reads every cached folder, forced, exactly as Phase 155
 * made it. What changed is what it WRITES. Measured at 500 open folders, every
 * change on disk made 502 store writes, 502 passes of the tree's model and 502
 * calls into the ignore store, even a change no listing showed, and the writes
 * of one refresh spread over 0.41 to 0.79 s although its 502 reads all answered
 * within 11 to 19 ms. Each answer rendered before the next was taken.
 *
 * A LISTING EQUAL TO THE ONE HELD WRITES NOTHING (`sameListing`): every own key
 * of every entry, in order, both ways, so a field added to `FsDirEntry` later
 * is compared without anybody remembering to. Equal keeps the held array, so
 * nothing above the store moves. A folder that vanished and was not cached, and
 * a root error that did not change, write nothing either.
 *
 * THE ANSWERS ONE REFRESH ASKED FOR ARE WRITTEN BY ONE `set`, when the last of
 * them answers, or when none has answered for `REFRESH_QUIET_MS` while one is
 * still out, or `REFRESH_CAP_MS` after the first, whichever is first. A slow
 * folder never holds the rest past the quiet gap, and what is late is written
 * the moment it lands. Everything a person does to one folder (an expand, a
 * relist after a create, rename, move, trash or import, the root's first read)
 * is never collected and writes when it answers, as before; a relist that
 * joins a read a refresh started makes that read write at once.
 *
 * ORDER AND TRUTH ARE KEPT. Every read takes a stamp when it starts, and a
 * landing never replaces what a later read wrote. A folder `forgetUnder`
 * dropped is never brought back by a read that began before the forget, and
 * its staged answer is dropped with it. Pointing the tree at another folder
 * drops the collection, its stamps and its timers. A read is in flight from
 * its `readDir` call until its answer arrives, so a Refresh pressed while an
 * answer is only staged reads again (Phase 155), and `refreshLoaded()` resolves
 * once every read it asked for has been written or dropped. The two timers are
 * the only clocks in this store, bounded, and only an answer arms them.
 */

import { create } from 'zustand';
import { REMOTE_TREE_DEPTH, type RemoteTreeListing } from '@shared/ipc';
import type { FsDirEntry } from '@shared/types';
import {
  isLocalTarget,
  localPathOf,
  sameTarget,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { errorText } from '../state/store';
import { canReadDir, readDir } from './fs-bridge';
import { canListTree, listTree } from './remote-bridge';
import {
  groupRemoteEntries,
  loadedLinkFolders,
  mergeRemoteGroups
} from './remote-plan';
import { drawsAsFolder } from './tree-paths';

/**
 * PHASE 343. How many walks that are not the tab's own root may be in flight
 * to a machine at once, beside the root's. See the module header.
 */
export const REMOTE_EXTRA_READS = 9;

/**
 * PHASE 372 (D3). How long a refresh waits, with a read still out, after the
 * last of its answers before it writes what has answered. The largest gap
 * between two answers of one refresh measured 4.8 ms over fifteen whole
 * refreshes of 502 folders (its 99th percentile at most 0.6 ms), so an ordinary
 * refresh never meets it, and with one folder held the rest are written about
 * this long after they stop arriving.
 */
export const REFRESH_QUIET_MS = 8;

/**
 * PHASE 372 (D3). The longest a refresh holds an answer before it writes it,
 * counted from the first one it holds. Five times the slowest whole refresh
 * measured (19 ms at 502 folders), so it bites only on a trickle of answers
 * none of which comes 8 ms after the last, and half of the 195 to 205 ms the
 * parent already added for the folder it read last.
 */
export const REFRESH_CAP_MS = 100;

/** PHASE 372 (D1). Every own key of both entries, both ways, by `Object.is`. */
function sameEntry(a: FsDirEntry, b: FsDirEntry): boolean {
  if (a === b) return true;
  const own = (x: FsDirEntry, k: string): boolean =>
    Object.prototype.hasOwnProperty.call(x, k);
  for (const k of Object.keys(a) as Array<keyof FsDirEntry>) {
    if (!own(b, k) || !Object.is(a[k], b[k])) return false;
  }
  for (const k of Object.keys(b)) {
    if (!own(a, k)) return false;
  }
  return true;
}

/**
 * PHASE 372 (D1). Whether two listings of one folder would draw, dim, badge
 * and open exactly alike: the same length, and at every index two entries with
 * the same own keys holding the same values. Every own key rather than a named
 * list, because every reader of the cache is answered by an entry's fields and
 * their order, and a list would rot the first time `FsDirEntry` grows.
 */
export function sameListing(
  a: readonly FsDirEntry[] | undefined,
  b: readonly FsDirEntry[] | undefined
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x === undefined || y === undefined || !sameEntry(x, y)) return false;
  }
  return true;
}

/**
 * Sort: directories first, then case-insensitive by name (dotfiles mixed in).
 * PHASE 343: a link drawn as a folder sorts with the folders.
 */
export function sortEntries(entries: readonly FsDirEntry[]): FsDirEntry[] {
  return [...entries].sort((a, b) => {
    const aDir = drawsAsFolder(a) ? 0 : 1;
    const bDir = drawsAsFolder(b) ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * PHASE 343 (D4). A link main could not answer for in time keeps what the
 * same name pointed at in that folder's previous listing.
 *
 * Main waits for a link's `stat` at most a short time, and a link not answered
 * by then arrives with no `link` field. Read as a leaf, an OPEN linked folder
 * would collapse on the next watcher tick and the listing diff would remove its
 * whole subtree. So an entry that is a link with no field takes the field the
 * same name carried in `previous`, when it was a link there too; only a link
 * never answered reads as today's leaf. This Mac only: a far answer's marks
 * are never partial.
 */
export function carryLinkTargets(
  next: readonly FsDirEntry[],
  previous: readonly FsDirEntry[] | undefined
): FsDirEntry[] {
  if (previous === undefined || previous.length === 0) return [...next];
  let known: Map<string, NonNullable<FsDirEntry['link']>> | null = null;
  return next.map((entry) => {
    if (entry.kind !== 'symlink' || entry.link !== undefined) return entry;
    if (known === null) {
      known = new Map();
      for (const old of previous) {
        if (old.kind === 'symlink' && old.link !== undefined) {
          known.set(old.name, old.link);
        }
      }
    }
    const link = known.get(entry.name);
    return link === undefined ? entry : { ...entry, link };
  });
}

function prepare(entries: readonly FsDirEntry[]): FsDirEntry[] {
  return sortEntries(entries.filter((e) => e.name !== '.git'));
}

/**
 * What the last read of a folder on another machine answered.
 *
 * It is the whole state the Explorer draws its one line from. `readAt` is null
 * until a read has succeeded, so "read at 09:14" is never shown for a folder
 * nothing has read.
 */
export interface RemoteTreeRead {
  status: RemoteTreeListing['status'];
  /** The folder the answer is about, on that machine. */
  root: string;
  /** Epoch ms on THIS Mac when the last good answer arrived, or null. */
  readAt: number | null;
  /** How many entries that machine counted under the root. */
  total: number;
  /** How many of them arrived. */
  shown: number;
  /** True when the machine held more than it sent. */
  truncated: boolean;
  /** True while a read is in flight. */
  loading: boolean;
}

const REMOTE_IDLE: RemoteTreeRead = {
  status: 'ok',
  root: '',
  readAt: null,
  total: 0,
  shown: 0,
  truncated: false,
  loading: false
};

/**
 * PHASE 372. How a read's answer is written: `now` false collects it for a
 * refresh's one write, true writes it when it lands. Shared between a promised
 * read and the read it becomes, so a person who joins either raises both.
 */
interface Want {
  now: boolean;
}

/** PHASE 372. A local read from its `readDir` call until its answer arrives. */
interface LocalRead {
  stamp: number;
  want: Want;
  /** Still counted among the collected reads out (D3). */
  counted: boolean;
  /** Settles when `readDir` answers, never when the answer is written (D7). */
  answered: Promise<void>;
}

/** PHASE 372. One answer: a listing, or `entries` null and the failure. */
interface Landing {
  seq: number;
  stamp: number;
  entries: readonly FsDirEntry[] | null;
  error: unknown;
}

/** PHASE 372 (D3). An answer held for the flush, and who waits for it. */
interface Staged extends Landing {
  waiters: Array<() => void>;
}

/** PHASE 372. The cache as one write will leave it, copied on first change. */
interface Draft {
  base: Record<string, FsDirEntry[]>;
  next: Record<string, FsDirEntry[]> | null;
  rootError: string | null;
}

interface FileTreeState {
  /**
   * The folder the tree is showing, being one path on one computer.
   *
   * PHASE 90.1 replaced a bare path here. Two machines can hold the same path,
   * so a path alone could not tell one tab from another and every switch
   * between them returned early with this Mac's listing still on screen.
   */
  root: WorkspaceTarget | null;
  /** Loaded directory (absolute path) → filtered, sorted entries. */
  entriesByDir: Record<string, FsDirEntry[]>;
  /** Root listing finished at least once for the current root. */
  rootLoaded: boolean;
  /** Friendly one-liner when the ROOT listing failed (child errors toast). */
  rootError: string | null;
  /** True when the preload lacks fs.readDir (integration pending). */
  bridgeMissing: boolean;
  /**
   * PHASE 90.3. What the machine last said about this tab's folder, or null
   * while the tab is on this Mac. Nothing else in this store branches on it.
   */
  remote: RemoteTreeRead | null;

  /**
   * Point the tree at a project root (clears cache, lists the root).
   *
   * A target on another machine costs ONE `machines:listTree` call, which fills
   * every directory in the answer at once.
   */
  setRoot(target: WorkspaceTarget | null): Promise<void>;
  /** List one directory into the cache (expand / lazy load). */
  loadDir(dirPath: string): Promise<void>;
  /** Re-list the root and every cached directory (refresh). */
  refreshLoaded(): Promise<void>;
  /**
   * Re-list specific directories NOW, cached or not (Phase 12.9).
   *
   * `loadDir` is a lazy-load and returns early when a listing is already
   * cached; after a file operation the cache is exactly what is wrong. The
   * @parcel/watcher would repair it within ~450 ms anyway (300 ms watcher
   * debounce + 150 ms in FilesSection) — this only closes the gap so a
   * created file appears on the frame the user asked for it, and it is the
   * same one-directory `readDir` the watcher path uses: no locks, no
   * full-tree rebuild, nothing for a concurrently writing agent to fight.
   */
  relist(dirPaths: readonly string[]): Promise<void>;
  /**
   * Drop cached listings at or under these absolute paths (a renamed or
   * trashed folder). Without this the old key keeps feeding phantom rows
   * into the tree until the watcher's failed re-list evicts it.
   */
  forgetUnder(dirPaths: readonly string[]): void;
}

export const useFileTree = create<FileTreeState>((set, get) => {
  /** Guards against out-of-order async results after a root switch. */
  let rootSeq = 0;
  /**
   * Reads running right now, one per directory. PHASE 372 (D7): a read is here
   * from its `readDir` call until its answer arrives, whether that answer is
   * then written or only staged.
   */
  const inFlight = new Map<string, LocalRead>();
  /**
   * PHASE 155. A second read already promised to a caller that asked while
   * another was running, one per directory. It exists so that "read it again"
   * costs ONE extra read however many people ask for it in the same burst.
   */
  const queued = new Map<string, { want: Want; done: Promise<void> }>();

  /** PHASE 372 (D4). One counter, taken when a read starts and by a forget. */
  let stampSeq = 0;
  /** PHASE 372 (D4). The stamp of the read whose answer the store holds. */
  const heldStamp = new Map<string, number>();
  /** PHASE 372 (D5). Folders forgotten while a read was out, with their stamp. */
  const forgets: Array<{ dir: string; stamp: number }> = [];
  /** PHASE 372 (D3). Answers a refresh collected and has not written yet. */
  const staged = new Map<string, Staged>();
  /** PHASE 372 (D3). Collected reads whose `readDir` has not answered. */
  let collectedOut = 0;
  /** PHASE 372 (D5). Every local read of this root still out, any mode. */
  let readsOut = 0;
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  let capTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = (): void => {
    if (quietTimer !== null) clearTimeout(quietTimer);
    if (capTimer !== null) clearTimeout(capTimer);
    quietTimer = null;
    capTimer = null;
  };

  /** True when a forget at or above `dirPath` came after a read stamped `stamp`. */
  const forgottenSince = (dirPath: string, stamp: number): boolean =>
    forgets.some(
      (f) =>
        f.stamp > stamp && (dirPath === f.dir || dirPath.startsWith(f.dir + '/'))
    );

  /**
   * With nothing out and nothing staged every later read is stamped after
   * everything held, so the stamps and the forgets have nothing left to guard.
   */
  const pruneIdle = (): void => {
    if (readsOut !== 0 || staged.size !== 0) return;
    heldStamp.clear();
    forgets.length = 0;
  };

  /**
   * PHASE 372. One landing against a draft of the cache: D5's forget, D4's
   * order, then D1's equality or D2's guards. Nothing is written here; the
   * caller writes the draft once.
   */
  const landInto = (draft: Draft, dirPath: string, landing: Landing): void => {
    if (forgottenSince(dirPath, landing.stamp)) return;
    if ((heldStamp.get(dirPath) ?? 0) > landing.stamp) return;
    heldStamp.set(dirPath, landing.stamp);
    const cache = draft.next ?? draft.base;
    if (landing.entries !== null) {
      const held = cache[dirPath];
      // PHASE 343 (D4). A link main did not answer for in time keeps the
      // kind this folder's last listing gave it.
      const next = prepare(carryLinkTargets(landing.entries, held));
      if (sameListing(held, next)) return;
      draft.next ??= { ...draft.base };
      draft.next[dirPath] = next;
      return;
    }
    if (dirPath === localPathOf(get().root)) {
      draft.rootError = errorText(landing.error);
      return;
    }
    // A child dir vanished (branch flip, rm -rf): drop it quietly.
    if (cache[dirPath] === undefined) return;
    draft.next ??= { ...draft.base };
    delete draft.next[dirPath];
  };

  const draftOf = (): Draft => {
    const s = get();
    return { base: s.entriesByDir, next: null, rootError: s.rootError };
  };

  /** ONE `set`, or none when the draft changed nothing. */
  const commit = (draft: Draft): void => {
    const patch: Partial<Pick<FileTreeState, 'entriesByDir' | 'rootError'>> = {};
    if (draft.next !== null) patch.entriesByDir = draft.next;
    if (draft.rootError !== get().rootError) patch.rootError = draft.rootError;
    if (Object.keys(patch).length > 0) set(patch);
  };

  /** PHASE 372 (D3). Write every staged answer in one `set`. */
  const flush = (): void => {
    clearTimers();
    if (staged.size === 0) return;
    const landings = [...staged];
    staged.clear();
    const draft = draftOf();
    for (const [dirPath, landing] of landings) {
      if (landing.seq !== rootSeq) continue; // root switched while staged
      landInto(draft, dirPath, landing);
    }
    commit(draft);
    pruneIdle();
    for (const [, landing] of landings) {
      for (const done of landing.waiters) done();
    }
  };

  /** PHASE 372 (D3). The flush rule: none out, or quiet, or the cap. */
  const scheduleFlush = (): void => {
    if (staged.size === 0) return;
    if (collectedOut === 0) {
      flush();
      return;
    }
    if (quietTimer !== null) clearTimeout(quietTimer);
    quietTimer = setTimeout(flush, REFRESH_QUIET_MS);
    capTimer ??= setTimeout(flush, REFRESH_CAP_MS);
  };

  /** PHASE 372 (D8). A person's read joined a collected one: write it at once. */
  const raise = (read: LocalRead): void => {
    read.want.now = true;
    if (!read.counted) return;
    read.counted = false;
    collectedOut -= 1;
    if (collectedOut === 0) scheduleFlush();
  };

  /** PHASE 372 (D3). Hold an answer for the flush, resolved when it is written. */
  const stage = (dirPath: string, landing: Landing): Promise<void> =>
    new Promise<void>((done) => {
      const before = staged.get(dirPath);
      if (before !== undefined && before.stamp > landing.stamp) {
        before.waiters.push(done);
      } else {
        staged.set(dirPath, {
          ...landing,
          waiters: [...(before?.waiters ?? []), done]
        });
      }
      scheduleFlush();
    });
  /**
   * The remote walk's own guard, deliberately separate from the two above. A
   * `machines:listTree` is one call that fills many directories and it is not
   * a `readDir`, so it must never be mistaken for one by the forced path
   * below. Phase 155 changed nothing about how a remote tree refreshes.
   */
  const remoteInFlight = new Set<string>();

  /**
   * PHASE 343. The count of walks that are not a tab's root, and the line of
   * those waiting for one to end. A waiter is resolved `true` when it may
   * start and `false` when it was dropped. See the module header.
   */
  let extraRunning = 0;
  const extraWaiting: Array<(go: boolean) => void> = [];
  const takeExtraSlot = (): Promise<boolean> => {
    if (extraRunning < REMOTE_EXTRA_READS) {
      extraRunning += 1;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      extraWaiting.push((go) => {
        if (go) extraRunning += 1;
        resolve(go);
      });
    });
  };
  const giveExtraSlot = (): void => {
    extraRunning -= 1;
    extraWaiting.shift()?.(true);
  };
  const dropExtraWaiters = (): void => {
    for (const waiter of extraWaiting.splice(0)) waiter(false);
  };

  /**
   * One `readDir` of one folder, and its landing. PHASE 372: the read is
   * stamped when it starts; a collected read's answer is staged for the flush,
   * and a person's is written at once. It resolves when the answer has been
   * written or dropped.
   */
  const readInto = async (
    dirPath: string,
    seq: number,
    want: Want
  ): Promise<void> => {
    // A read promised before a root switch has nothing left to answer for.
    if (seq !== rootSeq) return;
    const stamp = ++stampSeq;
    let answered!: () => void;
    const read: LocalRead = {
      stamp,
      want,
      counted: !want.now,
      answered: new Promise<void>((resolve) => {
        answered = resolve;
      })
    };
    readsOut += 1;
    if (read.counted) collectedOut += 1;
    inFlight.set(dirPath, read);
    let landing: Landing;
    try {
      const result = await readDir(dirPath);
      landing = { seq, stamp, entries: result.entries, error: undefined };
    } catch (err) {
      landing = { seq, stamp, entries: null, error: err };
    } finally {
      if (inFlight.get(dirPath) === read) inFlight.delete(dirPath);
      answered();
    }
    if (seq !== rootSeq) return; // root switched while listing
    readsOut -= 1;
    if (read.counted) {
      read.counted = false;
      collectedOut -= 1;
    }
    if (!read.want.now) {
      await stage(dirPath, landing);
      return;
    }
    const draft = draftOf();
    landInto(draft, dirPath, landing);
    commit(draft);
    pruneIdle();
  };

  /**
   * List one directory into the cache.
   *
   * PHASE 155. `force` is the difference between a lazy load and a person
   * asking. A read that is ALREADY RUNNING started before the caller asked, so
   * its answer cannot speak for what the caller has just done, and returning it
   * is how Refresh and an explicit re-list became capable of doing nothing at
   * all. A forced call therefore waits for the running read and then reads
   * again, and everyone who asks while that second read is still waiting joins
   * it rather than adding a third. A lazy load keeps the old behaviour: it
   * wanted a listing, one is coming, and that is enough.
   *
   * PHASE 372. `want.now` is the difference between a refresh and a person:
   * false collects the answer for the flush, true writes it when it lands. A
   * person who joins a collected read, running or promised, raises it, so a
   * relist never waits on a refresh's timers; a refresh that joins a person's
   * promised read gets that read's write. A forced call waits only for the
   * running read's ANSWER, never for its flush. And a lazy load never rides a
   * read that began before a forget of its folder, because that answer will
   * be dropped (D5).
   */
  const listInto = async (
    dirPath: string,
    seq: number,
    force: boolean,
    want: Want
  ): Promise<void> => {
    const running = inFlight.get(dirPath);
    if (running !== undefined) {
      if (want.now) raise(running);
      if (!force && !forgottenSince(dirPath, running.stamp)) return;
      const already = queued.get(dirPath);
      if (already !== undefined) {
        if (want.now) already.want.now = true;
        await already.done;
        return;
      }
      const entry: { want: Want; done: Promise<void> } = {
        want,
        done: Promise.resolve()
      };
      entry.done = (async () => {
        await running.answered;
        if (queued.get(dirPath) === entry) queued.delete(dirPath);
        await listInto(dirPath, seq, true, want);
      })();
      queued.set(dirPath, entry);
      await entry.done;
      return;
    }
    await readInto(dirPath, seq, want);
  };

  /**
   * ONE call to one machine, and everything it answered goes into the cache.
   *
   * `dir` is the folder to walk, which is the tab's root for an open and for a
   * refresh, and the expanded folder for a lazy load. Every directory the
   * answer covers is replaced, and anything deeper than the answer can speak
   * for is left exactly as it is (see ./remote-plan.ts).
   *
   * PHASE 343. A walk of any folder but the tab's own root is COUNTED (it waits
   * for one of `REMOTE_EXTRA_READS` places) and is SILENT: it never sets the
   * tab's status, its root, its read time, its counts or its loading flag. A
   * refusal leaves that one folder unlisted; an answer only merges its rows.
   * `lazy` is a lazy load's walk, which is dropped when its turn comes if a
   * walk has covered the folder since it asked.
   */
  const treeInto = async (
    machineId: string,
    dir: string,
    seq: number,
    lazy = false
  ): Promise<void> => {
    if (remoteInFlight.has(dir)) return;
    const isRoot = dir === get().root?.path;
    remoteInFlight.add(dir);
    if (!isRoot) {
      const go = await takeExtraSlot();
      if (!go) {
        remoteInFlight.delete(dir);
        return;
      }
      if (
        seq !== rootSeq ||
        (lazy && get().entriesByDir[dir] !== undefined)
      ) {
        remoteInFlight.delete(dir);
        giveExtraSlot();
        return;
      }
    } else {
      set((s) => ({
        remote: { ...(s.remote ?? REMOTE_IDLE), root: dir, loading: true }
      }));
    }
    let answer: RemoteTreeListing;
    try {
      answer = await listTree({ machineId, root: dir, depth: REMOTE_TREE_DEPTH });
    } catch {
      // The bridge itself refused or the call was lost. It is the same state to
      // a person as a machine that did not answer, and the Explorer says so.
      answer = { status: 'unreachable', root: dir };
    } finally {
      remoteInFlight.delete(dir);
      if (!isRoot) giveExtraSlot();
    }
    if (seq !== rootSeq) return;
    if (answer.status !== 'ok') {
      if (!isRoot) {
        // PHASE 343. That one folder stays unlisted, as a failed child read on
        // this Mac does, and the Explorer keeps every other row.
        set((s) => {
          if (s.entriesByDir[dir] === undefined) return {};
          const next = { ...s.entriesByDir };
          delete next[dir];
          return { entriesByDir: next };
        });
        return;
      }
      set((s) => ({
        remote: {
          ...(s.remote ?? REMOTE_IDLE),
          status: answer.status,
          root: answer.root,
          total: 0,
          shown: 0,
          truncated: false,
          loading: false
        }
      }));
      return;
    }
    const groups = groupRemoteEntries(
      answer.root,
      answer.entries,
      REMOTE_TREE_DEPTH
    );
    for (const key of Object.keys(groups)) {
      groups[key] = prepare(groups[key] ?? []);
    }
    if (!isRoot) {
      // PHASE 343. Rows only. The line under the Explorer is the root's.
      set((s) => ({
        entriesByDir: mergeRemoteGroups(
          s.entriesByDir,
          answer.root,
          REMOTE_TREE_DEPTH,
          groups
        )
      }));
      return;
    }
    set((s) => ({
      entriesByDir: mergeRemoteGroups(
        s.entriesByDir,
        answer.root,
        REMOTE_TREE_DEPTH,
        groups
      ),
      remote: {
        status: 'ok',
        root: answer.root,
        readAt: answer.readAt,
        total: answer.total,
        shown: answer.entries.length,
        truncated: answer.truncated,
        loading: false
      }
    }));
  };

  return {
    root: null,
    entriesByDir: {},
    rootLoaded: false,
    rootError: null,
    bridgeMissing: !canReadDir(),
    remote: null,

    async setRoot(target) {
      // BY VALUE, and it is the reason sameTarget exists. FilesSection composes
      // a fresh target object on every render, so a comparison by reference
      // would rebuild the whole tree on every frame.
      if (sameTarget(get().root, target)) return;
      const seq = ++rootSeq;
      inFlight.clear();
      queued.clear();
      remoteInFlight.clear();
      // PHASE 372 (D6). Nothing the old folder collected is written, and
      // everybody waiting for it is let go.
      clearTimers();
      const dropped = [...staged.values()];
      staged.clear();
      heldStamp.clear();
      forgets.length = 0;
      collectedOut = 0;
      readsOut = 0;
      for (const landing of dropped) {
        for (const done of landing.waiters) done();
      }
      // PHASE 343. Nobody waiting for a walk of the old folder is started.
      dropExtraWaiters();
      const remoteTab = target !== null && !isLocalTarget(target);
      const bridgeMissing = remoteTab ? !canListTree() : !canReadDir();
      set({
        root: target,
        entriesByDir: {},
        rootLoaded: false,
        rootError: null,
        bridgeMissing,
        remote: remoteTab
          ? {
              ...REMOTE_IDLE,
              root: target.path,
              // A preload with no `machines.listTree` is the same state to a
              // person as a machine Tortie is not signed in to, and saying so
              // is better than a shimmer that never resolves.
              status: bridgeMissing ? 'notConnected' : 'ok',
              loading: !bridgeMissing
            }
          : null
      });
      if (bridgeMissing || target === null) return;
      if (remoteTab) {
        await treeInto(target.machineId, target.path, seq);
        if (seq === rootSeq) set({ rootLoaded: true });
        return;
      }
      const local = localPathOf(target);
      if (local === null) return;
      await listInto(local, seq, false, { now: true });
      if (seq === rootSeq) set({ rootLoaded: true });
    },

    async loadDir(dirPath) {
      const { root, bridgeMissing, entriesByDir } = get();
      if (root === null || bridgeMissing) return;
      if (entriesByDir[dirPath] !== undefined) return; // already cached
      if (!isLocalTarget(root)) {
        // The answer for the tab's root already carried every directory down to
        // the fetched depth, so reaching here means the person expanded PAST
        // it, or (PHASE 343) expanded a link or a folder at the walk's last
        // level. That is exactly one more call, rooted where they expanded,
        // counted, and dropped if a walk covers the folder while it waits.
        await treeInto(root.machineId, dirPath, rootSeq, true);
        return;
      }
      await listInto(dirPath, rootSeq, false, { now: true });
    },

    async relist(dirPaths) {
      const { root, bridgeMissing } = get();
      if (root === null || bridgeMissing) return;
      if (!isLocalTarget(root)) {
        // One call from the SHALLOWEST of them, because one answer covers the
        // others. A path that is not under this tab's root is dropped.
        const under = dirPaths.filter(
          (d) => d === root.path || d.startsWith(root.path + '/')
        );
        const shallowest = [...under].sort((a, b) => a.length - b.length)[0];
        if (shallowest === undefined) return;
        await treeInto(root.machineId, shallowest, rootSeq);
        return;
      }
      const rootPath = localPathOf(root);
      if (rootPath === null) return;
      const seq = rootSeq;
      const wanted = dirPaths.filter(
        (d) => d === rootPath || d.startsWith(rootPath + '/')
      );
      // FORCED, because this verb's whole contract is "re-list NOW, cached or
      // not". A read already running was started before the file operation
      // that is calling this, so it can only answer with the folder as it was.
      await Promise.all(
        wanted.map((d) => listInto(d, seq, true, { now: true }))
      );
    },

    forgetUnder(dirPaths) {
      if (dirPaths.length === 0) return;
      // PHASE 372 (D5). A read that began before this never brings the folder
      // back, and an answer already staged for it is dropped now.
      const under = (key: string): boolean =>
        dirPaths.some((dir) => key === dir || key.startsWith(dir + '/'));
      for (const dir of dirPaths) forgets.push({ dir, stamp: ++stampSeq });
      for (const key of [...heldStamp.keys()]) {
        if (under(key)) heldStamp.delete(key);
      }
      for (const [key, landing] of [...staged]) {
        if (!under(key)) continue;
        staged.delete(key);
        for (const done of landing.waiters) done();
      }
      if (staged.size === 0) clearTimers();
      pruneIdle();
      set((s) => {
        const next = { ...s.entriesByDir };
        let dropped = false;
        for (const key of Object.keys(next)) {
          const hit = dirPaths.some(
            (dir) => key === dir || key.startsWith(dir + '/')
          );
          if (!hit) continue;
          delete next[key];
          dropped = true;
        }
        return dropped ? { entriesByDir: next } : {};
      });
    },

    async refreshLoaded() {
      const { root, bridgeMissing } = get();
      if (root === null) return;
      if (!isLocalTarget(root)) {
        // ONE call from the tab's root, and never one per cached folder. A
        // folder a person opened past the fetched depth keeps what it has, and
        // pressing Refresh on that folder's own root is how it is re-read.
        //
        // PHASE 343 (D19). Beside it, one walk of every opened link drawn as a
        // folder, because the root's walk never descends a link; all of them
        // through the count. When the root's answer has landed, every opened
        // link it now names that was not walked yet is walked too: a real
        // folder replaced by a link keeps its old key (the merge keeps keys at
        // a link), and that key would otherwise show what the folder held.
        const bridgeNow = !canListTree();
        if (bridgeNow !== bridgeMissing) set({ bridgeMissing: bridgeNow });
        if (bridgeNow) return;
        const seq = rootSeq;
        const machineId = root.machineId;
        const walked = new Set(loadedLinkFolders(get().entriesByDir));
        const rootWalk = (async () => {
          await treeInto(machineId, root.path, seq);
          if (seq !== rootSeq) return;
          const since = loadedLinkFolders(get().entriesByDir).filter(
            (dir) => !walked.has(dir)
          );
          await Promise.all(since.map((dir) => treeInto(machineId, dir, seq)));
        })();
        await Promise.all([
          rootWalk,
          ...[...walked].map((dir) => treeInto(machineId, dir, seq))
        ]);
        if (seq === rootSeq && !get().rootLoaded) set({ rootLoaded: true });
        return;
      }
      const rootPath = localPathOf(root);
      if (rootPath === null) return;
      const bridgeNow = !canReadDir();
      if (bridgeNow !== bridgeMissing) set({ bridgeMissing: bridgeNow });
      if (bridgeNow) return;
      const seq = rootSeq;
      // PHASE 372 (D2). Only when there was one: an unchanged field still runs
      // every subscriber of the store.
      if (get().rootError !== null) set({ rootError: null });
      const dirs = new Set(Object.keys(get().entriesByDir));
      dirs.add(rootPath);
      // FORCED. Refresh is the manual override and it must never be a no-op.
      // Before Phase 155 a press that landed while any other read of the same
      // folder was in flight returned at once and repainted nothing, and the
      // watcher starts one of those every few hundred milliseconds under churn.
      //
      // PHASE 372 (D3). Collected: the answers are written together, and this
      // resolves once every one of them has been written or dropped.
      await Promise.all(
        [...dirs].map((d) => listInto(d, seq, true, { now: false }))
      );
      if (seq === rootSeq && !get().rootLoaded && get().rootError === null) {
        set({ rootLoaded: true });
      }
    }
  };
});
