/**
 * The drill's store record, its scoped reads and the pane's scoped faces
 * (Phase 161), tested where a screenshot cannot see them.
 *
 * What is here: the ladder's transitions and their pruning, the one read in
 * flight fold on the scoped reads, the pop to the whole map when the facts
 * move under a drilled part, the event fan out over held scopes, the scoped
 * strip's three faces, the membership filter the failure list scopes by, the
 * level 3 framing over Phase 64's own body, and the writing rules on every
 * new sentence. What is not here: the drawing of the scoped map, which is the
 * map suite's own, and the layout claims, which belong to the app run.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArchMapPartResult, ArchModuleFilesResult } from '../bridge';
import { mapPartAvailable } from '../bridge';
import { ArchModuleFilesBody } from '../ArchModules';
import { ScopedStrip, scopeVerdicts, scopedStripFace } from '../ArchView';
import type { ArchVerdict } from '@shared/arch';
import {
  ARCH_DRILL_CRUMB_LABEL,
  ARCH_DRILL_NO_BRIDGE,
  ARCH_DRILL_PART_ERROR,
  ARCH_DRILL_WHOLE,
  ARCH_SCOPED_LOADING,
  ARCH_SCOPED_NO_FAILURES,
  ARCH_SCOPED_NO_PROMISES
} from '../copy';
import {
  ARCH_MODULE_FILES_EMPTY,
  ARCH_MODULE_FILES_NOTE,
  ARCH_MODULE_FILES_TITLE
} from '../modules';
import {
  DRILL_HOME,
  drillPatch,
  moduleKey,
  partKey,
  useArch
} from '../store';
import type { ArchDrill } from '../store';

const REPO = '/Users/op/project';
const OTHER = '/Users/op/other';

function partPayload(over: Partial<ArchMapPartResult> = {}): ArchMapPartResult {
  return {
    cwd: REPO,
    groupId: 'src',
    groupDir: 'src',
    groupLabel: 'src',
    componentId: null,
    known: true,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    modules: [],
    edges: [],
    crossings: [],
    fileCount: 12,
    totalImports: 30,
    resolvedImports: 28,
    unresolvedImports: 2,
    contractPresent: true,
    counts: {
      checkedHold: 3,
      broke: 1,
      cannotCheck: 2,
      accepted: 0,
      unresolvedImports: 2,
      totalImports: 30
    },
    subjectIds: ['component:core', 'edge:core-ui'],
    ...over
  };
}

function modulesPayload(
  over: Partial<ArchModuleFilesResult> = {}
): ArchModuleFilesResult {
  return {
    cwd: REPO,
    dir: 'src/main',
    componentId: 'module:src/main',
    known: true,
    grade: 'boxes',
    fileCount: 2,
    edgeCount: 1,
    participants: 2,
    boxes: [
      { path: 'src/main/a.ts', language: 'typescript', broke: [] },
      { path: 'src/main/b.ts', language: 'typescript', broke: [] }
    ],
    matrix: null,
    top: null,
    unresolved: 0,
    totalImports: 3,
    unparsed: [],
    swiftFiles: 0,
    ...over
  };
}

function verdict(over: Partial<ArchVerdict>): ArchVerdict {
  return {
    subjectId: 'component:core',
    status: 'divergent',
    coverage: 'checked',
    checkedAtCommit: '0'.repeat(40),
    generation: 1,
    firstCheck: false,
    reason: null,
    durationMs: 0,
    ...over
  } as ArchVerdict;
}

function resetDrills(): void {
  useArch.setState({ drills: {}, partMaps: {}, moduleViews: {} });
}

describe('the ladder (store.ts)', () => {
  const mapPart = vi.fn(async () => partPayload());
  const moduleFiles = vi.fn(async () => modulesPayload());
  const realWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    mapPart.mockClear();
    moduleFiles.mockClear();
    mapPart.mockImplementation(async () => partPayload());
    moduleFiles.mockImplementation(async () => modulesPayload());
    (globalThis as { window?: unknown }).window = {
      gmux: {
        arch: { load: vi.fn(), map: vi.fn(), mapPart, moduleFiles }
      }
    };
    resetDrills();
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = realWindow as Window;
  });

  it('starts every repository at the whole map, as one frozen state', () => {
    expect(useArch.getState().drillFor(REPO)).toBe(DRILL_HOME);
    expect(Object.isFrozen(DRILL_HOME)).toBe(true);
    expect(DRILL_HOME.level).toBe(1);
  });

  it('drills into a part, and the scoped read is fired once', async () => {
    useArch.getState().drillInto(REPO, 'src', 'src');
    expect(useArch.getState().drillFor(REPO)).toEqual({
      level: 2,
      groupId: 'src',
      groupLabel: 'src'
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(mapPart).toHaveBeenCalledWith({ cwd: REPO, groupId: 'src' });
    expect(useArch.getState().partMapFor(REPO, 'src')?.status).toBe('ready');
  });

  it('climbs to level 3 and back down one rung at a time', async () => {
    useArch.getState().drillInto(REPO, 'src', 'src');
    useArch.getState().drillIntoModule(REPO, 'src/main', 'main');
    expect(useArch.getState().drillFor(REPO)).toEqual({
      level: 3,
      groupId: 'src',
      groupLabel: 'src',
      moduleDir: 'src/main',
      moduleLabel: 'main'
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(moduleFiles).toHaveBeenCalledWith({ cwd: REPO, dir: 'src/main' });
    useArch.getState().drillUp(REPO);
    expect(useArch.getState().drillFor(REPO).level).toBe(2);
    useArch.getState().drillUp(REPO);
    expect(useArch.getState().drillFor(REPO)).toBe(DRILL_HOME);
  });

  it('refuses a module drill from the whole map: a module belongs to a part', () => {
    useArch.getState().drillIntoModule(REPO, 'src/main', 'main');
    expect(useArch.getState().drillFor(REPO)).toBe(DRILL_HOME);
    expect(moduleFiles).not.toHaveBeenCalled();
  });

  it('keeps each repository on its own rung', () => {
    useArch.getState().drillInto(REPO, 'src', 'src');
    expect(useArch.getState().drillFor(OTHER)).toBe(DRILL_HOME);
    useArch.getState().drillHome(OTHER);
    expect(useArch.getState().drillFor(REPO).level).toBe(2);
  });

  it('folds a burst of scoped reads into one plus one queued follow up', async () => {
    let release: () => void = () => undefined;
    mapPart.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => {
            resolve(partPayload());
          };
        })
    );
    const first = useArch.getState().loadPartMap(REPO, 'src');
    void useArch.getState().loadPartMap(REPO, 'src');
    void useArch.getState().loadPartMap(REPO, 'src');
    expect(mapPart).toHaveBeenCalledTimes(1);
    mapPart.mockImplementation(async () => partPayload());
    release();
    await first;
    await new Promise((r) => setTimeout(r, 0));
    expect(mapPart).toHaveBeenCalledTimes(2);
    expect(useArch.getState().partMapFor(REPO, 'src')?.status).toBe('ready');
  });

  it('keeps the last good scoped picture through a failed re-read', async () => {
    await useArch.getState().loadPartMap(REPO, 'src');
    mapPart.mockImplementation(async () => {
      throw new Error('The database is busy.');
    });
    await useArch.getState().loadPartMap(REPO, 'src');
    const entry = useArch.getState().partMapFor(REPO, 'src');
    expect(entry?.status).toBe('error');
    expect(entry?.model?.groupId).toBe('src');
    expect(entry?.error).toBe('The database is busy.');
  });

  it('pops to the whole map when the drilled part left the partition', async () => {
    useArch.getState().drillInto(REPO, 'gone', 'gone');
    // Let the read the drill fired settle first, so the next one is not
    // queued behind it.
    await new Promise((r) => setTimeout(r, 0));
    mapPart.mockImplementation(async () =>
      partPayload({ groupId: 'gone', known: false })
    );
    await useArch.getState().loadPartMap(REPO, 'gone');
    expect(useArch.getState().drillFor(REPO)).toBe(DRILL_HOME);
  });

  it('says one sentence on a build with no scoped read, and hides the way in', async () => {
    (globalThis as { window?: unknown }).window = {
      gmux: { arch: { load: vi.fn(), map: vi.fn() } }
    };
    expect(mapPartAvailable()).toBe(false);
    await useArch.getState().loadPartMap(REPO, 'src');
    const entry = useArch.getState().partMapFor(REPO, 'src');
    expect(entry?.status).toBe('error');
    expect(entry?.error).toBe(ARCH_DRILL_NO_BRIDGE);
  });
});

describe('the pruning (drillPatch)', () => {
  const seed = {
    drills: {
      [REPO]: { level: 2, groupId: 'src', groupLabel: 'src' } as ArchDrill
    },
    partMaps: {
      [partKey(REPO, 'src')]: {
        status: 'ready',
        model: null,
        error: null
      } as const,
      [partKey(OTHER, 'lib')]: {
        status: 'ready',
        model: null,
        error: null
      } as const
    },
    moduleViews: {
      [moduleKey(REPO, 'src/main')]: {
        status: 'ready',
        result: null,
        error: null
      } as const
    }
  };

  it('going home lets the repository scopes go and keeps other repositories', () => {
    const next = drillPatch(seed, REPO, DRILL_HOME);
    expect(next.drills[REPO]).toBeUndefined();
    expect(next.partMaps[partKey(REPO, 'src')]).toBeUndefined();
    expect(next.partMaps[partKey(OTHER, 'lib')]).toBeDefined();
    expect(next.moduleViews[moduleKey(REPO, 'src/main')]).toBeUndefined();
  });

  it('stepping from level 3 to level 2 keeps the part and drops the module', () => {
    const at3 = drillPatch(seed, REPO, {
      level: 3,
      groupId: 'src',
      groupLabel: 'src',
      moduleDir: 'src/main',
      moduleLabel: 'main'
    });
    expect(at3.moduleViews[moduleKey(REPO, 'src/main')]).toBeDefined();
    const at2 = drillPatch(at3, REPO, {
      level: 2,
      groupId: 'src',
      groupLabel: 'src'
    });
    expect(at2.partMaps[partKey(REPO, 'src')]).toBeDefined();
    expect(at2.moduleViews[moduleKey(REPO, 'src/main')]).toBeUndefined();
  });

  it('switching parts drops the scope of the part being left', () => {
    const next = drillPatch(seed, REPO, {
      level: 2,
      groupId: 'renderer',
      groupLabel: 'renderer'
    });
    expect(next.partMaps[partKey(REPO, 'src')]).toBeUndefined();
  });

  it('keys can never fold two pairs together: NUL is not a path byte', () => {
    expect(partKey('/a', 'b')).not.toBe(partKey('/a/b', ''));
    expect(partKey(REPO, 'src')).toContain('\u0000');
    expect(moduleKey(REPO, 'src/main')).toContain('\u0000');
  });
});

describe('the event fan out (subscribeEvents)', () => {
  const realWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    (globalThis as { window?: unknown }).window = realWindow as Window;
    resetDrills();
  });

  it('a landed scan re-reads every held scope of that repository, no other', async () => {
    const mapPart = vi.fn(async () => partPayload());
    const moduleFiles = vi.fn(async () => modulesPayload());
    let fireMapUpdated: (e: {
      cwd: string;
      scannedAtCommit: string | null;
    }) => void = () => undefined;
    (globalThis as { window?: unknown }).window = {
      gmux: {
        arch: {
          load: vi.fn(),
          map: vi.fn(async () => partPayload()),
          mapPart,
          moduleFiles,
          onChecked: () => () => undefined,
          onProgress: () => () => undefined,
          onMapUpdated: (
            cb: (e: { cwd: string; scannedAtCommit: string | null }) => void
          ) => {
            fireMapUpdated = cb;
            return () => undefined;
          }
        }
      }
    };
    resetDrills();
    useArch.setState({
      partMaps: {
        [partKey(REPO, 'src')]: { status: 'ready', model: null, error: null },
        [partKey(OTHER, 'lib')]: { status: 'ready', model: null, error: null }
      },
      moduleViews: {
        [moduleKey(REPO, 'src/main')]: {
          status: 'ready',
          result: null,
          error: null
        }
      }
    });
    const off = useArch.getState().subscribeEvents();
    fireMapUpdated({ cwd: REPO, scannedAtCommit: null });
    await new Promise((r) => setTimeout(r, 0));
    expect(mapPart).toHaveBeenCalledTimes(1);
    expect(mapPart).toHaveBeenCalledWith({ cwd: REPO, groupId: 'src' });
    expect(moduleFiles).toHaveBeenCalledTimes(1);
    expect(moduleFiles).toHaveBeenCalledWith({ cwd: REPO, dir: 'src/main' });
    off();
  });
});

describe('the scoped faces (ArchView.tsx)', () => {
  it('filters by membership in the shipped id set, never a second arithmetic', () => {
    const rows = [
      verdict({ subjectId: 'component:core' }),
      verdict({ subjectId: 'component:ui' }),
      verdict({ subjectId: 'edge:core-ui' })
    ];
    expect(scopeVerdicts(rows, null)).toBe(rows);
    const scoped = scopeVerdicts(rows, ['component:core', 'edge:core-ui']);
    expect(scoped.map((v) => v.subjectId)).toEqual([
      'component:core',
      'edge:core-ui'
    ]);
  });

  it('wears loading, then the silent sentence, then the lanes', () => {
    expect(scopedStripFace({ label: 'src', model: null })).toBe('loading');
    expect(
      scopedStripFace({ label: 'src', model: partPayload({ subjectIds: [] }) })
    ).toBe('silent');
    expect(scopedStripFace({ label: 'src', model: partPayload() })).toBe(
      'lanes'
    );
  });

  it('the silent face is a sentence, never zero filled lanes', () => {
    const html = renderToStaticMarkup(
      createElement(ScopedStrip, {
        scoped: { label: 'src', model: partPayload({ subjectIds: [] }) }
      })
    );
    expect(html).toContain(ARCH_SCOPED_NO_PROMISES);
    expect(html).not.toContain('arch-lane-counts');
  });

  it('the lanes face draws the scoped counts and nothing repository wide', () => {
    const html = renderToStaticMarkup(
      createElement(ScopedStrip, {
        scoped: { label: 'src', model: partPayload() }
      })
    );
    expect(html).toContain('3 checked and');
    expect(html).toContain('arch-lane-counts');
    // The accepted list and the first check line are repository wide claims
    // and stay with the whole map's strip.
    expect(html).not.toContain('arch-accepted');
  });

  it('the loading face says the read is out rather than claiming anything', () => {
    const html = renderToStaticMarkup(
      createElement(ScopedStrip, { scoped: { label: 'src', model: null } })
    );
    expect(html).toContain(ARCH_SCOPED_LOADING);
  });
});

describe('level 3 framing (ArchModuleFilesBody)', () => {
  it('frames the Phase 64 body: the boxes draw unchanged inside it', () => {
    const html = renderToStaticMarkup(
      createElement(ArchModuleFilesBody, {
        cwd: REPO,
        label: 'main',
        entry: { status: 'ready', result: modulesPayload(), error: null },
        available: true
      })
    );
    expect(html).toContain(ARCH_MODULE_FILES_TITLE);
    expect(html).toContain(ARCH_MODULE_FILES_NOTE);
    expect(html).toContain('arch-modules-boxes');
    expect(html).toContain('a.ts');
  });

  it('an emptied module folder gets its own sentence, not the anchors one', () => {
    const html = renderToStaticMarkup(
      createElement(ArchModuleFilesBody, {
        cwd: REPO,
        label: 'main',
        entry: {
          status: 'ready',
          result: modulesPayload({ fileCount: 0, boxes: [] }),
          error: null
        },
        available: true
      })
    );
    expect(html).toContain(ARCH_MODULE_FILES_EMPTY);
    expect(html).not.toContain('this part anchors');
  });

  it('a failed read is named on screen, never a blank panel', () => {
    const html = renderToStaticMarkup(
      createElement(ArchModuleFilesBody, {
        cwd: REPO,
        label: 'main',
        entry: { status: 'error', result: null, error: 'It broke.' },
        available: true
      })
    );
    expect(html).toContain('It broke.');
  });
});

describe('the writing rules', () => {
  it('uses no em dash and no en dash in any new sentence', () => {
    const sentences = [
      ARCH_DRILL_CRUMB_LABEL,
      ARCH_DRILL_NO_BRIDGE,
      ARCH_DRILL_PART_ERROR,
      ARCH_DRILL_WHOLE,
      ARCH_SCOPED_LOADING,
      ARCH_SCOPED_NO_FAILURES,
      ARCH_SCOPED_NO_PROMISES,
      ARCH_MODULE_FILES_EMPTY,
      ARCH_MODULE_FILES_NOTE,
      ARCH_MODULE_FILES_TITLE
    ];
    for (const sentence of sentences) {
      expect(sentence).not.toMatch(/[–—]/);
    }
  });

  it('never says a tmux word on the drill surfaces', () => {
    const sentences = [
      ARCH_SCOPED_NO_PROMISES,
      ARCH_SCOPED_NO_FAILURES,
      ARCH_MODULE_FILES_NOTE
    ];
    for (const sentence of sentences) {
      expect(sentence).not.toMatch(/\b(pane|window|prefix)\b/i);
    }
  });
});
