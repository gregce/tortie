/**
 * What the clipboard gets when a redline is in the selection (Phase 191).
 *
 * ## The defect this exists to fix, measured rather than feared
 *
 * A redline row holds both sides of the change in one element, so the
 * browser's own serializer walks straight through them and returns them
 * interleaved. Research 74 §5 measured it on a prototype row and the app run
 * for this phase measured it again on the shipped one: the demonstration row
 * draws
 *
 *   "The quick brownred fox jumpedleapt over the lazysleepy dog nearbeside
 *    the river bank."
 *
 * Both sides, verbatim. Shipping that is shipping a defect, which is why the
 * backlog entry makes this handler REQUIRED rather than optional.
 *
 * ## The decision
 *
 * THE CLIPBOARD RECEIVES THE NEW TEXT. Not the interleaved text, not the old
 * text, not nothing. The redline is a reading aid over a change that already
 * happened, and what a person pastes into a message, a commit body or a
 * document is the resulting sentence. The old text is one row away and copies
 * cleanly from Pierre's own deletion row, so nothing is lost.
 *
 * ## THE RULE, AND WHY IT IS NARROWER THAN THE PHASE FIRST WROTE
 *
 * The plan for this handler was to take `Selection.toString()` as the base,
 * being what the browser would have written, and edit the redline runs out of
 * it. THE APP RUN REFUTED THAT, and the measurement is worth keeping because
 * it is not obvious:
 *
 *   Selecting the whole diff surface and reading `Selection.toString()`
 *   returned the EMPTY STRING with the redline off, while the system
 *   clipboard, read in main after the window's own Copy command, received
 *   every line of the diff.
 *
 * @pierre/diffs draws its rows inside a shadow root. A `Range` is a light DOM
 * object and cannot see them; the clipboard serializer walks the flat tree and
 * can. So the base and the answer are two different strings, and editing the
 * first and writing it as the second DROPPED every one of Pierre's own rows.
 * That was a regression this handler introduced and the probe caught it, which
 * is exactly what an app run is for.
 *
 * So the rule is containment, and it is exact rather than clever:
 *
 *   THE HANDLER RUNS ONLY WHEN EVERY RANGE OF THE SELECTION LIES INSIDE ONE
 *   REDLINE ROW. Then the whole selection is light DOM this code owns, the
 *   clone is exact, and the answer is built rather than edited. Anything else
 *   is left to the browser untouched, so a copy of the diff is byte for byte
 *   what it was before this phase.
 *
 * That covers the gesture the feature is for: a click and drag inside the
 * marked-up sentence, a double click on a word in it, a triple click on the
 * row.
 *
 * WHAT IT DOES NOT COVER, MEASURED RATHER THAN SUMMARISED. A selection that
 * reaches past one redline row is left to the browser entirely, so EVERY
 * redline row in range is interleaved, not one, and the changed text arrives
 * once per Pierre row as well. Read off the real system clipboard on
 * 2026-09-01 for a selection running from the start of the first redline row
 * to the end of the second:
 *
 *   The teamcrew shipped the alphabeta build on MondayFriday morning.
 *   Spaced   out     words   here.
 *   Spaced out words here.
 *   Spaced out words here.
 *
 * being the first redline row interleaved, then Pierre's own deletion row,
 * then Pierre's own addition row, then the second redline row. So a two sided
 * block in range arrives three times, once as each of Pierre's rows and once
 * as the redline's reading of them. Before this phase it arrived twice, which
 * is what the diff has always put on the clipboard.
 *
 * That is the cost of the containment rule and it is deliberate: standing
 * aside is what keeps a copy of the diff itself byte for byte what it was.
 * The alternative is rebuilding a string this code cannot see, which is what
 * dropped every one of Pierre's rows the first time. Fixing it properly needs
 * the two sides to stop being two trees, which is a different phase.
 *
 * THE ONE WIDENING (Phase 197 item 21). Where the host holds exactly ONE
 * redline element, which is the redline view's whole document, there is
 * nothing of Pierre's to protect, so a range that reaches past it is clipped
 * to it and rebuilt rather than left to the browser. That is the Cmd-A shape
 * Phase 194 recorded as its known limit. A host holding several rows, the
 * diff view, keeps the rule above exactly as written.
 *
 * `user-select: none` on the deleted runs is REFUSED and the refusal is
 * recorded in ./redline.css, so a later round does not simplify to it.
 */

