/**
 * The activity RULES (Phase 13) — pure, one session at a time.
 *
 * monitor.ts owns the loop: which tiers to sample this tick, what they cost,
 * and where the verdict goes. This file owns what the samples MEAN. Keeping
 * them apart is what makes the hysteresis testable without a tmux server, and
 * it is where the measured constants live so they can be read in one place.
 *
 * Every number here has a measurement behind it (docs/research/18-agent-
 * activity.md §6); none of them is a taste call.
 */

import type { AgentActivityProfile } from '../agents/registry';
import type { ClaudeSessionEntry } from './claude-registry';
import { claudeVerdict, codexTitleVerdict, shellVerdict } from './oracles';
import type { PaneFacts } from './panes';
import {
  CPU_BUSY_PERCENT,
  CPU_BUSY_TICKS,
  cpuPercent,
  hasToolChild,
  isDescendantOf,
  subtreeCpuSeconds,
  type ProcSnapshot
} from './process';
import {
  detectDialog,
  hashScreen,
  normalizeCapture,
  ScreenMemory
} from './screen';
import type { ActivityState, ActivityVerdict } from './types';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Output newer than this counts as "the pane is producing output". */
export const QUIET_MS = 2_000;
/** Consecutive quiet ticks before working → idle. Covers codex's 5 s gaps. */
export const IDLE_CONFIRM_TICKS = 3;
/** Consecutive captures showing a dialog before → needs_input. */
export const DIALOG_CONFIRM_TICKS = 2;
/** Consecutive captures with the dialog GONE before needs_input is released. */
export const DIALOG_CLEAR_TICKS = 2;
/** A session stays "interesting" — worth `ps` and captures — this long. */
export const AMBIGUOUS_WINDOW_MS = 60_000;
/**
 * How long after a pane's geometry changes its reflow is discounted (Phase
 * 12.11). Resizing a pane — a window drag, a split, a sidebar toggle, or now
 * a terminal zoom — makes the app inside it repaint the whole screen, which
 * both the output timestamp and the screen hash would otherwise score as the
 * agent working. It is the same rule Phase 9.2 wrote for keystrokes: what
 * GMUX did to a session may never raise that session's state.
 *
 * Longer than QUIET_MS by one tick, because output "within the last 2 s"
 * outlives the repaint that produced it.
 */
export const REFLOW_GRACE_MS = 2_500;

// ---------------------------------------------------------------------------
// Per-session state
// ---------------------------------------------------------------------------

export interface SessionState {
  state: ActivityState;
  /** Epoch ms the current state was entered (ages in the UI). */
  since: number;
  quietTicks: number;
  dialogTicks: number;
  clearTicks: number;
  cpuBusyTicks: number;
  lastCpuSeconds: number | null;
  lastCpuAt: number;
  screen: ScreenMemory;
  /** This pane's shell has been seen setting DECKPAM at least once. */
  sawKeypad: boolean;
  lastWorkingAt: number;
  excerpt: string;
  lastActivityWrittenAt: number;
  /** Epoch ms until which this pane's repaint is reflow, not work (12.11). */
  reflowUntil: number;
}

export function freshState(now: number): SessionState {
  return {
    state: 'starting',
    since: now,
    quietTicks: 0,
    dialogTicks: 0,
    clearTicks: 0,
    cpuBusyTicks: 0,
    lastCpuSeconds: null,
    lastCpuAt: 0,
    screen: new ScreenMemory(),
    sawKeypad: false,
    lastWorkingAt: now,
    excerpt: '',
    lastActivityWrittenAt: 0,
    reflowUntil: 0
  };
}

/** Mid-verdict on a dialog: must be captured on CONSECUTIVE ticks. */
export function isMidDialog(st: SessionState): boolean {
  return st.state === 'needs_input' || st.dialogTicks > 0;
}

/**
 * Whether an unanswered session is worth spending `ps` and `capture-pane` on.
 * A settled, long-quiet session is not: with every session settled the whole
 * tick costs exactly one `list-panes`.
 */
export function worthProbing(
  profile: AgentActivityProfile,
  st: SessionState,
  now: number
): boolean {
  return (
    profile.animatesWhenIdle ||
    st.state === 'starting' ||
    now - st.lastWorkingAt < AMBIGUOUS_WINDOW_MS
  );
}

// ---------------------------------------------------------------------------
// Tier 0
// ---------------------------------------------------------------------------

