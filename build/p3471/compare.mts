/**
 * THE PER-CELL COMPARISON OF `measure:p3471` (Phase 347.1, build/p3471/SPEC.md §7.3 to §7.6).
 *
 * WHAT A CELL OPENS. xterm 6.0.0 resolves a cell by asking every provider for
 * the HOVERED ROW only, drops any link that shares a column ON THAT ROW with an
 * earlier one (`Linkifier._removeIntersectingLinks`: a link that starts above
 * the row claims from column 0, one that ends below it claims to `cols`), and
 * takes the first remaining link whose range holds the cell in reading order
 * (`Linkifier._linkAtPosition`: `start.y * cols + start.x <= y * cols + x <=
 * end.y * cols + end.x`). So what a cell opens is a function of what
 * `provideLinks(<that cell's row>)` returns, and that is what this file reads,
 * through the SHIPPING `PathLinkProvider` of each build, staged by
 * `./stage.mjs` exactly as `conformance:pathdoors` stages it: every row hovered
 * top to bottom, every distinct link a row returns ACTIVATED once and what
 * reached `openInTortie` or `openOnMac` recorded (nothing, when the click's
 * fresh door refused), and the removal applied as xterm applies it. URL links
 * (`WebLinksAddon`, asked first and winning its own cells at both builds) are
 * not modelled.
 *
 * A REGRESSION is a cell where the parent opens a target `T` and HEAD opens
 * anything else: another target, a link that opens nothing, or no link, at
 * ANY moment xterm resolves it, the two builds driven by the same mouse. A
 * row's FIRST hover picks from the provider's reply BEFORE the removal
 * (`Linkifier` asks `_checkLinkProviderResult` and only then
 * `_removeIntersectingLinks`), and every later hover on that row from what the
 * removal kept, so a reply whose links share a column can open one file on
 * the first hover and another after it (the tooling review of 2026-10-13:
 * graded after the removal alone, a reply holding `[Y, X, T]`, X meeting Y and
 * removed, read T at cells X held on the first hover, and the measurement
 * printed PASS over it). And the link xterm opens is its CURRENT link, which
 * `_handleHover` keeps for as long as the mouse stays inside it, even after
 * the removal took it out of the row's reply: a first hover on a cell only X
 * holds, then a move onto a cell X shares with T, opens X there although
 * neither the first hover at that cell nor any later one would (the second
 * tooling review of 2026-10-13, measured against xterm 6.0.0's own
 * `Linkifier` driven by synthetic mouse events: a reply `[T, X]` with X
 * meeting T's first cell opens X at that cell, and the two moments read 0).
 * So on a row where either build's reply holds links that share a column,
 * the reading is the set of (parent, HEAD) current-link pairs one mouse can
 * reach on that row (`currentPairs`), which holds both moments above; on
 * every other row no two links share a cell, every moment is the one link
 * holding the cell, and the two moments are the whole reading. A GAIN is a
 * cell where the parent opens nothing and HEAD opens a target after the
 * removal. His rule, no scenario worse than today, is 0 regression cells on
 * every corpus, door and regime; the gain is reported.
 *
 * A FILE THE SCREEN DOES NOT NAME (his ruled round, 2026-10-14). A per-cell
 * count cannot see a join that opens the wrong file on cells where the parent
 * had no link, and both wrong opens of this phase's fix rounds were exactly
 * that: a join that read cells a narrowed pane left past its edge, and a
 * join cut where they sat whose lower rows opened the project's own file of a
 * tail's name. So every layout of a stale corpus carries its `clean` rows,
 * the same screen as a fresh repaint draws it, and the WRONG-FILE count is
 * the joins HEAD offers on the stale screen whose press opens a file and
 * which HEAD does not offer, at the same range opening the same file, on the
 * clean one. The cells a person sees are the same on both, so such a join
 * read or was cut by cells nobody sees. It must read 0 beside the regression
 * cells. HEAD's clean reading is taken only when the stale one has a join
 * that opens, and the census reads HEAD on the clean rows too, so `named`
 * holds every file either screen would ask for.
 *
 * WHAT THE SCREEN PRINTED (his absolute-only round, 2026-10-14, SPEC §7.7
 * and D17). Every generator before that round wrapped at the pane's own
 * width, so a join cut short below a breaker narrower than the pane never
 * arose here, and on a clean outside line a cut that opened the project's
 * own file of a tail's name counted as GAIN. So every list, prose, stale and
 * margin layout carries `printed`, the spellings its screen printed, and
 * two counts are taken beside the per-cell one:
 *
 * - THE PRINTED-PATH WRONG-FILE COUNT, on every line of every layout that
 *   carries `printed`: each HEAD link over two or more rows whose press
 *   opened something that is neither a printed spelling (resolved as the
 *   door resolves it) nor, where the regime holds it as a folder, an
 *   ancestor of one, unless a parent link on a row it covers opens the same
 *   path. It must read 0 on every `repo` and `twin` line; under `named` and
 *   `named-dirs`, which make every spelling either build asks exist, it is
 *   printed and not graded, and the cut report judges cuts instead.
 * - THE CUT REPORT, door-free: the judged build's own `joinedPathAt` on every
 *   hovered row of every layout that carries `printed`, a join whose target
 *   is not a printed spelling counted as a CUT of one kind, `relative`,
 *   `bottom-at-slash`, `bottom-at-dash`, `bottom-mid-name`, `top` or
 *   `other` (`cutKind`). `./corpora.mjs` requires 0 `relative` everywhere
 *   and 0 `top` and 0 `bottom-mid-name` on the prose family, `prose-margin`,
 *   `listing` and `prose-cutters`.
 *
 * THE DOORS, without a filesystem. A spelling resolves as `answerPathDoor`
 * resolves it: `~` and `~/…` expand against the corpus's home, an absolute
 * spelling is `path.posix.resolve`d, a relative one is resolved against the
 * base and carries `resolvedFrom: base`, and `~foo` or an empty spelling is
 * never joined. `files` is the SHIPPING `decidePathDoor` of HEAD over facts
 * the regime answers (`realPath` the resolved path when the regime holds it,
 * `kind` the regime's or `missing`, no bundle, no executable bit). `exists`
 * opens whatever the regime holds, a folder too, while a relative spelling
 * stays inside its base: the door a folder-accepting product would be.
 *
 * THE REGIMES, per layout. `repo` (list and prose): this repository's tree at
 * `5f5efba2` under `/r/tortie`, its files files and its folders folders.
 * `named`: every spelling either build asks the door about, while every row is
 * hovered under a door that accepts everything, is a FILE, so a fragment and
 * its join are both on disk, which the repository's own tree almost never is.
 * `named-dirs`: every spelling the PARENT asks about is a FOLDER and every
 * other asked spelling a file, so the existence door accepts a fragment the
 * files-only door refuses. `twin` (his absolute-only round, on every corpus
 * that prints a path in another folder): this repository's tree under the
 * project AND under `/q/tortie` and `/r/tortiq` (`~/tortiq/` under the home
 * `/r`), the census's setup modelled, so every printed path is a real file in
 * its own folder and every relative tail of one a real file in the project.
 *
 * Run only by `./corpora.mjs`, one tsx process per corpus, with `<stage>`
 * holding `parent/`, `head/` and, for `--plant` and the self-test, `plant/`
 * (HEAD with the governing rule removed), for the self-test
 * `plant-editor/` (HEAD with only the EDITOR door's answer counted as taken,
 * the fix round's) and `plant-off/` (HEAD with J9 removed whole), and for
 * `--plant-j9` and the self-test `plant-cut/` (HEAD with `joinedPathAt`'s J9
 * removed, so a chain is cut where it cannot read, as the fix round cut it),
 * and for `--plant-abs` and the self-test `plant-abs/` (HEAD with J10, his
 * ruling, removed) and for `--plant-j11` and the self-test `plant-j11/` (HEAD
 * with both halves of J11 removed):
 *   compare.mts --stage <dir> --doors <path-doors.ts> --corpus <name> [--plant | --plant-j9 | --plant-abs | --plant-j11]
 *   compare.mts --stage <dir> --doors <path-doors.ts> --self-test
 *   compare.mts --repin
 * The last line it prints is one JSON object. Exit 2 when it cannot run.
 *
 * THE SELF-TEST (§7.6) is S1 the arithmetic over stub providers, xterm's
 * removal, reading order and the current link among it, every expected count
 * read off xterm 6.0.0's own `Linkifier`; S2 the two doors and the three regimes;
 * S3 every generator twice against its pins, and a path list one byte off
 * refused; S4 `PLANTED_SHAPES`, every shape that re-pointed a link on Phase
 * 347's kept work, read 0 at HEAD and at least 1 with the rule planted out on
 * both doors, and (the Phase 347.1 fix round, lens A's ablation A1b, which
 * kept every corpus and the rest of this self-test green) a fragment the
 * IMAGE door opens and one the MAC door opens, which HEAD with only the
 * editor door's answer counted as taken must also read as regressions on the
 * files door, and as nothing on the existence door, which answers the editor
 * for everything; S5 HEAD against itself over 200 layouts of each corpus,
 * the wrong-file count taken on exactly the stale ones and reading 0; S6
 * (his ruled round) `STALE_SHAPES`, every layout where a build of this phase
 * opened a file the screen does not name, read 0 wrong-file opens and 0
 * regression cells at HEAD on both doors and at least one wrong-file open
 * under the plant it names; S6's three relative shapes are absolute twins
 * since his absolute-only round, because J10 refuses every relative chain
 * whatever J9 says. S7 (his absolute-only round) the cut report's kinds on a
 * table of one target per kind, an empty printed list read as no
 * requirement, and the J11 rows of the join builder's U7 read through the
 * staged `joinedPathAt`: no cut at HEAD, and a `top` cut, a `bottom-mid-name`
 * cut and a cut at both ends with J11 planted out, beside the reverify's E1
 * rows, no cut at HEAD and a `relative` one with J10 planted out. S8 the
 * printed-path count on stub providers: a join opening a printed path, its
 * folder under the existence door, a one-row link, a project copy of a printed
 * path's tail, and the same with the parent opening it on those rows read 0,
 * 0, 0, 1 and 0. Taking
 * the LAST link holding a cell rather than the first reads the same after
 * xterm's removal, where no two of a row's links share a column, and is
 * caught by S1's first-hover case, the one reading in which two do.
 *
 * Starts nothing, writes nothing, reads nothing under a home: the staged
 * providers, HEAD's door module and this repository's committed fixtures.
 */

import { readFileSync } from 'node:fs';
import { posix, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PathDoorAnswer, PathFacts } from '../../src/shared/path-doors.ts';
import { fakeLine } from './stage.mjs';
import {
  CORPUS_NAMES,
  STALE_OF,
  InputMoved,
  PINS,
  corpusOf,
  digest,
  parseRepoPaths,
  pinsMoved,
  readRepoPaths,
  REPO_PATHS,
  REPO_BASE,
  REPO_HOME,
  OUTSIDE_ROOT,
  OUTSIDE_TILDE,
  cells,
  type Corpus,
  type CorpusName,
  type Layout
} from './generate.mts';

