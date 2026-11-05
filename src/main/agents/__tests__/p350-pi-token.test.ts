/**
 * Phase 350 — pi's inline token, its floor and the scan the floor is read from
 * (build/p350/SPEC.md §4.1, §4.2 step 1, D2, D11, D15, D19, D20, D25).
 *
 * What is pinned, each in the shape that can be undone in a line:
 *
 *  1. THE CONSTANTS AND THE ONE FLOOR RULE. `PI_INLINE_ARGS` is
 *     `['--tui-mode', 'regular']`, `PI_INLINE_FLOOR` is `0.84.0`, and
 *     `piInlineFloor` reads a version through the SpecStory reader and
 *     comparator (§7.1 11.8's nine values, byte for byte).
 *  2. THE COMPOSERS. With the floor held, the token goes straight after argv[0]
 *     for pi ALONE, on the launch and on both branches of the resume, every
 *     guard still asked first; without it every row composes what it composed
 *     at the parent, and Codex's and Claude's argvs are byte identical either
 *     way. The planted argvs are M2's (§2.2).
 *  3. THE RECORD AND THE SET-ASIDE. pi is a switch whose token is in neither
 *     its `launch.argv` nor its `resume.template`, `fixedLaunchTokens('pi')`
 *     names the token at every version, and the record's `measured` string is
 *     unique in the registry source (`ablation:p331` anchors on it).
 *  4. THE SCAN. `piInlineFloorFor` reads the last RESOLVED scan for ONE binary
 *     and answers `unread` until the whole scan has answered (M2's slow-row
 *     finding) and, since the fix round, for every file but the one the scan
 *     read pi's version from, as it was then; `firstScanAnswered` settles with
 *     the first scan that resolves, only after that scan read every probe,
 *     starts nothing, and is made fresh by `resetDetectionCache`.
 *
 * HERMETIC. The scan walks a planted table whose pi row's binary is a `/bin/sh`
 * shim in a scratch directory, over a faked login-shell PATH, as
 * p335-harness-probes.test.ts does, so no agent on this Mac can answer. Each
 * shim appends `$0 $*` to a marker file, so "nothing ran" is read from disk.
 * Since his ruling of 2026-11-02 (R1) the floor holds only inside pi's own
 * package, so pi's two shims are planted as npm lays pi out (./pi-install.ts):
 * the package's `dist/` files, each reached by a link on the scratch PATH.
 */

import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
    getPath: () => userData,
    getVersion: () => '0.0.0-p350'
  }
}));

const root = mkdtempSync(join(tmpdir(), 'gmux-p350-token-'));
const binDir = join(root, 'bin');
const extraDir = join(root, 'extra');
mkdirSync(binDir, { recursive: true });
mkdirSync(extraDir, { recursive: true });
const marker = join(root, 'ran.log');

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(binDir),
    extraBinDirs: () => [extraDir]
  };
});

const {
  AGENT_REGISTRY,
  fixedLaunchTokens,
  getLaunchableEntry,
  getRegistryEntry,
  LAUNCHABLE_AGENT_IDS,
  launchArgvFor,
  ownLaunchFlags,
  PI_INLINE_ARGS,
  PI_INLINE_FLOOR,
  piInlineFloor,
  registryLaunchArgv,
  registryResumeArgv,
  resumeArgvFor,
  SESSION_ID_SLOT
} = await import('../registry');
const {
  detectionScanCount,
  firstScanAnswered,
  listDetectedAgents,
  piInlineFloorFor,
  piOwnResumeArgv,
  rescanAgents,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource,
  versionProbeCount
} = await import('../detection');
const { buildLaunchSpec, resolveLaunchSpec } = await import('../../manifest/agents');

import type { DetectableAgentEntry } from '../detection';
import type { AgentRegistryEntry } from '../registry';
import { plantNpmPi } from './pi-install';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_SOURCE = join(HERE, '..', 'registry.ts');

const PI = '/Users/x/.npm-global/bin/pi';
const U = '019a0000-0000-7000-8000-000000000001';
const TOK = ['--tui-mode', 'regular'];

/** The four harness terms launch-gate.ts reads; none may hold a probe here. */
const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL'] as const;

