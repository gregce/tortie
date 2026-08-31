/**
 * WHICH SIDE YIELDS IN THE TOP STRIP (Phase 181.1).
 *
 * The operator saw the full compact meter beside five sessions, said he likes
 * how that looks, and ruled that the SESSIONS should start scrolling earlier
 * rather than the meter getting smaller. So the meter reserves the width its
 * compact form needs and the tab list takes what is left: the list is the
 * flexible cell in the band, the meter is a fixed one, and the strip's own
 * overflow test, `scrollWidth > clientWidth`, then reaches the existing
 * chevron sooner. The subtraction is the layout rather than a number in a
 * variable.
 *
 * What this file owns is the FLOOR. A window can be narrow enough that one
 * tab's own minimum and the meter cannot both stand, and something has to give
 * there. Below that width the meter steps compact, then mini, then away, and
 * that path is the last resort rather than the normal behaviour.
 *
 * EVERY WIDTH HERE IS MEASURED. Nothing in this file knows how wide a meter
 * is, how many providers are configured, or how wide a tab is. The caller
 * reads all of it off the DOM and hands it in, which is why the reservation
 * moves on its own when a second provider is switched on.
 */

/** What the strip may draw, widest first. `none` draws no meter at all. */
export type StripDensity = 'compact' | 'mini' | 'none';

/** What each drawable density measured the last time the strip drew it. */
export type StripWidths = { compact: number | null; mini: number | null };

export interface StripFitInput {
  /** The band's own width. */
  headerWidth: number;
  /** Every pinned cell in the band except the meter. */
  controlsWidth: number;
  /** The narrowest a single tab is allowed to draw. */
  tabFloor: number;
  /** Measured widths, `null` for a density this strip has not drawn yet. */
  widths: StripWidths;
}

/**
 * The widest density that still leaves one tab its minimum.
 *
 * The predicate does NOT depend on the density in force, which is what keeps
 * this from oscillating: the room a meter has to fit into is the band minus
 * the pinned controls minus one tab, and none of those three moves when the
 * meter changes size. A density whose width has never been measured is
 * chosen so that it gets drawn once and measured, and the answer settles on
 * the frame after.
 */
export function chooseStripDensity(input: StripFitInput): StripDensity {
  const room = input.headerWidth - input.controlsWidth - input.tabFloor;
  if (!Number.isFinite(room)) return 'compact';
  const { compact, mini } = input.widths;
  if (compact === null || compact <= room) return 'compact';
  if (mini === null || mini <= room) return 'mini';
  return 'none';
}

/** The default a tab's own `min-width` carries in app.css. */
const TAB_MIN_FALLBACK = 120;

/**
 * One tab's minimum, read from the tab the strip actually drew rather than
 * from a copy of the stylesheet. An empty strip has no tab to read, and the
 * value in app.css stands in until there is one.
 */
export function stripTabFloor(list: Element | null): number {
  const tab = list?.querySelector<HTMLElement>('[data-surface-id]');
  if (tab == null) return TAB_MIN_FALLBACK;
  const raw = Number.parseFloat(getComputedStyle(tab).minWidth);
  return Number.isFinite(raw) && raw > 0 ? raw : TAB_MIN_FALLBACK;
}
