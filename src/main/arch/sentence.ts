/**
 * Rule S, the sentence, and rule R, the repository line (Phase 201, research
 * 77 sections 4.3 and 4.6).
 *
 * `NAME: SIZE, LANGUAGE; MADE OF; WIRING; ENTRY.` A clause with nothing to say
 * is left out. Every clause is a fact the scan produced and nothing here
 * needs judgement, which is why the sentence can sit on the face of a box
 * without a chip saying whose words they are. Measured over the 28 reading
 * boxes of gmux, rookery and ripgrep: 16 to 31 words, median 23, and useful
 * 25 times without reservation.
 *
 * Pure. `npm run conformance:reading` runs this module under node over three
 * committed fixtures and pins every sentence byte for byte, and fails one
 * clause at a time under ablation, so a wording change is a deliberate act in
 * two files.
 */

import type { ArchReadingBox, ArchReadingExtension } from './reading';
import { bareName } from './reading';
import { READING_FOLD_ID, READING_FOLD_LABEL } from './skeleton';

/** The language bucket an extension belongs to. Unknown ones read as `.ext files`. */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  mts: 'TypeScript',
  cts: 'TypeScript',
  js: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  jsx: 'JavaScript',
  go: 'Go',
  rs: 'Rust',
  py: 'Python',
  pyi: 'Python',
  rb: 'Ruby',
  swift: 'Swift',
  kt: 'Kotlin',
  kts: 'Kotlin',
  m: 'Objective-C',
  h: 'C headers',
  c: 'C',
  cc: 'C++',
  cpp: 'C++',
  java: 'Java',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  md: 'Markdown',
  mdx: 'Markdown',
  json: 'JSON',
  jsonl: 'JSON lines',
  yml: 'YAML',
  yaml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  sh: 'shell scripts',
  bash: 'shell scripts',
  png: 'images',
  jpg: 'images',
  jpeg: 'images',
  svg: 'images',
  gif: 'images',
  webp: 'images',
  icns: 'images',
  txt: 'text files',
  log: 'log files',
  csv: 'CSV',
  sql: 'SQL',
  gpx: 'GPX tracks',
  plist: 'plists',
  wasm: 'wasm binaries',
  lock: 'lock files',
  patch: 'patches',
  conf: 'config files',
  '(none)': 'files with no extension'
};

const NO_EXTENSION = 'files with no extension';

/** One language bucket, its file count, and whether this build parses it. */
export interface ArchLanguageBucket {
  name: string;
  files: number;
  parsed: boolean;
}

/** Extensions folded into language buckets, most files first, ties by name. */
export function languageBuckets(
  extensions: readonly ArchReadingExtension[]
): ArchLanguageBucket[] {
  const by = new Map<string, ArchLanguageBucket>();
  for (const { ext, files, parsed } of extensions) {
    const name = LANGUAGE_NAMES[ext] ?? `.${ext} files`;
    const held = by.get(name);
    if (held === undefined) by.set(name, { name, files, parsed });
    else {
      held.files += files;
      held.parsed = held.parsed || parsed;
    }
  }
  return [...by.values()].sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
}

/**
 * Rule L, the language phrase. Buckets are counted by file; a bucket this
 * build parses leads when it holds a fifth or more of the files, and files
 * with no extension never lead. X alone at 95 percent, mostly X at half, X and
 * Y when the second holds a fifth, else X and other files.
 */
export function languagePhrase(
  files: number,
  extensions: readonly ArchReadingExtension[]
): string {
  const h = languageBuckets(extensions).filter((b) => b.name !== NO_EXTENSION);
  const first = h[0];
  if (first === undefined || files === 0) return NO_EXTENSION;
  const lead = h.find((b) => b.parsed && b.files / files >= 0.2) ?? first;
  const share = lead.files / files;
  if (share >= 0.95) return lead.name;
  if (share >= 0.5) return `mostly ${lead.name}`;
  const second = h.find((b) => b !== lead && b.files / files >= 0.2);
  if (second !== undefined) return `${lead.name} and ${second.name}`;
  return `${lead.name} and other files`;
}

