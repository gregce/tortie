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
