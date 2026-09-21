/**
 * Phase 293. The session manager's slice, one describe per verb of the table
 * in build/p293/SPEC.md §6.
 *
 * WHY THE RULES ARE PINNED HERE AND NOT IN THE SHEET'S OWN TESTS. The sheet ends
 * processes, one and many at a time, and every defect the design review found
 * in its first pass was a rule that a component kept and a second route walked
 * past: the Session menu's door switched the tab under an armed confirmation, a
 * continuation wrote a failure under a row it was never about, a second press
 * started a second run, a loop left over from a closed sheet read the NEW
 * batch's stop flag as its own. So each rule is a refusal inside the store's
 * verb, the verb answers whether it acted, and this file drives the verbs
 * directly, with no component in front of them, because a door that calls the
 * verb is exactly what the rule has to hold against.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Session } from '@shared/types';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
let fails: Record<string, Error | null> = {};
let listRows: Session[] = [];
let removedRows: Session[] = [];
let projectRows: Array<{ id: string; name: string; path: string }> = [];
/** Each `overview.activity` call's ids, in order. */
let activityAsks: string[][] = [];
/** When set, the activity call waits on this before it answers. */
let activityGate: (() => Promise<void>) | null = null;

function answer<T>(name: string, value: T): Promise<T> {
  const err = fails[name] ?? null;
  return err !== null ? Promise.reject(err) : Promise.resolve(value);
}

function activityRow(sessionId: string): OverviewSessionActivity {
  return {
    sessionId,
    coverage: 'complete',
    reason: null,
    userMessages: 3,
    agentMessages: 2,
    lastMessageAt: 1_000,
    lastMessageBy: 'agent',
    lastMessageClock: 'message',
    readAt: 2_000
  };
}

const overviewApi: Record<string, unknown> = {
  activity: async (input: { sessionIds: string[] }) => {
    activityAsks.push([...input.sessionIds]);
    if (activityGate !== null) await activityGate();
    return answer('activity', {
      readAt: 2_000,
      sessions: input.sessionIds.map(activityRow)
    });
  }
};

const bridge: Record<string, unknown> = {
  sessions: {
    list: () => {
      calls.push('list');
      return answer('list', listRows);
    },
    listRemoved: () => {
      calls.push('listRemoved');
      return answer('listRemoved', removedRows);
    }
  },
  projects: {
    list: () => {
      calls.push('projects.list');
      return answer('projects.list', projectRows);
    }
  },
  scrollback: {
    saved: (id: string) => {
      calls.push(`saved:${id}`);
      return Promise.resolve(null);
    }
  },
  overview: overviewApi
};

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: bridge
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

function session(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  };
}

/** Let the fire-and-forget chains inside a verb settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const sheet = () => {
  const s = useApp.getState().sessionSheet;
  if (s === null) throw new Error('the sheet is not open');
  return s;
};

/** Open Managed, check `ids`, and open a confirmation naming them. */
function armBatch(ids: readonly string[]): void {
  const s = useApp.getState();
  s.openSessionSheet('managed');
  s.setSessionSheetChecked(ids, true);
  expect(
    s.openSessionSheetBatch({
      named: ids.map((id) => ({ id, where: 'repo' })),
      skippedAtOpen: { ended: 0, unreachable: 0 }
    })
  ).toBe(true);
}

beforeEach(() => {
  calls = [];
  fails = {};
  listRows = [];
  removedRows = [];
  projectRows = [];
  activityAsks = [];
  activityGate = null;
  useApp.setState({
    sessionSheet: null,
    sessions: [],
    pastSessions: [],
    toasts: [],
    confirm: null,
    savedOutputSessionId: null,
    savedOutput: null,
    savedOutputLoading: false
  } as never);
});

// ---------------------------------------------------------------------------

describe('sessionSheet at rest', () => {
  it('is strictly null on a fresh store, never undefined', async () => {
    // A fresh module, so no test above can have written it.
    vi.resetModules();
    const fresh = (await import('../store')).useApp.getState();
    expect('sessionSheet' in fresh).toBe(true);
    expect(fresh.sessionSheet).toBeNull();
    // Four readers ask `!== null`. `undefined !== null` would read as open.
    expect(fresh.sessionSheet !== null).toBe(false);
  });
});

