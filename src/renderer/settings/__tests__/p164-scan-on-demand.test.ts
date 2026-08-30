/**
 * Phase 164. The agent scan is asked for by a surface that draws from it, and
 * never by the settings store's own `init()`.
 *
 * THE DEFECT THIS GUARDS AGAINST. `init()` used to call `agentsList()` on
 * every window, and the shell mounts the store on every boot, so every launch
 * ran main's full agent scan, fourteen version subprocesses on the operator's
 * machine, before the window was shown, whether or not anything on screen
 * would read the answer. Deleting main's own boot warm alone moved nothing,
 * because this store asked for the same memoised scan within the same boot.
 *
 * What these tests hold, against a stubbed bridge that counts its calls:
 *  - `init()` requests settings and catalogs and NOT the scan;
 *  - `ensureScan()` requests the scan once, and is a no-op while one is in
 *    flight and after one has landed, so any number of surfaces may ask;
 *  - a failed read leaves `scan` null, so the next ask tries again;
 *  - `rescan()` is still the person's explicit re-probe and still lands;
 *  - a bridge without `agentsList` is a no-op rather than a throw.
 *
 * And, read off the source because the vitest environment is node with no
 * DOM (see p135-top-controls.test.ts for that rule): every surface that draws
 * from the scan names `ensureScan`, the two sheets that are mounted for the
 * life of the window ask on OPEN rather than on mount, the quick-create menu
 * asks inside its open callback and not in its mount effect, and the shell's
 * own integration hook, which mounts on every boot, does not ask at all.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentsScanResult } from '@shared/types';

let listCalls = 0;
let rescanCalls = 0;
let listAnswer: () => Promise<AgentsScanResult> = () =>
  Promise.resolve({ agents: [], scannedAt: 1 });

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      settingsGet: () => Promise.resolve({}),
      agentFlagPresets: () => Promise.resolve({}),
      agentsList: () => {
        listCalls += 1;
        return listAnswer();
      },
      agentsRescan: () => {
        rescanCalls += 1;
        return Promise.resolve({ agents: [], scannedAt: 2 });
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
}

installGlobals();

const { useSettingsStore } = await import('../settings-store');

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  listCalls = 0;
  rescanCalls = 0;
  listAnswer = () => Promise.resolve({ agents: [], scannedAt: 1 });
  useSettingsStore.setState({ scan: null, scanning: false });
});

describe('Phase 164: the store never asks for the scan on its own', () => {
  it('init() loads settings and catalogs and requests no scan', async () => {
    useSettingsStore.getState().init();
    await tick();
    expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    expect(useSettingsStore.getState().catalogsLoaded).toBe(true);
    expect(listCalls).toBe(0);
    expect(useSettingsStore.getState().scan).toBeNull();
    expect(useSettingsStore.getState().scanning).toBe(false);
  });

  it('ensureScan() asks once, and is a no-op in flight and after landing', async () => {
    let resolve: ((s: AgentsScanResult) => void) | null = null;
    listAnswer = () =>
      new Promise<AgentsScanResult>((r) => {
        resolve = r;
      });
    const s = useSettingsStore.getState();
    s.ensureScan();
    s.ensureScan();
    s.ensureScan();
    expect(listCalls).toBe(1);
    expect(useSettingsStore.getState().scanning).toBe(true);
    (resolve as unknown as (s: AgentsScanResult) => void)({ agents: [], scannedAt: 7 });
    await tick();
    expect(useSettingsStore.getState().scan?.scannedAt).toBe(7);
    expect(useSettingsStore.getState().scanning).toBe(false);
    useSettingsStore.getState().ensureScan();
    useSettingsStore.getState().ensureScan();
    expect(listCalls).toBe(1);
  });

  it('a failed read leaves scan null so the next ask tries again', async () => {
    listAnswer = () => Promise.reject(new Error('no'));
    useSettingsStore.getState().ensureScan();
    await tick();
    expect(useSettingsStore.getState().scan).toBeNull();
    expect(useSettingsStore.getState().scanning).toBe(false);
    listAnswer = () => Promise.resolve({ agents: [], scannedAt: 3 });
    useSettingsStore.getState().ensureScan();
    await tick();
    expect(listCalls).toBe(2);
    expect(useSettingsStore.getState().scan?.scannedAt).toBe(3);
  });

  it('rescan() is still the explicit re-probe', async () => {
    useSettingsStore.getState().ensureScan();
    await tick();
    await useSettingsStore.getState().rescan();
    expect(rescanCalls).toBe(1);
    expect(useSettingsStore.getState().scan?.scannedAt).toBe(2);
    expect(listCalls).toBe(1);
  });

  it('a bridge without agentsList is a no-op, not a throw', () => {
    const w = (globalThis as unknown as { window?: { gmux: Record<string, unknown> } }).window;
    const saved = w?.gmux.agentsList;
    if (w) delete w.gmux.agentsList;
    try {
      expect(() => useSettingsStore.getState().ensureScan()).not.toThrow();
      expect(useSettingsStore.getState().scanning).toBe(false);
    } finally {
      if (w && saved !== undefined) w.gmux.agentsList = saved;
    }
  });
});

const RENDERER = join(__dirname, '..', '..');
const read = (rel: string): string => readFileSync(join(RENDERER, rel), 'utf8');

/** The body of the first `useEffect(() => { ... }` after `marker`. */
function effectAfter(src: string, marker: string): string {
  const at = src.indexOf(marker);
  expect(at, `marker ${marker}`).toBeGreaterThanOrEqual(0);
  const start = src.indexOf('useEffect(', at);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = src.indexOf('}, [', start);
  return src.slice(start, end);
}

