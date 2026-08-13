/**
 * The boot path's two manifest steps (Phase 20, integration).
 *
 * `prepareManifestForBoot` is the piece four builders each left to the
 * integrator, and it is the piece that decides whether the ring protects
 * anything. Until it existed the ring was written on every launch and read on
 * none.
 *
 * The headline test is `a damaged manifest comes back from the ring rather than
 * from a page walk`. It is the ordering research 33 asks for and the one that is
 * easy to get backwards: `.recover` gives back whatever it could read and cannot
 * say what is missing, while a generation was proved complete table by table
 * when it was taken. So the ring is asked first and `.recover` stays the last
 * resort.
 *
 * Everything here runs against real SQLite files in a temporary directory.
 * Nothing mocks a database.
 */

import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

const { prepareManifestForBoot, startManifestRing } = await import('../boot');
const { captureManifestBackup, readBackupIndex } = await import('../recovery');
const { ManifestStore, defaultManifestDbPath } = await import('../store');
// The real notice module, not a mock. Its once-per-run latch is half of what
// the failure test below is asserting, and a mock would assert the mock.
const { resetDurabilityNoticesForTests, takePendingNotices } = await import(
  '../../notice'
);

let root = '';
let dbPath = '';
let dir = '';

/** A manifest with `count` real session rows, written through the real store. */
function seed(count: number): string[] {
  const store = new ManifestStore(dbPath);
  const ids: string[] = [];
  try {
    for (let i = 1; i <= count; i += 1) {
      const id = `0000000${String(i)}-0000-4000-8000-000000000000`;
      store.insertSession({
        id,
        name: `session-${String(i)}`,
        projectPath: '/tmp/project',
        cwd: '/tmp/project',
        agent: 'shell',
        argv: ['/bin/zsh', '-l'],
        tmuxName: `session-${String(i)}`,
        status: 'running',
        createdAt: 1_700_000_000_000 + i,
        lastSeen: 1_700_000_000_000 + i
      });
      ids.push(id);
    }
  } finally {
    store.close();
  }
  return ids;
}

/** Read the session ids straight out of a file, with no store in the way. */
function idsIn(path: string): string[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return (db.prepare('SELECT id FROM sessions ORDER BY id').all() as { id: string }[]).map(
      (r) => r.id
    );
  } finally {
    db.close();
  }
}

/** Overwrite the page after the header with rubbish. Damaged, not missing. */
function damage(path: string): void {
  const bytes = readFileSync(path);
  bytes.fill(0x5a, 4096, Math.min(8192, bytes.length));
  writeFileSync(path, bytes);
}

