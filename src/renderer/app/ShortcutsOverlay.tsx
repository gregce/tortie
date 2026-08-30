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
 *
 * Phase 86 made it searchable. The list passed 70 rows, and three balanced
 * columns of unlabelled rows is a map you read only by reading all of it. It
 * now opens with the cursor in a search field, narrows through the SAME
 * `filterForReading` the Settings map uses, and Up and Down move a highlight
 * over the visible rows.
 *
 * Enter does nothing here, and the footer does not mention it. Quick Open is
 * where you run things. A cheat sheet that also executes would be a second
 * palette with different contents and different rules, and advertising a key
 * that does nothing is worse than a quiet key.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  agentKeymapEntries,
  filterForReading,
  keymapSections
} from '@shared/keymap';
import type { AssignableAgent, KeymapEntry } from '@shared/keymap';
import type { LaunchableAgentId } from '@shared/types';
import { FilterField } from '../controls';
import { Keycaps } from '../keys';
import { useSettingsStore } from '../settings/settings-store';
import { useApp } from '../state/store';
import { trapTabKey } from './focus-trap';
import './shortcuts-overlay.css';

/**
 * Escape's FIRST press belongs to the search field while it holds text.
 *
 * The overlay cannot decide that on its own. App.tsx's Escape ladder is a
 * capture-phase listener on `window`, so it runs before any handler inside
 * this component and calls `stopPropagation`, which is why the dialog's own
 * Escape branch below never sees the key while the app shell is mounted. The
 * ladder is also the right place for the decision: it is the one list that
 * says which layer owns Escape.
 *
 * So the ladder asks this function first. It answers true when it emptied a
 * non-empty search field, which is the press the overlay consumed, and false
 * when there was nothing to clear, which is the press that closes the sheet.
 * The overlay registers the closure while it is open and drops it on close,
 * so the answer is false whenever no overlay is up.
 */
let clearSearchField: (() => boolean) | null = null;

export function shortcutSearchTookEscape(): boolean {
  return clearSearchField?.() ?? false;
}

/** Every entry in a set of sections, flattened in display order. */
function flatten(
  sections: readonly { readonly entries: readonly KeymapEntry[] }[]
): readonly KeymapEntry[] {
  return sections.flatMap((s) => s.entries);
}

export function ShortcutsOverlay(): React.JSX.Element | null {
  const open = useApp((s) => s.shortcutsOpen);
  const setOpen = useApp((s) => s.setShortcutsOpen);
  const hotkeys = useSettingsStore((s) => s.settings.hotkeys);
  const scan = useSettingsStore((s) => s.scan);
  const ensureScan = useSettingsStore((s) => s.ensureScan);
  const modalRef = useRef<HTMLDivElement | null>(null);
  // Phase 164. The agent chord rows draw from the scan, so opening this sheet
  // is a demand for it. The sheet is mounted for the life of the window, so
  // the mount is not.
  useEffect(() => {
    if (open) ensureScan();
  }, [open, ensureScan]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

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

  const visible = useMemo(
    () => filterForReading(sections, query),
    [sections, query]
  );

  const total = useMemo(() => flatten(sections).length, [sections]);
  const shown = useMemo(() => flatten(visible).length, [visible]);

  // The highlight starts on the first row every time the list changes shape,
  // so a query that narrows to one row already reads as answered.
  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  // The search field takes focus on open, so the overlay is typed into rather
  // than scrolled. Focusing the input also engages the Tab trap, which is
  // what keeps the shell behind the scrim unreachable.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const input =
        modalRef.current?.querySelector<HTMLInputElement>('input') ?? null;
      if (input !== null) input.focus();
      else modalRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keep the highlighted row in view without moving the page under the eye.
  // Nearest, never smooth: this fires on every arrow press.
  useEffect(() => {
    if (!open) return;
    const row = bodyRef.current?.querySelector('[aria-current="true"]');
    if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
  }, [cursor, open, shown]);

  // Hand the Escape ladder the closure it asks (see shortcutSearchTookEscape).
  // Re-registered on every keystroke, which is the cheapest way to keep the
  // closure reading the query that is on screen right now.
  useEffect(() => {
    if (!open) return;
    clearSearchField = () => {
      if (query === '') return false;
      setQuery('');
      return true;
    };
    return () => {
      clearSearchField = null;
    };
  }, [open, query]);

  // The query is cleared when the overlay closes, so reopening it is a fresh
  // sheet rather than yesterday's search.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const move = (delta: number): void => {
    if (shown === 0) return;
    setCursor((prev) => (prev + delta + shown) % shown);
  };

  let flatIndex = -1;

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
          if (e.key === 'ArrowDown') {
            // Without this the caret walks the search field instead.
            e.preventDefault();
            move(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(-1);
            return;
          }
          // Kept as the second line of defence. In the running app the
          // Escape ladder in App.tsx consumes the key first (see
          // shortcutSearchTookEscape above), so this branch is what closes
          // the sheet anywhere that ladder is not mounted.
          if (e.key === 'Escape') {
            if (query !== '') {
              e.stopPropagation();
              setQuery('');
              return;
            }
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <div className="shortcut-head">
          <h2 className="modal-title">Keyboard shortcuts</h2>
          <span className="shortcut-count" aria-live="polite">
            {query.trim() === ''
              ? `${total} shortcuts`
              : `${shown} of ${total} shortcuts`}
          </span>
        </div>

        <FilterField
          className="shortcut-search"
          value={query}
          onChange={setQuery}
          placeholder="Search shortcuts"
        />

        <div className="shortcut-groups" ref={bodyRef}>
          {shown === 0 ? (
            <p className="shortcut-empty">
              Nothing matches “{query}”. Try the word you would use for the
              action, e.g. “scroll”.
            </p>
          ) : null}
          {visible.map((section) => (
            <section key={section.group.id} className="shortcut-group">
              <h3 className="shortcut-group-title">{section.group.title}</h3>
              {section.entries.map((entry) => {
                // The highlight walks a FLAT index, so Down at the last row of
                // one group lands on the first row of the next.
                flatIndex += 1;
                const current = flatIndex === cursor;
                return (
                  <div
                    key={entry.id}
                    className="shortcut-row"
                    {...(current ? { 'aria-current': 'true' as const } : {})}
                  >
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
                );
              })}
            </section>
          ))}
        </div>

        <p className="shortcut-foot">
          Up and Down move the highlight. Escape clears the search, and closes
          this list when the search is empty.
        </p>
      </div>
    </div>
  );
}
