import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SIDEBAR_VIEW_IDS,
  SIDEBAR_VIEW_LABELS
} from '../../state/sidebar-views';
import { ZOOM_REGION_LABELS } from '../regions';
import {
  allAtDefault,
  clampZoom,
  defaultZoomLevels,
  formatZoomPercent,
  sanitizeZoomLevels,
  stepZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_REGIONS,
  ZOOM_STEPS,
  zoomedFontSize,
  zoomLimit,
  zoomVarName
} from '../regions';

describe('the zoom ladder', () => {
  it('starts and ends where the region list says it does', () => {
    expect(ZOOM_MIN).toBe(0.75);
    expect(ZOOM_MAX).toBe(2);
    expect(ZOOM_STEPS).toContain(1);
    // The two levels the phase spec verifies by screenshot must be reachable
    // exactly, not approached.
    expect(ZOOM_STEPS).toContain(1.5);
    expect(ZOOM_STEPS).toContain(0.75);
  });

  it('walks one stop per press and saturates at both ends', () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });

  it('walks every stop without repeating or skipping', () => {
    const up: number[] = [];
    let f = ZOOM_MIN;
    for (let i = 0; i < ZOOM_STEPS.length + 2; i++) {
      const next = stepZoom(f, 1);
      if (next === f) break;
      up.push(next);
      f = next;
    }
    expect([ZOOM_MIN, ...up]).toEqual([...ZOOM_STEPS]);
  });

  it('snaps an off-ladder value onto the ladder before stepping', () => {
    // A hand-edited or half-migrated level must not wedge ⌘+.
    expect(clampZoom(1.37)).toBe(1.25);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom('big')).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('names the limits so the readout can say why nothing moved', () => {
    expect(zoomLimit(ZOOM_MIN)).toBe('min');
    expect(zoomLimit(ZOOM_MAX)).toBe('max');
    expect(zoomLimit(1)).toBeNull();
  });
});

describe('zoomed font sizes', () => {
  const TERMINAL_BASE = 13;

  it('multiplies the base rather than replacing it', () => {
    expect(zoomedFontSize(TERMINAL_BASE, 1)).toBe(13);
    expect(zoomedFontSize(TERMINAL_BASE, 2)).toBe(26);
    expect(zoomedFontSize(12, 1.5)).toBe(18);
  });

  it('gives every ladder stop a DIFFERENT terminal size', () => {
    // The reason the sizes keep a decimal: rounded to integers, 0.75 and 0.8
    // both land on 10 at the 13px base and one ⌘- would visibly do nothing.
    const sizes = ZOOM_STEPS.map((f) => zoomedFontSize(TERMINAL_BASE, f));
    expect(new Set(sizes).size).toBe(ZOOM_STEPS.length);
  });

  it('never returns an unrenderable size', () => {
    expect(zoomedFontSize(1, ZOOM_MIN)).toBeGreaterThanOrEqual(4);
  });
});

describe('persistence', () => {
  it('reads back what it wrote', () => {
    const levels = { ...defaultZoomLevels(), explorer: 1.5, terminal: 0.9 };
    expect(sanitizeZoomLevels(levels)).toEqual(levels);
  });

  it('treats missing, junk and absent storage as 100%', () => {
    expect(sanitizeZoomLevels(null)).toEqual(defaultZoomLevels());
    expect(sanitizeZoomLevels('nope')).toEqual(defaultZoomLevels());
    expect(sanitizeZoomLevels({ explorer: 'huge' })).toEqual(
      defaultZoomLevels()
    );
  });

  it('snaps a stored out-of-range level instead of honouring it', () => {
    expect(sanitizeZoomLevels({ terminal: 40 }).terminal).toBe(ZOOM_MAX);
  });

  it('ignores regions it does not know', () => {
    const out = sanitizeZoomLevels({ minimap: 3 });
    expect(out).toEqual(defaultZoomLevels());
  });

  it('knows when ⌘⇧0 has nothing to do', () => {
    expect(allAtDefault(defaultZoomLevels())).toBe(true);
    expect(allAtDefault({ ...defaultZoomLevels(), scm: 1.25 })).toBe(false);
  });
});

describe('the CSS contract', () => {
  it('names one custom property per panel region', () => {
    // zoom.css reads these literally — a rename here without a rename there
    // silently stops a region from zooming, so the pairing is asserted.
    expect(zoomVarName('explorer')).toBe('--zoom-explorer');
    expect(zoomVarName('scm')).toBe('--zoom-scm');
    expect(zoomVarName('sessions')).toBe('--zoom-sessions');
    expect(zoomVarName('editor')).toBe('--zoom-editor');
  });

  it('covers every region exactly once', () => {
    expect(new Set(ZOOM_REGIONS).size).toBe(ZOOM_REGIONS.length);
    expect(Object.keys(defaultZoomLevels()).sort()).toEqual(
      [...ZOOM_REGIONS].sort()
    );
  });
});

/**
 * The guard that would have caught Phase 18.55. Search shipped in Phase 14,
 * three phases after zoom, and every check in this file still passed while
 * zooming Search moved the Source Control level. These assertions fail
 * instead — including the CSS half, which no amount of typing can see.
 */
describe('every sidebar view is a zoomable region', () => {
  const zoomCss = readFileSync(
    join(__dirname, '..', 'zoom.css'),
    'utf8'
  );

  it.each([...SIDEBAR_VIEW_IDS])('%s has a region, a label and a rule', (view) => {
    // A region, so it has a level of its own that ⌘+ and ⌘⇧0 can reach.
    expect(ZOOM_REGIONS).toContain(view);
    // A label, so the readout names the view the user just zoomed. It is the
    // view's own name — the readout and the activity rail cannot drift.
    expect(ZOOM_REGION_LABELS[view]).toBe(SIDEBAR_VIEW_LABELS[view]);
    // A custom property, and a rule in zoom.css that actually reads it. The
    // store writes the property for every region either way, so without this
    // the view would report a level it never applied to anything.
    expect(zoomCss).toContain(`var(${zoomVarName(view)}, 1)`);
    expect(zoomCss).toMatch(
      new RegExp(`\\[data-view='${view}'\\][^{]*\\{[^}]*zoom:`)
    );
  });

  it('starts every view at 100% and resets it with ⌘⇧0', () => {
    const levels = defaultZoomLevels();
    for (const view of SIDEBAR_VIEW_IDS) {
      expect(levels[view]).toBe(1);
      expect(allAtDefault({ ...levels, [view]: 1.5 })).toBe(false);
    }
  });
});

describe('the readout', () => {
  it('speaks percentages, not factors', () => {
    expect(formatZoomPercent(1)).toBe('100%');
    expect(formatZoomPercent(1.5)).toBe('150%');
    expect(formatZoomPercent(0.75)).toBe('75%');
  });
});
