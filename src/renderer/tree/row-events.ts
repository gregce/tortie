/**
 * Two readings of one DOM event, shared by the tree's model, its gestures and
 * its drag half.
 *
 * They live apart from every hook because three of them ask the same two
 * questions, and a shared leaf is what stops those hooks importing each other.
 * Pierre draws its rows inside a shadow root, so both answers come from
 * `composedPath()` rather than from `target`.
 */

// ---------------------------------------------------------------------------
// Shadow-DOM row lookup (Pierre rows carry data-item-path / data-item-type)
// ---------------------------------------------------------------------------

export interface RowHit {
  /** Canonical Pierre path — root-relative, dirs end with '/'. */
  rel: string;
  type: 'file' | 'folder';
}

export function rowFromEvent(event: Event): RowHit | null {
  for (const target of event.composedPath()) {
    if (!(target instanceof HTMLElement)) continue;
    const rel = target.dataset['itemPath'];
    if (rel !== undefined) {
      return { rel, type: target.dataset['itemType'] === 'folder' ? 'folder' : 'file' };
    }
  }
  return null;
}

/**
 * True when the keystroke came out of a text field inside the tree — the
 * rename input or the filter field. Pierre passes unhandled keys straight
 * through from both, so without this ⌫ in a rename would delete the file
 * being renamed.
 */
export function fromTextField(event: Event): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
    );
}
