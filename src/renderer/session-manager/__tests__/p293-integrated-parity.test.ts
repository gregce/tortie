/**
 * Phase 293, the integrator's seam 4: the menu a sheet row opens, built from
 * the rows D's REAL projection draws, against the policy's own menu for the
 * same session with no host.
 *
 * E's parity test holds `sessionMenuItems` with and without a host over hand
 * made sessions, and E's action tests hand `manageMenuItems` a row that is
 * only `{ id, tab }`. Neither reads a row the projection actually produced,
 * so neither could see a projection whose ids, tabs or sessions disagree with
 * the store the press re-reads. This test takes every row of
 * `selectManageProjection` over one store holding every status on this Mac and
 * on a machine, and past rows of every kind, and holds three things:
 *
 *  1. THE PARITY RULE over the sheet's real rows: after the sheet's own two
 *     rows and their separator, `manageMenuItems(row)` equals
 *     `sessionMenuItems(session, 'manage:<id>')` in everything but `run`;
 *  2. every session in the store is drawn exactly once, on its own tab, by id;
 *  3. the visible button's enablement is the gates' answer and nothing else.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      list: () => Promise.resolve([]),
      listRemoved: () => Promise.resolve([])
    },
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve()
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
vi.stubGlobal('requestAnimationFrame', () => 0);

vi.mock('../../icons/codicon-menu-icon', async (original) => {
  const real = await original<typeof import('../../icons/codicon-menu-icon')>();
  return {
    ...real,
    menuGlyph: (name: string) => ({ icon: { dataUrl: `glyph:${name}`, template: true } })
  };
});

const { useApp } = await import('../../state/store');
const { manageMenuItems } = await import('../actions');
const { sessionMenuItems } = await import('../../app/session-actions');
const { selectManageProjection } = await import('../use-sheet-refresh');
const { sessionActionGates } = await import('../../state/resume');
const { effectiveStatusOf } = await import('../../state/store');
const { sessionGateEnv } = await import('../../app/session-actions');

type Item = ReturnType<typeof sessionMenuItems>[number];

const STUDIO: SessionMachine = {
  id: 'm1',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};
const REFUSED: SessionMachine = {
  ...STUDIO,
  canRestore: false,
  restoreReason: 'Studio is not ready.'
};

const LIVE: readonly SessionStatus[] = [
  'running',
  'needs_input',
  'idle',
  'exited',
  'restorable',
  'unknown'
];

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

/** Every status, on this Mac, on a machine, and on a machine that refuses. */
function managedWorld(): Session[] {
  const out: Session[] = [];
  for (const status of LIVE) {
    for (const material of [false, true]) {
      const extra: Partial<Session> = material
        ? {
            hasSavedScrollback: true,
            resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
            agentSessionId: 'c0ffee'
          }
        : {};
      out.push(sess(`l-${status}-${String(material)}`, { status, ...extra }));
      out.push(
        sess(`r-${status}-${String(material)}`, {
          status,
          machine: STUDIO,
          projectPath: '/srv/one',
          cwd: '/srv/one',
          ...extra
        })
      );
      out.push(
        sess(`x-${status}-${String(material)}`, {
          status,
          machine: REFUSED,
          projectPath: '/srv/two',
          cwd: '/srv/two',
          ...extra
        })
      );
    }
  }
  return out;
}

function pastWorld(): Session[] {
  return [
    sess('p-local', { status: 'discarded', removedAt: 5 }),
    sess('p-local-conv', {
      status: 'discarded',
      removedAt: 6,
      resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
      agentSessionId: 'c0ffee'
    }),
    sess('p-remote', {
      status: 'discarded',
      removedAt: 7,
      machine: STUDIO,
      projectPath: '/srv/one',
      cwd: '/srv/one'
    }),
    sess('p-gone', {
      status: 'discarded',
      removedAt: 8,
      projectPath: '/srv/old',
      cwd: '/srv/old',
      machineGone: {
        label: 'Old Mini',
        forgottenAt: 1,
        lastSeenAt: 1,
        lastStatus: 'idle'
      }
    } as Partial<Session>)
  ];
}

