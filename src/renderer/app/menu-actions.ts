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
// PHASE 268. File > Auto Save writes one settings field and reads it back
// through the same store the Settings window writes, so the two surfaces can
// never disagree about what the mode is.
import { useSettingsStore } from '../settings/settings-store';
// Phase 18. The guard (no file open, or overlay mode) lives inside
// toggleEditorFill, so the button, Shift+Cmd+B and the menu item cannot drift.
// PHASE 165: from its own leaf, so the menu reaches it without the panel.
import { toggleEditorFill } from '../editor/fill';
// Phase 227. The Redline view's four verbs, through the leaf the view installs
// its handler on, so the menu reaches the view without loading the panel.
import { runRedlineCommand } from '../editor/redline-commands';
// Phase 241. The editor's three reshapes, through the leaf the Monaco host
// installs its handler on, for the same reason the four above go through one.
import { runReshapeCommand } from '../editor/reshape-commands';
import { focusTerminal, jumpToSession } from './session-focus';
import { runFillChord } from './fill-chord';
// Phase 137. View > Catch Me Up. The same router the ⇧⌘U chord runs.
import { toggleOverview } from '../overview/open-overview';
// Phase 64: the aiming verb's picker. It opens a native menu over the session
// the person is in and opens no view, which is why it is reached from here and
// not through showViewAction.
import { openAimPicker } from '../arch/picker';
// Phase 160: the map tab's one opener, shared with the Architecture pane's
// own control so the two gestures cannot drift.
import { openArchMapForActiveProject } from '../arch/open-map';
// Phase 163: the report tab's one opener, shared with the Settings door.
import { openDiagnosticsReport } from '../diagnostics/open-report';
import { useQuickOpen } from '../quickopen/store';
import { useSymbols } from '../search/symbols-store';
import { gmuxBridge } from '../bridge';
// Phase 293. The session manager's eager leaf: the two doors, the question
// they ask instead of `modalLayerOpen()`, and the rename of a focused sheet
// row. It imports the store and nothing drawn, so this file still loads no
// sheet; the sheet is behind ../session-manager/lazy.tsx.
import {
  closeSessionManager,
  leaveSessionManagerFor,
  openSessionManager,
  otherLayerOpen,
  renameFocusedManageRow,
  sheetIsTopLayer
} from '../session-manager/open';
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

/** The one sentence the three Edit > reshape rows say with no editor open. */
const RESHAPE_NEEDS_EDITOR = 'Open a file in the editor to reshape it.';

/**
 * PHASE 141 — Session > Resume Conversation.
 *
 * WHY THE MENU BAR ROW IS NOT OPTIONAL. The row on the session itself is the
 * obvious road to this verb, and it does not exist in session focus mode, where
 * the session list is hidden by design. The menu bar is the only surface that
 * works there, so it carries the same verb.
 *
 * IT IS ALWAYS PRESENT AND IT ACTS ON THE ACTIVE SESSION, returning in silence
 * when that session's agent has not left. That is not an invention: `end-session`
 * below already returns in silence when the active session has ended. The menu
 * bar template has no per session rebuild path, only the recents, updates,
 * machines and hotkeys subscriptions, so a row that greys itself per session is
 * not buildable without a new rebuild trigger and this phase does not add one.
 *
 * IT CARRIES NO ACCELERATOR, deliberately, and for the reason End Session
 * carries none: it acts on a live session a person is looking at, and typing
 * into that session deserves the same care as ending it.
 */
export const RESUME_CONVERSATION_ACTION = 'resume-conversation';

