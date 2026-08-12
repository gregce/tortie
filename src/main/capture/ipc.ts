/**
 * capture:* / clipboard:* / terminal:* IPC — the terminal stream's main-side
 * surface (Phase 12 items 1 + 2).
 *
 * Registers:
 *   - capture:viewport      capturePage over the live `.xterm-screen` rect
 *   - capture:image         renderer-rasterized PNG bytes → clipboard
 *   - capture:saveLast      write the most recent capture to disk
 *   - capture:pane          tmux capture-pane -e (no -J) for scrollback
 *   - clipboard:writeRich   text + HTML flavors together (Copy as HTML)
 *   - terminal:clearHistory tmux clear-history behind the Clear item
 */

import { BrowserWindow } from 'electron';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { gmuxError } from '../errors';
import { handle } from '../typed-ipc';
import {
  captureImage,
  capturePaneText,
  captureViewport,
  clearHistory,
  saveLastCapture,
  writeRichClipboard
} from './service';


function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win === null || win.isDestroyed()) {
    throw gmuxError('UNKNOWN', 'That window is no longer open.');
  }
  return win;
}

export function registerCaptureIpc(ipc: IpcMain): void {
  handle(ipc, 'capture:viewport', async (event, input) => {
    try {
      return await captureViewport(senderWindow(event), input);
    } catch (err) {
      throw gmuxError(
        'UNKNOWN',
        "Couldn't capture this session.",
        err instanceof Error ? err.message : String(err)
      );
    }
  });

  handle(ipc, 'capture:image', (_event, input) => {
    try {
      return captureImage(input);
    } catch (err) {
      throw gmuxError(
        'UNKNOWN',
        "Couldn't capture this session.",
        err instanceof Error ? err.message : String(err)
      );
    }
  });

  handle(ipc, 'capture:saveLast', async (event) =>
    saveLastCapture(BrowserWindow.fromWebContents(event.sender))
  );

  handle(ipc, 'capture:pane', async (_event, input) => {
    try {
      return await capturePaneText(input);
    } catch (err) {
      throw gmuxError(
        'UNKNOWN',
        "Couldn't read this session's history.",
        err instanceof Error ? err.message : String(err)
      );
    }
  });

  handle(ipc, 'clipboard:writeRich', (_event, input) => {
    writeRichClipboard(input);
  });

  // Deliberately the browser paste command, not a clipboard read: it lands on
  // the focused xterm textarea, where xterm's own handler applies bracketed
  // paste exactly as ⌘V does.
  handle(ipc, 'clipboard:paste', (event) => {
    senderWindow(event).webContents.paste();
  });

  handle(ipc, 'terminal:clearHistory', async (_event, tmuxName) => {
    await clearHistory(tmuxName);
  });
}
