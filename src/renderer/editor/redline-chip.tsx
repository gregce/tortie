/**
 * The change chip (Phase 236): the redline's controls, where a person looks.
 *
 * Phase 227 shipped four chords and NOTHING on the face said them. The
 * operator used the rewind for the first time on 2026-09-08 and said "feels
 * like the commands should be more visual in the interface itself actually".
 * A control nobody can find is not a control. This is the control, drawn on
 * the change the person is on.
 *
 * FOUR RULINGS FROM RESEARCH 83 D.2 AND D.3 SHAPE EVERY LINE HERE, and none of
 * them is re-opened:
 *
 *   - A control per change IN THE FLOW is refused. Eight inline buttons pushed
 *     the following text 45.12px sideways at every change, permanently and
 *     mid-sentence, which turns a sentence into a form.
 *   - A MARGIN gutter is refused. The free space left of the column is 0.00px
 *     at the editor pane's own floor (research 96 §4.1 re-measured it on the
 *     real view), and a margin marker addresses a LINE where a line holds up
 *     to five changes.
 *   - A hover or focus reveal, as an OUT OF FLOW overlay, is accepted: it
 *     moved the text by 0.00px and stayed out of the copy.
 *   - THE ONE MANDATORY RULE: anchor to `getClientRects()[0]`, NEVER to
 *     `getBoundingClientRect()`. Research 96 §4.5 drove it on the shipped view
 *     and it is WORSE than research 83 said: at the WIDE 871px pane a wrapped
 *     change's union rect sat 435.73px to the LEFT of where the change starts,
 *     so a chip on the bounding box points at empty margin at the pane a
 *     person actually works in.
 *
 * THE CHIP LIVES OUTSIDE `.ed-redline-doc`. Four readers walk that element —
 * ./redline-copy's clone, ./redline-shot-probe's `leavesOf`, and the two
 * projection tests' parsers — and each one would read a chip inside it as a
 * run. Mounted as the view's own child it is invisible to all four, and the
 * flat DOM the projection property is read from is unchanged. It carries
 * `data-redline-tag` as well, which is the attribute ./redline-copy removes
 * from its clone, so a chip that ever did end up inside a Range still cannot
 * put its glyphs on the clipboard.
 *
 * IT NEVER TAKES FOCUS, and that is not styling. Both `focusedChange` and
 * `moveFocus` in ./RedlineDocument read `document.activeElement`: a button
 * that took focus would make `focusedChange` answer null, so a press would do
 * nothing at all, and would make `moveFocus` compute `current === -1`, so an
 * arrow would jump to the FIRST change rather than the neighbour. So every
 * button is `tabIndex={-1}` and the chip cancels `mousedown`, and each button
 * FOCUSES THE CHANGE THE CHIP IS DRAWN FOR and then runs the same command the
 * chord and the Edit menu already run. Nothing new is wired to the write.
 *
 * 24px, per WCAG 2.2's target size: research 83 D.2 measured the in-flow
 * button at 20.15px and named it under the target.
 *
 * THE CHORDS ARE ON IT, AND THEY ARE READ FROM THE KEYMAP RATHER THAN TYPED.
 * `keyDisplay` answers ⌥↓, ⌥↑, ⌥⌫ and ⌥⇧⌫ from the four `redline.*` entries in
 * src/shared/keymap.ts, so a chord that is ever re-bound moves here with it and
 * cannot drift. They are drawn in `.key`, the keycap chip the ⌘/ overlay and
 * the popup menus already use, so a person learns the chord by seeing it once —
 * which is the whole reason this phase exists. The two arrows carry NO word
 * beside the keycap: the chord IS ⌥ plus the arrow, so a glyph and a hint would
 * be the same thing said twice, and the verb is on the button's aria-label and
 * its tooltip instead.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { keyDisplay } from '@shared/keymap';
import type { RedlineCommand } from './redline-commands';

/** The gap between the change's line box and the chip, in CSS pixels. */
const CHIP_GAP = 4;

