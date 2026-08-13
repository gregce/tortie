/**
 * The general fault harness (Phase 19 item 1).
 *
 * This barrel re-exports the INJECTION CHANNEL only. `./harness` holds the
 * workload and the survey, and it imports the session core, so exporting it
 * here would put a cycle between `sessions/core.ts` and this directory. The
 * `GMUX_SMOKE` switch in src/main/index.ts imports `./fault/harness` directly,
 * the same way the restore modules are imported as leaves.
 */

export {
  FAULT_POINTS,
  armedFault,
  faultCounts,
  faultPoint,
  parseFaultSpec,
  __resetFaultsForTests,
  type FaultPointName,
  type FaultSpec
} from './inject';
