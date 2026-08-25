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

// ---------------------------------------------------------------------------
// PHASE 154 — the two readings the third and fourth meanings of a tree drag
// need. They live here for the same reason as the two above: a shared leaf is
// what stops the drag hook and the model hook importing each other.
// ---------------------------------------------------------------------------

/**
 * The row ELEMENT under an event, inside Pierre's shadow root.
 *
 * `rowFromEvent` answers what the row IS. This answers where it is, which is
 * what the drop affordance needs (its rectangle) and what a cancelled drag
 * needs (something to dispatch the library's own `dragend` on).
 */
export function rowElementFromEvent(event: Event): HTMLElement | null {
  for (const target of event.composedPath()) {
    if (!(target instanceof HTMLElement)) continue;
    if (target.dataset['itemPath'] !== undefined) return target;
  }
  return null;
}

/**
 * Is this gesture asking for the drag OUT, to Finder, rather than the two
 * meanings the tree already has?
 *
 * ── WHY A MODIFIER AT ALL, AND WHY IT HAD TO BE DECIDED HERE ──────────────
 * A native drag and an HTML drag cannot both come out of one gesture, and
 * neither can be converted into the other once it is running. At `dragstart`
 * nobody knows yet whether the pointer will end up over a pane, over a tree
 * row, or over Finder, so the choice has to be made from what is held at the
 * moment the drag begins. With nothing held, the two existing meanings are
 * byte for byte what they were, which is the property that matters most.
 *
 * ── WHY OPTION ────────────────────────────────────────────────────────────
 * Command is taken: it is the tree's own multi select, and Shift is its range
 * select, so either one would mean "drag out the thing I just added to the
 * selection". Option is macOS's own COPY modifier and a drag out is a copy,
 * so the key already says what happens. The library reads `altKey` in exactly
 * one place and it is a keyboard typeahead check, so nothing in the tree
 * loses a gesture to this.
 *
 * The other three modifiers must be UP. A drag out is a deliberate gesture
 * and Option with something else held is somebody aiming at a chord that does
 * not exist here.
 */
export function dragOutModifierHeld(event: {
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}): boolean {
  return event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;
}
