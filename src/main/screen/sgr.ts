/**
 * THE ONE READER OF TMUX'S STYLES IN MAIN (Phase 337, build/p337/SPEC.md
 * §5.3.4, D11).
 *
 * `capture-pane -p -e` writes a screen as rows of text with SGR sequences
 * between the cells. This module turns that into rows of cells, each carrying
 * the pen it was drawn with, and it is what both readers of a styled screen
 * read through: the Screen's composer (./compose.ts) and the phone's message
 * gate (src/main/reply/input-row.ts, by a projection that answers exactly what
 * its own reader answered at `aebb4ce9`; src/main/screen/__tests__/
 * input-row-parity.test.ts holds that against a verbatim copy of the parent).
 *
 * WHAT IT READS. Every attribute and colour form tmux writes: 1 to 9, 21 to
 * 29, 53 and 55; 30 to 37, 39, 40 to 47, 49, 90 to 97 and 100 to 107; and the
 * extended colours `38`, `48` and `58` in both spellings, `38;5;n` and
 * `38:5:n`, `38;2;r;g;b`, `38:2::r:g:b` and `38:2:r:g:b`, with `4:n` for an
 * underline's style. THE PEN IS CARRIED ACROSS ROWS, because tmux does not
 * reset it at a row's end.
 *
 * `basic` AND `index` ARE KEPT APART. SGR 30 to 37 and 90 to 97 set a `basic`
 * colour and `38;5;n` an `index`, even where they name the same slot, because
 * input-row's grey test reads `90` and `38;5;240..250` and must not read
 * `38;5;8` (its parent never did).
 *
 * WHAT MAKES A ROW UNREADABLE: an escape other than an SGR or an OSC (an OSC,
 * a hyperlink say, draws no cell and is skipped to its terminator); an SGR with
 * intermediate bytes, a non-numeric parameter, or an extended colour whose mode
 * is neither 5 nor 2; a control cell (C0 but a tab, DEL, C1). Such a cell is not
 * kept. An extended colour whose index or component is not a whole number from
 * 0 to 255 is the DEFAULT colour, readable, exactly as the parent reader read
 * it (its grey was false), and a parameter this reader has no meaning for is
 * ignored, readable, as the parent ignored it.
 *
 * A TAB IS A CELL. tmux 3.7b prints a tab as one `\t` (measured, ./cells.ts),
 * so it is kept as a cell and leaves the row readable; input-row's projection
 * drops it and calls its row unreadable, which is what its parent did with
 * every byte below 0x20.
 *
 * ONE DELIBERATE DIFFERENCE FROM THE PARENT, stated: the parent read the
 * arguments of `58;5;n` and `58;2;r;g;b` (an underline's colour) as attributes
 * of their own, so `58;5;2` set dim. This reader reads them as the colour they
 * are. The parity test names the class and holds every other input equal.
 *
 * PURE. It imports nothing, reads nothing and logs nothing.
 */

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
const TAB = String.fromCharCode(0x09);

/** One colour as tmux wrote it: a basic slot (SGR 30 to 37, 90 to 97 and their grounds), a 256-colour index, or 24-bit. */
export type Colour =
  | { readonly kind: 'basic'; readonly n: number }
  | { readonly kind: 'index'; readonly n: number }
  | { readonly kind: 'rgb'; readonly r: number; readonly g: number; readonly b: number };

/** The SGR state. A cell holds a frozen pen; a change makes a new one. */
export interface Pen {
  readonly fg: Colour | null;
  readonly bg: Colour | null;
  /** SGR 58's underline colour: read so its arguments are not misread, never drawn. */
  readonly ul: Colour | null;
  readonly bold: boolean;
  readonly dim: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly blink: boolean;
  readonly inverse: boolean;
  readonly hidden: boolean;
  readonly strike: boolean;
  readonly overline: boolean;
}

/** One drawn code point and the pen it was drawn with. A tab is a cell whose `ch` is `\t`. */
export interface StyledCell {
  readonly ch: string;
  readonly pen: Pen;
}

/** One row of a styled capture. `readable` is false when the row held something this reader does not know. */
export interface StyledRow {
  readonly cells: StyledCell[];
  readable: boolean;
}

/** The pen of a fresh screen, and of SGR 0. */
export const DEFAULT_PEN: Pen = Object.freeze({
  fg: null,
  bg: null,
  ul: null,
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  blink: false,
  inverse: false,
  hidden: false,
  strike: false,
  overline: false
});

/** A mutable copy of a pen, for one SGR sequence to change. */
type PenDraft = { -readonly [K in keyof Pen]: Pen[K] };

/** A whole number from 0 to 255, or null. */
function byteOf(text: string | undefined): number | null {
  const n = Number(text);
  return Number.isInteger(n) && n >= 0 && n <= 255 ? n : null;
}

/** A 256-colour index, or null (the default colour) when it is not one. */
function indexOf(text: string | undefined): Colour | null {
  const n = byteOf(text);
  return n === null ? null : { kind: 'index', n };
}

/** A 24-bit colour, or null (the default colour) when any component is not a byte. */
function rgbOf(r: string | undefined, g: string | undefined, b: string | undefined): Colour | null {
  const rr = byteOf(r);
  const gg = byteOf(g);
  const bb = byteOf(b);
  return rr === null || gg === null || bb === null ? null : { kind: 'rgb', r: rr, g: gg, b: bb };
}

/**
 * Apply one SGR sequence's parameters to a draft pen. Answers false for a
 * parameter list this reader cannot follow, which makes the row unreadable.
 */
