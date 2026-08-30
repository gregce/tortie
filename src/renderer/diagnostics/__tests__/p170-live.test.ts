/**
 * The live subscription (Phase 170), driven without a browser.
 *
 * THE RULING UNDER TEST. The operator overrode the one capture stance: main
 * ticks samples only while a visible tab holds a subscription, and the
 * renderer's end must go completely quiet the instant the tab is hidden,
 * paused or closed. Quiet means the sample listener is gone, main has been
 * told to stop, and a tick already in the pipe lands on nobody. The hide is
 * driven TEN TIMES, the way the Phase 163 teardown proof was driven.
 */

import { describe, expect, it } from 'vitest';
import type { DiagnosticsLiveSample, DiagnosticsReport } from '@shared/ipc';
import { DIAGNOSTICS_LIVE_INTERVAL_MS } from '@shared/ipc';
import { LiveSubscription } from '../live';
import * as words from '../copy';

interface Harness {
  sub: LiveSubscription;
  /** Push one sample the way main's tick would. */
  push(): void;
  starts(): boolean[];
  stops(): number;
  listeners(): number;
  delivered(): number;
}

function harness(): Harness {
  const startCalls: boolean[] = [];
  let stopCalls = 0;
  let listeners: Array<(s: DiagnosticsLiveSample) => void> = [];
  let deliveredCount = 0;
  const sub = new LiveSubscription({
    liveStart: (visible) => {
      startCalls.push(visible);
      return Promise.resolve({ started: visible, intervalMs: 2000 });
    },
    liveStop: () => {
      stopCalls += 1;
      return Promise.resolve();
    },
    onLiveSample: (cb) => {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    },
    onSample: () => {
      deliveredCount += 1;
    }
  });
  return {
    sub,
    push: () => {
      for (const cb of [...listeners]) {
        cb({ report: {} as DiagnosticsReport, intervalMs: 2000, tick: 1 });
      }
    },
    starts: () => startCalls,
    stops: () => stopCalls,
    listeners: () => listeners.length,
    delivered: () => deliveredCount
  };
}

describe('LiveSubscription', () => {
  it('subscribes once on show, and samples reach the face', () => {
    const h = harness();
    h.sub.setVisible(true);
    expect(h.listeners()).toBe(1);
    expect(h.starts()).toEqual([true]);
    h.push();
    expect(h.delivered()).toBe(1);
  });

  it('goes quiet the instant the tab hides, driven ten times', () => {
    const h = harness();
    for (let round = 1; round <= 10; round += 1) {
      h.sub.setVisible(true);
      expect(h.listeners()).toBe(1);
      h.sub.setVisible(false);
      // The moment hide returns: no listener, main told to stop, exactly
      // once per round, and a tick already in the pipe lands on nobody.
      expect(h.sub.subscribed).toBe(false);
      expect(h.listeners()).toBe(0);
      expect(h.stops()).toBe(round);
      h.push();
      expect(h.delivered()).toBe(0);
    }
    expect(h.starts()).toHaveLength(10);
  });

  it('never doubles the subscription on repeated shows', () => {
    const h = harness();
    h.sub.setVisible(true);
    h.sub.setVisible(true);
    h.sub.setPaused(false);
    expect(h.listeners()).toBe(1);
    expect(h.starts()).toEqual([true]);
  });

  it('pause is the same quiet, and resume subscribes afresh', () => {
    const h = harness();
    h.sub.setVisible(true);
    h.sub.setPaused(true);
    expect(h.listeners()).toBe(0);
    expect(h.stops()).toBe(1);
    h.push();
    expect(h.delivered()).toBe(0);
    h.sub.setPaused(false);
    expect(h.listeners()).toBe(1);
    h.push();
    expect(h.delivered()).toBe(1);
  });

  it('stays quiet while hidden whatever pause does', () => {
    const h = harness();
    h.sub.setVisible(false);
    h.sub.setPaused(true);
    h.sub.setPaused(false);
    expect(h.listeners()).toBe(0);
    expect(h.starts()).toHaveLength(0);
    expect(h.stops()).toBe(0);
  });

  it('dispose is forever: nothing subscribes after it, whatever is asked', () => {
    const h = harness();
    h.sub.setVisible(true);
    h.sub.dispose();
    expect(h.listeners()).toBe(0);
    expect(h.stops()).toBe(1);
    h.sub.setVisible(true);
    h.sub.setPaused(false);
    expect(h.listeners()).toBe(0);
    expect(h.starts()).toEqual([true]);
  });

  it('keeps the face words true to the contract interval', () => {
    // The face says "every 2 s". If the interval moves, this pins the words
    // to move with it rather than drift in silence.
    expect(DIAGNOSTICS_LIVE_INTERVAL_MS).toBe(2000);
    expect(words.LIVE_EVERY).toBe('every 2 s');
  });
});
