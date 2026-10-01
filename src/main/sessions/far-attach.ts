/**
 * PHASE 326. How an attach to a session on another machine waits for that
 * machine to say where the session is.
 *
 * WHAT WAS WRONG. A session created alone in a remote tab is mounted, and so
 * attached, the moment its create resolves in the renderer. On the far side
 * the `@gmux-id` stamp is a second command after `new-session`, so for a few
 * milliseconds a list of that machine holds the new session unstamped, and a
 * pass inside that window counted it as a session Tortie did not create. The
 * attach found no feed row, fell through to the LOCAL branch of
 * `attachSessionAdmitted`, listed THIS Mac's tmux server, did not find a
 * session that runs on another machine, and refused with "This session is no
 * longer running." The pane drew "This session no longer exists" over a
 * session that was running. Phase 320's logs held 16 such refusals, every one
 * of them carrying that local sentence.
 *
 * WHAT THIS MODULE DOES. It answers one question for `../sessions/core.ts`:
 * for a session whose durable record names another machine, has that machine
 * listed it yet, and if not, may Tortie say it is absent? It never lists this
 * Mac's server, and it imports nothing from `../tmux`, so it cannot. The loop
 * in {@link awaitFarBinding} is the whole policy, one turn at a time:
 *
 *   1. the feed lists the session                  -> `row`
 *   2. a create for it is running in this process  -> wait for that create
 *   3. no record of it remains                     -> `absent`
 *   4. this attach's OWN list has been asked       -> `absent` only when a list
 *      asked at or after it completed and the record now reads restorable or
 *      exited, otherwise `unanswered`
 *   5. the budget is spent                         -> `unanswered`
 *   6. the machine is signed in                    -> ask ONE list of it
 *   7. otherwise                                   -> wait for the next announce,
 *      at most {@link ANNOUNCE_RECHECK_MS} at a time
 *
 * Liveness, being whether the pane that asked still wants the session, is
 * asked at the top of every turn and after every await, and a wait that is no
 * longer wanted answers `stale`, which spawns nothing and says nothing.
 *
 * WHY A LIST OF ITS OWN, rather than trusting the create's. The create's own
 * list can be overwritten by an older one (the feed's `state.rows = seen`,
 * which is not this phase's), and absence may only be concluded from a list
 * that was asked after the attach was.
 *
 * It is pure policy over injected dependencies, the shape Phase 125 gave
 * `./mutation-ledger.ts`, so the loop is driven in a unit test with a fake
 * clock and no machine. {@link defaultFarAttachDeps} is the one place the
 * dependencies are wired to the machine layer.
 *
 * Every timer this module makes is cleared and `unref`'d, and every listener it
 * adds is removed, on every outcome.
 */

import type { SessionStatus } from '@shared/types';
import { gmuxError, type GmuxError } from '../errors';
import {
  onRemoteSessionsChanged,
  pollRemoteMachine,
  projectRemoteRecord,
  readyRemoteContext,
  remoteListCompletedSince,
  remoteSessionRow,
  type RemoteSessionRow
} from '../machines/remote-sessions';
import { remoteRecordOf } from '../machines/remote-record';
import { machineRow } from '../machines/store';
import {
  awaitRemoteCreateSettled,
  remoteCreateInFlight,
  type CreateSettle
} from '../machines/create-inflight';
import { ATTACH_NOT_HEARD, MACHINE_NOT_READY } from '../machines/remote-copy';

export type { RemoteSessionRow } from '../machines/remote-sessions';

/**
 * How long an attach to a session on another machine may wait for that machine
 * to list it, from the moment the attach was asked.
 *
 * CHOSEN, NOT MEASURED (build/p326/SPEC.md D5). It is never more than the quit
 * path's `MUTATION_JOIN_DEADLINE_MS` (10,000), and shutdown ends the wait at
 * once anyway, so it never lengthens a quit. It covers a create's remaining
 * work over a slow link by an order of magnitude: the answer, four stamps and
 * one list are about six round trips. A machine slower than this gets Try again
 * rather than a blank screen.
 */
export const REMOTE_ATTACH_BIND_WAIT_MS = 7_000;

/** How long one quiet turn of the wait lasts before it asks again. */
export const ANNOUNCE_RECHECK_MS = 500;

/**
 * Which attach to a session is the one still wanted.
 *
 * One counter. {@link take} moves it and {@link invalidate} forgets the
 * session's ticket, so either stops every earlier ticket holding, and
 * {@link holds} compares. `../sessions/core.ts` takes a ticket as the FIRST statement of
 * every attach, before any await; `detachSession` and every newer attach for
 * the same id move it, so an attach that waited for its machine and comes back
 * to a pane that has gone, or has been replaced, spawns nothing.
 *
 * {@link shutdown} aborts the one signal every wait listens to, so a quit is
 * never held by an attach that is waiting for a machine.
 */
