import { describe, expect, it } from 'vitest';
import {
  FETCH_STALE_MS,
  fetchAgeCaption,
  fetchAgeNote,
  fetchAgeShort,
  fetchIsStale,
  honestSyncTooltip,
  remoteRefTitle
} from '../freshness';

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('fetchIsStale', () => {
  it('treats a never-fetched clone as stale — it knows nothing', () => {
    expect(fetchIsStale(null, NOW)).toBe(true);
  });

  it('holds the line at one hour', () => {
    expect(fetchIsStale(NOW - FETCH_STALE_MS + 1, NOW)).toBe(false);
    expect(fetchIsStale(NOW - FETCH_STALE_MS - 1, NOW)).toBe(true);
  });
});

describe('fetchAgeShort', () => {
  it('uses the row-age vocabulary so it reads as an age, not a count', () => {
    expect(fetchAgeShort(NOW - 3 * HOUR, NOW)).toBe('3h');
    expect(fetchAgeShort(NOW - 2 * DAY, NOW)).toBe('2d');
  });

  it('has nothing to show when nothing was ever fetched', () => {
    expect(fetchAgeShort(null, NOW)).toBeNull();
  });
});

describe('the freshness clause', () => {
  it('says when, in prose', () => {
    expect(fetchAgeNote(NOW - 3 * HOUR, NOW)).toBe('last fetched 3 hours ago');
    expect(fetchAgeCaption(NOW - 3 * HOUR, NOW)).toBe(
      'Last fetched 3 hours ago'
    );
  });

  it('says so plainly when there is no snapshot at all', () => {
    expect(fetchAgeNote(null, NOW)).toBe('nothing fetched from a remote yet');
    expect(fetchAgeCaption(null, NOW)).toBe(
      'Nothing fetched from a remote yet'
    );
  });

  it('is not alarmist — no "stale", no "outdated", no warning voice', () => {
    const words = /stale|outdated|warning|error|!/i;
    expect(fetchAgeNote(NOW - 30 * DAY, NOW)).not.toMatch(words);
    expect(fetchAgeCaption(null, NOW)).not.toMatch(words);
  });
});

describe('honestSyncTooltip', () => {
  it('qualifies "nothing to pull or push" with when it was measured', () => {
    expect(honestSyncTooltip(0, 0, 'origin/main', NOW - 3 * HOUR, NOW)).toBe(
      'Sync with origin/main — nothing to pull or push right now · last fetched 3 hours ago'
    );
  });

  it('qualifies the counted states too — behind is only as fresh as the fetch', () => {
    expect(honestSyncTooltip(2, 1, 'origin/dev', NOW - 5 * MIN, NOW)).toBe(
      'Sync — pull 1 commit from origin/dev, then push 2 commits · last fetched 5 minutes ago'
    );
  });

  it('appends the clause even when the fetch was seconds ago', () => {
    // Making it conditional would teach "no clause means fresh", which is the
    // inference this work exists to prevent.
    expect(honestSyncTooltip(0, 0, 'origin/main', NOW - 1000, NOW)).toContain(
      'last fetched just now'
    );
  });

  it('says nothing about freshness while the age is still unknown', () => {
    // `undefined` is "not read yet", distinct from `null` = "never fetched".
    const tip = honestSyncTooltip(0, 0, 'origin/main', undefined, NOW);
    expect(tip).toBe(
      'Sync with origin/main — nothing to pull or push right now'
    );
  });
});

describe('remoteRefTitle', () => {
  it('puts the snapshot age on the pill that asserts where the remote is', () => {
    expect(remoteRefTitle('origin/main', NOW - 2 * DAY, NOW)).toBe(
      'origin/main — remote branch, last fetched 2 days ago'
    );
  });
});
