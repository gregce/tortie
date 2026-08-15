import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GRAPH_HUES,
  buildRow,
  buildSpacer,
  gutterWidth,
  hueSlot,
  laneX,
  pathMergeOut,
  pathShift,
  laneCap,
  rowColumns
} from '../geometry';
import { DEFAULT_LANE_CAP } from '../cap';
import { LANE_COLOR_VARS } from '../colors';
import type { GraphLane, GraphRowLayout } from '../geometry';

const lane = (sha: string, color?: number): GraphLane =>
  color === undefined ? { sha } : { sha, color };

const row = (
  inLanes: GraphLane[],
  outLanes: GraphLane[],
  circle: number,
  mergeTargets: number[] = [],
  bundleColumn = -1
): GraphRowLayout => ({
  in: inLanes,
  out: outLanes,
  circle,
  mergeTargets,
  bundleColumn
});

describe('width', () => {
  it('a one-lane repo renders exactly today’s 20px rail', () => {
    expect(gutterWidth(1)).toBe(20);
    expect(laneX(0)).toBe(10);
  });

  it('grows 12px per lane and keeps the padding symmetric', () => {
    expect([2, 3, 4, 5, 6, 8].map(gutterWidth)).toEqual([32, 44, 56, 68, 80, 104]);
    for (const n of [1, 2, 5, 8]) {
      expect(gutterWidth(n) - laneX(n - 1)).toBe(10);
    }
  });

  it('degrades with the pane instead of clipping', () => {
    // Deep graph, so width is the only limit.
    expect(laneCap(20, 400)).toBe(DEFAULT_LANE_CAP);
    expect(laneCap(20, 300)).toBe(DEFAULT_LANE_CAP);
    expect(laneCap(20, 280)).toBe(DEFAULT_LANE_CAP);
    expect(laneCap(20, 240)).toBe(6);
    expect(laneCap(20, 220)).toBe(4);
    expect(laneCap(20, 180)).toBe(1);
    // Never zero, however cruel the pane.
    expect(laneCap(20, 40)).toBe(1);
  });

  it('never reserves more columns than the graph actually has', () => {
    expect(laneCap(1, 400)).toBe(1);
    expect(laneCap(3, 400)).toBe(3);
  });
});

describe('rowColumns (Phase 47, the compact gutter)', () => {
  it('a linear row needs exactly one column, the 20px rail', () => {
    expect(rowColumns(row([lane('a')], [lane('b')], 0))).toBe(1);
  });

  it('an empty row still reserves one column', () => {
    expect(rowColumns(row([], [], 0))).toBe(1);
  });

  it('a merge row reaches the farthest column a parent was routed into', () => {
    expect(
      rowColumns(
        row([lane('a'), lane('x')], [lane('p'), lane('x'), lane('q')], 0, [2])
      )
    ).toBe(3);
  });

  it('a branch tip whose dot sits past the input lanes counts the dot', () => {
    expect(rowColumns(row([lane('x')], [lane('x'), lane('a')], 1))).toBe(2);
  });

  it('a folded row includes the bundle column', () => {
    expect(
      rowColumns(row([lane('a'), lane('x')], [lane('a'), lane('x')], 0, [], 3))
    ).toBe(4);
  });

  it('a bundleColumn left absent (raw GraphRow) is treated as no fold', () => {
    expect(
      rowColumns({
        in: [lane('a'), lane('b')],
        out: [lane('a'), lane('b')],
        circle: 0,
        mergeTargets: []
      })
    ).toBe(2);
  });

  it('the caller clamp keeps compact inside the window width', () => {
    const lanes = Array.from({ length: 9 }, (_, i) => lane(`l${i}`));
    const wide = row(lanes, lanes, 0);
    expect(rowColumns(wide)).toBe(9);
    // HistorySection passes min(rowColumns(row), columns), so a row can
    // never draw past the shared window cap.
    expect(Math.min(rowColumns(wide), 6)).toBe(6);
  });

  it('agrees with gutterWidth on the shapes the probe measures', () => {
    // A 1-lane repo draws 20px everywhere in compact mode.
    expect(gutterWidth(rowColumns(row([lane('a')], [lane('a')], 0)))).toBe(20);
    // A 3-column merge row draws 44px.
    expect(
      gutterWidth(
        rowColumns(
          row([lane('a'), lane('x')], [lane('p'), lane('x'), lane('q')], 0, [2])
        )
      )
    ).toBe(44);
  });
});

