/**
 * The rig two phases' remote tree tests drive `createTreeOps` with.
 *
 * IT WAS COPIED, AND PHASE 233 EXTRACTED IT. Phase 102 wrote it inside
 * ./p102-remote-entry.test.ts for New Folder and Rename; Phase 233 needed the
 * same fake model, the same fake `remoteEntry` and the same answer builders for
 * a DROP, and a second copy of 120 lines is exactly the duplication the growth
 * guardrail names. Both files register their own `vi.mock` calls, which is what
 * has to stay per file: a mock is hoisted into the test file's own module
 * graph, and this module is loaded inside it.
 *
 * WHAT THE FAKE MODEL IS FOR. @pierre/trees mutates its own store OPTIMISTICALLY
 * before any callback fires, so a refusal has to have something to take back
 * out. `rows` is that store, and `batch` applies a move the way Pierre's own
 * inverse batch does, which is what lets a revert be seen happening.
 */

import { vi } from 'vitest';
import type { FileTreeRenameEvent } from '@pierre/trees';
import type { MachineMakeDirResult, MachineRenameResult } from '@shared/ipc';
import { createTreeOps } from '../tree-ops';
import type { TreeOps, TreeOpsContext } from '../tree-ops';
import type { TreeRenameView } from '../rename-view';

export const ROOT = '/home/greg/api';
export const WRITE_ROOT = '/home/greg';

export interface FakeView extends TreeRenameView {
  path: string | null;
  value: string;
}

export function makeView(): FakeView {
  const view: FakeView = {
    path: null,
    value: '',
    getPath: () => view.path,
    getValue: () => view.value,
    isActive: () => view.path !== null,
    setValue: (value: string) => {
      view.value = value;
    },
    cancel: () => {
      view.path = null;
    },
    commit: () => {
      view.path = null;
    }
  };
  return view;
}

/** The slice of the Pierre model these verbs touch, over a path set. */
export function makeModel(view: FakeView): {
  rows: Set<string>;
  model: TreeOpsContext['model'];
  batch: ReturnType<typeof vi.fn>;
} {
  const rows = new Set<string>();
  const batch = vi.fn((ops: { type?: string; path?: string; from?: string; to?: string }[]) => {
    // Pierre's own inverse batch, enough of it to see a revert happen.
    for (const op of ops) {
      if (op.type === 'remove' && op.path !== undefined) {
        rows.delete(op.path);
        continue;
      }
      if (op.from === undefined || op.to === undefined) continue;
      rows.delete(op.from);
      rows.add(op.to);
    }
  });
  const model = {
    add: (path: string) => {
      rows.add(path);
    },
    remove: (path: string) => {
      rows.delete(path);
    },
    getItem: (path: string) => (rows.has(path) ? ({} as never) : null),
    startRenaming: (path: string) => {
      view.path = path;
      view.value = path.endsWith('/')
        ? (path.slice(0, -1).split('/').pop() ?? '')
        : (path.split('/').pop() ?? '');
      return true;
    },
    batch,
    resetPaths: vi.fn(),
    focusPath: vi.fn(),
    getSelectedPaths: () => [] as string[]
  };
  return { rows, model: model as unknown as TreeOpsContext['model'], batch };
}

export interface Rig {
  ops: TreeOps;
  view: FakeView;
  rows: Set<string>;
  fed: () => Set<string>;
  makeDirCalls: string[];
  renameCalls: { from: string; to: string; kind: 'file' | 'dir' }[];
  refreshes: () => number;
  holds: () => number;
  releases: () => number;
  makeDirAnswer: { value: Promise<MachineMakeDirResult> | null };
  renameAnswer: { value: Promise<MachineRenameResult> | null };
  /**
   * PHASE 233. An answer chosen per call, for a drop of several paths where
   * one is refused and the others are not. Null falls back to `renameAnswer`.
   */
  renameAnswerFor: {
    value: ((fromAbs: string) => Promise<MachineRenameResult>) | null;
  };
}

