/**
 * The Context view's object model (Phase 22 — research 29 §4 and §12).
 *
 * The agent registry answers how a session STARTS. Nothing in Tortie answered
 * what a session can DO once it starts, because that lives in sidecar
 * configuration on disk. These are the types for reading it.
 *
 * Three rules are baked into the shapes here, and each one exists because the
 * research measured something that a simpler shape would have made impossible
 * to say honestly:
 *
 *  1. **Precedence is per agent AND per category, and it inverts.** In Claude
 *     Code a project `settings.json` beats your personal one, while your
 *     personal `~/.claude/skills/deploy` beats the repo's
 *     `.claude/skills/deploy`. Research 29 §2.9 counted seven mutually
 *     incompatible models across twelve agents. So every entry carries the
 *     `resolution` it got and the `model` that produced it, and one of the
 *     legal answers is `'unknown'`.
 *  2. **A row is a THING, not a directory entry.** One `SKILL.md` is reachable
 *     from up to nine agent directories through symlinks (§2.2). Rows are
 *     deduplicated by real path, and `agents` is the set of registry agents
 *     that will actually load the winner.
 *  3. **No value that could be a credential ever reaches this model.** MCP
 *     `env` blocks carry live provider keys on the operator's own machine
 *     (§2.6). The reader returns env KEYS and never env VALUES, and every
 *     free-text field it does return is masked on the way out. There is no
 *     reveal affordance anywhere, because the model does not carry the value.
 *
 * Append-only during parallel work. Consumed by src/main/context/** (the
 * reader), the `context:*` IPC registrar, and the renderer view.
 */

import type { AgentRegistryId } from './types';

// ---------------------------------------------------------------------------
// Categories, scopes, states
// ---------------------------------------------------------------------------

/**
 * The five sections of the view. `TOOLS` is refused (§13.3).
 *
 * Declared once, in `context-snapshot.ts`, and re-exported here. Both files
 * needed the union and both wrote it during the parallel build; two copies is
 * how a sixth category added in one file compiles cleanly and drops rows in
 * the other. The snapshot file keeps the declaration because it is the one
 * whose records are persisted and version-checked.
 */
export { CONTEXT_CATEGORIES, isContextCategory } from './context-snapshot';
export type { ContextCategory } from './context-snapshot';

import type { ContextCategory } from './context-snapshot';

/**
 * Where a thing comes from. These map one-to-one onto the group rows in
 * §5.6, and the split between `project` and `project-local` is load bearing:
 * `claude mcp add` defaults to LOCAL scope, which lives in the user's home
 * directory and is invisible to the rest of the team. Folding the two together
 * would tell someone their server is shared when it is not.
 */
export type ContextScope =
  /** Enterprise policy. Shown, never edited. */
  | 'managed'
  /** Committed to the repo: `.claude/skills`, `.mcp.json`, `.claude/settings.json`. */
  | 'project'
  /** In the repo's scope but not shared: `settings.local.json`, MCP local scope. */
  | 'project-local'
  /** Every project: `~/.claude/**`, `~/.agents/**`, `~/.claude.json` top level. */
  | 'global'
  /** Contributed by an installed plugin, namespaced by it. */
  | 'plugin'
  /** Shipped by the vendor: `~/.cursor/skills-cursor`, `~/.codex/skills/.system`. */
  | 'bundled';

/** Group label per scope, for §5.6. Kept next to the union so they cannot drift. */
export const CONTEXT_SCOPE_LABEL: Readonly<Record<ContextScope, string>> = {
  managed: 'Managed',
  project: 'This project',
  'project-local': 'This project, only you',
  global: 'All your projects',
  plugin: 'From plugins',
  bundled: 'Bundled'
};

/** Row state, driving the state marks in the right lane of a row (§5.5). */
export type ContextState =
  | 'active'
  | 'disabled'
  | 'shadowing'
  | 'shadowed'
  | 'broken'
  | 'managed';

/**
 * What happened when two definitions carried the same name.
 *
 * `wins` and `merges` are the two words §6.4 fixes and forbids swapping:
 * a skill WINS, four hooks ALSO RUN. `coexists` is Codex, which resolves
 * nothing on purpose and offers the user both. `unknown` is the honest answer
 * where Tortie found a collision and the agent's own rule was never verified.
 */
export type ContextResolution = 'only' | 'wins' | 'merges' | 'coexists' | 'unknown';

