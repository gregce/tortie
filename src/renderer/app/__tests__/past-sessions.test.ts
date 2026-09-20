/**
 * Past Sessions row truth (Phase 29, research 39 §10).
 *
 * The promise line is the reason design B won the adversarial round: the
 * user reads BEFORE the click whether Restore continues the conversation or
 * starts fresh. These tests hold the predicate to the research's two-field
 * rule.
 *
 * Phase 293. This file used to hold two more blocks, over `removedDateLabel`
 * and `filterPastSessions`, which were exports of the Past Sessions modal.
 * That modal is the second tab of the session manager now and both functions
 * went with it: the date is `removedDate` in
 * src/renderer/session-manager/format.ts, whose word moved into the slot's
 * own prefix, and the search is one of the four filters in
 * src/renderer/session-manager/view.ts. Each is pinned beside its new home, in
 * p293-format.test.ts and p293-view.test.ts. The promise predicate did not
 * move, the sheet reads it for every Past row, and so its block stays here.
 */

import { describe, expect, it } from 'vitest';
import { pastSessionPromise } from '../../state/resume';

describe('pastSessionPromise: the before-the-click disclosure', () => {
  it('continues only when BOTH the conversation id and the armed argv exist', () => {
    expect(
      pastSessionPromise({
        agentSessionId: 'uuid-1',
        resumeArgv: ['/usr/local/bin/claude', '--resume', 'uuid-1']
      })
    ).toBe('continues');
  });

  it('an id with no argv starts fresh, nothing exists to type', () => {
    expect(pastSessionPromise({ agentSessionId: 'uuid-1' })).toBe('fresh');
  });

  it('an id with an EMPTY argv starts fresh', () => {
    expect(
      pastSessionPromise({ agentSessionId: 'uuid-1', resumeArgv: [] })
    ).toBe('fresh');
  });

  it('an argv with no id starts fresh, the two-field rule is a conjunction', () => {
    expect(
      pastSessionPromise({ resumeArgv: ['/usr/local/bin/claude'] })
    ).toBe('fresh');
  });

  it('a shell (neither field) starts fresh', () => {
    expect(pastSessionPromise({})).toBe('fresh');
  });
});
