/**
 * PHASE 343. A linked folder on another machine opens to what is inside it,
 * and the Explorer keeps every row whatever that folder answers.
 *
 * The far `tree-list` passes `find -H` only for its own root, so a walk never
 * descends a link below it and marks every link it lists (`//` for a folder,
 * `///` for anything else; main reads them into `RemoteTreeEntry.link`). Two
 * pure rules turn that into the cache the tree reads, and four store rules
 * keep it honest:
 *
 *  - the cut gives a link NO key, and (7.7) a folder at the walk's last level
 *    none either, so expanding either asks the machine once rather than
 *    opening empty and asking nothing;
 *  - the merge keeps every cached key at or under a link the answer names,
 *    because that walk never read it (M11: 1 row before a root Refresh, 0 after);
 *  - a walk that is not the tab's root never moves the tab's status or line;
 *  - never more than nine such walks at once, by a count and never a clock;
 *  - Refresh re-reads every opened link, and after the root lands every link
 *    it now names that was not read yet;
 *  - and, on this Mac, a link main could not answer for in time keeps the kind
 *    its folder's last listing gave it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget, workspaceTarget } from '@shared/workspace-target';
import type { RemoteTreeEntry, RemoteTreeListing } from '@shared/ipc';
import type { FsDirEntry, ReadDirResult } from '@shared/types';

const ROOT = '/far/proj';
const MACHINE = workspaceTarget(ROOT, 'mac-pro');

/** Every root that was asked for, in order. */
let asks: string[] = [];
/** What the fake machine answers for one root. */
let answers: Record<string, RemoteTreeListing> = {};
/** Roots whose answer is held until `release(root)`. */
let gated = new Set<string>();
const waiting = new Map<string, () => void>();
let inFlight = 0;
let mostInFlightBesideRoot = 0;

function listTree(input: { root: string }): Promise<RemoteTreeListing> {
  asks.push(input.root);
  const answer =
    answers[input.root] ?? { status: 'missing', root: input.root };
  const besideRoot = input.root !== ROOT;
  if (besideRoot) {
    inFlight += 1;
    mostInFlightBesideRoot = Math.max(mostInFlightBesideRoot, inFlight);
  }
  const done = (): RemoteTreeListing => {
    if (besideRoot) inFlight -= 1;
    return answer;
  };
  if (!gated.has(input.root)) return Promise.resolve().then(done);
  return new Promise((resolve) => {
    waiting.set(input.root, () => resolve(done()));
  });
}

function release(root: string): void {
  const go = waiting.get(root);
  waiting.delete(root);
  go?.();
}

/** The local half: one folder whose link answers once, then not in time. */
let localListings: ReadDirResult[] = [];
function readDir(dirPath: string): Promise<ReadDirResult> {
  const next = localListings.shift();
  return Promise.resolve(next ?? { path: dirPath, entries: [] });
}

vi.stubGlobal('window', {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  matchMedia: () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }),
  gmux: { machines: { listTree }, fs: { readDir } }
});

const { useFileTree, sortEntries, carryLinkTargets, REMOTE_EXTRA_READS } =
  await import('../store');
const { groupRemoteEntries, loadedLinkFolders, mergeRemoteGroups } =
  await import('../remote-plan');

const entry = (
  path: string,
  kind: 'dir' | 'file',
  link?: 'dir' | 'leaf'
): RemoteTreeEntry => (link === undefined ? { path, kind } : { path, kind, link });

const ok = (
  root: string,
  entries: readonly RemoteTreeEntry[],
  extra: Partial<{ total: number; truncated: boolean }> = {}
): RemoteTreeListing => ({
  status: 'ok',
  root,
  entries,
  total: extra.total ?? entries.length,
  truncated: extra.truncated ?? false,
  readAt: 1_700_000_000_000
});

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

