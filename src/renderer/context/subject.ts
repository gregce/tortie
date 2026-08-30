/**
 * The Context subject's mounted parts, behind ONE door (Phase 165).
 *
 * `./lazy.tsx` imports this file with a single `import()`, so Rollup emits the
 * header, the view with its rows, hover card and enable dialog, the install
 * sheet and dialog, and their stylesheets as one chunk rather than three. The
 * install host is behind the same door because it is only ever opened from
 * inside the view, so the chunk is already loaded when it is needed. Nothing
 * else imports this file, and nothing here runs: it is three re-exports.
 */

export { ContextHeader } from './ContextHeader';
export { ContextSubject } from './ContextSubject';
export { ContextInstallHost } from './install/InstallHost';