beforeEach(() => {
  userData = mkdtempSync(join(root, 'userdata-'));
  for (const name of HARNESS_TERMS) vi.stubEnv(name, undefined);
  rmSync(marker, { force: true });
  resetDetectionCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// 1. The constants and the one floor rule
// ---------------------------------------------------------------------------

describe('the token and its floor', () => {
  it('PI_INLINE_ARGS and PI_INLINE_FLOOR are spelled as pi reads them', () => {
    expect([...PI_INLINE_ARGS]).toEqual(TOK);
    expect(PI_INLINE_FLOOR).toBe('0.84.0');
  });

  it("piInlineFloor reads §7.1 11.8's nine versions byte for byte", () => {
    const cases: Array<[string | null, string]> = [
      [null, 'unread'],
      ['', 'unread'],
      ['garbage', 'unread'],
      ['0.83.9', 'below'],
      ['0.84.0', 'holds'],
      ['0.84.2', 'holds'],
      ['0.99.2', 'holds'],
      ['1.4.0', 'holds'],
      ['10.0.0', 'holds']
    ];
    for (const [version, want] of cases) {
      expect(piInlineFloor(version), String(version)).toBe(want);
    }
  });

  it('reads only the version alone, as pi -v prints it, and a prerelease of the floor as below it (the fix round)', () => {
    // The floor decides a flag that stops an older pi after its trust
    // question, so a line with anything around the version is no reading, and
    // nor is a line whose FIRST dotted triple may be another program's.
    expect(piInlineFloor('pi 0.84.2')).toBe('unread');
    expect(piInlineFloor('v0.83.0')).toBe('unread');
    expect(piInlineFloor('22.11.0 node')).toBe('unread');
    expect(piInlineFloor(' 0.84.2')).toBe('unread');
    // No dotted triple is no reading, whatever else is printed.
    expect(piInlineFloor('0.84')).toBe('unread');
    expect(piInlineFloor('env: node: No such file or directory')).toBe('unread');
    // A prerelease or build of the floor itself is below it, as semver orders
    // it; one of a later version is past it, because the shared comparison
    // reads the three numbers.
    expect(piInlineFloor('0.84.0-rc.1')).toBe('below');
    expect(piInlineFloor('0.84.0+build.7')).toBe('below');
    expect(piInlineFloor('0.84.1-rc.1')).toBe('holds');
    expect(piInlineFloor('1.5.0-beta.2')).toBe('holds');
    expect(piInlineFloor('0.83.9-rc.1')).toBe('below');
    // 0.10 is after 0.9, numerically.
    expect(piInlineFloor('0.100.0')).toBe('holds');
    expect(piInlineFloor('0.9.99')).toBe('below');
  });
});

// ---------------------------------------------------------------------------
// 2. The composers
// ---------------------------------------------------------------------------

describe('the two composers put the token straight after argv[0], for pi alone', () => {
  it("M2's composition: launch and resume are one argv with the floor, today's without it", () => {
    const entry = getLaunchableEntry('pi');
    const head = [PI, ...TOK, '--session-id', U, '--model', 'm'];
    expect(launchArgvFor(entry, ['--model', 'm'], PI, U, true)).toEqual(head);
    expect(resumeArgvFor(entry, U, ['--model', 'm'], PI, true)).toEqual(head);
    expect(registryLaunchArgv('pi', ['--model', 'm'], PI, U, true)).toEqual(head);
    expect(registryResumeArgv('pi', U, ['--model', 'm'], PI, true)).toEqual(head);

    const today = [PI, '--session-id', U, '--model', 'm'];
    for (const argv of [
      launchArgvFor(entry, ['--model', 'm'], PI, U, false),
      launchArgvFor(entry, ['--model', 'm'], PI, U),
      resumeArgvFor(entry, U, ['--model', 'm'], PI, false),
      resumeArgvFor(entry, U, ['--model', 'm'], PI),
      registryLaunchArgv('pi', ['--model', 'm'], PI, U),
      registryResumeArgv('pi', U, ['--model', 'm'], PI)
    ]) {
      expect(argv).toEqual(today);
    }
  });

  it("a person's own --tui-mode trails the token, so it wins (the last one wins in pi)", () => {
    const theirs = ['--tui-mode', 'fullscreen'];
    for (const argv of [
      registryLaunchArgv('pi', theirs, PI, U, true),
      registryResumeArgv('pi', U, theirs, PI, true)
    ]) {
      expect(argv).toEqual([PI, ...TOK, '--session-id', U, ...theirs]);
      expect(argv.lastIndexOf('--tui-mode')).toBeGreaterThan(argv.indexOf('regular'));
    }
  });

  it('every guard is still asked first, and the token never rescues a refused resume', () => {
    expect(registryResumeArgv('pi', '', [], PI, true)).toEqual([]);
    const lost = { ...getLaunchableEntry('pi'), resume: { ...getLaunchableEntry('pi').resume, template: ['--session-id'] } };
    expect(resumeArgvFor(lost, U, [], PI, true)).toEqual([]);
    const none = { ...getLaunchableEntry('pi'), resume: { ...getLaunchableEntry('pi').resume, strategy: 'none' as const } };
    expect(resumeArgvFor(none, U, [], PI, true)).toEqual([]);
  });

  it('the token leads on the leading branch of the resume too', () => {
    const entry = getLaunchableEntry('pi');
    const leading = { ...entry, resume: { ...entry.resume, resumeExtrasPosition: 'leading' as const } };
    expect(resumeArgvFor(leading, U, ['--x'], PI, true)).toEqual([PI, ...TOK, '--x', '--session-id', U]);
    expect(resumeArgvFor(leading, U, ['--x'], PI, false)).toEqual([PI, '--x', '--session-id', U]);
  });

  it('every other launchable row composes byte for byte the same with the floor held or not', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      if (id === 'pi') continue;
      const bin = `/abs/${id}`;
      expect(registryLaunchArgv(id, ['--own'], bin, U, true), id).toEqual(
        registryLaunchArgv(id, ['--own'], bin, U, false)
      );
      expect(registryResumeArgv(id, U, ['--own'], bin, true), id).toEqual(
        registryResumeArgv(id, U, ['--own'], bin, false)
      );
    }
    // A configured agent whose id is not pi is never handed the token either.
    const base = getLaunchableEntry('pi');
    const owl = { ...base, id: 'owl', binaries: ['owl'], launch: { ...base.launch, argv: ['owl'] } };
    expect(launchArgvFor(owl, [], '/abs/owl', U, true)).toEqual(['/abs/owl', '--session-id', U]);
  });

  it("resolveLaunchSpec, the create path's own call, hands the floor through", async () => {
    const held = await resolveLaunchSpec('pi', [], PI, true);
    expect(held.argv).toEqual([PI, ...TOK, '--session-id', held.agentSessionId]);
    expect(held.resumeArgv).toEqual(held.argv);
    const notHeld = await resolveLaunchSpec('pi', [], PI, false);
    expect(notHeld.argv).toEqual([PI, '--session-id', notHeld.agentSessionId]);
    expect((await resolveLaunchSpec('pi', [], PI)).argv).not.toContain('--tui-mode');
  });

  it('buildLaunchSpec hands the floor to both argvs a create records', () => {
    const held = buildLaunchSpec('pi', ['--model', 'm'], PI, true);
    expect(held.argv).toEqual([PI, ...TOK, '--session-id', held.agentSessionId, '--model', 'm']);
    expect(held.resumeArgv).toEqual(held.argv);
    const notHeld = buildLaunchSpec('pi', ['--model', 'm'], PI, false);
    expect(notHeld.argv).toEqual([PI, '--session-id', notHeld.agentSessionId, '--model', 'm']);
    expect(notHeld.resumeArgv).toEqual(notHeld.argv);
    expect(buildLaunchSpec('pi', [], PI).argv).not.toContain('--tui-mode');
    // Codex and Claude: identical specs either way, but for the minted id.
    for (const id of ['codex', 'claude'] as const) {
      const a = buildLaunchSpec(id, ['--x'], `/abs/${id}`, true);
      const b = buildLaunchSpec(id, ['--x'], `/abs/${id}`, false);
      const swap = (argv: readonly string[] | undefined, from?: string): string[] =>
        (argv ?? []).map((t) => (t === from ? 'ID' : t));
      expect(swap(a.argv, a.agentSessionId), id).toEqual(swap(b.argv, b.agentSessionId));
      expect(swap(a.resumeArgv, a.agentSessionId), id).toEqual(swap(b.resumeArgv, b.agentSessionId));
    }
  });
});

