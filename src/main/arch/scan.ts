/**
 * The import fact base (Phase 63, research 49 section 4.6 tier 1).
 *
 * It turns the repository's tracked files into the one thing the imports
 * checker judges: a list of imports, each already resolved or already given up
 * on, with the reason written down when it was given up on.
 *
 * ## Where the files come from, and why it is not ripgrep
 *
 * From `git ls-files -z`, which the caller has already run for the glob
 * checker. Arch judges the repository AT HEAD, so the file list it scans must
 * be the same list the anchors are matched against, or a component could hold a
 * file the import scan never read. Reusing that one output also means arch
 * spawns no ripgrep at all, which makes the argv defense simpler to state: the
 * only binary this feature starts is git, with the five fixed argv the guard
 * composes, and no contract field ever reaches any of them.
 *
 * ## Where the parse happens
 *
 * In the SHARED tree-sitter worker pool, the same one ⌘⇧O uses, asked for its
 * imports as well as its symbols. There is no second pool and no second parse.
 * Research 19's worker budget is one resident plus six transient, and Phase 63
 * added a reader rather than a budget.
 *
 * ## Every language this build parses is now resolved (Phase 157)
 *
 * Rust and Python imports used to be extracted and then marked `unverifiable`,
 * and Ruby was not read at all. All three have arms now, so this module marks
 * nothing `unverifiable` and pushes nothing into the container that names what
 * was not read. A `.rb`, `.rs` or `.py` import that finds no file is
 * `unresolved`, which says somebody looked, rather than `unverifiable`, which
 * says nobody did.
 *
 * `languageOf` below is the line that decides which arm reads a file, and its
 * default branch answers `'typescript'`. A grammar added to
 * ../symbols/languages.ts and not added there is read BY THE SCRIPT ARM, which
 * is worse than not reading it: a Ruby `require "fs"` would answer `external`
 * because `fs` is a Node builtin, and an `external` is dropped from both sides
 * of the ledger in ./checkers/imports.ts, leaving a `must-not` promise across it
 * green. `npm run conformance:arch` asserts the two lists agree.
 *
 * ## What is incremental and what is not
 *
 * The freshness key is the same one the symbol index uses, being mtime and
 * size per file, held in `arch.db`. A re-scan reads only the files that
 * drifted, which is the measured 1.25 ms per changed file rather than the whole
 * tree. A file that has gone is forgotten, so a branch flip does not leave a
 * deleted file's imports in the fact base.
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ArchImportFact,
  ArchUnparsedLanguage
} from './checkers/facts';
import type { ArchStore, ArchImportEdge } from './db';
import { grammarFor } from '../symbols/languages';
import { BATCH_SIZE } from '../symbols/pool';
import { sharedSymbolPool } from '../symbols/shared-pool';
import {
  archResolveContext,
  resolveImport,
  type ArchResolverLanguage
} from './resolver';
import { normalizeRel, readArchManifests } from './resolver/manifest';
import { readCsharpManifest } from './resolver/csproj';
import { readSwiftManifest } from './resolver/swiftpm';

/** What one scan produced. */
export interface ArchScanResult {
  imports: ArchImportFact[];
  unparsed: ArchUnparsedLanguage[];
  /** Files whose bytes were read and parsed in this run. */
  parsed: number;
  /** Files answered from the stored fact base without a parse. */
  reused: number;
  /** Specifiers this build understood and could not find a file for. */
  unresolved: number;
  /** Every import in the fact base, resolved or not. The denominator on the face. */
  total: number;
  durationMs: number;
  /** One sentence when the scan stopped early, or null. Never a silent pass. */
  overBudget: string | null;
}

/** How many files this build will parse before it says so and stops. */
export const ARCH_SCAN_FILE_CEILING = 50_000;