/** What the chip is drawn at, in the view's own coordinates. */
export interface ChipPlace {
  left: number;
  top: number;
}

/**
 * The parts of a rectangle this module reads. Structural rather than `DOMRect`
 * so the rule below can be driven under node with the real numbers research 96
 * §4.3 measured, without a DOM.
 */
export interface ChipRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * THE MANDATORY RULE, IN ONE PLACE SO IT CAN BE ASKED.
 *
 * The chip's anchor is the change's FIRST client rect and never its bounding
 * box. Research 96 §4.5 drove both on the shipped view: at the wide 871px pane
 * change 12's first rect began at 1185.82 while its union began at 750.09, so
 * the bounding box is 435.73px to the LEFT of where the change actually
 * starts, and a chip anchored on it points at empty margin nearly half a column
 * away. It is worse at the wide pane than at the narrow one, because a wider
 * column means a longer wrap-back.
 *
 * `rects[0]` is the anchor POINT and not the change's extent: research 96 §4.5
 * measured ten of fifteen wide changes carrying two or three rects on ONE line
 * box, because a wrapper holding a `<del>` and an `<ins>` fragments its inline
 * box around them. So the chip is placed at where the change STARTS, which is
 * a question `rects[0]` answers exactly.
 */
export function chipAnchorRect(el: {
  getClientRects: () => ArrayLike<ChipRect>;
}): ChipRect | undefined {
  return el.getClientRects()[0];
}

/**
 * Where the chip goes, in the view's own coordinates: above the change's line
 * box when there is room and below it when there is not, clamped to the view.
 * The clamp is the chip's own because it lives OUTSIDE the scroller, so the
 * scroller neither scrolls it nor clips it (research 96 §1.4's two limits).
 */
export function chipPlace(
  rect: ChipRect,
  box: ChipRect,
  size: { width: number; height: number }
): ChipPlace {
  const above = rect.top - box.top - size.height - CHIP_GAP;
  const raw = above >= 0 ? above : rect.bottom - box.top + CHIP_GAP;
  return {
    left: Math.max(0, Math.min(rect.left - box.left, box.width - size.width)),
    top: Math.max(0, Math.min(raw, box.height - size.height))
  };
}

export interface RedlineChipProps {
  /**
   * The change the chip is drawn for: the element that has focus, or the one
   * under the pointer when nothing has focus. Null draws nothing at all, which
   * is the resting face.
   */
  anchor: HTMLElement | null;
  /**
   * The `.ed-redline-view` element. It is the only positioned box in the view
   * (research 96 §1.4), so it is the containing block a chip's `left` and
   * `top` are measured against.
   */
  view: HTMLElement | null;
  /**
   * Whether this TAB has a rewind to undo (./redline-journal).
   *
   * THE CHARTER SAID "when the journal holds an entry for THIS change", AND
   * THAT CONDITION CAN NEVER BE TRUE. A rewind writes the baseline's bytes back
   * at the change's offset, so the recomposed document draws NO change there:
   * the entry the journal holds names a place the picture no longer has a
   * wrapper for, and a chip gated on an offset match would never once offer
   * Undo. The shipping command is per tab too — ./redline-press takes
   * `lastRewind(tab.id)` and never looks at the focus — so gating on the change
   * would also have made the button lie about what it does. It is therefore the
   * tab's journal depth, and the button says "Undo the last rewind" so the
   * face claims exactly what the press performs.
   */
  canUndo: boolean;
  /** Run one command against the change the chip is drawn for. */
  onCommand: (command: RedlineCommand, anchor: HTMLElement) => void;
  /**
   * The chip's own element, held by the view so its pointer handler can tell
   * "the pointer moved onto the chip" from "the pointer left the change".
   */
  chipRef: React.RefObject<HTMLDivElement | null>;
  /**
   * The anchor is gone: the document was recomposed under the chip and the
   * element it was drawn for is no longer in the tree. The view forgets it.
   */
  onDetached: () => void;
}

