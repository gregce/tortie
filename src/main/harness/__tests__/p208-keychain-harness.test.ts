/**
 * Phase 208. The scratch keychain knob's three refusals, driven with an
 * environment record and two paths rather than an Electron.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { harnessKeychainPath } from '../keychain-harness';

let harness = '';
let profile = '';
let keychain = '';
let outside = '';
beforeAll(() => {
  harness = mkdtempSync(join(tmpdir(), 'p208-harness-'));
  profile = join(harness, 'profile');
  mkdirSync(profile);
  keychain = join(harness, 'scratch.keychain-db');
  // THE FILE EXISTS when the app asks, because the probe made it before the
  // launch, and the containment test resolves real paths.
  writeFileSync(keychain, '');
  outside = mkdtempSync(join(tmpdir(), 'p208-outside-'));
});
afterAll(() => {
  rmSync(harness, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe('Phase 208: harnessKeychainPath', () => {
  it('answers the path for an armed probe run whose profile and keychain are inside the harness directory', () => {
    expect(
      harnessKeychainPath(
        { GMUX_HARNESS_KEYCHAIN: keychain, GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness },
        profile
      )
    ).toBe(keychain);
    expect(
      harnessKeychainPath(
        { GMUX_HARNESS_KEYCHAIN: keychain, GMUX_SMOKE: 'basic', GMUX_HARNESS_DIR: harness },
        profile
      )
    ).toBe(keychain);
  });
  it('refuses a launch that is not isolated or armed, so a shell profile cannot reach a real app', () => {
    expect(harnessKeychainPath({ GMUX_HARNESS_KEYCHAIN: keychain, GMUX_HARNESS_DIR: harness }, profile)).toBeNull();
    expect(harnessKeychainPath({ GMUX_HARNESS_KEYCHAIN: keychain, GMUX_PROBES: '0', GMUX_HARNESS_DIR: harness }, profile)).toBeNull();
  });
  it('refuses when no harness directory was handed in', () => {
    expect(harnessKeychainPath({ GMUX_HARNESS_KEYCHAIN: keychain, GMUX_PROBES: '1' }, profile)).toBeNull();
  });
  it('refuses a profile outside the harness directory', () => {
    expect(
      harnessKeychainPath(
        { GMUX_HARNESS_KEYCHAIN: keychain, GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness },
        outside
      )
    ).toBeNull();
  });
  it('refuses a keychain file outside the harness directory, the person own included', () => {
    for (const path of [
      join(outside, 'scratch.keychain-db'),
      '/Users/someone/Library/Keychains/login.keychain-db',
      `${harness}-sibling/x.keychain-db`
    ]) {
      expect(
        harnessKeychainPath(
          { GMUX_HARNESS_KEYCHAIN: path, GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness },
          profile
        )
      ).toBeNull();
    }
  });
  it('an empty knob is no knob', () => {
    expect(harnessKeychainPath({ GMUX_HARNESS_KEYCHAIN: '', GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness }, profile)).toBeNull();
    expect(harnessKeychainPath({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness }, profile)).toBeNull();
  });
});
