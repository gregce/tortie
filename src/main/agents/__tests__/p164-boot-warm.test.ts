/**
 * Phase 164. The boot warm of the agent scan is gated on a profile with
 * nothing to show, and the demand path is the memoised scan itself.
 *
 * Three things are pinned here, because each one can be undone in a line.
 *
 *  1. `warmDetectionAtBoot` starts NO scan when the manifest has a row a
 *     person would see, whatever its status, and starts exactly one when the
 *     only rows are discarded tombstones or there are none at all.
 *  2. The warm and a later surface share the one scan: a warm followed by an
 *     `agents:list` style call is one scan started, not two.
 *  3. Source shape, the way boot-refresh-guard.test.ts pins boot: core's boot
 *     body reaches the warm through `warmDetectionAtBoot` with the manifest's
 *     rows, and no longer calls `listDetectedAgents` bare, because a bare call
 *     there is the parent commit's fourteen probes on every launch.
 *
 * The scan under test walks an EMPTY agent table over a scratch PATH, so this
 * file spawns nothing and never touches an agent binary on this machine.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const root = mkdtempSync(join(tmpdir(), 'gmux-p164-warm-'));
const binDir = join(root, 'bin');
mkdirSync(binDir, { recursive: true });

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(binDir),
    extraBinDirs: () => [binDir]
  };
});

const {
  detectionScanCount,
  listDetectedAgents,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource,
  versionProbeCount,
  warmDetectionAtBoot
} = await import('../detection');

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, '..', '..', 'sessions', 'core.ts');

beforeEach(() => {
  resetDetectionCache();
  setAgentTableSource(() => []);
});
afterEach(() => {
  resetAgentTableSource();
  resetDetectionCache();
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const row = (status: string) => ({ status });

describe('warmDetectionAtBoot', () => {
  it('starts no scan when the manifest holds a row a person would see', async () => {
    for (const status of ['running', 'needs_input', 'exited', 'restorable', 'unknown']) {
      resetDetectionCache();
      expect(warmDetectionAtBoot([row(status)])).toBe(false);
      await Promise.resolve();
      expect(detectionScanCount()).toBe(0);
      expect(versionProbeCount()).toBe(0);
    }
  });

  it('starts no scan when one visible row sits among tombstones', async () => {
    expect(warmDetectionAtBoot([row('discarded'), row('restorable'), row('discarded')])).toBe(false);
    await Promise.resolve();
    expect(detectionScanCount()).toBe(0);
  });

  it('starts exactly one scan on an empty manifest', async () => {
    expect(warmDetectionAtBoot([])).toBe(true);
    await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
  });

  it('treats a manifest of discarded tombstones as nothing to show', async () => {
    expect(warmDetectionAtBoot([row('discarded'), row('discarded')])).toBe(true);
    await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
  });

  it('shares its scan with the surface that asks next, so there is never a second', async () => {
    expect(warmDetectionAtBoot([])).toBe(true);
    const fromWarm = listDetectedAgents();
    const fromSurface = listDetectedAgents();
    expect(fromSurface).toBe(fromWarm);
    await fromSurface;
    expect(detectionScanCount()).toBe(1);
    expect(warmDetectionAtBoot([])).toBe(true);
    await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
  });

  it('lets the first surface start the scan when boot started none', async () => {
    expect(warmDetectionAtBoot([row('running')])).toBe(false);
    expect(detectionScanCount()).toBe(0);
    const scan = await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
    expect(scan.agents).toEqual([]);
    await listDetectedAgents();
    expect(detectionScanCount()).toBe(1);
  });
});

describe('GmuxCore.boot, source shape', () => {
  function bootBody(): string {
    const src = readFileSync(CORE, 'utf8');
    const start = src.indexOf('static async boot()');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('return core;', start);
    expect(end).toBeGreaterThan(start);
    return src.slice(start, end);
  }

  it('warms through the gate with the manifest rows, and never bare', () => {
    const body = bootBody();
    expect(body).toMatch(/warmDetectionAtBoot\(core\.manifest\.listSessions\(\)\)/);
    expect(body).not.toMatch(/listDetectedAgents\(/);
    expect(body).not.toMatch(/rescanAgents\(/);
  });

  it('does not await the warm, so a slow probe can never hold the window', () => {
    const body = bootBody();
    expect(body).not.toMatch(/await\s+warmDetectionAtBoot/);
  });
});
