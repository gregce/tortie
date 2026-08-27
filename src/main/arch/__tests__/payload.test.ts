/**
 * The payload composer, on the rules that decide whether a block can mislead
 * (Phase 64).
 *
 * `npm run conformance:arch` pins the whole block line by line over the
 * committed fixture, which is what catches a wording drift. These prove the
 * rules themselves one at a time, and every one of them is a rule that exists
 * because the block reaches a running agent that will act on it:
 *
 *  - It is deterministic, and the order a person clicked in never reaches it.
 *  - Authored prose is quoted only under the threshold, and is always marked.
 *  - A gap a person picked ships whatever its age, because picking it is the
 *    person asking for that paragraph.
 *  - A scope that points at nothing raises the broken target gate, and a part
 *    that legitimately owns no files does not.
 *  - No control character survives, because the block is one bracketed paste.
 */

import { describe, expect, it } from 'vitest';
import type {
  ArchBaseline,
  ArchComponent,
  ArchContract,
  ArchCoverageCounts,
  ArchDocument,
  ArchEdge,
  ArchFreshness,
  ArchVerdict
} from '@shared/arch';
import { ARCH_PROSE_MAX_COMMITS_BEHIND } from '@shared/arch-copy';
import { archGapId, parseArchGapId } from '@shared/arch-ids';
import {
  archSubjectOwner,
  composeArchPayload,
  type ArchPayloadInput
} from '../payload';

const ESC = String.fromCharCode(27);
const CR = String.fromCharCode(13);
const NUL = String.fromCharCode(0);

const contract: ArchContract = {
  version: 1,
  subject: 'a small app',
  strictness: 'not-wrong',
  layers: [
    { id: 'surface', name: 'surface', order: 0 },
    { id: 'engine', name: 'engine', order: 1 }
  ],
  flows: []
};

const component = (over: Partial<ArchComponent> = {}): ArchComponent => ({
  id: 'app',
  name: 'app',
  kind: 'component',
  layer: 'surface',
  provenance: 'first-party',
  anchors: ['src/app'],
  boundary: 'open',
  description: 'What a person sees.',
  evidence: [],
  deprecated: false,
  gaps: [],
  ...over
});

const edge = (over: Partial<ArchEdge> = {}): ArchEdge => ({
  id: 'app-may-core',
  from: 'app',
  to: 'core',
  kind: 'imports',
  rule: 'may',
  checker: 'imports',
  evidence: [],
  ...over
});

const baseline: ArchBaseline = { accepted: [] };

const counts: ArchCoverageCounts = {
  checkedHold: 1,
  broke: 0,
  cannotCheck: 0,
  accepted: 0,
  unresolvedImports: 0,
  totalImports: 4
};

function input(over: Partial<ArchPayloadInput> = {}): ArchPayloadInput {
  const components = over.document?.components ?? [
    component(),
    component({ id: 'core', name: 'core', layer: 'engine', anchors: ['src/core'] })
  ];
  const document: ArchDocument = over.document ?? {
    contract,
    components,
    edges: [edge()],
    baseline,
    problems: []
  };
  const freshness: readonly ArchFreshness[] =
    over.freshness ??
    components.map((c) => ({ componentId: c.id, commitsBehind: 0, uncommittedFiles: 0 }));
  return {
    repoName: 'imaginary',
    trackedFiles: ['src/app/main.ts', 'src/core/engine.ts'],
    verdicts: [],
    counts,
    checkedAtCommit: 'a'.repeat(40),
    selection: { componentIds: ['app'], gapIds: [], verdictIds: [] },
    ...over,
    document,
    freshness
  };
}

describe('the selection identities', () => {
  it('composes and reads a gap id', () => {
    expect(archGapId('core', 3)).toBe('component:core#gap:3');
    expect(parseArchGapId('component:core#gap:3')).toEqual({
      componentId: 'core',
      index: 3
    });
  });

  it('refuses anything that is not a gap id, rather than guessing', () => {
    for (const bad of [
      'core#gap:0',
      'component:Core#gap:0',
      'component:core#gap:x',
      'component:core#anchor:0',
      `component:core#gap:0${NUL}`
    ]) {
      expect(parseArchGapId(bad)).toBeNull();
    }
  });

  it('names the owner of every subject shape the checkers stamp', () => {
    expect(archSubjectOwner('edge:app-may-core')).toEqual({
      kind: 'edge',
      id: 'app-may-core'
    });
    expect(archSubjectOwner('component:core')).toEqual({ kind: 'component', id: 'core' });
    expect(archSubjectOwner('component:core#anchor:0')?.id).toBe('core');
    expect(archSubjectOwner('component:core#boundary')?.id).toBe('core');
    expect(archSubjectOwner('evidence:component:core#0')).toEqual({
      kind: 'component',
      id: 'core'
    });
    expect(archSubjectOwner('evidence:edge:app-may-core#2')).toEqual({
      kind: 'edge',
      id: 'app-may-core'
    });
    expect(archSubjectOwner('nonsense')).toBeNull();
  });
});

