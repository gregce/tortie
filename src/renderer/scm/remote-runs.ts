/**
 * The workflow runs for the branch checked out in a folder on another machine
 * (Phase 105).
 *
 * WHY THIS IS A SECOND STORE AND NOT A BRANCH INSIDE `useRuns`. `useRuns` is
 * keyed by a repository path on THIS Mac, it arms a watch in main, it re-reads
 * on `git:changed` and on `actions:changed`, and it reads a run's jobs when a
 * row is expanded. Not one of those five things can exist for a folder on
 * another computer. Main cannot see a push made over there, so there is nothing
 * to watch and nothing to arm. A path from another computer would name a
 * different repository in that store or none at all. So this is its own store,
 * it holds one answer per target, and it has no verb that writes.
 *
 * THE KEY IS THE PAIR. Entries are keyed by `targetKey`, which is
 * `<machineId>:<path>` for a folder on a machine. `remote-changes.ts` states
 * the reason: a path alone is what made a local tab and a machine tab at the
 * same path show each other's rows.
 *
 * NO TIMER, ANYWHERE. A read happens on the FIRST EXPAND of the section and
 * when a person presses Refresh, and at no other moment. Nothing polls the
 * machine and nothing polls GitHub. A tab nobody expanded asks nothing of
 * anybody, which matters more here than it does for Changes, because one read
 * crosses a link and then starts a gh process on this Mac.
 *
 * ONE READ IN FLIGHT PER TARGET. `loading` is a read with nothing on screen
 * yet, `refreshing` is a read over rows that are already drawn. A second
 * Refresh while one is in flight is dropped.
 *
 * WHERE gh RUNS. On this Mac, always. The machine is asked two things, being
 * which branch is checked out and which repository the folder is. Nothing in
 * this file knows how either half is fetched, and no sentence in it is composed
 * here: every word a person reads about this answer is a named export in
 * src/renderer/machines/runs.ts, which is the file the vocabulary audit
 * reads.
 */

import { create } from 'zustand';
import type { ActionsHealth, ActionsParseIssue, ActionsRun } from '@shared/actions';
import type {
  InstalledGmuxApi,
  MachineRunsMode,
  MachineRunsResult
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';

/** The machines bridge, or null on a build without one. */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/** True when this build can read the runs for a folder on another machine. */
export function remoteRunsAvailable(): boolean {
  return typeof machinesBridge()?.readRuns === 'function';
}

/**
 * One folder on one machine, as the last read left it.
 *
 * `mode` is null until something has been read, which is the state the section
 * ships in. Every other field is the answer main sent, unchanged.
 */
export interface RemoteRunsEntry {
  /** The machine the folder is on. */
  machineId: string;
  /** The folder ON THAT MACHINE. Never a path on this Mac. */
  path: string;
  /** That machine's own label, as main sent it. Empty until the first answer. */
  machineLabel: string;
  /** What the last read found. Null when nothing has been read. */
  mode: MachineRunsMode | null;
  /** owner/repo for the repository over there, or null. */
  ownerRepo: string | null;
  /** The branch checked out over there, or null. */
  branch: string | null;
  /** The commit HEAD points at over there, or null. */
  headSha: string | null;
  /** How many rows gh was asked for. 0 until the first answer. */
  limit: number;
  /** The rows GitHub sent, newest first. */
  runs: readonly ActionsRun[];
  /** The rows the parser refused, with the field that made it refuse. */
  issues: readonly ActionsParseIssue[];
  /** gh's own ladder, and gh ran on this Mac. */
  health: ActionsHealth;
  /** True only while a read with nothing yet is in flight. */
  loading: boolean;
  /** True while a read is running over rows that are already on screen. */
  refreshing: boolean;
  /** Epoch ms on THIS Mac when the last answer arrived. 0 = never. */
  readAt: number;
  /** How long the whole call took, round trip included. */
  elapsedMs: number;
}

const EMPTY: RemoteRunsEntry = {
  machineId: '',
  path: '',
  machineLabel: '',
  mode: null,
  ownerRepo: null,
  branch: null,
  headSha: null,
  limit: 0,
  runs: [],
  issues: [],
  health: { state: 'ready' },
  loading: false,
  refreshing: false,
  readAt: 0,
  elapsedMs: 0
};

/** The entry for one target, or an empty one. Pure, so a render may call it. */
export function remoteRunsOf(
  byTarget: Record<string, RemoteRunsEntry>,
  target: WorkspaceTarget | null | undefined
): RemoteRunsEntry {
  if (target === null || target === undefined) return EMPTY;
  return byTarget[targetKey(target)] ?? EMPTY;
}

/**
 * Whether the machine itself answered this read.
 *
 * THIS IS AN HONESTY RULE AND IT IS WHY IT IS A NAMED FUNCTION RATHER THAN A
 * TEST INSIDE A RENDER. Two of the eight modes mean Tortie read nothing at all
 * over there: `notConnected`, where nothing was asked, and `unreachable`, where
 * nothing came back. Drawing "Tortie read this from Studio at 14:32" under
 * either of them would state a read that never happened. The other six all mean
 * that machine answered, even when the answer is that there is no folder.
 */
export function machineAnsweredRuns(mode: MachineRunsMode | null): boolean {
  return (
    mode !== null && mode !== 'notConnected' && mode !== 'unreachable'
  );
}

/**
 * The commit to draw beside the branch, shortened the way git shortens one.
 *
 * Seven characters, which is what `git rev-parse --short` gives by default, so
 * the string a person reads here is the string they can paste over there. An
 * answer with no commit gives the empty string and the sentence is not drawn.
 */
export function shortSha(sha: string | null): string {
  return sha === null ? '' : sha.slice(0, 7);
}

interface RemoteRunsState {
  /** Keyed by `targetKey`, so two machines at one path are two entries. */
  byTarget: Record<string, RemoteRunsEntry>;
  /**
   * Read once for a target that has never been read.
   *
   * The section calls this on its FIRST EXPAND and at no other moment. It is
   * not called on mount, because a collapsed section must ask nothing.
   */
  ensure(target: WorkspaceTarget): void;
  /** Read now. This is the Refresh button and nothing else calls it. */
  refresh(target: WorkspaceTarget): Promise<void>;
  /** Drop one target's answer, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
}

export const useRemoteRuns = create<RemoteRunsState>((set, get) => {
  /** One read per target at a time. Not in state: no render on this churn. */
  const inflight = new Set<string>();

  const patch = (key: string, next: Partial<RemoteRunsEntry>): void => {
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
    if (bridge === null || typeof bridge.readRuns !== 'function') return;
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
      const answer: MachineRunsResult = await bridge.readRuns({
        machineId: target.machineId,
        cwd: target.path
      });
      patch(key, {
        machineLabel: answer.machineLabel,
        mode: answer.mode,
        ownerRepo: answer.ownerRepo,
        branch: answer.branch,
        headSha: answer.headSha,
        limit: answer.limit,
        runs: answer.runs,
        issues: answer.issues,
        health: answer.health,
        loading: false,
        refreshing: false,
        readAt: answer.readAt,
        elapsedMs: answer.elapsedMs
      });
    } catch {
      // The channel itself failed, which is a different fact from the machine
      // not answering, and there is no third sentence for it. `unreachable` is
      // the mode whose sentence says the branch could not be read, which is
      // what happened, and `machineAnsweredRuns` keeps the read time and the
      // list sentences off the screen for it.
      patch(key, {
        mode: 'unreachable',
        runs: [],
        issues: [],
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
