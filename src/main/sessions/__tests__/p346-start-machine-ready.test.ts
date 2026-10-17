/**
 * THE PHONE'S START ON A MACHINE THAT STOPPED ANSWERING (Phase 346's fix
 * round, build/p346/SPEC.md §3.1 and D7, D12), driven through the PRODUCTION
 * readiness read (`createPocketStart` with no `machineReady` injected):
 *
 *  - a machine is ready only while its row is confirmed, `readyRemoteContext`
 *    answers AND its session feed answers (`machineFeedAnswering`, the session
 *    verbs' rule in `src/main/machines/liveness.ts`);
 *  - a machine whose ssh stalled with its connection still up (the lens's
 *    sshd paused for 150 s: the link `connected`, the last list missed) reads
 *    `ready: false` in the offer and `refused` `machine` at the act, with
 *    nothing created and `still` never asked;
 *  - the next list that completes makes it ready again, and a start there runs.
 *
 * The four readers are stand-ins over memory; nothing here reaches a machine,
 * and every `node:child_process` entry point is a spy that must read zero.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateSessionInput, LaunchableAgentId, Project, Session } from '@shared/types';

const spawned: string[] = [];

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:child_process')>();
  const counted =
    (name: string) =>
    (...args: unknown[]): never => {
      spawned.push(`${name} ${String(args[0])}`);
      throw new Error(`p346: ${name} was called`);
    };
  return {
    ...real,
    spawn: counted('spawn'),
    spawnSync: counted('spawnSync'),
    exec: counted('exec'),
    execSync: counted('execSync'),
    execFile: counted('execFile'),
    execFileSync: counted('execFileSync'),
    fork: counted('fork')
  };
});

/** What main holds for the one machine, `macpro`. */
const machine = vi.hoisted(() => ({
  row: true,
  confirmed: true,
  context: true,
  feed: true,
  asked: [] as string[]
}));

vi.mock('../../machines/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../machines/store')>();
  return {
    ...real,
    machineRow: (id: string) => (machine.row && id === 'macpro' ? { id: 'macpro', host: 'macpro.example' } : null),
    machineFieldsOf: () => ({}),
    machineLabelOf: () => 'Mac Pro'
  };
});

vi.mock('../../machines/confirm', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../machines/confirm')>();
  return {
    ...real,
    machineRowStatus: (id: string) => {
      machine.asked.push(`confirm ${id}`);
      return { state: machine.confirmed ? 'confirmed' : 'unconfirmed' };
    }
  };
});

vi.mock('../../machines/ready-context', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../machines/ready-context')>();
  return {
    ...real,
    readyRemoteContext: (id: string) => {
      machine.asked.push(`context ${id}`);
      if (!machine.context) throw new Error('not signed in');
      return { kind: 'remote', machineId: id };
    }
  };
});

vi.mock('../../machines/remote-run', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../machines/remote-run')>();
  return {
    ...real,
    machineFeedAnswering: (id: string) => {
      machine.asked.push(`feed ${id}`);
      return machine.feed;
    }
  };
});

const { createPocketStart } = await import('../pocket-start');
const { getFlagCatalogViews } = await import('../../settings/ipc');
const { defaultGmuxSettings } = await import('@shared/settings');
const copy = await import('@shared/start-copy');

const CATALOGS = getFlagCatalogViews();

function project(id: string, path: string, name: string, machineId?: string): Project {
  return { id, path, name, ...(machineId !== undefined ? { machineId } : {}) };
}

interface Core {
  projects: Project[];
  created: CreateSessionInput[];
  listProjects(): readonly Project[];
  listSessions(): readonly Session[];
  createSession(input: CreateSessionInput): Promise<Session>;
}

function core(): Core {
  const c: Core = {
    projects: [project('p-local', '/tmp/app', 'app'), project('p-far', '/srv/api', 'api', 'macpro')],
    created: [],
    listProjects: () => c.projects,
    listSessions: () => [],
    createSession: async (input) => {
      c.created.push(input);
      return { id: 'new-id', name: input.name } as Session;
    }
  };
  return c;
}

/** The production readiness: no `machineReady`, no `machineLabel`. */
function starter(c: Core): ReturnType<typeof createPocketStart> {
  return createPocketStart({
    core: () => c,
    settings: () => defaultGmuxSettings(),
    catalogs: () => CATALOGS,
    localAgents: () => ['claude'] as LaunchableAgentId[],
    machineAgents: (id) => (id === 'macpro' ? ['claude', 'codex'] : null)
  });
}

function farReady(c: Core): boolean | undefined {
  const key = starter(c).sessionsKey(true);
  if (!('places' in key)) throw new Error('no offer');
  return key.places.find((p) => p.id === 'macpro')?.ready;
}

beforeEach(() => {
  spawned.length = 0;
  machine.row = true;
  machine.confirmed = true;
  machine.context = true;
  machine.feed = true;
  machine.asked = [];
});

describe('a machine’s readiness for a phone start (the fix round)', () => {
  it('is ready with the row confirmed, the context signed in and the session feed answering, and starts there', async () => {
    const c = core();
    expect(farReady(c)).toBe(true);
    const out = await starter(c).start({ project: 'p-far', agent: 'codex' }, () => true);
    expect(out).toEqual({ outcome: 'done', session: { id: 'new-id', name: 'codex-1' } });
    expect(c.created).toEqual([{ name: 'codex-1', projectPath: '/srv/api', projectMachineId: 'macpro', agent: 'codex', machineId: 'macpro' }]);
    expect(machine.asked).toContain('feed macpro');
    expect(spawned).toEqual([]);
  });

  it('a machine that stopped answering with its connection up reads not ready and is refused machine, nothing created', async () => {
    machine.feed = false;
    const c = core();
    expect(farReady(c)).toBe(false);
    let stills = 0;
    const out = await starter(c).start({ project: 'p-far', agent: 'claude' }, () => {
      stills += 1;
      return true;
    });
    expect(out).toEqual({ outcome: 'refused', reason: 'machine', sentence: copy.START_MACHINE_AWAY });
    expect(c.created).toEqual([]);
    expect(stills).toBe(0);
    // This Mac's own projects are untouched by a machine that stalled.
    expect((await starter(c).start({ project: 'p-local', agent: 'claude' }, () => true)).outcome).toBe('done');
    expect(spawned).toEqual([]);
  });

  it('is ready again once a list completes', async () => {
    machine.feed = false;
    const c = core();
    expect(farReady(c)).toBe(false);
    machine.feed = true;
    expect(farReady(c)).toBe(true);
    expect((await starter(c).start({ project: 'p-far', agent: 'claude' }, () => true)).outcome).toBe('done');
  });

  for (const [why, set] of [
    ['no row', () => (machine.row = false)],
    ['a row not confirmed', () => (machine.confirmed = false)],
    ['no signed-in context', () => (machine.context = false)]
  ] as const) {
    it(`reads ${why} as not ready and refuses machine, whatever the feed says`, async () => {
      set();
      const c = core();
      expect(farReady(c)).toBe(false);
      expect(await starter(c).start({ project: 'p-far', agent: 'claude' }, () => true)).toEqual({
        outcome: 'refused',
        reason: 'machine',
        sentence: copy.START_MACHINE_AWAY
      });
      expect(c.created).toEqual([]);
    });
  }
});
