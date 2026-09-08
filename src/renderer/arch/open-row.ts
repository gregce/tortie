/**
 * OPENING ONE FILE FROM AN ARCHITECTURE ROW, ON EITHER COMPUTER (Phase 234).
 *
 * Three surfaces here open a file: a failing promise's offending line, a box in
 * the level 2 module view, and the promises list the Source Control view
 * carries. Until this phase each of them composed
 * `path: ${repoPath}/${relPath}` out of a path on this Mac, which is right and
 * is the only thing that was possible, because the view never drew for a folder
 * on a machine.
 *
 * It draws now, and a path on his Mac Pro is not a path here: both of the
 * operator's computers put his home at `/Users/gdc`, so an open composed the old
 * way would silently open a DIFFERENT file with the same name on the wrong
 * computer. This module is the one place that decision is made, so no row has to
 * remember it.
 *
 * There is no new surface and no new sentence. `OpenFileRemoteRef` has carried a
 * file on a machine into the editor since Phase 90.3, and the Explorer composes
 * exactly this shape; the tab it opens is the same read only remote tab a click
 * in the tree opens, with the same tooltip.
 */

import { targetOfRootKey } from '@shared/workspace-target';
import { requestOpenFile, type OpenFileRequest } from '../state/open-file';
import { machineLabelFor } from '../state/machines-slice';
import { useApp } from '../state/store';
import { archMachineOf } from './state/repo-key';

/** What one row asks for, minus the parts this module works out. */
export interface ArchRowOpen {
  /** The repository key the view holds, being `rootKeyOf` of its target. */
  repoKey: string;
  /** The file, repository relative. */
  relPath: string;
  /** The 1 based line to land on, when the row names one. */
  line?: number;
}

/**
 * Open one file named by an Architecture row, on the computer its repository is
 * on.
 *
 * `source: 'search'` because every one of these is a NAVIGATION to a line rather
 * than an open of a file, which is the reason the three call sites already gave.
 */
export function openArchRow(row: ArchRowOpen): void {
  const target = targetOfRootKey(row.repoKey);
  const machineId = archMachineOf(row.repoKey);
  const request: OpenFileRequest = {
    repoPath: target.path,
    relPath: row.relPath,
    path: `${target.path}/${row.relPath}`,
    mode: 'file',
    source: 'search',
    preview: false,
    ...(row.line === undefined ? {} : { selection: { line: row.line } }),
    // Its presence is what makes the editor fill the tab from that machine and
    // treat it as read only. The label is the tab's tooltip and nothing else,
    // and it is read from the machine rows rather than composed here.
    ...(machineId === null
      ? {}
      : {
          remote: {
            machineId,
            machineLabel: machineLabelFor(
              useApp.getState().machineStates,
              machineId
            ),
            repoPath: target.path
          }
        })
  };
  requestOpenFile(request);
}
