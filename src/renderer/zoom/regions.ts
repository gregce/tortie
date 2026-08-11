/**
 * What "zoom" means in gmux — the regions, the ladder, and the arithmetic,
 * kept pure so every rule here is testable without a layout engine.
 *
 * TWO MECHANISMS, because a terminal does not zoom like a panel:
 *
 *  1. **Terminal panes zoom for real.** The factor multiplies xterm's
 *     `fontSize`; the pane re-fits and pushes the new cols/rows to tmux. CSS
 *     scaling was rejected outright: it resamples the WebGL glyph atlas (the
 *     text goes soft) and it lies to every piece of cell arithmetic in the
 *     app — including 12.3's scrollbar, whose whole discipline is to MEASURE
 *     the cell box rather than compute it.
 *  2. **Panels zoom with CSS `zoom`.** Not `transform: scale()`, which leaves
 *     the element's layout box at its old size — the neighbours do not move,
 *     the panel overlaps them, and every hit-test in the region lands in the
 *     wrong place. `zoom` re-lays-out the subtree at the new size and keeps
 *     pointer coordinates honest (Chromium ≥128 reports zoomed rects from
 *     `getBoundingClientRect()`, so rect-vs-`clientX` comparisons still hold).
 *
 * THE BAND IS NOT ZOOMABLE, and that is what fixes the region list. S1 gives
 * the window ONE 36px header band — `.view-header` / `.branch-header` in the
 * sidebar, `.term-header` over the terminals, `.dock-toolbar` on the dock,
 * `.ed-tabs` on the editor — crossed by exactly one hairline. A region that
 * zoomed its own band slice would break that line for the whole window. So
 * zoom applies to what you READ (the tree, the changes list, the session
 * rows, the file, the terminal) and never to the chrome that labels it.
 *
 * The one consequence worth stating: in TOP orientation the session tab strip
 * IS the band, so it has no zoomable content of its own. ⌘+ with a tab
 * focused zooms the session that tab points at — the thing the user is
 * actually reading. The right-hand dock has a real list under its band slice,
 * and that list is the `sessions` region.
 */

/**
 * The zoomable regions. `sessions` exists only in the right-dock orientation
 * (see the header note); every other region is present in both.
 */
export const ZOOM_REGIONS = [
  'terminal',
  'explorer',
  'scm',
  'sessions',
  'editor'
] as const;

export type ZoomRegionId = (typeof ZOOM_REGIONS)[number];

export type ZoomLevels = Record<ZoomRegionId, number>;

/** What the readout calls each region — the user's words, not the DOM's. */
export const ZOOM_REGION_LABELS: Readonly<Record<ZoomRegionId, string>> = {
  terminal: 'Session',
  explorer: 'Explorer',
  scm: 'Source control',
  sessions: 'Sessions',
  editor: 'Editor'
};

/**
 * The ladder ⌘+ / ⌘- walk. Fixed stops rather than a multiplier so repeated
 * presses land on numbers people reason about, and chosen so that no two
 * stops collide once the terminal rounds them to a font size: at the shipped
 * 13px base they are 9.8 / 10.4 / 11.7 / 13 / 14.3 / 16.3 / 19.5 / 22.8 / 26.
 * A step that visibly did nothing would read as a broken key.
 */
export const ZOOM_STEPS: readonly number[] = [
  0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2
];

export const ZOOM_MIN = ZOOM_STEPS[0] ?? 0.75;
export const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? 2;
export const ZOOM_DEFAULT = 1;

/** A hair of tolerance so a stored 0.7500000001 still counts as that stop. */
const EPSILON = 1e-6;

/** Snap any value onto the ladder, so a hand-edited level still steps sanely. */
export function clampZoom(value: unknown): number {
  const raw = typeof value === 'number' && Number.isFinite(value) ? value : ZOOM_DEFAULT;
  if (raw <= ZOOM_MIN) return ZOOM_MIN;
  if (raw >= ZOOM_MAX) return ZOOM_MAX;
  let best = ZOOM_DEFAULT;
  let bestGap = Infinity;
  for (const step of ZOOM_STEPS) {
    const gap = Math.abs(step - raw);
    if (gap < bestGap) {
      bestGap = gap;
      best = step;
    }
  }
  return best;
}

/** The next stop above (`1`) or below (`-1`). Saturates at the ends. */
export function stepZoom(factor: number, direction: 1 | -1): number {
  const current = clampZoom(factor);
  if (direction === 1) {
    return ZOOM_STEPS.find((s) => s > current + EPSILON) ?? ZOOM_MAX;
  }
  const below = ZOOM_STEPS.filter((s) => s < current - EPSILON);
  return below[below.length - 1] ?? ZOOM_MIN;
}

/** 'min' / 'max' when the factor is already at an end of the ladder. */
export function zoomLimit(factor: number): 'min' | 'max' | null {
  const current = clampZoom(factor);
  if (current <= ZOOM_MIN + EPSILON) return 'min';
  if (current >= ZOOM_MAX - EPSILON) return 'max';
  return null;
}

/** "150%" — the readout. */
export function formatZoomPercent(factor: number): string {
  return `${String(Math.round(factor * 100))}%`;
}

/**
 * A zoomed font size: **a multiplier over a base**, never a competing size of
 * its own. Used by the two surfaces that scale by font rather than by CSS box
 * — xterm (base: terminal/theme.ts `terminalBaseFontSize`) and Monaco (base:
 * the editor's 12px). A future Settings control changes the BASE; every
 * zoomed surface then follows without a second knob to reconcile.
 *
 * One decimal, not an integer: at the terminal's 13px base the ladder's 0.75
 * and 0.8 both round to 10, and a ⌘- that changes nothing reads as a broken
 * key. Both engines measure their cell box from the rendered font, so a
 * fractional size costs nothing.
 */
export function zoomedFontSize(base: number, factor: number): number {
  const size = base * clampZoom(factor);
  return Math.max(4, Math.round(size * 10) / 10);
}

/** The custom property a panel region reads: `--zoom-explorer`, … */
export function zoomVarName(region: ZoomRegionId): string {
  return `--zoom-${region}`;
}

export function defaultZoomLevels(): ZoomLevels {
  return {
    terminal: ZOOM_DEFAULT,
    explorer: ZOOM_DEFAULT,
    scm: ZOOM_DEFAULT,
    sessions: ZOOM_DEFAULT,
    editor: ZOOM_DEFAULT
  };
}

/** Read persisted levels defensively — anything unrecognized falls back to 1. */
export function sanitizeZoomLevels(raw: unknown): ZoomLevels {
  const out = defaultZoomLevels();
  if (typeof raw !== 'object' || raw === null) return out;
  const record = raw as Record<string, unknown>;
  for (const region of ZOOM_REGIONS) {
    if (region in record) out[region] = clampZoom(record[region]);
  }
  return out;
}

/** True when nothing in the app is zoomed — ⌘⇧0 has nothing to do. */
export function allAtDefault(levels: ZoomLevels): boolean {
  return ZOOM_REGIONS.every((r) => levels[r] === ZOOM_DEFAULT);
}
