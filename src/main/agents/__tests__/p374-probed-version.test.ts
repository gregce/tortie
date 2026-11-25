/**
 * Phase 374, the reading of the file a launch runs (build/p374/SPEC.md D6, D8;
 * §7.1 row L4's reading half): `probedVersionFor` and `rereadAgent`.
 *
 * The scan is the SHIPPING scan over a planted PATH; the one process it would
 * start is answered by a table here, keyed by the real file, so NOTHING STARTS.
 *
 * HERMETIC. One temporary folder; no agent, no home, no login shell.
 */

import { chmodSync, linkSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-probed-')));
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

const probe = vi.hoisted(() => ({
  ran: [] as string[],
  /** What `--version` answers for a path, or null for a probe that answers nothing. */
  answer: (_bin: string): string | null => '1.5.16',
  /** Runs while a probe is in flight. */
  during: null as null | ((bin: string) => void | Promise<void>)
}));
vi.mock('../../proc/guarded', () => ({
  runGuarded: async (bin: string) => {
    probe.ran.push(bin);
    await probe.during?.(bin);
    const said = probe.answer(bin);
    return { stdout: said ?? '', stderr: '', code: said === null ? 1 : 0 };
  }
}));

let loginPath = '';
vi.mock('../../tmux/resolve', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/resolve')>()),
  getUserPath: () => Promise.resolve(loginPath),
  extraBinDirs: () => []
}));

const { getRegistryEntry } = await import('../registry');
const {
  detectionScanCount,
  listDetectedAgents,
  peekDetectedAgents,
  probedVersionFor,
  rereadAgent,
  rescanAgents,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource
} = await import('../detection');

/** A file that is the program itself, as the health read tells one: no `#!`. */
const NATIVE = (mark: string): string => `\xcf\xfa\xed\xfe ${mark}\n`;
let n = 0;
let world = '';
let bin = '';
let dir = '';

function plant(path: string, text: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'latin1');
  chmodSync(path, 0o755);
  return path;
}

/** agy replaces its own file: a new file renamed over the old name. */
function replace(path: string, text: string): void {
  plant(`${path}.new`, text);
  renameSync(`${path}.new`, path);
}

beforeEach(() => {
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) vi.stubEnv(name, undefined);
  n += 1;
  world = join(root, String(n));
  dir = join(world, 'bin');
  bin = plant(join(dir, 'agy'), NATIVE('one'));
  loginPath = `${dir}:/usr/bin:/bin`;
  probe.ran = [];
  probe.answer = () => '1.5.16';
  probe.during = null;
  resetDetectionCache();
  resetAgentTableSource();
  setAgentTableSource(() => [{ ...getRegistryEntry('antigravity'), extraProbeDirs: [], storeDirs: [] }]);
});

const read = (path = bin, spawn?: { name: string; path: string; folder: string }): string | null =>
  probedVersionFor('antigravity', path, spawn)?.version ?? null;

describe('the reading of the file a launch runs', () => {
  it('is null before any scan, and starts none', () => {
    expect(read()).toBeNull();
    expect(detectionScanCount()).toBe(0);
    expect(probe.ran).toEqual([]);
  });

  it('answers the version, the real file, what it is and that it is native', async () => {
    const link = join(world, 'link');
    symlinkSync(bin, link);
    await listDetectedAgents();
    const got = probedVersionFor('antigravity', link);
    expect(got).toMatchObject({ version: '1.5.16', real: bin, native: true });
    expect(got?.identity.real).toBe(bin);
    expect(probe.ran).toEqual([bin]);
  });

  it('is null for no path, an empty one, a file that is gone, another agent, and another file of the same bytes', async () => {
    await listDetectedAgents();
    for (const path of [null, undefined, '', join(world, 'nowhere'), dir]) expect(probedVersionFor('antigravity', path)).toBeNull();
    expect(probedVersionFor('claude', bin)).toBeNull();
    expect(read(plant(join(world, 'other', 'agy'), NATIVE('one')))).toBeNull();
    expect(read()).toBe('1.5.16');
  });

  it('is null once the file was replaced, rewritten or touched since the scan', async () => {
    for (const change of [
      () => replace(bin, NATIVE('one')),
      () => writeFileSync(bin, NATIVE('two'), 'latin1'),
      () => utimesSync(bin, 1, 1)
    ]) {
      resetDetectionCache();
      await listDetectedAgents();
      expect(read()).toBe('1.5.16');
      change();
      expect(read()).toBeNull();
    }
  });

  it('is null when the file changed while the probe ran', async () => {
    probe.during = () => replace(bin, NATIVE('two'));
    await listDetectedAgents();
    expect(read()).toBeNull();
  });

  it('is null when the probe answered nothing, and when a harness launch holds it', async () => {
    probe.answer = () => null;
    await listDetectedAgents();
    expect(read()).toBeNull();
    resetDetectionCache();
    probe.answer = () => '1.5.16';
    vi.stubEnv('GMUX_SMOKE', 't1');
    probe.ran = [];
    await listDetectedAgents();
    await rereadAgent('antigravity');
    replace(bin, NATIVE('two'));
    await rereadAgent('antigravity');
    expect(read()).toBeNull();
    expect(probe.ran).toEqual([]);
  });

  it('a script that chooses another program is read and is not native', async () => {
    const script = plant(join(world, 's', 'agy'), '#!/bin/sh\nexec /nowhere/agy "$@"\n');
    loginPath = `${join(world, 's')}:/usr/bin:/bin`;
    await listDetectedAgents();
    expect(probedVersionFor('antigravity', script)).toMatchObject({ version: '1.5.16', native: false });
  });

  it('a version manager’s shim reads as its own dispatcher, never as agy', async () => {
    const mise = plant(join(world, 'mise', 'mise'), NATIVE('mise'));
    mkdirSync(join(world, 'shims'));
    symlinkSync(mise, join(world, 'shims', 'agy'));
    loginPath = `${join(world, 'shims')}:/usr/bin:/bin`;
    await listDetectedAgents();
    expect(probedVersionFor('antigravity', join(world, 'shims', 'agy'))?.real).toBe(mise);
  });

  it('a bare name that finds another file in the session’s own folder has no reading; a hard link to the same file does', async () => {
    await listDetectedAgents();
    const folder = join(world, 'project');
    mkdirSync(folder);
    const spawn = { name: 'agy', path: `node_modules/.bin:${dir}`, folder };
    expect(read(bin, spawn)).toBe('1.5.16');
    plant(join(folder, 'node_modules', '.bin', 'agy'), NATIVE('own'));
    expect(read(bin, spawn)).toBeNull();
    const hard = join(world, 'hard');
    mkdirSync(hard);
    // A hard link moves the file's changed time, so the scan reads it after.
    linkSync(bin, join(hard, 'agy'));
    resetDetectionCache();
    await listDetectedAgents();
    expect(read(bin, { name: 'agy', path: hard, folder })).toBe('1.5.16');
    expect(read(bin, { name: 'agy', path: '/nowhere', folder })).toBeNull();
    expect(read(bin, { name: 'agy', path: dir, folder: 'relative' })).toBeNull();
  });
});

