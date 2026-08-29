/**
 * The IPC rate sample (Phase 163).
 *
 * Two integers and one boolean. The one typed `handle` in src/main/typed-ipc.ts
 * calls `noteInvoke` on every renderer request, and so do the two raw
 * `ipcMain.on` listeners in src/main/attach/attach-host.ts, being keystrokes
 * and the flow control ack the renderer sends for every data chunk, which
 * is the busiest call up in the app. `noteEvent` is called on every
 * push: the two typed senders in src/main/typed-events.ts, and the four raw
 * senders that carry the bulk of the traffic, being terminal bytes and exits
 * in src/main/attach/attach-host.ts, search results in src/main/search/ipc.ts
 * and clone progress in src/main/projects/index.ts. The first build counted
 * only the typed pair, so a streaming terminal read as one or two pushes while
 * hundreds of chunks crossed; __tests__/ipc-sample-sites.test.ts now scans
 * every raw send under src/main for the branch beside it, and every raw
 * listener for the branch inside it. When no capture is
 * open the boolean is false and each call is one branch, which is the whole
 * cost of this module while the surface is closed.
 *
 * A capture arms the counters at `begin` and reads them at `finish`. Nothing
 * here runs on a timer, and an abandoned capture leaves the flag set over
 * two integers until the next begin replaces it, which is not a leak and
 * not a number anybody sees.
 *
 * Pure Node, no electron import, so the unit test runs in plain node.
 */

let sampling = false;
let invokes = 0;
let events = 0;
let startedAt = 0;

/** Count one renderer to main invoke. One branch when no capture is open. */
export function noteInvoke(): void {
  if (sampling) invokes += 1;
}

/** Count one main to renderer push. One branch when no capture is open. */
export function noteEvent(): void {
  if (sampling) events += 1;
}

/** Arm the counters. A second begin replaces the first window. */
export function beginIpcSample(now: number = Date.now()): void {
  sampling = true;
  invokes = 0;
  events = 0;
  startedAt = now;
}

export interface IpcSampleResult {
  invokes: number;
  events: number;
  windowMs: number;
}

/**
 * Disarm and read. Answers zeros over a zero window when no capture was
 * open, so a finish without a begin is an empty answer rather than a throw.
 */
export function endIpcSample(now: number = Date.now()): IpcSampleResult {
  if (!sampling) return { invokes: 0, events: 0, windowMs: 0 };
  sampling = false;
  const out = { invokes, events, windowMs: Math.max(0, now - startedAt) };
  invokes = 0;
  events = 0;
  return out;
}

/** True while a capture window is open. Diagnostics and tests only. */
export function ipcSampleArmed(): boolean {
  return sampling;
}
