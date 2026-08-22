/**
 * THE log wrapper (Phase 35, research 42 section 12).
 *
 * Exactly one file in the tree imports electron-log: this one. If the
 * framework disappoints, one file changes, and
 * build/assert-import-boundaries.mjs fails the build when a second importer
 * appears anywhere in src/.
 *
 * What it does:
 * - One bounded NDJSON file per profile at `<userData>/logs/app.log`,
 *   2 MiB plus a 2 MiB app.log.1 (the Phase 31 pair convention).
 * - The file transport writes when app.isPackaged, or when GMUX_LOG_FILE=1
 *   (so probes and harnesses can read the file from an unpackaged run).
 *   Dev without the env keeps today's behavior exactly.
 * - The console side keeps human-readable prefixes, so dev terminals see
 *   what they see today. Harness protocol families ([gmux-fault],
 *   [gmux-smoke], [gmux-conf], [gmux-shot], conformance, search bench)
 *   never route through here — they stay raw console calls.
 * - Every line is redacted at write time (the home directory becomes `~`)
 *   inside ./format.ts, so no caller can put an unredacted line on disk.
 * - A failed file write is swallowed after one console warning per run,
 *   the exact updates/log.ts rule.
 * - electron-log's renderer transport, preload injection and
 *   `__ELECTRON_LOG__` IPC channel are never enabled; initLogging removes
 *   the listeners the import registers. Renderer lines travel over the
 *   typed `log:append` channel only (./ipc.ts).
 * - The log module never throws into a caller. Logging must never become
 *   the thing that breaks the app.
 */

import { app, ipcMain } from 'electron';
import log from 'electron-log/main';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { DurabilityNotice } from '@shared/notice';
import type { LogLevel } from '@shared/ipc';
import { buildLogLine, type LogProcType } from './format';
import {
  scanCrashDumps,
  sweepCrashDumps,
  type CrashDumpInfo
} from './crash';
import { pruneOldLogFiles } from './prune';
import {
  clearRunSentinel,
  readRunSentinel,
  writeRunSentinel
} from './sentinel';
import {
  configureFileTransport,
  makeWriteFailureShim,
  type FileTransportLike
} from './transport';

export type { LogLevel };

/** The four functions a domain logs through. */
export interface ScopedLog {
  error(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  debug(msg: string, fields?: Record<string, unknown>): void;
}

let initialized = false;
let fileOn = false;
let currentLevel: LogLevel = 'info';

/** `<userData>/logs` — also backs the Open logs folder affordance. */
export function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs');
}

/** True when this run writes app.log (packaged, or GMUX_LOG_FILE=1). */
export function isFileLoggingOn(): boolean {
  return fileOn;
}

/**
 * Configure the transports. Runs once, at module scope in src/main/index.ts,
 * before whenReady, so the file catches everything from the first line.
 */
export function initLogging(): void {
  if (initialized) return;
  initialized = true;
  try {
    fileOn = app.isPackaged || process.env['GMUX_LOG_FILE'] === '1';

    // The import of electron-log/main registered `__ELECTRON_LOG__` ipcMain
    // hooks for its renderer transport. Tortie never enables that path —
    // renderer lines come over the typed log:append channel — so the hooks
    // go, whole.
    try {
      ipcMain.removeAllListeners('__ELECTRON_LOG__');
      ipcMain.removeHandler('__ELECTRON_LOG__');
    } catch {
      /* an electron-log version without the hooks is fine */
    }

    // Console duty belongs to this wrapper (the [gmux-*] prefixes below).
    // electron-log's console transport is reduced to ONE job: its file
    // registry reports write failures through it, and the shim turns those
    // into one console warning per run, the exact updates/log.ts rule.
    (log.transports as unknown as Record<string, unknown>)['console'] =
      makeWriteFailureShim(() => {
        console.warn(
          '[gmux-log] could not write logs/app.log. Log lines stay on the ' +
            'console for the rest of this run.'
        );
      });

    // The ipc transport defaults to 'silly' in dev and would relay every
    // main line to renderers for devtools display. Off, permanently.
    if (log.transports['ipc'] !== undefined) {
      log.transports['ipc'].level = false;
    }
    if (log.transports['remote'] !== undefined) {
      log.transports['remote'].level = false;
    }

    configureFileTransport(
      log.transports.file as unknown as FileTransportLike,
      getLogsDir(),
      fileOn ? currentLevel : false
    );
  } catch (err) {
    // A logging setup failure must never stop the app booting.
    console.warn(
      `[gmux-log] logging did not initialize: ${(err as Error).message}`
    );
  }
}

