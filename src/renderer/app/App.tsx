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
  MenuActionWithFind
} from '@shared/ipc';
import { OPEN_RECENT_PREFIX } from '@shared/ipc';
import { acceleratorToDisplay, keyDisplay } from '@shared/keymap';
import { sessionsPositionForMenuAction } from '@shared/sessions-position';
import {
  effectiveStatusOf,
  useApp,
  whenSessionsPositionPushed
} from '../state/store';
import type { SidebarViewId } from '../state/store';
import { isSidebarViewId } from '../state/sidebar-views';
import { cloneAction } from '../state/clone';
import { pullPendingShellOpen } from '../state/shell-open';
import { useLayout } from '../state/layout';
import type { NavDir } from '../state/layout';
import { useEditor } from '../editor/store';
import { Titlebar } from './Titlebar';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { MachineStatement, TerminalRegion } from './TerminalRegion';
// Phase 18 item 3: the session tab strip is the work area's own band, not the
// terminal region's — see the layout comment in the shell body below.
import { SessionStrip } from './SessionStrip';
import { termFocusHandlers } from './term-focus';
import { SessionDock } from './SessionDock';
// Phase 80.1. One derivation of "what is on the surface right now", shared
// with the strip, the region and the dock. The wash below reads the visible
// leaves from it rather than deriving them a fourth time.
import { useProjectSurfaces } from './surfaces';
import { rollupDot } from './status';
import './work-area.css';
// Phase 80.1. Every region session focus hides is hidden from this one
// stylesheet, by one class on the shell root.
import './focus-mode.css';
import { CreateSessionModal } from './CreateSessionModal';
import { NewProjectModal } from './NewProjectModal';
import { CloneRepoModal } from './CloneRepoModal';
// Phase 29. The Past Sessions panel. The Session menu holds its one entry
// point, with no accelerator and no renderer keydown fallback, on purpose.
// Restoring starts a process, so the user reads a name first.
import { PastSessionsModal } from './PastSessionsModal';
// Phase 72. The saved output panel. One session menu item opens it, it reads
// one file on this Mac and it sends nothing anywhere.
import { SavedOutputModal } from './SavedOutputModal';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { AttentionOverlay } from './AttentionOverlay';
import { ConfirmDialog } from './ConfirmDialog';
import { ContextInstallHost } from '../context';
import { Toasts } from './Toasts';
import {
  FirstRun,
  TmuxBundleIncomplete,
  TmuxMissing,
  TmuxVersionBlocked
} from './EmptyStates';
// Phase 12.12 item 3: ⌘1-⌘8 by position, ⌘9 = last. One module, shared with
// the tabs' ⌘-held hints so the two can never disagree.
import { digitToIndex } from './project-shortcuts';
// Shared with the ⌘J overlay: "land the user in this session" exists once.
import { focusTerminal, jumpToSession } from './session-focus';
// Phase 80.1, the ⇧⌘↩ chord. The 200 ms flight, the refusals and the swap.
// A DIFFERENT module from ./session-focus above, which is much older and means
// "land the user in a session" for ⌘J and the menu-bar sentinel.
import { toggleSessionFocus } from './focus-flight';
// Phase 12.4/12.6: "show this once, ever" lives in exactly one place — the
// first-quit toast below is one of its catalog entries, not a second copy.
import { showOneTimeTip } from './one-time-tip';
// Phase 5 (editor stream): the S5 editor panel — a right split beside the
// terminal region (overlay under 1400px). It renders null until a file opens.
import { EditorPanel, toggleEditorFill } from '../editor';
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
// Phase 12.11: ⌘+ / ⌘- / ⌘0 / ⌘⇧0. Like ⌘1…⌘9 and ⌘⇧[ / ⌘⇧], these chords
// are renderer-only (no menu item mirrors them), so the hook installs its own
// capture-phase listener beside the map above instead of adding branches to
// it — zoom's focus resolution is its own concern (src/renderer/zoom/focus.ts).
import { useZoomKeymap, ZoomHud } from '../zoom';
// Phase 14: the ⌘P palette. It is always mounted (it renders null when
// closed) because it also owns the recently-opened list, which records
// every file opened from ANY surface, not just the ones found through it.
import { QuickOpenPalette, useQuickOpen } from '../quickopen';
// Phase 14: the ⌘⇧F Search view's imperative surface and the ⌘⇧O palette.
import {
  focusInsideSearch,
  focusResultsList,
  focusSearchInput,
  selectionSeed,
  SymbolPalette,
  useSearch,
  useSymbols
} from '../search';
import { driveZoom } from '../zoom/shot-probe';
import type { ZoomProbeSpec } from '../zoom/shot-probe';
import { driveQuickOpen } from '../quickopen/shot-probe';
import type { QuickOpenProbeSpec } from '../quickopen/shot-probe';
import { driveSearch, driveSymbols } from '../search/shot-probe';
import type { SearchProbeSpec, SymbolProbeSpec } from '../search/shot-probe';
import { installContextDetailHost } from '../context/detail-host';
import { driveContext } from '../context/shot-probe';
import type { ContextProbeSpec } from '../context/shot-probe';
import { driveSessionFocus } from './focus-shot-drive';
import type { SessionFocusProbeSpec } from './focus-shot-drive';

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

