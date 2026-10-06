/**
 * THE MAC'S OWN TERMINAL COLOURS, FOR THE PHONE'S SCREEN (Phase 337,
 * build/p337/SPEC.md §5.3.4, D12).
 *
 * The phone draws a session's screen in the colours this Mac's own dark
 * terminal draws it in at its DEFAULT appearance, so colours are resolved here
 * and the phone is handed `#rrggbb`. The sixteen slots, the default foreground,
 * the ground and the cursor are `terminalTheme` (src/renderer/terminal/theme.ts,
 * DESIGN.md §1.6) spelled once more for main, which may not import the renderer;
 * src/main/screen/__tests__/palette.test.ts reads that file AS TEXT and holds
 * every value here equal to it, case-folded.
 *
 * STATED, NOT HIDDEN (§Attack A14): the Mac's LIVE ground and ink follow
 * `--bg-canvas` and the chrome theme (theme.ts's `followPalette`), so a chosen
 * chrome hue or the light base is not carried to the phone, which is dark only.
 *
 * Indices 16 to 231 are xterm's colour cube (levels 0, 95, 135, 175, 215, 255)
 * and 232 to 255 its greys (8 + 10n), which is what xterm.js draws for them.
 *
 * PURE. It imports nothing, reads nothing and logs nothing.
 */

/** The dark terminal palette, lower case `#rrggbb`. A frozen literal no configuration reaches. */
export const SCREEN_PALETTE = Object.freeze({
  /** `TERMINAL_BACKGROUND`, the Mac's `--bg-canvas`. */
  ground: '#131417',
  /** `TERMINAL_FOREGROUND`. */
  ink: '#d8dbe2',
  /** `terminalTheme.cursor`. */
  caret: '#e8eaed',
  /** black, red, green, yellow, blue, magenta, cyan, white, then the eight bright ones, in xterm's slot order. */
  ansi: Object.freeze([
    '#1b1d22',
    '#e5655e',
    '#6bc46d',
    '#e2b340',
    '#6cb6ff',
    '#c583d8',
    '#56c2c0',
    '#c9cdd6',
    '#4a505c',
    '#f07e78',
    '#85d488',
    '#f0c674',
    '#8fc7ff',
    '#d19fe8',
    '#6fd6d4',
    '#e8eaed'
  ] as const)
});

/** xterm's six levels of the 6×6×6 cube. */
const CUBE_LEVELS = Object.freeze([0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff] as const);

/** Two lower case hex digits. */
function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * One 256-colour index as `#rrggbb`: 0 to 15 the palette's slots, 16 to 231
 * the cube, 232 to 255 the greys. A value outside 0 to 255, or not a whole
 * number, answers null.
 */
export function xterm256(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 255) return null;
  if (n < 16) return SCREEN_PALETTE.ansi[n] ?? null;
  if (n < 232) {
    const i = n - 16;
    const r = CUBE_LEVELS[Math.floor(i / 36)] ?? 0;
    const g = CUBE_LEVELS[Math.floor(i / 6) % 6] ?? 0;
    const b = CUBE_LEVELS[i % 6] ?? 0;
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  }
  const v = 8 + (n - 232) * 10;
  return `#${hex2(v)}${hex2(v)}${hex2(v)}`;
}
