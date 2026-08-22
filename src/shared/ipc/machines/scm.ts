/**
 * Git on a machine (Phase 125, from Phases 73, 103, 104, 105, 106 and 107).
 *
 * Twenty two members and eight invoke channels. Three of the eight WRITE on
 * another computer, being `stage`, `unstage` and `commit`, and they are the
 * only three commands Tortie sends that change a git repository over there.
 * None of the eight names a git verb: the verb is inside Tortie's own script
 * text in src/main/machines/remote-scripts.ts, so no caller can turn a stage
 * into a checkout or a commit into a reset.
 *
 * THE ROWS ARE THE LOCAL ROWS. A review file, a commit and a run read from
 * another machine are the same shapes the local SCM, History and Runs surfaces
 * already draw, so one set of renderer code draws both. Two declarations of one
 * shape is how the two ends of a channel drift apart.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

// PHASE 73 BLOCK C. The review's per file letter is the one the diff
// surfaces already speak, so a file on another machine and a file in a
// commit carry the same vocabulary.
import type { GitCommitFileState } from '../../types';
// PHASE 103. The porcelain's two characters, carried through so the remote
// list can tell a staged file from an unstaged one. `letterOf` in
// `src/main/machines/remote-review.ts` folds the pair into one letter for the
// badge, and until this phase that fold was the only thing that reached the
// renderer, so the panel could not draw a Staged group at all.
import type { GitFileState } from '../../types';
// PHASE 107. A commit read from another machine is the row the local History
// already draws, so the swimlane picture is laid out by one set of code for
// both. Two declarations of one shape is how the two ends of a channel drift
// apart.
import type { GitGraphLogEntry } from '../../types';
// PHASE 105. The runs for a branch checked out on another machine are the rows
// the local Runs section already draws, for the same reason. `src/shared/ipc/
// actions.ts` imports these three from the same place.
import type {
  ActionsHealth,
  ActionsParseIssue,
  ActionsRun
} from '../../actions';

// ---- PHASE 73 BLOCK C ----
// The read only review of a folder on one machine (Phase 73, M6, item 4).
//
// WHAT THESE SHAPES ARE FOR. A person with a session on another machine can
// read what changed in that session's folder without leaving Tortie. The two
// answers below fill the diff tab the editor has drawn since Phase 12, through
// the same two fields a commit tab fills. No new surface is drawn for them,
// which was the condition research 51 section 6 put on this item.
//
// WHAT NEITHER OF THEM DOES. Neither writes a byte on either computer. Neither
// reads a working tree on this Mac. Neither can be reached while Tortie is not
// connected to the machine. The git subcommand is inside Tortie's own script
// text on the far side and is never a value either of these carries, so no
// caller can turn a review into a commit.

/** Which folder on which machine a review is about. */
export interface MachineReviewInput {
  machineId: string;
  /** The folder ON THAT MACHINE. It is never a path on this Mac. */
  cwd: string;
}

/** One changed file in a review. */
export interface MachineReviewFile {
  /** Repository relative path, being the NEW path for a rename. */
  path: string;
  /** The pre-rename path, or null for the ordinary case. */
  origPath: string | null;
  /** The letter git printed, reused as the existing GitCommitFileState. */
  status: GitCommitFileState;
  /**
   * PHASE 103. The FIRST character of the porcelain pair, being what the index
   * holds. It is what the next commit over there would carry.
   *
   * `status` above is unchanged and still feeds the badge. This field and the
   * one below are what let the panel put a file in a Staged group, which it
   * could not do before this phase because `letterOf` folded the pair into one
   * letter and threw the first character away. An untracked row carries `?`
   * here and `?` below, which is what `parsePorcelainV2Status` reports for it.
   */
  indexState: GitFileState;
  /**
   * PHASE 103. The SECOND character of the porcelain pair, being what the
   * folder on disk holds.
   */
  worktreeState: GitFileState;
}

