/**
 * The rules the Context view draws, tested without a DOM.
 *
 * These are the assertions that make research 29's hardest claim executable
 * rather than documented: there are at least seven mutually incompatible
 * precedence models across twelve agents, and TWO OF THEM RUN IN OPPOSITE
 * DIRECTIONS INSIDE ONE PRODUCT. In Claude Code a project `settings.json`
 * beats your personal one, and your personal `~/.claude/skills/deploy` beats
 * the repo's `.claude/skills/deploy`. A panel that drew one scope axis and
 * ordered it once would be wrong about half of what it shows (R4), and this
 * file is what fails when someone "tidies" the two ladders into one.
 */

import { describe, expect, it } from 'vitest';
import type { ContextEntry, ContextScope } from '@shared/context';
import {
  CONTEXT_RESOLUTION,
  CONTEXT_SECTION_CATEGORY,
  CONTEXT_SECTION_IDS,
  countLabel,
  groupEntries,
  matchesAgent,
  matchesFilter,
  scopeOrderFor,
  SCOPE_CHIP_ICON,
  SCOPE_CHIP_WORD,
  sectionCount,
  sectionHint,
  shadowHint
} from '../groups';
import { CONTEXT_SCOPE_LABEL } from '../model';

function entry(over: Partial<ContextEntry> & { name: string }): ContextEntry {
  return {
    id: `${over.category ?? 'skill'}:${over.name}:${over.scope ?? 'global'}`,
    category: 'skill',
    summary: '',
    scope: 'global',
    sourcePath: `/tmp/${over.name}`,
    realPath: `/tmp/${over.name}`,
    agents: ['claude'],
    verdicts: [],
    state: 'active',
    resolution: 'only',
    model: 'broadest-wins',
    evidence: 'verified',
    shadows: [],
    hash: null,
    hashAlgorithm: null,
    executes: null,
    problem: null,
    payload: {
      kind: 'skill',
      description: null,
      license: null,
      compatibility: null,
      allowedTools: [],
      argumentHint: null,
      userInvokable: null,
      disableModelInvocation: null,
      paths: [],
      trigger: '',
      bundles: { scripts: 0, references: 0, assets: 0 },
      declaresHooks: false,
      nameMatchesDirectory: true,
      startupBytes: 0,
      startupTokens: 0,
      lazy: false
    },
    ...over
  } as ContextEntry;
}

const scopesOf = (groups: { scope: ContextScope | null }[]): (ContextScope | null)[] =>
  groups.map((g) => g.scope);

describe('precedence runs in opposite directions in the same view', () => {
  it('puts your own skills ABOVE the project, because they beat it', () => {
    const order = scopeOrderFor('skill');
    expect(order.indexOf('global')).toBeLessThan(order.indexOf('project'));
    expect(order[0]).toBe('managed');
  });

  it('puts an MCP server the project commits BELOW the one only you can see', () => {
    const order = scopeOrderFor('mcp');
    expect(order.indexOf('project-local')).toBeLessThan(order.indexOf('project'));
    expect(order.indexOf('project')).toBeLessThan(order.indexOf('global'));
  });

  it('reads skills and MCP servers in opposite orders, and that is the point', () => {
    const skills = scopeOrderFor('skill');
    const mcp = scopeOrderFor('mcp');
    const skillDirection =
      skills.indexOf('global') < skills.indexOf('project');
    const mcpDirection = mcp.indexOf('global') < mcp.indexOf('project');
    expect(skillDirection).not.toBe(mcpDirection);
  });

  it('groups a real set in the reading order the resolution has', () => {
    const rows = [
      entry({ name: 'deploy', scope: 'project' }),
      entry({ name: 'review', scope: 'global' }),
      entry({ name: 'policy', scope: 'managed' })
    ];
    expect(scopesOf(groupEntries(rows, 'skill', null, ''))).toEqual([
      'managed',
      'global',
      'project'
    ]);
  });
});

