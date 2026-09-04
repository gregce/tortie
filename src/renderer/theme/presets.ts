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
 * - `--bg-canvas` BY THE SCHEME OR THE CONTRAST LIFT. The contrast lift
 *   spreads every other background from this anchor and moves the anchor
 *   itself never. Phase 207 made the hue the ONE thing that writes it, and
 *   only at a hue other than the shipped 222, because the canvas is a rung of
 *   the ramp the hue turns and a frame whose canvas stayed graphite would be
 *   half rotated. The three mirrors that depend on its byte value follow: the
 *   pre-paint fill in src/shared/window-chrome.ts is composed by main from the
 *   same shared rotation (src/shared/chrome-hue.ts), the terminal reads the
 *   token at every theme resolve (src/renderer/terminal/theme.ts), and the
 *   capture path reads the resolved theme.
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

import type { BaseScheme, ContrastLevel, HighlightScheme } from '@shared/settings';

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
export const CONTRAST_BORDER: readonly string[] = [
  '--border',
  '--border-active',
  '--border-strong'
];

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

// ---------------------------------------------------------------------------
// The frame's hue (Phase 207)
// ---------------------------------------------------------------------------

/**
 * The ramp the hue turns: the canvas and every ground and hairline that
 * spreads from it. Eight neutrals. Nothing chromatic is here, because the
 * accent and the categorical hues are meaning and never follow the frame.
 */
export const HUE_TOKENS: readonly string[] = [
  CANVAS_TOKEN,
  ...CONTRAST_BG,
  ...CONTRAST_BORDER
];

/**
 * THE NAMED STARTING COLOURS (Phase 210), and why there are eight of them
 * rather than a slider over 360 degrees.
 *
 * The operator's second sentence about the Phase 207 slider was that he did
 * not understand the degree setting. He is right: 222 names a position on a
 * wheel nobody is looking at and says nothing about what a person will see.
 * The degree is still what is persisted and it is still on the hover title;
 * it is off the resting face.
 *
 * EIGHT IS MEASURED. Of the 359 adjacent whole degree pairs, 99 render the
 * eight neutrals BYTE IDENTICALLY at the shipped frame, so the circle carries
 * far fewer distinguishable frames than it carries numbers. At 45 degrees
 * apart the neighbours differ by 3.9 to 6.8 dE2000 on `--bg-active`, the most
 * chromatic rung, which is a step a person can see and name. The shipped
 * graphite leads the row and is the default, so an install that touches
 * nothing is unmoved.
 *
 * A hue that is none of these, which a Phase 207 slider or a hand edited file
 * can still produce, is drawn as its own swatch at the head of the row rather
 * than snapped onto one of the eight, because snapping would show a person a
 * colour they did not choose.
 */
export interface FrameColor {
  /** The persisted degree. */
  hue: number;
  /** What a person calls it. */
  label: string;
}

export const FRAME_COLORS: readonly FrameColor[] = [
  { hue: 222, label: 'Graphite' },
  { hue: 267, label: 'Violet' },
  { hue: 312, label: 'Plum' },
  { hue: 357, label: 'Clay' },
  { hue: 42, label: 'Sand' },
  { hue: 87, label: 'Moss' },
  { hue: 132, label: 'Pine' },
  { hue: 177, label: 'Ocean' }
];

/**
 * The text tokens, the ground each one is pinned against, which is where
 * src/renderer/theme/hue.ts reads its ratio from, and every ground each one
 * is allowed on, which is where its floor must hold. `--text-muted` is pinned
 * on `--bg-surface` because DESIGN.md says it passes 4.5:1 only up to there,
 * and never sits on the raised or active fills.
 * `--text-disabled` has no floor: it is exempt from contrast by design and
 * only follows the family when the text flips dark, keeping the ratio it
 * ships with so it stays de-emphasized.
 */
export interface TextPin {
  token: string;
  /** The ground the shipped ratio is read against. */
  ground: string;
  /** Every ground the token is allowed on, the pinned one first. */
  grounds: readonly string[];
  floor: number | null;
}

