/**
 * The path-escape guards (Phase 12.9). These are the tests that matter most
 * in this stream: everything else in the file-operations service assumes a
 * path has already been proven to live inside the project.
 *
 * All fixtures are freshly created temp directories — the product code under
 * test never deletes anything (delete is shell.trashItem, injected), and the
 * teardown here only removes the directory this file made.
 */

import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GmuxErrorPayload } from '@shared/types';
import { assertBasename, resolveInsideRoot, resolveProjectRoot } from '../paths';

let scratch: string;
let root: string;
let outside: string;

beforeEach(async () => {
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'gmux-fspaths-')));
  root = join(scratch, 'proj');
  outside = join(scratch, 'outside');
  await mkdir(join(root, 'src', 'nested'), { recursive: true });
  await mkdir(join(root, '.git', 'hooks'), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(root, 'src', 'index.ts'), 'x', 'utf8');
  await writeFile(join(outside, 'secret.txt'), 'x', 'utf8');
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** The structured payload a guard rejection carries. */
async function refusal(promise: Promise<unknown>): Promise<GmuxErrorPayload> {
  try {
    await promise;
  } catch (err) {
    return JSON.parse((err as Error).message) as GmuxErrorPayload;
  }
  throw new Error('expected the path to be refused, but it was accepted');
}

describe('resolveProjectRoot', () => {
  it('refuses a relative or empty root', async () => {
    expect((await refusal(resolveProjectRoot('proj'))).code).toBe(
      'INVALID_INPUT'
    );
    expect((await refusal(resolveProjectRoot(''))).code).toBe('INVALID_INPUT');
    expect((await refusal(resolveProjectRoot(undefined))).code).toBe(
      'INVALID_INPUT'
    );
  });

  it('refuses a root that does not exist', async () => {
    const payload = await refusal(resolveProjectRoot(join(scratch, 'nope')));
    expect(payload.message).toBe('That project folder does not exist.');
  });

  it('collapses symlinks so later comparisons use one spelling', async () => {
    const alias = join(scratch, 'alias');
    await symlink(root, alias);
    expect(await resolveProjectRoot(alias)).toBe(root);
  });
});

describe('resolveInsideRoot — paths that must be accepted', () => {
  it('accepts a root-relative path', async () => {
    expect(await resolveInsideRoot(root, 'src/index.ts')).toEqual({
      abs: join(root, 'src/index.ts'),
      rel: 'src/index.ts'
    });
  });

  it('accepts an absolute path that is inside the root', async () => {
    expect(await resolveInsideRoot(root, join(root, 'src/index.ts'))).toEqual({
      abs: join(root, 'src/index.ts'),
      rel: 'src/index.ts'
    });
  });

  it("accepts Pierre's trailing-slash directory spelling", async () => {
    expect(await resolveInsideRoot(root, 'src/nested/')).toEqual({
      abs: join(root, 'src/nested'),
      rel: 'src/nested'
    });
  });

  it('accepts a path that does not exist yet (create targets)', async () => {
    expect(await resolveInsideRoot(root, 'src/brand/new/file.ts')).toEqual({
      abs: join(root, 'src/brand/new/file.ts'),
      rel: 'src/brand/new/file.ts'
    });
  });

  it('accepts .gitignore — only the .git SEGMENT is protected', async () => {
    expect((await resolveInsideRoot(root, '.gitignore')).rel).toBe(
      '.gitignore'
    );
  });

  it('accepts a symlink LEAF pointing outside: the link itself is ours', async () => {
    await symlink(join(outside, 'secret.txt'), join(root, 'link.txt'));
    expect(await resolveInsideRoot(root, 'link.txt')).toEqual({
      abs: join(root, 'link.txt'),
      rel: 'link.txt'
    });
  });
});

describe('resolveInsideRoot — escapes that must be refused', () => {
  it('refuses ../ escapes', async () => {
    expect((await refusal(resolveInsideRoot(root, '../outside/secret.txt'))).message)
      .toBe('That path is outside the project.');
    expect(
      (await refusal(resolveInsideRoot(root, 'src/../../outside/secret.txt')))
        .code
    ).toBe('INVALID_INPUT');
    expect((await refusal(resolveInsideRoot(root, '..'))).code).toBe(
      'INVALID_INPUT'
    );
  });

  it('refuses an absolute path outside the root', async () => {
    expect((await refusal(resolveInsideRoot(root, '/etc/passwd'))).code).toBe(
      'INVALID_INPUT'
    );
    expect(
      (await refusal(resolveInsideRoot(root, join(outside, 'secret.txt')))).code
    ).toBe('INVALID_INPUT');
  });

  it('refuses a sibling directory that merely shares the prefix', async () => {
    const decoy = `${root}-evil`;
    await mkdir(decoy, { recursive: true });
    expect(
      (await refusal(resolveInsideRoot(root, join(decoy, 'x.txt')))).code
    ).toBe('INVALID_INPUT');
  });

  it('refuses a path reached THROUGH a directory symlink out of the root', async () => {
    await symlink(outside, join(root, 'escape'));
    expect(
      (await refusal(resolveInsideRoot(root, 'escape/secret.txt'))).message
    ).toBe('That path is outside the project.');
  });

  it('refuses a NOT-YET-EXISTING path whose ancestor links out of the root', async () => {
    await symlink(outside, join(root, 'escape'));
    expect(
      (await refusal(resolveInsideRoot(root, 'escape/deep/new.txt'))).code
    ).toBe('INVALID_INPUT');
  });

  it('refuses .git at any depth, and its contents', async () => {
    for (const path of ['.git', '.git/', '.git/config', 'src/.git/hooks']) {
      const payload = await refusal(resolveInsideRoot(root, path));
      expect(payload.message).toBe('gmux does not touch the .git folder.');
    }
  });

  it('refuses the project root itself unless the caller allows it', async () => {
    expect((await refusal(resolveInsideRoot(root, root))).message).toBe(
      'The project folder itself cannot be changed here.'
    );
    expect(await resolveInsideRoot(root, root, { allowRoot: true })).toEqual({
      abs: root,
      rel: ''
    });
    expect(await resolveInsideRoot(root, '.', { allowRoot: true })).toEqual({
      abs: root,
      rel: ''
    });
  });

  it('refuses empty input and embedded NULs', async () => {
    expect((await refusal(resolveInsideRoot(root, ''))).code).toBe(
      'INVALID_INPUT'
    );
    expect((await refusal(resolveInsideRoot(root, 'a\0b'))).code).toBe(
      'INVALID_INPUT'
    );
    expect((await refusal(resolveInsideRoot(root, 42))).code).toBe(
      'INVALID_INPUT'
    );
  });
});

describe('assertBasename', () => {
  it('accepts a plain name and trims it', () => {
    expect(assertBasename('  notes.md  ')).toBe('notes.md');
  });

  it('refuses names that are paths, empty, dots, or .git', () => {
    for (const name of ['', '   ', '.', '..', 'a/b', 'x\0y', '.git']) {
      expect(() => assertBasename(name)).toThrow();
    }
    expect(() => assertBasename(undefined)).toThrow();
  });
});
