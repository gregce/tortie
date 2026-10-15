/**
 * THE CORPORA OF `measure:p3471`, BUILT THE SAME WAY EVERY RUN (Phase 347.1).
 *
 * build/p3471/SPEC.md §7.1 and §7.2 are the definition and this file is that
 * definition as code. Phase 347's three reverifies judged the join over three
 * corpora that lived in a scratch directory and are gone; Phase 347.1 rebuilt
 * them here, committed and deterministic, so the next round inherits the
 * instrument rather than re-deriving it (the spec's D8). The same inputs give
 * the same layouts, byte for byte, and each corpus's count and the sha256 of
 * `JSON.stringify(layouts)` are pinned below: the measurement prints a moved
 * pin as a line and still runs, the self-test fails on it, and
 * `node build/p3471/corpora.mjs --repin` prints the new constants for a
 * deliberate change and writes nothing.
 *
 * - `list`: list items under a folder, the shape the three reverifies named:
 *   every 13th folder of this repository at `5f5efba2`, its first two
 *   children, ten pairings of a folder row over an item row, under twelve
 *   gutters at four shortfalls from the last column.
 * - `prose`: every 150th path of the repository, spelled relative, absolute
 *   and under `~`, in twelve sentences an agent writes, at fourteen widths,
 *   through three wraps: a word wrapper, issue 40's own breaker (after a `/`
 *   or a `-`) and the terminal's soft wrap.
 * - `captures`: every committed screen under `build/fixtures/questions/` and
 *   `build/fixtures/reply/`, at its widest row and three columns wider.
 *
 * HIS RULED ROUND (2026-10-14) added two classes the three above could not
 * show, because none of their rows is wider than its pane and none of their
 * paths lies outside the project, and both wrong-file opens of this phase's
 * fix rounds lived exactly there:
 *
 * - `list-outside` and `prose-outside`: the absolute and `~/` layouts of
 *   `list` and `prose` with the path in ANOTHER folder of the same length,
 *   `/q/tortie/` for `/r/tortie/` and `~/tortiq/` for `~/tortie/` (the home
 *   is `/r`, so `~/tortiq/` is `/r/tortiq/`, beside the project). A join cut
 *   short there reads its lower rows as a RELATIVE path, which resolves
 *   against the project and opens the project's own file of that name: the
 *   reverify's 118 wrong opens.
 * - `<corpus>-stale` for each of the five: every layout drawn again with
 *   cells past the pane's width, which xterm's alternate buffer keeps when a
 *   pane narrows (it has no reflow) and `translateToString(true)` still
 *   answers, three ways (the reverify's): `prev` the cells another layout of
 *   the same corpus drew past the width at a wider pane, `glue` a path-shaped
 *   leftover glued onto the last cell of every full row, and `spaced` one on
 *   every row a blank cell past the width. Each keeps its `clean` rows, the
 *   same screen as a fresh repaint draws it, which is what makes "a join that
 *   opens a file the screen does not name" a thing the comparison can count.
 *
 * HIS ABSOLUTE-ONLY ROUND (2026-10-14, "Join absolute paths only", SPEC §7.2b
 * and D17) added what the ten could not show: every one wraps at the pane's
 * own width, and the class this phase kept missing lives where an agent's
 * breaks sit NARROWER than the pane (its past output after a person widened
 * the pane, which tmux never rejoins, or a TUI wrapping short of its edge).
 * There a boundary J3 or J7 refuses only stops the walk, the rows on either
 * side are pieces of their own, and a lower piece of a path printed in
 * another worktree read as a RELATIVE path and opened the project's own copy
 * (the reverify's census, 4,031 of 1,474,667 real layouts).
 *
 * - `prose-margin`: `prose`'s thirty paths in five spellings (the two outside
 *   ones among them), the census's six sentences with their hanging indents,
 *   at five widths, each broken by the census's two breakers at 1 to 13 cells
 *   short of the pane (`marginWrap`: issue 40's `agent` and wrap-ansi's
 *   `hard` mode, which Ink draws an agent's text with).
 * - `listing`: `find`'s output, three consecutive paths a line in this
 *   project and in the other folder, flush or indented, by the terminal's
 *   own wrap and both breakers.
 * - Every list and prose layout, and every stale and margin one, carries
 *   `printed`, the spellings the screen printed, so the comparison can tell
 *   a join that names a printed path from one that names a piece of it.
 * - Every corpus that prints a path in another folder is `twin`: the
 *   comparison also reads it with that folder's tree beside the project's,
 *   the census's setup, where a cut's relative tail opens the project's copy.
 *
 * THE FIX ROUND OF HIS ABSOLUTE-ONLY ROUND (2026-10-14) added the breakers the
 * attack lens cut with and no corpus drew, because J11 had read one column for
 * every row a breaker cut, which is wrap-ansi's hard mode alone:
 *
 * - `prose-cutters`: `prose-margin`'s paths, spellings, sentences and widths,
 *   at 0 to 13 cells short of the pane, broken by Python's textwrap (after a
 *   `-` between letters, a long word cut at the limit or after its last `-`),
 *   by Rust's textwrap first fit (after a `-` between letters or digits, a
 *   fragment longer than a row chunked at the limit), by a breaker that breaks
 *   BEFORE every `/` and after every `-` (no real breaker does; the attack's
 *   hostile one), and by Ink (wrap-ansi's hard mode) over three sentences that
 *   carry an emoji, counted as Ink's string-width counts it (two cells) while
 *   the corpus draws it as Tortie's xterm does (one), so the row holding it
 *   ends a column early. Since the reverify of 2026-10-15 it also draws every
 *   listed path holding `--` (one), after the thirty, because Python's
 *   textwrap breaks BEFORE a run of `--` and no path of the thirty held one.
 *   Since his overflow round (2026-10-15) it also draws, after all of those,
 *   Python's textwrap with `break_long_words=False` over the six sentences:
 *   a chunk longer than its limit on a row of its own, soft-wrapped at the
 *   pane's edge as the terminal draws it, so the text before a run of `--`
 *   can overflow above a row starting with the run.
 *
 * Cells are counted by `cellsOf` from `./stage.mjs`, the gate's own, and never
 * by string length. The wrappers below measure code points because the spec
 * gives them that way (§7.2), and they are copied from it byte for byte.
 *
 * Reads only this repository's committed files. Starts nothing, writes nothing.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellsOf } from './stage.mjs';

export type CorpusName =
  | 'list'
  | 'prose'
  | 'captures'
  | 'list-outside'
  | 'prose-outside'
  | 'list-stale'
  | 'prose-stale'
  | 'captures-stale'
  | 'list-outside-stale'
  | 'prose-outside-stale'
  | 'prose-margin'
  | 'listing'
  | 'prose-cutters';

export const CORPUS_NAMES: readonly CorpusName[] = [
  'list',
  'prose',
  'captures',
  'list-outside',
  'prose-outside',
  'list-stale',
  'prose-stale',
  'captures-stale',
  'list-outside-stale',
  'prose-outside-stale',
  'prose-margin',
  'listing',
  'prose-cutters'
];

/** The corpora whose layouts carry cells past the pane's width, and their source. */
export const STALE_OF: Readonly<Partial<Record<CorpusName, CorpusName>>> = {
  'list-stale': 'list',
  'prose-stale': 'prose',
  'captures-stale': 'captures',
  'list-outside-stale': 'list-outside',
  'prose-outside-stale': 'prose-outside'
};

