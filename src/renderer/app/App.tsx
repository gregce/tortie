/**
 * gmux app shell (Phase 3). Composition, and only composition since Phase 127.
 *
 * Layout: titlebar (project tabs) / sidebar (sessions; git+tree slots) /
 * terminal region. Layers: attention overlay → modals → toasts; context
 * menus are native (Menu.popup) and dismiss themselves. Esc closes the
 * topmost layer (§4).
 *
 * WHAT LEFT THIS FILE IN PHASE 127, and where to look for it now.
 *  - The DESIGN.md §4 keyboard map is `./keyboard.ts`.
 *  - The native menu actions are `./menu-actions.ts`.
 *  - The first-quit toast is `./quit.ts`.
 *  - The four shell reads the first two share are `./shell-actions.ts`.
 *  - The fourteen screenshot drives are `./probe-registry.ts`, which a
 *    person's launch never loads. `./probe-loader.ts` is the gate.
 * Nothing about what any of them does changed. The hooks below are called in
 * the order they were called in before, which is a correctness property,
 * because React reads a component's hooks by position.
 *
 * What stays here is `useWindowTitle`, `FocusWash` and `App` itself.
 *
 * WHAT LEFT THE ENTRY CHUNK IN PHASE 165, and how. Every surface this file
 * mounts that returns null until a store bit flips is mounted through a
 * lazy door now: the Catch Me Up page, the editor panel, the eight sheets,
 * the two palettes and the install host. A door is always mounted, reads the
 * same bit its surface reads first, and fetches the surface's chunk on the
 * first true. The hook order below is unchanged, the JSX order below is
 * unchanged, and `build/assert-probe-containment.mjs` reads the built output
 * and fails the build if any of those surfaces is back in the entry chunk or
 * the eager set is over its budget.
 */

