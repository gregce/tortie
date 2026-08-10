/**
 * "Manage branches" bus (DESIGN-SPEC S3A round 2) — the branch menu's last
 * item asks the BRANCHES section to expand + take focus. A window
 * CustomEvent keeps BranchHeader and BranchesView decoupled, mirroring the
 * open-file bus pattern (src/renderer/state/open-file.ts).
 */

export const MANAGE_BRANCHES_EVENT = 'gmux:scm:manage-branches';

/** Ask the BRANCHES section to expand and focus itself. */
export function requestManageBranches(): void {
  window.dispatchEvent(new CustomEvent(MANAGE_BRANCHES_EVENT));
}

/** Subscribe (BranchesView). Returns the unsubscribe. */
export function onManageBranches(cb: () => void): () => void {
  const listener = (): void => cb();
  window.addEventListener(MANAGE_BRANCHES_EVENT, listener);
  return () => window.removeEventListener(MANAGE_BRANCHES_EVENT, listener);
}
