/**
 * What a click on an agent's link opens, and what its hover line says (Phase
 * 368, build/p368/SPEC.md D14 and D16, his question 4's default). Pure: it
 * reads strings and ranges, never the terminal and never the page.
 *
 * ## The rule (D14)
 *
 * An OSC 8 link carries two things: the WORDS drawn on its cells and its
 * TARGET, T. Before Phase 368 tmux stripped every link before the terminal saw
 * it, so a click on those words opened W, the address the web links reading
 * finds on them, when the words held one, and nothing otherwise. So:
 *
 *  0. A PATH FIRST, where a click there opened a path before (the fix round).
 *     Before links reached the terminal, a click on words that are a path the
 *     pane offers (`../path-links.ts`) opened that file in Tortie, unless a web
 *     address the reading finds held the same cell, because the web links
 *     addon outranks the path provider. xterm's OSC 8 provider now outranks
 *     both, so the handler asks the path provider itself whenever no address
 *     of the reading holds the pointer's cell (`pathMayDecide`), and a path
 *     link holding that cell (`pathUnder`) is opened through the path
 *     provider's own route. Words that are a project path under an https
 *     target open the file, as they did, never the target.
 *  1. W is the reading's address on the clicked link's cells. Where the words
 *     hold two (Codex's echo of `[https://a](https://b)` links both under one
 *     target), the one under the pointer, which is the one a click there opened
 *     before; with no pointer cell, or a pointer between them, the first.
 *  2. With a W, W opens: no new refusal, because a click there opened W before
 *     (question 4: "open the words, as today").
 *  3. Except a URL the agent CUT, where what the screen draws, read across the
 *     row ends, IS the target (the fix round): T begins with W, is longer, W
 *     ends in its row's last cell, and the rows after it, each with its leading
 *     spaces taken off, spell exactly the rest of T. A row whose first word is
 *     a piece of the rest and fills the row to its last cell carries on to the
 *     next row; the last piece is a row's whole first word, or that word less
 *     closing punctuation after it. Claude cuts a long address at the pane's
 *     edge and carries the rest to its next rows, so W is the first row's part
 *     and T is the whole address. Then T opens, when T passes the rule below;
 *     when it does not (a user part, or over the byte cap, either of which a
 *     cut could hide), W opens as before. A target that only BEGINS like the
 *     drawn rows (`https://good.ex` above `ample.com/login`, linked to
 *     `https://good.example.co.evil.io/x`) is not a cut, and W opens, so a
 *     click never goes to a host the screen does not show.
 *  4. With no W, T opens only when it parses, is http or https, carries no user
 *     and no password, and is at most {@link LINK_MAX_BYTES} bytes of UTF-8.
 *     Anything else opens nothing, and its hover line is not drawn.
 *
 * ## The hover line (D16)
 *
 * `new URL(address).href`: the host in ASCII (`аpple.com` reads
 * `xn--pple-43d.com`) and every non-ASCII, space and bidi character
 * percent-encoded, so nothing in it can reorder or hide what it says. It is the
 * address a click hands the page's one route, `window.open`, which Chromium
 * resolves to this same canonical form before main's gate sees it.
 */

import type { IBufferCellPosition, IBufferRange } from '@xterm/xterm';
import type { WebAddress } from './web-reading';

/**
 * The most bytes of UTF-8 a link's target may hold and still be opened (D14),
 * the phone's own cap for a link's address (ios/Tortie/Markdown/Caps.swift).
 */
export const LINK_MAX_BYTES = 2048;

/**
 * The most rows a cut address is followed across (D14 rule 3): a 2,048-byte
 * target at a pane 32 columns wide. Past it, nothing is a cut.
 */
export const CUT_ROWS_MAX = 64;

/**
 * What may follow the last piece of a cut address on its row and still leave
 * the target exactly what the screen draws: closing punctuation, which the web
 * links reading itself never takes as an address's last character.
 */
const CLOSING_ONLY = /^[.,;:!?'")\]}>]+$/;

/** The clicked link as xterm hands it to the handler. */
export interface ClickedLink {
  /** The OSC 8 target, T. */
  readonly target: string;
  /** The link's cells on its row: 1-based, inclusive, buffer rows. */
  readonly range: IBufferRange;
  /** The pointer's cell, in the same coordinates, when it is known. */
  readonly at?: IBufferCellPosition | null;
}

/**
 * The text of buffer row `y` (1-based), as `translateToString(true)` reads it,
 * or null when there is no such row.
 */
export type RowText = (y: number) => string | null;

/**
 * True when `text`'s UTF-8 encoding is at most `limit` bytes. Counts without
 * encoding, and stops at the first code unit past the limit, so a 10 MB target
 * costs no 10 MB buffer. A lone surrogate counts 3, which is what its U+FFFD
 * replacement weighs.
 */
export function utf8FitsIn(text: string, limit: number): boolean {
  // Every UTF-16 code unit is at least one byte of UTF-8.
  if (text.length > limit) return false;
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else {
        bytes += 3;
      }
    } else bytes += 3;
    if (bytes > limit) return false;
  }
  return true;
}

