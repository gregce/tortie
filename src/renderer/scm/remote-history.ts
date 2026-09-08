/**
 * The commit history of a folder on another machine (Phase 107).
 *
 * WHY THIS IS A FOURTH STORE. `useGit` and `depth.ts` are keyed by a repository
 * path on THIS Mac, they arm a watch in main and they re-read on `git:changed`.
 * Not one of those three things can exist for a folder on another computer,
 * because main cannot see a commit made over there. The three stores beside
 * this file are keyed the right way and none of them holds a commit row, so
 * this is its own store, it holds one answer per target, and it has no verb
 * that writes.
 *
 * THE KEY IS THE PAIR. Entries are keyed by `targetKey`, which is
 * `<machineId>:<path>` for a folder on a machine. `remote-changes.ts` states
 * the reason, being that a path alone is what made a local tab and a machine
 * tab at the same path show each other's rows.
 *
 * NO TIMER, ANYWHERE. A read happens on the FIRST EXPAND of the group, when a
 * person presses Load more, and when a person presses Refresh. At no other
 * moment. A tab nobody expanded asks nothing of anybody. Condition 57l of
 * build/conformance-machines.mjs reads this file and fails it if any of the
 * three ways a browser can schedule work is named in it, so the rule is checked
 * rather than promised, and that is why none of the three is spelled out here.
 *
 * PAGING IS A RE-WALK AND NOT A CURSOR, and the whole reason is in one
 * sentence. A cursor, being a `--skip` or a commit to start after, has to be
 * right about what happened on the far side between two presses, and it cannot
 * be, because a commit made over there between the presses shifts the window
 * and the two pages then overlap or drop a row. So `loadMore` raises `limit`
 * and asks again from the top, and the whole list is replaced rather than added
 * to. That costs bytes and it cannot tear. Ten presses send about 742,500 bytes
 * in total against about 135,000 for the last page alone, and the group says on
 * screen that a page is read fresh.
 *
 * THE CEILING IS MAIN'S RULE AND THIS FILE ONLY OBEYS IT. `limit` never rises
 * above `REMOTE_HISTORY_MAX_COMMITS`, and main clamps the value it is sent as
 * well, so a renderer that asked for more would still be answered with the
 * ceiling.
 *
 * ONE READ IN FLIGHT PER TARGET. `loading` is a read with nothing on screen
 * yet, `refreshing` is a read over an answer that is already drawn. A second
 * press while one is in flight is dropped.
 *
 * NO SENTENCE IS COMPOSED HERE. Every word a person reads about this answer is
 * a named export in src/renderer/machines/history.ts, which is the file the
 * vocabulary audit reads.
 *
 * PHASE 233 ADDED THE FILES ONE COMMIT CHANGED, keyed the way `depth.ts` keys
 * its `details`, being the target and the commit. `detail` is read on the
 * FIRST EXPAND of a row and cached on success, so a row expanded twice asks
 * once, and a row whose read failed asks again the next time it is expanded,
 * which is what the local `depth.detail` does. It is still no timer: a person
 * expands a row, and that is one read.
 */

import { create } from 'zustand';
import type {
  InstalledGmuxApi,
  MachineCommitFile,
  MachineCommitFilesResult,
  MachineHistoryMode,
  MachineHistoryResult
} from '@shared/ipc';
import { REMOTE_HISTORY_MAX_COMMITS, REMOTE_HISTORY_PAGE } from '@shared/ipc';
import type { GitGraphLogEntry } from '@shared/types';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';
import { useApp } from '../state/store';
import { historyFilesNoAnswer, historyNotConnected } from '../machines/history';

/** The machines bridge, or null on a build without one. */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/** True when this build can read the history for a folder on another machine. */
export function remoteHistoryAvailable(): boolean {
  return typeof machinesBridge()?.readHistory === 'function';
}

/**
 * One folder on one machine, as the last read left it.
 *
 * `mode` is null until something has been read, which is the state the group
 * ships in. Every other field is the answer main sent, unchanged, except
 * `limit`, which is this end's own record of what the next read will ask for.
 */
