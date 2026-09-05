/**
 * THE CONTRAST FLOOR, APPLIED TO A CAPTURE (Phase 213, wired in its fix
 * round).
 *
 * xterm applies `minimumContrastRatio` at DRAW time, in the renderer, and
 * changes no cell. So a capture built from the BUFFER carries the colour the
 * agent asked for while the screen carries the colour the person can read,
 * and on the light base, where the floor is 4.5, that difference is the whole
 * picture: research 80 measured Claude Code drawing its bullets in `#ffffff`
 * at 1.07:1 on paper. Copy as HTML, a history capture and a selection
 * scrolled out of view all go through the buffer, so all three would have
 * been a page of invisible text.
 *
 * The module is a vendored extract of xterm's own arithmetic, so what these
 * tests pin is that it REPRODUCES WHAT THE SCREEN DREW rather than something
 * nicer: the five mappings research 80 section 1.3 measured in the running
 * app at ratio 4.5 on the paper ground, byte for byte, and the same six cells
 * left alone on the dark ground because they already clear the floor there.
 * Then the serializer, driven over a fake buffer: the floor reaches a cell,
 * the exemptions xterm makes are made here too, and the dark base emits the
 * bytes it emitted before this existed.
 */

import { describe, expect, it } from 'vitest';
import type { IBufferCell, ITheme, Terminal } from '@xterm/xterm';
import {
  ensureContrastRatio,
  floorForCell,
  treatGlyphAsBackgroundColor
} from '../contrast';
import { serializeAsHtml } from '../serialize';
import { terminalTheme, terminalThemeLight } from '../../theme';

/** The two grounds, from the shipped themes rather than from a copy. */
const PAPER = terminalThemeLight.background as string;
const GRAPHITE = terminalTheme.background as string;

/**
 * The five cells research 80 §1.3 measured in the running app, run C, Claude
 * Code with no turn, each a colour the agent hard codes for a dark ground.
 * The right hand column is what THIS arithmetic answers; the research table
 * quotes a pixel read out of the photograph, which agrees exactly on the
 * neutral grey and sits a few levels off on the four chromatic ones, because
 * a glyph pixel is the drawn colour blended with the ground by antialiasing.
 * `#ffd700` is the plain case: its blue channel is 0 and xterm's walk only
 * ever subtracts, so the drawn colour cannot have the `22` of blue the
 * photograph read.
 *
 *   asked      drawn (here)   photographed (research 80)
 *   #ffd700    #867000        #837122
 *   #949494    #6b6b6b        #6b6b6b
 *   #afd7ff    #5a7086        #5f7084
 *   #ff87af    #a65771        #9c5b71
 *   #87d787    #467046        #506f4a
 */
const MEASURED: [string, string][] = [
  ['#ffd700', '#867000'],
  ['#949494', '#6b6b6b'],
  ['#afd7ff', '#5a7086'],
  ['#ff87af', '#a65771'],
  ['#87d787', '#467046']
];

