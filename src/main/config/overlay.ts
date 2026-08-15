/**
 * The validated door onto the agent table. Phase 23, research 31 sections 6
 * and 7.
 *
 * Two functions and one rule.
 *
 * `validateAgentOverlayFile` turns whatever JSON was on disk into rows Tortie
 * will act on, plus a list of the rows it refused and why.
 * `mergeAgentOverlay` puts those rows over the compiled registry. Unknown ids
 * create agents. Known ids patch them.
 *
 * The rule is that an invalid row is **dropped whole**. It is never partially
 * merged, never silently dropped, and never a crash. Every drop produces one
 * `AgentOverlayProblem` naming the field and the reason, in a sentence a
 * person reading their own file can act on. This is the settings sanitiser's
 * discipline applied to a second file, and it is the reason the checks below
 * are written as small throwing helpers caught once per row. A check that
 * returns a fallback would half merge a row, which is exactly what must not
 * happen.
 *
 * ## Nothing here touches the disk
 *
 * This module is pure. src/main/config/store.ts owns reading, caching,
 * reloading and watching, and it is the only place a read can happen. That
 * split is what makes "never read on the session create path and never on the
 * restore path" a fact about the code rather than a promise. A caller who
 * wants the merged table gets it from memory.
 *
 * ## What this module does NOT decide
 *
 * It does not decide whether a row is confirmed and it does not own the hash.
 * confirm.ts owns the execution fields, the algorithm name, the sentence the
 * person reads and the seal. This module only says two things about the gate.
 * `rowBearsExecution` says whether the gate applies to a row at all, and
 * `executionFieldsOf` turns a merged agent into the flat shape confirm.ts
 * hashes. There is one hash in the phase, and it is not here.
 *
 * ## The gate applies to the ROW, and the hash covers the MERGED result
 *
 * Those two sentences are not in tension and both matter.
 *
 * A row that only renames a compiled agent supplies nothing that can run, so it
 * must not arm the gate. If it did, giving Claude Code a nickname would stop
 * Claude Code launching until the user confirmed a command line they never
 * wrote.
 *
 * When the gate does apply, what the person confirms is what will actually run,
 * which for a patched agent is the compiled command line with their changes in
 * it. So the hash is taken over the merged entry rather than over the row's
 * fields in isolation.
 */

import type {
  AgentOverlayIdCaptureV1,
  AgentOverlayLaunchV2,
  AgentOverlayProblem,
  AgentOverlayResumeV1,
  AgentOverlayV1,
  AgentOverlayVersionProbeV1
} from '@shared/agent-overlay';
import {
  AGENT_OVERLAY_ACCEPTED_SCHEMAS,
  AGENT_SESSION_ID_SLOT,
  ENV_PASSTHROUGH_REFUSED,
  ENV_REFUSED_EXACT,
  ENV_REFUSED_PATTERNS,
  OVERLAY_ID_PATTERN,
  OVERLAY_ICON_KEY_PATTERN,
  OVERLAY_BARE_BINARY_PATTERN,
  OVERLAY_ENV_KEY_PATTERN,
  OVERLAY_LIMITS,
  REFUSED_RESUME_FIELDS,
  REFUSED_ROW_FIELDS,
  RESERVED_AGENT_IDS,
  rowBearsExecution
} from '@shared/agent-overlay';
import type { AgentRegistryEntry } from '../agents/registry';
import { AGENT_REGISTRY } from '../agents/registry';
import type { ConfigExecutionFields } from './confirm';
import { EMPTY_EXECUTION_FIELDS, executionHash } from './confirm';

// ---------------------------------------------------------------------------
// The merged table
// ---------------------------------------------------------------------------

/** Where one row of the merged table came from. */
export type AgentEntrySource =
  /** Compiled into this build, untouched by any configuration. */
  | 'builtin'
  /** Compiled into this build, with some fields replaced by the user's file. */
  | 'patched'
  /** The user's file created it. This build has no row of its own for it. */
  | 'config';

/**
 * One agent, after the merge.
 *
 * It is `AgentRegistryEntry` with three differences, and each of them is
 * deliberate.
 *
 * `id` is a `string` rather than `AgentRegistryId`. The registry id is a
 * closed union of twelve literals with 130 references across 30 files, several
 * of them `Record` keys, so widening it is a decision for the phase's spec
 * rather than something a loader does on its own. Carrying the merged table in
 * its own type keeps the closed union exactly as it is.
 *
 * `source` says where the row came from, so the UI can be honest about it.
 *
 * `executionHash` is the value the confirm gate binds a human's approval to.
 * It is null for a compiled row, because a signed build is not something the
 * user is asked to vouch for, and it is null for a configured row that only
 * renames or re-icons a compiled agent.
 */
export interface MergedAgentEntry extends Omit<AgentRegistryEntry, 'id'> {
  id: string;
  source: AgentEntrySource;
  executionHash: string | null;
}

/** What the merge produced, and everything it refused on the way. */
export interface AgentOverlayMerge {
  agents: MergedAgentEntry[];
  problems: AgentOverlayProblem[];
}

/** What the validator produced, and everything it refused on the way. */
export interface AgentOverlayValidation {
  rows: AgentOverlayV1[];
  problems: AgentOverlayProblem[];
}

