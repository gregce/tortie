/**
 * gmux app store (zustand) — single source of renderer truth for the shell.
 *
 * Data flow: window.gmux (frozen IPC bridge) → store actions → components.
 *
 * Session status is MAIN's, full stop (Phase 13). The renderer used to derive
 * working / needs-input / idle itself from the `term:data:<id>` byte stream
 * and hold it in a `statusOverrides` map that outranked main — but bytes only
 * flow for the VISIBLE pane and the override was never cleared while a
 * session lived, so a session that had once produced output read "working"
 * forever. Detection now runs in main for every session, attached or not
 * (src/main/activity), and this store just renders what it is told.
 */

import { create } from 'zustand';
import type {
  AgentKind,
  GmuxErrorPayload,
  LaunchableAgentKind,
  Project,
  Session,
  SessionStatus
} from '@shared/types';
import type {
  CreateProjectInput,
  CreateProjectResult,
  GmuxActivityExtras,
  GmuxAppExtras,
  GmuxLoginItemExtras,
  GmuxProjectCreateExtras,
  GmuxProjectExtras,
  GmuxSessionExtras,
  GmuxSessionRestoreExtras,
  GmuxViewMenuExtras,
  PopupMenuIcon
} from '@shared/ipc';
import { showNativeMenu } from '../app/ContextMenu';
import { cancelPointerDrag } from '../app/split/pointer-drag';
// Direct module import (NOT ../settings barrel): the barrel re-exports
// integration.ts which imports this store — presets.ts itself does not.
import { defaultLaunchArgsFor } from '../settings/presets';

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/** Parse a main-process rejection into its structured payload, if any. */
export function errorPayload(err: unknown): GmuxErrorPayload | null {
  const raw = err instanceof Error ? err.message : String(err);
  const start = raw.indexOf('{');
  if (start === -1) return null;
  try {
    const payload = JSON.parse(raw.slice(start)) as GmuxErrorPayload;
    return typeof payload.message === 'string' ? payload : null;
  } catch {
    return null;
  }
}

/** Friendly one-line error copy. */
export function errorText(err: unknown): string {
  const payload = errorPayload(err);
  if (payload) return payload.message;
  return err instanceof Error ? err.message : String(err);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
  sticky?: boolean;
  action?: { label: string; run: () => void };
}

export interface ConfirmSpec {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  /**
   * Optional THIRD choice, for the one dialog shape where two answers can
   * only lose work: "Save / Don't Save / Cancel" when closing a dirty editor
   * tab. Rendered leading-left, away from the confirm button. Omit it and the
   * dialog stays the two-button destructive confirm it has always been.
   */
  altLabel?: string;
  onAlt?: () => void;
}

export interface MenuItemSpec {
  label: string;
  hint?: string;
  /** Grey second line under the label — prose the hint slot cannot carry. */
  sublabel?: string;
  /** Leading icon; see src/renderer/icons/agent-menu-icon.ts. */
  icon?: PopupMenuIcon;
  destructive?: boolean;
  disabled?: boolean;
  run: () => void;
}

export interface MenuSpec {
  x: number;
  y: number;
  items: (MenuItemSpec | 'sep')[];
}

/** Boot-blocking failures (S9 §6.4). */
export type BootBlock = 'tmux-missing' | null;

/**
 * Where the session surface lives (round 1, DESIGN.md §2.2): a tab strip
 * across the top of the terminal region (default) or a VS Code-style list
 * docked at its right. View-menu radio, persisted app-wide.
 */
export type SessionOrientation = 'top' | 'right';

