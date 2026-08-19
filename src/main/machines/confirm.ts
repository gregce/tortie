/**
 * The machine confirm gate. A row names a computer, and a person says once
 * whether Tortie may sign in to it as them.
 *
 * ## The rule this file enforces
 *
 * Configuration selects from choices the compiled world already contains, or
 * names an executable the user has personally confirmed. A machine row names
 * an address, an account and a program path on a computer that is not this one,
 * so it is squarely the second half of that sentence. The five fields that
 * decide what runs are hashed, a person confirms that hash once, out of band of
 * any agent turn, and the confirmation is bound to it. Change any of those five
 * and the hash changes, so Tortie asks again. Phase 68 shipped four of them and
 * Phase 83 added the fifth, which is the accepted tmux version.
 *
 * ## The fifth field, and why the algorithm name did not move (Phase 83)
 *
 * `acceptedTmuxVersion` is the fifth execution bearing field. It holds the
 * version of the program on that machine which a person accepted after Tortie
 * said it had not measured it. It decides whether Tortie starts work there at
 * all, so it belongs in the hash.
 *
 * {@link canonicalMachineText} appends it ONLY when it is set. Every row that
 * exists today carries no accepted version, so every one of them hashes byte
 * for byte as it did before Phase 83 and nobody is asked to confirm a machine
 * again. That is why {@link MACHINE_EXECUTION_HASH_ALGORITHM} still reads
 * `sha256-machine-exec-v1`. The name exists so a record written by a build with
 * different bytes fails loudly, and this build produces the same bytes for
 * every record that exists. Asking again for a change that cannot affect a
 * person is how they are trained to click through the sheet that matters.
 * `build/conformance-machines.mjs` pins the unaccepted hash against a hard
 * coded value, so this is checked rather than promised.
 *
 * ## Why this gate has its OWN field type and does not reuse the agent gate's
 *
 * `ConfigExecutionFields` in `../config/confirm.ts` carries thirteen fields
 * about a program on this Mac. Mapping a machine onto it would put the compiled
 * ssh options inside the hash. Phase 69 sets keepalive values from measurement,
 * and under a shared type that measurement would invalidate every machine a
 * person had already confirmed, which would train them to click through the
 * sheet that matters. So the hash below binds the five fields a person actually
 * chose and nothing else.
 *
 * The mapped type `Normalizers` is copied from that module deliberately. It
 * covers every key of {@link MachineExecutionFields}, so a sixth execution
 * bearing field added later without a normalizer line is a compile error rather
 * than a field that quietly falls out of the hash. Phase 83 added the fifth
 * through exactly that route, and the compile error is what asked for its
 * normalizer line.
 *
 * ## One record file, two key spaces
 *
 * Confirmations for machines live in the same sealed file as confirmations for
 * configured agents, `<userData>/gmux/config-confirmations.json`, under the same
 * seal. One file is the record of what this person agreed to run. The record key
 * for a machine is its row id with {@link MACHINE_CONFIRM_ID_PREFIX} in front of
 * it, and that prefixed id goes into the hash input as well, so a machine called
 * `pop-os` and a configured agent called `pop-os` can never share a
 * confirmation. Dropping the prefix from either side opens that hole, and
 * `build/conformance-machines.mjs` checks both sides.
 *
 * ## The six refusals, and what each one costs if it disappears
 *
 * 1. A machine nobody confirmed is not connected to. Without it a file an agent
 *    can write decides which computer Tortie signs in to as the user.
 * 2. A machine whose execution bearing fields changed since the confirmation is
 *    not connected to. Without it the first confirmation is a permanent key and
 *    the address behind it can be swapped afterwards.
 * 3. A record whose seal cannot be read confirms nothing. Without it the gate
 *    fails open on the one machine where the keystore is broken.
 * 4. Reading `machines.json` never connects to anything. Without it a later
 *    round wires "the file changed, so connect to it", and a file becomes a way
 *    to reach another computer with no person present.
 * 5. A confirmation is recorded only by a call carrying the acknowledgement
 *    sentence. Without it a later round adds a convenience path and the gate
 *    quietly confirms machines on the user's behalf.
 * 6. A row that moved while the sheet was on screen is not confirmed. Without
 *    it a person's agreement lands on details they never read.
 *
 * All six are asserted in `build/assert-bundle-refusals.mjs` against
 * `out/main/index.js`, because a refusal the bundler deleted is a refusal the
 * product only claims to have. `./smoke.ts` is the second caller the bundler
 * cannot see through, in the same way `../config/confirm-smoke.ts` is for the
 * agent gate.
 *
 * ## What this module does not do
 *
 * It spawns nothing. It has no import that could. It reads one file, which is
 * the sealed record, through `../config/confirm-record.ts`. It never opens a
 * session, never starts a remote server and never measures a version. Phase 68
 * builds none of those.
 */

