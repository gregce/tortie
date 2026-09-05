/**
 * A terminal buffer as inline-styled HTML.
 *
 * Two consumers, one emitter: **Copy as HTML** (Phase 12 item 1) and the
 * beyond-the-screen half of **capture** (item 2), which rasterizes this
 * markup through an SVG `foreignObject`.
 *
 * Written against xterm's PUBLIC buffer API (`IBufferCell` exposes every
 * attribute) rather than `@xterm/addon-serialize`, for two reasons:
 * zero new dependencies, and the addon reads its palette from the private
 * `_core._themeService`, which only exists after `open()` — a terminal built
 * for an off-screen capture but not opened serializes gmux green (#6BC46D)
 * as xterm's default #4e9a06 (research 17 §1.3 Trap B). Here the palette is
 * simply passed in from ./theme, so it is right by construction.
 *
 * Known, deliberate gaps (a screenshot, not a session recording):
 *  - no cursor, no selection highlight, no link underlines;
 *  - curly/dotted underline styles flatten to a plain underline;
 *  - blink does not blink;
 *  - Powerline / Nerd-Font PUA glyphs (U+E0B0…) are drawn by xterm itself
 *    from its own customGlyphs table, so no installed font has them and they
 *    render as tofu here. Viewport capture is pixel-exact and unaffected.
 */

import type { IBufferCell, IBufferRange, ITheme, Terminal } from '@xterm/xterm';
import {
  TERMINAL_BACKGROUND,
  TERMINAL_FOREGROUND,
  resolveTerminalContrastFloor
} from '../theme';
import {
  ensureContrastRatio,
  floorForCell,
  treatGlyphAsBackgroundColor
} from './contrast';

export interface HtmlRange {
  /** Absolute buffer line index, inclusive. */
  startLine: number;
  /** Absolute buffer line index, inclusive. */
  endLine: number;
}

export interface HtmlSerializeOptions {
  /** Palette + default fg/bg. Pass the same theme the live terminal uses. */
  theme: ITheme;
  /** Absolute buffer rows to emit. Defaults to the whole active buffer. */
  range?: HtmlRange;
  /** Emit only the current selection's rows (Copy as HTML). */
  onlySelection?: boolean;
  /**
   * Serialize THIS range, with its column window, instead of whatever the
   * terminal reports as selected right now. Used by the context menu, which
   * decided what to act on at the instant the user right-clicked. Only read
   * when `onlySelection` is set and no explicit `range` was given.
   */
  selection?: IBufferRange;
  /**
   * true → the terminal's own foreground on its own background (screenshots).
   * false → black on white, ANSI colors kept (pasting into a document).
   */
  includeGlobalBackground?: boolean;
  fontFamily: string;
  fontSizePx: number;
  /** xterm's MEASURED cell height. Omit for clipboard HTML. */
  lineHeightPx?: number;
  /** Per-character correction so the HTML advance matches xterm's cell grid. */
  letterSpacingPx?: number;
  /**
   * THE CONTRAST FLOOR THE SCREEN DREW AT (Phase 213). xterm applies
   * `minimumContrastRatio` at DRAW time and changes no cell, so a capture
   * built from the buffer carries the colour the agent asked for while the
   * screen carries the colour the person can read. On the light base that
   * floor is 4.5 and the difference is the whole picture: Claude Code's
   * bullets are `#ffffff`, which is a page of invisible text on paper. So
   * the same rule is applied to the same cells here, against the ground this
   * markup really sits on. Omitted, it is the live pane's own floor, which is
   * 1 on the dark base and therefore changes not one byte there.
   */
  contrastFloor?: number;
}

/**
 * The ground the clipboard flavour puts the cells on. It is not the
 * terminal's: a paste into a document is black on white with the ANSI
 * colours kept, so a cell without a background of its own is read against
 * white when the floor is applied.
 */
const CLIPBOARD_BACKGROUND = '#ffffff';

/** What the floor needs to know: how high, and what the glyph sits on. */
interface ContrastLift {
  floor: number;
  ground: string;
}

/** ITheme keys for palette entries 0–15, in ANSI order. */
const ANSI_KEYS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const;

/** xterm's 6×6×6 color cube levels (indices 16–231). */
const CUBE: readonly [number, number, number, number, number, number] = [
  0, 95, 135, 175, 215, 255
];

