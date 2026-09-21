/**
 * Phase 293. The view: which rows the filters leave, in which order, and the
 * ids select-all and the batch may act on.
 *
 * What these tests hold:
 *  - the five controls combine with AND;
 *  - `Running` is THREE statuses, and `Working` is one of them;
 *  - the lifecycle control (Phase 303) reads `row.gates` and nothing else:
 *    Active is `live || unknown`, Ended is `ended`, and it ANDs with the state
 *    select rather than narrowing it, so a contradictory pair draws nothing;
 *  - sorting reorders rows INSIDE each group and never reorders groups, and a
 *    NULL SORTS LAST IN BOTH DIRECTIONS. The study sorts null as -1, which puts
 *    every shell first on an ascending Messages sort; that bug is not copied. A
 *    `createdAt` of 0 is such a null;
 *  - `visibleIds` under the `Running` filter is exactly the live rows, never
 *    contains `''`, and is in drawn order, because it is what select-all checks
 *    and what a batch is intersected with;
 *  - groups with no visible row are left out;
 *  - the select-all rule: nothing checked checks everything visible, anything
 *    checked CLEARS. An indeterminate click that selected everything would
 *    widen a batch a person had narrowed by hand.
 *
 * The rows are hand built, so the file needs no store. Each row's `gates` are
 * the SHIPPING `sessionActionGates` over its status (Phase 303), because the
 * lifecycle control reads them and a stub would test the stub.
 */

import { describe, expect, it } from 'vitest';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';
import { sessionActionGates } from '../../state/resume';
import type { ManageGroup, ManageRow } from '../projection';
import {
  DEFAULT_FILTERS,
  selectAllState,
  selectAllWrite,
  sortValue,
  stateFilterKeeps,
  visibleGroups,
  visibleIds,
  type ManageFilters
} from '../view';

function activity(
  user: number | null,
  agent: number | null,
  at: number | null
): OverviewSessionActivity {
  return {
    sessionId: 'x',
    coverage: user === null ? 'unavailable' : 'complete',
    reason: user === null ? 'not-yet' : null,
    userMessages: user,
    agentMessages: agent,
    lastMessageAt: at,
    lastMessageBy: at === null ? null : 'agent',
    lastMessageClock: at === null ? null : 'message',
    readAt: 1
  };
}

/** A remote row's machine: the gates read `remote` off its presence. */
const FAR: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: false,
  restoreReason: null
};

/** What the gates need beside the row. Nothing here decides the partition. */
const GATE_ENV = {
  canRestore: true,
  canDiscard: true,
  shellPathReady: true,
  handback: undefined
};

function row(
  id: string,
  status: SessionStatus,
  patch: {
    name?: string;
    createdAt?: number;
    label?: string;
    agent?: string;
    activity?: OverviewSessionActivity | null;
    searchText?: string;
    remote?: boolean;
  } = {}
): ManageRow {
  const session = {
    id,
    name: patch.name ?? id,
    agent: patch.agent ?? 'claude',
    status,
    createdAt: patch.createdAt ?? 1000,
    ...(patch.remote === true ? { machine: FAR } : {})
  } as Session;
  return {
    id,
    tab: 'managed',
    session,
    status,
    visual: { dot: 'idle', label: patch.label ?? status },
    groupKey: '',
    target: null,
    tabOpen: false,
    gates: sessionActionGates(session, status, GATE_ENV),
    primary: { verb: 'end', enabled: true, title: null },
    activity: patch.activity ?? null,
    restoring: false,
    searchText: patch.searchText ?? `${patch.name ?? id} Claude`
  };
}

function group(
  key: string,
  tabOpen: boolean,
  rows: ManageRow[],
  label = key
): ManageGroup {
  return {
    key,
    label,
    path: key,
    machineId: null,
    machineLabel: null,
    tabOpen,
    rows: rows.map((r) => ({ ...r, groupKey: key, tabOpen }))
  };
}

const filters = (patch: Partial<ManageFilters>): ManageFilters => ({
  ...DEFAULT_FILTERS,
  ...patch
});

const GROUPS: ManageGroup[] = [
  group('/w/open', true, [
    row('a', 'running', { searchText: 'fix-auth Claude open ~/w/open' }),
    row('b', 'exited', { searchText: 'docs Shell open ~/w/open' }),
    row('c', 'needs_input', { searchText: 'review Codex open ~/w/open' })
  ]),
  group('/w/closed', false, [
    row('d', 'idle', { searchText: 'fix-build Claude closed ~/w/closed' }),
    row('e', 'unknown', { searchText: 'far Claude closed /srv Studio' }),
    row('f', 'restorable', { searchText: 'saved Claude closed ~/w/closed' })
  ])
];

