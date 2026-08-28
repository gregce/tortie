/**
 * The canvas rows (Phase 162): the camera and the kept layout in `arch.db`.
 *
 * The properties under test are the doctrine of the database's own header:
 * everything here is disposable, a write is kept whole or refused whole with
 * the field named, and a kill mid write can cost at most the write in
 * flight, never the rows that were already there. The kill test is real: a
 * child process is SIGKILLed while it holds an open transaction over these
 * tables, and the reopened store must hold exactly the state from before.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { ArchStore } from '../db';

let dir: string;
let store: ArchStore;
const KEY = 'dev:ino';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-arch-canvas-'));
  store = new ArchStore(join(dir, 'arch.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the camera', () => {
  it('answers null before anything was kept', () => {
    expect(store.canvasState(KEY, 'root')).toEqual({
      camera: null,
      positions: []
    });
  });

  it('keeps one camera per repository per scope', () => {
    expect(store.saveCamera(KEY, 'root', { k: 1.5, x: -20, y: 12.25 })).toBeNull();
    expect(store.saveCamera(KEY, 'part:engine', { k: 2, x: 0, y: 0 })).toBeNull();
    expect(store.saveCamera('other:repo', 'root', { k: 3, x: 1, y: 1 })).toBeNull();

    expect(store.canvasState(KEY, 'root').camera).toEqual({
      k: 1.5,
      x: -20,
      y: 12.25
    });
    expect(store.canvasState(KEY, 'part:engine').camera).toEqual({
      k: 2,
      x: 0,
      y: 0
    });
    // A later rest replaces, never accumulates.
    expect(store.saveCamera(KEY, 'root', { k: 1, x: 0, y: 0 })).toBeNull();
    expect(store.canvasState(KEY, 'root').camera).toEqual({ k: 1, x: 0, y: 0 });
  });

  it('refuses a camera that is not drawable, whole, with the field named', () => {
    expect(store.saveCamera(KEY, 'root', { k: 0, x: 0, y: 0 })).toContain(
      'camera.k'
    );
    expect(store.saveCamera(KEY, 'root', { k: NaN, x: 0, y: 0 })).toContain(
      'camera.k'
    );
    expect(
      store.saveCamera(KEY, 'root', { k: 1, x: Infinity, y: 0 })
    ).toContain('camera.x');
    expect(store.saveCamera(KEY, 'root', { k: 1, x: 0, y: NaN })).toContain(
      'camera.y'
    );
    // Nothing was persisted by any refused write.
    expect(store.canvasState(KEY, 'root').camera).toBeNull();
  });

  it('refuses a scope outside the two shapes the drill can produce', () => {
    expect(store.saveCamera(KEY, '', { k: 1, x: 0, y: 0 })).not.toBeNull();
    expect(
      store.saveCamera(KEY, 'matrix', { k: 1, x: 0, y: 0 })
    ).not.toBeNull();
    expect(
      store.saveCamera(KEY, 'x'.repeat(300), { k: 1, x: 0, y: 0 })
    ).not.toBeNull();
    expect(
      store.saveCamera(KEY, 'part:engine', { k: 1, x: 0, y: 0 })
    ).toBeNull();
  });

  it('drops a stored camera an older build or a hand edit made non-finite', () => {
    expect(store.saveCamera(KEY, 'root', { k: 1, x: 0, y: 0 })).toBeNull();
    // Reach under the store the way a hand edit would.
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const raw = new Database(join(dir, 'arch.db'));
    raw.prepare('UPDATE arch_camera SET k = ?').run(-3);
    raw.close();
    const reopened = new ArchStore(join(dir, 'arch.db'));
    try {
      expect(reopened.canvasState(KEY, 'root').camera).toBeNull();
    } finally {
      reopened.close();
    }
  });
});

describe('the kept layout', () => {
  const P = [
    { nodeId: 'engine', x: 10, y: 20 },
    { nodeId: 'surface', x: 30.5, y: -4 }
  ];

  it('replaces the scope whole and keeps other scopes alone', () => {
    expect(store.saveLayout(KEY, 'root', P)).toBeNull();
    expect(store.saveLayout(KEY, 'part:engine', [{ nodeId: 'a', x: 1, y: 2 }])).toBeNull();
    expect(store.canvasState(KEY, 'root').positions).toEqual(
      [...P].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    );
    expect(store.saveLayout(KEY, 'root', [{ nodeId: 'engine', x: 99, y: 99 }])).toBeNull();
    // The whole scope was replaced: `surface` is gone, not merged.
    expect(store.canvasState(KEY, 'root').positions).toEqual([
      { nodeId: 'engine', x: 99, y: 99 }
    ]);
    expect(store.canvasState(KEY, 'part:engine').positions).toEqual([
      { nodeId: 'a', x: 1, y: 2 }
    ]);
  });

  it('refuses an invalid write whole and keeps what was there', () => {
    expect(store.saveLayout(KEY, 'root', P)).toBeNull();
    const bad = store.saveLayout(KEY, 'root', [
      { nodeId: 'engine', x: 1, y: 2 },
      { nodeId: 'surface', x: NaN, y: 2 }
    ]);
    expect(bad).toContain('surface');
    expect(store.canvasState(KEY, 'root').positions).toEqual(
      [...P].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    );
    expect(store.saveLayout(KEY, 'root', [{ nodeId: '', x: 1, y: 2 }])).not.toBeNull();
    expect(
      store.saveLayout(
        KEY,
        'root',
        Array.from({ length: 513 }, (_, i) => ({
          nodeId: `n${String(i)}`,
          x: 0,
          y: 0
        }))
      )
    ).toContain('513');
  });

  it('is atomic against a failure between the drop and the inserts', () => {
    expect(store.saveLayout(KEY, 'root', P)).toBeNull();
    // Two rows with one id violate the primary key on the SECOND insert,
    // after the drop and the first insert already ran. If the replace were
    // not one transaction this would leave the scope half written; the old
    // rows surviving untouched is the atomicity proof.
    expect(() =>
      store.saveLayout(KEY, 'root', [
        { nodeId: 'dup', x: 1, y: 2 },
        { nodeId: 'dup', x: 3, y: 4 }
      ])
    ).toThrow();
    expect(store.canvasState(KEY, 'root').positions).toEqual(
      [...P].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    );
  });

  it('clears one scope as an explicit act and nothing else', () => {
    expect(store.saveLayout(KEY, 'root', P)).toBeNull();
    expect(store.saveCamera(KEY, 'root', { k: 2, x: 5, y: 5 })).toBeNull();
    expect(store.clearLayout(KEY, 'root')).toBeNull();
    const after = store.canvasState(KEY, 'root');
    expect(after.positions).toEqual([]);
    // The camera survives a re-layout: dropping the geography does not throw
    // away where the person was looking.
    expect(after.camera).toEqual({ k: 2, x: 5, y: 5 });
  });

  it('forgets the canvas with the repository', () => {
    expect(store.saveCamera(KEY, 'root', { k: 2, x: 0, y: 0 })).toBeNull();
    expect(store.saveLayout(KEY, 'root', P)).toBeNull();
    store.forgetRepo(KEY);
    expect(store.canvasState(KEY, 'root')).toEqual({
      camera: null,
      positions: []
    });
  });
});

describe('a kill mid write', () => {
  it('loses at most the write in flight, never the rows already kept', async () => {
    expect(store.saveCamera(KEY, 'root', { k: 1.25, x: 8, y: -8 })).toBeNull();
    expect(
      store.saveLayout(KEY, 'root', [{ nodeId: 'engine', x: 10, y: 20 }])
    ).toBeNull();
    store.close();

    // A child opens the SAME database, starts an immediate transaction over
    // the canvas tables, reports in, and then holds the transaction open
    // until it is killed without warning. WAL journaling means the reopened
    // reader must see none of it.
    const dbPath = join(dir, 'arch.db');
    const require = createRequire(import.meta.url);
    const betterSqlitePath = require.resolve('better-sqlite3');
    const script = `
      const Database = require(${JSON.stringify(betterSqlitePath)});
      const db = new Database(${JSON.stringify(dbPath)});
      db.pragma('journal_mode = WAL');
      db.exec('BEGIN IMMEDIATE');
      db.prepare('DELETE FROM arch_layout').run();
      db.prepare(
        'INSERT INTO arch_layout (repo_key, scope, node_id, x, y) VALUES (?, ?, ?, ?, ?)'
      ).run('dev:ino', 'root', 'torn', 1, 2);
      db.prepare(
        'UPDATE arch_camera SET k = 999'
      ).run();
      process.stdout.write('mid-write\\n');
      setInterval(() => {}, 1000);
    `;
    const child = spawn(process.execPath, ['-e', script], {
      stdio: ['ignore', 'pipe', 'inherit']
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('child never reached mid-write')),
        15000
      );
      child.stdout.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('mid-write')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('exit', () => {
        clearTimeout(timer);
        reject(new Error('child exited before being killed'));
      });
    });
    child.removeAllListeners('exit');
    child.kill('SIGKILL');
    await new Promise((resolve) => child.on('exit', resolve));

    const reopened = new ArchStore(dbPath);
    try {
      const state = reopened.canvasState(KEY, 'root');
      expect(state.camera).toEqual({ k: 1.25, x: 8, y: -8 });
      expect(state.positions).toEqual([{ nodeId: 'engine', x: 10, y: 20 }]);
    } finally {
      reopened.close();
      // Re-arm the outer afterEach, which closes `store` again; a double
      // close throws, so hand it a fresh open store.
      store = new ArchStore(dbPath);
    }
  });
});