/** The sidebar hosts ONE view at a time (round 1, activity bar). */
export type SidebarViewId = 'scm' | 'explorer';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AppState {
  ready: boolean;
  bootBlock: BootBlock;
  bootErrorDetail: string | null;

  projects: Project[];
  /** Tab display order (project ids); projects not listed sort last. */
  tabOrder: string[];
  sessions: Session[];
  activeProjectId: string | null;
  /** Remembered selected session per project id. */
  activeSessionByProject: Record<string, string>;

  /** When a session flipped to needs_input (epoch ms) — ⌘J sort + ages. */
  attentionSince: Record<string, number>;
  /** Last non-empty terminal line per session (⌘J excerpt). */
  excerpts: Record<string, string>;
  /** Last observed output activity per session (epoch ms). */
  lastActivity: Record<string, number>;

  toasts: Toast[];
  sidebarVisible: boolean;
  sidebarWidth: number;
  /** Session-surface orientation (View menu radio; persisted app-wide). */
  sessionOrientation: SessionOrientation;
  /** Right-docked session list width (persisted app-wide, 160–320). */
  rightListWidth: number;
  /** Active sidebar view per project id (activity bar; persisted). */
  sidebarViewByProject: Record<string, SidebarViewId>;

  createOpen: boolean;
  /** New Project… dialog (Phase 12.9 item 1). */
  newProjectOpen: boolean;
  shortcutsOpen: boolean;
  attentionOpen: boolean;
  confirm: ConfirmSpec | null;
  /** Session id being renamed inline (sidebar row or strip). */
  renamingSessionId: string | null;

  // -- lifecycle --------------------------------------------------------------
  boot(): Promise<void>;
  retryBoot(): Promise<void>;

  // -- selection ----------------------------------------------------------------
  setActiveProject(projectId: string): void;
  setActiveProjectByIndex(index: number): void;
  cycleProject(delta: 1 | -1): void;
  setActiveSession(sessionId: string): void;
  cycleSession(delta: 1 | -1): void;
  reorderTabs(fromId: string, toId: string): void;
  /**
   * Pointer-drag tab reorder (S2, round 2): move a project tab so it lands
   * at `toIndex` in the visual order (insertion-indicator semantics).
   */
  moveProjectToIndex(projectId: string, toIndex: number): void;
  /**
   * Terminal region reports which session panes are mounted right now (the
   * active surface's leaves — several at once under splits, S4A). Purely a
   * layout fact since Phase 13: status no longer depends on what is visible.
   */
  visibleSessionIds: string[];
  setVisibleSessions(sessionIds: string[]): void;

  // -- projects -----------------------------------------------------------------
  openProject(): Promise<void>;
  addProjectPath(path: string): Promise<void>;
  closeProject(projectId: string): void;
  /**
   * Phase 12.9 item 1 — make a folder, optionally `git init` it, open it as a
   * tab and focus it. Rejects so the dialog can put the reason on the field
   * that caused it; a `git init` that failed resolves normally (the folder
   * exists) and raises its own toast.
   */
  createProject(input: CreateProjectInput): Promise<CreateProjectResult>;
  /** Whether the optional projects:create bridge method exists. */
  canCreateProject(): boolean;

  // -- sessions -----------------------------------------------------------------
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
  /**
   * User input (keystrokes/mouse reports) went to a terminal: whatever it was
   * blocked on has an answer now. Pass the session id from the pty write
   * path; omitted → the active session (keydown fallback).
   */
  noteTerminalInput(sessionId?: string): void;

  // -- ui -----------------------------------------------------------------------
  toast(kind: ToastKind, text: string, opts?: Partial<Toast>): void;
  dismissToast(id: number): void;
  setCreateOpen(open: boolean): void;
  setNewProjectOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
  setAttentionOpen(open: boolean): void;
  setConfirm(spec: ConfirmSpec | null): void;
  /** Show a native context menu (null is accepted and ignored — native menus dismiss themselves). */
  setMenu(menu: MenuSpec | null): void;
  setRenaming(sessionId: string | null): void;
  toggleSidebar(): void;
  setSidebarWidth(width: number): void;
  setSessionOrientation(orientation: SessionOrientation): void;
  setRightListWidth(width: number): void;
  /** Set the active project's sidebar view (persisted per project). */
  setSidebarView(view: SidebarViewId): void;
  /** ⌘⇧E / ⌃⇧G: open the sidebar if collapsed and show the view. */
  showSidebarView(view: SidebarViewId): void;
  /** The active project's sidebar view ('scm' by default). */
  activeSidebarView(): SidebarViewId;

  // -- derived helpers ------------------------------------------------------
  orderedProjects(): Project[];
  activeProject(): Project | null;
  projectSessions(projectId?: string | null): Session[];
  activeSession(): Session | null;
  effectiveStatus(session: Session): SessionStatus;
  attentionSessions(): Session[];
  attentionCountFor(projectPath: string): number;
}

let toastSeq = 1;

