/**
 * The ONE place a session on another machine meets the manifest (Phase 72, M5).
 *
 * Against a REAL on-disk manifest, because the whole point of this module is
 * what ends up in the database. Phase 71 refused any machine id other than
 * `local`, so a test that asserted on a composed record would have passed
 * against a build that still refused the write. This one opens the file.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionStatus } from '@shared/types';
import type { MachineTombstone } from '../../manifest/codecs';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.36.0' }
}));

const { ManifestStore } = await import('../../manifest/store');
const {
  isRemoteRecord,
  markRemoteCreateUnconfirmed,
  noteRemoteRowSeen,
  remoteManifest,
  remoteManifestInstalled,
  remoteRecordOf,
  remoteRecordsForMachine,
  remoteResumeProvenance,
  setRemoteManifest,
  tombstoneRemoteRows,
  unconfirmedRemoteRecords,
  writeRemoteRow
} = await import('../remote-record');

type Store = InstanceType<typeof ManifestStore>;

/**
 * One entry of a removal plan, in the shape `machineTombstonePlan` composes.
 *
 * Phase 118 replaced the one row write with one transaction over a list, so
 * every test below hands over a list even when it holds one row.
 */
function entry(
  sessionId: string,
  over: Partial<{
    machineId: string;
    machineLabel: string;
    lastStatus: SessionStatus;
    lastSeenAt: number;
    forgottenAt: number;
  }> = {}
): { sessionId: string; tombstone: MachineTombstone } {
  return {
    sessionId,
    tombstone: {
      v: 1,
      machineId: over.machineId ?? 'studio',
      machineLabel: over.machineLabel ?? 'Studio',
      lastStatus: over.lastStatus ?? 'running',
      lastSeenAt: over.lastSeenAt ?? CREATED_AT,
      forgottenAt: over.forgottenAt ?? CREATED_AT + 1_000
    }
  };
}

let root = '';
let store: Store;

const CREATED_AT = 1_700_000_000_000;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p72-record-'));
  userData = root;
  store = new ManifestStore(join(root, 'manifest.db'));
  setRemoteManifest(store);
});

