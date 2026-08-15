/**
 * Copy diagnostics (Phase 35, research 42 section 14).
 *
 * The app-wide sibling of the scrollback report: pull-only, plain text, a
 * Copy button in Settings. Three sections — the boot snapshot, the last 200
 * lines of app.log, and the crash dump inventory as names, sizes and dates.
 * NEVER dump bytes. The text goes to the clipboard, so the user reads every
 * line before it goes anywhere.
 *
 * The log tail is already redacted (write-time redaction); the freshly
 * built halves pass through the same redaction here, so the whole bundle is
 * safe by construction.
 *
 * Pure over its input, so the unit tests read the exact text. The file
 * read and the live collection happen in ./ipc.ts.
 */

import type { LogLevel } from './format';
import { redactString } from './redact';
import type { BootEnvRaw } from './snapshot';
import type { CrashDumpInfo } from './crash';

/** How many app.log lines the bundle carries. */
export const DIAGNOSTICS_TAIL_LINES = 200;

export interface DiagnosticsInput {
  /** ISO timestamp for the header line. */
  generatedAt: string;
  env: BootEnvRaw;
  /** The last lines of app.log, already redacted on disk. */
  logTail: string[];
  dumps: CrashDumpInfo[];
  level: LogLevel;
  fileLoggingOn: boolean;
  /** The home directory prefix the boot half is redacted against. */
  homeDir: string;
}

function bootSection(env: BootEnvRaw, level: LogLevel, fileOn: boolean): string[] {
  const gib = (env.memTotalBytes / 1024 ** 3).toFixed(1);
  const lines = [
    '[boot]',
    `Tortie ${env.appVersion}, Electron ${env.electronVersion}, packaged ${env.packaged}`,
    `macOS ${env.osVersion}, ${env.arch}, ${env.cpuCount} cores, ${gib} GiB`
  ];
  for (const d of env.displays) {
    lines.push(
      `display ${d.w}x${d.h} at ${d.scale}x, ${d.internal ? 'internal' : 'external'}`
    );
  }
  lines.push(
    env.tmuxVersion === null
      ? `tmux not found, socket ${env.tmuxSocket ?? 'unknown'}`
      : `${env.tmuxVersion}, socket ${env.tmuxSocket ?? 'unknown'}`,
    `PATH entries ${env.pathEntries}`,
    `log level ${level}, file logging ${fileOn ? 'on' : 'off'}`
  );
  return lines;
}

function dumpStamp(mtimeMs: number): string {
  const d = new Date(mtimeMs);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** The whole plain-text bundle, exactly what lands on the clipboard. */
export function buildDiagnosticsText(input: DiagnosticsInput): string {
  const fresh: string[] = [
    `Tortie diagnostics, generated ${input.generatedAt}`,
    '',
    ...bootSection(input.env, input.level, input.fileLoggingOn)
  ];

  const dumpLines =
    input.dumps.length === 0
      ? ['none']
      : input.dumps.map(
          (d) => `${d.name}  ${d.bytes} bytes  ${dumpStamp(d.mtimeMs)}`
        );

  const tail =
    input.logTail.length === 0 ? ['none'] : input.logTail;

  return [
    ...fresh.map((line) => redactString(line, input.homeDir)),
    '',
    `[log tail, last ${DIAGNOSTICS_TAIL_LINES} lines of app.log]`,
    ...tail,
    '',
    '[crash dumps]',
    ...dumpLines.map((line) => redactString(line, input.homeDir)),
    ''
  ].join('\n');
}