/** What one repository on one machine has changed since its last commit. */
export interface MachineReviewList {
  machineId: string;
  /** The machine's own label, so a surface never composes one. */
  machineLabel: string;
  /** The repository root THAT MACHINE reported. Empty when there is none. */
  repoPath: string;
  /**
   * PHASE 104. The commit `HEAD` pointed at in that folder when this read ran.
   *
   * It is the `# branch.oid` header of the same porcelain the file rows come
   * from, so it costs no extra read and no extra process on that machine. It
   * was parsed and thrown away until this phase.
   *
   * It is the empty string in two cases, being a folder that is not a
   * repository and a repository with no commit yet. `parseHeader` in
   * `src/main/git/parse.ts` writes the oid only when the header is not
   * `(initial)`, so an unborn branch arrives empty and never as the literal
   * `(initial)`.
   *
   * IT EXISTS SO A COMMIT ON ANOTHER MACHINE CAN BE GUARDED. Main reads it,
   * sends it to that machine, and that machine refuses to commit when its own
   * `HEAD` has moved since. The renderer sends back the sha it drew and main
   * refuses when the two disagree, so the guard is never the renderer's value.
   */
  headSha: string;
  files: MachineReviewFile[];
  /** How many changed files there were, when only the first ones are listed. */
  total: number;
  /** PHASE 97. Files in that folder git is not yet tracking. Never an ignored file. */
  untracked: MachineReviewFile[];
  /** PHASE 97. How many untracked files there were, when only the first ones are listed. */
  untrackedTotal: number;
  /** One sentence when there is nothing to show. Null when there is. */
  note: string | null;
}

/** Which file on which machine both sides are wanted for. */
export interface MachineReviewFileInput {
  machineId: string;
  /** The repository root, as `machines:reviewFiles` reported it. */
  repoPath: string;
  /** Repository relative path. */
  path: string;
  /** The pre-rename path, or null. A rename is read at both paths. */
  origPath: string | null;
}

/** Both sides of one file on one machine. */
export interface MachineReviewPair {
  /** The HEAD copy. Empty when the file is not in the last commit. */
  oldContents: string;
  /** The working copy. Empty when the file was deleted. */
  newContents: string;
  /** True when either side holds a zero byte in its first 8 KB. */
  binary: boolean;
  /** True when a side was cut at the cap. */
  truncated: boolean;
  /** The sentence for a side that was cut, or null. */
  note: string | null;
  /**
   * PHASE 101. How many bytes the working copy holds, as Tortie read it.
   *
   * It is computed in main from bytes it already had, so no script text moved
   * and the far side answers nothing new. It exists so the refusal to open a
   * remote file that is too large to save can name the file's real size.
   *
   * TWO CASES, AND THEY ARE NOT THE SAME MEASUREMENT. With `truncated` false
   * this is the file's size. With `truncated` true the read was cut at the
   * review cap, so this equals that cap and it is a floor rather than a size.
   * A surface must not print it as the size in that case.
   *
   * IT IS REQUIRED RATHER THAN APPENDED, which is a deliberate departure from
   * the rule the other appended fields in this contract follow. This one is
   * read by a refusal that names a number on screen, and a field that could be
   * absent would be read as 0 there, which would put a false size in front of a
   * person. There are exactly two places that build this shape and both are in
   * `src/main/machines/remote-review.ts`.
   */
  bytes: number;
}
// ---- END PHASE 73 BLOCK C ----

// ---- PHASE 103 BLOCK ----
// Staging and unstaging in one repository on another machine.
//
// WHAT THIS IS FOR. A person looking at the Source Control panel for a folder
// on another machine can choose what goes into the next commit over there.
// Until this phase no command Tortie sent could change a git repository on
// another computer. After it, two can.
//
// WHAT THESE TWO CANNOT DO. Neither commits. Neither discards a change, and
// condition 83 of `build/conformance-machines.mjs` makes that refusal
// executable over the whole script catalogue rather than merely absent.
// Neither marks a conflict resolved, so a conflicted row offers no verb at
// all. Neither stages part of a file, because the local list cannot either.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO REPOSITORY ROOT CROSSES EITHER CHANNEL. The input carries the tab's
// folder and main runs its own review read on it, so the root that reaches
// that machine's git is the one that machine's own `rev-parse` answered.

/** Which paths in which folder on which machine, for stage and for unstage. */
export interface MachineIndexWriteInput {
  machineId: string;
  /** The tab's folder ON THAT MACHINE. Main runs its own review read on it. */
  cwd: string;
  /** Repository relative paths, as `machines:reviewFiles` reported them. */
  paths: string[];
}

/**
 * What happened to one stage or one unstage. Seven words, and none of them
 * claims more than Tortie knows.
 *
 *  - `done`: every command crossed and that machine's git exited 0 for each.
 *  - `partial`: at least one command's git exited non zero. Tortie cannot say
 *    which files landed, because git reports one status for a whole list.
 *  - `unsure`: the machine did not answer, or answered something Tortie could
 *    not read. This never means nothing changed.
 *  - `writesOff`, `outsideRoot`, `notRepo`, `nothingToDo`: decided on this Mac
 *    before anything was composed, so each of them means nothing was sent.
 */
export type MachineIndexWriteOutcome =
  | 'done'
  | 'partial'
  | 'unsure'
  | 'writesOff'
  | 'outsideRoot'
  | 'notRepo'
  | 'nothingToDo';