import { createHash } from 'node:crypto';
import { gmuxError } from '../errors';
import {
  readConfirmRecords,
  writeConfirmRecords,
  type ConfirmRecord
} from '../config/confirm-record';
// Refusal 4 is one scope, shared with the agent gate rather than re-created.
// A second copy would be a second thing to keep in step, and the whole point of
// the scope is that it is closed everywhere at once.
import { whileReadingConfig } from '../config/confirm';

import { getLog } from '../log';

/** Scope "config" (Phase 35), because this is a second gate on one record. */
const machinesLog = getLog('config');

// ---------------------------------------------------------------------------
// What counts as execution bearing
// ---------------------------------------------------------------------------

/**
 * The fields of a machine row that decide what runs, and where.
 *
 * Every field below is here because a value in it reaches a process. `label`
 * and `color` are not here, and adding one would make the gate ask again for a
 * change that cannot hurt anybody.
 */
export interface MachineExecutionFields {
  /** The address Tortie signs in to. */
  readonly host: string;
  /** The account name, or null for the same name used on this Mac. */
  readonly user: string | null;
  /** The port, or null for the usual one. */
  readonly port: number | null;
  /** The absolute path of the program Tortie runs there, or null when unset. */
  readonly remoteTmuxPath: string | null;
  /**
   * The version a person accepted for this machine, or null when they accepted
   * none.
   *
   * Phase 83. It is execution bearing because it is what lets Tortie start work
   * on a machine running a version nobody measured. It reaches no argv: nothing
   * composes a command out of it, and it is only ever compared against what the
   * machine reports.
   *
   * IT IS OPTIONAL, and absent means the same as null, which is a machine
   * nobody accepted a version for. That is deliberate and it is the rule every
   * appended field in this codebase follows: a fields object written before this
   * field existed is still a valid one, and it hashes exactly as it did. The
   * mapped type below still covers this key with `-?`, so a normalizer line is
   * still compulsory and the field still cannot fall quietly out of the hash.
   */
  readonly acceptedTmuxVersion?: string | null;
}

/**
 * How each field is turned into hash input.
 *
 * The mapped type covers EVERY key of {@link MachineExecutionFields}, so a
 * field added to that type without a line here is a compile error rather than a
 * field that silently falls out of the hash. The key order is taken from this
 * object and sorted, so there is no second list to keep in step with it.
 */
type Normalizers = {
  readonly [K in keyof MachineExecutionFields]-?: (
    value: MachineExecutionFields[K]
  ) => unknown;
};

const NORMALIZE: Normalizers = {
  host: (v) => v,
  user: (v) => v,
  port: (v) => v,
  remoteTmuxPath: (v) => v,
  acceptedTmuxVersion: (v) => v
};

/**
 * The keys appended after Phase 68, in the order they were added.
 *
 * A key on this list is emitted into the hash text only when its value is a
 * non-empty string. A key that is not on this list is emitted always. See the
 * fifth field section at the top of this file for why that split exists.
 */
const APPENDED_KEYS: readonly (keyof MachineExecutionFields)[] = [
  'acceptedTmuxVersion'
];

/** Names the algorithm, so a record written by an older build fails loudly. */
export const MACHINE_EXECUTION_HASH_ALGORITHM = 'sha256-machine-exec-v1';

/**
 * The prefix on a machine's record key AND on its hash input id.
 *
 * It is on both on purpose. The record key keeps a machine and a configured
 * agent with the same bare id apart in one file. The hash input keeps them
 * apart even if a later edit ever put them in separate files, so neither half
 * is load bearing alone.
 */
export const MACHINE_CONFIRM_ID_PREFIX = 'machine:';

