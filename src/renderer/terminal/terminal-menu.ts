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
 *   Scrollback  4,210 of 25,000 lines · about 1.5 MB   (informational)
 *   Clear                   ⌘K
 *
 * THE SCROLLBACK LINE IS THE WHOLE PER-SESSION DIAGNOSTIC (Phase 13.7). It is
 * not a badge, a tooltip or a hover — docs/ZEN-OF-TORTIE.md refuses a number
 * that rises on its own, and a table of every session ranked by memory is "a
 * supervisor's console", refused by name. So the figure exists only for the
 * one session the user explicitly right-clicked, only while that menu is
 * open, and it sits directly above the remediation it motivates. It is read
 * on demand — one `display-message` over the control client, ~1 ms — and if
 * that read fails or is slow the item is simply absent, because no number is
 * better than a stale one.
 *
 * The `ui:popupMenu` bridge renders a FLAT list — `PopupMenuItem` has no
 * submenu field — so the line-count presets ship as sibling items, exactly as
 * split-menu.ts ships its four edges.
 */

import type { Session } from '@shared/types';
import type { GmuxScrollbackExtras } from '@shared/ipc';
import type { SessionScrollbackFacts } from '@shared/scrollback';
import { formatScrollbackSummary } from '@shared/scrollback';
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
import type { TerminalSelectionSnapshot } from './capture';

/**
 * Create a session beside this one and put the two side by side — VS Code's
 * Split Terminal, inheriting the agent you split from (its "profile").
 */
async function splitSession(session: Session): Promise<void> {
  const app = useApp.getState();
  const projectPath = app.activeProject()?.path ?? null;
  if (projectPath === null) return;
  // Identify the new session by difference, not by "whatever is active now":
  // a failed create leaves the old session active and would split the pane
  // with itself.
  const before = new Set(app.sessions.map((s) => s.id));
  await app.quickCreate(session.agent);
  const created = useApp.getState().sessions.find((s) => !before.has(s.id));
  if (created === undefined) return;
  useLayout.getState().splitWith(projectPath, session.id, 'right', created.id);
}

export interface TerminalMenuOptions {
  /** Whether this session can still be split (false for ended sessions). */
  splittable?: boolean;
  /**
   * What this session is holding, if it could be read in time (Phase 13.7).
   * Absent → the informational row is omitted entirely.
   */
  scrollback?: SessionScrollbackFacts | null;
  /**
   * What was selected when the user right-clicked (Phase 40). Present and
   * null means the caller looked and found nothing selected; absent means the
   * caller did not look, and the live terminal is read instead. Copy, Copy as
   * HTML and Capture Selection all act on this rather than on whatever the
   * terminal reports when the item is finally picked.
   */
  selection?: TerminalSelectionSnapshot | null;
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
  // The snapshot is the answer when the caller took one. Reading the live
  // model here instead is what made the enabled state and the action disagree
  // (Phase 40): xterm's own contextmenu handler had already replaced the
  // selection by the time this ran.
  const snapshot = options.selection ?? null;
  const selected =
    options.selection !== undefined
      ? snapshot !== null
      : live && hasSelection(session.id);
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
      run: () => void copySelection(session.id, snapshot)
    },
    {
      label: 'Copy as HTML',
      disabled: !selected || !canCapture,
      run: () => void copySelectionAsHtml(session.id, snapshot)
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
      run: () => void captureSelection(session, snapshot)
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

  items.push('sep');
  const facts = options.scrollback;
  if (facts != null && facts.limit > 0) {
    items.push({
      // Disabled because it is a fact, not a verb. It reads as the caption of
      // the Clear below it, which is exactly what it is.
      label: formatScrollbackSummary(facts),
      disabled: true,
      run: () => undefined
    });
  }
  items.push({
    label: 'Clear',
    hint: keyDisplay('terminal.clear'),
    disabled: !live,
    run: () => void clearSession(session.id, session.tmuxName)
  });

  return items;
}

/** The scrollback bridge, or null on a preload that predates it. */
function scrollbackBridge():
  | NonNullable<GmuxScrollbackExtras['scrollback']>
  | null {
  return (
    (window.gmux as (Window['gmux'] & GmuxScrollbackExtras) | undefined)
      ?.scrollback ?? null
  );
}

/**
 * A menu must not wait on IPC. 150 ms is far beyond the ~1 ms this read costs
 * over the control client, and a session whose server is wedged loses the
 * information row rather than the menu.
 */
const SCROLLBACK_READ_BUDGET_MS = 150;

async function readScrollbackForMenu(
  sessionId: string
): Promise<SessionScrollbackFacts | null> {
  const api = scrollbackBridge();
  if (api === null) return null;
  return Promise.race([
    api.session(sessionId).catch(() => null),
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SCROLLBACK_READ_BUDGET_MS)
    )
  ]);
}

/**
 * Open the session menu at a pointer position.
 *
 * `options` is passed through unchanged, so a selection snapshot taken in the
 * pane's handler survives the scrollback await below and is still the answer
 * when the items are built.
 */
export function showTerminalMenu(
  session: Session,
  x: number,
  y: number,
  options?: TerminalMenuOptions
): void {
  void readScrollbackForMenu(session.id).then((scrollback) => {
    useApp.getState().setMenu({
      x,
      y,
      items: terminalMenuItems(session, { ...options, scrollback })
    });
  });
}

/** False once this session's surface is already holding MAX_LEAVES splits. */
export function canSplit(session: Session): boolean {
  const app = useApp.getState();
  const projectPath = app.activeProject()?.path ?? null;
  if (projectPath === null) return false;
  const sessionIds = app.projectSessions().map((s) => s.id);
  const surfaces = deriveSurfaces(
    useLayout.getState().layouts[projectPath],
    sessionIds
  );
  const surface = surfaceOf(surfaces, session.id);
  return surface === null || surface.leafIds.length < MAX_LEAVES;
}
