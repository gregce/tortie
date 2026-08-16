/**
 * The update journey machine (Phase 58) — every event against every stage,
 * the full 9 by 6 table, plus the visibility policy.
 *
 * The machine is the ONE place the rule "the ring never animates for a
 * check the user did not start" lives, so the table below is complete
 * rather than sampled: each of the 9 events is asserted against each of
 * the 6 stages. Background variants of checking, downloading and staging
 * get their own rows where the userInitiated flag changes the answer.
 */

import { describe, expect, it } from 'vitest';
import type { JourneyEvent, JourneyState } from '../journey';
import { idleJourney, nextJourney, ringFromJourney } from '../journey';

// ---------------------------------------------------------------------------
// The six stages, user initiated where the flag is meaningful
// ---------------------------------------------------------------------------

const idle: JourneyState = idleJourney;

const checking: JourneyState = {
  stage: 'checking',
  userInitiated: true,
  version: null,
  percent: null,
  failedDuring: null
};

const downloading: JourneyState = {
  stage: 'downloading',
  userInitiated: true,
  version: '0.26.0',
  percent: 41,
  failedDuring: null
};

const staging: JourneyState = {
  stage: 'staging',
  userInitiated: true,
  version: '0.26.0',
  percent: null,
  failedDuring: null
};

const ready: JourneyState = {
  stage: 'ready',
  userInitiated: true,
  version: '0.26.0',
  percent: null,
  failedDuring: null
};

const failed: JourneyState = {
  stage: 'failed',
  userInitiated: true,
  version: '0.26.0',
  percent: null,
  failedDuring: 'downloading'
};

/** The background (invisible) variants. Checking cannot be one by design,
 * because background-check-started never leaves idle, but the machine is
 * total, so the row is asserted anyway. */
const bg = (s: JourneyState): JourneyState => ({ ...s, userInitiated: false });

const freshChecking: JourneyState = checking;

// ---------------------------------------------------------------------------
// The events
// ---------------------------------------------------------------------------

const userCheck: JourneyEvent = { kind: 'user-check-started' };
const bgCheck: JourneyEvent = { kind: 'background-check-started' };
const none: JourneyEvent = { kind: 'check-none' };
const checkFailed: JourneyEvent = { kind: 'check-failed' };
const progress: JourneyEvent = {
  kind: 'download-progress',
  version: '0.26.0',
  percent: 55.9
};
const handed: JourneyEvent = { kind: 'handed-to-installer', version: '0.26.0' };
const staged: JourneyEvent = { kind: 'staged', version: '0.26.0' };
const error: JourneyEvent = { kind: 'updater-error' };
const rearmed: JourneyEvent = { kind: 'rearmed' };