function hex(r: number, g: number, b: number): string {
  const p = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Palette index (0–255) → CSS color, using the app's own terminal theme. */
export function paletteColor(theme: ITheme, index: number): string {
  if (index >= 0 && index < 16) {
    return theme[ANSI_KEYS[index] as keyof ITheme] as string;
  }
  if (index >= 16 && index < 232) {
    const n = index - 16;
    const level = (i: number): number => CUBE[i] ?? 0;
    return hex(
      level(Math.floor(n / 36) % 6),
      level(Math.floor(n / 6) % 6),
      level(n % 6)
    );
  }
  if (index >= 232 && index < 256) {
    const v = 8 + (index - 232) * 10;
    return hex(v, v, v);
  }
  return theme.foreground ?? TERMINAL_FOREGROUND;
}

function rgbColor(value: number): string {
  return hex((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
}

interface CellStyle {
  fg: string | null;
  bg: string | null;
  bold: boolean;
  italic: boolean;
  dim: boolean;
  underline: boolean;
  strike: boolean;
  overline: boolean;
  invisible: boolean;
}

const PLAIN: CellStyle = {
  fg: null,
  bg: null,
  bold: false,
  italic: false,
  dim: false,
  underline: false,
  strike: false,
  overline: false,
  invisible: false
};

function sameStyle(a: CellStyle, b: CellStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.dim === b.dim &&
    a.underline === b.underline &&
    a.strike === b.strike &&
    a.overline === b.overline &&
    a.invisible === b.invisible
  );
}

function readStyle(
  cell: IBufferCell,
  theme: ITheme,
  lift: ContrastLift | null
): CellStyle {
  const bold = cell.isBold() !== 0;

  let fg: string | null = null;
  if (cell.isFgRGB()) {
    fg = rgbColor(cell.getFgColor());
  } else if (cell.isFgPalette()) {
    const index = cell.getFgColor();
    // xterm's drawBoldTextInBrightColors defaults to true: bold text on the
    // low 8 palette entries renders with the bright pair. Match it.
    fg = paletteColor(theme, bold && index < 8 ? index + 8 : index);
  }

  let bg: string | null = null;
  if (cell.isBgRGB()) {
    bg = rgbColor(cell.getBgColor());
  } else if (cell.isBgPalette()) {
    bg = paletteColor(theme, cell.getBgColor());
  }

  if (cell.isInverse() !== 0) {
    // Swap the RESOLVED colors — the live renderer inverts the real theme,
    // so hardcoding a gray (as the upstream serializer does) is a visible lie.
    const fgWas = fg ?? theme.foreground ?? TERMINAL_FOREGROUND;
    const bgWas = bg ?? theme.background ?? TERMINAL_BACKGROUND;
    fg = bgWas;
    bg = fgWas;
  }

  const dim = cell.isDim() !== 0;
  const invisible = cell.isInvisible() !== 0;

  // THE FLOOR, ON THE SAME CELLS THE SCREEN APPLIED IT TO. xterm exempts the
  // powerline separators and the box drawing range, because those are drawn
  // as a background rather than read as a letter, and it halves the floor for
  // dim text so dim stays distinguishable from the text beside it. A cell
  // with no foreground of its own inherits the wrapper's, which is already
  // clear of the wrapper's ground, so it is only resolved when the cell
  // carries a background that the inherited colour has to survive.
  if (lift !== null && lift.floor > 1 && !invisible) {
    const codepoint = cell.getChars().codePointAt(0);
    const glyphIsBackground =
      codepoint !== undefined && treatGlyphAsBackgroundColor(codepoint);
    if (!glyphIsBackground && (fg !== null || bg !== null)) {
      const ground = bg ?? lift.ground;
      const ink = fg ?? theme.foreground ?? TERMINAL_FOREGROUND;
      const lifted = ensureContrastRatio(ground, ink, floorForCell(lift.floor, dim));
      if (lifted !== null) fg = lifted;
    }
  }

  return {
    fg,
    bg,
    bold,
    italic: cell.isItalic() !== 0,
    dim,
    underline: cell.isUnderline() !== 0,
    strike: cell.isStrikethrough() !== 0,
    overline: cell.isOverline() !== 0,
    invisible
  };
}

function styleAttr(style: CellStyle): string {
  const parts: string[] = [];
  if (style.fg !== null) parts.push(`color:${style.fg}`);
  if (style.bg !== null) parts.push(`background-color:${style.bg}`);
  if (style.bold) parts.push('font-weight:bold');
  if (style.italic) parts.push('font-style:italic');
  if (style.dim) parts.push('opacity:0.5');
  const decorations: string[] = [];
  if (style.underline) decorations.push('underline');
  if (style.strike) decorations.push('line-through');
  if (style.overline) decorations.push('overline');
  if (decorations.length > 0) {
    parts.push(`text-decoration:${decorations.join(' ')}`);
  }
  if (style.invisible) parts.push('visibility:hidden');
  return parts.join(';');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Attribute values need the quote escaped too, and it is not theoretical. A
 * family name written with double quotes closes the style attribute early
 * unless it is escaped. The terminal stack carried `"SF Mono"` at its head
 * until Phase 73.1, and an unescaped `style="font-family:"SF Mono"…"` ended
 * the attribute at that second quote, the SVG stopped being well-formed XML,
 * and `img.decode()` rejected with EncodingError. That was measured, and it
 * is how the first rasterized capture failed. No stack Tortie ships today
 * carries a double quoted name, so this escape now guards the shape rather
 * than a value in the tree. It stays because the family is read from a CSS
 * custom property at capture time, and the rule is about the character rather
 * than about one stack.
 */
export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/**
 * One buffer row → one `<div>` of styled spans. Trailing cells that carry no
 * attributes at all are dropped: they contribute nothing but bytes, and the
 * wrapper's background already covers that space.
 */
function serializeRow(
  term: Terminal,
  y: number,
  theme: ITheme,
  lift: ContrastLift | null,
  colStart = 0,
  colEnd = Number.POSITIVE_INFINITY
): string {
  const line = term.buffer.active.getLine(y);
  if (line === undefined) return '<div> </div>';

  const cell = term.buffer.active.getNullCell();
  const from = Math.max(0, colStart);
  const to = Math.min(line.length, colEnd);
  let lastPainted = -1;
  for (let x = to - 1; x >= from; x--) {
    const c = line.getCell(x, cell);
    if (c === undefined) continue;
    const chars = c.getChars();
    if (!c.isAttributeDefault() || (chars !== '' && chars !== ' ')) {
      lastPainted = x;
      break;
    }
  }
  if (lastPainted < 0) return '<div> </div>';

  let html = '';
  let open: CellStyle | null = null;
  let run = '';

  const flush = (): void => {
    if (open === null) return;
    const attr = styleAttr(open);
    html +=
      attr.length > 0
        ? `<span style="${escapeAttr(attr)}">${escapeHtml(run)}</span>`
        : escapeHtml(run);
    run = '';
  };

  for (let x = from; x <= lastPainted; x++) {
    const c = line.getCell(x, cell);
    if (c === undefined) continue;
    // Width 0 = the trailing half of a wide (CJK/emoji) cell; the glyph was
    // already emitted with the leading half.
    if (c.getWidth() === 0) continue;
    // A default cell is the wrapper's own pair, which is clear of its own
    // ground on both flavours, so the floor has nothing to do there.
    const style = c.isAttributeDefault() ? PLAIN : readStyle(c, theme, lift);
    if (open === null || !sameStyle(open, style)) {
      flush();
      open = style;
    }
    const chars = c.getChars();
    run += chars === '' ? ' ' : chars;
  }
  flush();
  return `<div>${html.length > 0 ? html : ' '}</div>`;
}

/**
 * Serialize `range` (or the selection, or the whole buffer) as one
 * inline-styled block. The returned string is a bare `<div>` tree — the
 * clipboard wrapper and the SVG wrapper are added by their own callers.
 */
export function serializeAsHtml(
  term: Terminal,
  options: HtmlSerializeOptions
): string {
  const {
    theme,
    includeGlobalBackground = false,
    fontFamily,
    fontSizePx,
    lineHeightPx,
    letterSpacingPx,
    contrastFloor = resolveTerminalContrastFloor()
  } = options;
  // The ground the emitted markup really puts a cell on, which is what the
  // floor is measured against: the terminal's own on a picture, and the
  // document's white on the clipboard flavour.
  const lift: ContrastLift | null =
    contrastFloor > 1
      ? {
          floor: contrastFloor,
          ground: includeGlobalBackground
            ? (theme.background ?? TERMINAL_BACKGROUND)
            : CLIPBOARD_BACKGROUND
        }
      : null;

  let range = options.range;
  // Column window, so a selection copies the characters the user dragged
  // over rather than whole rows. `end.x` is exclusive in xterm's model.
  let firstCol = 0;
  let lastColExclusive = Number.POSITIVE_INFINITY;
  if (range === undefined && options.onlySelection === true) {
    const sel = options.selection ?? term.getSelectionPosition();
    if (sel === undefined) return '';
    range = { startLine: sel.start.y, endLine: sel.end.y };
    firstCol = sel.start.x;
    lastColExclusive = sel.end.x;
  }
  const first = Math.max(0, range?.startLine ?? 0);
  const last = Math.min(
    term.buffer.active.length - 1,
    range?.endLine ?? term.buffer.active.length - 1
  );

  const rows: string[] = [];
  for (let y = first; y <= last; y++) {
    rows.push(
      serializeRow(
        term,
        y,
        theme,
        lift,
        y === first ? firstCol : 0,
        y === last ? lastColExclusive : Number.POSITIVE_INFINITY
      )
    );
  }

  const wrapper: string[] = [
    `color:${
      includeGlobalBackground ? (theme.foreground ?? TERMINAL_FOREGROUND) : '#000000'
    }`,
    `background-color:${
      includeGlobalBackground ? (theme.background ?? TERMINAL_BACKGROUND) : '#ffffff'
    }`,
    `font-family:${fontFamily}`,
    `font-size:${fontSizePx}px`,
    'white-space:pre'
  ];
  if (lineHeightPx !== undefined) wrapper.push(`line-height:${lineHeightPx}px`);
  if (letterSpacingPx !== undefined && Math.abs(letterSpacingPx) > 0.01) {
    wrapper.push(`letter-spacing:${letterSpacingPx.toFixed(3)}px`);
  }

  return `<div style="${escapeAttr(wrapper.join(';'))}">${rows.join('')}</div>`;
}

/**
 * The clipboard flavor: the same markup inside the CF_HTML fragment markers
 * every clipboard expects.
 */
export function toClipboardHtml(body: string): string {
  return `<html><body><!--StartFragment--><pre>${body}</pre><!--EndFragment--></body></html>`;
}
