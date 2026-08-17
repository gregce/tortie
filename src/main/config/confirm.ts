/**
 * The confirm gate: a configuration row may name a program, and a person says
 * once whether Tortie may run it.
 *
 * ## The rule this file enforces
 *
 * Configuration selects from choices the compiled world already contains, or
 * names an executable the user has personally confirmed. This module is the
 * second half of that sentence. Every field of a configured agent row that can
 * cause a program to run is hashed, a person confirms that hash once, out of
 * band of any agent turn, and the confirmation is bound to it. Change any of
 * those fields and the hash changes, so Tortie asks again.
 *
 * ## Why this is not a formality, written down so a later round does not remove
 * it for convenience
 *
 * Every product cited as precedent for trusting a configuration file has a
 * human as the only routine writer of that file. Obsidian, VS Code, Zed,
 * Raycast and pi are all in that position. Tortie is not. It runs many agent
 * processes at once under one user account, several of them deliberately
 * launchable with their safeguards off, and all of them can write to the home
 * directory. A configuration directory that Tortie reads and an agent can write
 * is an increase in privilege rather than a convenience.
 *
 * So the record of what a person agreed to is sealed (`./seal`), and it lives
 * OUTSIDE the configuration directory. The hash says which bytes were agreed
 * to. The seal says that Tortie is the one who recorded the agreement. Neither
 * one is enough on its own: an agent can compute a sha256, and a seal over a
 * value nobody pinned would approve whatever the file says next.
 *
 * ## The six refusals, and what each one costs if it disappears
 *
 * 1. A row nobody confirmed does not launch. Without it a file an agent can
 *    write decides which program Tortie runs as the user.
 * 2. A row whose execution bearing fields changed since the confirmation does
 *    not launch. Without it the first confirmation is a permanent key and the
 *    argv behind it can be swapped afterwards.
 * 3. A record whose seal cannot be read confirms nothing. Without it the gate
 *    fails open on the one machine where the keystore is broken, which is the
 *    machine least able to notice.
 * 4. Reading configuration never starts anything. Without it a later round
 *    wires "the file changed, so relaunch it", and a file becomes a way to
 *    start a process with no person present.
 * 5. A confirmation is recorded only by a call that carries the acknowledgement
 *    sentence. Without it a later round adds a convenience path and the gate
 *    quietly confirms rows on the user's behalf.
 * 6. A row that moved while the sheet was on screen is not confirmed. Without
 *    it a person's agreement lands on bytes they never read.
 *
 * All six are asserted in `build/assert-bundle-refusals.mjs` against
 * `out/main/index.js`, because a refusal the bundler deleted is a refusal the
 * product only claims to have (Phase 20's finding). Two of them WERE deleted by
 * rollup on the first build here, for the exact reason that script names: the
 * only caller passed a constant it could fold. `./confirm-smoke.ts` is the
 * second caller, and it is a useful one rather than a decoy.
 *
 * ## Where it is read, and where it is not
 *
 * This module reads one file under `<userData>/gmux/`. It never reads the
 * manifest, never opens tmux, never spawns anything, and never writes anywhere
 * else. The launch path calls {@link assertConfigRowMayLaunch} and gets a throw
 * or nothing. The restore path calls nothing here at all, because by then the
 * argv it needs was copied into the manifest row at create time and a session's
 * recovery must never depend on a file the user can delete.
 */

import { createHash } from 'node:crypto';
import { gmuxError } from '../errors';
// The one quoting helper in the process that turns an argv into the line a
// person reads. It is a pure function with no electron and no I/O. The import
// goes ONE WAY: config reads a helper from restore, and restore never reads
// config, which is the boundary the phase's import test pins.
import { shellQuoteArgv } from '../restore/command';
// Phase 68 moved the sealed record layer out of this file, unchanged, so the
// machines gate can share ONE record file with this one. Every refusal sentence
// stayed here. See ./confirm-record.ts for what moved and why.
import {
  readConfirmRecords,
  writeConfirmRecords,
  type ConfirmRecord,
  type ConfirmRecordState
} from './confirm-record';

import { getLog } from '../log';

