/**
 * The computed level 2 view, on the cases that decide whether it can lie
 * (Phase 64).
 *
 * THE THREE THINGS THIS FILE EXISTS FOR.
 *
 *  1. **Both fallbacks actually fire.** A cap nobody has crossed is a comment.
 *     The committed fixture in `build/fixtures/arch/` holds 12 tracked files
 *     and 10 imports, which cannot reach a cap of 30, let alone 200, so
 *     `build/fixtures/arch-large/modules.json` exists and every grade below is
 *     driven over it as well as at its own exact boundary.
 *  2. **`resolution` is the field, never `toPath`.** `../checkers/facts.ts`
 *     records the measurement: reading a null `toPath` as a resolver failure
 *     made the strip say 2,363 of 8,447 imports were unresolved when the true
 *     number was none. An `external` answer is DEFINITE. The test below plants
 *     one of each of the four answers and reads the two counts back.
 *  3. **The overlay only ever decorates a promise that broke or is missing.** A
 *     promise that merely cannot be checked marks nothing, because a grey
 *     verdict wearing a red file is the false claim this whole feature refuses.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ArchComponent, ArchVerdict } from '@shared/arch';
import {
  ARCH_MODULE_BOX_CAP,
  ARCH_MODULE_MATRIX_CAP,
  ARCH_MODULE_TOP_CAP
} from '@shared/ipc';
import type { ArchImportEdge } from '../db';
import { archModuleGrade, computeArchModules } from '../modules';

interface LargeFixture {
  expect: Record<string, string>;
  components: ArchComponent[];
  trackedFiles: string[];
  imports: ArchImportEdge[];
  verdicts: ArchVerdict[];
}

const FIXTURE = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      '..',
      'build',
      'fixtures',
      'arch-large',
      'modules.json'
    ),
    'utf8'
  )
) as LargeFixture;

function part(id: string): ArchComponent {
  const found = FIXTURE.components.find((c) => c.id === id);
  if (found === undefined) throw new Error(`fixture has no part ${id}`);
  return found;
}

function overLarge(id: string): ReturnType<typeof computeArchModules> {
  return computeArchModules({
    cwd: '/imaginary',
    componentId: id,
    component: part(id),
    trackedFiles: FIXTURE.trackedFiles,
    imports: FIXTURE.imports,
    verdicts: FIXTURE.verdicts
  });
}

/** A synthetic part of exactly `files` files, `edges` of them in a chain. */
function synthetic(files: number, chain: number): {
  component: ArchComponent;
  trackedFiles: string[];
  imports: ArchImportEdge[];
} {
  const trackedFiles: string[] = [];
  for (let i = 0; i < files; i += 1) {
    trackedFiles.push(`src/p/f${String(i).padStart(4, '0')}.ts`);
  }
  const imports: ArchImportEdge[] = [];
  for (let i = 0; i < chain; i += 1) {
    imports.push({
      fromPath: `src/p/f${String(i).padStart(4, '0')}.ts`,
      line: 1,
      specifier: './next',
      toPath: `src/p/f${String((i + 1) % chain).padStart(4, '0')}.ts`,
      resolution: 'first-party',
      language: 'typescript'
    });
  }
  const component: ArchComponent = {
    id: 'p',
    name: 'P',
    kind: 'component',
    layer: 'core',
    provenance: 'first-party',
    anchors: ['src/p/'],
    boundary: 'closed',
    description: '',
    evidence: [],
    deprecated: false,
    gaps: []
  };
  return { component, trackedFiles, imports };
}

function grade(files: number, chain: number): string {
  const s = synthetic(files, chain);
  return computeArchModules({
    cwd: '/imaginary',
    componentId: 'p',
    component: s.component,
    trackedFiles: s.trackedFiles,
    imports: s.imports,
    verdicts: []
  }).grade;
}

describe('the three grades', () => {
  it('draws boxes up to the cap and gives way on the file after it', () => {
    expect(grade(ARCH_MODULE_BOX_CAP, 4)).toBe('boxes');
    expect(grade(ARCH_MODULE_BOX_CAP + 1, 4)).toBe('matrix');
  });

  it('draws the matrix up to its cap and gives way on the file after it', () => {
    // Every file in the chain takes part, so `chain` IS the participant count.
    expect(grade(600, ARCH_MODULE_MATRIX_CAP)).toBe('matrix');
    expect(grade(600, ARCH_MODULE_MATRIX_CAP + 1)).toBe('top');
  });

  it('counts participants rather than files, so a quiet part still draws', () => {
    // Four hundred files and ninety that talk to each other is a matrix, which
    // is the whole reason the second cap is on participants and not on files.
    expect(grade(400, 90)).toBe('matrix');
    expect(archModuleGrade(400, 90)).toBe('matrix');
  });

  it('agrees with the fixture on every part it holds', () => {
    for (const [id, expected] of Object.entries(FIXTURE.expect)) {
      expect(`${id}:${overLarge(id).grade}`).toBe(`${id}:${expected}`);
    }
  });
});

