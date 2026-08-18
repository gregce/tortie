/**
 * Sessions — the renderer's projection of main's session list, plus every
 * verb the UI has for it: create, rename, end, restart, remove, restore,
 * Past Sessions, and the ⌘J attention bookkeeping.
 *
 * Session status is MAIN's, full stop (Phase 13). The renderer used to derive
 * working / needs-input / idle itself from the `term:data:<id>` byte stream
 * and hold it in a `statusOverrides` map that outranked main — but bytes only
 * flow for the VISIBLE pane and the override was never cleared while a
 * session lived, so a session that had once produced output read "working"
 * forever. Detection now runs in main for every session, attached or not
 * (src/main/activity), and this slice just renders what it is told.
 */

import type { StateCreator } from 'zustand';
import type {
  AgentKind,
  LaunchableAgentKind,
  Session,
  SessionStatus
} from '@shared/types';
import type {
  AskRestoreProjectAnswer,
  GmuxActivityExtras,
  GmuxAskRestoreProjectExtras,
  GmuxPastSessionsExtras,
  GmuxScrollbackExtras,
  GmuxSessionExtras,
  GmuxSessionRestartExtras,
  GmuxSessionRestoreExtras,
  SavedSessionOutput
} from '@shared/ipc';
// Pure over Session fields; resume.ts imports only types and state/agents,
// and agents.ts does not import this store, so no cycle closes here.
import { pastRestoreNeedsAsk, resumeReadiness } from '../app/resume';
// Direct module import (NOT ../settings barrel): the barrel re-exports
// integration.ts which imports the app store — presets.ts itself does not.
import { defaultLaunchArgsFor } from '../settings/presets';
import { captureDefaultForAgent } from './specstory';
import { errorText } from './errors';
import type { AppState } from './app-state';

export interface SessionsSlice {
  sessions: Session[];
  /** Remembered selected session per project id. */
  activeSessionByProject: Record<string, string>;

  /** When a session flipped to needs_input (epoch ms) — ⌘J sort + ages. */
  attentionSince: Record<string, number>;
  /** Last non-empty terminal line per session (⌘J excerpt). */
  excerpts: Record<string, string>;
  /** Last observed output activity per session (epoch ms). */
  lastActivity: Record<string, number>;
  /**
   * PHASE 48. When THIS window saw a session stop (epoch ms), for the
   * sessions it also saw running.
   *
   * The ended block asks one question of it: did this session start and then
   * stop within five seconds? The session projection carries `createdAt` and
   * no death time at all, so the answer has to be observed rather than read.
   *
   * An id is absent when the window never saw that session alive, which is
   * every session that was already over when the window opened and every
   * session after a reload. Absent means the block draws exactly what it drew
   * before this phase, which is the honest answer: Tortie did not watch that
   * one start. The observed time is at or after the real one, so the error
   * can only hide a fast death and can never invent one.
   */
  endedSeenAt: Record<string, number>;

  setActiveSession(sessionId: string): void;
  cycleSession(delta: 1 | -1): void;
  /**
   * Terminal region reports which session panes are mounted right now (the
   * active surface's leaves — several at once under splits, S4A). Purely a
   * layout fact since Phase 13: status no longer depends on what is visible.
   */
  visibleSessionIds: string[];
  setVisibleSessions(sessionIds: string[]): void;

  /**
   * Adopt a full session list from main (boot hydration, sessions:changed,
   * a post-verb refresh) and keep the ⌘J bookkeeping and the per-project
   * selection valid against it. Subscription entry point (Phase 42 stage 4:
   * ./subscriptions calls this so the handler and the actions share one
   * body); components have no reason to call it.
   */
  applySessions(sessions: Session[]): void;
  /**
   * Adopt main's per-session status flip (sessions:status). Same posture as
   * `applySessions`: a subscription entry point, not a component verb.
   */
  applySessionStatus(sessionId: string, status: SessionStatus): void;

