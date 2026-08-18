/**
 * Saved output for a session on another machine (Phase 72, M5, research 51
 * section 4.3).
 *
 * Tortie reads what a remote session has printed and keeps a copy ON THIS MAC,
 * through the same durable ring a local snapshot goes through. That copy is why
 * a person can still read what an agent said after the machine stops answering,
 * and it is the only thing about a remote session that lives here rather than
 * there.
 *
 * ## What this does NOT do, and it is the honest half of the rung
 *
 * A remote restore does not put the saved output back into the recreated
 * session on that machine. There are three mechanisms and all three are refused
 * here.
 *
 *  1. Write the body to the far side and print it. That is a write to another
 *     person's disk. Research 51 section 4.5 defers the one exec plane write to
 *     M6 and the scope fence names it there.
 *  2. `load-buffer` plus `paste-buffer` into the pane. The bytes arrive as pane
 *     INPUT and a shell executes them. Making that safe needs a holder command
 *     and a raw terminal, which is a new failure mode on the one path that must
 *     not have one.
 *  3. Send it into the local terminal ahead of the connection's bytes. The far
 *     side redraws the screen on attach and the text is gone. It would look
 *     like it worked and sometimes not be there.
 *
 * So the saved output stays here, Tortie shows it here with its capture time,
 * and the restore result says plainly that the output was not put back. The
 * panel is `src/renderer/app/SavedOutputModal.tsx`.
 *
 * ## Connected only, and link bounded
 *
 * Research 28 row 9 is the rule this module obeys: the cadence is bounded by
 * the LINK, never per session. Thirty sessions on one machine produce at most
 * eight commands in a pass and never thirty.
 *
 * | Rule                        | Value                        |
 * | --------------------------- | ---------------------------- |
 * | Captures in flight per link | 1                            |
 * | Machine cadence             | 120,000 ms                   |
 * | Sessions per pass           | at most 8, oldest copy first |
 * | Read is skipped when        | the link is not live, the machine is not answering, or the row is not on the last list |
 * | Copy is skipped when        | the screen reads exactly as the newest copy already on disk |
 * | Stops when                  | the link drops, the app quits, or the machine is forgotten |
 *
 * EVERY NUMBER ABOVE IS CHOSEN RATHER THAN MEASURED. No load test set them and
 * no copy in the product implies otherwise. What IS measured is what they
 * produce, and `npm run smoke:matrix` row 9 prints the command count for 30
 * sessions over 5 minutes and fails when it exceeds 3 passes times 8.
 *
 * ## One writer, one reader
 *
 * The bytes go through `../restore/snapshots.ts` and its `storeCapsuleText`,
 * which is the same function `captureSessionSnapshot` calls after it reads a
 * local pane. So the ring, the three generations, the length check, the hash
 * and the read back are not reimplemented here and cannot drift. This module
 * owns the READ and the cadence, and nothing else.
 *
 * ## What a remote capsule does not carry
 *
 * `SnapshotSessionRecipe`, being the launch recipe Phase 20 reconstruction
 * needs. This module does not read the manifest, by the same rule that keeps
 * `./remote-sessions.ts` out of it: the one place a remote session meets the
 * manifest is `./remote-record.ts`. So a remote capsule carries the session id,
 * the machine, the working directory on that machine and the text, and its
 * recipe is null. That is stated rather than left to be discovered, and a later
 * rung can pass a recipe in without changing anything else here.
 */

import type { SessionStatus } from '@shared/types';
import { getLog } from '../log';
import {
  readCapsules,
  savedSnapshotLines,
  storeCapsuleText,
  type SnapshotCapsule
} from '../restore/snapshots';
import { isControlPlaneLive, onMachineLinkChanged } from './control-plane';
import { execOn } from './exec-plane';
import {
  readyRemoteContext,
  remoteMachineFacts,
  remoteSessionRow,
  remoteSessions
} from './remote-sessions';

const capsuleLog = getLog('restore');

// ---------------------------------------------------------------------------
// The numbers, all chosen
// ---------------------------------------------------------------------------

/**
 * How long between passes for ONE machine. 120,000 ms.
 *
 * Chosen. It is 24 times the focused list cadence, because a list is one
 * command for a whole machine and a capture is one command per session. The
 * cost of being wrong in one direction is a copy up to two minutes behind the
 * screen, and the panel always says how old the copy is.
 */
