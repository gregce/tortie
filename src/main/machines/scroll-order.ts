/**
 * THE TWO ROADS TO A FAR PANE, kept apart (Phase 320.1, build/p3201/SPEC.md
 * D3, D6 to D10, and the fix round's F1 to F4).
 *
 * WHY THIS EXISTS. A session on another machine is reached two ways. Its
 * keystrokes go down the ATTACH, the person's own terminal on this Mac, an ssh
 * client carrying a tmux client on that machine. Its scrolls go down the
 * CONTROL CONNECTION, one per machine, through the closed table in
 * ./scroll-shapes.ts. Each road keeps its own order and neither keeps the
 * other's. Measured for the spec on one Mac with no network at all (§4 M3,
 * 100 trials a cell, 3.6a and 3.7b):
 *
 *   a key on the control connection, then one on the attach    reversed 11 to 91
 *   a `cancel` on the control connection, then a key on the
 *     attach at once                                            key eaten 0 to 10
 *   a key on the attach, a park written in the same tick        key eaten 1 to 17
 *   the same park written 1 to 16 ms later                      0 of 2,400
 *   `cancel` then the key, both on ONE control connection       delivered 600 of 600
 *
 * The first attempt of this phase held keys in the renderer and fenced a
 * scroll 32 ms behind the last key. On his Mac Pro over Tailscale (round trips
 * 6.4 to 96.8 ms) a scroll written 32 ms after a key still landed first and
 * ate it, 4 of 220; and a held key died with its mount when the person chose
 * another session at once, 0 of 20 delivered where today delivers every one.
 * A fence only delays; it does not order two roads.
 *
 * THE RULE, D6. Per session, a key takes ONE of the two roads, chosen here,
 * synchronously, in the `term:input` listener before anything is written:
 *
 *  - the CONTROL CONNECTION, when the pane is parked, may be parked, or has a
 *    carriage sequence in flight; the key is then written behind a `cancel`,
 *    and a read after it, all in this tick (the seventh shape, his word of
 *    2026-09-30);
 *  - otherwise the ATTACH, as today.
 *
 * THE WAY BACK TO THE ATTACH IS AN ANSWER, NOT A CLOCK (the fix round, F1).
 * The second build kept keys on the control connection for ROAD_QUIET_MS after
 * its last sequence settled, so a person typing over a pane it had just
 * returned to live stayed on that connection for as long as they kept typing,
 * and when that connection alone died every key on it was lost where today
 * delivers every one (the attack verifier: 42 of 700 keys in bursts, 60 of 700
 * over a 50 ms link, against 0 at the parent). An answer is the stronger fact:
 * tmux runs one client's commands in the order written, and it sends the
 * answer to a read after it has run everything written before that read, so
 * once every sequence on the carriage has been answered, a key written to the
 * attach afterwards reaches the far server after all of them, whatever the two
 * links do. So the attach is taken again the moment nothing is in flight.
 *
 * And a scroll that may park a pane this module does not know to be parked
 * waits, before its first write, until the attach has been quiet for
 * {@link ROAD_QUIET_MS} ({@link awaitRoadQuiet}): a key on the attach has no
 * answer to wait for, so that direction stays a measured clock (his Mac Pro,
 * `probe:p320:skew`: 0 of 150 keys eaten at 128 and at 200 ms). No keystroke
 * ever waits for that clock.
 *
 * A KEY TYPED AFTER A SCROLL BEGAN WINS OVER IT (the fix round, F2). A park
 * that sees a keystroke while it waits for the quiet, or while its read before
 * the park is on its way, is dropped: nothing but a read is written, and the
 * pane stays live. The second build held the park until the typing paused and
 * then landed it, so the view jumped 50 lines back a fifth of a second after
 * the person stopped typing and stayed there (the parent verifier: 18 of 18
 * runs, where today nothing moves and this Mac ends live). A key typed after
 * the park is written is behind it on the control connection, and its own
 * `cancel` returns the pane to live, which is what this Mac does too.
 *
 * D3, THE WHEEL FOLLOWS THE PROGRAM. {@link readBeforePark} reads the pane
 * once before a park, and never parks one whose program has taken the screen
 * or the mouse; {@link undoRacedPark} cancels a park the program raced; and
 * (the fix round, F3) {@link leaveForProgram} takes a pane Tortie parked back
 * to its program the first time a read says that program has since taken the
 * screen or the mouse, because the operator's plan says "a parked pane whose
 * program starts asking for it leaves copy mode" and today a remote pane is
 * never parked over such a program at all. Copy mode Tortie did not enter
 * (the person's own, or one found already there) is left alone.
 *
 * A KEY IS NEVER WRITTEN INTO A CONNECTION THAT IS DOWN (the fix round, F4).
 * Over a pane that is or may be parked, a key typed while its machine's
 * connection is down used to go down the attach into copy mode, where it was
 * eaten (`probe:p320` T5: 0 of 27 characters, against the parent's 3 of 9).
 * It is HELD here, in order, and written behind a `cancel` the moment the
 * connection and the session's row are back ({@link HELD_KEYS_POLL_MS}). A
 * typed sequence whose connection closed before its `cancel` was answered is
 * sent again then, once, but ONLY when the pane still reads scrolled back on
 * the new connection and nothing parked it since: one connection runs its
 * commands in order, so a pane still in copy mode proves that `cancel` never
 * ran, and so neither did the bytes behind it. Any other such sequence is not
 * sent again (at most once, research 57's principle), which is the one limit
 * left: when that connection ALONE dies (the attach still up) after a `cancel`
 * it carried had run, the keys still unanswered on it, which are the keys typed
 * within one round trip of the one before, may not have reached the program,
 * and they are not sent again. The operator accepted that as a stated limit on
 * 2026-10-01.
 *
 * A KEY ASKS FOR A CONNECTION THAT WILL NOT COME BACK BY ITSELF (his ruling of
 * 2026-10-01, "One narrow fix round", the GONE row). A machine whose
 * reconnect misses Phase 83's greeting deadline has no connection for the rest
 * of the run, and a pane Tortie scrolled back there stayed in copy mode: every
 * key typed afterwards went down the attach into copy mode and was lost, where
 * today they arrive, because today never scrolls such a pane back (the
 * reverifier, in the app: 0 of 3 by keyboard and 0 of 3 by the bridge, against
 * 3 of 3 each at the parent). The attach cannot leave copy mode for it: no key
 * does that in every far key table without typing into a program that is not
 * in copy mode after all, and the exec plane may not (research 57 §3). So the
 * key HOLDS, here, and ASKS that machine's own control connection for one more
 * try ({@link askReopen}), through the one place a connection is ever opened,
 * with its precheck and its gate. If it greets, the held keys go behind a
 * `cancel` exactly as above. If it does not, they are dropped, said once with
 * no byte of them. A machine whose dialect the gate refused is never asked: no
 * pane there was ever scrolled back.
 *
 * AND ONCE THAT ASK HAS FAILED, TODAY (his ruling of 2026-10-02, "Fall back to
 * today"). Holding every later key for another ask meant that on a machine
 * whose connection never opens again nothing the person typed could leave the
 * scrolled-back view, where down the attach a typed `q` does. So once the ask a
 * keystroke made is over with no connection (refused, or its greeting missed
 * too), every key to that machine goes down the attach exactly as before this
 * round, and nothing asks it again: copy mode's own key table leaves on `q` (and
 * on Escape where that table is emacs's, tmux's default), and what was typed
 * before is lost there, as before. The keys held for the failed ask are dropped
 * with it. The fall back ends when a connection to that machine is seen again
 * (being opened or live: Prepare, or Phase 83's own open), so a later miss is a
 * new one a key may ask about ({@link askFailed}).
 *
 * WHAT THIS MODULE NEVER DOES. It spells no tmux verb as a string, neither
 * the one that sends keys nor the one that enters copy mode: every argv comes
 * from ./scroll-shapes.ts (`typedSequence`) or from src/main/tmux/scroll.ts, so
 * conformance:machines condition 66 still counts four files. No log call names a keystroke, a byte of one, or anything
 * a far machine answered. It holds memory only: per session, what the last
 * answer said, what is in flight, the keys held for a connection that is down,
 * and when the attach was last used.
 *
 * Its callers: the session core (src/main/sessions/core.ts, `remoteScroll`)
 * for every scroll of a session on another machine, and the attach host
 * (src/main/attach/attach-host.ts), through the hook the core hands it, for
 * every keystroke to a remote client. This Mac's sessions never reach it.
 */

