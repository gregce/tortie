/**
 * What the Explorer says about a folder on another machine, and what it says
 * when a person makes a folder or renames an entry there (Phase 102).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

// PHASE 230 TOOK `remoteTreeReadAt` OFF, the Explorer's name for the read-at
// clock that ./presentation.ts defined once for it and Source control. The
// record is on that file's header, and the Explorer reads again by itself now.

/** The folder named by the tab is not on that machine. */
export function remoteTreeMissingTitle(label: string): string {
  return `That folder is not on ${label}.`;
}

/** The second line, naming the exact path Tortie asked for. */
export function remoteTreeMissingBody(path: string): string {
  return `Tortie asked for ${path} and that machine says there is nothing there.`;
}

/** The path is there and it is a file. */
export function remoteTreeNotAFolder(path: string, label: string): string {
  return `${path} on ${label} is a file, not a folder.`;
}

/** That machine would not let Tortie read the folder. */
export function remoteTreeDenied(path: string, label: string): string {
  return `Tortie cannot read ${path} on ${label}.`;
}

/** The machine did not answer in time. */
export function remoteTreeUnreachable(label: string): string {
  return `${label} did not answer, so Tortie could not read that folder.`;
}

/** Tortie is not signed in to that machine in this run. */
export function remoteTreeNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it cannot read that folder.`;
}

/** The folder is there and it holds nothing. */
export function remoteTreeEmpty(label: string): string {
  return `That folder is empty on ${label}.`;
}

/**
 * The answer held more entries than one read carries.
 *
 * All three numbers are real. `shown` and `total` are the machine's own counts
 * and `max` is the cap Tortie asked under, so a person can see that the missing
 * rows exist rather than guessing that the folder is smaller than it is.
 */
export function remoteTreeTruncated(
  shown: number,
  total: number,
  max: number
): string {
  return (
    `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} files ` +
    `and folders. Tortie reads at most ${max.toLocaleString()} of them in ` +
    `one go.`
  );
}

/**
 * The same line on a machine a person has let Tortie save on.
 *
 * PHASE 102 REPLACED `remoteTreeCanSave`, which said Tortie can save under one
 * folder. Three verbs cross now rather than one, being New File, New Folder and
 * Rename, so the sentence says Tortie can change what is under that folder. The
 * second half names the one thing that is still absent, because a person who
 * reads the first half will look for Move to Trash next.
 *
 * PHASE 229 DELETED `remoteTreeReadOnly`, which said Tortie only reads files
 * on that machine. It named no way to change that and read as a permanent
 * limit, and it was the title of the disabled New file and New folder buttons
 * as well as the tree menu's last row. All three draw `remoteEntryWritesOff`
 * below now, which names the door, so a machine with no confirmed folder
 * draws one sentence everywhere and that sentence says what to do.
 */
export function remoteTreeCanWrite(root: string, label: string): string {
  return (
    `Tortie reads files on ${label} and can change what is under ${root}. ` +
    `It cannot move anything there to the Trash.`
  );
}

// -- making a folder and renaming an entry on a machine (Phase 102) ----------
// EIGHT SENTENCES FOR TWO VERBS. Both verbs answer with a status word from
// main, never with a sentence, and every sentence a person reads about them is
// written here. `remoteEntryWritesOff`, `remoteEntryOutsideRoot`,
// `remoteEntryExists` and `remoteEntryLostAnswer` are shared by both verbs,
// because the state each one names is the same state whichever verb reached it.

/**
 * The name is taken on that machine.
 *
 * `name` is the leaf a person typed, so the sentence names what they typed
 * rather than a whole path they did not. It is drawn for a New Folder onto a
 * name that is taken and for a Rename onto a name a different entry holds.
 */
export function remoteEntryExists(name: string, label: string): string {
  return `There is already something called ${name} in that folder on ${label}.`;
}

/**
 * The folder the new one was going inside is not there any more.
 *
 * A person reaches this from a tree that was read a minute ago, so the second
 * sentence names the one thing that fixes the reading.
 */
export function remoteParentGone(label: string): string {
  return `That folder is no longer on ${label}. Press Refresh to read it again.`;
}

/** The account Tortie signs in as cannot write in that folder. */
export function remoteWriteDenied(path: string, label: string): string {
  return `Tortie cannot write in ${path} on ${label}.`;
}

/** The entry a rename named is not on that machine any more. */
export function remoteEntryGone(name: string, label: string): string {
  return (
    `Tortie could not find ${name} on ${label}. Press Refresh to read that ` +
    `folder again.`
  );
}

/**
 * The end state is the one the person asked for and this call did not make it.
 *
 * It is an INFORMATION line rather than a refusal, because the machine holds
 * what they asked for. What it cannot tell them is whether this is a repeat of
 * Tortie's own move or somebody else's file already sitting at the destination
 * while the source was never there. Both leave the person looking at the end
 * state they asked for and the product does not pretend to know which happened.
 */
export function remoteRenameAlreadyDone(label: string): string {
  return `That rename has already gone through on ${label}.`;
}

/**
 * Nobody has let Tortie change anything on that machine, said BEFORE any
 * action, as the title of a control that is not pressable (Phase 229).
 *
 * It names the three steps to the one surface that turns saving on, because a
 * person who meets this has no other way to find it. It does NOT say that
 * nothing was changed, because nothing was attempted: this is the hover title
 * of the disabled New file and New folder buttons and the note on the short
 * tree menu, read before a press rather than after one. The Phase 229
 * verifier read that trailer on the disabled buttons and called it a sentence
 * about an action nobody had taken.
 */
export function remoteEntryWritesOffLabel(label: string): string {
  return (
    `Tortie cannot change anything on ${label}. Open Settings, then ` +
    `Machines, then ${label}, and let Tortie save files there.`
  );
}

/**
 * Nobody has let Tortie change anything on that machine, said AFTER an action
 * main refused.
 *
 * It is the label above with one more sentence, saying that nothing was
 * changed, which is true of every path that reaches it: main answers this
 * before it composes anything and before it sends anything. It is composed
 * from the label rather than written twice so the two cannot drift.
 */
export function remoteEntryWritesOff(label: string): string {
  return `${remoteEntryWritesOffLabel(label)} Nothing was changed.`;
}

/**
 * The path is outside the folder that person confirmed.
 *
 * Main decides this on this Mac, before anything is sent, so nothing was
 * changed on that machine and the sentence says so.
 */
export function remoteEntryOutsideRoot(root: string, label: string): string {
  return (
    `Tortie may only change what is under ${root} on ${label}, and that ` +
    `folder is outside it. Nothing was changed.`
  );
}

/**
 * The machine did not answer, and this never says nothing was changed.
 *
 * A killed connection was measured in Phase 101 completing the far side write,
 * so the honest sentence is that Tortie cannot tell. It names the one thing a
 * person can do, which is read that folder again.
 */
export function remoteEntryLostAnswer(label: string): string {
  return (
    `${label} did not answer, so Tortie cannot tell you whether that went ` +
    `through. Press Refresh to read that folder again.`
  );
}

/** Copy Path on a machine's file puts the machine in front of the path. */
export const REMOTE_COPIED_WITH_MACHINE =
  'Copied the path with the machine in front of it.';

/**
 * PHASE 154. A file dropped from Finder onto a folder that is on another
 * machine.
 *
 * IT IS REFUSED, AND THE REFUSAL IS VISIBLE, which is the whole point of this
 * sentence existing. Bringing a file in over ssh is an upload, and nothing
 * Tortie has can carry one: `machines:putFile` takes UTF-8 text, so binary is
 * impossible, and it is capped at 90,000 bytes because the payload rides
 * inside one argument of that machine's login shell. A real upload needs a
 * chunked transport with its own confirm story and its own answer for a
 * connection that dies mid write, and that is a phase of its own rather than a
 * corner of this one.
 *
 * So the surface says no rather than lighting up and doing nothing. It names
 * the machine, it says plainly that nothing was copied, and it says where the
 * file still is, because the person is holding it and needs to know they have
 * not lost it.
 */
export function remoteTreeNoImport(label: string): string {
  return (
    `Tortie cannot copy files onto ${label} yet. Nothing was copied, and ` +
    `that file is still where it was.`
  );
}
