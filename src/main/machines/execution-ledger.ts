/**
 * Who owns the long running ssh children (Phase 118, audit phase 2 item 1).
 *
 * ## The defect this closes
 *
 * `./exec-plane.ts` spawns every ssh child this product starts, and before this
 * phase it registered them with nothing. A copy of a project onto another
 * machine gets 600,000 ms. Quitting Tortie neither ended that child nor waited
 * for it, and no record anywhere said which of the two had happened. A person
 * came back to a folder partly copied on another computer with no explanation.
 *
 * ## The shape, which is Phase 116's shape rather than a second one
 *
 * `../sessions/mutation-ledger.ts` already owns a lifecycle with a typed
 * refusal, an admit set and a bounded join. This file copies it:
 *
 *  1. {@link beginRemoteExecutionShutdown} sets a flag SYNCHRONOUSLY, with no
 *     await in front of it, so the gate closes in the same tick the quit starts.
 *  2. {@link admitRemoteExecution} refuses after that flag is set, with
 *     {@link REMOTE_EXEC_SHUTDOWN} under the code `SHUTTING_DOWN`, which is the
 *     same code Phase 116 uses. A renderer that already handles it needs no
 *     change.
 *  3. {@link cancelRemoteExecutions} ends every child that is still running.
 *  4. {@link joinRemoteExecutions} waits for them, bounded, and measures it.
 *
 * ## The one seam
 *
 * Every long running remote child in this product goes through exactly two
 * lines, being `spawnTmux` and `execRemoteShell` in `./exec-plane.ts`. Clone,
 * capture, harvest and store sync all reach one of those two. So this ledger is
 * installed at those two sites and nowhere else, and
 * `build/conformance-machines.mjs` counts the `execFileP` call sites so a third
 * one fails the build.
 *
 * LOCAL WORK IS NOT ADMITTED. A local `execFile` of tmux on this Mac takes
 * milliseconds and is not what the audit is about. The guard reads
 * `ctx.kind === 'remote'`.
 *
 * THE CONNECTION TEST IS NOT HERE EITHER. It spawns a pty rather than an
 * `execFile` child and it is already cancelled at quit by
 * `cancelLiveMachineTest()`. This phase does not move it.
 *
 * ## What is written down, and what is only classified
 *
 * All five kinds are classified in memory and logged. ONE is journaled, being
 * the copy, because it is the one kind that writes on the other computer. The
 * reasoning is at the head of `../manifest/remote-executions.ts` and the
 * migration repeats it.
 *
 * ## The edge is one way
 *
 * `./remote-record.ts` imports this module, to install the journal and to run
 * the boot read. This module imports NOTHING from `./remote-record.ts`. No cycle
 * is created, which matters because Phase 123 is about cycles and this phase
 * must not add one.
 */

import type { ChildProcess } from 'node:child_process';
import { gmuxError } from '../errors';
import { getLog } from '../log';
// IMPORTED FROM THE MODULE AND NOT FROM `../manifest`, and that is load
// bearing rather than a style choice. The manifest barrel re-exports
// `./reconstruct`, which reaches `../tmux` and then `./exec-plane.ts`, which
// imports this file. Through the barrel that is a cycle, and it also drags the
// machines store and its native file watcher into the manifest's own bundle,
// which is what `build/contract-inventory.mjs` bundles to read the schema.
// Measured: the inventory failed to build at all. This file imports only the
// journal module, which imports nothing but `../db/sqlite`.
import {
  JOURNALED_REMOTE_EXECUTION_KIND,
  type RemoteExecutionBegin,
  type RemoteExecutionKind,
  type RemoteExecutionOutcome,
  type RemoteExecutionRecord
} from '../manifest/remote-executions';
import { postDurabilityNotice } from '../notice';

export type {
  RemoteExecutionKind,
  RemoteExecutionOutcome,
  RemoteExecutionRecord
} from '../manifest/remote-executions';

const ledgerLog = getLog('config');

/**
 * The refusal a remote call gets once the quit has started.
 *
 * PINNED as `machine.remote-exec-shutdown` in `build/assert-bundle-refusals.mjs`.
 *
 * A person almost never reads it, because it fires only after they chose to
 * quit, while the windows are closing. It exists so that any surface which does
 * render the error, e.g. a log line or a clone sheet that is still up, shows a
 * true and simple sentence.
 */
