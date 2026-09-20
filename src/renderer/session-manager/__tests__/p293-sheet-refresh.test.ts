/**
 * Phase 293. The engine that keeps the open sheet true: every trigger that
 * asks main about a conversation, the removed list's refetch, the prune, the
 * project filter that lost its group, and the expansion whose row left.
 *
 * What these tests hold, with fake timers over the REAL store (the session
 * manager slice's own verbs do the writing; only the three verbs that would
 * reach main are doubles):
 *  - the sheet opening asks every Managed id once, in drawn order;
 *  - an id that appears is asked at once, and only once;
 *  - a status change is asked 1,500 ms after the FIRST change, and a second
 *    change inside that window rides in the same call;
 *  - every 30 s, the `running` ids and no others are joined into that call,
 *    and only while the page is visible and the sheet is on Managed;
 *  - a change to the session list refetches the removed list 250 ms later,
 *    once however many changes land inside the window;
 *  - THE PRUNE: a push that hides a checked row unchecks it on that change,
 *    whether the push is a status (the Running filter) or a tab opening (the
 *    Tab closed filter), and a sort keeps the selection;
 *  - a project filter whose group is gone resets to All and clears the
 *    selection;
 *  - Details on a Past row asks for that one row;
 *  - an expansion whose row left closes, and a busy one does not;
 *  - the refresh button re-reads the lists, then asks every Managed id;
 *  - stopping clears every timer, and nothing is asked after it.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session, SessionStatus } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {}
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
  removeEventListener() {},
  visibilityState: 'visible'
});

const { useApp } = await import('../../state/store');
const {
  createSheetRefresh,
  PAST_REFETCH_MS,
  RUNNING_REASK_MS,
  STATUS_ASK_MS
} = await import('../use-sheet-refresh');

function session(
  id: string,
  projectPath: string,
  status: SessionStatus = 'running'
): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'claude',
    status,
    createdAt: 1_700_000_000_000
  };
}

const project = (path: string, name: string): Project => ({
  id: `p:${path}`,
  path,
  name
});

let load: ReturnType<typeof vi.fn>;
let refetchPast: ReturnType<typeof vi.fn>;
let refreshSheet: ReturnType<typeof vi.fn>;
let visible = true;
let engine: ReturnType<typeof createSheetRefresh> | null = null;

const s = () => useApp.getState();
const asked = (): string[][] =>
  load.mock.calls.map((call) => [...(call[0] as string[])]);

function setSessions(sessions: Session[]): void {
  useApp.setState({ sessions });
}

function startWith(sessions: Session[], projects: Project[] = []): void {
  useApp.setState({
    sessions,
    pastSessions: [],
    projects,
    tabOrder: projects.map((p) => p.id),
    machineStates: [],
    handbacks: {},
    restoringIds: {},
    shellPathReady: true,
    sessionSheet: null,
    loadSessionActivity: load as never,
    refreshPastSessions: refetchPast as never,
    refreshSessionSheet: refreshSheet as never
  });
  s().openSessionSheet('managed');
  refetchPast.mockClear();
  engine = createSheetRefresh(useApp, () => visible);
  engine.start();
}

beforeEach(() => {
  vi.useFakeTimers();
  visible = true;
  load = vi.fn(async () => undefined);
  refetchPast = vi.fn(async () => undefined);
  refreshSheet = vi.fn(async () => undefined);
});

afterEach(() => {
  engine?.stop();
  engine = null;
  useApp.setState({ sessionSheet: null });
  vi.useRealTimers();
});

describe('asking main about the conversations (Phase 293, SPEC 3.5)', () => {
  it('the sheet opening asks every Managed id once, in DRAWN order', () => {
    // Closed groups are drawn by label: `alpha` before `beta`.
    startWith([
      session('b1', '/w/beta'),
      session('a1', '/w/alpha'),
      session('a2', '/w/alpha')
    ]);
    expect(asked()).toEqual([['a1', 'a2', 'b1']]);
  });

  it('an id that appears is asked at once, and only once', () => {
    const first = [session('a1', '/w/alpha')];
    startWith(first);
    load.mockClear();
    setSessions([...first, session('n1', '/w/new')]);
    expect(asked()).toEqual([['n1']]);
    // An unrelated change later asks nothing again.
    useApp.setState({ restoringIds: {} });
    setSessions([...s().sessions]);
    expect(asked()).toEqual([['n1']]);
  });

  it('a status change is asked 1,500 ms after the FIRST change, and a second one joins it', () => {
    startWith([
      session('a1', '/w/alpha'),
      session('a2', '/w/alpha'),
      session('a3', '/w/alpha')
    ]);
    load.mockClear();
    setSessions([
      session('a1', '/w/alpha', 'idle'),
      session('a2', '/w/alpha'),
      session('a3', '/w/alpha')
    ]);
    vi.advanceTimersByTime(1_000);
    setSessions([
      session('a1', '/w/alpha', 'idle'),
      session('a2', '/w/alpha', 'needs_input'),
      session('a3', '/w/alpha')
    ]);
    vi.advanceTimersByTime(STATUS_ASK_MS - 1_000 - 1);
    expect(asked()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(asked()).toEqual([['a1', 'a2']]);
    // The window is not pushed back by the second change, and nothing more.
    vi.advanceTimersByTime(STATUS_ASK_MS * 3);
    expect(asked()).toEqual([['a1', 'a2']]);
  });

  it('every 30 s the RUNNING ids, and no others, ride in the joined call', () => {
    startWith([
      session('r1', '/w/alpha', 'running'),
      session('i1', '/w/alpha', 'idle'),
      session('x1', '/w/alpha', 'exited'),
      session('r2', '/w/beta', 'running')
    ]);
    load.mockClear();
    vi.advanceTimersByTime(RUNNING_REASK_MS - 1);
    expect(asked()).toEqual([]);
    vi.advanceTimersByTime(1 + STATUS_ASK_MS);
    expect(asked()).toEqual([['r1', 'r2']]);
  });

  it('asks nothing on the 30 s tick while the page is hidden', () => {
    startWith([session('r1', '/w/alpha', 'running')]);
    load.mockClear();
    visible = false;
    vi.advanceTimersByTime((RUNNING_REASK_MS + STATUS_ASK_MS) * 2);
    expect(asked()).toEqual([]);
    visible = true;
    vi.advanceTimersByTime(RUNNING_REASK_MS + STATUS_ASK_MS);
    expect(asked()).toEqual([['r1']]);
  });

  it('asks nothing on the 30 s tick while the sheet is on Past', () => {
    startWith([session('r1', '/w/alpha', 'running')]);
    load.mockClear();
    s().setSessionSheetTab('past');
    vi.advanceTimersByTime((RUNNING_REASK_MS + STATUS_ASK_MS) * 2);
    expect(asked()).toEqual([]);
  });

  it('Details on a Past row asks for that one row', () => {
    startWith([session('a1', '/w/alpha')]);
    useApp.setState({
      pastSessions: [session('gone1', '/w/old', 'discarded')]
    });
    s().setSessionSheetTab('past');
    load.mockClear();
    s().setSessionSheetInline({ id: 'gone1', kind: 'details' });
    expect(asked()).toEqual([['gone1']]);
  });

  it('the refresh button re-reads the lists, THEN asks every Managed id', async () => {
    startWith([session('a1', '/w/alpha'), session('b1', '/w/beta')]);
    load.mockClear();
    const order: string[] = [];
    refreshSheet.mockImplementation(async () => {
      order.push('lists');
    });
    load.mockImplementation(async () => {
      order.push('activity');
    });
    await engine?.refresh();
    expect(order).toEqual(['lists', 'activity']);
    expect(asked()).toEqual([['a1', 'b1']]);
  });
});

describe('the removed list follows the session list (Phase 293, SPEC 3.6)', () => {
  it('refetches 250 ms after a change, once for every change inside the window', () => {
    startWith([session('a1', '/w/alpha')]);
    setSessions([session('a1', '/w/alpha', 'idle')]);
    vi.advanceTimersByTime(100);
    setSessions([session('a1', '/w/alpha', 'exited')]);
    vi.advanceTimersByTime(PAST_REFETCH_MS - 100 - 1);
    expect(refetchPast).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refetchPast).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PAST_REFETCH_MS * 4);
    expect(refetchPast).toHaveBeenCalledTimes(1);
  });

  it('a change that is not to the session list refetches nothing', () => {
    startWith([session('a1', '/w/alpha')]);
    useApp.setState({ restoringIds: {} });
    vi.advanceTimersByTime(PAST_REFETCH_MS * 4);
    expect(refetchPast).not.toHaveBeenCalled();
  });
});

describe('the prune: checked stays a subset of what a person can see (Phase 293, SPEC 2.10)', () => {
  it('a push that hides a checked row unchecks it on that change (the Running filter)', () => {
    startWith([
      session('a1', '/w/alpha', 'running'),
      session('a2', '/w/alpha', 'idle')
    ]);
    s().patchSessionSheet({ stateFilter: 'running' });
    s().setSessionSheetChecked(['a1', 'a2'], true);
    expect(Object.keys(s().sessionSheet?.checked ?? {})).toEqual(['a1', 'a2']);
    setSessions([
      session('a1', '/w/alpha', 'exited'),
      session('a2', '/w/alpha', 'idle')
    ]);
    expect(s().sessionSheet?.checked).toEqual({ a2: true });
  });

  it('a project tab opening under the Tab closed filter unchecks its rows', () => {
    startWith([
      session('a1', '/w/alpha'),
      session('b1', '/w/beta')
    ]);
    s().patchSessionSheet({ tabFilter: 'closed' });
    s().setSessionSheetChecked(['a1', 'b1'], true);
    useApp.setState({
      projects: [project('/w/alpha', 'alpha')],
      tabOrder: ['p:/w/alpha']
    });
    expect(s().sessionSheet?.checked).toEqual({ b1: true });
  });

  it('a row that leaves the list is unchecked', () => {
    startWith([session('a1', '/w/alpha'), session('a2', '/w/alpha')]);
    s().setSessionSheetChecked(['a1', 'a2'], true);
    setSessions([session('a2', '/w/alpha')]);
    expect(s().sessionSheet?.checked).toEqual({ a2: true });
  });

  it('a sort keeps the selection, and so does a push that hides nothing', () => {
    startWith([session('a1', '/w/alpha'), session('a2', '/w/alpha')]);
    s().setSessionSheetChecked(['a1', 'a2'], true);
    s().patchSessionSheet({ sort: { key: 'name', dir: -1 } });
    setSessions([
      session('a1', '/w/alpha', 'idle'),
      session('a2', '/w/alpha', 'needs_input')
    ]);
    expect(s().sessionSheet?.checked).toEqual({ a1: true, a2: true });
  });

  it('a project filter whose group is gone resets to All and clears the selection', () => {
    startWith([session('a1', '/w/alpha'), session('b1', '/w/beta')]);
    s().patchSessionSheet({ project: '/w/beta' });
    s().setSessionSheetChecked(['b1'], true);
    expect(s().sessionSheet?.checked).toEqual({ b1: true });
    setSessions([session('a1', '/w/alpha')]);
    expect(s().sessionSheet?.project).toBe('all');
    expect(s().sessionSheet?.checked).toEqual({});
  });

  it('a project filter whose group is still there is kept', () => {
    startWith([session('a1', '/w/alpha'), session('b1', '/w/beta')]);
    s().patchSessionSheet({ project: '/w/beta' });
    setSessions([session('a1', '/w/alpha'), session('b1', '/w/beta', 'idle')]);
    expect(s().sessionSheet?.project).toBe('/w/beta');
  });
});

describe('an expansion whose row has left (Phase 293, SPEC 3.6)', () => {
  it('closes when it is not busy', () => {
    startWith([session('a1', '/w/alpha'), session('a2', '/w/alpha')]);
    s().setSessionSheetInline({ id: 'a1', kind: 'details' });
    setSessions([session('a2', '/w/alpha')]);
    expect(s().sessionSheet?.inline).toBeNull();
  });

  it('stays while its verb is busy, because its answer is about to land in it', () => {
    startWith([session('a1', '/w/alpha'), session('a2', '/w/alpha')]);
    s().setSessionSheetInline({ id: 'a1', kind: 'remove' });
    expect(s().markSessionSheetInlineBusy('a1')).toBe(true);
    setSessions([session('a2', '/w/alpha')]);
    expect(s().sessionSheet?.inline).toMatchObject({ id: 'a1', busy: true });
  });
});

describe('stopping (Phase 293, SPEC 3.5)', () => {
  it('clears every timer, and asks nothing after', () => {
    startWith([session('a1', '/w/alpha')]);
    setSessions([session('a1', '/w/alpha', 'idle')]);
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(3);
    engine?.stop();
    expect(vi.getTimerCount()).toBe(0);
    load.mockClear();
    setSessions([session('a1', '/w/alpha'), session('z1', '/w/zeta')]);
    vi.advanceTimersByTime(RUNNING_REASK_MS * 2);
    expect(load).not.toHaveBeenCalled();
    expect(refetchPast).not.toHaveBeenCalled();
  });

  it('the hook mounts the engine once and stops it on unmount (source text)', () => {
    const text = readFileSync(
      resolve(import.meta.dirname, '../use-sheet-refresh.ts'),
      'utf8'
    );
    const hook = text.slice(text.indexOf('export function useSheetRefresh'));
    expect(hook).toMatch(/createSheetRefresh\(useApp\)/);
    expect(hook).toMatch(/\.start\(\)/);
    expect(hook).toMatch(/return \(\) => \{\s*one\.stop\(\)/);
    expect(hook).toMatch(/\}, \[\]\);/);
  });
});