// ---------------------------------------------------------------------------
// 3. The record and the set-aside
// ---------------------------------------------------------------------------

describe("pi's record and its fixed tokens", () => {
  it('the token is in neither the launch argv nor the resume template, and the record names it', () => {
    const pi = getRegistryEntry('pi');
    expect(pi.launch?.argv).toEqual(['pi']);
    expect(pi.resume.template).toEqual(['--session-id', SESSION_ID_SLOT]);
    const screen = pi.screen;
    expect(screen?.class).toBe('switch-to-inline');
    if (screen?.class === 'switch-to-inline' && screen.carriage === 'argv') {
      expect(screen.tokens).toBe(PI_INLINE_ARGS);
      expect(screen.floor).toBe(PI_INLINE_FLOOR);
    } else {
      throw new Error("pi's record is not an argv switch");
    }
  });

  it('exactly three switch rows, and only pi names a floor', () => {
    const switched = AGENT_REGISTRY.filter((e) => e.screen?.class === 'switch-to-inline')
      .map((e) => `${e.id} (${String((e.screen as { carriage?: string }).carriage)})`)
      .sort();
    expect(switched).toEqual(['claude (env)', 'codex (argv)', 'pi (argv)']);
    const floored = AGENT_REGISTRY.filter(
      (e: AgentRegistryEntry) => (e.screen as { floor?: unknown } | undefined)?.floor !== undefined
    ).map((e) => e.id);
    expect(floored).toEqual(['pi']);
  });

  it("the record's measured string is unique in the registry source", () => {
    const pi = getRegistryEntry('pi').screen;
    const measured = pi?.measured ?? '';
    expect(measured).toContain('0.84.2');
    expect(measured).toContain('1.4.0');
    const source = readFileSync(REGISTRY_SOURCE, 'utf8');
    expect(source.split(`measured: '${measured}',`).length - 1).toBe(1);
  });

  it('fixedLaunchTokens names the token at every version, and ownLaunchFlags sets it aside only when it leads', () => {
    expect([...fixedLaunchTokens('pi')]).toEqual(TOK);
    expect([...fixedLaunchTokens('codex')]).toEqual(['-c', 'tui.fullscreen_transcript=false']);
    expect([...fixedLaunchTokens('claude')]).toEqual([]);
    expect(ownLaunchFlags('pi', [PI, ...TOK, '--session-id', U, '--model', 'm'])).toEqual([
      '--session-id',
      U,
      '--model',
      'm'
    ]);
    expect(ownLaunchFlags('pi', [PI, '--session-id', U, ...TOK])).toEqual(['--session-id', U, ...TOK]);
  });
});

