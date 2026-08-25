/**
 * Phase 155. What an import is allowed to tell the diff, driven through the
 * real verb.
 *
 * THE DEFECT. `applyImport` ended with a loop that put every imported path into
 * `fed`. `fed` is the diff's record of what the MODEL already holds, and an
 * import creates no model row: the function's own comment says the rows come
 * from the re-list it fires one line later. So the baseline claimed a row that
 * did not exist and the add arm, `!fed.has(path)`, could never emit it again.
 *
 * These tests count the baseline before and after a real `importPaths` call
 * against a mocked bridge and a fake model. On the parent commit the first one
 * fails with `dropped.md` sitting in the baseline.
 *
 * The two neighbouring verbs are here as the control. Create and duplicate DO
 * write the baseline, correctly, because each of them has a real model row to
 * pair it with, and a future round that "tidies up" this difference would
 * bring the defect straight back.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  importPaths: vi.fn(),
  duplicate: vi.fn(),
  toast: vi.fn(),
  setConfirm: vi.fn(),
  relist: vi.fn(),
  forgetUnder: vi.fn()
}));

vi.mock('../fs-ops-bridge', () => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rename: vi.fn(),
  duplicate: h.duplicate,
  move: vi.fn(),
  trash: vi.fn(),
  importPaths: h.importPaths,
  canMutate: () => true,
  canDuplicate: () => true,
  canImport: () => true
}));

vi.mock('../../state/store', () => ({
  useApp: {
    getState: () => ({ toast: h.toast, setConfirm: h.setConfirm })
  },
  errorPayload: () => null,
  errorText: (err: unknown) => String(err)
}));

vi.mock('../store', () => ({
  useFileTree: {
    getState: () => ({ relist: h.relist, forgetUnder: h.forgetUnder })
  }
}));

vi.mock('../open-file', () => ({ requestOpenFile: vi.fn() }));
vi.mock('../editor-follow', () => ({ followMoves: vi.fn() }));
vi.mock('../tree-menu', () => ({
  describeConflicts: () => '',
  describeEntries: () => '',
  describeImportConflicts: () => ''
}));

import { createTreeOps } from '../tree-ops';
import type { TreeOps, TreeOpsContext } from '../tree-ops';
import { planListingDiff } from '../use-tree-model';

interface Rig {
  ops: TreeOps;
  /** The rows the model actually holds. */
  rows: Set<string>;
  /** The diff's baseline, read live. */
  fed: () => Set<string>;
  holds: () => number;
}

function makeRig(): Rig {
  const rows = new Set<string>();
  let fed = new Set<string>();
  let holds = 0;
  const model = {
    add: (path: string) => {
      rows.add(path);
    },
    remove: (path: string) => {
      rows.delete(path);
    },
    getItem: (path: string) => (rows.has(path) ? ({} as never) : null),
    startRenaming: () => true,
    batch: vi.fn(),
    resetPaths: vi.fn(),
    focusPath: vi.fn(),
    getSelectedPaths: () => [] as string[]
  };
  const ctx: TreeOpsContext = {
    rootPath: '/repo',
    model: model as unknown as TreeOpsContext['model'],
    readFed: () => fed,
    writeFed: (next) => {
      fed = next;
    },
    hold: () => {
      holds += 1;
      return () => {
        holds -= 1;
      };
    },
    renameView: () => null,
    selectOnly: vi.fn()
  };
  return { ops: createTreeOps(ctx), rows, fed: () => fed, holds: () => holds };
}

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  vi.clearAllMocks();
  h.relist.mockResolvedValue(undefined);
});

describe('an import tells the diff nothing about the model', () => {
  it('leaves the baseline EMPTY, and re-lists the folder it landed in', async () => {
    h.importPaths.mockResolvedValue({
      status: 'ok',
      imported: [
        { from: '/outside/dropped.md', to: { relPath: 'dropped.md', path: '/repo/dropped.md', kind: 'file' } }
      ],
      skipped: []
    });
    const rig = makeRig();
    rig.ops.importPaths(['/outside/dropped.md'], '', 0);
    await flush();

    // The baseline never heard of it, because no row was ever made for it.
    expect([...rig.fed()]).toEqual([]);
    // The rows come from here, which is what the function documents.
    expect(h.relist).toHaveBeenCalledWith(['/repo']);
    // And the hold the copy took is given back.
    expect(rig.holds()).toBe(0);
  });

  it('so the very next listing can add the row he dropped', async () => {
    h.importPaths.mockResolvedValue({
      status: 'ok',
      imported: [
        { from: '/outside/dropped.md', to: { relPath: 'dropped.md', path: '/repo/dropped.md', kind: 'file' } }
      ],
      skipped: []
    });
    const rig = makeRig();
    rig.ops.importPaths(['/outside/dropped.md'], '', 0);
    await flush();

    // The re-list lands: this is what `treeInput.paths` says a moment later.
    const listed = new Set(['README.md', 'dropped.md']);
    const { ops } = planListingDiff(rig.fed(), listed, () => false);
    expect(ops).toContainEqual({ type: 'add', path: 'dropped.md' });
  });

  it('an imported FOLDER is the same, and its stale subtree is forgotten', async () => {
    h.importPaths.mockResolvedValue({
      status: 'ok',
      imported: [
        { from: '/outside/pack', to: { relPath: 'pack', path: '/repo/pack', kind: 'dir' } }
      ],
      skipped: []
    });
    const rig = makeRig();
    rig.ops.importPaths(['/outside/pack'], '', 0);
    await flush();

    expect([...rig.fed()]).toEqual([]);
    expect(h.forgetUnder).toHaveBeenCalledWith(['/repo/pack']);
    const listed = new Set(['pack/']);
    expect(planListingDiff(rig.fed(), listed, () => false).ops).toEqual([
      { type: 'add', path: 'pack/' }
    ]);
  });

  it('a would-overwrite answer writes nothing and asks', async () => {
    h.importPaths.mockResolvedValue({
      status: 'would-overwrite',
      conflicts: [{ relPath: 'dropped.md' }],
      imported: [],
      skipped: []
    });
    const rig = makeRig();
    rig.ops.importPaths(['/outside/dropped.md'], '', 0);
    await flush();

    expect([...rig.fed()]).toEqual([]);
    expect(h.relist).not.toHaveBeenCalled();
    expect(h.setConfirm).toHaveBeenCalledTimes(1);
    expect(rig.holds()).toBe(0);
  });
});

describe('the control: the verbs that DO write the baseline have a row', () => {
  it('duplicate adds the row itself, so its baseline write is honest', async () => {
    h.duplicate.mockResolvedValue({
      path: '/repo/copy.md',
      relPath: 'copy.md',
      kind: 'file'
    });
    const rig = makeRig();
    rig.rows.add('a.md');
    rig.ops.duplicate('a.md');
    await flush();

    expect(rig.rows.has('copy.md')).toBe(true);
    expect(rig.fed().has('copy.md')).toBe(true);
    // Baseline and model agree, which is the whole rule: nothing goes into the
    // baseline that the model does not hold.
    for (const path of rig.fed()) expect(rig.rows.has(path)).toBe(true);
  });
});
