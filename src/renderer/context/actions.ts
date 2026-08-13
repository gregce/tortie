/**
 * SEAM 3, closed. The write verbs the Context view's menus offer.
 *
 * `ContextSection` takes a `ContextRowActions` object and an absent verb is one
 * fewer menu item rather than a greyed one. Phase 22 shipped with `<ContextSection />`
 * and no object, so there was no Remove, no Update and no way to install
 * anything. This hook is that object, and every verb in it goes through the
 * bundled skills CLI with a human confirming first.
 *
 * ## What is here, and what is deliberately not
 *
 * | Verb | Status |
 * | --- | --- |
 * | Move to Trash… | `skills remove -g -y -s <name>`, behind the confirm |
 * | Update… | `skills update -g -y <name>`, behind the confirm |
 * | Enable for… | re-runs `add` with more agents, through the same sheet |
 * | New skill… | opens the sheet on an empty query |
 * | Disable | **not offered.** It means editing an agent's own settings file, and Tortie never writes into an agent's configuration. |
 * | Check connection… | **not offered.** It means starting someone else's MCP server, which Tortie does not do yet. Research 29 §7.4 calls it a verb rather than a refresh, and a verb that is not built is better absent than pretending. |
 *
 * The verbs are offered for SKILLS ONLY. The CLI has no MCP, hook, plugin or
 * instruction management anywhere in it, and doing those by hand would be
 * Tortie editing files it has no business writing.
 *
 * ## One thing the CLI forced
 *
 * "Enable for exactly one agent" is not offered anywhere. With one target
 * directory the CLI switches from a symlink to a full copy, and re-adding from
 * the canonical path with two or more targets is a silent no-op that reports
 * success. `installCommand` in main throws for a single agent, so the refusal is
 * structural rather than remembered.
 */

import { useCallback, useMemo } from 'react';
import { useApp } from '../state/store';
import type { ContextEntry } from './model';
import type { ContextRowActions } from './menus';
import { useContext } from './store';
import { useInstallFlow } from './install/install-store';
import type { AgentChoice } from './install/install-store';

/**
 * The agents the current scan actually read, as install targets.
 *
 * `skillsCliName` rides on the scan rather than being looked up here, because
 * the table that maps a Tortie id to the CLI's own name lives in main beside
 * the substrate matrix. A second copy in the renderer is how `-a claude` gets
 * sent to a CLI that only knows `claude-code`.
 */
function agentChoices(): AgentChoice[] {
  const scan = useContext.getState().scan;
  if (scan === null) return [];
  return scan.agents.map((agent) => ({
    id: agent.agent,
    name: agent.displayName,
    cliName: agent.skillsCliName
  }));
}

export function useContextActions(): ContextRowActions {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const cwd = projects.find((p) => p.id === activeProjectId)?.path ?? null;

  const openSheet = useInstallFlow((s) => s.openSheet);
  const requestRemove = useInstallFlow((s) => s.requestRemove);
  const requestUpdate = useInstallFlow((s) => s.requestUpdate);

  const newSkill = useCallback(() => {
    openSheet({ projectRoot: cwd, agents: agentChoices() });
  }, [cwd, openSheet]);

  const searchFor = useCallback(
    (query: string) => {
      openSheet({ query, projectRoot: cwd, agents: agentChoices() });
    },
    [cwd, openSheet]
  );

  const enableFor = useCallback(
    (entry: ContextEntry) => {
      // The source is not on the row, because a skill on disk does not record
      // where it came from. Opening the sheet on the skill's NAME as a query is
      // the honest version: the user picks the source they actually want, and
      // the same scan, the same audit and the same confirm apply.
      openSheet({
        query: entry.name,
        projectRoot: cwd,
        agents: agentChoices(),
        preselect: entry.agents
      });
    },
    [cwd, openSheet]
  );

  const remove = useCallback(
    (entry: ContextEntry) => {
      void requestRemove(entry);
    },
    [requestRemove]
  );

  const update = useCallback(
    (entry: ContextEntry) => {
      void requestUpdate(entry);
    },
    [requestUpdate]
  );

  return useMemo(
    () => ({ newSkill, searchFor, enableFor, remove, update }),
    [newSkill, searchFor, enableFor, remove, update]
  );
}
