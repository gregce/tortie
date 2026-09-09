/**
 * baselines domain (Phase 243) — the main-process half of "the baseline
 * outlives the tab".
 *
 * Read src/shared/baselines.ts for what a baseline is and for the one thing
 * this store may never be mistaken for, which is a backup.
 *
 * INTEGRATOR wiring (src/main/capabilities.ts):
 *   registerBaselinesIpc(ipcMain);     // beside registerDropIpc, at app ready
 *   startBaselineStorePruning();       // after the window exists; unref'd timer
 */

export {
  baselinesDir,
  baselineStore,
  registerBaselinesIpc,
  startBaselineStorePruning
} from './ipc';
export {
  baselineKeyName,
  createBaselineStore,
  BASELINE_GENERATIONS,
  BASELINE_MAX_AGE_MS,
  BASELINE_MAX_DIR_BYTES,
  BASELINE_PRUNE_INTERVAL_MS,
  BASELINE_SWEEP_MIN_MS,
  type BaselineStore,
  type BaselineStoreDeps
} from './store';
