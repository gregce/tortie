/**
 * The file-operations service (Phase 12.9).
 *
 * `trashItem` is faked as a MOVE into a scratch trash folder, which lets the
 * tests assert the property the rule exists for: after a delete — and after a
 * confirmed overwrite — the bytes are still somewhere. If the service ever
 * grew an unlink, `trashed` would be empty and these tests would fail.
 */

import { mkdtemp, mkdir, readdir, readFile, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GmuxErrorPayload } from '@shared/types';
import type { FileOpsService } from '../file-ops';
import { createFileOps } from '../file-ops';

let scratch: string;
let root: string;
let trashDir: string;
let trashed: string[];
let ops: FileOpsService;

beforeEach(async () => {
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'gmux-fsops-')));
  root = join(scratch, 'proj');
  trashDir = join(scratch, 'trash');
  trashed = [];
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(trashDir, { recursive: true });
  await writeFile(join(root, 'src', 'index.ts'), 'index', 'utf8');
  await writeFile(join(root, 'README.md'), 'readme', 'utf8');

  ops = createFileOps({
    trashItem: async (path) => {
      trashed.push(path);
      await rename(path, join(trashDir, `${trashed.length}-${basename(path)}`));
    },
    listProjectRoots: async () => [root]
  });
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

async function payloadOf(promise: Promise<unknown>): Promise<GmuxErrorPayload> {
  try {
    await promise;
  } catch (err) {
    return JSON.parse((err as Error).message) as GmuxErrorPayload;
  }
  throw new Error('expected a rejection');
}

describe('the project-root gate', () => {
  it('refuses a root that is not an open project', async () => {
    const payload = await payloadOf(
      ops.createFile({ root: scratch, path: 'anywhere.txt' })
    );
    expect(payload.code).toBe('PROJECT_NOT_FOUND');
    expect(existsSync(join(scratch, 'anywhere.txt'))).toBe(false);
  });

  it('accepts a symlinked spelling of an open project root', async () => {
    const alias = join(scratch, 'alias');
    await symlink(root, alias);
    const created = await ops.createFile({ root: alias, path: 'via-alias.txt' });
    expect(created.relPath).toBe('via-alias.txt');
    expect(created.path).toBe(join(root, 'via-alias.txt'));
  });
});

describe('createFile / createFolder', () => {
  it('creates an empty file and reports both spellings', async () => {
    const created = await ops.createFile({ root, path: 'src/new.ts' });
    expect(created).toEqual({
      path: join(root, 'src/new.ts'),
      relPath: 'src/new.ts',
      kind: 'file'
    });
    expect(await readFile(created.path, 'utf8')).toBe('');
  });

  it('creates missing parent directories', async () => {
    const created = await ops.createFile({ root, path: 'a/b/c/deep.txt' });
    expect(existsSync(created.path)).toBe(true);
  });

  it('never truncates an existing file — EEXIST rides in `detail`', async () => {
    const payload = await payloadOf(
      ops.createFile({ root, path: 'README.md' })
    );
    expect(payload).toEqual({
      code: 'FS_FAILED',
      message: '"README.md" already exists here.',
      detail: 'EEXIST'
    });
    expect(await readFile(join(root, 'README.md'), 'utf8')).toBe('readme');
  });

  it('creates a folder, and refuses to reuse an existing one', async () => {
    const created = await ops.createFolder({ root, path: 'docs/api' });
    expect(created.kind).toBe('dir');
    expect((await stat(created.path)).isDirectory()).toBe(true);
    expect((await payloadOf(ops.createFolder({ root, path: 'docs' }))).detail)
      .toBe('EEXIST');
  });

  it('refuses to create inside .git or outside the project', async () => {
    expect((await payloadOf(ops.createFile({ root, path: '.git/hook' }))).code)
      .toBe('INVALID_INPUT');
    expect(
      (await payloadOf(ops.createFile({ root, path: '../escaped.txt' }))).code
    ).toBe('INVALID_INPUT');
    expect(existsSync(join(scratch, 'escaped.txt'))).toBe(false);
  });
});

