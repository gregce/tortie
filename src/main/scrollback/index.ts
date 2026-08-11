/**
 * Scrollback domain barrel (Phase 13.7) — on-demand facts, the cost report,
 * and the two thresholds allowed to speak unasked.
 *
 * There is no timer and no cache in this domain. Everything is read when a
 * human asks for it, and the one thing that arrives unasked is a crossed
 * threshold with an action attached.
 */

export {
  buildScrollbackReport,
  parseStatsLines,
  readFreeDiskBytes,
  readSavedFacts,
  readScrollbackStats,
  readSessionScrollback,
  type ScrollbackServiceDeps
} from './service';
export {
  LOW_DISK_BYTES,
  SAVED_SCROLLBACK_ALERT_BYTES,
  ScrollbackWatch,
  type ScrollbackSample,
  type ScrollbackWatchDeps
} from './watch';
