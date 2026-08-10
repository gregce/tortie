/**
 * Diff metadata production — turning two file versions into the
 * `FileDiffMetadata` every @pierre/diffs surface renders, without ever
 * blocking the window on it (Phase 12.0).
 *
 * MEASURED (docs/BACKLOG.md item 0, 10k-line TypeScript file, every line
 * changed): parseDiffFromFile 7.1 s · full-file highlight 9.7 s · plain
 * windowed render 11 ms. The 9.7 s is the library's to manage (see
 * highlight-pool.ts); the 7.1 s is ours, because we hand it two whole files
 * instead of a patch.
 *
 * Three paths, by size:
 *   - identical contents            → no metadata; the caller shows "No changes".
 *   - ≤ INLINE_PARSE_LINE_LIMIT     → parsed inline, exactly as before.
 *   - larger                        → parsed in a worker (diff-parse.worker.ts).
 *     If the worker has not answered within COARSE_DIFF_DELAY_MS the caller
 *     gets `coarseDiff` — common prefix/suffix trimmed, everything between
 *     them one replaced block — and the exact diff swaps in when it lands.
 *     Approximation is what VS Code does when its own diff times out; the
 *     difference here is that ours is temporary and labeled.
 */

import { useEffect, useMemo, useState } from 'react';
import { parseDiffFromFile, processFile } from '@pierre/diffs';
import type { FileContents, FileDiffMetadata } from '@pierre/diffs';
import type { DiffParseRequest, DiffParseResponse } from './diff-parse.worker';

/**
 * Lines on either side up to which the diff is computed inline. The worst case
 * at this size (every line changed) measures ~100 ms, and the cost is
 * quadratic past it — 1,600 lines is 178 ms, 2,000 is 289 ms.
 */
export const INLINE_PARSE_LINE_LIMIT = 1200;

/**
 * How long the exact diff gets before the approximate one is shown. A 20k-line
 * file with a realistic amount of churn parses in ~250-350 ms, so at half a
 * second the approximation only ever appears for diffs that would otherwise
 * read as a hang.
 */
export const COARSE_DIFF_DELAY_MS = 500;

/** Unchanged lines kept either side of the approximation's replaced block. */
const COARSE_CONTEXT_LINES = 3;

export interface DiffMetadataState {
  /**
   * The diff to render — null while nothing is ready yet (parsing) or when
   * the two sides are identical.
   */
  meta: FileDiffMetadata | null;
  /**
   * False only while `meta` is the approximation and the exact diff is still
   * being computed. Surfaces should say so.
   */
  exact: boolean;
}

const PENDING: DiffMetadataState = { meta: null, exact: false };
const IDENTICAL: DiffMetadataState = { meta: null, exact: true };

/**
 * Content-derived cache key. @pierre/diffs treats two diffs with the same
 * `cacheKey` as the same diff (utils/areDiffTargetsEqual) and keys its worker
 * highlight cache on it, so a key that ignores content — `head:<path>` — both
 * suppresses re-renders when the buffer changes and can serve a stale
 * highlight. FNV-1a over the text costs ~4 ms for a 1.5 MB file.
 */
