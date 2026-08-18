/**
 * `MachineRowV1`. The one type a user's `machines.json` may contain.
 *
 * Phase 68, from docs/research/51-remote-machines.md section 4.2. A machine is
 * a configuration row that names an execution target. It takes the agent
 * overlay's template rather than the settings store, for the reason that
 * research gives: a row that can cause a program to run belongs behind the
 * confirm gate, and the settings store has no gate.
 *
 * ## What this file is, and what it is not
 *
 * It is pure data and pure patterns. It imports nothing, because it is compiled
 * into the renderer as well as into main. The hash is taken in main, where
 * `node:crypto` is available, and it lives in src/main/machines/confirm.ts.
 *
 * It is not the machine's runtime state. Nothing here says whether a machine is
 * reachable, which sessions live on it, or what its tmux version is. Phase 68
 * builds no such thing. A machine row is a name, an address and a program path,
 * and nothing in this phase opens a session on one.
 *
 * ## The two kinds of field
 *
 * Five fields decide what runs, being `host`, `user`, `port`,
 * `remoteTmuxPath` and `acceptedTmuxVersion`. Two fields decide how a row
 * looks, being `label` and `color`. The confirm hash covers the first five and
 * the row id, and it covers neither of the last two. A person who renames a
 * machine is not asked to confirm it again, because a name cannot change what
 * runs, and a gate that asks about a rename trains a person to click through
 * the sheet that matters.
 *
 * Phase 83 added the fifth. `acceptedTmuxVersion` is the version of the program
 * a person accepted for this one machine after Tortie said it had not measured
 * it. It decides whether Tortie will start work there at all, so it is an
 * execution bearing field and the hash covers it. The hash text appends it only
 * when it is set, so a row nobody accepted a version for hashes exactly as it
 * did before Phase 83 and nobody is asked to confirm a machine again.
 *
 * ## Why ssh reads its own argv, and what follows from it
 *
 * A `host` or a `user` that begins with `-` would be read by ssh as an option
 * rather than as a name. The two patterns below already forbid it, and the
 * validator names the reason when it drops such a row, so a person can see what
 * happened rather than guess.
 */

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

/** The file name, beside `agents.json` under `<userData>/gmux/config/`. */
export const MACHINES_FILENAME = 'machines.json';

/** The schema number this build writes. */
export const MACHINES_SCHEMA_VERSION = 1;

/** The schema numbers this build reads. One, so far. */
export const MACHINES_ACCEPTED_SCHEMAS: readonly number[] = [1];

// ---------------------------------------------------------------------------
// The patterns
// ---------------------------------------------------------------------------

/**
 * The row id. Lower case, starts with a letter, up to 32 characters.
 *
 * It is the same shape the agent overlay's id uses, and for the same reason: it
 * is a key a person types, it appears in a record, and a closed character set
 * keeps it out of every quoting question.
 */
export const MACHINE_ID_PATTERN = '^[a-z][a-z0-9-]{0,31}$';

/**
 * The address. A host name, a tailnet name or an IP address.
 *
 * It must start and end with a letter or a digit, which is what forbids a
 * leading `-`. ssh would read a leading `-` as an option, and the row would
 * then run a command nobody wrote.
 */
export const MACHINE_HOST_PATTERN =
  '^[A-Za-z0-9]([A-Za-z0-9._-]{0,253}[A-Za-z0-9])?$';

/**
 * The account name on the other machine.
 *
 * The same leading `-` rule applies, for the same reason. The set is the one
 * useradd accepts on Linux and macOS.
 */
export const MACHINE_USER_PATTERN = '^[a-z_][a-z0-9_-]{0,31}$';

/**
 * A version of the program on the other machine, as that machine reports it.
 *
 * It is the shape `parseTmuxVersion` already accepts, e.g. 3.7c. It starts with
 * a digit and carries letters, digits, dots, plus signs and hyphens after it.
 * The set is closed so a value from this field can never be read as an option
 * or as a shell word, and Tortie compares it to what the machine reports rather
 * than passing it to anything.
 */
