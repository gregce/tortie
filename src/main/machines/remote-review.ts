/**
 * The read-only review of a folder on another machine (Phase 73, M6, item 4).
 *
 * ## The cap this item was built under, quoted because it decided everything
 *
 * Research 51 section 6 wrote one line about this item:
 *
 * > The M6 review item reuses existing diff surfaces over the exec plane or it
 * > does not happen.
 *
 * So this module answers two questions and draws nothing. The answers fill the
 * diff tab the editor has drawn since Phase 12, through the same two fields a
 * commit tab fills, and `src/renderer/editor/PierreDiff.tsx` is not edited by
 * this phase at all. If that file had needed a change, the honest report was
 * that the reuse did not work.
 *
 * ## Read only, and it is checkable rather than promised
 *
 * Four things make it so, and three of them are properties of text a gate reads
 * rather than of a guard around it.
 *
 *  1. Both scripts are `mode: 'read'` in `./remote-scripts.ts`, so they can be
 *     reached through `runRemoteRead` and refused by `runRemoteWrite`.
 *  2. The git subcommand is baked into the script text. It is never a parameter,
 *     so no caller here can turn a review into a commit.
 *  3. `build/conformance-machines.mjs` reads those texts and fails on any git
 *     verb other than `rev-parse`, `status` and `show`.
 *  4. `build/probe-remote-review.mjs` MEASURES it. It compares
 *     `git status --porcelain` byte for byte before and after a review, and
 *     compares the size and modification time of every file under `.git`.
 *
 * ## What is read, and in what shape
 *
 * Two scripts from the catalogue, both taking their values as positional
 * parameters:
 *
 * ```
 *   review-list  $1 = the folder on that machine
 *   review-file  $1 = the folder, $2 = the path, $3 = the byte cap per side
 * ```
 *
 * BOTH ANSWERS ARE TWO BASE64 WORDS SEPARATED BY ONE SPACE, and a side that is
 * not there is the word `none` rather than an empty word. That shape is the one
 * contract this module has with the catalogue, and it is why nothing here has
 * to worry about a path holding a space, a newline or a zero byte.
 *
 * `review-list` answers with the repository root and the bytes of
 * `git status --porcelain=v2 --branch -z --untracked-files=all`. The porcelain
 * is read by `parsePorcelainV2Status` in `../git/parse.ts`, which has read that
 * shape since Phase 4. A second porcelain reader in this tree would be a review
 * finding, so there is not one: an answer this module does not recognise is
 * refused with a detail naming the shape it expected, which makes a mismatch
 * loud instead of empty.
 *
 * `review-file` answers with the `HEAD` copy and the working copy.
 *
 * ## Both porcelain characters, since Phase 103
 *
 * `MachineReviewFile` carries `indexState` and `worktreeState` as well as the
 * folded `status` letter. Git prints two characters per changed file: the first
 * says what the index holds, which is what the next commit would carry, and the
 * second says what the folder on disk holds. {@link letterOf} folds them and is
 * unchanged, so the badge is exactly what it was. What is new is that the pair
 * reaches the renderer, which is what lets the panel draw a Staged group.
 *
 * ## Two groups, since Phase 97
 *
 * The listing comes back as two arrays rather than one. `files` holds the
 * tracked entries, being what changed against the last commit. `untracked`
 * holds the entries git is not yet tracking, being the files an agent on that
 * machine just made. IGNORED ENTRIES ARE STILL DROPPED, so a build directory
 * never reaches a person's screen.
 *
 * Each group is capped on its own by {@link REMOTE_REVIEW_MAX_FILES}, so one
 * answer carries at most 60 rows. The cap is per group because git prints every
 * tracked entry before the first untracked one, and one flat cap over the pair
 * would hide the whole untracked group in any folder with 30 changed files.
 *
 * ## What this module never does
 *
 *  - It never reads a working tree on this Mac. Both sides come from the
 *    machine, exactly as a commit tab's two sides come from main.
 *  - It never writes anything anywhere.
 *  - It never asks a machine Tortie is not connected to. `runRemoteRead` refuses
 *    that for every caller at once, and it refuses again when the connection
 *    generation moved while the read was in flight.
 */

