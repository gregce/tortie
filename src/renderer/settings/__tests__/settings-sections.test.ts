/**
 * Phase 87. Diagnostics is last on the Settings rail, and a test holds it
 * there.
 *
 * The house rule for a new Settings section is to append it. Phase 15, Phase
 * 35, Phase 62 and Phase 68 each appended, and each wrote in its own comment
 * that it was last. That is why Diagnostics ended up in the middle. Phase 87
 * moved Diagnostics to the end because it is the section a person opens when
 * something is wrong rather than when they are setting something up.
 *
 * Nothing but a test keeps it there. The next appended section would silently
 * take the last place, and nobody would notice until the rail was read. So the
 * order is written down here.
 *
 * The vitest environment is node. This file imports the real array from
 * SettingsApp.tsx rather than keeping a copy of it, so a reorder in the module
 * is a failure here.
 */

import { describe, expect, it } from 'vitest';
import { SECTIONS } from '../SettingsApp';

const ids = SECTIONS.map((s) => s.id);

describe('the Settings rail', () => {
  it('ends with Diagnostics', () => {
    expect(ids[ids.length - 1]).toBe('diagnostics');
  });

  it('carries Diagnostics exactly once', () => {
    expect(ids.filter((id) => id === 'diagnostics')).toHaveLength(1);
  });

  // Phase 181.1. The Usage page is gone and the meters moved into Agents. A
  // rail row that came back would be a second door to one group.
  it('has no Usage page', () => {
    expect(ids).not.toContain('usage');
  });

  it('draws the ten sections in this order', () => {
    // A new section is appended BEFORE diagnostics. Change this list in the
    // same commit that changes the rail, and keep diagnostics last.
    expect(ids).toEqual([
      'general',
      'agents',
      'keyboard',
      'launch-defaults',
      'specstory',
      'appearance',
      'machines',
      // Phase 138 appended this one before diagnostics.
      'project-line',
      // Phase 158 appended this one before diagnostics.
      'arch',
      // Phase 181 appended a `usage` section here. Phase 181.1 removed it the
      // next day: the meters are a group inside Agents now, and no rail row,
      // menu row or chord names a Usage page any more.
      'diagnostics'
    ]);
  });
});
