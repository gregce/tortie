/**
 * S2 — Titlebar & project tabs. 38px drag region; tabs/buttons no-drag.
 * Tab anatomy: roll-up dot · name · amber needs-input badge. Branch/dirty
 * data stays in the sidebar header — tabs stay scannable.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Project, SessionStatus } from '@shared/types';
import {
  effectiveStatusOf,
  loginItemExtras,
  sortProjects,
  useApp
} from '../state/store';
import { useGit } from '../state/git';
import { rollupDot } from './status';
import type { DotKind } from './status';
import { truncateMiddle } from './format';
import {
  BellIcon,
  GitBranchIcon,
  PlusIcon,
  SettingsIcon,
  XIcon
} from './icons';

interface TabData {
  project: Project;
  dot: DotKind | 'none';
  attentionCount: number;
}

function ProjectTab({
  data,
  selected
}: {
  data: TabData;
  selected: boolean;
}): React.JSX.Element {
  const { project, dot, attentionCount } = data;
  const setActiveProject = useApp((s) => s.setActiveProject);
  const closeProject = useApp((s) => s.closeProject);
  const reorderTabs = useApp((s) => s.reorderTabs);
  const setMenu = useApp((s) => s.setMenu);
  const [dropTarget, setDropTarget] = useState(false);

  // Live branch name (git:changed keeps the store fresh); null hides the
  // chip — non-git folders and still-loading repos stay quiet.
  const branch = useGit((s) => {
    const status = s.repos[project.path]?.status;
    if (status?.isRepo !== true) return null;
    return status.branch ?? status.detachedAt ?? null;
  });

  return (
    <button
      type="button"
      className={`ptab${selected ? ' selected' : ''}${dropTarget ? ' drop-target' : ''}`}
      title={project.path}
      onClick={() => setActiveProject(project.id)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-gmux-tab', project.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-gmux-tab')) {
          e.preventDefault();
          setDropTarget(true);
        }
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        setDropTarget(false);
        const fromId = e.dataTransfer.getData('application/x-gmux-tab');
        if (fromId) reorderTabs(fromId, project.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: 'Close project',
              run: () => closeProject(project.id)
            }
          ]
        });
      }}
      aria-label={`${project.name}${
        attentionCount > 0
          ? `, ${attentionCount} ${attentionCount === 1 ? 'session needs' : 'sessions need'} input`
          : ''
      }`}
      aria-current={selected ? 'true' : undefined}
    >
      <span className={`dot dot-${dot === 'none' ? 'none' : dot}`} />
      <span className="ptab-name">{truncateMiddle(project.name, 24)}</span>
      {branch !== null ? (
        <span className="ptab-branch" title={`On branch ${branch}`}>
          <GitBranchIcon size={10} />
          {truncateMiddle(branch, 18)}
        </span>
      ) : null}
      {attentionCount > 0 ? (
        <span className="badge-attention num">{attentionCount}</span>
      ) : null}
      <span
        className="ptab-close"
        role="button"
        aria-label={`Close ${project.name}`}
        title="Close project"
        onClick={(e) => {
          e.stopPropagation();
          closeProject(project.id);
        }}
      >
        <XIcon size={12} />
      </span>
    </button>
  );
}

/**
 * Settings gear (Phase 6) — one menu, one setting: 'Launch gmux at login'
 * (the T3 restore trigger, §2.4 Step 3.1). Hidden when the bridge lacks the
 * login-item methods. State is read fresh on every open and re-read from
 * the OS after toggling — System Settings can veto silently.
 */
