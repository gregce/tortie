/**
 * The gmux agent registry (Phase 10 — research 11, docs/research/11-agent-registry.md).
 *
 * All 13 agents Tortie has mechanics for, as DATA: binary names, probe
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
 *  - Resume is a SUBCOMMAND for codex/muse/DEEPSEEK, a flag for the rest, the
 *    different `--conversation` flag for antigravity, and for pi the SAME
 *    `--session-id` flag it launches with — all encoded in `resume.template`,
 *    no special casing anywhere.
 *  - cursoride/copilotide are IDE watchers (capture-only): NEVER launchable
 *    in a tmux pane.
 *  - Version commands are IDENTITY PROBES, not semver gates.
 *  - Default agent must be explicit (claude) — never alphabetical
 *    (SpecStory's bare-run bug picks antigravity on dev).
 *
 * PHASE 13.5 — the resume column was re-audited hands-on and NINE of the ten
 * launchable rows were wrong (docs/research/22-resume-audit.md, which
 * supersedes every resume claim in research 11). Two produced a DEAD PANE
 * (pi's "no resume mechanics exist", deepseek's `--resume` flag that is
 * really a subcommand). Root cause, worth keeping in front of the next
 * editor: **the registry was mined from specstory-cli, a CAPTURE tool.** It
 * knows where each agent WRITES its transcript; it has never needed to resume
 * anything, so a mined *absence* of a resume capability says nothing about
 * the agent. Trust a mined store path; never a mined absence. Run
 * `<bin> --help` before writing UNVERIFIED — it would have caught four of the
 * five substantive corrections.
 */

import type {
  AgentImageDrop,
  AgentMultilineKey,
  AgentRegistryId,
  ImageDropTable,
  LaunchableAgentId,
  MultilineKeyTable
} from '@shared/types';
import { DEFAULT_IMAGE_DROP, DEFAULT_MULTILINE_KEY, LF } from '@shared/agent-defaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How a session id is fed back to the agent to resume a conversation. */
export type ResumeStrategy =
  /**
   * `<bin> [--resume|resume|--conversation|--session-id] <sessionId>` per
   * template — the verb lives in `resume.template`, never in code.
   */
  | 'flag-uuid'
  /**
   * No conversation id exists for this agent at all. As of 2026-08-11 NO
   * launchable agent is in this state — every installed CLI has a working
   * deterministic resume (docs/research/22-resume-audit.md). Reserved for a
   * future agent that genuinely has none; do NOT use it to mean "gmux has not
   * implemented capture yet" — that is what `resume.idCapture` records.
   */
  | 'none'
  /** IDE store row-insert; not driveable from a terminal (cursoride/copilotide). */
  | 'session-file-harvest';

/** How a harvested store record is PROVEN to be this pane's session. */
export type AgentHarvestKey =
  /** The agent stamps the tmux pane it runs in into its own transcript. */
  | 'tmux-pane'
  /** The agent records its own pid; gmux matches it against the pane's tree. */
  | 'pid'
  /** The record carries a cwd; newest cwd-matching record after spawn wins. */
  | 'cwd-newest'
  /** An index (SQLite) carries id + cwd in one row. */
  | 'sqlite-index'
  /**
   * An agent process descended from the pane holds open descriptors inside
   * the record (antigravity: agy keeps brain/<id> open while it runs).
   */
  | 'fd-owner'
  /**
   * Nothing on disk links the id to a directory — time correlation only.
   * No live descriptor carries it since Phase 32 moved antigravity to
   * 'fd-owner'; the member stays because persisted provenance rows written
   * by earlier builds already carry the string.
   */
  | 'time-only';

/**
 * How the id in `resume.template` is OBTAINED. Phase 13.5 added this field
 * because its absence is what caused the bug: muse and qwen were typed
 * `'flag-uuid'`, indistinguishable from claude's pre-assigned `--session-id`,
 * so `buildLaunchSpec` could only conclude "resume exists but I have no id"
 * and drop them into a `store-watch` branch nobody had implemented. A
 * distinction with nowhere to live gets guessed in a default branch where
 * nobody reviews it (research 22 §5 rule 5).
 */
export type AgentIdCapture =
  /** gmux fixes the id before spawn and passes it on the launch argv. */
  | { mode: 'pre-assign'; launchFlag: string[] }
  /** gmux fixes the id by running a side command whose stdout is the id. */
  | { mode: 'pre-assign-cmd'; argv: string[]; parse: 'stdout-trim' }
  /** The id only exists once the agent has written it; read it back out. */
  | {
      mode: 'harvest';
      key: AgentHarvestKey;
      /** Human-readable pointer to the field that carries the key. */
      source: string;
      /** When the record first becomes readable. */
      availableAt: 'session-open' | 'first-turn';
      /**
       * 'exact' = the key is a true identity (pane, pid) or an unambiguous
       * cwd match; 'weak' = two panes started together in one directory are
       * NOT separable, so the UI must say so (research 22 §3.3).
       */
      confidence: 'exact' | 'weak';
    }
  /**
   * A capture route probably exists but has never been exercised on a real
   * machine, so gmux refuses to guess one (droid is not installed here).
   * Honest "not yet", never conflated with 'none'.
   */
  | { mode: 'unverified'; note: string }
  /** No conversation id exists to capture (the capture-only IDE pair). */
  | { mode: 'none' };

/**
 * A specstory-cli provider id (Phase 15 capture). One per agent whose
 * transcript specstory knows how to read; NOT every gmux agent has one, and a
 * missing row is the honest answer "this agent cannot be captured", never a
 * guess. Availability is a second question the registry cannot answer: the
 * INSTALLED CLI decides which of these exist (released 2.8.0 ships nine and has
 * never heard of `muse`), so ./specstory/capture.ts probes the real binary and
 * the capture toggle only lights up for the intersection.
 *
 * **It is a `string`, and that is the point (Phase 18.5).** This was an
 * eight-member union, and `capture.ts` filtered the probed ids against it as an
 * allowlist — so a provider specstory added that gmux had never heard of was
 * discarded in silence, with no trace anywhere. That is not hypothetical:
 * specstory's `qwen-provider-support` branch registers `qwen`, gmux has had a
 * launchable `qwen` agent since Phase 10, and the two would never have met
 * until someone shipped a gmux release (docs/research/30 §3.2).
 *
 * The fail-closed property the union provided is kept, by a SHAPE guard on the
 * parse (`/^[a-z][a-z0-9_-]{0,31}$/`) rather than a membership one: a
 * formatting change in the CLI's output still cannot invent an id, but a new
 * id is no longer thrown away. What the registry rows below still decide is
 * something the probe cannot — whether gmux has MEASURED how that provider
 * reports exit codes.
 */
export type SpecstoryProviderId = string;

/**
 * How this agent behaves UNDER `specstory run` (research 13 §1.1, re-measured
 * hands-on 2026-08-11 against the bundled specstory 2.8.0, and re-measured on every test run by specstory/__tests__/wrap.integration.test.ts).
 */
export interface AgentSpecstoryCapture {
  provider: SpecstoryProviderId;
  /**
   * What the wrapper's own exit status says about the agent's.
   *
   * 'exact' — the provider mirrors the child's code (`os.Exit(code)`).
   * 'collapsed' — ANY non-zero child exit arrives as 1. Measured: a child
   * exiting 42 comes back 42 through claude/cursor/gemini and 1 through
   * codex/deepseek/droid/antigravity. This is not cosmetic: Phase 12.7 death
   * forensics and Phase 13 status detection both read exit codes, so a
   * captured session in this group has a WEAKER death record than an
   * uncaptured one, and gmux records that rather than pretending otherwise.
   */
  exitCodeFidelity: 'exact' | 'collapsed';
  /** 'verified' = the fidelity above was measured, not read off source. */
  verified: 'verified' | 'unverified';
  notes?: string;
}

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
  /**
   * Environment variable NAMES read from the user's login shell at each launch
   * and each restore, and passed to that pane only (Phase 33).
   *
   * NO COMPILED ROW SETS THIS, and that is the design rather than an omission.
   * Which variables an agent needs is a fact about one person's machine, not
   * about the agent, so the route to this field is an agents.json row that
   * restates `launch.argv` and passes the confirm gate. The NAMES are hashed
   * by that gate. The VALUES are resolved fresh at every launch and are never
   * written to agents.json, to the confirm record, to the manifest or to the
   * tmux server environment.
   */
  envPassthrough?: string[];
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
  /** How the id in `template` is obtained (research 22 §2.0b). */
  idCapture: AgentIdCapture;
  /**
   * TRUE when resume only finds the conversation from the ORIGINAL cwd
   * (qwen: hard failure "No saved session found with ID"; pi: a SILENT new
   * empty session under the same id). Restore must not substitute a fallback
   * directory for these agents (research 22 §3.5).
   */
  requiresOriginalCwd?: boolean;
  /**
   * TRUE when a resume argv that LOSES its id attaches to the wrong
   * conversation instead of failing (gemini's bare `--resume` silently opens
   * the most recent session). Never emit the template with an empty slot.
   */
  bareResumeIsDangerous?: boolean;
  /**
   * WHERE the original launch flags go in the resume argv. Default 'trailing'
   * — `<bin> <template…> <extras…>` — which is what every flag-style resume
   * takes and what codex and muse accept after their subcommand.
   *
   * 'leading' for a CLI whose OPTIONS must precede its SUBCOMMAND. deepseek's
   * usage line is literally `deepseek [OPTIONS] <COMMAND> [ARGS]`, and the
   * difference is a DEAD PANE versus a restored conversation:
   *   `deepseek resume <id> --skip-onboarding`
   *      → error: unexpected argument '--skip-onboarding' found
   *   `deepseek --skip-onboarding resume <id>`
   *      → the conversation comes back (verified hands-on 2026-08-11)
   * So research 22 §3.4 rule 3 ("re-append the original extra flags") holds
   * for deepseek too; it is the POSITION that is not universal. Dropping the
   * flags instead would also have cost something real here — it is
   * `--skip-onboarding` that keeps the restored pane out of the first-run
   * workspace-trust dialog.
   */
  resumeExtrasPosition?: 'leading' | 'trailing';
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

