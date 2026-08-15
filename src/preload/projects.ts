/**
 * The projects half of the bridge: the project verbs, the clone stream, and
 * the home screen's recents. Moved verbatim from the single preload file
 * (Phase 42 stage 2).
 */

import type {
  CloneDone,
  CloneProgress,
  GmuxRecentsExtras,
  InstalledProjectsApi
} from '../shared/ipc';
import { cloneProgressChannel, EVT_RECENTS_CHANGED } from '../shared/ipc';
import { invoke, on, onTemplateChannel } from './bridge';

/**
 * projects surface = frozen GmuxApi['projects'] + the Phase 12.9 `create`
 * and the Phase 18.6 clone (both feature-detected: without them the shell
 * hides "New Project…" and "Clone Repository…" rather than offering a button
 * that throws).
 *
 * `onCloneProgress` takes the cloneId the CALLER minted and is meant to be
 * called BEFORE `clone()`, for the same reason `search.onResults` is: a
 * validation failure is reported on the stream within a tick of the call, so
 * a subscription set up after the invoke resolves can miss the only frame
 * that ever arrives.
 */
export const projects: InstalledProjectsApi = {
  add: (path) => invoke('projects:add', path),
  list: () => invoke('projects:list'),
  remove: (projectId) => invoke('projects:remove', projectId),
  pickDirectory: () => invoke('projects:pickDirectory'),
  create: (input) => invoke('projects:create', input),
  clonePreflight: (input) => invoke('projects:clonePreflight', input),
  clone: (input) => invoke('projects:clone', input),
  cancelClone: (cloneId) => invoke('projects:cancelClone', cloneId),
  onCloneProgress: (cloneId, cb) =>
    onTemplateChannel<CloneProgress | CloneDone>(
      cloneProgressChannel(cloneId),
      cb
    )
};

/**
 * recents surface (Phase 18.6). The home screen's recent projects list.
 *
 * Three calls and one subscription. The list is read once when the renderer
 * loads, the missing check runs after the home screen's first paint, and the
 * event fires when main writes the file, which is when a project is opened or
 * closed and when a row is removed.
 */
export const recents: NonNullable<GmuxRecentsExtras['recents']> = {
  list: () => invoke('recents:list'),
  missing: () => invoke('recents:missing'),
  remove: (path) => invoke('recents:remove', path),
  onChanged: (cb) => on(EVT_RECENTS_CHANGED, cb)
};
