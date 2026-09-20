/**
 * Phase 293. The lifecycle verbs the session manager calls, and the one
 * correction this phase makes to a landing every surface shares.
 *
 * WHAT A `*Now` VERB IS. The shipped verbs (`endSession`, `removeSession`,
 * `restoreSession`, `restartSession`, `renameSession`) each raise a stacked
 * confirm, a toast, or both. The sheet draws its confirmations and its failures
 * INSIDE itself, under the row, so it needs the same work with neither. Each
 * `*Now` verb is that work and an answer: it raises no confirm, it raises no
 * error toast, and it says what happened in a value the caller draws.
 *
 * WHAT EVERY ONE OF THEM DOES FIRST. It takes a session ID and nothing else,
 * re-reads that row from the store at the moment of the call, and asks the
 * verb's OWN field of `sessionActionGates` over it (SPEC §4.0). A sheet is the
 * first surface where a row can sit on screen for minutes while another window
 * changes it, and at the parent a stale Restart would have had main kill a live
 * session and hard delete its row. When the row is gone or the gate is false
 * the bridge is never reached.
 *
 * THE LANDING GUARD is the second half of this file and it is red at the
 * parent. `runRestore` and `runRestart` called `setActiveSession` with no
 * condition, and that verb writes the ACTIVE project's slot whatever project
 * the session belongs to. No surface before the sheet could restore a session
 * of another project, so nothing met it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine } from '@shared/types';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
/** What each fake rejects with, or null to resolve. */
let fails: Record<string, Error | null> = {};
let listRows: Session[] = [];
let removedRows: Session[] = [];
let restoreResult: Partial<Session> | null = null;
let restartResult: Partial<Session> | null = null;

/** A rejection shaped the way Electron hands one of main's refusals over. */
function mainRefusal(channel: string, message: string): Error {
  return new Error(
    `Error invoking remote method '${channel}': ` +
      JSON.stringify({ code: 'INVALID_INPUT', message })
  );
}

function answer<T>(name: string, value: T): Promise<T> {
  const err = fails[name] ?? null;
  return err !== null ? Promise.reject(err) : Promise.resolve(value);
}

const sessionsApi: Record<string, unknown> = {
  list: () => {
    calls.push('list');
    return answer('list', listRows);
  },
  kill: (id: string) => {
    calls.push(`kill:${id}`);
    return answer('kill', undefined);
  },
  rename: (input: { sessionId: string; name: string }) => {
    calls.push(`rename:${input.sessionId}:${input.name}`);
    return answer('rename', { id: input.sessionId, name: input.name });
  },
  create: (input: { name: string }) => {
    calls.push(`create:${input.name}`);
    return answer('create', { id: 'created-1', projectPath: '/repo', ...input });
  },
  discard: (id: string) => {
    calls.push(`discard:${id}`);
    return answer('discard', undefined);
  },
  restore: (id: string, options?: { withoutCapture?: boolean }) => {
    calls.push(
      options?.withoutCapture === true ? `restore:${id}:bare` : `restore:${id}`
    );
    return answer('restore', restoreResult ?? { id });
  },
  restart: (id: string, options?: { withoutCapture?: boolean }) => {
    calls.push(
      options?.withoutCapture === true ? `restart:${id}:bare` : `restart:${id}`
    );
    return answer('restart', restartResult ?? { id: `${id}-new` });
  },
  listRemoved: () => {
    calls.push('listRemoved');
    return answer('listRemoved', removedRows);
  }
};

const bridge: Record<string, unknown> = {
  sessions: sessionsApi,
  projects: { list: () => Promise.resolve([]) }
};

const fakeWindow: Record<string, unknown> = {
  addEventListener() {},
  removeEventListener() {},
  gmux: bridge
};

vi.stubGlobal('window', fakeWindow);
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

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  canRestore: true,
  restoreReason: null
};

const CAPTURE = {
  provider: 'claude',
  bin: '/opt/specstory',
  exitCodeApproximate: false
};

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'one',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  };
}

/** Run `body` with one bridge method taken away, and put it back after. */
async function without(
  method: string,
  body: () => Promise<void>
): Promise<void> {
  const saved = sessionsApi[method];
  delete sessionsApi[method];
  try {
    await body();
  } finally {
    sessionsApi[method] = saved;
  }
}

