/**
 * The usage domain barrel (Phase 181): the subscription meter's service and
 * its one IPC registrar.
 *
 * The domain reads the person's own stored agent credential, calls the vendor
 * that issued it, and answers with numbers. It writes no credential, refreshes
 * no token, spawns no process and stores nothing on disk.
 */

export { disposeUsageService, registerUsageIpc, usageService } from './ipc';
export { createUsageService, type UsageService } from './service';
