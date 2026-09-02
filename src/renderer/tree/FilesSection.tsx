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
 *
 * ## PHASE 90.3 — a folder on another machine now lists rows
 *
 * Phase 90.1 said the files were elsewhere and drew nothing. This section now
 * draws the tree for that tab too, and adds ONE line under the header saying
 * when the folder was read and that Refresh reads it again. Every sentence
 * comes from src/renderer/machines/explorer.ts, which is where the machine
 * vocabulary audit reads them; this module writes none of its own.
 *
 * REFRESH IS THE ONLY THING THAT RE-READS A MACHINE. There is no timer in this
 * component for a remote tab, and the repository watcher is not subscribed for
 * one either, because that watcher reports paths on THIS Mac.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REMOTE_TREE_MAX_ENTRIES } from '@shared/ipc';
import type { GitFileStatus } from '@shared/types';
import {
  isLocalTarget,
  localPathOf,
  sameTarget,
  targetKey,
  targetOfProject
} from '@shared/workspace-target';
import { useApp } from '../state/store';
import { onRepoChanged } from '../state/repo-changed';
import {
  remoteTreeCanWrite,
  remoteTreeDenied,
  remoteTreeMissingBody,
  remoteTreeMissingTitle,
  remoteTreeNotAFolder,
  remoteTreeNotConnected,
  remoteTreeReadAt,
  remoteTreeReadOnly,
  remoteTreeTruncated,
  remoteTreeUnreachable
} from '../machines/explorer';
import {
  machineAnswering,
  machineLabelFor,
  machineWriteRootFor
} from '../state/machines-slice';
import { Codicon } from '../icons';
import { useTreeDensity } from './density';
import { useTreeGitStatus } from './git-status';
import { useTreeIgnored } from './ignored';
import { useFileTree } from './store';
import { useTreeHandle } from './tree-handle';
import { FileTree } from './FileTree';
import './tree.css';

// PHASE 165. The Phase 90.1, 90.3 and 154 harness hooks used to be registered
// here at module scope, because this module was the one the Explorer always
// loaded. The Explorer is lazy now and it is not the default subject, so a
// module scope call here would never run on a launch that showed Source
// Control. They are installed by src/renderer/app/probe-registry.ts, on
// harness launches only.

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

export interface FilesSectionProps {
  /**
   * Optional external decoration source (the SCM store's status list).
   * When provided, this section never fetches git:status itself.
   */
  statusFiles?: readonly GitFileStatus[];
}