describe('rename', () => {
  it('renames in place with a plain fs.rename', async () => {
    const result = await ops.rename({
      root,
      path: 'src/index.ts',
      name: 'main.ts'
    });
    expect(result.from.relPath).toBe('src/index.ts');
    expect(result.to.relPath).toBe('src/main.ts');
    expect(await readFile(result.to.path, 'utf8')).toBe('index');
    expect(existsSync(result.from.path)).toBe(false);
  });

  it('renames a folder and keeps its contents', async () => {
    const result = await ops.rename({ root, path: 'src/', name: 'source' });
    expect(result.to).toEqual({
      path: join(root, 'source'),
      relPath: 'source',
      kind: 'dir'
    });
    expect(await readdir(result.to.path)).toEqual(['index.ts']);
  });

  it('is a no-op when the name does not change', async () => {
    const result = await ops.rename({
      root,
      path: 'README.md',
      name: 'README.md'
    });
    expect(result.from).toEqual(result.to);
    expect(await readFile(join(root, 'README.md'), 'utf8')).toBe('readme');
  });

  it('allows a case-only rename', async () => {
    const result = await ops.rename({
      root,
      path: 'README.md',
      name: 'Readme.md'
    });
    expect(result.to.relPath).toBe('Readme.md');
  });

  it('never overwrites — an occupied name is refused', async () => {
    await writeFile(join(root, 'src', 'main.ts'), 'other', 'utf8');
    const payload = await payloadOf(
      ops.rename({ root, path: 'src/index.ts', name: 'main.ts' })
    );
    expect(payload.detail).toBe('EEXIST');
    expect(await readFile(join(root, 'src', 'main.ts'), 'utf8')).toBe('other');
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
  });

  it('refuses a name that is really a path, and refuses .git', async () => {
    expect(
      (await payloadOf(
        ops.rename({ root, path: 'README.md', name: '../escaped.md' })
      )).code
    ).toBe('INVALID_INPUT');
    expect(
      (await payloadOf(ops.rename({ root, path: '.git', name: 'nope' }))).code
    ).toBe('INVALID_INPUT');
    expect(existsSync(join(root, '.git'))).toBe(true);
  });

  it('says so plainly when the entry is already gone', async () => {
    const payload = await payloadOf(
      ops.rename({ root, path: 'ghost.txt', name: 'x.txt' })
    );
    expect(payload).toEqual({
      code: 'FS_FAILED',
      message: '"ghost.txt" is no longer there.',
      detail: 'ENOENT'
    });
  });
});