/**
 * The tier 2 runtime switch (Settings → Diagnostics → Debug logging). Not
 * persisted anywhere; a fresh run is back at info.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
  if (fileOn) {
    try {
      log.transports.file.level = level;
    } catch {
      /* never throw into a caller */
    }
  }
}

/** The file transport level right now. */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

const CONSOLE_WRITERS: Record<LogLevel, (line: string) => void> = {
  error: (line) => console.error(line),
  warn: (line) => console.warn(line),
  info: (line) => console.log(line),
  debug: (line) => console.debug(line)
};

interface WriteOptions {
  /** False when the caller keeps its own console line (e.g. writeSync). */
  console?: boolean;
  /** Renderer lines carry the sender's OS pid, never this process's. */
  pid?: number;
  proctype?: LogProcType;
}

/** The one write path every surface below funnels into. Never throws. */
function write(
  scope: string,
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown> | undefined,
  event: string | undefined,
  options: WriteOptions = {}
): void {
  try {
    if (options.console !== false) {
      let line = `[gmux-${scope}] ${msg}`;
      if (fields !== undefined) {
        try {
          line += ` ${JSON.stringify(fields)}`;
        } catch {
          /* unserializable fields stay off the console line */
        }
      }
      CONSOLE_WRITERS[level](line);
    }
    if (!fileOn || !initialized) return;
    const jsonLine = buildLogLine({
      ts: new Date().toISOString(),
      level,
      scope,
      pid: options.pid ?? process.pid,
      proctype: options.proctype ?? 'main',
      msg,
      ...(event !== undefined ? { event } : {}),
      ...(fields !== undefined ? { fields } : {}),
      homeDir: homedir()
    });
    log[level](jsonLine);
  } catch {
    /* the log must never become the thing that breaks the app */
  }
}

/** Free-text logging for one domain. `scope` is one lowercase word. */
export function getLog(scope: string): ScopedLog {
  return {
    error: (msg, fields) => write(scope, 'error', msg, fields, undefined),
    warn: (msg, fields) => write(scope, 'warn', msg, fields, undefined),
    info: (msg, fields) => write(scope, 'info', msg, fields, undefined),
    debug: (msg, fields) => write(scope, 'debug', msg, fields, undefined)
  };
}

/**
 * A typed record (research 42 section 9): the envelope plus `event` and the
 * record's named fields. `options.console: false` is for call sites that
 * keep their own console line (process-gone's Phase 28 line, the quit
 * path's writeSync lines) so dev output is not doubled.
 */
export function logEvent(
  scope: string,
  level: LogLevel,
  event: string,
  msg: string,
  fields?: Record<string, unknown>,
  options?: { console?: boolean }
): void {
  write(scope, level, msg, fields, event, { console: options?.console });
}

/**
 * One renderer line, already validated and bounded by ./ipc.ts. Written
 * with proctype "renderer" and the SENDER's OS pid.
 */
export function writeRendererLine(
  scope: string,
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown> | undefined,
  senderPid: number,
  event?: string
): void {
  write(scope, level, msg, fields, event, {
    console: false,
    pid: senderPid,
    proctype: 'renderer'
  });
}

// ---------------------------------------------------------------------------
// The boot sequence and the crash story (research 42 section 10)
// ---------------------------------------------------------------------------

/**
 * Clear the run sentinel so this exit reads as a quit, not a crash. Called
 * from will-quit, and by the capabilities disposer immediately before its
 * SIGKILL-to-self escape — Phase 36 proved nothing durable is pending at
 * that line, so the sentinel removal is truthful there.
 */
export function clearLogRunSentinel(): void {
  try {
    clearRunSentinel(getLogsDir());
  } catch {
    /* never throw into the quit path */
  }
}

export interface LogBootDeps {
  /** src/main/notice's postDurabilityNotice, injected to avoid a cycle. */
  postNotice: (notice: DurabilityNotice) => boolean;
  /**
   * ./snapshot's collectBootEnv, injected to avoid a cycle. The collector
   * probes tmux, so importing it here would make this module reach the tmux
   * layer, and the tmux layer logs through this module. src/main/index.ts is
   * the composition root and it already imports both sides.
   */
  collectBootEnv: () => Promise<Record<string, unknown>>;
}

