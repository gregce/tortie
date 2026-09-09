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
 *     path is a file that is not there, and with `O_NONBLOCK`, because the
 *     open runs on main's thread and `open(2)` of a NAMED PIPE with no writer
 *     BLOCKS UNTIL ONE ARRIVES: the Phase 226 verifier planted a FIFO at the
 *     path and one call froze the whole app for 5,002 ms until it was killed.
 *     Under `O_NONBLOCK` the same open returns at once (measured 0 ms), a
 *     regular file reads exactly as before, and the pipe is refused by the
 *     regular-file check below. A file whose owner write bit is clear is
 *     refused too, because `rename` needs the DIRECTORY's permission and not
 *     the file's, so without this clause a `chmod a-w` file was replaced
 *     with `wrote` where a plain save answers EACCES.
 *                                     `refused/missing | link | io | readOnly`
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
 *  8. `lstat` of the TARGET, compared with the `fstat` the read took: if what
 *     is there now is nothing, a link, or a regular file that is not THE
 *     SAME ENTRY, being the same inode with the same size, mtime and ctime,
 *     then the file changed under the write and the staged copy is
 *     discarded. A link is its own inode, so it is one case of "not the same
 *     entry" and needs no clause of its own; an append moves size and mtime;
 *     a swap moves the inode; a `chmod` moves ctime alone, and it is refused
 *     too, because the staged copy carries the mode the read saw and would
 *     put it back. `lstat` of the STAGED copy, compared with the `fstat` of
 *     the descriptor that wrote it: if it is a link or not the file Tortie
 *     wrote, somebody swapped it and it is discarded. `lstat` reports on the
 *     entry and never on what it points at.                      `refused/raced`
 *  9. `rename` of the staged copy onto the file, which is atomic on one
 *     volume, so a reader sees the old file or the new one and never a
 *     partial one. Lifted from `src/main/settings/store.ts`.        `wrote`
 *
 * Steps 3 to 9 are SYNCHRONOUS on purpose. There is no await between the
 * digest comparison and the rename, so nothing else in main can run in that
 * window. THE WINDOW IS NOT MICROSECONDS. As first shipped this paragraph
 * called what remained "the operating system's own", and the Phase 226
 * verifier measured it: the time from the hash to the rename is the time to
 * WRITE THE PAYLOAD, 23.6 ms for a file at the cap, and under a real process
 * appending to the file every `wrote` answered inside it, 4 of 4, lost lines.
 * Step 8's comparison is what closes it: the window that remains is the one
 * from that `lstat` to the `rename`, two system calls with nothing between
 * them, which is the same one the remote path's far side has. A change of
 * the same size inside one timestamp tick is the stated limit, and on APFS
 * the tick is a nanosecond.
 *
 * ## THE STAGED NAME, and why it is this one
 *
 * `<dir>/.<basename>.tortie-swap`. Research 86 section 7 measured git 2.50.1
 * and found that git hides NO name Tortie could choose inside a repository:
 * `git status` shows an untracked dotfile exactly as any other, `git add -A`
 * stages it and `git clean` takes it. So the requirement, a name nobody is
 * tempted to commit, is met by LIFETIME rather than by a name git overlooks.
 * The file exists for one write and one rename, 23.6 ms for a file at the
 * cap by the verifier's measurement and not the microseconds this sentence
 * first claimed, and only a crash between them leaves it; the name is
 * deterministic per target, so the next write to the same file finds the
 * leftover at step 7 and removes it without a directory scan; the dot keeps
 * it out of `ls` and most pickers;
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
 * ## STATED LIMITS, measured by the Phase 226 verifier and kept on purpose
 *
 * A HARD-LINKED target is replaced at this name only: the rename puts a new
 * inode here and the other name keeps the old bytes, exactly as
 * `settings/store.ts` does, and a write that edited the shared inode in
 * place would not be atomic. A DIRECTORY planted at the staged name is
 * refused `io` (EEXIST) and left where it is, because Tortie did not make it.
 * A file owned by SOMEBODY ELSE with its owner bit set is written if the
 * directory allows the rename, where a plain save would answer EACCES; the
 * read-only refusal reads the owner bit and not the caller's rights, so it
 * is the same answer under every uid. A lone surrogate in the CONTENTS lands
 * as U+FFFD, which is the caller's own bytes; Phase 227 cannot produce one
 * from a decoded file. A read-only file is refused before its digest is
 * compared, so a caller holding a stale digest of one hears `readOnly`.
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
import type { BigIntStats } from 'node:fs';
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
  /**
   * PHASE 244, audit finding F4. The gate's second seam, never passed by the
   * product: runs after `fstat` has decided the file's size and before the
   * first byte is read.
   *
   * That is the boundary the finding is about, and until this phase nothing
   * outside a module mock could reach it, so `conformance:redline-write` had 28
   * readings and none of them was a file GROWING under the reader. The audit
   * named that gap: the reader consumed 16,777,217 bytes against a 5,242,880
   * cap because the budget was asked afterwards. An arm that cannot be driven is
   * a rule that cannot fail.
   */
  afterFstat?(target: string): void;
  /**
   * PHASE 244, audit finding F4. The gate's third seam, never passed by the
   * product: how many bytes the read actually consumed.
   *
   * It is asked ONCE, after the loop, and it is the only reading that tells a
   * bounded read from an unbounded one. Every other observable is identical
   * either way — the refusal, its word, its sentence, the untouched target and
   * the absent staged copy are all the same at the parent commit — so without
   * this the gate's growth arm would pass over the defect it exists to catch.
   */
  afterRead?(bytes: number): void;
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

