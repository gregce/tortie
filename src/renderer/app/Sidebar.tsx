/**
 * S3 — Sidebar (round 1): hosts ONE view at a time, chosen from the
 * activity bar — Source Control (branch header + Changes/History, the SCM
 * stream's components), Explorer (the tree stream's git-decorated file
 * tree), or Search (Phase 14: the ⌘⇧F content-search view). Sessions moved
 * OUT of the sidebar onto the terminal region (TerminalRegion tab strip /
 * SessionDock right list).
 *
 * The view header is the sidebar's slice of the 36px HEADER BAND (S1): the
 * SCM view's header IS <BranchHeader/> (already 36px with the shared
 * hairline); the Explorer view renders its own band header here and hides
 * FilesSection's internal 28px section header via CSS (app.css) so exactly
 * one hairline crosses the band.
 *
 * Tree decorations are fed FROM the SCM store's status list so the tree and
 * the Changes section can never disagree (Phase 4 integration).
 *
 * Phase 18 (item 1) — the sidebar SIZES itself against the live window, and
 * can be dragged shut. Three things make that generic rather than per-view,
 * and they are the reason a Context view (docs/research/29) will inherit all
 * of it for free:
 *
 *   - the resizer is a sibling of the view host, not part of any view;
 *   - the ceiling is a FUNCTION of the live window (chrome-geometry's
 *     `sidebarMaxWidth`), not the 400px constant it used to be, so a wide
 *     display gives the tree half the glass and a narrow one still leaves
 *     the terminal its floor;
 *   - dragging below the snap threshold calls `toggleSidebar` — the exact
 *     action the activity bar's icon calls — so "hidden" stays ONE truth and
 *     the icon's selected state, the View-menu radio and ⌘B cannot disagree
 *     with what is on screen (the Phase 14.7 lesson).
 *
 * The stored width is the user's INTENT and is never rewritten by a window
 * resize; what renders is `clampSidebarWidth(stored, liveWindow)`. Shrink the
 * window and grow it back and the chosen width returns exactly.
 */

import React, { useMemo, useRef } from 'react';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { liveChromeGeometry, useApp } from '../state/store';
import { machineLabelFor, machineWriteRootFor } from '../state/machines-slice';
import {
  activityBarIsRow,
  activityBarRenderedWidth,
  clampSidebarWidth,
  dockRenderedWidth,
  projectsRenderedWidth,
  SIDEBAR_MIN,
  SIDEBAR_SNAP,
  useWindowWidth
} from '../state/chrome-geometry';
import { useGit } from '../state/git';
import { useResizeHandle } from '../controls';
import { ContextHeader, ContextSection, useContextActions } from '../context';
import { BranchHeader, ScmSection } from '../scm';
import { SearchHeader, SearchSection } from '../search';
import {
  canMutate,
  densityHint,
  densityLabel,
  FilesSection,
  TREE_DENSITIES,
  useFileTree,
  useTreeDensity,
  useTreeHandle
} from '../tree';
import { Codicon } from '../icons';
// Phase 135. The same component App.tsx mounts as the 48px column. It is
// drawn here as a 36px row while the projects are on the left, and only
// one of the two is ever on screen.
import { ActivityBar } from './ActivityBar';
import {
  REMOTE_BAND_BODY,
  remoteBandTitle,
  remoteTreeReadOnly
} from './machine-copy';
import './machine-band.css';

/**
 * The machine a tab's folder is on, as a label, or null when it is this Mac.
 *
 * PHASE 90.3. One hook, read by the band and by the two create buttons, so the
 * sidebar answers "whose files are these" in exactly one place. It compares the
 * PAIR through `localPathOf` rather than looking at a path, which is the rule
 * Phase 90.1 put in `@shared/workspace-target` and the reason two projects with
 * the same path on two computers cannot be confused for each other.
 */
function useMachineWrite(): { label: string; writeRoot: string | null } | null {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const machineStates = useApp((s) => s.machineStates);
  const target = useMemo(
    () =>
      targetOfProject(projects.find((p) => p.id === activeProjectId) ?? null),
    [projects, activeProjectId]
  );
  if (target === null || localPathOf(target) !== null) return null;
  const root = machineWriteRootFor(machineStates, target.machineId);
  return {
    label: machineLabelFor(machineStates, target.machineId),
    writeRoot: root !== null && root.length > 0 ? root : null
  };
}

