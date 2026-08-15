/**
 * process-gone.ts. One log line when a helper or renderer process dies.
 *
 * Phase 28. On 2026-08-14 the operator closed the laptop lid and the wake
 * killed the Chromium GPU helper. Chromium respawned it in under 1 second
 * and nothing was lost. A packaged build had no record the event ever
 * happened, because nothing in main listened for `child-process-gone` or
 * `render-process-gone`. This module adds the two listeners. It logs and
 * does nothing else. No dialog, no toast, no state change, no rethrow.
 *
 * PHASE 35 CLOSED THE OTHER HALF OF THAT GAP. Phase 28's two listeners wrote
 * console.warn only, so in a packaged build the new lines were discarded at
 * the moment they were produced, which is the exact failure Phase 28 existed
 * to end. Each listener now also writes one durable `process.gone` record
 * with the research 42 §9 fields, and the console line is unchanged so dev
 * terminals read the same. `formatChildGone` and `formatRendererGone` stay
 * as the console half; `childGoneFields` and `rendererGoneFields` are the
 * record half, and both halves decode the wait status with the same rule.
 *
 * The emitter is injected the same way power/index.ts injects powerMonitor,
 * so the module unit tests in the node environment without Electron.
 * index.ts passes `app` and registers at module scope, because the GPU
 * process can die before `whenReady` resolves.
 *
 * We register the app level `render-process-gone` rather than the per
 * window form. One registration covers the main window, the settings
 * window and every hidden harness window, and it needs no edit inside
 * `createWindow`. The logged behavior is the same.
 */

import { logEvent } from '../log';

/** The fields Electron's `child-process-gone` details carry that we log. */
export interface ChildGoneDetails {
  type: string;
  reason: string;
  exitCode: number;
  name?: string;
  serviceName?: string;
}

/** The fields Electron's `render-process-gone` details carry that we log. */
export interface RendererGoneDetails {
  reason: string;
  exitCode: number;
}

/**
 * The two `on` overloads this module needs from Electron's `app`. Hand
 * written and narrow, so a plain EventEmitter can stand in for it in tests.
 */
export interface AppGoneEvents {
  on(
    event: 'child-process-gone',
    listener: (event: unknown, details: ChildGoneDetails) => void
  ): unknown;
  on(
    event: 'render-process-gone',
    listener: (
      event: unknown,
      contents: unknown,
      details: RendererGoneDetails
    ) => void
  ): unknown;
}

/**
 * `exitCode` on these events is the raw wait status, not the code the
 * process passed to exit. When the status is a positive multiple of 256 the
 * real code is the status divided by 256, and the line carries both. The
 * 2026-08-14 event reads `exitCode=8704 realCode=34`, and 34 is Chromium's
 * deliberate exit for a lost Graphite context.
 */
function decodeSuffix(exitCode: number): string {
  const real = decodeRealCode(exitCode);
  return real === undefined ? '' : ` realCode=${real}`;
}

/**
 * The decoded exit code, or undefined when the wait status does not decode.
 * One rule, used by both the console line and the record, so the two can
 * never disagree about what 8704 means.
 */
export function decodeRealCode(exitCode: number): number | undefined {
  if (exitCode > 0 && exitCode % 256 === 0) return exitCode / 256;
  return undefined;
}

/** The exact body of the helper death log line. */
export function formatChildGone(d: ChildGoneDetails): string {
  let line =
    `[gmux] helper process gone: type=${d.type} reason=${d.reason}` +
    ` exitCode=${d.exitCode}${decodeSuffix(d.exitCode)}`;
  const label = [d.name, d.serviceName].find(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  if (label !== undefined) line += ` name=${label}`;
  return line;
}

/** The exact body of the renderer death log line. */
export function formatRendererGone(d: RendererGoneDetails): string {
  return (
    `[gmux] renderer process gone: reason=${d.reason}` +
    ` exitCode=${d.exitCode}${decodeSuffix(d.exitCode)}`
  );
}

/**
 * The `process.gone` record's fields for a helper death (research 42 §9).
 *
 * `kind` is "child". `ptype` is Electron's `type`, e.g. "GPU". `realCode` is
 * present only when the wait status decodes, and `name` only when Electron
 * gave one, because a field that is sometimes a guess is worse than a field
 * that is sometimes absent.
 */
export function childGoneFields(d: ChildGoneDetails): Record<string, unknown> {
  const label = [d.name, d.serviceName].find(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  const real = decodeRealCode(d.exitCode);
  return {
    kind: 'child',
    ptype: d.type,
    reason: d.reason,
    exitCode: d.exitCode,
    ...(real !== undefined ? { realCode: real } : {}),
    ...(label !== undefined ? { name: label } : {})
  };
}

/** The `process.gone` record's fields for a renderer death. `kind` is "renderer". */
export function rendererGoneFields(
  d: RendererGoneDetails
): Record<string, unknown> {
  const real = decodeRealCode(d.exitCode);
  return {
    kind: 'renderer',
    reason: d.reason,
    exitCode: d.exitCode,
    ...(real !== undefined ? { realCode: real } : {})
  };
}

/**
 * Wire both listeners. Each one writes the console line and one durable
 * `process.gone` record. Log only. No dialog, no toast, no state change, no
 * rethrow.
 *
 * `console: false` on the record, because the console half is the Phase 28
 * line right above it and dev terminals must not read the event twice.
 */
export function installProcessGoneLogging(emitter: AppGoneEvents): void {
  emitter.on('child-process-gone', (_event, details) => {
    console.warn(formatChildGone(details));
    logEvent(
      'proc',
      'warn',
      'process.gone',
      'helper process gone',
      childGoneFields(details),
      { console: false }
    );
  });
  emitter.on('render-process-gone', (_event, _contents, details) => {
    console.warn(formatRendererGone(details));
    logEvent(
      'proc',
      'warn',
      'process.gone',
      'renderer process gone',
      rendererGoneFields(details),
      { console: false }
    );
  });
}
