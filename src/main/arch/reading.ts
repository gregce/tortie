/**
 * The per box facts behind the reading (Phase 201, research 77 section 4).
 *
 * Pure. Data in, facts out. No clock, no file read, no process, no store.
 * Everything here is computed from what the caller already holds: the tracked
 * list from the one `git ls-files -z`, the import fact base out of `arch.db`,
 * the definition counts the SAME scan kept beside each file's imports, and
 * the line counts and declared names one read of the tree wrote down
 * (./tree-facts.ts). The composer in ./sentence.ts turns one of these boxes
 * into the sentence a person reads and the ten lines behind its hover, and
 * ./map.ts is the one caller that joins the two.
 *
 * The facts are the same for any partition. The map hands rule P's boxes in
 * at level 1 and the drilled part's modules at level 2, so one box shape
 * serves both, which is the one rule, two readers property Phase 160 set.
 */

import { commonDirOf, prefixAt, READING_FOLD_ID, type Group } from './skeleton';

/** One import as the fact base hands it. `toPath` is non null only when resolved. */
export interface ArchReadingImport {
  fromPath: string;
  toPath: string | null;
  resolution: string;
}

/** Everything the facts are built from. Every field comes from the fact base. */
export interface ArchReadingInput {
  trackedFiles: readonly string[];
  imports: readonly ArchReadingImport[];
  /** Whether this build parses a path. */
  parseable: (path: string) => boolean;
  /** Lines per tracked file, from the tree read. A file not listed counts zero. */
  lines: ReadonlyMap<string, number>;
  /** The declared name per manifest path, from the tree read. Null when unnamed. */
  declares: ReadonlyMap<string, string | null>;
  /** Definition counts by kind per parsed file, from the one scan. */
  kinds: ReadonlyMap<string, Readonly<Record<string, number>>>;
  /** The directories the fold holds, out of rule P. Empty for a drilled part. */
  folded: readonly string[];
  /** P6, the owner lookup over the same boxes, for the rollup. */
  ownerOf: (path: string) => string | undefined;
}

/** One extension, how many files wear it, and whether this build parses it. */
export interface ArchReadingExtension {
  ext: string;
  files: number;
  parsed: boolean;
}

/** One manifest at a box's root and the name it declares. */
export interface ArchReadingDeclared {
  path: string;
  name: string | null;
  /** The manifest's own file name, `package.json`, `Cargo.toml` and so on. */
  kind: string;
}

/** One partner box each way, with the count of resolved imports crossing. */
export interface ArchReadingPartner {
  id: string;
  count: number;
}

/** The facts of one box. Every number is a count the caller can re-derive. */
export interface ArchReadingBox {
  id: string;
  dir: string;
  /** The deepest directory every file shares; the honest label of a one child box. */
  commonDir: string;
  files: number;
  parseable: number;
  lines: number;
  /** Extensions by file count, most first. `(none)` is a file with no extension. */
  extensions: ArchReadingExtension[];
  imports: { total: number; resolved: number; external: number; unresolved: number };
  /** Resolved imports with both ends in this box and not the same file. */
  interiorImports: number;
  partnersOut: ArchReadingPartner[];
  partnersIn: ArchReadingPartner[];
  /** The child directories one level down with their counts, most first. */
  children: [string, number][];
  /** Files sitting directly in the box's directory. */
  loose: number;
  /** The children with a transparent source root opened up, for rule M. */
  srcChildren: [string, number][];
  /** The directory rule M reads loose files from: the source root, or the box. */
  effectiveRoot: string;
  /** The parsed files sitting directly at the effective root, biggest first. */
  looseSrcFiles: [string, number][];
  /** Directories folded in that do not sit under the box's own directory. */
  mergedFrom: string[];
  /** Definition counts by kind, most first. */
  symbolKinds: [string, number][];
  defined: number;
  declared: ArchReadingDeclared[];
  entries: string[];
}

/** The manifests a box root may hold, by file name. */
export const MANIFEST_NAMES: readonly string[] = [
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'Package.swift'
];

