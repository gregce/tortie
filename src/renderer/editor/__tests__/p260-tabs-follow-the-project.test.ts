/**
 * PHASE 260 — TABS FOLLOW THE PROJECT (issue 19, research 119).
 *
 * The reporter's caveat is the phase's one hard rule: a project switch HIDES
 * the other project's tabs and never closes them, because a close is
 * destructive three ways at once (`forceCloseTab`: the Monaco model and its
 * undo, the view state, the rewind journal). So the proof here is not that the
 * hidden tabs are still in the list — it is that the OBJECTS behind them are
 * the same objects after a round trip: `getWorkingModel(id)`, `takeViewState(id)`
 * and `lastRewind(id)` answer by identity (`toBe`), never by shape.
 *
 * And research 119 §3's trap: `MAX_TABS` evicts the stalest clean tab, and a
 * hidden project's tabs are by construction the stalest, so at the parent the
 * eleventh open in the active project took a hidden tab, journal and all. That
 * case is RED at the parent commit (38993888) — run there by putting the
 * parent's store.ts and tab-types.ts back — and green here.
 *
 * The switch is driven the way the app drives it, through the app store's
 * `setActiveProject`, which `init()` subscribes the editor to; nothing here
 * calls `switchProject` directly except the one case that pins it as a no-op.
 * The Monaco instance is a fake that hands out plain objects, which is all
 * identity needs.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {},
    setProjectsPosition: async () => {},
    fs: {
      readFile: async () => ({ contents: 'hello\n', truncated: false }),
      readImage: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn()
    },
    git: { showHead: async () => '', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const { useApp } = await import('../../state/store');
const {
  disposeModels,
  dropViewState,
  getWorkingModel,
  saveViewState,
  takeViewState,
  workingModel
} = await import('../monaco-loader');
const { forgetRewindJournal, lastRewind, recordRewind, rewindJournalDepth } =
  await import('../redline-journal');

type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type Monaco = Parameters<typeof workingModel>[0];

const A = { id: 'proj-a', path: '/work/alpha', name: 'alpha' };
const B = { id: 'proj-b', path: '/work/beta', name: 'beta' };
const C = { id: 'proj-c', path: '/work/gamma', name: 'gamma' };

/** A Monaco that hands out plain objects: identity is all these checks need. */
const fakeMonaco = {
  Uri: { from: (o: { scheme: string; path: string }) => ({ ...o }) },
  editor: {
    getModel: () => null,
    createModel: (contents: string, language: string, uri: unknown) => {
      let disposed = false;
      return {
        uri,
        contents,
        language,
        isDisposed: () => disposed,
        dispose: () => {
          disposed = true;
        },
        updateOptions() {}
      };
    }
  }
} as unknown as Monaco;

const flush = (): Promise<unknown> => new Promise((done) => setTimeout(done, 0));

function request(
  root: string,
  name: string,
  keep = true,
  extra: Partial<OpenFileRequest> = {}
): OpenFileRequest {
  return {
    repoPath: root,
    relPath: name,
    path: `${root}/${name}`,
    mode: 'file',
    source: 'tree',
    ...(keep ? { preview: false as const } : {}),
    ...extra
  };
}

/** Open one file for keeps and answer with the id the store gave it. */
async function open(root: string, name: string, keep = true): Promise<string> {
  useEditor.getState().openFromRequest(request(root, name, keep));
  await flush();
  const id = useEditor.getState().activeId;
  expect(id, `no active tab after opening ${name}`).not.toBeNull();
  return id as string;
}

/** Everything a close destroys, seeded so identity can be asked of it. */
function seed(id: string): {
  model: unknown;
  view: unknown;
  entry: unknown;
} {
  const model = workingModel(fakeMonaco, id, 'seed', 'plaintext');
  const view = { cursorState: [], viewState: { id } };
  saveViewState(id, view as never);
  const entry = { off: 0, del: 'was', ins: 'now', generation: 1 };
  recordRewind(id, entry);
  touched.add(id);
  return { model, view, entry };
}

