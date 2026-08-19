/**
 * Phase 90.3. Saving a file that is on another machine is refused OUT LOUD.
 *
 * WHAT WAS WRONG. Phase 73 refused the save and said nothing. A person who
 * typed into a review tab and pressed Save was told nothing at all, and silence
 * after Save reads as a save that worked. Nothing was written on either
 * computer, so no work was lost, but the person was left believing a false
 * thing about somebody else's machine.
 *
 * WHAT THIS PROVES. Three things, and the first is the one that matters.
 *
 *  1. `fs.writeFile` is never called for such a tab. The refusal is a sentence
 *     on top of a refusal that already held, and not a replacement for it.
 *  2. The sentence names the machine and comes from the one copy module the
 *     vocabulary audit reads.
 *  3. The tab's identity carries the repository path as well as the machine, so
 *     two folders on ONE machine holding the same relative path are two tabs.
 *     That is the collision research 55 section 9.2 found, and a folder on a
 *     machine is a project tab from this phase, so it is the ordinary case.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'here', truncated: false }));
const writeFile = vi.fn(async () => undefined);
const reviewFile = vi.fn(async () => ({
  oldContents: 'before\n',
  newContents: 'after\n',
  binary: false,
  truncated: false,
  note: null as string | null
}));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, writeFile, readDir: vi.fn(), readImage: vi.fn() },
    git: { showHead: vi.fn(), onChanged: () => () => undefined },
    machines: { reviewFile }
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
const { useApp } = await import('../../state/store');
const { remoteSaveRefused } = await import('../../app/machine-copy');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/api'
};

function reviewReq(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: REMOTE.repoPath,
    relPath: 'src/auth.ts',
    path: `${REMOTE.repoPath}/src/auth.ts`,
    mode: 'diff',
    source: 'machine',
    preview: false,
    remote: REMOTE,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Every toast the app was asked to show, in order. */
let toasts: { kind: string; text: string }[] = [];

beforeEach(() => {
  toasts = [];
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  useApp.setState({
    toast: (kind: string, text: string) => {
      toasts.push({ kind, text });
    }
  } as never);
  vi.clearAllMocks();
});

describe('pressing Save on a file that is on another machine', () => {
  it('writes nothing on this Mac and names the machine', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    await useEditor.getState().save();
    expect(writeFile).not.toHaveBeenCalled();
    expect(toasts).toEqual([
      { kind: 'error', text: remoteSaveRefused('Studio') }
    ]);
    expect(toasts[0]?.text).toBe(
      'That file is on Studio, so Tortie cannot save it.'
    );
  });

  it('leaves the tab exactly as it was', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const before = useEditor.getState().activeTab();
    await useEditor.getState().save();
    const after = useEditor.getState().activeTab();
    expect(after?.dirty).toBe(before?.dirty);
    expect(after?.savedContents).toBe(before?.savedContents);
  });
});

describe('two folders on one machine', () => {
  it('are two tabs, because the key carries the repository path', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    useEditor.getState().openFromRequest(
      reviewReq({
        repoPath: '/home/greg/web',
        path: '/home/greg/web/src/auth.ts',
        remote: { ...REMOTE, repoPath: '/home/greg/web' }
      })
    );
    await flush();
    const ids = useEditor.getState().tabs.map((one) => one.id);
    expect(ids).toEqual([
      'machine:studio:/home/greg/api:src/auth.ts',
      'machine:studio:/home/greg/web:src/auth.ts'
    ]);
  });

  it('never collide with a file of that path on this Mac', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    useEditor.getState().openFromRequest({
      repoPath: REMOTE.repoPath,
      relPath: 'src/auth.ts',
      path: `${REMOTE.repoPath}/src/auth.ts`,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    await flush();
    expect(useEditor.getState().tabs).toHaveLength(2);
    expect(useEditor.getState().tabs.map((one) => one.id)).toContain(
      '/home/greg/api/src/auth.ts'
    );
  });
});
