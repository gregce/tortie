/**
 * The branch checked out on another machine (Phase 106).
 *
 * Two halves, tested two ways.
 *
 * The PURE half is `parseRepoBranchAnswer` and `trackWasUnreadable`, and both
 * are tested for real. A wrong answer there is a branch name drawn on screen
 * that nobody checked out, a count measured against nothing, or plausible
 * nonsense where a branch name should be.
 *
 * The READ crosses to another computer, so the door and the store are replaced
 * here. What these tests hold is the SHAPE: which script is asked for, which
 * refusals send nothing at all, and that no state of a machine ever throws. The
 * live read is driven by `node build/probe-p106-branch.mjs` against a loopback
 * scratch machine, where the branch, the upstream and the two counts are
 * compared against what git itself prints in that folder.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, how
 * long it takes, or that a git older than 2.13 really refuses the format. The
 * probe measures the first two. The third is reasoned from git's own release
 * history and is exercised here only through the `nodetails` word the far side
 * prints for it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRANCH_FORMAT } from '../../git';
import { remoteScript } from '../remote-scripts';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every remote read this file caused. It stays empty for every refusal. */
let reads: Array<{ script: string; args: string[] }> = [];
/** What the far side answers, or a throw standing in for a link that dropped. */
let readAnswer: () => string = () => 'nobranch none';
let connected = new Set<string>();
let contextReady = new Set<string>();

vi.mock('../remote-run', () => ({
  machineIsConnected: (machineId: string) => connected.has(machineId),
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    reads.push({ script, args: [...args] });
    return Promise.resolve({ payload: readAnswer(), generation: 1, bytes: 0 });
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => {
    if (!contextReady.has(machineId)) throw new Error('no connection');
    return { kind: 'remote', machineId };
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => (id === 'far' ? { id, label: 'Studio' } : null),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id
}));

const {
  REMOTE_BRANCH_TIMEOUT_MS,
  parseRepoBranchAnswer,
  readBranchOnMachine,
  trackWasUnreadable
} = await import('../remote-branch');

const US = '\x1f';

/** One `for-each-ref` line, in the seven fields the shared parser reads. */
function line(over: Partial<Record<string, string>> = {}): string {
  const f = {
    name: 'main',
    head: '*',
    sha: 'a'.repeat(40),
    shortSha: 'a'.repeat(7),
    upstream: 'origin/main',
    track: '',
    ...over
  };
  return [f.name, f.head, f.sha, f.shortSha, f.upstream, f.track, ''].join(US);
}

/** One `repo` answer, composed the way the far side composes it. */
function repoAnswer(text: string): string {
  return `repo ${Buffer.from(`${text}\n`, 'utf8').toString('base64')}`;
}

beforeEach(() => {
  reads = [];
  readAnswer = () => repoAnswer(line({ track: 'ahead 2, behind 1' }));
  connected = new Set(['far']);
  contextReady = new Set(['far']);
});

// ---------------------------------------------------------------------------
// 1. The format the far side prints is BRANCH_FORMAT minus one field
// ---------------------------------------------------------------------------

describe('the format the far side is asked for', () => {
  it('is BRANCH_FORMAT minus %(subject), so no second parser exists', () => {
    // THE WHOLE REUSE RESTS ON THIS. `parseForEachRefBranches` reads what the
    // machine prints only while this relation holds, and two copies of one
    // format is how one of them goes stale. Condition 56d of
    // build/conformance-machines.mjs asserts the same thing from outside the
    // test runner.
    const text = remoteScript('repo-branch')?.text ?? '';
    const format = /--format='([^']*)'/.exec(text)?.[1] ?? '';
    expect(format.length).toBeGreaterThan(0);
    expect(`${format}%(subject)`).toBe(BRANCH_FORMAT);
  });

  it('asks for a deadline it names rather than one it inherits', () => {
    expect(REMOTE_BRANCH_TIMEOUT_MS).toBe(15_000);
  });
});

// ---------------------------------------------------------------------------
// 2. The pure half
// ---------------------------------------------------------------------------