describe('hue', () => {
  it('cycles at six and never goes negative', () => {
    expect(hueSlot(0, 0)).toBe(0);
    expect(hueSlot(7, 0)).toBe(1);
    expect(hueSlot(-1, 0)).toBe(5);
    expect(hueSlot({ kind: 'cycle', slot: 13 }, 0)).toBe(1);
  });

  it('maps roles into the ramp rather than adding hues to it', () => {
    expect(hueSlot({ kind: 'role', role: 'local' }, 4)).toBe(0);
    expect(hueSlot({ kind: 'role', role: 'remote' }, 4)).toBe(2);
    expect(hueSlot({ kind: 'role', role: 'base' }, 4)).toBe(3);
  });

  it('falls back to the column when the layout carries no colour', () => {
    expect(hueSlot(undefined, 3)).toBe(3);
    expect(hueSlot(undefined, 9)).toBe(3);
  });
});

describe('path vocabulary', () => {
  it('draws a straight line when a shift has nowhere to go', () => {
    expect(pathShift(10, 10)).toBe('M10 0V24');
    expect(pathMergeOut(10, 10)).toBe('M10 12V24');
  });

  it('curves with a radius that fits inside the pitch and the half-row', () => {
    // One column left: 22 -> 10. Arc radius 5 needs 10px of horizontal run and
    // 5px of vertical; the pitch is 12 and the half-row is 12, so both hold.
    expect(pathShift(22, 10)).toBe('M22 0V7A5 5 0 0 1 17 12H15A5 5 0 0 0 10 17V24');
    expect(pathMergeOut(10, 22)).toBe('M10 12H17A5 5 0 0 1 22 17V24');
  });
});

describe('row assembly', () => {
  const opts = { columns: 4 };

  it('a linear commit is one lane in, one lane out', () => {
    const r = row([lane('b')], [lane('a')], 0);
    const built = buildRow(r, { ...opts, sha: 'b', parentCount: 1 });
    expect(built.segments.map((s) => s.d)).toEqual(['M10 0V12', 'M10 12V24']);
    expect(built.dot).toMatchObject({ x: 10, merge: false, head: false });
  });

  it('a root commit ends its lane at the dot rather than wiping the graph', () => {
    // VS Code's own fold blanks every live lane on a parentless commit
    // (research 24 §4.3). Lane 1 must survive.
    const r = row([lane('root'), lane('x')], [lane('x')], 0);
    const built = buildRow(r, { ...opts, sha: 'root', parentCount: 0 });
    const ds = built.segments.map((s) => s.d);
    expect(ds).toContain('M10 0V12'); // arrives, stops
    expect(ds).not.toContain('M10 12V24'); // nothing leaves
    expect(ds).toContain('M22 0V7A5 5 0 0 1 17 12H15A5 5 0 0 0 10 17V24'); // lane 1 slides left
  });

  it('a merge routes one elbow per extra parent — octopus included', () => {
    const r = row(
      [lane('m')],
      [lane('p0'), lane('p1'), lane('p2')],
      0,
      [1, 2]
    );
    const built = buildRow(r, { ...opts, sha: 'm', parentCount: 3 });
    const ds = built.segments.map((s) => s.d);
    expect(ds).toContain('M10 12H17A5 5 0 0 1 22 17V24');
    expect(ds).toContain('M10 12H29A5 5 0 0 1 34 17V24');
    expect(built.dot.merge).toBe(true);
  });

  it('children converging from the right curve into the dot', () => {
    const r = row([lane('c'), lane('c')], [lane('p')], 0);
    const built = buildRow(r, { ...opts, sha: 'c', parentCount: 1 });
    const ds = built.segments.map((s) => s.d);
    expect(ds).toContain('M10 0V12');
    expect(ds).toContain('M22 0V7A5 5 0 0 1 17 12H10');
  });

  it('a tip entering the window opens a lane at the right edge', () => {
    const r = row([lane('x')], [lane('x'), lane('p')], 1);
    const built = buildRow(r, { ...opts, sha: 'tip', parentCount: 1 });
    expect(built.dot.x).toBe(22);
    expect(built.segments.map((s) => s.d)).toContain('M10 0V24');
  });

  it('routes a merge into the marker colourlessly', () => {
    const lanes = Array.from({ length: 5 }, (_, i) => lane(`p${i}`, i));
    const r = row(lanes, lanes, 0, [5], 5);
    const built = buildRow(r, { sha: 'p0', parentCount: 2, columns: 6 });
    const elbow = built.segments.find((s) => s.d.startsWith('M10 12H'));
    expect(elbow?.hue).toBe(-1);
  });

  it('draws capRow’s fold marker as one colourless stroke', () => {
    // What capRow(row, 6) hands back for an 11-lane row: five surviving
    // columns and a marker at column 5.
    const lanes = Array.from({ length: 5 }, (_, i) => lane(`p${i}`, i));
    const r = row(lanes, lanes, 0, [], 5);
    const built = buildRow(r, { sha: 'p0', parentCount: 1, columns: 6 });
    const marker = built.segments.filter((s) => s.hue === -1);
    expect(marker).toEqual([{ d: 'M70 0V24', hue: -1 }]);
    expect(built.width).toBe(80);
  });

  it('a commit clamped onto the marker keeps its own hue', () => {
    // capRow clamps an overflowing `circle` onto the marker column rather than
    // dropping the dot; the colour then has to come from the layout row.
    const lanes = Array.from({ length: 5 }, (_, i) => lane(`p${i}`, i));
    const r = row(lanes, lanes, 5, [], 5);
    const built = buildRow(r, {
      sha: 'nope',
      parentCount: 1,
      columns: 6,
      color: { kind: 'cycle', slot: 9 }
    });
    expect(built.dot.x).toBe(70);
    expect(built.dot.bundled).toBe(true);
    expect(built.dot.hue).toBe(3); // slot 9 mod 6
  });
});

