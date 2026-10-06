/**
 * PHASE 341. New Folder on another machine, with the box open across a
 * machine state push.
 *
 * THE DEFECT, measured by build/p341/probe-p341.mjs at the parent: every
 * New Folder or New File whose box stayed open past one push of the machine
 * states committed as `machines:renameEntry` of `untitled folder` (a folder
 * nobody had made), the machine answered `gone`, and the toast said Tortie
 * could not find untitled folder. Every one pressed within 150 ms made its
 * folder. The push is main's after every completed session poll, every 5 s
 * while the window is focused, and it gave FilesSection's `remote` a new
 * object, which rebuilt the tree's verbs, and a rebuilt set has no pending
 * create.
 *
 * WHAT THIS PINS, by MOUNTING `useTreeRename` on React's own root (no DOM: the
 * hook draws nothing and its host is null, so only the verbs effect and the
 * model subscription run):
 *
 *  - a push (the same machine, a NEW `remote` object) rebuilds nothing, and the
 *    box committed after it makes the folder under the typed name and asks no
 *    rename;
 *  - a rebuild that still happens, because the folder Tortie may write under
 *    went away while the box was open, ends the box the way Esc does: the row
 *    comes out, its hold is released, and nothing is asked of the machine or
 *    of this Mac.
 *
 * And, on `createTreeOps` itself, what `dispose()` does with and without an
 * open box. Nothing here starts a process or contacts a machine.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineMakeDirResult, MachineRenameResult } from '@shared/ipc';

const h = vi.hoisted(() => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rename: vi.fn(),
  toast: vi.fn(),
  relist: vi.fn(),
  forgetUnder: vi.fn(),
  refreshLoaded: vi.fn(),
  reread: vi.fn(),
  requestOpenFile: vi.fn(),
  followMoves: vi.fn(),
  announce: vi.fn(),
  bridge: { value: null as unknown }
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
    getState: () => ({
      relist: h.relist,
      forgetUnder: h.forgetUnder,
      refreshLoaded: h.refreshLoaded
    })
  }
}));
vi.mock('../../scm/remote-changes', () => ({
  useRemoteChanges: { getState: () => ({ reread: h.reread }) }
}));
vi.mock('../../machines/remote-writes', () => ({
  announceRemoteWrite: h.announce
}));
vi.mock('../open-file', () => ({ requestOpenFile: h.requestOpenFile }));
vi.mock('../editor-follow', () => ({ followMoves: h.followMoves }));
vi.mock('../tree-menu', () => ({
  describeConflicts: () => '',
  describeEntries: () => ''
}));
vi.mock('../rename-view', () => ({
  resolveTreeEditor: () => h.bridge.value
}));
vi.mock('../../bridge', () => ({ gmuxBridge: () => undefined }));

// THE PAGE. React's root needs a container and a window to read the active
// element from; nothing is ever drawn into either.
const fakeDocument = {
  nodeType: 9,
  activeElement: null,
  body: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined
};
const makeDirCalls: string[] = [];
const renameCalls: { from: string; to: string }[] = [];
const makeDirAnswer: { value: MachineMakeDirResult | null } = { value: null };
vi.stubGlobal('window', {
  document: fakeDocument,
  HTMLIFrameElement: class {},
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  gmux: {
    machines: {
      makeDir: (input: { path: string }) => {
        makeDirCalls.push(input.path);
        return makeDirAnswer.value === null
          ? Promise.reject(new Error('no answer'))
          : Promise.resolve(makeDirAnswer.value);
      },
      renameEntry: (input: { from: string; to: string }) => {
        renameCalls.push({ from: input.from, to: input.to });
        return Promise.resolve({
          outcome: 'gone',
          from: input.from,
          to: input.to,
          kind: 'dir',
          writeRoot: '/home/greg/api',
          tookMs: 3
        } satisfies MachineRenameResult);
      }
    }
  }
});
vi.stubGlobal('document', fakeDocument);
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { useTreeRename } = await import('../use-tree-rename');
const { createTreeOps } = await import('../tree-ops');
const { ROOT, flush, makeModel, makeView, renameEvent } = await import(
  './remote-tree-rig'
);
type TreeOps = import('../tree-ops').TreeOps;
type TreeRemote = import('../use-tree-model').TreeRemote;

// ---------------------------------------------------------------------------
// The mount
// ---------------------------------------------------------------------------

interface Mounted {
  opsRef: { current: TreeOps | null };
  rows: Set<string>;
  view: ReturnType<typeof makeView>;
  holds: () => number;
  releases: () => number;
  built: () => number;
  render(remote: TreeRemote | null, writeFolder: string | null): Promise<void>;
  unmount(): Promise<void>;
}

const act = async (fn: () => void): Promise<void> => {
  await React.act(async () => {
    fn();
    await flush();
  });
};

async function mount(): Promise<Mounted> {
  const view = makeView();
  const { rows, model } = makeModel(view);
  // The hook subscribes to the model; the fake emits nothing.
  Object.assign(model, { subscribe: () => () => undefined });
  h.bridge.value = { view, selectOnly: () => undefined };
  const opsRef: { current: TreeOps | null } = { current: null };
  const fedRef = { current: new Set<string>() };
  const hostRef = { current: null };
  let held = 0;
  let released = 0;
  const hold = (): (() => void) => {
    held += 1;
    let done = false;
    return () => {
      if (done) return;
      done = true;
      released += 1;
    };
  };
  const seen = new Set<TreeOps>();
  function Harness(props: {
    remote: TreeRemote | null;
    writeFolder: string | null;
  }): null {
    useTreeRename({
      rootPath: ROOT,
      remote: props.remote,
      remoteWriteFolder: props.writeFolder,
      model,
      hostRef,
      treeShadow: () => null,
      opsRef,
      fedRef,
      hold
    } as never);
    if (opsRef.current !== null) seen.add(opsRef.current);
    return null;
  }
  const container = {
    nodeType: 1,
    nodeName: 'DIV',
    tagName: 'DIV',
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    ownerDocument: fakeDocument,
    textContent: '',
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  };
  const root = createRoot(container as never);
  const mounted: Mounted = {
    opsRef,
    rows,
    view,
    holds: () => held,
    releases: () => released,
    built: () => seen.size,
    render: async (remote, writeFolder) => {
      await act(() => {
        root.render(React.createElement(Harness, { remote, writeFolder }));
      });
      if (opsRef.current !== null) seen.add(opsRef.current);
    },
    unmount: async () => {
      await act(() => {
        root.unmount();
      });
    }
  };
  return mounted;
}

/** What FilesSection hands the tree, composed afresh as its memo does on every push. */
const studio = (): TreeRemote =>
  ({
    machineId: 'm1',
    label: 'Studio',
    writeFolder: ROOT,
    readOnlyNote: 'Tortie cannot move files on Studio to the Trash.'
  }) as TreeRemote;