/**
 * Scope "config" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const configLog = getLog('config');

// ---------------------------------------------------------------------------
// What counts as execution bearing
// ---------------------------------------------------------------------------

/**
 * The fields of a configured agent row that can cause a program to run.
 *
 * THIS IS THE GATE'S OWN TYPE AND IT IS DELIBERATELY NOT THE REGISTRY'S. The
 * registry entry carries 23 fields and most of them decide how a row looks. Of
 * the ones that decide what runs, this type names each separately and flatly,
 * so adding a field is a visible edit here rather than a nested shape that
 * quietly rides along inside something else. The overlay type maps ONTO this;
 * neither type imports the other.
 *
 * Every field below is here because a value in it reaches a process. The
 * justification is on each one. A field that only decides how a row is drawn
 * does not belong here, and adding one would make the gate ask again for a
 * change that cannot hurt anybody, which is how a confirmation becomes noise a
 * person learns to click through.
 */
export interface ConfigExecutionFields {
  /**
   * Whether a pane may spawn this row at all. False to true is the difference
   * between a row that is data and a row that runs.
   */
  readonly launchable: boolean;
  /**
   * Candidate binary names, most canonical first. This is the program.
   * A name containing a `/` is returned verbatim by binary resolution, so an
   * absolute or tilde path here is exactly what a person is confirming.
   */
  readonly binaries: readonly string[];
  /**
   * Directories searched for that binary ahead of the login shell PATH. It
   * decides WHICH file of that name is found, so it is as load bearing as the
   * name itself.
   */
  readonly extraProbeDirs: readonly string[];
  /** The launch argv. argv[0] is the binary name. */
  readonly launchArgv: readonly string[];
  /** Environment entries added to the spawn. */
  readonly launchEnv: Readonly<Record<string, string>>;
  /**
   * Environment variable NAMES read from the login shell at each launch and
   * each restore, and handed to that pane only (Phase 33).
   *
   * THE NAMES ARE HASHED AND THE VALUES NEVER ARE. Which variables reach a
   * process changes what that process does, so adding or removing a name asks
   * the person again. The value is whatever the user's own shell says at the
   * moment of the launch, it is resolved fresh every time, and it is never
   * written to any file. Hashing a value would put a credential in the record
   * of what somebody agreed to, and rotating that credential would refuse the
   * launch until they confirmed it again.
   */
  readonly envPassthroughNames: readonly string[];
  /** The resume argv template, with the conversation id slot in it. */
  readonly resumeTemplate: readonly string[];
  /**
   * Where the original launch flags go in the resume argv. It changes the
   * command line that runs, so it is execution bearing even though it holds no
   * argument of its own.
   */
  readonly resumeExtrasPosition: 'leading' | 'trailing' | null;
  /** The version probe's arguments. Tortie runs this as a subprocess. */
  readonly versionProbeArgs: readonly string[];
  /** The version probe's second attempt. Also a subprocess. */
  readonly versionProbeFallbackArgs: readonly string[];
  /**
   * How the conversation id is obtained. One mode, `pre-assign-cmd`, runs a
   * side command, so the mode is recorded as well as its argv.
   */
  readonly idCaptureMode: string;
  /** The side command run to obtain a conversation id, when there is one. */
  readonly idCaptureArgv: readonly string[];
  /**
   * The launch flags offered as presets. Each one can be switched on and reach
   * an argv, so the set is confirmed even though no single one is applied here.
   */
  readonly flagPresetFlags: readonly string[];
}

/**
 * How each field is turned into hash input.
 *
 * The mapped type covers EVERY key of {@link ConfigExecutionFields}, so a field
 * added to that type without a line here is a compile error rather than a field
 * that silently falls out of the hash. The key order is taken from this object
 * and sorted, so there is no second list to keep in step with it.
 *
 * Order is preserved where order changes meaning and dropped where it does not.
 * An argv is ordered, so `['-a','-b']` and `['-b','-a']` are different programs
 * and must hash differently. Environment keys and preset flags are a set, so
 * rewriting the same values in another order is the same row and must not ask
 * the person again for nothing.
 */
type Normalizers = {
  readonly [K in keyof ConfigExecutionFields]-?: (
    value: ConfigExecutionFields[K]
  ) => unknown;
};

const NORMALIZE: Normalizers = {
  launchable: (v) => v,
  binaries: (v) => [...v],
  extraProbeDirs: (v) => [...v],
  launchArgv: (v) => [...v],
  launchEnv: (v) =>
    Object.entries(v)
      .filter(([k, value]) => typeof k === 'string' && typeof value === 'string')
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  // A set, like the environment keys above it. Adding or removing a name is a
  // different row and must ask again; writing the same names in another order
  // is the same row and must not.
  envPassthroughNames: (v) => [...v].sort(),
  resumeTemplate: (v) => [...v],
  resumeExtrasPosition: (v) => v,
  versionProbeArgs: (v) => [...v],
  versionProbeFallbackArgs: (v) => [...v],
  idCaptureMode: (v) => v,
  idCaptureArgv: (v) => [...v],
  flagPresetFlags: (v) => [...v].sort()
};

