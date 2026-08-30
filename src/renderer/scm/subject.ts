/**
 * The Source Control subject's two mounted parts, behind ONE door (Phase 165).
 *
 * `./lazy.tsx` imports this file with a single `import()`, so Rollup emits the
 * branch header, the changes and history sections, the runs sections and
 * their stylesheets as one chunk rather than two. Nothing else imports this
 * file, and nothing here runs: it is two re-exports.
 */

export { BranchHeader } from './BranchHeader';
export { ScmSection } from './ScmSection';
