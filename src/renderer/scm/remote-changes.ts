/**
 * What has changed in a folder on another machine (Phase 90.3).
 *
 * WHY THIS IS A SECOND STORE AND NOT A BRANCH INSIDE `useGit`. `useGit` holds
 * git status read on THIS Mac, keyed by an absolute path on this Mac, and every
 * verb on it writes: stage, unstage, discard, commit. None of those four can
 * exist for a folder on another computer, and a store that held both kinds
 * would have to refuse four verbs on half its rows. Research 55 section 14.3
 * counted the surfaces and put Source Control's Changes group in the five that
 * cross and everything else in the eight that refuse. Two stores is what that
 * split looks like in code: this one reads and has no verb that writes.
 *
 * THE KEY IS THE PAIR. Entries are keyed by `targetKey`, which is
 * `<machineId>:<path>` for a folder on a machine. A path alone is what made a
 * local tab and a machine tab at the same path show each other's rows, which is
 * the wrong machine defect the whole round exists to remove.
 *
 * NO TIMER, ANYWHERE. A read happens when the tab is opened and when a person
 * presses Refresh, and at no other moment. Research 55 section 5.4 offered a
 * two second poll and this phase refuses it, because nothing counts calls in
 * flight to one machine and the far machine's effective ceiling is 10 (research
 * 56 section 1.5). The cost is that a file an agent changes over there does not
 * appear until Refresh is pressed, and the view says so with the time of the
 * last read.
 *
 * WHAT IS NOT HERE, AND IT IS A DEPARTURE FROM THE SPEC WORTH NAMING. The
 * branch name and the ahead and behind counts are not in this store, because
 * `MachineReviewList` does not carry them. That answer is composed in
 * `src/main/machines/remote-review.ts`, which no builder in this phase owns, so
 * widening it belongs to the phase that owns that file. The header draws the
 * folder and the machine instead, and it asserts no branch it has not read.
 */

import { create } from 'zustand';
import type {
  GmuxMachinesExtras,
  MachineReviewFile,
  MachineReviewList
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';

/** The machines bridge, or null on a build without one. */
function machinesBridge(): NonNullable<GmuxMachinesExtras['machines']> | null {
  const api = (globalThis as { window?: { gmux?: unknown } }).window?.gmux as
    | GmuxMachinesExtras
    | undefined;
  return api?.machines ?? null;
}

/** True when this build can read what changed on another machine at all. */
export function remoteChangesAvailable(): boolean {
  return typeof machinesBridge()?.reviewFiles === 'function';
}

/** One folder on one machine, as that machine last reported it. */
export interface RemoteChangesEntry {
  /** The machine the folder is on. */
  machineId: string;
  /** The folder ON THAT MACHINE. Never a path on this Mac. */
  path: string;
  /** The repository root that machine reported. Empty when there is none. */
  repoPath: string;
  /** Every tracked file in it that differs from its last commit. */
  files: readonly MachineReviewFile[];
  /** How many there were, when only the first ones are listed. */
  total: number;
  /** The sentence main sent under a capped list, or null. */
  note: string | null;
  /** True when that folder is not inside a git repository. */
  notRepo: boolean;
  /** True only while a read with nothing yet is in flight. */
  loading: boolean;
  /** True while a read is running over rows that are already on screen. */
  refreshing: boolean;
  /** True when the last read did not land. The view composes the sentence. */
  failed: boolean;
  /** Epoch ms on THIS Mac when the last good answer arrived. 0 = never. */
  readAt: number;
}

const EMPTY: RemoteChangesEntry = {
  machineId: '',
  path: '',
  repoPath: '',
  files: [],
  total: 0,
  note: null,
  notRepo: false,
  loading: false,
  refreshing: false,
  failed: false,
  readAt: 0
};

/** The entry for one target, or an empty one. Pure, so a render may call it. */
export function remoteChangesOf(
  byTarget: Record<string, RemoteChangesEntry>,
  target: WorkspaceTarget | null | undefined
): RemoteChangesEntry {
  if (target === null || target === undefined) return EMPTY;
  return byTarget[targetKey(target)] ?? EMPTY;
}

interface RemoteChangesState {
  /** Keyed by `targetKey`, so two machines at one path are two entries. */
  byTarget: Record<string, RemoteChangesEntry>;
  /** Read once for a target that has never been read. Never on a clock. */
  ensure(target: WorkspaceTarget): void;
  /** Read now. This is the Refresh button and nothing else calls it. */
  refresh(target: WorkspaceTarget): Promise<void>;
  /** Drop one target's rows, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
}

export const useRemoteChanges = create<RemoteChangesState>((set, get) => {
  /** One read per target at a time. Not in state: no render on this churn. */
  const inflight = new Set<string>();

  const patch = (key: string, next: Partial<RemoteChangesEntry>): void => {
    set((s) => ({
      byTarget: {
        ...s.byTarget,
        [key]: { ...(s.byTarget[key] ?? EMPTY), ...next }
      }
    }));
  };

  const read = async (target: WorkspaceTarget): Promise<void> => {
    const bridge = machinesBridge();
    const key = targetKey(target);
    if (bridge === null || typeof bridge.reviewFiles !== 'function') return;
    if (inflight.has(key)) return;
    inflight.add(key);
    const had = (get().byTarget[key]?.readAt ?? 0) > 0;
    patch(key, {
      machineId: target.machineId,
      path: target.path,
      loading: !had,
      refreshing: had,
      failed: false
    });
    try {
      const list: MachineReviewList = await bridge.reviewFiles({
        machineId: target.machineId,
        cwd: target.path
      });
      patch(key, {
        repoPath: list.repoPath,
        files: list.files,
        total: list.total,
        // A capped list is the only case whose sentence comes from main. The
        // other two answers main puts in this field, being "nothing changed"
        // and "not a repository", are states this store records as states, so
        // the view draws its own sentence for each and no prose is duplicated.
        note: list.files.length > 0 ? list.note : null,
        notRepo: list.repoPath.length === 0,
        loading: false,
        refreshing: false,
        failed: false,
        readAt: Date.now()
      });
    } catch {
      // The sentence is not composed here. `failed` is a state and the view
      // draws the one sentence for it, which keeps every word about a machine
      // in the file the vocabulary audit reads.
      patch(key, { loading: false, refreshing: false, failed: true });
    } finally {
      inflight.delete(key);
    }
  };

  return {
    byTarget: {},

    ensure(target) {
      const entry = get().byTarget[targetKey(target)];
      if (entry !== undefined && (entry.readAt > 0 || entry.loading)) return;
      void read(target);
    },

    async refresh(target) {
      await read(target);
    },

    forget(target) {
      const key = targetKey(target);
      set((s) => {
        if (s.byTarget[key] === undefined) return s;
        const next = { ...s.byTarget };
        delete next[key];
        return { byTarget: next };
      });
    }
  };
});
