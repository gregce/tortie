/**
 * The keyboard map (DESIGN.md §4), lifted out of App.tsx in Phase 127.
 *
 * One capture-phase listener on `window`. Command chords and F2 always reach
 * the app, even while the terminal owns the keyboard.
 *
 * The native macOS menu (src/main/menu.ts) registers the Command-chord
 * accelerators and forwards them to `./menu-actions.ts`. MEASURED ORDER
 * (Electron 43): this keydown map runs FIRST and the accelerator arrives about
 * 5 ms later, so a branch that calls preventDefault() suppresses its menu item
 * and is the only path that runs. A chord handled in both places must not do
 * its work twice. Chords the menu does not register at all, being Cmd+1 to
 * Cmd+9, Cmd+Shift+] and Cmd+Shift+[, and Cmd+Return, live here alone.
 *
 * The four shell reads this file shares with the menu controller are in
 * `./shell-actions.ts`, so neither controller imports the other.
 */

import { useEffect } from 'react';
import { keyDisplay } from '@shared/keymap';
import { useApp } from '../state/store';
import { useLayout } from '../state/layout';
import type { NavDir } from '../state/layout';
import { shortcutSearchTookEscape } from './ShortcutsOverlay';
// Phase 90.2. The one state in the create sheet that refuses Escape. The sheet
// cannot enforce it on its own, because this file's ladder is capture-phase on
// `window` and stops the event before the sheet's own handler runs.
import { escapeMayCloseCreateSheet } from './create-copy-running';
// Phase 12.12 item 3: Cmd+1 to Cmd+8 by position, Cmd+9 = last. One module,
// shared with the tabs' Command-held hints so the two can never disagree.
import { digitToIndex } from './project-shortcuts';
// Shared with the Cmd+J overlay: "land the user in this session" exists once.
import { focusTerminal } from './session-focus';
// Phase 80.1, the Shift+Cmd+Return chord. The 200 ms flight, the refusals and
// the swap. A DIFFERENT module from ./session-focus above, which is much older
// and means "land the user in a session" for Cmd+J and the menu-bar sentinel.
import { toggleSessionFocus } from './focus-flight';
// Phase 129. Shift+Cmd+Return now answers from an open file as well as from a
// session, and the region the keyboard is in is what decides which one runs.
// The Escape branch below still calls toggleSessionFocus directly, because
// Escape is only ever the way out of session focus.
import { runFillChord } from './fill-chord';
// Phase 137. The Catch Me Up page. The chord toggles it and Escape steps
// back out of it, one rung above the session focus rung.
import { backOrLeaveOverview, toggleOverview } from '../overview/open-overview';
import { useQuickOpen } from '../quickopen';
import {
  focusInsideSearch,
  focusResultsList,
  useSearch,
  useSymbols
} from '../search';
import {
  focusedSessionRowId,
  modalLayerOpen,
  showSearchAction,
  showViewAction
} from './shell-actions';

/**
 * Phase 80.1. ⇧⌘↩ is swallowed while any layer is up, exactly as ⌘B is.
 *
 * Growing a session to fill the window behind an open sheet would put the
 * sheet on top of a layout the person never asked for, and the way back is a
 * chord they cannot see. Silence is the right answer here. It is the only one
 * of the mode's three refusals that says nothing, because the other two can
 * be reached from a menu click and so must speak (./focus-flight.ts).
 */
export function focusChordSwallowed(): boolean {
  return (
    modalLayerOpen() ||
    useQuickOpen.getState().open ||
    useSymbols.getState().open
  );
}

export function useKeyboardMap(): void {
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
          // PHASE 90.2. Escape does nothing at all while a copy is running on
          // another machine. Closing the sheet then would throw away the answer
          // to a write that is happening on somebody else's computer, and the
          // counterpart block has one sentence on screen saying so. The key is
          // still swallowed, so it reaches neither the sheet nor a session.
          if (escapeMayCloseCreateSheet()) s.setCreateOpen(false);
        } else if (s.newProjectOpen) {
          e.preventDefault();
          e.stopPropagation();
          s.setNewProjectOpen(false);
        } else if (s.remoteProjectOpen) {
          // PHASE 90.3. The folder panel inside this sheet stops its own
          // Escape, so this only ever closes the sheet itself.
          e.preventDefault();
          e.stopPropagation();
          s.setRemoteProjectOpen(false);
        } else if (s.shortcutsOpen) {
          e.preventDefault();
          e.stopPropagation();
          // Phase 86: the overlay's search field owns the first Escape while
          // it holds text. Losing the whole sheet because you wanted to undo
          // a query is the wrong trade, and this ladder is the only place
          // that can make the call, because it is capture-phase on window and
          // runs before anything inside the overlay.
          if (!shortcutSearchTookEscape()) s.setShortcutsOpen(false);
        } else if (s.overview !== null) {
          // Phase 137. Escape steps out of the Catch Me Up page. A
          // conversation opened from the project view goes back to the
          // project view, and anything else leaves. The rung sits above
          // session focus because the page draws over the whole work area,
          // so while it is open Escape can only mean the page.
          e.preventDefault();
          e.stopPropagation();
          void backOrLeaveOverview();
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

      // ⌃⇧U — Catch Me Up (Phase 137). Registered beside ⌃⇧C and ⌃⇧G
      // because it is the same gesture family on the same rail. ⇧⌘U is
      // deliberately NOT used: cursor's defaultHotkeyHint is 'u', and the
      // per-agent hotkey space belongs to the person. preventDefault runs
      // whether or not the keyboard is in a terminal, exactly as ⌃⇧C above,
      // and the View menu's Catch Me Up row mirrors it as 'show-overview'.
      if (
        e.ctrlKey &&
        e.shiftKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'u'
      ) {
        e.preventDefault();
        void toggleOverview('chord');
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
        if (!focusChordSwallowed()) void runFillChord();
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
