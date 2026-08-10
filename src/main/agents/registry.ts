/**
 * The gmux agent registry (Phase 10 — research 11, docs/research/11-agent-registry.md).
 *
 * All 12 agents SpecStory has mechanics for, as DATA: binary names, probe
 * dirs, session-store roots, version/identity probes, launch argv, and
 * resume strategy. Everything here is synthesized from specstory-cli's
 * provider SPI (see the research doc for per-field provenance); fields the
 * research could not answer are marked UNVERIFIED in `notes` and via the
 * `unverified` flag.
 *
 * Consumers:
 *  - src/main/agents/detection.ts  — probes binaries + stores, runs versionCmd
 *  - src/main/manifest/agents.ts   — buildLaunchSpec wires launch/resume argv
 *  - (future) Settings UI          — per-agent enable/override/flag presets
 *
 * Pure data + pure helpers (no Electron, no I/O) — unit-testable anywhere.
 *
 * Registry rules internalized from the research:
 *  - Resume is a SUBCOMMAND for codex/muse, a flag for the rest, and the
 *    different `--conversation` flag for antigravity — all encoded in
 *    `resume.template`, no special casing anywhere.
 *  - cursoride/copilotide are IDE watchers (capture-only): NEVER launchable
 *    in a tmux pane.
 *  - pi is launchable per BACKLOG Phase-10 item 1, but its binary name,
 *    version cmd, and launch argv are UNVERIFIED upstream (SpecStory v1 is
 *    read-only for pi) — flagged so the UI can caveat it.
 *  - Version commands are IDENTITY PROBES, not semver gates.
 *  - Default agent must be explicit (claude) — never alphabetical
 *    (SpecStory's bare-run bug picks antigravity on dev).
 */

import type {
  AgentImageDrop,
  AgentRegistryId,
  ImageDropTable,
  LaunchableAgentId
} from '@shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How a session id is fed back to the agent to resume a conversation. */
export type ResumeStrategy =
  /** `<bin> [--resume|resume|--conversation] <sessionId>` per template. */
  | 'flag-uuid'
  /** No resume mechanics exist (pi v1). */
  | 'none'
  /** IDE store row-insert; not driveable from a terminal (cursoride/copilotide). */
  | 'session-file-harvest';

/** How to ask the binary who it is / what version it runs. */
export interface VersionProbe {
  /** Args after the binary, e.g. ['-v'] or ['--version']. */
  args: string[];
  /** Second attempt when the first errors (codex --version → -V). */
  fallbackArgs?: string[];
  /**
   * Output must contain this substring to count as the real agent
   * (claude -v must contain "(Claude Code)" — a different `claude` on PATH
   * is not Claude Code).
   */
  identitySubstring?: string;
  /**
   * How to distill the version string from the output. Default 'first-line'.
   * 'strip-ansi-last-line' is droid's documented quirk.
   */
  postProcess?: 'first-line' | 'strip-ansi-last-line';
}

export interface AgentLaunchInfo {
  /** Bare launch argv; argv[0] is the binary name (resolved to an absolute
   *  path at create time by the session service). */
  argv: string[];
  /** Env deltas injected at spawn (cursor-agent needs FORCE_COLOR=1). */
  env?: Record<string, string>;
  /** Behavioral notes from the research (inherit-stdio, aliases, …). */
  quirks: string[];
}

export interface AgentResumeInfo {
  strategy: ResumeStrategy;
  /**
   * Args appended after the binary to resume; SESSION_ID_SLOT is replaced
   * with the conversation id. Empty when strategy is 'none' or
   * 'session-file-harvest'.
   */
  template: string[];
  /** Where the agent's session files live (template form, for reference). */
  sessionStore: string;
  notes: string;
}

/** One launch-flag preset (BACKLOG Phase-10 item 8 populates these after
 *  inspecting each installed CLI's --help; the type ships now so the data
 *  append is additive). */
export interface AgentFlagPreset {
  flag: string;
  label: string;
  description: string;
  /** Danger-styled in the UI (permission-skipping flags), off by default. */
  danger: boolean;
}