/**
 * One remote tree's verbs, with every crossing counted.
 *
 * `remoteEntry` being present is what makes the tree remote to `createTreeOps`,
 * which is the same fact `FileTree.tsx` hands it for a folder on a machine.
 */
export function makeRig(): Rig {
  const view = makeView();
  const { rows, model } = makeModel(view);
  let fed = new Set<string>();
  let refreshed = 0;
  let held = 0;
  let released = 0;
  const makeDirCalls: string[] = [];
  const renameCalls: { from: string; to: string; kind: 'file' | 'dir' }[] = [];
  const makeDirAnswer: Rig['makeDirAnswer'] = { value: null };
  const renameAnswer: Rig['renameAnswer'] = { value: null };
  const renameAnswerFor: Rig['renameAnswerFor'] = { value: null };
  const ctx: TreeOpsContext = {
    rootPath: ROOT,
    model,
    readFed: () => fed,
    writeFed: (next) => {
      fed = next;
    },
    hold: () => {
      held += 1;
      return () => {
        released += 1;
      };
    },
    renameView: () => view,
    selectOnly: () => undefined,
    remoteEntry: {
      machineId: 'm1',
      makeDir: (absPath) => {
        makeDirCalls.push(absPath);
        return makeDirAnswer.value ?? Promise.reject(new Error('no answer'));
      },
      renameEntry: (fromAbs, toAbs, kind) => {
        renameCalls.push({ from: fromAbs, to: toAbs, kind });
        const per = renameAnswerFor.value;
        if (per !== null) return per(fromAbs);
        return renameAnswer.value ?? Promise.reject(new Error('no answer'));
      },
      refresh: async () => {
        refreshed += 1;
      }
    }
  };
  return {
    ops: createTreeOps(ctx),
    view,
    rows,
    fed: () => fed,
    makeDirCalls,
    renameCalls,
    refreshes: () => refreshed,
    holds: () => held,
    releases: () => released,
    makeDirAnswer,
    renameAnswer,
    renameAnswerFor
  };
}

export const madeAnswer = (
  outcome: MachineMakeDirResult['outcome'],
  mode: string | null = null
): MachineMakeDirResult => ({
  outcome,
  mode,
  writeRoot: WRITE_ROOT,
  tookMs: 12
});

export const renamedAnswer = (
  outcome: MachineRenameResult['outcome'],
  kind: 'file' | 'dir' = 'file'
): MachineRenameResult => ({
  outcome,
  from: `${ROOT}/README.md`,
  to: `${ROOT}/readme.md`,
  kind,
  writeRoot: WRITE_ROOT,
  tookMs: 14
});

export function renameEvent(
  sourcePath: string,
  destinationPath: string,
  isFolder: boolean
): FileTreeRenameEvent {
  return { sourcePath, destinationPath, isFolder } as FileTreeRenameEvent;
}

export const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * Type a name into the open create editor and commit it.
 *
 * @pierre/trees moves the placeholder row onto the typed name BEFORE any
 * callback fires, which is the optimistic mutation the whole module is built
 * around, so the fake model is moved the same way here. Without it a refusal
 * would have nothing to take back out and the test would prove nothing.
 */
export function commitCreate(rig: Rig, placeholder: string, typed: string): void {
  rig.rows.delete(placeholder);
  rig.rows.add(`${typed}/`);
  rig.ops.onRenameCommitted(renameEvent(placeholder, typed, true));
}

/** The same optimistic move, for a rename of a row that already existed. */
export function commitRename(
  rig: Rig,
  source: string,
  dest: string,
  isFolder: boolean
): void {
  const from = isFolder ? `${source}/` : source;
  const to = isFolder ? `${dest}/` : dest;
  rig.rows.delete(from);
  rig.rows.add(to);
  rig.ops.onRenameCommitted(renameEvent(source, dest, isFolder));
}
