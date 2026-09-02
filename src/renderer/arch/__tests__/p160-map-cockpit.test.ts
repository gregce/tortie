/**
 * The cockpit's map slice and the adapter seam (Phase 160), tested where a
 * screenshot cannot see them.
 *
 * What is here: the store's one-read-in-flight rule with its queued follow
 * up, the last-good-picture rule on a failed re-read, the adapter's three
 * decisions (the honest grey, the overlay flag, the verdict carrying), and
 * the writing rules on every new sentence. What is not here: the drawing
 * itself, which is `./map/`'s own suite, and the layout claims, which belong
 * to the shot probe because reading CSS is not seeing it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArchMapResult } from '../bridge';
import { ArchMapTabBody } from '../ArchMapTab';
import { importsUnknown, toMapModel } from '../map-model';
import {
  ARCH_COMPONENTS_TITLE,
  ARCH_CONTRACT_OFFER_TITLE,
  ARCH_MODEL_NONE,
  ARCH_REPO_LINE_TITLE,
  ARCH_MAP_EMPTY_REPO,
  ARCH_MAP_ERROR,
  ARCH_MAP_FLAT_REPO,
  ARCH_MAP_LOADING,
  ARCH_MAP_NO_BRIDGE,
  ARCH_MAP_OPEN_BODY,
  ARCH_MAP_OPEN_TITLE,
  ARCH_MAP_STALE
} from '../copy';
import { useArch } from '../store';

const REPO = '/Users/op/project';

function payload(over: Partial<ArchMapResult> = {}): ArchMapResult {
  return {
    cwd: REPO,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    subject: 'project',
    sentence: 'project: 9 files, TypeScript; 2 parts.',
    groups: [
      {
        id: 'src',
        dir: 'src',
        label: 'src',
        componentId: null,
        description: null,
        band: 'engine',
        provenance: 'first-party',
        fileCount: 100,
        totalImports: 50,
        resolvedImports: 40,
        externalImports: 5,
        unresolvedImports: 5,
        languages: [],
        lines: 0,
        entries: [],
        sentence: '',
        facts: []
      },
      {
        id: 'vendor',
        dir: 'vendor',
        label: 'Vendored blobs',
        componentId: 'vendored-things',
        description: 'Holds the code we copied in on purpose.',
        band: 'foundation',
        provenance: 'vendored',
        fileCount: 10,
        totalImports: 8,
        resolvedImports: 0,
        externalImports: 0,
        unresolvedImports: 8,
        languages: [],
        lines: 0,
        entries: [],
        sentence: '',
        facts: []
      }
    ],
    edges: [
      { from: 'src', to: 'vendor', count: 9, status: 'divergent', edgeId: 'e1' },
      { from: 'vendor', to: 'src', count: 1, status: null, edgeId: null }
    ],
    fileCount: 110,
    totalImports: 58,
    resolvedImports: 40,
    unresolvedImports: 13,
    contractPresent: true,
    ...over
  };
}

describe('the adapter (map-model.ts)', () => {
  it('marks a part grey only when it has imports and not one was followed', () => {
    expect(importsUnknown({ totalImports: 8, unresolvedImports: 8 })).toBe(true);
    // Some imports resolved: real edges, normal face.
    expect(importsUnknown({ totalImports: 50, unresolvedImports: 5 })).toBe(
      false
    );
    // No imports at all is quiet, never unknown.
    expect(importsUnknown({ totalImports: 0, unresolvedImports: 0 })).toBe(
      false
    );
  });

  it('carries the overlay as a flag and the label as given', () => {
    const model = toMapModel(payload());
    expect(model.groups[0]?.overlaid).toBe(false);
    expect(model.groups[1]?.overlaid).toBe(true);
    expect(model.groups[1]?.label).toBe('Vendored blobs');
    // The machine identity survives the overlay, which is what the drill
    // and the payload key on.
    expect(model.groups[1]?.id).toBe('vendor');
    // Phase 158: the purpose sentence travels to the drawing, so the hover
    // can say what a part is FOR, and a computed box carries none.
    expect(model.groups[1]?.description).toBe(
      'Holds the code we copied in on purpose.'
    );
    expect(model.groups[0]?.description).toBeNull();
  });

  it('puts a verdict on a judged edge and none on a computed one', () => {
    const model = toMapModel(payload());
    expect(model.edges[0]?.verdict).toBe('divergent');
    expect('verdict' in (model.edges[1] ?? {})).toBe(false);
  });

  it('is deterministic: the same payload adapts to the same bytes', () => {
    expect(JSON.stringify(toMapModel(payload()))).toBe(
      JSON.stringify(toMapModel(payload()))
    );
  });
});

describe('the map slice (store.ts)', () => {
  const map = vi.fn(async () => payload());
  const realWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    map.mockClear();
    map.mockImplementation(async () => payload());
    (globalThis as { window?: unknown }).window = {
      gmux: {
        arch: {
          load: vi.fn(),
          map
        }
      }
    };
    useArch.setState({ maps: {} });
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = realWindow as Window;
  });

  it('reads a model and holds it keyed by repository', async () => {
    await useArch.getState().loadMap(REPO);
    const entry = useArch.getState().mapFor(REPO);
    expect(entry?.status).toBe('ready');
    expect(entry?.model?.groups.length).toBe(2);
    expect(map).toHaveBeenCalledWith({ cwd: REPO });
  });

  it('keeps the last good picture when a re-read fails, and names the failure', async () => {
    await useArch.getState().loadMap(REPO);
    map.mockImplementation(async () => {
      throw new Error('The database is busy.');
    });
    await useArch.getState().loadMap(REPO);
    const entry = useArch.getState().mapFor(REPO);
    expect(entry?.status).toBe('error');
    expect(entry?.model?.groups.length).toBe(2);
    expect(entry?.error).toBe('The database is busy.');
  });

  it('folds a burst into one read plus one queued follow up', async () => {
    let release: () => void = () => undefined;
    map.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(payload());
        })
    );
    const first = useArch.getState().loadMap(REPO);
    // Three pushes land while the read is out. They must not stack three
    // more reads, and they must not be dropped either: the facts may have
    // moved after the first read was answered.
    void useArch.getState().loadMap(REPO);
    void useArch.getState().loadMap(REPO);
    void useArch.getState().loadMap(REPO);
    expect(map).toHaveBeenCalledTimes(1);
    map.mockImplementation(async () => payload());
    release();
    await first;
    await new Promise((r) => setTimeout(r, 0));
    expect(map).toHaveBeenCalledTimes(2);
    expect(useArch.getState().mapFor(REPO)?.status).toBe('ready');
  });

  it('says one sentence on a build with no map channel', async () => {
    (globalThis as { window?: unknown }).window = {
      gmux: { arch: { load: vi.fn() } }
    };
    await useArch.getState().loadMap(REPO);
    const entry = useArch.getState().mapFor(REPO);
    expect(entry?.status).toBe('error');
    expect(entry?.error).toBe(ARCH_MAP_NO_BRIDGE);
  });
});

describe('the empty faces (Phase 160 fix round)', () => {
  /**
   * The fix round measured a one file repository whose whole tree sits at the
   * root: the model reports groups 0 and fileCount 1, and the tab used to say
   * no tracked source files were found, which is false. The sentence now
   * splits on whether tracked files exist at all.
   */
  function seeded(model: ArchMapResult): string {
    return renderToStaticMarkup(
      createElement(ArchMapTabBody, {
        entry: { status: 'ready', model, error: null },
        progress: null
      })
    );
  }

  it('a flat repository with tracked files is told the truth, not that none exist', () => {
    const html = seeded(
      payload({
        groups: [],
        edges: [],
        fileCount: 1,
        totalImports: 0,
        resolvedImports: 0,
        unresolvedImports: 0,
        contractPresent: false
      })
    );
    expect(html).toContain(ARCH_MAP_FLAT_REPO);
    expect(html).not.toContain(ARCH_MAP_EMPTY_REPO);
  });

  it('a repository with no tracked files at all keeps the no-files sentence', () => {
    const html = seeded(
      payload({
        groups: [],
        edges: [],
        fileCount: 0,
        totalImports: 0,
        resolvedImports: 0,
        unresolvedImports: 0,
        contractPresent: false,
        // An empty repository has no HEAD to scan at, and its stamp still
        // lands, so the tab settles on a sentence rather than a spinner.
        scannedAtCommit: null
      })
    );
    expect(html).toContain(ARCH_MAP_EMPTY_REPO);
    expect(html).not.toContain(ARCH_MAP_FLAT_REPO);
    expect(html).not.toContain(ARCH_MAP_LOADING);
  });
});

describe('the writing rules', () => {
  it('uses no em dash and no en dash in any new sentence', () => {
    const sentences = [
      ARCH_COMPONENTS_TITLE,
      ARCH_CONTRACT_OFFER_TITLE,
      ARCH_MODEL_NONE,
      ARCH_REPO_LINE_TITLE,
      ARCH_MAP_EMPTY_REPO,
      ARCH_MAP_ERROR,
      ARCH_MAP_FLAT_REPO,
      ARCH_MAP_LOADING,
      ARCH_MAP_NO_BRIDGE,
      ARCH_MAP_OPEN_BODY,
      ARCH_MAP_OPEN_TITLE,
      ARCH_MAP_STALE
    ];
    for (const s of sentences) {
      expect(s).not.toMatch(/[–—]/);
    }
  });
});