/** The slice of claude's registry the rules need. */
export interface ClaudeLookup {
  forPane(paneId: string): ClaudeSessionEntry | undefined;
  unmapped(): ClaudeSessionEntry[];
}

/**
 * Agent-native truth, or null when this agent has no channel or its channel
 * has nothing to say right now. A null here is what makes a session
 * "ambiguous" — not the agent's declared tier — which is how claude's ~35 s
 * workspace-trust gate (no pid file yet) still gets the expensive tiers.
 */
export function nativeVerdict(
  pane: PaneFacts,
  profile: AgentActivityProfile,
  st: SessionState,
  cwd: string,
  claude: ClaudeLookup,
  proc: ProcSnapshot | null
): ActivityVerdict | null {
  switch (profile.native) {
    case 'shell-keypad':
      // A shell that has never set DECKPAM (bash + readline) would read as
      // permanently working, so the oracle is only trusted once this pane has
      // actually shown the flag.
      if (!st.sawKeypad && !pane.alternate) return null;
      return shellVerdict(pane.keypad, pane.alternate);
    case 'pane-title-oracle':
      return codexTitleVerdict(pane.title, cwd);
    case 'claude-session-registry': {
      const byPane = claude.forPane(pane.paneId);
      if (byPane !== undefined) return claudeVerdict(byPane);
      // Restore shape: the pane runs $SHELL and claude is a child of it, so
      // an entry with no usable `tmux` field is matched by process descent.
      if (proc === null) return null;
      for (const entry of claude.unmapped()) {
        if (isDescendantOf(proc, entry.pid, pane.panePid)) {
          return claudeVerdict(entry);
        }
      }
      return null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tiers 1–3
// ---------------------------------------------------------------------------

export interface TickInputs {
  now: number;
  proc: ProcSnapshot | null;
  /** Visible screen, when this session earned a capture this tick. */
  capture?: string;
}

/**
 * The inferred tiers, in strength order. Mutates `st`'s counters — the
 * hysteresis IS counters, and threading them out would only move the mutation
 * somewhere less obvious.
 *
 * Returns null to mean "no verdict this tick": the session holds whatever it
 * already reported.
 */
export function inferredVerdict(
  pane: PaneFacts,
  profile: AgentActivityProfile,
  st: SessionState,
  ctx: TickInputs
): ActivityVerdict | null {
  // Copy-mode freezes the pane. Scrolling a session must never make it look
  // busy, and must not let it decay either (Phase 12.3).
  if (pane.inMode) return null;

  // The pane was just resized (Phase 12.11): the repaint that follows is
  // OURS, so the two signals a repaint fakes — recent output and a changed
  // screen — are discounted for the grace window. Nothing else is: CPU, a
  // setsid'd tool child and the dialog detector are all unaffected by a
  // reflow, so a real prompt appearing mid-resize is still caught on time.
  const reflowing = ctx.now < st.reflowUntil;

  // The screen memory is advanced unconditionally: it measures "changed
  // within the last K observations", so skipping an observation because a
  // stronger signal already answered would desync it.
  const quiet = ctx.now - pane.activityAt > QUIET_MS;
  const outputEvidence = !reflowing && !profile.animatesWhenIdle && !quiet;
  const cpuBusy = noteCpu(st, pane, ctx.proc, ctx.now);
  const toolChild = ctx.proc !== null && hasToolChild(ctx.proc, pane.panePid);
  // One normalized view of the screen feeds BOTH screen signals: the hash and
  // the dialog detector must never disagree about what "the screen" is.
  const screen =
    ctx.capture === undefined ? null : normalizeCapture(ctx.capture);
  // RESET, not "ignore the answer": the memory's predicate is "changed within
  // the last K observations", so a suppressed change would still be inside
  // the window five ticks later and report working then. Re-baselining makes
  // the reflowed screen the new normal, which is what it is.
  if (reflowing) st.screen.reset();
  const screenChanged = screen !== null && st.screen.note(hashScreen(screen));
  const dialog = screen !== null && detectDialog(screen);

  // Strong evidence: the pane is producing output right now, burning CPU, or
  // waiting on a tool it setsid'd. An agent doing any of those is not blocked
  // on the user, whatever is drawn on the screen.
  if (outputEvidence || cpuBusy || toolChild) {
    st.dialogTicks = 0;
    if (st.state === 'needs_input') {
      // A dialog being answered still paints. Only the detector, or the
      // user's own keystroke, may release needs_input.
      return releaseNeedsInput(st, ctx.capture);
    }
    st.quietTicks = 0;
    return { state: 'working', tier: 'inferred' };
  }

  // needs_input is the ONLY screen-derived attention state, and it is ranked
  // ABOVE the screen hash on purpose: a dialog APPEARING is itself a screen
  // change, so "changed within the last K ticks" would mask it for the whole
  // memory window (measured 6 s to needs_input instead of 4 s). The detector
  // is the far stronger predicate — 57/57 recall, 0/386 false positives,
  // including on working screens.
  if (dialog) {
    st.clearTicks = 0;
    st.dialogTicks++;
    if (st.dialogTicks >= DIALOG_CONFIRM_TICKS) {
      return { state: 'needs_input', tier: 'inferred' };
    }
    return null;
  }
  st.dialogTicks = 0;
  if (st.state === 'needs_input') return releaseNeedsInput(st, ctx.capture);

  // Weak evidence: the screen moved within the last K ticks.
  if (screenChanged) {
    st.quietTicks = 0;
    return { state: 'working', tier: 'inferred' };
  }

  // Mid-reflow with no independent evidence: hold whatever the session
  // already reported. Decaying a working agent to idle because we resized it
  // would be the same mistake in the other direction.
  if (reflowing) return null;

  st.quietTicks++;
  if (st.state === 'idle' || st.quietTicks >= IDLE_CONFIRM_TICKS) {
    return { state: 'idle', tier: 'inferred' };
  }
  return null;
}

/**
 * needs_input never drops straight to idle — an unanswered prompt must not
 * silently disappear from ⌘J. It leaves only through `working`, and only once
 * the dialog has been off the screen for two consecutive captures.
 */
function releaseNeedsInput(
  st: SessionState,
  capture: string | undefined
): ActivityVerdict | null {
  if (capture === undefined) return null; // no evidence — hold the state
  st.clearTicks++;
  if (st.clearTicks < DIALOG_CLEAR_TICKS) return null;
  st.clearTicks = 0;
  st.quietTicks = 0;
  return { state: 'working', tier: 'inferred' };
}

/**
 * Δ CPU over the subtree; true once it has been busy for two consecutive
 * ticks. CPU may PROMOTE to working and may never DEMOTE to idle — codex
 * works at 0–5 % while claude idles at 0–3 %, so the distributions overlap.
 */
function noteCpu(
  st: SessionState,
  pane: PaneFacts,
  proc: ProcSnapshot | null,
  now: number
): boolean {
  if (proc === null) {
    st.lastCpuSeconds = null;
    st.cpuBusyTicks = 0;
    return false;
  }
  const seconds = subtreeCpuSeconds(proc, pane.panePid);
  const prev = st.lastCpuSeconds;
  const prevAt = st.lastCpuAt;
  st.lastCpuSeconds = seconds;
  st.lastCpuAt = now;
  if (prev === null) return false; // one sample is never enough
  const percent = cpuPercent(prev, seconds, now - prevAt);
  st.cpuBusyTicks = percent >= CPU_BUSY_PERCENT ? st.cpuBusyTicks + 1 : 0;
  return st.cpuBusyTicks >= CPU_BUSY_TICKS;
}

// ---------------------------------------------------------------------------
// Committing
// ---------------------------------------------------------------------------

/**
 * Apply a verdict. Returns the new state when it actually changed, null when
 * nothing moved — the caller only broadcasts on a real transition.
 */
export function commitVerdict(
  st: SessionState,
  verdict: ActivityVerdict,
  now: number
): ActivityState | null {
  if (verdict.state === 'working') st.lastWorkingAt = now;
  if (verdict.state === st.state) return null;
  // A session may never be flipped needs_input → idle without passing through
  // working, whichever tier is speaking: an unanswered prompt must not vanish.
  if (st.state === 'needs_input' && verdict.state === 'idle') return null;
  st.state = verdict.state;
  st.since = now;
  st.quietTicks = 0;
  if (verdict.state !== 'needs_input') st.dialogTicks = 0;
  return verdict.state;
}

/**
 * Is this transition a turn boundary (Phase 138)?
 *
 * A session that was working and has gone quiet, or has asked you something,
 * has finished a turn. That is the same moment the product already raises
 * needs input, so the fold costs no new sampling and no new timer.
 *
 * The rule lives with the rules rather than in the loop, so it is testable
 * without a tmux server, which is what this file exists for.
 */
export function isTurnBoundary(from: ActivityState, to: ActivityState): boolean {
  return from === 'working' && (to === 'idle' || to === 'needs_input');
}