/** Names the algorithm, so a record written by an older build fails loudly. */
export const CONFIG_EXECUTION_HASH_ALGORITHM = 'sha256-config-exec-v1';

/** Everything an empty row has. Callers fill in only what their row carries. */
export const EMPTY_EXECUTION_FIELDS: ConfigExecutionFields = {
  launchable: false,
  binaries: [],
  extraProbeDirs: [],
  launchArgv: [],
  launchEnv: {},
  envPassthroughNames: [],
  resumeTemplate: [],
  resumeExtrasPosition: null,
  versionProbeArgs: [],
  versionProbeFallbackArgs: [],
  idCaptureMode: 'none',
  idCaptureArgv: [],
  flagPresetFlags: []
};

/** The text that is hashed. Exported so a test can read what was covered. */
export function canonicalExecutionText(
  id: string,
  fields: ConfigExecutionFields
): string {
  const keys = (Object.keys(NORMALIZE) as (keyof ConfigExecutionFields)[]).sort();
  const rows: [string, unknown][] = [['id', id]];
  for (const key of keys) {
    const normalize = NORMALIZE[key] as (value: unknown) => unknown;
    rows.push([key, normalize(fields[key])]);
  }
  return `${CONFIG_EXECUTION_HASH_ALGORITHM}\n${JSON.stringify(rows)}`;
}

/**
 * The hash a confirmation is bound to.
 *
 * The row id is part of the input, so renaming a row asks again. That is the
 * right answer: the name is what the person saw when they agreed, and a row
 * that took over another row's confirmed hash would inherit its approval.
 */
export function executionHash(id: string, fields: ConfigExecutionFields): string {
  return createHash('sha256').update(canonicalExecutionText(id, fields)).digest('hex');
}

// ---------------------------------------------------------------------------
// What the person reads
// ---------------------------------------------------------------------------

/**
 * The sentence that must be on the confirm sheet, in these words.
 *
 * Honesty is part of the mechanism here rather than decoration around it. A
 * person cannot agree to something the screen did not say, and what this gate
 * is asking is not "do you trust this file" but "may Tortie run this program as
 * you".
 */
export const CONFIG_CONFIRM_WARNING =
  'This names a program on your machine and Tortie will run it as you, ' +
  'with your files and your credentials.';

/** The conversation id slot, shown as it appears in the template. */
const SESSION_ID_SLOT = '<sessionId>';

/** Everything the sheet shows about one row, and what gets recorded. */
export interface ConfigExecutionSummary {
  readonly id: string;
  readonly hash: string;
  readonly algorithm: string;
  /** The launch command line. Null when the row cannot launch. */
  readonly commandLine: string | null;
  /** The resume command line, with the id slot left in place. Null when none. */
  readonly resumeCommandLine: string | null;
  /** `KEY=value` per environment entry added to the spawn. */
  readonly env: readonly string[];
  /**
   * Names read from the login shell at each launch (Phase 33). Sorted. No
   * value appears here, because no value is ever known to this module.
   */
  readonly envPassthrough: readonly string[];
  /** Directories searched for the binary ahead of PATH. */
  readonly probeDirs: readonly string[];
  /** Commands Tortie runs by itself: the version probe and the id capture. */
  readonly sideCommands: readonly string[];
  /**
   * Every line above as one list. This is what a person reads and it is what is
   * recorded, so "you confirmed this" and "the file now says that" are two
   * lists of the same kind rather than a hash a person cannot check.
   */
  readonly lines: readonly string[];
  /** {@link CONFIG_CONFIRM_WARNING}, carried so the sheet cannot omit it. */
  readonly warning: string;
}

