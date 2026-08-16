/**
 * reconcile() — identity, not names (Phase 12.7 F1, research 21 §6).
 *
 * The bug these pin down was REPRODUCED against the live server: gmux
 * renamed one of its own sessions, a foreign session took the freed name,
 * and reconcile adopted the stranger as the manifest row — after which
 * killing that row killed the stranger and left gmux's own session running.
 *
 * The store is exercised against a real on-disk SQLite file (a temp dir);
 * these are not mocks.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ManifestStore,
  type LiveTmuxSession,
  type ManifestSessionRecord
} from '../store';

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-manifest-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function row(id: string, tmuxName: string): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: tmuxName,
    tmuxName,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'running',
    createdAt: now,
    argv: ['/bin/zsh'],
    lastSeen: now
  });
}

const live = (
  tmuxId: string,
  tmuxName: string,
  gmuxId?: string
): LiveTmuxSession =>
  gmuxId === undefined
    ? { tmuxId, tmuxName }
    : { tmuxId, tmuxName, gmuxId };

describe('reconcile — claiming', () => {
  it('claims a row by @gmux-id even when the tmux name has changed', () => {
    row('id-a', 'work');
    const result = store.reconcile([live('$1', 'work-renamed-elsewhere', 'id-a')]);

    expect(result.alive.map((r) => r.id)).toEqual(['id-a']);
    expect(result.restorable).toEqual([]);
    expect(result.bindings.get('id-a')).toBe('$1');
    // tmux is truth for names — the row follows, instead of being disowned.
    expect(store.getSession('id-a')?.tmuxName).toBe('work-renamed-elsewhere');
  });

  it('does NOT adopt a foreign session that took the row name', () => {
    row('id-a', 'work');
    const result = store.reconcile([live('$99', 'work')]); // no @gmux-id

    expect(result.alive).toEqual([]);
    expect(result.bindings.size).toBe(0);
    expect(result.restorable.map((r) => r.id)).toEqual(['id-a']);
    expect(store.getSession('id-a')?.status).toBe('restorable');
    expect(result.unknownTmuxNames).toEqual(['work']);
  });

  it('keeps the real session when a stranger holds its old name', () => {
    // The exact reproduction: $334 is ours (renamed), $336 is the squatter.
    row('id-a', 'gm2');
    const result = store.reconcile([
      live('$334', 'gm2-orig', 'id-a'),
      live('$336', 'gm2')
    ]);

    expect(result.bindings.get('id-a')).toBe('$334');
    expect(result.unknownTmuxNames).toEqual(['gm2']);
  });

  it('ignores a session stamped with an id from another manifest', () => {
    row('id-a', 'work');
    const result = store.reconcile([live('$5', 'work', 'someone-elses-uuid')]);

    expect(result.bindings.size).toBe(0);
    expect(result.restorable.map((r) => r.id)).toEqual(['id-a']);
    expect(result.unknownTmuxNames).toEqual(['work']);
  });

  it('never binds two live sessions to one row', () => {
    row('id-a', 'work');
    const result = store.reconcile([
      live('$1', 'work', 'id-a'),
      live('$2', 'work-2', 'id-a')
    ]);

    expect(result.bindings.get('id-a')).toBe('$1');
    expect(result.unknownTmuxNames).toEqual(['work-2']);
  });
});

describe('reconcile — statuses', () => {
  it('flips a claimed restorable row back to running', () => {
    row('id-a', 'work');
    store.setStatus('id-a', 'restorable');
    store.reconcile([live('$1', 'work', 'id-a')]);
    expect(store.getSession('id-a')?.status).toBe('running');
  });

  it('leaves exited rows alone and reports them', () => {
    row('id-a', 'work');
    store.setStatus('id-a', 'exited');
    const result = store.reconcile([]);
    expect(result.exited.map((r) => r.id)).toEqual(['id-a']);
    expect(store.getSession('id-a')?.status).toBe('exited');
  });

  it('marks every unclaimed row restorable when the server is gone (T2)', () => {
    row('id-a', 'a');
    row('id-b', 'b');
    const result = store.reconcile([]);
    expect(result.restorable.map((r) => r.id).sort()).toEqual(['id-a', 'id-b']);
  });

  /**
   * PHASE 48 FIX ROUND. This flip is the SECOND way a row leaves 'exited',
   * beside `setRestoreResult`, and only that one cleared the exit cause. A row
   * that came back here kept the code, the signal and, since Phase 48, the
   * words of a process that is no longer the one running. If that row then
   * died a second time in silence, the reader saw the first death's sentence
   * under the second death's number.
   */
  it('clears the whole exit cause when it flips an exited row back to running', () => {
    row('id-a', 'work');
    store.updateSession('id-a', {
      status: 'exited',
      exitCode: 127,
      exitSignal: 'term',
      exitDetail: 'env: node: No such file or directory'
    });
    store.reconcile([live('$1', 'work', 'id-a')]);
    const rec = store.getSession('id-a');
    expect(rec?.status).toBe('running');
    expect(rec?.exitCode).toBeUndefined();
    expect(rec?.exitSignal).toBeUndefined();
    expect(rec?.exitDetail).toBeUndefined();
  });

  it('leaves the exit cause alone on a row that was already running', () => {
    // No flip, so no clear. A row that reconcile merely refreshes must not
    // have anything deleted from it.
    row('id-a', 'work');
    store.updateSession('id-a', { exitCode: 3 });
    store.reconcile([live('$1', 'work', 'id-a')]);
    expect(store.getSession('id-a')?.exitCode).toBe(3);
  });
});