describe('the fixture crosses both caps for real', () => {
  it('draws boxes for the small part and nothing else', () => {
    const answer = overLarge('small');
    expect(answer.fileCount).toBe(24);
    expect(answer.boxes).toHaveLength(24);
    expect(answer.matrix).toBeNull();
    expect(answer.top).toBeNull();
  });

  it('draws a matrix past thirty files, over the files that take part', () => {
    const answer = overLarge('medium');
    expect(answer.fileCount).toBeGreaterThan(ARCH_MODULE_BOX_CAP);
    expect(answer.boxes).toHaveLength(0);
    expect(answer.matrix).not.toBeNull();
    expect(answer.matrix?.paths).toHaveLength(70);
    expect(answer.matrix?.isolated).toBe(answer.fileCount - 70);
    // Every cell points at a real row and a real column.
    for (const cell of answer.matrix?.cells ?? []) {
      expect(cell.from).toBeGreaterThanOrEqual(0);
      expect(cell.from).toBeLessThan(70);
      expect(cell.to).toBeLessThan(70);
    }
  });

  it('falls back to two lists past two hundred participants', () => {
    const answer = overLarge('huge');
    expect(answer.participants).toBeGreaterThan(ARCH_MODULE_MATRIX_CAP);
    expect(answer.matrix).toBeNull();
    expect(answer.top?.importers).toHaveLength(ARCH_MODULE_TOP_CAP);
    expect(answer.top?.importees).toHaveLength(ARCH_MODULE_TOP_CAP);
    // The lists are an ordering, so the head is the biggest and it is the file
    // the fixture planted thirty edges on.
    expect(answer.top?.importers[0]?.path).toBe('src/huge/leaf0000.ts');
    expect(answer.top?.importers[0]?.count).toBe(31);
    expect(answer.top?.importees[0]?.path).toBe('src/huge/leaf0005.ts');
    const counts = (answer.top?.importers ?? []).map((r) => r.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});

describe('what it refuses to claim', () => {
  it('never treats a definite external answer as a resolver failure', () => {
    const answer = overLarge('small');
    // Two `external` and one `unresolved` were planted. Only the third counts.
    expect(answer.unresolved).toBe(1);
    expect(answer.totalImports).toBe(19);
  });

  it('counts a language it parses and does not resolve as unresolved', () => {
    const answer = overLarge('medium');
    expect(answer.unresolved).toBe(3);
    expect(answer.unparsed).toEqual([{ language: 'rust', files: 3 }]);
  });

  it('says a language it reads no imports for rather than drawing nothing', () => {
    const answer = overLarge('swift');
    expect(answer.grade).toBe('boxes');
    expect(answer.unparsed).toEqual([{ language: 'swift', files: 4 }]);
  });

  it('answers an anchor that names nothing without pretending it is empty code', () => {
    const answer = overLarge('gone');
    expect(answer.known).toBe(true);
    expect(answer.fileCount).toBe(0);
    expect(answer.boxes).toHaveLength(0);
  });

  it('says so when the contract has no such part', () => {
    const answer = computeArchModules({
      cwd: '/imaginary',
      componentId: 'never-existed',
      component: null,
      trackedFiles: FIXTURE.trackedFiles,
      imports: FIXTURE.imports,
      verdicts: FIXTURE.verdicts
    });
    expect(answer.known).toBe(false);
    expect(answer.fileCount).toBe(0);
  });
});

describe('the divergence overlay', () => {
  it('marks only the files a broken or missing promise names', () => {
    const answer = overLarge('small');
    const marked = answer.boxes.filter((b) => b.broke.length > 0);
    expect(marked.map((b) => b.path)).toEqual([
      'src/small/mod01.ts',
      'src/small/mod07.ts'
    ]);
    // The unverifiable verdict named mod09 and it decorates nothing.
    expect(
      answer.boxes.find((b) => b.path === 'src/small/mod09.ts')?.broke
    ).toEqual([]);
  });

  it('lists a file offending lines in line order', () => {
    const answer = overLarge('small');
    const box = answer.boxes.find((b) => b.path === 'src/small/mod01.ts');
    expect(box?.broke.map((r) => r.line)).toEqual([1, 4]);
  });

  it('carries the overlay into the matrix and into the lists', () => {
    expect(
      (overLarge('medium').matrix?.cells ?? []).some((c) => c.broke)
    ).toBe(true);
    expect(
      (overLarge('huge').top?.importers ?? []).some((r) => r.broke)
    ).toBe(true);
  });
});

describe('it is deterministic', () => {
  it('answers the same bytes twice for every grade', () => {
    for (const id of ['small', 'medium', 'huge', 'swift', 'gone']) {
      expect(JSON.stringify(overLarge(id))).toBe(JSON.stringify(overLarge(id)));
    }
  });

  it('does not depend on the order the imports arrive in', () => {
    const forward = overLarge('medium');
    const backward = computeArchModules({
      cwd: '/imaginary',
      componentId: 'medium',
      component: part('medium'),
      trackedFiles: [...FIXTURE.trackedFiles].reverse(),
      imports: [...FIXTURE.imports].reverse(),
      verdicts: [...FIXTURE.verdicts].reverse()
    });
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
  });

  it('counts one edge for a file imported twice from the same file', () => {
    const s = synthetic(40, 10);
    const twice: ArchImportEdge[] = [
      ...s.imports,
      { ...s.imports[0]!, line: 99, specifier: './again' }
    ];
    const answer = computeArchModules({
      cwd: '/imaginary',
      componentId: 'p',
      component: s.component,
      trackedFiles: s.trackedFiles,
      imports: twice,
      verdicts: []
    });
    expect(answer.edgeCount).toBe(10);
    expect(answer.totalImports).toBe(11);
  });

  it('never draws a file importing itself', () => {
    const s = synthetic(10, 0);
    const answer = computeArchModules({
      cwd: '/imaginary',
      componentId: 'p',
      component: s.component,
      trackedFiles: s.trackedFiles,
      imports: [
        {
          fromPath: 'src/p/f0000.ts',
          line: 1,
          specifier: './f0000',
          toPath: 'src/p/f0000.ts',
          resolution: 'first-party',
          language: 'typescript'
        }
      ],
      verdicts: []
    });
    expect(answer.edgeCount).toBe(0);
    expect(answer.participants).toBe(0);
  });
});
