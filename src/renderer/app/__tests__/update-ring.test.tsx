/**
 * The update ring (Phase 58), the renderer half of the section 9.3 matrix.
 *
 * What these tests hold:
 * - The ring renders nothing when main says hidden, and nothing at all when
 *   the preload lacks updates.state, updates.onChanged or popupMenu.
 * - Every visible stage carries its exact class, its exact hover string and
 *   its arc geometry, straight from the spec's section 7.1.
 * - The click dispatches exactly the spec's menu items to the popupMenu
 *   bridge, and each picked id reaches the right bridge call.
 * - Checking, downloading and staging never open a menu.
 * - No DOM menu exists on any path. The markup is a button, one svg and its
 *   circles, nothing else.
 *
 * The vitest environment is node, so the assertions read static markup from
 * react-dom/server rather than a mounted DOM. The mounted half's effect
 * (state read plus subscription) is not exercised here. The Tier 3 probes
 * drive the real app for that.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UpdateRingStage, UpdateUiState } from '@shared/ipc';
import {
  RING_CIRCUMFERENCE,
  openRingMenu,
  ringArcDasharray,
  ringBridge,
  ringHover,
  ringMenuItems,
  UpdateRing,
  UpdateRingView
} from '../UpdateRing';
import type { RingBridge } from '../UpdateRing';

/** A full UpdateUiState with quiet defaults, overridden per case. */
function state(over: Partial<UpdateUiState>): UpdateUiState {
  return {
    currentVersion: '0.25.0',
    stagedVersion: null,
    lastCheckedAt: null,
    needsUpdateRepair: false,
    ring: 'hidden',
    ringVersion: null,
    ringPercent: null,
    failedDuring: null,
    ...over
  };
}

function view(over: Partial<UpdateUiState>): string {
  return renderToStaticMarkup(<UpdateRingView state={state(over)} />);
}

