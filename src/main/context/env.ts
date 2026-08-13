/**
 * Where the agents actually keep their configuration on THIS machine.
 *
 * Six environment variables relocate an agent's whole configuration directory
 * and one moves the skills lock file. None of them is set on the operator's
 * machine today, which is exactly why this module exists: a reader that
 * hard-codes `~/.claude` works here and points at the wrong directory on any
 * machine where `CLAUDE_CONFIG_DIR` is set, and the bundled skills CLI would
 * then be writing somewhere the view never looks. The CLI reads 31 variables
 * (BACKLOG Phase 22, the spawn contract); these are the ones that move a path
 * Tortie reads.
 *
 * Pure functions over an environment object, so a test can set
 * `CODEX_HOME=/tmp/x` without touching `process.env`.
 */

import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

/** The environment the reader resolves paths from. */
export type ContextEnv = Readonly<Record<string, string | undefined>>;

/** Every path root the reader can name, already expanded. */
export interface ContextHomes {
  /** `$HOME`, or the OS home when the environment does not carry one. */
  home: string;
  /** `CLAUDE_CONFIG_DIR` or `~/.claude`. */
  claude: string;
  /** `CODEX_HOME` or `~/.codex`. */
  codex: string;
  /** `XDG_CONFIG_HOME` or `~/.config`. Amp and OpenCode live under it. */
  xdgConfig: string;
  /** `XDG_STATE_HOME` or `~/.local/state`. The skills lock moves with it. */
  xdgState: string;
  /** `~/.agents` — the vendor-neutral root that 10 of 12 agents read. */
  agents: string;
}

/** `~/.agents/.skill-lock.json`, unless `XDG_STATE_HOME` moved it. */
export function globalSkillLockPath(homes: ContextHomes, env: ContextEnv): string {
  return env.XDG_STATE_HOME
    ? join(homes.xdgState, 'skills', '.skill-lock.json')
    : join(homes.agents, '.skill-lock.json');
}

function firstAbsolute(...candidates: (string | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (candidate && isAbsolute(candidate)) return candidate;
  }
  return null;
}

/** Resolve every configuration root once, so no reader re-derives one. */
export function resolveHomes(env: ContextEnv = process.env): ContextHomes {
  const home = firstAbsolute(env.HOME, env.USERPROFILE) ?? homedir();
  return {
    home,
    claude: firstAbsolute(env.CLAUDE_CONFIG_DIR) ?? join(home, '.claude'),
    codex: firstAbsolute(env.CODEX_HOME) ?? join(home, '.codex'),
    xdgConfig: firstAbsolute(env.XDG_CONFIG_HOME) ?? join(home, '.config'),
    xdgState: firstAbsolute(env.XDG_STATE_HOME) ?? join(home, '.local', 'state'),
    agents: join(home, '.agents')
  };
}

/**
 * Expand one declared location. The declaration language is deliberately tiny,
 * because a bigger one would put per-agent logic back into the reader:
 *
 *   `~/…`          the user's home
 *   `<claude>/…`   whatever CLAUDE_CONFIG_DIR says, or ~/.claude
 *   `<codex>/…`    CODEX_HOME, or ~/.codex
 *   `<xdgConfig>/…`, `<xdgState>/…`, `<agents>/…`
 *   `<project>/…`  the project root; yields null when there is no project
 *   anything else  taken as an absolute path
 */
export function expandLocation(
  template: string,
  homes: ContextHomes,
  projectRoot: string | null
): string | null {
  if (template.startsWith('<project>')) {
    if (!projectRoot) return null;
    return resolve(projectRoot, `.${template.slice('<project>'.length)}`);
  }
  if (template.startsWith('~/')) return join(homes.home, template.slice(2));
  const token = /^<([a-zA-Z]+)>/.exec(template);
  if (token && token[1]) {
    const key = token[1] as keyof ContextHomes;
    const base = homes[key];
    if (typeof base === 'string') return join(base, template.slice(token[0].length + 1));
  }
  return isAbsolute(template) ? template : null;
}
