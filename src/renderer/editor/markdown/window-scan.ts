/**
 * PHASE 255 — where a markdown document may be cut, found without parsing.
 *
 * The preview used to render a document in ONE synchronous pass: nothing
 * painted until the whole page was React elements, 2,254 ms on the 2.56 MB
 * twin with an 1,845 ms task the page could not interrupt (research 117
 * §2.1). Windowed rendering draws the first few chunks at once and streams
 * the rest through idle callbacks — but only if the document can be CUT
 * without changing what any chunk means.
 *
 * This scanner finds those cuts with three line passes and no parse. The
 * bias is written into every rule: OVER-MERGING IS ALWAYS SAFE, because a
 * bigger chunk only costs milliseconds, and a cut in the wrong place is the
 * one way to change what the page draws. A cut happens only at a blank line
 * where nothing before it can continue past it:
 *
 *  - never inside a code fence (``` or ~~~, the closing run at least as long
 *    as the opening one, nothing after it);
 *  - never inside a type-1 HTML block (pre, script, style, textarea) or an
 *    HTML comment;
 *  - never while a raw HTML container tag is open. CommonMark ends the HTML
 *    BLOCK at the blank line, but the HTML parser stitches the fragments
 *    back together across the markdown between them, so a cut while a
 *    `<table>` or `<details>` is open changes the tree (research 117 §4.1,
 *    found by the corpus on a README hero table). Code spans are removed
 *    from a line before its tags are counted, because `<table>` written in
 *    backticks is prose about a tag and not a tag, and counting it would
 *    veto every later cut in a document that merely mentions one;
 *  - never anywhere inside a list. A blank-separated sibling makes a list
 *    LOOSE, so a cut between items splits one list into two AND re-tightens
 *    it (both found on the research 117 twins, §4.2). A marker line, a lazy
 *    continuation and an indented continuation all keep the veto alive;
 *  - never before a line indented four columns or more, tabs expanded,
 *    because an indented code block continues across blank lines.
 *
 * Constructs that span blocks, priced rather than waved at (research 117
 * §4.2): setext headings and lazy continuation never cross a blank line, so
 * cutting only at blanks is immune to them by construction; a table's
 * alignment row sits inside its own blank-free run. Reference definitions
 * are collected here and PREPENDED to every chunk's parse input — a
 * definition draws nothing, so a link used far from its definition still
 * resolves and nothing else moves, and prepending (rather than appending)
 * keeps the document's FIRST definition of a label the winning one and
 * cannot be swallowed by a fence left open at the end of the file.
 * Footnotes are the one construct windowing genuinely reorders (each chunk
 * would draw its own footnote section), so a document that defines one is
 * never windowed at all: `hasFootnotes` is asked by the preview, which
 * draws such a document whole on the unchanged remark path
 * (markdown-impl.tsx), and by the deferral guard (large-prose.ts). This
 * scanner does not refuse it itself, because a refusal nothing reads is a
 * clause no check can fail.
 *
 * PURE ON PURPOSE: no React, no DOM, no electron. `npm run conformance:preview`
 * runs this exact module under node over this repository's own markdown and
 * the research 116 twins, and ablates each veto to prove it can fail.
 */

/** Target chunk size for the cut pass, in lines (research 117 §4.1). */
export const WINDOW_CHUNK_LINES = 60;

/**
 * The first window: drawn in the same commit the preview mounts in. Twelve
 * 60-line chunks is more than a screenful at any pane height, and the char
 * budget keeps a first window of fat chunks from becoming the old freeze.
 * A window always takes at least one chunk, so first paint is bounded by
 * the larger of the budget and the first chunk — which is exactly what the
 * deferral guard in large-prose.ts measures.
 */
export const WINDOW_INITIAL_CHUNKS = 12;
export const WINDOW_INITIAL_CHARS = 128 * 1024;

/**
 * One idle slice of the stream. Research 117 §5 measured ~0.24 ms per KB
 * for a slice in the app, so 256 KiB is about 60 ms: well under the 250 ms
 * ceiling the phase states even at several times that density, and it keeps
 * two uncuttable runs from landing in one task (twin A's 690 KB list and
 * 868 KB tail would have shared a twelve-chunk batch).
 */
