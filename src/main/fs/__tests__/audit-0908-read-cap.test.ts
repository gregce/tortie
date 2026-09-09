import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { READ_CAP_BYTES } from '@shared/fs-ops';

const observation = vi.hoisted(() => ({ target: '', bytes: 0, armed: false }));
vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs')>();
  return { ...fs, readSync: (...args: Parameters<typeof fs.readSync>) => {
    if (observation.armed) {
      observation.armed = false;
      // A deterministic external-growth boundary: after fstat, before read.
      fs.appendFileSync(observation.target, Buffer.alloc(16 * 1024 * 1024, 97));
    }
    const got = fs.readSync(...args);
    observation.bytes += got;
    return got;
  } };
});
import { writeGuarded } from '../guarded-write';

it('stops reading at its cap when the file grows after fstat', async () => {
  const root = mkdtempSync(join(tmpdir(), 'audit-0908-read-'));
  try {
    const path = join(root, 'a.txt');
    writeFileSync(path, 'a');
    observation.target = path;
    observation.bytes = 0;
    observation.armed = true;
    const answer = await writeGuarded({ listProjectRoots: async () => [root] }, {
      root, path: 'a.txt', contents: 'replacement', expect: '0'.repeat(64)
    });
    console.log(JSON.stringify({ answer, readBytes: observation.bytes, cap: READ_CAP_BYTES, diskBytes: readFileSync(path).length }));
    expect(answer).toMatchObject({ outcome: 'refused', why: 'tooLarge' });
    expect(observation.bytes).toBeLessThanOrEqual(READ_CAP_BYTES + 1);
  } finally {
    observation.armed = false;
    rmSync(root, { recursive: true, force: true });
  }
});
