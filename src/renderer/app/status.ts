/**
 * Visual mapping for session status (DESIGN.md §1.3): color + shape + text.
 * Status is never color-alone — the dot class encodes shape (solid/hollow)
 * and motion (pulse), and every row carries the text label.
 */

import type { Session, SessionMachine, SessionStatus } from '@shared/types';

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

// ---------------------------------------------------------------------------
// Phase 48 — a session that started and then stopped at once
// ---------------------------------------------------------------------------

/**
 * How soon after a create a death counts as "right after it started".
 *
 * Five seconds, and the copy quotes this number rather than a duration.
 * Tortie cannot state the duration. The death is noticed by a poll whose
 * cadence is 1000 ms when a window has focus and 2000 ms when none does, so
 * "the session ran for 0.4 seconds" would be a number nobody measured. A
 * bound is the honest form and this constant is the bound.
 */
export const FAST_DEATH_MS = 5000;

/** What a caller has to know about one session's lifetime for the test below. */
export interface SessionLifetime {
  /** Epoch ms of the create, from the session projection. */
  createdAt: number;
  /**
   * Epoch ms of the moment THIS window saw the session stop.
   *
   * It is absent for a session that was already over when the window opened,
   * which is the honest answer: Tortie did not watch that one start. The
   * ended block then draws exactly what it drew before this phase.
   */
  endedAt?: number;
}

/**
 * True when this window watched the session start and it was gone within
 * {@link FAST_DEATH_MS}.
 *
 * The bound is inclusive, so a death at 4999 ms is inside it and a death at
 * 5001 ms is outside it. It never claims the fast case for a session it did
 * not watch, and the observed stop time is at or after the real one, so the
 * error can only ever hide the fast case and never invent it.
 */
export function diedRightAfterStart(life: SessionLifetime): boolean {
  const { createdAt, endedAt } = life;
  if (endedAt === undefined) return false;
  return endedAt >= createdAt && endedAt - createdAt <= FAST_DEATH_MS;
}

/** The state D heading, e.g. "claude stopped right after it started". */
export function fastDeathTitle(agent: string): string {
  return `${agent} stopped right after it started`;
}

/**
 * The first sentence of the state D body, plus the cause when it is known.
 *
 * The cause sentence is dropped for a collapsing capture wrapper, for the
 * same reason `endedTitle` drops the number: under those four providers the 1
 * is the wrapper's, not the agent's.
 */
export function fastDeathSentence(end: SessionEnd): string {
  const seconds = FAST_DEATH_MS / 1000;
  const opener = `The session ended within ${seconds} seconds of starting.`;
  const signal = endSignalName(end);
  if (signal !== null) return `${opener} It was stopped by SIG${signal}.`;
  const code = end.exitCode;
  if (code !== undefined && code !== 0 && !exitCodeIsApproximate(end)) {
    return `${opener} It exited with code ${code}.`;
  }
  return opener;
}

/**
 * The sentence under the pane's last words (Phase 48 fix round).
 *
 * IT USED TO BE ONE SENTENCE AND IT WAS FALSE FOR HALF THE DEATHS. The single
 * note said "restarting will not change the result", which is right for an
 * agent that rejected a flag or could not find its interpreter, and wrong for
 * an agent that was working and was killed from outside. A verifier drove the
 * second case: a healthy agent killed by an external `kill` drew its own TUI
 * frame as its last words and was then told a restart would not help, when the
 * session was fully restartable.
 *
 * The branch reads `exitSignal` and the 128+n exit codes that mean the same
 * thing, which are structured fields the reaper wrote. It does not read the
 * last words themselves, and no branch in Tortie ever will.
 */
export function exitDetailNote(end: SessionEnd): string {
  const signal = endSignalName(end);
  if (signal !== null) {
    return (
      `Restart runs the same command again. This session was stopped by ` +
      `SIG${signal} rather than by anything it reported, so a restart may ` +
      'well succeed.'
    );
  }
  return (
    'Restart runs the same command again. If the message above names a ' +
    'missing program or an option the agent does not know, restarting will ' +
    'not change the result.'
  );
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
    case 'unknown':
      // Produced since Phase 67: main writes it when the session server
      // cannot be reached and its death is not confirmed by a completed
      // probe. A hollow dot, because hollow is what the other "not working
      // right now" states use, and no new colour is invented for a state the
      // user cannot act on. The label is the honest word: Tortie cannot see
      // this session and cannot prove it is gone.
      return { dot: 'ended', label: 'unreachable' };
    case 'discarded':
      // Added in Phase 19 item 6 with `unknown`; its producer is the
      // reversible remove. This switch has no `default`, so a member with no
      // case here is a compile error rather than a row that renders blank.
      return { dot: 'ended', label: 'removed' };
  }
}

/**
 * True when the one local machine is unreachable, read off the rows.
 *
 * Phase 67. The condition is derived, never pushed over a channel of its
 * own. One machine exists today, and its producer (the refresh catch arm in
 * main) flips every eligible row to `unknown` together, so "at least one
 * visible row reads unknown" is the whole machine condition. The M2 rung
 * replaces the row scan with real machine ids.
 */
export function machineUnreachable(
  sessions: readonly Pick<Session, 'status'>[]
): boolean {
  return sessions.some((s) => s.status === 'unknown');
}

/**
 * The machines that went quiet, read off the rows, each one once (Phase 70).
 *
 * Phase 67 shipped one sentence for one machine, and it named no machine
 * because there was only ever this Mac. There can now be several, so the
 * condition bar draws a badge for each machine whose rows read `unknown` and a
 * person can tell which one stopped answering. This Mac contributes nothing:
 * its rows carry no machine, and a badge saying "this Mac" would be a label for
 * the computer the person is looking at.
 *
 * The order is the order the rows arrive in, which is the order the surfaces
 * already draw them in, so the badges do not reshuffle between renders.
 */
export function unreachableMachines(
  sessions: readonly Pick<Session, 'status' | 'machine'>[]
): SessionMachine[] {
  const byId = new Map<string, SessionMachine>();
  for (const s of sessions) {
    if (s.status !== 'unknown') continue;
    const machine = s.machine;
    if (machine === undefined) continue;
    if (!byId.has(machine.id)) byId.set(machine.id, machine);
  }
  return [...byId.values()];
}

/**
 * Roll-up for a project tab: attention > working > idle; none → hollow.
 *
 * `exited`, `restorable`, `unknown` and `discarded` contribute nothing. A tab
 * must not light up for a session that is not doing anything, and `unknown`
 * in particular must never be rolled up as activity: it means Tortie could
 * not see the session, and a dot claiming otherwise would be the lie the
 * member exists to prevent.
 */
export function rollupDot(statuses: SessionStatus[]): DotKind | 'none' {
  let saw: DotKind | 'none' = 'none';
  for (const s of statuses) {
    if (s === 'needs_input') return 'attention';
    if (s === 'running') saw = 'working';
    else if (s === 'idle' && saw !== 'working') saw = 'idle';
  }
  return saw;
}