export const TEXT_PINS: readonly TextPin[] = [
  {
    token: '--text-primary',
    ground: CANVAS_TOKEN,
    grounds: [CANVAS_TOKEN, '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active'],
    floor: 4.5
  },
  {
    token: '--text-secondary',
    ground: CANVAS_TOKEN,
    grounds: [CANVAS_TOKEN, '--bg-sidebar', '--bg-surface', '--bg-raised', '--bg-active'],
    floor: 4.5
  },
  {
    token: '--text-muted',
    ground: '--bg-surface',
    grounds: ['--bg-surface', CANVAS_TOKEN, '--bg-sidebar'],
    floor: 4.5
  },
  { token: '--text-disabled', ground: CANVAS_TOKEN, grounds: [CANVAS_TOKEN], floor: null }
];

/**
 * THE OFFERED REGION (Phase 210): which shade and depth pairs a person may
 * choose, as the first and last depth stop for each shade stop.
 *
 * IT IS A CONSTANT ON PURPOSE, and the gate is what keeps it true. The
 * region is the worst case over EVERY WHOLE DEGREE of the circle, all three
 * contrast levels and all four highlight schemes, which is 61,446
 * derivations: the control cannot walk that while a person drags a slider,
 * and walking a smaller set would make the sliders offer a stop that another
 * hue breaks. So the table is pinned here and `npm run conformance:hue`
 * rule 15 asserts, on every run, that it is exactly what the exhaustive walk
 * measures. A change to either axis moves this table or turns the gate red.
 *
 * The two edges are different floors. The DARK end is the RENDERED STEP:
 * near black, eight bits run out before the ramp does, so the darkest shades
 * need the depth widened to keep their rungs apart at all. The LIGHT end is
 * the git decorations on `--bg-active`, which this phase refuses to move, so
 * the lighter shades need the depth narrowed.
 */
export interface FrameRegionRow {
  shade: number;
  minDepth: number;
  maxDepth: number;
}

export const FRAME_REGION: readonly FrameRegionRow[] = [
  { shade: -4, minDepth: 1, maxDepth: 3 },
  { shade: -3, minDepth: -2, maxDepth: 3 },
  { shade: -2, minDepth: -3, maxDepth: 3 },
  { shade: -1, minDepth: -3, maxDepth: 2 },
  { shade: 0, minDepth: -3, maxDepth: 1 },
  { shade: 1, minDepth: -3, maxDepth: 0 },
  { shade: 2, minDepth: -3, maxDepth: 0 }
];

/**
 * THE OFFERED REGION ON THE LIGHT BASE (Phase 213), measured the same way
 * over the light block of tokens.css at every whole degree, all three
 * contrast levels and all four highlight schemes, and pinned by rule 22 of
 * the gate. It is FOUR CELLS, and both edges are the light palette's own
 * design rather than a choice made here.
 *
 * The LIGHT end is the ramp's room: the sheet, `--bg-surface`, sits at OKLCH
 * L 0.992, and one stop lighter puts it on white beside a canvas one stop
 * under it, so no shade above the shipped one keeps the order.
 *
 * The DARK end is the chromatic family, which the frame never moves. The
 * light palette was solved AT its floors on purpose, so the accent could be
 * text on paper and the status dots could clear the active row: `--accent-text`
 * reads 5.03:1 on the paper, `--status-idle` 3.41:1 and `--status-working`
 * 3.52:1 on the active fill. One shade darker takes the first under 4.5 at
 * every hue and the dots under 3 at hundreds of them, and every depth wider
 * than shipped darkens the active fill the same way. So on paper the Shade
 * slider stays where it ships and the Depth slider narrows only, and the
 * refusal line says which family stopped it. A wider region would need a
 * darker accent and darker dots than research 80 designed, which is a
 * palette decision and not a slider one.
 *
 * An empty row (minDepth above maxDepth) means no depth is offered at that
 * shade.
 */
export const FRAME_REGION_LIGHT: readonly FrameRegionRow[] = [
  { shade: -4, minDepth: 0, maxDepth: -1 },
  { shade: -3, minDepth: 0, maxDepth: -1 },
  { shade: -2, minDepth: 0, maxDepth: -1 },
  { shade: -1, minDepth: 0, maxDepth: -1 },
  { shade: 0, minDepth: -3, maxDepth: 0 },
  { shade: 1, minDepth: 0, maxDepth: -1 },
  { shade: 2, minDepth: 0, maxDepth: -1 }
];