/**
 * Whether two readings describe THE SAME ENTRY: one inode, unchanged size,
 * unchanged mtime and ctime. An append, a swap, a link put at the name, a
 * rewrite of the same size and a bare `chmod` each move at least one of the
 * four; a rewrite of the same size inside one timestamp tick moves none, and
 * that is the stated limit. Bigint stats, because `mtimeMs` is a double.
 */
function sameEntry(seen: BigIntStats, now: BigIntStats): boolean {
  return (
    seen.ino === now.ino &&
    seen.size === now.size &&
    seen.mtimeNs === now.mtimeNs &&
    seen.ctimeNs === now.ctimeNs
  );
}

/**
 * Read a descriptor to EOF, starting from what `fstat` said it holds, AND
 * STOPPING ONE BYTE PAST `budget`.
 *
 * PHASE 244, audit finding F4. This loop used to read to EOF whatever that
 * cost, and the cap was asked of the collected buffer afterwards. So a file that
 * grew between the `fstat` and the first `readSync` was consumed WHOLE before it
 * was refused: the audit's fixture started at one byte, appended 16 MiB at the
 * first read, and the reader consumed 16,777,217 bytes against a 5,242,880 cap,
 * in 258 synchronous `readSync` calls on main's thread. The measure step counted
 * the peak a second way and it is about TWICE the file, because the chunk list
 * is held and then `Buffer.concat` allocates a second full copy: 33,619,987
 * bytes of ArrayBuffer growth for a 16 MiB file.
 *
 * THE SENTINEL IS ONE BYTE, and it is told rather than inferred, which is the
 * same shape `remote-scripts.ts` uses for every capped stream over the link: a
 * loop that stopped exactly AT the budget could not tell a file of exactly the
 * cap from a file larger than it, and would then have to guess. Reading
 * `budget + 1` makes the caller's existing `overCap` question answer itself, so
 * the refusal, its word and its sentence are all unchanged.
 *
 * The peak is therefore bounded at about twice `budget` rather than at twice the
 * file, and in the ordinary case — a file that did not grow — the first buffer
 * is the whole answer and `Buffer.concat` never runs at all.
 *
 * IT STAYS SYNCHRONOUS. Phase 226 chose that so the `fstat`, the read and the
 * digest describe one moment, and Phase 240's save now depends on it; moving the
 * read behind an await would widen the race this module's `lstat`-to-`rename`
 * comparison exists to close, which is a bigger change than the one this finding
 * asks for.
 */
