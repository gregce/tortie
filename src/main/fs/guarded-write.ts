/**
 * The guarded write (Phase 226): replace ONE file only if it still holds the
 * bytes the caller read, and never through a link.
 *
 * ## WHY THIS IS NOT `fs:writeFile`
 *
 * `fs:writeFile` is `await writeFile(abs, contents, 'utf8')` and nothing else:
 * no containment, no size check, no digest, no `O_EXCL`, no `lstat`, and it
 * follows a symbolic link. Every Cmd-S goes through it, so a precondition
 * added there changes the channel saving depends on. This module is the
 * write the redline's rewind will use (Phase 227), and research 83 measured
 * what each missing guard costs: a rewind over a truncated read dropped
 * 98,110 bytes in one arm and reverted a 5,895,890 byte document whole in
 * another (E.7a); a latin-1 file lost three characters the person never
 * pointed at and grew by six bytes (E.7b); and the naive write destroyed
 * everything an agent wrote between the draw and the press (E.7).
 *
 * ## THE ORDER, and it is the design
 *
 * Every refusal is decided before a byte moves, and each is a WORD:
 *
 *  1. The input is checked for shape.                          `refused/input`
 *  2. The root must be a project Tortie has open, through the SAME gate
 *     `fs:createFile`, `fs:rename`, `fs:move` and `fs:trash` ask, and the path
 *     must resolve inside it with `.git` refused at any depth.  `refused/outside`
 *  3. The file is opened for reading with `O_NOFOLLOW`, so a link at the
 *     path is a file that is not there.               `refused/missing | link`
 *  4. Its size is asked BEFORE anything is read or hashed, and a file over
 *     READ_CAP_BYTES is refused, because the caller's read of such a file
 *     was truncated by `fs:readFile` and a write composed over a truncated
 *     read loses the tail. The new contents are held to the same cap, so the
 *     next read of the file is whole too.                      `refused/tooLarge`
 *  5. The bytes are read to EOF and hashed. A digest that is not the one the
 *     caller read is the compare-and-swap refusal, which is what the remote
 *     path has had since Phase 101 and the local path never had.      `stale`
 *  6. The bytes are decoded as UTF-8 and re-encoded. If that round trip does
 *     not give back the same bytes, the decode produced a U+FFFD the file
 *     does not contain, and a whole-file write would destroy characters the
 *     person never pointed at. This is a byte comparison and NOT an encoding
 *     detector: a file that legitimately contains U+FFFD round trips, and a
 *     BOM, CRLF or UTF-16 file are STATED LIMITS, not solved ones.
 *                                                              `refused/notUtf8`
 *  7. The new bytes are staged beside the file, at a name only Tortie
 *     composes, with the file's own mode: `unlink` whatever is at that name
 *     (a leftover from a crash, or a planted link, and `unlink` acts on the
 *     link and never on what it points at), then create it EXCLUSIVELY, so a
 *     link re-planted between the two makes the create fail rather than be
 *     followed. Lifted from `src/main/credentials/nofollow.ts`, whose header
 *     carries the defect it exists for.
 *  8. `lstat` of the TARGET: if what is there now is a link, or nothing, the
 *     file changed under the write and the staged copy is discarded.
 *     `lstat` of the STAGED copy: if it is a link, somebody swapped it and it
 *     is discarded. `lstat` reports on the entry and never on what it points
 *     at.                                                        `refused/raced`
 *  9. `rename` of the staged copy onto the file, which is atomic on one
 *     volume, so a reader sees the old file or the new one and never a
 *     partial one. Lifted from `src/main/settings/store.ts`.        `wrote`
 *
 * Steps 3 to 9 are SYNCHRONOUS on purpose. There is no await between the
 * digest comparison and the rename, so nothing else in main can run in that
 * window; the window that remains is the operating system's own, and it is
 * the same one the remote path's far side has.
 *
 * ## THE STAGED NAME, and why it is this one
 *
 * `<dir>/.<basename>.tortie-swap`. Research 86 section 7 measured git 2.50.1
 * and found that git hides NO name Tortie could choose inside a repository:
 * `git status` shows an untracked dotfile exactly as any other, `git add -A`
 * stages it and `git clean` takes it. So the requirement, a name nobody is
 * tempted to commit, is met by LIFETIME rather than by a name git overlooks.
 * The file exists for one write and one rename, microseconds, and only a
 * crash between them leaves it; the name is deterministic per target, so the
 * next write to the same file finds the leftover at step 7 and removes it
 * without a directory scan; the dot keeps it out of `ls` and most pickers;
 * and the suffix is Tortie's own, different from the credentials domain's
 * `.tortie-pending` on purpose so neither domain's sweep can mistake the
 * other's file. It sits in the SAME directory as the target because `rename`
 * is atomic only within a volume; a system temp directory is not the answer.
 *
 * ## THE RENAME-OVER MAKES AN `fs.watch` ON THE FILE GO DEAF
 *
 * Research 83 C.2 measured it: 1 callback after an in-place write, 1 after a
 * rename-over, 0 thereafter, because the watch is on the inode and the
 * rename put a new inode at the name. It is harmless today because the
 * existing bus watches the DIRECTORY. Whoever adds the C.8 directory watch
 * with a basename filter inherits this sentence, and whoever ever watches a
 * FILE by name must not, or a rewind will silently stop their updates.
 *
 * ## WHAT IS DELIBERATELY NOT HERE
 *
 * No caller: nothing in the renderer reaches this until Phase 227. No
 * encoding detection. No batch, no directory, no undo journal. No log line
 * naming the bytes. And the channel NAME is not in this file, only in
 * src/main/fs/ipc.ts, because the closure test counts registrations by
 * string.
 */