const touched = new Set<string>();
const switchTo = (projectId: string): void => {
  useApp.getState().setActiveProject(projectId);
};
const openIds = (): string[] => useEditor.getState().tabs.map((t) => t.id);

beforeAll(() => {
  useApp.setState({ projects: [A, B, C], activeProjectId: A.id });
  // The subscription that makes the editor follow the active project lives in
  // init(); the app calls it once from EditorPanel's mount.
  useEditor.getState().init();
});

beforeEach(() => {
  for (const id of touched) {
    disposeModels(id);
    dropViewState(id);
    forgetRewindJournal(id);
  }
  touched.clear();
  useEditor.setState({
    tabs: [],
    activeId: null,
    panelOpen: false,
    projectId: A.id,
    activeIdByProject: {},
    panelOpenByProject: {}
  });
  useApp.setState({ projects: [A, B, C], activeProjectId: A.id });
});

describe('hidden is not closed', () => {
  it('a round trip through three projects keeps the SAME model, view state and journal objects', async () => {
    const a1 = await open(A.path, 'a1.ts');
    const a2 = await open(A.path, 'a2.ts');
    const seeded = { a1: seed(a1), a2: seed(a2) };

    switchTo(B.id);
    const b1 = await open(B.path, 'b1.ts');
    switchTo(C.id);
    const c1 = await open(C.path, 'c1.ts');
    switchTo(B.id);
    expect(useEditor.getState().activeId).toBe(b1);
    switchTo(A.id);

    // The strip comes back where it was left: a2 on screen, panel open.
    expect(useEditor.getState().activeId).toBe(a2);
    expect(useEditor.getState().panelOpen).toBe(true);
    // Every tab of every project is still open — none was closed by a switch.
    expect(openIds().sort()).toEqual([a1, a2, b1, c1].sort());
    // And only A's are visible.
    expect(useEditor.getState().visibleTabs().map((t) => t.id)).toEqual([a1, a2]);

    // THE POINT: the objects behind the hidden-then-shown tabs are the same
    // objects, not equal copies. A close would have replaced every one.
    expect(getWorkingModel(a1)).toBe(seeded.a1.model);
    expect(getWorkingModel(a2)).toBe(seeded.a2.model);
    expect(takeViewState(a1)).toBe(seeded.a1.view);
    expect(takeViewState(a2)).toBe(seeded.a2.view);
    expect(lastRewind(a1)).toBe(seeded.a1.entry);
    expect(lastRewind(a2)).toBe(seeded.a2.entry);
    expect((seeded.a1.model as { isDisposed(): boolean }).isDisposed()).toBe(false);
  });

  it('the ELEVENTH tab of the active project evicts one of ITS OWN, never a hidden one', async () => {
    // RED AT THE PARENT: a hidden project's tabs are the stalest by
    // construction, so the global cap took a1 with its journal.
    const a1 = await open(A.path, 'a1.ts');
    const a2 = await open(A.path, 'a2.ts');
    const kept = seed(a1);
    switchTo(B.id);
    const bs: string[] = [];
    for (let n = 1; n <= 11; n += 1) {
      bs.push(await open(B.path, `b-${String(n).padStart(2, '0')}.ts`));
    }

    // A's tabs are untouched, journal and model included.
    expect(openIds()).toContain(a1);
    expect(openIds()).toContain(a2);
    expect(rewindJournalDepth(a1)).toBe(1);
    expect(getWorkingModel(a1)).toBe(kept.model);
    // B holds ten: its own first tab was the one evicted.
    const bOpen = bs.filter((id) => openIds().includes(id));
    expect(bOpen).toHaveLength(10);
    expect(bOpen).not.toContain(bs[0]);
    expect(useEditor.getState().visibleTabs()).toHaveLength(10);
    // The cap is per project: twelve tabs in all is the point.
    expect(useEditor.getState().tabs).toHaveLength(12);
  });

  it('a hidden project’s tab is never taken as the preview slot', async () => {
    const aPreview = await open(A.path, 'a-preview.ts', false);
    const preview = seed(aPreview);
    switchTo(B.id);
    const bPreview = await open(B.path, 'b-preview.ts', false);

    expect(useEditor.getState().tabs.find((t) => t.id === bPreview)?.preview).toBe(true);
    expect(openIds()).toContain(aPreview);
    expect(getWorkingModel(aPreview)).toBe(preview.model);
    expect(lastRewind(aPreview)).toBe(preview.entry);

    // Back in A, the next single click replaces A's own preview and no other.
    switchTo(A.id);
    const aNext = await open(A.path, 'a-next.ts', false);
    expect(openIds()).not.toContain(aPreview);
    expect(openIds()).toContain(bPreview);
    expect(useEditor.getState().activeId).toBe(aNext);
  });

  it('switchProject is a no-op for the project already on screen and disposes nothing', async () => {
    const a1 = await open(A.path, 'a1.ts');
    const s = seed(a1);
    const before = useEditor.getState();
    useEditor.getState().switchProject(A.id);
    expect(useEditor.getState()).toBe(before);
    expect(getWorkingModel(a1)).toBe(s.model);
  });
});

