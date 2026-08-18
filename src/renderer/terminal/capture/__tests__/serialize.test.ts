/**
 * The buffer → HTML emitter, driven by a hand-built fake buffer so the whole
 * span-run/attribute path is covered without a DOM or a real terminal.
 */

import { describe, expect, it } from 'vitest';
import type { IBufferCell, IBufferRange, ITheme, Terminal } from '@xterm/xterm';
import { escapeHtml, paletteColor, serializeAsHtml } from '../serialize';
import { terminalTheme } from '../../theme';

// The SHIPPED palette, not a copy of it: the emitter's job is to turn cell
// attributes into the colors the user is actually looking at, so a test
// against a hand-typed duplicate would keep passing after the theme moved.
const THEME: ITheme = terminalTheme;

interface FakeCellSpec {
  chars: string;
  fgPalette?: number;
  fgRgb?: number;
  bgPalette?: number;
  bold?: boolean;
  italic?: boolean;
  dim?: boolean;
  underline?: boolean;
  strike?: boolean;
  inverse?: boolean;
  width?: number;
}

function cell(spec: FakeCellSpec): IBufferCell {
  const plain =
    spec.fgPalette === undefined &&
    spec.fgRgb === undefined &&
    spec.bgPalette === undefined &&
    spec.bold !== true &&
    spec.italic !== true &&
    spec.dim !== true &&
    spec.underline !== true &&
    spec.strike !== true &&
    spec.inverse !== true;
  return {
    getChars: () => spec.chars,
    getCode: () => spec.chars.charCodeAt(0) || 0,
    getWidth: () => spec.width ?? 1,
    getFgColorMode: () => 0,
    getBgColorMode: () => 0,
    getFgColor: () => spec.fgPalette ?? spec.fgRgb ?? -1,
    getBgColor: () => spec.bgPalette ?? -1,
    isBold: () => (spec.bold === true ? 1 : 0),
    isItalic: () => (spec.italic === true ? 1 : 0),
    isDim: () => (spec.dim === true ? 1 : 0),
    isUnderline: () => (spec.underline === true ? 1 : 0),
    isBlink: () => 0,
    isInverse: () => (spec.inverse === true ? 1 : 0),
    isInvisible: () => 0,
    isStrikethrough: () => (spec.strike === true ? 1 : 0),
    isOverline: () => 0,
    isFgRGB: () => spec.fgRgb !== undefined,
    isBgRGB: () => false,
    isFgPalette: () => spec.fgPalette !== undefined,
    isBgPalette: () => spec.bgPalette !== undefined,
    isFgDefault: () => spec.fgPalette === undefined && spec.fgRgb === undefined,
    isBgDefault: () => spec.bgPalette === undefined,
    isAttributeDefault: () => plain
  } as IBufferCell;
}

/**
 * A Terminal whose active buffer is the given rows of fake cells.
 * `reports` is what `getSelectionPosition` answers — the LIVE model, which
 * Phase 40's snapshot path must be able to override.
 */
function fakeTerm(rows: FakeCellSpec[][], reports?: IBufferRange): Terminal {
  const lines = rows.map((specs) => specs.map(cell));
  return {
    buffer: {
      active: {
        type: 'normal',
        length: lines.length,
        viewportY: 0,
        getNullCell: () => cell({ chars: ' ' }),
        getLine: (y: number) => {
          const line = lines[y];
          if (line === undefined) return undefined;
          return {
            length: line.length,
            isWrapped: false,
            getCell: (x: number) => line[x],
            translateToString: () => ''
          };
        }
      }
    },
    getSelectionPosition: () => reports
  } as unknown as Terminal;
}

function render(rows: FakeCellSpec[][]): string {
  return serializeAsHtml(fakeTerm(rows), {
    theme: THEME,
    fontFamily: 'Menlo',
    fontSizePx: 13
  });
}

const text = (specs: string): FakeCellSpec[] =>
  [...specs].map((c) => ({ chars: c }));

describe('paletteColor', () => {
  it('reads 0–15 from the app theme, not xterm defaults', () => {
    expect(paletteColor(THEME, 2)).toBe('#6BC46D');
    expect(paletteColor(THEME, 10)).toBe('#85D488');
  });

  it('computes the 6×6×6 cube for 16–231', () => {
    expect(paletteColor(THEME, 16)).toBe('#000000');
    expect(paletteColor(THEME, 231)).toBe('#ffffff');
    expect(paletteColor(THEME, 46)).toBe('#00ff00');
  });

  it('computes the grayscale ramp for 232–255', () => {
    expect(paletteColor(THEME, 232)).toBe('#080808');
    expect(paletteColor(THEME, 255)).toBe('#eeeeee');
  });
});

