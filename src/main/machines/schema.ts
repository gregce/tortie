/**
 * The validated door onto `machines.json` (Phase 68, research 51 section 4.2).
 *
 * One rule, and it is the agent overlay's rule applied to a second file. **An
 * invalid row is dropped whole.** It is never partially merged, never silently
 * dropped, and never a crash. Every drop produces one `MachineProblem` naming
 * the field and the reason, in a sentence a person reading their own file can
 * act on. That is why the checks below are small throwing helpers caught once
 * per row. A check that returned a fallback would half accept a row, and a half
 * accepted machine row is an address nobody chose.
 *
 * ## Nothing here touches the disk
 *
 * This module is pure. `./store.ts` owns reading, the boot read, the reload and
 * the watcher, and it is the only place a read happens. That split is what
 * makes "never read on a launch path" a fact about the code rather than a
 * promise.
 *
 * ## What this module does NOT decide
 *
 * It does not decide whether a row is confirmed and it does not own the hash.
 * `./confirm.ts` owns the five execution bearing fields, the algorithm name,
 * the lines a person reads and the seal. There is one hash in this phase and it
 * is not here.
 *
 * ## The two rules that exist because ssh reads its own argv
 *
 * A `host` or a `user` beginning with `-` is refused with its own sentence,
 * because ssh would read it as an option rather than as a name. The patterns in
 * `@shared/machines` already forbid it, and the check below names the reason so
 * a person can see what happened.
 *
 * A `remoteTmuxPath` containing a single quote is refused. The remote command
 * is composed with `shellQuoteArgv`, so a path holding a space is already safe,
 * and refusing the quote leaves no quoting question open at all.
 *
 * ## Phase 83 added one field, and it is checked the same way
 *
 * `acceptedTmuxVersion` is the version a person accepted for this machine. It
 * is checked against a closed pattern that only a version string matches, so a
 * value that could be read as an option, as a path or as a shell word drops the
 * row whole with a sentence naming the field.
 */

import type { MachineProblem, MachineRowV1 } from '@shared/machines';
import {
  MACHINES_ACCEPTED_SCHEMAS,
  MACHINE_COLORS,
  MACHINE_HOST_PATTERN,
  MACHINE_ID_PATTERN,
  MACHINE_LIMITS,
  MACHINE_ROW_KEYS,
  MACHINE_USER_PATTERN,
  MACHINE_VERSION_PATTERN,
  type MachineColor
} from '@shared/machines';

const ID_RE = new RegExp(MACHINE_ID_PATTERN);
const HOST_RE = new RegExp(MACHINE_HOST_PATTERN);
const USER_RE = new RegExp(MACHINE_USER_PATTERN);
const VERSION_RE = new RegExp(MACHINE_VERSION_PATTERN);
/** Control characters. They never belong in a name, an address or a path. */
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** What a whole file parsed into, and everything Tortie refused on the way. */
export interface MachinesValidation {
  rows: MachineRowV1[];
  problems: MachineProblem[];
}

/** Thrown by a field check. Caught once per row, which drops the row whole. */
class RowError extends Error {
  constructor(
    readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'RowError';
  }
}

function fail(field: string, message: string): never {
  throw new RowError(field, message);
}

/** A string with no control characters, inside a length bound. */
function plainString(value: unknown, field: string, max: number, min = 1): string {
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

function noUnknownKeys(obj: Record<string, unknown>, field: string): void {
  const unknown = Object.keys(obj).filter((k) => !MACHINE_ROW_KEYS.includes(k));
  if (unknown.length === 0) return;
  fail(
    `${field}.${unknown[0] ?? ''}`,
    `${field} has ${unknown.length === 1 ? 'a field' : 'fields'} Tortie does ` +
      `not know: ${unknown.join(', ')}. Check the spelling.`
  );
}

/**
 * The address. A leading hyphen gets its own sentence, because the reason is
 * not obvious and a person cannot fix what they cannot see.
 */
function hostField(value: unknown, field: string): string {
  const text = plainString(value, field, MACHINE_LIMITS.maxHost);
  if (text.startsWith('-')) {
    fail(
      field,
      `${field} starts with a hyphen. Tortie refuses that, because the sign in ` +
        `program would read it as one of its own options rather than as an ` +
        `address.`
    );
  }
  if (!HOST_RE.test(text)) {
    fail(
      field,
      `${field} is not a usable address. Use letters, digits, dots and ` +
        `hyphens, e.g. pop-os.tail1a2b.ts.net or 192.168.1.20.`
    );
  }
  return text;
}

/** The account name on the other machine. The same hyphen rule applies. */
function userField(value: unknown, field: string): string {
  const text = plainString(value, field, 32);
  if (text.startsWith('-')) {
    fail(
      field,
      `${field} starts with a hyphen. Tortie refuses that, because the sign in ` +
        `program would read it as one of its own options rather than as a name.`
    );
  }
  if (!USER_RE.test(text)) {
    fail(
      field,
      `${field} is not a usable account name. Use lower case letters, then ` +
        `letters, digits, hyphens or underscores.`
    );
  }
  return text;
}

function portField(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    fail(field, `${field} must be a whole number.`);
  }
  if (value < 1 || value > 65535) {
    fail(field, `${field} must be between 1 and 65535, and it is ${value}.`);
  }
  return value;
}

