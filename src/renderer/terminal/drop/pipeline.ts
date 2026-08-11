/**
 * Paths in, references in the prompt — the half that drag-and-drop and ⌘V
 * share (research 16 §6: "drag-drop and paste share one code path"; only
 * acquisition differs, and it converges here).
 *
 *   resolveAll   Files      → absolute paths (persisting the pathless ones)
 *   attachPaths  paths      → classified in main → escaped → pasted
 *   addProject   a folder   → a project, wherever it was dropped
 */

import type { DropPreparedItem } from '@shared/types';
import { acceleratorToDisplay } from '@shared/keymap';
import { errorText, useApp } from '../../state/store';
import { pathForFile, preparePaths, resolveFilePath } from './acquire';
import { insertReferences, MAX_REFERENCES } from './insert';
import { isUnsafeToPaste, referenceText } from './reference';
import { imageDropFor } from './strategy';
import { focusSession, paneAccepts, sessionById } from './target';

const NOT_RUNNING = 'Restart the session to attach files.';

/** Resolve dropped/pasted Files to absolute paths, reporting what failed. */
export async function resolveAll(files: File[]): Promise<string[]> {
  const paths: string[] = [];
  let unexplained = 0;
  for (const file of files) {
    try {
      const path = await resolveFilePath(file);
      if (path.length > 0) paths.push(path);
      else unexplained++;
    } catch (err) {
      // errorText unwraps main's structured GmuxError JSON — the size and
      // empty-file refusals arrive as real sentences, not a stack.
      useApp.getState().toast('error', errorText(err));
    }
  }
  // Resolved to nothing, with nothing to say about it: an older preload with
  // no webUtils bridge. Say so rather than swallowing the drop.
  if (paths.length === 0 && unexplained > 0) {
    useApp.getState().toast('error', 'That file could not be attached.');
  }
  return paths;
}

export interface AttachOptions {
  /** More paths arrived than MAX_REFERENCES allows; say so once. */
  truncated?: boolean;
  /**
   * What a DIRECTORY among `paths` means.
   *  'add-project' — the pre-existing rule for a drag from Finder or another
   *                  app: a folder is a project, and the session pane is just
   *                  where it happened to land.
   *  'reference'   — a folder dragged out of the TREE is already inside an
   *                  open project. Adding it again as a second project tab
   *                  would be surprising and tedious to undo, and it is not
   *                  what the gesture said: a drag from the tree to a pane
   *                  means ATTACH. Insert its path — "look at this directory"
   *                  is a thing every agent understands.
   */
  folders?: 'add-project' | 'reference';
}

/** Insert references for `paths` into a session's prompt. */
export async function attachPaths(
  sessionId: string,
  paths: string[],
  options: AttachOptions = {}
): Promise<void> {
  const { truncated = false, folders = 'add-project' } = options;
  const app = useApp.getState();
  const session = sessionById(sessionId);
  if (!paneAccepts(session) || session === null) {
    app.toast('error', NOT_RUNNING);
    return;
  }

  const { items } = await preparePaths(paths);
  if (items.length === 0) return;

  // Directory or file? Main decided that with one stat(); the renderer never
  // guesses. What a directory MEANS is the caller's call (see AttachOptions).
  const files: DropPreparedItem[] = [];
  for (const item of items) {
    if (item.kind === 'dir') {
      if (folders === 'reference') files.push(item);
      else void app.addProjectPath(item.sourcePath);
    } else if (item.kind === 'file') files.push(item);
  }
  if (files.length === 0) return;

  const usable = files.filter((i) => !isUnsafeToPaste(i.refPath));
  if (usable.length === 0) {
    app.toast('error', "That filename can't be attached safely.");
    return;
  }

  const drop = imageDropFor(session.agent);
  const refs = usable.map((i) => referenceText(i.refPath, session.agent));

  focusSession(sessionId);
  if (!(await insertReferences(sessionId, refs, drop))) {
    app.toast('error', NOT_RUNNING);
    return;
  }

  // Success is silent for the common case — the chip or the path is its own
  // proof. Toast only what the user could not otherwise tell.
  if (truncated) {
    app.toast('info', `Only the first ${MAX_REFERENCES} files were attached.`);
  }
  if (usable.some((i) => i.copied)) {
    app.toast('info', 'Copied to a safe filename before attaching.');
  }
  if (drop.strategy === 'clipboard-attach' && usable.some((i) => i.isImage)) {
    app.toast(
      'info',
      `Inserted the file path — this agent attaches images from ${acceleratorToDisplay('Cmd+V')} only.`
    );
  }
}

/** Insert one URL (a cross-app drag that carried no file). */
export function attachUrl(sessionId: string, url: string): void {
  const app = useApp.getState();
  const session = sessionById(sessionId);
  if (!paneAccepts(session) || session === null) {
    app.toast('error', NOT_RUNNING);
    return;
  }
  focusSession(sessionId);
  void insertReferences(sessionId, [url], imageDropFor(session.agent));
}

/** A file drag that landed anywhere but a session: the project-add path. */
export async function addProjectFromDrop(files: File[]): Promise<void> {
  const app = useApp.getState();
  const first = files[0];
  if (first === undefined) return;
  // Never persist bytes here — a project is a real directory or nothing.
  const path = pathForFile(first);
  if (path.length === 0) {
    // No path at all (a synthesized File): fall back to the picker, exactly
    // as the old folder-drop did on every drop before webUtils existed.
    void app.openProject();
    return;
  }
  const { items } = await preparePaths([path]);
  const item = items[0];
  if (item === undefined || item.kind === 'missing') {
    void app.openProject();
    return;
  }
  if (item.kind === 'dir') {
    void app.addProjectPath(item.sourcePath);
    return;
  }
  app.toast(
    'info',
    'Drop a file onto a session to attach it, or a folder here to add a project.'
  );
}
