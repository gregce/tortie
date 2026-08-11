/**
 * What the Explorer HEADER's actions aim at (Phase 14.2 item 3).
 *
 * The header's New File / New Folder run the same `TreeOps.newEntry` the
 * context menu runs — there is exactly one create flow in the app, and it is
 * the Phase 12.9 inline-rename-on-create one. The only thing the header has
 * to decide for itself is WHERE, because a toolbar button has no row under
 * the pointer to infer a destination from.
 *
 * Both answers are pure functions so the rules are pinned by tests rather
 * than by a screenshot of a tree.
 */

import { isDirPath, parentOf } from './tree-paths';

/**
 * VS Code's rule, and the one people already expect: a header create lands in
 * the selected FOLDER, in the selected file's PARENT folder, or — with
 * nothing selected — at the project root ('').
 *
 * With several rows selected the FIRST is what the destination follows.
 * Picking the last, or refusing to act, both fail the same way: the user
 * pressed a create button and something has to appear somewhere they can see.
 */
export function headerDestDir(selected: readonly string[]): string {
  const first = selected[0];
  if (first === undefined || first === '') return '';
  return isDirPath(first) ? first : parentOf(first);
}

/**
 * Every directory that is currently open, in the order the caller supplied.
 *
 * Collapse All walks this list rather than the model's rows because a
 * collapsed ancestor hides its descendants from the visible rows while they
 * are still expanded underneath — collapse the parent only and re-expanding
 * it would spill the whole subtree back open, which is not what "collapse
 * all" means to anyone.
 */
export function expandedDirs(
  paths: Iterable<string>,
  isExpanded: (canonical: string) => boolean
): string[] {
  const open: string[] = [];
  for (const path of paths) {
    if (!isDirPath(path)) continue;
    if (isExpanded(path)) open.push(path);
  }
  return open;
}
