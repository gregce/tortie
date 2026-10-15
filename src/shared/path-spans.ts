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
 * **A WRAPPED PATH STAYS REFUSED AS A ROW SPAN** — research 111 section 4.2
 * measured that of the joins that look right tmux confirms only 18 of 57, so
 * no row span ever reaches across its row's edge, and a glue that merely
 * resolves is never evidence. Phase 347 added the one way two rows ARE read as
 * one path, `joinedPathAt` at the end of this file, and it is not that glue:
 * it is offered only behind the door's own answer (the last section below).
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
 * scrollback to walk. So NOTHING HERE READS THE FLAG, and a later round
 * tempted to port that walk re-reads research 115 §4 before it re-derives
 * arm 3.
 *
 * ## WHAT PHASE 347 JOINS, AND WHY THAT DOES NOT CONTRADICT THE ABOVE
 *
 * Issue 40 is a path an agent broke ITSELF, before the last column, after a
 * `-` and after a `/` (rows of 45, 42 and 30 columns, which no soft wrap of
 * the same path gives at any width), and Codex breaks a long token the same
 * way. No flag is ever set on a row a program broke, so the flag could not
 * have been the proof even where it is right. `joinedPathAt` reads what
 * research 115 §4 found RIGHT after both repaints — the DRAWN rows, which are
 * tmux's own repaint — beside the pane's width, and a join must hold at
 * every boundary: J1 the upper row ends on a path character, J2 the lower
 * row's content starts with one (a row strictly inside holds one token), J3
 * the next unit could not have fitted on the upper row, so the break was
 * forced, J5 a folder's `/` above a bare name only at the last column, and
 * J7 an upper row that stops short of the last column only after a `/` or a
 * `-`, the only places a breaker breaks inside a path, so a word wrap below
 * a path that ends short is never glued to it; J6 refuses a join that starts
 * at the head of the buffer's first row or ends at the drawn end of its
 * last, where the rest of the path is in tmux's history or not yet printed
 * (arm 3, unchanged); J9 refuses a join WHOLE when a boundary it crosses or
 * stops at reads a cell past the pane's width (the row above it, any row it
 * covers, or the first piece of the row below it), because those cells are
 * what an earlier, wider pane left behind on xterm's alternate buffer and no
 * repaint drew, and a join cut at a boundary it cannot read may be a fragment
 * that opens another file (the Phase 347.1 fix round and his ruled round of
 * 2026-10-14); and two caps bound the work, refusing a longer join whole.
 * The caps, J9 and the governing rule below refuse a chain WHOLE, never a
 * shorter one: a shortened join is a fragment. J3, J5, J7 and J8 do not: a no
 * from one of them only STOPS the walk at that boundary, and `joinedPathAt`
 * answers the longest chain through the hovered row, so the rows on either
 * side of that boundary are chains of their own, and a chain can be a PIECE
 * of a longer printed path (build/p3471/SPEC.md D5 as his absolute-only round
 * corrected it; the section JOIN ABSOLUTE PATHS ONLY below says what keeps
 * such a piece from opening a file the screen does not name). THE LAST PROOF
 * IS THE DOOR, J4, the provider's: a join is offered
 * only when the door accepts the joined target, and a fragment's row span
 * gives way only to a join the door ACCEPTED, so where the door refuses the
 * join every row reads as it did.
 *
 * **AND THE GUARANTEE IS A CONSTRUCTION, NOT ONE MORE SHAPE** (Phase 347.1,
 * build/p3471/SPEC.md D2, his ruling of 2026-10-13). J1 to J8 are shape
 * rules, and two rounds of them still moved links that opened at the parent,
 * because a shape rule can only refuse the layouts somebody thought of. THE
 * GOVERNING RULE: A JOIN NEVER TAKES A CELL FROM A ROW SPAN THE DOOR ALREADY
 * ACCEPTS, judged over every row the join covers. `spansUnderJoin` answers,
 * for each of those rows, every span it draws today (`rowSpansAt`, the
 * provider's own derivation of a hovered row) that shares a cell with the
 * join (`sharesCellWithJoin`), and the provider offers the join only when the
 * door refuses every one of them, in the same `Promise.all` and through the
 * same cache as the join's own target; a missing answer counts as accepted,
 * and a row the join covers that cannot be read refuses it. So a refused join
 * leaves every row's links as they were, and an accepted one shares no cell
 * with any of them: a cell that opens a file today opens the same file after.
 * The price is gain, never a moved link. Where a row's own piece of a broken
 * path is a file Tortie opens, that row keeps opening it and the whole path is
 * offered from no row, exactly as before the phase. J1 to J9 stay, because
 * they refuse joins whose name exists but is not what the text named, which
 * no count of moved links can see.
 *
 * WHY EVERY ROW, AND WHO OWNS THAT (the Phase 347.1 fix round, lens A's
 * ablation A2). xterm resolves a cell from its OWN row's links alone, so
 * judging only the hovered row would already keep every cell opening what it
 * opens today, and every per-cell corpus reads 0 with the other rows dropped.
 * Judging every row the join covers buys CONSISTENCY instead: the chain gives
 * the same answer from each of its rows, and the join's underline, which
 * spans every row it covers, is never drawn over another row's working link.
 * The corpora cannot see that clause; GR10 and conformance:pathdoors rule 18
 * own it, and a later round must not drop it as measured safe because a
 * per-cell count read 0. The door's KIND does not matter either: a span the
 * image door or the Mac door accepts is taken exactly as an editor one is
 * (GR11, rule 18's `g-fragment-image` and `g-fragment-mac`, S4's image and Mac
 * shapes).
 *
 * JOIN ABSOLUTE PATHS ONLY (his ruling of 2026-10-14; build/p3471/SPEC.md D14
 * to D16). J10: a chain is offered only when its joined target, the very
 * string the door is asked about, starts with `/` or with `~/`, the home
 * exactly as the door expands one; `~user/`, `./`, `../`, a bare name and
 * every other relative spelling are refused whole, from every row, and never
 * shortened. A relative chain is the one that opens a file the screen does
 * not name, because it resolves against the PROJECT: the lower rows of a path
 * an agent printed into another worktree of this repository, wrapped narrower
 * than the pane, stopped at a boundary J3 or J7 refused, joined on their own
 * and opened the project's own copy of the file where the parent opened
 * nothing (the reverify's census, 4,031 of 1,474,667 real layouts). The top
 * piece is the START of its path token on its row by construction, so no
 * clause reads what precedes it: it is its row's LAST whitespace-delimited
 * token past the content head (`upperPiece`), so the row's start, a space or
 * the gutter the join already strips sits before it, and J1 makes it end on a
 * path character, which no opening bracket is, so only the grammar's own
 * opening brackets, and then a `file://` it strips, can sit between its first
 * cell and the target's first character. A prefix glued onto an absolute path
 * (`x=/abs/…`, `--file=/abs/…`, `foo:/abs/…`) is refused by the grammar
 * before J10 reads it, because `=` and `:` are no segment's characters; one
 * the grammar takes (`$HOME/abs/…`, `~me/abs/…`) puts something other than
 * `/` or `~/` first in the target, and J10 refuses it. A top piece that is
 * relative is the chain's FIRST piece, so no shorter chain of the same rows
 * has an absolute top to offer in its place.
 *
 * J11: a chain the walk stopped can still be a piece of a longer token cut
 * by a breaker, and each piece can name a real file the screen does not: an
 * absolute chain cut just before a `/` at its top (`… in /private` above
 * `/tmp/…`), or mid-name at its bottom (`…/answer.hard` above `13:60
 * today.`). A breaker that cuts inside a token cuts at its LIMIT, or at one
 * of its break opportunities when the next fragment does not fit, and its
 * limit is never below the widest row it drew. So J11 refuses the chain
 * whole when its top row holds only its piece below a row that reaches the
 * widest row the chain draws, or comes within the fragment a breaker may
 * have moved down to the top row (`movedFragmentCells`: after a `-`, after a
 * `/`, before a `/`, or before a run of `--`), or ends in a root a path goes on from (`~`, a `$`
 * variable, a URL); and when its bottom row holds only its piece and reaches
 * the widest row above it, or comes within the fragment a breaker may have
 * moved down from it, above a row that starts with a character a name goes
 * on with, the piece ending in no line suffix; and when its bottom row holds
 * only its piece, ending in a character Python's textwrap breaks after, above
 * a row starting with a run of `--` and a word character, below a row of the
 * chain that fills the pane (the overflow refusal, his ruling of 2026-10-15:
 * with `break_long_words=False` Python's textwrap puts a chunk longer than
 * its row on a row of its own and the terminal soft-wraps it, so the bottom
 * row is a remainder of any length). Rows are counted as a breaker may count them: a wide glyph as one
 * cell, and on the row above the top every character outside ASCII as one
 * cell more than xterm drew (Ink's string-width counts `✅` as two, and
 * Tortie's xterm, which loads no unicode11 addon, draws it in one). The round
 * that added J11 read ONE column for every row a breaker cut, which is
 * wrap-ansi's hard mode alone, and the attack lens cut with Python's and
 * Rust's textwrap (which also break after `-`, so their other rows end short
 * of the limit), with an emoji on Ink's row, with a breaker that breaks
 * before `/` and with a soft wrap ending in `]`, each opening a file the
 * parent did not. Its price is gain: a path whose last row is its widest
 * above another word, or whose first row starts below a row near the widest
 * (SPEC L9). Both are refusals and nothing else, so a refused chain leaves
 * every row's links exactly as they are today (the governing rule), and no
 * link on a single row moves: neither is read outside `joinedPathAt`. J8 at
 * the chain's top went with this round, measured redundant under J10 (D16); J8 in
 * `joinBoundary` stays, because it still keeps a `~/` path below a relative
 * folder from being glued to it.
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
 * where a row's content begins — Phase 347's join reads it for exactly that,
 * where a continuation row's piece starts (J2) — and the strip is never the
 * proof of a join: research 111 section 4.2 measured that a gutter-stripping
 * glue reconstructs a file that really exists 57 times and tmux confirms 18
 * of them, so 68.4% of the joins that look right are joins that never
 * happened. That is why a join also needs J3 and the door.
 */
const GUTTER = /^(?:\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;

/** A character a path can continue with, for the row-head half of refusal 8. */
const PATH_CHARACTER = /[A-Za-z0-9._@%+~$/-]/;

/** A character a name in a path can go on with: `SEGMENT`'s, and `/` (J11's bottom half). */
const NAME_CHARACTER = /[A-Za-z0-9._@%+~$[\]/-]/;

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

/**
 * A PATH BROKEN OVER ROWS, READ AS ONE (Phase 347, issue 40).
 *
 * The header's last section says what this joins and by which proof; this is
 * the rule itself. Everything is read from the DRAWN rows and the pane's
 * width, columns come out of each row's own map and never out of a string
 * index, and nothing here reads `isWrapped`, touches the filesystem or asks a
 * door. The door is the provider's, J4, and it is the last word: a join this
 * answers is a CANDIDATE, exactly as a row span is.
 */

/** A join longer than this many rows is refused whole, never cut short. */
export const MAX_JOIN_ROWS = 8;

/** ...and so is one whose joined token is longer than macOS's `PATH_MAX`. */
export const MAX_JOIN_CHARS = 1_024;

/** One drawn row: its text as `translateToString(true)` answers and its own column map (`cellColumns`). */
export interface DrawnRow {
  text: string;
  columns: number[];
}

/** A path the rows top..bottom draw as one token, with its first and last cell. */
export interface JoinedSpan {
  /** As `PathSpan.target`: decoration and the line suffix stripped. */
  target: string;
  line?: number;
  /** The joined token as drawn, up to the end of its line suffix. */
  text: string;
  /** Buffer row indices, 0-based. */
  top: number;
  bottom: number;
  /** 0-based column of the first cell, on `top`. */
  startColumn: number;
  /** 0-based column ONE PAST the last cell, on `bottom`. */
  endColumn: number;
}

/** One `\S+` run of a drawn row: its string index and its text. */
interface RowToken {
  start: number;
  text: string;
}

/** What the join asks of one row, read once. */
interface RowShape {
  /** The text with trailing whitespace gone, whatever the caller handed in. */
  drawn: string;
  /** String index where the content starts: past the gutter and any spaces. */
  head: number;
  /** Every token from `head` on. */
  tokens: RowToken[];
  /** Column one past the last drawn glyph, from the row's OWN map. */
  end: number | undefined;
}

function shapeOf(row: DrawnRow): RowShape {
  const drawn = row.text.replace(/\s+$/, '');
  const afterGutter = drawn.replace(GUTTER, '');
  const content = afterGutter.replace(/^\s+/, '');
  const head = drawn.length - content.length;
  const tokens: RowToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    tokens.push({ start: head + m.index, text: m[0] });
  }
  return { drawn, head, tokens, end: row.columns[drawn.length] };
}

/** The piece a row lends a join from above: its LAST token. */
function upperPiece(shape: RowShape): RowToken | undefined {
  return shape.tokens[shape.tokens.length - 1];
}

/** The piece a row lends a join from below: its FIRST token. */
function lowerPiece(shape: RowShape): RowToken | undefined {
  return shape.tokens[0];
}

/**
 * J11'S ARITHMETIC (build/p3471/SPEC.md D15 and the fix round of his
 * absolute-only round). A breaker that cuts inside a token cuts at its LIMIT,
 * or at one of its break opportunities when the next fragment does not fit
 * there, and its limit is never below the widest row it drew. These read a
 * row the way a breaker may have counted it, which is not always the way
 * xterm draws it, and each errs toward a refusal.
 *
 * `cellsUndrawn`: the cells a breaker may have counted on a row past what
 * xterm drew, one per UTF-16 unit outside ASCII past the gutter, an upper
 * bound. Ink's string-width counts `✅`, `⚠️` and `🔧` as two cells and
 * Tortie's xterm draws each in one (Unicode 6 widths, no unicode11 addon); a
 * breaker counting code points or UTF-16 units counts a joined emoji as
 * several. The gutter is the program's own drawing, not text a breaker
 * wrapped, so it is not counted.
 */
function cellsUndrawn(shape: RowShape): number {
  let n = 0;
  for (let i = shape.head; i < shape.drawn.length; i += 1) {
    if (shape.drawn.charCodeAt(i) > 0x7f) n += 1;
  }
  return n;
}

/**
 * The cells xterm drew past what a breaker may have counted: one for every
 * cell a wide glyph takes beyond its first, because a breaker that counts
 * code points counts a CJK character as one.
 */
function cellsWide(row: DrawnRow, shape: RowShape): number {
  let n = 0;
  for (let i = 0; i < shape.drawn.length; i += 1) {
    const from = row.columns[i];
    const to = row.columns[i + 1];
    if (from !== undefined && to !== undefined && to - from > 1) n += to - from - 1;
  }
  return n;
}

/**
 * A token's cells from its row's own map, the first `length` characters of
 * it or all of it. Undefined when the map cannot answer, which refuses.
 */
function tokenCells(row: DrawnRow | undefined, token: RowToken | undefined, length?: number): number | undefined {
  if (row === undefined || token === undefined) return undefined;
  const from = row.columns[token.start];
  const past = row.columns[token.start + (length ?? token.text.length)];
  return from === undefined || past === undefined ? undefined : past - from;
}

/**
 * The first fragment a breaker could have moved to the next row whole, in
 * cells: the piece up to its first `/` past its first character (a breaker
 * that breaks before a `/`), or through its first `-` (one that breaks after
 * a `-`), or all of it.
 */
function firstFragmentCells(row: DrawnRow | undefined, piece: RowToken | undefined): number | undefined {
  if (piece === undefined) return undefined;
  const at = piece.text.slice(1).search(/[/-]/);
  return tokenCells(row, piece, at === -1 ? piece.text.length : piece.text[at + 1] === '/' ? at + 1 : at + 2);
}

/**
 * The fragment a breaker may have moved from the end of the row above to the
 * start of `piece`'s row, the longest any breaker could have, so a cut errs
 * toward a refusal. After a `-` the whole token, since Python's textwrap
 * breaks again only at a `-` between letters and Rust's between letters or
 * digits; after a `/` (UAX #14) through its next `/` or `-` that no digit
 * follows, or the whole token; before a `/` (the attack's breaker) its first
 * fragment; before a run of two or more `-` (Python's textwrap: its
 * `wordsep_re` breaks before `-{2,}\w` after a word character, and the run is
 * its own chunk) the run; otherwise the break was a cut at the limit, one
 * cell. Without the run a bottom row ending `…/pi-sessions` one cell short of
 * the widest row above `--Users-…` opened a file named `pi-sessions` where
 * the parent opened nothing (the reverify of 2026-10-15).
 */
function movedFragmentCells(
  row: DrawnRow | undefined,
  piece: RowToken | undefined,
  ended: RowToken | undefined
): number | undefined {
  if (piece === undefined) return undefined;
  const last = ended?.text.slice(-1);
  if (last === '-') return tokenCells(row, piece);
  if (last === '/') {
    const at = piece.text.slice(1).search(/[/-](?!\d)/);
    return tokenCells(row, piece, at === -1 ? piece.text.length : at + 2);
  }
  if (piece.text.startsWith('/')) return firstFragmentCells(row, piece);
  const run = /^-{2,}/.exec(piece.text)?.[0].length ?? 0;
  if (run > 0) return tokenCells(row, piece, run);
  return 1;
}

/** A root a path goes on from, alone: a home (`~`, `~me`) or a variable (`$HOME`, `${HOME}`). */
const ROOT_ALONE = /^(?:~[A-Za-z0-9._-]*|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?)$/;

/** A URL's scheme and its `//`. */
const URL_START = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

/**
 * J11'S OVERFLOW BEFORE `--` (his ruling of 2026-10-15, "Add that refusal").
 * Python's textwrap breaks before a run of two or more `-` that a character of
 * its `[\w!"'&.,?]` precedes and a word character follows (`wordsep_re`).
 * Python's `\w` is Unicode's, so both classes here are too: a bottom piece
 * ending in a character that break follows, and a row below starting with
 * the run and a word character.
 */
const ENDS_BEFORE_A_RUN = /[\p{L}\p{N}_!"'&.,?]$/u;
const STARTS_A_RUN = /^-{2,}[\p{L}\p{N}_]/u;

/**
 * Does the row above end in a root the top piece goes on from? Its last
 * token, past any opening bracket, is a home or a variable alone, or it and
 * the top piece read as a URL: `I wrote the log to ~` above `/tmp/…` names
 * `~/tmp/…`, and `See https://example.com` above `/tmp/…` names a page.
 */
function continuesARoot(last: RowToken | undefined, piece: RowToken | undefined): boolean {
  if (last === undefined || piece === undefined) return false;
  let text = last.text;
  while (text.length > 0 && OPEN.has(text[0] ?? '')) text = text.slice(1);
  return ROOT_ALONE.test(text) || URL_START.test(text + piece.text);
}

/**
 * J1, J2's head clause, J3, J5, J7, J8 and J9's upper half: may `above`'s
 * last token run on into `below`'s first? Every unknown answers no. A no here
 * only stops the walk; whether the chain it stopped is then offered is
 * `joinedPathAt`'s question, and J9 there refuses a chain WHOLE when the
 * boundary it stopped at could not be read.
 *
 * J3 is what tells a forced break from a word wrap that merely happened to
 * fall between two path-shaped tokens: `above`'s drawn end column plus the
 * width in columns of `below`'s first UNIT — its first token up to and
 * including the first `/` or `-`, or the whole token — must exceed the
 * pane's width, so no breaker of that width could have put the unit on
 * `above`. A soft wrap always passes it, because `above` is full; issue 40's
 * own break passes it at 45 to 49 columns and fails closed from 50.
 *
 * J7 (the Phase 347 fix round) is what tells an agent's break from a word
 * wrap that J3 cannot: a row that stops short of the last column joins only
 * when its piece ends in `/` or `-`, the only places a breaker breaks inside
 * a path. Without it a word wrap that left `…/README.md` two cells short of
 * the edge above `.bak beside it` offered README.md.bak and took the link off
 * README.md, which opened at the parent.
 */
export function joinBoundary(
  above: DrawnRow,
  below: DrawnRow,
  width: number
): boolean {
  const upper = shapeOf(above);
  const lower = shapeOf(below);
  const piece = upperPiece(upper);
  const next = lowerPiece(lower);
  // J1. The upper row ends in its last token, and on a character a path can
  // continue with.
  if (piece === undefined) return false;
  if (!PATH_CHARACTER.test(piece.text[piece.text.length - 1] ?? '')) return false;
  // J2, its head clause. The lower row's content, past the gutter and any
  // spaces, starts with a path character.
  if (next === undefined || next.start !== lower.head) return false;
  if (!PATH_CHARACTER.test(next.text[0] ?? '')) return false;
  // The upper row's drawn end, from its own map.
  const upperEnd = upper.end;
  if (upperEnd === undefined) return false;
  // J9, ITS UPPER HALF (the Phase 347.1 fix round; the app lens's narrowed
  // pane). A boundary whose upper row draws past the pane's width cannot be
  // read: tmux draws on xterm's ALTERNATE buffer, which has no reflow, so
  // when the pane narrows xterm keeps every cell past the new edge (its
  // Buffer trims a line on a shrink only with reflow on), a later repaint's
  // erase stops at the new width, and `translateToString(true)` still answers
  // what was left there. The upper piece is its row's LAST token, so it is
  // either one of those cells or glued to them: `src/deep/` drawn at the end
  // of a 47-column row whose stale `de` sat in columns 48 and 49 opened
  // `src/deep/defolder/one.ts` from `folder/one.ts:5` below it, where the
  // parent opened nothing. So the walk never crosses such a boundary, and
  // `joinedPathAt`'s J9 then refuses the chain it stopped WHOLE (his ruled
  // round): a chain cut at a boundary it cannot read may be a fragment.
  if (upperEnd > width) return false;
  // J3. The break was forced. Both widths come from the rows' own maps.
  const cut = next.text.search(/[/-]/);
  const unit = cut === -1 ? next.text.length : cut + 1;
  const unitFrom = below.columns[next.start];
  const unitPast = below.columns[next.start + unit];
  if (unitFrom === undefined || unitPast === undefined) return false;
  if (!(upperEnd + (unitPast - unitFrom) > width)) return false;
  // J5. A folder above a bare name joins only when the folder's row is full:
  // a word wrap of "…in `docs/`" above "`README.md` is…" is never glued.
  if (
    piece.text.endsWith('/') &&
    !stripDecoration(next.text).target.includes('/') &&
    !(upperEnd >= width)
  ) {
    return false;
  }
  // J7. A row that stops SHORT of the last column was broken by a breaker,
  // not by the terminal, and a breaker breaks inside a path only after a `/`
  // or a `-` (UAX #14's break opportunities; issue 40 breaks after
  // `arcturus-` and `software-factory/`, Codex after `p318-`). Anything else
  // there is a word wrap: "…/src/README.md" above ".bak beside it" names
  // README.md, and README.md.bak is never offered in its place.
  if (!(upperEnd >= width) && !/[/-]$/.test(piece.text)) return false;
  // J8 (his rule, no scenario worse than today; the reverify of 2026-10-12).
  // A row that stops SHORT of the last column, whose piece is a RELATIVE
  // folder that follows other words on its row, starts no join: "moved src/"
  // above "lib/util.ts today" names lib/util.ts, which opened at the parent,
  // and src/lib/util.ts is never offered in its place. An absolute folder
  // (`/` or `~/`, past any opening quote or bracket), or a piece that starts
  // its row (issue 40's rows), still joins. The cost is gain, not regression:
  // a relative path a breaker split after `/` mid-sentence stays plain, as it
  // was at the parent. Under J10 (his absolute-only round) every relative
  // chain is refused anyway, and this stays for the one absolute shape it
  // still decides: a relative folder one cell short of the edge after other
  // words above a row that starts `~/` (J3 counts `~/` as two cells), where
  // it lets the `~/` path below join on its own instead of gluing the folder
  // onto it and refusing both (build/p3471/SPEC.md D16, `b8-tilde-below`).
  if (
    !(upperEnd >= width) &&
    piece.text.endsWith('/') &&
    piece.start !== upper.head &&
    !/^[`'"(\[{<]*(\/|~\/)/.test(piece.text)
  ) {
    return false;
  }
  return true;
}

/**
 * THE JOIN THROUGH ROW `y`, or null.
 *
 * `rows(i)` answers buffer row i as drawn, or null past either end. `last` is
 * the last buffer row index. Null unless rows top..bottom meet J1, J2, J3,
 * J5, J7 and J8 at every boundary, J6 at the buffer's edges, J9 at every
 * boundary it crosses or stops at, and both caps, and the joined token passes
 * the grammar (`tokensInRow`, `looksLikePath`, `stripDecoration`), with J10
 * on the joined target and J11 at the chain's two ends (his absolute-only
 * round). It never asks a door: J4 is the provider's.
 *
 * The chain is the LONGEST one through `y`, and it is never cut short to fit
 * a cap, because a shortened join is a fragment. A boundary J3, J5, J7 or J8
 * refuses only stops the walk, so a chain can be a piece of a longer printed
 * path; J10 refuses every such piece that reads relative, and J11 every one a
 * breaker of any limit the chain allows could have cut at either end. A row
 * strictly inside it
 * holds exactly one token (J2). A hovered row that ENDS one broken path and
 * BEGINS another holds two joins; from that row the one ending on its first
 * token is answered, and the other is answered from the row below it.
 */
export function joinedPathAt(
  rows: (i: number) => DrawnRow | null,
  y: number,
  last: number,
  width: number
): JoinedSpan | null {
  const seen = new Map<number, { row: DrawnRow; shape: RowShape } | null>();
  const read = (i: number): { row: DrawnRow; shape: RowShape } | null => {
    if (i < 0 || i > last) return null;
    if (seen.has(i)) return seen.get(i) ?? null;
    const row = rows(i);
    const got = row === null ? null : { row, shape: shapeOf(row) };
    seen.set(i, got);
    return got;
  };
  const here = read(y);
  if (here === null) return null;

  // Upward. Moving the top from t to t-1 puts t strictly inside unless t is
  // the hovered row, which is settled below.
  let top = y;
  for (;;) {
    const above = read(top - 1);
    const current = read(top);
    if (above === null || current === null) break;
    if (!joinBoundary(above.row, current.row, width)) break;
    if (top !== y && current.shape.tokens.length !== 1) break;
    top -= 1;
    if (y - top + 1 > MAX_JOIN_ROWS) return null;
  }
  // Downward, the same.
  let bottom = y;
  let downOver = false;
  for (;;) {
    const current = read(bottom);
    const below = read(bottom + 1);
    if (current === null || below === null) break;
    if (!joinBoundary(current.row, below.row, width)) break;
    if (bottom !== y && current.shape.tokens.length !== 1) break;
    bottom += 1;
    if (bottom - y + 1 > MAX_JOIN_ROWS) {
      downOver = true;
      break;
    }
  }
  // The hovered row is strictly inside only when it holds one token.
  if (top < y && bottom > y && here.shape.tokens.length !== 1) {
    bottom = y;
  } else if (downOver) {
    return null;
  }
  if (top === bottom) return null;
  // J9, REFUSED WHOLE (the Phase 347.1 fix round, the app lens's narrowed
  // pane; his ruled round of 2026-10-14, the reverify's measured remedy).
  // A boundary is read in two places, the upper row's drawn end and the
  // lower row's first piece, and a cell past the pane's width is one no
  // repaint drew (`joinBoundary`'s J9 says why). The walk never crosses a
  // boundary whose upper row draws past the width; this refuses the chain
  // WHOLE when a boundary it STOPS at reads a cell past the width, from
  // either place: the row above its top drawing past the width, its bottom
  // row drawing past it, or the first piece of the row below its bottom
  // reaching past it. Never cut there (D5): the fix round's J9 only stopped
  // the walk, so `/q/tortie/` with stale cells past its edge above
  // `build/fixtures/facts/manifests/package` and `.json:134` joined the two
  // rows below as a RELATIVE path, which opened the project's own
  // `build/fixtures/facts/manifests/package.json`, a file the screen does not
  // name, where the parent opened nothing. The bottom row is read whole
  // because a token left past the width makes it read as two tokens, which
  // ends a chain that went on: `fixtures/parent-record-b-` above
  // `first.json` stopped there and offered the folder's prefix. A cell a
  // repaint drew is never past `Terminal.cols`, so this only ever refuses a
  // join, a refused join leaves every row's links as they are today (D2),
  // and an end no map answers counts as past.
  const pastWidth = (i: number): boolean => {
    const got = read(i);
    return got !== null && !(got.shape.end !== undefined && got.shape.end <= width);
  };
  if (pastWidth(top - 1) || pastWidth(bottom)) return null;
  const belowBottom = read(bottom + 1);
  const firstBelow = belowBottom === null ? undefined : lowerPiece(belowBottom.shape);
  if (belowBottom !== null && firstBelow !== undefined) {
    const reach = belowBottom.row.columns[firstBelow.start + firstBelow.text.length];
    if (reach === undefined || reach > width) return null;
  }
  // The row cap, over the whole chain.
  if (bottom - top + 1 > MAX_JOIN_ROWS) return null;

  const topRow = read(top);
  const bottomRow = read(bottom);
  if (topRow === null || bottomRow === null) return null;
  // J6. The rest of a path at either edge of the buffer is in tmux's history
  // or not yet printed, so the join would be a fragment.
  const topPiece = upperPiece(topRow.shape);
  if (top === 0 && topPiece !== undefined && topPiece.start === topRow.shape.head) {
    return null;
  }
  // J11, A CHAIN THAT MAY BE A PIECE OF A LONGER TOKEN (build/p3471/SPEC.md
  // D15, widened by the fix round of his absolute-only round). At either end
  // of the chain the walk stopped where the chain's end piece meets the row
  // beyond it with nothing drawn between them: its top piece starts its row
  // below a row that ends in a token, or its bottom piece ends its row above
  // a row that starts with one. A breaker that cuts inside a token leaves
  // exactly that, so the chain is refused whole wherever a breaker of ANY
  // limit this chain allows could have cut there. Its limit is never below
  // the widest row the chain draws (`widest`), each row counted as a breaker
  // may have counted it (`cellsWide`). The round before read one column for
  // every row a breaker cut, which is wrap-ansi's hard mode and nothing else:
  // a breaker that also breaks after `-` (Python's textwrap, Rust's textwrap
  // with its hyphen splitter) ends its other rows short of its limit, and
  // Tortie's xterm, which loads no unicode11 addon, draws `✅`, `⚠️` and `🔧`
  // one cell narrower than Ink counts them, so a row holding one ends a
  // column early (the attack lens: `…/cmd.hard` opened for `…/cmd.hard13`,
  // and `/private/tmp/…` for `~/h/bbb…/tmp/…`, where the parent opened
  // nothing).
  //
  // The top: the row above was cut at the breaker's limit, or at a break
  // opportunity because the fragment after it did not fit, so the row above
  // plus that fragment (`movedFragmentCells`) reaches past `widest` (the row
  // above counted with every cell xterm may have drawn narrower,
  // `cellsUndrawn`); a row above that reads past the pane's width always
  // does, so J9's row-above clause decides only a top row holding more than
  // its piece. Or the row above ends in a root a path goes on from
  // (`continuesARoot`: `~`, a `$` variable or a URL), which glued to the top
  // piece names another path. The bottom: a cut inside a name lands only at
  // the limit, so the bottom row reaching the widest of the rows above it may
  // be one; a cut at a break opportunity (before a `/`, after a `/` or a `-`,
  // before a run of `--`) lands where the fragment after it did not fit, so
  // the bottom row plus that fragment of the row below reaching past that
  // widest row may be one too (a folder, a bundle the Mac door opens, a name
  // ending in `-`, or the name before `--`). Neither is read when
  // the row below starts with a character no name goes on with (`(+3 -1)`,
  // `:12`), or when the bottom piece ends in a line suffix, which ended its
  // name. A row holding more than its piece has a space beside the piece, so
  // its piece is whole there and neither half reads it. Both halves are
  // refusals and nothing else, so a refused chain leaves every row's links
  // as they are today.
  const counted: number[] = [];
  for (let r = top; r <= bottom; r += 1) {
    const got = read(r);
    if (got === null || got.shape.end === undefined) return null;
    counted.push(got.shape.end - cellsWide(got.row, got.shape));
  }
  const widest = Math.max(...counted);
  const widestAbove = Math.max(...counted.slice(0, -1));
  const aboveTop = read(top - 1);
  if (
    aboveTop !== null &&
    topRow.shape.tokens.length === 1 &&
    ((aboveTop.shape.end ?? Number.POSITIVE_INFINITY) +
      cellsUndrawn(aboveTop.shape) +
      (movedFragmentCells(topRow.row, topPiece, upperPiece(aboveTop.shape)) ?? Number.POSITIVE_INFINITY) >
      widest ||
      continuesARoot(upperPiece(aboveTop.shape), topPiece))
  ) {
    return null;
  }
  const bottomPiece = lowerPiece(bottomRow.shape);
  if (
    firstBelow !== undefined &&
    bottomRow.shape.tokens.length === 1 &&
    NAME_CHARACTER.test(firstBelow.text[0] ?? '') &&
    stripDecoration(bottomPiece?.text ?? '').line === undefined &&
    (bottomRow.shape.end ?? Number.POSITIVE_INFINITY) +
      (movedFragmentCells(belowBottom?.row, firstBelow, bottomPiece) ?? Number.POSITIVE_INFINITY) >
      widestAbove
  ) {
    return null;
  }
  // J11, THE OVERFLOW BEFORE `--` (his ruling of 2026-10-15, "Add that
  // refusal"; build/p3471/SPEC.md L8, L9 and L10). Python's textwrap with
  // `break_long_words=False` never cuts a chunk longer than its row: it puts
  // that chunk on a row of its own, overflowing it, and the terminal
  // soft-wraps the overflow at the pane's edge. Its `wordsep_re` makes a run
  // of `--` a chunk of its own, so the next row starts with the run, and the
  // chain's bottom row is the overflow's remainder, as short as it happens to
  // be and far below the widest row, which the arithmetic above reads as no
  // cut: the join opened a regular file named exactly the text before `--`
  // where the parent opened nothing (3,477 census layouts; live, 5 of 5
  // presses). So the chain is refused whole when its lone bottom piece ends
  // in a character that break follows, the row below starts with a run of two
  // or more `-` and a word character, and a row of the chain above its bottom
  // fills the pane, which an overflow the terminal soft-wrapped always leaves.
  // It caught 5,856 of 5,856 such cuts. Its price is gain on a path printed
  // before a flag (`--dry-run`, `--force`) that a soft wrap left at a row's
  // end above the flag, where the parent opens nothing either (L9). A
  // refusal and nothing else; a bottom row holding more than its piece has a
  // space beside the piece, so its piece is whole and this does not read it.
  let chainFillsAbove = false;
  for (let r = top; r < bottom; r += 1) {
    if ((read(r)?.shape.end ?? 0) >= width) chainFillsAbove = true;
  }
  if (
    bottomRow.shape.tokens.length === 1 &&
    ENDS_BEFORE_A_RUN.test(bottomPiece?.text ?? '') &&
    STARTS_A_RUN.test(firstBelow?.text ?? '') &&
    chainFillsAbove
  ) {
    return null;
  }
  if (
    bottom === last &&
    bottomPiece !== undefined &&
    bottomPiece.start + bottomPiece.text.length === bottomRow.shape.drawn.length
  ) {
    return null;
  }

  // The joined text, each character remembering the row and index it came from.
  let joined = '';
  const owner: { row: number; at: number }[] = [];
  for (let r = top; r <= bottom; r += 1) {
    const got = read(r);
    if (got === null) return null;
    const piece = r === top ? upperPiece(got.shape) : lowerPiece(got.shape);
    if (piece === undefined) return null;
    joined += piece.text;
    for (let i = 0; i < piece.text.length; i += 1) {
      owner.push({ row: r, at: piece.start + i });
    }
    // The character cap.
    if (joined.length > MAX_JOIN_CHARS) return null;
  }

  // The SAME grammar a row span meets.
  const [token, ...more] = tokensInRow(joined);
  if (token === undefined || more.length > 0) return null;
  if (!looksLikePath(token.text)) return null;
  const { target, line, visible } = stripDecoration(token.text);
  if (target.length === 0) return null;
  // J10, HIS RULING OF 2026-10-14: JOIN ABSOLUTE PATHS ONLY (build/p3471/SPEC.md
  // D14). The joined target, the very string the door is asked about, must
  // start with `/` or `~/`. A relative chain names a file only against the
  // project, so a chain cut short of the path's real start opens the
  // project's own file of that name, a file the screen does not name: an
  // agent's path into another worktree of this repository, wrapped narrower
  // than the pane, did exactly that in 4,031 of 1,474,667 real layouts. Its
  // start is the START of its token on its row by construction: the top
  // piece is its row's last whitespace-delimited token past the gutter, and
  // only the grammar's opening brackets are stripped before its first
  // character.
  if (!target.startsWith('/') && !target.startsWith('~/')) return null;
  const first = owner[token.start];
  const lastCell = owner[token.start + visible - 1];
  if (first === undefined || lastCell === undefined) return null;
  // What the strip left on ONE row is that row's own span, not a join.
  if (first.row === lastCell.row) return null;
  if (y < first.row || y > lastCell.row) return null;
  const startColumn = read(first.row)?.row.columns[first.at];
  const endColumn = read(lastCell.row)?.row.columns[lastCell.at + 1];
  if (startColumn === undefined || endColumn === undefined) return null;
  return {
    target,
    ...(line !== undefined ? { line } : {}),
    text: token.text.slice(0, visible),
    top: first.row,
    bottom: lastCell.row,
    startColumn,
    endColumn
  };
}

/**
 * THE ROW'S OWN SPANS, AS THE PROVIDER DERIVES THEM (Phase 347.1).
 *
 * Exactly `pathSpansInRow` with the arguments `PathLinkProvider.provideLinks`
 * hands it when row `i` is hovered: the row as drawn, its own column map, the
 * pane's width, and the row above as drawn with its own end column, 0 when
 * there is no row above and null when that row's map cannot answer. The
 * governing rule asks it of every row a join covers, so what it calls a row's
 * link is what that row draws today.
 */
export function rowSpansAt(
  rows: (i: number) => DrawnRow | null,
  i: number,
  width: number
): PathSpan[] {
  const here = rows(i);
  if (here === null) return [];
  const above = i > 0 ? rows(i - 1) : null;
  return pathSpansInRow(here.text, {
    width,
    columns: here.columns,
    above: above === null ? null : above.text,
    aboveEnd: above === null ? 0 : (above.columns[above.text.length] ?? null)
  });
}

/** A row span a join would cover: its buffer row, its target and its xterm range. */
export interface SpanUnderJoin {
  row: number;
  target: string;
  range: { start: number; end: number };
}

/**
 * THE GOVERNING RULE'S FACTS (Phase 347.1, build/p3471/SPEC.md D2).
 *
 * Every row span, on every row the join covers, that shares a cell with it,
 * or null when a row the join covers cannot be read, which refuses the join.
 * The door is the provider's: a join is offered only when the door refuses
 * every one of these, so a join never takes a cell from a link that opens
 * today.
 */
export function spansUnderJoin(
  rows: (i: number) => DrawnRow | null,
  join: JoinedSpan,
  width: number
): SpanUnderJoin[] | null {
  const out: SpanUnderJoin[] = [];
  for (let r = join.top; r <= join.bottom; r += 1) {
    const here = rows(r);
    if (here === null) return null;
    for (const span of rowSpansAt(rows, r, width)) {
      const range = spanColumns(span, here.columns);
      if (range === null) continue;
      if (sharesCellWithJoin(range, r, join)) out.push({ row: r, target: span.target, range });
    }
  }
  return out;
}

/**
 * DOES A ROW SPAN SHARE A CELL WITH AN ACCEPTED JOIN? (Phase 347.)
 *
 * `range` is the span's 1-based inclusive columns on buffer row `row`
 * (0-based). The join covers its top row from its first cell to the edge,
 * every row between whole, and its bottom row up to its last cell, which is
 * what xterm underlines for a range over several rows. A row span is a piece
 * of one of the join's own tokens, so sharing a cell is lying inside it.
 */
export function sharesCellWithJoin(
  range: { start: number; end: number },
  row: number,
  join: Pick<JoinedSpan, 'top' | 'bottom' | 'startColumn' | 'endColumn'>
): boolean {
  if (row < join.top || row > join.bottom) return false;
  const from = row === join.top ? join.startColumn + 1 : 1;
  const to = row === join.bottom ? join.endColumn : Number.POSITIVE_INFINITY;
  return range.start <= to && range.end >= from;
}
