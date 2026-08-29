/**
 * The one suspension discipline (extracted in Phase 158).
 *
 * The fold's scheduler and the arch pass runner stop spending for exactly the
 * same three reasons: the model said the usage limit was reached, the usage
 * window turned close to its limit, or three runs in a row did not finish.
 * Phase 158 shipped that block twice, near verbatim, so this module is the
 * one copy and both runners compose it. The numbers stay the fold's, because
 * the charter says the pass rides the fold's numbers rather than inventing
 * new ones.
 *
 * WHAT THIS MODULE NEVER DOES. It never sets a session's status, never draws
 * anything, and never writes a log line of its own: the owner reports each
 * suspension in its own log domain through `onSuspend`, and drops whatever it
 * must drop there too, being the scheduler's settle timers and nothing at all
 * for the arch runner.
 */

import { windowSuspends, FOLD_BLIND_SUSPEND_MS, type FoldRun } from './spawn';

/** Consecutive failures of any kind before the owner suspends. */
export const FOLD_FAILURES_BEFORE_SUSPEND = 3;

/** Why the owner stopped. */
export type SuspendCause = 'usage-limit' | 'window-near-limit' | 'three-failures';

/** What the owner is told, once, when a suspension begins. */
export interface SuspendReport {
  cause: SuspendCause;
  untilMs: number;
  /** The count at the moment of suspension, before it resets. */
  consecutiveFailures: number;
  /** The session or repository whose run tripped the rule, for the log. */
  key: string | null;
}

export interface HarnessSuspensionDeps {
  /**
   * The sentence for three runs in a row not finishing. It is the one
   * sentence the two owners say differently, because a person reads it
   * beside the surface that stopped.
   */
  threeFailuresSentence: string;
  /** One report per suspension: the owner logs it and drops its own state. */
  onSuspend(report: SuspendReport): void;
  now(): number;
}

/**
 * The shared state machine. The owner asks `suspension()` in its own gate,
 * feeds every finished run through `readWindow` and `noteFailure`, and calls
 * `reset` when the validator ruled, because a ruling means the harness works
 * whatever the ruling was.
 */
export class HarnessSuspension {
  private readonly deps: HarnessSuspensionDeps;
  private consecutiveFailures = 0;
  private suspendedUntil: number | null = null;
  private suspendedBecause: string | null = null;

  constructor(deps: HarnessSuspensionDeps) {
    this.deps = deps;
  }

  /** One sentence while suspended, null otherwise. Expiry clears it. */
  suspension(): string | null {
    if (this.suspendedUntil === null) return null;
    if (this.deps.now() >= this.suspendedUntil) {
      this.suspendedUntil = null;
      this.suspendedBecause = null;
      return null;
    }
    return this.suspendedBecause;
  }

  /** The validator ruled, so the harness works. The count starts over. */
  reset(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Read the rate window off a finished run and stop when it turned.
   *
   * A 529 is the server limiting requests for a moment, never a usage limit,
   * so an overloaded run must not suspend anything.
   */
  readWindow(run: FoldRun, key: string | null): void {
    if (run.outcome === 'rate-limited') {
      this.suspend(
        run.window?.resetsAtMs ?? null,
        'The model refused because your usage limit was reached.',
        'usage-limit',
        key
      );
      return;
    }
    if (run.outcome === 'overloaded') return;
    if (windowSuspends(run.window)) {
      this.suspend(
        run.window?.resetsAtMs ?? null,
        'Your usage window is close to its limit.',
        'window-near-limit',
        key
      );
    }
  }

  /**
   * A run failed. Overloaded runs are exempt for the same reason they never
   * suspend; anything else counts, and the third in a row suspends.
   */
  noteFailure(run: FoldRun, key: string | null): void {
    if (run.outcome === 'overloaded') return;
    this.countFailure(key);
  }

  /** A failure with no run to read, and the third in a row still suspends. */
  countFailure(key: string | null): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures < FOLD_FAILURES_BEFORE_SUSPEND) return;
    this.suspend(null, this.deps.threeFailuresSentence, 'three-failures', key);
  }

  /**
   * Count a failure without checking the threshold. The fold's throw path
   * has always counted this way, suspending on the NEXT counted failure
   * rather than mid throw, and that shipped behavior is kept exactly.
   */
  countQuietly(): void {
    this.consecutiveFailures += 1;
  }

  private suspend(
    resetsAtMs: number | null,
    sentence: string,
    cause: SuspendCause,
    key: string | null
  ): void {
    const until = resetsAtMs ?? this.deps.now() + FOLD_BLIND_SUSPEND_MS;
    this.deps.onSuspend({
      cause,
      untilMs: until,
      consecutiveFailures: this.consecutiveFailures,
      key
    });
    this.suspendedUntil = until;
    this.suspendedBecause = sentence;
    this.consecutiveFailures = 0;
  }
}