  createSession(input: {
    name: string;
    /** Phase 10: any launchable registry agent, not just the frozen trio. */
    agent: LaunchableAgentKind;
    cwd?: string;
    /**
     * Launch-flag preset tokens (shared/settings.ts catalogs). Main threads
     * these into BOTH argv and resume_argv (buildLaunchSpec), so a resumed
     * session keeps the flags it launched with.
     */
    extraArgs?: string[];
    /**
     * Phase 15: run this session under SpecStory capture. It rides through to
     * CreateSessionInput.capture, where main wraps BOTH argv and resume_argv.
     *
     * It is a named field rather than a spread-in extra for a reason worth
     * keeping: object spreads bypass TypeScript's excess-property check, so a
     * `capture` the store did not declare was accepted at the call site and
     * dropped here in silence — the create sheet's switch did nothing at all.
     */
    capture?: boolean;
    /**
     * PHASE 48: skip the structural preflight in main and launch the argv it
     * refused. It is the `Start it anyway` button in the create sheet and
     * nothing else sets it.
     *
     * A named field for the same reason `capture` is one: an object spread
     * bypasses TypeScript's excess-property check, so a field the store did
     * not declare would be accepted at the call site and dropped in silence
     * here.
     */
    startAnyway?: boolean;
    /**
     * PHASE 70: create this session on another machine. Omitted means this
     * Mac, which is every create before this release.
     *
     * A named field for the same reason `capture` and `startAnyway` are named
     * ones: an object spread bypasses TypeScript's excess-property check, so a
     * field the store did not declare would be accepted at the call site and
     * dropped in silence here. Dropping this one would create the session on
     * this Mac while the sheet said it was creating it somewhere else.
     */
    machineId?: string;
  }): Promise<boolean>;
  /** §6.2 one-click create. Widened with createSession (Phase 12): the
   *  no-sessions fleet launches ANY launchable registry agent, not the trio. */
  quickCreate(agent: LaunchableAgentKind): Promise<void>;
  renameSession(sessionId: string, name: string): Promise<void>;
  endSession(sessionId: string): void;
  restartSession(sessionId: string): Promise<void>;
  removeSession(sessionId: string): Promise<void>;
  /** Whether the optional sessions:discard bridge method exists. */
  canDiscard(): boolean;
  // -- restore (Phase 6) ------------------------------------------------------
  /** Session ids with a restore in flight (buttons show progress). */
  restoringIds: Record<string, boolean>;
  /** Whether the optional sessions:restore bridge method exists. */
  canRestore(): boolean;
  /**
   * Restore one 'restorable' session: recreate it in tmux with its saved
   * scrollback replayed and the resume command ARMED (typed, not run).
   */
  restoreSession(sessionId: string): Promise<void>;
  /** Restore every restorable session in the active project (sequential). */
  restoreAllSessions(): Promise<void>;
  // -- past sessions (Phase 29) -----------------------------------------------
  /** Whether the Past Sessions panel is open (Session menu, Past Sessions…). */
  pastOpen: boolean;
  /**
   * Discarded rows from every project, exactly as main sorted them (newest
   * removal first). The panel never re-sorts.
   */
  pastSessions: Session[];
  /** True while the open fetch is in flight, so the empty copy never flashes. */
  pastLoading: boolean;
  /**
   * Open or close the Past Sessions panel. Opening fetches through the
   * optional sessions:listRemoved bridge method; a missing method means the
   * panel opens in its empty state with no error, the same posture every
   * extras consumer takes.
   */
  setPastOpen(open: boolean): void;
  /**
   * Restore one discarded row through the existing Phase 26.3 verb (no new
   * channel). Success closes the panel, refreshes the session list and lands
   * on the restored session, the same landing the restart path gives.
   * Failure toasts sticky and re-fetches the list. The row is still there
   * because main kept it 'discarded'.
   */
  restorePastSession(sessionId: string): Promise<void>;
  // -- saved output (Phase 72) -----------------------------------------------
  /**
   * The session whose saved output panel is open, or null when it is closed.
   *
   * The panel is opened from one session menu item and from nowhere else. It
   * exists because a remote restore does NOT put the saved output back into
   * the recreated session on the other machine, so this is where that output
   * is, and because the capture time is the fact that stops a person reading
   * an hours old screen as live.
   */
  savedOutputSessionId: string | null;
  /** What main answered for that session, or null while there is no answer. */
  savedOutput: SavedSessionOutput | null;
  /** True while the one read is in flight, so the empty copy never flashes. */
  savedOutputLoading: boolean;
  /**
   * Open the saved output panel for one session. It reads through the optional
   * `scrollback.saved` bridge method; a preload without it opens the panel in
   * its empty state with no error, the same posture every extras consumer
   * takes.
   */
  openSavedOutput(sessionId: string): void;
  /** Close it and drop the text, so a body is not held after it is read. */
  closeSavedOutput(): void;
  /**
   * User input (keystrokes/mouse reports) went to a terminal: whatever it was
   * blocked on has an answer now. Pass the session id from the pty write
   * path; omitted → the active session (keydown fallback).
   */
  noteTerminalInput(sessionId?: string): void;

