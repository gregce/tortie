/**
 * Markdown surface (BACKLOG item 6) — public surface of the module.
 *
 * Two exports on purpose: the panel needs the component, the store needs the
 * predicate. Everything else (the renderer, the sanitize schema, the URL
 * resolver, the heading ruler) is internal, and everything heavy sits behind
 * `markdown-loader.ts` — importing this barrel costs one small React wrapper.
 */

export { MarkdownPreview } from './MarkdownPreview';
export type { MarkdownPreviewProps } from './MarkdownPreview';
export { isMarkdownPath } from './markdown-path';
