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
 * The marker variables every gmux-managed pane carries (Phase 12.7 F3,
 * research 21 §8). Before these, nothing on the machine distinguished a
 * DURABLE agent from a disposable one — the only distinguishing mark gmux
 * left was an absolute `argv[0]`, which made its sessions the single most
 * `pkill -f`-able copy of an agent on the box. These are the honest
 * replacement: positive, greppable, and harmless.
 *
 *  - GMUX_MANAGED=1        this pane belongs to one of our sessions
 *  - GMUX_SESSION_ID=<uuid> the manifest row id (also the `@gmux-id` option),
 *                          so identity survives even if the option is lost
 *
 * Applied at create AND at restore, via tmux `new-session -e`.
 *
 * **KEPT AS `GMUX_*` THROUGH THE TORTIE RENAME, deliberately** (Phase 16.5,
 * hazard 5). These are not cosmetics, they are the second half of session
 * IDENTITY: every pane that is alive on the private socket RIGHT NOW carries
 * this spelling, and a renamed app that only looked for `TORTIE_*` would fail
 * to recognise its own running sessions — the same class of loss as renaming
 * the socket. Emitting both was considered and rejected: two names for one
 * fact is two things to keep in step, and the old one can never be retired
 * while a session started under it is still running. The user never sees
 * them; the user's own tooling might.
 */
export function managedPaneEnv(sessionId: string): Record<string, string> {
  return { GMUX_MANAGED: '1', GMUX_SESSION_ID: sessionId };
}

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
