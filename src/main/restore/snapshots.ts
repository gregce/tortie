/**
 * Scrollback snapshots — the T3 (reboot) scrollback survival layer.
 *
 * `capture-pane -p -e -J -S -10000` of each live session is written to
 * <userData>/gmux/snapshots/<sessionId>.txt at the MVP capture points
 * (FINAL-REPORT §2.4 Step 2 / research 09 §B.4):
 *   - app quit           (shutdownGmuxCore → GmuxCore.snapshotAllSessions)
 *   - session close      (GmuxCore.killSession, before kill-session)
 *   - control-client %exit (server-exit handler — best-effort; if the server
 *     is truly dead the captures fail harmlessly)
 *
 * A hard crash without a quit can still lose scrollback TEXT until v1's
 * timed snapshots land — documented loss window (FINAL-REPORT §8).
 *
 * Ownership: src/main/restore/**.
 */

import { app } from 'electron';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as tmux from '../tmux';
// DIRECT, not through ../settings — that barrel re-exports its own ipc module,
// which pulls in the menu; a leaf on the quit path must not drag that in.
import { getSettings } from '../settings/store';
import { trimSnapshotText } from './command';

/**
 * Fallback saved depth. The live value is Settings → "Saved scrollback"
 * (`GmuxSettings.savedScrollbackLines`, Phase 13.7); this constant is what a
 * caller gets when settings cannot be read at all.
 *
 * NOT the same number as tmux's `history-limit`, and not derived from it: the
 * two are independent. `history-limit` is how far scrolling and capture can
 * REACH; this is only how much is written into the reboot snapshot. Raising
 * one does not move the other.
 *
 * The cost of raising this is QUIT LATENCY, not disk. Snapshots run under
 * `Promise.allSettled` but serialise inside the single-threaded tmux server:
 * 16 sessions at 10,000 lines is 0.9-1.9 s, at 50,000 it is 4.7-9.0 s.
 */
export const SNAPSHOT_LINES = 10_000;

/** Lines to write into a snapshot, from settings, clamped. */
function savedLines(): number {
  try {
    return getSettings().savedScrollbackLines;
  } catch {
    return SNAPSHOT_LINES;
  }
}

/** <userData>/gmux/snapshots — sibling of the manifest DB. */
export function snapshotsDir(): string {
  return join(app.getPath('userData'), 'gmux', 'snapshots');
}

/** Snapshot file for one session (ids are UUIDs — filesystem-safe). */
export function snapshotPath(sessionId: string): string {
  return join(snapshotsDir(), `${sessionId}.txt`);
}

/** The snapshot path when one exists on disk, else null. */
export function existingSnapshotPath(sessionId: string): string | null {
  const path = snapshotPath(sessionId);
  return existsSync(path) ? path : null;
}

// Pane-target resolution (`=name` is not a valid target-PANE on tmux 3.6a)
// now lives in src/main/tmux/sessions.ts — promoted there when terminal
// capture became its second caller (standing guardrail 3: one copy).
const resolvePaneTarget = tmux.resolvePaneTarget;

/**
 * Capture one live session's scrollback into its snapshot file.
 * Atomic write (tmp + rename) so a crash mid-write never corrupts the last
 * good snapshot. Returns true when a snapshot was written.
 *
 * Best-effort by contract: callers on quit/kill paths must not fail the
 * user-visible operation because a capture failed.
 */
export async function captureSessionSnapshot(
  target: string,
  sessionId: string
): Promise<boolean> {
  const paneTarget = await resolvePaneTarget(target);
  const text = trimSnapshotText(
    await tmux.capturePane(paneTarget, savedLines())
  );
  if (text.length === 0) return false; // nothing worth replaying
  const dir = snapshotsDir();
  await mkdir(dir, { recursive: true });
  const final = snapshotPath(sessionId);
  const tmp = join(dir, `.${sessionId}.tmp`);
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, final);
  return true;
}

/** Remove a session's snapshot (discard / cleanup). Missing file is fine. */
export async function deleteSnapshot(sessionId: string): Promise<void> {
  await rm(snapshotPath(sessionId), { force: true });
}
