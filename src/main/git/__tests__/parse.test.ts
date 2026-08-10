import { describe, expect, it } from 'vitest';
import {
  LOG_FORMAT,
  parseLog,
  parsePorcelainV2Status,
  parseRemoteVerbose,
  remoteOfUpstream,
  STATUS_LIMIT
} from '../parse';
import {
  isRelevantDotGitPath,
  readGitdirPointer
} from '../../watcher/repo-watcher';

const NUL = '\0';
const US = '\x1f';

function z(...lines: string[]): string {
  return lines.join(NUL) + NUL;
}

describe('parsePorcelainV2Status', () => {
  it('parses branch headers with upstream and ahead/behind', () => {
    const out = z(
      '# branch.oid 1111111222222233333334444444555555566666667',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1'
    );
    const s = parsePorcelainV2Status(out);
    expect(s.branch).toBe('main');
    expect(s.upstream).toBe('origin/main');
    expect(s.ahead).toBe(2);
    expect(s.behind).toBe(1);
    expect(s.detachedAt).toBeUndefined();
    expect(s.files).toEqual([]);
  });

  it('reports detached HEAD via short sha', () => {
    const out = z(
      '# branch.oid abcdef0123456789abcdef0123456789abcdef01',
      '# branch.head (detached)'
    );
    const s = parsePorcelainV2Status(out);
    expect(s.branch).toBeUndefined();
    expect(s.detachedAt).toBe('abcdef0');
  });

  it('handles an unborn branch (initial oid, no upstream)', () => {
    const out = z('# branch.oid (initial)', '# branch.head main');
    const s = parsePorcelainV2Status(out);
    expect(s.branch).toBe('main');
    expect(s.ahead).toBe(0);
    expect(s.behind).toBe(0);
  });

  it('parses ordinary changed entries into the right groups', () => {
    const out = z(
      '# branch.head main',
      '1 .M N... 100644 100644 100644 aaaa bbbb src/worktree modified.ts',
      '1 M. N... 100644 100644 100644 aaaa bbbb staged.ts',
      '1 MM N... 100644 100644 100644 aaaa bbbb both.ts',
      '1 .D N... 100644 100644 000000 aaaa bbbb deleted.ts',
      '? untracked file.txt'
    );
    const s = parsePorcelainV2Status(out);
    expect(s.files).toHaveLength(5);

    const worktreeMod = s.files[0]!;
    expect(worktreeMod.path).toBe('src/worktree modified.ts'); // space kept
    expect(worktreeMod.indexState).toBe('.');
    expect(worktreeMod.worktreeState).toBe('M');

    expect(s.groups.staged.map((f) => f.path)).toEqual([
      'staged.ts',
      'both.ts'
    ]);
    expect(s.groups.changes.map((f) => f.path)).toEqual([
      'src/worktree modified.ts',
      'both.ts',
      'deleted.ts'
    ]);
    expect(s.groups.untracked.map((f) => f.path)).toEqual([
      'untracked file.txt'
    ]);
    expect(s.groups.merge).toEqual([]);
    expect(s.truncated).toBe(false);
  });

  it('parses rename entries with the -z origPath token', () => {
    const out = z(
      '# branch.head main',
      '2 R. N... 100644 100644 100644 aaaa bbbb R100 new name.ts',
      'old name.ts',
      '1 .M N... 100644 100644 100644 aaaa bbbb after.ts'
    );
    const s = parsePorcelainV2Status(out);
    expect(s.files).toHaveLength(2);
    const ren = s.files[0]!;
    expect(ren.path).toBe('new name.ts');
    expect(ren.origPath).toBe('old name.ts');
    expect(ren.indexState).toBe('R');
    // the entry after the rename is not swallowed by the origPath token
    expect(s.files[1]!.path).toBe('after.ts');
  });

  it('parses unmerged entries into the merge group and flags conflicts', () => {
    const out = z(
      '# branch.head main',
      'u UU N... 100644 100644 100644 100644 a1 a2 a3 conflict.ts'
    );
    const s = parsePorcelainV2Status(out);
    expect(s.hasConflicts).toBe(true);
    expect(s.groups.merge.map((f) => f.path)).toEqual(['conflict.ts']);
    expect(s.groups.staged).toEqual([]);
  });

  it('caps at STATUS_LIMIT and flags truncation', () => {
    const lines = ['# branch.head main'];
    for (let i = 0; i < STATUS_LIMIT + 5; i++) {
      lines.push(`1 .M N... 100644 100644 100644 aaaa bbbb f${i}.ts`);
    }
    const s = parsePorcelainV2Status(z(...lines));
    expect(s.files).toHaveLength(STATUS_LIMIT);
    expect(s.truncated).toBe(true);
  });

  it('tolerates empty output (clean repo, no branch headers)', () => {
    const s = parsePorcelainV2Status('');
    expect(s.files).toEqual([]);
    expect(s.branch).toBeUndefined();
  });
});

