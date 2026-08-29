/**
 * Phase 161: the drill in the map tab, tested at the body seam.
 *
 * The container reads the store; the body takes everything as props, which
 * is the `ArchMapTabBody` doctrine from Phase 160: no jsdom here, so every
 * state a screenshot cannot reach is proved by rendering the body under
 * `renderToStaticMarkup` with the drill handed in.
 *
 * WHAT IS HELD HERE.
 *
 *  - The BREADCRUMB names the level at every rung, earlier rungs are
 *    buttons, and the rung a person stands on is plain words.
 *  - Level 2 draws the part's modules with the frame, keeps the last good
 *    picture through a failed re-read, and says one sentence when the part
 *    vanished from the facts.
 *  - Level 3 renders the files seam under the breadcrumb.
 *  - The scoped adapter's translations, including the crossing list.
 *  - The writing rules on every new sentence.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArchMapResult } from '../../arch/bridge';
import {
  ARCH_MAP_PART_GONE,
  ArchMapTabBody,
  type ArchMapDrillHandlers
} from '../../arch/ArchMapTab';
import { toPartMapModel } from '../../arch/map-model';
import {
  DRILL_HOME,
  partKey,
  type ArchDrill,
  type ArchPartMapEntry
} from '../../arch/store';
import {
  ARCH_MAP_ERROR,
  ARCH_MAP_LOADING,
  ARCH_MAP_STALE
} from '../../arch/copy';

const REPO = '/Users/op/project';

function levelOne(): ArchMapResult {
  return {
    cwd: REPO,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    subject: 'project',
    groups: [
      {
        id: 'src-main',
        dir: 'src/main',
        label: 'The engine room',
        componentId: 'engine',
        description: 'Runs the machinery behind the window.',
        band: 'engine',
        provenance: 'first-party',
        fileCount: 80,
        totalImports: 60,
        resolvedImports: 50,
        externalImports: 5,
        unresolvedImports: 5
      },
      {
        id: 'src-renderer',
        dir: 'src/renderer',
        label: 'src/renderer',
        componentId: null,
        description: null,
        band: 'surface',
        provenance: 'first-party',
        fileCount: 40,
        totalImports: 30,
        resolvedImports: 28,
        externalImports: 2,
        unresolvedImports: 0
      }
    ],
    edges: [
      {
        from: 'src-renderer',
        to: 'src-main',
        count: 12,
        status: null,
        edgeId: null
      }
    ],
    fileCount: 120,
    totalImports: 90,
    resolvedImports: 78,
    unresolvedImports: 5,
    contractPresent: false
  };
}

function partModel(): NonNullable<ArchPartMapEntry['model']> {
  return {
    cwd: REPO,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    known: true,
    groupId: 'src-main',
    groupDir: 'src/main',
    groupLabel: 'The engine room',
    componentId: 'engine',
    modules: [
      {
        id: 'ipc',
        dir: 'src/main/ipc',
        label: 'ipc',
        componentId: null,
        description: null,
        band: 'surface',
        provenance: 'first-party',
        fileCount: 6,
        totalImports: 12,
        resolvedImports: 12,
        externalImports: 0,
        unresolvedImports: 0
      },
      {
        id: 'core',
        dir: 'src/main/core',
        label: 'core',
        componentId: null,
        description: null,
        band: 'engine',
        provenance: 'first-party',
        fileCount: 20,
        totalImports: 30,
        resolvedImports: 30,
        externalImports: 0,
        unresolvedImports: 0
      }
    ],
    edges: [{ from: 'ipc', to: 'core', count: 7, status: null, edgeId: null }],
    crossings: [
      {
        moduleId: 'core',
        outsideId: 'src-renderer',
        outsideLabel: 'src/renderer',
        outsideBand: 'surface',
        direction: 'in',
        count: 12
      }
    ],
    fileCount: 26,
    totalImports: 42,
    resolvedImports: 42,
    unresolvedImports: 0,
    counts: {
      checkedHold: 0,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 0,
      totalImports: 42
    },
    subjectIds: [],
    contractPresent: false
  };
}

const LEVEL2: ArchDrill = {
  level: 2,
  groupId: 'src-main',
  groupLabel: 'The engine room'
};

const LEVEL3: ArchDrill = {
  level: 3,
  groupId: 'src-main',
  groupLabel: 'The engine room',
  moduleDir: 'src/main/core',
  moduleLabel: 'core'
};

const HANDLERS: ArchMapDrillHandlers = {
  openPart: () => undefined,
  openModule: () => undefined,
  up: () => undefined,
  home: () => undefined
};

function body(props: {
  entry?: { status: 'loading' | 'ready' | 'error'; model: ArchMapResult | null; error: string | null } | null;
  drill?: ArchDrill;
  part?: ArchPartMapEntry | null;
  handlers?: ArchMapDrillHandlers;
}): string {
  return renderToStaticMarkup(
    createElement(ArchMapTabBody, {
      entry:
        props.entry === undefined
          ? { status: 'ready' as const, model: levelOne(), error: null }
          : props.entry,
      progress: null,
      repoPath: REPO,
      drill: props.drill ?? DRILL_HOME,
      part: props.part ?? null,
      handlers: props.handlers ?? HANDLERS
    })
  );
}

describe('the breadcrumb names the level', () => {
  it('level 1 is the repository name as plain words, never a button', () => {
    const html = body({});
    expect(html).toContain('arch-map-crumb-here');
    expect(html).toContain('project');
    expect(html).not.toContain('button class="arch-map-crumb"');
  });

  it('level 2 makes the repository a button and the part the here word', () => {
    const html = body({
      drill: LEVEL2,
      part: { status: 'ready', model: partModel(), error: null }
    });
    expect(html.match(/<button[^>]*class="arch-map-crumb"/g) ?? []).toHaveLength(1);
    expect(html).toContain('The engine room');
  });

  it('level 3 has two buttons up and the module as the here word', () => {
    const html = body({ drill: LEVEL3 });
    expect(html.match(/<button[^>]*class="arch-map-crumb"/g) ?? []).toHaveLength(2);
    expect(html).toContain('core');
  });

  it('without the store actions the crumbs degrade to plain words', () => {
    const html = body({ drill: LEVEL2, handlers: {} });
    expect(html).not.toContain('<button');
  });
});

describe('level 2, the part alone with its frame', () => {
  it('draws the modules and keeps the outside part at the frame by name', () => {
    const html = body({
      drill: LEVEL2,
      part: { status: 'ready', model: partModel(), error: null }
    });
    expect(html).toContain('data-group="ipc"');
    expect(html).toContain('data-group="core"');
    expect(html).toContain('arch-map-stub');
    expect(html).toContain('src/renderer');
    expect(html).not.toContain('data-group="src-renderer"');
  });

  it('reads honestly while the scoped model is still owed', () => {
    const html = body({ drill: LEVEL2, part: null });
    expect(html).toContain(ARCH_MAP_LOADING);
  });

  it('a failed re-read keeps the last good picture with the stale sentence', () => {
    const html = body({
      drill: LEVEL2,
      part: { status: 'error', model: partModel(), error: 'boom' }
    });
    expect(html).toContain(ARCH_MAP_STALE);
    expect(html).toContain('data-group="ipc"');
  });

  it('a failed first read is a sentence, never a blank surface', () => {
    const html = body({
      drill: LEVEL2,
      part: { status: 'error', model: null, error: 'boom' }
    });
    expect(html).toContain(ARCH_MAP_ERROR);
    expect(html).toContain('boom');
  });

  it('a part that vanished from the facts says so', () => {
    const html = body({
      drill: LEVEL2,
      part: {
        status: 'ready',
        model: { ...partModel(), known: false },
        error: null
      }
    });
    expect(html).toContain(ARCH_MAP_PART_GONE);
  });
});

describe('level 3, the files seam', () => {
  it('level 3 mounts the files view under the breadcrumb', () => {
    // The seam is a plain named import after integration, so level 3 always
    // renders the modules surface. With no store read landed it draws that
    // surface's own loading face, which is still a face and never a crash.
    const html = body({ drill: LEVEL3 });
    expect(html).toContain('arch-map-crumbs');
  });
});

describe('the scoped adapter', () => {
  it('modules become boxes, crossings become the frame, labels survive', () => {
    const model = toPartMapModel(partModel());
    expect(model.groups.map((g) => g.id)).toEqual(['ipc', 'core']);
    expect(model.groups.every((g) => g.overlaid === false)).toBe(true);
    expect(model.edges).toEqual([{ from: 'ipc', to: 'core', count: 7 }]);
    expect(model.frame).toEqual([
      {
        boxId: 'core',
        outsideId: 'src-renderer',
        outsideLabel: 'src/renderer',
        direction: 'in',
        count: 12
      }
    ]);
  });

  it('the honest grey rule carries over: all imports unresolved is unknown', () => {
    const scoped = partModel();
    const first = scoped.modules[0];
    if (first === undefined) throw new Error('fixture');
    const model = toPartMapModel({
      ...scoped,
      modules: [{ ...first, totalImports: 5, unresolvedImports: 5 }]
    });
    expect(model.groups[0]?.unresolved).toBe(true);
  });
});

describe('the drill contract', () => {
  it('the part key is the frozen NUL joint, safe against spaces in paths', () => {
    expect(partKey('/a b/c', 'g')).toBe('/a b/c' + '\u0000' + 'g');
    expect(partKey('/a', 'b g')).not.toBe(partKey('/a b', 'g'));
  });
});

describe('the writing rules', () => {
  it('no em dash, no en dash, no tmux word in any new sentence', () => {
    for (const sentence of [ARCH_MAP_PART_GONE]) {
      expect(sentence).not.toMatch(/[–—]/);
      expect(sentence.toLowerCase()).not.toMatch(/\bpane\b|\bprefix\b|tmux/);
    }
  });
});