/** What one stage or one unstage did, in the shape the surface reads. */
export interface MachineIndexWriteResult {
  readonly outcome: MachineIndexWriteOutcome;
  /** How many paths crossed, after the rename origPath was added. */
  readonly paths: number;
  /** How many commands crossed. 0 for every outcome decided on this Mac. */
  readonly chunks: number;
  /** The repository root THAT MACHINE answered. Empty when there is none. */
  readonly repoPath: string;
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  /**
   * What that machine's git printed on the first command that failed, decoded.
   * Null otherwise. IT IS LOGGED AND NEVER DRAWN, because it is that machine's
   * prose rather than Tortie's, and every sentence a person reads about a
   * machine is composed in src/renderer/app/machine-copy.ts.
   */
  readonly machineSaid: string | null;
  /** The review read main ran before composing, in ms. */
  readonly readMs: number;
  readonly tookMs: number;
}
// ---- END PHASE 103 BLOCK ----

// ---- PHASE 104 BLOCK ----
// Committing what is staged in one repository on another machine.
//
// WHAT THIS IS FOR. A person looking at the Source Control panel for a folder
// on another machine can type a message and commit over there. Until this phase
// Tortie could choose what went into the next commit on that machine and could
// not make it.
//
// WHAT RUNS ON THAT MACHINE. That machine's own git, that person's own
// `pre-commit` and `commit-msg` hooks, and that person's own signing
// configuration. TORTIE ANSWERS NO PASSPHRASE, ANYWHERE. Standard input is
// `/dev/null` over there, so a program that reads a terminal fails at once. A
// signing program with a window of its own opens that window on that machine's
// screen, where Tortie cannot see it and cannot answer it, and the commit box
// says so before a person presses the button.
//
// WHAT THIS CANNOT DO. It cannot amend, it cannot reset, it cannot discard a
// change and it cannot push. None of those verbs is in Tortie's script
// catalogue and condition 83 of `build/conformance-machines.mjs` makes the
// discard refusal executable over the whole catalogue.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO REPOSITORY ROOT CROSSES THIS CHANNEL. The input carries the tab's folder
// and main runs its own review read on it, so the root that reaches that
// machine's git is the one that machine's own `rev-parse` answered.

/** Which folder on which machine, with the sha and the staged set the panel drew. */
export interface MachineCommitInput {
  machineId: string;
  /** The tab's folder ON THAT MACHINE. Main runs its own review read on it. */
  cwd: string;
  /**
   * The sha the panel drew, from the last review answer. Empty for a repository
   * with no commit yet.
   *
   * IT IS NOT THE SHA THAT CROSSES. Main re-reads the folder and sends the sha
   * IT just read. This one is compared against that read and a disagreement
   * commits nothing, which is the rule `machines:cloneProject` already follows
   * for the address a sheet drew.
   */
  headSha: string;
  /**
   * The staged paths the panel drew, repository relative.
   *
   * Main compares them against its own fresh read. HEAD does not move when
   * somebody or an agent runs `git add` in that folder, so a HEAD guard alone
   * would let a person commit content they never read in the Changes list.
   */
  staged: string[];
  /** The person's own text. It is the only thing on this channel they wrote. */
  message: string;
}

/**
 * What happened to one commit. Eight words, and none of them claims more than
 * Tortie knows.
 *
 *  - `committed`: that machine's git exited 0 and named a new commit.
 *  - `moved`: `HEAD` in that folder was not the sha Tortie read, so that
 *    machine committed nothing. A second send of one request lands here.
 *  - `staged-changed`: what is staged over there changed after Tortie read it,
 *    so nothing was committed.
 *  - `failed`: that machine's git exited non zero. What it printed is in
 *    `machineSaid`.
 *  - `timeout`: the deadline was hit on this Mac. The commit may still be
 *    running over there and it may have finished after Tortie stopped
 *    listening.
 *  - `unsure`: the link dropped, or that machine answered something Tortie
 *    could not read. IT NEVER MEANS NOTHING CHANGED. It is a separate word from
 *    `timeout` because a link that dropped after three seconds is not a
 *    deadline, and one sentence for both would say "within 5 minutes" about a
 *    thing that took three.
 *  - `offline`: Tortie is not connected to that machine, so nothing was sent.
 *  - `refused`: main decided on THIS MAC, before anything was composed. It
 *    covers seven states, being no message, writes not confirmed for that
 *    machine, a folder outside the confirmed folder, a folder that is not a
 *    repository, a sha the panel and main disagree on, a conflicted file, and
 *    nothing staged. Each carries its own sentence, so a person still reads
 *    exactly which one. `refused` always comes with `sent` equal to 0.
 */