/** The record key for one machine id. */
export function machineRecordKey(id: string): string {
  return `${MACHINE_CONFIRM_ID_PREFIX}${id}`;
}

/** Everything an empty machine has. Callers fill in only what their row carries. */
export const EMPTY_MACHINE_FIELDS: MachineExecutionFields = {
  host: '',
  user: null,
  port: null,
  remoteTmuxPath: null,
  acceptedTmuxVersion: null
};

/**
 * The text that is hashed. Exported so a test can read what was covered.
 *
 * The four fields Phase 68 hashed are emitted exactly as they were, sorted, in
 * every case. The fifth is appended only when a person has accepted a version.
 * A row nobody accepted a version for therefore hashes byte for byte as it did
 * before Phase 83, so this build does not ask every machine a person already
 * confirmed to be confirmed again. Asking again for a change that cannot affect
 * them is how a person is trained to click through the sheet that matters.
 * `build/conformance-machines.mjs` pins the unaccepted hash against a hard
 * coded value, so this property is checked rather than promised.
 */
export function canonicalMachineText(
  id: string,
  fields: MachineExecutionFields
): string {
  const every = Object.keys(NORMALIZE) as (keyof MachineExecutionFields)[];
  const original = every.filter((key) => !APPENDED_KEYS.includes(key)).sort();
  const rows: [string, unknown][] = [['id', machineRecordKey(id)]];
  for (const key of original) {
    const normalize = NORMALIZE[key] as (value: unknown) => unknown;
    rows.push([key, normalize(fields[key])]);
  }
  for (const key of APPENDED_KEYS) {
    const value = fields[key];
    if (typeof value !== 'string' || value.length === 0) continue;
    const normalize = NORMALIZE[key] as (value: unknown) => unknown;
    rows.push([key, normalize(value)]);
  }
  return `${MACHINE_EXECUTION_HASH_ALGORITHM}\n${JSON.stringify(rows)}`;
}

/**
 * The hash a confirmation is bound to.
 *
 * The row id is part of the input, so renaming a row asks again. That is the
 * right answer: the id is what the person saw when they agreed, and a row that
 * took over another row's confirmed hash would inherit its approval.
 */
export function machineExecutionHash(
  id: string,
  fields: MachineExecutionFields
): string {
  return createHash('sha256').update(canonicalMachineText(id, fields)).digest('hex');
}

// ---------------------------------------------------------------------------
// What the person reads
// ---------------------------------------------------------------------------

/**
 * The sentence that must be on the confirm sheet, in these words.
 *
 * Honesty is part of the mechanism here rather than decoration around it. A
 * person cannot agree to something the screen did not say, and what this gate
 * asks is not "do you trust this file" but "may Tortie sign in to this machine
 * as you".
 */
export const MACHINE_CONFIRM_WARNING =
  'This names a machine Tortie will sign in to as you, and a program it will ' +
  'run there with your files and your credentials.';

/**
 * The limit of what confirming can promise, printed beside the sheet.
 *
 * Research 51 section 4.2 requires this on screen and these are its words in
 * plain form. It is carried on every result so no surface can omit or reword
 * it.
 *
 * TWO SENTENCES, AND IT STAYS TWO. A third sentence once stood here, reading
 * "Anyone who can write to that machine can change it, and Tortie will not see
 * that happen." Do not put it back. It describes something that has not
 * happened at the moment a person presses the confirm button, and a caveat
 * about a later event belongs where that event happens. The threat itself is
 * written down in research 51 section 4.2.
 *
 * REWORDING THIS IS A COPY CHANGE AND NOT AN AGREEMENT CHANGE. This text is
 * drawn beside the hashed facts rather than being one of them. It is kept out
 * of {@link MachineSummary.lines} and out of the canonical text the hash
 * covers, and confirm.test.ts asserts both of those. So the words here can be
 * corrected without moving any hash and without invalidating any record. The
 * words are still pinned, by ipc.test.ts in main and by the Settings copy
 * tests in the renderer, so a change here fails those until they are updated
 * with it.
 */
export const MACHINE_PATH_HONESTY =
  'Confirming seals which program Tortie runs on that machine. It can never ' +
  'seal the bytes of that program.';