/** The program Tortie runs on that machine. Absolute, and quote free. */
function remotePathField(value: unknown, field: string): string {
  const text = plainString(value, field, MACHINE_LIMITS.maxRemotePath);
  if (!text.startsWith('/')) {
    fail(
      field,
      `${field} must be a full path starting with /, and it is "${text}". ` +
        `Tortie will not run a name it would have to look up on the other ` +
        `machine.`
    );
  }
  if (text.includes("'")) {
    fail(
      field,
      `${field} contains a single quote, which Tortie refuses in a path. A ` +
        `path with a space in it is fine.`
    );
  }
  return text;
}

/**
 * A version a person accepted for this machine (Phase 83).
 *
 * It is compared against what the machine reports and it reaches no command, so
 * the only question is whether it is a version string at all. The set is closed
 * to the shape `parseTmuxVersion` reads, which leaves no quoting question open
 * and no way for a value here to be read as an option.
 */
function versionField(value: unknown, field: string): string {
  const text = plainString(value, field, 32);
  if (!VERSION_RE.test(text)) {
    fail(
      field,
      `${field} is not a version Tortie can read. A version looks like 3.7c. ` +
        `Tortie will not accept a value it cannot compare against what the ` +
        `machine reports.`
    );
  }
  return text;
}

function colorField(value: unknown, field: string): MachineColor {
  if (typeof value !== 'string' || !MACHINE_COLORS.includes(value as MachineColor)) {
    fail(field, `${field} must be one of ${MACHINE_COLORS.join(', ')}.`);
  }
  return value as MachineColor;
}

/** One row, checked field by field. Any failure throws and drops it whole. */
function validateRow(raw: unknown, index: number): MachineRowV1 {
  const field = `machines[${index}]`;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(field, `${field} must be an object.`);
  }
  const obj = raw as Record<string, unknown>;
  noUnknownKeys(obj, field);

  const id = plainString(obj['id'], `${field}.id`, 32);
  if (!ID_RE.test(id)) {
    fail(
      `${field}.id`,
      `${field}.id "${id}" is not a usable id. Use lower case letters, then ` +
        `letters, digits or hyphens, up to 32 characters.`
    );
  }

  const row: MachineRowV1 = {
    id,
    host: hostField(obj['host'], `${field}.host`)
  };
  if (obj['label'] !== undefined) {
    row.label = plainString(obj['label'], `${field}.label`, MACHINE_LIMITS.maxLabel);
  }
  if (obj['color'] !== undefined) {
    row.color = colorField(obj['color'], `${field}.color`);
  }
  if (obj['user'] !== undefined) {
    row.user = userField(obj['user'], `${field}.user`);
  }
  if (obj['port'] !== undefined) {
    row.port = portField(obj['port'], `${field}.port`);
  }
  if (obj['remoteTmuxPath'] !== undefined) {
    row.remoteTmuxPath = remotePathField(
      obj['remoteTmuxPath'],
      `${field}.remoteTmuxPath`
    );
  }
  if (obj['acceptedTmuxVersion'] !== undefined) {
    row.acceptedTmuxVersion = versionField(
      obj['acceptedTmuxVersion'],
      `${field}.acceptedTmuxVersion`
    );
  }
  return row;
}

/**
 * Check a whole `machines.json` that has already been parsed from JSON.
 *
 * The file itself is never repaired. A file that is not an object, or that
 * carries a schema version this build does not read, or that lists more rows
 * than Tortie accepts, produces no rows at all and one problem saying so.
 * Anything else produces the rows that passed and one problem per row that did
 * not.
 */
