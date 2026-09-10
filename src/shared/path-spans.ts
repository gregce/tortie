/**
 * WHICH RUNS OF TEXT IN A TERMINAL ROW ARE WORTH ASKING ABOUT (Phase 247).
 *
 * Pure, and deliberately separate from ./path-doors.ts: this decides what to
 * ASK, and that decides what a click may reach. Nothing here touches the
 * filesystem and nothing here is a security boundary — a span that survives
 * this grammar is a candidate and no more.
 *
 * ## It is research 107's own detector B, ported rather than reinvented
 *
 * `build/p245/corpus-scan.mjs` holds `tokenizeB`, `looksPathB` and
 * `normalise`, and every rate in research 107 and research 111 was measured
 * through them: a 40.0% false-positive rate for the generous maximal-run
 * regex, 0 of 45 hand-marked for this one. The port is line for line so the
 * numbers those documents publish are numbers about the shipping code, and
 * `npm run conformance:pathdoors` drives the two side by side over the same
 * rows to keep it that way.
 *
 * ## REFUSAL 8 LIVES HERE, AND PHASE 250 NARROWED IT TO WHAT IT WAS WRITTEN FOR
 *
 * It exists for a path that RUNS OFF the edge of a row, because such a span's
 * end is unknown. As Phase 247 shipped it, it refused every span that was the
 * LAST THING ON ITS ROW — which is where an agent almost always prints a path,
 * at the end of an ordinary sentence, nowhere near the pane's width.
 *
 * The operator found that an hour after it shipped: a Claude Code session
 * printing an absolute, existing README on a line of its own, not clickable.
 * Research 114 measured what the two refusals leave when they are multiplied
 * together over his own 29 live panes and 59,791 rows — **195 spans of the
 * 7,359 the grammar yields, 2.6%** — and priced this clause at **77 of the 272
 * absolute spans whose realpath reaches a door**.
 *
 * So it is spelled as the shape a wrap can actually take:
 *
 *   - the span's last cell is the pane's LAST COLUMN; or
 *   - the span starts a row whose PREDECESSOR filled its own last column AND
 *     ended on a character a path can continue with.
 *
 * That refuses **3 of the same 272**, and the protection is intact: it still
 * refuses 205 spans for reaching the last column and tmux's own `-J` capture
 * confirms 139 of them (67.8%) really are one line with their neighbour.
 * **A WRAPPED PATH STAYS REFUSED** — research 111 section 4.2 measured that of
 * the joins that look right tmux confirms only 18 of 57, so nothing here ever
 * rejoins two rows.
 *
 * ### The padding, which is why this is not research 111 section 4.1's spelling
 *
 * That document named a tighter rule and priced it at 34 file spans. Re-derived
 * over the same corpus it refuses **41 of 272**, five times what the spelling
 * above refuses, and the difference is one clause: it reads the predecessor's
 * RAW length, trailing spaces included. **32.2% of his rows — 19,237 of 59,791
 * — carry trailing whitespace out to the pane's width while their drawn
 * content stops short**, and every one of those reads as a wrap under the raw
 * length. So the predecessor is measured by its DRAWN content, which is what
 * `translateToString(true)` and `tmux capture-pane` both hand back.
 *
 * ### Two limits of any column rule, stated rather than hidden
 *
 * **The width is today's and the scrollback was written at yesterday's.** A row
 * written while the pane was narrower carries its wrap from then, and
 * `IBufferLine.length` may exceed `Terminal.cols` after a resize, which is why
 * the comparison below is against `cols` and never against the row's length.
 * **And a column is not a string index**, which is what `cellColumns` exists
 * for: the span's end column is read out of that map and never guessed.
 */

/** Brackets a person's eye strips for free at the head of a token. */
const OPEN = new Set(["'", '"', '`', '(', '[', '{', '<', '‘', '“', '«']);

/** ...and at the tail, where sentence punctuation joins them. */
const CLOSE = new Set([
  "'",
  '"',
  '`',
  ')',
  ']',
  '}',
  '>',
  ',',
  ';',
  '.',
  ':',
  '!',
  '?',
  '’',
  '”',
  '»'
]);

/** What one segment of a path may be spelled with. */
const SEGMENT = /^[A-Za-z0-9._@%+~$-]+$/;

/**
 * The gutter a TUI draws down the left of its own continuation rows. Codex
 * writes one; so do Claude Code's tool blocks. It is stripped only to find
 * where a row's content begins, never to join two rows: research 111 section
 * 4.2 measured that a gutter-stripping glue reconstructs a file that really
 * exists 57 times and tmux confirms 18 of them, so 68.4% of the joins that
 * look right are joins that never happened.
 */
