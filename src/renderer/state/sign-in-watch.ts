/**
 * A finished sign in says it finished (Phase 203).
 *
 * ## The defect, and why the fix is a sentence rather than a lifecycle change
 *
 * The operator's words on 2026-09-02: *"it open up a claude, then opens up a
 * website and then the session dies and it doesn't login"*. Two of those three
 * things are the flow working. Add login starts ONE ORDINARY SESSION running
 * the vendor's own sign in command, the vendor opens the person's browser, and
 * when the vendor is done the command exits, so the session ending is correct
 * and the pane closing is correct. THE SIGN IN HAD SUCCEEDED. What was missing
 * was anything at all saying so, and the list behind it was answering the
 * wrong question anyway, which is the other half of this phase.
 *
 * So nothing about how a session lives or dies is touched here. One sentence
 * is posted when the sign in session ends, naming the login and whether a
 * credential now exists, and the login list is re read BEFORE the sentence is
 * composed, so what a person reads is what Tortie found rather than what
 * Tortie hoped.
 *
 * ## WHY IT IS WATCHED HERE RATHER THAN IN MAIN
 *
 * A sign in session runs one command that exits cleanly. `remain-on-exit
 * failed` closes both the pane and the session on a clean exit, and the
 * activity monitor only reaps sessions that still have a pane, so a finished
 * sign in is settled by reconcile and lands on `restorable` rather than
 * `exited`. A main side hook on the reap would therefore be on the wrong
 * function. The store sees BOTH routes, being the status event and the whole
 * list reconcile, so the watch sits where both arrive.
 *
 * ## ABSENCE ONLY COUNTS ONCE THE SESSION HAS BEEN SEEN
 *
 * A create resolves before the list that holds the new session does, so a list
 * that arrives in between does not hold the id. Treating that as a finished
 * sign in would post the sentence a second after the browser opened. The watch
 * therefore waits until it has seen the session at least once, and only then
 * reads absence as the end of it.
 */

import type { LoginProviderId, LoginRow } from '@shared/logins';
import { loginSignInDoneLine } from '@shared/login-copy';
import { useLogins } from './logins';

/** The statuses that mean the vendor's own command has stopped running. */
const FINISHED = new Set(['exited', 'restorable', 'discarded']);

/**
 * How long a sign in nobody completes is watched for.
 *
 * A person who opens the browser and walks away has a session that goes on
 * running, and a sentence an hour later would be about nothing they remember.
 * The entry is dropped silently at this point and no sentence is posted.
 */
export const SIGN_IN_WATCH_MAX_MS = 30 * 60 * 1000;

interface Pending {
  provider: LoginProviderId;
  login: string;
  startedAt: number;
  /** True once the session has appeared in a list, so absence can be read. */
  seen: boolean;
}

const pending = new Map<string, Pending>();

/** What the watch says, and how loudly. Injected so the store owns the queue. */
export type SignInSay = (kind: 'success' | 'info', text: string) => void;

/** Watch one sign in session. Called by the create that started it. */
export function watchSignIn(
  sessionId: string,
  provider: LoginProviderId,
  login: string,
  now: number = Date.now()
): void {
  pending.set(sessionId, { provider, login, startedAt: now, seen: false });
}

/** Test seam and teardown. Nothing is watched across an app start anyway. */
export function forgetSignInWatches(): void {
  pending.clear();
}

/** How many sign ins are being watched. Exported for the tests alone. */
export function pendingSignInCount(): number {
  return pending.size;
}

/**
 * Settle every watched sign in the sessions list says has ended.
 *
 * Called from both routes a status reaches the store by, so a sign in that
 * lands on `restorable` through reconcile is settled exactly as one that lands
 * on `exited` through the status event.
 */
export function settleSignIns(
  sessions: readonly { id: string; status: string }[],
  say: SignInSay,
  now: number = Date.now()
): void {
  if (pending.size === 0) return;
  for (const [id, row] of [...pending]) {
    const session = sessions.find((s) => s.id === id);
    if (session !== undefined) {
      row.seen = true;
      if (!FINISHED.has(session.status)) continue;
    } else if (!row.seen) {
      // The create has resolved and the list holding it has not arrived. That
      // is not a finished sign in, and reading it as one would post the
      // sentence a second after the browser opened.
      if (now - row.startedAt > SIGN_IN_WATCH_MAX_MS) pending.delete(id);
      continue;
    }
    pending.delete(id);
    void announce(row, say);
  }
  // A sign in nobody ever completes is dropped without a word.
  for (const [id, row] of [...pending]) {
    if (now - row.startedAt > SIGN_IN_WATCH_MAX_MS) pending.delete(id);
  }
}

/**
 * Re read the list, then say what is true.
 *
 * The read is what refreshes the menu behind the sentence, so a person who
 * opens the meter's card straight after sees the same answer the sentence
 * gave. A read that fails leaves the last list on screen and the sentence is
 * composed from that, which is the honest answer available.
 */
async function announce(row: Pending, say: SignInSay): Promise<void> {
  await useLogins.getState().load();
  const found: LoginRow | null =
    useLogins
      .getState()
      .snapshot.logins.find(
        (l) => l.provider === row.provider && l.name === row.login
      ) ?? null;
  say(
    found !== null && found.present ? 'success' : 'info',
    loginSignInDoneLine(row.login, found)
  );
}
