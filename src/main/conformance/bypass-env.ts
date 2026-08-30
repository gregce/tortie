/**
 * The first run environment the conformance harnesses give their own tmux
 * server, lifted out of resume.ts in Phase 169 so the paste matrix can use the
 * same write and the same undo. One table (BYPASS_ENV in ./cases), one writer,
 * one refusal of the real socket.
 */
import type { LaunchableAgentId } from '@shared/types';
import * as tmux from '../tmux';
import { BYPASS_ENV } from './cases';

/**
 * Give the run's own tmux server the first-run environment in
 * {@link BYPASS_ENV} for the agents under test, so every pane the harness
 * creates on it inherits those variables. It is the server's GLOBAL
 * environment and not any row's launch.env, so nothing a person creates in
 * the product sees it. Returns the undo, which removes what was written.
 *
 * Refused on the real socket. A global variable written to `-L gmux` would
 * outlive this run and reach the operator's next omp pane, which is exactly
 * the product behaviour the variable must not change. On that socket the
 * case runs bare and, for omp, reads BLOCKED with the wizard named.
 */
export async function publishBypassEnv(
  agents: readonly LaunchableAgentId[],
  enabled: boolean
): Promise<() => Promise<void>> {
  const noop = async (): Promise<void> => undefined;
  if (!enabled) return noop;
  const wanted = new Map<string, { value: string; agents: string[] }>();
  for (const agent of agents) {
    for (const [name, value] of Object.entries(BYPASS_ENV[agent] ?? {})) {
      const have = wanted.get(name);
      if (have === undefined) wanted.set(name, { value, agents: [agent] });
      else have.agents.push(agent);
    }
  }
  if (wanted.size === 0) return noop;
  if (tmux.activeTmuxSocket() === tmux.TMUX_SOCKET) {
    console.warn(
      `[gmux-conf] not writing ${[...wanted.keys()].join(', ')} to the real ` +
        `server -L ${tmux.TMUX_SOCKET}; run through harness-socket so the ` +
        `cases get a server of their own`
    );
    return noop;
  }
  await tmux.ensureServer();
  for (const [name, { value, agents: who }] of wanted) {
    await tmux.execTmux(['set-environment', '-g', name, value]);
    console.log(`[gmux-conf] server env ${name}=${value} (for ${who.join(', ')})`);
  }
  return async () => {
    for (const name of wanted.keys()) {
      await tmux.execTmux(['set-environment', '-gu', name]).catch(() => undefined);
    }
  };
}
