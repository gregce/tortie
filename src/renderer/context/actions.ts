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
 * | Remove… | `skills remove [-g] -y -s <name>`, behind the confirm. `-g` and the home for a global skill, no `-g` and the project root for a project one. Offered only for user-owned rows in those two scopes. |
 * | Update… | `skills update -g -y <name>`, behind the confirm |
 * | Enable for… | the fleet picker (`../enable/`), then `add` re-run behind the same confirm (Phase 26 item 3) |
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
import { useEnableFlow } from './enable/enable-store';
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
      // Phase 26 item 3. The question is "which of my agents get this skill",
      // so the surface is the fleet picker, not the search sheet. The source
      // comes from Tortie's own pin when this install was approved here; when
      // there is no pin the picker says so and offers the sheet as the
      // explicit way to pick a source, which was the old default behavior.
      const pin = useContext.getState().pins.get(entry.id);
      useEnableFlow.getState().openFor({
        entry,
        agents: agentChoices(),
        source: pin === undefined || pin.source === '' ? null : pin.source,
        projectRoot: cwd
      });
    },
    [cwd]
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