/** The redline row a selection boundary sits in, or null. */
function redlineOf(node: Node): HTMLElement | null {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return element === null
    ? null
    : element.closest<HTMLElement>('[data-redline]');
}

/**
 * The range cut down to the host's one redline document, or null when the
 * host is not that shape or the range does not reach the document at all.
 */
function clipToOnlyDocument(host: HTMLElement, range: Range): Range | null {
  const documents = host.querySelectorAll('[data-redline]');
  if (documents.length !== 1) return null;
  const only = documents[0] as HTMLElement;
  if (!range.intersectsNode(only)) return null;
  const bounds = only.ownerDocument.createRange();
  bounds.selectNodeContents(only);
  const clipped = range.cloneRange();
  if (clipped.compareBoundaryPoints(Range.START_TO_START, bounds) < 0) {
    clipped.setStart(only, 0);
  }
  if (clipped.compareBoundaryPoints(Range.END_TO_END, bounds) > 0) {
    clipped.setEnd(only, only.childNodes.length);
  }
  return clipped.collapsed ? null : clipped;
}

/**
 * The text to put on the clipboard, or null to leave the browser alone.
 *
 * Exported for the app run, which drives the real Copy command over the same
 * selections and compares the answer with what `clipboard.readText()` reports
 * in main.
 */
export function rebuildCopyText(
  host: HTMLElement,
  selection: Selection
): string | null {
  if (selection.rangeCount === 0) return null;
  const parts: string[] = [];
  for (let index = 0; index < selection.rangeCount; index++) {
    let range = selection.getRangeAt(index);
    if (range.collapsed) continue;
    const row = redlineOf(range.commonAncestorContainer);
    if (row === null || !host.contains(row)) {
      // One boundary outside a redline row means the selection covers
      // content this code cannot see. In the diff view that is Pierre's own
      // rows and the rule stands aside. In the redline VIEW (Phase 194) the
      // host holds ONE redline element for the whole document and nothing
      // else worth protecting, so a range reaching past it, being Cmd-A from
      // the Edit menu, is clipped to the document and rebuilt (Phase 197
      // item 21). At the parent that copy interleaved the deleted and the
      // inserted words plus the rest of the app's selectable text.
      const clipped = clipToOnlyDocument(host, range);
      if (clipped === null) return null;
      range = clipped;
    }
    const fragment = range.cloneContents();
    // The deleted words, and the tag on a whitespace-only row. The tag is
    // Tortie talking ABOUT the change rather than any part of it, so pasting
    // it into a message would be pasting the app's own commentary.
    for (const gone of Array.from(
      fragment.querySelectorAll('[data-redline-del], [data-redline-tag]')
    )) {
      gone.remove();
    }
    parts.push(fragment.textContent ?? '');
  }
  if (parts.length === 0) return null;
  // A selection wholly INSIDE a deleted run clones no `del` element, only its
  // text, so somebody who deliberately selected struck-through words gets
  // them. That is the right answer and it falls out of the clone.
  return parts.join('\n');
}

/**
 * The `copy` listener itself. Returns whether it took the event over, which is
 * what the app run reads back.
 */
export function handleRedlineCopy(
  host: HTMLElement,
  event: ClipboardEvent
): boolean {
  const selection = host.ownerDocument.getSelection();
  if (selection === null || selection.isCollapsed) return false;
  const text = rebuildCopyText(host, selection);
  if (text === null) return false;
  // `text/plain` only. `text/html` would open a sanitisation question for no
  // gain, and nothing that pastes a redline wants markup.
  event.clipboardData?.setData('text/plain', text);
  event.preventDefault();
  return true;
}
