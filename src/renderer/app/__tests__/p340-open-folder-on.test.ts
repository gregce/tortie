/**
 * Phase 340, the main window's half of Open a folder on it… (build/p340/SPEC.md
 * §6, D13).
 *
 * Settings → a machine's row → Open a folder on it… asks main
 * (`machines:openFolder`), which refuses a machine that is not confirmed,
 * brings this window forward and sends the menu action `open-folder-on:<id>`.
 * Three things in this window then have to hold, and each is one block below:
 *
 *  1. THE ACTION. `useMenuActions` opens the Open a Folder on a Machine sheet
 *     with that id, and returns in silence, changing nothing, under the
 *     session manager, while the sheet is already open and under a boot block.
 *  2. THE SLICE. `setRemoteProjectOpen(open, machineId?)` writes the id beside
 *     the flag in one `set`, and no opening ever inherits an earlier door's
 *     machine.
 *  3. THE SHEET. `RemoteProjectModal` starts on that machine when its list
 *     holds it and on its first machine otherwise, and never replaces a
 *     machine the person chose while the list was being read.
 *
 * WHY THE SHIPPING HANDLERS ARE DRIVEN AND NOT READ. Every rule here is about
 * what a delivery or an opening DOES, and `runMenuAction` and
 * `useMenuActions` return void on every path, so a branch that went missing
 * would be invisible to a reading that found its text. So the action goes in
 * through the same `onMenuAction` callback main's event reaches, the slice is
 * the real `createProjectsSlice` over a plain set and get, and the sheet is the
 * real component called under a small hook runtime.
 *
 * HOW, IN A NODE ENVIRONMENT. There is no DOM (the note at the top of
 * p127-keyboard.test.ts) and no DOM library in this repository. The three React
 * hooks the files under test use are replaced by a small runtime written below:
 * `useState` and `useRef` keep a slot per call per instance, and `useEffect`
 * queues its body to run after the render when a dependency moved, the way
 * React runs it after commit. The component is then called as the function it
 * is, and the element tree it returns is read for the machine field's value.
 * JSX itself is the real runtime's, so the tree is React's own.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowView } from '@shared/ipc';

// ---------------------------------------------------------------------------
// The hook runtime
// ---------------------------------------------------------------------------

const rt = vi.hoisted(() => {
  interface Effect {
    deps: readonly unknown[] | undefined;
    cleanup: void | (() => void);
  }
  interface Instance {
    slots: unknown[];
    effects: Array<Effect | undefined>;
    pending: Array<() => void>;
    slot: number;
    effect: number;
  }
  let current: Instance | null = null;
  const live = (): Instance => {
    if (current === null) throw new Error('a hook was called outside render()');
    return current;
  };
  return {
    instance(): Instance {
      return { slots: [], effects: [], pending: [], slot: 0, effect: 0 };
    },
    /** Call one component (or hook) as React would, then run its effects. */
    render<T>(inst: Instance, fn: () => T): T {
      current = inst;
      inst.slot = 0;
      inst.effect = 0;
      let out: T;
      try {
        out = fn();
      } finally {
        current = null;
      }
      const run = inst.pending.splice(0);
      for (const effect of run) effect();
      return out;
    },
    useState<T>(init: T | (() => T)): [T, (next: T | ((was: T) => T)) => void] {
      const inst = live();
      const at = inst.slot++;
      if (!(at in inst.slots)) {
        inst.slots[at] = typeof init === 'function' ? (init as () => T)() : init;
      }
      const set = (next: T | ((was: T) => T)): void => {
        inst.slots[at] =
          typeof next === 'function'
            ? (next as (was: T) => T)(inst.slots[at] as T)
            : next;
      };
      return [inst.slots[at] as T, set];
    },
    useRef<T>(init: T): { current: T } {
      const inst = live();
      const at = inst.slot++;
      if (!(at in inst.slots)) inst.slots[at] = { current: init };
      return inst.slots[at] as { current: T };
    },
    useEffect(body: () => void | (() => void), deps?: readonly unknown[]): void {
      const inst = live();
      const at = inst.effect++;
      const was = inst.effects[at];
      const moved =
        was === undefined ||
        deps === undefined ||
        was.deps === undefined ||
        deps.length !== was.deps.length ||
        deps.some((dep, k) => !Object.is(dep, was.deps?.[k]));
      if (!moved) return;
      inst.pending.push(() => {
        if (typeof was?.cleanup === 'function') was.cleanup();
        inst.effects[at] = { deps, cleanup: body() };
      });
    }
  };
});

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: rt.useState,
    useRef: rt.useRef,
    useEffect: rt.useEffect
  };
});

