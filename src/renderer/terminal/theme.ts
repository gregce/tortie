/**
 * Terminal theme — DESIGN.md §1.6 palette as the shipped constant, with the
 * canvas/foreground/cursor colors re-resolved from CSS custom properties at
 * mount so the terminal and the app chrome stay one material (§0: identical
 * background). Tokens land in src/renderer/styles/tokens.css (design
 * stream); until then the constants below ARE the sane dark defaults.
 */

import type { ITheme } from '@xterm/xterm';

/** DESIGN.md §1.6 “Terminal palette (ships as `terminalTheme` const)”. */
export const terminalTheme: ITheme = {
  background: '#131417',
  foreground: '#D8DBE2',
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
 * DESIGN.md §1.8: terminal runs `--font-terminal` at 13px, lineHeight 1.25,
 * spacing 0 — the verified macOS-native stack below (no bundled face).
 *
 * Glyph coverage — verified in this Chromium (Phase 9.2 Bug C canvas-bitmap
 * probe): "SF Mono" is not system-registered (Terminal.app-private) and
 * Chromium does not implement `ui-monospace`, so the face that actually
 * renders is **Menlo** — which covers the whole prompt-glyph gauntlet
 * (➜ U+279C, ✗ U+2717, ● U+25CF, ▲ U+25B2, λ U+03BB) at exactly 1 cell
 * advance. macOS per-glyph fallback covers anything further; no bundled
 * font is needed. (The historical "underscores instead of glyphs" bug was
 * never fonts: a locale-less launchd env made tmux mark the attach client
 * non-UTF-8 and substitute `_` server-side — fixed in src/main/tmux/env.ts
 * + `tmux -u`.) Powerline PUA glyphs (U+E0B0…) are drawn by xterm.js
 * itself (customGlyphs), independent of this stack.
 */
export const TERMINAL_FONT_FALLBACK =
  '"SF Mono", ui-monospace, Menlo, monospace';
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
 * DESIGN.md §9.7 / DESIGN-SPEC S13 describe a Settings → General family+size
 * control; it was deferred in Phase 10 and is still not built (the docs now
 * say so instead of promising it). When it lands it changes THIS function's
 * answer — it must never become a second, competing size next to zoom, or two
 * controls will fight over one pane. Zoom is always a per-region multiplier
 * over whatever this returns.
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
 */
export function resolveTerminalTheme(): ITheme {
  const styles = getComputedStyle(document.documentElement);
  return {
    ...terminalTheme,
    background: cssVar(styles, '--bg-canvas') ?? terminalTheme.background,
    cursorAccent: cssVar(styles, '--bg-canvas') ?? terminalTheme.cursorAccent,
    cursor: cssVar(styles, '--text-primary') ?? terminalTheme.cursor
  };
}

/**
 * `--font-terminal` token when present, else the DESIGN.md stack. The token
 * is xterm-only (DESIGN.md §1.8): `--font-mono` stays the UI-mono token and
 * the two are never conflated, so the terminal face can change (deferred
 * Settings → General control, DESIGN-SPEC S13) without touching UI chrome.
 */
export function resolveTerminalFontFamily(): string {
  const styles = getComputedStyle(document.documentElement);
  return cssVar(styles, '--font-terminal') ?? TERMINAL_FONT_FALLBACK;
}
