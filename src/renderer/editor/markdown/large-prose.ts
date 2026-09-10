/**
 * PHASE 254 — the deferral that makes a large prose file open fast.
 *
 * The operator's 2.56 MB specstory history and the 3.26 MB BACKLOG.md both
 * "load very slowly", and research 116 profiled the whole open at the parent
 * commit: the IPC read is ~6 ms, the Pierre diff ~250 ms, Monaco 53–136 ms —
 * and the rendered markdown preview is ~5,000–5,600 ms, all of it
 * main-thread, WITH NO FIRST PAINT UNTIL THE WHOLE DOCUMENT HAS RENDERED
 * (react-markdown's element walk ~4.2 s + micromark's tokenizer ~3.9 s over
 * the whole source, research 116 §2.2). Nothing else was close.
 *
 * VS Code's answer is structural: it opens a `.md` in the editor by DEFAULT
 * and renders the preview only on command, in a webview (research 116 §4.6),
 * so it never pays this cost on open at any size. Tortie keeps the rendered
 * preview as the default for ordinary prose — a README should open readable —
 * and adopts VS Code's shape only where the render stops feeling like an
 * open: above this threshold the tab opens in the fast surface its mode chip
 * already offers (Source, or the diff the request asked for), and Preview is
 * DEFERRED to a deliberate click on the chip, which states the cost in one
 * clause. Deferred, never dropped: the pipeline is uncapped and unchanged,
 * every mode is still offered, and choosing Preview renders the whole
 * document exactly as before.
 *
 * THE THRESHOLD IS DERIVED FROM THE MEASUREMENT, not from VS Code, which has
 * no preview-size threshold to port (its `largeFileOptimizations` bite at
 * 20 MB / 300 K lines and govern tokenization, not a preview). The pipeline
 * measured ~1.5–2.1 ms per KB across both twins (5,470 ms / 2.56 MB and
 * 4,979 ms / 3.26 MB, research 116 §2.4), so 256 KiB is the largest source
 * whose render still lands in about half a second on the reference machine
 * FOR ORDINARY PROSE — the boundary between "opens" and "loads". Both of his
 * files are ten times past it in either direction. The per-KB figure is also
 * markup-density-dependent (a sparser twin rendered ~2.6 s at 2.56 MB), so
 * ~2 ms/KB is the dense end. The half-second does NOT hold for degenerate
 * line shapes: the pipeline's cost is superlinear in LINE length, and a
 * single-line file exactly AT this cap was measured rendering in ~5.7 s
 * (100 K chars on one line: ~69 ms). VS Code guards that shape separately
 * (its tokenizer's long-line limits), which is outside this phase; a later
 * round tempted to trust the half-second at the boundary should re-measure
 * the line shape it has in hand.
 */

import type { EditorMode } from '../tab-types';

/**
 * Sources longer than this open in Source and defer the rendered preview to
 * the mode chip. UTF-16 code units, because that is what the pipeline walks
 * and what `String.length` measures; for prose the two track bytes closely.
 */
export const PREVIEW_DEFER_CHARS = 256 * 1024;

/** Is this source past the deferral threshold? */
export function previewDeferred(source: string): boolean {
  return source.length > PREVIEW_DEFER_CHARS;
}

/**
 * The chip's one-clause statement of the deferral (UI rules: explanation
 * lives behind hover, in just enough words). It replaces Preview's resting
 * title exactly when the tab's source is past the threshold.
 */
export const PREVIEW_DEFER_TITLE =
  'Rendered markdown — deferred for a file this large; it takes a few seconds to draw';

/**
 * The mode a prose tab OPENS in, decided once, when its first read lands.
 *
 * Only the two modes that would render the markdown pipeline on open are
 * demoted, and only for a markdown tab whose source is past the threshold.
 * Everything else answers the mode it was given: a diff stays a diff, an
 * explicit navigation is already 'file', and a small README still opens
 * rendered. This runs ONLY on the first load (`loadContents`) — a mode the
 * person chooses on the chip afterwards is never fought, because nothing
 * re-runs this over an open tab.
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