describe('which project a tab belongs to (research 119 §5.1)', () => {
  it('a file inside another open project’s root opens under THAT project and shows it', async () => {
    // A path clicked in A's terminal that names a file in B: the tab belongs
    // to B, and the person sees it, so the app moves to B.
    useEditor.getState().openFromRequest(request(B.path, 'src/b.ts'));
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.projectId).toBe(B.id);
    expect(useEditor.getState().projectId).toBe(B.id);
    expect(useApp.getState().activeProjectId).toBe(B.id);
    // Back in A, that tab is hidden and A's strip is empty.
    switchTo(A.id);
    expect(useEditor.getState().visibleTabs()).toHaveLength(0);
    expect(useEditor.getState().panelOpen).toBe(false);
  });

  it('a file outside every root belongs to the project active at the open', async () => {
    useEditor.getState().openFromRequest(request('/Users/someone/.claude', 'CLAUDE.md'));
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(A.id);
    switchTo(B.id);
    useEditor.getState().openFromRequest(request('/private/tmp', 'scratch.txt'));
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(B.id);
    expect(useEditor.getState().visibleTabs().map((t) => t.relPath)).toEqual(['scratch.txt']);
  });

  it('nested roots: the deepest project that holds the file wins', async () => {
    const nested = { id: 'proj-n', path: `${A.path}/packages/inner`, name: 'inner' };
    useApp.setState({ projects: [A, B, C, nested] });
    useEditor.getState().openFromRequest(request(A.path, 'packages/inner/x.ts'));
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(nested.id);
  });

  it('the project root itself (a map or report tab) belongs to that project', async () => {
    useEditor.getState().openFromRequest({
      repoPath: B.path,
      relPath: '',
      path: B.path,
      mode: 'file',
      source: 'tree',
      preview: false,
      archMap: { repoPath: B.path }
    } as OpenFileRequest);
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(B.id);
  });

  it('activating a hidden project’s tab shows that project', async () => {
    const a1 = await open(A.path, 'a1.ts');
    switchTo(B.id);
    await open(B.path, 'b1.ts');
    useEditor.getState().activate(a1);
    expect(useEditor.getState().projectId).toBe(A.id);
    expect(useApp.getState().activeProjectId).toBe(A.id);
    expect(useEditor.getState().activeId).toBe(a1);
  });
});