describe('openSessionSheet(tab)', () => {
  it('opens on a fresh state on the asked tab, and fetches the removed list', async () => {
    removedRows = [session('gone', { status: 'discarded' })];
    expect(useApp.getState().openSessionSheet('past')).toBe(true);
    expect(sheet()).toEqual({
      tab: 'past',
      search: '',
      project: 'all',
      tabFilter: 'all',
      stateFilter: 'all',
      lifecycle: 'all',
      sort: null,
      checked: {},
      inline: null,
      batch: null,
      listError: null,
      activity: {}
    });
    await settle();
    expect(calls).toEqual(['listRemoved']);
    expect(useApp.getState().pastSessions.map((x) => x.id)).toEqual(['gone']);
  });

  it('on an open sheet switches the tab through setSessionSheetTab and keeps the rest', () => {
    const s = useApp.getState();
    s.openSessionSheet('managed');
    s.patchSessionSheet({ search: 'auth', sort: { key: 'name', dir: 1 } });
    expect(s.openSessionSheet('past')).toBe(true);
    expect(sheet().tab).toBe('past');
    expect(sheet().search).toBe('auth');
    expect(sheet().sort).toEqual({ key: 'name', dir: 1 });
  });

  it('on an open sheet is refused while a batch runs, like the tab it goes through', () => {
    armBatch(['a']);
    useApp.getState().beginSessionSheetBatchRun(['a']);
    expect(useApp.getState().openSessionSheet('past')).toBe(false);
    expect(sheet().tab).toBe('managed');
  });
});

describe('closeSessionSheet()', () => {
  it('sets the field to null, and a running batch goes with it', () => {
    armBatch(['a']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a']);
    expect(runId).not.toBeNull();
    useApp.getState().closeSessionSheet();
    expect(useApp.getState().sessionSheet).toBeNull();
    // The loop's next report finds nothing to write into.
    useApp.getState().reportSessionSheetBatch(runId!, 'a', { state: 'ended' });
    expect(useApp.getState().sessionSheet).toBeNull();
  });

  it('drops the saved output an open `output` panel was showing', () => {
    const s = useApp.getState();
    s.openSessionSheet('managed');
    s.openSavedOutput('a');
    s.setSessionSheetInline({ id: 'a', kind: 'output' });
    expect(useApp.getState().savedOutputSessionId).toBe('a');
    s.closeSessionSheet();
    // Otherwise the saved output MODAL would draw it over the app the moment
    // the sheet is gone, for a session nobody was looking at.
    expect(useApp.getState().savedOutputSessionId).toBeNull();
  });
});

describe('patchSessionSheet(patch)', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
    useApp.getState().setSessionSheetChecked(['a', 'b'], true);
  });

  it('a change to search, project, tab filter, state filter or lifecycle clears the selection', () => {
    const moves = [
      { search: 'auth' },
      { project: '/repo' },
      { tabFilter: 'closed' as const },
      { stateFilter: 'running' as const },
      // Phase 303. The fifth control, copied by name like the four.
      { lifecycle: 'active' as const }
    ];
    for (const patch of moves) {
      useApp.getState().setSessionSheetChecked(['a', 'b'], true);
      expect(Object.keys(sheet().checked)).toEqual(['a', 'b']);
      useApp.getState().patchSessionSheet(patch);
      expect(sheet().checked, JSON.stringify(patch)).toEqual({});
    }
  });

  it('the same value again, a sort and the read-failure line keep it', () => {
    useApp.getState().patchSessionSheet({ search: '' });
    useApp.getState().patchSessionSheet({ sort: { key: 'created', dir: -1 } });
    useApp.getState().patchSessionSheet({ listError: 'no' });
    expect(Object.keys(sheet().checked)).toEqual(['a', 'b']);
    expect(sheet().sort).toEqual({ key: 'created', dir: -1 });
    expect(sheet().listError).toBe('no');
  });

  it('cannot carry a panel, a batch or a selection, by type or by cast', () => {
    // @ts-expect-error `SessionSheetFilterPatch` has no `inline`, so no continuation can write a panel through it.
    useApp.getState().patchSessionSheet({ inline: { id: 'a', kind: 'failed' } });
    useApp.getState().patchSessionSheet({
      inline: { id: 'a', kind: 'failed', message: 'x' },
      batch: { phase: 'running' },
      checked: { z: true }
    } as never);
    expect(sheet().inline).toBeNull();
    expect(sheet().batch).toBeNull();
    expect(Object.keys(sheet().checked)).toEqual(['a', 'b']);
  });

  it('a filter change closes a confirmation, because it clears the selection', () => {
    expect(
      useApp.getState().openSessionSheetBatch({
        named: [{ id: 'a', where: 'repo' }],
        skippedAtOpen: { ended: 0, unreachable: 0 }
      })
    ).toBe(true);
    useApp.getState().patchSessionSheet({ search: 'x' });
    expect(sheet().batch).toBeNull();
  });
});

