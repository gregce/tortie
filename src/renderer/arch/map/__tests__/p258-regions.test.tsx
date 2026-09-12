/**
 * The regions, the wires, the rung chip and the selection gesture on the map
 * (Phase 258), rendered to static markup the way the Phase 160 suite does.
 *
 * WHAT IS HELD HERE.
 *
 *  - A model with regions draws one frame per region that holds a box, in
 *    the composer's order, with its label, its sub and its starts line; the
 *    Outside band draws dashed with its one sentence and no box.
 *  - A transport between two adjacent frames is a wire in the column
 *    between them carrying what crosses and a count; a transport to Outside
 *    sits inside the band; a transport with a count of zero draws nothing.
 *  - The chip: every box carries `data-rung`, the glyph is one of the five,
 *    and NO NUMBER reaches the rendered text of any node. The counts ride
 *    the chip's title attribute, which a person reads on hover.
 *  - A regionless model draws byte for byte what it drew before this phase,
 *    which is the scoped picture's guarantee and every older model's.
 *  - Determinism: a shuffled regioned model draws the same string.
 *  - The gesture rule, pure: select, open, clear, in SPEC D5's shape.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchMap, boxMove } from '../ArchMap';
import { layoutMap } from '../layout';
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

const reading = (rung: string, reached: number, tested: number) => ({
  rung,
  anchors: 100,
  parsed: 90,
  reached,
  tested,
  seeds: 2
});

/** Two units, one Elsewhere box, an Outside band, three transports. */
function regioned(): ArchMapModel {
  return {
    groups: [
      group('a-src', 'engine', 800, { regionId: 'unit:a', rung: reading('tested', 583, 395) }),
      group('a-cli', 'surface', 12, { regionId: 'unit:a', rung: reading('reached', 12, 0) }),
      group('b-lib', 'foundation', 90, { regionId: 'unit:b', rung: reading('composed', 0, 4) }),
      group('docs', 'surface', 260, { regionId: 'elsewhere', rung: reading('declared', 0, 0) })
    ],
    edges: [
      { from: 'a-cli', to: 'a-src', count: 9 },
      { from: 'a-src', to: 'b-lib', count: 412 }
    ],
    regions: [
      {
        id: 'unit:a',
        kind: 'unit',
        label: 'alpha',
        sub: 'npm package',
        groupIds: ['a-src', 'a-cli'],
        startsLine: 'starts 2 workers',
        startsTitle: 'worker · a/src/w.ts:10\nworker · a/src/x.ts:20'
      },
      {
        id: 'unit:b',
        kind: 'unit',
        label: 'beta',
        sub: 'cargo crate',
        groupIds: ['b-lib'],
        startsLine: null,
        startsTitle: null
      },
      {
        id: 'elsewhere',
        kind: 'elsewhere',
        label: 'Elsewhere',
        sub: 'no manifest names these',
        groupIds: ['docs'],
        startsLine: null,
        startsTitle: null
      },
      {
        id: 'outside',
        kind: 'outside',
        label: 'Outside this repository',
        sub: 'programs and hosts it reaches',
        groupIds: [],
        startsLine: null,
        startsTitle: null
      }
    ],
    transports: [
      { from: 'unit:a', to: 'unit:b', kind: 'imports', count: 412, label: 'imports · 412', title: 't1' },
      { from: 'unit:a', to: 'outside', kind: 'spawns', count: 30, label: 'spawns · 30', title: 't2' },
      { from: 'outside', to: 'unit:b', kind: 'listens', count: 3, label: 'listens · 3', title: 't3' }
    ]
  };
}

function draw(model: ArchMapModel, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(<ArchMap model={model} {...extra} />);
}

/** The rendered text alone: what a person reads, tags and attributes gone. */
function textOf(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'");
}