/**
 * A merged agent in the flat shape the confirm gate hashes and describes.
 *
 * Two of the mappings are worth stating, because a reader will look for them.
 *
 * The pre-assignment flag goes into `idCaptureArgv`. It is not part of
 * `launch.argv`, because Tortie injects it at spawn time next to the id it
 * made, so without this line a row could change `--session-id` to another flag
 * and the hash would not move.
 *
 * `flagPresetFlags` can only ever hold compiled presets, because configuration
 * cannot supply a preset at all. It is still covered, so that a Tortie update
 * which adds a preset to an agent a user has patched asks them again.
 */
export function executionFieldsOf(entry: MergedAgentEntry): ConfigExecutionFields {
  const capture = entry.resume.idCapture;
  const idCaptureArgv =
    capture.mode === 'pre-assign-cmd'
      ? capture.argv
      : capture.mode === 'pre-assign'
        ? capture.launchFlag
        : [];
  return {
    ...EMPTY_EXECUTION_FIELDS,
    launchable: entry.launchable,
    binaries: entry.binaries,
    extraProbeDirs: entry.extraProbeDirs,
    launchArgv: entry.launch?.argv ?? [],
    launchEnv: entry.launch?.env ?? {},
    // Phase 33. The NAMES, and only ever the names. The values are read from
    // the login shell at each launch and are never hashed, never shown and
    // never stored, so a rotated key moves nothing here.
    envPassthroughNames: entry.launch?.envPassthrough ?? [],
    resumeTemplate: entry.resume.template,
    resumeExtrasPosition: entry.resume.resumeExtrasPosition ?? null,
    versionProbeArgs: entry.versionProbe?.args ?? [],
    versionProbeFallbackArgs: entry.versionProbe?.fallbackArgs ?? [],
    idCaptureMode: capture.mode,
    idCaptureArgv,
    flagPresetFlags: (entry.flagPresets ?? []).map((p) => p.flag)
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = new RegExp(OVERLAY_ID_PATTERN);
const ICON_RE = new RegExp(OVERLAY_ICON_KEY_PATTERN);
const BARE_BINARY_RE = new RegExp(OVERLAY_BARE_BINARY_PATTERN);
const ENV_KEY_RE = new RegExp(OVERLAY_ENV_KEY_PATTERN);
/** Control characters. They never belong in a name, a path or an argument. */
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

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

function asObject(value: unknown, field: string, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(field, `${field} must be ${what}.`);
  }
  return value as Record<string, unknown>;
}

function noUnknownKeys(
  obj: Record<string, unknown>,
  known: readonly string[],
  field: string
): void {
  const unknown = Object.keys(obj).filter((k) => !known.includes(k));
  if (unknown.length === 0) return;
  fail(
    `${field}.${unknown[0] ?? ''}`,
    `${field} has ${unknown.length === 1 ? 'a field' : 'fields'} Tortie does ` +
      `not know: ${unknown.join(', ')}. Check the spelling against ` +
      `agents.schema.json.`
  );
}

/**
 * Fields Tortie knows the name of and still does not read.
 *
 * Checked before the unknown key check, so a person who wrote `flagPresets`
 * gets the reason rather than "check the spelling". The row is still dropped
 * whole, because a row that half applies is the thing this loader must never
 * produce.
 */
function refusedKeys(
  obj: Record<string, unknown>,
  refusals: Readonly<Record<string, string>>,
  field: string
): void {
  for (const key of Object.keys(obj)) {
    const reason = refusals[key];
    if (reason === undefined) continue;
    fail(`${field}.${key}`, reason);
  }
}

/** A string with no control characters, inside a length bound. */
function plainString(value: unknown, field: string, max: number, min = 1): string {
  if (typeof value !== 'string') fail(field, `${field} must be text.`);
  const text = value as string;
  if (text.length < min) fail(field, `${field} must not be empty.`);
  if (text.length > max) {
    fail(field, `${field} is longer than the ${max} characters Tortie accepts.`);
  }
  if (CONTROL_RE.test(text)) {
    fail(field, `${field} contains a control character, which Tortie refuses.`);
  }
  return text;
}

/** A list of directories Tortie will look in, each checked as a path. */
function pathTemplateArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) fail(field, `${field} must be a list.`);
  const list = value as unknown[];
  if (list.length > OVERLAY_LIMITS.maxDirs) {
    fail(
      field,
      `${field} has more than the ${OVERLAY_LIMITS.maxDirs} directories Tortie accepts.`
    );
  }
  return list.map((item, i) => pathTemplate(item, `${field}[${i}]`));
}

function boolField(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail(field, `${field} must be true or false.`);
  return value as boolean;
}

