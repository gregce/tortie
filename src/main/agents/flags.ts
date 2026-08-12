/**
 * Per-agent launch-flag presets (Phase 10 item 8 — BACKLOG).
 *
 * Catalogs each agent CLI's autonomy/convenience flags so the create-session
 * modal can render them as toggles (danger-styled for permission-skipping
 * flags, off by default) and Settings can persist per-agent defaults.
 *
 * Evidence discipline (docs/research/14-agent-flags.md is the field log):
 *  - provenance 'VERIFIED'  = the exact flag (and any fixed value) was seen in
 *    `<bin> --help` output ON THIS MACHINE on 2026-08-09; the CLI version it
 *    was verified against is recorded in `helpVerifiedVersion`.
 *  - provenance 'RESEARCH' = claimed by research docs / BACKLOG but NOT
 *    present in the installed build's help output — surface with caution and
 *    re-verify when the detection service sees a new CLI version.
 *
 * Resume semantics: every cataloged CLI treats these flags as per-invocation
 * (nothing persists them into the session store), so a preset the user chose
 * at launch must be re-passed on the resume argv to keep its behavior. The
 * per-catalog `resumeRepass` field records whether the installed build's help
 * output *proved* the flags are accepted alongside its resume form
 * ('required-verified'), or whether that acceptance is inferred/unknown
 * ('required-unverified' / 'unverified').
 *
 * Ownership: src/main/agents/flags.ts (Phase 10 flag-catalog builder).
 * Pure data + tiny helpers; no Electron imports so it unit-tests standalone.
 * Keyed by registry id (docs/research/11-agent-registry.md §2); the ids stay
 * string-literal here so the module has no dependency on the Phase 10
 * registry module — the integrator can tighten the key type when both land.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Launchable registry ids (docs/research/11-agent-registry.md §2). */
export type RegistryAgentId =
  | 'claude'
  | 'cursor'
  | 'codex'
  | 'gemini'
  | 'droid'
  | 'deepseek'
  | 'antigravity'
  | 'muse'
  | 'qwen'
  | 'pi';

/** Where knowledge of a flag comes from. */
export type FlagProvenance =
  /** Seen verbatim in `<bin> --help` on this machine (see helpVerifiedVersion). */
  | 'VERIFIED'
  /** Research-doc/BACKLOG claim only — absent from the installed build's help. */
  | 'RESEARCH';

/**
 * Whether presets chosen at launch must also appear on the resume argv.
 * All cataloged CLIs treat flags as per-invocation, so "keep behavior on
 * resume" always means re-passing; the distinction here is whether the help
 * output PROVED the resume form accepts these flags.
 */
export type ResumeRepass =
  /** Help text explicitly shows the flags compose with the resume form. */
  | 'required-verified'
  /**
   * Re-pass is required to keep behavior, but the installed build's help did
   * not explicitly demonstrate the combination (e.g. flag + resume are both
   * root options so composition is syntactic, or the resume subcommand is an
   * undocumented pass-through).
   */
  | 'required-unverified'
  /** Resume mechanics themselves are unverified for this CLI. */
  | 'unverified';

export interface FlagPreset {
  /**
   * Exact argv token(s), space-separated when the flag takes a fixed value
   * (e.g. "--sandbox danger-full-access"); one preset can therefore be more
   * than one argv token.
   */
  flag: string;
  /** Short toggle label for the create-session modal / Settings. */
  label: string;
  /** One-sentence explanation (help-text derived where VERIFIED). */
  description: string;
  /**
   * true = skips permission/approval/sandbox protections; the UI renders
   * these danger-styled and they default OFF everywhere.
   */
  danger: boolean;
  provenance: FlagProvenance;
}

export interface AgentFlagCatalog {
  /** Binary the flags apply to (registry `binaries[0]`). */
  binary: string;
  /**
   * Version string of the build whose --help was inspected on this machine,
   * or null when the binary is not installed here (all presets then carry
   * provenance 'RESEARCH' by construction).
   */
  helpVerifiedVersion: string | null;
  /** Per-CLI answer to "must presets also ride the resume argv?". */
  resumeRepass: ResumeRepass;
  /** How resume composition was (or wasn't) verified, in one sentence. */
  resumeNote: string;
  presets: FlagPreset[];
  /**
   * Value-taking flags worth surfacing later (model pickers etc.) that don't
   * fit an on/off toggle — kept as breadcrumbs for the Settings build-out.
   */
  valueFlagNotes?: string[];
}

