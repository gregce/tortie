/**
 * What ONE commit changed in one folder on another machine, and both sides of
 * one file of it (Phase 233, research 85 gap 17).
 *
 * ## What it is for
 *
 * Phase 107 drew the commits over there and said on the face that the files
 * one commit changed were not read. Phase 228 took the sentence off and left
 * the row inert. This module is the read behind the two gestures the local
 * History row has had since Phase 12: a row expands into its files, and a
 * file opens as a two sided diff of the commit's first parent against the
 * commit.
 *
 * ## Why it is its own module rather than a second read in remote-history.ts
 *
 * Condition 57i of `build/conformance-machines.mjs` pins
 * `./remote-history.ts` to ONE remote read naming `repo-history` and nothing
 * else, so that a person's machine cannot be asked a second thing without
 * somebody reading that file again. The same rule holds here in the other
 * direction: this module names `commit-files` and nothing else, and it makes
 * one read per call.
 *
 * ## What crosses, drawn
 *
 * ```
 *   THIS MAC                                   THE MACHINE
 *   ────────                                   ───────────
 *   machines:readCommitFiles ──▶ this module
 *                                 │ sha matched against SHA_ONLY
 *                                 │ ONE runRemoteRead of 'commit-files'
 *                                 │   [cwd, sha, '', cap]
 *                                 └────────────▶ git show -z --name-status
 *                                 ◀──────────── list <b64>
 *                                 │ parseNameStatusZ (../git/parsers, unchanged)
 *                                 ▼
 *                               MachineCommitFilesResult
 *
 *   machines:readCommitFile ───▶ this module
 *                                 │ sha and path checked
 *                                 │ ONE runRemoteRead of 'commit-files'
 *                                 │   [cwd, sha, path, cap]   (twice for a rename)
 *                                 └────────────▶ git show "<sha>^:<path>",
 *                                                git show "<sha>:<path>"
 *                                 ◀──────────── file <sizeA> <sizeB> <b64A> <b64B>
 *                                 ▼
 *                               MachineCommitFilePair
 * ```
 *
 * THE MAIN SIDE WRITES NO SECOND PARSER. The far side prints exactly the bytes
 * `GitService.commitDetail` reads on this Mac, so `parseNameStatusZ` from
 * `../git/parsers` reads them unchanged.
 *
 * ## The ceiling, and why the sizes travel beside the bytes
 *
 * Each side is cut at `REMOTE_FILE_MAX_BYTES` by the far side's own `head -c`,
 * which is the charter's ceiling and the same number a saved file has. The far
 * side also counts each side's WHOLE size with a second `git show` into
 * `wc -c`, so the renderer can refuse a file over the ceiling naming its real
 * size, with the same sentence the editor uses for a large remote file, rather
 * than printing a floor. The refusal is the renderer's because the sentence is
 * the renderer's; this module carries no prose about it.
 *
 * ## A rename is two reads, deliberately
 *
 * The script takes one path and answers with the parent's copy and the
 * commit's copy AT THAT PATH. After a rename the parent's copy lives at the old
 * path and the commit's copy at the new one, so asking once would answer one
 * empty side and the diff would read as a whole file being added. That is the
 * Phase 11 carried finding (a), and `./remote-review.ts` already takes two
 * reads for the same reason. The old side is taken from the read at the old
 * path and the new side from the read at the new path. Both reads are reads.
 *
 * ## It never throws for anything a machine said, on the LIST
 *
 * A machine Tortie is not connected to and a machine that did not answer both
 * come back as a mode word, the way the history read answers, so a row that
 * cannot expand says so from a sentence in `src/renderer/machines/history.ts`.
 * The PAIR throws, the way `reviewFileOn` throws, because a tab has one error
 * slot and the loader already turns a thrown answer into a sentence there.
 * Both refuse a commit name that is not hex before anything is sent.
 */