// ---------------------------------------------------------------------------
// THE SHAPES THE PROVIDER IS DRIVEN THROUGH

export type Kind = 'file' | 'dir';
export type Truth = ReadonlyMap<string, Kind>;
export type DoorName = 'files' | 'exists';
export type RegimeName = 'repo' | 'twin' | 'named' | 'named-dirs';
export type Door = (target: string) => PathDoorAnswer;

export const DOOR_NAMES: readonly DoorName[] = ['files', 'exists'];

interface Point {
  x: number;
  y: number;
}
interface Range {
  start: Point;
  end: Point;
}
interface XLink {
  range: Range;
  text: string;
  activate(event: unknown, text: string): void;
}
interface Deps {
  isLocal(): boolean;
  repoPath(): string;
  classify(paths: string[], base: string): Promise<unknown[]>;
  openInTortie(path: string, repoPath: string, line?: number): void;
  openOnMac(path: string): Promise<void>;
}
interface Term {
  cols: number;
  buffer: { active: { length: number; getLine(y: number): unknown } };
}
interface Provider {
  provideLinks(line: number, callback: (links: XLink[] | undefined) => void): void;
}
/** One build: a fresh provider over a buffer and the pane's dependencies. */
export type Make = (term: Term, deps: Deps) => Provider;

/** The doors module's pure half, HEAD's, handed in by path. */
interface Doors {
  decidePathDoor(facts: PathFacts): PathDoorAnswer;
  insideBase(real: string, base: string): boolean;
}

/** One drawn row as the provider's one reader hands it to the join. */
interface DrawnRow {
  text: string;
  columns: number[];
}

/** The staged grammar's join, the build's own, for the door-free cut report. */
export interface Spans {
  joinedPathAt(
    rows: (i: number) => DrawnRow | null,
    y: number,
    last: number,
    width: number
  ): { target: string; top: number; bottom: number } | null;
  cellColumns(line: unknown): number[];
}

/** What a link that opened nothing at its click is recorded as. */
export const NOTHING = '(opens nothing)';

/** A link as the comparison sees it: where it is and what its press opened. */
export interface SeenLink {
  range: Range;
  opens: string;
}

/** One build's reading of one layout. */
export interface Reading {
  /** Per row, per cell 1..width: what the cell opens, NOTHING, or null for no link, after xterm's removal. */
  cells: (string | null)[][];
  /** The same, at the row's FIRST hover: from its reply before xterm's removal. */
  firstCells: (string | null)[][];
  /** Per row, the links its own hover returned, after xterm's removal. */
  links: SeenLink[][];
  /** Per row, the links its own hover returned, in reply order BEFORE xterm's removal; `links` holds the same objects. */
  replies: SeenLink[][];
  /** Every spelling handed to `classify`. */
  asked: Set<string>;
  /** How many returned links xterm's removal dropped, over every row. */
  removed: number;
}

const CLICK = {};

/** Every microtask the press started has run before this resolves. */
const drain = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

// ---------------------------------------------------------------------------
// XTERM 6.0.0'S ARITHMETIC (§1), copied rather than imported: the Linkifier is
// a browser class and its two private methods are the whole of what is needed.

/**
 * `Linkifier._removeIntersectingLinks` for ONE provider's reply on row `y`
 * (1-based), as written: a link that starts above the row claims from column
 * 0, one that ends below it claims to `cols`, and a link that meets an
 * occupied column is removed with the columns it already claimed LEFT
 * occupied, because xterm adds each column before it reads the next.
 */
export function removeIntersecting<L extends { range: Range }>(links: L[], y: number, cols: number): L[] {
  const reply = links.slice();
  const occupied = new Set<number>();
  for (let i = 0; i < reply.length; i += 1) {
    const link = reply[i];
    if (link === undefined) continue;
    const startX = link.range.start.y < y ? 0 : link.range.start.x;
    const endX = link.range.end.y > y ? cols : link.range.end.x;
    for (let x = startX; x <= endX; x += 1) {
      if (occupied.has(x)) {
        reply.splice(i, 1);
        i -= 1;
        break;
      }
      occupied.add(x);
    }
  }
  return reply;
}

/** `Linkifier._linkAtPosition`, in reading order. */
export function linkHolds(range: Range, x: number, y: number, cols: number): boolean {
  const lower = range.start.y * cols + range.start.x;
  const upper = range.end.y * cols + range.end.x;
  const current = y * cols + x;
  return lower <= current && current <= upper;
}

/** What each cell of row `y` (1-based) opens, from that row's own links. */
export function cellsOfRow(links: SeenLink[], y: number, cols: number): (string | null)[] {
  const out: (string | null)[] = [];
  for (let x = 1; x <= cols; x += 1) {
    const hit = links.find((l) => linkHolds(l.range, x, y, cols));
    out.push(hit === undefined ? null : hit.opens);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ONE BUILD OVER ONE LAYOUT

/**
 * Hover every row top to bottom through a fresh provider, press every
 * distinct link once, and read every cell. `activate` false is the census
 * pass the `named` regimes are built from: hover only, nothing pressed.
 */
export async function readBuild(
  make: Make,
  layout: Layout,
  lines: unknown[],
  base: string,
  door: Door,
  activate: boolean
): Promise<Reading> {
  const asked = new Set<string>();
  const opened: string[] = [];
  const term: Term = {
    cols: layout.width,
    buffer: { active: { length: lines.length, getLine: (y: number) => lines[y] } }
  };
  const deps: Deps = {
    isLocal: () => true,
    repoPath: () => base,
    classify: async (paths: string[]) =>
      paths.map((p) => {
        asked.add(p);
        return { sourcePath: p, kind: 'file', refPath: p, copied: false, isImage: false, bytes: 0, door: door(p) };
      }),
    openInTortie: (path: string, _repo: string, line?: number) => {
      opened.push(line === undefined ? path : `${path}:${String(line)}`);
    },
    openOnMac: async (path: string) => {
      opened.push(`mac:${path}`);
    }
  };
  const provider = make(term, deps);
  const outcome = new Map<string, string>();
  const cells: (string | null)[][] = [];
  const firstCells: (string | null)[][] = [];
  const kept: SeenLink[][] = [];
  const replies: SeenLink[][] = [];
  let removed = 0;
  for (let y = 0; y < lines.length; y += 1) {
    const got = await new Promise<XLink[] | undefined>((resolve) => {
      provider.provideLinks(y + 1, resolve);
    });
    if (!activate) continue;
    const seen: SeenLink[] = [];
    for (const link of got ?? []) {
      const key = `${link.text}\u0000${String(link.range.start.x)}.${String(link.range.start.y)}-${String(link.range.end.x)}.${String(link.range.end.y)}`;
      let opens = outcome.get(key);
      if (opens === undefined) {
        opened.length = 0;
        link.activate(CLICK, link.text);
        await drain();
        opens = opened.length === 0 ? NOTHING : opened.join('|');
        outcome.set(key, opens);
      }
      seen.push({ range: link.range, opens });
    }
    const after = removeIntersecting(seen, y + 1, layout.width);
    removed += seen.length - after.length;
    kept.push(after);
    replies.push(seen);
    cells.push(cellsOfRow(after, y + 1, layout.width));
    firstCells.push(cellsOfRow(seen, y + 1, layout.width));
  }
  return { cells, firstCells, links: kept, replies, asked, removed };
}

/** A cell's verdict between two readings, and the first regressing cell. */
export interface CellCompare {
  regress: number;
  gain: number;
  first: { x: number; y: number; parent: string; head: string | null } | null;
}

/**
 * XTERM'S CURRENT LINK, BOTH BUILDS UNDER ONE MOUSE, on one row whose reply
 * holds links that share a column at either build (the second tooling review
 * of 2026-10-13). Per cell `x` (1-based), every (parent, HEAD) pair of opened
 * targets the click at `x` can press, `null` for no current link.
 *
 * `Linkifier._handleHover` on a row already asked keeps the current link
 * while it holds the mouse, and otherwise clears it and takes the first link
 * of the removal's KEPT list holding the mouse (`_askForLink` from the line
 * cache); the row's first hover takes the first link of the WHOLE reply
 * holding the cell it was asked at (`_checkLinkProviderResult` before
 * `_removeIntersectingLinks`). A state is the pair of current links, one per
 * build, an index into the build's reply or -1. The states are those of a
 * first hover at every cell, and "no current link" (which a press reads
 * through the kept list, the old after-the-removal moment, kept even where no
 * empty cell reaches it), closed under a move to every cell; a pair is read
 * at `x` as the state a move to `x` leaves. The pairs are aligned, never two
 * sets compared, so a row both builds read alike reads no pair that differs.
 */
export function currentPairs(
  parentReply: SeenLink[],
  parentKept: SeenLink[],
  headReply: SeenLink[],
  headKept: SeenLink[],
  y: number,
  cols: number
): [string | null, string | null][][] {
  const holds = (reply: SeenLink[], i: number, x: number): boolean => {
    const link = reply[i];
    return link !== undefined && linkHolds(link.range, x, y, cols);
  };
  const firstOf = (list: SeenLink[], reply: SeenLink[], x: number): number => {
    const hit = list.find((l) => linkHolds(l.range, x, y, cols));
    return hit === undefined ? -1 : reply.indexOf(hit);
  };
  const step = (s: readonly [number, number], x: number): [number, number] => [
    holds(parentReply, s[0], x) ? s[0] : firstOf(parentKept, parentReply, x),
    holds(headReply, s[1], x) ? s[1] : firstOf(headKept, headReply, x)
  ];
  const seen = new Map<string, [number, number]>();
  const queue: [number, number][] = [];
  const add = (s: [number, number]): void => {
    const key = `${String(s[0])},${String(s[1])}`;
    if (seen.has(key)) return;
    seen.set(key, s);
    queue.push(s);
  };
  add([-1, -1]);
  for (let x = 1; x <= cols; x += 1) add([firstOf(parentReply, parentReply, x), firstOf(headReply, headReply, x)]);
  while (queue.length > 0) {
    const s = queue.pop();
    if (s === undefined) break;
    for (let x = 1; x <= cols; x += 1) add(step(s, x));
  }
  const opens = (reply: SeenLink[], i: number): string | null => (i === -1 ? null : (reply[i]?.opens ?? null));
  const out: [string | null, string | null][][] = [];
  for (let x = 1; x <= cols; x += 1) {
    const pairs = new Map<string, [string | null, string | null]>();
    for (const s of seen.values()) {
      const t = step(s, x);
      const pair: [string | null, string | null] = [opens(parentReply, t[0]), opens(headReply, t[1])];
      pairs.set(JSON.stringify(pair), pair);
    }
    out.push([...pairs.values()]);
  }
  return out;
}

export function compareReadings(parent: Reading, head: Reading): CellCompare {
  let regress = 0;
  let gain = 0;
  let first: CellCompare['first'] = null;
  for (const [y, row] of parent.cells.entries()) {
    const other = head.cells[y] ?? [];
    const parentFirst = parent.firstCells[y] ?? [];
    const headFirst = head.firstCells[y] ?? [];
    const parentReply = parent.replies[y] ?? [];
    const headReply = head.replies[y] ?? [];
    const parentKept = parent.links[y] ?? [];
    const headKept = head.links[y] ?? [];
    // Only a row whose reply holds links sharing a column, at either build,
    // can open anything but the one link holding a cell (see `currentPairs`).
    const shared =
      parentReply.length !== parentKept.length || headReply.length !== headKept.length
        ? currentPairs(parentReply, parentKept, headReply, headKept, y + 1, row.length)
        : null;
    for (const [i, a] of row.entries()) {
      const b = other[i] ?? null;
      const af = parentFirst[i] ?? null;
      const bf = headFirst[i] ?? null;
      const aOpens = a !== null && a !== NOTHING;
      const bOpens = b !== null && b !== NOTHING;
      // After the removal (every later hover on the row), or at the row's first hover.
      const later = aOpens && b !== a;
      const atFirst = af !== null && af !== NOTHING && bf !== af;
      // Or a current link the mouse carried onto the cell.
      const carried =
        shared === null ? undefined : (shared[i] ?? []).find(([p, h]) => p !== null && p !== NOTHING && h !== p);
      if (later || atFirst || carried !== undefined) {
        regress += 1;
        first ??= later
          ? { x: i + 1, y: y + 1, parent: a, head: b }
          : atFirst
            ? { x: i + 1, y: y + 1, parent: af ?? '', head: bf }
            : { x: i + 1, y: y + 1, parent: carried?.[0] ?? '', head: carried?.[1] ?? null };
      }
      if (!aOpens && bOpens) gain += 1;
    }
  }
  return { regress, gain, first };
}

// ---------------------------------------------------------------------------
// THE DOORS AND THE REGIMES (§7.3)

/** A spelling resolved as `answerPathDoor` resolves it, or null when it is never joined. */
export function resolveSpelling(
  raw: string,
  base: string,
  home: string
): { spelling: string; abs: string; from: string | null } | null {
  let spelling = raw;
  if (spelling === '~') spelling = home;
  else if (spelling.startsWith('~/')) spelling = home + spelling.slice(1);
  if (spelling.startsWith('/')) return { spelling, abs: posix.resolve(spelling), from: null };
  if (spelling.length === 0 || spelling.startsWith('~')) return null;
  const joined = posix.resolve(base, spelling);
  return { spelling: joined, abs: joined, from: base };
}

export function makeDoor(doors: Doors, name: DoorName | 'all', truth: Truth, base: string, home: string): Door {
  if (name === 'all') return (target) => ({ door: 'editor', path: target });
  return (target) => {
    const r = resolveSpelling(target, base, home);
    if (name === 'exists') {
      if (r === null) return { door: null, refusal: 'not-absolute' };
      if (!truth.has(r.abs)) return { door: null, refusal: 'missing' };
      if (r.from !== null && !doors.insideBase(r.abs, r.from)) return { door: null, refusal: 'outside-base' };
      return { door: 'editor', path: r.abs };
    }
    const kind = r === null ? undefined : truth.get(r.abs);
    return doors.decidePathDoor({
      spelling: r === null ? target : r.spelling,
      realPath: r === null || kind === undefined ? null : r.abs,
      kind: kind ?? 'missing',
      bundle: false,
      executable: false,
      resolvedFrom: r === null ? null : r.from
    });
  };
}

/** The repository's own tree under the base: its files files, its folders folders. */
export function repoTruth(paths: string[], base: string): Truth {
  const truth = new Map<string, Kind>();
  truth.set(base, 'dir');
  for (const path of paths) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i += 1) truth.set(`${base}/${parts.slice(0, i).join('/')}`, 'dir');
  }
  for (const path of paths) truth.set(`${base}/${path}`, 'file');
  return truth;
}

