/**
 * commands.ts — the exact argument vector for every skills CLI operation.
 *
 * Pure functions over plain data, separated from the spawning in `run.ts`, for
 * one reason: **a wrong shape here exits 0 and does the wrong thing**, so a
 * passing exit code is not evidence and the shapes have to be asserted
 * directly. `__tests__/commands.test.ts` asserts the full argv of every row of
 * the command table, position by position.
 *
 * ## The three parser traps, read out of dist/cli.mjs line 5045 on 2026-08-12
 *
 * 1. **The source must come immediately after `add`.** `-s` and `-a` are
 *    variadic and greedily consume every following argument that does not begin
 *    with `-`. A source placed after either flag is swallowed as a skill name
 *    or an agent name, and the command still exits 0.
 * 2. **Never the `--flag=value` form.** The parser matches exact flag tokens
 *    only, so `--skill=foo` matches nothing, begins with `-` so it is not
 *    treated as a source either, and is silently discarded. The command then
 *    runs with a wider meaning than intended. {@link assertNoEqualsForm} fails
 *    the build of any argv that grows one.
 * 3. **`-a '*'` works for `add` and fails for `remove`.** `removeCommand` has no
 *    wildcard branch, so it reports `Invalid agents: *` and exits 1.
 *
 * A fourth thing was read out of the same file and is worth writing down,
 * because it looks like a bug in this module and is not: **`parseRemoveOptions`
 * has no `-s` branch at all** (line 6144). In `skills remove -g -y -s <name>`
 * the `-s` matches nothing and is discarded, and `<name>` is collected as a
 * positional. The command in the table works, and it works by that route. It is
 * written the way the table writes it, because the table is what the verifier
 * asserts, and this comment is here so the next reader does not "fix" it.
 *
 * ## The single-agent refusal
 *
 * An `add` with exactly one target directory makes the CLI switch from a
 * symlink to a full copy, and re-adding from the canonical path with two or
 * more targets afterwards is a silent no-op that reports success. So there is
 * no such thing as enabling a skill for exactly one agent, and this module
 * refuses to build that command rather than leaving it to a caller to remember.
 * The wildcard `*` is not one target directory: the CLI expands it to its
 * universal set, so it is allowed, and only for `add`.
 *
 * ## What is NOT here
 *
 * Listing installed skills. That is a direct filesystem read, for two measured
 * reasons: `list --json` carries neither the description the sidebar shows nor
 * the content hash the re-check needs, and it is about 120 times slower, at
 * 0.3 s against 2.3 ms. {@link listProbeCommand} exists anyway, and it is a
 * diagnostic rather than a data path — see its own note.
 */

/**
 * The operation union is DECLARED IN `src/shared/skills.ts` and re-exported
 * here. It is the only thing that decides what gets spawned: `executeSkillsPlan`
 * rebuilds the argv from it rather than trusting the plan that came back over
 * the bridge, so it has to be one declaration that both ends compile against.
 */
export type { SkillsOperation, SkillsOperationKind } from '@shared/skills';

import type { SkillsOperation, SkillsOperationKind } from '@shared/skills';

/** Thrown when a command cannot be built safely. Never caught and ignored. */
export class SkillsCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillsCommandError';
  }
}

interface OperationTraits {
  /** Hard deadline. `add` and `update` fetch from a network; the rest do not. */
  readonly timeoutMs: number;
  /** True when the operation cannot succeed without a connection. */
  readonly requiresNetwork: boolean;
  /** True when the operation writes to the user's agent directories. */
  readonly writes: boolean;
  /** What the panel calls it, in the user's words. */
  readonly label: string;
}

/**
 * Per-operation traits as data rather than branches at the call sites. The two
 * timeouts come from the failure table: 120 s for `add` and `update`, 15 s for
 * `--version` and `-l`. `remove` is local filesystem work and gets 60 s.
 */
export const OPERATION_TRAITS: Readonly<Record<SkillsOperationKind, OperationTraits>> = {
  version: { timeoutMs: 15_000, requiresNetwork: false, writes: false, label: 'check the skills CLI' },
  listProbe: { timeoutMs: 15_000, requiresNetwork: false, writes: false, label: 'check the CLI output shape' },
  enumerate: { timeoutMs: 15_000, requiresNetwork: true, writes: false, label: 'list what a source contains' },
  install: { timeoutMs: 120_000, requiresNetwork: true, writes: true, label: 'install' },
  remove: { timeoutMs: 60_000, requiresNetwork: false, writes: true, label: 'remove' },
  update: { timeoutMs: 120_000, requiresNetwork: true, writes: true, label: 'update' },
  restoreProject: { timeoutMs: 120_000, requiresNetwork: true, writes: true, label: 'restore this project’s skills' }
};

