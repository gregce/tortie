/**
 * The one place main says "a durability layer is degraded" (Phase 19 item 9).
 *
 * Four items in this phase found a state the user must hear about and had
 * nowhere to say it, so each of them had invented nothing, or a `console.warn`
 * the shipped app has no terminal for. They all call `postDurabilityNotice`
 * now. The shapes are in src/shared/notice.ts and the words are in the
 * renderer.
 *
 * THREE RULES ARE ENFORCED HERE, not by the callers:
 *
 * 1. ONE PER KIND PER APP RUN. A capture pass that fails for forty three
 *    sessions is one notice, not forty three, and a second failed pass five
 *    minutes later is silent. The latch resets only when the app is
 *    relaunched, which is also when the user gets a fresh chance to see the
 *    state. `postDurabilityNotice` returns false when it swallowed a repeat,
 *    so a caller can still log the detail it wanted to say.
 *
 * 2. A NOTICE POSTED BEFORE ANY RENDERER EXISTS IS KEPT, NOT LOST. The
 *    manifest quarantine fires while the database is being opened, which is
 *    before the first window is created. Those go on a queue that the renderer
 *    drains once, over `notice:pending`, immediately after it subscribes.
 *
 * 3. NOTHING IS SAID TWICE. A notice is either broadcast (a renderer has
 *    already drained the queue, so it is listening) or queued (it has not).
 *    Never both.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO: it has no healthy counterpart, no
 * count, no history the UI can page through, and no way to ask "is everything
 * fine". ZEN-OF-TORTIE settles that, and Phase 19's own brief repeats it: this
 * is a notice, not a dashboard.
 */

import type { DurabilityNotice } from '@shared/notice';
import { EVT_SCROLLBACK_NOTICE } from '@shared/ipc';
import { broadcastEvent } from '../typed-events';

/** Kinds already said this run. The latch behind rule 1. */
const said = new Set<DurabilityNotice['kind']>();

/** Posted with no renderer listening. Drained by `notice:pending`. */
let queued: DurabilityNotice[] = [];

/**
 * Set by the first `notice:pending` drain. Before it, a renderer may exist as
 * a window while its subscription does not, so "is a window open" is the wrong
 * question and "has a renderer asked me for its backlog" is the right one.
 */
let rendererListening = false;

/**
 * Say one degraded state, at most once per app run.
 *
 * @returns true when the notice was sent or queued, false when the same kind
 *          had already been said and this call was swallowed.
 */
export function postDurabilityNotice(notice: DurabilityNotice): boolean {
  if (said.has(notice.kind)) return false;
  said.add(notice.kind);
  if (rendererListening) {
    broadcastEvent(EVT_SCROLLBACK_NOTICE, notice);
  } else {
    queued.push(notice);
  }
  return true;
}

/**
 * Hand the renderer everything posted before it was listening, and empty the
 * queue. Called by the `notice:pending` handler and by nothing else.
 */
export function takePendingNotices(): DurabilityNotice[] {
  rendererListening = true;
  const out = queued;
  queued = [];
  return out;
}

/**
 * Has this kind already been said this run? Only for callers that want to log
 * the detail of a repeat they know will be swallowed.
 */
export function hasSaidNotice(kind: DurabilityNotice['kind']): boolean {
  return said.has(kind);
}

/** Tests only. There is no product path that clears the latch. */
export function resetDurabilityNoticesForTests(): void {
  said.clear();
  queued = [];
  rendererListening = false;
}