import { getLog } from '../log';
import {
  exitPaneScroll,
  isUnreadableScrollAnswer,
  readPaneScroll,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../tmux/scroll';
import { gmuxErrorPayloadOf } from '../errors';
import { isPaneReport } from '@shared/pane-report';
import {
  LEAVING_SHAPE,
  PARKING_SHAPE,
  READING_SHAPE,
  admitScrollArgv,
  typedSequence
} from './scroll-shapes';
import { missedGreetingThisRun, openControlPlane, remoteScrollRunner } from './control-plane';
import { remoteScrollAddress, type RemoteScrollAddress } from './remote-sessions';
import type { RemoteScrollCarriage } from './scroll-shapes';

export { TYPED_BYTES_PER_COMMAND } from './scroll-shapes';

const orderLog = getLog('sessions');

/**
 * How long the attach must have been quiet before a park may be written (D6),
 * in milliseconds. Twice the slowest round trip measured to his Mac Pro
 * (96.8 ms); on this Mac a park written 1 ms or more after a key on the attach
 * never took it (0 of 2,400, §4 M3 iv), and on his Mac Pro under load none was
 * taken at 128 ms or at 200 ms (`probe:p320:skew`, 0 of 150 each).
 *
 * Since the fix round it governs ONE direction only, the attach to the control
 * connection. The way back is an answer (F1, this file's header).
 */
export const ROAD_QUIET_MS = 200;

/**
 * How often keys held for a connection that is down look for it again (F4),
 * for the first {@link HELD_KEYS_QUICK_POLLS} looks; then every
 * {@link HELD_KEYS_SLOW_POLL_MS}. A dropped control connection comes back in
 * about half a second when its machine is up (T5 measured 527 to 578 ms), and
 * a machine that is down for longer is not worth twenty looks a second.
 */
export const HELD_KEYS_POLL_MS = 50;
export const HELD_KEYS_QUICK_POLLS = 40;
export const HELD_KEYS_SLOW_POLL_MS = 250;

/**
 * The most bytes held for one session while its connection is down (F4).
 * Typing never comes near it; a paste larger than this, made over a scrolled
 * back pane during an outage, is not kept past it, and that is said once.
 */
export const HELD_KEYS_MAX_BYTES = 1024 * 1024;

/**
 * Which road one keystroke took. `'held'`: neither yet; it is kept here, in
 * order, for its machine's connection to come back (F4). The host writes
 * nothing to the attach for `'carriage'` or `'held'`.
 */
export type KeyRoad = 'attach' | 'carriage' | 'held';

/**
 * The clock this module reads and sleeps on. A monotonic `now` (a wall clock
 * can step), and a `sleep` the park's wait and the held keys use. Replaced only
 * through {@link resetScrollOrderForTests}, so a gate can drive both by hand.
 */
export interface ScrollOrderClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const REAL_CLOCK: ScrollOrderClock = {
  now: () => performance.now(),
  sleep: (ms) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    })
};

let clock: ScrollOrderClock = REAL_CLOCK;

/**
 * Where a keystroke's carriage comes from: the session's address on its
 * machine's CURRENT connection, and that machine's live runner. In the product
 * these are `remoteScrollAddress` and `remoteScrollRunner`, asked afresh for
 * every keystroke; a rig that drives the shipping `routeKey` against its own
 * scratch server hands its own through {@link resetScrollOrderForTests}.
 */
export interface KeyCarriageSource {
  readonly address: (sessionId: string) => RemoteScrollAddress;
  readonly carriage: (machineId: string) => RemoteScrollCarriage;
  /**
   * The ruled round. Whether a keystroke may ask this machine for its control
   * connection once more: it missed its greeting earlier in this run. Absent,
   * never, which is what a rig's own source has always meant.
   */
  readonly mayReopen?: (machineId: string) => boolean;
  /**
   * Ask it, once. Resolves when the new client is spawned or the ask was
   * refused (the precheck or the gate); the greeting comes after.
   */
  readonly reopen?: (machineId: string) => Promise<boolean>;
}

