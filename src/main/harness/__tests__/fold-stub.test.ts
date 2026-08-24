/**
 * The fold's harness only binary override (Phase 138).
 *
 * It carries the same two refusals ../overview-seed.ts carries, and this file
 * drives both. A GMUX_FOLD_BIN left in a shell profile must never reach a
 * person's real app, because it decides which binary runs.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { foldStubBinary } from '../fold-stub';

let harnessDir = '';
let profileDir = '';
let realProfile = '';

beforeEach(() => {
  harnessDir = mkdtempSync(join(tmpdir(), 'gmux-fold-harness-'));
  profileDir = join(harnessDir, 'profile');
  mkdirSync(profileDir, { recursive: true });
  realProfile = mkdtempSync(join(tmpdir(), 'gmux-fold-real-'));
});

afterEach(() => {
  rmSync(harnessDir, { recursive: true, force: true });
  rmSync(realProfile, { recursive: true, force: true });
});

function env(over: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    GMUX_FOLD_BIN: '/tmp/stub-fold',
    GMUX_SHOT: '/tmp/shot.png',
    GMUX_HARNESS_DIR: harnessDir,
    ...over
  };
}

describe('foldStubBinary', () => {
  it('answers with the stub on an isolated launch using a harness profile', () => {
    expect(foldStubBinary(env(), profileDir)).toBe('/tmp/stub-fold');
  });

  it('answers with nothing when the variable is not set', () => {
    expect(foldStubBinary(env({ GMUX_FOLD_BIN: '' }), profileDir)).toBeNull();
  });

  it('refuses a launch that is not an isolated harness launch', () => {
    const notHarness = env();
    delete notHarness['GMUX_SHOT'];
    expect(foldStubBinary(notHarness, profileDir)).toBeNull();
  });

  it('refuses a real profile even when the launch says it is a shot', () => {
    expect(foldStubBinary(env(), realProfile)).toBeNull();
  });

  it('refuses when the runner named no harness directory', () => {
    expect(
      foldStubBinary(env({ GMUX_HARNESS_DIR: '' }), profileDir)
    ).toBeNull();
  });

  it('refuses a profile that only looks like it sits under the harness', () => {
    // A string prefix test would say yes here. Containment says no, and that
    // is the difference between the refusal working and only appearing to.
    const lookalike = `${harnessDir}-elsewhere`;
    mkdirSync(join(lookalike, 'profile'), { recursive: true });
    try {
      expect(foldStubBinary(env(), join(lookalike, 'profile'))).toBeNull();
    } finally {
      rmSync(lookalike, { recursive: true, force: true });
    }
  });

  it('never throws, whatever it is handed', () => {
    expect(() => foldStubBinary({}, '/does/not/exist')).not.toThrow();
    expect(foldStubBinary({}, '/does/not/exist')).toBeNull();
  });
});
