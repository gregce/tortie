/**
 * The two decisions an open request makes before anything is fetched:
 * WHICH TAB it lands in, and WHERE THE LEFT SIDE LIVES.
 *
 * Both were round-1 defects. The identity one made a commit's version of a
 * file and the live file the same tab (so the historical view showed
 * HEAD-vs-worktree); the left-path one asked HEAD for a renamed file's NEW
 * path, got nothing, and rendered the whole file as an addition.
 */

import { describe, expect, it } from 'vitest';
import type { OpenFileRequest } from '../../state/open-file';
import { leftPathFor, tabIdFor } from '../tab-identity';

const SHA = 'a6bd13e4f1c2d3b4a5968778695a4b3c2d1e0f9a';

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'src/auth.ts',
    path: '/repo/src/auth.ts',
    mode: 'diff',
    source: 'worktree',
    ...over
  };
}

const commitRef = (over: Record<string, unknown> = {}) =>
  ({
    sha: SHA,
    shortSha: SHA.slice(0, 7),
    status: 'M' as const,
    ...over
  }) as NonNullable<OpenFileRequest['commit']>;

describe('tabIdFor', () => {
  it('keys a worktree tab by its absolute path', () => {
    expect(tabIdFor(req())).toBe('/repo/src/auth.ts');
  });

  it('keys a history tab by sha + relPath, so it never collides with the live file', () => {
    const live = tabIdFor(req());
    const historical = tabIdFor(req({ commit: commitRef() }));
    expect(historical).toBe(`${SHA}:src/auth.ts`);
    expect(historical).not.toBe(live);
  });

  it('gives the same file at two commits two different tabs', () => {
    const a = tabIdFor(req({ commit: commitRef() }));
    const b = tabIdFor(req({ commit: commitRef({ sha: 'b'.repeat(40) }) }));
    expect(a).not.toBe(b);
  });

  it('gives two files of ONE commit two different tabs', () => {
    const a = tabIdFor(req({ commit: commitRef() }));
    const b = tabIdFor(
      req({
        relPath: 'src/server.ts',
        path: '/repo/src/server.ts',
        commit: commitRef()
      })
    );
    expect(a).not.toBe(b);
  });
});

describe('leftPathFor', () => {
  it('is null when nothing was renamed', () => {
    expect(leftPathFor(req())).toBeNull();
    expect(leftPathFor(req({ commit: commitRef() }))).toBeNull();
  });

  it('takes the worktree rename from origPath', () => {
    expect(leftPathFor(req({ origPath: 'src/auth-old.ts' }))).toBe(
      'src/auth-old.ts'
    );
  });

  it('takes the history rename from commit.origPath', () => {
    expect(
      leftPathFor(
        req({ commit: commitRef({ status: 'R', origPath: 'src/auth-old.ts' }) })
      )
    ).toBe('src/auth-old.ts');
  });

  it('prefers the commit pairing when a request carries both', () => {
    expect(
      leftPathFor(
        req({
          origPath: 'src/from-status.ts',
          commit: commitRef({ status: 'R', origPath: 'src/from-commit.ts' })
        })
      )
    ).toBe('src/from-commit.ts');
  });

  it('treats an empty origPath as absent — never asks git for the repo root', () => {
    expect(leftPathFor(req({ origPath: '' }))).toBeNull();
    expect(
      leftPathFor(req({ commit: commitRef({ origPath: '' }) }))
    ).toBeNull();
  });
});
