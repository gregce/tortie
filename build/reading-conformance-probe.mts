/**
 * The probe behind `npm run conformance:reading` (Phase 201).
 *
 * It composes the SHIPPING map, rule P through rule R, over the three
 * committed fixtures under build/fixtures/reading/ and two trees it builds
 * itself, and prints what came out as one JSON line. The gate compares that
 * against build/fixtures/reading/expected.json. Handed a list of module
 * roots, it composes once per root, so the gate can run the shipping tree
 * and every ablated copy of it in ONE process.
 *
 * IT SPAWNS NOTHING. No git, no Electron, no tmux, no agent, no request,
 * and it reads nothing under the person's home: every fixture is data, and
 * the one file system read is the module import itself.
 *
 * Usage: tsx build/reading-conformance-probe.mts '<json>' where the json is
 * { "roots": [{ "name": "shipping", "root": "<abs path holding main/arch>" }] }
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'reading');

interface Fixture {
  subject: string;
  workspaces: string[];
  crates: string[];
  trackedFiles: string[];
  imports: { fromPath: string; toPath: string | null; resolution: string }[];
  treeFacts: { path: string; lines: number; declares: string | null }[];
  definitions: { path: string; kinds: Record<string, number> }[];
}

const spec = JSON.parse(process.argv[2] ?? '{"roots":[]}') as {
  roots: { name: string; root: string }[];
};

function fixture(name: string): Fixture {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8')) as Fixture;
}

/**
 * The nine file tree the Phase 160 second fix round measured, which reaches
 * P3's floor: the fold would leave fewer than five boxes of source, so every
 * folder of source stays.
 */
function tinyTree(): Fixture {
  return {
    subject: 'tiny',
    workspaces: [],
    crates: [],
    trackedFiles: [
      'src/app/main.ts',
      'src/app/view.ts',
      'src/core/engine.ts',
      'src/core/util.ts',
      'src/store/db.ts',
      'src/net/http.ts',
      'src/log/log.ts',
      'vendor/lib/thing.ts',
      'package.json'
    ],
    imports: [
      { fromPath: 'src/app/main.ts', toPath: 'src/core/engine.ts', resolution: 'first-party' },
      { fromPath: 'src/core/engine.ts', toPath: 'src/store/db.ts', resolution: 'first-party' }
    ],
    treeFacts: [{ path: 'package.json', lines: 5, declares: 'tiny' }],
    definitions: []
  };
}

/**
 * A tree that reaches P4's cap, which no committed fixture small enough to
 * read can: ten crates of source, three prose directories of twenty or more
 * files, and root files. The two smallest prose directories fold for the
 * count and the cap is met at twelve; a box of source never folds for it.
 */
function capTree(): Fixture {
  const files: string[] = ['README.md', 'Cargo.toml'];
  for (let c = 0; c < 10; c += 1) {
    for (let f = 0; f < 3; f += 1) files.push(`crates/c${String(c)}/src/f${String(f)}.rs`);
  }
  for (const [dir, n] of [
    ['notesa', 22],
    ['notesb', 24],
    ['notesc', 26]
  ] as [string, number][]) {
    for (let f = 0; f < n; f += 1) files.push(`${dir}/p${String(f).padStart(2, '0')}.md`);
  }
  return {
    subject: 'cap',
    workspaces: [],
    crates: [],
    trackedFiles: files,
    imports: [],
    treeFacts: [{ path: 'Cargo.toml', lines: 4, declares: 'cap' }],
    definitions: []
  };
}

/** The manifest texts the declared name reader is proved on. */
const MANIFEST_TEXTS: [string, string][] = [
  ['package.json', '{"name":"@rookery/cli","main":"dist/index.js"}\n'],
  ['Cargo.toml', '[package]\nname = "grep-printer"\nversion = "0.1.0"\n'],
  ['pyproject.toml', '[project]\nname = "lift-sys"\n'],
  ['go.mod', 'module github.com/foo/bar\n\ngo 1.22\n'],
  ['Package.swift', 'let package = Package(\n  name: "RookKit",\n  products: []\n)\n'],
  ['package.json', '{"main":"x"}'],
  ['Cargo.toml', '[workspace]\nmembers = ["crates/*"]\n']
];

