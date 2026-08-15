/**
 * The degraded-durability notice channel (Phase 19 item 9).
 *
 * Three properties are load-bearing and each one is a defect if it breaks.
 * A notice that repeats turns a durability warning into a nag, which is the
 * thing ZEN-OF-TORTIE says must never happen. A notice posted before a window
 * exists must survive, because the loudest one of the five fires while the
 * manifest is being opened. And a notice must never be delivered twice, which
 * is the risk any queue plus broadcast pair carries.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DurabilityNotice } from '@shared/notice';

/** Every broadcast this module made, in order. */
const sent: DurabilityNotice[] = [];

vi.mock('../../typed-events', () => ({
  broadcastEvent: (_channel: string, notice: DurabilityNotice) => {
    sent.push(notice);
  }
}));

const {
  hasSaidNotice,
  postDurabilityNotice,
  resetDurabilityNoticesForTests,
  takePendingNotices
} = await import('../index');

const DISK: DurabilityNotice = {
  kind: 'snapshot-failed',
  sessions: 43,
  outOfSpace: true
};
const QUARANTINE: DurabilityNotice = {
  kind: 'manifest-quarantined',
  quarantinePath: '/tmp/manifest.db.damaged-1',
  recoveredAt: 1_700_000_000_000
};

beforeEach(() => {
  sent.length = 0;
  resetDurabilityNoticesForTests();
});

describe('one notice per kind per app run', () => {
  it('says the first one and swallows every repeat of that kind', () => {
    takePendingNotices(); // a renderer is listening
    expect(postDurabilityNotice(DISK)).toBe(true);
    expect(postDurabilityNotice(DISK)).toBe(false);
    expect(postDurabilityNotice({ ...DISK, sessions: 1 })).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it('does not let one kind silence a different one', () => {
    takePendingNotices();
    postDurabilityNotice(DISK);
    expect(postDurabilityNotice(QUARANTINE)).toBe(true);
    expect(sent.map((n) => n.kind)).toEqual([
      'snapshot-failed',
      'manifest-quarantined'
    ]);
  });

  it('reports what it has already said, so a caller can log the rest', () => {
    takePendingNotices();
    expect(hasSaidNotice('depth-degraded')).toBe(false);
    postDurabilityNotice({
      kind: 'depth-degraded',
      actualLines: 2000,
      requestedLines: 25_000
    });
    expect(hasSaidNotice('depth-degraded')).toBe(true);
  });
});

describe('a notice posted before any renderer exists', () => {
  it('is kept and handed over on the first drain', () => {
    expect(postDurabilityNotice(QUARANTINE)).toBe(true);
    // Nothing went out: there was nobody to hear it.
    expect(sent).toHaveLength(0);
    expect(takePendingNotices()).toEqual([QUARANTINE]);
  });

  it('is handed over exactly once — the drain empties the queue', () => {
    postDurabilityNotice(QUARANTINE);
    expect(takePendingNotices()).toHaveLength(1);
    expect(takePendingNotices()).toHaveLength(0);
  });

  it('is never both queued and broadcast', () => {
    postDurabilityNotice(QUARANTINE);
    const drained = takePendingNotices();
    expect(drained).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });

  it('keeps the order they were posted in', () => {
    postDurabilityNotice(QUARANTINE);
    postDurabilityNotice(DISK);
    expect(takePendingNotices().map((n) => n.kind)).toEqual([
      'manifest-quarantined',
      'snapshot-failed'
    ]);
  });
});

describe('after the renderer has drained once', () => {
  it('everything goes straight out and nothing is queued', () => {
    takePendingNotices();
    postDurabilityNotice(DISK);
    expect(sent).toEqual([DISK]);
    expect(takePendingNotices()).toHaveLength(0);
  });
});

describe('the env-unresolved latch is per session, not per kind (Phase 33)', () => {
  const ENV_A: DurabilityNotice = {
    kind: 'env-unresolved',
    sessionId: 'session-a',
    sessionName: 'auth',
    names: ['FIREWORKS_API_KEY'],
    probeFailed: false
  };
  const ENV_B: DurabilityNotice = {
    kind: 'env-unresolved',
    sessionId: 'session-b',
    sessionName: 'billing',
    names: ['FIREWORKS_API_KEY'],
    probeFailed: false
  };

  it('says it once per session and swallows a repeat for that session', () => {
    takePendingNotices();
    expect(postDurabilityNotice(ENV_A)).toBe(true);
    expect(postDurabilityNotice(ENV_A)).toBe(false);
    expect(postDurabilityNotice({ ...ENV_A, probeFailed: true })).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it('a second session is a second fact, and it is said', () => {
    takePendingNotices();
    postDurabilityNotice(ENV_A);
    expect(postDurabilityNotice(ENV_B)).toBe(true);
    expect(sent.map((n) => n.kind)).toEqual(['env-unresolved', 'env-unresolved']);
  });

  it('does not silence other kinds, and other kinds do not silence it', () => {
    takePendingNotices();
    postDurabilityNotice(DISK);
    expect(postDurabilityNotice(ENV_A)).toBe(true);
    expect(postDurabilityNotice(QUARANTINE)).toBe(true);
    expect(sent).toHaveLength(3);
  });

  it('hasSaidNotice answers per session when given the session id', () => {
    takePendingNotices();
    postDurabilityNotice(ENV_A);
    expect(hasSaidNotice('env-unresolved', 'session-a')).toBe(true);
    expect(hasSaidNotice('env-unresolved', 'session-b')).toBe(false);
  });
});