/**
 * Where this agent comes from, and how to tell (Phase 49, research 47 §3, §5, §10).
 *
 * NOTHING HERE IS EVER RUN. Every string is display and clipboard material
 * only. There is no call site that passes any of it to a spawn, and
 * `npm run conformance:installs` plus one grep keep that true.
 *
 * The table is re-read from the providers' pages once per quarter and after
 * any agent CLI upgrade. A re-read updates `readOn` even when the command did
 * not change. The surfaces print the date, so the user is never holding a
 * stale string with no way to tell.
 */
export interface AgentInstallInfo {
  /**
   * The provider's own first-listed install command, verbatim, with the page
   * it was read from and the date it was read. Null when the provider
   * publishes no install command at all. That is muse, whose launcher script
   * is first party but not documented, and the two capture-only IDE rows.
   */
  canonical: {
    /** e.g. 'curl -fsSL https://claude.ai/install.sh | bash'. DISPLAY ONLY. */
    command: string;
    /** The https page the command was read from. */
    docUrl: string;
    /** ISO date the page was read, e.g. '2026-08-15'. */
    readOn: string;
  } | null;
  /** Other routes the provider blesses, so Tortie can say "you used X". */
  alternates: { label: string; command?: string }[];
  /** True when the provider's own first choice IS a package manager. */
  canonicalIsPackageManager: boolean;
  /** Path shapes that prove the canonical route. Null means not provable. */
  signature: InstallSignature[] | null;
}

export type InstallSignature =
  | { kind: 'realpath-under'; dir: string }   // '~/.local/share/claude/versions'
  | { kind: 'marker-file'; path: string }     // '~/.qwen/source.json'
  | { kind: 'sibling-glob'; glob: string };   // 'muse-bin-*', beside the binary

export interface AgentRegistryEntry {
  id: AgentRegistryId;
  displayName: string;
  /** 'cli' = tmux-launchable terminal agent; 'ide' = app watcher. */
  kind: 'cli' | 'ide';
  /**
   * Can gmux spawn it in a tmux pane? IDE entries are capture-only (false);
   * every CLI is launchable.
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
  /**
   * How this agent reaches a disk, per its own provider (Phase 49). REQUIRED
   * on purpose: a new registry row (grok, Phase 59) cannot compile without
   * one, and `npm run conformance:installs` checks its shape. Nothing in it
   * is ever run.
   */
  install: AgentInstallInfo;
  /** null when there is no safe subprocess probe (the capture-only IDEs). */
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
  /**
   * True when core mechanics have never been exercised on a real machine.
   * After the Phase-13.5 audit this is droid alone (not installed anywhere
   * gmux has run); pi — the field's original occupant — is now the
   * best-documented resume surface in the set.
   */
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
   * How Shift+Enter puts a NEWLINE in this agent's prompt instead of
   * submitting (Phase 12.5, research 20 §5). Absent = the capture-only IDE
   * pair, which has no prompt to type into; every launchable agent measured
   * to date takes `LF`, so a row exists to carry `verified` and the traps
   * honestly, not because the bytes differ.
   */
  multilineKey?: AgentMultilineKey;
  /**
   * How this agent's LIVE ACTIVITY is detected (Phase 13, research 18 §2.3).
   * Absent = the capture-only IDE pair, which gmux never runs in a pane.
   * The floor (tiers 1–3) runs for every session regardless; this field only
   * says which higher tier is allowed to supersede it, so a newly installed
   * CLI gmux has never seen still reports correctly on first launch.
   */
  activity?: AgentActivityProfile;
  /**
   * How this agent is CAPTURED by specstory (Phase 15). Absent = specstory
   * has no provider for it, so gmux offers no capture toggle for it — pi and
   * qwen today, plus the capture-only IDE pair gmux never launches.
   */
  specstory?: AgentSpecstoryCapture;
  notes?: string;
}

/**
 * The three agent defaults live in `@shared/agent-defaults` because the
 * renderer needs the SAME three values before (and if) the registry's table
 * ever reaches it, and it used to hold its own copies under two of these
 * names and a third one (research 25 §3, Tier 3). Re-exported here so every
 * existing `from './registry'` import site is unchanged.
 */
export { DEFAULT_IMAGE_DROP, DEFAULT_MULTILINE_KEY, LF };

/** The slot replaced by the conversation id in resume templates. */
export const SESSION_ID_SLOT = '<sessionId>';

/** Explicit default agent — NEVER pick alphabetically (research rule 8). */
export const DEFAULT_AGENT_ID: AgentRegistryId = 'claude';