export function fileCacheKey(
  side: string,
  path: string,
  contents: string
): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < contents.length; i++) {
    hash ^= contents.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${side}:${path}:${contents.length}:${(hash >>> 0).toString(36)}`;
}

/** Line count without materializing the array. */
export function countLines(contents: string): number {
  if (contents === '') return 0;
  let lines = 1;
  for (let i = contents.indexOf('\n'); i !== -1; i = contents.indexOf('\n', i + 1)) {
    lines++;
  }
  return contents.endsWith('\n') ? lines - 1 : lines;
}

function splitLines(contents: string): string[] {
  const lines = contents.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * The approximation: trim the shared head and tail (O(n)), call everything
 * between them replaced. For a file where genuinely every line changed this
 * IS the answer; for a localized edit it overstates the change until the
 * exact diff arrives a moment later. Returns null when the sides match.
 */
export function coarseDiff(
  oldFile: FileContents,
  newFile: FileContents
): FileDiffMetadata | null {
  const oldLines = splitLines(oldFile.contents);
  const newLines = splitLines(newFile.contents);

  const shortest = Math.min(oldLines.length, newLines.length);
  let head = 0;
  while (head < shortest && oldLines[head] === newLines[head]) head++;
  let tail = 0;
  while (
    tail < shortest - head &&
    oldLines[oldLines.length - 1 - tail] === newLines[newLines.length - 1 - tail]
  ) {
    tail++;
  }

  const deletedTo = oldLines.length - tail;
  const addedTo = newLines.length - tail;
  if (deletedTo === head && addedTo === head) return null;

  const from = Math.max(0, head - COARSE_CONTEXT_LINES);
  const context = Math.min(COARSE_CONTEXT_LINES, tail);
  const rows: string[] = [];
  for (let i = from; i < head; i++) rows.push(` ${oldLines[i]}`);
  for (let i = head; i < deletedTo; i++) rows.push(`-${oldLines[i]}`);
  for (let i = head; i < addedTo; i++) rows.push(`+${newLines[i]}`);
  for (let i = deletedTo; i < deletedTo + context; i++) {
    rows.push(` ${oldLines[i]}`);
  }

  // git writes a 0 start for an empty side (`@@ -0,0 +1,n @@`).
  const oldCount = deletedTo + context - from;
  const newCount = addedTo + context - from;
  const name = newFile.name;
  const patch = [
    `--- a/${name}`,
    `+++ b/${name}`,
    `@@ -${oldCount === 0 ? 0 : from + 1},${oldCount} +${newCount === 0 ? 0 : from + 1},${newCount} @@`,
    ...rows,
    ''
  ].join('\n');

  return (
    processFile(patch, {
      cacheKey: `coarse:${oldFile.cacheKey ?? ''}:${newFile.cacheKey ?? ''}`,
      oldFile,
      newFile
    }) ?? null
  );
}

/**
 * The diff for a pair of file versions. Identity of `oldFile`/`newFile`
 * drives recomputation, so callers must memoize them (they already do — the
 * library re-parses on reference change too).
 */
export function useDiffMetadata(
  oldFile: FileContents,
  newFile: FileContents
): DiffMetadataState {
  // Inline result, or null when this pair has to go through the worker.
  const inline = useMemo<DiffMetadataState | null>(() => {
    if (oldFile.contents === newFile.contents) return IDENTICAL;
    const longest = Math.max(
      countLines(oldFile.contents),
      countLines(newFile.contents)
    );
    if (longest > INLINE_PARSE_LINE_LIMIT) return null;
    return { meta: parseDiffFromFile(oldFile, newFile), exact: true };
  }, [oldFile, newFile]);

  const [deferred, setDeferred] = useState<
    (DiffMetadataState & { old: FileContents; new: FileContents }) | null
  >(null);

  useEffect(() => {
    if (inline !== null) return;

    let cancelled = false;
    let settled = false;
    let worker: Worker | null = null;

    // Nothing is on screen yet; show the approximation only if the exact
    // diff is slow enough that the wait would read as a hang.
    const coarseTimer = setTimeout(() => {
      if (cancelled || settled) return;
      const meta = coarseDiff(oldFile, newFile);
      if (meta !== null) setDeferred({ meta, exact: false, old: oldFile, new: newFile });
    }, COARSE_DIFF_DELAY_MS);

    const finish = (meta: FileDiffMetadata | null): void => {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(coarseTimer);
      worker?.terminate();
      worker = null;
      // `exact` here means "nothing better is coming", which is also true of
      // the approximation once the worker has given up — the surface uses it
      // to stop promising a refinement, not to claim precision.
      setDeferred({ meta, exact: true, old: oldFile, new: newFile });
    };

    /** The approximation is the whole answer when the worker cannot run. */
    const giveUp = (err: unknown): void => {
      console.error('gmux: diff parse worker failed', err);
      finish(coarseDiff(oldFile, newFile));
    };

    import('./diff-parse.worker?worker&inline').then(
      ({ default: DiffParseWorker }) => {
        if (cancelled || settled) return;
        worker = new DiffParseWorker();
        worker.addEventListener(
          'message',
          (event: MessageEvent<DiffParseResponse>) => {
            const data = event.data;
            if (data.ok) finish(data.meta);
            else giveUp(data.error);
          }
        );
        worker.addEventListener('error', giveUp);
        worker.postMessage({ oldFile, newFile } satisfies DiffParseRequest);
      },
      giveUp
    );

    return () => {
      cancelled = true;
      clearTimeout(coarseTimer);
      worker?.terminate();
      worker = null;
    };
  }, [inline, oldFile, newFile]);

  if (inline !== null) return inline;
  if (deferred !== null && deferred.old === oldFile && deferred.new === newFile) {
    return { meta: deferred.meta, exact: deferred.exact };
  }
  return PENDING;
}
