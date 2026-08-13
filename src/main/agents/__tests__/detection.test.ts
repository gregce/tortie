/**
 * Detection service — pure-helper tests (path expansion, glob segment,
 * version-output distillation). The subprocess probe itself is exercised by
 * the smoke battery against real binaries; these pin the parsing rules the
 * research documents (droid's ANSI-colored version, env-conditional store
 * dirs like $CODEX_HOME, nvm's starred bin dirs).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  expandDirs,
  expandPath,
  expandStarSegment,
  extractVersion,
  stripAnsi
} from '../detection';
import { getRegistryEntry } from '../registry';
import { resolveBinaryAgainst } from '../../tmux/resolve';

const HOME = '/Users/probe';

describe('expandPath', () => {
  it('expands leading tilde against home', () => {
    expect(expandPath('~/.codex/sessions', {}, HOME)).toBe(
      '/Users/probe/.codex/sessions'
    );
    expect(expandPath('~', {}, HOME)).toBe(HOME);
  });

  it('expands $VAR and ${VAR} from env', () => {
    const env = { CODEX_HOME: '/x/codex', XDG_DATA_HOME: '/x/data' };
    expect(expandPath('$CODEX_HOME/sessions', env, HOME)).toBe('/x/codex/sessions');
    expect(expandPath('${XDG_DATA_HOME}/muse/sessions', env, HOME)).toBe(
      '/x/data/muse/sessions'
    );
  });

  it('returns null when a referenced var is unset or empty', () => {
    expect(expandPath('$CODEX_HOME/sessions', {}, HOME)).toBeNull();
    expect(expandPath('$PI_CODING_AGENT_DIR', { PI_CODING_AGENT_DIR: '' }, HOME)).toBeNull();
  });

  it('passes plain absolute paths through untouched', () => {
    expect(expandPath('/opt/homebrew/bin', {}, HOME)).toBe('/opt/homebrew/bin');
  });
});

describe('expandStarSegment', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'gmux-detect-'));
  mkdirSync(join(scratch, 'node', 'v18.20.0', 'bin'), { recursive: true });
  mkdirSync(join(scratch, 'node', 'v22.1.0', 'bin'), { recursive: true });
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it('expands one * segment against the filesystem, newest-ish first', () => {
    const hits = expandStarSegment(join(scratch, 'node', '*', 'bin'));
    expect(hits).toEqual([
      join(scratch, 'node', 'v22.1.0', 'bin'),
      join(scratch, 'node', 'v18.20.0', 'bin')
    ]);
  });

  it('returns [] for a glob over a missing dir, passthrough for non-globs', () => {
    expect(expandStarSegment(join(scratch, 'nope', '*', 'bin'))).toEqual([]);
    expect(expandStarSegment('/plain/path')).toEqual(['/plain/path']);
  });
});

describe('expandDirs', () => {
  it('drops env-conditional dirs and keeps the rest, in order', () => {
    const dirs = expandDirs(
      ['$CODEX_HOME/sessions', '~/.codex/sessions'],
      {},
      HOME
    );
    expect(dirs).toEqual(['/Users/probe/.codex/sessions']);
  });
});

describe('version output distillation', () => {
  it('default: first non-empty line, trimmed', () => {
    expect(extractVersion('  1.13.0 (Claude Code)  \n')).toBe('1.13.0 (Claude Code)');
    expect(extractVersion('\n\ncodex-cli 0.42.0\nextra')).toBe('codex-cli 0.42.0');
  });

  it("droid: strip ANSI, take the LAST line (research's documented quirk)", () => {
    const raw = '\u001b[1m\u001b[35mFactory Droid\u001b[0m\nbanner art\n\u001b[32m1.2.3\u001b[0m\n';
    expect(extractVersion(raw, 'strip-ansi-last-line')).toBe('1.2.3');
  });

  it('returns null for empty / whitespace-only output', () => {
    expect(extractVersion('')).toBeNull();
    expect(extractVersion('  \n \n')).toBeNull();
  });

  it('stripAnsi removes CSI color sequences', () => {
    expect(stripAnsi('\u001b[2mdim\u001b[0m plain')).toBe('dim plain');
  });
});

/**
 * PHASE 25.5 — the candidate walk that survives a package rename.
 *
 * npm `deepseek-tui` 0.8.47 publishes an empty bin field, so a fresh install
 * of the old package installs NO executable; the successor `codewhale`
 * installs `codewhale` and `codew`. Detection and launch both walk the
 * registry row's `binaries` in order and take the first hit. These tests
 * drive that exact loop against three synthetic machine states, using the
 * REAL registry row and the REAL resolver — a scratch PATH is the machine
 * state, per the phase spec ("prove detection against a machine state where
 * the old binary is absent").
 */
describe('deepseek → codewhale rename (Phase 25.5)', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'gmux-cw-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  /** A dir carrying the named fake executables, as one PATH entry. */
  function binDir(name: string, bins: string[]): string {
    const dir = join(scratch, name);
    mkdirSync(dir, { recursive: true });
    for (const bin of bins) {
      writeFileSync(join(dir, bin), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    return dir;
  }

  /** detectOne's binary loop, verbatim: first candidate on the PATH wins. */
  function resolveFirst(pathValue: string): string | null {
    for (const bin of getRegistryEntry('deepseek').binaries) {
      const hit = resolveBinaryAgainst(bin, pathValue, []);
      if (hit !== null) return hit;
    }
    return null;
  }

  it('a fresh machine (codewhale only, no legacy binary) is detected', () => {
    const dir = binDir('fresh', ['codewhale', 'codew']);
    expect(resolveFirst(dir)).toBe(join(dir, 'codewhale'));
  });

  it('an existing install (legacy deepseek only) keeps working', () => {
    const dir = binDir('legacy', ['deepseek']);
    expect(resolveFirst(dir)).toBe(join(dir, 'deepseek'));
  });

  it('a machine with both prefers the successor binary', () => {
    const dir = binDir('both', ['codewhale', 'codew', 'deepseek']);
    expect(resolveFirst(dir)).toBe(join(dir, 'codewhale'));
  });

  it('a machine with neither reports nothing — no id-as-binary guess', () => {
    const dir = binDir('empty', []);
    expect(resolveFirst(dir)).toBeNull();
  });
});
