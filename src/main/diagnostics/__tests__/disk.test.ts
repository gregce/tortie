/** Unit tests for src/main/diagnostics/disk.ts (Phase 163). Spawns nothing. */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parseDuKb, policyState, readDiskSizes } from '../disk';

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
      httpCache: async () => 700,
      policy: () => ({ httpCacheCeilingBytes: null, cachePolicy: { mode: 'chromium-default', reason: 'r' } })
    });
    assert.deepEqual(asked.sort(), ['/p', '/p/Code Cache', '/p/gmux']);
    assert.deepEqual(out, {
      httpCacheBytes: 700,
      codeCacheBytes: 100,
      durableBytes: 10,
      profileBytes: 1000,
      freeBytes: 5000,
      httpCacheCeilingBytes: null,
      cachePolicy: { mode: 'chromium-default', reason: 'r' }
    });
  });

  // Phase 166. The policy rides beside the sizes, unchanged, and the default
  // reads the environment the way an unpackaged launch does.
  it('carries the ceiling and the policy the caller hands in', async () => {
    const out = await readDiskSizes('/p', {
      du: async () => 1,
      free: async () => 1,
      httpCache: async () => 1,
      policy: () => ({ httpCacheCeilingBytes: 128 * 1024 * 1024, cachePolicy: { mode: 'dev-ceiling', reason: 'vite' } })
    });
    assert.equal(out.httpCacheCeilingBytes, 128 * 1024 * 1024);
    assert.deepEqual(out.cachePolicy, { mode: 'dev-ceiling', reason: 'vite' });
  });

  it('folds the policy module answer into the two report fields', () => {
    assert.deepEqual(
      policyState({ httpCacheCeilingBytes: 5, mode: 'dev-ceiling', reason: 'why' }),
      { httpCacheCeilingBytes: 5, cachePolicy: { mode: 'dev-ceiling', reason: 'why' } }
    );
  });

  it('answers chromium-default by default when no dev server url is set', async () => {
    const saved = process.env['ELECTRON_RENDERER_URL'];
    delete process.env['ELECTRON_RENDERER_URL'];
    try {
      const out = await readDiskSizes('/p', { du: async () => 1, free: async () => 1, httpCache: async () => 1 });
      assert.equal(out.cachePolicy.mode, 'chromium-default');
      assert.equal(out.httpCacheCeilingBytes, null);
    } finally {
      if (saved !== undefined) process.env['ELECTRON_RENDERER_URL'] = saved;
    }
  });

  it('reads a failure as unknown, never as zero', async () => {
    const out = await readDiskSizes('/p', {
      du: async () => { throw new Error('no du'); },
      free: async () => null,
      httpCache: async () => { throw new Error('no session'); },
      policy: () => ({ httpCacheCeilingBytes: null, cachePolicy: { mode: 'chromium-default', reason: 'r' } })
    });
    assert.deepEqual(out, {
      httpCacheBytes: null,
      codeCacheBytes: null,
      durableBytes: null,
      profileBytes: null,
      freeBytes: null,
      httpCacheCeilingBytes: null,
      cachePolicy: { mode: 'chromium-default', reason: 'r' }
    });
  });
});
