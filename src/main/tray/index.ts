/**
 * Phase 12.85 — the macOS menu-bar sentinel.
 *
 * A status item carrying the Tortie mark (menu-bar/TortieTemplate.png, marked
 * as a TEMPLATE image so macOS tints it for light, dark and the highlighted
 * state). Its menu answers the Zen doc's one question — "What needs me now?"
 * — with the sessions blocked on a human across EVERY project, plus the three
 * verbs that make sense from outside the window: show it, start a session,
 * quit. Deliberately absent: counters, activity, anything that changes on its
 * own without needing a human.
 *
 * The mark itself is freestanding by brand rule (docs/brand/tortie/README.md):
 * no rounded square, no badge, no outer chrome — which is also exactly what a
 * macOS template image wants.
 *
 * Data comes from the SAME truth the ⌘J overlay renders: main's per-session
 * status verdict, taken off GmuxCore's full-list broadcast (the one choke
 * point every mutation and every activity flip already funnels through).
 */

import { app, Menu, Tray, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { join } from 'node:path';
import type { Project, Session } from '@shared/types';
import { getGmuxCore } from '../sessions';
import { requestQuit, sendMenuAction } from '../menu';
import { attentionRows, blockedSince } from './attention';
import { getLog } from '../log';

/**
 * Scope "tray" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const trayLog = getLog('tray');


export interface TrayDeps {
  /** Bring the app window forward (creating it if it somehow went away). */
  showWindow(): void;
}

let tray: Tray | null = null;
let deps: TrayDeps | null = null;
/** sessionId → when it started needing input (see attention.blockedSince). */
let since = new Map<string, number>();

/**
 * resources/menu-bar/TortieTemplate.png for dev vs packaged builds — the same
 * two-line shape as tmux's resolveConfPath(), for the same reason.
 * NativeImage picks up the @2x file beside it on its own.
 */
function templateImagePath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'menu-bar', 'TortieTemplate.png')
    : join(app.getAppPath(), 'resources', 'menu-bar', 'TortieTemplate.png');
}

function buildMenu(sessions: readonly Session[], projects: readonly Project[]): Menu {
  const rows = attentionRows(sessions, projects, since);

  const attention: MenuItemConstructorOptions[] =
    rows.length === 0
      ? [{ label: 'Nothing needs you', enabled: false }]
      : [
          { label: 'Needs your input', enabled: false },
          ...rows.map(
            (row): MenuItemConstructorOptions => ({
              label: row.label,
              click: () => {
                deps?.showWindow();
                sendMenuAction(`focus-session:${row.sessionId}`);
              }
            })
          )
        ];

  return Menu.buildFromTemplate([
    ...attention,
    { type: 'separator' },
    { label: `Show ${app.name}`, click: () => deps?.showWindow() },
    {
      label: 'New Session',
      click: () => {
        // Same action the ⌘T menu item forwards — the window has to be up
        // first, because what it opens is a modal inside that window.
        deps?.showWindow();
        sendMenuAction('new-session');
      }
    },
    { type: 'separator' },
    // The same forwarded quit ⌘Q takes, so the one-time "sessions keep
    // running" toast still gets its chance (DESIGN.md §4).
    { label: `Quit ${app.name}`, click: () => requestQuit() }
  ]);
}

/** Rebuild the status menu from a fresh session list. */
function refresh(sessions: readonly Session[], projects: readonly Project[]): void {
  if (tray === null || tray.isDestroyed()) return;
  since = blockedSince(since, sessions, Date.now());
  tray.setContextMenu(buildMenu(sessions, projects));
}

/**
 * Create the status item. Safe to call once, at normal startup only — the
 * smoke/shot harnesses have no business planting an icon in the user's menu
 * bar.
 */
export function installTray(trayDeps: TrayDeps): void {
  if (tray !== null || process.platform !== 'darwin') return;
  deps = trayDeps;

  const image = nativeImage.createFromPath(templateImagePath());
  if (image.isEmpty()) {
    trayLog.error('menu-bar image missing — no status item installed');
    return;
  }
  // macOS tints template images itself: black-on-transparent art follows the
  // menu-bar appearance (light/dark) and inverts while the menu is open.
  image.setTemplateImage(true);

  tray = new Tray(image);
  tray.setToolTip(app.name);
  tray.setContextMenu(buildMenu([], []));

  // Live data as soon as the durable core is up, then on every full-list
  // broadcast (mutations and activity flips both land here).
  void getGmuxCore()
    .then((core) => {
      core.onSessionsBroadcast = (sessions) => {
        refresh(sessions, core.listProjects());
      };
      refresh(core.listSessions(), core.listProjects());
    })
    .catch(() => {
      // Core boot failed (no tmux). The window explains it; the menu stays
      // honest with "Nothing needs you" and its three verbs.
    });
}

export function disposeTray(): void {
  tray?.destroy();
  tray = null;
  deps = null;
  since = new Map();
}