const LS_TAB_ORDER = 'gmux.tabOrder';
const LS_ACTIVE_PROJECT = 'gmux.activeProject';
const LS_SIDEBAR_WIDTH = 'gmux.sidebarWidth';
// Round-1 layout: orientation is read back by src/main/menu.ts (radio sync) —
// key name is part of that contract.
const LS_ORIENTATION = 'gmux.sessionOrientation';
const LS_RIGHT_LIST_WIDTH = 'gmux.rightListWidth';
const LS_SIDEBAR_VIEW = 'gmux.sidebarView';

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/unavailable — cosmetic state only */
  }
}

export const useApp = create<AppState>((set, get) => {
  const gmux = window.gmux as typeof window.gmux | undefined;

  const activityExtras = gmux
    ? (gmux as typeof gmux & GmuxActivityExtras)
    : null;

  const sessionExtras = gmux
    ? (gmux.sessions as typeof gmux.sessions &
        GmuxSessionExtras &
        GmuxSessionRestoreExtras)
    : null;

  /**
   * WHEN a session started needing input — ⌘J sorts by it and shows it as a
   * "waiting 4m" age. Main owns the verdict; the renderer only has to notice
   * the moment it arrived and forget it when the session moves on. Applied on
   * both status paths so the full-list refresh and the cheap per-session
   * event can never disagree.
   */
  const withAttention = (
    prev: Record<string, number>,
    sessions: readonly Session[]
  ): Record<string, number> => {
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
  };

  const applySessions = (sessions: Session[]): void => {
    set((s) => ({
      sessions,
      attentionSince: withAttention(s.attentionSince, sessions)
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
  };

  return {
    ready: false,
    bootBlock: null,
    bootErrorDetail: null,

    projects: [],
    tabOrder: loadLocal<string[]>(LS_TAB_ORDER, []),
    sessions: [],
    activeProjectId: null,
    activeSessionByProject: {},

    attentionSince: {},
    excerpts: {},
    lastActivity: {},

    toasts: [],
    sidebarVisible: true,
    sidebarWidth: loadLocal<number>(LS_SIDEBAR_WIDTH, 280),
    sessionOrientation:
      loadLocal<SessionOrientation>(LS_ORIENTATION, 'top') === 'right'
        ? 'right'
        : 'top',
    rightListWidth: Math.min(
      320,
      Math.max(160, loadLocal<number>(LS_RIGHT_LIST_WIDTH, 200))
    ),
    sidebarViewByProject: loadLocal<Record<string, SidebarViewId>>(
      LS_SIDEBAR_VIEW,
      {}
    ),

    createOpen: false,
    newProjectOpen: false,
    shortcutsOpen: false,
    attentionOpen: false,
    confirm: null,
    renamingSessionId: null,

    // -- lifecycle -----------------------------------------------------------

    async boot() {
      if (!gmux) return;
      try {
        const [projects, sessions] = await Promise.all([
          gmux.projects.list(),
          gmux.sessions.list()
        ]);
        // A project added WHILE this list was in flight is also main's truth
        // — it went through projects:add and is in the manifest; it is just
        // newer than the snapshot. Overwriting would silently drop it, which
        // is what a ⌘O (or the screenshot harness) in the first second used
        // to do. Union, keeping the manifest's order and appending the ones
        // this read could not have seen.
        const known = new Set(projects.map((p) => p.id));
        const merged = [
          ...projects,
          ...get().projects.filter((p) => !known.has(p.id))
        ];
        const savedActive = loadLocal<string | null>(LS_ACTIVE_PROJECT, null);
        const activeProjectId =
          get().activeProjectId ??
          merged.find((p) => p.id === savedActive)?.id ??
          merged[0]?.id ??
          null;
        set({
          ready: true,
          bootBlock: null,
          bootErrorDetail: null,
          projects: merged,
          activeProjectId
        });
        applySessions(sessions);
        // §6.7 — T1 restore moment: sessions were running while gmux was
        // closed. One calm toast, no friction.
        if (sessions.some((x) => x.status === 'running')) {
          get().toast('success', 'Restored. Your sessions were never interrupted.');
        }
        const restorable = sessions.filter((x) => x.status === 'restorable');
        if (restorable.length > 0) {
          get().toast(
            'info',
            restorable.length === 1
              ? '1 session is saved and ready to restore.'
              : `${restorable.length} sessions are saved and ready to restore.`
          );
        }
      } catch (err) {
        const payload = errorPayload(err);
        if (payload?.code === 'TMUX_NOT_FOUND') {
          set({
            ready: true,
            bootBlock: 'tmux-missing',
            bootErrorDetail: payload.detail ?? null
          });
        } else {
          set({ ready: true });
          get().toast('error', errorText(err), { sticky: true });
        }
      }

      gmux.sessions.onChanged((sessions) => applySessions(sessions));
      gmux.sessions.onStatusChanged((sessionId, status) => {
        set((s) => {
          const sessions = s.sessions.map((x) =>
            x.id === sessionId ? { ...x, status } : x
          );
          return {
            sessions,
            attentionSince: withAttention(s.attentionSince, sessions)
          };
        });
      });

      // ⌘J excerpts and last-output times (Phase 13). These used to be
      // scraped off the visible pane's byte stream; main now sources them
      // from the same poll that decides status, so HIDDEN sessions have
      // them too.
      activityExtras?.onActivityChanged?.((updates) => {
        set((s) => {
          const excerpts = { ...s.excerpts };
          const lastActivity = { ...s.lastActivity };
          for (const u of updates) {
            if (u.excerpt !== undefined) excerpts[u.sessionId] = u.excerpt;
            if (u.lastActivityAt !== undefined) {
              lastActivity[u.sessionId] = u.lastActivityAt;
            }
          }
          return { excerpts, lastActivity };
        });
      });
    },

    async retryBoot() {
      set({ bootBlock: null });
      await get().boot();
    },

    // -- selection -------------------------------------------------------------

    setActiveProject(projectId) {
      set({ activeProjectId: projectId });
      saveLocal(LS_ACTIVE_PROJECT, projectId);
    },

    setActiveProjectByIndex(index) {
      const ordered = get().orderedProjects();
      const target = ordered[index];
      if (target) get().setActiveProject(target.id);
    },

    cycleProject(delta) {
      const ordered = get().orderedProjects();
      if (ordered.length < 2) return;
      const cur = ordered.findIndex((p) => p.id === get().activeProjectId);
      const next = ordered[(cur + delta + ordered.length) % ordered.length];
      if (next) get().setActiveProject(next.id);
    },

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

    reorderTabs(fromId, toId) {
      if (fromId === toId) return;
      const ordered = get().orderedProjects().map((p) => p.id);
      const from = ordered.indexOf(fromId);
      const to = ordered.indexOf(toId);
      if (from === -1 || to === -1) return;
      ordered.splice(to, 0, ...ordered.splice(from, 1));
      set({ tabOrder: ordered });
      saveLocal(LS_TAB_ORDER, ordered);
    },

    moveProjectToIndex(projectId, toIndex) {
      const ordered = get().orderedProjects().map((p) => p.id);
      const from = ordered.indexOf(projectId);
      if (from === -1) return;
      const clamped = Math.max(0, Math.min(ordered.length, toIndex));
      const target = clamped > from ? clamped - 1 : clamped;
      if (target === from) return;
      ordered.splice(target, 0, ...ordered.splice(from, 1));
      set({ tabOrder: ordered });
      saveLocal(LS_TAB_ORDER, ordered);
    },

    visibleSessionIds: [],

    setVisibleSessions(sessionIds) {
      const prev = get().visibleSessionIds;
      const same =
        prev.length === sessionIds.length &&
        prev.every((id, i) => id === sessionIds[i]);
      if (!same) set({ visibleSessionIds: sessionIds });
    },

    // -- projects ---------------------------------------------------------------

    async openProject() {
      if (!gmux) return;
      try {
        const dir = await gmux.projects.pickDirectory();
        if (dir === null) return;
        await get().addProjectPath(dir);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async addProjectPath(path) {
      if (!gmux) return;
      try {
        const project = await gmux.projects.add(path);
        const projects = await gmux.projects.list();
        set({ projects });
        // Idempotent open: adding an already-open project focuses its tab.
        get().setActiveProject(project.id);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    canCreateProject() {
      const projects = gmux?.projects as
        | (NonNullable<typeof gmux>['projects'] & GmuxProjectCreateExtras)
        | undefined;
      return typeof projects?.create === 'function';
    },

    async createProject(input) {
      const projects = gmux?.projects as
        | (NonNullable<typeof gmux>['projects'] & GmuxProjectCreateExtras)
        | undefined;
      if (projects === undefined || typeof projects.create !== 'function') {
        throw new Error('This build cannot create projects.');
      }
      const result = await projects.create(input);
      const list = await projects.list();
      set({ projects: list });
      // The tab appears focused and its no-sessions state offers the whole
      // fleet — that IS the "start a session in it now" step, so there is no
      // success toast to write. Only the one thing that silently did not
      // happen gets said out loud.
      get().setActiveProject(result.project.id);
      if (result.gitError !== undefined) {
        get().toast(
          'error',
          `Created '${result.project.name}', but it is not a git repository — ${result.gitError}`,
          { sticky: true }
        );
      }
      return result;
    },

    closeProject(projectId) {
      const project = get().projects.find((p) => p.id === projectId);
      if (!project || !gmux) return;
      get().setConfirm({
        title: `Close '${project.name}'?`,
        body: 'Its sessions keep running and reappear when you reopen it.',
        confirmLabel: 'Close project',
        onConfirm: () => {
          void (async () => {
            try {
              await gmux.projects.remove(projectId);
              const projects = await gmux.projects.list();
              set((s) => {
                const next: Partial<AppState> = { projects };
                if (s.activeProjectId === projectId) {
                  next.activeProjectId = projects[0]?.id ?? null;
                }
                return next;
              });
            } catch (err) {
              get().toast('error', errorText(err), { sticky: true });
            }
          })();
        }
      });
    },

    // -- sessions -----------------------------------------------------------------

    async createSession({ name, agent, cwd, extraArgs }) {
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
        const defaults = defaultLaunchArgsFor(agent);
        await get().createSession({
          name: `${base}-${n}`,
          agent,
          ...(defaults.length > 0 ? { extraArgs: defaults } : {})
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
      get().setConfirm({
        title: `End '${session.name}'?`,
        body: 'Its process will stop and its scrollback will be discarded. This cannot be undone.',
        confirmLabel: 'End session',
        destructive: true,
        onConfirm: () => {
          void gmux.sessions.kill(sessionId).catch((err: unknown) => {
            get().toast('error', errorText(err), { sticky: true });
          });
        }
      });
    },

    async restartSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || !gmux) return;
      try {
        // Clear the old row first when the bridge supports it, so the
        // restarted session takes back its name.
        if (typeof sessionExtras?.discard === 'function') {
          await sessionExtras.discard(sessionId);
        }
        const created = await gmux.sessions.create({
          name: session.name,
          projectPath: session.projectPath,
          cwd: session.cwd,
          agent: session.agent
        });
        get().setActiveSession(created.id);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async removeSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || typeof sessionExtras?.discard !== 'function') return;
      const discard = sessionExtras.discard.bind(sessionExtras);
      get().setConfirm({
        title: `Remove '${session.name}'?`,
        body: 'Its scrollback will be discarded.',
        confirmLabel: 'Remove',
        destructive: true,
        onConfirm: () => {
          void (async () => {
            try {
              await discard(sessionId);
              const sessions = await gmux!.sessions.list();
              applySessions(sessions);
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

    // -- ui -----------------------------------------------------------------------

    toast(kind, text, opts) {
      const id = toastSeq++;
      set((s) => ({ toasts: [...s.toasts, { id, kind, text, ...opts }] }));
      const sticky = opts?.sticky ?? kind === 'error';
      if (!sticky) {
        setTimeout(() => get().dismissToast(id), 5_000);
      }
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    setNewProjectOpen(open) {
      set({ newProjectOpen: open });
    },

    setCreateOpen(open) {
      set({ createOpen: open });
    },

    setShortcutsOpen(open) {
      set({ shortcutsOpen: open });
    },

    setAttentionOpen(open) {
      set({ attentionOpen: open });
    },

    setConfirm(spec) {
      set({ confirm: spec });
    },

    setMenu(menu) {
      // DESIGN.md §3: context menus are native macOS menus (Menu.popup),
      // never DOM-drawn. Every trigger surface (session row, project tab,
      // SCM row, tree row, session strip, settings gear) funnels through
      // here into the one thin bridge helper. There is no DOM fallback;
      // null is a no-op (native menus dismiss themselves).
      //
      // Being the ONE choke point is also what makes it the right place to
      // revoke a pending drag (Phase 12.2): the native menu takes an OS mouse
      // grab, so the pointerup that would have torn that drag down never
      // arrives. Cancel here and no surface can be left tracking the pointer
      // underneath an open menu.
      if (menu !== null) {
        cancelPointerDrag();
        showNativeMenu(menu);
      }
    },

    setRenaming(sessionId) {
      // Belt and braces for any path that arms a drag before a rename starts
      // — the rename box must never be fought by a row tracking the pointer.
      if (sessionId !== null) cancelPointerDrag();
      set({ renamingSessionId: sessionId });
    },

    toggleSidebar() {
      set((s) => ({ sidebarVisible: !s.sidebarVisible }));
    },

    setSidebarWidth(width) {
      const clamped = Math.min(400, Math.max(220, width));
      set({ sidebarWidth: clamped });
      saveLocal(LS_SIDEBAR_WIDTH, clamped);
    },

    setSessionOrientation(orientation) {
      set({ sessionOrientation: orientation });
      saveLocal(LS_ORIENTATION, orientation);
      // ONE truth, several controls (Phase 12.12 item 2): the View-menu
      // radios, the SESSIONS header's inline toggle and its ˅ menu all read
      // and write THIS value — but main draws the radios, so it has to be
      // told. Feature-detected: an older preload just keeps the once-per-load
      // sync it always had.
      const bridge = window.gmux as
        | (typeof window.gmux & GmuxViewMenuExtras)
        | undefined;
      if (typeof bridge?.setSessionsPosition === 'function') {
        void bridge.setSessionsPosition(orientation).catch(() => {
          /* a radio mark is cosmetic — never surface this */
        });
      }
    },

    setRightListWidth(width) {
      const clamped = Math.min(320, Math.max(160, width));
      set({ rightListWidth: clamped });
      saveLocal(LS_RIGHT_LIST_WIDTH, clamped);
    },

    setSidebarView(view) {
      const { activeProjectId } = get();
      if (activeProjectId === null) return;
      const sidebarViewByProject = {
        ...get().sidebarViewByProject,
        [activeProjectId]: view
      };
      set({ sidebarViewByProject });
      saveLocal(LS_SIDEBAR_VIEW, sidebarViewByProject);
    },

    showSidebarView(view) {
      if (!get().sidebarVisible) set({ sidebarVisible: true });
      get().setSidebarView(view);
    },

    activeSidebarView() {
      const { activeProjectId, sidebarViewByProject } = get();
      if (activeProjectId === null) return 'scm';
      return sidebarViewByProject[activeProjectId] ?? 'scm';
    },

    // -- derived --------------------------------------------------------------

    orderedProjects() {
      const { projects, tabOrder } = get();
      const rank = new Map(tabOrder.map((id, i) => [id, i]));
      return [...projects].sort((a, b) => {
        const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });
    },

    activeProject() {
      const { projects, activeProjectId } = get();
      return projects.find((p) => p.id === activeProjectId) ?? null;
    },

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
});

/**
 * The status to render for a session.
 *
 * Since Phase 13 this is just main's verdict — there is no renderer-side
 * refinement left to apply, and deliberately no way for one to creep back in.
 * It stays a named function because every surface (dock, strip, split, ⌘J,
 * titlebar) should read status through ONE expression, and because the call
 * sites document that they are showing main's truth rather than their own.
 */
export function effectiveStatusOf(session: Session): SessionStatus {
  return session.status;
}

/** Pure tab-order sort (render-safe companion to orderedProjects()). */
export function sortProjects(
  projects: Project[],
  tabOrder: string[]
): Project[] {
  const rank = new Map(tabOrder.map((id, i) => [id, i]));
  return [...projects].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
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

/** Optional bridge extras, feature-detected (see src/shared/ipc.ts). */
export function projectExtras(): GmuxProjectExtras {
  return (window.gmux?.projects ?? {}) as GmuxProjectExtras;
}

export function appExtras(): GmuxAppExtras {
  return (window.gmux ?? {}) as unknown as GmuxAppExtras;
}

/** Optional login-item bridge extras (Phase 6), feature-detected. */
export function loginItemExtras(): GmuxLoginItemExtras {
  return (window.gmux ?? {}) as unknown as GmuxLoginItemExtras;
}
