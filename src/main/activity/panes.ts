/**
 * Tier 1 — the one tmux exec (Phase 13, research 18 §4.1).
 *
 * A single `list-panes -a` reads every fact the always-on tier needs, for
 * every session at once, whether or not a client is attached. Measured
 * against the user's own 16-pane server: 4.54 ms wall / 2.75 ms CPU, one
 * process regardless of session count.
 *
 * Field notes that are load-bearing (all measured — do not "improve" them):
 *  - `window_activity` is the per-pane epoch-second clock of last output,
 *    maintained by the server with no client attached. It is the workhorse.
 *  - `session_activity` tracks CLIENTS, not output; it froze at attach time
 *    while output flowed. It is deliberately absent from the format.
 *  - `pane_current_command` never changes for an agent (claude reports its
 *    version string, node-based agents report `node`), so it is useless as an
 *    agent state signal — it is here for shells and for diagnostics.
 *  - `pane_in_mode` means copy-mode: the pane is frozen and must never read
 *    as working (Phase 12.3 explicitly requires this).
 *  - `window_bell_flag` is DELIBERATELY ABSENT. The pre-Phase-13 poll read a
 *    bell as `needs_input`; 133/133 BELs captured off the wire were OSC
 *    string terminators and codex fires one ~10 times a second WHILE WORKING.
 *    tmux consumes those correctly so the flag never true-fired for a real
 *    permission prompt either. The rule is deleted, not tuned.
 */

import type { execTmux as ExecTmux } from '../tmux';

/** Everything tier 1 knows about one pane. */
export interface PaneFacts {
  /** Owning tmux session `$-id`. */
  tmuxId: string;
  /** Immutable pane id (`%N`) — the ONLY safe key for agent-side mapping. */
  paneId: string;
  panePid: number;
  active: boolean;
  dead: boolean;
  /** Exit code from `#{pane_dead_status}` when tmux reported a number. */
  deadStatus?: number;
  /**
   * `#{pane_dead_signal}` — the signal that killed the process, e.g. "term"
   * (Phase 12.7 F2). MUTUALLY EXCLUSIVE with deadStatus: a process that dies
   * BY a signal reports an EMPTY dead_status, which is why a targeted `kill`
   * used to be recorded as no exit at all (measured, research 21 §3).
   */
  deadSignal?: string;
  /** Epoch ms of the last output tmux saw (from `#{window_activity}`). */
  activityAt: number;
  currentCommand: string;
  /** DECKPAM: zsh's ZLE sets it at every prompt. */
  keypad: boolean;
  /** A full-screen app inside the pane owns the alternate screen. */
  alternate: boolean;
  /** tmux copy-mode is active — the pane is frozen. */
  inMode: boolean;
  /** OSC 0/2 title. codex publishes its whole state here. */
  title: string;
}

/**
 * `pane_title` goes LAST: it is the one field whose content is arbitrary, so
 * everything after the 12th tab belongs to it.
 */
export const PANE_FORMAT = [
  '#{session_id}',
  '#{pane_id}',
  '#{pane_pid}',
  '#{pane_active}',
  '#{pane_dead}',
  '#{pane_dead_status}',
  '#{pane_dead_signal}',
  '#{window_activity}',
  '#{keypad_flag}',
  '#{alternate_on}',
  '#{pane_in_mode}',
  '#{pane_current_command}',
  '#{pane_title}'
].join('\t');

const TITLE_FIELD = 12;

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse `list-panes -a -F PANE_FORMAT` output into one entry per tmux
 * session. gmux gives every session exactly one pane; if a session somehow
 * has several, the ACTIVE one wins (never "whichever line came last", which
 * is what the pre-Phase-13 poll did).
 */
export function parsePaneLines(out: string): Map<string, PaneFacts> {
  const bySession = new Map<string, PaneFacts>();
  for (const line of out.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\t');
    const tmuxId = f[0];
    const paneId = f[1];
    if (tmuxId === undefined || paneId === undefined) continue;
    const deadStatus = f[5];
    const deadSignal = f[6];
    const facts: PaneFacts = {
      tmuxId,
      paneId,
      panePid: num(f[2]),
      active: f[3] === '1',
      dead: f[4] === '1',
      ...(deadStatus !== undefined && /^\d+$/.test(deadStatus)
        ? { deadStatus: parseInt(deadStatus, 10) }
        : {}),
      ...(deadSignal !== undefined && deadSignal.length > 0
        ? { deadSignal }
        : {}),
      activityAt: num(f[7]) * 1000,
      keypad: f[8] === '1',
      alternate: f[9] === '1',
      inMode: f[10] === '1',
      currentCommand: f[11] ?? '',
      title: f.slice(TITLE_FIELD).join('\t')
    };
    const prev = bySession.get(tmuxId);
    if (prev === undefined || (facts.active && !prev.active)) {
      bySession.set(tmuxId, facts);
    }
  }
  return bySession;
}

/** One exec, every pane. Rejects exactly as execTmux does. */
export async function readPaneFacts(
  exec: typeof ExecTmux
): Promise<Map<string, PaneFacts>> {
  return parsePaneLines(await exec(['list-panes', '-a', '-F', PANE_FORMAT]));
}