beforeEach(() => {
  asks = [];
  gated = new Set();
  waiting.clear();
  inFlight = 0;
  mostInFlightBesideRoot = 0;
  answers = {
    [ROOT]: ok(ROOT, [
      entry(`${ROOT}/.claude`, 'dir'),
      entry(`${ROOT}/.claude/skills`, 'dir', 'dir'),
      entry(`${ROOT}/linkFile`, 'file', 'leaf'),
      entry(`${ROOT}/src`, 'dir'),
      entry(`${ROOT}/src/a.ts`, 'file'),
      entry(`${ROOT}/linkLocked`, 'dir', 'dir'),
      entry(`${ROOT}/linkFsRoot`, 'dir', 'dir')
    ]),
    [`${ROOT}/.claude/skills`]: ok(`${ROOT}/.claude/skills`, [
      entry(`${ROOT}/.claude/skills/a-skill`, 'dir'),
      entry(`${ROOT}/.claude/skills/notes.md`, 'file')
    ]),
    [`${ROOT}/linkLocked`]: { status: 'denied', root: `${ROOT}/linkLocked` },
    [`${ROOT}/linkFsRoot`]: ok(
      `${ROOT}/linkFsRoot`,
      [entry(`${ROOT}/linkFsRoot/etc`, 'dir', 'dir')],
      { total: 6710, truncated: true }
    )
  };
});

afterEach(async () => {
  for (const root of [...waiting.keys()]) release(root);
  await useFileTree.getState().setRoot(null);
});

// ---------------------------------------------------------------------------
// The cut and the merge (pure)
// ---------------------------------------------------------------------------

describe('the cut', () => {
  it('gives a far link to a folder NO key, and spells it as a local link', () => {
    const groups = groupRemoteEntries(
      ROOT,
      [entry(`${ROOT}/skills`, 'dir', 'dir'), entry(`${ROOT}/src`, 'dir')],
      3
    );
    expect(groups[`${ROOT}/skills`]).toBeUndefined();
    expect(groups[`${ROOT}/src`]).toEqual([]);
    expect(groups[ROOT]).toContainEqual({
      name: 'skills',
      path: `${ROOT}/skills`,
      kind: 'symlink',
      link: 'dir'
    });
  });

  it("gives a far leaf link today's leaf, with no field", () => {
    const groups = groupRemoteEntries(
      ROOT,
      [entry(`${ROOT}/linkFile`, 'file', 'leaf')],
      3
    );
    expect(groups[ROOT]).toEqual([
      { name: 'linkFile', path: `${ROOT}/linkFile`, kind: 'symlink' }
    ]);
  });

  it('reads an unmarked entry exactly as before', () => {
    const groups = groupRemoteEntries(ROOT, [entry(`${ROOT}/a.ts`, 'file')], 3);
    expect(groups[ROOT]).toEqual([
      { name: 'a.ts', path: `${ROOT}/a.ts`, kind: 'file' }
    ]);
  });

  it('7.7: a folder at the walk\'s last level gets no key; one above it does', () => {
    // A6's shape: `deep/a/b/c/d.txt` walked 3 deep lists `deep/a/b/c` and
    // nothing in it.
    const groups = groupRemoteEntries(
      ROOT,
      [
        entry(`${ROOT}/a`, 'dir'),
        entry(`${ROOT}/a/b`, 'dir'),
        entry(`${ROOT}/a/b/c`, 'dir')
      ],
      3
    );
    expect(groups[`${ROOT}/a/b/c`]).toBeUndefined();
    expect(groups[`${ROOT}/a/b`]?.map((one) => one.name)).toEqual(['c']);
    expect(groups[`${ROOT}/a`]).toBeDefined();
  });
});

