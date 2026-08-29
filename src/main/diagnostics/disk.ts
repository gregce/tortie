/**
 * The disk numbers (Phase 163).
 *
 * Four sizes and one free figure, all on demand. The HTTP cache comes from
 * Chromium's own index through `session.getCacheSize()`, which walks nothing.
 * The code cache, the durable `gmux` directory and the whole profile are
 * `/usr/bin/du -sk` through the guarded runner, because a JavaScript walk
 * over a 25,000 file cache is the slow thing the audit warned about and `du`
 * over 22,401 files measured 196 ms wall on 2026-08-29. Free space is one
 * `statfs`. Nothing here deletes, and the durable directory is measured only
 * so a person can see it is small next to the caches.
 *
 * The runner is injected so the unit test spawns nothing.
 */

import { statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { runGuarded } from '../proc/guarded';

/**
 * `/usr/bin/du`, not `/usr/sbin/du`. The spec wrote sbin, and the first real
 * capture on 2026-08-29 answered unknown for all three directories because
 * that path does not exist on macOS 15.
 */
export const DU_BIN = '/usr/bin/du';

/** The directory under the profile that holds Tortie's durable data. */
export const DURABLE_DIR = 'gmux';
/** Chromium's JavaScript code cache directory under the profile. */
export const CODE_CACHE_DIR = 'Code Cache';

/** `du -sk` prints kilobytes then a tab then the path. Bytes, or null. */
export function parseDuKb(stdout: string): number | null {
  const m = /^\s*(\d+)\s/.exec(stdout);
  return m === null ? null : Number(m[1]) * 1024;
}

export interface DiskDeps {
  /** Injectable for tests. Default: `du -sk <dir>` through the guarded runner. */
  du?(dir: string): Promise<number | null>;
  /** Injectable for tests. Default: `statfs`. */
  free?(dir: string): Promise<number | null>;
  /** Chromium's own cache size, in bytes. Default: null. */
  httpCache?(): Promise<number | null>;
}

async function defaultDu(dir: string): Promise<number | null> {
  const r = await runGuarded(DU_BIN, ['-sk', dir], {
    timeoutMs: 5_000,
    maxOutputBytes: 64 * 1024
  });
  if (r.spawnError !== null || r.timedOut) return null;
  return parseDuKb(r.stdout);
}

async function defaultFree(dir: string): Promise<number | null> {
  try {
    const fs = await statfs(dir);
    return fs.bsize * fs.bavail;
  } catch {
    return null;
  }
}

export interface DiskSizes {
  httpCacheBytes: number | null;
  codeCacheBytes: number | null;
  durableBytes: number | null;
  profileBytes: number | null;
  freeBytes: number | null;
}

/**
 * Every disk number for one profile directory, read in parallel. A number
 * that could not be read is null, never zero, so a missing tool reads as
 * "unknown" rather than as an empty cache.
 */
export async function readDiskSizes(
  profileDir: string,
  deps: DiskDeps = {}
): Promise<DiskSizes> {
  const du = deps.du ?? defaultDu;
  const free = deps.free ?? defaultFree;
  const httpCache = deps.httpCache ?? (async () => null);
  const [httpCacheBytes, codeCacheBytes, durableBytes, profileBytes, freeBytes] =
    await Promise.all([
      httpCache().catch(() => null),
      du(join(profileDir, CODE_CACHE_DIR)).catch(() => null),
      du(join(profileDir, DURABLE_DIR)).catch(() => null),
      du(profileDir).catch(() => null),
      free(profileDir).catch(() => null)
    ]);
  return { httpCacheBytes, codeCacheBytes, durableBytes, profileBytes, freeBytes };
}
