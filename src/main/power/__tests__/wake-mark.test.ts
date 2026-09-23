/**
 * `WakeMark` — when this Mac last woke (Phase 314, SPEC §3.3).
 *
 * Driven through an injected monitor, so no machine sleeps. Each test names the
 * clause it would catch if the clause were removed.
 */

import { describe, expect, it } from 'vitest';
import type { WakeWindow } from '../../tray/attention';
import { drivableMonitor, type DrivableMonitor } from '../drivable-monitor';
import { WAKE_MEMORY, WakeMark } from '../wake-mark';

/** The shared drivable monitor, plus the total listener count the dispose test reads. */
function monitor(): DrivableMonitor & { count(): number } {
  const m = drivableMonitor();
  return Object.assign(m, { count: () => m.listenerCount('suspend') + m.listenerCount('resume') });
}

function clock(start: number): { now: () => number; set(t: number): void } {
  let t = start;
  return { now: () => t, set: (next) => (t = next) };
}

describe('WakeMark', () => {
  it('records a suspend and the resume after it as one window, wall clock', () => {
    const m = monitor();
    const c = clock(1_000);
    const mark = new WakeMark(m, c.now);
    m.fire('suspend');
    c.set(1_000 + 8 * 3_600_000);
    m.fire('resume');
    expect(mark.wakes()).toEqual([{ suspendedAt: 1_000, resumedAt: 1_000 + 8 * 3_600_000 }]);
  });

  it('records a resume nobody heard the suspend of with suspendedAt null', () => {
    const m = monitor();
    const mark = new WakeMark(m, () => 5);
    m.fire('resume');
    expect(mark.wakes()).toEqual([{ suspendedAt: null, resumedAt: 5 }]);
  });

  it('keeps the first suspend of a flurry', () => {
    const m = monitor();
    const c = clock(10);
    const mark = new WakeMark(m, c.now);
    m.fire('suspend');
    c.set(20);
    m.fire('suspend');
    c.set(30);
    m.fire('resume');
    expect(mark.wakes()[0]?.suspendedAt).toBe(10);
  });

  it(`remembers at most ${WAKE_MEMORY} wakes, oldest first, dropping the oldest`, () => {
    const m = monitor();
    const c = clock(0);
    const mark = new WakeMark(m, c.now);
    for (let i = 1; i <= WAKE_MEMORY + 3; i += 1) {
      c.set(i * 100);
      m.fire('resume');
    }
    const wakes = mark.wakes();
    expect(wakes).toHaveLength(WAKE_MEMORY);
    expect(wakes[0]?.resumedAt).toBe(400);
    expect(wakes[WAKE_MEMORY - 1]?.resumedAt).toBe((WAKE_MEMORY + 3) * 100);
  });

  it('records the window BEFORE the resume listeners run, and hands it to them', () => {
    const m = monitor();
    const mark = new WakeMark(m, () => 77);
    const heard: Array<{ given: WakeWindow; seen: readonly WakeWindow[] }> = [];
    mark.onResume((w) => heard.push({ given: w, seen: mark.wakes() }));
    m.fire('resume');
    expect(heard).toEqual([{ given: { suspendedAt: null, resumedAt: 77 }, seen: [{ suspendedAt: null, resumedAt: 77 }] }]);
  });

  it('runs every listener even when one throws, and unsubscribes', () => {
    const m = monitor();
    const mark = new WakeMark(m, () => 1);
    let suspends = 0;
    let resumes = 0;
    mark.onSuspend(() => {
      throw new Error('first');
    });
    const offSuspend = mark.onSuspend(() => (suspends += 1));
    mark.onResume(() => {
      throw new Error('first');
    });
    const offResume = mark.onResume(() => (resumes += 1));
    m.fire('suspend');
    m.fire('resume');
    expect([suspends, resumes]).toEqual([1, 1]);
    offSuspend();
    offResume();
    m.fire('suspend');
    m.fire('resume');
    expect([suspends, resumes]).toEqual([1, 1]);
  });

  it('answers a copy, so a reader cannot edit the record', () => {
    const m = monitor();
    const mark = new WakeMark(m, () => 1);
    m.fire('resume');
    (mark.wakes() as WakeWindow[]).length = 0;
    expect(mark.wakes()).toHaveLength(1);
  });

  it('removes both monitor listeners on dispose, and a second dispose is safe', () => {
    const m = monitor();
    const mark = new WakeMark(m, () => 1);
    expect(m.count()).toBe(2);
    mark.dispose();
    expect(m.count()).toBe(0);
    mark.dispose();
    m.fire('resume');
    expect(mark.wakes()).toHaveLength(0);
  });
});
