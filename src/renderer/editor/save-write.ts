/**
 * The save's ONE call site of the guarded write channel (Phase 240, issue 16).
 *
 * Sean Johnson, 2026-09-08: "When I edit a file, then save, there's no warning
 * if someone else (presumably an agent) edited it concurrently and I'm
 * overwriting its edits (as VSC does)."
 *
 * `save` in ./tab-io was `await gmux.fs.writeFile(tab.path, value)` and nothing
 * else: no mtime check, no size check, no `O_EXCL`, no `lstat`, and it follows
 * a symlink (research 83 A4.2 ruling 3). Phase 226 built the answer —
 * `fs:writeGuarded`, a compare-and-swap over one file that answers a WORD
 * rather than throwing — and Phase 227 pointed it at rewinds only. This file is
 * the second door onto it, and it is the whole of what this phase adds to the
 * write path. NOTHING ABOUT THE CHANNEL CHANGES.
 *
 * WHY A MODULE OF ITS OWN, rather than four lines inside `save`. Two reasons,
 * and the second is the one that matters. It is the sibling of
 * ./redline-write.ts, so the two doors onto this channel read the same way and
 * `npm run conformance:redline-write` rule 5 can keep naming them BOTH by name
 * rather than widening to "any file". And `npm run conformance:save` proves
 * that `save` itself no longer names `fs:writeFile` for a file inside a
 * project, read by matching braces; a channel call left inline would make that
 * question unaskable.
 *
 * THE PRECONDITION IS THE DIGEST OF WHAT TORTIE LAST READ, which is the tab's
 * own `savedContents` — by definition the bytes the person's buffer was built
 * from. The caller computes it, because the caller already has a digest
 * function for the remote save and a third copy of one would be the growth
 * guardrail's own example.
 *
 * ONE FALLBACK AND ONE ONLY, and it is `link`. See {@link SaveRefusalWord}.
 */

import { gmuxBridge } from '../bridge';
import type { FsGuardedWriteResult } from '@shared/fs-ops';
import type { SaveRefusalWord } from './save-sentences';

/** Everything one guarded save needs, gathered by the caller. */
export interface GuardedSaveContext {
  /** The open project root, absolute (tab.repoPath). */
  root: string;
  /** The file, absolute (tab.path). */
  path: string;
  /** Lowercase hex sha256 of the bytes Tortie last read from that file. */
  expect: string;
  /** The whole buffer, which is what a save writes. */
  contents: string;
}

/**
 * What one guarded save did.
 *
 *  - `wrote`      the file holds the buffer; the digest is of the NEW bytes,
 *                 so a caller can hand it straight back as the next `expect`
 *  - `stale`      the file does not hold what Tortie read; the digest is of
 *                 what it holds NOW, which is what makes a deliberate
 *                 Overwrite a guarded write of its own (charter item 3)
 *  - `refused`    a word the caller turns into a sentence (./save-sentences)
 *  - `unguarded`  the file is a symbolic link, so this save belongs to the old
 *                 door; nothing was written here
 */
export type GuardedSaveOutcome =
  | { outcome: 'wrote'; sha256: string }
  | { outcome: 'stale'; sha256: string }
  | { outcome: 'refused'; why: SaveRefusalWord }
  | { outcome: 'unguarded' };

/**
 * The channel's answer as a word a save can say, or `null` for `link`, which
 * is not a refusal a person ever reads.
 *
 * It is deliberately NOT `rewindRefusalKey` (./rewind). That map collapses
 * `input`, `missing` and `link` to `io`, which is right for a rewind and wrong
 * here: a person whose `notes.md` has been deleted under them deserves to be
 * told that rather than "could not be saved."
 */
export function saveRefusalWord(
  result: Extract<FsGuardedWriteResult, { outcome: 'refused' }>
): SaveRefusalWord | null {
  return result.why === 'link' ? null : result.why;
}

/**
 * Write one tab's buffer, only if the file still holds the bytes Tortie read.
 *
 * It never throws: a bridge that is not there and a channel that rejects both
 * answer `refused: 'io'`, which is the sentence for "the system refused a
 * step". The caller decides what to do with each word; this function makes no
 * decision a person can see.
 */
export async function guardedSave(
  ctx: GuardedSaveContext
): Promise<GuardedSaveOutcome> {
  const bridge = gmuxBridge();
  if (bridge === undefined) return { outcome: 'refused', why: 'io' };
  let result: FsGuardedWriteResult;
  try {
    result = await bridge.fs.writeGuarded({
      root: ctx.root,
      path: ctx.path,
      expect: ctx.expect,
      contents: ctx.contents
    });
  } catch {
    return { outcome: 'refused', why: 'io' };
  }
  if (result.outcome === 'wrote') return { outcome: 'wrote', sha256: result.sha256 };
  if (result.outcome === 'stale') return { outcome: 'stale', sha256: result.sha256 };
  const why = saveRefusalWord(result);
  return why === null ? { outcome: 'unguarded' } : { outcome: 'refused', why };
}
