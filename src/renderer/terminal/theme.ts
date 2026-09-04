/**
 * Terminal theme — DESIGN.md §1.6 palette as the shipped constant, with the
 * canvas colour re-resolved from CSS custom properties at mount so the
 * terminal and the app chrome stay one material (§0: identical background).
 * The foreground and the cursor are constants and read no token (Phase 195);
 * since Phase 207 they and the ANSI palette follow the GROUND by the text
 * rule, which leaves them the constants on every dark canvas. Tokens land in
 * src/renderer/styles/tokens.css (design stream); until then the constants
 * below ARE the sane dark defaults.
 */

import type { ITheme } from '@xterm/xterm';
import type { BaseScheme } from '@shared/settings';
import { useChromeTheme } from '../theme/chrome-theme';
import { TERMINAL_FLOOR, TEXT_FLOOR, followPalette } from '../theme/hue';

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
 * THE TERMINAL ON PAPER (Phase 213, research 80 section 7.2). The light
 * base's own sixteen, designed rather than derived: the normal eight are
 * text and clear 6.5:1 on the paper in the dark palette's own hues, the
 * bright eight are the same hues lighter and 50 percent more saturated at
 * exactly 4.5:1, because xterm draws bold in the bright slot and bold text
 * is text, and every bright pair is at least dE2000 9.2 from its normal,
 * where the six vendor light palettes read 0 to 6.4. Slot 0 is the ink,
 * slot 7 body text a rung under it, slot 8 the dim grey, slot 15 the
 * transcript ink, so a TUI that asks for white on black gets ink on paper.
 * The two mirrors below are the light `--bg-canvas` and the transcript ink.
 */
export const TERMINAL_BACKGROUND_LIGHT = '#f5f7fa'; // mirrors the light --bg-canvas
export const TERMINAL_FOREGROUND_LIGHT = '#282a30'; // 13.36:1, pinned 13.29

export const terminalThemeLight: ITheme = {
  background: TERMINAL_BACKGROUND_LIGHT,
  foreground: TERMINAL_FOREGROUND_LIGHT,
  cursor: '#1e1f22',
  cursorAccent: TERMINAL_BACKGROUND_LIGHT,
  selectionBackground: 'rgba(33, 117, 189, 0.30)',
  black: '#353639',
  red: '#a72a2b',
  green: '#006814',
  yellow: '#715500',
  blue: '#025b9e',
  magenta: '#7e3f8f',
  cyan: '#006464',
  white: '#51545c',
  brightBlack: '#6a707d',
  brightRed: '#ca4141',
  brightGreen: '#008422',
  brightYellow: '#936b00',
  brightBlue: '#4075a9',
  brightMagenta: '#9c52bc',
  brightCyan: '#007f7e',
  brightWhite: '#282a30'
};

/**
 * xterm's `minimumContrastRatio`, per scheme (Phase 213, research 80
 * section 1.3). Nine of the twelve registry agents hard code their colours
 * for a dark ground and ignore the sixteen slots, so on paper Claude Code
 * draws its bullets in #ffffff at 1.07:1 and its warnings in #ffd700 at
 * 1.31:1. This option is the ONLY mechanism that makes them readable without
 * the agent changing: at 4.5 xterm lifts #ffd700 to #837122 (4.50), #949494
 * to #6b6b6b (4.97) and #afd7ff to #5f7084 (4.73) at draw time, changing no
 * cell. It belongs to the LIGHT theme alone. On the dark ground every colour
 * that already clears 4.5 is drawn byte for byte at either value, but Claude
 * Code's #4e4e4e on #3a3a3a would move, so the dark theme keeps xterm's
 * default of 1, which is what keeps dark byte identical. The cost, stated: a
 * separator an agent dims on purpose is lifted too, and a colour the agent
 * chose for meaning inside its own box is moved toward the ground's
 * opposite rather than kept.
 */
export const TERMINAL_MIN_CONTRAST_LIGHT = 4.5;
export const TERMINAL_MIN_CONTRAST_DARK = 1;

