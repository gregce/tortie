/**
 * PHASE 260 (issue 19, research 119 §5.2). Closing a PROJECT closes that
 * project's editor tabs through the editor's own Save / Don't Save / Cancel
 * prompt, and removes the project only once every one of them is gone.
 *
 * WHY THIS IS A TEST OVER THE REAL SEAM. `src/renderer/state` may not name the
 * editor (build/assert-import-boundaries.mjs), so `closeProject` reaches it
 * through `shellOps().editorCloseProjectTabs`, which
 * src/renderer/app/shell-ops-install.ts fills with the editor store's own
 * `closeProjectTabs`. Three things can go wrong across that seam and each is
 * one case here: the project removed BEFORE the prompt (a Cancel would then
 * leave a dirty buffer in a project that no longer exists, invisible for
 * ever); the prompt honoured but the removal never following it (the project
 * stays open after Don't Save, which is the safe side and still a defect);
 * and a project whose tabs were all clean not closing at all.
 *
 * It runs the REAL app store, the REAL editor store and the REAL adapter, with
 * the bridge stubbed at the window so nothing is spawned and nothing on disk
 * is read. The confirm dialog is answered the way ConfirmDialog.tsx answers
 * it: the spec is taken off the store, the store is cleared, then the button's
 * callback runs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

let removed: string[] = [];
let projects: { id: string; path: string; name: string }[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      create: () => Promise.reject(new Error('no session in this test')),
      list: () => Promise.resolve([]),
      onChanged() {},
      onStatusChanged() {}
    },
    projects: {
      list: () => Promise.resolve(projects),
      remove: (id: string) => {
        removed.push(id);
        projects = projects.filter((p) => p.id !== id);
        return Promise.resolve();
      }
    },
    notice: { pending: () => Promise.resolve([]) },
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve(),
    fs: {
      readFile: () => Promise.resolve({ contents: 'hello\n', truncated: false }),
      readImage: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn()
    },
    git: { showHead: () => Promise.resolve(''), onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../store');
const { useEditor, visibleTabsOf } = await import('../../editor/store');
const { installAppShellOps } = await import('../../app/shell-ops-install');
installAppShellOps();

const flush = (): Promise<unknown> => new Promise((done) => setTimeout(done, 0));

const ONE = { id: 'p1', path: '/repo-one', name: 'one' };
const TWO = { id: 'p2', path: '/repo-two', name: 'two' };

async function open(project: { path: string }, name: string): Promise<string> {
  useEditor.getState().openFromRequest({
    repoPath: project.path,
    relPath: name,
    path: `${project.path}/${name}`,
    mode: 'file',
    source: 'tree',
    preview: false
  });
  await flush();
  const id = `${project.path}/${name}`;
  expect(useEditor.getState().tabs.some((t) => t.id === id), `no tab for ${name}`).toBe(true);
  return id;
}

const tabsOf = (projectId: string): string[] =>
  visibleTabsOf(useEditor.getState().tabs, projectId).map((t) => t.id);

/** The dialog on screen, and the three ways ConfirmDialog.tsx answers it. */
function dialog(): { title: string; confirm: () => void; alt: () => void; cancel: () => void } {
  const spec = useApp.getState().confirm;
  if (spec === null) throw new Error('no confirm dialog is up');
  return {
    title: spec.title,
    confirm: () => {
      useApp.getState().setConfirm(null);
      spec.onConfirm();
    },
    alt: () => {
      useApp.getState().setConfirm(null);
      spec.onAlt?.();
    },
    cancel: () => {
      useApp.getState().setConfirm(null);
    }
  };
}

beforeEach(() => {
  removed = [];
  projects = [ONE, TWO];
  useApp.setState({
    projects: [ONE, TWO],
    activeProjectId: ONE.id,
    sessions: [],
    toasts: [],
    confirm: null,
    machineStates: []
  } as never);
  useEditor.setState({
    tabs: [],
    activeId: null,
    panelOpen: false,
    projectId: null,
    activeIdByProject: {},
    panelOpenByProject: {}
  } as never);
});

