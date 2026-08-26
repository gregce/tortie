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
  ARCH_PROMISE_GUIDANCE,
  ARCH_VERSION,
  type ArchComponent,
  type ArchEdge,
  type ArchProvenance
} from '@shared/arch';

/** How many parts a first draft aims for. */
export const SKELETON_TARGET = { min: 5, max: 9 } as const;

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

/** One candidate part, before it becomes a component. */
interface Group {
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

/** The prefix of a path at a given depth, or null when the path is shallower. */
function prefixAt(path: string, depth: number): string | null {
  const parts = path.split('/');
  if (parts.length <= depth) return null;
  return parts.slice(0, depth).join('/');
}

/**
 * Group the tree, workspaces first and directory depth after.
 *
 * Depth grows until there are enough groups to be worth drawing, and it stops
 * at three, because a fourth level of directory is a detail rather than a shape
 * and the merge step below is what handles the rest.
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
  const owner = new Map<string, string>();
  for (const group of groups) for (const path of group.files) owner.set(path, group.id);

  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of imports) {
    const from = owner.get(edge.fromPath);
    const to = owner.get(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    out.get(from)?.push(to);
  }

  const share = ids.length === 0 ? 0 : 1 / ids.length;
  let rank = new Map<string, number>(ids.map((id) => [id, share]));
  for (let round = 0; round < 20; round += 1) {
    const next = new Map<string, number>(ids.map((id) => [id, 0.15 * share]));
    for (const id of ids) {
      const targets = out.get(id) ?? [];
      const value = rank.get(id) ?? 0;
      if (targets.length === 0) {
        for (const other of ids) {
          next.set(other, (next.get(other) ?? 0) + (0.85 * value) / ids.length);
        }
        continue;
      }
      for (const target of targets) {
        next.set(target, (next.get(target) ?? 0) + (0.85 * value) / targets.length);
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

/** Where a group came from, from the four tests that need no judgement. */
export function classify(group: Group): ArchProvenance {
  const dir = group.dir.toLowerCase();
  if (/(^|\/)(vendor|third_party|third-party)(\/|$)/.test(dir)) return 'vendored';
  if (/(^|\/)(out|dist|generated|build\/vendor)(\/|$)/.test(dir)) return 'generated';
  if (group.files.some((path) => /\.(a|so|dylib)$|(^|\/)build\.rs$/.test(path))) {
    return 'native';
  }
  if (group.files.some((path) => /\.generated\.[a-z]+$/.test(path))) return 'generated';
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
  imports: readonly { fromPath: string; toPath: string }[]
): string {
  const owner = new Map<string, string>();
  for (const g of groups) for (const path of g.files) owner.set(path, g.id);
  let incoming = 0;
  let outgoing = 0;
  for (const edge of imports) {
    const from = owner.get(edge.fromPath);
    const to = owner.get(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    if (to === group.id) incoming += 1;
    if (from === group.id) outgoing += 1;
  }
  if (incoming === 0) return 'surface';
  if (outgoing === 0) return 'foundation';
  return 'engine';
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/** Write one JSON buffer, in the fixed shape every contract file is written in. */
function toText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Draft a whole contract from the facts. Pure, and byte for byte repeatable. */
export function draftSkeleton(input: SkeletonInput): SkeletonBuffer[] {
  const grouped = groupTree(input);
  const groups = mergeToTarget(grouped, rankGroups(grouped, input.imports));

  const components: ArchComponent[] = groups.map((group) => ({
    id: group.id,
    name: group.dir,
    kind: 'component',
    layer: bandOf(group, groups, input.imports),
    provenance: classify(group),
    anchors: [group.dir],
    boundary: 'open',
    description: '',
    evidence: [],
    deprecated: false,
    gaps: []
  }));

  const owner = new Map<string, string>();
  for (const group of groups) for (const path of group.files) owner.set(path, group.id);
  const counted = new Map<string, number>();
  for (const edge of input.imports) {
    const from = owner.get(edge.fromPath);
    const to = owner.get(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from}\u0000${to}`;
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  const edges: ArchEdge[] = [...counted.entries()]
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0] < b[0] ? -1 : 1))
    .slice(0, ARCH_PROMISE_GUIDANCE.max)
    .map(([key, count]) => {
      const [from = '', to = ''] = key.split('\u0000');
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
