/**
 * The review tab: a file on ANOTHER MACHINE in the diff surface this product
 * already has (Phase 73, M6, item 4).
 *
 * The item's own condition was that it reuse the existing diff surface or not
 * happen, so what this file checks is exactly the seam that reuse rides on:
 * both sides arrive from main, the tab is immutable, no reader on this Mac is
 * ever pointed at the path, and the tab's identity carries the machine.
 *
 * `src/renderer/editor/PierreDiff.tsx` is not imported here and is not edited
 * by this phase. If it had needed a change, the honest report was that the
 * reuse did not work.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'local bytes', truncated: false }));
const writeFile = vi.fn(async () => undefined);
const showHead = vi.fn(async () => 'head bytes');
const readDir = vi.fn(async () => ({ entries: [] as { name: string }[] }));
const reviewFile = vi.fn(async () => ({
  oldContents: 'on the machine, before\n',
  newContents: 'on the machine, after\n',
  binary: false,
  truncated: false,
  note: null as string | null
}));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, writeFile, readDir, readImage: vi.fn() },
    git: { showHead, onChanged: () => () => undefined },
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
const { tabTooltipIdentity } = await import('../tab-identity');
const { reviewTabTooltip } = await import('../../app/machine-copy');
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

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('opening a review', () => {
  it('fills both sides from the machine and reads nothing on this Mac', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.headContents).toBe('on the machine, before\n');
    expect(tab?.savedContents).toBe('on the machine, after\n');
    expect(tab?.mode).toBe('diff');
    expect(tab?.canDiff).toBe(true);
    expect(tab?.loading).toBe(false);
    // The three readers that would have read THIS Mac at that path.
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(readDir).not.toHaveBeenCalled();
  });

  it('asks about the repository on the machine, by its own paths', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    expect(reviewFile).toHaveBeenCalledWith({
      machineId: 'studio',
      repoPath: '/home/greg/api',
      path: 'src/auth.ts',
      origPath: null
    });
  });

  it('reads a rename at both of its paths', async () => {
    useEditor.getState().openFromRequest(
      reviewReq({
        relPath: 'src/new.ts',
        path: `${REMOTE.repoPath}/src/new.ts`,
        origPath: 'src/old.ts'
      })
    );
    await flush();
    expect(reviewFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'src/new.ts', origPath: 'src/old.ts' })
    );
  });

  it('keys the tab by the machine, so it never collides with a file here', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const remoteTab = useEditor.getState().activeTab();
    expect(remoteTab?.id).toBe('machine:studio:src/auth.ts');

    // The same absolute path, opened from this Mac. In this phase's own probes
    // the far side IS this Mac, so this collision is not hypothetical.
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
    const ids = useEditor.getState().tabs.map((one) => one.id);
    expect(ids).toContain('machine:studio:src/auth.ts');
    expect(ids).toContain('/home/greg/api/src/auth.ts');
  });

  it('says so when the machine could not be asked', async () => {
    reviewFile.mockRejectedValueOnce(
      new Error(
        '{"code":"INVALID_INPUT","message":"Tortie is not connected to that ' +
          'machine right now."}'
      )
    );
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.error).toBe('Tortie is not connected to that machine right now.');
    expect(tab?.error).not.toContain('{');
  });

  it('shows neither side for a binary file, and says which file', async () => {
    reviewFile.mockResolvedValueOnce({
      oldContents: '',
      newContents: '',
      binary: true,
      truncated: false,
      note: null
    });
    useEditor.getState().openFromRequest(
      reviewReq({ relPath: 'docs/logo.png', path: `${REMOTE.repoPath}/docs/logo.png` })
    );
    await flush();
    expect(useEditor.getState().activeTab()?.error).toContain('logo.png');
  });
});

// ---------------------------------------------------------------------------
// What the tab strip says about it
// ---------------------------------------------------------------------------

describe('the tab a person hovers', () => {
  /**
   * PHASE 73 FIX ROUND. The strip drew `tab.path`, which on a review tab is a
   * path on ANOTHER COMPUTER. It names a file this Mac may not have, and it may
   * name a different file this Mac does have, and it never says the machine.
   */
  it('names the machine and says the view is read only', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab).toBeDefined();
    const line = tabTooltipIdentity(tab!);
    expect(line).toBe(reviewTabTooltip('auth.ts', 'Studio'));
    expect(line).toContain('Studio');
    expect(line).toContain('read only');
  });

  it('never shows the far side path, which means nothing on this Mac', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tabTooltipIdentity(tab!)).not.toContain(REMOTE.repoPath);
  });

  it('leaves every other kind of tab saying what it already said', async () => {
    // The four answers the strip has drawn since Phase 12. A review tab is a
    // fifth answer beside them and not a change to any of them.
    const base = {
      name: 'auth.ts',
      relPath: 'src/auth.ts',
      path: '/repo/src/auth.ts',
      commit: null,
      deleted: false,
      mode: 'file',
      canDiff: false
    };
    type Tab = Parameters<typeof tabTooltipIdentity>[0];
    expect(tabTooltipIdentity(base as unknown as Tab)).toBe('/repo/src/auth.ts');
    expect(
      tabTooltipIdentity({ ...base, deleted: true } as unknown as Tab)
    ).toBe('Deleted on disk');
    expect(
      tabTooltipIdentity({
        ...base,
        mode: 'diff',
        canDiff: true
      } as unknown as Tab)
    ).toBe('auth.ts — changes vs HEAD');
    expect(
      tabTooltipIdentity({
        ...base,
        commit: { sha: 'abc', shortSha: 'abc1234', subject: 'a change' }
      } as unknown as Tab)
    ).toBe('src/auth.ts — abc1234 · a change');
  });
});

describe('a review tab is immutable', () => {
  it('never becomes dirty, so closing it can never offer to save it', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const id = useEditor.getState().activeId as string;
    useEditor.getState().markDirty(id, true);
    expect(useEditor.getState().activeTab()?.dirty).toBe(false);
  });

  it('is never written back, even when a save is asked for', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    await useEditor.getState().save();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('never asks this Mac for a HEAD version when the mode is set again', async () => {
    useEditor.getState().openFromRequest(reviewReq());
    await flush();
    const id = useEditor.getState().activeId as string;
    useEditor.getState().setMode(id, 'file');
    useEditor.getState().setMode(id, 'diff');
    await flush();
    expect(showHead).not.toHaveBeenCalled();
  });
});
