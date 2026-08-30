/**
 * Phase 170 fix round. A live sample arrives with this window's facts null
 * and the renderer fills them in itself, and the long task observer the tab
 * arms for live mode exists exactly as long as the subscription stands.
 *
 *  - withRendererFacts sets the renderer facts and the surfaces count and
 *    touches nothing else in the report.
 *  - arm is called once per subscribe and its disarm once per teardown, over
 *    ten hide and show cycles, and nothing is armed after the last hide.
 */

import { describe, expect, it } from 'vitest';
import type { DiagnosticsRendererFacts, DiagnosticsReport } from '@shared/ipc';
import { withRendererFacts } from '../capture';
import { LiveSubscription } from '../live';

const facts: DiagnosticsRendererFacts = {
  memory: {
    privateBytes: 10,
    sharedBytes: 1,
    heapUsedBytes: 3,
    heapTotalBytes: 4,
    heapLimitBytes: 8,
    mallocedBytes: 2,
    blinkAllocatedBytes: 5,
    blinkTotalBytes: 6
  },
  mountedSurfaces: 7,
  longTasks: { count: 1, totalMs: 60, maxMs: 60, buffered: false }
};

describe('withRendererFacts', () => {
  it('fills the renderer facts and the surfaces count, nothing else', () => {
    const report = {
      renderer: { memory: null, mountedSurfaces: null, longTasks: null },
      counts: { sessions: 2, mountedSurfaces: null, windows: 1 },
      other: 'kept'
    } as unknown as DiagnosticsReport;
    const out = withRendererFacts(report, facts);
    expect(out.renderer).toBe(facts);
    expect(out.counts.mountedSurfaces).toBe(7);
    expect((out.counts as { sessions: number }).sessions).toBe(2);
    expect((out as unknown as { other: string }).other).toBe('kept');
    expect(report.renderer.memory).toBeNull();
  });
});

describe('the live observer is armed exactly while subscribed', () => {
  it('arms once per show and disarms once per hide, ten times', () => {
    let armed = 0;
    let disarmed = 0;
    let stops = 0;
    const sub = new LiveSubscription({
      liveStart: () => Promise.resolve({ started: true, intervalMs: 2000 }),
      liveStop: () => {
        stops += 1;
        return Promise.resolve();
      },
      onLiveSample: () => () => undefined,
      onSample: () => undefined,
      arm: () => {
        armed += 1;
        return () => {
          disarmed += 1;
        };
      }
    });
    for (let i = 0; i < 10; i += 1) {
      sub.setVisible(true);
      expect(armed).toBe(i + 1);
      expect(disarmed).toBe(i);
      sub.setVisible(false);
      expect(disarmed).toBe(i + 1);
      expect(stops).toBe(i + 1);
    }
    expect(armed).toBe(10);
    expect(disarmed).toBe(10);
    expect(sub.subscribed).toBe(false);
    sub.dispose();
    expect(disarmed).toBe(10);
  });

  it('a held subscription is quiet and comes back when released', () => {
    let starts = 0;
    let stops = 0;
    const sub = new LiveSubscription({
      liveStart: () => {
        starts += 1;
        return Promise.resolve({ started: true, intervalMs: 2000 });
      },
      liveStop: () => {
        stops += 1;
        return Promise.resolve();
      },
      onLiveSample: () => () => undefined,
      onSample: () => undefined
    });
    sub.setVisible(true);
    expect(sub.subscribed).toBe(true);
    sub.setHeld(true);
    expect(sub.subscribed).toBe(false);
    expect(stops).toBe(1);
    sub.setHeld(false);
    expect(sub.subscribed).toBe(true);
    expect(starts).toBe(2);
    sub.setVisible(false);
    sub.setHeld(true);
    sub.setHeld(false);
    expect(sub.subscribed).toBe(false);
    expect(starts).toBe(2);
  });

  it('works with no arm hook at all', () => {
    const sub = new LiveSubscription({
      liveStart: () => Promise.resolve({ started: true, intervalMs: 2000 }),
      liveStop: () => Promise.resolve(),
      onLiveSample: () => () => undefined,
      onSample: () => undefined
    });
    sub.setVisible(true);
    sub.setVisible(false);
    expect(sub.subscribed).toBe(false);
  });
});