describe('reading what the machine answered', () => {
  it('reads a branch with an upstream and two counts', () => {
    const answer = parseRepoBranchAnswer(
      repoAnswer(line({ track: 'ahead 2, behind 1' }))
    );
    expect(answer?.mode).toBe('repo');
    expect(answer?.row?.name).toBe('main');
    expect(answer?.row?.upstream).toBe('origin/main');
    expect(answer?.row?.ahead).toBe(2);
    expect(answer?.row?.behind).toBe(1);
    expect(answer?.track).toBe('ahead 2, behind 1');
  });

  it('reads a branch that follows nothing', () => {
    const answer = parseRepoBranchAnswer(
      repoAnswer(line({ upstream: '', track: '' }))
    );
    expect(answer?.row?.upstream).toBeUndefined();
    expect(answer?.row?.ahead).toBe(0);
    expect(answer?.row?.behind).toBe(0);
  });

  it('reads a branch whose upstream that machine no longer has', () => {
    const answer = parseRepoBranchAnswer(repoAnswer(line({ track: 'gone' })));
    expect(answer?.row?.upstreamGone).toBe(true);
    expect(answer?.track).toBe('gone');
  });

  it('reads a branch name holding a slash and one holding a space', () => {
    // A ref name cannot hold a space, but the field separator is US rather than
    // a space, so a name holding one would still survive the crossing. Both are
    // read here because the base64 exists for exactly this.
    expect(
      parseRepoBranchAnswer(repoAnswer(line({ name: 'release/1.4' })))?.row?.name
    ).toBe('release/1.4');
    expect(
      parseRepoBranchAnswer(repoAnswer(line({ name: 'a b' })))?.row?.name
    ).toBe('a b');
  });

  it('reads the five words that carry one none field', () => {
    for (const word of [
      'nobranch',
      'nodetails',
      'notrepo',
      'missing',
      'denied'
    ] as const) {
      expect(parseRepoBranchAnswer(`${word} none`)).toEqual({
        mode: word,
        row: null,
        track: null
      });
    }
  });

  it('reads an answer with newlines and extra spacing between the words', () => {
    const payload = `\n repo \t ${Buffer.from(`${line()}\n`, 'utf8').toString('base64')} \n`;
    expect(parseRepoBranchAnswer(payload)?.row?.name).toBe('main');
  });

  it('refuses a word the script never prints', () => {
    expect(parseRepoBranchAnswer('ok none')).toBeNull();
    expect(parseRepoBranchAnswer('none none')).toBeNull();
    expect(parseRepoBranchAnswer('')).toBeNull();
  });

  it('refuses an answer with a field missing or a field too many', () => {
    expect(parseRepoBranchAnswer('repo')).toBeNull();
    expect(parseRepoBranchAnswer('missing')).toBeNull();
    expect(parseRepoBranchAnswer('missing none none')).toBeNull();
  });

  it('refuses a word holding a character base64 does not use', () => {
    // `Buffer.from` DROPS such a character and hands back plausible nonsense,
    // and a person reading a branch name cannot tell nonsense from a branch.
    expect(parseRepoBranchAnswer('repo %%%%')).toBeNull();
    expect(parseRepoBranchAnswer('repo not-base64!')).toBeNull();
  });

  it('refuses a repo answer carrying the none word instead of a payload', () => {
    expect(parseRepoBranchAnswer('repo none')).toBeNull();
  });

  it('refuses a decoded line with fewer than the seven fields', () => {
    const short = ['main', '*', 'a'.repeat(40)].join(US);
    expect(parseRepoBranchAnswer(repoAnswer(short))).toBeNull();
  });

  it('refuses a refusal word carrying a payload', () => {
    expect(
      parseRepoBranchAnswer(`missing ${Buffer.from('x').toString('base64')}`)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. The honesty flag
// ---------------------------------------------------------------------------

describe('a tracking answer this end could not read', () => {
  it('is not set when the answer was empty, which means level', () => {
    // 0 and 0 with an EMPTY answer is level, and the panel says level with two
    // numbers rather than a word. This is the case the flag must not claim.
    expect(trackWasUnreadable('')).toBe(false);
    expect(trackWasUnreadable(null)).toBe(false);
  });

  it('is not set for gone, which has its own field', () => {
    expect(trackWasUnreadable('gone')).toBe(false);
  });

  it('is not set when the answer parsed to something', () => {
    expect(trackWasUnreadable('ahead 2, behind 1')).toBe(false);
    expect(trackWasUnreadable('ahead 3')).toBe(false);
    expect(trackWasUnreadable('behind 4')).toBe(false);
  });

  it('IS set for an older git’s bracketed answer, which parses to half an answer', () => {
    // THE RULE IS ABOUT THE SHAPE OF THE WHOLE STRING AND NOT ABOUT THE TWO
    // NUMBERS, and the reason is a measurement. `parseUpstreamTrack` reads
    // `[ahead 2, behind 1]` as ahead 0 and BEHIND 1, because its behind
    // expression matches on `, behind 1` while its ahead one needs the start
    // of the string or a `, ` in front, and the leading bracket blocks only
    // the second. A rule that asked whether both counts were zero would have
    // called that answer readable and the panel would have drawn two wrong
    // numbers for a branch that is 2 ahead and 1 behind.
    expect(trackWasUnreadable('[ahead 2, behind 1]')).toBe(true);
    expect(trackWasUnreadable('vorne 2')).toBe(true);
    expect(trackWasUnreadable('[ahead 2]')).toBe(true);
    expect(trackWasUnreadable('ahead 2, behind 1, sideways 3')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. The refusals that ask nobody anything
// ---------------------------------------------------------------------------

describe('the refusals that send nothing', () => {
  it('answers missing for a folder that is not an absolute path', async () => {
    const out = await readBranchOnMachine({
      machineId: 'far',
      cwd: 'relative/folder'
    });
    expect(out.mode).toBe('missing');
    expect(reads).toEqual([]);
  });

  it('answers notConnected for a machine that is not answering', async () => {
    connected = new Set();
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('notConnected');
    expect(reads).toEqual([]);
  });

  it('answers notConnected when the connection is not ready', async () => {
    contextReady = new Set();
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('notConnected');
    expect(reads).toEqual([]);
  });

  it('answers unreachable when the read throws', async () => {
    readAnswer = () => {
      throw new Error('the link dropped');
    };
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('unreachable');
  });

  it('answers unreachable when the answer is a shape it does not know', async () => {
    readAnswer = () => 'ok none';
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('unreachable');
  });
});

// ---------------------------------------------------------------------------
// 5. The ladder, and the one script it names
// ---------------------------------------------------------------------------

describe('the read itself', () => {
  it('asks for repo-branch and for nothing else, with the folder', async () => {
    await readBranchOnMachine({ machineId: 'far', cwd: '/w/one' });
    expect(reads).toEqual([{ script: 'repo-branch', args: ['/w/one'] }]);
  });

  it('carries the five far side words straight to their own modes', async () => {
    for (const [word, mode] of [
      ['missing', 'missing'],
      ['denied', 'denied'],
      ['notrepo', 'notRepo'],
      ['nobranch', 'noBranch'],
      ['nodetails', 'noDetails']
    ] as const) {
      reads = [];
      readAnswer = () => `${word} none`;
      const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
      expect(out.mode).toBe(mode);
      expect(out.branch).toBeNull();
      expect(out.ahead).toBe(0);
      expect(out.behind).toBe(0);
      expect(reads).toHaveLength(1);
    }
  });

  it('answers the branch, the commit, the upstream and the two counts', async () => {
    readAnswer = () =>
      repoAnswer(
        line({
          name: 'release/1.4',
          sha: 'b'.repeat(40),
          shortSha: 'b'.repeat(7),
          upstream: 'origin/release/1.4',
          track: 'ahead 2, behind 1'
        })
      );
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out).toMatchObject({
      machineId: 'far',
      machineLabel: 'Studio',
      cwd: '/w',
      mode: 'ok',
      branch: 'release/1.4',
      sha: 'b'.repeat(40),
      shortSha: 'b'.repeat(7),
      upstream: 'origin/release/1.4',
      upstreamGone: false,
      ahead: 2,
      behind: 1,
      trackUnreadable: false
    });
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(out.readAt).toBeGreaterThan(0);
  });

  it('answers no upstream and two zeroes for a branch that follows nothing', async () => {
    readAnswer = () => repoAnswer(line({ upstream: '', track: '' }));
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('ok');
    expect(out.upstream).toBeNull();
    expect(out.upstreamGone).toBe(false);
    expect(out.ahead).toBe(0);
    expect(out.behind).toBe(0);
    expect(out.trackUnreadable).toBe(false);
  });

  it('answers upstreamGone for a followed branch that machine no longer has', async () => {
    readAnswer = () => repoAnswer(line({ track: 'gone' }));
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('ok');
    expect(out.upstream).toBe('origin/main');
    expect(out.upstreamGone).toBe(true);
    expect(out.trackUnreadable).toBe(false);
  });

  it('sets trackUnreadable for a tracking answer in a shape it does not know', async () => {
    readAnswer = () => repoAnswer(line({ track: '[ahead 2, behind 1]' }));
    const out = await readBranchOnMachine({ machineId: 'far', cwd: '/w' });
    expect(out.mode).toBe('ok');
    expect(out.ahead).toBe(0);
    expect(out.behind).toBe(0);
    expect(out.trackUnreadable).toBe(true);
  });

  it('answers with the machine id when there is no row to take a label from', async () => {
    connected = new Set(['other']);
    contextReady = new Set(['other']);
    const out = await readBranchOnMachine({ machineId: 'other', cwd: '/w' });
    expect(out.machineLabel).toBe('other');
  });

  it('never throws, for any far side word and for a link that dropped', async () => {
    for (const answer of [
      () => 'repo',
      () => 'repo %%%',
      () => '',
      () => 'nobranch none',
      (): string => {
        throw new Error('gone');
      }
    ]) {
      readAnswer = answer;
      await expect(
        readBranchOnMachine({ machineId: 'far', cwd: '/w' })
      ).resolves.toBeTruthy();
    }
  });
});