export interface RemoteHistoryEntry {
  /** The machine the folder is on. */
  machineId: string;
  /** The folder ON THAT MACHINE. Never a path on this Mac. */
  path: string;
  /** That machine's own label, as main sent it. Empty until the first answer. */
  machineLabel: string;
  /** What the last read found. Null when nothing has been read. */
  mode: MachineHistoryMode | null;
  /** The page, newest first, in topological order. */
  entries: readonly GitGraphLogEntry[];
  /**
   * What the NEXT read asks for.
   *
   * It starts at `REMOTE_HISTORY_PAGE` and `loadMore` raises it by that much,
   * never above `REMOTE_HISTORY_MAX_COMMITS`. It is this end's own number and
   * it is not what came back, which is `maxCount` below.
   */
  limit: number;
  /** What the LAST answer was asked for, after main's own clamp. */
  maxCount: number;
  /** The ceiling main applies, so no sentence writes the number. */
  ceiling: number;
  /** THE CUT. True when the walk found more commits than the page holds. */
  hasMore: boolean;
  /** THE FAR END. True when maxCount is the ceiling and hasMore is true. */
  atCeiling: boolean;
  /** HEAD's tip over there, or null. */
  headSha: string | null;
  /** The tip of the branch HEAD follows, or null. */
  upstreamSha: string | null;
  /** The commit those two last agreed on, or null. */
  mergeBase: string | null;
  /** How many commits in the page carry an unpushed or unpulled mark. */
  markedCount: number;
  /** THE SECOND CUT. True when the mark read came back at its own cap. */
  divergenceTruncated: boolean;
  /** Bytes that machine's answer carried. */
  answerBytes: number;
  /** True only while a read with nothing yet is in flight. */
  loading: boolean;
  /** True while a read is running over an answer that is already on screen. */
  refreshing: boolean;
  /** Epoch ms on THIS Mac when the last answer arrived. 0 = never. */
  readAt: number;
  /** How long the whole call took, round trip included. */
  elapsedMs: number;
  /**
   * PHASE 230. True when the LAST read was refused by the link, being
   * `notConnected`, `unreachable` or a thrown call, while an earlier answer
   * is still held. The rows on screen are the last good answer and the group
   * draws no sentence over them; the shared hook reads this as `refused` and
   * reads again when the machine starts answering.
   */
  refused: boolean;
}

const EMPTY: RemoteHistoryEntry = {
  machineId: '',
  path: '',
  machineLabel: '',
  mode: null,
  entries: [],
  limit: REMOTE_HISTORY_PAGE,
  maxCount: 0,
  ceiling: REMOTE_HISTORY_MAX_COMMITS,
  hasMore: false,
  atCeiling: false,
  headSha: null,
  upstreamSha: null,
  mergeBase: null,
  markedCount: 0,
  divergenceTruncated: false,
  answerBytes: 0,
  loading: false,
  refreshing: false,
  readAt: 0,
  elapsedMs: 0,
  refused: false
};

/**
 * PHASE 233. What one commit changed, as the far side's `--name-status` said.
 *
 * Held per target and commit, the way `depth.ts` holds a local commit's
 * detail, so a row expanded twice asks once. Only a good answer is held: a
 * row whose read failed has no entry and asks again on its next expand.
 */
export interface RemoteCommitDetail {
  readonly files: readonly MachineCommitFile[];
}

/** The key one commit's detail is held under: the target, then the commit. */
export const remoteDetailKey = (
  target: WorkspaceTarget,
  sha: string
): string => `${targetKey(target)}\0${sha}`;

/** The entry for one target, or an empty one. Pure, so a render may call it. */
export function remoteHistoryOf(
  byTarget: Record<string, RemoteHistoryEntry>,
  target: WorkspaceTarget | null | undefined
): RemoteHistoryEntry {
  if (target === null || target === undefined) return EMPTY;
  return byTarget[targetKey(target)] ?? EMPTY;
}

/**
 * Whether the machine itself answered this read.
 *
 * THIS IS AN HONESTY RULE AND IT IS WHY IT IS A NAMED FUNCTION RATHER THAN A
 * TEST INSIDE A RENDER. Two of the seven modes mean Tortie read nothing at all
 * over there, being `notConnected`, where nothing was asked, and `unreachable`,
 * where nothing came back. Drawing "Tortie read this from Studio at 14:32"
 * under either of them would state a read that never happened. The other five
 * all mean that machine answered, even when the answer is that there is no
 * folder.
 */
