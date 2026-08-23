/**
 * What counts as a harness launch, in one place (Phase 127).
 *
 * WHY THIS FILE EXISTS. The predicate was written twice with two different
 * meanings, in src/main/tmux/resolve.ts and in src/main/index.ts. Neither
 * spelling was wrong and merging them would be. So all three live here, each
 * named for what it decides, with the reason on it. Read the reasons before
 * changing any of them: the differences between the three are the safety.
 *
 * This module imports nothing. It reads an environment record it is handed and
 * returns a boolean.
 */

/** True when the value is set to something other than the empty string. */
function set(env: NodeJS.ProcessEnv, name: string): boolean {
  return (env[name] ?? '') !== '';
}

/**
 * The launch is a harness run, so `GMUX_TMUX_SOCKET` is honoured.
 *
 * This is the SAFETY predicate and it is the widest of the three. A
 * `GMUX_TMUX_SOCKET` left in a shell profile must never move a person's real
 * app onto a second, empty tmux server, so the variable is ignored unless one
 * of these four terms is set. `GMUX_PROBES` counts here at ANY value,
 * including `0`, because a run that says it is a probe run is a probe run for
 * the purpose of choosing a socket. Narrowing this to `=== '1'` would make
 * `GMUX_PROBES=0` attach to socket `gmux`, which is the operator's live
 * server, and build/probe-p127-probes.mjs launches exactly that way.
 *
 * `GMUX_UPDATE_REHEARSAL` is here and deliberately absent from
 * `isIsolatedLaunch` below. A rehearsal launch must still take the
 * single-instance lock. The lock lives in the isolated profile the rehearsal
 * always passes, so it protects the rehearsal without touching the operator's
 * instance.
 */
export function isHarnessLaunch(env: NodeJS.ProcessEnv): boolean {
  return (
    set(env, 'GMUX_SMOKE') ||
    set(env, 'GMUX_SHOT') ||
    set(env, 'GMUX_UPDATE_REHEARSAL') ||
    set(env, 'GMUX_PROBES')
  );
}

/**
 * The renderer is told to load its harness drives.
 *
 * This decides one thing only, being whether main appends `harness=1` to the
 * renderer's own URL, which is the whole gate on
 * src/renderer/app/probe-registry.ts.
 *
 * IT IS NOT `isHarnessLaunch`, and the difference is exactly one value.
 * `GMUX_PROBES` must be the string `1` here. Every other value, `0` included,
 * leaves the probes out while still being a harness launch for the socket
 * above. That pair is what lets build/probe-p127-probes.mjs run its unarmed
 * leg safely: `GMUX_PROBES=0` keeps the scratch socket AND keeps the probes
 * out, so the two legs differ in one variable and nothing else.
 *
 * The three older terms count at any value, because every existing harness
 * already sets one of them and this phase changes no harness.
 *
 * `npm run dev` sets none of the four. A person driving the dev app by hand
 * who wants the drives sets `GMUX_PROBES=1`, which is the one switch that
 * does not also arm the updater rehearsal.
 */
export function probesRequested(env: NodeJS.ProcessEnv): boolean {
  return (
    set(env, 'GMUX_SMOKE') ||
    set(env, 'GMUX_SHOT') ||
    set(env, 'GMUX_UPDATE_REHEARSAL') ||
    env['GMUX_PROBES'] === '1'
  );
}

/**
 * The launch runs on a throwaway profile of its own. It decides two things.
 *
 * 1. Whether Chromium runs with `use-mock-keychain`, because a probe that
 *    redirects HOME has no keychain and macOS would wait on a modal.
 * 2. Whether the single-instance lock is skipped, because several of these run
 *    at the same time as each other and a lock would make one exit instead of
 *    doing its job.
 *
 * It is the two-term test, and it must stay two terms. Widening it to the
 * three or four `isHarnessLaunch` reads would change which launches skip the
 * lock, and no phase that only moves code is allowed to change that.
 */
export function isIsolatedLaunch(env: NodeJS.ProcessEnv): boolean {
  return set(env, 'GMUX_SMOKE') || set(env, 'GMUX_SHOT');
}
