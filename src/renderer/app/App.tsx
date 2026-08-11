/**
 * gmux app shell (Phase 3) — composition + the DESIGN.md §4 keyboard map.
 *
 * Layout: titlebar (project tabs) / sidebar (sessions; git+tree slots) /
 * terminal region. Layers: attention overlay → modals → toasts; context
 * menus are native (Menu.popup) and dismiss themselves. Esc closes the
 * topmost layer (§4).
 *
 * The native macOS menu (src/main/menu.ts) registers the ⌘-chord
 * accelerators and forwards them here as menu actions (useMenuActions).
 * MEASURED ORDER (Electron 43; the old comment here had it backwards): this
 * keydown map runs FIRST and the accelerator arrives ~5 ms later, so a
 * branch that calls preventDefault() suppresses its menu item and is the
 * only path that runs — which is why a chord handled in both places must
 * not do its work twice. Chords the menu does not register at all (⌘1…⌘9,
 * ⌘⇧]/⌘⇧[, ⌘↩) live here alone.
 */

import React, { useEffect } from 'react';
import type {
  AnyMenuActionWithProjects,
  GmuxMenuExtras,
  GmuxQuitExtras,
  MenuActionId
} from '@shared/ipc';
import { useApp } from '../state/store';
import type { SidebarViewId } from '../state/store';
import { useLayout } from '../state/layout';
import type { NavDir } from '../state/layout';
import { useEditor } from '../editor/store';
import { Titlebar } from './Titlebar';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { TerminalRegion } from './TerminalRegion';
import { SessionDock } from './SessionDock';
import { CreateSessionModal } from './CreateSessionModal';
import { NewProjectModal } from './NewProjectModal';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { AttentionOverlay } from './AttentionOverlay';
import { ConfirmDialog } from './ConfirmDialog';
import { Toasts } from './Toasts';
import { FirstRun, TmuxMissing } from './EmptyStates';
// Shared with the ⌘J overlay: "land the user in this session" exists once.
import { focusTerminal, jumpToSession } from './session-focus';
// Phase 12.4/12.6: "show this once, ever" lives in exactly one place — the
// first-quit toast below is one of its catalog entries, not a second copy.
import { showOneTimeTip } from './one-time-tip';
// Phase 5 (editor stream): the S5 editor panel — a right split beside the
// terminal region (overlay under 1400px). It renders null until a file opens.
import { EditorPanel } from '../editor';
// Phase 12 item 8 (drop stream): THE window-level file-drag router — one set
// of listeners for "attach to this session" AND the §6.1 "add a project"
// frame, dispatched by hit-test. It replaces the old useFolderDrop hook,
// which read `File.path` (removed in Electron 32) and so had silently
// degraded every folder drop to the picker.
import { FileDropOverlay, useFileDropRouter } from '../terminal/drop';
// Phase 10 (settings+hotkeys stream, S13): warms the shared settings store
// (⌘T preset defaults) and handles the user-recorded per-agent hotkey menu
// actions (launch-agent:<id> → new session in the active project).
import { useSettingsIntegration } from '../settings';

// ---------------------------------------------------------------------------
// Keyboard map (DESIGN.md §4) — one capture-phase listener; ⌘-chords and F2
// always reach the app, even while the terminal owns the keyboard.
// ---------------------------------------------------------------------------

/**
 * The session surface the keyboard is "on" right now: any focused element
 * inside a session tab (top orientation), a dock row or the identity strip
 * (right orientation) resolves to that surface's session via its
 * data-session-id. Null when focus is elsewhere (terminal, editor…) —
 * callers fall back to the active session, per §4 "rename focused item".
 */
function focusedSessionRowId(): string | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return null;
  return el.closest<HTMLElement>('[data-session-id]')?.dataset['sessionId'] ?? null;
}

/**
 * ⌘⇧E / ⌃⇧G (S3): show + focus the view; pressed again while the view is
 * focused → focus returns to the terminal.
 */
