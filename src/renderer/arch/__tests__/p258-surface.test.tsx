/**
 * The reading surface (Phase 258): the rung table, the inspector, the
 * surfaces list, the gates worksheet, the inner tab row, the sidebar chip
 * and its eleventh hover line, the store's selection and inner tab, and the
 * writing rules on every new sentence. Rendered to static markup over
 * seeded props, the shape every suite in this folder uses; the app run is
 * `build/p258/probe-p258-surface.mjs`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARCH_EVIDENCE_RUNGS } from '@shared/arch';
import type { ArchMapGroup, ArchMapRegion, ArchMapResult } from '../bridge';
import { ArchInspector, kindPhrase, reachesPhrase } from '../ArchInspector';
import { ArchSurfaces, surfaceRegions } from '../ArchSurfaces';
import { ArchGates, gateCounts, gateScopes } from '../ArchGates';
import { FactRows } from '../ArchFactRows';
import { InnerTabs } from '../ArchMapTab';
import { ReadingFace, hoverLines } from '../ArchDrill';
import { startsOf, toMapModel } from '../map-model';
import {
  RUNG_FACES,
  RUNG_NO_SEEDS,
  RUNG_TONE_TOKEN,
  isRung,
  rungCountsLine,
  rungFace,
  rungShortLine
} from '../rung';
import {
  ARCH_FACTS_TRUNCATED,
  ARCH_GATES_NAME_ONE,
  ARCH_GATES_WHOLE,
  ARCH_INSPECT_NONE,
  ARCH_INSPECT_NO_SURFACE,
  ARCH_MAP_VIEW_LABEL,
  ARCH_OUTSIDE_EMPTY,
  ARCH_SURFACE_KINDS,
  ARCH_TAB_GATES,
  ARCH_TAB_MAP,
  ARCH_TAB_SURFACES,
  archGatesAnswer,
  archGatesBreakdown,
  archKindWord,
  archRegionDenominator,
  archZeroSurfaceTitle
} from '../copy';
import { factsKey, useArch } from '../store';
import { archStartsLine } from '@shared/ipc';

const REPO = '/Users/op/project';

function group(over: Partial<ArchMapGroup> & Pick<ArchMapGroup, 'id'>): ArchMapGroup {
  return {
    dir: over.id,
    label: over.id,
    componentId: null,
    description: null,
    band: 'engine',
    provenance: 'first-party',
    fileCount: 10,
    totalImports: 0,
    resolvedImports: 0,
    externalImports: 0,
    unresolvedImports: 0,
    languages: [],
    lines: 100,
    entries: [],
    sentence: '10 files, TypeScript; no imports either way.',
    facts: ['Size: 10 files, 100 lines', 'Languages: TypeScript'],
    rung: { rung: 'composed', anchors: 1, parsed: 1, reached: 0, tested: 0, seeds: 0 },
    regionId: 'unit:',
    counts: { surface: {}, store: {}, effect: {}, network: {}, gate: {} },
    ...over
  };
}

const counts = (over: Partial<NonNullable<ArchMapGroup['counts']>> = {}): NonNullable<ArchMapGroup['counts']> => ({
  surface: { 'ipc-channel': 229, 'http-route': 0, 'cli-command': 0, 'cli-flag': 0, job: 6, port: 0 },
  store: { 'store-write': 12, 'store-def': 0, migration: 3 },
  effect: { spawn: 30, 'fs-write': 0 },
  network: { client: 5, listen: 2 },
  gate: { auth: 0, flag: 3, refusal: 9, guard: 2 },
  ...over
});

const rung = (word: string, reached = 583, tested = 395, seeds = 3) => ({
  rung: word as 'tested',
  anchors: 1068,
  parsed: 1068,
  reached,
  tested,
  seeds
});

const region = (over: Partial<ArchMapRegion> = {}): ArchMapRegion => ({
  id: 'unit:',
  kind: 'unit',
  label: 'tortie',
  sub: 'the one thing this repository builds',
  dir: '',
  groupIds: ['src-main', 'src-shared'],
  starts: [
    { kind: 'worker', label: 'worker', file: 'src/main/symbols/pool.ts', line: 171 },
    { kind: 'worker', label: 'worker', file: 'src/main/symbols/pool.ts', line: 180 }
  ],
  files: 3330,
  parsed: 2639,
  ...over
});

function model(over: Partial<ArchMapResult> = {}): ArchMapResult {
  return {
    cwd: REPO,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    scanIncomplete: null,
    subject: 'tortie',
    sentence: '3,330 files, TypeScript; 2 parts.',
    groups: [
      group({ id: 'src-main', dir: 'src/main', label: 'src/main', fileCount: 1068, rung: rung('tested'), regionId: 'unit:', counts: counts() }),
      group({
        id: 'src-shared',
        dir: 'src/shared',
        label: 'src/shared',
        fileCount: 99,
        rung: rung('composed', 0, 39, 0),
        regionId: 'unit:',
        counts: counts({ surface: { 'ipc-channel': 0, 'http-route': 0, 'cli-command': 0, 'cli-flag': 0, job: 0, port: 0 }, gate: { auth: 0, flag: 0, refusal: 0, guard: 0 } })
      })
    ],
    edges: [],
    fileCount: 3330,
    totalImports: 10,
    resolvedImports: 9,
    unresolvedImports: 1,
    contractPresent: false,
    regions: [region(), region({ id: 'outside', kind: 'outside', label: 'Outside this repository', sub: 'programs and hosts it reaches', dir: null, groupIds: [], starts: [], files: 0, parsed: 0 })],
    transports: [
      { from: 'unit:', to: 'outside', kind: 'spawns', count: 30 },
      { from: 'unit:', to: 'outside', kind: 'reaches', count: 0 }
    ],
    componentRungs: {},
    oneThing: true,
    ...over
  };
}

const words = (s: string): number => s.split(/\s+/).filter((w) => w.length > 0).length;

describe('the rung table', () => {
  it('has five faces, one per rung, each a glyph, a word, one sentence of at most eleven words', () => {
    expect(ARCH_EVIDENCE_RUNGS).toEqual(['off-repo', 'declared', 'composed', 'reached', 'tested']);
    for (const r of ARCH_EVIDENCE_RUNGS) {
      const face = RUNG_FACES[r];
      expect(face.icon.length).toBeGreaterThan(0);
      expect(face.word.length).toBeGreaterThan(0);
      expect(words(face.sentence), r).toBeLessThanOrEqual(11);
      expect(face.sentence).not.toMatch(/[–—]/);
    }
    expect(new Set(Object.values(RUNG_FACES).map((f) => f.icon)).size).toBe(5);
  });

  it('spends exactly two existing tokens and no amber', () => {
    expect(Object.values(RUNG_TONE_TOKEN)).toEqual(['--status-idle', '--success']);
    expect(RUNG_FACES['off-repo'].tone).toBe('quiet');
    expect(RUNG_FACES.declared.tone).toBe('quiet');
    expect(RUNG_FACES.composed.tone).toBe('quiet');
    expect(RUNG_FACES.reached.tone).toBe('reached');
    expect(RUNG_FACES.tested.tone).toBe('reached');
  });

  it('refuses a sixth word by drawing nothing, never by guessing', () => {
    expect(isRung('accepted-live')).toBe(false);
    expect(rungFace('accepted-live')).toBeNull();
    expect(rungFace('tested')).toBe(RUNG_FACES.tested);
  });

  it('says the counts with their denominators, and the no-seeds sentence at zero seeds', () => {
    expect(rungCountsLine(rung('tested'))).toBe('reached 583 of 1,068 parsed · 395 imported by a test · 3 seeds');
    expect(rungCountsLine(rung('composed', 0, 336, 0))).toBe(`reached 0 of 1,068 parsed · 336 imported by a test · ${RUNG_NO_SEEDS}`);
    expect(rungShortLine(rung('tested', 1, 1, 1))).toBe('reached 1 of 1,068 · 1 seed');
  });
});

describe('the inspector', () => {
  it('says one line with nothing selected', () => {
    const html = renderToStaticMarkup(
      createElement(ArchInspector, { repoKey: REPO, group: null, region: null, scope: null, onOpen: null, onGates: null })
    );
    expect(html).toContain(ARCH_INSPECT_NONE);
    expect(html).not.toContain('data-field');
  });

  it('draws the header and the seven computed rows for a selected part', () => {
    const m = model();
    const html = renderToStaticMarkup(
      createElement(ArchInspector, {
        repoKey: REPO,
        group: m.groups[0]!,
        region: m.regions![0]!,
        scope: 'src-main',
        onOpen: () => undefined,
        onGates: () => undefined
      })
    );
    expect(html).toContain('data-group="src-main"');
    expect(html).toContain('>src/main<');
    expect(html).toContain('>tortie<');
    expect(html).toContain('data-rung="tested"');
    expect(html).toContain('>tested<');
    expect(html).toContain('1,068 files, 1,068 parsed');
    expect(html).toContain('>Open<');
    for (const field of ['runs-in', 'exposes', 'keeps', 'reaches', 'guards', 'tests', 'rung']) {
      expect(html).toContain(`data-field="${field}"`);
    }
    expect(html).toContain('tortie · the one thing this repository builds');
    expect(html).toContain('229 IPC channels, 6 jobs');
    expect(html).toContain('12 store writes, 3 migrations');
    expect(html).toContain('30 spawns, 5 network reaches, 2 listens');
    expect(html).toContain('>14 gates<');
    expect(html).toContain('395 of 1,068 parsed files imported by a test');
    expect(html).toContain(RUNG_FACES.tested.sentence);
    expect(html).toContain('reached 583 of 1,068 · 3 seeds');
    // Four disclosures, closed, and nothing fetched: no rows in the markup.
    expect((html.match(/arch-facts-toggle/g) ?? []).length).toBe(4);
    expect(html).not.toContain('arch-fact-row');
    // The model fields are NOT drawn.
    for (const absent of ['Receives', 'Returns', 'Where it stops']) {
      expect(html).not.toContain(absent);
    }
  });

  it('says nothing at zero, and the reader sentence for a surface count of zero', () => {
    const m = model();
    const html = renderToStaticMarkup(
      createElement(ArchInspector, { repoKey: REPO, group: m.groups[1]!, region: m.regions![0]!, scope: 'src-shared', onOpen: null, onGates: null })
    );
    expect(html).toContain(ARCH_INSPECT_NO_SURFACE);
    expect(html).toContain('>0 gates<');
    expect(html).toContain(RUNG_NO_SEEDS);
    // A zero field carries no disclosure.
    expect((html.match(/arch-facts-toggle/g) ?? []).length).toBe(2);
  });

  it('phrases kinds in the fixed order with the count inside the words', () => {
    expect(kindPhrase('surface', { job: 1, 'ipc-channel': 2 })).toBe('2 IPC channels, 1 job');
    expect(kindPhrase('store', {})).toBeNull();
    expect(reachesPhrase(model().groups[1]!)).toBe('30 spawns, 5 network reaches, 2 listens');
    expect(archKindWord('gate', 'refusal', 1)).toBe('refusal');
    expect(archKindWord('gate', 'unknown-kind', 2)).toBe('unknown-kind');
  });
});

describe('the surfaces list', () => {
  it('groups by region with the denominator, and draws every zero in the muted class', () => {
    const html = renderToStaticMarkup(createElement(ArchSurfaces, { repoKey: REPO, model: model() }));
    expect(html).toContain('data-region="unit:"');
    expect(html).not.toContain('data-region="outside"');
    expect(html).toContain('read 2,639 of 3,330 files');
    for (const g of ['src-main', 'src-shared']) {
      const row = html.slice(html.indexOf(`data-group="${g}"`));
      for (const k of ARCH_SURFACE_KINDS) {
        expect(row).toContain(`data-kind="${k.kind}"`);
      }
    }
    // src/main: two counts, four zeros; src/shared: six zeros. Ten zeros, all muted.
    expect((html.match(/arch-surfaces-kind zero/g) ?? []).length).toBe(10);
    expect(html).toContain('IPC channels 229');
    expect(html).toContain('flags 0');
    expect(html).toContain(`title="${archZeroSurfaceTitle('flags')}"`);
    // A count is a button; a zero is not.
    expect(html).toContain('<button type="button" class="arch-surfaces-kind" data-kind="ipc-channel" data-count="229"');
    expect(html).not.toContain('<button type="button" class="arch-surfaces-kind zero"');
    expect(html).toContain('data-rung="tested"');
  });

  it('a regionless model lists every box under one unnamed group', () => {
    const m = model({ regions: undefined, transports: undefined });
    expect(surfaceRegions(m)).toHaveLength(1);
    expect(surfaceRegions(m)[0]?.region).toBeNull();
    expect(archRegionDenominator(5, 10, 1, 0)).toBe('read 5 of 10 files · 1 vendored · 0 truncated');
    expect(archRegionDenominator(5, 10, undefined, undefined)).toBe('read 5 of 10 files');
  });
});

describe('the gates worksheet', () => {
  afterEach(() => {
    useArch.setState({ facts: {} });
  });

  it('offers the whole repository, then each region, then each box in map order', () => {
    expect(gateScopes(model()).map((s) => s.value)).toEqual(['', 'unit:', 'src-main', 'src-shared']);
    expect(gateScopes(model())[0]?.name).toBe(ARCH_GATES_WHOLE);
  });

  it('rests as the select and the four labels, with nothing named and nothing fetched', () => {
    const html = renderToStaticMarkup(createElement(ArchGates, { repoKey: REPO, model: model() }));
    expect(html).toContain(ARCH_GATES_NAME_ONE);
    for (const k of ['auth', 'flag', 'refusal', 'guard']) {
      expect(html).toContain(`data-kind="${k}"`);
    }
    expect((html.match(/type="checkbox" checked/g) ?? []).length).toBe(4);
    expect(html).not.toContain('arch-gates-answer');
    expect(html).not.toContain('arch-fact-row');
    expect(words(html.replace(/<[^>]*>/g, ' '))).toBeLessThanOrEqual(30);
  });

  it('answers a named part from the held rows, with both denominators', () => {
    useArch.setState({
      facts: {
        [factsKey(REPO, 'src-main', ['gate'])]: {
          status: 'ready',
          error: null,
          result: {
            cwd: REPO,
            scope: 'src-main',
            truncated: false,
            files: 1068,
            parsed: 1068,
            rows: [
              { category: 'gate', kind: 'refusal', subject: 'refuses a bare name', line: 12, rule: 'gate.refusal', evidence: 'throw new Error', file: 'src/main/a.ts', viaWrapper: false },
              { category: 'gate', kind: 'flag', subject: 'feature flag', line: 3, rule: 'gate.flag', evidence: 'if (flag)', file: 'src/main/b.ts', viaWrapper: false }
            ]
          }
        },
        [factsKey(REPO, null, ['gate'])]: {
          status: 'ready',
          error: null,
          result: { cwd: REPO, scope: null, truncated: false, files: 3330, parsed: 2639, rows: new Array(820).fill({ category: 'gate', kind: 'guard', subject: 's', line: 1, rule: 'r', evidence: 'e', file: 'f', viaWrapper: false }) }
        }
      }
    });
    const html = renderToStaticMarkup(
      createElement(ArchGates, { repoKey: REPO, model: model(), initialScope: 'src-main' })
    );
    expect(html).toContain('2 gates in src/main over 1,068 parsed files · of 820 in the repository');
    expect(html).toContain('auth 0 · flag 1 · refusal 1 · guard 0');
    expect((html.match(/arch-fact-row/g) ?? []).length).toBe(2);
    expect(html).toContain('src/main/a.ts:12');
    expect(html).toContain('throw new Error');
  });

  it('counts the four kinds over the rows, and composes the answer lines', () => {
    expect(gateCounts(null)).toEqual({ auth: 0, flag: 0, refusal: 0, guard: 0 });
    expect(archGatesAnswer(0, 'docs', 5, 820)).toBe('0 gates in docs over 5 parsed files · of 820 in the repository');
    expect(archGatesAnswer(820, null, 2639, null)).toBe('820 gates in the repository over 2,639 parsed files');
    expect(archGatesBreakdown({ flag: 3, refusal: 9, guard: 2 })).toBe('auth 0 · flag 3 · refusal 9 · guard 2');
  });
});

describe('the fact rows', () => {
  it('draws subject and file:line, opens nothing on its own, and names a cut list', () => {
    const html = renderToStaticMarkup(
      createElement(FactRows, {
        repoKey: REPO,
        entry: {
          status: 'ready',
          error: null,
          result: {
            cwd: REPO,
            scope: 'x',
            truncated: true,
            files: 1,
            parsed: 1,
            rows: [
              { category: 'surface', kind: 'ipc-channel', subject: 'arch:map', line: 143, rule: 'surface.ipc', evidence: 'handle(ipc', file: 'src/main/arch/ipc.ts', viaWrapper: false },
              { category: 'surface', kind: 'job', subject: 'ci', line: 1, rule: 'surface.job', evidence: '', file: '.github/w.yml', viaWrapper: false }
            ]
          }
        },
        kind: 'ipc-channel'
      })
    );
    expect(html).toContain('arch:map');
    expect(html).toContain('src/main/arch/ipc.ts:143');
    expect(html).not.toContain('.github/w.yml');
    expect(html).toContain(ARCH_FACTS_TRUNCATED);
  });
});

describe('the inner tab row and the pane', () => {
  it('draws three tabs, one selected, labelled for what the tab is a picture of', () => {
    const html = renderToStaticMarkup(createElement(InnerTabs, { tab: 'surfaces' }));
    expect(html).toContain(`aria-label="${ARCH_MAP_VIEW_LABEL}"`);
    expect(html).toContain(`data-tab="map" aria-selected="false"`);
    expect(html).toContain(`data-tab="surfaces" aria-selected="true"`);
    expect(html).toContain(`data-tab="gates" aria-selected="false"`);
    for (const word of [ARCH_TAB_MAP, ARCH_TAB_SURFACES, ARCH_TAB_GATES]) {
      expect(html).toContain(`>${word}<`);
    }
    expect(ARCH_MAP_VIEW_LABEL).toBe('What this repository builds and starts');
  });

  it('the sidebar row wears the chip and the rung sentence as the ELEVENTH hover line, at the end', () => {
    const g = model().groups[0]!;
    const lines = hoverLines(g);
    expect(lines.slice(0, 2)).toEqual(g.facts);
    expect(lines[2]).toBe(`${RUNG_FACES.tested.sentence} ${rungCountsLine(g.rung!)}`);
    const html = renderToStaticMarkup(
      createElement(ReadingFace, { model: model(), drilledGroupId: null, onOpen: vi.fn() })
    );
    expect(html).toContain('class="rd-rung arch-rung arch-rung-reached" data-rung="tested"');
    expect(html).toContain('Size: 10 files, 100 lines\nLanguages: TypeScript\n' + RUNG_FACES.tested.sentence);
    // Every box carries a rung off the wire, so the eleventh line is always
    // there and always LAST: a composed default appends its own sentence.
    const quiet = group({ id: 'x' });
    expect(hoverLines(quiet)).toEqual([
      'Size: 10 files, 100 lines',
      'Languages: TypeScript',
      `${RUNG_FACES.composed.sentence} ${rungCountsLine(quiet.rung)}`
    ]);
  });
});

describe('the adapter', () => {
  it('carries the rung and the region onto a box and composes the starts line', () => {
    const drawn = toMapModel(model());
    expect(drawn.groups[0]?.rung?.rung).toBe('tested');
    expect(drawn.groups[0]?.regionId).toBe('unit:');
    expect(drawn.regions).toHaveLength(2);
    expect(drawn.regions?.[0]?.startsLine).toBe('starts 2 workers');
    expect(drawn.regions?.[0]?.startsTitle).toBe('worker · src/main/symbols/pool.ts:171\nworker · src/main/symbols/pool.ts:180');
    // A zero transport is dropped; the one that counts is labelled.
    expect(drawn.transports).toHaveLength(1);
    expect(drawn.transports?.[0]?.label).toBe('spawns · 30');
    expect(startsOf([]).line).toBeNull();
    expect(startsOf([{ kind: 'service', label: 'service', file: 'compose.yml', line: 1 }, { kind: 'unit', label: 'cargo library', file: 'x/Cargo.toml', line: 1 }]).line).toBe('starts 1 compose service, 1 cargo library');
    expect(archStartsLine([{ kind: 'worker', label: 'worker', file: 'a.ts', line: 1 }])).toBe('starts 1 worker');
    expect(archStartsLine([{ kind: 'service', label: 'service', file: 'compose.yml', line: 3 }, { kind: 'service', label: 'service', file: 'compose.yml', line: 9 }, { kind: 'unit', label: 'cargo library', file: 'x/Cargo.toml', line: 1 }])).toBe('starts 2 compose services, 1 cargo library');
  });

  it('leaves an older model regionless', () => {
    const drawn = toMapModel(model({ regions: undefined, transports: undefined }));
    expect(drawn.regions).toBeUndefined();
  });
});

describe('the store', () => {
  it('holds one selection and one inner tab per repository, and clears with null', () => {
    const s = useArch.getState();
    s.inspectBox(REPO, 'src-main');
    expect(useArch.getState().inspectFor(REPO)).toBe('src-main');
    expect(useArch.getState().inspectFor('/other')).toBeNull();
    s.inspectBox(REPO, null);
    expect(useArch.getState().inspectFor(REPO)).toBeNull();
    expect(useArch.getState().mapTabFor(REPO)).toBe('map');
    s.setMapTab(REPO, 'gates');
    expect(useArch.getState().mapTabFor(REPO)).toBe('gates');
    expect(useArch.getState().mapTabFor('/other')).toBe('map');
  });

  it('keys a disclosure on repository, scope and the sorted categories', () => {
    expect(factsKey(REPO, 'a', ['store', 'effect'])).toBe(factsKey(REPO, 'a', ['effect', 'store']));
    expect(factsKey(REPO, null, ['gate'])).not.toBe(factsKey(REPO, 'a', ['gate']));
    expect(factsKey(REPO, null, ['gate'])).toContain('\u0000');
  });

  it('lets every held disclosure of one repository go on forgetFacts, and no other', () => {
    useArch.setState({
      facts: {
        [factsKey(REPO, 'a', ['gate'])]: { status: 'ready', result: null, error: null },
        [factsKey('/other', 'a', ['gate'])]: { status: 'ready', result: null, error: null }
      }
    });
    useArch.getState().forgetFacts(REPO);
    expect(Object.keys(useArch.getState().facts)).toEqual([factsKey('/other', 'a', ['gate'])]);
    useArch.setState({ facts: {} });
  });
});

describe('the writing rules', () => {
  it('every new sentence is short, plain, and says no tmux word', () => {
    const resting = [
      ARCH_INSPECT_NONE,
      ARCH_INSPECT_NO_SURFACE,
      ARCH_OUTSIDE_EMPTY,
      ARCH_GATES_NAME_ONE,
      ARCH_GATES_WHOLE,
      ARCH_MAP_VIEW_LABEL,
      ARCH_FACTS_TRUNCATED,
      RUNG_NO_SEEDS,
      ...Object.values(RUNG_FACES).map((f) => f.sentence)
    ];
    for (const sentence of resting) {
      expect(words(sentence)).toBeLessThanOrEqual(14);
      expect(sentence).not.toMatch(/[–—]/);
      expect(sentence).not.toMatch(/\b(pane|prefix|tmux)\b/i);
    }
    for (const label of [ARCH_TAB_MAP, ARCH_TAB_SURFACES, ARCH_TAB_GATES]) {
      expect(words(label)).toBeLessThanOrEqual(4);
    }
  });
});
