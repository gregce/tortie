/**
 * THE SEMANTIC SURFACE (Phase 259): the citation chip table, the rate drawn
 * beside its floor, the journeys view, the inspector's four model rows, the
 * gates view's reasons, the no-reading face and the fourth inner tab.
 *
 * Rendered to static markup over seeded props, the shape every suite in this
 * folder uses; the app run is `build/p259/probe-p259-reading.mjs` and the
 * executable gate is `npm run conformance:semantic`.
 *
 * THE TWO CLAIMS THAT MATTER MOST HERE are the ones a later round is most
 * likely to undo for tidiness. A call site and a declaration must never be
 * drawn identically, because research 118 §7.3 measured them at 9.6x and
 * 2.46x over chance and one dress for both hides the whole of that
 * difference. And no string this surface can draw may say anything stronger
 * than that a fact was found at a line, because the deterministic checker
 * refusals catch 5 of 7 planted lies, so a chip is attribution and never a
 * verdict.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARCH_CITE_GRADES, ARCH_CITE_SLACK, ARCH_CLAIM_FIELDS } from '@shared/arch';
import type {
  ArchCiteReading,
  ArchClaimReading,
  ArchGateReading,
  ArchJourneyReading,
  ArchPartReading,
  ArchRateReading
} from '@shared/arch';
import type { ArchSemanticResult } from '../bridge';
import {
  CITE_FACES,
  CITE_TONE_TOKEN,
  CITE_WHY_PREFIX,
  chanceOf,
  citeAtChance,
  citeChanceCount,
  citeFace,
  citeFaceOf,
  citeRate,
  citeRateTitle,
  citeTitle,
  isCiteGrade,
  partScope,
  rateOf
} from '../cite';
import { CiteChip, ClaimBody, NoReading, RateLine } from '../ArchClaim';
import { ArchJourneys, journeyGroups } from '../ArchJourneys';
import { ArchInspector, ClaimRow, claimOf } from '../ArchInspector';
import { ArchGates, gateReadingsFor } from '../ArchGates';
import { InnerTabs } from '../ArchMapTab';
import {
  ARCH_JOURNEYS_FROM_CONTRACT,
  ARCH_NO_READING,
  ARCH_NO_READING_SUB,
  ARCH_TAB_GATES,
  ARCH_TAB_JOURNEYS,
  ARCH_TAB_MAP,
  ARCH_TAB_SURFACES,
  archReadBy
} from '../copy';
import type { ArchMapGroup, ArchMapResult } from '../bridge';

const REPO = '/Users/op/project';

// ---------------------------------------------------------------------------
// fixtures — a reading with one of every grade, one stale citation and both
// journey sources, so no arm below has to invent one of its own.
// ---------------------------------------------------------------------------

function cite(over: Partial<ArchCiteReading> = {}): ArchCiteReading {
  return {
    at: 'src/main/fs/guarded-write.ts:214',
    relPath: 'src/main/fs/guarded-write.ts',
    line: 214,
    why: 'the refusal this part is named for',
    grade: 'gate',
    factKind: 'refusal',
    factSubject: 'a write outside a project root',
    factLine: 214,
    dead: false,
    ...over
  };
}

function claim(over: Partial<ArchClaimReading> = {}): ArchClaimReading {
  return {
    claimId: 'c1',
    field: 'does',
    text: 'It writes one file at a time and refuses the rest.',
    cites: [cite()],
    stale: false,
    staleReason: null,
    agentId: 'claude',
    ...over
  };
}

const RATE: ArchRateReading = {
  scope: 'repo',
  backed: 24,
  total: 41,
  floorWithin: 238,
  floorLines: 1000,
  byGrade: { gate: 0, 'call-site': 9, declaration: 15, resolves: 17 },
  floorByGrade: { gate: 1, 'call-site': 23, declaration: 219, resolves: 0 },
  gateShaped: 0,
  gateClaims: 6
};

function journey(over: Partial<ArchJourneyReading> = {}): ArchJourneyReading {
  return {
    journeyId: 'j1',
    name: 'A person saves a file',
    source: 'model',
    agentId: 'claude',
    steps: [
      {
        seq: 1,
        partId: 'src-renderer',
        label: 'the editor asks to write',
        cites: [cite({ grade: 'call-site' })],
        stale: false,
        staleReason: null
      },
      {
        seq: 2,
        partId: 'src-main',
        label: 'the guarded channel refuses or writes',
        cites: [cite()],
        stale: false,
        staleReason: null
      }
    ],
    ...over
  };
}

function gate(over: Partial<ArchGateReading> = {}): ArchGateReading {
  return {
    gateId: 'g1',
    partId: 'src-main',
    question: 'Is the path inside an open project?',
    answer: 'stops',
    because: 'A path outside every open root is refused before any byte moves.',
    cites: [cite()],
    stale: false,
    staleReason: null,
    agentId: 'claude',
    ...over
  };
}

const PART: ArchPartReading = {
  id: 'src-main',
  name: 'the main process',
  claims: [
    claim({ claimId: 'c-receives', field: 'receives', text: 'Asks from the window.' }),
    claim({ claimId: 'c-does', field: 'does' }),
    claim({ claimId: 'c-returns', field: 'returns', text: 'One answer per ask.' }),
    claim({
      claimId: 'c-runsin',
      field: 'runsIn',
      text: 'The one process that owns the manifest.'
    }),
    claim({
      claimId: 'c-limit',
      field: 'limit',
      text: 'It never writes outside an open project root.',
      cites: [cite({ grade: 'declaration', factKind: 'function', factSubject: 'writeGuarded' })]
    })
  ]
};

function reading(over: Partial<ArchSemanticResult> = {}): ArchSemanticResult {
  return {
    cwd: REPO,
    parts: [PART],
    journeys: [journey()],
    gates: [gate()],
    rates: [RATE, { ...RATE, scope: partScope('src-main') }],
    runs: [
      {
        runId: 'r1',
        agentId: 'claude',
        model: 'opus',
        partId: 'src-main',
        verdict: 'ok',
        reason: null,
        wallMs: 42_000,
        claims: 7,
        rowsDropped: 0,
        startedAt: 1_757_000_000_000
      }
    ],
    readAt: 1_757_000_000_000,
    ...over
  };
}

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
    facts: ['Size: 10 files, 100 lines'],
    rung: { rung: 'composed', anchors: 1, parsed: 1, reached: 0, tested: 0, seeds: 0 },
    regionId: 'unit:',
    counts: { surface: {}, store: {}, effect: {}, network: {}, gate: { refusal: 2 } },
    ...over
  };
}

function model(): ArchMapResult {
  return {
    cwd: REPO,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    scanIncomplete: null,
    subject: 'tortie',
    sentence: '2 parts.',
    fileCount: 20,
    groups: [group({ id: 'src-main' }), group({ id: 'src-renderer' })],
    edges: [],
    regions: [],
    transports: [],
    starts: []
  } as unknown as ArchMapResult;
}

const draw = (el: React.ReactElement): string => renderToStaticMarkup(el);

// ---------------------------------------------------------------------------

describe('the chip table: four grades, and a call is never a declaration', () => {
  it('has one face for every grade main may answer, and a fifth for stale', () => {
    for (const g of ARCH_CITE_GRADES) expect(citeFace(g)).not.toBeNull();
    expect(Object.keys(CITE_FACES).sort()).toEqual(
      [...ARCH_CITE_GRADES, 'stale'].sort()
    );
    expect(citeFace('invented')).toBeNull();
    expect(isCiteGrade('gate')).toBe(true);
    expect(isCiteGrade('gates')).toBe(false);
  });

  it('gives no two faces the same glyph AND the same word', () => {
    const seen = new Set<string>();
    for (const face of Object.values(CITE_FACES)) {
      const key = `${face.icon} ${face.word}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('draws a call site and a declaration differently three ways', () => {
    const call = CITE_FACES['call-site'];
    const decl = CITE_FACES.declaration;
    expect(call.icon).not.toBe(decl.icon);
    expect(call.word).not.toBe(decl.word);
    expect(call.tone).not.toBe(decl.tone);
  });

  it('draws in the two tokens Phase 218 already pinned, and no third', () => {
    expect(Object.values(CITE_TONE_TOKEN).sort()).toEqual([
      '--status-idle',
      '--success'
    ]);
    for (const face of Object.values(CITE_FACES)) {
      expect(CITE_TONE_TOKEN[face.tone]).toBeDefined();
    }
  });

  it('lets a dead citation wear the stale face while keeping its grade', () => {
    const dead = cite({ dead: true });
    expect(citeFaceOf(dead)).toBe(CITE_FACES.stale);
    expect(dead.grade).toBe('gate');
    const html = draw(createElement(CiteChip, { cite: dead }));
    expect(html).toContain('data-grade="stale"');
    expect(html).toContain('data-at="src/main/fs/guarded-write.ts:214"');
  });
});

describe('no string here says anything stronger than a fact was found', () => {
  // The words a reader would take as a verdict about the SENTENCE rather than
  // about the line. `conformance:semantic` rule 6c scans the source for these;
  // this is the same wall asked of every string the table can actually draw.
  const FORBIDDEN = [
    'verified',
    'verify',
    'correct',
    'true',
    'proven',
    'prove',
    'confirmed',
    'accurate',
    'valid',
    'checked',
    'guaranteed',
    'certain'
  ];

  const drawable = (): string[] => [
    ...Object.values(CITE_FACES).flatMap((f) => [f.word, f.sentence]),
    citeTitle(cite()),
    citeRate(RATE),
    citeRateTitle(RATE),
    archReadBy('claude'),
    archReadBy(null),
    ARCH_NO_READING,
    ARCH_NO_READING_SUB,
    ARCH_JOURNEYS_FROM_CONTRACT
  ];

  it('never draws a word that reads as a verdict', () => {
    for (const s of drawable()) {
      for (const word of FORBIDDEN) {
        expect(
          new RegExp(`\\b${word}\\b`, 'i').test(s),
          `${word} in "${s}"`
        ).toBe(false);
      }
    }
  });

  it('would catch one if a later round planted it', () => {
    // The scan above is only worth its two lines if it can fail.
    expect(/\bverified\b/i.test('this claim was verified')).toBe(true);
  });

  // PHASE 259 FIX ROUND. The model's own `why` rides the same tooltip and is
  // held to NO rule: a reading that wrote "this sentence is right" was drawn
  // inside Tortie's own hover with nothing between the two halves. It is drawn
  // LAST and under an attribution, so a person who reads one line reads ours.
  it('attributes the model’s own reason and draws it last', () => {
    const title = citeTitle(cite({ why: 'this sentence is right' }));
    const lines = title.split('\n');
    expect(lines[0]).toBe(CITE_FACES.gate.sentence);
    expect(lines[lines.length - 1]).toBe(`${CITE_WHY_PREFIX} this sentence is right`);
    expect(title.indexOf('refusal a write outside a project root')).toBeLessThan(
      title.indexOf(CITE_WHY_PREFIX)
    );
  });

  it('draws no attribution line at all when the reading gave no reason', () => {
    expect(citeTitle(cite({ why: '' }))).not.toContain(CITE_WHY_PREFIX);
  });

  it('says a fact was found at a LINE in every grade sentence', () => {
    for (const g of ARCH_CITE_GRADES) {
      expect(CITE_FACES[g].sentence).toMatch(/line/);
    }
  });
});

describe('a rate is never drawn without its floor', () => {
  it('writes both halves in one sentence', () => {
    expect(citeRate(RATE)).toBe('24 of 41 backed · 10 of 41 would be by chance');
  });

  it('computes the chance count from the floor the reading carries', () => {
    expect(citeChanceCount(RATE)).toBe(Math.round(41 * (238 / 1000)));
    expect(citeChanceCount({ ...RATE, floorLines: 0 })).toBe(0);
  });

  it('puts the per grade breakdown and the gate shaped pair behind the hover', () => {
    const title = citeRateTitle(RATE);
    expect(title).toContain('gate 0');
    expect(title).toContain('call 9');
    expect(title).toContain('declaration 15');
    expect(title).toContain('line only 17');
    expect(title).toContain('0 of 6 gates cite a gate');
  });

  // PHASE 259 FIX ROUND. `floorByGrade` was computed, stored, shipped and
  // drawn NOWHERE, so the one surface that could say a declaration is common
  // and a gate is rare said neither.
  it('draws each grade beside its OWN floor', () => {
    const title = citeRateTitle(RATE);
    // 219 of 1000 lines are a declaration's, which over 41 citations is 9.
    expect(title).toContain('declaration 15 · 9 of 41 by chance');
    // 1 of 1000 is a gate's, which rounds to none over 41 and says so.
    expect(title).toContain('gate 0 · under 1 of 41 by chance');
  });

  // A share that is not zero and rounds to zero said `0 of 2 would be by
  // chance` over files where an eighth of every line is within the slack.
  it('says under 1 rather than 0 when a share rounds away', () => {
    expect(chanceOf(2, 0.1263)).toBe('under 1 of 2');
    expect(chanceOf(2, 0)).toBe('0 of 2');
    expect(chanceOf(41, 0.238)).toBe('10 of 41');
  });

  // The two halves are always on the face; nothing said which won.
  it('marks a reading that did not beat its own floor', () => {
    const tie: ArchRateReading = { ...RATE, backed: 10 };
    expect(citeAtChance(tie)).toBe(true);
    expect(citeRate(tie)).toContain('no better than chance');
    expect(citeAtChance(RATE)).toBe(false);
    expect(citeRate(RATE)).not.toContain('no better than chance');
    // An empty scope is not a reading that lost.
    expect(citeAtChance({ ...RATE, backed: 0, total: 0 })).toBe(false);
  });

  it('draws both halves into the markup, so the probe can read either', () => {
    const html = draw(createElement(RateLine, { rate: RATE }));
    expect(html).toContain('data-backed="24"');
    expect(html).toContain('data-total="41"');
    expect(html).toContain('data-floor="10"');
    expect(html).toContain('data-floor-within="238"');
    expect(html).toContain('data-floor-lines="1000"');
  });

  it('finds one scope’s rate and answers null for a scope with none', () => {
    expect(rateOf([RATE], 'repo')).toBe(RATE);
    expect(rateOf([RATE], partScope('src-main'))).toBeNull();
  });
});

describe('the slack is one constant, read by the grader and by the floor', () => {
  it('is the measured three lines', () => {
    expect(ARCH_CITE_SLACK).toBe(3);
  });
});

describe('a stale claim keeps its sentence and gains a mark', () => {
  it('draws the same text with data-stale true and names the citation', () => {
    const fresh = claim();
    const stale = claim({
      stale: true,
      staleReason: 'src/main/fs/guarded-write.ts:214 no longer carries that fact',
      cites: [cite({ dead: true })]
    });
    const a = draw(createElement(ClaimBody, { claim: fresh }));
    const b = draw(createElement(ClaimBody, { claim: stale }));
    expect(a).toContain('data-stale="false"');
    expect(b).toContain('data-stale="true"');
    expect(b).toContain(fresh.text);
    expect(b).toContain('no longer carries that fact');
  });
});

describe('with no reading both views are present and say one sentence', () => {
  it('draws the line and nothing else on the journeys view', () => {
    const html = draw(
      createElement(ArchJourneys, { repoKey: REPO, reading: null })
    );
    expect(html).toContain(ARCH_NO_READING);
    expect(html).toContain(ARCH_NO_READING_SUB);
    expect(html).toContain('arch-no-reading');
    expect(html).not.toContain('arch-journey-step');
  });

  it('keeps the whole computed worksheet under the line on the gates view', () => {
    const html = draw(
      createElement(ArchGates, { repoKey: REPO, model: model(), reading: null })
    );
    expect(html).toContain(ARCH_NO_READING);
    // Off must never read as broken: the select and the four kinds are there.
    expect(html).toContain('arch-gates-select');
    expect(html).toContain('arch-gates-kinds');
  });

  it('is at most forty words on the resting face', () => {
    const html = draw(createElement(NoReading, {}));
    const words = html
      .replace(/<[^>]*>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    expect(words.length).toBeLessThanOrEqual(40);
  });
});

describe('the journeys view', () => {
  it("draws the person's own journeys first, under their own sub", () => {
    const groups = journeyGroups([
      journey(),
      journey({ journeyId: 'j0', source: 'contract', agentId: null })
    ]);
    expect(groups.map((g) => g.source)).toEqual(['contract', 'model']);
  });

  it('keeps two agents apart rather than merging them into one voice', () => {
    const groups = journeyGroups([
      journey(),
      journey({ journeyId: 'j2', agentId: 'codex' })
    ]);
    expect(groups.map((g) => g.agentId)).toEqual(['claude', 'codex']);
  });

  it('numbers every step, names its part and carries at least one chip', () => {
    const html = draw(
      createElement(ArchJourneys, { repoKey: REPO, reading: reading() })
    );
    expect(html).toContain('data-seq="1"');
    expect(html).toContain('data-part="src-renderer"');
    expect(html).toContain('data-seq="2"');
    expect(html).toContain('data-part="src-main"');
    expect(html).toContain('arch-cite');
    expect(html).toContain('data-source="model"');
    expect(html).toContain(archReadBy('claude'));
    expect(html).not.toContain(ARCH_NO_READING);
  });

  it('is at most two hundred and sixty words with a reading on it', () => {
    const html = draw(
      createElement(ArchJourneys, {
        repoKey: REPO,
        reading: reading({
          journeys: [
            journey(),
            journey({ journeyId: 'j2' }),
            journey({ journeyId: 'j3' })
          ]
        })
      })
    );
    const words = html
      .replace(/<[^>]*>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    expect(words.length).toBeLessThanOrEqual(260);
  });
});

describe('the inspector gains four model rows and renames nothing', () => {
  const inspector = (part: ArchPartReading | null): string =>
    draw(
      createElement(ArchInspector, {
        repoKey: REPO,
        group: group({ id: 'src-main', label: 'src/main' }),
        region: null,
        scope: 'src-main',
        onOpen: null,
        onGates: null,
        reading: part
      })
    );

  it('draws receives, does, returns and the limit with their chips', () => {
    const html = inspector(PART);
    for (const field of ['receives', 'does', 'returns', 'limit']) {
      expect(html).toContain(`data-field="${field}"`);
    }
    expect(html).toContain('It never writes outside an open project root.');
    expect(html).toContain('data-grade="declaration"');
  });

  it('leaves each of them ABSENT rather than empty with nothing read', () => {
    const html = inspector(null);
    for (const field of ['receives', 'does', 'returns', 'limit']) {
      expect(html).not.toContain(`data-field="${field}"`);
    }
    // The computed rows are untouched by the absence.
    expect(html).toContain('data-field="runs-in"');
    expect(html).toContain('data-field="rung"');
  });

  it("keeps the computed label in the header even when the model named it", () => {
    const html = inspector(PART);
    expect(html).toContain('src/main');
    expect(html).not.toContain('the main process');
  });

  it('puts the read runsIn sentence under the computed value, not in it', () => {
    const html = inspector(PART);
    expect(html).toContain('arch-inspector-read');
    expect(html).toContain('The one process that owns the manifest.');
    expect(html).toContain(archReadBy('claude'));
  });

  it('answers null for a field no claim stood for', () => {
    expect(claimOf(PART, 'keeps')).toBeNull();
    expect(claimOf(null, 'does')).toBeNull();
    expect(claimOf(PART, 'does')?.field).toBe('does');
    expect(draw(createElement(ClaimRow, { label: 'Does', claim: null, repoKey: null })))
      .toBe('');
  });

  it('knows the seven fields the answer is written in, in order', () => {
    expect([...ARCH_CLAIM_FIELDS]).toEqual([
      'name',
      'receives',
      'does',
      'returns',
      'runsIn',
      'keeps',
      'limit'
    ]);
  });
});

describe('the gates view keeps its computed half and adds the model reasons', () => {
  it('takes only the named part’s reasons', () => {
    const r = reading();
    expect(gateReadingsFor(r, 'src-main')).toHaveLength(1);
    expect(gateReadingsFor(r, 'src-renderer')).toHaveLength(0);
    // The whole repository and the unnamed state are not a part.
    expect(gateReadingsFor(r, '')).toHaveLength(0);
    expect(gateReadingsFor(r, null)).toHaveLength(0);
    expect(gateReadingsFor(null, 'src-main')).toHaveLength(0);
  });

  it('draws the reason, its answer word and its chips when a part is named', () => {
    const html = draw(
      createElement(ArchGates, {
        repoKey: REPO,
        model: model(),
        reading: reading(),
        initialScope: 'src-main'
      })
    );
    expect(html).toContain('arch-gate-reasons');
    expect(html).toContain('Is the path inside an open project?');
    expect(html).toContain('data-answer="stops"');
    expect(html).toContain('data-grade="gate"');
    // The part's own rate, with its floor beside it.
    expect(html).toContain('data-backed="24"');
  });

  it('draws no reason at all until a part is named', () => {
    const html = draw(
      createElement(ArchGates, {
        repoKey: REPO,
        model: model(),
        reading: reading()
      })
    );
    expect(html).not.toContain('arch-gate-reasons');
  });
});

describe('the inner tab row', () => {
  it('reads Map, Journeys, Surfaces, Gates, in that order', () => {
    const html = draw(createElement(InnerTabs, { tab: 'journeys' }));
    const at = (word: string): number => html.indexOf(`>${word}<`);
    expect(at(ARCH_TAB_MAP)).toBeGreaterThan(-1);
    expect(at(ARCH_TAB_JOURNEYS)).toBeGreaterThan(at(ARCH_TAB_MAP));
    expect(at(ARCH_TAB_SURFACES)).toBeGreaterThan(at(ARCH_TAB_JOURNEYS));
    expect(at(ARCH_TAB_GATES)).toBeGreaterThan(at(ARCH_TAB_SURFACES));
  });

  it('moved no id, so a held tab and a queued menu action still land', () => {
    const html = draw(createElement(InnerTabs, { tab: 'journeys' }));
    for (const id of ['map', 'journeys', 'surfaces', 'gates']) {
      expect(html).toContain(`data-tab="${id}"`);
    }
    expect(html).toContain('data-tab="journeys" aria-selected="true"');
  });
});

/**
 * THE DOM CONTRACT the phase spec pins between this builder and the app run
 * (SPEC §8, the C → B row). A class may be ADDED beside any of these; none of
 * them may be renamed, because `build/p259/probe-p259-reading.mjs` reads the
 * live face through exactly these selectors and a rename would make the probe
 * pass by finding nothing.
 */
