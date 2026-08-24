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

import type { AgentRegistryId } from '@shared/types';
import {
  AGENT_IDS,
  agentBinaryCandidates,
  type AgentActivityProfile
} from '../agents/registry';
import type { ClaudeSessionEntry } from './claude-registry';
import { claudeVerdict, codexTitleVerdict, shellVerdict } from './oracles';
import type { PaneFacts } from './panes';
import {
  CPU_BUSY_PERCENT,
  CPU_BUSY_TICKS,
  cpuPercent,
  foregroundChildOf,
  hasToolChild,
  holdsTerminal,
  isDescendantOf,
  subtreeCpuSeconds,
  type ProcSnapshot,
  type WitnessReading
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
  /**
   * Phase 141, the witness: the ONE process Tortie has watched being the
   * agent in this session, and the pane's own process at the time it was
   * recorded. Null until an agent has actually been seen here.
   *
   * This is the field the whole feature turns on. A session Tortie has just
   * restored, sitting with its command armed and unpressed, has the same
   * screen and the same process table as a session whose agent has left, so
   * every rule that reads the SHAPE of a session announces that an agent left
   * when no agent ever ran. A restored session has no witness, so it can
   * never drop, and that is a fact about the data rather than a check that
   * could be forgotten.
   */
  witnessPid: number | null;
  /**
   * The witness's ACTUAL parent when it was recorded, or null when Tortie does
   * not know it. Null is not a guess: it means no reuse guard applies here.
   *
   * It used to record the pane's own process for every witness, which was only
   * true for a direct child. An agent under SpecStory capture is a GRANDCHILD,
   * so the guard read "this pid was reused" on every tick while the agent was
   * healthy, and announced a drop 22 seconds after the agent started.
   */
  witnessPpid: number | null;
  /** Where this session sits between an agent leaving and one coming back. */
  handback: HandbackState;
  /** Epoch ms the agent was first seen to have left. 0 when it has not. */
  leftAt: number;
  /**
   * `#{pane_current_command}` as it read at the moment the agent left. The
   * return trigger is any later tick where that field reads something else,
   * which costs nothing because the field is already on the line tier 1
   * reads. It is a reason to LOOK and never a rule: research 64 §4.3
   * rejected this field as a rule, because it reads `2.1.241` for Claude Code
   * and `node` for four other agents.
   *
   * NULL MEANS THE BASELINE IS NOT ESTABLISHED YET, added in the Phase 141 fix
   * round. The drop can be declared from claude's own `SessionEnd` hook, which
   * arrives between two ticks and therefore carries the pane facts of the tick
   * BEFORE it. Recording the agent's own command as the baseline there made
   * the very next tick read a different command and announce a return, so the
   * verb appeared and vanished 199 ms later. A null baseline is filled in from
   * the first fresh pane reading instead.
   */
  leftCommand: string | null;
}

/**
 * Where a session sits between an agent leaving and one coming back
 * (Phase 141). THIS IS NOT A STATUS. It never reaches `SessionStatus`, it
 * never reaches the dot, and Phase 23 refusal 5 is untouched: nothing here
 * calls `onStatus` and nothing here is projected by `toSessionStatus`.
 *
 *  - `none`         an agent is there, or none has ever been seen here.
 *  - `left`         the witnessed process is gone and nothing has run since.
 *                   This is the only state that offers the verb.
 *  - `returning`    something is running here again and Tortie has not been
 *                   told which conversation it is. The verb is hidden, and
 *                   nothing claims an agent is running.
 *  - `unconfirmed`  something is running here and Tortie could not bind it to
 *                   the conversation the row holds. It says so and writes
 *                   nothing.
 */
export type HandbackState = 'none' | 'left' | 'returning' | 'unconfirmed';

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
    reflowUntil: 0,
    witnessPid: null,
    witnessPpid: null,
    handback: 'none',
    leftAt: 0,
    leftCommand: ''
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

// ---------------------------------------------------------------------------
// Phase 141: the witness, the drop edge and the return trigger
// ---------------------------------------------------------------------------
//
// These rules answer ONE question: has the agent Tortie watched in this
// session gone away, and has something come back. They return a FACT and
// never an `ActivityVerdict`, they never touch `st.state`, and nothing here
// reaches `onStatus` or `SessionStatus`. Phase 23 refusal 5 stays whole:
// this is not a status, it is not a badge and it is not a count.
//
// They live here rather than in the loop for the reason this file exists,
// being that a rule with no tmux server behind it can be driven from a test.

/** Suffixes a launcher may hang on an agent's name before it is run. */
const SCRIPT_SUFFIXES = ['.js', '.mjs', '.cjs', '.ts', '.py', '.sh'];