import type {
  MachineReviewFile,
  MachineReviewList,
  MachineReviewPair
} from '@shared/ipc';
import type { GitCommitFileState } from '@shared/types';
import { gmuxError } from '../errors';
import { STATUS_LIMIT, parsePorcelainV2Status } from '../git/parse';
import { runRemoteRead } from './remote-run';
import {
  REVIEW_NOTHING_CHANGED,
  REVIEW_NOT_A_REPOSITORY,
  reviewMoreFiles,
  reviewTooLargeNote,
  reviewTooManyEntries
} from './remote-copy';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * The most bytes one side of one file may be, being 2 MB.
 *
 * CHOSEN rather than measured. It is the same order as the local read cap and
 * it is a number a person is told about when it bites, through
 * {@link reviewTooLargeNote}. Nothing is silently cut.
 */
export const REMOTE_REVIEW_MAX_BYTES = 2 * 1024 * 1024;

/**
 * The most files one review lists PER GROUP. Chosen, so a menu stays a menu.
 *
 * PHASE 97 MADE IT PER GROUP. It used to cap one flat list. A folder with 30
 * changed files would then have carried no untracked row at all, because git
 * prints every tracked entry first. One answer now carries at most 60 rows.
 */
export const REMOTE_REVIEW_MAX_FILES = 30;

/** How long one review read gets on the machine. Chosen, not measured. */
export const REMOTE_REVIEW_TIMEOUT_MS = 20_000;

/**
 * The machine answered something Tortie could not read.
 *
 * IT IS HERE AND NOT IN `./remote-copy.ts`, and that is a deviation this module
 * states rather than hides. Every sentence main prints about a session on
 * another machine belongs in that file, and that file is written by another
 * builder in this same phase. This sentence was needed by a branch that builder
 * had no way to know about, being an answer whose shape does not match the
 * script catalogue. The integrator moves it, and nothing else about it changes.
 *
 * It says what Tortie did NOT do on either computer, because that is the fact a
 * person needs when a review does not open.
 */
export const REVIEW_ANSWER_UNREADABLE =
  'Tortie could not read what that machine sent back, so it is not showing a ' +
  'review. Nothing was changed on either machine.';

/**
 * The caller did not say what to review.
 *
 * PHASE 90.3 FIX ROUND. Both review verbs took their folder straight to the
 * shell quoter, which reads `.length` on it, so a call missing the field threw
 * a raw TypeError across IPC and the renderer received
 * "Cannot read properties of undefined (reading length)". The product's own
 * callers always send the field, so this was never reachable from a surface,
 * but a required field with no check is a gap in the channel rather than in the
 * caller. This refusal names the field and says nothing ran.
 */
export const REVIEW_NO_FOLDER =
  'Tortie was not told what to review, so it asked that machine for nothing. ' +
  'Nothing was changed on either machine.';

/**
 * The folder as an absolute path on that machine, or a refusal naming the
 * field. Pure.
 */
function reviewFolderOrThrow(value: unknown, field: string): string {
  if (typeof value === 'string' && value.startsWith('/')) return value;
  throw gmuxError(
    'INVALID_INPUT',
    REVIEW_NO_FOLDER,
    `"${field}" has to be an absolute path on that machine, and the caller ` +
      `sent ${JSON.stringify(value) ?? 'undefined'}`
  );
}

/** How many bytes of a side decide whether it is binary. */
const BINARY_SNIFF_BYTES = 8 * 1024;

/**
 * The three shapes, from the shared contract rather than declared twice.
 *
 * They are aliased rather than re-declared because the renderer reads exactly
 * what this module returns, and two declarations of one shape is how the two
 * ends of a channel drift apart. The names below are the ones this phase's spec
 * uses, so a reader of either document finds the same three words.
 */
export type RemoteReviewFile = MachineReviewFile;
export type RemoteReviewList = MachineReviewList;
export type RemoteReviewPair = MachineReviewPair;

// ---------------------------------------------------------------------------
// The pure halves. No connection, no Electron, so the tests read them directly
// ---------------------------------------------------------------------------

