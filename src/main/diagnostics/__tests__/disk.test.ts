/** Unit tests for src/main/diagnostics/disk.ts (Phase 163). Spawns nothing. */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parseDuKb, readDiskSizes } from '../disk';

describe('parseDuKb', () => {
  it('turns du -sk kilobytes into bytes', () => {
    assert.equal(parseDuKb('927232\t/Users/x/Library/Application Support/Tortie\n'), 927232 * 1024);
  });
  it('answers null for anything else', () => {
    assert.equal(parseDuKb(''), null);
    assert.equal(parseDuKb('du: cannot read'), null);
  });
});

describe('readDiskSizes', () => {
  it('asks du for the code cache, the durable directory and the profile, in parallel', async () => {
    const asked: string[] = [];
    const out = await readDiskSizes('/p', {
      du: async (dir) => {
        asked.push(dir);
        return dir === '/p' ? 1000 : dir.endsWith('gmux') ? 10 : 100;
      },
      free: async () => 5000,
      httpCache: async () => 700
    });
    assert.deepEqual(asked.sort(), ['/p', '/p/Code Cache', '/p/gmux']);
    assert.deepEqual(out, {
      httpCacheBytes: 700,
      codeCacheBytes: 100,
      durableBytes: 10,
      profileBytes: 1000,
      freeBytes: 5000
    });
  });

  it('reads a failure as unknown, never as zero', async () => {
    const out = await readDiskSizes('/p', {
      du: async () => { throw new Error('no du'); },
      free: async () => null,
      httpCache: async () => { throw new Error('no session'); }
    });
    assert.deepEqual(out, {
      httpCacheBytes: null,
      codeCacheBytes: null,
      durableBytes: null,
      profileBytes: null,
      freeBytes: null
    });
  });
});
