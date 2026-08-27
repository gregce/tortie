/**
 * The map's pure halves, held to their documented rules (Phase 160).
 *
 * WHAT IS HELD HERE.
 *
 *  - The layout is DETERMINISTIC and canonical: the same model twice gives
 *    deep-equal layouts, and a model whose arrays arrive shuffled gives the
 *    same layout as the sorted one.
 *  - Rows are the three bands in fixed order, an empty band collapses, and
 *    an unknown band lands in the middle rather than crashing or vanishing.
 *  - Weight is size: a bigger part gets a bigger box, every side stays
 *    inside the bounds, and every coordinate sits on the 4px grid.
 *  - The barycenter pass is ONE pass from the id-sorted initial order: a box
 *    pulled by an adjacent-row partner moves, a box with no partners stays,
 *    and ties break by id.
 *  - Edge thickness is weight, inside its bounds, monotonic in count.
 *  - An edge naming an unknown group or naming one group twice is skipped,
 *    never guessed at.
 */

import { describe, expect, it } from 'vitest';
import {
  edgeMarkerId,
  edgeStrokeWidth,
  edgeVerdictClass,
  MAP_BOX_MAX_H,
  MAP_BOX_MAX_W,
  MAP_BOX_MIN_H,
  MAP_BOX_MIN_W,
  MAP_EDGE_MAX_SW,
  MAP_EDGE_MIN_SW,
  fmt,
  grid4,
  planEdges
} from '../geometry';
import { layoutMap } from '../layout';
import { normalizeBand } from '../types';
import type { ArchMapGroup, ArchMapModel } from '../types';

function group(
  id: string,
  band: string,
  fileCount: number,
  extra: Partial<ArchMapGroup> = {}
): ArchMapGroup {
  return {
    id,
    label: id,
    fileCount,
    band,
    provenance: 'first-party',
    unresolved: false,
    ...extra
  };
}

/** A model shaped like the measured gmux level 1: one big box, one edge. */
function gmuxish(): ArchMapModel {
  return {
    groups: [
      group('build', 'surface', 90),
      group('docs', 'surface', 260),
      group('resources', 'foundation', 12),
      group('src', 'engine', 1711),
      group('scripts', 'surface', 8)
    ],
    edges: [{ from: 'build', to: 'src', count: 69 }]
  };
}

describe('determinism and canonical order', () => {
  it('the same model twice gives deep-equal layouts', () => {
    expect(layoutMap(gmuxish())).toEqual(layoutMap(gmuxish()));
  });

  it('a shuffled model draws the same layout as the sorted one', () => {
    const sorted = gmuxish();
    const shuffled: ArchMapModel = {
      groups: [...sorted.groups].reverse(),
      edges: [...sorted.edges].reverse()
    };
    expect(layoutMap(shuffled)).toEqual(layoutMap(sorted));
  });

  it('planned edges do not depend on the input edge order', () => {
    const model: ArchMapModel = {
      groups: [
        group('a', 'surface', 10),
        group('b', 'engine', 10),
        group('c', 'foundation', 10)
      ],
      edges: [
        { from: 'b', to: 'c', count: 3 },
        { from: 'a', to: 'b', count: 5 }
      ]
    };
    const layout = layoutMap(model);
    const forward = planEdges(layout, model.edges);
    const reversed = planEdges(layout, [...model.edges].reverse());
    expect(forward).toEqual(reversed);
    expect(forward.map((p) => `${p.edge.from}>${p.edge.to}`)).toEqual([
      'a>b',
      'b>c'
    ]);
  });
});

describe('rows are the bands', () => {
  it('draws the three bands top down and collapses an empty one', () => {
    const three = layoutMap(gmuxish());
    expect(three.rows.map((r) => r.band)).toEqual([
      'surface',
      'engine',
      'foundation'
    ]);

    const two = layoutMap({
      groups: [group('a', 'engine', 5), group('b', 'foundation', 5)],
      edges: []
    });
    expect(two.rows.map((r) => r.band)).toEqual(['engine', 'foundation']);
    // The collapsed band costs no height: the first row starts at the pad.
    expect(two.rows[0]?.y).toBe(three.rows[0]?.y);
  });

  it('an unknown band lands in the middle row', () => {
    expect(normalizeBand('surface')).toBe('surface');
    expect(normalizeBand('foundation')).toBe('foundation');
    expect(normalizeBand('core')).toBe('engine');
    const layout = layoutMap({
      groups: [group('odd', 'a-band-nobody-computed', 3)],
      edges: []
    });
    expect(layout.rows.map((r) => r.band)).toEqual(['engine']);
  });
});

