/**
 * What one machine level event PROVES about the rows on that machine
 * (Phase 71, M4, research 51 section 4.4).
 *
 * Research 51 section 4.4 is a case table written in prose. Prose decays. This
 * module is the same table written once, as code, so every arm has a test and a
 * later reader compares the table against the research line by line rather than
 * trusting a sentence.
 *
 * IT IS PURE. It runs no tmux command, opens no database, reads no file and arms
 * no timer. It takes one event and returns one verdict. Applying that verdict to
 * a row map, to the manifest or to a surface is the caller's work, and there are
 * two callers: the per machine feed in ./remote-sessions.ts and the local
 * reconcile in ../sessions/core.ts.
 *
 * ## The one rule the whole table exists for
 *
 * > A machine Tortie cannot see produces `unknown`. It never produces
 * > `restorable`, and it never produces `exited`.
 *
 * The two are different facts and Phase 67 exists because they used to be one.
 * "The link failed" says nothing about what is running on the other side. "A
 * completed list did not report that session" says the session ended. Reading
 * the first as the second offers Restore over an agent that is still working,
 * and pressing it starts a second agent on the same conversation.
 *
 * ## The clock rule, and why the event carries its own instant
 *
 * `at` is stamped BEFORE the command was issued, never on receipt. A list that
 * takes 9 s to fail is evidence about the world as it was when the command left,
 * not about the world 9 s later, and a row whose own evidence is newer than that
 * instant is left exactly as it is. Local times are only ever compared with
 * local times, and a remote machine's own clock never reaches this module.
 *
 * ## What this release does NOT do, said here so no surface implies otherwise
 *
 * `restoreOffered` is false on every arm. Tortie brings back no session that
 * lives on another machine in this release: there is no saved scrollback, no
 * resume line and no launch snapshot for one on this Mac. M5 is the rung that
 * flips two of these arms, and it flips them by changing this file.
 */

import type { SessionStatus } from '@shared/types';

// ---------------------------------------------------------------------------
// The event
// ---------------------------------------------------------------------------

/** The six things that can be learned about a machine, and nothing else. */
export type MachineEventKind =
  /** A list COMPLETED over that machine's live feed. */
  | 'listed'
  /** A row that completed list did not report. */
  | 'absent'
  /** The link dropped, timed out, or the connection died. */
  | 'transport-lost'
  /** This Mac came back from sleep. */
  | 'woke'
  /** The transport is up and that machine's server is not running. */
  | 'no-server'
  /** `%exit` arrived on a live control plane. */
  | 'control-exit';

export interface MachineEvent {
  readonly kind: MachineEventKind;
  /**
   * Local epoch ms. For 'listed' it is stamped BEFORE the command was issued,
   * per research 51 section 4.4's clock rule, never on receipt.
   */
  readonly at: number;
  /** The transport error class. Present for 'transport-lost' only. */
  readonly errorClass?: string;
}

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

/** What the event says about every row on that machine. */
export type RowVerdict =
  /** Keep what the list reported. The event decided nothing per row. */
  | { kind: 'per-row' }
  /** Write this status on every row the event covers. */
  | { kind: 'status'; status: SessionStatus };

export interface MachineTruth {
  readonly rows: RowVerdict;
  readonly restoreOffered: boolean;
  /** One sentence, or null when restore is offered. */
  readonly restoreDisabledReason: string | null;
  /** What was recorded, for the log line and the test. */
  readonly evidence: string;
}

// ---------------------------------------------------------------------------
// The two sentences a person reads
// ---------------------------------------------------------------------------

/**
 * The reason for the two arms where Tortie cannot see the machine at all.
 *
 * It says what is true, which is that Tortie has lost sight of the machine. It
 * does not say the sessions are running, because nothing proved that, and it
 * does not say they ended, because nothing proved that either.
 */
export const RESTORE_DISABLED_UNSEEN =
  'Tortie cannot see this machine right now.';

