/**
 * The reasons a tab is not an edit surface (Phase 96, Phase 101, Phase 336),
 * pure.
 *
 * PHASE 268 MOVED IT OUT OF ./MonacoHost.tsx and changed not one line of it.
 * The auto-save policy (./auto-save.ts) asks this exact question before it
 * arms a timer, and reaching it through the host would have made
 * `store -> auto-save -> MonacoHost -> store` — the cycle ./store.ts's own
 * header already refuses for the markdown barrel. `tabIsReadOnly` is still
 * exported FROM ./MonacoHost.tsx, so every importer and both of its existing
 * tests read the same name from the same place.
 */

import type { MachineStateView } from '@shared/ipc';
import type { Project } from '@shared/types';
import { remoteWriteFolderIn, writeFolderOf } from '../state/machines-slice';
import type { EditorTab } from './tab-types';

/**
 * The reasons a tab is not an edit surface. Exported for its test.
 *
 * A deleted file has nothing left to write to. A truncated file holds only the
 * head of what is on disk, so a save would cut the rest off. A history tab
 * shows a file as it was at one commit, and the past is not an edit surface
 * (VS Code opens commit contents read-only for the same reason, because a save
 * would write an old revision over the live file).
 *
 * PHASE 96. `tab.remote` is the fourth reason and it was missing. A review tab
 * names a file on another computer, so `save` in ./tab-io.ts has refused it
 * since Phase 73 and says so out loud since Phase 90.3. Monaco was never told,
 * so a person typed freely into a tab whose every save is refused, and the band
 * ./EditorPanel.tsx draws over it already promised that typing changes nothing.
 * This makes that promise true.
 *
 * PHASE 101 MADE THE FOURTH REASON CONDITIONAL, and it is the only one that
 * is. PHASE 336 CHANGED WHAT IT IS CONDITIONAL ON. `remoteWriteFolder` is the
 * folder on that machine Tortie may write this tab's file under, being the
 * open project that holds it (or a folder a person typed in an earlier build),
 * as `remoteWriteFolderIn` in ../state/machines-slice answers it, and null
 * means there is none: the file is outside every project opened there, the
 * folder is one Tortie never writes in, or the machine is not confirmed right
 * now. A remote tab is an edit surface when it is a non-empty string and is
 * read only otherwise. The other three reasons are unchanged and none of them
 * is conditional: a deleted file, a cut file and a past commit are not edit
 * surfaces on any machine.
 *
 * PHASE 336 ADDED A FIFTH, `saveCapped`: a file on another machine larger than
 * Tortie can save there now OPENS, read only, where Phase 101 refused it at
 * open on a machine with saving on.
 *
 * PHASE 343 ADDED `throughLink`, which is not conditional either: a file the
 * Explorer opened through a link to a folder is read only on this Mac and on
 * another machine, and it is asked in the first `if` so it wins over a write
 * folder. Auto save asks this function, so it stops that too.
 *
 * The caller reads the folder from the link state and the project list main
 * pushes, so the answer is never older than the last confirmation or the last
 * project opened. This function decides nothing about whether a write is
 * allowed. Main decides that again at call time, and this only decides
 * whether Monaco takes the keystroke.
 */
export function tabIsReadOnly(
  tab: EditorTab,
  remoteWriteFolder: string | null
): boolean {
  // PHASE 240: a compare tab holds two versions and neither is on disk, so
  // there is nothing under it a keystroke could legitimately change. It never
  // reaches File mode — its mode chip offers nothing and setMode refuses — and
  // this is the same belt-and-braces the commit tab has carried since Phase 12.
  // PHASE 343: a file the Explorer opened through a link to a folder is read
  // only on both computers, and it is asked here, before the remote reason, so
  // a write folder on that machine never makes such a tab an edit surface.
  if (
    tab.deleted ||
    tab.truncated ||
    tab.commit !== null ||
    tab.compare !== undefined ||
    tab.throughLink === true
  ) {
    return true;
  }
  if (tab.remote === undefined) return false;
  if (tab.saveCapped !== undefined) return true;
  return remoteWriteFolder === null || remoteWriteFolder.length === 0;
}

/**
 * The folder Tortie may write a remote tab's file under, or null (Phase 336).
 *
 * The one reading MonacoHost, the store's dirty rule and the panel's band ask,
 * so the three cannot disagree about one tab. Null for a tab on this Mac, which
 * `tabIsReadOnly` never consults for one. It is the file's own path that is
 * asked about, in `file` mode, so a file must sit strictly below the folder.
 */
export function remoteTabWriteFolder(
  tab: EditorTab,
  states: readonly MachineStateView[],
  projects: readonly Project[]
): string | null {
  if (tab.remote === undefined) return null;
  return writeFolderOf(
    remoteWriteFolderIn(
      states,
      projects,
      tab.remote.machineId,
      tab.path,
      'file'
    )
  );
}
