/**
 * The compiled fold recipes (Phase 138, widened in Phase 138.1).
 *
 * A recipe is the exact way Tortie asks one agent CLI a single question and
 * reads one sentence back. It is DATA in this one module, so adding an agent
 * later is adding a row and a measurement rather than writing code.
 *
 * FIVE OF ELEVEN AGENTS SHIP A RECIPE, being claude, codex, cursor, grok and
 * pi. Six do not, and each one is refused for a reason a person can read on
 * the settings page. The refusals are written out at the bottom of this file,
 * in DISABLED_REASONS, so the row that admits the truth and the reason it
 * admits sit in the same module.
 *
 * EVERY FLAG BELOW WAS MEASURED rather than read off a help page. Where a
 * flag has a number beside it, that number came from a real invocation on
 * 2026-08-23 or 2026-08-24, and a later round must not tidy the flag away.
 *
 * Bound C holds here and it is not amendable. Tortie holds no API key and
 * reaches no endpoint Tortie owns. The only path is spawning a CLI the person
 * has confirmed, as a separate one shot process.
 */

import type { FoldModelOption } from '@shared/fold';
import {
  readClaudeStream,
  readCodexJson,
  readCursorJson,
  readGrokJson,
  readPiNdjson,
  type FoldReader
} from './readers';

/**
 * How the instruction reaches the model.
 *
 * `flag` means the CLI has a system prompt flag and the recipe uses it.
 * `prepend` means it does not, or that using it costs more than it saves, so
 * the composer puts the instruction at the head of the prompt instead. grok
 * is the measured case: `--system-prompt-override` raised one fold from
 * $0.00543116 to $0.00631108, because the server's cached read fell from
 * 5,248 tokens to zero.
 */
export type FoldSystemPromptMode = 'flag' | 'prepend';

/** What a recipe is handed when it builds its argv. */
export interface FoldRecipeInput {
  prompt: string;
  model: string;
  systemPrompt: string;
  /**
   * Tortie's own directory for this fold. It is never one of your projects,
   * and see ./home.ts for why that is the whole point.
   */
  foldHome: string;
}

/** One measured way to ask one agent for one sentence. */
export interface FoldRecipe {
  /** The registry id of the agent this recipe drives. */
  agentId: string;
  /**
   * The binary to resolve, when it is not the registry id. Absent for claude,
   * whose id and binary name are the same word.
   */
  binaryName?: string;
  /**
   * The recipe's own version. It moves when the argv, the environment or the
   * system prompt moves, and it is part of every row's input hash, so a
   * verifier can tell which recipe produced which sentence.
   */
  version: number;
  /** The date the flags below were measured, as an ISO date. */
  measuredOn: string;
  /** The models Settings offers for this agent, in the order it draws them. */
  models: FoldModelOption[];
  /** The one Settings preselects. It is a suggestion and never applied alone. */
  suggestedModel: string;
  /** Whether the instruction goes on a flag or at the head of the prompt. */
  systemPromptMode: FoldSystemPromptMode;
  /**
   * Environment set on the child, on top of the login shell PATH. It is a
   * function because one recipe needs the fold's own directory in a variable.
   */
  env(input: { foldHome: string }): Readonly<Record<string, string>>;
  /**
   * The argv after the binary, with the prompt, the model and the system
   * prompt filled in. Nothing else is added at the call site.
   */
  argv(input: FoldRecipeInput): string[];
  /** How this agent's output is read. One per shape, in ./readers.ts. */
  read: FoldReader;
  /** Hard deadline for one fold. */
  timeoutMs: number;
}

/** No environment beyond the login shell PATH, which is four of the five rows. */
const NO_ENV = (): Readonly<Record<string, string>> => ({});

// ---------------------------------------------------------------------------
// claude
// ---------------------------------------------------------------------------

/**
 * The models the claude CLI exposes to `--model`, offered by both one shot
 * surfaces (the fold and, since Phase 158, the arch enrichment). One list,
 * because a model the fold can name is a model the pass can name, and the
 * measured one comes first on both.
 */
const CLAUDE_MODELS: FoldModelOption[] = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5, the one Tortie measured' },
  { id: 'haiku', label: 'Haiku, whichever is latest' },
  { id: 'sonnet', label: 'Sonnet, whichever is latest' },
  { id: 'opus', label: 'Opus, whichever is latest' }
];

