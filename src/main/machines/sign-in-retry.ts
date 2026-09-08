/**
 * A bounded retry of the launch sign-in, for a machine that did not answer
 * when Tortie started (Phase 232, item 3).
 *
 * ## The state this ends, measured
 *
 * `signInToConfirmedMachines` in `../sessions/core.ts` is the first of the
 * three moments Tortie signs in to a machine. A row that answered anything but
 * `prepared` there was marked quiet and never asked again: research 85
 * section 4.4 found that the only control that reconnects is Prepare in
 * Settings, and research 91 section 4.4 held a launch for 75 seconds after an
 * unreachable row failed and counted zero retries, the machine's state byte
 * identical before and after. A machine that was asleep or off the VPN at the
 * moment Tortie launched stayed dead for the whole run.
 *
 * ## Why this may start a process, stated because it must be
 *
 * `prepareMachine` can boot a tmux server on that machine, so a retry does
 * start a process. Phase 23 refusal 8 forbids a process starting on a
 * configuration change alone. A retry of a launch sign-in is NOT a
 * configuration change: it is the same act the person authorised when they
 * confirmed the machine, which the launch already performs unprompted for
 * that reason. Every clause of the shape below follows from that sentence,
 * and `./__tests__/sign-in-retry.test.ts` pins each one so it cannot be
 * widened in silence.
 *
 * ## The shape
 *
 *  - TRIGGERED BY TIME. A backoff starting at {@link SIGN_IN_RETRY_FIRST_MS},
 *    doubling on every attempt that does not prepare the machine, and capped
 *    at {@link SIGN_IN_RETRY_CAP_MS}. The DELAY stops growing at the cap and
 *    the attempts continue at that cadence: a retry that gave up once it
 *    reached the cap would leave a machine that came back twenty minutes after
 *    launch dead for the run, which is the state this module exists to end.
 *    Five minutes between attempts against a machine that is off costs two
 *    version reads and starts nothing on it, because the gate inside
 *    `prepareMachine` refuses before any server is born.
 *  - TRIGGERED BY THE MACHINE BECOMING REACHABLE. The link record in
 *    `./control-plane.ts` moves into an answering state only when a command
 *    over ssh to that machine completed, so a link event that puts an armed
 *    machine on `connected` or `polling` is an attempt now rather than at the
 *    next tick. It is the same act, sooner.
 *  - NEVER BY ANY FILE CHANGING. `machines.json` has a watcher in `./store.ts`
 *    that reloads the rows 300 ms after an edit and fires `onMachinesChanged`,
 *    which `./machine-state.ts` folds into the same push the renderer hears
 *    beside `onMachineConfirmationsChanged`. This module subscribes to
 *    NEITHER, and imports neither name, because a retry armed off either is a
 *    retry a file edit can fire, which is exactly refusal 8's line. The test
 *    fires both and counts zero attempts.
 *  - NEVER FOR A ROW WHOSE CONFIRMATION DOES NOT HOLD AT THAT MOMENT.
 *    `isMachineConfirmed` in `./confirm.ts` reads the confirmation record from
 *    disk on every ask and compares it to the row's six execution bearing
 *    fields; it is asked immediately before each attempt and its answer is
 *    never cached. A row whose confirmation has moved, or that is no longer in
 *    the file, STOPS the retry rather than skipping one tick, because from
 *    that moment the machine is the person's again through Settings, where
 *    Confirm and Prepare both are. The row's fields come from memory, which
 *    the watcher refreshes; `prepareMachine` asks the same gate again over the
 *    same fields before it composes anything, so a field rewritten on disk
 *    while an attempt is in flight is refused twice and the edited bytes reach
 *    no command line.
 *  - STARTED by the launch sign-in for each row that answered other than
 *    `prepared`. It is keyed on "not prepared" and not on a failure class, and
 *    the reason is research 91 section 1: at this phase's parent the
 *    unreachable machine fails at launch as `version-unmeasured` rather than
 *    `timed-out`, because both version reads are killed at the deadline before
 *    ssh's own sentence lands, so a retry keyed to the unreached classes would
 *    retry nothing at the parent's sentence. Phase 235 changes that class and
 *    this key does not care. The cost is that a machine which genuinely runs a
 *    version nobody measured is asked again every five minutes, two reads that
 *    start nothing.
 *  - STOPPED on `prepared`, whether this module's own attempt or a person's
 *    press in Settings reached it; on remove, from the remove channel; and on
 *    shutdown, from the ordered disposer in `../capabilities.ts`, whose first
 *    synchronous lines are where {@link stopSignInRetries} sits so that no
 *    attempt can begin once the quit has started. An attempt already past its
 *    lock into `prepareMachine` runs to its answer, its ssh children being the
 *    execution ledger's to end, and schedules nothing after.
 *  - ONE LOG LINE PER ATTEMPT naming the machine, the attempt number, the
 *    trigger and the delay it waited, and one more naming the next delay when
 *    the attempt did not prepare the machine. They are what a verifier counts.
 *
 * ## What it deliberately does not do
 *
 * It does not call `allowControlPlaneAgain`. Phase 83's greeting deadline set
 * is cleared by a person pressing Prepare, and a retry is not a person. It
 * does not call `markMachineQuiet` on a failed attempt: the machine is quiet
 * already and its sentence is still true. It retries the launch sign-in and
 * nothing else, not a session, not a script, not a write.
 */

