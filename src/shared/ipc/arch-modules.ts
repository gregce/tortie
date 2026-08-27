/**
 * `arch:modules` — the computed level 2 view of one part (Phase 64).
 *
 * ## What a module is here, and it is a file
 *
 * Research 49 section 9.6's node table calls a module "a filename inside a
 * component", and its own last column says it is "Computed at level 2, never
 * authored". So nothing in this answer comes out of `docs/arch/`. The part's
 * anchors say which tracked files belong to it, and the import graph Tortie
 * already scanned says which of those files name which others. A person writes
 * neither list and cannot make either one say something the code does not.
 *
 * ## Three grades, because a drawing with too many boxes is unreadable
 *
 * The field's own name for that is the hairball, and section 6.3 records that
 * NDepend switched to a dependency matrix "past a few dozens boxes". The caps
 * below are research 49 section 7's row for L2, and fix 11 in section 4.8 is
 * where the second one comes from.
 *
 *  - `boxes`, up to {@link ARCH_MODULE_BOX_CAP} files. One box per file.
 *  - `matrix`, when there are more files than that and at most
 *    {@link ARCH_MODULE_MATRIX_CAP} of them take part in an interior import.
 *  - `top`, when even the matrix would be unreadable. The two lists a person
 *    can still act on, being what imports the most and what is imported most.
 *
 * The grade is decided in main, from the counts, so the renderer never has to
 * agree with a second copy of the rule.
 *
 * ## What this channel refuses
 *
 * It never draws a picture and this build ships no rendering package for it.
 * It never puts a count on a node: research 49's dashboard refusal survives
 * here, so a box carries a path and a verdict word and nothing that rises on
 * its own. It never persists a layout, so there is no arrangement to restore
 * and none to lose. It never sets a session's status, never opens the manifest
 * and never starts a process beyond the one fixed `git ls-files -z` argv the
 * arch guard already composes.
 *
 * MAIN: src/main/arch/modules.ts. RENDERER: src/renderer/arch/ArchModules.tsx.
 */

/** More files than this and the boxes give way to the matrix. */
export const ARCH_MODULE_BOX_CAP = 30;

/**
 * More participating files than this and the matrix gives way to two lists.
 *
 * Research 49 section 4.8 fix 11: "The L2 matrix caps near 200 rows, above
 * which the view lists top importers and importees." A participating file is
 * one with at least one interior import edge in either direction, so a part of
 * four hundred files where only ninety talk to each other still draws.
 */
export const ARCH_MODULE_MATRIX_CAP = 200;

/** How many rows each of the two fallback lists carries. */
export const ARCH_MODULE_TOP_CAP = 20;

/** Which of the three drawings this answer is for. */
export type ArchModuleGrade = 'boxes' | 'matrix' | 'top';

/** One offending place inside one file, from a verdict that broke or is missing. */
export interface ArchModuleBroke {
  /** The verdict's own subject id, so a row can be traced back to the promise. */
  subjectId: string;
  /** `divergent` or `absent`. Never a passing verdict. */
  status: string;
  /** 1 based line, for the jump. */
  line: number;
  /** The specifier that broke it, or ''. */
  specifier: string;
}

/**
 * One file of the part, as the boxes grade draws it.
 *
 * NO COUNT TRAVELS WITH A BOX. There is no in degree here and no out degree,
 * because a number on a node is the dashboard research 49 refuses and the
 * denominators that matter are already on the verdict strip.
 */
export interface ArchModuleBox {
  /** Repository relative path. The label, and what a click opens. */
  path: string;
  /** The grammar this build reads it with, or null when it reads none. */
  language: string | null;
  /** Every offending line in this file, in line order. Usually empty. */
  broke: ArchModuleBroke[];
}

/** One mark in the matrix: the file at `from` imports the file at `to`. */
export interface ArchModuleMatrixCell {
  /** Index into {@link ArchModuleMatrix.paths}. */
  from: number;
  /** Index into {@link ArchModuleMatrix.paths}. */
  to: number;
  /** True when either end carries an offending line, for the overlay. */
  broke: boolean;
}

/**
 * The dependency matrix, the NDepend precedent.
 *
 * A CELL IS A MARK AND NEVER A NUMBER. Two files almost always name each other
 * once, so a count would be the digit 1 repeated a thousand times, and a digit
 * on a node is the thing this view refuses anyway.
 */
export interface ArchModuleMatrix {
  /** The participating files, one order used by both axes. */
  paths: string[];
  cells: ArchModuleMatrixCell[];
  /** Files of the part that neither import nor are imported inside it. */
  isolated: number;
}

/** One row of a fallback list. The number IS the ranking, so it is stated. */
export interface ArchModuleRank {
  path: string;
  count: number;
  /** True when the file carries an offending line, for the overlay. */
  broke: boolean;
}

/** The last fallback, for a part too large to draw either other way. */
export interface ArchModuleTop {
  /** Files that name the most other files inside this part. */
  importers: ArchModuleRank[];
  /** Files the most other files inside this part name. */
  importees: ArchModuleRank[];
}

/** Which part of which repository the level 2 view is being asked about. */
export interface ArchModulesInput {
  /** Absolute path of the project root. */
  cwd: string;
  /** The component id out of `docs/arch/components/`. */
  componentId: string;
}

/**
 * What one part is made of, computed.
 *
 * Exactly one of `boxes`, `matrix` and `top` is populated, and `grade` says
 * which. The other two are empty rather than absent, so a renderer that reads
 * the wrong one gets nothing to draw instead of a crash.
 */
export interface ArchModulesResult {
  cwd: string;
  componentId: string;
  /** False when the contract has no such part. The view says so and draws nothing. */
  known: boolean;
  grade: ArchModuleGrade;
  /** Every tracked file this part's anchors name at HEAD. */
  fileCount: number;
  /** Distinct interior pairs, being one file of the part naming another. */
  edgeCount: number;
  /** How many files take part in at least one interior edge. */
  participants: number;
  boxes: ArchModuleBox[];
  matrix: ArchModuleMatrix | null;
  top: ArchModuleTop | null;
  /**
   * Imports written in this part's files that no resolver could answer.
   *
   * THE CONSERVATIVE RULE MADE VISIBLE, in the same shape the verdict strip
   * uses. A missing edge in this drawing and an edge nobody could follow look
   * identical, so the denominator travels with the answer.
   */
  unresolved: number;
  /** Every import written in this part's files, the honest denominator. */
  totalImports: number;
  /** Languages with files here whose imports this build does not read. */
  unparsed: ArchModuleUnparsed[];
}

/** A language with files in this part whose imports this build does not read. */
export interface ArchModuleUnparsed {
  language: string;
  files: number;
}

/**
 * THE CHANNEL ITSELF IS DECLARED IN ./arch.ts, in `ArchInvokeChannelMap`, and
 * the bridge method beside it in `GmuxArchExtras`.
 *
 * This file holds only the shapes and the caps, because there is one arch
 * surface and it should read as one. A second `*ChannelMap` here would also be
 * an orphan: `src/shared/__tests__/ipc-invoke-closure.test.ts` requires every
 * channel map under shared/ipc to be joined into the intersection in
 * ./index.ts, and joining a second map for one channel would buy nothing.
 */
