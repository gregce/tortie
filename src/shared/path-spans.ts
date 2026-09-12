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
 *
 * ## THE BUFFER THIS GRAMMAR READS IS THE VISIBLE SCREEN OF A TMUX CLIENT
 *
 * (Phase 253, research 115 §4.) The pane's xterm is a tmux client parked in
 * the ALTERNATE buffer, so it holds exactly the visible screen and the
 * scrollback lives in tmux: a wrapped line scrolled off the screen leaves
 * **zero rows in this buffer to rejoin** (probe arm 3), and the resize-reflow
 * and copy-mode repaints an on-screen row routinely passes through leave
 * `isWrapped` flags that are present and WRONG — a flag-join over them
 * produces a string that is not the path (arms 4 and 5). VS Code's
 * `isWrapped` walk works because its xterm OWNS the scrollback; ours has no
 * scrollback to walk. So nothing here ever rejoins two rows, and a later
 * round tempted to port that walk re-reads research 115 §4 before it
 * re-derives arm 3.
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

/**
 * What one segment of a path may be spelled with.
 *
 * PHASE 253 added `[` and `]` — a Next.js route is `/pages/[slug].tsx` and VS
 * Code's own test rows carry `/foo/[bar].baz` (`ExcludedStartPathCharactersClause`
 * excludes them at a path START and allows them inside, terminalLinkParsing.ts:351
 * at microsoft/vscode 770a9bced0e6eff10342b2d95d7cfd98c33b85ed). Every other
 * character their clause admits and ours refuses was measured at ZERO
 * door-reaching spans over 101,329 rows of the operator's own panes (research
 * 115 §3): `=` would underline every `--flag=path`, `…` is a truncation that is
 * never on disk, and `{ } ^ # |` reach nothing. They stay refused.
 */
const SEGMENT = /^[A-Za-z0-9._@%+~$[\]-]+$/;

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
  /**
   * Column one past the last underlined cell, 0-based. PHASE 253: for a
   * grep-style token (`path:12:matched text`) this stops after the line
   * suffix, so the match text an instrument attached is never underlined —
   * `pathSpansInRow` trims it to `start + visible` from `stripDecoration`.
   */
  end: number;
  /**
   * The token with `file://`, a line/column suffix and nothing else stripped.
   * A leading `~` is LEFT ALONE: expanding it needs a home directory, main
   * has one and the renderer does not, and the renderer's job here is only to
   * decide what is worth asking about.
   */
  target: string;
  /** The line suffix, when the token carried one. */
  line?: number;
}

/**
 * A TRAILING `)` OR `]` THAT AN OPENER INSIDE THE TOKEN MATCHES IS KEPT
 * (Phase 253).
 *
 * tsc prints `src/x.ts(12,34): error TS…` and a Next.js route ends in
 * `[slug]`, and the CLOSE strip used to eat the closer off both — so the tsc
 * suffix could never match and `/foo/[bar]` arrived as `/foo/[bar`. The rule
 * is one balance test: the last character stays when the body holds more of
 * its opener than of it. `(docs/x.md)` still sheds its wrapping parens,
 * because the OPEN strip took the `(` first and the body then holds none.
 */
const PAIRED_OPENER: Readonly<Record<string, string>> = { ')': '(', ']': '[' };

function keepsTrailingCloser(text: string): boolean {
  const closer = text[text.length - 1] ?? '';
  const opener = PAIRED_OPENER[closer];
  if (opener === undefined) return false;
  let opens = 0;
  let closes = 0;
  for (let i = 0; i < text.length - 1; i += 1) {
    if (text[i] === opener) opens += 1;
    else if (text[i] === closer) closes += 1;
  }
  return opens > closes;
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
      if (keepsTrailingCloser(text)) break;
      text = text.slice(0, -1);
    }
    if (text.length === 0) continue;
    out.push({ text, start, end: start + text.length, target: text });
  }
  return out;
}