// ---------------------------------------------------------------------------
// The store double
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  toast: vi.fn(),
  openRecentOnMachine: vi.fn(),
  addProjectPath: vi.fn(),
  addRemoteProject: vi.fn(),
  rows: [] as unknown[],
  /** The answer `machines.rows()` is waiting on, released by the test. */
  release: null as (() => void) | null,
  menu: { deliver: null as ((action: string) => void) | null }
}));

/** The fields the action, the slice and the sheet read and write. */
function restingFields() {
  return {
    bootBlock: null as string | null,
    sessionSheet: null as { tab: 'managed' | 'past' } | null,
    remoteProjectOpen: false,
    remoteProjectMachineId: null as string | null,
    canAdd: true
  };
}

const store = {
  ...restingFields(),
  // Bound to the REAL slice's setter below, so the action's call is read
  // through what the store actually holds afterwards.
  setRemoteProjectOpen: (_open: boolean, _machineId?: string): void => {
    throw new Error('not bound yet');
  },
  canAddRemoteProject(): boolean {
    return store.canAdd;
  },
  toast: h.toast,
  addProjectPath: h.addProjectPath,
  addRemoteProject: h.addRemoteProject
};

/** Everything a door could have changed, as one comparable value. */
function snapshot(): string {
  const fields: Record<string, unknown> = {};
  for (const name of Object.keys(restingFields())) {
    fields[name] = (store as unknown as Record<string, unknown>)[name];
  }
  return JSON.stringify(fields);
}

vi.mock('../../state/store', () => {
  const useApp = Object.assign(
    (select: (s: typeof store) => unknown) => select(store),
    { getState: () => store }
  );
  return { useApp };
});

// menu-actions.ts reaches far, and nothing past its prefix branches is under
// test here, so every module it imports that is not shared is a stub.
vi.mock('../../state/clone', () => ({ cloneAction: () => undefined }));
vi.mock('../open-recent-on-machine', () => ({
  openRecentOnMachine: h.openRecentOnMachine
}));
vi.mock('../../state/shell-open', () => ({ pullPendingShellOpen: vi.fn() }));
vi.mock('../../state/layout', () => ({
  useLayout: { getState: () => ({ navigate: vi.fn() }) }
}));
vi.mock('../../editor/store', () => ({ useEditor: { getState: () => ({}) } }));
vi.mock('../../settings/settings-store', () => ({
  useSettingsStore: { getState: () => ({}) }
}));
vi.mock('../../editor/fill', () => ({ toggleEditorFill: vi.fn() }));
vi.mock('../../editor/redline-commands', () => ({ runRedlineCommand: vi.fn() }));
vi.mock('../../editor/reshape-commands', () => ({
  runReshapeCommand: () => false
}));
vi.mock('../session-focus', () => ({
  focusTerminal: vi.fn(),
  jumpToSession: vi.fn(() => Promise.resolve({ ok: false }))
}));
vi.mock('../fill-chord', () => ({ runFillChord: vi.fn() }));
vi.mock('../../overview/open-overview', () => ({ toggleOverview: vi.fn() }));
vi.mock('../../arch/picker', () => ({ openAimPicker: vi.fn() }));
vi.mock('../../arch/open-map', () => ({ openArchMapForActiveProject: vi.fn() }));
vi.mock('../../diagnostics/open-report', () => ({
  openDiagnosticsReport: vi.fn()
}));
vi.mock('../../quickopen/store', () => ({
  useQuickOpen: { getState: () => ({ toggleOrOpen: vi.fn() }) }
}));
vi.mock('../../search/symbols-store', () => ({
  useSymbols: { getState: () => ({ openPalette: vi.fn() }) }
}));
vi.mock('../../session-manager/open', () => ({
  closeSessionManager: vi.fn(),
  leaveSessionManagerFor: vi.fn(),
  openSessionManager: vi.fn(),
  otherLayerOpen: () => false,
  renameFocusedManageRow: vi.fn(),
  sheetIsTopLayer: () => false
}));
vi.mock('../shell-actions', () => ({
  focusedSessionRowId: () => null,
  modalLayerOpen: () =>
    store.remoteProjectOpen || store.sessionSheet !== null,
  showSearchAction: vi.fn(),
  showViewAction: vi.fn()
}));
vi.mock('../../bridge', () => ({
  gmuxBridge: () => ({
    onMenuAction: (deliver: (action: string) => void) => {
      h.menu.deliver = deliver;
      return () => {};
    }
  })
}));
// The sheet's two children are drawn by other files with their own tests; the
// element tree is read for the field this phase moves and nothing else.
vi.mock('../CreateSessionModal', () => ({
  MachineOptions: () => null,
  anyMachineNotReady: () => false
}));
vi.mock('../RemoteDirPicker', () => ({ RemoteDirPicker: () => null }));

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('window', {
  gmux: {
    machines: {
      rows: () =>
        new Promise((resolve) => {
          h.release = () => resolve({ rows: h.rows });
        })
    }
  }
});

