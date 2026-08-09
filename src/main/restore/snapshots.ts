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
import { trimSnapshotText } from './command';

/** Renderer scrollback cap — same figure as reattach backfill (§2.4 Step 1). */
export const SNAPSHOT_LINES = 10_000;

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

/**
 * Resolve a session reference to its immutable `$-id` before capture.
 *
 * VERIFIED on tmux 3.6a: `capture-pane -t '=name'` fails with "can't find
 * pane" — the `=` exact-match prefix is honored in target-SESSION resolution
 * (has-session, kill-session) but NOT in target-PANE resolution. So bare
 * names must be resolved to `$-ids` here. (Latent sibling bug noted for the
 * tmux stream: tmux.capturePane('=name') has the same problem.)
 */
async function resolvePaneTarget(target: string): Promise<string> {
  if (target.startsWith('$')) return target;
  const live = await tmux.listSessions({ includeControl: true });
  const found = live.find((s) => s.tmuxName === target);
  if (found === undefined) {
    throw new Error(`no live tmux session named "${target}"`);
  }
  return found.sessionId;
}

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
    await tmux.capturePane(paneTarget, SNAPSHOT_LINES)
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