/** Read one row as the lines a person is asked to agree to. Pure. */
export function describeExecution(
  id: string,
  fields: ConfigExecutionFields
): ConfigExecutionSummary {
  const commandLine =
    fields.launchArgv.length > 0 ? shellQuoteArgv(fields.launchArgv) : null;
  const binary = fields.binaries[0] ?? fields.launchArgv[0] ?? id;
  const resumeCommandLine =
    fields.resumeTemplate.length > 0
      ? shellQuoteArgv([binary, ...fields.resumeTemplate])
      : null;
  const env = Object.entries(fields.launchEnv)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`);
  // Phase 33. One line per name, sorted, and never a value. The sheet is read
  // by a person and screenshotted by support, so a credential printed here
  // would leave the machine with it.
  const envPassthrough = [...fields.envPassthroughNames].sort();
  const sideCommands: string[] = [];
  if (fields.versionProbeArgs.length > 0) {
    sideCommands.push(shellQuoteArgv([binary, ...fields.versionProbeArgs]));
  }
  if (fields.versionProbeFallbackArgs.length > 0) {
    sideCommands.push(shellQuoteArgv([binary, ...fields.versionProbeFallbackArgs]));
  }
  // PHASE 23 FIX ROUND. `idCaptureArgv` holds two different things and the
  // sheet used to print both as side commands, which made one of them a false
  // sentence on the one screen where a false sentence is a defect.
  //
  //  - `pre-assign-cmd` really is a side command. Tortie runs that argv by
  //    itself, before the pane exists, to obtain a conversation id.
  //  - `pre-assign` is a FLAG. Tortie appends it to the launch argv next to a
  //    uuid it generated. It never runs on its own, so "Also runs by itself:
  //    --session-id" described something Tortie does not do.
  //
  // The hash is unchanged. Both are still execution bearing and both are still
  // covered, because the fields are hashed and the lines are only read.
  const preAssignFlags =
    fields.idCaptureMode === 'pre-assign' ? fields.idCaptureArgv : [];
  if (fields.idCaptureMode !== 'pre-assign' && fields.idCaptureArgv.length > 0) {
    sideCommands.push(shellQuoteArgv(fields.idCaptureArgv));
  }

  const lines: string[] = [];
  lines.push(`Runs: ${commandLine ?? 'nothing, this row cannot be launched'}`);
  lines.push(`Program: ${binary}`);
  if (fields.binaries.length > 1) {
    lines.push(`Or, if that is not found: ${fields.binaries.slice(1).join(', ')}`);
  }
  for (const dir of fields.extraProbeDirs) {
    lines.push(`Looks for it in: ${dir}`);
  }
  if (resumeCommandLine !== null) {
    lines.push(
      `Resumes a conversation with: ${resumeCommandLine} ` +
        `(${SESSION_ID_SLOT} is the conversation)`
    );
  }
  for (const flag of preAssignFlags) {
    lines.push(
      `Adds to the start command: ${flag} ${SESSION_ID_SLOT} ` +
        `(${SESSION_ID_SLOT} is an id Tortie makes)`
    );
  }
  for (const entry of env) lines.push(`Sets in the environment: ${entry}`);
  for (const name of envPassthrough) {
    lines.push(`Reads from your shell at each launch: ${name}`);
  }
  for (const command of sideCommands) lines.push(`Also runs by itself: ${command}`);
  for (const flag of [...fields.flagPresetFlags].sort()) {
    lines.push(`Offers the launch flag: ${flag}`);
  }

  return {
    id,
    hash: executionHash(id, fields),
    algorithm: CONFIG_EXECUTION_HASH_ALGORITHM,
    commandLine,
    resumeCommandLine,
    env,
    envPassthrough,
    probeDirs: [...fields.extraProbeDirs],
    sideCommands,
    lines,
    warning: CONFIG_CONFIRM_WARNING
  };
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * What Tortie recorded when a person agreed to one row.
 *
 * Phase 68 moved this shape, and the four functions that read and write the
 * file it lives in, into `./confirm-record.ts`. Nothing about any of them
 * changed. They moved so that the machines gate, which asks the same question
 * about a different kind of row, shares ONE record file with this gate rather
 * than growing a second one with its own subtly different failure modes. This
 * alias keeps the name every caller of this module already imports.
 */
export type ConfigConfirmation = ConfirmRecord;

// The path is re-exported rather than re-derived. One opinion about where the
// record lives, and it is `./confirm-record.ts`.
export { confirmPath } from './confirm-record';

/**
 * The records, read fresh on every call.
 *
 * The no cache rule and the argument for it moved with the function. See
 * `readConfirmRecords` in `./confirm-record.ts`, and do not put the cache back.
 *
 * The algorithm name handed over is this gate's own. It is the name a record
 * written before the field existed is read as, and the machines gate passes its
 * own name for the same reason.
 */
function readState(): ConfirmRecordState {
  return readConfirmRecords(CONFIG_EXECUTION_HASH_ALGORITHM);
}

// ---------------------------------------------------------------------------
// The state of one row
// ---------------------------------------------------------------------------

export type ConfigConfirmState =
  /** The hash on record is the hash of the row as it is now. It may launch. */
  | 'confirmed'
  /** Nothing is on record for this row. */
  | 'never'
  /** Something is on record, and the row's execution bearing fields moved. */
  | 'changed'
  /** The seal could not be read, so what is on record is not known yet. */
  | 'unknown';

export interface ConfigRowStatus {
  readonly id: string;
  readonly state: ConfigConfirmState;
  /** The hash of the row as the file has it now. */
  readonly hash: string;
  /** The hash on record. Null when nothing is. */
  readonly confirmedHash: string | null;
  readonly confirmedAt: number | null;
  /** The lines the person read when they agreed. Empty when they never did. */
  readonly confirmedLines: readonly string[];
  /** The lines the row would show now. */
  readonly lines: readonly string[];
  /** One sentence saying why it cannot launch. Null when it can. */
  readonly refusal: string | null;
}

/**
 * What is on record for one row, against the row as it is right now.
 *
 * Reads the file. Starts nothing, and cannot: there is no spawn in this module.
 */
export function configRowStatus(
  id: string,
  fields: ConfigExecutionFields
): ConfigRowStatus {
  const summary = describeExecution(id, fields);
  const state = readState();
  const row = state.rows[id];
  const base = {
    id,
    hash: summary.hash,
    lines: summary.lines,
    confirmedHash: row?.hash ?? null,
    confirmedAt: row?.at ?? null,
    confirmedLines: row?.lines ?? []
  };
  // Refusal 4, and it is checked here rather than only at the launch call so
  // that it covers BOTH ways a row's state matters. Nothing may report a row as
  // confirmed while the configuration file is being read, because "is this row
  // confirmed" is the whole of the launch decision, and a caller that asks it
  // from inside the read is a caller that is about to act on the answer.
  if (readingConfig > 0) {
    return { ...base, state: 'unknown', refusal: duringReadRefusal(id) };
  }
  if (!state.sealKnown) {
    return {
      ...base,
      state: 'unknown',
      refusal: sealUnknownRefusal(id)
    };
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
// Refusal 4 — reading configuration never starts anything
// ---------------------------------------------------------------------------

/**
 * Depth of the "a configuration read is in progress" scope.
 *
 * WHAT THIS IS FOR. The structural control is elsewhere and it is stronger: a
 * row that has just appeared in the file has no confirmation, so it cannot
 * launch, so a configuration change cannot start a process. This flag exists so
 * that a later round which wires "the file changed, so relaunch it" fails at
 * once and says why, instead of appearing to work on a machine where the row
 * happens to be confirmed already.
 *
 * It is a SYNCHRONOUS scope on purpose. Holding it across an await would refuse
 * an unrelated launch the user asked for at the same moment, and a refusal a
 * person did not earn is how a control gets removed.
 */
let readingConfig = 0;

/**
 * Run the configuration load and merge with the launch gate closed.
 *
 * The body must be synchronous. Read the file first, then call this around the
 * part that turns bytes into rows.
 */
export function whileReadingConfig<T>(fn: () => T): T {
  readingConfig += 1;
  try {
    return fn();
  } finally {
    readingConfig -= 1;
  }
}

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

function neverConfirmedRefusal(id: string): string {
  return (
    `Tortie will not start ${id} from a configuration file that nobody has ` +
    `confirmed. Read what it will run and confirm it in Tortie first. ` +
    `Nothing was started.`
  );
}

function changedRefusal(id: string): string {
  return (
    `Tortie will not start ${id}, because its configuration changed after you ` +
    `confirmed it. Read the change and confirm it again if it is what you ` +
    `want. Nothing was started.`
  );
}

function sealUnknownRefusal(id: string): string {
  return (
    `Tortie could not read its record of what you confirmed, so it will not ` +
    `start ${id}. Nothing was started.`
  );
}

function duringReadRefusal(id: string): string {
  return (
    `A configuration change never starts anything on its own. Reading ${id} ` +
    `from the configuration file asked to launch it. Nothing was started.`
  );
}

/**
 * The gate. Throws when this row may not start a process, and returns nothing
 * when it may.
 *
 * Call it on the path that creates a session, immediately before the launch
 * spec is built, for any agent that came from configuration. A compiled
 * registry row never reaches here: the twelve rows Tortie ships are part of the
 * signed bundle and there is nobody else to confirm them to.
 */
export function assertConfigRowMayLaunch(
  id: string,
  fields: ConfigExecutionFields
): void {
  const status = configRowStatus(id, fields);
  if (status.refusal !== null) {
    throw gmuxError('INVALID_INPUT', status.refusal);
  }
}

/** The same question without the throw, for a list that draws its rows. */
export function isConfigRowConfirmed(
  id: string,
  fields: ConfigExecutionFields
): boolean {
  return configRowStatus(id, fields).state === 'confirmed';
}

// ---------------------------------------------------------------------------
// Recording an agreement
// ---------------------------------------------------------------------------

/**
 * The exact sentence {@link confirmConfigRow} demands.
 *
 * It is a sentence rather than `true` so that it cannot be produced by a
 * default, by a spread, or by an options object passed through from somewhere
 * else. The type is the literal, so a wrong string is a compile error as well
 * as a refusal at runtime. This is the shape `applyReconstruction` already
 * uses for the same reason.
 */
export const CONFIG_CONFIRM_ACKNOWLEDGEMENT =
  'a person read what this will run and agreed to it';

/** Everything the gate needs from the person who agreed. */
export interface ConfigConfirmConsent {
  /** Exactly {@link CONFIG_CONFIRM_ACKNOWLEDGEMENT}. */
  readonly acknowledgement: typeof CONFIG_CONFIRM_ACKNOWLEDGEMENT;
  /**
   * The lines the person actually read, which is
   * {@link ConfigExecutionSummary.lines} from the sheet they saw.
   *
   * They are passed back rather than recomputed so that the record says what
   * was on screen. If the row moved while the sheet was open, the hash below no
   * longer matches and the confirmation is refused, which is the same guard
   * `executeSkillsPlan` applies to a command line that changed after it was
   * shown.
   */
  readonly linesRead: readonly string[];
  /** The hash the sheet was drawn from. */
  readonly hashRead: string;
}

/**
 * Record that a person agreed to one row. The only way a confirmation is ever
 * written.
 *
 * Refuses when the acknowledgement is not exact, and when the row moved between
 * the sheet being drawn and the person pressing the button. Returns null when
 * the OS keystore cannot seal the record, because a confirmation the next load
 * would refuse would make the product lie about what it will do.
 */
export function confirmConfigRow(
  id: string,
  fields: ConfigExecutionFields,
  consent: ConfigConfirmConsent
): ConfigConfirmation | null {
  if (consent.acknowledgement !== CONFIG_CONFIRM_ACKNOWLEDGEMENT) {
    throw gmuxError(
      'INVALID_INPUT',
      `A configuration row is confirmed by a person, not by a file. Pass ` +
        `CONFIG_CONFIRM_ACKNOWLEDGEMENT exactly. Nothing was confirmed.`
    );
  }
  const summary = describeExecution(id, fields);
  if (consent.hashRead !== summary.hash) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie did not confirm ${id}, because the row changed after it was ` +
        `shown. Read it again and confirm what it says now. Nothing was ` +
        `confirmed.`
    );
  }
  const confirmation: ConfigConfirmation = {
    id,
    hash: summary.hash,
    algorithm: summary.algorithm,
    at: Date.now(),
    lines: [...consent.linesRead]
  };
  const rows = { ...readState().rows, [id]: confirmation };
  if (!writeConfirmRecords(rows)) {
    configLog.warn(
      `the OS keystore is unavailable, so the confirmation for ${id} ` +
        `could not be recorded. It was not written.`
    );
    return null;
  }
  return confirmation;
}

/**
 * Drop a confirmation, so the row asks again.
 *
 * Called when a person withdraws one, and when a row leaves the configuration
 * file. A row that comes back later is a row nobody has agreed to yet.
 */
export function forgetConfigRow(id: string): void {
  const rows = { ...readState().rows };
  if (rows[id] === undefined) return;
  delete rows[id];
  writeConfirmRecords(rows);
}

/** Every confirmation on record. For the settings list and for the tests. */
export function listConfigConfirmations(): ConfigConfirmation[] {
  return Object.values(readState().rows).sort((a, b) => (a.id < b.id ? -1 : 1));
}
