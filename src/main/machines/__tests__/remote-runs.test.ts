/**
 * The runs for the branch checked out on another machine (Phase 105).
 *
 * Two halves, tested two ways.
 *
 * The PURE half is `parseRepoFactsAnswer`, and it is tested for real. A wrong
 * answer there is a question asked about the wrong branch, a commit drawn on
 * screen that nobody checked out, or plausible nonsense where a branch name
 * should be.
 *
 * The READS cross to another computer and to github.com, so the door and the
 * store are replaced here and the gh process is a function this file passes in.
 * What these tests hold is the SHAPE: which argv is composed, which refusals
 * send nothing at all, which ones make no gh process, and that no state of a
 * machine ever throws. The live read is driven by
 * `node build/probe-p105-runs.mjs` against a loopback scratch machine, where the
 * branch, the repository and the commit are compared against what git itself
 * prints in that folder.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, that
 * a real gh reaches github.com, or how long either takes. The probe measures
 * all three and prints them.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LIMIT, assertReadOnlyArgv } from '../../actions/argv';
import { WATCH_LIMITS } from '../../actions/watch';
import type { GhRunResult } from '../../actions/spawn';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every remote read this file caused. It stays empty for every refusal. */
let reads: Array<{ script: string; args: string[] }> = [];
/** What the far side answers, or a throw standing in for a link that dropped. */
let readAnswer: () => string = () => 'repo none none none';
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

vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => {
    if (!contextReady.has(machineId)) throw new Error('no connection');
    return { kind: 'remote', machineId };
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => (id === 'far' ? { id, label: 'Studio' } : null),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id
}));

const { parseRepoFactsAnswer, readRunsOnMachine, runLimitOf } = await import(
  '../remote-runs'
);

// ---------------------------------------------------------------------------
// The gh process, which is a function rather than a process
// ---------------------------------------------------------------------------

/** Every gh call this file caused, with the argv, the cwd and the env. */
let ghCalls: Array<{
  bin: string;
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}> = [];
/** What that gh answered. The default is one clean empty list. */
let ghResult: GhRunResult = {
  stdout: '[]',
  stderr: '',
  code: 0,
  timedOut: false,
  spawnError: null
};
/**
 * Per call answers, consumed in order, for the tests where the branch query
 * and the commit query must answer differently (Phase 120). When the queue
 * is empty every call gets `ghResult`, as before.
 */
let ghResultQueue: GhRunResult[] = [];

const spawner = (
  bin: string,
  argv: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
): Promise<GhRunResult> => {
  ghCalls.push({ bin, argv: [...argv], cwd: options.cwd, env: options.env });
  return Promise.resolve(ghResultQueue.shift() ?? ghResult);
};

const seam = { ghSpawner: spawner, ghBin: '/usr/bin/gh' };

const encode = (text: string): string =>
  Buffer.from(text, 'utf8').toString('base64');

/** One `repo` answer, composed the way the far side composes it. */
function factsAnswer(
  url: string | null,
  branch: string | null,
  sha: string | null
): string {
  return [
    'repo',
    url === null ? 'none' : encode(url),
    branch === null ? 'none' : encode(branch),
    sha ?? 'none'
  ].join(' ');
}

/** One row of gh's own `run list --json` output, with every required field. */
function ghRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    databaseId: 4001,
    number: 12,
    workflowName: 'CI',
    displayTitle: 'a change',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    createdAt: '2026-08-20T10:00:00Z',
    startedAt: '2026-08-20T10:00:05Z',
    updatedAt: '2026-08-20T10:02:00Z',
    url: 'https://github.com/owner/repo/actions/runs/4001',
    ...over
  };
}

beforeEach(() => {
  reads = [];
  ghCalls = [];
  readAnswer = () => factsAnswer('git@github.com:owner/repo.git', 'main', 'a'.repeat(40));
  connected = new Set(['far']);
  contextReady = new Set(['far']);
  ghResult = {
    stdout: '[]',
    stderr: '',
    code: 0,
    timedOut: false,
    spawnError: null
  };
  ghResultQueue = [];
});

