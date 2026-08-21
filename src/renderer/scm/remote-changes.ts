/**
 * What has changed in a folder on another machine (Phase 90.3).
 *
 * WHY THIS IS A SECOND STORE AND NOT A BRANCH INSIDE `useGit`. `useGit` holds
 * git status read on THIS Mac, keyed by an absolute path on this Mac, and its
 * four verbs are stage, unstage, discard and commit. Two of those four exist
 * here since Phase 103 and two of them do not, so a store that held both kinds
 * would have to refuse half its verbs on half its rows. Research 55 section
 * 14.3 counted the surfaces and put Source Control's Changes group in the five
 * that cross. Two stores is what that split looks like in code.
 *
 * TWO GROUPS SINCE PHASE 97. An entry records the tracked files and the
 * untracked files separately, with a count of its own for each, because the
 * answer caps each group on its own and a view that draws one number for two
 * groups cannot say which one it cut. An ignored file is in neither group and
 * this store never sees one.
 *
 * PHASE 103 GAVE IT TWO VERBS AND THE HEADER USED TO SAY IT HAD NONE. They are
 * `stage` and `unstage`. Each asks main to change which files are staged for
 * the next commit in one repository on one machine, and neither of them can
 * change a file's contents on either computer. There is still no discard, no
 * commit, no checkout and no verb that can lose work over there.
 *
 * WHAT A VERB SENDS AND WHAT IT DOES NOT. It sends the machine, the tab's
 * folder ON THAT MACHINE and a list of repository relative paths, and nothing
 * else. It does not send the repository root, because main runs its own read
 * over there and takes the root from that machine's own answer. A folder
 * chosen in this renderer therefore cannot decide which repository git runs
 * in.
 *
 * IT RE-READS AFTER EVERY VERB. Nothing over there tells Tortie that the index
 * moved. There is no watcher on that machine and this store has no timer, so
 * the only honest thing to draw after a write is a fresh read. The re-read
 * runs after every call, including the ones main refused before sending
 * anything, because a refusal costs one read and a stale list costs a person a
 * wrong commit.
 *
 * THE SENTENCE IS NEVER COMPOSED HERE. A verb records three things, being which
 * verb ran, which word main answered, and the sentence main refused with when
 * it refused. The view turns the first two into a sentence out of
 * src/renderer/app/machine-copy.ts, and it draws the third as main sent it.
 * That is the same rule `failed` and `note` already follow, and it keeps every
 * word a person reads about a machine in a file the vocabulary audit reads.
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
  InstalledGmuxApi,
  MachineIndexWriteOutcome,
  MachineReviewFile,
  MachineReviewList
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';
import { errorPayload } from '../state/errors';

/** The machines bridge, or null on a build without one. */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/** True when this build can read what changed on another machine at all. */
export function remoteChangesAvailable(): boolean {
  return typeof machinesBridge()?.reviewFiles === 'function';
}

/**
 * True when this build can change which files are staged on another machine.
 *
 * It is a second question from {@link remoteChangesAvailable} and not the same
 * one. A build can read a folder on a machine and still carry no verb, which
 * is every build before Phase 103, so the view asks both and draws the rows
 * either way.
 */
export function remoteIndexWriteAvailable(): boolean {
  const bridge = machinesBridge();
  return (
    typeof bridge?.stage === 'function' && typeof bridge?.unstage === 'function'
  );
}

/** Which verb ran, for the sentence the view composes afterwards. */
export type RemoteIndexVerb = 'stage' | 'unstage';

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
  /** PHASE 97. Every file in it git is not yet tracking. Never an ignored file. */
  untracked: readonly MachineReviewFile[];
  /** PHASE 97. How many there were, when only the first ones are listed. */
  untrackedTotal: number;
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
  /** PHASE 103. True while a stage or an unstage is in flight for this folder. */
  writing: boolean;
  /** PHASE 103. The verb of the last write, or null when none has run. */
  writeVerb: RemoteIndexVerb | null;
  /**
   * PHASE 103. The word main answered for the last write, or null.
   *
   * It is a word and never a sentence. The view turns it into one, because
   * every sentence a person reads about a machine is composed in
   * src/renderer/app/machine-copy.ts and this store composes none.
   */
  writeOutcome: MachineIndexWriteOutcome | null;
  /**
   * PHASE 103 FIX ROUND. The sentence MAIN refused the last write with, or null.
   *
   * IT IS MAIN'S OWN SENTENCE AND THE RENDERER COMPOSES NONE OF IT. Three of
   * this phase's refusals are decided in `src/main/machines/remote-stage.ts`
   * and thrown, being a name holding a line break, one path longer than a
   * command may be, and a path that machine's git no longer reports as changed.
   * Each throw carries the sentence from `src/main/machines/remote-copy.ts`,
   * where every word a person reads about a machine already lives, and
   * `build/assert-bundle-refusals.mjs` pins all three in the shipped bundle.
   *
   * WITHOUT THIS FIELD ALL THREE READ AS `unsure`, which draws the sentence
   * saying Tortie asked that machine and it did not say it had. That sentence
   * is false for all three, because nothing was sent. A rejection carrying no
   * structured payload is still the word `unsure`, because that is a link that
   * failed rather than a refusal Tortie decided.
   */
  writeRefusal: string | null;
}

