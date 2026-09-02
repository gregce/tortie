/**
 * The usage domain barrel (Phase 181): the subscription meter's service and
 * its one IPC registrar.
 *
 * The domain reads the person's own stored agent credential, calls the vendor
 * that issued it, and answers with numbers. It writes no credential, refreshes
 * no token and stores nothing on disk. The ONE process it starts is the
 * keychain read, and since Phase 200 that goes through the guarded child
 * registry every other child of Tortie's goes through.
 */

export {
  applyUsageTap,
  disposeUsageService,
  registerUsageIpc,
  usageService,
  usageShutdownStarted
} from './ipc';
export {
  createUsageService,
  type TapOutcome,
  type UsageService,
  type UsageShutdownReport
} from './service';
