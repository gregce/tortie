/**
 * The seams the integrator closed, asserted rather than described.
 *
 * Every case here is about TWO modules agreeing. A unit test inside either one
 * of them passes whatever the other does, which is exactly how a parallel build
 * ends up with a panel and a CLI pointing at different directories.
 */

import { describe, expect, it } from 'vitest';
import { CONTEXT_CATEGORIES } from '@shared/context';
import { CONTEXT_CATEGORIES as SNAPSHOT_CATEGORIES } from '@shared/context-snapshot';
import type { AgentRegistryId } from '@shared/types';
import { SKILLS_CLI_AGENTS, isKnownSkillsAgent } from '../../skills/commands';
import { CONTEXT_AGENT_IDS, skillsCliNameFor, skillsCliTargets } from '../agent-context';

const EVERY_REGISTRY_ID: readonly AgentRegistryId[] = [
  'claude',
  'cursor',
  'codex',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse',
  'qwen',
  'pi',
  'cursoride',
  'copilotide'
];

describe('one declaration of the category union', () => {
  it('is the same array object, not a copy that happens to match', () => {
    // Referential, deliberately. A value test would pass on the day somebody
    // re-declares the union in the other file with the same five members, which
    // is the state this check exists to make impossible.
    expect(CONTEXT_CATEGORIES).toBe(SNAPSHOT_CATEGORIES);
  });
});

describe('the skills CLI agent names', () => {
  it('maps every Tortie agent to a name the CLI accepts, or to null', () => {
    for (const agent of EVERY_REGISTRY_ID) {
      const name = skillsCliNameFor(agent);
      if (name === null) continue;
      expect(
        isKnownSkillsAgent(name),
        `${agent} maps to ${name}, which the pinned CLI does not list`
      ).toBe(true);
    }
  });

  it('does not pass a Tortie id through as if it were a CLI name', () => {
    // The three that actually differ. `claude` is the one that bites first: the
    // CLI rejects it outright and the command exits 1.
    expect(skillsCliNameFor('claude')).toBe('claude-code');
    expect(skillsCliNameFor('gemini')).toBe('gemini-cli');
    expect(skillsCliNameFor('qwen')).toBe('qwen-code');
    expect(SKILLS_CLI_AGENTS).not.toContain('claude');
  });

  it('drops an agent with no CLI name rather than guessing one', () => {
    expect(skillsCliTargets(['claude', 'deepseek', 'muse'])).toEqual(['claude-code']);
  });

  it('de-duplicates, so a repeated agent cannot become two targets', () => {
    // It matters because the CLI switches from a symlink to a full copy when an
    // add has exactly one target, so the LENGTH of this list changes behaviour.
    expect(skillsCliTargets(['claude', 'claude'])).toEqual(['claude-code']);
  });

  it('gives every agent that has configuration roots a name or an explicit null', () => {
    for (const agent of CONTEXT_AGENT_IDS) {
      const name = skillsCliNameFor(agent);
      expect(name === null || name.length > 0).toBe(true);
    }
  });
});