/**
 * D14 rule 4: whether a target may be opened on its own. It parses, its
 * protocol is `http:` or `https:`, it has no username and no password, and its
 * UTF-8 is at most {@link LINK_MAX_BYTES} bytes.
 */
export function targetOffered(target: string): boolean {
  if (!utf8FitsIn(target, LINK_MAX_BYTES)) return false;
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username !== '' || url.password !== '') return false;
  return true;
}

/** The hover line for an address (D16), or null when it does not parse. */
export function hoverText(address: string): string | null {
  try {
    return new URL(address).href;
  } catch {
    return null;
  }
}

/** Linear cell order, so ranges on several rows compare as one line. */
function before(a: IBufferCellPosition, b: IBufferCellPosition): boolean {
  return a.y < b.y || (a.y === b.y && a.x < b.x);
}

function overlaps(a: IBufferRange, b: IBufferRange): boolean {
  return !before(a.end, b.start) && !before(b.end, a.start);
}

function holds(range: IBufferRange, cell: IBufferCellPosition): boolean {
  return !before(cell, range.start) && !before(range.end, cell);
}

/**
 * D14 rule 1: the reading's address on the clicked link's cells. The one under
 * the pointer when the pointer's cell is known and on one; otherwise the first
 * that overlaps the link's range; null when none does.
 */
export function wordsAddress(link: ClickedLink, reading: readonly WebAddress[]): WebAddress | null {
  const onLink = reading.filter((one) => overlaps(one.range, link.range));
  if (onLink.length === 0) return null;
  const at = link.at ?? null;
  if (at !== null) {
    const under = onLink.find((one) => holds(one.range, at));
    if (under !== undefined) return under;
  }
  return onLink[0] ?? null;
}

/**
 * The last row a reading's address is drawn on. The reading answers an address
 * that ends in a row's LAST cell as ending at column 0 of the next row (its
 * `_mapStrIdx` runs off the row's end before it stops), and that is exactly the
 * shape of a URL cut at the pane's edge, so column 0 means the row before.
 */
export function lastRowOf(range: IBufferRange): number {
  return range.end.x < 1 ? range.end.y - 1 : range.end.y;
}

/**
 * Whether an address the reading found ends in its row's last cell, the shape
 * of an address cut at the pane's edge. The reading answers such an address
 * as ending at column 0 of the NEXT row (`lastRowOf`), and a range that ends
 * on the last column itself is read the same way.
 */
export function endsAtEdge(range: IBufferRange, cols: number): boolean {
  return range.end.x < 1 || range.end.x >= cols;
}

/**
 * D14 rule 3 (the fix round): whether T is W continued, whole, on the rows after
 * W's last row, which is a URL the agent cut at the pane's edge. What the rows
 * draw must spell the rest of T EXACTLY: each row's first word, its leading
 * spaces taken off, is the next piece; a piece shorter than what is left must
 * fill its row to the last cell (the agent cut it again); the last piece is a
 * row's whole first word, or that word less closing punctuation. So T is
 * exactly the address the screen draws, read across its row ends, and a
 * target that only begins like those rows is not a cut.
 *
 * The rows are read as `translateToString(true)` reads them, and `cols` is the
 * terminal's width; a row holding a wide character reads shorter than its
 * cells, never longer, so it can only refuse a cut, never invent one.
 */
export function isCutAddress(
  target: string,
  words: WebAddress,
  rowText: RowText,
  cols: number
): boolean {
  const w = words.address;
  if (target.length <= w.length || !target.startsWith(w)) return false;
  // A width that is not a terminal's says nothing about an edge.
  if (!(Number.isInteger(cols) && cols >= 2)) return false;
  if (!endsAtEdge(words.range, cols)) return false;
  let rest = target.slice(w.length);
  let y = lastRowOf(words.range) + 1;
  for (let hops = 0; hops < CUT_ROWS_MAX; hops += 1, y += 1) {
    const row = rowText(y);
    if (row === null) return false;
    const body = row.replace(/^ +/, '');
    const space = body.indexOf(' ');
    const word = space === -1 ? body : body.slice(0, space);
    if (word === '') return false;
    if (word === rest) return true;
    if (word.length > rest.length) {
      return word.startsWith(rest) && CLOSING_ONLY.test(word.slice(rest.length));
    }
    // A piece shorter than what is left: it is the rest's start, and the agent
    // cut it again at this row's last cell.
    if (!rest.startsWith(word) || body !== word || row.length < cols) return false;
    rest = rest.slice(word.length);
  }
  return false;
}

