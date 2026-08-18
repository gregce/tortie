/**
 * Settings → Keyboard (Phase 12.12 item 5) — the full shortcut map, and the
 * explainer that goes with it.
 *
 * IT HOLDS NO LIST. Every row, group, glyph and sentence comes from
 * src/shared/keymap.ts; the per-agent rows come from `agentKeymapEntries`
 * over the detected agents. That is the whole point of the phase: the ⌘/
 * overlay, the native menus and this page render the same data, so a shortcut
 * added to the keymap appears in all three the same commit. If you ever need
 * to type a chord into this file, the keymap is missing a row.
 *
 * It is a REFERENCE PEOPLE READ, not a control panel, so it is built as a
 * document rather than as the card-and-hairline rows the other sections use:
 * a group heading with a rule, then rows of action · plain-language sentence
 * with the keycaps right-aligned on a stable rail. Tight inside a row (2px),
 * loose between rows (24px) — the eye gets the grouping from rhythm instead
 * of from 55 hairlines.
 *
 * Three things earn their place beyond a table:
 *  - the filter, because 55 rows is past the length anyone scans;
 *  - the SCOPE, hung on the heading when a whole group shares one and on the
 *    row otherwise, so ⌃⇥ appearing twice reads as intent rather than a bug;
 *  - the conflict note under an assignable row whose chord something else
 *    already owns (see ./keyboard-conflicts) — a shortcut that silently does
 *    nothing is the one thing a keyboard reference must not be quiet about.
 */

import React, { useMemo, useState } from 'react';
import {
  SCOPE_LABELS,
  acceleratorToDisplay,
  agentKeymapEntries,
  agentKeymapId,
  filterForReading,
  keymapSections
} from '@shared/keymap';
import type {
  AssignableAgent,
  KeymapEntry,
  KeymapSection
} from '@shared/keymap';
import type { LaunchableAgentId } from '@shared/types';
import { FilterField } from '../controls';
import { Codicon } from '../icons';
import { Keycaps } from '../keys';
import type { ChordContext } from './chords';
import type { AssignedAgentChord } from './keyboard-conflicts';
import { shortcutConflictNote } from './keyboard-conflicts';
import { Recorder } from './Recorder';
import { useSettingsStore } from './settings-store';

/**
 * Registry defaultHotkeyHint mnemonics (research 11 §2 — gmux proposals).
 * Only the LETTER lives here: the ⇧⌘ in front is spelled by
 * `acceleratorToDisplay`, so the hint cannot drift out of macOS glyph order
 * the way the hand-typed "e.g. ⌘⇧C" it replaces had.
 */
const HINT_LETTER: Readonly<Partial<Record<string, string>>> = {
  claude: 'C',
  cursor: 'U',
  codex: 'X',
  gemini: 'G',
  droid: 'D',
  deepseek: 'K',
  antigravity: 'A',
  muse: 'M',
  qwen: 'Q'
};

/**
 * The scope every row of a group shares, or null when they differ (or when
 * the shared scope is "Anywhere", which is the default and needs no saying).
 * Hung on the heading so five Git rows do not each repeat "In source control".
 */
function sharedScopeLabel(entries: readonly KeymapEntry[]): string | null {
  const first = entries[0];
  if (first === undefined || first.scope === 'app') return null;
  return entries.every((e) => e.scope === first.scope)
    ? SCOPE_LABELS[first.scope]
    : null;
}

