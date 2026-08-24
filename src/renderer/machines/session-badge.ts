/**
 * What the session dock row says about a session that runs on another machine.
 *
 * Three surfaces draw these words, being the row's badge, the status note under
 * it and the condition bar over the list. The words are here rather than in the
 * row so that one reviewer can read what Tortie claims about a machine it
 * cannot see. The doctrine that binds them is in ./presentation.ts.
 */

/**
 * The badge's own sentence, on every surface that draws it.
 *
 * It is a full sentence rather than the bare label because the label alone
 * ("Studio") answers no question a person was asking. The badge shows the
 * label and this says what the label means.
 */
export function badgeTitle(label: string): string {
  return `This session runs on ${label}.`;
}

/**
 * The badge's sentence while that machine is quiet.
 *
 * It says what happened rather than what it means, because what it means is on
 * the condition bar beside it and two sentences saying the same thing on one
 * screen is the Phase 67 nit repeated.
 */
export function badgeQuietTitle(label: string): string {
  return `${label} did not answer.`;
}

/**
 * The badge's sentence for a machine that has not answered ONCE in this run
 * (Phase 71).
 *
 * `badgeQuietTitle` above is for a machine that was answering and stopped. This
 * one is for the case that used to be invisible: Tortie started, the machine
 * was already down, and there is no session row anywhere on this Mac to hang a
 * status on. So the sentence names the machine and then names the one thing a
 * person can do about it, which is the button in Settings.
 */
export function badgeSilentTitle(label: string): string {
  return (
    `${label} has not answered since Tortie started. Settings then Machines ` +
    'has a button that tries again.'
  );
}

// ---------------------------------------------------------------------------
// The status note on a row that runs on another machine (Phase 85)
// ---------------------------------------------------------------------------

/**
 * What the status dot on a remote row is worth, said where the dot is drawn.
 *
 * WHY THIS SENTENCE IS HERE AND NOT ON THE CREATE SHEET. Phase 87 deleted the
 * paragraph that said these same two numbers under the machine field on the
 * create sheet, and the reason it gave is still true. A person on that sheet
 * has not created anything, so a cadence describes nothing they can see yet.
 * The deleted name is recorded in ../app/__tests__/create-copy.test.ts, which is
 * also what stops it coming back, so it is not written again here.
 *
 * What was wrong with that sentence was never its numbers. It was its scope,
 * because those two cadences applied only to a machine Tortie was not connected
 * to. Phase 85 makes both numbers true for every machine, whatever feed it is
 * on, so the sentence is true again and it is drawn on the row whose dot it
 * explains.
 *
 * WHAT IT CLAIMS. Two things, and no more. The first is how often Tortie asks,
 * which is what tells a person how old a dot can be. The second is the one
 * thing the dot cannot say for a session on another machine, which is that the
 * session is waiting for them. Tortie works that out from files this Mac holds,
 * and a session on another machine writes those files over there.
 *
 * WHERE IT IS DRAWN. `sessionTooltip` in ./session-actions.tsx, on the second
 * line, which is the line a session on this Mac uses for its resume sentence.
 * That reaches the dock row, the tab and the rail hover card with no further
 * edit. It is drawn only for a machine that is answering, because a promise to
 * ask every 5 seconds beside a machine that answers nothing is the class of
 * claim Phase 67 existed to end.
 */
export function remoteStatusNote(label: string): string {
  return (
    `Tortie asks ${label} what its sessions are doing every 5 seconds while a ` +
    `Tortie window is in front, and every 30 seconds when none is. A session ` +
    `on another machine never says it needs input, because Tortie works that ` +
    `out from files on this Mac.`
  );
}

// ---------------------------------------------------------------------------
// The condition bar for a machine Tortie holds no rows for (Phase 71)
// ---------------------------------------------------------------------------

/**
 * Several labels as one phrase, e.g. "Studio and Attic".
 *
 * The same shape main uses for its version list, written again here because the
 * renderer shares no module with main and three lines of joining does not earn
 * a place in the shared contract.
 */
function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0] ?? '';
  const head = labels.slice(0, -1).join(', ');
  return `${head} and ${labels[labels.length - 1] ?? ''}`;
}

/**
 * The bar when a confirmed machine has not answered and Tortie holds no rows
 * for it.
 *
 * WHY THIS IS A SECOND SENTENCE AND NOT A REWORDING OF THE FIRST. The bar
 * Phase 67 shipped says "Your sessions are untouched. Tortie just cannot see
 * them", and it is about sessions that are on the screen with their status
 * dimmed. Here there is nothing on the screen at all: no record of a remote
 * session is kept on this Mac, so a machine that has never answered in this run
 * contributes no rows. Reusing the old sentence would point at rows that are
 * not there.
 *
 * WHAT IT MUST NEVER SAY. It must not say the sessions are running, because
 * nothing proved that. It must not say they ended, because nothing proved that
 * either. It says what Tortie did, which is nothing.
 */
export function machineSilentText(labels: readonly string[]): string {
  return (
    `Tortie could not reach ${joinLabels(labels)}. Sessions you started ` +
    'there are not shown here, and Tortie did not end any of them.'
  );
}
