/**
 * The Past Sessions half of the sessions slice (Phase 29, the restore ask added
 * in Phase 60, rewritten in Phase 293).
 *
 * Phase 293 moved Past Sessions into the session manager's second tab, and the
 * two verbs here changed with it.
 *
 * `refreshPastSessions` replaced `setPastOpen`. Whether the list is on screen
 * is the sheet's field now, and this slice keeps the DATA. The fetch still goes
 * through the optional bridge method, an older preload still reads EMPTY with
 * no error, and main's order is still stored untouched. What is new is that it
 * is called on every change to the session list while the sheet is open,
 * because the removed list has no push, so it raises no toast (a toast per
 * change would be a toast per change) and the newest read wins.
 *
 * `restorePastSession` was REWRITTEN IN PLACE. It used to ask through a native
 * dialog, close the panel and land on the restored session, and it answered
 * nothing. The sheet asks inline, stays open, and offers the way to the
 * session, so the verb now asks nothing, closes nothing, lands nowhere, raises
 * no toast, and answers what happened. Two promises are kept from Phase 29: a
 * failed restore is not a second loss, and the list is re-fetched because main
 * kept the row 'discarded'.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
let restoreFails: Error | null = null;
let listRemovedFails: Error | null = null;
let removedRows: Array<Record<string, unknown>> = [];
/** What the fake restore resolves to (the restored session projection). */
let restoreResult: Record<string, unknown> = {};
/** When set, the next listRemoved waits on it. */
let removedGate: Promise<void> | null = null;

const sessions: Record<string, unknown> = {
  list: () => {
    calls.push('list');
    return Promise.resolve([]);
  },
  restore: (_id: string) => {
    calls.push('restore');
    if (restoreFails !== null) return Promise.reject(restoreFails);
    return Promise.resolve(restoreResult);
  },
  listRemoved: async () => {
    calls.push('listRemoved');
    const rows = removedRows;
    const fails = listRemovedFails;
    const gate = removedGate;
    removedGate = null;
    if (gate !== null) await gate;
    if (fails !== null) throw fails;
    return rows;
  },
  // The Phase 60 native ask. Nothing may call it any more: the ask is drawn
  // inline by the sheet (ruling R1), and a call here is the old behaviour.
  askRestoreProject: (input: { projectPath: string }) => {
    calls.push(`ask:${input.projectPath}`);
    return Promise.resolve('open');
  }
};

