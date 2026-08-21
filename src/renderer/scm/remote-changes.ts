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
 * PHASE 103 GAVE IT TWO VERBS AND PHASE 104 GAVE IT A THIRD. They are `stage`,
 * `unstage` and `commit`. The first two ask main to change which files are
 * staged for the next commit in one repository on one machine. The third asks
 * that machine's own git to make that commit, with that person's own hooks and
 * their own signing configuration running over there. None of the three can
 * change a file's contents on either computer. There is still no discard, no
 * checkout, no amend, no reset, no push and no verb that can lose work over
 * there.
 *
 * WHAT A VERB SENDS AND WHAT IT DOES NOT. It sends the machine, the tab's
 * folder ON THAT MACHINE and a list of repository relative paths, and nothing
 * else. It does not send the repository root, because main runs its own read
 * over there and takes the root from that machine's own answer. A folder
 * chosen in this renderer therefore cannot decide which repository git runs
 * in. `commit` sends two more things and no root either, being the sha the
 * panel drew and the text a person typed. Main re-reads that folder before it
 * composes anything and refuses when the sha it reads back is not the one this
 * renderer sent, so a stale panel cannot commit against a repository that has
 * moved on.
 *
 * PHASE 104 ADDED THE ONE PIECE OF DRAFT TEXT THIS STORE HOLDS. The commit
 * message lives in `messages`, keyed by `targetKey`, exactly as `useGit`
 * keys the local box's message by its repository path. IT IS HELD IN MEMORY
 * AND IT IS NOT PERSISTED. The local box's message is not persisted either,
 * so persisting this one would be a behaviour the local box does not have,
 * and it would add a `gmux.*` contract line for a draft nobody asked to keep.
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
  MachineCommitOutcome,
  MachineIndexWriteOutcome,
  MachineReviewFile,
  MachineReviewList
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { targetKey } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';
import { errorPayload } from '../state/errors';
import { groupRemoteFiles } from './groups';

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

/**
 * True when this build can commit in a folder on another machine (Phase 104).
 *
 * It is a THIRD question and not the same one as either above. A build can read
 * a folder and carry the two index verbs and still carry no commit, which is
 * every build before this phase, so the view asks all three and draws the rows
 * either way.
 */
export function remoteCommitAvailable(): boolean {
  return typeof machinesBridge()?.commit === 'function';
}

/** Which verb ran, for the sentence the view composes afterwards. */
export type RemoteIndexVerb = 'stage' | 'unstage';

/**
 * What the Check what happened read found, after a commit whose answer was lost
 * (Phase 104).
 *
 * It is a word and never a sentence, for the reason every other word in this
 * store is one. The three sentences are in src/renderer/app/machine-copy.ts.
 *
 *  - `ran`: that machine's HEAD is not the sha the commit was sent with, so the
 *    commit ran.
 *  - `didNot`: HEAD is still that sha, so it did not.
 *  - `noAnswer`: the read did not land either, so the question is still open.
 */
