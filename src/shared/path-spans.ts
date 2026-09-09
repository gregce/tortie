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
 * ## REFUSAL 8 LIVES HERE, and it is not lifted
 *
 * A span that touches either end of its row is never offered, because a span
 * that runs off the edge of a row is a span whose end we do not know. Research
 * 111 section 4 measured what lifting it would cost and put the decision to
 * the operator; he has not taken it, so the rule stands exactly as research
 * 111 measured it, which is the spelling in `edgeRefusal` below.
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
 * REFUSAL 8, spelled exactly as research 111 measured it.
 *
 * `atRightEdge` is the span ending where the row's drawn text ends, which is
 * the only place a terminal wrap or a program's own break can have taken the
 * rest of the path. `atHead` is the span starting at the row's first content
 * cell, past any gutter, AND the row above ending in a character a path can
 * continue with — which is the other half of the same split. The
 * previous-row clause is part of the measurement: without it every span that
 * happens to open a row would be refused, which refuses a great deal that
 * cannot have been wrapped.
 *
 * Research 111 section 4.1 measured this spelling at 78 of 388 file spans
 * refused to prevent 7 wrong opens, and measured a tighter one at 34. The
 * tighter one is a LIFT and it is the operator's to take.
 */
export function edgeRefusal(
  span: PathSpan,
  row: string,
  rowAbove: string | null
): boolean {
  if (span.end === row.length) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  if (rowAbove === null || rowAbove.length === 0) return false;
  return PATH_CHARACTER.test(rowAbove[rowAbove.length - 1] ?? '');
}

/**
 * Every span in one row worth asking main about.
 *
 * `rowAbove` is the drawn text of the row above, or null when there is none.
 * Both rows are the row's TEXT with trailing whitespace removed, which is what
 * `tmux capture-pane` prints and what `translateToString(true)` answers, so
 * the two instruments agree about where a row ends.
 */
export function pathSpansInRow(row: string, rowAbove: string | null): PathSpan[] {
  const out: PathSpan[] = [];
  for (const span of tokensInRow(row)) {
    if (!looksLikePath(span.text)) continue;
    if (edgeRefusal(span, row, rowAbove)) continue;
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
