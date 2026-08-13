/**
 * The blocking screen for a session list this build must not touch (Phase 21
 * fix round, research 27 §4.4).
 *
 * The words and the decision live in `../manifest/refusal.ts`, which is pure
 * and unit tested. This file is the Electron half and nothing else: it shows
 * the dialog, it reveals the folder when asked, and it quits.
 *
 * ## Why it is a native dialog and not a window
 *
 * The screen has to be up before any window exists, because the renderer's
 * first paint asks for the session list and that is the one call that cannot
 * be answered. A dialog with no parent window is the only surface available at
 * that point, and it is also the only one the user cannot click behind.
 *
 * ## The two buttons, and no third
 *
 * Quit, and Reveal Data Folder. There is deliberately no "Open anyway". The
 * whole point of the refusal is that an older build writing into a newer
 * manifest succeeds while leaving the new column NULL, and those rows are the
 * ones the newer build can no longer restore correctly. A button that offered
 * it would be a button that loses conversations quietly.
 *
 * Reveal does not dismiss. The person is meant to be able to look at the
 * folder, come back, and still be in a state where nothing has been changed.
 */

import { app, dialog, shell } from 'electron';
import { dirname } from 'node:path';
import { refusalCopy, type ManifestRefusal } from '../manifest/refusal';

/** Shown once per app run, however many callers reach it. */
let showing = false;

/**
 * Show the refusal and quit when the person is done reading it.
 *
 * Never throws. A failure to draw the dialog must still end in a quit, because
 * the alternative is a process with no window and no explanation.
 */
export async function presentManifestRefusal(
  err: ManifestRefusal
): Promise<void> {
  if (showing) return;
  showing = true;
  const copy = refusalCopy(err);
  // Every line also goes to the log, so a person who reports "it just quit"
  // has the reason in the console output they can copy.
  console.error(`[gmux] ${copy.message}\n${copy.detail}`);
  try {
    await app.whenReady();
    for (;;) {
      const asked = await dialog.showMessageBox({
        type: 'warning',
        message: copy.message,
        detail: copy.detail,
        buttons: [...copy.buttons],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      });
      if (asked.response !== copy.revealIndex) break;
      shell.showItemInFolder(err.dbPath);
      // And round again. Revealing is not a decision, so it does not end the
      // screen: the only way out is Quit.
    }
  } catch (dialogErr) {
    console.error(
      `[gmux] the refusal screen could not be shown: ${(dialogErr as Error).message}`
    );
  } finally {
    // `exit` rather than `quit`, and it matters. `quit` runs the before-quit
    // teardown, which closes a manifest this process deliberately never
    // opened. There is nothing to flush: nothing was changed.
    app.exit(0);
  }
}

/** Where Reveal would take them, for a log line or a test. */
export function refusalDataFolder(err: ManifestRefusal): string {
  return dirname(err.dbPath);
}
