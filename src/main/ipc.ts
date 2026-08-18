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
// LEAF import: the ./preview barrel also re-exports the parse5 anchor
// rewrite, and this file needs one function that touches no parser.
import { releasePreviewRoot } from './preview/protocol';
// LEAF import for the same reason: ./projects re-exports the clone spawner
// and the folder creator, and this file needs one pure copy lookup.
import { directoryPickMessage } from './projects/picker';
import { rememberProject } from './recents';
// LEAF import for the same reason the two above are leaf imports: ./restore
// re-exports the restore machinery and its IPC registrar, and this file needs
// one synchronous read of the snapshot store.
import { readSavedOutput } from './restore/snapshots';
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
 * The native folder panel. Both picker channels end here, and the only
 * difference between them is the sentence, which comes from ./projects/picker
 * (Phase 74). The renderer sends the question and never the words.
 */
async function pickDirectory(
  e: IpcMainInvokeEvent,
  purpose: string
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(e.sender);
  const options = {
    properties: ['openDirectory', 'createDirectory'] as Array<
      'openDirectory' | 'createDirectory'
    >,
    message: directoryPickMessage(purpose)
  };
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
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
  // Phase 72: the saved output panel's one read. It goes STRAIGHT to the
  // snapshot store rather than through the sessions core, because the answer
  // is a file on this Mac and the core holds nothing this needs. It sends no
  // command to any machine: for a session that runs somewhere else, this is
  // the copy Tortie kept here, and the panel says so.
  handle('scrollback:saved', (_e, sessionId) => readSavedOutput(sessionId));

  // Phase 13: the user typed into a session, so whatever it was blocked on
  // has an answer. Clears needs_input without waiting for echo — the Phase
  // 9.2 rule that a session may never demand attention because of the user's
  // OWN input to it. (Replaces the renderer detector's noteUserInput.)
  handle('activity:noteInput', async (_e, sessionId) => {
    (await getGmuxCore()).activity.noteUserInput(sessionId);
  });

  // Phase 18.6 item 2: the recents file is written HERE, at the two moments
  // that mean "the user was just in this project". Every route into a project
  // ends at projects:add, which is the folder picker, a window drop, New
  // Project, Clone and the home screen's own recent rows, so a route added
  // later cannot forget to record itself. The rules and the file are in
  // ./recents; these two lines are the whole call site.
  handle('projects:add', async (_e, path) => {
    const project = (await getGmuxCore()).addProject(path);
    rememberProject(project);
    return project;
  });
  handle('projects:list', async () => (await getGmuxCore()).listProjects());
  handle('projects:remove', async (_e, projectId) => {
    const core = await getGmuxCore();
    // Read the row BEFORE it is deleted, so the recents entry keeps the name
    // the user gave the project rather than falling back to the folder name.
    const row = core.listProjects().find((p) => p.id === projectId);
    rememberProject(row);
    core.removeProject(projectId);
    // Phase 20.5: drop this project's `gmux-preview:` token, so a page still
    // held in a closed tab stops resolving. Nothing breaks if it is skipped,
    // because the map holds one small row per project, but a closed project
    // should not keep a live door open. Failure is ignored on purpose: a
    // project that has already been deleted from disk still had its row
    // removed above, and the close must not fail because of a token.
    if (row) await releasePreviewRoot(row.path).catch(() => undefined);
  });
  handle('projects:pickDirectory', async (e) => pickDirectory(e, 'project'));
  // Phase 74. The same panel, worded for the question the caller is asking.
  // The frozen channel above takes no argument, so this one carries it.
  handle('projects:pickDirectoryFor', async (e, purpose) =>
    pickDirectory(e, purpose)
  );
}
