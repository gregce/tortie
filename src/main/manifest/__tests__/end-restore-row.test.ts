/**
 * What the manifest row says after an ended session is restored (Phase 26.3).
 *
 * Two facts are pinned here, against a real on-disk SQLite file, because both
 * are read back by a later process and a mocked database would test the mock.
 *
 *  1. A restore that CAME BACK clears `exitCode` and `exitSignal`, inside the
 *     same durable commit as the status. Without the clear, a restored
 *     session that later dies BY a signal shows the stale code from its
 *     earlier death, because the reaper only writes an exit cause when it has
 *     one. A restore that did NOT come back changes neither field.
 *  2. The renderer's material rule needs a main-process fact: whether a saved
 *     scrollback exists on disk. `toSession` projects `hasSavedScrollback`
 *     for 'exited' rows only, from the snapshot store's presence probe, which
 *     is mocked here because the probe's own filesystem behaviour is pinned
 *     in src/main/restore/__tests__/snapshots.test.ts.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManifestStore, toSession, type ManifestSessionRecord } from '../store';

/** What the mocked presence probe answers, settable per test. */
let material = false;
/** Session ids the probe was asked about. */
let probed: string[] = [];

vi.mock('../../restore/snapshots', () => ({
  snapshotMaterialExists: (sessionId: string) => {
    probed.push(sessionId);
    return material;
  }
}));

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-end-restore-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
  material = false;
  probed = [];
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function insert(
  id: string,
  patch: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p',
    cwd: '/p',
    agent: 'claude',
    status: 'exited',
    createdAt: now,
    lastSeen: now,
    argv: ['/usr/local/bin/claude'],
    ...patch
  });
}

describe('a successful restore erases the old death', () => {
  it('clears exitCode and exitSignal when the session came back armed', () => {
    insert('a');
    store.updateSession('a', { exitCode: 137, exitSignal: 'kill' });

    store.setRestoreResult(
      'a',
      { kind: 'armed', at: Date.now() },
      'idle',
      { tmuxName: 'a', panePid: 4242 }
    );

    const back = store.getSession('a');
    expect(back?.status).toBe('idle');
    expect(back?.exitCode).toBeUndefined();
    expect(back?.exitSignal).toBeUndefined();
    // The rest of the one-commit contract still holds.
    expect(back?.restore?.kind).toBe('armed');
    expect(back?.panePid).toBe(4242);
  });

  it('clears them for the degraded came-back kinds too', () => {
    for (const kind of ['shell_only', 'transcript'] as const) {
      const id = `deg-${kind}`;
      insert(id);
      store.updateSession(id, { exitCode: 1 });
      store.setRestoreResult(id, { kind, at: Date.now() }, 'idle');
      expect(store.getSession(id)?.exitCode).toBeUndefined();
    }
  });

  it('keeps the death when the restore did not create a session', () => {
    insert('b');
    store.updateSession('b', { exitCode: 127 });

    // The restore path never calls setRestoreResult with 'failed' (it records
    // the outcome without touching status), but the method's own contract is
    // pinned: a kind that created nothing erases nothing.
    store.setRestoreResult(
      'b',
      { kind: 'failed', at: Date.now(), reason: 'no shell' },
      'exited'
    );

    const back = store.getSession('b');
    expect(back?.exitCode).toBe(127);
    expect(back?.status).toBe('exited');
  });

  it('recordRestoreOutcome touches neither status nor the exit cause', () => {
    insert('c');
    store.updateSession('c', { exitCode: 2, exitSignal: 'term' });

    store.recordRestoreOutcome('c', {
      kind: 'failed',
      at: Date.now(),
      stage: 'create',
      reason: 'tmux said no'
    });

    const back = store.getSession('c');
    expect(back?.status).toBe('exited');
    expect(back?.exitCode).toBe(2);
    expect(back?.exitSignal).toBe('term');
    expect(back?.restore?.kind).toBe('failed');
  });

  it('survives a second connection, because the clear is in the durable commit', () => {
    insert('d');
    store.updateSession('d', { exitCode: 137, exitSignal: 'kill' });
    store.setRestoreResult('d', { kind: 'armed', at: Date.now() }, 'idle');
    store.close();

    const second = new ManifestStore(join(dir, 'manifest.db'));
    const back = second.getSession('d');
    expect(back?.exitCode).toBeUndefined();
    expect(back?.exitSignal).toBeUndefined();
    // afterEach closes the store it is left holding.
    store = second;
  });
});

describe('the projection tells the renderer whether material exists', () => {
  it('projects hasSavedScrollback for an exited row', () => {
    material = true;
    const rec = insert('e');
    expect(toSession(rec).hasSavedScrollback).toBe(true);
    expect(probed).toContain('e');

    material = false;
    expect(toSession(rec).hasSavedScrollback).toBe(false);
  });

  it('leaves the field absent on live and restorable rows', () => {
    material = true;
    const running = insert('f', { status: 'running' });
    const restorable = insert('g', { status: 'restorable' });
    expect('hasSavedScrollback' in toSession(running)).toBe(false);
    expect('hasSavedScrollback' in toSession(restorable)).toBe(false);
    // The probe is two statSync calls per ended row per broadcast. Live rows
    // must not pay it at all.
    expect(probed).toEqual([]);
  });
});