/**
 * The precedence model an agent applies to one category. Research 29 §2.9
 * names seven; `merge-all` and `unknown` are the two that are not a model so
 * much as the absence of one.
 */
export type ContextPrecedenceModel =
  /** Model B. Claude Code skills: enterprise > personal > project > bundled. */
  | 'broadest-wins'
  /** Model A. The IDE-settings intuition: project beats user. */
  | 'narrowest-wins'
  /** Model E. An ordered list of roots, first hit wins (Amp, pi, Cursor). */
  | 'search-path'
  /** Model F. Antigravity's explicit priority list with declared roots. */
  | 'declared-priority'
  /** Model D. Codex: nothing shadows anything, both appear in the selector. */
  | 'no-override'
  /** Model G. muse reports its own resolution; a static read cannot. */
  | 'cli-reported'
  /** Hooks everywhere: they all merge and they all run. */
  | 'merge-all'
  /** Never verified. Tortie shows the collision and refuses to name a winner. */
  | 'unknown';

/** How well Tortie knows a claim it is making. */
export type ContextEvidence = 'verified' | 'doc' | 'unverified';

// ---------------------------------------------------------------------------
// Live reload — registry data, never prose in a component (§10)
// ---------------------------------------------------------------------------

/**
 * What a session that is already running does when this category changes on
 * disk. Hooks moved from `next-session` to `live` while research 29 was being
 * written, so any sentence a component hard-codes about needing a new session
 * has a short shelf life.
 */
export type ContextReloadBehavior = 'live' | 'next-session' | 'unknown';

