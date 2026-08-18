/**
 * `core.removeSession` writes the tombstone before it forgets the row
 * (Phase 84, item 3).
 *
 * WHAT WAS WRONG. The method returned as soon as `forgetRemoteRow` found the id
 * in memory, and that is true for every remote row the run created, saw or
 * ended. `markSessionRemoved` never ran, so nothing durable was written and the
 * next broadcast redrew the row reading "not running". The Remove only stuck
 * after a relaunch.
 *
 * WHY THIS FILE EXISTS AT ALL. No test in this tree covered `removeSession`,
 * local or remote. These are its first.
 *
 * HOW IT IS DRIVEN. The real method is taken off `GmuxCore.prototype` and
 * called against a small object holding the six things its body touches. That
 * is deliberate. Booting a core needs a tmux server, an attach host and a
 * control client, so a functional boot here would prove the mocks rather than
 * the method. What is under test is a small body with a real database behind
 * it, so the database is real: a `ManifestStore` in a fresh temporary
 * directory, opened again from a SECOND handle to read the answer back off the
 * disk rather than out of the first handle's memory.
 *
 * The machine layer's in memory half is stubbed, because planting a row in it
 * needs a completed list from a machine and this file has no machine.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The in memory half of the machine layer, stubbed. Only the two functions
 * `removeSession` calls are replaced; every other export stays real, because
 * `../core` imports a dozen of them at module load.
 */
const memoryRows = new Set<string>();
vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return {
    ...actual,
    isRemoteSessionId: (id: string): boolean => memoryRows.has(id),
    forgetRemoteRow: (id: string): boolean => memoryRows.delete(id)
  };
});

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
import type { ManifestSessionRecord } from '../../manifest/store';

/** The real body, borrowed. No subclass, no cast of the whole class. */
const removeSession = (
  GmuxCore.prototype as unknown as {
    removeSession: (this: unknown, sessionId: string) => void;
  }
).removeSession;

let dir: string;
let store: InstanceType<typeof ManifestStore>;
let dbPath: string;
/** Everything the borrowed body asked the core itself to do, in order. */
let calls: string[];

/** The object the borrowed body runs against. */
function host(): unknown {
  return {
    manifest: store,
    idCaptureWatches: new Map<string, { cancel: () => void }>(),
    releaseSessionResources(sessionId: string): void {
      calls.push(`release:${sessionId}`);
    },
    broadcastSessions(): void {
      calls.push('broadcast');
    },
    mustGetSession(sessionId: string): ManifestSessionRecord {
      const rec = store.getSession(sessionId);
      if (rec === undefined) throw new Error(`No session ${sessionId}.`);
      calls.push(`mustGet:${sessionId}`);
      return rec;
    }
  };
}

function row(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return store.insertSession({
    id: 'seed',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'shell',
    status: 'running',
    createdAt: 1,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 1,
    ...over
  } as ManifestSessionRecord);
}

/** What the disk says, read through a handle this test opened after the write. */
function readBackFromAFreshHandle(sessionId: string): string | null {
  const second = new ManifestStore(dbPath);
  try {
    return second.getSession(sessionId)?.status ?? null;
  } finally {
    second.close();
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p84-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  setRemoteManifest(store);
  memoryRows.clear();
  calls = [];
});

afterEach(() => {
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('a session on another machine, with a record of it', () => {
  it('is tombstoned on disk, and a second handle reads the tombstone', () => {
    row({ id: 'remote-1', machineId: 'studio' });
    memoryRows.add('remote-1');

    removeSession.call(host(), 'remote-1');

    expect(store.getSession('remote-1')?.status).toBe('discarded');
    expect(readBackFromAFreshHandle('remote-1')).toBe('discarded');
  });

  it('writes the durable half BEFORE it forgets the row in memory', () => {
    row({ id: 'remote-2', machineId: 'studio' });
    memoryRows.add('remote-2');

    // The release call is the last step of the durable half, so an order that
    // put the memory half first would show `broadcast` ahead of it.
    removeSession.call(host(), 'remote-2');

    expect(calls).toEqual(['release:remote-2', 'broadcast']);
    expect(memoryRows.has('remote-2')).toBe(false);
  });

  it('sticks even when the row was never in this run’s memory', () => {
    // A machine that has not answered in this run holds no memory row, and the
    // durable half is the whole of what such a row needs.
    row({ id: 'remote-3', machineId: 'studio' });

    removeSession.call(host(), 'remote-3');

    expect(readBackFromAFreshHandle('remote-3')).toBe('discarded');
    expect(calls).toEqual(['release:remote-3', 'broadcast']);
  });
});

describe('a session on another machine with no record of it', () => {
  it('is forgotten, nothing is written, and nothing throws', () => {
    // The shape every session created by 0.34 and 0.35 has.
    memoryRows.add('legacy-1');

    expect(() => removeSession.call(host(), 'legacy-1')).not.toThrow();

    expect(store.getSession('legacy-1')).toBeUndefined();
    expect(memoryRows.has('legacy-1')).toBe(false);
    expect(calls).toEqual(['broadcast']);
  });
});

describe('a session on this Mac', () => {
  it('takes the local path, and is tombstoned exactly once', () => {
    row({ id: 'local-1', machineId: 'local' });

    removeSession.call(host(), 'local-1');

    expect(calls).toEqual(['mustGet:local-1', 'release:local-1']);
    expect(readBackFromAFreshHandle('local-1')).toBe('discarded');
  });

  it('takes the local path for a row written before machines existed', () => {
    row({ id: 'old-1' });
    expect(store.getSession('old-1')?.machineId).toBe('local');

    removeSession.call(host(), 'old-1');

    expect(calls).toEqual(['mustGet:old-1', 'release:old-1']);
    expect(readBackFromAFreshHandle('old-1')).toBe('discarded');
  });
});

describe('an id nothing holds', () => {
  it('is refused, exactly as it always was', () => {
    expect(() => removeSession.call(host(), 'nobody')).toThrow(/no session/i);
    expect(calls).toEqual([]);
  });
});
