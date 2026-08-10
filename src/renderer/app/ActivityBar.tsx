/**
 * S3 — Activity bar (round 1): a 48px VS Code-style icon rail at the far
 * left, full height below the titlebar. Two views — Explorer (⌘⇧E) and
 * Source Control (⌃⇧G) — the sidebar hosts one at a time; the Settings gear
 * is pinned at the bottom. Click the active view's icon to collapse the
 * sidebar (= ⌘B), VS Code behavior. The rail itself never hides.
 */

import React, { useMemo } from 'react';
import type { GmuxSettingsExtras } from '@shared/ipc';
import { dirtyCount, useGit } from '../state/git';
import { loginItemExtras, useApp } from '../state/store';
import type { SidebarViewId } from '../state/store';
import { Codicon } from '../icons';

function ViewItem({
  view,
  icon,
  label,
  shortcut,
  badge
}: {
  view: SidebarViewId;
  icon: string;
  label: string;
  shortcut: string;
  badge?: number;
}): React.JSX.Element {
  const sidebarVisible = useApp((s) => s.sidebarVisible);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const viewByProject = useApp((s) => s.sidebarViewByProject);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const showSidebarView = useApp((s) => s.showSidebarView);

  const currentView: SidebarViewId =
    (activeProjectId !== null ? viewByProject[activeProjectId] : undefined) ??
    'scm';
  const active = sidebarVisible && currentView === view;

  return (
    <button
      type="button"
      className={`ab-item${active ? ' active' : ''}`}
      title={`${label} (${shortcut})`}
      aria-label={`${label} (${shortcut})${
        badge !== undefined && badge > 0
          ? `, ${badge} changed ${badge === 1 ? 'file' : 'files'}`
          : ''
      }`}
      aria-pressed={active}
      onClick={() => {
        // Active view → collapse toggle (⌘B); otherwise switch/show.
        if (active) toggleSidebar();
        else showSidebarView(view);
      }}
    >
      <Codicon name={icon} size={24} />
      {badge !== undefined && badge > 0 ? (
        <span className="ab-badge num">{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </button>
  );
}

/**
 * Settings gear (S3 pins it at the rail's bottom). Phase 10 (S13): the gear
 * opens the dedicated Settings WINDOW (feature-detected openSettings bridge
 * method — the login-item toggle moved into Settings → General). Fallback
 * for older preloads: the original one-item login menu, so the gear never
 * goes dead.
 */
function SettingsItem(): React.JSX.Element | null {
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  const settingsExtras = (window.gmux ?? {}) as unknown as GmuxSettingsExtras;
  if (typeof settingsExtras.openSettings === 'function') {
    const openSettings = settingsExtras.openSettings.bind(settingsExtras);
    return (
      <button
        type="button"
        className="ab-item activitybar-settings"
        title="Settings (⌘,)"
        aria-label="Settings (⌘,)"
        onClick={() => void openSettings()}
      >
        <Codicon name="settings-gear" size={24} />
      </button>
    );
  }
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
      className="ab-item activitybar-settings"
      title="Settings (⌘,)"
      aria-label="Settings (⌘,)"
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        void openMenu(r.right + 4, r.top);
      }}
    >
      <Codicon name="settings-gear" size={24} />
    </button>
  );
}

export function ActivityBar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // Dirty-file count badge on the Source Control item — accent, never amber
  // (amber is attention-only, S3).
  const dirty = useGit((s) => {
    if (!project) return 0;
    const status = s.repos[project.path]?.status;
    return status?.isRepo === true ? dirtyCount(status) : 0;
  });

  return (
    <nav className="activitybar" aria-label="Views" data-slot="activity-bar">
      <ViewItem
        view="explorer"
        icon="files"
        label="Explorer"
        shortcut="⌘⇧E"
      />
      <ViewItem
        view="scm"
        icon="source-control"
        label="Source control"
        shortcut="⌃⇧G"
        badge={dirty}
      />
      <div className="ab-spacer" />
      <SettingsItem />
    </nav>
  );
}