// ---------------------------------------------------------------------------
// The 13 entries
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command: 'curl -fsSL https://claude.ai/install.sh | bash',
        docUrl: 'https://code.claude.com/docs/en/setup',
        readOn: '2026-08-15'
      },
      alternates: [
        { label: 'Homebrew', command: 'brew install --cask claude-code' },
        { label: 'winget', command: 'winget install Anthropic.ClaudeCode' },
        { label: 'signed apt, dnf and apk repositories' },
        { label: 'npm', command: 'npm install -g @anthropic-ai/claude-code' }
      ],
      canonicalIsPackageManager: false,
      signature: [{ kind: 'realpath-under', dir: '~/.local/share/claude/versions' }]
    },
    versionProbe: { args: ['-v'], identitySubstring: '(Claude Code)' },
    launch: {
      argv: ['claude'],
      quirks: [
        'PRE-ASSIGN: `claude --session-id <uuid>` — VERIFIED end-to-end 2026-08-10 (2.1.227): the uuid gmux passes becomes the store filename. (It appears nowhere in specstory-cli, which always harvests; that is a fact about specstory, not about claude.)'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      sessionStore: '~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl',
      notes:
        '--resume does not restore launch flags — MEASURED: --dangerously-skip-permissions gives "bypass permissions on"; after --resume it reads "auto mode on". Record the full original argv and re-append extras (claudeResumeArgv). ' +
        'Resume works from a DIFFERENT cwd (id lookup is global) — claude is the only agent with no cwd constraint. ' +
        'TRAP: `-r/--resume [value]` takes an OPTIONAL value; bare `--resume` opens a picker.'
    },
    reconstructionTarget: true,
    // pid-file registry, VERIFIED end-to-end (PROBE A + synthesis run).
    activity: { tier: 'native', native: 'claude-session-registry', animatesWhenIdle: false, hooks: 'claude-settings', verified: 'verified' },
    specstory: {
      provider: 'claude',
      exitCodeFidelity: 'exact',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 against the BUNDLED 2.8.0 (and 2.5.0 before it): children exiting 0/42/127 exit the wrapper 0/42/127, and ^C in a tmux pane leaves #{pane_dead_status}=130 — byte-identical to the unwrapped control pane. Re-measured on every run by specstory/__tests__/wrap.integration.test.ts.'
    },
    iconKey: 'claude',
    defaultHotkeyHint: 'c',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes:
        'Pane negotiates Ext 2. Also has its own ctrl+j / shift+enter / \\+Enter bindings and /terminal-setup — all untouched.'
    },
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command: 'curl https://cursor.com/install -fsS | bash',
        docUrl: 'https://cursor.com/docs/cli/installation',
        readOn: '2026-08-15'
      },
      alternates: [],
      canonicalIsPackageManager: false,
      signature: [
        { kind: 'realpath-under', dir: '~/.local/share/cursor-agent/versions' }
      ]
    },
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['cursor-agent'],
      env: { FORCE_COLOR: '1' },
      quirks: [
        'FORCE_COLOR=1 was the sole env injection for any agent until Phase 59 added grok\'s GROK_PRIVACY_NOTICE_ROLLOUT=0',
        'PRE-ASSIGN via a SIDE COMMAND: `cursor-agent create-chat` prints a fresh chat id on stdout ("Create a new empty chat and return its ID"); launching `cursor-agent --resume <that id>` starts INTO it, so the first launch and every later restore use the SAME argv. Re-verified 2026-08-11: RC=0, one bare uuid on stdout, sub-second, no store dir written until the chat has content.'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign-cmd', argv: ['create-chat'], parse: 'stdout-trim' },
      sessionStore: '~/.cursor/chats/<md5hex(cwd)>/<sessionId>/store.db',
      notes:
        'VERIFIED 2026-08-10 (2026.08.04). store.db is SQLite; the md5 is of the VERBATIM cwd string with NO trailing slash (confirmed byte-for-byte) and is one-way — a cwd can never be recovered from the dir name, so pre-assignment is the only clean capture. ' +
        'TRAP: `--resume [chatId]` takes an OPTIONAL value; bare `--resume` opens a picker. ' +
        'Flag restoration inconclusive: `--force --trust` state persisted across resume, but --trust writes to GLOBAL config, so that is config stickiness, not flag restoration. Keep re-appending extras.'
    },
    reconstructionTarget: true,
    // Not probed — floor only until someone runs the matrix on it.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    specstory: {
      provider: 'cursor',
      exitCodeFidelity: 'exact',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0): child exits 42/127 -> wrapper 42/127. Executable: specstory/__tests__/wrap.integration.test.ts.'
    },
    iconKey: 'cursor',
    defaultHotkeyHint: 'u',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes:
        'TRAP: cursor-agent SUBMITS on CSI-u, even at forced Ext 1, and inserts the literal escape text under extended-keys always.'
    },
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh',
        docUrl: 'https://learn.chatgpt.com/docs/codex/cli',
        readOn: '2026-08-15'
      },
      alternates: [
        { label: 'npm', command: 'npm install -g @openai/codex' },
        { label: 'Homebrew', command: 'brew install --cask codex' },
        { label: 'GitHub release binaries' }
      ],
      canonicalIsPackageManager: false,
      signature: [
        { kind: 'marker-file', path: '~/.codex/packages/standalone/install.lock' },
        { kind: 'realpath-under', dir: '~/.codex/packages/standalone' }
      ]
    },
    versionProbe: { args: ['--version'], fallbackArgs: ['-V'] },
    launch: {
      argv: ['codex'],
      quirks: ['honors CODEX_HOME for store location']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],
      idCapture: {
        mode: 'harvest',
        key: 'cwd-newest',
        source:
          'rollout filename uuid + line-1 session_meta cwd under ${CODEX_HOME:-~/.codex}/sessions (what gmux watches). FAST PATH AVAILABLE, NOT YET USED: ~/.codex/state_5.sqlite → threads(id, cwd, rollout_path, created_at_ms) carries id and cwd in ONE row.',
        // CORRECTION to research 22 §1.1, MEASURED 2026-08-11 on 0.147.0: a
        // trusted, fully painted codex TUI has NO rollout file and NO
        // state_5.sqlite row. Both appear tens of seconds later or at the
        // first turn — so the shipped 120 s harvest window gave up on
        // exactly the panes the user had not started talking to yet.
        availableAt: 'first-turn',
        confidence: 'exact'
      },
      sessionStore:
        '${CODEX_HOME:-~/.codex}/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl',
      notes:
        'Resume is a SUBCOMMAND, not a flag; SESSION_ID may be a UUID or a session NAME (UUIDs take precedence). Global date-sharded store; cwd attribution via line-1 session_meta. Bound watchers to ~7 days (fd-exhaustion lesson). ' +
        'NEW 2026-08-10 (0.147.0): ~/.codex/state_5.sqlite has a `threads` table carrying id, cwd, rollout_path, created_at_ms in ONE row — no JSONL parse and no cwd-attribution grace timer. gmux has NOT adopted it: the filename is version-stamped (state_5) and undocumented, so the rollout watch stays the implementation and the index is a future fast path with a schema probe in front of it. ' +
        'MEASURED, not assumed: launch flags are NOT restored — launched with --dangerously-bypass-approvals-and-sandbox the header reads "permissions: YOLO mode"; after `codex resume` that row is gone. Re-append extras. ' +
        'FIRST-RUN TRUST GATE (measured 2026-08-11, and it applies to muse too): in a directory codex has never seen it opens "Do you trust the contents of this directory?" and writes NOTHING to its store until that is answered. A harvest window has to outlive a prompt the user may not answer for an hour — gmux watches for 6 h with a backing-off poll rather than the old 120 s. ' +
        'Once the rollout exists, gmux matches it in ~12 ms (measured against a live pane). ' +
        'Fallbacks: bare `codex resume` (picker), `--last` (most recent), `--all` (disables cwd filtering).'
    },
    reconstructionTarget: true,
    // #{pane_title} 3-state oracle: 0 % FN / 0 % FP over n=156.
    activity: { tier: 'native', native: 'pane-title-oracle', animatesWhenIdle: false, verified: 'verified' },
    specstory: {
      provider: 'codex',
      exitCodeFidelity: 'collapsed',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0): child exits 42 AND 127 both -> wrapper 1. Every non-zero death of a captured codex session records as 1, so the manifest exit code is a floor, not the truth.'
    },
    iconKey: 'codex',
    defaultHotkeyHint: 'x',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes:
        'Pane stays VT10x under the shipped extended-keys-format xterm, so its native CSI-u Shift+Enter never arrives — tmux downgrades it to CR and codex submits. LF is the route that works.'
    },
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    // The provider's own first choice IS npm, so canonicalIsPackageManager is
    // true and state B never offers this command as the interpreter-free way.
    install: {
      canonical: {
        command: 'npm install -g @google/gemini-cli',
        docUrl: 'https://geminicli.com/docs/get-started/installation',
        readOn: '2026-08-15'
      },
      alternates: [
        { label: 'npx', command: 'npx @google/gemini-cli' },
        { label: 'Homebrew', command: 'brew install gemini-cli' },
        { label: 'MacPorts' },
        { label: 'conda' }
      ],
      canonicalIsPackageManager: true,
      signature: null
    },
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['gemini'],
      quirks: [
        'PRE-ASSIGN: `--session-id <uuid>` — "Start a new session with a manually provided UUID." Verified in --help and hands-on: re-run 2026-08-11 in a fresh dir wrote ~/.gemini/tmp/<basename>/chats/session-<ts>-<first8 of OUR uuid>.jsonl.'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      bareResumeIsDangerous: true,
      sessionStore: '~/.gemini/tmp/<projectDir>/chats/session-<ts>-<first8>.jsonl',
      notes:
        'STORE GLOB CORRECTED: 0.54.0 writes .jsonl, not .json — a watcher on session-*.json sees NOTHING. Both extensions coexist on disk: 11 legacy .json (all <= 2026-05, under 64-hex sha256 dirs) and 10+ .jsonl (2026-08, under basename dirs). ' +
        'projectDir is now the cwd BASENAME with a `.project_root` marker file holding the plain absolute cwd — so unlike cursor, dir -> cwd IS recoverable. Legacy sha256(canonicalCwd) dirs remain; keep the 3-tier resolution for reads. ' +
        'The FILENAME carries only the first 8 chars of the uuid; the full id is the `sessionId` field on line 1. ' +
        'TRAP: `--help` documents only "latest" or an index for --resume, but findSession() matches a FULL UUID first — the uuid template is correct despite the docs. ' +
        'WORST TRAP IN THE REGISTRY: bare `--resume` with NO value silently attaches to the MOST RECENT session instead of erroring or showing a picker. A resume argv that loses its id opens the WRONG conversation — hence bareResumeIsDangerous. ' +
        '`--session-file <path>` loads a session from an explicit file — a cwd-proof repair fallback. ' +
        'STILL OPEN (research 22 §6.2): that `--resume <uuid>` actually REPLAYS the conversation is source-verified only — the probe account returns API 400, so no marker round-trip exists yet.'
    },
    reconstructionTarget: true,
    // Auth-blocked during research; title carries no state channel.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    specstory: {
      provider: 'gemini',
      exitCodeFidelity: 'exact',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0): child exits 42/127 -> wrapper 42/127. Executable: specstory/__tests__/wrap.integration.test.ts.'
    },
    iconKey: 'gemini',
    defaultHotkeyHint: 'g',
    multilineKey: { sequence: LF, verified: true },
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command: 'curl -fsSL https://app.factory.ai/cli | sh',
        docUrl: 'https://docs.factory.ai/cli/getting-started/quickstart',
        readOn: '2026-08-15'
      },
      alternates: [
        { label: 'Homebrew', command: 'brew install --cask droid' },
        { label: 'npm', command: 'npm install -g droid' },
        { label: 'a PowerShell line on Windows' }
      ],
      canonicalIsPackageManager: false,
      signature: null
    },
    versionProbe: { args: ['--version'], postProcess: 'strip-ansi-last-line' },
    launch: { argv: ['droid'], quirks: [] },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: {
        mode: 'unverified',
        note:
          'Docs suggest `-s/--session-id <id>` pre-assignment (which would make droid the fifth Tier-1 agent), but droid is NOT INSTALLED on any machine gmux has been audited on — `command -v droid` fails and ~/.factory holds only skills/. gmux will not put an unverified flag on a launch argv: a wrong one is a dead pane. Close it by installing droid and confirming --resume/-s/--fork hands-on (research 22 §6.1).'
      },
      sessionStore: '~/.factory/sessions/<dashEncode(realpath(cwd))>/<sessionId>.jsonl',
      notes:
        'DOCS-ONLY, never exercised: identical dash-encoding to Claude Code is CLAIMED, not measured; sidecar <sessionId>.settings.json carries token usage. Every field here is upstream documentation.'
    },
    reconstructionTarget: true,
    // Not installed here; hook shape is docs-only. Floor only.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    specstory: {
      provider: 'droid',
      exitCodeFidelity: 'collapsed',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0) at the WRAPPER, which is what this field is about: child exit 42 -> wrapper 1. droid itself is still not installed anywhere gmux has been audited.'
    },
    iconKey: 'droid',
    defaultHotkeyHint: 'd',
    multilineKey: {
      sequence: LF,
      verified: false,
      notes:
        'UNVERIFIED — not installed on the probe machine. Docs mention Shift+Enter for new lines.'
    },
    imageDrop: {
      strategy: 'path-text',
      insert: 'paste',
      verified: false,
      notes: 'Not installed on the research machine — unverified, so path text.'
    },
    // The ONLY docs-only row left after the Phase-13.5 audit: droid is not
    // installed on any machine gmux has been audited on.
    unverified: true,
    notes:
      'Every field is upstream documentation. `command -v droid` fails here and ~/.factory holds only skills/, so nothing below has been exercised. Its docs suggest `-s/--session-id` pre-assignment, which would make it the fifth arm-at-launch agent — until someone installs it, gmux captures nothing for droid rather than guessing a flag.'
  },
  {
    // THE ID STAYS 'deepseek' (Phase 25.5). It is written into every manifest
    // row for one of these sessions and into the SpecStory provider mapping
    // ('deepseek' is what the bundled specstory-cli 2.8.0 answers to). Only
    // the names Tortie PROBES and the user-visible copy change.
    id: 'deepseek',
    displayName: 'CodeWhale',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main (read/launch); dev adds reconstruct+watch',
    confidence: 'high',
    // PHASE 25.5 — THE PACKAGE RENAMED ITSELF AND THE OLD ONE WENT EMPTY.
    // npm `deepseek-tui` 0.8.47 publishes NO bin field at all (verified live
    // 2026-08-13: `npm view deepseek-tui bin` prints nothing), so a fresh
    // install of the old package installs no executable. The successor is
    // npm `codewhale` (0.9.7 at edit time), which installs `codewhale` and
    // `codew`. Order is NEWEST FIRST, OLDEST LAST: a machine with only the
    // old 0.8.26 install still resolves `deepseek` (nothing regresses), a
    // fresh machine resolves `codewhale`, and a machine with both prefers
    // the binary that still receives releases. Detection, session create and
    // the resume conformance harness all walk this list in this order.
    binaries: ['codewhale', 'codew', 'deepseek'],
    extraProbeDirs: [],
    // codewhale writes ~/.codewhale/sessions and keeps ~/.deepseek/sessions
    // as a legacy fallback (its own binary carries the migration text
    // "Restored legacy `.deepseek/sessions` visibility for upgraded
    // installs"). Probe both; either existing means installed-and-in-use.
    storeDirs: ['~/.codewhale/sessions', '~/.deepseek/sessions'],
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    // The docUrl assumes the repository's default branch is `main`.
    install: {
      canonical: {
        command: 'npm install -g codewhale',
        docUrl: 'https://github.com/Hmbown/CodeWhale/blob/main/docs/INSTALL.md',
        readOn: '2026-08-15'
      },
      alternates: [
        {
          label: 'install script',
          command: 'curl -fsSL https://codewhale.net/install.sh | sh'
        },
        {
          label: 'Homebrew',
          command: 'brew tap Hmbown/deepseek-tui && brew install deepseek-tui'
        },
        { label: 'cargo', command: 'cargo install codewhale-cli --locked' },
        { label: 'prebuilt archives' }
      ],
      canonicalIsPackageManager: true,
      signature: null
    },
    versionProbe: { args: ['--version'] },
    // argv[0] mirrors binaries[0] by invariant (registry.test.ts pins it);
    // every real launch passes the RESOLVED absolute path, which on an old
    // install is still .../deepseek.
    launch: { argv: ['codewhale'], quirks: ['documented floor 0.8.39+, not enforced'] },
    resume: {
      strategy: 'flag-uuid',
      // SUBCOMMAND, not a flag — `--resume <id>` exits RC=2 (a dead pane).
      template: ['resume', SESSION_ID_SLOT],
      idCapture: {
        mode: 'harvest',
        key: 'cwd-newest',
        source: 'metadata.workspace inside ~/.deepseek/sessions/<id>.json',
        availableAt: 'first-turn',
        confidence: 'weak'
      },
      sessionStore:
        '~/.codewhale/sessions/<sessionId>.json (legacy installs: ~/.deepseek/sessions/<sessionId>.json)',
      // …and its OPTIONS precede its SUBCOMMAND (`deepseek [OPTIONS]
      // <COMMAND> [ARGS]`), so the launch flags lead rather than trail.
      resumeExtrasPosition: 'leading',
      notes:
        'PHASE 25.5 RENAME: the product is now CodeWhale (repo Hmbown/CodeWhale; author moved off the DeepSeek name). ' +
        'codewhale 0.9.7 keeps the SAME surface, checked against a scratch install 2026-08-13: usage is `codewhale [OPTIONS] <COMMAND> [ARGS]`, `resume` is still a subcommand with an opaque [ARGS] pass-through, and --skip-onboarding is still a root option — so every trap below still binds, with `codewhale` in place of `deepseek`. ' +
        'RESUME IS A SUBCOMMAND. `deepseek --resume <id>` exits RC=2 with "error: unexpected argument \'--resume <id>\' found" — a DEAD PANE. Verified 2026-08-10 against 0.8.26 hands-on and re-confirmed 2026-08-11 from `deepseek --help` (no --resume in the top-level option list; `resume` is a Command) and `deepseek resume --help` ("Resume a saved TUI session"). ' +
        'AND THE OPTIONS PRECEDE THE SUBCOMMAND (resumeExtrasPosition: leading). `deepseek resume <id> --skip-onboarding` dies the same way — "error: unexpected argument \'--skip-onboarding\' found" — because the usage is `deepseek [OPTIONS] <COMMAND> [ARGS]`. `deepseek --skip-onboarding resume <id>` restores the conversation, VERIFIED hands-on 2026-08-11 in tmux (the original turn and the agent\'s own reply were both back on screen). Keeping the flags is not cosmetic: --skip-onboarding is what stops the restored pane opening the first-run workspace-trust dialog, which a bare `deepseek resume <id>` does hit in a directory it has not seen. ' +
        "TRAP AT THE SOURCE: the CLI's own `deepseek sessions` output prints the broken advice \"Resume with: deepseek --resume <session-id>\" — do not copy it. " +
        'Flat GLOBAL store; project identity via metadata.workspace INSIDE the file, written on the first turn — so harvest is WEAK: two deepseek panes started together in one directory are not separable. ' +
        'New sibling checkpoints/ dir as of 0.8.26. ' +
        'PHASE 34 MEASURED THE PROCESS TOO, 2026-08-15 against 0.8.26, and it carries no ownership signal at all: 46 lsof samples across a live store write found no open descriptor on the store, there is no pid file and no lock file under the store root, metadata.created_at is the first turn time (28 s after the process started) rather than the session open time, checkpoints/latest.json is one global file holding a different id from the session written in the same second, snapshots/<hash> is keyed on the workspace path so every session in one folder shares it, and the CLI offers no pre-assign flag. The key stays cwd-newest and the claim it takes is takeable, per src/main/manifest/harvest/claim-strength.ts.'
    },
    reconstructionTarget: true,
    // Animates at idle (6 events/15 s) — the activity clock is unusable.
    activity: { tier: 'process', animatesWhenIdle: true, verified: 'partial' },
    specstory: {
      provider: 'deepseek',
      exitCodeFidelity: 'collapsed',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0): child exits 42/127 both -> wrapper 1. NOTE gmux never lets specstory translate deepseek resume: the CLI builds `deepseek --resume <id>`, which exits RC=2 with "unexpected argument" (research 22). gmux wraps its OWN verified resume argv in -c instead.'
    },
    iconKey: 'deepseek',
    defaultHotkeyHint: 'k',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes: 'TRAP: submits on CSI-u at VT10x and no-ops on it at forced Ext 1.'
    },
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
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    // The signature is null ON PURPOSE: the installer writes a bare Mach-O to
    // ~/.local/bin/agy with no version directory and no marker, so a
    // hand-copied binary at the same path is indistinguishable and a
    // path-only test would claim more than disk can prove.
    install: {
      canonical: {
        command: 'curl -fsSL https://antigravity.google/cli/install.sh | bash',
        docUrl: 'https://antigravity.google/docs/cli/install',
        readOn: '2026-08-15'
      },
      alternates: [],
      canonicalIsPackageManager: false,
      signature: null
    },
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
      idCapture: {
        mode: 'harvest',
        key: 'fd-owner',
        source:
          'agy descendant of the pane holds open fds under brain/<id> (lsof), grace timer as fallback',
        // NOT session-open, however plausible that looked: reproduced twice
        // 2026-08-11 — no brain/<id>/ directory appears in 45 s of an idle
        // session, and one appears immediately AFTER the first turn. The
        // wrong value also failed conformance:resume:capture, which is the
        // zero-cost gate everything else here is asked to run.
        availableAt: 'first-turn',
        confidence: 'exact'
      },
      sessionStore:
        '~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript_full.jsonl',
      notes:
        'Resume flag is --conversation, NOT --resume — VERIFIED hands-on 2026-08-10 (1.1.11). ' +
        'HARVEST IS EXACT WHILE THE PANE\'S AGY IS ALIVE (Phase 32, docs/research/40). The disk still links nothing: history.jsonl has workspace+timestamp but no id, and conversation_summaries.db is STALE SINCE MAY with workspace_uris EMPTY. The owning agy PROCESS holds open fds under brain/<id> and presence/<id>.lock and is a descendant of its pane, so the harvest confirms by process ownership. The confirm keys on the agy process specifically, never on any process holding the directory, because specstory wrappers hold read fds on EVERY conversation directory. ' +
        'Only the grace fallback is a guess (agy died before confirming). A grace claim stays provisional, so the rightful session\'s exact confirm reclaims it and the losing row is corrected. ' +
        'NOT a cross-agent resume target (real state is protobuf-in-SQLite conversations/<id>.db).'
    },
    reconstructionTarget: false,
    // Idle byte-silence VERIFIED; title is 'Mac', no state channel.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'partial' },
    specstory: {
      provider: 'antigravity',
      exitCodeFidelity: 'collapsed',
      verified: 'verified',
      notes:
        'MEASURED 2026-08-11 (bundled 2.8.0): child exits 42/127 both -> wrapper 1.'
    },
    iconKey: 'antigravity',
    defaultHotkeyHint: 'a',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes:
        'keybindings.json maps prompt.insert_newline to alt+enter / ctrl+j / shift+enter; gmux writes no agent config, so those keep working.'
    },
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
    status: 'branch-only in specstory (muse-provider = dev+5, PR #269) — but resume+capture are VERIFIED hands-on for gmux',
    confidence: 'high',
    binaries: ['muse'],
    extraProbeDirs: [],
    storeDirs: ['$XDG_DATA_HOME/muse/sessions', '~/.local/share/muse/sessions'],
    // Phase 49, research 47 §3, read 2026-08-15. The canonical is null ON
    // PURPOSE: research 47 §13 says the row ships with no command or it does
    // not ship, and muse's launcher URL is not a documented install command.
    // The sibling-glob is the one disk shape that proves the first-party
    // launcher: it keeps `muse-bin-*` copies beside the `muse` entry point.
    install: {
      canonical: null,
      alternates: [],
      canonicalIsPackageManager: false,
      signature: [{ kind: 'sibling-glob', glob: 'muse-bin-*' }]
    },
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['muse'],
      quirks: ['honors XDG_DATA_HOME for store location', 'documented floor 0.1.0+, not enforced']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],
      idCapture: {
        mode: 'harvest',
        key: 'tmux-pane',
        source:
          'payload.record.tmux_pane + tmux_socket_path in the runtime.session.route_facts record (line 2) of session.jsonl',
        availableAt: 'session-open',
        confidence: 'exact'
      },
      sessionStore:
        '${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<YYYY>/<MM>/<DD>/<sessionId>/session.jsonl',
      notes:
        'VERIFIED HANDS-ON 2026-08-10 (0.1.0). Resume is a SUBCOMMAND; root flags may sit on EITHER side of it (`muse --provider echo --yolo resume <id>` works). ' +
        'NO PRE-ASSIGNMENT on the path gmux uses: `muse exec --session-id <uuid>` is the HEADLESS subcommand; the interactive TUI rejects the flag with "invalid TUI options: error: unexpected argument \'--session-id\' found". An implementer reading only `muse exec --help` would wire a pre-assignment that cannot work in a pane. ' +
        'HARVEST KEY IS EXACT AND GMUX-SPECIFIC: muse stamps tmux_pane ("$371:@371.%372") and tmux_socket_path ("/private/tmp/tmux-501/gmux") into its own transcript at session OPEN, before any prompt — re-confirmed 2026-08-11 against six real sessions including a live gmux one, where tmux_pane matched #{session_id}:#{window_id}.#{pane_id} exactly and route_facts.pid equalled #{pane_pid}. gmux therefore correlates on the pane it spawned into, with no ambiguity even when several muse sessions share one cwd; specstory only ever matches workspace_root, which cannot. ' +
        'Session id == directory name == stream.id; cwd is payload.record.workspace_root on line 1. Exclude subagent/ subdirs. ' +
        'FULL UUID ONLY — `muse resume ec346a09` → "invalid resume session uuid". ' +
        'Resume works from ANY cwd (global store), BUT muse ADOPTS the launch cwd as the new workspace — relaunch in the original directory or the workspace silently rebinds. ' +
        'MEASURED END-TO-END 2026-08-11 through gmux\'s own watcher: id captured 261 ms after the pane was created, on the tmux_pane key, with no grace timer. ' +
        'FIRST-RUN TRUST GATE: in an unseen directory muse asks "Do you trust this workspace?" and writes NO session.jsonl until it is answered — so the harvest window must outlive an unanswered prompt. ' +
        'Fallbacks: `muse resume --last` (workspace-scoped most recent, no picker), bare `muse resume` (picker).'
    },
    reconstructionTarget: true,
    // 1 output/s while idle; ~12 s pre-first-token window needs T3.
    activity: { tier: 'process', animatesWhenIdle: true, verified: 'partial' },
    specstory: {
      provider: 'muse',
      exitCodeFidelity: 'exact',
      verified: 'unverified',
      notes:
        "Source says exact (muse_exec.go:96), but NO RELEASED CLI HAS THIS PROVIDER: measured 2026-08-11 against the bundled 2.8.0, `specstory run muse` answers \"Provider 'muse' is not a valid provider implementation\" and exits 1, and `run --help` lists nine providers without it — muse exists only on the unreleased muse-provider branch. gmux probes the real binary's provider list, so the capture toggle stays dark for muse until a CLI that actually has it is resolved."
    },
    iconKey: 'muse',
    defaultHotkeyHint: 'm',
    multilineKey: { sequence: LF, verified: true },
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
    status: 'branch-only in specstory (qwen-provider-support = dev+4, PR #268) — but resume+capture are VERIFIED hands-on for gmux',
    confidence: 'high',
    binaries: ['qwen'],
    extraProbeDirs: [],
    storeDirs: ['~/.qwen/projects'],
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command:
          'curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash',
        docUrl: 'https://github.com/QwenLM/qwen-code',
        readOn: '2026-08-15'
      },
      alternates: [
        { label: 'npm', command: 'npm install -g @qwen-code/qwen-code@latest' },
        { label: 'Homebrew', command: 'brew install qwen-code' }
      ],
      canonicalIsPackageManager: false,
      signature: [
        { kind: 'marker-file', path: '~/.qwen/source.json' },
        { kind: 'realpath-under', dir: '~/.local/lib/qwen-code' }
      ]
    },
    versionProbe: { args: ['--version'] },
    launch: {
      argv: ['qwen'],
      quirks: ['verified against qwen 0.21.7; empirical floor 0.21.0+, not enforced']
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: {
        mode: 'harvest',
        key: 'pid',
        source:
          '~/.qwen/projects/<dir>/chats/<sessionId>.runtime.json → {pid, session_id, work_dir}; pid is a DESCENDANT of the pane pid, not the pane pid itself',
        availableAt: 'session-open',
        confidence: 'exact'
      },
      requiresOriginalCwd: true,
      sessionStore: '~/.qwen/projects/<charSubstitute(realpath(cwd))>/chats/<sessionId>.jsonl',
      notes:
        'VERIFIED HANDS-ON 2026-08-10 (0.21.7). ' +
        'CORRECTION 1 — NOT A HASH: SanitizeQwenCwd replaces every char outside [a-zA-Z0-9] with "-". Real dir names are plainly readable ("-Users-gdc-painpoints"). ' +
        'CORRECTION 2 — REALPATH, NOT VERBATIM: qwen sanitizes process.cwd(), which is OS-resolved. Launched from a symlink pb-link -> pb-real, the dir created was "…-pb-real". Key on the realpath. ' +
        'CORRECTION 3 — the sibling .runtime.json is NOT noise for gmux. Ignoring it is right for RECONSTRUCTION and exactly backwards for RESUME CAPTURE: it carries {pid, session_id, work_dir} and is written at session open (measured 1.7 s after the tmux session was created). ' +
        'CORRECTION 4 (research 22 said "exact pid correlation"; MEASURED 2026-08-11 and refined): the recorded pid is NOT #{pane_pid}. qwen\'s launcher forks twice — pane_pid 1615 (cli-entry.js) -> 1622 (cli.js) -> 1644, and 1644 is what lands in runtime.json. Matching pid EQUALITY finds nothing; gmux walks the ppid chain and matches any DESCENDANT of the pane pid. ' +
        'HARD CONSTRAINT: --resume is CWD-SCOPED. From the wrong directory it fails outright ("No saved session found with ID <uuid>"). Unlike muse, the id alone is not sufficient. ' +
        'FULL UUID ONLY, and a non-id string is matched BY TITLE — a truncated id can silently resume the wrong conversation. ' +
        '`qwen sessions list` is a built-in cwd-scoped index, usable mid-session as a harvest cross-check. Fallback: `-c/--continue`; bare `-r` shows a picker. ' +
        'MEASURED END-TO-END 2026-08-11 through gmux\'s own watcher: id captured 1059 ms after the pane was created, on the descendant-pid key, with no grace timer. ' +
        'CAVEAT: `--chat-recording false` disables recording and, per its own help, "--continue/--resume will not work" — never add it to a preset.'
    },
    reconstructionTarget: true,
    // Title reads 'Qwen - pi' in every state — no channel there.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'partial' },
    iconKey: 'qwen',
    defaultHotkeyHint: 'q',
    multilineKey: { sequence: LF, verified: true },
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
    status:
      'upstream-verified-hands-on (pi 0.84.1). SpecStory v1 is READ-ONLY for pi — that is a fact about specstory-cli, NOT about pi.',
    confidence: 'high',
    binaries: ['pi'],
    extraProbeDirs: ['~/.npm-global/bin', '~/.local/bin'],
    storeDirs: [
      '$PI_CODING_AGENT_SESSION_DIR',
      // $PI_CODING_AGENT_DIR is the CONFIG dir (default ~/.pi/agent);
      // sessions live one level down. Verified in `pi --help`.
      '$PI_CODING_AGENT_DIR/sessions',
      '~/.pi/agent/sessions'
    ],
    // Phase 49, research 47 §3, read 2026-08-15. Display and clipboard only.
    install: {
      canonical: {
        command: 'curl -fsSL https://pi.dev/install.sh | sh',
        docUrl: 'https://pi.dev',
        readOn: '2026-08-15'
      },
      alternates: [
        {
          label: 'npm',
          command: 'npm install -g --ignore-scripts @earendil-works/pi-coding-agent'
        },
        { label: 'pnpm and bun, also with --ignore-scripts' }
      ],
      canonicalIsPackageManager: false,
      signature: null
    },
    // `pi -v` prints a BARE semver ("0.84.1") with no product token, so there
    // is no identitySubstring to gate on; identity comes from storeDirs.
    versionProbe: { args: ['-v'] },
    launch: {
      argv: ['pi'],
      quirks: [
        'PRE-ASSIGN: --session-id accepts ANY [A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9] id, not just a uuid.',
        'Post-spawn harvest is NOT viable: the project dir is created at launch but NO session file is written until the first turn (measured: nothing after 30 s idle; the file appears ~1.9 s after the first keystroke). A codex-style "newest file" watch would return nothing for exactly the panes nobody has talked to yet — the panes that come back empty. Pre-assignment is the only strategy that can work.',
        'First launch with a fresh id prints a yellow "Warning: No project session found with id …; creating a new session with that id." to stderr. Cosmetic — screen-scrapers must not treat it as an error.',
        'Ctrl-D quits; double Ctrl-C does NOT. "/exit" is not a command and is sent to the model.',
        '--session-id cannot be combined with --session/--continue/--resume (hard exit 1).'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      // IDENTICAL to the launch flag: --session-id is idempotent, so launch
      // argv === resume argv. The simplest case in the whole registry.
      template: ['--session-id', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      requiresOriginalCwd: true,
      sessionStore:
        '~/.pi/agent/sessions/--<cwd sans leading /, [/\\:]→->--/<ISO ts, :.→->_<sessionId>.jsonl',
      notes:
        'VERIFIED HANDS-ON, TWICE (2026-08-10 PROBE A; re-run end-to-end 2026-08-11 on pi 0.84.1 in tmux: launch with a fresh uuid -> marker turn -> kill the pane -> relaunch the IDENTICAL argv -> the marker was replayed and the "no project session" warning was gone). --session-id is BOTH pre-assignment and resume: launch argv === resume argv, idempotent. ' +
        'Model + thinking level are restored FROM the session (model_change / thinking_level_change entries) — unlike claude, they need no re-appending. ' +
        'CWD IS LOAD-BEARING: --session-id searches only the current project, so a drifted cwd silently starts an EMPTY session under the same id (the original file is untouched, but the pane looks resumed and is not). Hence requiresOriginalCwd. `pi --session <abs path>` bypasses lookup entirely and is the cwd-proof repair route. ' +
        'NEVER pass a partial id: ids are UUIDv7 whose first 8 hex chars are the top 32 bits of a 48-bit ms clock, so the prefix only changes every ~65.5 s and any two same-minute sessions in a project collide; pi resolves ties with .find(startsWith) -> most-recent-last-message, SILENTLY, and the winner can change over time. A real collision already exists in the user store. ' +
        'Interactive fallbacks only: `pi -r` / `/resume` picker, `pi -c` (most recent by mtime). `pi --session <id>` resolved in ANOTHER project BLOCKS on "Fork this session into current directory? [y/N]" — never use it in a restored pane. ' +
        'Store root precedence: --session-dir > $PI_CODING_AGENT_SESSION_DIR > $PI_CODING_AGENT_DIR/sessions > ~/.pi/agent/sessions (the first two are FLAT — no per-cwd key). ' +
        'STILL OPEN (research 22 §6.3): whether resume restores LAUNCH FLAGS is unresolved — pi also persists last-used model in settings, so the two explanations are not separated. gmux re-appends extras regardless, which is safe either way.'
    },
    // The JSONL format is documented in pi's shipped docs/session-format.md
    // and is writable, so cross-agent reconstruction can target it.
    reconstructionTarget: true,
    // Event API read from its .d.ts, never executed. Floor only.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'pi',
    defaultHotkeyHint: 'p',
    multilineKey: {
      sequence: LF,
      verified: true,
      notes:
        'Warns at launch that it wants extended-keys-format csi-u. LF works regardless; do not adopt that server option to appease it (research 20 §7.3).'
    },
    imageDrop: {
      strategy: 'path-text',
      insert: 'paste',
      verified: true,
      notes:
        'VERIFIED NEGATIVE: 0x16 writes the pasteboard image to its own temp file and inserts that path as plain text — no attachment either way, so gmux inserts the real path.'
    },
    unverified: false
  },
  {
    id: 'grok',
    displayName: 'Grok',
    kind: 'cli',
    launchable: true,
    status:
      'hands-on verified 2026-08-16 (grok 1.0.4 (d846eb93d94d) [stable]); no specstory provider',
    confidence: 'high',
    // FATAL RULE: never probe `agent`. Cursor's installer claims that name
    // (research 47), and on this machine `agent` is a STALE grok 1.0.3 even
    // though the file is grok's own. The Aug 15 auto update rewrote
    // ~/.grok/bin/grok and left ~/.grok/bin/agent on the Aug 12 download, so
    // probing `agent` reports a wrong version on top of the Cursor collision.
    binaries: ['grok'],
    extraProbeDirs: ['~/.grok/bin'],
    storeDirs: ['~/.grok/sessions'],
    // Phase 49 shape, filled in when Phase 59 rebased onto it. Research 50
    // §2.7 and §3.12, read 2026-08-16. Display and clipboard only. The
    // installer creates ~/.grok/bin/grok and symlinks it into ~/.local/bin
    // (install.sh:277 to 279), so the resolved binary's realpath lands under
    // ~/.grok/bin. There is no npm or brew route at all.
    install: {
      canonical: {
        command: 'curl -fsSL https://x.ai/cli/install.sh | bash',
        docUrl: 'https://x.ai',
        readOn: '2026-08-16'
      },
      alternates: [
        {
          label: 'Windows PowerShell',
          command: 'irm https://x.ai/cli/install.ps1 | iex'
        },
        { label: 'self update', command: 'grok update' },
        { label: 'from source, the xai-grok-pager crate' }
      ],
      canonicalIsPackageManager: false,
      signature: [{ kind: 'realpath-under', dir: '~/.grok/bin' }]
    },
    // `grok --version` prints one line, `grok 1.0.4 (d846eb93d94d) [stable]`,
    // and the distilled version is that WHOLE first line. flags.ts's
    // helpVerifiedVersion must equal it byte for byte, or every grok session
    // reads 'other-version' against the identical binary. A `['version',
    // '--json']` primary was considered and rejected in the Phase 59 spec
    // stage: it would make the distilled version, the Settings display and
    // recovery contract field 14 the raw JSON line. 'grok ' is a weak
    // identity token (any binary printing `grok <something>` passes), and the
    // row accepts that; the probe is judged on stdout alone per the Phase 48
    // rule, exactly like claude's.
    versionProbe: { args: ['--version'], identitySubstring: 'grok ' },
    launch: {
      argv: ['grok'],
      // The one env delta Tortie injects for grok, forced by a Phase 59
      // fix-round measurement (twice, the second run on an isolated socket):
      // while the first-run "Help improve Grok" data-sharing banner is on
      // screen, the TUI accepts the typed prompt and runs the turn (the
      // reply lands in updates.jsonl), but the pane NEVER paints the reply
      // (150 s of screen polls, both runs). The banner's buttons are
      // mouse-only hit rects (grok source: app/app_view.rs and app/mouse.rs
      // route them by cursor position, no key binding exists), so a
      // keyboard-driven pane cannot clear it. The banner shows whenever
      // xAI's remote privacy_notice_rollout flag is on, the account is
      // opted out of coding-data sharing (the default) and
      // ~/.grok/config.toml has no [privacy].privacy_banner_acked stamp,
      // and it RESHOWS privacy_banner_reshow_days after an ack, so one
      // answered banner is not a permanent state. This variable is read by
      // grok's production code via xai_grok_config::env_bool
      // (event_loop.rs:1035) and BEATS the remote flag in both directions.
      // Setting it to '0' keeps the banner out of Tortie panes. It changes
      // NO data-sharing state: the user stays opted out (or in) exactly as
      // before, and can decide any time in grok's own settings. Verified
      // live 2026-08-16: without it the banner is on screen in 12 s, with
      // it the welcome slot shows a normal tip and no banner appears.
      env: { GROK_PRIVACY_NOTICE_ROLLOUT: '0' },
      quirks: [
        'PRE-ASSIGN: `grok --session-id <uuid>` creates a NEW session under that id, never an upsert. Any valid UUID is accepted (a v4 from uuidgen worked; grok mints v7 for itself). Launching with an id that already EXISTS refuses immediately with the verbatim double-error line `Error: Error: Session ID <id> is already in use.` So launch argv and resume argv are different, unlike pi.',
        'FIRST RUN BANNER, corrected in the Phase 59 fix round: the "Help improve Grok" data-sharing banner leaves the typed prompt live, but the REPLY never paints while the banner is up (the turn runs and updates.jsonl gets the reply; measured twice at 150 s each). The buttons are mouse-only, so a keyboard pane cannot clear it. Tortie suppresses it with GROK_PRIVACY_NOTICE_ROLLOUT=0 in launch.env; see the comment there. If that variable ever stops working, a fresh grok session in Tortie will look mute until the banner is clicked.',
        'SELF UPDATE runs in the background and retargets ~/.grok/bin/grok while sessions run. `--no-auto-update` is ACCEPTED by 1.0.4 (exit 0) but ABSENT from its --help, measured 2026-08-16, correcting research 50 §2.2 on that cell. Tortie does NOT pass it: the manifest stores the stable symlink the resolver hit, so a retarget underneath it changes nothing Tortie depends on.',
        'NEVER set GROK_SESSION_ID. grok exports that variable TO its hook and MCP children and never reads it to select a session.'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      // requiresOriginalCwd omitted: measured false TWICE (the marker
      // roundtrip resumed from a different cwd, and the Phase 59 spec stage's
      // zero-message resume also ran from a different cwd). grok's
      // resolve_local_session_any_cwd scans every encoded cwd directory.
      bareResumeIsDangerous: true,
      sessionStore: '~/.grok/sessions/<urlencode(realpath(cwd))>/<sessionId>/',
      notes:
        'VERIFIED HANDS-ON 2026-08-16 (grok 1.0.4). Roundtrips: create with a pre-assigned uuid, marker turn, kill, then `--resume <id>` returned the marker with the same sessionId, from the SAME cwd and from a DIFFERENT cwd (the store did not move; stderr said "Session <id> found locally (originally in <original cwd>)"). ' +
        'ZERO-MESSAGE RESUME WORKS: a TUI killed before its first turn leaves a session directory with no updates.jsonl, and `--resume` of that id still exits 0 and answers (Phase 59 Q1), so a pane killed at the prompt is not lost. ' +
        'PATH ENCODING: the store key is urlencode(realpath(cwd)); grok canonicalizes the cwd BEFORE percent encoding. A TUI launched from /tmp/x stores under %2Fprivate%2Ftmp%2Fx. Key on the realpath. ' +
        'STALE ID: `--resume <unknown id>` does NOT fail fast. Online it prints "not found locally, restoring conversation from remote...", calls cli-chat-proxy.grok.com and exits 1 on a 404; offline it exits 1 in 5.0 s with a DNS error. Zero tokens either way, but a stale manifest id costs a network round trip. ' +
        'SILENT REMOTE RESTORE RISK: after a reinstall, a TUI resume of a locally deleted session may restore the conversation FROM grok.com, so a dead session can come back over the network. ' +
        'NO WHOLE-SESSION LOCK: active_sessions.json is crash recovery bookkeeping, not mutual exclusion, and grok documents concurrent same-id use as best effort. A user running `grok -c` in the same cwd can co-write a Tortie session; Tortie running one pane per session is the real guard. ' +
        'FD FACT for any future harvest rule: during a turn the grok process durably holds a WRITE fd on events.jsonl (69 consecutive lsof samples); updates.jsonl, chat_history.jsonl and summary.json were never caught open, so an fd-owner rule must target events.jsonl. ' +
        'A SESSION IS A DIRECTORY: updates.jsonl is the durable source of truth and chat_history.jsonl is a derived cache rebuilt from it, which is also why reconstructionTarget is false. ' +
        'CONFIG CHAIN, recorded here because the Context substrate has no cell for it (a stated deviation from research 50 §3.9): CLI flags, then env vars, then requirements.toml and MDM, then the GROK_CONFIG overlay, then ~/.grok/config.toml, then managed_config.toml, then built-ins; project .grok/config.toml files layer over the global one. The docs state default model grok-4.5 while the live store shows grok-4.6 (headless usage keyed grok-4.6-build).'
    },
    reconstructionTarget: false,
    // Q3 MEASURED 2026-08-16: one idle TUI on a private socket, 7
    // capture-pane snapshots at 5 s intervals over 30 s, all md5-identical,
    // pane_title `grok` at every sample. So the idle screen is byte-still and
    // the idle title is the constant string `grok`. The tier stays at the
    // floor anyway: grok OFFERS two exact-tier routes, a codex-style pane
    // title oracle (a literal `Action Required` prefix when waiting, a
    // braille spinner when busy) and Claude-schema lifecycle hooks under
    // ~/.grok/hooks. The oracle needs a Tier 3 matrix before any tier claim,
    // and the hooks would have Tortie WRITE configuration that makes grok
    // execute a Tortie-chosen command, which collides with the spirit of
    // Phase 23 refusal 8. Neither ships in Phase 59.
    activity: { tier: 'screen', animatesWhenIdle: false, verified: 'unverified' },
    iconKey: 'grok',
    defaultHotkeyHint: 'r',
    multilineKey: {
      sequence: LF,
      verified: false,
      notes:
        'UNMEASURED: the Phase 59 idle sitting typed nothing, so the Shift+Enter route has never been driven. LF is the default every measured agent takes, not a grok measurement.'
    },
    // imageDrop ABSENT: unmeasured, so DEFAULT_IMAGE_DROP (path text) applies.
    // specstory ABSENT: the bundled specstory CLI has no grok provider.
    unverified: false
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
    // Phase 49. The IDE is installed as an app, not as a CLI; there is no
    // install command to hand over and no path shape to test.
    install: {
      canonical: null,
      alternates: [],
      canonicalIsPackageManager: false,
      signature: null
    },
    versionProbe: null, // detection is store-existence, deliberately no subprocess
    launch: null,
    resume: {
      strategy: 'session-file-harvest',
      template: [],
      idCapture: { mode: 'none' },
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
    // Phase 49. The IDE is installed as an app, not as a CLI; there is no
    // install command to hand over and no path shape to test.
    install: {
      canonical: null,
      alternates: [],
      canonicalIsPackageManager: false,
      signature: null
    },
    versionProbe: null, // detection is workspaceStorage existence — no subprocess
    launch: null,
    resume: {
      strategy: 'session-file-harvest',
      template: [],
      idCapture: { mode: 'none' },
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
 * Every binary name an id may wear, in probe order (Phase 25.5).
 *
 * Detection has always walked the whole `binaries` list; the launch path and
 * the conformance harness used to resolve `binaries[0]` alone. That was fine
 * while every launchable agent had exactly one name. It stopped being fine
 * when deepseek's package renamed itself: the successor installs `codewhale`
 * and `codew`, an old install still has `deepseek`, and a resolver that only
 * knows one of those names fails on machines that have the other. Everyone
 * who turns a registry id into a program to run must try these IN ORDER and
 * take the first hit.
 */
export function agentBinaryCandidates(id: AgentRegistryId): readonly string[] {
  const bins = getRegistryEntry(id).binaries;
  if (bins.length === 0) {
    throw new Error(`Agent '${id}' has no binary name in the registry.`);
  }
  return bins;
}

/**
 * The pre-assignment flag for an agent whose id gmux fixes before spawn
 * (`['--session-id']` for claude / gemini / pi), or null for everyone else.
 * ONE place owns id injection — the registry's `launch.argv` stays slot-free
 * so nothing can ever launch a literal `--session-id '<sessionId>'`, which
 * pi's permissive id regex would happily accept and then share between every
 * pane (research 22 §2.10).
 */
export function preAssignFlag(id: LaunchableAgentId): string[] | null {
  const capture = getRegistryEntry(id).resume.idCapture;
  return capture.mode === 'pre-assign' ? [...capture.launchFlag] : null;
}

/**
 * Launch argv for a registry agent: resolved binary (or the registry's bare
 * name) + the pre-assignment flag when the agent takes one + registry args +
 * user extras.
 *
 * @param sessionId  id to pre-assign. Ignored unless the agent's idCapture is
 *                   'pre-assign' — a harvest agent must never be handed one.
 */
export function registryLaunchArgv(
  id: LaunchableAgentId,
  extraArgs: readonly string[] = [],
  bin?: string,
  sessionId?: string
): string[] {
  return launchArgvFor(getLaunchableEntry(id), extraArgs, bin, sessionId);
}

/**
 * An entry that can be launched, with its id widened.
 *
 * PHASE 23. This exists so the two argv builders below can compose an argv for
 * an agent the user's `agents.json` supplied, without this module importing
 * anything from src/main/config/. The compiled `AgentRegistryEntry` satisfies
 * it, and so does the merged entry the configuration store produces.
 */
export type LaunchableEntryLike = Omit<AgentRegistryEntry, 'id' | 'install'> & {
  id: string;
  launch: AgentLaunchInfo;
  /**
   * Phase 49. Optional and nullable HERE, required on the compiled entry. The
   * argv builders never read it, and a configured agent has no install map,
   * so demanding one would keep a merged row out of these two functions for a
   * field that decides nothing about what runs.
   */
  install?: AgentInstallInfo | null;
};

/**
 * PHASE 23: the body {@link registryLaunchArgv} always had, taking the entry
 * instead of looking it up.
 *
 * Splitting it is the whole of what let a configured agent launch. The id
 * taking function above is now four lines and every existing caller reaches
 * exactly the same code, so the argv bytes for the ten compiled agents cannot
 * have moved. `npm run conformance:agents` and
 * `npm run conformance:resume:capture` both check that they did not.
 *
 * Note what is read off the entry rather than looked up by id. The binary name
 * comes from `entry.binaries[0]`, and the pre-assignment flag comes from
 * `entry.resume.idCapture`. Neither can be resolved from an id that the
 * compiled registry has never heard of, which is why the lookups moved out.
 */
export function launchArgvFor(
  entry: LaunchableEntryLike,
  extraArgs: readonly string[] = [],
  bin?: string,
  sessionId?: string
): string[] {
  const argv0 = bin ?? entry.launch.argv[0] ?? entry.binaries[0] ?? entry.id;
  const capture = entry.resume.idCapture;
  const flag = capture.mode === 'pre-assign' ? [...capture.launchFlag] : null;
  const preAssign =
    flag !== null && sessionId !== undefined && sessionId.length > 0
      ? [...flag, sessionId]
      : [];
  return [argv0, ...entry.launch.argv.slice(1), ...preAssign, ...extraArgs];
}

/**
 * Resume argv for a registry agent from its template. Extras are re-appended
 * because resume does not restore launch flags (MEASURED on claude, codex,
 * muse and qwen — research 22 §3.4 rule 3). Returns [] when the agent has no
 * resume mechanics, and — the hardening that matters — when the id is empty
 * or the substitution failed to place it.
 *
 * The empty-id guard is not defensive programming: gemini's bare `--resume`
 * does not error and does not show a picker, it silently attaches to the
 * MOST RECENT session. An argv that loses its id opens the wrong
 * conversation, so an argv that would lose its id must never be built.
 *
 * WHERE the extras go is data, not a branch: `resume.resumeExtrasPosition`
 * puts them ahead of the template for a CLI whose options must precede its
 * subcommand (deepseek — `deepseek resume <id> --skip-onboarding` exits with
 * "unexpected argument" and leaves a DEAD PANE, while `deepseek
 * --skip-onboarding resume <id>` resumes). Both composition sites —
 * launch-time arming in manifest/agents.ts and harvest-time arming in ipc.ts
 * — go through this one function, so the rule holds everywhere.
 */
export function registryResumeArgv(
  id: LaunchableAgentId,
  sessionId: string,
  extraArgs: readonly string[] = [],
  bin?: string
): string[] {
  return resumeArgvFor(getLaunchableEntry(id), sessionId, extraArgs, bin);
}

/**
 * PHASE 23: the body {@link registryResumeArgv} always had, taking the entry.
 *
 * Every guard above is still here and none of them was relaxed for a
 * configured agent. The empty id guard, the strategy guard and the "the
 * template must have carried the slot" guard all apply the same way, which
 * matters more for a configured row than for a compiled one: a template a
 * person typed is exactly the template most likely to have lost its slot.
 */
export function resumeArgvFor(
  entry: LaunchableEntryLike,
  sessionId: string,
  extraArgs: readonly string[] = [],
  bin?: string
): string[] {
  if (entry.resume.strategy !== 'flag-uuid') return [];
  if (sessionId.length === 0) return [];
  const argv0 = bin ?? entry.binaries[0] ?? entry.id;
  const args = entry.resume.template.map((t) =>
    t === SESSION_ID_SLOT ? sessionId : t
  );
  // The template must have carried the slot; if it did not, the id is not in
  // the argv and firing it would resume someone else's conversation.
  if (!args.includes(sessionId)) return [];
  return entry.resume.resumeExtrasPosition === 'leading'
    ? [argv0, ...extraArgs, ...args]
    : [argv0, ...args, ...extraArgs];
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
 * The per-agent Shift+Enter table for the renderer (agents:multilineKeys).
 * Derived from AGENT_REGISTRY so the table exists exactly once (guardrail 3);
 * agents with no row — and every shell pane — take the fallback.
 */
export function multilineKeyTable(): MultilineKeyTable {
  const agents: MultilineKeyTable['agents'] = {};
  for (const entry of AGENT_REGISTRY) {
    if (entry.multilineKey !== undefined) agents[entry.id] = entry.multilineKey;
  }
  return { agents, fallback: DEFAULT_MULTILINE_KEY };
}

/** One agent's Shift+Enter row, falling back for shells and unknown ids. */
export function multilineKeyFor(id: string): AgentMultilineKey {
  const entry = AGENT_REGISTRY.find((e) => e.id === id);
  return entry?.multilineKey ?? DEFAULT_MULTILINE_KEY;
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