/**
 * The label alone, for the band, which asks nothing about saving.
 *
 * It is expressed in terms of the hook above so the sidebar makes ONE lookup
 * against the machine list and the band and the two buttons can never disagree
 * about which machine this tab is on.
 */
function useMachineLabel(): string | null {
  return useMachineWrite()?.label ?? null;
}

/**
 * The band that says whose files the view below is showing (Phase 90.3).
 *
 * Drawn under the header of ALL FOUR views and never dismissible. The sidebars
 * do not follow the focused session, they follow the tab, so this one line is
 * true for the whole life of the tab. It renders nothing at all for a folder on
 * this Mac, which is every tab in every build before this phase.
 */
function MachineBand({ label }: { label: string | null }): React.JSX.Element | null {
  if (label === null) return null;
  return (
    <div className="machine-band" data-slot="machine-band" role="note">
      <span className="machine-band-title">{remoteBandTitle(label)}</span>
      <span className="machine-band-body">{REMOTE_BAND_BODY}</span>
    </div>
  );
}

/**
 * Explorer view header — the band slice above the tree ([h:36], S3B).
 *
 * Six actions, in VS Code's order: the two that CREATE, then the four that
 * change how the tree is being looked at. New File / New Folder call the same
 * `TreeOps.newEntry` the context menu calls — the Phase 12.9
 * inline-rename-on-create flow, not a second one — and the mounted tree
 * decides where they land from the current selection (tree/header-actions.ts).
 *
 * Phase 47 added the fourth of those four, row spacing. It is a native menu
 * rather than a cycling button because there are three choices and a button
 * that cycles through three states cannot say what the next one will be.
 */
function ExplorerHeader(): React.JSX.Element {
  const refreshLoaded = useFileTree((s) => s.refreshLoaded);
  const setMenu = useApp((s) => s.setMenu);
  const density = useTreeDensity((s) => s.density);
  const setDensity = useTreeDensity((s) => s.setDensity);
  // Phase 12.9 item 4: the name filter lives inside @pierre/trees' shadow
  // root and opens by TYPING on a focused tree — a real gesture, and an
  // invisible one. This button is the discoverable half; the mounted tree
  // registers what it may call (tree/tree-handle.ts).
  const treeHandle = useTreeHandle((s) => s.handle);
  const filterOpen = useTreeHandle((s) => s.filterOpen);
  const expandedCount = useTreeHandle((s) => s.expandedCount);

  // An older preload without the mutation channels hides nothing here — it
  // DISABLES, because a create button that vanished would read as a missing
  // feature rather than as a build that cannot write files.
  //
  // PHASE 90.3 added the third condition. A tab whose folder was on another
  // machine had no write path at all, so both buttons were drawn off.
  //
  // PHASE 101 SPLIT THAT CONDITION IN TWO. A machine a person has confirmed a
  // folder for takes a new file, so the first button became pressable there.
  // New folder stayed off on every machine, because nothing in the product
  // made a folder on another computer.
  //
  // PHASE 102 BROUGHT THE SECOND BUTTON BACK ON. `dir-new` makes a folder on
  // that machine, so both buttons now read the same condition and both are
  // pressable on a machine that carries a confirmed folder. They are still two
  // constants, because they gate two different writes and a later round may
  // move one without the other.
  const machine = useMachineWrite();
  const machineLabel = machine?.label ?? null;
  const canCreateFolder =
    treeHandle !== null &&
    canMutate() &&
    (machineLabel === null || machine?.writeRoot !== null);
  const canCreateFile =
    treeHandle !== null &&
    canMutate() &&
    (machineLabel === null || machine?.writeRoot !== null);

  const create = (kind: 'file' | 'dir'): void => {
    if (treeHandle === null) return;
    treeHandle.ops.newEntry(treeHandle.newEntryTarget(), kind);
  };

  const openDensityMenu = (e: React.MouseEvent): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({
      x: rect.right - 8,
      y: rect.bottom + 2,
      // `ui:popupMenu` has no native check state — the ✓ prefix (with two
      // spaces aligning the rest) is the convention the branch menu set.
      items: TREE_DENSITIES.map((option) => ({
        label: `${option === density ? '✓ ' : '  '}${densityLabel(option)}`,
        sublabel: densityHint(option),
        run: (): void => {
          if (option !== density) setDensity(option);
        }
      }))
    });
  };

  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">Explorer</span>
      <span className="view-header-spacer" />
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="New file"
        title={
          machineLabel === null || machine?.writeRoot !== null
            ? 'New file'
            : remoteTreeReadOnly(machineLabel)
        }
        disabled={!canCreateFile}
        onClick={() => create('file')}
      >
        <Codicon name="new-file" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="New folder"
        title={
          machineLabel === null || machine?.writeRoot !== null
            ? 'New folder'
            : remoteTreeReadOnly(machineLabel)
        }
        disabled={!canCreateFolder}
        onClick={() => create('dir')}
      >
        <Codicon name="new-folder" size={16} />
      </button>
      <button
        type="button"
        className={`icon-btn view-header-action${filterOpen ? ' active' : ''}`}
        aria-label="Filter files by name"
        aria-pressed={filterOpen}
        title="Filter files by name"
        disabled={treeHandle === null}
        onClick={() => treeHandle?.toggleFilter()}
      >
        <Codicon name="filter" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label={`Row spacing: ${densityLabel(density)}`}
        aria-haspopup="menu"
        title={`Row spacing: ${densityLabel(density)}`}
        onClick={openDensityMenu}
      >
        <Codicon name="three-bars" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="Refresh files"
        title="Refresh files"
        onClick={() => void refreshLoaded()}
      >
        <Codicon name="refresh" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="Collapse all folders"
        title="Collapse all folders"
        // Nothing open is not an error, and not a click that quietly does
        // nothing either — the control simply has no work.
        disabled={treeHandle === null || expandedCount === 0}
        onClick={() => treeHandle?.collapseAll()}
      >
        <Codicon name="collapse-all" size={16} />
      </button>
    </div>
  );
}

