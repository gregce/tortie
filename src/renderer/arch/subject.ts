/**
 * The Architecture subject's two mounted parts, behind ONE door (Phase 165).
 *
 * `./lazy.tsx` imports this file with a single `import()`, so Rollup emits the
 * header, the view, the drill, the promises section and their stylesheets as
 * one chunk rather than two. Nothing else imports this file, and nothing here
 * runs: it is two re-exports.
 */

export { ArchHeader } from './ArchHeader';
export { ArchView } from './ArchView';
