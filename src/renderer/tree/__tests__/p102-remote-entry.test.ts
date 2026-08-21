/**
 * PHASE 102. New Folder and Rename, landing on another machine.
 *
 * WHAT THIS PINS, and why each one is worth a test rather than a reading.
 *
 *  - A folder gesture on a remote tree reaches `machines:makeDir` and never
 *    this Mac's own `fs:createFolder`. Before this phase New Folder was absent
 *    from a remote menu, so the branch did not exist; if it ever falls through,
 *    a folder appears on the operator's own disk instead of on the machine.
 *  - A rename on a remote tree reaches `machines:renameEntry` and never
 *    `fs:rename`. That fall through was reachable by pressing F2, and the path
 *    it renamed was a path on THIS Mac.
 *  - Every answer word draws the sentence the phase spec rules for it, and only
 *    `made`, `moved` and `done` leave the row in the model.
 *  - A thrown call never says nothing was changed.
 *  - A rename carries the machine and the ANSWER's kind to the tab follower.
 *
 * Nothing here starts a process, opens a socket or contacts a machine. The two
 * calls are counted, so a refusal that must send nothing can be proved to have
 * sent nothing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileTreeRenameEvent } from '@pierre/trees';
import type {
  MachineMakeDirResult,
  MachineRenameResult
} from '@shared/ipc';

const h = vi.hoisted(() => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rename: vi.fn(),
  toast: vi.fn(),
  relist: vi.fn(),
  forgetUnder: vi.fn(),
  requestOpenFile: vi.fn(),
  followMoves: vi.fn()
}));

vi.mock('../fs-ops-bridge', () => ({
  createFile: h.createFile,
  createFolder: h.createFolder,
  rename: h.rename,
  duplicate: vi.fn(),
  move: vi.fn(),
  trash: vi.fn(),
  canMutate: () => true,
  canDuplicate: () => true
}));

vi.mock('../../state/store', () => ({
  useApp: {
    getState: () => ({
      toast: h.toast,
      setConfirm: vi.fn(),
      machineStates: [{ id: 'm1', label: 'Studio' }]
    })
  },
  errorPayload: () => null,
  errorText: (err: unknown) => String(err)
}));

vi.mock('../store', () => ({
  useFileTree: {
    getState: () => ({ relist: h.relist, forgetUnder: h.forgetUnder })
  }
}));

vi.mock('../open-file', () => ({ requestOpenFile: h.requestOpenFile }));
vi.mock('../editor-follow', () => ({ followMoves: h.followMoves }));
vi.mock('../tree-menu', () => ({
  describeConflicts: () => '',
  describeEntries: () => ''
}));

import { createTreeOps } from '../tree-ops';
import type { TreeOps, TreeOpsContext } from '../tree-ops';
import type { TreeRenameView } from '../rename-view';

const ROOT = '/home/greg/api';
const WRITE_ROOT = '/home/greg';

interface FakeView extends TreeRenameView {
  path: string | null;
  value: string;
}

function makeView(): FakeView {
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

/** The slice of the Pierre model these two verbs touch, over a path set. */
function makeModel(view: FakeView): {
  rows: Set<string>;
  model: TreeOpsContext['model'];
  batch: ReturnType<typeof vi.fn>;
} {
  const rows = new Set<string>();
  const batch = vi.fn((ops: { from?: string; to?: string }[]) => {
    // Pierre's own inverse batch, enough of it to see a revert happen.
    for (const op of ops) {
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

interface Rig {
  ops: TreeOps;
  view: FakeView;
  rows: Set<string>;
  fed: () => Set<string>;
  makeDirCalls: string[];
  renameCalls: { from: string; to: string; kind: 'file' | 'dir' }[];
  refreshes: () => number;
  makeDirAnswer: { value: Promise<MachineMakeDirResult> | null };
  renameAnswer: { value: Promise<MachineRenameResult> | null };
}

function makeRig(): Rig {
  const view = makeView();
  const { rows, model } = makeModel(view);
  let fed = new Set<string>();
  let refreshed = 0;
  const makeDirCalls: string[] = [];
  const renameCalls: { from: string; to: string; kind: 'file' | 'dir' }[] = [];
  const makeDirAnswer: Rig['makeDirAnswer'] = { value: null };
  const renameAnswer: Rig['renameAnswer'] = { value: null };
  const ctx: TreeOpsContext = {
    rootPath: ROOT,
    model,
    readFed: () => fed,
    writeFed: (next) => {
      fed = next;
    },
    hold: () => () => undefined,
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
    makeDirAnswer,
    renameAnswer
  };
}

const madeAnswer = (
  outcome: MachineMakeDirResult['outcome'],
  mode: string | null = null
): MachineMakeDirResult => ({
  outcome,
  mode,
  writeRoot: WRITE_ROOT,
  tookMs: 12
});

const renamedAnswer = (
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

function renameEvent(
  sourcePath: string,
  destinationPath: string,
  isFolder: boolean
): FileTreeRenameEvent {
  return { sourcePath, destinationPath, isFolder } as FileTreeRenameEvent;
}

const flush = async (): Promise<void> => {
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
function commitCreate(rig: Rig, placeholder: string, typed: string): void {
  rig.rows.delete(placeholder);
  rig.rows.add(`${typed}/`);
  rig.ops.onRenameCommitted(renameEvent(placeholder, typed, true));
}

/** The same optimistic move, for a rename of a row that already existed. */
function commitRename(
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

const toasts = (): { level: string; text: string }[] =>
  h.toast.mock.calls.map((call) => ({
    level: String(call[0]),
    text: String(call[1])
  }));

beforeEach(() => {
  vi.clearAllMocks();
  h.relist.mockResolvedValue(undefined);
});

describe('New Folder on a machine reaches the machine and not this Mac', () => {
  it('calls makeDir with the absolute path over there, once', async () => {
    const rig = makeRig();
    rig.makeDirAnswer.value = Promise.resolve(madeAnswer('made', '755'));
    rig.ops.newEntry('src/', 'dir');
    commitCreate(rig, rig.ops.pendingPath() ?? '', 'src/notes');
    await flush();
    expect(rig.makeDirCalls).toEqual(['/home/greg/api/src/notes']);
    expect(h.createFolder).not.toHaveBeenCalled();
    expect(h.createFile).not.toHaveBeenCalled();
  });

  it('keeps the row, re-reads the folder and says nothing on made', async () => {
    const rig = makeRig();
    rig.makeDirAnswer.value = Promise.resolve(madeAnswer('made', '700'));
    rig.ops.newEntry('src/', 'dir');
    commitCreate(rig, rig.ops.pendingPath() ?? '', 'src/notes');
    await flush();
    expect(rig.rows.has('src/notes/')).toBe(true);
    expect(rig.fed().has('src/notes/')).toBe(true);
    expect(rig.refreshes()).toBe(1);
    expect(toasts()).toEqual([]);
  });

  it('opens no tab, because a folder is not a document', async () => {
    const rig = makeRig();
    rig.makeDirAnswer.value = Promise.resolve(madeAnswer('made', '755'));
    rig.ops.newEntry('', 'dir');
    commitCreate(rig, rig.ops.pendingPath() ?? '', 'notes');
    await flush();
    expect(h.requestOpenFile).not.toHaveBeenCalled();
  });
});

describe('every answer New Folder can meet', () => {
  const cases: {
    outcome: MachineMakeDirResult['outcome'];
    writeRoot: string | null;
    says: string;
  }[] = [
    {
      outcome: 'exists',
      writeRoot: WRITE_ROOT,
      says: 'There is already something called notes in that folder on Studio.'
    },
    {
      outcome: 'noparent',
      writeRoot: WRITE_ROOT,
      says: 'That folder is no longer on Studio. Press Refresh to read it again.'
    },
    {
      outcome: 'denied',
      writeRoot: WRITE_ROOT,
      says: 'Tortie cannot write in /home/greg/api/src on Studio.'
    },
    {
      outcome: 'writesOff',
      writeRoot: null,
      says:
        'Tortie cannot change anything on Studio. Open Settings, then ' +
        'Machines, then Studio, and let Tortie save files there. Nothing was ' +
        'changed.'
    },
    {
      outcome: 'outsideRoot',
      writeRoot: WRITE_ROOT,
      says:
        'Tortie may only change what is under /home/greg on Studio, and that ' +
        'folder is outside it. Nothing was changed.'
    }
  ];

  for (const one of cases) {
    it(`takes the row back out and says why on ${one.outcome}`, async () => {
      const rig = makeRig();
      rig.makeDirAnswer.value = Promise.resolve({
        outcome: one.outcome,
        mode: null,
        writeRoot: one.writeRoot,
        tookMs: 9
      });
      rig.ops.newEntry('src/', 'dir');
      commitCreate(rig, rig.ops.pendingPath() ?? '', 'src/notes');
      await flush();
      expect(rig.rows.has('src/notes/')).toBe(false);
      expect(rig.fed().has('src/notes/')).toBe(false);
      expect(rig.refreshes()).toBe(0);
      expect(toasts()).toEqual([{ level: 'error', text: one.says }]);
    });
  }

  it('falls back to the saving off line when no folder came back', async () => {
    // Main sends the folder on the word that names one. A null there can only
    // mean saving is off, so a folder composed out of nothing is never drawn.
    const rig = makeRig();
    rig.makeDirAnswer.value = Promise.resolve({
      outcome: 'outsideRoot',
      mode: null,
      writeRoot: null,
      tookMs: 9
    });
    rig.ops.newEntry('src/', 'dir');
    commitCreate(rig, rig.ops.pendingPath() ?? '', 'src/notes');
    await flush();
    expect(toasts()[0]?.text).toContain('Tortie cannot change anything on Studio.');
  });

  it('never says nothing was changed when the machine did not answer', async () => {
    const rig = makeRig();
    rig.makeDirAnswer.value = Promise.reject(new Error('ssh was killed'));
    rig.ops.newEntry('src/', 'dir');
    commitCreate(rig, rig.ops.pendingPath() ?? '', 'src/notes');
    await flush();
    expect(rig.rows.has('src/notes/')).toBe(false);
    const said = toasts()[0];
    expect(said?.level).toBe('error');
    expect(said?.text).toBe(
      'Studio did not answer, so Tortie cannot tell you whether that went ' +
        'through. Press Refresh to read that folder again.'
    );
    expect(said?.text).not.toContain('Nothing was changed.');
  });
});

describe('Rename on a machine reaches the machine and not this Mac', () => {
  it('calls renameEntry with both absolute paths and never fs:rename', async () => {
    const rig = makeRig();
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    commitRename(rig, 'README.md', 'readme.md', false);
    await flush();
    expect(rig.renameCalls).toEqual([
      {
        from: '/home/greg/api/README.md',
        to: '/home/greg/api/readme.md',
        kind: 'file'
      }
    ]);
    expect(h.rename).not.toHaveBeenCalled();
  });

  it('carries the machine and the answer kind to the tab follower', async () => {
    // The follower takes the kind off the ANSWER, and main echoes back the kind
    // this renderer sent from the tree row. Nothing on the machine measures it.
    // A folder rename carried as a file leaves every open tab beneath it
    // pointing at a path that is not there any more, which is why the value the
    // follower reads is the answer's field rather than a second guess here.
    const rig = makeRig();
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved', 'dir'));
    commitRename(rig, 'src', 'lib', true);
    await flush();
    expect(h.followMoves).toHaveBeenCalledWith([
      {
        from: '/home/greg/api/src',
        to: '/home/greg/api/lib',
        kind: 'dir',
        machine: { machineId: 'm1', repoPath: ROOT }
      }
    ]);
    // A folder that moved takes its cached children's keys with it.
    expect(h.forgetUnder).toHaveBeenCalledWith(['/home/greg/api/src']);
  });

  it('says nothing on moved and re-reads the folder once', async () => {
    const rig = makeRig();
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    commitRename(rig, 'README.md', 'readme.md', false);
    await flush();
    expect(toasts()).toEqual([]);
    expect(rig.refreshes()).toBe(1);
  });

  it('follows the move on done and says so at info', async () => {
    // The machine holds what the person asked for, so the model and the tabs
    // follow. It was not this call that did it, so the person is told.
    const rig = makeRig();
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('done'));
    commitRename(rig, 'README.md', 'readme.md', false);
    await flush();
    expect(h.followMoves).toHaveBeenCalledTimes(1);
    expect(toasts()).toEqual([
      { level: 'info', text: 'That rename has already gone through on Studio.' }
    ]);
    expect(rig.refreshes()).toBe(1);
  });
});

describe('every answer Rename can meet', () => {
  const cases: {
    outcome: MachineRenameResult['outcome'];
    says: string;
  }[] = [
    {
      outcome: 'exists',
      says:
        'There is already something called readme.md in that folder on Studio.'
    },
    {
      outcome: 'gone',
      says:
        'Tortie could not find README.md on Studio. Press Refresh to read ' +
        'that folder again.'
    },
    {
      outcome: 'writesOff',
      says:
        'Tortie cannot change anything on Studio. Open Settings, then ' +
        'Machines, then Studio, and let Tortie save files there. Nothing was ' +
        'changed.'
    },
    {
      outcome: 'outsideRoot',
      says:
        'Tortie may only change what is under /home/greg on Studio, and that ' +
        'folder is outside it. Nothing was changed.'
    }
  ];

  for (const one of cases) {
    it(`puts the model back and says why on ${one.outcome}`, async () => {
      const rig = makeRig();
      rig.renameAnswer.value = Promise.resolve(renamedAnswer(one.outcome));
      commitRename(rig, 'README.md', 'readme.md', false);
      await flush();
      expect(h.followMoves).not.toHaveBeenCalled();
      expect(rig.refreshes()).toBe(0);
      // The optimistic move is taken back out, so the row is where it was.
      expect(rig.rows.has('README.md')).toBe(true);
      expect(rig.rows.has('readme.md')).toBe(false);
      expect(toasts()).toEqual([{ level: 'error', text: one.says }]);
    });
  }

  it('never says nothing was changed when the machine did not answer', async () => {
    const rig = makeRig();
    rig.renameAnswer.value = Promise.reject(new Error('ssh was killed'));
    commitRename(rig, 'README.md', 'readme.md', false);
    await flush();
    expect(h.followMoves).not.toHaveBeenCalled();
    const said = toasts()[0];
    expect(said?.text).toContain('Tortie cannot tell you whether that went');
    expect(said?.text).not.toContain('Nothing was changed.');
  });
});

describe('a folder on this Mac is untouched by any of it', () => {
  it('still creates and renames through the fs channels', async () => {
    const view = makeView();
    const { rows, model } = makeModel(view);
    let fed = new Set<string>();
    h.createFolder.mockResolvedValue({
      path: '/repo/notes',
      relPath: 'notes',
      kind: 'dir'
    });
    h.rename.mockResolvedValue(undefined);
    const ops = createTreeOps({
      rootPath: '/repo',
      model,
      readFed: () => fed,
      writeFed: (next) => {
        fed = next;
      },
      hold: () => () => undefined,
      renameView: () => view,
      selectOnly: () => undefined
    });
    ops.newEntry('', 'dir');
    const placeholder = ops.pendingPath() ?? '';
    rows.delete(placeholder);
    rows.add('notes/');
    ops.onRenameCommitted(renameEvent(placeholder, 'notes', true));
    await flush();
    expect(h.createFolder).toHaveBeenCalledTimes(1);
    ops.onRenameCommitted(renameEvent('a.ts', 'b.ts', false));
    await flush();
    expect(h.rename).toHaveBeenCalledTimes(1);
    expect(rows.has('notes/')).toBe(true);
  });
});
