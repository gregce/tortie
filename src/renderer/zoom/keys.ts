/**
 * ⌘+ / ⌘- / ⌘0 / ⌘⇧0 — the zoom half of the DESIGN.md §4 keyboard map.
 *
 * Registered here rather than in the native menu, for the reason App.tsx
 * already records: this listener is capture-phase and therefore runs BEFORE
 * the application-menu accelerator, so a chord handled in both places would
 * have to be careful not to act twice. ⌘1…⌘9 and ⌘⇧[ / ⌘⇧] live in the
 * renderer alone for the same reason; zoom joins them. The chords are still
 * declared once, as data, in src/shared/keymap.ts (`view.zoomIn` …
 * `view.zoomResetAll`) — that is what the ⌘/ overlay and the Settings map
 * render from.
 *
 * The chord table is ./chord.ts and the region rule is ./focus.ts; this file
 * is only the wiring between them and the store.
 */

import { useEffect } from 'react';
import { useApp } from '../state/store';
import { zoomVerbFor } from './chord';
import { resolveZoomTarget } from './focus';
import { useZoom } from './store';

export { zoomVerbFor } from './chord';
export type { ZoomVerb } from './chord';

export function useZoomKeymap(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const verb = zoomVerbFor(event);
      if (verb === null) return;

      const orientation = useApp.getState().sessionOrientation;
      const target = resolveZoomTarget(
        event.target ?? document.activeElement,
        orientation
      );
      // The image viewer owns this chord over its own surface (focus.ts).
      if (target === 'defer') return;

      // preventDefault is what stops the menu bar's Edit/View roles and
      // xterm's own key handling from seeing the chord as well.
      event.preventDefault();
      event.stopPropagation();
      const zoom = useZoom.getState();
      if (verb === 'in') zoom.step(target, 1);
      else if (verb === 'out') zoom.step(target, -1);
      else if (verb === 'reset') zoom.reset(target);
      else zoom.resetAll();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);
}
