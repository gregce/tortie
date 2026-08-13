/**
 * The HTML preview (Phase 20.5) — public surface of the module.
 *
 * Two exports on purpose, the same two the markdown barrel has: the panel
 * needs the component, and the panel's mode control needs the predicate.
 * Everything else in here is internal. `./source` decides which of the seven
 * states one tab is in and counts what the preview refused, `./preview-url`
 * owns the URL string and the bridge feature detection.
 *
 * There is no lazy chunk loader and no sanitiser in this module, because
 * there is no library to defer and nothing to sanitise on this route.
 * Chromium renders the page, main's response header refuses everything, and
 * the renderer's part is a frame element and a state machine.
 */

export { HtmlPreview, PREVIEW_RELOAD_DEBOUNCE_MS } from './HtmlPreview';
export type { HtmlPreviewProps } from './HtmlPreview';
export { tabRendersHtml } from './html-path';
