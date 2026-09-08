/**
 * PHASE 233. One file of ONE COMMIT on another machine, in the diff surface
 * this product already has.
 *
 * WHAT THIS FILE IS FOR. A tab carrying both `commit` and `remote` is new: no
 * loader read both before this phase, and every seam in the editor that asks
 * about one of them had to be checked for what it does when both are there.
 * Four things can go wrong and none of them is caught by a type.
 *
 * 1. The wrong loader runs. `loadRemoteDiff` reads the WORKING COPY on that
 *    machine and `loadCommitDiff` reads THIS Mac's git, and both would draw a
 *    plausible diff of the wrong two things.
 * 2. The tab collides with the review tab of the same file, so opening a
 *    commit's copy of `src/a.ts` replaces the working copy a person had open.
 * 3. The ceiling is not applied, so a file the far side cut at 90,000 bytes is
 *    drawn as if it were whole, which is a diff of two files neither of which
 *    is the one that was asked for.
 * 4. A sentence a person reads ONLY because the folder is on another machine.
 *    The operator's rule for every remote phase is that a remote tab feels
 *    almost identical to a local one, so the tab's tooltip and the panel's
 *    read-only band are asserted to be the LOCAL commit tab's, word for word.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

const readFile = vi.fn(async () => ({ contents: 'local bytes', truncated: false }));
const showHead = vi.fn(async () => 'head bytes');
const readDir = vi.fn(async () => ({ entries: [] as { name: string }[] }));
const commitFileDiff = vi.fn(async () => ({
  oldContents: 'this Mac, before\n',
  newContents: 'this Mac, after\n',
  binary: false
}));
const reviewFile = vi.fn(async () => ({
  oldContents: 'the working copy, before\n',
  newContents: 'the working copy, after\n',
  binary: false,
  truncated: false,
  note: null as string | null
}));
const readCommitFile = vi.fn(async () => ({
  oldContents: 'in the parent\n',
  newContents: 'in the commit\n',
  binary: false,
  oldBytes: 14,
  newBytes: 14
}));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, writeFile: vi.fn(), readDir, readImage: vi.fn() },
    git: { showHead, commitFileDiff, onChanged: () => () => undefined },
    machines: { reviewFile, readCommitFile }
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
const { tabTooltipIdentity, remoteCommitTabId } = await import('../tab-identity');
const { tabIsReadOnly } = await import('../MonacoHost');
const { remoteOpenTooLarge } = await import('../../machines/editor');
const { REMOTE_FILE_MAX_BYTES } = await import('@shared/ipc');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../store').EditorTab;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/api'
};
const SHA = 'ce801432aa11bb22cc33dd44ee55ff6677889900';

function commitReq(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: REMOTE.repoPath,
    relPath: 'docs/changelog.md',
    path: `${REMOTE.repoPath}/docs/changelog.md`,
    mode: 'diff',
    source: 'history',
    preview: false,
    commit: {
      sha: SHA,
      shortSha: SHA.slice(0, 7),
      status: 'A',
      subject: 'a changelog, and a delete'
    },
    remote: REMOTE,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
  readCommitFile.mockResolvedValue({
    oldContents: 'in the parent\n',
    newContents: 'in the commit\n',
    binary: false,
    oldBytes: 14,
    newBytes: 14
  });
});

// ---------------------------------------------------------------------------
// Which reader runs, and what it is asked
// ---------------------------------------------------------------------------

describe('opening one file of one commit on a machine', () => {
  it('fills both sides from that machine and asks nothing else', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.headContents).toBe('in the parent\n');
    expect(tab?.savedContents).toBe('in the commit\n');
    expect(tab?.mode).toBe('diff');
    expect(tab?.canDiff).toBe(true);
    expect(tab?.loading).toBe(false);
    expect(tab?.error).toBe(null);
    // THE THREE READERS THAT WOULD HAVE DRAWN THE WRONG TWO THINGS. The
    // working copy over there, this Mac's git for the same commit, and this
    // Mac's own file at that path.
    expect(reviewFile).not.toHaveBeenCalled();
    expect(commitFileDiff).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
    expect(showHead).not.toHaveBeenCalled();
    expect(readDir).not.toHaveBeenCalled();
  });

  it('names the folder, the commit and the path on that machine', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    expect(readCommitFile).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      sha: SHA,
      path: 'docs/changelog.md',
      origPath: null
    });
  });

  it('reads a rename at both of its paths', async () => {
    // The Phase 11 carried finding (a): ask the parent for the NEW path after
    // a rename and it has no blob, so the file renders as one big addition.
    useEditor.getState().openFromRequest(
      commitReq({
        relPath: 'docs/design-renamed.md',
        path: `${REMOTE.repoPath}/docs/design-renamed.md`,
        commit: {
          sha: SHA,
          shortSha: SHA.slice(0, 7),
          status: 'R',
          origPath: 'docs/design.md'
        }
      })
    );
    await flush();
    expect(readCommitFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'docs/design-renamed.md',
        origPath: 'docs/design.md'
      })
    );
  });

  it('is its own tab beside the working copy of the same file', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    useEditor.getState().openFromRequest({
      repoPath: REMOTE.repoPath,
      relPath: 'docs/changelog.md',
      path: `${REMOTE.repoPath}/docs/changelog.md`,
      mode: 'diff',
      source: 'machine',
      preview: false,
      remote: REMOTE
    });
    await flush();
    const ids = useEditor.getState().tabs.map((one) => one.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(
      remoteCommitTabId('studio', '/home/greg/api', SHA, 'docs/changelog.md')
    );
    expect(ids).toContain('machine:studio:/home/greg/api:docs/changelog.md');
  });

  it('is its own tab beside the SAME file at another commit', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    const other = `${'ad8e8167'}aa11bb22cc33dd44ee55ff6677889900`;
    useEditor.getState().openFromRequest(
      commitReq({
        commit: { sha: other, shortSha: other.slice(0, 7), status: 'M' }
      })
    );
    await flush();
    expect(useEditor.getState().tabs).toHaveLength(2);
  });

  it('says which file when a side is binary', async () => {
    readCommitFile.mockResolvedValueOnce({
      oldContents: '',
      newContents: '',
      binary: true,
      oldBytes: 900,
      newBytes: 900
    });
    useEditor.getState().openFromRequest(
      commitReq({
        relPath: 'docs/logo.png',
        path: `${REMOTE.repoPath}/docs/logo.png`
      })
    );
    await flush();
    expect(useEditor.getState().activeTab()?.error).toContain('logo.png');
  });

  it('turns a channel that threw into a sentence and not a crash', async () => {
    readCommitFile.mockRejectedValueOnce(
      new Error(
        '{"code":"INVALID_INPUT","message":"Tortie is not connected to that ' +
          'machine right now."}'
      )
    );
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab?.error).toBe('Tortie is not connected to that machine right now.');
    expect(tab?.error).not.toContain('{');
  });
});

// ---------------------------------------------------------------------------
// The ceiling, which is 90,000 bytes on either side
// ---------------------------------------------------------------------------

describe('the 90,000 byte ceiling', () => {
  it('opens a file exactly at it', async () => {
    readCommitFile.mockResolvedValueOnce({
      oldContents: 'x',
      newContents: 'y',
      binary: false,
      oldBytes: REMOTE_FILE_MAX_BYTES,
      newBytes: REMOTE_FILE_MAX_BYTES
    });
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    expect(useEditor.getState().activeTab()?.error).toBe(null);
  });

  it('refuses one byte over it, on either side, naming the real size', async () => {
    for (const side of ['oldBytes', 'newBytes'] as const) {
      useEditor.setState({ tabs: [], activeId: null });
      readCommitFile.mockResolvedValueOnce({
        oldContents: 'x',
        newContents: 'y',
        binary: false,
        oldBytes: 10,
        newBytes: 10,
        [side]: REMOTE_FILE_MAX_BYTES + 1
      });
      useEditor.getState().openFromRequest(commitReq());
      await flush();
      const tab = useEditor.getState().activeTab();
      // THE SENTENCE THE EDITOR ALREADY USES for a large remote file, which is
      // what the charter names, with the size the far side counted whole.
      expect(tab?.error).toBe(
        remoteOpenTooLarge(REMOTE_FILE_MAX_BYTES + 1, 'Studio')
      );
      expect(tab?.error).toContain('90,001');
      expect(tab?.headContents).toBe(null);
      expect(tab?.savedContents).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// The face: the same words the LOCAL commit tab draws, and no others
// ---------------------------------------------------------------------------

describe('what a person reads on the tab', () => {
  it('wears the local history tab line, not the review tab line', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    const tab = useEditor.getState().activeTab();
    expect(tab).toBeDefined();
    const line = tabTooltipIdentity(tab!);
    // Byte for byte what the LOCAL commit tab draws for the same file at the
    // same commit, composed here from the same three parts.
    expect(line).toBe(
      `docs/changelog.md — ${SHA.slice(0, 7)} · a changelog, and a delete`
    );
    // The review tab's second sentence is a sentence a person would read only
    // because the folder is on another machine, and the local commit tab does
    // not draw it. THE OPERATOR'S RULE FOR EVERY REMOTE PHASE IS WHY THIS
    // ASSERTION IS HERE.
    expect(line).not.toContain('read only');
  });

  it('leaves the review tab saying exactly what it said', async () => {
    useEditor.getState().openFromRequest({
      repoPath: REMOTE.repoPath,
      relPath: 'docs/changelog.md',
      path: `${REMOTE.repoPath}/docs/changelog.md`,
      mode: 'diff',
      source: 'machine',
      preview: false,
      remote: REMOTE
    });
    await flush();
    const line = tabTooltipIdentity(useEditor.getState().activeTab()!);
    expect(line).toBe('changelog.md on Studio. This view is read only.');
  });

  it('refuses every keystroke, on a machine saving is on for', async () => {
    useEditor.getState().openFromRequest(commitReq());
    await flush();
    const tab = useEditor.getState().activeTab() as EditorTab;
    // The past is not an edit surface on any machine, so the write root is
    // driven both ways and neither answer opens it.
    expect(tabIsReadOnly(tab, '/home/greg/api')).toBe(true);
    expect(tabIsReadOnly(tab, null)).toBe(true);
  });

  it('draws the LOCAL read-only band, and the panel asks the commit first', () => {
    // The panel is not rendered here, so the ORDER of its three branches is
    // read off its source. A remote tab whose commit is null keeps the Phase
    // 90.3 band; a remote tab carrying a commit falls through to the commit
    // band, which is the sentence the local commit tab draws.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/editor/EditorPanel.tsx'),
      'utf8'
    );
    expect(source).toContain(
      'activeTab.remote !== undefined &&\n          activeTab.commit === null &&\n          remoteWriteRoot === null'
    );
    expect(source).toContain('Viewing this file as of {activeTab.commit.shortSha}');
  });
});
