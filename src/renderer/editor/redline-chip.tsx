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
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RedlineCommand } from './redline-commands';

/** The gap between the change's line box and the chip, in CSS pixels. */
const CHIP_GAP = 4;

/** What the chip is drawn at, in the view's own coordinates. */
interface ChipPlace {
  left: number;
  top: number;
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
  /** Whether this tab has a rewind to undo (./redline-journal). */
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
      // THE MANDATORY RULE. The FIRST client rect, never the bounding box.
      const rect = anchor.getClientRects()[0];
      if (rect === undefined || !view.contains(anchor)) {
        detached.current();
        return;
      }
      const box = view.getBoundingClientRect();
      const el = chipRef.current;
      const w = el?.offsetWidth ?? 0;
      const h = el?.offsetHeight ?? 0;
      // Above the change's own line box when there is room, below it when
      // there is not. The chip is not clipped by the scroller either, so it
      // owns its own clamp to the view's box.
      const above = rect.top - box.top - h - CHIP_GAP;
      const raw = above >= 0 ? above : rect.bottom - box.top + CHIP_GAP;
      setPlace({
        left: Math.max(0, Math.min(rect.left - box.left, box.width - w)),
        top: Math.max(0, Math.min(raw, box.height - h))
      });
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
        ↑
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
        ↓
      </button>
      <button
        type="button"
        className="ed-redline-chip-button ed-redline-chip-verb"
        tabIndex={-1}
        onClick={() => {
          act('rewind');
        }}
      >
        Rewind
      </button>
      {canUndo ? (
        <button
          type="button"
          className="ed-redline-chip-button ed-redline-chip-verb"
          tabIndex={-1}
          onClick={() => {
            act('undo');
          }}
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}