/**
 * THE TWIN REGIME (his absolute-only round, SPEC §7.7): this repository's tree
 * under the project AND under the other folder the outside corpora print
 * (`/q/tortie`, and `~/tortiq/` expanded against the home), merged. Every
 * printed path is then a real file in its own folder, and every relative tail
 * of one a real file in the project, which is the census's setup: a join cut
 * short opens the project's own copy here exactly where the real disk did.
 */
export function twinTruth(paths: string[], base: string, home: string): Truth {
  const truth = new Map<string, Kind>();
  const tilde = resolveSpelling(OUTSIDE_TILDE, base, home)?.abs ?? OUTSIDE_TILDE;
  for (const root of [base, OUTSIDE_ROOT, tilde]) {
    for (const [k, v] of repoTruth(paths, root)) truth.set(k, v);
  }
  return truth;
}

function namedTruth(asked: Iterable<string>, kind: Kind, base: string, home: string, into = new Map<string, Kind>()): Map<string, Kind> {
  for (const spelling of asked) {
    const r = resolveSpelling(spelling, base, home);
    if (r !== null) into.set(r.abs, kind);
  }
  return into;
}

/**
 * One layout's regimes (§7.3). The census hovers every row of both builds
 * under a door that accepts everything, so every spelling either build would
 * ever ask about is asked: the row spans, the join's target and the spans
 * under it. `named` makes each a file; `named-dirs` makes each the PARENT
 * asks about a folder and the rest files.
 */
export async function regimesFor(
  parent: Make,
  head: Make,
  layout: Layout,
  lines: unknown[],
  corpus: Pick<Corpus, 'base' | 'home'>,
  doors: Doors,
  repo: Truth | null,
  clean: { layout: Layout; lines: unknown[] } | null = null,
  twin: Truth | null = null
): Promise<[RegimeName, Truth][]> {
  const all = makeDoor(doors, 'all', new Map(), corpus.base, corpus.home);
  const parentAsked = (await readBuild(parent, layout, lines, corpus.base, all, false)).asked;
  const headAsked = (await readBuild(head, layout, lines, corpus.base, all, false)).asked;
  // A stale layout's clean screen is read by HEAD too (the wrong-file count,
  // his ruled round), so what HEAD asks there is on disk in `named` as well:
  // a join the clean screen offers is never refused for want of its file.
  if (clean !== null) {
    for (const s of (await readBuild(head, clean.layout, clean.lines, corpus.base, all, false)).asked) headAsked.add(s);
  }
  const truths: [RegimeName, Truth][] = [];
  if (repo !== null) truths.push(['repo', repo]);
  if (twin !== null) truths.push(['twin', twin]);
  truths.push(['named', namedTruth([...parentAsked, ...headAsked], 'file', corpus.base, corpus.home)]);
  const headOnly = namedTruth([...headAsked].filter((s) => !parentAsked.has(s)), 'file', corpus.base, corpus.home);
  truths.push(['named-dirs', namedTruth(parentAsked, 'dir', corpus.base, corpus.home, headOnly)]);
  return truths;
}

// ---------------------------------------------------------------------------
// ONE CORPUS (§7.4)

export interface Example {
  shape: string;
  width: number;
  rows: string[];
  cell: { x: number; y: number };
  parent: string;
  head: string | null;
}

export interface Line {
  corpus: CorpusName | string;
  door: DoorName;
  regime: RegimeName | string;
  layouts: number;
  cells: number;
  regressCells: number;
  regressLayouts: number;
  gainCells: number;
  gainLayouts: number;
  /** Links xterm's removal dropped from a row's own reply, at each build. */
  removedParent: number;
  removedHead: number;
  examples: Example[];
  /**
   * THE WRONG-FILE COUNT (his ruled round), judged on a layout that carries
   * its `clean` rows: a join HEAD offers there whose press opens a file, and
   * which HEAD does not offer, at the same range opening the same file, on
   * the same rows drawn clean. The two screens show the same cells, so such a
   * join can only have read cells nobody sees, or been cut where they sat:
   * it opens a file the screen does not name. The parent offers no join, so
   * every one is a wrong open where today nothing opens. `wrongJudged` is
   * false on a corpus with no clean rows, where the count is not taken.
   */
  wrongJudged: boolean;
  wrongOpens: number;
  wrongLayouts: number;
  wrongExamples: WrongExample[];
  /**
   * THE PRINTED-PATH WRONG-FILE COUNT (his absolute-only round), on every
   * layout that carries `printed`: a HEAD link over two or more rows whose
   * press opened a path the screen did not print (`printedWrongJoins`).
   * Graded 0 on `repo` and `twin`, printed on `named` and `named-dirs`.
   * `printedJudged` is false on a corpus with no `printed`, the captures.
   */
  printedJudged: boolean;
  printedWrong: number;
  printedWrongLayouts: number;
  printedExamples: PrintedExample[];
}

export interface PrintedExample {
  shape: string;
  width: number;
  rows: string[];
  join: { range: Range; opens: string };
  printed: string[];
}

export interface WrongExample {
  shape: string;
  width: number;
  rows: string[];
  clean: string[];
  join: { range: Range; opens: string };
}

/** Every link over two or more rows a reading holds, once each, keyed by its range and what it opens. */
export function joinsIn(reading: Reading): Map<string, SeenLink> {
  const out = new Map<string, SeenLink>();
  for (const reply of reading.replies) {
    for (const l of reply) {
      if (l.range.start.y === l.range.end.y) continue;
      const key = `${String(l.range.start.x)}.${String(l.range.start.y)}-${String(l.range.end.x)}.${String(l.range.end.y)}|${l.opens}`;
      if (!out.has(key)) out.set(key, l);
    }
  }
  return out;
}

/**
 * The joins HEAD opens on a stale screen that it does not open on the same
 * rows drawn clean: `clean` is read only when the stale screen has a join
 * that opens a file, so a corpus HEAD offers nothing on costs nothing more.
 */
export async function wrongJoins(
  head: Make,
  stale: Reading,
  clean: { layout: Layout; lines: unknown[] },
  base: string,
  door: Door
): Promise<SeenLink[]> {
  const opened = [...joinsIn(stale)].filter(([, l]) => l.opens !== NOTHING);
  if (opened.length === 0) return [];
  const fresh = joinsIn(await readBuild(head, clean.layout, clean.lines, base, door, true));
  return opened.filter(([key]) => !fresh.has(key)).map(([, l]) => l);
}

/** The path a press opened: its `opens` without a trailing `:<line>` and without `mac:`. */
export function openedPath(opens: string): string {
  return opens.replace(/^mac:/, '').replace(/:\d+$/, '');
}

