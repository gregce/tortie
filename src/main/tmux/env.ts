/**
 * env.ts — process-environment shaping for everything gmux spawns around
 * tmux (server commands, attach-client PTYs).
 *
 * Bug C (Phase 9.2): Finder/launchd launches carry NO locale variables.
 * tmux decides per client whether the terminal is UTF-8-capable by string-
 * scanning LC_ALL → LC_CTYPE → LANG (first non-empty) for "UTF-8"/"UTF8"
 * (tmux.c); a client with no locale is treated as non-UTF-8 and every
 * non-ASCII cell is drawn as `_` — which is exactly how the zsh prompt's
 * `➜` and `✗` became underscores. Pane-interior processes (zsh, vim, agent
 * TUIs) also read the locale and degrade to ASCII under C/POSIX.
 *
 * The guard below guarantees a UTF-8 locale WITHOUT overriding a locale the
 * user actually configured: if any of LC_ALL/LC_CTYPE/LANG already mentions
 * UTF-8, the env is returned untouched. en_US.UTF-8 ships on every macOS.
 *
 * (The attach host ALSO passes `tmux -u`, which forces UTF-8 output for
 * that client even under a pathological explicit LC_ALL=C.)
 */

/** The locale injected when the environment has none. Present on all macOS. */
export const DEFAULT_UTF8_LANG = 'en_US.UTF-8';

/**
 * Mirrors tmux's own client check (tmux.c): first non-empty of
 * LC_ALL → LC_CTYPE → LANG, case-insensitive match on "UTF-8"/"UTF8".
 */
export function hasUtf8Locale(env: NodeJS.ProcessEnv): boolean {
  const value =
    firstNonEmpty(env['LC_ALL'], env['LC_CTYPE'], env['LANG']) ?? '';
  return /utf-?8/i.test(value);
}

function firstNonEmpty(
  ...values: readonly (string | undefined)[]
): string | undefined {
  for (const v of values) {
    if (v !== undefined && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Copy of `env` guaranteed to advertise a UTF-8 locale (LANG injected only
 * when no LC_ALL/LC_CTYPE/LANG already does). Never mutates the input.
 */
export function withUtf8Locale(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) out[key] = value;
  }
  if (!hasUtf8Locale(env)) out['LANG'] = DEFAULT_UTF8_LANG;
  return out;
}
