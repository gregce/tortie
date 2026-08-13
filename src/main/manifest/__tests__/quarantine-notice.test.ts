/**
 * Telling the user their session list was damaged (Phase 19 items 5 and 9).
 *
 * Item 5 shipped the check, the quarantine and the rebuild, and it shipped
 * them behind a `console.error` that nobody running the packaged app can read.
 * The user's whole restore story is in that file. A quarantine they cannot
 * find is indistinguishable from a delete, so the path has to reach them.
 *
 * The database is damaged for real, on disk, the same way item 5's own tests
 * damage it. Nothing here is mocked except the broadcast, which is where the
 * assertion is made.
 */

import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { DurabilityNotice } from '@shared/notice';

const sent: DurabilityNotice[] = [];
vi.mock('../../typed-events', () => ({
  broadcastEvent: (_channel: string, notice: DurabilityNotice) => {
    sent.push(notice);
  }
}));

const { ManifestStore } = await import('../store');
const { resetDurabilityNoticesForTests, takePendingNotices } = await import(
  '../../notice'
);

/** SQLite's default page size, and the one every file here is written at. */
const PAGE_SIZE = 4096;

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-quarantine-notice-'));
  dbPath = join(dir, 'manifest.db');
  sent.length = 0;
  resetDurabilityNoticesForTests();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Notices posted, whether or not a renderer was listening. */
function posted(): DurabilityNotice[] {
  return [...sent, ...takePendingNotices()];
}

/**
 * Write over the first eight bytes of the cell pointer array on the root page
 * of an index, and prove the file changed before asserting anything saw it.
 */
function smashIndexRootPage(path: string, indexName: string): void {
  const before = readFileSync(path);
  const ro = new Database(path, { readonly: true, fileMustExist: true });
  const root = ro
    .prepare<[string], { rootpage: number }>(
      'SELECT rootpage FROM sqlite_master WHERE name = ?'
    )
    .get(indexName);
  ro.close();
  if (!root) throw new Error(`no index named ${indexName}`);

  const fd = openSync(path, 'r+');
  writeSync(
    fd,
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    0,
    8,
    (root.rootpage - 1) * PAGE_SIZE + 8
  );
  closeSync(fd);
  expect(readFileSync(path).equals(before)).toBe(false);
}

/** A manifest with enough rows that the index has a root page worth smashing. */
function seed(): string {
  const store = new ManifestStore(dbPath);
  const now = Date.now();
  for (let i = 0; i < 60; i += 1) {
    store.insertSession({
      id: `s-${String(i)}`,
      name: `session-${String(i)}`,
      tmuxName: `session-${String(i)}`,
      projectPath: dir,
      cwd: dir,
      agent: 'shell',
      status: 'running',
      createdAt: now,
      lastSeen: now,
      argv: ['/bin/zsh'],
      env: {}
    });
  }
  store.close();
  // The WAL has to be folded in, or the damage lands in a file SQLite is
  // about to rebuild from the log and the check passes.
  const closer = new Database(dbPath);
  closer.pragma('wal_checkpoint(TRUNCATE)');
  closer.close();
  return dbPath;
}

describe('opening a damaged manifest', () => {
  it('tells the user, and hands them the path the damaged copy went to', () => {
    seed();
    smashIndexRootPage(dbPath, 'idx_sessions_tmux_name');

    const store = new ManifestStore(dbPath);
    store.close();

    const out = posted();
    expect(out).toHaveLength(1);
    const notice = out[0];
    expect(notice?.kind).toBe('manifest-quarantined');
    if (notice?.kind !== 'manifest-quarantined') return;
    // The path is the point of the notice. It must name a file that is there.
    expect(notice.quarantinePath).toContain('manifest.db.damaged-');
    expect(readFileSync(notice.quarantinePath).length).toBeGreaterThan(0);
  });

  it('says nothing at all when the file is healthy', () => {
    seed();
    const store = new ManifestStore(dbPath);
    store.close();
    expect(posted()).toEqual([]);
  });

  it('says nothing when there is no file yet, which is a first launch', () => {
    const store = new ManifestStore(dbPath);
    store.close();
    expect(posted()).toEqual([]);
  });
});