/** Everything the sheet shows about one machine, and what gets recorded. */
export interface MachineSummary {
  readonly id: string;
  readonly hash: string;
  readonly algorithm: string;
  /**
   * The lines a person reads, and they are exactly the hashed facts.
   *
   * The pinned ssh path and {@link MACHINE_PATH_HONESTY} are shown beside these
   * and are deliberately NOT in this list, because this list is what the record
   * says a person agreed to and it must not carry anything the hash does not
   * cover.
   */
  readonly lines: readonly string[];
  /** {@link MACHINE_CONFIRM_WARNING}, carried so the sheet cannot omit it. */
  readonly warning: string;
}

/** Read one machine as the lines a person is asked to agree to. Pure. */
export function describeMachine(
  id: string,
  fields: MachineExecutionFields
): MachineSummary {
  const lines: string[] = [];
  lines.push(`Machine: ${fields.host}`);
  if (fields.user !== null) lines.push(`Signs in as: ${fields.user}`);
  if (fields.port !== null) lines.push(`Port: ${String(fields.port)}`);
  lines.push(
    `Runs this program on that machine: ${
      fields.remoteTmuxPath ??
      'not chosen yet, so Tortie cannot use this machine.'
    }`
  );
  // Phase 83. Drawn only when a person has accepted a version, so `lines` stays
  // exactly the hashed facts. A row with no accepted version has no fifth entry
  // in the hash text either, and the two must say the same thing.
  if (
    typeof fields.acceptedTmuxVersion === 'string' &&
    fields.acceptedTmuxVersion.length > 0
  ) {
    lines.push(
      `Accepts this version of the program, which Tortie has not measured: ` +
        `${fields.acceptedTmuxVersion}`
    );
  }
  return {
    id,
    hash: machineExecutionHash(id, fields),
    algorithm: MACHINE_EXECUTION_HASH_ALGORITHM,
    lines,
    warning: MACHINE_CONFIRM_WARNING
  };
}

// ---------------------------------------------------------------------------
// The state of one machine
// ---------------------------------------------------------------------------

export type MachineConfirmState =
  /** The hash on record is the hash of the row as it is now. It may be used. */
  | 'confirmed'
  /** Nothing is on record for this machine. */
  | 'never'
  /** Something is on record, and an execution bearing field moved. */
  | 'changed'
  /** The seal could not be read, so what is on record is not known yet. */
  | 'unknown';

export interface MachineRowStatus {
  readonly id: string;
  readonly state: MachineConfirmState;
  /** The hash of the row as the file has it now. */
  readonly hash: string;
  /** The hash on record. Null when nothing is. */
  readonly confirmedHash: string | null;
  readonly confirmedAt: number | null;
  /** The lines the person read when they agreed. Empty when they never did. */
  readonly confirmedLines: readonly string[];
  /** The lines the row would show now. */
  readonly lines: readonly string[];
  /** One sentence saying why it cannot be used. Null when it can. */
  readonly refusal: string | null;
}

/** The records, read fresh on every call. See ../config/confirm-record.ts. */
function readState(): ReturnType<typeof readConfirmRecords> {
  return readConfirmRecords(MACHINE_EXECUTION_HASH_ALGORITHM);
}

/**
 * What is on record for one machine, against the row as it is right now.
 *
 * Reads the record file. Starts nothing, and cannot: there is no spawn in this
 * module.
 *
 * The order of the checks is the agent gate's order, for the same reasons. The
 * reading scope first, then the seal, then the record, then the hash.
 */
export function machineRowStatus(
  id: string,
  fields: MachineExecutionFields
): MachineRowStatus {
  const summary = describeMachine(id, fields);
  const state = readState();
  const row = state.rows[machineRecordKey(id)];
  const base = {
    id,
    hash: summary.hash,
    lines: summary.lines,
    confirmedHash: row?.hash ?? null,
    confirmedAt: row?.at ?? null,
    confirmedLines: row?.lines ?? []
  };
  // Refusal 4. Nothing may report a machine as confirmed while machines.json is
  // being read, because "is this machine confirmed" is the whole of the connect
  // decision, and a caller that asks it from inside the read is a caller that is
  // about to act on the answer.
  if (isReadingMachines()) {
    return { ...base, state: 'unknown', refusal: duringReadRefusal(id) };
  }
  if (!state.sealKnown) {
    return { ...base, state: 'unknown', refusal: sealUnknownRefusal(id) };
  }
  if (row === undefined) {
    return { ...base, state: 'never', refusal: neverConfirmedRefusal(id) };
  }
  if (row.hash !== summary.hash) {
    return { ...base, state: 'changed', refusal: changedRefusal(id) };
  }
  return { ...base, state: 'confirmed', refusal: null };
}

