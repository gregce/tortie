/**
 * Unit tests for src/main/specstory/resolve.ts (Phase 15 bundling):
 *  - version parsing + comparison (the resolver's only ordering logic)
 *  - the bundled path follows packaged vs dev, and reads the build sidecar
 *  - resolution order is BUNDLED first, installed as the fallback, with a
 *    bundled binary that cannot exec losing to one that can
 *  - the auth path is home-derived, and specstoryEnv() never rewrites HOME —
 *    the single rule that keeps one `specstory login` serving both copies
 *
 * The PATH sources are mocked, not stubbed through the environment: the real
 * `extraBinDirs()` always includes /opt/homebrew/bin, so a test that leaned on
 * $PATH would find whatever specstory this machine happens to have installed
 * and pass or fail accordingly.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// resolve.ts reaches electron through a lazy `require`, which does not exist
// under vitest's ESM runner — so the module takes its documented
// `process.cwd()` fallback for the app root, and steering cwd is how these
// tests place a "bundled" binary. (The packaged branch is one `join` against
// `process.resourcesPath`; the packaged-app smoke is what proves that one.)
let cwdSpy: { mockRestore: () => void };

// The two PATH inputs, under test control. resolveBinaryAgainst stays real.
let userPath = '';
let extraDirs: string[] = [];
vi.mock('../../tmux/resolve', async (importActual) => {
  const actual = await importActual<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(userPath),
    extraBinDirs: () => extraDirs
  };
});

import {
  bundledSpecstoryPath,
  bundledSpecstoryVersion,
  resetSpecstoryResolutionCache,
  resolveSpecstory,
  specstoryAuthPath,
  specstoryEnv
} from '../resolve';

let root: string;

/** A stub `specstory` printing the real CLI's exact version line. */
function writeFakeCli(path: string, version: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\nprintf '%s (SpecStory)' '${version}'\n`, {
    mode: 0o755
  });
  chmodSync(path, 0o755);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-specstory-'));
  cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);
  userPath = join(root, 'empty');
  extraDirs = [];
  resetSpecstoryResolutionCache();
});

afterEach(() => {
  cwdSpy.mockRestore();
  rmSync(root, { recursive: true, force: true });
  resetSpecstoryResolutionCache();
});

// Version parsing and comparison are NOT tested here: this module used to
// carry its own pair, and the integrator collapsed them into the single
// implementation in @shared/specstory-status, whose own suite
// (src/shared/__tests__/specstory-status.test.ts) covers the CLI's real output
// shapes including the `dev` build and the prerelease suffix this module's
// copy used to truncate.

describe('bundled paths', () => {
  it('unpackaged, points at build/vendor/specstory/bin — what the fetch script fills', () => {
    assert.equal(
      bundledSpecstoryPath(),
      join(root, 'build', 'vendor', 'specstory', 'bin', 'specstory')
    );
  });

  it('reads the version from the build sidecar without spawning anything', () => {
    const dir = dirname(bundledSpecstoryPath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'specstory.json'), JSON.stringify({ version: '2.8.0' }));
    assert.equal(bundledSpecstoryVersion(), '2.8.0');
  });

  it('is null rather than throwing when the sidecar is missing or junk', () => {
    assert.equal(bundledSpecstoryVersion(), null);
    const dir = dirname(bundledSpecstoryPath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'specstory.json'), 'not json');
    assert.equal(bundledSpecstoryVersion(), null);
  });
});

describe('resolveSpecstory', () => {
  it('prefers the bundled copy over an installed one', async () => {
    const installedDir = join(root, 'usr-bin');
    writeFakeCli(join(installedDir, 'specstory'), '2.5.0');
    writeFakeCli(bundledSpecstoryPath(), '2.8.0');
    userPath = installedDir;

    const r = await resolveSpecstory();
    assert.equal(r.active?.source, 'bundled');
    assert.equal(r.active?.version, '2.8.0');
    assert.equal(r.active?.path, bundledSpecstoryPath());
    // Both are reported so Settings can show the one in use AND the other.
    assert.equal(r.installed?.version, '2.5.0');
    assert.equal(r.bundled?.version, '2.8.0');
  });

  it('finds an installed copy in extraBinDirs even when PATH misses it', async () => {
    const brew = join(root, 'opt-homebrew-bin');
    writeFakeCli(join(brew, 'specstory'), '2.5.0');
    extraDirs = [brew];

    const r = await resolveSpecstory();
    assert.equal(r.active?.source, 'installed');
    assert.equal(r.active?.path, join(brew, 'specstory'));
  });

  it('prefers the sidecar version over the probe for the bundled copy', async () => {
    const dir = dirname(bundledSpecstoryPath());
    writeFakeCli(bundledSpecstoryPath(), '2.8.0');
    writeFileSync(join(dir, 'specstory.json'), JSON.stringify({ version: '2.8.1' }));

    const r = await resolveSpecstory();
    assert.equal(r.bundled?.version, '2.8.1');
  });

  it('falls back to the installed copy when nothing is bundled (the dev case)', async () => {
    const installedDir = join(root, 'usr-bin');
    writeFakeCli(join(installedDir, 'specstory'), '2.5.0');
    userPath = installedDir;

    const r = await resolveSpecstory();
    assert.equal(r.bundled, null);
    assert.equal(r.active?.source, 'installed');
    assert.equal(r.active?.path, join(installedDir, 'specstory'));
  });

  it('falls back when the bundled copy exists but cannot run', async () => {
    // A bundled file that is present and unexecutable is a packaging bug; it
    // must not take the app's capture feature down with it.
    const bundled = bundledSpecstoryPath();
    mkdirSync(dirname(bundled), { recursive: true });
    writeFileSync(bundled, 'not a mach-o', { mode: 0o644 });
    const installedDir = join(root, 'usr-bin');
    writeFakeCli(join(installedDir, 'specstory'), '2.5.0');
    userPath = installedDir;

    const r = await resolveSpecstory();
    assert.equal(r.bundled, null);
    assert.equal(r.active?.source, 'installed');
  });

  it('reports null instead of throwing when there is no specstory at all', async () => {
    const r = await resolveSpecstory();
    assert.equal(r.active, null);
    assert.equal(r.bundled, null);
    assert.equal(r.installed, null);
  });

  it('resolves once and caches', async () => {
    writeFakeCli(bundledSpecstoryPath(), '2.8.0');
    const first = await resolveSpecstory();
    rmSync(bundledSpecstoryPath());
    assert.equal((await resolveSpecstory()).active?.path, first.active?.path);
    resetSpecstoryResolutionCache();
    assert.equal((await resolveSpecstory()).active, null);
  });
});

describe('shared auth (one login serves bundled + installed)', () => {
  it('locates auth.json under $HOME, never beside the binary', () => {
    assert.equal(specstoryAuthPath(), join(homedir(), '.specstory', 'cli', 'auth.json'));
  });

  it('specstoryEnv changes PATH and nothing else — HOME rides through', async () => {
    userPath = '/fresh/path';
    const base = { HOME: '/Users/someone', FOO: 'bar', PATH: '/stale' };
    const env = await specstoryEnv(base);
    assert.equal(env['HOME'], '/Users/someone');
    assert.equal(env['FOO'], 'bar');
    assert.equal(env['PATH'], '/fresh/path');
    // Nothing added: no private config root, no HOME rewrite, nothing that
    // could fork the CLI's state and make the user log in twice.
    assert.deepEqual(
      Object.keys(env).filter((k) => !(k in base)),
      []
    );
  });

  /**
   * The verification override is the ONE thing allowed to move HOME, and it
   * has to move it for the READER and the WRITER together. It used to be
   * implemented twice — here for spawns, and again in the Settings registrar
   * for the auth path — which is a pair that can silently disagree: a status
   * panel reading a scratch file while a real `specstory login` writes the
   * user's own. These two assertions are what pin them to one answer.
   */
  it('GMUX_SPECSTORY_HOME redirects the auth path and the spawn HOME together', async () => {
    const scratch = join(root, 'scratch-home');
    const prev = process.env['GMUX_SPECSTORY_HOME'];
    process.env['GMUX_SPECSTORY_HOME'] = scratch;
    try {
      assert.equal(
        specstoryAuthPath(),
        join(scratch, '.specstory', 'cli', 'auth.json')
      );
      const env = await specstoryEnv({ HOME: '/Users/someone' });
      assert.equal(env['HOME'], scratch);
    } finally {
      if (prev === undefined) delete process.env['GMUX_SPECSTORY_HOME'];
      else process.env['GMUX_SPECSTORY_HOME'] = prev;
    }
  });

  it('is inert when the override is unset — the shipped default', () => {
    assert.equal(process.env['GMUX_SPECSTORY_HOME'], undefined);
    assert.equal(specstoryAuthPath(), join(homedir(), '.specstory', 'cli', 'auth.json'));
  });
});
