/**
 * The Phase 115 entitlement contract, pinned spawn-free (research 59).
 *
 * Github issue 10: macOS killed the bundled SpecStory binary (SIGKILL,
 * termination namespace CODESIGNING) the first time a session save carried
 * secret-shaped text, because the betterleaks scanner runs re2 as wasm
 * through wazero, and wazero turns writable anonymous memory into executable
 * memory, which the hardened runtime forbids without
 * com.apple.security.cs.allow-unsigned-executable-memory. The fix is exactly
 * one entitlement on Resources/bin/specstory and nothing else. This file
 * pins the shape of that fix so a later cleanup cannot widen, narrow or
 * silently drop it. Nothing here spawns, signs or downloads; the live A/B is
 * `npm run conformance:specstory:entitlement`.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const BUILD = join(ROOT, 'build');
const require = createRequire(import.meta.url);

const ALLOW_UNSIGNED_EXEC_MEM = 'com.apple.security.cs.allow-unsigned-executable-memory';
const DISABLE_LIBRARY_VALIDATION = 'com.apple.security.cs.disable-library-validation';

/** Every <key> element of a plist, in order. A parse this narrow cannot lie
 *  about VALUES, so the one value assertion reads the raw text directly. */
function plistKeys(text: string): string[] {
  return [...text.matchAll(/<key>([^<]+)<\/key>/g)].map((m) => m[1] ?? '');
}

describe('the specstory entitlements plist', () => {
  const plistPath = join(BUILD, 'entitlements.specstory.plist');

  it('exists and carries exactly one key, the one the wazero runtime needs', () => {
    const text = readFileSync(plistPath, 'utf8');
    expect(plistKeys(text)).toEqual([ALLOW_UNSIGNED_EXEC_MEM]);
    // The key must be granted, not present-but-false.
    expect(text).toContain(`<key>${ALLOW_UNSIGNED_EXEC_MEM}</key>\n\t<true/>`);
  });

  it('never grants disable-library-validation, and neither does any other build plist (refusal 6)', () => {
    // The key SET is what is checked, not the raw text: the Electron plists
    // name the key in a comment precisely to say it is deliberately absent.
    for (const name of [
      'entitlements.specstory.plist',
      'entitlements.mac.plist',
      'entitlements.mac.inherit.plist'
    ]) {
      const path = join(BUILD, name);
      if (!existsSync(path)) continue;
      expect(
        plistKeys(readFileSync(path, 'utf8')),
        `${name} must never grant ${DISABLE_LIBRARY_VALIDATION}`
      ).not.toContain(DISABLE_LIBRARY_VALIDATION);
    }
  });
});

describe('the NESTED_BINARIES rows', () => {
  const { NESTED_BINARIES } = require(join(BUILD, 'sign-nested-binaries.cjs')) as {
    NESTED_BINARIES: readonly {
      relative: string;
      identifierSuffix: string;
      entitlements?: { plist: string; keys: string[] };
    }[];
  };

  it('the specstory row carries the plist and the exact one-key expectation', () => {
    const row = NESTED_BINARIES.find((r) => r.identifierSuffix === 'specstory');
    expect(row).toBeDefined();
    expect(row?.relative).toBe('Resources/bin/specstory');
    expect(row?.entitlements?.plist).toBe('entitlements.specstory.plist');
    expect(row?.entitlements?.keys).toEqual([ALLOW_UNSIGNED_EXEC_MEM]);
    // The row names a file that must exist, or the pack throws.
    expect(existsSync(join(BUILD, row?.entitlements?.plist ?? ''))).toBe(true);
  });

  it('rg and tmux carry no entitlements field, which the read back holds to the empty set', () => {
    for (const suffix of ['rg', 'tmux']) {
      const row = NESTED_BINARIES.find((r) => r.identifierSuffix === suffix);
      expect(row, `row ${suffix} exists`).toBeDefined();
      expect(row?.entitlements, `row ${suffix} carries no entitlements`).toBeUndefined();
    }
  });

  it('no row expectation ever contains disable-library-validation', () => {
    for (const row of NESTED_BINARIES) {
      expect(row.entitlements?.keys ?? []).not.toContain(DISABLE_LIBRARY_VALIDATION);
    }
  });
});

describe('the sign hook prose', () => {
  const hookText = readFileSync(join(BUILD, 'sign-nested-binaries.cjs'), 'utf8');

  it('no longer claims zero entitlements are needed', () => {
    // Both header lines issue 10 falsified (research 59 section 2). The
    // phrases below are the exact ones the old header used.
    expect(hookText.includes('ZERO entitlements are needed')).toBe(false);
    expect(hookText.includes('ENTITLEMENTS: none')).toBe(false);
  });

  it('names the true cause, wazero, where the old claim stood', () => {
    expect(hookText).toContain('wazero');
    expect(hookText).toContain(ALLOW_UNSIGNED_EXEC_MEM);
  });
});

describe('the specstory pin', () => {
  const pin = JSON.parse(readFileSync(join(BUILD, 'specstory-release.json'), 'utf8')) as {
    repo: string;
    tag: string;
    version: string;
    assets: Record<
      string,
      { name: string; member: string; assetSha256: string; binarySha256: string; binaryBytes: number }
    >;
  };

  it('is the exact 2.10.0 block research 59 computed against the release checksums', () => {
    expect(pin.repo).toBe('specstoryai/getspecstory');
    expect(pin.tag).toBe('v2.10.0');
    expect(pin.version).toBe('2.10.0');
    const asset = pin.assets['darwin-arm64'];
    expect(asset).toBeDefined();
    expect(asset?.name).toBe('SpecStoryCLI_Darwin_arm64.tar.gz');
    expect(asset?.member).toBe('specstory');
    expect(asset?.assetSha256).toBe(
      'a084607a2bb2dcd318c0fa4fef745678f88fadd1f9c28c247229af03b7a75488'
    );
    expect(asset?.binarySha256).toBe(
      'c8fa81efff373bc3c948df0c2a64cb732f4da1cc3cc1ebdbe118f9e7b5e63662'
    );
    expect(asset?.binaryBytes).toBe(43358082);
  });

  it('keeps tag and version in step, the rule the pin note states', () => {
    expect(pin.tag).toBe(`v${pin.version}`);
  });
});
