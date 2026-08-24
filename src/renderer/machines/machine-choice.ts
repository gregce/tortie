/**
 * The machine field itself, drawn by three surfaces.
 *
 * The create sheet, the sheet that opens a folder on a machine and Settings
 * then Machines all draw this list, so the words are here rather than in the
 * create sheet. The doctrine that binds them is in ./presentation.ts.
 */

/** The label over the machine choice. */
export const MACHINE_FIELD_LABEL = 'Machine';

/** The first choice in the list, and the one every create had before this. */
export const THIS_MAC = 'This Mac';

// ---------------------------------------------------------------------------
// A machine that is in the list and cannot hold a session yet (Phase 84, item 8)
// ---------------------------------------------------------------------------

/**
 * The option's own text for a machine Tortie has not signed in to in this run.
 *
 * THE OPTION STAYS IN THE LIST. A person used to pick the machine, type a
 * name, press Create and read a refusal that sent them back to the screen
 * which had just refused them. Removing the option would fix the refusal by
 * teaching nothing, which is the rule the saved output item and the review
 * item already follow. It is drawn disabled with the reason instead.
 */
export function machineNotSignedInOption(label: string): string {
  return `${label} (not signed in)`;
}

/**
 * Under the machine field, once, when at least one machine in the list cannot
 * hold a session.
 *
 * It is drawn once rather than per row, because the answer is the same for
 * every one of them and three copies of one sentence is three times the
 * reading for the same fact.
 */
export const MACHINE_NOT_SIGNED_IN_HINT =
  'Tortie has not signed in to this machine in this run, so it cannot start a ' +
  'session there. Open Settings, then Machines, then press Prepare.';
