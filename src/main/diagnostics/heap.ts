/**
 * The heap snapshot gate (Phase 163).
 *
 * A heap snapshot can carry paths, file contents and a person's own words,
 * so it is OPT IN and it never enters a report, a log or the profile. This
 * module is the only thing that writes one, and it refuses unless it is
 * handed a path a person chose in a save dialog or a path the harness named
 * behind its own flag. The ordinary capture in ./report.ts does not import
 * this file, and a unit test reads the source to prove that stays true.
 *
 * The writer is injected: main's own snapshot is `process.takeHeapSnapshot`
 * and a window's is `webContents.takeHeapSnapshot`, and both are bound in
 * ./ipc.ts where Electron is reachable. Pure Node here, so the refusals are
 * unit tested without Electron.
 */

import { isAbsolute } from 'node:path';

/** Who chose the path. Nothing else may. */
export type HeapSnapshotOrigin = 'dialog' | 'harness';

export interface HeapSnapshotRequest {
  /** An absolute path the person, or the harness flag, chose. */
  path: string;
  origin: HeapSnapshotOrigin;
  /** Writes the snapshot at the path. Resolves true on success. */
  write(path: string): Promise<boolean>;
}

export const HEAP_SNAPSHOT_REFUSED =
  'A heap snapshot is written only to a place a person chose.';

export interface HeapSnapshotOutcome {
  written: boolean;
  /** The refusal, when nothing was written because the request was wrong. */
  refused?: string;
}

/** True when this request may write. Pure, so the test can pin every branch. */
export function heapSnapshotAllowed(req: {
  path: string;
  origin: string;
}): boolean {
  if (req.origin !== 'dialog' && req.origin !== 'harness') return false;
  if (typeof req.path !== 'string' || req.path.length === 0) return false;
  if (!isAbsolute(req.path)) return false;
  return true;
}

/**
 * Write one heap snapshot, or refuse. The refusal names itself and the
 * function never throws, because a diagnostics action must not be able to
 * become a crash.
 */
export async function saveHeapSnapshot(
  req: HeapSnapshotRequest
): Promise<HeapSnapshotOutcome> {
  if (!heapSnapshotAllowed(req)) {
    return { written: false, refused: HEAP_SNAPSHOT_REFUSED };
  }
  try {
    return { written: await req.write(req.path) };
  } catch (err) {
    return { written: false, refused: (err as Error).message };
  }
}