const SHIPPING_SOURCE: KeyCarriageSource = {
  address: (sessionId) => remoteScrollAddress(sessionId),
  carriage: (machineId) => remoteScrollRunner(machineId),
  mayReopen: (machineId) => missedGreetingThisRun(machineId),
  reopen: (machineId) => openControlPlane(machineId, { keystroke: true })
};

let source: KeyCarriageSource = SHIPPING_SOURCE;

/**
 * Moved by {@link resetScrollOrderForTests}, so a held-key loop started under
 * one test's clock and source ends instead of running under the next one's.
 */
let resetEpoch = 0;

/** A typed sequence whose connection closed before its `cancel` was answered (F4). */
interface Unanswered {
  readonly data: string;
  /** The write order of that sequence's closing read. */
  readonly stamp: number;
}

/** What this module knows about one remote session's two roads. */
interface Road {
  /** The last answer's `inMode`; set true when a parking command is written. */
  parked: boolean;
  /** A sequence that could leave it parked settled without a readable answer. */
  mayBeParked: boolean;
  /**
   * Carriage sequences written and unanswered that can leave the pane parked or
   * that type: a park and D3's read before it, a return to live, a typed key,
   * any operation on a pane known parked. NOT the poll's read of a pane not
   * known parked, which would otherwise flip a keystroke typed at rest onto the
   * other road.
   */
  inFlight: number;
  /** When the last keystroke went down the attach. */
  lastAttachKeyAt: number;
  /**
   * The write order of the newest answer applied. Answers are applied in the
   * order their commands were WRITTEN, never in the order their handlers ran:
   * two callers' promise chains differ in length, and a stale "live" applied
   * after a newer "parked" is the one reading that loses a key.
   */
  applied: number;
  /**
   * F3. Tortie itself parked this pane, over a program that had neither the
   * screen nor the mouse, and nothing has left copy mode since. Only such a
   * pane is taken back to its program when the program takes either.
   */
  ours: boolean;
  /** F2. Keystrokes routed for this session, by either road or held. */
  keys: number;
  /** F4. The write order of the newest park written for this session. */
  lastParkStamp: number;
  /** F4. Keys typed while the connection was down, in the order typed. */
  held: string[];
  heldBytes: number;
  /** F4. Typed sequences whose connection closed before their `cancel` answered. */
  unanswered: Unanswered[];
  /** F4. The machine the held keys wait for. */
  machineId: string | null;
  /** F4. A loop is waiting to deliver the held keys. New keys queue behind it. */
  flushing: boolean;
  /**
   * The ruled round. The machine's ask for one more connection that this
   * session's held keys wait on ({@link askReopen}), 0 for none.
   */
  reopenRound: number;
}

const roads = new Map<string, Road>();

/** A counter every stamped write takes a number from, so write order is one sequence. */
let writeOrder = 0;

/**
 * Per machine, the connection generation whose first read could not be read
 * (Phase 320.1's fix round, D10). Nothing but that read is ever written to such
 * a connection, so a keystroke never takes it: the attach, as today.
 */
const unreadableConnections = new Map<string, number>();

/** Per machine, the connection generation whose first failed typed sequence has been said. */
const typedFailureSaid = new Map<string, number>();

/** The machines whose dropped held keys have been said, once each. */
const heldDropSaid = new Set<string>();

/**
 * The ruled round. Per machine, the last ask a keystroke made for one more
 * control connection: its number, and whether it is still being handed over.
 */
interface Reopen {
  readonly round: number;
  pending: boolean;
}
const reopens = new Map<string, Reopen>();

/**
 * His ruling of 2026-10-02, "Fall back to today". The machines where the ask a
 * keystroke made for one more connection is over and no connection came of it:
 * the precheck or the gate refused it, or its greeting was missed too. Over a
 * pane that is or may be scrolled back there, a key takes the attach again, as
 * it did before Phase 320.1's ruled round, and nothing asks that machine again.
 * A machine leaves this set when a connection to it is seen being opened or
 * live ({@link sawConnection}).
 */
const askFailed = new Set<string>();

function roadOf(sessionId: string): Road {
  let road = roads.get(sessionId);
  if (road === undefined) {
    road = {
      parked: false,
      mayBeParked: false,
      inFlight: 0,
      lastAttachKeyAt: Number.NEGATIVE_INFINITY,
      applied: 0,
      ours: false,
      keys: 0,
      lastParkStamp: 0,
      held: [],
      heldBytes: 0,
      unanswered: [],
      machineId: null,
      flushing: false,
      reopenRound: 0
    };
    roads.set(sessionId, road);
  }
  return road;
}

/**
 * The carriage has a sequence in flight for this session: a key now must not
 * take the attach, or it could overtake what is still travelling (§4 M3 ii and
 * iii). Nothing else: once every sequence is answered, the far server has run
 * them all (F1).
 */
function carriageBusy(road: Road): boolean {
  return road.inFlight > 0;
}

/** D6's first half: this key must not take the attach. */
function keysTakeCarriage(road: Road): boolean {
  return road.parked || road.mayBeParked || carriageBusy(road);
}

/** A snapshot of one session's roads, for the session core's gate and for tests. */
export interface RoadFacts {
  readonly parked: boolean;
  readonly mayBeParked: boolean;
  readonly inFlight: number;
  readonly lastAttachKeyAt: number;
  /** F3: Tortie parked this pane itself and nothing has left copy mode since. */
  readonly ours: boolean;
  /** F2: keystrokes routed so far, by either road or held. */
  readonly keys: number;
  /** F4: keystrokes held for a connection that is down. */
  readonly held: number;
  /** F4: typed sequences a closed connection left unanswered. */
  readonly unanswered: number;
}