/**
 * One porcelain v2 XY pair as the letter the diff surfaces already speak.
 *
 * The worktree half wins when it says something, because a review is about what
 * the folder holds now rather than about what is staged. Anything the pair does
 * not name is `M`, which is the same fold `toState` makes in `../git/parse.ts`.
 */
function letterOf(indexState: string, worktreeState: string): GitCommitFileState {
  const pick = worktreeState !== '.' ? worktreeState : indexState;
  if (pick === 'A' || pick === 'D' || pick === 'R' || pick === 'C') return pick;
  if (pick === 'U') return 'U';
  return 'M';
}

/**
 * The two words of one answer, decoded. Pure.
 *
 * The far side prints `<word> <word>`, and a side with nothing in it is the
 * word `none`. `none` is four characters of the base64 alphabet, so in theory a
 * payload could be three bytes that encode to it. Neither side can be: a
 * repository root begins with a slash, whose encoding begins with `L`, and the
 * porcelain always begins with its own `# branch.oid` header.
 *
 * @throws GmuxError INVALID_INPUT when a word holds a character base64 does not
 *   use. `Buffer.from` drops such a character and hands back plausible
 *   nonsense, and a person reading a diff cannot tell nonsense from a file.
 */
export function decodeRemoteAnswer(
  payload: string,
  first: string,
  second: string
): { left: Buffer; right: Buffer } {
  const words = payload.trim().split(/[ \t\n]+/);
  return {
    left: decodeWord(words[0] ?? 'none', first),
    right: decodeWord(words[1] ?? 'none', second)
  };
}

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

function decodeWord(word: string, which: string): Buffer {
  if (word === 'none' || word.length === 0) return Buffer.alloc(0);
  if (!BASE64_ONLY.test(word)) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_ANSWER_UNREADABLE,
      `${which} came back as ${String(word.length)} character(s) that are ` +
        `not base64, so Tortie did not decode it`
    );
  }
  return Buffer.from(word, 'base64');
}

/**
 * Split the `review-list` answer into the repository root and its two file
 * groups. Pure.
 *
 * `files` holds the tracked entries and `untracked` holds the ones git is not
 * yet tracking. `truncated` is `parsePorcelainV2Status`'s own flag, carried out
 * because Phase 97 is what makes {@link STATUS_LIMIT} reachable and a count
 * that is a floor has to say so.
 *
 * Returns null when the answer holds no repository root, which is what a folder
 * that is not inside a repository answers with.
 *
 * @throws GmuxError INVALID_INPUT when the second word decodes to something
 *   that is not porcelain v2. That is a mismatch between this module and the
 *   script catalogue, and a loud refusal is the only way it is ever noticed. An
 *   empty list would read as "nothing has changed", which is a false statement
 *   about somebody's work.
 */