function enumField<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(field, `${field} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

/**
 * An executable: a bare name Tortie resolves, or a path it takes verbatim.
 *
 * A relative path is refused. `resolveBinaryAgainst` returns any path
 * containing a slash exactly as written, so `./claude` would run whatever sat
 * in whichever directory the process happened to be in. An absolute path or a
 * `~/` path names one file on the machine, which is what the confirmation is
 * about.
 */
function binaryName(value: unknown, field: string): string {
  const text = plainString(value, field, OVERLAY_LIMITS.maxBinaryLength);
  if (text.includes('/')) {
    if (!text.startsWith('/') && !text.startsWith('~/')) {
      fail(
        field,
        `${field} is a relative path (${text}). A path must be absolute or ` +
          `start with ~/, because a relative one would be resolved against ` +
          `whichever directory Tortie happened to be in.`
      );
    }
    if (text.split('/').includes('..')) {
      fail(field, `${field} contains "..", which Tortie refuses in a path.`);
    }
    return text;
  }
  if (!BARE_BINARY_RE.test(text)) {
    fail(
      field,
      `${field} is not a usable executable name. Use a bare name such as ` +
        `"claude", or an absolute path.`
    );
  }
  return text;
}

/**
 * A directory Tortie will look in. `~/` and `$VAR` are expanded by the same
 * helper the compiled rows use, and one `*` segment is globbed.
 */
function pathTemplate(value: unknown, field: string): string {
  const text = plainString(value, field, OVERLAY_LIMITS.maxDirLength);
  if (!text.startsWith('/') && !text.startsWith('~/') && !text.startsWith('$')) {
    fail(
      field,
      `${field} must start with /, ~/ or an environment variable. Tortie will ` +
        `not resolve a relative directory.`
    );
  }
  if (text.split('/').includes('..')) {
    fail(field, `${field} contains "..", which Tortie refuses in a path.`);
  }
  return text;
}

/** One command line argument. The session id slot is refused where it cannot go. */
function argument(value: unknown, field: string, opts: { allowSlot: boolean }): string {
  const text = plainString(value, field, OVERLAY_LIMITS.maxArgLength, 0);
  if (!opts.allowSlot && text.includes(AGENT_SESSION_ID_SLOT)) {
    fail(
      field,
      `${field} contains ${AGENT_SESSION_ID_SLOT}, which only belongs in ` +
        `resume.template. Tortie fills the id in itself.`
    );
  }
  return text;
}

function argvField(
  value: unknown,
  field: string,
  opts: { maxItems: number; minItems: number; allowSlot: boolean }
): string[] {
  if (!Array.isArray(value)) fail(field, `${field} must be a list.`);
  const list = value as unknown[];
  if (list.length < opts.minItems) {
    fail(field, `${field} must have at least ${opts.minItems} entries.`);
  }
  if (list.length > opts.maxItems) {
    fail(field, `${field} has more than the ${opts.maxItems} entries Tortie accepts.`);
  }
  return list.map((item, i) =>
    argument(item, `${field}[${i}]`, { allowSlot: opts.allowSlot })
  );
}

function envField(value: unknown, field: string): Record<string, string> {
  const obj = asObject(value, field, 'a set of name and value pairs');
  const keys = Object.keys(obj);
  if (keys.length > OVERLAY_LIMITS.maxEnvKeys) {
    fail(field, `${field} sets more than the ${OVERLAY_LIMITS.maxEnvKeys} values Tortie accepts.`);
  }
  const out: Record<string, string> = {};
  for (const key of keys) {
    if (key.length > OVERLAY_LIMITS.maxEnvKeyLength || !ENV_KEY_RE.test(key)) {
      fail(`${field}.${key}`, `${field}.${key} is not a usable environment variable name.`);
    }
    if (ENV_REFUSED_EXACT.includes(key)) {
      fail(
        `${field}.${key}`,
        `${field} may not set ${key}. It decides which program or which ` +
          `startup file runs, which would undo the confirmation you gave on ` +
          `the executable.`
      );
    }
    const refused = ENV_REFUSED_PATTERNS.find((p) => p.pattern.test(key));
    if (refused !== undefined) {
      fail(`${field}.${key}`, `${field} may not set ${key}, because ${refused.why}.`);
    }
    out[key] = plainString(obj[key], `${field}.${key}`, OVERLAY_LIMITS.maxEnvValueLength, 0);
  }
  return out;
}

/**
 * `launch.envPassthrough` (Phase 33): the NAMES of variables Tortie reads from
 * the login shell at each launch and each restore.
 *
 * The checks run in this order, and the order is chosen so that the sentence a
 * person reads names the first thing actually wrong with their row rather than
 * a consequence of it. A row that fails any of them is dropped whole by the
 * caller, which is the standing rule for this loader.
 *
 *  1. It is a list.
 *  2. It holds at most 16 entries.
 *  3. Every entry is a usable environment variable name.
 *  4. No entry appears twice.
 *  5. No entry is on the denylist.
 *  6. No entry is a name `launch.env` already sets.
 *
 * The denylist is the SAME one `launch.env` uses, plus the two names that move
 * where pi keeps its sessions. A passthrough `PATH` is the same danger as a
 * literal one, because the name decides what reaches the process and the value
 * is what the user's own shell says at that moment.
 *
 * The last check refuses a name that `launch.env` already sets. Two sources
 * for one name would make every report about it wrong in one direction or the
 * other, and the notice for an unresolved name could not be written honestly.
 */
function envPassthroughField(
  value: unknown,
  field: string,
  env: Readonly<Record<string, string>> | undefined
): string[] {
  if (!Array.isArray(value)) {
    fail(field, `${field} must be a list of environment variable names.`);
  }
  const list = value as unknown[];
  if (list.length > OVERLAY_LIMITS.maxEnvPassthroughNames) {
    fail(
      field,
      `${field} names more than the ${OVERLAY_LIMITS.maxEnvPassthroughNames} ` +
        `variables Tortie accepts.`
    );
  }
  // Each check runs over the WHOLE list before the next one starts, rather
  // than the whole set of checks running over each entry. That is what makes
  // the order above a real order: a list that names PATH at the front and the
  // same variable twice at the back reports the duplicate, because a duplicate
  // is a typing mistake and the denylist entry is a decision.
  const names = list.map((item, i) => {
    if (
      typeof item !== 'string' ||
      item.length > OVERLAY_LIMITS.maxEnvKeyLength ||
      !ENV_KEY_RE.test(item)
    ) {
      fail(`${field}[${i}]`, `${field}[${i}] is not a usable environment variable name.`);
    }
    return item;
  });

  names.forEach((name, i) => {
    if (names.indexOf(name) !== i) {
      fail(`${field}[${i}]`, `${field} names ${name} twice.`);
    }
  });

  names.forEach((name, i) => {
    if (ENV_REFUSED_EXACT.includes(name)) {
      fail(
        `${field}[${i}]`,
        `${field} may not name ${name}. It decides which program or which ` +
          `startup file runs, which would undo the confirmation you gave on ` +
          `the executable.`
      );
    }
    const refused = ENV_REFUSED_PATTERNS.find((p) => p.pattern.test(name));
    if (refused !== undefined) {
      fail(`${field}[${i}]`, `${field} may not name ${name}, because ${refused.why}.`);
    }
    const moved = ENV_PASSTHROUGH_REFUSED.find((p) => p.name === name);
    if (moved !== undefined) {
      fail(`${field}[${i}]`, `${field} may not name ${name}. ${moved.why}`);
    }
  });

  names.forEach((name, i) => {
    if (env !== undefined && Object.prototype.hasOwnProperty.call(env, name)) {
      fail(
        `${field}[${i}]`,
        `${field} may not name ${name}, because launch.env already sets it. ` +
          `Pick one source for each name.`
      );
    }
  });

  return names;
}

/**
 * The launch block. `schema` is the number at the top of the file, because one
 * field of this block exists only at schema 2 and a schema 1 file that carries
 * it gets a sentence naming the version rather than "Tortie does not know this
 * field".
 */
function launchField(
  value: unknown,
  field: string,
  schema: number
): AgentOverlayLaunchV2 {
  const obj = asObject(value, field, 'an object');
  noUnknownKeys(obj, ['argv', 'env', 'envPassthrough'], field);
  const argv = argvField(obj['argv'], `${field}.argv`, {
    minItems: 1,
    maxItems: OVERLAY_LIMITS.maxArgv,
    allowSlot: false
  });
  const first = argv[0];
  if (first === undefined || first.length === 0) {
    fail(`${field}.argv[0]`, `${field}.argv[0] must be the executable name.`);
  }
  const out: AgentOverlayLaunchV2 = { argv };
  if (obj['env'] !== undefined) out.env = envField(obj['env'], `${field}.env`);
  if (obj['envPassthrough'] !== undefined) {
    if (schema < 2) {
      fail(
        `${field}.envPassthrough`,
        `${field}.envPassthrough needs "schema": 2 at the top of agents.json. ` +
          `Change the schema number and Tortie will read this field. Files ` +
          `that say "schema": 1 keep working without it.`
      );
    }
    out.envPassthrough = envPassthroughField(
      obj['envPassthrough'],
      `${field}.envPassthrough`,
      out.env
    );
  }
  return out;
}

function idCaptureField(value: unknown, field: string): AgentOverlayIdCaptureV1 {
  const obj = asObject(value, field, 'an object');
  const mode = obj['mode'];
  if (mode === 'harvest') {
    fail(
      `${field}.mode`,
      `${field}.mode cannot be "harvest". Reading an agent's own session ` +
        `store needs a reader written for that store's format and compiled ` +
        `into Tortie, so a configured agent has no way to harvest an id. Use ` +
        `"pre-assign" if the CLI accepts a session id on its command line, ` +
        `"pre-assign-cmd" if it prints one, or "none".`
    );
  }
  if (mode === 'unverified') {
    fail(
      `${field}.mode`,
      `${field}.mode cannot be "unverified". That value is Tortie's own note ` +
        `about work Tortie has not done. Use "none" when there is nothing to ` +
        `resume.`
    );
  }
  if (mode === 'pre-assign') {
    noUnknownKeys(obj, ['mode', 'launchFlag'], field);
    return {
      mode: 'pre-assign',
      launchFlag: argvField(obj['launchFlag'], `${field}.launchFlag`, {
        minItems: 1,
        maxItems: 4,
        allowSlot: false
      })
    };
  }
  if (mode === 'pre-assign-cmd') {
    noUnknownKeys(obj, ['mode', 'argv'], field);
    return {
      mode: 'pre-assign-cmd',
      argv: argvField(obj['argv'], `${field}.argv`, {
        minItems: 1,
        maxItems: OVERLAY_LIMITS.maxArgv,
        allowSlot: false
      })
    };
  }
  if (mode === 'none') {
    noUnknownKeys(obj, ['mode'], field);
    return { mode: 'none' };
  }
  fail(
    `${field}.mode`,
    `${field}.mode must be "pre-assign", "pre-assign-cmd" or "none".`
  );
}