/** Rule N, the name: the directory, plus the declared name in brackets when it differs. */
export function nameOf(box: ArchReadingBox): string {
  if (box.id === READING_FOLD_ID) return READING_FOLD_LABEL;
  const dir =
    box.commonDir !== '' && box.commonDir !== box.dir && box.commonDir.startsWith(box.dir)
      ? box.commonDir
      : box.dir;
  const root = box.declared.find(
    (d) => d.name !== null && d.path.split('/').length === dir.split('/').length + 1
  );
  if (root?.name != null && root.name !== dir && root.name !== bareName(dir)) {
    return `${dir} (${root.name})`;
  }
  return dir;
}

/** The name with any bracket dropped, which is what a partner is called. */
export function plainNameOf(box: ArchReadingBox): string {
  return nameOf(box).replace(/ \(.*\)$/, '');
}

const n = (value: number): string => value.toLocaleString('en-US');
const plural = (count: number, one: string, many = `${one}s`): string =>
  `${n(count)} ${count === 1 ? one : many}`;

/** File names that name a role in the tree rather than a part. */
const ROLE_STEMS: ReadonlySet<string> = new Set([
  'lib',
  'mod',
  'index',
  'main',
  '__init__',
  'package',
  'types'
]);
const stem = (name: string): string => name.replace(/\.[^.]+$/, '');

/**
 * Rule M, made of. A source root is transparent. When loose files at the root
 * outnumber the largest child folder, the files are the structure: their stems
 * clustered on the first token, named with a star when two or more clusters
 * have three members, else the five biggest files by lines skipping role
 * names. Otherwise the five biggest child folders. `and N more` counts folders
 * and files alike.
 */
export function madeOf(box: ArchReadingBox): string {
  if (box.id === READING_FOLD_ID) {
    const named = box.children.slice(0, 6).map((c) => c[0]);
    const more = box.children.length - named.length;
    const parts: string[] = [];
    if (named.length > 0) {
      parts.push(
        `${plural(box.children.length, 'small folder')} (${named.join(', ')}${more > 0 ? ` and ${n(more)} more` : ''})`
      );
    }
    if (box.loose > 0) parts.push(plural(box.loose, 'root file'));
    return parts.join(' and ');
  }
  const kids = box.srcChildren;
  const loose = box.looseSrcFiles;
  const largest = kids[0]?.[1] ?? 0;
  if (loose.length > 0 && loose.length >= largest) {
    const clusters = new Map<string, number>();
    for (const [name] of loose) {
      const key = (stem(name).split(/[-_.]/)[0] ?? '').toLowerCase();
      clusters.set(key, (clusters.get(key) ?? 0) + 1);
    }
    const big = [...clusters.entries()]
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    let named: string[];
    let covered: number;
    if (big.length >= 2) {
      named = big.slice(0, 5).map(([k]) => `${k}*`);
      covered = big.slice(0, 5).reduce((sum, [, c]) => sum + c, 0);
    } else {
      named = loose
        .map(([name]) => stem(name))
        .filter((s) => !ROLE_STEMS.has(s))
        .slice(0, 5);
      if (named.length === 0) named = loose.slice(0, 5).map(([name]) => stem(name));
      covered = named.length;
    }
    const more = loose.length - covered + kids.length;
    return `made of ${named.join(', ')}${more > 0 ? ` and ${n(more)} more` : ''}`;
  }
  if (kids.length === 0) return plural(box.loose, 'loose file');
  const named = kids.slice(0, 5).map((c) => bareName(c[0]));
  const more = kids.length - named.length + loose.length;
  return `made of ${named.join(', ')}${more > 0 ? ` and ${n(more)} more` : ''}`;
}