export function machineAnsweredHistory(
  mode: MachineHistoryMode | null
): boolean {
  return mode !== null && mode !== 'notConnected' && mode !== 'unreachable';
}

/**
 * The next window size after one press of Load more.
 *
 * Pure and exported so the test can read the ceiling behaviour without a store.
 * It never returns a value above the ceiling and it never returns a smaller
 * window than it was given.
 */
export function nextLimit(limit: number): number {
  return Math.min(REMOTE_HISTORY_MAX_COMMITS, limit + REMOTE_HISTORY_PAGE);
}

interface RemoteHistoryState {
  /** Keyed by `targetKey`, so two machines at one path are two entries. */
  byTarget: Record<string, RemoteHistoryEntry>;
  /**
   * Read once for a target that has never been read.
   *
   * The group calls this on its FIRST EXPAND and at no other moment. It is not
   * called on mount, because a collapsed group must ask nothing.
   */
  ensure(target: WorkspaceTarget): void;
  /** Read the same window again. This is the Refresh button. */
  refresh(target: WorkspaceTarget): Promise<void>;
  /** Raise the window by one page and read it. This is the Load more button. */
  loadMore(target: WorkspaceTarget): Promise<void>;
  /** Drop one target's answer, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
  /**
   * PHASE 233. The files one commit changed, keyed by `remoteDetailKey`.
   *
   * A row reads its entry off this map while it is expanded. Absent means
   * nothing has been read yet, or the last read failed, and the row draws
   * the same skeleton the local row draws while it waits.
   */
  details: Record<string, RemoteCommitDetail>;
  /**
   * PHASE 233. Read what one commit changed, once.
   *
   * Called on the FIRST EXPAND of a row and at no other moment. Cached on
   * success, so a second expand asks nothing. Resolves null on a failure the
   * person has already been told about in a toast, which is `depth.detail`'s
   * own contract.
   */
  detail(target: WorkspaceTarget, sha: string): Promise<RemoteCommitDetail | null>;
}

