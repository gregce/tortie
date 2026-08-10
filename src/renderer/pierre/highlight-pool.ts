/**
 * Highlight pool — the light half. Owns the render options every diff surface
 * and the worker pool must agree on, and lazily loads the heavy half
 * (highlight-pool-impl.ts) that pulls Shiki into a blob worker.
 *
 * Same shape as monaco-loader.ts / monaco-impl.ts, for the same reason: the
 * implementation carries an inlined worker bundle that must not sit in the
 * shell's boot chunk.
 *
 * WHY A POOL (docs/BACKLOG.md item 0): with no `WorkerPoolManager` in context,
 * @pierre/diffs highlights the WHOLE diff synchronously on first render —
 * Shiki tokenization plus, at `lineDiffType: 'word'`, one decoration per
 * changed word fed through Shiki's O(n²) `verifyIntersections`. Measured on a
 * 10k-line file with every line changed: 9.7 s. With a pool the renderer takes
 * its other branch — it builds a plain-text AST for the visible window only
 * (11 ms) and asks the pool to highlight in the background, swapping the
 * colored result in when it arrives. That branch is chosen when the instance
 * is CREATED, so the pool has to exist before the diff mounts.
 */

import type { WorkerPoolManager } from '@pierre/diffs/worker';
import type { FileDiffMetadata, LineDiffTypes } from '@pierre/diffs';
import { diffTheme } from './theme-bridge';

/**
 * Rendering options shared by the pool and every diff surface. When a pool is
 * attached the renderer highlights with the POOL's copy of these
 * (renderers/DiffHunksRenderer getRenderOptions), so the two must not drift or
 * the highlight cache never matches and the diff re-highlights forever.
 */
export const DIFF_RENDER_OPTIONS = {
  theme: diffTheme,
  lineDiffType: 'word' as LineDiffTypes,
  useTokenTransformer: false
};

/**
 * Above this many lines on either side the library renders the diff as plain
 * text — its own `tokenizeMaxLength` lever (constants DEFAULT_TOKENIZE_MAX_LENGTH
 * is 100,000, far past the point where coloring is affordable). Tokenizing
 * costs ~0.07 ms per line per side and the word-level decorations grow
 * quadratically, so a 20k-line file would occupy the pool for tens of seconds
 * to color something nobody is looking at yet. VS Code makes the same trade.
 */
export const PLAIN_TEXT_LINE_LIMIT = 8000;

/**
 * Whether this diff will render unhighlighted — the same predicate the library
 * applies internally (`isDiffMassive`), so the UI can say why.
 */
export function isPlainTextDiff(meta: FileDiffMetadata): boolean {
  return (
    Math.max(meta.additionLines.length, meta.deletionLines.length) >
    PLAIN_TEXT_LINE_LIMIT
  );
}

/**
 * How long the pool gets to hand back a ready highlighter before the surface
 * gives up on it. A pool that is present but not initialized renders NOTHING
 * (its plain-AST call needs the shared highlighter), so "no pool" is the only
 * safe answer to a slow start.
 */
const POOL_READY_TIMEOUT_MS = 4000;

let pending: Promise<WorkerPoolManager | null> | null = null;

/**
 * The shared pool, ready to render — created once per window, and resolved
 * only once its workers and shared highlighter are up. Resolves to null when
 * the worker chunk cannot load, the workers fail, or startup outruns
 * POOL_READY_TIMEOUT_MS; callers then render with no pool in context, which is
 * the synchronous path the app shipped before.
 */
export function loadHighlightPool(): Promise<WorkerPoolManager | null> {
  pending ??= (async () => {
    const { getHighlightPool } = await import('./highlight-pool-impl');
    const pool = getHighlightPool();
    const ready = await Promise.race([
      pool.initialize().then(
        () => true,
        (err: unknown) => {
          console.error('gmux: diff highlight workers failed', err);
          return false;
        }
      ),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), POOL_READY_TIMEOUT_MS);
      })
    ]);
    return ready && pool.isWorkingPool() ? pool : null;
  })().catch((err: unknown) => {
    console.error('gmux: diff highlight pool unavailable', err);
    return null;
  });
  return pending;
}
