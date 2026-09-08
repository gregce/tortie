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

/**
 * THE MACHINE ARM (Phase 234). The two seams `src/main/machines/remote-arch.ts`
 * implements are what a folder on another machine is read through, and the
 * reading is the surface a person judges that read by. So every tree below is
 * composed TWICE: once from the fixture's own facts, and once from facts that
 * crossed the arm, being the tracked list decoded out of an `arch-git ls-files`
 * answer and the tree facts rebuilt from bytes decoded out of `arch-read`
 * records. The gate pins the second against the SAME expectations as the first.
 *
 * The runner answers what the far side's scripts would print and STARTS
 * NOTHING, so this probe is still one plain node. What the scripts themselves
 * print is proved by `src/main/machines/__tests__/p234-remote-arch.test.ts`,
 * which runs the shipping text through `/bin/sh` over a real git repository.
 *
 * It is imported from the SHIPPING tree rather than from the ablated copy on
 * purpose: the ablations are about the reading's own clauses, and the transport
 * is not one of them. What an ablation must move is the SENTENCE, on both arms.
 */
type remoteArchTypes = typeof import('../src/main/machines/remote-arch');
const { readLsFiles } = (await import(
  join(repoRoot, 'src', 'main', 'arch', 'git-facts.ts')
)) as typeof import('../src/main/arch/git-facts');
const remoteArch = (await import(
  join(repoRoot, 'src', 'main', 'machines', 'remote-arch.ts')
)) as remoteArchTypes;

const NUL = '\u0000';

/** What `arch-git` prints for one answer: base64 of the bytes and the status. */
function encodeGitAnswer(stdout: Buffer, code = 0): string {
  return Buffer.concat([
    stdout,
    Buffer.from(`\n__TORTIE_GIT__${String(code)}`, 'latin1')
  ]).toString('base64');
}

/**
 * The text of one tracked file, built to the line count and declared name the
 * fixture pins, so what comes back through the arm can be held against them.
 */
function fileTextFor(path: string, lines: number, declares: string | null): string {
  const base = declares === null ? '' : manifestText(path, declares);
  const have = (base.match(/\n/g) ?? []).length;
  const pad = Math.max(0, lines - have);
  return base + '\n'.repeat(pad);
}

/** One manifest declaring one name, in that manifest's own format. */
function manifestText(path: string, name: string): string {
  const file = path.split('/').pop() ?? path;
  if (file === 'package.json') return `{"name":"${name}"}\n`;
  if (file === 'Cargo.toml' || file === 'pyproject.toml') {
    return `[package]\nname = "${name}"\n`;
  }
  if (file === 'go.mod') return `module ${name}\n`;
  if (file === 'Package.swift') return `let package = Package(\n  name: "${name}"\n)\n`;
  return '';
}

/** What `arch-read` prints for a list of files it read back. */
function encodeReadAnswer(files: readonly { path: string; text: string }[]): string {
  const lines: string[] = [];
  for (const one of files) {
    const bytes = Buffer.from(one.text, 'utf8');
    lines.push(`F 1700000000 ${String(bytes.byteLength)} ${one.path}`);
    lines.push(bytes.toString('base64'));
  }
  return lines.length === 0 ? 'none' : `${lines.join('\n')}\n`;
}

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
  // The argv composer comes from the copy under test, because it is what the
  // machine arm is handed and an ablation of it would be a real drift. The
  // zero separated reader comes from the SHIPPING tree, because `git-facts.ts`
  // names `../git/exec`, which an ablated copy holding only `main/arch` cannot
  // resolve, and because no ablation touches it.
  const guard = (await import(join(root, 'main', 'arch', 'argv-guard.ts'))) as typeof import('../src/main/arch/argv-guard');
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
    // ---------------------------------------------------------------------
    // THE SAME TREE, THROUGH THE MACHINE ARM (Phase 234)
    // ---------------------------------------------------------------------
    // The two facts the arm really carries for the reading are the tracked
    // list, which comes back from `git ls-files -z` over there, and the bytes
    // of every tracked file, which the mirror brings here for the tree read.
    // Both cross below and both are rebuilt on this side by the SHIPPING
    // decoders, and the sentences are then composed from what came back.
    const farRunner: remoteArchTypes['RemoteArchRunner'] = (scriptId, args) => {
      if (scriptId === 'arch-git') {
        const kind = args[1] ?? '';
        if (kind !== 'ls-files') return Promise.resolve(encodeGitAnswer(Buffer.alloc(0)));
        return Promise.resolve(
          encodeGitAnswer(
            Buffer.from(fx.trackedFiles.map((one) => `${one}${NUL}`).join(''), 'utf8')
          )
        );
      }
      const wanted = (args[2] ?? '').split('\n').filter((one) => one.length > 0);
      const byPath = new Map(fx.treeFacts.map((row) => [row.path, row]));
      return Promise.resolve(
        encodeReadAnswer(
          wanted.map((path) => {
            const row = byPath.get(path);
            return {
              path,
              text:
                row === undefined
                  ? ''
                  : fileTextFor(path, row.lines, row.declares)
            };
          })
        )
      );
    };
    const farGit = remoteArch.createRemoteArchGitRunner(farRunner, '/far/repo');
    const listed = await farGit.run(guard.lsFilesCall());
    const farTracked = listed.code === 0 ? readLsFiles(listed.stdout) : [];
    const farRecords = remoteArch.parseArchReadAnswer(
      await farRunner('arch-read', [
        '/far/repo',
        '',
        fx.treeFacts.map((row) => row.path).join('\n'),
        ''
      ])
    );
    // The tree facts REBUILT from the bytes that came back, through the same
    // two pure readers `readArchTreeFacts` uses on a file it opened here.
    const farTreeFacts = farRecords
      .filter((record) => record.kind === 'F' && record.content !== null)
      .map((record) => ({
        path: record.path,
        lines: tree.countLines(record.content as Buffer),
        declares: tree.declaredNameOf(
          record.path.split('/').pop() ?? record.path,
          (record.content as Buffer).toString('utf8')
        )
      }));
    const farComposed = map.composeArchMap({
      ...input,
      trackedFiles: farTracked,
      treeFacts: farTreeFacts
    });

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
    // The machine arm's own answer, in the SAME shape, so the gate can pin it
    // against the SAME expectations rather than against a second table.
    out[`${name}@machine`] = {
      sentence: farComposed.sentence,
      words: sentence.wordCount(farComposed.sentence),
      boxes: farComposed.groups.map((g) => ({
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
      edges: farComposed.edges.map((e) => `${e.from}>${e.to}:${String(e.count)}`),
      repeatable: true,
      drill: null,
      // What really crossed, so a run that carried nothing cannot read as a
      // run that carried everything.
      carried: {
        trackedFiles: farTracked.length,
        treeFacts: farTreeFacts.length
      }
    } satisfies Composed & { carried: { trackedFiles: number; treeFacts: number } };
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
