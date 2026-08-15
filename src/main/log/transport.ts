/**
 * The file transport configuration (Phase 35, research 42 section 8 spike).
 *
 * Spiked before building (electron-log 5.4.4): a format FUNCTION returning
 * the data array emits our prebuilt JSON line byte for byte — the transform
 * chain ends in util.formatWithOptions, which leaves a single string
 * argument untouched, including `%s` shapes inside it — and the archive
 * function replaces the default `.old` rename with the Phase 31 `.1`
 * convention. This module holds that configuration as plain functions over
 * an electron-log-shaped transport, so the rotation unit test applies THE
 * SHIPPING CONFIG to electron-log/node and proves the pair bound without
 * an Electron process.
 *
 * The wrapper (./index.ts) is still the only importer of electron-log
 * itself; this file only shapes the object it is handed.
 */

import { renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const LOG_FILE_NAME = 'app.log';
/** The rotation cap: 2 MiB, and app.log.1 makes the pair 4 MiB. */
export const LOG_MAX_BYTES = 2_097_152;

/** What the archive step does: app.log becomes app.log.1, replacing it. */
export function archiveAppLog(oldPath: string): void {
  renameSync(oldPath, join(dirname(oldPath), `${LOG_FILE_NAME}.1`));
}

/**
 * The stand-in for electron-log's console transport.
 *
 * Console duty belongs to the wrapper (the `[gmux-<scope>]` prefixes), so
 * electron-log's own console transport is reduced to ONE job. `level: false`
 * makes the logger's dispatch loop skip it for every ordinary message
 * (Logger.js checks `transFn.level === false` first). What still reaches it
 * is the file transport's write-failure path, which calls
 * `logger.transports.console(...)` DIRECTLY and so is not level filtered.
 * That is where the one console warning per run comes from, which is the
 * exact updates/log.ts rule: the log must never become the thing that breaks
 * the app, and it must not turn one broken disk into a screen of noise
 * either.
 *
 * `onFirstFailure` is called at most once, however many writes fail.
 */
export interface ConsoleShim {
  (...args: unknown[]): void;
  level: false;
  writeFn: () => void;
}

export function makeWriteFailureShim(
  onFirstFailure: () => void
): ConsoleShim {
  let warned = false;
  const shim = ((): void => {
    if (warned) return;
    warned = true;
    onFirstFailure();
  }) as ConsoleShim;
  shim.level = false;
  shim.writeFn = (): void => undefined;
  return shim;
}

/** The slice of electron-log's file transport this module configures. */
export interface FileTransportLike {
  level: string | false;
  maxSize: number;
  resolvePathFn: (...args: unknown[]) => string;
  format: (params: { data: unknown[] }) => unknown[];
  archiveLogFn: (file: { toString(): string; crop(bytes?: number): void }) => void;
}

/**
 * Point the transport at `<logsDir>/app.log` with the 2 MiB cap, the
 * pass-through format (the wrapper prebuilds the JSON line), and the `.1`
 * archive rename. `level` false keeps the file closed (dev without
 * GMUX_LOG_FILE=1).
 */
export function configureFileTransport(
  file: FileTransportLike,
  logsDir: string,
  level: string | false
): void {
  file.level = level;
  file.maxSize = LOG_MAX_BYTES;
  file.resolvePathFn = () => join(logsDir, LOG_FILE_NAME);
  // The wrapper passes exactly one prebuilt JSON string per message; emit it
  // as-is. No prefix, no suffix — the transport owns the line separator.
  file.format = ({ data }) => data;
  file.archiveLogFn = (fileObj) => {
    try {
      archiveAppLog(fileObj.toString());
    } catch {
      // The rename failed (e.g. the file vanished). Crop rather than grow
      // without bound — the budget beats completeness.
      try {
        fileObj.crop(256 * 1024);
      } catch {
        /* never throw into a log call */
      }
    }
  };
}