function showViewAction(view: SidebarViewId): void {
  const s = useApp.getState();
  const viewEl = document.querySelector<HTMLElement>('.sidebar-view');
  const focusInside =
    viewEl !== null && viewEl.contains(document.activeElement);
  if (s.sidebarVisible && s.activeSidebarView() === view && focusInside) {
    document
      .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
      ?.focus();
    return;
  }
  s.showSidebarView(view);
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('.sidebar-view')?.focus();
  });
}

function useKeyboardMap(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const s = useApp.getState();
      const meta = e.metaKey && !e.ctrlKey && !e.altKey;
      const inTerminal =
        e.target instanceof HTMLElement &&
        e.target.closest('.gmux-terminal-mount') !== null;

      // Detector hint: answering a prompt clears needs-input immediately.
      if (inTerminal && !e.metaKey && !e.ctrlKey && e.key.length === 1) {
        s.noteTerminalInput();
      }
      if (inTerminal && e.key === 'Enter' && !e.metaKey) {
        s.noteTerminalInput();
      }

      // Esc — close the topmost layer only (overlay → modals). Native
      // context menus swallow their own Esc before the renderer sees it.
      if (e.key === 'Escape') {
        if (s.attentionOpen) {
          e.preventDefault();
          e.stopPropagation();
          s.setAttentionOpen(false);
        } else if (s.confirm) {
          e.preventDefault();
          e.stopPropagation();
          s.setConfirm(null);
        } else if (s.createOpen) {
          e.preventDefault();
          e.stopPropagation();
          s.setCreateOpen(false);
        } else if (s.newProjectOpen) {
          e.preventDefault();
          e.stopPropagation();
          s.setNewProjectOpen(false);
        } else if (s.shortcutsOpen) {
          e.preventDefault();
          e.stopPropagation();
          s.setShortcutsOpen(false);
        }
        // else: Esc belongs to the terminal / focused control.
        return;
      }

      // F2 — rename the focused sidebar row when focus is inside the
      // sessions list (§4 "rename focused item"); anywhere else (terminal,
      // editor) it renames the active session.
      if (e.key === 'F2') {
        const renameId = focusedSessionRowId() ?? s.activeSession()?.id ?? null;
        if (renameId !== null && s.renamingSessionId === null) {
          e.preventDefault();
          e.stopPropagation();
          s.setRenaming(renameId);
        }
        return;
      }

      // ⌃Tab / ⌃⇧Tab — next / previous project tab.
      if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        e.preventDefault();
        s.cycleProject(e.shiftKey ? -1 : 1);
        return;
      }

      // ⌃⇧G — Source Control view. This branch is what actually runs (the
      // renderer precedes the accelerator); the menu item mirrors it as
      // 'show-scm' so the shortcut is discoverable.
      if (
        e.ctrlKey &&
        e.shiftKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'g'
      ) {
        e.preventDefault();
        showViewAction('scm');
        return;
      }

      if (!meta) return;

      // ⌘⇧E — Explorer view (mirrored by the menu's 'show-explorer').
      if (e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        showViewAction('explorer');
        return;
      }

      // Never act on ⌘-chords while a text field is being edited, except
      // the layer togglers that make sense anywhere.
      const inEditable =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') &&
        !inTerminal;

      switch (e.key) {
        case 't':
          e.preventDefault();
          if (s.projects.length === 0) {
            s.toast('info', 'Open a project first (⌘O)');
          } else if (s.bootBlock === null) {
            s.setCreateOpen(true);
          }
          return;
        case 'o':
          e.preventDefault();
          void s.openProject();
          return;
        case 'j':
          e.preventDefault();
          s.setAttentionOpen(!s.attentionOpen);
          return;
        case '/':
          e.preventDefault();
          s.setShortcutsOpen(!s.shortcutsOpen);
          return;
        case 'b':
          if (inEditable) return;
          e.preventDefault();
          s.toggleSidebar();
          return;
        case 'w':
          // ⌘W closes editor tabs only — NEVER a session or project.
          // Swallowed here; the editor panel's bubble-phase listener (or
          // the native menu's Close Editor Tab) performs the close.
          e.preventDefault();
          return;
        default:
          break;
      }

      // ⌘1…⌘9 — project tabs.
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        s.setActiveProjectByIndex(parseInt(e.key, 10) - 1);
        return;
      }
    };

    // ⌘⌥ arrows — split focus navigation (S4A): geometric nearest split in
    // that direction; at the surface's top/bottom edge ↓/↑ continue to the
    // next/previous surface, so unsplit surfaces cycle sessions exactly as
    // before. ←/→ at an edge: no-op. (Separate handler branch since altKey
    // changes e.key on letters but not on arrows.)
    //
    // THE FOCUSED SURFACE OWNS ITS ARROWS. Phase 12 gave the editor ⌘⌥←/→
    // for its tab strip; this handler is capture-phase, so without the
    // guard below one ⌘⌥→ would move split focus AND cycle a tab. While the
    // keyboard is inside the editor panel the chord is the editor's; ⌘⇧[/]
    // still cycles tabs from anywhere.
    const NAV_KEYS: Record<string, NavDir> = {
      ArrowDown: 'down',
      ArrowUp: 'up',
      ArrowLeft: 'left',
      ArrowRight: 'right'
    };
    const onKeyDownArrows = (e: KeyboardEvent): void => {
      if (!(e.metaKey && e.altKey && !e.ctrlKey)) return;
      const dir = NAV_KEYS[e.key];
      if (dir === undefined) return;
      const el = document.activeElement;
      if (el instanceof Element && el.closest('.ed-panel') !== null) return;
      e.preventDefault();
      useLayout.getState().navigate(dir);
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keydown', onKeyDownArrows, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keydown', onKeyDownArrows, {
        capture: true
      });
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Native menu actions (src/main/menu.ts → EVT_MENU_ACTION → here). Each case
// mirrors the equivalent keydown branch — the menu owns those accelerators.
// ---------------------------------------------------------------------------

