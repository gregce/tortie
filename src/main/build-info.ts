/**
 * build-info.ts — which commit is this app, answered by the app itself.
 *
 * Phase 17 installs Tortie as the user's daily driver, and from that moment
 * "is the thing in /Applications the thing in git?" stops being a question an
 * agent can answer for them by reading a build log. The About panel has to
 * answer it, so the short SHA is baked in at build time by a `define` in
 * electron.vite.config.ts (main config) and read here.
 *
 * `typeof` rather than a bare read: a test importing this module runs without
 * the define, and `typeof` on an undeclared identifier is the one form that
 * does not throw. The fallback is 'dev' — honest about not knowing rather
 * than guessing a SHA.
 *
 * The `-dirty` suffix is load-bearing, not decoration: a build made from an
 * edited working tree is NOT the commit it names, and the one moment that
 * matters is exactly this one — someone comparing an installed app against
 * HEAD before trusting it with 45 live sessions.
 */

declare const __TORTIE_BUILD_COMMIT__: string;

export const BUILD_COMMIT: string =
  typeof __TORTIE_BUILD_COMMIT__ === 'string' && __TORTIE_BUILD_COMMIT__
    ? __TORTIE_BUILD_COMMIT__
    : 'dev';
