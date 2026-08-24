/**
 * Catch Me Up (Phase 137): the per provider reader, the overview store, the
 * service that joins manifest rows to log files, the git corroboration mark,
 * the story a session told version by version (Phase 143), and the one
 * `overview:*` registrar.
 */

export * from './reader';
export * from './store';
export * from './service';
export * from './git-mark';
export * from './timeline';
export { disposeOverviewIpc, overviewStore, registerOverviewIpc } from './ipc';
export * from './fold';