/** `focus-session:<id>` — see FocusSessionActionId in src/shared/ipc.ts. */
const FOCUS_SESSION_PREFIX = 'focus-session:';

function runMenuAction(action: AnyMenuActionWithProjects): void {
  const s = useApp.getState();
  const layerOpen =
    s.confirm !== null ||
    s.createOpen ||
    s.newProjectOpen ||
    s.shortcutsOpen ||
    s.attentionOpen;

  switch (action) {
    case 'new-session':
      if (s.projects.length === 0) {
        s.toast('info', 'Open a project first (⌘O)');
      } else if (s.bootBlock === null) {
        s.setCreateOpen(true);
      }
      return;
    case 'rename-session': {
      // The native menu owns the F2 accelerator (it fires before renderer
      // keydown), so the focused-row resolution lives here too: rename the
      // focused sidebar row, falling back to the active session (§4).
      if (layerOpen || s.renamingSessionId !== null) return;
      const renameId = focusedSessionRowId() ?? s.activeSession()?.id ?? null;
      if (renameId !== null) s.setRenaming(renameId);
      return;
    }
    case 'end-session': {
      const target = s.activeSession();
      if (!target) return;
      if (target.status === 'exited' || target.status === 'restorable') return;
      s.endSession(target.id);
      return;
    }
    case 'next-session':
      // ⌥⌘↓ — with splits (S4A) this moves focus to the split below,
      // falling through to the next surface at the edge (= the round-1
      // session cycling on unsplit surfaces).
      useLayout.getState().navigate('down');
      return;
    case 'prev-session':
      useLayout.getState().navigate('up');
      return;
    case 'open-project':
      void s.openProject();
      return;
    case 'new-project':
      // ⇧⌘N (File menu). The dialog is the only path that writes a folder,
      // so an older preload without projects:create simply never opens it.
      if (s.canCreateProject()) s.setNewProjectOpen(true);
      else s.toast('info', 'This build cannot create projects.');
      return;
    case 'close-project':
      if (s.activeProjectId !== null) s.closeProject(s.activeProjectId);
      return;
    case 'next-project':
      s.cycleProject(1);
      return;
    case 'prev-project':
      s.cycleProject(-1);
      return;
    case 'save-file': {
      const ed = useEditor.getState();
      if (ed.panelOpen && ed.activeTab() !== null) void ed.save();
      return;
    }
    case 'close-editor-tab': {
      const ed = useEditor.getState();
      if (!ed.panelOpen) return;
      ed.closeActive();
      if (useEditor.getState().tabs.length === 0) focusTerminal();
      return;
    }
    case 'toggle-editor': {
      const ed = useEditor.getState();
      const wasOpen = ed.panelOpen;
      ed.togglePanel();
      if (wasOpen) focusTerminal();
      return;
    }
    case 'toggle-sidebar':
      s.toggleSidebar();
      return;
    case 'attention':
      s.setAttentionOpen(!s.attentionOpen);
      return;
    case 'shortcuts':
      s.setShortcutsOpen(!s.shortcutsOpen);
      return;
    // Round-1 View menu additions (src/main/menu.ts).
    case 'show-explorer':
      showViewAction('explorer');
      return;
    case 'show-scm':
      showViewAction('scm');
      return;
    case 'sessions-top':
      s.setSessionOrientation('top');
      return;
    case 'sessions-right':
      s.setSessionOrientation('right');
      return;
    case 'settings':
      // The settings surface is the activity-bar gear's menu (one setting
      // in v1); ⌘, routes through it so the shortcut stays honest.
      document
        .querySelector<HTMLButtonElement>('.activitybar-settings')
        ?.click();
      return;
  }
}

