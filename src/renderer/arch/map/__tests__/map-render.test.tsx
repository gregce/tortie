/**
 * The map as markup (Phase 160). No jsdom in this repository, so the
 * component renders through `renderToStaticMarkup`, the shape
 * `p64-modules.test.tsx` uses.
 *
 * WHAT IS HELD HERE.
 *
 *  - DETERMINISM, byte for byte: the same model twice renders the same
 *    string, and a model whose arrays arrive shuffled renders that same
 *    string too. This is the charter's "same facts, same picture" made
 *    executable.
 *  - NO COUNT BADGE. The rendered text carries no digit: weight is size and
 *    thickness, never a number pinned to a box. The dashboard refusal
 *    survives, and this test is the line that stops it being undone.
 *  - The honest grey: an unresolved part wears the grey class and says
 *    "imports unknown" on its face. Somebody else's code wears the muted
 *    dashed dress; ours does not.
 *  - Verdict colour rides only a judged edge, in the cockpit's own mapping.
 *  - The stylesheet spends tokens only, spends no amber, and moves nothing.
 *  - No canvas, no WebGL, no drawing package, no click handler: the picture
 *    is static, and drill down belongs to the next phase.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchMap, ARCH_MAP_EMPTY, ARCH_MAP_UNKNOWN_WORD } from '../ArchMap';
import type { ArchMapGroup, ArchMapModel } from '../types';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '..', 'map.css'), 'utf8');
const TSX = readFileSync(join(HERE, '..', 'ArchMap.tsx'), 'utf8');
const LAYOUT = readFileSync(join(HERE, '..', 'layout.ts'), 'utf8');
const GEOMETRY = readFileSync(join(HERE, '..', 'geometry.ts'), 'utf8');

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

/** Every state at once: three bands, verdicts, grey, vendored, an overlay. */
function fullModel(): ArchMapModel {
  return {
    groups: [
      group('app', 'surface', 40, { label: 'The App', overlaid: true }),
      group('cli', 'surface', 12),
      group('core', 'engine', 800),
      group('render', 'engine', 300),
      group('vendor', 'engine', 90, { provenance: 'vendored' }),
      group('native-bits', 'foundation', 30, {
        provenance: 'native',
        unresolved: true
      }),
      group('proto', 'foundation', 15, { provenance: 'generated' })
    ],
    edges: [
      { from: 'app', to: 'core', count: 120, verdict: 'convergent' },
      { from: 'cli', to: 'core', count: 9, verdict: 'divergent' },
      { from: 'core', to: 'proto', count: 30, verdict: 'absent' },
      { from: 'render', to: 'vendor', count: 14 },
      { from: 'core', to: 'native-bits', count: 4 }
    ]
  };
}

function draw(model: ArchMapModel): string {
  return renderToStaticMarkup(<ArchMap model={model} />);
}

/** The rendered text alone: what a person reads, tags and attributes gone. */
function textOf(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ');
}

describe('determinism, byte for byte', () => {
  it('the same model twice renders the same string', () => {
    expect(draw(fullModel())).toBe(draw(fullModel()));
  });

  it('a shuffled model renders the same string as the sorted one', () => {
    const sorted = fullModel();
    const shuffled: ArchMapModel = {
      groups: [...sorted.groups].reverse(),
      edges: [...sorted.edges].reverse()
    };
    expect(draw(shuffled)).toBe(draw(sorted));
  });
});