export const useRemoteHistory = create<RemoteHistoryState>((set, get) => {
  /** One read per target at a time. It is not in state, so it renders nothing. */
  const inflight = new Set<string>();

  const patch = (key: string, next: Partial<RemoteHistoryEntry>): void => {
    set((s) => ({
      byTarget: {
        ...s.byTarget,
        [key]: { ...(s.byTarget[key] ?? EMPTY), ...next }
      }
    }));
  };

  /** One detail read per commit at a time, so two expands send one ask. */
  const inflightDetails = new Map<string, Promise<RemoteCommitDetail | null>>();

  const read = async (
    target: WorkspaceTarget,
    limit: number
  ): Promise<void> => {
    const bridge = machinesBridge();
    const key = targetKey(target);
    if (bridge === null || typeof bridge.readHistory !== 'function') return;
    if (inflight.has(key)) return;
    inflight.add(key);
    const had = (get().byTarget[key]?.readAt ?? 0) > 0;
    patch(key, {
      machineId: target.machineId,
      path: target.path,
      limit,
      loading: !had,
      refreshing: had
    });
    try {
      const answer: MachineHistoryResult = await bridge.readHistory({
        machineId: target.machineId,
        cwd: target.path,
        maxCount: limit
      });
      if (
        had &&
        (answer.mode === 'notConnected' || answer.mode === 'unreachable')
      ) {
        // PHASE 230. THE STALE SENTENCE BECOMES NOTHING. A re-read the link
        // refused leaves the last good answer on screen, the way a local
        // History keeps its rows when git is slow, and marks the entry so the
        // shared hook reads again when the machine starts answering.
        patch(key, {
          machineLabel: answer.machineLabel,
          loading: false,
          refreshing: false,
          refused: true
        });
        return;
      }
      patch(key, {
        machineLabel: answer.machineLabel,
        mode: answer.mode,
        // THE WHOLE LIST IS REPLACED AND NEVER ADDED TO. The far side resolved
        // its own refs again for this page, so a row from the last page and a
        // row from this one are not answers to the same question.
        entries: answer.entries,
        maxCount: answer.maxCount,
        ceiling: answer.ceiling,
        hasMore: answer.hasMore,
        atCeiling: answer.atCeiling,
        headSha: answer.headSha,
        upstreamSha: answer.upstreamSha,
        mergeBase: answer.mergeBase,
        markedCount: answer.markedCount,
        divergenceTruncated: answer.divergenceTruncated,
        answerBytes: answer.answerBytes,
        // Main clamps, so the window this end remembers is the window that was
        // actually read. Without this a person who pressed Load more past the
        // ceiling would press it again and see nothing change.
        limit: answer.maxCount,
        loading: false,
        refreshing: false,
        readAt: answer.readAt,
        elapsedMs: answer.elapsedMs,
        refused: false
      });
    } catch {
      if (had) {
        // PHASE 230. As above: the last good answer stays, marked refused.
        patch(key, { loading: false, refreshing: false, refused: true });
        return;
      }
      // The channel itself failed, which is a different fact from the machine
      // not answering, and there is no third sentence for it. `unreachable` is
      // the mode whose sentence says the history could not be read, which is
      // what happened, and `machineAnsweredHistory` keeps the read time off the
      // screen for it. With no earlier answer there is nothing to keep.
      patch(key, {
        mode: 'unreachable',
        entries: [],
        hasMore: false,
        atCeiling: false,
        headSha: null,
        upstreamSha: null,
        mergeBase: null,
        markedCount: 0,
        divergenceTruncated: false,
        answerBytes: 0,
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
    details: {},

    ensure(target) {
      const entry = get().byTarget[targetKey(target)];
      if (entry !== undefined && (entry.mode !== null || entry.loading)) return;
      void read(target, entry?.limit ?? REMOTE_HISTORY_PAGE);
    },

    async refresh(target) {
      const entry = get().byTarget[targetKey(target)];
      await read(target, entry?.limit ?? REMOTE_HISTORY_PAGE);
    },

    async loadMore(target) {
      const entry = get().byTarget[targetKey(target)];
      await read(target, nextLimit(entry?.limit ?? REMOTE_HISTORY_PAGE));
    },

    forget(target) {
      const key = targetKey(target);
      set((s) => {
        // PHASE 233. The two maps are dropped INDEPENDENTLY. Until this phase
        // there was one and the early return asked about it; a target whose
        // walk was never held but whose rows had been expanded would have kept
        // its commits' files for the life of the window, which is a leak with
        // a path a person walks (open the group, expand a row, close the tab
        // before the walk ever answered).
        const prefix = `${key}\0`;
        const details = { ...s.details };
        let dropped = 0;
        for (const held of Object.keys(details)) {
          if (held.startsWith(prefix)) {
            delete details[held];
            dropped += 1;
          }
        }
        const hadEntry = s.byTarget[key] !== undefined;
        if (!hadEntry && dropped === 0) return s;
        const next = { ...s.byTarget };
        delete next[key];
        return { byTarget: next, details };
      });
    },

    detail(target, sha) {
      const key = remoteDetailKey(target, sha);
      const cached = get().details[key];
      if (cached !== undefined) return Promise.resolve(cached);
      const inflight = inflightDetails.get(key);
      if (inflight !== undefined) return inflight;
      const bridge = machinesBridge();
      if (bridge === null || typeof bridge.readCommitFiles !== 'function') {
        return Promise.resolve(null);
      }
      const toast = useApp.getState().toast;
      // The label main sent with the last history answer, or the id until it
      // has. A sentence about a machine names the machine.
      const labelOf = (answered: string): string =>
        answered !== ''
          ? answered
          : get().byTarget[targetKey(target)]?.machineLabel || target.machineId;
      const run = bridge
        .readCommitFiles({ machineId: target.machineId, cwd: target.path, sha })
        .then((answer: MachineCommitFilesResult): RemoteCommitDetail | null => {
          if (answer.mode === 'ok') {
            const held: RemoteCommitDetail = { files: answer.files };
            set((s) => ({ details: { ...s.details, [key]: held } }));
            return held;
          }
          toast(
            'error',
            answer.mode === 'notConnected'
              ? historyNotConnected(labelOf(answer.machineLabel))
              : historyFilesNoAnswer(labelOf(answer.machineLabel))
          );
          return null;
        })
        .catch(() => {
          toast('error', historyFilesNoAnswer(labelOf('')));
          return null;
        })
        .finally(() => inflightDetails.delete(key));
      inflightDetails.set(key, run);
      return run;
    }
  };
});