beforeEach(() => {
  resetDurabilityNoticesForTests();
  root = mkdtempSync(join(tmpdir(), 'gmux-boot-'));
  userData = join(root, 'profile');
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  dbPath = defaultManifestDbPath();
  dir = join(userData, 'gmux', 'backups');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('prepareManifestForBoot', () => {
  it('leaves a healthy manifest exactly where it is', async () => {
    const ids = seed(3);
    const before = readFileSync(dbPath);

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.before).toBe('present');
    expect(report.quarantinedTo).toBeNull();
    expect(report.restoredGeneration).toBeNull();
    expect(readFileSync(dbPath).equals(before)).toBe(true);
    expect(idsIn(dbPath)).toEqual([...ids].sort());
  });

  it('says so and writes nothing when there is no manifest and no ring', async () => {
    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.before).toBe('absent');
    expect(existsSync(dbPath)).toBe(false);
    expect(report.lines.join(' ')).toContain('no verified backup');
  });

  it('puts a verified generation back when the manifest has gone', async () => {
    const ids = seed(4);
    await captureManifestBackup({ source: dbPath, dir, reason: 'manual' });
    rmSync(dbPath);
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.before).toBe('restored');
    expect(report.restoredGeneration).toBe(1);
    expect(idsIn(dbPath)).toEqual([...ids].sort());
  });

  it('a damaged manifest comes back from the ring rather than from a page walk', async () => {
    const ids = seed(5);
    await captureManifestBackup({ source: dbPath, dir, reason: 'manual' });
    damage(dbPath);

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.before).toBe('restored');
    expect(report.restoredGeneration).toBe(1);
    // Every row, not the rows a page walk happened to reach.
    expect(idsIn(dbPath)).toEqual([...ids].sort());
    // And the app can open what was put there.
    const store = new ManifestStore(dbPath);
    try {
      expect(store.listSessions()).toHaveLength(5);
    } finally {
      store.close();
    }
  });

  it('never deletes the damaged file, it moves it and says where', async () => {
    seed(2);
    await captureManifestBackup({ source: dbPath, dir, reason: 'manual' });
    damage(dbPath);
    const damagedBytes = readFileSync(dbPath);

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.quarantinedTo).not.toBeNull();
    const moved = report.quarantinedTo ?? '';
    expect(existsSync(moved)).toBe(true);
    expect(readFileSync(moved).equals(damagedBytes)).toBe(true);
    // The quarantine name must not end in `.db`: the rename migration treats a
    // `.db` as a database and would try to snapshot the wreck on every upgrade.
    expect(moved.endsWith('.db')).toBe(false);
    expect(report.lines.join(' ')).toContain(moved);
  });

  it('leaves a damaged manifest for Phase 19s gate when the ring is empty', async () => {
    seed(2);
    damage(dbPath);
    const damagedBytes = readFileSync(dbPath);

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    // Not moved, not restored, still exactly where the store's own integrity
    // gate will find it. Moving it here with nothing to put in its place would
    // take the `.recover` rebuild away from the user for no gain.
    expect(report.before).toBe('left-alone');
    expect(report.quarantinedTo).toBeNull();
    expect(readFileSync(dbPath).equals(damagedBytes)).toBe(true);
  });

  it('refuses to act on a manifest it could not read', async () => {
    seed(2);
    await captureManifestBackup({ source: dbPath, dir, reason: 'manual' });
    const before = readFileSync(dbPath);
    // Mode 000 is "could not read", which is a different verdict from damaged
    // and must not produce a quarantine. A pristine manifest in a directory at
    // mode 500 was once reported to the operator as damaged.
    const { chmodSync } = await import('node:fs');
    chmodSync(dbPath, 0o000);
    try {
      const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });
      expect(report.before).toBe('left-alone');
      expect(report.quarantinedTo).toBeNull();
      expect(report.restoredGeneration).toBeNull();
    } finally {
      chmodSync(dbPath, 0o600);
    }
    expect(readFileSync(dbPath).equals(before)).toBe(true);
  });

  it('takes a generation of the OLD schema when a migration is pending', async () => {
    seed(3);
    // Roll the bookkeeping back to the first migration only, which is what a
    // build carrying a new migration looks like to this file.
    const db = new Database(dbPath);
    db.prepare("DELETE FROM migrations WHERE name != '001-initial'").run();
    db.close();

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.preMigration.taken).toBe(true);
    expect(report.preMigration.pending.length).toBeGreaterThan(0);
    const capsules = readBackupIndex(dir);
    expect(capsules).toHaveLength(1);
    expect(capsules[0]?.reason).toBe('pre-migration');
    expect(capsules[0]?.sourceMatched).toBe(true);
  });

  it('takes nothing when the schema is already current', async () => {
    seed(3);

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.preMigration.taken).toBe(false);
    expect(
      report.preMigration.taken ? '' : report.preMigration.why
    ).toBe('nothing-pending');
    expect(existsSync(dir)).toBe(false);
  });

  it('restores first and then takes the pre-migration copy of what it restored', async () => {
    const ids = seed(3);
    // A generation of the CURRENT schema, then roll the bookkeeping back and
    // destroy the file. The restore has to happen before the migration probe,
    // or the probe reads a file that is not there.
    const db = new Database(dbPath);
    db.prepare("DELETE FROM migrations WHERE name != '001-initial'").run();
    db.close();
    await captureManifestBackup({ source: dbPath, dir, reason: 'manual' });
    rmSync(dbPath);
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.before).toBe('restored');
    expect(report.preMigration.taken).toBe(true);
    expect(idsIn(dbPath)).toEqual([...ids].sort());
    // Two generations now: the one that was restored from, and the copy of the
    // old schema taken after it.
    expect(readBackupIndex(dir).map((c) => c.reason)).toEqual([
      'pre-migration',
      'manual'
    ]);
  });

  it('never opens the manifest for writing while it is deciding', async () => {
    const ids = seed(3);
    const before = readFileSync(dbPath);

    await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    // A read write open would checkpoint and truncate the write ahead log, and
    // that is a mutation of the user's live manifest by a module whose whole
    // job is to not be one.
    expect(readFileSync(dbPath).equals(before)).toBe(true);
    expect(idsIn(dbPath)).toEqual([...ids].sort());

    // MEASURED, and it is the honest version of "touches nothing". A READ ONLY
    // connection to a database in write ahead log mode still makes SQLite's own
    // `-shm` index and an empty `-wal` beside it, because that is how SQLite
    // reads a log at all. They are empty and they carry no data of the user's.
    // What must not appear is a `-wal` with frames in it, which is what a write
    // would leave.
    const added = readdirSync(join(userData, 'gmux'))
      .filter((n) => n !== 'manifest.db')
      .sort();
    expect(added).toEqual(['manifest.db-shm', 'manifest.db-wal']);
    expect(statSync(`${dbPath}-wal`).size).toBe(0);
  });
});