export const WINDOW_BATCH_CHUNKS = 12;
export const WINDOW_BATCH_CHARS = 256 * 1024;

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_RE = /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;
const REF_DEF_RE = /^ {0,3}\[[^\]]{1,999}\]:/;
const ATX_RE = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const FOOTNOTE_DEF_RE = /^ {0,3}\[\^[^\]]+\]:/m;
const HTML1_OPEN_RE = /^ {0,3}<(?:pre|script|style|textarea)\b/i;
const HTML1_CLOSE_RE = /<\/(?:pre|script|style|textarea)>/i;
const COMMENT_OPEN_RE = /^ {0,3}<!--/;
const COMMENT_CLOSE_RE = /-->/;
/** A code span on one line: a backtick run, anything, the same run. */
const CODE_SPAN_RE = /(`+)[^`]*?(?:`(?!\1)[^`]*?)*?\1/g;
/**
 * Raw HTML container tags the HTML parser stitches across blank-line block
 * boundaries. Opening one vetoes cuts until it closes.
 */
const CONTAINER_RE =
  /<\/?(table|thead|tbody|tr|td|th|div|details|dl|ul|ol|blockquote|section|center|figure|picture|summary|font|kbd|sub|sup|a|p)\b[^>]*?(\/?)>/gi;

export interface Chunk {
  /** UTF-16 offsets into the source, end exclusive. */
  start: number;
  end: number;
}

export interface ChunkPlan {
  chunks: Chunk[];
  /**
   * Every collected reference-definition line, newline-joined, in document
   * order. Prepended (before a blank) to each chunk's parse input.
   */
  defs: string;
}

/** Columns of leading whitespace, a tab advancing to the next multiple of 4. */
function indentOf(line: string): number {
  let col = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charCodeAt(i);
    if (ch === 32) col += 1;
    else if (ch === 9) col += 4 - (col % 4);
    else break;
  }
  return col;
}

/** Does `line` close a fence opened with `marker`? */
function closesFence(line: string, marker: string): boolean {
  const m = FENCE_RE.exec(line);
  if (m === null) return false;
  const run = m[1] as string;
  return (
    run[0] === marker[0] &&
    run.length >= marker.length &&
    line.slice(m[0].length).trim() === ''
  );
}

/** True when the document defines a footnote — it is then never windowed. */
export function hasFootnotes(src: string): boolean {
  return FOOTNOTE_DEF_RE.test(src);
}

/**
 * Cut a markdown source into chunks of about `targetLines` lines, only at
 * blank lines where the cut cannot change what the page draws. The chunks
 * tile the source exactly: the first starts at 0, each starts where the
 * previous ended, the last ends at `src.length`.
 */
