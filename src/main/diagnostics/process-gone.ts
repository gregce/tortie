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
  if (exitCode > 0 && exitCode % 256 === 0) {
    return ` realCode=${exitCode / 256}`;
  }
  return '';
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
 * Wire both listeners. Each one formats the line and warns. Log only. No
 * dialog, no toast, no state change, no rethrow.
 */
export function installProcessGoneLogging(emitter: AppGoneEvents): void {
  emitter.on('child-process-gone', (_event, details) => {
    console.warn(formatChildGone(details));
  });
  emitter.on('render-process-gone', (_event, _contents, details) => {
    console.warn(formatRendererGone(details));
  });
}