/** The measured claude recipe. Gate one's lean set, plus gate two's caching flag. */
const CLAUDE_RECIPE: FoldRecipe = {
  agentId: 'claude',
  version: 1,
  measuredOn: '2026-08-23',
  models: CLAUDE_MODELS,
  suggestedModel: 'claude-haiku-4-5-20251001',
  systemPromptMode: 'flag',
  env: () => ({
    // Haiku spent 1,867 thinking tokens deciding one sentence. Turning it off
    // cut a fold from $0.012217 to $0.002882 and from 23.58 s to 2.65 s. The
    // low effort flag makes it worse and must not be reached for.
    MAX_THINKING_TOKENS: '0',
    // Every one shot process otherwise writes a fresh 9,100 token cache block
    // at the write price, and no later process reads it.
    DISABLE_PROMPT_CACHING: '1'
  }),
  argv: ({ prompt, model, systemPrompt }) => [
    '-p',
    prompt,
    '--model',
    model,
    '--system-prompt',
    systemPrompt,
    '--tools',
    '',
    '--strict-mcp-config',
    // Without this the preamble is 29,113 tokens instead of 9,092, because
    // the skills listing loads.
    '--disable-slash-commands',
    // Gate two's 515 invocations left six directories under the person's
    // ~/.claude/projects. This is what stops the fold writing into a home
    // directory on every turn.
    '--no-session-persistence',
    // A global configuration injected about 7 KB into every fold through a
    // plugin's SessionStart hook, being 2,156 of 2,687 input tokens. The two
    // flags above do not stop it. This does, and OAuth still works, which
    // --bare would break.
    '--setting-sources',
    '',
    '--output-format',
    'stream-json',
    '--verbose',
    // The cost fuse. A fold that somehow becomes expensive stops itself.
    '--max-budget-usd',
    '0.05'
  ],
  read: readClaudeStream,
  timeoutMs: 30_000
};

// ---------------------------------------------------------------------------
// codex
// ---------------------------------------------------------------------------

/**
 * The measured codex recipe.
 *
 * `--ephemeral` is the working directory rule and it is stronger than a
 * directory. Measured on 2026-08-23: a run with it left ZERO new files under
 * ~/.codex/sessions, checked with a before and after snapshot. The recipe
 * still passes `-C`, because the agent reads the directory it is pointed at
 * and Tortie's own directory is empty.
 *
 * `low` IS THE FLOOR AND IT IS NOT A PREFERENCE. `model_reasoning_effort=
 * "minimal"` returns HTTP 400 with the CLI's own words: "The following tools
 * cannot be used with reasoning.effort 'minimal': web_search." Five separate
 * attempts to remove that tool were measured and none of them worked, being
 * `-c tools.web_search=false`, `-c tools.web_search_request=false`,
 * `--disable browser_use`, `--disable apps` and `--disable computer_use`.
 *
 * codex reports token counts and NO dollar figure, so a codex fold's cost is
 * never recorded. That is the CLI's limit rather than Tortie's choice.
 */
const CODEX_RECIPE: FoldRecipe = {
  agentId: 'codex',
  version: 1,
  measuredOn: '2026-08-24',
  models: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini, the one Tortie measured' },
    { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol, which costs more and is slower' }
  ],
  suggestedModel: 'gpt-5.4-mini',
  systemPromptMode: 'prepend',
  env: NO_ENV,
  argv: ({ prompt, model, foldHome }) => [
    'exec',
    // Writes no session file at all. Measured: zero new files under
    // ~/.codex/sessions across a run.
    '--ephemeral',
    // Your own ~/.codex/config.toml would otherwise decide the model and the
    // reasoning effort. His reads gpt-5.6-sol at high effort, which is the
    // most expensive answer to a one sentence question on the machine.
    '--ignore-user-config',
    // Your own .rules files would otherwise load into every fold.
    '--ignore-rules',
    // Tortie's fold directory is not a git repository and never will be.
    '--skip-git-repo-check',
    '-s',
    'read-only',
    '-C',
    foldHome,
    '-m',
    model,
    '-c',
    'model_reasoning_effort="low"',
    '--json',
    prompt
  ],
  read: readCodexJson,
  timeoutMs: 45_000
};