function resumeField(value: unknown, field: string): AgentOverlayResumeV1 {
  const obj = asObject(value, field, 'an object');
  refusedKeys(obj, REFUSED_RESUME_FIELDS, field);
  noUnknownKeys(
    obj,
    [
      'template',
      'sessionStore',
      'idCapture',
      'requiresOriginalCwd',
      'bareResumeIsDangerous',
      'resumeExtrasPosition'
    ],
    field
  );
  const template = argvField(obj['template'], `${field}.template`, {
    minItems: 1,
    maxItems: OVERLAY_LIMITS.maxTemplate,
    allowSlot: true
  });
  // The embedded case is checked first, because `--resume=<sessionId>` also
  // has zero exact slots and the count message would send the author looking
  // for a missing entry rather than at the one they wrote.
  const embedded = template.findIndex(
    (t) => t !== AGENT_SESSION_ID_SLOT && t.includes(AGENT_SESSION_ID_SLOT)
  );
  if (embedded >= 0) {
    fail(
      `${field}.template[${embedded}]`,
      `${field}.template[${embedded}] has ${AGENT_SESSION_ID_SLOT} inside a ` +
        `longer string. Tortie only replaces an entry that is exactly the ` +
        `slot, so put it in its own entry.`
    );
  }
  const slots = template.filter((t) => t === AGENT_SESSION_ID_SLOT).length;
  if (slots !== 1) {
    fail(
      `${field}.template`,
      `${field}.template must contain exactly one entry that is the text ` +
        `${AGENT_SESSION_ID_SLOT}, and it has ${slots}. Tortie replaces that ` +
        `entry with the conversation id. A resume command that loses its id ` +
        `does not fail, it opens somebody else's conversation.`
    );
  }
  const out: AgentOverlayResumeV1 = {
    template,
    idCapture: idCaptureField(obj['idCapture'], `${field}.idCapture`)
  };
  if (obj['sessionStore'] !== undefined) {
    out.sessionStore = plainString(
      obj['sessionStore'],
      `${field}.sessionStore`,
      OVERLAY_LIMITS.maxSessionStoreLength
    );
  }
  if (obj['requiresOriginalCwd'] !== undefined) {
    out.requiresOriginalCwd = boolField(
      obj['requiresOriginalCwd'],
      `${field}.requiresOriginalCwd`
    );
  }
  if (obj['bareResumeIsDangerous'] !== undefined) {
    out.bareResumeIsDangerous = boolField(
      obj['bareResumeIsDangerous'],
      `${field}.bareResumeIsDangerous`
    );
  }
  if (obj['resumeExtrasPosition'] !== undefined) {
    out.resumeExtrasPosition = enumField(
      obj['resumeExtrasPosition'],
      `${field}.resumeExtrasPosition`,
      ['leading', 'trailing'] as const
    );
  }
  return out;
}