describe('setSessionSheetTab(tab)', () => {
  it('is REFUSED while a batch runs, and nothing moves', () => {
    armBatch(['a', 'b']);
    useApp.getState().beginSessionSheetBatchRun(['a', 'b']);
    expect(useApp.getState().setSessionSheetTab('past')).toBe(false);
    expect(sheet().tab).toBe('managed');
    expect(sheet().batch?.phase).toBe('running');
    expect(Object.keys(sheet().checked)).toEqual(['a', 'b']);
  });

  it('closes a confirmation, resets the state filter and the lifecycle, clears the selection, keeps the rest', () => {
    const s = useApp.getState();
    s.openSessionSheet('managed');
    // The filters first: a filter that moves clears the selection, and the
    // confirmation is armed over the selection afterwards.
    s.patchSessionSheet({
      stateFilter: 'running',
      lifecycle: 'active',
      search: 'auth',
      sort: { key: 'name', dir: 1 }
    });
    s.setSessionSheetChecked(['a'], true);
    s.openSessionSheetBatch({
      named: [{ id: 'a', where: 'repo' }],
      skippedAtOpen: { ended: 0, unreachable: 0 }
    });
    expect(sheet().batch?.phase).toBe('confirm');
    expect(s.setSessionSheetTab('past')).toBe(true);
    expect(sheet().tab).toBe('past');
    // An armed confirmation never stands on a tab a person has left.
    expect(sheet().batch).toBeNull();
    expect(sheet().checked).toEqual({});
    // The state filter and the lifecycle control are Managed's alone. Every
    // Past row is `discarded`, which neither would keep.
    expect(sheet().stateFilter).toBe('all');
    expect(sheet().lifecycle).toBe('all');
    expect(sheet().search).toBe('auth');
    expect(sheet().sort).toEqual({ key: 'name', dir: 1 });
  });

  it('closes a finished report too, so the tab a person moves to can open a panel', () => {
    armBatch(['a']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a'])!;
    useApp.getState().reportSessionSheetBatch(runId, 'a', {
      state: 'failed',
      message: 'no'
    });
    useApp.getState().finishSessionSheetBatch(runId);
    expect(sheet().batch?.phase).toBe('done');
    expect(useApp.getState().setSessionSheetTab('past')).toBe(true);
    expect(sheet().batch).toBeNull();
    // The report is drawn on Managed alone. Left standing, it would refuse
    // Details on every Past row with nothing on screen to say why.
    expect(
      useApp.getState().setSessionSheetInline({ id: 'gone', kind: 'details' })
    ).toBe(true);
  });

  it('the same tab again changes nothing', () => {
    armBatch(['a']);
    expect(useApp.getState().setSessionSheetTab('managed')).toBe(true);
    expect(sheet().batch?.phase).toBe('confirm');
    expect(sheet().checked).toEqual({ a: true });
  });

  it('closes an expansion that is not busy and keeps one that is', () => {
    const s = useApp.getState();
    s.openSessionSheet('managed');
    s.setSessionSheetInline({ id: 'a', kind: 'details' });
    s.setSessionSheetTab('past');
    expect(sheet().inline).toBeNull();
    s.setSessionSheetTab('managed');
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    s.setSessionSheetTab('past');
    // Its answer is about to land in it.
    expect(sheet().inline).toEqual({ id: 'a', kind: 'end', busy: true });
  });
});

describe('setSessionSheetChecked, clearSessionSheetChecked, pruneSessionSheetChecked', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
  });

  it('check and uncheck BY ID, and refuse an empty id', () => {
    const s = useApp.getState();
    expect(s.setSessionSheetChecked(['a', '', 'b', 'a'], true)).toBe(true);
    expect(sheet().checked).toEqual({ a: true, b: true });
    s.setSessionSheetChecked(['a'], false);
    expect(sheet().checked).toEqual({ b: true });
  });

  it('ANY write that changes the selection closes a confirmation, by every route', () => {
    const routes: Array<[string, () => void]> = [
      ['check', () => useApp.getState().setSessionSheetChecked(['c'], true)],
      ['uncheck', () => useApp.getState().setSessionSheetChecked(['a'], false)],
      ['clear', () => useApp.getState().clearSessionSheetChecked()],
      ['prune', () => useApp.getState().pruneSessionSheetChecked(['b'])]
    ];
    for (const [name, write] of routes) {
      useApp.getState().closeSessionSheet();
      armBatch(['a', 'b']);
      write();
      expect(sheet().batch, name).toBeNull();
    }
  });

  it('a write that changes nothing leaves the confirmation standing', () => {
    armBatch(['a', 'b']);
    useApp.getState().setSessionSheetChecked(['a'], true);
    useApp.getState().pruneSessionSheetChecked(['a', 'b', 'c']);
    expect(sheet().batch?.phase).toBe('confirm');
  });

  it('closes an expansion that is not busy and keeps one that is', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'x', kind: 'details' });
    s.setSessionSheetChecked(['a'], true);
    expect(sheet().inline).toBeNull();
    s.setSessionSheetInline({ id: 'x', kind: 'end' });
    s.markSessionSheetInlineBusy('x');
    s.setSessionSheetChecked(['b'], true);
    expect(sheet().inline?.busy).toBe(true);
  });

  it('check, uncheck and clear are refused while a batch runs; the prune is not', () => {
    armBatch(['a', 'b']);
    useApp.getState().beginSessionSheetBatchRun(['a', 'b']);
    const s = useApp.getState();
    expect(s.setSessionSheetChecked(['c'], true)).toBe(false);
    expect(s.setSessionSheetChecked(['a'], false)).toBe(false);
    expect(s.clearSessionSheetChecked()).toBe(false);
    expect(sheet().checked).toEqual({ a: true, b: true });
    // A row the filters now hide is never kept checked.
    expect(s.pruneSessionSheetChecked(['a'])).toBe(true);
    expect(sheet().checked).toEqual({ a: true });
    // The run it cannot touch.
    expect(sheet().batch?.phase).toBe('running');
    expect(sheet().batch?.targets).toEqual(['a', 'b']);
  });

  it('the Past tab has no selection to write', () => {
    useApp.getState().setSessionSheetTab('past');
    expect(useApp.getState().setSessionSheetChecked(['a'], true)).toBe(false);
    expect(sheet().checked).toEqual({});
  });
});

