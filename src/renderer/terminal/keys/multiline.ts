/**
 * How Shift+Enter reaches an agent's prompt — Phase 12.5.
 *
 * A terminal sends a bare `CR` for Enter AND for Shift+Enter: xterm.js 6 does
 * not encode the modifier (`evaluateKeyboardEvent`, keyCode 13, ignores the
 * modifier mask it just computed), which is why Claude Code ships
 * `/terminal-setup` to patch other terminals' keymaps. gmux owns its terminal,
 * so it can produce the newline itself — this table says with which bytes.
 *
 * MEASURED (docs/research/20-shift-enter.md, 2026-08-10, tmux 3.6a):
 * `LF` (0x0a, i.e. ⌃J) is the ONLY sequence that inserted a newline on 10 of
 * 10 installed agents, across two independent probes that disagree about every
 * other candidate. Two traps are recorded here so nobody re-discovers them:
 *
 *  - **Never send CSI-u** (`ESC[13;2u` / `ESC[27;2;13~`). For a pane that never
 *    negotiated extended keys — `#{pane_key_mode}` = `VT10x`, which is most of
 *    them — tmux rewrites modified-Enter to a bare `CR`, so CSI-u SUBMITS the
 *    user's half-written prompt on 6 of 10 agents. That is the single worst
 *    failure this feature can produce.
 *  - **Never send `ESC CR`.** The two probes disagree on pi and on deepseek,
 *    and one of each pair is a submit.
 *
 * Shift+Enter therefore produces the same bytes as ⌃J, deliberately: ⌃J *is*
 * the newline gesture these TUIs implement (Claude Code, Amp, Antigravity and
 * opencode all document it), so Shift+Enter can only ever behave exactly as
 * ⌃J already does on that agent. Nothing about plain Enter changes.
 *
 * INTEGRATOR (Phase 13 owns src/main/agents/registry.ts right now): this table
 * is the DATA for an `AgentRegistryEntry.multilineKey` field, and belongs there
 * beside `imageDrop` — same shape, same `DEFAULT_*` constant, same
 * IPC-primed renderer cache (`src/renderer/terminal/drop/strategy.ts`) once the
 * registry is free. Keyed by registry id as a plain string exactly like
 * `src/main/agents/flags.ts`, so this module needs no registry import; tighten
 * the key type to `AgentRegistryId` when the two land together. `amp`,
 * `opencode` and `droid` are measured/documented rows for ids the registry does
 * not carry yet — keep them, they are the field log.
 */

/**
 * ASCII line feed — what ⌃J sends. The one newline every agent understands,
 * and (in a shell) indistinguishable from Enter to readline.
 */
export const LF = '\n';

/** How Shift+Enter reaches one agent's prompt. */
export interface AgentMultilineKey {
  /**
   * The literal bytes Shift+Enter writes into the pane. `null` means this
   * agent has no multiline input, so gmux leaves the key alone rather than
   * risk a stray submit — see `multilineSequenceFor`.
   */
  sequence: string | null;
  /** true = a newline was observed hands-on (research 20 §5). */
  verified: boolean;
  notes?: string;
}

/**
 * What an agent with no row gets, and what a plain shell gets. `verified` is
 * false because an *unknown* agent is by definition unmeasured — the ten rows
 * below are the verified ones.
 */
export const DEFAULT_MULTILINE_KEY: AgentMultilineKey = {
  sequence: LF,
  verified: false
};

/**
 * The measured matrix. Every installed agent takes the default sequence; the
 * rows exist to carry `verified` honestly and to record the traps. A future
 * agent that binds ⌃J to something else is one row here, not a code change.
 */
const MULTILINE_KEYS: Readonly<Record<string, AgentMultilineKey>> = {
  claude: {
    sequence: LF,
    verified: true,
    notes:
      'Pane negotiates Ext 2. Also has its own ctrl+j / shift+enter / \\+Enter bindings and /terminal-setup — all untouched.'
  },
  codex: {
    sequence: LF,
    verified: true,
    notes:
      'Pane stays VT10x under the shipped extended-keys-format xterm, so its native CSI-u Shift+Enter never arrives — tmux downgrades it to CR and codex submits. LF is the route that works.'
  },
  cursor: {
    sequence: LF,
    verified: true,
    notes:
      'TRAP: cursor-agent SUBMITS on CSI-u, even at forced Ext 1, and inserts the literal escape text under extended-keys always.'
  },
  gemini: { sequence: LF, verified: true },
  deepseek: {
    sequence: LF,
    verified: true,
    notes: 'TRAP: submits on CSI-u at VT10x and no-ops on it at forced Ext 1.'
  },
  antigravity: {
    sequence: LF,
    verified: true,
    notes:
      "keybindings.json maps prompt.insert_newline to alt+enter / ctrl+j / shift+enter; gmux writes no agent config, so those keep working."
  },
  muse: { sequence: LF, verified: true },
  qwen: { sequence: LF, verified: true },
  pi: {
    sequence: LF,
    verified: true,
    notes:
      'Warns at launch that it wants extended-keys-format csi-u. LF works regardless; do not adopt that server option to appease it (research 20 §7.3).'
  },
  opencode: {
    sequence: LF,
    verified: true,
    notes:
      'input_newline already binds shift+return, ctrl+return, alt+return and ctrl+j.'
  },
  amp: {
    sequence: LF,
    verified: false,
    notes:
      'UNVERIFIED — the pane exits immediately unauthenticated on the probe machine. Its only documented Shift+Enter route is a kitty-gated CSI-u that tmux 3.6a will never deliver, so LF is likely the only thing that can ever work here. Docs say ⌃J inserts a newline in any terminal.'
  },
  droid: {
    sequence: LF,
    verified: false,
    notes: 'UNVERIFIED — not installed on the probe machine. Docs mention Shift+Enter for new lines.'
  },
  shell: {
    sequence: LF,
    verified: true,
    notes:
      'Not an agent. LF at a zsh prompt is readline accept-line — measured identical to Enter, no stray characters — so Shift+Enter in a shell does what it has always done.'
  }
};

/**
 * The bytes Shift+Enter should write for this session's agent, or `null` when
 * the agent has no multiline input and Enter must be left entirely alone.
 *
 * `agent` is the value on Session.agent, which at runtime carries the full
 * registry id even though the frozen type says AgentKind (research 16 §2.1) —
 * hence the string parameter and the tolerant lookup, matching `imageDropFor`.
 */
export function multilineSequenceFor(agent: string): string | null {
  return (MULTILINE_KEYS[agent] ?? DEFAULT_MULTILINE_KEY).sequence;
}

/** The whole row — for tests and for the integrator's registry merge. */
export function multilineKeyFor(agent: string): AgentMultilineKey {
  return MULTILINE_KEYS[agent] ?? DEFAULT_MULTILINE_KEY;
}