function readAllSync(fd: number, expected: number, budget: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  // One byte past the budget and never more, whatever the file does while this
  // is running.
  const ceiling = budget + 1;
  // The clamp is defence in depth rather than a live branch: the caller refuses
  // a file whose `fstat` size is already over the cap, so `expected` is inside
  // the budget on every reachable path today. It is here so a later round that
  // moves that refusal cannot make this loop overshoot in one call, and it is
  // deliberately NOT ablated, because a clause with no reachable behaviour is
  // not a check and a check that cannot fail is worse than none.
  let want = Math.min(Math.max(expected, 1), ceiling);
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
    // The sentinel is in hand: the file is longer than the budget allows and
    // nothing more needs to be read to say so.
    if (total >= ceiling) break;
    // The file was longer than fstat said, so it is growing. Keep reading, up to
    // what is left of the budget; the cap is asked of the total below.
    want = Math.min(64 * 1024, ceiling - total);
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
    const realRoot = await resolveOpenProjectRoot(input.root, () => deps.listProjectRoots());
    abs = (await resolveInsideRoot(realRoot, input.path)).abs;
  } catch (err) {
    return refused('outside', sentenceOf(err));
  }

  const name = basename(abs);
  // PHASE 244, audit finding F4. The LENGTH first, which allocates nothing:
  // `Buffer.byteLength` measures the encoding without performing it, so a
  // payload past the cap is refused below without ever holding its encoded
  // copy. The buffer itself is built at step 7, after every refusal that could
  // make it pointless.
  const payloadBytes = Buffer.byteLength(input.contents, 'utf8');

  // 3 to 6. The read, and the three refusals decided on what it found.
  let raw: Buffer;
  let mode: number;
  let seen: BigIntStats;
  let fd: number;
  try {
    // O_NONBLOCK: a named pipe with no writer blocks open(2) until one
    // arrives, and this runs on main's thread. See the header, step 3.
    fd = openSync(
      abs,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | constants.O_NONBLOCK
    );
  } catch (err) {
    const code = errnoOf(err);
    if (code === 'ENOENT') return refused('missing', `${name} is no longer there.`);
    if (code === 'ELOOP' || code === 'EMLINK') {
      return refused('link', `${name} is a link, and Tortie will not turn it into a file.`);
    }
    return refused('io', `${name} could not be opened (${code}).`);
  }
  try {
    const stat = fstatSync(fd, { bigint: true });
    if (!stat.isFile()) {
      return refused('io', `${name} is not a regular file.`);
    }
    mode = Number(stat.mode) & 0o7777;
    if ((mode & 0o200) === 0) {
      return refused('readOnly', `${name} is marked read-only, so Tortie left it alone.`);
    }
    const size = Number(stat.size);
    if (overCap(size)) {
      return refused('tooLarge', `${name} is too large for Tortie to rewrite whole.`);
    }
    if (overCap(payloadBytes)) {
      return refused('tooLarge', `The new contents of ${name} are too large to write.`);
    }
    seen = stat;
    deps.afterFstat?.(abs);
    // PHASE 244, finding F4. The budget is enforced INSIDE the loop now, and
    // what comes back is at most one byte past it, so the question below is the
    // same question and its answer costs bounded memory.
    raw = readAllSync(fd, size, READ_CAP_BYTES);
    deps.afterRead?.(raw.length);
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
  //
  // PHASE 244. The encoded payload is built HERE rather than at the top, so
  // every refusal above — outside the root, missing, a link, not a regular
  // file, read-only, either side over the cap, a stale digest, not UTF-8 —
  // costs no encoded copy of the new contents at all.
  const payload = Buffer.from(input.contents, 'utf8');
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
  let stagedSeen: BigIntStats;
  try {
    // The mode on the DESCRIPTOR, so the umask cannot narrow an executable
    // and no second path is resolved to set it.
    fchmodSync(out, mode);
    let written = 0;
    while (written < payload.length) {
      written += writeSync(out, payload, written, payload.length - written, written);
    }
    stagedSeen = fstatSync(out, { bigint: true });
  } catch (err) {
    closeSync(out);
    discard(staged);
    return refused('io', `${name} could not be written (${errnoOf(err)}).`);
  }
  closeSync(out);

  deps.afterStage?.(staged, abs);

  // 8 and 9. Ask the target and the staged copy whether each is still the
  // entry this call read or wrote, then swap.
  try {
    let now: BigIntStats;
    try {
      now = lstatSync(abs, { bigint: true });
    } catch {
      discard(staged);
      return refused('raced', `${name} went away while Tortie was writing it.`);
    }
    if (!sameEntry(seen, now)) {
      discard(staged);
      return refused(
        'raced',
        now.isSymbolicLink()
          ? `${name} became a link while Tortie was writing it.`
          : `${name} changed while Tortie was writing it, so nothing was written.`
      );
    }
    if (!sameEntry(stagedSeen, lstatSync(staged, { bigint: true }))) {
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