/**
 * THE PRINTED-PATH WRONG-FILE COUNT (his absolute-only round, SPEC §7.7):
 * every HEAD link over two or more rows whose press opened something, and
 * what it opened is not NAMED: neither a printed spelling resolved as the door
 * resolves it, nor a folder the regime holds that is an ancestor of one (the
 * existence door opens a folder; the files door never does). A path a parent
 * link on a row the join covers also opens is no wrong open, because today
 * already opens it there. A relative tail of a path printed in another
 * folder, opening the project's copy, is exactly what this counts.
 */
export function printedWrongJoins(
  head: Reading,
  parent: Reading,
  printed: readonly string[],
  base: string,
  home: string,
  truth: Truth
): SeenLink[] {
  const named = printed.flatMap((s) => {
    const r = resolveSpelling(s, base, home);
    return r === null ? [] : [r.abs];
  });
  const out: SeenLink[] = [];
  for (const link of joinsIn(head).values()) {
    if (link.opens === NOTHING) continue;
    const path = openedPath(link.opens);
    if (named.includes(path)) continue;
    if (truth.get(path) === 'dir' && named.some((p) => p.startsWith(`${path}/`))) continue;
    let today = false;
    for (let y = link.range.start.y; y <= link.range.end.y && !today; y += 1) {
      today = (parent.replies[y - 1] ?? []).some((l) => l.opens !== NOTHING && openedPath(l.opens) === path);
    }
    if (!today) out.push(link);
  }
  return out;
}

/** What a join whose target is not a printed spelling is, tested in this order (SPEC §7.7). */
export type CutKind = 'relative' | 'bottom-at-slash' | 'bottom-at-dash' | 'bottom-mid-name' | 'top' | 'other';
export const CUT_KINDS: readonly CutKind[] = ['relative', 'bottom-at-slash', 'bottom-at-dash', 'bottom-mid-name', 'top', 'other'];

/**
 * A join's target against the spellings its screen printed: null when it is
 * one of them, or when nothing printed is known (an empty list is no
 * requirement); otherwise a CUT of exactly one kind: `relative` (it starts
 * with neither `/` nor `~/`), a proper prefix of a printed spelling ending in
 * `/` (`bottom-at-slash`), in `-` (`bottom-at-dash`) or in anything else
 * (`bottom-mid-name`), a proper suffix (`top`), or `other` (a piece cut at
 * both ends, or a name no printed spelling holds).
 */
export function cutKind(target: string, printed: readonly string[]): CutKind | null {
  if (printed.length === 0 || printed.includes(target)) return null;
  if (!target.startsWith('/') && !target.startsWith('~/')) return 'relative';
  if (printed.some((p) => p.startsWith(target))) {
    return target.endsWith('/') ? 'bottom-at-slash' : target.endsWith('-') ? 'bottom-at-dash' : 'bottom-mid-name';
  }
  if (printed.some((p) => p.endsWith(target))) return 'top';
  return 'other';
}

/** One layout's joins through the build's own `joinedPathAt`, every row hovered, rows read as the provider reads them. */
export function layoutJoins(spans: Spans, layout: Layout): { row: number; target: string }[] {
  const lines = layout.rows.map((r) => fakeLine(r) as { translateToString(trim?: boolean): string });
  const read = (i: number): DrawnRow | null => {
    const line = lines[i];
    return line === undefined ? null : { text: line.translateToString(true), columns: spans.cellColumns(line) };
  };
  const out: { row: number; target: string }[] = [];
  for (let y = 0; y < lines.length; y += 1) {
    const j = spans.joinedPathAt(read, y, lines.length - 1, layout.width);
    if (j !== null) out.push({ row: y, target: j.target });
  }
  return out;
}

export interface CutExample {
  kind: CutKind;
  shape: string;
  width: number;
  rows: string[];
  row: number;
  target: string;
  printed: string[];
}

/** The door-free cut report of one corpus: layouts by kind, the right ones, and examples. */
export interface CutReport {
  /** Layouts that carry a non-empty `printed`; 0 means the corpus is not judged. */
  judged: number;
  /** Layouts where some join names a printed spelling. */
  rightLayouts: number;
  /** Layouts holding at least one cut of each kind. */
  layouts: Record<CutKind, number>;
  /** Up to three of each of `relative`, `top` and `bottom-mid-name`. */
  examples: CutExample[];
}

export function cutReport(spans: Spans, layouts: Layout[]): CutReport {
  const report: CutReport = {
    judged: 0,
    rightLayouts: 0,
    layouts: { relative: 0, 'bottom-at-slash': 0, 'bottom-at-dash': 0, 'bottom-mid-name': 0, top: 0, other: 0 },
    examples: []
  };
  for (const layout of layouts) {
    const printed = layout.printed ?? [];
    if (printed.length === 0) continue;
    report.judged += 1;
    const kinds = new Set<CutKind>();
    let right = false;
    for (const j of layoutJoins(spans, layout)) {
      const kind = cutKind(j.target, printed);
      if (kind === null) {
        right = true;
        continue;
      }
      if (!kinds.has(kind) && (kind === 'relative' || kind === 'top' || kind === 'bottom-mid-name')) {
        if (report.examples.filter((e) => e.kind === kind).length < 3) {
          report.examples.push({ kind, shape: layout.shape, width: layout.width, rows: layout.rows, row: j.row, target: j.target, printed });
        }
      }
      kinds.add(kind);
    }
    if (right) report.rightLayouts += 1;
    for (const k of kinds) report.layouts[k] += 1;
  }
  return report;
}

const lineKey = (door: string, regime: string): string => `${door} ${regime}`;

export async function measureCorpus(
  corpus: Corpus,
  parent: Make,
  head: Make,
  doors: Doors,
  repoPaths: string[] | null
): Promise<Line[]> {
  const lines = new Map<string, Line>();
  const regimeNames: RegimeName[] = corpus.repo
    ? ['repo', ...(corpus.twin ? (['twin'] as const) : []), 'named', 'named-dirs']
    : ['named', 'named-dirs'];
  const judged = corpus.layouts.some((l) => l.clean !== undefined);
  const printedJudged = corpus.layouts.some((l) => l.printed !== undefined);
  for (const regime of regimeNames) {
    for (const door of DOOR_NAMES) {
      lines.set(lineKey(door, regime), {
        corpus: corpus.name, door, regime, layouts: 0, cells: 0,
        regressCells: 0, regressLayouts: 0, gainCells: 0, gainLayouts: 0, removedParent: 0, removedHead: 0, examples: [],
        wrongJudged: judged, wrongOpens: 0, wrongLayouts: 0, wrongExamples: [],
        printedJudged, printedWrong: 0, printedWrongLayouts: 0, printedExamples: []
      });
    }
  }
  const repo = corpus.repo && repoPaths !== null ? repoTruth(repoPaths, corpus.base) : null;
  const twin = corpus.repo && corpus.twin && repoPaths !== null ? twinTruth(repoPaths, corpus.base, corpus.home) : null;
  for (const layout of corpus.layouts) {
    const drawnLines = layout.rows.map((row) => fakeLine(row) as unknown);
    const clean =
      layout.clean === undefined
        ? null
        : { layout: { shape: layout.shape, width: layout.width, rows: layout.clean }, lines: layout.clean.map((row) => fakeLine(row) as unknown) };
    for (const [regime, truth] of await regimesFor(parent, head, layout, drawnLines, corpus, doors, repo, clean, twin)) {
      for (const doorName of DOOR_NAMES) {
        const door = makeDoor(doors, doorName, truth, corpus.base, corpus.home);
        const before = await readBuild(parent, layout, drawnLines, corpus.base, door, true);
        const after = await readBuild(head, layout, drawnLines, corpus.base, door, true);
        const c = compareReadings(before, after);
        const line = lines.get(lineKey(doorName, regime));
        if (line === undefined) continue;
        if (clean !== null) {
          const wrong = await wrongJoins(head, after, clean, corpus.base, door);
          line.wrongOpens += wrong.length;
          if (wrong.length > 0) {
            line.wrongLayouts += 1;
            if (line.wrongExamples.length < 5) {
              const first = wrong[0];
              if (first !== undefined) {
                line.wrongExamples.push({
                  shape: layout.shape, width: layout.width, rows: layout.rows, clean: clean.layout.rows,
                  join: { range: first.range, opens: first.opens }
                });
              }
            }
          }
        }
        if (layout.printed !== undefined) {
          const wrong = printedWrongJoins(after, before, layout.printed, corpus.base, corpus.home, truth);
          line.printedWrong += wrong.length;
          if (wrong.length > 0) {
            line.printedWrongLayouts += 1;
            const first = wrong[0];
            if (line.printedExamples.length < 5 && first !== undefined) {
              line.printedExamples.push({
                shape: layout.shape, width: layout.width, rows: layout.rows,
                join: { range: first.range, opens: first.opens }, printed: layout.printed
              });
            }
          }
        }
        line.layouts += 1;
        line.cells += layout.width * layout.rows.length;
        line.regressCells += c.regress;
        line.gainCells += c.gain;
        line.removedParent += before.removed;
        line.removedHead += after.removed;
        if (c.gain > 0) line.gainLayouts += 1;
        if (c.regress > 0) {
          line.regressLayouts += 1;
          if (line.examples.length < 5 && c.first !== null) {
            line.examples.push({
              shape: layout.shape, width: layout.width, rows: layout.rows,
              cell: { x: c.first.x, y: c.first.y }, parent: c.first.parent, head: c.first.head
            });
          }
        }
      }
    }
  }
  return [...lines.values()];
}

// ---------------------------------------------------------------------------
// THE SELF-TEST (§7.6)

/** A link a stub provider returns, and what its press opens (null: nothing). */
interface StubLink {
  range: Range;
  text: string;
  opens: string | null;
  line?: number;
}

/** A provider that returns a fixed table, row by row, so the arithmetic is tested alone. */
export function stubMake(table: Record<number, StubLink[]>): Make {
  return (_term, deps) => ({
    provideLinks(line, callback) {
      const links = table[line - 1] ?? [];
      callback(
        links.length === 0
          ? undefined
          : links.map((l) => ({
              range: l.range,
              text: l.text,
              activate: () => {
                if (l.opens !== null) deps.openInTortie(l.opens, deps.repoPath(), l.line);
              }
            }))
      );
    }
  });
}

const at = (y: number, x0: number, x1: number, y1 = y): Range => ({ start: { x: x0, y }, end: { x: x1, y: y1 } });

/**
 * THE PLANTED SHAPES (§2.2, §7.6 S4): every shape that re-pointed a link that
 * opens today on Phase 347's kept work, each with BOTH its spellings files.
 * HEAD with the governing rule removed must read at least one regression cell
 * on every shape under both doors, and HEAD as it is none, or the instrument
 * cannot see the defect this phase exists to prevent.
 */
