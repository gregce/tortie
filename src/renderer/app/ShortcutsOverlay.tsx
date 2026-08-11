/**
 * S8 — Shortcuts overlay (⌘/).
 *
 * It holds no list of its own. Every row comes from src/shared/keymap.ts, so
 * a shortcut added there appears here the same commit — the drift that lost
 * the ⇧↩ row in Phase 12.5 has nowhere left to happen. The user's own
 * per-agent hotkeys are folded in as Sessions rows, which is why a chord you
 * recorded in Settings shows up in the same place you look for ⌘T.
 *
 * This surface is the fast reminder: group, action, chips. The plain-language
 * explanation of each row (KeymapEntry.explain) belongs to the Settings map,
 * which has the room to be read rather than scanned.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { keymapSections, agentKeymapEntries } from '@shared/keymap';
import type { AssignableAgent } from '@shared/keymap';
import type { LaunchableAgentId } from '@shared/types';
import { Keycaps } from '../keys';
import { useSettingsStore } from '../settings/settings-store';
import { useApp } from '../state/store';
import { trapTabKey } from './focus-trap';

export function ShortcutsOverlay(): React.JSX.Element | null {
  const open = useApp((s) => s.shortcutsOpen);
  const setOpen = useApp((s) => s.setShortcutsOpen);
  const hotkeys = useSettingsStore((s) => s.settings.hotkeys);
  const scan = useSettingsStore((s) => s.scan);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Only ASSIGNED agent chords appear here — an unassigned row is a Settings
  // affordance, not a shortcut, and would be noise in a cheat sheet.
  const sections = useMemo(() => {
    const assigned: AssignableAgent[] = [];
    for (const agent of scan?.agents ?? []) {
      if (!agent.launchable) continue;
      const accel = hotkeys[agent.id as LaunchableAgentId];
      if (typeof accel !== 'string' || accel === '') continue;
      assigned.push({
        id: agent.id,
        displayName: agent.displayName,
        accelerator: accel
      });
    }
    return keymapSections(agentKeymapEntries(assigned));
  }, [hotkeys, scan]);

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
          {sections.map((section) => (
            <section key={section.group.id} className="shortcut-group">
              <h3 className="shortcut-group-title">{section.group.title}</h3>
              {section.entries.map((entry) => (
                <div key={entry.id} className="shortcut-row">
                  <span className="shortcut-action">{entry.action}</span>
                  {entry.keys.length === 0 ? (
                    // Deliberately unaccelerated (ending a session, closing a
                    // project). Saying "menu" is the answer to the question
                    // an empty row would otherwise raise.
                    <span className="key-range">menu</span>
                  ) : (
                    <Keycaps entry={entry} />
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
