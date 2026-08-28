/**
 * The camera on the rendered surface (Phase 162): a given camera state
 * renders one exact picture. The camera's PATH is a person's hand and is
 * not reproducible; the AT-REST bytes for a given state are, and this suite
 * is that property made executable, through `renderToStaticMarkup` exactly
 * as the Phase 160 determinism suite renders.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchMap } from '../../ArchMap';
import { MAP_DEFAULT_VIEWPORT, layoutMap } from '../../layout';
import { fitCamera } from '../../geometry';
import { cameraToSvg } from '../transform';
import type { ArchCanvasSeam } from '../seam';
import type { ArchMapModel } from '../../types';

function model(): ArchMapModel {
  return {
    groups: [
      {
        id: 'app',
        label: 'app',
        fileCount: 40,
        band: 'surface',
        provenance: 'first-party',
        unresolved: false
      },
      {
        id: 'core',
        label: 'core',
        fileCount: 200,
        band: 'engine',
        provenance: 'first-party',
        unresolved: false
      }
    ],
    edges: [{ from: 'app', to: 'core', count: 12 }]
  };
}

function seam(camera: { k: number; x: number; y: number } | null): ArchCanvasSeam {
  return {
    cameraRef: { current: null },
    camera,
    positions: null,
    onCameraRest: () => undefined,
    onLayoutChange: () => undefined
  };
}

describe('a camera state draws one exact picture', () => {
  it('the same kept camera twice renders the same bytes', () => {
    const kept = { k: 1.5, x: 96, y: 64 };
    const a = renderToStaticMarkup(<ArchMap model={model()} canvas={seam(kept)} />);
    const b = renderToStaticMarkup(<ArchMap model={model()} canvas={seam(kept)} />);
    expect(a).toBe(b);
    expect(a).toContain(`transform="${cameraToSvg(kept)}"`);
  });

  it('no seam and an empty seam both stand at the fit', () => {
    const layout = layoutMap(model(), MAP_DEFAULT_VIEWPORT);
    const fit = cameraToSvg(fitCamera(layout, MAP_DEFAULT_VIEWPORT));
    const bare = renderToStaticMarkup(<ArchMap model={model()} />);
    const empty = renderToStaticMarkup(
      <ArchMap model={model()} canvas={seam(null)} />
    );
    expect(bare).toContain(`transform="${fit}"`);
    expect(empty).toContain(`transform="${fit}"`);
  });

  it('two different camera states differ ONLY in the one transform attribute', () => {
    const a = renderToStaticMarkup(
      <ArchMap model={model()} canvas={seam({ k: 1, x: 100, y: 100 })} />
    );
    const b = renderToStaticMarkup(
      <ArchMap model={model()} canvas={seam({ k: 2, x: 100, y: 100 })} />
    );
    expect(a).not.toBe(b);
    const strip = (s: string): string =>
      s.replace(/<g class="arch-map-camera" transform="[^"]*"/, 'CAMERA');
    expect(strip(a)).toBe(strip(b));
  });

  it('a kept camera from a larger window restores inside the leash', () => {
    // Saved far off screen (a bigger monitor, another day): the restore
    // clamps, so the picture cannot come back lost.
    const wild = renderToStaticMarkup(
      <ArchMap model={model()} canvas={seam({ k: 1, x: 999999, y: 0 })} />
    );
    expect(wild).not.toContain('translate(999999');
  });

  it('the viewBox is the viewport in pixels, not the layout', () => {
    const markup = renderToStaticMarkup(
      <ArchMap
        model={model()}
        viewport={{ width: 1024, height: 768 }}
        canvas={seam(null)}
      />
    );
    expect(markup).toContain('viewBox="0 0 1024 768"');
  });
});
