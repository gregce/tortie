/**
 * The NDJSON envelope builder (Phase 35, research 42 section 9).
 *
 * One JSON object per line, fixed field names on every line:
 *
 *   {"ts":"...","level":"info","scope":"boot","pid":66979,"proctype":"main","msg":"..."}
 *
 * - `ts` is ISO 8601 UTC with milliseconds.
 * - `level` is one of error, warn, info, debug.
 * - `scope` is the domain, one lowercase word.
 * - `proctype` is one of main, renderer, gpu, utility.
 * - Typed records add an `event` field and their own named fields. Free-text
 *   logging adds nothing.
 *
 * Redaction runs HERE, on every string of every record, before the line
 * exists, so no caller can put an unredacted line on disk.
 *
 * Pure. No electron import, so the unit tests assert the three schemas in
 * plain node.
 */

import { redactString, redactValue } from './redact';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogProcType = 'main' | 'renderer' | 'gpu' | 'utility';

export interface LogLineInput {
  /** ISO 8601 UTC with milliseconds, e.g. new Date().toISOString(). */
  ts: string;
  level: LogLevel;
  /** One lowercase word, e.g. "boot", "proc", "updates". */
  scope: string;
  pid: number;
  proctype: LogProcType;
  msg: string;
  /** Present on typed records only, e.g. "boot.env", "process.gone". */
  event?: string;
  /** The typed record's named fields, spread beside msg. */
  fields?: Record<string, unknown>;
  /** The home directory prefix redaction replaces with `~`. */
  homeDir: string;
}

/**
 * Build the one-line JSON string. Exactly one line: no prefix, no suffix,
 * no newline of its own — the transport owns the line separator.
 */
export function buildLogLine(input: LogLineInput): string {
  const record: Record<string, unknown> = {
    ts: input.ts,
    level: input.level,
    scope: input.scope,
    pid: input.pid,
    proctype: input.proctype
  };
  if (input.event !== undefined) record['event'] = input.event;
  record['msg'] = redactString(input.msg, input.homeDir);
  if (input.fields !== undefined) {
    for (const [key, value] of Object.entries(input.fields)) {
      // The envelope's own names win; a field cannot overwrite ts or level.
      if (key in record) continue;
      record[key] = redactValue(value, input.homeDir);
    }
  }
  return JSON.stringify(record);
}
