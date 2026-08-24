/**
 * The turn boundary (Phase 138).
 *
 * The fold's whole trigger is one transition the activity monitor already
 * makes. There is no timer, no poll and no daemon, so this file is where the
 * trigger is pinned down: which transitions count, that it fires from the one
 * commit point, that it fires once per real transition, and that a monitor
 * built without the callback behaves exactly as it did before.
 */

import { describe, expect, it } from 'vitest';
import {
  commitVerdict,
  freshState,
  isTurnBoundary
} from '../state-machine';
import type { ActivityState } from '../types';

const STATES: ActivityState[] = ['idle', 'working', 'needs_input'];

describe('isTurnBoundary', () => {
  it('is true only when a working session goes quiet or asks you something', () => {
    expect(isTurnBoundary('working', 'idle')).toBe(true);
    expect(isTurnBoundary('working', 'needs_input')).toBe(true);
  });

  it('is false for every other pair', () => {
    const seen: string[] = [];
    for (const from of STATES) {
      for (const to of STATES) {
        if (from === 'working' && (to === 'idle' || to === 'needs_input')) continue;
        if (isTurnBoundary(from, to)) seen.push(`${from} to ${to}`);
      }
    }
    expect(seen).toEqual([]);
  });

  it('is false when a session starts working, which is the turn beginning', () => {
    expect(isTurnBoundary('idle', 'working')).toBe(false);
    expect(isTurnBoundary('needs_input', 'working')).toBe(false);
  });

  it('is false for a session that never moved', () => {
    for (const state of STATES) expect(isTurnBoundary(state, state)).toBe(false);
  });
});

describe('the boundary against the state machine that produces it', () => {
  /** Drive commitVerdict the way the monitor does, and collect the boundaries. */
  function drive(states: ActivityState[]): string[] {
    const st = freshState(0);
    const fired: string[] = [];
    let now = 0;
    for (const state of states) {
      now += 1_000;
      const from = st.state;
      const next = commitVerdict(st, { state, tier: 'inferred' }, now);
      if (next === null) continue;
      if (isTurnBoundary(from, next)) fired.push(`${from} to ${next}`);
    }
    return fired;
  }

  it('fires once for one completed turn', () => {
    expect(drive(['working', 'idle'])).toEqual(['working to idle']);
  });

  it('fires once when a turn ends by asking you something', () => {
    expect(drive(['working', 'needs_input'])).toEqual(['working to needs_input']);
  });

  it('fires twice for two completed turns', () => {
    expect(drive(['working', 'idle', 'working', 'idle'])).toHaveLength(2);
  });

  it('does not fire for a repeated verdict, because nothing moved', () => {
    expect(drive(['working', 'working', 'idle', 'idle'])).toHaveLength(1);
  });

  it('never fires for a session that only ever sits idle', () => {
    expect(drive(['idle', 'idle', 'idle'])).toEqual([]);
  });

  it('does not fire on the release the state machine already refuses', () => {
    // needs_input may not go straight to idle: an unanswered prompt must not
    // vanish. So there is no second boundary here.
    expect(drive(['working', 'needs_input', 'idle'])).toHaveLength(1);
  });
});
