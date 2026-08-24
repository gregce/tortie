/**
 * The story seed's two refusals (Phase 143).
 *
 * The seed writes version chains into the overview store, and the store lives
 * in the profile directory. A GMUX_SUMMARY_SEED left in a shell profile must
 * never write rows into the store a person actually reads, so the refusals are
 * the same two ../fold-seed.ts carries and they are tested the same way.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { summarySeedRefusal } from '../summary-seed';

let harnessDir = '';
let profileDir = '';
let realProfile = '';

beforeEach(() => {
  harnessDir = mkdtempSync(join(tmpdir(), 'gmux-summary-seed-harness-'));
  profileDir = join(harnessDir, 'profile');
  mkdirSync(profileDir, { recursive: true });
  realProfile = mkdtempSync(join(tmpdir(), 'gmux-summary-seed-real-'));
});

afterEach(() => {
  rmSync(harnessDir, { recursive: true, force: true });
  rmSync(realProfile, { recursive: true, force: true });
});

function env(over: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    GMUX_SUMMARY_SEED: '/tmp/story.json',
    GMUX_SHOT: '/tmp/shot.png',
    GMUX_HARNESS_DIR: harnessDir,
    ...over
  };
}

describe('summarySeedRefusal', () => {
  it('allows an isolated launch on a harness profile', () => {
    expect(summarySeedRefusal(env(), profileDir)).toBeNull();
  });

  it('refuses a launch that is not an isolated harness launch', () => {
    const out = summarySeedRefusal(env({ GMUX_SHOT: '' }), profileDir);
    expect(out).toContain('not an isolated harness launch');
  });

  it('refuses a real profile even when the launch is isolated', () => {
    const out = summarySeedRefusal(env(), realProfile);
    expect(out).toContain('not under the harness directory');
  });

  it('refuses when the runner handed over no harness directory', () => {
    const out = summarySeedRefusal(env({ GMUX_HARNESS_DIR: '' }), profileDir);
    expect(out).toContain('not under the harness directory');
  });

  it('does not treat a sibling directory as being inside the harness one', () => {
    // The prefix test would pass on the string alone, and a person's profile
    // must not be written because its path starts with the same letters.
    const sibling = `${harnessDir}-elsewhere`;
    mkdirSync(sibling, { recursive: true });
    try {
      expect(summarySeedRefusal(env(), sibling)).toContain(
        'not under the harness directory'
      );
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });

  it('names GMUX_SUMMARY_SEED in every refusal, so a run says which one fired', () => {
    const notIsolated = summarySeedRefusal(env({ GMUX_SHOT: '' }), profileDir);
    const notHarness = summarySeedRefusal(env(), realProfile);
    expect(notIsolated).toContain('GMUX_SUMMARY_SEED');
    expect(notHarness).toContain('GMUX_SUMMARY_SEED');
  });
});