import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  renameSync,
  unlinkSync,
  writeSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type {
  FsGuardedWriteInput,
  FsGuardedWriteRefusal,
  FsGuardedWriteResult
} from '@shared/fs-ops';
import { READ_CAP_BYTES } from '@shared/fs-ops';
import { sha256Of } from '../durable/write';
import { gmuxErrorPayloadOf } from '../errors';
import { resolveInsideRoot, resolveOpenProjectRoot } from './paths';

/** The suffix of the staged copy. Tortie's own; grep the product for it. */
export const GUARDED_SWAP_SUFFIX = '.tortie-swap';

/** Where the new bytes are staged for `abs`: beside it, dotted, suffixed. */
export function swapNameFor(abs: string): string {
  return join(dirname(abs), `.${basename(abs)}${GUARDED_SWAP_SUFFIX}`);
}

/** Injected so the gate can run the SHIPPING channel under node. */
export interface GuardedWriteDeps {
  /** Absolute paths of the folders Tortie has open. Same source as file-ops. */
  listProjectRoots(): Promise<readonly string[]>;
  /**
   * The gate's seam, never passed by the product: runs after the staged copy
   * is written and before the target is checked and renamed over, which is
   * where a crash leaves a leftover and where a planted link is a race.
   */
  afterStage?(staged: string, target: string): void;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function refused(why: FsGuardedWriteRefusal, reason: string): FsGuardedWriteResult {
  return { outcome: 'refused', why, reason };
}

/** The sentence inside a thrown GmuxError, or the error's own message. */
function sentenceOf(err: unknown): string {
  const payload = gmuxErrorPayloadOf(err);
  if (payload !== null) return payload.message;
  return err instanceof Error ? err.message : String(err);
}

function errnoOf(err: unknown): string {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return typeof code === 'string' ? code : 'EIO';
}

/** ONE predicate for the cap, asked of the file's size and of the payload. */
function overCap(bytes: number): boolean {
  return bytes > READ_CAP_BYTES;
}

/** Read a descriptor to EOF, starting from what `fstat` said it holds. */
function readAllSync(fd: number, expected: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  let want = Math.max(expected, 1);
  for (;;) {
    const buf = Buffer.alloc(want);
    let got = 0;
    while (got < want) {
      const n = readSync(fd, buf, got, want - got, total + got);
      if (n === 0) break;
      got += n;
    }
    if (got > 0) {
      chunks.push(got === want ? buf : buf.subarray(0, got));
      total += got;
    }
    if (got < want) break;
    // The file was longer than fstat said, so it is growing. Keep reading;
    // the cap is asked of the total below.
    want = 64 * 1024;
  }
  return chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks, total);
}

function discard(staged: string): void {
  try {
    unlinkSync(staged);
  } catch {
    // A staged copy that will not go changes nothing about what the file
    // holds, and the next write to this file removes it first.
  }
}