export function scanChunks(
  src: string,
  targetLines: number = WINDOW_CHUNK_LINES
): ChunkPlan {
  if (src === '') return { chunks: [], defs: '' };
  const lines = src.split('\n');
  const n = lines.length;

  // Pass 1 — per-line state: is this blank line at top level, outside every
  // fence, HTML block and open raw container tag?
  let fence: string | null = null;
  let html = 0; // 0 none, 1 pre/script/style/textarea, 2 comment
  let depth = 0;
  const cuttable = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const line = lines[i] as string;
    if (fence !== null) {
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    if (html === 1) {
      if (HTML1_CLOSE_RE.test(line)) html = 0;
      continue;
    }
    if (html === 2) {
      if (COMMENT_CLOSE_RE.test(line)) html = 0;
      continue;
    }
    if (line.trim() === '') {
      cuttable[i] = depth > 0 ? 0 : 1;
      continue;
    }
    const fm = FENCE_RE.exec(line);
    if (fm !== null) {
      fence = fm[1] as string;
      continue;
    }
    for (const m of line.replace(CODE_SPAN_RE, '').matchAll(CONTAINER_RE)) {
      if (m[2] === '/') continue; // self-closing
      if (m[0][1] === '/') {
        if (depth > 0) depth -= 1;
      } else {
        depth += 1;
      }
    }
    if (HTML1_OPEN_RE.test(line) && !HTML1_CLOSE_RE.test(line)) {
      html = 1;
      continue;
    }
    if (COMMENT_OPEN_RE.test(line) && !COMMENT_CLOSE_RE.test(line)) html = 2;
  }

  // Pass 2 — veto a blank whose NEXT non-blank line could continue what came
  // before it: a line indented four columns or more, or any line inside a
  // list. A line is inside a list when it is a marker itself, a lazy
  // continuation (no blank since a listish line), or an indented
  // continuation after a blank.
  let prevListish = false;
  let prevNonBlank = -1;
  for (let i = 0; i < n; i++) {
    const line = lines[i] as string;
    if (line.trim() === '') continue;
    const indent = indentOf(line);
    const blankBetween = i > prevNonBlank + 1;
    const listish: boolean =
      LIST_RE.test(line) || (prevListish && (!blankBetween || indent >= 2));
    if (indent >= 4 || (listish && prevListish)) {
      for (let j = prevNonBlank + 1; j < i; j++) cuttable[j] = 0;
    }
    prevListish = listish;
    prevNonBlank = i;
  }

  // Pass 3 — group lines into chunks of about targetLines, cutting only at
  // a cuttable blank, which joins the chunk it closes. Offsets are carried
  // along, so the chunks tile the source by construction.
  const chunks: Chunk[] = [];
  let start = 0;
  let offset = 0;
  let since = 0;
  for (let i = 0; i < n; i++) {
    offset += (lines[i] as string).length + 1;
    since += 1;
    if (cuttable[i] === 1 && since >= targetLines && offset < src.length) {
      chunks.push({ start, end: offset });
      start = offset;
      since = 0;
    }
  }
  if (start < src.length) chunks.push({ start, end: src.length });

  // Reference definitions, collected only where CommonMark lets one start:
  // after a blank, an ATX heading, another definition, or at the top — a
  // `[x]: y` line continuing a paragraph is paragraph text, and collecting
  // it would make it a real definition in every other chunk. Fenced lines
  // are skipped, so a fenced example of a definition is not one.
  const defs: string[] = [];
  let defFence: string | null = null;
  let prevOpens = true;
  for (let i = 0; i < n; i++) {
    const line = lines[i] as string;
    if (defFence !== null) {
      if (closesFence(line, defFence)) defFence = null;
      prevOpens = false;
      continue;
    }
    const fm = FENCE_RE.exec(line);
    if (fm !== null) {
      defFence = fm[1] as string;
      prevOpens = false;
      continue;
    }
    const isDef: boolean = prevOpens && REF_DEF_RE.test(line);
    if (isDef) defs.push(line.replace(/\r$/, ''));
    prevOpens = isDef || line.trim() === '' || ATX_RE.test(line);
  }
  return { chunks, defs: defs.join('\n') };
}

/**
 * The texts the windowed renderer parses: each chunk's slice, with the
 * document's reference definitions in front of it after a blank.
 */
export function chunkTexts(src: string, plan: ChunkPlan): string[] {
  const head = plan.defs === '' ? '' : `${plan.defs}\n\n`;
  return plan.chunks.map((c) => head + src.slice(c.start, c.end));
}

/**
 * Where a window that starts at chunk `from` ends (exclusive): at most
 * `maxChunks` chunks, stopping before the one that would take the window
 * past `maxChars` — but always at least one chunk, so a single chunk larger
 * than the budget is drawn alone rather than never.
 */
export function windowEnd(
  chunks: readonly Chunk[],
  from: number,
  maxChunks: number,
  maxChars: number
): number {
  if (from >= chunks.length) return chunks.length;
  let end = from;
  let chars = 0;
  while (end < chunks.length && end - from < maxChunks) {
    const c = chunks[end] as Chunk;
    const size = c.end - c.start;
    if (end > from && chars + size > maxChars) break;
    chars += size;
    end += 1;
  }
  return end;
}