/** One screen: the rows as drawn and the pane's width in cells. */
export interface Layout {
  shape: string;
  width: number;
  rows: string[];
  /**
   * A stale layout's rows as a fresh repaint draws them at this width: the
   * same cells up to the width and nothing past it (his ruled round). Absent
   * on every other layout, so the three original corpora's pins hold.
   */
  clean?: string[];
  /**
   * The spellings the screen printed (his absolute-only round, SPEC §7.2b):
   * the paths a join may name. A `list` layout's two rows and the one path a
   * terminal wrap of the two would draw on the same cells; a `prose` layout's
   * `{p}` (its folder in the folder template), its `{q}` and `README.md` when
   * the sentence prints them; a margin layout's path; a listing's three; a
   * stale layout its source's. Absent on the captures, whose paths are not
   * known, and kept after `clean` so the pins read one order.
   */
  printed?: string[];
}

/** A corpus, and the pane it is read in: its project and its home. */
export interface Corpus {
  name: CorpusName;
  base: string;
  home: string;
  /** True when the `repo` regime (this repository's own tree) applies. */
  repo: boolean;
  /**
   * True when the corpus prints a path in ANOTHER folder (his absolute-only
   * round), so the `twin` regime applies: this repository's tree under the
   * project AND under the other folder, the census's setup, where a join cut
   * short opens the project's own copy of a tail. Not a layout field, so no
   * pin moves for it.
   */
  twin: boolean;
  layouts: Layout[];
}

const HERE = dirname(fileURLToPath(import.meta.url));

/** The repository root this file sits in. */
export const ROOT = join(HERE, '..', '..');

/** `git ls-tree -r --name-only 5f5efba2`, committed (§7.1). */
export const REPO_PATHS = join(HERE, 'fixtures', 'repo-paths.txt');
export const REPO_PATHS_LINES = 4_376;
export const REPO_PATHS_SHA256 =
  '7be107842a808e811803518b535d675be1a3e810759674ea678fa08084db7727';

/**
 * THE PINS. A deliberate change to a generator or to its inputs moves these in
 * the same commit, from `--repin`'s output, and the commit body says why.
 * His absolute-only round moved eight on purpose (every list and prose layout,
 * and every stale one drawn from them, gained `printed`; no count moved) and
 * added `prose-margin` and `listing`, each pin computed by the spec twice and
 * by a second spelling of the generator (SPEC §7.2b). Its fix round added
 * `prose-cutters`, generated twice to one sha256 and a second time with
 * Python's own textwrap, a first fit written in Python and the real wrap-ansi
 * in place of this file's three breakers, to the same count and sha256 (SPEC
 * §As built, absolute only: the fix round); no other pin moved. Its reverify
 * (2026-10-15) moved `prose-cutters` alone on purpose, 69,008 layouts
 * (`efc2ddb8…`) to 72,680 (`c8b4af05…`): the listed path holding `--` is
 * drawn after the thirty, every earlier layout first and in its order (SPEC
 * §As built, the -- refusal). His overflow round (2026-10-15) moved
 * `prose-cutters` alone on purpose again, 72,680 layouts (`c8b4af05…`) to
 * 75,230 (`2297b71d…`): Python's textwrap with `break_long_words=False` over
 * the six sentences, each row wider than the pane soft-wrapped at its edge,
 * over the thirty and the listed `--` path (1,667 layouts) and then over
 * `overflowNames`' three (883), appended after every earlier layout, whose
 * first 72,680 still hash to `c8b4af05…`; generated twice to one sha256, the
 * breaker answering what Python's own `textwrap.wrap(...,
 * break_long_words=False)` answers on all 71,400 inputs it is handed, and no
 * other pin moved (SPEC §As built, the overflow refusal).
 */
export const PINS: Readonly<Record<CorpusName, { count: number; sha256: string }>> = {
  list: {
    count: 21_444,
    sha256: 'cc83f921149946d380780ddda5d63957fb7cdf40cef2526e7af95bc65a3935e0'
  },
  prose: {
    count: 45_360,
    sha256: '0404250ada7face32b245e5ee9e5e91b6a28896d0ca816460336474cca283ca8'
  },
  captures: {
    count: 5_020,
    sha256: 'bbbf451e0e9036e29ac2b057fec92fcc06df9b1a60f83152d9f66d9123613dc2'
  },
  'list-outside': {
    count: 12_492,
    sha256: 'b4da9e3bdf3d750ec42a86df10ebd3ab159e1a466593d95117cfd590d3def84b'
  },
  'prose-outside': {
    count: 30_240,
    sha256: '6231426024f34700c933f08c025c2f263d42aedf16ff7f67ff9eecc4375d3fcd'
  },
  'list-stale': {
    count: 36_608,
    sha256: '18a0a68764e47ce264414f01c0e81e7d41de1f764eec05f9e854e1268140f532'
  },
  'prose-stale': {
    count: 80_642,
    sha256: '22a754bcd452c08e4223343ae07eedd8d504949ac00c1f5a5fe4abf7741feece'
  },
  'captures-stale': {
    count: 7_641,
    sha256: 'd32201fd5ca8f106730f49b2db13c8e3c99edb55600d33301f12b51be021d452'
  },
  'list-outside-stale': {
    count: 21_085,
    sha256: '3512a604aeb728a339a1370dfa9480019ae30182db60ab1c4f33585498d03f74'
  },
  'prose-outside-stale': {
    count: 54_942,
    sha256: '2e2f7c95f9fba7ab79d55309073b45a6e7095a37983c0863b6ac092d74e83acc'
  },
  'prose-margin': {
    count: 40_185,
    sha256: 'c682754e9a7aa27712773692129fd2d899465c4f4c24e08856bb627b134e2477'
  },
  listing: {
    count: 5_798,
    sha256: 'd71bc44b018bad007d760f2689882f532f37a2646a6eeffad9b6a09669326d00'
  },
  'prose-cutters': {
    count: 75_230,
    sha256: '2297b71d773d78c845bee00ae040141f8dbdce7d99084afb0064c9124b07f1f3'
  }
};