export const REMOTE_EXEC_SHUTDOWN =
  'Tortie is quitting, so nothing more was sent to that machine.';

/**
 * Between SIGTERM and SIGKILL. 250 ms. CHOSEN, not measured.
 *
 * ssh exits on SIGTERM at once. The grace exists so a child part way through a
 * write to a pipe can unwind rather than leave half a line in a log. The
 * harness measures the real number and prints it.
 */
export const CANCEL_GRACE_MS = 250;

/**
 * How long the quit waits for the cancelled children. 3,000 ms. CHOSEN.
 *
 * Every child has already been signalled by the time the join starts, so the
 * wait is for a promise to settle rather than for a machine to answer. The
 * common quit pays 0 ms, because the set is empty.
 */
export const REMOTE_JOIN_BOUND_MS = 3_000;

/** What a caller says about the work it is starting. */
export interface RemoteExecutionStart {
  readonly machineId: string;
  readonly kind: RemoteExecutionKind;
  /** What a person would call it, e.g. the destination folder. May be ''. */
  readonly subject: string;
  /**
   * The machine as the person named it, when the caller already knows it.
   *
   * IT IS PASSED IN RATHER THAN LOOKED UP HERE, on purpose. Reading it here
   * would mean this file importing `./store.ts`, which carries a native file
   * watcher, and the only kind that needs a label is the copy, whose caller
   * already composed one for its own sentences. A caller that leaves it out is
   * recorded under the machine's id, which is still a true name for it.
   */
  readonly machineLabel?: string;
}

/** The handle the exec plane uses to give the ledger its ssh child. */
export interface RemoteExecutionHold {
  /** Hand the ledger the ssh child, so a quit can end it. Called once. */
  own(child: ChildProcess): void;
}

/** One piece of remote work, as the harness and the log read it. */
export interface RemoteExecutionFact {
  /** This run's own counter, from 1. */
  readonly seq: number;
  readonly machineId: string;
  readonly machineLabel: string;
  readonly kind: RemoteExecutionKind;
  readonly subject: string;
  readonly startedAt: number;
  /** null until `own()` is called. */
  readonly pid: number | null;
  /** The manifest row, for a copy only. null for every other kind. */
  readonly journalId: number | null;
  /** null while the work is still open. */
  readonly outcome: RemoteExecutionOutcome | null;
}

/** What one join actually did, measured rather than assumed. */
export interface RemoteJoinReport {
  /** Children this cancel signalled. */
  readonly cancelled: number;
  /** Entries that settled inside the bound. */
  readonly joined: number;
  /** Entries still open when the bound expired. */
  readonly unjoined: number;
  /** How long the wait really took. */
  readonly waitedMs: number;
}

/**
 * The manifest surface this ledger uses. It is written out here rather than
 * imported as `ManifestStore`, so the machine layer never holds that class.
 * `ManifestStore` satisfies it by shape.
 */
export interface RemoteExecutionJournalStore {
  beginRemoteExecution(input: RemoteExecutionBegin, at?: number): number;
  finishRemoteExecution(
    id: number,
    outcome: RemoteExecutionOutcome,
    at?: number
  ): void;
  listUnfinishedRemoteExecutions(): RemoteExecutionRecord[];
}

interface LedgerEntry {
  readonly seq: number;
  readonly machineId: string;
  readonly machineLabel: string;
  readonly kind: RemoteExecutionKind;
  readonly subject: string;
  readonly startedAt: number;
  child: ChildProcess | null;
  pid: number | null;
  journalId: number | null;
  outcome: RemoteExecutionOutcome | null;
  /** True once a cancel signalled this entry's child. */
  cancelled: boolean;
  /** Resolves when the caller's own promise settles, either way. */
  readonly settled: Promise<void>;
  markSettled: () => void;
}

// ---------------------------------------------------------------------------
// The module state
// ---------------------------------------------------------------------------

/** False once the quit began. Every refusal reads it. */
let shuttingDown = false;

