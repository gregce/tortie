/**
 * The kept copy of the last schema an older Tortie can open (Phase 21,
 * research 27 §4.5).
 *
 * ## Why this is not the backup ring doing its job twice
 *
 * Phase 20's ring already takes a verified generation before a migration runs,
 * and that is the right protection against a migration that goes wrong. It is
 * the wrong protection against a DOWNGRADE, because a ring rotates. It keeps
 * five generations, and it takes one at launch, one every five minutes, one on
 * sleep and one on quit. Twenty five minutes after the upgrade the copy of the
 * old schema has been pruned away.
 *
 * The downgrade story needs a file that is still there next month, so this is a
 * second copy with a different lifetime. It is taken only for a BREAKING
 * migration, it is never overwritten, and nothing in Tortie ever deletes it.
 *
 * Every case runs against real SQLite files.
 */

import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

const { prepareManifestForBoot } = await import('../boot');
const { ManifestStore } = await import('../store');

let root = '';
let dbPath = '';
let dir = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-pre-schema-'));
  userData = root;
  mkdirSync(join(root, 'gmux'), { recursive: true });
  dbPath = join(root, 'gmux', 'manifest.db');
  dir = join(root, 'gmux', 'backups');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A manifest at the CURRENT schema, with one real session row in it. */
function seed(): void {
  const store = new ManifestStore(dbPath);
  try {
    store.insertSession({
      id: '00000001-0000-4000-8000-000000000000',
      name: 'one',
      tmuxName: 'one',
      projectPath: '/tmp/project',
      cwd: '/tmp/project',
      agent: 'shell',
      argv: ['/bin/zsh', '-l'],
      status: 'running',
      createdAt: 1_700_000_000_000,
      lastSeen: 1_700_000_000_000
    });
  } finally {
    store.close();
  }
}

/**
 * Make migration 008 pending again, and put the file back at schema 7.
 *
 * This is what a manifest written by the previous release looks like to this
 * build: the bookkeeping row is missing, the columns are there or not, and
 * `user_version` says 7.
 */
function rollBackToSchema7(): void {
  const db = new Database(dbPath);
  try {
    db.prepare('DELETE FROM migrations WHERE name = ?').run(
      '008-agent-recovery-contract'
    );
    db.pragma('user_version = 7');
  } finally {
    db.close();
  }
}

/** Make an ADDITIVE migration pending, by rolling back one that is not 008. */
function rollBackOneAdditive(): void {
  const db = new Database(dbPath);
  try {
    db.prepare('DELETE FROM migrations WHERE name = ?').run('002-exit-code');
  } finally {
    db.close();
  }
}

