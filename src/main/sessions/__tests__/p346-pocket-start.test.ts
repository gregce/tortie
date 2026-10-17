/**
 * THE PHONE'S START (Phase 346, build/p346/SPEC.md §4.6, D7 to D13), driven:
 *
 *  - THE OFFER (D7, D10, D11): `composeStartOffer` over fixtures with two
 *    machines, one not ready, one never read, 250 projects, an agent in two
 *    places, twin folders, a default agent of `shell` and one installed
 *    nowhere; the danger line of a sealed safeguard-off default.
 *  - INSTALLED, READ STARTING NOTHING (D8): `localInstalledAgents` with a
 *    resolved scan, with no scan and a settled PATH (the merged row the create
 *    reads, so a renamed binary is honoured), and with neither, while every
 *    `node:child_process` entry point is a spy that must read zero calls.
 *  - THE ACT (D12): every refusal by its reason and sentence, `still` asked
 *    once more after the reads, nothing awaited from the first read to the
 *    create, the create handed exactly `composeStartInput`'s input, and a
 *    thrown create told apart BY CODE ONLY, its text never read.
 *  - THE KEY (D9): `sessionsKey(false)` is `waiting` and reads nothing.
 */

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentsScanResult, CreateSessionInput, LaunchableAgentId, Project, Session } from '@shared/types';
import type { GmuxSettings } from '@shared/settings';

/** Every child_process entry point, counted. The offer must start nothing. */
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

const control = vi.hoisted(() => ({
  scan: null as AgentsScanResult | null,
  path: null as string | null,
  /** id → binaries, as an `agents.json` patch would rename them. */
  renamed: new Map<string, string[]>(),
  /**
   * THE HOME the rows' own folders (`~/.claude/local`, `~/.npm-global/bin`,
   * `$NVM_BIN`…) expand against: a scratch folder, never the home of the
   * machine running the test. Phase 346's fix round: the folders expanded
   * against `homedir()`, so on his Mac the test also found the pi, grok and
   * opencode in HIS install folders and `npm test` read red there while it
   * read green under a scratch HOME.
   */
  home: ''
}));

vi.mock('../../agents/detection', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../agents/detection')>();
  return {
    ...real,
    peekDetectedAgents: () => control.scan,
    // The real expansion, over an empty environment and the scratch home.
    expandDirs: (dirs: readonly string[]) => real.expandDirs(dirs, {}, control.home),
    listDetectedAgents: () => {
      throw new Error('p346: the offer started a scan');
    },
    rescanAgents: () => {
      throw new Error('p346: the offer started a scan');
    }
  };
});

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...real,
    userPathNow: () => control.path,
    extraBinDirs: () => [],
    getUserPath: () => {
      throw new Error('p346: the offer started a login shell');
    }
  };
});

vi.mock('../../config/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../config/store')>();
  return {
    ...real,
    launchableAgentEntry: (id: string) => {
      const entry = real.launchableAgentEntry(id);
      const binaries = control.renamed.get(id);
      return entry === null || binaries === undefined ? entry : { ...entry, binaries };
    }
  };
});

const { composeStartInput, composeStartOffer, createPocketStart, localInstalledAgents, startDangerOf } = await import('../pocket-start');
const { LAUNCHABLE_AGENT_IDS, getRegistryEntry } = await import('../../agents/registry');
const { getFlagCatalogViews } = await import('../../settings/ipc');
const { defaultGmuxSettings } = await import('@shared/settings');
const { gmuxError } = await import('../../errors');
const { POCKET_WRITE_SENTENCES } = await import('@shared/ipc/pocket');
const copy = await import('@shared/start-copy');

const CATALOGS = getFlagCatalogViews();
const ROWS = LAUNCHABLE_AGENT_IDS.map((id) => ({ id, name: getRegistryEntry(id).displayName, icon: getRegistryEntry(id).iconKey }));

function settings(over: Partial<GmuxSettings> = {}): GmuxSettings {
  return { ...defaultGmuxSettings(), ...over };
}

function project(id: string, path: string, name: string, machineId?: string): Project {
  return { id, path, name, ...(machineId !== undefined ? { machineId } : {}) };
}