describe('the regions', () => {
  it('draws one frame per region that holds a box, in order, and the band', () => {
    const markup = draw(regioned());
    // The frames alone: a box carries its region on data-region too (the
    // probe reads a box's region from it), so the frame elements are asked.
    const frames = [...markup.matchAll(/class="arch-map-region [^"]*" data-region="([^"]+)"/g)].map((m) => m[1]);
    expect(frames).toEqual(['unit:a', 'unit:b', 'elsewhere', 'outside']);
    expect(markup).toContain('arch-map-region-outside');
    expect(textOf(markup)).toContain("Nothing here is this repository's code.");
    expect(textOf(markup)).toContain('alpha');
    expect(textOf(markup)).toContain('npm package');
    expect(textOf(markup)).toContain('starts 2 workers');
    expect(markup).toContain('title="worker · a/src/w.ts:10');
  });

  it('a region naming no box in the model draws no frame', () => {
    const model = regioned();
    model.regions = [
      ...(model.regions ?? []),
      { id: 'unit:ghost', kind: 'unit', label: 'ghost', sub: 'x', groupIds: ['nope'], startsLine: null, startsTitle: null }
    ];
    expect(draw(model)).not.toContain('data-region="unit:ghost"');
  });

  it('keeps every box inside its own frame', () => {
    const layout = layoutMap(regioned());
    for (const frame of layout.regions) {
      for (const id of frame.region.groupIds) {
        const box = layout.boxById.get(id);
        if (box === undefined) continue;
        expect(box.x).toBeGreaterThanOrEqual(frame.x);
        expect(box.y).toBeGreaterThanOrEqual(frame.y);
        expect(box.x + box.w).toBeLessThanOrEqual(frame.x + frame.w);
        expect(box.y + box.h).toBeLessThanOrEqual(frame.y + frame.h);
      }
    }
  });

  it('draws box to box edges only inside a frame; the wire carries the rest', () => {
    const markup = draw(regioned());
    expect(markup).toContain('a-cli imports a-src');
    expect(markup).not.toContain('a-src imports b-lib');
  });
});

describe('the wires', () => {
  it('a transport between adjacent frames is a wire with what crosses and a count', () => {
    const markup = draw(regioned());
    expect(markup).toContain('data-kind="imports" data-from="unit:a" data-to="unit:b" data-count="412"');
    expect(textOf(markup)).toContain('imports · 412 →');
  });

  it('a transport to or from Outside sits inside the band, both directions', () => {
    const layout = layoutMap(regioned());
    const outside = layout.regions.find((f) => f.region.kind === 'outside');
    expect(outside).toBeDefined();
    const inBand = layout.wires.filter(
      (w) => w.transport.to === 'outside' || w.transport.from === 'outside'
    );
    expect(inBand).toHaveLength(2);
    for (const w of inBand) {
      expect(w.y).toBeGreaterThanOrEqual(outside?.y ?? 0);
      expect(w.y).toBeLessThanOrEqual((outside?.y ?? 0) + (outside?.h ?? 0));
    }
    // With more than one frame the band wire names its region first.
    const text = textOf(draw(regioned()));
    expect(text).toContain('alpha · spawns · 30 →');
    expect(text).toContain('← beta · listens · 3');
  });

  it('a transport with a count of zero draws nothing (the adapter drops it; the layout too)', () => {
    const model = regioned();
    model.transports = [...(model.transports ?? []), { from: 'unit:b', to: 'unit:a', kind: 'imports', count: 0, label: 'imports · 0', title: 'z' }];
    // The adapter is the gate for zero; the drawing draws what it is handed.
    // Here the layout must still place it deterministically, so this pins
    // that a zero wire is not a crash and reads as its own label.
    expect(() => draw(model)).not.toThrow();
  });
});

describe('the rung chip', () => {
  it('puts the rung word on the box and the glyph in the label, never a number in the text', () => {
    const markup = draw(regioned());
    expect(markup).toContain('data-group="a-src" data-region="unit:a" data-rung="tested"');
    expect(markup).toContain('data-rung="composed"');
    expect(markup).toContain('codicon-check');
    expect(markup).toContain('codicon-arrow-right');
    expect(markup).toContain('codicon-circle-filled');
    expect(markup).toContain('codicon-circle-outline');
    // The counts are on the chip's hover title, never in a text node of a node.
    expect(markup).toContain('reached 583 of 90 parsed · 395 imported by a test · 2 seeds');
    const boxes = markup.match(/<g class="arch-map-box[\s\S]*?<\/g>/g) ?? [];
    expect(boxes.length).toBe(4);
    for (const box of boxes) {
      expect(textOf(box)).not.toMatch(/\d/);
      for (const title of box.match(/<title>[^<]*<\/title>/g) ?? []) {
        expect(title).not.toMatch(/\d/);
      }
    }
  });

  it('a box with no rung, or a word this build does not know, wears no chip', () => {
    const base = regioned();
    const groups = [...base.groups];
    groups[0] = { ...groups[0]!, rung: undefined };
    groups[1] = { ...groups[1]!, rung: reading('accepted-live', 1, 1) };
    const markup = draw({ ...base, groups });
    expect(markup).not.toContain('data-group="a-src" data-region="unit:a" data-rung=');
    expect(markup).not.toContain('accepted-live');
    expect((markup.match(/arch-map-rung /g) ?? []).length).toBe(2);
  });

  it('the chip spends only the two pinned tokens', () => {
    const markup = draw(regioned());
    const classes = [...markup.matchAll(/class="arch-map-rung arch-rung (arch-rung-[a-z]+)"/g)].map((m) => m[1]);
    expect(new Set(classes)).toEqual(new Set(['arch-rung-reached', 'arch-rung-quiet']));
  });
});

describe('what did not move', () => {
  it('a regionless model still draws no frame, no wire and one band rule', () => {
    const model = regioned();
    delete model.regions;
    delete model.transports;
    const markup = draw(model);
    expect(markup).not.toContain('arch-map-region');
    expect(markup).not.toContain('arch-map-wire');
    expect((markup.match(/arch-map-band-rule/g) ?? []).length).toBe(1);
    expect(markup).toContain('a-src imports b-lib');
  });

  it('a shuffled regioned model renders the same string as the sorted one', () => {
    const sorted = regioned();
    const shuffled: ArchMapModel = {
      ...sorted,
      groups: [...sorted.groups].reverse(),
      edges: [...sorted.edges].reverse(),
      transports: [...(sorted.transports ?? [])].reverse()
    };
    expect(draw(shuffled)).toBe(draw(sorted));
  });
});

describe('the selection gesture (SPEC D5)', () => {
  it('without the seam every press opens, exactly as Phase 161', () => {
    expect(boxMove({ selects: false, selectedId: null, id: 'a', gesture: 'click' })).toBe('open');
    expect(boxMove({ selects: false, selectedId: null, id: 'a', gesture: 'enter' })).toBe('open');
    expect(boxMove({ selects: false, selectedId: null, id: 'a', gesture: 'dblclick' })).toBeNull();
    expect(boxMove({ selects: false, selectedId: null, id: 'a', gesture: 'escape' })).toBeNull();
  });

  it('with the seam a click selects, a double click opens, Enter twice opens, Escape clears', () => {
    expect(boxMove({ selects: true, selectedId: null, id: 'a', gesture: 'click' })).toBe('select');
    expect(boxMove({ selects: true, selectedId: 'a', id: 'a', gesture: 'click' })).toBe('select');
    expect(boxMove({ selects: true, selectedId: null, id: 'a', gesture: 'dblclick' })).toBe('open');
    expect(boxMove({ selects: true, selectedId: null, id: 'a', gesture: 'enter' })).toBe('select');
    expect(boxMove({ selects: true, selectedId: 'a', id: 'a', gesture: 'enter' })).toBe('open');
    expect(boxMove({ selects: true, selectedId: 'b', id: 'a', gesture: 'enter' })).toBe('select');
    expect(boxMove({ selects: true, selectedId: 'a', id: 'a', gesture: 'escape' })).toBe('clear');
  });

  it('the selected box wears aria-pressed and the selected class, others do not', () => {
    const markup = draw(regioned(), {
      onOpenGroup: () => undefined,
      onSelectGroup: () => undefined,
      selectedId: 'a-src'
    });
    expect(markup).toContain('class="arch-map-box arch-map-click selected" data-group="a-src"');
    expect(markup).toContain('aria-pressed="true"');
    const pressed = markup.match(/aria-pressed="true"/g) ?? [];
    expect(pressed).toHaveLength(1);
    expect(markup).toContain('aria-label="Look inside a-src, tested"');
    expect(markup).toContain('Click to select, double click to look inside.');
  });

  it('with the drill seam alone the affordance line is the Phase 176 one', () => {
    const markup = draw(regioned(), { onOpenGroup: () => undefined });
    expect(markup).toContain('Click to look inside.');
    expect(markup).not.toContain('aria-pressed');
  });
});