const { OPEN_FOLDER_ON_PREFIX, OPEN_RECENT_ON_PREFIX } = await import('@shared/ipc');
const { createProjectsSlice } = await import('../../state/projects-slice');
const { runMenuAction, useMenuActions } = await import('../menu-actions');
const { RemoteProjectModal, startingMachineId } = await import(
  '../RemoteProjectModal'
);

/** The real slice, over a set and get that write the double above. */
function realSlice() {
  type Slice = ReturnType<typeof createProjectsSlice>;
  const set = (partial: unknown): void => {
    const next =
      typeof partial === 'function'
        ? (partial as (s: typeof store) => Partial<Slice>)(store)
        : (partial as Partial<Slice>);
    Object.assign(store, next);
  };
  const get = () => store;
  return (createProjectsSlice as unknown as (
    set: unknown,
    get: unknown,
    api: unknown
  ) => Slice)(set, get, {});
}

store.setRemoteProjectOpen = realSlice().setRemoteProjectOpen;

// The hook registers its listener once, through the effect it is.
rt.render(rt.instance(), () => useMenuActions());

function deliver(action: string): void {
  if (h.menu.deliver === null) throw new Error('useMenuActions registered nothing');
  h.menu.deliver(action);
}

function reset(): void {
  Object.assign(store, restingFields());
  h.toast.mockReset();
  h.openRecentOnMachine.mockReset();
  h.addProjectPath.mockReset();
  h.rows = [];
  h.release = null;
}

beforeEach(reset);

// ---------------------------------------------------------------------------
// 1. The action
// ---------------------------------------------------------------------------

