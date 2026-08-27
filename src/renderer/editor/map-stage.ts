/**
 * THE MAP WIDTH STAGE (Phase 161), pure and small.
 *
 * The surface ruling on the map tab says it uses as much interface space as
 * possible, and at the default split it did not: the operator's screenshot
 * had the picture in a strip beside a terminal taking most of the row. So
 * while the ACTIVE tab is the architecture map and the layout is a plain
 * split, the panel is STAGED at the row's maximum, which is the whole work
 * area minus the terminal's floor.
 *
 * The stage is presentation only, and that is the whole design:
 *
 *  - nothing is written to the persisted width store, so switching to a
 *    file tab returns the stored width byte for byte, which keeps the Phase
 *    18 rule that width is persisted intent;
 *  - the first divider drag drops the stage for the rest of the panel's
 *    life, because a drag IS the person stating the layout;
 *  - fill mode and overlay mode outrank it, since each already owns the
 *    panel's geometry, and auto entering fill here would hide the sidebar
 *    this phase makes scope with the drill, which would contradict the
 *    phase's own surface design.
 */

/** Everything the stage decision reads. One call site in EditorPanel. */
export interface MapStageInput {
  /** Is the ACTIVE tab the architecture map? */
  activeIsMap: boolean;
  /** Is the layout a plain split right now, not overlay and not filling? */
  split: boolean;
  /** Has a divider drag dropped the stage for this panel already? */
  dropped: boolean;
  /** The stored split width, already clamped for presentation. */
  splitWidth: number;
  /** The row's maximum for the editor, the terminal floor respected. */
  maxWidth: number;
}

/**
 * The width the panel lays out at, or null when the stage does not apply
 * and the stored width rules. Never below the stored width: a person whose
 * stored width is already wider than the computed maximum keeps it.
 */
export function stagedMapWidth(input: MapStageInput): number | null {
  if (!input.activeIsMap || !input.split || input.dropped) return null;
  return Math.max(input.splitWidth, input.maxWidth);
}
