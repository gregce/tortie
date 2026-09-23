/**
 * The map main keeps beside the `activity:changed` broadcast (Phase 316).
 *
 * Each case here is the clause it would catch if removed: an absent field
 * that erased the last news, an explicit clear that was dropped instead of
 * kept, an update that edited an entry a reader holds, and a map that grew
 * without bound.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import { ACTIVITY_NOW_MAX, noteActivityNow, type ActivityNow } from '../activity-now';

const CHOICE: SessionChoiceInfo = {
  atChoice: true,
  options: [
    { marker: '1', text: 'Yes' },
    { marker: '2', text: 'No' }
  ]
};

describe('noteActivityNow', () => {
  it('merges news field by field, and an absent field changes nothing', () => {
    const map = new Map<string, ActivityNow>();
    noteActivityNow(map, [{ sessionId: 'a', question: 'May I?', lastActivityAt: 10 }]);
    noteActivityNow(map, [{ sessionId: 'a', choice: CHOICE }]);
    noteActivityNow(map, [{ sessionId: 'a', lastActivityAt: 20 }]);
    expect(map.get('a')).toEqual({ question: 'May I?', choice: CHOICE, lastActivityAt: 20 });
  });

  it('keeps the feed’s explicit clears as clears', () => {
    const map = new Map<string, ActivityNow>();
    noteActivityNow(map, [{ sessionId: 'a', question: 'May I?', choice: CHOICE }]);
    noteActivityNow(map, [{ sessionId: 'a', question: '', choice: { atChoice: false } }]);
    expect(map.get('a')).toEqual({ question: '', choice: { atChoice: false } });
  });

  it('writes nothing for an update that carries none of the three', () => {
    const map = new Map<string, ActivityNow>();
    noteActivityNow(map, [{ sessionId: 'a' }, { sessionId: 'b', lastActivityAt: Number.NaN }]);
    expect(map.size).toBe(0);
  });

  it('replaces an entry rather than editing it, so a reader holding one is never changed', () => {
    const map = new Map<string, ActivityNow>();
    noteActivityNow(map, [{ sessionId: 'a', question: 'first' }]);
    const held = map.get('a');
    noteActivityNow(map, [{ sessionId: 'a', question: 'second' }]);
    expect(held).toEqual({ question: 'first' });
    expect(map.get('a')).toEqual({ question: 'second' });
  });

  it('is bounded, dropping the session updated longest ago', () => {
    const map = new Map<string, ActivityNow>();
    for (let i = 0; i < ACTIVITY_NOW_MAX; i += 1) {
      noteActivityNow(map, [{ sessionId: `s${i}`, lastActivityAt: i }]);
    }
    // Touch the oldest, so it is no longer the oldest.
    noteActivityNow(map, [{ sessionId: 's0', lastActivityAt: 1 }]);
    noteActivityNow(map, [{ sessionId: 'new', lastActivityAt: 1 }]);
    expect(map.size).toBe(ACTIVITY_NOW_MAX);
    expect(map.has('s0')).toBe(true);
    expect(map.has('s1')).toBe(false);
    expect(map.has('new')).toBe(true);
  });
});

/**
 * The map is only as current as its one writer. `GmuxCore` is too heavy to
 * build here, so the wiring is read as source, the way p125-core-split.test.ts
 * reads the class: the monitor's `onActivity` writes the map FROM THE SAME
 * UPDATES, BEFORE the one broadcast, and nothing else writes it.
 */
describe('the one writer, beside the broadcast', () => {
  const core = readFileSync(join(__dirname, '..', 'core.ts'), 'utf8');

  it('writes the map from the updates the renderer is sent, just before they are sent', () => {
    expect(core).toMatch(
      /onActivity: \(updates\) => \{[^}]*noteActivityNow\(this\.activityNow, updates\);\s*broadcast\(EVT_ACTIVITY_CHANGED, updates\);/
    );
  });

  it('writes it nowhere else, and reads it only through activityOf', () => {
    expect(core.match(/noteActivityNow\(/g)).toHaveLength(1);
    expect(core.match(/this\.activityNow\b/g)).toHaveLength(2);
    expect(core).toMatch(/activityOf\(sessionId: string\): ActivityNow \| undefined \{\s*return this\.activityNow\.get\(sessionId\);/);
  });
});
