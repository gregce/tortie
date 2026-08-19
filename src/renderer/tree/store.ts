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
import { groupRemoteEntries, mergeRemoteGroups } from './remote-plan';

/** Sort: directories first, then case-insensitive by name (dotfiles mixed in). */
export function sortEntries(entries: readonly FsDirEntry[]): FsDirEntry[] {
  return [...entries].sort((a, b) => {
    const aDir = a.kind === 'dir' ? 0 : 1;
    const bDir = b.kind === 'dir' ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
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
  const inFlight = new Set<string>();

  const listInto = async (dirPath: string, seq: number): Promise<void> => {
    if (inFlight.has(dirPath)) return;
    inFlight.add(dirPath);
    try {
      const result = await readDir(dirPath);
      if (seq !== rootSeq) return; // root switched while listing
      set((s) => ({
        entriesByDir: { ...s.entriesByDir, [dirPath]: prepare(result.entries) }
      }));
    } catch (err) {
      if (seq !== rootSeq) return;
      if (dirPath === localPathOf(get().root)) {
        set({ rootError: errorText(err) });
      } else {
        // A child dir vanished (branch flip, rm -rf): drop it quietly.
        set((s) => {
          const next = { ...s.entriesByDir };
          delete next[dirPath];
          return { entriesByDir: next };
        });
      }
    } finally {
      inFlight.delete(dirPath);
    }
  };

  /**
   * ONE call to one machine, and everything it answered goes into the cache.
   *
   * `dir` is the folder to walk, which is the tab's root for an open and for a
   * refresh, and the expanded folder for a lazy load. Every directory the
   * answer covers is replaced, and anything deeper than the answer can speak
   * for is left exactly as it is (see ./remote-plan.ts).
   */
  const treeInto = async (
    machineId: string,
    dir: string,
    seq: number
  ): Promise<void> => {
    if (inFlight.has(dir)) return;
    inFlight.add(dir);
    set((s) => ({
      remote: { ...(s.remote ?? REMOTE_IDLE), root: dir, loading: true }
    }));
    let answer: RemoteTreeListing;
    try {
      answer = await listTree({ machineId, root: dir, depth: REMOTE_TREE_DEPTH });
    } catch {
      // The bridge itself refused or the call was lost. It is the same state to
      // a person as a machine that did not answer, and the Explorer says so.
      answer = { status: 'unreachable', root: dir };
    } finally {
      inFlight.delete(dir);
    }
    if (seq !== rootSeq) return;
    if (answer.status !== 'ok') {
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
    const groups = groupRemoteEntries(answer.root, answer.entries);
    for (const key of Object.keys(groups)) {
      groups[key] = prepare(groups[key] ?? []);
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
      await listInto(local, seq);
      if (seq === rootSeq) set({ rootLoaded: true });
    },

    async loadDir(dirPath) {
      const { root, bridgeMissing, entriesByDir } = get();
      if (root === null || bridgeMissing) return;
      if (entriesByDir[dirPath] !== undefined) return; // already cached
      if (!isLocalTarget(root)) {
        // The answer for the tab's root already carried every directory down to
        // the fetched depth, so reaching here means the person expanded PAST
        // it. That is exactly one more call, rooted where they expanded.
        await treeInto(root.machineId, dirPath, rootSeq);
        return;
      }
      await listInto(dirPath, rootSeq);
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
      await Promise.all(wanted.map((d) => listInto(d, seq)));
    },

    forgetUnder(dirPaths) {
      if (dirPaths.length === 0) return;
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
        const bridgeNow = !canListTree();
        if (bridgeNow !== bridgeMissing) set({ bridgeMissing: bridgeNow });
        if (bridgeNow) return;
        const seq = rootSeq;
        await treeInto(root.machineId, root.path, seq);
        if (seq === rootSeq && !get().rootLoaded) set({ rootLoaded: true });
        return;
      }
      const rootPath = localPathOf(root);
      if (rootPath === null) return;
      const bridgeNow = !canReadDir();
      if (bridgeNow !== bridgeMissing) set({ bridgeMissing: bridgeNow });
      if (bridgeNow) return;
      const seq = rootSeq;
      set({ rootError: null });
      const dirs = new Set(Object.keys(get().entriesByDir));
      dirs.add(rootPath);
      await Promise.all([...dirs].map((d) => listInto(d, seq)));
      if (seq === rootSeq && !get().rootLoaded && get().rootError === null) {
        set({ rootLoaded: true });
      }
    }
  };
});
