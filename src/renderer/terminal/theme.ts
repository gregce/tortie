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
 * DESIGN.md §1.8: terminal runs SF Mono 13px, lineHeight 1.25, spacing 0.
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
/** Renderer-side cap; tmux holds the full 50k lines server-side. */
export const TERMINAL_SCROLLBACK = 10000;

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

/** `--font-mono` token when present, else the DESIGN.md stack. */
export function resolveTerminalFontFamily(): string {
  const styles = getComputedStyle(document.documentElement);
  return cssVar(styles, '--font-mono') ?? TERMINAL_FONT_FALLBACK;
}