describe('the floor xterm draws at, reproduced', () => {
  it('lifts every colour research 80 measured, to the byte the walk reaches', () => {
    for (const [asked, drawn] of MEASURED) {
      expect(ensureContrastRatio(PAPER, asked, 4.5), asked).toBe(drawn);
    }
  });

  it('leaves the same colours alone on graphite, which is why dark is untouched', () => {
    for (const [asked] of MEASURED) {
      expect(ensureContrastRatio(GRAPHITE, asked, 4.5), asked).toBeNull();
    }
  });

  it('answers null at a floor of 1, which is the dark theme s option', () => {
    for (const [asked] of MEASURED) {
      expect(ensureContrastRatio(PAPER, asked, 1)).toBeNull();
    }
  });

  it('halves the floor for dim text, as xterm does', () => {
    expect(floorForCell(4.5, false)).toBe(4.5);
    expect(floorForCell(4.5, true)).toBe(2.25);
    // And the halved floor really is a weaker lift.
    expect(ensureContrastRatio(PAPER, '#ffffff', floorForCell(4.5, false))).toBe('#6c6c6c');
    expect(ensureContrastRatio(PAPER, '#ffffff', floorForCell(4.5, true))).toBe('#a6a6a6');
    // A grey that already clears the halved floor is left exactly alone.
    expect(ensureContrastRatio(PAPER, '#949494', floorForCell(4.5, true))).toBeNull();
  });

  it('exempts the glyphs xterm draws as a background', () => {
    expect(treatGlyphAsBackgroundColor(0x2500)).toBe(true); // box drawing
    expect(treatGlyphAsBackgroundColor(0x2588)).toBe(true); // full block
    expect(treatGlyphAsBackgroundColor(0xe0b0)).toBe(true); // powerline
    expect(treatGlyphAsBackgroundColor(0x0041)).toBe(false); // the letter A
    expect(treatGlyphAsBackgroundColor(0x2764)).toBe(false); // a heart
  });

  it('answers null for anything that is not a plain six digit hex', () => {
    expect(ensureContrastRatio('rgb(0,0,0)', '#ffffff', 4.5)).toBeNull();
    expect(ensureContrastRatio(PAPER, 'transparent', 4.5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The serializer, over a fake buffer.
// ---------------------------------------------------------------------------

interface Spec {
  chars: string;
  fgRgb?: number;
  bgRgb?: number;
  dim?: boolean;
  invisible?: boolean;
}

function cell(spec: Spec): IBufferCell {
  return {
    getChars: () => spec.chars,
    getCode: () => spec.chars.codePointAt(0) ?? 0,
    getWidth: () => 1,
    getFgColorMode: () => 0,
    getBgColorMode: () => 0,
    getFgColor: () => spec.fgRgb ?? -1,
    getBgColor: () => spec.bgRgb ?? -1,
    isBold: () => 0,
    isItalic: () => 0,
    isDim: () => (spec.dim === true ? 1 : 0),
    isUnderline: () => 0,
    isBlink: () => 0,
    isInverse: () => 0,
    isInvisible: () => (spec.invisible === true ? 1 : 0),
    isStrikethrough: () => 0,
    isOverline: () => 0,
    isFgRGB: () => spec.fgRgb !== undefined,
    isBgRGB: () => spec.bgRgb !== undefined,
    isFgPalette: () => false,
    isBgPalette: () => false,
    isFgDefault: () => spec.fgRgb === undefined,
    isBgDefault: () => spec.bgRgb === undefined,
    isAttributeDefault: () =>
      spec.fgRgb === undefined &&
      spec.bgRgb === undefined &&
      spec.dim !== true &&
      spec.invisible !== true
  } as IBufferCell;
}

function fakeTerm(rows: Spec[][]): Terminal {
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
    getSelectionPosition: () => undefined
  } as unknown as Terminal;
}

const rgb = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16);

/** The colour of the first cell RUN, past the wrapper's own colour. */
const inkOf = (markup: string): string =>
  /<span style="[^"]*?color:(#[0-9a-f]{6})/.exec(markup)?.[1] ?? '';

function html(rows: Spec[][], theme: ITheme, floor: number, global = true): string {
  return serializeAsHtml(fakeTerm(rows), {
    theme,
    includeGlobalBackground: global,
    fontFamily: 'Menlo',
    fontSizePx: 13,
    contrastFloor: floor
  });
}

const bullets = (): Spec[] => [...'ok'].map((c) => ({ chars: c, fgRgb: rgb('#ffffff') }));

describe('the capture applies the floor the screen applied', () => {
  it('lifts an agent s white bullets off the paper', () => {
    const drawn = html([bullets()], terminalThemeLight, 4.5);
    expect(drawn).not.toContain('color:#ffffff');
    // The white text ends up dark enough to read on paper, which is the whole
    // point: at ratio 1 this markup is a page of invisible text.
    expect(inkOf(drawn)).toBe('#6c6c6c');
  });

  it('changes not one byte on the dark base, where the floor is 1', () => {
    const dark = html([bullets()], terminalTheme, 1);
    expect(dark).toContain('color:#ffffff');
    // And the light theme at the dark floor is the same markup, so it really
    // is the floor doing this and not the palette.
    expect(html([bullets()], terminalThemeLight, 1)).toContain('color:#ffffff');
  });

  it('measures a cell against its OWN background when it has one', () => {
    // An agent that paints its own dark box inside the light window: the
    // white is fine there and must be left exactly as the agent wrote it.
    const boxed = [{ chars: 'x', fgRgb: rgb('#ffffff'), bgRgb: rgb('#141414') }];
    const drawn = html([boxed], terminalThemeLight, 4.5);
    expect(drawn).toContain('color:#ffffff');
    expect(drawn).toContain('background-color:#141414');
  });

  it('leaves a box drawing glyph alone, so a frame keeps one colour', () => {
    const rule = [{ chars: '─', fgRgb: rgb('#f9d949') }];
    expect(html([rule], terminalThemeLight, 4.5)).toContain('color:#f9d949');
    // The same colour on a letter IS lifted.
    const word = [{ chars: 'A', fgRgb: rgb('#f9d949') }];
    expect(html([word], terminalThemeLight, 4.5)).not.toContain('color:#f9d949');
  });

  it('holds dim text to half the floor', () => {
    const ink = (dim: boolean): string =>
      inkOf(html([[{ chars: 'a', fgRgb: rgb('#ffffff'), dim }]], terminalThemeLight, 4.5));
    expect(ink(false)).toBe('#6c6c6c');
    expect(ink(true)).toBe('#a6a6a6');
  });

  it('reads the clipboard flavour against the white it pastes onto', () => {
    // The clipboard wrapper is black on white whatever the scheme, so a pale
    // colour is lifted against WHITE and not against the paper.
    const pale = [{ chars: 'a', fgRgb: rgb('#87d787') }];
    const onPaper = inkOf(html([pale], terminalThemeLight, 4.5));
    const onWhite = inkOf(html([pale], terminalThemeLight, 4.5, false));
    expect(onPaper).toBe('#467046');
    expect(onWhite).toBe('#4e7d4e');
  });

  it('leaves an invisible cell invisible rather than lifting it', () => {
    const hidden = [{ chars: 'a', fgRgb: rgb('#ffffff'), invisible: true }];
    const drawn = html([hidden], terminalThemeLight, 4.5);
    expect(drawn).toContain('visibility:hidden');
    expect(drawn).toContain('color:#ffffff');
  });
});
