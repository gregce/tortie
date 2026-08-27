/**
 * Phase 161: the picture fills the tab, and a scoped picture keeps its frame.
 *
 * WHAT IS HELD HERE.
 *
 *  - THE OPERATOR'S SHAPE. His 2026-08-27 screenshot was nine one-band boxes
 *    drawn as a strip across the bottom of a mostly empty tab. The layout now
 *    wraps a band against the viewport, so that shape covers the surface
 *    instead. The coverage is asserted as a measured number against the
 *    unwrapped layout of the same model.
 *  - DETERMINISM SURVIVES THE VIEWPORT. The viewport is a layout input: the
 *    same model in the same viewport renders the same bytes, shuffled input
 *    included, and the default viewport is one constant.
 *  - THE FRAME. A scoped model's crossings draw as stubs, one per outside
 *    part per side, importers above and dependencies below, each keeping the
 *    outside part's real label. Stubs are context: never a button, never a
 *    verdict colour, and their edges share the one weight pool.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchMap } from '../ArchMap';
import {
  MAP_EDGE_MAX_SW,
  MAP_STUB_H,
  edgeMaxCount,
  planEdges,
  planFrameEdges,
  stubKey
} from '../geometry';
import { MAP_DEFAULT_VIEWPORT, layoutMap } from '../layout';
import type { ArchMapFrameEdge, ArchMapGroup, ArchMapModel } from '../types';

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

/**
 * The operator's deadreckon shape: nine parts, every one in the same band,
 * so the whole picture used to be one row.
 */
function operatorShape(): ArchMapModel {
  const names = [
    'api',
    'core',
    'db',
    'jobs',
    'lib',
    'models',
    'routes',
    'ui',
    'util'
  ];
  return {
    groups: names.map((name, i) => group(name, 'engine', 10 + i * 20)),
    edges: [
      { from: 'api', to: 'core', count: 12 },
      { from: 'routes', to: 'core', count: 6 },
      { from: 'core', to: 'db', count: 9 }
    ]
  };
}

/** A scoped level 2 model with a frame on both sides. */
function scopedShape(): ArchMapModel {
  const frame: ArchMapFrameEdge[] = [
    {
      boxId: 'ipc',
      outsideId: 'renderer',
      outsideLabel: 'The renderer',
      direction: 'in',
      count: 30
    },
    {
      boxId: 'core',
      outsideId: 'renderer',
      outsideLabel: 'The renderer',
      direction: 'in',
      count: 4
    },
    {
      boxId: 'core',
      outsideId: 'shared',
      outsideLabel: 'shared',
      direction: 'out',
      count: 11
    }
  ];
  return {
    groups: [
      group('ipc', 'surface', 6),
      group('core', 'engine', 30),
      group('store', 'engine', 12)
    ],
    edges: [
      { from: 'ipc', to: 'core', count: 8 },
      { from: 'core', to: 'store', count: 3 }
    ],
    frame
  };
}

/** How much of a viewport the layout's drawn rectangle covers under meet. */
function coverage(
  layout: { width: number; height: number },
  vw: number,
  vh: number
): number {
  const scale = Math.min(vw / layout.width, vh / layout.height);
  return (layout.width * scale * (layout.height * scale)) / (vw * vh);
}

describe('the picture fills the tab (the operator shape)', () => {
  const vw = MAP_DEFAULT_VIEWPORT.width;
  const vh = MAP_DEFAULT_VIEWPORT.height;

  it('the nine box band wraps instead of drawing one strip', () => {
    const wrapped = layoutMap(operatorShape(), { width: vw, height: vh });
    const lines = new Set(wrapped.boxes.map((b) => b.y)).size;
    expect(wrapped.boxes).toHaveLength(9);
    expect(lines).toBeGreaterThan(1);
  });

  it('coverage of the tab at least doubles against the unwrapped strip', () => {
    const wrapped = layoutMap(operatorShape(), { width: vw, height: vh });
    // The strip is what the same model lays out as when nothing can wrap.
    const strip = layoutMap(operatorShape(), { width: 100000, height: 10 });
    const before = coverage(strip, vw, vh);
    const after = coverage(wrapped, vw, vh);
    expect(after).toBeGreaterThan(before * 2);
    // And the picture is genuinely most of the surface, not a bigger strip.
    expect(after).toBeGreaterThan(0.5);
  });

  it('every box still lands on the 4px grid after the wrap', () => {
    const wrapped = layoutMap(operatorShape(), { width: vw, height: vh });
    for (const box of wrapped.boxes) {
      expect(box.x % 4).toBe(0);
      expect(box.y % 4).toBe(0);
      expect(box.w % 4).toBe(0);
      expect(box.h % 4).toBe(0);
    }
  });

  it('the wrap is deterministic: same model, same viewport, same layout', () => {
    const a = layoutMap(operatorShape(), { width: vw, height: vh });
    const b = layoutMap(operatorShape(), { width: vw, height: vh });
    expect(a).toEqual(b);
  });

  it('a shuffled model wraps to the same bytes', () => {
    const sorted = operatorShape();
    const shuffled: ArchMapModel = {
      groups: [...sorted.groups].reverse(),
      edges: [...sorted.edges].reverse()
    };
    const draw = (m: ArchMapModel): string =>
      renderToStaticMarkup(
        <ArchMap model={m} viewport={{ width: vw, height: vh }} />
      );
    expect(draw(shuffled)).toBe(draw(sorted));
  });

  it('the default viewport is one constant, so a bare render is deterministic', () => {
    const bare = renderToStaticMarkup(<ArchMap model={operatorShape()} />);
    const explicit = renderToStaticMarkup(
      <ArchMap model={operatorShape()} viewport={MAP_DEFAULT_VIEWPORT} />
    );
    expect(bare).toBe(explicit);
  });

  it('a tall viewport and a wide viewport wrap differently, both honestly', () => {
    const tall = layoutMap(operatorShape(), { width: 600, height: 1200 });
    const wide = layoutMap(operatorShape(), { width: 2400, height: 600 });
    expect(tall.width).toBeLessThan(wide.width);
    expect(tall.height).toBeGreaterThan(wide.height);
  });
});

