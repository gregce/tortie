/**
 * `AgentOverlayV1` — the one type a user's `agents.json` may contain.
 *
 * Phase 23, from docs/research/31-extensions.md sections 6 and 7. The verdict
 * that research reached is one line, and this file is where it is enforced in
 * the type system.
 *
 *   > Tortie never loads third party code into any of its processes.
 *   > Configuration selects from choices the compiled world already contains,
 *   > or names an executable the user has personally confirmed.
 *
 * ## This is NOT the registry type, and that is the point
 *
 * `AgentRegistryEntry` (src/main/agents/registry.ts) carries 23 fields, several
 * of which are Tortie's own honesty vocabulary about work Tortie has done:
 * `status`, `confidence`, `unverified`, `reconstructionTarget`, `specstory`.
 * None of them mean anything when a user writes them, so none of them are
 * here. `kind` is always `'cli'` and `launchable` is always `true` for a
 * configured agent, so neither is a field either.
 *
 * Research 31 section 6.6 gives the reason and it is bb's lesson: bb froze 65
 * component prop types into a public contract and had to delete it the next
 * day. A hand written narrow type is free to stay still while the internal one
 * moves. Re-exporting the internal type would make every future registry edit
 * a change to a file users author by hand.
 *
 * ## What a row may say
 *
 * Launch and resume, and the small amount of naming that makes a launched
 * agent legible. Nothing else. Everything that is absent takes the compiled
 * default, and a facet Tortie has no compiled implementation for is refused by
 * name rather than accepted and ignored.
 *
 * ## Execution bearing fields and the confirm gate
 *
 * Seven of these fields can cause a program to run, and they are listed once in
 * `EXECUTION_BEARING_FIELDS`. `rowBearsExecution` says whether a row supplies
 * any of them, which is what decides whether the confirm gate applies to that
 * row at all. The hash itself belongs to src/main/config/confirm.ts, which owns
 * the algorithm, the sentence the person reads and the seal. Change one of
 * those fields and the hash changes, so Tortie asks again. Change a
 * presentation field and it does not.
 *
 * The reason the gate exists is written down in docs/BACKLOG.md so a later
 * round does not remove it for convenience. Every product that trusts a
 * configuration file has a human as the only routine writer of it. Tortie runs
 * many agent processes at once under one user account, several of them
 * deliberately launchable with their safeguards off, all with write access to
 * the home directory. A configuration directory Tortie reads and an agent can
 * write is an increase in privilege rather than a convenience.
 *
 * ## Purity
 *
 * This module is pure data and pure functions. It imports nothing, because it
 * is compiled into the renderer as well as main. The hash itself is taken in
 * main, where `node:crypto` is available.
 */

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

/** The only schema version this build reads. */
export const AGENT_OVERLAY_SCHEMA_VERSION = 1;

/** The file a user writes, inside the configuration directory. */
export const AGENT_OVERLAY_FILENAME = 'agents.json';

/** The generated JSON Schema Tortie writes next to it. */
export const AGENT_OVERLAY_SCHEMA_FILENAME = 'agents.schema.json';

/**
 * The slot the conversation id replaces in a resume template.
 *
 * The registry owns the same literal as `SESSION_ID_SLOT`. It cannot be
 * imported here, because src/shared is compiled into the renderer and the
 * registry is main-only code. The two are held equal by a test
 * (src/main/config/__tests__/overlay.test.ts), which is the same single source
 * discipline the keymap and the canvas colours already use.
 */
export const AGENT_SESSION_ID_SLOT = '<sessionId>';

/**
 * A whole `agents.json`.
 *
 * A new field is `schema: 2` with a converter, never an appended block on
 * version 1. Research 31 section 6.6 asks for that rule before the first
 * appended block rather than after the thirty fifth.
 */
