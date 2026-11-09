/**
 * Phase 302 (build/p353/SPEC.md §4.1 step 4, D302-1). The repository's one
 * clause: a status patch over a tombstone keeps the row's own status.
 *
 * THE DEFECT. `updateSession` merges a patch onto a FRESH read and writes
 * `removed_at` back from that read, so before this clause ANY status patch on
 * a removed row kept the removal date beside the new status. Such a row is in
 * neither list a person can reach it from correctly: Past Sessions reads
 * `status === 'discarded'` and drops it, the managed list skips only
 * `discarded` and draws it, and the 90 day prune asks for both and never
 * collects it. Two writers produced exactly that at the parent (the End and the
 * reaper, build/p353/SPEC.md §2.4); they re-read now, and this clause is the
 * one place every other writer passes through.
 *
 * THE INVARIANT IT KEEPS, in Phase 305's words: a row carrying `removed_at`
 * belongs to the person, and only a Restore from Past or the 90 day prune may
 * change that.
 *
 * Every reading is the DISK, through a second handle opened after the write,
 * so a clause that corrected the returned record and wrote the patch anyway
 * (the clause asked after the UPDATE, `ablation:p293`'s entry K2) reads red.
 *
 * RULE ID R302a, in every title, which is what `ablation:p293` reads to prove
 * this clause can go red on its own.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STATUSES, type SessionStatus } from '@shared/types';
import { ManifestStore, type ManifestSessionRecord } from '../store';

let dir: string;
let dbPath: string;
let store: ManifestStore;
let warned: string[];

/** A removal a minute old; a second handle's open prunes tombstones past 90 days. */
const REMOVED_AT = Date.now() - 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p302-clause-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  warned = [];
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warned.push(args.join(' '));
  });
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function row(id: string, over: Partial<ManifestSessionRecord> = {}): void {
  store.insertSession({
    id,
    name: `secret-name-${id}`,
    tmuxName: id,
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'shell',
    status: 'exited',
    createdAt: 1,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 1,
    ...over
  });
}

/** A row the person removed: Remove's own write, through the store. */
function removed(id: string, status: SessionStatus = 'exited'): void {
  row(id, { status });
  store.markSessionRemoved(id, REMOVED_AT);
}

/** What the DISK says, through a handle opened after the write. */
function onDisk(id: string): ManifestSessionRecord | undefined {
  const second = new ManifestStore(dbPath);
  try {
    return second.getSession(id);
  } finally {
    second.close();
  }
}

const pair = (rec: ManifestSessionRecord | undefined): string =>
  rec === undefined ? 'GONE' : `${rec.status},${rec.removedAt === undefined ? '-' : String(rec.removedAt)}`;

const refusals = (): string[] => warned.filter((l) => l.includes('a removed session keeps its status'));

describe('R302a: a status patch over a tombstone keeps the row’s own status', () => {
  it.each(SESSION_STATUSES.filter((s) => s !== 'discarded'))(
    'a %s patch on a removed row leaves it discarded, with its removal date',
    (status) => {
      removed('gone');
      const returned = store.updateSession('gone', { status });
      // RED AT THE PARENT, where this read `${status},${REMOVED_AT}`.
      expect(pair(onDisk('gone'))).toBe(`discarded,${String(REMOVED_AT)}`);
      // The record handed back is what the row now holds.
      expect(pair(returned)).toBe(`discarded,${String(REMOVED_AT)}`);
    }
  );

  it('setStatus, the End’s own write, keeps the tombstone and still records the instant', () => {
    removed('gone');
    const before = Date.now();
    store.setStatus('gone', 'exited');
    const disk = onDisk('gone');
    expect(pair(disk)).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(disk?.lastSeen).toBeGreaterThanOrEqual(before);
  });

  it('the rest of the patch is written: only the status half is refused', () => {
    removed('gone');
    store.updateSession('gone', {
      status: 'exited',
      lastSeen: 42,
      exitCode: 3,
      exitSignal: 'term',
      exitDetail: 'the last words'
    });
    const disk = onDisk('gone');
    expect(pair(disk)).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(disk?.lastSeen).toBe(42);
    expect(disk?.exitCode).toBe(3);
    expect(disk?.exitSignal).toBe('term');
    expect(disk?.exitDetail).toBe('the last words');
  });

  it('a failed restore’s `restorable` over a tombstone keeps it too (the entry’s census, item 4)', () => {
    // `setRestoreResult` passes clearRemovedAt only when the session came back,
    // so this is the one shape in the tree that wrote exactly `restorable`
    // beside a removal date. Unreachable today; refused here whatever reaches it.
    removed('gone');
    store.setRestoreResult('gone', { kind: 'failed', at: 5, reason: 'x' }, 'restorable');
    expect(pair(onDisk('gone'))).toBe(`discarded,${String(REMOVED_AT)}`);
  });

  it('says so in ONE log line that names the id and the refused status and nothing else of the row', () => {
    removed('gone');
    store.updateSession('gone', { status: 'running' });
    expect(refusals()).toHaveLength(1);
    expect(refusals()[0]).toContain('id=gone');
    expect(refusals()[0]).toContain('refused=running');
    expect(refusals()[0]).not.toContain('secret-name');
    expect(refusals()[0]).not.toContain('/repo');
  });

  it('never throws, and the store stays usable', () => {
    removed('gone');
    expect(() => store.updateSession('gone', { status: 'idle' })).not.toThrow();
    expect(() => store.setStatus('gone', 'needs_input')).not.toThrow();
    row('next', { status: 'running' });
    expect(store.getSession('next')?.status).toBe('running');
  });
});