/**
 * The agent names the pinned CLI accepts, read out of it on 2026-08-12 by
 * feeding it a name it does not know and reading the list back.
 *
 * **These are not Tortie's agent ids, and the difference bites immediately.**
 * Tortie's registry calls Anthropic's agent `claude`; the CLI calls it
 * `claude-code` and rejects `claude` outright. Same for `gemini` against
 * `gemini-cli` and `qwen` against `qwen-code`.
 *
 * The mapping from a Tortie registry id to one of these belongs in the
 * registry's own per-agent context block, next to everything else that is
 * per-agent, NOT here. This list is exported so that mapping can be checked
 * against something real rather than assumed.
 *
 * It is advisory at run time. Nothing refuses a name for being absent from it,
 * because a pin bump adds agents and a stale list that blocks a user is worse
 * than one wasted spawn. The CLI stays the authority: it exits 1 and names the
 * valid set.
 */
export const SKILLS_CLI_AGENTS: readonly string[] = Object.freeze([
  'aider-desk', 'amp', 'antigravity', 'antigravity-cli', 'astrbot', 'autohand-code',
  'augment', 'bob', 'claude-code', 'openclaw', 'cline', 'codearts-agent', 'codebuddy',
  'codemaker', 'codestudio', 'codex', 'command-code', 'continue', 'cortex', 'crush',
  'cursor', 'deepagents', 'devin', 'dexto', 'droid', 'eve', 'firebender', 'forgecode',
  'gemini-cli', 'github-copilot', 'goose', 'grok', 'hermes-agent', 'inference-sh',
  'jazz', 'junie', 'iflow-cli', 'kilo', 'kimchi', 'kimi-code-cli', 'kiro-cli', 'kode',
  'lingma', 'loaf', 'mcpjam', 'minimax-code', 'mistral-vibe', 'moxby', 'mux', 'opencode',
  'openhands', 'ona', 'pi', 'qoder', 'qoder-cn', 'qwen-code', 'replit', 'reasonix',
  'rovodev', 'roo', 'tabnine-cli', 'terramind', 'tinycloud', 'trae', 'trae-cn', 'warp',
  'windsurf', 'zed', 'zcode', 'zencoder', 'zenflow', 'neovate', 'pochi', 'promptscript',
  'adal', 'universal'
]);

