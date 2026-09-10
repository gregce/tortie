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
 * IT NEVER TAKES FOCUS, and that is not styling. `focusedChange` in
 * ./RedlineDocument reads `document.activeElement`, so a button that took
 * focus would make it answer null and a press would do nothing at all. So
 * every button is `tabIndex={-1}` and the chip cancels `mousedown`, and each
 * button MAKES THE CHANGE THE CHIP IS DRAWN FOR THE CURRENT ONE and then runs
 * the same command the chord and the Edit menu already run. Nothing new is
 * wired to the write.
 *
 * PHASE 239 MOVED WHAT THE CHIP IS ANCHORED TO AND NOT WHERE IT SITS. It was
 * anchored on `document.activeElement`'s wrapper, which research 99 section
 * 2.3 measured being destroyed by every recompose; it is now anchored on the
 * element wearing `data-current`, which the render puts back. The placement
 * rule below, being the change's FIRST client rect, is untouched.
 *
 * AND ITS COMMITTER'S ROUND GAVE THE PLACEMENT A TOKEN TO FOLLOW, because
 * persisting is not the same as following. A write that MERGES into a change
 * keeps the change count, so React reuses the wrapper, the anchor prop is the
 * same object, this component re-renders nothing and the chip stayed at the
 * pixel the old layout put it at while the document reflowed 21.44px beneath
 * it. The `placement` prop is the view's answer and it is in the dependency
 * list below; ./redline-current `chipNeedsMeasure` carries the measurement.
 *
 * PHASE 239 TOOK UNDO OFF THIS CHIP, AND IT IS PHASE 236'S OWN RECORDED
 * FINDING CLOSED. The chip's Undo means the last rewind IN THE TAB, never the
 * change it sits beside, and research 99 section 7.1 drove it rather than
 * reasoning about it: `keeps`→`holds` was rewound, the chip was then opened on
 * `changes`→`changed` eight paragraphs away, its Undo was clicked, and the
 * file came back to the agent's version byte for byte — `holds` restored,
 * `changed` untouched. The button a person pressed beside one phrase acted on
 * another, and the only place the truth was written was its `title`, which a
 * pointer user reaches last and a keyboard user never.
 *
 * The three answers were priced in section 7.3 and the third is the one that
 * shipped. LABELLING IT IN PLACE costs the chip its home: relabelling the
 * shipping button measured 299.07px, 321.04px and 341.15px against 260.80px
 * today, and the right margin holds 200.09px at a 900px pane and 100.09px at
 * 700px, so a chip that says what it does cannot sit beside the column at any
 * pane width. DRAWING IT ONLY ON THE CHANGE THE JOURNAL NAMES is impossible,
 * because a rewind writes the baseline's bytes back and the change stops being
 * a change — confirmed at ten changes becoming nine. So it MOVED, to the note
 * row where the sentence that already tells the truth already is:
 * `Undo the last rewind with ⌥⇧⌫. It lasts for this session.` Nothing new is
 * drawn, the chip stays at 171.60px, which is the only width that fits the
 * pane the operator works in, and the chip now means one thing: it is the
 * CHANGE's toolbar, and undo of a rewind is the TAB's.
 *
 * PHASE 251 GAVE THE CHIP A SECOND HOME, AND THE FIRST ONE IS REQUIRED
 * RATHER THAN A FALLBACK. Research 114 §6.4 is the spec and the operator
 * chose it on 2026-09-09 by picking the mock: the document now sits in a
 * two-track page, `[rail] [column]`, and where the free canvas beside that
 * page holds this chip the chip goes there and covers no prose at all.
 * Research 113 §4 measured what it covers today, being one drawn row of his
 * text at the pane he works in and two at the other two, every time it is
 * shown.
 *
 * ONE DECISION, ASKED WITH ONE NUMBER, AND THE NUMBER IS THE CHIP'S OWN DRAWN
 * WIDTH. The first version of the design gated the band on a `data-room`
 * ladder at 1060px while the placement itself asked whether a 264px track was
 * at least 200px wide: one decision taken with two numbers, neither derived,
 * and a 264px cliff on one pixel of drag. `chipPlace` below asks the only
 * question that matters — does the canvas beside the page hold this chip where
 * this chip would be put — of the width the chip really drew, so A RE-LABELLED
 * BUTTON MOVES THE ANSWER BY ITSELF. Research 114 §9 records that the mock's
 * chip is 223.1px and the product's is 258.28px, which is why nothing here may
 * ever be a constant.
 *
 * THE OVERLAY ARM IS NOT A FALLBACK ANYBODY MAY DELETE. Research 96 §4.1 and
 * research 113 §7.3 each measured 0.00px of free canvas left of the column at
 * the editor panel's own floor, and research 113 re-measured exactly 0.00px at
 * 319px. A margin is not a home the chip can always have, so where the canvas
 * does not hold it the chip falls back to EXACTLY the placement Phase 236
 * shipped — above the change's first line box when there is room and below it
 * when there is not — and research 114 §5.7 refuses a margin as the only home
 * in those words.
 *
 * THE CHIP IS A CHILD OF THE PAGE IN BOTH ARMS, AND THAT IS WHY THE SCROLL
 * LISTENER IS GONE. `.ed-redline-view` stops being the only positioned box in
 * the view: `.ed-redline-page` is `position: relative` and is the containing
 * block a chip's `left` and `top` are measured against, in the band arm and in
 * the overlay arm alike. The page is inside `.ed-redline-scroll`, so the chip
 * scrolls with the document it belongs to and nothing has to put it back on
 * every scroll event; research 96 §1.4 named that listener as the price of
 * living outside the scroller and this phase stops paying it. An earlier
 * version of the design claimed the same saving while appending the overlay
 * arm to the pane, where the listener is still required, and that is why the
 * word BOTH is in this paragraph.
 *
 * THE FACT ABOVE IS STATED IN THREE FILES AND THEY MOVE TOGETHER: here,
 * ./RedlineDocument, which renders this component as a child of the page
 * element and hands it that element, and ./redline.css, which is what makes
 * the page a containing block at all. Take the `position: relative` off
 * `.ed-redline-page` and every placement here silently becomes a placement
 * against the nearest positioned ancestor, which is the view, and the band arm
 * lands the chip in the wrong pane.
 *
 * IT IS STILL OUTSIDE `.ed-redline-doc`. The page holds the rail, the document
 * and this chip as three separate children, so the four readers named above
 * still walk a document with nothing of Tortie's own in it.
 *
 * EVERY ONE OF PHASE 236'S FOUR RULINGS STANDS. `chipAnchorRect` is untouched
 * and is still `getClientRects()[0]`. A control in the flow is still refused.
 * A chip that takes focus is still refused. What moved is the BOX the chip is
 * placed in, and nothing else.
 *
 * 24px, per WCAG 2.2's target size: research 83 D.2 measured the in-flow
 * button at 20.15px and named it under the target.
 *
 * THE CHORDS ARE ON IT, AND THEY ARE READ FROM THE KEYMAP RATHER THAN TYPED.
 * `keyDisplay` answers ⌥↓, ⌥↑, ⌥⌫, ⌥⇧⌫ and, since Phase 238, ⌥↩ from the
 * `redline.*` entries in
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

