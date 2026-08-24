/**
 * The compiled fold recipes (Phase 138).
 *
 * A recipe is the exact way Tortie asks one agent CLI a single question and
 * reads one sentence back. It is DATA in this one module, so adding an agent
 * later is adding a row and a measurement rather than writing code.
 *
 * ONLY CLAUDE SHIPS A RECIPE IN THIS PHASE, and that is a measurement rather
 * than a preference. Gate one measured this flag set over 346 real
 * invocations and gate two measured it over 500 more. Nobody has measured a
 * codex, cursor or gemini one shot recipe. Inventing one would put an
 * unmeasured argv in front of a person's own subscription, so the other rows
 * are absent and Settings says so in one sentence rather than hiding them.
 *
 * FOUR FLAGS AND ONE VARIABLE ARE LOAD BEARING. A later round must not tidy
 * any of them away, and each one has its measurement written beside it below.
 *
 * Bound C holds here and it is not amendable. Tortie holds no API key and
 * reaches no endpoint Tortie owns. The only path is spawning a CLI the person
 * has confirmed, as a separate one shot process.
 */

import type { FoldModelOption } from '@shared/fold';

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
  /** Environment set on the child, on top of the login shell PATH. */
  env: Readonly<Record<string, string>>;
  /**
   * The argv after the binary, with the prompt, the model and the system
   * prompt filled in. Nothing else is added at the call site.
   */
  argv(input: { prompt: string; model: string; systemPrompt: string }): string[];
  /** Hard deadline for one fold. The measured maximum is 13.2 s. */
  timeoutMs: number;
}

/** The measured claude recipe. Gate one's lean set, plus gate two's caching flag. */
const CLAUDE_RECIPE: FoldRecipe = {
  agentId: 'claude',
  version: 1,
  measuredOn: '2026-08-23',
  models: [
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5, the one Tortie measured' },
    { id: 'haiku', label: 'Haiku, whichever is latest' },
    { id: 'sonnet', label: 'Sonnet, whichever is latest' },
    { id: 'opus', label: 'Opus, whichever is latest' }
  ],
  suggestedModel: 'claude-haiku-4-5-20251001',
  env: {
    // Haiku spent 1,867 thinking tokens deciding one sentence. Turning it off
    // cut a fold from $0.012217 to $0.002882 and from 23.58 s to 2.65 s. The
    // low effort flag makes it worse and must not be reached for.
    MAX_THINKING_TOKENS: '0',
    // Every one shot process otherwise writes a fresh 9,100 token cache block
    // at the write price, and no later process reads it.
    DISABLE_PROMPT_CACHING: '1'
  },
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
  timeoutMs: 30_000
};

const RECIPES: readonly FoldRecipe[] = [CLAUDE_RECIPE];

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