describe('the full transition table, event by event', () => {
  it('user-check-started: adopts a journey in flight, respects ready, restarts everything else', () => {
    expect(nextJourney(idle, userCheck)).toEqual(freshChecking);
    expect(nextJourney(checking, userCheck)).toEqual(freshChecking);
    // Adoption: a background download or staging becomes visible mid flight.
    expect(nextJourney(bg(downloading), userCheck)).toEqual(downloading);
    expect(nextJourney(bg(staging), userCheck)).toEqual(staging);
    // An already visible one stays exactly as it is.
    expect(nextJourney(downloading, userCheck)).toEqual(downloading);
    expect(nextJourney(staging, userCheck)).toEqual(staging);
    // Ready is already the answer; a new check must not clear it.
    expect(nextJourney(ready, userCheck)).toBe(ready);
    // A failed ring gives way to the new attempt.
    expect(nextJourney(failed, userCheck)).toEqual(freshChecking);
  });

  it('background-check-started: only idle reacts, and it stays idle', () => {
    expect(nextJourney(idle, bgCheck)).toEqual(idleJourney);
    expect(nextJourney(checking, bgCheck)).toBe(checking);
    expect(nextJourney(downloading, bgCheck)).toBe(downloading);
    expect(nextJourney(staging, bgCheck)).toBe(staging);
    expect(nextJourney(ready, bgCheck)).toBe(ready);
    // A background timer never clears a standing failed ring by starting.
    expect(nextJourney(failed, bgCheck)).toBe(failed);
  });

  it('check-none: ends checking, clears a standing failed ring, outranked by the rest', () => {
    expect(nextJourney(idle, none)).toBe(idle);
    expect(nextJourney(checking, none)).toEqual(idleJourney);
    expect(nextJourney(downloading, none)).toBe(downloading);
    expect(nextJourney(staging, none)).toBe(staging);
    expect(nextJourney(ready, none)).toBe(ready);
    // A background check that later completes clears a stale failure.
    expect(nextJourney(failed, none)).toEqual(idleJourney);
  });

  it('check-failed: fails a user check, silently ends a background one, touches nothing else', () => {
    expect(nextJourney(idle, checkFailed)).toBe(idle);
    expect(nextJourney(checking, checkFailed)).toEqual({
      stage: 'failed',
      userInitiated: true,
      version: null,
      percent: null,
      failedDuring: 'checking'
    });
    expect(nextJourney(bg(checking), checkFailed)).toEqual(idleJourney);
    expect(nextJourney(downloading, checkFailed)).toBe(downloading);
    expect(nextJourney(staging, checkFailed)).toBe(staging);
    expect(nextJourney(ready, checkFailed)).toBe(ready);
    // A standing failed ring is left alone: a second failure adds nothing.
    expect(nextJourney(failed, checkFailed)).toBe(failed);
  });

  it('download-progress: moves idle, checking and downloading; later stages ignore it', () => {
    expect(nextJourney(idle, progress)).toEqual({
      stage: 'downloading',
      userInitiated: false,
      version: '0.26.0',
      percent: 55,
      failedDuring: null
    });
    expect(nextJourney(checking, progress)).toEqual({
      ...downloading,
      percent: 55
    });
    expect(nextJourney(downloading, progress)).toEqual({
      ...downloading,
      percent: 55
    });
    expect(nextJourney(staging, progress)).toBe(staging);
    expect(nextJourney(ready, progress)).toBe(ready);
    expect(nextJourney(failed, progress)).toBe(failed);
  });

  it('handed-to-installer: moves idle, checking and downloading to staging; the rest ignore it', () => {
    expect(nextJourney(idle, handed)).toEqual(bg(staging));
    expect(nextJourney(checking, handed)).toEqual(staging);
    expect(nextJourney(downloading, handed)).toEqual(staging);
    expect(nextJourney(staging, handed)).toBe(staging);
    expect(nextJourney(ready, handed)).toBe(ready);
    expect(nextJourney(failed, handed)).toBe(failed);
  });

  it('staged: ready from every stage, because ready is always visible', () => {
    for (const state of [idle, checking, downloading, staging, ready, failed]) {
      const next = nextJourney(state, staged);
      expect(next.stage).toBe('ready');
      expect(next.version).toBe('0.26.0');
      expect(next.percent).toBe(null);
      expect(next.failedDuring).toBe(null);
    }
  });

  it('updater-error: fails a user journey naming its stage, ends a background one silently', () => {
    expect(nextJourney(idle, error)).toBe(idle);
    expect(nextJourney(checking, error)).toEqual({
      stage: 'failed',
      userInitiated: true,
      version: null,
      percent: null,
      failedDuring: 'checking'
    });
    expect(nextJourney(downloading, error)).toEqual({
      stage: 'failed',
      userInitiated: true,
      version: '0.26.0',
      percent: null,
      failedDuring: 'downloading'
    });
    expect(nextJourney(staging, error)).toEqual({
      stage: 'failed',
      userInitiated: true,
      version: '0.26.0',
      percent: null,
      failedDuring: 'staging'
    });
    // Background journeys die without a trace.
    expect(nextJourney(bg(checking), error)).toEqual(idleJourney);
    expect(nextJourney(bg(downloading), error)).toEqual(idleJourney);
    // Background staging is left standing: an updater error after the hand
    // over does not necessarily mean Squirrel failed, and the staged event
    // can still arrive and surface ready.
    expect(nextJourney(bg(staging), error)).toEqual(bg(staging));
    expect(nextJourney(ready, error)).toBe(ready);
    expect(nextJourney(failed, error)).toBe(failed);
  });

  it('rearmed: everything returns to idle, because the staged copy is gone', () => {
    for (const state of [idle, checking, downloading, staging, ready, failed]) {
      expect(nextJourney(state, rearmed)).toEqual(idleJourney);
    }
  });
});

