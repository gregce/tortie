/**
 * Phase 370, items 4 and 5: `GitService.checkIgnore` over a fake `runGit`. No
 * process starts and `process.env` is not touched; the real git's own exits
 * are `check-ignore.integration.test.ts`, unedited. The rows are
 * build/p370/SPEC.md §7.2.
 *
 *   C1  a git that did not answer REJECTS: `runGit` rejecting, and every exit
 *       but 0, 1 and 128. 0 answers what git printed; 1 and 128 answer `[]`
 *   C2  one service asked ten times while git is held runs one child, then the
 *       last, and the eight between reject as superseded
 *   C3  two services for one folder share the line, and two folders do not
 *   C4  an empty or blank-only list starts nothing and holds nothing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitResult, RunGitOptions } from '../exec';

interface Held {
  repoPath: string;
  args: string[];
  options: RunGitOptions;
  settle(result: GitResult): void;
  fail(err: Error): void;
}

const fake = vi.hoisted(() => ({
  calls: [] as Held[],
  inFlight: 0,
  most: 0
}));

vi.mock('../exec', () => ({
  runGit: (
    repoPath: string,
    args: string[],
    options: RunGitOptions = {}
  ): Promise<GitResult> =>
    new Promise<GitResult>((resolve, reject) => {
      fake.inFlight += 1;
      fake.most = Math.max(fake.most, fake.inFlight);
      let out = true;
      const end = (): void => {
        if (out) fake.inFlight -= 1;
        out = false;
      };
      fake.calls.push({
        repoPath,
        args,
        options,
        settle: (result) => {
          end();
          resolve(result);
        },
        fail: (err) => {
          end();
          reject(err);
        }
      });
    }),
  runGitOrThrow: () => Promise.reject(new Error('not asked for here'))
}));

import { gmuxError, gmuxErrorPayloadOf } from '../../errors';
import { checkIgnoreLine } from '../ignore-line';
import { GitService } from '../service';

const IDLE = { running: false, waiting: false };
/** A folder of its own for every row: the line is the process's, so a row that
 *  leaves a child out must not be what the next row reads. */
let rowNumber = 0;
let repo = '';