describe('one row read again', () => {
  it('a replaced file is read once, the reading stands for it, and the scan is untouched', async () => {
    await listDetectedAgents();
    const before = peekDetectedAgents();
    replace(bin, NATIVE('two'));
    probe.answer = () => '1.6.0';
    expect(read()).toBeNull();
    await rereadAgent('antigravity');
    expect(read()).toBe('1.6.0');
    expect(probe.ran).toEqual([bin, bin]);
    await rereadAgent('antigravity');
    await rereadAgent('antigravity');
    expect(probe.ran).toHaveLength(2);
    expect(peekDetectedAgents()).toBe(before);
    expect(before?.agents[0]?.version).toBe('1.5.16');
    expect(detectionScanCount()).toBe(1);
    expect(await listDetectedAgents()).toBe(before);
  });

  it('a file replaced again is read again, once', async () => {
    await listDetectedAgents();
    for (const mark of ['two', 'three']) {
      replace(bin, NATIVE(mark));
      await Promise.all([rereadAgent('antigravity'), rereadAgent('antigravity')]);
      await rereadAgent('antigravity');
      expect(read()).toBe('1.5.16');
    }
    expect(probe.ran).toHaveLength(3);
  });

  it('starts nothing when the scan already read this file, whatever it read', async () => {
    probe.answer = () => null;
    await listDetectedAgents();
    await rereadAgent('antigravity');
    expect(probe.ran).toHaveLength(1);
    expect(read()).toBeNull();
  });

  it('with no scan at all it reads the one row, and starts no scan', async () => {
    await rereadAgent('antigravity');
    expect(read()).toBe('1.5.16');
    expect(detectionScanCount()).toBe(0);
    expect(peekDetectedAgents()).toBeNull();
    expect(probe.ran).toEqual([bin]);
  });

  it('a scan on its way is waited for, and its reading is the one', async () => {
    let go = (): void => undefined;
    probe.during = () => new Promise<void>((resolve) => { go = resolve; });
    const scan = listDetectedAgents();
    const again = rereadAgent('antigravity');
    await new Promise((r) => setTimeout(r, 20));
    expect(probe.ran).toHaveLength(1);
    go();
    await Promise.all([scan, again]);
    expect(probe.ran).toHaveLength(1);
    expect(read()).toBe('1.5.16');
  });

  it('a probe that answers nothing is not asked of that file again, until a scan', async () => {
    await listDetectedAgents();
    replace(bin, NATIVE('two'));
    probe.answer = () => null;
    await rereadAgent('antigravity');
    await rereadAgent('antigravity');
    expect(probe.ran).toHaveLength(2);
    probe.answer = () => '1.6.0';
    await rescanAgents();
    expect(read()).toBe('1.6.0');
  });

  it('answers quietly for a row that is not there, has no probe or resolves to nothing', async () => {
    await rereadAgent('nobody');
    loginPath = join(world, 'nowhere');
    await rereadAgent('antigravity');
    setAgentTableSource(() => [{ ...getRegistryEntry('antigravity'), versionProbe: null }]);
    await rereadAgent('antigravity');
    setAgentTableSource(() => {
      throw new Error('no table');
    });
    await expect(rereadAgent('antigravity')).resolves.toBeUndefined();
    expect(probe.ran).toEqual([]);
  });
});