function useMenuActions(): void {
  useEffect(() => {
    const bridge = window.gmux as
      | (typeof window.gmux & GmuxMenuExtras)
      | undefined;
    if (typeof bridge?.onMenuAction !== 'function') return;
    // The preload's callback type predates the round-1 View-menu ids; the
    // channel carries plain strings, so widening here is honest.
    return bridge.onMenuAction((action: MenuActionId) => {
      // Phase 12.85: the menu-bar sentinel's rows carry a session id.
      if (action.startsWith(FOCUS_SESSION_PREFIX)) {
        jumpToSession(action.slice(FOCUS_SESSION_PREFIX.length));
        return;
      }
      runMenuAction(action as AnyMenuActionWithProjects);
    });
  }, []);
}

// ---------------------------------------------------------------------------
// Screenshot-harness extension (round 1): the editor stream's shot hook
// (src/renderer/editor/shot-hook.ts) drives project/session/editor state;
// this wrapper adds the layout stream's knobs — session-surface orientation
// and sidebar view — read from extra fields on the same GMUX_SHOT_DRIVE JSON.
// Inert outside the harness.
// ---------------------------------------------------------------------------

interface ShotLayoutExtras {
  orientation?: 'top' | 'right';
  sidebarView?: SidebarViewId;
  /**
   * Phase 10 (S4A): after the base drive created its real session, create
   * three more real shell sessions and stage all four as a 2×2 split grid
   * (real terminals, real attach flow — four visible panes at once).
   */
  splitGrid?: boolean;
  /** Arm the drop overlay on the grid's last pane (left half) for capture. */
  splitDrop?: boolean;
  /**
   * Flow-control verification: flood two grid panes with heavy output
   * (`seq`) while all four are attached, then let the burst drain before
   * capture — the acks must keep every pane alive and rendering.
   */
  splitStress?: boolean;
}

