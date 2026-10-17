/**
 * THE PHONE STARTS WHAT THE MAC'S ONE PRESS STARTS (Phase 346,
 * build/p346/SPEC.md D13, §8.2): `composeStartInput` in main against the
 * object the renderer's own `quickCreate` hands `window.gmux.sessions.create`,
 * driven through the REAL renderer store with a recording bridge.
 *
 * For every compiled launchable agent, on this Mac and on a machine, over four
 * settings fixtures (nothing; a verified default that turns no safeguard off; a
 * verified safeguard-off default, which main's settings read carries only when
 * it is sealed; capture on, with a default beside it), the two objects are
 * equal by deep equality AND as JSON, so even the order of their keys is one
 * order. The project holds sessions of its own and another project holds a
 * session the name rule must not count.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachinesResult } from '@shared/ipc';
import type { Project, Session } from '@shared/types';

let created: Record<string, unknown>[] = [];

function rows(): Promise<MachinesResult> {
  return Promise.resolve({
    rows: [
      {
        id: 'macpro',
        label: 'Mac Pro',
        color: 'blue',
        host: 'macpro',
        user: null,
        port: null,
        remoteTmuxPath: null,
        state: 'confirmed',
        usable: true,
        hash: 'h',
        confirmedHash: 'h',
        confirmedAt: null,
        confirmedLines: [],
        lines: [],
        refusal: null,
        warning: 'w'
      }
    ],
    errors: [],
    directory: '/tmp/machines',
    path: '/tmp/machines/machines.json',
    present: true,
    honesty: 'h',
    warning: 'w',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  } as MachinesResult);
}

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      create: (input: Record<string, unknown>) => {
        created.push(input);
        return Promise.resolve({
          id: `s-${String(created.length)}`,
          name: String(input.name),
          projectPath: String(input.projectPath),
          cwd: String(input.projectPath),
          agent: String(input.agent),
          status: 'running',
          createdAt: 0
        });
      },
      list: () => Promise.resolve([]),
      onChanged() {},
      onStatusChanged() {}
    },
    machines: { rows },
    projects: { list: () => Promise.resolve([]) },
    notice: { pending: () => Promise.resolve([]) },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../../../renderer/state/store');
const { useSettingsStore } = await import('../../../renderer/settings/settings-store');
const { composeStartInput } = await import('../pocket-start');
const { LAUNCHABLE_AGENT_IDS } = await import('../../agents/registry');
const { getFlagCatalogViews } = await import('../../settings/ipc');
const { defaultGmuxSettings } = await import('@shared/settings');
type GmuxSettings = import('@shared/settings').GmuxSettings;
type LaunchableAgentId = import('@shared/types').LaunchableAgentId;

const CATALOGS = getFlagCatalogViews();

const LOCAL: Project = { id: 'p-local', path: '/Users/someone/src/app', name: 'app' };
const FAR: Project = { id: 'p-far', path: '/home/someone/api', name: 'api', machineId: 'macpro' };
const OTHER: Project = { id: 'p-other', path: '/Users/someone/src/other', name: 'other' };

function sessionsFor(agent: string): Session[] {
  const row = (id: string, name: string, projectPath: string, machine?: string): Session =>
    ({
      id,
      name,
      tmuxName: id,
      projectPath,
      cwd: projectPath,
      agent: 'claude',
      status: 'running',
      createdAt: 1,
      ...(machine !== undefined ? { machine: { id: machine, label: 'Mac Pro' } } : {})
    }) as Session;
  return [
    row('a', `${agent}-1`, LOCAL.path),
    row('b', `${agent}-3`, LOCAL.path),
    row('c', 'notes', LOCAL.path),
    row('d', `${agent}-2`, FAR.path, 'macpro'),
    // Another project, and the same path on another computer: neither counts.
    row('e', `${agent}-9`, OTHER.path),
    row('f', `${agent}-7`, LOCAL.path, 'macpro')
  ];
}

/** The four settings fixtures for one agent (§8.2). */
function fixturesFor(agent: LaunchableAgentId): [string, GmuxSettings][] {
  const presets = (CATALOGS as Record<string, { presets: { flag: string; verified: boolean; danger: boolean }[] } | undefined>)[agent]?.presets ?? [];
  const safe = presets.find((p) => p.verified && !p.danger)?.flag;
  const danger = presets.find((p) => p.verified && p.danger)?.flag;
  const base = defaultGmuxSettings();
  return [
    ['nothing', base],
    ['a verified default', { ...base, launchDefaults: safe === undefined ? {} : { [agent]: [safe] } }],
    ['a sealed safeguard-off default', { ...base, launchDefaults: danger === undefined ? {} : { [agent]: [danger] } }],
    [
      'capture on, beside a default',
      { ...base, captureDefaults: { [agent]: true }, launchDefaults: safe === undefined ? {} : { [agent]: [safe] } }
    ]
  ];
}

beforeEach(() => {
  created = [];
});

describe('composeStartInput is quickCreate’s input (D13)', () => {
  let compared = 0;
  for (const agent of LAUNCHABLE_AGENT_IDS) {
    for (const where of [LOCAL, FAR]) {
      it(`${agent}, ${where === LOCAL ? 'on this Mac' : 'on a machine'}`, async () => {
        for (const [why, settings] of fixturesFor(agent)) {
          created = [];
          const sessions = sessionsFor(agent);
          useApp.setState({
            projects: [LOCAL, FAR, OTHER],
            activeProjectId: where.id,
            sessions,
            toasts: [],
            machineStates: [{ id: 'macpro', label: 'Mac Pro', color: 'blue', link: 'connected', detail: '', sessions: 0 }]
          } as never);
          useSettingsStore.setState((s) => ({ ...s, settings, catalogs: CATALOGS }));
          await useApp.getState().quickCreate(agent);
          expect(created, `${agent} ${why}: the window created nothing`).toHaveLength(1);
          const main = composeStartInput({ project: where, agent, sessions, settings, catalogs: CATALOGS });
          expect(main, `${agent} ${why}`).toEqual(created[0]);
          expect(JSON.stringify(main), `${agent} ${why}`).toBe(JSON.stringify(created[0]));
          // Never a working folder, a forced start, a login or a sign in.
          for (const key of ['cwd', 'startAnyway', 'login', 'signIn']) expect(key in main, `${agent} ${why} ${key}`).toBe(false);
          compared += 1;
        }
      });
    }
  }

  it('compared every agent, both places and all four fixtures, and the fixtures were not all empty', () => {
    expect(LAUNCHABLE_AGENT_IDS).toHaveLength(13);
    expect(compared).toBe(13 * 2 * 4);
    // At least one agent carries a verified safeguard-off default, so that arm compared a flag.
    const withDanger = LAUNCHABLE_AGENT_IDS.filter((agent) => {
      const settings = fixturesFor(agent)[2]?.[1];
      return settings !== undefined && Object.keys(settings.launchDefaults).length > 0;
    });
    expect(withDanger.length).toBeGreaterThan(5);
  });
});