export function runMenuAction(action: AnyMenuActionWithProjects): void {
  const s = useApp.getState();
  const layerOpen = modalLayerOpen();
  // Phase 293. The session manager is open. It is asked apart from
  // `layerOpen`, which it is also part of, because the doors below did not
  // all ask about layers before it existed and each of them, under the sheet,
  // acted on the session or the surface BEHIND it. Every arm that reads this
  // returns before it acts: a row in the menu bar stays clickable while a
  // sheet is up, so the refusal has to be here and not in the sheet.
  const sheetOpen = s.sessionSheet !== null;

  // PHASE 141. This is read before the switch rather than as a case in it, and
  // the reason is a build ordering one rather than a design one: the id belongs
  // in `MenuActionId` in src/shared/ipc/app.ts, which this phase adds, and a
  // switch over that union cannot name a member the union does not carry yet.
  // Once the id is in the union this branch is one `case` line in the switch
  // beside `end-session`, and nothing about what it does changes.
  if ((action as string) === RESUME_CONVERSATION_ACTION) {
    // Phase 293. Under the sheet this typed into a session nobody could see.
    if (sheetOpen) return;
    const target = s.activeSession();
    if (!target) return;
    // Every condition worth checking is checked once, in the store's own verb:
    // this Mac, a session whose agent actually left, and one press at a time.
    // A second reading here would be a second answer to the same question.
    void s.resumeInPlace(target.id);
    return;
  }

  switch (action) {
    case 'new-session':
      // Phase 293. Under the sheet this stacked the create sheet on it.
      if (sheetOpen) return;
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
      //
      // Phase 293. Under the session manager the row renames the focused
      // SHEET row, in the sheet's own rename, or nothing: no sheet row stamps
      // the attribute the resolution below reads, so it fell through to the
      // active session behind the scrim. This sits ABOVE the layer guard
      // because the sheet is itself a layer and the guard would return first.
      // The keydown branch in ./keyboard.ts is the one F2 actually reaches;
      // this one is for a real click on the menu row.
      if (sheetOpen) {
        if (sheetIsTopLayer()) renameFocusedManageRow();
        return;
      }
      if (layerOpen || s.renamingSessionId !== null) return;
      const renameId = focusedSessionRowId() ?? s.activeSession()?.id ?? null;
      if (renameId !== null) s.setRenaming(renameId);
      return;
    }
    case 'end-session': {
      const target = s.activeSession();
      if (!target) return;
      if (target.status === 'exited' || target.status === 'restorable') return;
      // Phase 293, the fix round (W6). Today this row raises its confirmation
      // ABOVE Past Sessions, for the active session, and a person uses it
      // there. Stacked on the sheet it asked about a session hidden behind a
      // list of other sessions, focus on its destructive button. So under the
      // sheet the sheet closes FIRST and the confirmation is raised over the
      // session it names, exactly as it is with no sheet at all.
      if (sheetOpen) {
        leaveSessionManagerFor(() => useApp.getState().endSession(target.id));
        return;
      }
      s.endSession(target.id);
      return;
    }
    case 'next-session':
      // ⌥⌘↓ — with splits (S4A) this moves focus to the split below,
      // falling through to the next surface at the edge (= the round-1
      // session cycling on unsplit surfaces).
      //
      // Phase 293, the fix round (the press attack's P1). Under the session
      // manager both rows do nothing: they selected a session BEHIND the sheet
      // and its terminal took the keyboard. The chord is refused in
      // ./keyboard.ts; this is the click on the row.
      if (sheetOpen) return;
      useLayout.getState().navigate('down');
      return;
    case 'prev-session':
      if (sheetOpen) return;
      useLayout.getState().navigate('up');
      return;
    case 'open-project':
      void s.openProject();
      return;
    case 'new-project':
      // ⇧⌘N (File menu). The dialog is the only path that writes a folder,
      // so an older preload without projects:create simply never opens it.
      //
      // Phase 293, the fix round (the press attack's P2). Under the session
      // manager this row, Open Remote Project… and Clone Repository… do
      // nothing: each drew its dialog UNDER the sheet with the keyboard in a
      // field nobody could see, which is what today's Past Sessions does too.
      if (sheetOpen) return;
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
      if (sheetOpen) return;
      if (s.canAddRemoteProject()) s.setRemoteProjectOpen(true);
      else s.toast('info', 'This build cannot open a folder on a machine.');
      return;
    case 'clone-repository': {
      if (sheetOpen) return;
      const clone = cloneAction();
      if (clone === undefined) s.toast('info', 'This build cannot clone repositories.');
      else clone();
      return;
    }
    case 'close-project': {
      const projectId = s.activeProjectId;
      if (projectId === null) return;
      // Phase 293, the fix round (the press attack's P2). Today its
      // confirmation is drawn ABOVE Past Sessions, focus on its primary
      // button, about the tab behind it. Under the manager the manager closes
      // first, so the question is asked over the tab it names (as W6's doors).
      if (sheetOpen) {
        leaveSessionManagerFor(() => useApp.getState().closeProject(projectId));
        return;
      }
      s.closeProject(projectId);
      return;
    }
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
    // PHASE 268. File > Auto Save. It toggles off ↔ afterDelay and nothing
    // else, which is what VS Code's own `toggleAutoSave` does; the two other
    // modes are a Settings choice. The row's tick is NOT set here — the
    // setting is written, main rebuilds the menu, and the rebuilt template
    // reads the new value.
    case 'toggle-auto-save': {
      const settings = useSettingsStore.getState();
      const { mode, delayMs } = settings.settings.autoSave;
      void settings.update({
        autoSave: { mode: mode === 'off' ? 'afterDelay' : 'off', delayMs }
      });
      return;
    }
    case 'close-editor-tab': {
      const ed = useEditor.getState();
      if (!ed.panelOpen) return;
      ed.closeActive();
      // PHASE 260: the strip that emptied is the active project's.
      if (useEditor.getState().visibleTabs().length === 0) focusTerminal();
      return;
    }
    case 'toggle-editor': {
      const ed = useEditor.getState();
      const wasOpen = ed.panelOpen;
      ed.togglePanel();
      if (wasOpen) focusTerminal();
      return;
    }
    // Phase 227. Edit > Next Change, Previous Change, Rewind Change, Undo
    // Rewind. Each is handed to the mounted Redline view; with none mounted
    // the leaf answers false and nothing happens, the way close-editor-tab
    // returns when no panel is open.
    case 'redline-next':
      runRedlineCommand('next');
      return;
    case 'redline-prev':
      runRedlineCommand('prev');
      return;
    case 'redline-rewind':
      runRedlineCommand('rewind');
      return;
    case 'redline-undo':
      runRedlineCommand('undo');
      return;
    // Phase 238. Edit > Accept Change and Accept All Changes. Neither writes
    // a file: an accept moves this tab's own shadow baseline and nothing else.
    case 'redline-accept':
      runRedlineCommand('accept');
      return;
    case 'redline-accept-all':
      runRedlineCommand('acceptAll');
      return;
    // Phase 241. Edit > Format Table, Format JSON, Minify JSON. The mounted
    // Monaco host answers each one against what is under its caret and says
    // out loud when nothing there could be reshaped; with no host mounted the
    // leaf answers false and this row says so once rather than doing nothing
    // a person could mistake for a broken menu.
    case 'reshape-table':
      if (!runReshapeCommand('table')) s.toast('info', RESHAPE_NEEDS_EDITOR);
      return;
    case 'reshape-json-format':
      if (!runReshapeCommand('json-format')) s.toast('info', RESHAPE_NEEDS_EDITOR);
      return;
    case 'reshape-json-minify':
      if (!runReshapeCommand('json-minify')) s.toast('info', RESHAPE_NEEDS_EDITOR);
      return;
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
      // Phase 293. Under the sheet this flew a region a person cannot see.
      // The chord is already swallowed there; this is the click.
      if (sheetOpen) return;
      void runFillChord('menu');
      return;
    case 'attention':
      // Phase 293. The ⌘J list's rows act on sessions with no sheet host, so
      // over the sheet they reached a confirmation for a session behind it,
      // and its Catch me up… row opened the page UNDER the sheet. The fix
      // round (W6): today the list is drawn ABOVE Past Sessions and used
      // there, so under the manager the manager closes first and the list
      // opens over the app, never stacked on the sheet.
      if (sheetOpen) {
        leaveSessionManagerFor(() => useApp.getState().setAttentionOpen(true));
        return;
      }
      s.setAttentionOpen(!s.attentionOpen);
      return;
    case 'shortcuts':
      // Phase 293. Over the sheet this stacked the overlay on it. The fix
      // round (W6): the same as the ⌘J row above, for the same reason.
      if (sheetOpen) {
        leaveSessionManagerFor(() => useApp.getState().setShortcutsOpen(true));
        return;
      }
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
    // Phase 63. View > Architecture. Same body as the ⌃⇧A keydown branch, so
    // the menu item and the chord cannot drift, which is the thing the Context
    // view got wrong for thirty-eight phases.
    case 'show-arch':
      showViewAction('arch');
      return;
    // Phase 160. View > Architecture Map. The same door the Architecture
    // pane's own control goes through, so the menu row and the control cannot
    // drift: one repository has one map tab and a second ask focuses it.
    case 'show-arch-map':
      if (layerOpen) return;
      openArchMapForActiveProject();
      return;
    // Phase 258. View > Architecture Surfaces and View > Architecture Gates.
    // The same one door with the inner tab named: one map tab per
    // repository, focused if open, and the inner tab switches under it.
    case 'show-arch-surfaces':
      if (layerOpen) return;
      openArchMapForActiveProject('surfaces');
      return;
    case 'show-arch-gates':
      if (layerOpen) return;
      openArchMapForActiveProject('gates');
      return;
    // Phase 259. View > Architecture Journeys, through that same one door
    // with the fourth inner tab named.
    case 'show-arch-journeys':
      if (layerOpen) return;
      openArchMapForActiveProject('journeys');
      return;
    // Phase 163. Help > Diagnostics Report, and the row in Settings, which
    // main forwards as this same action. One door, so the two cannot drift:
    // the whole app has one report tab and a second ask focuses it.
    case 'show-diagnostics':
      if (layerOpen) return;
      openDiagnosticsReport();
      return;
    // Phase 198. View > File History. The Source Control view, through the
    // same door the ⌃⇧G chord takes, and then the File history section is
    // asked to open. It follows the editor's active tab on its own.
    case 'show-file-history':
      if (layerOpen) return;
      showViewAction('scm');
      // Through a lazy door, because the section's store lives in the Source
      // Control chunk the view above just asked for, and a static import here
      // would put src/renderer/scm/depth.ts in the eager set that
      // build/assert-probe-containment.mjs holds under budget. The Explorer
      // row's History item asks the same store the same way.
      void import('../scm/depth').then((m) => {
        m.useGitDepth.getState().revealFileHistory();
      });
      return;
    // Phase 64. Session > Aim at a Promise…. Same body as the ⌃⇧P keydown
    // branch, so the menu row and the chord cannot drift, which is the thing
    // the Context view got wrong for thirty-eight phases. It opens no view: it
    // reads the contract, raises a native menu over the session the person is
    // in, and puts what they pick into that session's prompt.
    case 'arch-aim':
      if (layerOpen) return;
      void openAimPicker();
      return;
    // Phase 137. View > Catch Me Up, directly under Context. The renderer's
    // ⇧⌘U branch is what runs when the chord is pressed (it precedes the
    // accelerator and preventDefaults it), so this path fires on a real menu
    // click — or on the accelerator itself when a recorded per-agent ⇧⌘U
    // exists and the renderer branch yields, in which case the Session
    // menu's recorded item precedes this one and takes the chord first.
    // It is handled without the layer guard on purpose, because
    // while the page is open modalLayerOpen() counts it, and the row must
    // still be able to CLOSE the page.
    //
    // Phase 293. It asks about the session manager ALONE, for that same
    // reason: under the sheet the page would open beneath it. That ⇧⌘U is
    // refused under no OTHER layer is a finding this phase reports and does
    // not rule on.
    case 'show-overview':
      if (sheetOpen) return;
      void toggleOverview('menu');
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
    // Phase 293. Session → Manage Sessions… and, since Phase 29, Past
    // Sessions…: two doors into ONE sheet, on its first and its second tab.
    // Menu-only, with no accelerator and no keydown branch, because the sheet
    // ends processes and a person reads a name first.
    //
    // THERE IS NO PROJECT GUARD, on purpose: the sheet lists sessions whose
    // project has no tab, so it must open with no project open at all.
    //
    // Under a boot block no sheet mounts (App.tsx returns before the sheets),
    // and an open flag over nothing would hold `modalLayerOpen()` true for
    // the rest of the launch, hence the first guard.
    //
    // The second guard is `otherLayerOpen()` and NOT `layerOpen`. The sheet
    // is part of `layerOpen`, and a second press on either row while the
    // sheet is the top layer must switch its tab, which the store refuses by
    // itself while a batch runs. Any layer that is drawn OVER the sheet
    // refuses the door, the two palettes included, so a tab never changes
    // under something drawn over it. The Catch Me Up page and the New Session
    // sheet do not: the door opens OVER them, as Past Sessions did, because
    // refusing there was a silent no-op (the fix round, W3; ./open.ts says
    // why each is always under the sheet).
    case 'manage-sessions':
    case 'past-sessions': {
      if (s.bootBlock !== null) return;
      if (otherLayerOpen()) return;
      openSessionManager(action === 'past-sessions' ? 'past' : 'managed');
      return;
    }
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
        // folder has no tab gets one opened before it is landed in. A refusal
        // is a toast the jump raises itself.
        //
        // Phase 293. A person who asked for a session from OUTSIDE the window
        // gets it: when the jump landed and the session manager is open, the
        // sheet closes and the close itself hands the keyboard to the
        // terminal, one frame later, because a terminal under a sheet that is
        // still drawn may refuse focus. A refused jump leaves the sheet open.
        void jumpToSession(action.slice(FOCUS_SESSION_PREFIX.length)).then(
          (r) => {
            if (r.ok && useApp.getState().sessionSheet !== null) {
              closeSessionManager({ give: 'terminal' });
            }
          }
        );
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
