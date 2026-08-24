/**
 * The fold seed's two refusals (Phase 138).
 *
 * The seed writes the SEALED fold choice, which decides that a program runs,
 * and it fires a turn boundary. Both refusals therefore matter more here than
 * they do for a screenshot seed: a GMUX_FOLD_SEED left in a shell profile must
 * never write a person's real settings file.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { foldSeedRefusal } from '../fold-seed';

let harnessDir = '';
let profileDir = '';
let realProfile = '';

beforeEach(() => {
  harnessDir = mkdtempSync(join(tmpdir(), 'gmux-fold-seed-harness-'));
  profileDir = join(harnessDir, 'profile');
  mkdirSync(profileDir, { recursive: true });
  realProfile = mkdtempSync(join(tmpdir(), 'gmux-fold-seed-real-'));
});

afterEach(() => {
  rmSync(harnessDir, { recursive: true, force: true });
  rmSync(realProfile, { recursive: true, force: true });
});

function env(over: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    GMUX_FOLD_SEED: '/tmp/seed.json',
    GMUX_SHOT: '/tmp/shot.png',
    GMUX_HARNESS_DIR: harnessDir,
    ...over
  };
}

describe('foldSeedRefusal', () => {
  it('allows an isolated launch on a harness profile', () => {
    expect(foldSeedRefusal(env(), profileDir)).toBeNull();
  });

  it('refuses a launch that is not an isolated harness launch', () => {
    const out = foldSeedRefusal(env({ GMUX_SHOT: '' }), profileDir);
    expect(out).toContain('not an isolated harness launch');
  });

  it('refuses a real profile even when the launch is isolated', () => {
    const out = foldSeedRefusal(env(), realProfile);
    expect(out).toContain('not under the harness directory');
  });

  it('refuses when the runner handed over no harness directory', () => {
    const out = foldSeedRefusal(env({ GMUX_HARNESS_DIR: '' }), profileDir);
    expect(out).toContain('not under the harness directory');
  });

  it('does not treat a sibling directory as being inside the harness one', () => {
    // The prefix test would pass on the string alone, and a person's profile
    // must not be written because its path starts with the same letters.
    const sibling = `${harnessDir}-elsewhere`;
    mkdirSync(sibling, { recursive: true });
    try {
      expect(foldSeedRefusal(env(), sibling)).toContain(
        'not under the harness directory'
      );
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });
});
