/**
 * The substrate matrix, made executable.
 *
 * Research 29 §2.9 counted seven mutually incompatible precedence models across
 * twelve agents, and the panel used to draw ONE of them for all of them. The
 * order and the sentence now come from `precedenceReadoutFor`, so this file is
 * the check that the table itself still says what the research measured. It is
 * also what `npm run conformance:context` prints, so the matrix is a gate rather
 * than a document.
 *
 * The two facts that matter most are asserted by name.
 *  - Claude Code's skills go global before project, and its MCP servers go the
 *    other way. Two ladders in opposite directions inside one product.
 *  - Gemini's skills go project before global, which is the opposite of Claude
 *    Code's, and the sentence the panel shows has to invert with it.
 */

import { describe, expect, it } from 'vitest';
import type { AgentRegistryId } from '@shared/types';
import {
  CONTEXT_AGENT_IDS,
  precedenceReadoutFor,
  scopeOrderFor
} from '../agent-context';

describe('the skills ladder, per agent', () => {
  it('sends Claude Code global before project', () => {
    const skill = precedenceReadoutFor('claude', 'skill');
    expect(skill.model).toBe('broadest-wins');
    expect(skill.scopeOrder.indexOf('global')).toBeLessThan(
      skill.scopeOrder.indexOf('project')
    );
  });

  it('sends Gemini project before global, which is the inversion', () => {
    const skill = precedenceReadoutFor('gemini', 'skill');
    expect(skill.model).toBe('narrowest-wins');
    expect(skill.scopeOrder.indexOf('project')).toBeLessThan(
      skill.scopeOrder.indexOf('global')
    );
  });

  it('draws Claude Code and Gemini in opposite orders', () => {
    expect(scopeOrderFor('claude', 'skill')).not.toEqual(
      scopeOrderFor('gemini', 'skill')
    );
  });

  it('names no winner for Codex, which keeps both copies', () => {
    expect(precedenceReadoutFor('codex', 'skill').model).toBe('no-override');
  });

  it('names no winner for Cursor, whose rule was never established', () => {
    expect(precedenceReadoutFor('cursor', 'skill').model).toBe('unknown');
  });
});

describe('the two directions inside Claude Code', () => {
  it('resolves skills broadest-first and MCP servers narrowest-first', () => {
    const skill = precedenceReadoutFor('claude', 'skill');
    const mcp = precedenceReadoutFor('claude', 'mcp');
    expect(skill.scopeOrder.indexOf('global')).toBeLessThan(
      skill.scopeOrder.indexOf('project')
    );
    expect(mcp.scopeOrder.indexOf('project')).toBeLessThan(
      mcp.scopeOrder.indexOf('global')
    );
  });
});

describe('every agent that declares skills', () => {
  it('carries a model and a non-empty order, or declares nothing at all', () => {
    for (const agent of CONTEXT_AGENT_IDS as readonly AgentRegistryId[]) {
      const readout = precedenceReadoutFor(agent, 'skill');
      // An agent with no skill locations has nothing to order. An agent with
      // locations must have an order, because that order is what the panel
      // draws its groups in.
      if (scopeOrderFor(agent, 'skill').length === 0) continue;
      expect(readout.note.length).toBeGreaterThan(0);
      expect(readout.scopeOrder.length).toBeGreaterThan(0);
    }
  });

  it('never puts a bundled scope in a precedence order', () => {
    for (const agent of CONTEXT_AGENT_IDS as readonly AgentRegistryId[]) {
      for (const category of ['skill', 'mcp', 'hook', 'plugin', 'instruction'] as const) {
        expect(scopeOrderFor(agent, category)).not.toContain('bundled');
      }
    }
  });
});