/**
 * Per-agent activity-detection capability (Phase 13, research 18 §2.3).
 *
 * `tier` is the HIGHEST channel with a verified implementation, not a
 * requirement: detection is agent-agnostic by construction and the universal
 * floor is the only thing every session actually depends on.
 */
export interface AgentActivityProfile {
  /** Highest tier gmux implements for this agent. */
  tier: 'native' | 'hooks' | 'process' | 'screen';
  /** Which native channel, when tier === 'native'. */
  native?: 'claude-session-registry' | 'pane-title-oracle' | 'shell-keypad';
  /**
   * TRUE = the agent paints at an IDLE prompt, so tmux's output clock cannot
   * be read as "working". Measured: muse emits exactly 1 event/s and
   * deepseek-tui 6 per 15 s while idle; every other agent measured emits
   * ZERO bytes at an idle prompt.
   */
  animatesWhenIdle: boolean;
  /** Hook-injection recipe, when gmux ships one. */
  hooks?: 'claude-settings';
  /** Evidence marker (BACKLOG requirement) — see research 18 §2.3. */
  verified: 'verified' | 'partial' | 'unverified';
}

export interface AgentRegistryEntry {
  id: AgentRegistryId;
  displayName: string;
  /** 'cli' = tmux-launchable terminal agent; 'ide' = app watcher. */
  kind: 'cli' | 'ide';
  /**
   * Can gmux spawn it in a tmux pane? IDE entries are capture-only
   * (false); every CLI including pi is launchable per BACKLOG item 1
   * (pi's mechanics carry `unverified`).
   */
  launchable: boolean;
  /** Where the provider lives in SpecStory's branch topology (provenance). */
  status: string;
  /** Research confidence for gmux ('high' = shipped-main, verified). */
  confidence: 'high' | 'medium' | 'low';
  /** Candidate binary names, most canonical first. */
  binaries: string[];
  /**
   * Extra dirs to probe for the binary beyond the captured login-shell PATH
   * and resolve.ts's extraBinDirs(). May contain `~/` and `$VARS`; a single
   * `*` path segment is globbed (nvm's versioned bins).
   */
  extraProbeDirs: string[];
  /**
   * Session-store roots (existence = "installed AND in use", a stronger
   * signal than a binary on PATH; also the future watcher roots for async
   * session-id harvest). `~/` and `$VARS` allowed.
   */
  storeDirs: string[];
  /** null when there is no safe subprocess probe (IDEs, pi UNVERIFIED). */
  versionProbe: VersionProbe | null;
  /** null when not launchable in a pane. */
  launch: AgentLaunchInfo | null;
  resume: AgentResumeInfo;
  /** Can cross-agent reconstruction write INTO this agent's store? */
  reconstructionTarget: boolean;
  /**
   * AgentIcon key (src/renderer/assets/agents/<key>.svg). Keys without a
   * shipped SVG yet (antigravity, muse, qwen, pi — research gap #1) render
   * the terminal-glyph fallback until the asset is commissioned.
   */
  iconKey: string;
  /** gmux proposal for a per-agent hotkey mnemonic (Phase-10 item 3). */
  defaultHotkeyHint: string | null;
  /** True when core mechanics are UNVERIFIED upstream (pi). */
  unverified: boolean;
  /** Per-agent launch-flag presets (populated by the presets stream). */
  flagPresets?: AgentFlagPreset[];
  /**
   * How a dropped/pasted file reference reaches this agent's prompt
   * (Phase 12 item 8, research 16 §2 — every row observed hands-on on
   * 2026-08-10 unless its own `verified` says otherwise). Absent = the
   * capture-only IDE pair, which has no prompt to drop into.
   */
  imageDrop?: AgentImageDrop;
  /**
   * How this agent's LIVE ACTIVITY is detected (Phase 13, research 18 §2.3).
   * Absent = the capture-only IDE pair, which gmux never runs in a pane.
   * The floor (tiers 1–3) runs for every session regardless; this field only
   * says which higher tier is allowed to supersede it, so a newly installed
   * CLI gmux has never seen still reports correctly on first launch.
   */
  activity?: AgentActivityProfile;
  notes?: string;
}

