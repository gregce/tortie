/**
 * Every sentence the level 2 module view says, and the small pure helpers it
 * draws with (Phase 64).
 *
 * ## Why the copy is here and not in ./copy.ts
 *
 * `./copy.ts` holds the vocabulary of the VERDICTS, being holds, broke, missing
 * and cannot be checked, and it is deliberately one file so a vocabulary audit
 * reads one file rather than nine components. Nothing below invents a second
 * word for any of those: the two that appear here are imported from that file
 * so there is exactly one place they are spelled. What is here is the module
 * view's own vocabulary, being the three grades and what each of them means,
 * and it sits beside the only surface that says it.
 *
 * ## The rule every sentence in this file obeys
 *
 * A NUMBER IS PART OF A SENTENCE OR IT IS NOT ON SCREEN. Research 49 refuses a
 * count badge on a node, because a digit that rises on its own is the dashboard
 * the whole view is built against. So a box carries a path and, when a promise
 * broke in it, a glyph and a word. Everything countable is said once, in prose,
 * under the drawing.
 *
 * The two fallback lists are the one place a bare number is the content rather
 * than a decoration, because "these are the files that import the most" is an
 * ordering, and hiding the degree would ask a person to take the ordering on
 * trust. It is written into the row's sentence rather than pinned to a node.
 */

import type {
  ArchModuleGrade,
  ArchModuleUnparsed,
  ArchModulesResult,
  InstalledGmuxApi
} from '@shared/ipc';
import { ARCH_MODULE_BOX_CAP, ARCH_MODULE_MATRIX_CAP } from '@shared/ipc';
import { gmuxBridge } from '../bridge';

/** The section's own heading. */
export const ARCH_MODULES_TITLE = 'What this part is made of';

/**
 * Said once, under the heading.
 *
 * It is the sentence that keeps this level honest. Everything above it in the
 * view is a person's own prose with a verdict beside it. Everything below it
 * was computed from the code and nobody wrote it down.
 */
export const ARCH_MODULES_NOTE =
  'Every file here comes from this part anchors, and every line between them comes from the imports Tortie read. Nothing on this screen was written by hand.';

/** No `arch.modules` on the bridge at all. One sentence, and the view stands. */
export const ARCH_MODULES_NO_BRIDGE =
  'This build can read the contract but cannot compute what a part is made of. Everything else here works as it always did.';

/** A part id the contract does not have, which a stale selection can produce. */
export const ARCH_MODULES_UNKNOWN =
  'The contract has no part with that name any more.';

/** A part whose anchors name no tracked file at HEAD. */
export const ARCH_MODULES_EMPTY =
  'No tracked file is under this part anchors, so there is nothing to draw. It may have moved, or the pattern may have a typo.';

/** While the answer is on its way. Never a spinner, and never a blank panel. */
export const ARCH_MODULES_LOADING = 'Reading the imports for this part.';

/** The two fallback list headings. */
export const ARCH_MODULES_IMPORTERS = 'Imports the most inside this part';
export const ARCH_MODULES_IMPORTEES = 'Imported most inside this part';

/** The bridge method, or null when this build cannot compute a level 2 view. */
export function archModulesBridge():
  | NonNullable<InstalledGmuxApi['arch']>
  | null {
  const api = gmuxBridge()?.arch;
  return typeof api?.modules === 'function' ? api : null;
}

/** Can this build compute what a part is made of? */
export function archModulesAvailable(): boolean {
  return archModulesBridge() !== null;
}

/** The file name a box is labelled with. */
export function moduleLabel(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

/** The folders above it, muted, so two files with one name are told apart. */
export function moduleDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash + 1);
}

/**
 * Why this drawing and not the one before it, in one sentence.
 *
 * The grade is decided in main, so this never re-derives it. It reports the
 * decision, which is what stops the renderer and the reader disagreeing about
 * what a person is looking at.
 */
export function gradeSentence(result: ArchModulesResult): string {
  const files = countPhrase(result.fileCount, 'file', 'files');
  switch (result.grade) {
    case 'boxes':
      return `${files} in this part, with ${countPhrase(result.edgeCount, 'import', 'imports')} between them.`;
    case 'matrix':
      return `${files} in this part, which is more than the ${String(ARCH_MODULE_BOX_CAP)} a person can read as boxes, so this is the dependency matrix instead. Read a mark as the file on its row importing the file in its column.`;
    default:
      return `${files} in this part, and ${String(result.participants)} of them import each other, which is more than the ${String(ARCH_MODULE_MATRIX_CAP)} rows a matrix can be read at. These are the two lists that still say something.`;
  }
}

/** The files a matrix left out, because a row of blanks teaches nothing. */
export function isolatedSentence(isolated: number): string | null {
  if (isolated <= 0) return null;
  return `${countPhrase(isolated, 'file', 'files')} here import nothing inside this part and are imported by nothing inside it, so they have no row.`;
}

/**
 * The languages this build did not read, said plainly.
 *
 * A part of Swift files that drew nothing would read as a part that imports
 * nothing, and that is the false green this whole feature is built against.
 */
export function unparsedSentence(
  rows: readonly ArchModuleUnparsed[]
): string | null {
  if (rows.length === 0) return null;
  const named = rows
    .slice(0, 3)
    .map((row) => `${String(row.files)} ${row.language}`)
    .join(', ');
  return `Tortie does not read imports for every file here: ${named}. Nothing above claims anything about those.`;
}

/** The grade, as one word, for a test and for a probe to read off the DOM. */
export function gradeWord(grade: ArchModuleGrade): string {
  switch (grade) {
    case 'boxes':
      return 'boxes';
    case 'matrix':
      return 'matrix';
    default:
      return 'lists';
  }
}

/** One ranked row's own sentence, which is where its number lives. */
export function rankSentence(count: number, importers: boolean): string {
  const files = countPhrase(count, 'file', 'files');
  return importers ? `imports ${files} here` : `imported by ${files} here`;
}

/** "1 file" and "12 files", so no sentence in this view says "1 files". */
export function countPhrase(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}
