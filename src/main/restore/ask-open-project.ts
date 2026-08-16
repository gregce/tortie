/**
 * The Phase 60 restore ask: the native question shown before a Past Sessions
 * restore opens a project that is not an open tab.
 *
 * WHY MAIN OWNS THIS. The UI rules say dialogs are native, so the renderer
 * cannot draw it. Main also stats the folder itself rather than taking the
 * renderer's word: the renderer only ever sends back the name and path it
 * got from main's own sessions:listRemoved rows, and the disk can have moved
 * under both of them since that list was fetched.
 *
 * Two shapes, decided by whether the project folder is a directory on disk:
 *
 *   folder exists  → a two-button question, "Open and Restore" and "Cancel".
 *   folder missing → a one-button warning that can only answer 'cancel'. A
 *                    path that exists but is a FILE counts as missing,
 *                    because it cannot be opened as a project.
 *
 * `askRestoreProjectOptions` is a pure builder over plain values so the copy
 * and the button order are unit-testable without Electron. The registrar
 * below is the only part that touches the dialog module.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { BrowserWindow, dialog } from 'electron';
import type { IpcMain } from 'electron';
import type { AskRestoreProjectAnswer } from '@shared/ipc';
import { handle } from '../typed-ipc';

/** What `dialog.showMessageBox` needs, built from plain values. */
export interface AskRestoreProjectDialogOptions {
  type: 'question' | 'warning';
  message: string;
  detail: string;
  buttons: string[];
  defaultId: number;
  cancelId: number;
}

/**
 * The dialog's words and buttons. Copy follows the operator's writing rules:
 * simple words, complete sentences, no em or en dashes, and it names what is
 * not true ("Nothing was changed").
 */
export function askRestoreProjectOptions(
  sessionName: string,
  projectPath: string,
  folderExists: boolean
): AskRestoreProjectDialogOptions {
  const folder = path.basename(projectPath);
  if (folderExists) {
    return {
      type: 'question',
      message: `Open ${folder} to restore this session?`,
      detail:
        `The session "${sessionName}" belongs to the project ${folder} at ` +
        `${projectPath}. That project is not open. "Open and Restore" opens ` +
        'the project and restores the session into it. "Cancel" changes ' +
        'nothing.',
      buttons: ['Open and Restore', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    };
  }
  return {
    type: 'warning',
    message: 'The project folder for this session no longer exists.',
    detail:
      `The session "${sessionName}" was in ${projectPath}. That folder is ` +
      'not on disk anymore, so Tortie cannot restore the session into it. ' +
      'Nothing was changed.',
    buttons: ['Cancel'],
    defaultId: 0,
    cancelId: 0
  };
}

/**
 * Map the dialog's response index to the answer. Only the two-button
 * question's first button means 'open'; the one-button warning always
 * cancels, whatever index the OS reports.
 */
export function answerForResponse(
  folderExists: boolean,
  response: number
): AskRestoreProjectAnswer {
  return folderExists && response === 0 ? 'open' : 'cancel';
}

/** True when the path is a directory Tortie could open as a project. */
async function projectFolderExists(projectPath: string): Promise<boolean> {
  try {
    return (await fs.stat(projectPath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Register sessions:askRestoreProject. Wired from ./ipc.ts beside
 * sessions:restore and sessions:listRemoved.
 */
export function registerAskRestoreProject(ipc: IpcMain): void {
  handle(ipc, 'sessions:askRestoreProject', async (e, input) => {
    const exists = await projectFolderExists(input.projectPath);
    const options = askRestoreProjectOptions(
      input.sessionName,
      input.projectPath,
      exists
    );
    // Parent the dialog to the asking window so it shows as a sheet. A
    // window that is already gone falls back to the unparented call.
    const win = BrowserWindow.fromWebContents(e.sender);
    const asked =
      win !== null
        ? await dialog.showMessageBox(win, { ...options, noLink: true })
        : await dialog.showMessageBox({ ...options, noLink: true });
    return answerForResponse(exists, asked.response);
  });
}