/** The region the sliders offer from, by base. */
export function frameRegionFor(scheme: BaseScheme): readonly FrameRegionRow[] {
  return scheme === 'light' ? FRAME_REGION_LIGHT : FRAME_REGION;
}

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
// The floors the frame may not break (Phase 210)
// ---------------------------------------------------------------------------

/**
 * The ramp in order, darkest first, and the hairlines in order. These are the
 * two runs whose ORDER the design pins. Phase 196 put `--bg-sidebar` below
 * the canvas and this list is where that fact lives.
 */
export const RAMP_ORDER: readonly string[] = [
  '--bg-sidebar',
  CANVAS_TOKEN,
  '--bg-surface',
  '--bg-raised',
  '--bg-active'
];
export const HAIRLINE_ORDER: readonly string[] = [
  '--border',
  '--border-active',
  '--border-strong'
];

/**
 * THE SAME TWO RUNS ON THE LIGHT BASE (Phase 213), darkest first, which is
 * the dark order turned over: on paper elevation is shadow, so the active
 * fill is the deepest, the sidebar sits under the canvas and the sheet sits
 * above it, and the hairlines run strong to plain. The order is what the
 * design pins, so a light base whose sheet fell under its paper would be
 * refused by the same predicate that refuses a dark sidebar over its canvas.
 */
export const RAMP_ORDER_LIGHT: readonly string[] = [
  '--bg-active',
  '--bg-raised',
  '--bg-sidebar',
  CANVAS_TOKEN,
  '--bg-surface'
];
export const HAIRLINE_ORDER_LIGHT: readonly string[] = [
  '--border-strong',
  '--border-active',
  '--border'
];

export function rampOrderFor(scheme: BaseScheme): readonly string[] {
  return scheme === 'light' ? RAMP_ORDER_LIGHT : RAMP_ORDER;
}
export function hairlineOrderFor(scheme: BaseScheme): readonly string[] {
  return scheme === 'light' ? HAIRLINE_ORDER_LIGHT : HAIRLINE_ORDER;
}

/**
 * THE RENDERED STEP, and it is the floor that replaced a pinned ratio band.
 *
 * Phase 207 pinned three hairline ratios inside a band: `--border` on
 * `--bg-sidebar` at 1.297, `--border-active` on `--bg-active` at 1.105 and
 * the hover step `--bg-raised` on `--bg-surface` at 1.094. Those three are
 * EXACTLY what the depth control moves, so they cannot also be floors: at
 * depth 0.50 the first reads 1.130 and at 1.75 it reads 1.673. The band is
 * still pinned, at the shipped shade and depth, where it is a real check on
 * the rotation. Across the two new axes this takes its place.
 *
 * The rule is physical rather than chosen. Two colours that round to the same
 * eight bit value are not two colours, and research 75 C4 already ruled that
 * 1.013 is no hairline at all. So every adjacent pair below must differ by at
 * least `RENDERED_STEP_MIN` in at least one channel of the rendered answer.
 *
 * WHY TWO, and it is a floor rather than the shipped spacing. The six pairs
 * below hold FIVE at their tightest over every whole degree and all three
 * contrast levels, the tightest being `--bg-sidebar` on `--bg-canvas` at hue
 * 6, and at the shipped frame the six read 5, 9, 9, 8, 10 and 11. Five as a
 * floor would say the ramp may never spread tighter than it ships, which is a
 * different rule and refuses frames a person can read perfectly well. TWO IS
 * THE SMALLEST STEP ABOVE THE ROUNDING FLOOR: one level is the least
 * difference eight bits can express, so a pair one level apart is
 * indistinguishable from two colours that meant to be the same, and that is
 * exactly where the shipped rotation already puts `--border` on `--bg-active`
 * at hue 44, the pair DESIGN.md section 1.10 records as not existing at
 * 1.013:1. So this floor asserts only that a rung is still a rung, and it
 * re-derives from eight bits rather than from taste.
 *
 * AN EARLIER DRAFT OF THIS PARAGRAPH SAID TWO WAS WHAT THE SHIPPED RAMP
 * HOLDS AT ITS TIGHTEST. It is five, by this rule's own pairs, and three
 * between any two of the eight neutrals at the shipped frame. The Phase 210
 * verifier caught it, and it was the same class of unre-derivable number the
 * phase had just refused when it rejected a 1.10 ratio floor. The value did
 * not move and the offered region did not move; the reason did.
 */
export const RENDERED_STEP_MIN = 2;

