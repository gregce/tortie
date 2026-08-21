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
 *
 * WIDTH, since Phase 18. Two rules, and everything below follows from them:
 *
 *  1. **Every limit comes from src/renderer/state/chrome-geometry.ts.** The
 *     old `MAX_FRACTION = 0.65` is gone. The ceiling is now "the work row
 *     minus a terminal that can still be read" (`editorMaxWidth`), so a file
 *     can be dragged as wide as the user wants, while the terminal is never
 *     laid out in the 1–239px band where xterm's fit addon would propose 2
 *     columns and reflow every live pane.
 *  2. **Persist intent, clamp presentation.** The per-project width is stored
 *     verbatim and RENDERED as `min(stored, max)`; nothing rewrites it when
 *     the window shrinks, so growing the window back returns the exact width
 *     the user chose.
 *
 * FILL MODE (⇧⌘B, or the screen-full button in the tabs row) is an OVERRIDE,
 * never a write: entering captures `{sidebarVisible, dockCollapsed}` in the
 * app store and puts both away; the panel takes the whole work row by CSS,
 * not by width; leaving replays the memento. Because no width was ever
 * written, leaving restores the previous layout exactly rather than a
 * default. Any manual layout gesture — ⌘B, an activity-bar click, expanding
 * the dock, dragging this divider — drops fill WITHOUT replaying it, because
 * the user has just said what they want the layout to be.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { keyDisplay } from '@shared/keymap';
import { liveChromeGeometry, useApp } from '../state/store';
import {
  EDITOR_MIN,
  editorIsOverlay,
  editorMaxWidth,
  useWindowWidth,
  workAreaWidth
} from '../state/chrome-geometry';
import { useResizeHandle } from '../controls';
import { useEditor } from './store';
import type { EditorMode, EditorTab } from './store';
import { EditorTabStrip } from './EditorTabs';
import { ContextDetailTab } from '../context/ContextDetailTab';
import type { ContextEntry } from '../context/model';
import { MonacoHost } from './MonacoHost';
import { PierreDiff } from './PierreDiff';
import { MarkdownPreview } from './markdown';
import { ImageCompare, ImageView } from './image';
import { HtmlPreview, tabRendersHtml } from './html';
import { Codicon } from '../icons';
import { installShotHook } from './shot-hook';
import {
  loadEditorWidths,
  renderedEditorWidth,
  saveEditorWidths
} from './panel-width';
import { remoteFileChip } from '../app/machine-copy';
import { machineWriteRootFor } from '../state/machines-slice';
import './editor.css';

// Screenshot-harness hook: registered at module load so GMUX_SHOT_DRIVE can
// drive a fresh profile (the panel itself may not be mounted yet). Inert
// outside the harness.
installShotHook();

/** Read from THE keymap, never typed here (src/shared/keymap.ts's contract). */
const FILL_CHORD = keyDisplay('view.fillEditor');

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
 * which the panel could not reach at the time: the split was capped at 65% of
 * the center area, so at the design's own 1440px default window the widest
 * possible panel was ~754px and the two-column diff the product is built
 * around was unreachable without an external monitor (Phase 11 carried
 * finding (b)). Phase 18 removed that cap; 640 stays because it is a
 * READABILITY floor, and it is the number the control's disabled copy means.
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
// Fill mode (Phase 18 item 2)
// ---------------------------------------------------------------------------

/**
 * The width of the row the editor shares with the terminal — the box every
 * editor limit is measured against, read live for a drag's ceiling.
 *
 * Deliberately computed from state rather than measured from the DOM: the
 * render-time clamp below uses the SAME function on the same inputs, and a
 * divider whose two clamps disagree by a pixel is exactly the drift item 5
 * exists to kill.
 */
function workRowWidthNow(): number {
  return liveChromeGeometry().workArea;
}

