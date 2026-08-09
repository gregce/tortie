/**
 * S3 branch header [h:36] — drop-in replacement for the Sidebar stub.
 * ⎇ branch (mono, click copies) · ↑n ↓n ahead/behind · right: dirty count
 * `● n` + refresh. Non-git folders show the folder name, muted.
 *
 * INTEGRATOR: in src/renderer/app/Sidebar.tsx replace the
 * `<div className="branch-header" data-slot="branch-header">…</div>` stub
 * with `<BranchHeader />` (this component renders the .branch-header div).
 */

import React, { useEffect, useMemo } from 'react';
import { useApp } from '../state/store';
import { dirtyCount, repoState, useGit } from '../state/git';
import { displayPath } from '../app/format';
import { GitBranchIcon } from '../app/icons';
import { RefreshIcon } from './icons';

export function BranchHeader(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const toast = useApp((s) => s.toast);

  const repos = useGit((s) => s.repos);
  const init = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);
  const refreshAll = useGit((s) => s.refreshAll);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const repoPath = project?.path ?? null;
  const repo = repoState(repos, repoPath);
  const status = repo.status;

  useEffect(() => {
    init();
    if (repoPath !== null) ensureStatus(repoPath);
  }, [init, ensureStatus, repoPath]);

  const copyBranch = (name: string): void => {
    void navigator.clipboard.writeText(name).then(
      () => toast('info', 'Branch name copied'),
      () => toast('error', 'Could not copy the branch name')
    );
  };

  if (!project) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <GitBranchIcon size={14} />
        <span className="branch-folder">No project open</span>
      </div>
    );
  }

  // Not a repo (or still unknown): folder name, muted — §6.3 body lives in
  // the Changes section, the header stays quiet.
  if (!status || !status.isRepo) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <GitBranchIcon size={14} />
        <span className="branch-folder" title={project.path}>
          {displayPath(project.path)}
        </span>
      </div>
    );
  }

  const branchLabel = status.branch ?? status.detachedAt ?? 'HEAD';
  const dirty = dirtyCount(status);

  return (
    <div className="branch-header" data-slot="branch-header">
      <GitBranchIcon size={14} />
      <button
        type="button"
        className="branch-name branch-copy"
        title={`${branchLabel} — click to copy`}
        onClick={() => copyBranch(branchLabel)}
      >
        {branchLabel}
      </button>
      {status.branch === undefined ? (
        <span className="chip chip-sm">detached</span>
      ) : null}
      {status.merging ? (
        <span className="chip chip-sm scm-chip-merge">merging</span>
      ) : null}
      {status.ahead > 0 ? (
        <span
          className="branch-arrows num"
          title={`${status.ahead} to push${status.upstream !== undefined ? ` to ${status.upstream}` : ''}`}
        >
          ↑{status.ahead}
        </span>
      ) : null}
      {status.behind > 0 ? (
        <span
          className="branch-arrows num"
          title={`${status.behind} to pull${status.upstream !== undefined ? ` from ${status.upstream}` : ''}`}
        >
          ↓{status.behind}
        </span>
      ) : null}
      <span className="branch-spacer" />
      {dirty > 0 ? (
        <span
          className="branch-dirty num"
          title={`${dirty} changed ${dirty === 1 ? 'file' : 'files'}`}
        >
          ● {dirty}
        </span>
      ) : null}
      <button
        type="button"
        className={`icon-btn branch-refresh${repo.refreshing ? ' busy' : ''}`}
        aria-label="Refresh git status"
        title="Refresh"
        onClick={() => void refreshAll(project.path)}
      >
        <RefreshIcon size={14} />
      </button>
    </div>
  );
}
