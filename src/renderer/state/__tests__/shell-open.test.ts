/**
 * pullPendingShellOpen (Phase 61): the one pull both delivery legs call.
 *
 * The pull is take-and-clear main-side; what these tests pin is the
 * renderer's half of the contract:
 *
 *  - a folder-only pull opens the project and touches nothing else;
 *  - a folder-plus-file pull opens the project FIRST, arms the editor's
 *    open-bus subscription, then emits one pinned tree-shaped open;
 *  - a null pull, a missing bridge and a rejected pull all do nothing;
 *  - a failed addProjectPath abandons the file half on purpose.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellPendingOpen } from '@shared/ipc';
import type { OpenFileRequest } from '../open-file';

/** Ordered call journal, so project-before-file is provable. */
const journal: string[] = [];

let pendingResult: ShellPendingOpen | null = null;
let pullRejects = false;
let takePendingOpen: (() => Promise<ShellPendingOpen | null>) | undefined;

/** What the mocked store believes is open. Tests fill it per case. */
let projects: { id: string; name: string; path: string }[] = [];
/** When true, addProjectPath "fails": it toasts (silently here) and adds nothing. */
let addFails = false;

const addProjectPath = vi.fn(async (path: string) => {
  journal.push(`addProjectPath:${path}`);
  if (!addFails) {
    projects = [...projects, { id: `id-${path}`, name: path, path }];
  }
});

vi.mock('../store', () => ({
  useApp: {
    getState: () => ({ addProjectPath, projects })
  }
}));

const requestOpenFile = vi.fn((req: OpenFileRequest) => {
  journal.push(`requestOpenFile:${req.path}`);
});
vi.mock('../open-file', () => ({
  requestOpenFile: (req: OpenFileRequest) => requestOpenFile(req)
}));

// The dynamic import inside pullPendingShellOpen resolves to this mock, so
// the test proves init() is called before the emit without loading Monaco.
const editorInit = vi.fn(() => {
  journal.push('editor.init');
});
vi.mock('../../editor/store', () => ({
  useEditor: {
    getState: () => ({ init: editorInit })
  }
}));

vi.stubGlobal('window', {
  get gmux() {
    return { takePendingOpen };
  }
});

const { pullPendingShellOpen } = await import('../shell-open');

beforeEach(() => {
  journal.length = 0;
  projects = [];
  addFails = false;
  pullRejects = false;
  pendingResult = null;
  addProjectPath.mockClear();
  requestOpenFile.mockClear();
  editorInit.mockClear();
  takePendingOpen = () =>
    pullRejects
      ? Promise.reject(new Error('bridge broke'))
      : Promise.resolve(pendingResult);
});

describe('folder-only pull', () => {
  it('opens the project and emits no file open', async () => {
    pendingResult = { folder: '/tmp/proj', file: null };
    await pullPendingShellOpen();
    expect(addProjectPath).toHaveBeenCalledTimes(1);
    expect(addProjectPath).toHaveBeenCalledWith('/tmp/proj');
    expect(requestOpenFile).not.toHaveBeenCalled();
    expect(editorInit).not.toHaveBeenCalled();
  });
});

describe('folder-plus-file pull', () => {
  it('opens the project first, then the file, as one pinned tree-shaped open', async () => {
    pendingResult = {
      folder: '/tmp/repo',
      file: '/tmp/repo/sub/readme.md'
    };
    await pullPendingShellOpen();
    expect(journal).toEqual([
      'addProjectPath:/tmp/repo',
      'editor.init',
      'requestOpenFile:/tmp/repo/sub/readme.md'
    ]);
    expect(requestOpenFile).toHaveBeenCalledWith({
      repoPath: '/tmp/repo',
      relPath: 'sub/readme.md',
      path: '/tmp/repo/sub/readme.md',
      mode: 'file',
      source: 'tree',
      preview: false
    });
  });
});

describe('nothing to deliver', () => {
  it('a null pull does nothing', async () => {
    pendingResult = null;
    await pullPendingShellOpen();
    expect(addProjectPath).not.toHaveBeenCalled();
    expect(requestOpenFile).not.toHaveBeenCalled();
  });

  it('a preload without the pull does nothing', async () => {
    takePendingOpen = undefined;
    await pullPendingShellOpen();
    expect(addProjectPath).not.toHaveBeenCalled();
  });

  it('a rejected pull is swallowed', async () => {
    pullRejects = true;
    await expect(pullPendingShellOpen()).resolves.toBeUndefined();
    expect(addProjectPath).not.toHaveBeenCalled();
  });
});

describe('a folder that never became a project', () => {
  it('abandons the file half on purpose', async () => {
    addFails = true;
    pendingResult = { folder: '/tmp/gone', file: '/tmp/gone/readme.md' };
    await pullPendingShellOpen();
    expect(addProjectPath).toHaveBeenCalledWith('/tmp/gone');
    expect(requestOpenFile).not.toHaveBeenCalled();
    expect(editorInit).not.toHaveBeenCalled();
  });
});
