/**
 * S3 — "Files" sidebar section: sticky header (▸/▾ collapse persisted per
 * project, refresh accessory on hover) over the virtualized, git-decorated
 * file tree of the active project. Takes the sidebar space remaining under
 * Sessions and Changes.
 *
 * INTEGRATOR: replace `<div data-slot="tree" />` in app/Sidebar.tsx with
 * `<FilesSection />` (import from '../tree'). Optional `statusFiles` prop
 * feeds decorations from the SCM store's status list instead of this
 * module's own git:status fetcher (see git-status.ts).
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { GitFileStatus } from '@shared/types';
import {
  localPathOf,
  sameTarget,
  targetKey,
  targetOfProject
} from '@shared/workspace-target';
import { useApp } from '../state/store';
import { onRepoChanged } from '../state/repo-changed';
import {
  FILES_ELSEWHERE_BODY,
  filesElsewhereTitle
} from '../app/machine-copy';
import { registerTargetShotDrive } from '../app/target-shot-drive';
import { machineLabelFor } from '../state/machines-slice';
import { Codicon } from '../icons';
import { useTreeDensity } from './density';
import { useTreeGitStatus } from './git-status';
import { useTreeIgnored } from './ignored';
import { useFileTree } from './store';
import { FileTree } from './FileTree';
import './tree.css';

// The Phase 90.1 harness hook. It assigns one function to `window` and changes
// nothing else, exactly like the other shot probes. This module is the one the
// Explorer always loads, so registering here needs no edit to App.tsx.
registerTargetShotDrive();

// Collapse persistence (spec: "collapse state persists per project").
const LS_COLLAPSED = 'gmux.filesCollapsed';

function loadCollapsedMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_COLLAPSED);
    return raw === null ? {} : (JSON.parse(raw) as Record<string, boolean>);
  } catch {
    return {};
  }
}

function saveCollapsed(projectId: string, collapsed: boolean): void {
  try {
    const map = loadCollapsedMap();
    map[projectId] = collapsed;
    localStorage.setItem(LS_COLLAPSED, JSON.stringify(map));
  } catch {
    /* cosmetic only */
  }
}

/** Three shimmer lines (60/80/40%) — skeleton, not spinner (OPERATE). */
function TreeSkeleton(): React.JSX.Element {
  return (
    <div className="files-skeleton" aria-hidden="true">
      <span style={{ width: '60%' }} />
      <span style={{ width: '80%' }} />
      <span style={{ width: '40%' }} />
    </div>
  );
}

