/**
 * What Settings offers for the arch enrichment, and the three way join
 * behind that offer (Phase 158).
 *
 * The join is the SAME function the fold uses, run over the arch recipe
 * table, so most of what could go wrong is already held by options.test.ts.
 * What this file holds is the part Phase 158 adds: the arch offer answers
 * from the ARCH recipe lookup and never from the fold's, an unconfirmed
 * configured row is refused, and a measured fold row buys an agent nothing
 * on this surface. The table, the gate and the recipe lookup are injected,
 * so no configuration file is read and no keystore is touched.
 */

import { describe, expect, it } from 'vitest';
import type { MergedAgentEntry } from '../../../config/overlay';
import type {
  ConfigConfirmState,
  ConfigRowStatus
} from '../../../config/confirm';
import { archOptions, foldOptions } from '../options';
import type { FoldRecipe } from '../recipes';

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

/** A hand built arch recipe table: claude measured, everything else not. */
function archTable(agentId: string): FoldRecipe | null {
  if (agentId !== 'claude') return null;
  return {
    models: [
      { id: 'small-model', label: 'Small' },
      { id: 'large-model', label: 'Large' }
    ],
    suggestedModel: 'small-model',
    measuredOn: '2026-08-28'
  } as unknown as FoldRecipe;
}

describe('archOptions', () => {
  it('offers a compiled claude with the models the arch recipe exposes', () => {
    const out = archOptions({
      table: () => [entry('claude', 'builtin', 'Claude Code')],
      status: gate('never'),
      recipeFor: archTable
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(true);
    expect(row?.reason).toBeNull();
    expect(row?.models.map((m) => m.id)).toEqual([
      'small-model',
      'large-model'
    ]);
    expect(row?.suggestedModel).toBe('small-model');
    expect(row?.measuredOn).toBe('2026-08-28');
    expect(out.suggestedAgentId).toBe('claude');
  });

  it('disables an agent with no measured ARCH recipe, and names why', () => {
    const out = archOptions({
      table: () => [entry('pi', 'builtin', 'pi')],
      status: gate('confirmed'),
      recipeFor: archTable
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.models).toEqual([]);
    expect(row?.reason).toBe('not-measured');
    expect(out.suggestedAgentId).toBeNull();
  });

  it('does not let a measured fold recipe stand in for an arch one', () => {
    // pi has a measured FOLD recipe on this build. On the arch surface the
    // lookup answers from the arch table alone, so the same agent arrives
    // disabled until an arch row is measured by hand.
    const table = (): MergedAgentEntry[] => [entry('pi', 'builtin', 'pi')];
    const fold = foldOptions({ table, status: gate('confirmed') });
    const arch = archOptions({
      table,
      status: gate('confirmed'),
      recipeFor: archTable
    });
    expect(fold.harnesses[0]?.available).toBe(true);
    expect(arch.harnesses[0]?.available).toBe(false);
    expect(arch.harnesses[0]?.reason).toBe('not-measured');
  });

  it('refuses a configured row the confirm gate has not confirmed', () => {
    const out = archOptions({
      table: () => [entry('claude', 'overlay', 'A patched claude')],
      status: gate('changed'),
      recipeFor: archTable
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.reason).toBe('not-confirmed');
  });

  it('refuses a configured row while the seal is unknown', () => {
    const out = archOptions({
      table: () => [entry('claude', 'overlay')],
      status: gate('unknown'),
      recipeFor: archTable
    });
    expect(out.harnesses[0]?.available).toBe(false);
  });

  it('offers a configured row the confirm gate has confirmed', () => {
    const out = archOptions({
      table: () => [entry('claude', 'overlay', 'A patched claude')],
      status: gate('confirmed'),
      recipeFor: archTable
    });
    expect(out.harnesses[0]?.available).toBe(true);
  });

  it('puts the rows that can be picked first', () => {
    const out = archOptions({
      table: () => [entry('pi', 'builtin'), entry('claude', 'builtin')],
      status: gate('confirmed'),
      recipeFor: archTable
    });
    expect(out.harnesses.map((row) => row.agentId)).toEqual(['claude', 'pi']);
  });

  it('carries the suspension sentence when there is one', () => {
    const out = archOptions({
      table: () => [entry('claude', 'builtin')],
      status: gate('confirmed'),
      recipeFor: archTable,
      suspended: () => 'The pass is paused after repeated failures.'
    });
    expect(out.suspended).toBe('The pass is paused after repeated failures.');
  });

  it('gives every refused row one of the two reasons', () => {
    const out = archOptions({
      table: () => [entry('pi', 'builtin', 'pi'), entry('claude', 'overlay')],
      status: gate('never'),
      recipeFor: archTable
    });
    for (const row of out.harnesses) {
      if (row.available) {
        expect(row.reason).toBeNull();
        continue;
      }
      expect(['not-measured', 'not-confirmed']).toContain(row.reason);
    }
  });
});
