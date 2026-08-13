/**
 * The `context:<id>` detail tab host — the seam between the Context view and the
 * editor panel, closed at integration.
 *
 * ## What it does, in one sentence
 *
 * It subscribes to the open-context request the view emits and turns it into an
 * ordinary open-file request with the entry attached, so the editor opens the
 * artifact's own file and the panel draws the header card over it.
 *
 * ## Why it is not a new tab kind
 *
 * The detail surface is a card above the artifact's own content. That content is
 * a file on disk, and for a skill it is a `SKILL.md` the markdown preview has
 * rendered since Phase 5. A second tab kind would have needed its own loader,
 * its own identity rule, its own close and preview semantics and its own error
 * state, and every one of those would have been written to end up behaving
 * exactly like a file tab. So the tab IS a file tab, keyed `context:<entry id>`
 * so it never collides with the same file opened from the tree, carrying the
 * entry as one field. `ContextDetail` receives the file's rendered body through
 * its `renderBody` slot, which is what that slot was built for.
 *
 * ## Registration is what flips the fallback
 *
 * `open-detail.ts` opens the defining file directly while no host is registered,
 * which is the honest majority of the detail tab and needs nothing new. Calling
 * `installContextDetailHost` once at app start registers this one, `hasDetailHost`
 * flips, and the card starts appearing. Nothing in `src/renderer/context/**`
 * changed to make that happen.
 */

import { onOpenContext, openFileAt } from './open-detail';

/**
 * Route context detail opens into the editor. Returns the unsubscribe, so a
 * hot reload or a test can take it back down.
 */
export function installContextDetailHost(): () => void {
  return onOpenContext(({ entry, repoPath, preview }) => {
    // `openFileAt` rather than `requestOpenFile`, so the rule about which paths
    // are relative is written once for this directory. Most configuration lives
    // OUTSIDE the project: `~/.claude/skills/…` is the common case here, not the
    // edge one.
    openFileAt(entry.sourcePath, repoPath, {
      preview,
      contextEntry: entry,
      // A broken row lands on the line the reader could not parse, rather than
      // on line 1 of a file the user then has to search.
      ...(entry.problem?.line != null ? { line: entry.problem.line } : {})
    });
  });
}
