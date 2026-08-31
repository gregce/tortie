/**
 * The probe behind `npm run conformance:arch:modules` (Phase 64).
 *
 * It runs the product's own level 2 reader over the committed fixture in
 * build/fixtures/arch-large/ and over synthetic parts sized to sit exactly on
 * each cap, and prints one JSON document for build/conformance-arch-modules.mjs
 * to assert on.
 *
 * IT SPAWNS NOTHING. No git, no ripgrep, no agent, no tmux server, no Electron
 * and no request, and it reads nothing under the person's home. The reader's
 * pure core takes the tracked file list, the import edges and the verdicts as
 * plain arrays, so the caps can be driven past both fallbacks without a
 * repository and without a database.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ArchComponent, ArchVerdict } from '../src/shared/arch';
import type { ArchImportEdge } from '../src/main/arch/db';
// THE DOMAIN FILE RATHER THAN THE `@shared/ipc` BARREL, and that is forced.
// Every consumer under src/ reaches these three through the barrel, which is
// the one door. This probe cannot: a STATIC value import through that barrel is
// refused at instantiation time by the tsx loader that runs this file, which
// build/machines-conformance-probe.mts records at its own line 98 and takes
// every contract constant dynamically because of. Naming the domain file is the
// smaller of the two departures, because it is still one file and the barrel
// re-exports exactly it.
import {
  ARCH_MODULE_BOX_CAP,
  ARCH_MODULE_MATRIX_CAP,
  ARCH_MODULE_TOP_CAP
} from '../src/shared/ipc/arch-modules';
import {
  archModuleGrade,
  computeArchModules,
  moduleDirComponent,
  toModuleFilesResult
} from '../src/main/arch/modules';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface LargeFixture {
  expect: Record<string, string>;
  components: ArchComponent[];
  trackedFiles: string[];
  imports: ArchImportEdge[];
  verdicts: ArchVerdict[];
}

const fixture = JSON.parse(
  readFileSync(join(root, 'build', 'fixtures', 'arch-large', 'modules.json'), 'utf8')
) as LargeFixture;

/**
 * ONE synthetic part, used by all three probes below.
 *
 * The integrator extracted it: the same thirteen line literal stood in three
 * places in this file, and a field added to `ArchComponent` would have had to
 * be added to each of them. Nothing here is a variable of any probe. Each
 * probe varies the FILES, the IMPORTS and the VERDICTS it hands the reader,
 * and every one of them wants the same part to hand them about.
 */
