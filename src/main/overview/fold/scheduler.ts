/**
 * The fold scheduler (Phase 138).
 *
 * THERE IS NO TIMER, NO POLL AND NO DAEMON IN THIS FILE. The only trigger is
 * the activity monitor's existing transition from working to idle or to needs
 * input, which is the turn boundary and is the same signal that raises needs
 * input today. An idle session fires no transition, so an idle session costs
 * nothing. Nothing in this directory calls setInterval, and the ONE setTimeout
 * is the settle timer below, which is armed by a boundary and by nothing else.
 *
 * Three things follow from hooking that transition, and they are the entry's
 * own three. The whole fleet is covered rather than the focused project. An
 * idle session costs nothing. Nothing wakes on a schedule.
 *
 * Nothing here may set a session's status. `noteTurnBoundary` returns void and
 * the scheduler has no way to reach a status at all: it is handed a manifest
 * reader, a store appender and a spawner, and none of those writes one.
 *
 * WHAT HAPPENS WHEN TORTIE IS CLOSED. Nothing is persisted, because there is
 * nothing to persist. A settle timer that is armed at quit dies with the
 * process and that session's turn is never folded, which costs one sentence
 * until its next completed turn. A fold in flight is killed by
 * reapGuardedChildren on before-quit, and the store write happens only after
 * the model returns, so the previous version stands untouched. The next launch
 * does not go looking for missed turns, because a catch up pass is a poll
 * wearing a different name.
 */

import type { FoldSettings } from '@shared/settings';
import { foldIsChosen } from '@shared/settings';
import type { ManifestSessionRecord } from '../../manifest';
import type { NewFoldVersion, StoredSummary, StoredTurn } from '../store';
import { composeFoldPrompt, foldInputHash, FOLD_SYSTEM_PROMPT } from './compose';
import { foldRecipeFor, recipeHasModel } from './recipes';
import {
  runFold,
  windowSuspends,
  FOLD_BLIND_SUSPEND_MS,
  type FoldRateWindow,
  type FoldRun
} from './spawn';
import { validateFoldText } from './validate';

// ---------------------------------------------------------------------------
// The three constants, each with the reason it is that number
// ---------------------------------------------------------------------------

/**
 * How long a session must stay settled before its fold runs.
 *
 * IDLE_CONFIRM_TICKS is three and the tick is one second, so a session that
 * flips working, idle, working, idle inside the hysteresis window folds once
 * rather than twice.
 */
export const FOLD_SETTLE_MS = 4_000;

/** A session may spawn at most one fold per minute. */
export const FOLD_MIN_INTERVAL_MS = 60_000;

/**
 * Folds in flight, fleet wide. This is the 2026-08-22 crash lesson rather
 * than the rate window: one fold peaks at 452 MB resident and eight at once
 * held 3,552 MB.
 */
export const FOLD_MAX_IN_FLIGHT = 2;

/** Consecutive failures of any kind, fleet wide, before folding suspends. */
export const FOLD_FAILURES_BEFORE_SUSPEND = 3;

// ---------------------------------------------------------------------------
// What a boundary is dropped for, and the diagnostics that count it
// ---------------------------------------------------------------------------

/** Why one boundary was dropped without spending anything. */
export type FoldSkipReason =
  | 'no-choice'
  | 'suspended'
  | 'project-closed'
  | 'shell'
  | 'remote'
  /** Decided by `prepare` returning null, because the reader has nothing to send. */
  | 'no-store'
  | 'no-recipe'
  | 'no-new-turns'
  | 'same-input'
  | 'unknown-session';

export interface FoldCounts {
  boundaries: number;
  spawns: number;
  skipped: number;
  inFlight: number;
}

