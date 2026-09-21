/**
 * Phase 293 — what the session manager does when a person presses something.
 *
 * Driven over the REAL store: the sheet's slice and its refusals are the ones
 * that ship. Only the verbs that reach main are replaced by recorders, so each
 * test can say exactly which lifecycle call was made, for which id, and in what
 * order, and can hold a call open to change the world under it.
 *
 * What this file holds (build/p293/SPEC.md §7, builder E):
 *
 *  - THE RULE OF THE PRESS, per verb. A host method, a captured menu row, an
 *    inline Confirm and a Retry, each handed the id of a row that CHANGED since
 *    it was drawn, calls no lifecycle verb and says `SESSION_CHANGED` once.
 *  - A double Confirm calls its verb once.
 *  - A continuation whose panel is gone writes no panel and says its failure in
 *    a sticky toast.
 *  - The rows that go to the session first run only after the jump answered
 *    ok, and a refused jump runs nothing and leaves the sheet open.
 *  - THE FREEZE: an id not named at open is never a target however eligible it
 *    became; a named id that is no longer eligible is not a target; a checked
 *    id the filters hide is never named; a second press starts nothing; and an
 *    old loop under a NEW batch ends nothing further.
 *  - The restore path: a closed local target asks, a remote one never does, a
 *    refused open restores nothing, a failure keeps the row, offers Retry and
 *    re-activates the project that was active, and a success toasts with the
 *    way to the session and leaves the sheet open.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session, SessionMachine } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      list: () => Promise.resolve([]),
      listRemoved: () => Promise.resolve([]),
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve(),
      kill: () => Promise.resolve()
    },
    machines: {
      reviewFiles: (input: { machineId: string }) => {
        jump.ran.push(`reviewFiles:${input.machineId}`);
        return Promise.resolve({ files: [], untracked: [], note: null });
      }
    },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});
/** Frames are kept, never run, unless a test flushes them. */
const frames: FrameRequestCallback[] = [];
vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
  frames.push(fn);
  return frames.length;
});
function flushFrames(): void {
  for (const fn of frames.splice(0)) fn(0);
}
vi.stubGlobal('navigator', {
  userAgent: globalThis.navigator?.userAgent ?? 'node',
  platform: 'MacIntel',
  clipboard: { writeText: () => Promise.resolve() }
});

const jump = vi.hoisted(() => ({
  answer: (id: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    void id;
    return Promise.resolve({ ok: true });
  },
  asked: [] as string[],
  /** What a row's own run reached AFTER the jump: the Context view, the review. */
  ran: [] as string[]
}));

vi.mock('../../icons/codicon-menu-icon', async (original) => {
  const real = await original<typeof import('../../icons/codicon-menu-icon')>();
  return {
    ...real,
    menuGlyph: (name: string) => ({
      icon: { dataUrl: `glyph:${name}`, template: true }
    })
  };
});
vi.mock('../../context/open-session', () => ({
  openSessionContext: (session: { id: string }) => {
    jump.ran.push(`openSessionContext:${session.id}`);
  }
}));
vi.mock('../../app/session-focus', async (original) => {
  const real = await original<typeof import('../../app/session-focus')>();
  return {
    ...real,
    jumpToSession: (id: string) => {
      jump.asked.push(id);
      return jump.answer(id);
    },
    focusTerminal: () => {
      jump.ran.push('focusTerminal');
    }
  };
});

const { useApp } = await import('../../state/store');
const actions = await import('../actions');
const {
  batchClosedToast,
  batchEndedToast,
  GO_TO_SESSION,
  RESTORE_STILL_HERE,
  SESSION_CHANGED
} = await import('../copy');
const { noFolderThere } = await import('../../app/reach-copy');
type ManageRow = import('../projection').ManageRow;
type LifecycleResult = import('../../state/resume').LifecycleResult;
type RestoreOutcome = import('../../state/resume').RestoreOutcome;

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const STUDIO: SessionMachine = {
  id: 'm1',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function sess(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: `tmux-${id}`,
    projectPath: '/w/one',
    cwd: '/w/one',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  };
}

/** An ended row with something to bring back. */
function ended(id: string, over: Partial<Session> = {}): Session {
  return sess(id, {
    status: 'exited',
    hasSavedScrollback: true,
    resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
    agentSessionId: 'c0ffee',
    ...over
  });
}

/** Every call that reaches toward main, in order. */
let log: string[] = [];
let toasts: { kind: string; text: string; sticky?: boolean; action?: string }[] = [];

/** A promise the test resolves when it chooses. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** What each recorded verb answers. A test may replace any of them. */
let answers: {
  end: (id: string) => Promise<LifecycleResult>;
  remove: (id: string) => Promise<LifecycleResult>;
  rename: (id: string, name: string) => Promise<LifecycleResult>;
  restart: (id: string) => Promise<LifecycleResult>;
  restore: (id: string) => Promise<RestoreOutcome>;
  restorePast: (id: string) => Promise<RestoreOutcome>;
  list: () => Promise<Session[] | null>;
  open: () => Promise<
    | { ok: true; projectId: string }
    | { ok: false; kind: 'local'; message: string; code?: 'PROJECT_NOT_FOUND' }
  >;
};

function restored(id: string): RestoreOutcome {
  return {
    kind: 'restored',
    session: sess(id),
    note: { kind: 'success', text: `'name-${id}' restored.`, sticky: false }
  };
}

