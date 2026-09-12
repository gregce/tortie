/**
 * The deterministic skeleton, which is the empty state's first action (Phase
 * 63, research 49 section 4.6 tier 2).
 *
 * **Tortie spends zero tokens here and writes nothing to disk.** This is a pure
 * function over the fact base, and its output opens as unsaved editor buffers
 * at the contract paths. The person reads the draft in the editor and saves it,
 * which is an ordinary save with an ordinary place in the diff.
 *
 * ## Deterministic means byte for byte
 *
 * The same fact base gives the same bytes, every time, on any machine. Field
 * order is fixed, every list is sorted by id, and the only numbers in the
 * output are counts taken from the facts. `npm run conformance:arch` runs the
 * generator twice over the fixture and compares the bytes, because a generator
 * that drifted by one key order would make every regeneration a noisy diff.
 *
 * ## How the parts are chosen
 *
 * Directory first, because the measured literature says the directory structure
 * beats every clustering algorithm as a default. Workspace declarations are
 * read before raw tree depth, so a repository of packages draws its packages
 * rather than one box named packages. The count lands in
 * {@link SKELETON_TARGET}, and when it runs over, the lowest ranked groups are
 * folded into their parent by a personalised PageRank over the group import
 * graph, which is thirty lines below and is the whole of the clustering in this
 * phase.
 *
 * ## What the draft claims, and what it deliberately does not
 *
 * Every promise it writes is a `may`, because the generator saw the import
 * happen and an import that happens is not a promise anybody made. Turning one
 * into a `must` or a `must-not` is the person's judgement and it is the entire
 * point of the format. The guidance research 49 fix 18 asks for, being 5 to 10
 * promises to start, rides on each promise's own note where a person will read
 * it while deciding.
 *
 * The provenance classifier fills only the categories that are fully
 * computable, being first party, vendored, generated and native. It never
 * guesses at purpose, because zero of the nine categories yield purpose
 * mechanically and a guessed purpose is the thing that makes a map worse than
 * no map.
 */

import {
  ARCH_DIR,
  ARCH_FILES,
  ARCH_LIMITS,
  ARCH_PROMISE_GUIDANCE,
  ARCH_VERSION,
  type ArchComponent,
  type ArchEdge,
  type ArchFact,
  type ArchProvenance
} from '@shared/arch';
import { grammarFor } from '../symbols/languages';
import { deepestUnitOf, dirOf, underDir } from './evidence';

/**
 * How many parts a first draft aims for.
 *
 * SINCE PHASE 258 THE DRAFT TAKES RULE P'S COUNT, five to thirteen, because
 * `draftSkeleton` writes one component per `readingPartition` box (F1 of
 * research 118 §4.4 closed: the contract and the map draw from ONE
 * partition, or the overlay stays invisible). This pair still bounds
 * `groupTree` and `mergeToTarget`, which `partModules` and the drilled map
 * keep, and `min` is the floor rule P's P3 reads.
 */
export const SKELETON_TARGET = { min: 5, max: 9 } as const;

/**
 * Whether this build parses a path, which is what "source" means to rule P
 * and "parsed" means on every hover. ONE definition, read by the map, the
 * draft and the drill, so the three can never count source differently.
 */
export const sourceParseable = (path: string): boolean => grammarFor(path) !== null;

/** What the generator is given. Every field comes from the fact base. */
export interface SkeletonInput {
  /** The one line at the top of the drawing, usually the repository's own name. */
  subject: string;
  /** Every tracked path at HEAD. */
  trackedFiles: readonly string[];
  /** Every resolved import, as path to path. Unresolved ones are left out. */
  imports: readonly { fromPath: string; toPath: string }[];
  /** Directories a workspace declaration named, if the repository declares any. */
  workspaces?: readonly string[];
}

/** One unsaved buffer the editor opens. */
export interface SkeletonBuffer {
  path: string;
  text: string;
}

/**
 * One candidate part, before it becomes a component.
 *
 * Exported since Phase 160, because the map draws the same groups the draft
 * writes: one grouping, two readers, and they can never disagree.
 */
