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
 * This scanner finds those cuts with line passes and no parse. The bias is
 * written into every rule: OVER-MERGING IS ALWAYS SAFE, because a bigger
 * chunk only costs milliseconds, and a cut in the wrong place is the one way
 * to change what the page draws. A cut happens only at a blank line where
 * nothing before it can continue past it:
 *
 *  - never inside a code fence (``` or ~~~, the closing run at least as long
 *    as the opening one, nothing after it);
 *  - never while the HTML parser would still be inside something raw HTML
 *    opened. CommonMark ends an HTML block at a blank line, but parse5 reads
 *    the whole page as one stream, so an element a file opens and does not
 *    close holds every later block inside it (research 117 §4.1). The
 *    scanner keeps a small model of parse5's stack of open elements, and the
 *    fix round wrote it from the tree-construction rules rather than a tag
 *    list, because the build's list missed `<span>` and `<b>` and the
 *    verifier's page went from 49 top-level blocks to 118:
 *      - a void element opens nothing;
 *      - script, style, textarea, title, xmp, iframe, noembed, noframes and
 *        plaintext swallow everything up to their own end tag, blank lines
 *        and tags included;
 *      - an ordinary element (span, sup, kbd, an unknown tag) opened inside
 *        a PARAGRAPH is closed by that paragraph's end, so it is dropped at
 *        the blank line; opened in an HTML BLOCK it stays open;
 *      - a formatting element (a, b, em, strong, …) is RECONSTRUCTED into
 *        every later paragraph by the adoption agency, so it stays open
 *        wherever it was opened and survives an end tag that pops past it;
 *      - an end tag closes the nearest element of its name only inside its
 *        scope, and an ordinary end tag stops at a special element, as
 *        parse5 does; an end tag it would ignore is ignored here too;
 *      - a markdown block after a blank line starts with a tag that closes an
 *        open `<p>` (paragraph, heading, list, table, quote, fence, rule), so
 *        a README's unclosed hero `<p align="center">` no longer holds every
 *        later cut closed;
 *      - a tag in a code span, an indented code line or an HTML comment is
 *        not a tag, and where the scanner cannot be sure (a code span or a
 *        comment left open to the next line, a tag whose `>` is on a later
 *        line) it counts what OPENS and never what CLOSES, which can only
 *        merge;
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
 * draw nothing where they stand and resolve anywhere, so they are not the
 * scanner's business: chunk-parse.ts reads them with markdown-it's own block
 * pass and hands every chunk the table. Footnotes are the one construct
 * windowing genuinely reorders (each chunk would draw its own footnote
 * section), so a document that defines one is never windowed at all:
 * `hasFootnotes` is asked by the preview, which draws such a document whole
 * on the unchanged remark path (markdown-impl.tsx), and by the deferral
 * guard (large-prose.ts), and it finds a definition inside a blockquote or a
 * list item too.
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
 * for a slice in the app, so 256 KiB is about 60 ms, and it keeps two
 * uncuttable runs from landing in one task (twin A's 690 KB list and 868 KB
 * tail would have shared a twelve-chunk batch). THE STATED LIMIT, since the
 * fix round measured a run the builder's corpus did not hold (an unclosed
 * `<details>` after the first screen, 2.4 MB in one run, a 348 ms task): a
 * window is PARSED in one idle task and DRAWN in the next (chunk-parse.ts
 * `streamWindow`), so a run larger than this budget costs two tasks of about
 * half its price rather than one. A run is still never split, so a dense one
 * several megabytes deep can hold a task past the 250 ms research 117 §6
 * names; the deferral guard (large-prose.ts) reads the FIRST chunk only,
 * because a later one is drawn after the page is already on screen.
 */
export const WINDOW_BATCH_CHUNKS = 12;
export const WINDOW_BATCH_CHARS = 256 * 1024;

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
/** Inside a list an indented fence is still a fence. */
const LIST_FENCE_RE = /^[ \t]*(`{3,}|~{3,})/;
const LIST_RE = /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;
const REF_DEF_RE = /^ {0,3}\[[^\]]{1,999}\]:/;
const ATX_RE = /^ {0,3}#{1,6}(?:[ \t]|$)/;
/** A footnote definition, at top level or inside quotes and list items. */
const FOOTNOTE_DEF_RE = /^[ \t>]*(?:(?:[-+*]|\d{1,9}[.)])[ \t]+[ \t>]*)*\[\^[^\]\n]+\]:/m;

