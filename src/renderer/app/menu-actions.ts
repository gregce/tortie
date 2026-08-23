/**
 * The native menu actions, lifted out of App.tsx in Phase 127.
 *
 * src/main/menu.ts sends EVT_MENU_ACTION and this file is where it lands.
 * Each case mirrors the equivalent keydown branch in `./keyboard.ts`, because
 * the menu owns those accelerators and the two must not drift. The four shell
 * reads both files share are in `./shell-actions.ts`.
 */

import { useEffect } from 'react';
import type {
  AnyMenuActionWithProjects,
  MenuActionWithFind
} from '@shared/ipc';
import { OPEN_RECENT_ON_PREFIX, OPEN_RECENT_PREFIX } from '@shared/ipc';
import { keyDisplay } from '@shared/keymap';
import { sessionsPositionForMenuAction } from '@shared/sessions-position';
// Phase 129. The projects radio pair's own table, read for the same reason:
// which position each radio names is decided ONCE, in the table main built
// the radios from, never re-typed at the click site.
import { projectsPositionForMenuAction } from '@shared/projects-position';
import { useApp } from '../state/store';
import { cloneAction } from '../state/clone';
// Phase 92. File > Open Recent can now carry a row on another machine. The
// rule for splitting that row's payload and the sentence a refusal produces
// both live in the module below, so both are reachable by a unit test rather
// than only through this component.
import { openRecentOnMachine } from './open-recent-on-machine';
import { pullPendingShellOpen } from '../state/shell-open';
import { useLayout } from '../state/layout';
import { useEditor } from '../editor/store';
// Phase 18. The guard (no file open, or overlay mode) lives inside
// toggleEditorFill, so the button, Shift+Cmd+B and the menu item cannot drift.
import { toggleEditorFill } from '../editor';
import { focusTerminal, jumpToSession } from './session-focus';
import { runFillChord } from './fill-chord';
import { useQuickOpen } from '../quickopen';
import { useSymbols } from '../search';
import { gmuxBridge } from '../bridge';
import {
  focusedSessionRowId,
  modalLayerOpen,
  showSearchAction,
  showViewAction
} from './shell-actions';

// ---------------------------------------------------------------------------
// Native menu actions (src/main/menu.ts → EVT_MENU_ACTION → here). Each case
// mirrors the equivalent keydown branch — the menu owns those accelerators.
// ---------------------------------------------------------------------------

/** `focus-session:<id>` — see FocusSessionActionId in src/shared/ipc.ts. */
const FOCUS_SESSION_PREFIX = 'focus-session:';

export function runMenuAction(action: AnyMenuActionWithProjects): void {
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
    // PHASE 90.3. The fourth project verb. It is feature detected like the two
    // above it, so a preload with no `projects:addRemote` says so out loud
    // rather than opening a sheet whose only button cannot work.
    case 'open-remote-project':
      if (s.canAddRemoteProject()) s.setRemoteProjectOpen(true);
      else s.toast('info', 'This build cannot open a folder on a machine.');
      return;
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
    // Phase 80.1, rerouted in Phase 129. View > Focus the Session or File,
    // one row under Fill the Window. The renderer's keydown branch is what
    // runs when ⇧⌘↩ is pressed (it precedes the accelerator and
    // preventDefaults it), so this path only fires on a real click.
    //
    // It goes through the same router the chord goes through, because the
    // accelerator printed on this row IS the chord. Phase 129 gave the chord
    // a second region, and a row that kept calling toggleSessionFocus would
    // have advertised keys that do one thing and done another. The 'menu'
    // argument only decides whether a click from neither region says why.
    case 'toggle-session-focus':
      void runFillChord('menu');
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
    // Phase 129. The projects radio pair, read from its own shared table for
    // the same reason. Clicking a radio does not mark it: the store moves the
    // tabs and pushes the new position back, which is what moves the mark.
    case 'projects-top':
    case 'projects-left': {
      const position = projectsPositionForMenuAction(action);
      if (position !== null) s.setProjectsPosition(position);
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

export function useMenuActions(): void {
  useEffect(() => {
    const bridge = gmuxBridge();
    if (typeof bridge?.onMenuAction !== 'function') return;
    // ui:menuAction is typed `MenuActionWithFind` — the union main's
    // sendMenuAction actually sends (Phase 16, G1c; it used to say
    // MenuActionId here and widen it back with a cast).
    return bridge.onMenuAction((action: MenuActionWithFind) => {
      // Phase 12.85: the menu-bar sentinel's rows carry a session id.
      if (action.startsWith(FOCUS_SESSION_PREFIX)) {
        // PHASE 93. The jump is asynchronous now, because a session whose
        // folder has no tab gets one opened before it is landed in. Nothing
        // here waits for it: the answer is a toast the jump raises itself, and
        // this handler has no panel of its own to keep open.
        void jumpToSession(action.slice(FOCUS_SESSION_PREFIX.length));
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
      // Phase 92: File > Open Recent > a row whose folder is on another
      // machine. Checked beside the branch above and never before it, because
      // the two prefixes differ at their eleventh character and so a string
      // starting with one never starts with the other.
      if (action.startsWith(OPEN_RECENT_ON_PREFIX)) {
        void openRecentOnMachine(
          action.slice(OPEN_RECENT_ON_PREFIX.length),
          useApp.getState()
        );
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