/**
 * Replace one file if it still holds the bytes the caller read.
 *
 * Answers a word for every outcome and throws for none of them. See the
 * header for the order and the reasons.
 */
export async function writeGuarded(
  deps: GuardedWriteDeps,
  input: FsGuardedWriteInput
): Promise<FsGuardedWriteResult> {
  // 1. Shape.
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof input.root !== 'string' ||
    typeof input.path !== 'string' ||
    typeof input.contents !== 'string' ||
    typeof input.expect !== 'string' ||
    !SHA256_HEX.test(input.expect)
  ) {
    return refused('input', 'The write did not say which file, which bytes, or what to write.');
  }

  // 2. Containment, through the gate every other mutation asks.
  let abs: string;
  try {
    const realRoot = await resolveOpenProjectRoot(input.root, () =>
      deps.listProjectRoots()
    );
    abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  } catch (err) {
    return refused('outside', sentenceOf(err));
  }

  const name = basename(abs);
  const payload = Buffer.from(input.contents, 'utf8');

  // 3 to 6. The read, and the three refusals decided on what it found.
  let raw: Buffer;
  let mode: number;
  let fd: number;
  try {
    fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch (err) {
    const code = errnoOf(err);
    if (code === 'ENOENT') return refused('missing', `${name} is no longer there.`);
    if (code === 'ELOOP' || code === 'EMLINK') {
      return refused('link', `${name} is a link, and Tortie will not turn it into a file.`);
    }
    return refused('io', `${name} could not be opened (${code}).`);
  }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) {
      return refused('io', `${name} is not a regular file.`);
    }
    mode = stat.mode & 0o7777;
    if (overCap(stat.size)) {
      return refused('tooLarge', `${name} is too large for Tortie to rewrite whole.`);
    }
    if (overCap(payload.length)) {
      return refused('tooLarge', `The new contents of ${name} are too large to write.`);
    }
    raw = readAllSync(fd, stat.size);
    if (overCap(raw.length)) {
      return refused('tooLarge', `${name} is too large for Tortie to rewrite whole.`);
    }
  } catch (err) {
    return refused('io', `${name} could not be read (${errnoOf(err)}).`);
  } finally {
    closeSync(fd);
  }

  const disk = sha256Of(raw);
  if (disk !== input.expect) {
    return {
      outcome: 'stale',
      sha256: disk,
      reason: `${name} changed since it was read, so nothing was written.`
    };
  }

  const text = raw.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(raw)) {
    return refused(
      'notUtf8',
      `${name} is not UTF-8 text, and rewriting it whole would damage it.`
    );
  }

  // 7. Stage beside the file, following no link at the staged name.
  const staged = swapNameFor(abs);
  try {
    unlinkSync(staged);
  } catch {
    // Nothing was there, or what was there is not something this process may
    // remove. Either way the exclusive create below is what decides.
  }
  let out: number;
  try {
    out = openSync(
      staged,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      mode
    );
  } catch (err) {
    return refused('io', `${name} could not be staged for writing (${errnoOf(err)}).`);
  }
  try {
    // The mode on the DESCRIPTOR, so the umask cannot narrow an executable
    // and no second path is resolved to set it.
    fchmodSync(out, mode);
    let written = 0;
    while (written < payload.length) {
      written += writeSync(out, payload, written, payload.length - written, written);
    }
  } catch (err) {
    closeSync(out);
    discard(staged);
    return refused('io', `${name} could not be written (${errnoOf(err)}).`);
  }
  closeSync(out);

  deps.afterStage?.(staged, abs);

  // 8 and 9. Ask the target and the staged copy what they are now, then swap.
  try {
    let targetIsLink: boolean;
    try {
      targetIsLink = lstatSync(abs).isSymbolicLink();
    } catch {
      discard(staged);
      return refused('raced', `${name} went away while Tortie was writing it.`);
    }
    if (targetIsLink) {
      discard(staged);
      return refused('raced', `${name} became a link while Tortie was writing it.`);
    }
    if (lstatSync(staged).isSymbolicLink()) {
      discard(staged);
      return refused('raced', `The staged copy of ${name} is not the file Tortie wrote.`);
    }
    renameSync(staged, abs);
  } catch (err) {
    discard(staged);
    return refused('io', `${name} could not be replaced (${errnoOf(err)}).`);
  }

  return { outcome: 'wrote', sha256: sha256Of(payload), bytes: payload.length };
}
