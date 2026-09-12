/**
 * THE GRADER (Phase 259, research 118 §6.4 and §7.3; SPEC §2).
 *
 * One citation in, one grade out. It says WHERE a model pointed and WHAT was
 * found there, and it is incapable of saying whether the sentence beside it is
 * true. Research 118 §6.4 measured the prototype checker catching two of seven
 * deliberate lies: a part renamed "Billing and card capture" keeps every chip
 * it had. So every word this module produces is readable as *a fact was found
 * here* and nothing stronger, and the four grades are ordered by HOW HARD EACH
 * IS TO HIT BY CHANCE rather than by how convincing it sounds.
 *
 * ## The ladder, rarest first, with the floors that justify the order
 *
 * Measured over the hand pass's nineteen cited files (research 118 §6.4):
 *
 *   gate         an `arch_fact` row of category `gate` within the slack   0.1%
 *   call-site    any other `arch_fact` row within the slack               2.3%
 *   declaration  no fact, an `arch_decl` row within the slack            21.9%
 *   resolves     a tracked line and nothing within the slack                 —
 *   (broken)     the citation does not resolve; the ROW is refused
 *
 * A CALL SITE AND A DECLARATION ARE NOT WORTH THE SAME, which is the whole
 * reason the kind is carried out of here: 9.6x over chance against 2.46x. The
 * face draws them with different glyphs and different words, and every rate is
 * drawn beside the floor ./floor.ts computes over the same files at the same
 * slack.
 *
 * ## Proximity, not shape
 *
 * A contract field has no wanted shape: "keeps the session in tmux" is
 * evidenced by a spawn, a declaration or a store write equally well, and a
 * checker demanding one of them would refuse good writing. The ONE place a
 * shape is wanted is a gate claim, and it is asked separately by
 * {@link gateShaped} of the WHOLE citation set rather than of its first row,
 * which is the defect the prototype carried: `near.find(() => true)` handed
 * back whichever fact the reader emitted first, so a gate cited at a line that
 * really carries a `gate.refusal` was reported as citing nothing.
 *
 * ## It opens no file and it spawns nothing
 *
 * Resolution asks two questions of tables `arch.db` already holds: is this a
 * tracked file, and how many lines does it have (`arch_tree_file`, Phase 201).
 * The whole module is pure in the sense `conformance:reading` rule 9 uses — no
 * `node:`, no `electron`, no `child_process`, no `require(` — and the gate
 * proves it by driving the grader with a file-reading seam that throws.
 *
 * ## The line bound is the newline count PLUS ONE, and that is deliberate
 *
 * `arch_tree_file.lines` counts newline bytes, so a file whose last line
 * carries no terminator holds one more line than it holds newlines. The
 * prototype's own reader used `split` on the newline, which is exactly this
 * bound, and the alternative is a grader that refuses the honest last line of
 * every file that does not end in a newline — a refusal that drops the whole
 * row. The cost is that one line past the end of a file that DOES end in a
 * newline resolves; it is an empty line, nothing sits within the slack of it
 * that would not sit within the slack of the real last line, and it can never
 * grade better than the file's own facts allow.
 */

import { ARCH_CITE_GRADES, ARCH_CITE_SLACK } from '@shared/arch';
import type { ArchCiteGrade, ArchCiteReading, ArchSemanticCite } from '@shared/arch';

/** The longest path a citation may name, in characters. */
export const ARCH_CITE_MAX_PATH = 400;

/** The longest `why` a citation may carry, in characters. */
export const ARCH_CITE_MAX_WHY = 120;

/**
 * The citation grammar. The path may hold no colon at all, which is what makes
 * the split unambiguous, and the line is 1 to 7 digits with no leading zero,
 * which refuses `0`, `-1`, `1.5` and `1e9` by shape rather than by arithmetic.
 */
const CITE_RE = /^([^\s:][^:]*):([1-9][0-9]{0,6})$/;

/** A control character anywhere in the citation. */
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** One fact row as the grader reads it. */
export interface GradeFact {
  category: string;
  kind: string;
  subject: string;
  line: number;
}

/** One declaration row as the grader reads it. `arch_decl`, never a fact. */
export interface GradeDecl {
  kind: string;
  subject: string;
  line: number;
}

/**
 * The two tables and the one denominator the grader asks. Everything is a
 * lookup over rows `arch.db` already holds; nothing here opens a file.
 */
export interface ArchGradeSources {
  /** Newlines in a tracked file, or null when the path is not tracked at all. */
  lines(relPath: string): number | null;
  /** Every fact of the seven admitted categories in one file. */
  facts(relPath: string): readonly GradeFact[];
  /** Every declaration in one file. */
  decls(relPath: string): readonly GradeDecl[];
}

