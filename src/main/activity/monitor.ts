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
import {
  ClaudeSessionRegistry,
  type ClaudeSessionEntry
} from './claude-registry';
import { claudeVerdict } from './oracles';
import { readPaneFacts, type PaneFacts } from './panes';
import type { ScrollbackSample } from '../scrollback/watch';
import {
  readChildPids,
  readProcessCommand,
  readProcSnapshot,
  readWitnessProcess,
  witnessFromSnapshot,
  type ProcSnapshot,
  type WitnessReading
} from './process';
import { excerptFromCapture } from './screen';
import {
  binaryCandidatesFor,
  commandNamesAgent,
  commitVerdict,
  dropIsSafeToDeclare,
  isTurnBoundary,
  freshState,
  inferredVerdict,
  isMidDialog,
  nativeVerdict,
  needsReturnBaseline,
  noteAgentLeft,
  noteHandbackResolved,
  noteReturn,
  noteWitness,
  REFLOW_GRACE_MS,
  returnTriggered,
  witnessCandidate,
  witnessEligible,
  witnessVerdict,
  worthProbing,
  type HandbackOutcome,
  type HandbackState,
  type SessionState
} from './state-machine';
import { toSessionStatus, type ActivityState, type ActivityVerdict } from './types';

/** Screen captures per tick — T3 is the only per-pane cost in the loop. */
const MAX_CAPTURES_PER_TICK = 6;
/**
 * Phase 141: the least time between two fleet process tables taken for the
 * witness alone. See `readProcForWitness` below for what asks for them and
 * what it costs.
 */
const WITNESS_TABLE_MIN_GAP_MS = 5_000;
/** ⌘J excerpt / age writes are coalesced to this granularity. */
const ACTIVITY_WRITE_MS = 15_000;
/**
 * Phase 141: how far above a candidate the pane's own process may sit before
 * the walk in `confirmUnderPane` gives up. Two hops covers every shape
 * measured on this Mac, being claude as the pane's own program, claude as a
 * child of the login shell in the restore shape, and claude as a grandchild
 * under SpecStory capture. The cap is there so a pathological or cyclic
 * process table can never spin a tick, the same reason `descendants` has one.
 */
const MAX_DESCENT_HOPS = 8;

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
  /**
   * Phase 141's three one-process reads, in the same spirit as `readProc`:
   * injectable so tests drive the drop edge without a process on the machine
   * having to play the part. Production leaves all three alone.
   */
  readWitness?: (pid: number) => Promise<WitnessReading>;
  readCommand?: (pid: number) => Promise<string | null>;
  readChildren?: (pid: number) => Promise<number[]>;
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
  /**
   * Phase 141. The agent Tortie watched in this session went away, or
   * something came back. ONE dependency beside `onDead`, and it is deliberate
   * that it sits beside that one rather than beside `onStatus`: this is a
   * fact about a session and never a status. It may not set a status, it may
   * not move a dot and it adds no member to `SessionStatus`. It never throws
   * into the tick and it is never awaited. Optional, so tests and the smoke
   * harness need not care.
   */
  onHandback?(sessionId: string, fact: HandbackFact): void;
  /**
   * Phase 141, and NOTHING WIRES THIS YET ON PURPOSE.
   *
   * The witness is free for an agent whose oracle answers nothing, because a
   * session nobody can read is already ambiguous and the fleet process table
   * is already in hand. It is NOT free for codex: `codexTitleVerdict` answers
   * `idle` whenever the pane title equals the working directory's name, so an
   * idle codex session never joins the ambiguous set and the table is never
   * read for it. Such a session can run its whole life with no witness and
   * would never offer the verb.
   *
   * Closing that costs one fleet table read, at most once every
   * WITNESS_TABLE_MIN_GAP_MS, on a tick where an agent session has no
   * witness. The snapshot goes ONLY to the witness recorder and never to a
   * verdict's inputs, because forcing the table into the verdict hands
   * `noteCpu` and `hasToolChild` to every other session on ticks they would
   * not otherwise have had them, which moves an unrelated session's dot and
   * is Phase 23 refusal 5 through a side door.
   *
   * That is 18.4 ms every 5 seconds in the worst case, and it stops being
   * called at all once every agent session has a witness, so it is a start up
   * cost rather than a running one. It is wired at the one call site, in
   * src/main/sessions/core.ts, and it stays optional so a test can leave it out
   * and drive the loop with no process table at all.
   */
  readProcForWitness?: () => Promise<ProcSnapshot | null>;
  now?(): number;
}

