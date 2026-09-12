/**
 * The grader, the floor and the rate (Phase 259, research 118 §6.4 and §7.3).
 *
 * The three things these cases hold, because each is a clause a later round
 * could take out without breaking anything else:
 *
 *  - the citation GRAMMAR refuses a traversal, an absolute path, a backslash,
 *    a control character and every non-line after the colon;
 *  - the LADDER is ordered by how hard each grade is to hit by chance, so a
 *    gate row beats a call site beats a declaration, and every row it reads
 *    comes through the injected seam, which a throwing seam proves;
 *  - a rate is never separable from its floor, and the floor is computed under
 *    the grader's own precedence so the four shares add up to the lines.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_CITE_GRADES, ARCH_CITE_SLACK } from '@shared/arch';
import {
  citeLineBound,
  gateShaped,
  gradeCite,
  parseCiteAt,
  type ArchGradeSources,
  type GradeDecl,
  type GradeFact
} from '../grade';
import { citeFloor } from '../floor';
import { computeRate } from '../rates';

/** A seam over plain fixtures. Nothing here can open a file. */
function sources(input: {
  lines: Record<string, number>;
  facts?: Record<string, GradeFact[]>;
  decls?: Record<string, GradeDecl[]>;
}): ArchGradeSources {
  return {
    lines: (path) => input.lines[path] ?? null,
    facts: (path) => input.facts?.[path] ?? [],
    decls: (path) => input.decls?.[path] ?? []
  };
}

const fact = (over: Partial<GradeFact> = {}): GradeFact => ({
  category: 'surface',
  kind: 'ipc-channel',
  subject: 'arch:map',
  line: 10,
  ...over
});

describe('the citation grammar', () => {
  it('refuses twelve hostile shapes and keeps an ordinary one', () => {
    const hostile = [
      '../x:1',
      '/etc/passwd:1',
      'a:0',
      'a:1e9',
      'a\\b:1',
      'a\u0007b:1',
      `${'x'.repeat(900)}:1`,
      'src/a.ts',
      'src:a.ts:1',
      'a:-1',
      'a:1.5',
      ':1'
    ];
    for (const at of hostile) {
      expect(parseCiteAt(at), `"${at}" must not parse`).toBeNull();
    }
    expect(parseCiteAt('src/main/arch/ipc.ts:143')).toEqual({
      relPath: 'src/main/arch/ipc.ts',
      line: 143
    });
  });

  it('bounds a file at its newline count plus one, so a last line with no terminator stands', () => {
    expect(citeLineBound(0)).toBe(1);
    expect(citeLineBound(42)).toBe(43);
  });
});

describe('the ladder', () => {
  const src = sources({
    lines: { 'a.ts': 100 },
    facts: {
      'a.ts': [
        fact({ line: 10 }),
        fact({ category: 'gate', kind: 'refusal', subject: 'refuses a bad path', line: 40 })
      ]
    },
    decls: { 'a.ts': [{ kind: 'function', subject: 'function writeGuarded', line: 70 }] }
  });

  it('answers the rarest kind present, gate over call over declaration', () => {
    expect(gradeCite({ at: 'a.ts:10', why: 'x' }, src)?.grade).toBe('call-site');
    expect(gradeCite({ at: 'a.ts:40', why: 'x' }, src)?.grade).toBe('gate');
    expect(gradeCite({ at: 'a.ts:70', why: 'x' }, src)?.grade).toBe('declaration');
    expect(gradeCite({ at: 'a.ts:90', why: 'x' }, src)?.grade).toBe('resolves');
  });

  it('lets a gate row inside the slack win over a call site nearer to the line', () => {
    const near = sources({
      lines: { 'a.ts': 100 },
      facts: {
        'a.ts': [
          fact({ line: 50 }),
          fact({ category: 'gate', kind: 'refusal', subject: 'the refusal', line: 52 })
        ]
      }
    });
    const graded = gradeCite({ at: 'a.ts:50', why: 'x' }, near);
    expect(graded?.grade).toBe('gate');
    expect(graded?.factSubject).toBe('the refusal');
  });

  it('honours the slack at its edge and refuses one line past it', () => {
    expect(gradeCite({ at: `a.ts:${String(10 + ARCH_CITE_SLACK)}`, why: 'x' }, src)?.grade).toBe(
      'call-site'
    );
    expect(
      gradeCite({ at: `a.ts:${String(10 + ARCH_CITE_SLACK + 1)}`, why: 'x' }, src)?.grade
    ).toBe('resolves');
  });

  it('refuses a citation into a file the tree does not track, and one past the end', () => {
    expect(gradeCite({ at: 'gone.ts:1', why: 'x' }, src)).toBeNull();
    expect(gradeCite({ at: 'a.ts:101', why: 'x' }, src)).not.toBeNull();
    expect(gradeCite({ at: 'a.ts:102', why: 'x' }, src)).toBeNull();
  });

  it('reads every row through the seam, so it has no second way to a file', () => {
    const throwing: ArchGradeSources = {
      lines: (path) => (path === 'a.ts' ? 100 : null),
      facts: () => {
        throw new Error('the grader must not read a file');
      },
      decls: () => {
        throw new Error('the grader must not read a file');
      }
    };
    // The two seams are the ONLY way rows reach the grader: one that read a
    // file of its own would answer here rather than throwing. The module
    // naming no platform api at all is the gate's own rule 3b.
    expect(() => gradeCite({ at: 'a.ts:1', why: 'x' }, throwing)).toThrow(
      'the grader must not read a file'
    );
  });

  it('asks the shape of the WHOLE citation set, never of its first row', () => {
    const cites = [
      gradeCite({ at: 'a.ts:10', why: 'x' }, src),
      gradeCite({ at: 'a.ts:40', why: 'x' }, src)
    ].flatMap((one) => (one === null ? [] : [one]));
    expect(gateShaped(cites)).toBe(true);
    expect(gateShaped(cites.slice(0, 1))).toBe(false);
  });
});

