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
