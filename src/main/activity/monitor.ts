/**
 * SessionActivityMonitor — Phase 13's whole answer, in the MAIN process.
 *
 * It replaces the renderer's byte detector, which could only ever see the
 * VISIBLE pane and then pinned its verdict permanently through a sticky
 * override. Everything here works for DETACHED sessions, which is the entire
 * point: the reported bug was a claude session reading "working" for 4 h 18 m
 * while claude's own state file, tmux's output clock and the process's CPU
 * all said idle.
 *
 * Four tiers, highest verdict wins, lower tiers only fill gaps
 * (docs/research/18-agent-activity.md §2):
 *
 *   T0  agent-native truth — claude's pid-file registry, codex's pane-title
 *       oracle, a shell's DECKPAM flag, injected hook events. Deterministic,
 *       instant in BOTH directions, no hysteresis.
 *   T1  tmux formats, always sampled, one exec per tick for every session.
 *   T2  process subtree — Δ CPU and the setsid'd tool child. Corroborator;
 *       may promote to working, may never demote to idle.
 *   T3  normalized screen hash with a 5-tick memory, plus the one generic
 *       needs-input dialog detector. Last resort, ambiguous sessions only.
 *
 * THIS FILE IS THE LOOP: which tiers to sample, what they are allowed to
 * cost, and where a verdict goes. What the samples MEAN lives next door in
 * state-machine.ts, and each tier's raw reading lives in its own module.
 *
 * Cost discipline: T1 every tick (2.75 ms CPU for 16 panes ≈ 0.28 % of one
 * core), T2 only when some session is genuinely ambiguous, T3 only for those
 * sessions and capped per tick. With everything settled the monitor is one
 * `list-panes` per second and nothing else.
 *
 * The timer and the IPC broadcast stay in src/main/ipc.ts.
 */

import type { SessionStatus } from '@shared/types';
import {
  activityProfileFor,
  type AgentActivityProfile
} from '../agents/registry';
import type { execTmux as ExecTmux, TmuxScrollRunner } from '../tmux';
import { ClaudeSessionRegistry } from './claude-registry';
import { claudeVerdict } from './oracles';
import { readPaneFacts, type PaneFacts } from './panes';
import type { ScrollbackSample } from '../scrollback/watch';
import { readProcSnapshot, type ProcSnapshot } from './process';
import { excerptFromCapture } from './screen';
import {
  commitVerdict,
  isTurnBoundary,
  freshState,
  inferredVerdict,
  isMidDialog,
  nativeVerdict,
  REFLOW_GRACE_MS,
  worthProbing,
  type SessionState
} from './state-machine';
import { toSessionStatus, type ActivityState, type ActivityVerdict } from './types';

/** Screen captures per tick — T3 is the only per-pane cost in the loop. */
const MAX_CAPTURES_PER_TICK = 6;
/** ⌘J excerpt / age writes are coalesced to this granularity. */
const ACTIVITY_WRITE_MS = 15_000;

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

/** One live session, as the monitor needs to see it. */
export interface ActivitySession {
  id: string;
  /** Live tmux `$-id`. */
  tmuxId: string;
  /** AgentKind or registry id; unknown ids simply take the floor. */
  agent: string;
  cwd: string;
}

/** Per-tick UI facts that are not the status itself. */
export interface SessionActivityUpdate {
  sessionId: string;
  /** Last non-empty screen line — the ⌘J excerpt. */
  excerpt?: string;
  /** Epoch ms of the last output tmux saw. */
  lastActivityAt?: number;
}

