/**
 * PHASE 343 (its fix round). The Explorer's own HOOKS, DRIVEN, over links.
 *
 * WHY THIS FILE EXISTS. The verifier's attack broke seven clauses of the
 * phase's wiring one at a time, every one inside a hook (FileTree's open
 * gesture, `canDrag`, `canDrop`, `canRename`, the menu's selection rule, the
 * drag start's third door, the link row's New File destination), and every
 * phase test stayed green, because the tests drove the pure rules and never
 * the hooks that hand them to the library. With two of those breaks applied
 * together the whole suite passed. This file runs the SHIPPING hooks once each
 * and reads what they hand on, so each of those clauses has an owner here.
 *
 * HOW. Each hook is called as a plain function under a stand-in React whose
 * hooks are the identity (`useCallback` returns its callback, `useRef` a box,
 * `useEffect` does nothing), the attack's own method. The four stores the hooks
 * read are stood in by their values, @pierre/trees' model hook records the
 * options it is handed, and the bridges are a fake `window.gmux`. Nothing is
 * drawn, no effect runs, no process starts and no disk is touched: the listing
 * is the issue's own shape written as main's answer (`FsDirEntry`).
 *
 * WHAT IS PINNED, one owner per clause:
 *   H1  `useTreeModel` hands Pierre `canDrag`, `canDrop` and `canRename` that
 *       refuse a row under a link (and a drop into a link), and the row mark.
 *   H2  FileTree's own open gesture puts `throughLink` on a request exactly for
 *       a file under a link, and opens nothing for a link to a FIFO.
 *   H3  the menu `useTreeMenu` composes: a selection holding a row under a
 *       link loses every write; on the link row New File… lands BESIDE the
 *       link and Open With and History are kept, aimed at the link itself.
 *   H4  `useTreeDrag`: a drag of a row under a link starts nothing; a drop from
 *       Finder over the link row lands beside it; a move dropped over the link
 *       row lands beside it, on this Mac and on another machine, and over any
 *       other row the host leaves the drop to the library; over ANY row under
 *       a link (a file row included, whose folder the library reads as the
 *       link) nothing moves and no ring is drawn, on both computers (the
 *       narrow fix); a link at the root arms the root's ring; and the ring is
 *       drawn on the chain row that shows the folder holding the link. The
 *       folded-row fix: on a row that folds a link with the one folder it
 *       holds, a drop from Finder and a move land beside the link on the
 *       link's segment and off every segment, the outer segment is that
 *       folder, and a segment under the link lands nothing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FsDirEntry } from '@shared/types';

const h = vi.hoisted(() => {
  const state = <T extends object>(value: T) => {
    const hook = Object.assign((select: (s: T) => unknown) => select(value), {
      getState: () => value,
      setState: (patch: Partial<T>) => void Object.assign(value, patch),
      subscribe: () => () => undefined
    });
    return { value, hook };
  };
  return {
    state,
    pierre: null as null | Record<string, unknown>,
    menuOpts: null as null | Record<string, unknown>,
    selected: [] as string[],
    menus: [] as Array<{ items: Array<'sep' | { label: string; disabled?: boolean; run: () => void; submenu?: unknown }> }>,
    requested: [] as Array<Record<string, unknown>>,
    beginTreeDrag: vi.fn(() => true),
    startDrag: vi.fn(async () => undefined),
    openWithAsked: [] as string[],
    /** Every path an Open With LAUNCH handed main. */
    openWithLaunched: [] as string[],
    /** Every value a hook's state setter was handed, in order. */
    stateSets: [] as unknown[]
  };
});

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = {
    useState: (init: unknown) => [
      typeof init === 'function' ? (init as () => unknown)() : init,
      (value: unknown) => void h.stateSets.push(value)
    ],
    useRef: (value: unknown) => ({ current: value }),
    useMemo: (make: () => unknown) => make(),
    useCallback: (fn: unknown) => fn,
    useEffect: () => undefined,
    useLayoutEffect: () => undefined,
    useInsertionEffect: () => undefined,
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
    useId: () => 'p343',
    useReducer: (_reduce: unknown, init: unknown) => [init, () => undefined],
    useTransition: () => [false, (fn: () => void) => fn()],
    useDeferredValue: (value: unknown) => value
  };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});

vi.mock('@pierre/trees/react', () => ({
  useFileTree: (options: Record<string, unknown>) => {
    h.pierre = options;
    return {
      model: {
        getSelectedPaths: () => h.selected,
        getFocusedPath: () => h.selected[0] ?? null,
        getItem: () => null,
        isSearchOpen: () => false,
        getSearchValue: () => '',
        openSearch: () => undefined,
        closeSearch: () => undefined,
        subscribe: () => () => undefined
      }
    };
  },
  useFileTreeSearch: () => ({ isOpen: false, value: '', open() {}, close() {}, setValue() {} }),
  FileTree: () => null
}));