/** File names that are an entry by convention. */
const ENTRY_NAMES: ReadonlySet<string> = new Set([
  'index.ts',
  'index.tsx',
  'index.js',
  'index.mjs',
  'main.ts',
  'main.tsx',
  'main.js',
  'main.go',
  'main.rs',
  'lib.rs',
  '__main__.py',
  '__init__.py',
  'main.py',
  'app.py',
  'main.swift',
  'App.swift',
  'Main.kt',
  'main.kt',
  'MainActivity.kt',
  'cli.ts',
  'cli.js',
  'server.ts',
  'app.ts',
  'index.html'
]);

/** A source root is transparent: its children stand in for it (rule M). */
const TRANSPARENT_ROOTS: ReadonlySet<string> = new Set(['src', 'Sources', 'source', 'lib']);

/** The last path segment. */
export function bareName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

/** The extension a path wears, lower cased, or `(none)`. */
export function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  return dot > slash + 1 ? path.slice(dot + 1).toLowerCase() : '(none)';
}

/** The rank an entry file sorts by within one depth: index first, then main and lib. */
function entryRank(path: string): number {
  const name = bareName(path);
  if (name.startsWith('index.')) return 0;
  if (name.startsWith('main.') || name === 'lib.rs' || name === '__main__.py') return 1;
  return 2;
}

const byCountThenName = (a: [string, number], b: [string, number]): number =>
  b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

