/**
 * Creating a project (Phase 12.9 item 1).
 *
 * The two properties that matter: the ORDER never strands the user (the
 * folder is created before anything can fail, and a `git init` failure still
 * yields an open project), and nothing here can write outside the parent the
 * user picked.
 */

import { describe, expect, it, vi } from 'vitest';
import type { GmuxErrorPayload, Project } from '@shared/types';
import { validateProjectName } from '@shared/project-create';
import { createProjectCreator } from '../create';
import type { ProjectCreateDeps } from '../create';

function payloadOf(err: unknown): GmuxErrorPayload {
  const raw = err instanceof Error ? err.message : String(err);
  return JSON.parse(raw.slice(raw.indexOf('{'))) as GmuxErrorPayload;
}

interface World {
  deps: ProjectCreateDeps;
  made: string[];
  inited: string[];
  added: string[];
}

function world(overrides: Partial<ProjectCreateDeps> = {}): World {
  const made: string[] = [];
  const inited: string[] = [];
  const added: string[] = [];
  const deps: ProjectCreateDeps = {
    exists: async (p) => made.includes(p),
    isDirectory: async (p) => p === '/Users/me/src' || made.includes(p),
    makeDirectory: async (p) => {
      made.push(p);
    },
    gitInit: async (p) => {
      inited.push(p);
    },
    addProject: async (p): Promise<Project> => {
      added.push(p);
      return {
        id: 'p1',
        path: p,
        name: p.slice(p.lastIndexOf('/') + 1)
      } as Project;
    },
    ...overrides
  };
  return { deps, made, inited, added };
}

describe('creating a project', () => {
  it('makes the folder, inits the repo, and opens it — in that order', async () => {
    const w = world();
    const result = await createProjectCreator(w.deps).create({
      parentDir: '/Users/me/src',
      name: 'new-thing',
      gitInit: true
    });

    expect(w.made).toEqual(['/Users/me/src/new-thing']);
    expect(w.inited).toEqual(['/Users/me/src/new-thing']);
    expect(w.added).toEqual(['/Users/me/src/new-thing']);
    expect(result.path).toBe('/Users/me/src/new-thing');
    expect(result.isRepo).toBe(true);
    expect(result.gitError).toBeUndefined();
  });

  it('leaves the folder plain when the checkbox is off', async () => {
    const w = world();
    const result = await createProjectCreator(w.deps).create({
      parentDir: '/Users/me/src',
      name: 'plain',
      gitInit: false
    });
    expect(w.inited).toEqual([]);
    expect(result.isRepo).toBe(false);
  });

  it('still opens the project when git init fails', async () => {
    // The rule this test exists for: a git failure must never cost the user
    // the folder they just made. A non-repo folder is a supported project
    // state (DESIGN.md §6.3) with its own [Initialize repository] retry.
    const w = world({
      gitInit: async () => {
        throw new Error('git: command not found');
      }
    });
    const result = await createProjectCreator(w.deps).create({
      parentDir: '/Users/me/src',
      name: 'repoless',
      gitInit: true
    });
    expect(w.made).toEqual(['/Users/me/src/repoless']);
    expect(w.added).toEqual(['/Users/me/src/repoless']);
    expect(result.isRepo).toBe(false);
    expect(result.gitError).toContain('command not found');
  });

  it('refuses a name that already exists, without touching the disk', async () => {
    const w = world({ exists: async () => true });
    const err = await createProjectCreator(w.deps)
      .create({ parentDir: '/Users/me/src', name: 'taken', gitInit: true })
      .catch((e: unknown) => e);
    expect(payloadOf(err).code).toBe('INVALID_INPUT');
    expect(payloadOf(err).message).toContain("'taken' already exists");
    expect(w.made).toEqual([]);
  });

  it('quotes a taken name with what cannot be seen written out (Phase 274.3, the fix round of Phase 352)', async () => {
    const w = world({ exists: async () => true });
    const err = await createProjectCreator(w.deps)
      .create({ parentDir: '/Users/me/src', name: 'tak\u200Ben', gitInit: true })
      .catch((e: unknown) => e);
    expect(payloadOf(err).message).toBe("'tak<U+200B>en' already exists in that folder.");
    expect(payloadOf(err).detail).toBe('/Users/me/src/tak\u200Ben');
  });

  it('refuses a parent that is not a directory any more', async () => {
    const w = world({ isDirectory: async () => false });
    const err = await createProjectCreator(w.deps)
      .create({ parentDir: '/Users/me/gone', name: 'x', gitInit: false })
      .catch((e: unknown) => e);
    expect(payloadOf(err).message).toMatch(/does not exist/i);
    expect(w.made).toEqual([]);
  });

  it('refuses a relative parent — the picker always hands back absolutes', async () => {
    const w = world();
    const err = await createProjectCreator(w.deps)
      .create({ parentDir: 'src', name: 'x', gitInit: false })
      .catch((e: unknown) => e);
    expect(payloadOf(err).code).toBe('INVALID_INPUT');
    expect(w.made).toEqual([]);
  });

  it('cannot be steered out of the chosen folder by the NAME', async () => {
    const w = world();
    for (const name of ['../escape', 'a/b', '/etc/passwd', '..', '.']) {
      const err = await createProjectCreator(w.deps)
        .create({ parentDir: '/Users/me/src', name, gitInit: false })
        .catch((e: unknown) => e);
      expect(payloadOf(err).code).toBe('INVALID_INPUT');
    }
    expect(w.made).toEqual([]);
  });

  it('surfaces a real mkdir failure as FS_FAILED and opens nothing', async () => {
    const w = world({
      makeDirectory: async () => {
        throw new Error('EACCES: permission denied');
      }
    });
    const err = await createProjectCreator(w.deps)
      .create({ parentDir: '/Users/me/src', name: 'nope', gitInit: true })
      .catch((e: unknown) => e);
    expect(payloadOf(err).code).toBe('FS_FAILED');
    expect(payloadOf(err).detail).toContain('EACCES');
    expect(w.added).toEqual([]);
    expect(w.inited).toEqual([]);
  });

  it('trims the name it writes', async () => {
    const w = world();
    await createProjectCreator(w.deps).create({
      parentDir: '/Users/me/src/',
      name: '  spaced  ',
      gitInit: false
    });
    expect(w.made).toEqual(['/Users/me/src/spaced']);
  });
});