const tree = h.state({
  entriesByDir: {} as Record<string, FsDirEntry[]>,
  rootLoaded: true,
  loadDir: async () => undefined,
  relist: async () => undefined,
  forgetUnder: () => undefined,
  refreshLoaded: async () => undefined
});
vi.mock('../store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../store')>()),
  useFileTree: tree.hook
}));
vi.mock('../ignored', async (importOriginal) => {
  const ignored = h.state({
    ignored: new Set<string>(),
    epoch: 0,
    sync: async () => undefined,
    reset: () => undefined
  });
  return {
    ...(await importOriginal<typeof import('../ignored')>()),
    useTreeIgnored: ignored.hook
  };
});
vi.mock('../tree-handle', async (importOriginal) => {
  const handle = h.state({
    register: () => undefined,
    setFilterOpen: () => undefined,
    setExpandedCount: () => undefined
  });
  return {
    ...(await importOriginal<typeof import('../tree-handle')>()),
    useTreeHandle: handle.hook
  };
});
vi.mock('../../state/store', async (importOriginal) => {
  const app = h.state({
    setMenu: (menu: (typeof h.menus)[number] | null) => {
      if (menu !== null) h.menus.push(menu);
    },
    toast: () => undefined,
    setConfirm: () => undefined,
    showSidebarView: () => undefined,
    machineStates: []
  });
  return {
    ...(await importOriginal<typeof import('../../state/store')>()),
    useApp: app.hook
  };
});
vi.mock('../open-file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../open-file')>()),
  requestOpenFile: (req: Record<string, unknown>) => void h.requested.push(req)
}));
vi.mock('../../terminal/drop/tree-drag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../terminal/drop/tree-drag')>()),
  beginTreeDrag: h.beginTreeDrag
}));
vi.mock('../use-tree-rename', () => ({
  useTreeRename: () => ({ opsCreated: 1, nameError: null, createPending: false })
}));
vi.mock('../use-tree-menu', () => ({
  useTreeMenu: (options: Record<string, unknown>) => {
    h.menuOpts = options;
    return { onContextMenu: () => undefined };
  }
}));
vi.mock('../use-tree-drag', () => ({
  useTreeDrag: () => ({
    rootArmed: false,
    importHover: null,
    onDragStart: () => undefined,
    onDragOver: () => undefined,
    onDragLeave: () => undefined,
    onDrop: () => undefined,
    onDragEnd: () => undefined
  })
}));
vi.mock('../../pierre/theme-bridge', () => ({ treeStyles: {} }));
vi.mock('../../icons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../icons')>()),
  Codicon: () => null
}));

/**
 * An element the way the tree's rows read it: `instanceof HTMLElement`, a
 * `dataset` and `getAttribute`. Node has no DOM, so the global is stood in.
 */
class FakeElement {
  readonly dataset: Record<string, string> = {};
  /** The row a segment sits in, for `closest`. */
  parentRow: FakeElement | null = null;
  /** A chain row's segments, for `querySelectorAll` (the folded-row fix). */
  segments: FakeElement[] = [];
  rect = { top: 0, left: 0, width: 0, height: 0 };
  constructor(private readonly attrs: Record<string, string>) {
    for (const [name, value] of Object.entries(attrs)) {
      if (!name.startsWith('data-')) continue;
      const key = name.slice(5).replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      this.dataset[key] = value;
    }
  }
  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }
  closest(selector: string): FakeElement | null {
    if (selector === '[data-type="item"]') return this.attrs['data-type'] === 'item' ? this : this.parentRow;
    return null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    return selector === '[data-item-flattened-subitem]' ? this.segments : [];
  }
  getBoundingClientRect(): { top: number; left: number; width: number; height: number } {
    return this.rect;
  }
}
vi.stubGlobal('HTMLElement', FakeElement);
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('window', {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
  gmux: {
    pathForFile: (file: { path: string }) => file.path,
    fs: {
      trash: async () => undefined,
      rename: async () => undefined,
      createFile: async () => undefined,
      createFolder: async () => undefined,
      move: async () => undefined,
      duplicate: async () => undefined,
      importPaths: async () => undefined,
      reveal: async () => undefined,
      startDrag: h.startDrag,
      openWith: async (input: { path: string }) => {
        h.openWithLaunched.push(input.path);
        return { status: 'opened' };
      },
      openWithApps: async (input: { path: string }) => {
        h.openWithAsked.push(input.path);
        return { status: 'unavailable' };
      }
    }
  }
});

const { TREE_DRAG_MIME } = await import('../../terminal/drop/tree-drag');
const { useTreeModel } = await import('../use-tree-model');
const { FileTree } = await import('../FileTree');
const realMenu = await vi.importActual<typeof import('../use-tree-menu')>('../use-tree-menu');
const realDrag = await vi.importActual<typeof import('../use-tree-drag')>('../use-tree-drag');
type Bridge = ReturnType<typeof useTreeModel>;