const GUTTER = /^(?:\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;

/** A character a path can continue with, for the row-head half of refusal 8. */
const PATH_CHARACTER = /[A-Za-z0-9._@%+~$/-]/;

/** One candidate span, with the columns it occupies in its row. */
export interface PathSpan {
  /** The token as it is drawn, which is what gets underlined. */
  text: string;
  /** Column of the first cell, 0-based. */
  start: number;
  /** Column one past the last cell, 0-based. */
  end: number;
  /**
   * The token with `file://`, a `:line[:col]` suffix and nothing else
   * stripped. A leading `~` is LEFT ALONE: expanding it needs a home
   * directory, main has one and the renderer does not, and the renderer's job
   * here is only to decide what is worth asking about.
   */
  target: string;
  /** The `:line` suffix, when the token carried one. */
  line?: number;
}

/**
 * Tokenise on whitespace and strip the decoration a person's eye strips.
 *
 * Ported from `tokenizeB`. The columns are adjusted as the head is stripped,
 * so `start` still names the cell the first surviving character sits in.
 */
export function tokensInRow(row: string): PathSpan[] {
  const out: PathSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(row)) !== null) {
    let text = m[0];
    let start = m.index;
    while (text.length > 0 && OPEN.has(text[0] ?? '')) {
      text = text.slice(1);
      start += 1;
    }
    while (text.length > 0 && CLOSE.has(text[text.length - 1] ?? '')) {
      text = text.slice(0, -1);
    }
    if (text.length === 0) continue;
    out.push({ text, start, end: start + text.length, target: text });
  }
  return out;
}

/** Ported from `looksPathB`: is this token spelled like a path at all? */
export function looksLikePath(token: string): boolean {
  let t = token;
  if (t.startsWith('file://')) t = t.slice(7);
  const lc = /^(.*?):(\d+)(?::(\d+))?$/.exec(t);
  if (lc !== null && (lc[1] ?? '').includes('/')) t = lc[1] ?? '';
  if (!t.includes('/')) return false;
  // a URL of some scheme — WebLinksAddon is registered first and owns those
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return false;
  // 171/383, a fraction, which a transcript of a progress meter is full of
  if (/^\d+\/\d+$/.test(t)) return false;
  const segs = t.split('/');
  const body = ['', '~', '.', '..'].includes(segs[0] ?? '')
    ? segs.slice(1)
    : segs;
  if (body.length === 0) return false;
  return body.every((s) => s === '' || SEGMENT.test(s));
}

/** Ported from `normalise`: strip the decoration and keep the line number. */
export function stripDecoration(token: string): { target: string; line?: number } {
  let p = token;
  if (p.startsWith('file://')) p = p.slice(7);
  const lc = /^(.*?):(\d+)(?::(\d+))?$/.exec(p);
  if (lc !== null && (lc[1] ?? '').includes('/')) {
    p = lc[1] ?? '';
    const n = Number.parseInt(lc[2] ?? '', 10);
    if (Number.isFinite(n) && n > 0) return { target: p, line: n };
  }
  return { target: p };
}

/**
 * WHAT REFUSAL 8 NEEDS BESIDES THE ROW ITSELF (Phase 250).
 *
 * All four are facts the renderer already has or already builds. Nothing here
 * is `isWrapped`, which research 107 measured lying in both directions: it is
 * true for a shell's own wrap, false when the PROGRAM broke the line, and
 * false again once the row has been scrolled back into view.
 */
export interface RowEdges {
  /**
   * The pane's width in columns — `Terminal.cols`, never the row's length.
   * `IBufferLine.length` may exceed the width after a resize, which xterm's
   * own typings say.
   */
  width: number;
  /**
   * String index -> cell column for THIS row, from `cellColumns(line)`. The
   * entry one past the end holds the column one past the row, so the column
   * one past a span's last cell is `columns[span.end]`.
   */
  columns: number[];
  /**
   * The row above as it is DRAWN — trailing whitespace already gone, which is
   * what `translateToString(true)` and `tmux capture-pane` both answer — or
   * null when there is no row above.
   */
  above: string | null;
  /**
   * Column one past the row above's last DRAWN glyph, from that row's own
   * `cellColumns` map. 0 when there is no row above.
   */
  aboveEnd: number;
}

/**
 * REFUSAL 8, narrowed by Phase 250 to the shape a wrap can actually take.
 *
 * Clause one is the span whose last cell IS the pane's last column, which is
 * the only shape a terminal wrap can take. Clause two is the other half of the
 * same split: a span starting the row's first content cell, past any gutter,
 * below a predecessor that filled its own last column AND ended on a character
 * a path can continue with.
 *
 * **The predecessor is measured by its DRAWN content and never by its raw
 * length**, because 32.2% of the operator's rows are padded out to the pane
 * width with spaces their drawn text does not reach; see the module header.
 *
 * A span whose end column cannot be read from the map is REFUSED, which is the
 * same direction `spanColumns` fails in: a map that does not cover a span
 * cannot say where the span ends, and a span whose end is unknown is exactly
 * what this refusal is for.
 */
