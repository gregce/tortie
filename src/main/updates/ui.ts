/**
 * Every dialog the update flow can show (Phase 24, extended in Phase 31 and
 * Phase 43). Native `dialog.showMessageBox` only, per the UI rules. This
 * module owns no durable updater state: it calls the engine's exports
 * (./updater) and puts the pinned words on screen. Its only state is the in
 * memory arm below.
 *
 * WHAT PHASE 43 ADDED. The launch surface learned two more shapes, and it
 * grew a button. When the log says the prepared copy was gone at install
 * time, or that the installer gave up after too many attempts, the dialog
 * names that and offers to clear what the installer saved. A second entry
 * point, `offerUpdaterRepair`, runs that clear and is also what the "Repair
 * Updates…" menu item calls, so a user who answered "Not Now" can still
 * reach the action later.
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
  onUpdateStateChanged,
  setUpdaterRepairNeeded
} from './updater';
import {
  detectRefusedInstall,
  detectStandingWreck,
  type RefusedInstall,
  type StandingWreck
} from './refusal-check';
import { repairUpdaterState } from './recovery';
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
    // The log line rides beside the dialog so updates.log records the
    // moment the promise was made, and so a driven rehearsal can assert
    // the dialog call happened (Phase 31 fix round).
    logUpdateEvent('info', `showing the ready dialog for ${version}`);
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
// The refusal surface (Phase 31, widened in Phase 43)
// ---------------------------------------------------------------------------

/** The title every broken promise dialog carries. */
const REFUSAL_TITLE = 'The update did not install';

/**
 * The sentence that ends every offer to clear. It is one sentence in three
 * of the dialogs, so it is written once.
 */
const CLEARING_IS_SAFE =
  'Your sessions keep running and your settings are not touched.';

/** The two button offer. Clearing is the default, Not Now is escape. */
const REPAIR_BUTTONS = ['Not Now', 'Clear and Check Again'];

/**
 * Show an offer to clear. Returns true when the person chose to clear. Not
 * Now is both the cancel button and the escape key, so a reflexive Escape
 * does nothing.
 */
async function showRepairOffer(
  title: string,
  body: string
): Promise<boolean> {
  const asked = await dialog.showMessageBox({
    type: 'warning',
    message: title,
    detail: body,
    buttons: REPAIR_BUTTONS,
    defaultId: 1,
    cancelId: 0,
    noLink: true
  });
  return asked.response === 1;
}

/** How many times the installer tried before it saved that it gave up. */
function gaveUpSentence(attempts: number | null): string {
  return attempts === null
    ? 'The installer then saved that it had given up.'
    : `The installer tried ${String(attempts)} times and then saved that it had given up.`;
}

/**
 * What follows a give up sentence in every dialog that carries one. The
 * installer will not try again on its own, so the offer to clear is the
 * only next step there is.
 */
const AFTER_A_GIVE_UP =
  "It does not try again until Tortie clears what it saved. Clearing removes only the installer's own leftover files. " +
  CLEARING_IS_SAFE;

/**
 * The words for a broken promise, picked by the reason the log gave and by
 * whether the installer gave up.
 *
 * A GIVE UP OUTRANKS THE REASON, which the fix round changed. Phase 31's
 * two sentences both end "It installs the next time you quit", and that is
 * false once the installer has saved that it gave up, because from that
 * moment no quit installs anything until the saved count is cleared. The
 * first cut of Phase 43 read `gaveUp` only on the `staged-bundle-missing`
 * branch, so a machine that gave up after another copy was running, or
 * after a cause the log did not record, was told to quit and wait for an
 * install that could never happen. Every give up now says so and offers the
 * clear.
 *
 * Phase 31's two sentences are unchanged for the case they were written
 * for, which is a failure the installer has NOT given up on.
 */
function refusalBody(refused: RefusedInstall): string {
  if (refused.reason === 'another-copy') {
    // Phase 31's sentence stays one literal, because
    // build/assert-bundle-refusals.mjs pins it and a pinned sentence split
    // across two expressions is a pin that stops checking anything.
    if (!refused.gaveUp) {
      return `The update to ${refused.version} did not install because another copy of Tortie was running. It installs the next time you quit.`;
    }
    return (
      `The update to ${refused.version} did not install because another copy of Tortie was running. ` +
      `${gaveUpSentence(refused.attempts)} ${AFTER_A_GIVE_UP}`
    );
  }
  if (refused.reason === 'staged-bundle-missing') {
    const prepared = `The update to ${refused.version} did not install. Tortie had prepared a copy of the new version, and that copy was gone from disk when the installer ran.`;
    if (!refused.gaveUp) {
      return `${prepared} Tortie can clear the installer's leftover files and check again now. Clearing removes only those files. ${CLEARING_IS_SAFE}`;
    }
    return `${prepared} ${gaveUpSentence(refused.attempts)} ${AFTER_A_GIVE_UP}`;
  }
  if (refused.gaveUp) {
    return (
      `The update to ${refused.version} did not install, and the installer's log does not say why. ` +
      `${gaveUpSentence(refused.attempts)} ${AFTER_A_GIVE_UP}`
    );
  }
  return `The update to ${refused.version} did not install. It installs the next time you quit.`;
}