// ---------------------------------------------------------------------------
// The listing: the issue's shape, as main answers it
// ---------------------------------------------------------------------------

const ROOT = '/p/proj';
function entry(dir: string, name: string, kind: FsDirEntry['kind'], link?: FsDirEntry['link']): FsDirEntry {
  const path = `${dir}/${name}`;
  return link === undefined ? { name, path, kind } : { name, path, kind, link };
}
const LISTING: Record<string, FsDirEntry[]> = {
  [ROOT]: [
    entry(ROOT, '.agent', 'dir'),
    entry(ROOT, '.claude', 'dir'),
    entry(ROOT, 'src', 'dir'),
    entry(ROOT, 'linkOut', 'symlink', 'dir'),
    entry(ROOT, 'linkFile', 'symlink', 'file'),
    entry(ROOT, 'linkPipe', 'symlink', 'other'),
    entry(ROOT, 'README.md', 'file')
  ],
  [`${ROOT}/.claude`]: [entry(`${ROOT}/.claude`, 'skills', 'symlink', 'dir')],
  [`${ROOT}/.claude/skills`]: [
    entry(`${ROOT}/.claude/skills`, 'a-skill', 'dir'),
    entry(`${ROOT}/.claude/skills`, 'notes.md', 'file')
  ],
  [`${ROOT}/linkOut`]: [entry(`${ROOT}/linkOut`, 'secret.txt', 'file')],
  [`${ROOT}/src`]: [entry(`${ROOT}/src`, 'a.ts', 'file')]
};
/**
 * THE FOLDED-ROW FIX's shapes, the reverify's own: `.claude3` holds only a link
 * that holds only one folder, drawn as ONE chain row `.claude3 / skills / only`
 * whose path is `.claude3/skills/only/`, under the link; and `hold` holds a
 * file beside a link that holds only one folder, drawn `onefold / only` with
 * the link as its FIRST segment.
 */
const FOLDED: Record<string, FsDirEntry[]> = {
  ...LISTING,
  [ROOT]: [...(LISTING[ROOT] ?? []), entry(ROOT, '.claude3', 'dir'), entry(ROOT, 'hold', 'dir')],
  [`${ROOT}/.claude3`]: [entry(`${ROOT}/.claude3`, 'skills', 'symlink', 'dir')],
  [`${ROOT}/.claude3/skills`]: [entry(`${ROOT}/.claude3/skills`, 'only', 'dir')],
  [`${ROOT}/.claude3/skills/only`]: [entry(`${ROOT}/.claude3/skills/only`, 'x.md', 'file')],
  [`${ROOT}/hold`]: [entry(`${ROOT}/hold`, 'onefold', 'symlink', 'dir'), entry(`${ROOT}/hold`, 'h.txt', 'file')],
  [`${ROOT}/hold/onefold`]: [entry(`${ROOT}/hold/onefold`, 'only', 'dir')],
  [`${ROOT}/hold/onefold/only`]: [entry(`${ROOT}/hold/onefold/only`, 'y.md', 'file')]
};

const LOCAL = { rootPath: ROOT, remote: null, isRemote: false, remoteWriteFolder: null, statusFiles: [], isRepo: true, density: 'comfortable' } as const;
const MACHINE = {
  machineId: 'm1',
  label: 'Studio',
  writeFolder: ROOT,
  readOnlyNote: 'Tortie changes files on Studio only inside a project you opened there.'
};

const ops = {
  pendingPath: () => null,
  newEntry: vi.fn(),
  startRename: vi.fn(),
  duplicate: vi.fn(),
  trash: vi.fn(),
  drop: vi.fn(),
  importPaths: vi.fn()
};

function bridgeOf(remote: typeof MACHINE | null = null): Bridge {
  const bridge = useTreeModel(
    remote === null
      ? (LOCAL as never)
      : ({ ...LOCAL, remote, isRemote: true, remoteWriteFolder: remote.writeFolder } as never)
  );
  (bridge.opsRef as { current: unknown }).current = ops;
  return bridge;
}

beforeEach(() => {
  tree.value.entriesByDir = LISTING;
  h.selected = [];
  h.menus.length = 0;
  h.requested.length = 0;
  h.openWithAsked.length = 0;
  h.openWithLaunched.length = 0;
  h.stateSets.length = 0;
  h.beginTreeDrag.mockClear();
  h.startDrag.mockClear();
  for (const fn of [ops.newEntry, ops.startRename, ops.duplicate, ops.trash, ops.drop, ops.importPaths]) fn.mockClear();
});
afterEach(() => {
  h.pierre = null;
  h.menuOpts = null;
});

// ---------------------------------------------------------------------------
// H1. What useTreeModel hands Pierre
// ---------------------------------------------------------------------------