/** What this module knows about one session right now. A session it never saw reads as live and quiet. */
export function roadFacts(sessionId: string): RoadFacts {
  const road = roads.get(sessionId);
  return {
    parked: road?.parked ?? false,
    mayBeParked: road?.mayBeParked ?? false,
    inFlight: road?.inFlight ?? 0,
    lastAttachKeyAt: road?.lastAttachKeyAt ?? Number.NEGATIVE_INFINITY,
    ours: road?.ours ?? false,
    keys: road?.keys ?? 0,
    held: road?.held.length ?? 0,
    unanswered: road?.unanswered.length ?? 0
  };
}

/** F2. How many keystrokes have been routed for this session, by either road or held. */
export function keysSoFar(sessionId: string): number {
  return roads.get(sessionId)?.keys ?? 0;
}

/** A runner that also says the write order of the last read or park it wrote. */
export interface StampedRunner extends TmuxScrollRunner {
  /** The write order of the newest read or park this runner wrote, or 0 when it wrote none. */
  lastStamp(): number;
}

/**
 * Wrap a machine's runner so every READ, every PARK and every LEAVE it writes
 * takes a number in write order. A park marks the pane parked the moment it is
 * written (D6: "set true when a parking sequence is written"), and a `cancel`
 * marks it live the moment it is written, because on one connection everything
 * written after a `cancel` reaches a live pane until the next park. The number
 * is what {@link noteAnswer} orders answers by, so a read written before the
 * `cancel` cannot say parked again after it. Classification only: the runner
 * underneath still checks every argv against the table, on its own copy.
 *
 * WHY THE `cancel` COUNTS (the integrator's round). Without it a key typed over
 * a parked pane left this module believing the pane parked until the key's own
 * read came back, and a wheel notch in that round trip was taken for a scroll
 * of a pane KNOWN parked: the session core then skipped D3's read and parked
 * the pane without asking whether its program had just taken the mouse, which
 * is the one thing D3 exists to never do.
 *
 * A `cancel` written also ends Tortie's own park (F3), and a park written is
 * remembered by its number (F4), so a typed sequence a closed connection left
 * unanswered is never sent again over a pane something parked after it.
 */
export function stampedRunner(sessionId: string, run: TmuxScrollRunner): StampedRunner {
  let last = 0;
  const stamped = (args: readonly string[]): Promise<string> => {
    const verdict = admitScrollArgv(args);
    if (
      verdict.ok &&
      (verdict.shape === READING_SHAPE ||
        verdict.shape === PARKING_SHAPE ||
        verdict.shape === LEAVING_SHAPE)
    ) {
      writeOrder += 1;
      last = writeOrder;
      if (verdict.shape !== READING_SHAPE) {
        const road = roadOf(sessionId);
        if (verdict.shape === PARKING_SHAPE) road.lastParkStamp = last;
        else road.ours = false;
        if (last >= road.applied) {
          road.applied = last;
          road.parked = verdict.shape === PARKING_SHAPE;
          road.mayBeParked = false;
        }
      }
    }
    return run(args);
  };
  return Object.assign(stamped, {
    ...(run.ordered !== undefined ? { ordered: run.ordered } : {}),
    ...(run.server !== undefined ? { server: run.server } : {}),
    lastStamp: () => last
  });
}

/**
 * Record what a read said about the pane (D6, D9, D10).
 *
 *  - a state: `parked` is its `inMode`, and `mayBeParked` is cleared; a pane
 *    that is live is no longer Tortie's own park (F3);
 *  - `'unreadable'` or `'failed'`: the pane may be parked, so the next keys take
 *    the control connection, whose `cancel` leaves copy mode whatever Tortie
 *    believed.
 *
 * `stamp` is the write order of the read that answered ({@link stampedRunner}).
 * An answer older than one already applied is ignored; one with no stamp is
 * applied as it comes.
 */
export function noteAnswer(
  sessionId: string,
  answer: PaneScrollState | 'unreadable' | 'failed',
  stamp?: number
): void {
  const road = roadOf(sessionId);
  if (stamp !== undefined) {
    if (stamp < road.applied) return;
    road.applied = stamp;
  }
  if (answer === 'unreadable' || answer === 'failed') {
    road.mayBeParked = true;
    return;
  }
  road.parked = answer.inMode;
  road.mayBeParked = false;
  if (!answer.inMode) road.ours = false;
}

/** A carriage sequence that can leave the pane parked, or that types, is about to be written. */
export function noteWritten(sessionId: string): void {
  roadOf(sessionId).inFlight += 1;
}

/**
 * One such sequence has settled, answered or not. Once none is left in flight
 * the next key takes the attach again, unless the pane is or may be parked
 * (F1). `now` is kept for the callers that pass it; nothing is timed from it.
 */
export function noteSettled(sessionId: string, now?: number): void {
  void now;
  const road = roadOf(sessionId);
  road.inFlight = Math.max(0, road.inFlight - 1);
}

/**
 * A sequence counted by {@link noteWritten} wrote nothing that can move the
 * pane, because its connection's first read could not be read (D10): uncount
 * it. So a scroll on such a machine keeps no key off the attach afterwards, and
 * only keys typed while that first read was on its way stay on the carriage
 * until it is answered.
 */
export function noteWithdrawn(sessionId: string): void {
  const road = roadOf(sessionId);
  road.inFlight = Math.max(0, road.inFlight - 1);
}

/**
 * F3. The session core parked this pane itself, over a program that had
 * neither the screen nor the mouse when it read the pane just before
 * ({@link readBeforePark}'s `parking` hook). Until something leaves copy mode,
 * a read that says the program has since taken either takes the pane back to
 * it ({@link leaveForProgram}).
 */
export function noteParkedByUs(sessionId: string): void {
  roadOf(sessionId).ours = true;
}

/**
 * A machine's connection whose first scroll read could not be read (D10).
 * Tortie parks nothing there, so a pane it believes parked or possibly parked
 * is not a reason for a keystroke to take it: the attach, as today. A carriage
 * that is still busy with keystrokes typed before the read came back keeps
 * them, in order, until they are answered.
 */
export function noteUnreadableConnection(machineId: string, generation: number): void {
  unreadableConnections.set(machineId, generation);
}

