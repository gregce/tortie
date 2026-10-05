/**
 * Phase 336 — which folder Tortie may write under on another machine, decided
 * by one pure function main and the renderer both ask.
 *
 * The tables are build/p336/SPEC.md D2 (the pick, legacy root first, §Attack
 * G4), D4 (the never-list, text half) and D10 (the reserved names, folded the
 * way an APFS volume folds them; §Attack M5 measured which spellings this
 * Mac's data volume treats as one `.ssh` folder, and the rows below are taken
 * from that measurement). The last block holds the shared module's resolver
 * and containment against `posix.resolve`, which is what main's own
 * `relativeUnderRoot` and `rootRelativeCwd` use, so the renderer and main
 * cannot disagree about one path.
 */

import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  foldReservedSegment,
  isProtectedRemotePath,
  neverWriteFolder,
  pickWriteFolder,
  pickWriteFolderForPair,
  relativeInFolder,
  resolveRemotePath
} from '../remote-write-folder';

const none = { projects: [] as string[], legacyRoot: null };

// ---------------------------------------------------------------------------
// D2. The pick
// ---------------------------------------------------------------------------

describe('pickWriteFolder', () => {
  it('chooses the deepest open project that holds the target', () => {
    const candidates = { projects: ['/srv', '/srv/app', '/srv/app/sub'], legacyRoot: null };
    expect(pickWriteFolder('/srv/app/sub/a.ts', candidates, 'file')).toEqual({
      path: '/srv/app/sub',
      kind: 'project'
    });
    expect(pickWriteFolder('/srv/app/a.ts', candidates, 'file')).toEqual({
      path: '/srv/app',
      kind: 'project'
    });
    expect(pickWriteFolder('/srv/b.ts', candidates, 'file')).toEqual({
      path: '/srv',
      kind: 'project'
    });
  });

  it('chooses a legacy root that holds the target BEFORE any project inside it (§Attack G4)', () => {
    const candidates = { projects: ['/srv/app'], legacyRoot: '/srv' };
    expect(pickWriteFolder('/srv/app/a.ts', candidates, 'file')).toEqual({
      path: '/srv',
      kind: 'legacy'
    });
    // And a project outside the legacy root is still a candidate of its own.
    expect(
      pickWriteFolder('/opt/x/a.ts', { projects: ['/opt/x'], legacyRoot: '/srv' }, 'file')
    ).toEqual({ path: '/opt/x', kind: 'project' });
  });

  it('holds the never-list for projects and never for a legacy root (SPEC D16)', () => {
    expect(pickWriteFolder('/home/u/a', { projects: ['/home/u'], legacyRoot: null }, 'file')).toEqual({
      refused: 'never',
      path: '/home/u'
    });
    expect(pickWriteFolder('/home/u/a', { projects: [], legacyRoot: '/home/u' }, 'file')).toEqual({
      path: '/home/u',
      kind: 'legacy'
    });
    // An outer never-listed project and an inner ordinary one: the inner one.
    expect(
      pickWriteFolder(
        '/home/u/code/p/a.ts',
        { projects: ['/home/u', '/home/u/code/p'], legacyRoot: null },
        'file'
      )
    ).toEqual({ path: '/home/u/code/p', kind: 'project' });
  });

  it('requires the separator, so a sibling with a longer name is outside', () => {
    expect(pickWriteFolder('/a/bx/c', { projects: ['/a/b'], legacyRoot: null }, 'file')).toEqual({
      refused: 'outside'
    });
    expect(pickWriteFolder('/x/a', none, 'file')).toEqual({ refused: 'outside' });
  });

  it('answers the STORED path byte for byte, whatever spelling it holds', () => {
    for (const stored of ['/srv/./app', '/srv//app', '/srv/x/../app', '/srv/app/']) {
      expect(
        pickWriteFolder('/srv/app/a.ts', { projects: [stored], legacyRoot: null }, 'file')
      ).toEqual({ path: stored, kind: 'project' });
    }
  });

  it('refuses the folder itself in file mode and accepts it in folder mode', () => {
    const candidates = { projects: ['/srv/app'], legacyRoot: null };
    expect(pickWriteFolder('/srv/app', candidates, 'file')).toEqual({ refused: 'outside' });
    expect(pickWriteFolder('/srv/app', candidates, 'folder')).toEqual({
      path: '/srv/app',
      kind: 'project'
    });
    expect(pickWriteFolder('/srv/app/src', candidates, 'folder')).toEqual({
      path: '/srv/app',
      kind: 'project'
    });
  });

  it('does not depend on the order the rows arrived in', () => {
    const one = pickWriteFolder('/srv/app/a', { projects: ['/srv/app', '/srv/./app'], legacyRoot: null }, 'file');
    const two = pickWriteFolder('/srv/app/a', { projects: ['/srv/./app', '/srv/app'], legacyRoot: null }, 'file');
    expect(one).toEqual(two);
  });
});

describe('pickWriteFolderForPair', () => {
  const candidates = { projects: ['/srv', '/srv/app', '/opt/other'], legacyRoot: null };

  it('holds a rename within one project by that project', () => {
    expect(pickWriteFolderForPair('/srv/app/a', '/srv/app/b', candidates)).toEqual({
      path: '/srv/app',
      kind: 'project'
    });
  });

  it('holds a rename across two nested projects by the outer one', () => {
    expect(pickWriteFolderForPair('/srv/app/a', '/srv/b', candidates)).toEqual({
      path: '/srv',
      kind: 'project'
    });
  });

  it('refuses a rename across two unrelated projects', () => {
    expect(pickWriteFolderForPair('/srv/app/a', '/opt/other/a', candidates)).toEqual({
      refused: 'outside'
    });
  });
});

