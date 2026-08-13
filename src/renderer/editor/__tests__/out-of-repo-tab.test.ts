/**
 * Phase 26 item 1 — a file outside the active repository never enters the
 * diff path.
 *
 * The operator opened a global skill (`~/.claude/skills/…/SKILL.md`) from the
 * Context view and got git's refusal raw, because the detail tab is a file
 * tab and the file tab machinery assumed every file lives inside the
 * project's repository. The rule is now decided where the tab is CREATED:
 * such a file opens plain, no diff is offered, and no git call is ever made
 * for it. These tests assert on WHICH BRIDGE METHOD was called, the same way
 * the image suite does, because the regression shape is a doomed IPC call
 * that the user only ever sees as an undismissable error.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'body', truncated: false }));
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));
const readDir = vi.fn(async () => ({ entries: [{ name: 'SKILL.md' }] }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile: vi.fn(), readDir },
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
type EditorTab = import('../store').EditorTab;
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

/** The operator's exact shape: a global skill, active project elsewhere. */
const SKILL = '/Users/op/.claude/skills/some-skill/SKILL.md';
const REPO = '/Users/op/project';

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: REPO,
    relPath: SKILL, // outside the repo, so relPath stays the absolute path
    path: SKILL,
    mode: 'file',
    source: 'tree',
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('tab creation — the decision point', () => {
  it('opens an out-of-repo file plain even when the request says diff', async () => {
    useEditor.getState().openFromRequest(
      req({
        relPath: '/Users/op/.claude/notes.ts',
        path: '/Users/op/.claude/notes.ts',
        mode: 'diff'
      })
    );
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.mode).toBe('file');
    expect(tab?.canDiff).toBe(false);
    expect(showHead).not.toHaveBeenCalled();
  });

  it('a context detail open of a global skill never reaches git', async () => {
    useEditor.getState().openFromRequest(
      req({ contextEntry: { id: 'skill|some-skill', category: 'skill' } })
    );
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.id).toBe('context:skill|some-skill');
    expect(tab?.canDiff).toBe(false);
    expect(readFile).toHaveBeenCalled(); // the file itself still loads
    expect(showHead).not.toHaveBeenCalled();
  });

  it('an IN-repo diff request still takes the diff path', async () => {
    useEditor.getState().openFromRequest(
      req({
        repoPath: REPO,
        relPath: 'src/auth.ts',
        path: `${REPO}/src/auth.ts`,
        mode: 'diff'
      })
    );
    await flush();
    expect(useEditor.getState().activeTab()?.canDiff).toBe(true);
    expect(showHead).toHaveBeenCalledTimes(1);
  });
});

describe('the rule holds for the tab whole life', () => {
  it('setMode refuses to put an out-of-repo worktree tab into diff mode', async () => {
    useEditor.getState().openFromRequest(req());
    await flush();
    const id = useEditor.getState().activeId as string;
    useEditor.getState().setMode(id, 'diff');
    expect(useEditor.getState().activeTab()?.mode).not.toBe('diff');
    expect(showHead).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The IO layer honours the same rule (watcher refresh and direct calls)
// ---------------------------------------------------------------------------

function outOfRepoTab(over: Partial<EditorTab> = {}): EditorTab {
  return {
    id: `context:skill|some-skill`,
    path: SKILL,
    relPath: SKILL,
    origRelPath: null,
    repoPath: REPO,
    name: 'SKILL.md',
    mode: 'preview',
    canDiff: false,
    markdown: true,
    image: false,
    svg: false,
    html: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: true,
    commit: null,
    pendingSelection: null,
    pendingFocus: true,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: 'body',
    headContents: null,
    lastUsed: 0,
    contextEntry: { id: 'skill|some-skill', category: 'skill' },
    ...over
  };
}

function harness(initial: EditorTab) {
  let tab = initial;
  const io = createTabIo({
    patch: (id, patch) => {
      if (id === tab.id) tab = { ...tab, ...patch };
    },
    byId: (id) => (id === tab.id ? tab : undefined),
    worktreeTabsIn: () => [tab]
  });
  return { io, get: () => tab };
}

describe('tab-io — no git call is ever made for an out-of-repo tab', () => {
  it('refreshRepo refreshes the buffer but never asks git', async () => {
    readFile.mockResolvedValue({ contents: 'body', truncated: false });
    const { io } = harness(outOfRepoTab());
    await io.refreshRepo(REPO);
    expect(showHead).not.toHaveBeenCalled();
  });

  it('a stray loadHead falls back to the plain view without a git call', async () => {
    const { io, get } = harness(outOfRepoTab({ mode: 'diff', canDiff: true }));
    await io.loadHead(get().id);
    expect(showHead).not.toHaveBeenCalled();
    expect(get().mode).toBe('preview'); // markdown falls back to its preview
    expect(get().canDiff).toBe(false);
  });
});