const idsOf = (groups: ManageGroup[]): string[][] =>
  groups.map((g) => g.rows.map((r) => r.id));

describe('the five filters combine with AND (Phase 293, SPEC 2.4; Phase 303)', () => {
  it('no filter keeps every row, in main’s order', () => {
    expect(idsOf(visibleGroups(GROUPS, DEFAULT_FILTERS, null))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f']
    ]);
  });

  it('search is a trimmed, case-blind substring over the row’s search text', () => {
    expect(
      idsOf(visibleGroups(GROUPS, filters({ search: '  FIX-  ' }), null))
    ).toEqual([['a'], ['d']]);
    expect(
      idsOf(visibleGroups(GROUPS, filters({ search: 'studio' }), null))
    ).toEqual([['e']]);
  });

  it('the project filter is a group key', () => {
    expect(
      idsOf(visibleGroups(GROUPS, filters({ project: '/w/closed' }), null))
    ).toEqual([['d', 'e', 'f']]);
  });

  it('the tab filter reads the group’s open tab', () => {
    expect(
      idsOf(visibleGroups(GROUPS, filters({ tabFilter: 'open' }), null))
    ).toEqual([['a', 'b', 'c']]);
    expect(
      idsOf(visibleGroups(GROUPS, filters({ tabFilter: 'closed' }), null))
    ).toEqual([['d', 'e', 'f']]);
  });

  it('the lifecycle control reads the row’s gates: Active is live or unknown, Ended is ended', () => {
    expect(
      idsOf(visibleGroups(GROUPS, filters({ lifecycle: 'active' }), null))
    ).toEqual([['a', 'c'], ['d', 'e']]);
    expect(
      idsOf(visibleGroups(GROUPS, filters({ lifecycle: 'ended' }), null))
    ).toEqual([['b'], ['f']]);
    // Every Managed row is in exactly one of the two.
    const active = visibleIds(visibleGroups(GROUPS, filters({ lifecycle: 'active' }), null));
    const ended = visibleIds(visibleGroups(GROUPS, filters({ lifecycle: 'ended' }), null));
    expect([...active, ...ended].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('all five at once keep only the rows every one of them keeps', () => {
    expect(
      idsOf(
        visibleGroups(
          GROUPS,
          {
            search: 'fix',
            project: '/w/closed',
            tabFilter: 'closed',
            stateFilter: 'running',
            lifecycle: 'active'
          },
          null
        )
      )
    ).toEqual([['d']]);
    // One of the five disagrees, and nothing is left.
    expect(
      visibleGroups(
        GROUPS,
        {
          search: 'fix',
          project: '/w/closed',
          tabFilter: 'open',
          stateFilter: 'running',
          lifecycle: 'active'
        },
        null
      )
    ).toEqual([]);
    expect(
      visibleGroups(
        GROUPS,
        {
          search: 'fix',
          project: '/w/closed',
          tabFilter: 'closed',
          stateFilter: 'running',
          lifecycle: 'ended'
        },
        null
      )
    ).toEqual([]);
  });

  it('a group with no visible row is left out', () => {
    const out = visibleGroups(GROUPS, filters({ stateFilter: 'unreachable' }), null);
    expect(out.map((g) => g.key)).toEqual(['/w/closed']);
  });

  it('a project key whose group is gone matches nothing, which is how the hook sees it', () => {
    expect(visibleGroups(GROUPS, filters({ project: '/w/gone' }), null)).toEqual(
      []
    );
  });
});

describe('the state filter’s table (Phase 293, SPEC 2.4)', () => {
  const ALL: SessionStatus[] = [
    'running',
    'idle',
    'needs_input',
    'exited',
    'restorable',
    'unknown',
    'discarded'
  ];
  const kept = (f: ManageFilters['stateFilter']): SessionStatus[] =>
    ALL.filter((status) => stateFilterKeeps(f, status));

  it('Running is THREE statuses', () => {
    expect(kept('running')).toEqual(['running', 'idle', 'needs_input']);
  });

  it('the rest of the table', () => {
    expect(kept('all')).toEqual(ALL);
    expect(kept('working')).toEqual(['running']);
    expect(kept('needs-input')).toEqual(['needs_input']);
    expect(kept('idle')).toEqual(['idle']);
    expect(kept('ended')).toEqual(['exited', 'restorable']);
    expect(kept('unreachable')).toEqual(['unknown']);
  });

  it('visibleIds under Running is exactly the live rows, in drawn order', () => {
    const out = visibleGroups(GROUPS, filters({ stateFilter: 'running' }), null);
    expect(visibleIds(out)).toEqual(['a', 'c', 'd']);
  });
});

describe('the lifecycle control’s table (Phase 303)', () => {
  const under = (patch: Partial<ManageFilters>): string[] =>
    visibleIds(visibleGroups(GROUPS, filters(patch), null));

  it('Active is the four statuses End refuses to remove, Unreachable among them', () => {
    // `e` is `unknown`: alive as far as Tortie knows, and Restore never acts
    // on it, so it is Active and never Ended.
    expect(under({ lifecycle: 'active' })).toEqual(['a', 'c', 'd', 'e']);
  });

  it('Ended is the two statuses Restore acts on', () => {
    expect(under({ lifecycle: 'ended' })).toEqual(['b', 'f']);
  });

  it('All is every row, byte for byte what no control draws', () => {
    expect(under({ lifecycle: 'all' })).toEqual(under({}));
  });

  it('visibleIds under Active is in drawn order', () => {
    const out = visibleGroups(GROUPS, filters({ lifecycle: 'active' }), null);
    expect(out.map((g) => g.key)).toEqual(['/w/open', '/w/closed']);
    expect(idsOf(out)).toEqual([['a', 'c'], ['d', 'e']]);
  });

  it('the two controls AND, and no option is narrowed or coerced', () => {
    // Every state option still keeps what it keeps under All.
    for (const state of ['running', 'working', 'needs-input', 'idle', 'ended', 'unreachable'] as const) {
      expect(under({ lifecycle: 'all', stateFilter: state }), state).toEqual(
        under({ stateFilter: state })
      );
    }
    // Agreeing pairs are the intersection.
    expect(under({ lifecycle: 'active', stateFilter: 'running' })).toEqual(['a', 'c', 'd']);
    expect(under({ lifecycle: 'active', stateFilter: 'unreachable' })).toEqual(['e']);
    expect(under({ lifecycle: 'ended', stateFilter: 'ended' })).toEqual(['b', 'f']);
    // Contradictory pairs draw nothing, and are left to the empty state
    // rather than engineered away: a narrowing rule would be a second table.
    expect(under({ lifecycle: 'ended', stateFilter: 'running' })).toEqual([]);
    expect(under({ lifecycle: 'ended', stateFilter: 'working' })).toEqual([]);
    expect(under({ lifecycle: 'ended', stateFilter: 'unreachable' })).toEqual([]);
    expect(under({ lifecycle: 'active', stateFilter: 'ended' })).toEqual([]);
  });

  it('a group with no Ended row is left out', () => {
    const only = [group('/w/live', true, [row('x', 'running'), row('y', 'idle')])];
    expect(visibleGroups(only, filters({ lifecycle: 'ended' }), null)).toEqual([]);
  });
});

describe('sort is inside groups, and null is LAST both ways (Phase 293, SPEC 2.5)', () => {
  const sortable: ManageGroup[] = [
    group('/g1', true, [
      row('shell', 'idle', { name: 'm-shell', agent: 'shell', createdAt: 300 }),
      row('big', 'running', {
        name: 'a-big',
        createdAt: 100,
        activity: activity(40, 38, 9000)
      }),
      row('zero', 'idle', {
        name: 'z-zero',
        createdAt: 0,
        activity: activity(0, 0, null)
      }),
      row('small', 'exited', {
        name: 'b-small',
        createdAt: 200,
        activity: activity(2, 1, 5000)
      })
    ]),
    group('/g2', false, [
      row('y', 'running', { name: 'y', createdAt: 50 }),
      row('x', 'running', { name: 'x', createdAt: 60 })
    ])
  ];

  it('nothing sorted keeps main’s order', () => {
    expect(idsOf(visibleGroups(sortable, DEFAULT_FILTERS, null))).toEqual([
      ['shell', 'big', 'zero', 'small'],
      ['y', 'x']
    ]);
  });

  it('groups NEVER reorder, whatever the rows do', () => {
    const asc = visibleGroups(sortable, DEFAULT_FILTERS, { key: 'name', dir: 1 });
    const desc = visibleGroups(sortable, DEFAULT_FILTERS, {
      key: 'name',
      dir: -1
    });
    expect(asc.map((g) => g.key)).toEqual(['/g1', '/g2']);
    expect(desc.map((g) => g.key)).toEqual(['/g1', '/g2']);
    expect(idsOf(asc)).toEqual([
      ['big', 'small', 'shell', 'zero'],
      ['x', 'y']
    ]);
    expect(idsOf(desc)).toEqual([
      ['zero', 'shell', 'small', 'big'],
      ['y', 'x']
    ]);
  });

  it('Messages: a row with no count sorts LAST ascending', () => {
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, { key: 'messages', dir: 1 })
      )[0]
    ).toEqual(['zero', 'small', 'big', 'shell']);
  });

  it('Messages: and LAST descending too, never first', () => {
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, { key: 'messages', dir: -1 })
      )[0]
    ).toEqual(['big', 'small', 'zero', 'shell']);
  });

  it('Created: a createdAt of 0 is a null, last both ways', () => {
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, { key: 'created', dir: 1 })
      )[0]
    ).toEqual(['big', 'small', 'shell', 'zero']);
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, { key: 'created', dir: -1 })
      )[0]
    ).toEqual(['shell', 'small', 'big', 'zero']);
  });

  it('Last message: no time is a null, last both ways, in main’s order among themselves', () => {
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, {
          key: 'last-message',
          dir: 1
        })
      )[0]
    ).toEqual(['small', 'big', 'shell', 'zero']);
    expect(
      idsOf(
        visibleGroups(sortable, DEFAULT_FILTERS, {
          key: 'last-message',
          dir: -1
        })
      )[0]
    ).toEqual(['big', 'small', 'shell', 'zero']);
  });

  it('State sorts by the DRAWN label, first letter raised', () => {
    const states = [
      group('/s', true, [
        row('1', 'running', { label: 'working' }),
        row('2', 'exited', { label: 'ended' }),
        row('3', 'needs_input', { label: 'needs input' })
      ])
    ];
    expect(
      idsOf(visibleGroups(states, DEFAULT_FILTERS, { key: 'state', dir: 1 }))[0]
    ).toEqual(['2', '3', '1']);
  });

  it('the sort values: a number, a string, or null, and never a guess', () => {
    const big = sortable[0]?.rows[1] as ManageRow;
    const shell = sortable[0]?.rows[0] as ManageRow;
    const zero = sortable[0]?.rows[2] as ManageRow;
    expect(sortValue(big, 'messages')).toBe(78);
    expect(sortValue(shell, 'messages')).toBeNull();
    expect(sortValue(zero, 'messages')).toBe(0);
    expect(sortValue(zero, 'created')).toBeNull();
    expect(sortValue(big, 'created')).toBe(100);
    expect(sortValue(zero, 'last-message')).toBeNull();
    expect(sortValue(big, 'name')).toBe('a-big');
    // A reply count that is not recorded sorts by the asks that are.
    const asks = row('g', 'idle', { activity: activity(7, null, null) });
    expect(sortValue(asks, 'messages')).toBe(7);
    // A remote row never has a count, whatever an answer says.
    const far = row('r', 'idle', { activity: activity(3, 3, 1), remote: true });
    expect(sortValue(far, 'messages')).toBeNull();
  });

  it('sorting filters nothing and loses no row', () => {
    const out = visibleGroups(sortable, DEFAULT_FILTERS, {
      key: 'messages',
      dir: -1
    });
    expect(visibleIds(out).sort()).toEqual(
      ['big', 'shell', 'small', 'x', 'y', 'zero'].sort()
    );
  });

  it('does not reorder the projection it was handed', () => {
    visibleGroups(sortable, DEFAULT_FILTERS, { key: 'name', dir: -1 });
    expect(sortable[0]?.rows.map((r) => r.id)).toEqual([
      'shell',
      'big',
      'zero',
      'small'
    ]);
  });
});

