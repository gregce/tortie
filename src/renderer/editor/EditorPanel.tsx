/**
 * S5 — Editor panel: tabs row [h:32] + Monaco, right split of the center
 * region (45% default, draggable) or an overlay under 1400px window width
 * (automatic, never a setting — DESIGN.md §2.2).
 *
 * Also owns the editor slice of the DESIGN.md §4 keyboard map:
 *   ⌘S save · ⌘E toggle panel · ⌘W close tab · ⌘⇧]/⌘⇧[ cycle tabs ·
 *   Esc close editor back to terminal focus.
 * The listeners run at bubble phase so Monaco (and the app shell's
 * capture-phase layer handling) act first; `defaultPrevented` marks keys
 * they consumed.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import { useApp } from '../state/store';
import { useEditor } from './store';
import type { EditorTab } from './store';
import { MonacoHost } from './MonacoHost';
import { XIcon } from '../app/icons';
import { installShotHook } from './shot-hook';
import './editor.css';

// Screenshot-harness hook: registered at module load so GMUX_SHOT_DRIVE can
// drive a fresh profile (the panel itself may not be mounted yet). Inert
// outside the harness.
installShotHook();

/** Below this window width the split no longer fits — overlay mode (S1). */
const OVERLAY_BREAKPOINT_PX = 1400;
/** Drag floor (DESIGN.md §2.2); default open width is 45% of center ≥480. */
const MIN_DRAG_PX = 320;
const DEFAULT_OPEN_MIN_PX = 480;
const MAX_FRACTION = 0.65;

const LS_EDITOR_WIDTH = 'gmux.editorWidth';

function loadWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_EDITOR_WIDTH);
    return raw === null ? {} : (JSON.parse(raw) as Record<string, number>);
  } catch {
    return {};
  }
}

function saveWidths(widths: Record<string, number>): void {
  try {
    localStorage.setItem(LS_EDITOR_WIDTH, JSON.stringify(widths));
  } catch {
    /* cosmetic state only */
  }
}

