/**
 * Phase 374, the Antigravity plan meter's flag on a NEW session and on nothing
 * else (build/p374/SPEC.md §7.1 rows L1, L2, L3 and L4; D4 to D9).
 *
 * The SHIPPING create, over the SHIPPING scan of a planted PATH, the SHIPPING
 * launch decision and a real folder in a temporary userData. What tmux was
 * handed to start and the row the create recorded are graded; the parent's
 * shapes are literals written here from SPEC §0.1.6, never read from the code.
 *
 * HERMETIC. Every file is under one temporary folder and every program is a
 * planted file nothing here runs: the one process a scan would start is
 * answered by a table. tmux is a recorder, so no server is contacted. The
 * launch context scan, which reads an agent's configuration folders, is held.
 * agy's settings file is a fixture under a scratch HOME. No agent runs.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSessionInput } from '@shared/types';
import type { ManifestSessionRecord } from '../../manifest';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-create-')));
const world = vi.hoisted(() => ({ userData: '', loginPath: '', on: false, wrap: false, spawnFails: false, probeDirs: [] as string[] }));
world.userData = join(root, "user data it's");
const home = join(root, 'home');
mkdirSync(home, { recursive: true });

vi.mock('electron', () => ({
  app: { isReady: () => true, isPackaged: false, getPath: () => world.userData, getAppPath: () => process.cwd(), getVersion: () => '0.0.0-p374' },
  BrowserWindow: { getAllWindows: () => [] }
}));

const probe = vi.hoisted(() => ({ ran: [] as string[], version: '1.5.16' as string | null, versions: {} as Record<string, string | null> }));
vi.mock('../../proc/guarded', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../proc/guarded')>()),
  runGuarded: (bin: string) => {
    probe.ran.push(bin);
    return Promise.resolve({ stdout: (bin in probe.versions ? probe.versions[bin] : probe.version) ?? '', stderr: '', code: 0 });
  }
}));

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(world.loginPath),
    extraBinDirs: () => [],
    resolveBinary: (bin: string, first: readonly string[] = []) => Promise.resolve(actual.resolveBinaryAgainst(bin, world.loginPath, [...first]))
  };
});

const spawned: Array<{ cwd: string; argv: string[] }> = [];
vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    installUserPath: () => Promise.resolve(world.loginPath),
    createSession: (input: { displayName: string; cwd: string; argv?: string[] }) => {
      if (world.spawnFails) return Promise.reject(new Error('no spawn'));
      spawned.push({ cwd: input.cwd, argv: [...(input.argv ?? [])] });
      return Promise.resolve({ sessionId: `$${String(spawned.length)}`, tmuxName: input.displayName, createdAt: 0, attached: false, windows: 1, panePid: 40_000 });
    },
    setSessionOption: () => Promise.resolve(),
    execTmux: () => Promise.resolve('')
  };
});

vi.mock('../../context/snapshot', () => ({ recordLaunchContext: () => undefined }));

vi.mock('../../settings/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../settings/store')>()),
  getSettings: () => ({
    envPassthrough: {},
    envPassthroughShared: [],
    launchDefaults: {},
    captureDefaults: {},
    usage: { claude: false, codex: false, antigravity: world.on, bar: 'five' }
  })
}));

vi.mock('../../config/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/store')>();
  const row = (id: string): ReturnType<typeof actual.agentEntry> => {
    const entry = actual.agentEntry(id);
    return entry === null ? null : { ...entry, extraProbeDirs: [...world.probeDirs], storeDirs: [] };
  };
  return {
    ...actual,
    agentEntry: row,
    launchableAgentEntry: (id: string) => {
      const entry = row(id);
      return entry === null || !entry.launchable || entry.launch === null ? null : (entry as ReturnType<typeof actual.launchableAgentEntry>);
    }
  };
});

vi.mock('../../specstory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../specstory')>();
  return {
    ...actual,
    wrapForCapture: (agent: string, inner: string[]) =>
      Promise.resolve(
        world.wrap
          ? {
              argv: ['/opt/specstory', 'run', agent, '--no-version-check', '--silent', '-c', inner.join(' ')],
              record: { enabled: true, bin: '/opt/specstory', binVersion: '2.8.0', provider: agent, exitCodeFidelity: 'collapsed', agentArgv: [...inner] },
              declined: null
            }
          : { argv: null, record: null, declined: 'declined for the test' }
      )
  };
});

const { AGENT_REGISTRY, getRegistryEntry, registryResumeArgv } = await import('../../agents/registry');
const { listDetectedAgents, resetAgentTableSource, resetDetectionCache, setAgentTableSource } = await import('../../agents/detection');
const { createLocalSession } = await import('../create-local');
const { restartSession } = await import('../../restart/restart');
const { recoverLaunchExtras } = await import('../../restart/extras');
const { buildArmedCommand } = await import('../../restore/command');
const { antigravitySettingsJson } = await import('../../usage/antigravity/script');
const { clearAntigravityUsage } = await import('../../usage/antigravity/folder');
const { antigravityWaiting, resetAntigravityLaunchForTests } = await import('../../usage/antigravity/launch');

const DIR = join(root, 'bin');
const PROJECT = join(root, 'project');
mkdirSync(PROJECT, { recursive: true });
const AGY = join(DIR, 'agy');
const USAGE = join(world.userData, 'gmux', 'antigravity-usage');
const JSON_VALUE = antigravitySettingsJson(join(USAGE, 'status.sh'));
/** A plain create's one element: the program as the parent spelled it, and the flag behind it. */
const lineOf = (program: string): string[] => [`${program} --settings '${JSON_VALUE}'`];
const LINE = lineOf('agy');
const CONVERSATION = '11111111-2222-4333-8444-555555555555';

