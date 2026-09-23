/**
 * The Settings window (S13) — a dedicated single-instance BrowserWindow.
 *
 * DESIGN-SPEC S13: "a dedicated window, not an in-app panel. Settings
 * outlive any one project… Single instance: ⌘, or the activity-bar gear
 * opens/focuses it; ⌘W closes it when focused. Native titled window —
 * standard traffic lights, title 'Settings' — w:760 h:560 default, min
 * 640×480, resizable, position remembered."
 *
 * The window loads the settings renderer entry (src/renderer/settings/
 * index.html — a second electron-vite renderer input) with the SAME preload
 * bridge as the main window; it simply uses the settings/agents subset.
 */

import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { applyTrustedWindowPolicy } from '../security/trusted-window';
import { followChromeHue, schemeArgsNow, windowBackgroundNow } from './chrome';
import {
  getSettingsWindowBounds,
  saveSettingsWindowBounds
} from './store';

let settingsWindow: BrowserWindow | null = null;

/** Is this BrowserWindow the Settings window? (menu ⌘W routing, targeting) */
export function isSettingsWindow(win: BrowserWindow | null): boolean {
  return win !== null && settingsWindow !== null && win.id === settingsWindow.id;
}

/**
 * A Settings section a menu row may open straight to (Phase 316.1). The
 * renderer reads it from the location hash with `sectionFromHash` in
 * src/renderer/settings/SettingsApp.tsx, which takes only an id already on
 * its rail, and keeps the hash in step with the rail after that.
 */
export type SettingsSectionLink = 'phone';

/**
 * Open the Settings window, or focus the existing one (single instance).
 *
 * With a `section`, the window opens at it; an open window moves to it by a
 * fragment change, which the page hears as `hashchange` without reloading. A
 * window already at that section is left alone, because loading the same URL
 * again would reload it and shut whatever the person had open there.
 */
export function openSettingsWindow(section?: SettingsSectionLink): void {
  if (settingsWindow !== null && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    if (section !== undefined) {
      const now = settingsWindow.webContents.getURL();
      if (!now.endsWith(`#${section}`)) loadSettingsPage(settingsWindow, section);
    }
    settingsWindow.focus();
    return;
  }

  const remembered = getSettingsWindowBounds();
  const win = new BrowserWindow({
    width: remembered?.width ?? 760,
    height: remembered?.height ?? 560,
    ...(remembered !== undefined ? { x: remembered.x, y: remembered.y } : {}),
    minWidth: 640,
    minHeight: 480,
    title: 'Settings',
    show: false,
    // Same pre-paint material as the app (--bg-canvas) — no launch flash.
    // Composed from the persisted hue since Phase 207, as the app window is.
    backgroundColor: windowBackgroundNow(),
    // Native titled window (standard traffic lights) — deliberately NOT the
    // main window's hiddenInset chrome.
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Phase 213: the scheme in effect, stamped on the root by the preload.
      additionalArguments: schemeArgsNow()
    }
  });
  settingsWindow = win;

  // Phase 42 stage 1 (sanctioned hardening): the Settings window gets the
  // SAME trusted-window policy as the main window — no navigation, no child
  // windows, registered as a trusted IPC sender. Before this call it had no
  // navigation policy at all (audit 2026-08-14, "As-built corrections").
  applyTrustedWindowPolicy(win);

  win.on('ready-to-show', () => win.show());
  followChromeHue(win);

  // Position remembered (S13) — capture on close, not on every move.
  win.on('close', () => {
    const b = win.getBounds();
    saveSettingsWindowBounds(b);
  });
  win.on('closed', () => {
    settingsWindow = null;
  });

  loadSettingsPage(win, section);
}

/**
 * electron-vite: dev server URL in dev, bundled file otherwise. The settings
 * entry is a second renderer input (electron.vite.config.ts). A section rides
 * as the location hash and nowhere else.
 */
function loadSettingsPage(win: BrowserWindow, section?: SettingsSectionLink): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) {
    const hash = section === undefined ? '' : `#${section}`;
    void win.loadURL(`${devUrl}/settings/index.html${hash}`);
  } else {
    void win.loadFile(
      join(__dirname, '../renderer/settings/index.html'),
      section === undefined ? undefined : { hash: section }
    );
  }
}

/** Close the Settings window if it is the given (focused) window — ⌘W. */
export function closeSettingsWindowIfFocused(win: BrowserWindow | null): boolean {
  if (!isSettingsWindow(win)) return false;
  win?.close();
  return true;
}
