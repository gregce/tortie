/**
 * The computed level 2 view: what one part is actually made of (Phase 64).
 *
 * ## Everything here is computed, and none of it is authored
 *
 * Research 49 section 9.6's node table gives Module one row, being "A filename
 * inside a component", and its model column reads "Computed at level 2, never
 * authored". So the only thing `docs/arch/` contributes is the part's anchors.
 * Which tracked files those anchors name comes from `componentFiles` against
 * one fixed `git ls-files -z`, and which of those files name which others comes
 * out of the import graph `./scan.ts` already wrote into `arch.db`. A person
 * cannot write a module list, cannot write an edge, and cannot make either say
 * something the code does not.
 *
 * ## THE FIELD A CHECKER MAY BRANCH ON IS `resolution`, NEVER `toPath`
 *
 * `./checkers/facts.ts` records the measurement in full. The first build of
 * this feature read a null `toPath` as "the resolver failed", and on Tortie's
 * own tree that made the strip say 2,363 of 8,447 imports were unresolved when
 * the true number was none of them, because `node:path` and `react` both have
 * a null path and both are DEFINITE answers. Every branch below reads
 * `resolution` first, and `toPath` is only ever dereferenced once
 * `resolution === 'first-party'` has already been established.
 *
 * ## Three grades, because a drawing with too many boxes cannot be read
 *
 * The field's own word for that is the hairball, and section 6.3 records that
 * NDepend switched to a dependency matrix past "a few dozens boxes". The caps
 * live beside the answer shape in `src/shared/ipc/arch-modules.ts`, which
 * every consumer reaches through the `@shared/ipc` facade, and they are
 * section 7's row for L2 plus section 4.8 fix 11. The grade is decided HERE
 * rather than in the renderer, so there is one copy of the rule and a probe can
 * drive it without a window.
 *
 * ## What this module may not do, and the wall that holds it
 *
 * `build/assert-import-boundaries.mjs` forbids everything under
 * `src/main/arch/` from naming `main/manifest/`, `main/restore/` or
 * `main/context/`, because arch reads a repository and answers about files and
 * has no business naming the thing that decides whether a session comes back.
 * Nothing here knows a session exists. It also adds no sixth git call: the one
 * argv it composes is `lsFilesCall()` out of `./argv-guard.ts`, which is
 * already one of the five, and no field of any contract file reaches it.
 */

import type { ArchComponent, ArchDocument, ArchVerdict } from '@shared/arch';
import type {
  ArchModuleBox,
  ArchModuleBroke,
  ArchModuleGrade,
  ArchModuleMatrix,
  ArchModuleMatrixCell,
  ArchModuleRank,
  ArchModuleTop,
  ArchModuleUnparsed,
  ArchModulesInput,
  ArchModulesResult
} from '@shared/ipc';
import {
  ARCH_MODULE_BOX_CAP,
  ARCH_MODULE_MATRIX_CAP,
  ARCH_MODULE_TOP_CAP
} from '@shared/ipc';
import { grammarFor } from '../symbols/languages';
import { lsFilesCall } from './argv-guard';
import { componentFiles } from './checkers/glob';
import type { ArchImportEdge, ArchStore } from './db';
import { archRepoKey } from './db';
import { createArchGitRunner, readLsFiles } from './git-facts';
import { createArchFileSystem, loadArchDocument } from './load';

// ---------------------------------------------------------------------------
// The pure core
// ---------------------------------------------------------------------------

/**
 * Everything the computation sees. Nothing is read, spawned or opened in here.
 *
 * It is a separate shape from {@link ArchModulesInput} on purpose: the caps and
 * the grade rule are the risky part of this phase, and a pure function over
 * plain arrays is what lets `src/main/arch/__tests__/modules.test.ts` and
 * `build/conformance-arch-modules.mjs` drive a part of four hundred files past
 * both fallbacks without a repository, a database or a window.
 */
export interface ArchModulesFacts {
  cwd: string;
  componentId: string;
  /** The part, or null when the contract has no such id. */
  component: ArchComponent | null;
  /** Every tracked path at HEAD. */
  trackedFiles: readonly string[];
  /** Every computed import edge for the repository. */
  imports: readonly ArchImportEdge[];
  /** The verdicts in force, for the divergence overlay. */
  verdicts: readonly ArchVerdict[];
}

/**
 * Which grade a part of this size takes.
 *
 * Exported because it is the rule the whole phase turns on, and a verifier
 * re-deriving it should be able to call it with two integers rather than
 * building a fixture. `files` is how many tracked files the part holds and
 * `participants` is how many of them take part in an interior edge.
 */