describe('the frame of a scoped picture', () => {
  it('one stub per outside part per side, importers above, dependencies below', () => {
    const layout = layoutMap(scopedShape());
    // Two crossings name renderer inbound; they share ONE stub.
    expect(layout.stubs).toHaveLength(2);
    const inStub = layout.stubByKey.get(stubKey('in', 'renderer'));
    const outStub = layout.stubByKey.get(stubKey('out', 'shared'));
    expect(inStub).toBeDefined();
    expect(outStub).toBeDefined();
    const topOfBoxes = Math.min(...layout.boxes.map((b) => b.y));
    const bottomOfBoxes = Math.max(...layout.boxes.map((b) => b.y + b.h));
    expect((inStub?.y ?? 0) + MAP_STUB_H).toBeLessThanOrEqual(topOfBoxes);
    expect(outStub?.y ?? 0).toBeGreaterThanOrEqual(bottomOfBoxes);
  });

  it('the stubs keep the outside part real labels on the drawn surface', () => {
    const markup = renderToStaticMarkup(<ArchMap model={scopedShape()} />);
    expect(markup).toContain('The renderer');
    expect(markup).toContain('shared');
    expect(markup.match(/arch-map-stub-rect/g) ?? []).toHaveLength(2);
  });

  it('every crossing draws as one frame edge with an arrowhead', () => {
    const model = scopedShape();
    const layout = layoutMap(model);
    const pool = edgeMaxCount(model.edges, model.frame ?? []);
    const planned = planFrameEdges(layout, model.frame ?? [], pool);
    expect(planned).toHaveLength(3);
    const markup = renderToStaticMarkup(<ArchMap model={model} />);
    expect(markup.match(/arch-map-frame-edge/g) ?? []).toHaveLength(3);
  });

  it('interior and frame edges share one weight pool', () => {
    const model = scopedShape();
    const layout = layoutMap(model);
    const pool = edgeMaxCount(model.edges, model.frame ?? []);
    expect(pool).toBe(30);
    const interior = planEdges(layout, model.edges, pool);
    const frame = planFrameEdges(layout, model.frame ?? [], pool);
    // The heaviest line anywhere is the heaviest crossing, at the cap.
    const widest = Math.max(...frame.map((p) => p.strokeWidth));
    expect(widest).toBe(MAP_EDGE_MAX_SW);
    for (const p of interior) {
      expect(p.strokeWidth).toBeLessThan(widest);
    }
  });

  it('a stub is context, never a button, even while boxes are buttons', () => {
    const markup = renderToStaticMarkup(
      <ArchMap model={scopedShape()} onOpenGroup={() => undefined} />
    );
    const stubChunks = markup.split('arch-map-stub"');
    for (const chunk of stubChunks.slice(1)) {
      const opening = chunk.slice(0, chunk.indexOf('>'));
      expect(opening).not.toContain('role="button"');
      expect(opening).not.toContain('tabindex');
    }
    // The three interior boxes are the only buttons.
    expect(markup.match(/role="button"/g) ?? []).toHaveLength(3);
  });

  it('a frame edge naming a box or stub the layout does not hold is skipped', () => {
    const model = scopedShape();
    const layout = layoutMap(model);
    const pool = edgeMaxCount(model.edges, model.frame ?? []);
    const planned = planFrameEdges(
      layout,
      [
        {
          boxId: 'ghost',
          outsideId: 'renderer',
          outsideLabel: 'The renderer',
          direction: 'in',
          count: 1
        },
        {
          boxId: 'core',
          outsideId: 'nowhere',
          outsideLabel: 'nowhere',
          direction: 'out',
          count: 1
        }
      ],
      pool
    );
    expect(planned).toHaveLength(0);
  });

  it('a level 1 model with no frame draws no stub and no frame edge', () => {
    const markup = renderToStaticMarkup(<ArchMap model={operatorShape()} />);
    expect(markup).not.toContain('arch-map-stub');
    expect(markup).not.toContain('arch-map-frame-edge');
  });

  it('the frame speaks no digits on the drawn surface', () => {
    const markup = renderToStaticMarkup(<ArchMap model={scopedShape()} />);
    const text = markup.replace(/<[^>]*>/g, ' ');
    expect(text).not.toMatch(/\d/);
  });
});
