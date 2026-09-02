/**
 * One read of the tree (Phase 201, research 77 section 4).
 *
 * The reading needs two facts the import scan cannot give, because the scan
 * reads only the files this build parses: how many lines every tracked file
 * holds, and what name a manifest at a box root declares. Both come from one
 * read of every tracked file, measured at 379 ms cold on gmux's 2,490 files
 * and tens of milliseconds warm, and both are written into `arch.db` under
 * the SAME mtime and size stamp the import rows use, so a warm pass reads
 * only what drifted and a file the tree no longer tracks is forgotten whole.
 *
 * It runs after the import scan inside both legs of the check coordinator,
 * before the scanned stamp is recorded, and it never runs on the map read,
 * which composes over whatever the store holds and waits for nothing.
 *
 * Nothing here is evaluated. A manifest is read as text and a name is taken
 * out of it by a pattern; no value read from any file reaches an argv.
 */

import { readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchStore } from './db';
import { bareName, MANIFEST_NAMES } from './reading';
// From ./resolver/paths rather than the manifest reader's facade, so this
// module pulls in no language arm and no parser: the conformance gate imports
// it from a bare copy of this directory.
import { normalizeRel } from './resolver/paths';

export type { ArchTreeFileFact } from './db';

/** Files past this size are not read; they are binaries or generated blobs. */
const MAX_READ_BYTES = 4_000_000;
/** How many files one round of reads holds open at once. */
const CHUNK = 64;

export interface ArchTreeFactsInput {
  repoPath: string;
  repoKey: string;
  store: ArchStore;
  /** Every tracked path at HEAD, from the caller's one `git ls-files -z`. */
  trackedFiles: readonly string[];
  /** Ends the read between chunks. A cancelled read keeps what it wrote. */
  signal?: AbortSignal;
}

export interface ArchTreeFactsResult {
  /** Files read in this pass. */
  read: number;
  /** Files answered from the stored rows without a read. */
  reused: number;
  durationMs: number;
}

/**
 * The name one manifest declares, read from its text, or null.
 *
 * Exported pure so the unit suite and the conformance gate can prove it on
 * fixtures without a file. `package.json` is parsed as JSON, and the four
 * text formats are read by one pattern each; a manifest with no name, or one
 * that does not parse, answers null rather than throwing.
 */
export function declaredNameOf(fileName: string, text: string): string | null {
  let name: string | null = null;
  if (fileName === 'package.json') {
    try {
      const parsed = JSON.parse(text) as { name?: unknown };
      name = typeof parsed.name === 'string' ? parsed.name : null;
    } catch {
      name = null;
    }
  } else if (fileName === 'Cargo.toml' || fileName === 'pyproject.toml') {
    name = /^\s*name\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? null;
  } else if (fileName === 'go.mod') {
    name = /^module\s+(\S+)/m.exec(text)?.[1]?.replace(/^"|"$/g, '') ?? null;
  } else if (fileName === 'Package.swift') {
    name = /name:\s*"([^"]+)"/.exec(text)?.[1] ?? null;
  }
  if (name === null) return null;
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.length > 214 ? null : trimmed;
}

/** Newlines in a buffer, or zero when it is a binary. Exported for the tests. */
export function countLines(buf: Buffer): number {
  if (buf.length >= MAX_READ_BYTES || buf.subarray(0, 8000).includes(0)) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i += 1) if (buf[i] === 10) n += 1;
  return n;
}

/** Read what drifted, forget what is gone, and answer with the counts. */
export async function readArchTreeFacts(input: ArchTreeFactsInput): Promise<ArchTreeFactsResult> {
  const started = Date.now();
  const { repoPath, repoKey, store } = input;
  const stamps = store.treeStamps(repoKey);
  const stale: { relPath: string; absPath: string; mtimeMs: number; size: number }[] = [];
  const seen = new Set<string>();
  let reused = 0;
  for (const raw of input.trackedFiles) {
    const relPath = normalizeRel(raw);
    if (relPath === '') continue;
    seen.add(relPath);
    const absPath = join(repoPath, relPath);
    let mtimeMs: number;
    let size: number;
    try {
      const st = statSync(absPath);
      if (!st.isFile()) {
        seen.delete(relPath);
        continue;
      }
      mtimeMs = st.mtimeMs;
      size = st.size;
    } catch {
      // Tracked at HEAD and absent from the working tree. Forgotten below.
      seen.delete(relPath);
      continue;
    }
    const stamp = stamps.get(relPath);
    if (stamp !== undefined && stamp.mtimeMs === mtimeMs && stamp.size === size) {
      reused += 1;
      continue;
    }
    stale.push({ relPath, absPath, mtimeMs, size });
  }
  store.forgetTreeFiles(
    repoKey,
    [...stamps.keys()].filter((relPath) => !seen.has(relPath))
  );

  let read = 0;
  for (let at = 0; at < stale.length; at += CHUNK) {
    if (input.signal?.aborted === true) break;
    const chunk = stale.slice(at, at + CHUNK);
    const rows = await Promise.all(
      chunk.map(async (file) => {
        let lines = 0;
        let declares: string | null = null;
        try {
          const buf = file.size >= MAX_READ_BYTES ? null : await readFile(file.absPath);
          if (buf !== null) {
            lines = countLines(buf);
            const name = bareName(file.relPath);
            if (MANIFEST_NAMES.includes(name) && buf.length > 0) {
              declares = declaredNameOf(name, buf.toString('utf8'));
            }
          }
        } catch {
          // Unreadable. Counted as zero lines, which is the honest answer.
        }
        return { relPath: file.relPath, mtimeMs: file.mtimeMs, size: file.size, lines, declares };
      })
    );
    store.saveTreeFacts(repoKey, rows);
    read += rows.length;
  }
  return { read, reused, durationMs: Date.now() - started };
}
