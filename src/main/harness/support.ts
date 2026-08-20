/**
 * Shared plumbing for the in-app smoke harnesses (Phase 42 stage 3).
 *
 * Every harness in src/main/harness/ logs through the same `[gmux-smoke]`
 * prefix, fails through the same app.exit(1) path, and arms the same
 * watchdog. The byte-flow and process-inspection helpers live here because
 * more than one harness proves its claims with them. Moved out of
 * src/main/index.ts byte for byte; the prefix is parsed by CI and the
 * orchestrator, so keep it stable.
 */

import { app, BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { stripAnsi } from '../restore';
import type { GmuxCore } from '../sessions';
import * as tmux from '../tmux';

export function smokeLog(step: string): void {
  // Parsed by CI / the orchestrator; keep the prefix stable.
  console.log(`[gmux-smoke] ${step}`);
}

export function smokeFail(err: unknown): never {
  console.error(`[gmux-smoke] FAIL: ${(err as Error).message}`);
  app.exit(1);
  return undefined as never;
}

export function armWatchdog(ms: number): void {
  const watchdog = setTimeout(() => {
    console.error(`[gmux-smoke] FAIL: ${ms / 1000}s watchdog expired`);
    app.exit(1);
  }, ms);
  watchdog.unref?.();
}

/** Attach `sessionId` to a hidden window and resolve once bytes flow. */
export async function receiveTermBytes(
  core: GmuxCore,
  sessionId: string
): Promise<number> {
  const win = new BrowserWindow({ show: false });
  try {
    return await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('no term:data bytes arrived within 15s')),
        15_000
      );
      core.onTermData = (sid, byteLength) => {
        if (sid !== sessionId || byteLength <= 0) return;
        clearTimeout(timer);
        resolve(byteLength);
      };
      core.attachSession(sessionId, win.webContents).catch((err: unknown) => {
        clearTimeout(timer);
        reject(err as Error);
      });
    });
  } finally {
    core.onTermData = null;
    core.detachSession(sessionId);
    // Deliberately NOT destroying the hidden window here: window-all-closed
    // would app.quit() → before-quit → close the manifest DB while the smoke
    // is still using it. app.exit() at the end reaps the window anyway.
  }
}

/** How long `waitForPaneText` polls, how often, and what to call the wait. */
export interface WaitForPaneTextOptions {
  deadlineMs?: number;
  pollMs?: number;
  /**
   * Prefixed to the failure message. The helper cannot know which case it is
   * waiting for, and a smoke failure that opens with the case name is faster
   * to place in a log than one that opens with the missing string.
   */
  label?: string;
}

/**
 * Poll one pane until every wanted string is on its screen (Phase 111).
 *
 * BYTES ARE NOT THE MARKER, and that is the whole reason this exists. The T3
 * prep used to take the first `%output` chunk as proof that the planted line
 * had printed. That chunk is the attach client redrawing the pane, and it
 * arrives whether the shell inside has printed or not. The prep then quit
 * about 40 ms later, the app-quit capture read an empty screen, and
 * `captureSessionSnapshot` correctly wrote nothing, so the read of the
 * snapshot failed with ENOENT. The nightly durability lane went red for two
 * days on that race and no log line could say which of the three silent
 * outcomes had happened.
 *
 * Two other harnesses in this tree already wait for their markers before they
 * snapshot, being `waitForMarkers` in src/main/fault/harness.ts and in
 * src/main/manifest/reconstruct-smoke.ts. Both poll by name prefix over
 * `listSessions` rather than per session, so they are a different shape and
 * are left alone. This is the per-session wait, and it has two callers.
 *
 * The defaults, 25 s and 500 ms, are the numbers `verifyT3Case` already used.
 * They are carried over rather than reinvented.
 */
export async function waitForPaneText(
  target: string,
  wanted: readonly string[],
  options: WaitForPaneTextOptions = {}
): Promise<string> {
  const { deadlineMs = 25_000, pollMs = 500, label } = options;
  // A bare tmux name and a `$-id` both work, because capture-pane does not
  // honour the `=` exact-name prefix. One copy of that rule lives in tmux/.
  const paneTarget = await tmux.resolvePaneTarget(target);
  const deadline = Date.now() + deadlineMs;
  let lastCapture = '';
  for (;;) {
    // A capture that throws is a capture that showed nothing yet. The pane can
    // be mid-resize or the server mid-answer, and the poll is what handles it.
    lastCapture = stripAnsi(await tmux.capturePane(paneTarget).catch(() => ''));
    if (wanted.every((one) => lastCapture.includes(one))) return lastCapture;
    if (Date.now() >= deadline) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  const missing = wanted.filter((one) => !lastCapture.includes(one));
  throw new Error(
    `${label === undefined ? '' : `${label}: `}the pane never showed what ` +
      `this gate needs after ${Math.round(deadlineMs / 1000)}s.\n` +
      `missing: ${missing.join(', ')}\n` +
      `last capture tail:\n${lastCapture.split('\n').slice(-15).join('\n')}`
  );
}

/** Command lines of a pid's direct children, as `ps` sees them. */
export async function psChildren(pid: number): Promise<string[]> {
  return new Promise((resolve) => {
    execFile('ps', ['-o', 'command=', '-g', String(pid)], (_err, stdout) => {
      resolve(
        stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      );
    });
  });
}

/** The pane process's pid and real argv, as `ps` sees it. */
export async function panePs(
  tmuxTarget: string
): Promise<{ pid: number; command: string }> {
  const raw = (
    await tmux.execTmux(['list-panes', '-t', tmuxTarget, '-F', '#{pane_pid}'])
  ).trim();
  const pid = Number(raw);
  const command = await new Promise<string>((resolve, reject) => {
    execFile('ps', ['-o', 'command=', '-p', raw], (err, stdout) => {
      if (err) reject(new Error(`ps failed for pid ${raw}: ${err.message}`));
      else resolve(stdout.trim());
    });
  });
  return { pid, command };
}

/** Pids `pkill -f <pattern>` would signal. READ-ONLY — never pkill. */
export async function pgrepFull(pattern: string): Promise<number[]> {
  return new Promise((resolve) => {
    execFile('pgrep', ['-f', pattern], (_err, stdout) => {
      // pgrep exits 1 with no output when nothing matches — not an error.
      resolve(
        stdout
          .split('\n')
          .map((line) => Number(line.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      );
    });
  });
}
