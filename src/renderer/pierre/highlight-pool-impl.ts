/**
 * Highlight pool — the heavy half: @pierre/diffs' own tokenising workers.
 * Never import this statically from anything the shell loads at boot;
 * `loadHighlightPool()` in highlight-pool.ts dynamic-imports it on the first
 * diff open so vite splits the inlined worker bundle into its own chunk.
 *
 * The worker is imported `?worker&inline` for the same reason Monaco's are
 * (monaco-impl.ts): the packaged renderer loads over file://, where Chromium
 * refuses to construct a Worker from a file URL. index.html's CSP allows
 * `worker-src 'self' blob:`.
 *
 * We construct the manager ourselves rather than mounting
 * `WorkerPoolContextProvider`: that provider terminates the singleton when its
 * last instance unmounts, which for a per-tab diff surface means tearing the
 * pool (and its Shiki state) down and back up on every close.
 */

import { WorkerPoolManager } from '@pierre/diffs/worker';
import DiffsHighlightWorker from '@pierre/diffs/worker/worker.js?worker&inline';
import { DIFF_RENDER_OPTIONS } from './diff-render-options';
import { readInlineDiffMode } from './diff-view-prefs';

/**
 * One diff surface is visible at a time, and a diff is one highlight task, so
 * the library's default of eight workers would be seven idle Shiki instances.
 * Two keeps a second task (the other side of a fast retheme, or the next tab)
 * from queueing behind a slow one.
 */
const POOL_SIZE = 2;

let pool: WorkerPoolManager | undefined;

/**
 * The shared pool. Constructing it kicks initialization (shared highlighter +
 * worker handshake) immediately, so the first diff of the session waits on
 * that rather than on a full-file tokenize.
 */
export function getHighlightPool(): WorkerPoolManager {
  pool ??= new WorkerPoolManager(
    {
      workerFactory: () => new DiffsHighlightWorker(),
      poolSize: POOL_SIZE
    },
    // SEEDED with the persisted inline mode, not the default (Phase 185).
    // The pool's copy of these options is the one the renderer reads once a
    // pool is attached, so constructing it with the default and correcting it
    // afterwards would paint the session's first diff twice.
    { ...DIFF_RENDER_OPTIONS, lineDiffType: readInlineDiffMode() }
  );
  return pool;
}