function SettingsButton(): React.JSX.Element | null {
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  const extras = loginItemExtras();
  if (
    typeof extras.getLoginItem !== 'function' ||
    typeof extras.setLoginItem !== 'function'
  ) {
    return null;
  }
  const getLoginItem = extras.getLoginItem.bind(extras);
  const setLoginItem = extras.setLoginItem.bind(extras);

  const openMenu = async (x: number, y: number): Promise<void> => {
    let on = false;
    try {
      on = (await getLoginItem()).openAtLogin;
    } catch {
      /* menu still opens; toggle reports its own errors */
    }
    setMenu({
      x,
      y,
      items: [
        {
          label: `${on ? '✓ ' : ''}Launch gmux at login`,
          run: () => {
            void (async () => {
              try {
                const next = await setLoginItem(!on);
                // Render the OS READBACK, not the request.
                if (next.openAtLogin === !on) {
                  toast(
                    'success',
                    next.openAtLogin
                      ? 'gmux will launch at login and offer to restore your sessions.'
                      : 'gmux will no longer launch at login.'
                  );
                } else {
                  toast(
                    'error',
                    'macOS declined the change — check System Settings › General › Login Items.',
                    { sticky: true }
                  );
                }
              } catch (err) {
                toast('error', (err as Error).message, { sticky: true });
              }
            })();
          }
        }
      ]
    });
  };

  return (
    <button
      type="button"
      className="icon-btn titlebar-settings"
      title="Settings"
      aria-label="Settings"
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        void openMenu(r.right - 220, r.bottom + 4);
      }}
    >
      <SettingsIcon size={16} />
    </button>
  );
}

export function Titlebar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const tabOrder = useApp((s) => s.tabOrder);
  const gitInit = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);

  // Branch names on every tab: pull each project's status once; git:changed
  // (subscribed via init) keeps them live afterwards.
  useEffect(() => {
    gitInit();
    for (const p of projects) ensureStatus(p.path);
  }, [projects, gitInit, ensureStatus]);
  const sessions = useApp((s) => s.sessions);
  const overrides = useApp((s) => s.statusOverrides);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const openProject = useApp((s) => s.openProject);
  const setAttentionOpen = useApp((s) => s.setAttentionOpen);
  const attentionOpen = useApp((s) => s.attentionOpen);

  const tabs = useMemo<TabData[]>(() => {
    const ordered = sortProjects(projects, tabOrder);
    return ordered.map((project) => {
      const statuses: SessionStatus[] = [];
      let attentionCount = 0;
      for (const sess of sessions) {
        if (sess.projectPath !== project.path) continue;
        const status = effectiveStatusOf(sess, overrides);
        statuses.push(status);
        if (status === 'needs_input') attentionCount++;
      }
      return { project, dot: rollupDot(statuses), attentionCount };
    });
  }, [projects, tabOrder, sessions, overrides]);

  const attentionTotal = useMemo(
    () =>
      sessions.filter((x) => effectiveStatusOf(x, overrides) === 'needs_input')
        .length,
    [sessions, overrides]
  );

  return (
    <header className="titlebar" data-slot="project-tabs">
      <nav className="titlebar-tabs" aria-label="Projects">
        {tabs.map((t) => (
          <ProjectTab
            key={t.project.id}
            data={t}
            selected={t.project.id === activeProjectId}
          />
        ))}
        <button
          type="button"
          className="ptab-add"
          title="Open project… (⌘O)"
          aria-label="Open project"
          onClick={() => void openProject()}
        >
          <PlusIcon size={16} />
        </button>
      </nav>
      <div className="titlebar-spacer" />
      <button
        type="button"
        className={`bell${attentionTotal > 0 ? ' has-attention' : ''}`}
        title="Needs your input (⌘J)"
        aria-label={
          attentionTotal > 0
            ? `${attentionTotal} ${attentionTotal === 1 ? 'session needs' : 'sessions need'} input`
            : 'Nothing needs you'
        }
        onClick={() => setAttentionOpen(!attentionOpen)}
      >
        <BellIcon size={16} />
        {attentionTotal > 0 ? (
          <span className="badge-attention num">{attentionTotal}</span>
        ) : null}
      </button>
      <SettingsButton />
    </header>
  );
}