/** The basename of one argv token, with a script suffix taken off. */
function programName(token: string): string {
  const slash = token.lastIndexOf('/');
  let name = slash >= 0 ? token.slice(slash + 1) : token;
  for (const suffix of SCRIPT_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name;
}

/**
 * Does this command line name one of the binaries the row's agent may wear?
 *
 * This is the word that separates design D from candidate C, which research
 * 64 §11 killed. C witnessed ANY foreground child, so a pager and an ordinary
 * command set and cleared the witness and its card then said an agent was
 * running when `npm test` was running. D witnesses one NAMED process.
 *
 * It also closes the case that outranks everything else here. A session
 * Tortie has restored, sitting with its command armed and unpressed, is a
 * login shell with no children. Run `npm test` in that session and a child
 * appears and later leaves, which is byte for byte the shape of an agent
 * leaving. The command line is what tells the two apart, and it is read once
 * when the child appears rather than on every tick.
 *
 * Node launchers put the agent's own script after the interpreter, so every
 * token is examined and each is reduced to a program name first.
 *
 * TWO AGENTS NEVER CARRY THEIR OWN NAME, measured on this Mac in the Phase 141
 * fix round, and the rule above found neither of them:
 *
 *  - muse's launcher ends in a plain `exec "$binary" "$@"` with no `-a`, so the
 *    process reads `/Users/<me>/.local/bin/muse-bin-0.2.1-R1215.1`;
 *  - qwen's launcher ends in `exec "$ROOT/node/bin/node" "$ROOT/lib/cli-entry.js"`,
 *    so the process reads two paths and neither basename is `qwen`.
 *
 * So a token that is a PATH is also matched two further ways: its own name may
 * begin with the agent's name and a dash, and any directory along it may. Both
 * of those are held to the tokens that name a PROGRAM, being the first one and
 * any script, so opening a file that happens to live in the agent's own folder
 * matches nothing. `vim /Users/<me>/.local/lib/qwen-code/README.md` is refused
 * for exactly that reason.
 */
export function commandNamesAgent(
  command: string,
  candidates: readonly string[]
): boolean {
  if (command.length === 0 || candidates.length === 0) return false;
  const wanted = new Set(candidates);
  const tokens = command.split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined || token.length === 0 || token.includes('=')) {
      continue;
    }
    if (wanted.has(programName(token))) return true;
    if (!token.includes('/')) continue;
    if (i !== 0 && !isScriptToken(token)) continue;
    for (const segment of token.split('/')) {
      if (segment.length === 0) continue;
      if (wanted.has(segment)) return true;
      for (const candidate of candidates) {
        if (segment.startsWith(`${candidate}-`)) return true;
      }
    }
  }
  return false;
}