/**
 * Which ARM reads a path, in the resolver's own vocabulary.
 *
 * IT IS NOT THE SAME QUESTION AS WHICH GRAMMAR READS IT, and Phase 184 is
 * where the two stopped being the same answer. `.c` and the C++ extensions
 * parse with the OBJECTIVE-C grammar, because that grammar is a C superset and
 * reads every `#include` there is, and admitting a second C or C++ grammar was
 * measured and refused. They resolve through the C family arm, which knows
 * about declared include directories. `.h` is the extension all three
 * languages share, Phase 180 ruled it reads with the Objective-C arm, and that
 * ruling stands: an `#include` written in a `.h` therefore does not consult a
 * declared include directory, and that limit is on ./resolver/cfamily.ts's
 * face.
 *
 * THE EXTENSION IS ASKED FIRST FOR EXACTLY THAT REASON. Everything the
 * extension map does not name falls through to the grammar, and the default
 * branch below still answers `'typescript'`, which is why the two lists have
 * to agree; see the paragraph in this module's header.
 */
const ARM_BY_EXTENSION: Readonly<Record<string, ArchResolverLanguage>> = {
  c: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp'
};

export function languageOf(relPath: string): ArchResolverLanguage | null {
  const grammar = grammarFor(relPath);
  if (grammar === null) return null;
  const byExtension = ARM_BY_EXTENSION[extensionOf(relPath) ?? ''];
  if (byExtension !== undefined) return byExtension;
  if (grammar === 'tsx') return 'typescript';
  if (grammar === 'javascript') return 'javascript';
  if (grammar === 'go') return 'go';
  if (grammar === 'python') return 'python';
  if (grammar === 'rust') return 'rust';
  if (grammar === 'ruby') return 'ruby';
  if (grammar === 'swift') return 'swift';
  if (grammar === 'kotlin') return 'kotlin';
  if (grammar === 'objc') return 'objc';
  if (grammar === 'java') return 'java';
  if (grammar === 'php') return 'php';
  if (grammar === 'c-sharp') return 'csharp';
  return 'typescript';
}

/**
 * Why one language's imports would be captured and never resolved.
 *
 * Phase 157 emptied it, Phase 180 commit one refilled it for the interval
 * between the three new grammars landing and their arms landing, and commit
 * two emptied it again. It is kept because that interval recurs for every
 * language ever added, and because `reasonFor` below still has to answer an
 * `unverifiable` row an older build wrote into the fact base.
 */
const DEFERRED_REASON: Readonly<Partial<Record<ArchResolverLanguage, string>>> =
  {};

export interface ArchScanInput {
  repoPath: string;
  repoKey: string;
  store: ArchStore;
  /** Every tracked path at HEAD, from the caller's one `git ls-files -z`. */
  trackedFiles: readonly string[];
  /** Throttled progress, for the one time cold scan on a large repository. */
  onProgress?: (done: number, total: number) => void;
  /** Cancels the scan between batches. A cancelled scan publishes nothing. */
  signal?: AbortSignal;
  /**
   * Wall clock the scan may spend before it stops and says so. The cold index
   * is EXEMPT from this and passes `null`, per research 49 fix 5, which found
   * that one budget over the whole 11,000 to 50,000 file range contradicts
   * itself.
   */
  budgetMs?: number | null;
}

/**
 * Scan the repository's imports and answer with the fact base.
 *
 * It writes the resolved edges into `arch.db` as it goes, so the next run reads
 * the unchanged files from there rather than parsing them again.
 */
