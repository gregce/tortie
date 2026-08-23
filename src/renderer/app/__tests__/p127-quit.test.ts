/**
 * Phase 127. The first-quit toast, where it now lives.
 *
 * The rule this holds is an ORDER, and it is the only thing about this hook
 * that can cost a person anything. With nothing running there is nothing to
 * reassure them about, and burning the one-time flag on that quit would spend
 * the tip where it says nothing. So the live-session test comes first and
 * `showOneTimeTip` is only reached when it passes.
 *
 * It is read as source text for the reason the sibling files record: this
 * repository has no DOM environment, so there is no `window` to hold a
 * bridge and no timer to run out.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(APP_DIR, 'quit.ts'), 'utf8');

describe('useQuitRequests', () => {
  it('holds the quit for 1500 ms and no other number', () => {
    expect(source).toContain('const QUIT_TOAST_MS = 1_500;');
    expect(source).toContain('window.setTimeout(() => void quit(), QUIT_TOAST_MS);');
  });

  it('asks whether anything is running BEFORE it spends the one-time tip', () => {
    const live = source.indexOf('hasLiveSession');
    const tip = source.indexOf("showOneTimeTip('quit-hold')");
    expect(live).toBeGreaterThan(-1);
    expect(tip).toBeGreaterThan(live);
    expect(source).toContain(
      "if (!hasLiveSession || !showOneTimeTip('quit-hold')) {"
    );
  });

  it('quits at once when the tip cannot be shown', () => {
    // showOneTimeTip returns false when storage is unreadable or unwritable,
    // which counts as already-shown. A quit that paused in front of a toast
    // nobody could see would look like a hang.
    const at = source.indexOf("showOneTimeTip('quit-hold')");
    const body = source.slice(at, at + 120);
    expect(body).toContain('void quit();');
  });

  it('needs both bridge members before it subscribes at all', () => {
    expect(source).toContain("typeof bridge?.onQuitRequested !== 'function'");
    expect(source).toContain("typeof bridge.quit !== 'function'");
  });

  it('counts exited and restorable rows as not running', () => {
    expect(source).toContain(
      "(x) => x.status !== 'exited' && x.status !== 'restorable'"
    );
  });
});

describe('App.tsx handed the whole thing over', () => {
  const app = readFileSync(join(APP_DIR, 'App.tsx'), 'utf8');

  it('keeps calling the hook and declares none of it', () => {
    expect(app).toContain('useQuitRequests();');
    expect(app).toContain("import { useQuitRequests } from './quit';");
    expect(app.includes('QUIT_TOAST_MS')).toBe(false);
    expect(app.includes('showOneTimeTip')).toBe(false);
  });

  it('calls the three controllers in the order it called them before', () => {
    const order = [
      'useKeyboardMap();',
      'useZoomKeymap();',
      'useMenuActions();',
      'useSettingsIntegration();',
      'useQuitRequests();',
      'useWindowTitle();',
      'useFileDropRouter();'
    ].map((call) => app.indexOf(call));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i],
        'React reads the hooks of a component by position, so this order is ' +
          'a correctness property rather than a style'
      ).toBeGreaterThan(order[i - 1] ?? -1);
    }
  });
});