export interface ActivityMonitorDeps {
  /** Live, non-exited sessions to evaluate this tick. */
  sessions(): ActivitySession[];
  exec: typeof ExecTmux;
  /**
   * Runs ONE tmux command — the control-client-preferring runner ipc.ts
   * already owns for scrolling (~1 ms per round trip versus ~20 ms for a
   * process spawn). Reused rather than duplicated (guardrail 3).
   */
  run: TmuxScrollRunner;
  /** Tier-2 snapshot; injectable so tests never shell out to the real `ps`. */
  readProc?: () => Promise<ProcSnapshot | null>;
  /** claude's registry directory; injectable so tests never read `~`. */
  claudeSessionsDir?: string;
  onStatus(sessionId: string, status: SessionStatus, at: number): void;
  onActivity(updates: SessionActivityUpdate[]): void;
  /**
   * Phase 13.7 — the depth reading the poll already has, handed to the
   * scrollback watch. NOT a UI payload: nothing in the renderer ever receives
   * it, and the only thing downstream can do with it is notice the moment a
   * session starts discarding output. Optional so tests and the smoke
   * harness need not care.
   */
  onScrollback?(samples: readonly ScrollbackSample[]): void;
  /**
   * `#{pane_dead}` — ipc.ts owns reaping and the death record. BOTH halves
   * travel: a clean exit carries a code, a signalled death carries a signal
   * name and NO code (research 21 §3), and neither can be inferred from the
   * other.
   */
  onDead(
    sessionId: string,
    exitCode: number | undefined,
    deadSignal: string | undefined
  ): void;
  /**
   * A session finished a turn (Phase 138). Fired from the ONE commit point
   * below, and only for the transition `isTurnBoundary` names. It never
   * throws into the tick, it is never awaited, and it may never set a
   * session's status. Optional, so tests and the smoke harness need not care.
   */
  onTurnBoundary?(sessionId: string, at: number): void;
  now?(): number;
}

/** Does this agent publish its state through claude's session registry? */
function usesClaudeRegistry(agent: string): boolean {
  return activityProfileFor(agent).native === 'claude-session-registry';
}

/** One session paired with everything this tick knows about it. */
interface LiveSession {
  session: ActivitySession;
  pane: PaneFacts;
  profile: AgentActivityProfile;
  st: SessionState;
}

// ---------------------------------------------------------------------------

export class SessionActivityMonitor {
  private readonly states = new Map<string, SessionState>();
  /** Pane facts from the most recent tick, for the event-driven paths. */
  private readonly lastPane = new Map<string, PaneFacts>();
  private readonly claude: ClaudeSessionRegistry;
  private readonly readProc: () => Promise<ProcSnapshot | null>;
  private readonly now: () => number;
  private captureCursor = 0;
  private ticking = false;
  private disposed = false;

  constructor(private readonly deps: ActivityMonitorDeps) {
    this.now = deps.now ?? ((): number => Date.now());
    this.readProc = deps.readProc ?? readProcSnapshot;
    this.claude = new ClaudeSessionRegistry(deps.claudeSessionsDir);
  }