export function FilesSection({
  statusFiles
}: FilesSectionProps): React.JSX.Element {
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
  /**
   * PHASE 90.3. The machine this tab's files are on, with the two strings the
   * tree needs, or null for a folder on this Mac.
   *
   * The label is that machine's own label and never a name Tortie chose. Both
   * strings are composed in presentation.ts, so this module writes neither.
   */
  const remote = useMemo(() => {
    if (target === null || isLocalTarget(target)) return null;
    const label = machineLabelFor(machineStates, target.machineId);
    // PHASE 101. The folder a person confirmed Tortie may replace a file
    // under on that machine, or null when they confirmed none. It decides
    // which of the two notes the menu ends with, and PHASE 102 made it decide
    // three verbs on that menu rather than one, being New File, New Folder and
    // Rename. Main refuses a write against the row on disk either way, so this
    // copy is presentational.
    const root = machineWriteRootFor(machineStates, target.machineId);
    const writeRoot = root !== null && root.length > 0 ? root : null;
    return {
      machineId: target.machineId,
      label,
      writeRoot,
      readOnlyNote:
        writeRoot === null
          ? remoteTreeReadOnly(label)
          : remoteTreeCanWrite(writeRoot, label)
    };
  }, [target, machineStates]);

  const root = useFileTree((s) => s.root);
  const rootLoaded = useFileTree((s) => s.rootLoaded);
  const rootError = useFileTree((s) => s.rootError);
  const bridgeMissing = useFileTree((s) => s.bridgeMissing);
  const remoteRead = useFileTree((s) => s.remote);
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

  /**
   * PHASE 90.3 FIX ROUND. One more read, the moment that machine starts
   * answering.
   *
   * THE BUG THIS CLOSES, with the numbers. On a cold boot with a remote tab
   * active the window is drawn before any machine has answered. Measured on
   * 2026-08-19: the link read `quiet` at 1 ms, the Explorer's first read was
   * refused, the section drew the sentence saying Tortie is not connected to
   * that machine, and the link read `connected` at 504 ms. Nothing re-read the
   * folder, so the same sentence and zero rows were still on screen at
   * 44,694 ms. Pressing Refresh fixed it in 200 ms, which is exactly the point:
   * a person who never pressed it was shown a false statement for the whole
   * run.
   *
   * IT IS NOT A TIMER AND IT DOES NOT BECOME ONE. The trigger is the link
   * moving into answering, which happens once per sign in. `retried` holds the
   * target the retry was already spent on, and it is cleared only when that
   * machine stops answering, so one sign in buys exactly one extra read. A read
   * that fails again leaves the sentence up until a person presses Refresh.
   *
   * IT ONLY RETRIES A CONNECTION SHAPED REFUSAL. A folder that is missing, is
   * not a folder, or cannot be read is that machine's own answer about the
   * folder, and asking again would give the same answer.
   */
  const remoteAnswering = useMemo(
    () =>
      remote === null ? false : machineAnswering(machineStates, remote.machineId),
    [remote, machineStates]
  );
  const retried = useRef<string | null>(null);

  useEffect(() => {
    if (remote === null || target === null) {
      retried.current = null;
      return;
    }
    if (!remoteAnswering) {
      // The next sign in to this machine buys one more read.
      retried.current = null;
      return;
    }
    if (remoteRead === null || remoteRead.loading) return;
    if (
      remoteRead.status !== 'unreachable' &&
      remoteRead.status !== 'notConnected'
    ) {
      return;
    }
    const key = targetKey(target);
    if (retried.current === key) return;
    retried.current = key;
    void refreshLoaded();
  }, [remote, target, remoteAnswering, remoteRead, refreshLoaded]);

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
    // PHASE 155. Re-reading the folders is only half of a refresh, and it was
    // the half that already worked. The rows come from a diff against a
    // baseline of what the model is believed to hold, and a baseline that has
    // drifted starves that diff for good: he pressed this button on a file
    // that was on disk and in the store, and nothing moved. So the press
    // re-reads the folders AND then makes the rows agree with them, whatever
    // either side believed a moment ago.
    void refreshLoaded().finally(() => {
      useTreeHandle.getState().handle?.reconcile();
    });
    // PHASE 90.3. A tab on another machine has no ignore set to distrust and no
    // git status on this Mac to re-read, so Refresh there is exactly one call
    // to that machine and nothing else.
    if (remote !== null) return;
    invalidateIgnored();
    if (!externalStatus) void refreshStatus();
  };

  /**
   * PHASE 90.3. The refusal a machine answered with, drawn as its sentence, or
   * null when the folder was read.
   *
   * `notConnected` covers a preload with no `machines.listTree` as well as a
   * machine Tortie is not signed in to, and both are true to a person: Tortie
   * is not connected to that machine, so it cannot read that folder.
   */
  const remoteRefusal = useMemo((): React.ReactNode => {
    if (remote === null || remoteRead === null) return null;
    const label = remote.label;
    const at = remoteRead.root;
    switch (remoteRead.status) {
      case 'ok':
        return null;
      case 'missing':
        return (
          <>
            {remoteTreeMissingTitle(label)}
            <br />
            {remoteTreeMissingBody(at)}
          </>
        );
      case 'notdir':
        return remoteTreeNotAFolder(at, label);
      case 'denied':
        return remoteTreeDenied(at, label);
      case 'unreachable':
        return remoteTreeUnreachable(label);
      case 'notConnected':
        return remoteTreeNotConnected(label);
    }
  }, [remote, remoteRead]);

  /**
   * PHASE 90.3. The one line that says when this folder was last read, and the
   * one that says the answer was capped.
   *
   * IT IS THE HONEST HALF OF HAVING NO TIMER. Nothing re-reads that machine on
   * a clock, so a file an agent writes over there does not appear until Refresh
   * is pressed. Saying when the rows are from is what keeps that from reading
   * as a tree that is simply wrong.
   */
  const readLine =
    collapsed ||
    remote === null ||
    remoteRead === null ||
    remoteRead.status !== 'ok' ||
    remoteRead.readAt === null
      ? null
      : (
          <p className="files-remote-note">
            {remoteTreeReadAt(remoteRead.readAt)}
            {remoteRead.truncated ? (
              <>
                <br />
                {remoteTreeTruncated(
                  remoteRead.shown,
                  remoteRead.total,
                  REMOTE_TREE_MAX_ENTRIES
                )}
              </>
            ) : null}
          </p>
        );

  let body: React.ReactNode = null;
  if (!collapsed) {
    if (!project || target === null) {
      body = (
        <div className="section-stub">Open a project to browse its files.</div>
      );
    } else if (remote !== null && remoteRefusal !== null) {
      // Said BEFORE the skeleton. The machine has answered and its answer is
      // that there is nothing to draw, so a shimmer here would be a promise
      // Tortie cannot keep.
      body = <div className="section-stub">{remoteRefusal}</div>;
    } else if (remote !== null) {
      body =
        !rootLoaded || !sameTarget(root, target) ? (
          <TreeSkeleton />
        ) : (
          <FileTree
            key={`${targetKey(target)}:${density}`}
            rootPath={target.path}
            remote={remote}
            // A folder on another machine has no decorations from this Mac.
            // The Source Control view for that tab reads that machine
            // separately, and it does not feed this tree.
            statusFiles={[]}
            isRepo={false}
            density={density}
          />
        );
    } else if (localPath === null) {
      body = (
        <div className="section-stub">Open a project to browse its files.</div>
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
          remote={null}
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
            <Codicon name="chevron-down" size="sm" />
          </span>
          Files
        </button>
        <span className="section-spacer" />
        <button
          type="button"
          className="icon-btn files-refresh"
          aria-label="Refresh files"
          title="Refresh files"
          disabled={(localPath === null && remote === null) || bridgeMissing}
          onClick={refresh}
        >
          <Codicon name="refresh" size="md" />
        </button>
      </div>
      {readLine}
      {body}
    </section>
  );
}