/** Everything one fold needs, prepared from the store before the spawn. */
export interface FoldInput {
  sessionId: string;
  /** The previous KEPT sentence, or null when there is none. */
  previousSummary: string | null;
  /** The version of that kept row, for the diagnostics that read the chain. */
  previousVersion: number | null;
  /** The closed turns above the newest row's to_turn, oldest first. */
  newTurns: StoredTurn[];
  /**
   * The newest row's input hash, whatever its verdict. A fold whose composed
   * hash equals this one is skipped, so a re-armed boundary with no new turn
   * cannot spend anything.
   */
  previousInputHash: string | null;
  providerMapVersion: number;
}

export interface FoldSchedulerDeps {
  /** The person's choice, re-read at every boundary and at every spawn. */
  choice(): FoldSettings;
  /** The manifest row, read only. Null when the session is not on record. */
  session(sessionId: string): ManifestSessionRecord | null;
  /** The project paths that are open right now. */
  openProjectPaths(): ReadonlySet<string>;
  /** The store read that builds the fold's inputs. Null when there is nothing to send. */
  prepare(sessionId: string): Promise<FoldInput | null>;
  /** The spawn. Injected so every test and every probe runs without one. */
  run?(
    input: FoldInput,
    choice: FoldSettings,
    prompt: string
  ): Promise<FoldRun>;
  /** The one write, and it only ever appends. */
  append(row: NewFoldVersion): StoredSummary | void;
  now?(): number;
}

/**
 * Turns boundaries into folds, and drops most of them.
 *
 * The mechanism is one settle timer per session, re-armed on every boundary.
 * TEN TURNS IN A MINUTE THEREFORE COSTS ONE FOLD RATHER THAN TEN. Each
 * boundary re-arms the timer, and the fold that eventually runs sends every
 * turn since the watermark in one prompt.
 *
 * That last part is the one place this is ahead of the measurement. Gate two
 * folded one turn at a time and proved that carrying several turns behaves
 * like a fold rather than like a small rebuild, but it did not test five at
 * once. The verification names it rather than assuming it.
 */
export class FoldScheduler {
  private readonly deps: FoldSchedulerDeps;
  private readonly now: () => number;
  /** One settle timer per dirty session. */
  private readonly settling = new Map<string, NodeJS.Timeout>();
  /** Sessions waiting for a slot. A SET, so a burst can never build a backlog. */
  private readonly pending = new Set<string>();
  private readonly lastFoldAt = new Map<string, number>();
  private inFlight = 0;
  private boundaries = 0;
  private spawns = 0;
  private skipped = 0;
  private consecutiveFailures = 0;
  private suspendedUntil: number | null = null;
  private suspendedBecause: string | null = null;
  private disposed = false;

  constructor(deps: FoldSchedulerDeps) {
    this.deps = deps;
    this.now = deps.now ?? ((): number => Date.now());
  }

  /**
   * A session finished a turn. Called from the activity monitor's one commit
   * point and from nowhere else. It never throws into the tick and it is
   * never awaited.
   */
  noteTurnBoundary(sessionId: string): void {
    if (this.disposed) return;
    this.boundaries += 1;
    const reason = this.skipReason(sessionId);
    if (reason !== null) {
      this.skipped += 1;
      return;
    }
    this.arm(sessionId);
  }

  /** Diagnostics for the probe and the gate. Never drawn. */
  counts(): FoldCounts {
    return {
      boundaries: this.boundaries,
      spawns: this.spawns,
      skipped: this.skipped,
      inFlight: this.inFlight
    };
  }

  /** One sentence when folding is suspended, null otherwise. */
  suspension(): string | null {
    if (this.suspendedUntil === null) return null;
    if (this.now() >= this.suspendedUntil) {
      this.suspendedUntil = null;
      this.suspendedBecause = null;
      return null;
    }
    return this.suspendedBecause;
  }

  /** Cancel every settle timer. Nothing is persisted, so there is nothing else to do. */
  dispose(): void {
    this.disposed = true;
    for (const timer of this.settling.values()) clearTimeout(timer);
    this.settling.clear();
    this.pending.clear();
  }

  // -------------------------------------------------------------------------
  // The skips, taken before anything is scheduled
  // -------------------------------------------------------------------------