import React, { useEffect } from 'react';
import {
  effectiveStatusOf,
  useApp
} from '../state/store';
// Phase 123: the two boot verbs are the lifecycle owner's, not the store's.
import { bootApp } from '../state/subscriptions';
import { useLayout } from '../state/layout';
// Phase 135. The one predicate that decides whether the activity bar is
// drawn as the 48px column here or as a 36px row inside the sidebar.
import { activityBarIsRow } from '../state/chrome-geometry';
// Phase 127. The three controllers this file used to hold inline.
import { warmMenuIcons } from '../icons';
// Phase 175. The shell subscribes to settings so the rail can read the
// Architecture switch; see the effect in the shell body.
import { useSettingsStore } from '../settings/settings-store';
import { watchArchSurfaceOff } from '../arch/open-map';
import { useKeyboardMap } from './keyboard';
import { useMenuActions } from './menu-actions';
import { useQuitRequests } from './quit';
import { Titlebar } from './Titlebar';
// Phase 129. The project tabs as the window's outermost left column. It
// renders null unless the store says the tabs are on the left.
import { ProjectRail } from './ProjectRail';
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
// Phase 137. The Catch Me Up page. It renders null while the store's
// overview is null, and while it is open the shell root carries
// `overview-open`, which hides the same regions session focus hides.
// PHASE 165: mounted through its lazy door, so the page's chunk is fetched
// on the first open and not at boot.
import { OverviewLayerLazy } from '../overview/lazy';
// PHASE 165. The eight sheets no launch needs during boot, each behind its
// own lazy door in ./lazy-modals.tsx and all in one chunk behind ./modals.ts.
// Every door reads the same store bit its sheet reads first, so nothing about
// when a sheet draws has changed, only when its code is fetched. The comments
// that used to sit on each import are on the doors now.
import {
  CloneRepoModalLazy,
  CreateSessionModalLazy,
  AddLoginModalLazy,
  NewProjectModalLazy,
  PastSessionsModalLazy,
  RemoteLinesModalLazy,
  RemoteProjectModalLazy,
  SavedOutputModalLazy,
  ShortcutsOverlayLazy
} from './lazy-modals';
import { AttentionOverlay } from './AttentionOverlay';
import { ConfirmDialog } from './ConfirmDialog';
// PHASE 165. The install sheet's door, in the Context subject's chunk. It
// reads two bits from the install store and asks for nothing until one is set.
import { ContextInstallHostLazy } from '../context/lazy';
import { Toasts } from './Toasts';
import {
  FirstRun,
  TmuxBundleIncomplete,
  TmuxMissing,
  TmuxVersionBlocked
} from './EmptyStates';
// Phase 5 (editor stream): the S5 editor panel — a right split beside the
// terminal region (overlay under 1400px). It renders null until a file opens.
// PHASE 165: mounted through its lazy door. The door reads one bit, whether
// any tab exists, and the panel's chunk, the diff surface and the shiki
// family behind it are fetched on the first open rather than at boot.
import { EditorPanelLazy } from '../editor/lazy';
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
// capture-phase listener beside the map in ./keyboard.ts instead of adding
// branches to it — zoom's focus resolution is its own concern
// (src/renderer/zoom/focus.ts).
import { useZoomKeymap, ZoomHud } from '../zoom';
// Phase 14: the ⌘P palette. Its DOOR is always mounted, because the door
// owns the two things that must run from boot, being the recently-opened
// list, which records every file opened from ANY surface, and the index
// prewarm. The palette itself is fetched on the first ⌘P (Phase 165).
import { QuickOpenPaletteLazy } from '../quickopen/lazy';
// Phase 14: the ⌘⇧O palette, through its door for the same reason.
import { SymbolPaletteLazy } from '../search/lazy';
import { installContextDetailHost } from '../context/detail-host';

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
  const projects = useApp((s) => s.projects);
  const sidebarVisible = useApp((s) => s.sidebarVisible);
  // Phase 135. Read here for one job only, being which shape the activity
  // bar takes. The project rail reads the same store value for its own
  // width, and neither of them writes it.
  const projectsPosition = useApp((s) => s.projectsPosition);
  const orientation = useApp((s) => s.sessionOrientation);
  // Phase 80.1. A boolean selector, so the shell re-renders on the swap and
  // on nothing else. The 200 ms of flight before it are CSS and a copy.
  const sessionFocus = useApp((s) => s.sessionFocus);
  // Phase 137. The same shape for the Catch Me Up page, and for the same
  // reason. The shell re-renders on open and close and on nothing else.
  const overviewOpen = useApp((s) => s.overview !== null);

  // The hook list, in the order it was in before Phase 127 moved three of
  // these into modules of their own. React reads hooks by position, so the
  // order is a correctness property rather than a style. The one entry that
  // left is the screenshot drive, which now installs itself from
  // src/renderer/main.tsx before the first render.
  useKeyboardMap();
  useZoomKeymap();
  useMenuActions();
  useSettingsIntegration();
  useQuitRequests();
  useWindowTitle();
  useFileDropRouter();

  useEffect(() => {
    void bootApp().then(() => {
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

  // PHASE 153. Rasterize every menu glyph once, before the first right click.
  // A native menu is composed synchronously at click time, so the marks have
  // to be pixels already; a menu opened during the warm is a menu with no
  // icons rather than a menu that waits. See icons/codicon-menu-icon.ts.
  useEffect(() => {
    void warmMenuIcons();
  }, []);

  // PHASE 175. The shell itself reads a setting now: the activity rail draws
  // the Architecture mark only while the switch in Settings then
  // Architecture is on. So this window subscribes to settings at boot rather
  // than waiting for a modal to do it, which is what it used to depend on.
  // `watchSettings` reads one value main already holds and opens no file, and
  // it is idempotent, so the modals' own `init()` still costs nothing extra.
  // The fix round added the second line. The pane resolves itself away when
  // the switch goes off, but an already-open Architecture Map TAB is state,
  // so somebody has to take it away, and this is who.
  useEffect(() => {
    useSettingsStore.getState().watchSettings();
    return watchArchSurfaceOff();
  }, []);

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
    <div
      className={`shell${sessionFocus ? ' session-focus' : ''}${overviewOpen ? ' overview-open' : ''}`}
    >
      {/* Phase 80.1. First child, and deliberately not in the boot-block
          returns above. The wash is only ever seen in focus mode, and focus
          mode cannot be entered from a screen with no session on it. */}
      <FocusWash />
      <Titlebar />
      {/* Phase 137. The Catch Me Up page, over the work area and under the
          title band. It renders null while the page is closed. */}
      <OverviewLayerLazy />
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
          {/* PHASE 129. FIRST, before the activity bar, so a collapsed
              project rail is the window's left bookend rather than a second
              48px strip pressed against the activity bar in the middle of the
              window. It renders null while the tabs are on top, and its width
              comes from chrome-geometry's `projectsRenderedWidth`, which is
              the same function the sidebar's ceiling subtracts. */}
          <ProjectRail />
          {/* PHASE 135. The 48px COLUMN, and only when the row is not drawn.
              The row lives at the head of the sidebar and Sidebar.tsx mounts
              it. Both read `activityBarIsRow`, so exactly one of the two is
              ever on screen and the layout budget in chrome-geometry.ts reads
              the same answer through `activityBarRenderedWidth`.

              The order of these two lines is untouched. Phase 129 put the
              project rail first so a collapsed rail is the window's left
              bookend rather than a second 48px strip pressed against the
              activity bar, and that reason still holds. */}
          {activityBarIsRow({ projectsPosition, sidebarVisible }) ? null : (
            <ActivityBar variant="column" />
          )}
          {sidebarVisible ? <Sidebar /> : null}
          <div className="work-area" {...termFocusHandlers}>
            {orientation === 'top' ? <SessionStrip /> : null}
            <div className="work-row">
              <TerminalRegion />
              <EditorPanelLazy />
            </div>
          </div>
          {orientation === 'right' ? <SessionDock /> : null}
        </div>
      )}

      <CreateSessionModalLazy />
      <NewProjectModalLazy />
      <AddLoginModalLazy />
      <RemoteProjectModalLazy />
      {/* Phase 18.6. Mounted beside New Project because it is reachable from
          the same three places (the home row, the + menu, File) and, unlike
          the home screen, those two of them work from INSIDE a project. It
          renders null unless the clone store says it is open. */}
      <CloneRepoModalLazy />
      {/* Phase 29. Mounted with the other sheets; it renders null unless the
          store says it is open, and only the Session menu opens it. */}
      <PastSessionsModalLazy />
      {/* Phase 72. Mounted beside Past Sessions for the same reason: it
          renders null unless the store says a session's saved output is
          open, and only the session menu opens it. */}
      <SavedOutputModalLazy />
      {/* Phase 100. Mounted beside the saved output panel, which is its
          nearest sibling. It renders null unless the store says a session's
          last lines are open, and the button in the band above the terminal
          and one session menu item are the only two things that open it. */}
      <RemoteLinesModalLazy />
      <ShortcutsOverlayLazy />
      <AttentionOverlay />
      <QuickOpenPaletteLazy />
      <SymbolPaletteLazy />
      <ConfirmDialog />
      {/* Phase 22. The install sheet and its confirm, mounted with the other
          modals rather than inside the Context view: `.sidebar-rest` is an
          overflow scroller, so a scrim drawn inside it would be clipped to a
          220px column. */}
      <ContextInstallHostLazy />
      <Toasts />
      <ZoomHud />
      <FileDropOverlay />
    </div>
  );
}
