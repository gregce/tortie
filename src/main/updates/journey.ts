/**
 * The update journey machine (Phase 58) — one pure state machine, no
 * imports from electron, exhaustively unit tested.
 *
 * WHY THIS MODULE EXISTS. The activity bar ring draws exactly what main
 * tells it. The rule "the ring must never animate for a check the user did
 * not start" is enforced HERE, in one place, where it is unit testable. The
 * renderer contains no visibility policy: it renders the `ring` field of
 * UpdateUiState and nothing else.
 *
 * The engine (./updater) feeds events into `nextJourney` at its existing
 * seams and computes the renderer's view through `ringFromJourney`. The
 * engine rules — handedToInstaller, the one staging per run guard, the one
 * quitAndInstall call site, the feed override gate — do not live here and
 * did not move.
 */

import type { UpdateRingStage } from '@shared/ipc';

export type JourneyStage =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'staging'
  | 'ready'
  | 'failed';

export interface JourneyState {
  stage: JourneyStage;
  /** True only when the running journey began with, or was adopted by, a user started check. */
  userInitiated: boolean;
  /** The version the journey concerns. Null in idle and in checking. */
  version: string | null;
  /** Whole number 0 to 100. Non null only in downloading. */
  percent: number | null;
  /** Which stage failed. Non null only in failed. */
  failedDuring: 'checking' | 'downloading' | 'staging' | null;
}

export type JourneyEvent =
  | { kind: 'user-check-started' }
  | { kind: 'background-check-started' }
  | { kind: 'check-none' }
  | { kind: 'check-failed' }
  | { kind: 'download-progress'; version: string; percent: number }
  | { kind: 'handed-to-installer'; version: string }
  | { kind: 'staged'; version: string }
  | { kind: 'updater-error' }
  | { kind: 'rearmed' };

export const idleJourney: JourneyState = {
  stage: 'idle',
  userInitiated: false,
  version: null,
  percent: null,
  failedDuring: null
};

/** The floor of the given percent, clamped to 0 to 100, never rounded up. */
function flooredPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.floor(percent)));
}

/**
 * The complete transition table. Every event against every stage; anything
 * not moved by a rule below returns the state unchanged.
 */
export function nextJourney(
  state: JourneyState,
  event: JourneyEvent
): JourneyState {
  switch (event.kind) {
    case 'user-check-started': {
      // The user's check ADOPTS a background journey mid flight and makes
      // it visible. Ready is already visible, so it is left alone.
      if (state.stage === 'downloading' || state.stage === 'staging') {
        return { ...state, userInitiated: true };
      }
      if (state.stage === 'ready') return state;
      return {
        stage: 'checking',
        userInitiated: true,
        version: null,
        percent: null,
        failedDuring: null
      };
    }
    case 'background-check-started': {
      // Only from idle, and it stays idle. A background timer never
      // disturbs a visible ring, and never disturbs a standing failed ring.
      if (state.stage === 'idle') return idleJourney;
      return state;
    }
    case 'check-none': {
      // A completed "nothing to update" answer ends a checking journey and
      // clears a standing failed ring (section 2 of the phase spec: a stale
      // failure should not outlive a later success). Downloading, staging
      // and ready outrank a completed check answer.
      if (state.stage === 'checking' || state.stage === 'failed') {
        return idleJourney;
      }
      return state;
    }
    case 'check-failed': {
      if (state.stage === 'checking') {
        if (state.userInitiated) {
          return {
            stage: 'failed',
            userInitiated: true,
            version: null,
            percent: null,
            failedDuring: 'checking'
          };
        }
        // A background check that fails is one log line and an idle ring.
        return idleJourney;
      }
      // A standing failed ring is left alone, and so is every other stage.
      return state;
    }
    case 'download-progress': {
      if (
        state.stage === 'idle' ||
        state.stage === 'checking' ||
        state.stage === 'downloading'
      ) {
        return {
          stage: 'downloading',
          userInitiated: state.userInitiated,
          version: event.version,
          percent: flooredPercent(event.percent),
          failedDuring: null
        };
      }
      // Staging, ready and failed ignore progress: those stages are later
      // truths than a download tick.
      return state;
    }
    case 'handed-to-installer': {
      if (
        state.stage === 'idle' ||
        state.stage === 'checking' ||
        state.stage === 'downloading'
      ) {
        return {
          stage: 'staging',
          userInitiated: state.userInitiated,
          version: event.version,
          percent: null,
          failedDuring: null
        };
      }
      // Already staging: the repeat is ignored rather than re-set, because
      // the engine hands over once per run. Ready and failed are ignored.
      return state;
    }
    case 'staged': {
      // Ready is always visible, from any stage. This is the one moment a
      // background journey may surface, exactly as the staged menu item
      // does.
      return {
        stage: 'ready',
        userInitiated: state.userInitiated,
        version: event.version,
        percent: null,
        failedDuring: null
      };
    }
    case 'updater-error': {
      if (
        state.stage === 'checking' ||
        state.stage === 'downloading' ||
        state.stage === 'staging'
      ) {
        if (state.userInitiated) {
          return {
            stage: 'failed',
            userInitiated: true,
            version: state.version,
            percent: null,
            failedDuring: state.stage
          };
        }
        // A background journey dies silently. Checking and downloading
        // return to idle. Staging is left as it is, because an updater
        // error after the hand over does not necessarily mean the staging
        // failed: Squirrel may still finish, and the staged event would
        // then surface ready.
        if (state.stage === 'staging') return state;
        return idleJourney;
      }
      // Ready, failed and idle are untouched.
      return state;
    }
    case 'rearmed': {
      // The recovery removed the staged copy, so a ready ring would be a
      // lie. Everything returns to idle.
      return idleJourney;
    }
    default: {
      const unhandled: never = event;
      return unhandled;
    }
  }
}

/**
 * The visibility policy — the other pure half. checking, downloading and
 * staging are visible only when the journey is user initiated; a hidden
 * mapping also nulls the version and the percent, so a background journey
 * leaks nothing. Ready is always visible. Failed is only reachable with
 * userInitiated true.
 */
export function ringFromJourney(j: JourneyState): {
  ring: UpdateRingStage;
  ringVersion: string | null;
  ringPercent: number | null;
  failedDuring: JourneyState['failedDuring'];
} {
  const hidden = {
    ring: 'hidden' as const,
    ringVersion: null,
    ringPercent: null,
    failedDuring: null
  };
  switch (j.stage) {
    case 'idle':
      return hidden;
    case 'checking':
    case 'downloading':
    case 'staging': {
      if (!j.userInitiated) return hidden;
      return {
        ring: j.stage,
        // Checking has no version by definition (the state shape nulls it).
        ringVersion: j.version,
        ringPercent: j.stage === 'downloading' ? j.percent : null,
        failedDuring: null
      };
    }
    case 'ready':
      return {
        ring: 'ready',
        ringVersion: j.version,
        ringPercent: null,
        failedDuring: null
      };
    case 'failed':
      return {
        ring: 'failed',
        ringVersion: j.version,
        ringPercent: null,
        failedDuring: j.failedDuring
      };
    default: {
      const unhandled: never = j.stage;
      return unhandled;
    }
  }
}
