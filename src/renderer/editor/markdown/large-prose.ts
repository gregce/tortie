/**
 * PHASE 254 — the deferral that makes a large prose file open fast, and
 * PHASE 255 — what that deferral became once the preview stopped drawing
 * the whole document before its first paint.
 *
 * Phase 254 measured the open (research 116): the read ~6 ms, the diff
 * ~250 ms, Monaco 53–136 ms, and the rendered markdown preview ~5 s of
 * main-thread render WITH NO FIRST PAINT UNTIL THE WHOLE DOCUMENT HAD
 * RENDERED. The render cost ~2 ms per KB, so file SIZE predicted the freeze,
 * and a source past 256 KiB — about half a second — opened in Source with
 * Preview DEFERRED to the mode chip, whose title said so in one clause.
 *
 * PHASE 255 RE-DERIVED IT (research 117 §7). The preview now cuts the
 * document where a cut cannot change the page, draws the first window and
 * streams the rest (window-scan.ts, chunk-parse.ts), so first paint is
 * proportional to the viewport and not to the file. Measured in the app on
 * the same Preview click (probe:p255), first paint went from 2,298 ms to
 * 36 ms on the 2.56 MB twin, from 1,880 ms to 37 ms on the 3.26 MB twin,
 * and from 3,605 ms to 74 ms on this repository's own BACKLOG.md. A size
 * threshold no longer predicts anything a person feels, so for ordinary
 * prose the deferral is GONE and a large markdown file opens rendered again.
 *
 * Two shapes still draw in one piece, and they are the only ones deferred:
 *
 *  - A document whose FIRST CHUNK is enormous — one blank-free run from
 *    byte 0, which no cut can split. The first window always takes at least
 *    one chunk, so that chunk IS the first paint. The number is Phase 254's
 *    own half second applied to the densest shape measured rather than to
 *    the file: a blank-free GFM table from byte 0 painted in 280 ms at
 *    512 KiB and 479 ms at 1 MiB (probe:p255), about 0.46 ms per KB, which is
 *    twice the paragraph slice research 117 §7 derived its 2 MB from. So the
 *    cap is 1 MiB, the size at which the worst shape still paints inside the
 *    half second; a first chunk of prose that size paints in about half that.
 *  - A document that DEFINES A FOOTNOTE. Windowing would give every chunk
 *    its own footnote section, so window-scan.ts refuses to cut it and the
 *    preview draws it on the unchanged remark path, which still costs what
 *    Phase 254 measured. For that shape Phase 254's number stands exactly.
 *
 * Deferred, never dropped, exactly as before: the tab opens in the fast
 * surface its mode chip already offers, Preview stays on the chip with the
 * cost stated in one clause, and a deliberate click draws the document.
 */

import type { EditorMode } from '../tab-types';
import { hasFootnotes, scanChunks } from './window-scan';

/**
 * A footnote document, drawn whole on the remark path, defers past this —
 * Phase 254's number, kept for the one path that still has Phase 254's
 * cost. UTF-16 code units, because that is what the pipeline walks and what
 * `String.length` measures; for prose the two track bytes closely.
 */
export const PREVIEW_DEFER_CHARS = 256 * 1024;

/**
 * Any other document defers only when its FIRST CHUNK alone is past this —
 * the half second of first paint for the densest shape measured (header).
 */
export const PREVIEW_DEFER_FIRST_CHUNK_CHARS = 1024 * 1024;

/**
 * EditorPanel asks this on every render for the chip's title, and the scan
 * behind it is ~10 ms at 3 MB, so the last answer is kept by source
 * identity: the tab's `savedContents` is replaced when the file changes,
 * never mutated, so the same string is the same answer.
 */
let lastSource: string | null = null;
let lastAnswer = false;

/** Is this source's rendered preview deferred to a deliberate chip click? */
export function previewDeferred(source: string): boolean {
  // Both thresholds are past this, so the ordinary README answers at once.
  if (source.length <= PREVIEW_DEFER_CHARS) return false;
  if (source === lastSource) return lastAnswer;
  let answer: boolean;
  if (hasFootnotes(source)) {
    answer = true;
  } else if (source.length <= PREVIEW_DEFER_FIRST_CHUNK_CHARS) {
    answer = false; // a first chunk cannot be larger than its document
  } else {
    const first = scanChunks(source).chunks[0];
    answer =
      first !== undefined &&
      first.end - first.start > PREVIEW_DEFER_FIRST_CHUNK_CHARS;
  }
  lastSource = source;
  lastAnswer = answer;
  return answer;
}

/**
 * The chip's one-clause statement of the deferral (UI rules: explanation
 * lives behind hover, in just enough words). It replaces Preview's resting
 * title exactly when `previewDeferred` says so.
 */
export const PREVIEW_DEFER_TITLE =
  'Rendered markdown — deferred: this file draws in one piece, which takes a few seconds';

/**
 * The mode a prose tab OPENS in, decided once, when its first read lands.
 *
 * Only the two modes that would render the markdown pipeline on open are
 * demoted, and only for a markdown tab whose source `previewDeferred` says
 * draws in one piece. Everything else answers the mode it was given: a diff
 * stays a diff, an explicit navigation is already 'file', and ordinary prose
 * at any size opens rendered. This runs ONLY on the first load
 * (`loadContents`) — a mode the person chooses on the chip afterwards is
 * never fought, because nothing re-runs this over an open tab.
 */
export function openedProseMode(
  mode: EditorMode,
  markdown: boolean,
  source: string
): EditorMode {
  return markdown &&
    (mode === 'preview' || mode === 'split') &&
    previewDeferred(source)
    ? 'file'
    : mode;
}