describe('the shared name rule', () => {
  it('accepts what the filesystem accepts', () => {
    for (const name of ['app', '.dotted', 'My Project', 'a-b_c.2', '日本語']) {
      expect(validateProjectName(name)).toBeNull();
    }
  });

  it('names the problem for everything it refuses', () => {
    expect(validateProjectName('')).toMatch(/name/i);
    expect(validateProjectName('   ')).toMatch(/name/i);
    expect(validateProjectName('.')).toMatch(/folder name/i);
    expect(validateProjectName('..')).toMatch(/folder name/i);
    expect(validateProjectName('a/b')).toMatch(/slashes/i);
    expect(validateProjectName('a\u0000b')).toMatch(/characters/i);
    expect(validateProjectName('x'.repeat(201))).toMatch(/too long/i);
  });

  it('is the SAME rule main enforces (no renderer-only validation)', async () => {
    // If these two ever diverge, a name the dialog accepts reaches mkdir and
    // comes back as an errno — the error shape this product refuses to show.
    const w = world();
    const creator = createProjectCreator(w.deps);
    const bad = 'a/b';
    expect(validateProjectName(bad)).not.toBeNull();
    await expect(
      creator.create({ parentDir: '/Users/me/src', name: bad, gitInit: false })
    ).rejects.toThrow();
  });
});

describe('git init is the real one', () => {
  it('runs inside the new folder, never the parent', async () => {
    const gitInit = vi.fn(async () => undefined);
    const w = world({ gitInit });
    await createProjectCreator(w.deps).create({
      parentDir: '/Users/me/src',
      name: 'inner',
      gitInit: true
    });
    expect(gitInit).toHaveBeenCalledWith('/Users/me/src/inner');
  });
});