describe('Phase 164: the surfaces that draw from the scan are the ones that ask', () => {
  it('init() in the store no longer names agentsList', () => {
    const src = read('settings/settings-store.ts');
    const initStart = src.indexOf('  init() {');
    const initEnd = src.indexOf('  async update(');
    expect(src.slice(initStart, initEnd)).not.toContain('agentsList');
    // The one place the renderer asks by itself.
    expect(src.split('agentsList').length - 1).toBeGreaterThanOrEqual(2);
  });

  it('the shell integration hook, mounted on every boot, does not ask', () => {
    expect(read('settings/integration.ts')).not.toContain('ensureScan');
    expect(read('settings/presets.ts')).not.toContain('ensureScan');
  });

  it('the NoSessions tiles ask on mount', () => {
    const src = read('app/EmptyStates.tsx');
    expect(effectAfter(src, 'export function NoSessions')).toContain('ensureScan()');
  });

  it('the Create Session sheet asks when it OPENS, not when it mounts', () => {
    const src = read('app/CreateSessionModal.tsx');
    expect(src).toMatch(/if \(open\) ensureScan\(\);/);
    expect(effectAfter(src, 'const initSettings = useSettingsStore')).not.toContain('ensureScan');
  });

  it('the shortcuts sheet asks when it OPENS, not when it mounts', () => {
    const src = read('app/ShortcutsOverlay.tsx');
    expect(src).toMatch(/if \(open\) ensureScan\(\);/);
  });

  it('the quick-create menu asks in its open callback, not in its mount effect', () => {
    const src = read('app/new-session-menu.ts');
    expect(effectAfter(src, 'export function useQuickCreateMenu')).not.toContain('ensureScan');
    const cb = src.slice(src.indexOf('return useCallback('));
    expect(cb).toContain('ensureScan();');
  });

  it('the Settings window and the aim picker ask', () => {
    expect(effectAfter(read('settings/SettingsApp.tsx'), 'export function SettingsApp')).toContain('ensureScan()');
    expect(read('arch/picker.ts')).toContain('useSettingsStore.getState().ensureScan()');
  });
});
