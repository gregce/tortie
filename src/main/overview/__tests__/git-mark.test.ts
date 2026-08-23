/**
 * The git corroboration mark (Phase 137, spec section 7.3).
 *
 * git is faked at the exec seam, so these tests prove the parsing and the
 * decision rules without a repository: the three marks, the working tree
 * union, the rename entry, the ask clock floor, and the answer text scan
 * feeding candidates beside the stored path index.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PathMention } from '../reader';

const seams = vi.hoisted(() => ({
  runGit: vi.fn(),
  extractPathsFromText: vi.fn((): PathMentionLike[] => [])
}));

interface PathMentionLike {
  path: string;
  mentions: number;
  source: 'command' | 'tool' | 'text';
  inside: boolean;
}

vi.mock('../../git/exec', () => ({ runGit: seams.runGit }));
vi.mock('../reader', () => ({
  extractPathsFromText: seams.extractPathsFromText
}));

const { markTurn, readGitEvidence } = await import('../git-mark');

const PROJECT = '/repo/demo';

function gitResult(code: number, stdout = ''): {
  code: number;
  stdout: Buffer;
  stderr: string;
} {
  return { code, stdout: Buffer.from(stdout, 'utf8'), stderr: '' };
}

/** rev-parse answers ok, then log and status answer with the given bytes. */
function repoAnswers(log: string, status: string): void {
  seams.runGit.mockImplementation((_repo: string, args: string[]) => {
    if (args[0] === 'rev-parse') return Promise.resolve(gitResult(0, 'true\n'));
    if (args[0] === 'log') return Promise.resolve(gitResult(0, log));
    if (args[0] === 'status') return Promise.resolve(gitResult(0, status));
    return Promise.resolve(gitResult(1));
  });
}

function mention(path: string, inside: boolean): PathMention {
  return { path, mentions: 1, source: 'tool', inside };
}

beforeEach(() => {
  seams.runGit.mockReset();
  seams.extractPathsFromText.mockReset();
  seams.extractPathsFromText.mockReturnValue([]);
});

describe('readGitEvidence', () => {
  it('answers no repo from one probe and asks nothing else', async () => {
    seams.runGit.mockResolvedValue(gitResult(128));
    const evidence = await readGitEvidence(PROJECT, 1_755_000_000_000);
    expect(evidence.isGitRepo).toBe(false);
    expect(evidence.committedAtMs.size).toBe(0);
    expect(evidence.workingTree.size).toBe(0);
    expect(seams.runGit).toHaveBeenCalledTimes(1);
  });

  it('keeps the latest commit time per path from the log', async () => {
    repoAnswers(
      '1755900000\n\nscripts/release.sh\nsrc/a.ts\n\n1755800000\n\nsrc/a.ts\n',
      ''
    );
    const evidence = await readGitEvidence(PROJECT, 1_755_000_000_000);
    expect(evidence.isGitRepo).toBe(true);
    expect(evidence.committedAtMs.get('scripts/release.sh')).toBe(
      1_755_900_000_000
    );
    expect(evidence.committedAtMs.get('src/a.ts')).toBe(1_755_900_000_000);
  });

  it('reads the working tree with untracked files and both rename halves', async () => {
    repoAnswers('', ' M src/c.ts\0?? notes.md\0R  renamed.ts\0was.ts\0');
    const evidence = await readGitEvidence(PROJECT, 1_755_000_000_000);
    expect(evidence.workingTree.has('src/c.ts')).toBe(true);
    expect(evidence.workingTree.has('notes.md')).toBe(true);
    expect(evidence.workingTree.has('renamed.ts')).toBe(true);
    expect(evidence.workingTree.has('was.ts')).toBe(true);
  });

  it('hands git the since floor as an ISO clock', async () => {
    repoAnswers('', '');
    await readGitEvidence(PROJECT, 1_755_000_000_000);
    const logArgs = seams.runGit.mock.calls
      .map((call) => call[1] as string[])
      .find((args) => args[0] === 'log');
    expect(logArgs).toContain('--since=2025-08-12T12:00:00.000Z');
  });
});

describe('markTurn', () => {
  const evidence = {
    isGitRepo: true,
    committedAtMs: new Map<string, number>([['src/a.ts', 1_755_900_000_000]]),
    workingTree: new Set<string>(['dirty.ts'])
  };
  const base = {
    answerText: null,
    askAtMs: 1_755_850_000_000,
    sessionCreatedAtMs: 1_755_000_000_000,
    cwd: PROJECT,
    projectPath: PROJECT
  };

  it('says nothing to check when the turn named no path', () => {
    expect(markTurn(evidence, { ...base, paths: [] })).toEqual({
      git: 'nothing-to-check',
      namedOnlyOutside: false
    });
  });

  it('says nothing to check outside a repository, whatever was named', () => {
    const noRepo = {
      isGitRepo: false,
      committedAtMs: new Map<string, number>(),
      workingTree: new Set<string>()
    };
    expect(
      markTurn(noRepo, { ...base, paths: [mention('src/a.ts', true)] }).git
    ).toBe('nothing-to-check');
  });

  it('marks a turn that named only outside paths', () => {
    const marked = markTurn(evidence, {
      ...base,
      paths: [mention('/etc/hosts', false)]
    });
    expect(marked).toEqual({ git: 'nothing-to-check', namedOnlyOutside: true });
  });

  it('agrees on a commit at or after the ask', () => {
    expect(
      markTurn(evidence, { ...base, paths: [mention('src/a.ts', true)] }).git
    ).toBe('agrees');
  });

  it('agrees on a commit inside the ask’s own second', () => {
    const late = { ...base, askAtMs: 1_755_900_000_400 };
    expect(
      markTurn(evidence, { ...late, paths: [mention('src/a.ts', true)] }).git
    ).toBe('agrees');
  });

  it('has no record of a path committed before the ask', () => {
    const later = { ...base, askAtMs: 1_755_900_001_000 };
    expect(
      markTurn(evidence, { ...later, paths: [mention('src/a.ts', true)] }).git
    ).toBe('no-record');
  });

  it('agrees on a working tree change that is not committed', () => {
    expect(
      markTurn(evidence, { ...base, paths: [mention('dirty.ts', true)] }).git
    ).toBe('agrees');
  });

  it('compares against the session start when the turn has no clock', () => {
    const noClock = { ...base, askAtMs: null };
    expect(
      markTurn(evidence, { ...noClock, paths: [mention('src/a.ts', true)] }).git
    ).toBe('agrees');
  });

  it('scans the closing answer for candidates beside the path index', () => {
    seams.extractPathsFromText.mockReturnValue([
      { path: 'src/a.ts', mentions: 1, source: 'text', inside: true }
    ]);
    const marked = markTurn(evidence, {
      ...base,
      paths: [],
      answerText: 'I changed src/a.ts.'
    });
    expect(seams.extractPathsFromText).toHaveBeenCalledWith(
      'I changed src/a.ts.',
      PROJECT,
      PROJECT
    );
    expect(marked.git).toBe('agrees');
  });
});
