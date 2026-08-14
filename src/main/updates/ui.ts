/**
 * Every dialog the update flow can show (Phase 24). Native
 * `dialog.showMessageBox` only, per the UI rules. This module owns no
 * updater state: it calls the engine's exports (./updater) and puts the
 * pinned words on screen.
 *
 * WHEN A DIALOG MAY APPEAR, restated from the phase spec:
 *
 *  - Only a user initiated action reaches this module. The staged menu item
 *    click and the "Check for Updates…" click are the two callers. A failed
 *    BACKGROUND check writes one log line inside ./updater and never gets a
 *    dialog, a toast, or a badge.
 *  - The install prompt is the ONE sanctioned install-now path. Its Update
 *    Now button calls `installStagedUpdateNow()`, which is the one
 *    quitAndInstall call site in the app. Tortie never restarts itself on
 *    its own initiative.
 *  - The failure body is fixed copy. The library's error text goes to the
 *    log, never into a dialog.
 *
 * The copy is pinned in the phase spec, section 8. No em dashes and no en
 * dashes anywhere a person reads.
 */

import { dialog } from 'electron';
import {
  checkForUpdatesNow,
  getUpdateUiState,
  installStagedUpdateNow
} from './updater';

/**
 * The body of the install prompt. The promise it makes is the product's
 * whole reason to exist: sessions live in the private tmux server, so the
 * bundle swap and the relaunch touch none of them.
 */
const INSTALL_PROMPT_BODY =
  'Tortie will close and reopen. Your sessions keep running. Nothing is interrupted.';

/**
 * The [Later] [Update Now] prompt, shared by the staged menu item and the
 * interactive check's staged outcome. Update Now is the default button and
 * Later is both the cancel button and the escape key, so a reflexive Return
 * installs and a reflexive Escape does nothing.
 */
async function showInstallPrompt(title: string): Promise<void> {
  const asked = await dialog.showMessageBox({
    type: 'info',
    message: title,
    detail: INSTALL_PROMPT_BODY,
    buttons: ['Later', 'Update Now'],
    defaultId: 1,
    cancelId: 0,
    noLink: true
  });
  if (asked.response === 1) installStagedUpdateNow();
}

/** One OK dialog. Every non staged outcome of an interactive check ends here. */
async function showOkDialog(
  kind: 'info' | 'warning',
  title: string,
  body: string
): Promise<void> {
  await dialog.showMessageBox({
    type: kind,
    message: title,
    detail: body,
    buttons: ['OK'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  });
}

/**
 * The staged menu item was clicked. Never throws at the menu: a menu item
 * that throws into Electron's event loop shows the person nothing.
 */
export async function confirmInstallStagedUpdate(): Promise<void> {
  try {
    const staged = getUpdateUiState().stagedVersion;
    // The item is rebuilt when the staged state changes, but a click can
    // land on a menu built a moment earlier. Nothing staged means nothing
    // to offer.
    if (staged === null) return;
    await showInstallPrompt(`Update to ${staged}`);
  } catch (err) {
    console.warn(
      `[gmux-updates] the install prompt did not open: ${(err as Error).message}`
    );
  }
}

/**
 * "Check for Updates…" was clicked. This is the ONLY path on which a check
 * result may put words on the screen. `checkForUpdatesNow()` never rejects
 * by contract; the catch is here so a defect in it cannot throw into the
 * menu's event loop.
 */
export async function runInteractiveUpdateCheck(): Promise<void> {
  try {
    const outcome = await checkForUpdatesNow();
    switch (outcome.kind) {
      case 'none':
        await showOkDialog(
          'info',
          'You are up to date',
          `Tortie ${outcome.currentVersion} is the newest version.`
        );
        return;
      case 'downloading':
        await showOkDialog(
          'info',
          'Update found',
          `Tortie ${outcome.version} is downloading. It installs when you quit.`
        );
        return;
      case 'staged':
        await showInstallPrompt('Update ready');
        return;
      case 'failed':
        // Fixed copy. The library's error text is already in the log.
        await showOkDialog(
          'warning',
          'The update check failed',
          'Tortie could not reach the update feed. It will try again on its own.'
        );
        return;
      case 'unsupported':
        await showOkDialog(
          'info',
          'Updates are not available here',
          'This is a development build. It does not update itself.'
        );
        return;
      default: {
        // A new outcome kind must pick its words here before it ships.
        const unhandled: never = outcome;
        return unhandled;
      }
    }
  } catch (err) {
    console.warn(
      `[gmux-updates] the interactive check did not finish: ${(err as Error).message}`
    );
  }
}