describe('the floor', () => {
  it('splits the lines four ways under the grader own precedence', () => {
    const src = sources({
      lines: { 'a.ts': 99 },
      facts: {
        'a.ts': [
          fact({ line: 10 }),
          fact({ category: 'gate', kind: 'refusal', subject: 'g', line: 40 })
        ]
      },
      decls: { 'a.ts': [{ kind: 'function', subject: 'function f', line: 70 }] }
    });
    const floor = citeFloor(['a.ts'], src);
    // 99 newlines is a bound of 100 lines; each row marks seven of them and
    // the three do not overlap.
    expect(floor.lines).toBe(100);
    expect(floor.byGrade.gate).toBe(7);
    expect(floor.byGrade['call-site']).toBe(7);
    expect(floor.byGrade.declaration).toBe(7);
    expect(floor.within).toBe(21);
    const total = ARCH_CITE_GRADES.reduce((sum, grade) => sum + floor.byGrade[grade], 0);
    expect(total).toBe(floor.lines);
  });

  it('clamps a mark to the file own extent rather than counting past it', () => {
    const src = sources({ lines: { 'a.ts': 4 }, facts: { 'a.ts': [fact({ line: 1 })] } });
    const floor = citeFloor(['a.ts'], src);
    expect(floor.lines).toBe(5);
    // Lines 1 to 4 are within three of line 1, and line 5 is not.
    expect(floor.byGrade['call-site']).toBe(4);
    expect(floor.within).toBe(4);
  });

  it('counts a file the tree does not track as nothing at all', () => {
    const src = sources({ lines: {} });
    expect(citeFloor(['gone.ts'], src)).toEqual({
      within: 0,
      lines: 0,
      byGrade: { gate: 0, 'call-site': 0, declaration: 0, resolves: 0 }
    });
  });
});

describe('the rate', () => {
  it('carries its floor and counts a gate claim by its whole citation set', () => {
    const rate = computeRate({
      scope: 'repo',
      cites: [
        { claimId: 'g:a:one', grade: 'call-site', gate: true },
        { claimId: 'g:a:one', grade: 'gate', gate: true },
        { claimId: 'g:a:two', grade: 'declaration', gate: true },
        { claimId: 'p:a:does', grade: 'resolves', gate: false }
      ],
      floor: { within: 21, lines: 100, byGrade: { gate: 7, 'call-site': 7, declaration: 7, resolves: 79 } }
    });
    expect(rate.total).toBe(4);
    expect(rate.backed).toBe(3);
    expect(rate.byGrade).toEqual({ gate: 1, 'call-site': 1, declaration: 1, resolves: 1 });
    expect(rate.gateClaims).toBe(2);
    // The first gate claim is shaped because ONE of its two citations is a
    // gate row, which is the whole-set question rather than the first row's.
    expect(rate.gateShaped).toBe(1);
    expect(rate.floorWithin).toBe(21);
    expect(rate.floorLines).toBe(100);
  });
});