function session(id: string, projectPath: string, createdAt: number, machine?: string, name = id): Session {
  return {
    id,
    name,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'claude',
    status: 'running',
    createdAt,
    ...(machine !== undefined ? { machine: { id: machine, label: machine } } : {})
  } as Session;
}

const scratch = mkdtempSync(join(tmpdir(), 'p346-pocket-start-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
control.home = join(scratch, 'home');
mkdirSync(control.home, { recursive: true });

/** A folder holding executable files of these names, and nothing that runs. */
function binDir(name: string, bins: readonly string[]): string {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: true });
  for (const bin of bins) {
    const file = join(dir, bin);
    writeFileSync(file, '#!/bin/sh\nexit 0\n');
    chmodSync(file, 0o755);
  }
  return dir;
}

beforeEach(() => {
  spawned.length = 0;
  control.scan = null;
  control.path = null;
  control.renamed.clear();
});

// ---------------------------------------------------------------------------
// The offer
// ---------------------------------------------------------------------------

describe('composeStartOffer (D7, D10, D11)', () => {
  const places = new Map([
    ['local', { ready: true, read: true, agents: ['codex', 'claude', 'shell', 'my-own'] }],
    ['macpro', { ready: true, read: true, agents: ['claude', 'pi'] }],
    ['asleep', { ready: false, read: true, agents: ['claude'] }],
    ['unread', { ready: true, read: false, agents: ['gemini'] }]
  ]);
  const label = (id: string): string | null => (id === 'macpro' ? 'Mac Pro' : id === 'asleep' ? 'Old Mini' : null);

  it('lists the projects in order, their places local first, each place’s installed agents in registry order, and every agent once', () => {
    const projects = [
      project('p1', '/Users/me/src/app', 'app'),
      project('p2', '/srv/api', 'api', 'macpro'),
      project('p3', '/Users/me/work/app', 'app'),
      project('p4', '/home/x', 'x', 'asleep'),
      project('p5', '/home/y', 'y', 'unread'),
      project('p6', '/srv/api2', 'api2', 'macpro')
    ];
    const offer = composeStartOffer({ projects, sessions: [], places, machineLabel: label, agentRows: ROWS, settings: settings(), catalogs: CATALOGS });
    expect(offer.state).toBe('offered');
    expect(offer.projects.map((p) => [p.id, p.label, p.machine, p.folder, p.place])).toEqual([
      ['p1', 'app', null, '~/src/app', 'local'],
      ['p2', 'api', 'Mac Pro', null, 'macpro'],
      ['p3', 'app', null, '~/work/app', 'local'],
      ['p4', 'x', 'Old Mini', null, 'asleep'],
      // A machine with no row is drawn by its id.
      ['p5', 'y', 'unread', null, 'unread'],
      ['p6', 'api2', 'Mac Pro', null, 'macpro']
    ]);
    expect(offer.places).toEqual([
      // Never shell, never an id only an overlay holds; registry order.
      { id: 'local', ready: true, read: true, agents: ['claude', 'codex'] },
      { id: 'macpro', ready: true, read: true, agents: ['claude', 'pi'] },
      { id: 'asleep', ready: false, read: true, agents: ['claude'] },
      // Not read: no agent, whatever the map said.
      { id: 'unread', ready: true, read: false, agents: [] }
    ]);
    // An agent in two places is listed once, in registry order.
    expect(offer.agents.map((a) => a.id)).toEqual(['claude', 'codex', 'pi']);
    expect(offer.agents[0]).toEqual({ id: 'claude', name: 'Claude Code', icon: 'claude', danger: null });
    expect(offer.defaultAgent).toBe('claude');
  });

  it('puts local first even when a machine’s project is listed first, and says this Mac is ready whatever it was handed', () => {
    const offer = composeStartOffer({
      projects: [project('m', '/srv/a', 'a', 'macpro'), project('l', '/tmp/b', 'b')],
      sessions: [],
      places: new Map([['local', { ready: false, read: true, agents: ['claude'] }], ['macpro', { ready: false, read: true, agents: [] }]]),
      machineLabel: label,
      agentRows: ROWS,
      settings: settings(),
      catalogs: CATALOGS
    });
    expect(offer.places.map((p) => [p.id, p.ready])).toEqual([
      ['local', true],
      ['macpro', false]
    ]);
  });

  it('caps the projects at 200 and chooses only among those listed', () => {
    const projects = Array.from({ length: 250 }, (_, i) => project(`p${String(i)}`, `/tmp/p${String(i)}`, `p${String(i)}`));
    // The newest session is in project 240, which is past the cap.
    const sessions = [session('s-old', '/tmp/p3', 10), session('s-new', '/tmp/p240', 99)];
    const offer = composeStartOffer({ projects, sessions, places, machineLabel: label, agentRows: ROWS, settings: settings(), catalogs: CATALOGS });
    expect(offer.projects).toHaveLength(200);
    expect(offer.chosen).toBe('p3');
  });

  it('chooses the project where a session was started last, ties by the larger id, else the first, else null (D10)', () => {
    const projects = [project('a', '/tmp/a', 'a'), project('b', '/tmp/b', 'b'), project('c', '/srv/c', 'c', 'macpro')];
    const base = { projects, places, machineLabel: label, agentRows: ROWS, settings: settings(), catalogs: CATALOGS };
    expect(composeStartOffer({ ...base, sessions: [] }).chosen).toBe('a');
    expect(composeStartOffer({ ...base, sessions: [session('s1', '/tmp/b', 5), session('s2', '/tmp/a', 4)] }).chosen).toBe('b');
    expect(composeStartOffer({ ...base, sessions: [session('s1', '/tmp/a', 5), session('s9', '/tmp/b', 5)] }).chosen).toBe('b');
    // A session on a machine counts for the machine's project, matched by machine AND path.
    expect(composeStartOffer({ ...base, sessions: [session('s1', '/srv/c', 7, 'macpro')] }).chosen).toBe('c');
    expect(composeStartOffer({ ...base, sessions: [session('s1', '/srv/c', 7)] }).chosen).toBe('a');
    // A session in no open project chooses nothing.
    expect(composeStartOffer({ ...base, sessions: [session('s1', '/elsewhere', 99)] }).chosen).toBe('a');
    expect(composeStartOffer({ ...base, projects: [], sessions: [] }).chosen).toBeNull();
  });

  it('offers a default agent only when it is a listed agent: never shell, never one installed nowhere (D11)', () => {
    const base = { projects: [project('a', '/tmp/a', 'a')], sessions: [], places, machineLabel: label, agentRows: ROWS, catalogs: CATALOGS };
    expect(composeStartOffer({ ...base, settings: settings({ defaultAgent: 'codex' }) }).defaultAgent).toBe('codex');
    expect(composeStartOffer({ ...base, settings: settings({ defaultAgent: 'shell' }) }).defaultAgent).toBeNull();
    expect(composeStartOffer({ ...base, settings: settings({ defaultAgent: 'qwen' }) }).defaultAgent).toBeNull();
  });

  it('says a sealed safeguard-off default as one line, and a non-danger or unverified default not at all', () => {
    const s = settings({
      launchDefaults: {
        claude: ['--dangerously-skip-permissions', '--permission-mode plan'],
        codex: ['--yolo']
      }
    });
    expect(startDangerOf('claude', s, CATALOGS)).toBe('Skip all permissions');
    // `--yolo` is a danger flag, but RESEARCH, never verified, so it never applies.
    expect(startDangerOf('codex', s, CATALOGS)).toBeNull();
    expect(startDangerOf('claude', settings({ launchDefaults: { claude: ['--permission-mode plan'] } }), CATALOGS)).toBeNull();
    expect(startDangerOf('claude', settings(), CATALOGS)).toBeNull();
    const two = settings({ launchDefaults: { claude: ['--dangerously-skip-permissions', '--allow-dangerously-skip-permissions'] } });
    expect(startDangerOf('claude', two, CATALOGS)).toBe('Skip all permissions, Allow bypass as an option');
    const offer = composeStartOffer({ projects: [project('a', '/tmp/a', 'a')], sessions: [], places, machineLabel: label, agentRows: ROWS, settings: s, catalogs: CATALOGS });
    expect(offer.agents.find((a) => a.id === 'claude')?.danger).toBe('Skip all permissions');
    expect(offer.agents.find((a) => a.id === 'codex')?.danger).toBeNull();
  });

  it('clips every drawn string at the door’s one clip', () => {
    const offer = composeStartOffer({
      projects: [project('a', '/tmp/a', 'n'.repeat(300), 'macpro')],
      sessions: [],
      places,
      machineLabel: () => 'm'.repeat(300),
      agentRows: ROWS,
      settings: settings(),
      catalogs: CATALOGS
    });
    expect(offer.projects[0]?.label).toHaveLength(200);
    expect(offer.projects[0]?.machine).toHaveLength(200);
  });
});