export type RemoteCommitCheck = 'ran' | 'didNot' | 'noAnswer';

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
  /**
   * PHASE 104. The sha that machine's HEAD held at the last good read.
   *
   * IT IS READ FROM THAT MACHINE AND IT IS NEVER COMPOSED HERE. Main carries
   * `# branch.oid` out of that machine's own porcelain into
   * `MachineReviewList.headSha`, and this field is a copy of it. It is empty
   * for a repository with no commit yet, which is a state and not a special
   * case, and it is empty for a folder that is not a repository.
   *
   * WHAT IT IS FOR. It is the guard the commit is sent with, and it is what
   * the Check what happened read compares against. It is NOT the sha the far
   * side compares: main runs its own read immediately before it composes, and
   * it refuses when the sha it reads back is not this one.
   */
  headSha: string;
  /** PHASE 104. True while a commit for this folder is in flight. */
  committing: boolean;
  /**
   * PHASE 104. The word main answered for the last commit, or null.
   *
   * There are eight of them and none of them claims more than Tortie knows.
   * `refused` covers every answer main decided on this Mac before sending, and
   * it always arrives with `sent` equal to 0.
   */
  commitOutcome: MachineCommitOutcome | null;
  /**
   * PHASE 104. The sentences MAIN composed for the last commit.
   *
   * THE RENDERER COMPOSES NONE OF THEM AND DRAWS THEM AS MAIN SENT THEM. Main
   * knows which of the ten answers it decided and it decides several of them
   * without contacting that machine, so a word alone would not tell this view
   * which sentence to draw. `RemoteCloneResult` is the shipped precedent for
   * main composing them.
   */
  commitSentences: readonly string[];
  /**
   * PHASE 104. What git or a hook printed on that machine, decoded and capped
   * at 8,192 bytes over there, or null.
   *
   * It is that machine's own prose and it is drawn UNDER Tortie's own sentence
   * rather than instead of it. A hook that refuses a commit says why in its
   * own words, and no sentence Tortie could compose would say it better.
   */
  commitMachineSaid: string | null;
  /** PHASE 104. The sha the last commit was sent as its guard. Empty for none. */
  commitGuardSha: string;
  /** PHASE 104. True while the Check what happened read is in flight. */
  checking: boolean;
  /** PHASE 104. What that read found, or null when none has run. */
  checkOutcome: RemoteCommitCheck | null;
  /** PHASE 104. The sha that read found. Empty when it found none. */
  checkHeadSha: string;
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
  writeRefusal: null,
  headSha: '',
  committing: false,
  commitOutcome: null,
  commitSentences: [],
  commitMachineSaid: null,
  commitGuardSha: '',
  checking: false,
  checkOutcome: null,
  checkHeadSha: ''
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
  /**
   * PHASE 104. The commit message a person is typing, keyed the same way.
   *
   * IT IS HELD IN MEMORY AND IT IS NOT PERSISTED, for the reason in the header.
   * It is a separate map rather than a field on the entry because a message
   * outlives the read that produced the rows beside it, and a fresh read
   * rewrites the whole entry.
   */
  messages: Record<string, string>;
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
  /** PHASE 104. Hold what a person is typing into the commit box. */
  setMessage(target: WorkspaceTarget, message: string): void;
  /**
   * PHASE 104. Commit what is staged in that repository ON THAT MACHINE.
   *
   * It sends the machine, the tab's folder over there, the sha the panel drew,
   * the staged paths the panel drew and the text a person typed. It sends no
   * repository root, for the reason in the header.
   *
   * IT THROWS NOTHING. Every answer main decided arrives as a word and a set of
   * sentences main composed. A call that rejects is the word `unsure`, which
   * never means nothing was committed over there.
   */
  commit(target: WorkspaceTarget): Promise<void>;
  /**
   * PHASE 104. Read that folder again and say whether the commit ran.
   *
   * IT IS ONE EXISTING READ AND IT ADDS NO DOOR. It runs the same `review-list`
   * the panel already runs and compares the sha that comes back against the
   * guard sha the commit was sent with. That is the one question a person has
   * after an answer was lost, and one read answers it.
   */
  checkCommit(target: WorkspaceTarget): Promise<void>;
  /** Drop one target's rows, e.g. when its tab is closed. */
  forget(target: WorkspaceTarget): void;
}

