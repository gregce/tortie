/**
 * The one write in this domain, and the reason it is shaped this way
 * (Phase 204).
 *
 * A CRASH MUST LEAVE THE OLD CREDENTIAL OR THE NEW ONE AND NEVER NEITHER.
 * That is the property the phase is judged on, and it is why every write in
 * this domain, into Tortie's own store and into a vendor's store alike, goes
 * through this one function. A second write shaped some other way would be a
 * second guarantee, and there would be no way to prove them both.
 *
 * THE THREE STEPS, and the ORDER is the guarantee rather than a style:
 *
 *   1. STAGE. Write the payload beside the real place, never over it.
 *   2. VERIFY. Read the staged copy back and refuse unless it is BYTE EQUAL.
 *      Nothing has touched the real place yet, so a refusal here leaves the
 *      store exactly as it was.
 *   3. COMMIT. One durable step, being a keychain update in place or a rename
 *      inside one directory, then read the real place back and refuse unless
 *      it too is byte equal.
 *
 * A crash before step 3 leaves the store holding what it held. A crash during
 * step 3 is inside the smallest durable step the backend has, so it lands on
 * the old value or the new one. The staged copy is discarded in a `finally`
 * whatever happened, so a failed write leaves no half entry behind for a later
 * round to find and trust.
 *
 * NO REFUSAL NAMES THE PAYLOAD, its length or any part of it. They name the
 * step and nothing else.
 */

/** What a write answered. */
export type SwapResult = { ok: true } | { ok: false; reason: string };

/**
 * One place a credential can be written, with a place beside it to stage in.
 *
 * Both backends implement this: a keychain item with a second item named
 * `<service>.pending` beside it, and a file with `<path>.pending` beside it
 * whose commit is the rename that makes it the file.
 */
export interface SwapTarget {
  /** What the real place holds now, or null. */
  read(): Promise<string | null>;
  /** Write the payload to the staged place. Never over the real one. */
  stage(payload: string): Promise<void>;
  /** What the staged place holds now, or null. */
  readStaged(): Promise<string | null>;
  /** Make the staged copy the real one, in ONE durable step. */
  commit(payload: string): Promise<void>;
  /** Drop the staged copy. Called in a `finally`, and never fails a write. */
  discard(): Promise<void>;
}

/** How far a write got. The gate drives each arm and kills at each step. */
export type SwapStep = 'stage' | 'verify' | 'commit' | 'confirm';

/**
 * Write a payload so that the place holds the old value or the new one.
 *
 * `stopAfter` exists for the gate alone and is never passed by the product: it
 * ends the write after the named step, which is how the interrupted write is
 * proved arm by arm rather than described.
 */
export async function safeSwap(
  target: SwapTarget,
  payload: string,
  stopAfter?: SwapStep
): Promise<SwapResult> {
  if (typeof payload !== 'string' || payload === '') {
    return { ok: false, reason: 'There was nothing to write.' };
  }
  try {
    try {
      await target.stage(payload);
    } catch {
      return { ok: false, reason: 'Nothing could be written, so nothing changed.' };
    }
    if (stopAfter === 'stage') {
      return { ok: false, reason: 'The write was stopped after staging.' };
    }
    let staged: string | null;
    try {
      staged = await target.readStaged();
    } catch {
      staged = null;
    }
    if (staged !== payload) {
      return {
        ok: false,
        reason: 'What was written did not read back the same, so nothing changed.'
      };
    }
    if (stopAfter === 'verify') {
      return { ok: false, reason: 'The write was stopped after the check.' };
    }
    try {
      await target.commit(payload);
    } catch {
      return { ok: false, reason: 'The change could not be finished, so nothing changed.' };
    }
    if (stopAfter === 'commit') {
      return { ok: false, reason: 'The write was stopped after the swap.' };
    }
    let settled: string | null;
    try {
      settled = await target.read();
    } catch {
      settled = null;
    }
    if (settled !== payload) {
      return { ok: false, reason: 'The change could not be confirmed.' };
    }
    return { ok: true };
  } finally {
    if (stopAfter !== 'stage' && stopAfter !== 'verify' && stopAfter !== 'commit') {
      try {
        await target.discard();
      } catch {
        // A staged copy that will not go changes nothing about what the real
        // place holds, and failing the write for it would be worse.
      }
    }
  }
}
