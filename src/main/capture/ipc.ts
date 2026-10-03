/**
 * capture:* / clipboard:* / terminal:* IPC — the terminal stream's main-side
 * surface (Phase 12 items 1 + 2).
 *
 * Registers:
 *   - capture:viewport      capturePage over the live `.xterm-screen` rect
 *   - capture:image         renderer-rasterized PNG bytes → clipboard
 *   - capture:saveLast      write the most recent capture to disk
 *   - capture:pane          tmux capture-pane -e (no -J) for scrollback; a
 *                           range for a session on another machine is read
 *                           on that machine (Phase 320.1)
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
// PHASE 320.1, D11. A history copy from a session on another machine reads that
// machine. The routing is here, in the registrar, because this is the one
// place that sees the channel's input and nothing in the machines layer's
// graph imports the capture domain back.
import {
  namesSessionOnMachine,
  readRemoteHistoryRange
} from '../machines/remote-pane-history';


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
      // A session on THIS Mac, or no session named at all: the path it always
      // took, byte for byte. A session on another machine: its range is read
      // over there, from the row's live `$N`, never by name on this Mac's
      // server, where a same-named session would answer. No product path asks
      // a machine for the last N lines through here (the capture items are not
      // drawn for a remote session), so that shape is refused rather than
      // guessed at.
      if (
        input.sessionId !== undefined &&
        namesSessionOnMachine(input.sessionId)
      ) {
        if (input.range === undefined) {
          throw gmuxError(
            'INVALID_INPUT',
            "Couldn't read this session's history.",
            'a session on another machine is read by range only'
          );
        }
        return await readRemoteHistoryRange(
          input.sessionId,
          input.range,
          input.join === true
        );
      }
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