describe('setSessionSheetInline(next)', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
  });

  it('opens one at a time, by id', () => {
    const s = useApp.getState();
    expect(s.setSessionSheetInline({ id: 'a', kind: 'details' })).toBe(true);
    expect(s.setSessionSheetInline({ id: 'b', kind: 'rename' })).toBe(true);
    expect(sheet().inline).toEqual({ id: 'b', kind: 'rename' });
    expect(s.setSessionSheetInline(null)).toBe(true);
    expect(sheet().inline).toBeNull();
  });

  it('is REFUSED over a busy panel, for another row and for a close', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    expect(s.setSessionSheetInline({ id: 'b', kind: 'details' })).toBe(false);
    expect(s.setSessionSheetInline(null)).toBe(false);
    expect(sheet().inline).toEqual({ id: 'a', kind: 'end', busy: true });
  });

  it('is refused while a batch runs and while its report stands', () => {
    armBatch(['a']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a'])!;
    expect(
      useApp.getState().setSessionSheetInline({ id: 'b', kind: 'details' })
    ).toBe(false);
    useApp.getState().reportSessionSheetBatch(runId, 'a', {
      state: 'failed',
      message: 'no'
    });
    useApp.getState().finishSessionSheetBatch(runId);
    expect(sheet().batch?.phase).toBe('done');
    expect(
      useApp.getState().setSessionSheetInline({ id: 'b', kind: 'details' })
    ).toBe(false);
    expect(sheet().inline).toBeNull();
  });

  it('opening one CLOSES a confirmation', () => {
    armBatch(['a']);
    expect(
      useApp.getState().setSessionSheetInline({ id: 'b', kind: 'details' })
    ).toBe(true);
    expect(sheet().batch).toBeNull();
    // The selection is not touched by it.
    expect(sheet().checked).toEqual({ a: true });
  });

  it('a panel cannot be born busy, and an empty id opens nothing', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end', busy: true });
    expect(sheet().inline).toEqual({ id: 'a', kind: 'end' });
    expect(s.setSessionSheetInline({ id: '', kind: 'details' })).toBe(false);
  });
});

