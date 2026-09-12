/**
 * The two semantic scopes through the SAME runner (Phase 259).
 *
 * The property this file exists for is that Phase 259 opened no second door.
 * A `part` ask and a `journeys` ask take the gate Phase 158 built, the
 * confirm re-check at the spawn, the one shot spawn, the fold's minimum
 * interval and the same-input-hash refusal, and they reach `./write.ts`
 * NEVER: a reading lives in `arch.db` and never in `docs/arch/`.
 *
 * ONE THING IS MOCKED AND IT IS THE HONEST STATE OF THE TREE. `SEMANTIC_RECIPES`
 * is composed by filtering the rows that carry a measurement date, and until
 * the integrator measures one it is EMPTY, so a semantic ask on this tree is
 * refused `no-recipe` before anything spawns. The first case below asserts
 * exactly that over the real table; the rest install a measured row so the
 * behaviour after the measurement is pinned now rather than after.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchDocument } from '@shared/arch';
import type { MergedAgentEntry } from '../../../config/overlay';
import type { ConfigRowStatus } from '../../../config/confirm';
import type { FoldRun } from '../../../overview/fold/spawn';
import type { FoldRecipe } from '../../../overview/fold/recipes';
import type { ArchGradeSources } from '../../semantic/grade';
import type { ArchSemanticFactInput } from '../compose';
import {
  ArchPassRunner,
  type ArchPassDeps,
  type ArchPassInput,
  type ArchSemanticRecord
} from '../run';
import {
  archSemanticRecipeFor,
  SEMANTIC_DRAFTS
} from '../../../overview/fold/recipes';

vi.mock('../../../overview/fold/recipes', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../overview/fold/recipes')>();
  return {
    ...real,
    // Only the semantic lookup is replaced, and only when a test installs a
    // row. Every other export, the whole-pass recipe included, stays the real
    // one so nothing else in this file is testing a fiction.
    archSemanticRecipeFor: (agentId: string): FoldRecipe | null =>
      measured === null || measured.agentId !== agentId
        ? real.archSemanticRecipeFor(agentId)
        : measured
  };
});

let measured: FoldRecipe | null = null;

function entry(id: string, launchable = true): MergedAgentEntry {
  return {
    id,
    source: 'builtin',
    displayName: id,
    launchable,
    binaries: [id],
    extraProbeDirs: [],
    resume: { template: [], idCapture: { mode: 'none' } },
    executionHash: null,
    install: null
  } as unknown as MergedAgentEntry;
}

const CONFIRMED = (): ConfigRowStatus =>
  ({
    id: 'x',
    hash: 'h',
    lines: [],
    confirmedHash: null,
    confirmedAt: null,
    confirmedLines: [],
    state: 'confirmed',
    refusal: null
  }) as unknown as ConfigRowStatus;

const GRADE: ArchGradeSources = {
  lines: (path) => (path === 'src/a.ts' ? 400 : null),
  facts: (path) =>
    path === 'src/a.ts'
      ? [{ category: 'surface', kind: 'ipc-channel', subject: 'arch:map', line: 10 }]
      : [],
  decls: () => []
};

const FACTS: ArchSemanticFactInput = {
  trackedFiles: 2,
  parts: [
    {
      id: 'src-main',
      label: 'src/main',
      dirs: ['src/main'],
      files: ['src/a.ts'],
      parsed: 1,
      region: null
    }
  ],
  facts: [
    {
      category: 'surface',
      kind: 'ipc-channel',
      subject: 'arch:map',
      file: 'src/a.ts',
      line: 10,
      rule: 'surface.ipc.electron',
      evidence: "handle(ipc, 'arch:map')",
      viaWrapper: false
    }
  ],
  crossings: []
};

const FIELDS = ['name', 'receives', 'does', 'returns', 'runsIn', 'keeps', 'limit'] as const;

function emptyDocument(): ArchDocument {
  return { contract: null, components: [], edges: [], baseline: { accepted: [] }, problems: [] };
}

function semanticInput(over: Partial<ArchPassInput> = {}): ArchPassInput {
  return {
    repoPath: '/tmp/fixture-repo',
    document: emptyDocument(),
    trackedFiles: [],
    imports: [],
    subject: 'fixture',
    workspaces: [],
    scope: 'part',
    partId: 'src-main',
    semantic: FACTS,
    grade: GRADE,
    headCommit: 'a'.repeat(40),
    ...over
  };
}

function partAnswer(): string {
  return JSON.stringify({
    part: 'src-main',
    claims: FIELDS.map((field) => ({
      field,
      text: field === 'name' ? 'The IPC door' : 'a plain sentence',
      facts: [{ at: 'src/a.ts:10', why: 'the channel it registers' }]
    })),
    gates: [
      {
        id: 'adopt-a-session',
        question: 'Will it adopt one?',
        answer: 'stops',
        because: 'a session with no stamp is not ours',
        facts: [{ at: 'src/a.ts:10', why: 'the registration' }]
      }
    ]
  });
}

function okRun(text: string): FoldRun {
  return { outcome: 'ok', text, reason: null, window: null, wallMs: 5, costUsd: 0.02 };
}

interface Harness {
  runner: ArchPassRunner;
  spawns: number;
  writes: number;
  records: ArchSemanticRecord[];
  appended: { scope: string; verdict: string; reason: string | null }[];
}

function harness(overrides: Partial<ArchPassDeps> = {}, text = partAnswer()): Harness {
  const state: Harness = {
    runner: undefined as unknown as ArchPassRunner,
    spawns: 0,
    writes: 0,
    records: [],
    appended: []
  };
  const deps: ArchPassDeps = {
    choice: () => ({ agentId: 'claude', model: 'opus' }),
    table: () => [entry('claude')],
    status: CONFIRMED as unknown as ArchPassDeps['status'],
    run: () => {
      state.spawns += 1;
      return Promise.resolve(okRun(text));
    },
    write: () => {
      state.writes += 1;
      return Promise.resolve([]);
    },
    paint: () => ({ painted: 1, groupsTotal: 1 }),
    append: (record) => {
      state.appended.push({
        scope: record.scope,
        verdict: record.verdict,
        reason: record.reason
      });
    },
    recordSemantic: (record) => {
      state.records.push(record);
    },
    ...overrides
  };
  state.runner = new ArchPassRunner(deps);
  return state;
}

beforeEach(() => {
  measured = null;
});

/** A measured row, standing in for whatever the integrator's run writes down. */
function installMeasuredRow(): void {
  const draft = SEMANTIC_DRAFTS.find((row) => row.agentId === 'claude');
  if (draft === undefined) throw new Error('the claude semantic draft is gone');
  measured = { ...draft, measuredOn: '2026-09-12' } as FoldRecipe;
}

