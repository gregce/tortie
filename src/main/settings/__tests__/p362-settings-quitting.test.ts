/**
 * Phase 362 — nothing opens a window into a quitting app, Settings included
 * (build/p362/SPEC.md D9, carried from Phase 357.1's landing as c3).
 *
 * Since this phase the window stays up while a long quit saves (up to 7.5 s
 * measured on a busy Mac), and at the parent the Settings… row clicked in that
 * span opened a Settings window into the quitting app, which the quit then
 * closed (the spec's §2.1, QW). `openSettingsWindow()` now returns before it
 * makes a window when none is up and the quit has begun; a Settings window
 * that is still up is restored and focused as before.
 *
 * Driven over the SHIPPING src/main/settings/window.ts and the REAL lifecycle
 * module, both fresh per case (the lifecycle's one transition never goes back),
 * with electron and the window's three neighbours stood in for. The rule is
 * also asked of a copy of the module with the quitting return taken out, read
 * from the shipping source and imported from a scratch folder with its relative
 * imports made absolute, so the same stand-ins apply; it must make the window,
 * so the case is shown to fail without the rule.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/** What the stood-in BrowserWindow and the bounds store saw. Hoisted: the mock factories read it. */
const h = vi.hoisted(() => ({
  constructed: [] as {
    destroyed: boolean;
    minimized: boolean;
    restores: number;
    focuses: number;
    loads: unknown[][];
  }[],
  boundsReads: 0
}));

vi.mock('electron', () => {
  let nextId = 1;
  class BrowserWindow {
    readonly id = nextId++;
    destroyed = false;
    minimized = false;
    restores = 0;
    focuses = 0;
    readonly loads: unknown[][] = [];
    readonly webContents = { getURL: (): string => 'file:///settings/index.html' };
    constructor() {
      h.constructed.push(this);
    }
    on(): this {
      return this;
    }
    isDestroyed(): boolean {
      return this.destroyed;
    }
    isMinimized(): boolean {
      return this.minimized;
    }
    restore(): void {
      this.restores += 1;
    }
    focus(): void {
      this.focuses += 1;
    }
    show(): void {
      return undefined;
    }
    getBounds(): { x: number; y: number; width: number; height: number } {
      return { x: 0, y: 0, width: 760, height: 560 };
    }
    loadFile(...args: unknown[]): Promise<void> {
      this.loads.push(args);
      return Promise.resolve();
    }
    loadURL(...args: unknown[]): Promise<void> {
      this.loads.push(args);
      return Promise.resolve();
    }
  }
  return { app: { isPackaged: true }, BrowserWindow };
});

vi.mock('../../security/trusted-window', () => ({ applyTrustedWindowPolicy: (): void => undefined }));
vi.mock('../chrome', () => ({
  followChromeHue: (): void => undefined,
  schemeArgsNow: (): string[] => [],
  windowBackgroundNow: (): string => '#000000'
}));
vi.mock('../store', () => ({
  getSettingsWindowBounds: (): undefined => {
    h.boundsReads += 1;
    return undefined;
  },
  saveSettingsWindowBounds: (): void => undefined
}));

type SettingsWindow = typeof import('../window');

const MODULE = join(dirname(fileURLToPath(import.meta.url)), '..', 'window.ts');
let copies = '';

beforeAll(() => {
  copies = mkdtempSync(join(tmpdir(), 'tortie-p362-settings-copy-'));
});
afterAll(() => {
  rmSync(copies, { recursive: true, force: true });
});

describe('openSettingsWindow opens no window into a quitting app (Phase 362, D9)', () => {
  let lifecycle: typeof import('../../lifecycle');
  let settings: SettingsWindow;

  beforeEach(async () => {
    vi.resetModules();
    lifecycle = await import('../../lifecycle');
    settings = await import('../window');
    expect(lifecycle.appLifecycleState()).toBe('running');
    h.constructed.length = 0;
    h.boundsReads = 0;
  }, 60_000);

  it('quitting with no Settings window up: nothing is made and no bounds are read', () => {
    lifecycle.markAppQuitting();
    settings.openSettingsWindow();
    settings.openSettingsWindow('phone');
    expect(h.constructed).toHaveLength(0);
    expect(h.boundsReads).toBe(0);
  });

  it('control: while running, the Settings… row makes the one window', () => {
    settings.openSettingsWindow();
    expect(h.constructed).toHaveLength(1);
    expect(h.boundsReads).toBe(1);
    expect(h.constructed[0]!.loads).toHaveLength(1);
  });

  it('a Settings window still up while quitting is restored and focused, and no second one is made', () => {
    settings.openSettingsWindow();
    const win = h.constructed[0]!;
    win.minimized = true;
    lifecycle.markAppQuitting();
    settings.openSettingsWindow();
    expect(h.constructed).toHaveLength(1);
    expect(win.restores).toBe(1);
    expect(win.focuses).toBe(1);
  });

  it('a Settings window torn down before the quit is not up: quitting, nothing new is made', () => {
    settings.openSettingsWindow();
    h.constructed[0]!.destroyed = true;
    lifecycle.markAppQuitting();
    settings.openSettingsWindow();
    expect(h.constructed).toHaveLength(1);
  });

  it('ablation: a copy without the quitting return makes a Settings window while quitting; an unedited copy does not', async () => {
    const RETURN = "  if (appLifecycleState() === 'quitting') return;\n";
    /** A copy of the module, the return taken out or not, its relative imports made absolute. */
    const copyOf = async (name: string, dropReturn: boolean): Promise<SettingsWindow> => {
      let text = readFileSync(MODULE, 'utf8');
      expect(text.split(RETURN).length - 1, 'the ablation finds its text once').toBe(1);
      if (dropReturn) text = text.replace(RETURN, '');
      text = text.replace(/from '(\.\.?\/[^']+)'/g, (_m, spec: string) => `from '${resolve(dirname(MODULE), spec)}'`);
      const file = join(copies, `${name}.ts`);
      writeFileSync(file, text);
      return (await import(/* @vite-ignore */ file)) as SettingsWindow;
    };
    const control = await copyOf('window-unedited', false);
    const ablated = await copyOf('window-without-return', true);
    lifecycle.markAppQuitting();
    // The unedited copy reads the same lifecycle the case marked, so it refuses too.
    control.openSettingsWindow();
    expect(h.constructed).toHaveLength(0);
    ablated.openSettingsWindow();
    expect(h.constructed).toHaveLength(1);
  });
});