function versionProbeField(value: unknown, field: string): AgentOverlayVersionProbeV1 {
  const obj = asObject(value, field, 'an object');
  noUnknownKeys(obj, ['args', 'fallbackArgs', 'identitySubstring', 'postProcess'], field);
  const out: AgentOverlayVersionProbeV1 = {
    args: argvField(obj['args'], `${field}.args`, {
      minItems: 0,
      maxItems: OVERLAY_LIMITS.maxProbeArgs,
      allowSlot: false
    })
  };
  if (obj['fallbackArgs'] !== undefined) {
    out.fallbackArgs = argvField(obj['fallbackArgs'], `${field}.fallbackArgs`, {
      minItems: 0,
      maxItems: OVERLAY_LIMITS.maxProbeArgs,
      allowSlot: false
    });
  }
  if (obj['identitySubstring'] !== undefined) {
    out.identitySubstring = plainString(
      obj['identitySubstring'],
      `${field}.identitySubstring`,
      128
    );
  }
  if (obj['postProcess'] !== undefined) {
    out.postProcess = enumField(obj['postProcess'], `${field}.postProcess`, [
      'first-line',
      'strip-ansi-last-line'
    ] as const);
  }
  return out;
}

const ROW_KEYS: readonly string[] = [
  'id',
  'displayName',
  'binaries',
  'extraProbeDirs',
  'storeDirs',
  'launch',
  'resume',
  'versionProbe',
  'iconKey',
  'notes'
];

/**
 * One row, checked field by field. Any failure throws and drops it whole.
 *
 * `schema` is the version the file declared. Only one check reads it, being
 * the schema 2 field inside `launch`, and it is passed down rather than held
 * in a module variable so that two files parsed in one run cannot see each
 * other's version.
 */
