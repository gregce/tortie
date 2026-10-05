/**
 * The read only review of a folder on a machine (Phase 73, M6, item 4).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

/**
 * The session menu item that reads what changed in that session's folder.
 *
 * It names the machine, because the same person may have three sessions on
 * three machines open at once and the folder is on exactly one of them.
 */
export function reviewItemLabel(machineLabel: string): string {
  return `Review changes on ${machineLabel}`;
}

/**
 * Under the menu item, said every time it is offered.
 *
 * The item reads and never writes, and this is where a person is told so before
 * they press it rather than after. It is a sublabel rather than a toast because
 * a toast arrives after the act it describes.
 */
export const REVIEW_ITEM_SUBLABEL =
  'Tortie reads the folder on that machine. It changes nothing there.';

/**
 * The item's sublabel while Tortie cannot see the machine.
 *
 * The verb stays on screen and is offered disabled, which is the rule the saved
 * output item and the launch snapshot item already follow. A verb that vanishes
 * teaches nothing.
 */
export function reviewNotAnsweringSublabel(machineLabel: string): string {
  return `${machineLabel} did not answer, so there is nothing to read yet.`;
}

/** While the list is being read. It is one question and it is usually a blink. */
export const REVIEW_READING = 'Reading what changed on that machine…';

/**
 * The tooltip on a tab holding a file on another machine.
 *
 * It says the machine, and it says the tab is read only WHEN IT IS, because a
 * diff tab in Tortie is usually a file a person can edit. PHASE 336 made the
 * second sentence conditional: a file inside a project open on a confirmed
 * machine is an edit surface, as it is on this Mac, and a tooltip telling a
 * person typing into it that the view is read only would be false. The caller
 * passes the editor's own answer (`tabIsReadOnly` in ../editor/tab-readonly),
 * so the tooltip and Monaco cannot disagree; it defaults to read only, which
 * is what every caller that cannot ask meant before.
 */
export function reviewTabTooltip(
  name: string,
  machineLabel: string,
  readOnly = true
): string {
  return readOnly
    ? `${name} on ${machineLabel}. This view is read only.`
    : `${name} on ${machineLabel}.`;
}

/**
 * The title over the list of changed files.
 *
 * It names the folder rather than the repository, because the folder is what
 * the person chose when they made the session.
 */
export function reviewListTitle(machineLabel: string): string {
  return `Changed on ${machineLabel}`;
}

/**
 * The title over the new files in the same list (Phase 97).
 *
 * It is a second heading rather than more rows under the first one, because a
 * file git has never seen is a different thing from a file that changed. The
 * Source Control panel for a folder on this Mac has drawn that split since
 * Phase 4, and this menu now draws the same one.
 */
export function reviewUntrackedTitle(machineLabel: string): string {
  return `Untracked on ${machineLabel}`;
}