/** Return in the box: the library moves the row onto the typed name, then commits. */
function pressReturn(m: Mounted, placeholder: string, typed: string): void {
  m.rows.delete(placeholder);
  m.rows.add(`${typed}/`);
  m.view.path = null;
  m.opsRef.current?.onRenameCommitted(
    renameEvent(placeholder.replace(/\/$/, ''), typed, true)
  );
}

let live: Mounted | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  makeDirCalls.length = 0;
  renameCalls.length = 0;
  makeDirAnswer.value = {
    outcome: 'made',
    mode: '755',
    writeRoot: ROOT,
    tookMs: 9
  } as MachineMakeDirResult;
  h.relist.mockResolvedValue(undefined);
  h.refreshLoaded.mockResolvedValue(undefined);
  h.reread.mockResolvedValue(undefined);
});

afterEach(async () => {
  await live?.unmount();
  live = null;
});

describe('a machine state push while the New Folder box is open', () => {
  it('rebuilds nothing, and Return makes the folder under the typed name', async () => {
    live = await mount();
    await live.render(studio(), ROOT);
    const before = live.opsRef.current;
    expect(before).not.toBeNull();

    before?.newEntry('', 'dir');
    const placeholder = before?.pendingPath() ?? '';
    expect(placeholder).toBe('untitled folder/');

    // Two pushes: the same machine, a new object each time.
    await live.render(studio(), ROOT);
    await live.render(studio(), ROOT);
    expect(live.opsRef.current).toBe(before);
    expect(live.built()).toBe(1);

    pressReturn(live, placeholder, 'my folder');
    await flush();
    expect(makeDirCalls).toEqual([`${ROOT}/my folder`]);
    expect(renameCalls).toEqual([]);
    expect(h.toast).not.toHaveBeenCalled();
    expect(live.rows.has('my folder/')).toBe(true);
    expect(live.rows.has('untitled folder/')).toBe(false);
  });

  it('New File the same way: one push, then Return asks no rename', async () => {
    live = await mount();
    await live.render(studio(), ROOT);
    const ops = live.opsRef.current;
    ops?.newEntry('src/', 'file');
    const placeholder = ops?.pendingPath() ?? '';
    expect(placeholder).toBe('src/untitled');
    await live.render(studio(), ROOT);
    expect(live.opsRef.current).toBe(ops);
    expect(live.opsRef.current?.pendingPath()).toBe('src/untitled');
    expect(renameCalls).toEqual([]);
  });
});