/** The pane the list and prose corpora are read in, and its home. */
export const REPO_BASE = '/r/tortie';
export const REPO_HOME = '/r';

/** The pane the captures are read in: not this repository, so no `repo` regime. */
export const CAPTURE_BASE = '/work/project';
export const CAPTURE_HOME = '/Users/me';

/**
 * ANOTHER FOLDER, SPELLED IN AS MANY CELLS (his ruled round): the absolute
 * and `~/` roots the outside corpora print, each the length of the one it
 * stands for, so every layout breaks at the same cells as its inside twin.
 */
export const OUTSIDE_ROOT = '/q/tortie';
export const OUTSIDE_TILDE = '~/tortiq';

/** Thrown when the committed path list is not the pinned one; the entry exits 2. */
export class InputMoved extends Error {}

/** Cells as xterm draws them, through the gate's own `cellsOf`. */
export function cells(text: string): number {
  return (cellsOf(text) as unknown[]).length;
}

/** Every row is held as drawn: trailing whitespace removed. */
export function drawn(row: string): string {
  return row.replace(/\s+$/, '');
}

/** The sha256 of a corpus's layouts, the pin's second half. */
export function digest(layouts: Layout[]): string {
  return createHash('sha256').update(JSON.stringify(layouts)).digest('hex');
}

/**
 * The committed path list, refused (InputMoved) when it is not the pinned one,
 * because every list and prose layout is drawn from it.
 */
export function readRepoPaths(): string[] {
  return parseRepoPaths(readFileSync(REPO_PATHS));
}

/** The path list's bytes, refused (InputMoved) unless they are the pinned ones. */
export function parseRepoPaths(bytes: Buffer): string[] {
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== REPO_PATHS_SHA256) {
    throw new InputMoved(
      `build/p3471/fixtures/repo-paths.txt reads sha256 ${sha}, and ${REPO_PATHS_SHA256} is pinned`
    );
  }
  const paths = bytes.toString('utf8').split('\n').filter((l) => l.length > 0);
  if (paths.length !== REPO_PATHS_LINES) {
    throw new InputMoved(
      `build/p3471/fixtures/repo-paths.txt holds ${String(paths.length)} paths, and ${String(REPO_PATHS_LINES)} are pinned`
    );
  }
  return paths;
}

// ---------------------------------------------------------------------------
// THE LIST CORPUS (§7.2)

/** The twelve gutters an item can be drawn under. */
export const GUTTERS = ['', '• ', '- ', '* ', '1. ', '  ', '│ ', '⎿  ', '> ', '⏺ ', '├ ', '└ '];

/** How many cells short of the last column the folder row ends. */
export const SHORTFALLS = [0, 1, 2, 3];

export function listCorpus(paths: string[], where: 'inside' | 'outside' = 'inside'): Corpus {
  const root = where === 'inside' ? REPO_BASE : OUTSIDE_ROOT;
  const tilde = where === 'inside' ? '~/tortie' : OUTSIDE_TILDE;
  // Every proper prefix of a listed path is a folder; its immediate children
  // are a file as its name and a folder as `name/`.
  const kidsOf = new Map<string, Set<string>>();
  for (const path of paths) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      const folder = parts.slice(0, i).join('/');
      let kids = kidsOf.get(folder);
      if (kids === undefined) {
        kids = new Set();
        kidsOf.set(folder, kids);
      }
      kids.add(`${parts[i] ?? ''}${i < parts.length - 1 ? '/' : ''}`);
    }
  }
  const folders = [...kidsOf.keys()].sort();
  const picked = folders.filter((_, i) => i % 13 === 0);
  const layouts: Layout[] = [];
  for (const d of picked) {
    const kids = [...(kidsOf.get(d) ?? [])].sort().slice(0, 2);
    for (const [ci, c] of kids.entries()) {
      const c2 = kids.length === 2 ? kids[1 - ci] : undefined;
      const pairs: [string, string, string][] = [
        ['rel-folder/rootrel', `${d}/`, `${d}/${c}`],
        ['rel-folder/child', `${d}/`, c],
        ['abs-folder/child', `${root}/${d}/`, c],
        ['abs-folder/rootrel', `${root}/${d}/`, `${d}/${c}`],
        ['tilde-folder/child', `${tilde}/${d}/`, c],
        ['abs-folder/root-item', `${root}/${d}/`, 'package.json'],
        ['rel-folder/root-item', `${d}/`, 'package.json']
      ];
      // A name whose first `-` is neither its first nor its last character
      // (both readings of §7.2 give the pinned count): the piece up to and
      // including it, over the rest of the child.
      const name = c.endsWith('/') ? c.slice(0, -1) : c;
      const dash = name.indexOf('-');
      if (dash > 0 && dash < name.length - 1) {
        const piece = name.slice(0, dash + 1);
        const rest = c.slice(dash + 1);
        pairs.push(['rel-dash/rest', `${d}/${piece}`, rest]);
        pairs.push(['abs-dash/rest', `${root}/${d}/${piece}`, rest]);
      }
      if (c2 !== undefined) pairs.push(['rel-file/next', `${d}/${c}`, `${d}/${c2}`]);
      for (const [shape, a, b] of pairs) {
        // Outside, only the layouts that print a path in the other folder.
        if (where === 'outside' && !/^(abs|tilde)-/.test(shape)) continue;
        for (const gutter of GUTTERS) {
          const top = gutter + a;
          const low = gutter + b;
          for (const short of SHORTFALLS) {
            const width = cells(top) + short;
            if (cells(low) > width) continue;
            // What it printed: its two spellings, and the one path a
            // terminal wrap of the two would draw on the same cells, so a join
            // to it is the ambiguity the per-cell rule already judges (J5).
            layouts.push({ shape, width, rows: ['Files:', top, low, '', '> '].map(drawn), printed: [a, b, a + b] });
          }
        }
      }
    }
  }
  return {
    name: where === 'inside' ? 'list' : 'list-outside',
    base: REPO_BASE,
    home: REPO_HOME,
    repo: true,
    twin: where === 'outside',
    layouts
  };
}

// ---------------------------------------------------------------------------
// THE PROSE CORPUS (§7.2)

