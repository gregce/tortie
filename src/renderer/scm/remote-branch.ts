/**
 * The branch checked out in a folder on another machine (Phase 106).
 *
 * WHY THIS IS A THIRD STORE. `useGit` is keyed by a repository path on THIS
 * Mac, it arms a watch in main and it re-reads on `git:changed`. Not one of
 * those three things can exist for a folder on another computer, because main
 * cannot see a branch switched over there. `useRemoteRuns` beside this file is
 * keyed the right way and holds a branch name, and it still is not the right
 * home, because it holds neither the upstream nor the two counts and widening
 * its read would make every Runs read pay for a group nobody opened. So this is
 * its own store, it holds one answer per target, and it has no verb that
 * writes.
 *
 * THE KEY IS THE PAIR. Entries are keyed by `targetKey`, which is
 * `<machineId>:<path>` for a folder on a machine. `remote-changes.ts` states
 * the reason, being that a path alone is what made a local tab and a machine
 * tab at the same path show each other's rows.
 *
 * NO TIMER, ANYWHERE. A read happens on the FIRST EXPAND of the group and when
 * a person presses Refresh, and at no other moment. A tab nobody expanded asks
 * nothing of anybody.
 *
 * ONE READ IN FLIGHT PER TARGET. `loading` is a read with nothing on screen
 * yet, `refreshing` is a read over an answer that is already drawn. A second
 * Refresh while one is in flight is dropped.
 *
 * NO SENTENCE IS COMPOSED HERE. Every word a person reads about this answer is
 * a named export in src/renderer/app/machine-copy.ts, which is the file the
 * vocabulary audit reads.
 */

import { create } from 'zustand';
import type {
  InstalledGmuxApi,
  MachineBranchMode,
  MachineBranchResult
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';

/** The machines bridge, or null on a build without one. */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/** True when this build can read the branch for a folder on another machine. */
export function remoteBranchAvailable(): boolean {
  return typeof machinesBridge()?.readBranch === 'function';
}

/**
 * One folder on one machine, as the last read left it.
 *
 * `mode` is null until something has been read, which is the state the group
 * ships in. Every other field is the answer main sent, unchanged.
 */
export interface RemoteBranchEntry {
  /** The machine the folder is on. */
  machineId: string;
  /** The folder ON THAT MACHINE. Never a path on this Mac. */
  path: string;
  /** That machine's own label, as main sent it. Empty until the first answer. */
  machineLabel: string;
  /** What the last read found. Null when nothing has been read. */
  mode: MachineBranchMode | null;
  /** The branch checked out over there, or null. */
  branch: string | null;
  /** The full commit its tip points at, or null. */
  sha: string | null;
  /** The same commit as git shortens it, or null. */
  shortSha: string | null;
  /** The branch it follows, or null when it follows none. */
  upstream: string | null;
  /** True when that machine no longer has the branch it is set to follow. */
  upstreamGone: boolean;
  /** Commits it holds that the followed branch does not. */
  ahead: number;
  /** Commits the followed branch holds that it does not. */
  behind: number;
  /** True when a tracking answer arrived and this end could not read it. */
  trackUnreadable: boolean;
  /** True only while a read with nothing yet is in flight. */
  loading: boolean;
  /** True while a read is running over an answer that is already on screen. */
  refreshing: boolean;
  /** Epoch ms on THIS Mac when the last answer arrived. 0 = never. */
  readAt: number;
  /** How long the whole call took, round trip included. */
  elapsedMs: number;
}

const EMPTY: RemoteBranchEntry = {
  machineId: '',
  path: '',
  machineLabel: '',
  mode: null,
  branch: null,
  sha: null,
  shortSha: null,
  upstream: null,
  upstreamGone: false,
  ahead: 0,
  behind: 0,
  trackUnreadable: false,
  loading: false,
  refreshing: false,
  readAt: 0,
  elapsedMs: 0
};

/** The entry for one target, or an empty one. Pure, so a render may call it. */
export function remoteBranchOf(
  byTarget: Record<string, RemoteBranchEntry>,
  target: WorkspaceTarget | null | undefined
): RemoteBranchEntry {
  if (target === null || target === undefined) return EMPTY;
  return byTarget[targetKey(target)] ?? EMPTY;
}

/**
 * Whether the machine itself answered this read.
 *
 * THIS IS AN HONESTY RULE AND IT IS WHY IT IS A NAMED FUNCTION RATHER THAN A
 * TEST INSIDE A RENDER. Two of the eight modes mean Tortie read nothing at all
 * over there, being `notConnected`, where nothing was asked, and `unreachable`,
 * where nothing came back. Drawing "Tortie read this from Studio at 14:32"
 * under either of them would state a read that never happened. The other six
 * all mean that machine answered, even when the answer is that there is no
 * folder.
 */
export function machineAnsweredBranch(
  mode: MachineBranchMode | null
): boolean {
  return mode !== null && mode !== 'notConnected' && mode !== 'unreachable';
}

interface RemoteBranchState {
  /** Keyed by `targetKey`, so two machines at one path are two entries. */
  byTarget: Record<string, RemoteBranchEntry>;
  /**
   * Read once for a target that has never been read.
   *
   * The group calls this on its FIRST EXPAND and at no other moment. It is not
   * called on mount, because a collapsed group must ask nothing.
   */
  ensure(target: WorkspaceTarget): void;
  /** Read now. This is the Refresh button and nothing else calls it. */
  refresh(target: WorkspaceTarget): Promise<void>;
  /** Drop one target's answer, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
}

export const useRemoteBranch = create<RemoteBranchState>((set, get) => {
  /** One read per target at a time. Not in state: no render on this churn. */
  const inflight = new Set<string>();

  const patch = (key: string, next: Partial<RemoteBranchEntry>): void => {
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
    if (bridge === null || typeof bridge.readBranch !== 'function') return;
    if (inflight.has(key)) return;
    inflight.add(key);
    const had = (get().byTarget[key]?.readAt ?? 0) > 0;
    patch(key, {
      machineId: target.machineId,
      path: target.path,
      loading: !had,
      refreshing: had
    });
    try {
      const answer: MachineBranchResult = await bridge.readBranch({
        machineId: target.machineId,
        cwd: target.path
      });
      patch(key, {
        machineLabel: answer.machineLabel,
        mode: answer.mode,
        branch: answer.branch,
        sha: answer.sha,
        shortSha: answer.shortSha,
        upstream: answer.upstream,
        upstreamGone: answer.upstreamGone,
        ahead: answer.ahead,
        behind: answer.behind,
        trackUnreadable: answer.trackUnreadable,
        loading: false,
        refreshing: false,
        readAt: answer.readAt,
        elapsedMs: answer.elapsedMs
      });
    } catch {
      // The channel itself failed, which is a different fact from the machine
      // not answering, and there is no third sentence for it. `unreachable` is
      // the mode whose sentence says the branch could not be read, which is
      // what happened, and `machineAnsweredBranch` keeps the read time off the
      // screen for it.
      patch(key, {
        mode: 'unreachable',
        branch: null,
        sha: null,
        shortSha: null,
        upstream: null,
        upstreamGone: false,
        ahead: 0,
        behind: 0,
        trackUnreadable: false,
        loading: false,
        refreshing: false,
        readAt: 0
      });
    } finally {
      inflight.delete(key);
    }
  };

  return {
    byTarget: {},

    ensure(target) {
      const entry = get().byTarget[targetKey(target)];
      if (entry !== undefined && (entry.mode !== null || entry.loading)) return;
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