export interface AgentOverlayFileV1 {
  schema: 1;
  agents: AgentOverlayV1[];
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

/**
 * One agent, either new to this build or a patch of one it already ships.
 *
 * Every field except `id` is optional, and the two cases differ in what the
 * merge then requires. A row whose id the build has never heard of creates an
 * agent, so it must carry `displayName`, `binaries` and `launch`. A row whose
 * id is already in the registry patches it, so it may carry any subset. A
 * present key replaces the compiled value wholesale. It never merges into it,
 * which is the same rule the settings patch already follows.
 */
export interface AgentOverlayV1 {
  /**
   * Lower case, starts with a letter, then letters, digits and hyphens. Up to
   * 32 characters. `shell` is reserved, because Tortie uses it for a pane with
   * no agent in it.
   */
  id: string;
  /** What the user sees. Required when the row creates an agent. */
  displayName?: string;
  /**
   * Candidate executables, most canonical first. Execution bearing.
   *
   * A bare name is resolved against the captured login shell PATH and the
   * probe directories, which is how every compiled agent is found. A path is
   * taken verbatim, and it must be absolute or start with `~/`. A relative
   * path is refused, because it would resolve against whatever directory the
   * process happened to be in.
   */
  binaries?: string[];
  /**
   * Extra directories to look in for the binary, beyond the login shell PATH.
   * Execution bearing, because it decides which file is found. `~/` and
   * `$VAR` are expanded, and one `*` path segment is globbed.
   */
  extraProbeDirs?: string[];
  /**
   * Where this agent keeps its own session files. Tortie reads these to tell
   * whether the agent is installed and in use. It never writes them.
   */
  storeDirs?: string[];
  /** How the agent starts. Execution bearing. */
  launch?: AgentOverlayLaunchV1;
  /**
   * How a conversation comes back. Execution bearing.
   *
   * Absent means this agent has no resume that Tortie can drive. The session
   * still restores its directory and its scrollback, and Tortie says so rather
   * than implying a conversation will return.
   */
  resume?: AgentOverlayResumeV1;
  /**
   * How to ask the binary who it is. Execution bearing, because it runs the
   * binary as a subprocess.
   */
  versionProbe?: AgentOverlayVersionProbeV1;
  /**
   * Which shipped icon to draw. An unknown key draws the terminal glyph, which
   * is the same honest fallback a shell pane gets. Configuration cannot supply
   * an image, a path or any markup.
   */
  iconKey?: string;
  /** A line for the author's own benefit. Tortie only ever displays it. */
  notes?: string;
}

export interface AgentOverlayLaunchV1 {
  /**
   * The command line. `argv[0]` must be the first entry of `binaries`, because
   * that is the name Tortie resolves and the name tmux runs.
   *
   * It must not contain the `<sessionId>` slot. The registry keeps launch argv
   * slot free so that nothing can ever launch a literal `--session-id
   * '<sessionId>'`, and a configured row is held to the same rule.
   */
  argv: string[];
  /**
   * Environment values for the launched pane only.
   *
   * A short denylist is refused by name. See `ENV_REFUSED_EXACT` and
   * `ENV_REFUSED_PATTERNS` for the list and the reason for each entry.
   */
  env?: Record<string, string>;
}

export interface AgentOverlayResumeV1 {
  /**
   * The arguments that resume a conversation. Exactly one entry must be the
   * `<sessionId>` slot.
   *
   * An argv that loses its id is worse than one that fails. Gemini's bare
   * `--resume` silently attaches to the most recent conversation, so Tortie
   * refuses to build an argv the id did not reach.
   */
  template: string[];
  /** Where the agent writes this conversation. Display only. */
  sessionStore?: string;
  /** How Tortie gets the id that goes in the template. */
  idCapture: AgentOverlayIdCaptureV1;
  /**
   * True when resume only finds the conversation from the directory the
   * session started in. Defaults to true for a configured agent, because
   * refusing to substitute a directory loses nothing and substituting one can
   * open an empty session that looks resumed.
   */
  requiresOriginalCwd?: boolean;
  /**
   * True when a resume that loses its id attaches to the wrong conversation
   * instead of failing. Defaults to true for a configured agent, for the same
   * reason.
   */
  bareResumeIsDangerous?: boolean;
  /**
   * Where the original launch flags go in the resume command. `trailing` is
   * the default and is what a flag style resume takes. `leading` is for a CLI
   * whose options must come before its subcommand.
   *
   * The name is the registry's own, so the two tables read the same way.
   */
  resumeExtrasPosition?: 'leading' | 'trailing';
}

/**
 * How the conversation id in the template is obtained.
 *
 * This is a closed set over routes Tortie has compiled in. Two of the
 * registry's five arms are deliberately missing.
 *
 * `harvest` is missing because reading an agent's own session store needs a
 * reader written for that store's format, and those readers are a compiled
 * table keyed by agent id. A configured row selecting `harvest` would wait for
 * an id that can never arrive.
 *
 * `unverified` is missing because it is Tortie's own note about work Tortie
 * has not done. A user has nothing to say with it.
 */
export type AgentOverlayIdCaptureV1 =
  /**
   * Tortie makes the id before the agent starts and passes it on the launch
   * command line, e.g. `['--session-id']`. This is the strongest route and the
   * one to prefer whenever the CLI offers it.
   */
  | { mode: 'pre-assign'; launchFlag: string[] }
  /**
   * Tortie runs the same binary with these arguments and takes the id from the
   * last line of its output. The binary is the one already confirmed, so this
   * cannot name a different program.
   */
  | { mode: 'pre-assign-cmd'; argv: string[] }
  /** There is no id to capture, so there is nothing to resume. */
  | { mode: 'none' };

export interface AgentOverlayVersionProbeV1 {
  /** Arguments that make the binary print its version, e.g. `['--version']`. */
  args: string[];
  /**
   * A second attempt when the first one errors. Codex answers `--version` with
   * an error and `-V` with a version, and a compiled row already carries that,
   * so a configured row can say it too.
   */
  fallbackArgs?: string[];
  /**
   * The output must contain this text for the binary to count as this agent.
   * It is how Tortie tells a different program of the same name apart from the
   * one the row means.
   */
  identitySubstring?: string;
  /** How to distill the version from the output. Defaults to `first-line`. */
  postProcess?: 'first-line' | 'strip-ansi-last-line';
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

/**
 * One reason one row was dropped, or one reason the file was not read.
 *
 * A row is dropped whole. It is never partially merged, never silently
 * dropped, and never a crash. The message names the field and the reason in
 * one sentence, because it is shown to a person who is looking at their own
 * file and wants to know which line to change.
 */
export interface AgentOverlayProblem {
  /** Index of the row in the file's `agents` array. -1 for the file itself. */
  index: number;
  /** The row's id when it could be read, null when it could not. */
  id: string | null;
  /** The field, in dotted form, e.g. `launch.argv[0]`. */
  field: string;
  /** One sentence naming the field and the reason. */
  message: string;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/**
 * Bounds on every list and every string.
 *
 * These are not defensive decoration. The values here reach an argv, an
 * environment and a subprocess, and the settings sanitiser already learned
 * that a hand edited file asking for fifty million scrollback lines has to be
 * caught before the value is handed on rather than after.
 */
export const OVERLAY_LIMITS = {
  maxRows: 32,
  maxFileBytes: 262_144,
  maxIdLength: 32,
  maxDisplayNameLength: 64,
  maxBinaries: 8,
  maxBinaryLength: 256,
  maxDirs: 16,
  maxDirLength: 512,
  maxArgv: 32,
  maxArgLength: 512,
  maxEnvKeys: 16,
  maxEnvKeyLength: 64,
  maxEnvValueLength: 1024,
  maxTemplate: 16,
  maxProbeArgs: 8,
  maxNotesLength: 512,
  maxIconKeyLength: 32,
  maxSessionStoreLength: 512
} as const;

/** Lower case, starts with a letter, then letters, digits and hyphens. */
export const OVERLAY_ID_PATTERN = '^[a-z][a-z0-9-]{0,31}$';

/** Same shape as an id, and used for the icon key. */
export const OVERLAY_ICON_KEY_PATTERN = '^[a-z][a-z0-9-]{0,31}$';

/** A bare executable name, as opposed to a path. */
export const OVERLAY_BARE_BINARY_PATTERN = '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$';

/** An environment variable name. */
export const OVERLAY_ENV_KEY_PATTERN = '^[A-Za-z_][A-Za-z0-9_]{0,63}$';

/**
 * Ids configuration may not use.
 *
 * `shell` is what Tortie calls a pane with no agent in it, and it is a value
 * `Session.agent` already carries, so a configured agent of that name would be
 * indistinguishable from one.
 */
export const RESERVED_AGENT_IDS: readonly string[] = ['shell'];

/**
 * Environment names a row may not set, by exact match.
 *
 * Each one turns "run this program" into "run this program after something
 * else has already run", or lets a pane claim an identity that is not its own.
 *
 *  - `PATH` decides which file the name resolves to, which would undo the
 *    confirmation the user gave on the binary.
 *  - `SHELL`, `BASH_ENV`, `ENV` and `ZDOTDIR` name a file a shell reads before
 *    it runs anything.
 *  - `NODE_OPTIONS` and `ELECTRON_RUN_AS_NODE` change what a Node or Electron
 *    binary does before it reaches its own entry point.
 *  - `TMUX`, `TMUX_PANE` and `TMUX_TMPDIR` are how tmux is addressed. Research
 *    31 section 6.3 rule 7 says configuration never names a tmux session, a
 *    socket or a pane.
 */
export const ENV_REFUSED_EXACT: readonly string[] = [
  'PATH',
  'SHELL',
  'BASH_ENV',
  'ENV',
  'ZDOTDIR',
  'NODE_OPTIONS',
  'ELECTRON_RUN_AS_NODE',
  'TMUX',
  'TMUX_PANE',
  'TMUX_TMPDIR'
];

/**
 * Environment names a row may not set, matched by prefix, each with the reason
 * a person is given when their row is dropped.
 *
 * The pane stamp is the one that matters most. `GMUX_SESSION_ID` and
 * `GMUX_MANAGED` are how Tortie knows which live sessions are its own, and a
 * pane carrying another pane's stamp is a session claiming an identity that is
 * not its. Identity is what the whole durability layer is built on, so it is
 * refused here rather than checked for later.
 *
 * They are regular expressions rather than plain strings because the reason is
 * per prefix and reads better attached to it. The prefixes themselves are
 * identifiers Tortie's live data is bound to, and CLAUDE.md carries the list.
 */
export const ENV_REFUSED_PATTERNS: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /^DYLD_/, why: 'it decides which libraries load into a process' },
  { pattern: /^LD_/, why: 'it decides which libraries load into a process' },
  {
    pattern: /^GMUX_/,
    why: 'it is how Tortie recognises the panes it owns, and a pane carrying another session’s stamp is a session claiming an identity that is not its own'
  },
  { pattern: /^TORTIE_/, why: 'it is reserved for Tortie itself' }
];

/**
 * The same prefixes as plain text, for the guide and for the tests that hold
 * the guide to this list.
 *
 * Derived rather than written out, so there is one list and a prefix cannot be
 * documented that the loader does not refuse.
 */
export const ENV_REFUSED_PREFIXES: readonly string[] = ENV_REFUSED_PATTERNS.map(
  (p) => p.pattern.source.replace(/^\^/, '')
);

// ---------------------------------------------------------------------------
// Fields this version does not read, and why
// ---------------------------------------------------------------------------

/**
 * Registry fields a person may reasonably expect to set, and the sentence
 * Tortie says instead of "unknown field".
 *
 * The smallest useful version of this door is launch and resume. Everything
 * else the registry carries is either Tortie's own record of what Tortie has
 * measured, or a facet with a compiled default that works. A row that names one
 * of these is dropped whole like any other invalid row, and the message says
 * which it is rather than implying a spelling mistake.
 *
 * `flagPresets` is the one refusal here that is about safety rather than about
 * scope. A preset can turn an agent's safeguards off, and the presets are also
 * the allowlist the settings sanitiser checks a stored launch default against.
 * A configuration file that could add one would be a way to introduce a danger
 * flag without the sealed acknowledgement the Settings window requires, which
 * is precisely the control the danger seal exists to enforce.
 */
export const REFUSED_ROW_FIELDS: Readonly<Record<string, string>> = {
  flagPresets:
    'Tortie does not take launch flag presets from configuration. A preset can ' +
    'turn an agent safeguard off, and the presets are also the list Tortie ' +
    'checks a saved launch default against, so they stay compiled in. Add ' +
    'flags to a single session when you create it.',
  imageDrop:
    'Tortie does not read imageDrop from configuration in this version. Your ' +
    'agent gets the default, which inserts the file path into the prompt.',
  multilineKey:
    'Tortie does not read multilineKey from configuration in this version. ' +
    'Your agent gets a line feed on Shift and Enter, which is what every ' +
    'agent measured so far takes.',
  activity:
    'Tortie does not read activity from configuration in this version. Live ' +
    'status runs for every session regardless of the agent.',
  specstory:
    'Tortie does not read specstory from configuration. Which agents SpecStory ' +
    'can capture is decided by the installed SpecStory, not by this file.',
  defaultHotkeyHint:
    'Tortie does not read defaultHotkeyHint from configuration. Set the ' +
    'shortcut for an agent in Settings.',
  kind: 'Tortie does not read kind from configuration. Every configured agent is a command Tortie runs in a pane.',
  launchable:
    'Tortie does not read launchable from configuration. A row that carries a ' +
    'launch command is launchable once you have confirmed it.',
  status:
    'Tortie does not read status from configuration. It is Tortie’s own ' +
    'note about where a compiled agent came from.',
  confidence:
    'Tortie does not read confidence from configuration. It is Tortie’s ' +
    'own note about what Tortie has measured.',
  unverified:
    'Tortie does not read unverified from configuration. A configured agent is ' +
    'always shown as unverified, because Tortie has measured nothing about it.',
  reconstructionTarget:
    'Tortie does not read reconstructionTarget from configuration.'
};

/** The same, for the fields inside a `resume` block. */
export const REFUSED_RESUME_FIELDS: Readonly<Record<string, string>> = {
  strategy:
    'Tortie works the resume strategy out from idCapture, so the row does not ' +
    'set it. Give a template and an idCapture and the strategy follows.',
  notes: 'Put the note on the agent row instead. There is one notes field per agent.'
};

// ---------------------------------------------------------------------------
// The execution bearing subset
// ---------------------------------------------------------------------------

/**
 * The fields that can cause a program to run, named once.
 *
 * Research 31 section 6.2 clause (b) lists `binaries`, `launch.argv`,
 * `resume.template`, `versionProbe`, `launch.env` and `idCapture.argv`. Two
 * changes were made when this was built against the tree as it is.
 *
 * `extraProbeDirs` was added, because it decides which file a bare binary name
 * resolves to. A row that names `claude` and adds a probe directory it
 * controls has chosen the program as surely as one that gives a path.
 *
 * The whole of `resume.idCapture` is covered rather than only its `argv` arm,
 * because `pre-assign`'s `launchFlag` reaches the launch command line too.
 *
 * `storeDirs` is deliberately not here. Tortie reads those paths to see
 * whether they exist. It never runs anything from them.
 */
export const EXECUTION_BEARING_FIELDS: readonly string[] = [
  'binaries',
  'extraProbeDirs',
  'launch.argv',
  'launch.env',
  'versionProbe',
  'resume.template',
  'resume.idCapture'
];

/**
 * True when this row supplies at least one field that can start a program.
 *
 * This decides whether the confirm gate applies to the row at all, and it is
 * asked of the ROW rather than of the merged result. A row that only renames a
 * compiled agent supplies nothing that runs, so it must not arm the gate. If it
 * did, renaming Claude Code would stop Claude Code launching until the user
 * confirmed a command line they never wrote.
 *
 * The hash itself is not taken here. src/main/config/confirm.ts owns the hash,
 * the algorithm name and the seal, and there is exactly one of each.
 */
export function rowBearsExecution(row: AgentOverlayV1): boolean {
  return (
    row.binaries !== undefined ||
    row.extraProbeDirs !== undefined ||
    row.launch !== undefined ||
    row.versionProbe !== undefined ||
    row.resume !== undefined
  );
}

// ---------------------------------------------------------------------------
// The generated JSON Schema
// ---------------------------------------------------------------------------

/**
 * The JSON Schema for `agents.json`, as one object.
 *
 * It is written here, next to the type and the limits it describes, and
 * `resources/config/agents.schema.json` is emitted from it. A test compares
 * the file on disk with this constant and fails when they differ, so the
 * shipped schema cannot drift from the build that reads it. Another test runs
 * every worked example through both this schema and the real loader, because a
 * worked example that does not load is a defect.
 *
 * The schema and the loader do not agree everywhere, and the three places they
 * differ are deliberate.
 *
 * The schema is weaker in two of them. It cannot express "argv[0] equals
 * binaries[0]" and it cannot express the environment denylist, so a file can
 * pass the schema and still have a row dropped. Both are checked in
 * src/main/config/overlay.ts and reported as ordinary dropped rows.
 *
 * The schema is stricter in the third. A file with more than 32 rows fails the
 * schema outright, while the loader reads the first 32 and says it ignored the
 * rest. Losing 32 working agents over a 33rd is not a trade the loader should
 * make on a user's behalf.
 *
 * The schema exists so an authoring agent gets the shape right on the first
 * try. It does not replace the loader and it never decides what runs.
 */
export const AGENT_OVERLAY_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://tortie.app/schema/agents-v1.json',
  title: 'Tortie agents.json (schema 1)',
  description:
    'Agents Tortie can launch, added or patched by the user. Tortie never ' +
    'loads code from this file. Fields that can cause a program to run need ' +
    'a confirmation from you before Tortie will launch the agent.',
  type: 'object',
  additionalProperties: false,
  required: ['schema', 'agents'],
  properties: {
    schema: { const: 1 },
    agents: {
      type: 'array',
      maxItems: OVERLAY_LIMITS.maxRows,
      items: { $ref: '#/$defs/agent' }
    }
  },
  $defs: {
    agent: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          pattern: OVERLAY_ID_PATTERN,
          not: { enum: [...RESERVED_AGENT_IDS] },
          description:
            'Unique id. A new id adds an agent and then displayName, ' +
            'binaries and launch are required. An id this build already ' +
            'ships patches that agent instead.'
        },
        displayName: {
          type: 'string',
          minLength: 1,
          maxLength: OVERLAY_LIMITS.maxDisplayNameLength
        },
        binaries: {
          type: 'array',
          minItems: 1,
          maxItems: OVERLAY_LIMITS.maxBinaries,
          items: {
            type: 'string',
            minLength: 1,
            maxLength: OVERLAY_LIMITS.maxBinaryLength
          },
          description:
            'Executable names, most canonical first. A bare name is looked ' +
            'up on your login shell PATH. A path must be absolute or start ' +
            'with ~/. Execution bearing.'
        },
        extraProbeDirs: {
          type: 'array',
          maxItems: OVERLAY_LIMITS.maxDirs,
          items: { $ref: '#/$defs/pathTemplate' },
          description: 'Extra directories to look in for the binary. Execution bearing.'
        },
        storeDirs: {
          type: 'array',
          maxItems: OVERLAY_LIMITS.maxDirs,
          items: { $ref: '#/$defs/pathTemplate' },
          description: 'Where this agent keeps its own session files. Read only.'
        },
        launch: { $ref: '#/$defs/launch' },
        resume: { $ref: '#/$defs/resume' },
        versionProbe: { $ref: '#/$defs/versionProbe' },
        iconKey: {
          type: 'string',
          pattern: OVERLAY_ICON_KEY_PATTERN,
          maxLength: OVERLAY_LIMITS.maxIconKeyLength,
          description:
            'One of the icons this build ships. An unknown key draws the ' +
            'terminal glyph. Configuration cannot supply an image.'
        },
        notes: { type: 'string', maxLength: OVERLAY_LIMITS.maxNotesLength }
      }
    },
    pathTemplate: {
      type: 'string',
      minLength: 1,
      maxLength: OVERLAY_LIMITS.maxDirLength
    },
    launch: {
      type: 'object',
      additionalProperties: false,
      required: ['argv'],
      properties: {
        argv: {
          type: 'array',
          minItems: 1,
          maxItems: OVERLAY_LIMITS.maxArgv,
          items: { $ref: '#/$defs/arg' },
          description:
            'The command line. argv[0] must be the first entry of binaries. ' +
            'It must not contain <sessionId>. Execution bearing.'
        },
        env: {
          type: 'object',
          maxProperties: OVERLAY_LIMITS.maxEnvKeys,
          propertyNames: { pattern: OVERLAY_ENV_KEY_PATTERN },
          additionalProperties: {
            type: 'string',
            maxLength: OVERLAY_LIMITS.maxEnvValueLength
          },
          description:
            'Environment for this pane only. Names that decide which code ' +
            'runs, and the names Tortie uses to identify its own panes, are ' +
            'refused. Execution bearing.'
        }
      }
    },
    resume: {
      type: 'object',
      additionalProperties: false,
      required: ['template', 'idCapture'],
      properties: {
        template: {
          type: 'array',
          minItems: 1,
          maxItems: OVERLAY_LIMITS.maxTemplate,
          items: { $ref: '#/$defs/arg' },
          description:
            'Arguments that resume a conversation. Exactly one entry must be ' +
            'the string <sessionId>. Execution bearing.'
        },
        sessionStore: {
          type: 'string',
          maxLength: OVERLAY_LIMITS.maxSessionStoreLength
        },
        idCapture: { $ref: '#/$defs/idCapture' },
        requiresOriginalCwd: { type: 'boolean' },
        bareResumeIsDangerous: { type: 'boolean' },
        resumeExtrasPosition: { enum: ['leading', 'trailing'] }
      }
    },
    idCapture: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'launchFlag'],
          properties: {
            mode: { const: 'pre-assign' },
            launchFlag: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              items: { $ref: '#/$defs/arg' }
            }
          }
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'argv'],
          properties: {
            mode: { const: 'pre-assign-cmd' },
            argv: {
              type: 'array',
              minItems: 1,
              maxItems: OVERLAY_LIMITS.maxArgv,
              items: { $ref: '#/$defs/arg' }
            }
          }
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode'],
          properties: { mode: { const: 'none' } }
        }
      ],
      description:
        'How Tortie gets the conversation id. harvest is not offered, ' +
        'because reading an agent store needs a reader compiled into Tortie.'
    },
    versionProbe: {
      type: 'object',
      additionalProperties: false,
      required: ['args'],
      properties: {
        args: {
          type: 'array',
          maxItems: OVERLAY_LIMITS.maxProbeArgs,
          items: { $ref: '#/$defs/arg' }
        },
        fallbackArgs: {
          type: 'array',
          maxItems: OVERLAY_LIMITS.maxProbeArgs,
          items: { $ref: '#/$defs/arg' }
        },
        identitySubstring: { type: 'string', minLength: 1, maxLength: 128 },
        postProcess: { enum: ['first-line', 'strip-ansi-last-line'] }
      },
      description: 'Runs the binary to read its version. Execution bearing.'
    },
    arg: {
      type: 'string',
      maxLength: OVERLAY_LIMITS.maxArgLength
    }
  }
} as const;
