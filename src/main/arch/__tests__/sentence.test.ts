/**
 * Rule S, rule R and the hover (Phase 201, research 77 sections 4.3 and 4.6).
 *
 * The gate pins every sentence over three fixtures byte for byte. These prove
 * each clause on the smallest facts that reach it, and the word counts the
 * research reported: 16 to 31 per part, 23 to 26 for the repository line.
 */

import { describe, expect, it } from 'vitest';
import { readingFacts, type ArchReadingBox } from '../reading';
import {
  entryOf,
  hoverFacts,
  languagePhrase,
  madeOf,
  nameOf,
  repositoryLine,
  sentenceOf,
  wiring,
  wordCount
} from '../sentence';
import { groupOwnerWithDirs, readingPartition } from '../skeleton';

const parseable = (p: string): boolean => /\.(ts|tsx|js|mjs|rs|swift|kt|py)$/.test(p);

function source(dir: string, n: number, ext = 'ts'): string[] {
  return Array.from({ length: n }, (_, i) => `${dir}/f${String(i).padStart(2, '0')}.${ext}`);
}
function prose(dir: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${dir}/p${String(i).padStart(2, '0')}.md`);
}

interface Facts {
  boxes: ArchReadingBox[];
  labels: Map<string, string>;
  resolvedOf: Map<string, number>;
  files: string[];
  imports: { fromPath: string; toPath: string | null; resolution: string }[];
}

/** Rule P over a tree, then the facts, with lines and declares by name. */
function facts(
  files: string[],
  imports: Facts['imports'] = [],
  extra: { lines?: [string, number][]; declares?: [string, string | null][]; kinds?: [string, Record<string, number>][]; workspaces?: string[]; crates?: string[] } = {}
): Facts {
  const cut = readingPartition({
    subject: 's',
    trackedFiles: files,
    imports: [],
    parseable,
    ...(extra.workspaces === undefined ? {} : { workspaces: extra.workspaces }),
    ...(extra.crates === undefined ? {} : { crates: extra.crates })
  });
  const boxes = readingFacts(cut.boxes, {
    trackedFiles: files,
    imports,
    parseable,
    lines: new Map(extra.lines ?? []),
    declares: new Map(extra.declares ?? []),
    kinds: new Map(extra.kinds ?? []),
    folded: cut.folded,
    ownerOf: groupOwnerWithDirs(cut.boxes)
  });
  const labels = new Map(boxes.map((b) => [b.id, nameOf(b).replace(/ \(.*\)$/, '')]));
  const resolvedOf = new Map(boxes.map((b) => [b.id, b.imports.resolved]));
  return { boxes, labels, resolvedOf, files, imports };
}
const box = (f: Facts, id: string): ArchReadingBox => {
  const found = f.boxes.find((b) => b.id === id);
  if (found === undefined) throw new Error(`no box ${id} in ${f.boxes.map((b) => b.id).join(',')}`);
  return found;
};
const sentence = (f: Facts, id: string): string =>
  `${nameOf(box(f, id))}: ${sentenceOf(box(f, id), f.labels, f.resolvedOf)}`;
const fp = (fromPath: string, toPath: string) => ({ fromPath, toPath, resolution: 'first-party' });

/** A six part tree of source, so nothing folds by the floor. */
const six = [
  ...source('one', 5),
  ...source('two', 5),
  ...source('three', 5),
  ...source('four', 5),
  ...source('five', 5),
  ...source('six', 5)
];

describe('rule L, the language', () => {
  const ext = (list: [string, number, boolean][]) =>
    list.map(([e, files, parsed]) => ({ ext: e, files, parsed }));

  it('names one language alone at 95 percent, mostly at half, and the pair at a fifth', () => {
    expect(languagePhrase(100, ext([['ts', 96, true], ['css', 4, false]]))).toBe('TypeScript');
    expect(languagePhrase(100, ext([['ts', 60, true], ['css', 40, false]]))).toBe('mostly TypeScript');
    expect(languagePhrase(100, ext([['swift', 45, true], ['png', 30, false], ['md', 25, false]]))).toBe('Swift and images');
    expect(languagePhrase(100, ext([['json', 19, false], ['md', 15, false], ['yml', 15, false], ['txt', 40, false], ['xml', 11, false]]))).toBe('text files and other files');
  });

  it('lets a parsed bucket lead at a fifth even when prose outnumbers it', () => {
    expect(languagePhrase(100, ext([['md', 70, false], ['ts', 30, true]]))).toBe('TypeScript and Markdown');
  });

  it('never leads with files that have no extension', () => {
    expect(languagePhrase(10, ext([['(none)', 8, false], ['md', 2, false]]))).toBe('Markdown and other files');
    expect(languagePhrase(3, ext([['(none)', 3, false]]))).toBe('files with no extension');
  });

  it('folds several extensions into one bucket', () => {
    expect(languagePhrase(10, ext([['ts', 5, true], ['tsx', 5, true]]))).toBe('TypeScript');
  });
});

describe('rule N, the name', () => {
  it('adds the declared name in brackets when a manifest at the box root differs', () => {
    const f = facts(
      [...six, ...source('server/src', 6), 'server/package.json'],
      [],
      { declares: [['server/package.json', 'rookery-server']] }
    );
    expect(nameOf(box(f, 'server'))).toBe('server (rookery-server)');
    const same = facts([...six, ...source('cli/src', 6), 'cli/package.json'], [], { declares: [['cli/package.json', 'cli']] });
    expect(nameOf(box(same, 'cli'))).toBe('cli');
  });

  it('calls the fold everything else', () => {
    const f = facts([...six, 'README.md']);
    expect(nameOf(box(f, 'other'))).toBe('everything else');
  });
});

describe('rule M, made of', () => {
  it('names the five biggest child folders and counts the rest with the loose files', () => {
    const files = [
      ...six,
      ...source('src/main/a', 9),
      ...source('src/main/b', 8),
      ...source('src/main/c', 7),
      ...source('src/main/d', 6),
      ...source('src/main/e', 5),
      ...source('src/main/f', 4),
      ...source('src/main/g', 3),
      'src/main/index.ts'
    ];
    const f = facts(files);
    expect(madeOf(box(f, 'src-main'))).toBe('made of a, b, c, d, e and 3 more');
  });

  it('looks through a source root', () => {
    const f = facts([...six, ...source('server/src/location', 4), ...source('server/src/runtime', 3), 'server/package.json']);
    // The manifest at the box root is not a source file, so it is not counted.
    expect(madeOf(box(f, 'server'))).toBe('made of location, runtime');
  });

  it('clusters loose file stems with a star when two clusters have three members', () => {
    const loose = ['build/probe-a.mjs', 'build/probe-b.mjs', 'build/probe-c.mjs', 'build/assert-x.mjs', 'build/assert-y.mjs', 'build/assert-z.mjs', 'build/verify.mjs', 'build/fixtures/one.json'];
    const f = facts([...six, ...loose]);
    expect(madeOf(box(f, 'build'))).toBe('made of assert*, probe* and 2 more');
  });

  it('names the biggest loose files by lines and skips role names', () => {
    const files = [...six, 'shared/index.ts', 'shared/keymap.ts', 'shared/settings.ts', 'shared/types.ts', 'shared/ipc/a.ts'];
    const f = facts(files, [], { lines: [['shared/keymap.ts', 300], ['shared/settings.ts', 200], ['shared/index.ts', 900], ['shared/types.ts', 800]] });
    expect(madeOf(box(f, 'shared'))).toBe('made of keymap, settings and 3 more');
  });

  it('describes the fold as small folders and root files', () => {
    const f = facts([...six, 'README.md', 'package.json', ...prose('.github', 3), 'patches/x.patch']);
    expect(madeOf(box(f, 'other'))).toBe('2 small folders (.github, patches) and 2 root files');
  });
});

describe('rule W, the wiring', () => {
  const tree = [...six, ...source('build', 4, 'mjs'), ...source('docs', 3, 'mjs'), ...prose('docs', 30)];

  it('names up to two partners each way, in count order', () => {
    const f = facts(tree, [
      fp('build/f00.mjs', 'one/f00.ts'),
      fp('build/f01.mjs', 'one/f01.ts'),
      fp('build/f02.mjs', 'two/f00.ts'),
      fp('build/f03.mjs', 'three/f00.ts'),
      fp('one/f00.ts', 'two/f00.ts'),
      fp('four/f00.ts', 'one/f00.ts')
    ]);
    expect(wiring(box(f, 'build'), f.labels, f.resolvedOf)).toBe('uses one and three and 1 more; no other part uses it');
    expect(wiring(box(f, 'one'), f.labels, f.resolvedOf)).toBe('used by build and four; uses two');
    expect(wiring(box(f, 'two'), f.labels, f.resolvedOf)).toBe('used by build and one; uses no other part');
  });

  it('drops a partner under a twentieth of the strongest', () => {
    const imports = Array.from({ length: 40 }, (_, i) => fp(`build/f0${String(i % 4)}.mjs`, `one/f0${String(i % 5)}.ts`));
    imports.push(fp('build/f00.mjs', 'two/f00.ts'));
    const f = facts(tree, imports);
    expect(wiring(box(f, 'build'), f.labels, f.resolvedOf)).toBe('uses one; no other part uses it');
  });

  it('says not code, not code apart from, self contained, not followed, and nothing', () => {
    const f = facts(tree, [
      fp('docs/f00.mjs', 'docs/f01.mjs'),
      { fromPath: 'six/f00.ts', toPath: null, resolution: 'unresolved' },
      { fromPath: 'six/f01.ts', toPath: null, resolution: 'unresolved' },
      fp('five/f00.ts', 'five/f01.ts'),
      fp('four/f00.ts', 'four/f00.ts')
    ]);
    expect(wiring(box(f, 'docs'), f.labels, f.resolvedOf)).toBe('not code apart from 3 files');
    expect(wiring(box(f, 'five'), f.labels, f.resolvedOf)).toBe('self contained (1 import inside, none across)');
    expect(wiring(box(f, 'six'), f.labels, f.resolvedOf)).toBe('imports not followed (2 of 2 unresolved)');
    expect(wiring(box(f, 'four'), f.labels, f.resolvedOf)).toBe('self contained (no import crosses to another part)');
    expect(wiring(box(f, 'one'), f.labels, f.resolvedOf)).toBe('no imports either way');
    const g = facts([...six, ...prose('notes', 30)]);
    expect(wiring(box(g, 'notes'), g.labels, g.resolvedOf)).toBe('not code');
  });

  it('draws a target that is not a tracked file through P6', () => {
    const files = [...six, ...source('clients/mac/Sources', 20, 'swift'), 'clients/mac/README.md', ...source('clients/RookKit/Sources/RookKit', 20, 'swift'), 'clients/RookKit/Package.swift'];
    const f = facts(files, [fp('clients/mac/Sources/f00.swift', 'clients/RookKit/Sources/RookKit')]);
    expect(wiring(box(f, 'clients-mac'), f.labels, f.resolvedOf)).toBe('uses clients/RookKit; no other part uses it');
    expect(wiring(box(f, 'clients-rookkit'), f.labels, f.resolvedOf)).toBe('used by clients/mac; uses no other part');
  });
});

describe('rule E, the entry', () => {
  it('takes the shallowest entry by name, index before main', () => {
    const f = facts([...six, 'app/main.ts', 'app/index.ts', 'app/deep/index.ts', 'app/x.ts']);
    expect(entryOf(box(f, 'app'))).toBe('entry app/index.ts');
    expect(entryOf(box(f, 'one'))).toBe('');
  });
});

describe('the sentence', () => {
  it('reads as research 77 wrote it and stays inside 16 to 31 words on a full box', () => {
    const files = [
      ...six,
      ...source('src/main/machines', 9),
      ...source('src/main/arch', 8),
      ...source('src/main/overview', 7),
      ...source('src/main/manifest', 6),
      ...source('src/main/harness', 5),
      ...source('src/main/sessions', 4),
      'src/main/index.ts',
      ...source('src/shared', 6),
      ...source('build', 4, 'mjs')
    ];
    const f = facts(files, [
      fp('build/f00.mjs', 'src/main/index.ts'),
      fp('src/main/arch/f00.ts', 'src/shared/f00.ts'),
      fp('src/main/arch/f01.ts', 'src/shared/f01.ts')
    ]);
    const s = sentence(f, 'src-main');
    expect(s).toBe(
      'src/main: 40 files, TypeScript; made of machines, arch, overview, manifest, harness and 2 more; used by build; uses src/shared; entry src/main/index.ts.'
    );
    expect(wordCount(s)).toBeGreaterThanOrEqual(16);
    expect(wordCount(s)).toBeLessThanOrEqual(31);
  });

  it('leaves a clause with nothing to say out', () => {
    const f = facts([...six, ...prose('notes', 30)]);
    expect(sentence(f, 'notes')).toBe('notes: 30 files, Markdown; 30 loose files; not code.');
  });
});

describe('the hover', () => {
  it('carries the ten facts in the fixed order and leaves empty ones out', () => {
    const files = [...six, ...source('server/src/location', 4), ...source('server/src/runtime', 3), 'server/src/index.ts', 'server/package.json'];
    const f = facts(
      files,
      [fp('one/f00.ts', 'server/src/index.ts'), fp('server/src/runtime/f00.ts', 'two/f00.ts'), { fromPath: 'server/src/index.ts', toPath: null, resolution: 'external' }],
      {
        lines: [['server/src/index.ts', 10], ['server/src/location/f00.ts', 90]],
        declares: [['server/package.json', 'rookery-server']],
        kinds: [['server/src/index.ts', { function: 3, class: 1 }], ['server/src/location/f00.ts', { function: 2, interface: 4 }]]
      }
    );
    expect(hoverFacts(box(f, 'server'), f.labels)).toEqual([
      'Size: 9 files, 100 lines',
      'Languages: TypeScript 8, JSON 1',
      'Defines: 5 functions, 4 interfaces, 1 class',
      'Declares: package.json rookery-server',
      'Entries: server/src/index.ts',
      'Imports: 2 written, 1 to this repository, 1 to dependencies, 0 not followed',
      'Used by: one 1',
      'Uses: two 1',
      'Folders: src 8'
    ]);
  });

  it('names the folded folders and the ones below the top level on the fold', () => {
    const f = facts([...six, 'README.md', ...prose('.github', 3), ...source('src/main', 35), 'src/test/stub.cjs']);
    const lines = hoverFacts(box(f, 'other'), f.labels);
    expect(lines).toContain('Folders: .github 3, test 1');
    expect(lines).toContain('Also holds: src/test');
    expect(lines).toContain('Defines: nothing this build reads');
  });
});

describe('rule R, the repository line', () => {
  it('names the repository, its size and language, the parts, the biggest, the connections and the imports', () => {
    const f = facts([...six, ...source('build', 4, 'mjs'), 'README.md'], [fp('build/f00.mjs', 'one/f00.ts'), fp('one/f00.ts', 'two/f00.ts'), { fromPath: 'two/f00.ts', toPath: null, resolution: 'external' }]);
    const line = repositoryLine(
      { subject: 'tortie', files: f.files.length, totalImports: 3, resolvedImports: 2, connections: 2 },
      f.boxes
    );
    expect(line).toBe(
      'tortie: 35 files, mostly TypeScript; 8 parts, the biggest five (14%); 2 connections between parts; 2 of 3 imports lead inside the repository.'
    );
    expect(wordCount(line)).toBeGreaterThanOrEqual(20);
    expect(wordCount(line)).toBeLessThanOrEqual(26);
  });

  it('never picks the fold as the biggest part', () => {
    const f = facts([...six, ...prose('.github', 19), ...prose('.claude', 19), 'README.md']);
    const line = repositoryLine({ subject: 's', files: f.files.length, totalImports: 0, resolvedImports: 0, connections: 0 }, f.boxes);
    expect(line).toContain('the biggest five (7%)');
    expect(line).toContain('0 connections between parts');
  });
});
