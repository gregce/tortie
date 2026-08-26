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
 * ## The two languages that are captured and not resolved
 *
 * Rust and Python imports are extracted and then marked `unverifiable` with a
 * reason. Research 49 section 4.8 fix 4 says those resolvers ship later rather
 * than shipping wrong. They are COUNTED, so a Rust component reports what
 * cannot be checked instead of reporting nothing, and the conservative verdict
 * rule then keeps them off every green answer.
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

/** The grammar a path is read with, in the resolver's own vocabulary. */
function languageOf(relPath: string): ArchResolverLanguage | null {
  const grammar = grammarFor(relPath);
  if (grammar === null) return null;
  if (grammar === 'tsx') return 'typescript';
  if (grammar === 'javascript') return 'javascript';
  if (grammar === 'go') return 'go';
  if (grammar === 'python') return 'python';
  if (grammar === 'rust') return 'rust';
  return 'typescript';
}

/** Why one language's imports are captured and never resolved. */
const DEFERRED_REASON: Readonly<Partial<Record<ArchResolverLanguage, string>>> =
  {
    rust: 'Imports are not resolved for Rust',
    python: 'Imports are not resolved for Python'
  };

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
    }[] = [];
    for (const file of results) {
      const language = languageOf(file.relPath);
      if (language === null) continue;
      const edges: ArchImportEdge[] = [];
      for (const found of file.imports ?? []) {
        const answer = resolveImport(
          found.specifier,
          file.relPath,
          language,
          ctx
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
        imports: edges
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

  const unparsed: ArchUnparsedLanguage[] = [...unparsedCounts.entries()]
    .map(([language, files]) => ({ language, files }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language));
  // The two grammars this build parses and does not resolve join the same
  // container, because from the reader's seat "captured and not resolved" and
  // "not read at all" are the same answer: those imports are not checked.
  for (const language of ['rust', 'python'] as const) {
    const files = parseable.filter((p) => languageOf(p) === language).length;
    if (files > 0) unparsed.push({ language, files });
  }

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