/**
 * What the witness saw (Phase 141). Two edges and no levels: the loop reports
 * the moment something changed, never the state it is already in.
 */
export type HandbackFact =
  | {
      kind: 'left';
      /** Epoch ms this edge was seen. */
      at: number;
      /** Epoch ms the AGENT left, which is not `at` on a second drop. */
      leftAt: number;
    }
  | {
      kind: 'returning';
      at: number;
      leftAt: number;
      /** The process that appeared under the pane's own process. */
      pid: number;
      /**
       * Its whole command line, read once. When he pasted a command carrying
       * a conversation id, this is where that id is. It is a reading and not
       * a claim: two live codex processes on this machine name no
       * conversation at all (research 64 §5.1).
       */
      command: string;
    };

/**
 * What a targeted walk found out about a pid claude's own record named
 * (Phase 141 fix round). Kept in this file because nothing outside the loop
 * asks the question and nothing outside the loop can answer it.
 */
interface DescentReading {
  /** The pid is a live process under the pane's own process. */
  under: boolean;
  /** Its real parent, or null when the pane's own process IS the pid. */
  ppid: number | null;
}

const NOT_UNDER_PANE: DescentReading = { under: false, ppid: null };

/** What claude's own record says about the conversation open in a pane. */
export interface ClaudeConversation {
  /** The `sessionId` claude published, being the conversation it has open. */
  sessionId: string;
  /** The directory claude names, which decides where its transcript is. */
  cwd?: string;
  /** The process that published it. */
  pid: number;
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
  private readonly readWitness: (pid: number) => Promise<WitnessReading>;
  private readonly readCommand: (pid: number) => Promise<string | null>;
  private readonly readChildren: (pid: number) => Promise<number[]>;
  private readonly now: () => number;
  private captureCursor = 0;
  private ticking = false;
  private disposed = false;
  /**
   * Phase 141: the process this session has already been asked about and
   * refused, being a foreground child whose command line did not name the
   * agent, or a pid out of claude's own record that no reading could place
   * under this pane. One reading per process, not one per tick, so a session
   * where somebody is working at the prompt costs 2.3 ms per command rather
   * than 2.3 ms per second, and a session living beside a leftover record
   * costs one read once.
   */
  private readonly rejectedChild = new Map<string, number>();
  /** When the last witness-only fleet table was taken (Phase 141). */
  private witnessTableAt = 0;

  constructor(private readonly deps: ActivityMonitorDeps) {
    this.now = deps.now ?? ((): number => Date.now());
    this.readProc = deps.readProc ?? readProcSnapshot;
    this.readWitness = deps.readWitness ?? readWitnessProcess;
    this.readCommand = deps.readCommand ?? readProcessCommand;
    this.readChildren = deps.readChildren ?? readChildPids;
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
    this.rejectedChild.clear();
  }

