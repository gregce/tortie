/**
 * Phase 129. Settings → Agents is divided into pages, one per machine.
 *
 * WHY. The tab drew this Mac's agents, then the configured agents, then one
 * block per machine, all on one page. With one machine that is already a page
 * and a half of scrolling. A person may configure up to 32 machines, and at
 * that count the tab cannot be read at all. The blocks did not change. Only
 * one of them is drawn at a time now.
 *
 * WHAT THIS FILE IS. A presentational tab list and nothing else. It holds no
 * state, reads no store and sends nothing. `AgentsSection` owns which page is
 * selected and hands it in.
 *
 * IT DRAWS NOTHING FOR ONE PAGE. A person with no machine has one page, and a
 * row of one tab is a label pretending to be a control. The caller draws the
 * local page directly in that case, so the Agents tab is what it always was.
 *
 * IT IS NEVER A DROPDOWN. The whole point is that a person can see how many
 * machines they have and which one they are reading. A list behind a control
 * hides both. The row scrolls sideways rather than wrapping, so 32 machines
 * cannot push the agents below the fold again.
 *
 * THE KEYBOARD follows the ARIA tabs pattern. Left and Right move one page,
 * Home and End go to the ends, and only the selected tab is in the tab order,
 * so one Tab press leaves the row rather than walking 33 buttons.
 */

import React, { useRef } from 'react';
import type { MachineColor } from '@shared/machines';
import { AGENTS_PAGES_LABEL } from './machines-copy';

export interface AgentPage {
  /** `local` for this Mac, otherwise the machine's own id. */
  id: string;
  /** The words on the tab. */
  label: string;
  /** The colour a person picked for that machine. Absent for this Mac. */
  color?: MachineColor;
}

export interface AgentPagesProps {
  pages: readonly AgentPage[];
  activeId: string;
  onSelect(id: string): void;
}

/** The id of the tab button for one page, so the panel can point back at it. */
export function agentPageTabId(id: string): string {
  return `agent-page-tab-${id}`;
}

/** The id of the panel one page draws into. */
export function agentPagePanelId(id: string): string {
  return `agent-page-${id}`;
}

export function AgentPages({
  pages,
  activeId,
  onSelect
}: AgentPagesProps): React.JSX.Element | null {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  if (pages.length <= 1) return null;

  const go = (index: number): void => {
    const page = pages[index];
    if (page === undefined) return;
    onSelect(page.id);
    // The selection moves the roving tab stop with it, so the next arrow is
    // answered by the row rather than by whatever had the keyboard before.
    buttons.current.get(page.id)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const at = pages.findIndex((p) => p.id === activeId);
    const last = pages.length - 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(at >= last ? 0 : at + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(at <= 0 ? last : at - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      go(last);
    }
  };

  return (
    <div
      className="set-agent-pages"
      role="tablist"
      aria-label={AGENTS_PAGES_LABEL}
      onKeyDown={onKeyDown}
    >
      {pages.map((page) => {
        const selected = page.id === activeId;
        return (
          <button
            key={page.id}
            type="button"
            role="tab"
            id={agentPageTabId(page.id)}
            className="set-agent-page"
            aria-selected={selected}
            aria-controls={agentPagePanelId(page.id)}
            tabIndex={selected ? 0 : -1}
            data-agent-page={page.id}
            ref={(node) => {
              if (node === null) buttons.current.delete(page.id);
              else buttons.current.set(page.id, node);
            }}
            onClick={() => onSelect(page.id)}
          >
            {page.color !== undefined ? (
              <span
                className="mach-dot"
                data-machine-color={page.color}
                aria-hidden="true"
              />
            ) : null}
            {page.label}
          </button>
        );
      })}
    </div>
  );
}