// ---------------------------------------------------------------------------
// Refusal 4. Reading configuration never connects to anything
// ---------------------------------------------------------------------------

/**
 * Depth of the "a machines file read is in progress" scope.
 *
 * WHAT THIS IS FOR. The structural control is elsewhere and it is stronger: a
 * machine that has just appeared in the file has no confirmation, so it cannot
 * be connected to, so a configuration change cannot reach another computer.
 * This flag exists so that a later round which wires "the file changed, so
 * connect to it" fails at once and says why, instead of appearing to work on a
 * machine where the row happens to be confirmed already.
 *
 * It is a SYNCHRONOUS scope on purpose. Holding it across an await would refuse
 * an unrelated connection the user asked for at the same moment, and a refusal
 * a person did not earn is how a control gets removed.
 */
let readingMachines = 0;

function isReadingMachines(): boolean {
  return readingMachines > 0;
}

/**
 * Run the machines load with the connect gate closed.
 *
 * The body must be synchronous. Read the file first, then call this around the
 * part that turns bytes into rows. It nests inside `whileReadingConfig` so the
 * agent gate is closed for the same window, which is what makes one scope out
 * of two files.
 */
export function whileReadingMachines<T>(fn: () => T): T {
  readingMachines += 1;
  try {
    return whileReadingConfig(fn);
  } finally {
    readingMachines -= 1;
  }
}

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

function neverConfirmedRefusal(id: string): string {
  return (
    `Tortie will not connect to ${id}, because nobody has confirmed it. Read ` +
    `what it will run and confirm it in Tortie first. Nothing was started.`
  );
}

function changedRefusal(id: string): string {
  return (
    `Tortie will not connect to ${id}, because its details changed after you ` +
    `confirmed them. Read the change and confirm it again if it is what you ` +
    `want. Nothing was started.`
  );
}

function sealUnknownRefusal(id: string): string {
  return (
    `Tortie could not read its record of what you confirmed, so it will not ` +
    `connect to ${id}. Nothing was started.`
  );
}

function duringReadRefusal(id: string): string {
  return (
    `A configuration change never starts anything on its own. Reading ${id} ` +
    `from the machines file asked to connect to it. Nothing was started.`
  );
}

/**
 * The gate. Throws when this machine may not be connected to, and returns
 * nothing when it may.
 *
 * Call it on any path that is about to reach another computer for a SAVED row.
 * In this phase that is one caller, being `machines:test` in `saved` mode, and
 * `./smoke.ts` is the second. A draft test deliberately does not call this: the
 * values there are the person's own keystrokes and there is nothing to have
 * confirmed yet.
 */
export function assertMachineMayConnect(
  id: string,
  fields: MachineExecutionFields
): void {
  const status = machineRowStatus(id, fields);
  if (status.refusal !== null) {
    throw gmuxError('INVALID_INPUT', status.refusal);
  }
}

/** The same question without the throw, for a list that draws its rows. */
export function isMachineConfirmed(
  id: string,
  fields: MachineExecutionFields
): boolean {
  return machineRowStatus(id, fields).state === 'confirmed';
}

// ---------------------------------------------------------------------------
// Recording an agreement
// ---------------------------------------------------------------------------

/**
 * The exact sentence {@link confirmMachine} demands.
 *
 * It is a sentence rather than `true` so that it cannot be produced by a
 * default, by a spread, or by an options object passed through from somewhere
 * else. The type is the literal, so a wrong string is a compile error as well
 * as a refusal at runtime.
 *
 * IT IS SUPPLIED IN MAIN, by the handler a person's click reaches. It is never
 * sent from the renderer and never read from a file, so the sentence means "a
 * person pressed the button in Tortie" and cannot mean anything else.
 */
export const MACHINE_CONFIRM_ACKNOWLEDGEMENT =
  'a person read what this will run and agreed to it';

