/**
 * The one pending-shell-open pull (Phase 61, serialized in Phase 62.1).
 *
 * Both pull sites call this function instead of carrying their own copies
 * of the same `.then` block, which is the extraction the growth guardrail
 * asks for:
 *
 *  1. the end of `hydrateAppState` (./subscriptions.ts), the COLD leg;
 *  2. the `shell-open-pending` menu action (../app/menu-actions.ts, which was
 *     ../app/App.tsx until Phase 127 cut the menu controller out), the WARM
 *     leg.
 *
 * The pull is take-and-clear main-side, so the double coverage can never
 * deliver twice. Since Phase 61 the pull returns a folder-and-file pair:
 * the folder opens as a project tab through the same `addProjectPath`
 * every other route uses, and the file, when one rode along, opens through
 * the same open bus a tree click uses. Nothing here can start an agent,
 * select an agent or run a command. That cap lives with the channel
 * declaration in src/shared/ipc/shell.ts.
 *
 * THE ORDER (Phase 62.1). A multi-file Finder open delivers one nudge per
 * file, and each nudge runs this pull. Before this phase two pulls could
 * run at once. The first pull took the first file and then waited on a
 * slow `addProjectPath`, because its project was not open yet. The second
 * pull took the second file and finished first, because the project row
 * existed by then. So the FIRST file's open was emitted last, and
 * `openFromRequest` in ../editor/store.ts activates the tab of whichever
 * open arrives last. Focus landed on the first file about once in three
 * runs, which is the Phase 61 report. The takes already happen in arrival
 * order, because the main-side slot is take-and-clear. Only the pipeline
 * after the take could reorder. The promise chain below runs each delivery
 * to completion before the next one starts, so emit order now matches take
 * order, and the last file the user opened wins the active tab.
 */

import type { ShellPendingOpen } from '@shared/ipc';
import { isLocalTarget, targetOfProject } from '@shared/workspace-target';
import { requestOpenFile } from './open-file';
import { shellOps } from './shell-ops';
import { useApp } from './store';
import { gmuxBridge } from '../bridge';

/**
 * The serial chain. Every delivery is appended here, so at most one
 * delivery is in flight at any moment.
 */
let chain: Promise<void> = Promise.resolve();

/**
 * Pull the pending shell open, open the project, then open the file if one
 * rode along. Deliveries run strictly one after another, in call order.
 * The chain link swallows each delivery's rejection, so one failed
 * delivery can never wedge every later pull. The promise returned to the
 * caller still carries its own delivery's rejection.
 */
export function pullPendingShellOpen(): Promise<void> {
  const run = chain.then(() => deliverPendingShellOpen());
  chain = run.catch(() => undefined);
  return run;
}

/** One delivery, from the take to the emit. Only the chain calls this. */
async function deliverPendingShellOpen(): Promise<void> {
  const gmux = gmuxBridge();
  // Feature-detected: an older preload has no pull, and launches still work
  // because the slot lives in main.
  if (typeof gmux?.takePendingOpen !== 'function') return;
  let pending: ShellPendingOpen | null = null;
  try {
    pending = await gmux.takePendingOpen();
  } catch {
    return;
  }
  if (pending === null) return;
  const pair = pending;

  // Idempotent: an already-open project focuses its tab. A folder deleted
  // between arrival and delivery fails with the sticky toast that route
  // already has.
  await useApp.getState().addProjectPath(pair.folder);
  if (pair.file === null) return;
  const file = pair.file;

  // `addProjectPath` toasts its own failures instead of throwing, so the
  // project list is the proof it worked. When the folder never became a
  // project, the file half is abandoned on purpose: a file open without
  // its project has no tab to land in.
  // PHASE 90.3. A LOCAL project with that path. `addProjectPath` above opens a
  // folder on this Mac, so a tab for a folder of the same path on another
  // machine is not proof that it worked, and the file half must not ride on it.
  const opened = useApp
    .getState()
    .projects.some(
      (p) => p.path === pair.folder && isLocalTarget(targetOfProject(p))
    );
  if (!opened) return;

  // The editor store subscribes to the open bus in its init(), which
  // normally runs when EditorPanel mounts. On a cold boot, or on the first
  // project of a window, that mount happens on a React render AFTER
  // addProjectPath resolves, so a request emitted right now would be
  // dropped. init() is idempotent, so calling it here guarantees the
  // subscriber exists before the emit.
  //
  // PHASE 127. The reason above still holds and only the direction changed.
  // This used to be a dynamic import of the editor store, written that way so
  // the state layer added no static edge to the editor. The state layer may
  // now name neither the app shell nor the editor at all, in any spelling,
  // and build/assert-import-boundaries.mjs rejects the dynamic spelling as
  // well as the static one. So the call is injected instead. ./shell-ops.ts
  // declares it and ../app/shell-ops-install.ts fills it with the editor
  // store's own init. The seam is filled in ../main.tsx before the first
  // render, which is earlier than any pull can run.
  shellOps().ensureEditorSubscribed();

  // `mode: 'file'` because there is no gesture asking for a diff.
  // `source: 'tree'` because the open behaves exactly like a tree open.
  // `preview: false` because a Finder open is a deliberate open, so the
  // tab is pinned rather than consuming the preview slot.
  requestOpenFile({
    repoPath: pair.folder,
    relPath: file.slice(pair.folder.length + 1),
    path: file,
    mode: 'file',
    source: 'tree',
    preview: false
  });
}
