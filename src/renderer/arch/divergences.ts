/**
 * The divergence rows the SOURCE CONTROL view draws, beside the changed files
 * that caused them.
 *
 * ## Why this exists, and it is the operator's second rider
 *
 * He accepted the Zen addition with two conditions. The first is that the argv
 * defense lands before the words "Nothing Tortie draws ever starts a process
 * on its own" are written down. The second is this one: the rule that an
 * ACCEPTED divergence stays visible has to ship in the same phase as the
 * words, so that "a person's agent doing the work where they can see it" can
 * never be read as blessing a silent agent write to `baseline.json`.
 *
 * Surfacing a broken promise in Source Control is what makes that concrete. A
 * person reviewing a diff sees, on the same screen as the change, that the
 * change broke a promise. There is no way for that to happen quietly, and
 * there is no accept control anywhere near it: accepting a divergence is
 * editing `baseline.json` by hand, and Tortie never writes that file.
 *
 * ## It is a derivation and never a second store
 *
 * Everything here is computed from the verdicts the arch store already holds.
 * Nothing here fetches, nothing here caches, and Source Control owns none of
 * it. If the arch view has never been opened the list is empty and the section
 * simply is not drawn, which is the honest answer rather than a section that
 * says nothing.
 *
 * ## The refusals it inherits
 *
 * No count badge on the Source Control rail item for this. No status change on
 * any session. No colour that is not already in the verdict vocabulary. The
 * rows are the same three words the Architecture view uses.
 */

import type { ArchVerdict } from '@shared/arch';

/** One broken promise, keyed by the file that broke it. */
export interface ArchDivergenceRow {
  /** The verdict's own subject id, e.g. `edge:scm-no-terminal`. */
  subjectId: string;
  /** `divergent` or `absent`. Never a passing verdict. */
  status: string;
  /** Repository relative path of the offending file. */
  path: string;
  /** 1 based line, for the jump. */
  line: number;
  /** The import specifier or other token that broke it, or ''. */
  specifier: string;
}

/**
 * Every divergence, flattened one row per offending line.
 *
 * PURE, and exported for that reason: the SCM section renders it, and a test
 * or a probe can drive it without a store. It never reads a clock and never
 * touches the network.
 */
export function archDivergences(
  verdicts: readonly ArchVerdict[]
): ArchDivergenceRow[] {
  const rows: ArchDivergenceRow[] = [];
  for (const v of verdicts) {
    if (v.status !== 'divergent' && v.status !== 'absent') continue;
    for (const o of v.offending ?? []) {
      rows.push({
        subjectId: v.subjectId,
        status: v.status,
        path: o.fromPath,
        line: o.line,
        specifier: o.specifier
      });
    }
  }
  // Deterministic: by path, then by line, then by subject. Two runs over the
  // same verdicts draw the same list in the same order, which is what makes a
  // photograph of this section comparable against another one.
  return rows.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.line - b.line ||
      a.subjectId.localeCompare(b.subjectId)
  );
}

/**
 * The divergences that name one path, for a row decoration.
 *
 * Kept beside the flat list rather than composed at the call site, so the SCM
 * section and any later surface answer "what broke in this file" the same way.
 */
export function divergencesForPath(
  rows: readonly ArchDivergenceRow[],
  relPath: string
): ArchDivergenceRow[] {
  return rows.filter((r) => r.path === relPath);
}