/** The twelve sentences, in order; `{p}` the path, `{q}` the partner. */
export const TEMPLATES = [
  'I updated {p} to fix the race.',
  'See {p} for the details, then run the tests again.',
  'Wrote the notes to {p}',
  'The plan is written down at {p}:134 and the rest follows.',
  'Moved {p} into place; the old copy is gone.',
  'Two files changed: {p} and {q}.',
  'Read `{p}` before editing anything else.',
  'Everything is in the folder (see {p}).',
  '  ⎿  Wrote 12 lines to {p}',
  '⏺ Update({p})',
  '  2. Yes, and open {p} for this session (p)',
  'Created {p}, {q}, and README.md beside them.'
];

/**
 * The template that names `{p}`'s FOLDER, up to and including its last `/`.
 * Zero-based, as the prototype measured in the spec's §2.2 numbered it: the
 * one that reads "Moved {p} into place".
 */
export const FOLDER_TEMPLATE = 4;

export const WIDTHS = [24, 31, 38, 45, 47, 52, 60, 67, 74, 80, 88, 96, 104, 120];

export const SPELLINGS = ['rel', 'abs', 'tilde'] as const;

// THE THREE WRAPS, byte for byte as build/p3471/SPEC.md §7.2 gives them.
export function wordWrap(line: string, w: number): string[] {      // a word wrapper; a token wider than the row is cut at the width
  const rows: string[] = []; let row = '';
  for (const tok of line.split(' ')) {
    const sep = row === '' ? '' : ' ';
    if ([...row].length + sep.length + [...tok].length <= w) { row += sep + tok; continue; }
    if (row !== '') rows.push(row);
    let rest = tok;
    while ([...rest].length > w) { rows.push([...rest].slice(0, w).join('')); rest = [...rest].slice(w).join(''); }
    row = rest;
  }
  rows.push(row); return rows;
}
export function agentWrap(line: string, w: number): string[] {     // issue 40's breaker: a token that does not fit breaks after a / or -
  const rows: string[] = []; let row = '';
  for (const tok of line.split(' ')) {
    const sep = row === '' ? '' : ' ';
    if ([...row].length + sep.length + [...tok].length <= w) { row += sep + tok; continue; }
    let first = true;
    for (const u of tok.split(/(?<=[/-])/)) {
      const s = first ? sep : '';
      if ([...row].length + s.length + [...u].length <= w) { row += s + u; first = false; continue; }
      if (row !== '') rows.push(row);
      let rest = u;
      while ([...rest].length > w) { rows.push([...rest].slice(0, w).join('')); rest = [...rest].slice(w).join(''); }
      row = rest; first = false;
    }
  }
  rows.push(row); return rows;
}
export function softWrap(line: string, w: number): string[] {      // the terminal's own wrap
  const cs = [...line]; const rows: string[] = [];
  for (let i = 0; i < cs.length; i += w) rows.push(cs.slice(i, i + w).join(''));
  return rows;
}

const WRAPS: [string, (line: string, w: number) => string[]][] = [
  ['word', wordWrap],
  ['agent', agentWrap],
  ['soft', softWrap]
];

function spell(path: string, kind: (typeof SPELLINGS)[number], where: 'inside' | 'outside' = 'inside'): string {
  if (kind === 'rel') return path;
  if (kind === 'abs') return `${where === 'inside' ? REPO_BASE : OUTSIDE_ROOT}/${path}`;
  return `${where === 'inside' ? '~/tortie' : OUTSIDE_TILDE}/${path}`;
}

/** A spelling's folder, up to and including its last `/`; a bare name is kept. */
function folderOf(spelling: string): string {
  const slash = spelling.lastIndexOf('/');
  return slash === -1 ? spelling : spelling.slice(0, slash + 1);
}

export function proseCorpus(paths: string[], where: 'inside' | 'outside' = 'inside'): Corpus {
  const files = paths.filter((_, i) => i % 150 === 0);
  const layouts: Layout[] = [];
  for (const [i, f] of files.entries()) {
    const q = files[(i + 7) % files.length] ?? f;
    // Outside, only the spellings that name the other folder.
    for (const kind of where === 'inside' ? SPELLINGS : SPELLINGS.filter((k) => k !== 'rel')) {
      for (const [t, template] of TEMPLATES.entries()) {
        const p = t === FOLDER_TEMPLATE ? folderOf(spell(f, kind, where)) : spell(f, kind, where);
        // A function replacement, so a `$` in a path is never read as a
        // replacement pattern.
        const line = template.replace('{p}', () => p).replace('{q}', () => spell(q, kind, where));
        // What it printed: `{p}` as put (the folder in the folder template),
        // `{q}` when the sentence has one, and `README.md` when it names it.
        const printed = [
          p,
          ...(template.includes('{q}') ? [spell(q, kind, where)] : []),
          ...(template.includes('README.md') ? ['README.md'] : [])
        ];
        for (const width of WIDTHS) {
          for (const [wrap, fn] of WRAPS) {
            layouts.push({
              shape: `${wrap}/${kind}/t${String(t)}`,
              width,
              rows: ['', ...fn(line, width), '', '> '].map(drawn),
              printed
            });
          }
        }
      }
    }
  }
  return {
    name: where === 'inside' ? 'prose' : 'prose-outside',
    base: REPO_BASE,
    home: REPO_HOME,
    repo: true,
    twin: where === 'outside',
    layouts
  };
}

// ---------------------------------------------------------------------------
// THE CAPTURES CORPUS (§7.1, §7.2)

/** Escape sequences and control characters but `\n`, removed from a reply file. */
export function stripEscapes(text: string): string {
  return text
    .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][A-Za-z0-9]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

/** Every committed capture, as `{ shape, rows }`, in the spec's order. */
export function committedCaptures(root: string = ROOT): { shape: string; rows: string[] }[] {
  const out: { shape: string; rows: string[] }[] = [];
  const questions = join(root, 'build', 'fixtures', 'questions');
  for (const name of readdirSync(questions).filter((n) => n.endsWith('.jsonl')).sort()) {
    for (const line of readFileSync(join(questions, name), 'utf8').split('\n')) {
      if (line.length === 0) continue;
      const record = JSON.parse(line) as { id?: unknown; rows?: unknown };
      if (!Array.isArray(record.rows) || record.rows.length === 0) continue;
      const id = typeof record.id === 'string' ? record.id : name;
      out.push({ shape: id.replace(/-\d+$/, ''), rows: record.rows.map((r) => String(r)) });
    }
  }
  const reply = join(root, 'build', 'fixtures', 'reply');
  for (const name of readdirSync(reply).filter((n) => n.endsWith('.txt') || n.endsWith('.ansi')).sort()) {
    out.push({ shape: name, rows: stripEscapes(readFileSync(join(reply, name), 'utf8')).split('\n') });
  }
  return out;
}

