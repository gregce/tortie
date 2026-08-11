/**
 * The right-click menu inside a session (Phase 12 item 1), matching VS Code's
 * terminal menu with gmux's own nouns — sessions, not terminals — plus the
 * capture items from item 2.
 *
 *   New Session…            ⌘T
 *   Split Session           ⌘\
 *   ──────────
 *   Copy                    ⌘C     (needs a selection)
 *   Copy as HTML                   (needs a selection)
 *   Paste                   ⌘V
 *   Select All              ⌘A
 *   ──────────
 *   Capture Screen                 → clipboard, with Save… on the toast
 *   Capture Selection              (needs a selection)
 *   Capture Last 250 Lines         ┐ always offered — the pane's history is
 *   Capture Last 1000 Lines        ┘ in the tmux server, not in this client
 *   ──────────
 *   Clear                   ⌘K
 *
 * The `ui:popupMenu` bridge renders a FLAT list — `PopupMenuItem` has no
 * submenu field — so the line-count presets ship as sibling items, exactly as
 * split-menu.ts ships its four edges.
 */

import type { Session } from '@shared/types';
import { acceleratorToDisplay, keyDisplay } from '@shared/keymap';
import type { MenuItemSpec } from '../state/store';
import { useApp } from '../state/store';
import { deriveSurfaces, surfaceOf, useLayout } from '../state/layout';
import { MAX_LEAVES } from '../state/split-tree';
import {
  CAPTURE_PRESETS,
  captureBridge,
  captureHistory,
  captureSelection,
  captureVisible,
  clearSession,
  copySelection,
  copySelectionAsHtml,
  hasLiveTerminal,
  hasSelection,
  pasteIntoSession,
  selectAll
} from './capture';

/**
 * Create a session beside this one and put the two side by side — VS Code's
 * Split Terminal, inheriting the agent you split from (its "profile").
 */
async function splitSession(session: Session): Promise<void> {
  const app = useApp.getState();
  const projectId = app.activeProjectId;
  if (projectId === null) return;
  // Identify the new session by difference, not by "whatever is active now":
  // a failed create leaves the old session active and would split the pane
  // with itself.
  const before = new Set(app.sessions.map((s) => s.id));
  await app.quickCreate(session.agent);
  const created = useApp.getState().sessions.find((s) => !before.has(s.id));
  if (created === undefined) return;
  useLayout.getState().splitWith(projectId, session.id, 'right', created.id);
}

export interface TerminalMenuOptions {
  /** Whether this session can still be split (false for ended sessions). */
  splittable?: boolean;
}

/** Items for the session context menu. Pure — the caller positions the menu. */
export function terminalMenuItems(
  session: Session,
  options: TerminalMenuOptions = {}
): (MenuItemSpec | 'sep')[] {
  // A saved or ended session has no mounted terminal: there is nothing to
  // copy, capture or clear, so those items read as unavailable rather than
  // doing nothing when picked.
  const live = hasLiveTerminal(session.id);
  const selected = live && hasSelection(session.id);
  const canCapture = live && captureBridge() !== null;

  const items: (MenuItemSpec | 'sep')[] = [
    {
      label: 'New Session…',
      hint: keyDisplay('session.new'),
      run: () => useApp.getState().setCreateOpen(true)
    },
    {
      label: 'Split Session',
      disabled: options.splittable === false,
      run: () => void splitSession(session)
    },
    'sep',
    {
      label: 'Copy',
      hint: keyDisplay('terminal.copyOrInterrupt'),
      disabled: !selected,
      run: () => void copySelection(session.id)
    },
    {
      label: 'Copy as HTML',
      disabled: !selected || !canCapture,
      run: () => void copySelectionAsHtml(session.id)
    },
    {
      label: 'Paste',
      hint: acceleratorToDisplay('Cmd+V'),
      disabled: !canCapture,
      run: () => void pasteIntoSession()
    },
    {
      label: 'Select All',
      hint: keyDisplay('terminal.selectAll'),
      disabled: !live,
      run: () => selectAll(session.id)
    }
  ];

  if (canCapture) {
    items.push('sep', {
      label: 'Capture Screen',
      run: () => void captureVisible(session)
    });
    items.push({
      label: 'Capture Selection',
      disabled: !selected,
      run: () => void captureSelection(session)
    });
    for (const lines of CAPTURE_PRESETS) {
      items.push({
        // Never disabled: the history these read is the tmux server's, which
        // exists whatever this attach client's own buffer is doing. The old
        // `disabled: isAlternateScreen(…)` was always true, because `tmux
        // attach` puts the CLIENT in the alternate buffer on connect.
        label: `Capture Last ${lines.toLocaleString()} Lines`,
        run: () => void captureHistory(session, lines)
      });
    }
  }

  items.push('sep', {
    label: 'Clear',
    hint: keyDisplay('terminal.clear'),
    disabled: !live,
    run: () => void clearSession(session.id, session.tmuxName)
  });

  return items;
}

/** Open the session menu at a pointer position. */
export function showTerminalMenu(
  session: Session,
  x: number,
  y: number,
  options?: TerminalMenuOptions
): void {
  useApp
    .getState()
    .setMenu({ x, y, items: terminalMenuItems(session, options) });
}

/** False once this session's surface is already holding MAX_LEAVES splits. */
export function canSplit(session: Session): boolean {
  const app = useApp.getState();
  const projectId = app.activeProjectId;
  if (projectId === null) return false;
  const sessionIds = app.projectSessions().map((s) => s.id);
  const surfaces = deriveSurfaces(
    useLayout.getState().layouts[projectId],
    sessionIds
  );
  const surface = surfaceOf(surfaces, session.id);
  return surface === null || surface.leafIds.length < MAX_LEAVES;
}
