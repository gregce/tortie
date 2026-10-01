/**
 * The creates on another machine that are running in this process right now
 * (Phase 326).
 *
 * ## The defect this exists for, in the order it happens
 *
 * `remoteCreate` in `./remote-sessions.ts` sends `new-session` and then stamps
 * `@gmux-id` as a SECOND command (research 51 section 4.1). Between the two, the
 * session is running on that machine with no option stamp. A list that runs over
 * there inside that window reads it with an empty `@gmux-id`, counts it as a
 * session Tortie did not create, leaves it out of the feed and hands it to Phase
 * 117's rescue, which rewrites the four stamps while the create is writing them.
 * The live connection starts a list the moment the machine reports the new
 * session, so on the loopback machine that window held a list in 16 of 35 runs.
 *
 * ## What one flight is
 *
 * One entry per remote create, registered on the line before the create's id is
 * issued (so before the durable row exists and before `new-session` is sent),
 * given the `$-id` and the connection generation the moment the machine answers,
 * and ended in the create's `finally`, which covers every exit. An ended flight is
 * remembered for {@link FLIGHT_MEMORY_MS} with the instant it ended, because a
 * list issued before that instant can still be parsed after it.
 *
 * A pass asks {@link remoteCreateFlightsFor} for the flights on its machine that
 * were live at any instant since its list was issued, and two answers follow:
 *
 *  - an unstamped row whose `$-id` is a flight's answered `$-id`, in the current
 *    generation, is BEING BOUND: skipped, by `$-id` alone and never by name;
 *  - a manifest row a flight OWNS is neither written over nor forgotten.
 *
 * ## What a flight does NOT do before the machine answers (the fix round)
 *
 * A pass whose list is parsed before the create's own answer cannot know the
 * `$-id`, so it handles every unstamped row exactly as the parent does: counted,
 * and handed to Phase 117's rescue, which binds the create's own session by the
 * id in its pane environment. The build first DEFERRED every never-probed row on
 * the machine while any create there waited on its answer. The fix round
 * REMOVED that, on his rule that the part which makes a scenario worse than
 * today is removed rather than repaired: it held back the rescue of ANOTHER
 * session of this run whose create had lost its answer, by up to the waiting
 * create's own timeout (measured 1.8 s behind a 1.5 s hold and 4.3 s behind a
 * 4 s one, where the parent bound it in 0.2 to 0.5 s), and an attach's own list
 * issued in the millisecond an unanswered create ended deferred the very
 * session that attach was waiting for.
 *
 * ## What a flight never does
 *
 * It never adopts a session. It never makes a row appear, and it never names a
 * session by the name tmux holds, because a stranger can hold the create's own
 * name. A session carrying neither stamp is still not ours; a flight only stops
 * a pass from acting on one, for as long as a create in this process might be
 * binding it. It survives no restart, and an id a past run issued has no flight,
 * because nothing is running for it (`seedUnconfirmedCreates` puts that id back
 * in the issued set, and Phase 117's rescue binds it exactly as before).
 *
 * ## Why this file imports nothing
 *
 * `./remote-sessions.ts` asks it and `../sessions/far-attach.ts` waits on it. A
 * leaf with no runtime import closes no cycle, which
 * `build/assert-no-runtime-cycles.mjs` checks for the whole tree.
 */

/**
 * How long an ended flight still speaks for its session to a list issued before
 * the end.
 *
 * 20,000 ms, which is `REMOVAL_MEMORY_MS` in `./remote-sessions.ts` for the same
 * reason: a list is spawned right after its `snapshotAt` is stamped and is killed
 * at `REMOTE_POLL_TIMEOUT_MS` (10,000), so after two of those no list issued
 * before the end can still be outstanding. `conformance:farattach` reads both
 * numbers and holds this one at twice the other or more.
 */
export const FLIGHT_MEMORY_MS = 20_000;

/** The handle `remoteCreate` holds for its own flight. */
export interface RemoteCreateFlight {
  /** The `$-id` the machine answered and the connection generation it was answered in. Once. */
  answered(tmuxId: string, generation: number): void;
  /**
   * The create's `@gmux-id` stamp did not land, so the create is no longer the
   * thing binding its `$-id`. The id stays issued, and from here Phase 117's
   * rescue binds it, exactly as it does at the parent. The `$-id` leaves
   * `beingBound` at once, whatever the list's age; the flight stays live, owned
   * and awaited until {@link end}.
   *
   * Without it the create's OWN list would skip its own session, the rescue
   * inside that list would never run, and the create would answer "could not
   * find a session" for a session that is running, where the parent's own list
   * rescued it and the create returned.
   */
  leftToRescue(): void;
  /** Idempotent. Settles every waiter. */
  end(): void;
}

/** What a pass reads about the flights on its machine. */
export interface RemoteCreateFlights {
  /** Answered `$-id`s, current generation, of flights live at any instant since `issuedAt`. */
  readonly beingBound: ReadonlySet<string>;
  /** True for the session id of any of those flights. */
  owns(sessionId: string): boolean;
}

/** How a wait on one create ended. */
export type CreateSettle = 'settled' | 'none' | 'timeout' | 'aborted';

/** One create, live or remembered. */
interface Flight {
  readonly sessionId: string;
  readonly machineId: string;
  tmuxId: string | null;
  generation: number;
  handedOn: boolean;
  endedAt: number | null;
  readonly waiters: Set<() => void>;
}

