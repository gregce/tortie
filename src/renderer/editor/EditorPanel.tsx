/**
 * S5 — Editor panel: tabs row [h:36] + editor body, right split of the
 * center region (45% default, draggable) or an overlay under 1400px window
 * width (automatic, never a setting — DESIGN.md §2.2).
 *
 * The body renders one of four surfaces, chosen by `tab.mode`:
 *   diff     @pierre/diffs, read-only (Phase 11)
 *   file     Monaco — the edit surface, and "Source" for a .md tab
 *   preview  rendered markdown, no Monaco (Phase 12 item 6)
 *   split    Source and Preview side by side
 *
 * Tabs ACCUMULATE (Phase 12 item 5): a single click opens a preview tab
 * (italic, recycled by the next single click), a double-click or the first
 * edit pins it, and the strip scrolls. See src/renderer/editor/store.ts for
 * the identity/eviction rules.
 *
 * Also owns the editor slice of the DESIGN.md §4 keyboard map:
 *   ⌘S save · ⌘E toggle panel · ⌘W close tab · ⌘⌥←/→ and ⌘⇧[/] cycle tabs ·
 *   ⌃Tab most-recently-used · Esc close editor back to terminal focus.
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
import type { EditorMode, EditorTab } from './store';
import { EditorTabStrip } from './EditorTabs';
import { MonacoHost } from './MonacoHost';
import { PierreDiff } from './PierreDiff';
import { MarkdownPreview } from './markdown';
import { Codicon } from '../icons';
import { installShotHook } from './shot-hook';
import { loadEditorWidths, saveEditorWidths } from './panel-width';
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

/**
 * Width floors, measured against the panel rather than the window — the panel
 * is what the content has to fit into, and it is draggable down to 320px.
 *
 * Split needs two readable columns; the minimap needs to cost less than the
 * text it summarizes (at the 320px floor it eats a third of the pane). Both
 * stay VISIBLE below their floor and say why they are unavailable, rather
 * than disappearing from the control — a control that vanishes reads as a
 * bug, and the fix (drag the panel wider) is invisible.
 */
const SPLIT_MIN_PX = 480;
const MINIMAP_MIN_PX = 420;
/**
 * Two-column diff floor. It used to be 900px, measured inside PierreDiff —
 * which the panel could never reach: MAX_FRACTION caps the split at 65% of
 * the center area, so at the design's own 1440px default window the widest
 * possible panel is ~754px and the two-column diff the product is built
 * around was unreachable without an external monitor (Phase 11 carried
 * finding (b)).
 *
 * 640px is the measured floor for this stack, not a guess: the diff renders
 * at 12px `--font-mono` (7.2px per character) and Pierre spends ~34px per
 * side on its line-number gutter, so 640px leaves ~38 characters a side —
 * enough to read a changed line's shape and its neighbours, which is what
 * the two-column view is for. Below it the columns stop being readable and
 * the unified view is genuinely better, so the control disables itself and
 * says so rather than rendering two useless columns.
 */
const DIFF_SPLIT_MIN_PX = 640;

/**
 * The mode control keeps its labels while they fit. Four text segments need
 * roughly 200px, two need 80 — so the threshold follows the option count
 * instead of being one number that turns "Diff | File" into glyphs at a width
 * where it fitted perfectly well.
 */
