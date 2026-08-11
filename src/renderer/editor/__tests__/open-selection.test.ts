/**
 * Phase 14 contract: an OpenFileRequest that carries a `selection` is a
 * NAVIGATION, and three rules follow (research 19 §2.6). All three are
 * invisible from the outside and each one, broken, produces the same
 * un-debuggable symptom — "clicking a search result does nothing useful" —
 * so each gets an assertion here rather than a reading of the code.
 *
 *  (a) it lands on a surface that HAS lines: File mode, whatever the request
 *      or the extension would otherwise have picked, with `canDiff` intact
 *  (b) it lands on RE-open of an already-open tab, not only on first open
 *  (c) the range reaches MonacoHost as `pendingSelection` (the reveal itself
 *      is imperative Monaco and belongs to the host's own verification)
 *
 * Plus the focus rule that makes an arrow-key walk through search results
 * usable at all: a PREVIEW open from the list must not pull focus out of it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: '', truncated: false }));
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile: vi.fn(), readDir: vi.fn() },
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
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'src/auth.ts',
    path: '/repo/src/auth.ts',
    mode: 'file',
    source: 'search',
    ...over
  };
}

/** The shape a search result emits: 1-based line, 0-based columns. */
const HIT = { line: 412, column: 10, endColumn: 13 } as const;

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('rule (a) — a selection forces a surface with lines on it', () => {
  it('opens a CHANGED file in File mode, not the diff', () => {
    useEditor
      .getState()
      .openFromRequest(req({ mode: 'diff', selection: HIT }));
    const tab = useEditor.getState().activeTab();
    expect(tab?.mode).toBe('file');
  });

  it('keeps canDiff true so the mode chip still offers the diff', () => {
    useEditor
      .getState()
      .openFromRequest(req({ mode: 'diff', selection: HIT }));
    expect(useEditor.getState().activeTab()?.canDiff).toBe(true);
  });

  it('opens markdown as Source, not as the rendered preview', () => {
    useEditor.getState().openFromRequest(
      req({
        relPath: 'README.md',
        path: '/repo/README.md',
        selection: { line: 7 }
      })
    );
    expect(useEditor.getState().activeTab()?.mode).toBe('file');
  });

  it('leaves a raster image in the image viewer and ignores the line', () => {
    // There is no text under a .png to reveal, and forcing File mode would
    // push it through the text reader and print "binary file" over a picture.
    useEditor.getState().openFromRequest(
      req({
        relPath: 'docs/chart.png',
        path: '/repo/docs/chart.png',
        selection: { line: 3 }
      })
    );
    const tab = useEditor.getState().activeTab();
    expect(tab?.mode).toBe('image');
    expect(tab?.pendingSelection).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });

  it('leaves an ordinary open alone — no selection, no forcing', () => {
    useEditor.getState().openFromRequest(req({ mode: 'diff', source: 'tree' }));
    const tab = useEditor.getState().activeTab();
    expect(tab?.mode).toBe('diff');
    expect(tab?.pendingSelection).toBeNull();
  });
});

describe('rule (b) — re-opening an already-open tab still lands', () => {
  it('sets a fresh pendingSelection on the SECOND hit in the same file', () => {
    const state = useEditor.getState();
    state.openFromRequest(req({ selection: HIT }));
    // Consume the first landing, exactly as MonacoHost does.
    const id = useEditor.getState().activeId as string;
    useEditor.getState().clearPendingSelection(id);
    expect(useEditor.getState().activeTab()?.pendingSelection).toBeNull();

    useEditor
      .getState()
      .openFromRequest(req({ selection: { line: 980, column: 4 } }));

    expect(useEditor.getState().tabs).toHaveLength(1);
    expect(useEditor.getState().activeTab()?.pendingSelection).toEqual({
      line: 980,
      column: 4
    });
  });

  it('switches an already-open DIFF tab back to File to land on it', () => {
    const state = useEditor.getState();
    state.openFromRequest(req({ mode: 'diff', source: 'worktree' }));
    const id = useEditor.getState().activeId as string;
    expect(useEditor.getState().activeTab()?.mode).toBe('diff');

    useEditor.getState().openFromRequest(req({ mode: 'diff', selection: HIT }));

    const tab = useEditor.getState().activeTab();
    expect(tab?.id).toBe(id);
    expect(tab?.mode).toBe('file');
    expect(tab?.pendingSelection).toEqual(HIT);
  });
});

describe('rule (c) — the range travels intact to the host', () => {
  it('hands over line and both columns unchanged (no +1 in the store)', () => {
    useEditor.getState().openFromRequest(req({ selection: HIT }));
    expect(useEditor.getState().activeTab()?.pendingSelection).toEqual(HIT);
  });

  it('clearing the landing also restores the focus default', () => {
    useEditor.getState().openFromRequest(req({ selection: HIT }));
    const id = useEditor.getState().activeId as string;
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(false);
    useEditor.getState().clearPendingSelection(id);
    const tab = useEditor.getState().activeTab();
    expect(tab?.pendingSelection).toBeNull();
    expect(tab?.pendingFocus).toBe(true);
  });
});

describe('focus — the results list keeps the arrow keys', () => {
  it('a PREVIEW open from search does not take focus', () => {
    useEditor
      .getState()
      .openFromRequest(req({ selection: HIT, preview: true }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(false);
  });

  it('a PINNED open from search does take focus', () => {
    useEditor
      .getState()
      .openFromRequest(req({ selection: HIT, preview: false }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(true);
  });

  it('a symbol or quick-open pick takes focus even as a preview', () => {
    useEditor
      .getState()
      .openFromRequest(req({ selection: HIT, source: 'symbol' }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(true);
  });
});
