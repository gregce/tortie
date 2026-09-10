/**
 * The room the redline's page has, and the bar that marks the current change
 * inside it (Phase 251, research 114 §6.1 and §6.2).
 *
 * TWO PURE FUNCTIONS AND A NUMBER, in a module of their own for one reason:
 * ./RedlineDocument imports React and ./redline.css, so nothing in it can be
 * driven under plain node, and both of these are arithmetic that
 * `npm run conformance:redline` rule 34 ablates one clause at a time. A rule
 * that can only READ its subject is the thing that gate exists to refuse.
 *
 * Nothing here touches the DOM, and nothing here draws. ./RedlineDocument
 * hands `railBarFor` the rects it read and puts the answer on one element;
 * ./redline.css turns `roomFor`'s answer into a rail width.
 *
 * WHAT THIS FILE MAY NEVER GROW. It is in the `redline*` family, so
 * `npm run conformance:redline` rule 9 forbids it a write channel, an `fs:`
 * string and the bridge, and rule 8 forbids it a colour literal. It has no
 * imports at all and it should keep none: that is what lets the gate copy it
 * into a scratch directory and ablate it.
 */

/**
 * EVERY VALUE `data-room` CAN TAKE, in one runtime array so the stylesheet's
 * ladder and this one cannot drift. `npm run conformance:redline` rule 34
 * reads this list and asserts that ./redline.css gives every entry in it a
 * rail with a width, and that no entry's rail is zero — which is research 114
 * §1.3's ruling that THE RAIL NEVER COLLAPSES, made checkable.
 */
export const ROOM_VALUES = ['full', 'narrow'] as const;

/** The room the page has, being which rail the ladder in ./redline.css draws. */
export type RedlineRoom = (typeof ROOM_VALUES)[number];

/**
 * THE LADDER'S FLOOR, AND IT IS DERIVED RATHER THAN PICKED.
 *
 * The wide rail and its gutter cost the column 32px, which at the editor
 * panel's own floor is four characters of a thirty-character line. So the rail
 * is wide only while the column still holds a reading measure after paying for
 * it, and the measure is research 113 §1's own lower bound: **45 characters**,
 * the bottom of the 45 to 75 range a prose measure is normally held to, and
 * the range that document uses to say the shipped 62.1 characters is not
 * simply wrong.
 *
 * 45 characters at the document's own `ch`, measured at 8.1885px in the
 * running app, is 368.48px of text; plus the 48px of inline padding is
 * 416.48px of column box; plus the 20px rail and its 12px gutter is 448.48px
 * of scroller. Rounded UP, so the rail never widens at a width where the
 * column would hold fewer than 45 characters.
 *
 * None of the three widths research 113 measures is near the boundary: the
 * scroller is 309px at the panel's 319px floor and 689px at 699px, and the
 * panel a person would have to drag to to sit on it is about 459px.
 *
 * IT IS NOT WHAT DECIDES WHERE THE CHIP GOES. Research 114 §6.4 replaced the
 * design's first `data-room` ladder for the chip with one question asked of
 * the chip's own drawn width, and this number is only the rail's.
 */
export const REDLINE_RAIL_FLOOR = 449;

/** The room a scroller of this width has. */
export function roomFor(scrollerWidth: number): RedlineRoom {
  return scrollerWidth >= REDLINE_RAIL_FLOOR ? 'full' : 'narrow';
}

/**
 * Where the current change's bar is drawn in the rail: the top of the change's
 * FIRST client rect and the bottom of its LAST, in the rail's own coordinates.
 */
export interface RailBar {
  top: number;
  height: number;
}

/** The parts of a rectangle {@link railBarFor} reads. */
export interface RailRect {
  top: number;
  bottom: number;
}

/**
 * THE BAR THE CURRENT CHANGE DRAWS (research 114 §6.2).
 *
 * Chromium paints an outline once per inline FRAGMENT, so the ring Phase 227
 * drew on the change's own wrapper became a stack of boxes exactly where a
 * wrapped change is widest: research 114 §2 counted 23 outlined boxes on one
 * change at the pane the operator works in and 43 at the panel's floor over the
 * MOCK, and `npm run probe:p249` read 37 and 74 over its own longer fixture at
 * the parent commit and 0 at HEAD, both driven over EVERY change rather than
 * over whichever one happened to be current. This is the whole replacement,
 * and it is one element.
 *
 * IT IS THE FIRST RECT'S TOP AND THE LAST RECT'S BOTTOM AND NEVER THE UNION
 * BOX, for the same reason `chipAnchorRect` is: research 96 §4.5 measured a
 * wrapped change's union rect starting 435.73px left of where the change
 * starts. The union's VERTICAL extent happens to be right, and taking it would
 * leave two readings in this view disagreeing about which rectangle is
 * authoritative, which is how the wrong one gets copied next time.
 *
 * A change with no rect at all draws nothing. A change whose rects have
 * collapsed to no height draws the bar's OWN 2px, because "the current change
 * is marked" is Phase 239's shape 4 and a zero-height bar is not a mark.
 */
export function railBarFor(
  rects: ArrayLike<RailRect>,
  railTop: number
): RailBar | null {
  const first = rects[0];
  const last = rects[rects.length - 1];
  if (first === undefined || last === undefined) return null;
  return {
    top: first.top - railTop,
    height: Math.max(2, last.bottom - first.top)
  };
}