// ---------------------------------------------------------------------------
// Catalogs — registry agents
// ---------------------------------------------------------------------------

/**
 * Flag presets for launchable registry agents.
 * cursoride/copilotide are capture-only (kind 'ide') and have no entry.
 */
export const AGENT_FLAG_PRESETS: Record<RegistryAgentId, AgentFlagCatalog> = {
  claude: {
    binary: 'claude',
    helpVerifiedVersion: '2.1.226 (Claude Code)',
    resumeRepass: 'required-verified',
    resumeNote:
      '`--resume` does NOT restore launch flags (research 02; manifest already re-passes extras). All presets are root options on the same argv as -r/--resume, so composition is shown by the option table itself.',
    presets: [
      {
        flag: '--dangerously-skip-permissions',
        label: 'Skip all permissions',
        description:
          'Bypass all permission checks. Recommended only for sandboxes with no internet access.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--allow-dangerously-skip-permissions',
        label: 'Allow bypass as an option',
        description:
          'Makes bypassing permission checks available in-session without enabling it by default.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--permission-mode acceptEdits',
        label: 'Auto-accept edits',
        description:
          'Start in acceptEdits permission mode: file edits are approved automatically, other tools still prompt.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--permission-mode plan',
        label: 'Plan mode',
        description: 'Start in plan (read-only planning) permission mode.',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: [
      '--model <alias|full-name> (fable/opus/sonnet aliases)',
      '--effort <low|medium|high|xhigh|max>',
      '--permission-mode also accepts auto|manual|dontAsk|bypassPermissions (bypassPermissions is danger-equivalent)'
    ]
  },

  cursor: {
    binary: 'cursor-agent',
    helpVerifiedVersion: '2025.09.18-7ae6800',
    resumeRepass: 'required-unverified',
    resumeNote:
      '`--resume [chatId]` and -f/--force are both root options, so they share one argv; the help shows no explicit combined example, and the bare `cursor-agent resume` subcommand documents no options at all.',
    presets: [
      {
        flag: '--force',
        label: 'Force-allow commands',
        description:
          'Force allow commands unless explicitly denied — commands run without per-command confirmation.',
        danger: true,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: ['--model <model> (e.g. gpt-5, sonnet-4, sonnet-4-thinking)']
  },

  codex: {
    binary: 'codex',
    helpVerifiedVersion: 'codex-cli 0.147.0',
    resumeRepass: 'required-verified',
    resumeNote:
      '`codex resume --help` re-lists -s/--sandbox, -a/--ask-for-approval, --approve-for-me and --dangerously-bypass-approvals-and-sandbox, so the resume subcommand verifiably accepts every preset; flags are per-invocation and must be re-passed.',
    presets: [
      {
        flag: '--dangerously-bypass-approvals-and-sandbox',
        label: 'Bypass approvals + sandbox',
        description:
          'Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS (help text verbatim) — for externally sandboxed environments only.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--yolo',
        label: 'YOLO (legacy alias)',
        description:
          'Historic alias for --dangerously-bypass-approvals-and-sandbox. NOT present in codex-cli 0.147.0 --help on this machine — prefer the long flag; re-verify per version.',
        danger: true,
        provenance: 'RESEARCH'
      },
      {
        flag: '--full-auto',
        label: 'Full auto (legacy)',
        description:
          'Legacy convenience for sandboxed auto-execution (≈ -a on-failure --sandbox workspace-write). NOT present in codex-cli 0.147.0 --help — use the sandbox/approval presets instead.',
        danger: false,
        provenance: 'RESEARCH'
      },
      {
        flag: '--sandbox workspace-write',
        label: 'Sandbox: workspace-write',
        description:
          'Sandbox policy allowing writes inside the workspace (choices: read-only, workspace-write, danger-full-access).',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--sandbox danger-full-access',
        label: 'Sandbox: full access',
        description: 'Disables sandboxing of model-generated shell commands (danger-full-access).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--ask-for-approval never',
        label: 'Never ask approval',
        description:
          'Never ask for user approval; execution failures return to the model (choices: untrusted, on-request, never).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approve-for-me',
        label: 'Auto-review approvals',
        description:
          'Route approval requests through automatic review using the workspace-write sandbox.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--search',
        label: 'Web search',
        description: 'Enable live web search (native web_search tool, no per-call approval).',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: [
      '-m/--model <model>',
      '-p/--profile <name> layers $CODEX_HOME/<name>.config.toml',
      '-c/--config key=value ad-hoc config overrides'
    ]
  },

  gemini: {
    binary: 'gemini',
    helpVerifiedVersion: '0.54.0',
    resumeRepass: 'required-unverified',
    resumeNote:
      '-r/--resume is a root flag sharing one argv with all presets (yargs option table); no combined example in help, and approval flags are per-invocation so re-pass to keep behavior.',
    presets: [
      {
        flag: '--yolo',
        label: 'YOLO mode',
        description: 'Automatically accept all actions (aka YOLO mode).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approval-mode yolo',
        label: 'Approval: yolo',
        description:
          'Auto-approve all tools (choices: default, auto_edit, yolo, plan). Equivalent to --yolo.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approval-mode auto_edit',
        label: 'Auto-approve edits',
        description: 'Auto-approve edit tools only; other tools still prompt.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approval-mode plan',
        label: 'Plan (read-only)',
        description: 'Read-only planning mode.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--sandbox',
        label: 'Sandbox',
        description: 'Run inside Gemini CLI’s sandbox (safety-increasing).',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--skip-trust',
        label: 'Skip trust prompt',
        description:
          'Trust the current workspace for this session — suppresses the interactive trust dialog (useful inside gmux panes, but silently extends trust).',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: ['-m/--model <model>', '--session-id <uuid> pre-assigns the session UUID (0.54.0)']
  },

  droid: {
    binary: 'droid',
    helpVerifiedVersion: null, // NOT INSTALLED on this machine 2026-08-09 — nothing could be verified
    resumeRepass: 'unverified',
    resumeNote:
      'droid is not installed here and the research docs (11-agent-registry) record only launch/resume argv, no autonomy flags — populate this catalog when the detection service finds a droid binary.',
    presets: []
  },

  deepseek: {
    binary: 'deepseek',
    helpVerifiedVersion: 'v0.8.26 (npm wrapper, Hmbown/DeepSeek-TUI)',
    resumeRepass: 'required-unverified',
    resumeNote:
      '`deepseek resume --help` documents only an opaque [ARGS]... pass-through to the TUI binary; whether root flags like --approval-policy are honored there is UNVERIFIED.',
    presets: [
      {
        flag: '--skip-onboarding',
        label: 'Skip onboarding',
        description: 'Skip the first-run onboarding flow.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approval-policy never',
        label: 'Never ask approval',
        description:
          'The --approval-policy flag is VERIFIED in --help but its value list is undocumented; "never" is inferred from the codex-derived design — re-verify before surfacing.',
        danger: true,
        provenance: 'RESEARCH'
      },
      {
        flag: '--sandbox-mode danger-full-access',
        label: 'Sandbox: full access',
        description:
          'The --sandbox-mode flag is VERIFIED in --help but its value list is undocumented; "danger-full-access" is inferred from the codex-derived design — re-verify before surfacing.',
        danger: true,
        provenance: 'RESEARCH'
      }
    ],
    valueFlagNotes: [
      '--model <model>, --provider <deepseek|openai|openrouter|…>',
      'Installed build v0.8.26 is BELOW the registry’s documented 0.8.39+ floor'
    ]
  },

  antigravity: {
    binary: 'agy',
    helpVerifiedVersion: '1.0.2',
    resumeRepass: 'required-unverified',
    resumeNote:
      '--conversation <id> (agy’s resume flag) and --dangerously-skip-permissions are both root flags on one argv; no combined example in help. Installed 1.0.2 predates the registry’s documented 1.1.5+ floor.',
    presets: [
      {
        flag: '--dangerously-skip-permissions',
        label: 'Skip all permissions',
        description: 'Auto-approve all tool permission requests without prompting.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--sandbox',
        label: 'Sandbox',
        description: 'Run in a sandbox with terminal restrictions enabled (safety-increasing).',
        danger: false,
        provenance: 'VERIFIED'
      }
    ]
  },

  muse: {
    binary: 'muse',
    helpVerifiedVersion: 'Muse Code 0.1.0 (0.1.0-R708.1)',
    resumeRepass: 'required-verified',
    resumeNote:
      '`muse resume --help` states root options "may appear on either side of resume", so presets verifiably compose with the resume subcommand; per-run flags must be re-passed.',
    presets: [
      {
        flag: '--yolo',
        label: 'YOLO mode',
        description:
          'Disable approval and sandboxing and trust this workspace for this run (approval + sandbox are ON by default).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--approval-mode never',
        label: 'Never ask approval',
        description: 'Tool approval mode "never" (choices: untrusted, on-request, never).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--disable-approval',
        label: 'Disable approval prompts',
        description: 'Disable tool approval prompts for this workspace run (sandbox stays on).',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--disable-sandbox',
        label: 'Disable sandbox',
        description: 'Disable shell filesystem/network sandboxing for this run.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--trust-workspace',
        label: 'Trust workspace',
        description:
          'Trust this workspace for this run (loads its skills and rules); does not persist trust.',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: [
      '--reasoning-effort <none|minimal|low|medium|high|xhigh|ultra> (default high)',
      '--sandbox-network <restricted|enabled|proxy-only> loosens/tightens sandbox networking',
      '--model <model>, --provider <echo|meta>'
    ]
  },

  qwen: {
    binary: 'qwen',
    helpVerifiedVersion: '0.21.7',
    resumeRepass: 'required-unverified',
    resumeNote:
      '-r/--resume is a root flag sharing one argv with the presets; no combined example in help. NOTE: no autonomy flag exists in this build’s help at all — see the RESEARCH presets.',
    presets: [
      {
        flag: '--sandbox',
        label: 'Sandbox',
        description: 'Run in Qwen Code’s sandbox (safety-increasing).',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--yolo',
        label: 'YOLO mode',
        description:
          'Gemini-derived auto-accept-everything flag. ABSENT from qwen 0.21.7 --help on this machine — do not surface until a build documents it.',
        danger: true,
        provenance: 'RESEARCH'
      },
      {
        flag: '--approval-mode yolo',
        label: 'Approval: yolo',
        description:
          'Gemini-derived approval-mode flag. ABSENT from qwen 0.21.7 --help on this machine — do not surface until a build documents it.',
        danger: true,
        provenance: 'RESEARCH'
      }
    ],
    valueFlagNotes: ['-m/--model <model>', '--fallback-model <models> (repeatable, max 3)']
  },

  pi: {
    binary: 'pi',
    helpVerifiedVersion: '0.79.1',
    resumeRepass: 'required-unverified',
    resumeNote:
      'pi 0.79.1 HAS resume flags in --help (-c/--continue, -r/--resume picker, --session <path|id>, --session-id <id>) — richer than the registry’s "strategy: none"; all are root flags on one argv with the presets. No approval/permission system appears in help: pi tools run unprompted, so restrict via --tools instead.',
    presets: [
      {
        flag: '--tools read,grep,find,ls',
        label: 'Read-only tools',
        description:
          'Restrict to read-only built-in tools (help’s own "Read-only mode" example) — pi has no approval prompts, so tool allowlisting is its safety lever.',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--no-session',
        label: 'Ephemeral (no session file)',
        description: 'Don’t save the session to disk (nothing to resume).',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: [
      '--thinking <off|minimal|low|medium|high|xhigh>',
      '--provider <name> / --model <pattern>',
      '--session-dir <dir> (overrides PI_CODING_AGENT_SESSION_DIR)'
    ]
  }
};

// ---------------------------------------------------------------------------
// Catalogs — installed CLIs OUTSIDE the registry
// ---------------------------------------------------------------------------

/**
 * CLIs present on this machine that SpecStory (and hence the registry) cannot
 * drive — cataloged per BACKLOG item 8 ("amp, etc.") so the flags are ready
 * the day these become launchable agents. NOT consumed by the create-session
 * modal while they remain outside the registry.
 */
export const NON_REGISTRY_FLAG_PRESETS: Record<string, AgentFlagCatalog> = {
  amp: {
    binary: 'amp',
    helpVerifiedVersion: '0.0.1760564853-ge9bf1d',
    resumeRepass: 'required-verified',
    resumeNote:
      '`amp threads continue --help` re-lists --dangerously-allow-all under "Global options", so the resume path verifiably accepts it.',
    presets: [
      {
        flag: '--dangerously-allow-all',
        label: 'Allow all commands',
        description:
          'Disable all command confirmation prompts (agent executes all commands without asking).',
        danger: true,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: ['resume form is `amp threads continue [threadId]` (a subcommand, no --resume flag)']
  },

  opencode: {
    binary: 'opencode',
    helpVerifiedVersion: '1.18.14',
    resumeRepass: 'required-unverified',
    resumeNote:
      'Resume is via root flags -c/--continue or -s/--session <id> (+ --fork), sharing one argv with --auto; no combined example in help.',
    presets: [
      {
        flag: '--auto',
        label: 'Auto-approve permissions',
        description:
          'Auto-approve permissions that are not explicitly denied (help text marks it "dangerous!").',
        danger: true,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: ['-m/--model provider/model', '--agent <agent>']
  },

  copilot: {
    binary: 'copilot',
    helpVerifiedVersion: 'GitHub Copilot CLI 1.0.78',
    resumeRepass: 'required-verified',
    resumeNote:
      'Help shows the combination verbatim: "# Resume with auto-approval / $ copilot --allow-all-tools --resume". Note: a real `copilot` terminal CLI exists here even though SpecStory’s "copilot" means only VS Code Copilot chat (copilotide).',
    presets: [
      {
        flag: '--yolo',
        label: 'YOLO (allow everything)',
        description:
          'Enable all permissions — equivalent to --allow-all-tools --allow-all-paths --allow-all-urls.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--allow-all-tools',
        label: 'Allow all tools',
        description:
          'All tools run automatically without confirmation (env: COPILOT_ALLOW_ALL); required for non-interactive mode.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--allow-all-paths',
        label: 'Allow all paths',
        description: 'Disable file path verification and allow access to any path.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--allow-all-urls',
        label: 'Allow all URLs',
        description: 'Allow access to all URLs without confirmation.',
        danger: true,
        provenance: 'VERIFIED'
      },
      {
        flag: '--autopilot',
        label: 'Autopilot mode',
        description:
          'Start in autopilot mode (agent self-continues, still permission-gated; cap with --max-autopilot-continues).',
        danger: false,
        provenance: 'VERIFIED'
      },
      {
        flag: '--no-ask-user',
        label: 'No questions',
        description: 'Disable the ask_user tool — the agent works autonomously without asking questions.',
        danger: false,
        provenance: 'VERIFIED'
      }
    ],
    valueFlagNotes: [
      '--mode <interactive|plan|autopilot>',
      '--model <model|auto>, --effort <none…max>',
      '--session-id <uuid> pre-assigns a NEW session UUID (claude-style)'
    ]
  }
};

// ---------------------------------------------------------------------------
// Why there are no helpers here
// ---------------------------------------------------------------------------
//
// This file used to end with four exported helpers — `getFlagCatalog`,
// `verifiedPresets`, `presetArgs` and `appendPresets` — and NOTHING in the app
// called any of them (research 25 §5.1). They were a second, dead
// implementation of "checked presets → argv": the live one is in the renderer
// (CreateSessionModal builds `extraArgs`, state/store.ts passes them), and
// main's real surface over this data is `getFlagCatalogViews()` in
// settings/ipc.ts, which builds its own wire view. Deleting them removes the
// copy that could have disagreed with the shipping one.
//
// `NON_REGISTRY_FLAG_PRESETS` above stays deliberately: it is parked data for
// BACKLOG item 8 (the day amp et al. become launchable), not a dead symbol.
// It lost its only reader with `getFlagCatalog`, which is why this note is
// here rather than a `knip` entry telling a future agent to delete it.
