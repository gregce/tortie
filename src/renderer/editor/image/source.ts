/**
 * What an image tab should render, decided in one pure function.
 *
 * The viewer has five possible answers — still loading, here it is, too
 * large, not on disk, failed — and they arrive from two very different
 * places depending on the file:
 *
 *   raster  the `fs:readImage` reply on the tab (`imageData`), whose pixels
 *           live behind a `gmux-asset:` URL
 *   svg     the tab's TEXT, because an SVG is markup: it is read by the
 *           ordinary text path (so Source mode and ⌘S work exactly as they
 *           do for any other file) and turned into a `data:` URL here for
 *           the preview. That is the same Preview/Source split markdown has,
 *           and it is why Split mode can re-render the picture as you type.
 *
 * Keeping the branch here rather than inside the component is what lets the
 * five states be tested without a DOM, and stops the component from growing
 * a second opinion about what "too large" means.
 */

import { IMAGE_CAP_BYTES } from '@shared/image-types';
import type { ImageReadResult } from '@shared/image-types';

export type ImageSource =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      /** Whatever an `<img>` can load: a gmux-asset URL or a data URL. */
      src: string;
      /** Byte size of the source file. */
      bytes: number;
      mediaType: string;
    }
  | { kind: 'too-large'; bytes: number; capBytes: number; mediaType: string }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * A `data:` URL for SVG markup. Percent-encoded rather than base64: SVG is
 * UTF-8 text, `btoa` is not, and the naive round trip through it corrupts
 * every non-ASCII glyph in a diagram's labels.
 */
export function svgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** UTF-8 byte length of a string (an SVG's size on disk). */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface ImageTabView {
  /** Still fetching (the read has not answered yet). */
  loading: boolean;
  /** Friendly load failure from the text path, when there was one. */
  error: string | null;
  /** True when the text read hit the editor's 5 MB cap. */
  truncated: boolean;
  /** SVG: the markup to render. */
  svgText: string | null;
  /** Raster: the `fs:readImage` reply. */
  data: ImageReadResult | null;
}

/** Decide what the viewer shows for one side of one tab. */
export function imageSourceFor(view: ImageTabView): ImageSource {
  if (view.error !== null) return { kind: 'error', message: view.error };

  if (view.svgText !== null) {
    // An SVG that hit the TEXT cap would render as truncated markup — a
    // half-drawn picture that looks like a rendering bug rather than a
    // boundary. Refuse it with the same over-cap state a huge PNG gets.
    const bytes = utf8Bytes(view.svgText);
    if (view.truncated) {
      return {
        kind: 'too-large',
        bytes,
        capBytes: bytes,
        mediaType: 'image/svg+xml'
      };
    }
    if (view.loading && view.svgText === '') return { kind: 'loading' };
    return {
      kind: 'ready',
      src: svgDataUrl(view.svgText),
      bytes,
      mediaType: 'image/svg+xml'
    };
  }

  const data = view.data;
  if (data === null) return { kind: 'loading' };
  if (data.status === 'missing') return { kind: 'missing' };
  if (data.status === 'too-large') {
    return {
      kind: 'too-large',
      bytes: data.bytes,
      capBytes: data.capBytes,
      mediaType: data.mediaType
    };
  }
  const src = data.dataUrl ?? data.url;
  if (src === null) return { kind: 'loading' };
  return { kind: 'ready', src, bytes: data.bytes, mediaType: data.mediaType };
}

/** The cap, re-exported so the viewer's copy and the guard agree. */
export { IMAGE_CAP_BYTES };