function world(sessions: Session[], over: Record<string, unknown> = {}): void {
  log = [];
  toasts = [];
  jump.asked = [];
  jump.ran = [];
  jump.answer = () => Promise.resolve({ ok: true });
  answers = {
    end: () => Promise.resolve({ ok: true }),
    remove: () => Promise.resolve({ ok: true }),
    rename: () => Promise.resolve({ ok: true }),
    restart: () => Promise.resolve({ ok: true }),
    restore: (id) => Promise.resolve(restored(id)),
    restorePast: (id) => Promise.resolve(restored(id)),
    // Main's truth is whatever the store holds when it is asked.
    list: () => Promise.resolve([...useApp.getState().sessions]),
    open: () => Promise.resolve({ ok: true, projectId: 'p-new' })
  };
  useApp.setState({
    sessionSheet: null,
    sessions,
    pastSessions: [],
    projects: [],
    tabOrder: [],
    machineStates: [],
    handbacks: {},
    restoringIds: {},
    shellPathReady: true,
    activeProjectId: null,
    canRestore: () => true,
    canDiscard: () => true,
    toast: (kind: string, text: string, opts?: { sticky?: boolean; action?: { label: string } }) => {
      toasts.push({
        kind,
        text,
        ...(opts?.sticky === undefined ? {} : { sticky: opts.sticky }),
        ...(opts?.action === undefined ? {} : { action: opts.action.label })
      });
    },
    setMenu: () => {
      log.push('setMenu');
    },
    refreshPastSessions: () => Promise.resolve(),
    refreshSessionSheet: () => {
      log.push('refreshSessionSheet');
      return Promise.resolve();
    },
    openSavedOutput: (id: string) => {
      log.push(`openSavedOutput:${id}`);
    },
    resumeInPlace: (id: string) => {
      log.push(`resumeInPlace:${id}`);
      return Promise.resolve();
    },
    endSessionNow: (id: string) => {
      log.push(`end:${id}`);
      return answers.end(id);
    },
    removeSessionNow: (id: string) => {
      log.push(`remove:${id}`);
      return answers.remove(id);
    },
    renameSessionNow: (id: string, name: string) => {
      log.push(`rename:${id}:${name}`);
      return answers.rename(id, name);
    },
    restartSessionNow: (id: string) => {
      log.push(`restart:${id}`);
      return answers.restart(id);
    },
    restoreSessionNow: (id: string) => {
      log.push(`restore:${id}`);
      return answers.restore(id);
    },
    restorePastSession: (id: string) => {
      log.push(`restorePast:${id}`);
      return answers.restorePast(id);
    },
    refreshSessions: () => {
      log.push('list');
      return answers.list();
    },
    openTargetProject: () => {
      log.push('openTargetProject');
      return answers.open();
    },
    ...over
  } as never);
  useApp.getState().openSessionSheet('managed');
}

/** Change one row in the store, as another window or the session itself would. */
function change(id: string, over: Partial<Session>): void {
  useApp.setState({
    sessions: useApp.getState().sessions.map((one) =>
      one.id === id ? { ...one, ...over } : one
    )
  });
}

/** The only thing a handler may read off a drawn row is its id and its tab. */
function drawn(id: string, tab: 'managed' | 'past' = 'managed'): ManageRow {
  return { id, tab } as ManageRow;
}

function sheet() {
  return useApp.getState().sessionSheet;
}

function lifecycle(): string[] {
  return log.filter((one) =>
    /^(end|remove|rename|restart|restore|restorePast|resumeInPlace):/.test(one)
  );
}

function changedToasts(): number {
  return toasts.filter((t) => t.text === SESSION_CHANGED).length;
}

