/**
 * The pass runner's gate, verdicts and suspension (Phase 158), driven with
 * every dependency injected: no config file, no keystore, no child process.
 *
 * The attack cases the charter names are here in their unit form: an agent
 * that was never confirmed cannot spawn, a second gesture while one runs is
 * refused, a refusal writes nothing, and a kept answer that paints no box is
 * recorded FAILED.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument } from '@shared/arch';
import type { MergedAgentEntry } from '../../../config/overlay';
import type { ConfigRowStatus } from '../../../config/confirm';
import type { FoldRun } from '../../../overview/fold/spawn';
import { FOLD_MIN_INTERVAL_MS } from '../../../overview/fold/scheduler';
import type { ArchDriftVerdict } from '../drift';
import {
  archAgentConfirmed,
  ArchPassRunner,
  type ArchPassDeps,
  type ArchPassInput,
  type ArchPassRunRecord
} from '../run';

function entry(
  id: string,
  source: 'builtin' | 'overlay',
  launchable = true
): MergedAgentEntry {
  return {
    id,
    source,
    displayName: id,
    launchable,
    binaries: [id],
    extraProbeDirs: [],
    resume: { template: [], idCapture: { mode: 'none' } },
    executionHash: null,
    install: null
  } as unknown as MergedAgentEntry;
}

function statusOf(state: 'confirmed' | 'unconfirmed'): () => ConfigRowStatus {
  return () =>
    ({
      id: 'x',
      hash: 'h',
      lines: [],
      confirmedHash: null,
      confirmedAt: null,
      confirmedLines: [],
      state,
      refusal: null
    }) as unknown as ConfigRowStatus;
}

function draft(): ArchDocument {
  return {
    contract: {
      version: 1,
      subject: 'fixture',
      strictness: 'not-wrong',
      layers: [
        { id: 'surface', name: 'surface', order: 0 },
        { id: 'engine', name: 'engine', order: 1 },
        { id: 'foundation', name: 'foundation', order: 2 }
      ],
      flows: []
    },
    components: [
      {
        id: 'src-app',
        name: 'src/app',
        kind: 'component',
        layer: 'surface',
        provenance: 'first-party',
        anchors: ['src/app'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      }
    ],
    edges: [],
    baseline: { accepted: [] },
    problems: []
  };
}

function passInput(): ArchPassInput {
  return {
    repoPath: '/tmp/fixture-repo',
    document: draft(),
    trackedFiles: ['src/app/a.ts'],
    imports: [],
    subject: 'fixture',
    workspaces: []
  };
}

function validAnswerText(): string {
  const doc = draft();
  return JSON.stringify({
    contract: doc.contract,
    components: [
      {
        ...doc.components[0],
        name: 'The App',
        description: 'Draws the screen.'
      }
    ],
    edges: { edges: [] },
    suggestions: ['One regroup thought.']
  });
}

function okRun(text: string): FoldRun {
  return {
    outcome: 'ok',
    text,
    reason: null,
    window: null,
    wallMs: 5,
    costUsd: 0.01
  };
}

function failedRun(): FoldRun {
  return {
    outcome: 'spawn-failed',
    text: null,
    reason: 'no-binary',
    window: null,
    wallMs: 1,
    costUsd: null
  };
}

interface Harness {
  runner: ArchPassRunner;
  spawns: number;
  writes: string[][];
  appended: (ArchPassRunRecord & { repoPath: string })[];
}

function harness(overrides: Partial<ArchPassDeps> = {}): Harness {
  const state: Harness = {
    runner: undefined as unknown as ArchPassRunner,
    spawns: 0,
    writes: [],
    appended: []
  };
  const deps: ArchPassDeps = {
    choice: () => ({ agentId: 'claude', model: 'claude-haiku-4-5-20251001' }),
    table: () => [entry('claude', 'builtin')],
    status: statusOf('confirmed') as unknown as ArchPassDeps['status'],
    run: (input) => {
      void input;
      state.spawns += 1;
      return Promise.resolve(okRun(validAnswerText()));
    },
    write: (repoPath, answer) => {
      void repoPath;
      state.writes.push(answer.components.map((c) => c.id));
      return Promise.resolve(['docs/arch/contract.json']);
    },
    paint: () => ({ painted: 1, groupsTotal: 1 }),
    append: (record) => {
      state.appended.push(record);
    },
    ...overrides
  };
  state.runner = new ArchPassRunner(deps);
  return state;
}

describe('the gate, checked before anything spawns', () => {
  it('refuses when nothing is chosen, and spawns nothing', async () => {
    const h = harness({ choice: () => ({ agentId: null, model: null }) });
    const outcome = await h.runner.run(passInput());
    expect(outcome).toEqual({ started: false, refusal: 'no-choice', run: null });
    expect(h.spawns).toBe(0);
    expect(h.appended).toHaveLength(0);
  });

  it('refuses an agent that was never confirmed, the charter attack', async () => {
    const h = harness({
      table: () => [entry('claude', 'overlay')],
      status: statusOf('unconfirmed') as unknown as ArchPassDeps['status']
    });
    const outcome = await h.runner.run(passInput());
    expect(outcome.refusal).toBe('not-confirmed');
    expect(h.spawns).toBe(0);
  });

  it('accepts a builtin row with no confirmation record, the compiled world', async () => {
    const h = harness({
      status: statusOf('unconfirmed') as unknown as ArchPassDeps['status']
    });
    const outcome = await h.runner.run(passInput());
    expect(outcome.started).toBe(true);
    expect(h.spawns).toBe(1);
  });

  it('refuses an agent with no measured arch recipe', async () => {
    const h = harness({
      choice: () => ({ agentId: 'codex', model: 'gpt-5.4-mini' }),
      table: () => [entry('codex', 'builtin')]
    });
    const outcome = await h.runner.run(passInput());
    expect(outcome.refusal).toBe('no-recipe');
    expect(h.spawns).toBe(0);
  });

  it('refuses a second gesture while one pass is in flight', async () => {
    let release: (run: FoldRun) => void = () => undefined;
    const h = harness({
      run: () =>
        new Promise<FoldRun>((resolveRun) => {
          release = resolveRun;
        })
    });
    const first = h.runner.run(passInput());
    const second = await h.runner.run(passInput());
    expect(second.refusal).toBe('in-flight');
    release(okRun(validAnswerText()));
    const outcome = await first;
    expect(outcome.run?.verdict).toBe('kept');
  });
});

describe('verdicts', () => {
  it('keeps a valid answer: writes, paints, appends kept', async () => {
    const h = harness();
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('kept');
    expect(outcome.run?.painted).toBe(1);
    expect(outcome.run?.suggestions).toEqual(['One regroup thought.']);
    expect(h.writes).toHaveLength(1);
    expect(h.appended[0]?.verdict).toBe('kept');
  });

  it('refuses an invalid answer whole, writes NOTHING, and records the reason', async () => {
    const h = harness({
      run: () => Promise.resolve(okRun('this is not JSON {'))
    });
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('refused');
    expect(outcome.run?.reason).toBe('bad-shape');
    expect(h.writes).toHaveLength(0);
    expect(h.appended[0]?.verdict).toBe('refused');
    // The token names the rule; the sentence names the place. Both travel.
    expect(outcome.run?.detail).toContain('not valid JSON');
    expect(h.appended[0]?.detail).toBe(outcome.run?.detail);
  });

  it('names the field and the reason on a refusal, not the token alone', async () => {
    const doc = draft();
    const answer = JSON.stringify({
      contract: doc.contract,
      components: [{ ...doc.components[0], anchors: ['../../etc'] }],
      edges: { edges: [] },
      suggestions: []
    });
    const h = harness({ run: () => Promise.resolve(okRun(answer)) });
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('refused');
    expect(outcome.run?.detail).toMatch(/anchors/);
    expect(outcome.run?.detail).not.toBe(outcome.run?.reason);
    expect(h.writes).toHaveLength(0);
  });

  it('carries no detail on a kept run', async () => {
    const h = harness();
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.detail).toBeNull();
  });

  it('records a kept write that painted no box as FAILED, map binding rule 2', async () => {
    const h = harness({ paint: () => ({ painted: 0, groupsTotal: 9 }) });
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('failed');
    expect(outcome.run?.reason).toBe('no-painted-box');
    // The files were written; the record is what says the run failed.
    expect(h.writes).toHaveLength(1);
  });

  it('records a failed spawn with its reason', async () => {
    const h = harness({ run: () => Promise.resolve(failedRun()) });
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('failed');
    expect(outcome.run?.reason).toBe('no-binary');
    expect(h.writes).toHaveLength(0);
  });

  it('a thrown run is appended to the store like every other run', async () => {
    const h = harness({
      write: () => Promise.reject(new Error('disk said no'))
    });
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.verdict).toBe('failed');
    expect(outcome.run?.reason).toBe('error');
    expect(h.appended).toHaveLength(1);
    expect(h.appended[0]?.verdict).toBe('failed');
    expect(h.appended[0]?.reason).toBe('error');
    expect(h.appended[0]?.repoPath).toBe(passInput().repoPath);
  });

  it('an append that throws does not break the never-throws promise', async () => {
    const runner = new ArchPassRunner({
      choice: () => ({ agentId: 'claude', model: 'claude-haiku-4-5-20251001' }),
      table: () => [entry('claude', 'builtin')],
      status: statusOf('confirmed') as unknown as ArchPassDeps['status'],
      run: () => Promise.resolve(okRun(validAnswerText())),
      write: () => Promise.reject(new Error('disk said no')),
      paint: () => ({ painted: 1, groupsTotal: 1 }),
      append: () => {
        throw new Error('store is locked');
      }
    });
    const outcome = await runner.run(passInput());
    expect(outcome.run?.verdict).toBe('failed');
    expect(outcome.run?.reason).toBe('error');
  });
});

describe('the suspension, the fold discipline', () => {
  it('suspends after three consecutive failures and refuses the next gesture', async () => {
    const h = harness({ run: () => Promise.resolve(failedRun()) });
    await h.runner.run(passInput());
    await h.runner.run(passInput());
    expect(h.runner.suspension()).toBeNull();
    await h.runner.run(passInput());
    expect(h.runner.suspension()).not.toBeNull();
    const refused = await h.runner.run(passInput());
    expect(refused.refusal).toBe('suspended');
  });

  it('a validator refusal resets the failure count rather than feeding it', async () => {
    let calls = 0;
    const h = harness({
      run: () => {
        calls += 1;
        return Promise.resolve(
          calls === 3 ? okRun('broken {') : failedRun()
        );
      }
    });
    await h.runner.run(passInput());
    await h.runner.run(passInput());
    // The third run is a REFUSAL, which resets the count, so no suspension.
    await h.runner.run(passInput());
    expect(h.runner.suspension()).toBeNull();
  });

  it('suspends on a rate limited run', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'rate-limited',
          text: null,
          reason: 'rate-limited',
          window: null,
          wallMs: 1,
          costUsd: null
        } satisfies FoldRun)
    });
    await h.runner.run(passInput());
    expect(h.runner.suspension()).toContain('usage limit');
  });

  it('an overloaded server skips the turn and never suspends', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'overloaded',
          text: null,
          reason: 'overloaded',
          window: null,
          wallMs: 1,
          costUsd: null
        } satisfies FoldRun)
    });
    await h.runner.run(passInput());
    await h.runner.run(passInput());
    await h.runner.run(passInput());
    expect(h.runner.suspension()).toBeNull();
  });
});

describe('archAgentConfirmed', () => {
  it('answers false for an unknown or unlaunchable agent', () => {
    expect(archAgentConfirmed('ghost', () => [], statusOf('confirmed') as never)).toBe(
      false
    );
    expect(
      archAgentConfirmed(
        'claude',
        () => [entry('claude', 'builtin', false)],
        statusOf('confirmed') as never
      )
    ).toBe(false);
  });

  it('needs the gate only for overlay rows', () => {
    expect(
      archAgentConfirmed(
        'claude',
        () => [entry('claude', 'builtin')],
        statusOf('unconfirmed') as never
      )
    ).toBe(true);
    expect(
      archAgentConfirmed(
        'claude',
        () => [entry('claude', 'overlay')],
        statusOf('unconfirmed') as never
      )
    ).toBe(false);
    expect(
      archAgentConfirmed(
        'claude',
        () => [entry('claude', 'overlay')],
        statusOf('confirmed') as never
      )
    ).toBe(true);
  });
});

describe('the drift scope and the automatic trigger (Phase 159)', () => {
  const broken: ArchDriftVerdict[] = [
    {
      subjectId: 'component:src-app#anchor:0',
      status: 'absent',
      coverage: 'checked',
      reason: 'src/app says it lives at "src/app", and no tracked file is there.'
    }
  ];

  function driftInput(
    trigger: 'gesture' | 'ribbon' | 'drift',
    verdicts: ArchDriftVerdict[] = broken
  ): ArchPassInput {
    return { ...passInput(), scope: 'drift', trigger, verdicts, freshness: [] };
  }

  it('the Phase 158 button is unchanged: no scope means whole, gesture', async () => {
    const h = harness();
    const outcome = await h.runner.run(passInput());
    expect(outcome.run?.scope).toBe('whole');
    expect(outcome.run?.trigger).toBe('gesture');
    expect(outcome.run?.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(h.appended[0]?.inputHash).toBe(outcome.run?.inputHash);
  });

  it('refuses no-drift before any spawn when nothing drifted', async () => {
    const h = harness();
    const outcome = await h.runner.run(driftInput('drift', []));
    expect(outcome).toEqual({ started: false, refusal: 'no-drift', run: null });
    expect(h.spawns).toBe(0);
    expect(h.appended).toHaveLength(0);
  });

  it('spawns the delta prompt over a drift and records scope, trigger and hash', async () => {
    let prompt = '';
    let systemPrompt = '';
    const h = harness({
      run: (input) => {
        prompt = input.prompt;
        systemPrompt = input.systemPrompt;
        return Promise.resolve(okRun(validAnswerText()));
      }
    });
    const outcome = await h.runner.run(driftInput('drift'));
    expect(outcome.started).toBe(true);
    expect(prompt).toContain('DRIFT\npromise component:src-app#anchor:0: broke,');
    expect(systemPrompt).toContain('Change only the parts and promises DRIFT names.');
    expect(h.appended[0]?.scope).toBe('drift');
    expect(h.appended[0]?.trigger).toBe('drift');
    expect(h.appended[0]?.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('validates a drift answer under rule 10, so an out of drift edit is refused', async () => {
    const doc = draft();
    doc.components.push({
      ...doc.components[0]!,
      id: 'src-quiet',
      anchors: ['src/quiet'],
      name: 'Quiet'
    });
    const answer = JSON.stringify({
      contract: doc.contract,
      components: [
        doc.components[0],
        { ...doc.components[1], description: 'An edit outside the drift.' }
      ],
      edges: { edges: [] },
      suggestions: []
    });
    const h = harness({ run: () => Promise.resolve(okRun(answer)) });
    const outcome = await h.runner.run({
      ...driftInput('ribbon'),
      document: doc,
      trackedFiles: ['src/app/a.ts', 'src/quiet/q.ts']
    });
    expect(outcome.run?.verdict).toBe('refused');
    expect(outcome.run?.reason).toBe('outside-drift');
    expect(h.writes).toHaveLength(0);
  });

  it('drops a second automatic drift inside the interval, and the ribbon is never dropped', async () => {
    let clock = 1_000_000;
    const h = harness({ now: () => clock });
    const first = await h.runner.run(driftInput('drift'));
    expect(first.started).toBe(true);
    clock += FOLD_MIN_INTERVAL_MS - 1;
    // The same drift again would also be the same input, so change it.
    const other: ArchDriftVerdict[] = [{ ...broken[0]!, reason: 'A different sentence.' }];
    const second = await h.runner.run(driftInput('drift', other));
    expect(second).toEqual({ started: false, refusal: 'interval', run: null });
    const pressed = await h.runner.run(driftInput('ribbon', other));
    expect(pressed.started).toBe(true);
    clock += 1;
    const third = await h.runner.run(driftInput('drift', other));
    expect(third.started).toBe(true);
    expect(h.spawns).toBe(3);
  });

  it('refuses the same input automatically, from the store, and never for a press', async () => {
    const hashes: string[] = [];
    const h = harness({
      latestInputHash: () => hashes[hashes.length - 1] ?? null,
      append: (record) => {
        if (record.inputHash !== null) hashes.push(record.inputHash);
      }
    });
    const first = await h.runner.run(driftInput('ribbon'));
    expect(first.started).toBe(true);
    const again = await h.runner.run(driftInput('drift'));
    expect(again).toEqual({ started: false, refusal: 'same-input', run: null });
    const pressed = await h.runner.run(driftInput('ribbon'));
    expect(pressed.started).toBe(true);
    expect(h.spawns).toBe(2);
  });

  it('the same input is refused after a REFUSED answer too, so a bad drift is not retried every minute', async () => {
    const hashes: string[] = [];
    let spawns = 0;
    const h = harness({
      run: () => {
        spawns += 1;
        return Promise.resolve(okRun('not json {'));
      },
      latestInputHash: () => hashes[hashes.length - 1] ?? null,
      append: (record) => {
        if (record.inputHash !== null) hashes.push(record.inputHash);
      }
    });
    const first = await h.runner.run(driftInput('ribbon'));
    expect(first.run?.verdict).toBe('refused');
    const again = await h.runner.run(driftInput('drift'));
    expect(again.refusal).toBe('same-input');
    expect(spawns).toBe(1);
  });

  it('a changed drift is a new input and spawns again', async () => {
    const hashes: string[] = [];
    const h = harness({
      latestInputHash: () => hashes[hashes.length - 1] ?? null,
      append: (record) => {
        if (record.inputHash !== null) hashes.push(record.inputHash);
      }
    });
    await h.runner.run(driftInput('ribbon'));
    const other: ArchDriftVerdict[] = [{ ...broken[0]!, reason: 'Another reason.' }];
    const next = await h.runner.run(driftInput('drift', other));
    expect(next.started).toBe(true);
    expect(h.spawns).toBe(2);
  });

  it('a thrown drift run still records scope, trigger and hash', async () => {
    const h = harness({ write: () => Promise.reject(new Error('disk said no')) });
    const outcome = await h.runner.run(driftInput('drift'));
    expect(outcome.run?.verdict).toBe('failed');
    expect(outcome.run?.scope).toBe('drift');
    expect(outcome.run?.trigger).toBe('drift');
    expect(outcome.run?.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