export const RENDERED_STEP_PAIRS: readonly (readonly [string, string])[] = [
  ['--bg-sidebar', CANVAS_TOKEN],
  [CANVAS_TOKEN, '--bg-surface'],
  ['--bg-surface', '--bg-raised'],
  ['--bg-raised', '--bg-active'],
  ['--border', '--border-active'],
  ['--border-active', '--border-strong']
];

/**
 * WHAT IS DELIBERATELY NOT IN THAT LIST, and it is a measurement rather than
 * an oversight. A border against the panel it edges is the other pair a
 * person can see, and `--border` on `--bg-sidebar`, `--border` on
 * `--bg-canvas` and `--border-active` on `--bg-active` render 27, 23 and 8
 * eight bit levels apart at the shipped ramp, against 5 for the tightest
 * adjacent rung. Every stop of both axes scales all of them together, so
 * those three can never be the pair that binds, and the gate proved it: with
 * all three listed and then removed, the offered region did not move by one
 * cell. A rule that cannot fail is documentation, so they are named here in
 * prose instead of asserted in code.
 */

/**
 * The chromatic floors the frame must not break. Nothing here MOVES with the
 * frame, which is the phase's refusal: the accent, the git decorations and
 * the graph lanes are meaning and stay exactly where they ship. They are
 * floors because the ground under them moves, and the git family on
 * `--bg-active` is what stops the ramp going lighter than shade stop 2.
 */
export interface ChromaticPin {
  token: string;
  ground: string;
  floor: number;
}

export const CHROMATIC_PINS: readonly ChromaticPin[] = [
  { token: '--accent-text', ground: CANVAS_TOKEN, floor: 4.5 },
  { token: '--accent', ground: CANVAS_TOKEN, floor: 3 },
  { token: '--git-modified', ground: '--bg-active', floor: 3 },
  { token: '--git-added', ground: '--bg-active', floor: 3 },
  { token: '--git-deleted', ground: '--bg-active', floor: 3 },
  { token: '--git-renamed', ground: '--bg-active', floor: 3 },
  { token: '--git-conflict', ground: '--bg-active', floor: 3 },
  { token: '--graph-lane-3', ground: '--bg-active', floor: 3 },
  { token: '--graph-lane-5', ground: '--bg-active', floor: 3 }
];

/**
 * THE STATUS DOT FLOOR (Phase 213). A dot is a non text mark on the row it
 * sits in, so it owes 3:1 on `--bg-active`, the deepest fill a row takes.
 * Phase 210 recorded this floor as open on the dark base, where the idle
 * grey reads 3.15 on the shipped active fill and a lighter shade takes it
 * under; adding it there would refuse frames people already chose, so the
 * dark base keeps its region and this pin binds the LIGHT base alone, where
 * the palette was designed to it: 3.52, 3.53, 3.41 and 3.40 at the shipped
 * frame. The attention badge's text is pinned on the same list, because the
 * badge and the dot are one amber.
 */
export const STATUS_PINS_LIGHT: readonly ChromaticPin[] = [
  { token: '--status-working', ground: '--bg-active', floor: 3 },
  { token: '--status-attention', ground: '--bg-active', floor: 3 },
  { token: '--status-idle', ground: '--bg-active', floor: 3 },
  { token: '--status-failed', ground: '--bg-active', floor: 3 },
  { token: '--status-attention-badge-fg', ground: '--status-attention-badge-bg', floor: 4.5 }
];

/** The chromatic floors a base must keep. */
export function chromaticPinsFor(scheme: BaseScheme): readonly ChromaticPin[] {
  return scheme === 'light' ? [...CHROMATIC_PINS, ...STATUS_PINS_LIGHT] : CHROMATIC_PINS;
}

// ---------------------------------------------------------------------------
// The full covered set (for base capture in apply.ts)
// ---------------------------------------------------------------------------

/**
 * Every token deriveOverrides may read or write, the canvas anchor included
 * (read by the lift, written by the hue). apply.ts captures the computed value of each of these
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
    ...CONTRAST_CHROMA,
    ...HUE_TOKENS,
    ...TEXT_PINS.map((p) => p.token),
    // Phase 213: the status pins read the idle dot and the badge pair, which
    // the chroma lift never moves, so the base must carry them too.
    ...STATUS_PINS_LIGHT.flatMap((p) => [p.token, p.ground])
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
