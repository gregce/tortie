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
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../state/store';
import { useGit } from '../state/git';
import { BranchHeader, ScmSection } from '../scm';
import { SearchHeader, SearchSection } from '../search';
import { canMutate, FilesSection, useFileTree, useTreeHandle } from '../tree';
import { Codicon } from '../icons';

/**
 * Explorer view header — the band slice above the tree ([h:36], S3B).
 *
 * Five actions, in VS Code's order: the two that CREATE, then the three that
 * change how the tree is being looked at. New File / New Folder call the same
 * `TreeOps.newEntry` the context menu calls — the Phase 12.9
 * inline-rename-on-create flow, not a second one — and the mounted tree
 * decides where they land from the current selection (tree/header-actions.ts).
 */
function ExplorerHeader(): React.JSX.Element {
  const refreshLoaded = useFileTree((s) => s.refreshLoaded);
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
  const canCreate = treeHandle !== null && canMutate();

  const create = (kind: 'file' | 'dir'): void => {
    if (treeHandle === null) return;
    treeHandle.ops.newEntry(treeHandle.newEntryTarget(), kind);
  };

  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">Explorer</span>
      <span className="view-header-spacer" />
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="New file"
        title="New file"
        disabled={!canCreate}
        onClick={() => create('file')}
      >
        <Codicon name="new-file" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="New folder"
        title="New folder"
        disabled={!canCreate}
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
  const sidebarWidth = useApp((s) => s.sidebarWidth);
  const setSidebarWidth = useApp((s) => s.setSidebarWidth);

  const view =
    (activeProjectId !== null ? viewByProject[activeProjectId] : undefined) ??
    'scm';

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // One status source for the whole sidebar: the SCM store's list feeds the
  // tree's decorations (null → the tree fetches for itself, e.g. non-repo).
  const scmStatusFiles = useGit((s) => {
    if (!project) return null;
    const status = s.repos[project.path]?.status;
    return status?.isRepo === true ? status.files : null;
  });

  const [dragging, setDragging] = useState(false);

  return (
    <aside
      className={`sidebar sidebar-view-${view}`}
      data-slot="sidebar"
      style={{ width: sidebarWidth, flexBasis: sidebarWidth }}
    >
      {view === 'scm' ? (
        <div className="sidebar-view" data-view="scm" tabIndex={-1}>
          {/* Band: ⎇ branch · ↑↓ ahead/behind · refresh ([h:36], S3A). */}
          <BranchHeader />
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
          <SearchSection />
        </div>
      ) : (
        <div className="sidebar-view" data-view="explorer" tabIndex={-1}>
          <ExplorerHeader />
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

      <div
        className={`sidebar-resizer${dragging ? ' dragging' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
          const startX = e.clientX;
          const startW = sidebarWidth;
          const onMove = (ev: MouseEvent): void => {
            setSidebarWidth(startW + (ev.clientX - startX));
          };
          const onUp = (): void => {
            setDragging(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      />
    </aside>
  );
}
