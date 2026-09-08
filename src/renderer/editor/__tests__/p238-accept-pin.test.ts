/**
 * PHASE 238's FIX ROUND. THE PIN, PINNED.
 *
 * `acceptBaseline` in ../store calls `get().pin(id)` before it moves the
 * baseline, and docs/research/98 §0 records that line as CONDITION 1 for
 * shipping accept at all: a redline opened the ordinary way is the PREVIEW
 * tab, and the next single click on any other file in the Explorer replaces
 * that tab object outright and destroys the in-memory baseline with it. The
 * measure step drove it both ways in one session — 8 changes surviving 0
 * unpinned and 8 of 8 pinned.
 *
 * NOTHING IN THE TREE PINNED IT. The verifier deleted the line and ran the
 * whole battery green: `conformance:redline` scans the redline's own files and
 * never ../store, `probe:p238` stands in with an untracked file's baseline and
 * drives no real accept, and `probe:p167` never opens a preview tab. So the
 * one line the phase's shipping decision rests on could be deleted later with
 * nothing going red. This is the check that goes red.
 *
 * It drives the SHIPPING store through the SHIPPING `openFromRequest`, which
 * is what a single click in the Explorer calls, and it reads the tab list
 * afterwards. The control is the same two clicks with NO accept between them,
 * which must lose the tab: a check that passes whatever the store does would
 * prove nothing about the pin.
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

/** One single click on a row in the Explorer: a PREVIEW open. */
const click = (relPath: string): OpenFileRequest => ({
  repoPath: '/repo',
  relPath,
  path: `/repo/${relPath}`,
  mode: 'file',
  source: 'tree'
});

const ACCEPTED = 'The quick red fox.\n';

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
});

describe('an accept keeps the tab it was made on', () => {
  it('THE CONTROL: a preview tab with no accept is replaced by the next click', () => {
    useEditor.getState().openFromRequest(click('notes.txt'));
    const first = useEditor.getState().activeId;
    expect(useEditor.getState().tabs).toHaveLength(1);
    expect(useEditor.getState().tabs[0]?.preview).toBe(true);
    useEditor.getState().openFromRequest(click('other.txt'));
    // The preview slot was reused: the first tab, and its baseline, are gone.
    expect(useEditor.getState().tabs).toHaveLength(1);
    expect(useEditor.getState().tabs[0]?.relPath).toBe('other.txt');
    expect(useEditor.getState().tabs.some((t) => t.id === first)).toBe(false);
  });

  it('AND THE PIN: a tab that was accepted on survives the same click', () => {
    useEditor.getState().openFromRequest(click('notes.txt'));
    const id = useEditor.getState().activeId as string;
    useEditor.getState().acceptBaseline(id, ACCEPTED, 1_757_000_000_000);
    // The pin is the accept's own act, and it happens on the accept rather
    // than on the next click, so the tab is already permanent here.
    expect(useEditor.getState().tabs[0]?.preview).toBe(false);
    useEditor.getState().openFromRequest(click('other.txt'));
    const tabs = useEditor.getState().tabs;
    expect(tabs).toHaveLength(2);
    const kept = tabs.find((t) => t.id === id);
    expect(kept?.relPath).toBe('notes.txt');
    // And the whole point of keeping it: the baseline the person accepted.
    expect(kept?.baseline?.text).toBe(ACCEPTED);
    expect(kept?.baseline?.from).toBe('accept');
    expect(kept?.baseline?.acceptedAt).toBe(1_757_000_000_000);
  });

  it('moves the baseline through the shipping rule, generation and all', () => {
    useEditor.getState().openFromRequest(click('notes.txt'));
    const id = useEditor.getState().activeId as string;
    const before = useEditor.getState().tabs[0]?.baseline?.generation ?? -1;
    useEditor.getState().acceptBaseline(id, ACCEPTED, 7);
    expect(useEditor.getState().tabs[0]?.baseline?.generation).toBe(before + 1);
  });

  it('a tab that is not there is not opened by an accept aimed at it', () => {
    useEditor.getState().acceptBaseline('no-such-tab', ACCEPTED, 7);
    expect(useEditor.getState().tabs).toHaveLength(0);
  });
});
