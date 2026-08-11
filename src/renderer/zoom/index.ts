/**
 * Per-region zoom (Phase 12.11) — ⌘+ / ⌘- enlarge the text where the user is
 * working, ⌘0 resets that region, ⌘⇧0 resets everything.
 *
 * Read regions.ts first: it carries the two mechanisms (a terminal changes its
 * FONT, a panel changes its CSS `zoom`) and the rule that keeps the S1 header
 * band out of both.
 */

export { useZoomKeymap } from './keys';
export { ZoomHud } from './ZoomHud';
export { useZoom } from './store';
export type { ZoomHint, ZoomState } from './store';
export { resolveZoomTarget } from './focus';
export {
  clampZoom,
  formatZoomPercent,
  stepZoom,
  zoomedFontSize,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_REGION_LABELS,
  ZOOM_REGIONS,
  ZOOM_STEPS,
  zoomLimit
} from './regions';
export type { ZoomLevels, ZoomRegionId } from './regions';