describe('closing a project with a dirty tab', () => {
  it('asks about the dirty tab AFTER the close is confirmed, and a Cancel keeps the project', async () => {
    const dirty = await open(ONE, 'draft.md');
    useEditor.getState().markDirty(dirty, true);
    await open(TWO, 'clean.md');

    useApp.getState().closeProject(ONE.id);
    expect(dialog().title).toBe("Close 'one'?");
    dialog().confirm();
    await flush();

    // The prompt is the editor's own, and nothing has been removed yet.
    expect(dialog().title).toBe("Save changes to 'draft.md'?");
    expect(removed).toEqual([]);

    dialog().cancel();
    await flush();
    await flush();
    expect(removed).toEqual([]);
    expect(useApp.getState().projects.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(tabsOf(ONE.id)).toEqual([dirty]);
    expect(useEditor.getState().tabs.find((t) => t.id === dirty)?.dirty).toBe(true);
    // The other project's tab was never in the run.
    expect(tabsOf(TWO.id)).toEqual([`${TWO.path}/clean.md`]);
  });

  it('a Cancel keeps the clean tabs that sat before the dirty one on the strip', async () => {
    // FIX ROUND, verifier item 2: the clean tab ahead of the dirty one was
    // force-closed on the way to the prompt at 8e5a5f43, so a Cancel kept the
    // project and lost the tab.
    const clean = await open(ONE, 'clean-first.md');
    const dirty = await open(ONE, 'draft.md');
    useEditor.getState().markDirty(dirty, true);

    useApp.getState().closeProject(ONE.id);
    dialog().confirm();
    await flush();
    expect(dialog().title).toBe("Save changes to 'draft.md'?");
    dialog().cancel();
    await flush();
    await flush();

    expect(removed).toEqual([]);
    expect(tabsOf(ONE.id).sort()).toEqual([clean, dirty].sort());
  });

  it("removes the project once Don't Save has closed the tab, and no earlier", async () => {
    const dirty = await open(ONE, 'draft.md');
    useEditor.getState().markDirty(dirty, true);
    await open(TWO, 'clean.md');

    useApp.getState().closeProject(ONE.id);
    dialog().confirm();
    await flush();
    expect(dialog().title).toBe("Save changes to 'draft.md'?");
    expect(removed).toEqual([]);

    dialog().alt();
    await flush();
    await flush();
    expect(tabsOf(ONE.id)).toEqual([]);
    expect(removed).toEqual(['p1']);
    expect(useApp.getState().projects.map((p) => p.id)).toEqual(['p2']);
    // The active project fell back through the one writer, so a reader that
    // follows the value sees the fallback.
    expect(useApp.getState().activeProjectId).toBe('p2');
    expect(tabsOf(TWO.id)).toEqual([`${TWO.path}/clean.md`]);
  });
});

describe('closing a project whose tabs are all clean', () => {
  it('closes its tabs and removes it without a second question', async () => {
    await open(ONE, 'a.md');
    await open(ONE, 'b.md');
    const other = await open(TWO, 'clean.md');

    useApp.getState().closeProject(ONE.id);
    expect(dialog().title).toBe("Close 'one'?");
    dialog().confirm();
    await flush();
    await flush();

    expect(useApp.getState().confirm).toBeNull();
    expect(tabsOf(ONE.id)).toEqual([]);
    expect(removed).toEqual(['p1']);
    expect(tabsOf(TWO.id)).toEqual([other]);
  });

  it('removes a project that never had a tab', async () => {
    useApp.getState().closeProject(TWO.id);
    dialog().confirm();
    await flush();
    await flush();
    expect(removed).toEqual(['p2']);
    expect(useApp.getState().projects.map((p) => p.id)).toEqual(['p1']);
  });
});
