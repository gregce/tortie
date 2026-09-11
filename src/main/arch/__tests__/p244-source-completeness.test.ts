/**
 * PHASE 244, audit finding F3. SOURCE COMPLETENESS SURVIVES BOTH COORDINATOR
 * PATHS, AND A CEILING DOES NOT BECOME AN ENDLESS RESCAN.
 *
 * The audit's own fixture (./audit-0908-partial.test.ts) drives the fact-only
 * path, where `syncTree`'s typed answer was bound to nothing at all. The
 * contract-check path was called the working sibling for PROPAGATING the
 * result, and it is — it keeps the sentence for the check result — but it
 * stamped a COMPLETE scan over an incomplete source just the same, so the map
 * drew a settled answer either way. This file holds both ends.
 *
 * It also holds the thing a careless repair breaks. `building` is derived from
 * the scan stamp, and `building` schedules the next check on EVERY map read; a
 * stamp left null was measured once before at about thirty pushes a second
 * until quit. A remote mirror's file or byte ceiling is not something another
 * pass gets past, so refusing to stamp would ask for an impossible full read for
 * ever. The stamp is written and the REASON travels with it, which is a
 * different call and a different sentence rather than a flag on the old one.
 *
 * The PARSER's budget is deliberately left as it was: that one IS picked up by
 * the next run, so it still leaves `building` true.
 */

import { expect, it, vi } from 'vitest';

import type { ArchStore } from '../db';

const CEILING = 'Mirror stopped at 64 MiB; some tracked files were not read.';

const seam = vi.hoisted(() => ({
  contract: null as unknown,
  scanOverBudget: null as string | null,
  sourceOverBudget: null as string | null,
  source: {
    repoPath: '/scratch-mirror',
    farPath: '/far-repo',
    machineId: 'fixture',
    watchable: false,
    fileSystem: async () => ({}),
    git: () => ({
      run: async (call: { kind: string }) => ({
        code: 0,
        stdout: Buffer.from(call.kind === 'ls-files' ? 'a.ts\0' : 'a'.repeat(40)),
        stderr: Buffer.alloc(0)
      })
    }),
    syncTree: vi.fn(async () => ({ overBudget: seam.sourceOverBudget }))
  }
}));

vi.mock('../remote-source', () => ({
  localArchSource: () => seam.source,
  archSourceOf: () => seam.source
}));
vi.mock('../load', () => ({
  loadArchDocument: async () => ({
    contract: seam.contract,
    components: [],
    edges: [],
    baseline: { acceptances: [] },
    problems: []
  }),
  keepLastValid: (_old: unknown, fresh: unknown) => fresh
}));
vi.mock('../scan', () => ({
  scanArchImports: async () => ({
    parsed: 1,
    overBudget: seam.scanOverBudget,
    imports: [],
    unparsed: []
  })
}));
vi.mock('../tree-facts', () => ({
  // The shape the coordinator logs after the read (Phase 257), with nothing read.
  readArchTreeFacts: async () => ({
    read: 0,
    reused: 0,
    durationMs: 0,
    facts: { read: 0, reused: 0, wrapFacts: 0, wrapDigest: null, overBudget: null }
  })
}));
vi.mock('../../typed-events', () => ({ broadcastEvent: vi.fn() }));

const { createArchCheckCoordinator } = await import('../check-coordinator');

/**
 * The smallest contract the checker path will run over. It declares no layer, so
 * the checkers have nothing to judge and this file stays about the stamp.
 */
const CONTRACT = {
  version: 1,
  subject: 'the fixture repository',
  strictness: 'advisory',
  layers: [],
  flows: []
};

interface Recorded {
  scanned: unknown[][];
  partial: unknown[][];
  state: { scannedAtCommit: string | null; scanIncomplete: string | null };
}

