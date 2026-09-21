/**
 * Phase 303 VERIFIER's hostile fixture, through the store and not the DOM.
 *
 * Rows holding all SEVEN statuses (a `discarded` row planted in the Managed
 * list on purpose, which main never pushes there, plus three in the Past
 * list), under one open project and one closed one, driven through the REAL
 * store and the REAL refresh engine over every combination of the five
 * filters. The expected set is computed HERE from tables written by hand off
 * the Phase 303 entry's truth table, never read from ./view.ts, and held
 * against `selectSheetView().visibleIds`.
 *
 * Held:
 *  - every combination's `visibleIds` equals the hand-computed intersection,
 *    as a set AND in the All order (the filters never reorder);
 *  - with a batch RUNNING (so `patchSessionSheet` does not clear the
 *    selection itself), a full selection is PRUNED to exactly the visible
 *    set on the same change, for every combination;
 *  - a contradictory pair (Ended × Working, Active × Ended-option,
 *    Ended × Unreachable) draws NOTHING, never something;
 *  - a `discarded` row that reached Managed is drawn under All and under no
 *    segment;
 *  - on Past, a lifecycle value written through the store draws the full
 *    Past list anyway (the coercion), and the tab change resets it;
 *  - executing `statusVisual` for real: the Active statuses drawn with the
 *    ended dot are exactly {unknown}.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session, SessionStatus } from '@shared/types';
import { SESSION_STATUSES } from '@shared/types';

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
const { createSheetRefresh, selectSheetView, selectManageProjection } =
  await import('../use-sheet-refresh');
const { statusVisual } = await import('../../app/status');
type SheetState = NonNullable<
  ReturnType<typeof useApp.getState>['sessionSheet']
>;

// ---------------------------------------------------------------------------
// MY tables, by hand from the entry. Not imported from anywhere.
// ---------------------------------------------------------------------------
const MY_ACTIVE: ReadonlySet<SessionStatus> = new Set([
  'running',
  'idle',
  'needs_input',
  'unknown'
]);
const MY_ENDED: ReadonlySet<SessionStatus> = new Set(['exited', 'restorable']);
const MY_KEEPS: Record<string, readonly SessionStatus[]> = {
  all: [...SESSION_STATUSES],
  running: ['running', 'needs_input', 'idle'],
  working: ['running'],
  'needs-input': ['needs_input'],
  idle: ['idle'],
  ended: ['exited', 'restorable'],
  unreachable: ['unknown']
};
const STATE_VALUES = [
  'all',
  'running',
  'working',
  'needs-input',
  'idle',
  'ended',
  'unreachable'
] as const;
const LIFECYCLES = ['all', 'active', 'ended'] as const;
const TAB_FILTERS = ['all', 'open', 'closed'] as const;
const SEARCHES = ['', 'open-', 'needs', 'nope'] as const;

const OPEN = '/w/open';
const CLOSED = '/w/closed';

function session(
  projectPath: string,
  status: SessionStatus,
  createdAt: number
): Session {
  const tag = projectPath === OPEN ? 'open' : 'closed';
  return {
    id: `${tag}:${status}`,
    name: `${tag}-${status}`,
    tmuxName: `${tag}-${status}`,
    projectPath,
    cwd: projectPath,
    agent: 'claude',
    status,
    createdAt
  };
}

/** Fourteen Managed rows: every status under both projects, `discarded` included on purpose. */
const MANAGED: Session[] = [];
let t = 1_700_000_000_000;
for (const path of [OPEN, CLOSED])
  for (const status of SESSION_STATUSES)
    MANAGED.push(session(path, status, (t += 1000)));
const PAST: Session[] = [
  {
    ...session(OPEN, 'discarded', 1),
    id: 'past:1',
    name: 'past-one',
    tmuxName: 'past-one'
  },
  {
    ...session(CLOSED, 'discarded', 2),
    id: 'past:2',
    name: 'past-two',
    tmuxName: 'past-two'
  },
  {
    ...session(OPEN, 'discarded', 3),
    id: 'past:3',
    name: 'past-three',
    tmuxName: 'past-three'
  }
];
const PROJECTS: Project[] = [{ id: 'p:open', path: OPEN, name: 'Open' }];

