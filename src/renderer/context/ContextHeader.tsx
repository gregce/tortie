/**
 * The Context view's slice of the 36px HEADER BAND (§5.2).
 *
 *     CONTEXT          [ all agents ˅ ]              ⟳
 *
 * The sidebar owns one band, and exactly one label and one hairline cross it
 * whichever view is showing (S1). That is why this is its own component rather
 * than the top of the list: the band is a region of the window, not a part of
 * the view underneath it, and every other sidebar view splits the same way.
 *
 * THE REFRESH CONTROL IS HERE FOR AN HONEST REASON, not for symmetry with the
 * Explorer. The watcher cannot see a directory that did not exist when the view
 * opened. That is a real limit in Claude Code's own live reload too, and naming
 * it costs one 16px glyph where hiding it would cost the user an afternoon.
 *
 * NO `+` BUTTON. Creating a skill is a context-menu verb (§9.5); the band's
 * actions are reserved for things that act on the whole view.
 */

import React, { useEffect } from 'react';
import { localPathOf } from '@shared/workspace-target';
import { contextRefreshOnMachineTitle } from '../app/machine-copy';
import { AgentIcon, agentMenuIcon, Codicon, warmAgentMenuIcons } from '../icons';
import { agentShortLabel } from '../state/agents';
import { machineLabelFor } from '../state/machines-slice';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useContext } from './store';

/**
 * `CONTEXT   [ all agents ˅ ]   ⟳`
 *
 * The refresh control is present rather than tidy-looking, and it is present
 * for an honest reason: the watcher can miss a directory that did not exist
 * when the view opened. That is a real limit in Claude Code's own live reload
 * too, and naming it costs one 16px glyph.
 *
 * No `+` here. Creating a skill is a context-menu verb (§9.5); the band's
 * actions are reserved for things that act on the whole view.
 */
export function ContextHeader(): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const machineStates = useApp((s) => s.machineStates);
  const scan = useContext((s) => s.scan);
  const agentId = useContext((s) => s.agentId);
  const setAgent = useContext((s) => s.setAgent);
  const refresh = useContext((s) => s.refresh);
  const status = useContext((s) => s.status);
  const target = useContext((s) => s.target);
  const machineLabel = useContext((s) => s.machineLabel);
  const mode = useContext((s) => s.mode);
  const sessionName = useContext((s) => s.sessionName);
  const exitSessionMode = useContext((s) => s.exitSessionMode);

  const agents = scan?.agents ?? [];

  // PHASE 108. Whether the files this view describes are on another machine,
  // and what that machine is called. The machine's own label from its answer
  // wins; before an answer lands the sidebar's list supplies the name.
  const remote = target !== null && localPathOf(target) === null;
  const remoteLabel =
    machineLabel ?? machineLabelFor(machineStates, target?.machineId ?? '');

  useEffect(() => {
    void warmAgentMenuIcons(agents.map((a) => a.agent));
  }, [agents]);

  // The SESSION'S NAME, never its id. The pill printed the raw uuid until Phase
  // 22's fix round, which is what a mode that was never driven end to end looks
  // like from the outside.
  const label =
    mode === 'session' && sessionName !== null
      ? sessionName
      : agentId === null
        ? 'all agents'
        : agentShortLabel(agentId);

  const openAgentMenu = (anchor: HTMLElement): void => {
    const rect = anchor.getBoundingClientRect();
    const items: (MenuItemSpec | 'sep')[] = [
      {
        label: `${agentId === null ? '✓ ' : ''}All agents`,
        run: () => setAgent(null)
      },
      'sep',
      // Every agent the reader looked at, whether or not its CLI is on the
      // machine: an agent that is not installed can still hold configuration
      // on disk, and hiding it would make its files unexplainable. The readout
      // says which categories it could not answer for, and an absent category
      // is an absent section rather than a lie (§2.4).
      ...agents.map((agent): MenuItemSpec => {
        const icon = agentMenuIcon(agent.agent);
        const silent = agent.unknown.length;
        return {
          label: `${agentId === agent.agent ? '✓ ' : ''}${agent.displayName}`,
          ...(icon !== undefined ? { icon } : {}),
          ...(silent > 0
            ? {
                sublabel:
                  silent === 1
                    ? '1 category Tortie cannot read'
                    : `${String(silent)} categories Tortie cannot read`
              }
            : {}),
          run: () => setAgent(agent.agent)
        };
      })
    ];
    setMenu({ x: rect.left, y: rect.bottom + 2, items });
  };

  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">Context</span>
      <span className="view-header-spacer" />
      <button
        type="button"
        className="ctx-agent-pill"
        title={
          mode === 'session'
            ? 'This is what that session was launched with.'
            : 'Show only what one agent loads'
        }
        aria-label={`Filter by agent (${label})`}
        disabled={agents.length === 0}
        onClick={(e) => openAgentMenu(e.currentTarget)}
      >
        {agentId === null ? (
          <Codicon name="layers" size={14} />
        ) : (
          <AgentIcon agent={agentId} size={14} />
        )}
        <span className="ctx-agent-label">{label}</span>
        <Codicon name="chevron-down" size={12} />
      </button>
      {/* The way out of session mode. It is a control rather than a second
          click on the pill, because the pill still opens the agent selector in
          both modes and a control that means two things depending on a mode is
          how a user ends up unable to get back. */}
      {mode === 'session' ? (
        <button
          type="button"
          className="icon-btn view-header-action"
          aria-label="Show everything, not just this session"
          title="Stop showing one session and go back to the whole list."
          onClick={() => exitSessionMode()}
        >
          <Codicon name="close" size={16} />
        </button>
      ) : null}
      {/* Disabled for `elsewhere` as well as for `unavailable`, and Phase 108
          gives the condition its two halves. A remote tab this build can read
          is never in `elsewhere` any more, so Refresh works there and triggers
          the read. A remote tab this build cannot read stays `elsewhere`, and
          a control that could do nothing stays disabled rather than erroring
          when pressed. */}
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="Read the configuration again"
        title={
          remote
            ? contextRefreshOnMachineTitle(remoteLabel)
            : 'Read the configuration again. The watcher cannot see a directory that did not exist when this view opened.'
        }
        disabled={status === 'unavailable' || status === 'elsewhere'}
        onClick={() => refresh()}
      >
        <Codicon name="refresh" size={16} />
      </button>
    </div>
  );
}