export const MACHINE_VERSION_PATTERN = '^[0-9][A-Za-z0-9.+-]{0,31}$';

/** The bounds a row and a file are checked against. */
export const MACHINE_LIMITS = {
  /** A file larger than this is not read at all. */
  maxFileBytes: 64 * 1024,
  /** More rows than this and the whole file is dropped. */
  maxRows: 32,
  maxLabel: 40,
  maxHost: 255,
  maxRemotePath: 1024
} as const;

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/** The colours a machine may be given. They are the terminal accent names. */
export type MachineColor =
  | 'blue'
  | 'red'
  | 'cyan'
  | 'orange'
  | 'magenta'
  | 'green';

/** The same six, as a list, for a picker and for validation. */
export const MACHINE_COLORS: readonly MachineColor[] = [
  'blue',
  'red',
  'cyan',
  'orange',
  'magenta',
  'green'
];

/** What a row with no colour gets. */
export const MACHINE_DEFAULT_COLOR: MachineColor = 'blue';

/**
 * One machine, as the file holds it.
 *
 * `id` and `host` are required. Everything else is optional, and every optional
 * field has a plain default stated beside it in the validator.
 */
export interface MachineRowV1 {
  /** The key. Unique in the file, and part of the confirm hash input. */
  id: string;
  /** The name shown in Tortie. Absent means the host is shown. */
  label?: string;
  /** The accent colour. Absent means blue. */
  color?: MachineColor;
  /** The address Tortie signs in to. */
  host: string;
  /** The account name. Absent means the same name used on this Mac. */
  user?: string;
  /** The port. Absent means the usual one. */
  port?: number;
  /** The absolute path of the program Tortie runs on that machine. */
  remoteTmuxPath?: string;
  /**
   * The version a person accepted for this machine, which Tortie has not
   * measured. Absent means they have accepted none.
   *
   * Phase 83. Tortie refuses a version it has not measured, because an
   * untested one can hang instead of failing. A person may accept one anyway
   * for one machine. The acceptance is bound to this exact string, so a machine
   * whose program is updated asks again.
   */
  acceptedTmuxVersion?: string;
}

/**
 * The five fields that decide what runs.
 *
 * The conformance gate compares this list against the hash normalizer's own key
 * set, so a sixth field added to one and not the other fails the gate instead
 * of falling quietly out of the hash.
 *
 * It was four until Phase 83. `acceptedTmuxVersion` joined it because a version
 * a person accepted is what decides whether Tortie starts work on that machine
 * at all.
 */
export const MACHINE_EXECUTION_FIELDS: readonly string[] = [
  'host',
  'user',
  'port',
  'remoteTmuxPath',
  'acceptedTmuxVersion'
];

/** The two fields that decide how a row looks and nothing else. */
export const MACHINE_PRESENTATION_FIELDS: readonly string[] = ['label', 'color'];

/** Every key a row may carry. Anything else drops the row whole. */
export const MACHINE_ROW_KEYS: readonly string[] = [
  'id',
  'label',
  'color',
  'host',
  'user',
  'port',
  'remoteTmuxPath',
  'acceptedTmuxVersion'
];

// ---------------------------------------------------------------------------
// What a drop says
// ---------------------------------------------------------------------------

/**
 * One row Tortie refused, naming the field and the reason.
 *
 * A row that fails any check is dropped entire. It is never partially merged,
 * never silently dropped and never a crash. This is the agent overlay's rule
 * applied to a second file, and the Settings surface is where a person reads
 * these sentences.
 */
export interface MachineProblem {
  /** The row's position in the file. Minus one for a whole file problem. */
  index: number;
  /** The row id, when one could be read. Null when it could not. */
  id: string | null;
  /** The field that failed, e.g. `machines[1].host`. */
  field: string;
  /** One sentence naming the field and the reason. */
  message: string;
}