describe('the keepsake copy', () => {
  it('is taken when a BREAKING migration is pending', async () => {
    seed();
    rollBackToSchema7();

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.keptPreSchema.taken).toBe(true);
    expect(report.keptPreSchema.why).toBe('breaking');
    const kept = join(root, 'gmux', 'manifest.pre-schema-7.db');
    expect(report.keptPreSchema.path).toBe(kept);
    expect(existsSync(kept)).toBe(true);
  });

  it('is a copy an older build can actually read', async () => {
    seed();
    rollBackToSchema7();
    await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    const kept = new Database(join(root, 'gmux', 'manifest.pre-schema-7.db'), {
      readonly: true
    });
    try {
      const rows = kept.prepare('SELECT id, name FROM sessions').all() as {
        id: string;
        name: string;
      }[];
      expect(rows).toEqual([
        { id: '00000001-0000-4000-8000-000000000000', name: 'one' }
      ]);
      // It is the OLD file, so it still says 7. A copy that claimed the new
      // number would be a copy the refusal would turn away.
      expect(kept.pragma('user_version', { simple: true })).toBe(7);
    } finally {
      kept.close();
    }
  });

  it('is NOT taken for an additive migration', async () => {
    seed();
    rollBackOneAdditive();

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.keptPreSchema.taken).toBe(false);
    expect(report.keptPreSchema.why).toBe('additive');
    // Measured, not assumed: research 27 §4.2 ran an older build's INSERT
    // against a manifest with an added nullable column and it worked.
    expect(existsSync(join(root, 'gmux', 'manifest.pre-schema-7.db'))).toBe(false);
  });

  it('is NOT taken when the schema is already current', async () => {
    seed();
    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });
    expect(report.keptPreSchema.why).toBe('nothing-pending');
  });

  it('never overwrites one that is already there', async () => {
    seed();
    rollBackToSchema7();
    await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    const kept = join(root, 'gmux', 'manifest.pre-schema-7.db');
    const first = readFileSync(kept);

    // A second upgrade attempt on the same file. The OLDER copy is the one
    // worth having, because it is the one from before the first upgrade.
    rollBackToSchema7();
    const second = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(second.keptPreSchema.taken).toBe(false);
    expect(second.keptPreSchema.why).toBe('already-kept');
    expect(readFileSync(kept).equals(first)).toBe(true);
  });

  it('replaces one that is there and cannot be opened', async () => {
    // THE FIX ROUND'S CASE, reproduced the way the verifier reproduced it. A
    // crash part way through the copy leaves a torn file at the final name.
    // The old check was `statSync().isFile()`, which a torn file passes, so the
    // boot reported "already there and left exactly as it is" and nothing ever
    // replaced it. The user was told they had a downgrade route they did not
    // have, and 25 minutes later the ring had rotated the old schema away.
    seed();
    rollBackToSchema7();
    const kept = join(root, 'gmux', 'manifest.pre-schema-7.db');
    writeFileSync(kept, Buffer.alloc(8_192)); // torn, exactly as measured

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.keptPreSchema.taken).toBe(true);
    expect(report.keptPreSchema.why).toBe('breaking');
    const replaced = new Database(kept, { readonly: true });
    try {
      expect(
        replaced.prepare('SELECT COUNT(*) AS c FROM sessions').get()
      ).toEqual({ c: 1 });
      expect(replaced.pragma('user_version', { simple: true })).toBe(7);
    } finally {
      replaced.close();
    }
  });

  it('leaves no partial file at the final name when the copy fails', async () => {
    // The copy goes to a temporary name and is renamed on top only after it
    // verifies, so the failure path can never leave something at the keepsake
    // name for a later boot to believe in.
    seed();
    rollBackToSchema7();
    const kept = join(root, 'gmux', 'manifest.pre-schema-7.db');
    // A directory at the temporary name. `VACUUM INTO` cannot write it.
    mkdirSync(`${kept}.partial`, { recursive: true });

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.keptPreSchema.taken).toBe(false);
    expect(report.keptPreSchema.why).toBe('failed');
    expect(existsSync(kept)).toBe(false);
  });

  it('does not touch the manifest it is copying', async () => {
    seed();
    rollBackToSchema7();
    const before = readFileSync(dbPath);

    await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    // `VACUUM INTO` from a read only connection cannot checkpoint or truncate
    // the source. A read write open "just to copy" would mutate the user's
    // live manifest, which is the rule every recovery path here follows.
    expect(readFileSync(dbPath).equals(before)).toBe(true);
  });

  it('does not stop the boot when the copy cannot be written', async () => {
    seed();
    rollBackToSchema7();
    // A directory where the file should go. `VACUUM INTO` cannot write it and
    // the boot has to carry on regardless, because refusing to launch over a
    // failed backup is worse than the failure.
    mkdirSync(join(root, 'gmux', 'manifest.pre-schema-7.db'), {
      recursive: true
    });

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    expect(report.keptPreSchema.taken).toBe(false);
    expect(report.keptPreSchema.why).toBe('failed');
    // And the migration still runs when the store opens.
    const store = new ManifestStore(dbPath);
    try {
      expect(store.listSessions()).toHaveLength(1);
    } finally {
      store.close();
    }
  });

  it('happens alongside the ring take, not instead of it', async () => {
    seed();
    rollBackToSchema7();

    const report = await prepareManifestForBoot(dbPath, { dir, log: () => {} });

    // Two different protections against two different failures. The ring
    // generation is for a migration that goes wrong. The keepsake is for a
    // user who drags an older app back.
    expect(report.preMigration.taken).toBe(true);
    expect(report.keptPreSchema.taken).toBe(true);
  });
});