/**
 * A partner qualifies at a twentieth of the strongest partner that way and a
 * hundredth of the writing box's own resolved imports, so one stray import
 * never reads as a dependency beside hundreds and a crate whose every
 * crossing is one use line still names its neighbours.
 */
function qualify(
  partners: readonly { id: string; count: number }[],
  floorOf: (p: { id: string; count: number }) => number
): { id: string; count: number }[] {
  const top = partners[0]?.count ?? 0;
  return partners.filter((p) => p.count >= Math.max(1, top / 20, floorOf(p)));
}

/**
 * Rule W, the wiring. Partners each way in count order, at most two named,
 * and with no partner: not code, not code apart from N files, self contained,
 * imports not followed, or no imports either way.
 */
export function wiring(
  box: ArchReadingBox,
  labels: ReadonlyMap<string, string>,
  resolvedOf: ReadonlyMap<string, number>
): string {
  const name = (id: string): string => labels.get(id) ?? id;
  const qIn = qualify(box.partnersIn, (p) => (resolvedOf.get(p.id) ?? 0) / 100);
  const qOut = qualify(box.partnersOut, () => box.imports.resolved / 100);
  const ins = qIn.slice(0, 2).map((p) => name(p.id));
  const outs = qOut.slice(0, 2).map((p) => name(p.id));
  const moreIn = qIn.length - ins.length;
  const moreOut = qOut.length - outs.length;
  const inS =
    ins.length > 0
      ? `used by ${ins.join(' and ')}${moreIn > 0 ? ` and ${n(moreIn)} more` : ''}`
      : '';
  const outS =
    outs.length > 0
      ? `uses ${outs.join(' and ')}${moreOut > 0 ? ` and ${n(moreOut)} more` : ''}`
      : '';
  if (inS !== '' && outS !== '') return `${inS}; ${outS}`;
  if (inS !== '') return `${inS}; uses no other part`;
  if (outS !== '') return `${outS}; no other part uses it`;
  if (box.parseable === 0) return 'not code';
  if (box.parseable / box.files < 0.1) return `not code apart from ${plural(box.parseable, 'file')}`;
  if (box.interiorImports > 0) {
    return `self contained (${plural(box.interiorImports, 'import')} inside, none across)`;
  }
  if (box.imports.unresolved > box.imports.resolved) {
    return `imports not followed (${n(box.imports.unresolved)} of ${n(box.imports.total)} unresolved)`;
  }
  if (box.imports.resolved > 0) return 'self contained (no import crosses to another part)';
  return 'no imports either way';
}

/** Rule E, the entry: the shallowest file whose name is an entry by convention. */
export function entryOf(box: ArchReadingBox): string {
  if (box.id === READING_FOLD_ID) return '';
  const e = box.entries[0];
  return e === undefined ? '' : `entry ${e}`;
}

/**
 * Rule S without its name: `SIZE, LANGUAGE; MADE OF; WIRING; ENTRY.` This is
 * what the face draws under the name, and `${nameOf(box)}: ${clauses}` is the
 * whole sentence research 77 pinned.
 */
export function sentenceOf(
  box: ArchReadingBox,
  labels: ReadonlyMap<string, string>,
  resolvedOf: ReadonlyMap<string, number>
): string {
  const clauses = [
    `${plural(box.files, 'file')}, ${languagePhrase(box.files, box.extensions)}`,
    madeOf(box),
    wiring(box, labels, resolvedOf),
    entryOf(box)
  ].filter((c) => c !== '');
  return `${clauses.join('; ')}.`;
}

/** A symbol kind's plural. */
function kindWord(kind: string, count: number): string {
  if (count === 1) return kind;
  if (kind === 'class') return 'classes';
  if (kind === 'property') return 'properties';
  return `${kind}s`;
}

/**
 * The ten lines behind a box's hover, in this fixed order, each left out when
 * it has nothing to say: size, languages, definitions, declared names,
 * entries, imports, used by, uses, folders, also holds.
 */
