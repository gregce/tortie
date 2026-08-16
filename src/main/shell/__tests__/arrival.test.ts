/**
 * resolveShellArrival (Phase 61): one arriving Finder path becomes a folder,
 * a file with its project, or a refusal with its reason.
 *
 * Real temp directories, no mocks: the function's only effects are realpath,
 * one stat and an existsSync walk, so the cheapest honest test is the real
 * filesystem. Each case builds exactly the tree it needs.
 */

import { afterAll, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveShellArrival, WHOLE_DISK_REASON } from '../arrival';

// TMPDIR on macOS is a symlink (/var/folders → /private/var/folders), and
// the function realpaths every arrival, so expectations are built from the
// realpathed base.
const base = realpathSync(mkdtempSync(join(tmpdir(), 'p61-arrival-')));

// A fake home directory for the root-and-home refusals. Passing it in keeps
// the tests off the operator's real home.
const home = join(base, 'home');
mkdirSync(home, { recursive: true });

// A git repository: .git as a DIRECTORY, files at two depths.
const repo = join(base, 'repo');
mkdirSync(join(repo, '.git'), { recursive: true });
mkdirSync(join(repo, 'sub', 'dir'), { recursive: true });
writeFileSync(join(repo, 'sub', 'dir', 'readme.md'), '# p61\n');
writeFileSync(join(repo, 'pic.png'), 'not a real png\n');
writeFileSync(join(repo, 'blob.zip'), 'zip bytes\n');

// A worktree-shaped checkout: .git as a FILE.
const worktree = join(base, 'worktree');
mkdirSync(worktree, { recursive: true });
writeFileSync(join(worktree, '.git'), 'gitdir: /somewhere/else\n');
writeFileSync(join(worktree, 'notes.txt'), 'notes\n');

// A plain folder, no repository anywhere in the temp tree above it.
const plain = join(base, 'plain');
mkdirSync(plain, { recursive: true });
writeFileSync(join(plain, 'notes.txt'), 'notes\n');

// A file directly in the fake home, with no repository above it.
writeFileSync(join(home, 'stray.txt'), 'stray\n');

afterAll(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('folders', () => {
  it('a directory opens as a project folder', () => {
    expect(resolveShellArrival(plain, home)).toEqual({
      kind: 'folder',
      folder: plain
    });
  });

  it('the filesystem root is refused', () => {
    expect(resolveShellArrival('/', home)).toEqual({
      kind: 'refused',
      reason: WHOLE_DISK_REASON
    });
  });

  it('the home directory itself is refused', () => {
    expect(resolveShellArrival(home, home)).toEqual({
      kind: 'refused',
      reason: WHOLE_DISK_REASON
    });
  });
});

describe('files and their projects', () => {
  it('a file two levels deep resolves to the repository root, not its own directory', () => {
    const arrival = resolveShellArrival(
      join(repo, 'sub', 'dir', 'readme.md'),
      home
    );
    expect(arrival).toEqual({
      kind: 'file',
      folder: repo,
      file: join(repo, 'sub', 'dir', 'readme.md'),
      repository: true,
      displayable: true
    });
  });

  it('a .git FILE (worktrees, submodules) also marks a repository root', () => {
    const arrival = resolveShellArrival(join(worktree, 'notes.txt'), home);
    expect(arrival).toMatchObject({
      kind: 'file',
      folder: worktree,
      repository: true
    });
  });

  it('no repository above means the parent folder is the project', () => {
    const arrival = resolveShellArrival(join(plain, 'notes.txt'), home);
    expect(arrival).toEqual({
      kind: 'file',
      folder: plain,
      file: join(plain, 'notes.txt'),
      repository: false,
      displayable: true
    });
  });

  it('a file whose project would be the home directory is refused', () => {
    expect(resolveShellArrival(join(home, 'stray.txt'), home)).toEqual({
      kind: 'refused',
      reason: WHOLE_DISK_REASON
    });
  });
});

describe('the displayable flag', () => {
  it('is true for an image', () => {
    const arrival = resolveShellArrival(join(repo, 'pic.png'), home);
    expect(arrival).toMatchObject({ kind: 'file', displayable: true });
  });

  it('is false for a binary that is not an image, and gates nothing else', () => {
    const arrival = resolveShellArrival(join(repo, 'blob.zip'), home);
    expect(arrival).toMatchObject({
      kind: 'file',
      folder: repo,
      repository: true,
      displayable: false
    });
  });
});

describe('symlinks and missing paths', () => {
  it('a symlink resolves first, then every rule applies to the target', () => {
    const link = join(base, 'link-to-readme.md');
    symlinkSync(join(repo, 'sub', 'dir', 'readme.md'), link);
    const arrival = resolveShellArrival(link, home);
    expect(arrival).toMatchObject({
      kind: 'file',
      folder: repo,
      file: join(repo, 'sub', 'dir', 'readme.md')
    });
  });

  it('a path that no longer exists is refused with its reason', () => {
    expect(resolveShellArrival(join(base, 'gone.md'), home)).toEqual({
      kind: 'refused',
      reason: 'does not exist'
    });
  });
});
