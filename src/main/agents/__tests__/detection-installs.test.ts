/**
 * Phase 49: the probe budget, the create path's synchronous read, and the
 * install-kind rules (research 47 §4.4, §5 and §10).
 *
 * Three claims are pinned here.
 *
 *  1. The version probe budget is 10,000 ms, so the number cannot drift back
 *     to the 4,000 ms that cut gemini off on the measured machine.
 *  2. The create path's read (`peekDetectedAgents`) starts no scan and runs
 *     no probe. The counters are the proof, not an assurance.
 *  3. `installKindOf` answers canonical only on a matching signature,
 *     package-manager only on the node_modules and Cellar shapes, and unknown
 *     for everything else. Filesystem stat only.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  detectionScanCount,
  installKindOf,
  peekDetectedAgents,
  resetDetectionCache,
  signatureMatches,
  VERSION_PROBE_TIMEOUT_MS,
  versionProbeCount
} from '../detection';

const scratch = mkdtempSync(join(tmpdir(), 'p49-installs-'));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  resetDetectionCache();
});

describe('the probe budget (Phase 49)', () => {
  it('is 10,000 ms, and cannot drift back silently', () => {
    expect(VERSION_PROBE_TIMEOUT_MS).toBe(10_000);
  });
});

describe('the create path can never reach a version probe', () => {
  it('peekDetectedAgents starts no scan and runs no probe', () => {
    expect(peekDetectedAgents()).toBeNull();
    expect(peekDetectedAgents()).toBeNull();
    expect(versionProbeCount()).toBe(0);
    expect(detectionScanCount()).toBe(0);
  });

  it('stays null and probe-free across a tick', async () => {
    peekDetectedAgents();
    await new Promise((r) => setTimeout(r, 10));
    expect(peekDetectedAgents()).toBeNull();
    expect(versionProbeCount()).toBe(0);
    expect(detectionScanCount()).toBe(0);
  });
});

describe('signatureMatches', () => {
  it('realpath-under: true only under the expanded directory', () => {
    const home = join(scratch, 'home-a');
    mkdirSync(join(home, '.local', 'share', 'claude', 'versions'), {
      recursive: true
    });
    const sig = { kind: 'realpath-under', dir: '~/.local/share/claude/versions' } as const;
    expect(
      signatureMatches(
        sig,
        join(home, '.local', 'share', 'claude', 'versions', '2.1.0', 'claude'),
        home
      )
    ).toBe(true);
    expect(signatureMatches(sig, join(home, '.local', 'bin', 'claude'), home)).toBe(false);
    // The directory itself is not "under" it.
    expect(
      signatureMatches(sig, join(home, '.local', 'share', 'claude', 'versions'), home)
    ).toBe(false);
  });

  it('marker-file: true only when the marker exists', () => {
    const home = join(scratch, 'home-b');
    mkdirSync(join(home, '.qwen'), { recursive: true });
    const sig = { kind: 'marker-file', path: '~/.qwen/source.json' } as const;
    expect(signatureMatches(sig, '/anywhere/qwen', home)).toBe(false);
    writeFileSync(join(home, '.qwen', 'source.json'), '{}');
    expect(signatureMatches(sig, '/anywhere/qwen', home)).toBe(true);
  });

  it('sibling-glob: true only when a sibling matches beside the real file', () => {
    const dir = join(scratch, 'muse-dir');
    mkdirSync(dir, { recursive: true });
    const muse = join(dir, 'muse');
    writeFileSync(muse, '#!/bin/sh\n');
    chmodSync(muse, 0o755);
    const sig = { kind: 'sibling-glob', glob: 'muse-bin-*' } as const;
    expect(signatureMatches(sig, muse)).toBe(false);
    writeFileSync(join(dir, 'muse-bin-0.1.0'), '');
    expect(signatureMatches(sig, muse)).toBe(true);
  });
});

describe('installKindOf', () => {
  it('answers canonical when any signature matches', () => {
    const home = join(scratch, 'home-c');
    const versions = join(home, '.local', 'share', 'claude', 'versions');
    mkdirSync(versions, { recursive: true });
    expect(
      installKindOf(
        join(versions, '2.1.0', 'claude'),
        [
          { kind: 'marker-file', path: '~/.claude/never-written' },
          { kind: 'realpath-under', dir: '~/.local/share/claude/versions' }
        ],
        home
      )
    ).toBe('canonical');
  });

  it('answers package-manager for node_modules and the two Cellars', () => {
    expect(
      installKindOf('/x/lib/node_modules/@google/gemini-cli/dist/index.js', null)
    ).toBe('package-manager');
    expect(installKindOf('/opt/homebrew/Cellar/qwen-code/1.0/bin/qwen', null)).toBe(
      'package-manager'
    );
    expect(installKindOf('/usr/local/Cellar/gemini-cli/1.0/bin/gemini', null)).toBe(
      'package-manager'
    );
  });

  it('a failing signature never blocks: it falls through to the path rules', () => {
    const home = join(scratch, 'home-d');
    expect(
      installKindOf(
        '/x/lib/node_modules/codewhale/bin/codewhale',
        [{ kind: 'realpath-under', dir: '~/.local/lib/qwen-code' }],
        home
      )
    ).toBe('package-manager');
  });

  it('answers the honest unknown for everything else', () => {
    expect(installKindOf('/Users/someone/.local/bin/agy', null)).toBe('unknown');
    expect(installKindOf('/usr/local/bin/droid', null)).toBe('unknown');
  });
});
