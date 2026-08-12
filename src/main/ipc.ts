/**
 * The sessions / projects IPC registrar — and nothing else.
 *
 * Phase 16 (L1) took the two domains that were hiding in this file out of it,
 * verbatim: `class GmuxCore` and its lifecycle are `./sessions`, the native
 * context-menu bridge is `./menu-popup`. What is left is what the filename
 * always promised — the handler table. The git and fs channels are owned by
 * the Phase 3 streams (src/main/git/, src/main/fs/) and are NOT registered
 * here.
 */

import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type {
  GmuxInvokeChannel,
  GmuxInvokeReq,
  GmuxInvokeRes
} from '@shared/ipc';
// Phase 12.12 item 2 — the View-menu radios render the renderer's one
// sessions-position truth; ui:sessionsPosition below is how they hear about
// a change that did not come from the menu itself.
import { setSessionsPositionRadios } from './menu';
import { registerPopupMenuHandler } from './menu-popup';
import { getGmuxCore } from './sessions';
import { handle as handleTyped } from './typed-ipc';

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

/**
 * `ipcMain.handle` for this module's channels — the ipcMain-bound shorthand
 * over the ONE typed wrapper in ./typed-ipc (guardrail 3/4: this file used to
 * carry a fifth copy of that ten-line body). Typed over the SUPERSET map, so
 * appended channels — terminal:scroll* below — register here too.
 */
function handle<C extends GmuxInvokeChannel>(
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: GmuxInvokeReq<C>
  ) => Promise<GmuxInvokeRes<C>> | GmuxInvokeRes<C>
): void {
  handleTyped(ipcMain, channel, fn);
}

/**
 * Register every sessions:* and projects:* handler. The git and fs channels
 * are owned by the Phase 3 streams (src/main/git/, src/main/fs/) and are NOT
 * registered here.
 */
export function registerIpcHandlers(): void {
  registerPopupMenuHandler();

  // Phase 12.12 item 2: the store moved the session surface (View menu, the
  // SESSIONS header's inline toggle, or its ˅ menu — one setter behind all
  // three). Main's only job is to keep the View-menu radios rendering it.
  handle('ui:sessionsPosition', (_e, position) => {
    setSessionsPositionRadios(position);
  });

  handle('sessions:create', async (_e, input) =>
    (await getGmuxCore()).createSession(input)
  );
  handle('sessions:list', async () => (await getGmuxCore()).listSessions());
  handle('sessions:rename', async (_e, input) =>
    (await getGmuxCore()).renameSession(input)
  );
  handle('sessions:kill', async (_e, sessionId) =>
    (await getGmuxCore()).killSession(sessionId)
  );
  handle('sessions:attach', async (e, sessionId) =>
    (await getGmuxCore()).attachSession(sessionId, e.sender)
  );
  handle('sessions:detach', async (_e, sessionId) =>
    (await getGmuxCore()).detachSession(sessionId)
  );
  handle('sessions:resize', async (_e, input) =>
    (await getGmuxCore()).resizeSession(input)
  );

  // Scrollback (Phase 12.3). The renderer polls state while a pane is
  // scrolled and after output arrives, so these must stay cheap — they run
  // over the control client, not a process spawn.
  handle('terminal:scrollState', async (_e, input) =>
    (await getGmuxCore()).scrollState(input)
  );
  handle('terminal:scrollBy', async (_e, input) =>
    (await getGmuxCore()).scrollBy(input)
  );
  handle('terminal:scrollTo', async (_e, input) =>
    (await getGmuxCore()).scrollTo(input)
  );
  handle('terminal:scrollLive', async (_e, sessionId) =>
    (await getGmuxCore()).scrollLive(sessionId)
  );

  // Scrollback facts (Phase 13.7). ALL THREE ARE PULL. There is deliberately
  // no subscription here: the Settings card asks when it opens, the session
  // menu asks when it is opened, and Copy details asks when it is clicked.
  handle('scrollback:stats', async () => (await getGmuxCore()).scrollbackStats());
  handle('scrollback:session', async (_e, sessionId) =>
    (await getGmuxCore()).sessionScrollback(sessionId)
  );
  handle('scrollback:report', async () => (await getGmuxCore()).scrollbackReport());

  // Phase 13: the user typed into a session, so whatever it was blocked on
  // has an answer. Clears needs_input without waiting for echo — the Phase
  // 9.2 rule that a session may never demand attention because of the user's
  // OWN input to it. (Replaces the renderer detector's noteUserInput.)
  handle('activity:noteInput', async (_e, sessionId) => {
    (await getGmuxCore()).activity.noteUserInput(sessionId);
  });

  handle('projects:add', async (_e, path) =>
    (await getGmuxCore()).addProject(path)
  );
  handle('projects:list', async () => (await getGmuxCore()).listProjects());
  handle('projects:remove', async (_e, projectId) =>
    (await getGmuxCore()).removeProject(projectId)
  );
  handle('projects:pickDirectory', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const options = {
      properties: ['openDirectory', 'createDirectory'] as Array<
        'openDirectory' | 'createDirectory'
      >,
      message: 'Choose a project folder'
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  });
}
