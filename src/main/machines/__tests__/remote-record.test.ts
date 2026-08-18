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

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.36.0' }
}));

const { ManifestStore } = await import('../../manifest/store');
const {
  isRemoteRecord,
  noteRemoteRowSeen,
  remoteManifest,
  remoteManifestInstalled,
  remoteRecordOf,
  remoteRecordsForMachine,
  remoteResumeProvenance,
  setRemoteManifest,
  tombstoneRemoteRow,
  writeRemoteRow
} = await import('../remote-record');

type Store = InstanceType<typeof ManifestStore>;

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
    tombstoneRemoteRow('sess-1', {
      v: 1,
      machineId: 'studio',
      machineLabel: 'Studio',
      lastStatus: 'running',
      lastSeenAt: CREATED_AT,
      forgottenAt: CREATED_AT + 1_000
    });
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

describe('the tombstone a removed machine leaves', () => {
  it('writes the status, the removal instant and the record in one go', () => {
    writeOne();
    const ok = tombstoneRemoteRow('sess-1', {
      v: 1,
      machineId: 'studio',
      machineLabel: 'Studio',
      lastStatus: 'running',
      lastSeenAt: CREATED_AT + 3_000,
      forgottenAt: CREATED_AT + 9_000
    });
    expect(ok).toBe(true);
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
    tombstoneRemoteRow('sess-1', {
      v: 1,
      machineId: 'studio',
      machineLabel: 'The studio upstairs',
      lastStatus: 'idle',
      lastSeenAt: 0,
      forgottenAt: CREATED_AT
    });
    expect(store.getSession('sess-1')?.machineTombstone?.machineLabel).toBe(
      'The studio upstairs'
    );
  });

  /** A second removal must not replace what Tortie knew with what it knows now. */
  it('refuses to write a second tombstone over the first', () => {
    writeOne();
    tombstoneRemoteRow('sess-1', {
      v: 1,
      machineId: 'studio',
      machineLabel: 'Studio',
      lastStatus: 'running',
      lastSeenAt: CREATED_AT,
      forgottenAt: CREATED_AT
    });
    const second = tombstoneRemoteRow('sess-1', {
      v: 1,
      machineId: 'studio',
      machineLabel: 'Studio',
      lastStatus: 'unknown',
      lastSeenAt: 0,
      forgottenAt: CREATED_AT + 60_000
    });
    expect(second).toBe(false);
    expect(store.getSession('sess-1')?.machineTombstone?.lastStatus).toBe(
      'running'
    );
  });

  it('answers false for an id with no row', () => {
    expect(
      tombstoneRemoteRow('never-written', {
        v: 1,
        machineId: 'studio',
        machineLabel: 'Studio',
        lastStatus: 'running',
        lastSeenAt: 0,
        forgottenAt: CREATED_AT
      })
    ).toBe(false);
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
