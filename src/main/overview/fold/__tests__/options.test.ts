/**
 * What Settings offers, and the three way join behind it (Phase 138).
 *
 * A row is offered only when the agent table has it, the Phase 23 confirm gate
 * allows it, and Tortie has a measured recipe for it. This file drives all
 * three, with the table and the gate injected, so no configuration file is
 * read and no keystore is touched.
 */

import { describe, expect, it } from 'vitest';
import type { MergedAgentEntry } from '../../../config/overlay';
import type { ConfigConfirmState, ConfigRowStatus } from '../../../config/confirm';
import { foldOptions, noRecipeSentence, notConfirmedSentence } from '../options';
import { foldRecipeFor } from '../recipes';

function entry(
  id: string,
  source: 'builtin' | 'overlay',
  displayName = id
): MergedAgentEntry {
  return {
    id,
    source,
    displayName,
    launchable: true,
    binaries: [id],
    extraProbeDirs: [],
    resume: { template: [], idCapture: { mode: 'none' } },
    executionHash: null,
    install: null
  } as unknown as MergedAgentEntry;
}

function gate(state: ConfigConfirmState): (id: string) => ConfigRowStatus {
  return (id: string) =>
    ({
      id,
      state,
      hash: 'h',
      confirmedHash: null,
      confirmedAt: null,
      confirmedLines: [],
      lines: [],
      refusal: state === 'confirmed' ? null : 'not confirmed'
    }) as ConfigRowStatus;
}

describe('foldOptions', () => {
  it('offers a compiled claude with the models the recipe exposes', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'builtin', 'Claude Code')],
      status: gate('never')
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(true);
    expect(row?.reason).toBeNull();
    expect(row?.models.map((m) => m.id)).toEqual(
      foldRecipeFor('claude')?.models.map((m) => m.id)
    );
    expect(row?.measuredOn).toBe(foldRecipeFor('claude')?.measuredOn);
    expect(out.suggestedAgentId).toBe('claude');
  });

  it('shows an agent with no measured recipe, disabled, with one sentence', () => {
    const out = foldOptions({
      table: () => [entry('codex', 'builtin', 'Codex')],
      status: gate('confirmed')
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.models).toEqual([]);
    expect(row?.reason).toBe(noRecipeSentence('Codex'));
    expect(out.suggestedAgentId).toBeNull();
  });

  it('refuses a configured row the confirm gate has not confirmed', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'overlay', 'A patched claude')],
      status: gate('changed')
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.reason).toBe(notConfirmedSentence('A patched claude'));
  });

  it('offers a configured row the confirm gate has confirmed', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'overlay', 'A patched claude')],
      status: gate('confirmed')
    });
    expect(out.harnesses[0]?.available).toBe(true);
  });

  it('refuses a configured row while the seal is unknown', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'overlay')],
      status: gate('unknown')
    });
    expect(out.harnesses[0]?.available).toBe(false);
  });

  it('puts the rows that can be picked first', () => {
    const out = foldOptions({
      table: () => [entry('codex', 'builtin'), entry('claude', 'builtin')],
      status: gate('confirmed')
    });
    expect(out.harnesses.map((row) => row.agentId)).toEqual(['claude', 'codex']);
  });

  it('leaves out an agent that cannot be launched at all', () => {
    const notLaunchable = {
      ...entry('claude', 'builtin'),
      launchable: false
    } as MergedAgentEntry;
    const out = foldOptions({
      table: () => [notLaunchable],
      status: gate('confirmed')
    });
    expect(out.harnesses).toEqual([]);
  });

  it('carries the suspension sentence when there is one', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'builtin')],
      status: gate('confirmed'),
      suspended: () => 'Your usage window is close to its limit.'
    });
    expect(out.suspended).toBe('Your usage window is close to its limit.');
  });

  it('says nothing about a suspension when there is none', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'builtin')],
      status: gate('confirmed')
    });
    expect(out.suspended).toBeNull();
  });

  it('names no integer in any sentence it writes', () => {
    const out = foldOptions({
      table: () => [entry('codex', 'builtin', 'Codex'), entry('claude', 'overlay')],
      status: gate('never')
    });
    for (const row of out.harnesses) {
      if (row.reason !== null) expect(row.reason).not.toMatch(/[0-9]/);
    }
  });
});