/**
 * ⌘⇧F: show the Search view and put the caret in the box.
 *
 * Pressed again while the caret is already there it SELECTS the query rather
 * than toggling the view away — the gesture people make is "search for
 * something else", and losing the view instead is the kind of surprise that
 * stops you using a shortcut at all. That is why this is not `showViewAction`.
 */
function showSearchAction(): void {
  const inBox =
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.dataset['slot'] === 'search-input';
  useApp.getState().showSidebarView('search');
  // A one-line selection is a seed; a paragraph is not (selectionSeed refuses
  // multi-line and very long text).
  focusSearchInput(inBox ? undefined : selectionSeed());
}

/**
 * A sheet or an overlay owns the keyboard right now.
 *
 * One expression, read by `runMenuAction` (which had it inline until Phase
 * 80.1) and by the focus chord below. The two palettes are NOT in it, because
 * ⌘P and ⌘⇧O are both meant to work from inside another layer; the focus
 * chord adds them at its own call site.
 */
function modalLayerOpen(): boolean {
  const s = useApp.getState();
  return (
    s.confirm !== null ||
    s.createOpen ||
    s.newProjectOpen ||
    s.shortcutsOpen ||
    s.attentionOpen ||
    s.pastOpen
  );
}

/**
 * Phase 80.1. ⇧⌘↩ is swallowed while any layer is up, exactly as ⌘B is.
 *
 * Growing a session to fill the window behind an open sheet would put the
 * sheet on top of a layout the person never asked for, and the way back is a
 * chord they cannot see. Silence is the right answer here. It is the only one
 * of the mode's three refusals that says nothing, because the other two can
 * be reached from a menu click and so must speak (./focus-flight.ts).
 */