describe('escapeHtml', () => {
  it('escapes the three characters that break markup', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
});

describe('attribute escaping', () => {
  // Regression: the terminal font stack contains double quotes. Unescaped,
  // they closed the style attribute, the SVG stopped being well-formed XML,
  // and rasterizing rejected with EncodingError (measured in an Electron
  // probe before this escape existed).
  it('escapes the quotes in the terminal font stack', () => {
    const html = serializeAsHtml(fakeTerm([text('x')]), {
      theme: THEME,
      // A quoted family name chosen for this test. It is no longer the
      // shipped stack, because Phase 73.1 deleted 'SF Mono' from every live
      // stack. The escaping rule is about the double quote character, so the
      // fixture keeps one.
      fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
      fontSizePx: 13
    });
    expect(html).not.toMatch(/style="[^"]*"SF Mono"/);
    expect(html).toContain('&quot;SF Mono&quot;');
    // Well-formedness proxy without a DOM: quotes only ever delimit
    // attributes, so the count must stay even and small.
    const quotes = (html.match(/"/g) ?? []).length;
    expect(quotes % 2).toBe(0);
  });
});

describe('serializeAsHtml', () => {
  it('emits one div per row and no span for unstyled text', () => {
    const html = render([text('hi'), text('yo')]);
    expect(html).toContain('<div>hi</div><div>yo</div>');
    expect(html).not.toContain('<span');
  });

  it('carries the terminal font and a light rendition by default', () => {
    const html = render([text('x')]);
    expect(html).toContain('font-family:Menlo');
    expect(html).toContain('color:#000000');
    expect(html).toContain('background-color:#ffffff');
  });

  it('paints the terminal fg/bg when asked (screenshots)', () => {
    const html = serializeAsHtml(fakeTerm([text('x')]), {
      theme: THEME,
      includeGlobalBackground: true,
      fontFamily: 'Menlo',
      fontSizePx: 13
    });
    expect(html).toContain('color:#D8DBE2');
    expect(html).toContain('background-color:#131417');
  });

  it('runs one span across cells that share a style', () => {
    const html = render([
      [
        { chars: 'o', fgPalette: 2 },
        { chars: 'k', fgPalette: 2 },
        { chars: '!' }
      ]
    ]);
    expect(html).toContain('<span style="color:#6BC46D">ok</span>!');
  });

  it('promotes bold on the low palette to its bright pair, as xterm does', () => {
    const html = render([[{ chars: 'b', fgPalette: 1, bold: true }]]);
    expect(html).toContain('color:#F07E78');
    expect(html).toContain('font-weight:bold');
  });

  it('emits 24-bit color verbatim', () => {
    const html = render([[{ chars: 'z', fgRgb: 0x336699 }]]);
    expect(html).toContain('color:#336699');
  });

  it('swaps the resolved colors for inverse instead of a hardcoded gray', () => {
    const html = render([[{ chars: 'i', fgPalette: 2, inverse: true }]]);
    expect(html).toContain('color:#131417');
    expect(html).toContain('background-color:#6BC46D');
  });

  it('combines decorations into one declaration', () => {
    const html = render([
      [{ chars: 'u', underline: true, strike: true, dim: true, italic: true }]
    ]);
    expect(html).toContain('text-decoration:underline line-through');
    expect(html).toContain('font-style:italic');
    expect(html).toContain('opacity:0.5');
  });

  it('trims trailing unstyled padding but keeps painted background', () => {
    const html = render([
      [{ chars: 'a' }, { chars: ' ' }, { chars: ' ' }]
    ]);
    expect(html).toContain('<div>a</div>');
    const bg = render([[{ chars: 'a' }, { chars: ' ', bgPalette: 4 }]]);
    expect(bg).toContain('background-color:#6CB6FF');
  });

  it('renders an empty row as a line, not as nothing', () => {
    expect(render([[]])).toContain('<div> </div>');
  });

  it('skips the trailing half of a wide cell', () => {
    const html = render([
      [
        { chars: '漢', width: 2 },
        { chars: '', width: 0 },
        { chars: 'x' }
      ]
    ]);
    expect(html).toContain('<div>漢x</div>');
  });

  it('honours an explicit row range', () => {
    const html = serializeAsHtml(fakeTerm([text('a'), text('b'), text('c')]), {
      theme: THEME,
      range: { startLine: 1, endLine: 2 },
      fontFamily: 'Menlo',
      fontSizePx: 13
    });
    expect(html).toContain('<div>b</div><div>c</div>');
    expect(html).not.toContain('<div>a</div>');
  });

  it('serializes the passed selection and ignores what the terminal reports', () => {
    // Phase 40. The menu decided what to act on when the user right-clicked;
    // the terminal's own answer arrives later and may be a different range.
    const html = serializeAsHtml(
      fakeTerm([text('a'), text('b'), text('c')], {
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 }
      }),
      {
        theme: THEME,
        onlySelection: true,
        selection: { start: { x: 0, y: 1 }, end: { x: 1, y: 2 } },
        fontFamily: 'Menlo',
        fontSizePx: 13
      }
    );
    expect(html).toContain('<div>b</div><div>c</div>');
    expect(html).not.toContain('<div>a</div>');
  });

  it('falls back to the live selection when no range is passed', () => {
    const html = serializeAsHtml(
      fakeTerm([text('a'), text('b'), text('c')], {
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 }
      }),
      {
        theme: THEME,
        onlySelection: true,
        fontFamily: 'Menlo',
        fontSizePx: 13
      }
    );
    expect(html).toContain('<div>a</div><div>b</div>');
    expect(html).not.toContain('<div>c</div>');
  });

  it('adds the measured line height and letter-spacing correction', () => {
    const html = serializeAsHtml(fakeTerm([text('a')]), {
      theme: THEME,
      fontFamily: 'Menlo',
      fontSizePx: 13,
      lineHeightPx: 18.5,
      letterSpacingPx: 0.12
    });
    expect(html).toContain('line-height:18.5px');
    expect(html).toContain('letter-spacing:0.120px');
  });
});