/** Work that is still open, in the order it was admitted. */
const open = new Set<LedgerEntry>();

/** Everything this run classified, newest last. */
let classified: RemoteExecutionFact[] = [];

/** This run's own counter. */
let counter = 0;

/** The manifest, installed by `./remote-record.ts` and never by anything else. */
let journal: RemoteExecutionJournalStore | null = null;

// ---------------------------------------------------------------------------
// The lifecycle
// ---------------------------------------------------------------------------

/** False once shutdown began. */
export function remoteExecutionsAccepted(): boolean {
  return !shuttingDown;
}

/**
 * Close the gate. SYNCHRONOUS, with no await before it, so nothing can slip
 * through between the decision to quit and the refusal being live.
 */
export function beginRemoteExecutionShutdown(): void {
  shuttingDown = true;
}

/** Install the manifest for the journaled rows. One caller. */
export function setRemoteExecutionJournal(
  store: RemoteExecutionJournalStore | null
): void {
  journal = store;
}

/** Open entries. For the harness and for diagnostics. */
export function liveRemoteExecutions(): readonly RemoteExecutionFact[] {
  return [...open].map(factOf);
}

/** Everything this run classified, newest last. For the harness. */
export function settledRemoteExecutions(): readonly RemoteExecutionFact[] {
  return classified;
}

/** Clear the flag, the entries and the counter. Tests and the harness. */
export function resetRemoteExecutionLedgerForTests(): void {
  shuttingDown = false;
  open.clear();
  classified = [];
  counter = 0;
  journal = null;
}

