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
 */

import type { LineDiffTypes } from '@pierre/diffs';
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