/** The live flights, by Tortie session id. At most one per id. */
const live = new Map<string, Flight>();

/** Ended flights, kept for {@link FLIGHT_MEMORY_MS} after their end. */
let remembered: Flight[] = [];

/** Drop the ended flights no outstanding list can still be judged against. */
function prune(now: number): void {
  if (remembered.length === 0) return;
  remembered = remembered.filter(
    (one) => one.endedAt !== null && now - one.endedAt <= FLIGHT_MEMORY_MS
  );
}

/**
 * End one flight: out of the live map, into memory, every waiter settled.
 *
 * The early return is what makes a replaced handle harmless: a flight that is
 * not ended is always the one the live map holds for its id, because a
 * replacement ends the old flight before it stores the new one.
 */
function finish(flight: Flight, now: number): void {
  if (flight.endedAt !== null) return;
  flight.endedAt = now;
  live.delete(flight.sessionId);
  remembered.push(flight);
  const waiters = [...flight.waiters];
  flight.waiters.clear();
  for (const settle of waiters) settle();
}

/**
 * Register one create. Called on the line before its id is issued.
 *
 * A second call for an id that is still live ends the first, whose waiters
 * settle, and replaces it. Session ids are fresh uuids, so that is a rule for a
 * caller that got it wrong rather than a path the create takes.
 */
export function beginRemoteCreate(
  sessionId: string,
  machineId: string,
  now: number = Date.now()
): RemoteCreateFlight {
  prune(now);
  const previous = live.get(sessionId);
  if (previous !== undefined) finish(previous, now);
  const flight: Flight = {
    sessionId,
    machineId,
    tmuxId: null,
    generation: 0,
    handedOn: false,
    endedAt: null,
    waiters: new Set()
  };
  live.set(sessionId, flight);
  return {
    answered(tmuxId: string, generation: number): void {
      if (flight.endedAt !== null || flight.tmuxId !== null) return;
      if (tmuxId.length === 0) return;
      flight.tmuxId = tmuxId;
      flight.generation = generation;
    },
    leftToRescue(): void {
      if (flight.endedAt !== null) return;
      flight.handedOn = true;
    },
    end(): void {
      finish(flight, Date.now());
    }
  };
}

/** True while a create for this id is running in this process (not merely remembered). */
export function remoteCreateInFlight(sessionId: string): boolean {
  return live.has(sessionId);
}

/**
 * The flights on one machine that were live at any instant since a list was
 * issued, read by that list's pass after the list answered.
 *
 * `issuedAt` is the pass's `snapshotAt`, stamped before the list was spawned.
 * THE TIE GOES TO THE FLIGHT: a flight that ended in the same millisecond the
 * list was issued is still considered, because `Date.now()` cannot say which of
 * the two came first, and a list issued before the end may have run over there
 * before the create's stamp. That is Phase 187's rule for a Remove, applied to a
 * create.
 */
export function remoteCreateFlightsFor(
  machineId: string,
  issuedAt: number,
  generation: number,
  now: number = Date.now()
): RemoteCreateFlights {
  prune(now);
  const beingBound = new Set<string>();
  const owned = new Set<string>();
  for (const one of [...live.values(), ...remembered]) {
    if (one.machineId !== machineId) continue;
    if (one.endedAt !== null && one.endedAt < issuedAt) continue;
    owned.add(one.sessionId);
    // No answer yet, or left to the rescue: nothing is being bound by this
    // create, so its session is handled as the parent handles it.
    if (one.tmuxId === null || one.handedOn) continue;
    if (one.generation === generation) beingBound.add(one.tmuxId);
  }
  return {
    beingBound,
    owns: (sessionId: string): boolean => owned.has(sessionId)
  };
}

/**
 * Wait, bounded, for the create running for this id to end.
 *
 * `none` at once when no create for this id is live. Otherwise `settled` when it
 * ends, `timeout` when `deadlineMs` passes first, and `aborted` when the signal
 * fires first. Every outcome clears the timer, removes the abort listener and
 * takes the waiter back off the flight, and the timer is `unref`'d so a wait
 * never holds this process open.
 */
export function awaitRemoteCreateSettled(
  sessionId: string,
  deadlineMs: number,
  signal?: AbortSignal
): Promise<CreateSettle> {
  const flight = live.get(sessionId);
  if (flight === undefined) return Promise.resolve('none');
  if (signal?.aborted === true) return Promise.resolve('aborted');
  if (!(deadlineMs > 0)) return Promise.resolve('timeout');
  const waiters = flight.waiters;
  return new Promise<CreateSettle>((resolve) => {
    let done = false;
    const onSettled = (): void => {
      settle('settled');
    };
    const onAbort = (): void => {
      settle('aborted');
    };
    const timer = setTimeout(() => {
      settle('timeout');
    }, deadlineMs);
    timer.unref?.();
    function settle(outcome: CreateSettle): void {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiters.delete(onSettled);
      signal?.removeEventListener('abort', onAbort);
      resolve(outcome);
    }
    waiters.add(onSettled);
    signal?.addEventListener('abort', onAbort);
  });
}

/** End and forget every flight. Tests only. */
export function resetRemoteCreateFlightsForTests(): void {
  const now = Date.now();
  for (const flight of [...live.values()]) finish(flight, now);
  live.clear();
  remembered = [];
}