  /**
   * Start watching claude's session registry. The watch is latency only —
   * every tick re-reads the directory regardless — so a failure to watch
   * (directory absent because claude was never run here) costs nothing.
   */
  start(): void {
    this.claude.start(() => {
      void this.refreshNative();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.claude.stop();
    this.states.clear();
    this.lastPane.clear();
  }

  /** Drop per-session state (session ended / was discarded). */
  forget(sessionId: string): void {
    this.states.delete(sessionId);
    this.lastPane.delete(sessionId);
  }

  private ensureState(sessionId: string): SessionState {
    let st = this.states.get(sessionId);
    if (st === undefined) {
      st = freshState(this.now());
      this.states.set(sessionId, st);
    }
    return st;
  }

  // -------------------------------------------------------------------------
  // Instant, event-driven paths
  // -------------------------------------------------------------------------

  /**
   * A hook fired for this session (claude's UserPromptSubmit / Stop / …).
   * Tier 0, so it commits immediately in both directions; the pid file
   * re-confirms within a second and silently corrects any disagreement.
   */
  noteHookEvent(sessionId: string, state: ActivityState, reason?: string): void {
    this.commit(sessionId, this.ensureState(sessionId), {
      state,
      tier: 'native',
      ...(reason !== undefined ? { reason } : {})
    });
  }

  /**
   * The user typed into this session (Phase 9.2): whatever it was waiting
   * for, it has an answer now. Clears needs_input without waiting for echo —
   * and a session may never be shown as needing input because of the user's
   * OWN input to it.
   */
  noteUserInput(sessionId: string): void {
    const st = this.states.get(sessionId);
    if (st === undefined || st.state !== 'needs_input') return;
    st.dialogTicks = 0;
    st.clearTicks = 0;
    this.commit(sessionId, st, { state: 'working', tier: 'native' });
  }

  /**
   * This session's pane changed size (Phase 12.11): a window resize, a split,
   * a sidebar toggle, or a terminal zoom. Whatever the app inside repaints
   * next is reflow, not work — discount it for `REFLOW_GRACE_MS` (the rules
   * live in state-machine.ts; this only stamps the clock).
   *
   * Untracked sessions are skipped rather than created: a resize during
   * attach, before the first tick has seen the pane, has nothing to protect.
   */
  noteGeometryChange(sessionId: string): void {
    const st = this.states.get(sessionId);
    if (st === undefined) return;
    st.reflowUntil = this.now() + REFLOW_GRACE_MS;
  }

  /**
   * claude rewrote a registry file: re-read it and re-evaluate the sessions
   * it speaks for, without waiting for the next tick. Pure T0 — no tmux exec,
   * no `ps`, so it is free to run on every file write.
   */
  private async refreshNative(): Promise<void> {
    if (this.disposed) return;
    await this.claude.refresh();
    for (const session of this.deps.sessions()) {
      if (!usesClaudeRegistry(session.agent)) continue;
      const st = this.states.get(session.id);
      const pane = this.lastPane.get(session.id);
      if (st === undefined || pane === undefined) continue;
      const entry = this.claude.forPane(pane.paneId);
      if (entry !== undefined) this.commit(session.id, st, claudeVerdict(entry));
    }
  }

  // -------------------------------------------------------------------------
  // The tick
  // -------------------------------------------------------------------------

  async tick(): Promise<void> {
    if (this.disposed || this.ticking) return;
    this.ticking = true;
    try {
      await this.runTick();
    } finally {
      this.ticking = false;
    }
  }

  private async runTick(): Promise<void> {
    const sessions = this.deps.sessions();
    const alive = new Set(sessions.map((s) => s.id));
    for (const id of [...this.states.keys()]) {
      if (!alive.has(id)) this.forget(id);
    }
    if (sessions.length === 0) return;

    const facts = await readPaneFacts(this.deps.exec);
    if (this.disposed) return;
    if (sessions.some((x) => usesClaudeRegistry(x.agent))) {
      await this.claude.refresh();
    }
    const now = this.now();

    const live = this.pairWithPanes(sessions, facts);
    if (live.length === 0) return;

    // AMBIGUOUS means "tier 0 did not answer THIS TICK" — not "this agent has
    // no oracle". The difference matters for the ~35 s window where claude
    // shows its workspace-trust gate BEFORE registering a pid file: gating on
    // the declared tier would leave that session with no screen capture, and
    // the trust gate is exactly what the dialog detector exists to catch.
    const ambiguous = new Set(
      live
        .filter(
          (e) =>
            nativeVerdict(e.pane, e.profile, e.st, e.session.cwd, this.claude, null) ===
              null && worthProbing(e.profile, e.st, now)
        )
        .map((e) => e.session.id)
    );

    // Tier 2 — one `ps` for everyone, only when someone needs it.
    const proc = ambiguous.size > 0 ? await this.readProc() : null;
    if (this.disposed) return;

    // Tier 3 — captures for the ambiguous, plus anything currently reported
    // as needing input (so the ⌘J excerpt is real and so the state can be
    // released when the dialog leaves the screen). A session mid-verdict on a
    // dialog jumps the queue: both the 2-capture confirmation and the
    // 2-capture release need CONSECUTIVE ticks, and round-robining them
    // behind a fleet of merely ambiguous panes turned a 4 s answer into 6 s.
    const wantCapture = live.filter(
      (e) =>
        !e.pane.inMode &&
        (ambiguous.has(e.session.id) || e.st.state === 'needs_input')
    );
    const captures = await this.captureScreens(
      wantCapture.filter((e) => isMidDialog(e.st)).map((e) => e.pane),
      wantCapture.filter((e) => !isMidDialog(e.st)).map((e) => e.pane)
    );
    if (this.disposed) return;

    const updates: SessionActivityUpdate[] = [];
    for (const e of live) {
      const capture = captures.get(e.pane.paneId);
      const ctx = {
        now,
        proc,
        ...(capture !== undefined ? { capture } : {})
      };
      const verdict: ActivityVerdict | null =
        nativeVerdict(e.pane, e.profile, e.st, e.session.cwd, this.claude, proc) ??
        inferredVerdict(e.pane, e.profile, e.st, ctx);
      if (verdict !== null) this.commit(e.session.id, e.st, verdict);
      const update = this.uiUpdate(e, capture);
      if (update !== null) updates.push(update);
    }
    if (updates.length > 0) this.deps.onActivity(updates);
    // Two integers per live session, straight off the read above — no extra
    // sample, no extra process, no extra timer (Phase 13.7).
    this.deps.onScrollback?.(
      live.map((e) => ({
        sessionId: e.session.id,
        lines: e.pane.historySize,
        limit: e.pane.historyLimit
      }))
    );
  }

  /**
   * Pair each session with its pane, reaping any that died. A session with no
   * pane is not this module's problem — reconcile owns that.
   */
  private pairWithPanes(
    sessions: readonly ActivitySession[],
    facts: ReadonlyMap<string, PaneFacts>
  ): LiveSession[] {
    const live: LiveSession[] = [];
    for (const session of sessions) {
      const pane = facts.get(session.tmuxId);
      if (pane === undefined) continue;
      if (pane.dead) {
        this.deps.onDead(session.id, pane.deadStatus, pane.deadSignal);
        this.forget(session.id);
        continue;
      }
      this.lastPane.set(session.id, pane);
      const st = this.ensureState(session.id);
      if (pane.keypad) st.sawKeypad = true;
      live.push({
        session,
        pane,
        profile: activityProfileFor(session.agent),
        st
      });
    }
    return live;
  }

  /** The ⌘J excerpt and the "last output" age, when either moved. */
  private uiUpdate(
    e: LiveSession,
    capture: string | undefined
  ): SessionActivityUpdate | null {
    const update: SessionActivityUpdate = { sessionId: e.session.id };
    let dirty = false;
    if (capture !== undefined) {
      const excerpt = excerptFromCapture(capture);
      if (excerpt.length > 0 && excerpt !== e.st.excerpt) {
        e.st.excerpt = excerpt;
        update.excerpt = excerpt;
        dirty = true;
      }
    }
    if (
      e.pane.activityAt > 0 &&
      e.pane.activityAt - e.st.lastActivityWrittenAt >= ACTIVITY_WRITE_MS
    ) {
      e.st.lastActivityWrittenAt = e.pane.activityAt;
      update.lastActivityAt = e.pane.activityAt;
      dirty = true;
    }
    return dirty ? update : null;
  }

  private commit(
    sessionId: string,
    st: SessionState,
    verdict: ActivityVerdict
  ): void {
    const now = this.now();
    // Read BEFORE commitVerdict, which mutates st.state.
    const from = st.state;
    const next = commitVerdict(st, verdict, now);
    if (next === null) return;
    this.deps.onStatus(sessionId, toSessionStatus(next), now);
    if (isTurnBoundary(from, next)) this.deps.onTurnBoundary?.(sessionId, now);
  }

  /**
   * Capture the VISIBLE screen of each pane — no `-e`, no `-J`, no `-S`.
   * Deliberately NOT tmux.capturePane(), which exists for the scrollback
   * snapshot and takes coloured history: the activity tiers want the plain
   * current screen and nothing else, because that is what the hash and the
   * dialog detector were measured against.
   *
   * One command per pane through the control client (a batched `;` sequence
   * would abort the whole tick if a single pane vanished mid-flight, and it
   * desyncs the control client's pending queue).
   *
   * `always` panes are captured every tick (their verdict needs consecutive
   * samples); the rest share what is left of the per-tick budget round-robin,
   * so a fleet of ambiguous sessions can never make a tick expensive.
   */
  private async captureScreens(
    always: readonly PaneFacts[],
    rotating: readonly PaneFacts[]
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const picked: PaneFacts[] = always.slice(0, MAX_CAPTURES_PER_TICK);
    const budget = MAX_CAPTURES_PER_TICK - picked.length;
    if (budget > 0 && rotating.length > 0) {
      if (this.captureCursor >= rotating.length) this.captureCursor = 0;
      const count = Math.min(rotating.length, budget);
      for (let i = 0; i < count; i++) {
        const pane = rotating[(this.captureCursor + i) % rotating.length];
        if (pane !== undefined) picked.push(pane);
      }
      this.captureCursor = (this.captureCursor + count) % rotating.length;
    }
    if (picked.length === 0) return out;
    await Promise.all(
      picked.map(async (pane) => {
        const text = await this.deps
          .run(['capture-pane', '-p', '-t', pane.paneId])
          .catch(() => null);
        if (text !== null) out.set(pane.paneId, text);
      })
    );
    return out;
  }
}