// ---------------------------------------------------------------------------
// Installed, read starting nothing
// ---------------------------------------------------------------------------

describe('localInstalledAgents (D8)', () => {
  it('reads the last resolved scan when one exists: installed, launchable, compiled, registry order', () => {
    control.scan = {
      scannedAt: 1,
      agents: [
        { id: 'codex', installed: true, launchable: true },
        { id: 'claude', installed: true, launchable: true },
        { id: 'gemini', installed: false, launchable: true },
        { id: 'cursoride', installed: true, launchable: false },
        { id: 'my-own', installed: true, launchable: true }
      ] as AgentsScanResult['agents']
    };
    control.path = binDir('ignored', ['qwen']);
    expect(localInstalledAgents()).toEqual(['claude', 'codex']);
    expect(spawned).toEqual([]);
  });

  it('with no scan, resolves the merged rows’ candidates against the settled PATH, starting nothing', () => {
    const one = binDir('one', ['claude', 'codex']);
    const two = binDir('two', ['cursor-agent', 'codewhale', 'not-an-agent']);
    control.path = [one, '', two].join(':');
    expect(localInstalledAgents()).toEqual(['claude', 'cursor', 'codex', 'deepseek']);
    // An agents.json patch that renames a binary is honoured: the real file is never offered.
    control.renamed.set('claude', ['claude-hidden-by-p346']);
    expect(localInstalledAgents()).toEqual(['cursor', 'codex', 'deepseek']);
    expect(spawned).toEqual([]);
  });

  it('walks the merged row’s own folders under the home, as detection does, and nothing else', () => {
    control.path = binDir('empty', []);
    expect(localInstalledAgents()).toEqual([]);
    // pi's row names `~/.npm-global/bin`: a pi there is found with nothing on the PATH.
    const own = join(control.home, '.npm-global', 'bin');
    mkdirSync(own, { recursive: true });
    writeFileSync(join(own, 'pi'), '#!/bin/sh\nexit 0\n');
    chmodSync(join(own, 'pi'), 0o755);
    try {
      expect(localInstalledAgents()).toEqual(['pi']);
    } finally {
      rmSync(join(control.home, '.npm-global'), { recursive: true, force: true });
    }
    expect(localInstalledAgents()).toEqual([]);
    expect(spawned).toEqual([]);
  });

  it('answers null with neither a scan nor a settled PATH', () => {
    expect(localInstalledAgents()).toBeNull();
    expect(spawned).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The act
// ---------------------------------------------------------------------------

interface FakeCore {
  projects: Project[];
  sessions: Session[];
  created: CreateSessionInput[];
  createWith: (input: CreateSessionInput) => Promise<Session>;
  listProjects(): readonly Project[];
  listSessions(): readonly Session[];
  createSession(input: CreateSessionInput): Promise<Session>;
}

function fakeCore(): FakeCore {
  const core: FakeCore = {
    projects: [project('p-local', '/tmp/app', 'app'), project('p-far', '/srv/api', 'api', 'macpro')],
    sessions: [session('s1', '/tmp/app', 1, undefined, 'claude-1')],
    created: [],
    createWith: async (input) => session('new-id', input.projectPath, 2, undefined, input.name),
    listProjects: () => core.projects,
    listSessions: () => core.sessions,
    createSession: (input) => {
      core.created.push(input);
      return core.createWith(input);
    }
  };
  return core;
}

function starter(core: FakeCore | null, over: Partial<Parameters<typeof createPocketStart>[0]> = {}): ReturnType<typeof createPocketStart> {
  return createPocketStart({
    core: () => core,
    settings: () => settings({ launchDefaults: { claude: ['--permission-mode plan'] }, captureDefaults: { codex: true } }),
    catalogs: () => CATALOGS,
    localAgents: () => ['claude', 'codex'] as LaunchableAgentId[],
    machineAgents: (id) => (id === 'macpro' ? ['claude'] : null),
    machineReady: (id) => id === 'macpro',
    machineLabel: (id) => (id === 'macpro' ? 'Mac Pro' : null),
    ...over
  });
}

describe('the act (D12, D13)', () => {
  it('starts a local session with exactly quickCreate’s input and answers its id and name', async () => {
    const core = fakeCore();
    const out = await starter(core).start({ project: 'p-local', agent: 'claude' }, () => true);
    expect(out).toEqual({ outcome: 'done', session: { id: 'new-id', name: 'claude-2' } });
    expect(core.created).toEqual([{ name: 'claude-2', projectPath: '/tmp/app', agent: 'claude', extraArgs: ['--permission-mode', 'plan'] }]);
    expect(core.created[0]).toEqual(
      composeStartInput({
        project: core.projects[0] as Project,
        agent: 'claude',
        sessions: core.sessions,
        settings: settings({ launchDefaults: { claude: ['--permission-mode plan'] }, captureDefaults: { codex: true } }),
        catalogs: CATALOGS
      })
    );
  });

  it('starts on the project’s machine with both machine fields, and capture when its default is on', async () => {
    const core = fakeCore();
    expect((await starter(core).start({ project: 'p-far', agent: 'claude' }, () => true)).outcome).toBe('done');
    expect(core.created).toEqual([
      { name: 'claude-1', projectPath: '/srv/api', projectMachineId: 'macpro', agent: 'claude', extraArgs: ['--permission-mode', 'plan'], machineId: 'macpro' }
    ]);
    const local = fakeCore();
    await starter(local).start({ project: 'p-local', agent: 'codex' }, () => true);
    expect(local.created).toEqual([{ name: 'codex-1', projectPath: '/tmp/app', agent: 'codex', capture: true }]);
  });

  const refusals: [string, Partial<Parameters<typeof createPocketStart>[0]>, { project: string; agent: string }, string, string][] = [
    ['a project closed on the Mac', {}, { project: 'p-gone', agent: 'claude' }, 'project', copy.START_PROJECT_GONE],
    ['an agent not installed here', {}, { project: 'p-local', agent: 'gemini' }, 'agent', copy.START_AGENT_GONE],
    ['shell', {}, { project: 'p-local', agent: 'shell' }, 'agent', copy.START_AGENT_GONE],
    ['an agent not present on the machine', {}, { project: 'p-far', agent: 'codex' }, 'agent', copy.START_AGENT_GONE],
    ['a machine not ready', { machineReady: () => false }, { project: 'p-far', agent: 'claude' }, 'machine', copy.START_MACHINE_AWAY],
    ['agents not read here yet', { localAgents: () => null }, { project: 'p-local', agent: 'claude' }, 'agent', copy.START_AGENT_GONE],
    ['a machine never read', { machineAgents: () => null }, { project: 'p-far', agent: 'claude' }, 'agent', copy.START_AGENT_GONE]
  ];
  for (const [why, over, input, reason, sentence] of refusals) {
    it(`refuses ${why} with ${reason}, starting nothing and asking still nothing`, async () => {
      const core = fakeCore();
      let stills = 0;
      const out = await starter(core, over).start(input, () => {
        stills += 1;
        return true;
      });
      expect(out).toEqual({ outcome: 'refused', reason, sentence });
      expect(core.created).toEqual([]);
      expect(stills).toBe(0);
    });
  }

  it('asks still once more after its reads, and refuses stopped with the door’s sentence when it says no', async () => {
    const core = fakeCore();
    let stills = 0;
    const out = await starter(core).start({ project: 'p-local', agent: 'claude' }, () => {
      stills += 1;
      return false;
    });
    expect(out).toEqual({ outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped });
    expect(stills).toBe(1);
    expect(core.created).toEqual([]);
  });

  it('awaits nothing from the first read to the create: a microtask queued by the read has not run', async () => {
    const core = fakeCore();
    let flipped = false;
    let seen: boolean | null = null;
    const projects = core.projects;
    core.listProjects = () => {
      queueMicrotask(() => {
        flipped = true;
      });
      return projects;
    };
    core.createWith = async (input) => {
      seen = flipped;
      return session('new-id', input.projectPath, 2, undefined, input.name);
    };
    await starter(core).start({ project: 'p-local', agent: 'claude' }, () => true);
    expect(seen).toBe(false);
  });

  it('tells a thrown create apart by code alone, and never says what it said', async () => {
    const CANARY = 'CANARY /Users/someone/secret --flag';
    const cases: [string, unknown, unknown][] = [
      ['PROJECT_NOT_FOUND', gmuxError('PROJECT_NOT_FOUND', CANARY, CANARY), { outcome: 'refused', reason: 'project', sentence: copy.START_FOLDER_GONE }],
      ['AGENT_NOT_FOUND', gmuxError('AGENT_NOT_FOUND', CANARY, CANARY), { outcome: 'refused', reason: 'agent', sentence: copy.START_AGENT_GONE }],
      ['AGENT_NOT_ON_MACHINE', gmuxError('AGENT_NOT_ON_MACHINE', CANARY, CANARY), { outcome: 'refused', reason: 'agent', sentence: copy.START_AGENT_GONE }],
      [
        'AGENT_INTERPRETER_MISSING',
        gmuxError('AGENT_INTERPRETER_MISSING', CANARY, CANARY),
        { outcome: 'refused', reason: 'interpreter', sentence: copy.START_INTERPRETER }
      ],
      ['INVALID_INPUT', gmuxError('INVALID_INPUT', CANARY, CANARY), { outcome: 'failed', sentence: copy.START_FAILED }],
      ['a plain Error', new Error(CANARY), { outcome: 'failed', sentence: copy.START_FAILED }],
      ['a string', CANARY, { outcome: 'failed', sentence: copy.START_FAILED }]
    ];
    for (const [why, thrown, expected] of cases) {
      const core = fakeCore();
      core.createWith = async () => {
        throw thrown;
      };
      const out = await starter(core).start({ project: 'p-local', agent: 'claude' }, () => true);
      expect(out, why).toEqual(expected);
      expect(JSON.stringify(out), why).not.toContain('CANARY');
    }
  });

  it('answers failed while the core has not booted, and a read that throws is failed too', async () => {
    expect(await starter(null).start({ project: 'p-local', agent: 'claude' }, () => true)).toEqual({ outcome: 'failed', sentence: copy.START_FAILED });
    const core = fakeCore();
    core.listProjects = () => {
      throw new Error('CANARY');
    };
    expect(await starter(core).start({ project: 'p-local', agent: 'claude' }, () => true)).toEqual({ outcome: 'failed', sentence: copy.START_FAILED });
  });
});

describe('sessionsKey (D9)', () => {
  it('says waiting, reading nothing, while the route is not served', () => {
    let read = 0;
    const key = starter(null, {
      core: () => {
        read += 1;
        return null;
      },
      localAgents: () => {
        read += 1;
        return [];
      }
    }).sessionsKey(false);
    expect(key).toEqual({ state: 'waiting' });
    expect(read).toBe(0);
  });

  it('offers the core’s projects with each place read once, starting nothing', () => {
    const core = fakeCore();
    const asked: string[] = [];
    const key = starter(core, {
      localAgents: () => (asked.push('local'), ['claude', 'codex']),
      machineAgents: (id) => (asked.push(id), ['claude']),
      machineReady: (id) => (asked.push(`ready ${id}`), true)
    }).sessionsKey(true);
    if (key.state !== 'offered') throw new Error('not offered');
    expect(key.projects.map((p) => p.id)).toEqual(['p-local', 'p-far']);
    expect(key.places).toEqual([
      { id: 'local', ready: true, read: true, agents: ['claude', 'codex'] },
      { id: 'macpro', ready: true, read: true, agents: ['claude'] }
    ]);
    expect(key.chosen).toBe('p-local');
    expect(key.defaultAgent).toBe('claude');
    expect(asked).toEqual(['local', 'macpro', 'ready macpro']);
    expect(core.created).toEqual([]);
    expect(spawned).toEqual([]);
  });
});
