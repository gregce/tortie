/**
 * Every dialog the update flow can show (Phase 24, extended in Phase 31 and
 * Phase 43, thinned in Phase 58). Native `dialog.showMessageBox` only, per
 * the UI rules. This module owns no durable updater state: it calls the
 * engine's exports (./updater) and puts the pinned words on screen.
 *
 * PHASE 58 MOVED THE JOURNEY INTO THE RING. The activity bar ring
 * (src/renderer/app/UpdateRing.tsx, fed by src/main/updates/journey.ts)
 * now carries checking, downloading, staging, ready and failed for a check
 * the user started. Four dialogs left with it: the "Update found,
 * downloading" dialog, the ready dialog and its arm-watch machinery, the
 * failed-check dialog on the interactive path, and the install prompt on
 * the interactive check's staged outcome. The failed-check dialog's exact
 * body lives on behind the ring's "Why it failed" item
 * (`explainRingFailure` below).
 *
 * WHAT SURVIVES, the complete list:
 *
 *  - "You are up to date". The ring has no state that says "there is
 *    nothing to update", so one direct answer to a question the user just
 *    asked stays a dialog. It is not a chain.
 *  - The dev build dialog. Dev builds never initialize the updater, so the
 *    ring never exists there, and without the dialog Check for Updates
 *    would be a dead menu item in dev.
 *  - The refusal dialog and the standing wreck dialog, the whole
 *    `announceRefusedInstallIfAny` surface (Phase 31, widened in Phase 43).
 *    A failed install explaining itself at the next launch is a launch time
 *    surface with no ring on screen yet.
 *  - `offerUpdaterRepair` with its three outcome dialogs (Phase 43),
 *    reached from the Tortie menu, from the refusal dialogs' clear button,
 *    and now also from the ring's failed menu.
 *  - `confirmInstallStagedUpdate` and the install prompt, reached from the
 *    staged menu item. The install prompt's Update Now button and the
 *    ring's "Restart and update now" both end at `installStagedUpdateNow()`,
 *    the one quitAndInstall call site in the app. Tortie never restarts
 *    itself on its own initiative.
 *
 *  - A failed BACKGROUND check writes one log line inside ./updater and
 *    never gets a dialog, a toast, or a badge. That rule did not move.
 *  - Failure bodies are fixed copy. The library's error text goes to the
 *    log, never into a dialog.
 *
 * The copy is pinned in the phase specs. Several sentences here are
 * additionally pinned by build/assert-bundle-refusals.mjs, so the shipped
 * bundle provably contains them. No em dashes and no en dashes anywhere a
 * person reads.
 */

import { dialog } from 'electron';
import {
  checkForUpdatesNow,
  getUpdateUiState,
  installStagedUpdateNow,
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
// The ring's "Why it failed" dialog (Phase 58)
// ---------------------------------------------------------------------------

/**
 * The words behind the ring's failed menu, fixed copy per failed stage. The
 * checking body is the exact body of the dialog Phase 24 showed on a failed
 * interactive check, so no new promise is invented. The library's error
 * text stays in the log, never in the dialog, the Phase 24 rule.
 */
function ringFailureCopy(
  failedDuring: 'checking' | 'downloading' | 'staging',
  version: string
): { title: string; body: string } {
  switch (failedDuring) {
    case 'checking':
      return {
        title: 'The update check failed',
        body: 'Tortie could not reach the update feed. It will try again on its own.'
      };
    case 'downloading':
      return {
        title: 'The download did not finish',
        body: `Tortie was downloading ${version} and the download stopped. It will try again on its own.`
      };
    case 'staging':
      return {
        title: 'The update could not be prepared',
        body: `Tortie downloaded ${version} and the installer could not prepare it. Repair updates can clear the installer's files and check again.`
      };
    default: {
      const unhandled: never = failedDuring;
      return unhandled;
    }
  }
}

/**
 * The ring's "Why it failed" item. Reads the state at click time. When
 * failedDuring is null the click raced a state change, and nothing shows.
 * One OK dialog, installs nothing, repairs nothing. Never rejects.
 */
export async function explainRingFailure(): Promise<void> {
  try {
    const state = getUpdateUiState();
    if (state.failedDuring === null) return;
    const copy = ringFailureCopy(
      state.failedDuring,
      state.ringVersion ?? 'the new version'
    );
    // The log line rides beside the dialog, matching the Phase 31 pattern,
    // so a driven rehearsal can assert the dialog call happened.
    logUpdateEvent(
      'info',
      `showing the why it failed dialog for ${state.failedDuring}`
    );
    await showOkDialog('warning', copy.title, copy.body);
  } catch (err) {
    logUpdateEvent(
      'warn',
      `the why it failed dialog did not open: ${(err as Error).message}`
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
 * "Check for Updates…" was clicked. Phase 58 moved the journey into the
 * ring, so this path shows a dialog only for the two answers the ring
 * cannot carry: "there is nothing to update" and "this build does not
 * update". Everything else — downloading, staging, ready, failed — is the
 * ring's, already visible by the time `checkForUpdatesNow()` resolves,
 * because the engine fed the journey before answering. A check that finds
 * an already staged update shows nothing here either: the ring is on
 * screen in ready at that moment, and the staged menu item still offers
 * the install prompt for a user who wants it. `checkForUpdatesNow()` never
 * rejects by contract; the catch is here so a defect in it cannot throw
 * into the menu's event loop.
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
        // The ring carries it: downloading, then staging, then ready.
        return;
      case 'staged':
        // The ring is already filled in ready.
        return;
      case 'failed':
        // The ring shows failed, and its "Why it failed" item carries the
        // exact words this path used to show in a dialog.
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