describe('markSessionSheetInlineBusy(id)', () => {
  it('is true once, and false for the second press, another id or no panel', () => {
    const s = useApp.getState();
    s.openSessionSheet('managed');
    expect(s.markSessionSheetInlineBusy('a')).toBe(false);
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    expect(s.markSessionSheetInlineBusy('b')).toBe(false);
    expect(s.markSessionSheetInlineBusy('a')).toBe(true);
    // A double click, a held Enter.
    expect(s.markSessionSheetInlineBusy('a')).toBe(false);
    expect(sheet().inline?.busy).toBe(true);
  });
});

describe('settleSessionSheetInline(id, next)', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
  });

  it('writes a whole panel into its own busy panel and answers true', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    expect(
      s.settleSessionSheetInline('a', {
        id: 'a',
        kind: 'failed',
        message: 'Session not found.',
        retry: 'end'
      })
    ).toBe(true);
    // Whole, and at rest: a settled panel is never still busy.
    expect(sheet().inline).toEqual({
      id: 'a',
      kind: 'failed',
      message: 'Session not found.',
      retry: 'end'
    });
  });

  it('writes NOTHING for another id, a panel that is not busy, or a closed sheet', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    // Not busy: the person has not pressed.
    expect(s.settleSessionSheetInline('a', null)).toBe(false);
    expect(sheet().inline).toEqual({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    // Another row's continuation.
    expect(
      s.settleSessionSheetInline('b', { id: 'b', kind: 'failed', message: 'x' })
    ).toBe(false);
    expect(sheet().inline).toEqual({ id: 'a', kind: 'end', busy: true });
    // The sheet closed while the call was in the air.
    s.closeSessionSheet();
    expect(
      s.settleSessionSheetInline('a', { id: 'a', kind: 'failed', message: 'x' })
    ).toBe(false);
    expect(useApp.getState().sessionSheet).toBeNull();
  });

  it('a panel replaced and reopened for the same id is not busy, so a stale answer is refused', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    s.settleSessionSheetInline('a', null);
    s.setSessionSheetInline({ id: 'a', kind: 'details' });
    expect(
      s.settleSessionSheetInline('a', { id: 'a', kind: 'failed', message: 'x' })
    ).toBe(false);
    expect(sheet().inline).toEqual({ id: 'a', kind: 'details' });
  });

  it('never draws under another row: a next for another id closes the busy panel and answers false', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'a', kind: 'end' });
    s.markSessionSheetInlineBusy('a');
    expect(
      s.settleSessionSheetInline('a', { id: 'b', kind: 'failed', message: 'x' })
    ).toBe(false);
    expect(sheet().inline).toBeNull();
  });
});

describe('openSessionSheetBatch({ named, skippedAtOpen })', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
    useApp.getState().setSessionSheetChecked(['a', 'b'], true);
  });

  const open = () =>
    useApp.getState().openSessionSheetBatch({
      named: [
        { id: 'a', where: 'repo' },
        { id: '', where: 'repo' },
        { id: 'a', where: 'repo' },
        { id: 'b', where: 'other' }
      ],
      skippedAtOpen: { ended: 2, unreachable: 1 }
    });

  it('opens a confirmation in drawn order, by id, with no copy of the selection', () => {
    expect(open()).toBe(true);
    expect(sheet().batch).toEqual({
      runId: 0,
      phase: 'confirm',
      named: [
        { id: 'a', where: 'repo' },
        { id: 'b', where: 'other' }
      ],
      skippedAtOpen: { ended: 2, unreachable: 1 },
      targets: [],
      outcomes: {},
      stopRequested: false
    });
    expect('checked' in sheet().batch!).toBe(false);
  });

  it('is refused while a batch exists', () => {
    expect(open()).toBe(true);
    expect(open()).toBe(false);
  });

  it('is refused while an expansion is busy, and closes one that is not', () => {
    const s = useApp.getState();
    s.setSessionSheetInline({ id: 'x', kind: 'end' });
    s.markSessionSheetInlineBusy('x');
    expect(open()).toBe(false);
    s.settleSessionSheetInline('x', { id: 'x', kind: 'details' });
    expect(open()).toBe(true);
    expect(sheet().inline).toBeNull();
  });

  it('is refused on the Past tab', () => {
    useApp.getState().setSessionSheetTab('past');
    expect(open()).toBe(false);
  });
});