export const REMOTE_CAPSULE_CADENCE_MS = 120_000;

/**
 * Sessions read in one pass, at most. 8.
 *
 * Chosen. It is the bound research 28 row 9 asks for: a machine holding 30
 * sessions produces 8 commands in a pass rather than 30, and the sessions whose
 * copy is oldest go first, so every session is reached within four passes.
 */
export const REMOTE_CAPSULE_PER_PASS = 8;

/**
 * How long one read of one screen gets. 30,000 ms.
 *
 * The same budget `capturePane` gives a local read, for the same reason: a
 * capture of 50,000 coloured lines is several megabytes and it is not stuck, it
 * is large.
 */
export const REMOTE_CAPSULE_TIMEOUT_MS = 30_000;

/** The two statuses that mean the last completed list held this row. */
const LISTED_STATUSES: readonly SessionStatus[] = ['running', 'idle'];

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

/**
 * The read, composed exactly as the local one is.
 *
 * `src/main/tmux/sessions.ts` composes `capture-pane -p -e -J -t <target> -S
 * -<lines>` for a pane on this Mac. This is the same flags in the same order,
 * so a remote capsule and a local capsule are the same bytes read the same way,
 * and a difference between them can only come from the pane rather than from
 * the reader.
 *
 * The target is the far side's own immutable pane identifier, read from that
 * machine's own list. Never a name.
 */
export function remoteCaptureArgs(tmuxId: string, lines: number): string[] {
  return [
    'capture-pane',
    '-p',
    '-e',
    '-J',
    '-t',
    tmuxId,
    '-S',
    `-${String(Math.max(0, Math.floor(lines)))}`
  ];
}

// ---------------------------------------------------------------------------
// The choice, pure
// ---------------------------------------------------------------------------

/** One row a pass could read. */
export interface CaptureCandidate {
  /** Tortie's own id for the session. */
  readonly id: string;
  /** The far side's immutable identifier for the pane. */
  readonly tmuxId: string;
  /** The activity stamp the last list reported, from that machine's clock. */
  readonly activityAt: number;
  /** What the row reads right now. */
  readonly status: SessionStatus;
}

/** What this module remembers about the last copy it took of one session. */
export interface CaptureMemory {
  /** Which machine the session was on. */
  readonly machineId: string;
  /** Local epoch ms this Mac finished writing that copy. */
  readonly capturedAt: number;
  /** The activity stamp the row carried when that copy was taken. */
  readonly activityAt: number;
}

/**
 * Which sessions this pass reads, in order. PURE.
 *
 * Two rules, and both remove commands rather than adding them.
 *
 *  1. A row the last completed list did not hold is not read. Its status is
 *     `restorable`, `unknown` or `discarded`, and there is no screen there to
 *     photograph.
 *  2. The rest are ordered by the age of their copy, oldest first, and the
 *     first eight are read. A session that has never been copied sorts first,
 *     because zero is older than any instant. Ties break on the id, so the
 *     order is the same on every run and a test can hold it.
 *
 * ## The rule that was here, and why it is gone
 *
 * PHASE 72 FIX ROUND. A third rule stood between 1 and 2: a row whose activity
 * stamp had not moved since the last copy was not read, because the bytes would
 * be identical. The stamp is `#{session_activity}`, and it does not do what
 * that rule assumed.
 *
 * MEASURED 2026-08-17 with tmux 3.6a, twice. A detached session was made to
 * print 4096 bytes. `#{session_activity}` read 1787023590 before and
 * 1787023590 after, and it read the same again three seconds later. The same
 * test with a control client attached to another session on the same server
 * gave the same answer. `#{history_size}` moved from 0 to 48 in both, so the
 * printing did happen. tmux moves that stamp for a session somebody is attached
 * to, and every session Tortie keeps a copy of is one nobody is attached to.
 *
 * So the rule read a number that never changes, and the consequence was that no
 * session on any machine was ever copied more than once. The first pass took a
 * copy of whatever the screen held seconds after the create, and every pass
 * after it skipped the session for ever. Fault matrix rows 5, 8 and 9 all
 * measured zero copies before this was found.
 *
 * What replaces it is a comparison of the BYTES rather than of a stamp. The
 * read still happens, so the cost per pass is unchanged and still bounded by
 * the link at eight. The publish does not: `storeCapsuleText` is asked to skip
 * a body identical to the newest one already recorded, so a screen that has not
 * changed produces no new generation and the ring keeps three real ones. That
 * is a stronger rule than the one it replaces, because it is true whatever the
 * far side does to make its screen change.
 */