/**
 * D6's wait, and F2's drop. For an operation that may park a pane not known to
 * be parked, called BEFORE its first write. Resolves TRUE once the attach has
 * carried no keystroke for {@link ROAD_QUIET_MS}, and FALSE when a keystroke is
 * typed while it waits: the person is typing, and the park is dropped (a key
 * typed during the wait takes the attach, because nothing is on the carriage
 * yet). A key typed before the scroll began only delays it, so a swipe begun
 * right after a key still scrolls. `now` is the first reading only.
 */
export async function awaitRoadQuiet(sessionId: string, now?: number): Promise<boolean> {
  const keysAtStart = keysSoFar(sessionId);
  let at = now ?? clock.now();
  for (;;) {
    if (keysSoFar(sessionId) !== keysAtStart) return false;
    const last = roads.get(sessionId)?.lastAttachKeyAt ?? Number.NEGATIVE_INFINITY;
    const left = ROAD_QUIET_MS - (at - last);
    if (!(left > 0)) return true;
    await clock.sleep(left);
    at = clock.now();
  }
}

/** What {@link readBeforePark} found, and what it did. */
export type ParkAttempt =
  /** The program has the screen or the mouse: nothing but the read was written, and `state` is that read. */
  | { readonly outcome: 'refused'; readonly state: PaneScrollState }
  /** F2: a keystroke was typed since the scroll began: nothing but the read was written. */
  | { readonly outcome: 'dropped'; readonly state: PaneScrollState }
  /** The pane was already in copy mode: the operation ran as today (Phase 292's exception). */
  | { readonly outcome: 'already'; readonly state: PaneScrollState }
  /** The pane was live and its program had neither: the operation ran and may have raced the program. */
  | { readonly outcome: 'parked'; readonly state: PaneScrollState };

/** What the session core tells {@link readBeforePark} about the scroll it is reading for. */
export interface ParkHooks {
  /** F2. False once a keystroke has been typed since the scroll began. Asked after the read. */
  readonly stillWanted?: () => boolean;
  /** F3. Called just before the park is written over a pane whose program has neither. */
  readonly parking?: () => void;
}

/**
 * D3, MAIN NEVER PARKS A PANE WHOSE PROGRAM HAS TAKEN THE SCREEN OR THE MOUSE.
 * One read, then:
 *
 *   in copy mode already               the operation, as today
 *   alternate screen or mouse asked    that read, and NOTHING else written
 *   a key typed since it began (F2)    that read, and NOTHING else written
 *   otherwise                          the operation
 *
 * The renderer asks xterm's own mouse mode first (D1), which learns a
 * program's request within about 0.1 ms of it; this is the rule that makes
 * "never parked" true at the far side when the read knows first.
 */
export async function readBeforePark(
  run: TmuxScrollRunner,
  target: string,
  op: (run: TmuxScrollRunner, target: string) => Promise<PaneScrollState>,
  hooks: ParkHooks = {}
): Promise<ParkAttempt> {
  const before = await readPaneScroll(run, target);
  if (before.inMode) return { outcome: 'already', state: await op(run, target) };
  if (before.innerAlt || before.innerMouse) return { outcome: 'refused', state: before };
  if (hooks.stillWanted !== undefined && !hooks.stillWanted()) {
    return { outcome: 'dropped', state: before };
  }
  hooks.parking?.();
  return { outcome: 'parked', state: await op(run, target) };
}

/**
 * D3's second half. A park that found the pane live, and whose own read says
 * the pane is now in copy mode over a program that has the screen or the
 * mouse: the program took them while the park was on its way. Leave copy mode
 * and answer the read after it. Anything else is answered as it is, including
 * a pane found already in copy mode (`'already'`), which Tortie did not put
 * there and keeps Phase 292's measured exception.
 */
export async function undoRacedPark(
  run: TmuxScrollRunner,
  target: string,
  attempt: ParkAttempt
): Promise<PaneScrollState> {
  const { state } = attempt;
  if (attempt.outcome !== 'parked') return state;
  if (!state.inMode || !(state.innerAlt || state.innerMouse)) return state;
  return exitPaneScroll(run, target);
}

/**
 * F3, A PANE TORTIE PARKED GOES BACK TO ITS PROGRAM WHEN THE PROGRAM TAKES THE
 * SCREEN OR THE MOUSE. Asked with every answer the session core reads for a
 * pane that is or may be parked (the poll, a notch, a drag). When Tortie
 * parked the pane itself ({@link noteParkedByUs}) and the read now says the
 * program has the alternate screen or the mouse, write `cancel` and answer the
 * read after it; anything else is answered as it is.
 *
 * WHY, measured by both verifiers of the second build: a person scrolled back
 * on a far shell, a full-screen program then took the screen and the mouse by
 * itself, and every later notch scrolled the frozen frame, 0 of 50 reaching the
 * program and the pane still in copy mode three seconds later, where today a
 * remote pane is never parked and 50 of 50 reach it. On this Mac Phase 292
 * keeps the frame instead, and that exception stands there; on another machine
 * it would be a scenario worse than today, so it is not carried over. Copy mode
 * Tortie did not enter is never left here.
 */
export async function leaveForProgram(
  sessionId: string,
  run: TmuxScrollRunner,
  target: string,
  state: PaneScrollState
): Promise<PaneScrollState> {
  if (roads.get(sessionId)?.ours !== true) return state;
  if (!state.inMode || !(state.innerAlt || state.innerMouse)) return state;
  return exitPaneScroll(run, target);
}

/** Mark a handled promise, so an answer nobody awaits yet never escapes to the process. */
function handled<T>(answer: Promise<T>): Promise<T> {
  answer.catch(() => undefined);
  return answer;
}

/** Say once per machine per connection that a typed sequence got no answer. No keystroke, no far byte. */
function sayTypedFailed(machineId: string, generation: number, err: unknown, closed: boolean): void {
  if (typedFailureSaid.get(machineId) === generation) return;
  typedFailureSaid.set(machineId, generation);
  const code = gmuxErrorPayloadOf(err)?.code ?? 'no code';
  orderLog.info(
    `a key typed into a session on ${machineId} got no answer over its live ` +
      `connection (${code}); ` +
      (closed
        ? `that connection closed, so it is sent again when the next one opens only if the session is still scrolled back there; `
        : `it is not sent again; `) +
      `the next keys there go behind a cancel. Said once per connection.`
  );
}