// ---------------------------------------------------------------------------
// cursor
// ---------------------------------------------------------------------------

/**
 * The measured cursor recipe.
 *
 * CURSOR_CONFIG_DIR IS LOAD BEARING AND IT WAS FOUND BY BREAKING SOMETHING.
 * Measured on 2026-08-23: one run with `--model` REWROTE the person's own
 * ~/.cursor/cli-config.json, moving `selectedModel` from Composer 2.5 Fast to
 * the fold's model. Every fold would silently change the model his own
 * interactive cursor-agent starts on. Pointing the variable at Tortie's fold
 * directory fixed all of it: his config was byte identical after the run, the
 * chat transcript went to the fold directory instead of ~/.cursor/chats,
 * authentication still worked because it does not live in that directory, and
 * the input token count fell from 22,156 to 2,741. Without this variable
 * cursor would be a disabled row.
 *
 * cursor reports token counts and NO dollar figure, so a cursor fold's cost
 * is never recorded.
 *
 * WHAT THE VARIABLE DOES NOT MOVE, measured over 15 real folds on
 * 2026-08-24. cursor has TWO transcript stores and this moves one of them.
 * The chats went to the fold directory as intended and ~/.cursor/chats gained
 * nothing. `--trust` still wrote ~/.cursor/projects/<the fold directory,
 * slugified>/, and cursor wrote one agent transcript in there per fold, being
 * 16 files and 80 KB across the run. That is ONE directory, named after
 * Tortie's own fold directory rather than after anything of yours, and no
 * transcript reached a project you use. It is a stated limit rather than a
 * clean result, and it does not grow a new directory per fold.
 *
 * READ THAT AS A LIMIT AND NOT AS CONTAINMENT, because of what is inside
 * those files. One of the transcripts was opened on 2026-08-24 and it holds
 * the composed prompt in full, being the fold instruction, your redacted ask
 * and the agent's answer, word for word. So the conversation the fold sent
 * does leave Tortie's own fold directory here, at one transcript per fold.
 * It lands in a directory of cursor's rather than in a project of yours. grok
 * below has the same limit with its own numbers.
 */
const CURSOR_RECIPE: FoldRecipe = {
  agentId: 'cursor',
  binaryName: 'cursor-agent',
  version: 1,
  measuredOn: '2026-08-24',
  models: [
    { id: 'gpt-5.4-mini-none', label: 'GPT-5.4 Mini with no thinking, the one Tortie measured' },
    { id: 'gemini-3.6-flash-minimal', label: 'Gemini 3.6 Flash, the least thinking it offers' },
    { id: 'gemini-3.7-flash-low', label: 'Gemini 3.7 Flash, a little thinking' },
    { id: 'composer-2.5-fast', label: 'Composer 2.5 Fast' }
  ],
  suggestedModel: 'gpt-5.4-mini-none',
  systemPromptMode: 'prepend',
  env: ({ foldHome }) => ({ CURSOR_CONFIG_DIR: foldHome }),
  argv: ({ prompt, model, foldHome }) => [
    '-p',
    prompt,
    '--model',
    model,
    // The nearest thing cursor has to turning tools off. It is read only
    // question and answer, and there is no flag that removes the tools.
    '--mode',
    'ask',
    // Tortie's fold directory is Tortie's own, so trusting it asks nothing of
    // you. The marker it writes lands under CURSOR_CONFIG_DIR.
    '--trust',
    '--workspace',
    foldHome,
    '--output-format',
    'json'
  ],
  read: readCursorJson,
  timeoutMs: 45_000
};

// ---------------------------------------------------------------------------
// grok
// ---------------------------------------------------------------------------

