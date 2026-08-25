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
// PHASE 156. The same marks and the same chords the menu bar names, out of the
// one closed table and the one keymap. Nothing here is typed as a literal.
import { accelerator as accel } from '@shared/keymap';
import { nativeMenuGlyph as glyph } from '../native-menu-icon';
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

/**
 * The status menu's rows, as a TEMPLATE and nothing else (Phase 156).
 *
 * Extracted from `buildMenu` for the reason `toMenuTemplate` was extracted from
 * the popup handler in Phase 39: a `Tray`'s menu is an OS owned surface that
 * cannot be read, clicked or photographed from outside the app, so the template
 * is the only place its shape can be read back. Now a unit test can pin which
 * row wears which mark and which chord with no Electron at all, and the phase's
 * one app run can report the live decode without planting an icon in the
 * person's menu bar, which is what `installTray` deliberately refuses to let a
 * harness do.
 *
 * It is pure: it reads its three arguments and nothing else, and its only
 * outside contact is the two callbacks it stores.
 */
export function trayMenuTemplate(
  sessions: readonly Session[],
  projects: readonly Project[],
  blocked: Map<string, number>
): MenuItemConstructorOptions[] {
  const rows = attentionRows(sessions, projects, blocked);

  // NO MARK ON THE HEADER, which the charter asked for in those words: it is a
  // disabled header and it stays a header.
  //
  // NO MARK ON A BLOCKED SESSION ROW EITHER, and that one is argued. The mark a
  // session row wears in the app is its AGENT's, drawn from SVG art rather than
  // a font glyph, so main holds no raster for it and the build time set is
  // codicons only. One generic mark repeated down every row would say less than
  // "name — project" already says.
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

  return [
    ...attention,
    { type: 'separator' },
    {
      label: `Show ${app.name}`,
      // A CHOSEN mark. It brings the app's one window forward, and Tortie
      // draws no window glyph anywhere, so it cannot point at another surface.
      // `multiple-windows` is in the set and says the opposite, being several
      // separate tabs where one surface stood.
      ...glyph('window'),
      click: () => deps?.showWindow()
    },
    {
      label: 'New Session',
      // The + on the sessions header, the same mark the ⌘T row in the Session
      // menu wears, for the same action.
      ...glyph('add'),
      // PHASE 156 PUT THE TWO CHORDS ON THIS MENU, and this is why it costs
      // nothing. Both are read from the one keymap rather than typed, and
      // BOTH ARE ALREADY REGISTERED BY THE APPLICATION MENU, so this phase
      // adds no chord at all to the set the app answers. Nothing can be taken
      // from a terminal pane that was not already taken.
      //
      // A tray menu is not the application menu, and macOS searches key
      // equivalents in the application menu during event dispatch, which is
      // the same fact menu-popup.ts:22 records for a popup menu's
      // accelerators. Electron's own `registerAccelerator` option, the one
      // way to say "display only", is documented linux and win32 only, so
      // there is nothing to set here. The claim is measured by the phase's app
      // run rather than assumed, and if a tray accelerator did register, the
      // worst case is still equivalent behaviour: this row's click shows the
      // window and then forwards the SAME 'new-session' action the menu bar
      // forwards, and Quit below calls the SAME requestQuit().
      accelerator: accel('session.new'),
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
    //
    // NO MARK, the same argued refusal the application menu's Quit carries:
    // it is the standard AppKit row every Mac app draws bare, and no Tortie
    // surface draws a quit mark to take one from.
    {
      label: `Quit ${app.name}`,
      accelerator: accel('app.quit'),
      click: () => requestQuit()
    }
  ];
}

function buildMenu(
  sessions: readonly Session[],
  projects: readonly Project[]
): Menu {
  return Menu.buildFromTemplate(trayMenuTemplate(sessions, projects, since));
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