export function parseRemoteReviewListing(payload: string): {
  repoPath: string;
  /**
   * PHASE 104. The commit `HEAD` points at in that folder, out of the same
   * porcelain header.
   *
   * `parsePorcelainV2Status` has always read `# branch.oid` into `oid` and this
   * function has always thrown it away. Carrying it out costs no extra read and
   * no extra process on that machine. It is empty for a repository with no
   * commit, because `parseHeader` writes the field only when the header is not
   * `(initial)`.
   */
  headSha: string;
  files: RemoteReviewFile[];
  untracked: RemoteReviewFile[];
  truncated: boolean;
} | null {
  const { left, right } = decodeRemoteAnswer(
    payload,
    'the repository root',
    'the list of changed files'
  );
  const root = left.toString('utf8').trim();
  if (root.length === 0 || !root.startsWith('/')) return null;
  const body = right.toString('utf8');
  if (body.length > 0 && !body.startsWith('# branch.')) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_ANSWER_UNREADABLE,
      `the machine answered ${String(body.length)} byte(s) that do not begin ` +
        `with a porcelain v2 branch header. This module reads the output of ` +
        `"git status --porcelain=v2 --branch -z" and nothing else`
    );
  }
  const parsed = parsePorcelainV2Status(body);
  const files: RemoteReviewFile[] = [];
  const untracked: RemoteReviewFile[] = [];
  for (const file of parsed.files) {
    // An ignored entry stays out. A person asked what changed in a folder and
    // a build directory is not an answer to that question.
    if (file.indexState === '!') continue;
    if (file.indexState === '?') {
      // PHASE 97. A file git is not yet tracking. The letter is `A` because
      // against the last commit a new file is an addition, and because `A` is
      // the one member of GitCommitFileState whose badge class is already the
      // added one. The view fixes the badge for this group rather than reading
      // this letter, so it is a truthful value nothing depends on.
      untracked.push({
        path: file.path,
        origPath: null,
        status: 'A',
        // PHASE 103. Both characters, carried as git printed them. An
        // untracked row is `??`, and the renderer's untracked group is its own
        // array rather than a reading of these two.
        indexState: file.indexState,
        worktreeState: file.worktreeState
      });
      continue;
    }
    files.push({
      path: file.path,
      origPath: file.origPath ?? null,
      status: letterOf(file.indexState, file.worktreeState),
      // PHASE 103. The pair, carried through unfolded. `letterOf` above is
      // unchanged and still feeds the badge. Until this phase the fold was the
      // only thing that reached the renderer, so the remote list could not
      // tell a staged file from an unstaged one and the two new verbs would
      // have meant nothing.
      indexState: file.indexState,
      worktreeState: file.worktreeState
    });
  }
  // Neither array is sorted. Git prints both groups in path order already, and
  // the tracked list has never been sorted here.
  return {
    repoPath: root,
    headSha: parsed.oid ?? '',
    files,
    untracked,
    truncated: parsed.truncated
  };
}

/**
 * Split the `review-file` answer into its two sides. Pure.
 *
 * A side that is not there arrives as the word `none`, which is what makes a
 * new file render all green and a deleted one all red, exactly as the commit
 * path already does.
 */
export function parseRemoteReviewPair(
  payload: string,
  capBytes: number = REMOTE_REVIEW_MAX_BYTES
): RemoteReviewPair {
  const { left, right } = decodeRemoteAnswer(
    payload,
    'the copy in the last commit',
    'the copy in the folder'
  );
  const binary = holdsNul(left) || holdsNul(right);
  const truncated = left.length >= capBytes || right.length >= capBytes;
  return {
    oldContents: binary ? '' : left.toString('utf8'),
    newContents: binary ? '' : right.toString('utf8'),
    binary,
    truncated,
    note: truncated
      ? reviewTooLargeNote(Math.round(capBytes / (1024 * 1024)))
      : null,
    // PHASE 101. The size of the WORKING copy, counted here from bytes this
    // function already had. No script text moved and the far side answers
    // nothing new.
    //
    // WHEN `truncated` IS TRUE THIS IS A FLOOR AND NOT A SIZE. The read was cut
    // at the cap, so this equals the cap and the file is larger than it. The
    // surface that draws the refusal says "over" in that case and names the cap
    // rather than printing this number as the file's size.
    bytes: right.length
  };
}

