/**
 * Unit tests for the Phase-14.5 graph parsers (src/main/git/graph-parse.ts).
 *
 * Every fixture string here was captured from REAL `git` output on this
 * machine (git 2.50) rather than written from the documentation — the
 * decoration grammar in particular has three shapes that are easy to get
 * wrong from memory: the `HEAD -> ` prefix, the `tag: ` prefix surviving
 * `--decorate=full`, and the symbolic `<remote>/HEAD` alias.
 */

import { describe, expect, it } from 'vitest';
import {
  GRAPH_LOG_FORMAT,
  annotateDivergence,
  parseDecoration,
  parseGraphLog,
  parseLeftRight,
  parseLocalRefs,
  parseScopeRefs,
  sanitizeRefNames
} from '../graph-parse';

const US = '\x1f';
const NUL = '\0';

/** Build one `-z` record in GRAPH_LOG_FORMAT field order. */
function record(fields: {
  hash: string;
  short?: string;
  parents?: string;
  name?: string;
  email?: string;
  at?: string;
  decoration?: string;
  subject?: string;
}): string {
  return [
    fields.hash,
    fields.short ?? fields.hash.slice(0, 7),
    fields.parents ?? '',
    fields.name ?? 'Ada',
    fields.email ?? 'ada@example.com',
    fields.at ?? '1700000000',
    fields.decoration ?? '',
    fields.subject ?? 'subject'
  ].join(US);
}

describe('GRAPH_LOG_FORMAT', () => {
  it('puts the decoration second-to-last and the subject last', () => {
    // The subject is the only field that can contain arbitrary text, so it
    // must be the tail that absorbs stray separators.
    expect(GRAPH_LOG_FORMAT.endsWith('%D%x1f%s')).toBe(true);
  });
});

describe('parseDecoration', () => {
  it('types the real getspecstory HEAD row', () => {
    const refs = parseDecoration(
      'HEAD -> refs/heads/dev, tag: refs/tags/v2.8.0, ' +
        'refs/remotes/specstoryai/dev, refs/remotes/specstoryai/HEAD'
    );
    expect(refs).toEqual([
      { kind: 'localBranch', name: 'dev', fullName: 'refs/heads/dev', current: true },
      { kind: 'tag', name: 'v2.8.0', fullName: 'refs/tags/v2.8.0' },
      {
        kind: 'remoteBranch',
        name: 'specstoryai/dev',
        fullName: 'refs/remotes/specstoryai/dev',
        remote: 'specstoryai'
      }
    ]);
  });

  it('drops the symbolic <remote>/HEAD alias', () => {
    const refs = parseDecoration('refs/remotes/origin/HEAD, refs/remotes/origin/main');
    expect(refs.map((r) => r.name)).toEqual(['origin/main']);
  });

  it('reads a detached HEAD as its own ref kind', () => {
    expect(parseDecoration('HEAD')).toEqual([
      { kind: 'head', name: 'HEAD', fullName: 'HEAD' }
    ]);
    // Detached AND at a branch tip: both facts survive.
    expect(parseDecoration('HEAD, refs/heads/main').map((r) => r.kind)).toEqual([
      'head',
      'localBranch'
    ]);
  });

  it('hoists the current branch to the front', () => {
    const refs = parseDecoration(
      'tag: refs/tags/v1.0, HEAD -> refs/heads/main, refs/remotes/origin/main'
    );
    expect(refs[0]).toMatchObject({ name: 'main', current: true });
  });

  it('drops refs that are not branches or tags', () => {
    expect(
      parseDecoration('refs/stash, refs/notes/commits, refs/pull/42/head')
    ).toEqual([]);
  });

  it('attributes a slash-containing remote when the remote names are known', () => {
    const [ref] = parseDecoration('refs/remotes/team/fork/main', [
      'origin',
      'team/fork'
    ]);
    expect(ref).toMatchObject({ name: 'team/fork/main', remote: 'team/fork' });
    // Without the hint it degrades to the first segment rather than failing.
    const [guess] = parseDecoration('refs/remotes/team/fork/main');
    expect(guess).toMatchObject({ remote: 'team' });
  });

  it('is empty for an undecorated commit', () => {
    expect(parseDecoration('')).toEqual([]);
    expect(parseDecoration('   ')).toEqual([]);
  });

  it('keeps branch names containing slashes and dots intact', () => {
    const refs = parseDecoration('refs/heads/feat/v1.2.x, tag: refs/tags/rel/2026-01');
    expect(refs.map((r) => r.name)).toEqual(['feat/v1.2.x', 'rel/2026-01']);
  });
});

describe('parseGraphLog', () => {
  it('parses parents, dates and decorations from a -z stream', () => {
    const output =
      record({
        hash: 'a'.repeat(40),
        parents: `${'b'.repeat(40)} ${'c'.repeat(40)}`,
        decoration: 'HEAD -> refs/heads/main',
        subject: 'Merge branch feature'
      }) +
      NUL +
      record({ hash: 'b'.repeat(40), parents: 'd'.repeat(40) }) +
      NUL;

    const entries = parseGraphLog(output);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.parents).toEqual(['b'.repeat(40), 'c'.repeat(40)]);
    expect(entries[0]!.refs[0]).toMatchObject({ name: 'main', current: true });
    expect(entries[0]!.subject).toBe('Merge branch feature');
    expect(entries[0]!.authorDate).toBe(1_700_000_000_000);
    expect(entries[0]!.dateISO).toBe(new Date(1_700_000_000_000).toISOString());
    // A root commit has no parents and that must survive as an empty array,
    // not as [''] — the lane fold branches on `parents.length`.
    expect(parseGraphLog(record({ hash: 'e'.repeat(40) }))[0]!.parents).toEqual([]);
  });

  it('keeps a subject that contains the field separator', () => {
    const entries = parseGraphLog(record({ hash: 'a'.repeat(40), subject: `we${US}ird` }));
    expect(entries[0]!.subject).toBe(`we${US}ird`);
  });

  it('skips malformed records instead of dropping the whole page', () => {
    const output = `garbage${NUL}${record({ hash: 'a'.repeat(40) })}${NUL}`;
    expect(parseGraphLog(output)).toHaveLength(1);
  });

  it('leaves divergence flags off — that is annotateDivergence\'s job', () => {
    const entries = parseGraphLog(record({ hash: 'a'.repeat(40) }));
    expect(entries[0]!.unpushed).toBeUndefined();
    expect(entries[0]!.unpulled).toBeUndefined();
  });
});

