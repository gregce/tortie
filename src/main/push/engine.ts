/**
 * The push engine (Phase 314, SPEC §3): WHEN an alert goes, and to whom.
 *
 * THE TRIGGER is a row that JOINS the blocked set, which is `blockedSince`'s
 * own shape (`../tray/attention.ts`): a session is stamped on the tick it is
 * first seen needing input and holds its stamp after that. `observe()` is
 * called on every broadcast and compares the door's rows with the last ones it
 * saw. Nothing else starts a send.
 *
 * THE WAKE RULE IS THE DESIGN. The 1 Hz poll does not run while the Mac is
 * asleep, so everything that blocked during a sleep is first seen on the wake
 * tick. Under a naive "a row joined" rule each one would go out as a fresh
 * alert, hours late, with a young age. So on `resume` the engine opens a window
 * of `WAKE_WINDOW_MS`, every join inside it is SUPPRESSED into the pending set,
 * and ONE flush at the end of the window says them all in one count alert whose
 * body starts `Seen when your Mac woke` when any of them was first seen then.
 * Whether a row was is read off the door's row (`seenAtWake`, computed by
 * `blockedAge` and nowhere here), so the alert and the door cannot disagree.
 *
 * ORDINARY TIME COALESCES TOO. The first join after a send opens a window and
 * the flush fires at `max(COALESCE_MS, lastSentAt + ALERT_FLOOR_MS - now)` on
 * the MONOTONIC clock, so twenty rows flipping at once are one alert and a wall
 * clock moved backwards cannot delay a send by an hour. The wall clock is used
 * for `apns-expiration` here and for `iat` in the sender, and for nothing else.
 *
 * NOTHING RISES FOR `working` OR `idle`, because a join is a row entering
 * `attentionRows`, which admits `needs_input` alone. NOTHING RISES FOR A ROW ON
 * ANOTHER MACHINE: those rows are dropped from everything this engine reads
 * before anything else happens. THE BADGE IS THE BLOCKED COUNT and rises for
 * nothing but an alert; a count that falls below the last badge sent is
 * corrected by a badge-only send that carries no word.
 *
 * INERT. `observe()` keeps a set of ids in memory and does nothing else unless
 * a join or a fall happened; only then does it ask for destinations, and an
 * empty answer schedules nothing, reads no key, opens no connection and writes
 * no log line. The key is read only inside a flush.
 *
 * A DROPPED TOKEN IS DEAD FOR THIS RUN WHATEVER THE HOST MANAGED TO WRITE
 * (the fix round). The host remembers a drop in its sealed store, and a seal
 * that cannot be written left the store answering the dead token, so every
 * later alert asked Apple about it again. The engine keeps its own set of dead
 * digests and reads every destination through it, and a token two pairings
 * presented is asked once.
 *
 * WHAT IT SAYS. Five sentences, `@shared/push-copy`'s, each said at most once
 * per run whatever happens after. No log line carries a key, a device token, a
 * provider token, a payload or any word of an alert.
 */

import type { PocketBlockedRow } from '@shared/ipc/pocket';
import {
  PUSH_CLOCK_BEHIND,
  PUSH_KEY_REFUSED,
  PUSH_NO_KEY,
  PUSH_TOKEN_STOPPED,
  PUSH_UNREACHABLE,
  type PushSentenceId
} from '@shared/push-copy';
import type { ApnsProviderKey } from '../credentials/apns-key';
import type { PocketPushDestination } from '../pocket/pairing';
import { WAKE_WINDOW_MS, type WakeWindow } from '../tray/attention';
import { getLog } from '../log';
import { composeAlert, composeBadge, type AlertPlan } from './alert';
import { providerKeyDigest, type ApnsAnswer, type ApnsSender } from './apns';

/** The spread across which rows flipped by one event are confirmed (2 ticks x 2 s idle poll). */
export const COALESCE_MS = 4_000;

