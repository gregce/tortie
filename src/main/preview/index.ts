/**
 * The HTML preview channel (Phase 20.5): the `gmux-preview:` scheme that
 * feeds the sandboxed preview frame, the token map that decides which
 * project root a request belongs to, and the anchor rewrite that is the one
 * transform applied to a served document.
 *
 * WHICH files may be previewed and served is not here. That contract is
 * `src/shared/preview-types.ts`, because the editor asks the same question
 * to decide whether a tab gets the Preview control.
 *
 * The privileged descriptor is exported rather than a registration call,
 * because the application makes exactly one
 * `protocol.registerSchemesAsPrivileged` call and a second one strips
 * privileges from the scheme registered first. See protocol.ts.
 */

export {
  PREVIEW_HTML_CAP_BYTES,
  PREVIEW_PRIVILEGED_SCHEME,
  PREVIEW_REQUEST_BUDGET,
  PREVIEW_RESPONSE_POLICY,
  PREVIEW_SCHEME,
  previewStatsFor,
  previewUrlForFile,
  registerPreviewProtocol,
  releasePreviewRoot,
  resetPreviewProtocolForTests,
  servePreviewRequest
} from './protocol';

export type {
  PreviewHtmlRewrite,
  PreviewProtocolDeps,
  PreviewRefusal,
  PreviewStats,
  PreviewStatsInput,
  PreviewUrlInput,
  PreviewUrlResult
} from './protocol';

export { registerPreviewIpc } from './ipc';

export { ANCHOR_PARSE_CAP_BYTES, rewriteExternalAnchors } from './anchors';

export type {
  AnchorRewrite,
  AnchorRewriteOk,
  AnchorRewriteTooLarge
} from './anchors';