export function archModuleGrade(
  files: number,
  participants: number
): ArchModuleGrade {
  if (files <= ARCH_MODULE_BOX_CAP) return 'boxes';
  if (participants <= ARCH_MODULE_MATRIX_CAP) return 'matrix';
  return 'top';
}

/**
 * Compute the level 2 answer.
 *
 * PURE AND DETERMINISTIC. It reads no clock, opens no file and starts nothing,
 * and every list it returns is sorted, so the same facts produce the same bytes
 * on every run and on every machine.
 */
export function computeArchModules(facts: ArchModulesFacts): ArchModulesResult {
  const { component } = facts;
  if (component === null) {
    return {
      cwd: facts.cwd,
      componentId: facts.componentId,
      known: false,
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

  const files = componentFiles(component, facts.trackedFiles);
  const own = new Set(files);

  // Every import WRITTEN IN this part, whatever it resolved to. This is the
  // denominator the conservative rule needs, so a part whose imports nobody
  // could follow says so instead of drawing an empty graph that would read as
  // "this part talks to nothing".
  let totalImports = 0;
  let unresolved = 0;
  // Distinct interior pairs, keyed `from<TAB>to`, so two imports of the same
  // file from the same file are one edge rather than two.
  const pairs = new Set<string>();
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const edge of facts.imports) {
    if (!own.has(edge.fromPath)) continue;
    totalImports += 1;
    // `external` is a DEFINITE answer and never blocks anything. The two that
    // do are `unresolved` and `unverifiable`, which is the whole distinction
    // ./checkers/facts.ts exists to protect.
    if (edge.resolution === 'unresolved' || edge.resolution === 'unverifiable') {
      unresolved += 1;
      continue;
    }
    if (edge.resolution !== 'first-party') continue;
    const to = edge.toPath;
    if (to === null || to === edge.fromPath || !own.has(to)) continue;
    const key = `${edge.fromPath}\t${to}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    outDegree.set(edge.fromPath, (outDegree.get(edge.fromPath) ?? 0) + 1);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const participantPaths = files.filter(
    (path) => outDegree.has(path) || inDegree.has(path)
  );
  const grade = archModuleGrade(files.length, participantPaths.length);
  const broke = brokeByPath(facts.verdicts, own);

  return {
    cwd: facts.cwd,
    componentId: facts.componentId,
    known: true,
    grade,
    fileCount: files.length,
    edgeCount: pairs.size,
    participants: participantPaths.length,
    boxes: grade === 'boxes' ? drawBoxes(files, broke) : [],
    matrix:
      grade === 'matrix'
        ? drawMatrix(files, participantPaths, pairs, broke)
        : null,
    top:
      grade === 'top'
        ? drawTop(participantPaths, outDegree, inDegree, broke)
        : null,
    unresolved,
    totalImports,
    unparsed: unparsedIn(files)
  };
}

// ---------------------------------------------------------------------------
// The divergence overlay
// ---------------------------------------------------------------------------

/**
 * Every offending line the checkers found inside this part, keyed by file.
 *
 * The flattening is `src/renderer/arch/divergences.ts`'s, on purpose: the SCM
 * view and this view must agree about what "this file broke a promise" means,
 * and two flatteners is two answers. Only `divergent` and `absent` produce
 * rows, so a promise that merely cannot be checked never decorates a file.
 */
function brokeByPath(
  verdicts: readonly ArchVerdict[],
  own: ReadonlySet<string>
): Map<string, ArchModuleBroke[]> {
  const out = new Map<string, ArchModuleBroke[]>();
  for (const verdict of verdicts) {
    if (verdict.status !== 'divergent' && verdict.status !== 'absent') continue;
    for (const offence of verdict.offending ?? []) {
      if (!own.has(offence.fromPath)) continue;
      const row: ArchModuleBroke = {
        subjectId: verdict.subjectId,
        status: verdict.status,
        line: offence.line,
        specifier: offence.specifier
      };
      const list = out.get(offence.fromPath);
      if (list === undefined) out.set(offence.fromPath, [row]);
      else list.push(row);
    }
  }
  for (const list of out.values()) {
    list.sort(
      (a, b) => a.line - b.line || a.subjectId.localeCompare(b.subjectId)
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// The three drawings
// ---------------------------------------------------------------------------

/** One box per file, in path order, with no number on any of them. */
function drawBoxes(
  files: readonly string[],
  broke: ReadonlyMap<string, ArchModuleBroke[]>
): ArchModuleBox[] {
  return files.map((path) => ({
    path,
    language: grammarFor(path),
    broke: broke.get(path) ?? []
  }));
}

/**
 * The dependency matrix, over the files that take part.
 *
 * A file with no interior edge either way is not a row, because a row of blanks
 * is a row a person has to read to learn nothing. How many were left out is
 * reported as `isolated` and the view says it in a sentence.
 */
function drawMatrix(
  files: readonly string[],
  participants: readonly string[],
  pairs: ReadonlySet<string>,
  broke: ReadonlyMap<string, ArchModuleBroke[]>
): ArchModuleMatrix {
  const index = new Map<string, number>();
  participants.forEach((path, at) => index.set(path, at));
  const cells: ArchModuleMatrixCell[] = [];
  for (const key of pairs) {
    const split = key.indexOf('\t');
    const from = key.slice(0, split);
    const to = key.slice(split + 1);
    const fromAt = index.get(from);
    const toAt = index.get(to);
    if (fromAt === undefined || toAt === undefined) continue;
    cells.push({
      from: fromAt,
      to: toAt,
      broke: broke.has(from) || broke.has(to)
    });
  }
  cells.sort((a, b) => a.from - b.from || a.to - b.to);
  return {
    paths: [...participants],
    cells,
    isolated: files.length - participants.length
  };
}

/**
 * The last fallback: the two lists a person can still act on.
 *
 * THE NUMBER IS THE CONTENT HERE, not a badge. A list headed "top importers"
 * with the degree hidden would be an ordering a person has to take on trust,
 * which is the opposite of what the rest of this view does. It is rendered as
 * part of the row's own sentence rather than as a pill on a node, so the
 * refusal that keeps counts off boxes is untouched.
 */
function drawTop(
  participants: readonly string[],
  outDegree: ReadonlyMap<string, number>,
  inDegree: ReadonlyMap<string, number>,
  broke: ReadonlyMap<string, ArchModuleBroke[]>
): ArchModuleTop {
  const rank = (degrees: ReadonlyMap<string, number>): ArchModuleRank[] =>
    participants
      .flatMap((path) => {
        const count = degrees.get(path) ?? 0;
        return count === 0 ? [] : [{ path, count, broke: broke.has(path) }];
      })
      // Ties break on the path, so the same facts print the same list.
      .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
      .slice(0, ARCH_MODULE_TOP_CAP);
  return { importers: rank(outDegree), importees: rank(inDegree) };
}

/**
 * The languages in this part whose imports this build does not read.
 *
 * It is the same container `./scan.ts` fills for the whole repository, narrowed
 * to one part, and it is here so a Swift or a Kotlin part says what it is
 * rather than drawing nothing and reading as a part that imports nothing. Rust
 * and Python are parsed and deliberately not resolved, per research 49 section
 * 4.8 fix 4, so they join the same container: from the reader's seat "captured
 * and not resolved" and "not read at all" are the same answer.
 */
function unparsedIn(files: readonly string[]): ArchModuleUnparsed[] {
  const counts = new Map<string, number>();
  for (const path of files) {
    const grammar = grammarFor(path);
    const label =
      grammar === null
        ? extensionOf(path)
        : grammar === 'rust' || grammar === 'python'
          ? grammar
          : null;
    if (label === null) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, count]) => ({ language, files: count }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language));
}

/** The extension a path wears, lower cased, or null when it wears none. */
function extensionOf(relPath: string): string | null {
  const slash = relPath.lastIndexOf('/');
  const dot = relPath.lastIndexOf('.');
  if (dot <= slash + 1) return null;
  return relPath.slice(dot + 1).toLowerCase();
}

// ---------------------------------------------------------------------------
// The main side read
// ---------------------------------------------------------------------------

/** What the `arch:modules` handler hands in. The store is the one dependency. */
export interface ArchModulesReadInput extends ArchModulesInput {
  store: ArchStore;
  /**
   * The contract already in hand, when the caller has one. Passing it saves a
   * directory read; leaving it out makes this call answerable on its own.
   */
  document?: ArchDocument | null;
}

/**
 * Read one part's modules out of the contract, the tree and the arch database.
 *
 * It composes ONE git call and it is `lsFilesCall()`, which is already one of
 * the five fixed argv in `./argv-guard.ts`. It runs no checker, writes nothing
 * to the database, and returns the same bytes for the same tree.
 */
export async function readArchModules(
  input: ArchModulesReadInput
): Promise<ArchModulesResult> {
  const repoPath = input.cwd;
  const document =
    input.document ?? (await loadArchDocument(createArchFileSystem(repoPath)));
  const component =
    document.components.find((c) => c.id === input.componentId) ?? null;

  const git = createArchGitRunner(repoPath);
  const listed = await git.run(lsFilesCall());
  const trackedFiles = listed.code === 0 ? readLsFiles(listed.stdout) : [];
  const repoKey = archRepoKey(repoPath);

  return computeArchModules({
    cwd: repoPath,
    componentId: input.componentId,
    component,
    trackedFiles,
    imports: input.store.imports(repoKey),
    verdicts: input.store.verdicts(repoKey)
  });
}
