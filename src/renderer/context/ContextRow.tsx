/**
 * One row of the Context view `[h:24]` (§5.5).
 *
 *     [icon 16][name 12][summary 11 --text-muted, flex][marks][state]
 *
 * WHAT SURVIVES NARROWING is decided in `context.css`, not here: the row always
 * RENDERS its summary, its agent chip and its scope chip, and the container
 * query decides which of them have a box. Doing it that way is what keeps the
 * three responsive tiers a property of one stylesheet instead of three
 * component branches that can disagree with it.
 *
 * NEVER DROPPED AT ANY WIDTH: the name, the group the row sits in, and the
 * state marks. Those three are the feature (§6.6).
 */

import React, { useEffect, useRef } from 'react';
import { Codicon } from '../icons';
import { agentShortLabel } from '../state/agents';
import {
  CONTEXT_CATEGORY_ICON,
  CONTEXT_COPY,
  DRIFT_COPY,
  SCOPE_CHIP_ICON,
  SCOPE_CHIP_WORD,
  shadowHint
} from './groups';
import type { ContextEntry } from './model';
import type { ContextDriftEntry } from '@shared/context-snapshot';

/** Hover dwell before the glance opens (§5.5). */
const HOVER_MS = 600;

/**
 * The sentence a row whose pin no longer matches carries.
 *
 * It says what Tortie actually did and what it did NOT do. Tortie cannot stop
 * an agent loading a file that is sitting on disk, and a sentence implying it
 * had would be worse than no control at all. Removing it is the thing that
 * stops it, and that verb is on the same menu.
 */
export const PIN_CHANGED_NOTE =
  'This changed since you approved it. Tortie has switched it off in this list, ' +
  'and it is still on disk, so your agents still load it. Review it, or remove it.';

/** §5.5 — the state lane, at most two marks, in this order. */
function stateMarks(
  entry: ContextEntry,
  drift: ContextDriftEntry | undefined,
  pin: boolean
): { icon: string; cls: string; title: string }[] {
  const marks: { icon: string; cls: string; title: string }[] = [];
  // First, because it is the loudest thing a row can say and it is the one the
  // reader has to act on.
  if (pin) {
    marks.push({
      icon: 'unverified',
      cls: 'ctx-mark-broken',
      title: PIN_CHANGED_NOTE
    });
  }
  if (entry.shadows.length > 0) {
    marks.push({
      icon: 'layers',
      cls: 'ctx-mark-shadowing',
      title: shadowHint(entry)
    });
  }
  if (entry.state === 'disabled') {
    marks.push({
      icon: 'circle-slash',
      cls: 'ctx-mark-off',
      title: 'Present, and switched off.'
    });
  }
  if (entry.state === 'managed') {
    marks.push({
      icon: 'lock',
      cls: 'ctx-mark-off',
      title: CONTEXT_COPY.managedNote
    });
  }
  if (entry.state === 'broken') {
    // --error, never --warning. --warning is the same amber as
    // --status-attention, and a permanent amber glyph in the sidebar would
    // compete with the one colour the product reserves for "an agent needs
    // you". A hook whose script is missing is an error, so it takes the error
    // colour and the amber budget stays intact (§5.5).
    marks.push({
      icon: 'error',
      cls: 'ctx-mark-broken',
      title: entry.problem?.message ?? 'This entry could not be read.'
    });
  }
  if (drift !== undefined) {
    marks.push({
      icon:
        drift.kind === 'added'
          ? 'add'
          : drift.kind === 'removed'
            ? 'dash'
            : 'history',
      cls: 'ctx-mark-drift',
      title: DRIFT_COPY[drift.kind]
    });
  }
  return marks.slice(0, 2);
}

export interface ContextRowProps {
  entry: ContextEntry;
  selected: boolean;
  filtering: boolean;
  showAgentChip: boolean;
  drift: ContextDriftEntry | undefined;
  /**
   * Requirement 2 — true when the bytes on disk no longer match the hash
   * recorded when a human approved this install, or when they could not be
   * re-read at all. An unreadable directory counts as changed.
   */
  pin?: boolean;
  onSelect(id: string): void;
  onActivate(entry: ContextEntry, keep: boolean): void;
  onMenu(entry: ContextEntry, at: { x: number; y: number }): void;
  onHover(entry: ContextEntry | null, el: HTMLElement | null): void;
}

export const ContextRow = React.memo(function ContextRow({
  entry,
  selected,
  filtering,
  showAgentChip,
  drift,
  pin = false,
  onSelect,
  onActivate,
  onMenu,
  onHover
}: ContextRowProps): React.JSX.Element {
  const timer = useRef<number | null>(null);
  const marks = stateMarks(entry, drift, pin);

  const clearTimer = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  return (
    <div
      className={`ctx-row${selected ? ' selected' : ''}${pin ? ' pin-changed' : ''}`}
      id={`ctx-row-${entry.id}`}
      role="option"
      aria-selected={selected}
      data-entry={entry.id}
      {...(pin ? { 'data-pin': 'changed' } : {})}
      title={pin ? PIN_CHANGED_NOTE : entry.summary === '' ? entry.name : undefined}
      onPointerEnter={(e) => {
        const el = e.currentTarget;
        clearTimer();
        timer.current = window.setTimeout(() => onHover(entry, el), HOVER_MS);
      }}
      onPointerLeave={() => {
        clearTimer();
        onHover(null, null);
      }}
      onClick={(e) => {
        onSelect(entry.id);
        onActivate(entry, e.metaKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(entry.id);
        onMenu(entry, { x: e.clientX, y: e.clientY });
      }}
    >
      <Codicon
        name={CONTEXT_CATEGORY_ICON[entry.category]}
        size="lg"
        className="ctx-row-icon"
      />
      {filtering ? (
        // §5.3 — grouping is the resting-state channel and the chip is the
        // filtered-state one. Never both: 8px of noise on every row for a fact
        // the group header already stated.
        <span className="ctx-chip" title={SCOPE_CHIP_WORD[entry.scope]}>
          <span className="ctx-chip-word">{SCOPE_CHIP_WORD[entry.scope]}</span>
          <Codicon
            name={SCOPE_CHIP_ICON[entry.scope]}
            size="sm"
            className="ctx-chip-glyph"
          />
        </span>
      ) : null}
      <span className="ctx-name">{entry.name}</span>
      <span
        className={`ctx-summary${
          entry.category === 'mcp' || entry.category === 'hook' ? ' mono' : ''
        }`}
      >
        {entry.summary}
      </span>
      {showAgentChip && entry.agents.length > 0 ? (
        // Not eight 14px logos: eight logos is 112px of a 400px pane, and at
        // 220px it is the whole row. The logos live in the hover card and the
        // detail view, where there is room to name them (§5.5).
        <span
          className="ctx-agents num"
          aria-label={`loaded by ${String(entry.agents.length)} agents`}
          title={entry.agents.map(agentShortLabel).join(', ')}
        >
          {entry.agents.length}
        </span>
      ) : null}
      {/* Each mark carries its own sentence and each sentence has to reach the
          reader. `Codicon` takes only name, size and className and sets
          aria-hidden, so a `title` handed to it is dropped on the floor and a
          screen reader gets nothing at all from this lane. The wrapper is what
          carries both: `title` for the pointer and `aria-label` on a `role=img`
          for everything else. */}
      <span className="ctx-marks">
        {marks.map((m) => (
          <span
            key={m.icon}
            className="ctx-mark"
            role="img"
            aria-label={m.title}
            title={m.title}
          >
            <Codicon name={m.icon} size="sm" className={m.cls} />
          </span>
        ))}
      </span>
    </div>
  );
});