describe('continuation rows', () => {
  it('carries every live lane straight through a file row', () => {
    const segments = buildSpacer([lane('a'), lane('b'), lane('c')], 4);
    expect(segments.map((s) => s.d)).toEqual(['M10 0V24', 'M22 0V24', 'M34 0V24']);
  });

  it('folds the same way commit rows do', () => {
    const lanes = Array.from({ length: 10 }, (_, i) => lane(`p${i}`));
    const segments = buildSpacer(lanes, 6);
    expect(segments).toHaveLength(6);
    expect(segments.at(-1)).toEqual({ d: 'M70 0V24', hue: -1 });
  });
});

/**
 * The one place the palette is stated TWICE: `LANE_COLOR_VARS` names slot →
 * token for the layout module, and `graph.css` re-states it as
 * `[data-hue='n'] { --graph-hue: var(--graph-lane-n+1) }` for the paint. The
 * stylesheet is the right home for the paint and the constant is the right
 * home for the test, so neither copy should go — but an unchecked duplicate
 * can drift, and a drift here means a lane whose stroke and whose dot disagree
 * about which line of history they belong to. This makes the drift a build
 * failure instead.
 */
describe('the hue ramp, stated once in CSS and once in TS', () => {
  const css = readFileSync(
    new URL('../graph.css', import.meta.url),
    'utf8'
  );

  it('maps every data-hue slot to the token the layout module names', () => {
    expect(LANE_COLOR_VARS).toHaveLength(GRAPH_HUES);
    LANE_COLOR_VARS.forEach((token, slot) => {
      const rule = new RegExp(
        `\\[data-hue='${slot}'\\]\\s*\\{\\s*--graph-hue:\\s*var\\(${token}\\)`
      );
      expect(rule.test(css), `graph.css slot ${slot} → ${token}`).toBe(true);
    });
  });

  it('defines no slot the ramp does not have', () => {
    const slots = [...css.matchAll(/\[data-hue='(\d+)'\]\s*\{\s*--graph-hue/g)];
    expect(slots).toHaveLength(GRAPH_HUES);
  });
});
