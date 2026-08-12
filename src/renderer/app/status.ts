/**
 * Visual mapping for session status (DESIGN.md §1.3): color + shape + text.
 * Status is never color-alone — the dot class encodes shape (solid/hollow)
 * and motion (pulse), and every row carries the text label.
 */

import type { SessionStatus } from '@shared/types';

export type DotKind = 'working' | 'attention' | 'idle' | 'ended' | 'failed';

export interface StatusVisual {
  dot: DotKind;
  /** Row/strip text label; sentence case. */
  label: string;
}

/**
 * How a session ended — the two independent halves main records (Phase 12.7
 * F2). Structurally satisfied by a whole `Session`, so callers pass the
 * session itself.
 */
export interface SessionEnd {
  exitCode?: number;
  exitSignal?: string;
  /**
   * The session's SpecStory capture, when it had one — read for one field.
   *
   * `exitCodeApproximate` is set for the four providers whose wrapper
   * COLLAPSES the agent's exit status to 1 (codex, droid, deepseek,
   * antigravity — research 13 §4.2). A captured codex that exits 7 reaches
   * gmux as a 1, so printing "exit 1" states as fact a number nobody
   * measured. Structurally satisfied by a whole `Session` (its `capture`
   * carries more fields), like `SessionEnd` itself.
   */
  capture?: { exitCodeApproximate: boolean };
}

/**
 * True when this session's recorded exit CODE is a floor, not a fact — the
 * SpecStory wrapper mirrored a collapsed 1 instead of the agent's own status.
 * The signal half is unaffected: a signal death is reported by tmux about the
 * process it actually reaped, not mirrored by the wrapper.
 */
function exitCodeIsApproximate(end: SessionEnd | undefined): boolean {
  return end?.capture?.exitCodeApproximate === true;
}

/**
 * macOS/BSD signal numbers → names, for decoding 128+n exit codes. Indexed
 * by number, so the table is written as one line per row of eight.
 */
const SIGNAL_NAMES: readonly (string | undefined)[] = [
  undefined,
  'HUP', 'INT', 'QUIT', 'ILL', 'TRAP', 'ABRT', 'EMT', 'FPE',
  'KILL', 'BUS', 'SEGV', 'SYS', 'PIPE', 'ALRM', 'TERM', 'URG',
  'STOP', 'TSTP', 'CONT', 'CHLD', 'TTIN', 'TTOU', 'IO', 'XCPU',
  'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'INFO', 'USR1', 'USR2'
];

/**
 * The signal that ended this session, as a bare name ("TERM"), or null.
 *
 * Two sources, because agents disagree about how to die (research 21 §3/§7):
 *  - tmux's `#{pane_dead_signal}` for a process killed BY a signal — the
 *    honest case, and the one that used to leave no trace at all;
 *  - a 128+n exit code for an agent that TRAPS the signal and exits itself
 *    (claude maps SIGTERM to exit 143), which is the same event wearing a
 *    number.
 */
export function endSignalName(end: SessionEnd | undefined): string | null {
  if (end === undefined) return null;
  if (end.exitSignal !== undefined && end.exitSignal.length > 0) {
    const raw = end.exitSignal.replace(/^sig/i, '').toUpperCase();
    return /^[A-Z0-9]+$/.test(raw) ? raw : null;
  }
  const code = end.exitCode;
  if (code !== undefined && code > 128 && code < 160) {
    return SIGNAL_NAMES[code - 128] ?? null;
  }
  return null;
}

/** A session that did NOT end cleanly (non-zero exit, or a signal). */
export function endedBadly(end: SessionEnd | undefined): boolean {
  if (end === undefined) return false;
  return (
    (end.exitCode !== undefined && end.exitCode !== 0) ||
    endSignalName(end) !== null
  );
}

/**
 * The banner headline for a session that is over — the honest version of
 * what used to read "Session ended unexpectedly (exit 143)", a number the
 * user had to decode to learn their agent had been killed from outside.
 *
 * INT and QUIT skip the "(external)" note: those two are what a keyboard
 * sends, so gmux must not accuse anyone.
 */
export function endedTitle(end: SessionEnd | undefined): string {
  const signal = endSignalName(end);
  if (signal !== null) {
    const external = signal === 'INT' || signal === 'QUIT' ? '' : ' (external)';
    return `Session terminated by SIG${signal}${external}`;
  }
  const code = end?.exitCode;
  if (code !== undefined && code !== 0) {
    // Under a collapsing capture wrapper the number is not the agent's own,
    // so the headline says what IS known and drops what is not.
    return exitCodeIsApproximate(end)
      ? 'Session ended unexpectedly'
      : `Session ended unexpectedly (exit ${code})`;
  }
  return 'Session ended';
}

export function statusVisual(
  status: SessionStatus,
  end?: SessionEnd
): StatusVisual {
  switch (status) {
    case 'running':
      return { dot: 'working', label: 'working' };
    case 'needs_input':
      return { dot: 'attention', label: 'needs input' };
    case 'idle':
      return { dot: 'idle', label: 'idle' };
    case 'exited': {
      // §6.6 exit-code truth: main records the real exit status (Phase 8,
      // Session.exitCode) and, since Phase 12.7, the signal that killed it
      // (Session.exitSignal — a signal death has NO exit code, so it used to
      // read as a clean "ended"). Either one renders the failed variant.
      if (!endedBadly(end)) return { dot: 'ended', label: 'ended' };
      const signal = endSignalName(end);
      return {
        dot: 'failed',
        label:
          signal !== null
            ? `killed (SIG${signal})`
            : exitCodeIsApproximate(end)
              ? 'failed'
              : `failed (exit ${end?.exitCode})`
      };
    }
    case 'restorable':
      return { dot: 'idle', label: 'saved' };
  }
}

/** Roll-up for a project tab: attention > working > idle; none → hollow. */
export function rollupDot(statuses: SessionStatus[]): DotKind | 'none' {
  let saw: DotKind | 'none' = 'none';
  for (const s of statuses) {
    if (s === 'needs_input') return 'attention';
    if (s === 'running') saw = 'working';
    else if (s === 'idle' && saw !== 'working') saw = 'idle';
  }
  return saw;
}