describe('annotateDivergence', () => {
  const mine = 'a'.repeat(40);
  const theirs = 'b'.repeat(40);
  const shared = 'c'.repeat(40);
  const page = (): ReturnType<typeof parseGraphLog> =>
    parseGraphLog(
      [record({ hash: mine }), record({ hash: theirs }), record({ hash: shared })].join(
        NUL
      )
    );

  it('stamps each side and leaves shared history alone', () => {
    const entries = annotateDivergence(
      page(),
      new Set([mine]),
      new Set([theirs])
    );
    expect(entries[0]!.unpushed).toBe(true);
    expect(entries[0]!.unpulled).toBeUndefined();
    expect(entries[1]!.unpulled).toBe(true);
    expect(entries[1]!.unpushed).toBeUndefined();
    expect(entries[2]!.unpushed).toBeUndefined();
    expect(entries[2]!.unpulled).toBeUndefined();
  });

  it('is a no-op (same array) when the branch is level with its upstream', () => {
    const before = page();
    expect(annotateDivergence(before, new Set(), new Set())).toBe(before);
  });
});

describe('parseLeftRight', () => {
  it('splits ours from theirs', () => {
    const { unpushed, unpulled } = parseLeftRight(
      ['<' + 'a'.repeat(40), '>' + 'b'.repeat(40), '>' + 'c'.repeat(40), ''].join('\n')
    );
    expect([...unpushed]).toEqual(['a'.repeat(40)]);
    expect([...unpulled]).toEqual(['b'.repeat(40), 'c'.repeat(40)]);
  });

  it('is empty for empty output', () => {
    const sides = parseLeftRight('');
    expect(sides.unpushed.size + sides.unpulled.size).toBe(0);
  });
});

describe('parseLocalRefs', () => {
  it('reads refname, upstream ref and tracking counts', () => {
    const line = [
      'refs/heads/dev',
      'a'.repeat(40),
      'refs/remotes/origin/dev',
      'origin/dev',
      'ahead 2, behind 3'
    ].join(US);
    const [row] = parseLocalRefs(line);
    expect(row).toEqual({
      refname: 'refs/heads/dev',
      sha: 'a'.repeat(40),
      upstreamRef: 'refs/remotes/origin/dev',
      upstream: 'origin/dev',
      ahead: 2,
      behind: 3,
      gone: false
    });
  });

  it('reads a branch with no upstream and one whose upstream is gone', () => {
    const none = parseLocalRefs(
      ['refs/heads/solo', 'a'.repeat(40), '', '', ''].join(US)
    )[0]!;
    expect(none.upstreamRef).toBeNull();
    expect(none.gone).toBe(false);

    const gone = parseLocalRefs(
      [
        'refs/heads/stale',
        'a'.repeat(40),
        'refs/remotes/origin/stale',
        'origin/stale',
        'gone'
      ].join(US)
    )[0]!;
    expect(gone.gone).toBe(true);
    expect(gone.ahead).toBe(0);
  });
});

describe('parseScopeRefs', () => {
  it('keeps commit-ish refs and drops aliases and non-commit tags', () => {
    const lines = [
      ['refs/heads/main', 'commit', '', ''].join(US),
      ['refs/remotes/origin/HEAD', 'commit', '', 'refs/remotes/origin/main'].join(US),
      ['refs/remotes/origin/main', 'commit', '', ''].join(US),
      ['refs/tags/v1', 'tag', 'commit', ''].join(US), // annotated tag
      ['refs/tags/a-blob', 'blob', '', ''].join(US), // legal, and fatal to `git log`
      ['refs/tags/a-tree', 'tag', 'tree', ''].join(US)
    ].join('\n');
    expect(parseScopeRefs(lines)).toEqual([
      'refs/heads/main',
      'refs/remotes/origin/main',
      'refs/tags/v1'
    ]);
  });
});

describe('sanitizeRefNames', () => {
  it('dedupes and sorts so a pinned page walks the same tips in the same order', () => {
    expect(
      sanitizeRefNames([
        'refs/remotes/origin/main',
        'refs/heads/main',
        'refs/heads/main'
      ])
    ).toEqual(['refs/heads/main', 'refs/remotes/origin/main']);
  });

  it('rejects anything that could be read as an option or is not a refname', () => {
    expect(
      sanitizeRefNames([
        '--all',
        '-n5',
        '',
        '   ',
        'main', // short names are ambiguous; the walk is fed full refs
        'refs/heads/with space',
        'refs/heads/with\nnewline',
        'refs/heads/glob*',
        'refs/heads/ok'
      ])
    ).toEqual(['refs/heads/ok']);
  });

  it('allows the literal HEAD (the detached-HEAD scope)', () => {
    expect(sanitizeRefNames(['HEAD'])).toEqual(['HEAD']);
  });
});
