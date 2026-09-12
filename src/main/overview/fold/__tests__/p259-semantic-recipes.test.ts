/**
 * The two semantic pass rows, measured or disabled (Phase 259, spec §4.2).
 *
 * recipes.ts's discipline is that a row exists only when somebody ran its
 * flags by hand and wrote the date down. Phase 259 made that MECHANICAL rather
 * than remembered: a draft with no `measuredOn` is filtered out of the live
 * table, so `archSemanticRecipeFor` answers null, the offer joiner draws
 * `not-measured`, and the runner refuses `no-recipe` before anything can
 * spawn. This file is what stops a later round putting a row in the table by
 * typing a date, and what stops it narrowing the two drafts by accident.
 *
 * THE MODEL NAMES ARE NOT GUESSES. `opus` is a name the installed claude CLI
 * accepts, read from its own `--model` help on 2026-09-12; `gpt-6-astra` is the
 * slug the installed codex CLI's compiled model catalogue gives the model whose
 * display name is GPT-6-Astra. An unconfirmed name is REPORTED and never
 * substituted, so a round that cannot find one removes the row.
 */

import { describe, expect, it } from 'vitest';
import { AGENT_REGISTRY } from '../../../agents/registry';
import {
  ARCH_SEMANTIC_SUGGESTED_AGENT_ID,
  SEMANTIC_DRAFTS,
  archSemanticRecipeAgentIds,
  archSemanticRecipeFor
} from '../recipes';
import { archSemanticOptions } from '../options';

const HOME = '/tmp/a-fold-home-that-is-never-made';
const INPUT = { prompt: 'p', model: 'm', systemPrompt: 's', foldHome: HOME };

describe('the two semantic drafts', () => {
  it('writes down exactly claude and codex, which is the operator word of 2026-09-12', () => {
    expect(SEMANTIC_DRAFTS.map((row) => row.agentId)).toEqual(['claude', 'codex']);
  });

  it('suggests the two models that were confirmed from the installed binaries', () => {
    expect(SEMANTIC_DRAFTS.map((row) => row.suggestedModel)).toEqual(['opus', 'gpt-6-astra']);
  });

  it('offers every suggested model on its own row, so a suggestion is always pickable', () => {
    for (const row of SEMANTIC_DRAFTS) {
      expect(row.models.map((model) => model.id)).toContain(row.suggestedModel);
    }
  });

  it('names two agents the registry already has as BUILTIN launchable rows, so refusal 8 forges nothing', () => {
    for (const row of SEMANTIC_DRAFTS) {
      const entry = AGENT_REGISTRY.find((agent) => agent.id === row.agentId);
      expect(entry, `${row.agentId} is not a compiled registry row`).toBeDefined();
      expect(entry?.launchable).toBe(true);
    }
  });

  it('shares the arch and fold containment argv rather than re-spelling it', () => {
    const [claudeRow, codexRow] = SEMANTIC_DRAFTS;
    expect(claudeRow).toBeDefined();
    expect(codexRow).toBeDefined();
    if (claudeRow === undefined || codexRow === undefined) return;
    const claude = claudeRow.argv(INPUT);
    // Every flag in the set is about containment and preamble cost: tools off,
    // no MCP, no slash commands, no session file, no setting sources, the fuse.
    for (const flag of [
      '--tools',
      '--strict-mcp-config',
      '--disable-slash-commands',
      '--no-session-persistence',
      '--setting-sources',
      '--max-budget-usd'
    ]) {
      expect(claude, `the claude semantic argv dropped ${flag}`).toContain(flag);
    }
    const codex = codexRow.argv(INPUT);
    for (const flag of ['--ephemeral', '--ignore-user-config', '--ignore-rules', '-s', '-C']) {
      expect(codex, `the codex semantic argv dropped ${flag}`).toContain(flag);
    }
    expect(codex[codex.indexOf('-s') + 1]).toBe('read-only');
    expect(codex[codex.indexOf('-C') + 1]).toBe(HOME);
  });

  it('puts the instruction on the flag for claude and at the head of the prompt for codex', () => {
    const [claudeRow, codexRow] = SEMANTIC_DRAFTS;
    if (claudeRow === undefined || codexRow === undefined) throw new Error('two drafts');
    expect(claudeRow.systemPromptMode).toBe('flag');
    // codex has no system prompt flag, so `foldPromptFor` prepends it.
    expect(codexRow.systemPromptMode).toBe('prepend');
    expect(codexRow.argv(INPUT)).not.toContain('--system-prompt');
  });

  it('carries a deadline that is the real fuse, longer than a fold and no shorter than the arch pass', () => {
    for (const row of SEMANTIC_DRAFTS) expect(row.timeoutMs).toBeGreaterThanOrEqual(150_000);
  });
});

describe('measured or disabled, and today nothing is measured', () => {
  it('keeps an unmeasured draft out of the live table entirely', () => {
    for (const row of SEMANTIC_DRAFTS) {
      if (row.measuredOn === null) {
        expect(archSemanticRecipeFor(row.agentId)).toBeNull();
      } else {
        expect(archSemanticRecipeFor(row.agentId)?.measuredOn).toBe(row.measuredOn);
      }
    }
  });

  it('answers null for an agent nobody wrote a draft for', () => {
    expect(archSemanticRecipeFor('grok')).toBeNull();
    expect(archSemanticRecipeFor('')).toBeNull();
  });

  it('lists only the rows that carry a measurement date', () => {
    expect(archSemanticRecipeAgentIds()).toEqual(
      SEMANTIC_DRAFTS.filter((row) => row.measuredOn !== null).map((row) => row.agentId)
    );
  });

  it('suggests claude until the measurement says which recipe read better', () => {
    expect(ARCH_SEMANTIC_SUGGESTED_AGENT_ID).toBe('claude');
  });
});

describe('the offer, which is the same join and never a second door', () => {
  const table = () => [
    {
      id: 'claude',
      displayName: 'Claude Code',
      source: 'builtin' as const,
      launchable: true
    },
    {
      id: 'codex',
      displayName: 'Codex',
      source: 'builtin' as const,
      launchable: true
    }
  ];

  it('draws every row with no measured semantic recipe as not-measured and disabled', () => {
    const offer = archSemanticOptions({
      table: table as never,
      status: (() => ({ state: 'confirmed' })) as never
    });
    for (const row of offer.harnesses) {
      const measured = archSemanticRecipeFor(row.agentId) !== null;
      expect(row.available).toBe(measured);
      if (!measured) {
        expect(row.reason).toBe('not-measured');
        expect(row.models).toEqual([]);
        expect(row.measuredOn).toBeNull();
      }
    }
  });

  it('preselects nothing while no row is available, so nothing is applied by default', () => {
    const offer = archSemanticOptions({
      table: table as never,
      status: (() => ({ state: 'confirmed' })) as never
    });
    if (archSemanticRecipeAgentIds().length === 0) {
      expect(offer.suggestedAgentId).toBeNull();
    }
  });
});