describe('the strip a person can see', () => {
  it('⌃Tab, ←→, Close Others, Close Saved and Close All stay inside the visible set', async () => {
    const a1 = await open(A.path, 'a1.ts');
    const a2 = await open(A.path, 'a2.ts');
    switchTo(B.id);
    const b1 = await open(B.path, 'b1.ts');
    const b2 = await open(B.path, 'b2.ts');
    const b3 = await open(B.path, 'b3.ts');

    useEditor.getState().cycleMru(1);
    expect([b1, b2, b3]).toContain(useEditor.getState().activeId);
    useEditor.getState().commitMru();
    useEditor.getState().cycleTab(1);
    expect([b1, b2, b3]).toContain(useEditor.getState().activeId);
    expect(useEditor.getState().projectId).toBe(B.id);

    useEditor.getState().closeOthers(b2);
    expect(openIds().sort()).toEqual([a1, a2, b2].sort());
    useEditor.getState().closeSaved();
    expect(openIds().sort()).toEqual([a1, a2].sort());
    // B has no tabs: its panel closes, and A's tabs were never touched.
    expect(useEditor.getState().panelOpen).toBe(false);
    switchTo(A.id);
    expect(useEditor.getState().panelOpen).toBe(true);
    useEditor.getState().closeAll();
    expect(openIds()).toEqual([]);
  });

  it('the panel is per project: no tabs, no editor; back, and it is where it was', async () => {
    await open(A.path, 'a1.ts');
    useEditor.getState().hidePanel();
    switchTo(B.id);
    expect(useEditor.getState().panelOpen).toBe(false);
    expect(useEditor.getState().activeId).toBeNull();
    await open(B.path, 'b1.ts');
    expect(useEditor.getState().panelOpen).toBe(true);
    switchTo(A.id);
    // Hidden by ⌘E before the switch, so it comes back hidden.
    expect(useEditor.getState().panelOpen).toBe(false);
    useEditor.getState().togglePanel();
    expect(useEditor.getState().panelOpen).toBe(true);
    switchTo(B.id);
    expect(useEditor.getState().panelOpen).toBe(true);
  });

  it('⌘E with no tabs in this project never reopens another project’s last file', async () => {
    await open(A.path, 'a1.ts');
    switchTo(B.id);
    expect(useEditor.getState().visibleTabs()).toHaveLength(0);
    useEditor.getState().togglePanel();
    expect(useEditor.getState().projectId).toBe(B.id);
    expect(useApp.getState().activeProjectId).toBe(B.id);
    expect(useEditor.getState().panelOpen).toBe(false);
  });
});

describe('closing a project (research 119 §5.2)', () => {
  it('closeProjectTabs on a HIDDEN project moves nothing on screen', async () => {
    const a1 = await open(A.path, 'a1.ts');
    const a2 = await open(A.path, 'a2.ts');
    seed(a1);
    switchTo(B.id);
    const b1 = await open(B.path, 'b1.ts');

    useEditor.getState().closeProjectTabs(A.id);

    expect(openIds()).toEqual([b1]);
    expect(useEditor.getState().activeId).toBe(b1);
    expect(useEditor.getState().panelOpen).toBe(true);
    expect(useEditor.getState().projectId).toBe(B.id);
    // A close IS destructive, and this is the one path allowed to be.
    expect(rewindJournalDepth(a1)).toBe(0);
    expect(getWorkingModel(a2)).toBeNull();
    // Coming back to A finds an empty strip, not a stale remembered tab.
    switchTo(A.id);
    expect(useEditor.getState().activeId).toBeNull();
    expect(useEditor.getState().panelOpen).toBe(false);
  });

  it('a dirty tab of a closing project is asked about through the existing prompt', async () => {
    const a1 = await open(A.path, 'a1.ts');
    useEditor.getState().markDirty(a1, true);
    switchTo(B.id);
    let asked: string | null = null;
    const original = useApp.getState().setConfirm;
    useApp.setState({
      setConfirm: (spec: { title: string }) => {
        asked = spec.title;
      }
    } as never);
    try {
      useEditor.getState().closeProjectTabs(A.id);
    } finally {
      useApp.setState({ setConfirm: original });
    }

    expect(asked).toBe("Save changes to 'a1.ts'?");
    // Cancel is "answer nothing": the tab stays, hidden, dirty, unharmed.
    expect(openIds()).toEqual([a1]);
    expect(useEditor.getState().tabs[0]?.dirty).toBe(true);
  });
});
