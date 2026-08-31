/**
 * The session change diff and the ribbon's repair press (Phase 159), tested
 * where a screenshot cannot see them.
 *
 * What is here: the naming and ordering the section draws from, the two
 * store reads that carry main's record and main's count, the ONE ask the
 * keypress makes, byte for byte the same channel the fill in button uses
 * with one field added, the section's own mount rule, the ribbon's mount
 * rule for the control, and the writing rules on every new sentence. What
 * is not here: the layout claims, which belong to the app run, and the
 * arithmetic of the deltas, which is main's and is proved in main's suite.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { localTarget } from '@shared/workspace-target';
import type { ArchVerdictChanges } from '@shared/arch';
import type { ArchLoadResult } from '@shared/ipc';
import {
  changeComponentId,
  changeLabel,
  changeSelectId,
  changeWord,
  hasChanges,
  orderedChanges,
  orderedParts,
  partDelta,
  partSelectId,
  shortCommit
} from '../changes';
import { ChangedSection, RibbonRow, repairFace } from '../ArchView';
import * as copy from '../copy';
import { useArch } from '../store';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// One burst, the awkward one: a promise that broke, one that came back, one
// that appeared, one that left, a boundary and a stale quote, and two parts.
// ---------------------------------------------------------------------------

const BURST: ArchVerdictChanges = {
  fromGeneration: 6,
  toGeneration: 7,
  fromCommit: 'a'.repeat(40),
  toCommit: 'b'.repeat(40),
  at: 1_700_000_000_000,
  verdicts: [
    {
      subjectId: 'edge:app-must-not-store',
      from: 'convergent',
      to: 'divergent',
      fromCoverage: 'checked',
      toCoverage: 'checked'
    },
    {
      subjectId: 'edge:app-may-core',
      from: 'divergent',
      to: 'convergent',
      fromCoverage: 'checked',
      toCoverage: 'checked'
    },
    {
      subjectId: 'edge:new-promise',
      from: null,
      to: 'unverifiable',
      fromCoverage: null,
      toCoverage: 'unverifiable'
    },
    {
      subjectId: 'edge:old-promise',
      from: 'convergent',
      to: null,
      fromCoverage: 'checked',
      toCoverage: null
    },
    {
      subjectId: 'component:core#boundary',
      from: 'convergent',
      to: 'divergent',
      fromCoverage: 'checked',
      toCoverage: 'checked'
    },
    {
      subjectId: 'evidence:component:core#0',
      from: 'convergent',
      to: 'absent',
      fromCoverage: 'partly-checked',
      toCoverage: 'partly-checked'
    }
  ],
  parts: [
    { componentId: 'app', commitsBehindDelta: 2, uncommittedFiles: 0 },
    { componentId: 'core', commitsBehindDelta: 5, uncommittedFiles: 1 }
  ]
};

const nameOf = (id: string): string =>
  ({ core: 'The core', app: 'The app' })[id] ?? id;

function load(over: Partial<ArchLoadResult>): ArchLoadResult {
  return {
    cwd: '/repo',
    present: true,
    contract: null,
    components: [
      {
        id: 'core',
        name: 'The core',
        purpose: '',
        layer: 'main',
        provenance: 'first-party',
        anchors: ['src/core/**'],
        evidence: [],
        gaps: [],
        deprecated: false
      }
    ],
    edges: [],
    baseline: { version: 1, accepted: [] },
    problems: [],
    lastValid: false,
    verdicts: [
      {
        subjectId: 'edge:app-must-not-store',
        status: 'divergent',
        coverage: 'checked',
        checkedAtCommit: 'b'.repeat(40),
        generation: 7,
        firstCheck: false,
        reason: 'app imports store at one line.',
        durationMs: 1
      }
    ],
    freshness: [{ componentId: 'core', commitsBehind: 5, uncommittedFiles: 1 }],
    counts: {
      checkedHold: 0,
      broke: 1,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 0,
      totalImports: 1
    },
    checkedAtCommit: 'b'.repeat(40),
    narratedAtCommit: null,
    drift: { count: 0 },
    changes: null,
    ...over
  } as ArchLoadResult;
}

// ---------------------------------------------------------------------------
// The pure half
// ---------------------------------------------------------------------------

describe('naming a subject the way a person reads it', () => {
  it('finds the component behind every component shaped subject id', () => {
    expect(changeComponentId('component:core')).toBe('core');
    expect(changeComponentId('component:core#boundary')).toBe('core');
    expect(changeComponentId('component:core#anchor:2')).toBe('core');
    expect(changeComponentId('evidence:component:core#0')).toBe('core');
    expect(changeComponentId('edge:app-may-core')).toBeNull();
    expect(changeComponentId('evidence:edge:app-may-core#1')).toBeNull();
    expect(changeComponentId('component:')).toBeNull();
  });

  it('says the person\'s own name for a part and the facet after it', () => {
    expect(changeLabel('component:core', nameOf)).toBe('The core');
    expect(changeLabel('component:core#boundary', nameOf)).toBe('The core boundary');
    expect(changeLabel('component:core#anchor:2', nameOf)).toBe('The core anchor 2');
    expect(changeLabel('evidence:component:core#0', nameOf)).toBe('evidence The core 0');
  });

  it('says an edge id as the failure list does, because an edge has no name', () => {
    expect(changeLabel('edge:app-may-core', nameOf)).toBe('app-may-core');
    expect(changeLabel('evidence:edge:app-may-core#1', nameOf)).toBe(
      'evidence app-may-core#1'
    );
  });

  it('uses the four verdict words and two words for absence', () => {
    expect(changeWord('convergent', 'from')).toBe('holds');
    expect(changeWord('divergent', 'to')).toBe('broke');
    expect(changeWord(null, 'from')).toBe(copy.ARCH_CHANGE_NEW);
    expect(changeWord(null, 'to')).toBe(copy.ARCH_CHANGE_GONE);
  });

  it('selects the verdict subject for a promise and the component for a part', () => {
    expect(changeSelectId(BURST.verdicts[4]!)).toBe('component:core#boundary');
    expect(partSelectId(BURST.parts[1]!)).toBe('component:core');
  });
});

describe('ordering, so the same burst always draws the same way', () => {
  it('puts what broke first, then the rest, each by subject id', () => {
    expect(orderedChanges(BURST).map((c) => c.subjectId)).toEqual([
      'component:core#boundary',
      'edge:app-must-not-store',
      'evidence:component:core#0',
      'edge:app-may-core',
      'edge:new-promise',
      'edge:old-promise'
    ]);
  });

  it('is the same over the reversed input', () => {
    const reversed: ArchVerdictChanges = {
      ...BURST,
      verdicts: [...BURST.verdicts].reverse(),
      parts: [...BURST.parts].reverse()
    };
    expect(orderedChanges(reversed)).toEqual(orderedChanges(BURST));
    expect(orderedParts(reversed)).toEqual(orderedParts(BURST));
  });

  it('puts the part that moved furthest first and says by how much', () => {
    const parts = orderedParts(BURST);
    expect(parts.map((p) => p.componentId)).toEqual(['core', 'app']);
    expect(partDelta(parts[0]!)).toBe('+5');
    expect(partDelta(parts[1]!)).toBe('+2');
  });

  it('leaves the burst it was given untouched', () => {
    const before = JSON.stringify(BURST);
    orderedChanges(BURST);
    orderedParts(BURST);
    expect(JSON.stringify(BURST)).toBe(before);
  });
});

describe('the mount rule and the header', () => {
  it('draws nothing for no burst and nothing for an empty one', () => {
    expect(hasChanges(null)).toBe(false);
    expect(hasChanges({ ...BURST, verdicts: [], parts: [] })).toBe(false);
    expect(hasChanges({ ...BURST, verdicts: [] })).toBe(true);
    expect(hasChanges({ ...BURST, parts: [] })).toBe(true);
  });

  it('wears the short commit, seven characters, never the whole hash', () => {
    expect(shortCommit(BURST.toCommit)).toBe('bbbbbbb');
    expect(shortCommit('abc')).toBe('abc');
  });
});

// ---------------------------------------------------------------------------
// The store: two reads that carry main's answer and one ask
// ---------------------------------------------------------------------------

interface Stand {
  asks: unknown[];
}

const stand: Stand = { asks: [] };
const realWindow = (globalThis as { window?: unknown }).window;

function standUp(): void {
  (globalThis as { window?: unknown }).window = {
    gmux: {
      arch: {
        load: () => Promise.reject(new Error('not read here')),
        enrich: (input: unknown) => {
          stand.asks.push(input);
          return Promise.resolve({
            cwd: '/repo',
            started: false,
            refusal: 'no-choice',
            run: null,
            seeded: []
          });
        },
        passStatus: (input: { cwd: string }) =>
          Promise.resolve({
            cwd: input.cwd,
            running: false,
            suspended: null,
            chosen: true,
            lastRun: null
          }),
        onChecked: () => () => undefined,
        onProgress: () => () => undefined,
        onMapUpdated: () => () => undefined,
        onPass: () => () => undefined
      }
    }
  };
}

beforeEach(() => {
  stand.asks = [];
  standUp();
  useArch.setState({
    target: localTarget('/repo'),
    status: 'ready',
    load: null,
    lastCheck: null,
    passes: {},
    enriching: false,
    drafting: false
  });
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = realWindow;
  useArch.setState({
    target: null,
    status: 'idle',
    load: null,
    lastCheck: null,
    passes: {},
    enriching: false
  });
});

describe('the store reads main\'s record and counts nothing', () => {
  it('reads the burst and the count off the load', () => {
    useArch.setState({ load: load({ changes: BURST, drift: { count: 3 } }) });
    expect(useArch.getState().changes()).toBe(BURST);
    expect(useArch.getState().driftCount()).toBe(3);
  });

  it('prefers the last check\'s burst and count over the load\'s', () => {
    const later: ArchVerdictChanges = { ...BURST, toGeneration: 9 };
    useArch.setState({
      load: load({ changes: BURST, drift: { count: 3 } }),
      lastCheck: {
        cwd: '/repo',
        verdicts: [],
        freshness: [],
        counts: {
          checkedHold: 1,
          broke: 0,
          cannotCheck: 0,
          accepted: 0,
          unresolvedImports: 0,
          totalImports: 1
        },
        checkedAtCommit: 'c'.repeat(40),
        generation: 9,
        overBudget: null,
        durationMs: 1,
        drift: { count: 0 },
        changes: later
      }
    });
    expect(useArch.getState().changes()).toBe(later);
    expect(useArch.getState().driftCount()).toBe(0);
  });

  it('answers null and zero before anything landed', () => {
    expect(useArch.getState().changes()).toBeNull();
    expect(useArch.getState().driftCount()).toBe(0);
  });
});

describe('the keypress is the fill in button\'s own ask with one field added', () => {
  it('sends {cwd, scope: drift} and nothing else', async () => {
    await useArch.getState().repairDrift();
    expect(stand.asks).toEqual([{ cwd: '/repo', scope: 'drift' }]);
  });

  it('leaves the whole pass\'s bytes exactly as Phase 158 shipped them', async () => {
    await useArch.getState().enrich();
    expect(stand.asks).toEqual([{ cwd: '/repo' }]);
  });

  it('keeps the refusal beside the status, so the face owes a sentence', async () => {
    await useArch.getState().repairDrift();
    expect(useArch.getState().passFor('/repo')?.refusal).toBe('no-choice');
    expect(useArch.getState().enriching).toBe(false);
  });

  it('does nothing while an ask is already out', async () => {
    useArch.setState({ enriching: true });
    await useArch.getState().repairDrift();
    expect(stand.asks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The two faces, rendered without a DOM
// ---------------------------------------------------------------------------

const chosenPass = (chosen: boolean): void =>
  useArch.setState({
    passes: {
      '/repo': {
        status: {
          cwd: '/repo',
          running: false,
          suspended: null,
          chosen,
          lastRun: null
        },
        refusal: null
      }
    }
  });

describe('the change diff, as drawn', () => {
  it('does not mount without a burst', () => {
    useArch.setState({ load: load({}) });
    const html = renderToStaticMarkup(
      createElement(ChangedSection, { onSelect: () => undefined })
    );
    expect(html).toBe('');
  });

  it('draws one header, one line per row, the words and the arrow, no count', () => {
    useArch.setState({ load: load({ changes: BURST, drift: { count: 3 } }) });
    const html = renderToStaticMarkup(
      createElement(ChangedSection, { onSelect: () => undefined })
    );
    expect(html).toContain(`>${copy.ARCH_CHANGES_TITLE}<`);
    expect(html).toContain('>bbbbbbb<');
    // Six promise rows and two part rows, each one button.
    expect(html.match(/class="arch-change-head"/g)?.length).toBe(8);
    // The verdict words and the arrow glyph, never a machine word.
    expect(html).toContain('>holds<');
    expect(html).toContain('>broke<');
    expect(html).toContain(`>${copy.ARCH_CHANGE_NEW}<`);
    expect(html).toContain(`>${copy.ARCH_CHANGE_GONE}<`);
    expect(html).toContain('codicon-arrow-small-right');
    expect(html).not.toContain('convergent');
    expect(html).not.toContain('divergent');
    // The person's name, and the chip on a part row.
    expect(html).toContain('>The core boundary<');
    expect(html).toContain('>+5<');
    expect(html).toContain('>+2<');
    // The reason rides the hover title on the row that has one.
    expect(html).toContain('title="app imports store at one line."');
    // The header's explanation rides hover too, and no digit that is a
    // count of rows appears anywhere on the face.
    expect(html).toContain(`title="${copy.ARCH_CHANGES_BODY}"`);
    expect(html).not.toMatch(/>\s*[68] (rows|changes|changed)/);
  });

  it('colours a gone subject grey rather than red', () => {
    useArch.setState({
      load: load({
        changes: { ...BURST, verdicts: [BURST.verdicts[3]!], parts: [] }
      })
    });
    const html = renderToStaticMarkup(
      createElement(ChangedSection, { onSelect: () => undefined })
    );
    expect(html).toContain('arch-v-unknown');
    expect(html).not.toContain('arch-v-broke');
  });
});

describe('the ribbon\'s repair control', () => {
  const row = (repair: 'none' | 'ready' | 'busy'): string =>
    renderToStaticMarkup(
      createElement(RibbonRow, {
        sentence: 'One sentence.',
        repair,
        onRepair: () => undefined
      })
    );

  it('mounts only on main\'s count, with an agent chosen, in a build with the pass', () => {
    const base = { drifted: true, chosen: true, available: true, busy: false };
    expect(repairFace(base)).toBe('ready');
    expect(repairFace({ ...base, drifted: false })).toBe('none');
    expect(repairFace({ ...base, chosen: false })).toBe('none');
    expect(repairFace({ ...base, available: false })).toBe('none');
    expect(repairFace({ ...base, busy: true })).toBe('busy');
    // Busy never outranks the mount rule: no control while nothing drifted.
    expect(repairFace({ ...base, drifted: false, busy: true })).toBe('none');
  });

  it('draws the glyph, the label for the reader and the body on hover, never a number', () => {
    const html = row('ready');
    expect(html).toContain('icon-btn arch-ribbon-repair');
    expect(html).toContain(`aria-label="${copy.ARCH_REPAIR_LABEL}"`);
    expect(html).toContain(`title="${copy.ARCH_REPAIR_BODY}"`);
    expect(html).toContain('codicon-sparkle');
    expect(html).not.toMatch(/>\d+</);
    expect(html).not.toContain('disabled');
  });

  it('draws only the sentence when there is no face', () => {
    const html = row('none');
    expect(html).toContain('>One sentence.<');
    expect(html).not.toContain('arch-ribbon-repair');
  });

  it('is disabled while a pass runs, like the fill in button', () => {
    expect(row('busy')).toMatch(/arch-ribbon-repair"[^>]*disabled/);
  });

  it('reads the drift count from the store as a yes or no', () => {
    useArch.setState({ load: load({ drift: { count: 2 } }) });
    chosenPass(true);
    expect(useArch.getState().driftCount() > 0).toBe(true);
    expect(useArch.getState().passFor('/repo')?.status?.chosen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The writing rules on every new sentence
// ---------------------------------------------------------------------------

describe('the writing rules, held mechanically', () => {
  const words = (s: string): number =>
    s.split(/\s+/).filter((w) => w.length > 0).length;
  const sentences: Array<[string, string]> = [
    ['ARCH_CHANGES_TITLE', copy.ARCH_CHANGES_TITLE],
    ['ARCH_CHANGES_BODY', copy.ARCH_CHANGES_BODY],
    ['ARCH_CHANGE_NEW', copy.ARCH_CHANGE_NEW],
    ['ARCH_CHANGE_GONE', copy.ARCH_CHANGE_GONE],
    ['ARCH_REPAIR_LABEL', copy.ARCH_REPAIR_LABEL],
    ['ARCH_REPAIR_BODY', copy.ARCH_REPAIR_BODY],
    ['ARCH_REPAIR_WRITTEN', copy.ARCH_REPAIR_WRITTEN],
    ['partChangeTitle(1, 0)', copy.partChangeTitle(1, 0)],
    ['partChangeTitle(3, 2)', copy.partChangeTitle(3, 2)]
  ];

  it('holds no dash of any kind and no tmux word', () => {
    for (const [name, text] of sentences) {
      expect(text, name).not.toContain('—');
      expect(text, name).not.toContain('–');
      expect(text, name).not.toMatch(/\b(pane|window|prefix)\b/i);
      expect(text, name).not.toMatch(/\bstale\b/i);
    }
  });

  it('keeps the labels to a handful of words and the bodies on hover only', () => {
    expect(words(copy.ARCH_CHANGES_TITLE)).toBe(1);
    expect(words(copy.ARCH_CHANGE_NEW)).toBe(1);
    expect(words(copy.ARCH_CHANGE_GONE)).toBe(1);
    expect(words(copy.ARCH_REPAIR_LABEL)).toBeLessThanOrEqual(4);
    // Phase 172 moved the freshness and repair face into its own file, and
    // ChangedSection is the last declaration in it on purpose, so the slice
    // below runs from its declaration to the end of the file.
    const view = readFileSync(join(DIR, 'ArchFreshness.tsx'), 'utf8');
    for (const name of ['ARCH_CHANGES_BODY', 'ARCH_REPAIR_BODY']) {
      expect(view, name).not.toContain(`>{${name}}<`);
      expect(view, name).toContain(`title={${name}}`);
    }
    // No paragraph in the section: the only <p> the diff could carry is
    // none, and the reason rides a title attribute.
    const section = view.slice(view.indexOf('export function ChangedSection'));
    expect(section).not.toContain('<p ');
    expect(section).toContain('title={reasonOf(');
  });

  it('carries the number on a part row\'s hover title, because it is the point', () => {
    expect(copy.partChangeTitle(1, 0)).toBe(
      '1 more commit has landed under this part since the check before.'
    );
    expect(copy.partChangeTitle(3, 1)).toBe(
      '3 more commits have landed under this part since the check before. 1 changed file is not committed yet.'
    );
    expect(copy.partChangeTitle(3, 2)).toContain('2 changed files are');
  });

  it('keeps the diff repository wide: the drill does not scope it', () => {
    const view = readFileSync(join(DIR, 'ArchView.tsx'), 'utf8');
    expect(view).toMatch(/<ChangedSection onSelect=\{select\} \/>/);
    expect(view).not.toMatch(/<ChangedSection[^>]*scoped/);
  });

  it('stays in the stylesheet, tokens only', () => {
    const css = readFileSync(join(DIR, 'arch.css'), 'utf8');
    const block = css.slice(css.indexOf('the freshness loop (Phase 159)'));
    expect(block).toContain('.arch-changes');
    expect(block).toContain('.arch-ribbon-repair');
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(block).not.toMatch(/rgb\(/);
  });
});
