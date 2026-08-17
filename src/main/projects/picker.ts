/**
 * What the native folder panel says, per question (Phase 74, GitHub issue 6).
 *
 * The panel used to say "Choose a project folder" to every caller. In New
 * Project that sentence is wrong. The folder being chosen there is the one the
 * new project folder is created INSIDE, so a person who read it as "the
 * project folder" and picked ~/code would be creating ~/code/code.
 *
 * Both messages live here so the frozen channel and the Phase 74 channel
 * cannot drift apart in wording, and so this is a unit test rather than a
 * photograph of a native panel. A native panel cannot be captured by
 * `capturePage`, and a whole screen capture is refused.
 */

/** Every sentence the folder panel can show, by purpose. */
export const DIRECTORY_PICK_MESSAGES = {
  project: 'Choose a project folder',
  'new-project-parent':
    'Choose where the new project goes. Tortie creates the project folder ' +
    'inside the folder you choose.'
} as const;

/**
 * The message for a purpose. Total on purpose: the value crosses IPC, and an
 * unknown one gets the message the picker has always shown rather than an
 * empty panel or a throw.
 */
export function directoryPickMessage(purpose: string): string {
  return purpose === 'new-project-parent'
    ? DIRECTORY_PICK_MESSAGES['new-project-parent']
    : DIRECTORY_PICK_MESSAGES.project;
}