const exit = (code: number, stdout = ''): GitResult => ({
  code,
  stdout: Buffer.from(stdout, 'utf8'),
  stderr: ''
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

function call(n: number): Held {
  const held = fake.calls[n];
  if (held === undefined) throw new Error(`call ${String(n)} has not started`);
  return held;
}

/** The outcome as one value, so a rejection is read and never unhandled. */
const outcome = (
  promise: Promise<string[]>
): Promise<{ ok: string[] } | { err: unknown }> =>
  promise.then(
    (ok) => ({ ok }),
    (err: unknown) => ({ err })
  );

beforeEach(() => {
  rowNumber += 1;
  repo = `/scratch/p370-repo-${String(rowNumber)}`;
  fake.calls.length = 0;
  fake.inFlight = 0;
  fake.most = 0;
});

afterEach(() => {
  // No row may leave a child out.
  expect(fake.inFlight).toBe(0);
  expect(checkIgnoreLine.observe(repo)).toEqual(IDLE);
});

describe('C1: which exits answer', () => {
  async function ended(result: GitResult): Promise<{ ok: string[] } | { err: unknown }> {
    const asked = outcome(new GitService(repo).checkIgnore(['a.log', 'b.txt']));
    call(0).settle(result);
    return asked;
  }

  it('asks git for exactly the paths, on its standard input', async () => {
    const asked = outcome(new GitService(repo).checkIgnore(['a.log', '', 'two\nlines']));
    expect(call(0).repoPath).toBe(repo);
    expect(call(0).args).toEqual(['check-ignore', '-z', '--stdin']);
    // Nothing but the paths: no signal a newer call could end it by.
    expect(call(0).options).toEqual({ stdin: 'a.log\0two\nlines\0' });
    call(0).settle(exit(1));
    expect(await asked).toEqual({ ok: [] });
  });

  it('answers what git printed on exit 0, split on NUL', async () => {
    expect(await ended(exit(0, 'a.log\0two\nlines\0'))).toEqual({
      ok: ['a.log', 'two\nlines']
    });
  });

  it.each([1, 128])('answers nothing ignored on exit %i', async (code) => {
    expect(await ended(exit(code, 'never read\0'))).toEqual({ ok: [] });
  });

  // -1 is a signal, 129 an option git does not know, 3 a git that broke.
  it.each([-1, 2, 3, 127, 129, 137])('rejects GIT_FAILED on exit %i', async (code) => {
    const got = await ended(exit(code, 'a.log\0'));
    const payload = 'err' in got ? gmuxErrorPayloadOf(got.err) : null;
    expect(payload?.code).toBe('GIT_FAILED');
    expect(payload?.detail).toBe(
      `git check-ignore -z --stdin ended with ${String(code)}`
    );
  });

  it.each([
    ['the timeout', gmuxError('GIT_FAILED', 'A git command took too long and was stopped.')],
    ['no git', gmuxError('GIT_FAILED', 'Git is not installed (or not on PATH).')],
    ['a git that cannot start', gmuxError('SPAWN_FAILED', 'Could not start git.')]
  ])('hands on what runGit rejected with: %s', async (_what, err) => {
    const asked = outcome(new GitService(repo).checkIgnore(['a.log']));
    call(0).fail(err);
    expect(await asked).toEqual({ err });
  });
});

describe('C2: one service runs one child at a time', () => {
  it('ten asks while git is held: the first runs, then the last', async () => {
    const svc = new GitService(repo);
    const asks = Array.from({ length: 10 }, (_unused, i) =>
      outcome(svc.checkIgnore([`ask-${String(i)}.log`]))
    );
    await flush();
    expect(fake.most).toBe(1);
    expect(fake.calls).toHaveLength(1);
    expect(checkIgnoreLine.observe(repo)).toEqual({ running: true, waiting: true });

    // The eight between are told now, not when git answers.
    for (const between of await Promise.all(asks.slice(1, 9))) {
      const payload = 'err' in between ? gmuxErrorPayloadOf(between.err) : null;
      expect(payload?.code).toBe('GIT_FAILED');
      expect(payload?.detail).toBe(
        'git check-ignore -z --stdin was superseded before it started'
      );
    }
    expect(fake.calls).toHaveLength(1);

    call(0).settle(exit(0, 'ask-0.log\0'));
    await flush();
    expect(fake.calls).toHaveLength(2);
    expect(call(1).options.stdin).toBe('ask-9.log\0');
    call(1).settle(exit(0, 'ask-9.log\0'));

    expect(await asks[0]).toEqual({ ok: ['ask-0.log'] });
    expect(await asks[9]).toEqual({ ok: ['ask-9.log'] });
    expect(fake.most).toBe(1);
    expect(fake.calls).toHaveLength(2);
  });

  it('a git that failed frees the line for the ask behind it', async () => {
    const svc = new GitService(repo);
    const first = outcome(svc.checkIgnore(['a.log']));
    const behind = outcome(svc.checkIgnore(['b.log']));
    call(0).settle(exit(-1));
    expect('err' in (await first)).toBe(true);
    await flush();
    call(1).settle(exit(0, 'b.log\0'));
    expect(await behind).toEqual({ ok: ['b.log'] });
    expect(fake.most).toBe(1);
  });
});

describe('C3: the line is the folder’s, not the service’s', () => {
  it('two services for one folder share it', async () => {
    const first = outcome(new GitService(repo).checkIgnore(['a.log']));
    const second = outcome(new GitService(repo).checkIgnore(['b.log']));
    await flush();
    expect(fake.calls).toHaveLength(1);
    call(0).settle(exit(1));
    expect(await first).toEqual({ ok: [] });
    await flush();
    call(1).settle(exit(1));
    expect(await second).toEqual({ ok: [] });
    expect(fake.most).toBe(1);
  });

  it('another folder is not held', async () => {
    const first = outcome(new GitService(repo).checkIgnore(['a.log']));
    const other = outcome(new GitService(`${repo}-other`).checkIgnore(['b.log']));
    await flush();
    expect(fake.calls.map((c) => c.repoPath)).toEqual([repo, `${repo}-other`]);
    call(1).settle(exit(0, 'b.log\0'));
    expect(await other).toEqual({ ok: ['b.log'] });
    call(0).settle(exit(1));
    expect(await first).toEqual({ ok: [] });
    expect(checkIgnoreLine.observe(`${repo}-other`)).toEqual(IDLE);
  });
});

describe('C4: nothing to ask', () => {
  it('starts nothing and holds nothing in the line', async () => {
    const svc = new GitService(repo);
    expect(await svc.checkIgnore([])).toEqual([]);
    expect(await svc.checkIgnore(['', ''])).toEqual([]);
    expect(fake.calls).toHaveLength(0);
    expect(checkIgnoreLine.observe(repo)).toEqual(IDLE);
  });

  it('does not take the waiting place from an ask that has paths', async () => {
    const svc = new GitService(repo);
    const running = outcome(svc.checkIgnore(['a.log']));
    const waiting = outcome(svc.checkIgnore(['b.log']));
    expect(await svc.checkIgnore([])).toEqual([]);
    expect(await svc.checkIgnore([''])).toEqual([]);
    call(0).settle(exit(1));
    expect(await running).toEqual({ ok: [] });
    await flush();
    call(1).settle(exit(0, 'b.log\0'));
    expect(await waiting).toEqual({ ok: ['b.log'] });
    expect(fake.calls).toHaveLength(2);
  });
});