// ---------------------------------------------------------------------------
// 4. The scan the floor is read from
// ---------------------------------------------------------------------------

/** The version file the pi shim prints, so each case sets its own band. */
const versionFile = join(root, 'pi-version');

/** One executable shim that records its run, then does `answer`. */
function shim(name: string, answer: string): string {
  const path = join(binDir, name);
  writeFileSync(path, `#!/bin/sh\necho "$0 $*" >> '${marker}'\n${answer}\n`);
  chmodSync(path, 0o755);
  return path;
}

/** A shim's text: record the run, then do `answer`. */
const shimText = (answer: string): string => `#!/bin/sh\necho "$0 $*" >> '${marker}'\n${answer}\n`;

// The probe's PATH is the scratch folder alone, so every command a shim runs
// past the shell's own builtins is named by its full path. pi's two shims are
// files of pi's own package (R1), each reached by a link in that folder.
const PI_TEXT = shimText(`/bin/cat '${versionFile}'`);
const PI_SHIM = plantNpmPi(root, PI_TEXT, { binName: 'p350tok-pi' }).bin;
shim('p350tok-slow', "/bin/sleep 1\necho '1.0.0'");
/** A pi whose own probe takes 400 ms, for D19's first answer (the fix round). */
const SLOW_PI_SHIM = plantNpmPi(root, shimText(`/bin/sleep 0.4\n/bin/cat '${versionFile}'`), {
  binName: 'p350tok-slowpi',
  file: 'dist/slow.js'
}).bin;

/** pi's compiled row, on a scratch binary, so nothing on this Mac answers. */
function plantedPi(): AgentRegistryEntry {
  return { ...getRegistryEntry('pi'), binaries: ['p350tok-pi'], extraProbeDirs: [], storeDirs: [] };
}

/** A second row, under a scratch id, whose probe answers a second later. */
function plantedSlow(): DetectableAgentEntry {
  return { ...getRegistryEntry('pi'), id: 'p350tok-slow', binaries: ['p350tok-slow'], extraProbeDirs: [], storeDirs: [] };
}