/**
 * The measured grok recipe.
 *
 * `low` IS THE FLOOR HERE TOO. `--reasoning-effort none` is answered with
 * "unknown effort level 'none'; use one of: xhigh, high, medium, low", so
 * every grok fold spends some reasoning tokens and that cannot be turned off.
 *
 * THE INSTRUCTION IS PREPENDED RATHER THAN PUT ON THE FLAG, and that is a
 * measurement. `--system-prompt-override` raised one fold from $0.00543116 to
 * $0.00631108 and the input from 14,203 tokens to 18,289, because the flag
 * replaces the prompt the server has cached and the cached read fell to zero.
 *
 * grok writes ~/.grok/sessions/<the working directory, url encoded>/ and has
 * no flag that stops it, so `--cwd` is the whole working directory rule. The
 * transcripts land under Tortie's own fold directory's encoded name and never
 * under one of your projects.
 *
 * MEASURED OVER 14 REAL FOLDS on 2026-08-24: one new directory appeared,
 * named for the fold directory, and it held 220 files and 1.6 MB by the end.
 * grok also appended 1,187 lines to ~/.grok/logs/unified.jsonl, which is
 * about 85 lines per fold and which no flag and no directory rule reaches.
 * This is the least contained of the five shipped recipes and it is stated
 * here rather than hidden.
 */
const GROK_RECIPE: FoldRecipe = {
  agentId: 'grok',
  version: 1,
  measuredOn: '2026-08-24',
  models: [
    { id: 'grok-4.6', label: 'Grok 4.6, the one Tortie measured' },
    { id: 'grok-4.5', label: 'Grok 4.5, the older one' }
  ],
  suggestedModel: 'grok-4.6',
  systemPromptMode: 'prepend',
  env: NO_ENV,
  argv: ({ prompt, model, foldHome }) => [
    '-p',
    prompt,
    '--model',
    model,
    '--reasoning-effort',
    'low',
    // Three separate refusals, because grok has no single flag for it.
    '--tools',
    '',
    '--disable-web-search',
    '--no-subagents',
    '--no-plan',
    '--cwd',
    foldHome,
    // Send the prompt exactly as written, with nothing wrapped around it.
    '--verbatim',
    '--output-format',
    'json'
  ],
  read: readGrokJson,
  timeoutMs: 45_000
};

// ---------------------------------------------------------------------------
// pi
// ---------------------------------------------------------------------------

/**
 * The measured pi recipe, and it is the leanest of the five.
 *
 * pi is the only agent whose refusals are all real flags that all work.
 * Measured on 2026-08-23: one fold sent 89 input tokens and cost
 * $0.000050025 in 2.44 s. grok, the next most complete, sent 14,203 input
 * tokens for the same question and qwen sent 28,157.
 *
 * `--no-session` is the working directory rule and it is stronger than a
 * directory. Measured: zero new files under ~/.pi/agent/sessions across a
 * run, checked with a before and after snapshot.
 *
 * TORTIE DOES NOT CHOOSE PI'S MODEL, AND THAT IS DELIBERATE. pi's providers
 * and models are entirely yours: they live in your own ~/.pi/agent, and a
 * compiled list of them would be a copy of one person's configuration rather
 * than a choice the compiled world contains. So the one row Settings offers
 * runs pi on whatever you have set pi to use, and the recipe passes neither
 * `--provider` nor `--model`.
 */
const PI_MODEL_DEFAULT = 'default';

const PI_RECIPE: FoldRecipe = {
  agentId: 'pi',
  version: 1,
  measuredOn: '2026-08-24',
  models: [
    { id: PI_MODEL_DEFAULT, label: 'Whatever pi is set to use' }
  ],
  suggestedModel: PI_MODEL_DEFAULT,
  systemPromptMode: 'flag',
  env: NO_ENV,
  argv: ({ prompt, systemPrompt, model }) => [
    '-p',
    prompt,
    '--system-prompt',
    systemPrompt,
    // Every one of these is a real flag and every one of them measurably
    // removed something from the prompt.
    '--no-tools',
    '--no-session',
    '--no-extensions',
    '--no-skills',
    '--no-context-files',
    '--no-prompt-templates',
    '--thinking',
    'off',
    // No version check and no model catalogue fetch at startup.
    '--offline',
    '--mode',
    'json',
    // The one row above is the only value this can hold, and it means "leave
    // the choice to pi". A later round that adds a real model row passes it
    // through here.
    ...(model === PI_MODEL_DEFAULT ? [] : ['--model', model])
  ],
  read: readPiNdjson,
  timeoutMs: 45_000
};

// ---------------------------------------------------------------------------
// omp
// ---------------------------------------------------------------------------