describe('the merge', () => {
  it("keeps an opened link's rows across a root answer (M11: 1 row, then 1)", () => {
    const cache = {
      [ROOT]: [
        {
          name: 'skills',
          path: `${ROOT}/skills`,
          kind: 'symlink' as const,
          link: 'dir' as const
        }
      ],
      [`${ROOT}/skills`]: [
        { name: 'notes.md', path: `${ROOT}/skills/notes.md`, kind: 'file' as const }
      ],
      [`${ROOT}/skills/sub`]: [
        { name: 'x', path: `${ROOT}/skills/sub/x`, kind: 'file' as const }
      ]
    };
    const groups = groupRemoteEntries(
      ROOT,
      [entry(`${ROOT}/skills`, 'dir', 'dir')],
      3
    );
    const next = mergeRemoteGroups(cache, ROOT, 3, groups);
    expect(next[`${ROOT}/skills`]).toHaveLength(1);
    expect(next[`${ROOT}/skills/sub`]).toHaveLength(1);
  });

  it('still empties a covered folder that is not a link', () => {
    const cache = {
      [`${ROOT}/src`]: [
        { name: 'gone.ts', path: `${ROOT}/src/gone.ts`, kind: 'file' as const }
      ]
    };
    const next = mergeRemoteGroups(cache, ROOT, 3, {
      [ROOT]: [{ name: 'src', path: `${ROOT}/src`, kind: 'dir' }]
    });
    expect(next[`${ROOT}/src`]).toEqual([]);
  });

  it('names every opened link drawn as a folder, once', () => {
    const cache: Record<string, FsDirEntry[]> = {
      [ROOT]: [
        { name: 'a', path: `${ROOT}/a`, kind: 'symlink', link: 'dir' },
        { name: 'b', path: `${ROOT}/b`, kind: 'symlink', link: 'dir' },
        { name: 'f', path: `${ROOT}/f`, kind: 'symlink' }
      ],
      [`${ROOT}/a`]: [
        { name: 'c', path: `${ROOT}/a/c`, kind: 'symlink', link: 'dir' }
      ],
      [`${ROOT}/a/c`]: []
    };
    // `b` was never opened (no key), `f` is a leaf.
    expect(loadedLinkFolders(cache)).toEqual([`${ROOT}/a`, `${ROOT}/a/c`]);
  });
});

// ---------------------------------------------------------------------------
// The store over a scripted machine
// ---------------------------------------------------------------------------

describe('a walk that is not the root never moves the tab', () => {
  it('opens a far link with ONE call rooted at the link', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    asks = [];
    await useFileTree.getState().loadDir(`${ROOT}/.claude/skills`);
    expect(asks).toEqual([`${ROOT}/.claude/skills`]);
    expect(
      useFileTree
        .getState()
        .entriesByDir[`${ROOT}/.claude/skills`]?.map((one) => one.name)
    ).toEqual(['a-skill', 'notes.md']);
  });

  it('a denied link leaves the tab exactly as it was, and that folder unlisted', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    const before = useFileTree.getState().remote;
    await useFileTree.getState().loadDir(`${ROOT}/linkLocked`);
    expect(useFileTree.getState().remote).toEqual(before);
    expect(useFileTree.getState().remote?.status).toBe('ok');
    expect(
      useFileTree.getState().entriesByDir[`${ROOT}/linkLocked`]
    ).toBeUndefined();
    expect(useFileTree.getState().entriesByDir[ROOT]?.length).toBe(5);
  });

  it('a link whose target went away (missing) leaves the tab as it was', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    const before = useFileTree.getState().remote;
    answers[`${ROOT}/.claude/skills`] = {
      status: 'missing',
      root: `${ROOT}/.claude/skills`
    };
    await useFileTree.getState().loadDir(`${ROOT}/.claude/skills`);
    expect(useFileTree.getState().remote).toEqual(before);
  });

  it("a capped walk of a link to / is not announced: the line is the root's", async () => {
    await useFileTree.getState().setRoot(MACHINE);
    const before = useFileTree.getState().remote;
    await useFileTree.getState().loadDir(`${ROOT}/linkFsRoot`);
    expect(useFileTree.getState().remote).toEqual(before);
    expect(useFileTree.getState().remote?.truncated).toBe(false);
    expect(
      useFileTree.getState().entriesByDir[`${ROOT}/linkFsRoot`]
    ).toHaveLength(1);
  });

  it('the ROOT still says what it said: a denied root is the tab\'s refusal', async () => {
    answers = { [ROOT]: { status: 'denied', root: ROOT } };
    await useFileTree.getState().setRoot(MACHINE);
    expect(useFileTree.getState().remote?.status).toBe('denied');
  });
});

