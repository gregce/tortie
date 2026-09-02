/**
 * Terminal theme — DESIGN.md §1.6 palette as the shipped constant, with the
 * canvas colour re-resolved from CSS custom properties at mount so the
 * terminal and the app chrome stay one material (§0: identical background).
 * The foreground and the cursor are constants and read no token (Phase 195). Tokens land in src/renderer/styles/tokens.css (design
 * stream); until then the constants below ARE the sane dark defaults.
 */

import type { ITheme } from '@xterm/xterm';

/**
 * The two colours the capture path needs as a NON-optional `string`.
 *
 * `ITheme` types every field `string | undefined`, so every `theme.background
 * ?? …` in src/renderer/terminal/capture/** had been ending in a literal —
 * seven copies of the two values below, and a silent second source of truth
 * for the terminal's material (guardrail 5, Phase 16). They are named here,
 * in the one file DESIGN.md §1.6 sanctions as a token mirror, and the capture
 * path imports them instead of retyping them.
 */
export const TERMINAL_BACKGROUND = '#131417'; //  mirrors --bg-canvas
export const TERMINAL_FOREGROUND = '#D8DBE2'; //  DESIGN.md §1.6 foreground

/** DESIGN.md §1.6 “Terminal palette (ships as `terminalTheme` const)”. */
export const terminalTheme: ITheme = {
  background: TERMINAL_BACKGROUND,
  foreground: TERMINAL_FOREGROUND,
  cursor: '#E8EAED',
  cursorAccent: '#131417',
  selectionBackground: 'rgba(77, 157, 232, 0.30)',
  black: '#1B1D22',
  red: '#E5655E',
  green: '#6BC46D',
  yellow: '#E2B340',
  blue: '#6CB6FF',
  magenta: '#C583D8',
  cyan: '#56C2C0',
  white: '#C9CDD6',
  brightBlack: '#4A505C',
  brightRed: '#F07E78',
  brightGreen: '#85D488',
  brightYellow: '#F0C674',
  brightBlue: '#8FC7FF',
  brightMagenta: '#D19FE8',
  brightCyan: '#6FD6D4',
  brightWhite: '#E8EAED'
};

/**
 * xterm's macOS default for this option is true, and it makes a right click
 * REPLACE the current selection with the word under the pointer
 * (browser/Clipboard.ts `rightClickHandler` → SelectionService
 * `rightClickSelect`). Over blank space `_selectWordAtCursor(ev, false)`
 * finds no word, drops `selectionEnd`, and leaves nothing selected at all.
 * That is the whole of the Phase 40 selection drop: xterm's own contextmenu
 * listener on `.xterm` runs before our React handler on the ancestor pane, so
 * the menu was built from a selection the click had already destroyed.
 *
 * MEASURED in the real app, one right click on blank space beside a three
 * line selection, everything else identical:
 *
 *   option true   selection before "AAA green\nBBB magenta\nCCC cyan\n➜ …"
 *                 selection after  ""        Copy and Copy as HTML disabled
 *   option false  selection before and after identical, byte for byte
 *                 Copy and Copy as HTML both enabled
 *
 * Tortie's right click is a menu gesture and nothing else, so a right click
 * never changes what is selected. We give up xterm's select-the-word-on-
 * right-click behavior deliberately. Select All and a normal double click
 * both still select words.
 */
export const TERMINAL_RIGHT_CLICK_SELECTS_WORD = false;

/**
 * DESIGN.md §1.8: terminal runs `--font-terminal` at 13px, lineHeight 1.25,
 * spacing 0. The stack below is the macOS-native one, and it is what the
 * System preset draws.
 *
 * Glyph coverage, verified in this Chromium (Phase 9.2 Bug C canvas-bitmap
 * probe). Phase 73.1 deleted `"SF Mono"` from the head of this stack, and
 * from `--font-mono`, `--font-terminal` and `--font-editor` in tokens.css.
 * Nothing on this Mac is registered under that name, measured the way Phase
 * 78 measured `'SF Pro Text'`, being that a string set in it is exactly as
 * wide as a string set in a family name that does not exist. Chromium does
 * not implement `ui-monospace` either, so the face that actually renders is
 * **Menlo**, and it rendered before the deletion too. Menlo REGULAR covers
 * the whole prompt-glyph gauntlet
 * (➜ U+279C, ✗ U+2717, ● U+25CF, ▲ U+25B2, λ U+03BB) at exactly 1 cell
 * advance, and only the regular face does. Menlo Bold has 0 of the 128 box
 * drawing characters and Menlo Italic is missing the check at U+2713, the
 * cross at U+2717, the arrow at U+279C and the warning at U+26A0. Neither gap
 * reaches this pane, because xterm.js draws the box, block, powerline and
 * legacy computing glyphs itself (customGlyphs), independent of this stack.
 * macOS per-glyph fallback covers anything further. (The historical
 * "underscores instead of glyphs" bug was never fonts. A locale-less launchd
 * env made tmux mark the attach client non-UTF-8 and substitute `_`
 * server-side, and it was fixed in src/main/tmux/env.ts with `tmux -u`.)
 *
 * Phase 78 bundles two faces, JetBrains Mono and Source Code Pro, and offers
 * them in Settings → Appearance → Font. They are LETTERFORMS and nothing more.
 * No bundled face is needed for coverage, and none ships for it.
 */
