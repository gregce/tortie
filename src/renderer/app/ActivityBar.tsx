/**
 * S3 — Activity bar (round 1): a 48px VS Code-style icon rail at the far
 * left, full height below the titlebar. Three views — Explorer, Search
 * (Phase 14) and Source Control — the sidebar hosts one at a time; the
 * Settings gear is pinned at the bottom. Click the active view's icon to
 * collapse the sidebar (= ⌘B), VS Code behavior. The rail itself never hides.
 *
 * Chords are never spelled here: every label reads its own chord out of
 * KEYMAP via keyDisplay(), which is what stops the rail's tooltips drifting
 * from the menu and the ⌘/ overlay.
 */

import React, { useMemo } from 'react';
import type { GmuxSettingsExtras } from '@shared/ipc';
import { keyDisplay } from '@shared/keymap';
import { dirtyCount, useGit } from '../state/git';
import { loginItemExtras, useApp } from '../state/store';
import type { SidebarViewId } from '../state/store';
import { useSearch } from '../search';
import { Codicon } from '../icons';

function ViewItem({
  view,
  icon,
  label,
  shortcut,
  badge,
  badgeNoun = 'changed'
}: {
  view: SidebarViewId;
  icon: string;
  label: string;
  shortcut: string;
  badge?: number;
  /** Word before "file(s)" in the accessible label ("3 changed files"). */
  badgeNoun?: string;
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
          ? `, ${badge} ${badgeNoun} ${badge === 1 ? 'file' : 'files'}`
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
const settingsTitle = `Settings (${keyDisplay('app.settings')})`;

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
        title={settingsTitle}
        aria-label={settingsTitle}
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
          label: `${on ? '✓ ' : ''}Launch Tortie at login`,
          run: () => {
            void (async () => {
              try {
                const next = await setLoginItem(!on);
                // Render the OS READBACK, not the request.
                if (next.openAtLogin === !on) {
                  toast(
                    'success',
                    next.openAtLogin
                      ? 'Tortie will launch at login and offer to restore your sessions.'
                      : 'Tortie will no longer launch at login.'
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
      title={settingsTitle}
      aria-label={settingsTitle}
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

  // Files with at least one hit in the live result set (Phase 14).
  const resultFiles = useSearch((s) =>
    s.repoPath !== null && s.repoPath === project?.path ? s.totalFiles : 0
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
        shortcut={keyDisplay('view.explorer')}
      />
      {/* Phase 14. The badge is the FILE count of a live result set, in accent
          — never amber, which this app reserves entirely for "an agent needs
          you" and would otherwise be competing with. */}
      <ViewItem
        view="search"
        icon="search"
        label="Search"
        shortcut={keyDisplay('view.search')}
        badge={resultFiles}
        badgeNoun="matching"
      />
      <ViewItem
        view="scm"
        icon="source-control"
        label="Source control"
        shortcut={keyDisplay('view.scm')}
        badge={dirty}
      />
      {/* Phase 22 — Context, fourth, after source-control and before the
          spacer.

          `layers` because the subject of the view IS stacked scopes resolving
          to one winner. `plug` was the runner-up and names only one of the
          five categories; `extensions` was refused outright, because
          "extensions" is on the scope guardrail's refused list and the icon
          would promise a marketplace.

          NO BADGE, EVER. Source Control badges a dirty count and Search badges
          a live match count, and both are actionable and transient. A context
          count is inventory — "43" would sit there forever, which is exactly
          the number that rises on its own that the Zen refuses. The one number
          that could earn a badge is drift, and research 29 §8.4 refuses that
          too: the drift information exists only where it is asked for. */}
      <ViewItem
        view="context"
        icon="layers"
        label="Context"
        shortcut={keyDisplay('view.context')}
      />
      <div className="ab-spacer" />
      <SettingsItem />
    </nav>
  );
}
