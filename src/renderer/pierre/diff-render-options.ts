/**
 * The render options every diff surface and the worker pool must agree on
 * (Phase 42 stage 8, re-homed out of ./highlight-pool.ts).
 *
 * They lived in highlight-pool.ts, which dynamic-imports the heavy half
 * (./highlight-pool-impl.ts) while the heavy half imported these back — a
 * production import cycle. The options are one constant with no behavior,
 * so they are a leaf both halves can share. The public surface is
 * unchanged: ./highlight-pool.ts re-exports the constant, and every diff
 * surface keeps its existing import.
 *
 * The four inline modes and the persisted choice between them live one step
 * further down, in ./diff-view-prefs, which imports nothing at all. This file
 * imports ./theme-bridge, and through it @pierre/diffs and @pierre/trees, so
 * anything the editor store needs has to be below it (Phase 185).
 */

import type { LineDiffTypes } from '@pierre/diffs';
import { DEFAULT_INLINE_DIFF_MODE } from './diff-view-prefs';
import { diffTheme } from './theme-bridge';

/**
 * Rendering options shared by the pool and every diff surface.
 *
 * `lineDiffType` here is the SEED and not the live answer. When a pool is
 * attached the renderer reads the POOL's copy instead of the instance's —
 * renderers/DiffHunksRenderer.js getRenderOptions returns
 * `workerManager.getDiffRenderOptions()` whole whenever `isWorkingPool()` is
 * true, so an instance-level `lineDiffType` is accepted and ignored on that
 * path. The live mode therefore has to be pushed to the pool as well, which is
 * `applyInlineDiffMode` in ./highlight-pool.ts. The value is still passed on
 * the instance because it IS what gets read when no pool came up.
 */
export const DIFF_RENDER_OPTIONS = {
  theme: diffTheme,
  lineDiffType: DEFAULT_INLINE_DIFF_MODE as LineDiffTypes,
  useTokenTransformer: false
};