/**
 * Phase 16.5.1. reconcile() is the function that decides a session is
 * unreachable, and its evidence — the caller's tmux list — is taken BEFORE a
 * long identity pass (one `show-environment` per foreign session; 44 of them
 * on the author's machine). A session created during that pass is absent from
 * the list because the list predates it, not because it is gone. Measured
 * before the fix: `GMUX_SMOKE=create` failed 3 of 5 runs with
 * SESSION_NOT_FOUND / "status: restorable" on a demonstrably live session.
 */
describe('reconcile — rows newer than the snapshot', () => {
  const rowAt = (
    id: string,
    tmuxName: string,
    createdAt: number,
    lastSeen = createdAt
  ): ManifestSessionRecord =>
    store.insertSession({
      id,
      name: tmuxName,
      tmuxName,
      projectPath: '/w',
      cwd: '/w',
      agent: 'shell',
      status: 'running',
      createdAt,
      argv: ['/bin/zsh'],
      lastSeen
    });

  it('does NOT mark a row created after the snapshot restorable', () => {
    const snapshotAt = 1_000_000;
    rowAt('id-new', 'brand-new', snapshotAt + 5);

    const result = store.reconcile([], { snapshotAt });

    expect(store.getSession('id-new')?.status).toBe('running');
    expect(result.restorable).toEqual([]);
    expect(result.skipped.map((s) => [s.record.id, s.reason])).toEqual([
      ['id-new', 'created-after-snapshot']
    ]);
  });

  it('treats the same millisecond as unproven and skips it', () => {
    const snapshotAt = 1_000_000;
    rowAt('id-tie', 'tie', snapshotAt);

    store.reconcile([], { snapshotAt });

    expect(store.getSession('id-tie')?.status).toBe('running');
  });

  it('does NOT mark a row proven live after the snapshot restorable', () => {
    const snapshotAt = 1_000_000;
    rowAt('id-restored', 'restored', snapshotAt - 5_000, snapshotAt + 5);

    const result = store.reconcile([], { snapshotAt });

    expect(store.getSession('id-restored')?.status).toBe('running');
    expect(result.skipped.map((s) => s.reason)).toEqual([
      'touched-after-snapshot'
    ]);
  });

  it('does NOT judge a row the caller says is mid-create', () => {
    // The row was written BEFORE the snapshot (§2.4 Step 0 writes it first)
    // and its tmux session appears after — createdAt alone cannot save it.
    const snapshotAt = 1_000_000;
    rowAt('id-creating', 'creating', snapshotAt - 5);

    const result = store.reconcile([], {
      snapshotAt,
      inFlightIds: new Set(['id-creating'])
    });

    expect(store.getSession('id-creating')?.status).toBe('running');
    expect(result.skipped.map((s) => s.reason)).toEqual(['in-flight']);
  });

  it('still marks an older, untouched, unclaimed row restorable', () => {
    const snapshotAt = 1_000_000;
    rowAt('id-old', 'old', snapshotAt - 60_000);

    const result = store.reconcile([], { snapshotAt });

    expect(store.getSession('id-old')?.status).toBe('restorable');
    expect(result.restorable.map((r) => r.id)).toEqual(['id-old']);
    expect(result.skipped).toEqual([]);
  });

  it('claims a new row normally when it IS in the snapshot', () => {
    const snapshotAt = 1_000_000;
    rowAt('id-new', 'brand-new', snapshotAt + 5);

    const result = store.reconcile([live('$7', 'brand-new', 'id-new')], {
      snapshotAt
    });

    expect(result.bindings.get('id-new')).toBe('$7');
    expect(result.skipped).toEqual([]);
  });
});

describe('death forensics (migration 003)', () => {
  it('round-trips exit_signal and pane_pid', () => {
    row('id-a', 'work');
    store.updateSession('id-a', { panePid: 4242 });
    store.updateSession('id-a', { status: 'exited', exitSignal: 'term' });

    const rec = store.getSession('id-a');
    expect(rec?.exitSignal).toBe('term');
    expect(rec?.panePid).toBe(4242);
    // A signal death has NO exit code — the field must stay absent, not 0.
    expect(rec?.exitCode).toBeUndefined();
  });
});