function holdsNul(bytes: Buffer): boolean {
  const end = Math.min(bytes.length, BINARY_SNIFF_BYTES);
  for (let at = 0; at < end; at += 1) {
    if (bytes[at] === 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The two answers
// ---------------------------------------------------------------------------

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/**
 * Every tracked file in one folder on one machine that differs from `HEAD`,
 * and every file in it git is not yet tracking.
 *
 * The folder is the session's own folder, which is a path on that machine and
 * never a path on this Mac. Nothing is read here, on either computer, beyond
 * what git prints. PHASE 97 ADDED THE SECOND GROUP WITHOUT ADDING A READ: the
 * untracked entries were already in the one answer this function has always
 * asked for, and they were thrown away after the parse.
 */
export async function reviewFilesOn(input: {
  machineId: string;
  cwd: string;
}): Promise<RemoteReviewList> {
  const cwd = reviewFolderOrThrow(input.cwd, 'cwd');
  const ctx = readyRemoteContext(input.machineId);
  const answer = await runRemoteRead(ctx, 'review-list', [cwd], {
    timeoutMs: REMOTE_REVIEW_TIMEOUT_MS
  });
  const machineLabel = labelOf(input.machineId);
  const listing = parseRemoteReviewListing(answer.payload);
  if (listing === null) {
    return {
      machineId: input.machineId,
      machineLabel,
      repoPath: '',
      // PHASE 104. A folder that is not a repository has no HEAD to guard a
      // commit with, and the commit path reads the empty repoPath above and
      // refuses before it reaches this field.
      headSha: '',
      files: [],
      total: 0,
      untracked: [],
      untrackedTotal: 0,
      note: REVIEW_NOT_A_REPOSITORY
    };
  }
  const total = listing.files.length;
  const untrackedTotal = listing.untracked.length;
  // Each group is cut on its own. See the header for why one flat cut would
  // have hidden the whole untracked group in an ordinary working folder.
  const files = listing.files.slice(0, REMOTE_REVIEW_MAX_FILES);
  const untracked = listing.untracked.slice(0, REMOTE_REVIEW_MAX_FILES);
  const shown = files.length + untracked.length;
  const all = total + untrackedTotal;
  return {
    machineId: input.machineId,
    machineLabel,
    repoPath: listing.repoPath,
    // PHASE 104. What that machine's own porcelain header said HEAD points at.
    // It is the guard a commit on that machine is sent with, and main uses THIS
    // value rather than the one the panel drew.
    headSha: listing.headSha,
    files,
    total,
    untracked,
    untrackedTotal,
    // The first sentence that is true wins. A folder over the parser's own cap
    // is said first, because every count under it is a floor rather than a
    // total and a person reading the other sentences would not know that.
    note: listing.truncated
      ? reviewTooManyEntries(STATUS_LIMIT)
      : all === 0
        ? REVIEW_NOTHING_CHANGED
        : shown < all
          ? reviewMoreFiles(shown, all)
          : null
  };
}

/**
 * Both sides of one file on one machine.
 *
 * A RENAME IS TWO READS, and that is deliberate. The script takes one path and
 * answers with the `HEAD` copy and the working copy at that path. After a rename
 * the `HEAD` copy lives at the old path and the working copy lives at the new
 * one, so asking once would answer with one empty side and the diff would read
 * as a whole file being added. That is the Phase 11 carried finding (a), and it
 * is not repeated here: the old side is taken from the read at the old path and
 * the new side from the read at the new path. Both reads are reads.
 */
export async function reviewFileOn(input: {
  machineId: string;
  repoPath: string;
  path: string;
  origPath: string | null;
}): Promise<RemoteReviewPair> {
  const repoPath = reviewFolderOrThrow(input.repoPath, 'repoPath');
  if (typeof input.path !== 'string' || input.path.length === 0) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_NO_FOLDER,
      `"path" has to be the file's path inside that repository, and the ` +
        `caller sent ${JSON.stringify(input.path) ?? 'undefined'}`
    );
  }
  const ctx = readyRemoteContext(input.machineId);
  const cap = String(REMOTE_REVIEW_MAX_BYTES);
  const read = async (path: string): Promise<RemoteReviewPair> => {
    const answer = await runRemoteRead(
      ctx,
      'review-file',
      [repoPath, path, cap],
      { timeoutMs: REMOTE_REVIEW_TIMEOUT_MS }
    );
    return parseRemoteReviewPair(answer.payload, REMOTE_REVIEW_MAX_BYTES);
  };
  const now = await read(input.path);
  if (input.origPath === null || input.origPath === input.path) return now;
  const before = await read(input.origPath);
  const truncated = before.truncated || now.truncated;
  return {
    oldContents: before.oldContents,
    newContents: now.newContents,
    binary: before.binary || now.binary,
    truncated,
    note: truncated
      ? reviewTooLargeNote(REMOTE_REVIEW_MAX_BYTES / (1024 * 1024))
      : null,
    // PHASE 101. The working copy comes from the read at the NEW path, so its
    // size does too. The old path's read describes a copy in the last commit
    // and nothing is ever saved back to that.
    bytes: now.bytes
  };
}