/**
 * His ruling of 2026-10-02. The ask a keystroke made of `machineId` is over and
 * no connection came of it: from now on keys there take the attach, as today.
 * Said once each time it happens, with no keystroke in the line.
 */
function fallBack(machineId: string): void {
  if (askFailed.has(machineId)) return;
  askFailed.add(machineId);
  orderLog.info(
    `${machineId} did not open a live connection when a key typed into a session ` +
      `there asked for one, so keys typed there go down the attach again, as they ` +
      `did before Tortie scrolled sessions there back. Nothing asks that machine ` +
      `again until a connection to it is opened.`
  );
}

/**
 * His ruling of 2026-10-02. A connection to `machineId` is being opened or is
 * live (`carriage` is not `none`). A fall back there ends, because no key asks
 * a machine while it is fallen back, so that connection is Prepare's or Phase
 * 83's own. And when it is live, or ends a fall back, the last ask is retired:
 * its number moves on with nothing in flight, so no session's keys still count
 * as waiting on it, and a later miss is a new one that a key may ask about once.
 * An ask still being handed over is left alone. Reads and writes memory only.
 */
function sawConnection(machineId: string, carriage: RemoteScrollCarriage): void {
  if (carriage.kind === 'none') return;
  const endedFallBack = askFailed.delete(machineId);
  if (carriage.kind !== 'live' && !endedFallBack) return;
  const known = reopens.get(machineId);
  if (known !== undefined && !known.pending) {
    reopens.set(machineId, { round: known.round + 1, pending: false });
  }
}

/** Say once per machine that keys held for it were not kept. No keystroke. */
function sayHeldDropped(machineId: string, why: string): void {
  if (heldDropSaid.has(machineId)) return;
  heldDropSaid.add(machineId);
  orderLog.info(
    `keys typed into a session on ${machineId} while its live connection was down ` +
      `were not kept: ${why}. Said once.`
  );
}

/**
 * Wait for one typed sequence's answers, in the order they were written, and
 * record what its read said (D9). The `cancel` may answer "not in a mode",
 * which is an answer, not a failure (the attack verifier's x11). Any other
 * failure leaves the pane possibly parked, and nothing is retried on the same
 * connection. A sequence whose `cancel` got NO answer because its connection
 * closed is kept for the next connection (F4), which sends it again only if
 * the pane still reads scrolled back there.
 */
async function settleTyped(
  sessionId: string,
  machineId: string,
  generation: number,
  writes: readonly Promise<string>[],
  read: Promise<PaneScrollState>,
  stamp: number,
  data: string
): Promise<void> {
  try {
    let failure: unknown = null;
    let cancelUnanswered = false;
    for (const [index, write] of writes.entries()) {
      try {
        await write;
      } catch (err) {
        if (index === 0) cancelUnanswered = gmuxErrorPayloadOf(err)?.code === 'TMUX_UNREACHABLE';
        else if (failure === null) failure = err;
      }
    }
    try {
      noteAnswer(sessionId, await read, stamp);
    } catch (err) {
      noteAnswer(sessionId, isUnreadableScrollAnswer(err) ? 'unreadable' : 'failed', stamp);
      if (failure === null) failure = err;
    }
    if (failure !== null) {
      noteAnswer(sessionId, 'failed', stamp);
      const now = source.carriage(machineId);
      const closed = now.kind !== 'live' || now.generation !== generation;
      if (closed && cancelUnanswered) {
        const road = roads.get(sessionId);
        if (road !== undefined) {
          road.unanswered.push({ data, stamp });
          road.machineId = machineId;
          startFlushing(sessionId, road);
        }
      }
      sayTypedFailed(machineId, generation, failure, closed && cancelUnanswered);
    }
  } finally {
    noteSettled(sessionId);
  }
}

/**
 * Write one typed sequence for `data` on a live carriage, in this tick: the
 * `cancel`, the bytes as `-H` commands, then a read. False when the sequence
 * does not compose to shapes the table admits, with nothing written.
 */
function writeTyped(
  sessionId: string,
  machineId: string,
  carriage: Extract<RemoteScrollCarriage, { kind: 'live' }>,
  tmuxId: string,
  data: string
): boolean {
  const sequence = typedSequence(tmuxId, Buffer.from(data, 'utf8'));
  if (sequence.length < 2 || !sequence.every((argv) => admitScrollArgv(argv).ok)) return false;
  const run = stampedRunner(sessionId, carriage.run);
  noteWritten(sessionId);
  let wrote = false;
  try {
    // Every command below is written in its call, in this order, in this tick.
    const writes = sequence.map((argv) => {
      const answer = handled(run(argv));
      wrote = true;
      return answer;
    });
    const read = handled(readPaneScroll(run, tmuxId));
    void settleTyped(
      sessionId,
      machineId,
      carriage.generation,
      writes,
      read,
      run.lastStamp(),
      data
    ).catch(() => undefined);
    return true;
  } catch (err) {
    // Nothing reached the runner: uncounted, and the caller decides the road.
    if (!wrote) {
      noteWithdrawn(sessionId);
      throw err;
    }
    // After the first write the carriage has it, and it is never sent twice.
    noteAnswer(sessionId, 'failed');
    noteSettled(sessionId);
    return true;
  }
}

/**
 * F4. Keep one keystroke for its machine's connection, behind any already
 * kept, and make sure something is waiting to deliver them.
 */
function hold(sessionId: string, road: Road, machineId: string | null, data: string): KeyRoad {
  const bytes = Buffer.byteLength(data, 'utf8');
  if (machineId !== null) road.machineId = machineId;
  if (road.heldBytes + bytes > HELD_KEYS_MAX_BYTES) {
    sayHeldDropped(road.machineId ?? 'another machine', `more than ${String(HELD_KEYS_MAX_BYTES)} bytes were typed before it came back`);
    return 'held';
  }
  road.held.push(data);
  road.heldBytes += bytes;
  startFlushing(sessionId, road);
  return 'held';
}

