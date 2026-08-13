/**
 * Naming disagreements, handled by ownership (Phase 26.2).
 *
 * A skill whose frontmatter name and folder disagree used to produce one red
 * sentence everywhere. The operator decided severity and placement follow
 * ownership, and these tests pin both halves of that decision.
 *
 *  - The consequence sentence is composed from the resolver's verdicts. The
 *    agents in it are real agents from the data, never a hardcoded pair.
 *  - A vendor-owned mismatch takes no problem at all: no section row, no
 *    broken state. It becomes one quiet note on the payload.
 *  - A user-owned mismatch stays a problem and gains the guided fix and the
 *    folder for the Open Folder affordance. Tortie states the fix and never
 *    applies it.
 */

import { describe, expect, it } from 'vitest';
import { namingConsequence } from '../resolve';
import { scanContext } from '../scan';
import { createMemoryContextFs } from '../port';

const HOME = '/home/t';
const ENV = { HOME } as Record<string, string>;

function skill(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\nBody of ${name}.\n`;
}

describe('the consequence sentence', () => {
  const naming = { declared: 'antigravity-guide', folder: 'antigravity_guide' };

  it('pairs each agent with the folder it reaches the skill through', () => {
    const sentence = namingConsequence(
      [
        { agent: 'claude', viaPath: '/h/.claude/skills/antigravity_guide/SKILL.md' },
        { agent: 'gemini', viaPath: '/h/.gemini/skills/antigravity-guide/SKILL.md' }
      ],
      naming,
      false
    );
    expect(sentence).toBe(
      'claude will call this antigravity_guide, gemini will call it antigravity-guide.'
    );
  });

  it('names agents together when they agree on a folder', () => {
    const sentence = namingConsequence(
      [
        { agent: 'claude', viaPath: '/h/.claude/skills/antigravity_guide/SKILL.md' },
        { agent: 'codex', viaPath: '/h/.codex/skills/antigravity_guide/SKILL.md' }
      ],
      naming,
      false
    );
    expect(sentence).toBe('claude and codex will call this antigravity_guide.');
  });

  it('adds the file claim when no agent sees the declared name', () => {
    const sentence = namingConsequence(
      [{ agent: 'antigravity', viaPath: '/h/x/skills/antigravity_guide/SKILL.md' }],
      naming,
      true
    );
    expect(sentence).toBe(
      'antigravity will call this antigravity_guide, and the file names it antigravity-guide.'
    );
  });

  it('drops the file claim when the caller already named both', () => {
    const sentence = namingConsequence(
      [{ agent: 'claude', viaPath: '/h/.claude/skills/antigravity_guide/SKILL.md' }],
      naming,
      false
    );
    expect(sentence).toBe('claude will call this antigravity_guide.');
  });
});

describe('a vendor-owned mismatch', () => {
  it('takes no problem, and becomes one quiet note naming the owner', async () => {
    const dir = `${HOME}/.gemini/antigravity-cli/builtin/skills/antigravity_guide`;
    const result = await scanContext(
      { cwd: null, agent: 'antigravity', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${dir}/SKILL.md`]: skill('antigravity-guide', 'The vendor guide')
          }
        })
      }
    );
    const entry = result.entries.find((row) => row.sourcePath === `${dir}/SKILL.md`);
    expect(entry).toBeDefined();
    expect(entry?.scope).toBe('bundled');
    // No error anywhere: no problem on the row, no broken state, no section row.
    expect(entry?.problem).toBeNull();
    expect(entry?.state).not.toBe('broken');
    expect(result.problems.filter((p) => p.path.startsWith(dir))).toHaveLength(0);
    // The quiet note carries the consequence and names the owner by its
    // display name, which the registry spells "Antigravity CLI".
    const payload = entry?.payload;
    expect(payload?.kind).toBe('skill');
    if (payload?.kind !== 'skill') return;
    expect(payload.namingNote).toBe(
      'antigravity will call this antigravity_guide, and the file names it antigravity-guide. ' +
        "This inconsistency is inside Antigravity CLI's own installation. " +
        'Tortie will not edit vendor files.'
    );
  });
});

describe('a user-owned mismatch', () => {
  it('stays a problem, gains the consequence, both fixes and the folder', async () => {
    const dir = `${HOME}/.claude/skills/gov_style`;
    const result = await scanContext(
      { cwd: null, agent: 'claude', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: { [`${dir}/SKILL.md`]: skill('gov-style', 'Write plainly') }
        })
      }
    );
    const entry = result.entries.find((row) => row.sourcePath === `${dir}/SKILL.md`);
    expect(entry).toBeDefined();
    expect(entry?.state).toBe('broken');
    expect(entry?.problem?.message).toBe(
      'This skill is named gov-style but its folder is gov_style. ' +
        'claude will call this gov_style.'
    );
    expect(entry?.problem?.fix).toBe(
      'Rename the folder to gov-style, or edit the name in SKILL.md to gov_style.'
    );
    expect(entry?.problem?.revealDir).toBe(dir);
    // The section list carries the same finished problem, exactly once.
    const listed = result.problems.filter((p) => p.path === `${dir}/SKILL.md`);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.message).toBe(entry?.problem?.message);
    // The quiet note is the vendor shape, and a user-owned row never has one.
    expect(entry?.payload.kind === 'skill' && entry.payload.namingNote).toBeFalsy();
  });

  it('a matching skill produces neither a problem nor a note', async () => {
    const dir = `${HOME}/.claude/skills/gov-style`;
    const result = await scanContext(
      { cwd: null, agent: 'claude', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: { [`${dir}/SKILL.md`]: skill('gov-style', 'Write plainly') }
        })
      }
    );
    const entry = result.entries.find((row) => row.sourcePath === `${dir}/SKILL.md`);
    expect(entry?.problem).toBeNull();
    expect(result.problems).toHaveLength(0);
    expect(entry?.payload.kind === 'skill' && entry.payload.namingNote).toBeFalsy();
  });
});