/** True when the pinned CLI is known to accept this agent name. Advisory. */
export function isKnownSkillsAgent(agent: string): boolean {
  return SKILLS_CLI_AGENTS.includes(agent);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * A free value is anything the user supplies: a source, a skill name, an agent
 * name. It must never begin with `-`, because the parser would read it as a
 * flag and the command would exit 0 having done something else. A newline is
 * refused too, so the command line shown in the confirm is the whole command
 * line rather than the first line of it.
 */
function assertFreeValue(label: string, value: string): void {
  if (value.length === 0) {
    throw new SkillsCommandError(`the ${label} is empty`);
  }
  if (value.startsWith('-')) {
    throw new SkillsCommandError(
      `the ${label} "${value}" begins with a dash, which the CLI would read as a flag`
    );
  }
  if (/[\n\r\0]/.test(value)) {
    throw new SkillsCommandError(`the ${label} contains a line break or a null byte`);
  }
}

/**
 * The `--flag=value` form matches nothing and is silently discarded. Applied to
 * every argv this module produces, so a later edit cannot introduce one.
 */
export function assertNoEqualsForm(argv: readonly string[]): void {
  for (const arg of argv) {
    if (/^--[^=\s]+=/.test(arg)) {
      throw new SkillsCommandError(
        `"${arg}" uses the --flag=value form, which the CLI discards silently`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The commands
// ---------------------------------------------------------------------------

/** `skills --version`. Prints a bare version string and exits 0. */
export function versionCommand(): string[] {
  return ['--version'];
}

/**
 * `skills ls -g --json`. NOT a data path. Tortie reads the installed set from
 * disk, and this exists so the shape of the CLI's only machine-readable output
 * can be checked after a pin bump, and so the "the output format changed under
 * us" row of the failure table can actually be driven. See
 * {@link parseSkillsListJson}.
 */
export function listProbeCommand(): string[] {
  return ['ls', '-g', '--json'];
}

/** `skills add <source> -l` — what a source contains, without installing it. */
export function enumerateCommand(source: string): string[] {
  assertFreeValue('source', source);
  const argv = ['add', source, '-l'];
  assertNoEqualsForm(argv);
  return argv;
}

export interface InstallRequest {
  readonly scope: 'global' | 'project';
  readonly source: string;
  readonly skills: readonly string[];
  /** Two or more agents, or the single wildcard `*`. See the header. */
  readonly agents: readonly string[];
}

/**
 * `skills add <source> [-g] -y -s <name>… -a <agent>…`
 *
 * The source is at index 1, immediately after `add`, and nothing else may go
 * there. `-s` is placed before `-a` and both are terminated by the next token
 * that begins with `-`, which is how the greedy consumption is contained.
 */
export function installCommand(request: InstallRequest): string[] {
  assertFreeValue('source', request.source);
  if (request.skills.length === 0) {
    throw new SkillsCommandError('an install needs at least one skill name');
  }
  for (const skill of request.skills) assertFreeValue('skill name', skill);

  if (request.agents.length === 0) {
    throw new SkillsCommandError('an install needs at least one agent');
  }
  const wildcards = request.agents.filter((agent) => agent === '*').length;
  if (wildcards > 0 && request.agents.length !== 1) {
    throw new SkillsCommandError('the wildcard agent cannot be combined with named agents');
  }
  if (wildcards === 0) {
    for (const agent of request.agents) assertFreeValue('agent name', agent);
    if (request.agents.length === 1) {
      throw new SkillsCommandError(
        'installing for exactly one agent is refused: with one target directory the CLI ' +
          'writes a full copy instead of a symlink, and adding the other agents afterwards ' +
          'is a silent no-op that reports success'
      );
    }
  }

  const argv = [
    'add',
    request.source,
    ...(request.scope === 'global' ? ['-g'] : []),
    '-y',
    '-s',
    ...request.skills,
    '-a',
    ...request.agents
  ];
  assertNoEqualsForm(argv);
  return argv;
}

/**
 * `skills remove [-g] -y -s <name> [-a <agent>]`
 *
 * Written exactly as the command table writes it. See the header for why the
 * `-s` is inert and the name is a positional, and why that is left alone.
 *
 * Scope is the `-g` flag plus the working directory. `-g` scans the user's
 * home; without it the CLI scans and removes under its own working directory,
 * so a project remove must also run in the project root, which `run.ts`
 * arranges from the operation's scope.
 */
export function removeCommand(
  skill: string,
  agent?: string,
  scope: 'global' | 'project' = 'global'
): string[] {
  assertFreeValue('skill name', skill);
  if (agent !== undefined) {
    if (agent === '*') {
      throw new SkillsCommandError(
        'remove has no wildcard branch: it reports "Invalid agents: *" and exits 1'
      );
    }
    assertFreeValue('agent name', agent);
  }
  const argv = [
    'remove',
    ...(scope === 'global' ? ['-g'] : []),
    '-y',
    '-s',
    skill,
    ...(agent !== undefined ? ['-a', agent] : [])
  ];
  assertNoEqualsForm(argv);
  return argv;
}

/**
 * `skills update -g -y [<name>]`
 *
 * The panel offers this as an ACTION, never as an indicator. `check` is a plain
 * alias for `update` in the dispatch switch, so there is no way to ask whether
 * an update exists without applying it. An update run also reports success for
 * skills it never checked: when at least one skill is checkable and none has an
 * update, the CLI prints "All global skills are up to date" and returns before
 * it reaches the skipped list. Tortie reads the lock itself and shows which
 * skills carry no pin, which on the operator's machine is 10 of 25.
 */
export function updateCommand(skill: string | null): string[] {
  if (skill !== null) assertFreeValue('skill name', skill);
  const argv = ['update', '-g', '-y', ...(skill !== null ? [skill] : [])];
  assertNoEqualsForm(argv);
  return argv;
}

/** `skills experimental_install` — restore a project's skills from its lock. */
export function restoreProjectCommand(): string[] {
  return ['experimental_install'];
}

/** The argv for any operation. One switch, so no caller writes its own. */
export function commandFor(operation: SkillsOperation): string[] {
  switch (operation.kind) {
    case 'version':
      return versionCommand();
    case 'listProbe':
      return listProbeCommand();
    case 'enumerate':
      return enumerateCommand(operation.source);
    case 'install':
      return installCommand(operation);
    case 'remove':
      return removeCommand(operation.skill, operation.agent, operation.scope ?? 'global');
    case 'update':
      return updateCommand(operation.skill);
    case 'restoreProject':
      return restoreProjectCommand();
  }
}

// ---------------------------------------------------------------------------
// The only two outputs that are ever parsed
// ---------------------------------------------------------------------------

/** The seven fields `skills list --json` returns. Verified by running it. */
export const LIST_JSON_FIELDS = [
  'name',
  'path',
  'scope',
  'agents',
  'source',
  'sourceUrl',
  'sourceType'
] as const;

export interface SkillsListProbe {
  /** True only when the output is an array of objects carrying name and path. */
  readonly parsed: boolean;
  readonly entries: number;
  /** Fields present on every entry, out of {@link LIST_JSON_FIELDS}. */
  readonly fields: readonly string[];
  /** Why it did not parse. Null when it did. */
  readonly problem: string | null;
}

/**
 * Parse `list --json`, and treat anything unexpected as a FAILED PROBE rather
 * than an empty list, because an empty list looks like the user has no skills
 * and that is the one wrong answer this must never give.
 */
export function parseSkillsListJson(stdout: string): SkillsListProbe {
  const fail = (problem: string): SkillsListProbe => ({
    parsed: false,
    entries: 0,
    fields: [],
    problem
  });
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch (err) {
    return fail(`the output is not JSON (${(err as Error).message})`);
  }
  if (!Array.isArray(value)) return fail('the output is JSON but not an array');
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return fail('the array holds something that is not an object');
    }
    const record = entry as Record<string, unknown>;
    if (typeof record['name'] !== 'string' || typeof record['path'] !== 'string') {
      return fail('an entry is missing name or path');
    }
  }
  const records = value as Record<string, unknown>[];
  const fields = LIST_JSON_FIELDS.filter((field) =>
    records.every((record) => record[field] !== undefined)
  );
  return { parsed: true, entries: records.length, fields, problem: null };
}
