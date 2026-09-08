/**
 * The one Refresh press on a tab whose folder is on another machine
 * (Phase 230, lifting the Phase 229 shape out of ./ScmSection.tsx).
 *
 * The local Source control view carries two refresh controls, being Refresh
 * git status in the branch header and Refresh branches on the Branches group,
 * and the remote view carried five, one on the header band and one on each
 * of its four groups. Every group reads again by itself now, at the moments
 * ../machines/use-remote-reread.ts names, so the remote view carries the two
 * the local view carries and no more, under the same labels in the same
 * places. This is what the header band's press does.
 *
 * It re-reads the Changes group, and the Branch group when the branch has
 * been read for this target, which is Phase 229's rule: the commit box
 * disables the press while git over there has no name or no address, the
 * person fixes that on that machine, and the one Refresh a person reaches
 * from the box re-asks the question. A target whose branch was never read is
 * left alone, because a group nobody expanded asked nothing. It is a read of
 * a thing already read, at a press, and never a timer.
 */

import type { WorkspaceTarget } from '@shared/workspace-target';
import {
  remoteBranchAvailable,
  remoteBranchOf,
  useRemoteBranch
} from './remote-branch';
import { useRemoteChanges } from './remote-changes';

export async function refreshRemoteScm(target: WorkspaceTarget): Promise<void> {
  const reads = [useRemoteChanges.getState().refresh(target)];
  const branchMode = remoteBranchOf(
    useRemoteBranch.getState().byTarget,
    target
  ).mode;
  if (branchMode !== null && remoteBranchAvailable()) {
    reads.push(useRemoteBranch.getState().refresh(target));
  }
  await Promise.all(reads);
}