/** Let every queued continuation run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

beforeEach(() => {
  world([]);
});

// ---------------------------------------------------------------------------
// §4.0, per verb
// ---------------------------------------------------------------------------

describe('THE RULE OF THE PRESS: a row that changed since it was drawn', () => {
  it('Restart on a row that turned live calls nothing', async () => {
    world([ended('x', { status: 'exited' })]);
    const items = actions.manageMenuItems(drawn('x'));
    const restart = items.find((one) => one !== 'sep' && one.label === 'Restart');
    expect(restart).toBeDefined();
    // Restored from another window while the menu stood open.
    change('x', { status: 'running' });
    (restart as { run: () => void }).run();
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('Remove on a row that turned live calls nothing and opens no panel', () => {
    world([ended('x')]);
    const items = actions.manageMenuItems(drawn('x'));
    const remove = items.find((one) => one !== 'sep' && one.label === 'Remove');
    change('x', { status: 'running' });
    (remove as { run: () => void }).run();
    expect(sheet()?.inline).toBeNull();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('End on a row that ended by itself calls nothing and opens no panel', () => {
    world([sess('x')]);
    const items = actions.manageMenuItems(drawn('x'));
    const end = items.find((one) => one !== 'sep' && one.label === 'End session…');
    change('x', { status: 'exited' });
    (end as { run: () => void }).run();
    expect(sheet()?.inline).toBeNull();
    expect(changedToasts()).toBe(1);
  });

  it('Rename on a row Tortie can no longer see calls nothing', () => {
    world([sess('x')]);
    const items = actions.manageMenuItems(drawn('x'));
    const rename = items.find((one) => one !== 'sep' && one.label === 'Rename');
    change('x', { status: 'unknown' });
    (rename as { run: () => void }).run();
    expect(sheet()?.inline).toBeNull();
    expect(changedToasts()).toBe(1);
  });

  it('a row that is gone altogether calls nothing', () => {
    world([sess('x')]);
    const items = actions.manageMenuItems(drawn('x'));
    const end = items.find((one) => one !== 'sep' && one.label === 'End session…');
    useApp.setState({ sessions: [] });
    (end as { run: () => void }).run();
    expect(sheet()?.inline).toBeNull();
    expect(changedToasts()).toBe(1);
  });

  it('the visible button answers the verb it was DRAWN with, never the one it flipped to', async () => {
    // End was drawn; the row ended under the finger.
    world([sess('x')]);
    change('x', { status: 'exited', hasSavedScrollback: true });
    actions.runPrimary('x', 'managed', 'end');
    await settle();
    expect(sheet()?.inline ?? null).toBeNull();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
    // Restore was drawn; the row was restored from another window. (A row on
    // another machine is offered Restore from main's own `canRestore`, which
    // main withdraws from a live row; this Mac's rule is read here.)
    world([ended('y')], { projects: [{ id: 'p1', path: '/w/one', name: 'one' }] });
    change('y', { status: 'running' });
    actions.runPrimary('y', 'managed', 'restore');
    await settle();
    expect(sheet()?.inline ?? null).toBeNull();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('every host method re-reads: each one handed a changed row calls nothing', async () => {
    const host = actions.sheetHost;
    const cases: [string, () => void, Session, Partial<Session>][] = [
      ['end', () => host.end('x'), sess('x'), { status: 'exited' }],
      ['remove', () => host.remove('x'), ended('x'), { status: 'running' }],
      ['restart', () => host.restart('x'), ended('x'), { status: 'running' }],
      ['restart bare', () => host.restart('x', { withoutCapture: true }), ended('x', { capture: { provider: 'claude', bin: '/b', exitCodeApproximate: false } }), { status: 'idle' }],
      ['restore', () => host.restore('x'), ended('x'), { status: 'running' }],
      ['rename', () => host.rename('x'), sess('x'), { status: 'unknown' }],
      ['goThen', () => host.goThen('x', () => log.push('ran:x'), 'offersResumeInPlace'), sess('x'), { status: 'unknown' }]
    ];
    for (const [name, press, before, after] of cases) {
      world([before]);
      change('x', after);
      press();
      await settle();
      expect(lifecycle(), name).toEqual([]);
      expect(log.includes('ran:x'), name).toBe(false);
      expect(jump.asked, name).toEqual([]);
      expect(sheet()?.inline ?? null, name).toBeNull();
      expect(changedToasts(), name).toBe(1);
    }
  });
});

describe('THE RULE OF THE PRESS, at every inline Confirm', () => {
  it('End: the row ended while the panel was open', async () => {
    world([sess('x')]);
    actions.sheetHost.end('x');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'end' });
    change('x', { status: 'exited' });
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(sheet()?.inline).toBeNull();
    expect(changedToasts()).toBe(1);
  });

  it('Remove: the row turned live while the panel was open', async () => {
    world([ended('x')]);
    actions.sheetHost.remove('x');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'remove' });
    change('x', { status: 'running' });
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('Restart without saving history: the row turned live', async () => {
    const captured = { provider: 'claude', bin: '/b', exitCodeApproximate: false };
    world([ended('x', { capture: captured })]);
    actions.sheetHost.restart('x', { withoutCapture: true });
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restart-bare' });
    change('x', { status: 'running' });
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('Open project and restore: the row was restored elsewhere', async () => {
    world([ended('x')]);
    actions.runPrimary('x', 'managed');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
    change('x', { status: 'running' });
    actions.confirmInline();
    await settle();
    expect(log).not.toContain('openTargetProject');
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('Save name: the row became unreachable', async () => {
    world([sess('x')]);
    actions.sheetHost.rename('x');
    change('x', { status: 'unknown' });
    actions.saveRename('x', 'fresh-name');
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(changedToasts()).toBe(1);
  });
});

describe('Retry re-enters the gate', () => {
  it('a Retry over a row that changed calls nothing', async () => {
    world([sess('x')]);
    answers.end = () => Promise.resolve({ ok: false, message: 'Machine is not ready.' });
    actions.sheetHost.end('x');
    actions.confirmInline();
    await settle();
    expect(sheet()?.inline).toMatchObject({
      id: 'x',
      kind: 'failed',
      retry: 'end',
      message: 'Machine is not ready.'
    });
    expect(lifecycle()).toEqual(['end:x']);
    change('x', { status: 'exited' });
    actions.retryInline();
    await settle();
    expect(lifecycle()).toEqual(['end:x']);
    expect(changedToasts()).toBe(1);
  });

  it('a Retry over an unchanged row runs the verb once more, in its own panel', async () => {
    world([sess('x')]);
    answers.end = () => Promise.resolve({ ok: false, message: 'first' });
    actions.sheetHost.end('x');
    actions.confirmInline();
    await settle();
    answers.end = () => Promise.resolve({ ok: true });
    actions.retryInline();
    await settle();
    expect(lifecycle()).toEqual(['end:x', 'end:x']);
    expect(sheet()?.inline).toBeNull();
  });

  it('a Restart Retry over a row restored since calls nothing', async () => {
    world([ended('x')]);
    answers.restart = () => Promise.resolve({ ok: false, message: 'no' });
    actions.sheetHost.restart('x');
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'failed', retry: 'restart' });
    change('x', { status: 'running' });
    actions.retryInline();
    await settle();
    expect(lifecycle()).toEqual(['restart:x']);
    expect(changedToasts()).toBe(1);
  });
});

describe('a confirm acts once per panel', () => {
  it('a double Confirm calls the verb once', async () => {
    world([sess('x')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    actions.sheetHost.end('x');
    actions.confirmInline();
    actions.confirmInline();
    actions.confirmInline();
    expect(lifecycle()).toEqual(['end:x']);
    expect(sheet()?.inline).toMatchObject({ id: 'x', busy: true });
    held.resolve({ ok: true });
    await settle();
    expect(lifecycle()).toEqual(['end:x']);
    expect(sheet()?.inline).toBeNull();
  });

  it('a busy panel is not replaced by another row’s panel, and its answer lands under its own row', async () => {
    world([sess('x'), sess('y')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    actions.sheetHost.end('x');
    actions.confirmInline();
    actions.openDetails('y', 'managed');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'end', busy: true });
    held.resolve({ ok: false, message: 'Machine is not ready.' });
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'failed', retry: 'end' });
  });
});

describe('a continuation whose panel is gone', () => {
  it('writes no panel when the sheet closed, and says the failure in one sticky toast', async () => {
    world([sess('x')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    actions.sheetHost.end('x');
    actions.confirmInline();
    useApp.getState().closeSessionSheet();
    held.resolve({ ok: false, message: 'Machine is not ready.' });
    await settle();
    expect(sheet()).toBeNull();
    expect(toasts).toEqual([
      { kind: 'error', text: 'Machine is not ready.', sticky: true }
    ]);
  });

  it('writes nothing into ANOTHER row’s panel after a close and a reopen', async () => {
    world([sess('x'), sess('y')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    actions.sheetHost.end('x');
    actions.confirmInline();
    useApp.getState().closeSessionSheet();
    useApp.getState().openSessionSheet('managed');
    actions.openDetails('y', 'managed');
    held.resolve({ ok: false, message: 'Machine is not ready.' });
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'y', kind: 'details' });
    expect(toasts.filter((t) => t.kind === 'error')).toHaveLength(1);
  });

  it('says nothing for an End that worked, as the shipped verb does', async () => {
    world([sess('x')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    actions.sheetHost.end('x');
    actions.confirmInline();
    useApp.getState().closeSessionSheet();
    held.resolve({ ok: true });
    await settle();
    expect(toasts).toEqual([]);
  });
});

describe('the rows that go to the session first', () => {
  const armed: Partial<Session> = {
    status: 'idle',
    agentSessionId: 'c0ffee',
    resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
    resumeCapture: 'armed'
  };

  function resumeRow(): { run: () => void } | undefined {
    const items = actions.manageMenuItems(drawn('x'));
    return items.find(
      (one) => one !== 'sep' && one.label === 'Resume conversation'
    ) as { run: () => void } | undefined;
  }

  it('Resume conversation types only after the jump answered ok, and closes the sheet', async () => {
    world([sess('x', armed)], {
      handbacks: { x: { state: 'left', leftAt: 1 } }
    });
    const held = deferred<{ ok: true }>();
    jump.answer = () => held.promise;
    const row = resumeRow();
    expect(row).toBeDefined();
    row!.run();
    expect(jump.asked).toEqual(['x']);
    expect(lifecycle()).toEqual([]);
    held.resolve({ ok: true });
    await settle();
    expect(lifecycle()).toEqual(['resumeInPlace:x']);
    expect(sheet()).toBeNull();
  });

  it('a refused jump types nothing and leaves the sheet open', async () => {
    world([sess('x', armed)], {
      handbacks: { x: { state: 'left', leftAt: 1 } }
    });
    jump.answer = () => Promise.resolve({ ok: false, message: 'gone' });
    resumeRow()!.run();
    await settle();
    expect(lifecycle()).toEqual([]);
    expect(sheet()).not.toBeNull();
  });

  it('Show what it loaded… and the review wait for the jump too', async () => {
    world([sess('x'), sess('r', { machine: STUDIO })]);
    const loaded = actions
      .manageMenuItems(drawn('x'))
      .find((one) => one !== 'sep' && one.label === 'Show what it loaded…') as {
      run: () => void;
    };
    const review = actions
      .manageMenuItems(drawn('r'))
      .find((one) => one !== 'sep' && one.label === 'Review changes on Studio') as {
      run: () => void;
    };
    jump.answer = () => Promise.resolve({ ok: false, message: 'refused' });
    loaded.run();
    review.run();
    await settle();
    expect(jump.asked).toEqual(['x', 'r']);
    expect(jump.ran).toEqual([]);
    expect(sheet()).not.toBeNull();
    // The same two rows, and the jump lands this time.
    jump.answer = () => Promise.resolve({ ok: true });
    loaded.run();
    await settle();
    expect(jump.ran).toEqual(['openSessionContext:x']);
    useApp.getState().openSessionSheet('managed');
    review.run();
    await settle();
    expect(jump.ran).toEqual(['openSessionContext:x', 'reviewFiles:m1']);
  });

  it('Go to session closes the sheet only on ok', async () => {
    world([sess('x')]);
    jump.answer = () => Promise.resolve({ ok: false, message: 'refused' });
    actions.goToSession('x');
    await settle();
    expect(sheet()).not.toBeNull();
    jump.answer = () => Promise.resolve({ ok: true });
    actions.goToSession('x');
    await settle();
    expect(sheet()).toBeNull();
  });

  it('Go to session refuses an unreachable row even when handed its id', async () => {
    world([sess('x', { status: 'unknown' })]);
    actions.goToSession('x');
    await settle();
    expect(jump.asked).toEqual([]);
    expect(changedToasts()).toBe(1);
  });

  it('Show what it loaded… still goes to an unreachable row, because it only reads', async () => {
    world([sess('x', { status: 'unknown' })]);
    const loaded = actions
      .manageMenuItems(drawn('x'))
      .find((one) => one !== 'sep' && one.label === 'Show what it loaded…') as {
      run: () => void;
    };
    loaded.run();
    await settle();
    expect(jump.asked).toEqual(['x']);
    expect(changedToasts()).toBe(0);
  });

  it('Go to session is not offered on an unreachable row, and Details always is', () => {
    world([sess('x', { status: 'unknown' })]);
    const labels = actions
      .manageMenuItems(drawn('x'))
      .map((one) => (one === 'sep' ? '---' : one.label));
    expect(labels.slice(0, 2)).toEqual(['Session details', '---']);
  });

  it('the menu is the policy’s, under the sheet’s two own rows', () => {
    world([sess('x')]);
    const labels = actions
      .manageMenuItems(drawn('x'))
      .map((one) => (one === 'sep' ? '---' : one.label));
    expect(labels.slice(0, 3)).toEqual(['Session details', GO_TO_SESSION, '---']);
    expect(labels.at(-1)).toBe('End session…');
  });
});

// ---------------------------------------------------------------------------
// Batch End: the freeze
// ---------------------------------------------------------------------------

describe('THE FREEZE: batch End names an upper bound and never widens it', () => {
  function check(...ids: string[]): void {
    useApp.getState().setSessionSheetChecked(ids, true);
  }

  it('an id NOT named at open is never a target, however eligible it became', async () => {
    // b is on a machine this run holds no row for: unreachable at open.
    world([sess('a'), sess('b', { machine: STUDIO })]);
    check('a', 'b');
    actions.startBatch();
    expect(sheet()?.batch?.named.map((t) => t.id)).toEqual(['a']);
    expect(sheet()?.batch?.skippedAtOpen).toEqual({ ended: 0, unreachable: 1 });
    // The machine reconnects while the confirmation is open.
    useApp.setState({ machineStates: [{ id: 'm1', label: 'Studio' } as never] });
    // The press's own freeze refuses it, before the store's second lock is
    // asked, so neither lock stands in for the other.
    expect(actions.batchTargetsNow()).toEqual(['a']);
    await actions.confirmBatch();
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a']);
  });

  it('a named id that is no longer eligible is not a target', async () => {
    world([sess('a'), sess('c')]);
    check('a', 'c');
    actions.startBatch();
    expect(sheet()?.batch?.named.map((t) => t.id)).toEqual(['a', 'c']);
    change('c', { status: 'exited' });
    await actions.confirmBatch();
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a']);
  });

  it('a checked id the filters hide is never named', () => {
    world([sess('a', { name: 'alpha' }), sess('d', { name: 'delta' })]);
    useApp.getState().patchSessionSheet({ search: 'alpha' });
    // The prune is not trusted to have run: plant the hidden id straight
    // into the selection.
    const open = sheet()!;
    useApp.setState({ sessionSheet: { ...open, checked: { a: true, d: true } } });
    actions.startBatch();
    expect(sheet()?.batch?.named.map((t) => t.id)).toEqual(['a']);
  });

  it('a checked id the filters hide at the PRESS is not a target', async () => {
    world([sess('a', { name: 'alpha' }), sess('d', { name: 'delta' })]);
    check('a', 'd');
    actions.startBatch();
    const open = sheet()!;
    // A filter that moved without its prune: the store would clear the
    // selection, so this plants the state a missed prune would leave.
    useApp.setState({ sessionSheet: { ...open, search: 'alpha' } });
    expect(actions.batchTargetsNow()).toEqual(['a']);
  });

  // Phase 303. The lifecycle control is the fifth filter, and the batch's own
  // picture (`managedView`) applies it like the four: the picture a batch
  // names from is the one the person is looking at, never a wider one.
  it('a checked id the lifecycle control hides is never named', () => {
    world([sess('a'), sess('x', { status: 'exited' })]);
    useApp.getState().patchSessionSheet({ lifecycle: 'ended' });
    // Planted straight into the selection, as above: `a` is live, so the
    // Ended segment hides it, and the prune is not trusted to have run.
    const open = sheet()!;
    useApp.setState({ sessionSheet: { ...open, checked: { a: true, x: true } } });
    actions.startBatch();
    // `x` is drawn under Ended and is checked, and it is not eligible: it is
    // counted, not named. `a` is never asked at all.
    expect(sheet()?.batch?.named).toEqual([]);
    expect(sheet()?.batch?.skippedAtOpen).toEqual({ ended: 1, unreachable: 0 });
  });

  it('a checked id the lifecycle control hides at the PRESS is not a target', async () => {
    world([sess('a'), sess('u', { status: 'unknown' })]);
    check('a', 'u');
    actions.startBatch();
    expect(sheet()?.batch?.named.map((t) => t.id)).toEqual(['a']);
    const open = sheet()!;
    // The segment moved to Ended without its prune. `a` is live and hidden.
    useApp.setState({ sessionSheet: { ...open, lifecycle: 'ended' } });
    expect(actions.batchTargetsNow()).toEqual([]);
    // And back under Active, the same named row is a target again.
    useApp.setState({ sessionSheet: { ...sheet()!, lifecycle: 'active' } });
    expect(actions.batchTargetsNow()).toEqual(['a']);
  });

  it('a second press starts nothing', async () => {
    world([sess('a'), sess('b')]);
    check('a', 'b');
    actions.startBatch();
    const first = actions.confirmBatch();
    const second = actions.confirmBatch();
    await Promise.all([first, second]);
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a', 'end:b']);
  });

  it('reads the list before EVERY target, and ends them one at a time in drawn order', async () => {
    world([sess('a'), sess('b'), sess('c')]);
    check('c', 'a', 'b');
    actions.startBatch();
    await actions.confirmBatch();
    expect(log.filter((one) => one === 'list' || one.startsWith('end:'))).toEqual([
      'list',
      'end:a',
      'list',
      'end:b',
      'list',
      'end:c'
    ]);
  });

  it('when every target ended, the panel closes, the selection clears and one toast says how many', async () => {
    world([sess('a'), sess('b')]);
    check('a', 'b');
    actions.startBatch();
    await actions.confirmBatch();
    expect(sheet()?.batch).toBeNull();
    expect(sheet()?.checked).toEqual({});
    expect(toasts).toEqual([{ kind: 'success', text: batchEndedToast(2) }]);
  });

  it('when one did not end, the report stays and only what is still there stays checked', async () => {
    world([sess('a'), sess('b')]);
    answers.end = (id) =>
      Promise.resolve(id === 'b' ? { ok: false, message: 'no' } : { ok: true });
    check('a', 'b');
    actions.startBatch();
    await actions.confirmBatch();
    expect(sheet()?.batch?.phase).toBe('done');
    expect(sheet()?.checked).toEqual({ b: true });
  });

  it('an old loop under a NEW batch ends no further target', async () => {
    world([sess('a'), sess('b'), sess('c')]);
    const held = deferred<LifecycleResult>();
    answers.end = (id) => (id === 'a' ? held.promise : Promise.resolve({ ok: true }));
    check('a', 'b');
    actions.startBatch();
    const first = actions.confirmBatch();
    await settle();
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a']);
    // The sheet closes mid-batch and is opened again with a fresh batch,
    // whose stop flag is clear.
    useApp.getState().closeSessionSheet();
    useApp.getState().openSessionSheet('managed');
    check('c');
    actions.startBatch();
    expect(sheet()?.batch?.phase).toBe('confirm');
    expect(sheet()?.batch?.stopRequested).toBe(false);
    held.resolve({ ok: true });
    await first;
    // b was never ended by the old loop, and nothing it reported landed in
    // the new batch.
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a']);
    expect(sheet()?.batch?.named.map((t) => t.id)).toEqual(['c']);
    expect(sheet()?.batch?.outcomes).toEqual({});
    expect(toasts.filter((t) => t.text === batchClosedToast(1, 2))).toEqual([
      { kind: 'info', text: batchClosedToast(1, 2), sticky: true }
    ]);
  });

  it('the manager closed during the LAST target’s call: the toast says no rest (the fix round)', async () => {
    world([sess('a')]);
    const held = deferred<LifecycleResult>();
    answers.end = () => held.promise;
    check('a');
    actions.startBatch();
    const run = actions.confirmBatch();
    await settle();
    useApp.getState().closeSessionSheet();
    held.resolve({ ok: true });
    await run;
    expect(toasts.filter((t) => t.kind === 'info').map((t) => t.text)).toEqual([
      '1 of 1 session ended.'
    ]);
  });

  it('Stop ends nothing further and the rest read not run', async () => {
    world([sess('a'), sess('b'), sess('c')]);
    const held = deferred<LifecycleResult>();
    answers.end = (id) => (id === 'a' ? held.promise : Promise.resolve({ ok: true }));
    check('a', 'b', 'c');
    actions.startBatch();
    const run = actions.confirmBatch();
    await settle();
    actions.stopBatch();
    held.resolve({ ok: true });
    await run;
    expect(log.filter((one) => one.startsWith('end:'))).toEqual(['end:a']);
    expect(sheet()?.batch?.outcomes).toMatchObject({
      a: { state: 'ended' },
      b: { state: 'not-run' },
      c: { state: 'not-run' }
    });
  });

  it('Cancel keeps the selection', () => {
    world([sess('a')]);
    check('a');
    actions.startBatch();
    actions.cancelBatch();
    expect(sheet()?.batch).toBeNull();
    expect(sheet()?.checked).toEqual({ a: true });
  });
});

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

describe('restore from the sheet', () => {
  const project: Project = { id: 'p0', path: '/w/zero', name: 'zero' };

  it('a closed local target asks first, inline, and restores nothing yet', () => {
    world([ended('x')]);
    actions.runPrimary('x', 'managed');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
    expect(lifecycle()).toEqual([]);
  });

  it('a target on another machine never asks and never opens a tab here', async () => {
    world([ended('x', { machine: STUDIO })]);
    actions.runPrimary('x', 'managed');
    await settle();
    expect(log).not.toContain('openTargetProject');
    expect(lifecycle()).toEqual(['restore:x']);
  });

  it('a refused open restores NOTHING and says why under the row', async () => {
    world([ended('x')]);
    answers.open = () =>
      Promise.resolve({
        ok: false,
        kind: 'local',
        message: 'nope',
        code: 'PROJECT_NOT_FOUND'
      });
    actions.runPrimary('x', 'managed');
    actions.confirmInline();
    await settle();
    expect(log).toContain('openTargetProject');
    expect(lifecycle()).toEqual([]);
    expect(sheet()?.inline).toMatchObject({
      id: 'x',
      kind: 'failed',
      retry: 'restore'
    });
    // Phase 293, the integrator's round. The session being restored runs
    // nowhere, so Go to session's sentence ("The session is still running
    // and Tortie did not end it.") is false under this row; probe:p293 arm 6
    // read it out over a removed session. The first sentence is the same.
    expect(sheet()?.inline?.message).not.toMatch(/still running/i);
    expect(sheet()?.inline?.message).toBe(noFolderThere('/w/one'));
  });

  it('a failure keeps the row, offers Retry, and re-activates the project that was active', async () => {
    world([ended('x')], { projects: [project], activeProjectId: 'p0' });
    answers.open = () => {
      useApp.setState({
        projects: [project, { id: 'p1', path: '/w/one', name: 'one' }],
        activeProjectId: 'p1'
      });
      return Promise.resolve({ ok: true, projectId: 'p1' });
    };
    answers.restore = () =>
      Promise.resolve({ kind: 'failed', message: 'The folder is not there.' });
    actions.runPrimary('x', 'managed');
    actions.confirmInline();
    await settle();
    expect(useApp.getState().sessions.map((one) => one.id)).toEqual(['x']);
    expect(sheet()?.inline).toMatchObject({
      id: 'x',
      kind: 'failed',
      retry: 'restore',
      message: 'The folder is not there.'
    });
    expect(useApp.getState().activeProjectId).toBe('p0');
    // RESTORE_STILL_HERE is the panel's own second line, not main's sentence.
    expect(sheet()?.inline?.message).not.toContain(RESTORE_STILL_HERE);
  });

  it('a success toasts with the way to the session and leaves the sheet open', async () => {
    world([ended('x')], { projects: [{ id: 'p1', path: '/w/one', name: 'one' }] });
    actions.runPrimary('x', 'managed');
    await settle();
    expect(lifecycle()).toEqual(['restore:x']);
    expect(sheet()).not.toBeNull();
    expect(sheet()?.inline).toBeNull();
    expect(log).toContain('refreshSessionSheet');
    expect(toasts).toEqual([
      { kind: 'success', text: "'name-x' restored.", sticky: false, action: GO_TO_SESSION }
    ]);
  });

  it('Restore without saving history asks first, then comes back through the gate', async () => {
    const captured = { provider: 'claude', bin: '/b', exitCodeApproximate: false };
    world([ended('x', { capture: captured })], {
      projects: [{ id: 'p1', path: '/w/one', name: 'one' }]
    });
    actions.sheetHost.restore('x', { withoutCapture: true });
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-bare' });
    expect(lifecycle()).toEqual([]);
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual(['restore:x']);
  });

  it('a removed row on the Past tab asks inline and restores through the Past verb', async () => {
    world([]);
    useApp.setState({ pastSessions: [ended('x', { status: 'discarded' })] });
    useApp.getState().setSessionSheetTab('past');
    actions.runPrimary('x', 'past');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual(['restorePast:x']);
    // The fix round, W1: a Past restore closes the sheet, as today's panel did.
    expect(sheet()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The fix round: a Past restore lands (W1), and a gone folder is said on the
// first press (W7)
// ---------------------------------------------------------------------------

describe('a Past restore lands in the session, as today’s Past Sessions did (the fix round, W1)', () => {
  const one: Project = { id: 'p1', path: '/w/one', name: 'one' };
  const other: Project = { id: 'p0', path: '/w/zero', name: 'zero' };
  const landed: string[] = [];

  function pastWorld(projects: Project[], active: string | null): void {
    landed.length = 0;
    world([], {
      projects,
      activeProjectId: active,
      setActiveProject: (id: string) => {
        landed.push(`project:${id}`);
        useApp.setState({ activeProjectId: id });
      },
      setActiveSession: (id: string) => {
        landed.push(`session:${id}`);
      }
    });
    useApp.setState({ pastSessions: [ended('x', { status: 'discarded' })] });
    useApp.getState().setSessionSheetTab('past');
  }

  it('its project open but NOT active: the sheet closes, the project is switched to and the session selected', async () => {
    pastWorld([other, one], 'p0');
    actions.runPrimary('x', 'past');
    await settle();
    expect(lifecycle()).toEqual(['restorePast:x']);
    expect(sheet()).toBeNull();
    expect(landed).toEqual(['project:p1', 'session:x']);
    expect(useApp.getState().activeProjectId).toBe('p1');
    // It landed, so the note carries no Go to session.
    expect(toasts).toEqual([
      { kind: 'success', text: "'name-x' restored.", sticky: false }
    ]);
  });

  it('its project open and active: one press, closed and landed', async () => {
    pastWorld([one], 'p1');
    actions.runPrimary('x', 'past');
    await settle();
    expect(sheet()).toBeNull();
    expect(landed).toEqual(['project:p1', 'session:x']);
  });

  it('a pane that moves takes the keyboard itself: the close gives it to NOBODY', async () => {
    pastWorld([other, one], 'p0');
    frames.length = 0;
    actions.runPrimary('x', 'past');
    await settle();
    flushFrames();
    expect(jump.ran).not.toContain('focusTerminal');
  });

  it('the session ALREADY in front (its tab opened for this restore): the close hands the keyboard to the terminal', async () => {
    // probe:p293 arm 5 measured `body`: the pane had mounted while the sheet
    // was open, so its own focus went into the sheet, and a landing that
    // changes no selection made the pane take nothing again.
    pastWorld([one], 'p1');
    useApp.setState({ activeSessionByProject: { p1: 'x' } } as never);
    frames.length = 0;
    actions.runPrimary('x', 'past');
    await settle();
    flushFrames();
    expect(jump.ran).toEqual(['focusTerminal']);
  });

  it('no open tab for it (a row main re-homes): the sheet closes, nothing is selected, and the toast offers the way there', async () => {
    pastWorld([other], 'p0');
    actions.runPrimary('x', 'past');
    // No open target, so the inline ask comes first; confirm it, and the
    // open answers ok without adding a tab in this world.
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual(['restorePast:x']);
    expect(sheet()).toBeNull();
    expect(landed).toEqual([]);
    expect(toasts.at(-1)).toEqual({
      kind: 'success',
      text: "'name-x' restored.",
      sticky: false,
      action: GO_TO_SESSION
    });
  });

  it('a failed Past restore keeps the sheet, the row and the failed panel', async () => {
    pastWorld([one], 'p1');
    answers.restorePast = () =>
      Promise.resolve({ kind: 'failed', message: 'main said no' });
    actions.runPrimary('x', 'past');
    await settle();
    expect(sheet()).not.toBeNull();
    expect(landed).toEqual([]);
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'failed', message: 'main said no' });
  });

  it('the Managed tab still stays open after a restore', async () => {
    world([ended('x')], { projects: [one] });
    actions.runPrimary('x', 'managed');
    await settle();
    expect(sheet()).not.toBeNull();
  });
});

describe('a gone folder is said on the FIRST press (the fix round, W7)', () => {
  const bridge = (window as unknown as { gmux: Record<string, unknown> }).gmux;
  const ENOENT = new Error(
    `Error invoking remote method 'fs:readDir': ${JSON.stringify({
      code: 'FS_FAILED',
      message: 'Could not read one',
      detail: "ENOENT: no such file or directory, scandir '/w/one'"
    })}`
  );
  const EACCES = new Error(
    `Error invoking remote method 'fs:readDir': ${JSON.stringify({
      code: 'FS_FAILED',
      message: 'Could not read one',
      detail: "EACCES: permission denied, scandir '/w/one'"
    })}`
  );
  let read: (path: string) => Promise<unknown>;
  const asked: string[] = [];

  beforeEach(() => {
    asked.length = 0;
    read = () => Promise.resolve({ path: '/w/one', entries: [] });
    bridge['fs'] = {
      readDir: (path: string) => {
        asked.push(path);
        return read(path);
      }
    };
  });
  afterEach(() => {
    delete bridge['fs'];
  });

  it('ENOENT: the failed panel, with the folder sentence, and NO ask promising a shell in it', async () => {
    world([ended('x')]);
    read = () => Promise.reject(ENOENT);
    actions.runPrimary('x', 'managed');
    await settle();
    expect(asked).toEqual(['/w/one']);
    expect(sheet()?.inline).toMatchObject({
      id: 'x',
      kind: 'failed',
      retry: 'restore',
      message: noFolderThere('/w/one')
    });
    expect(log).not.toContain('openTargetProject');
    expect(lifecycle()).toEqual([]);
  });

  it('Retry once the folder is back draws the ask, and its Confirm restores', async () => {
    world([ended('x')]);
    read = () => Promise.reject(ENOENT);
    actions.runPrimary('x', 'managed');
    await settle();
    read = () => Promise.resolve({ path: '/w/one', entries: [] });
    actions.retryInline();
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
    actions.confirmInline();
    await settle();
    expect(lifecycle()).toEqual(['restore:x']);
  });

  it('the Past tab says it the same way', async () => {
    world([]);
    useApp.setState({ pastSessions: [ended('x', { status: 'discarded' })] });
    useApp.getState().setSessionSheetTab('past');
    read = () => Promise.reject(ENOENT);
    actions.runPrimary('x', 'past');
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'failed', retry: 'restore' });
    expect(lifecycle()).toEqual([]);
  });

  it('any OTHER read failure draws the ask exactly as before: this never refuses a restore that could work', async () => {
    world([ended('x')]);
    read = () => Promise.reject(EACCES);
    actions.runPrimary('x', 'managed');
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
  });

  it('a folder that is there draws the ask', async () => {
    world([ended('x')]);
    actions.runPrimary('x', 'managed');
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
  });

  it('a second press while the folder is being asked about does nothing', async () => {
    world([ended('x')]);
    const gate = deferred<unknown>();
    read = () => gate.promise;
    actions.runPrimary('x', 'managed');
    actions.runPrimary('x', 'managed');
    expect(asked).toEqual(['/w/one']);
    gate.resolve({ path: '/w/one', entries: [] });
    await settle();
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'restore-open' });
  });

  it('a row on another machine is never asked about: its folder is not on this Mac', async () => {
    world([ended('x', { machine: STUDIO })]);
    read = () => Promise.reject(ENOENT);
    actions.runPrimary('x', 'managed');
    await settle();
    expect(asked).toEqual([]);
    expect(lifecycle()).toEqual(['restore:x']);
  });
});

describe('the other panels', () => {
  it('Details toggles on a second press', () => {
    world([sess('x')]);
    actions.openDetails('x', 'managed');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'details' });
    actions.openDetails('x', 'managed');
    expect(sheet()?.inline).toBeNull();
  });

  it('saved output opens its panel, then reads the copy, and drops it on close', () => {
    world([sess('x', { savedOutputAt: 5 })]);
    actions.sheetHost.savedOutput('x');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'output' });
    expect(log).toContain('openSavedOutput:x');
    useApp.setState({ savedOutputSessionId: 'x', savedOutputLoading: true });
    actions.cancelInline();
    expect(sheet()?.inline).toBeNull();
    expect(useApp.getState().savedOutputSessionId).toBeNull();
    expect(useApp.getState().savedOutputLoading).toBe(false);
  });

  it('a rename failure is the panel’s own line, and the panel stays open', async () => {
    world([sess('x')]);
    answers.rename = () => Promise.resolve({ ok: false, message: 'Name taken.' });
    actions.sheetHost.rename('x');
    actions.saveRename('x', '  new name  ');
    await settle();
    expect(log).toContain('rename:x:new name');
    expect(sheet()?.inline).toMatchObject({ id: 'x', kind: 'rename', message: 'Name taken.' });
  });

  it('a rename to the same name, or to nothing, sends nothing', async () => {
    world([sess('x')]);
    actions.sheetHost.rename('x');
    actions.saveRename('x', 'name-x');
    actions.saveRename('x', '   ');
    await settle();
    expect(lifecycle()).toEqual([]);
  });

  it('opens the row menu natively and never for a busy row', () => {
    world([sess('x')]);
    actions.openRowMenu(drawn('x'), { left: 10, bottom: 20 });
    expect(log).toEqual(['setMenu']);
    log = [];
    useApp.setState({ restoringIds: { x: true } });
    actions.openRowMenu(drawn('x'), { left: 10, bottom: 20 });
    expect(log).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The source, read as text
// ---------------------------------------------------------------------------

describe('actions.ts, read as text', () => {
  const source = readFileSync(join(__dirname, '..', 'actions.ts'), 'utf8');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('reads nothing off a drawn row but its id and its tab', () => {
    const reads = [...code.matchAll(/\brow\.(\w+)/g)].map((m) => m[1]);
    expect(new Set(reads)).toEqual(new Set(['id']));
    // A session is read off nothing: every one comes from freshRow's re-read.
    expect(code).not.toMatch(/\.session\b(?!-)/);
  });

  it('calls restart and remove only below a freshRow call in the same function', () => {
    const functions = code.split(/\n(?=(?:export )?(?:async )?function |\s{2}\w+\([^)]*\) \{)/);
    for (const verb of ['restartSessionNow(', 'removeSessionNow(']) {
      const holders = functions.filter((body) => body.includes(verb));
      expect(holders.length, verb).toBeGreaterThan(0);
      for (const body of holders) {
        const gate = body.indexOf('freshRow(');
        expect(gate, verb).toBeGreaterThanOrEqual(0);
        expect(gate, verb).toBeLessThan(body.indexOf(verb));
      }
    }
  });

  it('draws no DOM menu and raises no stacked confirm', () => {
    expect(code).not.toMatch(/role="menu"|popover|setConfirm\(/);
  });
});