export function RedlineChip({
  anchor,
  view,
  canUndo,
  onCommand,
  chipRef,
  onDetached
}: RedlineChipProps): React.JSX.Element | null {
  const [place, setPlace] = useState<ChipPlace | null>(null);
  // The place is computed after layout and re-computed on scroll and on
  // resize, because the chip is NOT inside the scrolling box: research 96
  // §1.4 named that limit and it is answered here rather than discovered in
  // an app run.
  const detached = useRef(onDetached);
  detached.current = onDetached;
  useLayoutEffect(() => {
    if (anchor === null || view === null) {
      setPlace(null);
      return;
    }
    const put = (): void => {
      // THE MANDATORY RULE, asked through `chipAnchorRect` so there is exactly
      // one place in the tree that decides it.
      const rect = chipAnchorRect(anchor);
      if (rect === undefined || !view.contains(anchor)) {
        detached.current();
        return;
      }
      const el = chipRef.current;
      setPlace(
        chipPlace(rect, view.getBoundingClientRect(), {
          width: el?.offsetWidth ?? 0,
          height: el?.offsetHeight ?? 0
        })
      );
    };
    put();
    const scroller = view.querySelector('.ed-redline-scroll');
    scroller?.addEventListener('scroll', put, { passive: true });
    window.addEventListener('resize', put);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(put);
    observer?.observe(view);
    return () => {
      scroller?.removeEventListener('scroll', put);
      window.removeEventListener('resize', put);
      observer?.disconnect();
    };
  }, [anchor, view, canUndo, chipRef]);

  const act = useCallback(
    (command: RedlineCommand): void => {
      if (anchor !== null) onCommand(command, anchor);
    },
    [anchor, onCommand]
  );

  if (anchor === null) return null;
  return (
    <div
      ref={chipRef}
      className="ed-redline-chip"
      // ./redline-copy removes every [data-redline-tag] from its clone, so
      // the chip's glyphs can never reach the clipboard (research 83 D.2
      // measured an untagged control reading "…is closed**rewind**. This…").
      data-redline-tag=""
      role="toolbar"
      aria-label="Change controls"
      style={{
        left: `${String(place?.left ?? 0)}px`,
        top: `${String(place?.top ?? 0)}px`,
        // Hidden for exactly one layout pass, while it is measured. A layout
        // effect runs before paint, so nothing is ever seen in the wrong place.
        visibility: place === null ? 'hidden' : 'visible'
      }}
      // The chip never takes focus: cancelling mousedown keeps
      // document.activeElement where it is, and each button then focuses the
      // change itself.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <button
        type="button"
        className="ed-redline-chip-button"
        tabIndex={-1}
        aria-label="Previous change"
        title="Previous change"
        onClick={() => {
          act('prev');
        }}
      >
        <span className="key">{keyDisplay('redline.prev')}</span>
      </button>
      <button
        type="button"
        className="ed-redline-chip-button"
        tabIndex={-1}
        aria-label="Next change"
        title="Next change"
        onClick={() => {
          act('next');
        }}
      >
        <span className="key">{keyDisplay('redline.next')}</span>
      </button>
      <button
        type="button"
        className="ed-redline-chip-button ed-redline-chip-verb"
        tabIndex={-1}
        title="Rewind this change"
        onClick={() => {
          act('rewind');
        }}
      >
        Rewind
        <span className="key">{keyDisplay('redline.rewind')}</span>
      </button>
      {canUndo ? (
        <button
          type="button"
          className="ed-redline-chip-button ed-redline-chip-verb"
          tabIndex={-1}
          title="Undo the last rewind"
          onClick={() => {
            act('undo');
          }}
        >
          Undo
          <span className="key">{keyDisplay('redline.undo')}</span>
        </button>
      ) : null}
    </div>
  );
}