export interface Group {
  id: string;
  dir: string;
  files: string[];
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** The id a directory becomes. Kebab case, and stable for the same directory. */
export function groupId(dir: string): string {
  const cleaned = dir
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length === 0 ? 'root' : cleaned.slice(0, 63);
}

/**
 * The directory prefix of a path at a given depth, capped at the path's own
 * directory.
 *
 * A file at the top level has no directory, so it returns null at every depth
 * and belongs to no group, which is what makes an empty grouping mean exactly
 * "no tracked file sits inside a folder". Every other file keeps its deepest
 * available prefix when the loop descends past it, rather than vanishing. The
 * first version dropped any file shallower than the current depth, so a
 * repository of just `src/` and `test/` composed ZERO groups at depth 2 and
 * the map tab then called it flat, which was false (the Phase 160 second fix
 * round measured it on real fixtures: `src/main.ts, test/main.test.ts` drew
 * nothing, and so did six files under `src/main`, `src/renderer` and
 * `src/shared` beside a `src/index.ts`).
 *
 * Exported since Phase 161, because the drilled part's sub grouping in
 * ../map.ts descends by the SAME prefix rule, only starting from the part's
 * own depth: one rule, two readers, and they cannot disagree.
 */
export function prefixAt(path: string, depth: number): string | null {
  const parts = path.split('/');
  if (parts.length <= 1) return null;
  return parts.slice(0, Math.min(depth, parts.length - 1)).join('/');
}

/**
 * Group the tree, workspaces first and directory depth after.
 *
 * Depth grows until there are enough groups to be worth drawing, and it stops
 * at three, because a fourth level of directory is a detail rather than a shape
 * and the merge step below is what handles the rest.
 *
 * Fewer than {@link SKELETON_TARGET}.min groups is an acceptable answer, not a
 * failure: a repository of two folders draws two true boxes, and the only
 * repository that composes zero groups is one where no tracked file sits
 * inside a folder at all. Two real boxes beat one sentence about why nothing
 * drew (Phase 160 second fix round).
 */
export function groupTree(input: SkeletonInput): Group[] {
  const files = [...input.trackedFiles].sort();
  const declared = [...(input.workspaces ?? [])].sort();
  if (declared.length >= SKELETON_TARGET.min) {
    return declared.map((dir) => ({
      id: groupId(dir),
      dir,
      files: files.filter((path) => path === dir || path.startsWith(`${dir}/`))
    }));
  }
  for (let depth = 1; depth <= 3; depth += 1) {
    const byDir = new Map<string, string[]>();
    for (const path of files) {
      const dir = prefixAt(path, depth);
      if (dir === null) continue;
      const list = byDir.get(dir);
      if (list === undefined) byDir.set(dir, [path]);
      else list.push(path);
    }
    if (byDir.size >= SKELETON_TARGET.min || depth === 3) {
      return [...byDir.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([dir, list]) => ({ id: groupId(dir), dir, files: list }));
    }
  }
  return [];
}

/**
 * The part's files grouped one directory level below the part, by the SAME
 * prefix rule the level 1 grouping uses, descending at most two more levels
 * until there are enough boxes to be worth drawing. Fewer than the target
 * minimum is an accepted answer, the Phase 160 rule scoped.
 *
 * A merged in file that does not sit under the part's directory, which
 * `mergeToTarget` produces on purpose, keeps its own prefix at the same
 * depth, so it draws as the directory it actually lives in.
 *
 * Lived in ../map.ts as the drilled part's private sub grouping from Phase
 * 161 until Phase 179 moved it here whole, because the enrichment's fact
 * block now subdivides a drafted part by the SAME rule the drilled map
 * draws: one rule, two readers, and they cannot disagree. The one change
 * the move carried is the base depth of a part whose directory is the
 * repository root, which the map can never hand in (a computed group always
 * has a directory) and a contract component can (its anchors may span the
 * whole tree): an empty dir starts the descent at depth one rather than
 * treating the root as one path step.
 */
export function partModules(part: Group): Group[] {
  const base = part.dir === '' ? 0 : part.dir.split('/').length;
  const files = [...part.files].sort();
  for (let depth = base + 1; depth <= base + 3; depth += 1) {
    const byDir = new Map<string, string[]>();
    for (const path of files) {
      const dir = prefixAt(path, depth);
      if (dir === null) continue;
      const list = byDir.get(dir);
      if (list === undefined) byDir.set(dir, [path]);
      else list.push(path);
    }
    if (byDir.size >= SKELETON_TARGET.min || depth === base + 3) {
      return [...byDir.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([dir, list]) => ({ id: groupId(dir), dir, files: list }));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// The rollup, shared by the ranking, the draft and the map (Phase 160)
// ---------------------------------------------------------------------------

/**
 * Which group owns each path.
 *
 * This map used to be built inline in three places, being `rankGroups`,
 * `bandOf` and `draftSkeleton`, and Phase 160 needed a fourth for the map, so
 * it is one function now. A path outside every group has no entry.
 */
export function groupOwners(groups: readonly Group[]): Map<string, string> {
  const owner = new Map<string, string>();
  for (const group of groups) {
    for (const path of group.files) owner.set(path, group.id);
  }
  return owner;
}

/** The plain owner lookup as a function, the default every rollup takes. */
function lookup(
  owner: ReadonlyMap<string, string>
): (path: string) => string | undefined {
  return (path) => owner.get(path);
}

/**
 * P6, the owner fallback (Phase 201, research 77 section 4.2).
 *
 * An import target that is not a tracked file belongs to the box whose
 * directory is its longest prefix. Every Swift import has resolved at TARGET
 * grain since Phase 180, so its `toPath` is a target directory rather than a
 * file, and the plain owner map above has no entry for it: on rookery 153 of
 * 414 resolved imports, 37 percent, pointed at a Swift or Kotlin target and
 * drew nothing. This is a FALLBACK the map hands to the rollup and the band,
 * never a change to `groupOwners` itself, so the draft, the payload and the
 * ranking keep the file keyed answer they always had.
 */
export function groupOwnerWithDirs(
  groups: readonly Group[]
): (path: string) => string | undefined {
  const owner = groupOwners(groups);
  const dirs = groups
    .filter((g) => g.dir !== '')
    .sort((a, b) => b.dir.length - a.dir.length || (a.id < b.id ? -1 : 1));
  return (path) => {
    const direct = owner.get(path);
    if (direct !== undefined) return direct;
    const hit = dirs.find((g) => path === g.dir || path.startsWith(`${g.dir}/`));
    return hit?.id;
  };
}

/** One aggregated edge: files in `from` import files in `to`, `count` times. */
export interface ArchGroupEdge {
  from: string;
  to: string;
  count: number;
}

/**
 * Roll the file-to-file imports up to group-to-group edges with counts.
 *
 * UNSLICED, so the map draws every cross-group edge, and sorted heaviest
 * first with ties broken by from then to, so the same facts give the same
 * bytes whatever order the imports arrived in. Imports inside one group, and
 * imports with either end outside every group, are not edges of the drawing.
 * The draft slices this list to the promise guidance cap; the map does not.
 */
export function aggregateGroupEdges(
  groups: readonly Group[],
  imports: readonly { fromPath: string; toPath: string }[],
  ownerOf: (path: string) => string | undefined = lookup(groupOwners(groups))
): ArchGroupEdge[] {
  const counted = new Map<string, number>();
  for (const edge of imports) {
    const from = ownerOf(edge.fromPath);
    const to = ownerOf(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from}\u0000${to}`;
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  return [...counted.entries()]
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => {
      const [from = '', to = ''] = key.split('\u0000');
      return { from, to, count };
    });
}

// ---------------------------------------------------------------------------
// Ranking, so the merge is a decision rather than a coin toss
// ---------------------------------------------------------------------------

/**
 * A personalised PageRank over the group import graph.
 *
 * It answers one question: which groups does the rest of the repository lean
 * on. The ones nothing leans on are the ones that fold into their parent when
 * the count runs over, because folding a heavily depended on group is what
 * makes a first draft unreadable. Twenty iterations at a damping of 0.85 is
 * enough for a ranking, and the result is rounded before it is compared so the
 * order cannot depend on the last bit of a float.
 */
export function rankGroups(
  groups: readonly Group[],
  imports: readonly { fromPath: string; toPath: string }[]
): Map<string, number> {
  const ids = groups.map((g) => g.id);
  // The rollup is the shared one the draft and the map read too (Phase 160).
  // An edge's count is its weight, which is the same distribution the first
  // build reached by pushing one entry per import occurrence.
  const edges = aggregateGroupEdges(groups, imports);
  const out = new Map<string, ArchGroupEdge[]>(ids.map((id) => [id, []]));
  const outWeight = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const edge of edges) {
    out.get(edge.from)?.push(edge);
    outWeight.set(edge.from, (outWeight.get(edge.from) ?? 0) + edge.count);
  }

  const share = ids.length === 0 ? 0 : 1 / ids.length;
  let rank = new Map<string, number>(ids.map((id) => [id, share]));
  for (let round = 0; round < 20; round += 1) {
    const next = new Map<string, number>(ids.map((id) => [id, 0.15 * share]));
    for (const id of ids) {
      const targets = out.get(id) ?? [];
      const weight = outWeight.get(id) ?? 0;
      const value = rank.get(id) ?? 0;
      if (targets.length === 0 || weight === 0) {
        for (const other of ids) {
          next.set(other, (next.get(other) ?? 0) + (0.85 * value) / ids.length);
        }
        continue;
      }
      for (const target of targets) {
        next.set(
          target.to,
          (next.get(target.to) ?? 0) + (0.85 * value * target.count) / weight
        );
      }
    }
    rank = next;
  }
  return new Map([...rank].map(([id, value]) => [id, Math.round(value * 1e6) / 1e6]));
}

/** Fold the least depended on groups into their parent until the count fits. */
export function mergeToTarget(
  groups: readonly Group[],
  rank: ReadonlyMap<string, number>
): Group[] {
  const kept = [...groups];
  while (kept.length > SKELETON_TARGET.max) {
    const ordered = [...kept].sort((a, b) => {
      const byRank = (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0);
      if (byRank !== 0) return byRank;
      const bySize = a.files.length - b.files.length;
      if (bySize !== 0) return bySize;
      return a.id < b.id ? -1 : 1;
    });
    const weakest = ordered[0];
    if (weakest === undefined) break;
    const parentDir = weakest.dir.split('/').slice(0, -1).join('/');
    const host =
      kept.find((g) => g.id !== weakest.id && g.dir === parentDir) ??
      ordered.find((g) => g.id !== weakest.id);
    if (host === undefined) break;
    host.files = [...host.files, ...weakest.files].sort();
    kept.splice(kept.indexOf(weakest), 1);
  }
  return kept.sort((a, b) => (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Classifying, and only what is fully computable
// ---------------------------------------------------------------------------

/**
 * Where a group came from, from the four tests that need no judgement.
 *
 * The directory-name tests are about the WHOLE group, so they stay a single
 * answer. The file-suffix tests ask for a MAJORITY since Phase 160, because
 * one `*.generated.ts` file used to flip a whole group: measured on this
 * repository, two generated files made the entire 1,711-file `src` group
 * classify as generated, which was harmless in a draft a person edits and
 * wrong on a map that styles every box by provenance.
 */
export function classify(group: Group): ArchProvenance {
  const dir = group.dir.toLowerCase();
  if (/(^|\/)(vendor|third_party|third-party)(\/|$)/.test(dir)) return 'vendored';
  if (/(^|\/)(out|dist|generated|build\/vendor)(\/|$)/.test(dir)) return 'generated';
  const native = group.files.filter(
    (path) => /\.(a|so|dylib)$|(^|\/)build\.rs$/.test(path)
  ).length;
  if (native * 2 > group.files.length) return 'native';
  const generated = group.files.filter(
    (path) => /\.generated\.[a-z]+$/.test(path)
  ).length;
  if (generated * 2 > group.files.length) return 'generated';
  return 'first-party';
}

/**
 * The three bands, assigned from the import graph rather than from a name.
 *
 * A group nothing imports is at the surface, a group that imports nothing else
 * is the foundation, and everything between is the engine. It is a computed
 * answer rather than a guess about what a directory called `core` means, and a
 * person changing it is exactly the kind of edit this draft exists to invite.
 */
export function bandOf(
  group: Group,
  groups: readonly Group[],
  imports: readonly { fromPath: string; toPath: string }[],
  ownerOf: (path: string) => string | undefined = lookup(groupOwners(groups))
): string {
  let incoming = 0;
  let outgoing = 0;
  for (const edge of imports) {
    const from = ownerOf(edge.fromPath);
    const to = ownerOf(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    if (to === group.id) incoming += 1;
    if (from === group.id) outgoing += 1;
  }
  if (incoming === 0) return 'surface';
  if (outgoing === 0) return 'foundation';
  return 'engine';
}

// ---------------------------------------------------------------------------
// Rule P, the reading partition (Phase 201, research 77 section 4.2)
// ---------------------------------------------------------------------------

/**
 * The cut the map, the drill and the sidebar all draw since Phase 201.
 *
 * `groupTree` above stops at depth one as soon as five top level directories
 * exist, and junk directories satisfy that test while the code sits in one
 * box: on gmux it drew `src` holding 78 percent of the files beside `.claude`
 * holding one. Research 77 measured a sentence over those boxes as useful 62
 * percent of the time and over these 89 percent, 100 counting three flat
 * parts, on gmux, rookery and ripgrep. Every step below is a fact test over
 * the primitives already in this file.
 *
 *  P1 seeds. Two or more npm workspaces or Cargo member crates make each
 *     declared directory a box, deepest first, so a member inside a member
 *     holds its own files and the parent the rest. Otherwise every top level
 *     directory is one. Root files go to the fold.
 *  P2 split. While a box holds more than half the parsed files and has two or
 *     more child directories, replace it with its children. Depth stops at 3.
 *  P3 fold. A box with no parsed file and fewer than the larger of 20 files
 *     or 5 percent of the tree folds; a box with fewer than three parsed
 *     files folds; a seed never folds. The fold is one box, `other`, named
 *     everything else on its face. ONE FLOOR the research did not write: when
 *     that fold would leave fewer than {@link SKELETON_TARGET}.min boxes of
 *     source, no box of source folds, because a nine file repository must
 *     still draw its folders (the Phase 160 second fix round). It never fires
 *     on gmux, rookery or ripgrep. It fires on psf/black, where the fold
 *     would leave four boxes of source, and keeps docs and action as boxes
 *     of one parsed file each (the Phase 201 verifier).
 *  P4 cap. Twelve boxes. Over it, fold boxes with no source, smallest first,
 *     and never fold a box of source for the count, so ripgrep lists thirteen.
 *  P5 label. The deepest directory all of a box's files share, so a seeded
 *     workspace's leftover with one child is named for the child.
 *  P6 owner. {@link groupOwnerWithDirs}, which the map hands to the rollup.
 *
 * The draft in this file keeps `groupTree`: a contract is written over the
 * skeleton's own five to nine parts and `npm run conformance:arch` pins that.
 */
export interface ReadingInput extends SkeletonInput {
  /** Directories the Cargo workspace's member crates live in, if any. */
  crates?: readonly string[];
  /** Whether this build parses a path, which is what "source" means here. */
  parseable: (path: string) => boolean;
}

/** What rule P answers. */
export interface ReadingPartition {
  /** Every box, sorted by id. The fold, when present, is `READING_FOLD_ID`. */
  boxes: Group[];
  /** The directories folded into everything else, sorted. */
  folded: string[];
  /** How many tracked files sit at the repository root. They fold too. */
  rootFiles: number;
  /** Where P1 took its seeds from. */
  seeded: 'directories' | 'npm workspaces' | 'cargo crates';
}

/** The fold's group id, and its label on every face. */
export const READING_FOLD_ID = 'other';
export const READING_FOLD_LABEL = 'everything else';

/** P4. */
export const READING_MAX = 12;
/** P3, the larger of these two decides whether a box with no source stays. */
export const READING_SMALL_FILES = 20;
export const READING_SMALL_SHARE = 0.05;

/** The files of a box one directory below `depth`, keyed by that directory. */
function childrenAt(box: Group, depth: number): Map<string, string[]> {
  const byDir = new Map<string, string[]>();
  for (const path of box.files) {
    const dir = prefixAt(path, depth);
    if (dir === null || dir === box.dir) continue;
    const list = byDir.get(dir);
    if (list === undefined) byDir.set(dir, [path]);
    else list.push(path);
  }
  return byDir;
}

/** The deepest directory every file in the list shares, '' when none. */
export function commonDirOf(files: readonly string[]): string {
  let common: string[] | null = null;
  for (const path of files) {
    const dirs = path.split('/').slice(0, -1);
    if (common === null) {
      common = dirs;
      continue;
    }
    let i = 0;
    while (i < common.length && i < dirs.length && common[i] === dirs[i]) i += 1;
    common.length = i;
  }
  return (common ?? []).join('/');
}

export function readingPartition(input: ReadingInput): ReadingPartition {
  const files = [...input.trackedFiles].sort();
  const isSource = input.parseable;
  const totalParsed = files.filter(isSource).length;
  const npm = [...(input.workspaces ?? [])];
  const cargo = [...(input.crates ?? [])].filter((d) => d !== '');
  const seeds = [...new Set([...npm, ...cargo])].sort();

  // P1.
  let boxes: Group[] = [];
  let seeded: ReadingPartition['seeded'] = 'directories';
  const placed = new Set<string>();
  const seedSet = new Set<string>();
  if (seeds.length >= 2) {
    seeded = npm.length >= 2 ? 'npm workspaces' : 'cargo crates';
    // Deepest first, so a member declared inside another member takes its
    // own files and the parent keeps the rest. Read shallowest first, the
    // parent took the child's files too, and a Cargo tree of `crates/a` and
    // `crates/a/macros` drew the macros twice under one id (the Phase 201
    // fix round, found by the verifier's nested seeds attack).
    const deepestFirst = [...seeds].sort(
      (a, b) => b.split('/').length - a.split('/').length || (a < b ? -1 : 1)
    );
    for (const dir of deepestFirst) {
      const own = files.filter((p) => !placed.has(p) && (p === dir || p.startsWith(`${dir}/`)));
      if (own.length === 0) continue;
      for (const p of own) placed.add(p);
      seedSet.add(dir);
      boxes.push({ id: groupId(dir), dir, files: own });
    }
  }
  const byTop = new Map<string, string[]>();
  const rootList: string[] = [];
  for (const p of files) {
    if (placed.has(p)) continue;
    const dir = prefixAt(p, 1);
    if (dir === null) {
      rootList.push(p);
      continue;
    }
    const list = byTop.get(dir);
    if (list === undefined) byTop.set(dir, [p]);
    else list.push(p);
  }
  for (const [dir, list] of byTop) boxes.push({ id: groupId(dir), dir, files: list });

  // P2.
  let changed = true;
  while (changed) {
    changed = false;
    for (const box of [...boxes].sort((a, b) => (a.dir < b.dir ? -1 : 1))) {
      const depth = box.dir.split('/').length;
      if (depth >= 3) continue;
      const parsed = box.files.filter(isSource).length;
      if (parsed * 2 <= totalParsed) continue;
      const kids = childrenAt(box, depth + 1);
      if (kids.size < 2) continue;
      const loose = box.files.filter((p) => prefixAt(p, depth + 1) === box.dir);
      boxes = boxes.filter((b) => b !== box);
      for (const [dir, list] of kids) boxes.push({ id: groupId(dir), dir, files: list });
      if (loose.length > 0) {
        boxes.push({ id: `${groupId(box.dir)}-loose`, dir: box.dir, files: loose });
      }
      changed = true;
      break;
    }
  }

  // P3.
  const smallLimit = Math.max(
    READING_SMALL_FILES,
    Math.floor(files.length * READING_SMALL_SHARE)
  );
  const folded: string[] = [];
  const otherFiles: string[] = [...rootList];
  const hasSource = (b: Group): boolean => b.files.some(isSource);
  const foldable = (box: Group, keepSource: boolean): boolean => {
    if (seedSet.has(box.dir)) return false;
    const parsed = box.files.filter(isSource).length;
    if (parsed === 0) return box.files.length < smallLimit;
    return keepSource ? false : parsed < 3;
  };
  const ordered = [...boxes].sort((a, b) => (a.dir < b.dir ? -1 : 1));
  const survivors = ordered.filter((b) => !foldable(b, false) && hasSource(b)).length;
  const keepSource = survivors < SKELETON_TARGET.min;
  const kept: Group[] = [];
  for (const box of ordered) {
    if (foldable(box, keepSource)) {
      folded.push(box.dir);
      otherFiles.push(...box.files);
    } else kept.push(box);
  }
  boxes = kept;

  // P4.
  const overCap = (): boolean =>
    boxes.length + (otherFiles.length > 0 ? 1 : 0) > READING_MAX;
  for (;;) {
    if (!overCap()) break;
    const victims = boxes
      .filter((b) => !seedSet.has(b.dir) && !hasSource(b))
      .sort((a, b) => a.files.length - b.files.length || (a.dir < b.dir ? -1 : 1));
    const victim = victims[0];
    if (victim === undefined) break;
    boxes = boxes.filter((b) => b !== victim);
    folded.push(victim.dir);
    otherFiles.push(...victim.files);
  }

  // P5.
  for (const box of boxes) {
    const common = commonDirOf(box.files);
    if (common !== '' && common !== box.dir && common.startsWith(box.dir)) {
      box.dir = common;
      box.id = groupId(common);
    }
  }
  if (otherFiles.length > 0) {
    boxes.push({ id: READING_FOLD_ID, dir: '', files: otherFiles.sort() });
  }
  return {
    boxes: boxes.sort((a, b) => (a.id < b.id ? -1 : 1)),
    folded: folded.sort(),
    rootFiles: rootList.length,
    seeded
  };
}

// ---------------------------------------------------------------------------
// Rule Q, the units and the regions (Phase 258, research 118 §7.6, SPEC §3.1)
// ---------------------------------------------------------------------------

/**
 * A UNIT is one thing the repository builds or starts, with a directory as
 * its extent. Regions come from units, and units come from what a manifest
 * declares and what a program starts, NEVER from `boundary.path.module-root`:
 * research 118 §7.6 measured the build-and-start kinds at 15 of 15 and the
 * module roots at 30 of 30, and on this repository 75 of 80 boundary facts
 * are `index.ts` barrels that a partition drawn from them would draw as
 * seventy-five processes. Every step below is a fact test; nothing reads a
 * `module-root` row and nothing here reads a file.
 *
 *  Q1 units. Every npm workspace member and Cargo member crate; every
 *     `boundary.library` (the manifest's directory, or `Sources/<name>` for a
 *     SwiftPM target when tracked); every `entrypoint` of kind
 *     `package-main`, `bin`, `container` or `process` at the declaring file's
 *     directory; and every source `entrypoint.main` at the nearest ancestor
 *     directory holding a manifest OF THE FILE'S OWN FAMILY, else the file's
 *     own directory. The family rule is the correction to a draft that walked
 *     to ANY manifest and made stoa's root a unit through a pen-test python
 *     script under `docs/`. Workers, threads, utility processes and compose
 *     services are STARTS (Q5), never units; the workspace root that declares
 *     members is not a unit, its members are. Units are deduped on directory
 *     and the root '' is allowed.
 *  Q2 ownership. A rule P box belongs to the deepest unit whose directory is
 *     a prefix of the box's, the root matching everything; the fold belongs
 *     where '' belongs. `deepestUnitOf` in ./evidence.ts is the one function,
 *     shared with the seeds, so a part and its seeds agree about their unit.
 *  Q3 Elsewhere. One region, `elsewhere`, for boxes under no unit, drawn only
 *     when it holds a box. It never holds a start.
 *  Q4 one thing. When every box belongs to ONE unit and nothing is Elsewhere,
 *     that region's sub reads `the one thing this repository builds`. On this
 *     repository that is the picture: one region, eight boxes, two worker
 *     starts. Nothing invents four.
 *  Q5 starts. Every `boundary` fact of kind `worker`, `thread`, `process` or
 *     `service` is a start in the region owning its file; a unit that owns no
 *     box is ALSO a start of the region owning its directory, so this
 *     repository's seven fixture manifests under `build/fixtures/facts/**`
 *     read `starts 7 …` on the one region, which is exactly the noise a
 *     reader should see.
 *  Q6 outside. One dashed band, `outside`, drawn only when the repository
 *     carries any `effect.spawn`, `network.*` or `surface.port` fact. It holds
 *     no box and no start.
 *  Q7 order. Units with boxes by parsed files descending, then Elsewhere,
 *     then Outside. Ids are `unit:<dir>`, `unit:` at the root, `elsewhere`
 *     and `outside`.
 */
export type ArchUnitKind =
  | 'package'
  | 'crate'
  | 'library'
  | 'command'
  | 'container'
  | 'process'
  | 'program';

/** One thing the repository builds or starts. */
export interface ArchUnit {
  /** `unit:<dir>`, `unit:` at the root. */
  id: string;
  /** The extent, '' at the root. */
  dir: string;
  /** The declared name, else the last path segment, else the subject at the root. */
  label: string;
  /** The kind phrase: `npm package`, `cargo crate`, `go program` and so on. */
  sub: string;
  kind: ArchUnitKind;
  /** The file that made it a unit, and the line, for the starts list. */
  file: string;
  line: number;
}

/** What `unitsOf` is given. Every field comes from the fact base. */
export interface UnitsInput {
  /** The one line at the top of the drawing; the root unit's last-resort label. */
  subject: string;
  trackedFiles: readonly string[];
  /** Every `entrypoint` and `boundary` fact; other categories are ignored. */
  facts: readonly ArchFact[];
  /** Directories a workspace declaration named, if any. */
  workspaces?: readonly string[];
  /** Directories the Cargo workspace's member crates live in, if any. */
  crates?: readonly string[];
  /** The name a manifest declares, keyed by the manifest's directory. */
  names?: ReadonlyMap<string, string>;
}

/** The manifest names of each source family, for Q1's `main` rule. */
const FAMILY_MANIFESTS: readonly { ext: RegExp; manifests: readonly string[]; sub: string }[] = [
  { ext: /\.(ts|tsx|js|mjs|cjs|jsx|mts|cts)$/, manifests: ['package.json'], sub: 'node program' },
  { ext: /\.rs$/, manifests: ['Cargo.toml'], sub: 'rust program' },
  { ext: /\.go$/, manifests: ['go.mod'], sub: 'go program' },
  { ext: /\.pyi?$/, manifests: ['pyproject.toml', 'setup.py', 'setup.cfg'], sub: 'python program' },
  { ext: /\.swift$/, manifests: ['Package.swift'], sub: 'swift app' },
  { ext: /\.rb$/, manifests: ['Gemfile'], sub: 'ruby program' }
];

const LAST_SEGMENT = (dir: string): string => dir.slice(dir.lastIndexOf('/') + 1);

/** Q1. The units, sorted by directory. */
export function unitsOf(input: UnitsInput): ArchUnit[] {
  const tracked = new Set(input.trackedFiles);
  const names = input.names ?? new Map<string, string>();
  const byDir = new Map<string, ArchUnit>();
  const add = (dir: string, kind: ArchUnitKind, sub: string, file: string, line: number): void => {
    if (byDir.has(dir)) return;
    const label = names.get(dir) ?? (dir === '' ? input.subject : LAST_SEGMENT(dir));
    byDir.set(dir, { id: `unit:${dir}`, dir, label, sub, kind, file, line });
  };
  const manifestAt = (dir: string, name: string): string => (dir === '' ? name : `${dir}/${name}`);
  for (const dir of [...(input.workspaces ?? [])].sort()) {
    add(dir, 'package', 'npm package', manifestAt(dir, 'package.json'), 1);
  }
  for (const dir of [...(input.crates ?? [])].filter((d) => d !== '').sort()) {
    add(dir, 'crate', 'cargo crate', manifestAt(dir, 'Cargo.toml'), 1);
  }
  const ordered = [...input.facts].sort(
    (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line)
  );
  for (const f of ordered) {
    if (f.category !== 'boundary' || f.kind !== 'library') continue;
    const dir = dirOf(f.file);
    if (f.rule === 'boundary.swiftpm.target') {
      const m = /^swift \w+ (.+)$/.exec(f.subject);
      const target = m === null ? null : `${dir === '' ? '' : `${dir}/`}Sources/${m[1] as string}`;
      const held =
        target !== null && input.trackedFiles.some((p) => p.startsWith(`${target}/`));
      add(held && target !== null ? target : dir, 'library', 'swift library', f.file, f.line);
    } else {
      add(dir, 'library', 'cargo library', f.file, f.line);
    }
  }
  for (const f of ordered) {
    if (f.category !== 'entrypoint') continue;
    const dir = dirOf(f.file);
    if (f.kind === 'package-main') add(dir, 'package', 'npm package', f.file, f.line);
    else if (f.kind === 'bin') {
      if (f.rule === 'entrypoint.cargo.bin') add(dir, 'crate', 'cargo crate', f.file, f.line);
      else if (f.rule === 'entrypoint.swiftpm.target') add(dir, 'program', 'swift app', f.file, f.line);
      else add(dir, 'command', 'command', f.file, f.line);
    } else if (f.kind === 'container') add(dir, 'container', 'container', f.file, f.line);
    else if (f.kind === 'process') add(dir, 'process', 'procfile process', f.file, f.line);
  }
  for (const f of ordered) {
    if (f.category !== 'entrypoint' || f.kind !== 'main') continue;
    const family = FAMILY_MANIFESTS.find((fam) => fam.ext.test(f.file));
    const own = dirOf(f.file);
    let found: string | null = null;
    if (family !== undefined) {
      let d = own;
      for (;;) {
        if (family.manifests.some((m) => tracked.has(manifestAt(d, m)))) {
          found = d;
          break;
        }
        if (d === '') break;
        d = dirOf(d);
      }
    }
    add(found ?? own, 'program', family?.sub ?? 'program', f.file, f.line);
  }
  return [...byDir.values()].sort((a, b) => (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0));
}

/** One start inside a region: a worker, a thread, a process, a service, or a boxless unit. */
export interface ArchRegionStart {
  kind: 'worker' | 'thread' | 'process' | 'service' | 'unit';
  /** The fact's subject, or a boxless unit's kind phrase, which is what the starts line counts. */
  label: string;
  file: string;
  line: number;
}

/** One region before it becomes a wire row. */
export interface ArchRegionDraft {
  id: string;
  kind: 'unit' | 'elsewhere' | 'outside';
  label: string;
  sub: string;
  dir: string | null;
  unit: ArchUnit | null;
  /** Rule P box ids, heaviest first. */
  groupIds: string[];
  starts: ArchRegionStart[];
  files: number;
  parsed: number;
}

/** What rule Q answers over one set of boxes. */
export interface ArchRegionCut {
  regions: ArchRegionDraft[];
  units: ArchUnit[];
  /** Q2 over EVERY unit, for the seeds. */
  unitOf: (path: string) => ArchUnit | null;
  /** The region each box belongs to. */
  regionOfGroup: ReadonlyMap<string, string>;
  /** Q4. */
  oneThing: boolean;
}

/** The kinds Q5 counts, in the order the starts line names them. */
export const ARCH_START_KIND_ORDER: readonly ArchRegionStart['kind'][] = [
  'worker',
  'thread',
  'process',
  'service',
  'unit'
];

const START_KINDS: ReadonlySet<string> = new Set(['worker', 'thread', 'process', 'service']);

export const READING_ONE_THING_SUB = 'the one thing this repository builds';
export const READING_ELSEWHERE_LABEL = 'Elsewhere';
export const READING_ELSEWHERE_SUB = 'no manifest names these';
export const READING_OUTSIDE_LABEL = 'Outside this repository';
export const READING_OUTSIDE_SUB = 'programs and hosts it reaches';

/** Q2 to Q7 over rule P's boxes. Pure, and the same bytes for the same facts. */
export function regionCut(input: {
  boxes: readonly Group[];
  units: readonly ArchUnit[];
  facts: readonly ArchFact[];
  parseable: (path: string) => boolean;
}): ArchRegionCut {
  const units = [...input.units];
  const unitOf = deepestUnitOf(units);
  const boxes = [...input.boxes].sort(
    (a, b) => b.files.length - a.files.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const byUnit = new Map<string, ArchRegionDraft>();
  const elsewhere: ArchRegionDraft = {
    id: 'elsewhere',
    kind: 'elsewhere',
    label: READING_ELSEWHERE_LABEL,
    sub: READING_ELSEWHERE_SUB,
    dir: null,
    unit: null,
    groupIds: [],
    starts: [],
    files: 0,
    parsed: 0
  };
  const regionOfGroup = new Map<string, string>();
  for (const box of boxes) {
    const owner = unitOf(box.id === READING_FOLD_ID ? '' : box.dir);
    let region: ArchRegionDraft;
    if (owner === null) region = elsewhere;
    else {
      const held = byUnit.get(owner.id);
      if (held !== undefined) region = held;
      else {
        region = {
          id: owner.id,
          kind: 'unit',
          label: owner.label,
          sub: owner.sub,
          dir: owner.dir,
          unit: owner,
          groupIds: [],
          starts: [],
          files: 0,
          parsed: 0
        };
        byUnit.set(owner.id, region);
      }
    }
    region.groupIds.push(box.id);
    region.files += box.files.length;
    region.parsed += box.files.filter(input.parseable).length;
    regionOfGroup.set(box.id, region.id);
  }
  // Q5. A start lands in the region owning its file, among the units that
  // hold boxes; Elsewhere never holds one, and a start under no such unit
  // has no region to sit in and is not drawn.
  const withBoxes = units.filter((u) => byUnit.has(u.id));
  const startOwner = deepestUnitOf(withBoxes);
  const ordered = [...input.facts].sort(
    (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line)
  );
  for (const f of ordered) {
    if (f.category !== 'boundary' || !START_KINDS.has(f.kind)) continue;
    const owner = startOwner(f.file);
    if (owner === null) continue;
    byUnit.get(owner.id)?.starts.push({
      kind: f.kind as ArchRegionStart['kind'],
      label: f.subject,
      file: f.file,
      line: f.line
    });
  }
  for (const u of units) {
    if (byUnit.has(u.id)) continue;
    const owner = startOwner(u.dir);
    if (owner === null) continue;
    byUnit.get(owner.id)?.starts.push({ kind: 'unit', label: u.sub, file: u.file, line: u.line });
  }
  for (const region of byUnit.values()) {
    region.starts.sort(
      (a, b) =>
        ARCH_START_KIND_ORDER.indexOf(a.kind) - ARCH_START_KIND_ORDER.indexOf(b.kind) ||
        (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line)
    );
  }
  // Q4.
  const oneThing = elsewhere.groupIds.length === 0 && byUnit.size === 1;
  if (oneThing) for (const region of byUnit.values()) region.sub = READING_ONE_THING_SUB;
  // Q6.
  const outsideOwed = input.facts.some(
    (f) =>
      (f.category === 'effect' && f.kind === 'spawn') ||
      f.category === 'network' ||
      (f.category === 'surface' && f.kind === 'port')
  );
  // Q7.
  const regions = [...byUnit.values()].sort(
    (a, b) => b.parsed - a.parsed || b.files - a.files || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  if (elsewhere.groupIds.length > 0) regions.push(elsewhere);
  if (outsideOwed) {
    regions.push({
      id: 'outside',
      kind: 'outside',
      label: READING_OUTSIDE_LABEL,
      sub: READING_OUTSIDE_SUB,
      dir: null,
      unit: null,
      groupIds: [],
      starts: [],
      files: 0,
      parsed: 0
    });
  }
  return { regions, units, unitOf, regionOfGroup, oneThing };
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/** Write one JSON buffer, in the fixed shape every contract file is written in. */
function toText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** What the draft is given: the skeleton input, plus rule P's two extras. */
export interface DraftInput extends SkeletonInput {
  /** Directories the Cargo workspace's member crates live in, if any. */
  crates?: readonly string[];
  /** Whether this build parses a path. Defaults to {@link sourceParseable}. */
  parseable?: (path: string) => boolean;
}

/** A component name inside the format's bound: the directory, or its last segment. */
function componentNameOf(dir: string): string {
  if (dir.length <= ARCH_LIMITS.maxName) return dir;
  return LAST_SEGMENT(dir).slice(0, ARCH_LIMITS.maxName);
}

/**
 * The anchors of one box, chosen so a strict majority of what they match
 * sits in exactly that box, which is what lets the overlay paint it (the F1
 * rule `npm run conformance:reading` rule 12 pins). A box with no other box
 * nested under its directory is its directory. A box with one nested under
 * it, being P2's loose files or a workspace member holding a member, is the
 * directories its own files sit in, each matched one level deep with `dir/*`,
 * so the nested box's files are not claimed twice. The fold is the folded
 * directories; root files are anchored nowhere and the draft says so.
 */
function anchorsOf(box: Group, boxes: readonly Group[], folded: readonly string[]): string[] {
  if (box.id === READING_FOLD_ID) return folded.slice(0, ARCH_LIMITS.maxAnchors);
  const nested = boxes.some((b) => b !== box && b.dir !== '' && underDir(box.dir, b.dir) && b.dir !== box.dir);
  if (!nested) return [box.dir];
  const dirs = [...new Set(box.files.map(dirOf))].sort();
  const globs = dirs.map((d) => (d === '' ? '*' : `${d}/*`));
  return globs.length <= ARCH_LIMITS.maxAnchors ? globs : [box.dir];
}

/**
 * Draft a whole contract from the facts. Pure, and byte for byte repeatable.
 *
 * SINCE PHASE 258 IT WRITES ONE COMPONENT PER RULE P BOX, with `id = box.id`,
 * so the contract, the map, the drill, the sidebar, the inspector and the
 * worksheet all name the same parts by the same ids. Before that it grouped
 * with `groupTree` and `mergeToTarget` while the map drew `readingPartition`,
 * and on this repository the two partitions shared no box: the draft wrote
 * `src` where the map drew `src/main`, `src/renderer`, `src/shared` and
 * `src/preload`, so the overlay painted 0 of 8 boxes with the drafted
 * contract saved (research 118 §4.4 F1). `groupTree`, `rankGroups` and
 * `mergeToTarget` stay for `partModules`.
 */
export function draftSkeleton(input: DraftInput): SkeletonBuffer[] {
  const cut = readingPartition({
    subject: input.subject,
    trackedFiles: input.trackedFiles,
    imports: input.imports,
    parseable: input.parseable ?? sourceParseable,
    ...(input.workspaces === undefined ? {} : { workspaces: input.workspaces }),
    ...(input.crates === undefined ? {} : { crates: input.crates })
  });
  const groups = cut.boxes;
  const ownerOf = groupOwnerWithDirs(groups);

  const components: ArchComponent[] = [];
  for (const group of groups) {
    const isFold = group.id === READING_FOLD_ID;
    const anchors = anchorsOf(group, groups, cut.folded);
    // A component must name a place. A fold holding only root files has no
    // directory to name, so it is left to the map, which draws it unpainted
    // either way.
    if (anchors.length === 0) continue;
    components.push({
      id: group.id,
      name: isFold ? READING_FOLD_LABEL : componentNameOf(group.dir),
      kind: 'component',
      layer: bandOf(group, groups, input.imports, ownerOf),
      provenance: classify(group),
      anchors,
      boundary: 'open',
      description: isFold
        ? `The small directories, folded together.${
            cut.rootFiles > 0 ? ' Files at the repository root sit here too and are anchored nowhere.' : ''
          }`
        : '',
      evidence: [],
      deprecated: false,
      gaps: []
    });
  }

  const edges: ArchEdge[] = aggregateGroupEdges(groups, input.imports, ownerOf)
    .slice(0, ARCH_PROMISE_GUIDANCE.max)
    .map(({ from, to, count }) => {
      const row: ArchEdge = {
        id: `${from}-imports-${to}`.slice(0, 63),
        from,
        to,
        kind: 'imports',
        rule: 'may',
        checker: 'imports',
        note:
          `Tortie saw this import ${count} ${count === 1 ? 'time' : 'times'} ` +
          `and wrote it down as something that happens, not as a promise. ` +
          `Decide whether it is one. A healthy contract starts with ` +
          `${ARCH_PROMISE_GUIDANCE.min} to ${ARCH_PROMISE_GUIDANCE.max} ` +
          `promises about what must and must not happen.`,
        evidence: []
      };
      return row;
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const bands = ['surface', 'engine', 'foundation'];
  const contract = {
    version: ARCH_VERSION,
    subject: input.subject,
    strictness: 'not-wrong' as const,
    layers: bands.map((id, order) => ({ id, name: id, order })),
    flows: [] as string[]
  };

  return [
    { path: `${ARCH_DIR}/${ARCH_FILES.contract}`, text: toText(contract) },
    ...components.map((component) => ({
      path: `${ARCH_DIR}/${ARCH_FILES.components}/${component.id}.json`,
      text: toText(component)
    })),
    { path: `${ARCH_DIR}/${ARCH_FILES.edges}`, text: toText({ edges }) },
    { path: `${ARCH_DIR}/${ARCH_FILES.baseline}`, text: toText({ accepted: [] }) }
  ];
}