describe('H1 what useTreeModel hands the library', () => {
  type Dnd = { canDrag(p: readonly string[]): boolean; canDrop(e: unknown): boolean };
  const drop = (dir: string | null): unknown => ({
    draggedPaths: ['README.md'],
    target: { directoryPath: dir, flattenedSegmentPath: null, hoveredPath: dir, kind: dir === null ? 'root' : 'directory' }
  });

  it('canDrag refuses any row under a link, alone or in a selection, and keeps the link row', () => {
    bridgeOf();
    const dnd = h.pierre?.['dragAndDrop'] as Dnd;
    expect(dnd.canDrag(['.claude/skills/notes.md'])).toBe(false);
    expect(dnd.canDrag(['linkOut/secret.txt'])).toBe(false);
    expect(dnd.canDrag(['README.md', '.claude/skills/a-skill/'])).toBe(false);
    expect(dnd.canDrag(['README.md'])).toBe(true);
    expect(dnd.canDrag(['.claude/skills/'])).toBe(true);
  });

  it('canDrop refuses a folder at or under a link, and nothing else of it', () => {
    bridgeOf();
    const dnd = h.pierre?.['dragAndDrop'] as Dnd;
    expect(dnd.canDrop(drop('.claude/skills/'))).toBe(false);
    expect(dnd.canDrop(drop('.claude/skills/a-skill/'))).toBe(false);
    expect(dnd.canDrop(drop('linkOut/'))).toBe(false);
    expect(dnd.canDrop(drop('src/'))).toBe(true);
    expect(dnd.canDrop(drop('.claude/'))).toBe(true);
    expect(dnd.canDrop(drop(null))).toBe(true);
  });

  it('canRename refuses a row under a link and keeps the link row', () => {
    bridgeOf();
    const ren = h.pierre?.['renaming'] as { canRename(item: { path: string; isFolder: boolean }): boolean };
    expect(ren.canRename({ path: '.claude/skills/notes.md', isFolder: false })).toBe(false);
    expect(ren.canRename({ path: '.claude/skills/a-skill/', isFolder: true })).toBe(false);
    expect(ren.canRename({ path: 'README.md', isFolder: false })).toBe(true);
    expect(ren.canRename({ path: '.claude/skills/', isFolder: true })).toBe(true);
  });

  it('marks the link rows and no other row', () => {
    bridgeOf();
    const deco = h.pierre?.['renderRowDecoration'] as (ctx: unknown) => { text: string } | null;
    const mark = (path: string): string | null =>
      deco({ item: { path, kind: path.endsWith('/') ? 'directory' : 'file', name: path }, row: {} })?.text ?? null;
    expect(mark('.claude/skills/')).toBe('⤷');
    expect(mark('linkOut/')).toBe('⤷');
    expect(mark('linkFile')).toBe('⤷');
    expect(mark('README.md')).toBeNull();
    expect(mark('.claude/skills/notes.md')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// H2. FileTree's own open gesture
// ---------------------------------------------------------------------------

describe("H2 FileTree's open gesture", () => {
  const openRelOf = (): ((canonical: string, keep?: boolean) => void) => {
    FileTree(LOCAL as never);
    return h.menuOpts?.['openRel'] as (canonical: string, keep?: boolean) => void;
  };

  it('opens a file under a link with throughLink, on a click and for keeps', () => {
    const openRel = openRelOf();
    openRel('.claude/skills/notes.md');
    openRel('linkOut/secret.txt', true);
    expect(h.requested.map((r) => [r['relPath'], r['throughLink']])).toEqual([
      ['.claude/skills/notes.md', true],
      ['linkOut/secret.txt', true]
    ]);
  });

  it('puts no flag on any other open: a plain file, a link to a file, the link row by its own name', () => {
    const openRel = openRelOf();
    openRel('README.md');
    openRel('linkFile');
    openRel('.claude/skills', true);
    expect(h.requested).toHaveLength(3);
    for (const req of h.requested) expect('throughLink' in req).toBe(false);
  });

  it('opens nothing for a link to a FIFO', () => {
    const openRel = openRelOf();
    openRel('linkPipe');
    expect(h.requested).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// H3. The menu useTreeMenu composes
// ---------------------------------------------------------------------------

type Item = { label: string; disabled?: boolean; run: () => void; submenu?: unknown };

describe('H3 the menu the hook composes', () => {
  const opened: Array<[string, boolean | undefined]> = [];
  async function menuOf(bridge: Bridge, path: string, selected: string[] = []): Promise<Item[]> {
    h.selected = selected;
    h.menus.length = 0;
    (bridge.openMenuRef as { current: ((item: unknown, ctx: unknown) => void) | null }).current?.(
      { path },
      { anchorRect: { left: 0, bottom: 0 }, close: () => undefined }
    );
    for (let i = 0; i < 200 && h.menus.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    return (h.menus[0]?.items ?? []).filter((one): one is Item => one !== 'sep');
  }
  function mount(remote: typeof MACHINE | null = null): Bridge {
    opened.length = 0;
    const bridge = bridgeOf(remote);
    realMenu.useTreeMenu({
      rootPath: ROOT,
      remote: remote as never,
      isRemote: remote !== null,
      remoteWriteFolder: remote?.writeFolder ?? null,
      model: bridge.model,
      treeInput: bridge.treeInput,
      opsRef: bridge.opsRef,
      openMenuRef: bridge.openMenuRef,
      openRel: (canonical, keep) => void opened.push([canonical, keep])
    });
    return bridge;
  }
  const labels = (items: Item[]): string[] => items.map((one) => one.label);
  const WRITES = ['New File…', 'New Folder…', 'Rename…', 'Duplicate', 'Move to Trash', 'History'];

  it('a row under a link offers nothing that writes and ends with the link footnote', async () => {
    const got = labels(await menuOf(mount(), '.claude/skills/notes.md'));
    for (const absent of WRITES) expect(got).not.toContain(absent);
    expect(got[got.length - 1]).toBe('Read only through a link');
  });

  it('a plain row inside a SELECTION holding a row under a link loses every write too', async () => {
    const got = labels(await menuOf(mount(), 'README.md', ['README.md', '.claude/skills/notes.md']));
    expect(got.some((label) => label.includes('Trash'))).toBe(false);
    expect(got).not.toContain('Rename…');
    expect(got[got.length - 1]).toBe('Read only through a link');
    // Control: the same row alone keeps them.
    const alone = labels(await menuOf(mount(), 'README.md', ['README.md']));
    expect(alone).toContain('Move to Trash');
  });

  it('New File… on the link row lands in the folder holding the link, as it did on the leaf', async () => {
    const bridge = mount();
    const items = await menuOf(bridge, '.claude/skills/');
    items.find((one) => one.label === 'New File…')?.run();
    items.find((one) => one.label === 'New Folder…')?.run();
    expect(ops.newEntry.mock.calls).toEqual([
      ['.claude/', 'file'],
      ['.claude/', 'dir']
    ]);
    // Control: a real folder's New File… lands inside it.
    (await menuOf(bridge, 'src/')).find((one) => one.label === 'New File…')?.run();
    expect(ops.newEntry.mock.calls[2]).toEqual(['src/', 'file']);
  });

  it('the link row keeps Open With and History, both aimed at the link itself', async () => {
    const items = await menuOf(mount(), '.claude/skills/');
    const got = labels(items);
    expect(got.slice(0, 3)).toEqual(['Open With', 'History', 'New File…']);
    expect(got).not.toContain('Open');
    expect(h.openWithAsked).toEqual([`${ROOT}/.claude/skills`]);
    // THE NARROW FIX: the launch itself hands main the link, not a path past it.
    const submenu = (items.find((one) => one.label === 'Open With')?.submenu ?? []) as Array<'sep' | Item>;
    const launch = submenu.find((one): one is Item => one !== 'sep' && one.label === 'Open in Default App');
    expect(launch).toBeDefined();
    launch?.run();
    expect(h.openWithLaunched).toEqual([`${ROOT}/.claude/skills`]);
    items.find((one) => one.label === 'History')?.run();
    expect(opened).toEqual([['.claude/skills', true]]);
    expect(got).not.toContain('Read only through a link');
  });

  it('on another machine the link row keeps neither, as a far folder never had them', async () => {
    const got = labels(await menuOf(mount(MACHINE), '.claude/skills/'));
    expect(got).not.toContain('Open With');
    expect(got).not.toContain('History');
    expect(h.openWithAsked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// H4. The drag hook
// ---------------------------------------------------------------------------

describe('H4 the drag hook', () => {
  const row = (path: string, parent?: string): FakeElement =>
    new FakeElement({
      'data-type': 'item',
      'data-item-path': path,
      'data-item-type': path.endsWith('/') ? 'folder' : 'file',
      ...(parent === undefined ? {} : { 'data-item-parent-path': parent })
    });
  const segment = (path: string): FakeElement => new FakeElement({ 'data-item-flattened-subitem': path });

  interface FakeDragEvent {
    defaultPrevented: boolean;
    preventDefault(): void;
    stopPropagation(): void;
    relatedTarget: null;
    dataTransfer: { dropEffect: string; types: string[] };
    nativeEvent: {
      composedPath(): FakeElement[];
      dataTransfer: { types: string[]; files: Array<{ path: string }>; getData(): string };
      altKey: boolean;
      metaKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      defaultPrevented: boolean;
    };
  }
  function event(path: FakeElement[], kind: 'tree' | 'finder', alt = false): FakeDragEvent {
    const types = kind === 'tree' ? [TREE_DRAG_MIME] : ['Files'];
    const e: FakeDragEvent = {
      defaultPrevented: false,
      preventDefault() {
        e.defaultPrevented = true;
        e.nativeEvent.defaultPrevented = true;
      },
      stopPropagation: () => undefined,
      relatedTarget: null,
      dataTransfer: { dropEffect: 'none', types },
      nativeEvent: {
        composedPath: () => path,
        dataTransfer: { types, files: [{ path: '/elsewhere/dropped.txt' }], getData: () => '' },
        altKey: alt,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        defaultPrevented: false
      }
    };
    return e;
  }
  type Handlers = ReturnType<typeof realDrag.useTreeDrag>;
  function mount(
    remote: typeof MACHINE | null = null,
    drawn: { host: FakeElement; rows: FakeElement[]; segments: FakeElement[] } | null = null
  ): Handlers {
    const bridge = bridgeOf(remote);
    return realDrag.useTreeDrag({
      rootPath: ROOT,
      isRemote: remote !== null,
      remoteLabel: remote?.label ?? null,
      model: bridge.model,
      hostRef: { current: (drawn?.host ?? null) as never },
      opsRef: bridge.opsRef,
      linksRef: bridge.linksRef,
      treeShadow: () =>
        (drawn === null
          ? null
          : {
              querySelectorAll: (selector: string) =>
                selector === '[data-item-path]' ? drawn.rows : selector === '[data-item-flattened-subitem]' ? drawn.segments : []
            }) as never
    });
  }
  /** A move started on `from` (with `selected` held), then dropped over `over`. */
  function move(drag: Handlers, from: string, over: FakeElement[]): FakeDragEvent {
    h.selected = [from];
    drag.onDragStart(event([row(from)], 'tree') as never);
    const hover = event(over, 'tree');
    drag.onDragOver(hover as never);
    drag.onDrop(event(over, 'tree') as never);
    return hover;
  }

  it('a drag of a row under a link starts nothing: no attach, no drag out', () => {
    const drag = mount();
    for (const alt of [false, true]) {
      h.selected = ['.claude/skills/notes.md'];
      const start = event([row('.claude/skills/notes.md', '.claude/skills/')], 'tree', alt);
      drag.onDragStart(start as never);
      expect(start.defaultPrevented).toBe(true);
    }
    expect(h.beginTreeDrag).not.toHaveBeenCalled();
    expect(h.startDrag).not.toHaveBeenCalled();
    // Control: a plain row arms the attach.
    h.selected = ['README.md'];
    drag.onDragStart(event([row('README.md')], 'tree') as never);
    expect(h.beginTreeDrag).toHaveBeenCalledTimes(1);
  });

  it('a drop from Finder over the link row lands BESIDE it; under it, nothing', () => {
    const drag = mount();
    const over = [row('.claude/skills/', '.claude/')];
    const hover = event(over, 'finder');
    drag.onDragOver(hover as never);
    expect(hover.defaultPrevented).toBe(true);
    drag.onDrop(event(over, 'finder') as never);
    expect(ops.importPaths.mock.calls).toEqual([[['/elsewhere/dropped.txt'], '.claude/', 0]]);

    const under = [row('.claude/skills/notes.md', '.claude/skills/')];
    const refused = event(under, 'finder');
    drag.onDragOver(refused as never);
    expect(refused.defaultPrevented).toBe(false);
    drag.onDrop(event(under, 'finder') as never);
    expect(ops.importPaths).toHaveBeenCalledTimes(1);
  });

  it('a move dropped over the link row lands in the folder holding it, as it did on the leaf', () => {
    const hover = move(mount(), 'README.md', [row('.claude/skills/', '.claude/')]);
    expect(hover.defaultPrevented).toBe(true);
    expect(hover.dataTransfer.dropEffect).toBe('move');
    expect(ops.drop.mock.calls).toEqual([[['README.md'], '.claude/', false]]);
  });

  it('a move over a link at the root lands at the root, under the root\'s ring', () => {
    const drag = mount();
    const sets = h.stateSets.length;
    move(drag, 'src/a.ts', [row('linkOut/')]);
    expect(ops.drop.mock.calls).toEqual([[['src/a.ts'], '', false]]);
    // THE NARROW FIX (the reverify's r5): the dragover armed the ROOT's ring,
    // the one the empty space draws, and no row ring; the drop put it out.
    expect(h.stateSets.slice(sets)).toEqual([true, false]);
  });

  it('over the link SEGMENT of a chain row it lands beside the link; over the outer segment the library owns it', () => {
    const drag = mount();
    move(drag, 'README.md', [segment('.claude/skills/'), row('.claude/skills/')]);
    expect(ops.drop.mock.calls).toEqual([[['README.md'], '.claude/', false]]);
    ops.drop.mockClear();
    const outer = move(drag, 'README.md', [segment('.claude/'), row('.claude/skills/')]);
    expect(outer.defaultPrevented).toBe(false);
    expect(ops.drop).not.toHaveBeenCalled();
  });

  it('over any other row the host carries nothing: the library owns that drop', () => {
    const drag = mount();
    for (const over of [[row('src/')], [row('src/a.ts', 'src/')], [row('.claude/skills/a-skill/', '.claude/skills/')]]) {
      const hover = move(drag, 'README.md', over);
      expect(hover.defaultPrevented).toBe(false);
    }
    expect(ops.drop).not.toHaveBeenCalled();
  });

  // THE NARROW FIX (2026-10-07, his ruling): everything under a link is read
  // only, so a move dropped over ANY row under a link is refused like the
  // folder row's, with no ring, on both computers. Before it a FILE row
  // directly inside the link (whose folder the library reads as the link) was
  // carried beside the link, into `.claude/`, with `.claude/` ringed.
  it('a move dropped over ANY row under a link is refused with no ring, on this Mac and on another machine; the link row still lands beside it', () => {
    for (const remote of [null, MACHINE]) {
      const drag = mount(remote);
      for (const over of [
        [row('.claude/skills/notes.md', '.claude/skills/')],
        [row('.claude/skills/a-skill/', '.claude/skills/')]
      ]) {
        // THE FOLDED-ROW FIX's nit (the reverify's rv-x3 and rv-x4): a ring is
        // LIT first, in the same mount, so the refusal must put it out. Over
        // the link row the row ring is lit (the refusal sets it to null); over
        // a link at the root and over the empty space the root's ring is (the
        // refusal sets it to false).
        for (const [first, putOut] of [
          [[row('.claude/skills/', '.claude/')], null],
          [[row('linkOut/')], false],
          [[], false]
        ] as const) {
          h.selected = ['README.md'];
          drag.onDragStart(event([row('README.md')], 'tree') as never);
          const lit = event([...first], 'tree');
          drag.onDragOver(lit as never);
          expect(lit.defaultPrevented).toBe(true);
          const sets = h.stateSets.length;
          const hover = event(over, 'tree');
          drag.onDragOver(hover as never);
          expect(hover.defaultPrevented).toBe(false);
          expect(hover.dataTransfer.dropEffect).toBe('none');
          // The one ring that was lit is put out, and nothing else is set.
          expect(h.stateSets.slice(sets)).toEqual([putOut]);
          drag.onDrop(event(over, 'tree') as never);
          expect(ops.drop).not.toHaveBeenCalled();
        }
      }
      expect(ops.drop).not.toHaveBeenCalled();
      // The link row itself, in the same mount, still lands beside it, ringed.
      const sets = h.stateSets.length;
      const hover = move(drag, 'README.md', [row('.claude/skills/', '.claude/')]);
      expect(hover.defaultPrevented).toBe(true);
      expect(ops.drop.mock.calls).toEqual([[['README.md'], '.claude/', false]]);
      expect(h.stateSets.slice(sets)).toContainEqual({ dest: '.claude/', box: null, refused: false });
      ops.drop.mockClear();
    }
  });

  it('rings the CHAIN ROW that shows the folder holding the link, never the whole box', () => {
    // `.claude` holds only the link, so it is drawn as `.claude / skills` and
    // has no row of its own; the drop lands in `.claude/`, which that row shows.
    const host = new FakeElement({});
    host.rect = { top: 100, left: 10, width: 300, height: 600 };
    const chain = row('.claude/skills/');
    chain.rect = { top: 124, left: 10, width: 300, height: 22 };
    const outer = segment('.claude/');
    const inner = segment('.claude/skills/');
    outer.parentRow = chain;
    inner.parentRow = chain;
    const drag = mount(null, { host, rows: [chain], segments: [outer, inner] });
    drag.onDragOver(event([inner, chain], 'finder') as never);
    expect(h.stateSets).toContainEqual({
      dest: '.claude/',
      box: { top: 24, left: 0, width: 300, height: 22 },
      refused: false
    });
  });

  it('on another machine the same move lands beside the link, as on this Mac', () => {
    move(mount(MACHINE), 'README.md', [row('.claude/skills/', '.claude/')]);
    expect(ops.drop.mock.calls).toEqual([[['README.md'], '.claude/', false]]);
  });

  // -------------------------------------------------------------------------
  // THE FOLDED-ROW FIX (2026-10-07, his ruling "Tiny fix + recheck that case").
  // Once a link holding exactly one folder is opened, the library folds the
  // link and that folder into ONE chain row whose path is its deepest folder,
  // under the link. Before the fix a drop from Finder read the row and never
  // the segment, so it landed nothing anywhere on that row, and a move off
  // every segment (the row's icon) landed nothing; at the parent both landed
  // beside the link.
  // -------------------------------------------------------------------------

  /** A chain row as the library draws it, its segments inside it, and a point on it off every segment. */
  const chainOf = (paths: string[]): { row: FakeElement; on(path: string): FakeElement[]; icon: FakeElement[] } => {
    const chainRow = row(paths[paths.length - 1] as string);
    chainRow.segments = paths.map((path) => {
      const one = segment(path);
      one.parentRow = chainRow;
      return one;
    });
    return {
      row: chainRow,
      on: (path) => [chainRow.segments[paths.indexOf(path)] as FakeElement, chainRow],
      icon: [new FakeElement({}), chainRow]
    };
  };

  it('THE FOLDED ROW from Finder: on the link segment, the outer segment and off every segment it lands beside the link, ringing the chain row; under the link nothing', () => {
    tree.value.entriesByDir = FOLDED;
    const c3 = chainOf(['.claude3/', '.claude3/skills/', '.claude3/skills/only/']);
    const hold = chainOf(['hold/onefold/', 'hold/onefold/only/']);
    const host = new FakeElement({});
    host.rect = { top: 100, left: 10, width: 300, height: 600 };
    c3.row.rect = { top: 124, left: 10, width: 300, height: 22 };
    const drag = mount(null, { host, rows: [c3.row, hold.row], segments: [...c3.row.segments, ...hold.row.segments] });
    const finder = (over: FakeElement[]): string | null => {
      ops.importPaths.mockClear();
      const hover = event(over, 'finder');
      drag.onDragOver(hover as never);
      drag.onDrop(event(over, 'finder') as never);
      const dest = (ops.importPaths.mock.calls[0]?.[1] as string | undefined) ?? null;
      expect(hover.defaultPrevented).toBe(dest !== null);
      return dest;
    };
    expect(finder(c3.on('.claude3/skills/'))).toBe('.claude3/');
    expect(finder(c3.on('.claude3/'))).toBe('.claude3/');
    const sets = h.stateSets.length;
    expect(finder(c3.icon)).toBe('.claude3/');
    // `.claude3` has no row of its own: the chain row that shows it is ringed.
    expect(h.stateSets.slice(sets)).toContainEqual({
      dest: '.claude3/',
      box: { top: 24, left: 0, width: 300, height: 22 },
      refused: false
    });
    expect(finder(c3.on('.claude3/skills/only/'))).toBeNull();
    // The link as the chain's FIRST segment.
    expect(finder(hold.on('hold/onefold/'))).toBe('hold/');
    expect(finder(hold.icon)).toBe('hold/');
    expect(finder(hold.on('hold/onefold/only/'))).toBeNull();
  });

  it('THE FOLDED ROW moved in the tree: on the link segment and off every segment it lands beside the link; the outer segment is the library\'s; under the link nothing, with no ring, on both computers', () => {
    tree.value.entriesByDir = FOLDED;
    const dropAt = (dir: string): unknown => ({
      draggedPaths: ['README.md'],
      target: { directoryPath: dir, flattenedSegmentPath: null, hoveredPath: dir, kind: 'directory' }
    });
    for (const remote of [null, MACHINE]) {
      const drag = mount(remote);
      const dnd = h.pierre?.['dragAndDrop'] as { canDrop(e: unknown): boolean };
      const c3 = chainOf(['.claude3/', '.claude3/skills/', '.claude3/skills/only/']);
      const hold = chainOf(['hold/onefold/', 'hold/onefold/only/']);
      const moved = (over: FakeElement[]): { dest: string | null; rings: unknown[] } => {
        ops.drop.mockClear();
        const sets = h.stateSets.length;
        const hover = move(drag, 'README.md', over);
        const dest = (ops.drop.mock.calls[0]?.[1] as string | undefined) ?? null;
        expect(hover.defaultPrevented).toBe(dest !== null);
        return { dest, rings: h.stateSets.slice(sets) };
      };
      const beside = (dest: string): { dest: string; rings: unknown[] } => ({
        dest,
        rings: [{ dest, box: null, refused: false }, null]
      });
      expect(moved(c3.on('.claude3/skills/'))).toEqual(beside('.claude3/'));
      expect(moved(c3.icon)).toEqual(beside('.claude3/'));
      expect(moved(c3.on('.claude3/skills/only/'))).toEqual({ dest: null, rings: [] });
      expect(moved(hold.on('hold/onefold/'))).toEqual(beside('hold/'));
      expect(moved(hold.icon)).toEqual(beside('hold/'));
      expect(moved(hold.on('hold/onefold/only/'))).toEqual({ dest: null, rings: [] });
      // The outer segment is an ordinary folder, beside the link: the library
      // moves the rows into it, and the host carries nothing a second time.
      expect(moved(c3.on('.claude3/'))).toEqual({ dest: null, rings: [] });
      // Off every segment the library aims at the deepest folder, under the
      // link, and refuses it, so the host's move is the only one. (Asked on
      // this Mac: this rig's fake bridge has no `machines` member, so on a
      // machine the library's `canDrop` refuses every folder here.)
      if (remote === null) {
        expect(dnd.canDrop(dropAt('.claude3/'))).toBe(true);
        expect(dnd.canDrop(dropAt('.claude3/skills/only/'))).toBe(false);
      }
    }
  });
});