describe('a rebuild that still happens ends the box the way Esc does', () => {
  it('writes going away mid-box: the row comes out, the hold is released, nothing is asked', async () => {
    live = await mount();
    await live.render(studio(), ROOT);
    const before = live.opsRef.current;
    before?.newEntry('', 'dir');
    const placeholder = before?.pendingPath() ?? '';
    expect(live.rows.has(placeholder)).toBe(true);
    const heldBefore = live.holds() - live.releases();
    expect(heldBefore).toBe(1);

    // The project that held this tree was closed: no folder to write under.
    await live.render({ ...studio(), writeFolder: null }, null);
    expect(live.opsRef.current).not.toBe(before);
    expect(live.rows.has(placeholder)).toBe(false);
    expect(live.view.path).toBeNull();
    expect(live.holds() - live.releases()).toBe(0);
    expect(live.opsRef.current?.pendingPath()).toBeNull();

    await flush();
    expect(makeDirCalls).toEqual([]);
    expect(renameCalls).toEqual([]);
    expect(h.createFolder).not.toHaveBeenCalled();
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('an unmount with the box open releases its hold too', async () => {
    const m = await mount();
    await m.render(studio(), ROOT);
    m.opsRef.current?.newEntry('', 'dir');
    expect(m.holds() - m.releases()).toBe(1);
    await m.unmount();
    expect(m.holds() - m.releases()).toBe(0);
    expect(makeDirCalls).toEqual([]);
    expect(renameCalls).toEqual([]);
  });
});

describe('TreeOps.dispose', () => {
  const opsOver = (): {
    ops: TreeOps;
    rows: Set<string>;
    view: ReturnType<typeof makeView>;
    cancels: () => number;
    outstanding: () => number;
  } => {
    const view = makeView();
    let cancelled = 0;
    const cancel = view.cancel;
    view.cancel = () => {
      cancelled += 1;
      cancel();
    };
    const { rows, model } = makeModel(view);
    let open = 0;
    const ops = createTreeOps({
      rootPath: ROOT,
      model,
      readFed: () => new Set<string>(),
      writeFed: () => undefined,
      hold: () => {
        open += 1;
        let done = false;
        return () => {
          if (done) return;
          done = true;
          open -= 1;
        };
      },
      renameView: () => view,
      selectOnly: () => undefined
    });
    return { ops, rows, view, cancels: () => cancelled, outstanding: () => open };
  };

  it('with no box open it touches nothing', () => {
    const t = opsOver();
    t.rows.add('README.md');
    t.ops.dispose();
    expect(t.cancels()).toBe(0);
    expect([...t.rows]).toEqual(['README.md']);
  });

  it('with a box open it cancels the editor, takes the row out and releases the hold once', () => {
    const t = opsOver();
    t.ops.newEntry('', 'dir');
    expect(t.outstanding()).toBe(1);
    t.ops.dispose();
    expect(t.cancels()).toBe(1);
    expect(t.rows.has('untitled folder/')).toBe(false);
    expect(t.outstanding()).toBe(0);
    expect(t.ops.pendingPath()).toBeNull();
    // A second dispose, and a settle after it, change nothing.
    t.ops.dispose();
    t.ops.settle();
    expect(t.cancels()).toBe(1);
    expect(t.outstanding()).toBe(0);
  });

  it('an editor already closed: the row still comes out', () => {
    const t = opsOver();
    t.ops.newEntry('src/', 'file');
    t.view.path = null;
    t.ops.dispose();
    expect(t.cancels()).toBe(0);
    expect(t.rows.has('src/untitled')).toBe(false);
    expect(t.outstanding()).toBe(0);
  });
});