export type MachineCommitOutcome =
  | 'committed'
  | 'moved'
  | 'staged-changed'
  | 'failed'
  | 'timeout'
  | 'unsure'
  | 'offline'
  | 'refused';

/** What one commit did, in the shape the surface reads. */
export interface MachineCommitResult {
  readonly outcome: MachineCommitOutcome;
  /** The commit that machine made, in full. Empty on every other outcome. */
  readonly sha: string;
  /** What that machine's HEAD holds now, as the answer reported it. Empty when it said none. */
  readonly headSha: string;
  /**
   * What git or a hook printed over there, decoded and capped. Null otherwise.
   *
   * It is that machine's own prose and the panel draws it UNDER Tortie's own
   * sentence, never in place of one. The far side caps it at
   * `REMOTE_COMMIT_ANSWER_MAX_BYTES` with `head -c` before it crosses.
   */
  readonly machineSaid: string | null;
  /**
   * The sentences a surface draws, composed in main.
   *
   * This is `RemoteCloneResult`'s shape rather than `MachineIndexWriteResult`'s.
   * Both ship today. It is this one because a person has to read Tortie's own
   * sentence and that machine's own words together, and only main has both.
   */
  readonly sentences: readonly string[];
  /** How many commands crossed. 0 for every outcome decided on this Mac. */
  readonly sent: number;
  /** The review read main ran before composing, in ms. */
  readonly readMs: number;
  readonly tookMs: number;
}
// ---- END PHASE 104 BLOCK ----

// ---------------------------------------------------------------------------
// The runs for the branch checked out on another machine (Phase 105, research
// 57 section 5)
// ---------------------------------------------------------------------------
//
// TWO READS AND THEY GO TO DIFFERENT PLACES. The first asks the machine which
// branch is checked out in one folder and which repository that folder is. The
// second asks github.com, from this Mac, with the `gh` this Mac already has.
//
// NO CREDENTIAL AND NO `gh` CROSSES. That is the property this whole feature
// rests on. No token, no `gh` invocation and no GitHub host name is sent to the
// machine. Four short strings travel back, being a mode word, the origin
// address, the branch name and the commit HEAD points at. Condition 55d of
// build/conformance-machines.mjs reads the script text and fails on any of the
// nine words a credential would travel in, which is the executable form of the
// sentence rather than a promise about it.
//
// NOTHING IS WRITTEN, on either computer and on GitHub. No new write script, no
// change to the catalogue's two writers, and every gh shape the allowlist
// permits is a read.
//
// NOTHING CALLS IT ON A CLOCK. Main cannot see a push made on another computer,
// so there is no watch and no poll. A person expands the section or presses
// Refresh, and each of those is one read. The panel says the list does not
// refresh.
//
// A RUN'S JOBS AND STEPS ARE NOT HERE. That is a second channel and a second gh
// process per row, and research 57 section 5 priced one channel. A row opens on
// GitHub instead.

/** Why one read of the runs on a remote tab answered the way it did. */
export type MachineRunsMode =
  /** The machine answered and gh was asked. `health` says how that went. */
  | 'ok'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** The repository has no github.com address for its origin. */
  | 'notGitHub'
  /** No branch name could be read, so there is nothing to ask GitHub about. */
  | 'noBranch'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One runs read against one folder on one machine. */
export interface MachineRunsInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /**
   * Rows to ask gh for. Clamped to 1 and to `MAX_LIMIT`, which is 50. Omitted
   * means the local Runs section's own default, which is 10.
   */
  readonly limit?: number;
}

/** What one machine and then GitHub answered about one folder's runs. */
export interface MachineRunsResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineRunsMode;
  /** `owner/repo`, or null when there is no github.com origin over there. */
  readonly ownerRepo: string | null;
  /** The branch checked out over there, or null. */
  readonly branch: string | null;
  /** The commit HEAD points at over there, or null. */
  readonly headSha: string | null;
  /** What gh was actually asked for, after the clamp. */
  readonly limit: number;
  readonly runs: readonly ActionsRun[];
  /** Rows GitHub sent that the parser refused, with the field named. */
  readonly issues: readonly ActionsParseIssue[];
  /** gh's own ladder. The gh that produced it ran on this Mac. */
  readonly health: ActionsHealth;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---- PHASE 106 ----
