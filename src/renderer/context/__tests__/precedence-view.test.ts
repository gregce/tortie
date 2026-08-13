/**
 * The panel resolves per agent, so it explains per agent.
 *
 * This is the regression test for the defect a Phase 22 verifier measured on
 * screen. With the selector pinned to gemini, codex and cursor in turn, the
 * skills section drew the same first group with the same tooltip every time,
 * and that tooltip was Claude Code's rule:
 *
 *   "Your own skills. One of these beats a skill of the same name that this
 *    project commits."
 *
 * For gemini it was false, and the row directly under it was the counterexample:
 * the project copy correctly won. For codex it was false because codex keeps
 * both. For cursor it was false because Tortie's own registry says the rule is
 * unknown.
 *
 * The fixtures below carry the four agents' real answers as main now derives
 * them from the substrate table, and every assertion is about the words the
 * user reads rather than about an internal value.
 */

import { describe, expect, it } from 'vitest';
import type { ContextAgentReadout } from '../model';
import {
  precedenceView,
  resolutionSentence,
  scopeGroupHint,
  scopeOrderFor
} from '../groups';

function readout(
  agent: string,
  displayName: string,
  skill: ContextAgentReadout['precedence']['skill']
): ContextAgentReadout {
  return {
    agent: agent as ContextAgentReadout['agent'],
    displayName,
    skillsCliName: null,
    supported: ['skill'],
    unknown: [],
    roots: [],
    reload: {},
    precedence: { skill }
  };
}

const CLAUDE = readout('claude', 'Claude Code', {
  model: 'broadest-wins',
  evidence: 'verified',
  note: 'Enterprise beats personal, and personal beats project.',
  scopeOrder: ['managed', 'global', 'project', 'plugin']
});

const GEMINI = readout('gemini', 'Gemini CLI', {
  model: 'narrowest-wins',
  evidence: 'verified',
  note: 'The project beats your home folder. This is the opposite of Claude Code.',
  scopeOrder: ['project', 'global']
});

const CODEX = readout('codex', 'Codex CLI', {
  model: 'no-override',
  evidence: 'verified',
  note: 'Codex does not merge two skills that share a name. Both stay available and you pick.',
  scopeOrder: ['project', 'global']
});

const CURSOR = readout('cursor', 'Cursor CLI', {
  model: 'unknown',
  evidence: 'unverified',
  note: 'Cursor reads six skill directories and Tortie has not established which one it prefers.',
  scopeOrder: ['project', 'global']
});

const ALL = [CLAUDE, GEMINI, CODEX, CURSOR];

describe('the drawn order follows the selected agent', () => {
  it('puts global first for Claude Code and project first for Gemini', () => {
    const claude = scopeOrderFor('skill', precedenceView(ALL, 'skill', 'claude'));
    const gemini = scopeOrderFor('skill', precedenceView(ALL, 'skill', 'gemini'));
    expect(claude.indexOf('global')).toBeLessThan(claude.indexOf('project'));
    expect(gemini.indexOf('project')).toBeLessThan(gemini.indexOf('global'));
  });
});

describe('the group tooltip states the selected agent rule', () => {
  it('tells a Claude Code reader that a personal skill beats the project one', () => {
    const view = precedenceView(ALL, 'skill', 'claude');
    expect(scopeGroupHint('skill', 'project', view)).toContain(
      'A personal skill of the same name beats one here.'
    );
  });

  it('tells a Gemini reader the opposite, on the same group', () => {
    const view = precedenceView(ALL, 'skill', 'gemini');
    const hint = scopeGroupHint('skill', 'project', view);
    expect(hint).toContain('beats a skill of the same name anywhere else');
    expect(hint).not.toContain('A personal skill of the same name beats one here.');
  });

  it('tells a Gemini reader that the project copy beats the personal one', () => {
    const view = precedenceView(ALL, 'skill', 'gemini');
    expect(scopeGroupHint('skill', 'global', view)).toContain(
      'A project skill of the same name beats one here.'
    );
  });

  it('never claims a winner for Codex', () => {
    const view = precedenceView(ALL, 'skill', 'codex');
    for (const scope of ['project', 'global'] as const) {
      const hint = scopeGroupHint('skill', scope, view);
      expect(hint).toContain('Both stay, and you pick.');
      expect(hint).not.toContain('beats');
    }
  });

  it('never claims a winner for Cursor, whose rule is unknown', () => {
    const view = precedenceView(ALL, 'skill', 'cursor');
    const hint = scopeGroupHint('skill', 'project', view);
    expect(hint).toContain('Tortie has not established');
    expect(hint).not.toContain('beats');
  });

  it('gives each of the four agents a different sentence for the same group', () => {
    const sentences = new Set(
      ['claude', 'gemini', 'codex', 'cursor'].map((agent) =>
        scopeGroupHint('skill', 'project', precedenceView(ALL, 'skill', agent))
      )
    );
    expect(sentences.size).toBe(4);
  });
});

describe('the section header sentence', () => {
  it('says one wins only where one does', () => {
    expect(
      resolutionSentence('skill', precedenceView(ALL, 'skill', 'claude'))
    ).toBe('One of these wins when two share a name. The list shows the winner.');
  });

  it('says both stay for Codex', () => {
    expect(
      resolutionSentence('skill', precedenceView(ALL, 'skill', 'codex'))
    ).toContain('Nothing is replaced, and you pick.');
  });

  it('admits it does not know for Cursor', () => {
    expect(
      resolutionSentence('skill', precedenceView(ALL, 'skill', 'cursor'))
    ).toContain('Tortie has not established');
  });
});

describe('all agents, when they disagree', () => {
  const view = precedenceView(ALL, 'skill', null);

  it('names no model rather than picking one', () => {
    expect(view.model).toBeNull();
    expect(view.disagree).toBe(true);
  });

  it('says the agents disagree instead of stating one agent rule', () => {
    expect(resolutionSentence('skill', view)).toContain(
      'Your agents do not agree'
    );
    expect(scopeGroupHint('skill', 'project', view)).toContain(
      'Your agents do not agree'
    );
  });

  it('still draws every scope that has rows', () => {
    expect(view.scopeOrder).toContain('project');
    expect(view.scopeOrder).toContain('global');
  });
});

describe('agents that agree', () => {
  const view = precedenceView([CODEX, CURSOR], 'skill', null);

  it('does not report disagreement over the order when the orders match', () => {
    // Same order, different model, so this IS a disagreement and must say so.
    expect(view.disagree).toBe(true);
  });

  it('reports agreement when both model and order match', () => {
    const twin = readout('qwen', 'Qwen Code', {
      model: 'no-override',
      evidence: 'verified',
      note: 'Same rule as Codex.',
      scopeOrder: ['project', 'global']
    });
    const agreed = precedenceView([CODEX, twin], 'skill', null);
    expect(agreed.disagree).toBe(false);
    expect(agreed.model).toBe('no-override');
    // Two agents agree on the rule and each wrote its own sentence about its
    // own product, so neither sentence is put on the other agent's rows.
    expect(agreed.note).toBeNull();
  });
});

describe('a scan with no per-agent precedence', () => {
  it('claims nothing about who wins rather than falling back to Claude Code', () => {
    const bare: ContextAgentReadout = {
      ...CLAUDE,
      precedence: {}
    };
    const view = precedenceView([bare], 'skill', null);
    expect(view.model).toBeNull();
    expect(resolutionSentence('skill', view)).toContain(
      'Tortie has not established'
    );
  });
});
