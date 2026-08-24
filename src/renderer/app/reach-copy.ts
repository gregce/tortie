/**
 * Every sentence Tortie says when a person asks to be taken to a session
 * (Phase 93).
 *
 * WHY ONE MODULE. The ⌘J list and the menu bar sentinel both end at
 * `jumpToSession` in ./session-focus.ts, and before this phase that function
 * could finish having done nothing at all. A row whose folder had no tab set
 * the active session and left the person looking at the tab they were already
 * on. The fix is that the jump now always ends in one of three outcomes, and
 * two of them are a sentence. Those sentences live here so a test can read them
 * without rendering React, and so the vocabulary audit
 * (./__tests__/machine-vocabulary.test.ts) reads one file rather than a view.
 *
 * WHAT THESE SENTENCES MAY CLAIM. Each one says what Tortie did, then says what
 * it did not do. The second half matters more than the first: a person who asks
 * to be taken to a running agent and is refused needs to know the agent is
 * still running, because the refusal reads as an ending otherwise. No sentence
 * here ends a session, and no sentence here says one ended.
 *
 * THE PATH IS ALWAYS THE DISPLAY FORM. Every caller passes the string
 * `displayPath` produced, which is the same string the row draws. A person
 * compares the sentence against the row in front of them, so the two have to
 * be the same characters.
 *
 * WHAT IS NOT HERE. Every sentence about a machine is composed by
 * `addRemoteRefusal` in ../machines/project-tab.ts, which this phase does not rewrite.
 * {@link couldNotReachMachine} takes that sentence and adds the one clause it
 * does not carry.
 */

/**
 * The id had no row in the store at all.
 *
 * The menu bar sentinel can hold a row for a session that has since been
 * removed, so this is reachable. It says Tortie has no record rather than
 * saying the session is gone, because a record is the only thing Tortie
 * actually checked.
 */
export const NO_SUCH_SESSION = 'Tortie no longer has a record of that session.';

/**
 * The folder is on this Mac and there is nothing at that path any more.
 *
 * The second sentence is the whole point of the first. The folder went away and
 * the agent did not, so the person is told in the same breath that the thing
 * they were trying to reach is still there.
 */
export function folderGone(path: string): string {
  return (
    `Tortie could not open ${path} again, because there is no folder there ` +
    'now. The session is still running and Tortie did not end it.'
  );
}

/**
 * The folder is on this Mac and main refused for some other reason.
 *
 * Main's own message is printed after Tortie's, unchanged. Rewriting it here
 * would mean guessing which condition failed, and main is the only process that
 * knows.
 */
export function folderRefused(path: string, mainMessage: string): string {
  return `Tortie could not open ${path} again. ${mainMessage}`;
}

/**
 * The folder is on another machine and the open was refused.
 *
 * `sentence` is what `addRemoteRefusal` composed for main's reason word. This
 * adds the clause that every one of those seven sentences is missing, which is
 * that nothing was ended.
 */
export function couldNotReachMachine(sentence: string): string {
  return `${sentence} Tortie did not end the session.`;
}

/**
 * This build has no way to open a folder on a machine at all.
 *
 * PHASE 93 WROTE THIS ONE, and the spec's table does not list it. The store's
 * remote open is feature detected, so a build whose preload lacks it has to say
 * something. Saying nothing is what this phase exists to stop.
 */
export function cannotOpenOnMachine(label: string): string {
  return (
    `This copy of Tortie cannot open a folder on ${label}. The session is ` +
    'still running and Tortie did not end it.'
  );
}

/**
 * A tab appeared for a folder that never had one.
 *
 * IT IS SAID ONLY IN THAT CASE. A tab the person closed themselves comes back
 * with the session in front of them, and that is the answer to what they asked
 * for, so it gets no sentence. A tab for a folder that has never been a tab in
 * this window is a new thing on their screen that they did not ask for by name,
 * so it says why it is there.
 */
export function tabOpenedForSession(path: string, name: string): string {
  return (
    `Tortie opened ${path} as a tab, because '${name}' is running there and ` +
    'had no tab.'
  );
}