describe('open-folder-on:<id> in the main window', () => {
  it('is the family the shared contract names', () => {
    // Builder A's constant, imported, never re-typed: the main side sends
    // `${OPEN_FOLDER_ON_PREFIX}${id}` and this window splits by the same text.
    expect(OPEN_FOLDER_ON_PREFIX).toBe('open-folder-on:');
  });

  it('opens the sheet on the machine it names', () => {
    deliver('open-folder-on:studio');
    expect(store.remoteProjectOpen).toBe(true);
    expect(store.remoteProjectMachineId).toBe('studio');
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('reaches neither Open Recent family, nor a folder on this Mac', () => {
    deliver('open-folder-on:studio');
    expect(h.openRecentOnMachine).not.toHaveBeenCalled();
    expect(h.addProjectPath).not.toHaveBeenCalled();
    // And the other way about: a recent row on a machine is still the
    // recent family's, and opens no sheet.
    reset();
    deliver(`${OPEN_RECENT_ON_PREFIX}studio:/srv/app`);
    expect(h.openRecentOnMachine).toHaveBeenCalledTimes(1);
    expect(store.remoteProjectOpen).toBe(false);
  });

  it('an id with nothing after the prefix opens the sheet naming no machine', () => {
    deliver('open-folder-on:');
    expect(store.remoteProjectOpen).toBe(true);
    expect(store.remoteProjectMachineId).toBeNull();
  });

  it('under the session manager it changes nothing, as File › Open Folder on a Machine… does', () => {
    store.sessionSheet = { tab: 'managed' };
    const before = snapshot();
    deliver('open-folder-on:studio');
    expect(snapshot()).toBe(before);
    expect(h.toast).not.toHaveBeenCalled();
    // The File menu's own door, for comparison: the same refusal.
    runMenuAction('open-remote-project');
    expect(snapshot()).toBe(before);
  });

  it('while the sheet is already open it changes nothing, so a folder typed there is kept', () => {
    store.remoteProjectOpen = true;
    store.remoteProjectMachineId = 'macpro';
    const before = snapshot();
    deliver('open-folder-on:studio');
    expect(snapshot()).toBe(before);
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('under a boot block it changes nothing, so no layer is left open over nothing', () => {
    store.bootBlock = 'tmux-missing';
    const before = snapshot();
    deliver('open-folder-on:studio');
    expect(snapshot()).toBe(before);
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('on a build that cannot open a folder on a machine it says what the File menu says', () => {
    store.canAdd = false;
    deliver('open-folder-on:studio');
    expect(store.remoteProjectOpen).toBe(false);
    expect(h.toast).toHaveBeenCalledTimes(1);
    const said = h.toast.mock.calls[0];
    h.toast.mockReset();
    runMenuAction('open-remote-project');
    expect(h.toast.mock.calls).toEqual([said]);
    expect(said).toEqual(['info', 'This build cannot open a folder on a machine.']);
  });

  it('the File menu door still opens the sheet naming no machine', () => {
    runMenuAction('open-remote-project');
    expect(store.remoteProjectOpen).toBe(true);
    expect(store.remoteProjectMachineId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. The slice
// ---------------------------------------------------------------------------

describe('setRemoteProjectOpen(open, machineId?)', () => {
  it('starts closed, naming no machine', () => {
    const slice = realSlice();
    expect(slice.remoteProjectOpen).toBe(false);
    expect(slice.remoteProjectMachineId).toBeNull();
  });

  it('writes the machine beside the flag', () => {
    store.setRemoteProjectOpen(true, 'studio');
    expect([store.remoteProjectOpen, store.remoteProjectMachineId]).toEqual([
      true,
      'studio'
    ]);
  });

  it('forgets it on close, so a later door never inherits it', () => {
    store.setRemoteProjectOpen(true, 'studio');
    store.setRemoteProjectOpen(false);
    expect([store.remoteProjectOpen, store.remoteProjectMachineId]).toEqual([
      false,
      null
    ]);
    store.setRemoteProjectOpen(true);
    expect(store.remoteProjectMachineId).toBeNull();
  });

  it('an opening that names none writes null, even over an open one that did', () => {
    store.setRemoteProjectOpen(true, 'studio');
    store.setRemoteProjectOpen(true);
    expect(store.remoteProjectMachineId).toBeNull();
  });

  it('an empty id, and any close, write null', () => {
    store.setRemoteProjectOpen(true, '');
    expect(store.remoteProjectMachineId).toBeNull();
    store.setRemoteProjectOpen(false, 'studio');
    expect([store.remoteProjectOpen, store.remoteProjectMachineId]).toEqual([
      false,
      null
    ]);
  });
});

// ---------------------------------------------------------------------------
// 3. The sheet
// ---------------------------------------------------------------------------

/** A row with quiet defaults; only the fields the sheet reads matter. */
function row(id: string, label: string, usable = true): MachineRowView {
  return { id, label, usable, ready: true } as unknown as MachineRowView;
}

const MACPRO = row('macpro', 'Mac Pro');
const STUDIO = row('studio', 'Studio');
const DRAFT = row('draft', 'Draft', false);

interface Element {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}

/** Every element in a tree React's JSX runtime returned, depth first. */
function elements(node: unknown): Element[] {
  if (node === null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  const el = node as Element;
  if (el.props === undefined) return [];
  return [el, ...elements(el.props.children)];
}

function field(tree: unknown, id: string): Element | undefined {
  return elements(tree).find((el) => el.props['id'] === id);
}

function folderLabel(tree: unknown): unknown {
  return elements(tree).find((el) => el.props['htmlFor'] === 'remote-project-dir')
    ?.props.children;
}

/** Open the sheet through the real setter, render it, and answer its list. */
async function openSheet(
  inst: ReturnType<typeof rt.instance>,
  rows: MachineRowView[],
  machineId?: string
): Promise<unknown> {
  h.rows = rows;
  store.setRemoteProjectOpen(true, machineId);
  rt.render(inst, () => RemoteProjectModal());
  h.release?.();
  await new Promise((done) => setTimeout(done, 0));
  return rt.render(inst, () => RemoteProjectModal());
}

describe('RemoteProjectModal starts on the machine the door named', () => {
  it('starts on it when the list holds it', async () => {
    const tree = await openSheet(rt.instance(), [MACPRO, STUDIO], 'studio');
    expect(field(tree, 'remote-project-machine')?.props['value']).toBe('studio');
    expect(folderLabel(tree)).toBe('Folder on Studio');
  });

  it('starts on the first machine when no door named one, as before this phase', async () => {
    const tree = await openSheet(rt.instance(), [MACPRO, STUDIO]);
    expect(field(tree, 'remote-project-machine')?.props['value']).toBe('macpro');
    expect(folderLabel(tree)).toBe('Folder on Mac Pro');
  });

  it('starts on the first machine when the named one is not in the list', async () => {
    const gone = await openSheet(rt.instance(), [MACPRO, STUDIO], 'gone');
    expect(field(gone, 'remote-project-machine')?.props['value']).toBe('macpro');
    // A row that is not confirmed is not in the list, whatever the door said.
    reset();
    const draft = await openSheet(rt.instance(), [MACPRO, DRAFT, STUDIO], 'draft');
    expect(field(draft, 'remote-project-machine')?.props['value']).toBe('macpro');
  });

  it('never replaces a machine the person chose while the list was being read', async () => {
    const inst = rt.instance();
    // A first opening leaves its list drawn for the next one, which is when a
    // choice can be made before the new list answers.
    await openSheet(inst, [MACPRO, STUDIO]);
    store.setRemoteProjectOpen(false);
    rt.render(inst, () => RemoteProjectModal());

    h.rows = [MACPRO, STUDIO];
    store.setRemoteProjectOpen(true, 'studio');
    rt.render(inst, () => RemoteProjectModal());
    const waiting = rt.render(inst, () => RemoteProjectModal());
    const select = field(waiting, 'remote-project-machine');
    expect(select, 'the previous list is not drawn while the new one is read').toBeDefined();
    (select?.props['onChange'] as (e: unknown) => void)({
      target: { value: 'macpro' }
    });
    h.release?.();
    await new Promise((done) => setTimeout(done, 0));
    const tree = rt.render(inst, () => RemoteProjectModal());
    expect(field(tree, 'remote-project-machine')?.props['value']).toBe('macpro');
  });

  it('draws nothing while closed', () => {
    expect(rt.render(rt.instance(), () => RemoteProjectModal())).toBeNull();
  });
});

describe('startingMachineId', () => {
  it('names the asked machine only when the list holds it, else the first, else none', () => {
    expect(startingMachineId([MACPRO, STUDIO], 'studio')).toBe('studio');
    expect(startingMachineId([MACPRO, STUDIO], null)).toBe('macpro');
    expect(startingMachineId([MACPRO, STUDIO], 'gone')).toBe('macpro');
    expect(startingMachineId([], 'studio')).toBeNull();
    expect(startingMachineId([], null)).toBeNull();
  });
});
