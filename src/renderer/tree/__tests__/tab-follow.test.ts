/**
 * A rename must carry the open editor tab with it.
 *
 * The failure this guards is quiet and expensive: tab identity IS the
 * absolute path, so a tab left on the old name gets marked deleted by the
 * watcher, writes the file back into existence on ⌘S, and lets the tree open
 * a SECOND tab onto the same bytes. Each of those is a data-loss shape, so
 * the planner is pinned here rather than checked by hand.
 */

import { describe, expect, it } from 'vitest';
import type { EditorTab } from '../../editor/store';
import { pathAfterMove, planTabFollow, retargetTab } from '../tab-follow';

/**
 * A tab with only the fields these rules read. Cast rather than spelled in
 * full: the editor stream keeps adding presentation flags (markdown, image,
 * svg…) and a fixture that has to list them all would fail for reasons that
 * have nothing to do with following a rename.
 */
function tab(overrides: Partial<EditorTab> & { path: string }): EditorTab {
  const name = overrides.path.slice(overrides.path.lastIndexOf('/') + 1);
  return {
    id: overrides.path,
    relPath: overrides.path.replace('/proj/', ''),
    origRelPath: null,
    repoPath: '/proj',
    name,
    mode: 'file',
    canDiff: false,
    markdown: false,
    // Phase 12.10 presentation flags. Spelled out because a `Partial`
    // override makes each one `boolean | undefined`, which no cast can
    // reconcile with the required field.
    image: false,
    svg: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: '',
    headContents: null,
    lastUsed: 0,
    ...overrides
  } as EditorTab;
}

describe('which tabs a move touches', () => {
  it('matches a file move exactly', () => {
    const move = { from: '/proj/a.ts', to: '/proj/b.ts', kind: 'file' as const };
    expect(pathAfterMove('/proj/a.ts', move)).toBe('/proj/b.ts');
    expect(pathAfterMove('/proj/a.ts.bak', move)).toBeNull();
  });

  it('carries a folder move over every descendant', () => {
    const move = { from: '/proj/src', to: '/proj/lib', kind: 'dir' as const };
    expect(pathAfterMove('/proj/src/deep/a.ts', move)).toBe(
      '/proj/lib/deep/a.ts'
    );
    expect(pathAfterMove('/proj/srcs/a.ts', move)).toBeNull();
  });
});

describe('retargeting one tab', () => {
  it('rewrites identity, path, relPath and the label together', () => {
    const next = retargetTab(tab({ path: '/proj/src/a.ts' }), '/proj/lib/b.ts');
    expect(next.id).toBe('/proj/lib/b.ts');
    expect(next.path).toBe('/proj/lib/b.ts');
    expect(next.relPath).toBe('lib/b.ts');
    expect(next.name).toBe('b.ts');
  });

  it('keeps the diff pointed at the pre-rename path in HEAD', () => {
    // git only learns about the rename once it is staged; `git show
    // HEAD:<new path>` would come back empty and read as a whole-file add.
    const next = retargetTab(
      tab({ path: '/proj/a.ts', canDiff: true }),
      '/proj/b.ts'
    );
    expect(next.origRelPath).toBe('a.ts');
  });

  it('does not invent an origRelPath for an untracked file', () => {
    const next = retargetTab(
      tab({ path: '/proj/a.ts', canDiff: false }),
      '/proj/b.ts'
    );
    expect(next.origRelPath).toBeNull();
  });

  it('preserves the buffer state a rename has no business touching', () => {
    const next = retargetTab(
      tab({ path: '/proj/a.ts', dirty: true, savedContents: 'x' }),
      '/proj/b.ts'
    );
    expect(next.dirty).toBe(true);
    expect(next.savedContents).toBe('x');
  });
});

describe('planning the whole tab list', () => {
  it('follows the moved tab and reports the model rekey', () => {
    const tabs = [tab({ path: '/proj/a.ts' }), tab({ path: '/proj/keep.ts' })];
    const plan = planTabFollow(tabs, [
      { from: '/proj/a.ts', to: '/proj/b.ts', kind: 'file' }
    ]);
    expect(plan.tabs.map((t) => t.id)).toEqual(['/proj/b.ts', '/proj/keep.ts']);
    expect(plan.rekeys).toEqual([{ from: '/proj/a.ts', to: '/proj/b.ts' }]);
  });

  it('never touches a history tab — its bytes are in the object database', () => {
    const tabs = [
      tab({
        path: '/proj/a.ts',
        id: 'abc123:a.ts',
        commit: { sha: 'abc123', subject: 's' } as EditorTab['commit']
      })
    ];
    const plan = planTabFollow(tabs, [
      { from: '/proj/a.ts', to: '/proj/b.ts', kind: 'file' }
    ]);
    expect(plan.rekeys).toEqual([]);
    expect(plan.tabs[0]?.id).toBe('abc123:a.ts');
  });

  it('drops the tab a confirmed overwrite displaced, keeping the arrival', () => {
    // Moving a.ts onto b.ts with Replace sends the old b.ts to the Trash.
    const tabs = [
      tab({ path: '/proj/a.ts', savedContents: 'arriving' }),
      tab({ path: '/proj/b.ts', savedContents: 'displaced' })
    ];
    const plan = planTabFollow(tabs, [
      { from: '/proj/a.ts', to: '/proj/b.ts', kind: 'file' }
    ]);
    expect(plan.tabs).toHaveLength(1);
    expect(plan.tabs[0]?.id).toBe('/proj/b.ts');
    expect(plan.tabs[0]?.savedContents).toBe('arriving');
  });

  it('carries every descendant tab of a folder move', () => {
    const tabs = [
      tab({ path: '/proj/src/a.ts' }),
      tab({ path: '/proj/src/deep/b.ts' }),
      tab({ path: '/proj/other.ts' })
    ];
    const plan = planTabFollow(tabs, [
      { from: '/proj/src', to: '/proj/lib', kind: 'dir' }
    ]);
    expect(plan.tabs.map((t) => t.id)).toEqual([
      '/proj/lib/a.ts',
      '/proj/lib/deep/b.ts',
      '/proj/other.ts'
    ]);
  });

  it('is a no-op when nothing open was moved', () => {
    const tabs = [tab({ path: '/proj/other.ts' })];
    const plan = planTabFollow(tabs, [
      { from: '/proj/a.ts', to: '/proj/b.ts', kind: 'file' }
    ]);
    expect(plan.rekeys).toEqual([]);
  });
});
