/**
 * Phase 86 item 1 and item 2 — which press selects a split leaf.
 *
 * The split surface selected a leaf on `pointerdown`, anywhere inside it. That
 * same press starts a header drag, so the leaf about to be dragged out of the
 * split became the active session before the drag had moved a pixel, and the
 * "keep me looking at the split" preference had nothing left to decline.
 *
 * These cases hold the rule the surface now follows. A press in the leaf's
 * body selects at once. A press anywhere inside the header does not, and the
 * header's own click handler selects instead.
 */

import { describe, expect, it } from 'vitest';
import {
  SPLIT_HEADER_SELECTOR,
  pressSelectsLeafNow
} from '../leaf-press';

/** A stand-in for an element, answering `closest` from a list of ancestors. */
function target(...ancestors: string[]): EventTarget {
  return {
    closest: (sel: string) => (ancestors.includes(sel) ? {} : null)
  } as unknown as EventTarget;
}

describe('pressSelectsLeafNow', () => {
  it('selects at once for a press in the leaf body', () => {
    expect(pressSelectsLeafNow(target('.split-pane-body'))).toBe(true);
  });

  it('defers for a press on the header itself', () => {
    expect(pressSelectsLeafNow(target(SPLIT_HEADER_SELECTOR))).toBe(false);
  });

  it('defers for a press on anything inside the header', () => {
    expect(
      pressSelectsLeafNow(target(SPLIT_HEADER_SELECTOR, 'button'))
    ).toBe(false);
  });

  it('selects at once when there is no element to ask', () => {
    expect(pressSelectsLeafNow(null)).toBe(true);
    expect(pressSelectsLeafNow({} as EventTarget)).toBe(true);
  });

  it('names the header by the class the surface renders', () => {
    expect(SPLIT_HEADER_SELECTOR).toBe('.split-header');
  });
});