/**
 * The reason for every arm where the machine ANSWERED.
 *
 * Nothing about a session on another machine is saved on this Mac, so there is
 * nothing here to bring one back from. The sentence names the release rather
 * than a date, because a date would be a promise nobody made.
 */
export const RESTORE_DISABLED_LATER =
  'Bringing a session back on another machine is coming in a later release.';

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

/**
 * The case table of research 51 section 4.4, executable.
 *
 * | Event            | rows                   | restore | evidence                                    |
 * | ---------------- | ---------------------- | ------- | ------------------------------------------- |
 * | `listed`         | per-row                | no      | reconcile pass at <at>                      |
 * | `absent`         | status: 'restorable'   | no      | absent from the pass at <at>                |
 * | `transport-lost` | status: 'unknown'      | no      | transport <errorClass> at <at>              |
 * | `woke`           | status: 'unknown'      | no      | power event at <at>                         |
 * | `no-server`      | status: 'restorable'   | no      | no server on a reachable machine at <at>    |
 * | `control-exit`   | per-row                | no      | control event at <at>                       |
 *
 * Two arms are worth reading twice.
 *
 * `absent` writes `restorable` and not `exited`. Phase 70 wrote `exited` on a
 * remote row a completed list stopped reporting, and `exited` is a terminal
 * record that no later evidence revises. `restorable` is what the row is: the
 * session is not running, and a later release brings it back. The label a person
 * reads for a restorable row that carries a machine is `not running`, because
 * nothing about it is saved on this Mac and `saved` would be a lie.
 *
 * `control-exit` decides nothing per row on purpose. A `%exit` says the control
 * connection ended. It does not say the far side's server died, and it does not
 * say a session did. The feed treats it as a reason to fall back to the timer
 * and to ask again, and the answer to that question is what moves the rows.
 *
 * The switch has no `default`, so a seventh member of {@link MachineEventKind}
 * is a compile error here rather than a silent fall through to a verdict nobody
 * chose.
 */
export function machineTruth(event: MachineEvent): MachineTruth {
  const at = String(event.at);
  switch (event.kind) {
    case 'listed':
      return {
        rows: { kind: 'per-row' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_LATER,
        evidence: `reconcile pass at ${at}`
      };
    case 'absent':
      return {
        rows: { kind: 'status', status: 'restorable' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_LATER,
        evidence: `absent from the pass at ${at}`
      };
    case 'transport-lost':
      return {
        rows: { kind: 'status', status: 'unknown' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_UNSEEN,
        evidence: `transport ${event.errorClass ?? 'unknown'} at ${at}`
      };
    case 'woke':
      return {
        rows: { kind: 'status', status: 'unknown' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_UNSEEN,
        evidence: `power event at ${at}`
      };
    case 'no-server':
      return {
        rows: { kind: 'status', status: 'restorable' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_LATER,
        evidence: `no server on a reachable machine at ${at}`
      };
    case 'control-exit':
      return {
        rows: { kind: 'per-row' },
        restoreOffered: false,
        restoreDisabledReason: RESTORE_DISABLED_LATER,
        evidence: `control event at ${at}`
      };
  }
}

/**
 * True only for the events that may produce `restorable`.
 *
 * This is research 51 section 4.4's one sentence rule made checkable: a session
 * may be offered for restore only when a machine ANSWERED and the answer did not
 * hold it. Two events can say that, being a completed list that did not report
 * the row and a reachable machine with no server on it. The other four say
 * nothing about the session at all.
 *
 * The caller uses it as a guard in front of any write that could reach
 * `restorable`, so a later edit to the table cannot let a lost link write a
 * confirmed death without this function saying so too.
 */
export function mayFlipRestorable(event: MachineEvent): boolean {
  return event.kind === 'absent' || event.kind === 'no-server';
}

/** Every event kind, for the tests and the conformance gate. */
export const MACHINE_EVENT_KINDS: readonly MachineEventKind[] = [
  'listed',
  'absent',
  'transport-lost',
  'woke',
  'no-server',
  'control-exit'
];
