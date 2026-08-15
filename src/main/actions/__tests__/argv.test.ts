/**
 * The argv allowlist (Phase 46, spec section 10.1).
 *
 * This is the test that keeps "read only" executable rather than promised.
 * It checks the allowlist ARRAY's length, so a fourth verb cannot be added
 * without a person editing this file and saying why.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  GH_ALLOWED_VERBS,
  MAX_LIMIT,
  RUN_LIST_FIELDS,
  RUN_VIEW_FIELDS,
  assertReadOnlyArgv,
  buildAuthStatusArgv,
  buildRunListForBranchArgv,
  buildRunListForCommitArgv,
  buildRunViewArgv
} from '../argv';
import { READ_TIMEOUT_MS, runGh } from '../spawn';

const OWNER_REPO = 'gregce/tortie';
const SHA = '08b47570681d5204c4faa93b5cb1306e9d1c9ec8';

describe('the allowlist itself', () => {
  it('holds exactly three verbs', () => {
    // A fourth verb is a decision, not an edit. Changing this number means
    // changing what Tortie can ask gh to do.
    expect(GH_ALLOWED_VERBS).toHaveLength(3);
    expect([...GH_ALLOWED_VERBS].sort()).toEqual([
      'auth status',
      'run list',
      'run view'
    ]);
  });
});

describe('every builder composes a passing argv', () => {
  const built: Record<string, string[]> = {
    'auth status': buildAuthStatusArgv(),
    'run list, by branch': buildRunListForBranchArgv({
      ownerRepo: OWNER_REPO,
      branch: 'main',
      limit: 10
    }),
    'run list, by commit': buildRunListForCommitArgv({
      ownerRepo: OWNER_REPO,
      sha: SHA,
      limit: 20
    }),
    'run view': buildRunViewArgv({ ownerRepo: OWNER_REPO, runId: 31900744174 })
  };

  for (const [name, argv] of Object.entries(built)) {
    it(`${name} passes`, () => {
      expect(() => assertReadOnlyArgv(argv)).not.toThrow();
    });

    it(`${name} starts with one of the three verbs`, () => {
      expect(GH_ALLOWED_VERBS).toContain(`${argv[0]} ${argv[1]}`);
    });
  }

  it('always names the repository, so gh never guesses it', () => {
    for (const [name, argv] of Object.entries(built)) {
      if (name === 'auth status') continue;
      expect(argv).toContain('--repo');
      expect(argv[argv.indexOf('--repo') + 1]).toBe(OWNER_REPO);
    }
  });

  it('asks for the field sets the parser expects', () => {
    expect(built['run list, by branch']).toContain(RUN_LIST_FIELDS);
    expect(built['run view']).toContain(RUN_VIEW_FIELDS);
  });

  it('a branch with a dash in the middle is fine', () => {
    expect(() =>
      assertReadOnlyArgv(
        buildRunListForBranchArgv({
          ownerRepo: OWNER_REPO,
          branch: 'feature/p46-runs',
          limit: 10
        })
      )
    ).not.toThrow();
  });
});

describe('every mutation is refused', () => {
  const refused: Record<string, string[]> = {
    'run cancel': ['run', 'cancel', '1'],
    'run rerun': ['run', 'rerun', '1'],
    'run delete': ['run', 'delete', '1'],
    'workflow run': ['workflow', 'run', 'x.yml'],
    'api POST': [
      'api',
      '-X',
      'POST',
      '/repos/o/r/actions/runs/1/cancel'
    ],
    'auth login': ['auth', 'login'],
    'pr create': ['pr', 'create'],
    'repo delete': ['repo', 'delete', 'o/r'],
    'the empty argv': [],
    'run alone': ['run']
  };

  for (const [name, argv] of Object.entries(refused)) {
    it(`refuses ${name}`, () => {
      expect(() => assertReadOnlyArgv(argv)).toThrow(/refused a gh argv/);
    });
  }
});

describe('a value can never become a flag', () => {
  it('refuses a branch that starts with a dash', () => {
    expect(() =>
      assertReadOnlyArgv([
        'run',
        'list',
        '--repo',
        OWNER_REPO,
        '--branch',
        '--upload-pack=evil',
        '--limit',
        '10',
        '--json',
        RUN_LIST_FIELDS
      ])
    ).toThrow(/starts with a dash/);
  });

  it('refuses a repository that is not owner/repo', () => {
    expect(() =>
      assertReadOnlyArgv(['run', 'list', '--repo', 'not a repo'])
    ).toThrow(/owner\/repo/);
  });

  it('refuses a run id that is not a positive integer', () => {
    for (const bad of ['1;rm', '0', '-1', 'abc', '1.5']) {
      expect(() =>
        assertReadOnlyArgv(['run', 'view', bad, '--repo', OWNER_REPO])
      ).toThrow(/positive integer run id/);
    }
  });

  it('refuses a flag this module never writes', () => {
    expect(() =>
      assertReadOnlyArgv(['run', 'list', '--repo', OWNER_REPO, '--template', 'x'])
    ).toThrow(/is not a flag this module writes/);
  });

  it('refuses a limit above the cap', () => {
    expect(() =>
      assertReadOnlyArgv([
        'run',
        'list',
        '--repo',
        OWNER_REPO,
        '--limit',
        String(MAX_LIMIT + 1)
      ])
    ).toThrow(/above 50/);
  });

  it('refuses a commit that is not a sha', () => {
    expect(() =>
      assertReadOnlyArgv(['run', 'list', '--repo', OWNER_REPO, '--commit', 'HEAD'])
    ).toThrow(/commit sha/);
  });

  it('refuses a flag with no value', () => {
    expect(() =>
      assertReadOnlyArgv(['run', 'list', '--repo', OWNER_REPO, '--branch'])
    ).toThrow(/has no value/);
  });

  it('refuses a run list with no repository', () => {
    expect(() =>
      assertReadOnlyArgv(['run', 'list', '--branch', 'main'])
    ).toThrow(/must name its repository/);
  });
});

describe('runGh checks before it spawns', () => {
  it('never creates a process for a mutating argv', async () => {
    const spawner = vi.fn();
    await expect(
      runGh(['run', 'cancel', '1'], {
        cwd: '/tmp',
        timeoutMs: READ_TIMEOUT_MS,
        bin: '/nowhere/gh',
        spawner: spawner as never
      })
    ).rejects.toThrow(/refused a gh argv/);
    expect(spawner).not.toHaveBeenCalled();
  });

  it('does create a process for a read', async () => {
    const spawner = vi.fn(async () => ({
      stdout: '[]',
      stderr: '',
      code: 0,
      timedOut: false,
      spawnError: null
    }));
    const outcome = await runGh(
      buildRunListForBranchArgv({
        ownerRepo: OWNER_REPO,
        branch: 'main',
        limit: 10
      }),
      {
        cwd: '/tmp',
        timeoutMs: READ_TIMEOUT_MS,
        bin: '/nowhere/gh',
        spawner
      }
    );
    expect(spawner).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ ok: true, stdout: '[]' });
  });
});
