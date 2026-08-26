/**
 * The field checks the arch validator is built from (Phase 63, research 49
 * section 4.3).
 *
 * One rule, and it is the machine row's rule applied to a third file. **An
 * invalid row is dropped whole.** It is never partially merged, never silently
 * dropped, and never a crash. Every drop produces one `ArchProblem` naming the
 * file, the field and the reason, in a sentence a person reading their own
 * contract can act on. That is why every check below is a small throwing helper
 * caught once per row. A check that returned a fallback would half accept a
 * row, and a half accepted promise is a promise nobody made.
 *
 * ## Nothing here touches the disk
 *
 * This module is pure. `./load.ts` owns reading, and it is the only place a
 * read happens. That split is what makes "the validator cannot be made to open
 * a file a contract names" a fact about the code rather than a promise.
 *
 * ## The path rules, and why each refusal is here rather than later
 *
 * `pathField` refuses six shapes, and every one of them is refused at the
 * format layer rather than at the spawn:
 *
 * - A leading hyphen, because git reads its own argv and would take the value
 *   for an option. This is half of the argv defense in `./argv-guard.ts`.
 * - A leading slash and a leading tilde, because an anchor names a place inside
 *   the repository and nothing else.
 * - A step back up out of the repository, because a contract describes the tree
 *   it ships in.
 * - A backslash, because git records paths with forward slashes.
 * - A control character, because an evidence read writes the path to
 *   `git cat-file --batch` on stdin, whose protocol is one request per line. A
 *   newline inside a path would be read as the start of a second request.
 *
 * `globField` adds a seventh refusal that only a pattern can trip, being a
 * ceiling on how many wildcards one anchor may hold. That one is not about git
 * at all. It bounds what the matcher in `./glob-pattern.ts` costs, because an
 * anchor arrives from the same untrusted place and the matching runs on the
 * main thread.
 *
 * The other half of the defense is that no value checked here ever reaches an
 * argv at all. Both halves are asserted by `npm run conformance:arch`, which
 * plants a hostile anchor and a hostile object name in its fixture and fails if
 * either string appears in any composed argv.
 */

import { ARCH_ID_PATTERN, ARCH_LIMITS, ARCH_OID_PATTERN } from '@shared/arch';
import { countGlobWildcards } from './glob-pattern';

const ID_RE = new RegExp(ARCH_ID_PATTERN);
const OID_RE = new RegExp(ARCH_OID_PATTERN);
/** Control characters. They never belong in a name, a path or a quote. */
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** Thrown by a field check. Caught once per row, which drops the row whole. */
export class ArchRowError extends Error {
  constructor(
    readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'ArchRowError';
  }
}

/** Refuse one field, with the reason a person can act on. */
export function fail(field: string, message: string): never {
  throw new ArchRowError(field, message);
}

/** A string with no control characters, inside a length bound. */
export function plainString(
  value: unknown,
  field: string,
  max: number,
  min = 1
): string {
  if (typeof value !== 'string') fail(field, `${field} must be text.`);
  const text = value;
  if (text.length < min) fail(field, `${field} must not be empty.`);
  if (text.length > max) {
    fail(field, `${field} is longer than the ${max} characters Tortie accepts.`);
  }
  if (CONTROL_RE.test(text)) {
    fail(field, `${field} contains a control character, which Tortie refuses.`);
  }
  return text;
}

/** Prose that may be empty, such as a note or a label. */
export function optionalString(
  value: unknown,
  field: string,
  max: number
): string {
  return plainString(value, field, max, 0);
}

/** An id. Kebab case, and it is what every verdict keys on. */
export function idField(value: unknown, field: string): string {
  const text = plainString(value, field, ARCH_LIMITS.maxId);
  if (!ID_RE.test(text)) {
    fail(
      field,
      `${field} is "${text}", which is not a usable id. Use a lower case ` +
        `letter, then letters, digits or hyphens, up to ${ARCH_LIMITS.maxId} ` +
        `characters.`
    );
  }
  return text;
}

/**
 * A place inside the repository. The six refusals are in this file's header.
 *
 * `allowGlob` widens nothing about those refusals. It only decides whether the
 * wildcard characters are allowed at all, so a field that must name one exact
 * file, such as an evidence path, cannot carry a pattern.
 */