// ---------------------------------------------------------------------------
// 1 to 3. The pure half
// ---------------------------------------------------------------------------

describe('reading what the machine answered', () => {
  it('reads the four fields of a repo answer', () => {
    const payload = factsAnswer(
      'https://github.com/owner/repo.git',
      'feature/one',
      'b'.repeat(40)
    );
    expect(parseRepoFactsAnswer(payload)).toEqual({
      mode: 'repo',
      originUrl: 'https://github.com/owner/repo.git',
      branch: 'feature/one',
      headSha: 'b'.repeat(40)
    });
  });

  it('reads the three refusal words with their three none fields', () => {
    for (const word of ['missing', 'denied', 'notrepo'] as const) {
      expect(parseRepoFactsAnswer(`${word} none none none`)).toEqual({
        mode: word,
        originUrl: null,
        branch: null,
        headSha: null
      });
    }
  });

  it('reads none in either of the two fields that can be absent', () => {
    // A detached head answers with no branch and a repository with no commits
    // answers with no sha. Both are ordinary states of a folder rather than
    // failures.
    const detached = parseRepoFactsAnswer(
      factsAnswer('git@github.com:owner/repo.git', null, 'c'.repeat(40))
    );
    expect(detached?.branch).toBeNull();
    expect(detached?.headSha).toBe('c'.repeat(40));
    const fresh = parseRepoFactsAnswer(
      factsAnswer('git@github.com:owner/repo.git', null, null)
    );
    expect(fresh?.headSha).toBeNull();
  });

  it('reads an answer with newlines and extra spacing between the words', () => {
    const payload = `\n repo \t ${encode('u')}  ${encode('main')} ${'d'.repeat(40)} \n`;
    expect(parseRepoFactsAnswer(payload)?.branch).toBe('main');
  });

  it('refuses a word the script never prints', () => {
    expect(parseRepoFactsAnswer('ok none none none')).toBeNull();
    expect(parseRepoFactsAnswer('none none none none')).toBeNull();
    expect(parseRepoFactsAnswer('')).toBeNull();
  });

  it('refuses an answer with a field missing or a field too many', () => {
    expect(parseRepoFactsAnswer('repo none none')).toBeNull();
    expect(parseRepoFactsAnswer('missing none none')).toBeNull();
    expect(parseRepoFactsAnswer('repo none none none none')).toBeNull();
  });

  it('refuses a word holding a character base64 does not use', () => {
    // `Buffer.from` DROPS such a character and hands back plausible nonsense,
    // and a person reading a branch name cannot tell nonsense from a branch.
    expect(parseRepoFactsAnswer(`repo %%%% ${encode('main')} ${'e'.repeat(40)}`)).toBeNull();
    expect(parseRepoFactsAnswer(`repo ${encode('u')} not-base64! ${'e'.repeat(40)}`)).toBeNull();
  });

  it('refuses a head sha that is not a sha', () => {
    expect(parseRepoFactsAnswer(`repo ${encode('u')} ${encode('main')} HEAD`)).toBeNull();
    expect(parseRepoFactsAnswer(`repo ${encode('u')} ${encode('main')} zzz`)).toBeNull();
  });

  it('refuses a refusal word carrying anything but three none fields', () => {
    expect(parseRepoFactsAnswer(`missing ${encode('u')} none none`)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4 to 6. The refusals that send nothing
// ---------------------------------------------------------------------------

describe('the refusals that ask nobody anything', () => {
  it('answers missing for a folder that is not an absolute path, and sends nothing', async () => {
    const out = await readRunsOnMachine(
      { machineId: 'far', cwd: 'relative/folder' },
      seam
    );
    expect(out.mode).toBe('missing');
    expect(reads).toEqual([]);
    expect(ghCalls).toEqual([]);
  });

  it('answers notConnected for a machine that is not answering, and sends nothing', async () => {
    connected = new Set();
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('notConnected');
    expect(reads).toEqual([]);
    expect(ghCalls).toEqual([]);
  });

  it('answers notConnected when the connection is not ready, and sends nothing', async () => {
    contextReady = new Set();
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('notConnected');
    expect(reads).toEqual([]);
    expect(ghCalls).toEqual([]);
  });

  it('answers unreachable when the read throws', async () => {
    readAnswer = () => {
      throw new Error('the link dropped');
    };
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('unreachable');
    expect(ghCalls).toEqual([]);
  });

  it('answers unreachable when the answer is a shape it does not know', async () => {
    readAnswer = () => 'ok none none none';
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('unreachable');
    expect(ghCalls).toEqual([]);
  });

  it('carries the three folder words straight through to their own modes', async () => {
    for (const [word, mode] of [
      ['missing', 'missing'],
      ['denied', 'denied'],
      ['notrepo', 'notRepo']
    ] as const) {
      reads = [];
      readAnswer = () => `${word} none none none`;
      const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
      expect(out.mode).toBe(mode);
      expect(reads).toHaveLength(1);
      expect(ghCalls).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// 7 and 8. The two answers that make NO gh process
// ---------------------------------------------------------------------------

describe('the answers that make no gh process at all', () => {
  it('answers notGitHub for an origin that is not on github.com', async () => {
    readAnswer = () =>
      factsAnswer('git@gitlab.com:owner/repo.git', 'main', 'f'.repeat(40));
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('notGitHub');
    expect(out.ownerRepo).toBeNull();
    // The branch and the commit are still facts about that folder, and the
    // panel names the branch either way.
    expect(out.branch).toBe('main');
    expect(out.headSha).toBe('f'.repeat(40));
    expect(ghCalls).toEqual([]);
  });

  it('answers notGitHub for a repository with no origin at all', async () => {
    readAnswer = () => factsAnswer(null, 'main', 'f'.repeat(40));
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('notGitHub');
    expect(ghCalls).toEqual([]);
  });

  it('answers noBranch for a detached head', async () => {
    readAnswer = () =>
      factsAnswer('git@github.com:owner/repo.git', null, 'f'.repeat(40));
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('noBranch');
    expect(out.ownerRepo).toBe('owner/repo');
    expect(out.headSha).toBe('f'.repeat(40));
    expect(ghCalls).toEqual([]);
  });

  it('answers noBranch for a repository with no commits', async () => {
    readAnswer = () => factsAnswer('git@github.com:owner/repo.git', null, null);
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('noBranch');
    expect(out.branch).toBeNull();
    expect(out.headSha).toBeNull();
    expect(ghCalls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 9, 10 and 13. The one gh command line
// ---------------------------------------------------------------------------

describe('the gh command line', () => {
  it('composes run list for that branch and then for the head commit', async () => {
    // TWO invocations since Phase 120, branch first, commit second, never one
    // argv with both flags. The commit query is what returns a tag push run,
    // whose head branch GitHub records as the tag name.
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(ghCalls).toHaveLength(2);
    expect(ghCalls[0]?.argv).toEqual([
      'run',
      'list',
      '--repo',
      'owner/repo',
      '--branch',
      'main',
      '--limit',
      String(WATCH_LIMITS.RUN_LIMIT),
      '--json',
      'databaseId,number,workflowName,displayTitle,status,conclusion,event,' +
        'headBranch,headSha,createdAt,startedAt,updatedAt,url'
    ]);
    expect(ghCalls[1]?.argv).toEqual([
      'run',
      'list',
      '--repo',
      'owner/repo',
      '--commit',
      'a'.repeat(40),
      '--limit',
      String(WATCH_LIMITS.COMMIT_RUN_LIMIT),
      '--json',
      'databaseId,number,workflowName,displayTitle,status,conclusion,event,' +
        'headBranch,headSha,createdAt,startedAt,updatedAt,url'
    ]);
    // The same belt the branch argv gets: the commit argv is a shape the
    // allowlist accepts, asked here on the exact argv that was spawned.
    expect(() => assertReadOnlyArgv(ghCalls[1]?.argv ?? [])).not.toThrow();
  });

  it('reads exactly one thing from the machine, and it is repo-facts', async () => {
    await readRunsOnMachine({ machineId: 'far', cwd: '/deep/folder' }, seam);
    expect(reads).toEqual([{ script: 'repo-facts', args: ['/deep/folder'] }]);
  });

  it('clamps the row limit to the ceiling and floors it at one', async () => {
    expect(runLimitOf(undefined)).toBe(WATCH_LIMITS.RUN_LIMIT);
    expect(runLimitOf(1_000)).toBe(MAX_LIMIT);
    expect(runLimitOf(0)).toBe(1);
    expect(runLimitOf(-5)).toBe(1);
    expect(runLimitOf(7.9)).toBe(7);
    const out = await readRunsOnMachine(
      { machineId: 'far', cwd: '/w', limit: 1_000 },
      seam
    );
    expect(out.limit).toBe(MAX_LIMIT);
    expect(ghCalls[0]?.argv).toContain(String(MAX_LIMIT));
  });

  it('carries no token in the argv and composes no GH_TOKEN', async () => {
    // The gh that answers this read runs on THIS Mac. No token, no gh
    // invocation and no GitHub host name is sent to the machine, and the
    // command line Tortie composes carries no credential of any kind.
    await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(ghCalls.length).toBeGreaterThan(0);
    for (const call of ghCalls) {
      const line = call.argv.join(' ');
      for (const word of [
        'GH_TOKEN',
        'GITHUB_TOKEN',
        'Authorization',
        'hosts.yml',
        '.config/gh',
        'netrc'
      ]) {
        expect(line, word).not.toContain(word);
      }
      expect(call.env['GH_TOKEN']).toBeUndefined();
    }
    // The whole read sent ONE thing to the machine and it was a folder path.
    expect(reads).toEqual([{ script: 'repo-facts', args: ['/w'] }]);
  });

  it('runs every gh in this Mac’s own home directory', async () => {
    const { homedir } = await import('node:os');
    await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(ghCalls.length).toBeGreaterThan(0);
    for (const call of ghCalls) expect(call.cwd).toBe(homedir());
  });
});

// ---------------------------------------------------------------------------
// 11 and 12. What gh answered
// ---------------------------------------------------------------------------

describe('what gh answered', () => {
  it('carries the rung of a failed gh read and stays in the ok mode', async () => {
    // The machine answered fine and GitHub is a separate question.
    ghResult = {
      stdout: '',
      stderr: 'gh auth login is required',
      code: 4,
      timedOut: false,
      spawnError: null
    };
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(out.health).toEqual({ state: 'logged-out' });
    expect(out.runs).toEqual([]);
    expect(out.branch).toBe('main');
  });

  it('turns gh’s own rows into runs, and keeps the branch and the commit', async () => {
    ghResult = { ...ghResult, stdout: JSON.stringify([ghRow()]) };
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(out.health).toEqual({ state: 'ready' });
    expect(out.runs).toHaveLength(1);
    expect(out.runs[0]?.id).toBe(4001);
    expect(out.runs[0]?.workflowName).toBe('CI');
    expect(out.ownerRepo).toBe('owner/repo');
    expect(out.branch).toBe('main');
    expect(out.headSha).toBe('a'.repeat(40));
    expect(out.machineLabel).toBe('Studio');
    expect(out.cwd).toBe('/w');
  });

  it('drops a row missing a required field into issues rather than into runs', async () => {
    const bad = ghRow();
    delete bad['headSha'];
    // The branch query answers the bad row; the commit query answers a clean
    // empty list, so the one issue below is the branch parse's own.
    ghResultQueue = [
      { ...ghResult, stdout: JSON.stringify([ghRow(), bad]) },
      { ...ghResult, stdout: '[]' }
    ];
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.runs).toHaveLength(1);
    expect(out.issues).toEqual([
      { kind: 'run', field: 'headSha', reason: 'is not a string' }
    ]);
  });

  it('answers with the machine id as its label when there is no row', async () => {
    connected = new Set(['nameless']);
    contextReady = new Set(['nameless']);
    const out = await readRunsOnMachine({ machineId: 'nameless', cwd: '/w' }, seam);
    expect(out.machineLabel).toBe('nameless');
  });
});

// ---------------------------------------------------------------------------
// Phase 120. The second query, and the fold of the two answers
// ---------------------------------------------------------------------------

describe('the merged answer of the two queries', () => {
  it('lists a tag run the branch query alone omits', async () => {
    // The defect Phase 120 fixes: GitHub records a tag push run's head branch
    // as the tag name, so only the commit query returns a release run.
    ghResultQueue = [
      { ...ghResult, stdout: JSON.stringify([ghRow()]) },
      {
        ...ghResult,
        stdout: JSON.stringify([
          ghRow({ databaseId: 5001, headBranch: 'v9.9.9' })
        ])
      }
    ];
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(out.runs.map((row) => row.id).sort()).toEqual([4001, 5001]);
    expect(out.runs.some((row) => row.headBranch === 'v9.9.9')).toBe(true);
    // Still exactly one remote read for the whole merged answer.
    expect(reads).toHaveLength(1);
  });

  it('lands a run returned by both queries exactly once', async () => {
    ghResultQueue = [
      { ...ghResult, stdout: JSON.stringify([ghRow()]) },
      {
        ...ghResult,
        stdout: JSON.stringify([ghRow(), ghRow({ databaseId: 5002 })])
      }
    ];
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.runs.map((row) => row.id).sort()).toEqual([4001, 5002]);
  });

  it('makes one gh process when the machine reported no head sha', async () => {
    // A branch with no commit behind it has no tip for the second query.
    readAnswer = () => factsAnswer('git@github.com:owner/repo.git', 'main', null);
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(ghCalls).toHaveLength(1);
    expect(ghCalls[0]?.argv).toContain('--branch');
  });

  it('keeps the branch rows and the ok mode when the commit query fails', async () => {
    ghResultQueue = [
      { ...ghResult, stdout: JSON.stringify([ghRow()]) },
      {
        stdout: '',
        stderr: 'gh auth login is required',
        code: 4,
        timedOut: false,
        spawnError: null
      }
    ];
    const out = await readRunsOnMachine({ machineId: 'far', cwd: '/w' }, seam);
    expect(out.mode).toBe('ok');
    expect(out.runs.map((row) => row.id)).toEqual([4001]);
    // The rung names the commit failure, so the panel does not claim a full
    // read that did not happen.
    expect(out.health).toEqual({ state: 'logged-out' });
  });

  it('keeps a tip run past the limit, so the merged list can exceed it', async () => {
    const tip = 'a'.repeat(40);
    ghResultQueue = [
      {
        ...ghResult,
        stdout: JSON.stringify([
          ghRow({ databaseId: 4002, headSha: 'b'.repeat(40) })
        ])
      },
      {
        ...ghResult,
        stdout: JSON.stringify([
          ghRow({ databaseId: 5003, headSha: tip }),
          ghRow({ databaseId: 5004, headSha: tip })
        ])
      }
    ];
    const out = await readRunsOnMachine(
      { machineId: 'far', cwd: '/w', limit: 1 },
      seam
    );
    // The limit is 1 and three rows merged: the newest row filled the limit
    // and the two tip rows are kept past it.
    expect(out.limit).toBe(1);
    expect(out.runs.length).toBeGreaterThan(1);
    for (const row of out.runs.slice(1)) {
      expect(row.headSha).toBe(tip);
    }
  });
});