// Which branch is checked out in one folder on another machine (Phase 106,
// research 57 section 5).
//
// WHAT THIS IS FOR. A project can be a folder on another machine. On that tab
// the Source Control view already draws the changed files and the workflow
// runs. It did not say which branch is checked out over there, so a person had
// to open a session and type. This call answers with the branch, the branch it
// follows, and how far ahead and how far behind it is.
//
// IT IS A SECOND READ RATHER THAN A WIDER `readRuns`. Phase 105's `repo-facts`
// gives the branch name and the commit HEAD points at. It gives neither the
// upstream nor the two counts, which are two of the three things this call must
// show. Widening it would make every Runs read pay for a group nobody opened,
// which is the union script shape research 57 section 5.3 refused.
//
// NOTHING IS WRITTEN, on either computer. The `repo-branch` script is a read,
// the catalogue's two writers did not move, and this call cannot change what is
// checked out over there.
//
// NOTHING CALLS IT ON A CLOCK. A person expands the group or presses Refresh,
// and each of those is one read. Main cannot see a branch switched on another
// computer, so there is no watch and no poll.
//
// TORTIE NEVER FETCHES ON THAT MACHINE. The ahead and behind counts are
// measured against the copy of the upstream that machine last fetched, so the
// answer can be older than what is on the server at the moment it is read. The
// renderer says so on screen, and condition 56i of
// build/conformance-machines.mjs fails the script if it ever names `git fetch`,
// `git pull` or `git remote update`.

/** Why one read of the branch on a remote tab answered the way it did. */
export type MachineBranchMode =
  /** A branch is checked out and its details were read. */
  | 'ok'
  /** A commit is checked out directly, or the repository has no commits. */
  | 'noBranch'
  /** The branch name was read and its details could not be. */
  | 'noDetails'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One branch read against one folder on one machine. */
export interface MachineBranchInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
}

/** What one machine answered about the branch checked out in one folder. */
export interface MachineBranchResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineBranchMode;
  /** The branch checked out over there, or null. */
  readonly branch: string | null;
  /** The full commit its tip points at, or null. */
  readonly sha: string | null;
  /** The same commit as git shortens it, or null. */
  readonly shortSha: string | null;
  /** The branch it follows, e.g. origin/main, or null when none is set. */
  readonly upstream: string | null;
  /** True when that machine no longer has the branch it is set to follow. */
  readonly upstreamGone: boolean;
  /** Commits it holds that the followed branch does not. 0 when unknown. */
  readonly ahead: number;
  /** Commits the followed branch holds that it does not. 0 when unknown. */
  readonly behind: number;
  /**
   * True when a tracking answer arrived and this end could not read it.
   *
   * THE HONESTY FIELD, AND THE RENDERER DRAWS IT. An empty tracking answer
   * means level and reads as 0 and 0, so two zeroes alone cannot tell level
   * apart from unread. The flag is set when the answer that arrived is not
   * empty and is not exactly one of the four shapes git prints, being `gone`,
   * `ahead N`, `behind N` and `ahead N, behind M`. When it is set, `ahead` and
   * `behind` are both 0 whatever fell out of a partial parse, because a number
   * nobody measured is worse than a sentence saying the answer could not be
   * read. Phase 99 carried a flag the renderer never read and a cut list drew
   * as a whole one. This one is drawn.
   */
  readonly trackUnreadable: boolean;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}
// ---- END PHASE 106 ----

// ---- PHASE 107 ----
// The commit graph of one folder on another machine (Phase 107, research 57
// section 5).
//
// WHAT THIS IS FOR. A project can be a folder on another machine. On that tab
// the Source Control view already draws the changed files, the branch and the
// workflow runs. It did not draw the history, so a person had to open a session
// over there and type. This call answers with a page of the newest commits, the
// two anchors the swimlane picture needs, and the marks that say which commits
// are ahead of the followed branch and which are behind it.
//
// IT IS A SECOND READ RATHER THAN A WIDER `readBranch`. A history read costs
// tens of thousands of bytes and a branch read costs a hundred. Folding them
// into one call would make every Branch read pay for a group nobody opened,
// which is the union script shape research 57 section 5.3 refused. So each
// group pays for itself and a collapsed group costs nothing.
//
// NOTHING IS WRITTEN, on either computer. The `repo-history` script is a read,
// the catalogue's two writers did not move, and there is no checkout, no branch
// and no cherry pick behind this channel. The local History group has all three
// and this one has none.
//
// NOTHING CALLS IT ON A CLOCK. A person expands the group, presses Load more or
// presses Refresh, and each of those is one read. Main cannot see a commit made
// on another computer, so there is no watch and no poll.
//
// THE ANSWER IS CAPPED AT 500 COMMITS AND MAIN CLAMPS IT. One commit is about
// 270 base64 bytes, so 500 is about 135,000 bytes and 20,000 would be 5,400,000
// bytes in one answer that main buffers whole. Condition 57j of
// build/conformance-machines.mjs holds the two constants below.
//
// THE FILES ONE COMMIT CHANGED ARE NOT READ. Reading them is a second script
// and a third one for the two sides of a file, and this phase ships one script.
// The renderer says so on screen.

