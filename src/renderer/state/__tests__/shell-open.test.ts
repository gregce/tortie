/**
 * pullPendingShellOpen (Phase 61, serialized in Phase 62.1): the one pull
 * both delivery legs call.
 *
 * The pull is take-and-clear main-side; what these tests pin is the
 * renderer's half of the contract:
 *
 *  - a folder-only pull opens the project and touches nothing else;
 *  - a folder-plus-file pull opens the project FIRST, arms the editor's
 *    open-bus subscription, then emits one pinned tree-shaped open;
 *  - a null pull, a missing bridge and a rejected pull all do nothing;
 *  - a failed addProjectPath abandons the file half on purpose;
 *  - deliveries run one at a time and in call order (Phase 62.1), so the
 *    last file the user opened emits last and wins the active tab.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellPendingOpen } from '@shared/ipc';
import type { OpenFileRequest } from '../open-file';

/** Ordered call journal, so project-before-file and emit order are provable. */
const journal: string[] = [];

/**
 * What each successive take returns. One shift per call; an empty queue
 * answers null, which is what the cleared main-side slot answers too.
 */
let takeResults: (ShellPendingOpen | null)[] = [];
let takeCalls = 0;
let pullRejects = false;
let takePendingOpen: (() => Promise<ShellPendingOpen | null>) | undefined;

/** What the mocked store believes is open. Tests fill it per case. */
let projects: { id: string; name: string; path: string }[] = [];
/** When true, addProjectPath "fails": it toasts (silently here) and adds nothing. */
let addFails = false;
/**
 * PHASE 274 FIX ROUND. The spelling the STORED ROW carries, when it differs
 * from the spelling the pull asked for.
 *
 * This is not a hypothetical. `addProject` answers the row that already NAMES
 * the folder, so a person who first opened `~/source/proj` and then
 * double-clicks a file in it in Finder — where the path is spelled the way the
 * disk holds it, `~/Source/proj` — gets a row back at the FIRST spelling. A
 * mock that always answered a row at the path it was passed could not see that,
 * and the version of this file before this round could not: it pushed
 * `{ path }` and the delivery re-scanned for `{ path }`, so the two agreed by
 * construction while the shipping pair had stopped agreeing.
 */
let storedSpelling: string | null = null;
/**
 * Per-call gates for addProjectPath, one shift per call. A promise entry
 * holds that call open until the test resolves it, which is how the tests
 * stage a slow first project open. A missing entry means no gate.
 */
let addGates: (Promise<void> | null)[] = [];
/** Per-call rejections for addProjectPath, one shift per call. */
let addRejects: boolean[] = [];

const addProjectPath = vi.fn(async (path: string) => {
  journal.push(`addProjectPath:${path}`);
  const gate = addGates.shift();
  if (gate) await gate;
  if (addRejects.shift() === true) {
    throw new Error('addProjectPath failed hard');
  }
  if (addFails) return null;
  const stored = storedSpelling ?? path;
  const row = { id: `id-${stored}`, name: stored, path: stored };
  projects = [...projects, row];
  return row;
});

vi.mock('../store', () => ({
  useApp: {
    getState: () => ({ addProjectPath, projects })
  }
}));

const requestOpenFile = vi.fn((req: OpenFileRequest) => {
  journal.push(`requestOpenFile:${req.path}`);
});
vi.mock('../open-file', () => ({
  requestOpenFile: (req: OpenFileRequest) => requestOpenFile(req)
}));

// PHASE 127. The delivery used to reach the editor store through a dynamic
// import, and the mock below stood in for it. The state layer may now name
// neither the app shell nor the editor, so the call goes through the seam in
// ../shell-ops.ts. The test installs a stand-in for that one operation, which
// is what src/renderer/app/shell-ops-install.ts fills with the editor store's
// own init. The journal shape is unchanged, so this still proves the
// subscription happens BEFORE the emit, and it still loads no Monaco.
const editorInit = vi.fn(() => {
  journal.push('editor.init');
});
const { installShellOps } = await import('../shell-ops');
installShellOps({
  showNativeMenu() {},
  cancelPointerDrag() {},
  focusFleetPrimary() {},
  ensureEditorSubscribed: editorInit,
  editorCloseProjectTabs() {},
  async jumpToSession() {
    return { ok: false as const, message: 'nothing to land on in this test' };
  }
});

vi.stubGlobal('window', {
  get gmux() {
    return { takePendingOpen };
  }
});

const { pullPendingShellOpen } = await import('../shell-open');