/**
 * The one implementation of "fill / restore", so the button, ⇧⌘B and the
 * View menu cannot drift apart. Exported for src/main/menu.ts's
 * `toggle-editor-fill` action, dispatched in App.tsx.
 *
 * With no file open it is a no-op: there is nothing to fill the window with,
 * and a layout change with no visible subject reads as a bug. Same in overlay
 * mode, where the editor already covers the terminal area.
 */
export function toggleEditorFill(): void {
  const app = useApp.getState();
  if (app.editorFill !== null) {
    app.exitEditorFill();
    return;
  }
  const ed = useEditor.getState();
  if (!ed.panelOpen || ed.tabs.length === 0) return;
  const { windowWidth, workArea } = liveChromeGeometry();
  if (editorIsOverlay(windowWidth, workArea)) return;
  app.enterEditorFill();
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

/**
 * Does this file have a rendered form?
 *
 * ONE question, asked once, for every type that answers yes. It used to be
 * `tab.markdown || tab.svg` written out at each site, and Phase 20.5's HTML
 * preview would have made that a three-way test in three places. The
 * segmented control is the same control for all of them — Preview, Source,
 * Split — so no new `EditorMode` value exists and Split comes free.
 */
function hasRenderedForm(tab: EditorTab): boolean {
  return tab.markdown || tab.svg || tabRendersHtml(tab);
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
          : tab.image && !tab.svg
            ? 'This image before and after (read-only)'
            : 'Changes vs HEAD (read-only)'
    });
  }
  // An SVG takes markdown's control unchanged — it is the same question
  // ("the picture or the markup?") with a different renderer behind Preview.
  // So does an HTML file, where the question is "the page or the source?".
  if (hasRenderedForm(tab)) {
    const html = !tab.markdown && !tab.svg;
    const noun = tab.svg ? 'SVG' : html ? 'HTML' : 'markdown';
    options.push({
      mode: 'preview',
      label: 'Preview',
      icon: 'open-preview',
      title: tab.svg
        ? 'The rendered image'
        : html
          ? 'The rendered page. No script in it runs.'
          : 'Rendered markdown'
    });
    options.push({
      mode: 'file',
      label: 'Source',
      icon: 'code',
      title: `Edit the ${noun} source`
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
  } else if (tab.image) {
    // A raster image has exactly one other view, and only when there is a
    // HEAD version to compare against.
    if (tab.canDiff) {
      options.push({
        mode: 'image',
        label: 'Image',
        icon: 'file-media',
        title: 'The working copy on its own'
      });
    }
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

/**
 * The context entry a tab was opened with, or null.
 *
 * The store types it `unknown` so that a field only the Context view fills does
 * not put its object model in front of every surface that imports the editor.
 * This narrows by reading the two fields the card cannot render without, which
 * is a check about THIS value rather than a cast that would be believed whatever
 * arrived.
 */
function asContextEntry(value: unknown): ContextEntry | null {
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Partial<ContextEntry>;
  return typeof candidate.id === 'string' && typeof candidate.category === 'string'
    ? (value as ContextEntry)
    : null;
}

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
  const orientation = useApp((s) => s.sessionOrientation);
  const dockCollapsed = useApp((s) => s.dockCollapsed);
  const dockWidth = useApp((s) => s.rightListWidth);
  // Phase 129, for the budget below.
  const projectsPosition = useApp((s) => s.projectsPosition);
  const projectsCollapsed = useApp((s) => s.projectsCollapsed);
  const editorFill = useApp((s) => s.editorFill);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const projects = useApp((s) => s.projects);
  // PHASE 101. Whether a tab on another machine can be saved is a fact about
  // that machine, and main pushes it on the link state, so the band below is
  // never older than the last confirmation.
  const machineStates = useApp((s) => s.machineStates);

  const projectPath =
    projects.find((p) => p.id === activeProjectId)?.path ?? '*';

  useEffect(() => {
    init();
  }, [init]);

  // -- responsive mode -------------------------------------------------------
  // ONE window-resize subscription for the whole chrome (chrome-geometry) —
  // the sidebar, the dock and this panel re-render from the same value in the
  // same pass, instead of three listeners racing each other.
  const winW = useWindowWidth();

  // PHASE 129. The project rail is a column of the same row, so it enters
  // this budget beside the dock. Miss it and the panel splits a row that is
  // 200px narrower than it thinks, which lays the terminal out inside the
  // reflow band (chrome-geometry.ts, rule 2).
  const workArea = workAreaWidth({
    windowWidth: winW,
    sidebarVisible,
    sidebarWidth,
    orientation,
    dockCollapsed,
    dockWidth,
    projectsPosition,
    projectsCollapsed
  });

  // Two reasons to overlay rather than split, and the second one protects
  // live sessions: a narrow WINDOW (taste), or a work row that cannot seat
  // this panel's minimum AND the terminal's floor (safety — the alternative
  // is a terminal laid out in the 2-column reflow band, which is what a 50%
  // sidebar plus a 320px dock produced at 1400px before the fix round).
  // Overlaying covers the terminal instead of shrinking it, so no fit runs
  // and no tmux resize is issued.
  const overlay = editorIsOverlay(winW, workArea);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  /** Filling is a split-mode state; the overlay already covers the terminal. */
  const filling = editorFill !== null && !overlay;

  // -- split width (persisted per project) -----------------------------------
  const [widths, setWidths] = useState<Record<string, number>>(
    loadEditorWidths
  );
  // Persist intent, clamp presentation: `widths[projectPath]` is never
  // rewritten to fit the window (panel-width.ts owns both halves of the rule).
  const splitWidth = renderedEditorWidth(widths[projectPath], workArea);
  const overlayWidth = Math.min(720, Math.round(workArea * 0.85));
  // While filling, the width is the work row itself — and it is applied by
  // CSS (inset:0), not by this number, so nothing is written and leaving fill
  // returns the stored width byte for byte. The value still drives the panel's
  // own fit decisions (split view, minimap, two-column diff).
  const panelWidth = overlay ? overlayWidth : filling ? workArea : splitWidth;

  const setProjectWidth = useCallback(
    (px: number): void => {
      // Dragging the divider IS the user stating the layout, so it leaves fill
      // mode without replaying the memento — the store's fifth escape hatch,
      // alongside ⌘B, the activity bar and expanding the dock.
      useApp.getState().forgetEditorFill();
      setWidths((prev) => {
        const next = { ...prev, [projectPath]: px };
        saveEditorWidths(next);
        return next;
      });
    },
    [projectPath]
  );

  const panelRef = useRef<HTMLElement | null>(null);

  // -- drag-to-resize (split mode) -------------------------------------------
  // The app's one divider implementation (src/renderer/controls/resizer.ts):
  // grab offset captured from THIS panel's rect, absolute geometry every move,
  // clamp the result only, pointer capture, Esc-cancel, keyboard separator.
  // The old handler drove width from `window.innerWidth - clientX`, which in
  // "right" orientation measured across the session dock and jumped the panel
  // by the dock's whole width the instant a drag began.
  const divider = useResizeHandle({
    anchor: 'right',
    panelRef,
    // The SPLIT width, never the filled one: this is the value the handle can
    // write, so it is also the value Esc must restore. Cancelling a drag that
    // began in fill mode has to give the user their stored width back, not
    // overwrite it with the width of the whole row. (Pointer geometry never
    // reads this — it comes off the panel's own rect.)
    width: splitWidth,
    min: EDITOR_MIN,
    max: () => editorMaxWidth(workRowWidthNow()),
    onWidth: setProjectWidth,
    label: 'Resize editor'
  });

  const closeToTerminal = useCallback((): void => {
    hidePanel();
    focusTerminal();
  }, [hidePanel]);

  // Fill mode cannot outlive the thing it was filling with. Closing the panel
  // (⌘E, ⌘W on the last tab, the scrim) and shrinking the window into overlay
  // mode both RESTORE the remembered layout — the user never asked to lose
  // their sidebar, and a mode with no visible exit is a trap.
  const noPanel = !panelOpen || tabs.length === 0;
  useEffect(() => {
    if (!noPanel && !overlay) return;
    const app = useApp.getState();
    if (app.editorFill !== null) app.exitEditorFill();
  }, [noPanel, overlay]);

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
          app.newProjectOpen ||
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
        // Fill mode is a layer, exactly like overlay mode, so Esc reaches it
        // from anywhere: the terminal is hidden while filling, so there is no
        // session next door whose Esc this could be stealing.
        const filled = app.editorFill !== null;
        if (!overlayRef.current && !inPanel && !filled) return;
        e.preventDefault();
        // Esc closes the topmost layer (DESIGN §4): the first Esc gives the
        // sidebar and the dock back, the second closes the editor. Same model
        // as leaving VS Code's Zen mode.
        if (filled) {
          app.exitEditorFill();
          return;
        }
        ed.hidePanel();
        focusTerminal();
        return;
      }

      // ⇧⌘B — `view.fillEditor`. The mnemonic pair with ⌘B: ⌘B hides the
      // sidebar, ⇧⌘B hides everything. Handled here rather than in the shell
      // because the action's subject is the open file.
      if (
        e.metaKey &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.code === 'KeyB'
      ) {
        if (!ed.panelOpen) return;
        e.preventDefault();
        toggleEditorFill();
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

  /**
   * PHASE 101. The folder a person let Tortie save under on the machine this
   * tab's file lives on, or null when there is none and for every tab whose
   * file is on this Mac.
   */
  const remoteWriteRoot =
    activeTab.remote === undefined
      ? null
      : machineWriteRootFor(machineStates, activeTab.remote.machineId);

  const mode: EditorMode =
    activeTab.mode === 'diff' && !activeTab.canDiff
      ? activeTab.image && !activeTab.svg
        ? 'image'
        : 'file'
      : activeTab.mode;
  // Drag the panel below the split floor and the view collapses to Source
  // rather than showing two unreadable columns; widen it and it comes back.
  const splitFits = panelWidth >= SPLIT_MIN_PX;
  const effectiveMode: EditorMode =
    mode === 'split' && !splitFits ? 'file' : mode;
  const minimapFits = panelWidth >= MINIMAP_MIN_PX;
  const showMinimap = minimapEnabled && minimapFits;
  // Neither the image viewer, an SVG preview nor a rendered page has
  // anything to summarize — the minimap belongs to text, and the heading
  // ruler behind the same toggle is markdown's. The toggle stays out of
  // their chrome rather than sitting there doing nothing. Split keeps it,
  // because Split has Monaco in its left pane.
  const minimapApplies =
    effectiveMode !== 'diff' &&
    effectiveMode !== 'image' &&
    (effectiveMode !== 'preview' || activeTab.markdown) &&
    activeTab.error === null;
  const diffSplitFits = panelWidth >= DIFF_SPLIT_MIN_PX;
  const showDiffSplit = diffSideBySide && diffSplitFits;
  const diffSplitApplies = effectiveMode === 'diff' && activeTab.error === null;

  // Phase 22. Narrowed once, here. The tab carries the entry as `unknown`
  // because the editor store is imported by every surface in the renderer and
  // none of the others has heard of a context entry.
  const contextEntry = asContextEntry(activeTab.contextEntry);

  const monaco = (
    <MonacoHost tab={activeTab} minimap={showMinimap && !activeTab.markdown} />
  );
  // "Preview" means the rendered form of this file: markdown for a .md, the
  // picture for an .svg, the page itself for an .html. Split pairs any of
  // them with Monaco unchanged.
  // The last arm is the HTML page. It is the fallback rather than a fourth
  // test because this value is only ever mounted for a tab that answered yes
  // to `hasRenderedForm`, and HTML is the one kind left after markdown and
  // SVG have taken theirs.
  const preview = activeTab.svg ? (
    <ImageView tab={activeTab} live={effectiveMode === 'split'} />
  ) : activeTab.markdown ? (
    <MarkdownPreview
      tab={activeTab}
      live={effectiveMode === 'split'}
      ruler={showMinimap}
    />
  ) : (
    <HtmlPreview tab={activeTab} live={effectiveMode === 'split'} />
  );

  const body = (
activeTab.error !== null ? (
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
            // a Monaco chunk failure only blocks the editing surfaces. For a
            // raster image the same gesture means before/after pixels, under
            // the same Side-by-side control and the same 640px floor.
            activeTab.image && !activeTab.svg ? (
              <ImageCompare tab={activeTab} sideBySide={showDiffSplit} />
            ) : (
              <PierreDiff tab={activeTab} sideBySide={showDiffSplit} />
            )
          ) : effectiveMode === 'image' ? (
            <ImageView tab={activeTab} />
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
          )
  );

  return (
    <>
      {/* The scrim covers the work row it lives in, so it stops short of the
          hoisted session strip above it — an overlay that covered the tabs
          would be the very bug item 3 exists to kill. */}
      {overlay ? <div className="ed-scrim" onClick={closeToTerminal} /> : null}
      <aside
        ref={panelRef}
        className={`ed-panel${overlay ? ' ed-overlay' : ''}${
          filling ? ' ed-fill' : ''
        }`}
        // Filling is CSS (inset:0 in the work row), never a width — that is
        // what makes leaving it exact.
        style={filling ? undefined : { width: panelWidth }}
        aria-label="Editor"
      >
        {!overlay ? (
          <div
            className={`ed-divider${divider.dragging ? ' dragging' : ''}`}
            {...divider.props}
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
            {/* Fill the window. The fourth answer to the question this
                cluster already asks — "how should this file be shown" — so it
                costs one glyph in a row the eye already parses, and it keeps
                the file's controls in the file's own chrome. Absent in
                overlay mode, where the editor already covers the terminal. */}
            {!overlay ? (
              <button
                type="button"
                className={`ed-icon-btn${filling ? ' on' : ''}`}
                aria-pressed={filling}
                aria-label="Fill the window"
                title={
                  filling
                    ? `Restore the layout (${FILL_CHORD})`
                    : `Fill the window (${FILL_CHORD})`
                }
                onClick={toggleEditorFill}
              >
                <Codicon
                  name={filling ? 'screen-normal' : 'screen-full'}
                  size={14}
                />
              </button>
            ) : null}
          </div>
        </div>

        <div className="ed-body">
          {/* Phase 22. A tab opened from the Context view wears the detail
              header card, and the body below it is whatever this file would
              have rendered as anyway. That is the whole difference between a
              detail tab and a file tab, which is why there is no second tab
              kind: the card is a wrapper, not a renderer. */}
          {contextEntry !== null ? (
            <ContextDetailTab
              entry={contextEntry}
              repoPath={activeTab.repoPath}
              renderBody={() => body}
            />
          ) : (
            body
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
        ) : activeTab.remote !== undefined && remoteWriteRoot === null ? (
          // PHASE 90.3. The fourth read-only reason, and the only one whose
          // file is not on this Mac. It says two things and both are needed.
          // The file is over there, which is why the bytes on screen may be
          // older than the file. And Tortie cannot save it, which is why typing
          // changes nothing. Not a warning, because nothing is wrong: a folder
          // on another machine being read only is what this product promises.
          //
          // PHASE 101 MADE IT CONDITIONAL. A tab on a machine a person has let
          // Tortie save on draws NO band at all, and behaves like a tab on this
          // Mac. The tab tooltip still names the machine, so nothing is hidden.
          // A band saying the file cannot be saved, over an editor whose dirty
          // dot clears on Save, would be a sentence contradicting the thing
          // beside it, and two behaviours on one surface are harder to learn
          // than one.
          <div className="banner ed-banner-readonly">
            <Codicon name="lock" size={14} />
            <span className="banner-text">
              {remoteFileChip(activeTab.remote.machineLabel)}
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