/**
 * THE SUFFIX TABLE, NARROWED TO THE DELIMITED CLAUSES (Phase 253).
 *
 * Ported and NARROWED from microsoft/vscode at
 * 770a9bced0e6eff10342b2d95d7cfd98c33b85ed,
 * src/vs/workbench/contrib/terminalContrib/links/browser/terminalLinkParsing.ts
 * `generateLinkSuffixRegex` — clause 1 (the `:`-delimited family) and clause 3
 * (the `()`/`[]` family), anchored at TOKEN level where theirs runs globally
 * over the row. Research 115 §2 measured what each clause is worth over
 * 101,329 rows of the operator's own panes:
 *
 *   - `GREP_SUFFIX` reads `path:12`, `path:12:34` (as before), and now
 *     `path:12:matched text` — grep, ripgrep and half the build tools attach
 *     the match without whitespace, 114 door-reaching spans — plus the range
 *     forms `path:12-14` and `path:12:34-56` (2 spans, both resolving). The
 *     trailing `(:.*)` remainder is captured so the underline can stop before
 *     it; see `stripDecoration`'s `visible`.
 *   - `TSC_SUFFIX` reads `path(12,34)`, `path(12)`, `path(12:34)`, `path[12]`
 *     and `path[12,34]` — the TypeScript compiler's own error format, 23 of 23
 *     spans in the corpus resolving.
 *
 * **What is refused, with its price attached** (research 115 §2.3): the bare
 * space clause (`path 339`) admits 4,783 spans for 17 doors and would attach a
 * number that is not a line to 190 links that already work; the verbal clause
 * (`"path", line 339`, `on line 339`) is all pathOnly here — the tokenizer
 * already strips the quotes and comma, so only the landing line is lost, at 0
 * refused door-reaching spans. Neither ships.
 */
const GREP_SUFFIX = /^(.*?):(\d+)(?:-\d+)?(?::(\d+)(?:-\d+)?)?(:.*)?$/;
const TSC_SUFFIX = /^(.*?)[([](\d+)(?:[,:] ?(\d+))?[)\]]$/;

/**
 * A SLASHLESS TOKEN THAT IS VISIBLY A FILENAME (Phase 253, research 115 §5).
 *
 * `README.md` said bare is the third family the operator's corpus holds:
 * 8,828 occurrences over 994 distinct tokens, 328 matching exactly one
 * project file, and the names are manifest names — README.md, Makefile,
 * package.json, CLAUDE.md. VS Code reaches them through a workspace SEARCH
 * opener; Tortie adopts the CHEAP design instead — admit the token to the
 * grammar and let lift two's existing base-join resolve it, 272 occurrences
 * over 42 files for near-zero mechanism, no new question, no new channel.
 *
 * The grammar is the filter, and it is deliberately about FILENAMES and never
 * "any word", because our opener opens files where theirs opens a search: a
 * lettered stem, one dot, a 1–8 character lettered extension, or one of the
 * six extensionless specials. A version (`1.2.3`, `v0.102.0`), an all-digit
 * shape, a plain word and a SINGLE-DOT dotfile (`.env`, `.gitignore`,
 * `.npmrc`, `.DS_Store`) all stay refused; a domain-shaped token
 * (`github.com`) passes the shape test and is refused by nothing extra —
 * measured at 92 occurrences and 0 matching any project file, the join's
 * `lstat` answers `missing` for every one.
 *
 * A MULTI-DOT DOTFILE PASSES THE SHAPE TEST, and Phase 261 corrected this
 * sentence rather than the code, because a sentence wider than its code is
 * the class this repository's own conventions forbid. `lastIndexOf('.')` is 0
 * for `.env` and the extension test below needs a stem, which is what refuses
 * the single-dot family; it is POSITIVE for `.env.local` and
 * `.eslintrc.json`, so both are admitted. That is right for the second, which
 * is a file a person clicking it means to open, and harmless for the first,
 * which `decidePathDoor` refuses at step 5 as `secret-name` before any door
 * — `src/shared/preview-types.ts` matches `.env` and anything opening
 * `.env.`. `src/shared/__tests__/p247-path-spans.test.ts` pins both halves
 * and the refusal, so the sentence cannot widen away from the code again.
 */
const BARE_SPECIALS = new Set([
  'Makefile',
  'Dockerfile',
  'LICENSE',
  'NOTICE',
  'README',
  'CHANGELOG'
]);