/** The least time between two sends to a phone. Chosen. */
export const ALERT_FLOOR_MS = 30_000;

/** A send Apple could not take is tried exactly once more, this long after. */
export const RETRY_AFTER_MS = 15_000;

/** How long `join()` waits for a send in flight before it stops waiting. */
export const JOIN_BOUND_MS = 3_000;

export interface PushEngineDeps {
  /** The door's own `/v1/blocked` rows. */
  rows(): readonly PocketBlockedRow[];
  destinations(): readonly PocketPushDestination[];
  providerKey(): Promise<ApnsProviderKey | null>;
  sender: ApnsSender;
  drop(destination: PocketPushDestination): void;
  wake: {
    onSuspend(cb: () => void): () => void;
    onResume(cb: (w: WakeWindow) => void): () => void;
  };
  now?(): number;
  monotonic?(): number;
  /** Default `setTimeout(...).unref()`. Answers the cancel. */
  schedule?(fn: () => void, ms: number): () => void;
  /** Default: the log. The engine itself makes each id said at most once per run. */
  say?(id: PushSentenceId): void;
}

export type PushEngineState = 'inert' | 'ready' | 'asleep' | 'no-key' | 'refused';

export interface PushEngine {
  observe(): void;
  status(): {
    readonly state: PushEngineState;
    readonly sentence: string | null;
    readonly lastBadge: number | null;
    readonly pending: number;
  };
  /** Admission closed on its FIRST line, before any await. */
  beginShutdown(): void;
  /** Bounded. */
  join(): Promise<void>;
}

const SENTENCES: Readonly<Record<PushSentenceId, string>> = {
  'no-key': PUSH_NO_KEY,
  'refused-key': PUSH_KEY_REFUSED,
  clock: PUSH_CLOCK_BEHIND,
  dropped: PUSH_TOKEN_STOPPED,
  unreachable: PUSH_UNREACHABLE
};

const engineLog = getLog('push');

const UNREACHABLE: ApnsAnswer = { ok: false, status: 0, reason: 'Unreachable', kind: 'retry' };

function defaultSchedule(fn: () => void, ms: number): () => void {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return () => clearTimeout(timer);
}

/** What one flush sent, kept for its one retry. */
interface RetryPlan {
  readonly kind: AlertPlan['kind'];
  /** The ids the failed alert announced, in its order. */
  readonly announced: readonly string[];
  /** The badge the failed send carried. */
  readonly badge: number;
  readonly destinations: readonly PocketPushDestination[];
}