/** A citation that parsed, before anything was looked up. */
export interface ParsedCite {
  relPath: string;
  line: number;
}

/**
 * Read `path:line`, or answer null. Null is a GRAMMAR failure and the caller
 * treats it exactly as an unresolvable citation: the row is refused whole.
 */
export function parseCiteAt(at: string): ParsedCite | null {
  if (typeof at !== 'string' || at.length === 0 || at.length > ARCH_CITE_MAX_PATH + 9) {
    return null;
  }
  if (CONTROL_RE.test(at)) return null;
  const hit = CITE_RE.exec(at);
  if (hit === null) return null;
  const relPath = hit[1] ?? '';
  const line = Number(hit[2]);
  if (relPath.length === 0 || relPath.length > ARCH_CITE_MAX_PATH) return null;
  if (relPath !== relPath.trim()) return null;
  if (relPath.startsWith('/') || relPath.includes('\\')) return null;
  for (const segment of relPath.split('/')) {
    if (segment === '' || segment === '.' || segment === '..') return null;
  }
  if (!Number.isSafeInteger(line) || line < 1) return null;
  return { relPath, line };
}

/** The greatest line number a file of `lines` newlines can honestly carry. */
export function citeLineBound(lines: number): number {
  return Math.max(1, lines + 1);
}

/**
 * Grade one citation, or answer null when it does not resolve.
 *
 * Null is R2's trigger: the ROW that holds the citation is dropped whole,
 * never trimmed of its bad citation, because a claim that keeps its sentence
 * and loses the citation that justified it is worse than no claim.
 */
export function gradeCite(
  cite: ArchSemanticCite,
  src: ArchGradeSources
): ArchCiteReading | null {
  const parsed = parseCiteAt(cite.at);
  if (parsed === null) return null;
  const lines = src.lines(parsed.relPath);
  if (lines === null) return null;
  if (parsed.line > citeLineBound(lines)) return null;

  const near = src
    .facts(parsed.relPath)
    .filter((row) => Math.abs(row.line - parsed.line) <= ARCH_CITE_SLACK);
  const gate = nearest(
    near.filter((row) => row.category === 'gate'),
    parsed.line
  );
  const call = nearest(
    near.filter((row) => row.category !== 'gate'),
    parsed.line
  );
  const decl = nearest(
    src
      .decls(parsed.relPath)
      .filter((row) => Math.abs(row.line - parsed.line) <= ARCH_CITE_SLACK),
    parsed.line
  );

  const won: { grade: ArchCiteGrade; row: GradeFact | GradeDecl | null } =
    gate !== null
      ? { grade: 'gate', row: gate }
      : call !== null
        ? { grade: 'call-site', row: call }
        : decl !== null
          ? { grade: 'declaration', row: decl }
          : { grade: 'resolves', row: null };

  return {
    at: cite.at,
    why: cite.why,
    relPath: parsed.relPath,
    line: parsed.line,
    grade: won.grade,
    factKind: won.row === null ? null : won.row.kind,
    factSubject: won.row === null ? null : won.row.subject,
    factLine: won.row === null ? null : won.row.line,
    dead: false
  };
}

/**
 * Does this citation set hold a `gate` graded row? Asked of the WHOLE set,
 * which is the correction research 118 §6.4 made to its own first writing, and
 * reported beside its own count so a reader sees `0 of 6` rather than nothing.
 */
export function gateShaped(cites: readonly ArchCiteReading[]): boolean {
  return cites.some((cite) => cite.grade === 'gate');
}

/** Is this grade one that says something was found? `resolves` is not. */
export function isBacked(grade: ArchCiteGrade): boolean {
  return grade !== 'resolves';
}

/** An empty per grade tally, in ladder order. */
export function emptyGradeTally(): Record<ArchCiteGrade, number> {
  const out = {} as Record<ArchCiteGrade, number>;
  for (const grade of ARCH_CITE_GRADES) out[grade] = 0;
  return out;
}

/**
 * The nearest row to a line, ties broken by the smaller line and then by the
 * subject, so the same rows in a different order answer the same row and the
 * hover a person reads never depends on how SQLite happened to sort.
 */
function nearest<T extends { line: number; subject: string }>(
  rows: readonly T[],
  line: number
): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (best === null) {
      best = row;
      continue;
    }
    const a = Math.abs(row.line - line);
    const b = Math.abs(best.line - line);
    if (a < b) best = row;
    else if (a === b && row.line < best.line) best = row;
    else if (a === b && row.line === best.line && row.subject < best.subject) best = row;
  }
  return best;
}
