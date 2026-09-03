/**
 * The one exposed sibling call site for the timestamp guard (Phase 206
 * item 4).
 *
 * Phase 188.1 put the range check in `stampText` alone and NAMED this call
 * site as the one other exposed caller, where all four hostile values threw.
 * The reasoning for keeping the check out of `rowToRecord` still holds and is
 * not reversed here: a check there would make `createdAt` and `lastSeen` stop
 * being numbers across the shared session projection, restore, reconstruct,
 * remote harvest and every renderer that sorts on them.
 *
 * WHY ONE ROW TOOK A WHOLE PAGE DOWN. `sinceMs` is `Math.min` over every
 * session's `createdAt`, and `Math.min` propagates NaN, so one corrupt row
 * made the floor impossible for the whole project rather than for its own
 * session. `git log` was then handed `new Date(NaN).toISOString()` and the
 * read threw `RangeError: Invalid time value` before either git call returned.
 *
 * WHAT THE GUARD ANSWERS. The same thing a git read that FAILED already
 * answers, being the status half alone with no commit evidence, because a mark
 * built on partial evidence can only move from `agrees` to `no-record` and
 * `no-record` is honest. The log is not asked at all, so an impossible number
 * never reaches an argv either.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PathMention } from '../reader';

const seams = vi.hoisted(() => ({
  runGit: vi.fn(),
  extractPathsFromText: vi.fn((): PathMention[] => [])
}));

vi.mock('../../git/exec', () => ({ runGit: seams.runGit }));
vi.mock('../reader', () => ({
  extractPathsFromText: seams.extractPathsFromText
}));

const { readGitEvidence } = await import('../git-mark');

const PROJECT = '/repo/demo';

function gitResult(code: number, stdout = ''): {
  code: number;
  stdout: Buffer;
  stderr: string;
} {
  return { code, stdout: Buffer.from(stdout, 'utf8'), stderr: '' };
}

const LOG = '1755000000\nsrc/a.ts\n';
const STATUS = ' M src/b.ts\0';

beforeEach(() => {
  seams.runGit.mockReset();
  seams.extractPathsFromText.mockReset();
  seams.extractPathsFromText.mockReturnValue([]);
  seams.runGit.mockImplementation((_repo: string, args: string[]) => {
    if (args[0] === 'rev-parse') return Promise.resolve(gitResult(0, 'true\n'));
    if (args[0] === 'log') return Promise.resolve(gitResult(0, LOG));
    if (args[0] === 'status') return Promise.resolve(gitResult(0, STATUS));
    return Promise.resolve(gitResult(1));
  });
});

/** Every value the manifest's declared `number` cannot actually promise. */
const IMPOSSIBLE: [string, number][] = [
  ['NaN, which is what Math.min answers over one corrupt row', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['minus Infinity', Number.NEGATIVE_INFINITY],
  ['one millisecond past the largest instant', 8.64e15 + 1],
  ['one millisecond before the smallest', -8.64e15 - 1],
  ['Number.MAX_VALUE', Number.MAX_VALUE]
];

/** The two ends of the range, which are legal instants and must render. */
const BOUNDARY: [string, number][] = [
  ['the largest instant', 8.64e15],
  ['the smallest instant', -8.64e15]
];

describe('readGitEvidence, an impossible floor', () => {
  for (const [what, value] of IMPOSSIBLE) {
    it(`does not throw on ${what}`, async () => {
      const evidence = await readGitEvidence(PROJECT, value);
      // The folder is still a repository and the working tree is still read,
      // which is exactly what a failed log read leaves.
      expect(evidence.isGitRepo).toBe(true);
      expect(evidence.workingTree.has('src/b.ts')).toBe(true);
      // No commit evidence, so every mark falls to no-record rather than
      // agreeing on a window nobody asked for.
      expect(evidence.committedAtMs.size).toBe(0);
    });

    it(`asks git for no log at all on ${what}`, async () => {
      await readGitEvidence(PROJECT, value);
      const asked = seams.runGit.mock.calls.map((call) => (call[1] as string[])[0]);
      expect(asked).toEqual(['rev-parse', 'status']);
      // AND NOTHING IMPOSSIBLE REACHED AN ARGV.
      const argv = seams.runGit.mock.calls
        .map((call) => (call[1] as string[]).join(' '))
        .join(' | ');
      expect(argv).not.toContain('--since');
      expect(argv).not.toContain('Invalid');
      expect(argv).not.toContain('NaN');
    });
  }

  for (const [what, value] of BOUNDARY) {
    it(`still asks for the log on ${what}, because it is a legal instant`, async () => {
      const evidence = await readGitEvidence(PROJECT, value);
      expect(evidence.committedAtMs.get('src/a.ts')).toBe(1_755_000_000_000);
      const since = seams.runGit.mock.calls
        .map((call) => call[1] as string[])
        .find((args) => args[0] === 'log')?.[1];
      expect(since).toBe(`--since=${new Date(value).toISOString()}`);
    });
  }

  it('an ordinary floor is unchanged', async () => {
    const evidence = await readGitEvidence(PROJECT, 1_755_000_000_000);
    expect(evidence.isGitRepo).toBe(true);
    expect(evidence.committedAtMs.get('src/a.ts')).toBe(1_755_000_000_000);
    expect(evidence.workingTree.has('src/b.ts')).toBe(true);
    expect(seams.runGit).toHaveBeenCalledTimes(3);
  });
});
