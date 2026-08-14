/**
 * The Past Sessions store slice (Phase 29).
 *
 * Three behaviors are held here, and each one is a promise the panel makes:
 * opening fetches the list through the optional bridge method and an older
 * preload opens EMPTY with no error; a successful restore closes the panel
 * and lands on the restored session, the same landing restart gives; and a
 * FAILED restore is not a second loss, the panel stays open, the error is
 * a sticky toast, and the list is re-fetched because main kept the row
 * 'discarded'.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
let restoreFails: Error | null = null;
let removedRows: Array<Record<string, unknown>> = [];

const sessions: Record<string, unknown> = {
  list: () => {
    calls.push('list');
    return Promise.resolve([]);
  },
  restore: (_id: string) => {
    calls.push('restore');
    if (restoreFails !== null) return Promise.reject(restoreFails);
    return Promise.resolve({
      id: 'sess-1',
      name: 'fix-auth',
      projectPath: '/repo'
    });
  }
};
sessions['listRemoved'] = () => {
  calls.push('listRemoved');
  return Promise.resolve(removedRows);
};

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: { sessions }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useApp } = await import('../store');

const ROW = {
  id: 'sess-1',
  name: 'fix-auth',
  tmuxName: 'fix-auth',
  projectPath: '/repo',
  cwd: '/repo',
  agent: 'claude',
  status: 'discarded',
  createdAt: 0,
  removedAt: 1_000,
  agentSessionId: 'uuid-1',
  resumeArgv: ['/usr/local/bin/claude', '--resume', 'uuid-1']
};

/** Let the fire-and-forget promise chains inside the actions settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  calls = [];
  restoreFails = null;
  removedRows = [ROW];
  useApp.setState({
    projects: [{ id: 'proj-1', name: 'repo', path: '/repo' }],
    activeProjectId: 'proj-1',
    activeSessionByProject: {},
    sessions: [],
    toasts: [],
    pastOpen: false,
    pastSessions: [],
    pastLoading: false,
    restoringIds: {}
  } as never);
});

describe('setPastOpen', () => {
  it('opening fetches through listRemoved and stores main’s order untouched', async () => {
    useApp.getState().setPastOpen(true);
    expect(useApp.getState().pastOpen).toBe(true);
    expect(useApp.getState().pastLoading).toBe(true);
    await settle();
    expect(calls).toEqual(['listRemoved']);
    expect(useApp.getState().pastLoading).toBe(false);
    expect(useApp.getState().pastSessions.map((s) => s.id)).toEqual([
      'sess-1'
    ]);
  });

  it('closing only closes, no fetch', async () => {
    useApp.getState().setPastOpen(false);
    await settle();
    expect(useApp.getState().pastOpen).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('setPastOpen against a preload with no listRemoved', () => {
  it('opens in the empty state with no error toast', async () => {
    const bridge = (
      window as unknown as { gmux: { sessions: Record<string, unknown> } }
    ).gmux;
    const saved = bridge.sessions['listRemoved'];
    delete bridge.sessions['listRemoved'];
    try {
      useApp.getState().setPastOpen(true);
      await settle();
      expect(useApp.getState().pastOpen).toBe(true);
      expect(useApp.getState().pastSessions).toEqual([]);
      expect(useApp.getState().pastLoading).toBe(false);
      expect(useApp.getState().toasts).toEqual([]);
    } finally {
      bridge.sessions['listRemoved'] = saved;
    }
  });
});

describe('restorePastSession, success', () => {
  it('runs the Phase 26.3 verb, closes the panel, refreshes and lands there', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [ROW] } as never);
    await useApp.getState().restorePastSession('sess-1');
    expect(calls).toEqual(['restore', 'list']);
    const s = useApp.getState();
    expect(s.pastOpen).toBe(false);
    expect(s.activeProjectId).toBe('proj-1');
    expect(s.activeSessionByProject['proj-1']).toBe('sess-1');
    expect(s.restoringIds['sess-1']).toBeUndefined();
  });
});

describe('restorePastSession, failure is not a second loss', () => {
  it('toasts sticky, keeps the panel open, and re-fetches the list', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [ROW] } as never);
    restoreFails = new Error('working folder no longer exists');
    await useApp.getState().restorePastSession('sess-1');
    expect(calls).toEqual(['restore', 'listRemoved']);
    const s = useApp.getState();
    expect(s.pastOpen).toBe(true);
    expect(s.pastSessions.map((x) => x.id)).toEqual(['sess-1']);
    expect(s.toasts[0]?.text).toContain('working folder no longer exists');
    expect(s.toasts[0]?.sticky).toBe(true);
    expect(s.restoringIds['sess-1']).toBeUndefined();
  });
});
