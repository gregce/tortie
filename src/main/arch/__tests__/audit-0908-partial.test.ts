/**
 * PHASE 244. The 0.101.0 audit's partial-scan fixture, adopted at the location
 * the audit names, with finding F3's repair behind it.
 *
 * THE BEHAVIOURAL ASSERTION IS THE AUDIT'S OWN AND IS UNWEAKENED:
 * `markScanned` must not be called when the source said its read was
 * incomplete. The SETUP moved by two lines, which the audit allows and this
 * phase's charter repeats: the stub store gained the `markScanPartial` the
 * repair introduced, and the case now also asserts what that call carried,
 * because a repair that recorded nothing at all would leave `building` true and
 * the refresh loop asking for an impossible full read for ever.
 */
import { expect, it, vi } from 'vitest';
import type { ArchStore } from '../db';
const seam = vi.hoisted(() => ({
  source: {
    repoPath: '/scratch-mirror', farPath: '/far-repo', machineId: 'fixture', watchable: false,
    fileSystem: async () => ({}),
    git: () => ({ run: async (call: { kind: string }) => ({ code: 0, stdout: Buffer.from(call.kind === 'ls-files' ? 'a.ts\0' : 'a'.repeat(40)), stderr: Buffer.alloc(0) }) }),
    syncTree: vi.fn(async () => ({ overBudget: 'Mirror stopped at 64 MiB; some tracked files were not read.' }))
  }
}));
vi.mock('../remote-source', () => ({ localArchSource: () => seam.source, archSourceOf: () => seam.source }));
vi.mock('../load', () => ({ loadArchDocument: async () => ({ contract: null }), keepLastValid: (_old: unknown, fresh: unknown) => fresh }));
vi.mock('../scan', () => ({ scanArchImports: async () => ({ parsed: 0, overBudget: null, imports: [], unparsed: [] }) }));
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
import { createArchCheckCoordinator } from '../check-coordinator';

it('does not record a complete scan when the remote mirror returned incomplete', async () => {
  const markScanned = vi.fn();
  const markScanPartial = vi.fn();
  const db = {
    repoState: () => ({ scannedAtCommit: null, scanIncomplete: null }),
    markScanned,
    markScanPartial
  } as unknown as ArchStore;
  const coordinator = createArchCheckCoordinator({ store: () => db, repairDrift: async () => {} });
  try {
    await coordinator.runOneCheck('/scratch-mirror', null);
    expect(seam.source.syncTree).toHaveBeenCalledOnce();
    console.log(
      JSON.stringify({
        incompleteMirror: true,
        markScannedCalls: markScanned.mock.calls,
        markScanPartialCalls: markScanPartial.mock.calls
      })
    );
    // The audit's own assertion, byte for byte.
    expect(markScanned).not.toHaveBeenCalled();
    // And what the repair put in its place, so "records nothing at all" cannot
    // pass as a fix: the stamp still lands, through the door that says the
    // answer is about part of the folder and why.
    expect(markScanPartial).toHaveBeenCalledOnce();
    expect(markScanPartial.mock.calls[0]?.[3]).toBe(
      'Mirror stopped at 64 MiB; some tracked files were not read.'
    );
  } finally {
    coordinator.dispose();
  }
});