export async function scanArchImports(
  input: ArchScanInput
): Promise<ArchScanResult> {
  const started = Date.now();
  const { repoPath, repoKey, store, trackedFiles } = input;

  const parseable: string[] = [];
  const unparsedCounts = new Map<string, number>();
  for (const raw of trackedFiles) {
    const relPath = normalizeRel(raw);
    if (relPath === '') continue;
    if (languageOf(relPath) === null) {
      const ext = extensionOf(relPath);
      if (ext !== null) unparsedCounts.set(ext, (unparsedCounts.get(ext) ?? 0) + 1);
      continue;
    }
    parseable.push(relPath);
  }

  const manifests = readArchManifests(repoPath);
  // Package.swift is parsed as Swift source by the wasm grammar, which is
  // asynchronous, so the Swift targets are hydrated here rather than inside
  // the synchronous manifest read. Without this line every Swift import
  // answers unresolved, which is grey and safe, and never wrong.
  manifests.swift = await readSwiftManifest(repoPath, trackedFiles);
  // The C sharp projects are hydrated here for the same reason, minus the
  // asynchrony: the reader needs the tracked file list, because the namespace
  // a `.cs` file declares is the only place the namespace to project mapping
  // is written down and a walk would find the build output git does not track.
  // Without this line every `using` answers unresolved, which is grey and
  // safe, and never wrong.
  manifests.csharp = readCsharpManifest(repoPath, trackedFiles);
  const ctx = archResolveContext(manifests, trackedFiles as string[]);

  const stamps = store.importStamps(repoKey);
  const stale: { relPath: string; absPath: string }[] = [];
  const seen = new Set<string>();
  let reused = 0;
  for (const relPath of parseable) {
    seen.add(relPath);
    const absPath = join(repoPath, relPath);
    let mtimeMs: number;
    let size: number;
    try {
      const st = statSync(absPath);
      mtimeMs = st.mtimeMs;
      size = st.size;
    } catch {
      // Tracked at HEAD and absent from the working tree. There is nothing to
      // parse, and the stored rows for it are dropped below with the rest.
      seen.delete(relPath);
      continue;
    }
    const stamp = stamps.get(relPath);
    if (stamp !== undefined && stamp.mtimeMs === mtimeMs && stamp.size === size) {
      reused += 1;
      continue;
    }
    stale.push({ relPath, absPath });
  }

  // Anything the store holds that the tree no longer tracks: a deletion, a
  // rename, or a branch flip. Forgotten whole rather than left to age.
  const gone = [...stamps.keys()].filter((relPath) => !seen.has(relPath));
  store.forgetImportFiles(repoKey, gone);

  let overBudget: string | null = null;
  let parsed = 0;
  const pool = sharedSymbolPool();
  const total = stale.length;
  const ceiling = Math.min(total, ARCH_SCAN_FILE_CEILING);
  if (total > ARCH_SCAN_FILE_CEILING) {
    overBudget =
      `This repository has ${total.toLocaleString()} changed source files, ` +
      `above the ${ARCH_SCAN_FILE_CEILING.toLocaleString()} this build reads ` +
      `in one pass. The rest are reported as not checked rather than as ` +
      `holding.`;
  }

  for (let at = 0; at < ceiling; at += BATCH_SIZE) {
    if (input.signal?.aborted === true) {
      overBudget = 'The check was cancelled by a newer one.';
      break;
    }
    if (
      input.budgetMs !== null &&
      input.budgetMs !== undefined &&
      Date.now() - started > input.budgetMs
    ) {
      overBudget =
        `The import scan stopped after ${input.budgetMs} ms with ` +
        `${ceiling - at} files unread. Those files' imports are reported as ` +
        `not checked rather than as absent.`;
      break;
    }
    const batch = stale.slice(at, at + BATCH_SIZE);
    const results = await pool.run(batch, { imports: true });
    const rows: {
      relPath: string;
      mtimeMs: number;
      size: number;
      imports: ArchImportEdge[];
      kinds: Record<string, number>;
    }[] = [];
    for (const file of results) {
      const language = languageOf(file.relPath);
      if (language === null) continue;
      // THE DEFINITIONS RIDE THE SAME MESSAGE (Phase 201). The worker found
      // them on the walk that found the imports, so the count by kind is kept
      // here rather than paid for by a second parse when the reading asks.
      const kinds: Record<string, number> = {};
      for (const symbol of file.symbols) kinds[symbol.kind] = (kinds[symbol.kind] ?? 0) + 1;
      const edges: ArchImportEdge[] = [];
      for (const found of file.imports ?? []) {
        const answer = resolveImport(
          found.specifier,
          file.relPath,
          language,
          ctx,
          // THE FORM TRAVELS WITH THE SPECIFIER. Ruby's `require "utils"` and
          // `require_relative "utils"` are the same six letters and name
          // different files, and the extractor is the only thing that knows
          // which was written. Every other arm ignores it.
          found.form
        );
        edges.push({
          fromPath: file.relPath,
          line: found.line,
          specifier: found.specifier,
          toPath: answer.toPath,
          resolution: answer.resolution,
          language
        });
      }
      rows.push({
        relPath: file.relPath,
        mtimeMs: file.mtimeMs,
        size: file.size,
        imports: collapseSameAnswer(edges),
        kinds
      });
    }
    store.saveImports(repoKey, rows);
    parsed += batch.length;
    input.onProgress?.(parsed, ceiling);
  }

  const stored = store.imports(repoKey);
  const imports: ArchImportFact[] = [];
  let unresolved = 0;
  for (const edge of stored) {
    const reason = reasonFor(edge);
    if (edge.resolution === 'unresolved') unresolved += 1;
    imports.push({
      fromPath: edge.fromPath,
      specifier: edge.specifier,
      line: edge.line,
      toPath: edge.resolution === 'first-party' ? edge.toPath : null,
      // THE ANSWER TRAVELS WITH THE FACT. A checker that read only `toPath`
      // would see the same null for a dependency, a deferred language and a
      // genuine miss, and would count all three as failures to resolve.
      resolution: edge.resolution,
      reason
    });
  }

  // THE DOT IS THE LABEL'S HONESTY (Phase 180 fix round). These rows are file
  // extensions, not language names, and the sentence that renders them says
  // "1 resolved" for a Package.resolved without it, which a person reads as a
  // status word. ".resolved" reads as the file extension it is.
  const unparsed: ArchUnparsedLanguage[] = [...unparsedCounts.entries()]
    .map(([extension, files]) => ({ language: `.${extension}`, files }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language));
  // NOTHING IS ADDED HERE ANY MORE. Until Phase 157 the two grammars this build
  // parsed and did not resolve were pushed into this container, because from the
  // reader's seat "captured and not resolved" and "not read at all" were the
  // same answer. Rust, Python and Ruby all resolve now, so the container holds
  // only what it says it holds: extensions this build has no grammar for.

  return {
    imports,
    unparsed,
    parsed,
    reused,
    unresolved,
    total: imports.length,
    durationMs: Date.now() - started,
    overBudget
  };
}