function applySgr(params: string, pen: PenDraft): boolean {
  const parts = params.length === 0 ? ['0'] : params.split(';');
  for (let k = 0; k < parts.length; k += 1) {
    const sub = (parts[k] ?? '').split(':');
    const code = sub[0] === '' ? 0 : Number(sub[0]);
    if (!Number.isInteger(code)) return false;
    if (code === 38 || code === 48 || code === 58) {
      // An extended colour: `38:5:n` / `38:2:…` in one part, or `38;5;n` /
      // `38;2;r;g;b` across parts, whose arguments are consumed here.
      let mode: string | undefined;
      let colour: Colour | null;
      if (sub.length > 1) {
        mode = sub[1];
        colour = mode === '5' ? indexOf(sub[2]) : rgbOf(sub[sub.length - 3], sub[sub.length - 2], sub[sub.length - 1]);
        if (mode === '2' && sub.length < 5) colour = null;
      } else {
        mode = parts[k + 1];
        if (mode === '5') {
          colour = indexOf(parts[k + 2]);
          k += 2;
        } else if (mode === '2') {
          colour = rgbOf(parts[k + 2], parts[k + 3], parts[k + 4]);
          k += 4;
        } else {
          colour = null;
        }
      }
      if (mode !== '5' && mode !== '2') return false;
      if (code === 38) pen.fg = colour;
      else if (code === 48) pen.bg = colour;
      else pen.ul = colour;
      continue;
    }
    if (code === 0) Object.assign(pen, DEFAULT_PEN);
    else if (code === 1) pen.bold = true;
    else if (code === 2) pen.dim = true;
    else if (code === 3) pen.italic = true;
    else if (code === 4) pen.underline = sub.length > 1 ? sub[1] !== '0' : true;
    else if (code === 5 || code === 6) pen.blink = true;
    else if (code === 7) pen.inverse = true;
    else if (code === 8) pen.hidden = true;
    else if (code === 9) pen.strike = true;
    else if (code === 21) pen.underline = true;
    else if (code === 22) {
      pen.bold = false;
      pen.dim = false;
    } else if (code === 23) pen.italic = false;
    else if (code === 24) pen.underline = false;
    else if (code === 25) pen.blink = false;
    else if (code === 27) pen.inverse = false;
    else if (code === 28) pen.hidden = false;
    else if (code === 29) pen.strike = false;
    else if (code >= 30 && code <= 37) pen.fg = { kind: 'basic', n: code - 30 };
    else if (code === 39) pen.fg = null;
    else if (code >= 40 && code <= 47) pen.bg = { kind: 'basic', n: code - 40 };
    else if (code === 49) pen.bg = null;
    else if (code === 53) pen.overline = true;
    else if (code === 55) pen.overline = false;
    else if (code === 59) pen.ul = null;
    else if (code >= 90 && code <= 97) pen.fg = { kind: 'basic', n: code - 90 + 8 };
    else if (code >= 100 && code <= 107) pen.bg = { kind: 'basic', n: code - 100 + 8 };
    // Every other whole number has no meaning here and changes nothing.
  }
  return true;
}

/**
 * The styled capture, cut into rows of cells, the pen carried across rows.
 * Exactly one row per `\n`-separated line, as many as the text has.
 */
export function readStyledRows(styled: string): StyledRow[] {
  const rows: StyledRow[] = [];
  let pen: Pen = DEFAULT_PEN;
  let row: StyledRow = { cells: [], readable: true };
  let i = 0;
  while (i < styled.length) {
    const c = styled.charAt(i);
    if (c === '\n') {
      rows.push(row);
      row = { cells: [], readable: true };
      i += 1;
      continue;
    }
    if (c === ESC) {
      const next = styled.charAt(i + 1);
      if (next === '[') {
        let j = i + 2;
        while (j < styled.length && /[0-?]/.test(styled.charAt(j))) j += 1;
        const params = styled.substring(i + 2, j);
        const paramsEnd = j;
        while (j < styled.length && /[ -/]/.test(styled.charAt(j))) j += 1;
        const final = styled.charAt(j);
        if (final === 'm' && j === paramsEnd) {
          // The parameters before one this reader cannot follow still apply,
          // as they did in the parent reader, whose pen was changed in place.
          const draft: PenDraft = { ...pen };
          if (!applySgr(params, draft)) row.readable = false;
          pen = Object.freeze(draft);
        } else {
          row.readable = false;
        }
        i = j + 1;
        continue;
      }
      if (next === ']') {
        // An OSC (a hyperlink, say) draws no cell: skipped to its terminator.
        let j = i + 2;
        while (
          j < styled.length &&
          styled.charAt(j) !== BEL &&
          styled.charAt(j) !== '\n' &&
          !(styled.charAt(j) === ESC && styled.charAt(j + 1) === '\\')
        ) {
          j += 1;
        }
        if (styled.charAt(j) === BEL) i = j + 1;
        else if (styled.charAt(j) === ESC) i = j + 2;
        else {
          row.readable = false;
          i = j;
        }
        continue;
      }
      // Any other escape: unknown, and its next character is taken with it,
      // exactly as the parent reader took it.
      row.readable = false;
      i += 2;
      continue;
    }
    const cp = styled.codePointAt(i) ?? 0;
    const ch = String.fromCodePoint(cp);
    if (ch === TAB) row.cells.push({ ch, pen });
    else if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) row.readable = false;
    else row.cells.push({ ch, pen });
    i += ch.length;
  }
  rows.push(row);
  return rows;
}
