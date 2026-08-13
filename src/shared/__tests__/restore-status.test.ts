/**
 * The rules that decide what a restore is allowed to claim (Phase 19 item 6).
 *
 * These are three small pure functions, and they are tested closely because
 * two surfaces read them and a wrong answer is a wrong sentence in front of
 * the user. There are two ways to be wrong and they are not symmetrical.
 *
 *  - Saying nothing when scrollback was lost is the failure the item exists to
 *    fix.
 *  - Raising an alarm for a plain shell that never had a conversation, or for
 *    a young session with no snapshot yet, would train the user to ignore the
 *    channel. That is the same failure a phase later.
 */

import { describe, expect, it } from 'vitest';
import {
  restoreCameBackWhole,
  restoreLabel,
  restoreShortfall
} from '../restore-status';
import type { SessionRestore } from '../types';

const at = 1;
const r = (over: Partial<SessionRestore> & Pick<SessionRestore, 'kind'>) =>
  ({ at, ...over }) as SessionRestore;

describe('restoreCameBackWhole', () => {
  it('a session that was never restored is not a shortfall', () => {
    // Absent means "has simply been running since it was created", which is
    // the state of nearly every row.
    expect(restoreCameBackWhole(undefined)).toBe(true);
    expect(restoreShortfall(undefined)).toBeNull();
  });

  it('a plain shell with no conversation came back whole', () => {
    expect(restoreCameBackWhole(r({ kind: 'transcript' }))).toBe(true);
    expect(restoreShortfall(r({ kind: 'transcript' }))).toBeNull();
  });

  it('a session with no saved snapshot came back whole', () => {
    expect(restoreCameBackWhole(r({ kind: 'shell_only' }))).toBe(true);
    expect(restoreShortfall(r({ kind: 'shell_only' }))).toBeNull();
  });

  it('an armed restore came back whole', () => {
    expect(restoreCameBackWhole(r({ kind: 'armed' }))).toBe(true);
  });

  it('failed and interrupted are never whole', () => {
    expect(restoreCameBackWhole(r({ kind: 'failed' }))).toBe(false);
    expect(restoreCameBackWhole(r({ kind: 'interrupted' }))).toBe(false);
  });

  it('a failure string on any kind makes it a shortfall', () => {
    expect(restoreCameBackWhole(r({ kind: 'armed', replayFailure: 'x' }))).toBe(
      false
    );
    expect(restoreCameBackWhole(r({ kind: 'transcript', armFailure: 'x' }))).toBe(
      false
    );
  });
});

describe('restoreShortfall — the sentence the user reads', () => {
  it('names the scrollback when only the scrollback was lost', () => {
    expect(restoreShortfall(r({ kind: 'shell_only', replayFailure: 'x' }))).toBe(
      'The folder came back. The saved scrollback did not.'
    );
  });

  it('names the resume when only the resume was lost', () => {
    const s = restoreShortfall(r({ kind: 'transcript', armFailure: 'x' }));
    expect(s).toMatch(/resume command could not be typed/);
  });

  it('names both when both were lost', () => {
    const s = restoreShortfall(
      r({ kind: 'shell_only', replayFailure: 'x', armFailure: 'y' })
    );
    expect(s).toMatch(/scrollback and the resume command/);
  });

  it('an armed restore that lost its scrollback leads with the good news', () => {
    // The conversation is the thing the user cares about most, and it is
    // waiting. Leading with the loss would misreport the balance of it.
    const s = restoreShortfall(r({ kind: 'armed', replayFailure: 'x' }));
    expect(s).toMatch(/^The resume command is waiting\./);
  });

  it('prefers the recorded reason for a failed restore', () => {
    expect(
      restoreShortfall(r({ kind: 'failed', reason: 'That folder is gone.' }))
    ).toBe('That folder is gone.');
  });

  it('has a sentence for a failed restore with no reason recorded', () => {
    expect(restoreShortfall(r({ kind: 'failed' }))).toBe(
      'This session could not be restored.'
    );
  });

  it('says plainly that an interrupted restore is not known', () => {
    expect(restoreShortfall(r({ kind: 'interrupted' }))).toMatch(
      /what came back is not known/
    );
  });

  it('every sentence is one line and ends in a full stop', () => {
    const cases: SessionRestore[] = [
      r({ kind: 'failed' }),
      r({ kind: 'interrupted' }),
      r({ kind: 'shell_only', replayFailure: 'x' }),
      r({ kind: 'shell_only', replayFailure: 'x', armFailure: 'y' }),
      r({ kind: 'transcript', armFailure: 'y' }),
      r({ kind: 'armed', replayFailure: 'x' })
    ];
    for (const c of cases) {
      const s = restoreShortfall(c);
      expect(s).not.toBeNull();
      expect(s).not.toContain('\n');
      expect(s?.endsWith('.')).toBe(true);
    }
  });
});

describe('restoreLabel', () => {
  it('has one for every kind, and none of them says "running"', () => {
    const kinds: SessionRestore['kind'][] = [
      'failed',
      'interrupted',
      'shell_only',
      'transcript',
      'armed'
    ];
    for (const kind of kinds) {
      const label = restoreLabel(r({ kind }));
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/running|working/);
      expect(label.endsWith('.')).toBe(false);
    }
  });

  it('distinguishes the two situations inside a kind', () => {
    expect(restoreLabel(r({ kind: 'transcript' }))).toBe('restored');
    expect(restoreLabel(r({ kind: 'transcript', armFailure: 'x' }))).toBe(
      'restored without its resume command'
    );
    expect(restoreLabel(r({ kind: 'shell_only' }))).toBe(
      'restored, no saved scrollback'
    );
    expect(restoreLabel(r({ kind: 'shell_only', replayFailure: 'x' }))).toBe(
      'restored without its scrollback'
    );
  });
});
