/**
 * PHASE 334. WHERE A REDLINE TAB WAS LEFT, KEPT PER TAB AND DROPPED WITH THE TAB.
 *
 * Issue 32 item 3: leaving a Redline tab and coming back started at the top,
 * and two Redline tabs shared one offset, because the view is mounted once for
 * whichever tab is active and nothing read or wrote its `scrollTop`.
 * ./redline-scroll is the memory, keyed by tab id; this file pins it three
 * ways (build/p334/SPEC.md §5):
 *
 *   S1  the module: remember and read back; a negative offset is 0; NaN and
 *       Infinity store nothing; forget; rekey moves, displaces what was at the
 *       destination, clears the destination when the source has nothing, and
 *       is a no-op onto itself;
 *   S2  the three sites a tab leaves the store, driven through the REAL store:
 *       a close, the preview slot reused by the next preview open, and the
 *       least recently used tab evicted by an eleventh open, each leave
 *       nothing behind; a mode round trip keeps the place;
 *   S3  a rename in the tree, through the real ../../tree/editor-follow,
 *       carries the place to the new id and leaves nothing at the old one.
 *
 * The view's half (saving on scroll, restoring once drawn) is RedlineDocument's
 * and is pinned by p334-redline-view-wiring.test.ts.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {},
    setProjectsPosition: async () => {},
    fs: {
      readFile: async (path: string) => ({ path, contents: 'hello\n', encoding: 'utf8', truncated: false }),
      readImage: vi.fn(),
      writeFile: vi.fn(),
      readDir: async () => ({ entries: [] })
    },
    git: { showHead: async () => 'hello\n', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor, visibleTabsOf } = await import('../store');
const { useApp } = await import('../../state/store');
const { followMoves } = await import('../../tree/editor-follow');
const { forgetRedlineScroll, redlineScrollOf, rekeyRedlineScroll, rememberRedlineScroll } = await import(
  '../redline-scroll'
);
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

const ROOT = '/w/alpha';
const PROJECT = { id: 'proj-a', path: ROOT, name: 'alpha' };

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await new Promise((done) => setTimeout(done, 0));
};

function request(name: string, preview: boolean): OpenFileRequest {
  return {
    repoPath: ROOT,
    relPath: name,
    path: `${ROOT}/${name}`,
    mode: 'file',
    source: 'tree',
    ...(preview ? {} : { preview: false as const })
  };
}

async function open(name: string, preview = false): Promise<string> {
  useEditor.getState().openFromRequest(request(name, preview));
  await flush();
  return useEditor.getState().activeId as string;
}

// -----------------------------------------------------------------------------
// S1. The module.
// -----------------------------------------------------------------------------

describe('S1. the memory itself', () => {
  it('remembers per tab and reads back', () => {
    rememberRedlineScroll('s1-a', 1_200);
    rememberRedlineScroll('s1-b', 40);
    expect(redlineScrollOf('s1-a')).toBe(1_200);
    expect(redlineScrollOf('s1-b')).toBe(40);
    expect(redlineScrollOf('s1-never')).toBeUndefined();
    rememberRedlineScroll('s1-a', 300);
    expect(redlineScrollOf('s1-a')).toBe(300);
  });

  it('a negative offset is stored as 0', () => {
    rememberRedlineScroll('s1-neg', -25);
    expect(redlineScrollOf('s1-neg')).toBe(0);
  });

  it('NaN and Infinity store nothing, and leave what was there', () => {
    rememberRedlineScroll('s1-nan', Number.NaN);
    rememberRedlineScroll('s1-inf', Number.POSITIVE_INFINITY);
    rememberRedlineScroll('s1-ninf', Number.NEGATIVE_INFINITY);
    expect(redlineScrollOf('s1-nan')).toBeUndefined();
    expect(redlineScrollOf('s1-inf')).toBeUndefined();
    expect(redlineScrollOf('s1-ninf')).toBeUndefined();
    rememberRedlineScroll('s1-keep', 500);
    rememberRedlineScroll('s1-keep', Number.NaN);
    expect(redlineScrollOf('s1-keep')).toBe(500);
  });

  it('forget drops the place', () => {
    rememberRedlineScroll('s1-gone', 90);
    forgetRedlineScroll('s1-gone');
    expect(redlineScrollOf('s1-gone')).toBeUndefined();
  });

  it('rekey moves the place to the new id and leaves nothing at the old one', () => {
    rememberRedlineScroll('s1-from', 777);
    rekeyRedlineScroll('s1-from', 's1-to');
    expect(redlineScrollOf('s1-to')).toBe(777);
    expect(redlineScrollOf('s1-from')).toBeUndefined();
  });

  it('rekey displaces what was at the destination', () => {
    rememberRedlineScroll('s1-mover', 10);
    rememberRedlineScroll('s1-taken', 9_999);
    rekeyRedlineScroll('s1-mover', 's1-taken');
    expect(redlineScrollOf('s1-taken')).toBe(10);
  });

  it('rekey from a tab with no place clears the destination', () => {
    rememberRedlineScroll('s1-stale', 4_000);
    rekeyRedlineScroll('s1-empty', 's1-stale');
    expect(redlineScrollOf('s1-stale')).toBeUndefined();
  });

  it('rekey onto itself is a no-op', () => {
    rememberRedlineScroll('s1-self', 321);
    rekeyRedlineScroll('s1-self', 's1-self');
    expect(redlineScrollOf('s1-self')).toBe(321);
  });
});

// -----------------------------------------------------------------------------
// S2, S3. Through the real store.
// -----------------------------------------------------------------------------

beforeAll(() => {
  useApp.setState({ projects: [PROJECT], activeProjectId: PROJECT.id });
  useEditor.getState().init();
});

beforeEach(() => {
  useEditor.setState({
    tabs: [],
    activeId: null,
    panelOpen: false,
    projectId: PROJECT.id,
    activeIdByProject: {},
    panelOpenByProject: {},
    lastRequest: null,
    lastRequestProjectId: null
  });
  useApp.setState({ projects: [PROJECT], activeProjectId: PROJECT.id });
});

describe('S2. the three sites a tab leaves the store forget its place', () => {
  it('a close', async () => {
    const id = await open('close.md');
    await open('other.md');
    rememberRedlineScroll(id, 1_500);
    useEditor.getState().forceCloseTab(id);
    expect(useEditor.getState().tabs.some((t) => t.id === id)).toBe(false);
    expect(redlineScrollOf(id)).toBeUndefined();
  });

  it('a close through the dirty-free closeTab verb', async () => {
    const id = await open('verb.md');
    rememberRedlineScroll(id, 60);
    useEditor.getState().closeTab(id);
    expect(redlineScrollOf(id)).toBeUndefined();
  });

  it('the preview slot reused by the next preview open', async () => {
    const slot = await open('preview-1.md', true);
    expect(useEditor.getState().tabs.find((t) => t.id === slot)?.preview).toBe(true);
    rememberRedlineScroll(slot, 2_400);
    const next = await open('preview-2.md', true);
    expect(next).not.toBe(slot);
    expect(useEditor.getState().tabs.some((t) => t.id === slot)).toBe(false);
    expect(redlineScrollOf(slot)).toBeUndefined();
  });

  it('the least recently used tab evicted by the eleventh open', async () => {
    const first = await open('lru-01.md');
    for (let n = 2; n <= 10; n += 1) await open(`lru-${String(n).padStart(2, '0')}.md`);
    expect(visibleTabsOf(useEditor.getState().tabs, PROJECT.id)).toHaveLength(10);
    rememberRedlineScroll(first, 3_300);
    // A tab still open keeps its place, which is the control.
    const kept = useEditor.getState().tabs[1]?.id as string;
    rememberRedlineScroll(kept, 120);
    await open('lru-11.md');
    expect(useEditor.getState().tabs.some((t) => t.id === first)).toBe(false);
    expect(redlineScrollOf(first)).toBeUndefined();
    expect(redlineScrollOf(kept)).toBe(120);
  });

  it('a mode round trip keeps it: Redline to Source to Redline returns to the place', async () => {
    const id = await open('modes.md');
    useEditor.getState().setMode(id, 'redline');
    await flush();
    expect(useEditor.getState().tabs.find((t) => t.id === id)?.mode).toBe('redline');
    rememberRedlineScroll(id, 4_000);
    useEditor.getState().setMode(id, 'file');
    await flush();
    useEditor.getState().setMode(id, 'redline');
    await flush();
    expect(redlineScrollOf(id)).toBe(4_000);
  });
});

describe('S3. a rename carries the place', () => {
  it('followMoves moves a remembered place to the new id and leaves nothing at the old', async () => {
    const from = await open('before.md');
    const to = `${ROOT}/after.md`;
    rememberRedlineScroll(from, 2_750);
    followMoves([{ from, to, kind: 'file' }]);
    expect(useEditor.getState().tabs.some((t) => t.id === to)).toBe(true);
    expect(redlineScrollOf(to)).toBe(2_750);
    expect(redlineScrollOf(from)).toBeUndefined();
  });

  it('a folder rename carries every tab beneath it', async () => {
    const inner = await open('docs/inner.md');
    rememberRedlineScroll(inner, 640);
    followMoves([{ from: `${ROOT}/docs`, to: `${ROOT}/notes`, kind: 'dir' }]);
    expect(redlineScrollOf(`${ROOT}/notes/inner.md`)).toBe(640);
    expect(redlineScrollOf(inner)).toBeUndefined();
  });
});