function validateRow(raw: unknown, index: number, schema: number): AgentOverlayV1 {
  const obj = asObject(raw, `agents[${index}]`, 'an object');
  const field = `agents[${index}]`;
  refusedKeys(obj, REFUSED_ROW_FIELDS, field);
  noUnknownKeys(obj, ROW_KEYS, field);

  const id = plainString(obj['id'], `${field}.id`, OVERLAY_LIMITS.maxIdLength);
  if (!ID_RE.test(id)) {
    fail(
      `${field}.id`,
      `${field}.id "${id}" is not a usable id. Use lower case letters, then ` +
        `letters, digits or hyphens, up to ${OVERLAY_LIMITS.maxIdLength} ` +
        `characters.`
    );
  }
  if (RESERVED_AGENT_IDS.includes(id)) {
    fail(
      `${field}.id`,
      `${field}.id cannot be "${id}". Tortie uses that name for a pane with ` +
        `no agent in it.`
    );
  }

  const row: AgentOverlayV1 = { id };
  if (obj['displayName'] !== undefined) {
    row.displayName = plainString(
      obj['displayName'],
      `${field}.displayName`,
      OVERLAY_LIMITS.maxDisplayNameLength
    );
  }
  if (obj['binaries'] !== undefined) {
    if (!Array.isArray(obj['binaries'])) fail(`${field}.binaries`, `${field}.binaries must be a list.`);
    const list = obj['binaries'] as unknown[];
    if (list.length === 0) {
      fail(`${field}.binaries`, `${field}.binaries must name at least one executable.`);
    }
    if (list.length > OVERLAY_LIMITS.maxBinaries) {
      fail(
        `${field}.binaries`,
        `${field}.binaries has more than the ${OVERLAY_LIMITS.maxBinaries} names Tortie accepts.`
      );
    }
    row.binaries = list.map((b, i) => binaryName(b, `${field}.binaries[${i}]`));
  }
  if (obj['extraProbeDirs'] !== undefined) {
    row.extraProbeDirs = pathTemplateArray(obj['extraProbeDirs'], `${field}.extraProbeDirs`);
  }
  if (obj['storeDirs'] !== undefined) {
    row.storeDirs = pathTemplateArray(obj['storeDirs'], `${field}.storeDirs`);
  }
  if (obj['launch'] !== undefined) {
    row.launch = launchField(obj['launch'], `${field}.launch`, schema);
  }
  if (obj['resume'] !== undefined) {
    row.resume = resumeField(obj['resume'], `${field}.resume`);
  }
  if (obj['versionProbe'] !== undefined) {
    row.versionProbe = versionProbeField(obj['versionProbe'], `${field}.versionProbe`);
  }
  if (obj['iconKey'] !== undefined) {
    const icon = plainString(obj['iconKey'], `${field}.iconKey`, OVERLAY_LIMITS.maxIconKeyLength);
    if (!ICON_RE.test(icon)) {
      fail(
        `${field}.iconKey`,
        `${field}.iconKey "${icon}" is not a usable icon name. Use lower case ` +
          `letters, digits and hyphens.`
      );
    }
    row.iconKey = icon;
  }
  if (obj['notes'] !== undefined) {
    row.notes = plainString(obj['notes'], `${field}.notes`, OVERLAY_LIMITS.maxNotesLength, 0);
  }

  // The one cross-field check that can be made without the registry. When the
  // row supplies both, argv[0] is the name Tortie resolves and the name tmux
  // runs, so a mismatch would launch a different program from the one the
  // confirmation named. The same check runs again after the merge, for a patch
  // that supplies only one of the two.
  const argv0 = row.launch?.argv[0];
  const bin0 = row.binaries?.[0];
  if (argv0 !== undefined && bin0 !== undefined && argv0 !== bin0) {
    fail(
      `${field}.launch.argv[0]`,
      `${field}.launch.argv[0] is "${argv0}" but binaries[0] is "${bin0}". ` +
        `They must be the same name, because that is the one Tortie resolves ` +
        `to a file on your machine.`
    );
  }

  return row;
}

/**
 * Parse and check a whole `agents.json`.
 *
 * The file itself is never "repaired". A file that is not an object, or that
 * carries a schema version this build does not read, produces no rows and one
 * problem saying so. Anything else produces the rows that passed and one
 * problem per row that did not.
 */
