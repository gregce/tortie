/**
 * Phase 108. What the row and group menus build for an entry whose file is on
 * another machine.
 *
 * THE RULE UNDER TEST: an absent verb is one fewer menu item, never a dead
 * one. On a remote tab every item that names a program on this Mac is not
 * built, being Open, Open the script, Reveal in Finder and the jump to a
 * shadowed entry's file, because the row's path is on the other computer and
 * the program here would open the wrong file or nothing. The Copy verbs stay,
 * because copying that machine's path is true and useful.
 *
 * The write verbs are not gated here and that is deliberate: the view passes
 * `{}` as the actions on a remote tab, and an absent action has never built
 * an item. These cases pass `{}` for exactly that reason.
 */

import { describe, expect, it } from 'vitest';
import type { MenuItemSpec } from '../../state/store';
import type { ContextEntry } from '../model';
import type { ContextMenuDeps } from '../menus';
import { groupMenuItems, rowMenuItems } from '../menus';

/** Labels only, with separators kept so the shape is visible. */
function labelsOf(items: readonly (MenuItemSpec | 'sep')[]): string[] {
  return items.map((one) => (one === 'sep' ? 'sep' : one.label));
}

function deps(remote: boolean): ContextMenuDeps & { copied: string[] } {
  const copied: string[] = [];
  return {
    openPath: () => undefined,
    revealPath: () => undefined,
    copyText: (text: string) => {
      copied.push(text);
    },
    revealEntry: () => undefined,
    remote,
    copied
  };
}

/** A skill row on the machine, with a shadowed twin to tempt the jump item. */
const skill = {
  id: 'skill:review:global',
  category: 'skill',
  name: 'review',
  summary: 'Review a diff.',
  scope: 'global',
  sourcePath: '/home/greg/.claude/skills/review/SKILL.md',
  realPath: '/home/greg/.claude/skills/review/SKILL.md',
  agents: ['claude'],
  state: 'shadowing',
  resolution: 'wins',
  shadows: [
    {
      scope: 'project',
      sourcePath: '/home/greg/api/.claude/skills/review/SKILL.md',
      losesFor: ['claude'],
      reason: 'Also defined in this project.'
    }
  ],
  problem: null,
  payload: { kind: 'skill' }
} as unknown as ContextEntry;

/** A broken-free hook whose script resolved, to tempt Open the script. */
const hook = {
  id: 'hook:guard:global',
  category: 'hook',
  name: 'guard',
  summary: 'guard.sh check',
  scope: 'global',
  sourcePath: '/home/greg/.claude/settings.json',
  realPath: '/home/greg/.claude/settings.json',
  agents: ['claude'],
  state: 'active',
  shadows: [],
  problem: null,
  payload: {
    kind: 'hook',
    scriptPath: '/home/greg/.claude/hooks/guard.sh',
    scriptMissing: false
  }
} as unknown as ContextEntry;

const mcp = {
  id: 'mcp:everything:project',
  category: 'mcp',
  name: 'everything',
  summary: 'npx server-everything',
  scope: 'project',
  sourcePath: '/home/greg/api/.mcp.json',
  realPath: '/home/greg/api/.mcp.json',
  agents: ['claude'],
  state: 'active',
  shadows: [],
  problem: null,
  payload: { kind: 'mcp' }
} as unknown as ContextEntry;

describe('the row menu on a remote tab', () => {
  it('builds the copy verbs and nothing that opens or reveals', () => {
    const labels = labelsOf(rowMenuItems(skill, deps(true), {}));
    expect(labels).toEqual(['Copy name', 'Copy path']);
  });

  it('does not open the script of a hook whose script is over there', () => {
    const labels = labelsOf(rowMenuItems(hook, deps(true), {}));
    expect(labels).not.toContain('Open the script');
  });

  it('keeps Copy command for a server, because the command is one string', () => {
    const labels = labelsOf(rowMenuItems(mcp, deps(true), {}));
    expect(labels).toEqual(['Copy name', 'Copy path', 'Copy command']);
  });

  it('never opens with a separator', () => {
    for (const entry of [skill, hook, mcp]) {
      const items = rowMenuItems(entry, deps(true), {});
      expect(items[0]).not.toBe('sep');
    }
  });

  it("copies that machine's own path, byte for byte", () => {
    const d = deps(true);
    const items = rowMenuItems(skill, d, {});
    const copyPath = items.find(
      (one) => one !== 'sep' && one.label === 'Copy path'
    );
    if (copyPath === undefined || copyPath === 'sep') {
      throw new Error('Copy path was not built');
    }
    copyPath.run();
    expect(d.copied).toEqual(['/home/greg/.claude/skills/review/SKILL.md']);
  });
});

describe('the same rows on this Mac, so the gate cannot overshoot', () => {
  it('still leads with Open and still reveals', () => {
    const labels = labelsOf(rowMenuItems(skill, deps(false), {}));
    expect(labels[0]).toBe('Open SKILL.md');
    expect(labels).toContain('Reveal in Finder');
    expect(labels).toContain('Show the entry this beats');
  });

  it('still opens a resolved hook script', () => {
    const labels = labelsOf(rowMenuItems(hook, deps(false), {}));
    expect(labels).toContain('Open the script');
  });
});

describe('the group menu', () => {
  it('is Copy path alone on a remote tab', () => {
    const labels = labelsOf(groupMenuItems([skill], deps(true), 'global'));
    expect(labels).toEqual(['Copy path']);
  });

  it('still opens and reveals on this Mac', () => {
    const labels = labelsOf(groupMenuItems([skill], deps(false), 'global'));
    expect(labels).toEqual([
      'Open the file this group comes from',
      'Reveal in Finder'
    ]);
  });
});