function focusChordSwallowed(): boolean {
  return (
    modalLayerOpen() ||
    useQuickOpen.getState().open ||
    useSymbols.getState().open
  );
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
        // ⌘P sits on top of the ladder: it is the only layer that can be
        // opened from inside another one (you can ⌘P while a modal is up).
        if (useSymbols.getState().open) {
          e.preventDefault();
          e.stopPropagation();
          useSymbols.getState().close();
        } else if (useQuickOpen.getState().open) {
          e.preventDefault();
          e.stopPropagation();
          useQuickOpen.getState().close();
        } else if (s.attentionOpen) {
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
        } else if (s.sessionFocus && !inTerminal) {
          // Phase 80.1. Escape leaves session focus, but ONLY when the
          // keyboard is not in a session. Escape inside a terminal belongs to
          // the agent. It is the key a person presses to interrupt Claude
          // Code, and taking it while they are typing into the very session
          // the mode exists to serve would be a worse bug than the one the
          // affordance fixes. This is a deliberate deviation from the Phase
          // 80.1 charter sentence "The same chord, Escape, or a View menu item
          // puts every region back". The way out stays discoverable through
          // the one-time tip the mode shows the first time it is entered.
          e.preventDefault();
          e.stopPropagation();
          void toggleSessionFocus();
        } else if (focusInsideSearch()) {
          // The Search view extends the same ladder INSIDE itself: clear the
          // query if there is one, else hand the keyboard to the results, else
          // give it back to the session. Three Escs from the box get you all
          // the way out, and none of them closes the view — losing your
          // results to a stray Esc is the thing this ordering prevents.
          e.preventDefault();
          e.stopPropagation();
          const search = useSearch.getState();
          const inBox =
            document.activeElement instanceof HTMLInputElement &&
            document.activeElement.dataset['slot'] === 'search-input';
          if (inBox && search.query.length > 0) search.clear();
          else if (inBox && focusResultsList()) {
            /* focus moved into the list */
          } else focusTerminal();
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

      // F4 / ⇧F4 — walk the search results from ANYWHERE, previewing each.
      // Only claimed when there is a result set to walk, so the key stays
      // available to whatever else might want it in an empty app.
      if (e.key === 'F4' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (useSearch.getState().stepResult(e.shiftKey ? -1 : 1)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // ⌥⌘C / ⌥⌘W / ⌥⌘R — the three search modifiers, ONLY while the keyboard
      // is inside the Search view. Scoped deliberately: they are ⌥⌘ chords
      // that would otherwise fire while someone is typing into a session.
      if (e.metaKey && e.altKey && !e.ctrlKey && focusInsideSearch()) {
        const search = useSearch.getState();
        const key = e.key.toLowerCase();
        // ⌥ rewrites e.key on letters (⌥C is 'ç'), so match on the physical
        // key as well — the same reason the split-navigation handler below is
        // a separate branch.
        const code = e.code;
        if (key === 'c' || code === 'KeyC') {
          e.preventDefault();
          search.toggleCaseSensitive();
          return;
        }
        if (key === 'w' || code === 'KeyW') {
          e.preventDefault();
          search.toggleWholeWord();
          return;
        }
        if (key === 'r' || code === 'KeyR') {
          e.preventDefault();
          search.toggleRegex();
          return;
        }
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

      // ⌃⇧C — Context view (Phase 22). Registered beside ⌃⇧G because it is the
      // same gesture on the same rail. ⇧⌘C is deliberately NOT used: DESIGN.md
      // §4 uses it as the worked example of a per-agent hotkey the user records
      // for themselves, and taking it would make the documented example
      // un-recordable.
      if (
        e.ctrlKey &&
        e.shiftKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'c'
      ) {
        e.preventDefault();
        showViewAction('context');
        return;
      }

      if (!meta) return;

      // ⇧⌘↩, session focus (Phase 80.1). Registered above the shift chords
      // below because it is matched on e.key === 'Enter' rather than on a
      // letter, and Shift does not rewrite it.
      //
      // ⇧⌘C is NOT this chord, and the reason is the same one written against
      // ⌃⇧C above. DESIGN.md §4 uses ⇧⌘C as the worked example of a per-agent
      // hotkey, and Claude Code's defaultHotkeyHint is 'c'. ⇧⌘↩ is free in
      // KEYMAP, macOS reserves no Enter chord, and macOS never delivers a
      // Command chord to a pty, so no agent CLI can want it either.
      //
      // preventDefault runs even when the chord is swallowed. The native View
      // row carries the same accelerator and arrives about 5 ms later, so
      // letting it through would play the flight behind the open sheet that
      // the swallow exists to protect.
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!focusChordSwallowed()) void toggleSessionFocus();
        return;
      }

      // ⌘⇧F — Search view. Registered HERE, above the inEditable guard,
      // for the reason the guard exists: the search box IS a text field, and
      // ⌘⇧F pressed inside it must still work (it selects what is there so
      // you can retype). Same placement as ⌘⇧E, same reason.
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        showSearchAction();
        return;
      }

      // ⌘⇧O — go to symbol. `@` when a file is open, `#` otherwise.
      if (e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        useSymbols.getState().openPalette();
        return;
      }

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
            s.toast('info', `Open a project first (${keyDisplay('project.open')})`);
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
        case 'p':
          // ⌘P — quick open. Registered ABOVE the `inEditable` guard's users
          // on purpose: the palette's own input is a text field, and pressing
          // ⌘P again inside it must widen the scope rather than do nothing.
          // (The palette handles the in-field case itself; this branch is the
          // one that opens it from anywhere else, terminal included.)
          if (e.shiftKey) return;
          e.preventDefault();
          useQuickOpen.getState().toggleOrOpen();
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

      // ⌘1…⌘9 — project tabs, in the visual tab order. ⌘1-⌘8 are positions
      // and ⌘9 is the LAST tab however many are open (Phase 12.12 item 3):
      // "the ninth" left every project past nine unreachable, which is the
      // reason browsers settled on this convention. digitToIndex is the same
      // module the tabs' ⌘-held hints read, so the hint cannot promise a jump
      // this handler would not make.
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = digitToIndex(
          parseInt(e.key, 10),
          s.orderedProjects().length
        );
        if (index !== null) s.setActiveProjectByIndex(index);
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
  const layerOpen = modalLayerOpen();

  switch (action) {
    case 'new-session':
      if (s.projects.length === 0) {
        s.toast('info', `Open a project first (${keyDisplay('project.open')})`);
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
    // Phase 18.6. The third project verb. `cloneAction()` is undefined on a
    // preload with no projects:clone, and the same guard the New Project case
    // uses says so out loud rather than doing nothing.
    case 'clone-repository': {
      const clone = cloneAction();
      if (clone === undefined) s.toast('info', 'This build cannot clone repositories.');
      else clone();
      return;
    }
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
    // Phase 18. The guard (no file open, or overlay mode) lives inside
    // toggleEditorFill so the button, ⇧⌘B and this menu item cannot drift.
    case 'toggle-editor-fill':
      toggleEditorFill();
      return;
    // Phase 80.1. View > Focus the Session, one row under Fill the Window.
    // The renderer's keydown branch is what runs when ⇧⌘↩ is pressed (it
    // precedes the accelerator and preventDefaults it), so this path only
    // fires on a real click. The guard lives inside toggleSessionFocus, so
    // the row and the chord cannot drift, and a click that cannot be honoured
    // says why rather than doing nothing.
    case 'toggle-session-focus':
      void toggleSessionFocus();
      return;
    case 'attention':
      s.setAttentionOpen(!s.attentionOpen);
      return;
    case 'shortcuts':
      s.setShortcutsOpen(!s.shortcutsOpen);
      return;
    // Round-1 View menu additions (src/main/menu.ts).
    case 'quick-open':
      // The menu item exists for discoverability; the renderer's keydown map
      // is what actually runs when the chord is pressed (it precedes the
      // accelerator and preventDefaults it), so this path only fires on a
      // real mouse click in the Find menu.
      useQuickOpen.getState().toggleOrOpen();
      return;
    case 'show-explorer':
      showViewAction('explorer');
      return;
    case 'show-scm':
      showViewAction('scm');
      return;
    // Phase 60. View > Context. Same body as the ⌃⇧C keydown branch, so the
    // menu item and the chord cannot drift.
    case 'show-context':
      showViewAction('context');
      return;
    // Phase 14 Find menu.
    case 'show-search':
      if (layerOpen) return;
      showSearchAction();
      return;
    case 'go-to-symbol':
      if (layerOpen) return;
      useSymbols.getState().openPalette();
      return;
    case 'sessions-top':
    case 'sessions-right': {
      // Which position each radio names is decided ONCE, in the same table
      // main built the radios from (src/shared/sessions-position.ts) — never
      // re-typed here, where it could drift from the label the user clicked.
      const position = sessionsPositionForMenuAction(action);
      if (position !== null) s.setSessionOrientation(position);
      return;
    }
    // Phase 29. The Session menu's Past Sessions… item. Menu-only: there is
    // no accelerator and no keydown branch mirrors it.
    case 'past-sessions':
      s.setPastOpen(true);
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
    // ui:menuAction is typed `MenuActionWithFind` — the union main's
    // sendMenuAction actually sends (Phase 16, G1c; it used to say
    // MenuActionId here and widen it back with a cast).
    return bridge.onMenuAction((action: MenuActionWithFind) => {
      // Phase 12.85: the menu-bar sentinel's rows carry a session id.
      if (action.startsWith(FOCUS_SESSION_PREFIX)) {
        jumpToSession(action.slice(FOCUS_SESSION_PREFIX.length));
        return;
      }
      // Phase 18.6: File > Open Recent > a row. The path travels on the id
      // because it cannot be a union member, and it goes to the same
      // addProjectPath every other route to a project ends at — so a folder
      // that has since gone fails with the one sentence that case already has.
      if (action.startsWith(OPEN_RECENT_PREFIX)) {
        void useApp
          .getState()
          .addProjectPath(action.slice(OPEN_RECENT_PREFIX.length));
        return;
      }
      // Phase 51: a warm launch delivered a folder (`tortie .` or a Finder
      // open while Tortie was running). The action carries NO payload on
      // purpose — the path travels only through the take-and-clear
      // shell:takePendingOpen pull, so there is exactly one way the
      // renderer receives it, and it lands on the same addProjectPath
      // route as Open Recent. Since Phase 61 the pull carries an optional
      // file that opens after the project does. A folder deleted between
      // arrival and delivery fails with the one sentence that case
      // already has.
      if (action === 'shell-open-pending') {
        void pullPendingShellOpen();
        return;
      }
      // Still a NARROWING cast, and now visibly so: what survives the
      // focus-session branch is this union minus `launch-agent:*`, which the
      // Settings integration owns (src/renderer/settings/integration.ts).
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
  /**
   * Phase 12.12 item 4: extra project tabs (absolute paths), because the ⌘
   * number hints are a property of the STRIP — one tab proves nothing about
   * where the digits land or whether they reflow their neighbours. Added
   * after the base drive so the driven project stays the active one, and
   * removed again by cleanup.
   */
  extraProjects?: string[];
  /**
   * Phase 12.12 item 4: hold ⌘ for real (a capture-phase Meta keydown on
   * window, exactly what the gesture listens for) and wait past the reveal
   * dwell, so the capture shows the hints rather than a claim about them.
   * Cleanup releases it.
   */
  holdCommand?: boolean;
  /**
   * Phase 12.12 item 3: press ⌘<digit> for real and log which tab it landed
   * on, so "⌘9 is the LAST project" is asserted against the shipped handler
   * and the live tab order — not only against project-shortcuts.test.ts.
   */
  projectDigit?: number;
  /**
   * Phase 12.11: drive per-region zoom with the REAL chord and report what
   * moved — xterm's font, the tmux geometry, a scrolled pane's position, and
   * a hit-test round trip inside every CSS-zoomed region. The findings are
   * console lines (GMUX_SHOT_VERBOSE=1 tees them into the harness output),
   * because none of those four is legible in a PNG.
   */
  zoom?: ZoomProbeSpec;
  /**
   * Phase 14: press ⌘P for real, type a query one character at a time
   * through the shipped handler, and report what came back — the rows,
   * their highlighted characters, and the per-keystroke round trip. None
   * of that is legible in a PNG, and "the palette opened" is the one
   * part of it that is.
   */
  quickOpen?: QuickOpenProbeSpec;
  /**
   * Phase 14: drive ⌘⇧F for real — press the chord, type through the input's
   * own handler, measure time-to-first-painted-row, and open a result. The
   * one thing research 19 §7.3 admits was never measured is time-to-first
   * PAINT with React and virtualization in the loop; this is where it gets
   * measured.
   */
  search?: SearchProbeSpec;
  /** Phase 14: drive ⌘⇧O, including the cold-index state at 200 ms. */
  symbols?: SymbolProbeSpec;
  /**
   * Phase 22: stage the Context view and MEASURE what its row is carrying.
   * Research 29 §5.9 makes three responsive claims — what survives at 340px,
   * at 260px and at 220px — and each of them is a claim about the shipped
   * stylesheet under a live layout engine, which no unit test can see.
   */
  context?: ContextProbeSpec;
  /**
   * Open the ⌘/ shortcuts overlay for capture. Phase 14 added a seventh
   * KEYMAP group and the overlay is a three-column flow, so "does the new
   * group land somewhere sane" is a question only a picture answers.
   */
  shortcuts?: boolean;
  /**
   * Phase 80.1. Press ⇧⌘↩ for real and record every `Terminal.onResize` with
   * its offset in milliseconds from the press.
   *
   * This is the phase's one Tier 3 measurement. The claim is that a live
   * multiplexed surface receives NO resize until the flight ends, and a
   * resize is the one thing about this mode that costs the person their work,
   * because every fit sends new columns and rows to a real session. No
   * screenshot can show it and no unit test can see it, so the driver prints
   * a table of leaf id, columns, rows and offset, and the probe reads tmux on
   * the harness socket at the same time as the second, independent witness.
   */
  sessionFocus?: SessionFocusProbeSpec;
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
    /** Extra project tabs added for the ⌘-hint capture — closed by cleanup. */
    let extraProjectIds: string[] = [];
    /** ⌘ is being held for the capture — released by cleanup. */
    let commandHeld = false;

    w.__gmuxShotDrive = async (spec: unknown): Promise<void> => {
      const wait = (ms: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const ext = spec as ShotLayoutExtras;
      if (ext.orientation === 'right' || ext.orientation === 'top') {
        useApp.getState().setSessionOrientation(ext.orientation);
        // The setter above already pushed the new position to main (that is
        // the ONLY path — Phase 14.7). The harness just waits for the round
        // trip so the capture never races the View menu's radios; it does not
        // repeat the call, which would be a second mechanism.
        await whenSessionsPositionPushed();
        console.log('[shot-drive] sessionsPosition → main: settled');
      }
      await prev(spec);
      // Phase 18.55's rule applied to the harness too: the views are DATA, so
      // this asks the list rather than naming the two it happened to know.
      // Written out by hand it excluded Search from the day Search shipped.
      if (isSidebarViewId(ext.sidebarView)) {
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
        const projectPath = useApp.getState().activeProject()?.path ?? null;
        const four = ids.slice(0, 4);
        if (projectPath !== null && four.length === 4) {
          useLayout.getState().stageGrid(projectPath, four);
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
      // Phase 12.12 item 4 — a real strip, then a real ⌘.
      if (Array.isArray(ext.extraProjects) && ext.extraProjects.length > 0) {
        window.__gmuxShotReady = false;
        const app = useApp.getState();
        const before = new Set(app.projects.map((p) => p.id));
        for (const path of ext.extraProjects) {
          await app.addProjectPath(path);
        }
        await wait(600);
        extraProjectIds = useApp
          .getState()
          .projects.filter((p) => !before.has(p.id))
          .map((p) => p.id);
        // The driven project stays the one on screen.
        const driven = useApp.getState().projects.find((p) => before.has(p.id));
        if (driven !== undefined) useApp.getState().setActiveProject(driven.id);
        window.__gmuxShotReady = true;
      }
      if (typeof ext.projectDigit === 'number') {
        window.__gmuxShotReady = false;
        // Capture-phase keydown on window is exactly where useKeyboardMap
        // listens, so this is the shipped path and not a call to the store.
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: String(ext.projectDigit),
            code: `Digit${ext.projectDigit}`,
            metaKey: true,
            bubbles: true
          })
        );
        await wait(300);
        const app = useApp.getState();
        const ordered = app.orderedProjects();
        const at = ordered.findIndex((p) => p.id === app.activeProjectId);
        console.log(
          `[shot-drive] projectDigit ${acceleratorToDisplay(
            `Cmd+${String(ext.projectDigit)}`
          )} of ${ordered.length}` +
            ` tabs → index ${at} ("${ordered[at]?.name ?? ''}")`
        );
        window.__gmuxShotReady = true;
      }
      if (ext.holdCommand === true) {
        window.__gmuxShotReady = false;
        // The gesture listens on window in the CAPTURE phase for a Meta
        // keydown; anything less than a real event would be testing the
        // harness. Then wait past the dwell (220ms) plus the fade.
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Meta',
            code: 'MetaLeft',
            metaKey: true,
            bubbles: true
          })
        );
        commandHeld = true;
        await wait(700);
        window.__gmuxShotReady = true;
      }
      // Phase 12.11 — last, so it zooms whatever the earlier knobs built.
      if (ext.zoom !== undefined) {
        window.__gmuxShotReady = false;
        const first = useApp
          .getState()
          .projectSessions()
          .find((x) => x.status !== 'exited' && x.status !== 'restorable');
        await driveZoom({
          ...ext.zoom,
          ...(ext.zoom.sessionId === undefined && first !== undefined
            ? { sessionId: first.id }
            : {})
        });
        window.__gmuxShotReady = true;
      }
      // Phase 14 — after everything else, so the palette opens over the
      // finished layout and the capture shows it in its real surroundings.
      if (ext.quickOpen !== undefined) {
        window.__gmuxShotReady = false;
        await driveQuickOpen(ext.quickOpen);
        window.__gmuxShotReady = true;
      }
      if (ext.shortcuts === true) {
        window.__gmuxShotReady = false;
        useApp.getState().setShortcutsOpen(true);
        await wait(400);
        window.__gmuxShotReady = true;
      }
      if (ext.search !== undefined) {
        window.__gmuxShotReady = false;
        await driveSearch(ext.search);
        window.__gmuxShotReady = true;
      }
      if (ext.symbols !== undefined) {
        window.__gmuxShotReady = false;
        await driveSymbols(ext.symbols);
        window.__gmuxShotReady = true;
      }
      if (ext.context !== undefined) {
        window.__gmuxShotReady = false;
        useApp.getState().showSidebarView('context');
        if (ext.context.width !== undefined) {
          useApp.getState().setSidebarWidth(ext.context.width);
        }
        await wait(300);
        await driveContext(ext.context);
        window.__gmuxShotReady = true;
      }
      // Phase 80.1, after everything else, so the chord fires over the
      // finished layout. With `splitGrid` set, that layout is four real
      // attached sessions, which is the substrate the Tier 3 claim needs.
      if (ext.sessionFocus !== undefined) {
        window.__gmuxShotReady = false;
        await driveSessionFocus(ext.sessionFocus);
        window.__gmuxShotReady = true;
      }
    };

    w.__gmuxShotCleanup = async (): Promise<void> => {
      if (commandHeld) {
        window.dispatchEvent(
          new KeyboardEvent('keyup', { key: 'Meta', code: 'MetaLeft', bubbles: true })
        );
        commandHeld = false;
      }
      for (const id of extraProjectIds) {
        // The bridge directly, not closeProject() — that one raises the
        // §4 confirm dialog, which a cleanup pass has nobody to answer.
        await window.gmux?.projects.remove(id).catch(() => undefined);
      }
      extraProjectIds = [];
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
    let title = 'Tortie';
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
// The focus wash (Phase 80.1)
// ---------------------------------------------------------------------------

/**
 * The soft colour that fills the title band while session focus is on.
 *
 * Colour is for state in this app, so the wash reads the VISIBLE LEAVES and
 * nothing else, which is the leaves of the surface that is on screen. Any
 * leaf that needs input wins, else any leaf that is working, else idle. That ordering
 * is `rollupDot`, which is the same expression a project tab rolls its
 * sessions up with, so the band cannot disagree with the tab it replaced.
 *
 * It is its own component for one reason. It re-reads the sessions on every
 * activity tick, which is once a second, and the shell must not re-render at
 * that rate. Here the cost is one empty div whose only prop is a three-value
 * string.
 *
 * It renders in every mode. Outside focus its opacity is 0, so there is no
 * mount and no first paint to wait for at the moment the chord is pressed,
 * and the flight in ./focus-flight.ts can fade it in from CSS alone.
 */
function FocusWash(): React.JSX.Element {
  const { activeSurface, sessionsById } = useProjectSurfaces();
  const statuses = (activeSurface?.leafIds ?? []).flatMap((id) => {
    const session = sessionsById.get(id);
    return session === undefined ? [] : [effectiveStatusOf(session)];
  });
  const roll = rollupDot(statuses);
  const wash = roll === 'attention' || roll === 'working' ? roll : 'idle';
  return <div className="focus-wash" data-wash={wash} aria-hidden="true" />;
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
  // Phase 80.1. A boolean selector, so the shell re-renders on the swap and
  // on nothing else. The 200 ms of flight before it are CSS and a copy.
  const sessionFocus = useApp((s) => s.sessionFocus);

  useKeyboardMap();
  useZoomKeymap();
  useMenuActions();
  useSettingsIntegration();
  useQuitRequests();
  useWindowTitle();
  useShotLayoutHook();
  useFileDropRouter();

  useEffect(() => {
    void boot().then(() => {
      // Phase 38: adopt each open project's UUID-keyed layout entry under
      // its path, then drop the orphans. The call lives here because
      // store.ts cannot import the layout store without an import cycle.
      useLayout.getState().migrateLegacyLayouts(useApp.getState().projects);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 22. Route Context row activations into the editor as `context:<id>`
  // detail tabs. Until this is registered, `open-detail.ts` opens the file that
  // DEFINES the row instead, which is the honest majority of the detail tab, so
  // this call adds the header card rather than switching the gesture on.
  useEffect(() => installContextDetailHost(), []);

  if (!window.gmux) {
    return (
      <div className="shell">
        <div className="titlebar" />
        <div className="empty">
          <div className="empty-inner">
            <h2 className="empty-title">Tortie could not start</h2>
            <p className="empty-body">
              The window bridge failed to load. Quit and reopen Tortie; if
              this keeps happening, reinstall it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 41: three boot blocks, one shape. The screens differ, the chrome
  // around them does not, and none of them renders the rest of the app.
  if (bootBlock !== null) {
    return (
      <div className="shell">
        <div className="titlebar" />
        {bootBlock === 'tmux-missing' ? <TmuxMissing /> : null}
        {bootBlock === 'tmux-bundle-incomplete' ? <TmuxBundleIncomplete /> : null}
        {bootBlock === 'tmux-version-blocked' ? <TmuxVersionBlocked /> : null}
        <Toasts />
      </div>
    );
  }

  return (
    <div className={`shell${sessionFocus ? ' session-focus' : ''}`}>
      {/* Phase 80.1. First child, and deliberately not in the boot-block
          returns above. The wash is only ever seen in focus mode, and focus
          mode cannot be entered from a screen with no session on it. */}
      <FocusWash />
      <Titlebar />
      {ready && projects.length === 0 ? (
        // PHASE 71 fix round. A confirmed machine that did not answer is named
        // here too. The board below is the whole window in this state and the
        // terminal region is not mounted at all, so without this line a person
        // who quit Tortie with an agent running on a machine, and started it
        // again with that machine down, was told nothing anywhere.
        <>
          <MachineStatement />
          <FirstRun />
        </>
      ) : (
        <div className="shell-body">
          {/* S1 region order: activity bar · sidebar (one view) · work area ·
              right session list ("right" orientation).

              The work area is a COLUMN (Phase 18 item 3): the session tab
              strip on top, spanning the whole area, and under it the row of
              terminal + editor. Sessions are the app's primary navigation, so
              opening a file must not be able to subtract width from them —
              before this the strip was the terminal region's own band and
              therefore the editor's flex sibling.

              Both wrappers render UNCONDITIONALLY; only the strip inside them
              depends on orientation. A conditional wrapper would re-key
              <TerminalRegion /> on every orientation switch and tear down
              xterm's WebGL context for every visible pane. */}
          <ActivityBar />
          {sidebarVisible ? <Sidebar /> : null}
          <div className="work-area" {...termFocusHandlers}>
            {orientation === 'top' ? <SessionStrip /> : null}
            <div className="work-row">
              <TerminalRegion />
              <EditorPanel />
            </div>
          </div>
          {orientation === 'right' ? <SessionDock /> : null}
        </div>
      )}

      <CreateSessionModal />
      <NewProjectModal />
      {/* Phase 18.6. Mounted beside New Project because it is reachable from
          the same three places (the home row, the + menu, File) and, unlike
          the home screen, those two of them work from INSIDE a project. It
          renders null unless the clone store says it is open. */}
      <CloneRepoModal />
      {/* Phase 29. Mounted with the other sheets; it renders null unless the
          store says it is open, and only the Session menu opens it. */}
      <PastSessionsModal />
      {/* Phase 72. Mounted beside Past Sessions for the same reason: it
          renders null unless the store says a session's saved output is
          open, and only the session menu opens it. */}
      <SavedOutputModal />
      <ShortcutsOverlay />
      <AttentionOverlay />
      <QuickOpenPalette />
      <SymbolPalette />
      <ConfirmDialog />
      {/* Phase 22. The install sheet and its confirm, mounted with the other
          modals rather than inside the Context view: `.sidebar-rest` is an
          overflow scroller, so a scrim drawn inside it would be clipped to a
          220px column. */}
      <ContextInstallHost />
      <Toasts />
      <ZoomHud />
      <FileDropOverlay />
    </div>
  );
}