/**
 * The whenReady half of the crash story, in research 42 section 10's order:
 * read the sentinel, diff the Crashpad directories, write boot.unclean_exit
 * and post the one quiet notice, sweep the dumps, prune the logs directory,
 * write boot.env, then arm a fresh sentinel and its will-quit removal.
 *
 * SYNCHRONOUS on purpose, every step except the last. The notice must be
 * posted before the window exists, so the renderer either drains it from
 * `notice:pending` or hears the live broadcast, with no race either way. The
 * one asynchronous step is boot.env, because its tmux -V probe is a spawn
 * (19.1 ms measured, 2 s deadline), and no window may wait on a spawn. It is
 * detached and lands a moment later in the same file.
 *
 * Gated on file logging: a harness run that ends with app.exit() (which
 * skips will-quit) cannot leave a sentinel behind and fake a crash at the
 * next smoke boot. Never throws.
 *
 * ONE NOTE FOR WHOEVER PROBES THIS NEXT. Setting GMUX_LOG_FILE=1 on a
 * harness run turns the gate off, and a harness still ends with app.exit().
 * The sentinel therefore survives, and the next boot of that same profile
 * reports an unclean exit that never happened. Give each probe a fresh
 * --user-data-dir, or delete run.json between boots. No shipped build can
 * reach this, because a packaged run quits through will-quit and a harness
 * run is never packaged.
 */
export function runLogBootSequence(deps: LogBootDeps): void {
  if (!fileOn || !initialized) return;
  try {
    const logsDir = getLogsDir();
    const crashpadDir = app.getPath('crashDumps');

    // a. The sentinel: present means the previous run did not exit cleanly.
    const prev = readRunSentinel(logsDir);

    // b. The dump inventory, diffed against what that run had already seen.
    const dumps = scanCrashDumps(crashpadDir);
    if (prev !== null) {
      const seen = new Set(prev.dumpNames);
      const fresh = dumps.filter((d) => !seen.has(d.name));
      // c. The record.
      logEvent(
        'boot',
        'warn',
        'boot.unclean_exit',
        'previous run did not exit cleanly',
        {
          prev: { pid: prev.pid, version: prev.version, bootTs: prev.bootTs },
          dumps: {
            newCount: fresh.length,
            names: fresh.map((d) => d.name),
            bytes: fresh.reduce((sum, d) => sum + d.bytes, 0)
          }
        }
      );
      // d. The one quiet line above the surface. The latch in src/main/notice
      // keeps it at one per run.
      deps.postNotice({ kind: 'unclean-exit', newDumps: fresh.length });
    }

    // e. The dump sweep: newest 5, 30 days.
    sweepCrashDumps(crashpadDir);

    // f. The startup prune, which also ages out the legacy updates.log pair.
    pruneOldLogFiles(logsDir);

    // g. A fresh sentinel, carrying the dump inventory as of THIS boot. It is
    // armed BEFORE the detached snapshot below, so a crash during the tmux
    // probe is still recorded as a crash.
    writeRunSentinel(logsDir, {
      pid: process.pid,
      version: app.getVersion(),
      bootTs: new Date().toISOString(),
      dumpNames: scanCrashDumps(crashpadDir).map((d) => d.name)
    });

    // The clean-exit half: will-quit runs on every real quit.
    app.on('will-quit', () => clearLogRunSentinel());

    // h. The boot environment snapshot, detached because of its one spawn.
    void deps
      .collectBootEnv()
      .then((env) => {
        logEvent('boot', 'info', 'boot.env', 'boot', env, { console: false });
      })
      .catch(() => {
        /* a snapshot that cannot be collected is a missing line, not a boot failure */
      });
  } catch (err) {
    console.warn(
      `[gmux-log] the boot log sequence did not finish: ${(err as Error).message}`
    );
  }
}

/** The dump inventory for Copy diagnostics: names, sizes, dates. No bytes. */
export function listCrashDumps(): CrashDumpInfo[] {
  try {
    return scanCrashDumps(app.getPath('crashDumps'));
  } catch {
    return [];
  }
}