let engine: ReturnType<typeof createSheetRefresh> | null = null;
const s = () => useApp.getState();
const sheet = (): SheetState => {
  const v = s().sessionSheet;
  if (v === null) throw new Error('sheet closed');
  return v;
};

beforeEach(() => {
  vi.useFakeTimers();
  useApp.setState({
    sessions: MANAGED,
    pastSessions: PAST,
    projects: PROJECTS,
    tabOrder: PROJECTS.map((p) => p.id),
    machineStates: [],
    handbacks: {},
    restoringIds: {},
    shellPathReady: true,
    sessionSheet: null,
    loadSessionActivity: (async () => undefined) as never,
    refreshPastSessions: (async () => undefined) as never,
    refreshSessionSheet: (async () => undefined) as never
  });
  s().openSessionSheet('managed');
  engine = createSheetRefresh(useApp, () => true);
  engine.start();
});

afterEach(() => {
  engine?.stop();
  engine = null;
  useApp.setState({ sessionSheet: null });
  vi.useRealTimers();
});

/** The group keys the projection gave the two projects, read once. */
function groupKeys(): { open: string; closed: string } {
  const groups = selectManageProjection(s()).managed;
  const open = groups.find((g) => g.path === OPEN)?.key;
  const closed = groups.find((g) => g.path === CLOSED)?.key;
  if (open === undefined || closed === undefined)
    throw new Error('fixture: a group is missing');
  return { open, closed };
}

/** The verifier's own answer for one combination, from the tables above. */
function expectedIds(
  allOrder: readonly string[],
  f: {
    search: string;
    project: 'all' | 'open' | 'closed';
    tabFilter: (typeof TAB_FILTERS)[number];
    stateFilter: (typeof STATE_VALUES)[number];
    lifecycle: (typeof LIFECYCLES)[number];
  }
): string[] {
  const keep = new Set(MY_KEEPS[f.stateFilter]);
  return allOrder.filter((id) => {
    const row = MANAGED.find((x) => x.id === id);
    if (row === undefined) throw new Error(`unknown id ${id}`);
    const isOpen = row.projectPath === OPEN;
    if (f.project === 'open' && !isOpen) return false;
    if (f.project === 'closed' && isOpen) return false;
    if (f.tabFilter === 'open' && !isOpen) return false;
    if (f.tabFilter === 'closed' && isOpen) return false;
    if (!keep.has(row.status)) return false;
    if (f.lifecycle === 'active' && !MY_ACTIVE.has(row.status)) return false;
    if (f.lifecycle === 'ended' && !MY_ENDED.has(row.status)) return false;
    if (f.search !== '' && !row.name.toLowerCase().includes(f.search))
      return false;
    return true;
  });
}

function* combos() {
  for (const search of SEARCHES)
    for (const project of ['all', 'open', 'closed'] as const)
      for (const tabFilter of TAB_FILTERS)
        for (const stateFilter of STATE_VALUES)
          for (const lifecycle of LIFECYCLES)
            yield { search, project, tabFilter, stateFilter, lifecycle };
}

