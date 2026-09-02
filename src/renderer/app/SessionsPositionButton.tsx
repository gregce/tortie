/**
 * The SESSIONS header's position toggle (Phase 12.12 item 2).
 *
 * Until now moving the session surface meant knowing that the View menu had a
 * radio pair, which is the kind of thing you only know if you went looking. It
 * is a layout preference people change while looking AT the layout, so the
 * verb belongs in the SESSIONS header beside ＋ and ˅: one button, naming its
 * destination, carrying the icon of the layout it would produce.
 *
 * ONE STORE VALUE, three controls. This button, the ˅ menu's row and the View
 * menu's radios all read and write `sessionOrientation` — no second piece of
 * state anywhere — and the store's setter is what tells main to move the radio
 * marks (src/renderer/state/store.ts → ui:sessionsPosition).
 *
 * Both orientations render THIS component: the right dock's toolbar
 * (SessionDock) and the top strip's pinned cell (TerminalRegion). A second
 * hand-written copy is how the ⌘T grid and the empty state drifted apart —
 * see AgentGrid.tsx, same phase, same lesson.
 */

import React from 'react';
import { useApp } from '../state/store';
import { destinationIcon, movePositionLabel, otherPosition } from './sessions-position';
import { Codicon } from '../icons';
import './sessions-position.css';

/**
 * A plain icon button, so it is in the tab order and answers Enter/Space like
 * every other control in the band.
 */
export function SessionsPositionButton(): React.JSX.Element {
  const orientation = useApp((s) => s.sessionOrientation);
  const setSessionOrientation = useApp((s) => s.setSessionOrientation);
  const label = movePositionLabel(orientation);

  return (
    <button
      type="button"
      className="icon-btn sessions-position"
      aria-label={label}
      title={label}
      onClick={() => setSessionOrientation(otherPosition(orientation))}
    >
      <Codicon name={destinationIcon(orientation)} size="lg" />
    </button>
  );
}
