/**
 * src/renderer/quickopen — the ⌘P palette (Phase 14).
 *
 * The shell mounts <QuickOpenPalette /> once and calls
 * `useQuickOpen.getState().toggleOrOpen()` on ⌘P. Everything else — the
 * ranking, the index, the recents list — is behind this barrel.
 */

export { QuickOpenPalette } from './QuickOpenPalette';
export { useQuickOpen } from './store';
export { parseQuickOpen } from './parse';
export type { ParsedQuickOpen, QuickOpenMode } from './parse';
export { recentFiles, recentKeys, noteOpened } from './recents';
