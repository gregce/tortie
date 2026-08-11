/**
 * The image viewer (Phase 12.10 item 1) — the second reading surface in the
 * editor, next to markdown's.
 *
 * `ImageView` is the single picture (fit / zoom / pan / metadata) and
 * `ImageCompare` is HEAD-vs-working-tree for a modified one. Everything else
 * in here is theirs: ./zoom is the arithmetic, ./source decides which of the
 * five states one tab is in. EditorPanel mounts them; nothing else should
 * need to import from below this barrel.
 */

export { ImageView } from './ImageView';
export { ImageCompare } from './ImageCompare';
export { imageSourceFor, svgDataUrl, utf8Bytes } from './source';
export type { ImageSource, ImageTabView } from './source';
export {
  clampOffset,
  clampScale,
  fitScale,
  formatBytes,
  formatZoom,
  isPannable,
  shortTypeOf,
  stepScale,
  wheelScale,
  zoomAnchoredOffset,
  MAX_SCALE,
  MIN_SCALE,
  SCALE_STOPS
} from './zoom';
export type { Offset, Size } from './zoom';