/**
 * The measured omp recipe, pi's successor and nearly as lean.
 *
 * omp drops three of pi's fold flags (`--no-context-files`, `--no-prompt-
 * templates`, `--offline` are all ABSENT from omp 18.0.10 --help) and adds
 * `--no-rules`. What remains still turns off tools, the session file,
 * extensions, skills, rules and thinking. Measured on 2026-08-29 against omp
 * 18.0.10: one fold ran in 7–16 s and reported input/output token counts and a
 * `cost.total` on the `turn_end` record — the same NDJSON shape readPiNdjson
 * already consumes (`{"type":"turn_end","message":{"role":"assistant",…,
 * "usage":{…,"cost":{"total":…}}}}`). On this machine cost.total reads 0
 * because the provider is a local Foundry endpoint, but the field is present
 * and read.
 *
 * `--no-session` is the working directory rule, same guarantee as pi: nothing
 * is written under ~/.omp/agent/sessions for a fold run.
 *
 * TORTIE DOES NOT CHOOSE OMP'S MODEL, for pi's reason: omp's providers and
 * models live in your own ~/.omp/agent, and a compiled list would be a copy of
 * one person's configuration. The one row runs omp on whatever it is set to.
 */
const OMP_MODEL_DEFAULT = 'default';

const OMP_RECIPE: FoldRecipe = {
  agentId: 'omp',
  version: 1,
  measuredOn: '2026-08-29',
  models: [{ id: OMP_MODEL_DEFAULT, label: 'Whatever omp is set to use' }],
  suggestedModel: OMP_MODEL_DEFAULT,
  systemPromptMode: 'flag',
  env: NO_ENV,
  argv: ({ prompt, systemPrompt, model }) => [
    '-p',
    prompt,
    '--system-prompt',
    systemPrompt,
    // Every one of these was confirmed present in omp 18.0.10 --help.
    '--no-tools',
    '--no-session',
    '--no-extensions',
    '--no-skills',
    '--no-rules',
    '--thinking',
    'off',
    '--mode',
    'json',
    ...(model === OMP_MODEL_DEFAULT ? [] : ['--model', model])
  ],
  read: readPiNdjson,
  timeoutMs: 45_000
};

// ---------------------------------------------------------------------------
// The table, and the rows that are not in it
// ---------------------------------------------------------------------------

const RECIPES: readonly FoldRecipe[] = [
  CLAUDE_RECIPE,
  CODEX_RECIPE,
  CURSOR_RECIPE,
  GROK_RECIPE,
  PI_RECIPE,
  OMP_RECIPE
];

/**
 * WHY THE OTHER SIX AGENTS HAVE NO ROW, AND WHAT COULD NOT BE ESTABLISHED.
 *
 * The page says only "Not measured yet" and names them, because that is what
 * a person needs in order to configure this. The reasons belong here, beside
 * the table that refuses them, so a later round does not "finish off" the
 * missing rows by guessing at flags nobody ran.
 *
 * Phase 138.1 needed six things measured per agent: the one shot invocation,
 * the flags that turn tools, extra context, thinking and caching off, the
 * models worth offering, a structured output mode, a working directory rule,
 * and the median cost and wall clock over ten real folds. Each line below
 * names which of those failed on 2026-08-23 and 2026-08-24.
 *
 * - gemini. Not signed in on this Mac. The run returned HTTP 400 saying the
 *   credential was invalid, its authentication mode is set to a personal
 *   credential that is not present in the environment, and its account file
 *   records no active account. Four of the six could not be established.
 * - qwen. NO FLAG TURNS ITS TOOLS OFF. `--safe-mode` killed hooks,
 *   extensions, skills, MCP servers and QWEN.md, and the run still declared
 *   55 tools including computer_use. It also sent 28,157 input tokens for a
 *   one sentence question, and it appends to two usage logs under the home
 *   directory that no working directory rule reaches.
 * - muse. IT NEVER SAYS WHAT A RUN COST. Twenty seven event lines carried no
 *   token count and no dollar figure, so the median cost cannot be measured
 *   and a person could not be told what a fold spends. Its model list under
 *   the meta provider could not be established either.
 * - antigravity. ITS WRITE CANNOT BE CONTAINED. `agy` writes
 *   ~/.gemini/antigravity-cli/conversations/<uuid>.db with its -wal and -shm,
 *   plus a brain directory, keyed on the CONVERSATION ID rather than on the
 *   working directory, so no cwd rule reaches it and no flag stops it. One
 *   fold per turn would leave one database per sentence forever. `--mode
 *   plan` also warns that it has no effect once slash command expansion is
 *   disabled, so its tools cannot be turned off either.
 * - deepseek. `deepseek exec --help` documents no options at all, so the tool
 *   flags, the model list, the structured output mode and the cost are all
 *   unknown. Four of the six.
 * - droid. Not installed on this Mac, so nothing could be measured.
 */