/**
 * What an agent with no `imageDrop` row gets, and what a plain shell gets:
 * insert the path as text. Never an attachment, always readable — the
 * BACKLOG's "default any unverified agent to the path fallback".
 */
export const DEFAULT_IMAGE_DROP: AgentImageDrop = {
  strategy: 'path-text',
  insert: 'paste',
  verified: false
};

/** The slot replaced by the conversation id in resume templates. */
export const SESSION_ID_SLOT = '<sessionId>';

/** Explicit default agent — NEVER pick alphabetically (research rule 8). */
export const DEFAULT_AGENT_ID: AgentRegistryId = 'claude';

// ---------------------------------------------------------------------------
// The 12 entries
// ---------------------------------------------------------------------------

export const AGENT_REGISTRY: readonly AgentRegistryEntry[] = [
  {
    id: 'claude',
    displayName: 'Claude Code',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: ['claude'],
    extraProbeDirs: ['~/.claude/local'],
    storeDirs: ['~/.claude/projects'],
    versionProbe: { args: ['-v'], identitySubstring: '(Claude Code)' },
    launch: {
      argv: ['claude'],
      quirks: [
        'gmux pre-assigns the session UUID with --session-id <uuid> (gmux FINAL-REPORT plan; UNVERIFIED in SpecStory code — fall back to store-watch harvest if it regresses)'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl',
      notes:
        '--resume does not restore launch flags — record full original argv and re-append extras (handled by claudeResumeArgv).'
    },
    reconstructionTarget: true,
    // pid-file registry, VERIFIED end-to-end (PROBE A + synthesis run).
    activity: { tier: 'native', native: 'claude-session-registry', animatesWhenIdle: false, hooks: 'claude-settings', verified: 'verified' },
    iconKey: 'claude',
    defaultHotkeyHint: 'c',
    imageDrop: {
      strategy: 'paste-path',
      insert: 'paste',
      verified: true,
      notes:
        'Bracket-pasting the bare absolute path yields the same [Image #N] chip as the clipboard route — no pasteboard write, no temp file. Paste the path ALONE: prose sharing the paste is reordered around the chip.'
    },
    unverified: false
  },
  {
    id: 'cursor',
    displayName: 'Cursor CLI',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: ['cursor-agent'],
    extraProbeDirs: ['~/.cursor/bin'],
    storeDirs: ['~/.cursor/chats'],
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['cursor-agent'],
      env: { FORCE_COLOR: '1' },
      quirks: ['FORCE_COLOR=1 is the sole env injection SpecStory makes for any agent']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.cursor/chats/<md5hex(canonicalCwd)>/<sessionId>/store.db',
      notes:
        'store.db is SQLite; md5 dir name is one-way — a cwd can never be recovered from it.'
    },
    reconstructionTarget: true,
    // Not probed — floor only until someone runs the matrix on it.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'cursor',
    defaultHotkeyHint: 'u',
    imageDrop: {
      strategy: 'path-text',
      insert: 'paste',
      verified: false,
      notes:
        'Blocked at the sign-in gate during research 16; the CLI docs mention no attachment support. Path text is the safe default.'
    },
    unverified: false
  },
  {
    id: 'codex',
    displayName: 'Codex CLI',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: ['codex'],
    extraProbeDirs: ['$NVM_BIN', '~/.nvm/versions/node/*/bin'],
    storeDirs: ['$CODEX_HOME/sessions', '~/.codex/sessions'],
    versionProbe: { args: ['--version'], fallbackArgs: ['-V'] },
    launch: {
      argv: ['codex'],
      quirks: ['honors CODEX_HOME for store location']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],
      sessionStore:
        '${CODEX_HOME:-~/.codex}/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl',
      notes:
        'Resume is a SUBCOMMAND, not a flag. Global date-sharded store; cwd attribution via line-1 session_meta. Bound watchers to ~7 days (fd-exhaustion lesson).'
    },
    reconstructionTarget: true,
    // #{pane_title} 3-state oracle: 0 % FN / 0 % FP over n=156.
    activity: { tier: 'native', native: 'pane-title-oracle', animatesWhenIdle: false, verified: 'verified' },
    iconKey: 'codex',
    defaultHotkeyHint: 'x',
    imageDrop: {
      strategy: 'paste-path',
      insert: 'paste',
      verified: true,
      notes:
        'Strictest matcher: exactly ONE path per paste, no surrounding prose, and a space in the path must be backslash-escaped or it degrades to literal text.'
    },
    unverified: false
  },
  {
    id: 'gemini',
    displayName: 'Gemini CLI',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: ['gemini'],
    extraProbeDirs: [],
    storeDirs: ['~/.gemini/tmp'],
    versionProbe: { args: ['--version'] },
    launch: { argv: ['gemini'], quirks: [] },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.gemini/tmp/<projectDir>/chats/session-*.json',
      notes:
        'projectDir resolution is 3-tier: .project_root marker → legacy sha256(canonicalCwd) → full scan.'
    },
    reconstructionTarget: true,
    // Auth-blocked during research; title carries no state channel.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'gemini',
    defaultHotkeyHint: 'g',
    imageDrop: {
      strategy: 'paste-path',
      insert: 'paste',
      verified: false,
      notes:
        'INFERRED from upstream clipboardUtils.ts/parsePastedPaths() and from qwen (its fork) behaving exactly as that source predicts; auth-blocked during research 16.'
    },
    unverified: false
  },
  {
    id: 'droid',
    displayName: 'Factory Droid CLI',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: ['droid'],
    extraProbeDirs: [],
    storeDirs: ['~/.factory/sessions'],
    versionProbe: { args: ['--version'], postProcess: 'strip-ansi-last-line' },
    launch: { argv: ['droid'], quirks: [] },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.factory/sessions/<dashEncode(realpath(cwd))>/<sessionId>.jsonl',
      notes:
        'Identical dash-encoding to Claude Code; sidecar <sessionId>.settings.json carries token usage.'
    },
    reconstructionTarget: true,
    // Not installed here; hook shape is docs-only. Floor only.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'droid',
    defaultHotkeyHint: 'd',
    imageDrop: {
      strategy: 'path-text',
      insert: 'paste',
      verified: false,
      notes: 'Not installed on the research machine — unverified, so path text.'
    },
    unverified: false
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek TUI',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main (read/launch); dev adds reconstruct+watch',
    confidence: 'high',
    binaries: ['deepseek'],
    extraProbeDirs: [],
    storeDirs: ['~/.deepseek/sessions'],
    versionProbe: { args: ['--version'] },
    launch: { argv: ['deepseek'], quirks: ['documented floor 0.8.39+, not enforced'] },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.deepseek/sessions/<sessionId>.json',
      notes:
        'Flat GLOBAL store; project identity via metadata.workspace inside the file.'
    },
    reconstructionTarget: true,
    // Animates at idle (6 events/15 s) — the activity clock is unusable.
    activity: { tier: 'process', animatesWhenIdle: true, verified: 'partial' },
    iconKey: 'deepseek',
    defaultHotkeyHint: 'k',
    imageDrop: {
      strategy: 'clipboard-attach',
      insert: 'paste',
      verified: true,
      notes:
        'Attaches ONLY from pasteboard image data (0x16), which ⌘V already provides. Pasted and typed paths both stay literal, so a file DROP inserts path text until the guarded pasteboard write ships (research 16 §7).'
    },
    unverified: false
  },
  {
    id: 'antigravity',
    displayName: 'Antigravity CLI',
    kind: 'cli',
    launchable: true,
    status: 'dev-only (not on main)',
    confidence: 'medium',
    binaries: ['agy'],
    extraProbeDirs: [],
    storeDirs: ['~/.gemini/antigravity-cli'],
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['agy'],
      quirks: [
        "an 'antigravity' alias exists but is not normally on PATH — probe 'agy'",
        'shares ~/.gemini root with Gemini CLI: detection dirs kept distinct'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--conversation', SESSION_ID_SLOT],
      sessionStore:
        '~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript_full.jsonl',
      notes:
        'Resume flag is --conversation, NOT --resume. Project attribution scrapes agy logs with fragile regexes — expect breakage across releases. NOT a cross-agent resume target (real state is protobuf-in-SQLite).'
    },
    reconstructionTarget: false,
    // Idle byte-silence VERIFIED; title is 'Mac', no state channel.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'partial' },
    iconKey: 'antigravity',
    defaultHotkeyHint: 'a',
    imageDrop: {
      strategy: 'clipboard-attach',
      insert: 'type',
      verified: true,
      notes:
        'Attaches only from pasteboard image data (0x16). Path text must be TYPED, not bracket-pasted: a pasted path opens a "No matches" completion popup that swallows the next keystroke.'
    },
    unverified: false
  },
  {
    id: 'muse',
    displayName: 'Muse Code',
    kind: 'cli',
    launchable: true,
    status: 'branch-only (muse-provider = dev+5, PR #269 in flight)',
    confidence: 'medium',
    binaries: ['muse'],
    extraProbeDirs: [],
    storeDirs: ['$XDG_DATA_HOME/muse/sessions', '~/.local/share/muse/sessions'],
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['muse'],
      quirks: ['honors XDG_DATA_HOME for store location', 'documented floor 0.1.0+, not enforced']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],
      sessionStore:
        '${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<YYYY>/<MM>/<DD>/<sessionId>/session.jsonl',
      notes:
        'Resume is a SUBCOMMAND, not a flag. Global date-sharded store (Codex-style); filter by stream.id to exclude subagent task-streams.'
    },
    reconstructionTarget: true,
    // 1 output/s while idle; ~12 s pre-first-token window needs T3.
    activity: { tier: 'process', animatesWhenIdle: true, verified: 'partial' },
    iconKey: 'muse',
    defaultHotkeyHint: 'm',
    imageDrop: {
      strategy: 'paste-path',
      insert: 'paste',
      verified: true,
      notes:
        'Verified with space-free paths ([Image 1]); its tolerance for escaped spaces is untested, so backslash escaping is the guess.'
    },
    unverified: false
  },
  {
    id: 'qwen',
    displayName: 'Qwen Code',
    kind: 'cli',
    launchable: true,
    status: 'branch-only (qwen-provider-support = dev+4, PR #268 in flight)',
    confidence: 'medium',
    binaries: ['qwen'],
    extraProbeDirs: [],
    storeDirs: ['~/.qwen/projects'],
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['qwen'],
      quirks: ['verified against qwen 0.21.7; empirical floor 0.21.0+, not enforced']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      sessionStore: '~/.qwen/projects/<sanitize(cwd)>/chats/<sessionId>.jsonl',
      notes:
        'sanitize hashes the VERBATIM cwd (no realpath, no leading-dash rule) — differs from claude/droid encoding. Ignore sibling .runtime.json.'
    },
    reconstructionTarget: true,
    // Title reads 'Qwen - pi' in every state — no channel there.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'partial' },
    iconKey: 'qwen',
    defaultHotkeyHint: 'q',
    imageDrop: {
      strategy: 'paste-path',
      insert: 'paste',
      verified: true,
      notes:
        'Attachment lands in a tray ("Attachments: [clipboard-<ts>-0.png]"), not inline; a pasted NON-image path is auto-rewritten to @<abspath>.'
    },
    unverified: false
  },
  {
    id: 'pi',
    displayName: 'Pi',
    kind: 'cli',
    launchable: true,
    status: 'remote-branch-unreleased (origin/feat/pi-provider = dev+19; SpecStory v1 is READ-ONLY)',
    confidence: 'low',
    binaries: ['pi'],
    extraProbeDirs: [],
    storeDirs: [
      '$PI_CODING_AGENT_SESSION_DIR',
      '$PI_CODING_AGENT_DIR',
      '~/.pi/agent/sessions'
    ],
    // UNVERIFIED: no version command is confirmed upstream — no subprocess probe.
    versionProbe: null,
    launch: {
      argv: ['pi'],
      quirks: [
        "UNVERIFIED: binary name and launch argv are gmux's best guess — SpecStory v1 returns 'not yet supported' for run/watch/resume"
      ]
    },
    resume: {
      strategy: 'none',
      template: [],
      sessionStore: '~/.pi/agent/sessions/--<encodedCwd>--/<timestamp>_<uuid>.jsonl',
      notes:
        'UNVERIFIED: resume mechanics unimplemented upstream. Env overrides honored: PI_CODING_AGENT_DIR, PI_CODING_AGENT_SESSION_DIR.'
    },
    reconstructionTarget: false,
    // Event API read from its .d.ts, never executed. Floor only.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'pi',
    defaultHotkeyHint: null,
    imageDrop: {
      strategy: 'path-text',
      insert: 'paste',
      verified: true,
      notes:
        'VERIFIED NEGATIVE: 0x16 writes the pasteboard image to its own temp file and inserts that path as plain text — no attachment either way, so gmux inserts the real path.'
    },
    unverified: true,
    notes: 'Launchable per BACKLOG Phase-10 item 1, but every mechanic is UNVERIFIED upstream.'
  },
  {
    id: 'cursoride',
    displayName: 'Cursor IDE',
    kind: 'ide',
    launchable: false, // capture-only: not a terminal process, never a tmux pane
    status: 'dev-only',
    confidence: 'medium',
    binaries: ['cursor'],
    extraProbeDirs: [],
    storeDirs: ['~/Library/Application Support/Cursor/User/globalStorage/state.vscdb'],
    versionProbe: null, // detection is store-existence, deliberately no subprocess
    launch: null,
    resume: {
      strategy: 'session-file-harvest',
      template: [],
      sessionStore:
        '~/Library/Application Support/Cursor/User/globalStorage/state.vscdb (cursorDiskKV composerData:<id>)',
      notes:
        "Resume = INSERT a composerData row into the global SQLite state.vscdb, then open Cursor. Surface as an 'open in IDE' action only."
    },
    reconstructionTarget: true,
    iconKey: 'cursor',
    defaultHotkeyHint: null,
    unverified: false
  },
  {
    id: 'copilotide',
    displayName: 'VS Code Copilot (chat in IDE)',
    kind: 'ide',
    launchable: false, // capture-only: app watcher, never a tmux pane
    status: 'dev-only; 4 variants registered only if that app has chats',
    confidence: 'medium',
    binaries: ['code', 'code-insiders', 'codium', 'codium-insiders'],
    extraProbeDirs: [],
    storeDirs: [
      '~/Library/Application Support/Code/User/workspaceStorage',
      '~/Library/Application Support/Code - Insiders/User/workspaceStorage',
      '~/Library/Application Support/VSCodium/User/workspaceStorage',
      '~/Library/Application Support/VSCodium - Insiders/User/workspaceStorage'
    ],
    versionProbe: null, // detection is workspaceStorage existence — no subprocess
    launch: null,
    resume: {
      strategy: 'session-file-harvest',
      template: [],
      sessionStore:
        '~/Library/Application Support/<app>/User/workspaceStorage/<hash>/chatSessions/<sessionId>.{jsonl,json}',
      notes:
        'Resume = write the chatSessions file + index row, then FULL VS Code restart. This is Copilot chat inside VS Code — no standalone Copilot CLI exists in SpecStory.'
    },
    reconstructionTarget: true,
    iconKey: 'githubcopilot',
    defaultHotkeyHint: null,
    unverified: false
  }
];