export function FilesSection({
  statusFiles
}: {
  /**
   * Optional external decoration source (the SCM store's status list).
   * When provided, this section never fetches git:status itself.
   */
  statusFiles?: readonly GitFileStatus[];
}): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);

  const machineStates = useApp((s) => s.machineStates);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  /**
   * The pair the four sidebar stores are keyed on (Phase 90.1).
   *
   * It is composed once per project change rather than per render, and the
   * stores compare it by value anyway, so a fresh but equal object costs
   * nothing.
   */
  const target = useMemo(() => targetOfProject(project), [project]);
  /** The path this Mac may read, or null for a project on another machine. */
  const localPath = localPathOf(target);

  const root = useFileTree((s) => s.root);
  const rootLoaded = useFileTree((s) => s.rootLoaded);
  const rootError = useFileTree((s) => s.rootError);
  const bridgeMissing = useFileTree((s) => s.bridgeMissing);
  const setRoot = useFileTree((s) => s.setRoot);
  const refreshLoaded = useFileTree((s) => s.refreshLoaded);

  const storeFiles = useTreeGitStatus((s) => s.files);
  const isRepo = useTreeGitStatus((s) => s.isRepo);
  const setRepo = useTreeGitStatus((s) => s.setRepo);
  const refreshStatus = useTreeGitStatus((s) => s.refresh);
  const applyExternal = useTreeGitStatus((s) => s.applyExternal);

  // Phase 47 item 1: what the repository ignores. The set is remembered per
  // path, so a .gitignore edit has to throw it away rather than add to it.
  const invalidateIgnored = useTreeIgnored((s) => s.invalidate);
  // Phase 47 item 3: row spacing. The tree's key includes it, because
  // @pierre/trees captures density at construction and has no setter.
  const density = useTreeDensity((s) => s.density);

  const [collapsed, setCollapsed] = useState(false);

  /** True when the SCM store feeds decorations (this module never fetches). */
  const externalStatus = statusFiles !== undefined;

  // Follow the active project.
  useEffect(() => {
    void setRoot(target);
    // Under an external decoration source this section normally never touches
    // the git store, because the SCM store feeds it. A target on another
    // machine is the exception, and it has to be: the SCM store reads this Mac
    // only, so it has nothing to feed and the old decorations would sit there
    // under the new machine's badge. `setRepo` re-targets and clears, and
    // fetches nothing because the target is not local.
    if (!externalStatus || localPath === null) {
      void setRepo(target);
    }
    setCollapsed(
      project ? (loadCollapsedMap()[project.id] ?? false) : false
    );
    // statusFiles handled by the effect below when external.
  }, [project, target, localPath, setRoot, setRepo, externalStatus]);

  // External decoration source (SCM store) — no fetching. The store drops a
  // target that is not local, because the SCM store reads this Mac only.
  useEffect(() => {
    if (statusFiles !== undefined && localPath !== null && target !== null) {
      applyExternal(target, statusFiles);
    }
  }, [statusFiles, target, localPath, applyExternal]);

  // Refresh listings + decorations when the repo changes on disk
  // (git:changed fires on worktree/index/HEAD changes — branch flips too).
  useEffect(() => {
    // No subscription at all for a project on another machine. The watcher
    // reports paths on this Mac, so a path it sends can only ever be about a
    // folder this tab is not showing.
    if (localPath === null) return;
    // The 150 ms coalescing window (checkout touches many files) is now the
    // renderer-wide one in state/repo-changed.ts, which every other surface
    // shares — so the tree, Changes, History and the editor all repaint in
    // the same tick instead of over 150 ms of visible disagreement.
    return onRepoChanged((repoPath) => {
      if (repoPath !== localPath) return;
      void refreshLoaded();
      invalidateIgnored();
      if (!externalStatus) void refreshStatus();
    });
  }, [
    localPath,
    refreshLoaded,
    refreshStatus,
    externalStatus,
    invalidateIgnored
  ]);

  const toggleCollapsed = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      if (project) saveCollapsed(project.id, next);
      return next;
    });
  };

  const refresh = (): void => {
    void refreshLoaded();
    invalidateIgnored();
    if (!externalStatus) void refreshStatus();
  };

  let body: React.ReactNode = null;
  if (!collapsed) {
    if (!project || target === null) {
      body = (
        <div className="section-stub">Open a project to browse its files.</div>
      );
    } else if (localPath === null) {
      // Said BEFORE the bridge branch and before the skeleton. There is
      // nothing to load, so a shimmer here would be a promise Tortie cannot
      // keep.
      body = (
        <div className="section-stub">
          {filesElsewhereTitle(
            machineLabelFor(machineStates, target.machineId)
          )}
          <br />
          {FILES_ELSEWHERE_BODY}
        </div>
      );
    } else if (bridgeMissing) {
      // Pre-integration state: fs:readDir isn't wired in this build.
      body = (
        <div className="section-stub">
          File browsing is not available in this build.
        </div>
      );
    } else if (rootError !== null) {
      body = (
        <div className="section-stub">
          Could not read this folder.
          <button type="button" className="files-retry" onClick={refresh}>
            Try again
          </button>
        </div>
      );
    } else if (!rootLoaded || !sameTarget(root, target)) {
      body = <TreeSkeleton />;
    } else {
      body = (
        <FileTree
          // The density is in the key on purpose: @pierre/trees reads it once
          // at construction, so changing it means a fresh tree. Expansion is
          // written to localStorage on unmount and comes straight back;
          // selection, scroll position and an open filter do not.
          key={`${targetKey(target)}:${density}`}
          rootPath={localPath}
          statusFiles={statusFiles ?? storeFiles}
          isRepo={isRepo}
          density={density}
        />
      );
    }
  }

  return (
    <section
      className={`section-files${collapsed ? ' collapsed' : ''}`}
      data-slot="tree"
    >
      <div className={`section-header${collapsed ? ' collapsed' : ''}`}>
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size={12} />
          </span>
          Files
        </button>
        <span className="section-spacer" />
        <button
          type="button"
          className="icon-btn files-refresh"
          aria-label="Refresh files"
          title="Refresh files"
          disabled={localPath === null || bridgeMissing}
          onClick={refresh}
        >
          <Codicon name="refresh" size={14} />
        </button>
      </div>
      {body}
    </section>
  );
}
