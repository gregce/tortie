/**
 * The five log channels (Phase 35, spec section 5).
 *
 * log:append is the renderer error capture path; the bounds live in
 * ./append.ts and the write lands with proctype "renderer" and the
 * SENDER's OS pid — never a pid from the payload. The other four back the
 * Settings Diagnostics section: read the level, switch it at runtime, open
 * the logs folder, and build the Copy diagnostics text.
 */

import { shell, type IpcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { handle } from '../typed-ipc';
import { AppendBudget, sanitizeRendererLine } from './append';
import { buildDiagnosticsText, DIAGNOSTICS_TAIL_LINES } from './diagnostics';
import {
  getLogLevel,
  getLogsDir,
  isFileLoggingOn,
  listCrashDumps,
  logEvent,
  setLogLevel,
  writeRendererLine
} from './index';
import { collectBootEnvRaw } from './snapshot';

const VALID_LEVELS: readonly string[] = ['error', 'warn', 'info', 'debug'];

/** The last `count` lines of app.log, or [] when there is no file yet. */
function readLogTail(count: number): string[] {
  try {
    const path = join(getLogsDir(), 'app.log');
    if (!existsSync(path)) return [];
    const lines = readFileSync(path, 'utf8').split('\n');
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.slice(-count);
  } catch {
    return [];
  }
}

/** Register the five handlers. Called once from installMainCapabilities. */
export function registerLogIpc(ipcMain: IpcMain): void {
  const budget = new AppendBudget();

  handle(ipcMain, 'log:append', (event, line) => {
    const clean = sanitizeRendererLine(line);
    if (clean === null) return; // dropped whole, never a crash
    const senderId = event.sender.id;
    const verdict = budget.take(senderId);
    if (verdict === 'drop') return;
    let senderPid: number;
    try {
      senderPid = event.sender.getOSProcessId();
    } catch {
      return; // a sender mid-teardown writes nothing
    }
    if (verdict === 'cap') {
      logEvent(
        clean.scope,
        'warn',
        'log.capped',
        'this window reached its line budget for this run. Every later line from it is dropped.',
        { senderId },
        { console: false }
      );
      return;
    }
    writeRendererLine(
      clean.scope,
      clean.level,
      clean.msg,
      clean.fields,
      senderPid
    );
  });

  handle(ipcMain, 'log:level', () => getLogLevel());

  handle(ipcMain, 'log:setLevel', (_event, level) => {
    // An unknown level is dropped whole rather than guessed at.
    if (!VALID_LEVELS.includes(level)) return;
    setLogLevel(level);
  });

  handle(ipcMain, 'log:openFolder', async () => {
    const dir = getLogsDir();
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      /* a folder that cannot be created still gets the open attempt */
    }
    await shell.openPath(dir);
  });

  handle(ipcMain, 'log:diagnostics', async () => {
    return buildDiagnosticsText({
      generatedAt: new Date().toISOString(),
      env: await collectBootEnvRaw(),
      logTail: readLogTail(DIAGNOSTICS_TAIL_LINES),
      dumps: listCrashDumps(),
      level: getLogLevel(),
      fileLoggingOn: isFileLoggingOn(),
      homeDir: homedir()
    });
  });
}