describe('measured or disabled', () => {
  it('refuses a semantic ask on this tree, because no row is measured yet', async () => {
    expect(archSemanticRecipeFor('claude')).toBeNull();
    const h = harness();
    const outcome = await h.runner.run(semanticInput());
    expect(outcome).toEqual({ started: false, refusal: 'no-recipe', run: null });
    expect(h.spawns).toBe(0);
    expect(h.records).toHaveLength(0);
  });
});

describe('the gate, unchanged', () => {
  beforeEach(installMeasuredRow);

  it('refuses an agent the confirm gate does not answer for, and spawns nothing', async () => {
    const h = harness({ table: () => [entry('claude', false)] });
    const outcome = await h.runner.run(semanticInput());
    expect(outcome.refusal).toBe('not-confirmed');
    expect(h.spawns).toBe(0);
  });

  it('refuses a part the partition does not hold, rather than reading a neighbour', async () => {
    const h = harness();
    const outcome = await h.runner.run(semanticInput({ partId: 'no-such-box' }));
    expect(outcome.refusal).toBe('no-part');
    expect(h.spawns).toBe(0);
    expect(h.records).toHaveLength(0);
  });

  it('refuses a part ask with no facts gathered at all', async () => {
    const h = harness();
    const outcome = await h.runner.run(
      semanticInput({ semantic: undefined, grade: undefined })
    );
    expect(outcome.refusal).toBe('no-part');
    expect(h.spawns).toBe(0);
  });
});

