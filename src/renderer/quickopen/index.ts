/**
 * src/renderer/quickopen — the ⌘P palette (Phase 14).
 *
 * The shell mounts <QuickOpenPalette /> once and calls
 * `useQuickOpen.getState().toggleOrOpen()` on ⌘P. Everything else — the
 * ranking, the index, the recents list — is behind this barrel.
 */

// PHASE 165. The palette is exported through its lazy door, `./lazy.tsx`, and
// NOT from its own file, so the shell can mount the door on every launch and
// fetch the palette on the first ⌘P.
export { preloadQuickOpenPalette, QuickOpenPaletteLazy } from './lazy';
export { useQuickOpen } from './store';
export { parseQuickOpen } from './parse';
export type { ParsedQuickOpen, QuickOpenMode } from './parse';
export { recentFiles, recentKeys, noteOpened } from './recents';