/**
 * The ruled round. Ask `machineId` for its control connection once more, for a
 * keystroke over a pane that is or may be scrolled back there, and answer the
 * ask's number; or null when it may not be asked (it did not miss its greeting:
 * the gate refused its tmux, and no pane there was ever scrolled back). An ask
 * still being handed over is joined rather than repeated, so a burst of keys
 * spawns one child. Nothing here retries: a new ask needs a new keystroke.
 */
function askReopen(machineId: string): number | null {
  const known = reopens.get(machineId);
  if (known?.pending === true) return known.round;
  if (source.mayReopen?.(machineId) !== true || source.reopen === undefined) return null;
  const entry: Reopen = { round: (known?.round ?? 0) + 1, pending: true };
  reopens.set(machineId, entry);
  let attempt: Promise<boolean>;
  try {
    attempt = source.reopen(machineId);
  } catch {
    attempt = Promise.resolve(false);
  }
  void attempt
    .catch(() => false)
    .then(() => {
      entry.pending = false;
    });
  return entry.round;
}

/**
 * The ruled round, for the loop that delivers held keys when the machine has no
 * connection this run. True while they should wait: an ask is being handed
 * over, or none has been made for them yet and one may be (it is made here).
 * False once the ask they waited on is over and the connection is still not
 * there: it was refused, or its greeting was missed too, and from then on the
 * machine falls back to today (his ruling of 2026-10-02, {@link fallBack}).
 */
function reopenStillComing(road: Road, machineId: string): boolean {
  const known = reopens.get(machineId);
  if (known?.pending === true) {
    road.reopenRound = known.round;
    return true;
  }
  if (known !== undefined && road.reopenRound === known.round) {
    fallBack(machineId);
    return false;
  }
  const round = askReopen(machineId);
  if (round === null) return false;
  road.reopenRound = round;
  return true;
}

/**
 * The ruled round, for the session core's `remoteScroll`. True when a session
 * on a machine with no connection this run still has a pane only that
 * connection can return: it is or may be scrolled back, or keys wait for it,
 * and a keystroke may ask the machine once more. The core then answers "not
 * reachable now" rather than "no pane", so the surface keeps the pane and is
 * itself again the moment a key brings the connection back. Reads memory only.
 * False on a machine whose keystroke's ask has failed (his ruling of
 * 2026-10-02): no key asks there any more, so the core answers "no pane", as
 * today.
 */
export function awaitsReopen(sessionId: string, machineId: string): boolean {
  if (askFailed.has(machineId)) return false;
  const road = roads.get(sessionId);
  if (road === undefined) return false;
  const needed =
    road.parked || road.mayBeParked || road.held.length > 0 || road.unanswered.length > 0;
  if (!needed) return false;
  return reopens.get(machineId)?.pending === true || source.mayReopen?.(machineId) === true;
}

/** F4. Start the one loop that delivers this session's held keys, unless it runs. */
function startFlushing(sessionId: string, road: Road): void {
  if (road.flushing) return;
  road.flushing = true;
  void flushWhenBack(sessionId, road).catch(() => undefined);
}

/**
 * F4. Wait for the session's machine to be on a live connection with the
 * session's row listed on it, then deliver: first, once, the typed sequences
 * the closed connection left unanswered, but only when the pane still reads
 * scrolled back and nothing parked it since (so none of them ran); then every
 * key held since, in the order typed, behind one `cancel`. A row that ended
 * drops them; a machine with no connection for the rest of this run drops
 * them, said once without a byte of them, but only once the one more ask they
 * made of a machine that missed its greeting is over (the ruled round), and
 * from then on keys there take the attach (his ruling of 2026-10-02).
 */
async function flushWhenBack(sessionId: string, road: Road): Promise<void> {
  const epoch = resetEpoch;
  let looks = 0;
  try {
    for (;;) {
      if (epoch !== resetEpoch || roads.get(sessionId) !== road) return;
      if (road.held.length === 0 && road.unanswered.length === 0) return;
      const address = source.address(sessionId);
      if (address.kind === 'ended') {
        road.held = [];
        road.heldBytes = 0;
        road.unanswered = [];
        return;
      }
      const machineId = address.kind === 'unknown' ? road.machineId : address.machineId;
      const carriage: RemoteScrollCarriage =
        machineId === null ? { kind: 'none' } : source.carriage(machineId);
      if (machineId !== null) sawConnection(machineId, carriage);
      if (carriage.kind === 'none') {
        // The ruled round: a machine that missed its greeting is asked once
        // more for these keys, and they wait for that ask alone.
        if (machineId !== null && reopenStillComing(road, machineId)) {
          looks += 1;
          await clock.sleep(looks <= HELD_KEYS_QUICK_POLLS ? HELD_KEYS_POLL_MS : HELD_KEYS_SLOW_POLL_MS);
          continue;
        }
        sayHeldDropped(machineId ?? 'another machine', 'its live connection did not open again');
        road.held = [];
        road.heldBytes = 0;
        road.unanswered = [];
        return;
      }
      if (
        address.kind === 'live' &&
        carriage.kind === 'live' &&
        unreadableConnections.get(address.machineId) !== carriage.generation
      ) {
        await deliverHeld(sessionId, road, address.machineId, address.tmuxId, carriage);
        continue;
      }
      looks += 1;
      await clock.sleep(looks <= HELD_KEYS_QUICK_POLLS ? HELD_KEYS_POLL_MS : HELD_KEYS_SLOW_POLL_MS);
    }
  } finally {
    road.flushing = false;
  }
}