describe('the two words, and which categories get which', () => {
  it('says a skill or a server WINS and a hook ALSO RUNS', () => {
    expect(CONTEXT_RESOLUTION.skill).toBe('wins');
    expect(CONTEXT_RESOLUTION.mcp).toBe('wins');
    expect(CONTEXT_RESOLUTION.hook).toBe('all-run');
    expect(CONTEXT_RESOLUTION.instruction).toBe('all-run');
  });

  it('counts hooks as a promise about behaviour, not as an inventory', () => {
    expect(countLabel('hook', 4)).toBe('4 will run');
    expect(countLabel('skill', 33)).toBe('33');
  });

  it('never prints a precedence order for hooks', () => {
    const rows = [
      entry({
        name: 'guard',
        category: 'hook',
        scope: 'project',
        payload: {
          kind: 'hook',
          event: 'PostToolUse',
          matcher: null,
          handlerType: 'command',
          command: 'sh guard.sh',
          commandLeaf: 'guard.sh',
          timeoutSeconds: null,
          statusMessage: null,
          scriptPath: null,
          scriptMissing: false,
          trustedHash: null
        }
      }),
      entry({
        name: 'notify',
        category: 'hook',
        scope: 'global',
        payload: {
          kind: 'hook',
          event: 'PostToolUse',
          matcher: null,
          handlerType: 'command',
          command: 'sh notify.sh',
          commandLeaf: 'notify.sh',
          timeoutSeconds: null,
          statusMessage: null,
          scriptPath: null,
          scriptMissing: false,
          trustedHash: null
        }
      })
    ];
    const groups = groupEntries(rows, 'hook', null, '');
    // ONE group, keyed by the event, holding both scopes. Two scope groups
    // here would say a hook in one file beats a hook in another, which is not
    // what happens: they all merge and they all run.
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('PostToolUse');
    expect(groups[0]?.entries).toHaveLength(2);
    expect(groups[0]?.hint).toContain('no precedence');
  });
});

describe('the count is the resolved set, and bundles are not in it', () => {
  it('leaves vendor bundles out of the header and keeps them in the list', () => {
    const rows = [
      entry({ name: 'mine', scope: 'global' }),
      entry({ name: 'skills-cursor', scope: 'bundled' })
    ];
    expect(sectionCount(rows, 'skill', null)).toBe(1);
    const groups = groupEntries(rows, 'skill', null, '');
    expect(scopesOf(groups)).toEqual(['global', 'bundled']);
    expect(groups[1]?.bundled).toBe(true);
  });

  it('counts only what the chosen agent loads', () => {
    const rows = [
      entry({ name: 'a', agents: ['claude'] }),
      entry({ name: 'b', agents: ['codex'] })
    ];
    expect(sectionCount(rows, 'skill', null)).toBe(2);
    expect(sectionCount(rows, 'skill', 'claude')).toBe(1);
    expect(matchesAgent(rows[0]!, 'codex')).toBe(false);
    expect(matchesAgent(rows[0]!, null)).toBe(true);
  });
});

describe('scope survives narrowing without ever becoming a colour', () => {
  it('gives every scope a group label, a chip word and a chip glyph', () => {
    for (const scope of Object.keys(CONTEXT_SCOPE_LABEL) as ContextScope[]) {
      expect(CONTEXT_SCOPE_LABEL[scope]).not.toBe('');
      expect(SCOPE_CHIP_WORD[scope]).not.toBe('');
      expect(SCOPE_CHIP_ICON[scope]).not.toBe('');
    }
  });

  it('keeps the two project scopes apart, because one of them is not shared', () => {
    expect(CONTEXT_SCOPE_LABEL.project).toBe('This project');
    expect(CONTEXT_SCOPE_LABEL['project-local']).toBe('This project, only you');
  });
});

