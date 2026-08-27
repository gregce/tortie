/**
 * The computed level 2 view, drawn rather than described (Phase 64).
 *
 * This repository carries no jsdom, so the section renders through
 * `renderToStaticMarkup`, the shape `overview/__tests__/answer-hostile.test.tsx`
 * uses. That never runs an effect, which is exactly why `ArchModulesBody` is
 * exported: the answer is handed in and all three drawings are read off the
 * markup.
 *
 * WHAT IS HELD HERE.
 *
 *  - All three drawings render, and each one draws only its own shape. A
 *    matrix grade must not leave boxes on screen and a top grade must not leave
 *    a matrix on screen.
 *  - NO NUMBER APPEARS ON A NODE. The boxes markup is scanned for a digit
 *    outside a path, because "no count badge on any node" is research 49
 *    section 6.3's refusal and it is one line away from being undone.
 *  - The matrix stays sparse. A 200 by 200 matrix is 40,000 positions and the
 *    markup must carry one element per import instead, or the sidebar stalls.
 *  - The stylesheet spends tokens only, spends no amber, and moves nothing.
 *  - The section never says a tmux word and never says the machine's verdict
 *    vocabulary.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  ArchModuleBox,
  ArchModulesResult
} from '@shared/ipc';
import { ArchModulesBody } from '../ArchModules';
import {
  ARCH_MODULES_EMPTY,
  ARCH_MODULES_NO_BRIDGE,
  ARCH_MODULES_UNKNOWN,
  gradeSentence,
  isolatedSentence,
  moduleDir,
  moduleLabel,
  rankSentence,
  unparsedSentence
} from '../modules';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '..', 'arch-modules.css'), 'utf8');
const TSX = readFileSync(join(HERE, '..', 'ArchModules.tsx'), 'utf8');

function base(): ArchModulesResult {
  return {
    cwd: '/repo',
    componentId: 'core',
    known: true,
    grade: 'boxes',
    fileCount: 0,
    edgeCount: 0,
    participants: 0,
    boxes: [],
    matrix: null,
    top: null,
    unresolved: 0,
    totalImports: 0,
    unparsed: []
  };
}

function box(path: string, broke = false): ArchModuleBox {
  return {
    path,
    language: 'typescript',
    broke: broke
      ? [
          {
            subjectId: 'edge:no-cross',
            status: 'divergent',
            line: 12,
            specifier: './other'
          }
        ]
      : []
  };
}

function draw(result: ArchModulesResult): string {
  return renderToStaticMarkup(
    <ArchModulesBody
      cwd="/repo"
      result={result}
      loading={false}
      failed={null}
      available
    />
  );
}

describe('the three drawings', () => {
  it('draws one box per file and nothing else at the boxes grade', () => {
    const html = draw({
      ...base(),
      grade: 'boxes',
      fileCount: 3,
      edgeCount: 2,
      participants: 3,
      boxes: [box('src/a.ts'), box('src/deep/b.ts', true), box('src/c.ts')]
    });
    expect(html).toContain('arch-modules-boxes');
    expect(html).not.toContain('arch-modules-matrix');
    expect(html).not.toContain('arch-modules-top');
    expect(html).toContain('a.ts');
    expect(html).toContain('src/deep/');
    // The overlay carries the word beside the colour, so it reads in greyscale.
    expect(html).toContain('broke');
    expect(html).toContain(':12');
  });

  it('draws the matrix and no boxes at the matrix grade', () => {
    const paths = Array.from({ length: 40 }, (_, i) => `src/u${String(i)}.ts`);
    const html = draw({
      ...base(),
      grade: 'matrix',
      fileCount: 55,
      participants: 40,
      edgeCount: 40,
      matrix: {
        paths,
        cells: paths.map((_, i) => ({ from: i, to: (i + 1) % 40, broke: i === 3 })),
        isolated: 15
      }
    });
    expect(html).toContain('arch-modules-matrix');
    expect(html).not.toContain('arch-modules-boxes');
    expect(html).toContain('arch-matrix-cell');
    // The axis is numbered, and both axes carry the same numbers.
    expect(html).toContain('>1</span>');
    expect(html).toContain('>40</span>');
  });

  it('keeps the matrix markup sparse rather than square', () => {
    const n = 200;
    const paths = Array.from({ length: n }, (_, i) => `src/u${String(i)}.ts`);
    const html = draw({
      ...base(),
      grade: 'matrix',
      fileCount: n,
      participants: n,
      edgeCount: n,
      matrix: {
        paths,
        cells: paths.map((_, i) => ({ from: i, to: (i + 1) % n, broke: false })),
        isolated: 0
      }
    });
    const cells = html.split('arch-matrix-cell').length - 1;
    // One element per import, not one per position. 200 by 200 is 40,000
    // positions and rendering them all would stall the sidebar.
    expect(cells).toBe(n);
    expect(cells).toBeLessThan(n * n);
  });

  it('draws the two lists and no matrix at the top grade', () => {
    const rank = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        path: `src/r${String(i)}.ts`,
        count: 40 - i,
        broke: i === 0
      }));
    const html = draw({
      ...base(),
      grade: 'top',
      fileCount: 900,
      participants: 400,
      edgeCount: 1200,
      top: { importers: rank(20), importees: rank(20) }
    });
    expect(html).toContain('arch-modules-top');
    expect(html).not.toContain('arch-modules-matrix');
    expect(html).not.toContain('arch-modules-boxes');
    // The number is inside the row's own sentence rather than pinned to a node.
    expect(html).toContain('imports 40 files here');
    expect(html).toContain('imported by 40 files here');
  });
});

describe('no number ever lands on a node', () => {
  it('puts no digit in a box beyond the ones inside its own path', () => {
    const html = draw({
      ...base(),
      grade: 'boxes',
      fileCount: 2,
      edgeCount: 9,
      participants: 2,
      boxes: [box('src/alpha.ts'), box('src/beta.ts')]
    });
    const boxes = html.slice(
      html.indexOf('arch-modules-boxes'),
      html.indexOf('arch-modules-sentences')
    );
    // The edge count is 9 and it must be in the sentence under the drawing, not
    // in the drawing. Nothing in the boxes markup may carry a bare digit.
    const text = boxes.replace(/<[^>]*>/g, ' ');
    // The scan is over real markup rather than an empty slice, which is what
    // stops this assertion passing because it found nothing at all.
    expect(text).toContain('alpha.ts');
    expect(text).toContain('beta.ts');
    expect(text).not.toMatch(/\d/);
    expect(html).toContain('9 imports');
  });

  it('states every count in a sentence under the drawing', () => {
    const result: ArchModulesResult = {
      ...base(),
      grade: 'matrix',
      fileCount: 55,
      participants: 40,
      edgeCount: 61,
      unresolved: 4,
      totalImports: 90,
      unparsed: [{ language: 'swift', files: 6 }],
      matrix: {
        paths: ['src/a.ts', 'src/b.ts'],
        cells: [{ from: 0, to: 1, broke: false }],
        isolated: 15
      }
    };
    const html = draw(result);
    expect(html).toContain('arch-modules-sentences');
    expect(html).toContain('15 files here import nothing inside this part');
    expect(html).toContain('4 of 90 imports could not be resolved');
    expect(html).toContain('6 swift');
  });
});

describe('the honest states', () => {
  it('says one sentence when this build has no reader for it', () => {
    const html = renderToStaticMarkup(
      <ArchModulesBody
        cwd="/repo"
        result={null}
        loading={false}
        failed={null}
        available={false}
      />
    );
    expect(html).toContain(ARCH_MODULES_NO_BRIDGE);
  });

  it('says so for a part the contract no longer has', () => {
    expect(draw({ ...base(), known: false })).toContain(ARCH_MODULES_UNKNOWN);
  });

  it('says so for anchors that name no tracked file', () => {
    expect(draw({ ...base(), fileCount: 0 })).toContain(ARCH_MODULES_EMPTY);
  });

  it('shows a failed read as one sentence and never as a blank panel', () => {
    const html = renderToStaticMarkup(
      <ArchModulesBody
        cwd="/repo"
        result={null}
        loading={false}
        failed="the arch database would not open"
        available
      />
    );
    expect(html).toContain('the arch database would not open');
  });
});

describe('the sentences', () => {
  it('never says "1 files"', () => {
    const one = gradeSentence({
      ...base(),
      grade: 'boxes',
      fileCount: 1,
      edgeCount: 1
    });
    expect(one).toContain('1 file in this part');
    expect(one).toContain('1 import between them');
    expect(isolatedSentence(1)).toContain('1 file here');
    expect(rankSentence(1, true)).toBe('imports 1 file here');
  });

  it('says nothing at all when there is nothing to say', () => {
    expect(isolatedSentence(0)).toBeNull();
    expect(unparsedSentence([])).toBeNull();
  });

  it('splits a path into the folders and the name', () => {
    expect(moduleLabel('src/main/arch/db.ts')).toBe('db.ts');
    expect(moduleDir('src/main/arch/db.ts')).toBe('src/main/arch/');
    expect(moduleLabel('README.md')).toBe('README.md');
    expect(moduleDir('README.md')).toBe('');
  });

  it('names the drawing rather than the rule that chose it', () => {
    expect(gradeSentence({ ...base(), grade: 'matrix', fileCount: 44 })).toContain(
      'dependency matrix'
    );
    expect(
      gradeSentence({ ...base(), grade: 'top', fileCount: 900, participants: 400 })
    ).toContain('two lists');
  });
});

describe('the stylesheet and the component', () => {
  it('spends tokens and never a colour literal', () => {
    const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => line.includes(':'));
    for (const line of declarations) {
      expect(line).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(line).not.toMatch(/\b(rgba?|hsla?)\(/);
    }
  });

  it('spends no amber, because that hue belongs to an agent needing you', () => {
    expect(CSS).not.toMatch(/--warning\b/);
  });

  it('moves nothing', () => {
    const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toMatch(/\btransition\s*:/);
    expect(declarations).not.toMatch(/\banimation\s*:/);
    expect(declarations).not.toMatch(/@keyframes\b/);
  });

  it('draws no picture and adds no drawing package', () => {
    for (const banned of ['<canvas', 'getContext(', 'cytoscape', 'elkjs', 'mermaid']) {
      expect(TSX).not.toContain(banned);
    }
  });

  it('says no tmux word to a person', () => {
    for (const word of ['pane', 'tmux', 'prefix', 'window']) {
      expect(TSX.toLowerCase()).not.toContain(`>${word}`);
    }
  });

  it('persists no layout', () => {
    expect(TSX).not.toContain('localStorage');
    expect(TSX).not.toContain('sessionStorage');
  });
});