describe('percent handling', () => {
  it('floors, never rounds up, so 100 appears only when the download is done', () => {
    const at = (p: number): number | null =>
      nextJourney(checking, { ...progress, percent: p }).percent;
    expect(at(41.99)).toBe(41);
    expect(at(99.999)).toBe(99);
    expect(at(100)).toBe(100);
    expect(at(0.9)).toBe(0);
  });

  it('clamps to 0 to 100 and survives a nonsense number', () => {
    const at = (p: number): number | null =>
      nextJourney(checking, { ...progress, percent: p }).percent;
    expect(at(-5)).toBe(0);
    expect(at(150)).toBe(100);
    expect(at(Number.NaN)).toBe(0);
    expect(at(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('the visibility policy (ringFromJourney)', () => {
  it('idle is hidden', () => {
    expect(ringFromJourney(idle)).toEqual({
      ring: 'hidden',
      ringVersion: null,
      ringPercent: null,
      failedDuring: null
    });
  });

  it('checking, downloading and staging are visible only when user initiated', () => {
    expect(ringFromJourney(checking).ring).toBe('checking');
    expect(ringFromJourney(downloading)).toEqual({
      ring: 'downloading',
      ringVersion: '0.26.0',
      ringPercent: 41,
      failedDuring: null
    });
    expect(ringFromJourney(staging)).toEqual({
      ring: 'staging',
      ringVersion: '0.26.0',
      ringPercent: null,
      failedDuring: null
    });
  });

  it('a background journey leaks nothing: hidden, with version and percent nulled', () => {
    for (const state of [bg(checking), bg(downloading), bg(staging)]) {
      expect(ringFromJourney(state)).toEqual({
        ring: 'hidden',
        ringVersion: null,
        ringPercent: null,
        failedDuring: null
      });
    }
  });

  it('ready is visible even from a background journey, exactly as the staged menu item is', () => {
    expect(ringFromJourney(bg(ready))).toEqual({
      ring: 'ready',
      ringVersion: '0.26.0',
      ringPercent: null,
      failedDuring: null
    });
  });

  it('failed carries the stage that failed and the version, for the hover and the dialog', () => {
    expect(ringFromJourney(failed)).toEqual({
      ring: 'failed',
      ringVersion: '0.26.0',
      ringPercent: null,
      failedDuring: 'downloading'
    });
  });
});

describe('whole journeys, end to end through the machine', () => {
  const run = (events: JourneyEvent[]): JourneyState =>
    events.reduce(nextJourney, idleJourney);

  it('a user check adopts an in flight background download and stays visible to ready', () => {
    const adopted = run([
      { kind: 'background-check-started' },
      { kind: 'download-progress', version: '0.26.0', percent: 12 },
      { kind: 'user-check-started' }
    ]);
    expect(adopted.stage).toBe('downloading');
    expect(adopted.userInitiated).toBe(true);
    expect(adopted.percent).toBe(12);
    expect(ringFromJourney(adopted).ring).toBe('downloading');

    const done = [handed, staged].reduce(nextJourney, adopted);
    expect(ringFromJourney(done).ring).toBe('ready');
  });

  it('a whole background journey is hidden until staged, then ready', () => {
    const stages: string[] = [];
    let state = idleJourney;
    for (const event of [
      { kind: 'background-check-started' } as JourneyEvent,
      { kind: 'download-progress', version: '0.26.0', percent: 3 } as JourneyEvent,
      { kind: 'download-progress', version: '0.26.0', percent: 97 } as JourneyEvent,
      handed,
      staged
    ]) {
      state = nextJourney(state, event);
      stages.push(ringFromJourney(state).ring);
    }
    expect(stages).toEqual(['hidden', 'hidden', 'hidden', 'hidden', 'ready']);
  });

  it('rearmed clears a ready ring, because the recovery removed the staged copy', () => {
    const readyState = run([
      userCheck,
      { kind: 'download-progress', version: '0.26.0', percent: 80 },
      handed,
      staged
    ]);
    expect(ringFromJourney(readyState).ring).toBe('ready');
    const after = nextJourney(readyState, rearmed);
    expect(after).toEqual(idleJourney);
    expect(ringFromJourney(after).ring).toBe('hidden');
  });

  it('a background success clears a standing failed ring, and a background failure leaves it', () => {
    const failedState = run([userCheck, checkFailed]);
    expect(ringFromJourney(failedState).ring).toBe('failed');

    // The later background check starts: the failed ring must not blink.
    const during = nextJourney(failedState, bgCheck);
    expect(ringFromJourney(during).ring).toBe('failed');

    // It completes with "nothing to update": the stale failure goes.
    expect(nextJourney(during, none)).toEqual(idleJourney);

    // Or it fails too: nothing changes.
    expect(nextJourney(during, checkFailed)).toBe(during);
  });
});
