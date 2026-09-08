/**
 * Where a caret is, in the one coordinate that survives a recompose
 * (Phase 237).
 *
 * The drawn document is a flat list of runs. A `<del>` carries
 * `contenteditable="false"`, so it is an atomic island the caret steps over in
 * ONE press (research 83 D.2, re-derived on the Phase 227 markup in research
 * 97 §2.4: one arrow moved the drawn offset from 75 to 79 across the whole of
 * a deletion while the current-side offset did not move at all). Every other
 * character of the document is a character of the CURRENT SIDE, being the file
 * as it stands, and this module is the map between the two.
 *
 * It is the DOM half of ./redline-typing, which holds the arithmetic. Nothing
 * here decides anything: it reads a selection into two numbers and puts two
 * numbers back into a selection, so the rules stay in one pure file the gate
 * can ablate. It names no bridge and writes nothing.
 *
 * WHY THE OFFSETS AND NOT THE NODES. Research 97 §2.3 read what a rebuild
 * alone leaves behind: `anchorNode` the document element itself at offset
 * zero, being 227 to 474 characters of error depending on where the person
 * was, and a caret that no longer names a place in the document at all. A
 * node is not a place after the run list is recomposed; an offset into the
 * current side is.
 */

import type { CurrentSelection } from './redline-typing';

/** A deletion is not part of the current side, and neither is anything in one. */
function inDeletion(node: Node, root: Element): boolean {
  let at: Node | null = node;
  while (at !== null && at !== root) {
    if (at instanceof Element && at.hasAttribute('data-redline-del')) return true;
    at = at.parentNode;
  }
  return false;
}

/** Every text node of the CURRENT side, in order. */
function currentTextNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text;
    if (!inDeletion(text, root)) out.push(text);
  }
  return out;
}

/**
 * The current-side offset of one DOM position. A position inside a deletion
 * answers the offset where that deletion begins, which is the island's own
 * rule rather than a rounding: a deletion occupies no space on this side.
 */
export function currentOffsetAt(root: Element, node: Node, offset: number): number {
  const at = root.ownerDocument.createRange();
  try {
    at.setStart(node, offset);
  } catch {
    return 0;
  }
  at.collapse(true);
  let total = 0;
  for (const text of currentTextNodes(root)) {
    const end = at.comparePoint(text, text.length);
    if (end < 0) {
      total += text.length;
      continue;
    }
    if (end === 0) return total + text.length;
    if (at.comparePoint(text, 0) > 0) return total;
    return total + (at.startContainer === text ? at.startOffset : 0);
  }
  return total;
}

/** The DOM position for a current-side offset, clamped to the document. */
export function positionAtCurrentOffset(
  root: Element,
  offset: number
): { node: Node; offset: number } {
  const nodes = currentTextNodes(root);
  let total = 0;
  for (const text of nodes) {
    if (offset <= total + text.length) return { node: text, offset: offset - total };
    total += text.length;
  }
  const last = nodes[nodes.length - 1];
  return last === undefined ? { node: root, offset: 0 } : { node: last, offset: last.length };
}

/** The selection as two current-side offsets, or null when it is not in here. */
export function readCurrentSelection(root: Element): CurrentSelection | null {
  const selection = root.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0) return null;
  const { anchorNode, focusNode, anchorOffset, focusOffset } = selection;
  if (anchorNode === null || focusNode === null) return null;
  if (!root.contains(anchorNode) || !root.contains(focusNode)) return null;
  return {
    anchor: currentOffsetAt(root, anchorNode, anchorOffset),
    focus: currentOffsetAt(root, focusNode, focusOffset)
  };
}

/** Put the selection back at two current-side offsets. */
export function restoreCurrentSelection(root: Element, want: CurrentSelection): void {
  const selection = root.ownerDocument.getSelection();
  if (selection === null) return;
  const anchor = positionAtCurrentOffset(root, want.anchor);
  const focus = positionAtCurrentOffset(root, want.focus);
  try {
    selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
  } catch {
    /* the document was rebuilt out from under the offsets; leave it alone */
  }
}

/**
 * The change wrapper the caret is in, or null.
 *
 * PHASE 236's rule is that focus wins over the pointer, because ⌥⌫ acts on
 * `document.activeElement` and a chip drawn somewhere else would name a change
 * the keys do not act on. A caret is the same claim: with the document
 * editable the person's attention is where the caret is, so this is what the
 * view offers the chip and what a press falls back to when no wrapper holds
 * the focus itself.
 */
export function changeAtCaret(root: Element): HTMLElement | null {
  const selection = root.ownerDocument.getSelection();
  const node = selection?.focusNode ?? null;
  if (node === null || !root.contains(node)) return null;
  const el = node instanceof Element ? node : node.parentElement;
  return el?.closest<HTMLElement>('.ed-redline-change') ?? null;
}

/** The span a cancelled `beforeinput` names, in current-side offsets. */
export function spanOfInput(root: Element, event: InputEvent): CurrentSelection | null {
  const ranges = typeof event.getTargetRanges === 'function' ? event.getTargetRanges() : [];
  const first = ranges[0];
  if (first !== undefined) {
    return {
      anchor: currentOffsetAt(root, first.startContainer, first.startOffset),
      focus: currentOffsetAt(root, first.endContainer, first.endOffset)
    };
  }
  return readCurrentSelection(root);
}

/**
 * The plain text an input event carries. A rich paste is taken as
 * `text/plain`, which is the flattening `contenteditable="plaintext-only"`
 * does anyway (research 83 D.2) said out loud rather than relied upon.
 */
export function textOfInput(event: InputEvent): string | null {
  const transfer = event.dataTransfer;
  if (transfer !== null && transfer !== undefined) return transfer.getData('text/plain');
  return event.data;
}
