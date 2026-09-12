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

const { useEditor, visibleTabsOf } = await import('../store');
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
const visibleIn = (projectId: string): string[] =>
  visibleTabsOf(useEditor.getState().tabs, projectId).map((t) => t.id);

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
    panelOpenByProject: {},
    lastRequest: null,
    lastRequestProjectId: null
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

  it('the request a TERMINAL LINK really emits lands under the project whose root holds the file', async () => {
    // FIX ROUND. The case above hands the store `repoPath: B.path`, which is
    // the tree's shape. A path pressed in a terminal goes through
    // `openFileAt(path, repoPath = the PANE's project)`
    // (src/renderer/context/open-detail.ts), so `repoPath` is the project the
    // person is IN and `relPath` is the absolute path, and the file is in the
    // other project. Red at 8e5a5f43: `projectOf` admitted the pane's project
    // by `p.path === req.repoPath`, the two roots tied on length, and the tab
    // landed under alpha with the app still on alpha — `probe:p260` arm E's
    // four findings.
    const link = (paneRoot: string, path: string): OpenFileRequest => ({
      repoPath: paneRoot,
      relPath: path,
      path,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    useEditor.getState().openFromRequest(link(A.path, `${B.path}/b-target.md`));
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(B.id);
    expect(useApp.getState().activeProjectId).toBe(B.id);
    expect(useEditor.getState().projectId).toBe(B.id);

    // And the other way round, where the PANE's root is the longer one, so a
    // deepest-root tie-break over the wrong candidates cannot pass by luck.
    const longer = { id: 'proj-l', path: '/work/alpha-longer', name: 'longer' };
    useApp.setState({ projects: [A, B, C, longer], activeProjectId: longer.id });
    useEditor.getState().openFromRequest(link(longer.path, `${C.path}/c-target.md`));
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(C.id);
    expect(useApp.getState().activeProjectId).toBe(C.id);
    // The pane's project drew neither file.
    expect(visibleIn(A.id)).toEqual([]);
    expect(visibleIn(longer.id)).toEqual([]);
  });

  it('a file opened before its folder was a project moves to that project when opened from it', async () => {
    // FIX ROUND, verifier item 3. `/work/delta/x.ts` opened from A's terminal
    // while delta is not a project belongs to A (§5.1's second clause). Once
    // delta IS a project, clicking the same file in delta's own tree used to
    // hit the existing-tab path, activate it, and jump the app back to A.
    const delta = { id: 'proj-d', path: '/work/delta', name: 'delta' };
    useEditor.getState().openFromRequest({
      repoPath: A.path,
      relPath: `${delta.path}/x.ts`,
      path: `${delta.path}/x.ts`,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    await flush();
    const id = useEditor.getState().activeId as string;
    expect(useEditor.getState().activeTab()?.projectId).toBe(A.id);
    const kept = seed(id);

    useApp.setState({ projects: [A, B, C, delta] });
    switchTo(delta.id);
    expect(useEditor.getState().visibleTabs()).toHaveLength(0);
    useEditor.getState().openFromRequest(request(delta.path, 'x.ts'));
    await flush();

    // Same tab, re-homed: nothing disposed, and the app stays on delta.
    expect(useEditor.getState().activeId).toBe(id);
    expect(useEditor.getState().activeTab()?.projectId).toBe(delta.id);
    expect(useApp.getState().activeProjectId).toBe(delta.id);
    expect(useEditor.getState().tabs).toHaveLength(1);
    expect(getWorkingModel(id)).toBe(kept.model);
    expect(lastRewind(id)).toBe(kept.entry);
    // A's strip no longer remembers it as its active tab.
    switchTo(A.id);
    expect(useEditor.getState().visibleTabs()).toEqual([]);
    expect(useEditor.getState().activeId).toBeNull();
    expect(useEditor.getState().panelOpen).toBe(false);
  });

  it('a preview tab re-homed onto a strip with its own preview takes that ONE slot', async () => {
    // COMMITTER'S ROUND, from the round-2 verifier's unasserted reading. A
    // strip holds one preview slot. `/work/delta/f.ts` previewed from A's
    // terminal before delta was a project, then single-clicked in delta's own
    // tree, arrived beside delta's own preview d1 and the strip drew two
    // italic tabs. d1 goes, exactly as a preview click on any new file takes
    // it, and f — the person's file — keeps its model and its journal.
    const delta = { id: 'proj-d', path: '/work/delta', name: 'delta' };
    const f = `${delta.path}/f.ts`;
    useEditor.getState().openFromRequest({
      repoPath: A.path,
      relPath: f,
      path: f,
      mode: 'file',
      source: 'tree'
    });
    await flush();
    expect(useEditor.getState().activeTab()?.preview).toBe(true);
    const kept = seed(f);

    useApp.setState({ projects: [A, B, C, delta] });
    switchTo(delta.id);
    const d1 = await open(delta.path, 'd1.ts', false);
    const gone = seed(d1);
    expect(useEditor.getState().activeTab()?.preview).toBe(true);
    useEditor.getState().openFromRequest(request(delta.path, 'f.ts', false));
    await flush();

    expect(visibleIn(delta.id)).toEqual([f]);
    expect(useEditor.getState().activeTab()?.preview).toBe(true);
    expect(getWorkingModel(f)).toBe(kept.model);
    expect(lastRewind(f)).toBe(kept.entry);
    expect(getWorkingModel(d1)).toBeNull();
    expect(rewindJournalDepth(d1)).toBe(0);
    expect(gone.model).not.toBe(kept.model);
    expect(visibleIn(A.id)).toEqual([]);

    // CONTROL: opened FOR KEEPS the arriving tab is pinned and takes no
    // slot, so delta's own preview stays.
    const g = `${delta.path}/g.ts`;
    switchTo(A.id);
    useEditor.getState().openFromRequest({
      repoPath: A.path,
      relPath: g,
      path: g,
      mode: 'file',
      source: 'tree'
    });
    await flush();
    switchTo(delta.id);
    const d2 = await open(delta.path, 'd2.ts', false);
    useEditor.getState().openFromRequest(request(delta.path, 'g.ts'));
    await flush();
    expect(visibleIn(delta.id).sort()).toEqual([d2, g].sort());
    expect(useEditor.getState().tabs.find((t) => t.id === g)?.preview).toBe(false);
    expect(useEditor.getState().tabs.find((t) => t.id === d2)?.preview).toBe(true);
  });

  it('a tab opened with NO project active joins the first project that becomes active', async () => {
    // FIX ROUND, verifier item 4. At zero projects the diagnostics tab can
    // open; it has no project. Once a project is active the null strip is
    // reachable from nothing, and activating that tab used to switch the
    // editor to the null strip while the app stayed on the project.
    useApp.setState({ projects: [], activeProjectId: null });
    useEditor.setState({ projectId: null });
    useEditor.getState().openFromRequest({
      repoPath: '',
      relPath: '',
      path: '/nowhere',
      mode: 'file',
      source: 'tree',
      preview: false,
      diagnostics: { repoPath: '' }
    } as unknown as OpenFileRequest);
    await flush();
    const id = useEditor.getState().activeId as string;
    expect(useEditor.getState().activeTab()?.projectId).toBeNull();

    useApp.setState({ projects: [A] });
    switchTo(A.id);
    expect(useEditor.getState().projectId).toBe(A.id);
    // The record of where the last request landed joins the project too.
    expect(useEditor.getState().lastRequestProjectId).toBe(A.id);
    expect(useEditor.getState().visibleTabs().map((t) => t.id)).toEqual([id]);
    expect(useEditor.getState().activeId).toBe(id);
    expect(useEditor.getState().panelOpen).toBe(true);
    useEditor.getState().activate(id);
    expect(useEditor.getState().projectId).toBe(A.id);
    expect(useApp.getState().activeProjectId).toBe(A.id);
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

  it('⌘E with no tabs never reopens a file another project holds OUTSIDE every root', async () => {
    // COMMITTER'S ROUND, the round-2 verifier's one red case. At 721b35c6 the
    // guard asked `projectOf(lastRequest)` at press time, and for a file no
    // root holds that is the CURRENT project by §5.1's second clause: ⌘E in B
    // passed the guard, found A's hidden tab and moved the app to A under a
    // gesture that only asked for the panel. The guard reads the project the
    // request LANDED in now, recorded when it did.
    const global = '/Users/someone/.claude/CLAUDE.md';
    const openGlobalFromA = (): void =>
      useEditor.getState().openFromRequest({
        repoPath: A.path,
        relPath: global,
        path: global,
        mode: 'file',
        source: 'tree',
        preview: false
      });
    openGlobalFromA();
    await flush();
    expect(useEditor.getState().activeTab()?.projectId).toBe(A.id);
    switchTo(B.id);
    useEditor.getState().togglePanel();
    await flush();
    expect(useApp.getState().activeProjectId).toBe(B.id);
    expect(useEditor.getState().projectId).toBe(B.id);
    expect(useEditor.getState().panelOpen).toBe(false);
    expect(visibleIn(A.id)).toEqual([global]);

    // Closed, the record still says A: ⌘E in B opens nothing, and ⌘E in A
    // brings the file back under A — so the guard is a record and not a
    // refusal of every reopen.
    switchTo(A.id);
    useEditor.getState().closeAll();
    expect(openIds()).toEqual([]);
    switchTo(B.id);
    useEditor.getState().togglePanel();
    await flush();
    expect(openIds()).toEqual([]);
    expect(useApp.getState().activeProjectId).toBe(B.id);
    switchTo(A.id);
    useEditor.getState().togglePanel();
    await flush();
    expect(visibleIn(A.id)).toEqual([global]);
    expect(useApp.getState().activeProjectId).toBe(A.id);
    expect(useEditor.getState().panelOpen).toBe(true);
  });

  it('⌘E with no tabs never moves the app to a folder that BECAME a project after the open', async () => {
    // THE INDEPENDENT RE-VERIFIER'S RV4, the one red at d15cd0c7 and green at
    // 721b35c6. /work/delta/f.ts is opened from alpha while delta is not a
    // project, so the tab is alpha's by §5.1's second clause and the record
    // says alpha. Then delta is ADDED as a project. Close All in alpha, ⌘E in
    // alpha: the record passed, `projectOf` now answered delta because a root
    // holds the file, and `openFromRequest` revealed delta under a gesture
    // that only asked for alpha's panel. The guard asks both.
    const D = { id: 'proj-d', path: '/work/delta', name: 'delta' };
    const f = `${D.path}/f.ts`;
    try {
      useEditor.getState().openFromRequest({
        repoPath: A.path,
        relPath: f,
        path: f,
        mode: 'file',
        source: 'tree',
        preview: false
      });
      await flush();
      expect(useEditor.getState().activeTab()?.projectId).toBe(A.id);
      useApp.setState({ projects: [A, B, C, D] });
      useEditor.getState().closeAll();
      expect(openIds()).toEqual([]);
      expect(useApp.getState().activeProjectId).toBe(A.id);
      useEditor.getState().togglePanel();
      await flush();
      expect(useApp.getState().activeProjectId).toBe(A.id);
      expect(useEditor.getState().projectId).toBe(A.id);
      expect(visibleIn(D.id)).toEqual([]);
      expect(openIds()).toEqual([]);
    } finally {
      useApp.setState({ projects: [A, B, C], activeProjectId: A.id });
    }
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

  it('a Cancel at the prompt keeps EVERY tab of the project, the clean ones before the dirty one too', async () => {
    // FIX ROUND, verifier item 2. `closeMany` walks its run in order and
    // force-closes each clean tab until it meets a dirty one, so with the
    // strip handed over as drawn the clean tabs AHEAD of the dirty tab were
    // gone — model, view state, journal — before the prompt was on screen,
    // under a button that says Cancel. Red at 8e5a5f43.
    const clean1 = await open(A.path, 'a-clean-1.ts');
    const dirty = await open(A.path, 'a-dirty.ts');
    const clean2 = await open(A.path, 'a-clean-2.ts');
    useEditor.getState().markDirty(dirty, true);
    const kept = seed(clean1);
    switchTo(B.id);
    let asked: string | null = null;
    const original = useApp.getState().setConfirm;
    useApp.setState({
      setConfirm: (spec: { title: string }) => {
        asked = spec.title;
      }
    } as never);
    let closed = 0;
    try {
      useEditor.getState().closeProjectTabs(A.id, () => {
        closed += 1;
      });
    } finally {
      useApp.setState({ setConfirm: original });
    }

    expect(asked).toBe("Save changes to 'a-dirty.ts'?");
    expect(closed).toBe(0);
    // Nothing answered, nothing lost: all three tabs, the same objects.
    expect(openIds().sort()).toEqual([clean1, dirty, clean2].sort());
    expect(getWorkingModel(clean1)).toBe(kept.model);
    expect(takeViewState(clean1)).toBe(kept.view);
    expect(rewindJournalDepth(clean1)).toBe(1);
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
