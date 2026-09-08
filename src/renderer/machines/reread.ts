/**
 * When a remote view reads again, decided in one place (Phase 230).
 *
 * THE SHAPE THIS LIFTS. Phase 90.3's fix round gave two views one extra read
 * the moment their machine started answering, being the Explorer's Files
 * section and Source control's Changes group, and it wrote the same eight
 * lines into each: a `retried` ref holding the target the retry was spent on,
 * cleared only when the machine stopped answering, and a check that the held
 * answer was a CONNECTION shaped refusal and not the folder's own. Research 85
 * section 4.1 measured that History, Branch, Runs, Context and Search did not
 * carry it, so a sentence saying the machine did not answer stayed on screen
 * with the link long since connected. Phase 230 applies the shape to all seven
 * views through one hook, ../machines/use-remote-reread.ts, and this file is
 * the part of it that can be tested without a document.
 *
 * WHAT A VIEW HOLDS, in four words. Every store keeps its own fields, so each
 * consumer folds its own state into one of these before asking:
 *
 *   none      nothing has been asked for this target; the store's own first
 *             read is what happens next, and this module says nothing
 *   reading   a read is in flight; nothing is asked twice
 *   refused   the last read was refused by the LINK, being `notConnected`,
 *             `unreachable` or a thrown call. This is the only word the sign
 *             in retry acts on
 *   answered  the machine answered, and the answer may be rows or the folder's
 *             own refusal (missing, denied, not a repository, no branch).
 *             Asking again after a folder's own answer gives the same answer,
 *             so the sign in retry never fires on it
 *
 * NO TIMER. Nothing in this file schedules anything; it answers a question at a
 * moment somebody else chose, being the link moving, the view being looked at,
 * the window regaining focus, or one of Tortie's own writes landing. Research
 * 85 section 8 rules that a remote folder is never a subscription, and this
 * module cannot become one because it holds no clock.
 */

/** What the store holds for the target a view is drawing. */
export type RereadHeld = 'none' | 'reading' | 'refused' | 'answered';

/**
 * Fold a mode word into what it means for a re-read.
 *
 * The three group stores and the Search and Context stores each answer with a
 * mode word from main, and two of those words in every union mean the link
 * refused rather than the machine answered. They are spelled the same in all
 * five unions, which is what lets one function read them.
 */
export function heldOfMode(
  mode: string | null,
  reading: boolean
): RereadHeld {
  if (reading) return 'reading';
  if (mode === null) return 'none';
  if (mode === 'notConnected' || mode === 'unreachable') return 'refused';
  return 'answered';
}

/** The sign in retry, being one extra read per sign in and never more. */
export interface SignInRetry {
  /**
   * Ask whether one more read is owed right now.
   *
   * `key` is the target's key, or null on a local tab. `answering` is whether
   * the machine is up. `held` is what the store holds for that key. The answer
   * is true exactly once per sign in per key, and only while the held answer
   * is a link refusal.
   */
  consider(key: string | null, answering: boolean, held: RereadHeld): boolean;
}

/**
 * One retry per sign in.
 *
 * `retried` holds the key the retry was spent on. It is cleared when the
 * machine stops answering, so the next sign in buys one more read, and it is
 * cleared on a local tab, so a view that moves from a machine to this Mac and
 * back starts fresh. A read that fails again leaves the sentence up until the
 * view is looked at again, which is the honest outcome.
 */
export function createSignInRetry(): SignInRetry {
  let retried: string | null = null;
  return {
    consider(key, answering, held) {
      if (key === null) {
        retried = null;
        return false;
      }
      if (!answering) {
        // The next sign in to this machine buys one more read.
        retried = null;
        return false;
      }
      if (held !== 'refused') return false;
      if (retried === key) return false;
      retried = key;
      return true;
    }
  };
}

/** The question every other moment asks. */
export interface RereadAsk {
  /** The target's key, or null on a local tab. */
  key: string | null;
  /** Whether the machine is answering right now. */
  answering: boolean;
  /** What the store holds for that key. */
  held: RereadHeld;
  /** Whether the view is looking, being mounted and not collapsed. */
  active: boolean;
}

/**
 * Whether a view that was looked at, focused or written under should read.
 *
 * It reads when there is something on screen to bring up to date, being an
 * answer or a refusal, and never when nothing has been asked yet, because the
 * store's own first read owns that moment; never while a read is in flight;
 * never on a local tab; never while the machine is not answering, because the
 * read would be refused and the sign in retry owns the moment it comes back;
 * and never for a view nobody is looking at.
 */
export function rereadNow(ask: RereadAsk): boolean {
  if (ask.key === null) return false;
  if (!ask.active) return false;
  if (!ask.answering) return false;
  return ask.held === 'refused' || ask.held === 'answered';
}
