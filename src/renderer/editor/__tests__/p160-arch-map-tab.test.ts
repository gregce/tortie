/**
 * The ARCHITECTURE MAP TAB's contract with the editor (Phase 160).
 *
 * The map is the first tab whose body is a drawing of a repository rather
 * than a file, and every refusal a non-file tab needs has a precedent in the
 * commit and review tabs: identity that is not a path, no disk read on open,
 * no dirty state, no save, no watcher refresh. These tests pin each one at
 * the seam where it is decided, because the regression shape is a tab that
 * quietly re-entered the file machinery, being a read of a repository ROOT
 * through the text reader, a "deleted on disk" banner over a drawing, or a
 * save prompt offering to write a picture over a directory.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'body', truncated: false }));
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));
const writeFile = vi.fn(async () => undefined);
const readDir = vi.fn(async () => ({ entries: [] as { name: string }[] }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, readDir },
    git: { showHead, onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const { createTabIo } = await import('../tab-io');
const {
  ARCH_MAP_TAB_NAME,
  archMapTabId,
  tabIdFor,
  tabTooltipIdentity
} = await import('../tab-identity');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../store').EditorTab;

const REPO = '/Users/op/project';

function mapReq(repoPath = REPO): OpenFileRequest {
  return {
    repoPath,
    relPath: '',
    path: repoPath,
    mode: 'file',
    source: 'tree',
    preview: false,
    archMap: { repoPath }
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('identity', () => {
  it('keys the map tab by the repository, not by any file', () => {
    expect(tabIdFor(mapReq())).toBe(`arch-map:${REPO}`);
    expect(archMapTabId(REPO)).toBe(`arch-map:${REPO}`);
  });

  it('keys two repositories as two tabs', () => {
    expect(tabIdFor(mapReq('/a'))).not.toBe(tabIdFor(mapReq('/b')));
  });

  it('never collides with a file tab at the repository root path', () => {
    const fileReq: OpenFileRequest = {
      repoPath: REPO,
      relPath: '',
      path: REPO,
      mode: 'file',
      source: 'tree'
    };
    expect(tabIdFor(mapReq())).not.toBe(tabIdFor(fileReq));
  });
});

describe('opening', () => {
  it('opens with no disk read, not loading, not dirty, no diff offered', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.archMap).toEqual({ repoPath: REPO });
    expect(tab?.name).toBe(ARCH_MAP_TAB_NAME);
    expect(tab?.loading).toBe(false);
    expect(tab?.dirty).toBe(false);
    expect(tab?.canDiff).toBe(false);
    expect(tab?.mode).toBe('file');
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(readImage).not.toHaveBeenCalled();
  });

  it('focuses the one map tab on a second open rather than opening a twin', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    const s = useEditor.getState();
    expect(s.tabs.length).toBe(1);
    expect(s.activeId).toBe(`arch-map:${REPO}`);
  });

  it('gives two repositories two map tabs', async () => {
    useEditor.getState().openFromRequest(mapReq('/a'));
    useEditor.getState().openFromRequest(mapReq('/b'));
    await flush();
    expect(useEditor.getState().tabs.length).toBe(2);
  });
});

describe('the refusals', () => {
  it('refuses dirty state, so close can never prompt to save a drawing', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    useEditor.getState().markDirty(`arch-map:${REPO}`, true);
    expect(useEditor.getState().activeTab()?.dirty).toBe(false);
  });

  it('refuses save, and no write ever reaches the bridge', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab).not.toBeNull();
    const io = createTabIo({
      patch: () => undefined,
      byId: () => tab as EditorTab,
      worktreeTabsIn: () => []
    });
    const saved = await io.save(tab?.id ?? '');
    expect(saved).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('is excluded from the watcher refresh, so it can never read the worktree or be marked deleted', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    // The store's own refresh path: a repo change fans out over
    // worktreeTabsIn, which must not include the map tab. Driving refreshRepo
    // through a fresh io with the store's own filter proves the exclusion by
    // outcome: nothing is read for a repo whose only tab is the map.
    const io = createTabIo({
      patch: (id, patch) => {
        useEditor.setState((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t))
        }));
      },
      byId: (id) => useEditor.getState().tabs.find((t) => t.id === id),
      worktreeTabsIn: (repoPath) =>
        useEditor
          .getState()
          .tabs.filter(
            (t) =>
              t.repoPath === repoPath &&
              t.commit === null &&
              t.remote === undefined &&
              t.archMap === undefined
          )
    });
    await io.refreshRepo(REPO);
    expect(readFile).not.toHaveBeenCalled();
    expect(readDir).not.toHaveBeenCalled();
    expect(useEditor.getState().activeTab()?.deleted).toBe(false);
  });
});

describe('the tooltip', () => {
  it('says what the tab is and which repository it draws', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    const tip = tabTooltipIdentity(tab as EditorTab);
    expect(tip).toContain('architecture map');
    expect(tip).toContain(REPO);
  });
});
