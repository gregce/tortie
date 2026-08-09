/**
 * S8 — Shortcuts overlay (⌘/). Content = DESIGN.md §4 table, grouped.
 * One chip per chord ("⌘T"), mono 11 on --bg-raised.
 */

import React, { useEffect, useRef } from 'react';
import { useApp } from '../state/store';
import { trapTabKey } from './focus-trap';

interface Row {
  keys: string[];
  action: string;
}

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Sessions',
    rows: [
      { keys: ['⌘T'], action: 'New session in current project' },
      { keys: ['⌥⌘↓', '⌥⌘↑'], action: 'Next / previous session' },
      { keys: ['F2'], action: 'Rename session' },
      { keys: ['↑↓', '↩'], action: 'Navigate list, focus terminal' }
    ]
  },
  {
    title: 'Projects',
    rows: [
      { keys: ['⌘O'], action: 'Open project…' },
      { keys: ['⌘1', '…', '⌘9'], action: 'Switch to project tab' },
      { keys: ['⌃Tab', '⌃⇧Tab'], action: 'Next / previous project tab' }
    ]
  },
  {
    title: 'Git',
    rows: [
      { keys: ['⌘↩'], action: 'Commit staged' },
      { keys: ['Space', 'S'], action: 'Stage / unstage selected file' },
      { keys: ['⌫'], action: 'Discard selected file…' }
    ]
  },
  {
    title: 'Editor',
    rows: [
      { keys: ['⌘S'], action: 'Save file' },
      { keys: ['⌘E'], action: 'Toggle editor panel' },
      { keys: ['⌘⇧]', '⌘⇧['], action: 'Next / previous editor tab' },
      { keys: ['⌘W'], action: 'Close editor tab' },
      { keys: ['⌘F'], action: 'Find in editor' }
    ]
  },
  {
    title: 'App',
    rows: [
      { keys: ['⌘J'], action: 'Show sessions that need input' },
      { keys: ['⌘B'], action: 'Toggle sidebar' },
      { keys: ['⌘/'], action: 'Keyboard shortcuts' },
      { keys: ['⌘,'], action: 'Settings' },
      { keys: ['Esc'], action: 'Close topmost layer' },
      { keys: ['⌘Q'], action: 'Quit — sessions keep running' }
    ]
  }
];

export function ShortcutsOverlay(): React.JSX.Element | null {
  const open = useApp((s) => s.shortcutsOpen);
  const setOpen = useApp((s) => s.setShortcutsOpen);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus the (otherwise focusable-free) dialog so the Tab trap engages and
  // aria-modal is honest — the shell behind the scrim stays unreachable.
  useEffect(() => {
    if (open) requestAnimationFrame(() => modalRef.current?.focus());
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={modalRef}
        className="modal modal-shortcuts"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        onKeyDown={(e) => {
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <h2 className="modal-title">Keyboard shortcuts</h2>
        <div className="shortcut-groups">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="shortcut-group-title">{group.title}</h3>
              {group.rows.map((row) => (
                <div key={row.action} className="shortcut-row">
                  <span className="shortcut-action">{row.action}</span>
                  {row.keys.map((k) =>
                    k === '…' ? (
                      <span key={k} style={{ color: 'var(--text-muted)' }}>
                        …
                      </span>
                    ) : (
                      <span key={k} className="key">
                        {k}
                      </span>
                    )
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
