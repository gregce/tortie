/**
 * The DIAGNOSTICS REPORT TAB's contract with the editor (Phase 163).
 *
 * The report is the second tab whose body is not a file, and it inherits
 * every refusal the map tab (Phase 160) pinned: identity that is not a
 * path, no disk read on open, no dirty state, no save, no watcher refresh.
 * Two rules are this tab's own and are pinned here too. There is ONE report
 * tab for the whole app, whichever project was active when it opened, and
 * a second ask focuses it. And the tab never collides with a file tab or a
 * map tab at the same root.
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
  DIAGNOSTICS_TAB_ID,
  DIAGNOSTICS_TAB_NAME,
  tabIdFor,
  tabTooltipIdentity
} = await import('../tab-identity');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../store').EditorTab;

const REPO = '/Users/op/project';

function reportReq(repoPath = REPO): OpenFileRequest {
  return {
    repoPath,
    relPath: '',
    path: repoPath,
    mode: 'file',
    source: 'tree',
    preview: false,
    diagnostics: { kind: 'report' }
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('identity', () => {
  it('keys the report tab for the whole app, not per repository', () => {
    expect(tabIdFor(reportReq('/a'))).toBe(DIAGNOSTICS_TAB_ID);
    expect(tabIdFor(reportReq('/b'))).toBe(DIAGNOSTICS_TAB_ID);
    expect(DIAGNOSTICS_TAB_ID).toBe('diagnostics:report');
  });

  it('never collides with a file tab or a map tab at the same root', () => {
    const fileReq: OpenFileRequest = {
      repoPath: REPO,
      relPath: '',
      path: REPO,
      mode: 'file',
      source: 'tree'
    };
    expect(tabIdFor(reportReq())).not.toBe(tabIdFor(fileReq));
    expect(tabIdFor(reportReq())).not.toBe(
      tabIdFor({ ...fileReq, archMap: { repoPath: REPO } })
    );
  });

  it('opens with an empty root when no project is local', () => {
    expect(tabIdFor(reportReq(''))).toBe(DIAGNOSTICS_TAB_ID);
  });
});

describe('opening', () => {
  it('opens with no disk read, not loading, not dirty, no diff offered', async () => {
    useEditor.getState().openFromRequest(reportReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.diagnostics).toEqual({ kind: 'report' });
    expect(tab?.name).toBe(DIAGNOSTICS_TAB_NAME);
    expect(tab?.loading).toBe(false);
    expect(tab?.dirty).toBe(false);
    expect(tab?.canDiff).toBe(false);
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(readImage).not.toHaveBeenCalled();
  });

  it('focuses the one report tab on a second open, even from another project', async () => {
    useEditor.getState().openFromRequest(reportReq('/a'));
    await flush();
    useEditor.getState().openFromRequest(reportReq('/b'));
    await flush();
    const s = useEditor.getState();
    expect(s.tabs.length).toBe(1);
    expect(s.activeId).toBe(DIAGNOSTICS_TAB_ID);
  });
});

describe('the refusals', () => {
  it('refuses dirty state', async () => {
    useEditor.getState().openFromRequest(reportReq());
    await flush();
    useEditor.getState().markDirty(DIAGNOSTICS_TAB_ID, true);
    expect(useEditor.getState().activeTab()?.dirty).toBe(false);
  });

  it('refuses save, and no write ever reaches the bridge', async () => {
    useEditor.getState().openFromRequest(reportReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    const io = createTabIo({
      patch: () => undefined,
      byId: () => tab as EditorTab,
      worktreeTabsIn: () => []
    });
    expect(await io.save(tab?.id ?? '')).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('is excluded from the watcher refresh, so it can never read the worktree or be marked deleted', async () => {
    useEditor.getState().openFromRequest(reportReq());
    await flush();
    // The store's own filter, the one `refreshRepo` fans out over: a repo
    // whose only tab is the report has nothing to refresh.
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
              t.archMap === undefined &&
              t.diagnostics === undefined
          )
    });
    await io.refreshRepo(REPO);
    expect(readFile).not.toHaveBeenCalled();
    expect(readDir).not.toHaveBeenCalled();
    expect(useEditor.getState().activeTab()?.deleted).toBe(false);
  });
});

describe('the tooltip', () => {
  it('says what the tab is rather than showing a project root as a file', async () => {
    useEditor.getState().openFromRequest(reportReq());
    await flush();
    const tip = tabTooltipIdentity(useEditor.getState().activeTab() as EditorTab);
    expect(tip).toContain('Tortie is running');
    expect(tip).not.toContain(REPO);
  });
});