const EMPTY: RemoteChangesEntry = {
  machineId: '',
  path: '',
  repoPath: '',
  files: [],
  total: 0,
  untracked: [],
  untrackedTotal: 0,
  note: null,
  notRepo: false,
  loading: false,
  refreshing: false,
  failed: false,
  readAt: 0,
  writing: false,
  writeVerb: null,
  writeOutcome: null,
  writeRefusal: null
};

/**
 * How many rows the Changes list draws for one entry.
 *
 * PHASE 97 FIX ROUND. Every surface that states a number for one folder on one
 * machine calls this, so no two of them can ever state different numbers. The
 * defect it closes was on screen for one round: the activity rail's badge read
 * `files.length` while the section header three inches away read both groups,
 * so a folder with two changed files and three new ones drew a badge of 2 over
 * a list of 5. The local rail never had that split, because
 * `parsePorcelainV2Status` puts an untracked entry in the same `files` array
 * that `dirtyCount` measures.
 *
 * It counts what is DRAWN, not what that machine holds. When the answer was
 * capped, `total` and `untrackedTotal` are larger and main's own sentence says
 * so under the list.
 */
export function remoteChangesCount(entry: RemoteChangesEntry): number {
  return entry.files.length + entry.untracked.length;
}

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
  /**
   * PHASE 103. Put these paths in the index of that repository on that machine.
   *
   * The paths are repository relative and they are the ones the last read
   * reported. Main reads that folder again before it composes anything and
   * refuses every path its own read did not name, so a path made up here
   * reaches no git.
   */
  stage(target: WorkspaceTarget, paths: readonly string[]): Promise<void>;
  /** PHASE 103. Take these paths back out of that index. */
  unstage(target: WorkspaceTarget, paths: readonly string[]): Promise<void>;
  /** Drop one target's rows, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
}

export const useRemoteChanges = create<RemoteChangesState>((set, get) => {
  /** One read per target at a time. Not in state: no render on this churn. */
  const inflight = new Set<string>();
  /** PHASE 103. One write per target at a time, for the same reason. */
  const writing = new Set<string>();

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
        untracked: list.untracked,
        untrackedTotal: list.untrackedTotal,
        // A capped list is the only case whose sentence comes from main. The
        // other two answers main puts in this field, being "nothing changed"
        // and "not a repository", are states this store records as states, so
        // the view draws its own sentence for each and no prose is duplicated.
        //
        // PHASE 97 WIDENED THE TEST TO BOTH GROUPS. It used to read
        // `list.files.length > 0`, which dropped main's capped sentence for an
        // answer whose only rows are untracked ones.
        note:
          list.files.length + list.untracked.length > 0 ? list.note : null,
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

  /**
   * PHASE 103. One stage or one unstage, then a fresh read of that folder.
   *
   * ONE FUNCTION FOR BOTH VERBS. They differ by which bridge member is called
   * and by the word recorded for the sentence, and nothing else.
   *
   * IT THROWS NOTHING. A call that does not come back is the word `unsure`,
   * which never means nothing changed over there. Phase 101 measured a killed
   * connection finishing the far side write with only the answer lost, so the
   * honest shape is a state the panel can draw beside fresh rows rather than an
   * error that replaces them.
   *
   * THE RE-READ IS UNCONDITIONAL. Every path out of this function ends in one
   * read of that folder, including the ones main refused before sending
   * anything. A refusal costs one read and a stale list costs a person a wrong
   * commit.
   */
  const write = async (
    verb: RemoteIndexVerb,
    target: WorkspaceTarget,
    paths: readonly string[]
  ): Promise<void> => {
    const bridge = machinesBridge();
    const key = targetKey(target);
    const send = verb === 'stage' ? bridge?.stage : bridge?.unstage;
    if (typeof send !== 'function') return;
    // One write per folder at a time. A second press while the first is in
    // flight would compose its list from rows the first one is about to move.
    if (writing.has(key)) return;
    writing.add(key);
    patch(key, {
      machineId: target.machineId,
      path: target.path,
      writing: true,
      writeVerb: verb,
      writeOutcome: null,
      writeRefusal: null
    });
    let outcome: MachineIndexWriteOutcome = 'unsure';
    let refusal: string | null = null;
    try {
      const result = await send({
        machineId: target.machineId,
        cwd: target.path,
        paths: [...paths]
      });
      outcome = result.outcome;
    } catch (err) {
      // A rejection that carries a structured payload is a refusal MAIN
      // decided, and its sentence is the honest thing to draw. A rejection
      // that carries none is a link that failed, and the word for that is
      // `unsure`, which never means nothing changed. See the header.
      outcome = 'unsure';
      refusal = errorPayload(err)?.message ?? null;
    } finally {
      writing.delete(key);
    }
    patch(key, {
      writing: false,
      writeVerb: verb,
      writeOutcome: outcome,
      writeRefusal: refusal
    });
    await read(target);
  };

  return {
    byTarget: {},

    ensure(target) {
      const entry = get().byTarget[targetKey(target)];
      if (entry !== undefined && (entry.readAt > 0 || entry.loading)) return;
      void read(target);
    },

    async refresh(target) {
      // PHASE 103. Refresh clears what the last write left, because the two
      // sentences that ask for a Refresh would otherwise still be on screen
      // after the person pressed it. The re-read inside a verb does NOT clear
      // it, so the sentence stays beside the rows that write produced.
      patch(targetKey(target), {
        writeVerb: null,
        writeOutcome: null,
        writeRefusal: null
      });
      await read(target);
    },

    async stage(target, paths) {
      await write('stage', target, paths);
    },

    async unstage(target, paths) {
      await write('unstage', target, paths);
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