  /**
   * Drop per-session state (session ended / was discarded).
   *
   * `keepHandback` is for the ONE caller whose session is still there, being
   * claude's own `SessionEnd` hook. That hook means the agent ended and the
   * session did not, and forgetting everything took the drop with it: the
   * monitor started the next tick knowing nothing, so it could never see the
   * person type their resume, and the row kept offering the verb while the
   * agent was back. Found in the fix round while re-deriving the second
   * verdict. The activity state and the status memory are still cleared, which
   * is the whole of what that caller wanted.
   *
   * THE WITNESS IS KEPT TOO, and that half matters more than the drop does.
   * claude's `SessionEnd` hook is installed synchronously on purpose, because
   * an asynchronous one loses the event when the process exits, so CLAUDE IS
   * STILL RUNNING when the hook reaches us. `checkWitness` reads a live
   * process, correctly declares nothing, and no drop exists yet. Dropping the
   * pid there left the next tick with nothing to read, and claude had by then
   * deleted its own record, so no new witness could be taken either. The drop
   * was seen only when a tick happened to land inside the second claude took
   * to wind down. Keeping the pid and its parent is the whole of what the next
   * tick needs to declare the drop, and nothing else about the witness is
   * carried, because nothing else is read to declare one.
   */
  forget(sessionId: string, keepHandback = false): void {
    const before = this.states.get(sessionId);
    this.states.delete(sessionId);
    this.lastPane.delete(sessionId);
    this.rejectedChild.delete(sessionId);
    if (!keepHandback || before === undefined) return;
    if (before.handback === 'none' && before.witnessPid === null) return;
    const kept = freshState(this.now());
    kept.handback = before.handback;
    kept.leftAt = before.leftAt;
    // Null on the accelerated path, so the next tick sets it from a real
    // reading rather than from the facts that were already one tick old.
    kept.leftCommand = before.leftCommand;
    kept.witnessPid = before.witnessPid;
    kept.witnessPpid = before.witnessPpid;
    this.states.set(sessionId, kept);
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

    // Phase 141, the witness. It runs after the verdicts on purpose: it
    // reads nothing a verdict reads, it writes nothing a verdict writes, and
    // it cannot delay a status by a single tick.
    await this.witnessPass(live, proc, now);
    if (this.disposed) return;

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

  // -------------------------------------------------------------------------
  // Phase 141: the drop and the way back
  // -------------------------------------------------------------------------

  /**
   * One pass over the sessions whose row says they hold an agent. Three
   * things happen and each is skipped when it costs anything it need not:
   *
   *  - a session with a witness has that ONE process read, free when the
   *    fleet table was already taken this tick and 2.5 ms when it was not;
   *  - a session with no witness is offered a candidate, and a candidate from
   *    the process table has its command line read once before it is kept;
   *  - a session that dropped is checked against a field already on the line
   *    tier 1 reads, and only a change there costs anything at all.
   *
   * Nothing here sets a status, and nothing here can.
   */
  private async witnessPass(
    live: readonly LiveSession[],
    proc: ProcSnapshot | null,
    now: number
  ): Promise<void> {
    const watched = live.filter((e) => witnessEligible(e.session.agent));
    if (watched.length === 0) return;
    const forWitness = await this.procForWitness(watched, proc, now);
    if (this.disposed) return;
    await Promise.all(
      watched.map(async (e) => {
        await this.witnessOne(e, forWitness, now);
      })
    );
  }

  /**
   * The process table the witness recorder may use. It is the one the tick
   * already took, and it is only taken again when the wiring supplies a reader
   * and some watched session still has no witness. See `readProcForWitness`.
   */
  private async procForWitness(
    watched: readonly LiveSession[],
    proc: ProcSnapshot | null,
    now: number
  ): Promise<ProcSnapshot | null> {
    if (proc !== null) return proc;
    const extra = this.deps.readProcForWitness;
    if (extra === undefined) return null;
    if (now - this.witnessTableAt < WITNESS_TABLE_MIN_GAP_MS) return null;
    const wanted = watched.some(
      (e) =>
        e.st.witnessPid === null &&
        e.st.handback === 'none' &&
        e.profile.native !== 'claude-session-registry'
    );
    if (!wanted) return null;
    this.witnessTableAt = now;
    return extra();
  }

  /**
   * `paneIsFresh` is false on the one caller that does not run inside a tick,
   * being claude's own `SessionEnd` hook. Its pane facts are the previous
   * tick's, so it may declare the drop and must do nothing else: the return
   * rules all read `#{pane_current_command}`, and on those facts that field
   * still names the agent that has just gone.
   */
  private async witnessOne(
    e: LiveSession,
    proc: ProcSnapshot | null,
    now: number,
    paneIsFresh = true
  ): Promise<void> {
    const { st, pane } = e;
    if (st.witnessPid !== null) {
      const reading =
        proc !== null
          ? witnessFromSnapshot(proc, st.witnessPid)
          : await this.readWitness(st.witnessPid);
      if (this.disposed) return;
      const verdict = witnessVerdict(st, reading);
      if (
        (verdict === 'gone' || verdict === 'reused') &&
        dropIsSafeToDeclare(pane, proc) &&
        noteAgentLeft(st, pane, now, paneIsFresh)
      ) {
        this.deps.onHandback?.(e.session.id, {
          kind: 'left',
          at: now,
          leftAt: st.leftAt
        });
      }
    } else if (st.handback === 'none') {
      await this.acquireWitness(e, proc);
      if (this.disposed) return;
    }
    // `needsReturnBaseline` is the tick after a drop that was declared from
    // claude's own hook, which carries no fresh pane facts of its own. It goes
    // through the same door as an ordinary return: if something really is in
    // the session, it is picked up here, and if nothing is, the baseline is
    // set from this tick's reading and the session stays dropped.
    if (paneIsFresh && (needsReturnBaseline(st) || returnTriggered(st, pane))) {
      await this.noteSomethingRan(e, now);
    }
  }

  /**
   * Take the witness, and only a NAMED process that is really there. claude
   * names its own process in the record the native tier already reads,
   * including in the restore shape where the pane runs the login shell.
   * Everyone else offers the foreground child of the pane's own process, and
   * that child's command line is read once and kept only when it names this
   * row's agent.
   *
   * That last sentence is the one that keeps the promise this phase is built
   * on. A session Tortie restored, sitting with its command armed and
   * unpressed, has no children at all and so has no witness. Run an ordinary
   * command in it and a child appears and later leaves, which is the shape of
   * an agent leaving, and the command line is what refuses it.
   *
   * A CANDIDATE OUT OF CLAUDE'S OWN RECORD GETS THE SAME TREATMENT, added in
   * the fix round after the re-verifier drove it. The record is a file, and a
   * leftover file names a pid that is gone while naming a pane that a restored
   * session now wears, so a session where no agent ever ran was witnessed and
   * then announced as one an agent had left. `descent` is that candidate, and
   * it is confirmed by reading the process before it is believed.
   *
   * Both refusals are remembered per pid rather than per tick, so a session
   * living beside a leftover record costs one process read once and nothing
   * per second after it.
   */
  private async acquireWitness(
    e: LiveSession,
    proc: ProcSnapshot | null
  ): Promise<void> {
    const candidate = witnessCandidate(
      e.pane,
      e.profile,
      this.claude,
      proc
    );
    if (candidate === null) return;
    if (candidate.confirm === 'none') {
      noteWitness(e.st, e.pane, candidate.pid, candidate.ppid);
      return;
    }
    if (this.rejectedChild.get(e.session.id) === candidate.pid) return;
    if (candidate.confirm === 'descent') {
      const reading = await this.confirmUnderPane(
        candidate.pid,
        e.pane.panePid
      );
      if (this.disposed) return;
      if (reading.under) {
        noteWitness(e.st, e.pane, candidate.pid, reading.ppid);
        this.rejectedChild.delete(e.session.id);
        return;
      }
      this.rejectedChild.set(e.session.id, candidate.pid);
      return;
    }
    const command = await this.readCommand(candidate.pid);
    if (this.disposed) return;
    if (
      command !== null &&
      commandNamesAgent(command, binaryCandidatesFor(e.session.agent))
    ) {
      noteWitness(e.st, e.pane, candidate.pid, candidate.ppid);
      this.rejectedChild.delete(e.session.id);
      return;
    }
    this.rejectedChild.set(e.session.id, candidate.pid);
  }

  /**
   * Is this pid a live process under that pane's own process, and what is its
   * real parent. One targeted read of the candidate, then one of each process
   * above it until the pane's own process is reached.
   *
   * It exists because the fleet table is not read on a tick where every
   * session is answered by its oracle, which is most ticks of a healthy claude
   * session, and a record with nothing read about it is exactly the leftover
   * file case. A pid that is simply GONE is answered by the first read alone,
   * which is the cheap half and the one that matters most.
   *
   * The parent it reports is THE ONE THAT WAS READ. An agent under SpecStory
   * capture is a grandchild of its pane, so its parent is not the pane's own
   * process, and writing that down on faith is what made a healthy captured
   * agent read as a reused pid on every tick.
   */
  private async confirmUnderPane(
    pid: number,
    panePid: number
  ): Promise<DescentReading> {
    const reading = await this.readWitness(pid);
    if (!reading.found) return NOT_UNDER_PANE;
    // The agent IS the pane's own program, which is how a session Tortie
    // created runs it. There is nothing above it to walk to, and null is what
    // `noteWitness` records for that shape anyway.
    if (pid === panePid) return { under: true, ppid: null };
    let cur = pid;
    let parent = reading.ppid;
    for (let hops = 0; hops < MAX_DESCENT_HOPS; hops += 1) {
      if (parent === null || parent <= 1 || parent === cur) {
        return NOT_UNDER_PANE;
      }
      if (parent === panePid) return { under: true, ppid: reading.ppid };
      const up = await this.readWitness(parent);
      if (this.disposed || !up.found) return NOT_UNDER_PANE;
      cur = parent;
      parent = up.ppid;
    }
    return NOT_UNDER_PANE;
  }

  /**
   * Something is running in a session that dropped. Two reads, once, never
   * per tick: the pane's own process's children, then the newest one's whole
   * command line. The fleet table is deliberately NOT forced here, because
   * forcing it hands two extra signals to every other session's verdict on a
   * tick they would not otherwise have had them.
   *
   * The new process becomes the witness, so a resume that failed, which looks
   * exactly like a resume that never happened one to two seconds later,
   * brings the verb back on its own.
   */
  private async noteSomethingRan(
    e: LiveSession,
    now: number
  ): Promise<void> {
    const kids = await this.readChildren(e.pane.panePid);
    if (this.disposed) return;
    const pid = await this.foregroundOf(kids);
    if (this.disposed) return;
    if (pid === null) {
      // The trigger is a reason to look and nothing more. Nothing was there,
      // so the baseline moves rather than the state, and the next change
      // is looked at once too.
      e.st.leftCommand = e.pane.currentCommand;
      return;
    }
    const command = (await this.readCommand(pid)) ?? '';
    if (this.disposed) return;
    const leftAt = e.st.leftAt;
    noteReturn(e.st, e.pane, pid);
    this.deps.onHandback?.(e.session.id, {
      kind: 'returning',
      at: now,
      leftAt,
      pid,
      command
    });
  }

  /**
   * Which of these children holds the terminal, newest first.
   *
   * IT USED TO TAKE THE HIGHEST NUMBERED CHILD WITH NO CHECK AT ALL, and a
   * background job in the same session was therefore adopted as the agent
   * coming back. The person's verb appeared and was cancelled 199 ms later. A
   * process the person typed at their own prompt holds the terminal; a
   * background job does not, and neither does anything left over from before.
   *
   * A return read a fraction too early, before the shell has handed the
   * terminal over, simply answers null. Nothing is announced, the baseline
   * moves to this tick's reading, and the next change is looked at again.
   */
  private async foregroundOf(kids: readonly number[]): Promise<number | null> {
    for (let i = kids.length - 1; i >= 0; i -= 1) {
      const pid = kids[i];
      if (pid === undefined) continue;
      const reading = await this.readWitness(pid);
      if (this.disposed) return null;
      if (reading.found && reading.stat.includes('+')) return pid;
    }
    return null;
  }

  /**
   * claude's `SessionEnd` hook reached us, so the process it names is on its
   * way out. Checking the witness here removes the poll wait entirely for the
   * agent he uses most. It is an ACCELERATOR and never a dependency: every
   * agent, claude included, still reaches the same edge through the tick.
   *
   * A caller that also forgets this session must call this FIRST, because
   * forgetting drops the witness along with everything else.
   */
  async checkWitness(sessionId: string): Promise<void> {
    if (this.disposed) return;
    const st = this.states.get(sessionId);
    const pane = this.lastPane.get(sessionId);
    if (st === undefined || pane === undefined) return;
    const session = this.deps.sessions().find((x) => x.id === sessionId);
    if (session === undefined || !witnessEligible(session.agent)) return;
    await this.witnessOne(
      { session, pane, profile: activityProfileFor(session.agent), st },
      null,
      this.now(),
      false
    );
  }

  /** Where this session sits between an agent leaving and one coming back. */
  handbackFor(sessionId: string): HandbackState {
    return this.states.get(sessionId)?.handback ?? 'none';
  }

  /**
   * The conversation question was answered, or it was not. `adopted` puts the
   * session back to being an ordinary agent session; `unconfirmed` leaves it
   * saying that Tortie cannot tell which conversation is open, which is a
   * legitimate answer and the correct one for several agents.
   */
  noteHandbackResolved(sessionId: string, outcome: HandbackOutcome): void {
    const st = this.states.get(sessionId);
    if (st === undefined) return;
    noteHandbackResolved(st, outcome);
  }

  /**
   * What claude's own record says about the conversation open in one pane.
   * Read only, and it opens nothing new: the registry is already read and
   * watched six or more times a second, and Phase 141 only kept two fields
   * that were already in the JSON and were being thrown away.
   *
   * The pid is tried second because in the restore shape claude's record
   * names no pane at all, which is the shape this whole phase serves.
   */
  claudeConversationForPane(
    paneId: string,
    pid?: number
  ): ClaudeConversation | null {
    const entry =
      this.claude.forPane(paneId) ??
      (pid === undefined ? undefined : this.claude.forPid(pid));
    return conversationOf(entry);
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

/** One claude registry entry, as the conversation question needs it. */
function conversationOf(
  entry: ClaudeSessionEntry | undefined
): ClaudeConversation | null {
  if (entry === undefined || entry.sessionId === undefined) return null;
  return {
    sessionId: entry.sessionId,
    ...(entry.cwd !== undefined ? { cwd: entry.cwd } : {}),
    pid: entry.pid
  };
}