const ISSUE_BASE = '/Users/johnberryman/projects/github/arcturus-labs/rook';
const ISSUE_FILE = `${ISSUE_BASE}/.agents/skills/software-factory/.planning/brainstorming.md`;
export const PLANTED_SHAPES: {
  name: string;
  base: string;
  home: string;
  width: number;
  rows: string[];
  files: string[];
  /** The door the files door gives `fragment`, when it is not the editor (the fix round). */
  kind?: { door: 'image' | 'mac'; fragment: string };
}[] = [
  {
    name: 'third reverify, an absolute folder 1 cell short above its item',
    base: REPO_BASE, home: REPO_HOME, width: cells('• /r/tortie/docs/') + 1,
    rows: ['Files:', '• /r/tortie/docs/', '• notes/a.md', '', '>'],
    files: ['/r/tortie/notes/a.md', '/r/tortie/docs/notes/a.md']
  },
  {
    name: 'third reverify, a ~/ folder 1 cell short above its item',
    base: REPO_BASE, home: REPO_HOME, width: cells('• ~/tortie/docs/') + 1,
    rows: ['Files:', '• ~/tortie/docs/', '• notes/a.md', '', '>'],
    files: ['/r/tortie/notes/a.md', '/r/tortie/docs/notes/a.md']
  },
  {
    name: 'third reverify, a name broken after - 1 cell short above its rest',
    base: REPO_BASE, home: REPO_HOME, width: cells('• /r/tortie/src/n8kk-') + 1,
    rows: ['Files:', '• /r/tortie/src/n8kk-', '• draft8.md', '', '>'],
    files: ['/r/tortie/draft8.md', '/r/tortie/src/n8kk-draft8.md']
  },
  {
    name: "issue 40's rows at 47 with the bottom fragment planted",
    base: ISSUE_BASE, home: '/Users/me', width: 47,
    rows: [
      'The plan is written down at',
      '/Users/johnberryman/projects/github/arcturus-',
      'labs/rook/.agents/skills/software-factory/',
      '.planning/brainstorming.md:134 and /a/other.md',
      '',
      '>'
    ],
    files: [ISSUE_FILE, `${ISSUE_BASE}/.planning/brainstorming.md`]
  },
  // HIS ABSOLUTE-ONLY ROUND: J10 refuses every relative chain, so the three
  // shapes §2.2 found with a relative folder or file at the top are read as
  // their ABSOLUTE twins, which J10 lets through and the governing rule alone
  // keeps off the item below (SPEC §7.7).
  {
    name: 'an absolute folder ON the last column above an item indented by two spaces',
    base: REPO_BASE, home: REPO_HOME, width: cells('  /r/tortie/docs/research/'),
    rows: ['Files:', '  /r/tortie/docs/research/', '  notes.md', '', '>'],
    files: ['/r/tortie/notes.md', '/r/tortie/docs/research/notes.md']
  },
  {
    name: 'an absolute folder ON the last column above an item indented by ⎿ and two spaces',
    base: REPO_BASE, home: REPO_HOME, width: cells('/r/tortie/docs/research/'),
    rows: ['Files:', '/r/tortie/docs/research/', '⎿  notes.md', '', '>'],
    files: ['/r/tortie/notes.md', '/r/tortie/docs/research/notes.md']
  },
  {
    name: 'a word wrap that hard-cut /r/tortie/.claude/scheduled_tasks. above lock to fix the race. (34 columns, the top row full)',
    base: REPO_BASE, home: REPO_HOME, width: 34,
    rows: ['', 'I updated', '/r/tortie/.claude/scheduled_tasks.', 'lock to fix the race.', '', '>'],
    files: ['/r/tortie/.claude/scheduled_tasks', '/r/tortie/.claude/scheduled_tasks.lock']
  },
  // THE DOOR'S KIND (the Phase 347.1 fix round): the governing rule counts a
  // span ANY door accepts, and these two are the shapes that say so by
  // behaviour. A relative image takes the image door; a PDF takes the Mac door
  // only when it is spelled absolute, and `~/` is the one absolute spelling
  // that starts a lower row below a folder one cell short (J3 counts its two
  // cells). The Mac shape's row above is `The brief:` since his absolute-only
  // round: `The brief is at` ended where `/r/tortie/docs/` ends, and J11
  // refuses a lone top piece below a row that ends at its column (L9's price,
  // met in a fixture).
  {
    name: "issue 40's rows at 47 with the bottom fragment an image the image door opens",
    base: ISSUE_BASE, home: '/Users/me', width: 47,
    rows: [
      'The plan is written down at',
      '/Users/johnberryman/projects/github/arcturus-',
      'labs/rook/.agents/skills/software-factory/',
      '.planning/shot.png and /a/other.md',
      '',
      '>'
    ],
    files: [`${ISSUE_BASE}/.agents/skills/software-factory/.planning/shot.png`, `${ISSUE_BASE}/.planning/shot.png`],
    kind: { door: 'image', fragment: '.planning/shot.png' }
  },
  {
    name: 'an absolute folder one cell short above a ~/ PDF the Mac door opens',
    base: REPO_BASE, home: REPO_HOME, width: cells('/r/tortie/docs/') + 1,
    rows: ['The brief:', '/r/tortie/docs/', '~/brief.pdf now', '', '>'],
    files: ['/r/brief.pdf', '/r/tortie/docs/~/brief.pdf'],
    kind: { door: 'mac', fragment: '~/brief.pdf' }
  }
];

/**
 * THE STALE SHAPES (his ruled round, §7.6 S6): every layout where a join
 * read cells past the pane's width, or was cut where they sat, and opened a
 * file the screen does not name, at a build of this phase. Each names the
 * plant that must open it (`cut`, HEAD with `joinedPathAt`'s J9 removed,
 * which is the fix round's cut; `off`, J9 removed whole, which is the
 * build lens B pressed), and HEAD must read 0 wrong-file opens and 0
 * regression cells on every one, on both doors. Since his absolute-only round
 * the midwrap, X2 and X3 are ABSOLUTE twins of the relative rows the rounds
 * found them on: J10 refuses every relative chain whatever J9 says, so only
 * an absolute chain is left for J9 to decide. X2 and X3 are cut just before a
 * `/` at 46 columns, so with J9's cut planted the two lower rows join
 * `/tortie/…/package.json:134`, a file the screen does not name (SPEC §7.7).
 * Since the fix round of his absolute-only round J11's top half refuses a
 * lone top piece below ANY row reaching the widest row the chain draws, a
 * row past the pane's width among them, so the `cut` plant takes J11's top
 * half out beside J9's cut (build/p3471/corpora.mjs `PLANT_CUT`).
 */
const STALE_BASE = '/p/proj';
const MIDWRAP_TOP = `Please open ${'z'.repeat(26)} /p/deep/`;
const PLAN_AT_Q = 'The plan is now written down in the note at /q';
const TORTIE_PACKAGE = '/tortie/build/fixtures/facts/manifests/package';
const LONG_TOKEN = `${'k'.repeat(44)}.md`;
export const STALE_SHAPES: {
  name: string;
  base: string;
  home: string;
  width: number;
  rows: string[];
  clean: string[];
  files: string[];
  caughtBy: 'cut' | 'off';
}[] = [
  {
    name: "lens B's G-stale-midwrap, absolute: /p/deep/ above folder/one.ts:5, a stale de past 47 columns",
    base: STALE_BASE, home: '/p', width: 47,
    rows: [`${MIDWRAP_TOP}de`, 'folder/one.ts:5 now and check the import.', 'P3471>'],
    clean: [MIDWRAP_TOP, 'folder/one.ts:5 now and check the import.', 'P3471>'],
    files: ['/p/deep/folder/one.ts', '/p/deep/defolder/one.ts'],
    caughtBy: 'off'
  },
  {
    name: "the reverify's X2, absolute: cut before a / at 46 columns, a glued e/A past it, above two rows of the path",
    base: REPO_BASE, home: REPO_HOME, width: 46,
    rows: ['', `${PLAN_AT_Q}e/A`, TORTIE_PACKAGE, '.json:134 and the rest follows.', '', '>'],
    clean: ['', PLAN_AT_Q, TORTIE_PACKAGE, '.json:134 and the rest follows.', '', '>'],
    files: [`${TORTIE_PACKAGE}.json`, `/q${TORTIE_PACKAGE}.json`],
    caughtBy: 'cut'
  },
  {
    name: "the reverify's X3, absolute: the same with zz a blank cell past 46 columns",
    base: REPO_BASE, home: REPO_HOME, width: 46,
    rows: ['', `${PLAN_AT_Q} zz`, TORTIE_PACKAGE, '.json:134 and the rest follows.', '', '>'],
    clean: ['', PLAN_AT_Q, TORTIE_PACKAGE, '.json:134 and the rest follows.', '', '>'],
    files: [`${TORTIE_PACKAGE}.json`, `/q${TORTIE_PACKAGE}.json`],
    caughtBy: 'cut'
  },
  {
    name: 'a token left past 31 columns on the bottom row ends the chain at a prefix of the path',
    base: REPO_BASE, home: REPO_HOME, width: 31,
    rows: ['', 'I updated /q/tortie/build/p336/', 'fixtures/parent-record-b-      ests_', 'first.json to fix the race.', '', '>'],
    clean: ['', 'I updated /q/tortie/build/p336/', 'fixtures/parent-record-b-', 'first.json to fix the race.', '', '>'],
    files: ['/q/tortie/build/p336/fixtures/parent-record-b-', '/q/tortie/build/p336/fixtures/parent-record-b-first.json'],
    caughtBy: 'cut'
  },
  {
    name: 'a lower piece glued to a stale zz past 47 columns',
    base: STALE_BASE, home: '/p', width: 47,
    rows: [`see ${STALE_BASE}/lower/long-`, `${LONG_TOKEN}zz`, '', 'P3471>'],
    clean: [`see ${STALE_BASE}/lower/long-`, LONG_TOKEN, '', 'P3471>'],
    files: [`${STALE_BASE}/lower/long-${LONG_TOKEN}zz`, `${STALE_BASE}/lower/long-${LONG_TOKEN}`],
    caughtBy: 'cut'
  }
];

interface Check {
  id: string;
  pass: boolean;
  detail: string;
}

async function stubCompare(
  width: number,
  parentTable: Record<number, StubLink[]>,
  headTable: Record<number, StubLink[]>
): Promise<CellCompare & { removed: number }> {
  const layout: Layout = { shape: 'stub', width, rows: ['aaaa bbbbbbbb cccc', 'dd', ''] };
  const lines = layout.rows.map((r) => fakeLine(r) as unknown);
  const none: Door = () => ({ door: null, refusal: 'missing' });
  const p = await readBuild(stubMake(parentTable), layout, lines, '/b', none, true);
  const h = await readBuild(stubMake(headTable), layout, lines, '/b', none, true);
  return { ...compareReadings(p, h), removed: h.removed };
}

/**
 * THE J11 ROWS (the join builder's U7, SPEC §5.4) and the reverify's E1, as
 * the cut report reads them (S7): HEAD joins none of them, and with the
 * clause planted out each joins a piece of what the screen printed.
 */
