/**
 * Unit tests for src/main/diagnostics/heap.ts (Phase 163), and the proof that
 * the ordinary capture never reaches it: the source of report.ts is read and
 * must not import the gate, and ipc.ts must be its only importer.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAP_SNAPSHOT_REFUSED,
  heapSnapshotAllowed,
  saveHeapSnapshot
} from '../heap';

const DIR = join(__dirname, '..');

describe('heapSnapshotAllowed', () => {
  it('allows only an absolute path from the dialog or the harness', () => {
    assert.equal(heapSnapshotAllowed({ path: '/tmp/a.heapsnapshot', origin: 'dialog' }), true);
    assert.equal(heapSnapshotAllowed({ path: '/tmp/a.heapsnapshot', origin: 'harness' }), true);
    assert.equal(heapSnapshotAllowed({ path: '/tmp/a.heapsnapshot', origin: 'report' }), false);
    assert.equal(heapSnapshotAllowed({ path: '', origin: 'dialog' }), false);
    assert.equal(heapSnapshotAllowed({ path: 'relative.heapsnapshot', origin: 'dialog' }), false);
  });
});

describe('saveHeapSnapshot', () => {
  it('refuses without writing when the request is wrong', async () => {
    let wrote = false;
    const out = await saveHeapSnapshot({
      path: '',
      origin: 'dialog',
      write: async () => { wrote = true; return true; }
    });
    assert.equal(wrote, false);
    assert.deepEqual(out, { written: false, refused: HEAP_SNAPSHOT_REFUSED });
  });

  it('writes exactly the path it was given', async () => {
    let seen = '';
    const out = await saveHeapSnapshot({
      path: '/tmp/x.heapsnapshot',
      origin: 'harness',
      write: async (p) => { seen = p; return true; }
    });
    assert.equal(seen, '/tmp/x.heapsnapshot');
    assert.deepEqual(out, { written: true });
  });

  it('turns a writer failure into a refusal rather than a throw', async () => {
    const out = await saveHeapSnapshot({
      path: '/tmp/x.heapsnapshot',
      origin: 'dialog',
      write: async () => { throw new Error('disk full'); }
    });
    assert.deepEqual(out, { written: false, refused: 'disk full' });
  });
});

describe('the ordinary capture never reaches the gate', () => {
  it('report.ts does not import heap, and ipc.ts is the only file that does', () => {
    const importers: string[] = [];
    for (const name of readdirSync(DIR)) {
      if (!name.endsWith('.ts')) continue;
      const src = readFileSync(join(DIR, name), 'utf8');
      if (/from\s+'\.\/heap'/.test(src)) importers.push(name);
    }
    assert.deepEqual(importers, ['ipc.ts']);
    const report = readFileSync(join(DIR, 'report.ts'), 'utf8');
    assert.equal(/takeHeapSnapshot/.test(report), false);
  });
});
