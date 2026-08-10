/**
 * Tier-0 oracles: the agents that publish their own state (research 18 §2).
 *
 * Pure functions over facts already in hand — no I/O, no exec. Each returns
 * `null` when it cannot tell, and a null verdict always falls through to the
 * universal floor rather than guessing.
 */

import { basename } from 'node:path';
import type { ClaudeSessionEntry } from './claude-registry';
import type { ActivityVerdict } from './types';

const NATIVE = 'native' as const;

// ---------------------------------------------------------------------------
// claude — the session registry
// ---------------------------------------------------------------------------

/**
 * `busy` → working, `waiting` → needs input (with claude's own reason),
 * `idle`/`shell` → idle. `shell` means "idle with a background shell still
 * running", which is idle from the user's point of view — nothing is waiting
 * on them and no turn is in flight.
 */
export function claudeVerdict(entry: ClaudeSessionEntry): ActivityVerdict {
  switch (entry.status) {
    case 'busy':
      return { state: 'working', tier: NATIVE };
    case 'waiting':
      return {
        state: 'needs_input',
        tier: NATIVE,
        ...(entry.waitingFor !== undefined ? { reason: entry.waitingFor } : {})
      };
    default:
      return { state: 'idle', tier: NATIVE };
  }
}

// ---------------------------------------------------------------------------
// codex — the pane-title oracle
// ---------------------------------------------------------------------------

/** Braille block U+2800–U+28FF: codex's spinner frame, repainted at ~10 Hz. */
const BRAILLE = /^[⠀-⣿]/;
/** Its attention banner. Guarded by the generic dialog detector as well. */
const ACTION_REQUIRED = /\[\s*!\s*\]|Action Required/i;

/**
 * Codex publishes a complete three-state machine through OSC 0/2, which tmux
 * exposes as `#{pane_title}` for DETACHED panes at zero marginal cost:
 *
 *   idle         `work`                            (the cwd basename)
 *   working      `⠙ work`                          (braille frame)
 *   needs input  `[ ! ] Action Required | work`
 *
 * Measured 0 % FN (0/88) and 0 % FP (0/68). The braille test is structural
 * rather than a string match so a new spinner glyph cannot break it; the idle
 * case is only claimed when the title really is the cwd basename, so a pane
 * that has not yet been titled by codex (its first second, when the title is
 * still the hostname) returns null and uses the floor.
 */
export function codexTitleVerdict(
  title: string,
  cwd: string
): ActivityVerdict | null {
  const t = title.trim();
  if (t.length === 0) return null;
  if (ACTION_REQUIRED.test(t)) return { state: 'needs_input', tier: NATIVE };
  if (BRAILLE.test(t)) return { state: 'working', tier: NATIVE };
  if (t === basename(cwd)) return { state: 'idle', tier: NATIVE };
  return null;
}

// ---------------------------------------------------------------------------
// shells — DECKPAM
// ---------------------------------------------------------------------------

/**
 * zsh's ZLE sends `smkx` (DECKPAM) at every line-init and `rmkx` on submit,
 * and tmux tracks it, so `#{keypad_flag}` reads prompt state for a DETACHED
 * pane. Confirmed on all five of the user's live shells.
 *
 *   alternate_on == 1  a full-screen app owns the terminal → never "working"
 *   keypad_flag  == 1  sitting at the prompt                → idle
 *   otherwise                                               → working
 *
 * A shell that never sets DECKPAM (bash + readline, where `enable-keypad` is
 * off by default) would otherwise read as permanently working, so the caller
 * only trusts this once the flag has been observed at least once on that
 * pane — see `shellSpeaksKeypad`. Shells never demand attention: no shell
 * path returns `needs_input`.
 */
export function shellVerdict(
  keypad: boolean,
  alternate: boolean
): ActivityVerdict {
  if (alternate || keypad) return { state: 'idle', tier: NATIVE };
  return { state: 'working', tier: NATIVE };
}