afterEach(() => {
  setRemoteManifest(null);
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function writeOne(over: Record<string, unknown> = {}): void {
  writeRemoteRow({
    sessionId: 'sess-1',
    machineId: 'studio',
    name: 'the remote one',
    tmuxName: 'the-remote-one',
    projectPath: '/Users/them/work',
    cwd: '/Users/them/work/api',
    agent: 'claude',
    argv: ['/opt/homebrew/bin/claude', '--model', 'opus'],
    bin: '/opt/homebrew/bin/claude',
    createdAt: CREATED_AT,
    ...over
  });
}

// ---------------------------------------------------------------------------
// The write Phase 71 refused
// ---------------------------------------------------------------------------

describe('the create time row', () => {
  it('records the machine, which no build before this one could', () => {
    writeOne();
    const record = store.getSession('sess-1');
    expect(record?.machineId).toBe('studio');
    expect(isRemoteRecord(record!)).toBe(true);
  });

  /**
   * The path in `argv[0]` was read ON THAT MACHINE and means nothing here. It is
   * recorded so a person can see which copy of the program the session launched,
   * and it is never put on a command line.
   */
  it('records the absolute path that machine reported, not a local one', () => {
    writeOne();
    const record = store.getSession('sess-1');
    expect(record?.argv[0]).toBe('/opt/homebrew/bin/claude');
    expect(record?.agentContract?.bin).toBe('/opt/homebrew/bin/claude');
  });

  /**
   * `cwdReal` and `projectReal` are the paths as given rather than realpath'd,
   * because realpath is a local call and this Mac cannot resolve a path on a
   * different computer. A resolved value would name a folder here or nothing.
   */
  it('does not realpath a folder that is on another computer', () => {
    writeOne();
    const contract = store.getSession('sess-1')?.agentContract;
    expect(contract?.cwdReal).toBe('/Users/them/work/api');
    expect(contract?.projectReal).toBe('/Users/them/work');
  });

  /** Nothing to resume, and the row says why rather than leaving it empty. */
  it('has no resume command, and records that nothing was collected', () => {
    writeOne();
    const record = store.getSession('sess-1');
    expect(record?.resumeArgv).toBeUndefined();
    expect(record?.resumeCapture).toBe('unavailable');
    expect(record?.resumeProvenance?.source).toBe('remote-not-collected');
    expect(record?.resumeProvenance?.confidence).toBe('none');
  });

  /**
   * The provenance carries which machine the (absent) id belongs to, so the
   * arming gate can refuse a row fixed on a different machine without having to
   * read the row's own column a second time.
   */
  it('records which machine the provenance belongs to', () => {
    const provenance = remoteResumeProvenance({
      machineId: 'studio',
      at: CREATED_AT,
      cwd: '/Users/them/work/api'
    });
    expect((provenance as { machineId?: string }).machineId).toBe('studio');
    expect(provenance.cwd).toBe('/Users/them/work/api');
    expect(provenance.at).toBe(CREATED_AT);
  });

  it('starts at running, which is what a create about to run is', () => {
    writeOne();
    expect(store.getSession('sess-1')?.status).toBe('running');
  });

  /**
   * Every remote resume claim in this release is the same one, and the contract
   * says so rather than asking the live registry. Asking the registry on the
   * restore path is the Phase 21 defect.
   */
  it('freezes a contract that claims no resume mechanics at all', () => {
    writeOne();
    const contract = store.getSession('sess-1')?.agentContract;
    expect(contract?.resumeStrategy).toBe('none');
    expect(contract?.resumeTemplate).toEqual([]);
    expect(contract?.idCapture).toBe('none');
    expect(contract?.requiresOriginalCwd).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The reads
// ---------------------------------------------------------------------------

describe('the reads', () => {
  it('finds a row by id and by machine', () => {
    writeOne();
    writeOne({ sessionId: 'sess-2', machineId: 'laptop', name: 'the other one' });
    expect(remoteRecordOf('sess-1')?.machineId).toBe('studio');
    expect(remoteRecordsForMachine('studio').map((one) => one.id)).toEqual([
      'sess-1'
    ]);
    expect(remoteRecordsForMachine('laptop').map((one) => one.id)).toEqual([
      'sess-2'
    ]);
  });

  /** A local row is never handed to a machine caller by mistake. */
  it('never returns a row that lives on this Mac', () => {
    store.insertSession({
      id: 'local-1',
      name: 'here',
      tmuxName: 'here',
      projectPath: '/w',
      cwd: '/w',
      agent: 'shell',
      status: 'running',
      createdAt: CREATED_AT,
      argv: ['/bin/zsh'],
      lastSeen: CREATED_AT
    });
    expect(remoteRecordsForMachine('studio')).toEqual([]);
    expect(isRemoteRecord(store.getSession('local-1')!)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// What a completed pass writes
// ---------------------------------------------------------------------------

describe('what a completed list writes back', () => {
  /**
   * `last_seen` on every pass, the status only when it moved. The two are
   * different because `last_seen` is what the tombstone reads later to say when
   * Tortie last saw the session, and a value refreshed only on a change would
   * name the last time the status moved instead.
   */
  it('moves last seen on every pass and the status only when it changes', () => {
    writeOne();
    noteRemoteRowSeen('sess-1', 'running', CREATED_AT + 5_000);
    expect(store.getSession('sess-1')?.lastSeen).toBe(CREATED_AT + 5_000);
    expect(store.getSession('sess-1')?.status).toBe('running');

    noteRemoteRowSeen('sess-1', 'running', CREATED_AT + 10_000);
    expect(store.getSession('sess-1')?.lastSeen).toBe(CREATED_AT + 10_000);

    noteRemoteRowSeen('sess-1', 'restorable', CREATED_AT + 15_000);
    expect(store.getSession('sess-1')?.status).toBe('restorable');
  });

  /**
   * A late pass from a connection that has not closed yet must not undo a
   * removal a person made.
   */
  it('never moves a row whose machine a person removed', () => {
    writeOne();
    tombstoneRemoteRows([entry('sess-1')]);
    noteRemoteRowSeen('sess-1', 'running', CREATED_AT + 20_000);
    expect(store.getSession('sess-1')?.status).toBe('discarded');
  });

  /** Every remote session created by 0.34 or 0.35 has no row at all. */
  it('is a silent no-op for an id with no row', () => {
    expect(() => {
      noteRemoteRowSeen('never-written', 'running', CREATED_AT);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The tombstone
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The create whose answer was never read (Phase 117)
// ---------------------------------------------------------------------------

/**
 * The one place `unknown` is written into a session's status column, and the one
 * place it is read back from.
 *
 * A create writes its durable row before it sends the line that starts the
 * session. Before Phase 117 a create whose answer was lost deleted that row, so
 * a session running on the other machine had no record on this Mac at all. It
 * keeps the row now and this is the mark it leaves.
 */
describe('a create whose answer was never read', () => {
  it('writes unknown into the status column of the row it already wrote', () => {
    writeOne();
    expect(store.getSession('sess-1')?.status).toBe('running');
    markRemoteCreateUnconfirmed('sess-1');
    expect(store.getSession('sess-1')?.status).toBe('unknown');
  });

  it('is read back by the seed, and only for a machine that is not this Mac', () => {
    writeOne();
    writeOne({ sessionId: 'sess-2', machineId: 'studio' });
    markRemoteCreateUnconfirmed('sess-1');
    expect(unconfirmedRemoteRecords().map((one) => one.id)).toEqual(['sess-1']);
  });

  it('finds nothing while every row was confirmed', () => {
    writeOne();
    expect(unconfirmedRemoteRecords()).toEqual([]);
  });

  /**
   * The row leaves `unknown` through the write a completed pass already makes,
   * and this phase adds no second exit. A pass that held the session writes the
   * feed's own status, and a pass that proved it absent writes `restorable`.
   */
  it('is settled by the next completed pass, in both directions', () => {
    writeOne();
    markRemoteCreateUnconfirmed('sess-1');
    noteRemoteRowSeen('sess-1', 'idle', CREATED_AT + 5_000);
    expect(store.getSession('sess-1')?.status).toBe('idle');
    expect(unconfirmedRemoteRecords()).toEqual([]);

    markRemoteCreateUnconfirmed('sess-1');
    noteRemoteRowSeen('sess-1', 'restorable', CREATED_AT + 9_000);
    expect(store.getSession('sess-1')?.status).toBe('restorable');
  });

  /**
   * A person removing the machine is a durable answer, and a late create must
   * not undo it. The tombstone writes `discarded`, so a tombstoned row can never
   * be in the seed's list either.
   */
  it('never moves a row whose machine a person removed', () => {
    writeOne();
    tombstoneRemoteRows([entry('sess-1')]);
    markRemoteCreateUnconfirmed('sess-1');
    expect(store.getSession('sess-1')?.status).toBe('discarded');
    expect(unconfirmedRemoteRecords()).toEqual([]);
  });

  it('is a silent no-op for an id with no row and for no store at all', () => {
    expect(() => {
      markRemoteCreateUnconfirmed('never-written');
    }).not.toThrow();
    setRemoteManifest(null);
    expect(() => {
      markRemoteCreateUnconfirmed('sess-1');
    }).not.toThrow();
    expect(unconfirmedRemoteRecords()).toEqual([]);
    setRemoteManifest(store);
  });
});

describe('the tombstone a removed machine leaves', () => {
  it('writes the status, the removal instant and the record in one go', () => {
    writeOne();
    const written = tombstoneRemoteRows([
      entry('sess-1', {
        lastSeenAt: CREATED_AT + 3_000,
        forgottenAt: CREATED_AT + 9_000
      })
    ]);
    expect(written).toBe(1);
    const record = store.getSession('sess-1');
    expect(record?.status).toBe('discarded');
    expect(record?.removedAt).toBe(CREATED_AT + 9_000);
    expect(record?.machineTombstone?.machineLabel).toBe('Studio');
    expect(record?.machineTombstone?.lastStatus).toBe('running');
    expect(record?.machineTombstone?.lastSeenAt).toBe(CREATED_AT + 3_000);
  });

  /**
   * The label is copied in because `machines.json` no longer holds the row by
   * the time anybody reads the tombstone. A record that said "you removed a
   * machine" without naming it would be worse than none.
   */
  it('keeps the label, which nothing else can supply afterwards', () => {
    writeOne();
    tombstoneRemoteRows([
      entry('sess-1', {
        machineLabel: 'The studio upstairs',
        lastStatus: 'idle',
        lastSeenAt: 0,
        forgottenAt: CREATED_AT
      })
    ]);
    expect(store.getSession('sess-1')?.machineTombstone?.machineLabel).toBe(
      'The studio upstairs'
    );
  });

  /**
   * PHASE 118. Every row or none, and the whole point is that a failure part
   * way through leaves nothing behind.
   */
  it('writes every row of a plan in one go', () => {
    writeOne();
    writeOne({ sessionId: 'sess-2' });
    writeOne({ sessionId: 'sess-3' });
    expect(
      tombstoneRemoteRows([entry('sess-1'), entry('sess-2'), entry('sess-3')])
    ).toBe(3);
    for (const id of ['sess-1', 'sess-2', 'sess-3']) {
      expect(store.getSession(id)?.status).toBe('discarded');
    }
  });

  it('leaves every row untouched when one row of the plan fails', () => {
    writeOne();
    writeOne({ sessionId: 'sess-2' });
    writeOne({ sessionId: 'sess-3' });
    expect(() =>
      tombstoneRemoteRows(
        [entry('sess-1'), entry('sess-2'), entry('sess-3')],
        {
          beforeRow: (index) => {
            if (index === 2) throw new Error('the disk is full');
          }
        }
      )
    ).toThrow(/the disk is full/);
    // Before Phase 118 the first two rows were written and the third was not,
    // and the machines file was rewritten anyway.
    for (const id of ['sess-1', 'sess-2', 'sess-3']) {
      expect(store.getSession(id)?.status).toBe('running');
      expect(store.getSession(id)?.machineTombstone).toBeUndefined();
    }
  });

  /** A second removal must not replace what Tortie knew with what it knows now. */
  it('skips a row an earlier removal already tombstoned', () => {
    writeOne();
    expect(tombstoneRemoteRows([entry('sess-1')])).toBe(1);
    const second = tombstoneRemoteRows([
      entry('sess-1', {
        lastStatus: 'unknown',
        lastSeenAt: 0,
        forgottenAt: CREATED_AT + 60_000
      })
    ]);
    expect(second).toBe(0);
    expect(store.getSession('sess-1')?.machineTombstone?.lastStatus).toBe(
      'running'
    );
  });

  it('throws for an id with no row, and writes nothing', () => {
    writeOne();
    expect(() =>
      tombstoneRemoteRows([entry('sess-1'), entry('never-written')])
    ).toThrow();
    expect(store.getSession('sess-1')?.status).toBe('running');
  });

  it('answers 0 for an empty plan and for no store at all', () => {
    expect(tombstoneRemoteRows([])).toBe(0);
    setRemoteManifest(null);
    expect(tombstoneRemoteRows([entry('sess-1')])).toBe(0);
    setRemoteManifest(store);
  });
});

// ---------------------------------------------------------------------------
// PHASE 84, item 9. The conversation id Tortie chose itself
//
// Seven of the thirteen agents take a fresh conversation id on their own launch
// flag, and a remote create composed no such flag. So the durable row said
// nothing was collected for an agent whose id Tortie could have chosen and did
// not. This does NOT make the conversation come back on a machine, and nothing
// in the product may say it does.
// ---------------------------------------------------------------------------

describe('a row for an agent that took an id on its launch line', () => {
  const AGENT_SESSION = '99999999-8888-7777-6666-555555555555';

  function writePreassigned(): void {
    writeOne({
      agentSessionId: AGENT_SESSION,
      resumeArgv: ['/opt/homebrew/bin/claude', '--resume', AGENT_SESSION]
    });
  }

  it('records the id that is on the launch line', () => {
    writePreassigned();
    expect(store.getSession('sess-1')?.agentSessionId).toBe(AGENT_SESSION);
  });

  it('records the command that would continue that conversation', () => {
    writePreassigned();
    expect(store.getSession('sess-1')?.resumeArgv).toEqual([
      '/opt/homebrew/bin/claude',
      '--resume',
      AGENT_SESSION
    ]);
  });

  it('records where the id came from, and that it is proven', () => {
    writePreassigned();
    const provenance = store.getSession('sess-1')?.resumeProvenance;
    expect(provenance?.source).toBe('preassigned');
    expect(provenance?.confidence).toBe('exact');
    // The machine is still on it, so the arming gate can refuse a row whose id
    // belongs to a different machine without reading the row's own column.
    expect(provenance?.machineId).toBe('studio');
  });

  /**
   * `resumeCapture` STAYS `unavailable`, and PHASE 89 RE-EXAMINED IT rather than
   * leaving the old reason standing. The old reason was that `send-keys` is
   * permanently refused so nothing types the resume command. Phase 89 types it.
   *
   * THE REASON TODAY IS THAT A CREATE TIME FIELD CANNOT ANSWER A RESTORE TIME
   * QUESTION. Whether the conversation comes back on a machine is decided when
   * the restore runs, by the arming gate reading the machine and by the
   * composer reading every word of the recorded command against the compiled
   * catalogue. Writing `armed` here would promise, on the day the session
   * starts, an answer neither of those has given yet. Nothing a person reads
   * comes from this field on a remote row either, because
   * `projectRemoteRecord` does not put it on the session the renderer draws.
   */
  it('does not claim at create time that the conversation comes back', () => {
    writePreassigned();
    expect(store.getSession('sess-1')?.resumeCapture).toBe('unavailable');
  });

  it('reads the same from a fresh handle', () => {
    writePreassigned();
    store.close();
    const second = new ManifestStore(join(root, 'manifest.db'));
    try {
      expect(second.getSession('sess-1')?.agentSessionId).toBe(AGENT_SESSION);
      expect(second.getSession('sess-1')?.resumeProvenance?.source).toBe(
        'preassigned'
      );
    } finally {
      second.close();
      store = new ManifestStore(join(root, 'manifest.db'));
      setRemoteManifest(store);
    }
  });
});

describe('a row for the nine agents that do not pre-assign', () => {
  it('records what it always recorded, byte for byte', () => {
    writeOne();
    const record = store.getSession('sess-1');
    expect(record?.agentSessionId).toBeUndefined();
    expect(record?.resumeArgv).toBeUndefined();
    expect(record?.resumeCapture).toBe('unavailable');
    expect(record?.resumeProvenance?.source).toBe('remote-not-collected');
    expect(record?.resumeProvenance?.confidence).toBe('none');
  });

  it('records nothing for an empty resume command either', () => {
    writeOne({ resumeArgv: [] });
    expect(store.getSession('sess-1')?.resumeArgv).toBeUndefined();
  });
});

describe('the provenance composer', () => {
  it('says nothing was collected unless Tortie chose the id', () => {
    const plain = remoteResumeProvenance({
      machineId: 'studio',
      at: CREATED_AT,
      cwd: '/w'
    });
    expect(plain.source).toBe('remote-not-collected');
    expect(plain.confidence).toBe('none');
  });

  it('says the id was pre-assigned when Tortie chose it', () => {
    const chosen = remoteResumeProvenance({
      machineId: 'studio',
      at: CREATED_AT,
      cwd: '/w',
      preassigned: true
    });
    expect(chosen.source).toBe('preassigned');
    expect(chosen.confidence).toBe('exact');
  });
});

// ---------------------------------------------------------------------------
// The injected store
// ---------------------------------------------------------------------------

describe('the store handle', () => {
  it('answers honestly when nothing is installed', () => {
    setRemoteManifest(null);
    expect(remoteManifestInstalled()).toBe(false);
    expect(remoteRecordOf('sess-1')).toBeNull();
    expect(remoteRecordsForMachine('studio')).toEqual([]);
    expect(writeRemoteRow({
      sessionId: 'sess-9',
      machineId: 'studio',
      name: 'n',
      tmuxName: 'n',
      projectPath: '/p',
      cwd: '/p',
      agent: 'shell',
      argv: [],
      bin: '',
      createdAt: CREATED_AT
    })).toBeNull();
    expect(() => remoteManifest()).toThrow(/no manifest is installed/);
  });
});