describe('the selectors the app run reads', () => {
  const has = (html: string, re: RegExp): boolean => re.test(html);

  it('puts data-source on an element carrying arch-journeys', () => {
    const html = draw(
      createElement(ArchJourneys, { repoKey: REPO, reading: reading() })
    );
    expect(has(html, /class="[^"]*\barch-journeys\b[^"]*"[^>]*data-source="/)).toBe(
      true
    );
  });

  it('puts data-seq and data-part on every arch-journey-step', () => {
    const html = draw(
      createElement(ArchJourneys, { repoKey: REPO, reading: reading() })
    );
    expect(
      has(
        html,
        /class="[^"]*\barch-journey-step\b[^"]*"[^>]*data-seq="[^"]*"[^>]*data-part="/
      )
    ).toBe(true);
  });

  it('puts data-grade and data-at on every arch-cite', () => {
    const html = draw(createElement(CiteChip, { cite: cite() }));
    expect(
      has(html, /class="[^"]*\barch-cite\b[^"]*"[^>]*data-grade="[^"]*"[^>]*data-at="/)
    ).toBe(true);
  });

  it('puts the three numbers on arch-rate', () => {
    const html = draw(createElement(RateLine, { rate: RATE }));
    expect(
      has(
        html,
        /class="[^"]*\barch-rate\b[^"]*"[^>]*data-backed="[^"]*"[^>]*data-total="[^"]*"[^>]*data-floor="/
      )
    ).toBe(true);
  });

  it('puts data-field and data-stale on every arch-claim', () => {
    const html = draw(createElement(ClaimBody, { claim: claim() }));
    expect(
      has(
        html,
        /class="[^"]*\barch-claim\b[^"]*"[^>]*data-field="[^"]*"[^>]*data-stale="/
      )
    ).toBe(true);
  });

  it('names the no reading face by its own class', () => {
    const html = draw(createElement(NoReading, {}));
    expect(has(html, /class="[^"]*\barch-no-reading\b/)).toBe(true);
  });
});