/** A store that records the two marks and answers what they last wrote. */
function recordingStore(): { db: ArchStore; recorded: Recorded } {
  const recorded: Recorded = {
    scanned: [],
    partial: [],
    state: { scannedAtCommit: null, scanIncomplete: null }
  };
  const db = {
    repoState: () => ({
      ...recorded.state,
      checkedAtCommit: null,
      generation: 1,
      counts: null
    }),
    claimGeneration: () => 1,
    markScanned: (...args: unknown[]) => {
      recorded.scanned.push(args);
      recorded.state = { scannedAtCommit: String(args[2]), scanIncomplete: null };
    },
    markScanPartial: (...args: unknown[]) => {
      recorded.partial.push(args);
      recorded.state = { scannedAtCommit: String(args[2]), scanIncomplete: String(args[3]) };
    },
    verdicts: () => [],
    freshness: () => [],
    verdictChanges: () => null,
    publish: () => ({ verdicts: [], freshness: [], counts: null, publish: [] }),
    imports: () => [],
    treeFacts: () => []
  } as unknown as ArchStore;
  return { db, recorded };
}

async function drive(input: {
  contract: unknown;
  sourceOverBudget: string | null;
  scanOverBudget?: string | null;
}): Promise<Recorded> {
  seam.contract = input.contract;
  seam.sourceOverBudget = input.sourceOverBudget;
  seam.scanOverBudget = input.scanOverBudget ?? null;
  const { db, recorded } = recordingStore();
  const coordinator = createArchCheckCoordinator({
    store: () => db,
    repairDrift: async () => undefined
  });
  try {
    await coordinator.runOneCheck('/scratch-mirror', null);
  } finally {
    coordinator.dispose();
  }
  return recorded;
}

it('the fact-only path records a PARTIAL scan when the source was incomplete', async () => {
  const recorded = await drive({ contract: null, sourceOverBudget: CEILING });
  expect(recorded.scanned).toEqual([]);
  expect(recorded.partial).toHaveLength(1);
  expect(recorded.partial[0]?.[3]).toBe(CEILING);
  // The stamp still lands, so `building` clears and the refresh loop does not
  // ask for a read the ceiling makes impossible.
  expect(recorded.state.scannedAtCommit).not.toBeNull();
  expect(recorded.state.scanIncomplete).toBe(CEILING);
});

it('the fact-only path records a COMPLETE scan when the source read it all', async () => {
  const recorded = await drive({ contract: null, sourceOverBudget: null });
  expect(recorded.partial).toEqual([]);
  expect(recorded.scanned).toHaveLength(1);
  expect(recorded.state.scanIncomplete).toBeNull();
});

it('the contract path records a PARTIAL scan when the source was incomplete', async () => {
  const recorded = await drive({ contract: CONTRACT, sourceOverBudget: CEILING });
  expect(recorded.scanned).toEqual([]);
  expect(recorded.partial).toHaveLength(1);
  expect(recorded.partial[0]?.[3]).toBe(CEILING);
  expect(recorded.state.scannedAtCommit).not.toBeNull();
  expect(recorded.state.scanIncomplete).toBe(CEILING);
});

it('the contract path records a COMPLETE scan when the source read it all', async () => {
  const recorded = await drive({ contract: CONTRACT, sourceOverBudget: null });
  expect(recorded.partial).toEqual([]);
  expect(recorded.scanned).toHaveLength(1);
  expect(recorded.state.scanIncomplete).toBeNull();
});

it("the PARSER's own budget still leaves the fact-only path unstamped", async () => {
  // Unchanged on purpose. A parser budget is picked up where it left off by the
  // next run, so `building` staying true is what makes that next run happen.
  const recorded = await drive({
    contract: null,
    sourceOverBudget: null,
    scanOverBudget: 'The scan ran out of its budget.'
  });
  expect(recorded.scanned).toEqual([]);
  expect(recorded.partial).toEqual([]);
  expect(recorded.state.scannedAtCommit).toBeNull();
});

it('a complete scan after a partial one clears the reason', async () => {
  seam.contract = null;
  seam.scanOverBudget = null;
  const { db, recorded } = recordingStore();
  const coordinator = createArchCheckCoordinator({
    store: () => db,
    repairDrift: async () => undefined
  });
  try {
    seam.sourceOverBudget = CEILING;
    await coordinator.runOneCheck('/scratch-mirror', null);
    expect(recorded.state.scanIncomplete).toBe(CEILING);
    // The folder shrank, or the ceiling moved. A reason that outlived the thing
    // that caused it would be a sentence nothing can ever take back.
    seam.sourceOverBudget = null;
    await coordinator.runOneCheck('/scratch-mirror', null);
    expect(recorded.state.scanIncomplete).toBeNull();
  } finally {
    coordinator.dispose();
  }
});