/** The lines the shims wrote. */
function ran(): string[] {
  try {
    return readFileSync(marker, 'utf8').split('\n').filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

describe("piInlineFloorFor reads the last resolved scan's pi row, for one binary", () => {
  it('answers unread before any scan, and starts nothing by asking', () => {
    setAgentTableSource(() => [plantedPi()]);
    writeFileSync(versionFile, '1.4.0\n');
    expect(piInlineFloorFor(PI_SHIM)).toBe('unread');
    expect(detectionScanCount()).toBe(0);
    expect(versionProbeCount()).toBe(0);
    expect(ran()).toEqual([]);
  });

  it('answers each band from the version the scan read', async () => {
    setAgentTableSource(() => [plantedPi()]);
    const bands: Array<[string, string]> = [
      ['0.83.0', 'below'],
      ['0.84.0', 'holds'],
      ['0.99.2', 'holds'],
      ['1.4.0', 'holds'],
      ['not a version', 'unread']
    ];
    for (const [band, want] of bands) {
      resetDetectionCache();
      writeFileSync(versionFile, `${band}\n`);
      await listDetectedAgents();
      expect(piInlineFloorFor(PI_SHIM), band).toBe(want);
    }
  });

  it('answers unread when the scan found no pi at all', async () => {
    setAgentTableSource(() => []);
    await listDetectedAgents();
    expect(piInlineFloorFor(PI_SHIM)).toBe('unread');
  });

  it('answers for the very file the scan read, by what it is and not by its name (the fix round)', async () => {
    setAgentTableSource(() => [plantedPi()]);
    writeFileSync(versionFile, '1.4.0\n');
    await listDetectedAgents();
    expect(piInlineFloorFor(PI_SHIM)).toBe('holds');
    // A link to it is the same file.
    const link = join(root, 'link-to-pi');
    rmSync(link, { force: true });
    symlinkSync(PI_SHIM, link);
    expect(piInlineFloorFor(link)).toBe('holds');
    // A second install, even byte for byte the same and inside a pi package of
    // its own, is another file whose version no scan read; a copy of the file
    // outside any package is no install of pi's at all (R1); and a missing
    // path, or none, reads nothing.
    const second = plantNpmPi(join(root, 'second'), PI_TEXT, { binName: 'p350tok-pi' }).bin;
    expect(piInlineFloorFor(second)).toBe('unread');
    const copy = join(root, 'copy-of-pi');
    copyFileSync(PI_SHIM, copy);
    expect(piInlineFloorFor(copy)).toBe('unread');
    expect(piInlineFloorFor(join(root, 'no-such-pi'))).toBe('unread');
    expect(piInlineFloorFor('')).toBe('unread');
    expect(piInlineFloorFor(undefined)).toBe('unread');
    expect(piInlineFloorFor(null)).toBe('unread');
  });

  it('reads unread for the scanned file once it is rewritten, and again holds after a fresh scan (the fix round)', async () => {
    setAgentTableSource(() => [plantedPi()]);
    writeFileSync(versionFile, '1.4.0\n');
    await listDetectedAgents();
    const text = readFileSync(PI_SHIM, 'utf8');
    try {
      writeFileSync(PI_SHIM, `${text}# reinstalled\n`);
      expect(piInlineFloorFor(PI_SHIM)).toBe('unread');
      // Nothing asked starts a scan; the next scan reads the new file.
      expect(detectionScanCount()).toBe(1);
      await rescanAgents();
      expect(piInlineFloorFor(PI_SHIM)).toBe('holds');
    } finally {
      writeFileSync(PI_SHIM, text);
    }
  });

  it("composes a row's own resume with its own recorded flags and no token of Tortie's (the fix round)", () => {
    setAgentTableSource(() => [plantedPi()]);
    // The person's own flags are what the launch argv records after the id.
    expect([...piOwnResumeArgv(U, ['/x/pi', ...TOK, '--session-id', U, '--model', 'm'])]).toEqual(['p350tok-pi', '--session-id', U, '--model', 'm']);
    // A launch argv that does not carry the id pair reads as no flags.
    expect([...piOwnResumeArgv(U, ['/x/pi', '--model', 'm'])]).toEqual(['p350tok-pi', '--session-id', U]);
    expect([...piOwnResumeArgv(U, ['/x/pi', '--session-id', '019a0000-0000-7000-8000-0000000000ff', '--model', 'm'])]).toEqual(['p350tok-pi', '--session-id', U]);
    // Put first by a confirmed row, a person's leading pair leads the composition.
    setAgentTableSource(() => [{ ...plantedPi(), resume: { ...plantedPi().resume, resumeExtrasPosition: 'leading' } }]);
    expect([...piOwnResumeArgv(U, ['/x/pi', '--session-id', U, ...TOK])]).toEqual(['p350tok-pi', ...TOK, '--session-id', U]);
    setAgentTableSource(() => [plantedPi()]);
    expect([...piOwnResumeArgv(U)]).toEqual(['p350tok-pi', '--session-id', U]);
    setAgentTableSource(() => [
      { ...plantedPi(), resume: { ...plantedPi().resume, template: [...TOK, '--session-id', SESSION_ID_SLOT] } }
    ]);
    expect([...piOwnResumeArgv(U)]).toEqual(['p350tok-pi', ...TOK, '--session-id', U]);
    setAgentTableSource(() => []);
    expect([...piOwnResumeArgv(U)]).toEqual([]);
    expect(detectionScanCount()).toBe(0);
  });

  it("stays unread until the WHOLE scan answers, though pi's own probe answered at once (M2)", async () => {
    setAgentTableSource(() => [plantedPi(), plantedSlow()]);
    writeFileSync(versionFile, '1.4.0\n');
    const scan = listDetectedAgents();
    // pi's probe has answered long before the slow row's second is up.
    for (let i = 0; i < 40 && !ran().some((line) => line.includes('p350tok-pi')); i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(ran().some((line) => line.includes('p350tok-pi'))).toBe(true);
    expect(piInlineFloorFor(PI_SHIM)).toBe('unread');
    await scan;
    expect(piInlineFloorFor(PI_SHIM)).toBe('holds');
  });
});

describe('firstScanAnswered (D19)', () => {
  it('starts nothing, and settles with the first scan that resolves', async () => {
    setAgentTableSource(() => [plantedPi()]);
    writeFileSync(versionFile, '0.99.2\n');
    let answered: unknown = null;
    void firstScanAnswered().then((r) => {
      answered = r;
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(answered).toBeNull();
    expect(detectionScanCount()).toBe(0);
    expect(ran()).toEqual([]);

    const result = await listDetectedAgents();
    await Promise.resolve();
    expect(answered).toBe(result);
    // A reader woken by it reads that scan's rows.
    expect(piInlineFloorFor(PI_SHIM)).toBe('holds');
  });

  it('settles only once the scan has read every probe, so the pass it wakes reads the floor (the fix round)', async () => {
    // pi's own probe takes 400 ms. A first answer settled before the scan read
    // anything would wake the boot pass on no reading, and its latch would
    // then keep every recorded row from crossing for the life of the process.
    setAgentTableSource(() => [{ ...plantedPi(), binaries: ['p350tok-slowpi'] }]);
    writeFileSync(versionFile, '1.4.0\n');
    const woken = firstScanAnswered().then((r) => ({
      floor: piInlineFloorFor(SLOW_PI_SHIM),
      pi: r.agents.find((a) => a.id === 'pi')?.version ?? null
    }));
    void listDetectedAgents();
    await expect(woken).resolves.toEqual({ floor: 'holds', pi: '1.4.0' });
    expect(ran().some((line) => line.includes('p350tok-slowpi'))).toBe(true);
  });

  it('a later scan never moves the first answer', async () => {
    setAgentTableSource(() => [plantedPi()]);
    writeFileSync(versionFile, '1.4.0\n');
    const first = await listDetectedAgents();
    writeFileSync(versionFile, '0.83.0\n');
    const second = await rescanAgents();
    expect(second).not.toBe(first);
    expect(await firstScanAnswered()).toBe(first);
    // The floor reader follows the LAST resolved scan, as peekDetectedAgents does.
    expect(piInlineFloorFor(PI_SHIM)).toBe('below');
  });

  it('resetDetectionCache makes a fresh one, which a scan begun before the reset cannot settle', async () => {
    setAgentTableSource(() => [plantedPi(), plantedSlow()]);
    writeFileSync(versionFile, '1.4.0\n');
    const before = listDetectedAgents();
    resetDetectionCache();
    let fresh: unknown = null;
    void firstScanAnswered().then((r) => {
      fresh = r;
    });
    await before;
    await new Promise((r) => setTimeout(r, 20));
    expect(fresh).toBeNull();
    const after = await listDetectedAgents();
    await Promise.resolve();
    expect(fresh).toBe(after);
  });
});