import { getLog } from '../log';
import { isMachineConfirmed } from './confirm';
import { machineLinkFacts, onMachineLinkChanged } from './control-plane';
import { prepareMachine } from './prepare';
import {
  machineFieldsOf,
  machineHostKeysPath,
  machineLabelOf,
  machineRow
} from './store';

const retryLog = getLog('config');

/** The first delay, 30 seconds. */
export const SIGN_IN_RETRY_FIRST_MS = 30_000;

/** The cap, five minutes. The delay stops growing here; the attempts do not. */
export const SIGN_IN_RETRY_CAP_MS = 5 * 60_000;

/** What a retry attempt was fired by. */
export type SignInRetryTrigger = 'time' | 'reachable';

/** Why a retry ended. */
export type SignInRetryStop =
  | 'prepared'
  | 'removed'
  | 'shutdown'
  | 'row-gone'
  | 'confirmation-moved';

interface RetryEntry {
  /** Attempts made so far, so the first attempt logs as 1. */
  attempt: number;
  /** The delay the pending timer was armed with. */
  delayMs: number;
  timer: NodeJS.Timeout | null;
  /** An attempt is awaiting `prepareMachine`. */
  inFlight: boolean;
  /** The link kind last seen for this machine, so a change is a change. */
  lastLink: string;
}

const armed = new Map<string, RetryEntry>();
let unhookLink: (() => void) | null = null;
let closed = false;

/** What is known about one machine's retry, for tests and the log. */
export interface SignInRetryFacts {
  readonly attempt: number;
  readonly delayMs: number;
  readonly inFlight: boolean;
}

export function signInRetryFacts(machineId: string): SignInRetryFacts | null {
  const entry = armed.get(machineId);
  if (entry === undefined) return null;
  return {
    attempt: entry.attempt,
    delayMs: entry.delayMs,
    inFlight: entry.inFlight
  };
}

/** Every machine with a retry armed, sorted, for the log and the tests. */
export function armedSignInRetries(): readonly string[] {
  return [...armed.keys()].sort();
}

const ANSWERING = new Set(['connected', 'polling']);

/**
 * The one subscription this module holds, installed on the first arm and
 * released on shutdown. It listens to the LINK and to nothing a file moves.
 */
function hookLink(): void {
  if (unhookLink !== null) return;
  unhookLink = onMachineLinkChanged(() => {
    for (const [machineId, entry] of armed) {
      const link = machineLinkFacts(machineId).link;
      const was = entry.lastLink;
      entry.lastLink = link;
      if (ANSWERING.has(link) && !ANSWERING.has(was)) {
        void attempt(machineId, 'reachable');
      }
    }
  });
}

function unhookLinkIfIdle(): void {
  if (armed.size > 0 || unhookLink === null) return;
  unhookLink();
  unhookLink = null;
}

function clearTimer(entry: RetryEntry): void {
  if (entry.timer !== null) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}