/** Everything the gate needs from the person who agreed. */
export interface MachineConfirmConsent {
  /** Exactly {@link MACHINE_CONFIRM_ACKNOWLEDGEMENT}. */
  readonly acknowledgement: typeof MACHINE_CONFIRM_ACKNOWLEDGEMENT;
  /** The lines the person actually read, which is the sheet they saw. */
  readonly linesRead: readonly string[];
  /** The hash the sheet was drawn from. */
  readonly hashRead: string;
}

/**
 * Who to tell when a machine's confirmation changes (Phase 92 fix round).
 *
 * The bug this closes was measured on a real Mac. A person added their first
 * machine and confirmed it, and the home screen's new action row did not
 * appear until Tortie was restarted. The window is pushed a machine's state by
 * `onMachineStateChanged` in ./machine-state.ts, which listened to two things,
 * being the link and `machines.json`. A confirmation is neither. It is written
 * to `<userData>/gmux/config-confirmations.json`, so nothing fired and the
 * window kept the answer it was given before the person pressed the button.
 *
 * Main itself was always right, because `machineRowStatus` reads the record
 * file on every call. Only the push was missing, so this is the whole fix.
 */
type ConfirmListener = () => void;
let confirmListeners: ConfirmListener[] = [];

/** Fire `cb` after a machine confirmation is recorded or withdrawn. */
export function onMachineConfirmationsChanged(cb: ConfirmListener): () => void {
  confirmListeners.push(cb);
  return () => {
    confirmListeners = confirmListeners.filter((one) => one !== cb);
  };
}

/** Tell everyone. A listener that throws never stops the others. */
function fireConfirmationsChanged(): void {
  for (const cb of [...confirmListeners]) {
    try {
      cb();
    } catch (err) {
      machinesLog.warn(
        `a machine confirmation listener threw: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

/**
 * Record that a person agreed to one machine. The only way a machine
 * confirmation is ever written.
 *
 * Refuses when the acknowledgement is not exact, and when the row moved between
 * the sheet being drawn and the person pressing the button. Returns null when
 * the OS keystore cannot seal the record, because a confirmation the next load
 * would refuse would make the product lie about what it will do.
 */
export function confirmMachine(
  id: string,
  fields: MachineExecutionFields,
  consent: MachineConfirmConsent
): ConfirmRecord | null {
  if (consent.acknowledgement !== MACHINE_CONFIRM_ACKNOWLEDGEMENT) {
    throw gmuxError(
      'INVALID_INPUT',
      `A machine is confirmed by a person, not by a file. Pass ` +
        `MACHINE_CONFIRM_ACKNOWLEDGEMENT exactly. Nothing was confirmed.`
    );
  }
  const summary = describeMachine(id, fields);
  if (consent.hashRead !== summary.hash) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie did not confirm ${id}, because the machine changed after it was ` +
        `shown. Read it again and confirm what it says now. Nothing was ` +
        `confirmed.`
    );
  }
  const key = machineRecordKey(id);
  const record: ConfirmRecord = {
    id: key,
    hash: summary.hash,
    algorithm: summary.algorithm,
    at: Date.now(),
    lines: [...consent.linesRead]
  };
  const rows = { ...readState().rows, [key]: record };
  if (!writeConfirmRecords(rows)) {
    machinesLog.warn(
      `the OS keystore is unavailable, so the confirmation for machine ${id} ` +
        `could not be recorded. It was not written.`
    );
    return null;
  }
  fireConfirmationsChanged();
  return record;
}

/**
 * Drop a machine's confirmation, so it asks again.
 *
 * Called when a person withdraws one, and when a machine leaves the file. A row
 * that comes back later is a machine nobody has agreed to yet.
 */
export function forgetMachine(id: string): void {
  const key = machineRecordKey(id);
  const rows = { ...readState().rows };
  if (rows[key] === undefined) return;
  delete rows[key];
  writeConfirmRecords(rows);
  fireConfirmationsChanged();
}

/** Every machine confirmation on record. For the tests and for the smoke. */
export function listMachineConfirmations(): ConfirmRecord[] {
  return Object.values(readState().rows)
    .filter((row) => row.id.startsWith(MACHINE_CONFIRM_ID_PREFIX))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}