export function Sidebar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const viewByProject = useApp((s) => s.sidebarViewByProject);
  const storedWidth = useApp((s) => s.sidebarWidth);
  const setSidebarWidth = useApp((s) => s.setSidebarWidth);
  // The activity bar's own action, reused verbatim: drag-to-hide must land in
  // the identical state a click on the active view's icon produces.
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  // The Context view's write verbs. The hook is called unconditionally, which
  // is the rule for hooks; the object only reaches a menu when the Context view
  // is the one showing.
  const contextActions = useContextActions();

  const view =
    (activeProjectId !== null ? viewByProject[activeProjectId] : undefined) ??
    'scm';

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const machineLabel = useMachineLabel();

  // One status source for the whole sidebar: the SCM store's list feeds the
  // tree's decorations (null → the tree fetches for itself, e.g. non-repo).
  //
  // PHASE 90.3. The lookup key is `localPathOf(target)` and never the project's
  // bare path. `useGit` holds git status read on THIS Mac, so a tab whose folder
  // is on another machine must find nothing here: a local repository at the same
  // path would otherwise decorate that machine's rows with this Mac's changes,
  // which is the wrong machine defect this phase exists to remove.
  const localRepoPath = useMemo(
    () => localPathOf(targetOfProject(project)),
    [project]
  );
  const scmStatusFiles = useGit((s) => {
    if (localRepoPath === null) return null;
    const status = s.repos[localRepoPath]?.status;
    return status?.isRepo === true ? status.files : null;
  });

  const asideRef = useRef<HTMLElement | null>(null);

  // "At least 50% of the window", re-evaluated on every window resize through
  // the app's ONE resize subscription. Presentation clamps; the store keeps
  // what the user asked for.
  //
  // The ceiling also yields to whatever the session dock is occupying. That is
  // not bookkeeping: without it, half of a 1400px window plus a 320px dock
  // leaves the terminal 12 CSS pixels, and a 12px terminal is a live tmux pane
  // reflowed to two columns (chrome-geometry.ts, rule 2).
  const windowWidth = useWindowWidth();
  const orientation = useApp((s) => s.sessionOrientation);
  const dockCollapsed = useApp((s) => s.dockCollapsed);
  const dockWidth = useApp((s) => s.rightListWidth);
  const projectsPosition = useApp((s) => s.projectsPosition);
  const projectsCollapsed = useApp((s) => s.projectsCollapsed);
  const dockReserved = dockRenderedWidth(
    { orientation, dockCollapsed, dockWidth },
    windowWidth
  );
  // PHASE 129. The project rail takes width from the same row, so the
  // sidebar's ceiling has to yield to it exactly as it yields to the dock.
  // Without this term a 200px rail plus a 320px dock plus a 50% sidebar lays
  // the terminal out inside the reflow band, which is the failure the whole
  // budget exists to stop (chrome-geometry.ts, rule 2).
  const projectsReserved = projectsRenderedWidth(
    { projectsPosition, projectsCollapsed },
    windowWidth
  );
  // PHASE 135. The activity bar gives its 48px back while it is drawn as the
  // row inside this sidebar, so the ceiling has to know which shape it is in.
  // The sidebar is only mounted while it is visible, so the predicate here
  // reduces to "are the projects on the left", but it is written as the shared
  // function so the drawing below and the arithmetic here cannot disagree.
  const activityShape = { projectsPosition, sidebarVisible: true } as const;
  const activityRow = activityBarIsRow(activityShape);
  const activityReserved = activityBarRenderedWidth(activityShape);
  const renderedWidth = clampSidebarWidth(
    storedWidth,
    windowWidth,
    dockReserved,
    projectsReserved,
    activityReserved
  );

  const handle = useResizeHandle({
    anchor: 'left',
    panelRef: asideRef,
    width: renderedWidth,
    min: SIDEBAR_MIN,
    // A function, not a number: a window resize — or a dock collapsing —
    // MID-DRAG must move the ceiling under the drag rather than leave a stale
    // one behind.
    max: () => liveChromeGeometry().sidebarMax,
    onWidth: setSidebarWidth,
    snapAt: SIDEBAR_SNAP,
    onSnap: toggleSidebar,
    label: 'Resize sidebar'
  });

  return (
    <aside
      ref={asideRef}
      className={`sidebar sidebar-view-${view}`}
      data-slot="sidebar"
      style={{ width: renderedWidth, flexBasis: renderedWidth }}
    >
      {/* PHASE 135. The activity bar as a 36px row, FIRST, above every view's
          own header band. Its bottom hairline continues the project rail's
          band hairline straight across the window, and the sidebar's own view
          header sits under it. App.tsx draws the 48px column instead whenever
          this row is not drawn. */}
      {activityRow ? <ActivityBar variant="row" /> : null}
      {view === 'scm' ? (
        <div className="sidebar-view" data-view="scm" tabIndex={-1}>
          {/* Band: ⎇ branch · ↑↓ ahead/behind · refresh ([h:36], S3A). */}
          <BranchHeader />
          <MachineBand label={machineLabel} />
          <div className="sidebar-rest">
            <ScmSection />
          </div>
        </div>
      ) : view === 'search' ? (
        // Phase 14. No `.sidebar-rest` wrapper: the results list IS the
        // scroller, and nesting it inside another one would give the view two
        // scrollbars and break the sticky "Show more" footer.
        <div className="sidebar-view" data-view="search" tabIndex={-1}>
          <SearchHeader />
          <MachineBand label={machineLabel} />
          <SearchSection />
        </div>
      ) : view === 'context' ? (
        // Phase 22. It keeps `.sidebar-rest`, which is not cosmetic: that
        // wrapper is the element zoom.css binds `--zoom-context` to and the
        // element the zoom shot-probe looks for, so the view zooms with the
        // same one-line rule Explorer and Source Control use rather than with
        // Search's exception.
        <div className="sidebar-view" data-view="context" tabIndex={-1}>
          <ContextHeader />
          <MachineBand label={machineLabel} />
          <div className="sidebar-rest">
            {/* SEAM 3, closed. Pass an object and the write verbs appear in
                the row menus; pass nothing and they do not exist. Phase 22
                shipped this with nothing, so no user could install, remove or
                update a skill from the app. */}
            <ContextSection actions={contextActions} />
          </div>
        </div>
      ) : (
        <div className="sidebar-view" data-view="explorer" tabIndex={-1}>
          <ExplorerHeader />
          <MachineBand label={machineLabel} />
          <div className="sidebar-rest">
            {/* Decorations fed from the SCM store's status list. */}
            <FilesSection
              {...(scmStatusFiles !== null
                ? { statusFiles: scmStatusFiles }
                : {})}
            />
          </div>
        </div>
      )}

      {/* Outside the view switch on purpose: every view the sidebar will ever
          host gets the same edge, with no per-view wiring. */}
      <div
        className={`sidebar-resizer${handle.dragging ? ' dragging' : ''}`}
        {...handle.props}
      />
    </aside>
  );
}