function face(item: Item): unknown {
  if (item === 'sep') return 'sep';
  const { run: _run, ...rest } = item;
  return rest;
}

const ENVS = [
  { canDiscard: true, shellPathReady: true },
  { canDiscard: false, shellPathReady: true },
  { canDiscard: true, shellPathReady: false }
] as const;

function world(env: (typeof ENVS)[number]): void {
  useApp.setState({
    sessionSheet: null,
    sessions: managedWorld(),
    pastSessions: pastWorld(),
    projects: [],
    tabOrder: [],
    machineStates: [{ id: 'm1', label: 'Studio' }] as never,
    handbacks: {},
    restoringIds: {},
    shellPathReady: env.shellPathReady,
    canRestore: () => true,
    canDiscard: () => env.canDiscard,
    setMenu: () => undefined,
    toast: () => undefined
  } as never);
  useApp.getState().openSessionSheet('managed');
}

beforeEach(() => {
  world(ENVS[0]);
});

describe('the sheet menu over the REAL projection (integrator seam 4)', () => {
  it.each(ENVS.map((env, i) => [i, env] as const))(
    'equals the policy in everything but run, env %i',
    (_i, env) => {
      world(env);
      const projection = selectManageProjection(useApp.getState());
      let rows = 0;
      for (const tab of ['managed', 'past'] as const) {
        if (tab === 'past') useApp.getState().setSessionSheetTab('past');
        const groups = tab === 'managed' ? projection.managed : projection.past;
        for (const group of groups) {
          for (const row of group.rows) {
            const items = manageMenuItems(row);
            const cut = items.indexOf('sep');
            expect(cut, row.id).toBeGreaterThan(0);
            const list = tab === 'past' ? useApp.getState().pastSessions : useApp.getState().sessions;
            const session = list.find((one) => one.id === row.id);
            expect(session, row.id).toBeDefined();
            const plain = sessionMenuItems(session!, `manage:${row.id}`);
            expect(items.slice(cut + 1).map(face), row.id).toEqual(plain.map(face));
            rows += 1;
          }
        }
      }
      // 6 statuses x 2 materials x 3 places, and 4 past rows.
      expect(rows).toBe(36 + 4);
    }
  );

  it('draws every session once, on its own tab, by id', () => {
    const s = useApp.getState();
    const projection = selectManageProjection(s);
    const managed = projection.managed.flatMap((g) => g.rows.map((r) => r.id));
    const past = projection.past.flatMap((g) => g.rows.map((r) => r.id));
    expect([...managed].sort()).toEqual(s.sessions.map((one) => one.id).sort());
    expect([...past].sort()).toEqual(s.pastSessions.map((one) => one.id).sort());
    for (const g of projection.managed) for (const r of g.rows) expect(r.tab).toBe('managed');
    for (const g of projection.past) for (const r of g.rows) expect(r.tab).toBe('past');
  });

  it.each(ENVS.map((env, i) => [i, env] as const))(
    'the visible button is the gates’ answer, env %i',
    (_i, env) => {
      world(env);
      const s = useApp.getState();
      const projection = selectManageProjection(s);
      for (const tab of ['managed', 'past'] as const) {
        const groups = tab === 'managed' ? projection.managed : projection.past;
        for (const row of groups.flatMap((g) => g.rows)) {
          const list = tab === 'past' ? s.pastSessions : s.sessions;
          const session = list.find((one) => one.id === row.id)!;
          const gates = sessionActionGates(
            session,
            effectiveStatusOf(session),
            sessionGateEnv(session.id)
          );
          if (tab === 'past') {
            expect(row.primary.verb, row.id).toBe('restore');
            expect(row.primary.enabled, row.id).toBe(gates.canRestorePastNow);
          } else if (gates.canEnd) {
            expect(row.primary, row.id).toMatchObject({ verb: 'end', enabled: true });
          } else if (gates.unknown) {
            expect(row.primary, row.id).toMatchObject({ verb: 'end', enabled: false });
          } else {
            expect(row.primary.verb, row.id).toBe('restore');
            expect(row.primary.enabled, row.id).toBe(gates.canRestoreNow);
          }
        }
      }
    }
  );
});
