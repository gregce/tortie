/**
 * Phase 335. A harness launch version-probes no agent its mode did not name
 * (build/p335/SPEC.md §6 and §7).
 *
 * WHY THIS FILE EXISTS. The operator's rule of 2026-09-29 is that Gemini,
 * Qwen, Antigravity and Grok are never started by any run, not even
 * `--version`, because each updates itself on start. A `GMUX_SMOKE` launch
 * returns at `dispatchHarness` before the configuration overlay is installed,
 * so its scan walks the compiled registry, and Phase 316.6's reverify caught
 * `agy --version` under `smoke:t1`. The fix holds every version probe in a
 * harness launch unless the running mode named the agent, and changes nothing
 * in an ordinary launch.
 *
 * Every case here spawns `/bin/sh` shims through the real `runGuarded`, as
 * detection-identity.test.ts does. The login-shell PATH and the extra bin
 * directories are faked to scratch directories, as p164-boot-warm.test.ts
 * does, so no agent on this Mac can ever be the thing that answers. Each shim
 * appends one line, `$0 $*`, to a marker file before it answers, so "nothing
 * ran" is read from the disk and not only from a counter.
 *
 * Titles start with the clause id from SPEC §7 so an ablation can name the row.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENT_REGISTRY, type AgentRegistryEntry } from '../registry';

const root = mkdtempSync(join(tmpdir(), 'gmux-p335-'));
/** Every shim appends `$0 $*` here before it answers. */
const marker = join(root, 'ran.log');
/** The extra bin directory detection walks after PATH. Always empty. */
const extraDir = join(root, 'extra');
mkdirSync(extraDir, { recursive: true });

/** What the faked login-shell PATH answers; each case sets its own. */
let userPathValue = '';

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(userPathValue),
    extraBinDirs: () => [extraDir]
  };
});

const {
  detectionScanCount,
  listDetectedAgents,
  nameHarnessVersionProbes,
  rescanAgents,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource,
  versionProbeCount,
  versionProbeHeld,
  warmDetectionAtBoot
} = await import('../detection');

/** The four harness terms launch-gate.ts reads. */
const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL'] as const;

function clearHarnessTerms(): void {
  for (const name of HARNESS_TERMS) vi.stubEnv(name, undefined);
}

