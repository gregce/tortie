/**
 * PHASE 247 — the classify ask writes nothing and reads no byte.
 *
 * Research 107 section 7.4 found the trap this test exists for: `preparePaths`
 * COPIES a file whose name carries a newline into the drop store and reads 256
 * bytes of every regular file to sniff an image. Both are right for a drop and
 * wrong for a hover, and a link provider is driven by a pointer moving over a
 * pane.
 *
 * The proof is behavioural rather than a scan: the drop store's own directory
 * is counted before and after, and the file is made unreadable so that any
 * `open` of it would throw rather than pass silently.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  chmod,
  mkdtemp,
  readdir,
  realpath,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePaths } from '../prepare';

let dir = '';

beforeAll(async () => {
  dir = await realpath(await mkdtemp(join(tmpdir(), 'p247-classify-')));
});

afterAll(async () => {
  if (dir.length > 0) await rm(dir, { recursive: true, force: true });
});

describe('drop:prepare under { classify: true }', () => {
  it('answers the door and nothing else', async () => {
    const path = join(dir, 'notes.md');
    await writeFile(path, '# hi');
    const { items } = await preparePaths([path], { classify: true });
    expect(items[0]).toMatchObject({
      sourcePath: path,
      kind: 'file',
      refPath: path,
      copied: false,
      isImage: false,
      door: { door: 'editor', path }
    });
  });

  it('answers a refusal for a path no door accepts, and never a kind', async () => {
    const runner = join(dir, 'run.sh');
    await writeFile(runner, '#!/bin/sh\n');
    await chmod(runner, 0o755);
    const { items } = await preparePaths([runner], { classify: true });
    expect(items[0]?.door).toEqual({ door: null, refusal: 'executable-bit' });
    expect(items[0]?.kind).toBe('missing');
  });

  it('does NOT copy a file whose name carries a newline', async () => {
    const named = join(dir, 'two\nlines.md');
    await writeFile(named, 'x');
    const before = (await readdir(dir)).length;
    const { items } = await preparePaths([named], { classify: true });
    expect(items[0]?.copied).toBe(false);
    // Refused before any filesystem call, which is the sequence's first clause.
    expect(items[0]?.door).toEqual({ door: null, refusal: 'control-character' });
    expect((await readdir(dir)).length).toBe(before);
  });

  it('reads no byte, so a file it cannot open still answers', async () => {
    const shy = join(dir, 'unreadable.png');
    await writeFile(shy, 'x');
    // 0o000: an `open` would throw EACCES. The sniff is what would open it.
    await chmod(shy, 0o000);
    const { items } = await preparePaths([shy], { classify: true });
    expect(items[0]?.door).toEqual({ door: 'image', path: shy });
    await chmod(shy, 0o644);
  });

  it('leaves the drop’s own ask exactly as it was', async () => {
    const png = join(dir, 'real.png');
    // A one-pixel PNG's magic bytes, which is what the drop path sniffs for.
    await writeFile(
      png,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    );
    const dropped = await preparePaths([png]);
    expect(dropped.items[0]).toMatchObject({ kind: 'file', isImage: true });
    // ...and no door, because the drop never asked for one.
    expect(dropped.items[0]?.door).toBeUndefined();
  });
});