describe('every combination of the five filters, through the store (Phase 303, verifier)', () => {
  it('the fixture is what it says: 14 Managed rows over 7 statuses, 3 Past rows, one open group', () => {
    const view = selectSheetView(s());
    expect(view?.visibleIds).toHaveLength(14);
    expect(new Set(MANAGED.map((x) => x.status)).size).toBe(7);
    expect(
      selectManageProjection(s())
        .managed.map((g) => g.tabOpen)
        .sort()
    ).toEqual([false, true]);
    expect(selectManageProjection(s()).pastRows).toHaveLength(3);
  });

  it('visibleIds equals the hand-computed intersection for all 756 combinations, in the All order', () => {
    const allOrder = selectSheetView(s())?.visibleIds ?? [];
    const keys = groupKeys();
    let count = 0;
    let emptyPairs = 0;
    for (const f of combos()) {
      s().patchSessionSheet({
        search: f.search,
        project:
          f.project === 'all'
            ? 'all'
            : f.project === 'open'
              ? keys.open
              : keys.closed,
        tabFilter: f.tabFilter,
        stateFilter: f.stateFilter,
        lifecycle: f.lifecycle
      });
      const got = selectSheetView(s())?.visibleIds ?? null;
      const want = expectedIds(allOrder, f);
      expect(got, JSON.stringify(f)).toEqual(want);
      if (want.length === 0) emptyPairs += 1;
      count += 1;
    }
    expect(count).toBe(4 * 3 * 3 * 7 * 3);
    // Some combinations must draw nothing, and the fixture reached them.
    expect(emptyPairs).toBeGreaterThan(0);
  });

  it('a contradictory pair draws NOTHING, never something', () => {
    const pairs: Array<
      [(typeof LIFECYCLES)[number], (typeof STATE_VALUES)[number]]
    > = [
      ['ended', 'working'],
      ['ended', 'running'],
      ['ended', 'needs-input'],
      ['ended', 'idle'],
      ['ended', 'unreachable'],
      ['active', 'ended']
    ];
    for (const [lifecycle, stateFilter] of pairs) {
      s().patchSessionSheet({ lifecycle, stateFilter });
      expect(
        selectSheetView(s())?.visibleIds,
        `${lifecycle} × ${stateFilter}`
      ).toEqual([]);
      expect(
        selectSheetView(s())?.groups,
        `${lifecycle} × ${stateFilter}`
      ).toEqual([]);
    }
    // And the agreeing pairs draw the option's rows, not the segment's.
    s().patchSessionSheet({ lifecycle: 'active', stateFilter: 'unreachable' });
    expect(selectSheetView(s())?.visibleIds.sort()).toEqual([
      'closed:unknown',
      'open:unknown'
    ]);
    s().patchSessionSheet({ lifecycle: 'ended', stateFilter: 'ended' });
    expect(selectSheetView(s())?.visibleIds.sort()).toEqual([
      'closed:exited',
      'closed:restorable',
      'open:exited',
      'open:restorable'
    ]);
  });

  it('a discarded row that reached Managed is drawn under All and under NO segment', () => {
    s().patchSessionSheet({ lifecycle: 'all', stateFilter: 'all' });
    expect(selectSheetView(s())?.visibleIds).toContain('open:discarded');
    s().patchSessionSheet({ lifecycle: 'active' });
    expect(selectSheetView(s())?.visibleIds).not.toContain('open:discarded');
    s().patchSessionSheet({ lifecycle: 'ended' });
    expect(selectSheetView(s())?.visibleIds).not.toContain('open:discarded');
    // Under Active the two segments are a partition of the six: Active ∪ Ended = All − discarded.
    s().patchSessionSheet({ lifecycle: 'active' });
    const active = selectSheetView(s())?.visibleIds ?? [];
    s().patchSessionSheet({ lifecycle: 'ended' });
    const ended = selectSheetView(s())?.visibleIds ?? [];
    expect(active.filter((id) => ended.includes(id))).toEqual([]);
    expect([...active, ...ended].sort()).toEqual(
      MANAGED.filter((x) => x.status !== 'discarded')
        .map((x) => x.id)
        .sort()
    );
    expect(active).toHaveLength(8);
    expect(ended).toHaveLength(4);
  });

  it('with a batch RUNNING, a full selection is PRUNED to exactly the visible set on every combination', () => {
    const allOrder = selectSheetView(s())?.visibleIds ?? [];
    const keys = groupKeys();
    let pruned = 0;
    for (const f of combos()) {
      // Reset: All, check everything, then freeze a running batch so the
      // patch's own clear is off and only the engine's prune can act.
      useApp.setState({
        sessionSheet: {
          ...sheet(),
          search: '',
          project: 'all',
          tabFilter: 'all',
          stateFilter: 'all',
          lifecycle: 'all',
          batch: null,
          checked: {}
        }
      });
      expect(s().setSessionSheetChecked(allOrder, true)).toBe(true);
      expect(Object.keys(sheet().checked)).toHaveLength(14);
      useApp.setState({
        sessionSheet: {
          ...sheet(),
          batch: {
            runId: 1,
            phase: 'running',
            named: [],
            skippedAtOpen: { ended: 0, unreachable: 0 },
            targets: [],
            outcomes: {},
            stopRequested: false
          }
        }
      });
      s().patchSessionSheet({
        search: f.search,
        project:
          f.project === 'all'
            ? 'all'
            : f.project === 'open'
              ? keys.open
              : keys.closed,
        tabFilter: f.tabFilter,
        stateFilter: f.stateFilter,
        lifecycle: f.lifecycle
      });
      const want = expectedIds(allOrder, f);
      const checked = Object.keys(sheet().checked).sort();
      expect(checked, JSON.stringify(f)).toEqual([...want].sort());
      // and never a checked id the view does not draw
      const seen = new Set(selectSheetView(s())?.visibleIds ?? []);
      expect(
        checked.every((id) => seen.has(id)),
        JSON.stringify(f)
      ).toBe(true);
      if (checked.length < 14) pruned += 1;
    }
    expect(pruned).toBeGreaterThan(0);
  });

  it('a lifecycle change ALONE, with nothing else moving, prunes (the memo key carries the field)', () => {
    const allOrder = selectSheetView(s())?.visibleIds ?? [];
    expect(s().setSessionSheetChecked(allOrder, true)).toBe(true);
    useApp.setState({
      sessionSheet: {
        ...sheet(),
        batch: {
          runId: 1,
          phase: 'running',
          named: [],
          skippedAtOpen: { ended: 0, unreachable: 0 },
          targets: [],
          outcomes: {},
          stopRequested: false
        }
      }
    });
    s().patchSessionSheet({ lifecycle: 'ended' });
    expect(Object.keys(sheet().checked).sort()).toEqual([
      'closed:exited',
      'closed:restorable',
      'open:exited',
      'open:restorable'
    ]);
    s().patchSessionSheet({ lifecycle: 'active' });
    expect(Object.keys(sheet().checked)).toEqual([]);
  });

  it('on Past, a lifecycle value written through the store still draws the whole Past list, and the tab change resets it', () => {
    s().patchSessionSheet({ lifecycle: 'ended' });
    expect(sheet().lifecycle).toBe('ended');
    expect(s().setSessionSheetTab('past')).toBe(true);
    expect(sheet().lifecycle).toBe('all');
    expect(sheet().stateFilter).toBe('all');
    // Now write a segment on Past past the reset (nothing on the face can, but a store can).
    s().patchSessionSheet({ lifecycle: 'active' });
    expect(sheet().lifecycle).toBe('active');
    const view = selectSheetView(s());
    expect(view?.pastList?.map((e) => e.row.id)).toEqual([
      'past:1',
      'past:2',
      'past:3'
    ]);
    expect(view?.visibleIds).toEqual(['past:1', 'past:2', 'past:3']);
    s().patchSessionSheet({ lifecycle: 'ended' });
    expect(selectSheetView(s())?.visibleIds).toEqual([
      'past:1',
      'past:2',
      'past:3'
    ]);
    // Back to Managed: reset again, full list.
    expect(s().setSessionSheetTab('managed')).toBe(true);
    expect(sheet().lifecycle).toBe('all');
    expect(selectSheetView(s())?.visibleIds).toHaveLength(14);
  });

  it('executing statusVisual: the Active statuses drawn with the ended dot are exactly {unknown}', () => {
    const activeEnded = [...MY_ACTIVE].filter(
      (st) => statusVisual(st).dot === 'ended'
    );
    expect(activeEnded).toEqual(['unknown']);
    // and with a remote machine the answer does not move
    const remote = [...MY_ACTIVE].filter(
      (st) =>
        statusVisual(st, {
          machine: { id: 'm', label: 'M', canRestore: false }
        } as never).dot === 'ended'
    );
    expect(remote).toEqual(['unknown']);
    // an Ended status never draws a live dot
    for (const st of MY_ENDED)
      expect(['working', 'attention']).not.toContain(statusVisual(st).dot);
  });

  it('the row the projection hands the filter agrees with the hand tables for every status', () => {
    const rows = selectManageProjection(s()).managed.flatMap((g) => g.rows);
    expect(rows).toHaveLength(14);
    for (const row of rows) {
      expect(row.gates.live || row.gates.unknown, row.id).toBe(
        MY_ACTIVE.has(row.status)
      );
      expect(row.gates.ended, row.id).toBe(MY_ENDED.has(row.status));
    }
  });
});
