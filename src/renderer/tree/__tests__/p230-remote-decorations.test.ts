/**
 * Phase 230. The Explorer's decorations for a folder on a machine.
 *
 * THE PHASE 90.3 GUARD IS NOT LOOSENED. Decorating a remote tree with THIS
 * Mac's status was the wrong machine defect that phase removed, and every
 * test below keeps it: the remote tree's lane is fed from the remote Changes
 * store's entry for that machine and folder (scm/remote-changes.ts,
 * `remoteStatusFilesOf`) and from nothing else. Research 89 section 4.5 took
 * the parent reading on his Mac Pro: `NOTES-untracked.md` carried a
 * `data-item-git-status` of null on all nine rows of the remote tree while
 * the local row read `untracked` with a U.
 *
 * Three things are proved. The mapper folds that machine's own porcelain into
 * the shape the tree's git lane reads, rebased onto the tab's folder, with
 * nothing before the first good read and nothing for a plain folder. The
 * store's `reread` reads the same door as `refresh` and clears none of the
 * write sentences, because the Explorer's re-read is not a press of Refresh.
 * And the two components carry the guard by SOURCE: FilesSection's remote
 * branch reads `remoteStatusFilesOf` and never the `statusFiles` prop, and
 * Sidebar's selector still answers null for a target with no local path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GitFileStatus } from '@shared/types';

const reviewFiles = vi.fn();
const stage = vi.fn();

vi.stubGlobal('window', {
  gmux: { machines: { reviewFiles, stage } }
});

const { remoteChangesOf, remoteStatusFilesOf, useRemoteChanges } =
  await import('../../scm/remote-changes');
const { pierreGitStatus, treeGitLane } = await import('../decorations');

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const INSIDE = { machineId: 'studio', path: '/home/greg/api/packages/web' };

function answer(over: Record<string, unknown> = {}): unknown {
  return {
    machineId: 'studio',
    machineLabel: 'Studio',
    repoPath: '/home/greg/api',
    headSha: '01167eb9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9',
    files: [
      {
        path: 'src/auth.ts',
        origPath: null,
        status: 'M',
        indexState: '.',
        worktreeState: 'M'
      },
      {
        path: 'packages/web/app.tsx',
        origPath: 'packages/web/old.tsx',
        status: 'R',
        indexState: 'R',
        worktreeState: '.'
      },
      {
        path: 'packages/web/moved-in.ts',
        origPath: 'lib/moved-out.ts',
        status: 'R',
        indexState: 'R',
        worktreeState: '.'
      }
    ],
    total: 3,
    untracked: [
      {
        path: 'NOTES-untracked.md',
        origPath: null,
        status: '?',
        indexState: '?',
        worktreeState: '?'
      },
      {
        path: 'packages/web/new.css',
        origPath: null,
        status: '?',
        indexState: '?',
        worktreeState: '?'
      }
    ],
    untrackedTotal: 2,
    note: null,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteChanges.setState({ byTarget: {} });
  reviewFiles.mockReset();
  reviewFiles.mockResolvedValue(answer());
  stage.mockReset();
});

const entryOf = (target: { machineId: string; path: string }) =>
  remoteChangesOf(useRemoteChanges.getState().byTarget, target);

describe('the mapper, over the store\'s own entry', () => {
  it('draws nothing before the first good read', () => {
    expect(remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path)).toEqual([]);
  });

  it('folds tracked and untracked rows into the lane\'s shape at the repository root', async () => {
    await useRemoteChanges.getState().refresh(STUDIO);
    const files = remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path);
    expect(files).toEqual<GitFileStatus[]>([
      { path: 'src/auth.ts', indexState: '.', worktreeState: 'M' },
      {
        path: 'packages/web/app.tsx',
        origPath: 'packages/web/old.tsx',
        indexState: 'R',
        worktreeState: '.'
      },
      {
        path: 'packages/web/moved-in.ts',
        origPath: 'lib/moved-out.ts',
        indexState: 'R',
        worktreeState: '.'
      },
      { path: 'NOTES-untracked.md', indexState: '?', worktreeState: '?' },
      { path: 'packages/web/new.css', indexState: '?', worktreeState: '?' }
    ]);
    // The U the local row carries, through the same lane the local tree
    // feeds, and the M and the rename beside it.
    const lane = treeGitLane(files, []);
    const byPath = new Map(lane.entries.map((e) => [e.path, e.status]));
    expect(byPath.get('NOTES-untracked.md')).toBe('untracked');
    expect(byPath.get('src/auth.ts')).toBe('modified');
    expect(byPath.get('packages/web/app.tsx')).toBe('renamed');
    expect(pierreGitStatus(files[3])).toBe('untracked');
  });

  it('rebases the paths onto a tab opened inside the repository, and drops the rest', async () => {
    await useRemoteChanges.getState().refresh(INSIDE);
    const files = remoteStatusFilesOf(entryOf(INSIDE), INSIDE.path);
    expect(files).toEqual<GitFileStatus[]>([
      // The old name is inside the folder too, so the rename keeps it.
      {
        path: 'app.tsx',
        origPath: 'old.tsx',
        indexState: 'R',
        worktreeState: '.'
      },
      // The old name is outside the folder, so the tree has no row for it
      // and the rename is drawn with no old name.
      { path: 'moved-in.ts', indexState: 'R', worktreeState: '.' },
      { path: 'new.css', indexState: '?', worktreeState: '?' }
    ]);
  });

  it('draws nothing for a plain folder, and nothing for a folder outside the root main named', async () => {
    reviewFiles.mockResolvedValue(
      answer({ repoPath: '', files: [], total: 0, untracked: [], untrackedTotal: 0 })
    );
    await useRemoteChanges.getState().refresh(STUDIO);
    expect(entryOf(STUDIO).notRepo).toBe(true);
    expect(remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path)).toEqual([]);

    reviewFiles.mockResolvedValue(answer({ repoPath: '/home/greg/elsewhere' }));
    await useRemoteChanges.getState().refresh(STUDIO);
    expect(remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path)).toEqual([]);
    // A sibling whose name merely starts with the root's name is outside it.
    reviewFiles.mockResolvedValue(answer({ repoPath: '/home/greg/ap' }));
    await useRemoteChanges.getState().refresh(STUDIO);
    expect(remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path)).toEqual([]);
  });

  it('keeps the last good rows under a refused re-read, which is what the tree keeps drawing', async () => {
    await useRemoteChanges.getState().refresh(STUDIO);
    reviewFiles.mockRejectedValueOnce(new Error('no'));
    await useRemoteChanges.getState().refresh(STUDIO);
    expect(entryOf(STUDIO).failed).toBe(true);
    expect(remoteStatusFilesOf(entryOf(STUDIO), STUDIO.path)).toHaveLength(5);
  });
});

describe('reread, the Explorer\'s read of the same entry', () => {
  it('reads the same door as refresh and leaves the write sentences alone', async () => {
    await useRemoteChanges.getState().refresh(STUDIO);
    // A stage left its outcome beside the rows.
    stage.mockResolvedValue({
      outcome: 'done',
      paths: 1,
      chunks: 1,
      repoPath: '/home/greg/api',
      writeRoot: '/home/greg',
      machineSaid: null,
      readMs: 40,
      tookMs: 90
    });
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    await flush();
    expect(entryOf(STUDIO).writeVerb).toBe('stage');
    expect(entryOf(STUDIO).writeOutcome).toBe('done');
    const before = reviewFiles.mock.calls.length;

    await useRemoteChanges.getState().reread(STUDIO);
    expect(reviewFiles.mock.calls.length).toBe(before + 1);
    expect(reviewFiles.mock.calls[before]?.[0]).toEqual({
      machineId: 'studio',
      cwd: '/home/greg/api'
    });
    // Not a press of Refresh: the sentence stays.
    expect(entryOf(STUDIO).writeVerb).toBe('stage');
    expect(entryOf(STUDIO).writeOutcome).toBe('done');

    await useRemoteChanges.getState().refresh(STUDIO);
    expect(entryOf(STUDIO).writeVerb).toBeNull();
  });
});

/** The text with every comment removed, so a record cannot read as code. */
function withoutComments(text: string): string {
  return text
    .replace(/(^|[\s{(=,;])\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

const ROOT = resolve(import.meta.dirname, '../../../..');
const read = (rel: string): string =>
  withoutComments(readFileSync(resolve(ROOT, rel), 'utf8'));

describe('the guard, read from the source', () => {
  it('feeds the remote tree from the remote store and never from the prop or this Mac', () => {
    const src = read('src/renderer/tree/FilesSection.tsx');
    // The remote branch of the body is the one that passes `remote={remote}`.
    const remoteBranch = src.slice(
      src.indexOf('remote={remote}'),
      src.indexOf('isRepo={false}')
    );
    expect(remoteBranch).toContain('statusFiles={remoteStatusFiles}');
    expect(remoteBranch).not.toContain('statusFiles={statusFiles');
    expect(remoteBranch).not.toContain('storeFiles');
    // The list is composed from the remote store's entry for the target.
    expect(src).toMatch(/remoteStatusFilesOf\(remoteEntry, target\.path\)/);
    expect(src).toMatch(/useRemoteChanges\(\(s\) =>/);
    // And the store is asked once for a target it has never read.
    expect(src).toMatch(/useRemoteChanges\.getState\(\)\.ensure\(target\)/);
  });

  it('keeps Sidebar answering null for a target with no local path', () => {
    const src = read('src/renderer/app/Sidebar.tsx');
    expect(src).toContain('if (localRepoPath === null) return null;');
    expect(src).not.toContain('useRemoteChanges');
  });

  it('re-reads the decorations after the Explorer\'s own write, beside the rows', () => {
    const src = read('src/renderer/tree/use-tree-rename.ts');
    expect(src).toMatch(
      /useRemoteChanges\s*\.getState\(\)\s*\.reread\(workspaceTarget\(rootPath, machineId\)\)/
    );
    expect(src).not.toContain('.refresh(workspaceTarget');
    expect((src.match(/refreshRemoteTree\(rootPath, machineId\)/g) ?? []).length).toBe(2);
  });

  it('can fail: the scan sees a branch fed from the prop', () => {
    const planted =
      'remote={remote}\nstatusFiles={statusFiles ?? storeFiles}\nisRepo={false}';
    const remoteBranch = planted.slice(
      planted.indexOf('remote={remote}'),
      planted.indexOf('isRepo={false}')
    );
    expect(remoteBranch).toContain('statusFiles={statusFiles');
  });
});