/** A native file, as the health read tells one: its first two bytes are not `#!`. */
function native(path: string, mark: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `\xcf\xfa\xed\xfe ${mark}\n`, 'latin1');
  chmodSync(path, 0o755);
  return path;
}

beforeEach(async () => {
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
  vi.stubEnv('HOME', home);
  rmSync(world.userData, { recursive: true, force: true });
  rmSync(join(home, '.gemini'), { recursive: true, force: true });
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(join(world.userData, 'gmux'), { recursive: true });
  for (const entry of AGENT_REGISTRY) for (const bin of entry.binaries) if (!bin.includes('/')) native(join(DIR, bin), bin);
  Object.assign(world, { loginPath: `${DIR}:/usr/bin:/bin`, on: false, wrap: false, spawnFails: false, probeDirs: [] });
  probe.ran = [];
  probe.version = '1.5.16';
  probe.versions = {};
  spawned.length = 0;
  resetDetectionCache();
  resetAntigravityLaunchForTests();
  setAgentTableSource(() => [{ ...getRegistryEntry('antigravity'), extraProbeDirs: [], storeDirs: [] }]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDetectionCache();
  resetAgentTableSource();
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

function fakeManifest() {
  const rows = new Map<string, ManifestSessionRecord>();
  return {
    rows,
    insertSession: (rec: ManifestSessionRecord): void => void rows.set(rec.id, { ...rec }),
    updateSession: (id: string, patch: Partial<ManifestSessionRecord>): void => {
      const rec = rows.get(id);
      if (rec !== undefined) rows.set(id, { ...rec, ...patch });
    },
    getSession: (id: string) => rows.get(id),
    deleteSession: (id: string): void => void rows.delete(id)
  };
}
type Manifest = ReturnType<typeof fakeManifest>;

function depsOf(manifest: Manifest): Parameters<typeof createLocalSession>[1] {
  return {
    manifest: manifest as never,
    hookServer: {} as never,
    liveIds: new Map(),
    byTmuxId: new Map(),
    createsInFlight: new Map(),
    broadcastSessions: () => undefined,
    startIdCapture: () => undefined,
    cachedAgentVersion: () => null,
    lastFittedSize: () => null
  };
}

interface Made {
  readonly id: string;
  readonly pane: string[];
  readonly rec: ManifestSessionRecord;
  readonly manifest: Manifest;
}

async function create(agent: string, extra: Partial<CreateSessionInput> = {}, manifest = fakeManifest()): Promise<Made> {
  const at = spawned.length;
  const session = await createLocalSession({ name: 'one', projectPath: PROJECT, agent: agent as CreateSessionInput['agent'], ...extra }, depsOf(manifest));
  const rec = manifest.getSession(session.id);
  const spawn = spawned[at];
  if (rec === undefined || spawn === undefined) throw new Error('no row or no spawn');
  return { id: session.id, pane: spawn.argv, rec, manifest };
}

/** An argv with the ids a create mints written `ID`. */
const minted = (argv: readonly string[], rec: ManifestSessionRecord): string[] =>
  argv.map((t) => t.split(rec.agentSessionId ?? '\0').join('ID').split(rec.id).join('SID'));

const filesUnderUsage = (): string[] => (existsSync(USAGE) ? readdirSync(USAGE).sort() : []);

describe('L1: off, or any other agent, the spawned argv is the parent’s, element for element', () => {
  it('antigravity, off: the bare name and the person’s flags, the absolute path recorded, and no file made', async () => {
    await listDetectedAgents();
    for (const extraArgs of [[], ['--model', 'm'], ['--settings', '/x.json']]) {
      const made = await create('antigravity', { extraArgs });
      expect(made.pane).toEqual(['agy', ...extraArgs]);
      expect(made.rec.argv).toEqual([AGY, ...extraArgs]);
      expect(made.rec.resumeArgv ?? []).toEqual([]);
    }
    expect(filesUnderUsage()).toEqual([]);
    expect(existsSync(USAGE)).toBe(false);
    expect(probe.ran).toHaveLength(1);
  });

  it('every other launchable agent and a plain shell: the same argv with the switch on as off', async () => {
    const ids = ['shell', ...AGENT_REGISTRY.filter((e) => e.launchable && e.id !== 'antigravity' && e.id !== 'cursor').map((e) => e.id as string)];
    expect(ids.length).toBeGreaterThan(8);
    await listDetectedAgents();
    // agy replaces itself, so a create that asked about it would read it again.
    native(`${AGY}.new`, 'two');
    renameSync(`${AGY}.new`, AGY);
    for (const id of ids) {
      const both: string[][] = [];
      for (const on of [false, true]) {
        world.on = on;
        const made = await create(id, { extraArgs: id === 'shell' ? [] : ['--x'], startAnyway: true });
        both.push(minted(made.pane, made.rec), minted(made.rec.argv, made.rec), minted(made.rec.resumeArgv ?? [], made.rec));
      }
      expect([id, both.slice(3)]).toEqual([id, both.slice(0, 3)]);
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(probe.ran).toHaveLength(1);
    expect(existsSync(USAGE)).toBe(false);
  });

  it('a captured session, on: the wrap the parent spawned, and the row’s word is captured', async () => {
    await listDetectedAgents();
    world.on = true;
    world.wrap = true;
    const made = await create('antigravity', { capture: true });
    expect(made.pane).toEqual(['/opt/specstory', 'run', 'antigravity', '--no-version-check', '--silent', '-c', 'agy']);
    expect(made.rec.argv.join(' ')).not.toContain('--settings');
    expect(filesUnderUsage()).toEqual([]);
    expect(antigravityWaiting()).toBe('captured');
  });

  it('a capture that was declined launches bare, so it carries the flag', async () => {
    await listDetectedAgents();
    world.on = true;
    const made = await create('antigravity', { capture: true });
    expect(made.pane).toEqual(LINE);
  });
});

describe('L2: on, straight after the program on the argv about to start, and nowhere else', () => {
  it('the pane has it, the row does not, and a Restart recovers exactly the person’s own flags', async () => {
    await listDetectedAgents();
    world.on = true;
    const made = await create('antigravity', { extraArgs: ['--model', 'm'] });
    expect(made.pane).toEqual(['agy', '--settings', JSON_VALUE, '--model', 'm']);
    expect(made.rec.argv).toEqual([AGY, '--model', 'm']);
    expect(made.rec.resumeArgv ?? []).toEqual([]);
    expect(JSON.stringify(made.rec)).not.toContain('settings');
    expect(JSON.stringify(made.rec)).not.toContain('statusLine');
    expect(recoverLaunchExtras(made.rec)).toEqual(['--model', 'm']);
    expect(filesUnderUsage()).toEqual([`${made.id}.json`, 'status.sh'].sort());
    expect(readFileSync(join(USAGE, `${made.id}.json`), 'utf8')).toBe('{}\n');
  });

  it('an agy the PATH does not name starts by its absolute path, and the flag follows that', async () => {
    const other = join(root, 'other');
    native(join(other, 'agy'), 'only here');
    rmSync(AGY);
    world.probeDirs = [other];
    setAgentTableSource(() => [{ ...getRegistryEntry('antigravity'), extraProbeDirs: [other], storeDirs: [] }]);
    await listDetectedAgents();
    world.on = true;
    const made = await create('antigravity');
    expect(made.pane).toEqual(lineOf(join(other, 'agy')));
    expect(made.rec.argv).toEqual([join(other, 'agy')]);
  });

  it('a program with nothing after it stays ONE element, so the person’s shell still starts it; with flags the elements stay elements', async () => {
    await listDetectedAgents();
    for (const on of [false, true]) {
      world.on = on;
      expect([on, (await create('antigravity')).pane]).toEqual([on, on ? LINE : ['agy']]);
      expect([on, (await create('antigravity', { extraArgs: ['-x'] })).pane.length]).toEqual([on, on ? 4 : 2]);
    }
    expect(LINE[0]?.split("'")).toHaveLength(3);
  });

  it('the row is written before anything of this is read or made', async () => {
    await listDetectedAgents();
    world.on = true;
    const manifest = fakeManifest();
    let atInsert: string[] | null = null;
    const insert = manifest.insertSession;
    manifest.insertSession = (rec) => {
      atInsert = filesUnderUsage();
      insert(rec);
    };
    const made = await create('antigravity', {}, manifest);
    expect(atInsert).toEqual([]);
    expect(made.pane).toEqual(LINE);
  });

  it('a spawn that fails leaves no row and no place', async () => {
    await listDetectedAgents();
    world.on = true;
    world.spawnFails = true;
    const manifest = fakeManifest();
    await expect(create('antigravity', {}, manifest)).rejects.toThrow('no spawn');
    expect(manifest.rows.size).toBe(0);
    expect(filesUnderUsage()).toEqual(['status.sh']);
  });
});

describe('L3: nothing that is typed, restored or recorded ever carries it', () => {
  it('the armed resume of a row made with the switch on is the parent’s line', async () => {
    await listDetectedAgents();
    world.on = true;
    const made = await create('antigravity', { extraArgs: ['--model', 'm'] });
    const line = buildArmedCommand(registryResumeArgv('antigravity' as never, CONVERSATION, recoverLaunchExtras(made.rec) ?? [], made.rec.argv[0], false));
    expect(line).toBe(`${AGY} --conversation ${CONVERSATION} --model m`);
  });

  it('a Restart is a create: its row is the parent’s and its new session carries the flag', async () => {
    await listDetectedAgents();
    world.on = true;
    const first = await create('antigravity', { extraArgs: ['--model', 'm'] });
    const at = spawned.length;
    const outcome = await restartSession(
      {
        manifest: { getSession: (id) => first.manifest.getSession(id) },
        createSession: (input) => createLocalSession(input, depsOf(first.manifest)),
        killSession: () => Promise.resolve(),
        discardSession: () => undefined,
        broadcastSessions: () => undefined
      },
      first.id
    );
    expect(outcome.extras).toEqual(['--model', 'm']);
    expect(spawned[at]?.argv).toEqual(['agy', '--settings', JSON_VALUE, '--model', 'm']);
    expect(first.manifest.getSession(outcome.session.id)?.argv).toEqual([AGY, '--model', 'm']);
  });

  it('one caller in the product, and no typed or restored path names the meter', () => {
    const at = (rel: string): string => readFileSync(resolve(process.cwd(), rel), 'utf8');
    const create = at('src/main/sessions/create-local.ts');
    expect(create.match(/antigravityMeterArgs\(/g)).toHaveLength(1);
    const call = create.indexOf('antigravityMeterArgs({');
    // A needle that has gone is at -1, which is before everything.
    const row = create.indexOf('deps.manifest.insertSession(record)');
    expect(row).toBeGreaterThan(-1);
    expect(row).toBeLessThan(call);
    expect(create.indexOf('await tmux.createSession({')).toBeGreaterThan(call);
    const folders = ['src/main/restore', 'src/main/restart', 'src/main/machines', 'src/main/manifest'];
    const files = ['src/main/sessions/resume-in-place.ts', 'src/main/sessions/resume-argv.ts', 'src/main/sessions/launch-plan.ts'];
    for (const folder of folders) for (const name of readdirSync(resolve(process.cwd(), folder))) if (name.endsWith('.ts')) files.push(join(folder, name));
    for (const rel of files) expect([rel, /antigravityMeterArgs|usage\/antigravity/.test(at(rel))]).toEqual([rel, false]);
  });
});

describe('L4: every doubt is the parent’s argv', () => {
  const plain = async (): Promise<string[]> => (await create('antigravity')).pane;
  beforeEach(() => {
    world.on = true;
  });

  it('no scan yet: none, and the row is read once after the create answered, so the next carries it', async () => {
    expect(await plain()).toEqual(['agy']);
    await vi.waitFor(() => expect(probe.ran).toEqual([AGY]));
    await new Promise((r) => setTimeout(r, 10));
    expect(await plain()).toEqual(LINE);
    expect(probe.ran).toEqual([AGY]);
  });

  it('a file replaced since the scan: that session none, exactly one reading more, the next one carries it', async () => {
    await listDetectedAgents();
    native(`${AGY}.new`, 'two');
    renameSync(`${AGY}.new`, AGY);
    expect(await plain()).toEqual(['agy']);
    expect(antigravityWaiting()).toBe('session');
    await vi.waitFor(() => expect(probe.ran).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 10));
    for (let i = 0; i < 2; i += 1) expect(await plain()).toEqual(LINE);
    expect(probe.ran).toHaveLength(2);
  });

  it('below the floor, and a reading that is not a version: none, and no second reading', async () => {
    for (const version of ['1.4.9', 'unknown', null]) {
      resetDetectionCache();
      probe.ran = [];
      probe.version = version;
      await listDetectedAgents();
      expect([version, await plain()]).toEqual([version, ['agy']]);
      await new Promise((r) => setTimeout(r, 10));
      expect(probe.ran).toHaveLength(1);
    }
    expect(filesUnderUsage()).toEqual([]);
  });

  it('a shim whose real file is a version manager’s, and a wrapper script: none', async () => {
    rmSync(AGY);
    native(join(root, 'mise'), 'mise');
    symlinkSync(join(root, 'mise'), AGY);
    await listDetectedAgents();
    expect(await plain()).toEqual(['agy']);
    rmSync(AGY);
    writeFileSync(AGY, '#!/bin/sh\nexec /nowhere/agy "$@"\n');
    chmodSync(AGY, 0o755);
    resetDetectionCache();
    await listDetectedAgents();
    expect((await create('antigravity', { startAnyway: true })).pane).toEqual(['agy']);
    expect(filesUnderUsage()).toEqual([]);
  });

  it('a bare name that finds a project’s own agy: none', async () => {
    native(join(PROJECT, 'node_modules', '.bin', 'agy'), 'own');
    world.loginPath = `node_modules/.bin:${DIR}:/usr/bin:/bin`;
    await listDetectedAgents();
    expect(await plain()).toEqual(['agy']);
    rmSync(join(PROJECT, 'node_modules'), { recursive: true });
    expect(await plain()).toEqual(LINE);
  });

  it('another agy on the PATH below the floor, or unread: a plain create carries none, and one with flags, whose file is known, does', async () => {
    const second = join(root, 'second');
    native(join(second, 'agy'), 'another');
    world.loginPath = `${DIR}:${second}:/usr/bin:/bin`;
    await listDetectedAgents();
    expect(probe.ran).toHaveLength(2);
    expect(await plain()).toEqual(LINE);
    for (const version of ['1.4.9', null]) {
      resetDetectionCache();
      probe.version = '1.5.16';
      probe.versions = { [join(second, 'agy')]: version };
      await listDetectedAgents();
      expect([version, await plain()]).toEqual([version, ['agy']]);
      expect(antigravityWaiting()).toBe('version');
      expect((await create('antigravity', { extraArgs: ['-x'] })).pane).toEqual(['agy', '--settings', JSON_VALUE, '-x']);
    }
    rmSync(second, { recursive: true });
  });

  it('the person’s own --settings, and their own status line under the home: none', async () => {
    await listDetectedAgents();
    expect((await create('antigravity', { extraArgs: ['-settings=/x.json'] })).pane).toEqual(['agy', '-settings=/x.json']);
    mkdirSync(join(home, '.gemini', 'antigravity-cli'), { recursive: true });
    writeFileSync(join(home, '.gemini', 'antigravity-cli', 'settings.json'), '{"statusLine":{"type":"command","command":"mine"}}');
    expect(await plain()).toEqual(['agy']);
    expect(filesUnderUsage()).toEqual([]);
  });

  it('a session that died at once holds that file, and the next starts without the flag', async () => {
    const { noteAntigravityDeath } = await import('../../usage/antigravity/launch');
    await listDetectedAgents();
    const made = await create('antigravity');
    expect(made.pane).toEqual(LINE);
    noteAntigravityDeath(made.id, 1, undefined);
    expect(await plain()).toEqual(['agy']);
    expect(antigravityWaiting()).toBe('start-failed');
  });

  it('off again after on: the parent’s argv, and nothing is read again', async () => {
    await listDetectedAgents();
    expect(await plain()).toEqual(LINE);
    world.on = false;
    clearAntigravityUsage();
    native(`${AGY}.new`, 'two');
    renameSync(`${AGY}.new`, AGY);
    expect(await plain()).toEqual(['agy']);
    await new Promise((r) => setTimeout(r, 10));
    expect(probe.ran).toHaveLength(1);
    expect(existsSync(USAGE)).toBe(false);
  });
});
