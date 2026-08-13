/**
 * The refusal, and the words a person reads when it fires (Phase 21 fix round,
 * research 27 §4.4).
 *
 * Phase 21 built the refusal and proved it protects the file. A verifier then
 * drove the real app against a manifest stamped `min_compatible_version` 9 and
 * found the user is shown the empty home screen, headed "Sessions you start
 * keep running even when Tortie is closed", with the real reason truncated
 * inside a corner toast. The data was safe and the person was told their
 * sessions were gone. These tests are about the half that was missing.
 */

import Database from 'better-sqlite3';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.0.1' }
}));

const { manifestRefusal, refusalCopy } = await import('../refusal');
const { ManifestStore, MANIFEST_SCHEMA_VERSION } = await import('../store');
const { DatabaseTooNewError, WrongDatabaseError } = await import(
  '../../db/schema-version'
);

let root = '';
let dbPath = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-refusal-'));
  userData = root;
  mkdirSync(join(root, 'gmux'), { recursive: true });
  dbPath = join(root, 'gmux', 'manifest.db');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A manifest this build wrote, then stamped as needing a later build. */
function seedNeedingVersion(min: number): void {
  new ManifestStore(dbPath).close();
  const db = new Database(dbPath);
  try {
    db.prepare(
      "INSERT INTO meta (key, value) VALUES ('min_compatible_version', ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(String(min));
  } finally {
    db.close();
  }
}

describe('manifestRefusal', () => {
  it('says nothing about a manifest this build wrote', () => {
    new ManifestStore(dbPath).close();
    expect(manifestRefusal(dbPath)).toBeNull();
  });

  it('says nothing when there is no file at all', () => {
    expect(manifestRefusal(join(root, 'gmux', 'nothing.db'))).toBeNull();
  });

  it('says nothing about a file it cannot read', () => {
    // A damaged manifest is the integrity gate's job. Two modules deciding a
    // file is broken is one module too many.
    writeFileSync(dbPath, Buffer.alloc(4_096, 1));
    expect(manifestRefusal(dbPath)).toBeNull();
  });

  it('refuses a file that needs a later build, and touches nothing', () => {
    seedNeedingVersion(MANIFEST_SCHEMA_VERSION + 1);
    const before = statSync(dbPath);

    const refusal = manifestRefusal(dbPath);

    expect(refusal).toBeInstanceOf(DatabaseTooNewError);
    expect((refusal as InstanceType<typeof DatabaseTooNewError>).buildVersion).toBe(
      MANIFEST_SCHEMA_VERSION
    );
    const after = statSync(dbPath);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('accepts a file at a higher schema whose minimum this build meets', () => {
    // Only the MINIMUM decides. A higher `user_version` with a minimum this
    // build satisfies is what an additive migration produces, and additive is
    // the case research 27 §4.2 measured safe.
    new ManifestStore(dbPath).close();
    const db = new Database(dbPath);
    try {
      db.pragma(`user_version = ${String(MANIFEST_SCHEMA_VERSION + 3)}`);
    } finally {
      db.close();
    }
    expect(manifestRefusal(dbPath)).toBeNull();
  });
});

describe('the words', () => {
  it('leads with the sentence that is true, and names both numbers', () => {
    const copy = refusalCopy(
      new DatabaseTooNewError({
        dbPath: '/Users/someone/Library/Application Support/Tortie/gmux/manifest.db',
        label: 'session list',
        fileVersion: 9,
        fileMinCompatible: 9,
        buildVersion: 8
      })
    );
    expect(copy.message).toBe('This copy of Tortie is older than your session list.');
    // The first thing after the heading is what is still true.
    expect(copy.detail.startsWith('Your sessions are safe')).toBe(true);
    expect(copy.detail).toContain('still running');
    expect(copy.detail).toContain('understands format 8');
    expect(copy.detail).toContain('needs 9 or newer');
    expect(copy.detail).toContain('has changed nothing');
    expect(copy.detail).toContain('/gmux/manifest.db');
    // Quit, and a way to see the folder. No "Open anyway": an older build
    // writing into a newer manifest succeeds and leaves the new column NULL,
    // which is the silent case this whole mechanism exists to stop.
    expect(copy.buttons).toEqual(['Quit', 'Reveal Data Folder']);
    expect(copy.buttons).not.toContain('Open Anyway');
    expect(copy.buttons[copy.revealIndex]).toBe('Reveal Data Folder');
  });

  it('says something different about a file that is not ours', () => {
    const copy = refusalCopy(
      new WrongDatabaseError({
        dbPath: '/tmp/somebody-else.db',
        label: 'session list',
        found: 1,
        expected: 0x54525445
      })
    );
    expect(copy.message).toBe('This is not a Tortie session list.');
    expect(copy.detail).toContain('belongs to another application');
    expect(copy.detail).toContain('will not open it');
  });

  it('uses no dash and no jargon a person would have to look up', () => {
    const copy = refusalCopy(
      new DatabaseTooNewError({
        dbPath: '/x/manifest.db',
        label: 'session list',
        fileVersion: 9,
        fileMinCompatible: 9,
        buildVersion: 8
      })
    );
    const words = `${copy.message}\n${copy.detail}`;
    for (const banned of ['—', '–', 'schema', 'migration', 'SQLite', 'NULL']) {
      expect(words).not.toContain(banned);
    }
  });
});