describe('beginSessionSheetBatchRun(targets)', () => {
  it('flips to running and mints a run id in one write, and a second press answers null', () => {
    armBatch(['a', 'b']);
    const first = useApp.getState().beginSessionSheetBatchRun(['a', 'b']);
    expect(first).toEqual(expect.any(Number));
    expect(sheet().batch).toMatchObject({
      runId: first,
      phase: 'running',
      targets: ['a', 'b'],
      outcomes: { a: { state: 'pending' }, b: { state: 'pending' } },
      stopRequested: false
    });
    // A held Enter, a double click.
    expect(useApp.getState().beginSessionSheetBatchRun(['a', 'b'])).toBeNull();
    expect(sheet().batch?.runId).toBe(first);
  });

  it('answers null with no batch, or no sheet', () => {
    expect(useApp.getState().beginSessionSheetBatchRun(['a'])).toBeNull();
    useApp.getState().openSessionSheet('managed');
    expect(useApp.getState().beginSessionSheetBatchRun(['a'])).toBeNull();
  });

  it('never repeats a run id across a close and a reopen', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5; i++) {
      armBatch(['a']);
      const runId = useApp.getState().beginSessionSheetBatchRun(['a']);
      expect(runId).not.toBeNull();
      expect(seen.has(runId!)).toBe(false);
      seen.add(runId!);
      useApp.getState().closeSessionSheet();
    }
  });

  it('a target is an id that was NAMED at open and is still CHECKED at the press', () => {
    armBatch(['a', 'b']);
    // Every verb that writes the selection closes an open confirmation, so the
    // state a stale caller could hand the freeze is planted directly: `b` is no
    // longer checked, and `c` is checked and was never named. A caller that
    // asked for all three gets the one id both lists hold.
    useApp.setState({
      sessionSheet: { ...sheet(), checked: { a: true, c: true } }
    } as never);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a', 'b', 'c']);
    expect(runId).not.toBeNull();
    expect(sheet().batch?.targets).toEqual(['a']);
    expect(Object.keys(sheet().batch?.outcomes ?? {})).toEqual(['a']);
  });

  it('answers null and stays in confirm when nothing is left to end', () => {
    armBatch(['a']);
    expect(useApp.getState().beginSessionSheetBatchRun(['z'])).toBeNull();
    expect(sheet().batch?.phase).toBe('confirm');
  });
});