const PART_P: ArchComponent = {
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

function over(id: string) {
  return computeArchModules({
    cwd: '/imaginary',
    componentId: id,
    component: fixture.components.find((c) => c.id === id) ?? null,
    trackedFiles: fixture.trackedFiles,
    imports: fixture.imports,
    verdicts: fixture.verdicts
  });
}

/** A part of exactly `files` files with exactly `chain` of them in a ring. */
function syntheticGrade(files: number, chain: number): string {
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
  return computeArchModules({
    cwd: '/imaginary',
    componentId: 'p',
    component: PART_P,
    trackedFiles,
    imports,
    verdicts: []
  }).grade;
}

const parts = Object.keys(fixture.expect).map((id) => {
  const answer = over(id);
  return {
    id,
    expected: fixture.expect[id],
    grade: answer.grade,
    files: answer.fileCount,
    participants: answer.participants,
    edges: answer.edgeCount,
    boxes: answer.boxes.length,
    matrixRows: answer.matrix?.paths.length ?? 0,
    matrixCells: answer.matrix?.cells.length ?? 0,
    isolated: answer.matrix?.isolated ?? 0,
    importers: answer.top?.importers.length ?? 0,
    importees: answer.top?.importees.length ?? 0,
    unresolved: answer.unresolved,
    totalImports: answer.totalImports,
    unparsed: answer.unparsed,
    swiftFiles: answer.swiftFiles,
    brokeFiles: answer.boxes.filter((b) => b.broke.length > 0).map((b) => b.path),
    brokeCells: (answer.matrix?.cells ?? []).filter((c) => c.broke).length,
    brokeRanked: (answer.top?.importers ?? []).filter((r) => r.broke).length,
    /** The keys one box carries, so a later round adding a count is visible. */
    boxKeys: answer.boxes.length === 0 ? [] : Object.keys(answer.boxes[0]!).sort(),
    /** The same answer a second time, byte compared by the gate. */
    repeat: JSON.stringify(answer) === JSON.stringify(over(id))
  };
});

/**
 * The dir scoped path (Phase 161), driven through the SAME pure core.
 *
 * A drilled module is a computed directory rather than an authored part, so
 * the caps must fire for a synthesized component whose one anchor is the
 * directory, with zero new cap logic. The equivalence probe proves the two
 * doors answer the same bytes over the same file set, and the pop probe
 * proves a directory naming nothing at HEAD answers known false.
 */
const dirScoped = (() => {
  const scopedGrade = (files: number, chain: number): string => {
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
    const component = moduleDirComponent('src/p');
    return computeArchModules({
      cwd: '/imaginary',
      componentId: component.id,
      component,
      trackedFiles,
      imports,
      verdicts: []
    }).grade;
  };
  const equivalence = (() => {
    const trackedFiles = ['src/p/a.ts', 'src/p/b.ts', 'src/q/c.ts'];
    const imports: ArchImportEdge[] = [
      {
        fromPath: 'src/p/a.ts',
        line: 1,
        specifier: './b',
        toPath: 'src/p/b.ts',
        resolution: 'first-party',
        language: 'typescript'
      }
    ];
    const component = moduleDirComponent('src/p');
    const viaDir = computeArchModules({
      cwd: '/imaginary',
      componentId: component.id,
      component,
      trackedFiles,
      imports,
      verdicts: []
    });
    const viaPart = computeArchModules({
      cwd: '/imaginary',
      componentId: 'p',
      component: PART_P,
      trackedFiles,
      imports,
      verdicts: []
    });
    return (
      JSON.stringify({ ...viaDir, componentId: '' }) ===
      JSON.stringify({ ...viaPart, componentId: '' })
    );
  })();
  const gone = toModuleFilesResult(
    computeArchModules({
      cwd: '/imaginary',
      componentId: moduleDirComponent('no/such/dir').id,
      component: moduleDirComponent('no/such/dir'),
      trackedFiles: ['src/p/a.ts'],
      imports: [],
      verdicts: []
    }),
    'no/such/dir'
  );
  return {
    atBoxCap: scopedGrade(ARCH_MODULE_BOX_CAP, 4),
    pastBoxCap: scopedGrade(ARCH_MODULE_BOX_CAP + 1, 4),
    atMatrixCap: scopedGrade(600, ARCH_MODULE_MATRIX_CAP),
    pastMatrixCap: scopedGrade(600, ARCH_MODULE_MATRIX_CAP + 1),
    equivalence,
    goneKnown: gone.known,
    goneDir: gone.dir
  };
})();

const boundaries = {
  boxCap: ARCH_MODULE_BOX_CAP,
  matrixCap: ARCH_MODULE_MATRIX_CAP,
  topCap: ARCH_MODULE_TOP_CAP,
  atBoxCap: syntheticGrade(ARCH_MODULE_BOX_CAP, 4),
  pastBoxCap: syntheticGrade(ARCH_MODULE_BOX_CAP + 1, 4),
  atMatrixCap: syntheticGrade(600, ARCH_MODULE_MATRIX_CAP),
  pastMatrixCap: syntheticGrade(600, ARCH_MODULE_MATRIX_CAP + 1),
  quietLargePart: syntheticGrade(400, 90),
  gradeFn: {
    boxes: archModuleGrade(ARCH_MODULE_BOX_CAP, 0),
    matrix: archModuleGrade(ARCH_MODULE_BOX_CAP + 1, 0),
    top: archModuleGrade(10_000, ARCH_MODULE_MATRIX_CAP + 1)
  }
};

/**
 * The `resolution` rule, planted rather than assumed.
 *
 * Four answers out of one file. Only `unresolved` and `unverifiable` may raise
 * the unresolved count, and `external` is a DEFINITE answer that never does.
 */
const resolutionProbe = (() => {
  const answer = computeArchModules({
    cwd: '/imaginary',
    componentId: 'p',
    component: PART_P,
    trackedFiles: ['src/p/a.ts', 'src/p/b.ts'],
    imports: [
      {
        fromPath: 'src/p/a.ts',
        line: 1,
        specifier: './b',
        toPath: 'src/p/b.ts',
        resolution: 'first-party',
        language: 'typescript'
      },
      {
        fromPath: 'src/p/a.ts',
        line: 2,
        specifier: 'node:path',
        toPath: null,
        resolution: 'external',
        language: 'typescript'
      },
      {
        fromPath: 'src/p/a.ts',
        line: 3,
        specifier: './gone',
        toPath: null,
        resolution: 'unresolved',
        language: 'typescript'
      },
      {
        fromPath: 'src/p/a.ts',
        line: 4,
        specifier: 'std::io',
        toPath: null,
        resolution: 'unverifiable',
        language: 'rust'
      }
    ],
    verdicts: []
  });
  return {
    total: answer.totalImports,
    unresolved: answer.unresolved,
    edges: answer.edgeCount
  };
})();

/**
 * The overlay rule, planted rather than assumed. A promise that merely cannot
 * be checked must decorate nothing.
 */
const overlayProbe = (() => {
  const verdicts: ArchVerdict[] = [
    {
      subjectId: 'edge:broke',
      status: 'divergent',
      coverage: 'checked',
      offending: [
        { fromPath: 'src/p/a.ts', toPath: 'src/p/b.ts', line: 1, specifier: './b' }
      ],
      checkedAtCommit: 'a'.repeat(40),
      generation: 1,
      firstCheck: false,
      reason: null,
      durationMs: 1
    },
    {
      subjectId: 'edge:cannot',
      status: 'unverifiable',
      coverage: 'unverifiable',
      offending: [
        { fromPath: 'src/p/b.ts', toPath: 'src/p/a.ts', line: 2, specifier: './a' }
      ],
      checkedAtCommit: 'a'.repeat(40),
      generation: 1,
      firstCheck: false,
      reason: null,
      durationMs: 1
    },
    {
      subjectId: 'edge:holds',
      status: 'convergent',
      coverage: 'checked',
      offending: [
        { fromPath: 'src/p/a.ts', toPath: 'src/p/b.ts', line: 3, specifier: './b' }
      ],
      checkedAtCommit: 'a'.repeat(40),
      generation: 1,
      firstCheck: false,
      reason: null,
      durationMs: 1
    }
  ];
  const answer = computeArchModules({
    cwd: '/imaginary',
    componentId: 'p',
    component: PART_P,
    trackedFiles: ['src/p/a.ts', 'src/p/b.ts'],
    imports: [],
    verdicts
  });
  return Object.fromEntries(
    answer.boxes.map((b) => [b.path, b.broke.map((r) => r.subjectId)])
  );
})();

process.stdout.write(
  `${JSON.stringify({ parts, boundaries, dirScoped, resolutionProbe, overlayProbe }, null, 2)}\n`
);