export const TERMINAL_FONT_FALLBACK = 'ui-monospace, Menlo, monospace';
export const TERMINAL_FONT_SIZE = 13;
export const TERMINAL_LINE_HEIGHT = 1.25;
export const TERMINAL_LETTER_SPACING = 0;
/**
 * INERT, and kept as insurance only (Phase 13.7, measured).
 *
 * `tmux attach` opens with `ESC[?1049h`, so every gmux pane's xterm lives in
 * its ALTERNATE buffer for the whole session, and xterm's alternate buffer
 * has no scrollback by construction. This number caps the NORMAL buffer,
 * which never receives a line. Measured in the real app: after pushing
 * 50,000 lines through a live pane, `bufferType` was still "alternate",
 * `normalLength` was still 42, and renderer RSS moved 5.6 MB (transient parse
 * churn) rather than the +125 MB retaining them would cost.
 *
 * It is therefore NOT a scrollback setting and is deliberately not offered in
 * Settings — a placebo lever is the worst thing to teach a user. What the
 * user can actually scroll back through is tmux's `history-limit`
 * (Settings → General → Scrollback depth); what comes back after a restart is
 * `savedScrollbackLines`. Both are independent of this constant.
 *
 * Left in place because xterm's CircularList grows lazily, so it allocates
 * nothing, and it would be real insurance if a pane ever landed in the normal
 * buffer.
 */
export const TERMINAL_SCROLLBACK = 10000;

/**
 * THE base terminal font size — the one number a terminal's size is decided
 * from, and the number Phase 12.11's zoom MULTIPLIES.
 *
 * NOTHING IN SETTINGS CHANGES THIS NUMBER, and that is settled rather than
 * pending. docs/DESIGN-SPEC.md:601 withdrew the terminal font SIZE stepper,
 * not deferred it again, because per-region zoom already answers size and a
 * Settings field would be a second answer fighting the first. The same line
 * kept `--font-terminal` as the FAMILY lever, and Phase 78 built the family
 * picker that sets it. A preset changes the face and never this function's
 * answer. Zoom stays a per-region multiplier over whatever this returns.
 */
export function terminalBaseFontSize(): number {
  return TERMINAL_FONT_SIZE;
}

function cssVar(styles: CSSStyleDeclaration, name: string): string | undefined {
  const raw = styles.getPropertyValue(name).trim();
  return raw.length > 0 ? raw : undefined;
}

/**
 * The design constant, with canvas-coupled colors overridden from the design
 * tokens when they exist (`--bg-canvas` is “window base AND xterm background
 * — one material”). ANSI colors stay the §1.6 constants by design.
 *
 * Phase 62: the selection highlight also resolves from a token,
 * `--terminal-selection`, so it can follow the highlight scheme. It is the
 * one terminal color that belongs to the highlight family. The ANSI palette,
 * foreground, cursor and background stay put; the constant keeps its bytes,
 * so the capture path and the workers are unchanged.
 *
 * Phase 195 (research 75, C10): the cursor is the constant above and reads
 * no token. It belongs to the work and never follows the chrome ramp, so a
 * chrome that steps down leaves the cursor where the transcript is.
 */
export function resolveTerminalTheme(): ITheme {
  const styles = getComputedStyle(document.documentElement);
  return {
    ...terminalTheme,
    background: cssVar(styles, '--bg-canvas') ?? terminalTheme.background,
    cursorAccent: cssVar(styles, '--bg-canvas') ?? terminalTheme.cursorAccent,
    cursor: terminalTheme.cursor,
    selectionBackground:
      cssVar(styles, '--terminal-selection') ?? terminalTheme.selectionBackground
  };
}

/**
 * `--font-terminal` token when present, else the DESIGN.md stack. The token is
 * xterm-only (DESIGN.md §1.8). `--font-mono` stays the chrome token and the
 * two are never conflated, which is what lets Settings → Appearance → Font
 * change the terminal face without touching the sidebar.
 *
 * CALL THIS AFTER THE FACE IS LOADED, never before. A `@font-face` is fetched
 * only when something renders in it, so assigning a family xterm has not seen
 * makes it measure the cell and build its WebGL atlas in the fallback, and it
 * stays wrong until the next resize. TerminalPane awaits `loadWorkAreaFace`
 * first (src/renderer/theme/work-fonts.ts) for exactly that reason.
 */
export function resolveTerminalFontFamily(): string {
  const styles = getComputedStyle(document.documentElement);
  return cssVar(styles, '--font-terminal') ?? TERMINAL_FONT_FALLBACK;
}