describe('never more than nine walks beside the root, by a count', () => {
  const tenLinks = (): string[] =>
    Array.from({ length: 10 }, (_, i) => `${ROOT}/ten/l${i}`);

  beforeEach(() => {
    answers[ROOT] = ok(ROOT, [
      entry(`${ROOT}/ten`, 'dir'),
      ...tenLinks().map((path) => entry(path, 'dir', 'dir'))
    ]);
    for (const path of tenLinks()) {
      answers[path] = ok(path, [entry(`${path}/x.md`, 'file')]);
    }
  });

  it('holds the tenth until one of nine ends, then starts it', async () => {
    expect(REMOTE_EXTRA_READS).toBe(9);
    await useFileTree.getState().setRoot(MACHINE);
    asks = [];
    gated = new Set(tenLinks());
    const loads = tenLinks().map((path) =>
      useFileTree.getState().loadDir(path)
    );
    await settle();
    expect(asks).toHaveLength(9);
    expect(mostInFlightBesideRoot).toBe(9);
    release(`${ROOT}/ten/l0`);
    await settle();
    expect(asks).toHaveLength(10);
    expect(asks[9]).toBe(`${ROOT}/ten/l9`);
    for (const path of tenLinks()) release(path);
    await Promise.all(loads);
    expect(mostInFlightBesideRoot).toBe(9);
  });

  it('drops a waiting lazy load that a walk has covered since', async () => {
    // `ten/l0` is a link whose own walk lists a REAL folder `inner`, so a
    // walk of l0 covers `l0/inner`, which a lazy load is waiting to read.
    answers[`${ROOT}/ten/l0`] = ok(`${ROOT}/ten/l0`, [
      entry(`${ROOT}/ten/l0/inner`, 'dir'),
      entry(`${ROOT}/ten/l0/inner/y.md`, 'file')
    ]);
    await useFileTree.getState().setRoot(MACHINE);
    asks = [];
    gated = new Set(tenLinks());
    const loads = tenLinks().map((path) =>
      useFileTree.getState().loadDir(path)
    );
    const waitingLoad = useFileTree.getState().loadDir(`${ROOT}/ten/l0/inner`);
    await settle();
    expect(asks).toHaveLength(9);
    release(`${ROOT}/ten/l0`);
    await settle();
    // l0's answer covered `l0/inner`, so its waiting load was dropped and the
    // freed place went to the next in line, l9.
    for (const path of tenLinks()) release(path);
    await Promise.all([...loads, waitingLoad]);
    expect(asks).not.toContain(`${ROOT}/ten/l0/inner`);
    expect(asks).toContain(`${ROOT}/ten/l9`);
  });

  it('pointing the tree at another folder drops every waiter', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    asks = [];
    gated = new Set(tenLinks());
    const loads = tenLinks().map((path) =>
      useFileTree.getState().loadDir(path)
    );
    await settle();
    expect(asks).toHaveLength(9);
    let tenthSettled = false;
    void loads[9]?.then(() => {
      tenthSettled = true;
    });
    await useFileTree.getState().setRoot(localTarget('/elsewhere'));
    await settle();
    // The waiter is let go at once, while the nine before it are still out.
    expect(tenthSettled).toBe(true);
    for (const path of tenLinks()) release(path);
    await Promise.all(loads);
    expect(asks).not.toContain(`${ROOT}/ten/l9`);
  });
});