/**
 * One line that produced several specifiers with the SAME answer becomes one
 * fact.
 *
 * Python is the only language that produces several, and it does so because the
 * query captures each imported name beside its module: `from .schemas import A,
 * B, C` yields `.schemas`, `.schemas.A`, `.schemas.B` and `.schemas.C`. That is
 * deliberate and it is what stopped a `from package import submodule` hiding a
 * real edge. But when the imported names are ordinary classes rather than
 * submodules, all four answers are the same file, and keeping four facts would
 * inflate the headline import count, count one unresolved import four times, and
 * list one `import` line four times in a promise's offending list. Measured on
 * 2026-08-26 over lift-sys: one `from .schemas import ...` in `api/server.py`
 * turned two offending rows into 29.
 *
 * The SHORTEST specifier survives, which is the module the author wrote. A name
 * that really is a submodule resolves to a DIFFERENT file, so it has a different
 * answer and it is kept.
 *
 * Exported so a unit test can drive it without a worker pool, a store or a
 * repository.
 */
export function collapseSameAnswer(edges: readonly ArchImportEdge[]): ArchImportEdge[] {
  const best = new Map<string, ArchImportEdge>();
  const order: string[] = [];
  for (const edge of edges) {
    const key = `${edge.line}\u0000${edge.resolution}\u0000${edge.toPath ?? ''}`;
    const held = best.get(key);
    if (held === undefined) {
      best.set(key, edge);
      order.push(key);
      continue;
    }
    if (edge.specifier.length < held.specifier.length) best.set(key, edge);
  }
  return order.map((key) => best.get(key) as ArchImportEdge);
}

/**
 * Why one import has no first party answer, in words a person can read, or null
 * when it has one.
 *
 * `external` is a definite answer rather than a failure, so it carries the
 * sentence that says so. A checker reading this never confuses "this names a
 * dependency" with "this could not be resolved", which is the distinction the
 * conservative verdict rule is built on.
 */
function reasonFor(edge: ArchImportEdge): string | null {
  switch (edge.resolution) {
    case 'first-party':
      return null;
    case 'external':
      return 'The specifier names a dependency rather than a file in this repository';
    case 'unverifiable':
      return (
        DEFERRED_REASON[edge.language as ArchResolverLanguage] ??
        `Imports are not resolved for ${edge.language}`
      );
    default:
      return 'The specifier could not be resolved to a tracked file';
  }
}

/** The extension a path wears, lower cased, or null when it wears none. */
function extensionOf(relPath: string): string | null {
  const slash = relPath.lastIndexOf('/');
  const dot = relPath.lastIndexOf('.');
  if (dot <= slash + 1) return null;
  return relPath.slice(dot + 1).toLowerCase();
}