/** A promise resolved by hand, for holding a mocked call open. */
function gate(): { promise: Promise<void>; open: () => void } {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** Let every queued microtask and zero-delay timer run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  journal.length = 0;
  projects = [];
  addFails = false;
  storedSpelling = null;
  addGates = [];
  addRejects = [];
  pullRejects = false;
  takeResults = [];
  takeCalls = 0;
  addProjectPath.mockClear();
  requestOpenFile.mockClear();
  editorInit.mockClear();
  takePendingOpen = () => {
    takeCalls += 1;
    return pullRejects
      ? Promise.reject(new Error('bridge broke'))
      : Promise.resolve(takeResults.shift() ?? null);
  };
});

describe('folder-only pull', () => {
  it('opens the project and emits no file open', async () => {
    takeResults = [{ folder: '/tmp/proj', file: null }];
    await pullPendingShellOpen();
    expect(addProjectPath).toHaveBeenCalledTimes(1);
    expect(addProjectPath).toHaveBeenCalledWith('/tmp/proj');
    expect(requestOpenFile).not.toHaveBeenCalled();
    expect(editorInit).not.toHaveBeenCalled();
  });
});

describe('folder-plus-file pull', () => {
  it('opens the project first, then the file, as one pinned tree-shaped open', async () => {
    takeResults = [
      {
        folder: '/tmp/repo',
        file: '/tmp/repo/sub/readme.md'
      }
    ];
    await pullPendingShellOpen();
    expect(journal).toEqual([
      'addProjectPath:/tmp/repo',
      'editor.init',
      'requestOpenFile:/tmp/repo/sub/readme.md'
    ]);
    expect(requestOpenFile).toHaveBeenCalledWith({
      repoPath: '/tmp/repo',
      relPath: 'sub/readme.md',
      path: '/tmp/repo/sub/readme.md',
      mode: 'file',
      source: 'tree',
      preview: false
    });
  });
});

describe('nothing to deliver', () => {
  it('a null pull does nothing', async () => {
    takeResults = [null];
    await pullPendingShellOpen();
    expect(addProjectPath).not.toHaveBeenCalled();
    expect(requestOpenFile).not.toHaveBeenCalled();
  });

  it('a preload without the pull does nothing', async () => {
    takePendingOpen = undefined;
    await pullPendingShellOpen();
    expect(addProjectPath).not.toHaveBeenCalled();
  });

  it('a rejected pull is swallowed', async () => {
    pullRejects = true;
    await expect(pullPendingShellOpen()).resolves.toBeUndefined();
    expect(addProjectPath).not.toHaveBeenCalled();
  });
});

describe('the row main answered, not the string that was asked for (Phase 274)', () => {
  it('opens the file against the STORED spelling when they differ', async () => {
    // One folder, two spellings, on a case-folding volume. The person opened
    // it as `/tmp/source/proj` first, so that is the row; Finder hands over the
    // disk's spelling. Before this fix the delivery re-scanned the project list
    // for `/tmp/Source/proj`, read false, and abandoned the file with no toast
    // and no log — the tab focused and the file never opened.
    storedSpelling = '/tmp/source/proj';
    takeResults = [
      { folder: '/tmp/Source/proj', file: '/tmp/Source/proj/sub/readme.md' }
    ];
    await pullPendingShellOpen();
    expect(requestOpenFile).toHaveBeenCalledWith({
      // ALL THREE UNDER THE ROW. `fileInRepo` is a plain prefix test of
      // `tab.path` against `tab.repoPath`, and `projectHolding` asks the same
      // test of every open row, so a `path` spelled `/tmp/Source/...` beside a
      // `repoPath` spelled `/tmp/source/...` reads false twice: the tab lands
      // in the active project and ⌘S takes the plain door.
      repoPath: '/tmp/source/proj',
      // Sliced off the spelling `file` arrived in, then re-attached to the
      // row's. The tail is byte for byte what the disk called it.
      relPath: 'sub/readme.md',
      path: '/tmp/source/proj/sub/readme.md',
      mode: 'file',
      source: 'tree',
      preview: false
    });
  });

  it('slices the relative path off the ARRIVAL, whose length can differ', async () => {
    // The symlink half of the same defect: Phase 273 already resolved symlinks
    // at this door, so `/tmp/x` is stored and `/private/tmp/x` arrives. The two
    // spellings are different LENGTHS, so slicing by the row's would cut the
    // name in the wrong place.
    storedSpelling = '/tmp/x';
    takeResults = [{ folder: '/private/tmp/x', file: '/private/tmp/x/a.md' }];
    await pullPendingShellOpen();
    expect(requestOpenFile).toHaveBeenCalledWith({
      repoPath: '/tmp/x',
      relPath: 'a.md',
      // Under the row again, and `/tmp/x/a.md` is a real spelling of the same
      // file: Phase 273 made the symlinked form admissible at the save gate.
      path: '/tmp/x/a.md',
      mode: 'file',
      source: 'tree',
      preview: false
    });
  });

  it('abandons the file half when the row is on another machine', async () => {
    // PHASE 90.3's rule, kept: a tab for a folder of the same path on another
    // machine is not proof that a folder on THIS Mac opened.
    takeResults = [{ folder: '/tmp/far', file: '/tmp/far/a.md' }];
    const remote = vi.fn(async (path: string) => {
      journal.push(`addProjectPath:${path}`);
      return { id: 'r1', name: 'far', path, machineId: 'macpro' };
    });
    addProjectPath.mockImplementationOnce(remote);
    await pullPendingShellOpen();
    expect(requestOpenFile).not.toHaveBeenCalled();
    expect(editorInit).not.toHaveBeenCalled();
  });
});