  /** Why this boundary is dropped, or null when it may be scheduled. */
  private skipReason(sessionId: string): FoldSkipReason | null {
    const choice = this.deps.choice();
    if (!foldIsChosen(choice)) return 'no-choice';
    if (this.suspension() !== null) return 'suspended';
    const recipe = choice.agentId === null ? null : foldRecipeFor(choice.agentId);
    if (recipe === null) return 'no-recipe';
    if (choice.model === null || !recipeHasModel(recipe, choice.model)) {
      return 'no-recipe';
    }
    const row = this.deps.session(sessionId);
    if (row === null) return 'unknown-session';
    // Its record lives on the other machine.
    if (row.machine !== undefined) return 'remote';
    // There is no conversation to fold.
    if (row.agent === 'shell') return 'shell';
    // The entry's refusal: no fold for a session whose project is closed.
    if (!this.deps.openProjectPaths().has(row.projectPath)) return 'project-closed';
    return null;
  }

  // -------------------------------------------------------------------------
  // The settle timer. The ONE setTimeout in this directory.
  // -------------------------------------------------------------------------

  private arm(sessionId: string): void {
    const existing = this.settling.get(sessionId);
    if (existing !== undefined) clearTimeout(existing);
    const since = this.lastFoldAt.get(sessionId);
    const sinceLast = since === undefined ? Infinity : this.now() - since;
    const waitForInterval =
      sinceLast >= FOLD_MIN_INTERVAL_MS ? 0 : FOLD_MIN_INTERVAL_MS - sinceLast;
    const delay = Math.max(FOLD_SETTLE_MS, waitForInterval);
    const timer = setTimeout(() => {
      this.settling.delete(sessionId);
      this.release(sessionId);
    }, delay);
    // A settle timer must never be the reason a quit waits.
    timer.unref?.();
    this.settling.set(sessionId, timer);
  }

  /** The timer fired. Take a slot, or wait for one on the pending set. */
  private release(sessionId: string): void {
    if (this.disposed) return;
    if (this.skipReason(sessionId) !== null) {
      this.skipped += 1;
      return;
    }
    if (this.inFlight >= FOLD_MAX_IN_FLIGHT) {
      this.pending.add(sessionId);
      return;
    }
    void this.fold(sessionId);
  }

  /** A slot came free. Take the next waiting session, if there is one. */
  private drain(): void {
    if (this.disposed) return;
    while (this.inFlight < FOLD_MAX_IN_FLIGHT) {
      const next = this.pending.values().next();
      if (next.done === true) return;
      this.pending.delete(next.value);
      if (this.skipReason(next.value) !== null) {
        this.skipped += 1;
        continue;
      }
      void this.fold(next.value);
    }
  }

  // -------------------------------------------------------------------------
  // One fold
  // -------------------------------------------------------------------------