describe('a shadowed entry always says which way the shadow falls', () => {
  it('prefers the reader’s own sentence', () => {
    const row = entry({
      name: 'deploy',
      scope: 'global',
      shadows: [
        {
          scope: 'project',
          sourcePath: '/repo/.claude/skills/deploy',
          losesFor: ['claude'],
          reason: 'Also defined in this project. The global one wins.'
        }
      ]
    });
    expect(shadowHint(row)).toBe(
      'Also defined in this project. The global one wins.'
    );
  });

  it('writes one itself when the reader did not, naming both ends', () => {
    const row = entry({
      name: 'deploy',
      scope: 'global',
      shadows: [
        {
          scope: 'project',
          sourcePath: '/repo/.claude/skills/deploy',
          losesFor: ['claude'],
          reason: ''
        }
      ]
    });
    const hint = shadowHint(row);
    expect(hint).toContain('in this project');
    expect(hint).toContain('global');
  });

  it('says nothing at all when nothing is shadowed', () => {
    expect(shadowHint(entry({ name: 'solo' }))).toBe('');
  });
});

describe('the filter and the section tooltip', () => {
  it('matches on name and on summary, across sections', () => {
    const row = entry({ name: 'impeccable', summary: 'Use when the user…' });
    expect(matchesFilter(row, 'IMPEC')).toBe(true);
    expect(matchesFilter(row, 'when the user')).toBe(true);
    expect(matchesFilter(row, 'nothing')).toBe(false);
    expect(matchesFilter(row, '   ')).toBe(true);
  });

  it('names the roots it read, and only the ones that were there', () => {
    const hint = sectionHint('skill', [
      { path: '/home/me/.agents/skills', category: 'skill', scope: 'global', exists: true },
      { path: '/home/me/.claude/skills', category: 'skill', scope: 'global', exists: false },
      { path: '/repo/.mcp.json', category: 'mcp', scope: 'project', exists: true }
    ]);
    expect(hint).toContain('/home/me/.agents/skills');
    expect(hint).not.toContain('/home/me/.claude/skills');
    expect(hint).not.toContain('/repo/.mcp.json');
    expect(hint).toContain('wins');
  });

  it('tells a merging section that nothing replaces anything', () => {
    expect(sectionHint('hook', [])).toContain('None of them replaces another');
  });
});

describe('the five sections', () => {
  it('maps every section to exactly one category', () => {
    const categories = CONTEXT_SECTION_IDS.map(
      (id) => CONTEXT_SECTION_CATEGORY[id]
    );
    expect(new Set(categories).size).toBe(CONTEXT_SECTION_IDS.length);
  });
});

describe('grouping and the chip are never both on screen (§5.3)', () => {
  const rows = [
    entry({ name: 'code-review', scope: 'global' }),
    entry({ name: 'deploy', scope: 'project' }),
    entry({ name: 'policy-review', scope: 'managed' })
  ];

  it('groups by scope while resting', () => {
    const groups = groupEntries(rows, 'skill', null, '');
    expect(groups.map((g) => g.label)).toEqual([
      'Managed',
      'All your projects',
      'This project'
    ]);
  });

  it('flattens to one unlabelled run while filtering', () => {
    const groups = groupEntries(rows, 'skill', null, 'e');
    expect(groups).toHaveLength(1);
    // An empty label is what tells the view to draw no group row at all.
    expect(groups[0]?.label).toBe('');
    // Precedence still orders the flat run, so the winner is still read first.
    expect(groups[0]?.entries.map((e) => e.scope)).toEqual([
      'managed',
      'global',
      'project'
    ]);
  });

  it('leaves an event group alone, because an event is not a scope', () => {
    const hook = entry({
      name: 'guard',
      category: 'hook',
      scope: 'project',
      payload: {
        kind: 'hook',
        event: 'Stop',
        matcher: null,
        handlerType: 'command',
        command: 'sh guard.sh',
        commandLeaf: 'guard.sh',
        timeoutSeconds: null,
        statusMessage: null,
        scriptPath: null,
        scriptMissing: false,
        trustedHash: null
      }
    });
    const groups = groupEntries([hook], 'hook', null, 'gua');
    expect(groups[0]?.label).toBe('Stop');
  });
});
