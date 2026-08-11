/**
 * The reflow grace (Phase 12.11) — what gmux does to a pane may not be read
 * back as the agent working.
 *
 * Zooming a terminal resizes it, and every app inside a resized pane repaints
 * the whole screen. That repaint fakes BOTH of the inferred tier's weak
 * signals at once: tmux's output clock ticks, and the screen hash changes. A
 * user who pressed ⌘+ on four visible sessions would watch all four light up
 * as "working" for the next five ticks. It is the same rule Phase 9.2 wrote
 * for keystrokes, on the other side of the wire.
 *
 * These tests pin the shape of the discount: output and the screen hash are
 * suppressed, everything that a repaint CANNOT fake is not.
 */

import { describe, expect, it } from 'vitest';
import type { AgentActivityProfile } from '../../agents/registry';
import type { PaneFacts } from '../panes';
import {
  freshState,
  inferredVerdict,
  REFLOW_GRACE_MS,
  type SessionState
} from '../state-machine';

const NOW = 1_800_000_000_000;

const SCREEN_PROFILE: AgentActivityProfile = {
  tier: 'screen',
  animatesWhenIdle: false,
  verified: 'verified'
};

function pane(over: Partial<PaneFacts> = {}): PaneFacts {
  return {
    tmuxId: '$1',
    paneId: '%1',
    panePid: 1234,
    active: true,
    dead: false,
    activityAt: NOW - 60_000, // long quiet by default
    currentCommand: 'zsh',
    keypad: true,
    alternate: false,
    inMode: false,
    historySize: 0,
    historyLimit: 25_000,
    title: '',
    ...over
  };
}

/** A settled, idle session — the state a zoom must not disturb. */
function idleState(): SessionState {
  const st = freshState(NOW);
  st.state = 'idle';
  // Give the screen memory a baseline so the first observation is a change.
  st.screen.note('aaaaaaaaaaaa');
  return st;
}

describe('a repaint caused by a resize', () => {
  it('reads as WORKING without the grace — which is the bug', () => {
    const st = idleState();
    const verdict = inferredVerdict(pane({ activityAt: NOW }), SCREEN_PROFILE, st, {
      now: NOW,
      proc: null,
      capture: 'the pane redrew wider\n'
    });
    expect(verdict?.state).toBe('working');
  });

  it('is discounted while the pane is inside its grace window', () => {
    const st = idleState();
    st.reflowUntil = NOW + REFLOW_GRACE_MS;
    const verdict = inferredVerdict(pane({ activityAt: NOW }), SCREEN_PROFILE, st, {
      now: NOW,
      proc: null,
      capture: 'the pane redrew wider\n'
    });
    // No verdict at all: the session holds whatever it already reported.
    expect(verdict).toBeNull();
    expect(st.state).toBe('idle');
  });

  it('does not decay a working session to idle either', () => {
    const st = freshState(NOW);
    st.state = 'working';
    st.reflowUntil = NOW + REFLOW_GRACE_MS;
    // Three quiet ticks would normally confirm idle.
    for (let i = 0; i < 3; i++) {
      expect(
        inferredVerdict(pane(), SCREEN_PROFILE, st, { now: NOW, proc: null })
      ).toBeNull();
    }
    expect(st.quietTicks).toBe(0);
  });

  it('re-baselines the screen memory, so the reflow is not still "recent" after the grace', () => {
    // The memory's predicate is "changed within the last K observations". A
    // change merely IGNORED during the grace would still be inside the window
    // afterwards and report working then — the bug this test exists to catch.
    const st = idleState();
    st.reflowUntil = NOW + REFLOW_GRACE_MS;
    inferredVerdict(pane({ activityAt: NOW }), SCREEN_PROFILE, st, {
      now: NOW,
      proc: null,
      capture: 'reflowed\n'
    });
    const after = inferredVerdict(pane(), SCREEN_PROFILE, st, {
      now: NOW + REFLOW_GRACE_MS + 1,
      proc: null,
      capture: 'reflowed\n'
    });
    expect(after?.state).toBe('idle');
  });

  it('still catches a dialog that appears mid-resize', () => {
    // needs_input is the one thing a user is waiting on, and a dialog is not
    // something a repaint can invent.
    const dialog =
      'Do you want to make this edit?\n' +
      '  1. Yes\n' +
      '  2. No, tell Claude what to do differently\n' +
      'Press enter to confirm\n';
    const st = idleState();
    st.reflowUntil = NOW + REFLOW_GRACE_MS;
    inferredVerdict(pane({ activityAt: NOW }), SCREEN_PROFILE, st, {
      now: NOW,
      proc: null,
      capture: dialog
    });
    const second = inferredVerdict(pane({ activityAt: NOW }), SCREEN_PROFILE, st, {
      now: NOW + 1000,
      proc: null,
      capture: dialog
    });
    expect(second?.state).toBe('needs_input');
  });

  it('lets real evidence through again once the window closes', () => {
    const st = idleState();
    st.reflowUntil = NOW + REFLOW_GRACE_MS;
    const verdict = inferredVerdict(
      pane({ activityAt: NOW + REFLOW_GRACE_MS + 1 }),
      SCREEN_PROFILE,
      st,
      { now: NOW + REFLOW_GRACE_MS + 1, proc: null }
    );
    expect(verdict?.state).toBe('working');
  });
});