describe('a folder that never became a project', () => {
  it('abandons the file half on purpose', async () => {
    addFails = true;
    takeResults = [{ folder: '/tmp/gone', file: '/tmp/gone/readme.md' }];
    await pullPendingShellOpen();
    expect(addProjectPath).toHaveBeenCalledWith('/tmp/gone');
    expect(requestOpenFile).not.toHaveBeenCalled();
    expect(editorInit).not.toHaveBeenCalled();
  });
});

describe('the serial queue (Phase 62.1)', () => {
  const pairA: ShellPendingOpen = {
    folder: '/tmp/repo',
    file: '/tmp/repo/a.md'
  };
  const pairB: ShellPendingOpen = {
    folder: '/tmp/repo',
    file: '/tmp/repo/b.md'
  };

  it('two overlapping pulls emit in call order even when the first project open is slow', async () => {
    // The Phase 61 race shape: the first delivery's addProjectPath is slow
    // because the project is not open yet, and the second's would be fast.
    // Before the queue, the second open emitted first and the FIRST file
    // stole the active tab. Now the journal must end on the second file.
    const slow = gate();
    addGates = [slow.promise];
    takeResults = [pairA, pairB];
    const first = pullPendingShellOpen();
    const second = pullPendingShellOpen();
    await settle();
    // The first delivery is parked on its slow project open. The second
    // has not started: one take, one addProjectPath, no emit yet.
    expect(takeCalls).toBe(1);
    expect(addProjectPath).toHaveBeenCalledTimes(1);
    expect(requestOpenFile).not.toHaveBeenCalled();
    slow.open();
    await Promise.all([first, second]);
    expect(journal).toEqual([
      'addProjectPath:/tmp/repo',
      'editor.init',
      'requestOpenFile:/tmp/repo/a.md',
      'addProjectPath:/tmp/repo',
      'editor.init',
      'requestOpenFile:/tmp/repo/b.md'
    ]);
    expect(journal[journal.length - 1]).toBe('requestOpenFile:/tmp/repo/b.md');
  });

  it('a pull issued while the first is mid-await starts only after the first emit', async () => {
    const slow = gate();
    addGates = [slow.promise];
    takeResults = [pairA, pairB];
    const first = pullPendingShellOpen();
    await settle();
    expect(addProjectPath).toHaveBeenCalledTimes(1);
    // Issue the second pull while the first is parked mid-await.
    const second = pullPendingShellOpen();
    await settle();
    // The second pull has not even taken yet.
    expect(takeCalls).toBe(1);
    slow.open();
    await Promise.all([first, second]);
    expect(takeCalls).toBe(2);
    // The second file's take-and-emit sits wholly after the first's emit.
    expect(journal.indexOf('requestOpenFile:/tmp/repo/a.md')).toBeLessThan(
      journal.lastIndexOf('addProjectPath:/tmp/repo')
    );
    expect(journal[journal.length - 1]).toBe('requestOpenFile:/tmp/repo/b.md');
  });

  it('a rejected first delivery does not block the second', async () => {
    addRejects = [true];
    takeResults = [pairA, pairB];
    const first = pullPendingShellOpen();
    const second = pullPendingShellOpen();
    await expect(first).rejects.toThrow('addProjectPath failed hard');
    await expect(second).resolves.toBeUndefined();
    expect(journal[journal.length - 1]).toBe('requestOpenFile:/tmp/repo/b.md');
    expect(requestOpenFile).toHaveBeenCalledTimes(1);
  });

  it('when both arrivals land before any take, the first pull takes the second pair and one open emits', async () => {
    // The main-side slot replaces whole, so the first take already answers
    // the SECOND pair and the second take answers null.
    takeResults = [pairB, null];
    const first = pullPendingShellOpen();
    const second = pullPendingShellOpen();
    await Promise.all([first, second]);
    expect(takeCalls).toBe(2);
    expect(requestOpenFile).toHaveBeenCalledTimes(1);
    expect(journal[journal.length - 1]).toBe('requestOpenFile:/tmp/repo/b.md');
  });
});
