/**
 * Phase 293. The projection: what the sheet DRAWS, from the store's own lists.
 *
 * What these tests hold:
 *  - GROUPING IS BY WORKSPACE TARGET, machine identity included, and never by
 *    basename. Two folders with one basename on two machines are two groups,
 *    and one path spelled the same on this Mac and on a machine is two groups;
 *  - a closed tab filters NOTHING out: a session whose project has no tab is
 *    drawn, under a group the projection derives from the session itself;
 *  - a Past row whose machine a person removed keys under `!gone:` and carries
 *    no target, so nothing can try to open it anywhere;
 *  - the label falls through its three sources, and the machine label through
 *    its three;
 *  - groups with an open tab come first in the tabs' own order, then closed
 *    groups by label, and rows keep main's order;
 *  - the Past tab is ONE list in main's removal order, copied and never
 *    re-sorted, and groups only when the project filter names one project
 *    (the operator's ruling, 2026-09-19);
 *  - the visible button is the policy's own gates (SPEC 2.7), row by row;
 *  - a row with an empty id is drawn with no button, and is never a target;
 *  - the file case-folds no path, normalises no path, and the domain imports
 *    nothing from diagnostics (source-text pins).
 *
 * The gates are the SHIPPING `sessionActionGates` from ../../state/resume.ts.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { MachineStateView } from '@shared/ipc';
import type {
  Project,
  Session,
  SessionMachine,
  SessionStatus
} from '@shared/types';
import type { AppState } from '../../state/app-state';

// `statusVisual` lives in ../../app/status.ts, which reads status through the
// store, and importing the store builds its initial state against window.gmux.
// These globals make that import inert in a node environment.
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
  removeEventListener() {}
});

const { buildManageProjection } = await import('../projection');
const { visibleIds } = await import('../view');
const { selectSheetView } = await import('../use-sheet-refresh');
const copy = await import('../copy');
const {
  restoreActionCopy,
  restoreExitedCopy,
  SHELL_PATH_PENDING_TITLE
} = await import('../../state/resume');
// Phase 298, rough edge 4: the sheet's own refusal, which names NO machine.
// Settings keeps `machines-copy.ts`'s two-sentence form, which names it; the
// row had already named it twice — in `tombstoneLine` and in the name line's
// badge — so the sheet reads its own shorter sentence and the button's hover
// and the row's note draw that one string.

type Input = Parameters<typeof buildManageProjection>[0];

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

let seq = 0;
function session(patch: Partial<Session> & { id?: string }): Session {
  seq += 1;
  const id = patch.id ?? `s${String(seq)}`;
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/Users/me/src/gmux',
    cwd: '/Users/me/src/gmux',
    agent: 'claude',
    status: 'running',
    createdAt: 1_700_000_000_000,
    ...patch
  };
}

function input(patch: Partial<Input>): Input {
  return {
    sessions: [],
    pastSessions: [],
    projects: [],
    machineStates: [],
    handbacks: {},
    activity: {},
    restoringIds: {},
    shellPathReady: true,
    canRestore: true,
    canDiscard: true,
    ...patch
  };
}

const project = (path: string, name: string, machineId?: string): Project => ({
  id: `p:${machineId ?? 'local'}:${path}`,
  path,
  name,
  ...(machineId === undefined ? {} : { machineId })
});

describe('grouping is by workspace target (Phase 293, SPEC 3.2)', () => {
  it('two folders with ONE BASENAME on two machines are two groups', () => {
    const out = buildManageProjection(
      input({
        sessions: [
          session({ id: 'a', projectPath: '/Users/me/src/api' }),
          session({ id: 'b', projectPath: '/srv/work/api', machine: STUDIO })
        ]
      })
    );
    expect(out.managed.map((g) => g.key)).toEqual([
      '/Users/me/src/api',
      'studio:/srv/work/api'
    ]);
    expect(out.managed.map((g) => g.label)).toEqual(['api', 'api']);
    expect(out.managed.map((g) => g.rows.map((r) => r.id))).toEqual([
      ['a'],
      ['b']
    ]);
  });

  it('two folders with one basename on THIS Mac are two groups too', () => {
    const out = buildManageProjection(
      input({
        sessions: [
          session({ id: 'a', projectPath: '/Users/me/one/api' }),
          session({ id: 'b', projectPath: '/Users/me/two/api' })
        ]
      })
    );
    expect(out.managed.length).toBe(2);
    expect(new Set(out.managed.map((g) => g.key)).size).toBe(2);
  });

  it('ONE PATH spelled the same on this Mac and on a machine is two groups', () => {
    const path = '/Users/me/src/gmux';
    const out = buildManageProjection(
      input({
        sessions: [
          session({ id: 'here', projectPath: path }),
          session({ id: 'there', projectPath: path, machine: STUDIO }),
          session({ id: 'here2', projectPath: path })
        ]
      })
    );
    expect(out.managed.map((g) => [g.key, g.machineId])).toEqual([
      [path, null],
      [`studio:${path}`, 'studio']
    ]);
    expect(out.managed[0]?.rows.map((r) => r.id)).toEqual(['here', 'here2']);
    expect(out.managed[1]?.rows.map((r) => r.id)).toEqual(['there']);
  });

  it('never merges two spellings main stored as two: case and normalisation stay apart', () => {
    const out = buildManageProjection(
      input({
        sessions: [
          session({ id: 'a', projectPath: '/Users/me/Source' }),
          session({ id: 'b', projectPath: '/Users/me/source' }),
          session({ id: 'c', projectPath: '/Users/me/café' }),
          session({ id: 'd', projectPath: '/Users/me/café' })
        ]
      })
    );
    expect(out.managed.length).toBe(4);
  });

  it('a closed tab filters NOTHING out, and says so on the group', () => {
    const out = buildManageProjection(
      input({
        projects: [project('/Users/me/src/open', 'open')],
        sessions: [
          session({ id: 'a', projectPath: '/Users/me/src/open' }),
          session({ id: 'b', projectPath: '/Users/me/src/closed' })
        ]
      })
    );
    expect(out.managedTotal).toBe(2);
    expect(out.managed.map((g) => [g.label, g.tabOpen])).toEqual([
      ['open', true],
      ['closed', false]
    ]);
    expect(out.managed[1]?.rows[0]?.tabOpen).toBe(false);
  });

  it('works with no project open at all', () => {
    const out = buildManageProjection(
      input({ sessions: [session({ id: 'a' }), session({ id: 'b' })] })
    );
    expect(out.managed.length).toBe(1);
    expect(out.managed[0]?.tabOpen).toBe(false);
    expect(out.managed[0]?.rows.length).toBe(2);
  });

  it('a local tab does not open a remote group with the same path', () => {
    const path = '/Users/me/src/gmux';
    const out = buildManageProjection(
      input({
        projects: [project(path, 'gmux')],
        sessions: [session({ id: 'there', projectPath: path, machine: STUDIO })]
      })
    );
    expect(out.managed[0]?.tabOpen).toBe(false);
    const remoteOpen = buildManageProjection(
      input({
        projects: [project(path, 'gmux', 'studio')],
        sessions: [session({ id: 'there', projectPath: path, machine: STUDIO })]
      })
    );
    expect(remoteOpen.managed[0]?.tabOpen).toBe(true);
  });

  it('a machine-removed past row keys under !gone:, carries no target and is always closed', () => {
    const gone = session({
      id: 'g',
      status: 'discarded',
      projectPath: '/srv/work/api',
      removedAt: 5,
      machineGone: {
        label: 'Old Mini',
        lastStatus: 'running',
        lastSeenAt: 4,
        forgottenAt: 5
      }
    });
    const out = buildManageProjection(
      input({
        projects: [project('/srv/work/api', 'api')],
        pastSessions: [gone]
      })
    );
    const group = out.past[0];
    expect(group?.key).toBe('!gone:Old Mini:/srv/work/api');
    expect(group?.tabOpen).toBe(false);
    expect(group?.machineId).toBeNull();
    expect(group?.machineLabel).toBe('Old Mini');
    expect(group?.rows[0]?.target).toBeNull();
    expect(group?.rows[0]?.tab).toBe('past');
  });

  it('a removed row on a machine that is STILL registered groups under that machine', () => {
    const out = buildManageProjection(
      input({
        pastSessions: [
          session({
            id: 'r',
            status: 'discarded',
            projectPath: '/srv/work/api',
            removedAt: 5,
            machine: STUDIO
          })
        ]
      })
    );
    expect(out.past[0]?.key).toBe('studio:/srv/work/api');
    expect(out.past[0]?.rows[0]?.target).toEqual({
      machineId: 'studio',
      path: '/srv/work/api'
    });
  });
});

describe('labels, order and totals (Phase 293, SPEC 3.2)', () => {
  it('the label falls through the open tab, the closed tab’s record, then the folder name', () => {
    const out = buildManageProjection(
      input({
        projects: [project('/w/one', 'One Renamed')],
        sessions: [
          session({ id: 'a', projectPath: '/w/one' }),
          session({
            id: 'b',
            projectPath: '/w/two',
            closedProject: { name: 'Two As Closed', path: '/w/two', closedAt: 1 }
          }),
          session({ id: 'c', projectPath: '/w/three' })
        ]
      })
    );
    expect(out.managed.map((g) => g.label)).toEqual([
      'One Renamed',
      'three',
      'Two As Closed'
    ]);
  });

  it('a later row’s closed-tab record still names the group', () => {
    const out = buildManageProjection(
      input({
        sessions: [
          session({ id: 'a', projectPath: '/w/two' }),
          session({
            id: 'b',
            projectPath: '/w/two',
            closedProject: { name: 'Two', path: '/w/two', closedAt: 1 }
          })
        ]
      })
    );
    expect(out.managed[0]?.label).toBe('Two');
  });

  it('the machine label falls through the row, the machines list, then the tombstone', () => {
    const states = [
      { id: 'mini', label: 'Mini From List' }
    ] as unknown as MachineStateView[];
    const out = buildManageProjection(
      input({
        machineStates: states,
        sessions: [
          session({ id: 'a', projectPath: '/a', machine: STUDIO }),
          session({
            id: 'b',
            projectPath: '/b',
            machine: { ...STUDIO, id: 'mini', label: '' }
          }),
          session({ id: 'c', projectPath: '/c' })
        ]
      })
    );
    const byKey = new Map(out.managed.map((g) => [g.key, g.machineLabel]));
    expect(byKey.get('studio:/a')).toBe('Studio');
    expect(byKey.get('mini:/b')).toBe('Mini From List');
    expect(byKey.get('/c')).toBeNull();
  });

  it('open groups first in the TABS’ order, then closed groups by label, ties by key', () => {
    const out = buildManageProjection(
      input({
        projects: [project('/w/zeta', 'zeta'), project('/w/alpha', 'alpha')],
        sessions: [
          session({ id: '1', projectPath: '/w/mid' }),
          session({ id: '2', projectPath: '/w/alpha' }),
          session({ id: '3', projectPath: '/x/same' }),
          session({ id: '4', projectPath: '/w/zeta' }),
          session({ id: '5', projectPath: '/a/same' })
        ]
      })
    );
    expect(out.managed.map((g) => g.key)).toEqual([
      '/w/zeta',
      '/w/alpha',
      '/w/mid',
      '/a/same',
      '/x/same'
    ]);
  });

  it('rows keep the incoming order inside a group', () => {
    const out = buildManageProjection(
      input({
        sessions: ['c', 'a', 'b'].map((id) =>
          session({ id, createdAt: id.charCodeAt(0) })
        )
      })
    );
    expect(out.managed[0]?.rows.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('the totals are whole-tab totals', () => {
    const out = buildManageProjection(
      input({
        sessions: [session({}), session({}), session({})],
        pastSessions: [session({ status: 'discarded' })]
      })
    );
    expect(out.managedTotal).toBe(3);
    expect(out.pastTotal).toBe(1);
  });

  it('the search text is the name, the agent, the group, the path and the machine', () => {
    const out = buildManageProjection(
      input({
        sessions: [
          session({
            id: 'a',
            name: 'fix-auth',
            agent: 'codex',
            projectPath: '/srv/work/api',
            cwd: '/srv/work/api',
            machine: STUDIO
          })
        ]
      })
    );
    expect(out.managed[0]?.rows[0]?.searchText).toBe(
      'fix-auth Codex api /srv/work/api /srv/work/api Studio'
    );
  });

  it('the stored path is searchable as main stored it, not only as drawn (the fix round, W4)', () => {
    // Today's Past Sessions matched a pasted absolute path, and a user name,
    // for every project under /Users/<name>/. The drawn form there is `~/…`,
    // so the first build found nothing for either.
    const home = '/Users/somebody';
    const out = buildManageProjection(
      input({
        pastSessions: [
          session({
            id: 'p',
            name: 'fix-auth',
            status: 'discarded',
            removedAt: 5,
            projectPath: `${home}/code/api`,
            cwd: `${home}/code/api-wt`
          })
        ]
      })
    );
    const text = out.past[0]?.rows[0]?.searchText ?? '';
    expect(text).toContain(`${home}/code/api`);
    // The session's OWN folder, a worktree, is searchable too.
    expect(text).toContain(`${home}/code/api-wt`);
    expect(text.toLowerCase()).toContain('somebody');
  });

  it('Past rows keep main’s order inside a group, and Past groups take the Managed order, which the project filter lists', () => {
    // The Past tab draws ONE list under All (the describe below); its groups
    // are what the project filter offers and what one project draws under.
    const removed = (id: string, path: string, at: number): Session =>
      session({ id, status: 'discarded', removedAt: at, projectPath: path, cwd: path });
    const out = buildManageProjection(
      input({
        projects: [project('/w/y', 'y')],
        pastSessions: [
          removed('x1', '/w/x', 90),
          removed('y1', '/w/y', 80),
          removed('x2', '/w/x', 70),
          removed('none', '/w/z', 0)
        ]
      })
    );
    expect(out.past.map((g) => [g.key, g.rows.map((r) => r.id)])).toEqual([
      ['/w/y', ['y1']],
      ['/w/x', ['x1', 'x2']],
      ['/w/z', ['none']]
    ]);
    expect(out.pastRows.map((r) => r.id)).toEqual(['x1', 'y1', 'x2', 'none']);
    // The single list holds the SAME row objects the groups hold.
    expect(out.pastRows[0]).toBe(out.past[1]?.rows[0]);
  });

  it('the Managed tab keeps its order: open tabs first, then closed by label', () => {
    const out = buildManageProjection(
      input({
        projects: [{ id: 'pz', path: '/w/zzz', name: 'zzz' }],
        sessions: [
          session({ id: 'a', projectPath: '/w/aaa', cwd: '/w/aaa', createdAt: 9 }),
          session({ id: 'z', projectPath: '/w/zzz', cwd: '/w/zzz', createdAt: 1 })
        ]
      })
    );
    expect(out.managed.map((g) => g.key)).toEqual(['/w/zzz', '/w/aaa']);
  });

  it('a restoring row is marked, whatever its status reads', () => {
    const out = buildManageProjection(
      input({
        sessions: [session({ id: 'a', status: 'running' })],
        restoringIds: { a: true }
      })
    );
    expect(out.managed[0]?.rows[0]?.restoring).toBe(true);
  });

  it('carries the activity answer by id, and null before it', () => {
    const answer = copy.remoteActivity('a');
    const out = buildManageProjection(
      input({
        sessions: [session({ id: 'a' }), session({ id: 'b' })],
        activity: { a: answer }
      })
    );
    expect(out.managed[0]?.rows[0]?.activity).toBe(answer);
    expect(out.managed[0]?.rows[1]?.activity).toBeNull();
  });
});

describe('the Past tab is ONE list in main’s removal order (the operator’s ruling, 2026-09-19)', () => {
  // Option A. Today's Past Sessions is one list, newest removal first, exactly
  // as main answers it, and finding the session you just removed by mistake is
  // what it is for. The reverify found the fix round's group ordering kept only
  // the NEWEST removal on top: removals that alternate between projects moved
  // the second newest from row 2 to row 4 live, and to row 22 of 22 with twenty
  // older removals in the other project. These read what the sheet draws, through
  // the selector the sheet itself reads (`selectSheetView`).
  const removed = (
    id: string,
    path: string,
    at: number,
    cwd: string = path
  ): Session =>
    session({ id, status: 'discarded', removedAt: at, projectPath: path, cwd });

  const alpha = project('/w/alpha', 'alpha');
  const beta = project('/w/beta', 'beta');

  function pastView(
    pastSessions: Session[],
    sheet: Record<string, unknown> = {}
  ): NonNullable<ReturnType<typeof selectSheetView>> {
    const state = {
      sessions: [],
      pastSessions,
      projects: [alpha, beta],
      tabOrder: [],
      machineStates: [],
      handbacks: {},
      restoringIds: {},
      shellPathReady: true,
      canRestore: () => true,
      canDiscard: () => true,
      sessionSheet: {
        tab: 'past',
        search: '',
        project: 'all',
        tabFilter: 'all',
        stateFilter: 'all',
        sort: null,
        checked: {},
        inline: null,
        batch: null,
        listError: null,
        activity: {},
        ...sheet
      }
    } as unknown as AppState;
    const view = selectSheetView(state);
    if (view === null) throw new Error('the sheet is open, so there is a view');
    return view;
  }

  // The no-regression verifier's scenario X5, as main answered it: ax2, bx1,
  // ax1 and wt1 removed newest first, alternating between alpha and beta, wt1 a
  // worktree of alpha, and d1 removed earlier from delta, whose tab is closed.
  const X5 = (): Session[] => [
    removed('ax2', '/w/alpha', 40),
    removed('bx1', '/w/beta', 30),
    removed('ax1', '/w/alpha', 20),
    removed('wt1', '/w/alpha', 10, '/w/alpha-wt'),
    removed('d1', '/w/delta', 5)
  ];
  const MAIN_ORDER = ['ax2', 'bx1', 'ax1', 'wt1', 'd1'];

  it('draws removals that alternate between projects in main’s order, as ONE list (X5)', () => {
    const view = pastView(X5());
    expect(view.pastList?.map((entry) => entry.row.id)).toEqual(MAIN_ORDER);
    expect(view.visibleIds).toEqual(MAIN_ORDER);
    // Each row still knows its project, which its small line says.
    expect(view.pastList?.map((entry) => entry.group.label)).toEqual([
      'alpha',
      'beta',
      'alpha',
      'alpha',
      'delta'
    ]);
  });

  it('keeps main’s order under a search, across projects', () => {
    const byName = pastView(X5(), { search: 'x' });
    expect(byName.pastList?.map((entry) => entry.row.id)).toEqual([
      'ax2',
      'bx1',
      'ax1'
    ]);
    expect(byName.visibleIds).toEqual(['ax2', 'bx1', 'ax1']);
    const byProject = pastView(X5(), { search: 'alpha' });
    expect(byProject.visibleIds).toEqual(['ax2', 'ax1', 'wt1']);
  });

  it('the second newest removal is row 2, whatever lies below it (twenty older removals in another project)', () => {
    const past = [
      removed('A-newest', '/w/alpha', 1000),
      removed('B-second', '/w/beta', 990)
    ];
    for (let i = 20; i >= 1; i -= 1) {
      past.push(removed(`A-old-${String(i)}`, '/w/alpha', i));
    }
    const view = pastView(past);
    expect(view.visibleIds).toEqual(past.map((one) => one.id));
    expect(view.visibleIds.indexOf('B-second')).toBe(1);
    expect(view.pastList?.length).toBe(22);
  });

  it('groups ONLY when the project filter names one project: that project’s rows, in main’s order, under its head', () => {
    const view = pastView(X5(), { project: '/w/alpha' });
    expect(view.pastList).toBeNull();
    expect(view.groups.map((g) => [g.key, g.rows.map((r) => r.id)])).toEqual([
      ['/w/alpha', ['ax2', 'ax1', 'wt1']]
    ]);
    expect(view.visibleIds).toEqual(['ax2', 'ax1', 'wt1']);
    const searched = pastView(X5(), { project: '/w/alpha', search: 'ax' });
    expect(searched.pastList).toBeNull();
    expect(searched.visibleIds).toEqual(['ax2', 'ax1']);
  });

  it('draws main’s order as it came, and never sorts it again (the order is copied, not re-derived)', () => {
    // Main sorts; the renderer keeps what it was handed, as today's panel did.
    // A list whose times disagree with its order proves nothing re-sorts it.
    const handed = [
      removed('q1', '/w/alpha', 10),
      removed('q2', '/w/beta', 90),
      removed('q3', '/w/alpha', 50)
    ];
    const out = buildManageProjection(input({ pastSessions: handed }));
    expect(out.pastRows.map((row) => row.id)).toEqual(['q1', 'q2', 'q3']);
    expect(pastView(handed).visibleIds).toEqual(['q1', 'q2', 'q3']);
  });
});

describe('the visible button, row by row (Phase 293, SPEC 2.7)', () => {
  function primaryOf(one: Session, patch: Partial<Input> = {}): unknown {
    const past = one.status === 'discarded';
    const out = buildManageProjection(
      input({ ...(past ? { pastSessions: [one] } : { sessions: [one] }), ...patch })
    );
    return (past ? out.past : out.managed)[0]?.rows[0]?.primary;
  }

  it.each(['running', 'needs_input', 'idle'] as const)(
    'a %s row ends',
    (status) => {
      expect(primaryOf(session({ status }))).toEqual({
        verb: 'end',
        enabled: true,
        title: null
      });
    }
  );

  it('an unreachable row offers End DISABLED, with the reason', () => {
    expect(primaryOf(session({ status: 'unknown' }))).toEqual({
      verb: 'end',
      enabled: false,
      title: copy.END_UNREACHABLE_TITLE
    });
  });

  it('a restorable row restores, under the shipped sentence', () => {
    const one = session({ status: 'restorable' });
    expect(primaryOf(one)).toEqual({
      verb: 'restore',
      enabled: true,
      title: restoreActionCopy(one),
      busy: false
    });
  });

  it('an exited row WITH material restores, under its own shipped sentence', () => {
    const one = session({ status: 'exited', hasSavedScrollback: true });
    expect(primaryOf(one)).toEqual({
      verb: 'restore',
      enabled: true,
      title: restoreExitedCopy(one),
      busy: false
    });
  });

  it('an exited row with NOTHING saved offers Restore disabled, with the reason', () => {
    expect(primaryOf(session({ status: 'exited' }))).toEqual({
      verb: 'restore',
      enabled: false,
      title: copy.NOTHING_TO_RESTORE_TITLE,
      busy: false
    });
  });

  it('Restore waits for the login shell, and says so', () => {
    expect(
      primaryOf(session({ status: 'restorable' }), { shellPathReady: false })
    ).toEqual({
      verb: 'restore',
      enabled: false,
      title: SHELL_PATH_PENDING_TITLE,
      busy: false
    });
  });

  it('a restoring row reads busy and is disabled', () => {
    const one = session({ id: 'busy', status: 'restorable' });
    expect(primaryOf(one, { restoringIds: { busy: true } })).toMatchObject({
      verb: 'restore',
      enabled: false,
      busy: true
    });
  });

  it('a remote ended row reads ONE fact, and carries no title when it may restore', () => {
    expect(
      primaryOf(session({ status: 'restorable', machine: STUDIO }))
    ).toEqual({ verb: 'restore', enabled: true, title: null, busy: false });
  });

  it('a remote ended row that may not restore says main’s own reason', () => {
    const refused: SessionMachine = {
      ...STUDIO,
      canRestore: false,
      restoreReason: 'Studio no longer lists this session.'
    };
    expect(primaryOf(session({ status: 'exited', machine: refused }))).toEqual({
      verb: 'restore',
      enabled: false,
      title: 'Studio no longer lists this session.',
      busy: false
    });
  });

  it('a past row restores', () => {
    expect(primaryOf(session({ status: 'discarded', removedAt: 1 }))).toEqual({
      verb: 'restore',
      enabled: true,
      title: null,
      busy: false
    });
  });

  it('a past row whose machine was removed offers Restore disabled, with the tombstone’s sentence', () => {
    const one = session({
      status: 'discarded',
      removedAt: 1,
      machineGone: {
        label: 'Old Mini',
        lastStatus: 'idle',
        lastSeenAt: 1,
        forgottenAt: 2
      }
    });
    expect(primaryOf(one)).toEqual({
      verb: 'restore',
      enabled: false,
      title: copy.TOMBSTONE_RESTORE_REFUSED,
      busy: false
    });
  });

  it('a past row waits for the login shell too', () => {
    expect(
      primaryOf(session({ status: 'discarded', removedAt: 1 }), {
        shellPathReady: false
      })
    ).toMatchObject({ enabled: false, title: SHELL_PATH_PENDING_TITLE });
  });

  it('the button is the gates’ answer: a build that cannot restore enables nothing', () => {
    expect(
      primaryOf(session({ status: 'restorable' }), { canRestore: false })
    ).toMatchObject({ verb: 'restore', enabled: false });
    expect(
      primaryOf(session({ status: 'discarded', removedAt: 1 }), {
        canRestore: false
      })
    ).toMatchObject({ verb: 'restore', enabled: false });
  });

  it('every status has a row, a status and a visual', () => {
    const statuses: SessionStatus[] = [
      'running',
      'idle',
      'needs_input',
      'exited',
      'restorable',
      'unknown'
    ];
    const out = buildManageProjection(
      input({ sessions: statuses.map((status) => session({ status })) })
    );
    const rows = out.managed.flatMap((g) => g.rows);
    expect(rows.map((r) => r.status)).toEqual(statuses);
    expect(rows.map((r) => r.visual.label)).toEqual([
      'working',
      'idle',
      'needs input',
      'ended',
      'saved',
      'unreachable'
    ]);
  });
});

describe('nothing without a session id is ever a target (Phase 293, SPEC 2.7)', () => {
  it('a row with an empty id is kept for drawing and is never in visibleIds', () => {
    // It cannot occur by type. It is planted here because the refusal is what
    // stops a later input, a diagnostics row say, becoming a batch target. The
    // render test holds the other half: no checkbox, no button, no ellipsis.
    const out = buildManageProjection(
      input({ sessions: [session({ id: '' }), session({ id: 'real' })] })
    );
    const rows = out.managed.flatMap((g) => g.rows);
    expect(rows.map((r) => r.id)).toEqual(['', 'real']);
    expect(visibleIds(out.managed)).toEqual(['real']);
    expect(visibleIds(out.managed)).not.toContain('');
  });

  it('an id-less row in the Past list is never a target either', () => {
    const out = buildManageProjection(
      input({
        pastSessions: [
          session({ id: '', status: 'discarded' }),
          session({ id: 'p', status: 'discarded' })
        ]
      })
    );
    expect(visibleIds(out.past)).toEqual(['p']);
  });
});

describe('source-text pins on the domain (Phase 293)', () => {
  const dir = resolve(import.meta.dirname, '..');
  const source = readFileSync(resolve(dir, 'projection.ts'), 'utf8');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('projection.ts case-folds nothing and normalises nothing', () => {
    expect(code).not.toMatch(/toLowerCase|toUpperCase|toLocaleLowerCase/);
    expect(code).not.toMatch(/\.normalize\(/);
  });

  it('its one localeCompare compares LABELS, and a path is compared byte for byte', () => {
    const compares = code.match(/localeCompare/g) ?? [];
    expect(compares.length).toBe(1);
    expect(code).toMatch(/a\.label\.localeCompare\(b\.label\)/);
    // The tie is the key, compared with `<`, which folds nothing.
    expect(code).toMatch(/a\.key < b\.key/);
  });

  it('groups by targetKey over targetOfSession, never by a basename', () => {
    expect(code).toMatch(/targetKey\(/);
    expect(code).toMatch(/targetOfSession\(/);
    const keyFn = code.slice(
      code.indexOf('function groupIdentity'),
      code.indexOf('function groupIdentity') + 900
    );
    expect(keyFn).not.toMatch(/baseName/);
  });

  it('no production file in the domain imports anything from diagnostics', () => {
    const files = readdirSync(dir).filter((name) => /\.tsx?$/.test(name));
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const name of files) {
      const text = readFileSync(resolve(dir, name), 'utf8');
      const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map(
        (m) => m[1] ?? ''
      );
      for (const spec of specs) {
        expect(spec, `${name} imports ${spec}`).not.toMatch(/diagnostics/i);
      }
    }
  });

  it('the projection’s only session inputs are sessions and pastSessions', () => {
    // One loop over each, and no third list.
    expect(code).toMatch(/input\.sessions/);
    expect(code).toMatch(/input\.pastSessions/);
    expect(code).not.toMatch(/diagnostic|processes|orphans/i);
  });
});
