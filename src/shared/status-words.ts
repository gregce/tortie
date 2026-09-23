/**
 * The status words: what a session's status is called, and its dot (moved to
 * shared in Phase 316).
 *
 * THIS IS THE ONE TABLE. `statusVisual` and the two readings of how a session
 * ended that it depends on lived in `src/renderer/app/status.ts` from Phase 8
 * onward, and main could not read them: a main module may not import the
 * renderer. So when Phase 313's door had to answer a status word, main was
 * handed one through `PocketFacts.statusWord`, Phase 314's push seam spelled
 * the one word a blocked row can have a second time, and a gate held the two
 * spellings equal (`build/p314/SPEC.md` §1.1 row 1). Phase 313 mechanism 8 named
 * this file and was not built; Phase 316 builds it, because the phone's door
 * now answers EVERY session's word (`others` on `/v1/blocked`) and its raised
 * title (`statusTitle`), not only `needs input`.
 *
 * The functions below were MOVED, byte for byte, with every case clause and
 * every label literal exactly as they read in `status.ts`, so a gate that reads
 * `statusVisual`'s cases as text reads the same text here. `status.ts` imports
 * them and re-exports the names its renderer importers already use, so the
 * renderer has one door to them and there is still one definition.
 *
 * `raisedLabel` moved here from `src/renderer/session-manager/copy.ts` in the
 * same phase, for the same reason: main raises the word for the phone's title
 * (`Needs input`, `Failed (exit 1)`) with the rule the session manager raises it
 * with, and a second raising rule is how the phone would start saying `working`
 * where the Mac says `Working`.
 *
 * Pure. No store, no DOM, no clock.
 */

import type { SessionMachine, SessionStatus } from './types';

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
export function exitCodeIsApproximate(end: SessionEnd | undefined): boolean {
  return end?.capture?.exitCodeApproximate === true;
}

/**
 * True when this end describes the SpecStory capture process rather than the
 * agent (Phase 115). The rule lives here once and every branch reads it.
 *
 * tmux execs argv[0], and for a captured session wrapArgv puts the specstory
 * binary there. The process a SIGNAL death names is therefore specstory, and
 * the agent ran inside it. An exit CODE death is different. The wrapper
 * mirrors the agent's own exit status, so on that path the number does
 * describe the agent, and the copy for it does not change.
 */
export function capturedSignalDeath(end: SessionEnd | undefined): boolean {
  return end?.capture !== undefined && endSignalName(end) !== null;
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
 * What the label needs to know about a session beyond its status.
 *
 * It extends {@link SessionEnd} rather than replacing it, so every existing
 * call site is unchanged: they all already pass the whole session, which
 * satisfies both halves structurally.
 */
export interface StatusFacts extends SessionEnd {
  /**
   * The machine this session runs on, when it is not this Mac (Phase 71).
   *
   * Only the `restorable` arm reads it, and read the comment there for what it
   * changes and why.
   */
  machine?: SessionMachine;
}

export function statusVisual(
  status: SessionStatus,
  end?: StatusFacts
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
      // Phase 115. A captured signal death names SpecStory in the label,
      // because the killed process was SpecStory (see capturedSignalDeath).
      return {
        dot: 'failed',
        label:
          signal !== null
            ? capturedSignalDeath(end)
              ? `SpecStory killed (SIG${signal})`
              : `killed (SIG${signal})`
            : exitCodeIsApproximate(end)
              ? 'failed'
              : `failed (exit ${end?.exitCode})`
      };
    }
    case 'restorable':
      // PHASE 71. `saved` is true of a session on this Mac and false of a
      // session on another machine. Nothing about a remote session is saved
      // here: no scrollback, no resume line, no launch snapshot. The machine
      // holds all of it. Saying "saved" would be the exact class of claim
      // Phase 67 existed to kill, and the honest word for a row a completed
      // list stopped reporting is that it is not running.
      return end?.machine !== undefined
        ? { dot: 'idle', label: 'not running' }
        : { dot: 'idle', label: 'saved' };
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
 * A status label with its first letter raised.
 *
 * The grid raises it in CSS, so the text a probe reads stays `statusVisual`'s
 * own. This is for the places CSS cannot reach one word of a longer line: the
 * batch panel's `<group> · <State>`, the state column's sort key, and (Phase
 * 316) the title the phone's door answers as `statusTitle`.
 */
export function raisedLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
