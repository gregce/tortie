/**
 * Phase 371. The History store answers a change by what it carries
 * (build/p371/SPEC.md §4.4, D8 to D13): a saved file asks git for nothing but
 * what is still owed, a move asks for each read once, and the reads a change
 * causes run one at a time with one behind.
 *
 * The store is the real one over a bridge this file owns, in the shape of
 * ./p199-search-refusal.test.ts. Every call is recorded with the instant it
 * was made and is answered by hand, so what is counted is what git would have
 * been asked, and the order answers land in is this file's to choose.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitGraphLogInput } from '@shared/types';

type Method = 'graphLog' | 'log' | 'branches' | 'remoteBranches' | 'remotes';

interface Call {
  method: Method;
  repo: string;
  input: GitGraphLogInput | null;
  open: boolean;
  answer(value?: unknown): Promise<void>;
  refuse(message?: string): Promise<void>;
}

let calls: Call[] = [];
/** Answer every call as it is made, with the method's own default. */
let auto = true;
/** How a method's calls answer while `auto` is on; absent is the default. */
let rules: Partial<Record<Method, (call: Call) => void>> = {};
let fire: ((repoPath: string, gitMoved?: boolean) => void) | null = null;

const entry = (subject: string) => ({ hash: subject, sha: subject, subject, refs: [] });

const page = (subject: string, extra: Record<string, unknown> = {}) => ({
  entries: [entry(subject)],
  hasMore: false,
  refs: ['refs/heads/main'],
  divergence: { lastFetchedAt: null },
  isRepo: true,
  ...extra
});

const DEFAULTS: Record<Method, () => unknown> = {
  graphLog: () => page('row'),
  log: () => [{ hash: 'f'.repeat(40), authorName: 'a', authorDate: 0, subject: 'flat' }],
  branches: () => [],
  remoteBranches: () => ({ branches: [], lastFetchedAt: null }),
  remotes: () => ({ remotes: [], branch: 'main', upstream: null })
};

const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

function bridged(method: Method) {
  return (arg: string | GitGraphLogInput): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const call: Call = {
        method,
        repo: typeof arg === 'string' ? arg : arg.repoPath,
        input: typeof arg === 'string' ? null : arg,
        open: true,
        answer: async (value = DEFAULTS[method]()) => {
          call.open = false;
          resolve(value);
          await settle();
        },
        refuse: async (message = 'git said no') => {
          call.open = false;
          reject(new Error(message));
          await settle();
        }
      };
      calls.push(call);
      if (!auto) return;
      const rule = rules[method];
      if (rule !== undefined) rule(call);
      else void call.answer();
    });
}

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve(),
    git: {
      graphLog: bridged('graphLog'),
      log: bridged('log'),
      branches: bridged('branches'),
      remoteBranches: bridged('remoteBranches'),
      remotes: bridged('remotes'),
      remoteUrl: () => Promise.resolve(null),
      status: () => Promise.resolve(null),
      checkout: () => Promise.resolve(),
      checkoutTracking: () => Promise.resolve(),
      fetch: () => Promise.resolve(),
      deleteBranch: () => Promise.resolve({ status: 'deleted' }),
      createBranch: () => Promise.resolve(),
      createTag: () => Promise.resolve(),
      cherryPick: () => Promise.resolve({ status: 'applied' }),
      checkoutDetached: () => Promise.resolve(),
      push: () =>
        Promise.resolve({ status: 'pushed', branch: 'main', remote: 'origin', upstream: 'o/m' }),
      pull: () => Promise.resolve({ status: 'up-to-date', upstream: 'origin/main' }),
      sync: () =>
        Promise.resolve({
          pull: { status: 'up-to-date', upstream: 'origin/main' },
          push: { status: 'up-to-date', remote: 'origin' }
        }),
      onChanged: (cb: (repoPath: string, gitMoved?: boolean) => void) => {
        fire = cb;
        return () => undefined;
      }
    }
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

vi.useFakeTimers();
const { depthRepoState, fileHistoryKey, useGitDepth } = await import('../depth');
const { parseHistoryQuery } = await import('../history-search');
const { REPO_CHANGED_DEBOUNCE_MS } = await import('../../state/repo-changed');

/** A repository of its own per test: the store's lines outlive a test. */
let REPO = '';
let made = 0;