/** Install a fake window for the mounted component, torn down after each test. */
function installWindow(gmux: unknown): void {
  (globalThis as { window?: unknown }).window = { gmux };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

/** A bridge whose popup always answers `picked`, with every call recorded. */
function fakeBridge(picked: string | null): RingBridge & {
  state: ReturnType<typeof vi.fn>;
  onChanged: ReturnType<typeof vi.fn>;
  restartNow: ReturnType<typeof vi.fn>;
  whyFailed: ReturnType<typeof vi.fn>;
  repair: ReturnType<typeof vi.fn>;
  popupMenu: ReturnType<typeof vi.fn>;
} {
  return {
    state: vi.fn(async () => state({})),
    onChanged: vi.fn(() => () => {}),
    restartNow: vi.fn(async () => {}),
    whyFailed: vi.fn(async () => {}),
    repair: vi.fn(async () => {}),
    popupMenu: vi.fn(async () => picked)
  };
}

describe('hidden and missing extras', () => {
  it('renders nothing when main says hidden', () => {
    expect(view({ ring: 'hidden' })).toBe('');
  });

  it('the mounted component renders nothing when window.gmux is absent', () => {
    installWindow(undefined);
    expect(renderToStaticMarkup(<UpdateRing />)).toBe('');
  });

  it('renders nothing when updates.state is missing', () => {
    installWindow({ popupMenu: async () => null, updates: {} });
    expect(ringBridge()).toBeNull();
    expect(renderToStaticMarkup(<UpdateRing />)).toBe('');
  });

  it('renders nothing when updates.onChanged is missing', () => {
    installWindow({
      popupMenu: async () => null,
      updates: { state: async () => state({}) }
    });
    expect(ringBridge()).toBeNull();
    expect(renderToStaticMarkup(<UpdateRing />)).toBe('');
  });

  it('renders nothing when popupMenu is missing', () => {
    installWindow({
      updates: { state: async () => state({}), onChanged: () => () => {} }
    });
    expect(ringBridge()).toBeNull();
    expect(renderToStaticMarkup(<UpdateRing />)).toBe('');
  });

  it('detects the bridge when all three members exist', () => {
    installWindow({
      popupMenu: async () => null,
      updates: { state: async () => state({}), onChanged: () => () => {} }
    });
    expect(ringBridge()).not.toBeNull();
  });
});

describe('arc geometry', () => {
  it('the circumference is 2 pi times radius 7', () => {
    expect(RING_CIRCUMFERENCE).toBeCloseTo(43.9823, 3);
  });

  it('a quarter turn and a known percent produce exact dasharrays', () => {
    expect(ringArcDasharray(25)).toBe('11 43.98');
    expect(ringArcDasharray(40)).toBe('17.59 43.98');
    expect(ringArcDasharray(0)).toBe('0 43.98');
    expect(ringArcDasharray(100)).toBe('43.98 43.98');
  });

  it('clamps wild percents to 0 to 100', () => {
    expect(ringArcDasharray(150)).toBe('43.98 43.98');
    expect(ringArcDasharray(-5)).toBe('0 43.98');
  });
});

describe('per stage class, hover and drawing', () => {
  it('checking wears its class, its words and a spinning quarter arc', () => {
    const markup = view({ ring: 'checking' });
    expect(markup).toContain('class="update-ring update-ring-checking"');
    expect(markup).toContain('title="Checking for updates"');
    expect(markup).toContain('aria-label="Checking for updates"');
    expect(markup).toContain('update-ring-track');
    expect(markup).toContain('update-ring-spin');
    expect(markup).toContain('stroke-dasharray="11 43.98"');
  });

  it('downloading carries the version, the floored percent and the arc', () => {
    const markup = view({
      ring: 'downloading',
      ringVersion: '0.26.0',
      ringPercent: 40
    });
    expect(markup).toContain('class="update-ring update-ring-downloading"');
    expect(markup).toContain('title="Downloading 0.26.0, 40 percent"');
    expect(markup).toContain('aria-label="Downloading 0.26.0, 40 percent"');
    expect(markup).toContain('stroke-dasharray="17.59 43.98"');
    expect(markup).not.toContain('update-ring-spin');
  });

  it('downloading at 0 percent draws the determinate arc at zero', () => {
    const markup = view({
      ring: 'downloading',
      ringVersion: '0.26.0',
      ringPercent: 0
    });
    expect(markup).toContain('title="Downloading 0.26.0, 0 percent"');
    expect(markup).toContain('stroke-dasharray="0 43.98"');
  });

  it('the hover percent is floored, never rounded up', () => {
    expect(
      ringHover({
        ring: 'downloading',
        ringVersion: '0.26.0',
        ringPercent: 99.9,
        failedDuring: null
      })
    ).toBe('Downloading 0.26.0, 99 percent');
  });

  it('staging draws exactly like checking, with its own words', () => {
    const markup = view({ ring: 'staging', ringVersion: '0.26.0' });
    expect(markup).toContain('class="update-ring update-ring-staging"');
    expect(markup).toContain('title="Preparing 0.26.0"');
    expect(markup).toContain('update-ring-spin');
    expect(markup).toContain('stroke-dasharray="11 43.98"');
  });

  it('ready keeps the quit promise in its words, full circle and dot', () => {
    const markup = view({ ring: 'ready', ringVersion: '0.26.0' });
    expect(markup).toContain('class="update-ring update-ring-ready"');
    expect(markup).toContain(
      'title="Tortie 0.26.0 is ready. It installs when you quit. Click to choose when."'
    );
    expect(markup).toContain('update-ring-full');
    expect(markup).toContain('update-ring-dot');
    expect(markup).not.toContain('update-ring-spin');
    expect(markup).not.toContain('stroke-dasharray');
  });

  it('failed during checking names the check', () => {
    const markup = view({ ring: 'failed', failedDuring: 'checking' });
    expect(markup).toContain('class="update-ring update-ring-failed"');
    expect(markup).toContain(
      'title="The update check failed. Click to see why."'
    );
    expect(markup).toContain('update-ring-full');
    expect(markup).not.toContain('update-ring-dot');
    expect(markup).not.toContain('update-ring-spin');
  });

  it('failed during downloading names the version', () => {
    expect(
      ringHover({
        ring: 'failed',
        ringVersion: '0.26.0',
        ringPercent: null,
        failedDuring: 'downloading'
      })
    ).toBe('The download of 0.26.0 did not finish. Click to see why.');
  });

  it('failed during staging names the version', () => {
    expect(
      ringHover({
        ring: 'failed',
        ringVersion: '0.26.0',
        ringPercent: null,
        failedDuring: 'staging'
      })
    ).toBe('Tortie could not prepare 0.26.0. Click to see why.');
  });

  it('failed with the stage unknown stays truthful and generic', () => {
    expect(
      ringHover({
        ring: 'failed',
        ringVersion: null,
        ringPercent: null,
        failedDuring: null
      })
    ).toBe('The update did not finish. Click to see why.');
  });
});

describe('the menu items', () => {
  it('ready offers exactly restart now and install on quit, in order', () => {
    expect(ringMenuItems('ready')).toEqual([
      { id: 'restart-now', label: 'Restart and update now' },
      { id: 'install-on-quit', label: 'Install when you quit' }
    ]);
  });

  it('failed offers exactly why it failed and repair, in order', () => {
    expect(ringMenuItems('failed')).toEqual([
      { id: 'why-failed', label: 'Why it failed' },
      { id: 'repair', label: 'Repair updates' }
    ]);
  });

  it('every other stage has no menu at all', () => {
    const silent: UpdateRingStage[] = [
      'hidden',
      'checking',
      'downloading',
      'staging'
    ];
    for (const stage of silent) {
      expect(ringMenuItems(stage)).toBeNull();
    }
  });
});

describe('the click, through ui:popupMenu only', () => {
  it('ready sends the exact items and restart-now reaches restartNow', async () => {
    const bridge = fakeBridge('restart-now');
    await openRingMenu('ready', bridge, { x: 52.4, y: 700.6 });
    expect(bridge.popupMenu).toHaveBeenCalledTimes(1);
    expect(bridge.popupMenu).toHaveBeenCalledWith({
      x: 52,
      y: 701,
      items: [
        { id: 'restart-now', label: 'Restart and update now' },
        { id: 'install-on-quit', label: 'Install when you quit' }
      ]
    });
    expect(bridge.restartNow).toHaveBeenCalledTimes(1);
    expect(bridge.whyFailed).not.toHaveBeenCalled();
    expect(bridge.repair).not.toHaveBeenCalled();
  });

  it('install-on-quit changes nothing and the ring stays as it is', async () => {
    const bridge = fakeBridge('install-on-quit');
    await openRingMenu('ready', bridge, { x: 0, y: 0 });
    expect(bridge.restartNow).not.toHaveBeenCalled();
    expect(bridge.whyFailed).not.toHaveBeenCalled();
    expect(bridge.repair).not.toHaveBeenCalled();
  });

  it('a dismissal runs nothing', async () => {
    const bridge = fakeBridge(null);
    await openRingMenu('ready', bridge, { x: 0, y: 0 });
    expect(bridge.restartNow).not.toHaveBeenCalled();
    expect(bridge.whyFailed).not.toHaveBeenCalled();
    expect(bridge.repair).not.toHaveBeenCalled();
  });

  it('failed sends the exact items and why-failed reaches whyFailed', async () => {
    const bridge = fakeBridge('why-failed');
    await openRingMenu('failed', bridge, { x: 10, y: 20 });
    expect(bridge.popupMenu).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      items: [
        { id: 'why-failed', label: 'Why it failed' },
        { id: 'repair', label: 'Repair updates' }
      ]
    });
    expect(bridge.whyFailed).toHaveBeenCalledTimes(1);
    expect(bridge.restartNow).not.toHaveBeenCalled();
    expect(bridge.repair).not.toHaveBeenCalled();
  });

  it('repair reaches repair', async () => {
    const bridge = fakeBridge('repair');
    await openRingMenu('failed', bridge, { x: 10, y: 20 });
    expect(bridge.repair).toHaveBeenCalledTimes(1);
    expect(bridge.whyFailed).not.toHaveBeenCalled();
  });

  it('checking, downloading and staging never open a menu', async () => {
    const silent: UpdateRingStage[] = ['checking', 'downloading', 'staging'];
    for (const stage of silent) {
      const bridge = fakeBridge('restart-now');
      await openRingMenu(stage, bridge, { x: 0, y: 0 });
      expect(bridge.popupMenu).not.toHaveBeenCalled();
      expect(bridge.restartNow).not.toHaveBeenCalled();
    }
  });

  it('a popup failure is a dismissal, never a thrown error', async () => {
    const bridge = fakeBridge(null);
    bridge.popupMenu.mockRejectedValueOnce(new Error('popup failed in main'));
    await expect(
      openRingMenu('ready', bridge, { x: 0, y: 0 })
    ).resolves.toBeUndefined();
    expect(bridge.restartNow).not.toHaveBeenCalled();
  });

  it('a failing action call never rejects out of the click', async () => {
    const bridge = fakeBridge('restart-now');
    bridge.restartNow.mockRejectedValueOnce(new Error('not staged'));
    await expect(
      openRingMenu('ready', bridge, { x: 0, y: 0 })
    ).resolves.toBeUndefined();
  });
});

describe('no DOM menu on any path', () => {
  it('every visible stage renders a button, one svg and circles only', () => {
    const stages: Partial<UpdateUiState>[] = [
      { ring: 'checking' },
      { ring: 'downloading', ringVersion: '0.26.0', ringPercent: 40 },
      { ring: 'staging', ringVersion: '0.26.0' },
      { ring: 'ready', ringVersion: '0.26.0' },
      { ring: 'failed', failedDuring: 'checking' }
    ];
    for (const over of stages) {
      const markup = view(over);
      const tags = new Set(
        [...markup.matchAll(/<([a-z]+)/g)].map((m) => m[1])
      );
      expect([...tags].sort()).toEqual(
        expect.arrayContaining(['button', 'circle', 'svg'])
      );
      for (const tag of tags) {
        expect(['button', 'svg', 'circle']).toContain(tag);
      }
      expect(markup).not.toContain('role="menu"');
    }
  });

  it('the ring carries no badge and no count', () => {
    const markup = view({ ring: 'ready', ringVersion: '0.26.0' });
    expect(markup).not.toContain('ab-badge');
  });
});