export function validateAgentOverlayFile(raw: unknown): AgentOverlayValidation {
  const problems: AgentOverlayProblem[] = [];
  const rows: AgentOverlayV1[] = [];
  const fileProblem = (field: string, message: string): AgentOverlayValidation => {
    problems.push({ index: -1, id: null, field, message });
    return { rows, problems };
  };

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fileProblem(
      'file',
      'agents.json must contain a JSON object with a "schema" and an "agents" list.'
    );
  }
  const obj = raw as Record<string, unknown>;

  // Phase 33 made this build read two versions rather than one. A schema 1
  // file is still a valid file and nothing about it changed. Schema 2 adds one
  // field, `launch.envPassthrough`, and a schema 1 file that carries it gets a
  // sentence naming the version instead of an unknown field error.
  const declared = obj['schema'];
  if (
    typeof declared !== 'number' ||
    !AGENT_OVERLAY_ACCEPTED_SCHEMAS.includes(declared)
  ) {
    return fileProblem(
      'schema',
      `agents.json must say "schema": ${AGENT_OVERLAY_ACCEPTED_SCHEMAS.join(
        ' or "schema": '
      )}. This build reads both.`
    );
  }

  const unknownTop = Object.keys(obj).filter((k) => k !== 'schema' && k !== 'agents');
  if (unknownTop.length > 0) {
    // Not fatal, because one typo at the top of the file should not take every
    // row with it. It is still reported, because a field Tortie ignores is a
    // field the author thought was doing something.
    problems.push({
      index: -1,
      id: null,
      field: unknownTop[0] ?? 'file',
      message:
        `agents.json has ${unknownTop.length === 1 ? 'a field' : 'fields'} ` +
        `Tortie ignores: ${unknownTop.join(', ')}.`
    });
  }

  const agents = obj['agents'];
  if (!Array.isArray(agents)) {
    return fileProblem('agents', 'agents.json must carry an "agents" list, even an empty one.');
  }
  if (agents.length > OVERLAY_LIMITS.maxRows) {
    problems.push({
      index: -1,
      id: null,
      field: 'agents',
      message:
        `agents.json lists ${agents.length} agents and Tortie reads the ` +
        `first ${OVERLAY_LIMITS.maxRows}. The rest are ignored.`
    });
  }

  const seen = new Set<string>();
  agents.slice(0, OVERLAY_LIMITS.maxRows).forEach((raw_, index) => {
    let row: AgentOverlayV1;
    try {
      row = validateRow(raw_, index, declared);
    } catch (err) {
      const id =
        typeof raw_ === 'object' && raw_ !== null && typeof (raw_ as Record<string, unknown>)['id'] === 'string'
          ? ((raw_ as Record<string, unknown>)['id'] as string)
          : null;
      if (err instanceof RowError) {
        problems.push({ index, id, field: err.field, message: err.message });
      } else {
        problems.push({
          index,
          id,
          field: `agents[${index}]`,
          message: `agents[${index}] could not be read: ${(err as Error).message}`
        });
      }
      return;
    }
    if (seen.has(row.id)) {
      problems.push({
        index,
        id: row.id,
        field: `agents[${index}].id`,
        message:
          `agents[${index}] repeats the id "${row.id}". The first one is ` +
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
export function parseAgentOverlay(text: string): AgentOverlayValidation {
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
          message: `agents.json is not valid JSON: ${(err as Error).message}`
        }
      ]
    };
  }
  return validateAgentOverlayFile(parsed);
}

// ---------------------------------------------------------------------------
// The merge
// ---------------------------------------------------------------------------

/** A compiled row, carried into the merged table with nothing changed. */
function fromRegistry(entry: AgentRegistryEntry): MergedAgentEntry {
  return { ...entry, id: entry.id, source: 'builtin', executionHash: null };
}

/**
 * What a configured agent's resume looks like when the row says nothing.
 *
 * `strategy: 'none'` is the honest answer. The session still restores its
 * directory and its scrollback. It does not claim a conversation will come
 * back, which is the failure the resume audit found twice and which costs a
 * user a conversation they thought was safe.
 */
function noResume(id: string): AgentRegistryEntry['resume'] {
  return {
    strategy: 'none',
    template: [],
    sessionStore: '',
    idCapture: { mode: 'none' },
    notes:
      `${id} was added by your agents.json and it carries no resume, so ` +
      `Tortie restores its directory and its scrollback but not its ` +
      `conversation.`
  };
}

/** The overlay's resume block, in the shape the registry uses. */
function toRegistryResume(
  resume: AgentOverlayResumeV1,
  id: string
): AgentRegistryEntry['resume'] {
  const out: AgentRegistryEntry['resume'] = {
    strategy: resume.idCapture.mode === 'none' ? 'none' : 'flag-uuid',
    template: [...resume.template],
    sessionStore: resume.sessionStore ?? '',
    idCapture:
      resume.idCapture.mode === 'pre-assign'
        ? { mode: 'pre-assign', launchFlag: [...resume.idCapture.launchFlag] }
        : resume.idCapture.mode === 'pre-assign-cmd'
          ? {
              mode: 'pre-assign-cmd',
              argv: [...resume.idCapture.argv],
              // One arm exists, so the row does not choose it. This is the
              // boundary sentence in practice: configuration selects from what
              // the compiled world already contains.
              parse: 'stdout-trim'
            }
          : { mode: 'none' },
    // Both default to true for a configured agent, and both defaults are the
    // refusing direction. Restore then never substitutes a directory, and
    // Tortie never builds a resume command that lost its id. A row that has
    // measured otherwise can say so.
    requiresOriginalCwd: resume.requiresOriginalCwd ?? true,
    bareResumeIsDangerous: resume.bareResumeIsDangerous ?? true,
    notes: `Resume for ${id} comes from your agents.json.`
  };
  if (resume.resumeExtrasPosition !== undefined) {
    out.resumeExtrasPosition = resume.resumeExtrasPosition;
  }
  return out;
}

/** A row's version probe, in the shape the registry uses. */
function toRegistryVersionProbe(
  probe: AgentOverlayVersionProbeV1
): NonNullable<AgentRegistryEntry['versionProbe']> {
  return {
    args: [...probe.args],
    ...(probe.fallbackArgs !== undefined ? { fallbackArgs: [...probe.fallbackArgs] } : {}),
    ...(probe.identitySubstring !== undefined
      ? { identitySubstring: probe.identitySubstring }
      : {}),
    ...(probe.postProcess !== undefined ? { postProcess: probe.postProcess } : {})
  };
}

/**
 * Bind the confirm gate's hash to the merged row, or leave it null.
 *
 * Null means the gate does not apply. That is the case for every compiled row,
 * and for a configured row that supplies nothing which can run.
 */
function withExecutionHash(
  entry: MergedAgentEntry,
  row: AgentOverlayV1
): MergedAgentEntry {
  if (!rowBearsExecution(row)) return { ...entry, executionHash: null };
  return { ...entry, executionHash: executionHash(entry.id, executionFieldsOf(entry)) };
}

/** A brand new agent, built from a row this build has no entry for. */
function fromRow(row: AgentOverlayV1): MergedAgentEntry {
  const binaries = row.binaries ?? [];
  const entry: MergedAgentEntry = {
    id: row.id,
    displayName: row.displayName ?? row.id,
    kind: 'cli',
    launchable: true,
    status: 'user-config',
    confidence: 'low',
    binaries: [...binaries],
    extraProbeDirs: [...(row.extraProbeDirs ?? [])],
    storeDirs: [...(row.storeDirs ?? [])],
    versionProbe:
      row.versionProbe === undefined ? null : toRegistryVersionProbe(row.versionProbe),
    launch:
      row.launch === undefined
        ? null
        : {
            argv: [...row.launch.argv],
            ...(row.launch.env !== undefined ? { env: { ...row.launch.env } } : {}),
            ...(row.launch.envPassthrough !== undefined
              ? { envPassthrough: [...row.launch.envPassthrough] }
              : {}),
            quirks: [`${row.id} was added by your agents.json.`]
          },
    resume: row.resume === undefined ? noResume(row.id) : toRegistryResume(row.resume, row.id),
    reconstructionTarget: false,
    iconKey: row.iconKey ?? row.id,
    defaultHotkeyHint: null,
    // Tortie has measured nothing about this agent. `unverified` is the
    // registry's existing word for that and the UI already knows how to say
    // it, so a configured agent reuses it rather than inventing a second
    // vocabulary.
    unverified: true,
    ...(row.notes !== undefined ? { notes: row.notes } : {}),
    source: 'config',
    executionHash: null
  };
  return withExecutionHash(entry, row);
}

/**
 * A compiled row with the fields the user supplied replacing the compiled
 * ones. A present key replaces wholesale. It never merges into the compiled
 * value, which is the same rule the settings patch follows.
 */
function patch(entry: AgentRegistryEntry, row: AgentOverlayV1): MergedAgentEntry {
  const merged: MergedAgentEntry = {
    ...entry,
    id: entry.id,
    source: 'patched',
    executionHash: null
  };
  if (row.displayName !== undefined) merged.displayName = row.displayName;
  if (row.binaries !== undefined) merged.binaries = [...row.binaries];
  if (row.extraProbeDirs !== undefined) merged.extraProbeDirs = [...row.extraProbeDirs];
  if (row.storeDirs !== undefined) merged.storeDirs = [...row.storeDirs];
  if (row.iconKey !== undefined) merged.iconKey = row.iconKey;
  if (row.notes !== undefined) merged.notes = row.notes;
  if (row.versionProbe !== undefined) {
    merged.versionProbe = toRegistryVersionProbe(row.versionProbe);
  }
  if (row.launch !== undefined) {
    merged.launch = {
      argv: [...row.launch.argv],
      ...(row.launch.env !== undefined ? { env: { ...row.launch.env } } : {}),
      // Phase 33. `launch` replaces wholesale, so a patched row that wants the
      // passthrough restates the argv and adds the names. That is the route to
      // this field for a compiled agent, and it passes the confirm gate like
      // any other execution bearing change.
      ...(row.launch.envPassthrough !== undefined
        ? { envPassthrough: [...row.launch.envPassthrough] }
        : {}),
      quirks: [
        ...(entry.launch?.quirks ?? []),
        `The launch command for ${entry.id} comes from your agents.json.`
      ]
    };
  }
  if (row.resume !== undefined) merged.resume = toRegistryResume(row.resume, entry.id);
  return withExecutionHash(merged, row);
}

/**
 * Put the user's rows over the compiled registry.
 *
 * Compiled first, then the overlay. Order in the result is the registry's own
 * order, with agents the file created appended in the order the file lists
 * them, so a configured agent never displaces a compiled one in a picker.
 *
 * Two refusals happen here rather than in the validator, because both need the
 * registry to decide.
 */
export function mergeAgentOverlay(
  rows: readonly AgentOverlayV1[],
  registry: readonly AgentRegistryEntry[] = AGENT_REGISTRY
): AgentOverlayMerge {
  const problems: AgentOverlayProblem[] = [];
  const byId = new Map<string, AgentRegistryEntry>();
  for (const entry of registry) byId.set(entry.id, entry);

  const patches = new Map<string, MergedAgentEntry>();
  const added: MergedAgentEntry[] = [];

  rows.forEach((row, index) => {
    const field = `agents[${index}]`;
    const compiled = byId.get(row.id);

    if (compiled === undefined) {
      const missing: string[] = [];
      if (row.displayName === undefined) missing.push('displayName');
      if (row.binaries === undefined || row.binaries.length === 0) missing.push('binaries');
      if (row.launch === undefined) missing.push('launch');
      if (missing.length > 0) {
        problems.push({
          index,
          id: row.id,
          field: `${field}.${missing[0] ?? 'id'}`,
          message:
            `${field} adds a new agent "${row.id}", so it needs ` +
            `${missing.join(', ')}. A row that only patches fields must use ` +
            `an id this build already ships.`
        });
        return;
      }
      added.push(fromRow(row));
      return;
    }

    if (!compiled.launchable) {
      problems.push({
        index,
        id: row.id,
        field: `${field}.id`,
        message:
          `${field} patches "${row.id}", which is an editor Tortie watches ` +
          `rather than a command it runs, so there is no launch or resume to ` +
          `configure.`
      });
      return;
    }

    const next = patch(compiled, row);
    const argv0 = next.launch?.argv[0];
    const bin0 = next.binaries[0];
    if (argv0 !== undefined && bin0 !== undefined && argv0 !== bin0) {
      problems.push({
        index,
        id: row.id,
        field: `${field}.launch.argv[0]`,
        message:
          `${field} leaves "${row.id}" with launch.argv[0] "${argv0}" and ` +
          `binaries[0] "${bin0}". They must be the same name. Set both, or ` +
          `neither.`
      });
      return;
    }
    patches.set(row.id, next);
  });

  const agents: MergedAgentEntry[] = registry.map((entry) => {
    const patched = patches.get(entry.id);
    return patched ?? fromRegistry(entry);
  });
  agents.push(...added);

  return { agents, problems };
}