describe('reportSessionSheetBatch(runId, id, outcome)', () => {
  it('writes the current run and drops a report from any other', () => {
    armBatch(['a', 'b']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a', 'b'])!;
    useApp.getState().reportSessionSheetBatch(runId, 'a', { state: 'ending' });
    expect(sheet().batch?.outcomes['a']).toEqual({ state: 'ending' });
    useApp.getState().reportSessionSheetBatch(runId - 1, 'b', { state: 'ended' });
    useApp.getState().reportSessionSheetBatch(runId + 1, 'b', { state: 'ended' });
    expect(sheet().batch?.outcomes['b']).toEqual({ state: 'pending' });
    // An id that is not a target of this run.
    useApp.getState().reportSessionSheetBatch(runId, 'z', { state: 'ended' });
    expect(sheet().batch?.outcomes['z']).toBeUndefined();
  });

  it('a loop from a sheet that was closed and reopened writes nothing into the new batch', () => {
    armBatch(['a']);
    const old = useApp.getState().beginSessionSheetBatchRun(['a'])!;
    useApp.getState().closeSessionSheet();
    armBatch(['a']);
    const fresh = useApp.getState().beginSessionSheetBatchRun(['a'])!;
    expect(fresh).not.toBe(old);
    useApp.getState().reportSessionSheetBatch(old, 'a', { state: 'ended' });
    useApp.getState().finishSessionSheetBatch(old);
    expect(sheet().batch?.runId).toBe(fresh);
    expect(sheet().batch?.phase).toBe('running');
    expect(sheet().batch?.outcomes['a']).toEqual({ state: 'pending' });
  });
});

describe('finishSessionSheetBatch(runId)', () => {
  it('every target ended: the batch closes and the selection clears', () => {
    armBatch(['a', 'b']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a', 'b'])!;
    for (const id of ['a', 'b']) {
      useApp.getState().reportSessionSheetBatch(runId, id, { state: 'ended' });
    }
    useApp.getState().finishSessionSheetBatch(runId);
    expect(sheet().batch).toBeNull();
    expect(sheet().checked).toEqual({});
  });

  it('otherwise done, and only failed and not-run targets stay checked', () => {
    armBatch(['a', 'b', 'c', 'd']);
    const runId = useApp
      .getState()
      .beginSessionSheetBatchRun(['a', 'b', 'c', 'd'])!;
    const r = useApp.getState().reportSessionSheetBatch;
    r(runId, 'a', { state: 'ended' });
    r(runId, 'b', { state: 'skipped', reason: 'gone' });
    r(runId, 'c', { state: 'failed', message: 'Session not found.' });
    r(runId, 'd', { state: 'not-run' });
    useApp.getState().finishSessionSheetBatch(runId);
    expect(sheet().batch?.phase).toBe('done');
    // A second press names exactly these.
    expect(sheet().checked).toEqual({ c: true, d: true });
  });

  it('is dropped unless the run is current', () => {
    armBatch(['a']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a'])!;
    useApp.getState().reportSessionSheetBatch(runId, 'a', { state: 'ended' });
    useApp.getState().finishSessionSheetBatch(runId + 1);
    expect(sheet().batch?.phase).toBe('running');
  });
});

describe('requestSessionSheetBatchStop() and closeSessionSheetBatch()', () => {
  it('stop sets the flag on a running batch and nowhere else', () => {
    armBatch(['a']);
    useApp.getState().requestSessionSheetBatchStop();
    expect(sheet().batch?.stopRequested).toBe(false);
    useApp.getState().beginSessionSheetBatchRun(['a']);
    useApp.getState().requestSessionSheetBatchStop();
    expect(sheet().batch?.stopRequested).toBe(true);
  });

  it('close is REFUSED while running: a run is stopped, never dismissed', () => {
    armBatch(['a']);
    useApp.getState().beginSessionSheetBatchRun(['a']);
    expect(useApp.getState().closeSessionSheetBatch()).toBe(false);
    expect(sheet().batch?.phase).toBe('running');
  });

  it('Cancel closes a confirmation and KEEPS the selection', () => {
    armBatch(['a', 'b']);
    expect(useApp.getState().closeSessionSheetBatch()).toBe(true);
    expect(sheet().batch).toBeNull();
    expect(sheet().checked).toEqual({ a: true, b: true });
  });

  it('Done closes a report and keeps what stayed checked', () => {
    armBatch(['a', 'b']);
    const runId = useApp.getState().beginSessionSheetBatchRun(['a', 'b'])!;
    useApp.getState().reportSessionSheetBatch(runId, 'a', { state: 'ended' });
    useApp.getState().reportSessionSheetBatch(runId, 'b', {
      state: 'failed',
      message: 'no'
    });
    useApp.getState().finishSessionSheetBatch(runId);
    expect(useApp.getState().closeSessionSheetBatch()).toBe(true);
    expect(sheet().batch).toBeNull();
    expect(sheet().checked).toEqual({ b: true });
  });
});

describe('refreshSessionSheet()', () => {
  it('re-reads the session list, the removed list and the project list', async () => {
    listRows = [session('a')];
    removedRows = [session('gone', { status: 'discarded' })];
    projectRows = [{ id: 'p', name: 'repo', path: '/repo' }];
    useApp.getState().openSessionSheet('managed');
    await settle();
    calls = [];
    await useApp.getState().refreshSessionSheet();
    expect([...calls].sort()).toEqual(['list', 'listRemoved', 'projects.list']);
    const s = useApp.getState();
    expect(s.sessions.map((x) => x.id)).toEqual(['a']);
    expect(s.pastSessions.map((x) => x.id)).toEqual(['gone']);
    expect(s.projects.map((p) => p.id)).toEqual(['p']);
    expect(sheet().listError).toBeNull();
  });

  it('a read that fails says so in the sheet, keeps what it had, and Try again clears it', async () => {
    useApp.setState({ sessions: [session('kept')] } as never);
    useApp.getState().openSessionSheet('managed');
    await settle();
    fails['list'] = new Error('ipc closed');
    await useApp.getState().refreshSessionSheet();
    expect(sheet().listError).toBe('ipc closed');
    expect(useApp.getState().sessions.map((x) => x.id)).toEqual(['kept']);
    expect(useApp.getState().toasts).toEqual([]);
    fails['list'] = null;
    await useApp.getState().refreshSessionSheet();
    expect(sheet().listError).toBeNull();
  });

  it('does nothing with the sheet closed', async () => {
    await useApp.getState().refreshSessionSheet();
    expect(calls).toEqual([]);
  });
});

describe('loadSessionActivity(ids)', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
  });

  it('asks in chunks of 100, in the order given, one after another', async () => {
    const order: string[] = [];
    let open = 0;
    activityGate = async () => {
      open++;
      order.push(`start:${open}`);
      await settle();
      order.push(`end:${open}`);
      open--;
    };
    await useApp.getState().loadSessionActivity(ids(250));
    expect(activityAsks.map((a) => a.length)).toEqual([100, 100, 50]);
    expect(activityAsks.flat()).toEqual(ids(250));
    // Never two calls in the air at once.
    expect(order).toEqual([
      'start:1',
      'end:1',
      'start:1',
      'end:1',
      'start:1',
      'end:1'
    ]);
    expect(Object.keys(sheet().activity)).toHaveLength(250);
    expect(sheet().activity['s249']?.coverage).toBe('complete');
  });

  it('a chunk that rejects settles EVERY id it asked for, and later chunks still run', async () => {
    let n = 0;
    activityGate = async () => {
      n++;
      fails['activity'] =
        n === 1 ? new Error("'overview:activity' INVALID_INPUT") : null;
    };
    await useApp.getState().loadSessionActivity(ids(150));
    const activity = sheet().activity;
    for (const id of ids(100)) {
      expect(activity[id], id).toEqual({
        sessionId: id,
        coverage: 'unavailable',
        reason: 'unreadable',
        userMessages: null,
        agentMessages: null,
        lastMessageAt: null,
        lastMessageBy: null,
        lastMessageClock: null,
        readAt: null
      });
    }
    expect(activity['s120']?.coverage).toBe('complete');
  });

  it('an id the answer leaves out is settled too, and an id nobody asked for is not written', async () => {
    const real = overviewApi['activity'];
    overviewApi['activity'] = () =>
      Promise.resolve({
        readAt: 1,
        sessions: [activityRow('a'), activityRow('stranger')]
      });
    try {
      await useApp.getState().loadSessionActivity(['a', 'b']);
    } finally {
      overviewApi['activity'] = real;
    }
    expect(sheet().activity['a']?.coverage).toBe('complete');
    expect(sheet().activity['b']?.reason).toBe('unreadable');
    expect(sheet().activity['stranger']).toBeUndefined();
  });

  it('a build with no overview.activity settles every id, with no error drawn', async () => {
    const real = overviewApi['activity'];
    delete overviewApi['activity'];
    try {
      await useApp.getState().loadSessionActivity(['a', 'b']);
    } finally {
      overviewApi['activity'] = real;
    }
    expect(sheet().activity['a']?.reason).toBe('unreadable');
    expect(sheet().activity['b']?.reason).toBe('unreadable');
    expect(useApp.getState().toasts).toEqual([]);
    expect(sheet().listError).toBeNull();
  });

  it('asks each id once, never an empty one, and replaces per id', async () => {
    useApp.setState({
      sessionSheet: {
        ...sheet(),
        activity: { kept: activityRow('kept') }
      }
    } as never);
    await useApp.getState().loadSessionActivity(['a', '', 'a', 'b']);
    expect(activityAsks).toEqual([['a', 'b']]);
    expect(Object.keys(sheet().activity).sort()).toEqual(['a', 'b', 'kept']);
  });

  it('stops asking once the sheet has closed', async () => {
    activityGate = async () => {
      useApp.getState().closeSessionSheet();
    };
    await useApp.getState().loadSessionActivity(ids(250));
    expect(activityAsks).toHaveLength(1);
    expect(useApp.getState().sessionSheet).toBeNull();
  });
});

describe('the saved output an `output` panel shows', () => {
  beforeEach(() => {
    useApp.getState().openSessionSheet('managed');
  });

  it('is dropped whenever the store closes that panel by itself', () => {
    const s = useApp.getState();
    s.openSavedOutput('a');
    s.setSessionSheetInline({ id: 'a', kind: 'output' });
    // A checkbox is a store-side close of any panel that is not busy.
    s.setSessionSheetChecked(['z'], true);
    expect(sheet().inline).toBeNull();
    expect(useApp.getState().savedOutputSessionId).toBeNull();
  });

  it('is kept when the next row’s saved output was opened before its panel', () => {
    const s = useApp.getState();
    s.openSavedOutput('a');
    s.setSessionSheetInline({ id: 'a', kind: 'output' });
    s.openSavedOutput('b');
    s.setSessionSheetInline({ id: 'b', kind: 'output' });
    expect(sheet().inline).toEqual({ id: 'b', kind: 'output' });
    expect(useApp.getState().savedOutputSessionId).toBe('b');
  });
});