/**
 * The one door, read off the source the way `p235-confirm-action.test.ts`
 * reads its own: refusal 8 puts the agreement behind exactly ONE surface, so
 * this button opens Settings and starts nothing. There is no window in this
 * environment to press it in, and the app run is where it is pressed; what is
 * asked here is that the door is still the same door.
 */
describe('the Settings link is a door and not an act', () => {
  const src = readFileSync(
    new URL('../ArchClaim.tsx', import.meta.url),
    'utf8'
  );

  it('goes through the bridge openSettings the confirm action already uses', () => {
    expect(src).toContain('gmuxBridge()');
    expect(src).toContain('bridge.openSettings.bind(bridge)');
  });

  it('draws no button at all on a build whose preload has none', () => {
    expect(src).toContain('bridge?.openSettings === undefined');
  });

  it('names no agent, no argv and no spawn anywhere in the drawn half', () => {
    for (const word of ['spawn', 'execFile', 'enrich(', 'child_process']) {
      expect(src.includes(word), word).toBe(false);
    }
  });
});

describe('the gates resting face stays inside its word budget', () => {
  it('is at most a hundred and fifty words with the no reading line on it', () => {
    const html = draw(
      createElement(ArchGates, { repoKey: REPO, model: model(), reading: null })
    );
    const words = html
      .replace(/<[^>]*>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    expect(words.length).toBeLessThanOrEqual(150);
  });
});

describe('a step names the map’s own label, and keeps its id when the map has none', () => {
  it('draws the label the picture draws', () => {
    const html = draw(
      createElement(ArchJourneys, {
        repoKey: REPO,
        reading: reading(),
        labelOf: (id: string) => (id === 'src-main' ? 'src/main' : null)
      })
    );
    expect(html).toContain('>src/main<');
    // The part the map does not hold keeps its id on the face: a journey with
    // a hole in it is the news, not something to hide.
    expect(html).toContain('>src-renderer<');
    expect(html).toContain('data-part="src-renderer"');
  });
});