/** CommonMark's HTML block starts (markdown-it rules_block/html_block). */
const HTML_PRE_RE = /^ {0,3}<pre(?=[\s>]|$)/i;
const HTML_PRE_END_RE = /<\/pre>/i;
const BLOCK_NAMES =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul|script|style|textarea|pre';
const ATTR = String.raw`(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^"'=<>\x60\x00-\x20]+|'[^']*'|"[^"]*"))?)`;
const OPEN_TAG = String.raw`<([A-Za-z][A-Za-z0-9-]*)${ATTR}*\s*\/?>`;
const CLOSE_TAG = String.raw`<\/([A-Za-z][A-Za-z0-9-]*)\s*>`;
const HTML_BLOCK_RE = new RegExp(
  `^ {0,3}(?:<\\/?(?:${BLOCK_NAMES})(?=[\\s/>]|$)|<!--|<\\?|<![A-Za-z]|(?:${OPEN_TAG}|${CLOSE_TAG})\\s*$)`,
  'i'
);
/** At a `<`: a complete tag the way markdown-it's html_inline reads one. */
const INLINE_OPEN_RE = new RegExp(OPEN_TAG, 'y');
const INLINE_CLOSE_RE = new RegExp(CLOSE_TAG, 'y');
/** At a `<`: a tag starting, the way parse5's tokenizer reads one. */
const START_RE = /<(\/?)([A-Za-z][^\s/>]*)/y;

const words = (s: string): Set<string> => new Set(s.split(' '));
const VOID = words('area base basefont bgsound br col embed frame hr image img input keygen link meta param source track wbr');
const RAWTEXT = words('script style textarea title xmp iframe noembed noframes plaintext');
const FORMATTING = words('a b big code em font i nobr s small strike strong tt u');
/** parse5's special elements, plus the two foreign roots, which a paragraph end does not close either. */
const SPECIAL = words(
  'address applet area article aside base basefont bgsound blockquote body br button caption center col colgroup dd details dialog dir div dl dt embed fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html iframe img input keygen li link listing main marquee menu meta nav noembed noframes noscript object ol p param plaintext pre script search section select source style summary table tbody td template textarea tfoot th thead title tr track ul wbr xmp svg math'
);
/** The elements an end tag's search for its element stops at ("in scope"). */
const SCOPE = words('applet caption html table td th marquee object template foreignobject desc mi mo mn ms mtext annotation-xml');
const BUTTON_SCOPE = new Set([...SCOPE, 'button']);
const TABLE_SCOPE = words('html table template');
const TABLE_PARTS = words('table tbody thead tfoot tr td th caption');

export interface Chunk {
  /** UTF-16 offsets into the source, end exclusive. */
  start: number;
  end: number;
}

