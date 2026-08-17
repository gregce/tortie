/**
 * The update stage words (Phase 62.1). One module owns the words that name
 * each stage of the update journey, so the activity bar ring and the home
 * screen line can never drift apart. The ring's hover recomposes these words
 * and adds its click suffix in UpdateRing.tsx. The home line shows the words
 * alone, because nothing on it can be clicked.
 *
 * The visibility policy stays in main (src/main/updates/journey.ts). This
 * module turns a snapshot into words and holds no policy of its own.
 *
 * PINNED FRAGMENT. build/assert-bundle-refusals.mjs pins the byte sequence
 * " is ready. It installs when you quit." against the renderer bundle and
 * against this source file. The ready case below carries it. Reword it only
 * together with that table.
 */

import type { UpdateUiState } from '@shared/ipc';

/**
 * The four fields the ring and the home line read. The full UpdateUiState
 * satisfies this. Defined here since Phase 62.1 so both surfaces share one
 * definition; UpdateRing.tsx re-exports it for its existing importers.
 */
export type UpdateRingSnapshot = Pick<
  UpdateUiState,
  'ring' | 'ringVersion' | 'ringPercent' | 'failedDuring'
>;

/**
 * The stage in words, with no click suffix. The percent is the floor of the
 * real number, never rounded up, so 100 appears only when the download is
 * done. A hidden ring has no words at all.
 */
export function updateStageWords(state: UpdateRingSnapshot): string {
  const version = state.ringVersion ?? '';
  switch (state.ring) {
    case 'checking':
      return 'Checking for updates';
    case 'downloading':
      return `Downloading ${version}, ${Math.floor(state.ringPercent ?? 0)} percent`;
    case 'staging':
      return `Preparing ${version}`;
    case 'ready':
      // The quit promise. The fragment " is ready. It installs when you
      // quit." is pinned by build/assert-bundle-refusals.mjs.
      return `Tortie ${version} is ready. It installs when you quit.`;
    case 'failed':
      switch (state.failedDuring) {
        case 'checking':
          return 'The update check failed.';
        case 'downloading':
          return `The download of ${version} did not finish.`;
        case 'staging':
          return `Tortie could not prepare ${version}.`;
        case null:
          // The state changed under the read. Stay truthful and generic.
          return 'The update did not finish.';
      }
      break;
    case 'hidden':
      return '';
  }
  return '';
}