export function capturesCorpus(root: string = ROOT): Corpus {
  const layouts: Layout[] = [];
  for (const capture of committedCaptures(root)) {
    const rows = capture.rows.map(drawn);
    // A screen of blank rows is still a screen one cell wide.
    const w0 = Math.max(1, ...rows.map(cells));
    for (const extra of [0, 1, 2, 3]) layouts.push({ shape: capture.shape, width: w0 + extra, rows });
  }
  return { name: 'captures', base: CAPTURE_BASE, home: CAPTURE_HOME, repo: false, twin: false, layouts };
}

// ---------------------------------------------------------------------------
// THE STALE-TAIL CORPORA (his ruled round, the reverify's three ways)

/** What a leftover past the width is spelled with, in the `glue` and `spaced` variants. */
export const LEFTOVERS = ['de', 'x', '/a', '-b', '.md', '1', 'zz/', 'ts', '_2', 'b/c.md'];

function padTo(row: string, width: number): string {
  return row + ' '.repeat(Math.max(0, width - cells(row)));
}

/** The cells `from..to` (0-based, `to` excluded) of a row, a blank cell read as a space. */
function cellsBetween(row: string, from: number, to: number): string {
  const at = cellsOf(row) as { chars: string; width: number }[];
  return at
    .slice(from, to)
    .map((c) => (c.chars === '' ? ' ' : c.chars))
    .join('');
}

/**
 * Every layout of `source` drawn again with cells past its width, three
 * ways, each variant that changed no row left out (it is the source layout,
 * already measured):
 *
 * - `prev`: a pane `1 + i % 12` cells wider drew layout `(i * 7919 + 13) % N`
 *   of the same corpus, then narrowed to this width and drew this layout's
 *   rows over it; each row keeps what the wider frame drew past the width.
 * - `glue`: every full row carries a leftover glued onto its last cell.
 * - `spaced`: every row carries a leftover one blank cell past the width.
 */
export function staleCorpus(source: Corpus, name: CorpusName): Corpus {
  const n = source.layouts.length;
  const layouts: Layout[] = [];
  for (const [i, l] of source.layouts.entries()) {
    const width = l.width;
    const prev = source.layouts[(i * 7919 + 13) % n] ?? l;
    const wider = width + 1 + (i % 12);
    const variants: [string, string[]][] = [
      [
        'prev',
        l.rows.map((r, k) => {
          const tail = cellsBetween(prev.rows[k] ?? '', width, wider);
          return tail.trim() === '' ? r : drawn(padTo(r, width) + tail);
        })
      ],
      [
        'glue',
        l.rows.map((r, k) =>
          cells(r) === width && r.trim() !== '' ? r + (LEFTOVERS[(i + k) % LEFTOVERS.length] ?? 'x') : r
        )
      ],
      ['spaced', l.rows.map((r, k) => drawn(`${padTo(r, width)} ${LEFTOVERS[(i + 3 * k) % LEFTOVERS.length] ?? 'x'}`))]
    ];
    for (const [variant, rows] of variants) {
      if (rows.every((r, k) => r === l.rows[k])) continue;
      layouts.push({
        shape: `${l.shape}/${variant}`,
        width,
        rows,
        clean: l.rows,
        ...(l.printed === undefined ? {} : { printed: l.printed })
      });
    }
  }
  return { ...source, name, layouts };
}

// ---------------------------------------------------------------------------
// THE MARGIN CORPORA (his absolute-only round, build/p3471/SPEC.md §7.2b)

/** The census's six sentences, each with the hanging indent its continuation rows take. */
export const MARGIN_SENTENCES: readonly (readonly [string, string, string])[] = [
  ['claude', '⏺ Updated {p}:134 and ran the tests.', '  '],
  ['plain', 'I updated the test in {p}:134 today.', ''],
  ['wrote', '  ⎿  Wrote 12 lines to {p}', '     '],
  ['codex', '• Edited {p} (+3 -1)', '  '],
  ['tick', 'Read `{p}` before editing anything else.', ''],
  ['end', 'The plan is written down at {p}:134', '']
];

export const MARGIN_WIDTHS = [38, 47, 56, 72, 96];

