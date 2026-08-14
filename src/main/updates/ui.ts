/**
 * Every dialog the update flow can show (Phase 24, extended in Phase 31).
 * Native `dialog.showMessageBox` only, per the UI rules. This module owns no
 * durable updater state: it calls the engine's exports (./updater) and puts
 * the pinned words on screen. Its only state is the in memory arm below.
 *
 * WHEN A DIALOG MAY APPEAR, restated from the phase specs:
 *
 *  - Only a user initiated action reaches this module, with the two Phase 31
 *    additions below. The staged menu item click and the "Check for
 *    Updates…" click are the two menu callers. A failed BACKGROUND check
 *    writes one log line inside ./updater and never gets a dialog, a toast,
 *    or a badge.
 *  - The ready dialog (Phase 31) follows a check the user started. The
 *    downloading outcome arms an in memory watch for that exact version, and
 *    when the OS updater finishes staging it, one dialog says it is ready.
 *    A quit forgets the arm, and the launch surface below takes over the
 *    honesty. A staging no user checked for stays silent.
 *  - The refusal dialog (Phase 31) is the one launch time surface. It shows
 *    on the first launch after an install the OS updater refused, names the
 *    reason in plain words, and cannot repeat, because ./refusal-check
 *    clears the pending record on disk before it answers. A failure may
 *    rise above the surface; that is the license this dialog uses.
 *  - The install prompt is the ONE sanctioned install-now path. Its Update
 *    Now button calls `installStagedUpdateNow()`, which is the one
 *    quitAndInstall call site in the app. Tortie never restarts itself on
 *    its own initiative.
 *  - The failure body is fixed copy. The library's error text goes to the
 *    log, never into a dialog.
 *
 * The copy is pinned in the phase specs, section 8 of each. Two sentences
 * here are additionally pinned by build/assert-bundle-refusals.mjs, so the
 * shipped bundle provably contains them. No em dashes and no en dashes
 * anywhere a person reads.
 */

import { dialog } from 'electron';
import {
  checkForUpdatesNow,
  getUpdateUiState,
  installStagedUpdateNow,
  onUpdateStateChanged
} from './updater';
import { detectRefusedInstall } from './refusal-check';
import { logUpdateEvent } from './log';

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

/** One OK dialog. Every other outcome in this module ends here. */
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

// ---------------------------------------------------------------------------
// The ready moment (Phase 31)
// ---------------------------------------------------------------------------

/**
 * The version the user was told is downloading, or null. The OS updater
 * finishing the staging of this exact version is what shows the ready
 * dialog. Memory only, on purpose: a quit forgets it, and the next launch
 * answers through announceRefusedInstallIfAny instead. Background checks
 * never write this, so a staging the user did not ask about stays silent.
 */
let armedReadyVersion: string | null = null;

/** The one onUpdateStateChanged subscription this module ever takes. */
let armWatchInstalled = false;

function ensureArmWatch(): void {
  if (armWatchInstalled) return;
  armWatchInstalled = true;
  onUpdateStateChanged(() => {
    if (armedReadyVersion === null) return;
    if (getUpdateUiState().stagedVersion !== armedReadyVersion) return;
    const version = armedReadyVersion;
    // Disarm before showing, so a version is announced at most once per run
    // no matter how many state changes follow.
    armedReadyVersion = null;
    void showReadyDialog(version);
  });
}

/**
 * The ready dialog. One OK button, installs nothing. The one sanctioned
 * install path stays the install prompt behind the menu item, which exists
 * by the time this shows, because the staged state is set.
 */
async function showReadyDialog(version: string): Promise<void> {
  try {
    await showOkDialog(
      'info',
      `Tortie ${version} is ready`,
      'It installs when you quit. To install it now, use the Tortie menu.'
    );
  } catch (err) {
    logUpdateEvent(
      'warn',
      `the ready dialog did not open: ${(err as Error).message}`
    );
  }
}

// ---------------------------------------------------------------------------
// The refusal surface (Phase 31)
// ---------------------------------------------------------------------------

/**
 * The one launch time surface. Called fire and forget from main's boot path,
 * on the line after the post update self check. ./refusal-check owns the
 * whole decision and clears the pending record on disk before it returns a
 * result, so a crash loop can never repeat this dialog. Never rejects.
 */
export async function announceRefusedInstallIfAny(): Promise<void> {
  try {
    const refused = detectRefusedInstall();
    if (refused === null) return;
    const detail =
      refused.reason === 'another-copy'
        ? `The update to ${refused.version} did not install because another copy of Tortie was running. It installs the next time you quit.`
        : `The update to ${refused.version} did not install. It installs the next time you quit.`;
    await showOkDialog('warning', 'The update did not install', detail);
  } catch (err) {
    logUpdateEvent(
      'warn',
      `the refusal dialog did not open: ${(err as Error).message}`
    );
  }
}

// ---------------------------------------------------------------------------
// The menu callers (Phase 24)
// ---------------------------------------------------------------------------

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
    logUpdateEvent(
      'warn',
      `the install prompt did not open: ${(err as Error).message}`
    );
  }
}

/**
 * "Check for Updates…" was clicked. This is the ONLY path on which a check
 * result may put words on the screen, and the only path that arms the ready
 * dialog. `checkForUpdatesNow()` never rejects by contract; the catch is
 * here so a defect in it cannot throw into the menu's event loop.
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
          `Tortie ${outcome.version} is downloading. Another message appears when it is ready.`
        );
        // Staging may have finished while the dialog sat on screen. Say
        // ready now if it did; otherwise arm the watch for this exact
        // version. A second check before staging replaces the arm with the
        // same version, so there is still one dialog.
        if (getUpdateUiState().stagedVersion === outcome.version) {
          await showReadyDialog(outcome.version);
        } else {
          ensureArmWatch();
          armedReadyVersion = outcome.version;
        }
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
    logUpdateEvent(
      'warn',
      `the interactive check did not finish: ${(err as Error).message}`
    );
  }
}
