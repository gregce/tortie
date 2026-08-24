/**
 * The public surface of the overview store (Phase 137, spec section 5.3).
 *
 * The store is disposable with a stated cost. Deleting it loses turns whose
 * provider has since deleted them from disk. See ./store.ts for the rules
 * every write keeps and ./schema.ts for the four tables.
 */

export { OVERVIEW_SCHEMA_VERSION, OVERVIEW_TABLES } from './schema';
export { OverviewStore, openOverviewStore } from './store';
export type {
  NewFoldVersion,
  StoredReadState,
  StoredSession,
  StoredSummary,
  StoredSummaryVerdict,
  StoredTurn
} from './store';