  // -- derived helpers ------------------------------------------------------
  projectSessions(projectId?: string | null): Session[];
  activeSession(): Session | null;
  effectiveStatus(session: Session): SessionStatus;
  attentionSessions(): Session[];
  attentionCountFor(projectPath: string): number;
}

/** Next free `<base>-<n>` ordinal within a session list (S6 name prefill). */
export function nextOrdinal(sessions: Session[], base: string): number {
  let max = 0;
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const s of sessions) {
    const m = re.exec(s.name);
    if (m && m[1] !== undefined) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/**
 * WHEN a session started needing input — ⌘J sorts by it and shows it as a
 * "waiting 4m" age. Main owns the verdict; the renderer only has to notice
 * the moment it arrived and forget it when the session moves on. Applied on
 * both status paths so the full-list refresh and the cheap per-session
 * event can never disagree.
 */
function withAttention(
  prev: Record<string, number>,
  sessions: readonly Session[]
): Record<string, number> {
  const next: Record<string, number> = {};
  const now = Date.now();
  let changed = false;
  for (const sess of sessions) {
    const was = prev[sess.id];
    if (sess.status !== 'needs_input') {
      if (was !== undefined) changed = true;
      continue;
    }
    next[sess.id] = was ?? now;
    if (was === undefined) changed = true;
  }
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

/**
 * PHASE 48. Stamp the moment a session this window was watching stopped.
 *
 * Same shape as {@link withAttention} and applied on both status paths for the
 * same reason: the full-list refresh and the cheap per-session event must not
 * be able to disagree. A stamp is written once and never moved, and a session
 * that leaves the list takes its stamp with it.
 *
 * A session that is ALREADY 'exited' in `before` gets no stamp, because this
 * window did not watch it stop. That is the case for every row that was over
 * when the window opened.
 */
function withEndedAt(
  prev: Record<string, number>,
  before: readonly Session[],
  after: readonly Session[]
): Record<string, number> {
  const aliveBefore = new Set<string>();
  for (const sess of before) {
    if (sess.status !== 'exited' && sess.status !== 'discarded') {
      aliveBefore.add(sess.id);
    }
  }
  const next: Record<string, number> = {};
  const now = Date.now();
  let changed = false;
  for (const sess of after) {
    const was = prev[sess.id];
    if (was !== undefined) {
      next[sess.id] = was;
      continue;
    }
    if (sess.status === 'exited' && aliveBefore.has(sess.id)) {
      next[sess.id] = now;
      changed = true;
    }
  }
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

export const createSessionsSlice: StateCreator<
  AppState,
  [],
  [],
  SessionsSlice
> = (set, get) => {
  const gmux = window.gmux as typeof window.gmux | undefined;

  const activityExtras = gmux
    ? (gmux as typeof gmux & GmuxActivityExtras)
    : null;

  const sessionExtras = gmux
    ? (gmux.sessions as typeof gmux.sessions &
        GmuxSessionExtras &
        GmuxSessionRestoreExtras &
        GmuxSessionRestartExtras &
        GmuxPastSessionsExtras &
        GmuxAskRestoreProjectExtras)
    : null;

  // Phase 72: the saved output read. It is on the top-level scrollback surface
  // rather than on `sessions`, because it is the fourth pull of the same kind
  // as the three the Settings card already makes.
  const scrollbackExtras = gmux
    ? ((gmux as typeof gmux & GmuxScrollbackExtras).scrollback ?? null)
    : null;

  return {
    sessions: [],
    activeSessionByProject: {},

    attentionSince: {},
    excerpts: {},
    lastActivity: {},
    endedSeenAt: {},

    setActiveSession(sessionId) {
      const { activeProjectId } = get();
      if (activeProjectId === null) return;
      set((s) => ({
        activeSessionByProject: {
          ...s.activeSessionByProject,
          [activeProjectId]: sessionId
        }
      }));
    },

    cycleSession(delta) {
      const sessions = get().projectSessions();
      if (sessions.length < 2) return;
      const active = get().activeSession();
      const cur = sessions.findIndex((x) => x.id === active?.id);
      const next = sessions[(cur + delta + sessions.length) % sessions.length];
      if (next) get().setActiveSession(next.id);
    },

    visibleSessionIds: [],

    setVisibleSessions(sessionIds) {
      const prev = get().visibleSessionIds;
      const same =
        prev.length === sessionIds.length &&
        prev.every((id, i) => id === sessionIds[i]);
      if (!same) set({ visibleSessionIds: sessionIds });
    },

    applySessions(sessions) {
      set((s) => ({
        sessions,
        attentionSince: withAttention(s.attentionSince, sessions),
        endedSeenAt: withEndedAt(s.endedSeenAt, s.sessions, sessions)
      }));
      // Keep per-project selection valid.
      const s = get();
      const { activeProjectId, activeSessionByProject } = s;
      if (activeProjectId !== null) {
        const proj = s.projects.find((p) => p.id === activeProjectId);
        if (proj) {
          const inProject = sessions.filter((x) => x.projectPath === proj.path);
          const selected = activeSessionByProject[activeProjectId];
          if (
            selected === undefined ||
            !inProject.some((x) => x.id === selected)
          ) {
            const fallback = inProject[inProject.length - 1];
            if (fallback) {
              set((st) => ({
                activeSessionByProject: {
                  ...st.activeSessionByProject,
                  [activeProjectId]: fallback.id
                }
              }));
            }
          }
        }
      }
    },

    applySessionStatus(sessionId, status) {
      set((s) => {
        const sessions = s.sessions.map((x) =>
          x.id === sessionId ? { ...x, status } : x
        );
        return {
          sessions,
          attentionSince: withAttention(s.attentionSince, sessions),
          endedSeenAt: withEndedAt(s.endedSeenAt, s.sessions, sessions)
        };
      });
    },

    async createSession({
      name,
      agent,
      cwd,
      extraArgs,
      capture,
      startAnyway,
      machineId
    }) {
      const project = get().activeProject();
      if (!gmux || !project) return false;
      // Silent display-name dedupe within the project (S6).
      const existing = new Set(
        get()
          .projectSessions()
          .map((x) => x.name)
      );
      let finalName = name;
      for (let n = 2; existing.has(finalName); n++) {
        finalName = `${name}-${n}`;
      }
      const session = await gmux.sessions.create({
        name: finalName,
        projectPath: project.path,
        // INTEGRATOR (Phase 10): CreateSessionInput.agent is still the frozen
        // AgentKind trio; shared/types.ts's registry-stream note widens it to
        // LaunchableAgentKind at reconciliation (main's buildLaunchSpec
        // already switches on every launchable id). Until then the wire cast
        // lives HERE, in exactly one place.
        agent: agent as AgentKind,
        ...(cwd !== undefined && cwd !== project.path ? { cwd } : {}),
        ...(extraArgs !== undefined && extraArgs.length > 0
          ? { extraArgs }
          : {}),
        // Only ever sent when it is ON: absent is the uncaptured session every
        // pre-Phase-15 build created, and main reads exactly `=== true`.
        ...(capture === true ? { capture: true } : {}),
        // Phase 48. Same rule: absent is every create that has not been
        // refused by the preflight, and main reads exactly `=== true`.
        ...(startAnyway === true ? { startAnyway: true } : {}),
        // Phase 70. Same rule again: absent is this Mac. Main refuses the id
        // unless that machine is confirmed and its version is one Tortie has
        // measured, so this field can ask for a machine and can never grant
        // one.
        ...(machineId !== undefined && machineId !== 'local'
          ? { machineId }
          : {})
      });
      get().setActiveSession(session.id);
      return true;
    },

    async quickCreate(agent) {
      try {
        const base = agent === 'shell' ? 'shell' : agent;
        const n = nextOrdinal(get().projectSessions(), base);
        // §6.2 quick-create bypasses the ⌘T modal, so Settings → Launch
        // defaults apply here directly (S13; the modal instead PRE-CHECKS
        // them and sends its own final selection). Cycle-safe import: the
        // presets module never imports this store.
        //
        // No confirmation is asked for here, and that is deliberate: a flag
        // that turns a safeguard off can only be in this list because the
        // user switched it on in the Settings window, which is enforced
        // where the settings are read rather than here (Phase 18.5 — the
        // danger seal in src/main/settings/store.ts). Enforcing it at the
        // launch path would have covered this function and missed the two
        // other modal-less paths: the per-agent hotkey in
        // settings/integration.ts and the ⌘T sheet's pre-checks. Main strips
        // an unsealed danger flag before any renderer sees it, so all three
        // are covered by one check and a fourth cannot be added by mistake.
        const defaults = defaultLaunchArgsFor(agent);
        // SpecStory capture follows the same rule as those flags (Phase 15,
        // research 13 §3.1): the sheet PRE-CHECKS the sticky per-agent answer
        // and sends its own, a no-modal create inherits it silently. Without
        // this line the ˅ board and the per-agent hotkeys would quietly
        // create UNcaptured sessions for an agent the user had switched on.
        // An inheritance the CLI can no longer honour is declined by main
        // with the reason said once, not swallowed.
        const capture = captureDefaultForAgent(agent);
        await get().createSession({
          name: `${base}-${n}`,
          agent,
          ...(defaults.length > 0 ? { extraArgs: defaults } : {}),
          ...(capture ? { capture: true } : {})
        });
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async renameSession(sessionId, name) {
      if (!gmux) return;
      const trimmed = name.trim();
      if (trimmed.length === 0) return;
      try {
        await gmux.sessions.rename({ sessionId, name: trimmed });
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    endSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || !gmux) return;
      // Phase 26.3 — the old body promised "its scrollback will be discarded.
      // This cannot be undone", and both halves stopped being true once
      // manual end writes a snapshot capsule and keeps the manifest row, so
      // the session can be restored. The first sentence keeps the one fact
      // that IS irreversible in front of the user: the running process dies
      // and does not resume mid-task. "First" is the Phase 19 ordering
      // promise (main captures before it kills); main's capture-failure
      // notice is what keeps that word honest on a full disk.
      const resumable = resumeReadiness(session) === 'conversation';
      get().setConfirm({
        title: `End '${session.name}'?`,
        body: resumable
          ? 'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.'
          : 'This stops what is running in it. The scrollback is saved first, so you can restore this session later.',
        confirmLabel: 'End session',
        destructive: true,
        onConfirm: () => {
          void gmux.sessions.kill(sessionId).catch((err: unknown) => {
            get().toast('error', errorText(err), { sticky: true });
          });
        }
      });
    },

    /**
     * Phase 19 item 8. NOTHING IS DISCARDED UNTIL THE REPLACEMENT EXISTS.
     *
     * This used to call `discard(sessionId)` first and create second, with a
     * comment saying it was so the replacement could take back its display
     * name. Discard deletes the manifest row, the scrollback snapshot and the
     * hook settings file, so a create that then failed — the agent binary gone
     * after an upgrade, the project folder unmounted, a full disk — left the
     * user with nothing, from a button that has no undo. The name collision it
     * was avoiding lasts for the length of one create and is invisible: both
     * rows carry the same display name for that moment, and the sanitized tmux
     * name, which no part of the UI shows, is the only thing that differs.
     *
     * The whole operation is one main-side call when the bridge offers it,
     * because main is the only side that can read the original launch flags
     * (they live in the manifest row's argv, not in the Session projection)
     * and because a renderer cannot hold an ordering invariant across a
     * window reload. The fallback below keeps the ordering right against an
     * older preload but cannot carry the flags.
     */
    async restartSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || !gmux) return;
      try {
        if (typeof sessionExtras?.restart === 'function') {
          const created = await sessionExtras.restart(sessionId);
          get().setActiveSession(created.id);
          return;
        }
        const created = await gmux.sessions.create({
          name: session.name,
          projectPath: session.projectPath,
          cwd: session.cwd,
          agent: session.agent,
          // The capture choice is the one setting the projection does carry.
          ...(session.capture !== undefined ? { capture: true } : {})
        });
        // Only now. A discard before this line is the defect.
        if (typeof sessionExtras?.discard === 'function') {
          await sessionExtras.discard(sessionId);
        }
        get().setActiveSession(created.id);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async removeSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || typeof sessionExtras?.discard !== 'function') return;
      const discard = sessionExtras.discard.bind(sessionExtras);
      // Phase 29. Remove is reversible now (main writes a tombstone behind
      // the same sessions:discard channel), so the body names the way back
      // instead of promising a loss that no longer happens.
      get().setConfirm({
        title: `Remove '${session.name}'?`,
        body: 'It moves to Past Sessions and you can restore it from there.',
        confirmLabel: 'Remove',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            try {
              await discard(sessionId);
              const sessions = await gmux!.sessions.list();
              get().applySessions(sessions);
            } catch (err) {
              get().toast('error', errorText(err), { sticky: true });
            }
          })();
        }
      });
    },

    canDiscard() {
      return typeof sessionExtras?.discard === 'function';
    },

    // -- restore (Phase 6) -----------------------------------------------------

    restoringIds: {},

    canRestore() {
      return typeof sessionExtras?.restore === 'function';
    },

    async restoreSession(sessionId) {
      if (typeof sessionExtras?.restore !== 'function') return;
      const restore = sessionExtras.restore.bind(sessionExtras);
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || get().restoringIds[sessionId] === true) return;
      set((s) => ({
        restoringIds: { ...s.restoringIds, [sessionId]: true }
      }));
      try {
        const restored = await restore(sessionId);
        get().setActiveSession(restored.id);
        const armed = (session.resumeArgv?.length ?? 0) > 0;
        get().toast(
          'success',
          armed
            ? `'${session.name}' restored — press Enter in the terminal to resume the conversation.`
            : `'${session.name}' restored.`
        );
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      } finally {
        set((s) => {
          const restoringIds = { ...s.restoringIds };
          delete restoringIds[sessionId];
          return { restoringIds };
        });
      }
    },

    async restoreAllSessions() {
      // Sequential on purpose: parallel tmux new-session calls can race the
      // name dedupe, and one toast per session stays readable.
      const targets = get()
        .projectSessions()
        .filter((x) => x.status === 'restorable');
      for (const t of targets) {
        await get().restoreSession(t.id);
      }
    },

    // -- past sessions (Phase 29) ------------------------------------------------

    pastOpen: false,
    pastSessions: [],
    pastLoading: false,

    setPastOpen(open) {
      if (!open) {
        set({ pastOpen: false });
        return;
      }
      const listRemoved = sessionExtras?.listRemoved;
      if (typeof listRemoved !== 'function') {
        // Older preload: the panel opens empty, with no error.
        set({ pastOpen: true, pastSessions: [], pastLoading: false });
        return;
      }
      set({ pastOpen: true, pastLoading: true });
      void listRemoved.call(sessionExtras).then(
        (rows) => set({ pastSessions: rows, pastLoading: false }),
        (err: unknown) => {
          set({ pastLoading: false });
          get().toast('error', errorText(err), { sticky: true });
        }
      );
    },

    async restorePastSession(sessionId) {
      if (typeof sessionExtras?.restore !== 'function') return;
      if (get().restoringIds[sessionId] === true) return;
      const restore = sessionExtras.restore.bind(sessionExtras);
      // Phase 60. A restore into a project that is not an open tab asks
      // FIRST, before the restoring flag, so the row's button never reads
      // "Restoring…" while the question is on screen. The open-project case
      // never reaches this block, by control flow rather than by promise;
      // an older preload without the extra keeps today's silent behavior.
      const row = get().pastSessions.find((x) => x.id === sessionId);
      if (
        row !== undefined &&
        pastRestoreNeedsAsk(row, get().projects.map((p) => p.path)) &&
        typeof sessionExtras.askRestoreProject === 'function'
      ) {
        let answer: AskRestoreProjectAnswer = 'cancel';
        try {
          answer = await sessionExtras.askRestoreProject({
            sessionName: row.name,
            projectPath: row.projectPath
          });
        } catch {
          /* an error on the ask changes nothing, which is the cancel behavior */
        }
        if (answer !== 'open') return;
        // Open the tab first so the restore lands somewhere visible.
        // addProjectPath toasts its own failures; if it failed, the restore
        // still proceeds exactly as a closed-project restore did before.
        await get().addProjectPath(row.projectPath);
      }
      set((s) => ({
        restoringIds: { ...s.restoringIds, [sessionId]: true }
      }));
      try {
        const restored = await restore(sessionId);
        set({ pastOpen: false });
        const sessions = await gmux!.sessions.list();
        get().applySessions(sessions);
        // Land on the restored session, the same landing restart gives. Its
        // project may not be an open tab (closing a tab keeps session rows);
        // in that case the restore still happened and the list refresh above
        // is the whole visible effect.
        const project = get().projects.find(
          (p) => p.path === restored.projectPath
        );
        if (project !== undefined) {
          get().setActiveProject(project.id);
          get().setActiveSession(restored.id);
        }
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
        // A failed restore is not a second loss. Main kept the row
        // 'discarded', so the re-fetch shows it still in the panel.
        const listRemoved = sessionExtras.listRemoved;
        if (typeof listRemoved === 'function') {
          try {
            set({ pastSessions: await listRemoved.call(sessionExtras) });
          } catch {
            /* keep the list we have */
          }
        }
      } finally {
        set((s) => {
          const restoringIds = { ...s.restoringIds };
          delete restoringIds[sessionId];
          return { restoringIds };
        });
      }
    },

    // -- saved output (Phase 72) -------------------------------------------------

    savedOutputSessionId: null,
    savedOutput: null,
    savedOutputLoading: false,

    openSavedOutput(sessionId) {
      const saved = scrollbackExtras?.saved;
      if (typeof saved !== 'function') {
        // Older preload: the panel opens and says it has nothing, with no
        // error. It is the same posture Past Sessions takes.
        set({
          savedOutputSessionId: sessionId,
          savedOutput: null,
          savedOutputLoading: false
        });
        return;
      }
      set({
        savedOutputSessionId: sessionId,
        savedOutput: null,
        savedOutputLoading: true
      });
      void saved.call(scrollbackExtras, sessionId).then(
        (found) => {
          // A second open before the first answered wins. Without this check
          // the older answer would land in the newer panel.
          if (get().savedOutputSessionId !== sessionId) return;
          set({ savedOutput: found, savedOutputLoading: false });
        },
        (err: unknown) => {
          if (get().savedOutputSessionId !== sessionId) return;
          set({ savedOutputLoading: false });
          get().toast('error', errorText(err));
        }
      );
    },

    closeSavedOutput() {
      // The body is dropped rather than kept. A saved screen can be several
      // megabytes and there is no reason to hold it after the panel is shut.
      set({
        savedOutputSessionId: null,
        savedOutput: null,
        savedOutputLoading: false
      });
    },

    noteTerminalInput(sessionId) {
      const id = sessionId ?? get().activeSession()?.id;
      if (id === undefined) return;
      // Fires from xterm's onData, i.e. once per keystroke, so it must not
      // cross the bridge on every character. The only thing main does with
      // it is release `needs_input` early, so nothing is lost by asking only
      // when the session is actually flagged — the monitor's own poll
      // handles every other case within a tick.
      const session = get().sessions.find((x) => x.id === id);
      if (session?.status !== 'needs_input') return;
      void activityExtras?.noteTerminalInput?.(id).catch(() => undefined);
    },

    // -- derived --------------------------------------------------------------

    projectSessions(projectId) {
      const s = get();
      const id = projectId === undefined ? s.activeProjectId : projectId;
      const project = s.projects.find((p) => p.id === id);
      if (!project) return [];
      return s.sessions.filter((x) => x.projectPath === project.path);
    },

    activeSession() {
      const s = get();
      if (s.activeProjectId === null) return null;
      const selected = s.activeSessionByProject[s.activeProjectId];
      const sessions = s.projectSessions();
      return (
        sessions.find((x) => x.id === selected) ??
        sessions[sessions.length - 1] ??
        null
      );
    },

    effectiveStatus(session) {
      return session.status;
    },

    attentionSessions() {
      const s = get();
      return s.sessions
        .filter((x) => s.effectiveStatus(x) === 'needs_input')
        .sort(
          (a, b) =>
            (s.attentionSince[b.id] ?? b.createdAt) -
            (s.attentionSince[a.id] ?? a.createdAt)
        );
    },

    attentionCountFor(projectPath) {
      const s = get();
      return s.sessions.filter(
        (x) =>
          x.projectPath === projectPath &&
          s.effectiveStatus(x) === 'needs_input'
      ).length;
    }
  };
};
