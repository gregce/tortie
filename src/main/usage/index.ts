/**
 * The usage domain barrel (Phase 181): the subscription meter's service and
 * its one IPC registrar.
 *
 * The domain reads the person's own stored agent credential, calls the vendor
 * that issued it, and answers with numbers. It writes no credential and
 * refreshes no token. The ONE process it starts is the keychain read, and since
 * Phase 200 that goes through the guarded child registry every other child of
 * Tortie's goes through.
 *
 * ONE PROVIDER IS RECEIVED RATHER THAN ASKED (Phase 374). Antigravity's numbers
 * are written by Tortie's own script into one folder under Tortie's own data,
 * and that folder is the only thing this domain keeps on disk: no credential
 * and no address is in it, turning the switch off removes it, and nothing in
 * `./antigravity/` names a host, a keychain or a process.
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
