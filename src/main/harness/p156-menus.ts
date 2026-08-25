/**
 * GMUX_SMOKE=p156-menus — the application menu and the tray menu, read back
 * from the REAL main process (Phase 156).
 *
 * ## What this can and cannot see, stated first
 *
 * NO PIXEL OF A NATIVE MENU IS PHOTOGRAPHED HERE, because it cannot be. Phase
 * 119, Phase 152 and Phase 153 each measured that a native macOS menu cannot be
 * read, clicked or photographed from outside the app: System Events answers
 * with two menu bars and zero windows, and a scripted click returns NOCLICK
 * with an unchanged pasteboard. So what this reports is what the app HANDED to
 * AppKit, walked out of `Menu.getApplicationMenu()` after the real
 * `installAppMenu()` ran, plus the decoded dimensions of every mark. That is
 * the bytes on the wire and the decoded glyph, and it is what the charter asks
 * for in those words.
 *
 * ## Why it can read the real menu at all
 *
 * `installMainCapabilities` calls `installAppMenu()` at
 * src/main/capabilities.ts:130, and the composition root runs it BEFORE
 * `dispatchHarness`. So by the time this mode runs, the menu the product ships
 * is installed and `Menu.getApplicationMenu()` answers it.
 *
 * The tray is different: `installTray()` runs after `dispatchHarness` returns,
 * and it deliberately refuses to let a harness plant an icon in the person's
 * menu bar. So this mode builds the tray's own template through the real
 * `trayMenuTemplate` and the real `Menu.buildFromTemplate`, which exercises the
 * same NativeImage decode without a status item ever appearing.
 *
 * It creates no window, starts no session, and touches no tmux server.
 */

import { app, globalShortcut, Menu } from 'electron';
import { writeFileSync } from 'node:fs';
import { trayMenuTemplate } from '../tray';
import { armWatchdog, smokeFail, smokeLog } from './support';

interface RowReport {
  label: string;
  role: string | null;
  type: string;
  enabled: boolean;
  visible: boolean;
  accelerator: string | null;
  /** `w×h` at 16pt, or null when the row carries no mark. */
  icon: string | null;
  /** True when the mark is flagged template, so macOS owns its tint. */
  template: boolean | null;
  submenu: RowReport[] | null;
}

function walk(items: readonly Electron.MenuItem[]): RowReport[] {
  return items.map((item): RowReport => {
    const icon = item.icon;
    let size: string | null = null;
    let template: boolean | null = null;
    if (icon !== undefined && icon !== null && typeof icon !== 'string') {
      const { width, height } = icon.getSize();
      size = `${String(width)}×${String(height)}`;
      template = icon.isTemplateImage();
    }
    return {
      label: item.label,
      role: item.role ?? null,
      type: item.type,
      enabled: item.enabled,
      visible: item.visible,
      accelerator: item.accelerator ?? null,
      icon: size,
      template,
      // Electron answers null rather than undefined for a leaf item at
      // runtime, whatever the typing says, so both are checked.
      submenu:
        item.submenu === undefined || item.submenu === null
          ? null
          : walk(item.submenu.items)
    };
  });
}

/** Every row in one report, flattened, so counting is one line. */
function flatten(rows: readonly RowReport[]): RowReport[] {
  const out: RowReport[] = [];
  for (const row of rows) {
    out.push(row);
    if (row.submenu !== null) out.push(...flatten(row.submenu));
  }
  return out;
}

export async function runP156MenusSmoke(): Promise<void> {
  armWatchdog(60_000);
  try {
    const menu = Menu.getApplicationMenu();
    if (menu === null) {
      throw new Error('no application menu was installed');
    }
    const appMenu = walk(menu.items);
    smokeLog(`1/5 application menu walked: ${String(appMenu.length)} top level`);

    // The tray's own template, through the real builder so the same decode
    // runs. No Tray is constructed and no status item appears.
    const tray = walk(Menu.buildFromTemplate(trayMenuTemplate([], [], new Map())).items);
    smokeLog(`2/5 tray menu built: ${String(tray.length)} rows`);

    const all = flatten(appMenu);
    const marked = all.filter((r) => r.icon !== null);
    const wrongSize = marked.filter((r) => r.icon !== '16×16');
    const notTemplate = marked.filter((r) => r.template !== true);
    smokeLog(
      `3/5 ${String(marked.length)} application menu rows carry a mark, ` +
        `${String(wrongSize.length)} at the wrong size, ` +
        `${String(notTemplate.length)} not flagged template`
    );

    const trayMarked = flatten(tray).filter((r) => r.icon !== null);
    smokeLog(
      `4/5 ${String(trayMarked.length)} tray rows carry a mark, ` +
        `${String(flatten(tray).filter((r) => r.accelerator !== null).length)} ` +
        'name a chord'
    );

    // THE PHASE'S OWN REFUSAL, MEASURED RATHER THAN ASSERTED: no global
    // shortcut, and nothing registered outside the app's own focus.
    //
    // Phase 156 put ⌘T and ⌘Q on two tray rows. Both are already registered by
    // the application menu, so the phase adds no chord to the set the app
    // answers. The one thing that would be new is a chord firing while Tortie
    // is not the focused app, and the only mechanism for that is a global
    // registration. `globalShortcut.isRegistered` is the reading that says
    // whether one exists. Electron's `registerAccelerator` option, the one way
    // to ask for display only, is documented linux and win32 only, so there is
    // nothing to set on darwin and the answer has to be measured.
    const globals = ['Cmd+T', 'Cmd+Q', 'Cmd+B', 'Cmd+W'].map((chord) => ({
      chord,
      registered: globalShortcut.isRegistered(chord)
    }));
    const anyGlobal = globals.filter((g) => g.registered);
    smokeLog(
      `5/5 global shortcuts held by this app: ${String(anyGlobal.length)} ` +
        `of ${String(globals.length)} probed chords`
    );

    const out = process.env['GMUX_P156_OUT'];
    if (out !== undefined && out !== '') {
      writeFileSync(out, JSON.stringify({ appMenu, tray, globals }, null, 2));
      smokeLog(`report written to ${out}`);
    }

    if (anyGlobal.length > 0) {
      throw new Error(
        `${String(anyGlobal.length)} chord(s) are registered as GLOBAL ` +
          `shortcuts: ${anyGlobal.map((g) => g.chord).join(', ')}. This ` +
          'phase refuses that outright.'
      );
    }
    if (wrongSize.length > 0 || notTemplate.length > 0) {
      throw new Error(
        `${String(wrongSize.length)} marks are not 16×16 and ` +
          `${String(notTemplate.length)} are not template images`
      );
    }
    smokeLog('PASS (p156-menus)');
    app.exit(0);
  } catch (err) {
    // `smokeFail` reads `.message`, so the error object goes through whole.
    smokeFail(err);
  }
}