/** The facts of every box, in the order the boxes were given. */
export function readingFacts(
  groups: readonly Group[],
  input: ArchReadingInput
): ArchReadingBox[] {
  const { ownerOf } = input;
  const fileOwner = new Map<string, string>();
  for (const g of groups) for (const p of g.files) fileOwner.set(p, g.id);

  const resolved: { fromPath: string; toPath: string }[] = [];
  for (const fact of input.imports) {
    if (fact.toPath !== null && fact.resolution === 'first-party') {
      resolved.push({ fromPath: fact.fromPath, toPath: fact.toPath });
    }
  }

  // The rollup box to box under P6, the same arithmetic as
  // aggregateGroupEdges with the owner fallback handed in. Group ids are
  // kebab case out of groupId, so a space can never sit inside one.
  const counted = new Map<string, number>();
  for (const e of resolved) {
    const from = ownerOf(e.fromPath);
    const to = ownerOf(e.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from} ${to}`;
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  const edges = [...counted.entries()]
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => {
      const [from = '', to = ''] = key.split(' ');
      return { from, to, count };
    });

  const perBox = new Map<string, ArchReadingBox['imports']>();
  for (const g of groups) perBox.set(g.id, { total: 0, resolved: 0, external: 0, unresolved: 0 });
  for (const fact of input.imports) {
    const at = perBox.get(fileOwner.get(fact.fromPath) ?? '');
    if (at === undefined) continue;
    at.total += 1;
    if (fact.resolution === 'first-party') at.resolved += 1;
    else if (fact.resolution === 'external') at.external += 1;
    else at.unresolved += 1;
  }
  const interior = new Map<string, number>();
  for (const e of resolved) {
    const from = ownerOf(e.fromPath);
    if (from === undefined || from !== ownerOf(e.toPath) || e.fromPath === e.toPath) continue;
    interior.set(from, (interior.get(from) ?? 0) + 1);
  }

  return groups.map((box) => boxFacts(box, input, edges, perBox, interior));
}

function boxFacts(
  box: Group,
  input: ArchReadingInput,
  edges: readonly { from: string; to: string; count: number }[],
  perBox: ReadonlyMap<string, ArchReadingBox['imports']>,
  interior: ReadonlyMap<string, number>
): ArchReadingBox {
  const own = box.files;
  const isFold = box.id === READING_FOLD_ID;
  const ext = new Map<string, number>();
  const extParsed = new Map<string, boolean>();
  let lines = 0;
  let parseable = 0;
  const fileLines: [string, number][] = [];
  const kinds = new Map<string, number>();
  let defined = 0;
  const declared: ArchReadingDeclared[] = [];
  for (const p of own) {
    const parsed = input.parseable(p);
    if (parsed) parseable += 1;
    const e = extensionOf(p);
    ext.set(e, (ext.get(e) ?? 0) + 1);
    if (parsed) extParsed.set(e, true);
    const count = input.lines.get(p) ?? 0;
    lines += count;
    if (parsed) fileLines.push([p, count]);
    const found = input.kinds.get(p);
    if (found !== undefined) {
      for (const [kind, c] of Object.entries(found)) {
        kinds.set(kind, (kinds.get(kind) ?? 0) + c);
        defined += c;
      }
    }
    const name = bareName(p);
    if (MANIFEST_NAMES.includes(name)) {
      declared.push({ path: p, name: input.declares.get(p) ?? null, kind: name });
    }
  }
  declared.sort(
    (a, b) => a.path.split('/').length - b.path.split('/').length || (a.path < b.path ? -1 : 1)
  );

  const entries = own
    .filter((p) => ENTRY_NAMES.has(bareName(p)))
    .sort(
      (a, b) =>
        a.split('/').length - b.split('/').length ||
        entryRank(a) - entryRank(b) ||
        (a < b ? -1 : a > b ? 1 : 0)
    );

  // Children: one directory down, UNMERGED, by the shipping prefix rule.
  const depth = box.dir === '' ? 0 : box.dir.split('/').length;
  const kids = new Map<string, number>();
  let loose = 0;
  for (const p of own) {
    const dir = prefixAt(p, depth + 1);
    if (dir === null || dir === box.dir) loose += 1;
    else kids.set(dir, (kids.get(dir) ?? 0) + 1);
  }
  let children = [...kids.entries()].sort(byCountThenName);
  if (isFold) {
    children = input.folded
      .map((d): [string, number] => [d, own.filter((p) => p === d || p.startsWith(`${d}/`)).length])
      .sort(byCountThenName);
  }

  // A transparent source root's own children stand in for it (rule M).
  const rootChild = children.find(([d]) => TRANSPARENT_ROOTS.has(bareName(d)));
  let srcChildren = children;
  let effectiveRoot = box.dir;
  if (rootChild !== undefined && !isFold) {
    const root = rootChild[0];
    const rootDepth = root.split('/').length;
    const inner = new Map<string, number>();
    for (const p of own) {
      if (!p.startsWith(`${root}/`)) continue;
      const dir = prefixAt(p, rootDepth + 1);
      if (dir === null || dir === root) continue;
      inner.set(dir, (inner.get(dir) ?? 0) + 1);
    }
    srcChildren = [...inner.entries(), ...children.filter((c) => c !== rootChild)].sort(
      byCountThenName
    );
    effectiveRoot = root;
  }
  const looseSrcFiles = fileLines
    .filter(([p]) => p.split('/').slice(0, -1).join('/') === effectiveRoot)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([p, count]): [string, number] => [bareName(p), count]);

  const mergedFrom = isFold
    ? input.folded.filter((d) => d.includes('/')).sort()
    : [
        ...new Set(
          own
            .filter((p) => box.dir !== '' && !(p === box.dir || p.startsWith(`${box.dir}/`)))
            .map((p) => prefixAt(p, depth) ?? '(root)')
        )
      ].sort();

  return {
    id: box.id,
    dir: box.dir,
    commonDir: commonDirOf(own),
    files: own.length,
    parseable,
    lines,
    extensions: [...ext.entries()]
      .sort(byCountThenName)
      .map(([e, files]) => ({ ext: e, files, parsed: extParsed.get(e) === true })),
    imports: perBox.get(box.id) ?? { total: 0, resolved: 0, external: 0, unresolved: 0 },
    interiorImports: interior.get(box.id) ?? 0,
    partnersOut: edges.filter((e) => e.from === box.id).map((e) => ({ id: e.to, count: e.count })),
    partnersIn: edges.filter((e) => e.to === box.id).map((e) => ({ id: e.from, count: e.count })),
    children,
    loose,
    srcChildren,
    effectiveRoot,
    looseSrcFiles,
    mergedFrom,
    symbolKinds: [...kinds.entries()].sort(byCountThenName),
    defined,
    declared: declared.slice(0, 12),
    entries: entries.slice(0, 6)
  };
}
