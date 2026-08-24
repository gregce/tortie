/**
 * The recipe table, and the six rows that are not in it (Phase 138.1).
 *
 * The operator asked for every harness to be able to write the project line.
 * Five of the eleven launchable agents can. This file is what stops a later
 * round widening that number without measuring anything, and what stops it
 * narrowing by accident either.
 *
 * THE RULE THE PHASE SET, and it is the honest one. An agent Phase 138.1
 * could not authenticate and measure keeps a disabled row. A guessed recipe
 * that fails the first time a person picks it is worse than a row that admits
 * the truth. The reasons are written out in ../recipes.ts, beside the table.
 */

import { describe, expect, it } from 'vitest';
import { AGENT_REGISTRY } from '../../../agents/registry';
import { foldRecipeAgentIds, foldRecipeFor, recipeHasModel } from '../recipes';

const HOME = '/tmp/a-fold-home-that-is-never-made';
const INPUT = { prompt: 'p', model: 'm', systemPrompt: 's', foldHome: HOME };

describe('the five measured rows', () => {
  it('names the agents in the order the operator uses them', () => {
    expect(foldRecipeAgentIds()).toEqual([
      'claude',
      'codex',
      'cursor',
      'grok',
      'pi'
    ]);
  });

  it('drives a real registry agent, never an id nothing answers to', () => {
    const launchable = new Set<string>(
      AGENT_REGISTRY.filter((entry) => entry.launchable).map((entry) => entry.id)
    );
    for (const id of foldRecipeAgentIds()) {
      expect(launchable.has(id), id).toBe(true);
    }
  });

  it('resolves the binary the registry says that agent has', () => {
    for (const id of foldRecipeAgentIds()) {
      const recipe = foldRecipeFor(id)!;
      const entry = AGENT_REGISTRY.find((row) => row.id === id)!;
      const binary = recipe.binaryName ?? recipe.agentId;
      expect(entry.binaries, id).toContain(binary);
    }
  });

  it('measures every row on a date, so a flag set is dated rather than assumed', () => {
    for (const id of foldRecipeAgentIds()) {
      expect(foldRecipeFor(id)!.measuredOn, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('offers at least one model and suggests one of them', () => {
    for (const id of foldRecipeAgentIds()) {
      const recipe = foldRecipeFor(id)!;
      expect(recipe.models.length, id).toBeGreaterThan(0);
      expect(recipeHasModel(recipe, recipe.suggestedModel), id).toBe(true);
      expect(recipeHasModel(recipe, 'a model nobody ships'), id).toBe(false);
    }
  });

  it('asks for a structured answer rather than reading loose text', () => {
    // Every row names a machine readable output mode, which is what lets the
    // reader take the sentence rather than guess where it starts.
    const modes: Record<string, string> = {
      claude: 'stream-json',
      codex: '--json',
      cursor: 'json',
      grok: 'json',
      pi: 'json'
    };
    for (const id of foldRecipeAgentIds()) {
      expect(foldRecipeFor(id)!.argv(INPUT), id).toContain(modes[id]);
    }
  });
});

describe('the flags that decide what a fold costs', () => {
  it('turns thinking down on every row that has a way to', () => {
    // Phase 138 measured that this one property took a claude fold from
    // $0.012217 to $0.002882. codex and grok both refuse the setting below
    // low, and each one says so in its own error, which is why their floors
    // are low rather than off. muse's floor under the meta provider is
    // minimal, and muse is a disabled row for other reasons.
    const claude = foldRecipeFor('claude')!;
    expect(claude.env({ foldHome: HOME })['MAX_THINKING_TOKENS']).toBe('0');
    expect(foldRecipeFor('codex')!.argv(INPUT)).toContain(
      'model_reasoning_effort="low"'
    );
    expect(foldRecipeFor('grok')!.argv(INPUT)).toContain('--reasoning-effort');
    expect(foldRecipeFor('grok')!.argv(INPUT)).toContain('low');
    expect(foldRecipeFor('pi')!.argv(INPUT)).toContain('--thinking');
    expect(foldRecipeFor('pi')!.argv(INPUT)).toContain('off');
  });

  it('keeps the person own configuration out of every fold', () => {
    // A fold that loaded a person's own config would answer a one sentence
    // question at whatever model and effort they left their CLI on. His codex
    // config reads gpt-5.6-sol at high effort.
    expect(foldRecipeFor('codex')!.argv(INPUT)).toContain('--ignore-user-config');
    expect(foldRecipeFor('codex')!.argv(INPUT)).toContain('--ignore-rules');
    expect(foldRecipeFor('pi')!.argv(INPUT)).toContain('--no-context-files');
    expect(foldRecipeFor('pi')!.argv(INPUT)).toContain('--no-skills');
    expect(foldRecipeFor('claude')!.argv(INPUT)).toContain('--setting-sources');
  });

  it('never lets a fold write into a person own configuration', () => {
    // MEASURED, and it is why cursor is a row at all. One run with --model
    // rewrote the person's own ~/.cursor/cli-config.json and moved the model
    // his interactive cursor-agent starts on. This variable is what stops it.
    expect(foldRecipeFor('cursor')!.env({ foldHome: HOME })).toEqual({
      CURSOR_CONFIG_DIR: HOME
    });
  });

  it('never reaches for the grok system prompt flag, which cost more', () => {
    // MEASURED: --system-prompt-override raised one fold from $0.00543116 to
    // $0.00631108, because it replaced the prompt the server had cached.
    const argv = foldRecipeFor('grok')!.argv(INPUT);
    expect(argv).not.toContain('--system-prompt-override');
    expect(argv).not.toContain('--system-prompt');
    expect(foldRecipeFor('grok')!.systemPromptMode).toBe('prepend');
  });
});

describe('the six rows that are absent, and they stay absent', () => {
  const ABSENT = ['gemini', 'qwen', 'muse', 'antigravity', 'deepseek', 'droid'];

  it('has no recipe for an agent nobody measured', () => {
    for (const id of ABSENT) {
      expect(foldRecipeFor(id), id).toBeNull();
    }
  });

  it('leaves no launchable agent unaccounted for', () => {
    const launchable = AGENT_REGISTRY.filter(
      (entry) => entry.launchable && entry.kind === 'cli'
    ).map((entry) => entry.id);
    const known = new Set([...foldRecipeAgentIds(), ...ABSENT]);
    for (const id of launchable) {
      expect(known.has(id), `${id} is neither measured nor named as absent`).toBe(
        true
      );
    }
  });
});