/** "In the editor" → "in the editor", for use inside a heading. */
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function KeyboardSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const scan = useSettingsStore((s) => s.scan);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const launchable = useMemo(
    () => (scan?.agents ?? []).filter((a) => a.launchable),
    [scan]
  );

  /** Keymap row id → the agent behind it, for the recorder and its context. */
  const agentByRowId = useMemo(() => {
    const map = new Map<string, { id: string; displayName: string }>();
    for (const a of launchable) {
      map.set(agentKeymapId(a.id), { id: a.id, displayName: a.displayName });
    }
    return map;
  }, [launchable]);

  const displayNames = useMemo(
    () => Object.fromEntries(launchable.map((a) => [a.id, a.displayName])),
    [launchable]
  );

  /** Every recorded chord, for the "also set for New X session" case. */
  const assignedChords = useMemo<AssignedAgentChord[]>(() => {
    const out: AssignedAgentChord[] = [];
    for (const a of launchable) {
      const accel = settings.hotkeys[a.id as LaunchableAgentId];
      if (typeof accel === 'string' && accel !== '') {
        out.push({ agentId: a.id, displayName: a.displayName, accelerator: accel });
      }
    }
    return out;
  }, [launchable, settings.hotkeys]);

  // Unlike the ⌘/ overlay, UNASSIGNED agent rows appear here — an empty
  // recorder is the affordance that lets you assign one.
  const sections = useMemo<readonly KeymapSection[]>(() => {
    const agents: AssignableAgent[] = launchable.map((a) => {
      const accel = settings.hotkeys[a.id as LaunchableAgentId];
      return {
        id: a.id,
        displayName: a.displayName,
        ...(typeof accel === 'string' && accel !== ''
          ? { accelerator: accel }
          : {})
      };
    });
    return keymapSections(agentKeymapEntries(agents));
  }, [launchable, settings.hotkeys]);

  const visible = useMemo(
    () => filterForReading(sections, query),
    [sections, query]
  );

  const commit = (
    agentId: LaunchableAgentId,
    accel: string | undefined
  ): void => {
    const next = { ...settings.hotkeys };
    if (accel === undefined) delete next[agentId];
    else next[agentId] = accel;
    void update({ hotkeys: next });
  };

  const setError = (agentId: string, reason: string | null): void => {
    setErrors((prev) => {
      const next = { ...prev };
      if (reason === null) delete next[agentId];
      else next[agentId] = reason;
      return next;
    });
  };

  const renderKeys = (
    entry: KeymapEntry,
    agent: { id: string; displayName: string } | undefined
  ): React.JSX.Element => {
    if (agent !== undefined) {
      const agentId = agent.id as LaunchableAgentId;
      const context: ChordContext = {
        assigned: settings.hotkeys,
        displayNames,
        selfAgentId: agent.id
      };
      const hintLetter = HINT_LETTER[agent.id];
      return (
        <Recorder
          value={settings.hotkeys[agentId]}
          context={context}
          onCommit={(accel) => commit(agentId, accel)}
          onError={(reason) => setError(agent.id, reason)}
          {...(hintLetter !== undefined
            ? {
                hint: `e.g. ${acceleratorToDisplay(`Shift+Cmd+${hintLetter}`)}`
              }
            : {})}
        />
      );
    }
    // Deliberately unaccelerated (ending a session, closing a project). The
    // sentence beside it says where the verb lives; "menu" is the same token
    // the ⌘/ overlay uses, so the two surfaces read the same.
    if (entry.keys.length === 0) return <span className="key-range">menu</span>;
    return <Keycaps entry={entry} />;
  };

  /** The live recorder error, else the standing conflict, else nothing. */
  const noteFor = (
    agent: { id: string; displayName: string } | undefined
  ): string | null => {
    if (agent === undefined) return null;
    const live = errors[agent.id];
    if (live !== undefined) return live;
    const accel = settings.hotkeys[agent.id as LaunchableAgentId];
    if (typeof accel !== 'string' || accel === '') return null;
    return shortcutConflictNote(accel, agent.id, assignedChords);
  };

  return (
    <section className="kb" aria-label="Keyboard">
      <h1 className="set-title">Keyboard</h1>
      <p className="set-section-caption">
        Every shortcut Tortie knows, and what each one does. The per-agent
        session shortcuts are yours to record; the rest are built in.
      </p>

      <div className="kb-filter">
        <FilterField
          className="kb-filter-field"
          value={query}
          onChange={setQuery}
          placeholder="Filter shortcuts"
        />
      </div>

      {visible.length === 0 ? (
        <p className="kb-empty">
          Nothing matches “{query}”. Try the words you would use for the
          action — “scroll”, “project”, “diff”.
        </p>
      ) : null}

      {visible.map((section) => {
        const groupScope = sharedScopeLabel(section.entries);
        return (
          <div key={section.group.id} className="kb-group">
            <h2 className="kb-group-title">
              <span className="kb-group-name">{section.group.title}</span>
              {groupScope !== null ? (
                <span className="kb-group-scope">{lowerFirst(groupScope)}</span>
              ) : null}
            </h2>

            {section.entries.map((entry) => {
              const agent = agentByRowId.get(entry.id);
              const note = noteFor(agent);
              const rowScope =
                groupScope === null && entry.scope !== 'app'
                  ? SCOPE_LABELS[entry.scope]
                  : null;
              return (
                <div key={entry.id} className="kb-row">
                  <div className="kb-row-text">
                    <div className="kb-row-head">
                      <span className="kb-action">{entry.action}</span>
                      {rowScope !== null ? (
                        <span className="kb-scope">{rowScope}</span>
                      ) : null}
                    </div>
                    <p className="kb-explain">{entry.explain}</p>
                    {note !== null ? (
                      <p className="kb-conflict">
                        <Codicon name="warning" size={12} />
                        <span>{note}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="kb-keys">{renderKeys(entry, agent)}</div>
                </div>
              );
            })}

            {section.group.id === 'sessions' &&
            query === '' &&
            scan !== null &&
            launchable.length === 0 ? (
              <p className="kb-note">
                No agents were detected, so there are no session shortcuts to
                assign yet — re-scan from the Agents section.
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
