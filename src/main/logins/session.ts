/**
 * What a session's own login means to the rest of main (Phase 202).
 *
 * TWO CALLERS AND ONE RULE. A pane gets its login as one environment variable
 * (`../sessions/launch-plan.ts`), and everything else that has to look where
 * that pane looks gets the same variable through here. The harvest is the one
 * that matters: codex's conversation store lives UNDER `CODEX_HOME`, so a
 * session launched on a second codex login writes its rollout inside that
 * login's own directory, and a harvester reading Tortie's process environment
 * would scan the default location forever and time out. That is the price
 * research 72 section 10.8 named for moving a config directory, and this
 * module is where it is paid rather than admitted.
 *
 * WHAT IS STILL NOT ANSWERED HERE, stated plainly so a later round does not
 * read silence as completeness. Claude's conversation store also moves with
 * `CLAUDE_CONFIG_DIR`, so Catch Me Up, the Context view and SpecStory capture
 * read `~/.claude/projects` and will not find a second login claude session's
 * transcript. Claude pre-assigns its own id, so RESUME is unaffected and the
 * session comes back with its conversation; what does not follow it is the
 * reading of that conversation by those three surfaces. The Phase 202 entry
 * records it as a limit rather than a defect, and a later phase can take the
 * login through `../context/env.ts` the way this takes it through the harvest.
 */

import { loginProviderForAgent } from '@shared/logins';
import type { LoginProviderId } from '@shared/logins';
import { LOGIN_ENV_NAME } from '@shared/logins';
import { loginsRoot } from './paths';
import { resolveLoginDir } from './store';

/**
 * The process environment a reader should use to look where this session's own
 * pane looks, or undefined when there is nothing to change.
 *
 * UNDEFINED IS THE ANSWER FOR EVERY SESSION BEFORE THIS PHASE, every session
 * of every agent other than claude and codex, and every session on the default
 * login. Callers treat undefined as "use the process environment", which is
 * exactly what they did before, so nothing about those sessions moves.
 *
 * A login whose directory is gone answers undefined as well, because the
 * fallback is the default and the default is the process environment.
 */
export function loginEnvForSession(
  agent: string,
  login: string | undefined
): NodeJS.ProcessEnv | undefined {
  if (login === undefined || login.length === 0) return undefined;
  const provider: LoginProviderId | null = loginProviderForAgent(agent);
  if (provider === null) return undefined;
  const resolved = resolveLoginDir(loginsRoot(), provider, login);
  if (resolved.dir === null) return undefined;
  return { ...process.env, [LOGIN_ENV_NAME[provider]]: resolved.dir };
}