describe('weight is size', () => {
  it('a bigger part gets a bigger box and every side stays in bounds', () => {
    const layout = layoutMap(gmuxish());
    const src = layout.boxById.get('src');
    const scripts = layout.boxById.get('scripts');
    if (src === undefined || scripts === undefined) throw new Error('missing');
    expect(src.w).toBeGreaterThan(scripts.w);
    expect(src.h).toBeGreaterThan(scripts.h);
    // The largest part hits the ceiling exactly; nothing leaves the bounds.
    expect(src.w).toBe(MAP_BOX_MAX_W);
    expect(src.h).toBe(MAP_BOX_MAX_H);
    for (const box of layout.boxes) {
      expect(box.w).toBeGreaterThanOrEqual(MAP_BOX_MIN_W);
      expect(box.w).toBeLessThanOrEqual(MAP_BOX_MAX_W);
      expect(box.h).toBeGreaterThanOrEqual(MAP_BOX_MIN_H);
      expect(box.h).toBeLessThanOrEqual(MAP_BOX_MAX_H);
    }
  });

  it('every coordinate sits on the 4px grid', () => {
    const layout = layoutMap(gmuxish());
    for (const box of layout.boxes) {
      expect(box.x % 4).toBe(0);
      expect(box.y % 4).toBe(0);
      expect(box.w % 4).toBe(0);
      expect(box.h % 4).toBe(0);
    }
  });
});

describe('the barycenter pass', () => {
  it('one adjacent partner pulls a box across the row, ties break by id', () => {
    // Surface holds a and b; engine starts in id order c, d, e. The single
    // edge a->e pulls e to a's end of the row: keys are e=0 (partner a's
    // initial position), c=0 (its own), d=0.5, so c and e tie at 0, the id
    // breaks the tie, and the order becomes c, e, d.
    const layout = layoutMap({
      groups: [
        group('a', 'surface', 10),
        group('b', 'surface', 10),
        group('c', 'engine', 10),
        group('d', 'engine', 10),
        group('e', 'engine', 10)
      ],
      edges: [{ from: 'a', to: 'e', count: 1 }]
    });
    const engine = layout.boxes
      .filter((box) => box.band === 'engine')
      .sort((p, q) => p.x - q.x)
      .map((box) => box.group.id);
    expect(engine).toEqual(['c', 'e', 'd']);
  });

  it('a box with no partners keeps its id-order place', () => {
    const layout = layoutMap({
      groups: [
        group('c', 'engine', 10),
        group('d', 'engine', 10),
        group('e', 'engine', 10)
      ],
      edges: []
    });
    const engine = [...layout.boxes]
      .sort((p, q) => p.x - q.x)
      .map((box) => box.group.id);
    expect(engine).toEqual(['c', 'd', 'e']);
  });
});

describe('edge thickness is weight', () => {
  it('stays inside the bounds and grows with the count', () => {
    expect(edgeStrokeWidth(1, 100)).toBeGreaterThanOrEqual(MAP_EDGE_MIN_SW);
    expect(edgeStrokeWidth(100, 100)).toBe(MAP_EDGE_MAX_SW);
    expect(edgeStrokeWidth(50, 100)).toBeGreaterThan(edgeStrokeWidth(10, 100));
    expect(edgeStrokeWidth(0, 0)).toBe(MAP_EDGE_MIN_SW);
  });

  it('skips a self loop and an edge naming a group the layout lacks', () => {
    const model: ArchMapModel = {
      groups: [group('a', 'surface', 5), group('b', 'engine', 5)],
      edges: [
        { from: 'a', to: 'a', count: 9 },
        { from: 'a', to: 'ghost', count: 9 },
        { from: 'a', to: 'b', count: 2 }
      ]
    };
    const planned = planEdges(layoutMap(model), model.edges);
    expect(planned).toHaveLength(1);
    expect(planned[0]?.edge.to).toBe('b');
  });

  it('a same-row edge dips below the row instead of crossing a box', () => {
    const model: ArchMapModel = {
      groups: [group('a', 'engine', 5), group('b', 'engine', 5)],
      edges: [{ from: 'a', to: 'b', count: 2 }]
    };
    const layout = layoutMap(model);
    const planned = planEdges(layout, model.edges);
    const path = planned[0]?.path ?? '';
    // Path shape is `M ax ay C ax deep, bx deep, bx by`; the fourth number
    // is the dip and it sits deeper than both box bottoms.
    const bottoms = layout.boxes.map((box) => box.y + box.h);
    const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(numbers[3] ?? 0).toBeGreaterThan(Math.max(...bottoms));
    // And the canvas grew to give the dip its room.
    expect(layout.height).toBeGreaterThan(
      (layout.rows[0]?.y ?? 0) + (layout.rows[0]?.h ?? 0)
    );
  });
});

describe('verdict dress', () => {
  it('mirrors the cockpit: holds, broke, and nothing for the unjudged', () => {
    expect(edgeVerdictClass('convergent')).toBe('arch-map-e-holds');
    expect(edgeVerdictClass('divergent')).toBe('arch-map-e-broke');
    expect(edgeVerdictClass('absent')).toBe('arch-map-e-broke');
    expect(edgeVerdictClass(undefined)).toBe('');
    expect(edgeVerdictClass('later-vocabulary')).toBe('');
    expect(edgeMarkerId('convergent')).toBe('arch-map-arrow-holds');
    expect(edgeMarkerId('divergent')).toBe('arch-map-arrow-broke');
    expect(edgeMarkerId(undefined)).toBe('arch-map-arrow');
  });
});

describe('the number vocabulary', () => {
  it('grid4 and fmt are the two rounding rules and they are stable', () => {
    expect(grid4(129.9)).toBe(128);
    expect(grid4(130.1)).toBe(132);
    expect(fmt(4.499999)).toBe('4.5');
    expect(fmt(4.5)).toBe('4.5');
    expect(fmt(4)).toBe('4');
  });
});