// ---------------------------------------------------------------------------
// D4. The never-list, text half
// ---------------------------------------------------------------------------

describe('neverWriteFolder', () => {
  it('is true for /, a folder holding a home, a home and a home child', () => {
    for (const path of [
      '/',
      '/Users',
      '/home',
      '/Users/x',
      '/home/x',
      '/root',
      '/var/root',
      '/Users/x/y',
      '/home/x/y',
      '/root/y',
      '/var/root/y',
      '/Users/Shared/x'
    ]) {
      expect([path, neverWriteFolder(path)]).toEqual([path, true]);
    }
  });

  it('judges the resolved text, so a dot step cannot dodge it', () => {
    for (const path of ['/Users/x/./y', '/Users/x/y/../z', '/srv/../Users/x', '//home//x/', '/Users/x/..']) {
      expect([path, neverWriteFolder(path)]).toEqual([path, true]);
    }
  });

  it('is true for a folder that is, or sits in, a reserved folder, and for a relative path', () => {
    for (const path of ['/srv/.git', '/srv/app/.GIT/hooks', '/srv/x/.SSH/y', 'relative/x', '']) {
      expect([path, neverWriteFolder(path)]).toEqual([path, true]);
    }
  });

  it('is false for an ordinary folder, a home grandchild and a temporary folder', () => {
    for (const path of [
      '/var/www/site',
      '/tmp/x',
      '/private/tmp/x',
      '/Users/x/code/p',
      '/home/x/code/p',
      '/var',
      '/srv/app',
      '/Users/x/y/../y/z',
      '/srv/.github'
    ]) {
      expect([path, neverWriteFolder(path)]).toEqual([path, false]);
    }
  });
});

// ---------------------------------------------------------------------------
// D10. The reserved names, folded the way the volume folds them
// ---------------------------------------------------------------------------

describe('isProtectedRemotePath and foldReservedSegment', () => {
  it('catches .git and .ssh in every ASCII case, as any segment', () => {
    for (const rel of ['.git', '.GIT', '.Git/x', 'a/.sSH/b', 'src/.ssh', '.SSH/authorized_keys']) {
      expect([rel, isProtectedRemotePath(rel)]).toEqual([rel, true]);
    }
  });

  it('catches the Unicode spellings an APFS volume folds to them (§Attack M5)', () => {
    // sharp s, long s twice, long s once, capital sharp s.
    for (const rel of ['.ßh/x', '.ſsh/x', '.ſſh', '.sſh', '.ẞh/x']) {
      expect([rel, isProtectedRemotePath(rel)]).toEqual([rel, true]);
    }
    expect(foldReservedSegment('.ßh')).toBe('.ssh');
    expect(foldReservedSegment('.ẞh')).toBe('.ssh');
    expect(foldReservedSegment('.ſsh')).toBe('.ssh');
  });

  it('also refuses the invisible and fullwidth spellings, which costs only a name nobody types', () => {
    for (const rel of ['.g​it', '.­git', '．ｇｉｔ', '.ＳＳＨ']) {
      expect([rel, isProtectedRemotePath(rel)]).toEqual([rel, true]);
    }
  });

  it('does not over-match the near misses', () => {
    for (const rel of ['.github', 'x.git', '.gitignore', '.gıt', '.config', 'git', 'ssh', '.sh', '.gİt', 'a/b.ssh']) {
      expect([rel, isProtectedRemotePath(rel)]).toEqual([rel, false]);
    }
    expect(isProtectedRemotePath('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The resolver and the containment agree with what main uses
// ---------------------------------------------------------------------------

const CORPUS = [
  '/',
  '/srv',
  '/srv/',
  '/srv/app',
  '/srv/./app',
  '/srv//app',
  '/srv/x/../app',
  '/srv/app/..',
  '/..',
  '/../srv',
  '//',
  '/srv/app/./src/../src/a.ts',
  '/a/b',
  '/a/bx',
  '/a/b/c'
];

/** main's `relativeUnderRoot`, restated over `posix.resolve`. */
function underRoot(root: string, path: string): string | null {
  if (root.length === 0 || !root.startsWith('/')) return null;
  if (path.length === 0 || !path.startsWith('/')) return null;
  const base = posix.resolve(root);
  const full = posix.resolve(path);
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (!full.startsWith(prefix)) return null;
  const rel = full.slice(prefix.length);
  return rel.length === 0 ? null : rel;
}

/** main's `rootRelativeCwd`, restated over `posix.resolve`. */
function relativeCwd(root: string, path: string): string | null {
  if (root.length === 0 || !root.startsWith('/')) return null;
  if (path.length === 0 || !path.startsWith('/')) return null;
  const base = posix.resolve(root);
  const full = posix.resolve(path);
  if (full === base) return '';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (!full.startsWith(prefix)) return null;
  return full.slice(base.endsWith('/') ? base.length : base.length + 1);
}

describe('the shared resolver and containment agree with posix.resolve', () => {
  it('resolves every absolute path the way posix.resolve does, and refuses a relative one', () => {
    for (const path of CORPUS) expect([path, resolveRemotePath(path)]).toEqual([path, posix.resolve(path)]);
    expect(resolveRemotePath('relative')).toBeNull();
    expect(resolveRemotePath('')).toBeNull();
  });

  it('answers what main answers for every pair in the corpus, in both modes', () => {
    for (const folder of CORPUS) {
      for (const target of CORPUS) {
        expect([folder, target, relativeInFolder(folder, target, 'file')]).toEqual([
          folder,
          target,
          underRoot(folder, target)
        ]);
        expect([folder, target, relativeInFolder(folder, target, 'folder')]).toEqual([
          folder,
          target,
          relativeCwd(folder, target)
        ]);
      }
    }
  });
});