  private async fold(sessionId: string): Promise<void> {
    const choice = this.deps.choice();
    const recipe = choice.agentId === null ? null : foldRecipeFor(choice.agentId);
    if (recipe === null || choice.agentId === null || choice.model === null) {
      this.skipped += 1;
      return;
    }
    this.inFlight += 1;
    try {
      const input = await this.deps.prepare(sessionId);
      if (input === null || input.newTurns.length === 0) {
        this.skipped += 1;
        return;
      }
      const composed = composeFoldPrompt(input.previousSummary, input.newTurns);
      if (composed === null) {
        this.skipped += 1;
        return;
      }
      const inputHash = foldInputHash({
        recipeAgentId: recipe.agentId,
        recipeVersion: recipe.version,
        model: choice.model,
        systemPrompt: FOLD_SYSTEM_PROMPT,
        prompt: composed.prompt
      });

      if (inputHash === input.previousInputHash) {
        // The same bytes produced the newest row already. Spending again
        // would buy the same sentence.
        this.skipped += 1;
        return;
      }

      this.lastFoldAt.set(sessionId, this.now());
      this.spawns += 1;
      const run = await (this.deps.run ?? this.spawn)(
        input,
        choice,
        composed.prompt
      );
      this.readWindow(run);

      const base = {
        sessionId,
        fromTurn: composed.fromTurn,
        toTurn: composed.toTurn,
        harness: choice.agentId,
        model: choice.model,
        providerMapVersion: input.providerMapVersion,
        inputHash,
        writtenAt: this.now()
      };

      if (run.outcome !== 'ok' || run.text === null) {
        this.noteFailure(run);
        this.deps.append({
          ...base,
          text: null,
          verdict: 'failed',
          reason: run.reason ?? run.outcome
        });
        return;
      }
      const ruling = validateFoldText(run.text, composed.turns);
      if (ruling.kept === null) {
        // A refusal is not a failure of the harness, so it does not count
        // toward the suspension. It IS recorded, because a refusal rate that
        // climbs after a model upgrade is something somebody must be able to
        // read.
        this.consecutiveFailures = 0;
        this.deps.append({
          ...base,
          text: null,
          verdict: 'refused',
          reason: ruling.refusal
        });
        return;
      }
      this.consecutiveFailures = 0;
      this.deps.append({
        ...base,
        text: ruling.kept,
        verdict: 'kept',
        reason: null
      });
    } catch {
      // A fold that throws must never reach the tick that started it. It is
      // one sentence on one line, and the page has a correct fallback.
      this.consecutiveFailures += 1;
    } finally {
      this.inFlight -= 1;
      this.drain();
    }
  }

  private readonly spawn = (
    _input: FoldInput,
    choice: FoldSettings,
    prompt: string
  ): Promise<FoldRun> => {
    const recipe = choice.agentId === null ? null : foldRecipeFor(choice.agentId);
    if (recipe === null || choice.model === null) {
      return Promise.resolve({
        outcome: 'spawn-failed',
        text: null,
        reason: 'no-recipe',
        window: null,
        wallMs: 0,
        costUsd: null
      });
    }
    return runFold({
      recipe,
      model: choice.model,
      systemPrompt: FOLD_SYSTEM_PROMPT,
      prompt
    });
  };

  // -------------------------------------------------------------------------
  // The rate window and the suspension
  // -------------------------------------------------------------------------

  /**
   * Read the window off every fold and stop folding when it turns.
   *
   * This is gate one's third condition, and it is what makes a running fold
   * safe at the one condition gate one could not test, which is a window near
   * its cap rather than at the 0.33 it sat at.
   */
  private readWindow(run: FoldRun): void {
    if (run.outcome === 'rate-limited') {
      this.suspend(run.window, 'The model refused because your usage limit was reached.');
      return;
    }
    // A 529 is the server limiting requests for a moment, and it is not a
    // usage limit. Skip the turn and never suspend on one.
    if (run.outcome === 'overloaded') return;
    if (windowSuspends(run.window)) {
      this.suspend(run.window, 'Your usage window is close to its limit.');
    }
  }

  private noteFailure(run: FoldRun): void {
    if (run.outcome === 'overloaded') return;
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures < FOLD_FAILURES_BEFORE_SUSPEND) return;
    this.suspend(
      null,
      'Three folds in a row did not finish, so Tortie has stopped folding for now.'
    );
  }

  /**
   * Suspend folding. A suspension never sets a session's status and never
   * draws anything on the overview page. The page shows Phase 137's built
   * line for a session with no summary, which is what it does anyway.
   */
  private suspend(window: FoldRateWindow | null, sentence: string): void {
    const until = window?.resetsAtMs ?? this.now() + FOLD_BLIND_SUSPEND_MS;
    this.suspendedUntil = until;
    this.suspendedBecause = sentence;
    this.consecutiveFailures = 0;
    for (const timer of this.settling.values()) clearTimeout(timer);
    this.settling.clear();
    this.pending.clear();
  }
}