/** The words for a wreck found on disk with no pending record behind it. */
function standingWreckBody(wreck: StandingWreck): string {
  if (wreck.reason === 'gave-up') {
    const tried =
      wreck.attempts === null
        ? 'The installer tried to install an earlier update and then saved that it had given up, so it does not try again.'
        : `The installer tried ${String(wreck.attempts)} times to install an earlier update and then saved that it had given up, so it does not try again.`;
    return `${tried} Tortie can clear what the installer saved and check for the update again. Clearing removes only the installer's own leftover files. ${CLEARING_IS_SAFE}`;
  }
  return `Tortie had prepared a copy of a new version and that copy is no longer on disk, so the installer cannot finish. Tortie can clear the installer's leftover files and check for the update again. Clearing removes only those files. ${CLEARING_IS_SAFE}`;
}

/**
 * The one launch time surface. Called fire and forget from main's boot path,
 * on the line before the post update self check. ./refusal-check owns the
 * whole decision and clears the pending record on disk before it returns a
 * result, so a crash loop can never repeat this dialog. Never rejects.
 *
 * Phase 43 gave it a second question. When there is no broken promise, it
 * asks whether Squirrel's own state on disk stops any install from
 * happening, which is the case a "Not Now" leaves behind and the case a
 * build older than Phase 31 leaves behind.
 */
export async function announceRefusedInstallIfAny(): Promise<void> {
  try {
    const refused = detectRefusedInstall();
    if (refused !== null) {
      // Same reason as the ready dialog's line: the log must record that
      // the failure was said out loud, not only that it was detected.
      logUpdateEvent(
        'info',
        `showing the refusal dialog for ${refused.version}`
      );
      const body = refusalBody(refused);
      // The offer follows the copy. A give up is offered a clear whatever
      // the cause was, because nothing else can install until it is
      // cleared. A failure the installer has not given up on is told to
      // wait for the next quit, and there is nothing to offer.
      if (refused.reason !== 'staged-bundle-missing' && !refused.gaveUp) {
        await showOkDialog('warning', REFUSAL_TITLE, body);
        return;
      }
      setUpdaterRepairNeeded(true);
      const clear = await showRepairOffer(REFUSAL_TITLE, body);
      if (clear) await offerUpdaterRepair();
      return;
    }

    const wreck = detectStandingWreck();
    if (wreck === null) return;
    setUpdaterRepairNeeded(true);
    logUpdateEvent(
      'info',
      `showing the standing wreck dialog for reason ${wreck.reason}`
    );
    const clear = await showRepairOffer(
      'Tortie cannot install updates right now',
      standingWreckBody(wreck)
    );
    if (clear) await offerUpdaterRepair();
  } catch (err) {
    logUpdateEvent(
      'warn',
      `the refusal dialog did not open: ${(err as Error).message}`
    );
  }
}

// ---------------------------------------------------------------------------
// The recovery verb's surface (Phase 43)
// ---------------------------------------------------------------------------

const CLEARED_BODY =
  "Tortie removed the installer's saved state and the copies it had prepared, and it is checking for the update again. " +
  'A download runs in the background and another message appears when the update is ready.';

const PARTIAL_BODY =
  "Tortie removed some of the installer's files and could not remove others. The log names each file it could not remove. " +
  'Tortie is checking for the update again, and the update may still fail to install.';

/**
 * Clear the updater's wreckage, say what happened, then run the ordinary
 * interactive check so the user gets the surfaces they already know. Driven
 * by the dialog button above and by the "Repair Updates…" menu item. Never
 * rejects, because a menu item that throws into Electron's event loop shows
 * the person nothing.
 *
 * A refusal shows its sentence and runs NO check. Refusing and then
 * checking would re-stage the very update the refusal exists to protect.
 */
export async function offerUpdaterRepair(): Promise<void> {
  try {
    const outcome = await repairUpdaterState();
    if (outcome.kind === 'refused') {
      if (outcome.refusal !== null) {
        await showOkDialog('info', 'Nothing needs clearing', outcome.refusal);
      }
      return;
    }
    if (outcome.kind === 'cleared') {
      await showOkDialog(
        'info',
        "Tortie cleared the installer's leftovers",
        CLEARED_BODY
      );
    } else {
      await showOkDialog(
        'warning',
        "Tortie cleared some of the installer's leftovers",
        PARTIAL_BODY
      );
    }
    await runInteractiveUpdateCheck();
  } catch (err) {
    logUpdateEvent(
      'warn',
      `the repair did not finish: ${(err as Error).message}`
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