function factOf(entry: LedgerEntry): RemoteExecutionFact {
  return {
    seq: entry.seq,
    machineId: entry.machineId,
    machineLabel: entry.machineLabel,
    kind: entry.kind,
    subject: entry.subject,
    startedAt: entry.startedAt,
    pid: entry.pid,
    journalId: entry.journalId,
    outcome: entry.outcome
  };
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

/**
 * Run one piece of remote work under the ledger's ownership.
 *
 * A call that arrives after the quit began is REFUSED before `run` is called,
 * so no argv for it is ever composed and no ssh child is ever spawned. A call
 * that arrives before is recorded, so the quit can end its child and wait for
 * it.
 *
 * The caller gets its OWN promise back, with its own value and its own error.
 * The tracked copy the ledger keeps swallows the settlement, exactly as
 * `GmuxCore.admit` does, because the ledger only needs to know when the work is
 * over.
 *
 * @throws GmuxError SHUTTING_DOWN carrying {@link REMOTE_EXEC_SHUTDOWN}.
 */
export function admitRemoteExecution<T>(
  start: RemoteExecutionStart,
  run: (hold: RemoteExecutionHold) => Promise<T>
): Promise<T> {
  if (shuttingDown) {
    return Promise.reject(
      gmuxError(
        'SHUTTING_DOWN',
        REMOTE_EXEC_SHUTDOWN,
        `refused ${start.kind} for machine ${start.machineId}: Tortie is ` +
          `quitting`
      )
    );
  }
  const entry = openEntry(start);
  let work: Promise<T>;
  try {
    work = run({
      own: (child: ChildProcess): void => {
        entry.child = child;
        entry.pid = child.pid ?? null;
      }
    });
  } catch (err) {
    // A synchronous throw out of `run` is still an ended piece of work.
    closeEntry(entry, 'failed');
    throw err;
  }
  void work.then(
    () => closeEntry(entry, 'answered'),
    () => closeEntry(entry, 'failed')
  );
  return work;
}

function openEntry(start: RemoteExecutionStart): LedgerEntry {
  counter += 1;
  const machineLabel =
    start.machineLabel !== undefined && start.machineLabel.length > 0
      ? start.machineLabel
      : start.machineId;
  let markSettled = (): void => undefined;
  const settled = new Promise<void>((resolve) => {
    markSettled = resolve;
  });
  const entry: LedgerEntry = {
    seq: counter,
    machineId: start.machineId,
    machineLabel,
    kind: start.kind,
    subject: start.subject,
    startedAt: Date.now(),
    child: null,
    pid: null,
    journalId: null,
    outcome: null,
    cancelled: false,
    settled,
    markSettled
  };
  // The durable row goes down BEFORE the child is spawned, which is the whole
  // point of it. better-sqlite3 does not await, so there is no window between
  // the row committing and the spawn.
  if (entry.kind === JOURNALED_REMOTE_EXECUTION_KIND && journal !== null) {
    try {
      entry.journalId = journal.beginRemoteExecution(
        {
          machineId: entry.machineId,
          machineLabel: entry.machineLabel,
          kind: entry.kind,
          subject: entry.subject
        },
        entry.startedAt
      );
    } catch (err) {
      // A journal that will not write must never stop the work a person asked
      // for. The consequence is that a copy cut off by a quit is not reported
      // at the next launch, and this line is the only record of that.
      ledgerLog.warn(
        `could not record the start of a ${entry.kind} on ${entry.machineId}: ` +
          `${(err as Error).message}`
      );
    }
  }
  open.add(entry);
  return entry;
}

/**
 * Close one entry with how it ended.
 *
 * A cancelled entry is `cutOff` whatever its promise did, because the reason it
 * ended is that Tortie ended it. That is the one classification a person is
 * ever told about.
 */
function closeEntry(
  entry: LedgerEntry,
  outcome: RemoteExecutionOutcome
): void {
  if (entry.outcome !== null) return;
  const final = entry.cancelled && outcome === 'failed' ? 'cutOff' : outcome;
  entry.outcome = final;
  open.delete(entry);
  classified.push(factOf(entry));
  entry.markSettled();
  // THE ROW IS CLOSED ONLY FOR THE TWO OUTCOMES THAT LEAVE NOTHING UNSAID, and
  // that is the whole reason the journal exists.
  //
  // `answered` and `failed` are both work that finished while somebody was
  // listening. The caller got its value or its error, a surface drew a sentence
  // for it, and there is nothing for a later launch to tell anybody.
  //
  // `cutOff` and `unjoined` are the opposite. The process is going away, and the
  // one thing a person needs is a sentence at the NEXT launch about a folder
  // that may be partly copied on another computer. So the row is LEFT OPEN, and
  // `resolveCutOffRemoteExecutions` is what closes it, after it has said so.
  // That is the same shape the restore journal uses: the row that was never
  // closed is the signal.
  const finished = final === 'answered' || final === 'failed';
  if (finished && entry.journalId !== null && journal !== null) {
    try {
      journal.finishRemoteExecution(entry.journalId, final);
    } catch (err) {
      ledgerLog.warn(
        `could not record the end of a ${entry.kind} on ${entry.machineId}: ` +
          `${(err as Error).message}`
      );
    }
  }
  if (final !== 'answered') {
    ledgerLog.info(
      `${entry.kind} on ${entry.machineId} ended ${final}` +
        (entry.subject.length > 0 ? `: ${entry.subject}` : '')
    );
  }
}

// ---------------------------------------------------------------------------
// The quit
// ---------------------------------------------------------------------------

/**
 * End every ssh child this process still owns.
 *
 * IT SIGNALS THE CHILD'S OWN PID AND NEVER A PROCESS GROUP, and that is a
 * deliberate difference from `../proc/guarded.ts`. `runGuarded` spawns with
 * `detached: true`, so `kill(-pid)` there reaches the forks. `execFile` does not
 * forward `detached`, so its child sits in Electron's own process group and
 * `kill(-pid)` would signal Tortie itself. Signalling the one pid is what this
 * path is allowed to do, and killing that child drops the connection, which is
 * the whole of what this Mac can do about work on another computer.
 *
 * THE SIGNAL ALONE IS NOT ENOUGH, and PHASE 118's own harness measured why.
 * Every exec plane argv carries `ControlMaster=auto` with a `ControlPersist`
 * window, from `sshOptions` in `./ssh.ts`, so the first command to a machine
 * leaves a background master process behind. That master holds the write ends
 * of the pipes this child was given. Killing the direct child therefore ends
 * the command but leaves those pipes open, and the `close` event that
 * `promisify(execFile)` waits on never fires. Measured with no sshd listening,
 * the promise was still unsettled 8,304 ms after the signal, so the bounded
 * join could only ever time out and report `unjoined`. Destroying the child's
 * three streams releases the last reference to them, the promise rejects, and
 * the entry is classified `cutOff`, which is the true outcome. The same
 * measurement fell to 304 ms with the destroys in place, and the app's quit
 * teardown fell from 3,026 ms to 27 ms.
 *
 * @returns how many children were signalled. 0 is the ordinary quit.
 */
export function cancelRemoteExecutions(): number {
  let signalled = 0;
  for (const entry of open) {
    const child = entry.child;
    if (child === null) continue;
    entry.cancelled = true;
    try {
      child.kill('SIGTERM');
      signalled += 1;
    } catch {
      // A child that already left is a child that needs no signal.
      continue;
    }
    // Release the pipes the persisted ssh master is still holding, so the
    // `close` event this entry's promise waits on can fire. See the note above
    // for the measurement. Each call is guarded by `?.` because a stream is
    // null when the child was spawned without that pipe, and `destroy` on an
    // already destroyed stream is a no-op.
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.stdin?.destroy();
    // The escalation timer is unref'd, exactly as `killProcessGroup` does, so
    // it can never be the reason a quit stays open.
    const escalate = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* it left on the first signal, which is the ordinary case */
      }
    }, CANCEL_GRACE_MS);
    escalate.unref();
    void entry.settled.then(() => clearTimeout(escalate));
  }
  return signalled;
}