function useShotLayoutHook(): void {
  useEffect(() => {
    const w = window as unknown as {
      __gmuxShotDrive?: (spec: unknown) => Promise<void>;
      __gmuxShotCleanup?: () => Promise<void>;
    };
    const prev = w.__gmuxShotDrive;
    if (typeof prev !== 'function') return;
    const prevCleanup = w.__gmuxShotCleanup;
    /** Extra real sessions created for splitGrid — killed by cleanup. */
    let extraIds: string[] = [];

    w.__gmuxShotDrive = async (spec: unknown): Promise<void> => {
      const wait = (ms: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const ext = spec as ShotLayoutExtras;
      if (ext.orientation === 'right' || ext.orientation === 'top') {
        useApp.getState().setSessionOrientation(ext.orientation);
      }
      await prev(spec);
      if (ext.sidebarView === 'scm' || ext.sidebarView === 'explorer') {
        // The base drive already flipped __gmuxShotReady — pull it back
        // down while the view swaps so main never captures mid-switch.
        window.__gmuxShotReady = false;
        useApp.getState().showSidebarView(ext.sidebarView);
        // Let the freshly mounted view settle (tree listing, git status)
        // before main captures the page.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        window.__gmuxShotReady = true;
      }
      if (ext.splitGrid === true) {
        window.__gmuxShotReady = false;
        const app = useApp.getState();
        const before = new Set(
          app.projectSessions().map((x) => x.id)
        );
        for (const name of ['split-2', 'split-3', 'split-4']) {
          await app.createSession({ name, agent: 'shell' });
        }
        // Sessions land via the sessions:changed event — poll for all four.
        let ids: string[] = [];
        for (let i = 0; i < 40; i++) {
          ids = useApp
            .getState()
            .projectSessions()
            .filter((x) => x.status !== 'exited' && x.status !== 'restorable')
            .map((x) => x.id);
          if (ids.length >= 4) break;
          await wait(250);
        }
        extraIds = ids.filter((id) => !before.has(id));
        const projectId = useApp.getState().activeProjectId;
        const four = ids.slice(0, 4);
        if (projectId !== null && four.length === 4) {
          useLayout.getState().stageGrid(projectId, four);
        }
        // Four panes attach + draw their prompts.
        await wait(3000);
        if (ext.splitStress === true) {
          await wait(4000); // all four attaches settle before the flood
          for (const id of [four[1], four[2]]) {
            if (id !== undefined) {
              window.gmux?.term.sendInput(id, 'seq 1 60000; echo FLOW-OK\r');
            }
          }
          await wait(6000); // bursts drain through the per-session acks
        }
        if (ext.splitDrop === true) {
          const target = four[3];
          if (target !== undefined) {
            useLayout.getState().setSplitDrop({ leafId: target, edge: 'left' });
          }
          await wait(200);
        }
        window.__gmuxShotReady = true;
      }
    };

    w.__gmuxShotCleanup = async (): Promise<void> => {
      for (const id of extraIds) {
        await window.gmux?.sessions.kill(id).catch(() => undefined);
        const extras = window.gmux?.sessions as
          | (typeof window.gmux.sessions & {
              discard?: (id: string) => Promise<void>;
            })
          | undefined;
        if (typeof extras?.discard === 'function') {
          await extras.discard(id).catch(() => undefined);
        }
      }
      await prevCleanup?.();
    };

    return () => {
      w.__gmuxShotDrive = prev;
      w.__gmuxShotCleanup = prevCleanup;
    };
  }, []);
}

// ---------------------------------------------------------------------------
// First-quit toast (DESIGN.md §4: "⌘Q | Quit — sessions keep running; first
// quit shows a one-time toast saying so"). The native Quit menu item forwards
// here instead of quitting; the FIRST ⌘Q with ≥1 live session shows the toast
// for ~1.5s before proceeding, every later quit is immediate. Main arms a
// fallback timer, so a broken renderer can never block quitting.
//
// The flag-then-toast dance is NOT inline here: it is the shared one-time-tip
// mechanism (./one-time-tip.ts), which this toast is the original of. The
// hold below is armed by showOneTimeTip's return value, so unreadable or
// unwritable storage — which counts as already-shown — quits immediately
// instead of pausing in front of a toast that never appeared.
// ---------------------------------------------------------------------------

const QUIT_TOAST_MS = 1_500;

function useQuitRequests(): void {
  useEffect(() => {
    const bridge = window.gmux as
      | (typeof window.gmux & GmuxQuitExtras)
      | undefined;
    if (
      typeof bridge?.onQuitRequested !== 'function' ||
      typeof bridge.quit !== 'function'
    ) {
      return;
    }
    const quit = bridge.quit.bind(bridge);
    return bridge.onQuitRequested(() => {
      const hasLiveSession = useApp
        .getState()
        .sessions.some(
          (x) => x.status !== 'exited' && x.status !== 'restorable'
        );
      // Order matters: with nothing running there is nothing to reassure the
      // user about, and burning the one-time flag on that quit would spend
      // the tip where it says nothing.
      if (!hasLiveSession || !showOneTimeTip('quit-hold')) {
        void quit();
        return;
      }
      window.setTimeout(() => void quit(), QUIT_TOAST_MS);
    });
  }, []);
}

// ---------------------------------------------------------------------------
// Window title — "project · session" (Mission Control, app switcher, Dock).
// ---------------------------------------------------------------------------

function useWindowTitle(): void {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const sessions = useApp((s) => s.sessions);
  const activeSessionByProject = useApp((s) => s.activeSessionByProject);

  useEffect(() => {
    const project = projects.find((p) => p.id === activeProjectId) ?? null;
    let title = 'gmux';
    if (project) {
      const inProject = sessions.filter(
        (x) => x.projectPath === project.path
      );
      const selectedId =
        (activeProjectId !== null
          ? activeSessionByProject[activeProjectId]
          : undefined) ?? inProject[inProject.length - 1]?.id;
      const session = inProject.find((x) => x.id === selectedId) ?? null;
      title = session ? `${project.name} · ${session.name}` : project.name;
    }
    document.title = title;
  }, [projects, activeProjectId, sessions, activeSessionByProject]);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App(): React.JSX.Element {
  const ready = useApp((s) => s.ready);
  const bootBlock = useApp((s) => s.bootBlock);
  const boot = useApp((s) => s.boot);
  const projects = useApp((s) => s.projects);
  const sidebarVisible = useApp((s) => s.sidebarVisible);
  const orientation = useApp((s) => s.sessionOrientation);

  useKeyboardMap();
  useMenuActions();
  useSettingsIntegration();
  useQuitRequests();
  useWindowTitle();
  useShotLayoutHook();
  useFileDropRouter();

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!window.gmux) {
    return (
      <div className="shell">
        <div className="titlebar" />
        <div className="empty">
          <div className="empty-inner">
            <h2 className="empty-title">gmux could not start</h2>
            <p className="empty-body">
              The window bridge failed to load. Quit and reopen gmux; if this
              keeps happening, reinstall it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (bootBlock === 'tmux-missing') {
    return (
      <div className="shell">
        <div className="titlebar" />
        <TmuxMissing />
        <Toasts />
      </div>
    );
  }

  return (
    <div className="shell">
      <Titlebar />
      {ready && projects.length === 0 ? (
        <FirstRun />
      ) : (
        <div className="shell-body">
          {/* S1 region order: activity bar · sidebar (one view) · center ·
              editor split · right session list ("right" orientation). */}
          <ActivityBar />
          {sidebarVisible ? <Sidebar /> : null}
          <TerminalRegion />
          <EditorPanel />
          {orientation === 'right' ? <SessionDock /> : null}
        </div>
      )}

      <CreateSessionModal />
      <NewProjectModal />
      <ShortcutsOverlay />
      <AttentionOverlay />
      <ConfirmDialog />
      <Toasts />
      <FileDropOverlay />
    </div>
  );
}