export function bareFileShaped(token: string): boolean {
  if (token.includes('/')) return false;
  if (BARE_SPECIALS.has(token)) return true;
  if (!/^[A-Za-z0-9._@+-]{3,64}$/.test(token)) return false;
  // a version, a number, a date
  if (/^[\d.,_-]+$/.test(token)) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const ext = token.slice(dot + 1);
  if (!/^[A-Za-z][A-Za-z0-9]{0,7}$/.test(ext)) return false;
  const stem = token.slice(0, dot);
  return /[A-Za-z]/.test(stem);
}

/**
 * May this head carry a line suffix? A path with a slash, or a bare token
 * that is visibly a filename — so `Makefile:12` reads as line 12 while a
 * timestamp's `14:23:07` never enters the suffix grammar at all.
 */
function suffixHead(head: string): boolean {
  return head.includes('/') || bareFileShaped(head);
}

/** Ported from `looksPathB`: is this token spelled like a path at all? */
export function looksLikePath(token: string): boolean {
  const t = stripDecoration(token).target;
  // PHASE 253: a slashless token is a candidate when it is visibly a
  // filename, resolved exactly as lift two already resolves `docs/x.md`.
  if (!t.includes('/')) return bareFileShaped(t);
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

/**
 * Ported from `normalise`: strip the decoration, keep the line number, and
 * say how much of the token is DRAWN as the link.
 *
 * `visible` is the length of the token up to the end of its line/column
 * suffix — everything except a grep remainder — so `pathSpansInRow` can trim
 * the span's `end` and the underline never covers the matched text an
 * instrument attached. For a token with no suffix it is the whole token.
 */
export function stripDecoration(token: string): {
  target: string;
  line?: number;
  visible: number;
} {
  let p = token;
  let prefix = 0;
  if (p.startsWith('file://')) {
    p = p.slice(7);
    prefix = 7;
  }
  const grep = GREP_SUFFIX.exec(p);
  if (grep !== null && suffixHead(grep[1] ?? '')) {
    const remainder = grep[4] ?? '';
    const visible = prefix + p.length - remainder.length;
    const n = Number.parseInt(grep[2] ?? '', 10);
    if (Number.isFinite(n) && n > 0) {
      return { target: grep[1] ?? '', line: n, visible };
    }
    return { target: grep[1] ?? '', visible };
  }
  const tsc = TSC_SUFFIX.exec(p);
  if (tsc !== null && suffixHead(tsc[1] ?? '')) {
    const n = Number.parseInt(tsc[2] ?? '', 10);
    if (Number.isFinite(n) && n > 0) {
      return { target: tsc[1] ?? '', line: n, visible: token.length };
    }
    return { target: tsc[1] ?? '', visible: token.length };
  }
  return { target: p, visible: token.length };
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
   * `cellColumns` map. 0 when there is no row above, and **null when there IS
   * one and its end column could not be read** — which the refusal below
   * treats as a wrap, because that is the direction its other unknown falls
   * in. See `edgeRefusal`.
   */
  aboveEnd: number | null;
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
 *
 * **AND SO IS A PREDECESSOR WHOSE OWN END COLUMN COULD NOT BE READ** (the fix
 * round). Both halves of this function ask a column map a question it may not
 * be able to answer, and until now they fell in OPPOSITE directions: clause
 * one refused on `undefined` while the head clause read a missing `aboveEnd`
 * as 0, which is smaller than any width, which admitted the span. A refusal
 * whose two halves disagree about which way to fall is one that will be
 * simplified in the wrong direction later, so the unknown is spelled `null`
 * and it refuses. It costs nothing measured — `cellColumns` covers every cell
 * `IBufferLine.length` claims — and it is reachable only if `getCell` stops
 * answering part way along a row, which is the one thing that would make the
 * head clause's arithmetic meaningless.
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
  if (edges.aboveEnd === null) return true;
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
    const { target, line, visible } = stripDecoration(span.text);
    if (target.length === 0) continue;
    // PHASE 253: the underline stops at the end of the line suffix, so a
    // grep remainder (`path:12:matched text`) is never drawn as part of the
    // link. Refusal 8 above was asked about the WHOLE token on purpose — a
    // token that runs off the pane's edge has an unknown end whatever part of
    // it would have been underlined.
    out.push({
      ...span,
      text: span.text.slice(0, visible),
      end: span.start + visible,
      target,
      ...(line !== undefined ? { line } : {})
    });
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