describe('startManifestRing', () => {
  it('takes the launch generation and keeps polling after it', async () => {
    seed(2);
    const store = new ManifestStore(dbPath);
    try {
      const schedule = await startManifestRing({
        store,
        busy: () => false,
        dbPath,
        dir
      });
      try {
        expect(schedule.snapshot().taken).toBe(1);
        expect(schedule.snapshot().running).toBe(true);
        expect(readBackupIndex(dir).map((c) => c.reason)).toEqual(['launch']);

        // The change test, and the reason the interval is affordable. Nothing
        // has changed, so quit takes nothing at all.
        expect(await schedule.onQuit()).toBeNull();
        expect(readBackupIndex(dir)).toHaveLength(1);
      } finally {
        schedule.stop();
      }
    } finally {
      store.close();
    }
  });

  it('takes one on quit once the manifest has actually changed', async () => {
    seed(2);
    const store = new ManifestStore(dbPath);
    try {
      const schedule = await startManifestRing({
        store,
        busy: () => false,
        dbPath,
        dir
      });
      try {
        store.setStatus(
          '00000001-0000-4000-8000-000000000000',
          'restorable'
        );
        const result = await schedule.onQuit();
        expect(result?.ok).toBe(true);
        expect(readBackupIndex(dir).map((c) => c.reason)).toEqual([
          'quit',
          'launch'
        ]);
      } finally {
        schedule.stop();
      }
    } finally {
      store.close();
    }
  });

  it('says out loud that backups are failing, once', async () => {
    seed(1);
    const store = new ManifestStore(dbPath);
    // A file where the ring's directory has to go. `mkdir` then fails, so every
    // take fails, which is the shape a full or read only disk produces.
    writeFileSync(dir, 'not a directory');
    try {
      const schedule = await startManifestRing({
        store,
        busy: () => false,
        dbPath,
        dir
      });
      try {
        expect(schedule.snapshot().taken).toBe(0);
        expect(schedule.snapshot().consecutiveFailures).toBe(1);
        // Posted, and posted once. A disk that is full fails every tick, and a
        // toast per tick is a toast people learn to dismiss. The latch is in
        // ../notice, and the second half of this assertion is what proves the
        // schedule goes through it rather than around it.
        store.setStatus('00000001-0000-4000-8000-000000000000', 'restorable');
        await schedule.onQuit();
        expect(schedule.snapshot().consecutiveFailures).toBe(2);
        expect(takePendingNotices().map((n) => n.kind)).toEqual([
          'backup-failing'
        ]);
      } finally {
        schedule.stop();
      }
    } finally {
      store.close();
    }
  });
});