import type {
  MachineCommitFile,
  MachineCommitFileInput,
  MachineCommitFilePair,
  MachineCommitFilesInput,
  MachineCommitFilesResult
} from '@shared/ipc';
import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import { gmuxError } from '../errors';
import { parseNameStatusZ } from '../git/parsers';
import type { RemoteMachineContext } from './context';
import { REVIEW_ANSWER_UNREADABLE, REVIEW_NO_FOLDER } from './remote-review';
import { machineLinkAnswering, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './ready-context';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one read gets on the machine, in ms. 20,000.
 *
 * The list is small. The pair can be two sides of ninety thousand bytes each,
 * encoded, over a link a laptop may be holding on a hotel network, so it takes
 * the history read's ceiling rather than the door's default.
 */
export const REMOTE_COMMIT_FILES_TIMEOUT_MS = 20_000;

/** The one script this module may name. */
const SCRIPT_ID = 'commit-files';

/** A commit name as git prints it, under SHA-1 and under SHA-256. */
const SHA_ONLY = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/** How many bytes of a side decide whether it is binary. */
const BINARY_SNIFF_BYTES = 8 * 1024;

/** The sentence for a commit name this module refuses to send. */
export const COMMIT_NAME_REFUSED =
  'Tortie was not given a commit it could ask about, so it asked that ' +
  'machine for nothing. Nothing was changed on either machine.';

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** One base64 word, decoded, or null when it is `none`. Throws on non base64. */
function decodeWord(word: string, which: string): Buffer | null {
  if (word === 'none' || word.length === 0) return null;
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

function holdsNul(bytes: Buffer): boolean {
  const end = Math.min(bytes.length, BINARY_SNIFF_BYTES);
  for (let at = 0; at < end; at += 1) {
    if (bytes[at] === 0) return true;
  }
  return false;
}

/** A whole number the far side printed, or null for anything else. */
function sizeWord(word: string): number | null {
  if (!/^\d{1,12}$/.test(word)) return null;
  return Number.parseInt(word, 10);
}

// ---------------------------------------------------------------------------
// The pure halves. No connection, no Electron, so the tests read them directly
// ---------------------------------------------------------------------------

/**
 * The `list` answer as the files one commit changed. PURE.
 *
 * The far side prints `list <b64>`, where the payload is exactly what
 * `git show <sha> -z --name-status -M --format= --diff-merges=first-parent --`
 * printed, and `none` for a commit that changed nothing. `parseNameStatusZ`
 * reads the decoded bytes unchanged, which is the one parser the local History
 * row already reads through.
 *
 * @returns the files, or null when the answer is not a `list` answer. A word
 *   this module does not know and a field count that is not two both make the
 *   whole answer unreadable, which the caller reads as the machine not having
 *   answered.
 * @throws GmuxError INVALID_INPUT when the payload holds a character base64
 *   does not use, for the reason `./remote-review.ts` gives.
 */
export function parseCommitFilesAnswer(
  payload: string
): MachineCommitFile[] | null {
  const words = payload.trim().split(/[ \t\n]+/);
  if (words.length !== 2 || words[0] !== 'list') return null;
  const bytes = decodeWord(words[1] ?? '', 'the list of changed files');
  if (bytes === null) return [];
  return parseNameStatusZ(bytes.toString('utf8')).map((entry) => ({
    path: entry.path,
    ...(entry.origPath !== undefined ? { origPath: entry.origPath } : {}),
    status: entry.status
  }));
}

/**
 * The `file` answer as one side pair. PURE.
 *
 * The far side prints `file <sizeA> <sizeB> <b64A> <b64B>`. A side that does
 * not exist is `0` and `none`, which is what makes a file the commit added
 * render all green and a file it deleted all red, exactly as the local commit
 * tab does.
 *
 * @returns the pair, or null when the answer is not a `file` answer.
 */
export function parseCommitFileAnswer(
  payload: string
): MachineCommitFilePair | null {
  const words = payload.trim().split(/[ \t\n]+/);
  if (words.length !== 5 || words[0] !== 'file') return null;
  const oldBytes = sizeWord(words[1] ?? '');
  const newBytes = sizeWord(words[2] ?? '');
  if (oldBytes === null || newBytes === null) return null;
  const left = decodeWord(words[3] ?? '', 'the copy in the parent commit');
  const right = decodeWord(words[4] ?? '', 'the copy in the commit');
  const binary =
    (left !== null && holdsNul(left)) || (right !== null && holdsNul(right));
  return {
    oldContents: left === null || binary ? '' : left.toString('utf8'),
    newContents: right === null || binary ? '' : right.toString('utf8'),
    binary,
    oldBytes,
    newBytes
  };
}

/**
 * The commit name this module will send, or null.
 *
 * Only a full lowercase hex name passes, which is the rule the history read
 * already applies to what the far side printed. The far side holds its own
 * copy of the rule, so a name that somehow reached it would still be refused
 * there before `git show` ran.
 */
export function commitNameToSend(value: unknown): string | null {
  return typeof value === 'string' && SHA_ONLY.test(value) ? value : null;
}

/**
 * The path this module will send, or null.
 *
 * Relative, non empty, no leading slash and no `..` segment. The far side
 * refuses the same shapes with `review-file`'s own line, and this Mac refuses
 * first so nothing crosses for a path that cannot be read.
 */
export function commitPathToSend(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.startsWith('/') || value.includes('..')) return null;
  return value;
}

// ---------------------------------------------------------------------------
// The two answers
// ---------------------------------------------------------------------------

/** Everything but the files, for the two answers that carry none. */
function answerWithout(
  input: MachineCommitFilesInput,
  mode: 'notConnected' | 'unreachable',
  started: number
): MachineCommitFilesResult {
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    sha: input.sha,
    mode,
    files: [],
    answerBytes: 0,
    elapsedMs: Date.now() - started
  };
}

