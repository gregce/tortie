/**
 * Phase 163. The startup milestones land once, read back in launch order, and
 * an unlanded one is absent rather than zero.
 */

import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MILESTONE_ORDER,
  MILESTONES,
  markMilestone,
  milestoneLanded,
  readMilestones,
  resetMilestonesForTests
} from '../milestones';

afterEach(() => {
  resetMilestonesForTests();
});

describe('markMilestone', () => {
  it('lands once and reports the first call as the one that landed it', () => {
    expect(markMilestone(MILESTONES.appReady)).toBe(true);
    expect(markMilestone(MILESTONES.appReady)).toBe(false);
    expect(markMilestone(MILESTONES.appReady)).toBe(false);
    expect(performance.getEntriesByName('tortie:app-ready', 'mark')).toHaveLength(1);
  });

  it('keeps the FIRST time, not the last, when the edge fires again', async () => {
    markMilestone(MILESTONES.firstBytes);
    const first = readMilestones()[0]?.atMs;
    await new Promise((r) => setTimeout(r, 5));
    markMilestone(MILESTONES.firstBytes);
    expect(readMilestones()[0]?.atMs).toBe(first);
  });

  it('answers the latch without touching the buffer', () => {
    expect(milestoneLanded(MILESTONES.pathReady)).toBe(false);
    markMilestone(MILESTONES.pathReady);
    expect(milestoneLanded(MILESTONES.pathReady)).toBe(true);
  });
});

describe('readMilestones', () => {
  it('is empty before anything landed, never a row of zeros', () => {
    expect(readMilestones()).toEqual([]);
  });

  it('returns landed milestones in launch order whatever order they landed in', () => {
    markMilestone(MILESTONES.firstAttach);
    markMilestone(MILESTONES.appReady);
    markMilestone(MILESTONES.pathReady);
    const names = readMilestones().map((m) => m.name);
    expect(names).toEqual([
      MILESTONES.appReady,
      MILESTONES.pathReady,
      MILESTONES.firstAttach
    ]);
  });

  it('leaves out a milestone that never landed', () => {
    markMilestone(MILESTONES.appReady);
    markMilestone(MILESTONES.windowShown);
    const names = readMilestones().map((m) => m.name);
    expect(names).not.toContain(MILESTONES.sessionsListed);
    expect(names).toHaveLength(2);
  });

  it('carries a positive time since the process started, to a tenth of a millisecond', () => {
    markMilestone(MILESTONES.sessionsReconciled);
    const [row] = readMilestones();
    expect(row?.atMs).toBeGreaterThan(0);
    expect(Number.isFinite(row?.atMs)).toBe(true);
    expect(Math.round((row?.atMs ?? 0) * 10) / 10).toBe(row?.atMs);
  });

  it('never reads a foreign mark of the same bare name', () => {
    performance.mark('app-ready');
    expect(readMilestones()).toEqual([]);
    performance.clearMarks('app-ready');
  });
});

describe('the contract', () => {
  it('names seven milestones and orders them from app ready to first bytes', () => {
    expect(MILESTONE_ORDER).toHaveLength(7);
    expect(MILESTONE_ORDER[0]).toBe('app-ready');
    expect(MILESTONE_ORDER[MILESTONE_ORDER.length - 1]).toBe('first-bytes');
    expect(new Set(MILESTONE_ORDER).size).toBe(MILESTONE_ORDER.length);
    expect(new Set(Object.values(MILESTONES))).toEqual(new Set(MILESTONE_ORDER));
  });

  it('carries the five the charter named', () => {
    for (const name of [
      'app-ready',
      'window-shown',
      'sessions-listed',
      'path-ready',
      'first-attach'
    ]) {
      expect(MILESTONE_ORDER).toContain(name);
    }
  });

  it('reset clears both the latch and the marks', () => {
    markMilestone(MILESTONES.appReady);
    resetMilestonesForTests();
    expect(milestoneLanded(MILESTONES.appReady)).toBe(false);
    expect(performance.getEntriesByName('tortie:app-ready', 'mark')).toHaveLength(0);
    expect(markMilestone(MILESTONES.appReady)).toBe(true);
  });
});
