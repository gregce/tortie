/**
 * The drop affordances: one for "attach to this session", one for "add a
 * project". They are mutually exclusive by construction (the router arms one
 * or the other), so a file dragged across the window hands off cleanly from
 * the sidebar's dashed frame to a lit session pane and back.
 *
 * Rendered through a portal onto document.body so the leaf overlay can be
 * position:fixed in viewport coordinates — the same rect the router already
 * measured while hit-testing — without depending on where the app mounts it
 * or on any transformed ancestor.
 *
 * aria-hidden, like the split drop zone: the OUTCOME is announced through the
 * toast live region, which is where a screen-reader user needs it.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import './drop.css';
import { useDropUi } from './state';

export function FileDropOverlay(): React.JSX.Element | null {
  const leaf = useDropUi((s) => s.leaf);
  const windowArmed = useDropUi((s) => s.window);

  if (leaf === null && !windowArmed) return null;

  return createPortal(
    leaf !== null ? (
      <div
        className="attach-drop-zone"
        data-promise={leaf.promise}
        style={{
          left: leaf.rect.left,
          top: leaf.rect.top,
          width: leaf.rect.width,
          height: leaf.rect.height
        }}
        aria-hidden="true"
      >
        <span className="attach-drop-label">{leaf.label}</span>
      </div>
    ) : (
      // Whole-window frame: dropping here adds a project (the pre-existing
      // §6.1 treatment, now armed by the one router).
      <div className="drop-overlay" aria-hidden="true" />
    ),
    document.body
  );
}