export interface ContextReloadCell {
  behavior: ContextReloadBehavior;
  /**
   * One plain sentence for the user. `unknown` gets its own honest sentence
   * rather than a guess, because the user's next action depends on it.
   */
  note: string;
  /**
   * An in-place reload command, e.g. `/reload-plugins`. Tortie TYPES it into
   * the pane and stops. It never presses Enter (§10.1, DESIGN.md §6.8).
   */
  reloadCommand: string | null;
  evidence: ContextEvidence;
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

/**
 * A file that would not parse, a script that is not on disk, a skill whose
 * name does not match its directory. One bad file must never blank the panel
 * (§11 item 4), so problems ride alongside the entries instead of replacing
 * them.
 */
export interface ContextProblem {
  /** Absolute path to the file that produced it. */
  path: string;
  /** 1-based line, when the parser knows one. Click opens the editor here. */
  line: number | null;
  /** Sentence case, no exclamation marks, names the file by its base name. */
  message: string;
  kind: 'parse' | 'missing' | 'invalid' | 'unreadable';
  /** Which category the file was being read for. */
  category: ContextCategory | null;
}

// ---------------------------------------------------------------------------
// The executable-content scan (§3.7) — static, never run
// ---------------------------------------------------------------------------

/**
 * One thing that will execute when a skill loads. A `SKILL.md` BODY can carry
 * `` !`command` `` placeholders that run before the model sees the file, which
 * is why this is a first-class field rather than metadata: a reviewer skimming
 * prose for intent reads straight past `` !`curl … | sh` ``.
 *
 * Found by regex. Nothing here is ever executed, and finding it costs no
 * network.
 */
export interface ContextExecutable {
  kind:
    /** `` !`cmd` `` inline in the body — runs before the model is involved. */
    | 'inline-command'
    /** A fenced ```! block — the multi-line form of the same thing. */
    | 'fenced-command'
    /** A file under `scripts/`. The payload the CSA research found hides here. */
    | 'bundled-script'
    /** A hook declared in the skill's own frontmatter. */
    | 'frontmatter-hook';
  /** The command verbatim, or the script's path relative to the skill root. */
  detail: string;
  /** Absolute path of the file it was found in. */
  path: string;
  /** 1-based line for the body forms; null for a bundled script. */
  line: number | null;
}

export interface ContextExecutableScan {
  findings: ContextExecutable[];
  /** True when the scan hit its own budget and stopped early. */
  truncated: boolean;
  /** Files read. Zero means the scan found nothing to read, not that it passed. */
  filesRead: number;
}

// ---------------------------------------------------------------------------
// Payloads — one row shape, five payloads (§4)
// ---------------------------------------------------------------------------

export interface SkillPayload {
  kind: 'skill';
  /** Full `description` from the frontmatter, masked. Null when absent. */
  description: string | null;
  license: string | null;
  compatibility: string | null;
  /** `allowed-tools`, split on whitespace or commas. */
  allowedTools: string[];
  argumentHint: string | null;
  userInvokable: boolean | null;
  disableModelInvocation: boolean | null;
  /** A `paths` glob restricts when the skill fires. */
  paths: string[];
  /**
   * The derived trigger sentence — the highest-value single field in the view
   * and the one thing that is not in the standard. "The agent loads it when
   * relevant, or you type /impeccable."
   */
  trigger: string;
  /** Counts of the optional sibling directories the spec allows. */
  bundles: { scripts: number; references: number; assets: number };
  /** The skill declares hooks in its own frontmatter (§2.8). */
  declaresHooks: boolean;
  /**
   * The spec requires `name` to match the parent directory. When it does not,
   * agents disagree about which one they address it by.
   */
  nameMatchesDirectory: boolean;
  /** Bytes of name + description, which is what loads at startup. */
  startupBytes: number;
  /** startupBytes / 4, the ~100-tokens-per-skill budget made concrete. */
  startupTokens: number;
  /**
   * Nested under the project root rather than at `.claude/skills` — available
   * but not loaded until the agent touches a file in that subtree, and
   * addressed as `apps/web:deploy` (§2.8 item 3).
   */
  lazy: boolean;
}

export interface McpPayload {
  kind: 'mcp';
  transport: 'stdio' | 'http' | 'sse' | 'unknown';
  /** The binary, masked. Null for a remote server. */
  command: string | null;
  /** argv after the binary, masked value-by-value. */
  args: string[];
  /** Remote endpoint with userinfo and credential query params removed. */
  url: string | null;
  cwd: string | null;
  /**
   * Environment variable NAMES only. The values are never read into this
   * object, so there is nothing for a later change to accidentally render.
   */
  envKeys: string[];
  /** How many values are hidden, for "3 environment values are hidden". */
  hiddenValueCount: number;
  /** `false` only when the file says so; null when the format has no switch. */
  enabled: boolean | null;
  /**
   * Claude Code gates `.mcp.json` servers behind an interactive approval, and
   * records it in `~/.claude.json` per project. An unapproved server is listed
   * and is not running.
   */
  approval: 'approved' | 'pending' | 'rejected' | 'not-required';
}

export interface HookPayload {
  kind: 'hook';
  /** `PostToolUse`, `session_start`, `BeforeTool` — the agent's own word. */
  event: string;
  matcher: string | null;
  handlerType: 'command' | 'http' | 'mcp_tool' | 'prompt' | 'agent' | 'module' | 'unknown';
  /** The command line, masked. */
  command: string | null;
  /** Its last path segment, which is what the row shows. */
  commandLeaf: string | null;
  timeoutSeconds: number | null;
  statusMessage: string | null;
  /** The script this hook runs, when one absolute path could be resolved. */
  scriptPath: string | null;
  /** The resolved script is not on disk. The agent logs an error and keeps going. */
  scriptMissing: boolean;
  /**
   * Codex pins each hook with `trusted_hash = "sha256:…"` and refuses to run
   * one whose file changed. It is the only agent in the survey that does.
   */
  trustedHash: string | null;
}

export interface PluginPayload {
  kind: 'plugin';
  version: string | null;
  description: string | null;
  author: string | null;
  homepage: string | null;
  /** The marketplace half of `name@marketplace`. */
  marketplace: string | null;
  commitSha: string | null;
  installPath: string | null;
  enabled: boolean;
  /** What it contributes, each a link into its own row in the view. */
  contributes: {
    skills: number;
    hooks: number;
    mcpServers: number;
    agents: number;
    commands: number;
  };
}

export interface InstructionPayload {
  kind: 'instruction';
  bytes: number;
  /** First non-heading line, masked. */
  firstLine: string;
  /** The file whose `@import` pulled this one in; null for a root of the chain. */
  importedBy: string | null;
  /** 0 for a root, 1 for its imports, and so on. */
  importDepth: number;
  /** Position in the concatenated load order, starting at 0. */
  order: number;
}

export type ContextPayload =
  | SkillPayload
  | McpPayload
  | HookPayload
  | PluginPayload
  | InstructionPayload;

// ---------------------------------------------------------------------------
// The entry
// ---------------------------------------------------------------------------

/**
 * A definition this entry beats. It is not a row of its own: the list shows
 * the resolved set, never the union, so a loser is a mark on the winner and a
 * line in the detail view (§4, §6.3).
 */
export interface ContextShadow {
  scope: ContextScope;
  sourcePath: string;
  /** The registry agents for which this definition loses. */
  losesFor: AgentRegistryId[];
  /**
   * One sentence naming both ends and the direction, because with skills the
   * direction is the surprising half: "Also defined in this project. The
   * global one wins."
   */
  reason: string;
}

/** Per-agent detail behind a row, for the detail view's ✓/✗ column. */
export interface ContextAgentVerdict {
  agent: AgentRegistryId;
  /** The path through which this agent reaches the thing. */
  viaPath: string;
  scope: ContextScope;
  resolution: ContextResolution;
  model: ContextPrecedenceModel;
}

/** One resolved thing. Everything in the view is one of these. */
export interface ContextEntry {
  /** Stable across scans: category + identity of the thing, not of a file. */
  id: string;
  category: ContextCategory;
  /** The user's word for it. */
  name: string;
  /** One line, from the artifact itself (§7.2). Masked. */
  summary: string;
  scope: ContextScope;
  /** Absolute path to the file that defines the winner. */
  sourcePath: string;
  /** `sourcePath` with every symlink resolved. The dedupe key for skills. */
  realPath: string;
  /**
   * The registry agents that will load this. Computed from the same realpath
   * walk that does the dedupe, which is why the hardest question the view asks
   * costs one `realpath` call. Registry agents only: amp and opencode hold
   * symlinks to the same inode here, and Tortie cannot launch them, so
   * counting them would overstate what Tortie knows (§6.5).
   */
  agents: AgentRegistryId[];
  /** Per-agent verdicts, for the detail view. Same length as `agents` or longer. */
  verdicts: ContextAgentVerdict[];
  state: ContextState;
  resolution: ContextResolution;
  /** The model that produced `resolution`, so the UI can say why. */
  model: ContextPrecedenceModel;
  evidence: ContextEvidence;
  shadows: ContextShadow[];
  /**
   * Content hash, for the launch snapshot (§8.2) and the install pin (§13.2).
   * Null when the scan ran with `hash: 'none'`. This is Tortie's own hash and
   * is deliberately NOT the skills CLI's `skillFolderHash` — the two answer
   * different questions and must never be compared.
   */
  hash: string | null;
  /** Names the algorithm, so a future change cannot silently invalidate pins. */
  hashAlgorithm: string | null;
  /**
   * What runs when this loads. Null when the scan did not ask for it; an empty
   * findings list means the scan ran and found nothing.
   */
  executes: ContextExecutableScan | null;
  /** Why the row is `broken`, when it is. */
  problem: ContextProblem | null;
  payload: ContextPayload;
}

// ---------------------------------------------------------------------------
// Scan input and result
// ---------------------------------------------------------------------------

/**
 * `none` for a plain list refresh, `head` for the launch snapshot (the
 * defining file only, ~1 ms for the whole set), `full` for a skill's whole
 * directory, which is what the install pin re-checks against.
 */
export type ContextHashMode = 'none' | 'head' | 'full';

export interface ContextScanInput {
  /** Project root. Null reads global scope only, which is a valid view. */
  cwd: string | null;
  /** One agent, or null for every registry agent that declares roots. */
  agent?: AgentRegistryId | null;
  /** Defaults to all five. */
  categories?: readonly ContextCategory[];
  /** Defaults to `'none'`. */
  hash?: ContextHashMode;
  /** Defaults to false. The detail surface and the install path ask for it. */
  scanExecutable?: boolean;
  /**
   * Walk below the project root for nested `.claude/skills`. Defaults to true,
   * bounded to three levels and a fixed directory budget.
   */
  includeNested?: boolean;
  /**
   * Override the environment the reader resolves paths from. Tests and the
   * isolated-HOME harness pass this; production passes nothing.
   */
  env?: Readonly<Record<string, string | undefined>>;
}

/** Per-section counts. Bundled never joins the header count (§2.1 rule 2). */
export interface ContextSectionCount {
  category: ContextCategory;
  /** What the header shows. Excludes bundled. */
  resolved: number;
  /** Rendered in a collapsed `Bundled` group, counted separately. */
  bundled: number;
  /** Registry agents contributing at least one entry to this section. */
  agentsCovered: number;
}

/** One root the reader looked at, and whether it was there. */
export interface ContextRootReadout {
  path: string;
  category: ContextCategory;
  scope: ContextScope;
  exists: boolean;
}

/**
 * What Tortie read for one agent, including the categories it does not know
 * about. An absent key becomes an absent section, never a crash and never a
 * lie (§2.4).
 */
/**
 * ONE AGENT'S RULE FOR ONE CATEGORY, carried to the renderer instead of being
 * re-derived there.
 *
 * The panel resolves per agent and it used to EXPLAIN per category, so every
 * group order and every tooltip stated Claude Code's rule as if it were
 * everyone's. Measured on 2026-08-13: with the selector pinned to gemini, the
 * skills section drew "All your projects" first with the sentence "One of these
 * beats a skill of the same name that this project commits", and the row
 * directly under that sentence was the project copy winning, because gemini is
 * narrowest-wins. Codex keeps both and cursor's rule was never established, and
 * both got the same sentence.
 *
 * So the order and the words come from here, per agent, and the renderer holds
 * no ladder of its own.
 */
export interface ContextPrecedenceReadout {
  model: ContextPrecedenceModel;
  evidence: ContextEvidence;
  /**
   * One plain sentence naming this agent's rule for this category. Written
   * beside the substrate table in main, never in a component.
   */
  note: string;
  /**
   * The scopes this agent reads for this category, HIGHEST PRECEDENCE FIRST,
   * derived from the declared locations' ranks. For a model that resolves
   * nothing this is a reading order and not a ladder, which is why `model` is
   * beside it: a caller that draws an order without reading the model is the
   * bug this field exists to stop.
   */
  scopeOrder: ContextScope[];
}

export interface ContextAgentReadout {
  agent: AgentRegistryId;
  displayName: string;
  /**
   * This agent's name IN THE SKILLS CLI's own vocabulary, or null when the CLI
   * has no name for it.
   *
   * Tortie's ids and the CLI's are not the same words: Claude Code is `claude`
   * here and `claude-code` there, Gemini is `gemini` here and `gemini-cli`
   * there. Sending a Tortie id straight through builds a command that names an
   * agent the CLI has never heard of.
   *
   * A null is a real answer rather than a gap. Two of Tortie's launchable
   * agents are absent from the CLI's table of 76 targets, so a skill cannot be
   * installed for them, and the install picker disables that row WITH THE
   * REASON rather than hiding it.
   */
  skillsCliName: string | null;
  /** Categories this agent declares any location for. */
  supported: ContextCategory[];
  /** Categories research 29 marked `?` for this agent. */
  unknown: ContextCategory[];
  roots: ContextRootReadout[];
  /** Per category, what a running session does when the files change. */
  reload: Partial<Record<ContextCategory, ContextReloadCell>>;
  /** Per category, how this agent resolves a name collision, and in what order. */
  precedence: Partial<Record<ContextCategory, ContextPrecedenceReadout>>;
}

export interface ContextScanResult {
  entries: ContextEntry[];
  sections: ContextSectionCount[];
  problems: ContextProblem[];
  agents: ContextAgentReadout[];
  cwd: string | null;
  /** Epoch ms. */
  scannedAt: number;
  durationMs: number;
  /** True when a bounded walk hit its budget, so a count may be short. */
  truncated: boolean;
}

/**
 * The launch snapshot (§8.2) lives in `./context-snapshot`, not here.
 *
 * It is advisory: a failed or missing snapshot must never fail a launch, block
 * a restore or change a resume argument. It is written once at launch, a
 * restore re-writes it, and deleting it is always safe. Its record shape is
 * persisted in the manifest and version-checked, so it is declared next to the
 * code that writes it rather than next to the object model that feeds it.
 *
 * `ContextEntry` above satisfies that file's `ContextEntryLike` exactly, so a
 * resolved row folds into a snapshot entry with no adapter.
 */
export type { ContextSnapshot, ContextSnapshotEntry } from './context-snapshot';

/**
 * How ONE row differs from the snapshot a running session was launched with.
 *
 * NAMED `ContextRowDrift`, not `ContextDrift`, and the name was settled at
 * integration. `context-snapshot.ts` exports `ContextDrift` and means something
 * else by it: the whole comparison result, with its lists of entries. Two shared
 * modules exporting one name for two shapes compiles cleanly in both and puts
 * the wrong type on a prop the day somebody imports from the nearer file. This
 * one is the per-row word the view puts in the state lane, and it is
 * `ContextDriftKind` plus the fourth value the record has no use for, because a
 * record only stores what changed while a row still has to render when nothing
 * did.
 */
export type ContextRowDrift = ContextDriftKind | 'unchanged';

import type { ContextDriftKind } from './context-snapshot';
