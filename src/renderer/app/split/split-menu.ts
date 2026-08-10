/**
 * Split-related native-menu items (S4A non-drag paths): "Open in split …"
 * on single-session tabs/rows, and the group tab/row menu (Rename, Break
 * up into tabs, End all sessions…). Kept beside the drag engine so every
 * surface (strip, dock) serves identical menus.
 *
 * NOTE: the ui:popupMenu bridge renders flat item lists (no submenus), so
 * "Open in split ▸ Left/Right/Top/Bottom" ships as four labeled items.
 */

import type { Session } from '@shared/types';
import type { MenuItemSpec } from '../../state/store';
import { useApp } from '../../state/store';
import { useLayout } from '../../state/layout';
import type { Surface } from '../../state/layout';
import { MAX_LEAVES } from '../../state/split-tree';
import type { SplitEdge } from '../../state/split-tree';

const EDGES: { edge: SplitEdge; label: string }[] = [
  { edge: 'left', label: 'Open in split left' },
  { edge: 'right', label: 'Open in split right' },
  { edge: 'top', label: 'Open in split top' },
  { edge: 'bottom', label: 'Open in split bottom' }
];

/**
 * "Open in split …" for a SINGLE-session tab/row: splits the active
 * surface's focused leaf on the picked edge. Disabled at MAX_LEAVES or
 * when the item is the active surface's only leaf (S4A).
 */
export function openInSplitItems(
  projectId: string,
  session: Session,
  activeSurface: Surface | null,
  activeLeafId: string
): (MenuItemSpec | 'sep')[] {
  if (!activeSurface) return [];
  const disabled =
    activeSurface.leafIds.length >= MAX_LEAVES ||
    activeSurface.id === session.id ||
    activeLeafId === '';
  return [
    'sep',
    ...EDGES.map(({ edge, label }) => ({
      label,
      disabled,
      run: () =>
        useLayout
          .getState()
          .splitWith(projectId, activeLeafId, edge, session.id)
    }))
  ];
}

/** Group tab/row context menu (S4A "Group tab / row"). */
export function groupMenuItems(
  projectId: string,
  surface: Surface,
  members: Session[],
  focusedLeafId: string
): (MenuItemSpec | 'sep')[] {
  const live = members.filter(
    (x) => x.status !== 'exited' && x.status !== 'restorable'
  );
  return [
    {
      label: 'Rename',
      hint: 'F2',
      // Renames the focused leaf's session — the input opens in its
      // split header (shared inline-rename spec).
      run: () => useApp.getState().setRenaming(focusedLeafId)
    },
    {
      label: 'Break up into tabs',
      run: () => useLayout.getState().breakUp(projectId, surface.id)
    },
    'sep',
    {
      label: 'End all sessions…',
      destructive: true,
      disabled: live.length === 0,
      run: () => {
        const names = live.map((x) => `'${x.name}'`).join(', ');
        useApp.getState().setConfirm({
          title: `End ${live.length} sessions?`,
          body: `${names} will stop and their scrollback will be discarded. This cannot be undone.`,
          confirmLabel: 'End sessions',
          destructive: true,
          onConfirm: () => {
            // One confirm for the whole group (S4A) — the per-session
            // endSession() confirm would stack; kill through the bridge.
            for (const target of live) {
              void window.gmux?.sessions.kill(target.id).catch(() => {
                useApp
                  .getState()
                  .toast('error', `Could not end '${target.name}'`);
              });
            }
          }
        });
      }
    }
  ];
}

/** Group tooltip: every member with its status + the split count. */
export function groupTooltip(
  members: { name: string; label: string }[]
): string {
  const parts = members.map((m) => `${m.name} · ${m.label}`);
  return `${parts.join(' — ')} — ${members.length} splits`;
}