const projects: Record<string, unknown> = {
  add: (path: string) => {
    calls.push(`projects.add:${path}`);
    return Promise.resolve({ id: 'proj-2', name: 'other', path });
  },
  list: () => {
    calls.push('projects.list');
    return Promise.resolve([{ id: 'proj-1', name: 'repo', path: '/repo' }]);
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
const {
  LIFECYCLE_BRIDGE_MISSING,
  LIFECYCLE_SESSION_CHANGED,
  SHELL_PATH_PENDING_TITLE
} = await import('../resume');

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

/** A row whose project is NOT an open tab. */
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

/** Run `body` with one bridge method taken away, and put it back after. */
async function without(
  method: string,
  body: () => Promise<void>
): Promise<void> {
  const saved = sessions[method];
  delete sessions[method];
  try {
    await body();
  } finally {
    sessions[method] = saved;
  }
}

beforeEach(() => {
  calls = [];
  restoreFails = null;
  listRemovedFails = null;
  removedGate = null;
  removedRows = [ROW];
  restoreResult = { id: 'sess-1', name: 'fix-auth', projectPath: '/repo' };
  useApp.setState({
    projects: [{ id: 'proj-1', name: 'repo', path: '/repo' }],
    activeProjectId: 'proj-1',
    activeSessionByProject: { 'proj-1': 'live-1' },
    sessions: [],
    toasts: [],
    confirm: null,
    sessionSheet: null,
    pastSessions: [],
    pastLoading: false,
    restoringIds: {},
    shellPathReady: true
  } as never);
});

// ---------------------------------------------------------------------------
// refreshPastSessions
// ---------------------------------------------------------------------------

describe('refreshPastSessions', () => {
  it('fetches through listRemoved and stores main’s order untouched', async () => {
    removedRows = [ROW, CLOSED_ROW];
    const read = useApp.getState().refreshPastSessions();
    expect(useApp.getState().pastLoading).toBe(true);
    await read;
    expect(calls).toEqual(['listRemoved']);
    expect(useApp.getState().pastLoading).toBe(false);
    expect(useApp.getState().pastSessions.map((s) => s.id)).toEqual([
      'sess-1',
      'sess-2'
    ]);
  });

  it('an older preload with no listRemoved reads empty, with no error', async () => {
    useApp.setState({ pastSessions: [ROW] } as never);
    await without('listRemoved', async () => {
      await useApp.getState().refreshPastSessions();
    });
    const s = useApp.getState();
    expect(s.pastSessions).toEqual([]);
    expect(s.pastLoading).toBe(false);
    expect(s.toasts).toEqual([]);
  });

  it('a failed read keeps the rows it had and raises no toast', async () => {
    useApp.setState({ pastSessions: [ROW] } as never);
    listRemovedFails = new Error('ipc closed');
    await useApp.getState().refreshPastSessions();
    const s = useApp.getState();
    expect(s.pastSessions.map((x) => x.id)).toEqual(['sess-1']);
    expect(s.pastLoading).toBe(false);
    expect(s.toasts).toEqual([]);
  });

  it('while the sheet is open, a failed read is said in the sheet’s own state', async () => {
    useApp.getState().openSessionSheet('past');
    await settle();
    listRemovedFails = new Error('ipc closed');
    await useApp.getState().refreshPastSessions();
    expect(useApp.getState().sessionSheet?.listError).toBe('ipc closed');
    expect(useApp.getState().toasts).toEqual([]);
  });

  it('the newest read wins over an older one that answers after it', async () => {
    let release: () => void = () => undefined;
    removedGate = new Promise<void>((r) => {
      release = r;
    });
    removedRows = [ROW, CLOSED_ROW];
    const older = useApp.getState().refreshPastSessions();
    // The older read is held in the air; a newer one lands first.
    removedRows = [CLOSED_ROW];
    await useApp.getState().refreshPastSessions();
    release();
    await older;
    expect(useApp.getState().pastSessions.map((x) => x.id)).toEqual(['sess-2']);
    expect(useApp.getState().pastLoading).toBe(false);
  });

  it('opening the sheet fetches it, because nothing pushes it', async () => {
    useApp.getState().openSessionSheet('past');
    await settle();
    expect(calls).toEqual(['listRemoved']);
    expect(useApp.getState().pastSessions.map((x) => x.id)).toEqual(['sess-1']);
  });
});

// ---------------------------------------------------------------------------
// restorePastSession
// ---------------------------------------------------------------------------

describe('restorePastSession, success', () => {
  it('restores by id, applies main’s list, refetches the removed list, and answers', async () => {
    useApp.setState({ pastSessions: [ROW] } as never);
    const outcome = await useApp.getState().restorePastSession('sess-1');
    expect(calls).toEqual(['restore', 'list', 'listRemoved']);
    expect(outcome.kind).toBe('restored');
    if (outcome.kind !== 'restored') throw new Error('unreachable');
    expect(outcome.session.id).toBe('sess-1');
    expect(outcome.note).toEqual({
      kind: 'success',
      text: "'fix-auth' restored — press Enter in the terminal to resume the conversation.",
      sticky: false
    });
    expect(useApp.getState().restoringIds['sess-1']).toBeUndefined();
  });

  it('NEVER lands and NEVER closes the sheet, and raises no toast', async () => {
    // Red at the parent: it set `pastOpen: false`, then `setActiveProject`
    // and `setActiveSession` on the restored row's open project.
    useApp.getState().openSessionSheet('past');
    await settle();
    useApp.setState({ pastSessions: [ROW] } as never);
    await useApp.getState().restorePastSession('sess-1');
    const s = useApp.getState();
    expect(s.sessionSheet).not.toBeNull();
    expect(s.sessionSheet?.tab).toBe('past');
    expect(s.activeProjectId).toBe('proj-1');
    expect(s.activeSessionByProject).toEqual({ 'proj-1': 'live-1' });
    expect(s.toasts).toEqual([]);
    expect(s.confirm).toBeNull();
  });

  it('asks NOTHING for a row whose project is not an open tab, and opens no tab', async () => {
    // Red at the parent: it called the native ask and then `projects.add`.
    // The sheet asks inline, before it calls this verb (ruling R1).
    useApp.setState({ pastSessions: [CLOSED_ROW] } as never);
    restoreResult = { id: 'sess-2', name: 'fix-perf', projectPath: '/other' };
    const outcome = await useApp.getState().restorePastSession('sess-2');
    expect(outcome.kind).toBe('restored');
    expect(calls).toEqual(['restore', 'list', 'listRemoved']);
    expect(useApp.getState().projects.map((p) => p.path)).toEqual(['/repo']);
  });
});

describe('restorePastSession, failure is not a second loss', () => {
  it('answers main’s sentence, raises no toast, and re-fetches the list', async () => {
    useApp.setState({ pastSessions: [ROW] } as never);
    restoreFails = new Error('working folder no longer exists');
    const outcome = await useApp.getState().restorePastSession('sess-1');
    expect(outcome).toEqual({
      kind: 'failed',
      message: 'working folder no longer exists'
    });
    expect(calls).toEqual(['restore', 'listRemoved']);
    const s = useApp.getState();
    expect(s.pastSessions.map((x) => x.id)).toEqual(['sess-1']);
    expect(s.toasts).toEqual([]);
    expect(s.restoringIds['sess-1']).toBeUndefined();
  });
});

describe('restorePastSession, the rule of the press', () => {
  it('re-reads the row BY ID from the removed list, and a row that left it calls nothing', async () => {
    useApp.setState({ pastSessions: [CLOSED_ROW] } as never);
    expect(await useApp.getState().restorePastSession('sess-1')).toEqual({
      kind: 'failed',
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
  });

  it('a row restored from another window is live in Managed, not removed here', async () => {
    // The same id, but main now lists it as a live session and the removed
    // list no longer holds it.
    useApp.setState({
      pastSessions: [],
      sessions: [{ ...ROW, status: 'running' }]
    } as never);
    expect((await useApp.getState().restorePastSession('sess-1')).kind).toBe(
      'failed'
    );
    expect(calls).toEqual([]);
  });

  it('refuses a row whose machine a person removed', async () => {
    useApp.setState({
      pastSessions: [
        {
          ...ROW,
          machineGone: {
            label: 'Studio',
            lastStatus: 'running',
            lastSeenAt: 0,
            forgottenAt: 1
          }
        }
      ]
    } as never);
    expect(await useApp.getState().restorePastSession('sess-1')).toEqual({
      kind: 'failed',
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
  });

  it('refuses a row on a machine that says it cannot restore yet', async () => {
    useApp.setState({
      pastSessions: [
        {
          ...ROW,
          machine: {
            id: 'studio',
            label: 'Studio',
            color: 'orange',
            answering: false,
            canRestore: false,
            restoreReason: 'Studio has not answered.'
          }
        }
      ]
    } as never);
    expect((await useApp.getState().restorePastSession('sess-1')).kind).toBe(
      'failed'
    );
    expect(calls).toEqual([]);
  });

  it('says it is waiting for the login shell, rather than that the row changed', async () => {
    useApp.setState({ pastSessions: [ROW], shellPathReady: false } as never);
    expect(await useApp.getState().restorePastSession('sess-1')).toEqual({
      kind: 'failed',
      message: SHELL_PATH_PENDING_TITLE
    });
    expect(calls).toEqual([]);
  });

  it('answers busy for a second press while the first is in the air', async () => {
    useApp.setState({ pastSessions: [ROW], restoringIds: { 'sess-1': true } } as never);
    expect(await useApp.getState().restorePastSession('sess-1')).toEqual({
      kind: 'busy'
    });
    expect(calls).toEqual([]);
  });

  it('answers LIFECYCLE_BRIDGE_MISSING with no restore on the bridge', async () => {
    useApp.setState({ pastSessions: [ROW] } as never);
    await without('restore', async () => {
      expect(await useApp.getState().restorePastSession('sess-1')).toEqual({
        kind: 'failed',
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
    expect(calls).toEqual([]);
  });
});