beforeEach(() => {
  clearHarnessTerms();
  rmSync(marker, { force: true });
  resetDetectionCache();
  nameHarnessVersionProbes({ agents: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
  nameHarnessVersionProbes({ agents: [] });
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The lines the shims wrote, in the order they reached the disk. */
function ran(): string[] {
  if (!existsSync(marker)) return [];
  return readFileSync(marker, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0);
}

/** One executable shim that records its run, then does `answer`. */
function shim(dir: string, name: string, answer: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\necho "$0 $*" >> '${marker}'\n${answer}\n`);
  chmodSync(path, 0o755);
  return path;
}

/** A registry row shaped as the compiled ones are, under a scratch id and binary. */
function row(id: string, versionProbe: unknown): AgentRegistryEntry {
  return {
    id,
    displayName: id,
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: [id],
    extraProbeDirs: [],
    storeDirs: [],
    versionProbe,
    launch: { argv: [id] },
    resume: { strategy: 'none' }
  } as unknown as AgentRegistryEntry;
}

// ---------------------------------------------------------------------------
// The three-agent table T3, T4, T5 and T7 scan
// ---------------------------------------------------------------------------

const dir1 = join(root, 'path1');
const dir2 = join(root, 'path2');
/** Carries an identity substring, and is an impostor: it greets as something else. */
const impostor = shim(dir1, 'p335-impostor', "echo '9.9.9 somebody else'");
/** Prints nothing for its primary args, so the fallback is what answers. */
const fallback = shim(dir1, 'p335-fallback', `if [ "$1" = "version" ]; then echo '4.5.6'; fi`);
/** Found twice, so its second copy is a shadowed one. */
const twice = shim(dir1, 'p335-twice', "echo '1.0.0'");
const twiceShadow = shim(dir2, 'p335-twice', "echo '2.0.0'");

const THREE = [
  row('p335-impostor', { args: ['--version'], identitySubstring: '(P335 Agent)' }),
  row('p335-fallback', { args: ['--version'], fallbackArgs: ['version'] }),
  row('p335-twice', { args: ['-v'] })
];

function useThree(): void {
  userPathValue = `${dir1}:${dir2}`;
  setAgentTableSource(() => THREE);
}

/** What a held scan must answer: every row found, nothing run. */
async function expectHeldScan(): Promise<void> {
  useThree();
  const scan = await rescanAgents();
  expect(ran()).toEqual([]);
  expect(versionProbeCount()).toBe(0);
  for (const [id, path] of [
    ['p335-impostor', impostor],
    ['p335-fallback', fallback],
    ['p335-twice', twice]
  ] as const) {
    const one = scan.agents.find((a) => a.id === id);
    expect(one?.installed, id).toBe(true);
    expect(one?.binPath, id).toBe(path);
    expect(one?.realPath, id).toBe(realpathSync(path));
    expect(one?.version, id).toBeNull();
  }
  expect(scan.agents.find((a) => a.id === 'p335-twice')?.shadowed).toEqual([
    { path: twiceShadow, version: null }
  ]);
}

/** What an ordinary scan must answer: every shim ran exactly as it does today. */
async function expectProbedScan(): Promise<void> {
  useThree();
  const scan = await rescanAgents();
  const lines = ran();
  expect([...lines].sort()).toEqual(
    [
      `${impostor} --version`,
      `${fallback} --version`,
      `${fallback} version`,
      `${twice} -v`,
      `${twiceShadow} -v`
    ].sort()
  );
  // The fallback is asked only after its primary printed nothing.
  expect(lines.indexOf(`${fallback} version`)).toBeGreaterThan(lines.indexOf(`${fallback} --version`));
  expect(versionProbeCount()).toBe(lines.length);
  const byId = new Map(scan.agents.map((a) => [a.id, a]));
  // The impostor is refused as it is today.
  expect(byId.get('p335-impostor')?.installed).toBe(false);
  expect(byId.get('p335-impostor')?.version).toBeNull();
  expect(byId.get('p335-fallback')?.installed).toBe(true);
  expect(byId.get('p335-fallback')?.version).toBe('4.5.6');
  expect(byId.get('p335-twice')?.version).toBe('1.0.0');
  expect(byId.get('p335-twice')?.shadowed).toEqual([{ path: twiceShadow, version: '2.0.0' }]);
}

// ---------------------------------------------------------------------------
// The within fixture T2 and T8 read
// ---------------------------------------------------------------------------

const w = join(root, 'w2');
const inner = join(w, 'inner', 'x');
const decoy = join(`${w}-b`, 'x');
const outside = join(root, 'o2', 'x');
const plantedLink = join(w, 'link');
/** A second spelling of `w`, so a comparison as written cannot pass. */
const wAlias = join(root, 'w2-alias');
for (const file of [inner, decoy, outside]) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, '');
}
symlinkSync(outside, plantedLink);
symlinkSync(w, wAlias);

const SMOKE = { GMUX_SMOKE: 'create' } as NodeJS.ProcessEnv;
const IDS = AGENT_REGISTRY.map((entry) => entry.id as string);

describe('Phase 335, the predicate', () => {
  it('T1 an ordinary launch holds nothing, whatever is named; a harness launch with nothing named holds every id', () => {
    const notIsolated: NodeJS.ProcessEnv[] = [
      {},
      { GMUX_PROBES: '1' },
      { GMUX_UPDATE_REHEARSAL: '1' },
      { GMUX_SMOKE: '' },
      { GMUX_SHOT: '' }
    ];
    const namings = [{ agents: [] }, { agents: IDS }, { agents: IDS, within: w }];
    for (const naming of namings) {
      nameHarnessVersionProbes(naming);
      for (const env of notIsolated) {
        for (const id of IDS) {
          expect(versionProbeHeld(id, inner, env), `${id} ${JSON.stringify(env)}`).toBe(false);
          expect(versionProbeHeld(id, outside, env), `${id} ${JSON.stringify(env)}`).toBe(false);
        }
      }
    }
    nameHarnessVersionProbes({ agents: [] });
    for (const env of [SMOKE, { GMUX_SHOT: '/x.png' } as NodeJS.ProcessEnv]) {
      for (const id of IDS) expect(versionProbeHeld(id, inner, env), `${id} ${JSON.stringify(env)}`).toBe(true);
    }
  });

  it('T2 a naming probes only its agents, and with a within only a real path strictly under it', () => {
    nameHarnessVersionProbes({ agents: ['pi'] });
    for (const id of IDS) {
      expect(versionProbeHeld(id, outside, SMOKE), id).toBe(id !== 'pi');
    }

    nameHarnessVersionProbes({ agents: ['pi'], within: w });
    expect(versionProbeHeld('pi', inner, SMOKE)).toBe(false);
    expect(versionProbeHeld('pi', realpathSync(inner), SMOKE)).toBe(false);
    // The directory itself is not under itself.
    expect(versionProbeHeld('pi', w, SMOKE)).toBe(true);
    // `<w>-b/x` shares the prefix `<w>` and is not under it.
    expect(versionProbeHeld('pi', decoy, SMOKE)).toBe(true);
    expect(versionProbeHeld('pi', outside, SMOKE)).toBe(true);
    // A symlink planted inside `within` that points outside it is held.
    expect(versionProbeHeld('pi', plantedLink, SMOKE)).toBe(true);
    for (const id of IDS.filter((one) => one !== 'pi')) {
      expect(versionProbeHeld(id, inner, SMOKE), id).toBe(true);
    }

    // REAL paths are compared: `within` named through an alias still admits
    // a copy spelled through the directory itself, and holds the decoy.
    nameHarnessVersionProbes({ agents: ['pi'], within: wAlias });
    expect(versionProbeHeld('pi', inner, SMOKE)).toBe(false);
    expect(versionProbeHeld('pi', join(wAlias, 'inner', 'x'), SMOKE)).toBe(false);
    expect(versionProbeHeld('pi', plantedLink, SMOKE)).toBe(true);
    expect(versionProbeHeld('pi', decoy, SMOKE)).toBe(true);
  });

  it('T8 the default names nothing, a naming is a copy, and resetDetectionCache neither widens nor clears it', async () => {
    // The module's OWN default, read from a fresh instance, because every case
    // in this file narrows back by naming nothing.
    vi.resetModules();
    const fresh = await import('../detection');
    for (const id of IDS) {
      for (const path of [inner, outside, w]) expect(fresh.versionProbeHeld(id, path, SMOKE), id).toBe(true);
    }
    // The naming copies the list it is handed.
    const list = ['pi'];
    nameHarnessVersionProbes({ agents: list });
    list.push('claude');
    expect(versionProbeHeld('pi', outside, SMOKE)).toBe(false);
    expect(versionProbeHeld('claude', outside, SMOKE)).toBe(true);

    nameHarnessVersionProbes({ agents: ['pi'], within: w });
    resetDetectionCache();
    expect(versionProbeHeld('pi', inner, SMOKE)).toBe(false);
    expect(versionProbeHeld('pi', outside, SMOKE)).toBe(true);
    for (const id of IDS.filter((one) => one !== 'pi')) {
      expect(versionProbeHeld(id, inner, SMOKE), id).toBe(true);
    }
  });
});

describe('Phase 335, the hold in front of every spawn', () => {
  it('T3 a GMUX_SMOKE scan resolves every row and runs nothing', async () => {
    vi.stubEnv('GMUX_SMOKE', 'create');
    await expectHeldScan();
  });

  it('T3 a GMUX_SHOT scan resolves every row and runs nothing', async () => {
    vi.stubEnv('GMUX_SHOT', '/x.png');
    await expectHeldScan();
  });

  it('T4 an ordinary launch probes exactly as it did before the phase', async () => {
    await expectProbedScan();
  });

  it('T5 a GMUX_PROBES launch still probes (the hidden-agents file guards that class)', async () => {
    vi.stubEnv('GMUX_PROBES', '1');
    await expectProbedScan();
  });

  it('T6 a named agent is probed only for its copies inside within; the copy outside and an unnamed agent are held', async () => {
    vi.stubEnv('GMUX_SMOKE', 'shadow');
    const w6 = join(root, 'w6');
    const wa = join(w6, 'a');
    const wb = join(w6, 'b');
    const o6 = join(root, 'o6');
    const named = shim(wa, 'p335-named', "echo '1.0.0-a'");
    const namedShadow = shim(wb, 'p335-named', "echo '1.0.0-b'");
    const namedOutside = shim(o6, 'p335-named', "echo '1.0.0-o'");
    const unnamed = shim(wa, 'p335-unnamed', "echo '7.0.0'");
    userPathValue = `${wa}:${wb}:${o6}`;
    setAgentTableSource(() => [
      row('p335-named', { args: ['--version'] }),
      row('p335-unnamed', { args: ['--version'] })
    ]);
    nameHarnessVersionProbes({ agents: ['p335-named'], within: w6 });

    const scan = await rescanAgents();
    const byId = new Map(scan.agents.map((a) => [a.id, a]));
    expect(byId.get('p335-named')?.binPath).toBe(named);
    expect(byId.get('p335-named')?.version).toBe('1.0.0-a');
    expect(byId.get('p335-named')?.shadowed).toEqual([
      { path: namedShadow, version: '1.0.0-b' },
      { path: namedOutside, version: null }
    ]);
    expect(byId.get('p335-unnamed')?.installed).toBe(true);
    expect(byId.get('p335-unnamed')?.binPath).toBe(unnamed);
    expect(byId.get('p335-unnamed')?.version).toBeNull();
    expect([...ran()].sort()).toEqual([`${named} --version`, `${namedShadow} --version`].sort());
    expect(ran().some((line) => line.startsWith(namedOutside))).toBe(false);
    expect(versionProbeCount()).toBe(2);
  });

  it('T7 the boot warm under GMUX_SMOKE starts one scan and no probe', async () => {
    vi.stubEnv('GMUX_SMOKE', 'create');
    useThree();
    expect(warmDetectionAtBoot([])).toBe(true);
    const scan = await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
    expect(versionProbeCount()).toBe(0);
    expect(ran()).toEqual([]);
    expect(scan.agents.map((a) => a.binPath)).toEqual([impostor, fallback, twice]);
  });
});
