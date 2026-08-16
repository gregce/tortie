/**
 * The pending shell open (Phase 51): one module-level slot, two triggers.
 *
 * The slot holds at most one pair: a folder, and optionally one file inside
 * it (Phase 61, a Finder open). The pair is set and taken together, so a
 * second arrival can never mix its folder with an older arrival's file.
 * `takePendingShellOpen` backs the `shell:takePendingOpen` invoke channel
 * and CLEARS the slot as it reads, so a renderer reload can never reopen
 * the folder twice. The renderer pulls from two places, and the
 * take-and-clear semantics make the double coverage safe:
 *
 *  1. the end of `hydrateAppState` (src/renderer/state/subscriptions.ts),
 *     which delivers a folder passed to a COLD boot;
 *  2. the `shell-open-pending` menu action (src/renderer/app/App.tsx),
 *     nudged from here when a WARM second launch delivered a folder.
 *
 * Residual race, named in the spec: a nudge that arrives in the
 * milliseconds between `isLoading()` turning false and App.tsx installing
 * its menu-action listener is lost as a nudge, but the slot still holds the
 * path, so the next hydrate or nudge delivers it. Nothing is lost; delivery
 * is late. That window exists only during first paint of a fresh window.
 */

import { BrowserWindow } from 'electron';
import type { ShellPendingOpen } from '@shared/ipc';
import { getLog } from '../log';
import { sendMenuAction } from '../menu';
import { isSettingsWindow } from '../settings/window';

let pending: ShellPendingOpen | null = null;

/**
 * Store at most one pair. A newer arrival replaces an older one whole,
 * folder and file together, and says so. The logged path is the most
 * specific half of the NEW arrival, so three files selected in Finder log
 * three distinct replacements.
 */
export function setPendingShellOpen(
  folder: string,
  file: string | null = null
): void {
  if (pending !== null && (pending.folder !== folder || pending.file !== file)) {
    getLog('shell').info(
      `a newer shell open replaced a pending one: ${file ?? folder}`
    );
  }
  pending = { folder, file };
}

/** Take-and-clear, both halves together. Backs `shell:takePendingOpen`. */
export function takePendingShellOpen(): ShellPendingOpen | null {
  const pair = pending;
  pending = null;
  return pair;
}

/**
 * Send the payload-free `shell-open-pending` menu action to the app window,
 * only when it exists and is done loading. A window still loading (or being
 * recreated) is skipped on purpose: its own hydrate pull delivers instead.
 */
export function nudgeRenderer(): void {
  const win = BrowserWindow.getAllWindows().find(
    (w) =>
      !w.isDestroyed() && !w.webContents.isDestroyed() && !isSettingsWindow(w)
  );
  if (win === undefined || win.webContents.isLoading()) return;
  sendMenuAction('shell-open-pending');
}