/**
 * The gutter between the page's right edge and a chip drawn in the free canvas
 * beside it, in CSS pixels.
 *
 * IT IS NOT A SECOND THRESHOLD, and the distinction is the whole of the
 * paragraph in this file's header about one number. The band arm asks whether
 * the canvas holds `the chip's own drawn width + this gutter`, and then puts
 * the chip at `the page's width + this gutter`. The test and the placement are
 * the same arithmetic, so what the arm really asks is "does the chip fit where
 * the chip is about to go", which is one question about one measured number
 * rather than a breakpoint standing in for it.
 */
const CHIP_BAND_GUTTER = 16;

/**
 * Which of the two placements the chip took.
 *
 *   - `band`: the free canvas beside the page held it, so it covers no prose.
 *   - `overlay`: exactly Phase 236's placement, over the document. REQUIRED,
 *     because research 113 §7.3 re-measured 0.00px of free canvas at the
 *     editor panel's floor.
 */
export type ChipArm = 'band' | 'overlay';

/** What the chip is drawn at, in the PAGE's own coordinates (both arms). */
export interface ChipPlace {
  left: number;
  top: number;
  arm: ChipArm;
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
 * Where the chip goes, in the PAGE's own coordinates, and which arm it took.
 *
 * PHASE 251. Two arms, one question between them, asked of the chip's own
 * drawn `size.width`:
 *
 *   - THE BAND. The free canvas between the page's right edge and the
 *     scroller's holds the chip and the gutter it is placed at, so the chip
 *     goes there, level with the change's first line box, and covers no prose.
 *     Research 114 §2 measured that at 0 rows of prose covered against today's
 *     1 at the pane he works in.
 *   - THE OVERLAY. It does not, so the chip takes EXACTLY Phase 236's
 *     placement: above the change's first line box when there is room and
 *     below it when there is not. This arm is required rather than a
 *     fallback — research 113 §7.3 re-measured 0.00px of free canvas at the
 *     editor panel's own floor — and deleting it leaves the controls with
 *     nowhere to be at 319px.
 *
 * WHY THE SCROLLER AND NOT THE VIEW IS THE BOX THE BAND IS MEASURED IN. The
 * chip is a child of the page, and the page is inside `.ed-redline-scroll`, so
 * the scroller is what would have to scroll sideways to reach a chip that did
 * not fit. The view is up to a scrollbar's width wider — research 113 §0 read
 * 1349px of panel against 1339px of scroller — and asking the wider box would
 * put the chip's last ten pixels behind a horizontal scrollbar the redline has
 * never had.
 *
 * `scroll` IS THE SCROLLER'S CONTENT BOX AND NEVER ITS BORDER BOX, and THE FIX
 * ROUND IS WHY THAT SENTENCE IS HERE. The paragraph above says the view is the
 * wrong box because it is a scrollbar wider; the scroller's own
 * `getBoundingClientRect()` is a scrollbar wider than the scroller's content
 * box for exactly the same reason, and the first version of this phase handed
 * that in. The page is centred in the CONTENT box, so the band came out ten
 * pixels too generous, and the app really drew what the paragraph above says it
 * must never draw: at a 1308px panel the chip's right edge sat 9.7px past the
 * content box and `.ed-redline-scroll` grew a horizontal scrollbar. THE BAND
 * ARM IS THE ONE PLACEMENT IN THIS VIEW THAT IS DELIBERATELY OUTSIDE THE PAGE,
 * at `page.width + CHIP_BAND_GUTTER`, so it is the one placement that CAN grow
 * the scroller's scrollable area, and the width it is judged against is the
 * only thing standing between it and doing so. The caller in `RedlineChip`
 * below hands `clientWidth`, and it is the box every model of this decision
 * already uses.
 *
 * THE TOP IS CLAMPED INSIDE THE PAGE IN BOTH ARMS. The band arm cannot bite
 * today — `.ed-redline-doc`'s trailing padding is 48px against a 30px chip — but
 * the two arms saying different things about the same edge is how the wrong one
 * gets copied, which is the lesson of the paragraph above it.
 */
export function chipPlace(
  rect: ChipRect,
  page: ChipRect,
  scroll: ChipRect,
  size: { width: number; height: number }
): ChipPlace {
  const band = scroll.left + scroll.width - (page.left + page.width);
  if (band >= size.width + CHIP_BAND_GUTTER) {
    return {
      left: page.width + CHIP_BAND_GUTTER,
      top: Math.max(0, Math.min(rect.top - page.top, page.height - size.height)),
      arm: 'band'
    };
  }
  const above = rect.top - page.top - size.height - CHIP_GAP;
  const raw = above >= 0 ? above : rect.bottom - page.top + CHIP_GAP;
  return {
    left: Math.max(0, Math.min(rect.left - page.left, page.width - size.width)),
    top: Math.max(0, Math.min(raw, page.height - size.height)),
    arm: 'overlay'
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
   * The `.ed-redline-page` element: the two-track page holding the rail and
   * the document. PHASE 251 made it `position: relative`, so it and not
   * `.ed-redline-view` is the containing block a chip's `left` and `top` are
   * measured against, in BOTH arms. ./RedlineDocument renders this component
   * as its child, so the chip scrolls with the document and needs no scroll
   * listener; ./redline.css is what makes it a containing block. The three
   * files move together and each says so.
   */
  page: HTMLElement | null;
  /**
   * The `.ed-redline-scroll` element. It is the box a chip has to fit inside,
   * so it is the box the free canvas beside the page is measured in — see
   * `chipPlace` for why the view's own box is the wrong one to ask.
   */
  scroll: HTMLElement | null;
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
  /**
   * PHASE 239'S COMMITTER'S ROUND. The view's placement token, which moves
   * when the wrapper this chip is anchored on SURVIVED a recompose. The
   * anchor prop cannot answer that on its own: a reused DOM node is the same
   * object, React bails, and the placement below would never run again while
   * the document reflowed underneath it — measured at 25.44px, a whole line
   * above the change the chip names. ./redline-current `chipNeedsMeasure` is
   * the rule that moves it and carries the numbers.
   *
   * It is bumped from the view's OWN layout effect, which runs after this
   * component's, so by the time the token arrives the anchor beside it is the
   * element that is really in the tree. Nothing here ever measures a stale one.
   */
  placement: number;
}

export function RedlineChip({
  anchor,
  page,
  scroll,
  onCommand,
  chipRef,
  onDetached,
  placement
}: RedlineChipProps): React.JSX.Element | null {
  const [place, setPlace] = useState<ChipPlace | null>(null);
  // The place is computed after layout and re-computed on resize. PHASE 251
  // TOOK THE SCROLL LISTENER OUT, and that is a consequence rather than a
  // trim: the chip is a child of the page now, so it scrolls with the
  // document and there is nothing left for a scroll event to put back.
  // Research 96 §1.4 named the listener as the price of living outside the
  // scroller, and the price is no longer being paid.
  const detached = useRef(onDetached);
  detached.current = onDetached;
  useLayoutEffect(() => {
    if (anchor === null || page === null || scroll === null) {
      setPlace(null);
      return;
    }
    const put = (): void => {
      // THE MANDATORY RULE, asked through `chipAnchorRect` so there is exactly
      // one place in the tree that decides it.
      const rect = chipAnchorRect(anchor);
      if (rect === undefined || !page.contains(anchor)) {
        detached.current();
        return;
      }
      // THE CHIP'S OWN DRAWN WIDTH, read off the box it really drew and not
      // rounded: `offsetWidth` answers a whole number, and research 114 §9
      // publishes 258.28px against the mock's 223.1px precisely because a
      // fraction of a pixel is the difference between the two designs' answers
      // at the same pane.
      const own = chipRef.current?.getBoundingClientRect();
      // THE SCROLLER'S CONTENT BOX, AND THE FIX ROUND IS WHY THIS LINE IS NOT
      // A BARE `getBoundingClientRect()`. That call answers the BORDER box,
      // which on a scrolling element INCLUDES the vertical scrollbar — 10px on
      // this machine — while the page is centred inside the CONTENT box. So the
      // band read ten pixels wider than it is, and `chipPlace` accepted a chip
      // that then hung past the content box by up to that much: measured in the
      // running app at a 1308px panel, the chip's right edge sat 9.7px past the
      // content box and `.ed-redline-scroll` grew a horizontal scrollbar of its
      // own, appearing and disappearing as the pointer moved onto and off a
      // change. `clientWidth` is the same number the view already reads one
      // effect away for `--redline-gutter`, and it is the number every model of
      // this decision uses — build/redline-chip-probe.mts, the unit test and
      // both design documents — so this is the code coming to the model rather
      // than the other way round.
      const box = scroll.getBoundingClientRect();
      setPlace(
        chipPlace(
          rect,
          page.getBoundingClientRect(),
          {
            left: box.left,
            top: box.top,
            bottom: box.bottom,
            width: scroll.clientWidth,
            height: box.height
          },
          { width: own?.width ?? 0, height: own?.height ?? 0 }
        )
      );
    };
    put();
    window.addEventListener('resize', put);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(put);
    // BOTH boxes are observed: the scroller is what the pane's divider
    // narrows, and the page is what the measure and the rail widen. Either
    // moving moves the band, and the band is the whole decision.
    observer?.observe(page);
    observer?.observe(scroll);
    return () => {
      window.removeEventListener('resize', put);
      observer?.disconnect();
    };
  }, [anchor, page, scroll, chipRef, placement]);

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
      // PHASE 251. Which arm the placement took, so `npm run probe:p249` reads
      // it OFF THE FACE rather than inferring it from a number: a chip placed
      // perfectly in the band covers 0 rows of prose and so does a chip that
      // was never drawn, so the two readings that matter most are the same
      // number without this. NO STYLESHEET RULE KEYS ON IT, deliberately —
      // the two arms are dressed identically and a rule that dressed them
      // apart would be a second thing saying where the chip is.
      data-arm={place?.arm ?? 'overlay'}
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
      {/* PHASE 238. Accept sits AFTER Rewind and not before it, so the two
          verbs a person already knows the place of do not move. It is the
          safe one of the pair — research 83 B.5 measured a per-phrase accept
          leaving the file's md5 unchanged — and the title says so in the four
          words that fit, because the resting face carries no paragraph.

          It is the LAST button on the chip because Phase 239 moved Undo off
          it into the note row, where the sentence that explains the undo
          already is; the chip holds change verbs only, and accept is one. */}
      <button
        type="button"
        className="ed-redline-chip-button ed-redline-chip-verb"
        tabIndex={-1}
        title="Accept this change — the file is not touched"
        onClick={() => {
          act('accept');
        }}
      >
        Accept
        <span className="key">{keyDisplay('redline.accept')}</span>
      </button>
    </div>
  );
}
