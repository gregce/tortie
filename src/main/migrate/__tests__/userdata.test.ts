/**
 * The rename migration, against real directories, a real populated SQLite
 * manifest and a real live writer — no mocks.
 *
 * What each block pins down is the failure it prevents, because every one of
 * them was observed or measured somewhere in Phase 16.5's hazard list:
 *
 *  - a rename pointing the app at an empty directory (the whole phase),
 *  - a smoke harness's `--user-data-dir` hoovering up the real profile,
 *  - an interrupted copy becoming the live state,
 *  - a publish overwriting something that was already there,
 *  - the 749 MB Chromium cache riding along with the 4.4 MB that matters,
 *  - and the original being modified by the thing that claims to back it up.
 */

import Database from 'better-sqlite3';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest/store';
import type { SpecstoryCaptureRecord } from '../../specstory/capture';
import {
  LEGACY_APP_NAME,
  MIGRATION_MARKER,
  decideMigrationSite,
  isRegenerableEntry,
  migrateUserData,
  readMigrationMarker
} from '../userdata';

const OLD_BIN = '/Applications/gmux.app/Contents/Resources/bin/specstory';

const CAPTURE: SpecstoryCaptureRecord = {
  enabled: true,
  bin: OLD_BIN,
  binVersion: '2.8.0',
  provider: 'claude',
  exitCodeFidelity: 'exact',
  agentArgv: ['/Users/g/.local/bin/claude', '--resume', 'abc']
};

let root: string;
let appData: string;
let legacyDir: string;
let targetDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-migrate-'));
  appData = join(root, 'Application Support');
  legacyDir = join(appData, LEGACY_APP_NAME);
  targetDir = join(appData, 'Tortie');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixture — the SHAPE of a real install, built from the same store the app uses
// ---------------------------------------------------------------------------

interface Fixture {
  /** Left OPEN on purpose in `liveWriter` mode: a second process mid-upgrade. */
  store: ManifestStore | null;
  sessionIds: string[];
}

function session(
  id: string,
  patch: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return {
    id,
    name: `session ${id}`,
    tmuxName: `zz-${id}`,
    projectPath: '/Users/g/proj',
    cwd: '/Users/g/proj',
    agent: 'claude',
    status: 'running',
    createdAt: now,
    lastSeen: now,
    argv: ['claude', '--session-id', id],
    resumeArgv: ['claude', '--resume', id],
    env: { GMUX_SESSION_ID: id },
    ...patch
  };
}

