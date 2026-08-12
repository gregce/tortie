/**
 * The three agent defaults BOTH processes have to agree on.
 *
 * Main's registry is the source of truth for per-agent rows, but the renderer
 * needs an answer before the table arrives over IPC (and on any older preload
 * where it never arrives at all), so it shipped its own copies of exactly
 * these three values — one of them under a different name
 * (`FALLBACK_IMAGE_DROP`), one of them under the SAME exported name in a
 * second module (research 25 §3, Tier 3). Two constants that must be equal,
 * declared twice, are a divergence waiting for the day someone edits one:
 * a renderer fallback that disagrees with main's fallback means an agent gets
 * a keystroke or a paste strategy that was never measured for it.
 *
 * So they are declared once, here, and re-exported from both sides under the
 * names their import sites already use. Values only — no electron, no node,
 * no React — so either process can import it.
 *
 * The field notes stay attached to the constants: they are the reason the
 * values are what they are.
 */

import type { AgentImageDrop, AgentMultilineKey } from './types';

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

/**
 * ASCII line feed — what ⌃J sends, and the ONE sequence that inserted a
 * newline on 10 of 10 installed agents (docs/research/20-shift-enter.md,
 * 2026-08-10, tmux 3.6a). Two traps are recorded here so nobody re-discovers
 * them by shipping a regression:
 *
 *  - **Never send CSI-u** (`ESC[13;2u` / `ESC[27;2;13~`). For a pane that
 *    never negotiated extended keys — `#{pane_key_mode}` = `VT10x`, which is
 *    most of them — tmux rewrites modified-Enter to a bare `CR`, so CSI-u
 *    SUBMITS the user's half-written prompt on 6 of 10 agents. That is the
 *    single worst failure this feature can produce.
 *  - **Never send `ESC CR`.** The two independent probes disagree on pi and
 *    on deepseek, and one of each pair is a submit.
 *
 * Shift+Enter therefore produces the same bytes as ⌃J deliberately: ⌃J *is*
 * the newline gesture these TUIs implement, so Shift+Enter can only ever
 * behave exactly as ⌃J already does on that agent. Plain Enter is untouched.
 */
export const LF = '\n';

/**
 * What an agent with no `multilineKey` row gets, and what a plain shell gets.
 * `verified` is false because an *unknown* agent is by definition unmeasured
 * — the registry rows are the verified ones.
 *
 * Measured for a shell, though the shell has no registry row: LF at a zsh
 * prompt is readline accept-line, identical to Enter with no stray
 * characters, so Shift+Enter in a shell does what it has always done.
 *
 * FIELD LOG for two agents the registry does not carry yet (research 20 §5),
 * both of which take this default today:
 *  - `amp` — UNVERIFIED; the pane exits immediately unauthenticated on the
 *    probe machine. Its only documented Shift+Enter route is a kitty-gated
 *    CSI-u that tmux 3.6a will never deliver, so LF is likely the only thing
 *    that can ever work. Docs say ⌃J inserts a newline in any terminal.
 *  - `opencode` — `input_newline` already binds shift+return, ctrl+return,
 *    alt+return and ctrl+j.
 */
export const DEFAULT_MULTILINE_KEY: AgentMultilineKey = {
  sequence: LF,
  verified: false
};
