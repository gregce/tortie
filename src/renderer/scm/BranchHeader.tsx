/**
 * S3A Source Control view header [h:36] — round 1: the branch is a MENU.
 *
 * ⎇ branch ˅ (click → native menu: local branches with the current one
 * checked, then "Create branch…") · ↑n ↓n ahead/behind (hidden at 0/0) ·
 * spacer · refresh. Detached HEAD renders the git-commit glyph + short SHA
 * in the warning color. Right-click on the button copies the branch name
 * (round 0's click-to-copy moved here — click now opens the menu).
 *
 * The dirty count moved to the activity bar's SCM badge (round 1); it no
 * longer renders here. Non-git folders show the folder name, muted.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { gitErrorLine, repoState, useGit } from '../state/git';
import { displayPath } from '../app/format';
import { Codicon } from '../icons';
import { hasGitDepth, useGitDepth } from './depth';
import { MiniModal } from './MiniModal';
import type { MiniModalSpec } from './MiniModal';
import type { GmuxGitDepthExtras } from '@shared/ipc';

export function BranchHeader(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const toast = useApp((s) => s.toast);
  const setMenu = useApp((s) => s.setMenu);

  const repos = useGit((s) => s.repos);
  const init = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);
  const refreshAll = useGit((s) => s.refreshAll);

  const checkoutBranch = useGitDepth((s) => s.checkoutBranch);
  const createBranch = useGitDepth((s) => s.createBranch);
  const refreshDepth = useGitDepth((s) => s.refresh);

  const [modal, setModal] = useState<MiniModalSpec | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const depthAvailable = useMemo(() => hasGitDepth(), []);

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

  const openCreateBranchModal = (path: string): void => {
    setModal({
      title: 'Create branch',
      placeholder: 'branch-name',
      submit: (name) => createBranch(path, name)
    });
  };

  /** Click → native branch menu (list + checkout + create). */
  const openBranchMenu = async (
    e: React.MouseEvent,
    path: string,
    currentLabel: string
  ): Promise<void> => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!depthAvailable) {
      // Older preload: the menu is impossible — keep round 0's copy gesture.
      copyBranch(currentLabel);
      return;
    }
    if (menuBusy) return;
    setMenuBusy(true);
    let items: (MenuItemSpec | 'sep')[];
    try {
      const bridge = window.gmux.git as typeof window.gmux.git &
        GmuxGitDepthExtras;
      const branches = (await bridge.branches?.(path)) ?? [];
      items = branches.map((b) => ({
        // ui:popupMenu has no native check state — the ✓ prefix (with an
        // em-space aligning the others) marks the current branch.
        label: `${b.current ? '✓ ' : ' '}${b.name}`,
        run: (): void => {
          if (!b.current) void checkoutBranch(path, b.name);
        }
      }));
      if (items.length > 0) items.push('sep');
      items.push({
        label: 'Create branch…',
        run: () => openCreateBranchModal(path)
      });
    } catch (err) {
      toast('error', `Could not list branches — ${gitErrorLine(err)}`, {
        sticky: true
      });
      setMenuBusy(false);
      return;
    }
    setMenuBusy(false);
    setMenu({ x: rect.left, y: rect.bottom + 2, items });
  };

  if (!project) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <Codicon name="git-branch" size={14} />
        <span className="branch-folder">No project open</span>
      </div>
    );
  }

  // Not a repo (or still unknown): folder name, muted — §6.3 body lives in
  // the Changes section, the header stays quiet.
  if (!status || !status.isRepo) {
    return (
      <div className="branch-header" data-slot="branch-header">
        <Codicon name="git-branch" size={14} />
        <span className="branch-folder" title={project.path}>
          {displayPath(project.path)}
        </span>
      </div>
    );
  }

  const detached = status.branch === undefined;
  const branchLabel = status.branch ?? status.detachedAt ?? 'HEAD';

  return (
    <div className="branch-header" data-slot="branch-header">
      <button
        type="button"
        className={`branch-menu-btn${detached ? ' detached' : ''}`}
        title={
          detached
            ? `Detached at ${branchLabel} — click to switch branches`
            : `${branchLabel} — click to switch branches`
        }
        aria-label={
          detached
            ? `Detached at ${branchLabel}, open branch menu`
            : `Branch ${branchLabel}, open branch menu`
        }
        aria-haspopup="menu"
        onClick={(e) => void openBranchMenu(e, project.path, branchLabel)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: detached ? 'Copy commit SHA' : 'Copy branch name',
                run: () => copyBranch(branchLabel)
              }
            ]
          });
        }}
      >
        <Codicon name={detached ? 'git-commit' : 'git-branch'} size={14} />
        <span className="branch-name">{branchLabel}</span>
        <Codicon name="chevron-down" size={12} className="branch-caret" />
      </button>
      {status.merging ? (
        <span className="chip chip-sm scm-chip-merge">merging</span>
      ) : null}
      {status.ahead > 0 || status.behind > 0 ? (
        <span
          className="branch-arrows num"
          title={[
            status.ahead > 0
              ? `${status.ahead} to push${status.upstream !== undefined ? ` to ${status.upstream}` : ''}`
              : null,
            status.behind > 0
              ? `${status.behind} to pull${status.upstream !== undefined ? ` from ${status.upstream}` : ''}`
              : null
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          {status.ahead > 0 ? `↑${status.ahead}` : ''}
          {status.ahead > 0 && status.behind > 0 ? ' ' : ''}
          {status.behind > 0 ? `↓${status.behind}` : ''}
        </span>
      ) : null}
      <span className="branch-spacer" />
      <button
        type="button"
        className={`icon-btn branch-refresh${repo.refreshing ? ' busy' : ''}`}
        aria-label="Refresh git status"
        title="Refresh"
        onClick={() => {
          void refreshAll(project.path);
          void refreshDepth(project.path);
        }}
      >
        <Codicon name="refresh" size={14} />
      </button>
      {modal !== null ? (
        <MiniModal spec={modal} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}