describe('Refresh re-reads the opened links', () => {
  it('costs the root plus one with one link open, and keeps its rows', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    await useFileTree.getState().loadDir(`${ROOT}/.claude/skills`);
    asks = [];
    answers[`${ROOT}/.claude/skills`] = ok(`${ROOT}/.claude/skills`, [
      entry(`${ROOT}/.claude/skills/notes.md`, 'file'),
      entry(`${ROOT}/.claude/skills/fresh.md`, 'file')
    ]);
    await useFileTree.getState().refreshLoaded();
    expect([...asks].sort()).toEqual([ROOT, `${ROOT}/.claude/skills`].sort());
    expect(
      useFileTree
        .getState()
        .entriesByDir[`${ROOT}/.claude/skills`]?.map((one) => one.name)
        .sort()
    ).toEqual(['fresh.md', 'notes.md']);
  });

  it('costs the root alone with no link open, as before', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    asks = [];
    await useFileTree.getState().refreshLoaded();
    expect(asks).toEqual([ROOT]);
  });

  it('walks a real folder replaced by a link once the root has landed', async () => {
    await useFileTree.getState().setRoot(MACHINE);
    // `src` was a real folder with a cached key.
    expect(useFileTree.getState().entriesByDir[`${ROOT}/src`]).toBeDefined();
    // Now it is a link to another folder.
    answers[ROOT] = ok(ROOT, [entry(`${ROOT}/src`, 'dir', 'dir')]);
    answers[`${ROOT}/src`] = ok(`${ROOT}/src`, [
      entry(`${ROOT}/src/elsewhere.md`, 'file')
    ]);
    asks = [];
    await useFileTree.getState().refreshLoaded();
    expect(asks).toEqual([ROOT, `${ROOT}/src`]);
    expect(
      useFileTree.getState().entriesByDir[`${ROOT}/src`]?.map((one) => one.name)
    ).toEqual(['elsewhere.md']);
  });
});

// ---------------------------------------------------------------------------
// This Mac
// ---------------------------------------------------------------------------

describe('a link main could not answer for in time (D4, this Mac)', () => {
  it('keeps the kind its folder last had, so an open link does not collapse', async () => {
    const first: FsDirEntry[] = [
      { name: 'skills', path: '/mac/proj/skills', kind: 'symlink', link: 'dir' }
    ];
    const slow: FsDirEntry[] = [
      { name: 'skills', path: '/mac/proj/skills', kind: 'symlink' }
    ];
    localListings = [
      { path: '/mac/proj', entries: first },
      { path: '/mac/proj', entries: slow }
    ];
    await useFileTree.getState().setRoot(localTarget('/mac/proj'));
    expect(useFileTree.getState().entriesByDir['/mac/proj']?.[0]?.link).toBe(
      'dir'
    );
    await useFileTree.getState().refreshLoaded();
    expect(useFileTree.getState().entriesByDir['/mac/proj']?.[0]?.link).toBe(
      'dir'
    );
  });

  it('carries only a link the same name had, and never invents one', () => {
    const next: FsDirEntry[] = [
      { name: 'a', path: '/p/a', kind: 'symlink' },
      { name: 'b', path: '/p/b', kind: 'symlink' },
      { name: 'c', path: '/p/c', kind: 'symlink', link: 'none' }
    ];
    const previous: FsDirEntry[] = [
      { name: 'a', path: '/p/a', kind: 'symlink', link: 'dir' },
      { name: 'c', path: '/p/c', kind: 'symlink', link: 'dir' }
    ];
    expect(carryLinkTargets(next, previous)).toEqual([
      { name: 'a', path: '/p/a', kind: 'symlink', link: 'dir' },
      { name: 'b', path: '/p/b', kind: 'symlink' },
      // An answered link keeps its own answer.
      { name: 'c', path: '/p/c', kind: 'symlink', link: 'none' }
    ]);
  });

  it('sorts a link to a folder with the folders', () => {
    const sorted = sortEntries([
      { name: 'b.txt', path: '/p/b.txt', kind: 'file' },
      { name: 'z', path: '/p/z', kind: 'symlink', link: 'dir' },
      { name: 'a', path: '/p/a', kind: 'dir' },
      { name: 'l', path: '/p/l', kind: 'symlink', link: 'file' }
    ]);
    expect(sorted.map((one) => one.name)).toEqual(['a', 'z', 'b.txt', 'l']);
  });
});
