import { describe, expect, it } from 'vitest';
import type {
  GitBranchInfo,
  GitDecorationRef,
  GitRemoteBranchInfo
} from '@shared/types';
import {
  badgesFromRefs,
  badgesFromTips,
  refsAriaClause
} from '../ref-badges';

const local = (name: string, current = false): GitDecorationRef => ({
  kind: 'localBranch',
  name,
  fullName: `refs/heads/${name}`,
  ...(current ? { current: true as const } : {})
});

const remote = (name: string, remoteName = 'origin'): GitDecorationRef => ({
  kind: 'remoteBranch',
  name,
  fullName: `refs/remotes/${name}`,
  remote: remoteName
});

const tag = (name: string): GitDecorationRef => ({
  kind: 'tag',
  name,
  fullName: `refs/tags/${name}`
});

describe('badgesFromRefs — priority order (research 24-d3 §4.3)', () => {
  it('puts HEAD first and its upstream second, ahead of everything else', () => {
    // The census case: getspecstory's HEAD commit carries five refs.
    const badges = badgesFromRefs(
      [
        tag('v2.8.0'),
        remote('specstoryai/dev', 'specstoryai'),
        local('dev', true),
        remote('origin/dev'),
        local('aaa-alphabetically-first')
      ],
      'origin/dev'
    );
    expect(badges.map((b) => b.name)).toEqual([
      'dev',
      'origin/dev',
      'aaa-alphabetically-first',
      'v2.8.0',
      'specstoryai/dev'
    ]);
  });

  it('never lets the upstream pill fall into the overflow', () => {
    // Three pills render; the upstream must be inside that window whatever
    // else the commit carries. Alphabetical sorting used to bury it.
    const badges = badgesFromRefs(
      [
        local('zzz-worktree-4'),
        local('zzz-worktree-3'),
        local('zzz-worktree-2'),
        remote('origin/main'),
        local('main', true)
      ],
      'origin/main'
    );
    expect(badges.slice(0, 3).map((b) => b.name)).toEqual([
      'main',
      'origin/main',
      'zzz-worktree-2'
    ]);
  });

  it('sorts tags newest first, naturally (v2.10 after v2.9)', () => {
    const badges = badgesFromRefs(
      [tag('v2.9.0'), tag('v2.10.0'), tag('v2.8.0')],
      null
    );
    expect(badges.map((b) => b.name)).toEqual(['v2.10.0', 'v2.9.0', 'v2.8.0']);
  });

  it('marks a detached HEAD and hoists it above every branch', () => {
    const badges = badgesFromRefs(
      [local('main'), { kind: 'head', name: 'HEAD', fullName: 'HEAD' }],
      null
    );
    expect(badges[0]?.kind).toBe('detachedHead');
    expect(badges[0]?.head).toBe(true);
  });
});

describe('badgesFromRefs — remote prefix split', () => {
  it('dims the remote name, keeps the branch as the identity', () => {
    const [badge] = badgesFromRefs([remote('origin/feat/x')], null);
    expect(badge?.prefix).toBe('origin/');
    expect(badge?.label).toBe('feat/x');
  });

  it('honours a multi-segment remote name over the first slash', () => {
    const [badge] = badgesFromRefs(
      [remote('team/fork/main', 'team/fork')],
      null
    );
    expect(badge?.prefix).toBe('team/fork/');
    expect(badge?.label).toBe('main');
  });
});

describe('badgesFromTips — the older-preload fallback', () => {
  const branch = (
    name: string,
    sha: string,
    extra: Partial<GitBranchInfo> = {}
  ): GitBranchInfo => ({
    name,
    current: false,
    sha,
    shortSha: sha.slice(0, 7),
    ahead: 0,
    behind: 0,
    subject: 's',
    ...extra
  });

  const remoteTip = (name: string, sha: string): GitRemoteBranchInfo => ({
    name,
    remote: name.slice(0, name.indexOf('/')),
    shortName: name.slice(name.indexOf('/') + 1),
    sha,
    shortSha: sha.slice(0, 7),
    subject: 's'
  });

  it('pins the remote pill to the REMOTE tip, not the local one', () => {
    // The shipped bug in one assertion: with the branch 2 ahead, the old code
    // emitted no remote pill at all (`ahead === 0 && behind === 0`), so the
    // divergence was invisible. Now each pill lands on its own commit.
    const branches = [
      branch('main', 'aaa', { current: true, upstream: 'origin/main', ahead: 2 })
    ];
    const remotes = [remoteTip('origin/main', 'bbb')];

    expect(
      badgesFromTips(branches, remotes, 'aaa', 'origin/main').map((b) => b.name)
    ).toEqual(['main']);
    expect(
      badgesFromTips(branches, remotes, 'bbb', 'origin/main').map((b) => b.name)
    ).toEqual(['origin/main']);
  });

  it('is empty for a commit no ref points at', () => {
    expect(badgesFromTips([branch('main', 'aaa')], [], 'ccc', null)).toEqual([]);
  });
});

describe('refsAriaClause', () => {
  it('names every ref, including ones the row truncated away', () => {
    const badges = badgesFromRefs(
      [local('main', true), remote('origin/main'), tag('v1.0')],
      'origin/main'
    );
    expect(refsAriaClause(badges)).toBe(', on main, origin/main, v1.0');
  });

  it('adds nothing when the commit carries no refs', () => {
    expect(refsAriaClause([])).toBe('');
  });
});
