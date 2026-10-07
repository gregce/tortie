/**
 * PHASE 343, RULE 6. Git is never asked about a path past a link, and a link
 * row is still asked as it was when it was drawn as a leaf.
 *
 * Git stops at a link. Handed any path under one, or a link spelled as a
 * folder (`.venv/`), `git check-ignore` exits 128 and the service answers `[]`
 * for the WHOLE batch (measured, A8). The fake below does exactly that, so a
 * store that asks one such path loses every answer in that batch. An ordinary
 * sync merges, which hides it; the revalidation REPLACES, and without this rule
 * the first one after any change undims the whole tree, `node_modules`
 * included (measured through the shipping store with real git, A4). With the
 * rule, all eight paths P1 measured stay dimmed across a revalidation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget } from '@shared/workspace-target';
import type { GitFileStatus } from '@shared/types';

/** What git calls ignored when asked in the spelling it understands. */
const TRUTH = new Set([
  'node_modules/',
  'node_modules/pkgb',
  'ignored.log',
  '.venv',
  'bazel-out'
]);

/** The links the tree drew as folders. */
const LINK_FOLDERS: ReadonlySet<string> = new Set([
  '.venv/',
  'bazel-out/',
  'node_modules/pkgb/',
  '.claude/skills/',
  'src/linkIgnored/'
]);

/** Every ask that reached the fake, in order. */
let asks: string[][] = [];

/**
 * A stand-in for `git check-ignore -z --stdin` behind main's service: a batch
 * holding a folder-spelled link or a path past a link is git's exit 128, which
 * the service maps to `[]` for everything in it.
 */
async function checkIgnore(input: {
  repoPath: string;
  paths: string[];
}): Promise<string[]> {
  asks.push([...input.paths]);
  const beyondALink = input.paths.some(
    (path) =>
      LINK_FOLDERS.has(path) ||
      [...LINK_FOLDERS].some((link) => path.startsWith(link))
  );
  if (beyondALink) return [];
  return input.paths.filter((path) => TRUTH.has(path));
}

vi.stubGlobal('window', { gmux: { git: { checkIgnore } } });

const { canonicalAnswer, coveredByIgnored, pathsToAsk, useTreeIgnored } =
  await import('../ignored');
const { treeGitLane } = await import('../decorations');

const REPO = localTarget('/repo');
const NONE: ReadonlySet<string> = new Set<string>();

/** The tree with `.claude/skills`, `src/linkIgnored` and pnpm's package open. */
const LOADED = [
  '.agent/',
  '.claude/',
  '.claude/skills/',
  '.claude/skills/notes.md',
  '.venv/',
  '.venv/secret.txt',
  'bazel-out/',
  'bazel-out/x.txt',
  'ignored.log',
  'node_modules/',
  'node_modules/pkgb/',
  'node_modules/pkgb/b.js',
  'src/',
  'src/index.ts',
  'src/linkIgnored/',
  'src/linkIgnored/i.js'
];

/** P1's eight, measured with real git over the attack's repository. */
const DIMMED = [
  '.venv/',
  '.venv/secret.txt',
  'bazel-out/',
  'bazel-out/x.txt',
  'ignored.log',
  'node_modules/',
  'node_modules/pkgb/',
  'node_modules/pkgb/b.js'
];

const store = (): ReturnType<typeof useTreeIgnored.getState> =>
  useTreeIgnored.getState();
const shown = (): string[] => [...store().ignored].sort();

beforeEach(() => {
  store().reset();
  asks = [];
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 60_000);
});

