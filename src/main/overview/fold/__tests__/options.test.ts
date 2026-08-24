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
import { foldOptions } from '../options';
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

/**
 * An id the compiled recipe table will never hold (Phase 138.1).
 *
 * These tests used to reach for codex as the unmeasured agent, and then
 * Phase 138.1 measured codex and two of them went red for a reason that had
 * nothing to do with what they check. An id no registry row can carry keeps
 * the join under test rather than the recipe table.
 */
const UNMEASURED = 'a-harness-nobody-measured';

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

  it('shows an agent with no measured recipe, disabled, and names why', () => {
    const out = foldOptions({
      table: () => [entry(UNMEASURED, 'builtin', 'Nobody Measured')],
      status: gate('confirmed')
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.models).toEqual([]);
    expect(row?.reason).toBe('not-measured');
    expect(out.suggestedAgentId).toBeNull();
  });

  it('refuses a configured row the confirm gate has not confirmed', () => {
    const out = foldOptions({
      table: () => [entry('claude', 'overlay', 'A patched claude')],
      status: gate('changed')
    });
    const row = out.harnesses[0];
    expect(row?.available).toBe(false);
    expect(row?.reason).toBe('not-confirmed');
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
      table: () => [entry(UNMEASURED, 'builtin'), entry('claude', 'builtin')],
      status: gate('confirmed')
    });
    expect(out.harnesses.map((row) => row.agentId)).toEqual([
      'claude',
      UNMEASURED
    ]);
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

  // Phase 138.1. Main names the reason and the renderer writes the words, so
  // this file holds the token rather than a sentence. Every row that cannot
  // be picked must carry one, because the page groups the rows by it and a
  // row with no token would be silently dropped from both lines.
  it('gives every refused row one of the two reasons', () => {
    const out = foldOptions({
      table: () => [
        entry(UNMEASURED, 'builtin', 'Nobody Measured'),
        entry('claude', 'overlay')
      ],
      status: gate('never')
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
