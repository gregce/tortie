/**
 * migrate — one-time data moves the app performs before it opens (Phase 16.5).
 *
 * Today there is exactly one: carrying `~/Library/Application Support/gmux`
 * across the rename to Tortie. See ./userdata.ts for the whole argument.
 */

import type { App } from 'electron';
import {
  decideMigrationSite,
  migrateUserData,
  type MigrationResult
} from './userdata';
import { getLog } from '../log';

/**
 * Scope "migrate" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const migrateLog = getLog('migrate');


export {
  FAILURE_STAMP,
  NOTICE_STAMP,
  renameFailureDetail,
  renameNoticeDetail,
  showRenameNoticeOnce,
  type RenameNoticeInput,
  type RenameNoticeOutcome
} from './notice';

export {
  LEGACY_APP_NAME,
  MIGRATION_MARKER,
  decideMigrationSite,
  migrateUserData,
  readMigrationMarker,
  isRegenerableEntry,
  type MarkerFile,
  type MigrationResult,
  type MigrationReason,
  type MigrationStatus,
  type DbVerification
} from './userdata';

/**
 * Run the userData migration if this launch is the first one under a new app
 * name. **Call before `app.whenReady()` and before anything reads
 * `app.getPath('userData')`** — synchronous on purpose, so no window, no
 * SQLite open and no Chromium profile initialisation can interleave with a
 * directory that is mid-publish.
 *
 * Returns a result instead of throwing: a migration that cannot run is a
 * problem, an app that will not launch is a catastrophe.
 */
export function migrateUserDataIfNeeded(app: App): MigrationResult {
  const skeleton = {
    entries: [],
    skipped: [],
    files: 0,
    bytes: 0,
    databases: [],
    movedAside: [],
    warnings: [],
    ms: 0
  };
  try {
    const decision = decideMigrationSite({
      appDataDir: app.getPath('appData'),
      appName: app.getName(),
      userDataDir: app.getPath('userData'),
      env: process.env
    });
    if (!decision.migrate) {
      return {
        ...skeleton,
        status: 'skipped',
        reason: decision.reason,
        legacyDir: '',
        targetDir: app.getPath('userData'),
        summary: `no userData migration — ${decision.detail}`
      };
    }
    return migrateUserData(decision.site);
  } catch (err) {
    const message = (err as Error).message;
    migrateLog.error(`could not evaluate the migration: ${message}`);
    return {
      ...skeleton,
      status: 'failed',
      reason: 'error',
      legacyDir: '',
      targetDir: '',
      summary: message,
      warnings: [message]
    };
  }
}
