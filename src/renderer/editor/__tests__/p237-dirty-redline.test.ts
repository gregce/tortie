/**
 * PHASE 237, items 2 and 4.
 *
 * ITEM 2: a dirty redline refreshes like a dirty File tab and says so. Typing
 * in the redline writes the tab's own monaco buffer, so the tab goes dirty and
 * `refreshRepo` skips its re-read exactly as it has always skipped a dirty File
 * tab — deliberately, because re-reading would throw the person's unsaved words
 * away. What is new is that a person can now be in that state from the redline
 * itself, so the skip is pinned here rather than inferred, on BOTH sides: a
 * clean tab is re-read and a dirty one is not, and the HEAD half runs either
 * way so the baseline still moves when a commit lands under a dirty buffer.
 *
 * ITEM 4: the two undos are said apart. ⌘Z is monaco's undo of the typing;
 * ⌥⇧⌫ is the journal's undo of a rewind, which is a write of the file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn();
const readDir = vi.fn();
const showHead = vi.fn();

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    fs: { readFile, readDir, writeFile: vi.fn(), readImage: vi.fn() },
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

const { createTabIo } = await import('../tab-io');
const { baselineSentence, nextBaseline, NO_BASELINE } = await import('../baseline');
const { redlineUndoNote } = await import('../redline-sentences');
type EditorTab = import('../store').EditorTab;

const ON_DISK = 'The quick brown fox.\nA second line.\n';
const TYPED = 'The quick brown fox, and a word the person typed.\nA second line.\n';

function proseTab(over: Partial<EditorTab> = {}): EditorTab {
  return {
    id: '/repo/notes.txt',
    path: '/repo/notes.txt',
    relPath: 'notes.txt',
    origRelPath: null,
    repoPath: '/repo',
    name: 'notes.txt',
    mode: 'redline',
    canDiff: true,
    commit: null,
    dirty: false,
    loading: false,
    error: null,
    savedContents: ON_DISK,
    headContents: ON_DISK,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: ON_DISK }),
    ...over
  } as Partial<EditorTab> as EditorTab;
}

beforeEach(() => {
  readFile.mockReset();
  readDir.mockReset();
  showHead.mockReset();
  readDir.mockResolvedValue({ entries: [{ name: 'notes.txt' }] });
  readFile.mockResolvedValue({ contents: ON_DISK, truncated: false });
  showHead.mockResolvedValue(ON_DISK);
});

async function refresh(tab: EditorTab): Promise<Partial<EditorTab>[]> {
  const patches: Partial<EditorTab>[] = [];
  let current = tab;
  const io = createTabIo({
    patch: (_id, patch) => {
      patches.push(patch);
      current = { ...current, ...patch };
    },
    byId: () => current,
    worktreeTabsIn: () => [tab]
  });
  await io.refreshRepo('/repo');
  return patches;
}

describe('a dirty redline refreshes like a dirty File tab', () => {
  it('is NOT re-read from disk while the person has unsaved words', async () => {
    // The agent rewrote the file on disk while the person was typing.
    readFile.mockResolvedValue({ contents: 'something else entirely\n', truncated: false });
    const patches = await refresh(proseTab({ dirty: true, savedContents: TYPED }));
    expect(readFile).not.toHaveBeenCalled();
    expect(patches.some((p) => 'savedContents' in p)).toBe(false);
  });

  it('IS re-read when it is clean, so the same view is not simply frozen', async () => {
    readFile.mockResolvedValue({ contents: 'an agent wrote this\n', truncated: false });
    const patches = await refresh(proseTab({ dirty: false }));
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(patches.some((p) => p.savedContents === 'an agent wrote this\n')).toBe(true);
  });

  it('still asks git, so a commit under a dirty buffer still moves the baseline', async () => {
    showHead.mockResolvedValue('a committed version\n');
    const patches = await refresh(proseTab({ dirty: true, savedContents: TYPED }));
    expect(showHead).toHaveBeenCalledTimes(1);
    const moved = patches.find((p) => p.baseline !== undefined)?.baseline;
    expect(moved?.text).toBe('a committed version\n');
  });
});

describe('and the face says so', () => {
  it('names the limit while there are unsaved edits, and drops it when there are none', () => {
    const state = nextBaseline(NO_BASELINE, { kind: 'head', contents: ON_DISK });
    expect(baselineSentence(state, true)).toBe(
      'Marked since the last commit, for as long as this tab is open.' +
        ' Not refreshed from disk while there are unsaved edits.'
    );
    expect(baselineSentence(state, false)).toBe(
      'Marked since the last commit, for as long as this tab is open.'
    );
  });
});

describe('the two undos are one short line and never merged', () => {
  it('says nothing at all when there is no rewind to undo', () => {
    expect(redlineUndoNote(false, false)).toBeNull();
    expect(redlineUndoNote(false, true)).toBeNull();
  });

  it("is Phase 227's own sentence when the typing half is not in play", () => {
    expect(redlineUndoNote(true, false)).toBe(
      'Undo the last rewind with ⌥⇧⌫. It lasts for this session.'
    );
  });

  it('names both keys, and which is which, when both are available', () => {
    const line = redlineUndoNote(true, true);
    expect(line).toBe(
      '⌘Z undoes your typing. ⌥⇧⌫ undoes the last rewind, once your edits are saved.'
    );
    // One line, and short: the operator's *just enough words* rule.
    expect(line?.includes('\n')).toBe(false);
    expect((line ?? '').length).toBeLessThan(100);
  });
});