function schedule(machineId: string, entry: RetryEntry, delayMs: number): void {
  clearTimer(entry);
  entry.delayMs = delayMs;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void attempt(machineId, 'time');
  }, delayMs);
  entry.timer.unref?.();
}

function seconds(ms: number): string {
  return `${String(Math.round(ms / 1000))} s`;
}

/**
 * Arm a retry for a machine whose launch sign-in answered other than
 * `prepared`. A second arm for the same machine changes nothing.
 */
export function armSignInRetry(machineId: string): void {
  if (closed) return;
  if (armed.has(machineId)) return;
  const entry: RetryEntry = {
    attempt: 0,
    delayMs: SIGN_IN_RETRY_FIRST_MS,
    timer: null,
    inFlight: false,
    lastLink: machineLinkFacts(machineId).link
  };
  armed.set(machineId, entry);
  hookLink();
  schedule(machineId, entry, SIGN_IN_RETRY_FIRST_MS);
  retryLog.info(
    `${machineId} did not prepare at launch; sign-in retry 1 in ` +
      `${seconds(SIGN_IN_RETRY_FIRST_MS)}`
  );
}

/** Stop one machine's retry. A machine with none is left alone. */
export function stopSignInRetry(
  machineId: string,
  why: SignInRetryStop
): void {
  const entry = armed.get(machineId);
  if (entry === undefined) return;
  clearTimer(entry);
  armed.delete(machineId);
  retryLog.info(
    `${machineId} sign-in retry stopped after ${String(entry.attempt)} ` +
      `attempt(s): ${why}`
  );
  unhookLinkIfIdle();
}

/**
 * Stop every retry and refuse any new one. The ordered disposer's line, and
 * it is synchronous so it can sit before the disposer's first await.
 */
export function stopSignInRetries(): void {
  closed = true;
  for (const machineId of [...armed.keys()]) {
    stopSignInRetry(machineId, 'shutdown');
  }
  unhookLinkIfIdle();
}

async function attempt(
  machineId: string,
  trigger: SignInRetryTrigger
): Promise<void> {
  const entry = armed.get(machineId);
  if (entry === undefined || closed) return;
  if (entry.inFlight) return;
  clearTimer(entry);

  // THE SEAL, ASKED NOW AND NEVER CACHED. The row's fields are the memory copy
  // the watcher refreshes; the confirmation is read from disk by this call.
  const row = machineRow(machineId);
  if (row === null) {
    stopSignInRetry(machineId, 'row-gone');
    return;
  }
  const fields = machineFieldsOf(row);
  if (!isMachineConfirmed(machineId, fields)) {
    stopSignInRetry(machineId, 'confirmation-moved');
    return;
  }

  entry.attempt += 1;
  const n = entry.attempt;
  retryLog.info(
    `${machineId} sign-in retry ${String(n)} (${trigger}, after ` +
      `${seconds(entry.delayMs)})`
  );
  entry.inFlight = true;
  let prepared = false;
  let said: string;
  try {
    const result = await prepareMachine({
      machineId,
      fields,
      tortieHostKeys: machineHostKeysPath(),
      label: machineLabelOf(row)
    });
    prepared = result.class === 'prepared';
    said = `answered ${result.class}: ${result.detail}`;
  } catch (err) {
    said = `failed: ${(err as Error).message}`;
  } finally {
    entry.inFlight = false;
  }
  // Stopped while the attempt was in flight, by a remove or the quit.
  if (!armed.has(machineId) || closed) return;
  if (prepared) {
    retryLog.info(`${machineId} prepared on sign-in retry ${String(n)}`);
    stopSignInRetry(machineId, 'prepared');
    return;
  }
  const next = Math.min(entry.delayMs * 2, SIGN_IN_RETRY_CAP_MS);
  retryLog.warn(
    `${machineId} ${said}; sign-in retry ${String(n + 1)} in ${seconds(next)}`
  );
  schedule(machineId, entry, next);
}

/** Drop every retry, every timer and the subscription. Tests only. */
export function resetSignInRetryForTests(): void {
  for (const entry of armed.values()) clearTimer(entry);
  armed.clear();
  if (unhookLink !== null) {
    unhookLink();
    unhookLink = null;
  }
  closed = false;
}