/** Hand the keyboard back to the visible terminal (Esc / close flows). */
function focusTerminal(): void {
  const xterm = document.querySelector<HTMLTextAreaElement>(
    '.gmux-terminal-mount textarea'
  );
  if (xterm !== null) {
    xterm.focus();
    return;
  }
  document
    .querySelector<HTMLElement>('[data-slot="terminal-stack"]')
    ?.focus();
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  tab,
  active
}: {
  tab: EditorTab;
  active: boolean;
}): React.JSX.Element {
  const activate = useEditor((s) => s.activate);
  const closeTab = useEditor((s) => s.closeTab);
  const pin = useEditor((s) => s.pin);

  const title = tab.deleted
    ? 'Deleted on disk'
    : tab.mode === 'diff' && tab.canDiff
      ? `${tab.name} — changes vs HEAD`
      : tab.path;

  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={0}
      className={`ed-tab${active ? ' active' : ''}`}
      title={title}
      onClick={() => activate(tab.path)}
      onDoubleClick={() => pin(tab.path)}
      onAuxClick={(e) => {
        if (e.button === 1) closeTab(tab.path);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') activate(tab.path);
      }}
    >
      <span
        className={`ed-tab-name${tab.preview ? ' preview' : ''}${
          tab.deleted ? ' deleted' : ''
        }`}
      >
        {tab.name}
      </span>
      {tab.dirty ? (
        <span className="ed-tab-dot" aria-label="Unsaved changes" />
      ) : (
        <button
          type="button"
          className="ed-tab-close"
          aria-label={`Close ${tab.name}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.path);
          }}
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diff | File segmented control (only for git-tracked modified files)
// ---------------------------------------------------------------------------

function ModeToggle({ tab }: { tab: EditorTab }): React.JSX.Element {
  const setMode = useEditor((s) => s.setMode);
  return (
    <div className="ed-mode" role="radiogroup" aria-label="Editor mode">
      <button
        type="button"
        role="radio"
        aria-checked={tab.mode === 'diff'}
        className={`ed-mode-opt${tab.mode === 'diff' ? ' on' : ''}`}
        onClick={() => setMode(tab.path, 'diff')}
      >
        Diff
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={tab.mode === 'file'}
        className={`ed-mode-opt${tab.mode === 'file' ? ' on' : ''}`}
        onClick={() => setMode(tab.path, 'file')}
      >
        File
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function EditorPanel(): React.JSX.Element | null {
  const init = useEditor((s) => s.init);
  const tabs = useEditor((s) => s.tabs);
  const activePath = useEditor((s) => s.activePath);
  const panelOpen = useEditor((s) => s.panelOpen);
  const monacoError = useEditor((s) => s.monacoError);
  const setMonacoError = useEditor((s) => s.setMonacoError);
  const forceCloseTab = useEditor((s) => s.forceCloseTab);
  const hidePanel = useEditor((s) => s.hidePanel);

  const sidebarVisible = useApp((s) => s.sidebarVisible);
  const sidebarWidth = useApp((s) => s.sidebarWidth);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const projects = useApp((s) => s.projects);

  const projectPath =
    projects.find((p) => p.id === activeProjectId)?.path ?? '*';

  useEffect(() => {
    init();
  }, [init]);

  // -- responsive mode -------------------------------------------------------
  const [winW, setWinW] = useState<number>(window.innerWidth);
  useEffect(() => {
    const onResize = (): void => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const overlay = winW < OVERLAY_BREAKPOINT_PX;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const centerWidth = winW - (sidebarVisible ? sidebarWidth : 0);

  // -- split width (persisted per project) -----------------------------------
  const [widths, setWidths] = useState<Record<string, number>>(loadWidths);
  const storedWidth = widths[projectPath];
  const defaultWidth = Math.min(
    Math.max(Math.round(centerWidth * 0.45), DEFAULT_OPEN_MIN_PX),
    Math.round(centerWidth * MAX_FRACTION)
  );
  const splitWidth = Math.min(
    Math.max(storedWidth ?? defaultWidth, MIN_DRAG_PX),
    Math.max(Math.round(centerWidth * MAX_FRACTION), MIN_DRAG_PX)
  );
  const overlayWidth = Math.min(720, Math.round(centerWidth * 0.85));

  const setProjectWidth = useCallback(
    (px: number): void => {
      setWidths((prev) => {
        const next = { ...prev, [projectPath]: px };
        saveWidths(next);
        return next;
      });
    },
    [projectPath]
  );

  // -- drag-to-resize (split mode) -------------------------------------------
  const dragging = useRef(false);
  const onDividerPointerDown = (e: React.PointerEvent): void => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDividerPointerMove = (e: React.PointerEvent): void => {
    if (!dragging.current) return;
    const max = Math.round(
      (window.innerWidth - (sidebarVisible ? sidebarWidth : 0)) * MAX_FRACTION
    );
    const next = Math.min(
      Math.max(Math.round(window.innerWidth - e.clientX), MIN_DRAG_PX),
      Math.max(max, MIN_DRAG_PX)
    );
    setProjectWidth(next);
  };
  const onDividerPointerUp = (e: React.PointerEvent): void => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // -- scrim geometry (overlay mode covers the terminal area only) -----------
  const [scrimLeft, setScrimLeft] = useState(0);
  useLayoutEffect(() => {
    if (!overlay) return;
    const region = document.querySelector('[data-slot="terminal-stack"]');
    setScrimLeft(
      region !== null
        ? Math.round(region.getBoundingClientRect().left)
        : sidebarVisible
          ? sidebarWidth
          : 0
    );
  }, [overlay, sidebarVisible, sidebarWidth, winW, panelOpen]);

  const panelRef = useRef<HTMLElement | null>(null);

  const closeToTerminal = useCallback((): void => {
    hidePanel();
    focusTerminal();
  }, [hidePanel]);

  // -- keyboard map (bubble phase; see file header) ---------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const ed = useEditor.getState();
      const app = useApp.getState();
      const meta = e.metaKey && !e.ctrlKey && !e.altKey;

      if (
        e.key === 'Escape' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        // Monaco (find widget…) or a shell layer consumed this Esc.
        if (e.defaultPrevented) return;
        if (
          app.menu !== null ||
          app.attentionOpen ||
          app.confirm !== null ||
          app.createOpen ||
          app.shortcutsOpen ||
          app.renamingSessionId !== null
        ) {
          return;
        }
        if (!ed.panelOpen) return;
        // Split mode: Esc belongs to the editor only while focus is inside
        // it (never steal Esc from a vim session next door). Overlay mode is
        // the topmost layer — Esc closes it from anywhere.
        const inPanel =
          panelRef.current?.contains(document.activeElement) ?? false;
        if (!overlayRef.current && !inPanel) return;
        e.preventDefault();
        ed.hidePanel();
        focusTerminal();
        return;
      }

      if (!meta || e.shiftKey) return;

      if (e.key === 's') {
        if (!ed.panelOpen || ed.activeTab() === null) return;
        e.preventDefault();
        void ed.save();
        return;
      }
      if (e.key === 'e') {
        if (e.defaultPrevented) return;
        e.preventDefault();
        const wasOpen = ed.panelOpen;
        ed.togglePanel();
        if (wasOpen) focusTerminal();
        return;
      }
      if (e.key === 'w') {
        // The shell swallows ⌘W app-wide; with the editor open it means
        // "close the focused editor tab" (never sessions/projects).
        if (!ed.panelOpen) return;
        ed.closeActive();
        if (useEditor.getState().tabs.length === 0) focusTerminal();
        return;
      }
    };

    // ⌘⇧] / ⌘⇧[ — cycle editor tabs (e.code survives the shift layer).
    const onKeyDownBrackets = (e: KeyboardEvent): void => {
      if (!(e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey)) return;
      if (e.code !== 'BracketRight' && e.code !== 'BracketLeft') return;
      const ed = useEditor.getState();
      if (!ed.panelOpen || ed.tabs.length < 2) return;
      e.preventDefault();
      ed.cycleTab(e.code === 'BracketRight' ? 1 : -1);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onKeyDownBrackets);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onKeyDownBrackets);
    };
  }, []);

  const activeTab = tabs.find((t) => t.path === activePath) ?? null;

  if (!panelOpen || tabs.length === 0 || activeTab === null) return null;

  return (
    <>
      {overlay ? (
        <div
          className="ed-scrim"
          style={{ left: scrimLeft }}
          onClick={closeToTerminal}
        />
      ) : null}
      <aside
        ref={panelRef}
        className={`ed-panel${overlay ? ' ed-overlay' : ''}`}
        style={overlay ? { width: overlayWidth } : { width: splitWidth }}
        aria-label="Editor"
      >
        {!overlay ? (
          <div
            className="ed-divider"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor"
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
          />
        ) : null}

        <div className="ed-tabs" role="tablist" aria-label="Open files">
          <div className="ed-tabs-list">
            {tabs.map((tab) => (
              <TabButton
                key={tab.path}
                tab={tab}
                active={tab.path === activePath}
              />
            ))}
          </div>
          {activeTab.canDiff && activeTab.error === null ? (
            <ModeToggle tab={activeTab} />
          ) : null}
        </div>

        <div className="ed-body">
          {activeTab.error !== null ? (
            <div className="ed-state">
              <div className="ed-state-title">Could not open this file</div>
              <div className="ed-state-body">{activeTab.error}</div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => forceCloseTab(activeTab.path)}
              >
                Close tab
              </button>
            </div>
          ) : monacoError !== null ? (
            <div className="ed-state">
              <div className="ed-state-title">The editor failed to load</div>
              <div className="ed-state-body">{monacoError}</div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMonacoError(null)}
              >
                Try again
              </button>
            </div>
          ) : (
            <MonacoHost tab={activeTab} />
          )}
        </div>

        {activeTab.deleted ? (
          <div className="banner banner-warning">
            <span>This file was deleted on disk.</span>
            <span className="ed-banner-spacer" />
            <button
              type="button"
              className="btn-text"
              onClick={() => forceCloseTab(activeTab.path)}
            >
              Close tab
            </button>
          </div>
        ) : activeTab.truncated ? (
          <div className="banner banner-warning">
            <span>
              This file is too large to edit — showing the first 5 MB
              read-only.
            </span>
          </div>
        ) : null}
      </aside>
    </>
  );
}