export class AttachTickets {
  private counter = 0;
  private readonly current = new Map<string, number>();
  private readonly controller = new AbortController();

  /** A new ticket for this session. Every earlier ticket for it stops holding. */
  take(sessionId: string): number {
    this.counter += 1;
    this.current.set(sessionId, this.counter);
    return this.counter;
  }

  /** No ticket for this session holds any more. */
  invalidate(sessionId: string): void {
    this.current.delete(sessionId);
  }

  /** True when `ticket` is the last one taken for this session and not moved since. */
  holds(sessionId: string, ticket: number): boolean {
    return this.current.get(sessionId) === ticket;
  }

  /** Abort {@link signal}. Idempotent. */
  shutdown(): void {
    if (!this.controller.signal.aborted) this.controller.abort();
  }

  /** Aborted by {@link shutdown}. Every wait in this module listens to it. */
  get signal(): AbortSignal {
    return this.controller.signal;
  }
}

/** What the wait decided. */
export type FarBinding =
  /** The machine listed it: attach to the `$-id` that list reported. */
  | { readonly kind: 'row'; readonly row: RemoteSessionRow }
  /** Proved gone: its create took its record back, or a fresh list lacked it. */
  | { readonly kind: 'absent'; readonly why: string }
  /** Not proved either way within the budget. The pane offers Try again. */
  | { readonly kind: 'unanswered'; readonly why: string }
  /** This run does not know the machine the record names. */
  | { readonly kind: 'machine-unknown' }
  /** The pane that asked no longer wants it, or Tortie is quitting. */
  | { readonly kind: 'stale' };

/** What {@link awaitFarBinding} reads the machine layer through. */
export interface FarAttachDeps {
  /** The feed's row for this id, live or ended (`remoteSessionRow`). */
  row(sessionId: string): RemoteSessionRow | null;
  /** True while the durable record exists (`remoteRecordOf(id) !== null`). */
  recordExists(sessionId: string): boolean;
  /** The status the record projects now (`projectRemoteRecord(record).status`). */
  projectedStatus(sessionId: string): SessionStatus | null;
  /** True when this run knows the machine (`machineRow(id) !== null`). */
  machineKnown(machineId: string): boolean;
  /** True while a create for this id runs in this process (`remoteCreateInFlight`). */
  inFlight(sessionId: string): boolean;
  /** Wait for that create to end, bounded (`awaitRemoteCreateSettled`). */
  settled(sessionId: string, ms: number, signal: AbortSignal): Promise<CreateSettle>;
  /** True when `readyRemoteContext` does not throw for this machine. */
  contextReady(machineId: string): boolean;
  /** Ask one list of the machine (`pollRemoteMachine`). */
  poll(machineId: string): Promise<void>;
  /** True when a list asked at or after `at` completed (`remoteListCompletedSince`). */
  listCompletedSince(machineId: string, at: number): boolean;
  /** Resolve on the next remote announce, after `ms`, or on abort, whichever is first. */
  nextAnnounce(ms: number, signal: AbortSignal): Promise<void>;
  /** This Mac's clock. */
  now(): number;
}

/** The dependencies, wired to the machine layer. The only place that is done. */
export function defaultFarAttachDeps(): FarAttachDeps {
  return {
    row: (sessionId) => remoteSessionRow(sessionId),
    recordExists: (sessionId) => remoteRecordOf(sessionId) !== null,
    projectedStatus: (sessionId) => {
      const record = remoteRecordOf(sessionId);
      return record === null ? null : projectRemoteRecord(record).status;
    },
    machineKnown: (machineId) => machineRow(machineId) !== null,
    inFlight: (sessionId) => remoteCreateInFlight(sessionId),
    settled: (sessionId, ms, signal) =>
      awaitRemoteCreateSettled(sessionId, ms, signal),
    contextReady: (machineId) => {
      try {
        readyRemoteContext(machineId);
        return true;
      } catch {
        return false;
      }
    },
    poll: (machineId) => pollRemoteMachine(machineId),
    listCompletedSince: (machineId, at) => remoteListCompletedSince(machineId, at),
    nextAnnounce: (ms, signal) => nextRemoteAnnounce(ms, signal),
    now: () => Date.now()
  };
}

/**
 * The next remote announce, or `ms`, or the abort, whichever comes first.
 *
 * Subscribed once and ALWAYS unsubscribed, the timer cleared, the abort
 * listener removed, whichever of the three ended it.
 */