export const useRemoteChanges = create<RemoteChangesState>((set, get) => {
  /** One read per target at a time. Not in state: no render on this churn. */
  const inflight = new Set<string>();
  /** PHASE 103. One write per target at a time, for the same reason. */
  const writing = new Set<string>();
  /**
   * PHASE 104. One commit per target at a time, for a sharper reason.
   *
   * A second press while the first is in flight would send a second command
   * carrying the SAME guard sha. The far side would refuse it, because the
   * first commit moved HEAD, so no second commit could be made. The lock stops
   * the second command from crossing at all rather than relying on the guard to
   * catch it after it has.
   */
  const committing = new Set<string>();

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
        // PHASE 104. The sha that machine's own porcelain reported for HEAD.
        // It is empty for a repository with no commit yet and empty for a
        // folder that is not a repository, and both are states rather than
        // special cases.
        headSha: list.headSha,
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

  /**
   * PHASE 104. One commit in one folder on one machine, then a fresh read.
   *
   * THE ORDER OF WHAT IT SENDS IS THE DESIGN. The sha and the staged list are
   * both read out of the entry the panel is drawing right now, so what crosses
   * is what the person was looking at. Main re-reads that folder before it
   * composes anything and refuses when either has moved, so a stale panel
   * cannot commit content nobody read.
   *
   * IT THROWS NOTHING, which is `write`'s own rule and it is here for the same
   * measurement. Phase 101 measured a killed connection finishing the far side
   * write with only the answer lost, so a lost answer is a state this panel can
   * draw beside fresh rows rather than an error that replaces them.
   *
   * THE RE-READ IS UNCONDITIONAL. Every path out of this function ends in one
   * read of that folder, including the ones main refused before sending
   * anything. That read is what puts the new sha and the new rows on screen
   * after a commit that landed.
   *
   * THE MESSAGE IS CLEARED ONLY ON `committed`. That is the local box's own
   * rule at `useGit.commit`, which clears on success and keeps the text on
   * every failure so a person does not have to type it again.
   */
  const commitOne = async (target: WorkspaceTarget): Promise<void> => {
    const bridge = machinesBridge();
    const key = targetKey(target);
    if (typeof bridge?.commit !== 'function') return;
    if (committing.has(key)) return;
    const entry = get().byTarget[key] ?? EMPTY;
    const message = get().messages[key] ?? '';
    if (message.trim().length === 0) return;
    // The staged set the PANEL DREW, taken from the same pure function the
    // Staged group is drawn with, so the list that crosses cannot differ from
    // the list on screen. `groupRemoteFiles` sorts by path and drops every
    // conflicted row, and main's own predicate does the same, which is what
    // makes the two comparable at all.
    const staged = groupRemoteFiles(entry.files).staged.map((f) => f.path);
    committing.add(key);
    patch(key, {
      machineId: target.machineId,
      path: target.path,
      committing: true,
      commitOutcome: null,
      commitSentences: [],
      commitMachineSaid: null,
      commitGuardSha: entry.headSha,
      checkOutcome: null,
      checkHeadSha: ''
    });
    let outcome: MachineCommitOutcome = 'unsure';
    let sentences: readonly string[] = [];
    let machineSaid: string | null = null;
    try {
      const result = await bridge.commit({
        machineId: target.machineId,
        cwd: target.path,
        headSha: entry.headSha,
        staged,
        message
      });
      outcome = result.outcome;
      sentences = result.sentences;
      machineSaid = result.machineSaid;
    } catch (err) {
      // A rejection that carries a structured payload is a refusal MAIN
      // decided, and its sentence is the honest thing to draw. A rejection
      // that carries none is a link that failed before main answered, and the
      // view draws its own sentence for that, because there is none to draw.
      outcome = 'unsure';
      const said = errorPayload(err)?.message ?? null;
      sentences = said === null ? [] : [said];
    } finally {
      committing.delete(key);
    }
    if (outcome === 'committed') {
      set((now) => ({ messages: { ...now.messages, [key]: '' } }));
    }
    patch(key, {
      committing: false,
      commitOutcome: outcome,
      commitSentences: sentences,
      commitMachineSaid: machineSaid
    });
    await read(target);
  };

  return {
    byTarget: {},
    messages: {},

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
        writeRefusal: null,
        // PHASE 104. The commit's own sentences go with them, and for the same
        // reason. Three of them end by asking for a Refresh or for a Check, and
        // leaving them up after the person did that would put a stale
        // instruction over fresh rows. The message a person typed is NOT
        // cleared here, because Refresh is not a decision about their draft.
        commitOutcome: null,
        commitSentences: [],
        commitMachineSaid: null,
        commitGuardSha: '',
        checkOutcome: null,
        checkHeadSha: ''
      });
      await read(target);
    },

    async stage(target, paths) {
      await write('stage', target, paths);
    },

    async unstage(target, paths) {
      await write('unstage', target, paths);
    },

    setMessage(target, message) {
      const key = targetKey(target);
      set((now) => ({ messages: { ...now.messages, [key]: message } }));
    },

    async commit(target) {
      await commitOne(target);
    },

    async checkCommit(target) {
      // The guard is read BEFORE the read runs, because the read overwrites
      // `headSha` and the comparison needs what the commit was sent with.
      const key = targetKey(target);
      const was = get().byTarget[key]?.commitGuardSha ?? '';
      patch(key, { checking: true, checkOutcome: null, checkHeadSha: '' });
      await read(target);
      const after = get().byTarget[key] ?? EMPTY;
      // A read that did not land leaves the question open, and the word says
      // so rather than guessing from a sha nobody read.
      const found: RemoteCommitCheck = after.failed
        ? 'noAnswer'
        : after.headSha !== was
          ? 'ran'
          : 'didNot';
      patch(key, {
        checking: false,
        checkOutcome: found,
        checkHeadSha: after.headSha
      });
    },

    forget(target) {
      const key = targetKey(target);
      set((s) => {
        if (s.byTarget[key] === undefined && s.messages[key] === undefined) {
          return s;
        }
        const next = { ...s.byTarget };
        delete next[key];
        // PHASE 104. The draft goes with the rows. A tab that was closed and
        // opened again is a fresh read, and a message from before it closed
        // would be text a person did not put there this time.
        const drafts = { ...s.messages };
        delete drafts[key];
        return { byTarget: next, messages: drafts };
      });
    }
  };
});
