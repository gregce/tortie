/**
 * The agent board — ONE component behind both surfaces that offer the fleet:
 * §6.2's no-sessions empty state (a launcher) and the ⌘T sheet's Agent field
 * (a picker). Phase 12.12 item 1.
 *
 * They used to be two hand-written grids, and they drifted exactly the way
 * duplicated markup does. The empty state grew roomy tiles that carry each
 * agent's status ON the tile — "not installed" on Droid, "early" on Pi — and a
 * dashed recessive outline where gmux has nothing to run yet. The modal kept
 * cramped 32px chips and pushed the same fact into a single caption under the
 * grid that could only ever describe ONE agent, so a board with four missing
 * CLIs told you about whichever one the pointer touched last.
 *
 * The empty state was the better answer, so it is the one that survives: the
 * modal renders these same tiles at the same density (a 480px sheet holds
 * exactly three 140px tracks — the width the fleet state already uses at its
 * narrowest), and nothing here is parameterized on which surface is asking.
 *
 * What the two surfaces genuinely do NOT share is semantics, and that is the
 * one axis this component splits on:
 *   mode="launch" → role=group; each tile is a button that starts a session.
 *   mode="select" → role=radiogroup; tiles are radios with roving tabindex and
 *                   arrow-key movement across the installed ones.
 * Everything else is defined once, here, so the next change lands on both.
 */

import React, { useRef } from 'react';
import type { AgentPickerOption } from '../state/agents';
import { AcceleratorKeycap } from '../keys';
import { AgentIcon } from '../icons';
import './agent-grid.css';

export interface AgentGridProps {
  options: readonly AgentPickerOption[];
  /** Tile semantics — see the module comment. */
  mode: 'launch' | 'select';
  /**
   * select: the checked radio. launch: the default agent, which gets one
   * accent hairline so the eye lands where ⌘T ↩ would.
   */
  primaryId?: string | null;
  /** Recorded per-agent hotkeys (launch only) — the tile's right slot. */
  hotkeys?: Record<string, string | undefined>;
  /** launch: the tile whose session is being created right now. */
  startingId?: string | null;
  /** Clicking a tile: start it (launch) or check it (select). */
  onActivate: (option: AgentPickerOption) => void;
  /**
   * The pointer or keyboard reached a NOT-INSTALLED tile. Each surface hangs
   * its own recovery copy off this (an install command, mostly); the tile has
   * already said "not installed" on its own.
   */
  onHint?: (id: string) => void;
  onUnhint?: (id: string) => void;
  /** Names the group for screen readers ("Start a session" / "Agent"). */
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export function AgentGrid({
  options,
  mode,
  primaryId = null,
  hotkeys,
  startingId = null,
  onActivate,
  onHint,
  onUnhint,
  ariaLabel,
  ariaLabelledBy
}: AgentGridProps): React.JSX.Element {
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  /** Radio semantics: arrows move the check across the ENABLED tiles. */
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (mode !== 'select') return;
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !backward) return;
    e.preventDefault();
    const enabled = options.filter((o) => o.installed);
    if (enabled.length === 0) return;
    const at = Math.max(
      0,
      enabled.findIndex((o) => o.id === primaryId)
    );
    const next =
      enabled[(at + (forward ? 1 : enabled.length - 1)) % enabled.length];
    if (next === undefined) return;
    onActivate(next);
    tileRefs.current.get(next.id)?.focus();
  };

  return (
    <div
      className="agent-grid"
      data-mode={mode}
      role={mode === 'select' ? 'radiogroup' : 'group'}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      {...(ariaLabelledBy !== undefined
        ? { 'aria-labelledby': ariaLabelledBy }
        : {})}
      aria-busy={startingId !== null}
      onKeyDown={onKeyDown}
    >
      {options.map((option, i) => (
        <AgentTile
          key={option.id}
          index={i}
          option={option}
          mode={mode}
          primary={option.id === primaryId}
          hotkey={hotkeys?.[option.id] ?? null}
          starting={startingId === option.id}
          onActivate={onActivate}
          {...(onHint !== undefined ? { onHint } : {})}
          {...(onUnhint !== undefined ? { onUnhint } : {})}
          registerRef={(el) => {
            if (el !== null) tileRefs.current.set(option.id, el);
            else tileRefs.current.delete(option.id);
          }}
        />
      ))}
    </div>
  );
}

function AgentTile({
  index,
  option,
  mode,
  primary,
  hotkey,
  starting,
  onActivate,
  onHint,
  onUnhint,
  registerRef
}: {
  index: number;
  option: AgentPickerOption;
  mode: 'launch' | 'select';
  primary: boolean;
  hotkey: string | null;
  starting: boolean;
  onActivate: (option: AgentPickerOption) => void;
  onHint?: (id: string) => void;
  onUnhint?: (id: string) => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}): React.JSX.Element {
  // One right-hand slot, in priority order: the honest "not installed", the
  // recorded hotkey, the registry's early-support caveat (pi). The status
  // outranks the keycap — a chord for a CLI that is not there is a lie.
  const meta = !option.installed ? (
    <span className="agent-tile-meta">not installed</span>
  ) : hotkey !== null ? (
    <AcceleratorKeycap accelerator={hotkey} />
  ) : option.unverified ? (
    <span className="agent-tile-meta">early</span>
  ) : null;

  const hint = (): void => {
    if (!option.installed) onHint?.(option.id);
  };
  const unhint = (): void => {
    if (!option.installed) onUnhint?.(option.id);
  };

  const selected = mode === 'select' && primary;
  const radioProps =
    mode === 'select'
      ? ({
          role: 'radio',
          'aria-checked': selected,
          tabIndex: selected ? 0 : -1
        } as const)
      : {};

  return (
    <button
      ref={registerRef}
      type="button"
      className={[
        'agent-tile',
        option.installed ? '' : 'missing',
        selected ? 'selected' : '',
        mode === 'launch' && primary && option.installed ? 'primary' : '',
        starting ? 'starting' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--agent-tile-i' as string]: index }}
      aria-disabled={!option.installed}
      aria-label={
        option.installed
          ? mode === 'launch'
            ? `Start ${option.label}`
            : option.label
          : `${option.label} — not installed`
      }
      title={
        option.installed && mode === 'launch'
          ? `Start ${option.label}`
          : undefined
      }
      {...radioProps}
      onClick={() => onActivate(option)}
      onMouseEnter={hint}
      onMouseLeave={unhint}
      onFocus={hint}
      onBlur={unhint}
    >
      <AgentIcon
        agent={option.iconKey}
        size={16}
        className="agent-tile-icon"
      />
      <span className="agent-tile-name">{option.label}</span>
      {meta}
    </button>
  );
}
