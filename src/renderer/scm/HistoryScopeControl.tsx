/**
 * The HISTORY header's scope accessory — Phase 14.5, design research
 * docs/research/24-git-graph-d3-visual-design.md §5.5.
 *
 * A hover-revealed 18px button in the 28px section header, opening a NATIVE
 * menu (UI rule: never a DOM-drawn one) with the three scopes as a radio
 * group. It belongs to the History section rather than the view band because
 * it changes what this list shows, not what the repo does.
 *
 * Off the default it stays lit — see the `pinned` class and the header's
 * scope tag in scm.css. A list quietly showing commits from branches you are
 * not on, with nothing saying why, is exactly the kind of small lie this
 * phase exists to remove.
 *
 * The vocabulary and the persistence live in history-scope.ts.
 */

import React from 'react';
import type { GitLogScope } from '@shared/types';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { Codicon } from '../icons';
import {
  DEFAULT_HISTORY_SCOPE,
  HISTORY_SCOPES,
  scopeHint,
  scopeLabel
} from './history-scope';

export function HistoryScopeControl({
  scope,
  onPick,
  disabled = false
}: {
  scope: GitLogScope;
  onPick: (next: GitLogScope) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);

  const openMenu = (e: React.MouseEvent): void => {
    // The header owns a drag-to-reorder gesture; this click is the button's.
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const items: (MenuItemSpec | 'sep')[] = HISTORY_SCOPES.map((s) => ({
      // `ui:popupMenu` has no native check state — the ✓ prefix (with two
      // spaces aligning the rest) is the convention the branch menu set.
      label: `${s === scope ? '✓ ' : '  '}${scopeLabel(s)}`,
      sublabel: scopeHint(s),
      run: (): void => {
        if (s !== scope) onPick(s);
      }
    }));
    setMenu({ x: rect.right - 8, y: rect.bottom + 2, items });
  };

  const pinned = scope !== DEFAULT_HISTORY_SCOPE;
  return (
    <button
      type="button"
      className={`icon-btn scm-action scm-branch-accessory scm-scope-btn${pinned ? ' pinned' : ''}`}
      aria-label={`Graph scope: ${scopeLabel(scope)}`}
      aria-haspopup="menu"
      title={`Graph scope — ${scopeLabel(scope)}`}
      disabled={disabled}
      onClick={openMenu}
    >
      <Codicon name="filter" size={14} />
    </button>
  );
}