/** How many cells short of the pane's width the breaker wraps: its limit is W - m. */
export const MARGINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** The five spellings, in order: the project's three, then the other folder's two (the outside corpora's). */
export const MARGIN_SPELLINGS: readonly (readonly [string, (p: string) => string])[] = [
  ['rel', (p) => p],
  ['abs', (p) => `${REPO_BASE}/${p}`],
  ['tilde', (p) => `~/tortie/${p}`],
  ['other', (p) => `${OUTSIDE_ROOT}/${p}`],
  ['other-tilde', (p) => `${OUTSIDE_TILDE}/${p}`]
];

/**
 * The census's two breakers (the reverify's `rv2/tool/realcut.mts` `wrap`,
 * the same behaviour), at a `limit` narrower than the pane, continuation rows
 * starting with `indent`: `agent` (issue 40's) breaks a token that does not
 * fit after its last `/` or `-` that fits, cutting a unit wider than a row at
 * the limit; `hard` (wrap-ansi's hard mode, which Ink draws an agent's text
 * with) moves a token that fits a whole row to the next one, and cuts a
 * longer one at the limit wherever it falls, starting on the current row. A
 * leading run of spaces in the line stays on its first row.
 */
export function marginWrap(kind: 'agent' | 'hard', line: string, limit: number, indent: string): string[] {
  const len = (t: string): number => [...t].length;
  const rows: string[] = [];
  let row = '';
  const room = (): number => limit - len(row);
  const push = (): void => {
    rows.push(row);
    row = indent;
  };
  const lead = /^ */.exec(line)?.[0] ?? '';
  row = lead;
  for (const tok of line.slice(lead.length).split(' ')) {
    const sep = row.trim() === '' ? '' : ' ';
    if (len(sep) + len(tok) <= room()) {
      row += sep + tok;
      continue;
    }
    if (kind === 'agent') {
      let first = true;
      for (const u of tok.split(/(?<=[/-])/)) {
        const s = first ? sep : '';
        if (len(s) + len(u) <= room()) {
          row += s + u;
          first = false;
          continue;
        }
        if (row.trim() !== '') push();
        let rest = u;
        while (len(rest) > room()) {
          const k = room();
          row += [...rest].slice(0, k).join('');
          rest = [...rest].slice(k).join('');
          push();
        }
        row += rest;
        first = false;
      }
    } else {
      const full = limit - len(indent);
      if (len(tok) <= full) {
        if (row.trim() !== '') push();
        row += tok;
        continue;
      }
      let rest = (row.trim() === '' ? '' : sep) + tok;
      while (len(rest) > room()) {
        const k = room();
        row += [...rest].slice(0, k).join('');
        rest = [...rest].slice(k).join('');
        push();
      }
      row += rest;
    }
  }
  rows.push(row);
  return rows;
}

/**
 * `prose`'s thirty paths (every 150th listed), each spelling, each sentence,
 * each width, each margin and each breaker, in that order; a layout whose
 * width and rows an earlier one already drew is left out.
 */
export function proseMarginCorpus(paths: string[]): Corpus {
  const picked = paths.filter((_, i) => i % 150 === 0);
  const layouts: Layout[] = [];
  const seen = new Set<string>();
  for (const f of picked) {
    for (const [spelling, spellAs] of MARGIN_SPELLINGS) {
      for (const [sentence, template, indent] of MARGIN_SENTENCES) {
        const p = spellAs(f);
        const line = template.replace('{p}', () => p);
        for (const width of MARGIN_WIDTHS) {
          for (const m of MARGINS) {
            for (const kind of ['agent', 'hard'] as const) {
              const rows = ['', ...marginWrap(kind, line, width - m, indent), '', '> '].map(drawn);
              const key = `${String(width)}|${rows.join('\n')}`;
              if (seen.has(key)) continue;
              seen.add(key);
              layouts.push({ shape: `${kind}/m${String(m)}/${spelling}/${sentence}`, width, rows, printed: [p] });
            }
          }
        }
      }
    }
  }
  return { name: 'prose-margin', base: REPO_BASE, home: REPO_HOME, repo: true, twin: true, layouts };
}

/**
 * `find`'s output: for every listed index `i` with `i % 150 === 0` and
 * `i + 2` listed, the three paths `i` to `i + 2` spelled in this project and
 * then in the other folder, flush or under a two-space indent, at each width,
 * by the terminal's own wrap at the width and by both breakers at each
 * margin; repeated layouts left out.
 */
export function listingCorpus(paths: string[]): Corpus {
  const layouts: Layout[] = [];
  const seen = new Set<string>();
  for (let i = 0; i + 2 < paths.length; i += 1) {
    if (i % 150 !== 0) continue;
    for (const [spelling, spellAs] of MARGIN_SPELLINGS.filter(([s]) => s === 'abs' || s === 'other')) {
      const printed = [paths[i], paths[i + 1], paths[i + 2]].map((p) => spellAs(p ?? ''));
      for (const indent of ['', '  ']) {
        for (const width of MARGIN_WIDTHS) {
          for (const kind of ['soft', 'agent', 'hard'] as const) {
            for (const m of kind === 'soft' ? [0] : MARGINS) {
              const body = printed.flatMap((p) =>
                kind === 'soft' ? softWrap(indent + p, width) : marginWrap(kind, indent + p, width - m, indent)
              );
              const rows = ['$ find .', ...body, '', '> '].map(drawn);
              const key = `${String(width)}|${rows.join('\n')}`;
              if (seen.has(key)) continue;
              seen.add(key);
              layouts.push({
                shape: `${kind}/m${String(m)}/${spelling}/${indent === '' ? 'flush' : 'indent'}`,
                width,
                rows,
                printed
              });
            }
          }
        }
      }
    }
  }
  return { name: 'listing', base: REPO_BASE, home: REPO_HOME, repo: true, twin: true, layouts };
}

// ---------------------------------------------------------------------------
// THE CUTTERS CORPUS (the fix round of his absolute-only round)

/**
 * Rows of at most `limit` cells, the first under no indent and every other
 * under `indent`, filled first-fit from `frags` (each a piece of the text and
 * the spaces after it), a fragment wider than its row cut into rows of the
 * row's width first. The fit of Rust's textwrap with `break_words`, and of
 * the attack's hostile breaker.
 */
function firstFitRows(frags: { text: string; spaces: number }[], limit: number, indent: string): string[] {
  const len = (t: string): number => [...t].length;
  const width = limit - len(indent);
  const pieces: { text: string; spaces: number }[] = [];
  for (const f of frags) {
    const cps = [...f.text];
    if (cps.length <= width) {
      pieces.push(f);
      continue;
    }
    for (let i = 0; i < cps.length; i += width) {
      pieces.push({ text: cps.slice(i, i + width).join(''), spaces: i + width >= cps.length ? f.spaces : 0 });
    }
  }
  const rows: string[] = [];
  let row = '';
  let used = 0;
  for (const p of pieces) {
    const room = (rows.length === 0 ? limit : width) - used;
    if (used > 0 && len(p.text) > room) {
      rows.push(row);
      row = indent;
      used = 0;
    }
    row += p.text + ' '.repeat(p.spaces);
    used += len(p.text) + p.spaces;
  }
  rows.push(row);
  return rows;
}

/** The text's words, each split by `split`, the last piece of each word keeping the one space after it. */
function fragmentsOf(line: string, split: (word: string) => string[]): { text: string; spaces: number }[] {
  const words = line.split(' ').filter((w) => w.length > 0);
  const out: { text: string; spaces: number }[] = [];
  words.forEach((word, i) => {
    const parts = split(word).filter((p) => p.length > 0);
    parts.forEach((p, k) => out.push({ text: p, spaces: k === parts.length - 1 && i < words.length - 1 ? 1 : 0 }));
  });
  return out;
}

/**
 * Python's textwrap (3.12) with its defaults, `break_on_hyphens` and
 * `break_long_words` (its `wordsep_re`, `_wrap_chunks` and
 * `_handle_long_word`, for this corpus's ASCII words), the first row under
 * no indent and every other under `indent`, rows of `limit` code points with
 * the indent counted. With `breakLongWords` false (his overflow round,
 * 2026-10-15) it is `break_long_words=False`: a chunk longer than its row is
 * never cut, and goes on a row of its own when the row is empty, overflowing
 * it, exactly as `_handle_long_word` keeps it intact.
 */
export function textwrapWrap(line: string, limit: number, indent: string, breakLongWords = true): string[] {
  const sep = /(\s+|(?<=[\w!"'&.,?])-{2,}(?=\w)|\S+?(?:-(?:(?<=[A-Za-z_]{2}-)|(?<=[A-Za-z_]-[A-Za-z_]-))(?=[A-Za-z_]-?[A-Za-z_])|(?=\s|$)|(?<=[\w!"'&.,?])(?=-{2,}\w)))/;
  const len = (t: string): number => [...t].length;
  const chunks = line.split(sep).filter((c) => c !== '');
  chunks.reverse();
  const rows: string[] = [];
  while (chunks.length > 0) {
    const lead = rows.length === 0 ? '' : indent;
    const width = limit - len(lead);
    const cur: string[] = [];
    let curLen = 0;
    if ((chunks[chunks.length - 1] ?? '').trim() === '' && rows.length > 0) chunks.pop();
    while (chunks.length > 0) {
      const l = len(chunks[chunks.length - 1] ?? '');
      if (curLen + l > width) break;
      cur.push(chunks.pop() ?? '');
      curLen += l;
    }
    const next = chunks[chunks.length - 1];
    if (next !== undefined && len(next) > width && !breakLongWords) {
      if (cur.length === 0) cur.push(chunks.pop() ?? '');
    } else if (next !== undefined && len(next) > width) {
      const spaceLeft = width < 1 ? 1 : width - curLen;
      const cps = [...next];
      let end = spaceLeft;
      if (cps.length > spaceLeft) {
        const hyphen = cps.slice(0, spaceLeft).lastIndexOf('-');
        if (hyphen > 0 && cps.slice(0, hyphen).some((c) => c !== '-')) end = hyphen + 1;
      }
      cur.push(cps.slice(0, end).join(''));
      chunks[chunks.length - 1] = cps.slice(end).join('');
      if (chunks[chunks.length - 1] === '') chunks.pop();
    }
    if (cur.length > 0 && (cur[cur.length - 1] ?? '').trim() === '') cur.pop();
    if (cur.length > 0) rows.push(lead + cur.join(''));
  }
  return rows;
}

/**
 * A row as the terminal draws it in a pane `width` cells wide: a row wider
 * than the pane soft-wrapped at its edge, a glyph that would straddle the
 * edge moved whole to the next row, each cell counted by `cells`. Python's
 * textwrap with `break_long_words=False` leaves a row longer than its limit,
 * and this is what the pane then shows.
 */
export function paneRows(row: string, width: number): string[] {
  const out: string[] = [];
  let cur = '';
  let used = 0;
  for (const c of row) {
    const w = cells(c);
    if (used > 0 && used + w > width) {
      out.push(cur);
      cur = '';
      used = 0;
    }
    cur += c;
    used += w;
  }
  out.push(cur);
  return out;
}

/** Rust's textwrap first fit with its `HyphenSplitter` (after a `-` between letters or digits) and `break_words`. */
export function hyphenWrap(line: string, limit: number, indent: string): string[] {
  return firstFitRows(
    fragmentsOf(line, (w) => w.split(/(?<=[A-Za-z0-9]-)(?=[A-Za-z0-9])/)),
    limit,
    indent
  );
}

/** The attack's HOSTILE breaker: a break before every `/` and after every `-`, fragments wider than a row chunked. */
export function slashWrap(line: string, limit: number, indent: string): string[] {
  return firstFitRows(
    fragmentsOf(line, (w) => w.split(/(?<=.)(?=\/)|(?<=-)(?=[^-])/)),
    limit,
    indent
  );
}

/**
 * The cells Ink's string-width counts: two for an emoji drawn as one
 * (`Emoji_Presentation`, or a pictograph a variation selector 16 follows),
 * none for a variation selector, a joiner or a combining mark, one for the
 * rest of this corpus's characters. Tortie's xterm draws each emoji in ONE.
 */
export function inkCells(text: string): number {
  const cps = [...text];
  let n = 0;
  cps.forEach((c, i) => {
    const cp = c.codePointAt(0) ?? 0;
    if ((cp >= 0xfe00 && cp <= 0xfe0f) || cp === 0x200d || (cp >= 0x0300 && cp <= 0x036f)) return;
    if (/\p{Emoji_Presentation}/u.test(c) || (cps[i + 1] === '\uFE0F' && /\p{Extended_Pictographic}/u.test(c))) n += 2;
    else n += 1;
  });
  return n;
}

/**
 * wrap-ansi 7's `exec` with Ink's options (`hard: true`, `trim: false`) and
 * no escapes, its widths counted by `inkCells` as string-width counts them:
 * a space is put before every word but the first, so a row that was exactly
 * full starts the next one with it; a word that does not fit moves to a new
 * row; and a word wider than `columns` starts on this row unless that costs a
 * break, then is cut a character at a time (`wrapWord`).
 */
export function wrapAnsiHard(text: string, columns: number): string[] {
  const rows: string[] = [''];
  const words = text.split(' ');
  const at = (): string => rows[rows.length - 1] ?? '';
  const set = (row: string): void => {
    rows[rows.length - 1] = row;
  };
  words.forEach((word, index) => {
    let rowLength = inkCells(at());
    const length = inkCells(word);
    if (index !== 0) {
      if (rowLength >= columns) {
        rows.push('');
        rowLength = 0;
      }
      set(at() + ' ');
      rowLength += 1;
    }
    if (length > columns) {
      const remaining = columns - rowLength;
      const thisLine = 1 + Math.floor((length - remaining - 1) / columns);
      const nextLine = Math.floor((length - 1) / columns);
      if (nextLine < thisLine) rows.push('');
      let visible = inkCells(at());
      const chars = [...word];
      chars.forEach((c, k) => {
        const w = inkCells(c);
        if (visible + w <= columns) set(at() + c);
        else {
          rows.push(c);
          visible = 0;
        }
        visible += w;
        if (visible === columns && k < chars.length - 1) {
          rows.push('');
          visible = 0;
        }
      });
      if (visible === 0 && at().length > 0 && rows.length > 1) {
        const last = rows.pop() ?? '';
        set(at() + last);
      }
      return;
    }
    if (rowLength + length > columns && rowLength > 0 && length > 0) rows.push('');
    set(at() + word);
  });
  return rows;
}

/**
 * Ink: `wrapAnsiHard` over the text past the gutter at the pane's limit less
 * the gutter, each row drawn after the gutter (the first) or the hanging
 * indent of the same width (every other), as Ink's Box draws them.
 */
export function inkWrap(line: string, limit: number, indent: string): string[] {
  const gutter = line.slice(0, indent.length);
  return wrapAnsiHard(line.slice(indent.length), limit - inkCells(indent)).map(
    (r, k) => (k === 0 ? gutter : indent) + r
  );
}

/** The three cutters over the census's six sentences. */
export const CUTTERS: readonly (readonly [string, (line: string, limit: number, indent: string) => string[]])[] = [
  ['textwrap', textwrapWrap],
  ['hyphen', hyphenWrap],
  ['slash', slashWrap]
];

/** Ink's three sentences that carry an emoji, each with its hanging indent. */
export const EMOJI_SENTENCES: readonly (readonly [string, string, string])[] = [
  ['check', '⏺ ✅ Updated {p}:134 and ran the tests.', '  '],
  ['warn', '⚠️ Saved {p} before the build.', ''],
  ['two', '🚀 ✅ Shipped {p} now.', '']
];

/**
 * `prose-margin`'s thirty paths in its five spellings, at its five widths and
 * 0 to 13 cells short of the pane: the three cutters over its six sentences,
 * then Ink over the three emoji sentences, in that order; a layout whose width
 * and rows an earlier one drew is left out, and a row wider than its pane in
 * cells is a fault of this file and throws.
 *
 * THEN every listed path holding `--` that the thirty do not (the reverify of
 * 2026-10-15): Python's textwrap breaks BEFORE a run of two or more `-` that
 * a word character precedes and follows, and no path of the thirty holds one,
 * so the corpus never drew the break J11 read as a cut at the limit. The list
 * holds one, `docs/research/assets/63-fixtures/pi-sessions--Users-example-
 * rookery--/…jsonl`, the reverify's own shape. Appended after the thirty, so
 * every layout the round before drew is still drawn first, in its order.
 */
/**
 * The names the overflow refusal is measured on (his overflow round,
 * 2026-10-15): every 75th path of the list, 45 characters or longer, that
 * Python's textwrap keeps as ONE chunk (no `-` between letters, where its
 * `wordsep_re` would break first), printed with `--old.md` after it. Python's
 * textwrap breaks before that run, and with `break_long_words=False` it
 * overflows the path on a row of its own above the run, so a join of the
 * overflow names the list's own file, the text before `--`, which the screen
 * does not name: the reverify's and the re-checker's hostile tree, here this
 * repository's own, read by the doors as every other layout is.
 */
export function overflowNames(paths: string[]): string[] {
  const whole = paths.filter((p) => p.length >= 45 && !/[A-Za-z_]{2}-[A-Za-z_]|[A-Za-z_]-[A-Za-z_]-/.test(p));
  return whole.filter((_, i) => i % 75 === 0).map((p) => `${p}--old.md`);
}

export function proseCuttersCorpus(paths: string[]): Corpus {
  const every = paths.filter((_, i) => i % 150 === 0);
  const picked = [...every, ...paths.filter((p, i) => i % 150 !== 0 && p.includes('--'))];
  const layouts: Layout[] = [];
  const seen = new Set<string>();
  const add = (shape: string, width: number, body: string[], p: string): void => {
    const rows = ['', ...body, '', '> '].map(drawn);
    for (const r of rows) if (cells(r) > width) throw new Error(`prose-cutters: ${shape} drew ${JSON.stringify(r)} wider than ${String(width)}`);
    const key = `${String(width)}|${rows.join('\n')}`;
    if (seen.has(key)) return;
    seen.add(key);
    layouts.push({ shape, width, rows, printed: [p] });
  };
  for (const f of picked) {
    for (const [spelling, spellAs] of MARGIN_SPELLINGS) {
      const p = spellAs(f);
      for (const [sentence, template, indent] of MARGIN_SENTENCES) {
        const line = template.replace('{p}', () => p);
        for (const width of MARGIN_WIDTHS) {
          for (const m of [0, ...MARGINS]) {
            for (const [kind, wrap] of CUTTERS) add(`${kind}/m${String(m)}/${spelling}/${sentence}`, width, wrap(line, width - m, indent), p);
          }
        }
      }
      for (const [sentence, template, indent] of EMOJI_SENTENCES) {
        const line = template.replace('{p}', () => p);
        for (const width of MARGIN_WIDTHS) {
          for (const m of [0, ...MARGINS]) add(`ink/m${String(m)}/${spelling}/${sentence}`, width, inkWrap(line, width - m, indent), p);
        }
      }
    }
  }
  // THEN Python's textwrap with `break_long_words=False` over the six
  // sentences (his overflow round, 2026-10-15), each row longer than the
  // pane soft-wrapped at its edge as the terminal draws it (`paneRows`): a
  // chunk longer than its limit is put on a row of its own, so the text
  // before a run of `--` overflows above a row starting with the run, the
  // shape J11's overflow refusal reads. Over the thirty and the listed `--`
  // path, then over `overflowNames`, the list's own files with `--old.md`
  // after them, because the listed `--` path breaks after `pi-` first and
  // never leaves the shape. Appended after every layout the round before
  // drew, so each is still drawn first and in its order.
  for (const f of [...picked, ...overflowNames(paths)]) {
    for (const [spelling, spellAs] of MARGIN_SPELLINGS) {
      const p = spellAs(f);
      for (const [sentence, template, indent] of MARGIN_SENTENCES) {
        const line = template.replace('{p}', () => p);
        for (const width of MARGIN_WIDTHS) {
          for (const m of [0, ...MARGINS]) {
            const body = textwrapWrap(line, width - m, indent, false).flatMap((r) => paneRows(r, width));
            add(`textwrap-nolong/m${String(m)}/${spelling}/${sentence}`, width, body, p);
          }
        }
      }
    }
  }
  return { name: 'prose-cutters', base: REPO_BASE, home: REPO_HOME, repo: true, twin: true, layouts };
}

// ---------------------------------------------------------------------------

/** One corpus by name. Every corpus but the captures refuses a moved path list. */
export function corpusOf(name: CorpusName): Corpus {
  const source = STALE_OF[name];
  if (source !== undefined) return staleCorpus(corpusOf(source), name);
  if (name === 'list') return listCorpus(readRepoPaths());
  if (name === 'prose') return proseCorpus(readRepoPaths());
  if (name === 'list-outside') return listCorpus(readRepoPaths(), 'outside');
  if (name === 'prose-outside') return proseCorpus(readRepoPaths(), 'outside');
  if (name === 'prose-margin') return proseMarginCorpus(readRepoPaths());
  if (name === 'listing') return listingCorpus(readRepoPaths());
  if (name === 'prose-cutters') return proseCuttersCorpus(readRepoPaths());
  return capturesCorpus();
}

/** A corpus against its pins: the lines that moved, empty when none did. */
export function pinsMoved(corpus: Corpus): string[] {
  const pin = PINS[corpus.name];
  const moved: string[] = [];
  if (corpus.layouts.length !== pin.count) {
    moved.push(
      `${corpus.name}: ${String(corpus.layouts.length)} layouts, and ${String(pin.count)} are pinned`
    );
  }
  const sha = digest(corpus.layouts);
  if (sha !== pin.sha256) moved.push(`${corpus.name}: sha256 ${sha}, and ${pin.sha256} is pinned`);
  return moved;
}
