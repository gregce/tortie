/**
 * PHASE 240. The COMPARE tab, which is what a refused save offers instead of
 * asking a person to guess (issue 16).
 *
 * He named VS Code and VS Code offers three answers: overwrite, compare,
 * cancel. Tortie has a diff view already, so Compare opens it over the two
 * versions that existed at the moment of the refusal — what was on disk on the
 * left, the buffer that would have replaced it on the right.
 *
 * IT IS A TAB OF THE HISTORY FAMILY AND NOT A MUTATION OF THE LIVE ONE, and
 * that was measured rather than reasoned. Research 100 §5.2 drove the live tab
 * in the running app with HEAD moving under it while it was dirty:
 * `headContents` went 455 B to 476 B and followed the commit, because
 * `refreshRepo` re-runs `git show HEAD:` on every tick and does NOT skip a
 * dirty tab. A Compare that borrowed that field would be overwritten within a
 * tick and the person would be reading HEAD while the dialog said "disk".
 *
 * So every refusal a history tab carries is pinned here, plus the two rules
 * this tab has of its own: a second Compare of one file replaces its sides
 * rather than stacking a tab, and nothing refreshes it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'on disk now', truncated: false }));
const showHead = vi.fn(async () => 'head');
const readImage = vi.fn(async () => ({ status: 'ok' }));
const writeFile = vi.fn(async () => undefined);
const writeGuarded = vi.fn(async () => ({ outcome: 'wrote', sha256: 'x', bytes: 1 }));
const readDir = vi.fn(async () => ({ entries: [{ name: 'notes.md' }] }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, writeGuarded, readDir },
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
const { compareTabId, tabIdFor, tabTooltipIdentity } = await import('../tab-identity');
const { compareTabName } = await import('../save-sentences');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../store').EditorTab;

const REPO = '/Users/op/project';
const PATH = `${REPO}/notes.md`;

/** What the disk said when the save was refused, and what the buffer holds. */
const DISK = 'one\ntwo\nthe agent added this\n';
const YOURS = 'one\nPERSON two\n';

function compareReq(left = DISK, right = YOURS): OpenFileRequest {
  return {
    repoPath: REPO,
    relPath: 'notes.md',
    path: PATH,
    mode: 'diff',
    source: 'tree',
    preview: false,
    compare: { left, right }
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('identity', () => {
  it('is keyed by the file and never collides with that file’s own tab', () => {
    const worktree: OpenFileRequest = {
      repoPath: REPO,
      relPath: 'notes.md',
      path: PATH,
      mode: 'file',
      source: 'tree'
    };
    expect(tabIdFor(compareReq())).toBe(compareTabId(PATH));
    expect(compareTabId(PATH)).toBe(`compare:${PATH}`);
    expect(tabIdFor(compareReq())).not.toBe(tabIdFor(worktree));
  });

  it('does not wear the file’s own name, and its tooltip says what it is', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    const tab = useEditor.getState().activeTab() as EditorTab;
    expect(tab.name).toBe(compareTabName('notes.md'));
    expect(tab.name).not.toBe('notes.md');
    expect(tab.compare).toEqual({ fileName: 'notes.md' });
    const tip = tabTooltipIdentity(tab);
    expect(tip).toContain('notes.md');
    expect(tip).toContain('on disk');
    expect(tip).not.toBe(PATH);
  });
});

describe('opening', () => {
  it('holds both sides from the request and reads nothing at all', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    const tab = useEditor.getState().activeTab() as EditorTab;
    expect(tab.headContents).toBe(DISK);
    expect(tab.savedContents).toBe(YOURS);
    expect(tab.mode).toBe('diff');
    expect(tab.canDiff).toBe(true);
    expect(tab.loading).toBe(false);
    expect(tab.dirty).toBe(false);
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(readImage).not.toHaveBeenCalled();
  });

  it('replaces the two sides on a second Compare rather than stacking a tab', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    useEditor.getState().openFromRequest(compareReq('newer disk', 'newer yours'));
    await flush();
    const s = useEditor.getState();
    expect(s.tabs.length).toBe(1);
    expect(s.activeId).toBe(compareTabId(PATH));
    expect(s.activeTab()?.headContents).toBe('newer disk');
    expect(s.activeTab()?.savedContents).toBe('newer yours');
  });
});

describe('the refusals', () => {
  it('refuses dirty state', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    useEditor.getState().markDirty(compareTabId(PATH), true);
    expect(useEditor.getState().activeTab()?.dirty).toBe(false);
  });

  it('refuses every other mode, so neither dead side is ever drawn as live', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    for (const mode of ['file', 'preview', 'split', 'redline'] as const) {
      useEditor.getState().setMode(compareTabId(PATH), mode);
      expect(useEditor.getState().activeTab()?.mode).toBe('diff');
    }
    expect(showHead).not.toHaveBeenCalled();
  });

  it('refuses save, and no write of either kind reaches the bridge', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    const tab = useEditor.getState().activeTab() as EditorTab;
    const io = createTabIo({
      patch: () => undefined,
      byId: () => tab,
      worktreeTabsIn: () => []
    });
    expect(await io.save(tab.id)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(writeGuarded).not.toHaveBeenCalled();
  });

  it('is excluded from the watcher refresh, so neither side can move under it', async () => {
    useEditor.getState().openFromRequest(compareReq());
    await flush();
    const io = createTabIo({
      patch: (id, patch) => {
        useEditor.setState((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t))
        }));
      },
      byId: (id) => useEditor.getState().tabs.find((t) => t.id === id),
      // The store's own filter, verbatim, which is what `refreshRepo` fans out
      // over. A repository whose only tab is a comparison has nothing to
      // refresh.
      worktreeTabsIn: (repoPath) =>
        useEditor
          .getState()
          .tabs.filter(
            (t) =>
              t.repoPath === repoPath &&
              t.commit === null &&
              t.remote === undefined &&
              t.archMap === undefined &&
              t.diagnostics === undefined &&
              t.compare === undefined
          )
    });
    await io.refreshRepo(REPO);
    expect(readFile).not.toHaveBeenCalled();
    expect(readDir).not.toHaveBeenCalled();
    const tab = useEditor.getState().activeTab() as EditorTab;
    expect(tab.headContents).toBe(DISK);
    expect(tab.savedContents).toBe(YOURS);
    expect(tab.deleted).toBe(false);
  });
});
