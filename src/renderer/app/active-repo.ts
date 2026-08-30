/**
 * PHASE 164. Which folder on this Mac the git store should be asked about
 * right now, and it is one folder or none.
 *
 * Before this phase the title bar asked for `git:status` on EVERY open local
 * project the moment the project list landed, and again whenever the list
 * changed. Nothing on screen reads a hidden project's status: the rail and the
 * sidebar both read the git store through the ACTIVE project's local path, and
 * the tabs read no status at all. Each of those hidden requests cost three git
 * processes and a file watcher at boot, and the watcher then re-ran the status
 * on every change in that folder for the whole run. Measured on the parent
 * commit with five projects open: four hidden statuses in the first two
 * seconds, on every launch, cold and warm.
 *
 * So the answer is the active project's local path, or null when there is no
 * active project or the active project's folder is on another machine. A
 * project becomes active through `setActiveProject`, which is what a tab
 * click, a digit chord and the cycle chord all route through, so switching to
 * a project is the selection intent that asks for its status. A project never
 * selected is never asked about.
 *
 * WHAT THIS DOES NOT CHANGE. What `git:status` computes is untouched, and the
 * store is still keyed by repo path, so a status fetched for one folder can
 * only ever be read back under that folder's own path. The rail and the
 * sidebar read `repos[localPathOf(active)]`, and a project whose status has
 * not been asked for reads the empty record, never a neighbour's.
 */
import type { Project } from '@shared/types';
import { localPathOf, targetOfProject } from '@shared/workspace-target';

/** The active project's folder on this Mac, or null. */
export function activeLocalRepoPath(
  projects: readonly Project[],
  activeProjectId: string | null
): string | null {
  if (activeProjectId === null) return null;
  const active = projects.find((p) => p.id === activeProjectId);
  if (active === undefined) return null;
  return localPathOf(targetOfProject(active));
}