export function chooseCaptureTargets(
  candidates: readonly CaptureCandidate[],
  memory: ReadonlyMap<string, CaptureMemory>,
  perPass: number = REMOTE_CAPSULE_PER_PASS
): CaptureCandidate[] {
  const worth = candidates.filter((row) =>
    LISTED_STATUSES.includes(row.status)
  );
  worth.sort((a, b) => {
    const aAt = memory.get(a.id)?.capturedAt ?? 0;
    const bAt = memory.get(b.id)?.capturedAt ?? 0;
    if (aAt !== bAt) return aAt - bAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return worth.slice(0, Math.max(0, perPass));
}

// ---------------------------------------------------------------------------
// The state
// ---------------------------------------------------------------------------

/** What was copied last, per session id. */
const memory = new Map<string, CaptureMemory>();

/** Machines with a pass running right now. Never more than one entry each. */
const inFlight = new Set<string>();

/**
 * A number per machine, raised whenever the machine's captures are stopped.
 *
 * A pass reads it once at the start and again between every read. A pass whose
 * number has moved stops where it is and writes nothing more. It is a counter
 * rather than a flag because a flag would have to be cleared by somebody, and
 * the somebody would be the pass that is being stopped.
 */
const generations = new Map<string, number>();

let timer: NodeJS.Timeout | null = null;
let unlink: (() => void) | null = null;
/** Commands sent since the last reset. The matrix reads it. */
let commandsSent = 0;

function generationOf(machineId: string): number {
  return generations.get(machineId) ?? 0;
}

// ---------------------------------------------------------------------------
// The lifecycle
// ---------------------------------------------------------------------------

/**
 * Start taking copies. Called once, from the capability installer.
 *
 * Two things drive it. The timer is the cadence. The link subscription is what
 * makes a machine that just connected produce its first copy without waiting up
 * to two minutes for the timer to come round.
 *
 * Calling it twice is the same as calling it once.
 */
export function startRemoteCaptures(): void {
  if (timer !== null) return;
  timer = setInterval(() => {
    void captureEveryMachine().catch(() => undefined);
  }, REMOTE_CAPSULE_CADENCE_MS);
  timer.unref?.();
  unlink = onMachineLinkChanged(() => {
    void captureEveryMachine().catch(() => undefined);
  });
}

/**
 * Stop taking copies. Called from the ordered disposer at quit.
 *
 * A pass already in flight is stopped between reads by the generation counter,
 * so nothing is left waiting on a machine that is going away.
 */
export function stopRemoteCaptures(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  unlink?.();
  unlink = null;
  for (const machineId of [...inFlight]) {
    generations.set(machineId, generationOf(machineId) + 1);
  }
}

/**
 * Stop taking copies of one machine and forget what was copied.
 *
 * Called when a person removes a machine in Settings. It sends nothing to that
 * machine and it deletes no saved output: the copies already on this Mac are
 * what the tombstoned rows in Past Sessions still show. What it stops is any
 * further reading, at once, including the pass that may be halfway through.
 */
export function stopCapturingMachine(machineId: string): void {
  generations.set(machineId, generationOf(machineId) + 1);
  for (const [sessionId, last] of [...memory]) {
    if (last.machineId === machineId) memory.delete(sessionId);
  }
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

/** Every machine that currently has rows, oldest id first. */
function machinesWithRows(): string[] {
  const ids = new Set<string>();
  for (const row of remoteSessions()) {
    if (row.machine !== undefined) ids.add(row.machine.id);
  }
  return [...ids].sort();
}

/** The candidates for one machine, read out of the live feed. */
export function captureCandidates(machineId: string): CaptureCandidate[] {
  const out: CaptureCandidate[] = [];
  for (const projected of remoteSessions()) {
    if (projected.machine?.id !== machineId) continue;
    const row = remoteSessionRow(projected.id);
    if (row === null) continue;
    out.push({
      id: row.id,
      tmuxId: row.tmuxId,
      activityAt: row.activityAt,
      // The PROJECTED status, which is what every surface reads, so a machine
      // Tortie cannot see produces no read here for exactly the reason it
      // produces no Restore.
      status: projected.status
    });
  }
  return out;
}

/** Ask every machine, one after another. Never two passes on one machine. */
export async function captureEveryMachine(): Promise<number> {
  let taken = 0;
  for (const machineId of machinesWithRows()) {
    taken += await captureMachineOnce(machineId);
  }
  return taken;
}

/**
 * One pass over one machine. Returns how many copies it wrote.
 *
 * Every refusal below is a silent zero rather than a throw. A copy is a
 * convenience and it may never fail anything a person asked for.
 */
export async function captureMachineOnce(machineId: string): Promise<number> {
  // One in flight per link. A slow machine cannot queue passes behind itself.
  if (inFlight.has(machineId)) return 0;
  // CONNECTED ONLY. No copy is ever taken over the timer feed, and none at all
  // while the link is down. Fault matrix row 1 checks the second half.
  if (!isControlPlaneLive(machineId)) return 0;
  if (!remoteMachineFacts(machineId).answering) return 0;

  let ctx;
  try {
    ctx = readyRemoteContext(machineId);
  } catch {
    return 0;
  }

  const targets = chooseCaptureTargets(captureCandidates(machineId), memory);
  if (targets.length === 0) return 0;

  const generation = generationOf(machineId);
  const lines = savedSnapshotLines();
  inFlight.add(machineId);
  let written = 0;
  try {
    for (const target of targets) {
      // Asked again before EVERY read. A link that drops halfway through a
      // pass stops the pass here rather than after another seven commands.
      if (generationOf(machineId) !== generation) break;
      if (!isControlPlaneLive(machineId)) break;
      let text: string;
      try {
        commandsSent += 1;
        text = await execOn(ctx, remoteCaptureArgs(target.tmuxId, lines), {
          timeoutMs: REMOTE_CAPSULE_TIMEOUT_MS
        });
      } catch {
        // A read that failed says nothing about the session and nothing about
        // the machine that the list is not already saying. The next pass asks
        // again.
        continue;
      }
      if (generationOf(machineId) !== generation) break;
      const row = remoteSessionRow(target.id);
      try {
        const stored = await storeCapsuleText({
          sessionId: target.id,
          text,
          reason: 'remote-checkpoint',
          cwd: row?.cwd ?? null,
          machineId,
          // A screen that has not changed is not a new copy. See the header.
          skipIfIdentical: true
        });
        if (stored) written += 1;
      } catch {
        // Out of space, or a directory that cannot be written. The local
        // capture path treats both the same way, being best effort.
        continue;
      }
      // Remembered whether or not anything was written, because an empty
      // screen is still a screen this pass has looked at and reading it again
      // in two minutes buys the same nothing.
      memory.set(target.id, {
        machineId,
        capturedAt: Date.now(),
        activityAt: target.activityAt
      });
    }
  } finally {
    inFlight.delete(machineId);
  }
  if (written > 0) {
    capsuleLog.info(
      `kept a copy of ${String(written)} session screen(s) from ${machineId} ` +
        `on this Mac`
    );
  }
  return written;
}

// ---------------------------------------------------------------------------
// The reads other modules make
// ---------------------------------------------------------------------------

/**
 * The newest recorded copy for one session, local or remote, or null.
 *
 * The SEAM the remote restore reads. It answers from the completion record
 * alone, with no body read and no hash, because the caller wants to know
 * whether there is a copy and when it was taken. Whether the bytes prove out is
 * decided by `resolveSnapshot` at the moment they are read, which is where that
 * question belongs.
 */
export function newestCapsuleFor(sessionId: string): SnapshotCapsule | null {
  return readCapsules(sessionId)[0] ?? null;
}

/** What this module has done, for the tests, the smoke and the matrix. */
export function remoteCapsuleFacts(): {
  /** Sessions with a remembered copy. */
  remembered: number;
  /** Machines with a pass running right now. Never above 1 per machine. */
  inFlight: string[];
  /** Reads sent since the last reset. Fault matrix row 9 counts these. */
  commandsSent: number;
  /** True while the cadence is armed. */
  running: boolean;
} {
  return {
    remembered: memory.size,
    inFlight: [...inFlight].sort(),
    commandsSent,
    running: timer !== null
  };
}

/** Drop every memory, every timer and the subscription. Tests and the smoke. */
export function resetRemoteCapsulesForTests(): void {
  stopRemoteCaptures();
  memory.clear();
  inFlight.clear();
  generations.clear();
  commandsSent = 0;
}