describe('visibleIds and select-all (Phase 293, SPEC 2.10)', () => {
  it('never contains an empty id', () => {
    const planted = [group('/p', true, [row('', 'running'), row('ok', 'running')])];
    expect(visibleIds(planted)).toEqual(['ok']);
  });

  it('select-all reads unchecked, indeterminate or checked from the VISIBLE rows', () => {
    const visible = ['a', 'b', 'c'];
    expect(selectAllState(visible, {})).toBe('none');
    expect(selectAllState(visible, { a: true })).toBe('some');
    expect(selectAllState(visible, { a: true, b: true, c: true })).toBe('all');
    expect(selectAllState([], {})).toBe('none');
  });

  it('a click with NOTHING checked checks every visible row, by id', () => {
    expect(selectAllWrite(['a', 'b'], {})).toEqual({ ids: ['a', 'b'], on: true });
  });

  it('a click with SOME checked clears, and never widens the selection', () => {
    expect(selectAllWrite(['a', 'b', 'c'], { b: true })).toEqual({
      ids: ['b'],
      on: false
    });
  });

  it('a click with ALL checked clears', () => {
    expect(selectAllWrite(['a', 'b'], { a: true, b: true })).toEqual({
      ids: ['a', 'b'],
      on: false
    });
  });

  it('select-all is over the FILTERED rows, never the whole list', () => {
    const out = visibleGroups(GROUPS, filters({ stateFilter: 'running' }), null);
    const write = selectAllWrite(visibleIds(out), {});
    expect(write).toEqual({ ids: ['a', 'c', 'd'], on: true });
    expect(write.ids).not.toContain('b');
    expect(write.ids).not.toContain('e');
  });
});