export function createPushEngine(deps: PushEngineDeps): PushEngine {
  const now = (): number => deps.now?.() ?? Date.now();
  const monotonic = (): number => deps.monotonic?.() ?? performance.now();
  const schedule = deps.schedule ?? defaultSchedule;

  let closed = false;
  let seeded = false;
  let blocked = new Set<string>();
  const pending = new Set<string>();
  let lastBadge: number | null = null;
  let lastSentAt: number | null = null;
  let asleep = false;
  let wakeUntil: number | null = null;
  let timer: { readonly due: number; readonly cancel: () => void } | null = null;
  const retries = new Map<() => void, RetryPlan>();
  const inflight = new Set<Promise<void>>();
  let refusedDigest: string | null = null;
  let noKey = false;
  let lastDestinationCount: number | null = null;
  let condition: PushSentenceId | null = null;
  const said = new Set<PushSentenceId>();
  /** Digests Apple called gone, this run. Read before anything is asked. */
  const dead = new Set<string>();

  const say = (id: PushSentenceId): void => {
    condition = id;
    if (said.has(id)) return;
    said.add(id);
    try {
      if (deps.say !== undefined) deps.say(id);
      else engineLog.warn(SENTENCES[id]);
    } catch {
      /* saying a sentence must never be what stops a send */
    }
  };

  /**
   * Where an alert may go now: the host's answer less every token Apple
   * called gone this run, and each token once, however many pairings
   * presented it.
   */
  function liveDestinations(): readonly PocketPushDestination[] {
    const seen = new Set<string>();
    const out: PocketPushDestination[] = [];
    for (const destination of deps.destinations()) {
      if (dead.has(destination.tokenDigest) || seen.has(destination.tokenDigest)) continue;
      seen.add(destination.tokenDigest);
      out.push(destination);
    }
    return out;
  }

  /** The delay a join or a fall arms: the coalescing window, or the floor when it is later. */
  function nextFlushDelay(): number {
    const floor = lastSentAt === null ? 0 : lastSentAt + ALERT_FLOOR_MS - monotonic();
    return Math.max(COALESCE_MS, floor);
  }

  /** Every row this engine reads, with the rows on another machine already gone. */
  function localRows(): readonly PocketBlockedRow[] {
    const rows = deps.rows().filter((row) => row.machine === null);
    return rows;
  }

  function cancelTimer(): void {
    if (timer === null) return;
    timer.cancel();
    timer = null;
  }

  /** Arm the flush at `delay` from now unless one is already due sooner. */
  function armFlush(delay: number): void {
    const due = monotonic() + delay;
    if (timer !== null && timer.due <= due) return;
    cancelTimer();
    const cancel = schedule(() => {
      timer = null;
      track(flush());
    }, delay);
    timer = { due, cancel };
  }

  /** Hold a send in flight for `join()`. A failure is caught here and never escapes. */
  function track(work: Promise<void>): void {
    const held = work.catch(() => {
      engineLog.warn('a push flush failed, and nothing was sent for it');
    });
    inflight.add(held);
    void held.then(() => inflight.delete(held));
  }

  function observe(): void {
    if (closed) return;
    const rows = localRows();
    const ids = new Set(rows.map((row) => row.sessionId));
    if (!seeded) {
      // The first sight of the blocked set is not a join, for any row in it:
      // on launch every row already waiting would otherwise be one. A row that
      // started waiting while Tortie was not running is never alerted; it is in
      // the badge of the next send and in the list when he opens the app.
      seeded = true;
      blocked = ids;
      return;
    }
    let joined = false;
    for (const id of ids) {
      if (!blocked.has(id)) {
        pending.add(id);
        joined = true;
      }
    }
    // A row that joined and left before its flush is not announced.
    for (const id of [...pending]) if (!ids.has(id)) pending.delete(id);
    // A FALL IS AN EVENT: a row left the blocked set on THIS observe, and the
    // count is now below the last badge delivered. Asked as a state alone, on
    // every broadcast of any session, a badge Apple refused was sent again
    // every few seconds beside its one retry (SPEC §2.7: one retry, and none
    // for a 429; the next join or fall sends the current state).
    let left = false;
    for (const id of blocked) if (!ids.has(id)) left = true;
    blocked = ids;
    const fell = left && lastBadge !== null && ids.size < lastBadge;
    if (!joined && !fell) return;
    if (asleep) return;
    if (wakeUntil !== null && monotonic() < wakeUntil) return;
    if (liveDestinations().length === 0) {
      // No paired phone with a live token, the switch off, or the door not
      // confirmed: nothing at all, and what joined is not carried to a later
      // send the person did not ask for.
      lastDestinationCount = 0;
      pending.clear();
      return;
    }
    armFlush(nextFlushDelay());
  }

  /**
   * What to send now, from the rows as they are now, or null for nothing. The
   * pending set is spent here. The blocked set is NOT touched: a row blocked
   * since the last broadcast is still a join the next `observe()` must see.
   */
  function planNow(): { plan: AlertPlan; announced: string[]; badge: number } | null {
    const rows = localRows();
    const announce = rows.filter((row) => pending.has(row.sessionId));
    pending.clear();
    if (announce.length > 0) {
      return {
        plan: composeAlert({ announce, blockedCount: rows.length }),
        announced: announce.map((row) => row.sessionId),
        badge: rows.length
      };
    }
    if (lastBadge !== null && rows.length < lastBadge) {
      return { plan: composeBadge(rows.length), announced: [], badge: rows.length };
    }
    return null;
  }

  async function flush(): Promise<void> {
    if (closed || asleep) return;
    const planned = planNow();
    if (planned === null) return;
    const destinations = liveDestinations();
    lastDestinationCount = destinations.length;
    if (destinations.length === 0) return;
    await deliver(planned.plan, planned.announced, planned.badge, destinations, true);
  }

  /** The key, or null after saying so once. Read only here, inside a flush. */
  async function readKey(): Promise<ApnsProviderKey | null> {
    let key: ApnsProviderKey | null = null;
    try {
      key = await deps.providerKey();
    } catch {
      key = null;
    }
    if (key === null) {
      noKey = true;
      say('no-key');
      return null;
    }
    noKey = false;
    return key;
  }

  async function deliver(
    plan: AlertPlan,
    announced: readonly string[],
    badge: number,
    destinations: readonly PocketPushDestination[],
    mayRetry: boolean
  ): Promise<void> {
    const key = await readKey();
    if (key === null || closed) return;
    const digest = providerKeyDigest(key);
    if (refusedDigest !== null && refusedDigest === digest) return;
    refusedDigest = null;
    if (plan.kind !== 'badge') lastSentAt = monotonic();
    const expiration = plan.ttlSeconds === 0 ? 0 : Math.floor(now() / 1000) + plan.ttlSeconds;
    // Named `apns`, not `sender`: this is an HTTP/2 POST to Apple, and the
    // IPC sample's scan reads `sender.send(` as a push to a renderer.
    const apns = deps.sender;
    const answers = await Promise.all(
      destinations.map(async (destination): Promise<[PocketPushDestination, ApnsAnswer]> => {
        try {
          const answer = await apns.send(key, {
            token: destination.token,
            environment: destination.environment,
            topic: key.topic,
            payload: plan.payload,
            priority: plan.priority,
            expiration,
            collapseId: plan.collapseId
          });
          return [destination, answer];
        } catch {
          return [destination, UNREACHABLE];
        }
      })
    );
    const again: PocketPushDestination[] = [];
    let delivered = false;
    for (const [destination, answer] of answers) {
      try {
        if (settle(destination, answer, digest, mayRetry ? again : null)) delivered = true;
      } catch {
        // One destination's bookkeeping failing must not skip the next one's.
      }
    }
    if (delivered) {
      lastBadge = badge;
      if (again.length === 0 && refusedDigest === null) condition = null;
      // A row that left while this send was in flight was judged against the
      // badge BEFORE it, so the phone now holds a badge above the count. That
      // is a fall, and it is corrected like one. Inside the wake window the
      // wake's own flush says the current count.
      if (
        !closed &&
        !asleep &&
        !(wakeUntil !== null && monotonic() < wakeUntil) &&
        localRows().length < badge
      ) {
        armFlush(nextFlushDelay());
      }
    }
    if (again.length > 0) armRetry({ kind: plan.kind, announced, badge, destinations: again });
  }

  /** What one destination's answer does. Answers whether it was delivered. */
  function settle(
    destination: PocketPushDestination,
    answer: ApnsAnswer,
    digest: string,
    retryInto: PocketPushDestination[] | null
  ): boolean {
    if (!answer.ok) {
      if (answer.kind === 'drop') deps.drop(destination);
      if (answer.kind === 'drop') dead.add(destination.tokenDigest);
      if (answer.kind === 'drop') say('dropped');
      if (answer.kind === 'stop') {
        // The fault is the key or its topic, not the phone: nothing more is
        // sent while this same key record is in place, and the token is kept.
        refusedDigest = digest;
        say('refused-key');
      }
      // A `reauth` that reaches the engine is Apple calling a token expired
      // AFTER the sender's one re-mint: a FRESH token judged over an hour old,
      // so this Mac's clock is behind Apple's and the key is fine. Nothing is
      // stopped and the token is kept; the next join mints again and tries,
      // which is what lets a corrected clock send.
      if (answer.kind === 'reauth') say('clock');
      if (answer.kind === 'retry' && retryInto !== null) retryInto.push(destination);
      if (answer.kind === 'retry' && retryInto === null) say('unreachable');
    }
    return answer.ok;
  }

  function armRetry(retry: RetryPlan): void {
    if (closed) return;
    if (asleep) {
      // A sleep cancels the retry; its rows fold into the wake's one alert.
      for (const id of retry.announced) pending.add(id);
      return;
    }
    const cancel = schedule(() => {
      retries.delete(cancel);
      track(runRetry(retry));
    }, RETRY_AFTER_MS);
    retries.set(cancel, retry);
  }

  /** The one retry, recomposed from the rows as they are now. */
  async function runRetry(retry: RetryPlan): Promise<void> {
    if (closed || asleep) return;
    const rows = localRows();
    const still = new Set(retry.announced);
    const announce = rows.filter((row) => still.has(row.sessionId));
    let plan: AlertPlan | null = null;
    if (retry.kind === 'badge') {
      // A badge may only ever fall, so a retry that would raise it says nothing.
      if (rows.length <= retry.badge) plan = composeBadge(rows.length);
    } else if (announce.length > 0) {
      plan = composeAlert({ announce, blockedCount: rows.length });
    }
    if (plan === null) return;
    // A destination dropped or withdrawn in the meantime is not retried.
    const live = new Set(liveDestinations().map((d) => d.tokenDigest));
    const destinations = retry.destinations.filter((d) => live.has(d.tokenDigest));
    if (destinations.length === 0) return;
    await deliver(
      plan,
      announce.map((row) => row.sessionId),
      rows.length,
      destinations,
      false
    );
  }

  function cancelRetries(): void {
    for (const [cancel, retry] of [...retries]) {
      cancel();
      for (const id of retry.announced) pending.add(id);
    }
    retries.clear();
  }

  const offSuspend = deps.wake.onSuspend(() => {
    if (closed) return;
    asleep = true;
    // The rows already pending stay pending, and fold into the wake's alert.
    cancelTimer();
    cancelRetries();
    // Its sockets do not survive a sleep.
    void deps.sender.close().catch(() => undefined);
  });

  const offResume = deps.wake.onResume(() => {
    if (closed) return;
    asleep = false;
    wakeUntil = monotonic() + WAKE_WINDOW_MS;
    cancelTimer();
    const cancel = schedule(() => {
      timer = null;
      track(flush());
    }, WAKE_WINDOW_MS);
    timer = { due: wakeUntil, cancel };
  });

  return {
    observe,

    status() {
      const state: PushEngineState = asleep
        ? 'asleep'
        : refusedDigest !== null
          ? 'refused'
          : noKey
            ? 'no-key'
            : lastDestinationCount === null || lastDestinationCount === 0
              ? 'inert'
              : 'ready';
      return {
        state,
        sentence: condition === null ? null : SENTENCES[condition],
        lastBadge,
        pending: pending.size
      };
    },

    beginShutdown(): void {
      closed = true;
      cancelTimer();
      for (const cancel of retries.keys()) cancel();
      retries.clear();
      offSuspend();
      offResume();
    },

    async join(): Promise<void> {
      const work = Promise.allSettled([...inflight]).then(() => undefined);
      await new Promise<void>((resolve) => {
        const cancel = schedule(resolve, JOIN_BOUND_MS);
        void work.then(() => {
          cancel();
          resolve();
        });
      });
      await deps.sender.close().catch(() => undefined);
    }
  };
}
