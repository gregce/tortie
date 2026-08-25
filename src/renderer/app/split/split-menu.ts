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
import { resumeReadiness } from '../../state/resume';
import { useLayout } from '../../state/layout';
import type { Surface } from '../../state/layout';
import { MAX_LEAVES } from '../../state/split-tree';
import { menuGlyph } from '../../icons';
import type { MenuCodicon } from '../../icons';
import type { SplitEdge } from '../../state/split-tree';

/**
 * PHASE 153 gave each edge the codicon that draws the split it makes: a pair
 * side by side for left and right, a pair stacked for top and bottom. The
 * glyph is the same family the group tab and the dock row already wear for a
 * split, so the four rows read as one control rather than four verbs.
 */
const EDGES: { edge: SplitEdge; label: string; icon: MenuCodicon }[] = [
  { edge: 'left', label: 'Open in split left', icon: 'split-horizontal' },
  { edge: 'right', label: 'Open in split right', icon: 'split-horizontal' },
  { edge: 'top', label: 'Open in split top', icon: 'split-vertical' },
  { edge: 'bottom', label: 'Open in split bottom', icon: 'split-vertical' }
];

/**
 * "Open in split …" for a SINGLE-session tab/row: splits the active
 * surface's focused leaf on the picked edge. Disabled at MAX_LEAVES or
 * when the item is the active surface's only leaf (S4A).
 */
export function openInSplitItems(
  projectPath: string,
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
    ...EDGES.map(({ edge, label, icon }) => ({
      label,
      ...menuGlyph(icon),
      disabled,
      run: () =>
        useLayout
          .getState()
          .splitWith(projectPath, activeLeafId, edge, session.id)
    }))
  ];
}

/** Group tab/row context menu (S4A "Group tab / row"). */
export function groupMenuItems(
  projectPath: string,
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
      // A CHOSEN mark, the same one every other Rename row wears: it changes a
      // name in place, which is what this pencil is.
      ...menuGlyph('edit'),
      hint: 'F2',
      // Renames the focused leaf's session — the input opens in its
      // split header (shared inline-rename spec).
      run: () => useApp.getState().setRenaming(focusedLeafId)
    },
    {
      label: 'Break up into tabs',
      // A CHOSEN mark. The destination, not the source, being several
      // separate tabs where one split surface stood. `Move to its own tab` on
      // a leaf wears the same mark, because it is the same journey for one
      // session, and a split glyph would name the thing being left behind.
      ...menuGlyph('multiple-windows'),
      run: () => useLayout.getState().breakUp(projectPath, surface.id)
    },
    'sep',
    {
      label: 'End all sessions…',
      // The same glyph `End session…` wears, which is the × every session
      // surface draws for it.
      ...menuGlyph('close'),
      destructive: true,
      disabled: live.length === 0,
      run: () => {
        const names = live.map((x) => `'${x.name}'`).join(', ');
        // Phase 26.3 — same rule as the single-session confirm in
        // store.ts endSession: killSession captures a snapshot capsule and
        // keeps each manifest row before it kills anything, so "scrollback
        // will be discarded. This cannot be undone" stopped being true.
        // The conversations sentence is offered only when EVERY member has
        // a resumable conversation; a mixed group gets the scrollback-only
        // variant so the promise holds for each session in it.
        const allResumable = live.every(
          (x) => resumeReadiness(x) === 'conversation'
        );
        // PHASE 84, item 2. When ANY of the named sessions runs on another
        // machine, the whole body changes, because a promise made to a group
        // has to hold for every session in it. The scrollback sentence is
        // dropped for the group, and the last sentence names the one thing a
        // session on another machine does not bring back.
        const anyOnAMachine = live.some((x) => x.machine !== undefined);
        useApp.getState().setConfirm({
          title: `End ${live.length} sessions?`,
          body: anyOnAMachine
            ? `This stops what is running in ${names}. Tortie saves a copy of what each one printed first, so you can read those copies here afterwards. A session on another machine does not bring its conversation back.`
            : allResumable
              ? `This stops what is running in ${names}. The scrollback and the conversations are saved first, so you can restore each session later.`
              : `This stops what is running in ${names}. The scrollback is saved first, so you can restore each session later.`,
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