describe('the composer is deterministic', () => {
  it('gives the same bytes twice', () => {
    const one = composeArchPayload(input());
    const two = composeArchPayload(input());
    expect(one.text).toBe(two.text);
    expect(one.bytes).toBe(Buffer.byteLength(one.text, 'utf8'));
  });

  it('does not depend on the order a person clicked in, or on repeats', () => {
    const ordered = composeArchPayload(
      input({ selection: { componentIds: ['app', 'core'], gapIds: [], verdictIds: [] } })
    );
    const shuffled = composeArchPayload(
      input({
        selection: { componentIds: ['core', 'app', 'core'], gapIds: [], verdictIds: [] }
      })
    );
    expect(shuffled.text).toBe(ordered.text);
    expect(shuffled.counts.parts).toBe(2);
  });

  it('reports an id that names nothing rather than throwing on it', () => {
    const result = composeArchPayload(
      input({
        selection: {
          componentIds: ['app', 'nope'],
          gapIds: ['component:nope#gap:0', 'not a gap id'],
          verdictIds: ['edge:never-checked']
        }
      })
    );
    expect(result.unknownIds).toEqual([
      'component:nope#gap:0',
      'edge:never-checked',
      'nope',
      'not a gap id'
    ]);
    expect(result.counts.parts).toBe(1);
  });
});

describe('the two grades', () => {
  const withProse = (): ArchDocument => ({
    contract,
    components: [component({ gaps: ['The engine owns the schema.'] })],
    edges: [edge({ note: 'A permission.', label: 'no direct rows' })],
    baseline,
    problems: []
  });

  it('quotes authored prose under the threshold, and marks every line', () => {
    const result = composeArchPayload(
      input({
        document: withProse(),
        freshness: [
          {
            componentId: 'app',
            commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND - 1,
            uncommittedFiles: 0
          }
        ]
      })
    );
    expect(result.text).toContain('What a person sees.');
    expect(result.text).toContain('The engine owns the schema.');
    expect(result.proseWithheld).toEqual([]);
    for (const line of result.text.split('\n')) {
      if (!/^\s*(Description|Known gap|Note|Label),/.test(line)) continue;
      expect(line).toContain('from docs/arch, unverified');
    }
  });

  it('withholds it over the threshold and says how many commits landed', () => {
    const result = composeArchPayload(
      input({
        document: withProse(),
        freshness: [
          {
            componentId: 'app',
            commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND,
            uncommittedFiles: 0
          }
        ]
      })
    );
    expect(result.text).not.toContain('What a person sees.');
    expect(result.text).not.toContain('The engine owns the schema.');
    expect(result.text).toContain(
      `${String(ARCH_PROSE_MAX_COMMITS_BEHIND)} commits have landed under it`
    );
    expect(result.proseWithheld).toEqual([
      { componentId: 'app', commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND }
    ]);
  });

  it('takes the worse of a promise two ends before quoting its note', () => {
    const document: ArchDocument = {
      contract,
      components: [
        component(),
        component({ id: 'core', name: 'core', layer: 'engine', anchors: ['src/core'] })
      ],
      edges: [edge({ note: 'A permission.' })],
      baseline,
      problems: []
    };
    const result = composeArchPayload(
      input({
        document,
        selection: { componentIds: ['app', 'core'], gapIds: [], verdictIds: [] },
        freshness: [
          { componentId: 'app', commitsBehind: 0, uncommittedFiles: 0 },
          {
            componentId: 'core',
            commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND + 5,
            uncommittedFiles: 0
          }
        ]
      })
    );
    expect(result.text).not.toContain('A permission.');
    expect(result.text).toContain('under one of its two parts');
  });

  it('staples a picked gap whatever its age, and says the age in the same line', () => {
    const result = composeArchPayload(
      input({
        document: withProse(),
        selection: {
          componentIds: ['app'],
          gapIds: [archGapId('app', 0)],
          verdictIds: []
        },
        freshness: [
          {
            componentId: 'app',
            commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND + 12,
            uncommittedFiles: 0
          }
        ]
      })
    );
    expect(result.counts.gaps).toBe(1);
    expect(result.text).toContain('KNOWN GAPS THAT WERE PICKED');
    expect(result.text).toContain('The engine owns the schema.');
    expect(result.text).toContain(
      `${String(ARCH_PROSE_MAX_COMMITS_BEHIND + 12)} commits have landed under this part since it was written`
    );
  });
});