export function terminalContrastFloorFor(scheme: BaseScheme): number {
  return scheme === 'light' ? TERMINAL_MIN_CONTRAST_LIGHT : TERMINAL_MIN_CONTRAST_DARK;
}

/** The base theme of one scheme: the dark constant or the light one. */
export function terminalThemeFor(scheme: BaseScheme): ITheme {
  return scheme === 'light' ? terminalThemeLight : terminalTheme;
}

/** The floor this option is at for the live pane right now. */
export function resolveTerminalContrastFloor(): number {
  return terminalContrastFloorFor(useChromeTheme.getState().scheme);
}

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
 * The eighteen colours that are TEXT on the terminal's ground: the
 * foreground, the cursor and the sixteen ANSI entries. They follow the
 * ground by the rule in src/renderer/theme/hue.ts (Phase 207), because the
 * terminal is the same material as the frame and a canvas the hue makes
 * light needs dark text in it exactly as the sidebar does. `black` and
 * `brightBlack` are exempt from the light side floor, because they sit near
 * the ground by design. On the shipped canvas every one of them is the
 * constant above, byte for byte.
 */
const TERMINAL_TEXT_KEYS = [
  'foreground',
  'cursor',
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

type TerminalTextKey = (typeof TERMINAL_TEXT_KEYS)[number];

const TERMINAL_TEXT: Readonly<Record<TerminalTextKey, string>> = Object.fromEntries(
  TERMINAL_TEXT_KEYS.map((key) => [key, terminalTheme[key] ?? TERMINAL_FOREGROUND])
) as Record<TerminalTextKey, string>;

const TERMINAL_TEXT_LIGHT: Readonly<Record<TerminalTextKey, string>> = Object.fromEntries(
  TERMINAL_TEXT_KEYS.map((key) => [key, terminalThemeLight[key] ?? TERMINAL_FOREGROUND_LIGHT])
) as Record<TerminalTextKey, string>;

const TERMINAL_TEXT_EXEMPT: readonly TerminalTextKey[] = ['black', 'brightBlack'];

/**
 * The terminal's text colours on this canvas. Pure, so the gate can run it
 * under node: on the shipped canvas of either base it is the identity, and
 * on a moved one every colour keeps the ratio it ships with against that
 * base's own canvas, in its own hue. The scheme picks the base (Phase 213):
 * the light palette is designed, not the dark one solved, so a light canvas
 * under the light scheme starts from the sixteen above.
 */
export function terminalTextFor(
  canvas: string,
  textDark: boolean,
  scheme: BaseScheme = 'dark'
): Record<TerminalTextKey, string> {
  const light = scheme === 'light';
  return followPalette(
    light ? TERMINAL_TEXT_LIGHT : TERMINAL_TEXT,
    light ? TERMINAL_BACKGROUND_LIGHT : TERMINAL_BACKGROUND,
    canvas,
    textDark,
    TERMINAL_TEXT_EXEMPT,
    (key) => (key === 'foreground' ? TEXT_FLOOR : TERMINAL_FLOOR)
  );
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
 *
 * Phase 207: the canvas may now be the hue's, and the foreground, the cursor
 * and the ANSI palette follow the GROUND, never the ramp: they are the
 * constants above at every hue, and move only when a ground lifts one under
 * its floor or flips the text dark, which no hue does. That is the one rule
 * the text tokens follow, applied to the same material. The cursor is in the
 * set because a light cursor on a light ground is no cursor at all; on any
 * dark canvas it is still the Phase 195 constant.
 */
export function resolveTerminalTheme(): ITheme {
  const styles = getComputedStyle(document.documentElement);
  const { scheme, textDark } = useChromeTheme.getState();
  const base = terminalThemeFor(scheme);
  const canvas = cssVar(styles, '--bg-canvas') ?? base.background ?? TERMINAL_BACKGROUND;
  const text = terminalTextFor(canvas, textDark, scheme);
  return {
    ...base,
    ...text,
    background: canvas,
    cursorAccent: canvas,
    selectionBackground:
      cssVar(styles, '--terminal-selection') ?? base.selectionBackground
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