// ---------------------------------------------------------------------------
// Lookup + argv helpers
// ---------------------------------------------------------------------------

const BY_ID = new Map<AgentRegistryId, AgentRegistryEntry>(
  AGENT_REGISTRY.map((e) => [e.id, e])
);

/** Every registry id, in registry order. */
export const AGENT_IDS: readonly AgentRegistryId[] = AGENT_REGISTRY.map((e) => e.id);

/** Ids gmux can launch in a tmux pane (excludes the IDE capture-only pair). */
export const LAUNCHABLE_AGENT_IDS: readonly LaunchableAgentId[] = AGENT_REGISTRY.filter(
  (e) => e.launchable
).map((e) => e.id as LaunchableAgentId);

export function getRegistryEntry(id: AgentRegistryId): AgentRegistryEntry {
  const entry = BY_ID.get(id);
  if (entry === undefined) {
    throw new Error(`Unknown agent registry id: ${id}`);
  }
  return entry;
}

/**
 * Entry + its non-null launch info; throws for capture-only entries so a
 * cursoride/copilotide launch attempt fails loudly at the source.
 */
export function getLaunchableEntry(
  id: LaunchableAgentId
): AgentRegistryEntry & { launch: AgentLaunchInfo } {
  const entry = getRegistryEntry(id);
  if (!entry.launchable || entry.launch === null) {
    throw new Error(`Agent '${id}' is capture-only and cannot be launched in a pane.`);
  }
  return entry as AgentRegistryEntry & { launch: AgentLaunchInfo };
}

