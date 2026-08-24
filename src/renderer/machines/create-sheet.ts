/**
 * What the create sheet says once a machine is chosen.
 *
 * The machine field's own words are in ./machine-choice.ts, because three
 * surfaces draw that field and only one of them is this sheet. The doctrine
 * that binds these sentences is in ./presentation.ts.
 */

/** The directory field's label once a machine is chosen. */
export function createDirLabel(label: string): string {
  return `Directory on ${label}`;
}

/** What the empty directory field shows once a machine is chosen. */
export function createDirPlaceholder(label: string): string {
  return `Your home directory on ${label}`;
}

/**
 * Under the directory field, once a machine is chosen.
 *
 * PHASE 84 REWROTE IT BECAUSE IT HAD BECOME FALSE. It used to say Tortie does
 * not check that the folder is there. Tortie now asks that machine about a
 * named folder before it composes anything, and refuses when the answer is
 * that the folder is not there, is not a folder, or cannot be read.
 */
export const CREATE_DIR_HINT =
  'This folder is on the other machine. Tortie asks that machine whether the ' +
  'folder is there before it starts anything.';

/**
 * The one line of the honesty block, and the one fact that changes what a
 * person does before a session exists.
 *
 * PHASE 87 CUT THIS BLOCK FROM FIVE PARAGRAPHS TO ONE. Three of the four that
 * went said how often Tortie asks a machine for its list, how often it copies
 * what a session printed, and what it cannot yet tell you about a session that
 * is waiting for you. None of those things has happened yet on a sheet where
 * no session exists, so they belong on the surfaces where they do happen.
 *
 * The fourth said Tortie had not checked what is installed on the other
 * machine, and Phase 84 made that false. `remote-argv.ts` in
 * `src/main/machines` asks the machine itself where the named program lives
 * before anything is composed, and `noRemoteProgramRefusal` in
 * `src/main/machines/remote-copy.ts` refuses at the moment a person presses
 * Create, naming the program, the machine and how many folders were searched.
 * A false caveat is worse than a missing one, so that sentence was cut rather
 * than reworded, which is what Phase 84 did to `CREATE_DIR_HINT` above.
 *
 * What survives is the one thing a person cannot find out any other way before
 * they act, which is what happens to the conversation. The four names this
 * phase deleted are recorded in ../app/__tests__/create-copy.test.ts, which is also
 * what stops them coming back.
 *
 * PHASE 89 REWROTE IT. It said the conversation does not come back, and a
 * remote restore now brings it back for an agent whose conversation Tortie
 * recorded, which is seven of the thirteen. The sheet cannot promise it for the
 * agent in the picker, because the composer and the arming gate both answer at
 * restore time, so the sentence names the condition instead of the outcome.
 */
export const CREATE_HONESTY =
  'Tortie can start this session again on that machine, and it brings the ' +
  'conversation back only for an agent whose conversation it recorded.';

/** The honesty lines in the order the sheet draws them. */
export const CREATE_HONESTY_LINES: readonly string[] = [CREATE_HONESTY];

// ---------------------------------------------------------------------------
// Capture, on a session that runs on another machine (Phase 91)
// ---------------------------------------------------------------------------

/**
 * Under the Capture row, when the session will run on another machine.
 *
 * THE ROW STAYS AND IS DRAWN OFF. A row that vanishes teaches nothing, and a
 * person can reasonably read a missing checkbox as capture they turned off, as
 * capture that did not apply, or as capture that silently worked. This is the
 * same shape as `machineNotSignedInOption` in ./machine-choice.ts and as the
 * agent tile that cannot run.
 *
 * WHY IT EARNS A SENTENCE UNDER PHASE 87'S RULE. A caveat belongs on screen
 * when a person would otherwise be surprised at the moment they act. This
 * person is about to press Create. One sentence is right and a paragraph is
 * not.
 */
export function captureNotOnMachine(label: string): string {
  return `Tortie runs SpecStory on this Mac only, so a session on ${label} is not captured.`;
}
