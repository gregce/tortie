/**
 * The theme preset DATA (Phase 62). This file and derive.ts are THEME
 * CONSTANT FILES under the CLAUDE.md UI rules. Color-adjacent literals may
 * appear here and nowhere else new.
 *
 * A preset is hue data, not hand-picked hex. Rotating a token's OKLCH hue
 * while keeping its lightness and chroma preserves the measured contrast
 * ratios recorded in src/renderer/styles/tokens.css, which is the whole
 * reason the schemes are defined this way.
 *
 * WHAT IS NEVER OVERRIDDEN, and why:
 * - `--bg-canvas`. Three things depend on its exact byte value. They are the
 *   WINDOW_BACKGROUND pre-paint mirror in src/shared/window-chrome.ts, the
 *   terminal background mirror in src/renderer/terminal/theme.ts, and the
 *   capture path. The contrast lift spreads every other background upward
 *   from this fixed anchor.
 * - `--bg-scrim`, the shadows, the washes outside the accent family, and the
 *   scroll thumb ramp. The thumb ramp's four steps carry measured ratios
 *   recorded in tokens.css.
 * - `--on-accent` and `--status-attention-badge-fg`. Both are dark text over
 *   a colored fill and survive any hue.
 * - `--status-working`. It shares the accent hex today, but status color is
 *   meaning and never decoration (CLAUDE.md UI rules), so it does not follow
 *   the scheme. It does take the contrast chroma lift, which raises every
 *   status hue together and keeps their relative meaning.
 * - `--graph-lane-1` is `var(--accent)` in tokens.css and follows the scheme
 *   automatically. The same is true of lanes 2, 4 and 6, which reference git
 *   decoration tokens listed in CONTRAST_CHROMA below.
 */

import type { ContrastLevel, HighlightScheme } from '@shared/settings';

// ---------------------------------------------------------------------------
// Highlight schemes
// ---------------------------------------------------------------------------

/**
 * How a scheme moves a token in OKLCH. Lightness and alpha never move.
 * `hue` sets the hue in degrees. `chromaScale` multiplies the chroma.
 * A preset carries one or the other, never both.
 */
export interface SchemeTransform {
  hue?: number;
  chromaScale?: number;
}

export interface SchemePreset {
  id: HighlightScheme;
  /** The user-facing option label (spec section 6, verbatim). */
  label: string;
  /** Null for blue, which is the shipped palette and moves nothing. */
  transform: SchemeTransform | null;
}

/** The schemes, in UI order. */
export const SCHEME_PRESETS: readonly SchemePreset[] = [
  { id: 'blue', label: 'Blue', transform: null },
  { id: 'teal', label: 'Teal', transform: { hue: 185 } },
  { id: 'purple', label: 'Purple', transform: { hue: 300 } },
  { id: 'slate', label: 'Slate', transform: { chromaScale: 0.3 } }
];

/**
 * The highlight family: the 8 tokens a scheme recolors.
 * `--terminal-selection` is the one terminal color that belongs here. The
 * ANSI palette, foreground, cursor and background never move.
 */
export const SCHEME_TOKENS: readonly string[] = [
  '--accent',
  '--accent-hover',
  '--accent-text',
  '--accent-wash',
  '--drop-wash',
  '--accent-soft',
  '--focus-ring',
  '--terminal-selection'
];

// ---------------------------------------------------------------------------
// Contrast lift token lists
// ---------------------------------------------------------------------------

/** The fixed anchor the background spread works about. Never overridden. */
export const CANVAS_TOKEN = '--bg-canvas';

/** Backgrounds spread away from the canvas anchor. */
export const CONTRAST_BG: readonly string[] = [
  '--bg-sidebar',
  '--bg-surface',
  '--bg-raised',
  '--bg-active'
];

/** Borders spread the same way, so hairlines separate with their panels. */
export const CONTRAST_BORDER: readonly string[] = ['--border', '--border-strong'];

/**
 * Text lightness lifts toward white. `--text-disabled` and `--git-ignored`
 * stay out on purpose. They mean "de-emphasized" and a lift would erase
 * that meaning.
 */
export const CONTRAST_TEXT: readonly string[] = [
  '--text-primary',
  '--text-secondary',
  '--text-muted'
];

/**
 * Chromatic tokens whose chroma lifts so muted hues separate on a dim
 * display. `--status-idle` and `--status-exited` are near-neutral grays and
 * stay out. The scheme applies before this lift, so the lift acts on the
 * scheme-rotated accent.
 */
export const CONTRAST_CHROMA: readonly string[] = [
  '--accent',
  '--accent-hover',
  '--accent-text',
  '--status-working',
  '--status-attention',
  '--status-failed',
  '--status-attention-badge-bg',
  '--git-modified',
  '--git-added',
  '--git-deleted',
  '--git-renamed',
  '--git-conflict',
  '--error',
  '--warning',
  '--success',
  '--info',
  '--graph-lane-3',
  '--graph-lane-5'
];

// ---------------------------------------------------------------------------
// The full covered set (for base capture in apply.ts)
// ---------------------------------------------------------------------------

/**
 * Every token deriveOverrides may read or write, plus the canvas anchor it
 * only ever reads. apply.ts captures the computed value of each of these
 * ONCE, before any write, so later derivations always start from the shipped
 * values and can never compound.
 */
export const ALL_THEME_TOKENS: readonly string[] = [
  ...new Set([
    CANVAS_TOKEN,
    ...SCHEME_TOKENS,
    ...CONTRAST_BG,
    ...CONTRAST_BORDER,
    ...CONTRAST_TEXT,
    ...CONTRAST_CHROMA
  ])
];

// ---------------------------------------------------------------------------
// Contrast step factors
// ---------------------------------------------------------------------------

/**
 * The per-step factors (spec section 3.2). `k` spreads backgrounds and
 * borders about the canvas anchor. `t` lifts text lightness toward white.
 * `c` multiplies chroma on the chromatic list. Normal is the identity and
 * derives zero overrides. These are starting values chosen by geometry and
 * verified by the measured ratios in the tests. They are not user-tunable.
 */
export interface ContrastFactors {
  k: number;
  t: number;
  c: number;
}

export const CONTRAST_FACTORS: Readonly<Record<ContrastLevel, ContrastFactors>> = {
  normal: { k: 1.0, t: 0, c: 1.0 },
  raised: { k: 1.22, t: 0.08, c: 1.1 },
  high: { k: 1.45, t: 0.16, c: 1.22 }
};