const U7_ROWS: { name: string; width: number; rows: string[]; printed: string; plant: 'j11' | 'abs'; kind: CutKind; target: string }[] = [
  {
    name: "U7's top half, rows cut at one column short of the edge just before a /",
    width: 32,
    rows: ['', 'I saved it to /Users/me/proj', '/tmp/run-logs/nightly-build-', 'output.log today.', '', '>'],
    printed: '/Users/me/proj/tmp/run-logs/nightly-build-output.log',
    plant: 'j11',
    kind: 'top',
    target: '/tmp/run-logs/nightly-build-output.log'
  },
  {
    name: "U7's bottom half, a name cut mid-name at one column short of the edge",
    width: 33,
    rows: ['', 'I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js', '.map today.', '', '>'],
    printed: '/Users/me/proj/dist/assets/vendor-chunk-a/index.js.map',
    plant: 'j11',
    kind: 'bottom-mid-name',
    target: '/Users/me/proj/dist/assets/vendor-chunk-a/index.js'
  },
  {
    name: "the reverify's nit, cut at both ends at 30 in a 38-column pane",
    width: 38,
    rows: ['', 'I updated the test in /private', '/tmp/wt-p3471-parent-rv2/docs/', 'research/assets/58/answer.hard', '13:60 today.', '', '>'],
    printed: '/private/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard13',
    plant: 'j11',
    kind: 'other',
    target: '/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard'
  },
  {
    // The reverify's E1 itself, whose row above reaches past the widest row
    // of the relative tail, is J11's too since the fix round of his
    // absolute-only round (a breaker may have cut there), so J10's plant is
    // read on a tail below a row that ends short and that J10 alone refuses.
    name: 'a relative tail of a path in another folder below a row that ends short, which J10 alone refuses',
    width: 47,
    rows: ['', '⏺ Updated /q/tortie/', '  src/main/__tests__/menu-popup-', '  template.test.ts:38 and ran the tests.', '', '>'],
    printed: '/q/tortie/src/main/__tests__/menu-popup-template.test.ts',
    plant: 'abs',
    kind: 'relative',
    target: 'src/main/__tests__/menu-popup-template.test.ts'
  }
];

