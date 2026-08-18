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
 *   mode="launch" → each tile is a button that starts a session.
 *   mode="select" → each tile is a toggle button carrying aria-pressed, and
 *                   arrow keys still move the choice across the installed
 *                   ones.
 * Everything else is defined once, here, so the next change lands on both.
 *
 * PHASE 86. The select board used to be a radiogroup with a roving tabindex,
 * which meant the WHOLE board was one Tab stop and Tab could not walk the
 * tiles. The operator reported that as the sheet not answering the keyboard.
 * It is a group of aria-pressed buttons now, and every tile is its own Tab
 * stop in both modes.
 *
 * What that gives up, recorded here rather than hidden. A screen reader user
 * loses the one-stop-per-group behaviour a radiogroup gives and gains one Tab
 * stop per agent, which is thirteen stops today. The mitigation is the role
 * itself: a toggle button that Tab reaches is the honest role for a control
 * Tab walks, and each tile still announces its own pressed state.
 *
 * PHASE 86 FIX ROUND. Focus and choice are the SAME THING on this board in
 * select mode. Tab moving focus while only the arrows moved the choice let the
 * two disagree, and then Enter created the chosen agent rather than the one
 * under focus. Measured with claude as the default agent: one Shift+Tab from
 * the Name field landed on the Shell tile and Enter there created `claude-1`,
 * and eight Tabs landed on the Cursor tile and Enter there created `claude-1`
 * as well. A person acted on one tile and got another.
 *
 * So focusing a tile that can run chooses it, exactly as an arrow key already
 * does, and Enter can only ever create the agent the person is looking at.
 * There is one exception and it is the only one. Focusing a tile that CANNOT
 * run does not move the choice, because that agent cannot be started. Such a
 * tile stays a Tab stop so a person can reach it and read why it is refused,
 * and Enter on it is still refused with the reason shown.
 */

import React, { useRef } from 'react';
import type { AgentPickerOption } from '../state/agents';
// PHASE 23 FIX ROUND. An agent from `agents.json` that nobody has confirmed is
// installed and still cannot start. The board is where a person chooses, so it
// is where that has to be said. Before this, the tile looked exactly like a
// working agent and the refusal arrived as a modal error after the name field
// and the Create button.
import { agentBlockedReason } from '../state/agents';
import { AcceleratorKeycap } from '../keys';
import { AgentIcon } from '../icons';
import { ENTER_SUBMITS_ATTR } from './focus-trap';
import './agent-grid.css';

/**
 * Does moving the keyboard onto this tile also move the CHOICE onto it?
 *
 * Phase 86 fix round, and it is the whole of that fix. True for a select-mode
 * tile whose agent can actually be started. False in launch mode, where
 * activation starts a session and merely arriving on a tile must never do
 * that. False for a tile that is not installed or that the confirm gate will
 * not start, because the choice may not land on something that cannot run.
 *
 * Exported so the test presses the same rule the board uses.
 */
export function focusChoosesTile(
  mode: 'launch' | 'select',
  option: AgentPickerOption
): boolean {
  return (
    mode === 'select' && option.installed && agentBlockedReason(option) === null
  );
}

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

  /** Arrows move the choice across the ENABLED tiles. Select mode only. */
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (mode !== 'select') return;
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !backward) return;
    e.preventDefault();
    const enabled = options.filter(
      (o) => o.installed && agentBlockedReason(o) === null
    );
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
      role="group"
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
  // Phase 23. Null for every compiled agent. A sentence for a configured row
  // that the confirm gate will not let start.
  const blocked = agentBlockedReason(option);
  // Two ways to be unusable, and they are different things. "not installed"
  // means there is no program. `blocked` means the program is there and Tortie
  // will not run it until a person has agreed to what it runs.
  const unusable = !option.installed || blocked !== null;

  // One right-hand slot, in priority order: the honest "not installed", the
  // confirm gate's answer, the recorded hotkey, the registry's early-support
  // caveat (droid). The status outranks the keycap — a chord for a CLI that is
  // not there, or that will refuse to start, is a lie.
  const meta = !option.installed ? (
    <span className="agent-tile-meta">not installed</span>
  ) : blocked !== null ? (
    <span className="agent-tile-meta">
      {option.configState === 'changed' ? 'changed' : 'confirm first'}
    </span>
  ) : hotkey !== null ? (
    <AcceleratorKeycap accelerator={hotkey} />
  ) : option.unverified ? (
    <span className="agent-tile-meta">early</span>
  ) : null;

  const hint = (): void => {
    if (unusable) onHint?.(option.id);
  };
  const unhint = (): void => {
    if (unusable) onUnhint?.(option.id);
  };

  // Phase 86 fix round. Arriving on a tile IS choosing it, in select mode and
  // for a tile that can run. `focusChoosesTile` reads the same two facts
  // `unusable` reads above, so the two can never disagree about one tile.
  // Repeating the choice a tile already holds is harmless: the arrow handler
  // chooses and then focuses, and the second call sets the same id.
  const focus = (): void => {
    hint();
    if (focusChoosesTile(mode, option)) onActivate(option);
  };

  const selected = mode === 'select' && primary;
  // Select mode only. `aria-pressed` says which agent is chosen without
  // claiming the radio role, and ENTER_SUBMITS_ATTR is what lets Enter on a
  // chosen tile reach the sheet's Create instead of stopping at the button.
  // No tabIndex is set in either mode, so every tile is a Tab stop.
  //
  // An unusable tile carries no ENTER_SUBMITS_ATTR. `aria-disabled` describes
  // a tile rather than removing it, so a tile for an agent that is not
  // installed, or that the confirm gate will not start, is still a Tab stop.
  // With the attribute on it, landing on "Droid, not installed" and pressing
  // Enter closed the sheet and created a session with whichever agent was
  // chosen. Measured: 1 session became 2 and the new row was `shell-1`. A
  // person acted on Droid and got a shell. Without it, Enter runs the tile's
  // own activation, which shows that agent's install caption and creates
  // nothing. Measured after the fix: 1 session stayed 1 and the sheet stayed
  // open.
  const pressedProps =
    mode !== 'select'
      ? {}
      : unusable
        ? ({ 'aria-pressed': selected } as const)
        : ({ 'aria-pressed': selected, [ENTER_SUBMITS_ATTR]: '' } as const);

  return (
    <button
      ref={registerRef}
      type="button"
      className={[
        'agent-tile',
        unusable ? 'missing' : '',
        blocked !== null ? 'blocked' : '',
        selected ? 'selected' : '',
        mode === 'launch' && primary && !unusable ? 'primary' : '',
        starting ? 'starting' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--agent-tile-i' as string]: index }}
      aria-disabled={unusable}
      aria-label={
        !option.installed
          ? `${option.label} — not installed`
          : blocked !== null
            ? `${option.label} — ${blocked}`
            : mode === 'launch'
              ? `Start ${option.label}`
              : option.label
      }
      title={
        blocked ??
        (option.installed && mode === 'launch'
          ? `Start ${option.label}`
          : undefined)
      }
      {...pressedProps}
      onClick={() => onActivate(option)}
      onMouseEnter={hint}
      onMouseLeave={unhint}
      onFocus={focus}
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
