/**
 * Content hashes, for the launch snapshot and the install pin.
 *
 * Two callers with two different questions, so there are two modes and the
 * caller says which:
 *
 *  - `head` hashes the file that DEFINES the thing. It is what the launch
 *    snapshot records, because the snapshot has to be cheap enough to sit in a
 *    session launch that already spawns a tmux pane and a CLI, and because the
 *    question it answers is "did this definition change under a running
 *    session".
 *  - `full` hashes a skill's whole directory. It is what the install pin
 *    re-checks, because the payload the supply-chain research found most often
 *    is in `scripts/`, not in `SKILL.md`, so a hash of the markdown alone
 *    would miss the thing it exists to catch.
 *
 * **This is Tortie's hash, not the skills CLI's `skillFolderHash`.** The two
 * answer different questions over different inputs and must never be compared.
 * The algorithm is named in `hashAlgorithm` on every entry, so changing it
 * later invalidates pins loudly instead of quietly.
 */

import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import type { ContextEntry, ContextHashMode } from '@shared/context';
import type { ContextFs } from './port';

export const HASH_ALGORITHM = {
  head: 'sha256-file-v1',
  full: 'sha256-dir-v1'
} as const;

const DIR_LIMITS = {
  maxFiles: 500,
  maxDepth: 6,
  skip: new Set(['.git', 'node_modules', '.DS_Store'])
} as const;

/**
 * A directory hash that does not depend on listing order or on the machine.
 * Every file contributes its path relative to the root and the hash of its
 * bytes, sorted by path.
 */
export async function hashDirectory(fs: ContextFs, root: string): Promise<string | null> {
  const files: string[] = [];
  const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || next.depth > DIR_LIMITS.maxDepth) continue;
    const entries = await fs.readDir(next.dir);
    if (!entries) continue;
    for (const entry of entries) {
      if (DIR_LIMITS.skip.has(entry.name)) continue;
      const path = join(next.dir, entry.name);
      if (entry.isDirectory) {
        queue.push({ dir: path, depth: next.depth + 1 });
        continue;
      }
      if (files.length >= DIR_LIMITS.maxFiles) return null;
      files.push(path);
    }
  }
  if (files.length === 0) return null;
  files.sort();
  const digest = createHash('sha256');
  for (const path of files) {
    const fileHash = await fs.hashFile(path);
    if (fileHash === null) continue;
    digest.update(relative(root, path));
    digest.update('\0');
    digest.update(fileHash);
    digest.update('\n');
  }
  return digest.digest('hex');
}

/**
 * Attach hashes to the resolved rows. Runs after resolution rather than during
 * the read, so a plain list refresh never pays for it: `none` is the default
 * and it costs nothing at all.
 */
export async function attachHashes(
  fs: ContextFs,
  entries: readonly ContextEntry[],
  mode: ContextHashMode,
  targets: ReadonlyMap<string, { kind: 'file' | 'dir'; path: string }>
): Promise<ContextEntry[]> {
  if (mode === 'none') return [...entries];
  const out: ContextEntry[] = [];
  for (const entry of entries) {
    const target = targets.get(entry.id);
    if (!target) {
      out.push(entry);
      continue;
    }
    if (mode === 'full' && target.kind === 'dir') {
      out.push({
        ...entry,
        hash: await hashDirectory(fs, target.path),
        hashAlgorithm: HASH_ALGORITHM.full
      });
      continue;
    }
    if (mode === 'full' && entry.category === 'skill') {
      const dir = target.path.replace(/\/SKILL\.md$/, '');
      out.push({
        ...entry,
        hash: await hashDirectory(fs, dir),
        hashAlgorithm: HASH_ALGORITHM.full
      });
      continue;
    }
    out.push({
      ...entry,
      hash: await fs.hashFile(target.path),
      hashAlgorithm: HASH_ALGORITHM.head
    });
  }
  return out;
}