/** A path that names a script rather than a file somebody is editing. */
function isScriptToken(token: string): boolean {
  const slash = token.lastIndexOf('/');
  const base = slash === -1 ? token : token.slice(slash + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return true;
  return SCRIPT_SUFFIXES.includes(base.slice(dot));
}

const REGISTRY_IDS = new Set<string>(AGENT_IDS);

/**
 * Every binary name this row's agent may wear. An id the compiled registry
 * does not know is a configured agent, and the only name Tortie has for it is
 * the id itself, so that is what it matches on. Guessing wider would witness
 * the wrong process, and the cost of guessing narrower is that one configured
 * agent offers no verb, which is the safer of the two.
 *
 * It moved here in the Phase 141 fix round because the confirm path needs the
 * same list the witness uses. Two copies of this list is how the two ends of
 * one feature end up disagreeing about what the agent is called.
 */
export function binaryCandidatesFor(agent: string): readonly string[] {
  return REGISTRY_IDS.has(agent)
    ? agentBinaryCandidates(agent as AgentRegistryId)
    : [agent];
}

/** A session whose row says it holds an agent may be witnessed. */
export function witnessEligible(agent: string): boolean {
  return agent.length > 0 && agent !== 'shell';
}

/**
 * What is still unproven about a candidate at the moment it is offered.
 *
 *  - `none`     a process table read this tick already proved it, being a
 *               live process under this pane's own process.
 *  - `command`  it came out of the table as the foreground child, so it is
 *               live and it is under the pane, but nothing has read its
 *               command line and it may be anything the person typed.
 *  - `descent`  it came out of claude's own record and NOTHING has been read
 *               about the process at all. Added in the Phase 141 fix round,
 *               and `witnessCandidate` below says what it is for.
 */
export type WitnessConfirmation = 'none' | 'command' | 'descent';

/** A pid Tortie may be about to accept as the witness for a session. */
export interface WitnessCandidate {
  pid: number;
  /** What has to be true, and is not known yet, before this pid is believed. */
  confirm: WitnessConfirmation;
  /**
   * The parent this candidate really has, or null when nothing read it.
   *
   * IT IS NOT THE PANE'S OWN PROCESS. An agent under SpecStory capture is a
   * grandchild of the pane, so writing the pane's own process here made the
   * reuse guard fire on a healthy agent. Null carries no guard, which is the
   * honest answer when the parent was never read.
   */
  ppid: number | null;
}

/**
 * Which process Tortie can see being the agent in this session right now.
 *
 * Both sources are already read. claude names its own process in the record
 * the native tier reads every tick, including in the restore shape where the
 * pane runs the login shell and claude is a child of it. Every other agent
 * comes from the fleet process table, as the direct child of the pane's own
 * process that holds the terminal, and that candidate is confirmed by its
 * command line before it is believed.
 *
 * NEITHER SOURCE IS BELIEVED ON ITS OWN. What comes back says what still has
 * to be read before the pid may be recorded, and the caller does that reading.
 */
export function witnessCandidate(
  pane: PaneFacts,
  profile: AgentActivityProfile,
  claude: ClaudeLookup,
  proc: ProcSnapshot | null
): WitnessCandidate | null {
  if (profile.native === 'claude-session-registry') {
    const byPane = claude.forPane(pane.paneId);
    if (byPane !== undefined) {
      // A RECORD IS A FILE, AND A FILE OUTLIVES THE PROCESS THAT WROTE IT.
      // claude deletes its own record on the way out and cannot delete it when
      // it is killed, so a crash or a reboot leaves records naming pids that
      // are gone. The same crash takes the tmux server with it, pane ids start
      // again at %0, and the sessions Tortie restores wear exactly the ids
      // those leftover records name. This machine did all of that on
      // 2026-08-22. Believing the record on its own therefore witnessed a pane
      // where no agent ever ran and then announced that an agent had left it,
      // which is the one thing this phase may never do.
      //
      // So the pid is believed only where a reading of the PROCESS says it is
      // alive and under this pane. The fleet table answers that at no cost on
      // a tick that took one. When it did not, `descent` asks the loop for a
      // targeted walk, which is one process read taken once per pid.
      //
      // A pid the table has never heard of is NOT refused outright here. The
      // table is one reading old and a claude that started since it was taken
      // is exactly that shape, so the fresh read decides instead of a stale
      // one, and a healthy agent can never be refused for good by a race.
      if (proc !== null && isDescendantOf(proc, byPane.pid, pane.panePid)) {
        return {
          pid: byPane.pid,
          confirm: 'none',
          ppid: proc.ppid.get(byPane.pid) ?? null
        };
      }
      return { pid: byPane.pid, confirm: 'descent', ppid: null };
    }
    if (proc !== null) {
      for (const entry of claude.unmapped()) {
        if (isDescendantOf(proc, entry.pid, pane.panePid)) {
          return {
            pid: entry.pid,
            confirm: 'none',
            ppid: proc.ppid.get(entry.pid) ?? null
          };
        }
      }
    }
    return null;
  }
  if (proc === null) return null;
  const child = foregroundChildOf(proc, pane.panePid);
  // A foreground child is a DIRECT child by construction, so the pane's own
  // process really is its parent here and the guard is exact.
  return child === null
    ? null
    : { pid: child, confirm: 'command', ppid: pane.panePid };
}

/**
 * Record the process Tortie has seen being the agent here. Returns true when
 * this is a process it was not already watching.
 *
 * A witness is never cleared by a tick that simply did not look. The absence
 * of a reading is not the absence of a process, and treating it as one would
 * announce that an agent left every time the process table was skipped.
 */
export function noteWitness(
  st: SessionState,
  pane: PaneFacts,
  pid: number,
  ppid: number | null
): boolean {
  if (st.witnessPid === pid) return false;
  st.witnessPid = pid;
  // A session created fresh runs the agent as the pane's OWN program, so its
  // parent is the tmux server rather than the pane. Null means "no reuse
  // guard applies here", which is honest, and the drop for that shape is the
  // pane dying rather than this rule.
  //
  // THE PARENT IS THE ONE THAT WAS READ, never the pane's own process taken on
  // faith. Taking it on faith is what made a healthy captured agent, which is a
  // grandchild of its pane, read as a reused pid on every single tick.
  st.witnessPpid = pid === pane.panePid ? null : ppid;
  return true;
}

/** What one reading of the witnessed process means. */
export type WitnessVerdict = 'none' | 'alive' | 'stopped' | 'gone' | 'reused';

/**
 * Read the witness, in the four answers research 64 §4.2 measured. `T` is
 * Control Z and is NOT a drop: the process is stopped and it is still there.
 * A parent that is no longer the pane's own process means the pid was reused
 * by something else, which is a drop with the witness cleared.
 */
export function witnessVerdict(
  st: SessionState,
  reading: WitnessReading
): WitnessVerdict {
  if (st.witnessPid === null) return 'none';
  if (!reading.found) return 'gone';
  if (reading.stat.includes('T')) return 'stopped';
  if (st.witnessPpid !== null && reading.ppid !== st.witnessPpid) {
    return 'reused';
  }
  return 'alive';
}

/**
 * The two facts from the pane that the drop edge checks after the process
 * read, being that the screen is not dead and that the pane's own process
 * still holds the terminal. The second is a secondary check only: when the
 * process table was not read this tick there is nothing to check and the edge
 * stands on the witness alone.
 */
export function dropIsSafeToDeclare(
  pane: PaneFacts,
  proc: ProcSnapshot | null
): boolean {
  if (pane.dead) return false;
  if (proc === null) return true;
  return holdsTerminal(proc, pane.panePid) !== false;
}

/**
 * The agent left. Returns true when this actually moved the session, so the
 * loop reports one edge rather than one per tick.
 *
 * `leftAt` is set only on the way out of `none`. A session that dropped, had
 * something run in it and dropped again still says the time the AGENT left,
 * because that is the time the card names and the second time is not it.
 */
export function noteAgentLeft(
  st: SessionState,
  pane: PaneFacts,
  now: number,
  paneIsFresh = true
): boolean {
  if (st.handback === 'left') return false;
  if (st.handback === 'none') st.leftAt = now;
  st.handback = 'left';
  // `paneIsFresh` is false on the one path that does not run inside a tick,
  // being claude's own `SessionEnd` hook. Its pane facts are the ones the
  // previous tick read, so the command on them is still the AGENT'S, and
  // recording that as the baseline made the next tick read a change and
  // announce a return that never happened. Null asks the next tick to set it.
  st.leftCommand = paneIsFresh ? pane.currentCommand : null;
  st.witnessPid = null;
  st.witnessPpid = null;
  return true;
}

/**
 * Something is running in a session that dropped. Free: the field is already
 * on the line tier 1 reads for every pane, so a session sitting dropped costs
 * nothing per tick at all.
 */
export function returnTriggered(st: SessionState, pane: PaneFacts): boolean {
  return (
    st.handback === 'left' &&
    !pane.dead &&
    st.leftCommand !== null &&
    pane.currentCommand !== st.leftCommand
  );
}

/**
 * The drop was declared without fresh pane facts, so this session still needs
 * its return baseline set from a real tick. See `leftCommand`.
 */
export function needsReturnBaseline(st: SessionState): boolean {
  return st.handback === 'left' && st.leftCommand === null;
}

/**
 * A process has appeared in a session that dropped. It is watched from here,
 * so if it leaves again, which is what a resume that failed looks like one to
 * two seconds later, the verb comes back on its own.
 *
 * Being watched is not being believed. Whether this process is the
 * conversation the row holds is decided elsewhere, and until it is decided
 * nothing on screen says an agent is running.
 */
export function noteReturn(
  st: SessionState,
  pane: PaneFacts,
  pid: number
): void {
  st.handback = 'returning';
  st.witnessPid = pid;
  // The returning process is read out of the pane's own process's children, so
  // the pane's own process really is its parent.
  st.witnessPpid = pid === pane.panePid ? null : pane.panePid;
}

/** What the conversation question came back with. */
export type HandbackOutcome = 'adopted' | 'unconfirmed';

/**
 * Close the handback. `adopted` means the conversation was confirmed to be
 * the one the row already holds, so the session is an ordinary agent session
 * again and nothing is drawn about it. `unconfirmed` means Tortie could not
 * be sure, which is a legitimate answer and the correct one for several
 * agents: the row says so and nothing is written.
 */
export function noteHandbackResolved(
  st: SessionState,
  outcome: HandbackOutcome
): void {
  if (outcome === 'adopted') {
    st.handback = 'none';
    st.leftAt = 0;
    st.leftCommand = '';
    return;
  }
  st.handback = 'unconfirmed';
}

/**
 * Does this session offer the verb right now? One state only. While anything
 * is running in the session the answer is no, which is the rule rather than a
 * limitation: typing into a session a program owns is how text reaches a
 * program in raw mode with no Enter at all.
 */
export function offersResume(st: SessionState): boolean {
  return st.handback === 'left';
}
