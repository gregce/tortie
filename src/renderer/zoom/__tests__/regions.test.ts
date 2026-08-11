import { describe, expect, it } from 'vitest';
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

describe('the readout', () => {
  it('speaks percentages, not factors', () => {
    expect(formatZoomPercent(1)).toBe('100%');
    expect(formatZoomPercent(1.5)).toBe('150%');
    expect(formatZoomPercent(0.75)).toBe('75%');
  });
});
