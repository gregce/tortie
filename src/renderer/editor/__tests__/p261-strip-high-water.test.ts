/**
 * PHASE 261'S FIX ROUND — WHAT A STRIP OVER THE CAP REALLY HOLDS.
 *
 * Item 10 shipped as one clause in `store.ts`'s header saying a strip "can
 * hold eleven until the next open there evicts it back down to ten". The
 * verifier drove the shipping store and both halves were wrong, and this file
 * is the clause made executable so the next version of that sentence cannot
 * drift away from the code again.
 *
 * What is pinned, and every number here was read off this store rather than
 * reasoned about:
 *
 *   `rehome` moves ONE tab, so eleven is ITS ceiling and nobody else's.
 *   `switchProject` adopts the WHOLE null strip at once, so its ceiling is ten
 *   plus however many tabs were on that strip: 13 after one cycle here, 21
 *   after two.
 *   An open on an over-cap strip evicts exactly one for the one it adds, so
 *   the count STAYS at its high-water mark instead of draining to ten.
 *
 * The cap itself is not weakened: the last case is the ordinary strip, which
 * still stops at ten, so a store that evicted nothing at all would fail here.
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
      readFile: async () => ({ contents: 'hello\n', truncated: false }),
      readImage: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn()
    },
    git: { showHead: async () => '', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor, visibleTabsOf } = await import('../store');
const { useApp } = await import('../../state/store');

type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

const A = { id: 'proj-a', path: '/work/alpha', name: 'alpha' };
const D = { id: 'proj-d', path: '/work/delta', name: 'delta' };

const flush = (): Promise<unknown> => new Promise((done) => setTimeout(done, 0));

function request(root: string, name: string): OpenFileRequest {
  return {
    repoPath: root,
    relPath: name,
    path: `${root}/${name}`,
    mode: 'file',
    source: 'tree',
    preview: false as const
  };
}

async function open(root: string, name: string): Promise<string> {
  useEditor.getState().openFromRequest(request(root, name));
  await flush();
  return useEditor.getState().activeId as string;
}

const held = (projectId: string | null): number =>
  visibleTabsOf(useEditor.getState().tabs, projectId).length;

beforeAll(() => {
  useApp.setState({ projects: [A], activeProjectId: A.id });
  useEditor.getState().init();
});

beforeEach(() => {
  useEditor.setState({
    tabs: [],
    activeId: null,
    panelOpen: false,
    projectId: A.id,
    activeIdByProject: {},
    panelOpenByProject: {},
    lastRequest: null,
    lastRequestProjectId: null
  });
  useApp.setState({ projects: [A], activeProjectId: A.id });
});

describe('the cap is asked on the open path only', () => {
  it('an ordinary strip stops at ten, which is the control', async () => {
    for (let n = 1; n <= 14; n += 1) await open(A.path, `a-${String(n)}.ts`);
    expect(held(A.id)).toBe(10);
  });

  it('rehome leaves ELEVEN, and the next opens leave it at eleven', async () => {
    // A tab named under delta but opened from A's terminal belongs to A while
    // delta is not a project (§5.1's second clause).
    useEditor.getState().openFromRequest({
      repoPath: A.path,
      relPath: `${D.path}/x.ts`,
      path: `${D.path}/x.ts`,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    await flush();
    const moving = useEditor.getState().activeId as string;
    expect(useEditor.getState().activeTab()?.projectId).toBe(A.id);

    useApp.setState({ projects: [A, D] });
    useApp.getState().setActiveProject(D.id);
    for (let n = 1; n <= 10; n += 1) await open(D.path, `d-${String(n)}.ts`);
    expect(held(D.id)).toBe(10);

    // The same file, opened from delta's own tree: the tab MOVES rather than
    // being opened again, and the cap is not asked on that path.
    useEditor.getState().openFromRequest(request(D.path, 'x.ts'));
    await flush();
    expect(useEditor.getState().activeId).toBe(moving);
    expect(held(D.id)).toBe(11);

    // And it stays there: one evicted for one added, twice over.
    await open(D.path, 'd-next.ts');
    expect(held(D.id)).toBe(11);
    await open(D.path, 'd-again.ts');
    expect(held(D.id)).toBe(11);
  });

  it('an adopt is THIRTEEN and a second cycle is TWENTY-ONE, and opens do not drain it', async () => {
    for (let n = 1; n <= 5; n += 1) await open(A.path, `a-${String(n)}.ts`);
    expect(held(A.id)).toBe(5);

    const leaveAndAdopt = async (tag: string): Promise<void> => {
      useApp.setState({ activeProjectId: null });
      useEditor.getState().switchProject(null);
      for (let n = 1; n <= 8; n += 1) await open('/elsewhere', `${tag}-${String(n)}.ts`);
      expect(held(null)).toBe(8);
      useApp.getState().setActiveProject(A.id);
    };

    await leaveAndAdopt('n');
    expect(held(A.id)).toBe(13);
    await leaveAndAdopt('m');
    expect(held(A.id)).toBe(21);

    for (let n = 1; n <= 4; n += 1) {
      await open(A.path, `z-${String(n)}.ts`);
      expect(held(A.id), `after z-${String(n)}`).toBe(21);
    }
  });
});
