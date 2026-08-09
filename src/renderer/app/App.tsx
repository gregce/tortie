/**
 * gmux app shell (Phase 3) — composition + the DESIGN.md §4 keyboard map.
 *
 * Layout: titlebar (project tabs) / sidebar (sessions; git+tree slots) /
 * terminal region. Layers: attention overlay → modals → toasts; context
 * menus are native (Menu.popup) and dismiss themselves. Esc closes the
 * topmost layer (§4).
 *
 * The native macOS menu (src/main/menu.ts) registers the ⌘-chord
 * accelerators and forwards them here as menu actions (useMenuActions) —
 * menu accelerators fire before window keydown, so the keydown map below is
 * the fallback for chords the menu does not register (⌘1…⌘9, ⌘⇧]/⌘⇧[, ⌘↩).
 */

import React, { useEffect, useRef, useState } from 'react';
import type { GmuxMenuExtras, GmuxQuitExtras, MenuActionId } from '@shared/ipc';
import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { Titlebar } from './Titlebar';
import { Sidebar } from './Sidebar';
import { TerminalRegion } from './TerminalRegion';
import { CreateSessionModal } from './CreateSessionModal';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { AttentionOverlay } from './AttentionOverlay';
import { ConfirmDialog } from './ConfirmDialog';
import { Toasts } from './Toasts';
import { FirstRun, TmuxMissing } from './EmptyStates';
// Phase 5 (editor stream): the S5 editor panel — a right split beside the
// terminal region (overlay under 1400px). It renders null until a file opens.
import { EditorPanel } from '../editor';

// ---------------------------------------------------------------------------
// Keyboard map (DESIGN.md §4) — one capture-phase listener; ⌘-chords and F2
// always reach the app, even while the terminal owns the keyboard.
// ---------------------------------------------------------------------------

/**
 * The session row the keyboard is "on" right now: any focused element inside
 * a sidebar row (the row's ⋯ button, the row itself) resolves to that row's
 * session; focus on the sessions listbox itself resolves to its selected row
 * (== the active session). Null when focus is elsewhere (terminal, editor…)
 * — callers fall back to the active session, per §4 "rename focused item".
 */
function focusedSessionRowId(): string | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return null;
  return el.closest<HTMLElement>('[data-session-id]')?.dataset['sessionId'] ?? null;
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

      if (!meta) return;

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

    // ⌥⌘↓ / ⌥⌘↑ — session cycling (separate handler branch since altKey
    // changes e.key on letters but not on arrows).
    const onKeyDownArrows = (e: KeyboardEvent): void => {
      if (!(e.metaKey && e.altKey && !e.ctrlKey)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        useApp.getState().cycleSession(e.key === 'ArrowDown' ? 1 : -1);
      }
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

/** Hand the keyboard to the visible terminal (menu-driven close flows). */
function focusTerminal(): void {
  document
    .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
    ?.focus();
}

function runMenuAction(action: MenuActionId): void {
  const s = useApp.getState();
  const layerOpen =
    s.confirm !== null || s.createOpen || s.shortcutsOpen || s.attentionOpen;

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
      s.cycleSession(1);
      return;
    case 'prev-session':
      s.cycleSession(-1);
      return;
    case 'open-project':
      void s.openProject();
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
    case 'settings':
      // The settings surface is the titlebar gear's menu (one setting in
      // v1); ⌘, routes through it so the shortcut stays honest.
      document
        .querySelector<HTMLButtonElement>('.titlebar-settings')
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
    return bridge.onMenuAction(runMenuAction);
  }, []);
}

// ---------------------------------------------------------------------------
// First-quit toast (DESIGN.md §4: "⌘Q | Quit — sessions keep running; first
// quit shows a one-time toast saying so"). The native Quit menu item forwards
// here instead of quitting; the FIRST ⌘Q with ≥1 live session shows the toast
// for ~1.5s before proceeding, every later quit is immediate. Main arms a
// fallback timer, so a broken renderer can never block quitting.
// ---------------------------------------------------------------------------

const LS_QUIT_TOAST = 'gmux.quitToastShown';
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
      const s = useApp.getState();
      const hasLiveSession = s.sessions.some(
        (x) => x.status !== 'exited' && x.status !== 'restorable'
      );
      let alreadyShown = false;
      try {
        alreadyShown = localStorage.getItem(LS_QUIT_TOAST) === '1';
      } catch {
        alreadyShown = true; // storage unavailable — never delay quit twice
      }
      if (alreadyShown || !hasLiveSession) {
        void quit();
        return;
      }
      try {
        localStorage.setItem(LS_QUIT_TOAST, '1');
      } catch {
        /* cosmetic flag only */
      }
      s.toast('info', 'Quitting — your sessions keep running.');
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
// Folder drop (§6.1) — dashed accent overlay while dragging a folder.
// ---------------------------------------------------------------------------

function useFolderDrop(): boolean {
  const [dropping, setDropping] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragEnter = (e: DragEvent): void => {
      if (!hasFiles(e)) return;
      depth.current++;
      setDropping(true);
    };
    const onDragOver = (e: DragEvent): void => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent): void => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDropping(false);
    };
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDropping(false);
      const s = useApp.getState();
      const file = e.dataTransfer?.files[0];
      // Electron ≥32 removed File.path; without a preload webUtils bridge
      // the path may be unavailable — fall back to the picker.
      const path = (file as unknown as { path?: string } | undefined)?.path;
      if (path !== undefined && path.length > 0) {
        void s.addProjectPath(path);
      } else {
        void s.openProject();
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return dropping;
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

  useKeyboardMap();
  useMenuActions();
  useQuitRequests();
  useWindowTitle();
  const dropping = useFolderDrop();

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
          {sidebarVisible ? <Sidebar /> : null}
          <TerminalRegion />
          <EditorPanel />
        </div>
      )}

      <CreateSessionModal />
      <ShortcutsOverlay />
      <AttentionOverlay />
      <ConfirmDialog />
      <Toasts />
      {dropping ? <div className="drop-overlay" /> : null}
    </div>
  );
}