const depth = () => useGitDepth.getState();
const repo = () => depthRepoState(depth().repos, REPO);
const win = (file: string) => depth().files[fileHistoryKey(REPO, file)];
const FILE = 'src/a.ts';

/** What was asked since `from`, one word per call, sorted. */
const asked = (from = 0): string[] =>
  calls
    .slice(from)
    .map((c) => (c.input?.path === undefined ? c.method : `file:${c.input.path}`))
    .sort();
const walks = (from = 0): Call[] =>
  calls.slice(from).filter((c) => c.method === 'graphLog' && c.input?.path === undefined);
const of = (method: Method, from = 0): Call[] =>
  calls.slice(from).filter((c) => c.method === method && c.input?.path === undefined);
const filesAsked = (from = 0): Call[] =>
  calls.slice(from).filter((c) => c.input?.path !== undefined);
const aliveNow = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const c of calls) {
    if (!c.open) continue;
    const key = c.input?.path === undefined ? c.method : `file:${c.input.path}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
};

const THE_FOUR = ['branches', 'graphLog', 'remoteBranches', 'remotes'];
const FOUR_AND_FILE = ['branches', `file:${FILE}`, 'graphLog', 'remoteBranches', 'remotes'];

/** One change through the 150 ms window. */
const change = async (...message: [] | [boolean]): Promise<void> => {
  fire?.(REPO, ...message);
  await vi.advanceTimersByTimeAsync(REPO_CHANGED_DEBOUNCE_MS);
};

/** Answer everything open, over and over, until nothing is. */
const drain = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    const open = calls.filter((c) => c.open);
    if (open.length === 0) return;
    for (const c of open) await c.answer();
  }
  throw new Error('the bridge never went quiet');
};

beforeEach(async () => {
  made += 1;
  REPO = `/scratch/p371/repo-${made}`;
  calls = [];
  auto = true;
  rules = {};
  useGitDepth.setState({ repos: {}, files: {} });
  depth().ensure(REPO, 'branch');
  await settle();
  expect(asked()).toEqual(THE_FOUR);
  expect(repo().log).toHaveLength(1);
  calls = [];
});

afterEach(async () => {
  auto = true;
  rules = {};
  await drain();
});

/** Open the file window, answered. */
const openFile = async (): Promise<void> => {
  depth().ensureFile(REPO, FILE);
  await settle();
  expect(win(FILE)?.rows).toHaveLength(1);
  calls = [];
};

/** The same window again: ensured when it is not held, and quiet. */
const openFileAgain = async (): Promise<void> => {
  depth().ensureFile(REPO, FILE);
  await settle();
  await drain();
};

describe('what a change asks', () => {
  it('H1 a saved file asks git for nothing once everything is answered', async () => {
    await openFile();
    for (let i = 0; i < 10; i++) await change(false);
    expect(asked()).toEqual([]);
  });

  it('H2 a move, and a change that does not say, asks each once', async () => {
    await openFile();
    await change(true);
    expect(asked()).toEqual(FOUR_AND_FILE);
    const from = calls.length;
    await change();
    expect(asked(from)).toEqual(FOUR_AND_FILE);
  });

  it('H8 the file windows are asked on the same beat as the log', async () => {
    await openFile();
    auto = false;
    fire?.(REPO, true);
    await vi.advanceTimersByTimeAsync(REPO_CHANGED_DEBOUNCE_MS - 1);
    expect(asked()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    // Nothing has answered, so every one of them started in this one tick.
    expect(asked()).toEqual(FOUR_AND_FILE);
    await drain();
  });

  it('H8 a move in another repository asks nothing of this one', async () => {
    await openFile();
    fire?.(`${REPO}-other`, true);
    await vi.advanceTimersByTimeAsync(REPO_CHANGED_DEBOUNCE_MS);
    expect(asked()).toEqual([]);
  });

  it('H5 a repository only the header has asked about is loaded by the first saved file, once', async () => {
    REPO = `${REPO}-header`;
    await depth().loadRemotes(REPO);
    await depth().loadFetchAge(REPO);
    expect(repo().log).toBeNull();
    const from = calls.length;
    await change(false);
    // What the header's two reads answered is not asked again.
    expect(asked(from)).toEqual(['branches', 'graphLog']);
    expect(repo().log).toHaveLength(1);
    const after = calls.length;
    await change(false);
    expect(asked(after)).toEqual([]);
  });
});

describe('a read that was not answered', () => {
  for (const method of ['branches', 'remoteBranches', 'remotes'] as const) {
    it(`H3 a failed ${method} keeps the list, starts nothing, and is asked by the next saved file`, async () => {
      rules[method] = (c) => void c.refuse();
      const before = { ...repo() };
      await change(true);
      expect(asked()).toEqual(THE_FOUR);
      expect(repo().branches).toEqual(before.branches);
      expect(repo().remoteBranches).toEqual(before.remoteBranches);
      expect(repo().remotes).toEqual(before.remotes);

      let from = calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(asked(from)).toEqual([]);

      for (let i = 0; i < 2; i++) {
        from = calls.length;
        await change(false);
        expect(asked(from)).toEqual([method]);
      }
      rules = {};
      from = calls.length;
      await change(false);
      expect(asked(from)).toEqual([method]);
      from = calls.length;
      await change(false);
      expect(asked(from)).toEqual([]);
    });
  }

  it('H4 a walk that fell to the flat walk is owed until one does not', async () => {
    rules.graphLog = (c) => void c.refuse();
    await change(true);
    await settle();
    expect(of('log')).toHaveLength(1);
    expect(repo().log?.[0]?.subject).toBe('flat');

    let from = calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(asked(from)).toEqual([]);
    await change(false);
    expect(asked(from)).toEqual(['graphLog', 'log']);

    // The flat walk failing too is no more of an answer.
    rules.log = (c) => void c.refuse();
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['graphLog', 'log']);

    rules = {};
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['graphLog']);
    expect(repo().log?.[0]?.subject).toBe('row');
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H4 a bridge with no graph walk is answered by the flat one, and only by that', async () => {
    const git = (window as unknown as { gmux: { git: Record<string, unknown> } }).gmux.git;
    const graphLog = git.graphLog;
    delete git.graphLog;
    try {
      rules.log = (c) => void c.refuse();
      await change(true);
      let from = calls.length;
      await change(false);
      expect(asked(from)).toEqual(['log']);
      rules = {};
      await change(false);
      expect(repo().log?.[0]?.subject).toBe('flat');
      from = calls.length;
      await change(false);
      expect(asked(from)).toEqual([]);
    } finally {
      git.graphLog = graphLog;
    }
  });

  it('H4 a walk under a query that was refused is owed', async () => {
    rules.graphLog = (c) => void c.refuse('Paths must be relative to the repository root.');
    await depth().setQuery(REPO, parseHistoryQuery('file:../x'));
    expect(repo().searchError).not.toBeNull();
    const from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['graphLog']);
    expect(calls.at(-1)?.input?.search?.path).toBe('../x');
  });

  it('H4 a walk that answered it is not a repository is owed', async () => {
    rules.graphLog = (c) => void c.answer(page('row', { entries: [], isRepo: false }));
    await change(true);
    expect(repo().log).toEqual([]);
    rules = {};
    let from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['graphLog']);
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H4 a superseded walk is not owed', async () => {
    auto = false;
    await change(true);
    for (const c of calls.filter((x) => x.method !== 'graphLog')) await c.answer();
    void depth().refresh(REPO);
    await settle();
    const [first, second] = walks();
    await second!.answer();
    // Main ends the superseded walk, which is a refusal here.
    await first!.refuse('A newer walk replaced this one.');
    await drain();
    expect(of('log')).toHaveLength(0);
    const from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H6 a file window with no rows, an error, or no repository is asked by a saved file', async () => {
    auto = false;
    depth().ensureFile(REPO, FILE);
    await settle();
    expect(win(FILE)?.rows).toBeNull();
    for (let i = 0; i < 5; i++) await change(false);
    expect(filesAsked()).toHaveLength(2);
    await drain();
    // The one behind asked again whether it was still owed, and it was not.
    expect(filesAsked()).toHaveLength(2);
    auto = true;
    let from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);

    rules.graphLog = (c) =>
      void (c.input?.path === undefined ? c.answer() : c.refuse('it timed out'));
    await change(true);
    expect(win(FILE)?.error).toBe('it timed out');
    from = calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(asked(from)).toEqual([]);
    await change(false);
    expect(asked(from)).toEqual([`file:${FILE}`]);

    rules.graphLog = (c) =>
      void c.answer(
        c.input?.path === undefined ? page('row') : page('x', { entries: [], isRepo: false })
      );
    await change(false);
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([`file:${FILE}`]);

    rules = {};
    await change(false);
    expect(win(FILE)?.rows).toHaveLength(1);
    expect(win(FILE)?.error).toBeNull();
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H6 a window that was dropped and opened again has no rows, and is asked', async () => {
    await openFile();
    for (let i = 0; i < 8; i++) {
      depth().ensureFile(REPO, `src/other-${i}.ts`);
      await settle();
    }
    expect(win(FILE)).toBeUndefined();
    auto = false;
    depth().ensureFile(REPO, FILE);
    await settle();
    const from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([`file:${FILE}`]);
    await drain();
  });

  it('H6 a file window walked under another scope is asked by a saved file, once', async () => {
    await openFile();
    await depth().setLogScope(REPO, 'everything');
    let from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([`file:${FILE}`]);
    expect(calls.at(-1)?.input?.scope).toBe('everything');
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H13 a walk pinned to the old refs that ends the walk a move asked for leaves the log owed', async () => {
    auto = false;
    await change(true);
    expect(walks()).toHaveLength(1);
    expect(walks()[0]!.input?.refs).toBeUndefined();
    // Typing in the field, while the move's own walk is out.
    void depth().setQuery(REPO, parseHistoryQuery('redline'));
    await settle();
    expect(walks()[1]!.input?.refs).toEqual(['refs/heads/main']);
    await walks()[1]!.answer(page('narrowed'));
    await walks()[0]!.refuse('A newer walk replaced this one.');
    await drain();
    auto = true;
    let from = calls.length;
    await change(false);
    // Asked for the repository's refs again, inside the same query.
    expect(asked(from)).toEqual(['graphLog']);
    expect(calls.at(-1)?.input?.refs).toBeUndefined();
    expect(calls.at(-1)?.input?.search?.message).toBe('redline');
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H14 a move under a change search is read by the first saved file after the search', async () => {
    await depth().setQuery(REPO, parseHistoryQuery('change:runGit'));
    await change(true);
    await depth().setQuery(REPO, null);
    let from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['graphLog']);
    expect(calls.at(-1)?.input?.refs).toBeUndefined();
    from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H15 a saved file during a first read starts nothing more when that read answers', async () => {
    REPO = `${REPO}-slow`;
    auto = false;
    depth().ensure(REPO, 'branch');
    await settle();
    for (let i = 0; i < 5; i++) await change(false);
    expect(asked()).toEqual(THE_FOUR);
    await drain();
    expect(asked()).toEqual(THE_FOUR);
    await change(false);
    expect(asked()).toEqual(THE_FOUR);
  });

  it('H15 and is asked again when that read fails', async () => {
    REPO = `${REPO}-slow`;
    auto = false;
    depth().ensure(REPO, 'branch');
    await settle();
    await change(false);
    for (const c of [...calls]) await c.refuse();
    await drain();
    expect(of('branches')).toHaveLength(2);
    expect(of('remoteBranches')).toHaveLength(2);
    expect(of('remotes')).toHaveLength(2);
    expect(walks()).toHaveLength(2);
  });
});

describe('Phase 199, a change search on screen', () => {
  it('H7 a move re-reads the branches and starts no walk', async () => {
    await depth().setQuery(REPO, parseHistoryQuery('change:runGit'));
    const from = calls.length;
    await change(true);
    expect(asked(from)).toEqual(['branches', 'remoteBranches', 'remotes']);
    await change(false);
    expect(walks(from)).toHaveLength(0);
  });

  it('H7 nor does one whose walk was already waiting when the search was set', async () => {
    auto = false;
    await change(true);
    await change(true);
    expect(walks()).toHaveLength(1);
    void depth().setQuery(REPO, parseHistoryQuery('change:runGit'));
    await settle();
    expect(walks()).toHaveLength(2);
    await drain();
    expect(walks()).toHaveLength(2);
    expect(walks()[1]!.input?.search?.change).toBe('runGit');
  });
});

describe('one in flight and one behind', () => {
  it('H9 40 moves over a held git hold one of each and ask twice in all', async () => {
    await openFile();
    auto = false;
    for (let i = 0; i < 40; i++) {
      await change(true);
      const alive = aliveNow();
      expect(Object.values(alive).every((n) => n === 1), JSON.stringify(alive)).toBe(true);
    }
    expect(asked()).toEqual(FOUR_AND_FILE);
    await drain();
    expect(asked()).toEqual([...FOUR_AND_FILE, ...FOUR_AND_FILE].sort());
  });

  it('H9 and when every read fails, a burst asks twice and then nothing by itself', async () => {
    await openFile();
    auto = false;
    for (let i = 0; i < 10; i++) await change(i % 2 === 0);
    for (let i = 0; i < 10; i++) {
      for (const c of calls.filter((x) => x.open)) await c.refuse();
    }
    expect(aliveNow()).toEqual({});
    expect(walks()).toHaveLength(2);
    for (const m of ['branches', 'remoteBranches', 'remotes'] as const) {
      expect(of(m), m).toHaveLength(2);
    }
    expect(filesAsked()).toHaveLength(2);
    const from = calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(asked(from)).toEqual([]);
  });

  it('H9 the header’s two reads are on the same lines', async () => {
    auto = false;
    for (let i = 0; i < 5; i++) {
      void depth().loadRemotes(REPO);
      void depth().loadFetchAge(REPO);
    }
    await settle();
    expect(asked()).toEqual(['remoteBranches', 'remotes']);
    await drain();
    expect(asked()).toEqual(['remoteBranches', 'remoteBranches', 'remotes', 'remotes']);
  });

  it('L4 the walk behind waits for the newest of two presses', async () => {
    auto = false;
    await change(true);
    await change(true);
    void depth().setQuery(REPO, parseHistoryQuery('one'));
    await settle();
    await walks()[0]!.refuse('A newer walk replaced this one.');
    void depth().setQuery(REPO, parseHistoryQuery('two'));
    await settle();
    await walks()[1]!.refuse('A newer walk replaced this one.');
    expect(walks()).toHaveLength(3);
    await walks()[2]!.answer(page('two'));
    expect(repo().log?.[0]?.subject).toBe('two');
    await settle();
    expect(walks()).toHaveLength(4);
    await drain();
  });

  it('L4 a person’s walk starts at once over the line’s and owns the pane', async () => {
    for (const press of [
      () => depth().setQuery(REPO, parseHistoryQuery('redline')),
      () => depth().setLogScope(REPO, 'local'),
      () => depth().refresh(REPO)
    ]) {
      await drain();
      calls = [];
      auto = false;
      await change(true);
      await change(true);
      expect(walks()).toHaveLength(1);
      void press();
      await settle();
      expect(walks()).toHaveLength(2);
      // The walk the press ended is over; the one behind still waits for the press.
      await walks()[0]!.refuse('A newer walk replaced this one.');
      expect(walks()).toHaveLength(2);
      await walks()[1]!.answer(page('pressed'));
      expect(repo().log?.[0]?.subject).toBe('pressed');
      await settle();
      expect(walks()).toHaveLength(3);
      await walks()[2]!.answer(page('after'));
      expect(repo().log?.[0]?.subject).toBe('after');
      await drain();
      expect(walks()).toHaveLength(3);
    }
  });

  it('L5 a move does not end a first walk, and one walk follows it', async () => {
    REPO = `${REPO}-first`;
    auto = false;
    depth().ensure(REPO, 'branch');
    await settle();
    await change(true);
    await change(true);
    expect(walks()).toHaveLength(1);
    await walks()[0]!.answer(page('first'));
    expect(repo().log?.[0]?.subject).toBe('first');
    await settle();
    expect(walks()).toHaveLength(2);
    await drain();
    expect(walks()).toHaveLength(2);
  });

  it('L5 nor a page being loaded', async () => {
    auto = false;
    void depth().loadMore(REPO);
    await settle();
    await change(true);
    expect(walks()).toHaveLength(1);
    await walks()[0]!.answer(page('page two'));
    expect(repo().log?.[0]?.subject).toBe('page two');
    await settle();
    expect(walks()).toHaveLength(2);
    expect(walks()[1]!.input?.maxCount).toBe(100);
    await drain();
    expect(walks()).toHaveLength(2);
  });

  it('H12 every verb that refreshes starts the four at once, whatever the line holds', async () => {
    const verbs: Record<string, () => Promise<unknown>> = {
      refresh: () => depth().refresh(REPO),
      checkoutBranch: () => depth().checkoutBranch(REPO, 'b'),
      checkoutTracking: () => depth().checkoutTracking(REPO, 'origin/b'),
      fetchAll: () => depth().fetchAll(REPO),
      deleteBranch: () => depth().deleteBranch(REPO, 'b', false),
      createBranch: () => depth().createBranch(REPO, 'b'),
      createTag: () => depth().createTag(REPO, 't', 'abc1234'),
      cherryPick: () => depth().cherryPick(REPO, 'abc1234'),
      checkoutDetached: () => depth().checkoutDetached(REPO, 'abc1234'),
      push: () => depth().push(REPO),
      publish: () => depth().publish(REPO),
      pull: () => depth().pull(REPO),
      sync: () => depth().sync(REPO)
    };
    const syncs = ['push', 'publish', 'pull', 'sync'];
    for (const [name, verb] of Object.entries(verbs)) {
      auto = false;
      await change(true);
      const from = calls.length;
      void verb();
      await settle();
      // A network verb re-reads the remotes a second time, exactly as before.
      const want = syncs.includes(name) ? [...THE_FOUR, 'remotes'].sort() : THE_FOUR;
      expect(asked(from), name).toEqual(want);
      await drain();
    }
  });
});

describe('an older answer never lands over a newer one', () => {
  /** Two branches reads out at once: a move's, then a press's. */
  const two = async (): Promise<[Call, Call]> => {
    auto = false;
    await change(true);
    void depth().refresh(REPO);
    await settle();
    const [older, newer] = of('branches');
    for (const c of calls.filter((x) => x.method !== 'branches')) await c.answer();
    return [older!, newer!];
  };

  it('H10 an older answer changes nothing, in each of the three', async () => {
    auto = false;
    await change(true);
    void depth().refresh(REPO);
    await settle();
    const fresh = [{ name: 'new' }];
    const old = [{ name: 'old' }];
    const pair = (m: Method): [Call, Call] => [of(m)[0]!, of(m)[1]!];
    const [b1, b2] = pair('branches');
    await b2.answer(fresh);
    await b1.answer(old);
    const [rb1, rb2] = pair('remoteBranches');
    await rb2.answer({ branches: fresh, lastFetchedAt: 2 });
    await rb1.answer({ branches: old, lastFetchedAt: 1 });
    const [r1, r2] = pair('remotes');
    await r2.answer({ remotes: fresh, branch: 'main', upstream: 'new/main' });
    await r1.answer({ remotes: old, branch: 'main', upstream: 'old/main' });
    expect(repo().branches).toEqual(fresh);
    expect(repo().remoteBranches).toEqual(fresh);
    expect(repo().remotes).toEqual(fresh);
    expect(repo().upstream).toBe('new/main');
    await drain();
  });

  it('H10 an older failure after a newer answer owes nothing', async () => {
    const [older, newer] = await two();
    await newer.answer([{ name: 'new' }]);
    await older.refuse();
    await drain();
    auto = true;
    const from = calls.length;
    await change(false);
    expect(asked(from)).toEqual([]);
  });

  it('H10 an older answer after a newer failure is drawn and stays owed', async () => {
    const [older, newer] = await two();
    await newer.refuse();
    await older.answer([{ name: 'old' }]);
    expect(repo().branches).toEqual([{ name: 'old' }]);
    await drain();
    auto = true;
    const from = calls.length;
    await change(false);
    expect(asked(from)).toEqual(['branches']);
  });

  it('H11 an older file read changes nothing, landed or failed', async () => {
    for (const end of [
      (c: Call) => c.answer(page('old')),
      (c: Call) => c.refuse('old failure')
    ]) {
      auto = true;
      await openFileAgain();
      auto = false;
      calls = [];
      void depth().loadMoreFile(REPO, FILE);
      await settle();
      await change(true);
      const [older, newer] = filesAsked();
      await newer!.answer(page('new'));
      await end(older!);
      expect(win(FILE)?.rows?.[0]?.subject).toBe('new');
      expect(win(FILE)?.error).toBeNull();
      expect(win(FILE)?.loading).toBe(false);
      await drain();
    }
  });

  it('H11 a first file read that answers while a newer one is out still draws', async () => {
    auto = false;
    depth().ensureFile(REPO, FILE);
    await settle();
    await change(true);
    const [older, newer] = filesAsked();
    await older!.answer(page('first'));
    expect(win(FILE)?.rows?.[0]?.subject).toBe('first');
    await newer!.answer(page('second'));
    expect(win(FILE)?.rows?.[0]?.subject).toBe('second');
    await drain();
  });
});
