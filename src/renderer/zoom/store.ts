/**
 * Per-region zoom levels — the state behind ⌘+ / ⌘- / ⌘0 / ⌘⇧0.
 *
 * The store is the only writer of the `--zoom-*` custom properties on
 * `<html>`; zoom.css maps those onto the panel containers, so a panel region
 * needs no React at all to follow. The terminal region is the exception —
 * TerminalPane subscribes here and drives xterm's font size directly, because
 * a terminal zooms by changing its font, not its layout box (see regions.ts).
 *
 * Persistence is localStorage, alongside the other view-shape preferences
 * (sidebar width, orientation, active view). It is deliberately NOT in the
 * main-process settings store: zoom is a per-window reading preference, it
 * changes on a keystroke, and a broadcast round trip per press would buy
 * nothing. Levels survive relaunch; a corrupt or hand-edited value snaps back
 * onto the ladder rather than wedging the app at 3.7×.
 */

import { create } from 'zustand';
import { loadLocal, saveLocal } from '../state/store';
import type { ZoomLevels, ZoomRegionId } from './regions';
import {
  allAtDefault,
  clampZoom,
  defaultZoomLevels,
  sanitizeZoomLevels,
  stepZoom,
  ZOOM_DEFAULT,
  ZOOM_REGIONS,
  zoomLimit,
  zoomVarName
} from './regions';

const LS_ZOOM = 'gmux.zoomLevels';

/**
 * The transient readout. `seq` is what makes a repeat press re-arm the fade:
 * pressing ⌘+ at the ceiling produces the same region and factor twice, and
 * without a changing key React would never re-run the dismiss timer.
 */
export interface ZoomHint {
  /** 'all' is ⌘⇧0 — the one gesture that is not about a single region. */
  region: ZoomRegionId | 'all';
  factor: number;
  /** Set when the press could not move — the ladder's end was already here. */
  limit: 'min' | 'max' | null;
  seq: number;
}

export interface ZoomState {
  levels: ZoomLevels;
  hint: ZoomHint | null;
  /** ⌘+ / ⌘- on a region. */
  step(region: ZoomRegionId, direction: 1 | -1): void;
  /** ⌘0 — this region back to 100%. */
  reset(region: ZoomRegionId): void;
  /** ⌘⇧0 — every region back to 100%. */
  resetAll(): void;
  /** The readout faded out; drop it if it is still the one shown. */
  dismissHint(seq: number): void;
}

/** Write the panel custom properties. The terminal has no var — it has a font. */
function applyVars(levels: ZoomLevels): void {
  // This runs at module scope, and unit tests that stub `document` with a
  // bare object reach this module through the editor's import graph. The
  // guard therefore checks for the root element itself, not only for the
  // global, so a partial stub is as safe as no document at all.
  const root =
    typeof document === 'undefined' ? undefined : document.documentElement;
  if (root == null) return;
  for (const region of ZOOM_REGIONS) {
    if (region === 'terminal') continue;
    root.style.setProperty(zoomVarName(region), String(levels[region]));
  }
}

let seq = 0;

function nextHint(
  region: ZoomRegionId | 'all',
  factor: number,
  limit: 'min' | 'max' | null
): ZoomHint {
  seq += 1;
  return { region, factor, limit, seq };
}

export const useZoom = create<ZoomState>()((set, get) => {
  const initial = sanitizeZoomLevels(loadLocal<unknown>(LS_ZOOM, null));

  const commit = (levels: ZoomLevels, hint: ZoomHint): void => {
    applyVars(levels);
    saveLocal(LS_ZOOM, levels);
    set({ levels, hint });
  };

  return {
    levels: initial,
    hint: null,

    step(region, direction) {
      const current = clampZoom(get().levels[region]);
      const next = stepZoom(current, direction);
      if (next === current) {
        // Already at the end of the ladder: say so, change nothing.
        set({ hint: nextHint(region, next, zoomLimit(next)) });
        return;
      }
      commit({ ...get().levels, [region]: next }, nextHint(region, next, null));
    },

    reset(region) {
      const hint = nextHint(region, ZOOM_DEFAULT, null);
      if (get().levels[region] === ZOOM_DEFAULT) {
        set({ hint });
        return;
      }
      commit({ ...get().levels, [region]: ZOOM_DEFAULT }, hint);
    },

    resetAll() {
      const hint = nextHint('all', ZOOM_DEFAULT, null);
      if (allAtDefault(get().levels)) {
        set({ hint });
        return;
      }
      commit(defaultZoomLevels(), hint);
    },

    dismissHint(at) {
      if (get().hint?.seq === at) set({ hint: null });
    }
  };
});

// Hydrate the custom properties before the first paint of a zoomed panel —
// the store is created when the app module graph loads, well before React
// mounts, so a persisted 150% explorer never flashes at 100% first.
applyVars(useZoom.getState().levels);