describe('parseLog', () => {
  it('parses NUL-delimited records with unit-separated fields', () => {
    const rec1 = [
      'a'.repeat(40),
      'aaaaaaa',
      `${'b'.repeat(40)} ${'c'.repeat(40)}`,
      'Grace Hopper',
      'grace@navy.mil',
      '1700000000',
      'Merge: fix the compiler'
    ].join(US);
    const rec2 = [
      'b'.repeat(40),
      'bbbbbbb',
      '',
      'Ada Lovelace',
      'ada@analytical.engine',
      '1600000000',
      'Initial commit'
    ].join(US);
    const entries = parseLog(rec1 + NUL + rec2 + NUL);
    expect(entries).toHaveLength(2);

    const e1 = entries[0]!;
    expect(e1.hash).toBe('a'.repeat(40));
    expect(e1.sha).toBe(e1.hash);
    expect(e1.shortSha).toBe('aaaaaaa');
    expect(e1.parents).toEqual(['b'.repeat(40), 'c'.repeat(40)]);
    expect(e1.authorName).toBe('Grace Hopper');
    expect(e1.author).toBe('Grace Hopper');
    expect(e1.authorEmail).toBe('grace@navy.mil');
    expect(e1.authorDate).toBe(1700000000000);
    expect(e1.dateISO).toBe(new Date(1700000000000).toISOString());
    expect(e1.subject).toBe('Merge: fix the compiler');

    expect(entries[1]!.parents).toEqual([]); // root commit
  });

  it('format string and parser agree on field count', () => {
    // 7 fields: %H %h %P %an %ae %at %s
    expect(LOG_FORMAT.split('%x1f')).toHaveLength(7);
  });
});

describe('watcher helpers', () => {
  it('accepts exactly the ref/sequencer paths and rejects noise', () => {
    expect(isRelevantDotGitPath('HEAD')).toBe(true);
    expect(isRelevantDotGitPath('refs/heads/main')).toBe(true);
    expect(isRelevantDotGitPath('packed-refs')).toBe(true);
    expect(isRelevantDotGitPath('index')).toBe(true);
    expect(isRelevantDotGitPath('MERGE_HEAD')).toBe(true);
    expect(isRelevantDotGitPath('rebase-merge/todo')).toBe(true);

    expect(isRelevantDotGitPath('index.lock')).toBe(false);
    expect(isRelevantDotGitPath('refs/heads/main.lock')).toBe(false);
    expect(isRelevantDotGitPath('objects/ab/cdef')).toBe(false);
    expect(isRelevantDotGitPath('COMMIT_EDITMSG')).toBe(false);
    expect(isRelevantDotGitPath('')).toBe(false);
  });

  it('follows gitdir pointer files, resolving relative targets', () => {
    expect(
      readGitdirPointer(
        '/repo/wt/.git',
        'gitdir: /main/.git/worktrees/wt\n'
      )
    ).toBe('/main/.git/worktrees/wt');
    expect(
      readGitdirPointer('/repo/sub/.git', 'gitdir: ../.git/modules/sub\n')
    ).toBe('/repo/.git/modules/sub');
    expect(readGitdirPointer('/repo/.git', 'not a pointer')).toBeNull();
  });
});

describe('parseRemoteVerbose (Phase 12 item 3)', () => {
  it('pairs fetch/push lines into one remote each, origin first', () => {
    const out = parseRemoteVerbose(
      [
        'upstream\thttps://github.com/other/gmux.git (fetch)',
        'upstream\thttps://github.com/other/gmux.git (push)',
        'origin\tgit@github.com:specstory/gmux.git (fetch)',
        'origin\tgit@github.com:specstory/gmux.git (push)',
        ''
      ].join('\n')
    );
    expect(out).toEqual([
      {
        name: 'origin',
        fetchUrl: 'git@github.com:specstory/gmux.git',
        pushUrl: 'git@github.com:specstory/gmux.git'
      },
      {
        name: 'upstream',
        fetchUrl: 'https://github.com/other/gmux.git',
        pushUrl: 'https://github.com/other/gmux.git'
      }
    ]);
  });

  it('keeps a distinct pushurl', () => {
    const out = parseRemoteVerbose(
      [
        'origin\thttps://github.com/o/r.git (fetch)',
        'origin\tgit@github.com:o/r.git (push)'
      ].join('\n')
    );
    expect(out[0]).toEqual({
      name: 'origin',
      fetchUrl: 'https://github.com/o/r.git',
      pushUrl: 'git@github.com:o/r.git'
    });
  });

  it('survives URLs with spaces and skips junk lines', () => {
    const out = parseRemoteVerbose(
      ['origin\t/tmp/my remotes/bare.git (fetch)', 'garbage', ''].join('\n')
    );
    expect(out).toEqual([
      {
        name: 'origin',
        fetchUrl: '/tmp/my remotes/bare.git',
        pushUrl: '/tmp/my remotes/bare.git'
      }
    ]);
  });

  it('is empty for a repo with no remotes', () => {
    expect(parseRemoteVerbose('')).toEqual([]);
  });
});

describe('remoteOfUpstream', () => {
  it('matches the longest configured remote name, not the first slash', () => {
    expect(remoteOfUpstream('origin/main', ['origin'])).toBe('origin');
    expect(remoteOfUpstream('origin/feat/x', ['origin'])).toBe('origin');
    // A remote whose own name contains a slash must win over the prefix.
    expect(remoteOfUpstream('team/fork/main', ['team', 'team/fork'])).toBe(
      'team/fork'
    );
  });

  it('is null when no configured remote owns the ref', () => {
    expect(remoteOfUpstream('origin/main', ['upstream'])).toBeNull();
    expect(remoteOfUpstream('origin/main', [])).toBeNull();
  });
});