/** Canonical binary name for an id (cursor → cursor-agent, antigravity → agy). */
export function agentBinaryName(id: AgentRegistryId): string {
  const bin = getRegistryEntry(id).binaries[0];
  if (bin === undefined || bin.length === 0) {
    throw new Error(`Agent '${id}' has no binary name in the registry.`);
  }
  return bin;
}

/**
 * Launch argv for a registry agent: resolved binary (or the registry's bare
 * name) + registry args + user extras.
 */
export function registryLaunchArgv(
  id: LaunchableAgentId,
  extraArgs: readonly string[] = [],
  bin?: string
): string[] {
  const entry = getLaunchableEntry(id);
  const argv0 = bin ?? entry.launch.argv[0] ?? agentBinaryName(id);
  return [argv0, ...entry.launch.argv.slice(1), ...extraArgs];
}

/**
 * Resume argv for a registry agent from its template. Extras are re-appended
 * because `--resume` does not restore launch flags (research gap #6 —
 * documented for Claude, assumed for all). Returns [] when the agent has no
 * resume mechanics (pi).
 */
export function registryResumeArgv(
  id: LaunchableAgentId,
  sessionId: string,
  extraArgs: readonly string[] = [],
  bin?: string
): string[] {
  const entry = getLaunchableEntry(id);
  if (entry.resume.strategy !== 'flag-uuid') return [];
  const argv0 = bin ?? agentBinaryName(id);
  return [
    argv0,
    ...entry.resume.template.map((t) => (t === SESSION_ID_SLOT ? sessionId : t)),
    ...extraArgs
  ];
}