// ---------------------------------------------------------------------------
// The arch enrichment rows (Phase 158)
// ---------------------------------------------------------------------------

/**
 * The arch pass reuses the SAME recipe interface and the same one shot spawn,
 * with its own rows, because the question is a different size. A fold reads
 * one sentence back under a 30 second deadline and a five cent fuse; an
 * enrichment reads a whole contract back, so its row carries its own timeout,
 * its own budget fuse and its own measured date. recipes.ts discipline is
 * absolute here too: a row exists only when the flags were run by hand, so
 * ONE agent ships an arch row and the other agents show in Settings as
 * `not-measured` disabled rows until someone measures them.
 *
 * THE CLAUDE ROW WAS MEASURED ON 2026-08-28 over the lift-sys repository
 * copy, 582 tracked files: a 15,518 byte composed prompt (the drafted
 * skeleton plus the fact block) answered in one shot in 23.05 s at
 * $0.023873, with an 8,856 byte JSON contract that passed the enrichment
 * validator whole and painted 9 of 9 map boxes. The flags are the fold's
 * measured claude set unchanged, because every one of them is about
 * containment and preamble cost rather than about the question; only the
 * deadline and the fuse moved.
 */
const ARCH_CLAUDE_RECIPE: FoldRecipe = {
  agentId: 'claude',
  version: 1,
  measuredOn: '2026-08-28',
  models: CLAUDE_MODELS,
  suggestedModel: 'claude-haiku-4-5-20251001',
  systemPromptMode: 'flag',
  env: () => ({
    // The fold's measurement carries over: thinking spent 1,867 tokens on a
    // one sentence answer, and an enrichment is judged mechanically after the
    // fact, so the thinking budget stays off here too.
    MAX_THINKING_TOKENS: '0',
    // One shot process; a cache block written at the write price would never
    // be read again.
    DISABLE_PROMPT_CACHING: '1'
  }),
  argv: ({ prompt, model, systemPrompt }) => [
    '-p',
    prompt,
    '--model',
    model,
    '--system-prompt',
    systemPrompt,
    '--tools',
    '',
    '--strict-mcp-config',
    '--disable-slash-commands',
    // Nothing under the person's home grows a session row per enrichment.
    '--no-session-persistence',
    '--setting-sources',
    '',
    '--output-format',
    'stream-json',
    '--verbose',
    // The cost fuse, twice the fold's, because the answer is a contract
    // rather than a sentence. The measured run cost well under it.
    '--max-budget-usd',
    '0.10'
  ],
  read: readClaudeStream,
  // The measured run answered in 23.05 s wall, so a fold's 30 s deadline
  // would sit one slow answer away from a spurious timeout. Two and a half
  // minutes is the deadline, not the expectation.
  timeoutMs: 150_000
};

const ARCH_RECIPES: readonly FoldRecipe[] = [ARCH_CLAUDE_RECIPE];

/** The arch enrichment recipe for an agent, or null when none is measured. */
export function archRecipeFor(agentId: string): FoldRecipe | null {
  return ARCH_RECIPES.find((recipe) => recipe.agentId === agentId) ?? null;
}

/** Every agent Tortie has a measured arch enrichment recipe for. */
export function archRecipeAgentIds(): string[] {
  return ARCH_RECIPES.map((recipe) => recipe.agentId);
}

/** The recipe for an agent, or null when Tortie has not measured one. */
export function foldRecipeFor(agentId: string): FoldRecipe | null {
  return RECIPES.find((recipe) => recipe.agentId === agentId) ?? null;
}

/** Every agent Tortie has a measured recipe for. */
export function foldRecipeAgentIds(): string[] {
  return RECIPES.map((recipe) => recipe.agentId);
}

/** Does this recipe expose that model? The membership check Settings is sanitized against. */
export function recipeHasModel(recipe: FoldRecipe, model: string): boolean {
  return recipe.models.some((option) => option.id === model);
}