/**
 * Wait for every open entry to settle, bounded.
 *
 * The bound keeps the promise the quit path has always made: a sick call can
 * never wedge quit. An entry still open when the bound expires is classified
 * `unjoined`, which says Tortie stopped waiting and does not know how that work
 * ended. It is a different fact from `cutOff` and it gets a different word.
 */
export async function joinRemoteExecutions(
  deadlineMs: number = REMOTE_JOIN_BOUND_MS
): Promise<RemoteJoinReport> {
  const waiting = [...open];
  if (waiting.length === 0) {
    return { cancelled: 0, joined: 0, unjoined: 0, waitedMs: 0 };
  }
  const from = Date.now();
  const cancelled = waiting.filter((entry) => entry.cancelled).length;
  let timer: NodeJS.Timeout | null = null;
  await Promise.race([
    Promise.all(waiting.map((entry) => entry.settled)),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, deadlineMs);
      timer.unref();
    })
  ]);
  if (timer !== null) clearTimeout(timer);
  const waitedMs = Date.now() - from;
  let unjoined = 0;
  for (const entry of waiting) {
    if (entry.outcome !== null) continue;
    unjoined += 1;
    closeEntry(entry, 'unjoined');
  }
  return {
    cancelled,
    joined: waiting.length - unjoined,
    unjoined,
    waitedMs
  };
}

// ---------------------------------------------------------------------------
// The boot read
// ---------------------------------------------------------------------------

/**
 * Read what the last run never finished, say it once, and close it.
 *
 * Called by `setRemoteManifest` in `./remote-record.ts` when a store is
 * installed. An empty answer is the ordinary one and costs one indexed read.
 *
 * Every row is closed with `cutOff` before the notice is posted, so a person is
 * told once and never again. The notice carries the label OFF THE ROW rather
 * than looked up, because the machine may have been removed since.
 *
 * @returns the rows it found, for the harness and for the tests.
 */
export function resolveCutOffRemoteExecutions(
  store: RemoteExecutionJournalStore
): RemoteExecutionRecord[] {
  const rows = store.listUnfinishedRemoteExecutions();
  if (rows.length === 0) return [];
  for (const row of rows) {
    ledgerLog.warn(
      `a ${row.kind} on ${row.machineLabel} was never finished: ` +
        `${row.subject.length > 0 ? row.subject : '(no subject)'}, started at ` +
        `${new Date(row.startedAt).toISOString()}`
    );
    store.finishRemoteExecution(row.id, 'cutOff');
  }
  const newest = rows[rows.length - 1];
  if (newest !== undefined) {
    postDurabilityNotice({
      kind: 'remote-work-cut-off',
      machineLabel: newest.machineLabel,
      path: newest.subject,
      count: rows.length
    });
  }
  return rows;
}