/**
 * The per-agent file-reference table for the renderer (drop:strategies).
 * Derived from AGENT_REGISTRY so the table exists exactly once (guardrail 3);
 * agents with no row — and every shell pane — take the fallback.
 */
export function imageDropTable(): ImageDropTable {
  const agents: ImageDropTable['agents'] = {};
  for (const entry of AGENT_REGISTRY) {
    if (entry.imageDrop !== undefined) agents[entry.id] = entry.imageDrop;
  }
  return { agents, fallback: DEFAULT_IMAGE_DROP };
}

/** One agent's strategy, falling back for shells and unknown ids. */
export function imageDropFor(id: string): AgentImageDrop {
  const entry = AGENT_REGISTRY.find((e) => e.id === id);
  return entry?.imageDrop ?? DEFAULT_IMAGE_DROP;
}

/**
 * What a plain shell gets, and what any agent gmux has never met gets.
 *
 * The floor must be good enough to ship as the ONLY signal for an unknown
 * CLI (BACKLOG Phase 13, universality directive), so the default here is
 * deliberately the LOWEST tier — never an allowlist gate.
 */
export const SHELL_ACTIVITY: AgentActivityProfile = {
  tier: 'native',
  native: 'shell-keypad',
  animatesWhenIdle: false,
  verified: 'verified'
};

export const DEFAULT_ACTIVITY: AgentActivityProfile = {
  tier: 'screen',
  animatesWhenIdle: false,
  verified: 'unverified'
};

/**
 * One agent's activity profile. Shells take the DECKPAM oracle; a registry
 * agent takes its own row; anything else — an id this build has never heard
 * of — takes the floor. Adding an oracle for a future agent is one module
 * plus one registry line; no state-machine change.
 */
export function activityProfileFor(id: string): AgentActivityProfile {
  if (id === 'shell') return SHELL_ACTIVITY;
  return AGENT_REGISTRY.find((e) => e.id === id)?.activity ?? DEFAULT_ACTIVITY;
}