describe('pathsToAsk with links', () => {
  it('sends a link row in its LEAF spelling, never as a folder', () => {
    const ask = pathsToAsk(LOADED, NONE, NONE, LINK_FOLDERS);
    expect(ask).toContain('.venv');
    expect(ask).toContain('bazel-out');
    expect(ask).toContain('.claude/skills');
    expect(ask).toContain('node_modules/pkgb');
    for (const link of LINK_FOLDERS) expect(ask).not.toContain(link);
  });

  it('sends nothing under a link', () => {
    const ask = pathsToAsk(LOADED, NONE, NONE, LINK_FOLDERS);
    for (const under of [
      '.venv/secret.txt',
      'bazel-out/x.txt',
      '.claude/skills/notes.md',
      'node_modules/pkgb/b.js',
      'src/linkIgnored/i.js'
    ]) {
      expect(ask).not.toContain(under);
    }
    // Ordinary paths beside them are still asked.
    expect(ask).toContain('src/index.ts');
    expect(ask).toContain('node_modules/');
  });

  it('compares `answered` in the canonical spelling', () => {
    const ask = pathsToAsk(
      LOADED,
      NONE,
      new Set(['.venv/', 'bazel-out/']),
      LINK_FOLDERS
    );
    expect(ask).not.toContain('.venv');
    expect(ask).not.toContain('bazel-out');
  });

  it('keys an answer back onto the folder spelling, and nothing else', () => {
    expect(canonicalAnswer('.venv', LINK_FOLDERS)).toBe('.venv/');
    expect(canonicalAnswer('ignored.log', LINK_FOLDERS)).toBe('ignored.log');
    expect(canonicalAnswer('node_modules/', LINK_FOLDERS)).toBe('node_modules/');
  });

  it('a hit on the folder spelling covers the rows under an ignored link', () => {
    expect(
      coveredByIgnored(['.venv/secret.txt', 'src/index.ts'], new Set(['.venv/']))
    ).toEqual(['.venv/secret.txt']);
  });
});

describe('the store, with a fake git that exits 128 past a link', () => {
  it('dims all eight on the ordinary sync, and asks git nothing it would refuse', async () => {
    await store().sync(REPO, LOADED, LINK_FOLDERS);
    expect(shown()).toEqual(DIMMED);
    for (const batch of asks) {
      for (const path of batch) {
        expect(LINK_FOLDERS.has(path)).toBe(false);
      }
    }
  });

  it('KEEPS all eight across a revalidation (the arm that replaces the set)', async () => {
    await store().sync(REPO, LOADED, LINK_FOLDERS);
    expect(shown()).toEqual(DIMMED);
    store().invalidate();
    asks = [];
    await store().sync(REPO, LOADED, LINK_FOLDERS);
    // The revalidation arm really ran: it asked again, from nothing.
    expect(asks).toHaveLength(1);
    expect(asks[0]).toContain('.venv');
    expect(asks[0]).not.toContain('.venv/secret.txt');
    expect(shown()).toEqual(DIMMED);
  });

  it('leaves the rows under a link git does not ignore undimmed', async () => {
    await store().sync(REPO, LOADED, LINK_FOLDERS);
    expect(shown()).not.toContain('.claude/skills/');
    expect(shown()).not.toContain('.claude/skills/notes.md');
    expect(shown()).not.toContain('src/linkIgnored/');
    expect(shown()).not.toContain('src/linkIgnored/i.js');
  });

  it('a later listing does not re-ask a link already answered as a folder', async () => {
    await store().sync(REPO, LOADED, LINK_FOLDERS);
    asks = [];
    await store().sync(REPO, [...LOADED, 'src/new.ts'], LINK_FOLDERS);
    expect(asks).toEqual([['src/new.ts']]);
  });
});

describe('the git lane with links', () => {
  const status = (
    path: string,
    indexState: string,
    worktreeState: string
  ): GitFileStatus => ({ path, indexState, worktreeState }) as GitFileStatus;

  it("keys git's file row for a link onto the folder row the tree draws", () => {
    const lane = treeGitLane(
      [status('newLink', '?', '?'), status('src/a.ts', '.', 'M')],
      [],
      new Set(['newLink/'])
    );
    expect(lane.entries).toEqual([
      { path: 'newLink/', status: 'untracked' },
      { path: 'src/a.ts', status: 'modified' }
    ]);
    // The open-mode rule still asks by git's own spelling.
    expect(lane.byPath.get('newLink')?.worktreeState).toBe('?');
  });

  it('a conflicted link drawn as a folder keeps its overlay on that row', () => {
    const lane = treeGitLane(
      [status('newLink', 'U', 'U')],
      [],
      new Set(['newLink/'])
    );
    expect([...lane.conflicts]).toEqual(['newLink/']);
  });

  it('lets porcelain win over an ignored answer in either spelling', () => {
    const lane = treeGitLane(
      [status('newLink', '?', '?')],
      ['newLink/'],
      new Set(['newLink/'])
    );
    expect(lane.entries).toEqual([{ path: 'newLink/', status: 'untracked' }]);
  });

  it('leaves a link to a file, and every other row, as git spelled it', () => {
    const lane = treeGitLane(
      [status('linkFile', '?', '?')],
      [],
      new Set(['newLink/'])
    );
    expect(lane.entries).toEqual([{ path: 'linkFile', status: 'untracked' }]);
  });
});
