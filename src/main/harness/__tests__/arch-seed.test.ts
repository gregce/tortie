/**
 * The arch seed's two refusals (Phase 159).
 *
 * The seed writes the SEALED arch choice, which decides that a program runs
 * on every confirmed drift. A GMUX_ARCH_SEED left in a shell profile must
 * never write a person's real settings file, and a harness launch on a real
 * profile must be refused even with GMUX_SHOT set.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { archSeedRefusal } from '../arch-seed';

let harnessDir = '';
let profileDir = '';
let realProfile = '';

beforeEach(() => {
  harnessDir = mkdtempSync(join(tmpdir(), 'gmux-arch-seed-harness-'));
  profileDir = join(harnessDir, 'profile');
  mkdirSync(profileDir, { recursive: true });
  realProfile = mkdtempSync(join(tmpdir(), 'gmux-arch-seed-real-'));
});

afterEach(() => {
  rmSync(harnessDir, { recursive: true, force: true });
  rmSync(realProfile, { recursive: true, force: true });
});

function env(over: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    GMUX_ARCH_SEED: '/tmp/seed.json',
    GMUX_SHOT: '/tmp/shot.png',
    GMUX_HARNESS_DIR: harnessDir,
    ...over
  };
}

describe('archSeedRefusal', () => {
  it('allows an isolated launch on a profile under the harness directory', () => {
    expect(archSeedRefusal(env(), profileDir)).toBeNull();
  });

  it('allows a smoke launch the same way', () => {
    const e = env();
    delete e['GMUX_SHOT'];
    e['GMUX_SMOKE'] = 'basic';
    expect(archSeedRefusal(e, profileDir)).toBeNull();
  });

  it('refuses a launch that is not isolated, even with the harness directory set', () => {
    const e = env();
    delete e['GMUX_SHOT'];
    expect(archSeedRefusal(e, profileDir)).toMatch(/not an isolated harness launch/);
  });

  it('refuses a profile outside the harness directory', () => {
    expect(archSeedRefusal(env(), realProfile)).toMatch(/could be a real profile/);
  });

  it('refuses when no harness directory was handed over', () => {
    const e = env();
    delete e['GMUX_HARNESS_DIR'];
    expect(archSeedRefusal(e, profileDir)).toMatch(/could be a real profile/);
  });

  it('refuses a sibling whose name merely starts with the harness directory', () => {
    const sibling = `${harnessDir}-elsewhere`;
    mkdirSync(sibling, { recursive: true });
    try {
      expect(archSeedRefusal(env(), sibling)).toMatch(/could be a real profile/);
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });
});
