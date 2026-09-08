/**
 * The rewind's ONE call site (Phase 227).
 *
 * This is the only place in the redline that names a write. Everything about
 * the decision is in ./rewind, which is pure; this file adds exactly the two
 * things a decision cannot have on its own, being the re-read of the file at
 * the moment of the press and the guarded write of what the decision returned,
 * both through the bridge. `npm run conformance:redline` rule 9 permits the
 * one `writeGuarded` call here and forbids a write anywhere else in the
 * redline, and it proves that the function holding it asks the generation
 * guard first and the re-read second, read by matching braces.
 *
 * THE ORDER IS THE SAFETY PROPERTY (research 83 B.8a, E.7, E.7a):
 *
 *   1. The generation guard, BEFORE any read. A press is bound to the baseline
 *      generation the picture it pressed was drawn against; if the baseline
 *      has moved since, the identity's coordinate system moved while the
 *      identity did not, so it refuses rather than resolving to the wrong
 *      change with the write succeeding.
 *   2. Re-read the file, never savedContents, which trails disk by 600 to 800
 *      ms (research 83 B.4d). A truncated read is refused by the pure planner.
 *   3. The pure decision recomposes against the same baseline and the fresh
 *      bytes and answers the bytes to write or a word to refuse with.
 *   4. The guarded write, with the digest of exactly the bytes read as the
 *      compare-and-swap precondition, so an edit that lands between the read
 *      and the write is refused by the channel rather than written over.
 *
 * Undo is the same function pointed the other way (kind: 'undo'): the same
 * generation guard, the same re-read, the same guarded write, its identity
 * coming from the tab's in-memory journal rather than from focus.
 *
 * THE STATED LIMIT, and it is the channel's, measured by the Phase 227
 * verifier and re-derived by its fix round. The precondition closes every
 * write that lands between the re-read here and the channel's own read, and
 * the channel's `lstat` closes every write that lands before it; what is left
 * is the window between that `lstat` and the `rename`, two system calls, and
 * a write of the SAME SIZE inside it is written over. Under a process
 * rewriting the file every few microseconds, which no editor and no agent
 * does, the verifier read 15 of 25 `wrote` answers and the fix round 1 of 5
 * over 32,921 rewrites in eight seconds landing on top of such a write. It is
 * `src/main/fs/guarded-write.ts`'s window and is stated in its header; a
 * `renamex_np(RENAME_SWAP)` with a check of the swapped-out inode would close
 * it and needs a native call Node does not expose. Everything outside that
 * window answers `stale` or `raced` and writes nothing.
 */

import { gmuxBridge } from '../bridge';
import { planRewind, rewindRefusalKey } from './rewind';
import type { PressedIdentity, RewindRefusal } from './rewind';

/** Everything the one call site needs, gathered by the view at press time. */
export interface RewindContext {
  /** The open project root, absolute (tab.repoPath). */
  root: string;
  /** The file, absolute (tab.path). */
  path: string;
  /** The shadow baseline the view drew against, the immutable left side. */
  baseline: string;
  /** The baseline generation now, read fresh at the press. */
  generation: number;
  /** The generation the pressed picture was drawn against (off the wrapper). */
  drawnGeneration: number;
  /** The change, by its own bytes and its baseline offset. */
  pressed: PressedIdentity;
  /** A rewind reverts the change; an undo puts a rewound change back. */
  kind: 'rewind' | 'undo';
}

export type RewindOutcome =
  | { wrote: string }
  | { refused: RewindRefusal };

/** The lowercase hex sha256 of one string, being the bytes the caller read. */
async function sha256Hex(text: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) return null;
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Apply one rewind or undo. The generation guard is first, before any read;
 * the re-read is next; the pure decision is third; the guarded write is last,
 * against the digest of the bytes just read. Answers `wrote` with the digest
 * of the new bytes or `refused` with a word the view turns into a sentence.
 */
export async function applyRewind(ctx: RewindContext): Promise<RewindOutcome> {
  // 1. The generation guard, before a byte is read (research 83 B.8a).
  if (ctx.drawnGeneration !== ctx.generation) return { refused: 'baselineMoved' };
  const bridge = gmuxBridge();
  if (bridge === undefined) return { refused: 'io' };
  // 2. Re-read the file at the moment of the press.
  let read;
  try {
    read = await bridge.fs.readFile(ctx.path);
  } catch {
    return { refused: 'io' };
  }
  // 3. The pure decision recomposes and resolves the pressed identity.
  const plan = planRewind({
    baseline: ctx.baseline,
    baselineGeneration: ctx.generation,
    drawnGeneration: ctx.drawnGeneration,
    fresh: read.contents,
    truncated: read.truncated,
    pressed: ctx.pressed,
    kind: ctx.kind
  });
  if (plan.outcome === 'refused') return { refused: plan.why };
  const expect = await sha256Hex(read.contents);
  if (expect === null) return { refused: 'io' };
  // 4. The guarded write, against the digest of exactly the bytes read.
  let result;
  try {
    result = await bridge.fs.writeGuarded({
      root: ctx.root,
      path: ctx.path,
      expect,
      contents: plan.contents
    });
  } catch {
    return { refused: 'io' };
  }
  const key = rewindRefusalKey(result);
  if (key === null && result.outcome === 'wrote') return { wrote: result.sha256 };
  return { refused: key ?? 'io' };
}