async function selfTest(
  builds: Record<'parent' | 'head' | 'plant' | 'plantEditor' | 'plantCut' | 'plantOff', Make>,
  spans: Record<'head' | 'plantJ11' | 'plantAbs', Spans>,
  doors: Doors
): Promise<{ checks: Check[]; counts: Record<string, number> }> {
  const checks: Check[] = [];
  const check = (id: string, pass: boolean, detail: string): void => {
    checks.push({ id, pass, detail });
  };

  // S1 the comparator's arithmetic on stub providers.
  const L: StubLink = { range: at(1, 6, 13), text: 'bbbbbbbb', opens: '/f/b.md' };
  const same = await stubCompare(20, { 0: [L] }, { 0: [L] });
  check('S1 the same links', same.regress === 0 && same.gain === 0, `regress ${String(same.regress)}, gain ${String(same.gain)}`);
  const moved = await stubCompare(20, { 0: [L] }, { 0: [{ ...L, range: at(1, 7, 14) }] });
  check(
    'S1 a link moved one cell right',
    moved.regress === 1 && moved.gain === 1 && moved.first?.x === 6 && moved.first.head === null,
    `regress ${String(moved.regress)} (first at x ${String(moved.first?.x)}), gain ${String(moved.gain)}`
  );
  const removed = await stubCompare(20, { 0: [L] }, {});
  check('S1 a link removed', removed.regress === 8 && removed.gain === 0, `regress ${String(removed.regress)}, gain ${String(removed.gain)}`);
  const other = await stubCompare(20, { 0: [L] }, { 0: [{ ...L, opens: '/f/c.md' }] });
  check('S1 a link opening another file', other.regress === 8 && other.gain === 0, `regress ${String(other.regress)}, gain ${String(other.gain)}`);
  const fresh = await stubCompare(20, {}, { 0: [L] });
  check('S1 a link on empty cells', fresh.regress === 0 && fresh.gain === 8, `regress ${String(fresh.regress)}, gain ${String(fresh.gain)}`);
  const dead = await stubCompare(20, { 0: [{ ...L, opens: null }] }, {});
  check('S1 a parent link that opens nothing is no loss', dead.regress === 0 && dead.gain === 0, `regress ${String(dead.regress)}, gain ${String(dead.gain)}`);
  // M (10 to 16) meets L at 10 and the removal takes it out of the row's
  // reply, but a first hover at 14 to 16, where M alone holds the cell, makes
  // M the current link, and xterm keeps it as the mouse moves left onto 10 to
  // 13, where the parent opens L's file. Measured on xterm 6.0.0's own
  // `Linkifier` (the second tooling review of 2026-10-13): cells 10 to 13
  // regress. This case read 0 here before the current-link moment.
  const lens = await stubCompare(20, { 0: [L] }, { 0: [{ ...L, opens: '/f/b.md' }, { range: at(1, 10, 16), text: 'm', opens: '/f/m.md' }] });
  check(
    "S1 a later intersecting link, removed by xterm, still opens where the mouse carries it",
    lens.regress === 4 && lens.gain === 0 && lens.removed === 1 && lens.first?.x === 10 && lens.first.head === '/f/m.md',
    `regress ${String(lens.regress)} (first at x ${String(lens.first?.x)}: ${String(lens.first?.parent)} -> ${String(lens.first?.head)}), gain ${String(lens.gain)}, ${String(lens.removed)} removed`
  );
  // THE PLANTED JOIN THAT TAKES ONE ACCEPTED CELL (the second tooling review):
  // J (3 to 10) shares cell 10 with S (10 to 16), which opens today. Pushed
  // BEFORE S, as the shipping provider pushes an accepted join, J wins 10 at
  // the first hover and the removal takes S off the row: 10 to 16 regress.
  // Pushed AFTER S, the removal takes J and both moments read S at 10, but a
  // first hover on 3 to 9 carries J onto 10: one cell regresses. Both counts
  // are xterm 6.0.0's own, read off its `Linkifier`.
  const S1: StubLink = { range: at(1, 10, 16), text: 'sssssss', opens: '/f/s.md' };
  const J1: StubLink = { range: at(1, 3, 10), text: 'jjjjjjjj', opens: '/f/j.md' };
  const before = await stubCompare(20, { 0: [S1] }, { 0: [J1, S1] });
  check(
    'S1 a join that takes one accepted cell, pushed before the span',
    before.regress === 7 && before.first?.x === 10 && before.first.head === '/f/j.md',
    `regress ${String(before.regress)} (first at x ${String(before.first?.x)}: ${String(before.first?.parent)} -> ${String(before.first?.head)})`
  );
  const after = await stubCompare(20, { 0: [S1] }, { 0: [S1, J1] });
  check(
    'S1 a join that takes one accepted cell, pushed after the span',
    after.regress === 1 && after.first?.x === 10 && after.first.head === '/f/j.md' && after.removed === 1,
    `regress ${String(after.regress)} (first at x ${String(after.first?.x)}: ${String(after.first?.parent)} -> ${String(after.first?.head)}), ${String(after.removed)} removed`
  );
  const alike = await stubCompare(20, { 0: [L, { range: at(1, 10, 16), text: 'm', opens: '/f/m.md' }] }, { 0: [L, { range: at(1, 10, 16), text: 'm', opens: '/f/m.md' }] });
  check(
    'S1 one reply that shares a column, the same at both builds, reads nothing: the pairs are one mouse',
    alike.regress === 0 && alike.gain === 0 && alike.removed === 1,
    `regress ${String(alike.regress)}, gain ${String(alike.gain)}`
  );
  // A regression only a row's FIRST hover sees: Y claims columns 5 to 7, X (6
  // to 12) meets it at 6 and is removed, T (10 to 15) is kept. After the
  // removal the row reads T at 10 to 12 as the parent does; its first hover,
  // which picks from the reply before the removal, finds X there.
  const T1: StubLink = { range: at(1, 10, 15), text: 'tttttt', opens: '/f/t.md' };
  const hidden = await stubCompare(20, { 0: [T1] }, {
    0: [{ range: at(1, 5, 7), text: 'yyy', opens: '/f/y.md' }, { range: at(1, 6, 12), text: 'xxxxxxx', opens: '/f/x.md' }, T1]
  });
  check(
    "S1 a regression only a row's first hover sees, before xterm's removal",
    hidden.regress === 3 && hidden.first?.x === 10 && hidden.first.head === '/f/x.md' && hidden.removed === 1,
    `regress ${String(hidden.regress)} (first at x ${String(hidden.first?.x)}: ${String(hidden.first?.parent)} -> ${String(hidden.first?.head)}), ${String(hidden.removed)} removed`
  );
  const lineMoved = await stubCompare(20, { 0: [{ ...L, line: 3 }] }, { 0: [{ ...L, line: 4 }] });
  check(
    'S1 the same file at another line is another target',
    lineMoved.regress === 8 && lineMoved.first?.parent === '/f/b.md:3' && lineMoved.first.head === '/f/b.md:4',
    `regress ${String(lineMoved.regress)}: ${String(lineMoved.first?.parent)} -> ${String(lineMoved.first?.head)}`
  );
  const earlier = await stubCompare(20, { 0: [L] }, { 0: [{ range: at(1, 10, 16), text: 'm', opens: '/f/m.md' }, L] });
  check(
    'S1 an earlier intersecting link takes the row',
    earlier.regress === 8 && earlier.gain === 3,
    `regress ${String(earlier.regress)}, gain ${String(earlier.gain)}`
  );
  const span = { range: at(2, 1, 2), opens: '/f/d.md' };
  const join = { range: at(1, 15, 2, 2), opens: '/f/j.md' };
  const quirk = removeIntersecting([{ range: at(1, 5, 8), opens: 'a' }, { range: at(1, 2, 6), opens: 'b' }, { range: at(1, 3, 3), opens: 'c' }], 1, 20);
  check(
    'S1 the removal: a link from the row above claims from column 0, one that ends below claims to cols, and a removed link keeps the columns it claimed',
    removeIntersecting([join, span], 2, 20).length === 1 &&
      removeIntersecting([span, join], 2, 20).length === 1 &&
      removeIntersecting([{ range: at(1, 15, 2, 2), opens: 'j' }, { range: at(1, 1, 3), opens: 's' }], 1, 20).length === 2 &&
      removeIntersecting([{ range: at(1, 15, 2, 2), opens: 'j' }, { range: at(1, 18, 19), opens: 's' }], 1, 20).length === 1 &&
      quirk.length === 1 && quirk[0]?.opens === 'a',
    `kept ${quirk.map((l) => l.opens).join(',')}`
  );
  check(
    'S1 reading order across rows',
    linkHolds(at(1, 15, 2, 2), 20, 1, 20) && linkHolds(at(1, 15, 2, 2), 1, 2, 20) && !linkHolds(at(1, 15, 2, 2), 3, 2, 20) && !linkHolds(at(1, 15, 2, 2), 14, 1, 20),
    'start.y * cols + start.x <= y * cols + x <= end.y * cols + end.x'
  );

  // S2 the doors.
  const truth: Truth = new Map<string, Kind>([
    ['/r', 'dir'], ['/r/tortie', 'dir'], ['/r/tortie/docs', 'dir'], ['/r/tortie/a.md', 'file'], ['/r/x.md', 'file'], ['/r/notes.md', 'file']
  ]);
  const files = makeDoor(doors, 'files', truth, REPO_BASE, REPO_HOME);
  const exists = makeDoor(doors, 'exists', truth, REPO_BASE, REPO_HOME);
  const doorWord = (a: PathDoorAnswer): string => (a.door === null ? `refused ${a.refusal}` : `${a.door} ${a.path}`);
  const readings: [string, PathDoorAnswer, string][] = [
    ['files refuses a folder', files('docs/'), 'refused not-a-regular-file'],
    ['files refuses a missing path', files('nope.md'), 'refused missing'],
    ['files refuses a relative spelling resolving outside the base', files('../x.md'), 'refused outside-base'],
    ['files opens a ~/ spelling against the home', files('~/notes.md'), 'editor /r/notes.md'],
    ['files opens a relative file under the base', files('a.md'), 'editor /r/tortie/a.md'],
    ['files refuses ~foo, which is never joined', files('~foo/a.md'), 'refused not-absolute'],
    ['files resolves an absolute spelling as realpath would', files('/r/tortie/./docs/../a.md'), 'editor /r/tortie/a.md'],
    ['exists expands ~ alone to the home', exists('~'), 'editor /r'],
    ['exists accepts a folder', exists('docs/'), 'editor /r/tortie/docs'],
    ['exists refuses a relative spelling resolving outside the base', exists('../x.md'), 'refused outside-base'],
    ['exists opens an absolute spelling outside the base', exists('/r/x.md'), 'editor /r/x.md'],
    ['exists refuses a missing path', exists('/r/tortie/b.md'), 'refused missing']
  ];
  for (const [id, answer, want] of readings) check(`S2 ${id}`, doorWord(answer) === want, doorWord(answer));

  // S2 the regimes: the repository's tree, and the census both named regimes are built from.
  const tree = repoTruth(['package.json', 'src/shared/a.ts'], REPO_BASE);
  check(
    'S2 repo holds the files as files and every ancestor and the base as folders',
    tree.get('/r/tortie/package.json') === 'file' && tree.get('/r/tortie/src/shared/a.ts') === 'file' &&
      tree.get('/r/tortie/src/shared') === 'dir' && tree.get('/r/tortie/src') === 'dir' && tree.get('/r/tortie') === 'dir' && tree.size === 5,
    [...tree].map(([k, v]) => `${k} ${v}`).join(', ')
  );
  const twins = twinTruth(['package.json', 'src/shared/a.ts'], REPO_BASE, REPO_HOME);
  check(
    'S2 twin holds the tree under the project, under /q/tortie and under ~/tortiq (the home is /r), and nothing else',
    twins.get('/r/tortie/src/shared/a.ts') === 'file' && twins.get('/q/tortie/src/shared/a.ts') === 'file' &&
      twins.get('/r/tortiq/src/shared/a.ts') === 'file' && twins.get('/q/tortie/src') === 'dir' && twins.get('/r/tortiq') === 'dir' &&
      twins.size === 15,
    `${String(twins.size)} entries: ${[...twins.keys()].filter((k) => k.endsWith('a.ts')).join(', ')}`
  );
  {
    const issue = PLANTED_SHAPES.find((p) => p.name.startsWith("issue 40's"));
    if (issue !== undefined) {
      const layout: Layout = { shape: issue.name, width: issue.width, rows: issue.rows };
      const lines = layout.rows.map((r) => fakeLine(r) as unknown);
      const truths = new Map(await regimesFor(builds.parent, builds.head, layout, lines, issue, doors, null));
      const named = truths.get('named');
      const dirs = truths.get('named-dirs');
      const bottom = `${ISSUE_BASE}/.planning/brainstorming.md`;
      const top = '/Users/johnberryman/projects/github/arcturus-';
      check(
        "S2 named makes every asked spelling a file, the join's target among them",
        named?.get(ISSUE_FILE) === 'file' && named.get(bottom) === 'file' && named.get(top) === 'file' && named.get('/a/other.md') === 'file' && !truths.has('repo'),
        `${String(named?.size)} spellings, the join's target ${String(named?.get(ISSUE_FILE))}`
      );
      check(
        'S2 named-dirs makes what the parent asks a folder and the rest files',
        dirs?.get(ISSUE_FILE) === 'file' && dirs.get(bottom) === 'dir' && dirs.get(top) === 'dir' && dirs.get('/a/other.md') === 'dir',
        `the join's target ${String(dirs?.get(ISSUE_FILE))}, the bottom fragment ${String(dirs?.get(bottom))}`
      );
    } else check('S2 the census', false, "issue 40's shape is missing from PLANTED_SHAPES");
  }

  // S3 every generator twice, byte-identical, and equal to its pins.
  const pathBytes = readFileSync(REPO_PATHS);
  const tampered = Buffer.from(pathBytes);
  tampered[0] = (tampered[0] ?? 0) ^ 1;
  let refused = '';
  try {
    parseRepoPaths(tampered);
  } catch (error) {
    refused = error instanceof InputMoved ? error.message : `threw ${String(error)}`;
  }
  check('S3 a path list one byte away from the pin is refused', refused.startsWith('build/p3471/fixtures/repo-paths.txt reads sha256'), refused || 'accepted');
  const counts: Record<string, number> = {};
  for (const name of CORPUS_NAMES) {
    const a = corpusOf(name);
    const b = corpusOf(name);
    counts[name] = a.layouts.length;
    const twice = JSON.stringify(a) === JSON.stringify(b);
    const moved = pinsMoved(a);
    check(
      `S3 ${name}`,
      twice && moved.length === 0 && a.layouts.length === PINS[name].count,
      `${String(a.layouts.length)} layouts, sha256 ${digest(a.layouts)}${twice ? '' : ', NOT byte-identical twice'}${moved.length > 0 ? `; ${moved.join('; ')}` : ''}`
    );
  }

  // S4 the planted regression.
  for (const shape of PLANTED_SHAPES) {
    const layout: Layout = { shape: shape.name, width: shape.width, rows: shape.rows };
    const lines = layout.rows.map((r) => fakeLine(r) as unknown);
    const t: Truth = new Map(shape.files.map((f) => [f, 'file' as const]));
    for (const doorName of DOOR_NAMES) {
      const door = makeDoor(doors, doorName, t, shape.base, shape.home);
      const p = await readBuild(builds.parent, layout, lines, shape.base, door, true);
      const h = compareReadings(p, await readBuild(builds.head, layout, lines, shape.base, door, true));
      const x = compareReadings(p, await readBuild(builds.plant, layout, lines, shape.base, door, true));
      check(
        `S4 ${shape.name}, ${doorName} door`,
        h.regress === 0 && x.regress > 0,
        `HEAD ${String(h.regress)} regression cells, HEAD with the governing rule removed ${String(x.regress)}` +
          (x.first === null ? '' : ` (row ${String(x.first.y)} cell ${String(x.first.x)}: ${x.first.parent} -> ${String(x.first.head)})`)
      );
    }
    // THE DOOR'S KIND: the files door really gives the fragment that door,
    // and the plant that counts only the editor door's answer as taken reads
    // regressions there, and nothing on the existence door, where every
    // answer is the editor's, so the plant is what the kind decides.
    if (shape.kind !== undefined) {
      const files = makeDoor(doors, 'files', t, shape.base, shape.home);
      const exists = makeDoor(doors, 'exists', t, shape.base, shape.home);
      const given = files(shape.kind.fragment).door;
      const pf = await readBuild(builds.parent, layout, lines, shape.base, files, true);
      const xf = compareReadings(pf, await readBuild(builds.plantEditor, layout, lines, shape.base, files, true));
      const pe = await readBuild(builds.parent, layout, lines, shape.base, exists, true);
      const xe = compareReadings(pe, await readBuild(builds.plantEditor, layout, lines, shape.base, exists, true));
      check(
        `S4 ${shape.name}, the ${shape.kind.door} door's answer counted as taken`,
        given === shape.kind.door && xf.regress > 0 && xe.regress === 0,
        `the files door gives ${shape.kind.fragment} ${String(given)}; HEAD counting only the editor door's answer reads ${String(xf.regress)} regression cells on the files door` +
          (xf.first === null ? '' : ` (row ${String(xf.first.y)} cell ${String(xf.first.x)}: ${xf.first.parent} -> ${String(xf.first.head)})`) +
          ` and ${String(xe.regress)} on the existence door`
      );
    }
  }

  // S5 HEAD against HEAD over the first 200 layouts of each corpus, with 0
  // printed-path wrong-file opens on every `repo` and `twin` line, and the
  // `twin` regime read on exactly the corpora that print another folder.
  const paths = readRepoPaths();
  for (const name of CORPUS_NAMES) {
    const c = corpusOf(name);
    const lines = await measureCorpus({ ...c, layouts: c.layouts.slice(0, 200) }, builds.head, builds.head, doors, paths);
    const regress = lines.reduce((n, l) => n + l.regressCells, 0);
    const gain = lines.reduce((n, l) => n + l.gainCells, 0);
    const wrong = lines.reduce((n, l) => n + l.wrongOpens, 0);
    const printedWrong = lines.filter((l) => l.regime === 'repo' || l.regime === 'twin').reduce((n, l) => n + l.printedWrong, 0);
    const printed = c.layouts.some((l) => l.printed !== undefined);
    check(
      `S5 ${name} HEAD against HEAD`,
      regress === 0 && gain === 0 && wrong === 0 && printedWrong === 0 &&
        lines.some((l) => l.regime === 'twin') === c.twin &&
        lines.every((l) => l.layouts === 200 && l.wrongJudged === (STALE_OF[name] !== undefined) && l.printedJudged === printed),
      `regress ${String(regress)}, gain ${String(gain)}, wrong-file opens ${String(wrong)}, printed-path wrong-file opens on repo and twin ${String(printedWrong)} over ${String(lines.length)} lines of 200 layouts${c.twin ? ', twin read' : ''}${printed ? ', printed judged' : ''}`
    );
  }

  // S6 THE STALE SHAPES (his ruled round): HEAD opens no file the screen does
  // not name and moves no link, and the plant each names opens one.
  for (const shape of STALE_SHAPES) {
    const layout: Layout = { shape: shape.name, width: shape.width, rows: shape.rows, clean: shape.clean };
    const lines = layout.rows.map((r) => fakeLine(r) as unknown);
    const clean = { layout: { shape: shape.name, width: shape.width, rows: shape.clean }, lines: shape.clean.map((r) => fakeLine(r) as unknown) };
    const t: Truth = new Map(shape.files.map((f) => [f, 'file' as const]));
    const plant = shape.caughtBy === 'cut' ? builds.plantCut : builds.plantOff;
    for (const doorName of DOOR_NAMES) {
      const door = makeDoor(doors, doorName, t, shape.base, shape.home);
      const p = await readBuild(builds.parent, layout, lines, shape.base, door, true);
      const h = await readBuild(builds.head, layout, lines, shape.base, door, true);
      const x = await readBuild(plant, layout, lines, shape.base, door, true);
      const hw = await wrongJoins(builds.head, h, clean, shape.base, door);
      const xw = await wrongJoins(plant, x, clean, shape.base, door);
      const hc = compareReadings(p, h);
      const cleanJoins = [...joinsIn(await readBuild(builds.head, clean.layout, clean.lines, shape.base, door, true)).values()].filter((l) => l.opens !== NOTHING);
      check(
        `S6 ${shape.name}, ${doorName} door`,
        hw.length === 0 && hc.regress === 0 && xw.length > 0,
        `HEAD ${String(hw.length)} wrong-file opens and ${String(hc.regress)} regression cells; HEAD with J9 ${shape.caughtBy === 'cut' ? "cut (joinedPathAt's refusal removed, and J11's top half)" : 'removed'} ${String(xw.length)} wrong-file opens` +
          (xw[0] === undefined ? '' : ` (${xw[0].opens})`) +
          `; on the clean rows HEAD opens ${cleanJoins.length === 0 ? 'no join' : cleanJoins.map((l) => l.opens).join(', ')}`
      );
    }
  }

  // S7 THE CUT REPORT (his absolute-only round): one target per kind, in the
  // order the kinds are tested, and an empty printed list read as no
  // requirement.
  const P = ['/r/tortie/docs/a-b/c.md'];
  const kinds: [string, CutKind | null][] = [
    ['/r/tortie/docs/a-b/c.md', null],
    ['docs/a-b/c.md', 'relative'],
    ['~me/docs/a-b/c.md', 'relative'],
    ['/r/tortie/docs/', 'bottom-at-slash'],
    ['/r/tortie/docs/a-', 'bottom-at-dash'],
    ['/r/tortie/docs/a-b/c', 'bottom-mid-name'],
    ['/tortie/docs/a-b/c.md', 'top'],
    ['~/a-b/c.md', 'other'],
    ['/elsewhere.md', 'other']
  ];
  const kindsRead = kinds.map(([t]) => cutKind(t, P));
  check(
    'S7 the cut kinds, one target per kind, tested in order',
    kinds.every(([, want], i) => kindsRead[i] === want),
    kinds.map(([t], i) => `${t} ${String(kindsRead[i])}`).join(', ')
  );
  const noRequirement = cutReport(spans.plantAbs, [
    { shape: 'no printed list', width: 47, rows: U7_ROWS[3]?.rows ?? [], printed: [] },
    { shape: 'no printed field', width: 47, rows: U7_ROWS[3]?.rows ?? [] }
  ]);
  check(
    'S7 an empty printed list, and none, are no requirement',
    cutKind('docs/a.md', []) === null && noRequirement.judged === 0 && CUT_KINDS.every((k) => noRequirement.layouts[k] === 0),
    `judged ${String(noRequirement.judged)}, cut layouts ${JSON.stringify(noRequirement.layouts)}`
  );
  // The rows the clauses decide, through the staged `joinedPathAt` the
  // measurement reads: HEAD joins none, and the plant each names joins a cut.
  for (const u of U7_ROWS) {
    const layout: Layout = { shape: u.name, width: u.width, rows: u.rows, printed: [u.printed] };
    const atHead = cutReport(spans.head, [layout]);
    const planted = u.plant === 'j11' ? spans.plantJ11 : spans.plantAbs;
    const cut = cutReport(planted, [layout]);
    const targets = layoutJoins(planted, layout).map((j) => j.target);
    check(
      `S7 ${u.name}`,
      layoutJoins(spans.head, layout).length === 0 && CUT_KINDS.every((k) => atHead.layouts[k] === 0) &&
        cut.layouts[u.kind] === 1 && CUT_KINDS.every((k) => k === u.kind || cut.layouts[k] === 0) && targets.includes(u.target),
      `HEAD joins ${String(layoutJoins(spans.head, layout).length)} rows; with ${u.plant === 'j11' ? 'J11' : 'J10'} planted out ${JSON.stringify(cut.layouts)}, joining ${[...new Set(targets)].join(', ') || 'nothing'}`
    );
  }

  // S8 THE PRINTED-PATH COUNT on stub providers: rows 1 and 2 of a 20-column
  // screen, the join from row 1 cell 15 to row 2 cell 5.
  {
    const layout: Layout = { shape: 'stub', width: 20, rows: ['aaaa bbbbbbbb cccc', 'dd', ''] };
    const lines = layout.rows.map((r) => fakeLine(r) as unknown);
    const none: Door = () => ({ door: null, refusal: 'missing' });
    const read = (table: Record<number, StubLink[]>): Promise<Reading> => readBuild(stubMake(table), layout, lines, REPO_BASE, none, true);
    const joinOpening = (opens: string, line?: number): Record<number, StubLink[]> => {
      const j: StubLink = { range: at(1, 15, 5, 2), text: 'join', opens, ...(line === undefined ? {} : { line }) };
      return { 0: [j], 1: [j] };
    };
    const printedAt = ['/q/tortie/a/b.md'];
    const truth: Truth = new Map<string, Kind>([['/q/tortie/a', 'dir'], ['/r/tortie/a/b.md', 'file'], ['/q/tortie/a/b.md', 'file']]);
    const today = await read({});
    const count = async (head: Record<number, StubLink[]>, parent: Reading = today, printed = printedAt, t: Truth = truth): Promise<number> =>
      printedWrongJoins(await read(head), parent, printed, REPO_BASE, REPO_HOME, t).length;
    const cases: [string, number, number][] = [
      ['a join opening the printed path, at its line', await count(joinOpening('/q/tortie/a/b.md', 134)), 0],
      ["its folder, which the existence door opens and the regime holds as one", await count(joinOpening('/q/tortie/a')), 0],
      ['the same folder where the regime holds no folder', await count(joinOpening('/q/tortie/a'), today, printedAt, new Map()), 1],
      ['a one-row link opening the project copy', await count({ 0: [{ range: at(1, 1, 4), text: 'aaaa', opens: '/r/tortie/a/b.md' }] }), 0],
      ["a join opening the project's copy of the printed path's tail", await count(joinOpening('/r/tortie/a/b.md', 134)), 1],
      [
        'the same with the parent opening it on a row the join covers',
        await count(joinOpening('/r/tortie/a/b.md', 134), await read({ 1: [{ range: at(2, 1, 2), text: 'dd', opens: '/r/tortie/a/b.md' }] })),
        0
      ]
    ];
    check(
      'S8 the printed-path count on stubs',
      cases.every(([, got, want]) => got === want) && openedPath('mac:/r/brief.pdf') === '/r/brief.pdf' && openedPath('/r/a.md:134') === '/r/a.md',
      cases.map(([name, got, want]) => `${name} ${String(got)} (want ${String(want)})`).join('; ')
    );
  }
  return { checks, counts };
}