export interface ChunkPlan {
  chunks: Chunk[];
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
function closesFence(line: string, marker: string, anyIndent: boolean): boolean {
  const m = (anyIndent ? LIST_FENCE_RE : FENCE_RE).exec(line);
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

/** Where a run of exactly `size` backticks starts at or after `from`, or -1. */
function findTicks(line: string, from: number, size: number): number {
  let i = from;
  while (i < line.length) {
    const at = line.indexOf('`', i);
    if (at < 0) return -1;
    let end = at;
    while (end < line.length && line.charCodeAt(end) === 96) end++;
    if (end - at === size) return at;
    i = end;
  }
  return -1;
}

/** Start tags parse5 answers by closing an open `<p>` first ("in body"). */
const P_CLOSERS = words(
  'address article aside blockquote center details dialog dir div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr listing main menu nav ol p pre search section summary table ul xmp plaintext'
);

interface OpenElement {
  name: string;
  /** Opened inside a paragraph and closed by that paragraph's end. */
  droppable: boolean;
}

interface OpenTag {
  entry: OpenElement | null;
  name: string;
  inline: boolean;
  quote: number;
  last: number;
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
  if (src === '') return { chunks: [] };
  const lines = src.split('\n');
  const n = lines.length;

  // Pass 1 — which lines are inside a list, and which blanks a list or an
  // indented code line vetoes. A line is inside a list when it is a marker
  // itself, a lazy continuation (no blank since a listish line), or an
  // indented continuation after a blank.
  const listish = new Uint8Array(n);
  const vetoBefore = new Uint8Array(n);
  {
    let prevListish = false;
    let prevNonBlank = -1;
    for (let i = 0; i < n; i++) {
      const line = lines[i] as string;
      if (line.trim() === '') continue;
      const indent = indentOf(line);
      const blankBetween = i > prevNonBlank + 1;
      const inList: boolean =
        LIST_RE.test(line) || (prevListish && (!blankBetween || indent >= 2));
      listish[i] = inList ? 1 : 0;
      if (indent >= 4 || (inList && prevListish)) vetoBefore[i] = 1;
      prevListish = inList;
      prevNonBlank = i;
    }
  }

  // Pass 2 — per blank line: outside every fence, and with nothing the HTML
  // parser would still hold open (the header's model of parse5's stack).
  const cuttable = new Uint8Array(n);
  const stack: OpenElement[] = [];
  let fence: string | null = null;
  let fenceAnyIndent = false;
  let pre = false;
  let raw = null as RegExp | null;
  let rawInline = false;
  let comment = null as 'block' | 'inline' | null;
  let tag = null as OpenTag | null;
  let ticks = 0;
  let htmlBlock = false;
  let prevBlank = true;
  let prevCode = false;
  let prevEndsBlock = false;

  const popTo = (k: number, only: boolean): void => {
    if (only) {
      stack.splice(k, 1);
      return;
    }
    // Everything above goes too, except a formatting element, which the
    // adoption agency reconstructs into what follows.
    const kept = stack.slice(k + 1).filter((e) => FORMATTING.has(e.name));
    stack.length = k;
    stack.push(...kept);
  };
  const closeP = (): void => {
    for (let k = stack.length - 1; k >= 0; k--) {
      const e = stack[k] as OpenElement;
      if (e.name === 'p') {
        popTo(k, false);
        return;
      }
      if (BUTTON_SCOPE.has(e.name)) return;
    }
  };
  const open = (name: string, inline: boolean): OpenElement | null => {
    if (VOID.has(name)) return null;
    if (P_CLOSERS.has(name)) closeP();
    const entry = { name, droppable: inline && !SPECIAL.has(name) && !FORMATTING.has(name) };
    stack.push(entry);
    return entry;
  };
  const close = (name: string, inline: boolean): void => {
    if (VOID.has(name)) return;
    const ordinary = !SPECIAL.has(name) && !FORMATTING.has(name);
    // Inside a paragraph parse5 meets the paragraph's own element (special)
    // before any element outside it, so an ordinary end tag there closes
    // nothing that outlives the paragraph.
    if (inline && ordinary) return;
    const scope = TABLE_PARTS.has(name) ? TABLE_SCOPE : SCOPE;
    for (let k = stack.length - 1; k >= 0; k--) {
      const e = stack[k] as OpenElement;
      if (e.name === name) {
        popTo(k, FORMATTING.has(name));
        return;
      }
      if (scope.has(e.name) || (ordinary && SPECIAL.has(e.name))) return;
    }
  };
  /** A start tag has ended: a self-closed foreign element closes, raw text begins. */
  const finishTag = (t: OpenTag, selfClosed: boolean): void => {
    if (t.entry === null) return;
    const foreign = t.name === 'svg' || t.name === 'math' || stack.some((e) => e !== t.entry && (e.name === 'svg' || e.name === 'math'));
    if (selfClosed && foreign) {
      const k = stack.lastIndexOf(t.entry);
      if (k >= 0) stack.splice(k, 1);
      return;
    }
    if (RAWTEXT.has(t.name)) {
      raw = t.name === 'plaintext' ? /(?!)/ : new RegExp(`</${t.name}(?=[\\s/>]|$)`, 'i');
      rawInline = t.inline;
    }
  };
  /** Where the uncertain half of a line is read: what OPENS counts, what closes does not. */
  const opensOnly = (text: string, inline: boolean): void => {
    for (const m of text.matchAll(/<([A-Za-z][A-Za-z0-9-]*)(?=[\s/>]|$)/g)) {
      open((m[1] as string).toLowerCase(), inline);
    }
  };

  const scan = (line: string, inline: boolean): void => {
    const len = line.length;
    let i = 0;
    while (i < len) {
      if (raw !== null) {
        const at = line.slice(i).search(raw);
        if (at < 0) return;
        stack.pop();
        raw = null;
        // The end tag's own `>` is found as the rest of a tag.
        tag = { entry: null, name: '', inline, quote: 0, last: 0 };
        i += at + 2;
        continue;
      }
      if (tag !== null) {
        let k = i;
        for (; k < len; k++) {
          const c = line.charCodeAt(k);
          if (tag.quote !== 0) {
            if (c === tag.quote) tag.quote = 0;
            continue;
          }
          if ((c === 34 || c === 39) && tag.last === 61) tag.quote = c;
          else if (c === 62) break;
          if (c !== 32 && c !== 9) tag.last = c;
        }
        if (k >= len) return;
        const done = tag;
        tag = null;
        finishTag(done, done.last === 47);
        i = k + 1;
        continue;
      }
      if (comment !== null) {
        const at = line.indexOf('-->', i);
        if (comment === 'inline') opensOnly(line.slice(i, at < 0 ? len : at), inline);
        if (at < 0) return;
        comment = null;
        i = at + 3;
        continue;
      }
      if (ticks > 0) {
        const at = findTicks(line, i, ticks);
        opensOnly(line.slice(i, at < 0 ? len : at), inline);
        if (at < 0) return;
        i = at + ticks;
        ticks = 0;
        continue;
      }
      const c = line.charCodeAt(i);
      if (inline && c === 96) {
        let r = i;
        while (r < len && line.charCodeAt(r) === 96) r++;
        const at = findTicks(line, r, r - i);
        if (at < 0) {
          ticks = r - i;
          i = r;
        } else {
          i = at + (r - i);
        }
        continue;
      }
      if (inline && c === 92) {
        i += 2;
        continue;
      }
      if (c !== 60) {
        i++;
        continue;
      }
      if (line.startsWith('<!--', i)) {
        const at = line.indexOf('-->', i + 2);
        if (at >= 0) {
          i = at + 3;
        } else {
          comment = inline ? 'inline' : 'block';
          i += 4;
        }
        continue;
      }
      if (inline) {
        INLINE_CLOSE_RE.lastIndex = i;
        const cm = INLINE_CLOSE_RE.exec(line);
        if (cm !== null) {
          close((cm[1] as string).toLowerCase(), true);
          i = INLINE_CLOSE_RE.lastIndex;
          continue;
        }
        INLINE_OPEN_RE.lastIndex = i;
        const om = INLINE_OPEN_RE.exec(line);
        if (om !== null) {
          const name = (om[1] as string).toLowerCase();
          finishTag({ entry: open(name, true), name, inline, quote: 0, last: 0 }, om[0].endsWith('/>'));
          i = INLINE_OPEN_RE.lastIndex;
          continue;
        }
      }
      START_RE.lastIndex = i;
      const sm = START_RE.exec(line);
      if (sm === null) {
        i++;
        continue;
      }
      const name = (sm[2] as string).toLowerCase();
      if (sm[1] === '/') {
        // An end tag markdown-it could not read whole on this line is not
        // counted; one in an HTML block is, and its rest is skipped.
        if (!inline) close(name, false);
        tag = { entry: null, name: '', inline, quote: 0, last: 0 };
      } else {
        tag = { entry: open(name, inline), name, inline, quote: 0, last: 0 };
      }
      i = START_RE.lastIndex;
    }
  };

  for (let i = 0; i < n; i++) {
    const line = lines[i] as string;
    if (fence !== null) {
      if (closesFence(line, fence, fenceAnyIndent)) {
        fence = null;
        prevEndsBlock = true;
      }
      prevBlank = false;
      prevCode = false;
      continue;
    }
    const blank = line.trim() === '';
    // Inside something parse5 is still reading as one piece — raw text, a
    // comment, a tag whose `>` has not come — or inside a <pre> HTML block,
    // no markdown rule applies to the line.
    const swallowed = raw !== null || comment === 'block' || (tag !== null && !tag.inline);
    if (swallowed || pre) {
      if (!blank) scan(line, swallowed ? (raw !== null ? rawInline : tag?.inline ?? false) : false);
      if (pre && /<\/pre>/i.test(line)) pre = false;
      prevBlank = blank;
      prevCode = false;
      prevEndsBlock = false;
      continue;
    }
    if (blank) {
      // A paragraph's end closes what it opened that is neither special nor
      // formatting, and what markdown-it could not read as a tag was text.
      if (tag !== null && tag.inline) {
        if (tag.entry !== null) {
          const k = stack.lastIndexOf(tag.entry);
          if (k >= 0) stack.splice(k, 1);
        }
        tag = null;
      }
      for (let k = stack.length - 1; k >= 0; k--) if ((stack[k] as OpenElement).droppable) stack.splice(k, 1);
      if (comment === 'inline') comment = null;
      ticks = 0;
      htmlBlock = false;
      cuttable[i] = stack.length === 0 ? 1 : 0;
      prevBlank = true;
      prevCode = false;
      prevEndsBlock = false;
      continue;
    }
    const indent = indentOf(line);
    const inList = listish[i] === 1;
    const startsBlock = prevBlank || prevEndsBlock || i === 0;
    if (!htmlBlock && indent >= 4 && !inList && (startsBlock || prevCode)) {
      // Indented code: nothing on the line is a tag, and it opens <pre>.
      if (startsBlock) closeP();
      prevBlank = false;
      prevCode = true;
      prevEndsBlock = false;
      continue;
    }
    if (!htmlBlock) {
      const fm = (inList ? LIST_FENCE_RE : FENCE_RE).exec(line);
      if (fm !== null) {
        closeP();
        fence = fm[1] as string;
        fenceAnyIndent = inList;
        prevBlank = false;
        prevCode = false;
        continue;
      }
      if (HTML_BLOCK_RE.test(line)) {
        htmlBlock = true;
        pre = HTML_PRE_RE.test(line) && !HTML_PRE_END_RE.test(line);
      } else if (ATX_RE.test(line) || /^ {0,3}>/.test(line) || (startsBlock && !REF_DEF_RE.test(line))) {
        // The block's first tag closes an open <p>: a heading, a quote, or
        // any block a blank line starts except a definition, which draws
        // nothing.
        closeP();
      }
    }
    scan(line, !htmlBlock);
    prevBlank = false;
    prevCode = false;
    prevEndsBlock = !htmlBlock && ATX_RE.test(line);
  }
  for (let i = 0; i < n; i++) {
    if (vetoBefore[i] !== 1) continue;
    for (let j = i - 1; j >= 0 && (lines[j] as string).trim() === ''; j--) cuttable[j] = 0;
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
  return { chunks };
}

/** The texts the windowed renderer parses: each chunk's slice of the source. */
export function chunkTexts(src: string, plan: ChunkPlan): string[] {
  return plan.chunks.map((c) => src.slice(c.start, c.end));
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