/**
 * The page a person gets on the first expand, and what Load more adds.
 *
 * 50, which is what `HISTORY_PAGE` in `src/renderer/scm/depth.ts` already gives
 * the local History, so the two page at the same rate and a person learns one
 * number.
 */
export const REMOTE_HISTORY_PAGE = 50;

/**
 * The most commits Tortie will read from another machine in one answer.
 *
 * 500, and it is a wire budget rather than a taste. One commit is about 270
 * base64 bytes, so 500 is about 135,000 bytes and 20,000 would be 5,400,000
 * bytes in one answer that main buffers whole, hands to a parser whole and
 * sends over one IPC message whole. `MAX_LOG_COUNT` in
 * `src/main/git/service.ts` is 20,000 because a local walk pays for it in local
 * disk reads. A remote walk pays for it over a link a person's laptop may be
 * holding on a hotel network. Condition 57j of
 * `build/conformance-machines.mjs` holds this at 500.
 */
export const REMOTE_HISTORY_MAX_COMMITS = 500;

/** Why one read of the history on a remote tab answered the way it did. */
export type MachineHistoryMode =
  /** The walk answered and it carried at least one commit. */
  | 'ok'
  /**
   * The folder is a repository and the walk carried no commit.
   *
   * ONE WORD FOR TWO CAUSES. A repository with no commits yet answers this, and
   * so does a repository with no branches, tags or remote branches to walk
   * from. The sentence on screen names both.
   */
  | 'noCommits'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One history read against one folder on one machine. */
export interface MachineHistoryInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /**
   * Commits to draw. Clamped to 1 and to {@link REMOTE_HISTORY_MAX_COMMITS}.
   *
   * The window is re-walked from the top on every read rather than continued
   * from a cursor. A cursor has to be right about what happened on the far side
   * between two presses, and it cannot be, because a commit made over there in
   * between shifts the window and the two pages then overlap or drop a row.
   */
  readonly maxCount?: number;
}

/** What one machine answered about the commits in one folder. */
export interface MachineHistoryResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineHistoryMode;
  /** The page, newest first, in topological order. */
  readonly entries: readonly GitGraphLogEntry[];
  /** What was asked for after the clamp. */
  readonly maxCount: number;
  /** The ceiling itself, so no sentence on screen writes the number. */
  readonly ceiling: number;
  /**
   * THE CUT. True when the walk found more commits than the page holds.
   *
   * The far side is asked for one commit more than the page, and this is set
   * when that extra commit arrived. The extra one is dropped rather than drawn.
   */
  readonly hasMore: boolean;
  /**
   * THE FAR END. True when `maxCount` is the ceiling and `hasMore` is true.
   *
   * There are older commits in that folder and Tortie does not read them here.
   * The renderer draws no Load more button in this state and says why.
   */
  readonly atCeiling: boolean;
  /** HEAD's tip over there, or null. */
  readonly headSha: string | null;
  /** The tip of the branch HEAD follows over there, or null. */
  readonly upstreamSha: string | null;
  /** `git merge-base` of those two over there, or null. */
  readonly mergeBase: string | null;
  /** How many commits in the page carry an unpushed or unpulled mark. */
  readonly markedCount: number;
  /**
   * THE SECOND CUT. True when the mark read came back at its own cap.
   *
   * The marks are read with the same count as the walk. When that many arrived,
   * an older commit is drawn without a mark whether it has one or not, and the
   * renderer says so. Phase 99 carried a truncation flag through main that the
   * panel never read, so a cut list drew as a whole one. This one is drawn, and
   * so are `hasMore` and `atCeiling`.
   */
  readonly divergenceTruncated: boolean;
  /** Bytes the machine's answer carried, so a probe can report them. */
  readonly answerBytes: number;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}