// ---------------------------------------------------------------------------
// THE ENTRY

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
}

function emit(result: unknown): void {
  console.log(JSON.stringify(result));
}

async function loadSpans(stage: string, build: string): Promise<Spans> {
  return (await import(pathToFileURL(join(stage, build, 'path-spans.ts')).href)) as Spans;
}

async function load(stage: string, build: string): Promise<Make> {
  const mod = (await import(pathToFileURL(join(stage, build, 'path-links.ts')).href)) as {
    PathLinkProvider: new (term: Term, deps: Deps, now: () => number) => Provider;
  };
  return (term, deps) => new mod.PathLinkProvider(term, deps, () => 0);
}

async function main(): Promise<number> {
  if (process.argv.includes('--repin')) {
    const pins: Record<string, { count: number; sha256: string }> = {};
    for (const name of CORPUS_NAMES) {
      const c = corpusOf(name);
      pins[name] = { count: c.layouts.length, sha256: digest(c.layouts) };
    }
    emit({ repin: pins });
    return 0;
  }
  const stage = arg('--stage');
  const doorsPath = arg('--doors');
  if (stage === undefined || doorsPath === undefined) {
    emit({ refused: 'compare.mts is run by build/p3471/corpora.mjs, which hands it --stage and --doors' });
    return 2;
  }
  const doors = (await import(pathToFileURL(doorsPath).href)) as Doors;
  if (process.argv.includes('--self-test')) {
    const builds = {
      parent: await load(stage, 'parent'),
      head: await load(stage, 'head'),
      plant: await load(stage, 'plant'),
      plantEditor: await load(stage, 'plant-editor'),
      plantCut: await load(stage, 'plant-cut'),
      plantOff: await load(stage, 'plant-off')
    };
    const spans = {
      head: await loadSpans(stage, 'head'),
      plantJ11: await loadSpans(stage, 'plant-j11'),
      plantAbs: await loadSpans(stage, 'plant-abs')
    };
    const started = Date.now();
    const { checks, counts } = await selfTest(builds, spans, doors);
    emit({ selfTest: checks, counts, ms: Date.now() - started });
    return checks.every((c) => c.pass) ? 0 : 1;
  }
  const name = arg('--corpus') as CorpusName | undefined;
  if (name === undefined || !CORPUS_NAMES.includes(name)) {
    emit({ refused: `--corpus must be one of ${CORPUS_NAMES.join(', ')}` });
    return 2;
  }
  const parent = await load(stage, 'parent');
  // The build judged as HEAD: HEAD itself, or one plant of it.
  const judged = process.argv.includes('--plant')
    ? 'plant'
    : process.argv.includes('--plant-j9')
      ? 'plant-cut'
      : process.argv.includes('--plant-abs')
        ? 'plant-abs'
        : process.argv.includes('--plant-j11')
          ? 'plant-j11'
          : 'head';
  const head = await load(stage, judged);
  const headSpans = await loadSpans(stage, judged);
  const started = Date.now();
  // Read and checked on every run, the captures' too, so a moved path list
  // refuses whatever was asked.
  const repoPaths = readRepoPaths();
  const corpus = corpusOf(name);
  const moved = pinsMoved(corpus);
  const lines = await measureCorpus(corpus, parent, head, doors, corpus.repo ? repoPaths : null);
  // The cut report reads the judged build's own grammar, so a plant is judged by its own.
  const cuts = cutReport(headSpans, corpus.layouts);
  emit({ corpus: name, layouts: corpus.layouts.length, twin: corpus.twin, pinsMoved: moved, lines, cuts, ms: Date.now() - started });
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    if (error instanceof InputMoved) {
      emit({ refused: error.message });
      process.exitCode = 2;
      return;
    }
    console.error(error);
    process.exitCode = 3;
  }
);
