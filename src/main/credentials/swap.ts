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
 * A CRASH CANNOT BE MADE TO RUN A `finally`, and the verification measured
 * what that leaves: after three real kills the store held the old credential
 * or the new one every time, which is the property, but two of the three left
 * a whole credential in the staged place and nothing in the product ever
 * removed one. Step 1 is not the answer, because staging OVERWRITES on both
 * backends, a file write and `add-generic-password -U` alike, so a later write
 * to the same place already replaces the residue; a discard added in front of
 * it was measured to change nothing except one more `security` call per write,
 * and it was taken out again. The store that is never written again is the
 * real gap, and `../credentials/keep.ts` sweeps it once per run.
 *
 * NO REFUSAL NAMES THE PAYLOAD, its length or any part of it. They name the
 * step and nothing else.
 */

import { LOGIN_TOO_LARGE_SENTENCE } from '@shared/login-copy';
import type { LoginRefusalWhy } from '@shared/logins';

/**
 * A target refused a payload too large for its store (Phase 287). No length, no
 * byte of it.
 *
 * IT LIVES HERE RATHER THAN BESIDE THE KEYCHAIN because it belongs to the
 * contract of the one write: `./security.ts` raises it, both backends' `put`
 * pass it straight through, and both catches below are the only places in the
 * domain that read it. A `false` could not carry it, because `false` is already
 * every other refusal a write can make and this one has a sentence of its own.
 */
export class CredentialTooLarge extends Error {
  readonly why = 'too-large' as const;
  constructor() {
    super('a credential too large for one security line');
    this.name = 'CredentialTooLarge';
  }
}

/** What a write answered. */
export type SwapResult =
  | { ok: true }
  | { ok: false; reason: string; why?: LoginRefusalWhy };

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
    } catch (err) {
      // PHASE 287. A PAYLOAD ONE `security` LINE CANNOT CARRY IS ITS OWN
      // REASON. Nothing was staged and the store holds what it held; what is
      // different is that a person can be told why, and that the lift above can
      // decide whether anything needed writing at all.
      //
      // IT DOES NOT SAY "NOTHING WAS SPAWNED", which an earlier draft of this
      // comment did and which Phase 287's verifier measured false at both
      // builds: `safeSwap`'s own `finally` calls `target.discard()` whatever the
      // stage did, so a refused too-large stage spawns exactly one
      // `security delete-generic-password` for the pending name and moves
      // `securityCallCount()` by one. That is unchanged from the parent, so it is
      // no regression — but this is the one domain that holds a person's sign in
      // and a comment that undercounts its own children misleads the next reader.
      if (err instanceof CredentialTooLarge) {
        return { ok: false, reason: LOGIN_TOO_LARGE_SENTENCE, why: 'too-large' };
      }
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
    } catch (err) {
      // The commit line is shorter than the staged one, whose name carries the
      // `.pending` suffix, so this arm is unreachable by construction today.
      // It is written anyway: the two catches must not disagree about what this
      // refusal is, and a later backend could name its places the other way.
      if (err instanceof CredentialTooLarge) {
        return { ok: false, reason: LOGIN_TOO_LARGE_SENTENCE, why: 'too-large' };
      }
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