export function pathField(
  value: unknown,
  field: string,
  allowGlob = false
): string {
  const text = plainString(value, field, ARCH_LIMITS.maxPath);
  if (text.startsWith('-')) {
    fail(
      field,
      `${field} starts with a hyphen. Tortie refuses that, because git reads ` +
        `its own arguments and would take the value for one of its options ` +
        `rather than for a path.`
    );
  }
  if (text.startsWith('/')) {
    fail(
      field,
      `${field} starts with a slash. A contract names places inside the ` +
        `repository, so write the path from the repository root, e.g. ` +
        `src/main/arch.`
    );
  }
  if (text.startsWith('~')) {
    fail(
      field,
      `${field} starts with a tilde. A contract names places inside the ` +
        `repository and never a place in your home folder.`
    );
  }
  if (text.split('/').includes('..')) {
    fail(
      field,
      `${field} contains a step back up out of the repository. A contract ` +
        `describes the tree it ships in, so write the path from the ` +
        `repository root.`
    );
  }
  if (text.includes('\\')) {
    fail(
      field,
      `${field} contains a backslash. Write paths with forward slashes, the ` +
        `way git records them.`
    );
  }
  if (!allowGlob && /[*?[\]]/.test(text)) {
    fail(
      field,
      `${field} contains a wildcard, and this field names one exact file.`
    );
  }
  return text;
}

/**
 * A repository relative glob, such as a component anchor.
 *
 * It carries one refusal `pathField` does not, being a ceiling on how many
 * wildcards the pattern may hold. That is a bound on what the MATCHER costs
 * rather than on what a person can say: an anchor is matched by a scan whose
 * cost is the number of tokens times the length of the path, and eight
 * wildcards is well past anything a real anchor needs. It is refused here so a
 * person gets a sentence naming the field, rather than a window that has
 * stopped repainting.
 */
export function globField(value: unknown, field: string): string {
  const text = pathField(value, field, true);
  const wildcards = countGlobWildcards(text);
  if (wildcards > ARCH_LIMITS.maxAnchorWildcards) {
    fail(
      field,
      `${field} holds ${wildcards} wildcards, and Tortie matches at most ` +
        `${ARCH_LIMITS.maxAnchorWildcards} in one pattern. Name the place ` +
        `with a shorter pattern, or write one anchor for each place.`
    );
  }
  return text;
}

/**
 * A blob object name. Forty hex characters, and nothing else.
 *
 * This is the one contract value that is ever handed to git, and it goes on
 * stdin rather than on argv. The check is closed rather than sanitising,
 * because a value that passes it cannot be read as an option, as a path or as
 * a shell word.
 */
export function oidField(value: unknown, field: string): string {
  const text = plainString(value, field, 64);
  if (!OID_RE.test(text)) {
    fail(
      field,
      `${field} is not an object name. Tortie accepts exactly forty lower ` +
        `case hex characters and nothing else, because this value is the one ` +
        `contract value that is ever handed to git.`
    );
  }
  return text;
}

/** A whole number inside a bound. */
export function intField(
  value: unknown,
  field: string,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    fail(field, `${field} must be a whole number.`);
  }
  if (value < min || value > max) {
    fail(
      field,
      `${field} must be between ${min} and ${max}, and it is ${value}.`
    );
  }
  return value;
}

/** One of a closed set of words. */
export function enumField<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(field, `${field} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** A true or false. */
export function boolField(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail(field, `${field} must be true or false.`);
  return value;
}

/** A list, inside a length bound. */
export function arrayField(
  value: unknown,
  field: string,
  max: number,
  min = 0
): unknown[] {
  if (!Array.isArray(value)) fail(field, `${field} must be a list.`);
  if (value.length < min) {
    fail(
      field,
      `${field} must hold at least ${min} ${min === 1 ? 'entry' : 'entries'}.`
    );
  }
  if (value.length > max) {
    fail(
      field,
      `${field} holds ${value.length} entries and Tortie reads at most ${max}.`
    );
  }
  return value;
}

/** An object, and not a list and not null. */
export function objectField(
  value: unknown,
  field: string
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(field, `${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

/**
 * A date a person wrote down, such as the day a divergence was accepted.
 *
 * It is checked against a closed shape rather than parsed, because the value is
 * shown to a person and compared to nothing. A closed shape leaves no question
 * about what could be read as an option or as a path.
 */
export function dayField(value: unknown, field: string): string {
  const text = plainString(value, field, 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    fail(field, `${field} must be a day written as 2026-08-25.`);
  }
  return text;
}

/**
 * Fields Tortie does not know, reported and then ignored.
 *
 * This is deliberately NOT a drop. Research 49 fix 16 says schema growth is a
 * version bump with a converter, and that unknown fields are preserved on read
 * and ignored, because the schema becomes a public surface the day agents in
 * the wild write against it. A row from a newer contract that carries one extra
 * field still says something true about the parts it names, so the row is kept
 * and the extra field is named in a problem the person can see.
 */
export function unknownKeys(
  obj: Record<string, unknown>,
  known: readonly string[]
): string[] {
  return Object.keys(obj).filter((k) => !known.includes(k));
}
