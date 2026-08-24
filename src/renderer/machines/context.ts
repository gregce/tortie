/**
 * What the Context view says when the project it is following is on another
 * machine (Phase 90.1 and Phase 108).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

/**
 * WHY THIS PAIR LIVES HERE. The Context view draws one title and one body when
 * the active project is on another machine. Every other sentence this renderer
 * says about another machine is in this directory, and the vocabulary audit
 * reads this directory already. Putting the pair in the view file instead would
 * mean
 * adding a module of several hundred unrelated strings to that audit's list,
 * which is the reason already recorded there for two other files.
 *
 * WHAT IT MAY CLAIM. The pair says what is true, being that the folder is on a
 * named machine, and then says what Tortie does not do, being that it reads
 * only this Mac. Neither half implies a failure, because nothing failed. There
 * is no retry offered, because there is nothing to retry.
 *
 * PHASE 90.3 DELETED THE FILES PAIR. It said "Tortie reads files on this Mac
 * only, so nothing is listed here", and from that phase the Explorer lists that
 * machine's own rows, so the sentence had become false. The Explorer's states
 * are in ./explorer.ts.
 *
 * PHASE 98 DELETED THE SEARCH PAIR, for the same reason and in the same shape.
 * It said "Search does not reach Studio" and "Tortie searches files on this Mac
 * only", and from this phase the Search view searches that machine's own folder
 * and draws that machine's own rows, so both sentences had become false. What
 * the Search view says instead is in ./search.ts.
 *
 * PHASE 108 DELETED THE CONTEXT BODY, the same move again. It said "Tortie
 * reads skills, servers and hooks from this Mac only, so nothing is listed
 * here", and from this phase the Context view reads that machine's own files
 * and draws that machine's own rows, so the sentence had become false. The
 * title below stays, because the agent files do live on that machine in every
 * state the view can be in. What the Context view says instead is in the
 * Phase 108 block below.
 */

/** The Context view's title whenever the project is on another machine. */
export function contextElsewhereTitle(label: string): string {
  return `These agent files live on ${label}.`;
}

// ---------------------------------------------------------------------------
// The Context view for a project on another machine (Phase 108)
// ---------------------------------------------------------------------------

/**
 * WHAT THIS BLOCK REPLACES. Phase 90.1 gave the Context view one body sentence
 * saying that Tortie reads skills, servers and hooks from this Mac only.
 * Phase 108 reads them on the machine, so that sentence had become false and
 * it is deleted, which is the move Phase 98 made for the search pair. The
 * title stays in the Phase 90.1 block above, because the files do live on
 * that machine in every state the view can be in.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word, counts and the scan
 * for one read, and this file holds every sentence a person reads about it.
 * That is the shape every remote surface since Phase 90.2 uses, and it keeps
 * every sentence about a machine inside the one file the vocabulary audit
 * reads.
 *
 * WHAT THEY MAY CLAIM. A read on another machine is a read and nothing else.
 * So these sentences say the three limits out loud rather than leaving a gap
 * a person would misread:
 *   - installing, enabling and pinning work on this Mac only
 *   - skills kept in folders inside the project are not listed over there
 *   - a read the pass cap cut says that entries can be missing
 */

/** The one body `elsewhere` keeps. An older preload cannot ask a machine. */
export const CONTEXT_NO_BRIDGE =
  'This build cannot read agent files on another machine.';

/** While the machine is being read. It is a few calls and about a second. */
export function contextReadingOn(label: string): string {
  return `Reading what agents will load on ${label}…`;
}

/** Tortie is not signed in to that machine in this run. Nothing was asked. */
export function contextNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it read nothing.`;
}

/** The machine did not answer, or answered something this end cannot read. */
export function contextNoAnswer(label: string): string {
  return `${label} did not answer, so there is nothing to show.`;
}

/**
 * The machine answered and did not name its home folder.
 *
 * The one wrong answer this feature can produce is a scan of THIS Mac's home
 * drawn under that machine's name, which is what a silent fallback would do.
 * Main refuses instead, and this sentence says the refusal was deliberate.
 */
export function contextNoHome(label: string): string {
  return `${label} did not say where its home folder is, so Tortie read nothing rather than guess at paths.`;
}

/**
 * The first note line under the sections, whenever the scan came from a
 * machine. It says where the rows came from and where the verbs stayed.
 */
export function contextOnMachineLine(label: string): string {
  return `Tortie read these files on ${label}. Installing, enabling and pinning work on this Mac only.`;
}

/**
 * The second note line, always drawn with the first.
 *
 * The remote read runs with the nested project walk off, because that walk
 * costs up to three more passes over the link. A gap that is not named draws
 * as a whole list, so this line names it.
 */
export const CONTEXT_NESTED_NOT_LISTED =
  'Skills kept in folders inside this project are not listed when the project is on another machine.';

/**
 * The third note line, only when the pass cap ended the read with paths still
 * unread. A cut list must never draw as a whole one.
 */
export function contextCutLine(label: string): string {
  return `${label} holds more configuration than Tortie read this time, so some entries can be missing from this list.`;
}

/**
 * The empty state body on a remote tab, in place of the Find a skill button.
 * Install is refused over there permanently, so the sentence says where
 * adding happens instead of offering a control that could do nothing.
 */
export function contextEmptyOnMachine(label: string): string {
  return `Nothing is configured for these agents on ${label}. Adding a skill happens on that machine, or from an agent running there.`;
}

/**
 * The Refresh tooltip on a remote tab. The local sentence is about this Mac's
 * watcher, and no watcher runs on the machine, so the remote sentence says
 * what is true instead: nothing over there re-reads on its own.
 */
export function contextRefreshOnMachineTitle(label: string): string {
  return `Read the files on ${label} again. Tortie cannot see a change made on that machine until you press this.`;
}