// ---- END PHASE 107 ----

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesScmInvokeChannelMap {
  // ---- PHASE 73 BLOCK C ----
  // Two READS of one folder on one machine, and neither writes anything on
  // either computer. `reviewFiles` asks git which tracked files differ from
  // HEAD. `reviewFile` asks for both sides of one of them. Both refuse when
  // Tortie is not connected to that machine, and both refuse again when the
  // connection changed while the read was in flight, so an answer can never
  // outlive the connection that produced it.
  'machines:reviewFiles': {
    req: [input: MachineReviewInput];
    res: MachineReviewList;
  };
  'machines:reviewFile': {
    req: [input: MachineReviewFileInput];
    res: MachineReviewPair;
  };
  // ---- END PHASE 73 BLOCK C ----
  // ---- PHASE 103 BLOCK ----
  // BOTH OF THESE WRITE ON ANOTHER COMPUTER, and they are the sixth and the
  // seventh channels in this contract that can. They are also the first two
  // that change a git repository over there: until this phase no command
  // Tortie sent could.
  //
  // NEITHER NAMES A GIT VERB. The verb is inside Tortie's own script text in
  // `src/main/machines/remote-scripts.ts`, so no caller can turn a stage into
  // a commit, a checkout or a discard.
  //
  // NEITHER CARRIES A REPOSITORY ROOT. Main runs its own review read on the
  // tab's folder and uses the root that machine's own `rev-parse` answered, so
  // the pair of an absolute folder and a relative path cannot reach a
  // repository the tab is not about.
  //
  // WHAT BOUNDS THEM IS THE SAME ONE FIELD `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 103 ADDS NO CONFIRMED FIELD
  // and no hash moves. A machine that carries no folder answers `writesOff`
  // and nothing is composed.
  //
  // NEITHER EVER THROWS FOR SOMETHING THE MACHINE SAID. A git that exited non
  // zero is the word `partial`, and a machine that did not answer is the word
  // `unsure`. `unsure` never means nothing changed. Three refusals decided on
  // this Mac before anything is composed do throw, being a name holding a line
  // break, a path longer than one command may be, and a path the fresh read
  // did not report.
  'machines:stage': {
    req: [input: MachineIndexWriteInput];
    res: MachineIndexWriteResult;
  };
  'machines:unstage': {
    req: [input: MachineIndexWriteInput];
    res: MachineIndexWriteResult;
  };
  // ---- END PHASE 103 BLOCK ----
  // ---- PHASE 104 BLOCK ----
  // THIS ONE WRITES ON ANOTHER COMPUTER, and it is the eighth channel in this
  // contract that can. It is the third that changes a git repository over
  // there, after the two Phase 103 added.
  //
  // IT NAMES NO GIT VERB. The verb is inside Tortie's own script text in
  // `src/main/machines/remote-scripts.ts`, so no caller can turn a commit into
  // an amend, a reset or a discard.
  //
  // IT CARRIES NO REPOSITORY ROOT. The input carries the tab's folder and main
  // runs its own review read on it, so the root that reaches that machine's git
  // is the one that machine's own `rev-parse` answered.
  //
  // WHAT BOUNDS IT is the same one field `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 104 ADDS NO CONFIRMED FIELD
  // and no hash moves. A machine that carries no folder answers `refused` and
  // nothing is composed.
  //
  // THE REPEAT IS GUARDED BY HEAD. Main reads the sha that folder's `HEAD`
  // points at immediately before it sends, that sha crosses with the message,
  // and the machine refuses to commit when its own `HEAD` no longer equals it.
  // So a second send of one request commits nothing.
  //
  // IT NEVER THROWS FOR SOMETHING THE MACHINE SAID. Every answer is one of
  // eight words with sentences beside it.
  'machines:commit': {
    req: [input: MachineCommitInput];
    res: MachineCommitResult;
  };
  // ---- END PHASE 104 BLOCK ----
  // PHASE 105. One READ of the branch checked out in one folder on one machine,
  // followed by one gh read ON THIS MAC. It is what the Runs section of a
  // project that lives over there draws.
  //
  // NO CREDENTIAL AND NO gh CROSSES. The gh program runs on this Mac and never
  // leaves it. No token, no gh invocation and no GitHub host name is sent to the
  // machine. Four short strings travel back, being a mode word, the origin
  // address, the branch name and the commit HEAD points at. Condition 55d of
  // build/conformance-machines.mjs reads the script text and fails on any of the
  // nine words a credential would travel in.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-facts`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder arriving there as the one positional parameter. The gh
  // argv is composed by src/main/actions/argv.ts and refused by
  // `assertReadOnlyArgv` before a process exists.
  //
  // IT WRITES NOTHING, on either computer and on GitHub. Every gh shape the
  // allowlist permits is a read.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the section or presses
  // Refresh, and each of those is one read. There is no watch, because main
  // cannot see a push made on another computer, and the panel says the list does
  // not refresh.
  //
  // A folder that is not there, a folder git does not track, a repository with
  // no GitHub address, a detached head, a machine that did not answer and a
  // machine Tortie is not signed in to all come back as a mode word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readRuns': {
    req: [input: MachineRunsInput];
    res: MachineRunsResult;
  };
  // PHASE 106. One channel that READS which branch is checked out in one folder
  // on one machine, the branch it follows, and how far ahead and how far behind
  // it is.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-branch`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder arriving there as the one positional parameter.
  //
  // IT WRITES NOTHING, on either computer. It cannot change what is checked out
  // over there, and the renderer draws no control that could.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group or presses Refresh,
  // and each of those is one read.
  //
  // TORTIE NEVER FETCHES ON THAT MACHINE, so the two counts are measured
  // against the copy of the upstream that machine last fetched and can be older
  // than what is on the server. Condition 56i of build/conformance-machines.mjs
  // fails the script if it ever names `git fetch`, `git pull` or
  // `git remote update`.
  //
  // A folder that is not there, a folder git does not track, a detached head, a
  // git too old to answer, a machine that did not answer and a machine Tortie is
  // not signed in to all come back as a mode word. No prose crosses this
  // channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readBranch': {
    req: [input: MachineBranchInput];
    res: MachineBranchResult;
  };
  // PHASE 107. One READ of a page of the newest commits in one folder on one
  // machine, with the two anchors the swimlane picture needs and the marks that
  // say which commits are ahead of the followed branch and which are behind it.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-history`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder and the count arriving there as the two positional
  // parameters.
  //
  // IT WRITES NOTHING, on either computer. There is no checkout, no branch and
  // no cherry pick behind this channel, and the renderer draws no control that
  // could ask for one.
  //
  // THE COUNT IS CLAMPED IN MAIN to 1 and to REMOTE_HISTORY_MAX_COMMITS, so a
  // renderer that asked for 20,000 is still answered with 500. Condition 57j of
  // build/conformance-machines.mjs holds that number.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group, presses Load more
  // or presses Refresh, and each of those is one read.
  //
  // A folder that is not there, a folder git does not track, a repository with
  // no commits, a machine that did not answer and a machine Tortie is not
  // signed in to all come back as a mode word. No prose crosses this channel:
  // the renderer draws every sentence from src/renderer/app/machine-copy.ts,
  // where the vocabulary audit reads it.
  'machines:readHistory': {
    req: [input: MachineHistoryInput];
    res: MachineHistoryResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesScmApi {
  // ---- PHASE 73 BLOCK C ----
  // Phase 73. The read only review. Both calls read and neither writes.
  reviewFiles(input: MachineReviewInput): Promise<MachineReviewList>;
  reviewFile(input: MachineReviewFileInput): Promise<MachineReviewPair>;
  // ---- END PHASE 73 BLOCK C ----
  // ---- PHASE 103 BLOCK ----
  // Phase 103. Puts a list of paths into one repository's index on one
  // machine. It is the sixth call in this contract that writes on another
  // computer and the first that changes a git repository over there.
  stage(input: MachineIndexWriteInput): Promise<MachineIndexWriteResult>;
  // Phase 103. Takes the same list back out of that index. It is the
  // seventh. On a repository with no commit it runs `git rm --cached` over
  // the same list instead, which leaves every file in the folder.
  unstage(input: MachineIndexWriteInput): Promise<MachineIndexWriteResult>;
  // ---- END PHASE 103 BLOCK ----
  // ---- PHASE 104 BLOCK ----
  // Phase 104. Commits what is staged in one repository on one machine. It is
  // the eighth call in this contract that writes on another computer. The
  // person's own message is the only thing on this call they wrote. Hooks and
  // signing run on that machine, and Tortie answers no passphrase anywhere.
  commit(input: MachineCommitInput): Promise<MachineCommitResult>;
  // ---- END PHASE 104 BLOCK ----
  // Phase 105. Reads which branch is checked out in one folder on one
  // machine, then asks GitHub about that branch with the gh on THIS Mac. It
  // reads and never writes, on either computer and on GitHub, and no
  // credential and no gh crosses the link.
  readRuns(input: MachineRunsInput): Promise<MachineRunsResult>;
  // Phase 106. Reads which branch is checked out in one folder on one
  // machine, the branch it follows, and how far ahead and how far behind it
  // is. It reads and never writes, and it cannot change what is checked out
  // over there.
  readBranch(input: MachineBranchInput): Promise<MachineBranchResult>;
  // Phase 107. Reads a page of the newest commits in one folder on one
  // machine, with the two anchors the swimlane picture needs. It reads and
  // never writes, it is capped at 500 commits in one answer, and it does not
  // read the files one commit changed.
  readHistory(input: MachineHistoryInput): Promise<MachineHistoryResult>;
}