/**
 * Ask one machine which files one commit changed in one folder.
 *
 * @returns a result carrying `ok` and the files, or one of the two other
 *   answers. It never throws for anything the machine said. It throws for a
 *   folder that is not absolute and for a commit name that is not hex, because
 *   both are the caller's error rather than a state of a machine.
 */
export async function readCommitFilesOnMachine(
  input: MachineCommitFilesInput
): Promise<MachineCommitFilesResult> {
  const started = Date.now();
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_NO_FOLDER,
      `"cwd" has to be an absolute path on that machine, and the caller ` +
        `sent ${JSON.stringify(input.cwd) ?? 'undefined'}`
    );
  }
  const sha = commitNameToSend(input.sha);
  if (sha === null) {
    throw gmuxError(
      'INVALID_INPUT',
      COMMIT_NAME_REFUSED,
      `"sha" has to be a full lowercase hex commit name, and the caller sent ` +
        `${JSON.stringify(input.sha) ?? 'undefined'}`
    );
  }
  if (!machineLinkAnswering(input.machineId)) {
    return answerWithout(input, 'notConnected', started);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answerWithout(input, 'notConnected', started);
  }
  let files: MachineCommitFile[] | null;
  let answerBytes = 0;
  try {
    const out = await runRemoteRead(
      ctx,
      SCRIPT_ID,
      [input.cwd, sha, '', String(REMOTE_FILE_MAX_BYTES)],
      { timeoutMs: REMOTE_COMMIT_FILES_TIMEOUT_MS }
    );
    answerBytes = out.bytes;
    files = parseCommitFilesAnswer(out.payload);
  } catch {
    return answerWithout(input, 'unreachable', started);
  }
  // A payload nothing could read is a machine that did not answer, rather
  // than a guess about a commit.
  if (files === null) return answerWithout(input, 'unreachable', started);
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    sha,
    mode: 'ok',
    files,
    answerBytes,
    elapsedMs: Date.now() - started
  };
}

/**
 * Both sides of one file of one commit on one machine.
 *
 * A RENAME IS TWO READS, for the reason the header gives. Both are reads, and
 * each is one `commit-files` call with the path as its third value.
 *
 * @throws GmuxError for a folder that is not absolute, a commit name that is
 *   not hex, a path that cannot be sent, a machine Tortie is not connected to,
 *   a machine that did not answer and an answer this module cannot read. The
 *   loader in the renderer turns each into the tab's one error sentence.
 */
export async function readCommitFileOnMachine(
  input: MachineCommitFileInput
): Promise<MachineCommitFilePair> {
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_NO_FOLDER,
      `"cwd" has to be an absolute path on that machine, and the caller ` +
        `sent ${JSON.stringify(input.cwd) ?? 'undefined'}`
    );
  }
  const sha = commitNameToSend(input.sha);
  if (sha === null) {
    throw gmuxError(
      'INVALID_INPUT',
      COMMIT_NAME_REFUSED,
      `"sha" has to be a full lowercase hex commit name, and the caller sent ` +
        `${JSON.stringify(input.sha) ?? 'undefined'}`
    );
  }
  const path = commitPathToSend(input.path);
  if (path === null) {
    throw gmuxError(
      'INVALID_INPUT',
      REVIEW_NO_FOLDER,
      `"path" has to be the file's path inside that repository, and the ` +
        `caller sent ${JSON.stringify(input.path) ?? 'undefined'}`
    );
  }
  const origPath =
    input.origPath === null || input.origPath === undefined
      ? null
      : commitPathToSend(input.origPath);
  const ctx = readyRemoteContext(input.machineId);
  const cap = String(REMOTE_FILE_MAX_BYTES);
  const read = async (at: string): Promise<MachineCommitFilePair> => {
    const out = await runRemoteRead(ctx, SCRIPT_ID, [input.cwd, sha, at, cap], {
      timeoutMs: REMOTE_COMMIT_FILES_TIMEOUT_MS
    });
    const pair = parseCommitFileAnswer(out.payload);
    if (pair === null) {
      throw gmuxError(
        'INVALID_INPUT',
        REVIEW_ANSWER_UNREADABLE,
        `the machine answered "${SCRIPT_ID}" with ${JSON.stringify(
          out.payload.slice(0, 120)
        )}`
      );
    }
    return pair;
  };
  const now = await read(path);
  if (origPath === null || origPath === path) return now;
  const before = await read(origPath);
  const binary = before.binary || now.binary;
  return {
    oldContents: binary ? '' : before.oldContents,
    newContents: binary ? '' : now.newContents,
    binary,
    oldBytes: before.oldBytes,
    newBytes: now.newBytes
  };
}
