/**
 * The Past Sessions store slice (Phase 29, the restore ask added in
 * Phase 60).
 *
 * Three behaviors are held here, and each one is a promise the panel makes:
 * opening fetches the list through the optional bridge method and an older
 * preload opens EMPTY with no error; a successful restore closes the panel
 * and lands on the restored session, the same landing restart gives; and a
 * FAILED restore is not a second loss, the panel stays open, the error is
 * a sticky toast, and the list is re-fetched because main kept the row
 * 'discarded'.
 *
 * Phase 60 added a fourth: restoring a row whose project is NOT an open tab
 * asks first through the optional askRestoreProject extra. Cancel changes
 * nothing. Open opens the project tab and then restores into it. An open
 * project never asks, and an older preload without the extra keeps the old
 * silent behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
let restoreFails: Error | null = null;
let removedRows: Array<Record<string, unknown>> = [];
/** What the fake restore resolves to (the restored session projection). */
let restoreResult: Record<string, unknown> = {};
/** The Phase 60 ask: what the fake dialog answers, or a rejection. */
let askAnswer: 'open' | 'cancel' = 'cancel';
let askFails: Error | null = null;

const sessions: Record<string, unknown> = {
  list: () => {
    calls.push('list');
    return Promise.resolve([]);
  },
  restore: (_id: string) => {
    calls.push('restore');
    if (restoreFails !== null) return Promise.reject(restoreFails);
    return Promise.resolve(restoreResult);
  }
};
sessions['listRemoved'] = () => {
  calls.push('listRemoved');
  return Promise.resolve(removedRows);
};
sessions['askRestoreProject'] = (input: { projectPath: string }) => {
  calls.push(`ask:${input.projectPath}`);
  if (askFails !== null) return Promise.reject(askFails);
  return Promise.resolve(askAnswer);
};

/** The projects half the Phase 60 open path walks (addProjectPath). */
const OPEN_PROJECTS: Array<Record<string, unknown>> = [
  { id: 'proj-1', name: 'repo', path: '/repo' }
];
const projects: Record<string, unknown> = {
  add: (path: string) => {
    calls.push(`projects.add:${path}`);
    const project = { id: 'proj-2', name: 'other', path };
    OPEN_PROJECTS.push(project);
    return Promise.resolve(project);
  },
  list: () => {
    calls.push('projects.list');
    return Promise.resolve([...OPEN_PROJECTS]);
  }
};

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: { sessions, projects }
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

/** A Phase 60 row whose project is NOT an open tab. */
const CLOSED_ROW = {
  ...ROW,
  id: 'sess-2',
  name: 'fix-perf',
  tmuxName: 'fix-perf',
  projectPath: '/other',
  cwd: '/other'
};

/** Let the fire-and-forget promise chains inside the actions settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  calls = [];
  restoreFails = null;
  removedRows = [ROW];
  restoreResult = { id: 'sess-1', name: 'fix-auth', projectPath: '/repo' };
  askAnswer = 'cancel';
  askFails = null;
  OPEN_PROJECTS.length = 0;
  OPEN_PROJECTS.push({ id: 'proj-1', name: 'repo', path: '/repo' });
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

describe('restorePastSession, the Phase 60 ask', () => {
  it('an OPEN project restores with no ask call at all', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [ROW] } as never);
    await useApp.getState().restorePastSession('sess-1');
    expect(calls).toEqual(['restore', 'list']);
  });

  it('a closed project with answer cancel changes nothing', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [CLOSED_ROW] } as never);
    askAnswer = 'cancel';
    await useApp.getState().restorePastSession('sess-2');
    expect(calls).toEqual(['ask:/other']);
    const s = useApp.getState();
    expect(s.pastOpen).toBe(true);
    expect(s.pastSessions.map((x) => x.id)).toEqual(['sess-2']);
    expect(s.projects.map((p) => p.path)).toEqual(['/repo']);
    expect(s.restoringIds['sess-2']).toBeUndefined();
    expect(s.toasts).toEqual([]);
  });

  it('a closed project with answer open opens the tab, then restores', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [CLOSED_ROW] } as never);
    askAnswer = 'open';
    restoreResult = { id: 'sess-2', name: 'fix-perf', projectPath: '/other' };
    await useApp.getState().restorePastSession('sess-2');
    expect(calls).toEqual([
      'ask:/other',
      'projects.add:/other',
      'projects.list',
      'restore',
      'list'
    ]);
    const s = useApp.getState();
    expect(s.pastOpen).toBe(false);
    expect(s.projects.map((p) => p.path)).toEqual(['/repo', '/other']);
    expect(s.activeProjectId).toBe('proj-2');
    expect(s.activeSessionByProject['proj-2']).toBe('sess-2');
    expect(s.restoringIds['sess-2']).toBeUndefined();
  });

  it('an ask that rejects behaves as cancel, never as consent', async () => {
    useApp.setState({ pastOpen: true, pastSessions: [CLOSED_ROW] } as never);
    askFails = new Error('dialog broke');
    await useApp.getState().restorePastSession('sess-2');
    expect(calls).toEqual(['ask:/other']);
    const s = useApp.getState();
    expect(s.pastOpen).toBe(true);
    expect(s.projects.map((p) => p.path)).toEqual(['/repo']);
  });

  it('an older preload without the extra restores silently, as before', async () => {
    const bridge = (
      window as unknown as { gmux: { sessions: Record<string, unknown> } }
    ).gmux;
    const saved = bridge.sessions['askRestoreProject'];
    delete bridge.sessions['askRestoreProject'];
    try {
      useApp.setState({ pastOpen: true, pastSessions: [CLOSED_ROW] } as never);
      restoreResult = { id: 'sess-2', name: 'fix-perf', projectPath: '/other' };
      await useApp.getState().restorePastSession('sess-2');
      expect(calls).toEqual(['restore', 'list']);
      expect(useApp.getState().pastOpen).toBe(false);
    } finally {
      bridge.sessions['askRestoreProject'] = saved;
    }
  });
});
