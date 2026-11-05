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
 * PHASE 350 adds D18's warm beside it (build/p350/SPEC.md §6 item 3), and every
 * case above stays: `warmDetectionForLocalPi` starts the one scan only for a pi
 * row on this Mac a person would see and shares it with every other asker, the
 * core asks it once at the first terminal bytes and never in the boot body, and
 * the boot body subscribes the pi pass to the first scan's answer without
 * starting one. Both edges are read from the source, the way the boot is.
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
  warmDetectionAtBoot,
  warmDetectionForLocalPi
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

const pi = (status: string, machineId?: string) => ({
  agent: 'pi',
  status,
  ...(machineId !== undefined ? { machineId } : {})
});

describe('warmDetectionForLocalPi (Phase 350, D18)', () => {
  it('starts exactly one scan for a pi row on this Mac a person would see', async () => {
    for (const status of ['running', 'needs_input', 'exited', 'restorable', 'unknown']) {
      resetDetectionCache();
      expect(warmDetectionForLocalPi([pi(status)]), status).toBe(true);
      await listDetectedAgents();
      expect(detectionScanCount(), status).toBe(1);
    }
    // `local` spelled out is this Mac too.
    resetDetectionCache();
    expect(warmDetectionForLocalPi([pi('restorable', 'local')])).toBe(true);
  });

  it('starts nothing for a discarded pi row, a pi row on another machine, or no pi row', async () => {
    const quiet: Array<ReadonlyArray<{ agent: string; status: string; machineId?: string }>> = [
      [],
      [pi('discarded')],
      [pi('restorable', 'mac-pro'), pi('running', 'studio')],
      [{ agent: 'claude', status: 'running' }, { agent: 'codex', status: 'restorable' }],
      [{ agent: 'omp', status: 'running' }]
    ];
    for (const rows of quiet) {
      resetDetectionCache();
      expect(warmDetectionForLocalPi(rows), JSON.stringify(rows)).toBe(false);
      await Promise.resolve();
      expect(detectionScanCount(), JSON.stringify(rows)).toBe(0);
      expect(versionProbeCount(), JSON.stringify(rows)).toBe(0);
    }
  });

  it('shares its scan with the boot warm and the surface that asks next', async () => {
    expect(warmDetectionAtBoot([])).toBe(true);
    expect(warmDetectionForLocalPi([pi('running')])).toBe(true);
    const fromSurface = listDetectedAgents();
    await fromSurface;
    expect(detectionScanCount()).toBe(1);
    // Asked again, it reuses the same memoised scan.
    expect(warmDetectionForLocalPi([pi('running')])).toBe(true);
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

  it('PHASE 350: no pi warm at boot, and the pi pass waits on the first answer behind the disposed flag', () => {
    const body = bootBody();
    // D18: the warm is the first terminal bytes', never the boot's.
    expect(body).not.toMatch(/warmDetectionForLocalPi\(/);
    // D19: one subscription, after the first refresh, that starts nothing.
    const refreshAt = body.search(/core\.refresh\(\)\s*\.catch\(/);
    const subscribeAt = body.indexOf('firstScanAnswered()');
    expect(refreshAt).toBeGreaterThan(-1);
    expect(subscribeAt).toBeGreaterThan(refreshAt);
    expect(body.indexOf('firstScanAnswered()', subscribeAt + 1)).toBe(-1);
    expect(body).not.toMatch(/await\s+firstScanAnswered/);
    const continuation = body.slice(subscribeAt);
    const disposedAt = continuation.indexOf('if (core.disposed) return;');
    // The fix round: the pass reads each row's own binary's floor and the row's own composition.
    const passAt = continuation.indexOf(
      'repairPiInlineOnce(core.manifest, { floorFor: piInlineFloorFor, ownResume: piOwnResumeArgv })'
    );
    expect(disposedAt).toBeGreaterThan(-1);
    expect(passAt).toBeGreaterThan(disposedAt);
    expect(continuation).toMatch(/\.catch\(/);
  });
});

describe('GmuxCore, the first terminal bytes (Phase 350, D18)', () => {
  /** The attach host's `onData` handler the constructor hands it, braces matched. */
  function onDataBody(): string {
    const src = readFileSync(CORE, 'utf8');
    const start = src.indexOf('onData: (sessionId, byteLength) => {');
    expect(start).toBeGreaterThan(-1);
    expect(src.indexOf('onData: (sessionId, byteLength) => {', start + 1)).toBe(-1);
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) return src.slice(start, i + 1);
      }
    }
    throw new Error('the onData handler does not close');
  }

  it('asks the pi warm once, after the milestone, behind its own latch, in a try', () => {
    const body = onDataBody();
    const milestone = body.indexOf('markMilestone(MILESTONES.firstBytes)');
    const latch = body.indexOf('!this.piWarmAsked');
    const set = body.indexOf('this.piWarmAsked = true;');
    const tryAt = body.indexOf('try {');
    const warm = body.indexOf('warmDetectionForLocalPi(this.manifest.listSessions())');
    expect(milestone).toBeGreaterThan(-1);
    expect(latch).toBeGreaterThan(milestone);
    expect(set).toBeGreaterThan(latch);
    expect(tryAt).toBeGreaterThan(set);
    expect(warm).toBeGreaterThan(tryAt);
    // One call, and the rest of the edge unchanged: the tap still runs after it.
    expect(body.indexOf('warmDetectionForLocalPi(', warm + 1)).toBe(-1);
    expect(body.indexOf('this.onTermData?.(sessionId, byteLength);')).toBeGreaterThan(warm);
    // Never the milestone itself, and never a scan by its own name.
    expect(body).not.toMatch(/listDetectedAgents\(|rescanAgents\(/);
  });

  it('the latch is a core field of its own, false until the first chunk', () => {
    const src = readFileSync(CORE, 'utf8');
    expect(src).toMatch(/\n  private piWarmAsked = false;\n/);
    // Set in exactly one place.
    expect(src.split('this.piWarmAsked = true;').length - 1).toBe(1);
  });
});