/** Run `body` on a build with no preload at all. */
async function withNoBridge(body: () => Promise<void>): Promise<void> {
  delete fakeWindow['gmux'];
  try {
    await body();
  } finally {
    fakeWindow['gmux'] = bridge;
  }
}

function quiet(): void {
  const s = useApp.getState();
  expect(s.confirm).toBeNull();
  expect(s.toasts).toEqual([]);
}

beforeEach(() => {
  calls = [];
  fails = {};
  listRows = [];
  removedRows = [];
  restoreResult = null;
  restartResult = null;
  useApp.setState({
    projects: [
      { id: 'proj-a', name: 'repo', path: '/repo' },
      { id: 'proj-b', name: 'other', path: '/other' }
    ],
    activeProjectId: 'proj-a',
    activeSessionByProject: { 'proj-a': 'a-1' },
    sessions: [session()],
    pastSessions: [],
    toasts: [],
    confirm: null,
    restoringIds: {},
    shellPathReady: true,
    handbacks: {}
  } as never);
});

// ---------------------------------------------------------------------------
// End
// ---------------------------------------------------------------------------

describe('endSessionNow', () => {
  it('awaits the kill by id and answers ok, with no confirm and no toast', async () => {
    expect(await useApp.getState().endSessionNow('one')).toEqual({ ok: true });
    expect(calls).toEqual(['kill:one']);
    quiet();
  });

  it('answers main’s own sentence on a rejection, and raises nothing', async () => {
    fails['kill'] = mainRefusal(
      'sessions:kill',
      'This session was removed, so there is nothing to end. Nothing was changed.'
    );
    expect(await useApp.getState().endSessionNow('one')).toEqual({
      ok: false,
      message:
        'This session was removed, so there is nothing to end. Nothing was changed.'
    });
    quiet();
  });

  it('answers LIFECYCLE_BRIDGE_MISSING when the method, or the bridge, is not there', async () => {
    expect(LIFECYCLE_BRIDGE_MISSING).toBe('This build cannot change sessions.');
    await without('kill', async () => {
      expect(await useApp.getState().endSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
    await withNoBridge(async () => {
      expect(await useApp.getState().endSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
    expect(calls).toEqual([]);
    quiet();
  });

  it('re-reads the row BY ID and ends nothing that is not live', async () => {
    for (const status of ['exited', 'restorable', 'unknown', 'discarded'] as const) {
      useApp.setState({ sessions: [session({ status })] } as never);
      expect(await useApp.getState().endSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_SESSION_CHANGED
      });
    }
    // A row that left the list between the drawing and the press.
    useApp.setState({ sessions: [] } as never);
    expect(await useApp.getState().endSessionNow('one')).toEqual({
      ok: false,
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
    quiet();
  });

  it('is never handed a name: two sessions with one name, one id ends', async () => {
    useApp.setState({
      sessions: [
        session({ id: 'one', name: 'auth' }),
        session({ id: 'two', name: 'auth', projectPath: '/other' })
      ]
    } as never);
    await useApp.getState().endSessionNow('two');
    expect(calls).toEqual(['kill:two']);
  });
});

describe('endSession, the shipped verb, still asks first', () => {
  it('sets a confirm and ends only when the person confirms', async () => {
    useApp.getState().endSession('one');
    expect(calls).toEqual([]);
    const confirm = useApp.getState().confirm;
    expect(confirm?.title).toBe("End 'auth'?");
    expect(confirm?.confirmLabel).toBe('End session');
    expect(confirm?.destructive).toBe(true);
    confirm?.onConfirm();
    expect(calls).toEqual(['kill:one']);
  });

  it('still toasts sticky when the kill is refused', async () => {
    fails['kill'] = new Error('Session not found.');
    useApp.getState().endSession('one');
    useApp.getState().confirm?.onConfirm();
    await new Promise((r) => setTimeout(r, 0));
    const toast = useApp.getState().toasts[0];
    expect(toast?.text).toBe('Session not found.');
    expect(toast?.kind).toBe('error');
    expect(toast?.sticky).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

describe('removeSessionNow', () => {
  beforeEach(() => {
    useApp.setState({ sessions: [session({ status: 'exited' })] } as never);
  });

  it('discards, applies main’s list and refetches the removed list', async () => {
    listRows = [session({ id: 'kept', status: 'running' })];
    removedRows = [session({ status: 'discarded', removedAt: 5 })];
    expect(await useApp.getState().removeSessionNow('one')).toEqual({ ok: true });
    expect(calls).toEqual(['discard:one', 'list', 'listRemoved']);
    expect(useApp.getState().sessions.map((x) => x.id)).toEqual(['kept']);
    expect(useApp.getState().pastSessions.map((x) => x.id)).toEqual(['one']);
    quiet();
  });

  it('answers main’s refusal, removes nothing from the list, raises nothing', async () => {
    fails['discard'] = mainRefusal(
      'sessions:discard',
      'This session is still running, so it was not removed. End it first.'
    );
    expect(await useApp.getState().removeSessionNow('one')).toEqual({
      ok: false,
      message:
        'This session is still running, so it was not removed. End it first.'
    });
    expect(calls).toEqual(['discard:one']);
    expect(useApp.getState().sessions.map((x) => x.id)).toEqual(['one']);
    quiet();
  });

  it('answers LIFECYCLE_BRIDGE_MISSING with no discard on the bridge', async () => {
    await without('discard', async () => {
      expect(await useApp.getState().removeSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
    expect(calls).toEqual([]);
    quiet();
  });

  it('NEVER tombstones a row that turned live since its menu was drawn', async () => {
    for (const status of ['running', 'idle', 'needs_input', 'unknown'] as const) {
      useApp.setState({ sessions: [session({ status })] } as never);
      expect(await useApp.getState().removeSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_SESSION_CHANGED
      });
    }
    expect(calls).toEqual([]);
    quiet();
  });
});

describe('removeSession, the shipped verb, says the same words', () => {
  it('sets the byte-identical confirm and discards on confirm', async () => {
    useApp.setState({ sessions: [session({ status: 'exited' })] } as never);
    await useApp.getState().removeSession('one');
    const confirm = useApp.getState().confirm;
    expect(confirm?.title).toBe("Remove 'auth'?");
    expect(confirm?.body).toBe(
      'It moves to Past Sessions and you can restore it from there.'
    );
    expect(confirm?.confirmLabel).toBe('Remove');
    expect(confirm?.destructive).toBe(true);
    expect(calls).toEqual([]);
    confirm?.onConfirm();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.slice(0, 2)).toEqual(['discard:one', 'list']);
  });
});

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

describe('renameSessionNow', () => {
  it('renames by id with the trimmed name', async () => {
    expect(await useApp.getState().renameSessionNow('one', '  login  ')).toEqual({
      ok: true
    });
    expect(calls).toEqual(['rename:one:login']);
    quiet();
  });

  it('works for a session whose project has no open tab', async () => {
    useApp.setState({
      sessions: [session({ projectPath: '/closed', cwd: '/closed' })]
    } as never);
    expect(await useApp.getState().renameSessionNow('one', 'login')).toEqual({
      ok: true
    });
  });

  it('answers the failing layer’s sentence and no toast', async () => {
    fails['rename'] = mainRefusal('sessions:rename', 'Session not found.');
    expect(await useApp.getState().renameSessionNow('one', 'login')).toEqual({
      ok: false,
      message: 'Session not found.'
    });
    quiet();
  });

  it('sends nothing for an empty name', async () => {
    const result = await useApp.getState().renameSessionNow('one', '   ');
    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
    quiet();
  });

  it('refuses a row Tortie cannot see, a removed row and a row that is gone', async () => {
    for (const status of ['unknown', 'discarded'] as const) {
      useApp.setState({ sessions: [session({ status })] } as never);
      expect(await useApp.getState().renameSessionNow('one', 'login')).toEqual({
        ok: false,
        message: LIFECYCLE_SESSION_CHANGED
      });
    }
    useApp.setState({ sessions: [] } as never);
    expect(await useApp.getState().renameSessionNow('one', 'login')).toEqual({
      ok: false,
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
  });

  it('answers LIFECYCLE_BRIDGE_MISSING with no rename on the bridge', async () => {
    await without('rename', async () => {
      expect(await useApp.getState().renameSessionNow('one', 'login')).toEqual({
        ok: false,
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Restart
// ---------------------------------------------------------------------------

describe('restartSessionNow', () => {
  beforeEach(() => {
    useApp.setState({ sessions: [session({ status: 'exited' })] } as never);
  });

  it('makes the one main-side call and raises nothing', async () => {
    expect(await useApp.getState().restartSessionNow('one')).toEqual({ ok: true });
    expect(calls).toEqual(['restart:one']);
    quiet();
  });

  it('NEVER restarts a row that turned live since its menu was drawn', async () => {
    // This is the hard delete. Main kills the old session and deletes its row
    // once the replacement exists, so a stale pick over a live row is the one
    // press on the sheet that could lose a person's running work.
    for (const status of ['running', 'idle', 'needs_input', 'unknown', 'discarded'] as const) {
      useApp.setState({ sessions: [session({ status })] } as never);
      expect(await useApp.getState().restartSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_SESSION_CHANGED
      });
    }
    useApp.setState({ sessions: [] } as never);
    expect(await useApp.getState().restartSessionNow('one')).toEqual({
      ok: false,
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
    quiet();
  });

  it('is not offered for a session on another machine, so it is not run for one', async () => {
    useApp.setState({
      sessions: [session({ status: 'exited', machine: STUDIO })]
    } as never);
    expect(await useApp.getState().restartSessionNow('one')).toEqual({
      ok: false,
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
  });

  it('answers the failure as a value, where the shipped verb toasts it', async () => {
    fails['restart'] = new Error('claude not found');
    expect(await useApp.getState().restartSessionNow('one')).toEqual({
      ok: false,
      message: 'claude not found'
    });
    quiet();
    await useApp.getState().restartSession('one');
    expect(useApp.getState().toasts[0]?.text).toBe('claude not found');
  });

  it('the bare form asks nothing here, and keeps the one shipped sentence', async () => {
    useApp.setState({
      sessions: [session({ status: 'exited', capture: CAPTURE })]
    } as never);
    expect(
      await useApp.getState().restartSessionNow('one', { withoutCapture: true })
    ).toEqual({ ok: true });
    expect(calls).toEqual(['restart:one:bare']);
    const s = useApp.getState();
    expect(s.confirm).toBeNull();
    expect(s.toasts.map((t) => t.text)).toEqual([
      "'auth' started fresh and does not save its history."
    ]);
    // The shipped verb still asks first, and that did not move.
    calls = [];
    await s.restartSession('one', { withoutCapture: true });
    expect(useApp.getState().confirm?.title).toBe(
      "Restart 'auth' without saving history?"
    );
    expect(calls).toEqual([]);
  });

  it('refuses the bare form for a row that is not captured', async () => {
    expect(
      await useApp.getState().restartSessionNow('one', { withoutCapture: true })
    ).toEqual({ ok: false, message: LIFECYCLE_SESSION_CHANGED });
    expect(calls).toEqual([]);
  });

  it('answers LIFECYCLE_BRIDGE_MISSING on a build with no preload', async () => {
    await withNoBridge(async () => {
      expect(await useApp.getState().restartSessionNow('one')).toEqual({
        ok: false,
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
    expect(calls).toEqual([]);
  });

  it('against an older preload still creates BEFORE it discards', async () => {
    await without('restart', async () => {
      expect(await useApp.getState().restartSessionNow('one')).toEqual({
        ok: true
      });
    });
    expect(calls).toEqual(['create:auth', 'discard:one']);
  });
});

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

describe('refreshSessions', () => {
  it('reads main’s list, APPLIES it, and answers it', async () => {
    listRows = [session({ id: 'fresh', status: 'exited' })];
    const answer = await useApp.getState().refreshSessions();
    expect(answer?.map((x) => x.id)).toEqual(['fresh']);
    expect(useApp.getState().sessions.map((x) => x.id)).toEqual(['fresh']);
  });

  it('answers null on a throw, keeps the list it had, and never throws', async () => {
    fails['list'] = new Error('ipc closed');
    expect(await useApp.getState().refreshSessions()).toBeNull();
    expect(useApp.getState().sessions.map((x) => x.id)).toEqual(['one']);
    quiet();
  });

  it('answers null with no bridge', async () => {
    await withNoBridge(async () => {
      expect(await useApp.getState().refreshSessions()).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Restore, Managed
// ---------------------------------------------------------------------------

describe('restoreSessionNow', () => {
  const ended = (over: Partial<Session> = {}): Session =>
    session({
      status: 'exited',
      agentSessionId: 'u',
      resumeArgv: ['claude', '-r', 'u'],
      ...over
    });

  beforeEach(() => {
    useApp.setState({ sessions: [ended()] } as never);
    restoreResult = ended({ status: 'running' });
    listRows = [ended({ status: 'running' })];
  });

  it('restores, applies main’s list, and answers the note instead of toasting it', async () => {
    const outcome = await useApp.getState().restoreSessionNow('one');
    expect(calls).toEqual(['restore:one', 'list']);
    expect(outcome.kind).toBe('restored');
    if (outcome.kind !== 'restored') throw new Error('unreachable');
    expect(outcome.session.id).toBe('one');
    expect(outcome.note).toEqual({
      kind: 'success',
      text: "'auth' restored — press Enter in the terminal to resume the conversation.",
      sticky: false
    });
    expect(useApp.getState().sessions[0]?.status).toBe('running');
    expect(useApp.getState().restoringIds['one']).toBeUndefined();
    quiet();
  });

  it('NEVER lands: no setActiveSession and no setActiveProject', async () => {
    // Even for a session of the ACTIVE project. The sheet stays open and the
    // person chooses whether to go there. `a-1` is a live session of project A
    // and is in main's list, so the slot the list repair keeps valid is valid
    // and only a landing could move it.
    useApp.setState({ sessions: [session({ id: 'a-1' }), ended()] } as never);
    listRows = [session({ id: 'a-1' }), ended({ status: 'running' })];
    await useApp.getState().restoreSessionNow('one');
    expect(calls).toEqual(['restore:one', 'list']);
    const s = useApp.getState();
    expect(s.activeProjectId).toBe('proj-a');
    expect(s.activeSessionByProject).toEqual({ 'proj-a': 'a-1' });
  });

  it('shows the restoring flag while the call is in the air', async () => {
    let seen: boolean | undefined;
    const real = sessionsApi['restore'] as (id: string) => Promise<unknown>;
    sessionsApi['restore'] = (id: string) => {
      seen = useApp.getState().restoringIds[id];
      return real(id);
    };
    try {
      await useApp.getState().restoreSessionNow('one');
    } finally {
      sessionsApi['restore'] = real;
    }
    expect(seen).toBe(true);
  });

  it('answers busy for a second press and calls nothing', async () => {
    useApp.setState({ restoringIds: { one: true } } as never);
    expect(await useApp.getState().restoreSessionNow('one')).toEqual({
      kind: 'busy'
    });
    expect(calls).toEqual([]);
  });

  it('answers the failure as a value, clears the flag, and raises nothing', async () => {
    fails['restore'] = mainRefusal(
      'sessions:restore',
      'The folder for "auth" no longer exists.'
    );
    expect(await useApp.getState().restoreSessionNow('one')).toEqual({
      kind: 'failed',
      message: 'The folder for "auth" no longer exists.'
    });
    expect(useApp.getState().restoringIds['one']).toBeUndefined();
    quiet();
  });

  it('a restore that landed is still `restored` when the list read fails after it', async () => {
    fails['list'] = new Error('ipc closed');
    const outcome = await useApp.getState().restoreSessionNow('one');
    expect(outcome.kind).toBe('restored');
    quiet();
  });

  it('the bare form asks nothing here and sends the option', async () => {
    useApp.setState({ sessions: [ended({ capture: CAPTURE })] } as never);
    restoreResult = ended({ status: 'running' });
    const outcome = await useApp
      .getState()
      .restoreSessionNow('one', { withoutCapture: true });
    expect(calls).toEqual(['restore:one:bare', 'list']);
    expect(outcome.kind === 'restored' && outcome.note.text).toBe(
      "'auth' is back and no longer saves its history. Press Enter in the terminal to resume the conversation."
    );
    quiet();
  });

  it('carries main’s own sentence when it could not honour the decline', async () => {
    useApp.setState({ sessions: [ended({ capture: CAPTURE })] } as never);
    restoreResult = ended({
      status: 'running',
      capture: CAPTURE,
      restore: { kind: 'transcript', at: 1, armFailure: 'Nothing was armed.' }
    } as Partial<Session>);
    const outcome = await useApp
      .getState()
      .restoreSessionNow('one', { withoutCapture: true });
    expect(outcome.kind === 'restored' && outcome.note).toEqual({
      kind: 'error',
      text: 'Nothing was armed.',
      sticky: true
    });
  });

  it('re-reads the row BY ID and restores nothing the policy would not offer', async () => {
    const refused: Session[] = [
      session({ status: 'running' }),
      session({ status: 'unknown' }),
      session({ status: 'discarded' }),
      // Ended, on this Mac, with nothing to bring back.
      session({ status: 'exited' }),
      session({
        status: 'exited',
        machine: { ...STUDIO, canRestore: false, restoreReason: 'Not yet.' }
      })
    ];
    for (const row of refused) {
      useApp.setState({ sessions: [row] } as never);
      expect(await useApp.getState().restoreSessionNow('one')).toEqual({
        kind: 'failed',
        message: LIFECYCLE_SESSION_CHANGED
      });
    }
    useApp.setState({ sessions: [] } as never);
    expect(await useApp.getState().restoreSessionNow('one')).toEqual({
      kind: 'failed',
      message: LIFECYCLE_SESSION_CHANGED
    });
    expect(calls).toEqual([]);
  });

  it('says why when the only thing missing is the login shell’s answer', async () => {
    useApp.setState({ shellPathReady: false } as never);
    expect(await useApp.getState().restoreSessionNow('one')).toEqual({
      kind: 'failed',
      message: SHELL_PATH_PENDING_TITLE
    });
    expect(calls).toEqual([]);
  });

  it('answers LIFECYCLE_BRIDGE_MISSING with no restore on the bridge', async () => {
    await without('restore', async () => {
      expect(await useApp.getState().restoreSessionNow('one')).toEqual({
        kind: 'failed',
        message: LIFECYCLE_BRIDGE_MISSING
      });
    });
  });
});

// ---------------------------------------------------------------------------
// THE LANDING GUARD. Red at the parent.
// ---------------------------------------------------------------------------

describe('the landing guard on the shipped restore and restart', () => {
  const inB = (over: Partial<Session> = {}): Session =>
    session({
      id: 'b-1',
      name: 'perf',
      projectPath: '/other',
      cwd: '/other',
      status: 'restorable',
      ...over
    });

  it('restoring a session of project B while A is active leaves A’s selection alone', async () => {
    useApp.setState({ sessions: [session({ id: 'a-1' }), inB()] } as never);
    restoreResult = inB({ status: 'running' });
    await useApp.getState().restoreSession('b-1');
    expect(calls).toEqual(['restore:b-1']);
    const s = useApp.getState();
    expect(s.activeProjectId).toBe('proj-a');
    expect(s.activeSessionByProject['proj-a']).toBe('a-1');
    expect(s.activeSessionByProject['proj-b']).toBeUndefined();
  });

  it('still lands when the restored session belongs to the active project', async () => {
    useApp.setState({
      sessions: [session({ id: 'a-1' }), session({ id: 'a-2', status: 'restorable' })]
    } as never);
    restoreResult = session({ id: 'a-2' });
    await useApp.getState().restoreSession('a-2');
    expect(useApp.getState().activeSessionByProject['proj-a']).toBe('a-2');
  });

  it('the same folder path on another machine is NOT the active project', async () => {
    useApp.setState({
      sessions: [
        session({ id: 'a-1' }),
        session({ id: 'far', status: 'exited', machine: STUDIO })
      ]
    } as never);
    restoreResult = session({ id: 'far', machine: STUDIO });
    await useApp.getState().restoreSession('far');
    expect(calls).toEqual(['restore:far']);
    expect(useApp.getState().activeSessionByProject['proj-a']).toBe('a-1');
  });

  it('restarting a session of project B while A is active leaves A’s selection alone', async () => {
    useApp.setState({
      sessions: [session({ id: 'a-1' }), inB({ status: 'exited' })]
    } as never);
    restartResult = inB({ id: 'b-2', status: 'running' });
    await useApp.getState().restartSession('b-1');
    expect(calls).toEqual(['restart:b-1']);
    expect(useApp.getState().activeSessionByProject['proj-a']).toBe('a-1');
  });

  it('a restart in the active project still lands on the replacement', async () => {
    useApp.setState({
      sessions: [session({ id: 'a-1', status: 'exited' })]
    } as never);
    restartResult = session({ id: 'a-9' });
    await useApp.getState().restartSession('a-1');
    expect(useApp.getState().activeSessionByProject['proj-a']).toBe('a-9');
  });

  it('with no project open at all, nothing is written', async () => {
    useApp.setState({
      projects: [],
      activeProjectId: null,
      activeSessionByProject: {},
      sessions: [inB()]
    } as never);
    restoreResult = inB({ status: 'running' });
    await useApp.getState().restoreSession('b-1');
    expect(useApp.getState().activeSessionByProject).toEqual({});
  });
});