export function hoverFacts(
  box: ArchReadingBox,
  labels: ReadonlyMap<string, string>
): string[] {
  const name = (id: string): string => labels.get(id) ?? id;
  const languages = languageBuckets(box.extensions)
    .slice(0, 5)
    .map((b) => `${b.name} ${n(b.files)}`)
    .join(', ');
  const kinds = box.symbolKinds
    .slice(0, 4)
    .map(([k, c]) => `${n(c)} ${kindWord(k, c)}`)
    .join(', ');
  return [
    `Size: ${plural(box.files, 'file')}, ${plural(box.lines, 'line')}`,
    `Languages: ${languages}`,
    box.defined > 0 ? `Defines: ${kinds}` : 'Defines: nothing this build reads',
    box.declared.length > 0
      ? `Declares: ${box.declared
          .slice(0, 4)
          .map((d) => `${d.kind} ${d.name ?? '(unnamed)'}`)
          .join(', ')}`
      : '',
    box.entries.length > 0 ? `Entries: ${box.entries.slice(0, 4).join(', ')}` : '',
    `Imports: ${n(box.imports.total)} written, ${n(box.imports.resolved)} to this repository, ${n(box.imports.external)} to dependencies, ${n(box.imports.unresolved)} not followed`,
    box.partnersIn.length > 0
      ? `Used by: ${box.partnersIn.map((p) => `${name(p.id)} ${n(p.count)}`).join(', ')}`
      : '',
    box.partnersOut.length > 0
      ? `Uses: ${box.partnersOut.map((p) => `${name(p.id)} ${n(p.count)}`).join(', ')}`
      : '',
    box.children.length > 0
      ? `Folders: ${box.children.map((c) => `${bareName(c[0])} ${n(c[1])}`).join(', ')}`
      : '',
    box.mergedFrom.length > 0 ? `Also holds: ${box.mergedFrom.join(', ')}` : ''
  ].filter((line) => line !== '');
}

/** What rule R is given. */
export interface ArchRepositoryFacts {
  files: number;
  totalImports: number;
  resolvedImports: number;
  /** How many distinct box to box connections the rollup drew. */
  connections: number;
}

/**
 * Rule R, the repository line: size and language over the whole tree, how
 * many parts, the biggest and its share, the connections between parts, and
 * how many imports lead inside the repository. The subject is NOT in it: it
 * is the name row above the line on every face, as the mock draws it, and
 * `${subject}: ${line}` is the whole sentence research 77 pinned.
 */
export function repositoryLine(
  facts: ArchRepositoryFacts,
  boxes: readonly ArchReadingBox[]
): string {
  const ext = new Map<string, ArchReadingExtension>();
  for (const b of boxes) {
    for (const e of b.extensions) {
      const held = ext.get(e.ext);
      if (held === undefined) ext.set(e.ext, { ...e });
      else {
        held.files += e.files;
        held.parsed = held.parsed || e.parsed;
      }
    }
  }
  const big =
    [...boxes].filter((b) => b.id !== READING_FOLD_ID).sort((a, b) => b.files - a.files)[0] ??
    boxes[0];
  const biggest =
    big === undefined || facts.files === 0
      ? ''
      : `, the biggest ${plainNameOf(big)} (${String(Math.round((100 * big.files) / facts.files))}%)`;
  return (
    `${plural(facts.files, 'file')}, ${languagePhrase(facts.files, [...ext.values()])}; ` +
    `${plural(boxes.length, 'part')}${biggest}; ` +
    `${plural(facts.connections, 'connection')} between parts; ` +
    `${n(facts.resolvedImports)} of ${n(facts.totalImports)} imports lead inside the repository.`
  );
}

/** How many words a sentence carries, the measure the research reports. */
export function wordCount(sentence: string): number {
  return sentence.split(/\s+/).filter((w) => w.length > 0).length;
}