describe('move', () => {
  it('moves a file into a folder', async () => {
    const result = await ops.move({
      root,
      paths: ['README.md'],
      destDir: 'docs/'
    });
    expect(result.status).toBe('moved');
    if (result.status !== 'moved') return;
    expect(result.moved[0]?.to.relPath).toBe('docs/README.md');
    expect(await readFile(join(root, 'docs/README.md'), 'utf8')).toBe('readme');
  });

  it('moves to the project root when the root is the destination', async () => {
    const result = await ops.move({
      root,
      paths: ['src/index.ts'],
      destDir: root
    });
    expect(result.status).toBe('moved');
    if (result.status !== 'moved') return;
    expect(result.moved[0]?.to.relPath).toBe('index.ts');
  });

  it('reports a source already in the destination as skipped, not moved', async () => {
    const result = await ops.move({
      root,
      paths: ['src/index.ts', 'README.md'],
      destDir: 'src'
    });
    expect(result.status).toBe('moved');
    if (result.status !== 'moved') return;
    expect(result.skipped.map((s) => s.relPath)).toEqual(['src/index.ts']);
    expect(result.moved.map((m) => m.to.relPath)).toEqual(['src/README.md']);
  });

  it('resolves would-overwrite and moves NOTHING when a name collides', async () => {
    await writeFile(join(root, 'docs', 'README.md'), 'theirs', 'utf8');
    await writeFile(join(root, 'other.md'), 'mine', 'utf8');
    const result = await ops.move({
      root,
      paths: ['README.md', 'other.md'],
      destDir: 'docs'
    });
    expect(result.status).toBe('would-overwrite');
    if (result.status !== 'would-overwrite') return;
    expect(result.conflicts).toEqual([
      {
        from: { path: join(root, 'README.md'), relPath: 'README.md', kind: 'file' },
        to: {
          path: join(root, 'docs/README.md'),
          relPath: 'docs/README.md',
          kind: 'file'
        }
      }
    ]);
    // The non-colliding sibling stayed put too — the prompt is all-or-nothing.
    expect(existsSync(join(root, 'other.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/other.md'))).toBe(false);
    expect(await readFile(join(root, 'docs/README.md'), 'utf8')).toBe('theirs');
    expect(trashed).toEqual([]);
  });

  it('a confirmed overwrite TRASHES the displaced entry, it does not destroy it', async () => {
    await writeFile(join(root, 'docs', 'README.md'), 'theirs', 'utf8');
    const result = await ops.move({
      root,
      paths: ['README.md'],
      destDir: 'docs',
      overwrite: true
    });
    expect(result.status).toBe('moved');
    expect(trashed).toEqual([join(root, 'docs/README.md')]);
    expect(await readFile(join(root, 'docs/README.md'), 'utf8')).toBe('readme');
    // Recoverable: the displaced bytes are in the Trash, not gone.
    const inTrash = await readdir(trashDir);
    expect(inTrash).toHaveLength(1);
    expect(await readFile(join(trashDir, inTrash[0] ?? ''), 'utf8')).toBe(
      'theirs'
    );
  });

  it('refuses to move a folder into itself or its own descendant', async () => {
    await mkdir(join(root, 'src', 'deep'), { recursive: true });
    expect(
      (await payloadOf(ops.move({ root, paths: ['src/'], destDir: 'src/deep' })))
        .message
    ).toBe('"src" cannot be moved inside itself.');
    expect(
      (await payloadOf(ops.move({ root, paths: ['src/'], destDir: 'src' })))
        .code
    ).toBe('INVALID_INPUT');
  });

  it('refuses .git as a source and refuses an out-of-root destination', async () => {
    expect(
      (await payloadOf(ops.move({ root, paths: ['.git/'], destDir: 'docs' })))
        .message
    ).toBe('gmux does not touch the .git folder.');
    expect(
      (await payloadOf(
        ops.move({ root, paths: ['README.md'], destDir: '../' })
      )).code
    ).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'README.md'))).toBe(true);
  });

  it('refuses a destination that is not a folder', async () => {
    expect(
      (await payloadOf(
        ops.move({ root, paths: ['src/index.ts'], destDir: 'README.md' })
      )).detail
    ).toBe('ENOTDIR');
  });
});

describe('trash', () => {
  it('sends entries to the Trash and reports them', async () => {
    const result = await ops.trash({
      root,
      paths: ['README.md', 'src/']
    });
    expect(result.failed).toEqual([]);
    expect(result.trashed).toEqual([
      { path: join(root, 'README.md'), relPath: 'README.md', kind: 'file' },
      { path: join(root, 'src'), relPath: 'src', kind: 'dir' }
    ]);
    expect(trashed).toEqual([join(root, 'README.md'), join(root, 'src')]);
    expect(existsSync(join(root, 'README.md'))).toBe(false);
    expect(await readdir(trashDir)).toHaveLength(2);
  });

  it('reports per entry so one bad path does not cancel the rest', async () => {
    const result = await ops.trash({
      root,
      paths: ['.git/', 'ghost.txt', 'README.md']
    });
    expect(result.trashed.map((t) => t.relPath)).toEqual(['README.md']);
    expect(result.failed.map((f) => f.message)).toEqual([
      'gmux does not touch the .git folder.',
      '"ghost.txt" is no longer there.'
    ]);
    expect(result.failed[1]?.errno).toBe('ENOENT');
    expect(existsSync(join(root, '.git'))).toBe(true);
  });

  it('refuses an empty selection and the project root itself', async () => {
    expect((await payloadOf(ops.trash({ root, paths: [] }))).code).toBe(
      'INVALID_INPUT'
    );
    const result = await ops.trash({ root, paths: [root] });
    expect(result.trashed).toEqual([]);
    expect(result.failed[0]?.message).toBe(
      'The project folder itself cannot be changed here.'
    );
    expect(existsSync(root)).toBe(true);
  });
});