function modesAreCompact(panelWidth: number, optionCount: number): boolean {
  return panelWidth < 300 + 65 * optionCount;
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
// Mode control — Diff | File for code, Preview | Source | Split for markdown
// ---------------------------------------------------------------------------

interface ModeOption {
  mode: EditorMode;
  label: string;
  icon: string;
  title: string;
  disabled?: boolean;
}

function modeOptions(tab: EditorTab, splitFits: boolean): ModeOption[] {
  const options: ModeOption[] = [];
  if (tab.canDiff) {
    options.push({
      mode: 'diff',
      label: 'Diff',
      icon: 'git-compare',
      title:
        tab.commit !== null
          ? `What commit ${tab.commit.shortSha} changed (read-only)`
          : 'Changes vs HEAD (read-only)'
    });
  }
  if (tab.markdown) {
    options.push({
      mode: 'preview',
      label: 'Preview',
      icon: 'open-preview',
      title: 'Rendered markdown'
    });
    options.push({
      mode: 'file',
      label: 'Source',
      icon: 'code',
      title: 'Edit the markdown source'
    });
    options.push({
      mode: 'split',
      label: 'Split',
      icon: 'split-horizontal',
      title: splitFits
        ? 'Source and preview together'
        : 'Source and preview together — drag the editor wider to use it',
      disabled: !splitFits
    });
  } else if (tab.canDiff) {
    options.push({
      mode: 'file',
      label: 'File',
      icon: 'code',
      title:
        tab.commit !== null
          ? `The whole file as of ${tab.commit.shortSha} (read-only)`
          : 'Edit the file'
    });
  }
  return options;
}

function ModeToggle({
  tab,
  panelWidth
}: {
  tab: EditorTab;
  panelWidth: number;
}): React.JSX.Element | null {
  const setMode = useEditor((s) => s.setMode);
  const options = modeOptions(tab, panelWidth >= SPLIT_MIN_PX);
  if (options.length < 2) return null;
  const compact = modesAreCompact(panelWidth, options.length);
  return (
    <div
      className={`ed-mode${compact ? ' compact' : ''}`}
      role="radiogroup"
      aria-label="Editor mode"
    >
      {options.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          role="radio"
          aria-checked={tab.mode === opt.mode}
          aria-label={opt.label}
          disabled={opt.disabled ?? false}
          className={`ed-mode-opt${tab.mode === opt.mode ? ' on' : ''}`}
          title={opt.title}
          onClick={() => setMode(tab.id, opt.mode)}
        >
          {compact ? <Codicon name={opt.icon} size={14} /> : opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function EditorPanel(): React.JSX.Element | null {
  const init = useEditor((s) => s.init);
  const tabs = useEditor((s) => s.tabs);
  const activeId = useEditor((s) => s.activeId);
  const panelOpen = useEditor((s) => s.panelOpen);
  const monacoError = useEditor((s) => s.monacoError);
  const setMonacoError = useEditor((s) => s.setMonacoError);
  const forceCloseTab = useEditor((s) => s.forceCloseTab);
  const hidePanel = useEditor((s) => s.hidePanel);
  const minimapEnabled = useEditor((s) => s.minimapEnabled);
  const setMinimapEnabled = useEditor((s) => s.setMinimapEnabled);
  const diffSideBySide = useEditor((s) => s.diffSideBySide);
  const setDiffSideBySide = useEditor((s) => s.setDiffSideBySide);

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
  const [widths, setWidths] = useState<Record<string, number>>(
    loadEditorWidths
  );
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
  const panelWidth = overlay ? overlayWidth : splitWidth;

  const setProjectWidth = useCallback(
    (px: number): void => {
      setWidths((prev) => {
        const next = { ...prev, [projectPath]: px };
        saveEditorWidths(next);
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

    // Tab navigation, three ways:
    //   ⌘⌥← / ⌘⌥→   strip order (the primary binding, VS Code's on macOS)
    //   ⌘⇧[ / ⌘⇧]   strip order (kept — it shipped in Phase 5)
    //   ⌃Tab        most-recently-used, committed when ⌃ is released
    const onKeyDownNav = (e: KeyboardEvent): void => {
      const ed = useEditor.getState();
      if (e.metaKey && e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return;
        if (!ed.panelOpen || ed.tabs.length < 2) return;
        // The app shell claims ⌘⌥ arrows for split navigation (S4A) and its
        // listener is capture-phase; it stands down while focus is in here,
        // and this listener only acts under the same condition, so the
        // chord always has exactly one owner. ⌘⇧[/] cycles from anywhere.
        if (panelRef.current?.contains(document.activeElement) !== true) return;
        e.preventDefault();
        ed.cycleTab(e.code === 'ArrowRight' ? 1 : -1);
        return;
      }
      if (e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (e.code !== 'BracketRight' && e.code !== 'BracketLeft') return;
        if (!ed.panelOpen || ed.tabs.length < 2) return;
        e.preventDefault();
        ed.cycleTab(e.code === 'BracketRight' ? 1 : -1);
        return;
      }
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Tab') {
        // ⌃Tab is a real character to a terminal (^I). Unlike the ⌘ bindings
        // above it can only mean "cycle tabs" while the keyboard is actually
        // in the editor.
        if (!ed.panelOpen || ed.tabs.length < 2) return;
        if (panelRef.current?.contains(document.activeElement) !== true) return;
        e.preventDefault();
        ed.cycleMru(e.shiftKey ? -1 : 1);
      }
    };

    // Releasing ⌃ ends the ⌃Tab run: the tab you landed on becomes the most
    // recent, so the next ⌃Tab goes back to where you came from.
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key === 'Control') useEditor.getState().commitMru();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onKeyDownNav);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onKeyDownNav);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  if (!panelOpen || tabs.length === 0 || activeTab === null) return null;

  const mode: EditorMode =
    activeTab.mode === 'diff' && !activeTab.canDiff ? 'file' : activeTab.mode;
  // Drag the panel below the split floor and the view collapses to Source
  // rather than showing two unreadable columns; widen it and it comes back.
  const splitFits = panelWidth >= SPLIT_MIN_PX;
  const effectiveMode: EditorMode =
    mode === 'split' && !splitFits ? 'file' : mode;
  const minimapFits = panelWidth >= MINIMAP_MIN_PX;
  const showMinimap = minimapEnabled && minimapFits;
  const minimapApplies = effectiveMode !== 'diff' && activeTab.error === null;
  const diffSplitFits = panelWidth >= DIFF_SPLIT_MIN_PX;
  const showDiffSplit = diffSideBySide && diffSplitFits;
  const diffSplitApplies = effectiveMode === 'diff' && activeTab.error === null;

  const monaco = (
    <MonacoHost tab={activeTab} minimap={showMinimap && !activeTab.markdown} />
  );
  const preview = (
    <MarkdownPreview
      tab={activeTab}
      live={effectiveMode === 'split'}
      ruler={showMinimap}
    />
  );

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
        style={{ width: panelWidth }}
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

        <div className="ed-tabs">
          <EditorTabStrip tabs={tabs} activeId={activeId} />
          <div className="ed-tabs-actions">
            {activeTab.error === null ? (
              <ModeToggle tab={activeTab} panelWidth={panelWidth} />
            ) : null}
            {diffSplitApplies ? (
              <button
                type="button"
                className={`ed-icon-btn${showDiffSplit ? ' on' : ''}`}
                aria-pressed={showDiffSplit}
                aria-label="Side by side"
                disabled={!diffSplitFits}
                title={
                  !diffSplitFits
                    ? 'Side by side — drag the editor wider to use it'
                    : diffSideBySide
                      ? 'Show the diff in one column'
                      : 'Show the diff side by side'
                }
                onClick={() => setDiffSideBySide(!diffSideBySide)}
              >
                <Codicon name="split-horizontal" size={14} />
              </button>
            ) : null}
            {minimapApplies ? (
              <button
                type="button"
                className={`ed-icon-btn${showMinimap ? ' on' : ''}`}
                aria-pressed={showMinimap}
                aria-label="Minimap"
                disabled={!minimapFits}
                title={
                  !minimapFits
                    ? 'Minimap — drag the editor wider to use it'
                    : minimapEnabled
                      ? 'Hide the minimap'
                      : 'Show the minimap'
                }
                onClick={() => setMinimapEnabled(!minimapEnabled)}
              >
                <Codicon name="map" size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="ed-body">
          {activeTab.error !== null ? (
            <div className="ed-state">
              <div className="ed-state-title">Could not open this file</div>
              <div className="ed-state-body">{activeTab.error}</div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => forceCloseTab(activeTab.id)}
              >
                Close tab
              </button>
            </div>
          ) : effectiveMode === 'diff' ? (
            // Diff mode renders without Monaco (Pierre owns diff viewing) —
            // a Monaco chunk failure only blocks the editing surfaces.
            <PierreDiff tab={activeTab} sideBySide={showDiffSplit} />
          ) : effectiveMode === 'preview' ? (
            preview
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
          ) : effectiveMode === 'split' ? (
            <div className="ed-split">
              <div className="ed-split-pane">{monaco}</div>
              <div className="ed-split-pane">{preview}</div>
            </div>
          ) : (
            monaco
          )}
        </div>

        {activeTab.deleted ? (
          <div className="banner banner-warning">
            <span>This file was deleted on disk.</span>
            <span className="ed-banner-spacer" />
            <button
              type="button"
              className="btn-text"
              onClick={() => forceCloseTab(activeTab.id)}
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
        ) : activeTab.commit !== null ? (
          // The third read-only reason (MonacoHost sets readOnly whenever
          // tab.commit is non-null). The other two get a banner; this one used
          // to get a tooltip and a SHA badge, so a user who opened a file from
          // a past commit and typed just watched Monaco refuse. Not a warning
          // — nothing is wrong — so it keeps the panel's own ground and says
          // WHY, the way VS Code marks a read-only editor.
          <div className="banner ed-banner-readonly">
            <Codicon name="lock" size={14} />
            <span className="banner-text">
              Viewing this file as of {activeTab.commit.shortSha} — read-only.
            </span>
          </div>
        ) : null}
      </aside>
    </>
  );
}
