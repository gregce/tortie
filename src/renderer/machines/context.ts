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
 * Until Phase 228 these sentences said three limits out loud under the rows;
 * since Phase 228 only the one that names a CUT list is drawn, and only when
 * the read was cut, because the other two were standing prose a local tab
 * does not carry.
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
 * PHASE 228 DELETED TWO NOTE LINES HERE. Phase 108 drew three under the
 * sections whenever the scan came from a machine: one saying the files were
 * read on that machine and that installing, enabling and pinning work on this
 * Mac only, one saying skills kept in folders inside the project are not
 * listed over there, and the cut line below. The first two were standing
 * prose a local tab does not carry, so they came off on the operator's rule
 * of 2026-09-07. The verbs they named are not built into the row menus on a
 * remote tab (./../context/menus.ts), which is an absent verb drawn as
 * absent, and the nested walk it does not run is a section that is not
 * there. The cut line stays, because a cut list drawn as a whole one is the
 * Phase 99 defect and a local list is never cut.
 */

/**
 * The one note line under the sections, only when the pass cap ended the
 * read with paths still unread. A cut list must never draw as a whole one.
 */
export function contextCutLine(label: string): string {
  return `${label} holds more configuration than Tortie read this time, so some entries can be missing from this list.`;
}

/*
 * PHASE 228 DELETED THE REMOTE EMPTY BODY TOO. Phase 108 drew a sentence of
 * its own in the empty state on a machine, in place of the Find a skill
 * button, saying where adding happens. The empty state on a machine now
 * draws the same body as on this Mac, and the button is simply not drawn.
 */

/*
 * PHASE 230 FIX ROUND DELETED THE REMOTE REFRESH TITLE. Phase 108 gave the
 * Refresh control on a machine a two sentence hover, being "Read the files on
 * X again. Tortie cannot see a change made on that machine until you press
 * this." The second sentence was true when it was written and is not true
 * now: a remote view reads again when it is looked at, when the window comes
 * back and after Tortie's own write, at the moments ./use-remote-reread.ts
 * names. Phase 228 recorded the 21 words for the next round and the Phase
 * 230 verifier read them still on the face. The control's hover on a machine
 * is now its own label and nothing more, drawn in
 * ../context/ContextHeader.tsx; the local hover is unchanged, because it is
 * about this Mac's watcher and this phase changes no local view.
 * ./__tests__/p228-off-the-face.test.ts pins the name and the words off.
 */