describe('a kept part reading', () => {
  beforeEach(installMeasuredRow);

  it('records the answer and never reaches the contract writer', async () => {
    const h = harness();
    const outcome = await h.runner.run(semanticInput());
    expect(outcome.started).toBe(true);
    expect(outcome.run?.verdict).toBe('kept');
    expect(h.writes).toBe(0);
    expect(h.records).toHaveLength(1);
    const record = h.records[0];
    expect(record?.scope).toBe('part');
    expect(record?.partId).toBe('src-main');
    expect(record?.headCommit).toBe('a'.repeat(40));
    expect(record?.costUsd).toBe(0.02);
    expect(record?.kept?.kind).toBe('part');
    if (record?.kept?.kind === 'part') {
      expect(record.kept.claims).toHaveLength(7);
      expect(record.kept.gates).toHaveLength(1);
      // The citations arrive already GRADED, so nothing downstream re-decides.
      expect(record.kept.claims[0]?.cites[0]?.grade).toBe('call-site');
    }
  });

  it('appends the pass row under its own scope, so the face can say what ran', async () => {
    const h = harness();
    await h.runner.run(semanticInput());
    expect(h.appended).toEqual([{ scope: 'part', verdict: 'kept', reason: null }]);
  });

  it('records a REFUSED ask with its name, because a refusal rate must be readable', async () => {
    const h = harness(
      {},
      JSON.stringify({
        part: 'src-main',
        claims: FIELDS.map((field) => ({
          field,
          text: field === 'runsIn' ? 'tested' : 'a plain sentence',
          facts: [{ at: 'src/a.ts:10', why: 'x' }]
        })),
        gates: []
      })
    );
    const outcome = await h.runner.run(semanticInput());
    expect(outcome.run?.verdict).toBe('refused');
    expect(outcome.run?.reason).toBe('level-written');
    expect(h.records[0]?.verdict).toBe('refused');
    expect(h.records[0]?.kept).toBeNull();
    expect(h.writes).toBe(0);
  });

  it('records a failed spawn as failed and keeps nothing', async () => {
    const h = harness({
      run: () =>
        Promise.resolve({
          outcome: 'spawn-failed',
          text: null,
          reason: 'no-binary',
          window: null,
          wallMs: 1,
          costUsd: null
        } as FoldRun)
    });
    const outcome = await h.runner.run(semanticInput());
    expect(outcome.run?.verdict).toBe('failed');
    expect(h.records[0]?.verdict).toBe('failed');
    expect(h.records[0]?.reason).toBe('no-binary');
  });

  it('refuses a second ask while one is in flight, the Phase 158 rule unchanged', async () => {
    const held: (() => void)[] = [];
    const h = harness({
      run: () =>
        new Promise<FoldRun>((resolve) => {
          held.push(() => {
            resolve(okRun(partAnswer()));
          });
        })
    });
    const first = h.runner.run(semanticInput());
    const second = await h.runner.run(semanticInput());
    expect(second.refusal).toBe('in-flight');
    for (const release of held) release();
    await first;
  });
});

describe('a journeys reading', () => {
  beforeEach(installMeasuredRow);

  it('is kept, numbered and recorded without a contract of any kind', async () => {
    const h = harness(
      {},
      JSON.stringify({
        journeys: [
          {
            id: 'start-and-return',
            name: 'starting a session',
            steps: [
              {
                partId: 'src-main',
                label: 'main registers the door',
                facts: [{ at: 'src/a.ts:10', why: 'x' }]
              }
            ]
          }
        ]
      })
    );
    const outcome = await h.runner.run(semanticInput({ scope: 'journeys', partId: undefined }));
    expect(outcome.run?.verdict).toBe('kept');
    expect(h.writes).toBe(0);
    const record = h.records[0];
    expect(record?.scope).toBe('journeys');
    expect(record?.partId).toBeNull();
    if (record?.kept?.kind === 'journeys') {
      expect(record.kept.journeys[0]?.steps[0]?.seq).toBe(1);
    }
  });
});
