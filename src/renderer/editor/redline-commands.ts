/**
 * The redline's commands, reachable from the native menu (Phase 227, and two
 * more in Phase 238).
 *
 * The Redline view owns its keyboard: next, previous, rewind and undo are
 * chords answered by the scroller's own key handler in ./RedlineDocument,
 * and they are answered only while the keyboard is in that view. The Edit
 * menu carries the same four verbs as rows, per the rule that a phase adding
 * a surface updates the native menus, and a row needs a road from
 * ../app/menu-actions to whichever view is mounted. This leaf is that road.
 *
 * It is a leaf on purpose. It imports nothing, so the menu controller, which
 * runs on every launch, reaches the redline without loading the editor panel,
 * the way ./fill.ts lets the menu reach the fill toggle (Phase 165). The view
 * installs its handler on mount and removes it on unmount; a command that
 * arrives with no view mounted does nothing and says so to the caller.
 *
 * Nothing here writes. The rewind and undo commands reach the view's one
 * press function, and `npm run conformance:redline` rule 9 scans this file
 * with the other redline modules to keep it that way.
 */

/**
 * PHASE 238 added two. `accept` is the change under focus, the mirror of
 * `rewind`; `acceptAll` is the document verb and names no change, which is why
 * it is the redline's own header button rather than a chip button and why it
 * carries no chord.
 */
export type RedlineCommand =
  | 'next'
  | 'prev'
  | 'rewind'
  | 'undo'
  | 'accept'
  | 'acceptAll';

export type RedlineCommandHandler = (command: RedlineCommand) => void;

let installed: RedlineCommandHandler | null = null;

/** Install the mounted view's handler. Returns the uninstall for its effect. */
export function installRedlineCommands(
  handler: RedlineCommandHandler
): () => void {
  installed = handler;
  return () => {
    if (installed === handler) installed = null;
  };
}

/** Run one command against the mounted view. False when no view is mounted. */
export function runRedlineCommand(command: RedlineCommand): boolean {
  if (installed === null) return false;
  installed(command);
  return true;
}