export function validateMachinesFile(raw: unknown): MachinesValidation {
  const problems: MachineProblem[] = [];
  const rows: MachineRowV1[] = [];
  const fileProblem = (field: string, message: string): MachinesValidation => {
    problems.push({ index: -1, id: null, field, message });
    return { rows: [], problems };
  };

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fileProblem(
      'file',
      'machines.json must contain a JSON object with a "schema" and a ' +
        '"machines" list.'
    );
  }
  const obj = raw as Record<string, unknown>;

  const declared = obj['schema'];
  if (
    typeof declared !== 'number' ||
    !MACHINES_ACCEPTED_SCHEMAS.includes(declared)
  ) {
    return fileProblem(
      'schema',
      `machines.json must say "schema": ${MACHINES_ACCEPTED_SCHEMAS.join(
        ' or "schema": '
      )}. This build reads no other version.`
    );
  }

  const unknownTop = Object.keys(obj).filter(
    (k) => k !== 'schema' && k !== 'machines'
  );
  if (unknownTop.length > 0) {
    // Not fatal, because one typo at the top of the file should not take every
    // row with it. It is still reported, because a field Tortie ignores is a
    // field the author thought was doing something.
    problems.push({
      index: -1,
      id: null,
      field: unknownTop[0] ?? 'file',
      message:
        `machines.json has ${unknownTop.length === 1 ? 'a field' : 'fields'} ` +
        `Tortie ignores: ${unknownTop.join(', ')}.`
    });
  }

  const machines = obj['machines'];
  if (!Array.isArray(machines)) {
    return fileProblem(
      'machines',
      'machines.json must carry a "machines" list, even an empty one.'
    );
  }
  if (machines.length > MACHINE_LIMITS.maxRows) {
    return fileProblem(
      'machines',
      `machines.json lists ${machines.length} machines and Tortie reads at ` +
        `most ${MACHINE_LIMITS.maxRows}. None of them was used.`
    );
  }

  const seen = new Set<string>();
  machines.forEach((rawRow: unknown, index: number) => {
    let row: MachineRowV1;
    try {
      row = validateRow(rawRow, index);
    } catch (err) {
      const id =
        typeof rawRow === 'object' &&
        rawRow !== null &&
        typeof (rawRow as Record<string, unknown>)['id'] === 'string'
          ? ((rawRow as Record<string, unknown>)['id'] as string)
          : null;
      if (err instanceof RowError) {
        problems.push({ index, id, field: err.field, message: err.message });
      } else {
        problems.push({
          index,
          id,
          field: `machines[${index}]`,
          message: `machines[${index}] could not be read: ${(err as Error).message}`
        });
      }
      return;
    }
    if (seen.has(row.id)) {
      problems.push({
        index,
        id: row.id,
        field: `machines[${index}].id`,
        message:
          `machines[${index}] repeats the id "${row.id}". The first one is ` +
          `used and this one is ignored.`
      });
      return;
    }
    seen.add(row.id);
    rows.push(row);
  });

  return { rows, problems };
}

/** Parse text from disk and check it. A JSON syntax error is one problem. */
export function parseMachines(text: string): MachinesValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      rows: [],
      problems: [
        {
          index: -1,
          id: null,
          field: 'file',
          message: `machines.json is not valid JSON: ${(err as Error).message}`
        }
      ]
    };
  }
  return validateMachinesFile(parsed);
}

/** The file text Tortie writes when it adds or removes a machine. Pure. */
export function serializeMachines(rows: readonly MachineRowV1[]): string {
  const file = {
    schema: 1,
    machines: rows.map((row) => ({
      id: row.id,
      ...(row.label !== undefined ? { label: row.label } : {}),
      ...(row.color !== undefined ? { color: row.color } : {}),
      host: row.host,
      ...(row.user !== undefined ? { user: row.user } : {}),
      ...(row.port !== undefined ? { port: row.port } : {}),
      ...(row.remoteTmuxPath !== undefined
        ? { remoteTmuxPath: row.remoteTmuxPath }
        : {}),
      // Phase 83. Written after remoteTmuxPath, and only when it is there, so a
      // file for a machine nobody accepted a version for is the file this
      // product has always written.
      ...(row.acceptedTmuxVersion !== undefined
        ? { acceptedTmuxVersion: row.acceptedTmuxVersion }
        : {})
    }))
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}
