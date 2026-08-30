/**
 * Phase 165. The Catch Me Up page's lazy door, run rather than read.
 *
 * The claim is that a launch which never opens the page never evaluates the
 * page's module, and that the first open does, once, through ONE dynamic
 * import. This repository carries no jsdom, so the wrapper renders through
 * `renderToStaticMarkup`, the shape answer-hostile.test.tsx uses; the live
 * half of the same proof, being the chunk on disk and the first open over a
 * real window, is build/assert-probe-containment.mjs and
 * build/probe-p165-paint.mjs.
 *
 * The page module is mocked so the count of its evaluations can be read, and
 * so this test does not render the real page, which its own tests do. One
 * assertion at the end reads the real module's source, so a rename of the
 * export the door reads is caught here rather than in a window.
 *
 * The store is mocked too, and it has to be: zustand's hook hands the server
 * renderer the store's INITIAL state as its snapshot, so `setState` on the
 * real store would never reach a `renderToStaticMarkup` render. The door's
 * whole contract with the store is one selector, so the mock is one function
 * that runs the selector over a state this test owns.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const DIR = join(import.meta.dirname, '..');

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

/** How many times the page's module was evaluated. */
const evaluated = { count: 0 };

/** The one bit the door reads, owned here. */
const state = { overview: null as object | null };

vi.mock('../../state/store', () => ({
  useApp: (selector: (s: typeof state) => unknown) => selector(state)
}));

vi.mock('../OverviewLayer', () => {
  evaluated.count += 1;
  return {
    OverviewLayer: () =>
      React.createElement('div', { className: 'overview-layer', 'data-stub': '' })
  };
});

const { OverviewLayerLazy, preloadOverviewLayer } = await import('../lazy');

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the Catch Me Up page is a lazy door (Phase 165)', () => {
  beforeAll(() => {
    state.overview = null;
  });
  afterAll(() => {
    state.overview = null;
  });

  it('reaches the page through one dynamic import and no static one', () => {
    const src = readFileSync(join(DIR, 'lazy.tsx'), 'utf8');
    // The type position `typeof import('./OverviewLayer')` is not a fetch.
    const dynamic = src.match(/(?<!typeof )import\(\s*'\.\/OverviewLayer'\s*\)/g) ?? [];
    expect(dynamic).toHaveLength(1);
    expect(src).not.toMatch(/from\s+'\.\/OverviewLayer'/);
    // The door reads one bit from the store and nothing else in this folder,
    // so the door itself drags none of the page into the entry chunk.
    const statics = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(statics.sort()).toEqual(['../lazy/door', '../state/store', 'react']);
  });

  it('renders nothing and asks for nothing while the page is closed', () => {
    expect(state.overview).toBeNull();
    expect(renderToStaticMarkup(<OverviewLayerLazy />)).toBe('');
    expect(evaluated.count).toBe(0);
  });

  it('draws the page after the one fetch, then nothing again once closed', async () => {
    state.overview = {};
    // While the chunk is in flight the door draws null. The static renderer
    // runs no effects, so this render starts no fetch either.
    expect(renderToStaticMarkup(<OverviewLayerLazy />)).toBe('');
    expect(evaluated.count).toBe(0);
    await preloadOverviewLayer();
    await flush();
    expect(evaluated.count).toBe(1);
    const markup = renderToStaticMarkup(<OverviewLayerLazy />);
    expect(markup).toContain('class="overview-layer"');
    expect(markup).toContain('data-stub');
    // A second open fetches nothing.
    await preloadOverviewLayer();
    expect(evaluated.count).toBe(1);
    state.overview = null;
    expect(renderToStaticMarkup(<OverviewLayerLazy />)).toBe('');
  });

  it('names an export the real page module has', () => {
    // Read rather than imported: the real page reaches the real store, and
    // the store is mocked above for the reason the header gives.
    const page = readFileSync(join(DIR, 'OverviewLayer.tsx'), 'utf8');
    expect(page).toMatch(/export function OverviewLayer\(/);
  });
});