/** F4, one delivery on a connection that is live now. See {@link flushWhenBack}. */
async function deliverHeld(
  sessionId: string,
  road: Road,
  machineId: string,
  tmuxId: string,
  carriage: Extract<RemoteScrollCarriage, { kind: 'live' }>
): Promise<void> {
  let resend = '';
  if (road.unanswered.length > 0) {
    const pending = road.unanswered.splice(0);
    const first = pending[0]?.stamp ?? 0;
    const run = stampedRunner(sessionId, carriage.run);
    noteWritten(sessionId);
    let state: PaneScrollState | null = null;
    try {
      state = await readPaneScroll(run, tmuxId);
      noteAnswer(sessionId, state, run.lastStamp());
    } catch {
      const now = source.carriage(machineId);
      if (now.kind !== 'live' || now.generation !== carriage.generation) {
        // That connection closed too, before anything but the read: still unknown, still kept.
        road.unanswered.unshift(...pending);
        return;
      }
    } finally {
      noteSettled(sessionId);
    }
    // Still scrolled back, and nothing parked it since: none of them ran.
    if (state !== null && state.inMode && road.lastParkStamp < first) {
      resend = pending.map((one) => one.data).join('');
    }
    // Removed or ended while the read was on its way: nothing is sent.
    if (roads.get(sessionId) !== road) return;
  }
  const now = source.carriage(machineId);
  const address = source.address(sessionId);
  if (now.kind !== 'live' || address.kind !== 'live') {
    // Gone again while the read was on its way: what can be sent waits with the rest.
    if (resend !== '') road.held.unshift(resend);
    return;
  }
  const data = resend + road.held.join('');
  road.held = [];
  road.heldBytes = 0;
  if (data === '') return;
  let sent = false;
  try {
    sent = writeTyped(sessionId, machineId, now, address.tmuxId, data);
  } catch {
    sent = false;
  }
  if (!sent) sayHeldDropped(machineId, 'the session could not be addressed on its new connection');
}

/**
 * D6 and D7, for ONE keystroke to a session on another machine, called by the
 * attach host synchronously before it would write the key to the attach.
 *
 * `'carriage'`: the keystroke has ALREADY been written, before this returns,
 * to the machine's control connection as `cancel`, then its UTF-8 bytes as
 * `-H` commands of at most 256 bytes each (the seventh shape), then a read; the
 * host writes nothing to the attach. `'held'` (F4): the pane is or may be
 * parked and its machine's connection is down, so the keystroke is kept here
 * and written behind a `cancel` when the connection is back; the host writes
 * nothing either. `'attach'`: nothing was written anywhere, and the host writes
 * the key to the attach, as today.
 *
 * It takes the carriage only when the pane is parked, may be parked, or has a
 * carriage sequence in flight, AND the session has a live address on its
 * machine's current connection, that connection is live (and readable, unless
 * the carriage is still busy with keys typed before its first read came back),
 * and every command composes to a shape the table admits. Keys held already
 * keep everything after them held, in order. A row that ended, a row no
 * machine holds, a machine with no connection this run that may not be asked
 * again, and anything that throws before the first write are the attach,
 * which is what today does (D9). A machine that missed its greeting is asked
 * once more and the key is held for that ask (the ruled round, GONE); once
 * that ask has failed, the attach again, as today, and nothing asks it again
 * (his ruling of 2026-10-02, "Fall back to today").
 *
 * THERE IS NO AWAIT BEFORE THE WRITE, and it must stay so: the host's listener
 * is synchronous, and the renderer's unmount cannot reach main until it
 * returns (D8), so a key typed and a session left at once is written first.
 */
export function routeKey(sessionId: string, data: string, now: number = clock.now()): KeyRoad {
  // A report the pane sends ABOUT ITSELF (focus, colour, device attributes) is
  // not a keystroke, and it goes to the attach whatever the pane is doing, as
  // today: tmux takes it off the attach before any key table sees it, so it
  // needs no order against a park. Taken for a keystroke over a parked pane it
  // would leave copy mode (the `cancel`) and TYPE its bytes into the program,
  // which is what src/shared/pane-report.ts exists to stop (Phase 205 and
  // Phase 292; the integrator's round of the second build). It does not count
  // as a key on the attach either, so a change of focus holds back no scroll.
  if (isPaneReport(data)) return 'attach';
  const road = roadOf(sessionId);
  road.keys += 1;
  const byAttach = (): KeyRoad => {
    road.lastAttachKeyAt = now;
    return 'attach';
  };
  // F4: while kept keys wait to be delivered, every key queues behind them.
  if (road.flushing) return hold(sessionId, road, null, data);
  if (!keysTakeCarriage(road)) return byAttach();
  try {
    const address = source.address(sessionId);
    if (address.kind === 'ended' || address.kind === 'unknown') return byAttach();
    const carriage = source.carriage(address.machineId);
    sawConnection(address.machineId, carriage);
    if (carriage.kind === 'none') {
      // His ruling of 2026-10-02: once a keystroke's ask of this machine has
      // failed, the attach, exactly as before, so a `q` typed over a pane still
      // scrolled back there leaves copy mode; nothing asks again.
      if (askFailed.has(address.machineId)) return byAttach();
      // The ruled round: a machine that missed its greeting is asked for its
      // connection once more, and the key waits for that ask; the attach would
      // type it into copy mode, where it is eaten. Any other `none` is today's.
      const round = askReopen(address.machineId);
      if (round === null) return byAttach();
      road.reopenRound = round;
      return hold(sessionId, road, address.machineId, data);
    }
    // F4: the pane is or may be parked and its connection is down. The attach
    // would type this into copy mode, where it is eaten; it waits here instead.
    if (carriage.kind !== 'live' || address.kind !== 'live') {
      return hold(sessionId, road, address.machineId, data);
    }
    if (
      unreadableConnections.get(address.machineId) === carriage.generation &&
      !carriageBusy(road)
    ) {
      return byAttach();
    }
    if (!writeTyped(sessionId, address.machineId, carriage, address.tmuxId, data)) {
      return byAttach();
    }
    return 'carriage';
  } catch {
    // Before the first write: nothing crossed, so the attach carries it.
    return byAttach();
  }
}

/** Forget one session: it was removed, or it ended on its machine. Its held keys go with it. */
export function forgetSession(sessionId: string): void {
  roads.delete(sessionId);
}

/**
 * Test seam: forget everything; read and sleep on `testClock`, and take a
 * keystroke's carriage from `testSource`, when either is given. A held-key loop
 * started before ends at its next look.
 */
export function resetScrollOrderForTests(
  testClock?: ScrollOrderClock,
  testSource?: KeyCarriageSource
): void {
  roads.clear();
  unreadableConnections.clear();
  typedFailureSaid.clear();
  heldDropSaid.clear();
  reopens.clear();
  askFailed.clear();
  writeOrder = 0;
  resetEpoch += 1;
  clock = testClock ?? REAL_CLOCK;
  source = testSource ?? SHIPPING_SOURCE;
}
