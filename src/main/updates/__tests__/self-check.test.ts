/**
 * The post update self check's two decidable parts (Phase 24):
 *
 *  1. The first run rule. The version comparison decides record, nothing,
 *     or verify, and it is a pure function, so every branch is pinned here
 *     including the downgrade direction.
 *  2. The resource list. The four labels, their order, and the fact that
 *     each probe answers from the resolver's path and nothing else. The
 *     probes run against real files in a temp directory, so `existsSync`
 *     behavior is the real one.
 *
 * `runPostUpdateSelfCheck` itself is exercised by the phase rehearsal (the
 * self check probe deletes gmux-tmux.conf from a swapped bundle and expects
 * the pinned log line), which is where the wiring is proven against the real
 * packaged app.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every collaborator is mocked at the module seam, so this test loads no
// electron, opens no state file and posts no notice. The probe paths are
// mutable so each test points them at its own temp files.
const seams = vi.hoisted(() => ({
  confPath: '',
  specstoryPath: '',
  rgPath: '',
  runtimeWasmPath: '',
  missingGrammarIds: [] as string[]
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: (): string => '0.0.0',
    getPath: (): string => ''
  }
}));
vi.mock('../../tmux', () => ({
  resolveConfPath: (): string => seams.confPath
}));
vi.mock('../../specstory/resolve', () => ({
  bundledSpecstoryPath: (): string => seams.specstoryPath
}));
vi.mock('../../search/resolve', () => ({
  rgBinaryPath: (): string => seams.rgPath
}));
vi.mock('../../symbols/paths', () => ({
  missingGrammars: (): string[] => seams.missingGrammarIds,
  runtimeWasmPath: (): string => seams.runtimeWasmPath
}));
vi.mock('../state', () => ({
  readUpdateState: (): {
    lastSeenVersion: string | null;
    allowDowngrade: boolean;
    lastCheckedAt: number | null;
  } => ({ lastSeenVersion: null, allowDowngrade: false, lastCheckedAt: null }),
  writeUpdateState: (): void => {}
}));
vi.mock('../../notice', () => ({
  postDurabilityNotice: (): boolean => true
}));

import {
  defaultResourceProbes,
  missingResourceLabels,
  selfCheckAction
} from '../self-check';
import type { ResourceProbe } from '../self-check';

describe('the first run rule', () => {
  it('records the version and checks nothing on the first boot under this code', () => {
    expect(selfCheckAction(null, '0.18.2')).toBe('record-first-run');
  });

  it('does nothing when the version did not change', () => {
    expect(selfCheckAction('0.18.2', '0.18.2')).toBe('nothing');
  });

  it('verifies when the version went up', () => {
    expect(selfCheckAction('0.18.1', '0.18.2')).toBe('verify');
  });

  it('verifies when the version went down, because a downgrade swaps the bundle the same way', () => {
    expect(selfCheckAction('0.18.2', '0.18.1')).toBe('verify');
  });
});

describe('the resource list', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tortie-self-check-'));
    seams.confPath = join(dir, 'gmux-tmux.conf');
    seams.specstoryPath = join(dir, 'specstory');
    seams.rgPath = join(dir, 'rg');
    seams.runtimeWasmPath = join(dir, 'web-tree-sitter.wasm');
    seams.missingGrammarIds = [];
    for (const p of [
      seams.confPath,
      seams.specstoryPath,
      seams.rgPath,
      seams.runtimeWasmPath
    ]) {
      writeFileSync(p, 'x');
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('names the four resources in the order the spec table gives them', () => {
    expect(defaultResourceProbes().map((p) => p.label)).toEqual([
      'tmux config',
      'specstory',
      'ripgrep',
      'tree-sitter'
    ]);
  });

  it('finds nothing missing when every file is on disk', () => {
    expect(missingResourceLabels(defaultResourceProbes())).toEqual([]);
  });

  it('names the tmux config when its file is gone', () => {
    rmSync(seams.confPath);
    expect(missingResourceLabels(defaultResourceProbes())).toEqual([
      'tmux config'
    ]);
  });

  it('counts tree-sitter missing when a grammar wasm is gone, even with the runtime present', () => {
    seams.missingGrammarIds = ['go'];
    expect(missingResourceLabels(defaultResourceProbes())).toEqual([
      'tree-sitter'
    ]);
  });

  it('counts tree-sitter missing when the runtime wasm is gone, even with every grammar present', () => {
    rmSync(seams.runtimeWasmPath);
    expect(missingResourceLabels(defaultResourceProbes())).toEqual([
      'tree-sitter'
    ]);
  });

  it('reports every missing resource in one list', () => {
    rmSync(seams.specstoryPath);
    rmSync(seams.rgPath);
    expect(missingResourceLabels(defaultResourceProbes())).toEqual([
      'specstory',
      'ripgrep'
    ]);
  });
});

describe('missingResourceLabels', () => {
  it('keeps the order the probes were given', () => {
    const probes: ResourceProbe[] = [
      { label: 'a', present: () => false },
      { label: 'b', present: () => true },
      { label: 'c', present: () => false }
    ];
    expect(missingResourceLabels(probes)).toEqual(['a', 'c']);
  });

  it('counts a probe that throws as missing rather than rejecting', () => {
    const probes: ResourceProbe[] = [
      {
        label: 'broken',
        present: () => {
          throw new Error('the resolver could not produce a path');
        }
      },
      { label: 'fine', present: () => true }
    ];
    expect(missingResourceLabels(probes)).toEqual(['broken']);
  });
});