/** A populated gmux userData: manifest, snapshots, settings, hooks, tips. */
function buildLegacyInstall(opts: { keepStoreOpen?: boolean } = {}): Fixture {
  mkdirSync(join(legacyDir, LEGACY_APP_NAME, 'snapshots'), { recursive: true });
  mkdirSync(join(legacyDir, LEGACY_APP_NAME, 'hooks', 'claude'), {
    recursive: true
  });
  mkdirSync(join(legacyDir, LEGACY_APP_NAME, 'dropped-images'), {
    recursive: true
  });
  mkdirSync(join(legacyDir, 'Local Storage', 'leveldb'), { recursive: true });
  // Regenerable Chromium tiers — must NOT ride along.
  mkdirSync(join(legacyDir, 'Cache', 'Cache_Data'), { recursive: true });
  mkdirSync(join(legacyDir, 'Code Cache', 'js'), { recursive: true });
  mkdirSync(join(legacyDir, 'GPUCache'), { recursive: true });
  writeFileSync(join(legacyDir, 'Cache', 'Cache_Data', 'data_0'), 'x'.repeat(4096));
  writeFileSync(join(legacyDir, 'Code Cache', 'js', 'index'), 'y'.repeat(2048));
  writeFileSync(join(legacyDir, 'GPUCache', 'data_1'), 'z'.repeat(1024));

  const store = new ManifestStore(join(legacyDir, LEGACY_APP_NAME, 'manifest.db'));
  store.upsertProject({ id: 'p-proj', path: '/Users/g/proj', name: 'proj' });
  store.upsertProject({ id: 'p-other', path: '/Users/g/other', name: 'other' });
  const ids = ['s-running', 's-restorable', 's-captured'];
  store.insertSession(session('s-running'));
  store.insertSession(session('s-restorable', { status: 'restorable' }));
  store.insertSession(
    session('s-captured', {
      specstory: CAPTURE,
      argv: [OLD_BIN, 'run', 'claude', '-c', 'claude'],
      resumeArgv: [OLD_BIN, 'run', 'claude', '-c', 'claude --resume abc']
    })
  );
  for (const id of ids) {
    writeFileSync(
      join(legacyDir, LEGACY_APP_NAME, 'snapshots', `${id}.txt`),
      `scrollback for ${id}\n`.repeat(50)
    );
  }
  writeFileSync(
    join(legacyDir, LEGACY_APP_NAME, 'hooks', 'claude', 'settings.json'),
    JSON.stringify({ hooks: { Stop: [] } })
  );
  writeFileSync(
    join(legacyDir, LEGACY_APP_NAME, 'dropped-images', 'shot.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  );
  writeFileSync(
    join(legacyDir, 'settings.json'),
    JSON.stringify({
      version: 1,
      settings: {
        defaultAgent: 'claude',
        hotkeys: { claude: 'Shift+Cmd+C', codex: 'Shift+Cmd+X' },
        scrollbackLines: 25000
      }
    })
  );
  // The renderer's one-time-tip flags + tree state live in leveldb.
  writeFileSync(
    join(legacyDir, 'Local Storage', 'leveldb', '000003.log'),
    'gmux.tipShown.quit=1'
  );
  writeFileSync(join(legacyDir, 'Local Storage', 'leveldb', 'CURRENT'), 'MANIFEST-000001\n');
  writeFileSync(join(legacyDir, 'Preferences'), '{"profile":{}}');
  writeFileSync(join(legacyDir, 'Local State'), '{"os_crypt":{}}');

  if (opts.keepStoreOpen === true) return { store, sessionIds: ids };
  store.close();
  return { store: null, sessionIds: ids };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Every regular file under `dir`, as relpath → sha256 + size + mtimeMs. */
function fingerprint(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const st = statSync(p);
        out.set(relative(dir, p), `${sha(p)}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(dir);
  return out;
}

function readSessions(dbPath: string): Record<string, unknown>[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare('SELECT * FROM sessions ORDER BY id').all();
  db.close();
  return rows as Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Guards — is this launch a rename upgrade at all?
// ---------------------------------------------------------------------------

describe('decideMigrationSite', () => {
  it('does nothing while the app still answers to its old name', () => {
    const d = decideMigrationSite({
      appDataDir: appData,
      appName: 'gmux',
      userDataDir: join(appData, 'gmux')
    });
    expect(d).toMatchObject({ migrate: false, reason: 'name-unchanged' });
  });

  it('migrates when the name changed and userData is the default for it', () => {
    const d = decideMigrationSite({
      appDataDir: appData,
      appName: 'Tortie',
      userDataDir: join(appData, 'Tortie')
    });
    expect(d).toEqual({
      migrate: true,
      site: { legacyDir, targetDir }
    });
  });

  it('REFUSES when userData was overridden — no harness may inherit the real profile', () => {
    // Every smoke script in package.json passes --user-data-dir=<scratch>.
    const d = decideMigrationSite({
      appDataDir: appData,
      appName: 'Tortie',
      userDataDir: '/tmp/gmux-smoke-capture'
    });
    expect(d).toMatchObject({ migrate: false, reason: 'userdata-overridden' });
  });

  it('honours the escape hatch', () => {
    const d = decideMigrationSite({
      appDataDir: appData,
      appName: 'Tortie',
      userDataDir: join(appData, 'Tortie'),
      env: { GMUX_SKIP_USERDATA_MIGRATION: '1' }
    });
    expect(d).toMatchObject({ migrate: false, reason: 'disabled-by-env' });
  });
});

// ---------------------------------------------------------------------------
// The happy path — a populated install crosses the rename intact
// ---------------------------------------------------------------------------

describe('migrating a populated install', () => {
  it('carries every row, file and setting across, and leaves the original alone', () => {
    buildLegacyInstall();
    // Read the source rows BEFORE fingerprinting: a readonly SQLite open is
    // itself enough to (re)create the `-wal`/`-shm` scratch files, and the
    // point of the fingerprint is to catch the MIGRATION touching anything.
    const sourceRows = readSessions(join(legacyDir, LEGACY_APP_NAME, 'manifest.db'));
    const before = fingerprint(legacyDir);

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(result.status).toBe('migrated');
    expect(result.reason).toBe('copied');

    // 1. The manifest: every row, every column, identical.
    const copiedRows = readSessions(join(targetDir, LEGACY_APP_NAME, 'manifest.db'));
    expect(copiedRows).toEqual(sourceRows);
    expect(copiedRows).toHaveLength(3);

    // 2. …and the app's own store can open the copy and read it back.
    const store = new ManifestStore(join(targetDir, LEGACY_APP_NAME, 'manifest.db'));
    expect(store.listSessions().map((s) => s.id).sort()).toEqual([
      's-captured',
      's-restorable',
      's-running'
    ]);
    expect(store.getSession('s-captured')?.specstory).toEqual(CAPTURE);
    expect(store.listProjects()).toHaveLength(2);
    store.close();

    // 3. Row counts were verified as evidence, not assumed.
    const manifest = result.databases.find(
      (d) => d.file === `${LEGACY_APP_NAME}/manifest.db`
    );
    expect(manifest?.ok).toBe(true);
    expect(manifest?.source['sessions']).toBe(3);
    expect(manifest?.copy['sessions']).toBe(3);
    expect(manifest?.source['projects']).toBe(2);

    // 4. Settings + hotkeys, byte-identical.
    expect(sha(join(targetDir, 'settings.json'))).toBe(
      sha(join(legacyDir, 'settings.json'))
    );
    const settings = JSON.parse(
      readFileSync(join(targetDir, 'settings.json'), 'utf8')
    ) as { settings: { hotkeys: Record<string, string> } };
    expect(settings.settings.hotkeys['claude']).toBe('Shift+Cmd+C');

    // 5. Snapshots, hooks, dropped images and the localStorage tip flags.
    for (const id of ['s-running', 's-restorable', 's-captured']) {
      const rel = join(LEGACY_APP_NAME, 'snapshots', `${id}.txt`);
      expect(sha(join(targetDir, rel))).toBe(sha(join(legacyDir, rel)));
    }
    expect(
      existsSync(join(targetDir, LEGACY_APP_NAME, 'hooks', 'claude', 'settings.json'))
    ).toBe(true);
    expect(
      existsSync(join(targetDir, LEGACY_APP_NAME, 'dropped-images', 'shot.png'))
    ).toBe(true);
    expect(
      readFileSync(join(targetDir, 'Local Storage', 'leveldb', '000003.log'), 'utf8')
    ).toBe('gmux.tipShown.quit=1');

    // 6. The 749 MB tier stayed behind.
    expect(existsSync(join(targetDir, 'Cache'))).toBe(false);
    expect(existsSync(join(targetDir, 'Code Cache'))).toBe(false);
    expect(existsSync(join(targetDir, 'GPUCache'))).toBe(false);
    expect(result.skipped).toEqual(
      expect.arrayContaining(['Cache', 'Code Cache', 'GPUCache'])
    );

    // 7. THE ORIGINAL IS THE BACKUP: byte-for-byte, mtime-for-mtime, unchanged.
    expect(fingerprint(legacyDir)).toEqual(before);

    // 8. A marker records what happened, for the next launch and for a human.
    const marker = readMigrationMarker(targetDir);
    expect(marker?.status).toBe('complete');
    expect(marker?.from).toBe(legacyDir);
    expect(marker?.entries).toEqual(expect.arrayContaining(['settings.json', 'gmux']));
  });

  it('is idempotent — the second launch does nothing at all', () => {
    buildLegacyInstall();
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    const after = fingerprint(targetDir);

    const again = migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(again.status).toBe('skipped');
    expect(again.reason).toBe('already-migrated');
    expect(fingerprint(targetDir)).toEqual(after);
  });

  it('copies committed WAL content while another connection holds the manifest open', () => {
    // The upgrade case nobody plans for: the user launches the new bundle
    // without quitting the old one. A three-file `cp` of a live WAL database
    // can be torn; the readonly snapshot cannot.
    const fx = buildLegacyInstall({ keepStoreOpen: true });
    fx.store?.insertSession(session('s-late'));
    const walPath = join(legacyDir, LEGACY_APP_NAME, 'manifest.db-wal');
    expect(statSync(walPath).size).toBeGreaterThan(0);
    const before = fingerprint(legacyDir);

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(result.status).toBe('migrated');

    const manifest = result.databases.find(
      (d) => d.file === `${LEGACY_APP_NAME}/manifest.db`
    );
    expect(manifest?.method).toBe('vacuum-into');
    expect(manifest?.ok).toBe(true);
    expect(manifest?.source['sessions']).toBe(4);

    // The 4th row lived only in the WAL — a naive `cp manifest.db` loses it.
    const rows = readSessions(join(targetDir, LEGACY_APP_NAME, 'manifest.db'));
    expect(rows.map((r) => r['id'])).toContain('s-late');
    // The snapshot did not checkpoint, truncate or otherwise touch the source.
    // The ONE trace a readonly reader leaves is a read-mark inside SQLite's
    // `-shm` shared-memory index — never in the database or its WAL, which is
    // where the user's sessions actually live.
    const after = fingerprint(legacyDir);
    const shm = `${LEGACY_APP_NAME}/manifest.db-shm`;
    before.delete(shm);
    after.delete(shm);
    expect(after).toEqual(before);
    fx.store?.close();
  });
});

// ---------------------------------------------------------------------------
// The cases that decide whether this is safe
// ---------------------------------------------------------------------------

describe('refusing, resuming and never destroying', () => {
  it('does nothing on a fresh install with no prior data', () => {
    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('no-legacy-data');
    expect(existsSync(targetDir)).toBe(false);
  });

  it('prefers the new directory when BOTH already hold data', () => {
    buildLegacyInstall();
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'settings.json'), '{"new":true}');
    const before = fingerprint(targetDir);

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('target-has-data');
    expect(fingerprint(targetDir)).toEqual(before);
  });

  it('still migrates when Chromium already created the target directory', () => {
    // First launch under the new name can reach the profile before us; a
    // `Preferences` file is not "the new install has been used".
    buildLegacyInstall();
    mkdirSync(join(targetDir, 'Local Storage', 'leveldb'), { recursive: true });
    writeFileSync(join(targetDir, 'Preferences'), '{"fresh":true}');
    writeFileSync(join(targetDir, 'Local Storage', 'leveldb', 'CURRENT'), 'empty\n');

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(result.status).toBe('migrated');
    expect(existsSync(join(targetDir, LEGACY_APP_NAME, 'manifest.db'))).toBe(true);
    // What was there was MOVED ASIDE, never deleted.
    expect(result.movedAside).toEqual(
      expect.arrayContaining(['Preferences', 'Local Storage'])
    );
    const aside = readdirSync(targetDir).find((n) => n.startsWith('.pre-migration-'));
    expect(aside).toBeDefined();
    expect(
      readFileSync(join(targetDir, aside as string, 'Preferences'), 'utf8')
    ).toBe('{"fresh":true}');
    // …and the migrated copy is the live one.
    expect(
      readFileSync(join(targetDir, 'Local Storage', 'leveldb', '000003.log'), 'utf8')
    ).toBe('gmux.tipShown.quit=1');
  });

  it('resumes an interrupted migration instead of treating half of it as done', () => {
    buildLegacyInstall();
    // Simulate a crash after ONE entry was published: the marker says
    // in-progress, the directory holds a partial payload.
    mkdirSync(join(targetDir, LEGACY_APP_NAME), { recursive: true });
    writeFileSync(join(targetDir, LEGACY_APP_NAME, 'manifest.db'), 'TORN');
    writeFileSync(
      join(targetDir, MIGRATION_MARKER),
      JSON.stringify({
        version: 1,
        status: 'in-progress',
        from: legacyDir,
        to: targetDir,
        startedAt: Date.now() - 1000,
        entries: ['gmux', 'settings.json'],
        app: { legacyName: LEGACY_APP_NAME }
      })
    );

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(result.status).toBe('migrated');
    expect(readMigrationMarker(targetDir)?.status).toBe('complete');
    // The half-written manifest was replaced by the verified one…
    expect(readSessions(join(targetDir, LEGACY_APP_NAME, 'manifest.db'))).toHaveLength(3);
    // …and even that torn file was kept rather than deleted.
    const aside = readdirSync(targetDir).find((n) => n.startsWith('.pre-migration-'));
    expect(
      readFileSync(join(targetDir, aside as string, LEGACY_APP_NAME, 'manifest.db'), 'utf8')
    ).toBe('TORN');
    expect(existsSync(join(targetDir, 'settings.json'))).toBe(true);
  });

  it('leaves no staging directory behind', () => {
    buildLegacyInstall();
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(existsSync(`${targetDir}.migrating`)).toBe(false);
  });

  it('copies a non-SQLite .db byte-for-byte instead of failing the upgrade', () => {
    buildLegacyInstall();
    writeFileSync(join(legacyDir, LEGACY_APP_NAME, 'bogus.db'), 'not a database');
    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(result.status).toBe('migrated');
    expect(readFileSync(join(targetDir, LEGACY_APP_NAME, 'bogus.db'), 'utf8')).toBe(
      'not a database'
    );
    expect(result.warnings.join(' ')).toContain('bogus.db');
  });

  it('never duplicates the per-instance lock files', () => {
    buildLegacyInstall();
    symlinkSync('mac.local-12345', join(legacyDir, 'SingletonLock'));
    writeFileSync(join(legacyDir, 'DevToolsActivePort'), '54321\n');

    migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(existsSync(join(targetDir, 'SingletonLock'))).toBe(false);
    expect(existsSync(join(targetDir, 'DevToolsActivePort'))).toBe(false);
    expect(isRegenerableEntry('SingletonLock')).toBe(true);
    expect(isRegenerableEntry('settings.json')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 19 item 10 — the failure path, which used to be silent and one-way
// ---------------------------------------------------------------------------

/**
 * The probe from research 33 §3.1, made executable.
 *
 * One file at mode 000 in the legacy root is enough to fail the copy. That is
 * not an exotic fixture: it is a Chromium file with odd permissions, or a
 * partial restore from a backup. Everything that used to follow is what these
 * tests pin down. The user was told nothing, the app booted and created
 * `<userData>/gmux/`, and from then on every launch answered
 * `skipped` / `target-has-data` for good.
 */
function breakTheCopy(): string {
  const victim = join(legacyDir, 'Preferences');
  chmodSync(victim, 0o000);
  return victim;
}

/** What the app's first boot after a failure creates, and nothing more. */
function simulateOneBoot(): void {
  mkdirSync(join(targetDir, LEGACY_APP_NAME), { recursive: true });
  writeFileSync(join(targetDir, LEGACY_APP_NAME, 'manifest.db'), '');
}

const rootless = process.getuid?.() !== 0;

describe.runIf(rootless)('a failed migration says so, and stays armed', () => {
  it('records the failure in the target BEFORE the app can create its own payload', () => {
    buildLegacyInstall();
    breakTheCopy();

    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(result.status).toBe('failed');
    const marker = readMigrationMarker(targetDir);
    expect(marker?.status).toBe('failed');
    expect(marker?.reason).toBe('error');
    expect(marker?.attempts).toBe(1);
    // The marker holds the CAUSE, which is what the dialog reads back. It is a
    // sentence for a person, so it carries no folder path and no em dash.
    expect(marker?.error).toContain('EACCES');
    expect(marker?.error).not.toContain('your data is still at');
    expect(marker?.error).not.toContain('\u2014');
    expect(result.cause).toBe(marker?.error);
    expect(result.summary).toContain('Your data is still at');
    // Nothing was published, and the original is untouched.
    expect(existsSync(join(targetDir, LEGACY_APP_NAME, 'manifest.db'))).toBe(false);
    expect(existsSync(join(legacyDir, LEGACY_APP_NAME, 'manifest.db'))).toBe(true);
  });

  it('RETRIES on the next launch once the cause is fixed, which it never used to', () => {
    // This is the whole defect in one test. Before Phase 19 the second run
    // returned skipped / target-has-data and did so forever.
    buildLegacyInstall();
    const victim = breakTheCopy();

    const first = migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(first.status).toBe('failed');

    simulateOneBoot();
    chmodSync(victim, 0o644);

    const second = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(second.status).toBe('migrated');
    expect(readMigrationMarker(targetDir)?.status).toBe('complete');
    expect(readSessions(join(targetDir, LEGACY_APP_NAME, 'manifest.db'))).toHaveLength(
      3
    );
  });

  it('moves what the app wrote in between aside rather than deleting it', () => {
    buildLegacyInstall();
    const victim = breakTheCopy();
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    simulateOneBoot();
    writeFileSync(join(targetDir, LEGACY_APP_NAME, 'manifest.db'), 'made after the failure');
    chmodSync(victim, 0o644);

    const second = migrateUserData({ legacyDir, targetDir, log: () => {} });

    expect(second.movedAside).toContain(LEGACY_APP_NAME);
    const aside = readdirSync(targetDir).filter((n) => n.startsWith('.pre-migration-'));
    expect(aside).toHaveLength(1);
    expect(
      readFileSync(
        join(targetDir, aside[0] as string, LEGACY_APP_NAME, 'manifest.db'),
        'utf8'
      )
    ).toBe('made after the failure');
  });

  it('counts the attempts, so a repeating failure is visible', () => {
    buildLegacyInstall();
    breakTheCopy();
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(readMigrationMarker(targetDir)?.attempts).toBe(3);
  });

  it('never turns a completed migration back into a failed one', () => {
    buildLegacyInstall();
    migrateUserData({ legacyDir, targetDir, log: () => {} });
    expect(readMigrationMarker(targetDir)?.status).toBe('complete');

    // A later launch fails for some new reason. The data is already across,
    // and the marker must not start claiming otherwise.
    migrateUserData({
      legacyDir,
      targetDir: join(targetDir, 'Preferences'),
      log: () => {}
    });
    expect(readMigrationMarker(targetDir)?.status).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// Phase 19 item 10 — row counts were never verification
// ---------------------------------------------------------------------------

describe('what the copy is verified against', () => {
  it('records a per-table content digest for every database it carries', () => {
    buildLegacyInstall();
    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });

    const manifest = result.databases.find((d) => d.file.endsWith('manifest.db'));
    expect(manifest?.ok).toBe(true);
    expect(manifest?.differences).toEqual([]);
    // Named rather than listed exhaustively: the manifest gains tables in
    // other phases, and this test is about the digests rather than the schema.
    expect(Object.keys(manifest?.sourceDigests ?? {})).toEqual(
      expect.arrayContaining(['migrations', 'projects', 'sessions'])
    );
    for (const digest of Object.values(manifest?.sourceDigests ?? {})) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('compares content, not counts, on the snapshot path', () => {
    // A live writer forces the `vacuum-into` branch, which is the one whose
    // claim used to be "equal row counts" and is now "the same rows".
    const fixture = buildLegacyInstall({ keepStoreOpen: true });
    const result = migrateUserData({ legacyDir, targetDir, log: () => {} });
    fixture.store?.close();

    const manifest = result.databases.find((d) => d.file.endsWith('manifest.db'));
    expect(manifest?.method).toBe('vacuum-into');
    expect(manifest?.differences).toEqual([]);
    expect(manifest?.sourceDigests).toEqual(manifest?.copyDigests);
    expect(manifest?.ok).toBe(true);
  });
});