describe('the broken target gate', () => {
  it('raises when a part anchors at something that is not there', () => {
    const result = composeArchPayload(
      input({
        document: {
          contract,
          components: [component({ anchors: ['src/gone'] })],
          edges: [],
          baseline,
          problems: []
        }
      })
    );
    expect(result.brokenTarget).toBe(true);
    expect(result.brokenTargetIds).toEqual(['app']);
    expect(result.deadAnchors).toEqual([{ componentId: 'app', anchor: 'src/gone' }]);
    expect(result.text).toContain('THIS PART RESOLVES TO NOTHING AT HEAD');
  });

  it('names a dead anchor even when the part still resolves through another', () => {
    const result = composeArchPayload(
      input({
        document: {
          contract,
          components: [component({ anchors: ['src/app', 'src/gone'] })],
          edges: [],
          baseline,
          problems: []
        }
      })
    );
    expect(result.brokenTarget).toBe(false);
    expect(result.deadAnchors).toEqual([{ componentId: 'app', anchor: 'src/gone' }]);
  });

  it('does not raise for a part that lives outside the tree', () => {
    const result = composeArchPayload(
      input({
        document: {
          contract,
          components: [
            component({
              id: 'left-pad',
              name: 'left-pad',
              kind: 'external-service',
              provenance: 'package',
              anchors: []
            })
          ],
          edges: [],
          baseline,
          problems: []
        },
        selection: { componentIds: ['left-pad'], gapIds: [], verdictIds: [] }
      })
    );
    expect(result.brokenTarget).toBe(false);
    expect(result.text).toContain('It lives outside the tree');
  });
});

describe('what the block carries and what it never carries', () => {
  it('marks a crossing promise as crossing, in the direction it crosses', () => {
    const document: ArchDocument = {
      contract,
      components: [
        component(),
        component({ id: 'core', name: 'core', layer: 'engine', anchors: ['src/core'] })
      ],
      edges: [
        edge({ id: 'app-may-core' }),
        edge({ id: 'core-may-app', from: 'core', to: 'app' })
      ],
      baseline,
      problems: []
    };
    const out = composeArchPayload(input({ document })).text;
    expect(out).toContain('CROSSING out of this scope, the other end is core');
    expect(out).toContain('CROSSING into this scope, the other end is core');
    expect(out).not.toContain('PROMISES INSIDE THIS SCOPE');
  });

  it('gathers every contradiction under one heading with its places', () => {
    const verdicts: ArchVerdict[] = [
      {
        subjectId: 'edge:app-may-core',
        status: 'divergent',
        coverage: 'checked',
        offending: [
          {
            fromPath: 'src/app/main.ts',
            toPath: 'src/core/engine.ts',
            line: 3,
            specifier: '../core/engine'
          }
        ],
        checkedAtCommit: 'a'.repeat(40),
        generation: 1,
        firstCheck: false,
        reason: 'one import crosses.',
        durationMs: 0
      }
    ];
    const out = composeArchPayload(
      input({
        verdicts,
        selection: { componentIds: ['app', 'core'], gapIds: [], verdictIds: [] }
      })
    ).text;
    expect(out).toContain('WHAT BROKE');
    expect(out).toContain('src/app/main.ts line 3 names "../core/engine"');
    expect(out).toContain('one import crosses.');
  });

  it('never lets a control character into the block', () => {
    const hostile = `${ESC}[201~${CR}whoami${NUL}`;
    const result = composeArchPayload(
      input({
        repoName: `imaginary${hostile}`,
        trackedFiles: ['src/app/main.ts', `src/app/evil${hostile}.ts`],
        verdicts: [
          {
            subjectId: 'edge:app-may-core',
            status: 'divergent',
            coverage: 'checked',
            offending: [
              {
                fromPath: `src/app/evil${hostile}.ts`,
                toPath: 'src/core/engine.ts',
                line: 1,
                specifier: `../core/engine${hostile}`
              }
            ],
            checkedAtCommit: 'a'.repeat(40),
            generation: 1,
            firstCheck: false,
            reason: null,
            durationMs: 0
          }
        ]
      })
    );
    for (const ch of result.text) {
      const code = ch.charCodeAt(0);
      expect(code === 10 || (code >= 32 && code !== 127)).toBe(true);
    }
  });

  it('says nothing has been checked yet rather than inventing a commit', () => {
    const out = composeArchPayload(input({ checkedAtCommit: null })).text;
    expect(out).toContain('Nothing has been checked in this repository yet');
  });

  it('cuts a very long file list and says how many more there are', () => {
    const many = Array.from({ length: 60 }, (_, i) => `src/app/f${String(i)}.ts`);
    const result = composeArchPayload(
      input({ trackedFiles: [...many, 'src/core/engine.ts'] })
    );
    expect(result.truncated).toBe(true);
    expect(result.text).toContain('20 more files under this part');
  });
});