interface Composed {
  sentence: string;
  words: number;
  boxes: {
    id: string;
    label: string;
    fileCount: number;
    band: string;
    words: number;
    sentence: string;
    facts: string[];
    languages: { name: string; files: number }[];
    lines: number;
    entries: string[];
  }[];
  edges: string[];
  repeatable: boolean;
  drill: { part: string; modules: string[]; crossings: string[] } | null;
}

async function composeAll(root: string): Promise<Record<string, unknown>> {
  const map = (await import(join(root, 'main', 'arch', 'map.ts'))) as typeof import('../src/main/arch/map');
  const sentence = (await import(join(root, 'main', 'arch', 'sentence.ts'))) as typeof import('../src/main/arch/sentence');
  const tree = (await import(join(root, 'main', 'arch', 'tree-facts.ts'))) as typeof import('../src/main/arch/tree-facts');
  const out: Record<string, unknown> = {};
  const trees: [string, Fixture, string | null][] = [
    ['gmux', fixture('gmux'), 'src-main'],
    ['cargo', fixture('cargo'), 'crates-core'],
    ['clients', fixture('clients'), 'clients-mac'],
    ['tiny', tinyTree(), null],
    ['cap', capTree(), null]
  ];
  for (const [name, fx, drillId] of trees) {
    const input = {
      subject: fx.subject,
      trackedFiles: fx.trackedFiles,
      imports: fx.imports,
      workspaces: fx.workspaces,
      crates: fx.crates,
      treeFacts: fx.treeFacts,
      definitions: fx.definitions,
      document: null,
      verdicts: []
    };
    const one = map.composeArchMap(input);
    const two = map.composeArchMap({
      ...input,
      trackedFiles: [...fx.trackedFiles].reverse(),
      imports: [...fx.imports].reverse(),
      treeFacts: [...fx.treeFacts].reverse(),
      definitions: [...fx.definitions].reverse()
    });
    let drill: Composed['drill'] = null;
    if (drillId !== null) {
      const part = map.composeArchMapPart({ ...input, groupId: drillId });
      drill = {
        part: part.groupLabel,
        modules: part.modules.map((m) => `${m.id}:${String(m.fileCount)}:${m.sentence}`),
        crossings: part.crossings.map(
          (c) => `${c.moduleId}>${c.outsideId}:${c.direction}:${String(c.count)}:${c.outsideLabel}`
        )
      };
    }
    const composed: Composed = {
      sentence: one.sentence,
      words: sentence.wordCount(one.sentence),
      boxes: one.groups.map((g) => ({
        id: g.id,
        label: g.label,
        fileCount: g.fileCount,
        band: g.band,
        words: sentence.wordCount(`${g.label}: ${g.sentence}`),
        sentence: g.sentence,
        facts: g.facts,
        languages: g.languages,
        lines: g.lines,
        entries: g.entries
      })),
      edges: one.edges.map((e) => `${e.from}>${e.to}:${String(e.count)}`),
      repeatable: JSON.stringify(one) === JSON.stringify(two),
      drill
    };
    out[name] = composed;
  }
  out['declared'] = MANIFEST_TEXTS.map(([file, text]) => `${file}: ${tree.declaredNameOf(file, text) ?? '(null)'}`);
  return out;
}

const answer: Record<string, unknown> = {};
for (const { name, root } of spec.roots) {
  try {
    answer[name] = await composeAll(root);
  } catch (err) {
    answer[name] = { error: err instanceof Error ? err.message : String(err) };
  }
}
process.stdout.write(`${JSON.stringify(answer)}\n`);