export function edgeRefusal(
  span: PathSpan,
  row: string,
  edges: RowEdges
): boolean {
  const endColumn = edges.columns[span.end];
  if (endColumn === undefined) return true;
  if (endColumn >= edges.width) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  const above = edges.above;
  if (above === null || above.length === 0) return false;
  if (edges.aboveEnd < edges.width) return false;
  return PATH_CHARACTER.test(above[above.length - 1] ?? '');
}

/**
 * Every span in one row worth asking main about.
 *
 * `row` is the row's TEXT with trailing whitespace removed, which is what
 * `tmux capture-pane` prints and what `translateToString(true)` answers, so
 * the two instruments agree about where a row ends. `edges` carries the width
 * and the two column maps refusal 8 reads; see `RowEdges`.
 */
export function pathSpansInRow(row: string, edges: RowEdges): PathSpan[] {
  const out: PathSpan[] = [];
  for (const span of tokensInRow(row)) {
    if (!looksLikePath(span.text)) continue;
    if (edgeRefusal(span, row, edges)) continue;
    const { target, line } = stripDecoration(span.text);
    if (target.length === 0) continue;
    out.push({ ...span, target, ...(line !== undefined ? { line } : {}) });
  }
  return out;
}

/**
 * A ROW'S STRING INDICES ARE NOT ITS CELL COLUMNS (Phase 247 fix round).
 *
 * `IBufferLine.translateToString` walks CELLS and appends each cell's
 * characters, advancing the column by the cell's WIDTH while the string grows
 * by however many UTF-16 units that cell holds. The two only agree when every
 * cell holds exactly one unit and occupies exactly one column, which is true
 * of pure ASCII and of nothing else. xterm knows this — the core
 * `BufferLine.translateToString` takes a fourth `outColumns` argument for its
 * own accessibility tree, and the PUBLIC `IBufferLine` drops it, which is why
 * a caller has to build the map itself.
 *
 * Measured against the shipping `@xterm/xterm` 6.0.0 at the app's own options,
 * over 24 glyphs a transcript really carries: **12 of them move the column**.
 * `⚠️ ✔️ ❗️ ▶️ ☑️ 🔧 🎉 📝 🚀` and a decomposed `é` each shift it by -1, a
 * CJK character by +1, and a zero-width-joined family sequence by -3, while
 * `⏺ ⎿ │ └ ├ ✅ ❌ ✨ → … •` shift it by 0. `⚠️ ` in front of a path is
 * ORDINARY agent output, and with the string index used as a column the
 * underline is drawn one cell to the left of the path: the first character of
 * the path is dead and the cell after its end hands the file over. Nothing
 * dangerous can execute either way, because the door sequence decides what
 * opens — but by refusal 2's own words a link on the wrong text is worse than
 * no link.
 *
 * This is the map, and it is xterm's own arithmetic read out of the shipping
 * bundle rather than a model of it: index `i` holds the 0-based column the
 * character at string index `i` is drawn in, and the entry one past the end
 * holds the column one past the row. A null cell contributes one character
 * (xterm's `WHITESPACE_CELL_CHAR`) and a zero width is advanced as one, which
 * is the `e >> 22 || 1` in `BufferLine.translateToString`.
 */
export interface RowCell {
  getChars(): string;
  getWidth(): number;
}

/** The shape of `IBufferLine` this needs, so nothing here imports xterm. */
export interface RowCells {
  readonly length: number;
  getCell(x: number): RowCell | undefined;
}

/** String index -> 0-based cell column, plus the column one past the row. */
export function cellColumns(line: RowCells): number[] {
  const out: number[] = [];
  let x = 0;
  while (x < line.length) {
    const cell = line.getCell(x);
    if (cell === undefined) break;
    const chars = cell.getChars();
    const units = chars.length === 0 ? 1 : chars.length;
    for (let i = 0; i < units; i += 1) out.push(x);
    const width = cell.getWidth();
    x += width === 0 ? 1 : width;
  }
  out.push(x);
  return out;
}

/**
 * The columns one span occupies, as xterm's own 1-based INCLUSIVE range.
 *
 * `null` when the map does not reach the span, which happens only when
 * `getCell` stopped answering part way along the row. A link drawn from a map
 * that does not cover it would be a link on the wrong text, so there is none.
 */
export function spanColumns(
  span: Pick<PathSpan, 'start' | 'end'>,
  columns: number[]
): { start: number; end: number } | null {
  const first = columns[span.start];
  const past = columns[span.end];
  if (first === undefined || past === undefined) return null;
  return { start: first + 1, end: past };
}