describe('R302a: what the clause leaves alone', () => {
  it('a row with no removal date takes every status exactly as before, with no log line', () => {
    for (const status of SESSION_STATUSES) {
      row(`plain-${status}`, { status: 'running' });
      store.updateSession(`plain-${status}`, { status });
      expect(pair(onDisk(`plain-${status}`))).toBe(`${status},-`);
    }
    expect(refusals()).toEqual([]);
  });

  it('`discarded` over a tombstone is written, so a removal written again is what it always was', () => {
    // A row that already reads something else beside its removal date (this
    // build no longer writes one; an older build did) can be removed again.
    removed('broken');
    const db = (store as unknown as { db: { prepare(sql: string): { run(...a: unknown[]): unknown } } }).db;
    db.prepare("UPDATE sessions SET status = 'exited' WHERE id = ?").run('broken');
    expect(pair(onDisk('broken'))).toBe(`exited,${String(REMOVED_AT)}`);
    store.updateSession('broken', { status: 'discarded' });
    expect(pair(onDisk('broken'))).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(refusals()).toEqual([]);
  });

  // PHASE 353's FIX ROUND (the records lens). ONLY A TOMBSTONE: a row an
  // earlier build left reading another status beside its removal date (the
  // parent's own remote Restore from Past left `running` there) moves exactly
  // as it did at the parent. Refusing it froze such a row at `running` after
  // its far session ended. No heal is written (D302-6).
  it.each(SESSION_STATUSES.filter((s) => s !== 'discarded'))(
    'a row an earlier build left reading %s beside its removal date takes a status patch as it did there',
    (status) => {
      removed('older');
      const db = (store as unknown as { db: { prepare(sql: string): { run(...a: unknown[]): unknown } } }).db;
      db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, 'older');
      const next = status === 'restorable' ? 'exited' : 'restorable';
      store.updateSession('older', { status: next });
      expect(pair(onDisk('older'))).toBe(`${next},${String(REMOVED_AT)}`);
      expect(refusals()).toEqual([]);
    }
  );

  it('the remote Restore from Past’s one write (its name, running, clearRemovedAt) brings a tombstone back out of Past', () => {
    // src/main/machines/remote-restore.ts step 8, the patch and the option as
    // it hands them; `p342-far-names.test.ts` R302d drives the restore itself.
    removed('far');
    store.updateSession('far', { tmuxName: 'far-2', status: 'running', lastSeen: 5 }, { clearRemovedAt: true });
    const disk = onDisk('far');
    expect(pair(disk)).toBe('running,-');
    expect(disk?.tmuxName).toBe('far-2');
    expect(refusals()).toEqual([]);
  });

  it('the same write WITHOUT clearRemovedAt keeps the tombstone, which is why the restore names it', () => {
    removed('far');
    store.updateSession('far', { tmuxName: 'far-2', status: 'running', lastSeen: 5 });
    expect(pair(onDisk('far'))).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(refusals()).toHaveLength(1);
  });

  it('a patch that names the row’s own status over a tombstone writes and says nothing', () => {
    removed('gone');
    store.updateSession('gone', { status: 'discarded', lastSeen: 7 });
    expect(pair(onDisk('gone'))).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(onDisk('gone')?.lastSeen).toBe(7);
    expect(refusals()).toEqual([]);
  });

  it('a patch with no status over a tombstone writes its fields and keeps the tombstone', () => {
    removed('gone');
    store.renameSession('gone', 'renamed', 'renamed');
    const disk = onDisk('gone');
    expect(pair(disk)).toBe(`discarded,${String(REMOVED_AT)}`);
    expect(disk?.name).toBe('renamed');
    expect(refusals()).toEqual([]);
  });

  it.each(['shell_only', 'transcript', 'armed'] as const)(
    'a Restore from Past that came back (%s) still clears the removal date and writes its status',
    (kind) => {
      removed('back');
      store.setRestoreResult('back', { kind, at: 5 }, 'running');
      expect(pair(onDisk('back'))).toBe('running,-');
      expect(refusals()).toEqual([]);
    }
  );

  it('a Remove still writes the tombstone over any status', () => {
    for (const status of SESSION_STATUSES) {
      row(`rm-${status}`, { status });
      store.markSessionRemoved(`rm-${status}`, REMOVED_AT);
      expect(pair(onDisk(`rm-${status}`))).toBe(`discarded,${String(REMOVED_AT)}`);
    }
  });

  it('the 90 day prune still collects an old tombstone, and keeps a young one', () => {
    row('old');
    store.markSessionRemoved('old', Date.now() - 91 * DAY_MS);
    removed('young');
    // The prune runs at open, which the second handle is.
    expect(onDisk('old')).toBeUndefined();
    expect(pair(onDisk('young'))).toBe(`discarded,${String(REMOVED_AT)}`);
  });
});
