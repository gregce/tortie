/**
 * The two seams the grader and the refresh read, over the store (Phase 259).
 *
 * `./grade.ts`, `./floor.ts` and `./drift.ts` take their inputs as FUNCTIONS
 * rather than as a database handle, which is what lets `conformance:semantic`
 * drive the grader with a file-reading seam that throws and prove it opens
 * nothing. This module is the one adapter that turns `arch.db` into those
 * functions, and it is the only file under `src/main/arch/semantic/` that
 * names the store at all.
 *
 * IT OPENS NO FILE EITHER. Every question it answers is a lookup over three
 * tables the deterministic pass already filled: `arch_tree_file` for the line
 * count and for whether a path is tracked at all (Phase 201), `arch_fact` for
 * the seven admitted categories, and `arch_decl` for the declarations. The
 * import of `../db` is TYPE ONLY, so nothing of the database's own `node:fs`
 * reaches this module at run time.
 *
 * The declarations are fetched PER FILE and cached, because a repository holds
 * about thirty thousand of them and a reading only ever names a few dozen
 * files. The facts are fetched once, because the map compose already reads
 * them whole on every open and the row set is the one this product is built
 * around.
 */

import type { ArchFactCategory } from '@shared/arch';
import type { ArchStore } from '../db';
import type { ArchGradeSources, GradeDecl, GradeFact } from './grade';
import type { RefreshSources } from './drift';

/** The seven the block carries and the grader admits. `test` is never one of them. */
const GRADED_CATEGORIES: readonly ArchFactCategory[] = [
  'entrypoint',
  'boundary',
  'surface',
  'store',
  'effect',
  'network',
  'gate'
];

/**
 * Grade one repository's citations out of the store.
 *
 * A path with no `arch_tree_file` row answers null lines, which the grader
 * reads as NOT TRACKED and refuses the row for. That is the honest answer: the
 * tree read links every tracked file it could stat, so a path it has no row
 * for is one this build never saw.
 */
export function gradeSourcesFor(store: ArchStore, repoKey: string): ArchGradeSources {
  let lineOf: Map<string, number> | null = null;
  let factOf: Map<string, GradeFact[]> | null = null;
  const declCache = new Map<string, GradeDecl[]>();
  return {
    lines: (relPath: string): number | null => {
      if (lineOf === null) {
        lineOf = new Map(store.treeFacts(repoKey).map((row) => [row.path, row.lines]));
      }
      return lineOf.get(relPath) ?? null;
    },
    facts: (relPath: string): readonly GradeFact[] => {
      if (factOf === null) {
        factOf = new Map<string, GradeFact[]>();
        for (const fact of store.factsOf(repoKey, GRADED_CATEGORIES)) {
          const held = factOf.get(fact.file) ?? [];
          held.push({
            category: fact.category,
            kind: fact.kind,
            subject: fact.subject,
            line: fact.line
          });
          factOf.set(fact.file, held);
        }
      }
      return factOf.get(relPath) ?? [];
    },
    decls: (relPath: string): readonly GradeDecl[] => {
      const held = declCache.get(relPath);
      if (held !== undefined) return held;
      const rows = store
        .declsOf(repoKey, [relPath])
        .map((row) => ({ kind: row.kind, subject: row.subject, line: row.line }));
      declCache.set(relPath, rows);
      return rows;
    }
  };
}

/**
 * Read one repository's tree for the drift refresh (SPEC §3.3).
 *
 * `rowsIn` answers the facts AND the declarations of one file, because a
 * citation's fingerprint is the kind and the subject of whatever backed it and
 * either table may have been the one. A file whose oid is unchanged is never
 * asked, which is what makes running this on every deterministic pass cheap.
 */
export function refreshSourcesFor(store: ArchStore, repoKey: string): RefreshSources {
  let oidOf: Map<string, string> | null = null;
  const grade = gradeSourcesFor(store, repoKey);
  const rowCache = new Map<string, { kind: string; subject: string; line: number }[]>();
  return {
    oidOf: (relPath: string): string | null => {
      if (oidOf === null) {
        oidOf = new Map(
          [...store.factStamps(repoKey).entries()].map(([path, stamp]) => [path, stamp.oid])
        );
      }
      return oidOf.get(relPath) ?? null;
    },
    rowsIn: (relPath: string): readonly { kind: string; subject: string; line: number }[] => {
      const held = rowCache.get(relPath);
      if (held !== undefined) return held;
      const rows = [
        ...grade.facts(relPath).map((row) => ({
          kind: row.kind,
          subject: row.subject,
          line: row.line
        })),
        ...grade.decls(relPath).map((row) => ({
          kind: row.kind,
          subject: row.subject,
          line: row.line
        }))
      ];
      rowCache.set(relPath, rows);
      return rows;
    }
  };
}