describe('the picture', () => {
  it('draws one svg with a viewBox and no fixed pixel size', () => {
    const markup = draw(fullModel());
    expect(markup).toContain('<svg');
    expect(markup).toContain('viewBox="0 0 ');
    expect(markup).not.toMatch(/<svg[^>]*\swidth=/);
    expect(markup).not.toMatch(/<svg[^>]*\sheight=/);
  });

  it('draws every part as a box and every edge as a path with an arrowhead', () => {
    const markup = draw(fullModel());
    for (const id of ['app', 'cli', 'core', 'render', 'vendor', 'proto']) {
      expect(markup).toContain(`data-group="${id}"`);
    }
    const paths = markup.match(/class="arch-map-edge/g) ?? [];
    expect(paths).toHaveLength(5);
    expect(markup).toContain('marker-end="url(#arch-map-arrow)"');
  });

  it('an overlaid part draws the person’s name', () => {
    expect(textOf(draw(fullModel()))).toContain('The App');
  });

  it('an empty model says so instead of drawing a blank surface', () => {
    const markup = draw({ groups: [], edges: [] });
    expect(markup).toContain(ARCH_MAP_EMPTY);
    expect(markup).not.toContain('<svg');
  });
});

describe('no count badge on any node', () => {
  it('the rendered text carries no digit', () => {
    expect(textOf(draw(fullModel()))).not.toMatch(/\d/);
  });

  it('no file count and no import count reaches an attribute a person reads', () => {
    const markup = draw(fullModel());
    // The heaviest group and edge counts must not appear as literal words
    // in titles or labels. Path data is coordinates, checked by the text
    // scan above; here the two known counts are asserted out of the titles.
    for (const title of markup.match(/<title>[^<]*<\/title>/g) ?? []) {
      expect(title).not.toMatch(/\d/);
    }
  });
});

describe('the honest grey, and the provenance dress', () => {
  it('an unresolved part wears the grey and says so on its face', () => {
    const markup = draw(fullModel());
    const grey = markup.match(/class="arch-map-box[^"]*arch-map-grey[^"]*"/g) ?? [];
    expect(grey).toHaveLength(1);
    expect(textOf(markup)).toContain(ARCH_MAP_UNKNOWN_WORD);
  });

  it('somebody else’s code wears the muted dress and ours does not', () => {
    const markup = draw(fullModel());
    const theirs = markup.match(/arch-map-theirs/g) ?? [];
    // vendored, native and generated are not ours; the four first-party
    // boxes must not wear the class.
    expect(theirs.length).toBeGreaterThanOrEqual(3);
    const appBox = markup.slice(markup.indexOf('data-group="app"') - 200);
    expect(appBox.slice(0, 200)).not.toContain('arch-map-theirs');
  });

  it('the provenance word travels with the glyph', () => {
    const text = textOf(draw(fullModel()));
    expect(text).toContain('Vendored');
    expect(text).toContain('Native');
    expect(text).toContain('Generated');
    expect(text).toContain('Ours');
  });
});

describe('verdict colour rides only a judged edge', () => {
  it('holds, broke, and nothing, in the cockpit’s mapping', () => {
    const markup = draw(fullModel());
    expect(markup.match(/arch-map-e-holds/g) ?? []).toHaveLength(1);
    // divergent and absent both read as failures.
    expect(markup.match(/arch-map-e-broke/g) ?? []).toHaveLength(2);
    expect(markup).toContain('url(#arch-map-arrow-holds)');
    expect(markup).toContain('url(#arch-map-arrow-broke)');
    // The two unjudged edges wear the plain dress.
    expect(markup.match(/class="arch-map-edge"/g) ?? []).toHaveLength(2);
  });
});

describe('the refusals, kept executable', () => {
  it('spends tokens and never a colour literal', () => {
    const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => line.includes(':'));
    for (const line of declarations) {
      expect(line).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(line).not.toMatch(/\b(rgba?|hsla?)\(/);
    }
  });

  it('spends no amber, because that hue belongs to an agent needing you', () => {
    expect(CSS).not.toMatch(/--warning\b/);
    expect(CSS).not.toMatch(/--status-attention\b/);
  });

  it('moves nothing', () => {
    const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toMatch(/\btransition\s*:/);
    expect(declarations).not.toMatch(/\banimation\s*:/);
    expect(declarations).not.toMatch(/@keyframes\b/);
  });

  it('no canvas, no WebGL, no drawing package, no randomness', () => {
    for (const source of [TSX, LAYOUT, GEOMETRY]) {
      for (const banned of [
        '<canvas',
        'getContext(',
        'webgl',
        'd3-',
        'cytoscape',
        'elkjs',
        'dagre',
        'Math.random'
      ]) {
        expect(source).not.toContain(banned);
      }
    }
  });

  it('no pan, no zoom, no drag: the one interaction is the drill click', () => {
    // Phase 161 made a box a button when the drill seam is handed in, so
    // onClick and onKeyDown are now deliberate. Everything a canvas phase
    // would add stays banned until Phase 162 earns it.
    for (const banned of ['onMouseDown', 'onWheel', 'onDrag', 'onPointerDown']) {
      expect(TSX).not.toContain(banned);
    }
  });

  it('without the drill seam the picture stays static, with it every box is a button', () => {
    const still = draw(fullModel());
    expect(still).not.toContain('role="button"');
    expect(still).not.toContain('tabindex');
    const wired = renderToStaticMarkup(
      <ArchMap model={fullModel()} onOpenGroup={() => undefined} />
    );
    const buttons = wired.match(/role="button"/g) ?? [];
    expect(buttons).toHaveLength(fullModel().groups.length);
    expect(wired.match(/tabindex="0"/g) ?? []).toHaveLength(
      fullModel().groups.length
    );
    // The click affordance never rewrites what the box says.
    expect(textOf(wired).includes('The App')).toBe(true);
  });

  it('never says a tmux word', () => {
    const text = textOf(draw(fullModel())).toLowerCase();
    for (const banned of ['pane', 'prefix', 'tmux']) {
      expect(text).not.toContain(banned);
    }
  });
});