/** The web links reading of any buffer row (1-based), for a later row of a cut. */
export type ReadingOn = (y: number) => readonly WebAddress[];

/**
 * D14 rule 3, a cut's LATER rows (the fix round): when the clicked link's own
 * row holds no address, whether it is a later row of a cut-looking address,
 * and that address's first row. Walking up from the link's row over rows that
 * are one piece filling their row, the first row that is not must end at its
 * last cell with an address T begins with and is longer than; that address is
 * answered. Null when the rows above are anything else.
 */
export function cutFirstRow(
  link: ClickedLink,
  rowText: RowText,
  readingOn: ReadingOn,
  cols: number
): WebAddress | null {
  if (!(Number.isInteger(cols) && cols >= 2)) return null;
  for (let y = link.range.start.y - 1, hops = 0; y >= 1 && hops < CUT_ROWS_MAX; y -= 1, hops += 1) {
    const first = readingOn(y).find(
      (one) =>
        lastRowOf(one.range) === y &&
        endsAtEdge(one.range, cols) &&
        link.target.length > one.address.length &&
        link.target.startsWith(one.address)
    );
    if (first !== undefined) return first;
    // Not the first row: carry on up only over a middle piece, one word that
    // fills its row to the last cell.
    const row = rowText(y);
    if (row === null) return null;
    const body = row.replace(/^ +/, '');
    if (body === '' || body.includes(' ') || row.length < cols) return null;
  }
  return null;
}

/**
 * D14 rule 0 (the fix round): whether a path the pane offers is asked about
 * this click before the web rules. True unless an address of the reading
 * holds the pointer's cell, because the web links addon outranked the path
 * provider on the same cells before links reached the terminal. With no
 * pointer cell, true only when no address of the reading is on the link's
 * cells at all, so rule 1's first address keeps the click.
 */
export function pathMayDecide(link: ClickedLink, reading: readonly WebAddress[]): boolean {
  const onLink = reading.filter((one) => overlaps(one.range, link.range));
  const at = link.at ?? null;
  if (at === null) return onLink.length === 0;
  return !onLink.some((one) => holds(one.range, at));
}

/**
 * D14 rule 0: the path link a click opens, among those the pane's path
 * provider offers on the clicked row: the one holding the pointer's cell, or,
 * with no pointer cell, the first on the link's cells; null for none.
 */
export function pathUnder<P extends { readonly range: IBufferRange }>(
  link: ClickedLink,
  offered: readonly P[]
): P | null {
  const at = link.at ?? null;
  if (at !== null) return offered.find((one) => holds(one.range, at)) ?? null;
  return offered.find((one) => overlaps(one.range, link.range)) ?? null;
}

/**
 * D14 rules 1 to 4: the web address a click on this link opens, or null for
 * nothing. Rule 0, a path, is asked first by the handler, which opens a path
 * through the path provider's own route and never through this answer.
 * `reading` is the web links reading of the link's row (`webAddressesOn`),
 * `rowText` reads any row, `cols` is the terminal's width, for the cut test,
 * and `readingOn` reads any row's addresses, for a cut's later rows.
 *
 * A later row of a cut-looking address (its words hold no address, and the
 * rows above are the cut's first row and its middle pieces) opens T only when
 * the rows spell T exactly, and otherwise NOTHING: before links reached the
 * terminal a click there opened nothing, and T would be a host the screen
 * does not show.
 */
export function openedAddress(
  link: ClickedLink,
  reading: readonly WebAddress[],
  rowText: RowText,
  cols: number,
  readingOn?: ReadingOn
): string | null {
  const words = wordsAddress(link, reading);
  if (words === null) {
    const first = readingOn === undefined ? null : cutFirstRow(link, rowText, readingOn, cols);
    if (first !== null) {
      return isCutAddress(link.target, first, rowText, cols) && targetOffered(link.target)
        ? link.target
        : null;
    }
    return targetOffered(link.target) ? link.target : null;
  }
  if (isCutAddress(link.target, words, rowText, cols) && targetOffered(link.target)) {
    return link.target;
  }
  return words.address;
}
