/**
 * Unit tests for the git-depth parsers (dogfood round 1): for-each-ref
 * branch listing, commit meta, -z name-status / numstat, and GitHub remote
 * normalization. Token shapes verified against git 2.50 output.
 */

import { describe, expect, it } from 'vitest';
import {
  BRANCH_FORMAT,
  COMMIT_META_FORMAT,
  mergeCommitFiles,
  normalizeGitHubRemote,
  parseCommitMeta,
  parseForEachRefBranches,
  parseNameStatusZ,
  parseNumstatZ
} from '../parse';

const NUL = '\0';
const US = '\x1f';

// ---------------------------------------------------------------------------
// parseForEachRefBranches
// ---------------------------------------------------------------------------

function branchLine(fields: string[]): string {
  return fields.join(US);
}

describe('parseForEachRefBranches', () => {
  it('field count matches BRANCH_FORMAT', () => {
    expect(BRANCH_FORMAT.split('%1f')).toHaveLength(7);
  });

  it('parses current marker, upstream, and ahead/behind', () => {
    const out = [
      branchLine([
        'feature/x',
        ' ',
        'b'.repeat(40),
        'bbbbbbb',
        '',
        '',
        'wip: half done'
      ]),
      branchLine([
        'main',
        '*',
        'a'.repeat(40),
        'aaaaaaa',
        'origin/main',
        'ahead 2, behind 1',
        'latest work'
      ])
    ].join('\n');
    const branches = parseForEachRefBranches(out + '\n');
    expect(branches).toHaveLength(2);

    const feature = branches[0]!;
    expect(feature.name).toBe('feature/x');
    expect(feature.current).toBe(false);
    expect(feature.upstream).toBeUndefined();
    expect(feature.ahead).toBe(0);
    expect(feature.behind).toBe(0);

    const main = branches[1]!;
    expect(main.name).toBe('main');
    expect(main.current).toBe(true);
    expect(main.sha).toBe('a'.repeat(40));
    expect(main.shortSha).toBe('aaaaaaa');
    expect(main.upstream).toBe('origin/main');
    expect(main.ahead).toBe(2);
    expect(main.behind).toBe(1);
    expect(main.subject).toBe('latest work');
  });

  it('parses ahead-only and behind-only tracking', () => {
    const ahead = parseForEachRefBranches(
      branchLine(['b1', ' ', 'c'.repeat(40), 'ccccccc', 'origin/b1', 'ahead 3', 's'])
    )[0]!;
    expect(ahead.ahead).toBe(3);
    expect(ahead.behind).toBe(0);

    const behind = parseForEachRefBranches(
      branchLine(['b2', ' ', 'd'.repeat(40), 'ddddddd', 'origin/b2', 'behind 7', 's'])
    )[0]!;
    expect(behind.ahead).toBe(0);
    expect(behind.behind).toBe(7);
  });

  it('flags a gone upstream without inventing counts', () => {
    const b = parseForEachRefBranches(
      branchLine(['old', ' ', 'e'.repeat(40), 'eeeeeee', 'origin/old', 'gone', 's'])
    )[0]!;
    expect(b.upstream).toBe('origin/old');
    expect(b.upstreamGone).toBe(true);
    expect(b.ahead).toBe(0);
    expect(b.behind).toBe(0);
  });

  it('tolerates empty output (unborn HEAD / no branches)', () => {
    expect(parseForEachRefBranches('')).toEqual([]);
    expect(parseForEachRefBranches('\n')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseCommitMeta
// ---------------------------------------------------------------------------

describe('parseCommitMeta', () => {
  it('field count matches COMMIT_META_FORMAT', () => {
    expect(COMMIT_META_FORMAT.split('%x1f')).toHaveLength(7);
  });

  it('parses a full record with a multi-paragraph body', () => {
    const body =
      'Paragraph one.\n\n- bullet a\n- bullet b\n\nUses `inline code` here.\n';
    const record =
      [
        'f'.repeat(40),
        'fffffff',
        'Grace Hopper',
        'grace@navy.mil',
        '2026-08-09T21:36:11-04:00',
        'subject line',
        body
      ].join(US) + NUL;
    const meta = parseCommitMeta(record);
    expect(meta).not.toBeNull();
    expect(meta!.sha).toBe('f'.repeat(40));
    expect(meta!.shortSha).toBe('fffffff');
    expect(meta!.author).toBe('Grace Hopper');
    expect(meta!.email).toBe('grace@navy.mil');
    expect(meta!.dateISO).toBe('2026-08-09T21:36:11-04:00');
    expect(meta!.subject).toBe('subject line');
    // Trailing newline trimmed, interior blank lines preserved.
    expect(meta!.body).toBe(
      'Paragraph one.\n\n- bullet a\n- bullet b\n\nUses `inline code` here.'
    );
  });

  it('yields an empty body for subject-only commits', () => {
    const record =
      ['a'.repeat(40), 'aaaaaaa', 'T', 't@t.co', '2026-01-01T00:00:00Z', 'just a subject', ''].join(
        US
      ) + NUL;
    expect(parseCommitMeta(record)!.body).toBe('');
  });

  it('returns null for empty output', () => {
    expect(parseCommitMeta('')).toBeNull();
    expect(parseCommitMeta(NUL)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseNameStatusZ
// ---------------------------------------------------------------------------

describe('parseNameStatusZ', () => {
  it('parses plain statuses (status and path are separate NUL tokens)', () => {
    const out = ['M', 'a.txt', 'A', 'new file.dat', 'D', 'gone.ts'].join(NUL) + NUL;
    expect(parseNameStatusZ(out)).toEqual([
      { path: 'a.txt', status: 'M' },
      { path: 'new file.dat', status: 'A' },
      { path: 'gone.ts', status: 'D' }
    ]);
  });

  it('parses rename entries (score token + old + new paths)', () => {
    const out =
      ['R100', 'dir with space/b file.txt', 'dir with space/renamed file.txt', 'M', 'after.ts'].join(
        NUL
      ) + NUL;
    const entries = parseNameStatusZ(out);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      path: 'dir with space/renamed file.txt',
      origPath: 'dir with space/b file.txt',
      status: 'R'
    });
    // The entry after the rename is not swallowed by the extra path token.
    expect(entries[1]).toEqual({ path: 'after.ts', status: 'M' });
  });

  it('folds unknown status letters into X and keeps T', () => {
    const out = ['T', 'link.ts', 'Z', 'weird.ts'].join(NUL) + NUL;
    expect(parseNameStatusZ(out)).toEqual([
      { path: 'link.ts', status: 'T' },
      { path: 'weird.ts', status: 'X' }
    ]);
  });

  it('tolerates empty output', () => {
    expect(parseNameStatusZ('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseNumstatZ
// ---------------------------------------------------------------------------

describe('parseNumstatZ', () => {
  it('parses counts, sums totals, and zeroes binary files', () => {
    const out = ['5\t2\ta.txt', '-\t-\tbin.dat', '0\t7\tsub/dir/x y.ts'].join(NUL) + NUL;
    const r = parseNumstatZ(out);
    expect(r.files).toEqual([
      { path: 'a.txt', insertions: 5, deletions: 2, binary: false },
      { path: 'bin.dat', insertions: 0, deletions: 0, binary: true },
      { path: 'sub/dir/x y.ts', insertions: 0, deletions: 7, binary: false }
    ]);
    expect(r.insertions).toBe(5);
    expect(r.deletions).toBe(9);
  });

  it('parses rename entries (trailing-TAB counts token + old + new)', () => {
    const out = ['3\t1\t', 'old name.ts', 'new name.ts', '1\t0\tafter.ts'].join(NUL) + NUL;
    const r = parseNumstatZ(out);
    expect(r.files).toEqual([
      {
        path: 'new name.ts',
        origPath: 'old name.ts',
        insertions: 3,
        deletions: 1,
        binary: false
      },
      { path: 'after.ts', insertions: 1, deletions: 0, binary: false }
    ]);
    expect(r.insertions).toBe(4);
    expect(r.deletions).toBe(1);
  });

  it('tolerates empty output', () => {
    expect(parseNumstatZ('')).toEqual({ files: [], insertions: 0, deletions: 0 });
  });
});

// ---------------------------------------------------------------------------
// mergeCommitFiles
// ---------------------------------------------------------------------------

describe('mergeCommitFiles', () => {
  it('joins statuses with counts by new path', () => {
    const files = mergeCommitFiles(
      [
        { path: 'a.txt', status: 'M' },
        { path: 'new.ts', origPath: 'old.ts', status: 'R' },
        { path: 'bin.dat', status: 'A' }
      ],
      parseNumstatZ(
        ['5\t2\ta.txt', '3\t1\t', 'old.ts', 'new.ts', '-\t-\tbin.dat'].join(NUL) + NUL
      )
    );
    expect(files).toEqual([
      { path: 'a.txt', status: 'M', insertions: 5, deletions: 2 },
      { path: 'new.ts', origPath: 'old.ts', status: 'R', insertions: 3, deletions: 1 },
      { path: 'bin.dat', status: 'A', insertions: 0, deletions: 0, binary: true }
    ]);
  });

  it('defaults counts to 0 when numstat lacks the path', () => {
    const files = mergeCommitFiles([{ path: 'x.ts', status: 'M' }], {
      files: [],
      insertions: 0,
      deletions: 0
    });
    expect(files).toEqual([{ path: 'x.ts', status: 'M', insertions: 0, deletions: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// normalizeGitHubRemote
// ---------------------------------------------------------------------------

describe('normalizeGitHubRemote', () => {
  it('normalizes every github.com form to the https page URL', () => {
    const want = 'https://github.com/owner/repo';
    expect(normalizeGitHubRemote('git@github.com:owner/repo.git')).toBe(want);
    expect(normalizeGitHubRemote('git@github.com:owner/repo')).toBe(want);
    expect(normalizeGitHubRemote('ssh://git@github.com/owner/repo.git')).toBe(want);
    expect(normalizeGitHubRemote('ssh://git@github.com:22/owner/repo.git')).toBe(want);
    expect(normalizeGitHubRemote('https://github.com/owner/repo.git')).toBe(want);
    expect(normalizeGitHubRemote('https://github.com/owner/repo')).toBe(want);
    expect(normalizeGitHubRemote('https://user@github.com/owner/repo.git/')).toBe(want);
    expect(normalizeGitHubRemote('git://github.com/owner/repo.git')).toBe(want);
    expect(normalizeGitHubRemote('  https://github.com/owner/repo.git\n')).toBe(want);
  });

  it('returns null for non-GitHub remotes and junk', () => {
    expect(normalizeGitHubRemote('git@gitlab.com:owner/repo.git')).toBeNull();
    expect(normalizeGitHubRemote('https://gitlab.com/owner/repo.git')).toBeNull();
    expect(normalizeGitHubRemote('https://github.enterprise.co/o/r.git')).toBeNull();
    expect(normalizeGitHubRemote('/local/bare/repo.git')).toBeNull();
    expect(normalizeGitHubRemote('../relative/repo')).toBeNull();
    expect(normalizeGitHubRemote('')).toBeNull();
    expect(normalizeGitHubRemote('https://github.com/only-owner')).toBeNull();
  });
});