function nextRemoteAnnounce(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    let done = false;
    let unsubscribe: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      if (unsubscribe !== null) unsubscribe();
      signal.removeEventListener('abort', finish);
      resolve();
    };
    unsubscribe = onRemoteSessionsChanged(finish);
    timer = setTimeout(finish, Math.max(0, ms));
    timer.unref?.();
    signal.addEventListener('abort', finish, { once: true });
  });
}

/**
 * Wait for `work` to settle, for `ms`, or for the abort, whichever is first.
 *
 * A rejection of `work` is swallowed here on purpose: a list that failed proves
 * nothing, and the next turn of the loop reads that from
 * {@link FarAttachDeps.listCompletedSince} rather than from the error.
 */
function settleWithin(
  work: Promise<void>,
  ms: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    work.then(finish, finish);
    if (signal.aborted) {
      finish();
      return;
    }
    timer = setTimeout(finish, Math.max(0, ms));
    timer.unref?.();
    signal.addEventListener('abort', finish, { once: true });
  });
}

const STALE: FarBinding = { kind: 'stale' };

/**
 * Wait until the machine this session runs on lists it, proves it absent, or
 * the budget is spent. The loop, in exactly the order the module header gives.
 */
export async function awaitFarBinding(
  deps: FarAttachDeps,
  input: {
    sessionId: string;
    machineId: string;
    budgetMs: number;
    live(): boolean;
    signal: AbortSignal;
  }
): Promise<FarBinding> {
  const { sessionId, machineId, budgetMs, signal } = input;
  const gone = (): boolean => signal.aborted || !input.live();
  if (gone()) return STALE;
  if (!deps.machineKnown(machineId)) return { kind: 'machine-unknown' };
  const started = deps.now();
  /** When this attach asked its own list, or null before it has. */
  let ownListAt: number | null = null;
  for (;;) {
    if (gone()) return STALE;
    // 1. The feed lists it.
    const row = deps.row(sessionId);
    if (row !== null) return { kind: 'row', row };
    const left = budgetMs - (deps.now() - started);
    // 2. Its create is still running in this process. Wait for it.
    if (left > 0 && deps.inFlight(sessionId)) {
      await deps.settled(sessionId, left, signal);
      if (gone()) return STALE;
      continue;
    }
    // 3. The create took its record back (Phase 72), or nothing ever held one.
    if (!deps.recordExists(sessionId)) {
      return { kind: 'absent', why: 'no record of it remains' };
    }
    // 4. This attach's own list has been asked.
    if (ownListAt !== null) {
      const answered = deps.listCompletedSince(machineId, ownListAt);
      const status = deps.projectedStatus(sessionId);
      if (answered && (status === 'restorable' || status === 'exited')) {
        return {
          kind: 'absent',
          why: `a list asked after the attach did not hold it (${status})`
        };
      }
      return {
        kind: 'unanswered',
        why: answered
          ? `a list asked after the attach answered and it reads ${String(status)}`
          : 'no list asked after the attach answered in time'
      };
    }
    // 5. The budget is spent.
    if (left <= 0) {
      return {
        kind: 'unanswered',
        why: `nothing answered within ${String(budgetMs)} ms`
      };
    }
    // 6. The machine is signed in. Ask it once, bounded by what is left.
    if (deps.contextReady(machineId)) {
      ownListAt = deps.now();
      await settleWithin(deps.poll(machineId), left, signal);
      if (gone()) return STALE;
      continue;
    }
    // 7. Not signed in yet, e.g. a relaunch. Wait for the next announce.
    await deps.nextAnnounce(Math.min(ANNOUNCE_RECHECK_MS, left), signal);
    if (gone()) return STALE;
  }
}

/**
 * The typed refusal for a wait that did not end in a row.
 *
 * `absent` is the remote branch's own sentence, the one an ended feed row has
 * always drawn. `unanswered` is the one new sentence, which the pane draws
 * under "Can't connect to this session" with Try again. `machine-unknown` is
 * the existing sentence for a machine this run has not signed in to. The
 * detail is for the log alone.
 */
export function farBindingRefusal(
  verdict: Exclude<FarBinding, { kind: 'row' } | { kind: 'stale' }>,
  who: { machineId: string; tmuxName: string }
): GmuxError {
  const at = `${who.machineId} ${who.tmuxName}`;
  switch (verdict.kind) {
    case 'absent':
      return gmuxError(
        'SESSION_NOT_FOUND',
        'This session is not running right now.',
        `${at}: ${verdict.why}`
      );
    case 'unanswered':
      return gmuxError('TMUX_UNREACHABLE', ATTACH_NOT_HEARD, `${at}: ${verdict.why}`);
    case 'machine-unknown':
      return gmuxError(
        'INVALID_INPUT',
        MACHINE_NOT_READY,
        `${at}: this run does not know that machine`
      );
  }
}
